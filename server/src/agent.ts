// The sourcing agent, generic for any requirement: understand the request -> (stock check only for a stocked item) ->
// one enquiry to every test supplier on its channel -> capture replies (LLM or rules) -> deterministic ranking ->
// overall summary (LLM, grounded in the replies; rules otherwise) -> actions the owner approves.
import fs from 'node:fs';
import path from 'node:path';
import { cfg, modes } from './config';
import { seedSkus, testEmailFor, testPhoneFor, testNameFor, channelFor, LETTERS, KG_PER_UNIT, type Sku, type Channel } from './catalog';
import { parseRequest, enquiryForShortfall, parseReply, cleanReply, ungrounded, TODAY, type Request, type Quote } from './parse';
import { llmJson } from './llm';
import { classify, type Intent, type Turn } from './assist';
import { sendEmail } from './channels/email';
import { sendWhatsApp, placeCall } from './channels/twilio';
import { BlockedRecipient } from './allowlist';

export type Stage = 'drafted' | 'sent' | 'delivered' | 'read' | 'ringing' | 'answered' | 'replied' | 'parsed' | 'failed' | 'blocked' | 'counter-sent' | 'answer-sent' | 'call-ended' | 'retrying';
export type Out = {
  ref: string; letter: string; supplier: string; person: string; channel: Channel; mode: 'real' | 'simulated'; to: string; telLink: string;
  sent: { subject?: string; body: string; at: string; kind?: 'enquiry' | 'counter' | 'answer' }[];
  providerIds: string[]; timeline: { stage: Stage; at: string; note?: string }[];
  replies: { at: string; text: string; via: Channel | 'Call'; simulated?: boolean }[];
  quote: Quote | null; score: number | null; tips: string[]; counterPrice: number | null; error?: string;
  /** Voice only: dial attempts so far and whether a call screener (e.g. iOS Screen Unknown Callers) picked up. */
  callAttempts?: number; callScreened?: boolean; callGotAnswers?: boolean;
  /** Comparable price used for ranking (ex-GST, per the run's comparison unit), or why it is not comparable. */
  compare?: { unitPrice: number | null; basis: string; total: number | null; comparable: boolean; note?: string };
  /** A question the supplier asked, with a drafted answer waiting for the owner's approval. Never sent automatically. */
  pending?: { questions: string[]; draft: string; drafter: 'llm' | 'rules'; at: string } | null;
  history: { lastPrice: number | null; lastPriceNote: string };
};
export type Summary = {
  headline: string; columns: string[]; rows: { letter: string; cells: string[] }[]; best: { letter: string; why: string } | null;
  comparable: boolean; comparabilityNote: string; negotiation: string[]; nextActions: string[]; parser: 'llm' | 'rules'; at: string; basedOn: number;
};
export type Stock = { sku: string; name: string; unit: string; onHand: number; reserved: number; free: number; needUnits: number; shortUnits: number; askQty: number; askUnit: string; freeInAskUnit: number };
export type Run = {
  id: string; createdAt: string; text: string; request: Request; status: 'needs-info' | 'in-stock' | 'outreach' | 'replies-in';
  ask: { title: string; qty: number; unit: string; enquiry: string };
  stock: Stock | null; suppliers: Out[]; summary: Summary | null;
  po: null | { ref: string; supplier: string; qty: number; unit: string; price: number; freight: number; total: number; at: string; status: string };
  note: string;
};

const file = path.join(cfg.dataDir, 'runs.json');
type DB = { seq: number; runs: Run[] };
export const db: DB = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { seq: 141, runs: [] };
export const save = () => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(db, null, 1)); };
const now = () => new Date().toISOString();
export const findRun = (id: string) => db.runs.find((r) => r.id === id);
export const findOut = (ref: string) => { for (const r of db.runs) { const o = r.suppliers.find((x) => x.ref === ref); if (o) return { run: r, out: o }; } return null; };
const runOf = (o: Out) => db.runs.find((r) => r.suppliers.includes(o))!;
const mark = (o: Out, stage: Stage, note?: string) => { o.timeline.push({ stage, at: now(), note }); };
export const maskPhone = (p: string) => { const d = p.replace(/[^\d+]/g, ''); return d.length >= 10 ? `${d.slice(0, 3)} ${d.slice(3, 5)}•••• ${d.slice(-4)}` : p; };

export const fmtDate = (d: string | null | undefined) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');
const OUR_ADDRESS = process.env.DELIVERY_ADDRESS || 'Jeedimetla, Hyderabad';
const roundAsk = (q: number, unit: string) => (unit === 'kg' ? Math.ceil(q / 10) * 10 : Math.ceil(q));
const first = (name: string) => name.split(' ')[0];

// ---------------------------------------------------------------- request
type Plan = { letter: string; supplier: string; person: string; channel: Channel; mode: 'real' | 'simulated'; to: string };
type Analysis = { request: Request; status: Run['status'] | 'chat' | 'clarify'; stock: Stock | null; ask: Run['ask']; note: string; plan: Plan[]; intent?: Intent };

