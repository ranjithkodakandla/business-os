/** Seed data for the P0 modules (settings, payroll, inbox, GST, attendance, audit). Fictional Aarohan Industries data. */
import { employees, invoices, customers } from './data';
const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export type Ticket = { id: string; customer: string; channel: 'WhatsApp' | 'Email' | 'Group' | 'Call'; subject: string; kind: 'Complaint' | 'Query' | 'Order' | 'Payment'; priority: 'High' | 'Medium' | 'Low'; status: 'Open' | 'In progress' | 'Waiting on customer' | 'Resolved'; owner: string; opened: string; slaHrs: number; ageHrs: number; order?: string; invoice?: string; capa?: string; csat?: number; thread: { at: string; from: string; text: string; ch?: string }[] };
export type PayLine = { emp: string; name: string; team: string; gross: number; basic: number; days: number; lop: number; ot: number; pf: number; esi: number; pt: number; lwf: number; tds: number; advance: number; net: number; bank: string };
export type Advance = { id: string; emp: string; name: string; amount: number; months: number; recovered: number; date: string; status: 'Active' | 'Closed' | 'Pending approval' };
export type EInv = { inv: string; customer: string; amount: number; irn: 'Generated' | 'Pending' | 'Failed' | 'Not required'; irnNo?: string; ewb?: string; ewbValid?: string; vehicle?: string; km?: number; ewbStatus: 'Active' | 'Expiring' | 'Expired' | 'Not generated' };
export type Leave = { id: string; emp: string; name: string; type: string; from: string; to: string; days: number; status: 'Pending' | 'Approved' | 'Rejected'; reason: string };
export type User = { id: string; name: string; email: string; role: string; unit: string; status: 'Active' | 'Invited' };
export type Band = { id: string; doc: string; min: number; max: number | null; approver: string };
export type P0 = {
  users: User[]; bands: Band[]; series: { doc: string; prefix: string; next: number }[]; branches: { name: string; gstin: string; addr: string; head: string }[];
  payrun: { month: string; status: 'Draft' | 'Approved' | 'Paid'; lines: PayLine[]; payslipsSent?: boolean; bankFile?: boolean };
  advances: Advance[]; tickets: Ticket[]; einv: EInv[]; leaves: Leave[]; ot: { emp: string; name: string; date: string; hrs: number; approved: boolean }[];
  contractors: { agency: string; heads: number; present: number; rate: number }[];
  fnf: { emp: string; name: string; lwd: string; amount: number; status: string }[];
};
export const salaryOf = (role: string) => /director/i.test(role) ? 250000 : /head|manager/i.test(role) ? 85000 : /lead|supervisor|in-charge|senior|accountant/i.test(role) ? 42000 : /engineer|executive|inspector|machinist|welder|operator|planner/i.test(role) ? 24000 : 16500;
export const payLine = (e: { id: string; name: string; team: string; role: string; status: string }, extraAdv = 0): PayLine => {
  const gross = salaryOf(e.role), basic = Math.round(gross * 0.5), x = h(e.name);
  const lop = e.status === 'Absent' ? 1 : x % 9 === 0 ? 2 : 0, days = 26 - lop, ot = /welder|machinist|operator|helper/i.test(e.role) ? (x % 6) * 2 : 0;
  const earned = Math.round(gross * days / 26) + ot * Math.round(gross / 26 / 8 * 2);
  const pf = Math.round(Math.min(basic, 15000) * 0.12), esi = gross <= 21000 ? Math.round(earned * 0.0075) : 0, pt = gross > 20000 ? 200 : gross > 15000 ? 150 : 0, lwf = 2;
  const tds = gross > 80000 ? Math.round((gross * 12 - 1200000) > 0 ? (gross * 12 - 1200000) * 0.1 / 12 : 0) : 0;
  const advance = extraAdv;
  return { emp: e.id, name: e.name, team: e.team, gross, basic, days, lop, ot, pf, esi, pt, lwf, tds, advance, net: earned - pf - esi - pt - lwf - tds - advance, bank: `HDFC ••${String(x % 9000 + 1000)}` };
};
export const seedP0 = (): P0 => ({
  users: [
    { id: 'U1', name: 'Riya Reddy', email: 'riya@aarohan.in', role: 'Owner', unit: 'All units', status: 'Active' },
    { id: 'U2', name: 'Karthik Varma', email: 'karthik@aarohan.in', role: 'Sales', unit: 'Jeedimetla Plant', status: 'Active' },
    { id: 'U3', name: 'Harish Chandra', email: 'harish@aarohan.in', role: 'Stores', unit: 'Jeedimetla Plant', status: 'Active' },
    { id: 'U4', name: 'Padma Priya', email: 'padma@aarohan.in', role: 'Accounts', unit: 'All units', status: 'Active' },
    { id: 'U5', name: 'Sunitha Rao', email: 'sunitha@aarohan.in', role: 'HR', unit: 'All units', status: 'Active' },
    { id: 'U6', name: 'Ramesh Yadav', email: 'ramesh@aarohan.in', role: 'Supervisor', unit: 'Jeedimetla Plant', status: 'Active' },
  ],
  bands: [
    { id: 'B1', doc: 'Purchase order', min: 0, max: 50000, approver: 'Stores' }, { id: 'B2', doc: 'Purchase order', min: 50000, max: 200000, approver: 'Accounts' }, { id: 'B3', doc: 'Purchase order', min: 200000, max: null, approver: 'Owner' },
    { id: 'B4', doc: 'Payment', min: 0, max: 100000, approver: 'Accounts' }, { id: 'B5', doc: 'Payment', min: 100000, max: null, approver: 'Owner' },
    { id: 'B6', doc: 'Payroll', min: 0, max: null, approver: 'Owner' }, { id: 'B7', doc: 'Expense claim', min: 0, max: 10000, approver: 'HR' }, { id: 'B8', doc: 'Expense claim', min: 10000, max: null, approver: 'Accounts' },
  ],
  series: [{ doc: 'Sales invoice', prefix: 'AI/25-26/', next: 1187 }, { doc: 'Purchase order', prefix: 'PO-', next: 925 }, { doc: 'Delivery challan', prefix: 'DC/25-26/', next: 412 }, { doc: 'Credit note', prefix: 'CN/25-26/', next: 18 }, { doc: 'Ticket', prefix: 'TKT-', next: 1046 }],
  branches: [
    { name: 'Jeedimetla Plant', gstin: '36AAMCA4821K1Z6', addr: 'Plot 14, IDA Jeedimetla Ph II, Hyderabad', head: 'Lokesh Naidu' },
    { name: 'Cherlapally Unit 2', gstin: '36AAMCA4821K2Z5', addr: 'Shed 7, IDA Cherlapally, Hyderabad', head: 'Suresh Babu' },
    { name: 'Pune depot (planned)', gstin: '27AAMCA4821K1Z9', addr: 'Chakan MIDC, Pune', head: '—' },
  ],
  payrun: { month: 'October 2026', status: 'Draft', lines: employees.map((e) => payLine(e, e.name === 'Venu Gopal' ? 2500 : 0)) },
  advances: [
    { id: 'ADV-031', emp: employees.find((e) => e.name === 'Venu Gopal')?.id || '', name: 'Venu Gopal', amount: 10000, months: 4, recovered: 5000, date: '2026-08-04', status: 'Active' },
    { id: 'ADV-034', emp: employees.find((e) => e.name === 'Raju Goud')?.id || '', name: 'Raju Goud', amount: 6000, months: 3, recovered: 6000, date: '2026-06-11', status: 'Closed' },
  ],
  tickets: [
    { id: 'TKT-1041', customer: 'Sri Venkateswara Motors', channel: 'WhatsApp', subject: 'Brackets bent on delivery – 40 pcs', kind: 'Complaint', priority: 'High', status: 'Open', owner: 'Karthik Varma', opened: '2026-10-29 09:14', slaHrs: 8, ageHrs: 6.5, order: 'SO-2041', invoice: invoices[0]?.id, thread: [{ at: '09:14', from: 'Sri Venkateswara Motors', ch: 'WhatsApp', text: '40 of the 200 mounting brackets came bent. Photos attached. Need replacement before Monday.' }, { at: '09:40', from: 'Business OS agent', text: 'Triage: Complaint · High · linked SO-2041 · suggested CAPA with QC.' }] },
    { id: 'TKT-1042', customer: 'Sri Venkateswara Motors', channel: 'Email', subject: 'Invoice rate mismatch ₹4,910 vs PO ₹4,850', kind: 'Payment', priority: 'Medium', status: 'In progress', owner: 'Padma Priya', opened: '2026-10-28 16:02', slaHrs: 24, ageHrs: 20, invoice: invoices[1]?.id, thread: [{ at: '16:02', from: 'accounts@svmotors.in', ch: 'Email', text: 'Rate on your invoice differs from our PO. Please issue a credit note.' }] },
    { id: 'TKT-1043', customer: customers[2].name, channel: 'Call', subject: 'Delivery date for railing order', kind: 'Query', priority: 'Low', status: 'Waiting on customer', owner: 'Karthik Varma', opened: '2026-10-28 11:20', slaHrs: 24, ageHrs: 30, order: 'SO-2038', thread: [{ at: '11:20', from: 'Call log', ch: 'Call', text: 'Neha asked if the railing order can ship by 3 Nov.' }] },
    { id: 'TKT-1044', customer: customers[7].name, channel: 'Group', subject: 'Weld porosity on pump frames (batch 17)', kind: 'Complaint', priority: 'High', status: 'Open', owner: 'Anjali Devi', opened: '2026-10-27 18:45', slaHrs: 24, ageHrs: 39, capa: 'CAPA-007', thread: [{ at: '18:45', from: 'Kakatiya Pumps QA group', ch: 'Group', text: 'Porosity seen on 6 frames. Please send 8D.' }] },
    { id: 'TKT-1045', customer: customers[0].name, channel: 'WhatsApp', subject: 'Need quote for 300 extra brackets', kind: 'Order', priority: 'Medium', status: 'Resolved', owner: 'Karthik Varma', opened: '2026-10-25 10:05', slaHrs: 24, ageHrs: 4, csat: 5, thread: [{ at: '10:05', from: customers[0].name, ch: 'WhatsApp', text: 'Send quote for 300 more brackets.' }, { at: '13:30', from: 'Karthik Varma', text: 'Quote QTN-1051 shared.' }] },
  ],
  einv: invoices.slice(0, 8).map((i, k) => ({ inv: i.id, customer: customers.find((c) => c.id === i.customerId)?.name || i.customerId, amount: i.total, irn: (['Generated', 'Generated', 'Pending', 'Generated', 'Failed', 'Generated', 'Pending', 'Generated'] as const)[k], irnNo: k % 2 === 0 || k === 3 ? `a1f${(h(i.id) % 1e9).toString(16)}…` : undefined, ewb: i.total > 50000 ? `3310 ${String(h(i.id) % 1e8).padStart(8, '0')}` : undefined, ewbValid: i.total > 50000 ? ['2026-10-30 23:59', '2026-10-29 23:59', '2026-11-01 23:59', '2026-10-28 23:59'][k % 4] : undefined, vehicle: i.total > 50000 ? `TS09 UB ${4400 + k * 37}` : undefined, km: i.total > 50000 ? 40 + k * 55 : undefined, ewbStatus: i.total <= 50000 ? 'Not generated' : (['Active', 'Expiring', 'Active', 'Expired'] as const)[k % 4] })),
  leaves: [
    { id: 'LV-210', emp: '', name: 'Mallesh Kurma', type: 'Sick leave', from: '2026-10-29', to: '2026-10-30', days: 2, status: 'Pending', reason: 'Fever' },
    { id: 'LV-208', emp: '', name: 'Gopi Krishna', type: 'Casual leave', from: '2026-10-29', to: '2026-10-29', days: 1, status: 'Approved', reason: 'Family function' },
    { id: 'LV-211', emp: '', name: 'Sravani K', type: 'Earned leave', from: '2026-11-03', to: '2026-11-07', days: 5, status: 'Pending', reason: 'Diwali travel' },
  ],
  ot: employees.filter((e) => /welder|machinist|operator/i.test(e.role)).slice(0, 7).map((e, i) => ({ emp: e.id, name: e.name, date: `2026-10-${20 + i}`, hrs: 2 + (i % 3), approved: i % 3 !== 0 })),
  contractors: [{ agency: 'Sai Manpower Services', heads: 12, present: 11, rate: 620 }, { agency: 'Balaji Labour Contractors', heads: 8, present: 6, rate: 600 }],
  fnf: [{ emp: 'EMP-1031', name: 'Naresh Kumar', lwd: '2026-10-15', amount: 38450, status: 'Pending approval' }],
});
export const seedAudit = () => [
  { id: 'AU-s3', ts: '2026-10-29T03:42:00Z', at: '09:12', who: 'System', role: 'Owner', module: 'attendance', record: 'Muster 29 Oct', action: 'Attendance synced from biometric (Gate 1)', after: '42 of 45 present' },
  { id: 'AU-s2', ts: '2026-10-29T03:10:00Z', at: '08:40', who: 'Harish Chandra', role: 'Stores', module: 'procurement', record: 'PR-208', action: 'Quote PC/QTN/1042 attached', before: '2 quotes', after: '3 quotes' },
  { id: 'AU-s1', ts: '2026-10-28T12:30:00Z', at: '18:00', who: 'Business OS agent on behalf of Padma Priya', role: 'Accounts', agent: true, module: 'finance', record: 'Collections', action: 'Payment reminder drafted', after: 'Draft (not sent)' },
];
