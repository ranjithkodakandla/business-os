import * as D from './data';
import type { DemoState } from './store';
import { addDays, daysBetween, todayISO, inr, lakh } from './format';
import { poDraftLines, poDraftTotal, REQ } from './sourcing';

export const customerById = (s: DemoState, id: string) => s.customers.find((c) => c.id === id)!;
export const supplierById = (id: string) => D.suppliers.find((x) => x.id === id)!;
export const orderById = (s: DemoState, id: string) => s.orders.find((o) => o.id === id);
export const skuById = (s: DemoState, id: string) => s.skus.find((x) => x.sku === id);
export const orderValue = (o: D.Order) => o.items.reduce((a, i) => a + i.qty * i.rate, 0);
export const available = (k: D.Sku) => k.onHand - k.reserved;
export const isLow = (k: D.Sku) => k.reorder > 0 && available(k) < k.reorder;
export const FRIDAY = '2026-10-30';

export const outstanding = (i: D.Invoice) => i.total - i.paid;
export const overdueDays = (i: D.Invoice) => Math.max(0, daysBetween(i.due, todayISO));
export const invoiceAge = (i: D.Invoice) => daysBetween(i.issue, todayISO);
export const msmeStatus = (i: D.Invoice) => {
  const age = invoiceAge(i);
  if (outstanding(i) <= 0) return null;
  if (age > 45) return { tone: 'red' as const, text: `MSMED 45-day limit crossed (${age} days)` };
  if (age >= 38) return { tone: 'amber' as const, text: `MSMED 45-day limit in ${45 - age} days` };
  return null;
};

export const kpis = (s: DemoState) => {
  const open = s.orders.filter((o) => o.open);
  const receivables = s.invoices.reduce((a, i) => a + outstanding(i), 0);
  const overdue = s.invoices.filter((i) => outstanding(i) > 0 && overdueDays(i) > 0);
  const present = s.employees.filter((e) => e.status === 'Present' || e.status === 'Late').length;
  return {
    revenue: 2480000, revenueGrowth: 12, receivables, overdueAmt: overdue.reduce((a, i) => a + outstanding(i), 0), overdueCount: overdue.length,
    openOrders: open.length, atRisk: open.filter((o) => o.risk === 'At risk').length, recovering: open.filter((o) => o.id === 'SO-1051' && o.risk !== 'At risk').length,
    ready: open.filter((o) => o.status === 'Ready for dispatch').length, employees: s.employees.length, present,
    behind: s.workOrders.filter((w) => w.status === 'Behind').length,
  };
};

// ---- PR-208 quote evaluation ----
export const PR_QTY = 65;
export const evalQuote = (q: D.Quote) => {
  const sup = supplierById(q.supplierId);
  const material = q.unitPrice * PR_QTY;
  const taxable = material + q.freight;
  const gst = Math.round(taxable * 0.18);
  const arrival = addDays(todayISO, q.leadDays);
  return { q, sup, material, taxable, gst, total: taxable + gst, arrival, meetsFriday: arrival <= FRIDAY, landedPerUnit: Math.round(taxable / PR_QTY) };
};
export const quoteEvals = () => D.quotes.map(evalQuote);
export const RECOMMENDED = 'QT-208-C';
export const recommendation = () => {
  const ev = quoteEvals();
  const cheapest = [...ev].sort((a, b) => a.taxable - b.taxable)[0];
  const rec = ev.find((e) => e.q.id === RECOMMENDED)!;
  return {
    rec, cheapest, premium: rec.taxable - cheapest.taxable,
    reasons: [
      `Only quote that lands by Fri 30 Oct (2-day delivery) – protects the SO-1051 commitment.`,
      `Net 30 terms keep ₹${((cheapest.total) / 1e5).toFixed(1)} lakh in the bank; the cheapest quote needs 100% advance while ₹3.2 lakh is overdue from customers.`,
      `Costs ${inr(rec.taxable - cheapest.taxable)} (${(((rec.taxable - cheapest.taxable) / cheapest.taxable) * 100).toFixed(1)}%) more than the cheapest landed cost, and has the best quality record (0.2% rejection).`,
    ],
  };
};