export async function analyze(text: string, skus: Sku[] = seedSkus, opts: { history?: Turn[]; skipClassify?: boolean; context?: string } = {}): Promise<Analysis> {
  const intent = opts.skipClassify ? null : await classify(text, opts.context || '', opts.history || []);
  if (intent && intent.kind !== 'sourcing') {
    const empty = { title: '', itemText: text, sku: null, qty: null, unit: '', qtyInStockUnits: 0, needBy: null, clarify: null, enquiry: '', parser: intent.parser } as unknown as Request;
    return { request: empty, status: intent.kind === 'vague' ? 'clarify' : 'chat', stock: null, ask: { title: '', qty: 0, unit: '', enquiry: '' } as Run['ask'], plan: [], note: intent.reply, intent };
  }
  const request = await parseRequest(text, skus, { company: cfg.company, location: OUR_ADDRESS });
  const ask = { title: request.title, qty: request.qty, unit: request.unit, enquiry: request.enquiry };
  const m = modes();
  const plan: Plan[] = LETTERS.map((L) => {
    const channel = (process.env.FORCE_CHANNEL as Channel) || channelFor(L); // test hook: route every supplier over one channel
    const mode = (channel === 'Email' ? m.email : channel === 'WhatsApp' ? m.whatsapp : m.call) as 'real' | 'simulated';
    return { letter: L, supplier: `Supplier ${L}`, person: testNameFor(L), channel, mode, to: channel === 'Email' ? testEmailFor(L) : testPhoneFor(L) };
  });
  if (request.clarify) return { request, status: 'needs-info', stock: null, ask, plan, note: request.clarify };
  // Stock check only when the requirement is clearly a stocked item.
  const said = (k: Sku) => { const t = text.toLowerCase(); return t.includes(k.sku.toLowerCase()) || k.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !['with', 'grade', 'type', 'size'].includes(w)).some((w) => t.includes(w)); };
  const sk0 = request.sku ? skus.find((k) => k.sku === request.sku) : undefined;
  const sk = sk0 && said(sk0) ? sk0 : undefined;
  if (sk && request.qty) {
    const free = Math.max(0, sk.onHand - sk.reserved);
    const shortUnits = Math.max(0, request.qtyInStockUnits - free);
    const perUnitInAsk = request.unit === 'kg' && sk.unit !== 'kg' ? KG_PER_UNIT[sk.sku] || 1 : 1;
    const askQty = roundAsk(shortUnits * perUnitInAsk, request.unit);
    const stock: Stock = { sku: sk.sku, name: sk.name, unit: sk.unit, onHand: sk.onHand, reserved: sk.reserved, free, needUnits: Math.round(request.qtyInStockUnits * 10) / 10, shortUnits: Math.round(shortUnits * 10) / 10, askQty, askUnit: request.unit, freeInAskUnit: Math.round(free * perUnitInAsk) };
    if (shortUnits <= 0) return { request, status: 'in-stock', stock, ask, plan: [], note: `Yes – ${free} ${sk.unit} of ${sk.name} free (${stock.freeInAskUnit.toLocaleString('en-IN')} ${request.unit}). No need to buy.` };
    if (askQty !== request.qty) { ask.qty = askQty; ask.enquiry = await enquiryForShortfall(request, askQty, request.unit); }
    return { request, status: 'outreach', stock, ask, plan, note: `Short by ${askQty.toLocaleString('en-IN')} ${request.unit} of ${sk.name}. Sending the enquiry to ${plan.length} suppliers on their preferred channel.` };
  }
  return { request, status: 'outreach', stock: null, ask, plan, note: `Sending this enquiry to ${plan.length} suppliers on their preferred channel.` };
}

/** Starts outreach. `approved` is the enquiry text the owner saw (and may have edited) in the preview. */
export async function createRun(text: string, skus: Sku[] = seedSkus, approved?: string): Promise<Run> {
  const a = await analyze(text, skus, { skipClassify: !!(approved && approved.trim()) });
  if (a.status === 'chat' || a.status === 'clarify') throw Object.assign(new Error(a.note || 'Tell me what you need sourced.'), { status: 400 });
  const id = `SRC-${String(++db.seq).padStart(4, '0')}`;
  if (approved && approved.trim()) a.ask.enquiry = approved.trim().slice(0, 2000);
  const status = a.status === 'needs-info' && approved ? 'outreach' : a.status; // owner chose "send as is"
  const run: Run = { id, createdAt: now(), text, request: a.request, status, ask: a.ask, stock: a.stock, suppliers: [], summary: null, po: null, note: status === 'outreach' && a.status === 'needs-info' ? `Sent as written to ${a.plan.length} suppliers.` : a.note };
  db.runs.unshift(run);
  if (status !== 'outreach') { save(); return run; }
  const sk = skus.find((k) => k.sku === a.stock?.sku);
  const lastPrice = sk ? (a.ask.unit === 'kg' && KG_PER_UNIT[sk.sku] ? Math.round((sk.unitCost / KG_PER_UNIT[sk.sku]) * 10) / 10 : sk.unitCost) : null;
  run.suppliers = a.plan.map((p) => ({ ref: `RFQ-${id}-${p.letter}`, letter: p.letter, supplier: p.supplier, person: p.person, channel: p.channel, mode: p.mode, to: p.to,
    telLink: testPhoneFor(p.letter) ? `tel:${testPhoneFor(p.letter)}` : '', sent: [], providerIds: [], timeline: [], replies: [], quote: null, score: null, tips: [], counterPrice: null, pending: null,
    history: { lastPrice, lastPriceNote: sk ? 'stock valuation in Inventory' : '' } }));
  save();
  for (const o of run.suppliers) {
    const d = draft(run, o);
    o.sent.push({ ...d, at: now(), kind: 'enquiry' }); mark(o, 'drafted');
    await dispatch(run, o, d).catch(() => {});
  }
  save();
  return run;
}

