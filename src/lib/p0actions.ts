/** Pure state mutations for P0 modules, shared by the pages and the AI chat (so both write the same audit trail). */
import type { DemoState } from './store';
import { payLine } from './p0data';
import type { Role } from './rbac';
export const sumBy = <T,>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + f(x), 0);
export const payTotals = (s: DemoState) => { const l = s.p0.payrun.lines; return { heads: l.length, gross: sumBy(l, (x) => x.gross), net: sumBy(l, (x) => x.net), pf: sumBy(l, (x) => x.pf), esi: sumBy(l, (x) => x.esi), pt: sumBy(l, (x) => x.pt), lwf: sumBy(l, (x) => x.lwf), tds: sumBy(l, (x) => x.tds), lop: sumBy(l, (x) => x.lop), adv: sumBy(l, (x) => x.advance) }; };
export const findEmp = (s: DemoState, q: string) => { const t = q.toLowerCase().trim(); return s.employees.find((e) => e.name.toLowerCase() === t) || s.employees.find((e) => e.name.toLowerCase().split(' ').some((w) => w === t.split(' ')[0])) || s.employees.find((e) => e.name.toLowerCase().includes(t)); };
export const P0A = {
  draftPayroll(d: DemoState, month = 'October 2026') {
    const adv = (id: string) => d.p0.advances.filter((a) => a.emp === id && a.status === 'Active').reduce((s, a) => s + Math.round(a.amount / a.months), 0);
    d.p0.payrun = { month, status: 'Draft', lines: d.employees.map((e) => payLine(e, adv(e.id))) };
  },
  approvePayroll(d: DemoState) { d.p0.payrun.status = 'Approved'; },
  payPayroll(d: DemoState) { d.p0.payrun.status = 'Paid'; d.p0.payrun.bankFile = true; },
  sendPayslips(d: DemoState) { d.p0.payrun.payslipsSent = true; },
  giveAdvance(d: DemoState, empId: string, name: string, amount: number, months: number) {
    const id = 'ADV-' + (40 + d.p0.advances.length);
    d.p0.advances.unshift({ id, emp: empId, name, amount, months, recovered: 0, date: '2026-10-29', status: 'Active' });
    const l = d.p0.payrun.lines.find((x) => x.emp === empId); if (l && d.p0.payrun.status === 'Draft') { const m = Math.round(amount / months); l.advance += m; l.net -= m; }
    return id;
  },
  inviteUser(d: DemoState, name: string, role: Role, unit: string, email?: string) {
    const id = 'U' + (d.p0.users.length + 1);
    d.p0.users.push({ id, name, email: email || name.toLowerCase().split(' ')[0] + '@aarohan.in', role, unit, status: 'Invited' }); return id;
  },
  setBand(d: DemoState, doc: string, min: number, approver: string) {
    const rest = d.p0.bands.filter((b) => b.doc !== doc || b.max !== null && b.max <= min);
    const cut = rest.filter((b) => b.doc === doc).map((b) => ({ ...b, max: b.max === null || b.max > min ? min : b.max }));
    d.p0.bands = [...d.p0.bands.filter((b) => b.doc !== doc), ...cut, { id: 'B' + Date.now() % 1000, doc, min, max: null, approver }];
  },
  generateIRN(d: DemoState, inv: string) { const e = d.p0.einv.find((x) => x.inv === inv); if (e) { e.irn = 'Generated'; e.irnNo = 'a1f' + Math.floor(Math.random() * 1e9).toString(16) + '…'; } },
  extendEwb(d: DemoState, inv: string) { const e = d.p0.einv.find((x) => x.inv === inv); if (e) { e.ewbStatus = 'Active'; e.ewbValid = '2026-10-31 23:59'; } },
  leave(d: DemoState, id: string, st: 'Approved' | 'Rejected') { const l = d.p0.leaves.find((x) => x.id === id); if (l) l.status = st; },
  ticket(d: DemoState, id: string, patch: Partial<DemoState['p0']['tickets'][number]>, note?: string, who = 'Riya Reddy') {
    const t = d.p0.tickets.find((x) => x.id === id); if (!t) return; Object.assign(t, patch); if (note) t.thread.push({ at: new Date().toTimeString().slice(0, 5), from: who, text: note });
  },
  setPerm(d: DemoState, role: Role, key: string, perms: string[]) { d.perms[role] = { ...(d.perms[role] || {}), [key]: perms as never }; },
};
export const draftReply = (t: { customer: string; subject: string; kind: string; order?: string }) =>
  t.kind === 'Complaint' ? `Dear ${t.customer} team,\n\nSorry about "${t.subject}". We have logged it as a priority complaint${t.order ? ` against ${t.order}` : ''}. Our QC lead will inspect the returned parts today and replacements will be dispatched within 48 hours. We'll share the root-cause (8D) report by Monday.\n\nRegards,\nAarohan Industries`
  : `Dear ${t.customer} team,\n\nThanks for reaching out about "${t.subject}". We're on it and will confirm by end of day.\n\nRegards,\nAarohan Industries`;