// ---- SO-1051 economics ----
export const CONVERSION_PER_UNIT = 1120; // machining, bearings & fasteners, coating (job work), packing
export const so1051Economics = (s: DemoState) => {
  const qid = s.selectedQuote || RECOMMENDED;
  const q = D.quotes.find((x) => x.id === qid)!;
  const revenue = 780000;
  const fromStock = 35 * 4600;
  const bought = 65 * q.unitPrice + q.freight;
  const conversion = 100 * CONVERSION_PER_UNIT;
  const cost = fromStock + bought + conversion;
  const baseline = 100 * 4600 + conversion;
  const c = s.customers.find((x) => x.id === 'C01')!;
  const owed = s.invoices.filter((i) => i.customerId === 'C01').reduce((a, i) => a + outstanding(i), 0);
  const billValue = Math.round(revenue * 1.18);
  const advance = 150000;
  const exposure = owed + billValue - advance;
  return {
    q, revenue, fromStock, bought, conversion, cost, margin: revenue - cost, marginPct: ((revenue - cost) / revenue) * 100,
    plannedPct: ((revenue - baseline) / revenue) * 100, owed, billValue, advance, exposure, limit: c.creditLimit, utilisation: (exposure / c.creditLimit) * 100,
  };
};

// ---- Cash ----
export const cash = (s: DemoState) => {
  const bank = D.bank.hdfc + D.bank.cash;
  const headroom = D.bank.ccLimit - D.bank.ccUsed;
  const daily = D.bank.monthlyFixed / 30;
  const overdue = s.invoices.filter((i) => outstanding(i) > 0 && overdueDays(i) > 0).reduce((a, i) => a + outstanding(i), 0);
  const slow = s.skus.filter((k) => k.agingDays > 120).reduce((a, k) => a + k.onHand * k.unitCost, 0);
  const atJobWorkers = s.challans.reduce((a, c) => a + (c.sent - c.returned - c.scrap) * c.valuePerUnit, 0);
  const payablesWeek = s.bills.filter((b) => b.status === 'Due this week').reduce((a, b) => a + b.amount - b.paid, 0);
  return {
    bank, headroom, runwayCash: Math.round(bank / daily), runwayTotal: Math.round((bank + headroom) / daily), overdue, slow, atJobWorkers,
    stuck: overdue + slow + atJobWorkers, payablesWeek, monthlyFixed: D.bank.monthlyFixed,
  };
};

