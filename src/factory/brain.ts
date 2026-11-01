/** v3 chat brain: new intents (sourcing, money, focus, tenders from text, licence upload) and the AI fallback for everything else.
 *  Every answer is a Resp with visual blocks; interactive cards use the 'fx' block (rendered by cards.tsx). */
import type { Resp } from '../lib/converse';
import { fx, renewalRows, TENDERS, tenderView, GROUPS, groupState, groupTotal, ORDERS, updateDue, CREW, SITES, inr, lakh, fmtD, iso, daysTo, LADDER, type SiteId } from './data';
import { CATS, rankSuppliers, MONEY, COSTING, PROFILE, certHave, CONTACTS, THREADS, TEAM, person, away, type Supplier, type Contact, type Thread } from './more';
import { parseTender, type LicFields, type TenderFields } from './docs';
import { factoryContext } from './chat';
import { listToTable } from './guard';

export type Bar = { label: string; v: number; tone?: 'red' | 'amber' | 'green' | 'blue' };
export type Check = { label: string; need: string; have: string; ok: boolean | null };
export type Cost = { material: number; labour: number; overhead: number; unitCost: number; lo: number; hi: number; rec: number; marginRec: number; why: string[] };
export type FxC =
  | { k: 'bars'; title: string; unit: string; bars: Bar[]; note?: string }
  | { k: 'licence'; file: string; how: string; f: LicFields; status: 'pending' | 'added' | 'cancelled'; id?: string; dup?: string }
  | { k: 'sourcing'; item: string; spec: string; qty: number; unit: string; rows: (Supplier & { ok: boolean })[]; pick: number; status: 'pending' | 'rfq' | 'po'; ref?: string }
  | { k: 'contacts'; title: string; rows: Contact[] }
  | { k: 'threads'; ids: string[] }
  | { k: 'thread'; id: string; status: 'pending' | 'sent' }
  | { k: 'team'; ids: string[]; focus?: string }
  | { k: 'tender'; file: string; t: TenderFields; checks: Check[]; verdict: 'yes' | 'gaps' | 'no'; cost: Cost | null; price: number; status: 'pending' | 'approved'; files?: string[] };
const R = (title: string, blocks: Resp['blocks'], actions: Resp['actions'] = [], links: Resp['links'] = []): Resp => ({ title, blocks, sources: [], actions, links });
const card = (c: FxC) => ({ type: 'fx' as const, c });

/* ── Sourcing ── */
export function sourcingCard(text: string): FxC | null {
  const q = text.toLowerCase(); const c = CATS.find((x) => x.match.test(q)); if (!c) return null;
  const m = q.match(/(\d[\d,]*(?:\.\d+)?)\s*(k\b|thousand|lakh)?/); let qty = m ? +m[1].replace(/,/g, '') : 0; if (m?.[2] === 'k' || m?.[2] === 'thousand') qty *= 1000; if (m?.[2] === 'lakh') qty *= 1e5;
  if (/\d-?ply/.test(q) && m && /ply/.test(q.slice(q.indexOf(m[0]) + m[0].length, q.indexOf(m[0]) + m[0].length + 4))) qty = 0; // "5-ply" is not a quantity
  if (!qty) { const all = [...q.matchAll(/(\d[\d,]*)/g)].map((x) => +x[1].replace(/,/g, '')).filter((n) => n >= 10); qty = all[0] || c.suppliers[0].moq; }
  const ply = q.match(/(\d)\s*-?\s*ply/); const spec = ply && c.id === 'box' ? c.spec.replace(/^\d-ply/, `${ply[1]}-ply`) : c.spec;
  const { rows, pick } = rankSuppliers(c, qty);
  return { k: 'sourcing', item: c.label, spec, qty, unit: c.unit, rows, pick, status: 'pending' };
}
export const SOURCING_RE = /(find|source|sourcing|get me|need|looking for|quote|quotes|rfq|cheapest|best price|buy)\b.*|suppliers?|vendors?/;
export function sourcingResp(text: string): Resp | null {
  const q = text.toLowerCase(); if (!SOURCING_RE.test(q)) return null;
  const c = sourcingCard(text);
  if (c && c.k === 'sourcing') { const p = c.rows[c.pick]; return R(`${c.rows.length} suppliers for ${c.qty.toLocaleString('en-IN')} ${c.unit} – I suggest ${p.name.replace(' (demo)', '')}`, [card(c)]); }
  if (/suppliers? for|vendors? for|source |sourcing|find .*supplier/.test(q)) return R("I don't have suppliers for that in the demo list yet", [{ type: 'text', text: `Try one of these: ${CATS.map((x) => x.label.toLowerCase()).join(', ')}.` }], CATS.slice(0, 4).map((x) => ({ label: x.label, kind: `ask:find suppliers for ${x.suppliers[0].moq * 2} ${x.label.toLowerCase()}` })));
  return null;
}

