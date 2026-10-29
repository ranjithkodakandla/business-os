import type { DemoState } from './store';
import { cash, customerById, evalQuote, kpis, outstanding, overdueDays, recommendation, so1051Economics, supplierById, available } from './domain';
import { compliance, dispatchPlan, jobWorkers, quotes } from './data';
import { inr, lakh, fmtShort } from './format';
import { isLiveQuery } from './live';
import { stockCheck, REQ, OPTIONS, contactOf, channelLabel } from './sourcing';
import { SPRINT, RECEIVED, expected } from './sprint';
import { bank } from './data';

export type Block =
  | { type: 'text'; text: string }
  | { type: 'md'; text: string; at?: number }
  | { type: 'facts'; items: { label: string; value: string; tone?: 'green' | 'amber' | 'red' | 'blue'; to?: string }[] }
  | { type: 'table'; cols: string[]; rows: string[][]; align?: ('l' | 'r')[] }
  | { type: 'steps'; title: string; items: string[] }
  | { type: 'live'; text: string }
  | { type: 'data'; r: import('./dataAgent').Result };
// (live outreach cards are separate chat messages – see OutreachLive)
export type Action = { label: string; kind: string; primary?: boolean };
export type Resp = { title: string; blocks: Block[]; sources: { label: string; to: string }[]; actions: Action[]; links: { label: string; to: string }[] };

export const EXAMPLES = [
  'I need 500 kg MS sheet 2mm by Friday, do we have it?',
  'Need a 10-ton truck from Hyderabad to Pune on Friday',
  'Need 50 litres cutting oil, best price',
  'Why are two orders at risk?',
  'Which customers owe us the most?',
  "Find suppliers for the material we're short of.",
  "Prepare tomorrow's dispatch plan.",
];
export const SOURCING_PROMPT = 'Kaveri Engineering needs 150 PHA-17 pump housings by 12 Nov – check stock and source what’s short';
export const SPRINT_PROMPT = 'Get me ₹5 lakh in by Friday';
const parseAmount = (q: string) => {
  const cr = q.match(/(\d+(?:\.\d+)?)\s*(crore|cr\b)/); if (cr) return parseFloat(cr[1]) * 1e7;
  const l = q.match(/(\d+(?:\.\d+)?)\s*(lakh|lakhs|lac|l\b)/); if (l) return parseFloat(l[1]) * 1e5;
  const r = q.match(/(?:₹|rs\.?)\s*([\d,]+)/); if (r) return parseInt(r[1].replace(/,/g, ''), 10);
  return 500000;
};