// ---- Approvals inbox ----
export type Approval = {
  agent?: string;
  id: string; kind: 'Purchase' | 'Payment' | 'Reminder' | 'Customer commitment' | 'Leave' | 'Job work' | 'Vendor message' | 'Discount' | 'Dispute' | 'Statement';
  title: string; detail: string; amount?: number; due?: string; to: string; urgent?: boolean; channel?: string;
};
export const approvals = (s: DemoState): Approval[] => {
  const r = recommendation();
  const list: Approval[] = [];
  if (!s.pr208Approved) list.push({ id: 'apr-pr208', kind: 'Purchase', title: 'PR-208 · 65 × Component A-17 for SO-1051', detail: `Recommended: ${r.rec.sup.name} · arrives Fri 30 Oct · Net 30`, amount: r.rec.total, due: 'Today 4 pm', to: '/procurement/PR-208?tab=Compare', urgent: true });
  if (s.pr208Approved && !s.po0921Sent) list.push({ id: 'apr-po-send', kind: 'Vendor message', title: 'Send PO-0921 to Prime Components', detail: 'WhatsApp + PDF to Sudheer Reddy – drafted', to: '/procurement/PR-208', urgent: true, channel: 'WhatsApp' });
  if (s.followUpPrepared && !s.supplierFollowUp) list.push({ id: 'apr-followup', kind: 'Vendor message', title: 'Supplier follow-up – confirm Friday delivery', detail: 'Prepared by Procurement agent · WhatsApp to Prime Components', to: '/procurement/PR-208', urgent: true, channel: 'WhatsApp' });
  if (s.pr208Approved && !s.splitConfirmed) list.push({ id: 'apr-split', kind: 'Customer commitment', title: 'Confirm split delivery for SO-1051', detail: '35 pcs Fri 30 Oct · 65 pcs Tue 3 Nov – message to Srinivas Rao', to: '/orders/SO-1051?tab=Dispatch', urgent: true, channel: 'WhatsApp' });
  const b = s.bills.find((x) => x.id === 'PB-0551')!;
  if (!s.approvals['apr-pay551']) list.push({ id: 'apr-pay551', kind: 'Payment', title: 'Pay Sri Venkata Steels – PB-0551', detail: 'MSME supplier · 45-day limit Fri 30 Oct · NEFT', amount: b.amount, due: 'Fri 30 Oct', to: '/finance?tab=Payables', urgent: true });
  if (!s.approvals['apr-rem1048']) list.push({ id: 'apr-rem1048', kind: 'Reminder', title: 'Payment reminder – INV-1048, Sri Lakshmi Projects', detail: '₹2.1 lakh · 12 days overdue · WhatsApp draft ready', amount: 210000, to: '/finance/INV-1048', channel: 'WhatsApp' });
  if (!s.approvals['apr-jw0709']) list.push({ id: 'apr-jw0709', kind: 'Job work', title: 'Chase Bharat Zinc Plating – DC-JW-0709', detail: '2,000 brackets 3 days late · WhatsApp draft ready', to: '/job-work?tab=Material%20out', channel: 'WhatsApp' });
  if (!s.approvals['apr-disc302']) list.push({ id: 'apr-disc302', kind: 'Discount', title: 'Aarav Interiors – 3% discount on OP-302', detail: 'Villa package ₹5.4 lakh · requested by Sneha Iyer', amount: 16200, to: '/sales/opportunity/OP-302' });
  if (!s.approvals['apr-leave']) list.push({ id: 'apr-leave', kind: 'Leave', title: 'Sick leave – Mallesh Kurma (EMP-1022)', detail: '28–29 Oct · Welding & Assembly', to: '/people?tab=Attendance' });
  if (s.sourcing.poDraft && !s.sourcing.poApproved) {
    const ls = poDraftLines(s);
    list.unshift({ id: 'apr-src-po', kind: 'Purchase', title: `PO drafts for Kaveri order (${REQ.id}) – ${ls.map((l) => `${l.o.reply.qty} × ${l.sku === 'RM-A17' ? 'A-17' : '6204'} from ${l.c.supplier}`).join(' · ')}`, detail: 'From supplier replies · nothing sent or ordered until you approve', amount: poDraftTotal(s), due: 'Today', to: '/sourcing', urgent: true });
  }
  if (s.sprint.status === 'done') {
    list.push({ id: 'apr-disc1051', kind: 'Discount', title: 'Greenfield Builders – extend 1% early-payment discount to Fri', detail: 'INV-1051 · they asked to pay Fri before 11 am instead of Thu', amount: 1620, due: 'Thu 29 Oct', to: '/collections' });
    list.push({ id: 'apr-dispute1050', kind: 'Dispute', title: 'Short-supply claim on INV-1050 – send POD + LR copy', detail: 'Aarav Interiors says 9 of 10 RA-12 received · email drafted with proof of delivery', amount: 14500, to: '/collections', urgent: true, channel: 'Email' });
    list.push({ id: 'apr-stmt1054', kind: 'Statement', title: 'Send statement of account to Kakatiya Pumps', detail: 'Requested by Swathi Reddy for the 9 Nov payment run', amount: 125000, to: '/collections', channel: 'Email' });
  }
  const by: Record<string, string> = { 'apr-src-po': 'Sourcing agent', 'apr-disc1051': 'Collections agent', 'apr-dispute1050': 'Collections agent', 'apr-stmt1054': 'Collections agent', 'apr-pr208': 'Procurement agent', 'apr-po-send': 'Procurement agent', 'apr-followup': 'Procurement agent', 'apr-split': 'Dispatch planner', 'apr-pay551': 'Compliance agent', 'apr-rem1048': 'Collections agent', 'apr-jw0709': 'Job work agent', 'apr-disc302': 'Sneha Iyer · Sales', 'apr-leave': 'Attendance agent' };
  return list.filter((a) => !s.approvals[a.id]).map((a) => ({ ...a, agent: by[a.id] }));
};

