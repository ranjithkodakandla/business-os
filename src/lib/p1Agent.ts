// Chat commands for the P1/P2 modules. Each answer is a structured `view` card (KPIs, charts, tables, status items).
// When a command is missing a detail, the card asks for it and the next reply completes that same command.
import type { View } from './domainViews';
import type { Col, Row } from './dataAgent';
import { getP1, updateP1, mrp, supplierScore, flatBom, type P1State } from './p1Data';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const inrL = (n: number) => (Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, '')} lakh` : inr(n));
const C = (key: string, label: string, type?: Col['type']): Col => ({ key, label, type, align: type && type !== 'text' && type !== 'badge' ? 'r' : 'l' });
const v = (domain: string, title: string, headline: string, rest: Partial<View>): View => ({ kind: 'view', via: 'rules', domain, title, headline, actions: [], ...rest });
const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const TODAY = '2026-10-29';

type Pending = { tool: 'plan' | 'reject' | 'expense'; args: Record<string, string | number | undefined> };
let pending: Pending | null = null;
export const p1Pending = () => pending;

const DEFECTS = ['porosity', 'blow ?holes?', 'cracks?', 'bore oversize', 'oversize', 'undersize', 'burrs?', 'dents?', 'rust', 'weld spatter', 'lip damage', 'thickness', 'dimension(al)?', 'surface finish', 'scratch(es)?', 'leak(age)?'];
const defectOf = (t: string) => { const m = t.match(new RegExp(`\\b(${DEFECTS.join('|')})\\b`, 'i')) || t.match(/\bfor ([a-z ]{3,30})$/i); return m ? m[1].trim().replace(/^\w/, (c) => c.toUpperCase()) : undefined; };
const lotOf = (t: string) => t.match(/\b(?:lot\s*)?(L-?\d{2,3})\b/i)?.[1].toUpperCase().replace(/^L-?/, 'L-');
const productOf = (t: string) => /\bb-?0?4\b|bracket/i.test(t) ? 'FG-B04' : /\ba-?17\b|housing/i.test(t) ? 'FG-A17' : undefined;
const numOf = (t: string) => { const m = t.replace(/,/g, '').match(/\b(\d+(?:\.\d+)?)\s*(k|lakh)?\b(?!\s*(st|nd|rd|th)\b)/i); if (!m) return undefined; return Number(m[1]) * (m[2]?.toLowerCase() === 'k' ? 1000 : m[2] ? 1e5 : 1); };

/* ---------- views ---------- */
export function planView(code: string, qty: number, when: string): View {
  const s = getP1(); const b = s.boms.find((x) => x.code === code)!;
  const req = mrp(code, qty); const short = req.filter((r) => r.short > 0);
  const id = `WO-${2295 + s.wos.filter((w) => +w.id.slice(3) >= 2295).length}`;
  updateP1((d) => { d.wos.push({ id, product: b.name, qty, stage: 'Planned', start: when, due: when, line: code === 'FG-A17' ? 'Line 1 · CNC-2' : 'Line 3 · Press', planCost: qty * b.cost, actualCost: 0, progress: 0 }); });
  const buy = sum(short, (r) => r.short * r.cost);
  return v('production', `Plan: ${qty} × ${b.name}`, short.length ? `Planned ${id} for ${qty} ${b.name.split(' ')[0]} units next week. ${short.length} material${short.length > 1 ? 's are' : ' is'} short – about ${inrL(buy)} to buy before ${when}.` : `Planned ${id} for ${qty} units next week – all materials are in stock.`, {
    kpis: [{ label: 'Work order', value: id, sub: 'Planned', tone: 'blue' }, { label: 'Plan cost', value: inrL(qty * b.cost) }, { label: 'Shortfalls', value: String(short.length), tone: short.length ? 'red' : 'green' }, { label: 'To buy', value: inrL(buy), tone: short.length ? 'amber' : 'green' }],
    charts: [{ type: 'bar', title: 'Need vs on hand', bars: req.slice(0, 7).map((r) => ({ label: r.name.split(' ').slice(0, 3).join(' '), value: r.stock ? Math.min(100, Math.round((r.stock / r.need) * 100)) : 0, display: `${r.stock}/${r.need} ${r.unit}`, tone: r.short ? 'red' as const : 'green' as const })) }],
    tables: [{ title: 'MRP – material requirement', cols: [C('name', 'Material'), C('need', 'Need', 'num'), C('stock', 'On hand', 'num'), C('short', 'Short', 'num'), C('val', 'Buy value', 'money')], rows: req.sort((a, b2) => b2.short - a.short).map((r) => ({ name: `${r.name} (${r.unit})`, need: r.need, stock: r.stock, short: r.short, val: r.short * r.cost, _tone: r.short ? 'red' : '' })) }],
    actions: [{ label: 'Open work orders', kind: 'open:/production?tab=Work%20orders', primary: true }, ...(short.length ? [{ label: 'Source shortfalls', kind: 'open:/sourcing/live' }] : []), { label: 'Show BOM', kind: 'ask:Show BOM for ' + b.name.split(' ')[0] }],
  });
}
export const bomView = (code: string): View => { const s = getP1(); const b = s.boms.find((x) => x.code === code) || s.boms[0];
  return v('production', `BOM – ${b.name}`, `${b.name} uses ${flatBom(b).length - 1} parts across ${Math.max(...flatBom(b).map((x) => x.lvl))} levels; standard cost ${inr(b.cost)} per unit.`, {
    tables: [{ cols: [C('lvl', 'Level'), C('code', 'Code'), C('name', 'Part'), C('qty', 'Qty / unit', 'num'), C('mb', 'Make / buy', 'badge'), C('stock', 'On hand', 'num')], rows: flatBom(b).map((x) => ({ lvl: '·'.repeat(x.lvl) + ' L' + x.lvl, code: x.n.code, name: x.n.name, qty: x.need, mb: x.n.make ? 'Make' : 'Buy', stock: x.n.stock })) }],
    actions: [{ label: 'Open BOM', kind: 'open:/production', primary: true }, { label: `Plan 100 ${b.name.split(' ')[0]}`, kind: `ask:Plan 100 ${b.name.split(' ')[0]} next week` }] }); };
export function productionView(): View { const s = getP1(); const open = s.wos.filter((w) => w.stage !== 'Done'); const over = s.wos.filter((w) => w.actualCost > w.planCost * (w.progress / 100 || 1) && w.actualCost > 0);
  return v('production', 'Production board', `${open.length} work orders open; ${over.length} running over plan cost.`, {
    kpis: ['Planned', 'Released', 'In progress', 'QC'].map((st) => ({ label: st, value: String(s.wos.filter((w) => w.stage === st).length) })),
    charts: [{ type: 'bar', title: 'Progress by work order', bars: open.map((w) => ({ label: w.id, value: w.progress, display: `${w.progress}%`, tone: w.progress >= 80 ? 'green' as const : w.progress ? 'blue' as const : 'amber' as const })) }],
    tables: [{ cols: [C('id', 'WO'), C('p', 'Product'), C('q', 'Qty', 'num'), C('st', 'Stage', 'badge'), C('due', 'Due'), C('pc', 'Plan cost', 'money'), C('ac', 'Actual', 'money')], rows: s.wos.map((w) => ({ id: w.id, p: w.product, q: w.qty, st: w.stage, due: w.due, pc: w.planCost, ac: w.actualCost, _to: '/production?tab=Work%20orders' })) }],
    actions: [{ label: 'Open production', kind: 'open:/production', primary: true }, { label: 'Plan 500 A-17 housings', kind: 'ask:Plan 500 A-17 housings next week' }] }); }

export function rejectView(lot: string, qty: number, defect: string): View {
  const s = getP1(); const insp = s.insp.find((i) => i.lot === lot); const prev = s.ncrs.find((n) => n.lot === lot); const item = insp?.item || prev?.item || 'Unlisted item'; const src = insp?.supplier || prev?.source || 'In-house';
  const existing = s.ncrs.find((n) => n.lot === lot && n.defect.toLowerCase() === defect.toLowerCase() && n.status !== 'Closed');
  const id = existing?.id || `NCR-0${72 + s.ncrs.filter((n) => +n.id.slice(4) >= 72).length}`;
  updateP1((d) => {
    if (existing) { const n = d.ncrs.find((x) => x.id === existing.id)!; n.qty += qty; } else d.ncrs.unshift({ id, lot, item, defect, qty, source: src, owner: 'Venkat (QA)', capa: 'Root-cause pending', status: 'Open', raised: TODAY });
    const i = d.insp.find((x) => x.lot === lot); if (i) { i.rejected += qty; i.passed = Math.max(0, i.passed - qty); i.status = 'On hold'; if (i.defect === '—') i.defect = defect; }
    d.rejTrend[d.rejTrend.length - 1].rejects += qty;
    d.notes.unshift({ id: 'N-' + Date.now(), at: 'Just now', title: `${qty} rejects logged on ${lot}`, text: `${defect} · ${id}`, module: 'Quality', to: '/quality', roles: ['Owner', 'Stores', 'Supervisor'], tone: 'red', read: false });
  });
  const n = getP1().ncrs.find((x) => x.id === id)!; const i2 = getP1().insp.find((x) => x.lot === lot);
  const rr = i2 ? +((i2.rejected / i2.sample) * 100).toFixed(1) : 0;
  return v('quality', `Rejects logged – lot ${lot}`, `Logged ${qty} rejects for ${defect.toLowerCase()} on lot ${lot} (${item}). ${existing ? `Added to open ${id}` : `Raised ${id}`}; lot is on QC hold${src !== 'In-house' ? ` and ${src}'s score drops` : ''}.`, {
    kpis: [{ label: 'NCR', value: id, sub: n.status, tone: 'red' }, { label: 'Rejected on lot', value: String(n.qty), sub: defect }, { label: 'Lot rejection', value: `${rr}%`, tone: rr > 5 ? 'red' : 'amber' }, { label: 'Source', value: src }],
    charts: [{ type: 'line', title: 'Rejections per month', bars: getP1().rejTrend.map((x) => ({ label: x.m, value: x.rejects, display: String(x.rejects) })) }],
    items: [{ label: 'Lot ' + lot + ' moved to QC hold', sub: 'Stores cannot issue it to production', tone: 'amber', to: '/quality' }, { label: 'CAPA owner: Venkat (QA)', sub: 'Due in 7 days', tone: 'blue', to: '/quality?tab=NCR%20%26%20CAPA' }],
    actions: [{ label: 'Open NCR & CAPA', kind: 'open:/quality?tab=NCR%20%26%20CAPA', primary: true }, { label: 'Supplier quality scores', kind: 'ask:Show supplier quality scores' }, { label: `Find test certificate for ${lot}`, kind: `ask:Find test certificate for lot ${lot}` }],
  });
}
export function qualityView(): View { const s = getP1(); const sc = supplierScore(s); const open = s.ncrs.filter((n) => n.status !== 'Closed');
  return v('quality', 'Quality overview', `${open.length} NCRs open; weakest supplier is ${sc[0]?.sup} at ${sc[0]?.score}/100.`, {
    kpis: [{ label: 'Inspections (Oct)', value: String(s.insp.length) }, { label: 'On hold', value: String(s.insp.filter((i) => i.status === 'On hold').length), tone: 'amber' }, { label: 'Open NCRs', value: String(open.length), tone: open.length ? 'red' : 'green' }, { label: 'Oct PPM', value: String(s.rejTrend[s.rejTrend.length - 1].ppm) }],
    charts: [{ type: 'bar', title: 'Supplier quality score', bars: sc.map((x) => ({ label: x.sup, value: x.score, display: `${x.score}`, tone: x.score < 70 ? 'red' as const : x.score < 90 ? 'amber' as const : 'green' as const })) }],
    tables: [{ title: 'Open NCRs', cols: [C('id', 'NCR'), C('lot', 'Lot'), C('d', 'Defect'), C('q', 'Qty', 'num'), C('st', 'Status', 'badge'), C('capa', 'CAPA')], rows: open.map((n) => ({ id: n.id, lot: n.lot, d: n.defect, q: n.qty, st: n.status, capa: n.capa })) }],
    actions: [{ label: 'Open Quality', kind: 'open:/quality', primary: true }, { label: 'Log rejects', kind: 'ask:Log rejects on lot L-88' }] }); }

export function reconView(bank = 'HDFC', month = 'October'): View {
  updateP1((d) => { d.bank.forEach((b) => { if (b.status === 'Suggested' && (b.confidence || 0) >= 85) b.status = 'Matched'; }); d.bankRecon.done = true; });
  const s = getP1(); const un = s.bank.filter((b) => b.status === 'Unmatched'); const sug = s.bank.filter((b) => b.status === 'Suggested'); const m = s.bank.filter((b) => b.status === 'Matched');
  return v('bank', `${bank} reconciliation – ${month}`, `Matched ${m.length} of ${s.bank.length} ${bank} lines for ${month}. ${sug.length} need your OK and ${un.length} (${inr(sum(un, (x) => x.amount))}) have no match in books.`, {
    kpis: [{ label: 'Matched', value: String(m.length), tone: 'green' }, { label: 'Needs OK', value: String(sug.length), tone: 'amber' }, { label: 'Unmatched', value: String(un.length), tone: 'red' }, { label: 'Difference', value: inr(sum(un, (x) => (x.type === 'Cr' ? x.amount : -x.amount))) }],
    charts: [{ type: 'donut', title: 'Statement lines', bars: [{ label: 'Matched', value: m.length, display: String(m.length), tone: 'green' }, { label: 'Suggested', value: sug.length, display: String(sug.length), tone: 'amber' }, { label: 'Unmatched', value: un.length, display: String(un.length), tone: 'red' }] }],
    tables: [{ title: 'Needs attention', cols: [C('date', 'Date'), C('n', 'Narration'), C('amt', 'Amount', 'money'), C('t', 'Dr/Cr'), C('m', 'Suggested match'), C('st', 'Status', 'badge')], rows: [...sug, ...un].map((b) => ({ date: b.date, n: b.narration, amt: b.amount, t: b.type, m: b.match ? `${b.match} (${b.confidence}%)` : 'Create entry', st: b.status, _tone: b.status === 'Unmatched' ? 'red' : '' })) }],
    actions: [{ label: 'Open Bank & TDS', kind: 'open:/bank-tds', primary: true }, { label: 'TDS due by 7th?', kind: 'ask:TDS due by 7th?' }] });
}
export function tdsView(): View { const s = getP1(); const due = s.tds.filter((t) => !t.deposited);
  const by = ['194C', '194J', '194I', '194Q'].map((sec) => ({ sec, amt: sum(due.filter((t) => t.section === sec), (t) => t.tds) })).filter((x) => x.amt);
  return v('tds', 'TDS due by 7 November', `${inr(sum(due, (t) => t.tds))} TDS from ${due.length} October deductions is due by 7 November (challan ITNS 281). Largest: ${by.sort((a, b) => b.amt - a.amt)[0].sec}.`, {
    kpis: [{ label: 'Due 7 Nov', value: inr(sum(due, (t) => t.tds)), tone: 'amber' }, { label: 'Deductions', value: String(due.length) }, { label: 'Deposited (Sep)', value: inr(sum(s.tds.filter((t) => t.deposited), (t) => t.tds)), tone: 'green' }, { label: '26Q Q3 due', value: '31 Jan' }],
    charts: [{ type: 'bar', title: 'By section', bars: by.map((x) => ({ label: x.sec, value: x.amt, display: inr(x.amt), tone: 'blue' as const })) }],
    tables: [{ cols: [C('sec', 'Section'), C('p', 'Deductee'), C('pan', 'PAN'), C('a', 'Paid', 'money'), C('r', 'Rate', 'pct'), C('t', 'TDS', 'money')], rows: due.map((t) => ({ sec: t.section, p: t.party, pan: t.pan, a: t.amount, r: t.rate, t: t.tds })) }],
    actions: [{ label: 'Open TDS register', kind: 'open:/bank-tds?tab=TDS', primary: true }, { label: 'Reconcile HDFC for October', kind: 'ask:Reconcile HDFC for October' }] }); }

export function expenseAdd(amount: number, desc: string, emp = 'Ranjith (Owner)'): View {
  const cat = /auto|cab|uber|ola|bus|train|flight|travel|fuel|petrol/i.test(desc) ? 'Travel' : /lunch|dinner|meal|food|tea/i.test(desc) ? 'Meals' : /courier|dtdc|post/i.test(desc) ? 'Courier' : 'Other';
  const s = getP1(); const id = `EX-${306 + s.exp.filter((e) => +e.id.slice(3) >= 306).length}`;
  updateP1((d) => { d.exp.unshift({ id, emp, category: cat, desc: desc.replace(/^\w/, (c) => c.toUpperCase()), amount, date: TODAY, receipt: 'receipt-' + id.toLowerCase() + '.jpg', ocr: `Read from receipt · ${inr(amount)} · 29 Oct`, status: 'Submitted', approver: 'Ranjith (Owner)' }); });
  return v('expenses', `Claim ${id} submitted`, `Submitted ${id}: ${inr(amount)} for ${desc} (${cat}). It goes to the owner for approval and is paid with the next payroll.`, {
    kpis: [{ label: 'Claim', value: id, tone: 'blue' }, { label: 'Amount', value: inr(amount) }, { label: 'Category', value: cat }, { label: 'Payout', value: 'Nov payroll' }],
    items: [{ label: 'Receipt read (mock OCR)', sub: `${inr(amount)} · 29 Oct`, tone: 'green' }, { label: 'Waiting for approval', sub: 'Ranjith (Owner)', tone: 'amber', to: '/expenses' }],
    actions: [{ label: 'Open Expenses', kind: 'open:/expenses', primary: true }, { label: 'Show pending claims', kind: 'ask:Show pending expense claims' }] });
}
export function expensesView(): View { const s = getP1(); const p = s.exp.filter((e) => e.status === 'Submitted');
  const cats = [...new Set(s.exp.map((e) => e.category))].map((c) => ({ c, a: sum(s.exp.filter((e) => e.category === c), (e) => e.amount) }));
  return v('expenses', 'Expense claims', `${p.length} claims (${inr(sum(p, (e) => e.amount))}) waiting for approval; ${inr(sum(s.exp, (e) => e.amount))} claimed in October.`, {
    kpis: [{ label: 'Pending', value: String(p.length), sub: inr(sum(p, (e) => e.amount)), tone: 'amber' }, { label: 'Approved', value: String(s.exp.filter((e) => e.status === 'Approved').length), tone: 'green' }, { label: 'Paid via payroll', value: String(s.exp.filter((e) => e.status === 'Paid via payroll').length) }, { label: 'October total', value: inr(sum(s.exp, (e) => e.amount)) }],
    charts: [{ type: 'donut', title: 'By category', bars: cats.map((x) => ({ label: x.c, value: x.a, display: inr(x.a) })) }],
    tables: [{ cols: [C('id', 'Claim'), C('e', 'Employee'), C('d', 'What'), C('a', 'Amount', 'money'), C('st', 'Status', 'badge')], rows: s.exp.map((e) => ({ id: e.id, e: e.emp, d: e.desc, a: e.amount, st: e.status })) }],
    actions: [{ label: 'Open Expenses', kind: 'open:/expenses', primary: true }, { label: 'Approve all pending', kind: 'ask:Approve all pending expense claims' }] }); }
export function expenseApproveAll(): View { const n = getP1().exp.filter((e) => e.status === 'Submitted'); updateP1((d) => d.exp.forEach((e) => { if (e.status === 'Submitted') e.status = 'Approved'; }));
  const r = expensesView(); return { ...r, title: 'Claims approved', headline: `Approved ${n.length} claims worth ${inr(sum(n, (e) => e.amount))}; they’ll be paid with the November payroll.` }; }

export function shipsTodayView(): View { const s = getP1(); const today = s.disp.filter((d) => d.date === TODAY); const transit = s.disp.filter((d) => d.status === 'In transit');
  return v('dispatch', 'What ships today', `${today.length} dispatches today – ${today.filter((d) => d.status === 'Loaded').length} loaded, ${today.filter((d) => d.status === 'Packed').length} packed, ${today.filter((d) => d.vehicle === 'To be assigned').length} still need a vehicle. ${transit.length} in transit.`, {
    kpis: [{ label: 'Shipping today', value: String(today.length), tone: 'blue' }, { label: 'Weight', value: `${(sum(today, (d) => d.weightKg) / 1000).toFixed(2)} t` }, { label: 'Freight', value: inr(sum(today, (d) => d.freight)) }, { label: 'POD pending', value: String(s.disp.filter((d) => d.status === 'Delivered').length), tone: 'amber' }],
    tables: [{ cols: [C('id', 'Dispatch'), C('c', 'Customer'), C('it', 'Items'), C('q', 'Qty'), C('veh', 'Vehicle'), C('lr', 'LR'), C('st', 'Status', 'badge'), C('eta', 'ETA')], rows: today.map((d) => ({ id: d.id, c: `${d.customer}, ${d.city}`, it: d.items, q: d.qty, veh: d.vehicle, lr: d.lr, st: d.status, eta: d.eta, _tone: d.vehicle === 'To be assigned' ? 'amber' : '' })) }],
    actions: [{ label: 'Open Dispatch', kind: 'open:/dispatch', primary: true }, { label: 'Packing list DSP-782', kind: 'open:/dispatch?tab=Packing%20list' }] }); }

export function briefView(): View { const s = getP1(); const un = s.notes.filter((n) => !n.read);
  return v('notifications', 'Your daily brief', `Good morning. ${un.length} new alerts; next statutory date is ${s.dues[0].title} on 7 Nov.`, {
    kpis: [{ label: 'New alerts', value: String(un.length), tone: 'blue' }, { label: 'Critical', value: String(un.filter((n) => n.tone === 'red').length), tone: 'red' }, { label: 'Next due', value: '7 Nov', sub: s.dues[0].title }, { label: 'Ships today', value: String(s.disp.filter((d) => d.date === TODAY).length) }],
    items: un.map((n) => ({ label: n.title, sub: `${n.module} · ${n.text}`, tone: n.tone, to: n.to })),
    tables: [{ title: 'Compliance calendar', cols: [C('d', 'Due'), C('t', 'What'), C('k', 'Type', 'badge'), C('a', 'Amount')], rows: s.dues.map((d) => ({ d: d.date, t: d.title, k: d.kind, a: d.amount || '—' })) }],
    actions: [{ label: 'Open notifications', kind: 'open:/notifications', primary: true }, { label: 'What ships today?', kind: 'ask:What ships today?' }] }); }

export function findDocView(q: string): View { const s = getP1(); const lot = lotOf(q); const wantCert = /certificate|mtc|tc\b/i.test(q);
  const words = q.toLowerCase().replace(/\b(find|show|get|the|for|of|lot|me|document|documents|docs?|please)\b/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  const hits = s.docs.map((d) => { let sc = 0; if (lot && d.lot === lot) sc += 3; if (wantCert && /certificate/i.test(d.type)) sc += 2; const hay = (d.name + ' ' + d.type + ' ' + d.linked + ' ' + d.tags.join(' ')).toLowerCase(); words.forEach((w) => { if (hay.includes(w)) sc += 1; }); return { d, sc }; }).filter((x) => x.sc >= 2).sort((a, b) => b.sc - a.sc);
  if (!hits.length) return v('documents', 'No matching document', `I couldn't find a document for “${q}”. Upload it in Documents and link it to the record.`, { actions: [{ label: 'Open Documents', kind: 'open:/documents', primary: true }] });
  const top = hits[0].d;
  return v('documents', top.name, `Found ${top.type.toLowerCase()} “${top.name}” linked to ${top.linked}${hits.length > 1 ? `, plus ${hits.length - 1} related file${hits.length > 2 ? 's' : ''}` : ''}.`, {
    kpis: [{ label: 'Type', value: top.type, tone: 'blue' }, { label: 'Linked to', value: top.linked.split(' · ')[0] }, { label: 'Uploaded', value: top.date, sub: top.by }, { label: 'Size', value: top.size }],
    tables: [{ cols: [C('n', 'File'), C('t', 'Type', 'badge'), C('l', 'Linked to'), C('d', 'Date')], rows: hits.map((h) => ({ n: h.d.name, t: h.d.type, l: h.d.linked, d: h.d.date, _to: '/documents' })) }],
    actions: [{ label: 'Open in Documents', kind: 'open:/documents?q=' + encodeURIComponent(lot || top.name), primary: true }] }); }