export function draft(run: Run, o: Out) {
  const by = run.request.needBy ? fmtDate(run.request.needBy) : '';
  const e = run.ask.enquiry;
  if (o.channel === 'Email') return {
    subject: `[${o.ref}] Enquiry – ${run.ask.title}`,
    body: `Dear ${first(o.person)},\n\nThis is ${cfg.company}.\n\n${e}${by ? `\n\nRequired by: ${by}` : ''}\n\nCould you please reply to this email with:\n1. Whether you can do this (fully or partly)\n2. Your price and payment terms\n3. When you can deliver or start\n4. Any conditions, or questions for us\n\nPlease keep the reference ${o.ref} in the subject. This is an enquiry, not a purchase order.\n\nRegards,\n${cfg.buyer}\n${cfg.company}\n\n[Demo: you are playing ${o.supplier}.]`,
  };
  if (o.channel === 'WhatsApp') return {
    body: `*${o.ref}* · ${o.supplier}\nNamaste ${first(o.person)}, ${cfg.company.split(',')[0]} here.\n\n${e}${by ? `\nRequired by *${by}*.` : ''}\n\nPlease reply: can you do it, price & terms, and when. Start your reply with *${o.letter}:*\n– ${cfg.buyer}`,
  };
  return { body: `AI voice call to ${o.person} (${o.supplier}) · ref ${o.letter}\n\n"Namaste, this is an automated call from ${cfg.company.split(',')[0]}. Reference ${o.letter}. ${e}"\n${CALL_QUESTIONS.map((q, i) => `• Q${i + 1}: ${q}`).join('\n')}\n• Close: "Thank you, we will confirm in writing. This is not an order."\n\nThe answers are transcribed and read by the AI.` };
}
export const CALL_QUESTIONS = ['Can you do this? Please tell us what you can supply.', 'What is your price, and your payment terms?', 'When can you deliver or start?', 'Any conditions, or any questions for us?'];

async function dispatch(run: Run, o: Out, d: { subject?: string; body: string }, kind: 'enquiry' | 'counter' | 'answer' = 'enquiry') {
  const stage: Stage = kind === 'counter' ? 'counter-sent' : kind === 'answer' ? 'answer-sent' : 'sent';
  try {
    if (o.mode === 'simulated') { mark(o, stage, 'simulated – nothing left the server'); simulateReply(run, o, kind); return; }
    if (!o.to) throw new Error('No test recipient configured for this channel');
    if (o.channel === 'Email') {
      const prevId = o.providerIds[o.providerIds.length - 1];
      const r = await sendEmail(o.to, kind !== 'enquiry' ? `Re: ${o.sent[0].subject}` : d.subject!, d.body, { inReplyTo: kind !== 'enquiry' ? prevId : undefined });
      o.providerIds.push(r.messageId); mark(o, stage, `to ${o.to}`); if (r.accepted && kind === 'enquiry') mark(o, 'delivered', 'accepted by mail server');
    } else if (o.channel === 'WhatsApp') {
      const r = await sendWhatsApp(o.to, d.body); o.providerIds.push(r.sid); mark(o, stage, `to ${maskPhone(o.to)} · ${r.status}`);
    } else if (kind === 'enquiry') {
      const r = await placeCall(o.to, o.ref); o.callAttempts = 1; o.providerIds.push(r.sid); mark(o, 'sent', `dialling ${maskPhone(o.to)}`);
    } else mark(o, stage, 'noted for the next call');
  } catch (err) {
    o.error = String((err as Error).message || err);
    mark(o, err instanceof BlockedRecipient ? 'blocked' : 'failed', o.error);
  } finally { save(); }
}

// ---------------------------------------------------------------- replies
// Replies for one supplier are processed in arrival order (a slow parse must not overwrite a newer reply).
const replyQueue = new Map<string, Promise<void>>();
export function addReply(o: Out, text: string, via: Out['channel'], simulated = false): Promise<void> {
  const next = (replyQueue.get(o.ref) || Promise.resolve()).then(() => addReplyNow(o, text, via, simulated)).catch((e) => console.warn('[reply]', e));
  replyQueue.set(o.ref, next); return next;
}
async function addReplyNow(o: Out, text: string, via: Out['channel'], simulated: boolean) {
  const run = runOf(o);
  text = cleanReply(text) || text;
  o.replies.push({ at: now(), text, via, simulated }); mark(o, 'replied', simulated ? 'simulated reply' : undefined);
  const q = await parseReply(text, { requirement: run.ask.enquiry, unit: run.ask.unit, askedQty: run.ask.qty, sentOn: TODAY });
  o.quote = o.quote ? mergeQuote(o.quote, q) : q;
  mark(o, 'parsed', `${q.parser === 'llm' ? 'AI' : 'rules'} parser · confidence ${q.confidence}%`);
  if (q.questions?.length) o.pending = { questions: q.questions, ...(await draftAnswer(run, o, q.questions)), at: now() };
  run.status = 'replies-in';
  rescore(run); save();
  scheduleSummary(run);
}
function mergeQuote(a: Quote, b: Quote): Quote {
  const pick = <K extends keyof Quote>(k: K) => (b[k] !== null && b[k] !== undefined && !(Array.isArray(b[k]) && !(b[k] as unknown[]).length) ? b[k] : a[k]);
  const out = { ...a } as Quote;
  for (const k of Object.keys(b) as (keyof Quote)[]) (out as any)[k] = pick(k);
  if (b.canDo && b.canDo !== 'unclear') { out.canDo = b.canDo; out.available = b.available; }
  if (b.canDo === 'no') { out.price = null; out.priceBasis = null; out.qty = 0; out.shipDate = null; } // a later decline withdraws the earlier quote
  out.questions = b.questions || []; // only the latest message's questions are open
  out.summary = b.summary || a.summary; out.notes = b.notes || a.notes; out.confidence = Math.max(a.confidence, b.confidence);
  return out;
}

