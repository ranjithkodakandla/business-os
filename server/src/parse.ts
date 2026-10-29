// Turning free text into structure: the owner's request, and a supplier's reply. LLM first (if configured),
// deterministic rules otherwise, so the demo still runs with no key.
import { llmJson } from './llm';
import { ALIASES, KG_PER_UNIT, type Sku } from './catalog';

export const TODAY = process.env.DEMO_TODAY || new Date().toISOString().slice(0, 10);
const DOW = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return iso(x); };

/** Finds a date in free text relative to `from`. Returns ISO yyyy-mm-dd or null. */
export function findDate(text: string, from = TODAY): string | null {
  const t = text.toLowerCase();
  if (/\btoday\b|\baaj\b/.test(t)) return from;
  if (/\btomorrow\b|\bkal\b/.test(t)) return addDays(from, 1);
  if (/day after tomorrow|parso/.test(t)) return addDays(from, 2);
  const inN = t.match(/\b(?:in|within)\s+(\d{1,2})\s*(?:working\s+)?days?\b/) || t.match(/\b(\d{1,2})\s*days?\b/);
  const dm = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/) || t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/);
  if (dm) {
    const [day, mon] = /^\d/.test(dm[1]) ? [Number(dm[1]), dm[2]] : [Number(dm[2]), dm[1]];
    const y = Number(from.slice(0, 4)); let d = `${y}-${String(MON.indexOf(mon) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (d < addDays(from, -60)) d = `${y + 1}${d.slice(4)}`;
    return d;
  }
  const num = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (num) { const y = num[3] ? (num[3].length === 2 ? 2000 + Number(num[3]) : Number(num[3])) : Number(from.slice(0, 4)); return `${y}-${num[2].padStart(2, '0')}-${num[1].padStart(2, '0')}`; }
  for (let i = 0; i < 7; i++) {
    const re = new RegExp(`\\b(next\\s+)?${DOW[i]}|\\b${DOW[i].slice(0, 3)}\\b`);
    const m = t.match(re);
    if (m) { const cur = new Date(from + 'T00:00:00Z').getUTCDay(); let n = (i - cur + 7) % 7; if (n === 0) n = 7; if (m[1]) n += 7; return addDays(from, n); }
  }
  if (inN) return addDays(from, Number(inN[1]));
  if (/next week/.test(t)) return addDays(from, 7);
  return null;
}

export type Request = {
  title: string; itemText: string; sku: string | null; qty: number; unit: string; qtyInStockUnits: number; needBy: string | null;
  targetPrice?: number; location?: string | null; clarify?: string | null; enquiry: string; parser: 'llm' | 'rules';
};

const toNum = (s: string) => Number(s.replace(/,/g, ''));
export function matchSku(text: string, skus: Sku[]): string | null {
  const t = text.toLowerCase();
  let best: { sku: string; len: number } | null = null;
  for (const [sku, words] of Object.entries(ALIASES)) for (const w of words) if (t.includes(w) && (!best || w.length > best.len)) best = { sku, len: w.length };
  if (best) {
    // "ms sheet" alone defaults to 2 mm; an explicit thickness wins.
    if (best.sku.startsWith('RM-MS') && /\b5\s*mm\b/.test(t)) return 'RM-MS5';
    if (best.sku.startsWith('RM-MS') && /\b2\s*mm\b/.test(t)) return 'RM-MS2';
    return best.sku;
  }
  const hit = skus.find((k) => t.includes(k.sku.toLowerCase()) || t.includes(k.name.toLowerCase().split(' ·')[0]));
  return hit?.sku || null;
}

export function toStockUnits(sku: string | null, qty: number, unit: string, skus: Sku[]) {
  const k = skus.find((x) => x.sku === sku);
  if (!k) return qty;
  if (/^(kg|kgs|kilo)/.test(unit) && k.unit !== 'kg' && KG_PER_UNIT[k.sku]) return qty / KG_PER_UNIT[k.sku];
  if (/^(ton|tonne|t$|mt)/.test(unit) && KG_PER_UNIT[k.sku]) return (qty * 1000) / KG_PER_UNIT[k.sku];
  return qty;
}

// ---- Grounding: every number the LLM writes must already appear in the source text (or our own computed facts). ----
const nums = (s: string) => [...s.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, ''))).filter((n) => Number.isFinite(n));
export function ungrounded(out: string, sources: string[]): number[] {
  const have = new Set<number>();
  for (const src of sources) for (const n of nums(src)) { have.add(n); have.add(Math.round(n)); have.add(Math.round(n * 10) / 10); }
  return nums(out).filter((n) => n > 10 && !have.has(n) && !have.has(Math.round(n * 10) / 10) && !(n >= 1900 && n <= 2100));
}
const isoParts = (d?: string | null) => (d ? [d, ...d.split('-'), fmtLong(d)] : []);
export const fmtLong = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Rules version of the enquiry: the requirement exactly as typed. */
const verbatim = (text: string) => text.trim().replace(/\s+/g, ' ');
/** Drops conditions the owner never stated (e.g. "for a single day", "full-day shift"). */
const ADDED = /\b((single|full|half|one|whole)[- ]day|(single|one)[- ]way|single trip|one-time|per (day|shift)|shift|overtime|unloading|loading and unloading|insurance|warranty|certificate)\b/i;
export function stripAdded(enquiry: string, text: string): string {
  let out = enquiry; const lower = text.toLowerCase();
  for (let k = 0; k < 4; k++) {
    const m = out.match(ADDED); if (!m || lower.includes(m[0].toLowerCase())) break;
    const ph = m[0].replace(/[-\s]/g, '[-\\s]');
    const next = out.replace(new RegExp(`,?\\s*(\\b(for|on|as)\\s+)?(\\b(a|an)\\s+)?${ph}(\\s+(shift|trip|basis|work|job))?\\b`, 'i'), '');
    if (next === out) break; out = next;
  }
  return out.replace(/\s+([.,])/g, '$1').replace(/\s{2,}/g, ' ').trim() || enquiry;
}

export async function parseRequest(text: string, skus: Sku[], ctx: { company: string; location: string }): Promise<Request> {
  const list = skus.map((k) => `${k.sku}: ${k.name}${k.spec ? ` (${k.spec})` : ''} – stock unit ${k.unit}`).join('\n');
  const ai = await llmJson<{ title: string; sku: string | null; qty: number | null; unit: string | null; needBy: string | null; targetPrice: number | null; location: string | null; clarify: string | null; enquiry: string }>(
    `You help the purchase desk of ${ctx.company} (delivery address ${ctx.location}) source anything: materials, parts, services, transport, job work, rentals, manpower.
Today is ${TODAY} (${fmtLong(TODAY)}).${findDate(text) ? ` The need-by date is ${fmtLong(findDate(text)!)} – use exactly this date.` : ''} The owner may write Hinglish, Hindi or Telugu-English (e.g. "chahiye" = need, "kal" = tomorrow); always write the title and enquiry in clear English. Read the owner's requirement and return JSON:
{"title": short neutral title (max 8 words, e.g. "10-ton truck, Hyderabad to Pune"),
 "sku": the inventory SKU ONLY if the requirement is clearly one of these stocked items, else null,
 "qty": number or null, "unit": unit as the owner said it (kg, pcs, litres, trips, days, people…) or null,
 "needBy": YYYY-MM-DD or null, "targetPrice": number or null, "location": place(s) mentioned or null,
 "clarify": ONE short question if something essential is missing so suppliers cannot quote at all (e.g. no quantity for goods), else null,
 "enquiry": the requirement rewritten as a clear, polite, professional enquiry to a supplier in 2-4 sentences: what we need (item, spec, quantity), when and where it is needed, then one sentence asking for availability, price, payment terms and delivery timing. Keep every detail the owner gave and add NOTHING else: no duration (e.g. "single day", "full day", "per shift"), no purpose, scope, quality, loading/unloading or other conditions the owner did not state. Do NOT add specs, numbers, brands, grades, conditions or extra questions that the owner did not state (one closing sentence asking for availability, price, terms and timing is fine). No greeting or sign-off.}
Inventory:\n${list}`, text);
  if (ai && ai.enquiry) {
    const sku = ai.sku && skus.some((k) => k.sku === ai.sku) ? ai.sku : null;
    const qty = Number(ai.qty) || 0; const unit = (ai.unit || (sku ? skus.find((k) => k.sku === sku)!.unit : '')).toLowerCase();
    const needBy = findDate(text) || (ai.needBy && /^\d{4}-\d{2}-\d{2}$/.test(ai.needBy) ? ai.needBy : null); // weekday maths is deterministic; models get it wrong
    const bad = ungrounded(ai.enquiry, [text, ...isoParts(needBy), ctx.location, ctx.company]);
    if (bad.length) console.warn('[llm] enquiry had invented numbers', bad, '– using the requirement verbatim');
    return { title: String(ai.title || text).slice(0, 80), itemText: text, sku, qty, unit, qtyInStockUnits: toStockUnits(sku, qty, unit, skus), needBy, targetPrice: Number(ai.targetPrice) || undefined,
      location: ai.location || null, clarify: ai.clarify || null, enquiry: bad.length ? verbatim(text) : stripAdded(ai.enquiry.trim(), text), parser: 'llm' };
  }
  const sku = matchSku(text, skus);
  // Ignore thicknesses/sizes ("2mm") when picking the quantity.
  const qtyMatch = [...text.toLowerCase().matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(kgs?|kilos?|tonnes?|tons?|mt|pcs|pieces|nos|units|sheets?|boxes|kits|sets|litres?|liters?|ltrs?|metres?|meters?|trips?|days?|people|persons?|mm)?\b/g)].find((m) => m[2] !== 'mm');
  const qty = qtyMatch ? toNum(qtyMatch[1]) : 0;
  const u = qtyMatch?.[2] ? qtyMatch[2].replace(/s$/, '').replace('piece', 'pcs').replace('kilo', 'kg') : skus.find((k) => k.sku === sku)?.unit || '';
  const tp = text.match(/(?:target|budget|max|under)\s*(?:price)?\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
  return { title: verbatim(text).slice(0, 80), itemText: text, sku, qty, unit: u, qtyInStockUnits: toStockUnits(sku, qty, u, skus), needBy: findDate(text), targetPrice: tp ? toNum(tp[1]) : undefined, clarify: null, enquiry: verbatim(text), parser: 'rules' };
}

/** Re-states the enquiry for a stock shortfall (we only ask for what we are short of). */
export async function enquiryForShortfall(req: Request, askQty: number, askUnit: string): Promise<string> {
  if (req.parser === 'llm') {
    const ai = await llmJson<{ enquiry: string }>(`Rewrite this supplier enquiry so the quantity requested is exactly ${askQty} ${askUnit}. Change nothing else, add nothing. Return {"enquiry": "..."}`, req.enquiry);
    if (ai?.enquiry && !ungrounded(ai.enquiry, [req.enquiry, `${askQty}`]).length) return ai.enquiry.trim();
  }
  return `${req.enquiry}\nQuantity required now: ${askQty.toLocaleString('en-IN')} ${askUnit} (we have part of it in stock).`;
}

/** Drops the quoted original ("On ... wrote:" / "> " lines) and signatures from an email reply. */
export const cleanReply = (text: string) => text.replace(/\r/g, '').split(/\n\s*(?:on [^\n]{3,250}(?:\n[^\n]{0,250})?wrote:|-{2,}\s*original message|from:\s.+\nsent:)/i)[0].split('\n').filter((l) => !/^\s*>/.test(l)).join('\n').trim();

export type Quote = {
  available: boolean | null; canDo?: 'yes' | 'no' | 'partial' | 'unclear'; qty: number | null; unit: string | null; price: number | null; priceUnit: string | null;
  priceBasis?: 'per_unit' | 'lump_sum' | null; freight: number | null; gst?: 'included' | 'extra' | null; shipDate: string | null; terms: string | null;
  validity?: string | null; conditions?: string[]; questions?: string[]; summary?: string; notes: string; parser: 'llm' | 'rules'; confidence: number;
};

const QUESTION_RE = /[^.!?\n]*\?/g;
export async function parseReply(text: string, ctx: { requirement: string; unit: string; askedQty: number; sentOn: string }): Promise<Quote> {
  const ai = await llmJson<any>(
    `You read a supplier's reply to our enquiry and extract facts. The reply may be in any form – email, WhatsApp shorthand, a phone-call transcript, Hinglish or Telugu/Hindi mixed with English.
Our enquiry: "${ctx.requirement}" (quantity asked: ${ctx.askedQty || 'not stated'} ${ctx.unit}). Today is ${ctx.sentOn}.
Return JSON with ONLY what the reply actually says (null / [] when not stated – never guess):
{"canDo": "yes"|"no"|"partial"|"unclear", "qty": number|null, "unit": string|null,
 "price": number|null (the number exactly as quoted), "priceUnit": what the price is per (e.g. "kg", "pc", "trip", "day", "litre") or null, "priceBasis": "per_unit"|"lump_sum"|null,
 "freight": number|null (0 if they say free/included), "gst": "included"|"extra"|null, "deliveryDate": YYYY-MM-DD|null, "terms": payment terms|null,
 "validity": quote validity|null, "conditions": [short strings], "questions": [questions the supplier asks us, in English],
 "summary": one line in English: can do or not, price/terms if any, timing, conditions}`, text);
  if (ai && typeof ai === 'object' && ai.canDo) {
    const src = [text];
    const keep = (n: any) => (typeof n === 'number' && Number.isFinite(n) && (n === 0 || !ungrounded(String(n), src).length) ? n : null); // a number must appear in the reply
    const canDo = ['yes', 'no', 'partial', 'unclear'].includes(ai.canDo) ? ai.canDo : 'unclear';
    const shipDate = findDate(text.toLowerCase().replace(/net\s*\d+|\d+\s*days?\s*credit|\d+\s*%/g, ''), ctx.sentOn) || (typeof ai.deliveryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ai.deliveryDate) ? ai.deliveryDate : null);
    const q: Quote = { available: canDo === 'no' ? false : canDo === 'unclear' ? null : true, canDo, qty: keep(ai.qty), unit: ai.unit || null, price: keep(ai.price), priceUnit: ai.priceUnit || null,
      priceBasis: ai.priceBasis === 'lump_sum' ? 'lump_sum' : ai.price != null ? 'per_unit' : null, freight: keep(ai.freight), gst: ai.gst === 'included' || ai.gst === 'extra' ? ai.gst : null, shipDate, terms: ai.terms || null,
      validity: ai.validity || null, conditions: Array.isArray(ai.conditions) ? ai.conditions.map(String).slice(0, 6) : [], questions: Array.isArray(ai.questions) ? ai.questions.map(String).slice(0, 4) : [],
      summary: String(ai.summary || '').slice(0, 240), notes: text.trim().split('\n').filter(Boolean).slice(0, 3).join(' ').slice(0, 220), parser: 'llm', confidence: 90 };
    if (canDo === 'partial' && q.qty == null) q.confidence = 75;
    return q;
  }
  return rulesReply(text, ctx);
}

function rulesReply(text: string, ctx: { unit: string; askedQty: number; sentOn: string }): Quote {
  const t = text.replace(/\r/g, '').split(/\n(?:on .+wrote:|-{2,}\s*original|>)/i)[0]; // drop quoted RFQ
  const low = t.toLowerCase();
  const no = /\b(no stock|not available|out of stock|can't supply|cannot supply|unable|regret|sorry,? (we )?(don't|do not) have)\b/.test(low);
  const priceM = low.match(/(?:₹|rs\.?|inr|rate|price)\s*[:\-]?\s*(?:₹|rs\.?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:\/|per|a|each)?\s*-?\s*(kg|pc|pcs|piece|sheet|nos|unit|litre|liter|ltr|trip|day|month|visit|box|person)?/) || low.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:₹|rs|rupees)\s*(?:\/|per)?\s*(kg|pc|pcs|piece|sheet|nos|unit|litre|liter|ltr|trip|day|month|visit|box|person)?/)
    || low.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:\/|per)\s*(kg|pc|pcs|piece|sheet|nos|unit|litre|liter|ltr|trip|day|month|visit|box|person)\b/);
  const freightM = low.match(/(?:freight|transport|delivery charges?|courier)\s*(?:of|:|-)?\s*(?:₹|rs\.?)?\s*(\d[\d,]*)/) ;
  const freeFreight = /free (delivery|freight|transport)|freight (free|included|nil)|incl(?:uding|\.)? freight/.test(low);
  const qtyM = [...low.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(kgs?|pcs|pieces|nos|sheets?|units|tonnes?|mt|litres?|liters?|ltrs?|boxes|trips?|days?|people|persons?)\b/g)].find((m) => !priceM || m.index !== priceM.index);
  const terms = low.match(/net\s*-?\s*(\d{1,3})/) ? `Net ${low.match(/net\s*-?\s*(\d{1,3})/)![1]}` : /(\d{1,3})\s*%\s*advance/.test(low) ? `${low.match(/(\d{1,3})\s*%\s*advance/)![1]}% advance` : /full advance|advance payment|100\s*%\s*advance/.test(low) ? '100% advance' : /\bcod\b|cash on delivery/.test(low) ? 'Cash on delivery' : /(\d{1,3})\s*days?\s*credit/.test(low) ? `Net ${low.match(/(\d{1,3})\s*days?\s*credit/)![1]}` : null;
  const shipDate = findDate(low.replace(/net\s*\d+|\d+\s*days?\s*credit|\d+\s*%/g, ''), ctx.sentOn);
  const qty = qtyM ? Number(qtyM[1].replace(/,/g, '')) : no ? 0 : /\b(all|full (qty|quantity)|yes,? (we )?have|available|in stock)\b/.test(low) ? ctx.askedQty : null;
  const price = priceM ? Number(priceM[1].replace(/,/g, '')) : null;
  const filled = [price, qty, shipDate, terms].filter((x) => x !== null).length;
  return { available: no ? false : qty !== null || price !== null ? true : null, qty, unit: qtyM ? qtyM[2].replace(/s$/, '').replace('piece', 'pcs') : ctx.unit, price, priceUnit: priceM?.[2]?.replace(/s$/, '').replace('piece', 'pcs') || ctx.unit, freight: freeFreight ? 0 : freightM ? Number(freightM[1].replace(/,/g, '')) : null, shipDate, terms, notes: t.trim().split('\n').filter(Boolean).slice(0, 3).join(' ').slice(0, 220), parser: 'rules', confidence: no ? 90 : 40 + filled * 14,
    canDo: no ? 'no' : qty !== null && ctx.askedQty && qty < ctx.askedQty ? 'partial' : qty !== null || price !== null ? 'yes' : 'unclear', questions: (t.match(QUESTION_RE) || []).map((x) => x.trim()).filter((x) => x.length > 8).slice(0, 3), conditions: [], gst: /gst\s*(extra|additional|excl)|\+\s*gst|plus gst/.test(low) ? 'extra' : /incl(uding|\.)?\s*gst|gst incl/.test(low) ? 'included' : null, priceBasis: price != null ? (/lump ?sum|total|all inclusive|per trip/.test(low) && !priceM?.[2] ? 'lump_sum' : 'per_unit') : null };
}