export function respond(raw: string, s: DemoState): Resp {
  const q = raw.toLowerCase();
  const k = kpis(s);
  const so = s.orders.find((o) => o.id === 'SO-1051')!;
  const sku = s.skus.find((x) => x.sku === 'RM-A17')!;
  const rec = recommendation();
  const approved = s.pr208Approved;

  if (isLiveQuery(raw)) {
    return { title: 'Checking live stock and your suppliers', blocks: [{ type: 'live', text: raw }], sources: [{ label: 'Inventory · live stock', to: '/inventory' }, { label: 'Supplier contacts', to: '/suppliers' }], actions: [], links: [{ label: 'Open sourcing agent', to: '/sourcing/live' }] };
  }
  if (/kaveri|new (sale )?order|(need|needs|want|wants) \d+/.test(q)) {
    const rows = stockCheck(s);
    const shorts = rows.filter((r) => r.short > 0);
    const plan = OPTIONS.map((o) => { const c = contactOf(s, o.contactId); return `${c.supplier} (${channelLabel(c.channel)}${c.channel === 'Call' ? `, ${c.language.split(',')[0]}` : ''})`; });
    const st = s.sourcing.status;
    return {
      title: `Stock covers ${rows.length - shorts.length} of ${rows.length} parts. Short: ${shorts.map((r) => `${r.short} × ${r.label}`).join(' and ')}`,
      blocks: [
        { type: 'text', text: `For **${REQ.qty} × PHA-17** for ${REQ.customer} by **${fmtShort(REQ.due)}**, parts must be in stores by **${fmtShort(REQ.inStoresBy)}** (machining, powder coating at the job worker, QC and packing). Stock check, live from Inventory:` },
        { type: 'table', cols: ['Part', 'Need', 'On hand', 'Reserved', 'Free', 'Short'], align: ['l', 'r', 'r', 'r', 'r', 'r'], rows: rows.map((r) => [`${r.sku} · ${r.label}`, `${r.need} ${r.unit}`, String(r.onHand), String(r.reserved + r.committed) + (r.committed ? ' (incl. 35 for SO-1051)' : ''), String(r.free), r.short ? `${r.short} → buy ${r.buy}` : 'OK']) },
        { type: 'facts', items: [
          { label: 'A-17 housings', value: `0 free – the 35 left are committed to SO-1051 and PO-0921 is for SO-1051 too`, tone: 'red' },
          { label: 'Bearings 6204-2RS', value: `232 free vs 300 needed – buy a box of 100`, tone: 'amber' },
          { label: 'Sourcing agent plan', value: `Ask ${plan.length} suppliers on their preferred channel: ${plan.join(', ')}`, tone: 'blue', to: '/suppliers' },
        ] },
        { type: 'text', text: st === 'idle' ? 'Each enquiry asks: do you have it, how many, by when can you ship, and at what price. No price is accepted and no order is placed without you.' : st === 'running' ? 'Outreach is already running – replies are coming in below.' : 'Outreach is done – open **SRC-0031** for the top 3 options per part.' },
      ],
      sources: [{ label: 'Inventory · live stock', to: '/inventory' }, { label: 'Supplier contacts', to: '/suppliers' }],
      actions: st === 'idle' ? [{ label: `Approve & send ${plan.length} enquiries`, kind: 'start-sourcing', primary: true }] : [{ label: 'Open sourcing results', kind: 'open:/sourcing', primary: true }],
      links: [{ label: 'Supplier contacts', to: '/suppliers' }, { label: 'RM-A17 stock', to: '/inventory/RM-A17' }],
    };
  }

  if (/(get|bring|collect|raise|need).*(₹|rs\.?|lakh|lac|crore|\d).*(friday|\bfri\b|this week)|collections? sprint/.test(q)) {
    const asked = parseAmount(q);
    const total = s.invoices.reduce((a, i) => a + outstanding(i), 0);
    const overdue = s.invoices.filter((i) => outstanding(i) > 0 && overdueDays(i) > 0).reduce((a, i) => a + outstanding(i), 0);
    const tooMuch = asked > total;
    const target = tooMuch ? 500000 : asked;
    const exp = expected();
    return {
      title: tooMuch ? `${lakh(asked)} isn’t possible by Friday – customers owe ${lakh(total)} in total. Here is a realistic ${lakh(target)} plan` : `A plan for ${lakh(target)} by Fri 30 Oct: 6 customers, about ${lakh(exp)} likely`,
      blocks: [
        { type: 'text', text: `Customers owe **${lakh(total)}**; **${lakh(overdue)}** is overdue. I ranked accounts by likelihood to pay this week × amount, using payment history, credit days, past promises and the 43B(h) angle.` },
        { type: 'table', cols: ['#', 'Customer', 'Invoice', 'Amount', 'Why', 'Channel', 'Likely'], align: ['l', 'l', 'l', 'r', 'l', 'l', 'r'], rows: SPRINT.map((r) => [String(r.rank), r.customer, r.invoice, inr(r.amount), r.why, channelLabel(r.channel), `${r.likelihood}%`]) },
        { type: 'facts', items: [
          { label: '43B(h) leverage', value: 'You are a registered small enterprise (UDYAM-TS-02-0045671). Buyers who pay you after 45 days lose the deduction until they pay – INV-1048 hits 45 days on 31 Oct; INV-1041 crossed it on 16 Oct.', tone: 'blue' },
          { label: 'Discount in plan', value: '1% early-payment discount (₹1,620) for Greenfield Builders, only if paid by Thu 29 Oct', tone: 'amber' },
          { label: 'Already chased', value: `${RECEIVED.customer} ${RECEIVED.invoice} ₹42,000 – reminded automatically yesterday (under the ₹50k auto-limit)`, tone: 'green' },
          ...(tooMuch ? [{ label: 'To raise more', value: `CC limit headroom ${lakh(bank.ccLimit - bank.ccUsed)} · slow-moving stock ₹2.6 lakh – ask me about cash options`, tone: 'amber' as const }] : []),
        ] },
        { type: 'text', text: s.sprint.status === 'idle' ? 'These amounts are above the ₹50,000 auto-limit, so the messages and calls wait for your approval.' : 'The sprint is already running – open the **Collections sprint** board for promises and replies.' },
      ],
      sources: [{ label: 'Receivables', to: '/finance?tab=Receivables' }, { label: 'Payment history', to: '/finance/INV-1048' }],
      actions: s.sprint.status === 'idle' ? [{ label: 'Approve plan & contact 6 customers', kind: `start-sprint:${target}`, primary: true }] : [{ label: 'Open collections sprint', kind: 'open:/collections', primary: true }],
      links: [{ label: 'Collections sprint', to: '/collections' }, { label: 'Receivables', to: '/finance?tab=Receivables' }],
    };
  }

  if (/(deliver|ship|make it|on time).*(1051|friday)|1051.*(friday|deliver|on time)/.test(q)) {
    const e = so1051Economics(s);
    return {
      title: approved ? 'Partly – 35 units on Friday, the other 65 by Tue 3 Nov' : 'Not all 100 by Friday. 35 can go Friday, and the rest by Tue 3 Nov if you approve PR-208 today',
      blocks: [
        { type: 'text', text: `SO-1051 promises 100 PHA-17 pump housing assemblies to Sri Lakshmi Projects on **Fri 30 Oct**. Here is what the records show:` },
        { type: 'facts', items: [
          { label: 'Order · SO-1051', value: `100 units, ${inr(780000)} + GST, due Fri 30 Oct. ${inr(150000)} advance received.`, to: '/orders/SO-1051' },
          { label: 'Inventory · RM-A17', value: `${available(sku)} of 100 A-17 housings available (53 on hand, 18 reserved for SO-1047 and SO-1052). Shortfall 65.${sku.incoming ? ` 65 incoming on PO-0921.` : ''}`, tone: 'amber', to: '/inventory/RM-A17' },
          { label: 'Procurement · PR-208', value: approved ? `Approved. PO-0921 to ${e.q.id === 'QT-208-C' ? 'Prime Components' : supplierById(quotes.find((x) => x.id === e.q.id)!.supplierId).name}, arriving ${fmtShort(evalQuote(e.q).arrival)}.${s.po0921Sent ? ' PO sent.' : ' PO not sent yet.'}` : `3 quotes in. Only Prime Components (2-day delivery) lands by Fri 30 Oct. The PO is not approved yet – the supplier needs it by 4 pm today.`, tone: approved ? 'green' : 'red', to: '/procurement/PR-208?tab=Compare' },
          { label: 'Operations · WO-3321 → WO-3324', value: approved ? 'Split plan: lot 1 (35) machining today, coated Thu, dispatched Fri. Lot 2 (65) machined Sat, coated Mon, dispatched Tue 3 Nov.' : 'Machining is blocked. Powder coating is done by a job worker (Sri Venkateswara Powder Coaters) and adds 1 day.', tone: approved ? 'green' : 'amber', to: '/operations?order=SO-1051' },
          { label: 'Finance · Sri Lakshmi Projects', value: `${lakh(e.owed)} already overdue (INV-1048). After this order, they would use ${e.utilisation.toFixed(0)}% of their ${lakh(e.limit)} credit limit. Expected margin ${e.marginPct.toFixed(1)}%.`, tone: 'amber', to: '/finance/INV-1048' },
        ] },
        { type: 'steps', title: 'Suggested next steps', items: [
          ...(approved ? [] : ['Approve PR-208 with Prime Components before 4 pm (₹3.82 lakh incl. GST, Net 30).']),
          'Dispatch 35 units on Friday from stock and the balance 65 on Tue 3 Nov.',
          'Confirm the split delivery with Srinivas Rao on WhatsApp.',
          'Ask for INV-1048 (₹2.1 lakh) to be paid before the second dispatch.',
        ] },
      ],
      sources: [{ label: 'SO-1051', to: '/orders/SO-1051' }, { label: 'RM-A17', to: '/inventory/RM-A17' }, { label: 'PR-208', to: '/procurement/PR-208' }, { label: 'WO-3321', to: '/operations?order=SO-1051' }, { label: 'INV-1048', to: '/finance/INV-1048' }],
      actions: [
        ...(approved ? [] : [{ label: 'Review & approve PR-208', kind: 'approve-pr208', primary: true }]),
        { label: 'Ask Procurement to confirm Friday delivery', kind: 'handoff-followup', primary: approved },
        ...(s.splitConfirmed ? [] : [{ label: 'Draft split-delivery message', kind: 'split' }]),
      ],
      links: [{ label: 'Open SO-1051', to: '/orders/SO-1051' }, { label: 'Production plan', to: '/operations?order=SO-1051' }],
    };
  }

  if (/(at risk|risk|delayed|late order)/.test(q)) {
    const po = s.pos.find((p) => p.id === 'PO-0912')!;
    return {
      title: `${k.atRisk} order${k.atRisk === 1 ? ' is' : 's are'} at risk, both because material is short`,
      blocks: [
        { type: 'facts', items: [
          { label: 'SO-1051 · Sri Lakshmi Projects · due Fri 30 Oct', value: approved ? 'Shortfall now covered by PO-0921. Split delivery proposed.' : `Needs 100 × Component A-17, only ${available(sku)} available. 65 short. PR-208 has 3 quotes, but no supplier is confirmed yet.`, tone: approved ? 'green' : 'red', to: '/orders/SO-1051' },
          { label: 'SO-1049 · Greenfield Builders · due Sat 31 Oct', value: po.confirmed ? 'Sri Venkata Steels confirmed the 40 MS plates for Fri 30 Oct.' : '20 of 32 MS plates (5 mm) in stock. PO-0912 to Sri Venkata Steels is due 31 Oct, the same day as delivery, and the supplier has not confirmed.', tone: po.confirmed ? 'green' : 'red', to: '/orders/SO-1049' },
        ] },
        { type: 'text', text: `Also watch **SO-1046** (Aarav Interiors): welding is behind schedule on WO-3317 after a TIG welder repair. It is not at risk yet, since delivery is Tue 3 Nov.` },
      ],
      sources: [{ label: 'SO-1051', to: '/orders/SO-1051' }, { label: 'SO-1049', to: '/orders/SO-1049' }, { label: 'PR-208', to: '/procurement/PR-208' }, { label: 'PO-0912', to: '/procurement?tab=Purchase%20orders' }],
      actions: [
        ...(approved ? [] : [{ label: 'Review quotes for PR-208', kind: 'open:/procurement/PR-208?tab=Compare', primary: true }]),
        ...(po.confirmed ? [] : [{ label: 'Ask Procurement to chase Sri Venkata Steels', kind: 'handoff-po0912' }]),
      ],
      links: [{ label: 'Open SO-1051', to: '/orders/SO-1051' }, { label: 'Inventory A-17', to: '/inventory/RM-A17' }, { label: 'Supplier quotes', to: '/procurement/PR-208?tab=Compare' }],
    };
  }

  if (/(owe|receivable|outstanding|debtor|collect)/.test(q)) {
    const byCust = new Map<string, { amt: number; od: number; inv: string[] }>();
    s.invoices.filter((i) => outstanding(i) > 0).forEach((i) => {
      const r = byCust.get(i.customerId) || { amt: 0, od: 0, inv: [] };
      r.amt += outstanding(i); r.od = Math.max(r.od, overdueDays(i)); r.inv.push(i.id); byCust.set(i.customerId, r);
    });
    const rows = [...byCust.entries()].sort((a, b) => b[1].amt - a[1].amt).map(([cid, r]) => {
      const c = customerById(s, cid);
      return [c.name, r.inv.join(', '), inr(r.amt), r.od ? `${r.od} days overdue` : 'Not due', `${c.creditDays} days`];
    });
    return {
      title: `Customers owe you ${lakh(k.receivables)}. ${lakh(k.overdueAmt)} of it is overdue`,
      blocks: [
        { type: 'table', cols: ['Customer', 'Invoices', 'Outstanding', 'Status', 'Credit terms'], rows, align: ['l', 'l', 'r', 'l', 'l'] },
        { type: 'text', text: `**Sri Lakshmi Projects** is the biggest. INV-1048 for ₹2.1 lakh is 12 days overdue and hits the MSMED 45-day limit on 31 Oct. Collections already reminded **Deccan Electricals** automatically (under ₹50k), and **Vasavi Constructions** has given a post-dated cheque for 5 Nov.` },
      ],
      sources: [{ label: 'Receivables', to: '/finance?tab=Receivables' }, { label: 'INV-1048', to: '/finance/INV-1048' }, { label: 'INV-1041', to: '/finance/INV-1041' }],
      actions: s.approvals['apr-rem1048'] ? [] : [{ label: 'Review reminder for INV-1048', kind: 'reminder1048', primary: true }],
      links: [{ label: 'Receivables ageing', to: '/finance?tab=Receivables' }],
    };
  }

  if (/(supplier|vendor|short of|shortage|source|quote)/.test(q) && !/raise|place|create/.test(q)) {
    const ev = quotes.map(evalQuote);
    return {
      title: 'You are short of Component A-17 (65 units). Three suppliers have quoted',
      blocks: [
        { type: 'table', cols: ['Supplier', 'Unit price', 'Landed (65 units)', 'Arrives', 'Terms', 'Quality'], rows: ev.map((e) => [e.sup.name + (e.sup.interstate ? ' (IGST)' : ''), inr(e.q.unitPrice), inr(e.taxable), fmtShort(e.arrival) + (e.meetsFriday ? ' ✓' : ''), e.q.terms, e.q.quality]), align: ['l', 'r', 'r', 'l', 'l', 'l'] },
        { type: 'text', text: `**Recommended: Prime Components.** It is the only quote that lands by Friday, and Net 30 terms protect cash. It costs ${inr(rec.premium)} more than the cheapest landed price, which needs 100% advance.` },
        { type: 'text', text: 'MS plate 5 mm for SO-1049 is also short by 12 sheets. That is already on PO-0912 with Sri Venkata Steels, awaiting confirmation.' },
      ],
      sources: [{ label: 'PR-208', to: '/procurement/PR-208' }, { label: 'RM-A17', to: '/inventory/RM-A17' }, { label: 'PO-0912', to: '/procurement?tab=Purchase%20orders' }],
      actions: [
        ...(approved ? [] : [{ label: 'Review & approve recommended quote', kind: 'approve-pr208', primary: true }]),
        { label: 'Ask Procurement for a faster quote from Deccan Castings', kind: 'handoff-requote' },
      ],
      links: [{ label: 'Compare quotes', to: '/procurement/PR-208?tab=Compare' }],
    };
  }

  if (/(raise|place|create|issue).*(po|purchase order)|best quote/.test(q)) {
    return {
      title: approved ? 'PO-0921 is already raised for the shortfall' : 'PO for 65 × A-17 from Prime Components is ready for your approval',
      blocks: [
        { type: 'facts', items: [
          { label: 'Shortfall', value: '65 × Component A-17 for SO-1051 (PR-208)', to: '/procurement/PR-208' },
          { label: 'Best quote', value: `Prime Components · ₹4,910/unit + ₹4,500 freight = ${inr(rec.rec.taxable)} + GST ${inr(rec.rec.gst)} → ${inr(rec.rec.total)}`, tone: 'green' },
          { label: 'Why', value: 'Arrives Fri 30 Oct · Net 30 · 0.2% rejection history' },
          { label: 'Status', value: approved ? (s.po0921Sent ? 'PO-0921 approved and sent' : 'PO-0921 approved – not sent yet') : 'Draft. Nothing is placed until you approve.', tone: approved ? 'green' : 'amber' },
        ] },
      ],
      sources: [{ label: 'PR-208', to: '/procurement/PR-208?tab=Compare' }, { label: 'QT-208-C', to: '/procurement/PR-208?tab=Quotes' }],
      actions: approved ? (s.po0921Sent ? [] : [{ label: 'Review & send PO-0921', kind: 'send-po', primary: true }]) : [{ label: 'Review & approve PO', kind: 'approve-pr208', primary: true }],
      links: [{ label: 'Open PR-208', to: '/procurement/PR-208' }],
    };
  }

  if (/(dispatch|tomorrow|e-way|eway|truck|vehicle)/.test(q)) {
    const tmr = dispatchPlan.filter((d) => d.date === '2026-10-29');
    return {
      title: 'Thursday 29 Oct: 2 loads ready to go',
      blocks: [
        { type: 'table', cols: ['Slot', 'Order', 'Customer', 'Load', 'Vehicle', 'E-way bill'], rows: tmr.map((d) => [d.slot, d.order, d.customer, d.qty, `${d.vehicle} · ${d.transporter}`, d.eway]) },
        { type: 'text', text: 'Both orders are packed and have passed QC. Shree Balaji Traders (Bengaluru) is an inter-state supply, so it is billed with IGST and needs its e-way bill before loading. Friday has SO-1043 and SO-1050 on vehicle TS 08 UB 4521, plus the first 35 units of SO-1051 if you approve PR-208.' },
      ],
      sources: [{ label: 'Dispatch plan', to: '/operations?tab=Dispatch%20plan' }, { label: 'SO-1044', to: '/orders/SO-1044' }, { label: 'SO-1048', to: '/orders/SO-1048' }],
      actions: [{ label: 'Ask Dispatch planner to prepare e-way bill data', kind: 'handoff-eway', primary: true }],
      links: [{ label: 'Open dispatch plan', to: '/operations?tab=Dispatch%20plan' }],
    };
  }

  if (/(cash|runway|money stuck|stuck|bank|liquid)/.test(q)) {
    const c = cash(s);
    return {
      title: `${lakh(c.bank)} in the bank, about ${c.runwayCash} days of fixed costs (${c.runwayTotal} days with the CC limit)`,
      blocks: [
        { type: 'facts', items: [
          { label: 'Money stuck', value: `${lakh(c.stuck)}: ${lakh(c.overdue)} overdue from customers, ${lakh(c.atJobWorkers)} of material with job workers, and ${lakh(c.slow)} of stock unsold for 120+ days`, tone: 'amber' },
          { label: 'Going out this week', value: `${lakh(c.payablesWeek)} in supplier bills, including ₹1.84 lakh to Sri Venkata Steels (MSME, 45-day limit Fri 30 Oct)`, to: '/finance?tab=Payables' },
          { label: 'Monthly fixed costs', value: `${lakh(c.monthlyFixed)} (wages, rent, power)` },
        ] },
        { type: 'text', text: 'Collecting INV-1048 alone would add about 6 days of runway.' },
      ],
      sources: [{ label: 'Cash', to: '/finance?tab=Cash' }, { label: 'Receivables', to: '/finance?tab=Receivables' }, { label: 'Job work', to: '/job-work' }],
      actions: [], links: [{ label: 'Open cash view', to: '/finance?tab=Cash' }],
    };
  }

  if (/(job ?work|job worker|subcontract|outsourc|pending return|itc-04|coater|plating)/.test(q)) {
    const rows = s.challans.filter((c) => c.sent - c.returned - c.scrap > 0).map((c) => [c.id, jobWorkers.find((j) => j.id === c.workerId)!.name, c.item, `${c.sent - c.returned - c.scrap} ${c.unit}`, fmtShort(c.expected), c.status]);
    return {
      title: `${rows.length} job-work challans have material pending return`,
      blocks: [
        { type: 'table', cols: ['Challan', 'Job worker', 'Material', 'Pending', 'Due back', 'Status'], rows },
        { type: 'text', text: 'Bharat Zinc Plating is 3 days late on 2,000 brackets, and a chaser is drafted for your approval. Every challan is within the ITC-04 time limits (1 year for inputs, 3 years for capital goods).' },
      ],
      sources: [{ label: 'Job work', to: '/job-work' }], actions: s.approvals['apr-jw0709'] ? [] : [{ label: 'Review chaser to Bharat Zinc Plating', kind: 'chase-jw', primary: true }], links: [{ label: 'Open job work', to: '/job-work' }],
    };
  }

  if (/(gst|gstr|tds|compliance|filing|43b|e-invoice)/.test(q)) {
    return {
      title: 'Next compliance dates',
      blocks: [{ type: 'table', cols: ['Return', 'Due', 'Status'], rows: compliance.map((c) => [c.name, fmtShort(c.due), c.status]) }, { type: 'text', text: 'E-invoicing does not apply, because turnover is below ₹5 crore. Under 43B(h), pay PB-0551 (MSME supplier) by 30 Oct.' }],
      sources: [{ label: 'GST & compliance', to: '/finance?tab=GST%20%26%20compliance' }], actions: [], links: [{ label: 'Open compliance', to: '/finance?tab=GST%20%26%20compliance' }],
    };
  }

  if (/(attendance|absent|present|leave|staff|employee)/.test(q)) {
    const ex = s.employees.filter((e) => e.status !== 'Present' || e.exception);
    return {
      title: `${k.present} of ${k.employees} people are in today`,
      blocks: [{ type: 'table', cols: ['Employee', 'Team', 'Type', 'Status', 'Note'], rows: ex.map((e) => [e.name, e.team, e.type, e.status, e.exception || e.leave]) }],
      sources: [{ label: 'Attendance', to: '/people?tab=Attendance' }], actions: [], links: [{ label: 'Open attendance', to: '/people?tab=Attendance' }],
    };
  }

  if (/(1048|sri lakshmi)/.test(q)) {
    return {
      title: 'INV-1048: ₹2.1 lakh, 12 days overdue',
      blocks: [{ type: 'text', text: 'Issued 16 Sep for the Tower A pump sets (SO-1039), and due 16 Oct. They promised payment "next week" on 22 Oct. The MSMED 45-day limit falls on 31 Oct.' }],
      sources: [{ label: 'INV-1048', to: '/finance/INV-1048' }], actions: s.approvals['apr-rem1048'] ? [] : [{ label: 'Review reminder', kind: 'reminder1048', primary: true }], links: [{ label: 'Open invoice', to: '/finance/INV-1048' }],
    };
  }

  return {
    title: 'Here is what I can help with',
    blocks: [{ type: 'text', text: 'Ask about orders, stock, suppliers, job work, people, cash or compliance. You can also ask me to prepare work, like a reminder, a PO or a dispatch plan, and it will wait in Approvals for you.' }],
    sources: [], actions: [], links: [{ label: 'Approvals inbox', to: '/approvals' }, { label: 'Orders', to: '/orders' }, { label: 'Finance', to: '/finance' }],
  };
}