async function draftAnswer(run: Run, o: Out, questions: string[]): Promise<{ draft: string; drafter: 'llm' | 'rules' }> {
  const facts = `Requirement (exactly as the owner gave it): ${run.text}\nEnquiry sent: ${run.ask.enquiry}\nNeeded by: ${run.request.needBy || 'not stated'}\nOur address: ${OUR_ADDRESS}\nBuyer: ${cfg.buyer}`;
  const ai = await llmJson<{ answer: string }>(`Draft a short, polite reply from our buyer to a supplier's question(s). Use ONLY the facts given. If a fact is not given, say we will confirm shortly – never invent quantities, specs, dates or prices. Return {"answer": "..."}`,
    `${facts}\n\nSupplier ${o.supplier} asked:\n${questions.map((q) => `- ${q}`).join('\n')}`);
  if (ai?.answer && !ungrounded(ai.answer, [facts]).length) return { draft: ai.answer.trim(), drafter: 'llm' };
  return { draft: `Thanks for your question. ${questions.length === 1 ? 'On this' : 'On these'}: we will confirm shortly. Our requirement, as sent: ${run.ask.enquiry}`, drafter: 'rules' };
}

// ---------------------------------------------------------------- comparison (deterministic backbone)
const UNIT: Record<string, string> = { kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', pc: 'pc', pcs: 'pc', piece: 'pc', pieces: 'pc', nos: 'pc', no: 'pc', unit: 'pc', units: 'pc', each: 'pc',
  litre: 'litre', litres: 'litre', liter: 'litre', liters: 'litre', ltr: 'litre', ltrs: 'litre', l: 'litre', trip: 'trip', trips: 'trip', day: 'day', days: 'day', sheet: 'sheet', sheets: 'sheet', box: 'box', boxes: 'box',
  // manpower is billed per head per day: treat these as the same basis as "day"
  person: 'day', persons: 'day', people: 'day', worker: 'day', workers: 'day', labourer: 'day', labourers: 'day', head: 'day', manday: 'day', 'man-day': 'day', shift: 'day' };
const normUnit = (u?: string | null) => { const k = (u || '').toLowerCase().trim().replace(/^per\s+/, ''); return UNIT[k] || (/^(ton|tonne|tonnes|mt|t)$/.test(k) ? 'ton' : k || ''); };

function compareOf(run: Run, o: Out): NonNullable<Out['compare']> {
  const q = o.quote!; const qty = q.qty || run.ask.qty || 0; const askU = normUnit(run.ask.unit);
  const exGst = (n: number) => (q.gst === 'included' ? n / 1.18 : n);
  const notes: string[] = []; if (q.gst === 'included') notes.push('GST-inclusive price shown ex-GST');
  if (q.priceBasis === 'lump_sum') {
    const total = exGst(q.price!) + (q.freight || 0);
    if (run.ask.qty) return { unitPrice: total / run.ask.qty, basis: askU || 'unit', total, comparable: true, note: ['lump sum spread over the quantity', ...notes].join('; ') };
    return { unitPrice: total, basis: 'lump sum', total, comparable: true, note: notes.join('; ') || undefined };
  }
  let pu = normUnit(q.priceUnit) || askU; let price = exGst(q.price!);
  if (askU === 'kg' && pu === 'ton') { price /= 1000; pu = 'kg'; } else if (askU === 'ton' && pu === 'kg') { price *= 1000; pu = 'ton'; }
  const total = qty ? price * qty + (q.freight || 0) : null;
  const unitPrice = price + (q.freight || 0) / Math.max(1, qty || 1);
  return { unitPrice, basis: pu || 'unit', total, comparable: true, note: notes.join('; ') || undefined };
}

const termsScore = (t: string | null) => (!t ? 60 : /Net\s*(3\d|4\d|60)/i.test(t) ? 100 : /Net|credit/i.test(t) ? 80 : /Cash|COD/i.test(t) ? 50 : /advance/i.test(t) ? (/100/.test(t) ? 25 : 45) : 60);
export const landedTotal = (o: Out) => o.compare?.total ?? 0;

export function rescore(run: Run) {
  const need = run.request.needBy;
  const priced = run.suppliers.filter((o) => o.quote && o.quote.available !== false && o.quote.price != null);
  for (const o of priced) o.compare = compareOf(run, o);
  // Quotes are comparable when they share the most common price basis (per kg, per trip, lump sum…).
  const counts = new Map<string, number>(); for (const o of priced) counts.set(o.compare!.basis, (counts.get(o.compare!.basis) || 0) + 1);
  const basis = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  for (const o of priced) if (o.compare!.basis !== basis) { o.compare!.comparable = false; o.compare!.note = `priced per ${o.compare!.basis}, others per ${basis} – not directly comparable`; }
  const comp = priced.filter((o) => o.compare!.comparable);
  const best = Math.min(...comp.map((o) => o.compare!.unitPrice!));
  for (const o of run.suppliers) {
    if (!o.quote || o.quote.available === false || o.quote.price == null) {
      o.score = o.quote?.available === false ? 0 : null; o.counterPrice = null; if (!o.quote || o.quote.price == null) o.compare = undefined;
      o.tips = o.quote?.available === false ? ['Cannot do it – keep them on the list for the next enquiry.'] : o.quote ? ['No price yet – ask for their price and terms.'] : [];
      continue;
    }
    const q = o.quote; const c = o.compare!;
    const priceS = c.comparable ? (100 * best) / c.unitPrice! : 50;
    const onTime = !need || !q.shipDate ? 70 : q.shipDate <= need ? 100 : 40;
    const qtyS = q.canDo === 'partial' ? 0.6 : run.ask.qty && q.qty ? Math.min(1, q.qty / run.ask.qty) : 1;
    o.score = Math.round((0.45 * priceS + 0.3 * onTime * qtyS + 0.25 * termsScore(q.terms)) * (c.comparable ? 1 : 0.85));
    o.tips = negotiation(run, o, comp);
  }
}