const ask = (domain: string, title: string, headline: string, chips: string[]): View => v(domain, title, headline, { callout: 'Reply in your own words – I’ll finish this one.', actions: chips.map((c, i) => ({ label: c, kind: 'ask:' + c, primary: i === 0 })) });

/* ---------- routing ---------- */
function runPlan(a: Pending['args']): View {
  if (!a.qty || !a.code) { pending = { tool: 'plan', args: a }; return ask('production', 'Plan production', !a.code ? 'Which product should I plan – A-17 housings or B-04 brackets?' + (a.qty ? '' : ' And how many?') : `How many ${a.code === 'FG-A17' ? 'A-17 housings' : 'B-04 brackets'} should I plan for next week?`, a.code ? ['500', '250', '100'] : ['A-17 housings', 'B-04 brackets']); }
  pending = null; return planView(String(a.code), Number(a.qty), '2026-11-02');
}
function runReject(a: Pending['args']): View {
  const miss = [!a.qty && 'how many', !a.lot && 'which lot', !a.defect && 'what defect'].filter(Boolean) as string[];
  if (miss.length) { pending = { tool: 'reject', args: a }; return ask('quality', 'Log rejects', `Got it – ${miss.join(', ').replace(/, ([^,]*)$/, ' and $1')}?${a.lot ? ` (lot ${a.lot})` : ''}`, a.defect ? ['12', '5'] : ['Porosity', 'Blow holes', 'Bore oversize']); }
  pending = null; return rejectView(String(a.lot), Number(a.qty), String(a.defect));
}
function runExpense(a: Pending['args']): View {
  if (!a.amount || !a.desc) { pending = { tool: 'expense', args: a }; return ask('expenses', 'New expense claim', !a.amount ? 'How much was it, and what for? Attach the receipt in Expenses and I’ll read it.' : 'What was it for?', ['₹850 auto to Medak', '₹1,200 customer lunch']); }
  pending = null; return expenseAdd(Number(a.amount), String(a.desc));
}