/* ── Money ── */
export function moneyResp(q: string): Resp | null {
  if (!/cash|bank balance|money|owe|receivable|payable|outstanding|collect|\bgst\b|salar|sales|revenue|turnover|margin|profit|payments?|overdraft|\bod\b|afford|finance|credit|\bdues?\b/.test(q) || /tender|bid|licen|supplier for/.test(q)) return null;
  const M = MONEY; const out7 = M.payables.filter((p) => p.due <= 7).reduce((a, p) => a + p.amt, 0); const rec = M.receivables.reduce((a, r) => a + r.amt, 0);
  if (/owe|receivable|outstanding|collect|debtor|pending payment|not paid|overdue/.test(q) && !/we owe|payable/.test(q)) {
    const rows = [...M.receivables].sort((a, b) => b.days - a.days);
    return R(`Customers owe you ${lakh(rec)} – ${lakh(rows.filter((r) => r.days > 60).reduce((a, r) => a + r.amt, 0))} is over 60 days`, [
      card({ k: 'bars', title: 'Who owes you (₹ lakh)', unit: 'L', bars: rows.map((r) => ({ label: r.who.split(' (')[0], v: +(r.amt / 1e5).toFixed(1), tone: r.days > 90 ? 'red' : r.days > 60 ? 'amber' : 'green' })) }),
      { type: 'table', cols: ['Customer', 'Amount', 'Days', 'Note'], align: ['l', 'r', 'r', 'l'], rows: rows.map((r) => [r.who.replace(' (fictional)', ''), inr(r.amt), `${r.days}`, r.note]) },
    ], [{ label: 'Draft reminder to Agri-Krishi (96 days)', kind: 'fx:remind:3', primary: true }, { label: 'Draft follow-up to AP FiberGrid', kind: 'fx:remind:1' }]);
  }
  if (/we owe|payable|pay this week|payments? due|bills|due this week|vendor payment|supplier payment/.test(q)) {
    return R(`${inr(out7)} to pay in the next 7 days`, [{ type: 'table', cols: ['Pay to', 'Amount', 'Due'], align: ['l', 'r', 'l'], rows: [...M.payables].sort((a, b) => a.due - b.due).map((p) => [p.who, inr(p.amt), `in ${p.due} days`]) },
      { type: 'facts', items: [{ label: 'GST (GSTR-3B)', value: `${inr(M.gst.amt - M.gst.itc)} after input credit · due ${M.gst.due}`, tone: 'amber' }, { label: 'Salaries', value: `${inr(M.salaries.amt)} on ${M.salaries.due}`, tone: 'blue' }, { label: 'Cash in bank', value: inr(M.bank), tone: 'green' }] }]);
  }
  if (/\bgst\b/.test(q)) return R(`GST due ${M.gst.due}: ${inr(M.gst.amt - M.gst.itc)} to pay after ${inr(M.gst.itc)} input credit`, [{ type: 'facts', items: [{ label: 'Output GST (Oct)', value: inr(M.gst.amt) }, { label: 'Input credit', value: inr(M.gst.itc), tone: 'green' }, { label: 'Cash to pay', value: inr(M.gst.amt - M.gst.itc), tone: 'amber' }, { label: 'Due', value: M.gst.due, tone: 'amber' }] }]);
  if (/margin|profit/.test(q)) return R('Margin by business (last 6 months)', [card({ k: 'bars', title: 'Gross margin %', unit: '%', bars: M.margin.map(([l, v]) => ({ label: l, v, tone: v < 12 ? 'amber' : 'green' })), note: 'Packaging is thin because board prices rose 9% since June. Drones carry the best margin.' })]);
  if (/sales|revenue|turnover/.test(q)) { const tot = M.sales.reduce((a, [, v]) => a + v, 0); return R(`Sales: ₹${tot.toFixed(2)} Cr in the last 6 months – October ₹${M.sales[5][1]} Cr`, [card({ k: 'bars', title: 'Monthly sales (₹ Cr)', unit: 'Cr', bars: M.sales.map(([l, v]) => ({ label: l, v, tone: 'blue' })), note: `Average annual turnover (3 years, CA certified): ₹${PROFILE.avgTurnoverCr} Cr.` })]); }
  return R(`Cash today: ${inr(M.bank)} in bank + ${inr(M.odLimit - M.odUsed)} unused overdraft`, [
    { type: 'facts', items: [{ label: 'Cash in bank', value: inr(M.bank), tone: 'green' }, { label: 'Out in next 7 days', value: inr(out7), tone: 'amber' }, { label: 'Customers owe you', value: lakh(rec), tone: 'blue', to: '/finance' }, { label: 'GST due ' + M.gst.due, value: inr(M.gst.amt - M.gst.itc), tone: 'amber' }] },
    card({ k: 'bars', title: 'Next 30 days (₹ lakh)', unit: 'L', bars: [{ label: 'Cash now', v: +(M.bank / 1e5).toFixed(1), tone: 'green' }, { label: 'Expected in', v: +((rec - 17_40_000) / 1e5).toFixed(1), tone: 'blue' }, { label: 'Going out', v: +((out7 + 4_20_000 + M.salaries.amt + M.gst.amt - M.gst.itc) / 1e5).toFixed(1), tone: 'red' }] }),
  ], [{ label: 'Who owes us?', kind: 'ask:who owes us money?' }, { label: 'What do we pay this week?', kind: 'ask:what payments are due this week?' }]);
}