function negotiation(run: Run, o: Out, comp: Out[]) {
  const q = o.quote!; const c = o.compare!; const u = q.priceUnit || run.ask.unit || 'unit'; const tips: string[] = [];
  if (!c.comparable && c.note) tips.push(`Not directly comparable: ${c.note}. Ask them to quote per ${comp[0]?.compare?.basis || run.ask.unit || 'unit'}.`);
  const cheaper = comp.filter((x) => x !== o && x.compare!.unitPrice! < (c.unitPrice ?? Infinity)).sort((a, b) => a.compare!.unitPrice! - b.compare!.unitPrice!)[0];
  const lp = o.history.lastPrice;
  const anchors = [lp, cheaper?.quote!.price, run.request.targetPrice].filter((x): x is number => !!x && x < q.price!);
  // A counter-offer an owner would actually say: ₹26,600 not ₹26616.8 (round down to a sensible step).
  const step = (v: number) => (v >= 10000 ? 100 : v >= 1000 ? 10 : v >= 100 ? 1 : 0.1);
  const nice = (v: number) => Math.round(Math.floor(v / step(v) + 1e-9) * step(v) * 10) / 10;
  const counter = nice(anchors.length ? Math.max(Math.min(...anchors), q.price! * 0.96) : q.price! * 0.98);
  o.counterPrice = counter < q.price! ? counter : null;
  if (lp) { const diff = ((q.price! - lp) / lp) * 100; if (diff > 0.5) tips.push(`₹${q.price}/${u} is ${diff.toFixed(1)}% above your last cost (₹${lp}/${u}). Counter at ₹${counter.toLocaleString('en-IN')}/${u}.`); else if (diff < -0.5) tips.push(`₹${q.price}/${u} is below your last cost (₹${lp}/${u}) – a good rate.`); }
  if (cheaper && c.comparable) tips.push(`${cheaper.supplier} is cheaper (₹${cheaper.quote!.price}/${cheaper.quote!.priceUnit || u}) – mention a competing quote and ask them to match.`);
  if (run.request.targetPrice && q.price! > run.request.targetPrice) tips.push(`Your target is ₹${run.request.targetPrice}; they are at ₹${q.price}.`);
  if (run.request.needBy && q.shipDate && q.shipDate > run.request.needBy) tips.push(`Their date (${fmtDate(q.shipDate)}) is after you need it (${fmtDate(run.request.needBy)}). Ask for part delivery or an earlier slot.`);
  if (q.canDo === 'partial') tips.push(`Partial only${q.qty ? ` (${q.qty} ${q.unit || run.ask.unit})` : ''} – split the order with the next best supplier.`);
  if (q.freight && q.freight > 0) tips.push(`Ask them to absorb the ₹${q.freight.toLocaleString('en-IN')} freight.`);
  if (q.gst === 'extra') tips.push('GST is extra – compare totals including GST before you decide.');
  if (q.terms && /advance/i.test(q.terms)) tips.push(`${q.terms} locks up cash – offer 30% advance, balance on delivery.`);
  else if (q.terms && /Cash|COD/i.test(q.terms)) tips.push('Cash on delivery – ask for credit against a GST invoice.');
  if (o.channel === 'Call') tips.push('Verbal quote – ask for written confirmation on WhatsApp or email before the PO.');
  return tips;
}

export function ranked(run: Run) { return run.suppliers.filter((o) => (o.score ?? 0) > 0).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3); }

