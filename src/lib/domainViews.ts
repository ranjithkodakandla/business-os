// Structured answers for every data domain in the app. Each handler reads live session data and returns a `view`
// (KPI tiles, charts, sortable tables, status items, a headline and actions) – never bullet text.
// Generic path: `snapshot()` gives the AI a compact copy of the relevant data; `validateView()` rejects any number not in it.
import type { DemoState } from './store';
import * as D from './data';
import { available, isLow, orderValue, outstanding, overdueDays, kpis, cash, approvals, customerById, supplierById } from './domain';
import type { Act, Col, Row, Kpi, Bar, Via } from './dataAgent';
import { nameScore } from './dataAgent';

export type Chart = { type: 'bar' | 'line' | 'donut'; title: string; bars: Bar[] };
export type Item = { label: string; sub?: string; tone?: 'red' | 'amber' | 'green' | 'blue'; to?: string; value?: string };
export type View = { kind: 'view'; via: Via; domain: string; title: string; headline: string; kpis?: Kpi[]; charts?: Chart[]; tables?: { title?: string; cols: Col[]; rows: Row[] }[]; items?: Item[]; callout?: string; actions: Act[]; note?: string };

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const inrL = (n: number) => (Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, '')} lakh` : inr(n));
const pl = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const C = (key: string, label: string, type?: Col['type'], align?: 'l' | 'r'): Col => ({ key, label, type, align: align || (type && type !== 'text' && type !== 'badge' ? 'r' : 'l') });
const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const v = (domain: string, title: string, headline: string, rest: Partial<View>): View => ({ kind: 'view', via: 'rules', domain, title, headline, actions: [], ...rest });

/* ---------- which domain is the owner asking about? ---------- */
const DOMAINS: [string, RegExp][] = [
  ['business', /\b(how'?s|how is|hows) (the )?business|business (this|today|overview|summary|status)|what should i (worry|focus)|worry about|overview|dashboard|summary of (my|the) business|kaisa chal raha|ela undi|how are we doing|anything urgent|today'?s (summary|priorities)\b/i],
  ['compare', /\b(this month vs|vs last month|compare (this|last) month|month on month|mom\b|last month vs|month.{0,10}compar)/i],
  ['low_stock', /\b(low (on )?stock|running low|below reorder|reorder|stock ?outs?|short(age)? (of )?stock|kam (stock|maal)|takkuva)\b/i],
  ['payables', /\b(payables?|bills? (due|to pay)|(i|we) owe|pay suppliers|vendor payments?|supplier payments?)\b/i],
  ['receivables', /\b(owes?|owe me|receivables?|outstanding|overdue|ageing|aging|collections?|baki|bakaya|paisa (dena|baaki)|kaun dena|dena hai|ivvali|dues?\b(?! date)|unpaid invoices?|invoices?)\b/i],
  ['cash', /\b(cash|bank balance|runway|liquidity|money (stuck|position)|funds?|cc limit|paisa kitna)\b/i],
  ['purchases', /\b(pos?|purchase orders?|prs?|purchase requests?|procurement|purchases?)\b/i],
  ['dispatch', /\b(dispatch(es)?|deliver(y|ies)|shipments?|trucks? (today|loading)|loads?)\b/i],
  ['orders', /\b(orders?|so-\d+|sales orders?|at risk|order book)\b/i],
  ['customers', /\b(customers?|clients?|parties|buyers?)\b/i],
  ['pipeline', /\b(sales|pipeline|opportunit(y|ies)|deals?|leads?|crm|quotes? sent|forecast|revenue)\b/i],
  ['production', /\b(production|work orders?|wo-\d+|machines?|shop ?floor|capacity|utili[sz]ation|idle|behind schedule|factory)\b/i],
  ['jobwork', /\b(job ?work(ers?)?|challans?|plating|outsourced)\b/i],
  ['quality', /\b(quality|rejections?|defects?|qc|ncr|returns? from)\b/i],
  ['people', /\b(people|staff|employees?|workers?|attendance|leave|absent|present|late|hr|team|payroll|manpower|log(u|o)lu|staff kitne)\b/i],
  ['approvals', /\b(approvals?|pending (for|with) me|waiting (for|on) me|to approve|sign.?off)\b/i],
  ['compliance', /\b(gst(r)?|compliance|tds|pf|esi|filings?|returns due|due dates?)\b(?!.*\d+\s*%)/i],
  ['sourcing', /\b(sourcing|sourcing runs?|supplier replies|enquir(y|ies)|rfq)\b/i],
  ['reports', /\b(reports?|kpis?|metrics|trend|margin|dso|monthly|this month|last month|performance)\b/i],
  ['inventory', /\b(inventory|stock|stocks|items?|skus?|materials?|godown|store(s|room)?|warehouse|maal|saamaan|saman|sarukulu)\b/i],
];
export function domainOf(t: string, s: DemoState): { domain: string; name?: string } | null {
  const low = t.toLowerCase();
  // a named record beats a domain word: "everything about Aarav Interiors", "stock of MS sheet"
  if (/\d+(\.\d+)?\s*%\s*(gst|of|on)\b|\bcalculat|\d+\s*[x×*+/]\s*\d+/i.test(t)) return null; // arithmetic, not a data question
  const GENERIC = /^(interiors?|projects?|steels?|industries|pvt|ltd|private|limited|enterprises|traders|builders|constructions?|developers|infra|and|the)$/i;
  const cust = s.customers.map((c) => { const w = c.name.split(/\s+/).filter((x) => x.length > 2); const hit = w.filter((x) => low.includes(x.toLowerCase())); return { c, sc: hit.length / Math.max(1, w.length), ok: hit.some((x) => !GENERIC.test(x)) }; }).filter((x) => x.ok && x.sc >= 0.5).sort((a, b) => b.sc - a.sc)[0];
  if (cust && /\b(about|everything|details?|show|status|history|profile|account|how is|what'?s up with|tell me)\b/i.test(t) && !/\b(update|change|set|mark)\b/i.test(t)) return { domain: 'customer', name: cust.c.id };
  const sku = /\b(stock of|how (many|much)|kitna|kitne|enni|entha|on hand|available|balance of|status of|details? of|show)\b/i.test(t) ? bestSku(t, s) : null;
  if (sku) return { domain: 'item', name: sku };
  for (const [d, re] of DOMAINS) if (re.test(t)) return { domain: d };
  return null;
}
const bestSku = (t: string, s: DemoState) => {
  const q = t.replace(/\b(stock|of|how|many|much|do|we|have|i|kitna|kitne|hai|undi|enni|entha|on hand|available|show|me|the|status|details?|balance|left|in|our|my)\b/gi, ' ');
  if (q.trim().length < 2) return null;
  const sc = s.skus.map((k) => ({ k, sc: Math.max(nameScore(q, k.name), nameScore(q, k.sku.replace('-', ' '))) })).sort((a, b) => b.sc - a.sc)[0];
  return sc && sc.sc >= 0.6 ? sc.k.sku : null;
};

/* ---------- per-domain handlers ---------- */
const stockStatus = (k: D.Sku) => (available(k) <= 0 ? 'Out' : isLow(k) ? 'Below reorder' : k.agingDays > 120 ? 'Slow moving' : 'OK');
const H: Record<string, (s: DemoState, name?: string) => View> = {
  inventory: (s) => {
    const val = sum(s.skus, (k) => k.onHand * k.unitCost); const low = s.skus.filter(isLow);
    const cats = [...new Set(s.skus.map((k) => k.category))].map((c) => ({ c, v: sum(s.skus.filter((k) => k.category === c), (k) => k.onHand * k.unitCost) })).sort((a, b) => b.v - a.v);
    const top = [...s.skus].sort((a, b) => b.onHand * b.unitCost - a.onHand * a.unitCost)[0];
    return v('inventory', 'Inventory', `${inrL(val)} of stock across ${s.skus.length} items – ${low.length ? `${pl(low.length, 'item')} below reorder (${low.map((k) => k.name.split(' ·')[0]).slice(0, 2).join(', ')})` : 'nothing below reorder'}.`, {
      kpis: [{ label: 'Stock value', value: inrL(val) }, { label: 'Items', value: String(s.skus.length) }, { label: 'Below reorder', value: String(low.length), tone: low.length ? 'red' : 'green' }, { label: 'Highest value', value: top.name.split(' ·')[0].split(' (')[0], sub: inrL(top.onHand * top.unitCost) }],
      charts: [{ type: 'donut', title: 'Stock value by category', bars: cats.map((x, i) => ({ label: x.c, value: x.v, display: inrL(x.v), tone: (['blue', 'green', 'amber', 'red'] as const)[i % 4] })) }],
      tables: [{ cols: [C('n', 'Item'), C('cat', 'Category'), C('oh', 'On hand', 'num'), C('av', 'Available', 'num'), C('ro', 'Reorder at', 'num'), C('val', 'Value', 'money'), C('st', 'Status', 'badge')],
        rows: [...s.skus].sort((a, b) => Number(isLow(b)) - Number(isLow(a)) || b.onHand * b.unitCost - a.onHand * a.unitCost).map((k) => ({ n: k.name.split(' ·')[0], _sub: `${k.sku} · ${k.unit}`, cat: k.category, oh: k.onHand, av: available(k), ro: k.reorder, val: k.onHand * k.unitCost, st: stockStatus(k), _to: `/inventory/${k.sku}`, _tone: isLow(k) ? 'red' : '' })) }],
      actions: [{ label: 'Open Inventory', kind: 'open:/inventory', primary: true }, { label: "What's low on stock?", kind: "ask:What's low on stock?" }, { label: 'Stock of MS sheet', kind: 'ask:Stock of MS sheet 2mm' }],
    });
  },
  low_stock: (s) => {
    const low = s.skus.filter(isLow).map((k) => ({ k, short: k.reorder - available(k) })).sort((a, b) => b.short * b.k.unitCost - a.short * a.k.unitCost);
    const cost = sum(low, (x) => x.short * x.k.unitCost);
    return v('low_stock', 'Low stock', low.length ? `${pl(low.length, 'item')} below reorder level – about ${inrL(cost)} to top them up. ${low[0].k.name.split(' ·')[0]} is the most urgent.` : 'Nothing is below its reorder level.', {
      kpis: [{ label: 'Below reorder', value: String(low.length), tone: low.length ? 'red' : 'green' }, { label: 'To top up', value: inrL(cost) }, { label: 'Incoming', value: String(s.skus.filter((k) => k.incoming).length), sub: 'items with open POs' }],
      charts: low.length ? [{ type: 'bar', title: 'Short of reorder level (units)', bars: low.map((x) => ({ label: x.k.name.split(' ·')[0], value: x.short, display: `${x.short} ${x.k.unit}`, tone: 'red' })) }] : [],
      tables: [{ cols: [C('n', 'Item'), C('av', 'Available', 'num'), C('ro', 'Reorder at', 'num'), C('sh', 'Short', 'num'), C('c', 'Top-up cost', 'money'), C('in', 'Incoming')], rows: low.map((x) => ({ n: x.k.name.split(' ·')[0], _sub: x.k.sku, av: available(x.k), ro: x.k.reorder, sh: x.short, c: x.short * x.k.unitCost, in: x.k.incoming ? `${x.k.incoming} · ${x.k.incomingRef}` : '—', _to: `/inventory/${x.k.sku}`, _tone: 'red' })) }],
      actions: [{ label: 'Open Inventory', kind: 'open:/inventory', primary: true }, { label: 'Open Procurement', kind: 'open:/procurement' }],
    });
  },
  item: (s, id) => {
    const k = s.skus.find((x) => x.sku === id)!; const mine = (s.purchases || []).filter((p) => p.sku === k.sku);
    return v('item', `${k.sku} · ${k.category}`, `${k.name}: ${k.onHand} ${k.unit} on hand, ${available(k)} free after reservations${isLow(k) ? ` – below the reorder level of ${k.reorder}` : ''}.`, {
      kpis: [{ label: 'On hand', value: `${k.onHand} ${k.unit}` }, { label: 'Reserved', value: String(k.reserved) }, { label: 'Available', value: String(available(k)), tone: isLow(k) ? 'red' : 'green' }, { label: 'Value', value: inrL(k.onHand * k.unitCost), sub: `${inr(k.unitCost)}/${k.unit.replace(/s$/, '')}` }],
      tables: [{ title: 'Batches & receipts', cols: [C('b', 'Batch / GRN'), C('sup', 'Supplier'), C('q', 'Qty', 'num'), C('d', 'Received')], rows: [...mine.map((p) => ({ b: p.id, sup: p.supplier, q: p.addQty, d: p.date })), ...k.batches.map((b) => ({ b: b.batch, sup: b.supplier, q: b.qty, d: b.received }))] }],
      items: [{ label: 'Location', value: k.location }, { label: 'Last movement', value: k.lastMovement }, { label: 'Reorder level', value: `${k.reorder} ${k.unit}` }, ...(k.incoming ? [{ label: 'Incoming', value: `${k.incoming} on ${k.incomingRef}`, tone: 'blue' as const }] : [])],
      actions: [{ label: `Open ${k.sku}`, kind: `open:/inventory/${k.sku}`, primary: true }, { label: 'Received stock? Tell me', kind: `ask:Received 10 ${k.unit} ${k.name.split(' ·')[0]} from ` }],
    });
  },
  orders: (s) => {
    const open = s.orders.filter((o) => o.open); const risk = open.filter((o) => o.risk === 'At risk'); const val = sum(open, orderValue);
    const by = [...new Set(open.map((o) => o.status))].map((st) => ({ st, n: open.filter((o) => o.status === st).length }));
    return v('orders', 'Orders', `${pl(open.length, 'open order')} worth ${inrL(val)}${risk.length ? ` – ${risk.length} at risk (${risk.map((o) => o.id).join(', ')})` : ', none at risk'}.`, {
      kpis: [{ label: 'Open orders', value: String(open.length) }, { label: 'Order value', value: inrL(val) }, { label: 'At risk', value: String(risk.length), tone: risk.length ? 'red' : 'green' }, { label: 'Ready to dispatch', value: String(open.filter((o) => o.status === 'Ready for dispatch').length), tone: 'blue' }],
      charts: [{ type: 'bar', title: 'Open orders by status', bars: by.map((x) => ({ label: x.st, value: x.n, display: String(x.n), tone: x.st === 'Blocked' ? 'red' : x.st === 'Ready for dispatch' ? 'green' : 'blue' })) }],
      tables: [{ cols: [C('id', 'Order'), C('c', 'Customer'), C('p', 'Promised'), C('st', 'Status', 'badge'), C('r', 'Risk', 'badge'), C('v', 'Value', 'money')], rows: open.map((o) => ({ id: o.id, _sub: o.project, c: customerById(s, o.customerId).name, p: o.promised, st: o.status, r: o.risk, v: orderValue(o), _to: `/orders/${o.id}`, _tone: o.risk === 'At risk' ? 'red' : o.risk === 'Watch' ? 'amber' : '' })) }],
      actions: [{ label: 'Open Orders', kind: 'open:/orders', primary: true }, { label: "Today's dispatches", kind: "ask:What's going out for dispatch today?" }],
    });
  },
  dispatch: (s) => {
    const rows = D.dispatchPlan;
    return v('dispatch', 'Dispatch plan', `${pl(rows.length, 'load')} planned – ${rows.filter((r) => /to generate/i.test(r.eway)).length} still need an e-way bill.`, {
      kpis: [{ label: 'Loads planned', value: String(rows.length) }, { label: 'E-way bills pending', value: String(rows.filter((r) => /to generate/i.test(r.eway)).length), tone: 'amber' }, { label: 'Inter-state', value: String(rows.filter((r) => r.interstate).length) }],
      tables: [{ cols: [C('d', 'Date'), C('sl', 'Slot'), C('o', 'Order'), C('c', 'Customer'), C('q', 'Load'), C('veh', 'Vehicle'), C('e', 'E-way bill', 'badge')], rows: rows.map((r) => ({ d: r.date, sl: r.slot, o: r.order, c: r.customer, _csub: r.to, q: r.qty, veh: r.vehicle, e: /to generate/i.test(r.eway) ? 'Awaiting' : r.eway, _to: `/orders/${r.order}?tab=Dispatch` })) }],
      actions: [{ label: 'Open Operations', kind: 'open:/operations', primary: true }],
    });
  },
  pipeline: (s) => {
    const live = s.opportunities.filter((o) => !['Won', 'Lost'].includes(o.stage)); const val = sum(live, (o) => o.value); const w = sum(live, (o) => (o.value * o.probability) / 100);
    const won = s.opportunities.filter((o) => o.stage === 'Won');
    return v('pipeline', 'Sales pipeline', `${pl(live.length, 'open deal')} worth ${inrL(val)} (${inrL(w)} weighted). Biggest: ${[...live].sort((a, b) => b.value - a.value)[0]?.title.split(' – ')[0] || '—'}.`, {
      kpis: [{ label: 'Pipeline', value: inrL(val) }, { label: 'Weighted', value: inrL(w) }, { label: 'Open deals', value: String(live.length) }, { label: 'Won', value: inrL(sum(won, (o) => o.value)), tone: 'green', sub: pl(won.length, 'deal') }],
      charts: [{ type: 'bar', title: 'Pipeline value by stage', bars: D.STAGES.filter((st) => st !== 'Lost').map((st) => { const x = sum(s.opportunities.filter((o) => o.stage === st), (o) => o.value); return { label: st, value: x, display: inrL(x), tone: (st === 'Won' ? 'green' : st === 'Negotiation' ? 'amber' : 'blue') as Bar['tone'] }; }).filter((b) => b.value) }],
      tables: [{ cols: [C('id', 'Deal'), C('c', 'Customer'), C('st', 'Stage', 'badge'), C('p', 'Win %', 'pct'), C('cl', 'Close by'), C('v', 'Value', 'money')], rows: s.opportunities.map((o) => ({ id: o.title.split(' – ')[0], _sub: `${o.id} · ${o.next}`, c: customerById(s, o.customerId).name, st: o.stage, p: o.probability, cl: o.close, v: o.value, _to: `/sales/opportunity/${o.id}` })) }],
      actions: [{ label: 'Open Sales', kind: 'open:/sales', primary: true }, { label: 'Top customers', kind: 'ask:Top 5 customers by revenue' }],
    });
  },
  customers: (s) => {
    const rows = s.customers.map((c) => { const inv = s.invoices.filter((i) => i.customerId === c.id); return { c, billed: sum(inv, (i) => i.total), due: sum(inv, outstanding), open: s.orders.filter((o) => o.open && o.customerId === c.id).length, pipe: sum(s.opportunities.filter((o) => o.customerId === c.id && !['Won', 'Lost'].includes(o.stage)), (o) => o.value) }; }).sort((a, b) => b.billed - a.billed);
    const active = rows.filter((r) => !/Prospect/.test(r.c.since));
    return v('customers', 'Customers', `${rows.length} customers (${active.length} active). Top by billing: ${rows[0].c.name} at ${inrL(rows[0].billed)}.`, {
      kpis: [{ label: 'Customers', value: String(rows.length) }, { label: 'Active', value: String(active.length) }, { label: 'Billed (recent)', value: inrL(sum(rows, (r) => r.billed)) }, { label: 'Outstanding', value: inrL(sum(rows, (r) => r.due)), tone: 'amber' }],
      charts: [{ type: 'bar', title: 'Billed by customer (recent invoices)', bars: rows.filter((r) => r.billed).slice(0, 6).map((r) => ({ label: r.c.name, value: r.billed, display: inrL(r.billed), tone: 'blue' })) }],
      tables: [{ cols: [C('n', 'Customer'), C('seg', 'Segment'), C('b', 'Billed', 'money'), C('d', 'Outstanding', 'money'), C('o', 'Open orders', 'num'), C('p', 'Pipeline', 'money')], rows: rows.map((r) => ({ n: r.c.name, _sub: `${r.c.area}, ${r.c.city}`, seg: r.c.segment, b: r.billed, d: r.due, o: r.open, p: r.pipe, _to: `/sales/customer/${r.c.id}`, _tone: r.due && s.invoices.some((i) => i.customerId === r.c.id && overdueDays(i) > 0 && outstanding(i) > 0) ? 'red' : '' })) }],
      actions: [{ label: 'Open Sales & CRM', kind: 'open:/sales', primary: true }, { label: 'Who owes me money?', kind: 'ask:Who owes me money?' }],
    });
  },
  customer: (s, id) => {
    const c = s.customers.find((x) => x.id === id)!; const inv = s.invoices.filter((i) => i.customerId === id); const ord = s.orders.filter((o) => o.customerId === id); const opp = s.opportunities.filter((o) => o.customerId === id);
    const due = sum(inv, outstanding); const od = inv.filter((i) => outstanding(i) > 0 && overdueDays(i) > 0);
    return v('customer', `${c.segment} · since ${c.since}`, `${c.name}: ${due ? `${inrL(due)} outstanding${od.length ? `, ${inrL(sum(od, outstanding))} overdue` : ''}` : 'nothing outstanding'} · ${pl(ord.filter((o) => o.open).length, 'open order')} · ${pl(opp.filter((o) => !['Won', 'Lost'].includes(o.stage)).length, 'live deal')}.`, {
      kpis: [{ label: 'Outstanding', value: inrL(due), tone: od.length ? 'red' : due ? 'amber' : 'green' }, { label: 'Credit limit', value: c.creditLimit ? inrL(c.creditLimit) : '—', sub: `${c.creditDays} days` }, { label: 'Billed', value: inrL(sum(inv, (i) => i.total)) }, { label: 'Pipeline', value: inrL(sum(opp.filter((o) => !['Won', 'Lost'].includes(o.stage)), (o) => o.value)) }],
      items: [{ label: 'Contact', value: `${c.contact} · ${c.designation}` }, { label: 'Phone', value: c.phone }, { label: 'Location', value: `${c.area}, ${c.city}` }, { label: 'GSTIN', value: c.gstin }, { label: 'Account owner', value: c.owner }],
      tables: [
        ...(inv.length ? [{ title: 'Invoices', cols: [C('id', 'Invoice'), C('d', 'Due'), C('st', 'Status', 'badge'), C('a', 'Balance', 'money')], rows: inv.map((i) => ({ id: i.id, d: i.due, st: overdueDays(i) > 0 && outstanding(i) ? 'Overdue' : i.status, a: outstanding(i), _to: `/finance/${i.id}` })) }] : []),
        ...(ord.length ? [{ title: 'Orders', cols: [C('id', 'Order'), C('p', 'Promised'), C('st', 'Status', 'badge'), C('v', 'Value', 'money')], rows: ord.map((o) => ({ id: o.id, _sub: o.project, p: o.promised, st: o.status, v: orderValue(o), _to: `/orders/${o.id}` })) }] : []),
        ...(opp.length ? [{ title: 'Deals', cols: [C('id', 'Deal'), C('st', 'Stage', 'badge'), C('v', 'Value', 'money')], rows: opp.map((o) => ({ id: o.title.split(' – ')[0], _sub: o.next, st: o.stage, v: o.value, _to: `/sales/opportunity/${o.id}` })) }] : []),
      ],
      actions: [{ label: `Open ${c.name}`, kind: `open:/sales/customer/${c.id}`, primary: true }, ...(od.length ? [{ label: 'Open Collections', kind: 'open:/collections' }] : [])],
    });
  },
  receivables: (s) => {
    const inv = s.invoices.filter((i) => outstanding(i) > 0); const tot = sum(inv, outstanding); const od = inv.filter((i) => overdueDays(i) > 0);
    const bucket = (a: number, b: number) => sum(od.filter((i) => overdueDays(i) >= a && overdueDays(i) <= b), outstanding);
    const byC = [...new Set(inv.map((i) => i.customerId))].map((id) => ({ id, due: sum(inv.filter((i) => i.customerId === id), outstanding), od: sum(od.filter((i) => i.customerId === id), outstanding), n: inv.filter((i) => i.customerId === id).length, worst: Math.max(0, ...inv.filter((i) => i.customerId === id).map(overdueDays)) })).sort((a, b) => b.od - a.od || b.due - a.due);
    return v('receivables', 'Receivables', `Customers owe you ${inrL(tot)}; ${inrL(sum(od, outstanding))} is overdue. ${customerById(s, byC[0].id).name} owes the most overdue (${inrL(byC[0].od || byC[0].due)}).`, {
      kpis: [{ label: 'Outstanding', value: inrL(tot) }, { label: 'Overdue', value: inrL(sum(od, outstanding)), tone: 'red', sub: pl(od.length, 'invoice') }, { label: 'Not yet due', value: inrL(tot - sum(od, outstanding)), tone: 'green' }, { label: 'Customers', value: String(byC.length) }],
      charts: [{ type: 'bar', title: 'Overdue ageing', bars: [{ label: 'Not due', value: tot - sum(od, outstanding), display: inrL(tot - sum(od, outstanding)), tone: 'green' }, { label: '1–15 days', value: bucket(1, 15), display: inrL(bucket(1, 15)), tone: 'amber' }, { label: '16–30 days', value: bucket(16, 30), display: inrL(bucket(16, 30)), tone: 'amber' }, { label: '30+ days', value: bucket(31, 9999), display: inrL(bucket(31, 9999)), tone: 'red' }] }],
      tables: [{ cols: [C('c', 'Customer'), C('n', 'Invoices', 'num'), C('w', 'Oldest overdue'), C('od', 'Overdue', 'money'), C('d', 'Total due', 'money')], rows: byC.map((x) => ({ c: customerById(s, x.id).name, n: x.n, w: x.worst ? `${x.worst} days` : 'Not due', od: x.od, d: x.due, _to: `/sales/customer/${x.id}`, _tone: x.od ? 'red' : '' })) }],
      actions: [{ label: 'Open Collections', kind: 'open:/collections', primary: true }, { label: 'Cash position', kind: "ask:What's my cash position?" }],
    });
  },
  cash: (s) => {
    const c = cash(s);
    return v('cash', 'Cash position', `${inrL(c.bank)} in bank and cash – about ${c.runwayCash} days of fixed costs (${c.runwayTotal} with the CC limit). ${inrL(c.stuck)} is stuck in overdue invoices, slow stock and job workers.`, {
      kpis: [{ label: 'Bank + cash', value: inrL(c.bank) }, { label: 'Runway', value: `${c.runwayCash} days`, sub: `${c.runwayTotal} with CC`, tone: c.runwayCash < 20 ? 'amber' : 'green' }, { label: 'CC headroom', value: inrL(c.headroom) }, { label: 'Payables this week', value: inrL(c.payablesWeek), tone: 'amber' }],
      charts: [{ type: 'bar', title: 'Money stuck', bars: [{ label: 'Overdue invoices', value: c.overdue, display: inrL(c.overdue), tone: 'red' }, { label: 'At job workers', value: c.atJobWorkers, display: inrL(c.atJobWorkers), tone: 'amber' }, { label: 'Slow stock (120+ days)', value: c.slow, display: inrL(c.slow), tone: 'amber' }] }],
      callout: c.overdue > c.payablesWeek ? `Collecting the overdue ${inrL(c.overdue)} would cover this week's payables of ${inrL(c.payablesWeek)}.` : undefined,
      actions: [{ label: 'Open Finance', kind: 'open:/finance', primary: true }, { label: 'Who owes me money?', kind: 'ask:Who owes me money?' }],
    });
  },
  payables: (s) => {
    const b = s.bills.filter((x) => x.status !== 'Paid'); const tot = sum(b, (x) => x.amount - x.paid); const wk = b.filter((x) => x.status === 'Due this week');
    return v('payables', 'Payables', `You owe suppliers ${inrL(tot)}; ${inrL(sum(wk, (x) => x.amount - x.paid))} is due this week${b.some((x) => x.msme45 !== '—') ? ' – MSME 45-day limits apply to some' : ''}.`, {
      kpis: [{ label: 'Total payable', value: inrL(tot) }, { label: 'Due this week', value: inrL(sum(wk, (x) => x.amount - x.paid)), tone: 'amber', sub: pl(wk.length, 'bill') }, { label: 'Overdue', value: String(b.filter((x) => x.status === 'Overdue').length), tone: 'red' }],
      charts: [{ type: 'bar', title: 'Payable by supplier', bars: [...new Set(b.map((x) => x.supplierId))].map((id) => { const a = sum(b.filter((x) => x.supplierId === id), (x) => x.amount - x.paid); return { label: supplierById(id)?.name || id, value: a, display: inrL(a), tone: 'amber' as const }; }).sort((a, z) => z.value - a.value) }],
      tables: [{ cols: [C('id', 'Bill'), C('sup', 'Supplier'), C('due', 'Due'), C('m', 'MSME 45-day'), C('st', 'Status', 'badge'), C('a', 'Balance', 'money')], rows: b.map((x) => ({ id: x.id, _sub: x.ref, sup: supplierById(x.supplierId)?.name || x.supplierId, due: x.due, m: x.msme45, st: x.status, a: x.amount - x.paid, _to: '/finance?tab=Payables', _tone: x.status === 'Due this week' ? 'amber' : '' })) }],
      actions: [{ label: 'Open Payables', kind: 'open:/finance?tab=Payables', primary: true }],
    });
  },
  purchases: (s) => {
    const open = s.pos.filter((p) => !/Received|Paid|Closed/.test(p.status)); const prs = s.prs.filter((p) => !/Closed/.test(p.status));
    return v('purchases', 'Purchases', `${pl(open.length, 'open PO')} worth ${inrL(sum(open, (p) => p.value))}; ${pl(open.filter((p) => !p.confirmed).length, 'PO')} not yet confirmed by the supplier. ${pl(prs.length, 'purchase request')} open.`, {
      kpis: [{ label: 'Open POs', value: String(open.length) }, { label: 'PO value', value: inrL(sum(open, (p) => p.value)) }, { label: 'Unconfirmed', value: String(open.filter((p) => !p.confirmed).length), tone: 'amber' }, { label: 'Open PRs', value: String(prs.length) }],
      tables: [{ title: 'Purchase orders', cols: [C('id', 'PO'), C('sup', 'Supplier'), C('m', 'Material'), C('eta', 'ETA'), C('st', 'Status', 'badge'), C('v', 'Value', 'money')], rows: s.pos.map((p) => ({ id: p.id, sup: supplierById(p.supplierId)?.name || p.supplierId, m: p.material, eta: p.eta, st: p.confirmed ? p.status : 'Awaiting confirmation', v: p.value, _to: '/procurement?tab=Purchase%20orders', _tone: !p.confirmed ? 'amber' : '' })) },
        { title: 'Purchase requests', cols: [C('id', 'PR'), C('m', 'Material'), C('q', 'Qty', 'num'), C('nb', 'Needed by'), C('pr', 'Priority', 'badge'), C('st', 'Status', 'badge')], rows: s.prs.map((p) => ({ id: p.id, m: p.material, q: p.qty, nb: p.neededBy, pr: p.priority, st: p.status, _to: `/procurement/${p.id}` })) }],
      actions: [{ label: 'Open Procurement', kind: 'open:/procurement', primary: true }, { label: 'Where am I overpaying?', kind: 'ask:Where am I overpaying?' }],
    });
  },
  production: (s) => {
    const w = s.workOrders; const behind = w.filter((x) => x.status === 'Behind' || x.status === 'Blocked'); const cap = [...D.capacity].sort((a, b) => a.utilisation - b.utilisation);
    return v('production', 'Production', `${pl(w.filter((x) => x.status !== 'Done').length, 'work order')} in progress, ${behind.length} behind or blocked. Least loaded: ${cap[0].process} at ${cap[0].utilisation}% utilisation; busiest: ${cap[cap.length - 1].process} at ${cap[cap.length - 1].utilisation}%.`, {
      kpis: [{ label: 'Active WOs', value: String(w.filter((x) => x.status !== 'Done').length) }, { label: 'Behind / blocked', value: String(behind.length), tone: behind.length ? 'red' : 'green' }, { label: 'Least loaded', value: cap[0].process, sub: `${cap[0].utilisation}%` }, { label: 'Busiest', value: cap[cap.length - 1].process, sub: `${cap[cap.length - 1].utilisation}%`, tone: 'amber' }],
      charts: [{ type: 'bar', title: 'Capacity utilisation by process', bars: [...D.capacity].sort((a, b) => b.utilisation - a.utilisation).map((c) => ({ label: c.process, value: c.utilisation, display: `${c.utilisation}%`, tone: c.utilisation >= 90 ? 'red' : c.utilisation < 75 ? 'green' : 'blue' })) }],
      tables: [{ cols: [C('id', 'WO'), C('op', 'Operation'), C('c', 'Work centre'), C('f', 'Finish'), C('pg', 'Progress', 'pct'), C('st', 'Status', 'badge')], rows: w.map((x) => ({ id: x.id, _sub: x.order, op: x.op, c: x.center, f: x.finish, pg: x.progress, st: x.status === 'Behind' ? 'At risk' : x.status, _tone: x.status === 'Behind' || x.status === 'Blocked' ? 'red' : '' })) }],
      actions: [{ label: 'Open Operations', kind: 'open:/operations', primary: true }],
    });
  },
  jobwork: (s) => {
    const ch = s.challans; const pend = ch.filter((c) => c.sent - c.returned - c.scrap > 0); const val = sum(pend, (c) => (c.sent - c.returned - c.scrap) * c.valuePerUnit);
    const jw = (id: string) => D.jobWorkers.find((j) => j.id === id)?.name || id;
    return v('jobwork', 'Job work', `${pl(pend.length, 'challan')} with material at job workers (${inrL(val)}); ${ch.filter((c) => c.status === 'Overdue').length} overdue.`, {
      kpis: [{ label: 'Material out', value: inrL(val) }, { label: 'Open challans', value: String(pend.length) }, { label: 'Overdue', value: String(ch.filter((c) => c.status === 'Overdue').length), tone: 'red' }],
      tables: [{ cols: [C('id', 'Challan'), C('w', 'Job worker'), C('i', 'Item'), C('p', 'Pending', 'num'), C('e', 'Expected'), C('st', 'Status', 'badge')], rows: ch.map((c) => ({ id: c.id, w: jw(c.workerId), i: c.item, p: c.sent - c.returned - c.scrap, e: c.expected, st: c.status, _to: '/job-work?tab=Material%20out', _tone: c.status === 'Overdue' ? 'red' : '' })) }],
      actions: [{ label: 'Open Job Work', kind: 'open:/job-work', primary: true }],
    });
  },
  quality: (s) => {
    const sup = [...s.contacts].filter((c) => c.rejection > 0).sort((a, b) => b.rejection - a.rejection);
    return v('quality', 'Quality', `Highest incoming rejection: ${sup[0]?.supplier} at ${sup[0]?.rejection}%. ${pl(s.workOrders.filter((w) => /hold|fail|rework/i.test(w.quality)).length, 'work order')} on quality hold.`, {
      charts: [{ type: 'bar', title: 'Supplier rejection rate (%)', bars: sup.slice(0, 7).map((c) => ({ label: c.supplier, value: c.rejection, display: `${c.rejection}%`, tone: c.rejection > 1.5 ? 'red' : 'green' })) }],
      tables: [{ title: 'Work order quality', cols: [C('id', 'WO'), C('op', 'Operation'), C('q', 'Quality status', 'badge')], rows: s.workOrders.map((w) => ({ id: w.id, op: w.op, q: w.quality })) }],
      actions: [{ label: 'Open Operations', kind: 'open:/operations', primary: true }, { label: 'Most reliable supplier', kind: 'ask:Most reliable supplier this quarter' }],
    });
  },
  people: (s) => {
    const e = s.employees; const n = (st: string) => e.filter((x) => x.status === st).length; const ex = e.filter((x) => x.status !== 'Present');
    return v('people', 'People & attendance', `${n('Present') + n('Late')} of ${e.length} in today · ${pl(n('On leave'), 'person')} on leave, ${n('Absent')} absent, ${n('Late')} late.`, {
      kpis: [{ label: 'In today', value: `${n('Present') + n('Late')}/${e.length}`, tone: 'green' }, { label: 'On leave', value: String(n('On leave')), tone: 'blue' }, { label: 'Absent', value: String(n('Absent')), tone: n('Absent') ? 'red' : 'green' }, { label: 'Late', value: String(n('Late')), tone: 'amber' }],
      charts: [{ type: 'donut', title: 'Attendance today', bars: ([{ label: 'Present', value: n('Present'), display: String(n('Present')), tone: 'green' }, { label: 'Late', value: n('Late'), display: String(n('Late')), tone: 'amber' }, { label: 'On leave', value: n('On leave'), display: String(n('On leave')), tone: 'blue' }, { label: 'Absent', value: n('Absent'), display: String(n('Absent')), tone: 'red' }] as Bar[]).filter((b) => b.value) }],
      tables: [{ title: 'Not present', cols: [C('n', 'Name'), C('t', 'Team'), C('st', 'Status', 'badge'), C('x', 'Note')], rows: ex.map((x) => ({ n: x.name, _sub: x.role, t: x.team, st: x.status, x: x.exception || x.leave || '—', _to: `/people/${x.id}` })) }],
      actions: [{ label: 'Open People', kind: 'open:/people?tab=Attendance', primary: true }],
    });
  },
  approvals: (s) => {
    const a = approvals(s);
    return v('approvals', 'Approvals', `${pl(a.length, 'item')} waiting for you – ${a.filter((x) => x.urgent).length} urgent${a[0] ? `, starting with “${a[0].title}”` : ''}.`, {
      kpis: [{ label: 'Waiting', value: String(a.length) }, { label: 'Urgent', value: String(a.filter((x) => x.urgent).length), tone: 'red' }, { label: 'Value', value: inrL(sum(a, (x) => x.amount || 0)) }],
      items: a.map((x) => ({ label: x.title, sub: `${x.kind} · ${x.agent || ''}${x.due ? ` · due ${x.due}` : ''}`, tone: x.urgent ? 'red' : 'blue', to: x.to, value: x.amount ? inrL(x.amount) : '' })),
      actions: [{ label: 'Open Approvals', kind: 'open:/approvals', primary: true }],
    });
  },
  compliance: () => v('compliance', 'Compliance', `Next filing: ${D.compliance[0].name} by ${D.compliance[0].due}. ${D.compliance.filter((c) => c.tone === 'amber').length} need attention.`, {
    items: D.compliance.map((c) => ({ label: c.name, sub: c.status, value: c.due, tone: c.tone as Item['tone'] })), actions: [{ label: 'Open Finance', kind: 'open:/finance', primary: true }],
  }),
  sourcing: (s) => v('sourcing', 'Sourcing', s.sourcing.status === 'idle' ? 'No sourcing run is active in this session. Describe what you need and I’ll check stock and suppliers.' : `Sourcing run is ${s.sourcing.status}; ${Object.keys(s.sourcing.sent).length} suppliers contacted.`, {
    kpis: [{ label: 'Status', value: s.sourcing.status === 'idle' ? 'Idle' : s.sourcing.status }, { label: 'Suppliers contacted', value: String(Object.keys(s.sourcing.sent).length) }, { label: 'PO draft', value: s.sourcing.poDraft ? (s.sourcing.poApproved ? 'Approved' : 'Ready') : '—' }],
    actions: [{ label: 'Open Live sourcing', kind: 'open:/sourcing/live', primary: true }, { label: 'Open Sourcing', kind: 'open:/sourcing' }],
  }),
  reports: () => {
    const m = D.monthly; const cur = m[m.length - 1], prev = m[m.length - 2];
    return v('reports', 'Monthly KPIs', `October revenue ₹${cur.revenue} lakh, up ${(((cur.revenue - prev.revenue) / prev.revenue) * 100).toFixed(0)}% on September – but DSO rose to ${cur.dso} days and on-time delivery slipped to ${cur.onTime}%.`, {
      charts: [{ type: 'line', title: 'Revenue by month (₹ lakh)', bars: m.map((x) => ({ label: x.m, value: x.revenue, display: `₹${x.revenue}L`, tone: 'blue' })) }],
      tables: [{ cols: [C('k', 'Metric'), C('p', prev.m), C('c', cur.m), C('d', 'Change')], rows: compareRows(prev, cur) }],
      actions: [{ label: 'Open Reports', kind: 'open:/reports', primary: true }],
    });
  },
  compare: () => H.reports({} as DemoState),
  business: (s) => {
    const k = kpis(s); const c = cash(s); const a = approvals(s); const low = s.skus.filter(isLow);
    const worries: Item[] = [
      ...s.orders.filter((o) => o.open && o.risk === 'At risk').map((o) => ({ label: `${o.id} at risk – ${customerById(s, o.customerId).name}`, sub: o.riskNote || `promised ${o.promised}`, tone: 'red' as const, to: `/orders/${o.id}` })),
      ...(k.overdueAmt ? [{ label: `${inrL(k.overdueAmt)} overdue from ${pl(k.overdueCount, 'invoice')}`, sub: 'Collections', tone: 'red' as const, to: '/collections' }] : []),
      ...(low.length ? [{ label: `${pl(low.length, 'item')} below reorder`, sub: low.map((x) => x.name.split(' ·')[0]).slice(0, 3).join(', '), tone: 'amber' as const, to: '/inventory' }] : []),
      ...(k.behind ? [{ label: `${pl(k.behind, 'work order')} behind schedule`, sub: 'Operations', tone: 'amber' as const, to: '/operations' }] : []),
      ...(c.payablesWeek ? [{ label: `${inrL(c.payablesWeek)} supplier bills due this week`, sub: 'Payables', tone: 'amber' as const, to: '/finance?tab=Payables' }] : []),
      ...(a.length ? [{ label: `${pl(a.length, 'approval')} waiting for you`, sub: a.filter((x) => x.urgent).length + ' urgent', tone: 'blue' as const, to: '/approvals' }] : []),
    ];
    return v('business', 'Business today', `Revenue is up ${k.revenueGrowth}% this month, but ${worries.filter((w) => w.tone === 'red').length} things need you today – start with ${worries[0]?.label || 'approvals'}.`, {
      kpis: [{ label: 'Revenue (Oct)', value: inrL(k.revenue), sub: `+${k.revenueGrowth}%`, tone: 'green' }, { label: 'Overdue', value: inrL(k.overdueAmt), tone: 'red' }, { label: 'Open orders', value: String(k.openOrders), sub: `${k.atRisk} at risk` }, { label: 'Cash runway', value: `${c.runwayCash} days` }, { label: 'People in', value: `${k.present}/${k.employees}` }, { label: 'Approvals', value: String(a.length), tone: 'blue' }],
      items: worries,
      charts: [{ type: 'line', title: 'Revenue trend (₹ lakh)', bars: D.monthly.map((x) => ({ label: x.m, value: x.revenue, display: `₹${x.revenue}L` })) }],
      actions: [{ label: 'Open Approvals', kind: 'open:/approvals', primary: true }, { label: 'Who owes me money?', kind: 'ask:Who owes me money?' }, { label: 'Cash position', kind: "ask:What's my cash position?" }],
    });
  },
};
const compareRows = (p: (typeof D.monthly)[number], c: (typeof D.monthly)[number]): Row[] => ([['Revenue (₹ lakh)', 'revenue', 1], ['Collected (₹ lakh)', 'collected', 1], ['Gross margin %', 'margin', 1], ['DSO (days)', 'dso', -1], ['Orders', 'orders', 1], ['On-time delivery %', 'onTime', 1], ['Production efficiency %', 'production', 1], ['Stock-outs', 'stockouts', -1], ['Attendance %', 'attendance', 1]] as const).map(([k, f, good]) => { const d = +(c[f] - p[f]).toFixed(1); return { k, p: p[f], c: c[f], d: `${d > 0 ? '+' : ''}${d}`, _tone: d * good < 0 ? 'amber' : '' }; });