/* ── Focus / what needs me ── */
export function focusResp(): Resp {
  const s = fx.get(); const rows: string[][] = []; const acts: Resp['actions'] = [];
  renewalRows(s).filter((x) => (x.left <= 30 || x.late) && x.status !== 'Filed – awaiting authority').slice(0, 3).forEach((x) => { rows.push(['Licence', `${x.r.kind} – ${x.r.site === 'All' ? 'Company' : SITES[x.r.site as SiteId].short}`, x.left < 0 ? `expired ${-x.left}d ago` : `${x.left} days left`]); if (acts.length < 2) acts.push(x.status.startsWith('Pack ready') ? { label: `Approve & file ${x.r.kind}`, kind: `fx:renew:${x.r.id}`, primary: !acts.length } : { label: `Draft pack: ${x.r.kind}`, kind: `fx:prep:${x.r.id}` }); });
  TENDERS.map((t) => ({ t, v: tenderView(s, t) })).filter((x) => !x.v.approved && x.v.open.length).slice(0, 1).forEach((x) => rows.push(['Tender', `${x.t.id} ${x.t.name}`, `${x.v.open.length} questions · closes ${fmtD(x.t.closes)}`]));
  GROUPS.map((g) => groupState(s, g)).filter((g) => !g.po).slice(0, 1).forEach((g) => { rows.push(['Purchase', g.item, `${inr(groupTotal(g))} – ${g.quotes[g.pick].supplier}`]); acts.push({ label: `Approve PO ${inr(groupTotal(g))}`, kind: `fx:po:${g.id}` }); });
  CREW.filter((c) => c.need && !s.booked[c.site]).forEach((c) => rows.push(['People', SITES[c.site].short, c.need!]));
  ORDERS.filter((o) => updateDue(s, o)).slice(0, 1).forEach((o) => { rows.push(['Customer', `${o.contact} (${o.country})`, `waiting ${o.lastUpdateDays} days for an update`]); acts.push({ label: `Send update to ${o.contact.split(' ')[0]}`, kind: `fx:update:${o.id}` }); });
  const top = rows.slice(0, 6);
  return R(top.length ? `${top.length} things need you – start with the ${top[0][0].toLowerCase()}` : 'Nothing urgent needs you right now', top.length ? [{ type: 'table', cols: ['Area', 'What', 'Why now'], rows: top }] : [], acts.slice(0, 4), [{ label: 'Open Today', to: '/' }]);
}