export const DRAFTS = {
  reminder1048: `Namaste Srinivas garu,\n\nThis is a gentle reminder from Aarohan Industries. Invoice INV-1048 dated 16 Sep 2026 for ₹2,10,000 (Lakshmi Residency – Tower A pump sets) was due on 16 Oct and is now 12 days overdue.\n\nUnder the MSMED Act, payment is due within 45 days of delivery (31 Oct). You can pay by UPI (aarohan@hdfcbank) or NEFT to HDFC Bank ••4821.\n\nWe are also scheduling Tower B (SO-1051) – clearing this will keep your credit line open for it.\n\nThank you,\nRiya Reddy\nAarohan Industries`,
  po0921: `Hi Sudheer garu,\n\nPlease find attached PO-0921 for 65 pcs Component A-17 (cast aluminium housing) at ₹4,910/pc + freight ₹4,500 + GST, against your quote PC/QTN/1042.\n\nDelivery: Fri 30 Oct by 10 am at Jeedimetla Plant, Gate 2.\nPayment: Net 30.\nPlease confirm dispatch time and vehicle number.\n\nRegards,\nRiya Reddy, Aarohan Industries`,
  supplierFollowUp: (approved: boolean) => approved
    ? `Hi Sudheer garu,\n\nFollowing up on PO-0921 (65 pcs Component A-17). Can you confirm the castings will reach our Jeedimetla plant by 10 am this Friday, 30 Oct? Our customer delivery for Tower B depends on it.\n\nPlease share the vehicle number and e-way bill once dispatched.\n\nThanks,\nRiya – Aarohan Industries`
    : `Hi Sudheer garu,\n\nThank you for quote PC/QTN/1042. We plan to order 65 pcs Component A-17 at ₹4,910/pc. Can you confirm delivery at our Jeedimetla plant by 10 am Fri 30 Oct if we release the PO today?\n\nThanks,\nRiya – Aarohan Industries`,
  split: `Namaste Srinivas garu,\n\nUpdate on your order SO-1051 (100 PHA-17 pump housing assemblies, Tower B).\n\nWe can deliver 35 units this Friday, 30 Oct, and the balance 65 units on Tue 3 Nov – our casting supplier delivers the extra housings on Friday.\n\nIs a split delivery OK for your site team? Please reply to confirm.\n\nRegards,\nRiya Reddy, Aarohan Industries`,
  jw0709: `Hi Ayub bhai,\n\nOur 2,000 MB-22 brackets (DC-JW-0709, sent 15 Oct) were due back on 25 Oct. Please share today when they will be ready – we need at least 800 by Saturday.\n\nThanks,\nHarish – Aarohan Industries`,
};

export const lakhStr = lakh;