export const domainView = (domain: string, s: DemoState, name?: string): View | null => (H[domain] ? H[domain](s, name) : null);

/* ---------- generic AI path ---------- */
const DOMAIN_KEYS: Record<string, string[]> = { inventory: ['inventory'], low_stock: ['inventory'], item: ['inventory'], orders: ['orders'], dispatch: ['dispatch'], pipeline: ['deals'], customers: ['customers'], customer: ['customers', 'invoices', 'orders', 'deals'], receivables: ['invoices'], cash: ['cash', 'invoices', 'bills'], payables: ['bills'], purchases: ['pos', 'prs'], production: ['workOrders', 'capacity'], jobwork: ['challans'], quality: ['suppliers', 'workOrders'], people: ['people'], approvals: ['approvals'], compliance: ['compliance'], reports: ['monthly'], compare: ['monthly'], business: ['kpis', 'monthly', 'cash'], sourcing: ['kpis'] };
export function snapshot(s: DemoState, domain?: string) {
  const all: Record<string, () => unknown> = {
    inventory: () => s.skus.map((k) => ({ name: k.name.split(' ·')[0], sku: k.sku, category: k.category, onHand: k.onHand, available: available(k), reorder: k.reorder, unitCost: k.unitCost, value: k.onHand * k.unitCost, agingDays: k.agingDays, low: isLow(k) })),
    orders: () => s.orders.map((o) => ({ id: o.id, customer: customerById(s, o.customerId).name, project: o.project, promised: o.promised, status: o.status, risk: o.risk, open: o.open, value: orderValue(o), payment: o.payment })),
    customers: () => s.customers.map((c) => ({ id: c.id, name: c.name, segment: c.segment, creditLimit: c.creditLimit, openOrders: s.orders.filter((o) => o.customerId === c.id && o.status !== 'Delivered').length, pipeline: sum(s.opportunities.filter((o) => o.customerId === c.id && o.stage !== 'Won' && o.stage !== 'Lost'), (o) => o.value), billed: sum(s.invoices.filter((i) => i.customerId === c.id), (i) => i.total), outstanding: sum(s.invoices.filter((i) => i.customerId === c.id), outstanding) })),
    invoices: () => s.invoices.map((i) => ({ id: i.id, customer: customerById(s, i.customerId).name, issue: i.issue, due: i.due, total: i.total, balance: outstanding(i), overdueDays: outstanding(i) ? overdueDays(i) : 0, status: i.status })),
    deals: () => s.opportunities.map((o) => ({ id: o.id, title: o.title, customer: customerById(s, o.customerId).name, stage: o.stage, value: o.value, probability: o.probability, close: o.close, owner: o.owner })),
    dispatch: () => D.dispatchPlan.map((d) => ({ date: d.date, order: d.order, customer: d.customer, load: d.qty, vehicle: d.vehicle, eway: d.eway })),
    bills: () => s.bills.map((b) => ({ id: b.id, supplier: supplierById(b.supplierId)?.name, due: b.due, amount: b.amount, balance: b.amount - b.paid, status: b.status, msme45: b.msme45 })),
    pos: () => s.pos.map((p) => ({ id: p.id, supplier: supplierById(p.supplierId)?.name, material: p.material, qty: p.qty, value: p.value, eta: p.eta, status: p.status, confirmed: p.confirmed })),
    prs: () => s.prs.map((p) => ({ id: p.id, material: p.material, qty: p.qty, neededBy: p.neededBy, status: p.status, priority: p.priority })),
    workOrders: () => s.workOrders.map((w) => ({ id: w.id, order: w.order, op: w.op, workCentre: w.center, finish: w.finish, progress: w.progress, status: w.status, quality: w.quality })),
    capacity: () => D.capacity, challans: () => s.challans.map((c) => ({ id: c.id, item: c.item, sent: c.sent, returned: c.returned, pending: c.sent - c.returned - c.scrap, expected: c.expected, status: c.status })),
    suppliers: () => s.contacts.map((c) => ({ name: c.supplier, city: c.city, supplies: c.supplies, onTime: c.onTime, rejection: c.rejection, leadDays: c.leadDays, rating: c.rating, lastPrice: c.lastPrice })),
    people: () => ({ total: s.employees.length, byStatus: Object.fromEntries(['Present', 'Late', 'On leave', 'Absent'].map((st) => [st, s.employees.filter((e) => e.status === st).length])), notPresent: s.employees.filter((e) => e.status !== 'Present').map((e) => ({ name: e.name, team: e.team, status: e.status, note: e.exception || e.leave })) , byTeam: Object.fromEntries([...new Set(s.employees.map((e) => e.team))].map((t) => [t, s.employees.filter((e) => e.team === t).length])) }),
    approvals: () => approvals(s).map((a) => ({ title: a.title, kind: a.kind, amount: a.amount || 0, urgent: !!a.urgent, due: a.due || '' })),
    compliance: () => D.compliance, monthly: () => D.monthly, cash: () => cash(s), kpis: () => kpis(s),
  };
  const keys = domain && DOMAIN_KEYS[domain] ? DOMAIN_KEYS[domain] : ['kpis', 'inventory', 'orders', 'customers', 'invoices', 'deals', 'workOrders', 'capacity', 'people', 'monthly', 'cash', 'bills', 'pos'];
  return Object.fromEntries(keys.map((k) => [k, all[k]()]));
}
const SPECIFIC = /\b(which|who|what|top|highest|lowest|most|least|biggest|smallest|best|worst|compare|vs|versus|how many|how much|total|average|avg|idle|cheapest|costliest|largest|rank|sort|between|more than|less than|above|below|only|except|without)\b/i;
export const isSpecific = (t: string) => SPECIFIC.test(t);