/* ── Tender eligibility + costing ── */
export function evaluateTender(t: TenderFields, file: string): FxC {
  const checks: Check[] = [];
  if (t.minTurnoverCr !== null) checks.push({ label: 'Average turnover (3 years)', need: `₹${t.minTurnoverCr} Cr`, have: `₹${PROFILE.avgTurnoverCr} Cr (${PROFILE.turnover.map(([, v]) => v).join(' / ')})`, ok: PROFILE.avgTurnoverCr >= t.minTurnoverCr });
  for (const c of t.certs) { const h = certHave(c); checks.push({ label: c, need: 'Required', have: h.how || 'Not in your library', ok: h.ok }); }
  if (t.similarOrders !== null) { const have = PROFILE.similar[t.family] || 0; checks.push({ label: 'Similar past supplies', need: `${t.similarOrders} orders`, have: `${have} orders (work orders in library)`, ok: have >= t.similarOrders }); }
  if (t.emd !== null) checks.push({ label: 'EMD', need: inr(t.emd), have: t.msmeExempt ? 'Exempt – Udyam (Small) certificate' : `Pay ${inr(t.emd)} as bank guarantee (OD has room)`, ok: true });
  for (const o of t.other) checks.push(/manufacturer/i.test(o) ? { label: 'Manufacturer only', need: 'Required', have: 'Yes – own factories at 3 sites', ok: true } : { label: o.slice(0, 60), need: 'Required', have: 'Needs your decision / undertaking', ok: null });
  const fails = checks.filter((c) => c.ok === false); const verdict = fails.length === 0 ? 'yes' : fails.some((f) => /turnover|similar/i.test(f.label)) ? 'no' : 'gaps';
  const k = COSTING[t.family]; let cost: Cost | null = null; let price = 0;
  if (k && k.material && t.qty) {
    const unitCost = k.material + k.labour + k.overhead; const marginRec = Math.round((k.marginLo + k.marginHi) / 2 - (t.family === 'rf' ? 0 : 2));
    const r = (m: number) => Math.round(unitCost * (1 + m / 100) * (k.material > 1000 ? 1 : 100)) / (k.material > 1000 ? 1 : 100);
    cost = { material: k.material, labour: k.labour, overhead: k.overhead, unitCost, lo: r(k.marginLo), hi: r(k.marginHi), rec: r(marginRec), marginRec,
      why: [`Your cost per ${k.unit}: ${inr(unitCost)} (material ${inr(k.material)}, labour ${inr(k.labour)}, overhead ${inr(k.overhead)})`, `Range is ${k.marginLo}–${k.marginHi}% margin. I suggest ${marginRec}%.`, k.won] };
    price = cost.rec;
  }
  return { k: 'tender', file, t, checks, verdict, cost, price, status: 'pending' };
}
export function tenderTextResp(text: string): Resp | null {
  if (text.length < 160 || !/tender|bid|\bnit\b/i.test(text) || !/turnover|emd|eligib|iso/i.test(text)) return null;
  const c = evaluateTender(parseTender(text), 'pasted text'); return R(tenderTitle(c), [card(c)]);
}
export const tenderTitle = (c: FxC) => c.k !== 'tender' ? '' : c.verdict === 'yes' ? `Yes, you can apply – you meet all ${c.checks.length} conditions` : c.verdict === 'no' ? `Not eligible yet – ${c.checks.filter((x) => x.ok === false).length} condition${c.checks.filter((x) => x.ok === false).length > 1 ? 's' : ''} not met` : `Almost – ${c.checks.filter((x) => x.ok === false).length} gap to fix before you apply`;