// ---- Background agents ----
export type AgentDef = {
  id: string; name: string; watches: string; defaultAutonomy: 'Suggest only' | 'Prepare for approval' | 'Auto within limits'; guardrail: string; lastRun: string; next: string;
  icon: 'collections' | 'sourcing' | 'procurement' | 'jobwork' | 'dispatch' | 'compliance' | 'attendance' | 'books';
  log: { at: string; text: string; to?: string; state: 'awaiting' | 'done' | 'auto' | 'info' }[];
};
export const AGENTS: AgentDef[] = [
  { id: 'collections', name: 'Collections', icon: 'collections', watches: 'Customer invoices, due dates, PDCs, credit limits', defaultAutonomy: 'Auto within limits', guardrail: 'Auto-sends polite reminders only under ₹50,000 and after 7 days overdue. Anything larger waits for you. Never changes amounts or terms.', lastRun: '06:00', next: 'Tomorrow 06:00', log: [
    { at: '06:00', text: 'Drafted WhatsApp reminder for INV-1048 (₹2.1 lakh, 12 days overdue)', to: '/finance/INV-1048', state: 'awaiting' },
    { at: '06:00', text: 'Sent reminder for INV-1044 (₹42,000) – within the ₹50k auto limit', to: '/finance/INV-1044', state: 'auto' },
    { at: '06:00', text: 'Skipped INV-1041 – post-dated cheque 004512 (5 Nov) on hand', to: '/finance/INV-1041', state: 'info' },
  ] },
  { id: 'procurement', name: 'Procurement', icon: 'procurement', watches: 'Order material needs vs stock, reorder levels, supplier quotes', defaultAutonomy: 'Prepare for approval', guardrail: 'Can raise purchase requests and collect quotes. Never releases a PO or pays a supplier without your approval.', lastRun: '08:40', next: 'On every new order', log: [
    { at: '08:40', text: 'Collected 3 quotes for PR-208 and recommended Prime Components', to: '/procurement/PR-208?tab=Compare', state: 'awaiting' },
    { at: 'Yesterday 18:10', text: 'Spotted 65 × A-17 shortfall on SO-1051 and raised PR-208', to: '/procurement/PR-208', state: 'done' },
    { at: 'Yesterday 18:10', text: 'Flagged PO-0912 (Sri Venkata Steels) – delivery not confirmed', to: '/procurement?tab=Purchase%20orders', state: 'info' },
  ] },
  { id: 'sourcing', name: 'Sourcing', icon: 'sourcing', watches: 'Shortfalls on new orders, supplier contacts and their preferred channels', defaultAutonomy: 'Prepare for approval', guardrail: 'Sends availability enquiries only after you approve them. Never accepts a price or places an order. Calls are announced as automated.', lastRun: 'Yesterday 17:30', next: 'On every new order', log: [
    { at: 'Yesterday 17:30', text: 'Supplier contacts refreshed – lead times and on-time % updated from GRNs', to: '/suppliers', state: 'info' },
  ] },
  { id: 'jobwork', name: 'Job work', icon: 'jobwork', watches: 'Challans to job workers, pending returns, ITC-04 limits', defaultAutonomy: 'Prepare for approval', guardrail: 'Drafts chasers to job workers. Never raises a challan or e-way bill on its own.', lastRun: '07:30', next: 'Daily 07:30', log: [
    { at: '07:30', text: 'DC-JW-0709 is 3 days late – chaser drafted for Bharat Zinc Plating', to: '/job-work?tab=Material%20out', state: 'awaiting' },
    { at: '07:30', text: '₹4.0 lakh of material is with 4 job workers', to: '/job-work', state: 'info' },
  ] },
  { id: 'dispatch', name: 'Dispatch planner', icon: 'dispatch', watches: 'Ready orders, vehicles, transporters, e-way bills', defaultAutonomy: 'Prepare for approval', guardrail: 'Plans loads and drafts e-way bill data. You generate the e-way bill on the portal.', lastRun: '07:45', next: 'Daily 17:00', log: [
    { at: '07:45', text: 'Prepared Thursday’s plan: 2 loads, 2 e-way bills drafted', to: '/operations?tab=Dispatch%20plan', state: 'done' },
  ] },
  { id: 'compliance', name: 'Compliance', icon: 'compliance', watches: 'GSTR-1/3B, TDS, PF/ESI, MSME 45-day (43B(h)), e-invoice applicability', defaultAutonomy: 'Suggest only', guardrail: 'Only reminds and prepares drafts. Never files a return.', lastRun: '05:30', next: 'Daily 05:30', log: [
    { at: '05:30', text: 'PB-0551 to an MSME supplier must be paid by Fri 30 Oct (43B(h))', to: '/finance?tab=Payables', state: 'awaiting' },
    { at: '05:30', text: 'GSTR-1 draft ready – 46 invoices; e-invoice not needed (turnover below ₹5 Cr)', to: '/finance?tab=GST%20%26%20compliance', state: 'info' },
  ] },
  { id: 'attendance', name: 'Attendance', icon: 'attendance', watches: 'Biometric punches, shifts, leave requests, contract labour', defaultAutonomy: 'Auto within limits', guardrail: 'Marks attendance from punches automatically. Leave approvals and shift changes always need you.', lastRun: '09:12', next: 'Every 30 min', log: [
    { at: '09:12', text: 'Synced biometric (Gate 1): 42 of 45 present, 3 exceptions flagged', to: '/people?tab=Attendance', state: 'auto' },
    { at: '09:12', text: 'Sick-leave request from Mallesh Kurma needs approval', to: '/people?tab=Attendance', state: 'awaiting' },
  ] },
  { id: 'books', name: 'Books sync', icon: 'books', watches: 'Tally vouchers, bank statement (HDFC ••4821)', defaultAutonomy: 'Auto within limits', guardrail: 'Read-only import. Mismatches are flagged, never auto-corrected.', lastRun: '02:00', next: 'Daily 02:00', log: [
    { at: '02:00', text: 'Synced 124 vouchers from Tally; 2 bank entries need matching', to: '/finance?tab=Cash', state: 'auto' },
  ] },
];