export type GenBlock = { headline?: string; title?: string; kpis?: { label: string; value: number | string; format?: string; sub?: string }[]; chart?: { type?: string; title?: string; source?: string; label?: string; value?: string; limit?: number; points?: { label: string; value: number }[] }; table?: { source?: string; sort?: string; order?: string; limit?: number; where?: Record<string, unknown>; title?: string; columns?: { key: string; label: string; format?: string }[]; rows?: Record<string, unknown>[] }; items?: { label: string; sub?: string; tone?: string }[]; callout?: string; followups?: string[] };
const nums = (x: unknown, out: number[] = []): number[] => { if (typeof x === 'number') out.push(x); else if (typeof x === 'string') { for (const m of x.replace(/,/g, '').matchAll(/-?\d+(?:\.\d+)?(?:\s*(lakhs?|lacs?|crores?|cr|[MKLk])\b)?/g)) { const u = (m[1] || '').toLowerCase(); out.push(Number(m[0].match(/-?\d+(?:\.\d+)?/)![0]) * (u.startsWith('l') ? 1e5 : u.startsWith('c') ? 1e7 : u === 'm' ? 1e6 : u === 'k' ? 1e3 : 1)); } } else if (Array.isArray(x)) x.forEach((y) => nums(y, out)); else if (x && typeof x === 'object') Object.values(x).forEach((y) => nums(y, out)); return out; };
/** Turn the AI's blocks into a View, rejecting it if any number isn't backed by the snapshot (allowing sums, differences, counts and %). */
export function validateView(g: GenBlock, snap: unknown, domain: string, question = ''): View | null {
  if (!g || typeof g !== 'object' || !g.headline) return null;
  // codes → readable names (RM-SS12 → SS 304 sheet 1.2 mm, C02 → Aarav Interiors)
  const names = new Map<string, string>(); const collect = (x: unknown) => { if (Array.isArray(x)) x.forEach(collect); else if (x && typeof x === 'object') { const o = x as Record<string, unknown>; const nm = o.name ?? o.title; if (typeof nm === 'string') for (const k of ['sku', 'id']) if (typeof o[k] === 'string' && o[k] !== nm) names.set(o[k] as string, nm); Object.values(o).forEach(collect); } };
  collect(snap);
  const codeRe = names.size ? new RegExp(`\\b(${[...names.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/[-]/g, '\\-')).join('|')})\\b(\\s*\\(([^)]*)\\))?`, 'g') : null;
  const nm = (v: string) => (codeRe ? v.replace(codeRe, (_m, c: string, _p, inner?: string) => (inner && names.get(c)!.toLowerCase().startsWith(inner.toLowerCase().slice(0, 6)) ? names.get(c)! : names.get(c)! + (inner ? ` (${inner})` : ''))) : v);
  const fix = (x: unknown): unknown => (typeof x === 'string' ? nm(x) : Array.isArray(x) ? x.map(fix) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, fix(v)])) : x);
  g = fix(g) as GenBlock;
  const list = (src?: string): Record<string, unknown>[] | null => { if (!src) return null; let x: unknown = snap; for (const k of String(src).split('.')) x = x && typeof x === 'object' ? (x as Record<string, unknown>)[k] : undefined; return Array.isArray(x) ? (x as Record<string, unknown>[]) : null; };
  const topN = Number((question.match(/\btop\s*(\d{1,2})\b|\b(\d{1,2})\s*(?:top|best|biggest|largest|highest)\b/i) || []).slice(1).find(Boolean) || 0);
  const asc = /\b(lowest|least|smallest|cheapest|bottom|minimum|slowest)\b/i.test(question);
  const tl = list(g.table?.source);
  if (g.table && tl) {
    const w = g.table.where && typeof g.table.where === 'object' ? Object.entries(g.table.where) : [];
    let rr = tl.filter((r) => w.every(([k, v]) => String(r[k]).toLowerCase() === String(v).toLowerCase()));
    const sk = g.table.sort && rr.some((r) => typeof r[g.table!.sort!] === 'number') ? g.table.sort : undefined;
    if (sk && !rr.some((r) => 'month' in r)) rr = [...rr].sort((a, b) => ((Number(b[sk]) || 0) - (Number(a[sk]) || 0)) * (g.table!.order === 'asc' || asc ? -1 : 1));
    const lim = topN || Math.max(5, Math.min(Number(g.table.limit) || 10, 12));
    let columns = (g.table.columns || []).filter((c) => c && rr.some((r) => c.key in r));
    const nameKey = ['name', 'customer', 'title', 'supplier', 'item', 'material'].find((k) => rr.some((r) => typeof r[k] === 'string'));
    if (nameKey && !columns.some((c) => c.key === nameKey)) columns = [{ key: nameKey, label: nameKey[0].toUpperCase() + nameKey.slice(1), format: 'text' }, ...columns];
    if (nameKey) columns = columns.filter((c) => c.key !== 'sku' && c.key !== 'id');
    if (columns.length) columns = [...columns.filter((c) => c.key === nameKey), ...columns.filter((c) => c.key !== nameKey)];
    g = { ...g, table: { ...g.table, columns, rows: rr.slice(0, lim) } };
  }
  const cl = list(g.chart?.source);
  if (g.chart && cl && g.chart.value) {
    const lk = g.chart.label && cl.some((r) => g.chart!.label! in r) ? g.chart.label : ['name', 'customer', 'title', 'month', 'label'].find((k) => cl.some((r) => k in r));
    let pp = cl.filter((r) => typeof r[g.chart!.value!] === 'number').map((r) => ({ label: String(r[lk!] ?? ''), value: r[g.chart!.value!] as number }));
    if (g.chart.type !== 'line') pp = pp.sort((a, b) => (b.value - a.value) * (asc ? -1 : 1)).slice(0, topN || Math.min(Number(g.chart.limit) || 8, 10));
    g = { ...g, chart: { ...g.chart, points: pp } };
  }
  const pool = nums(snap); const set = new Set(pool.map((n) => Math.round(n * 100) / 100));
  const arrays: number[][] = []; const walk = (x: unknown) => { if (Array.isArray(x)) { const ks = new Set<string>(); x.forEach((r) => r && typeof r === 'object' && Object.keys(r).forEach((k) => ks.add(k))); ks.forEach((k) => arrays.push(x.map((r) => (r as Record<string, unknown>)?.[k]).filter((v): v is number => typeof v === 'number'))); x.forEach(walk); } else if (x && typeof x === 'object') Object.values(x).forEach(walk); };
  walk(snap);
  const derived = new Set<number>(); arrays.forEach((a) => { derived.add(a.length); const t = a.reduce((p, q) => p + q, 0); derived.add(Math.round(t)); if (a.length) derived.add(Math.round(t / a.length)); });
  const ok = (n: number) => { if (set.has(Math.round((n / 1e5) * 100) / 100) || set.has(Math.round((n / 1e7) * 100) / 100)) return true; if (Math.abs(n) <= 31 || Number.isInteger(n) && n >= 2020 && n <= 2030) return true; const r = Math.round(n * 100) / 100; if (set.has(r) || derived.has(Math.round(n))) return true; for (const p of pool) { if (Math.abs(p - n) <= Math.max(1, Math.abs(p) * 0.006)) return true; if (Math.abs(p / 1e5 - n) < 0.01 || Math.abs(p / 1e7 - n) < 0.01) return true; } for (const d of derived) if (Math.abs(d - n) <= Math.max(1, Math.abs(d) * 0.006) || Math.abs(d / 1e5 - n) < 0.01) return true; for (const a of pool) for (const b of pool) if (Math.abs(a - b - n) < 0.06 || (b && Math.abs(((a - b) / b) * 100 - n) < 0.6)) return true; return false; };
  // numbers that are part of names/labels in the data ("SS 304 sheet", "RAL 7035", "PO-0912") are not claims – strip them first
  const strs: string[] = []; const sw = (x: unknown) => { if (typeof x === 'string') { if (/\d/.test(x) && x.length > 2) strs.push(x); } else if (Array.isArray(x)) x.forEach(sw); else if (x && typeof x === 'object') Object.values(x).forEach(sw); }; sw(snap); strs.sort((a, b) => b.length - a.length);
  const strip = (x: unknown): unknown => (typeof x === 'string' ? strs.reduce((t, n) => t.split(n).join(' '), x) : Array.isArray(x) ? x.map(strip) : x && typeof x === 'object' ? Object.values(x).map(strip) : x);
  // KPI tiles are the most prominent claim: only direct values, column totals/averages/counts or lakh conversions – no pair differences
  const strict = (n: number) => Math.abs(n) <= 31 || pool.some((p) => Math.abs(p - n) <= Math.max(1, Math.abs(p) * 0.006) || Math.abs(p / 1e5 - n) < 0.01) || [...derived].some((d) => Math.abs(d - n) <= Math.max(1, Math.abs(d) * 0.006) || Math.abs(d / 1e5 - n) < 0.01);
  g = { ...g, kpis: (g.kpis || []).map((k) => (typeof k.value === 'string' && /^-?\d+(\.\d+)?$/.test(k.value.trim()) ? { ...k, value: Number(k.value) } : k)).filter((k) => nums(strip([k.value, k.sub])).every(strict)) };
  const bad = nums(strip([g.headline, g.kpis, g.chart?.points?.map((p) => p.value), g.table?.rows, g.callout])).filter((n) => !ok(n));
  if (bad.length) {
    // salvage: rows/points come from the data, so drop only the claims that don't check out
    const clean = (x: unknown) => nums(strip(x)).every(ok);
    console.warn('[view] dropped ungrounded numbers', bad.slice(0, 6));
    g = { ...g, kpis: (g.kpis || []).filter(clean), callout: g.callout && clean(g.callout) ? g.callout : undefined, items: (g.items || []).filter(clean) };
    if (!clean(g.chart?.points?.map((p) => p.value))) g = { ...g, chart: undefined };
    if (!clean(g.table?.rows)) return null;
    if (!clean(g.headline)) {
      const r0 = g.table?.rows?.[0]; const cs = g.table?.columns || [];
      const nc = cs.find((c) => ['inr', 'num', 'pct'].includes(String(c.format)) && typeof r0?.[c.key] === 'number');
      if (!r0 || !nc || !/\b(top|highest|lowest|most|least|biggest|largest|smallest|best|worst|which|who)\b/i.test(question) || 'month' in r0) return null;
      const v = r0[nc.key] as number;
      g = { ...g, headline: `${String(r0[cs[0].key])} ${asc ? 'is lowest' : 'leads'} on ${nc.label.toLowerCase()} at ${nc.format === 'inr' ? inrL(v) : nc.format === 'pct' ? v + '%' : v.toLocaleString('en-IN')}.` };
    }
  }
  const fmt = (val: unknown, f?: string) => (typeof val === 'number' ? (f === 'inr' ? inrL(val) : f === 'pct' ? `${val}%` : val.toLocaleString('en-IN')) : String(val ?? '—'));
  const typeOf = (f?: string): Col['type'] => (f === 'inr' ? 'money' : f === 'pct' ? 'pct' : f === 'num' ? 'num' : f === 'status' ? 'badge' : 'text');
  const cols = (g.table?.columns || []).slice(0, 7).map((c) => C(String(c.key), String(c.label), typeOf(c.format)));
  // the model sometimes sends rows as arrays or with keys that differ in case/spacing from the columns – map them by key, then by position
  const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cell = (v: unknown) => (typeof v === 'number' || typeof v === 'string' ? v : v == null ? '' : String(v));
  const rows = (g.table?.rows || []).slice(0, 40).map((r) => {
    if (Array.isArray(r)) return Object.fromEntries(cols.map((c, i) => [c.key, cell(r[i])]));
    const o = (r || {}) as Record<string, unknown>; const byN = new Map(Object.keys(o).map((k) => [norm(k), o[k]])); const vals = Object.values(o);
    return Object.fromEntries(cols.map((c, i) => [c.key, cell(c.key in o ? o[c.key] : byN.has(norm(c.key)) ? byN.get(norm(c.key)) : byN.has(norm(c.label)) ? byN.get(norm(c.label)) : vals[i])]));
  }).filter((r) => cols.some((c) => r[c.key] !== '')) as Row[];
  const qw = question.toLowerCase();
  const numCols = cols.filter((c) => c.type && c.type !== 'text' && c.type !== 'badge');
  const metric = numCols.find((c) => qw.split(/\W+/).some((w) => w.length > 3 && (c.label.toLowerCase().includes(w.replace(/s$/, '')) || c.key.toLowerCase().includes(w.replace(/s$/, ''))))) || (/\b(top|highest|lowest|most|least|biggest|best|worst|rank|largest|smallest)\b/i.test(question) ? numCols[0] : undefined);
  if (metric && !rows.some((r) => 'month' in r)) rows.sort((a, b) => ((Number(b[metric.key]) || 0) - (Number(a[metric.key]) || 0)) * (asc ? -1 : 1));
  if (topN) rows.splice(topN);
  const tableOk = rows.length > 0 && rows.filter((r) => r[cols[0].key] !== '').length >= rows.length * 0.8 && new Set(rows.map((r) => JSON.stringify(r))).size === rows.length;
  // ranking questions: the headline is written from the sorted rows, so it can't drift from the table
  let headline = String(g.headline); let rankKpis: Kpi[] | null = null;
  const ranking = /\b(top|highest|lowest|most|least|biggest|largest|smallest|best|worst|rank)\b/i.test(question);
  const mc = metric || numCols[0];
  if (tableOk && mc && ranking && !rows.some((r) => 'month' in r)) {
    const f = (v: unknown) => (typeof v === 'number' ? (/\bdays?\b/i.test(mc.label) ? `${v} days` : mc.type === 'money' ? inrL(v) : mc.type === 'pct' ? `${v}%` : v.toLocaleString('en-IN')) : String(v));
    const nmk = cols[0].key; const top = rows.slice(0, topN ? Math.min(topN, 5) : 3);
    const tot = rows.reduce((a, r) => a + (Number(r[mc.key]) || 0), 0);
    headline = topN && rows.length > 1
      ? `Top ${rows.length} by ${mc.label.toLowerCase()}: ${top.map((r) => `${r[nmk]} (${f(r[mc.key])})`).join(', ')}${mc.type === 'money' ? ` – together ${inrL(tot)}` : ''}.`
      : `${rows[0][nmk]} is ${asc ? 'lowest' : 'highest'} on ${mc.label.toLowerCase()} at ${f(rows[0][mc.key])}${rows[1] ? `, followed by ${rows[1][nmk]} (${f(rows[1][mc.key])})` : ''}.`;
    rankKpis = [{ label: asc ? 'Lowest' : 'Top', value: String(rows[0][nmk]), sub: f(rows[0][mc.key]) }, ...(mc.type === 'money' && rows.length > 1 ? [{ label: `Total of ${rows.length}`, value: inrL(tot) }] : []), ...(rows[1] ? [{ label: 'Next', value: String(rows[1][nmk]), sub: f(rows[1][mc.key]) }] : [])];
  } else if (/\d\s*(M|K|mn|bn)\b|\bINR\b/.test(headline)) return null;
  const ct = g.chart?.type === 'line' || g.chart?.type === 'donut' ? g.chart.type : 'bar';
  const pts0 = (g.chart?.points || []).filter((p) => p && typeof p.value === 'number').slice(0, 12); let pts = pts0.length >= 2 ? pts0 : [];
  const ct0 = g.chart?.type === 'line' ? 'line' : 'rank';
  if (ct0 === 'rank') { pts = [...pts].sort((a, b) => (b.value - a.value) * (asc ? -1 : 1)); if (topN) pts = pts.slice(0, topN); }
  let ctitle = String(g.chart?.title || '');
  if (ct0 === 'rank' && pts.length && (/\btop\b/i.test(ctitle) || topN)) ctitle = ctitle.replace(/\btop\s*(\d+\s*)?(items?|customers?|[a-z]+)?/i, (_m, _n, w?: string) => `Top ${pts.length}${w ? ' ' + (pts.length > 1 ? w.replace(/(?<!s)$/, 's').replace(/ys$/, 'ies').replace(/ss$/, 's') : w.replace(/s$/, '')) : ''}`);
  if (g.chart?.type === 'donut' && /\bshare of (the )?top (item|one)\b/i.test(ctitle)) ctitle = `Value share – top ${pts.length}`;
  const isMoney = /₹|value|amount|revenue|billed|outstanding|cost|price|payable/i.test(g.chart?.title || '');
  return { kind: 'view', via: 'llm', domain, title: String(g.title || ''), headline: headline.slice(0, 260),
    kpis: rankKpis || (g.kpis || []).slice(0, 6).map((k) => ({ label: String(k.label), value: fmt(k.value, k.format), sub: k.sub ? String(k.sub) : undefined })),
    charts: pts.length ? [{ type: ct, title: ctitle, bars: pts.map((p, i) => ({ label: String(p.label), value: p.value, display: isMoney && p.value > 999 ? inrL(p.value) : p.value.toLocaleString('en-IN'), tone: (ct === 'donut' ? (['blue', 'green', 'amber', 'red'] as const)[i % 4] : 'blue') as Bar['tone'] })) }] : [],
    tables: cols.length && tableOk ? [{ title: g.table?.title, cols, rows }] : [],
    items: (g.items || []).slice(0, 8).map((x) => ({ label: String(x.label), sub: x.sub && !/^(red|amber|green|blue)$/i.test(String(x.sub)) ? String(x.sub) : undefined, tone: (['red', 'amber', 'green', 'blue'].includes(String(x.tone)) ? x.tone : 'blue') as Item['tone'] })),
    callout: g.callout ? String(g.callout).slice(0, 220) : undefined,
    actions: (g.followups || []).slice(0, 3).map((f) => ({ label: String(f).slice(0, 48), kind: `ask:${f}` })),
    note: 'Built from your live data · numbers checked against the records' };
}
export const OPEN_FOR: Record<string, string> = { inventory: '/inventory', low_stock: '/inventory', item: '/inventory', orders: '/orders', dispatch: '/operations', pipeline: '/sales', customers: '/sales', customer: '/sales', receivables: '/collections', cash: '/finance', payables: '/finance?tab=Payables', purchases: '/procurement', production: '/operations', jobwork: '/job-work', quality: '/operations', people: '/people', approvals: '/approvals', compliance: '/finance', reports: '/reports', compare: '/reports', business: '/reports' };