/* ── Licence upload: the card that confirms what was read ── */
export function licenceCard(f: LicFields, file: string, how: string): FxC {
  const s = fx.get(); const dup = renewalRows(s).find((x) => f.number && x.r.number.replace(/\W/g, '') === f.number.replace(/\W/g, ''));
  return { k: 'licence', file, how, f, status: 'pending', dup: dup ? dup.r.id : undefined };
}
export const reminderPlan = (expires: string) => LADDER.map((l) => { const on = iso(daysTo(expires) - l.at); return { at: l.at, on, ch: l.ch, done: daysTo(on) <= 0 }; });

/* ── Help + AI fallback ── */
export const SAMPLES = [
  { file: 'Licence_FireNOC_Site1_Cherlapally.pdf', label: 'Fire NOC (PDF)' }, { file: 'Licence_PollutionCTO_Site1_Cherlapally.pdf', label: 'Pollution CTO (PDF)' },
  { file: 'Licence_TradeLicence_Site3_Medak.png', label: 'Trade licence (photo)' }, { file: 'Tender_BTNL_RF_Modules_2026.pdf', label: 'RF modules tender' }, { file: 'Tender_OAM_Agri_Drones_2026.pdf', label: 'Drone tender' },
];
export function helpResp(): Resp {
  return R('Hi Ranjith – here is what I can do', [{ type: 'table', cols: ['Ask or upload', 'I will'], rows: [
    ['Upload a licence (PDF or photo)', 'read it, add it to the register and set 90/60/30/7-day reminders'], ['Upload or paste a tender', 'check if you can apply, suggest a price, and make the full bid ZIP'],
    ['"Find suppliers for 5000 5-ply boxes"', 'compare suppliers, recommend one, draft the RFQ or PO'], ['"What expires this month?"', 'show licences by site with one-tap renewals'],
    ['"Who owes us money?" / "Cash position"', 'money at a glance with charts'], ['"What should I focus on today?"', 'your top items with one-tap approvals']] }],
  SAMPLES.map((x) => ({ label: `Try: ${x.label}`, kind: `fx:sample:${x.file}` })));
}
export async function askAi(text: string, history: { role: string; text: string }[]): Promise<Resp> {
  const t0 = Date.now();
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 11000);
    const r = await fetch('/api/fx/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, context: factoryContext() + '\n' + JSON.stringify({ money: MONEY, costing: COSTING, profile: PROFILE, suppliers: CATS.map((c) => `${c.label}: ${c.suppliers.map((s) => `${s.name} ₹${s.price} MOQ ${s.moq} ${s.lead}d ★${s.rating}`).join('; ')}`) }), history }), signal: ctl.signal });
    clearTimeout(tm); const j = await r.json();
    if (j.ok) { let reply: string = j.reply || ''; let table = j.table && j.table.rows?.length ? j.table : null;
      const g = listToTable(reply); if (g) { reply = g.lead || 'Here it is:'; if (!table) table = g.table; } // list guardrail
      return R('', [{ type: 'md', at: Date.now(), text: reply }, ...(table ? [{ type: 'table' as const, cols: table.cols, rows: table.rows }] : [])], (j.followups || []).map((f: string) => ({ label: f, kind: `ask:${f}` }))); }
  } catch { /* timeout or offline – fall through */ }
  void t0;
  return R("I couldn't get an AI answer in time", [{ type: 'text', text: 'Nothing was sent or changed. These I can answer right away:' }], [{ label: 'Try again', kind: `ask:${text}`, primary: true }, { label: 'What should I focus on?', kind: 'ask:what should I focus on today?' }, { label: 'Cash position', kind: 'ask:what is our cash position?' }, { label: 'What can you do?', kind: 'ask:what can you do?' }]);
}