const FRESH = /^(show|list|what|who|how|why|when|which|where|hi|hey|hello|find|get|give|open|reconcile|tds|plan|log|claim|approve|daily|brief)\b/i;
export function p1Answer(t: string): View | null {
  const x = t.trim();
  if (/^(cancel|stop|never ?mind|forget it)\b/i.test(x) && pending) { pending = null; return v('notice', 'Cancelled', 'Okay, cancelled – nothing was saved.', {}); }
  // a reply to the question on the last card finishes that command
  if (pending && !FRESH.test(x)) {
    const a = { ...pending.args };
    if (pending.tool === 'plan') { a.qty = a.qty || numOf(x); a.code = a.code || productOf(x); return runPlan(a); }
    if (pending.tool === 'reject') { a.lot = a.lot || lotOf(x); const n = numOf(x.replace(/\bL-?\d+/i, '')); a.qty = a.qty || n; a.defect = a.defect || defectOf(x) || (x.replace(/[\d,.₹]+/g, '').replace(/\b(lot|rejects?|nos|pcs|for)\b/gi, '').trim() || undefined); return runReject(a); }
    if (pending.tool === 'expense') { a.amount = a.amount || numOf(x); a.desc = a.desc || x.replace(/₹|rs\.?|inr/gi, '').replace(/[\d,]+(\.\d+)?/, '').replace(/^\s*(for|on)\s+/i, '').trim() || undefined; return runExpense(a); }
  }
  if (/\b(plan|schedule|make|produce)\b.*\b(housings?|brackets?|a-?17|b-?0?4)\b/i.test(x)) { pending = null; return runPlan({ qty: numOf(x.replace(/\ba-?17\b|\bb-?0?4\b/gi, '')), code: productOf(x) }); }
  if (/\b(plan|schedule)\b.*\b(production|next week)\b/i.test(x)) return runPlan({ qty: numOf(x), code: productOf(x) });
  if (/\b(bom|bill of materials?)\b/i.test(x)) return bomView(productOf(x) || 'FG-A17');
  if (/\b(log|record|enter|book)\b.*\b(rejects?|rejections?|defects?|ncr)\b/i.test(x) || /\b\d+\s+rejects?\b/i.test(x)) { pending = null; return runReject({ qty: numOf(x.replace(/\bL-?\d+/i, '')), lot: lotOf(x), defect: defectOf(x.replace(/\blot\s*L-?\d+/i, '')) }); }
  if (/\b(supplier (quality )?scores?|quality scores?|ncrs?|capa|rejection trend|qc status|quality (overview|status))\b/i.test(x)) return qualityView();
  if (/\breconcil/i.test(x)) return reconView(/\bicici\b/i.test(x) ? 'ICICI' : 'HDFC', 'October');
  if (/\btds\b|\b26q\b|\b194[cjiq]\b/i.test(x)) return tdsView();
  if (/\bapprove\b.*\b(expenses?|claims?)\b/i.test(x)) return expenseApproveAll();
  if (/\b(claim|reimburse|expense)\b/i.test(x) && (/\d|\b(add|new|submit|file)\b/i.test(x) || /^(claim|reimburse|submit|file|add)\b/i.test(x)) && !/\b(show|list|pending)\b/i.test(x)) { pending = null; const amt = numOf(x); const desc = x.replace(/₹|rs\.?|inr/gi, '').replace(/\b(add|new|submit|file|an?|my|claim|expense|reimbursement|reimburse|for|of|me)\b/gi, ' ').replace(/[\d,]+(\.\d+)?/, ' ').replace(/\s+/g, ' ').trim(); return runExpense({ amount: amt, desc: desc || undefined }); }
  if (/\b(expenses?|claims?|reimbursements?)\b/i.test(x)) return expensesView();
  if (/\b(ships?|shipping|dispatch(es|ed)?|going out|trucks?)\b.*\b(today|now)\b|\bwhat ships\b|\bdispatch (plan|status)\b|\b(pod|lr)s?\b/i.test(x)) return shipsTodayView();
  if (/\b(daily brief|morning brief|my brief|notifications?|alerts?|compliance calendar|what'?s due|due dates?)\b/i.test(x)) return briefView();
  if (/\b(find|search|where is|show)\b.*\b(certificate|mtc|drawing|document|docs?|report|contract|pod|file)\b/i.test(x)) return findDocView(x);
  return null;
}
export type { P1State };