// ---------------------------------------------------------------- overall summary
const timers = new Map<string, NodeJS.Timeout>();
const SUMMARY_DELAY = Number(process.env.SUMMARY_DELAY_MS || 1500);
export function scheduleSummary(run: Run) {
  clearTimeout(timers.get(run.id));
  timers.set(run.id, setTimeout(() => { timers.delete(run.id); void summarize(run).catch((e) => console.warn('[summary]', String(e))); }, SUMMARY_DELAY));
}
const show = (n: number | null | undefined) => (n == null ? '' : Number.isInteger(n) ? String(n) : (Math.round(n * 100) / 100).toString());
function facts(run: Run) {
  const top = ranked(run).map((o) => o.letter);
  return {
    recommended: recommend(run)?.letter || null,
    requirement: run.text, enquiry: run.ask.enquiry, neededBy: run.request.needBy, quantityAsked: run.ask.qty || null, unit: run.ask.unit || null, targetPrice: run.request.targetPrice || null,
    suppliers: run.suppliers.map((o) => ({ letter: o.letter, name: o.supplier, channel: o.channel, replied: o.replies.length > 0, status: o.timeline[o.timeline.length - 1]?.stage,
      latestReply: o.replies.length ? o.replies[o.replies.length - 1].text.slice(0, 1200) : null, earlierReplies: Math.max(0, o.replies.length - 1),
      captured: o.quote && { canDo: o.quote.canDo, qty: o.quote.qty, unit: o.quote.unit, price: o.quote.price, priceUnit: o.quote.priceUnit, priceBasis: o.quote.priceBasis, freight: o.quote.freight, gst: o.quote.gst, deliveryDate: o.quote.shipDate, terms: o.quote.terms, validity: o.quote.validity, conditions: o.quote.conditions, questions: o.quote.questions, summary: o.quote.summary },
      comparison: o.compare && { comparableUnitPriceExGst: Number(show(o.compare.unitPrice)), basis: o.compare.basis, totalExGst: o.compare.total == null ? null : Math.round(o.compare.total), comparable: o.compare.comparable, note: o.compare.note || null },
      score: o.score, rank: top.indexOf(o.letter) + 1 || null, suggestedCounter: o.counterPrice, lastCost: o.history.lastPrice })),
  };
}
/** The one recommendation: cheapest total among suppliers who can do it on time; ties go to the better score. The UI mirrors this. */
export function recommend(run: Run) {
  const ok = run.suppliers.filter((o) => o.quote && o.quote.canDo !== 'no' && o.quote.available !== false && (o.compare?.total ?? 0) > 0 && o.compare?.comparable !== false);
  const need = run.request.needBy;
  const sure = ok.filter((o) => !need || (o.quote!.shipDate && o.quote!.shipDate <= need));
  const maybe = ok.filter((o) => !need || !o.quote!.shipDate || o.quote!.shipDate <= need);
  const pool = sure.length ? sure : maybe.length ? maybe : ok;
  return pool.sort((a, b) => (a.compare!.total! - b.compare!.total!) || ((b.score || 0) - (a.score || 0)))[0] || ranked(run)[0];
}
/** One-line reason for the recommended supplier, from captured facts only. */
function plainWhy(run: Run, b: Out) {
  const q = b.quote; const others = ranked(run).filter((o) => o !== b && o.compare?.total != null);
  const cheapest = b.compare?.total != null && others.every((o) => (o.compare!.total as number) >= (b.compare!.total as number));
  const bits = [cheapest ? 'lowest total price' : 'best mix of price, delivery and terms', q?.shipDate && (!run.request.needBy || q.shipDate <= run.request.needBy) ? 'delivers on time' : '', q?.terms ? `terms: ${q.terms}` : ''].filter(Boolean);
  return bits.join(', ').replace(/^./, (c) => c.toUpperCase()) + '.';
}
function rulesSummary(run: Run): Omit<Summary, 'at' | 'basedOn'> {
  const top = ranked(run); const replied = run.suppliers.filter((o) => o.replies.length);
  const comparable = run.suppliers.every((o) => !o.compare || o.compare.comparable);
  const rows = run.suppliers.map((o) => { const q = o.quote; return { letter: o.letter, cells: [o.supplier, !q ? (o.timeline.some((t) => t.stage === 'failed' || t.stage === 'blocked') ? 'not delivered' : 'no reply yet') : q.canDo || (q.available === false ? 'no' : '?'),
    q?.price != null ? `₹${q.price}${q.priceBasis === 'lump_sum' ? ' (lump sum)' : q.priceUnit ? `/${q.priceUnit}` : ''}` : '', q?.qty != null ? `${q.qty} ${q.unit || ''}`.trim() : '', q?.shipDate ? fmtDate(q.shipDate) : '', q?.terms || '', (q?.summary || q?.notes || '').slice(0, 90)] }; });
  const b = recommend(run) || top[0];
  return { headline: `${replied.length} of ${run.suppliers.length} suppliers replied${b ? `; ${b.supplier} ranks first` : ''}.`, columns: ['Supplier', 'Can do', 'Price', 'Qty', 'When', 'Terms', 'Notes'], rows,
    best: b ? { letter: b.letter, why: plainWhy(run, b) } : null, comparable, comparabilityNote: comparable ? '' : 'Some prices use a different basis and are not directly comparable.',
    negotiation: b ? b.tips.slice(0, 3) : [], nextActions: b ? [`Send ${b.supplier} a counter-offer or approve a PO draft.`, ...run.suppliers.filter((o) => o.pending).map((o) => `Answer ${o.supplier}'s question.`)] : ['Wait for replies.'], parser: 'rules' };
}
/** Deterministic next steps for the recommended supplier (numbers come straight from the data). */
function nextFor(run: Run, b: Out) {
  const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const backup = ranked(run).concat(run.suppliers).find((o) => o.letter !== b.letter && (o.compare?.total ?? 0) > 0 && o.quote?.canDo !== 'no');
  return [
    `Approve the PO draft for ${b.supplier}${b.compare?.total ? ` at ${inr(b.compare.total)}` : ''}${b.quote?.shipDate ? `, delivery ${fmtDate(b.quote.shipDate)}` : ''}.`,
    ...(b.counterPrice ? [`Optional: ask ${b.supplier} for ${inr(b.counterPrice)} before you approve.`] : []),
    ...run.suppliers.filter((o) => o.pending).map((o) => `Answer ${o.supplier}'s question.`),
    ...(backup ? [`Keep ${backup.supplier} as backup at ${inr(backup.compare!.total!)}.`] : []),
  ];
}
/** Drops every piece of an AI summary that carries a number not found in the data (cells blanked, list items dropped, sentences replaced by the rules version). */
function scrub(j: any, src: string[], rules: ReturnType<typeof rulesSummary>) {
  const okStr = (x: any) => !ungrounded(String(x ?? ''), src).length;
  return { ...j, headline: okStr(j.headline) ? j.headline : rules.headline,
    rows: j.rows.map((r: any) => ({ ...r, cells: (r.cells || []).map((c: any) => (okStr(c) ? c : '')) })),
    best: j.best && (okStr(j.best.why) ? j.best : rules.best && rules.best.letter === j.best.letter ? rules.best : { letter: j.best.letter, why: '' }),
    comparabilityNote: okStr(j.comparabilityNote) ? j.comparabilityNote : rules.comparabilityNote,
    negotiation: (j.negotiation || []).filter(okStr), nextActions: (j.nextActions || []).filter(okStr) };
}
export async function summarize(run: Run) {
  const basedOn = run.suppliers.reduce((n, o) => n + o.replies.length, 0);
  const f = facts(run); const factsText = JSON.stringify(f);
  const sys = `You are a purchase analyst. Compare supplier replies to ONE enquiry and write JSON:
{"headline": one sentence, "columns": column names for the fields that actually appeared in the replies (first column "Supplier"),
 "rows": [{"letter": "A", "cells": [...same order as columns...]}] – one row per supplier, "" for unknown, "no reply" when they did not reply,
 "best": {"letter": "...", "why": "..."} or null if nobody quoted, "comparable": true|false, "comparabilityNote": "" or why prices cannot be compared,
 "negotiation": [up to 3 ideas], "nextActions": [up to 4 concrete next steps for the owner]}
The recommended supplier is given as "recommended" in the data (cheapest total among those who can deliver on time): set best.letter to that supplier and write why in one plain sentence an owner understands.
Rules: use ONLY facts in the data. Never invent or compute new numbers – copy numbers exactly as they appear in the data (including suggestedCounter and comparison values).
"captured" is the merged, latest position of each supplier – trust it over latestReply when they differ.
The deterministic rank is the backbone: best is rank 1 unless rank 1 has a blocking issue you can point to in the data. If prices use different bases, say so.`;
  let out: any = null; let note = ''; let last: any = null;
  for (let i = 0; i < 2 && !out; i++) {
    const j = await llmJson<any>(sys + note, factsText, { maxTokens: 1500, timeoutMs: 45000 });
    if (!j || !Array.isArray(j.rows) || !Array.isArray(j.columns)) break;
    last = j;
    const bad = ungrounded(JSON.stringify(j), [factsText, run.text]);
    if (!bad.length) out = j; else { console.warn('[summary] ungrounded numbers', bad); note = `\nYour previous answer used numbers not in the data (${bad.join(', ')}). Use only numbers from the data.`; }
  }
  if (!out && last) out = scrub(last, [factsText, run.text], rulesSummary(run)); // keep the grounded parts of the AI answer
  const letters = new Set(run.suppliers.map((o) => o.letter));
  // Accept "Supplier A" / "A" in the letter field (or only in the first cell); one row per supplier.
  const normRows = (rows: any[], ok: Set<string>) => {
    const seen = new Set<string>(); const res: any[] = [];
    for (const r of Array.isArray(rows) ? rows : []) {
      const pick = (v: any) => { const m = String(v ?? '').trim().match(/^(?:supplier\s*)?([A-Z])$/i); return m ? m[1].toUpperCase() : ''; };
      const L = pick(r?.letter) || pick(r?.supplier) || pick(Array.isArray(r?.cells) ? r.cells[0] : '');
      if (L && ok.has(L) && !seen.has(L)) { seen.add(L); res.push({ ...r, letter: L }); }
    }
    return res;
  };
  const s: Summary = out ? {
    headline: String(out.headline || ''), columns: out.columns.map(String).slice(0, 10),
    // Models sometimes drop the Supplier cell; realign so every row starts with the supplier.
    rows: normRows(out.rows, letters).map((r: any) => { let cells = (r.cells || []).map((c: any) => String(c ?? '')); if (/supplier/i.test(String(out.columns[0])) && !new RegExp(`(^|\\b)(supplier\\s*)?${r.letter}\\b`, 'i').test(cells[0] || '')) cells = [`Supplier ${r.letter}`, ...cells]; return { letter: r.letter, cells: cells.slice(0, 10) }; }),
    best: (() => { const L = out.best ? normRows([{ letter: out.best.letter }], letters)[0]?.letter : ''; return L ? { letter: L, why: String(out.best.why || '') } : null; })(),
    comparable: out.comparable !== false, comparabilityNote: String(out.comparabilityNote || ''), negotiation: (out.negotiation || []).map(String).slice(0, 4), nextActions: (out.nextActions || []).map(String).slice(0, 5),
    parser: 'llm', at: now(), basedOn,
  } : { ...rulesSummary(run), at: now(), basedOn };
  // One recommendation everywhere: the ranking decides who, the AI only explains why.
  const r0 = recommend(run);
  if (r0) {
    if (s.best?.letter !== r0.letter) s.best = { letter: r0.letter, why: plainWhy(run, r0) };
    // One story: drop AI lines that tell the owner to commit to anyone other than the recommended supplier.
    const others = run.suppliers.filter((o) => o.letter !== r0.letter).map((o) => o.letter).join('');
    const rival = new RegExp(`\\bSupplier [${others}]\\b[^.]*\\b(lock|purchase order|PO|go with|award|finali[sz]e|book)\\b|\\b(lock|purchase order|PO|go with|award|finali[sz]e|book)\\b[^.]*\\bSupplier [${others}]\\b`, 'i');
    const first = (r: string) => (r.includes(r0.supplier) ? 0 : 1);
    s.nextActions = [...nextFor(run, r0), ...s.nextActions.filter((t) => !rival.test(t) && !t.includes(r0.supplier) && !/archive|reject|discard|drop/i.test(t))].filter((t, i, a) => a.indexOf(t) === i).slice(0, 4);
    s.negotiation = s.negotiation.filter((t) => !rival.test(t)).sort((x, y) => first(x) - first(y));
    if (rival.test(s.headline)) s.headline = rulesSummary(run).headline;
  }
  const iso = (t: string) => t.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (m) => fmtDate(m) || m);
  s.headline = iso(s.headline); if (s.best) s.best.why = iso(s.best.why); s.negotiation = s.negotiation.map(iso); s.nextActions = s.nextActions.map(iso);
  if (s.parser === 'llm' && s.rows.length < run.suppliers.length) console.warn('[summary] rows', s.rows.length, 'of', run.suppliers.length, out === last ? '' : '(scrubbed)', JSON.stringify((last?.rows || []).map((r: any) => r?.letter)));
  run.summary = s; save();
  return s;
}