/* ── v4: contacts, email threads, team availability ── */
export const ownerOf = (t: Thread) => person(fx.get().reassign?.[t.id] || t.owner);
export const stalledAway = () => THREADS.filter((t) => t.waitingOn === 'us' && away(ownerOf(t))).sort((a, b) => b.days - a.days);
const findThread = (q: string) => THREADS.find((t) => t.key.test(q) || (t.ref && q.includes(t.ref.toLowerCase())));
const CONTACT_RE = /\bcontacts?\b|phone|mobile|numbers?\b|email ids?|email address|whatsapp|how (do i|to|can i) reach|reach out|call (them|the)|details of (our|the)|address book/;
export function opsResp(text: string): Resp | null {
  const q = text.toLowerCase();
  // who is handling X / availability
  const who = /who('?s| is)? (handling|owning|owns|managing|looking after|responsible|working on|in charge)|who handles|owner of|is (he|she|they) available|availab|on leave|presence|who is (in|out|away|off)|out of office|team status|who('?s| is) (free|around)/;
  if (who.test(q)) {
    const t = findThread(q);
    if (t) { const o = ownerOf(t); const bk = o.backup ? person(o.backup) : null;
      return R(`${o.name} is handling the ${t.company.replace(/ \((demo|fictional)\)/, '')} ${t.ref || 'thread'} – ${away(o) ? `${o.status.toLowerCase()} till ${o.until}` : o.status.toLowerCase()}`, [card({ k: 'team', ids: [o.id, ...(bk ? [bk.id] : [])], focus: t.id }), card({ k: 'thread', id: t.id, status: 'pending' })],
        bk && away(o) ? [{ label: `Reassign to ${bk.name.split(' ')[0]}`, kind: `fx:reassign:${t.id}:${bk.id}`, primary: true }] : []); }
    const out = TEAM.filter(away);
    return R(`${TEAM.length - out.length} of ${TEAM.length} available today – ${out.map((p) => `${p.name.split(' ')[0]} ${p.status.toLowerCase()}`).join(', ')}`, [card({ k: 'team', ids: TEAM.map((p) => p.id) })]);
  }
  // email threads
  if (/thread|e-?mails?\b|inbox|mails?\b|follow.?ups?\b|stalled|stuck/.test(q) && !/draft (an?|the) (status )?update|licen|tender/.test(q)) {
    const t = findThread(q);
    if (t && /summar|thread|status|what|latest|happen|stuck|pending|where/.test(q)) return R(`${t.company.replace(/ \((demo|fictional)\)/, '')}: ${t.waitingOn === 'us' ? `waiting on us for ${t.days} days` : `waiting on them (${t.days} d)`}`, [card({ k: 'thread', id: t.id, status: 'pending' })]);
    if (/pending|summar|digest|stuck|stall|what|which|status|follow|show|list|open|inbox|thread/.test(q)) { const us = THREADS.filter((x) => x.waitingOn === 'us');
      return R(`${us.length} threads waiting on you, ${stalledAway().length} stuck because the owner is away`, [card({ k: 'threads', ids: THREADS.map((x) => x.id) })], [{ label: `Summarise the ${THREADS[0].company.split(' (')[0]} thread`, kind: `ask:summarise the ${THREADS[0].company.split(' (')[0]} thread` }, { label: 'Who is handling the AeroSpark order?', kind: 'ask:who is handling the AeroSpark order and are they available?' }]); }
  }
  // contacts / people lists
  if (CONTACT_RE.test(q) || /^(list|show|get)( me)? (all |our )?(suppliers|vendors|customers|people|team|staff)\b/.test(q) || /who (are|is) our (suppliers?|vendors?|customers?)/.test(q)) {
    let rows: Contact[] = CONTACTS; let what = 'Contacts';
    if (/supplier|vendor/.test(q)) { rows = CONTACTS.filter((c) => c.kind !== 'Customer'); what = 'Supplier contacts'; }
    else if (/customer|buyer|client/.test(q)) { rows = CONTACTS.filter((c) => c.kind === 'Customer'); what = 'Customer contacts'; }
    else if (/team|staff|employee|people|colleague|internal/.test(q)) { rows = TEAM.map((p) => ({ company: p.site, name: p.name, role: p.role, kind: 'Internal' as const, city: p.status + (p.until ? ` till ${p.until}` : ''), phone: p.phone, email: p.email, about: p.note || '' })); what = 'Team contacts'; }
    const named = rows.filter((c) => q.includes(c.company.toLowerCase().split(' ')[0]) || q.includes(c.name.toLowerCase().split(' ')[0]));
    if (named.length) rows = named;
    return R(`${what} – ${rows.length}`, [card({ k: 'contacts', title: what, rows })]);
  }
  return null;
}