// ---------------------------------------------------------------- owner-approved messages
export async function sendCounter(o: Out, price?: number, custom?: string) {
  const run = runOf(o); const p = price || o.counterPrice || o.quote?.price; const u = o.quote?.priceBasis === 'lump_sum' ? '' : `/${o.quote?.priceUnit || run.ask.unit || 'unit'}`;
  const body = custom || (o.channel === 'WhatsApp'
    ? `*${o.ref}* · ${o.supplier}\nThanks for the quote. We can confirm today at *₹${p}${u}*${o.quote?.freight ? ' with freight included' : ''}${run.request.needBy ? `, by ${fmtDate(run.request.needBy)}` : ''}. Can you do it? Reply starting with *${o.letter}:*`
    : `Dear ${first(o.person)},\n\nThank you for your quote for ${o.ref} (${run.ask.title}). We have other quotes on the table and can confirm today if you can do ₹${p}${u}${o.quote?.freight ? ', freight included' : ''}${run.request.needBy ? `, by ${fmtDate(run.request.needBy)}` : ''}.\n\nPlease reply to confirm.\n\nRegards,\n${cfg.buyer}`);
  o.sent.push({ subject: o.channel === 'Email' ? `Re: ${o.sent[0].subject}` : undefined, body, at: now(), kind: 'counter' });
  if (o.channel === 'Call') { mark(o, 'counter-sent', 'counter-offer noted for the call'); save(); return; }
  await dispatch(run, o, { body }, 'counter');
}
/** Sends the owner-approved answer to a supplier's question (the draft is never sent without this call). */
export async function sendAnswer(o: Out, text: string) {
  const run = runOf(o);
  const body = o.channel === 'WhatsApp' ? `*${o.ref}* · ${o.supplier}\n${text}\nReply starting with *${o.letter}:*` : o.channel === 'Email' ? `Dear ${first(o.person)},\n\n${text}\n\nRegards,\n${cfg.buyer}` : text;
  o.sent.push({ subject: o.channel === 'Email' ? `Re: ${o.sent[0].subject}` : undefined, body, at: now(), kind: 'answer' });
  o.pending = null;
  await dispatch(run, o, { body }, 'answer');
}

export function draftPo(run: Run, o: Out) {
  const q = o.quote!; const qty = q.qty || run.ask.qty || 1; const lump = q.priceBasis === 'lump_sum';
  const exGst = (lump ? q.price! : qty * q.price!) / (q.gst === 'included' ? 1.18 : 1) + (q.freight || 0);
  run.po = { ref: o.ref, supplier: o.supplier, qty, unit: lump ? 'lot' : q.priceUnit || run.ask.unit || 'unit', price: q.price!, freight: q.freight || 0, total: Math.round(exGst * 1.18), at: now(), status: 'Draft – waiting for your approval. Not sent to the supplier.' };
  save(); return run.po;
}

// ---------------------------------------------------------------- simulated channel (only when a channel has no credentials)
const sim = (n: number) => (n >= 1000 ? Math.round(n / 100) * 100 : n >= 100 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString('en-IN');
function simulateReply(run: Run, o: Out, kind: 'enquiry' | 'counter' | 'answer') {
  const u = run.ask.unit || 'unit'; const qty = run.ask.qty; const guess: Record<string, number> = { kg: 65, ton: 62000, litre: 180, trip: 28000, day: 800, pc: 250, sheet: 2400, month: 15000, person: 800, people: 800, labourer: 800, worker: 800 };
  const kind0 = /\b(truck|tempo|lorry|trailer|vehicle|transport)\b/i.test(run.text) ? 28000 : /\b(helpers?|labou?r|workers?|manpower)\b/i.test(run.text) ? 800 : 0;
  const base = o.history.lastPrice || run.request.targetPrice || kind0 || guess[normUnit(u)] || guess[u.replace(/s$/, '')] || 100; // demo-only plausible number
  const by = fmtDate(run.request.needBy) || 'next week';
  const variants: Record<string, string> = {
    A: `Dear Harish,\n\nYes, we can do this${qty ? ` – ${qty} ${u}` : ''}. Rate ₹${sim(base * 1.02)}${qty ? `/${u}` : ' lump sum'}, freight ₹1,200. Can deliver ${by}. Payment Net 45.\n\nRegards,\n${o.person}`,
    B: `${o.letter}: ${qty ? `${Math.round(qty * 0.6)} ${u} only right now` : 'can do partly'}, ₹${sim(base * 0.99)}${qty ? `/${u}` : ''}, balance next week. Net 30`,
    C: `Call answers – Q1: haan we can do it. Q2: price ${Math.round(base * 0.97)} rupees${qty ? ` per ${u}` : ''}, cash on delivery. Q3: tomorrow. Q4: no questions.`,
    D: `Dear Harish ji,\n\nWe can do this at ₹${sim(base)}${qty ? `/${u}` : ''} + GST. Before we confirm – what is the exact delivery address, and is unloading at your side?\n\nRegards,\n${o.person}`,
    E: `${o.letter}: sorry, not possible this time.`,
  };
  const text = kind === 'counter' ? `${o.channel === 'WhatsApp' ? o.letter + ': ' : ''}OK, we can do ₹${o.counterPrice ?? o.quote?.price}.` : kind === 'answer' ? `${o.channel === 'WhatsApp' ? o.letter + ': ' : ''}Noted, thanks. Confirmed as quoted.` : variants[o.letter] || variants.A;
  setTimeout(() => { mark(o, 'delivered', 'simulated'); save(); }, 1200);
  setTimeout(() => { void addReply(o, text, o.channel, true); }, 3500 + LETTERS.indexOf(o.letter) * 2200);
}
