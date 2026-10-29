/**
 * AI actions + views for the P0 modules, and the role-scope check for every chat message.
 * Every answer is a structured card (KPIs, table, chart, record or confirm card) – never bullets.
 */
import type { DemoState } from './store';
import { can, roleOf, ROLES, PERMS, permsFor, type Role } from './rbac';
import { moduleByKey } from './nav';
import { payTotals, findEmp, P0A } from './p0actions';
import { inr, lakh } from './format';
import { company } from './data';

export type Field = { k: string; label: string; value: string; required?: boolean; options?: string[] };
export type ModCard = {
  kind: 'view' | 'action' | 'denied'; module: string; headline: string; sub?: string;
  kpis?: { label: string; value: string; tone?: 'green' | 'amber' | 'red' | 'blue' }[];
  table?: { cols: string[]; rows: string[][] }; chart?: { label: string; value: number }[];
  action?: string; fields?: Field[]; status?: 'pending' | 'done' | 'cancelled' | 'replaced'; result?: string; link?: { label: string; to: string };
};
const n = (x: string) => Number(x.replace(/[,₹\s]/g, ''));
export const amount = (t: string) => { const m = t.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(lakh|lakhs|lac|l|k|thousand|cr|crore)?\b/i); if (!m) return 0; const u = (m[2] || '').toLowerCase(); return n(m[1]) * (/^(lakh|lakhs|lac|l)$/.test(u) ? 1e5 : /^(k|thousand)$/.test(u) ? 1e3 : /^(cr|crore)$/.test(u) ? 1e7 : 1); };
const roleIn = (t: string): Role | undefined => ROLES.find((r) => new RegExp(`\\b${r}\\b`, 'i').test(t)) || (/\bstore\b/i.test(t) ? 'Stores' : /\baccount(ant)?\b/i.test(t) ? 'Accounts' : /\bsupervis/i.test(t) ? 'Supervisor' : /\b(admin|owner|md)\b/i.test(t) ? 'Owner' : undefined);
const unitIn = (t: string) => /unit\s*2|cherlapally/i.test(t) ? company.units[2] : /unit\s*1|jeedimetla|plant/i.test(t) ? company.units[1] : /all units/i.test(t) ? 'All units' : '';

/** Which module a message is about (for scope). Order matters: specific first. */
const SCOPE_RX: [string, RegExp][] = [
  ['payroll', /\b(payroll|pay ?run|salar(y|ies)|payslips?|pay slips?|\bpf\b|provident|\besi\b|professional tax|\btds\b on salar|advance|loan to|full (and|&) final|bank (payout|file))\b/i],
  ['inbox', /\b(complaints?|tickets?|inbox|csat|sla|customer (messages|queries))\b/i],
  ['gst', /\b(irn|e-?invoic\w*|e-?way|ewb|gstr|gst return|3b|gstr-?1)\b/i],
  ['audit', /\b(audit|who changed|change log|what did the (ai|agent) (change|do))\b/i],
  ['settings', /\b(permissions?|who can approve|approval (limit|hierarchy|band)|invite|as (a |an )?\w+ user|users? list|document series|need (owner|accounts) approval|\bneeds? \w+ approval)\b/i],
  ['attendance', /\b(leave (request|balance)s?|muster|overtime|\bot\b (register|hours|this)|contract(or)? (labour|attendance)|shifts?)\b/i],
  ['finance', /\b(receivables?|overdue invoices?|cash ?flow|bank balance|payables?|outstanding)\b/i],
  ['sales', /\b(pipeline|leads?|opportunit(y|ies)|quotations?)\b/i],
  ['procurement', /\b(purchase (order|request)s?|\bpos?\b|\bprs?\b)\b/i],
  ['inventory', /\b(stock|inventory|reorder)\b/i],
  ['people', /\b(employees?|staff|headcount)\b/i],
];
export const scopeOf = (t0: string) => { const t = fixTypos(t0); if (/\d+(\.\d+)?\s?%\s*(gst|of|on)\b|gst on\s*₹?\d/i.test(t)) return null; return SCOPE_RX.find(([, r]) => r.test(t))?.[0] || null; };
export const denied = (s: DemoState, key: string): ModCard => ({ kind: 'denied', module: key, headline: `Not in your access – ask an admin`, sub: `${moduleByKey(key)?.label.en || key} isn’t part of the ${roleOf(s)} role. An Owner can grant it in Settings → Permissions.`, link: { label: 'Who can help?', to: '/' } });

const ticketsFor = (s: DemoState, t: string) => { const c = s.p0.tickets.filter((k) => t.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !/open|complaints?|show|tickets?|from|with/.test(w)).some((w) => k.customer.toLowerCase().includes(w))); return c.length ? c : s.p0.tickets; };

/** Build a card for a P0 message, or null if it isn't a P0 thing. */
export const fixTypos = (t: string) => t.replace(/\b(advnce|advanc|adavnce|advace)\b/gi, 'advance').replace(/\bgiv\b/gi, 'give').replace(/\b(payrol|payrll)\b/gi, 'payroll').replace(/\b(salry|salery)\b/gi, 'salary').replace(/\b(complants|complaints?s)\b/gi, 'complaints');
export function modIntent(t0: string, s: DemoState): ModCard | null {
  const t = fixTypos(t0);
  const T = t.toLowerCase();
  // ---- Payroll
  if (/\b(run|process|prepare|generate|do)\b.*\b(payroll|salar(y|ies)|pay ?run)\b/i.test(t)) {
    const month = (t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/i)?.[0] || 'October'); const mm = month[0].toUpperCase() + month.slice(1).toLowerCase();
    return act('payroll', 'run_payroll', `Run payroll for ${mm} 2026 – ${s.employees.length} employees, LOP from attendance, advances recovered.`, [{ k: 'month', label: 'Month', value: `${mm.length <= 3 ? { Oct: 'October', Nov: 'November', Sep: 'September' }[mm] || mm : mm} 2026`, required: true }]);
  }
  if (/\bapprove\b.*\b(payroll|pay ?run|salar)/i.test(t)) return act('payroll', 'approve_payroll', `Approve the ${s.p0.payrun.month} pay run – net ${inr(payTotals(s).net)}.`, []);
  if (/\b(advance|loan)\b/i.test(t) && /\b(give|pay|grant|sanction|approve|add|new)\b/i.test(t)) {
    const nm = (t.match(/\b(?:give|to|for|pay|grant|sanction)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/) || t.match(/\b(?:give|to|for|pay|grant|sanction)\s+([a-z]+)/i) || [])[1] || '';
    const e = nm && !/^(an?|the|advance|loan|rs)$/i.test(nm) ? findEmp(s, nm) : undefined;
    const mo = (t.match(/(\d+)\s*(months?|mo|installments?|emis?)/i) || [])[1] || '';
    const am = amount(t.replace(/(\d+)\s*(months?|mo|installments?|emis?)/i, ''));
    return act('payroll', 'advance', `Salary advance${e ? ` for ${e.name}` : ''}${am ? ` of ${inr(am)}` : ''}${mo ? `, recovered over ${mo} months` : ''}.`, [
      { k: 'employee', label: 'Employee', value: e?.name || '', required: true }, { k: 'amount', label: 'Amount (₹)', value: am ? String(am) : '', required: true }, { k: 'months', label: 'Recover over (months)', value: mo, required: true }]);
  }
  if (/\b(send|share|whatsapp|email)\b.*\bpay ?slips?\b|\bpay ?slips?\b.*\b(send|share|whatsapp)\b/i.test(t)) return act('payroll', 'send_payslips', `Share ${s.p0.payrun.month} payslips with ${s.employees.length} employees on WhatsApp (in-app simulation – no real messages).`, [{ k: 'channel', label: 'Channel', value: /email/i.test(t) ? 'Email' : 'WhatsApp', options: ['WhatsApp', 'Email'] }]);
  if (/\b(pf|esi|pt|tds|statutory|professional tax)\b/i.test(t) && /\b(total|how much|this month|due|amount|show)\b/i.test(t)) { const P = payTotals(s); return view('payroll', `PF this month is ${inr(P.pf)} (employee) + ${inr(P.pf)} (employer) = ${inr(P.pf * 2)}, due 15 Nov.`, [{ label: 'PF (total)', value: inr(P.pf * 2), tone: 'blue' }, { label: 'ESI', value: inr(P.esi) }, { label: 'Professional tax', value: inr(P.pt) }, { label: 'TDS', value: inr(P.tds) }], undefined, [{ label: 'PF', value: P.pf * 2 }, { label: 'ESI', value: P.esi }, { label: 'PT', value: P.pt }, { label: 'TDS', value: P.tds }, { label: 'LWF', value: P.lwf }]); }
  if (/\b(payroll|salar(y|ies)|pay ?run|wage bill)\b/i.test(t)) { const P = payTotals(s); const top = [...s.p0.payrun.lines].sort((a, b) => b.lop - a.lop).slice(0, 5); return view('payroll', `${s.p0.payrun.month} pay run is ${s.p0.payrun.status} – ${P.heads} employees, net ${lakh(P.net)}.`, [{ label: 'Gross', value: lakh(P.gross) }, { label: 'Net to bank', value: lakh(P.net), tone: 'green' }, { label: 'LOP days', value: String(P.lop), tone: 'amber' }, { label: 'Status', value: s.p0.payrun.status, tone: 'blue' }], { cols: ['Employee', 'Paid days', 'Gross', 'Net'], rows: top.map((l) => [l.name, `${l.days}${l.lop ? ` (LOP ${l.lop})` : ''}`, inr(l.gross), inr(l.net)]) }); }
  // ---- Inbox
  if (/\b(complaints?|tickets?)\b/i.test(t)) {
    const rows = ticketsFor(s, t).filter((k) => /\bopen\b|\bpending\b/i.test(t) ? k.status !== 'Resolved' : true);
    const cust = rows.length < s.p0.tickets.length ? rows[0]?.customer : '';
    return view('inbox', `${rows.length} ${/\bopen\b/i.test(t) ? 'open ' : ''}ticket${rows.length === 1 ? '' : 's'}${cust ? ` for ${cust}` : ''} – ${rows.filter((k) => k.kind === 'Complaint').length} complaints, ${rows.filter((k) => k.slaHrs - k.ageHrs < 0).length} past SLA.`, [{ label: 'Open', value: String(rows.filter((k) => k.status !== 'Resolved').length) }, { label: 'High priority', value: String(rows.filter((k) => k.priority === 'High').length), tone: 'red' }, { label: 'SLA breached', value: String(rows.filter((k) => k.slaHrs - k.ageHrs < 0).length), tone: 'amber' }],
      { cols: ['Ticket', 'Customer', 'Subject', 'Channel', 'Status', 'SLA'], rows: rows.map((k) => [k.id, k.customer, k.subject, k.channel, k.status, k.slaHrs - k.ageHrs < 0 ? `breached ${Math.abs(k.slaHrs - k.ageHrs).toFixed(0)}h` : `${(k.slaHrs - k.ageHrs).toFixed(1)}h left`]) });
  }
  // ---- Settings
  if (/\bwho can approve\b|\bwho (approves|signs off)\b/i.test(t)) {
    const doc = /payment|pay\b/i.test(t) ? 'Payment' : /po|purchase/i.test(t) ? 'Purchase order' : /expense/i.test(t) ? 'Expense claim' : /payroll|salar/i.test(t) ? 'Payroll' : 'Payment';
    const key = doc === 'Payment' ? 'finance' : doc === 'Purchase order' ? 'procurement' : doc === 'Payroll' ? 'payroll' : 'finance';
    return view('settings', `${doc}s: ${s.p0.bands.filter((b) => b.doc === doc).map((b) => `${b.approver} ${b.max === null ? `above ${lakh(b.min)}` : `up to ${lakh(b.max)}`}`).join(', ')}.`, undefined,
      { cols: ['Role', ...PERMS.map((p) => p[0].toUpperCase() + p.slice(1)), 'Amount band'], rows: ROLES.map((r) => [r, ...PERMS.map((p) => permsFor(s, key, r).includes(p) ? '✓' : '—'), s.p0.bands.filter((b) => b.doc === doc && b.approver === r).map((b) => `${inr(b.min)}–${b.max === null ? '∞' : inr(b.max)}`).join(', ') || '—']) });
  }
  if (/\b(add|invite|create|make)\b.*\buser\b|\bas (a |an )?(stores?|sales|accounts?|hr|supervisor|owner) user\b/i.test(t)) {
    const nm = ((t.match(/\b(?:[Aa]dd|[Ii]nvite|[Cc]reate|[Mm]ake)\s+([A-Za-z]+(?:\s[A-Z][a-z]+)?)/) || [])[1] || '').replace(/^\w/, (c) => c.toUpperCase());
    return act('settings', 'invite_user', `Invite ${nm || 'a new user'}${roleIn(t) ? ` as ${roleIn(t)}` : ''}${unitIn(t) ? ` at ${unitIn(t)}` : ''}.`, [
      { k: 'name', label: 'Name', value: /^(a|an|new|the)$/i.test(nm) ? '' : nm, required: true }, { k: 'role', label: 'Role', value: roleIn(t) || '', required: true, options: ROLES }, { k: 'unit', label: 'Unit', value: unitIn(t) || company.units[1], options: company.units }]);
  }
  if (/\b(above|over|more than|beyond)\b.*\b(need|needs|require|requires|must have|go to)\b.*\bapproval\b|\bapproval\b.*\b(above|over)\b/i.test(t)) {
    const doc = /\bpo|purchase/i.test(t) ? 'Purchase order' : /payment/i.test(t) ? 'Payment' : /expense/i.test(t) ? 'Expense claim' : '';
    const am = amount(t);
    return act('settings', 'set_band', `${doc || 'Documents'} above ${am ? lakh(am) : '…'} will need ${roleIn(t) || '…'} approval.`, [
      { k: 'doc', label: 'Document', value: doc, required: true, options: ['Purchase order', 'Payment', 'Expense claim', 'Payroll'] }, { k: 'min', label: 'Above (₹)', value: am ? String(am) : '', required: true }, { k: 'approver', label: 'Approver role', value: roleIn(t) || '', required: true, options: ROLES }]);
  }
  if (/\b(permissions?|users?|roles?)\b/i.test(t) && /\b(show|list|who|what|my)\b/i.test(t)) return view('settings', `${s.p0.users.length} users across ${ROLES.length} roles.`, undefined, { cols: ['Name', 'Role', 'Unit', 'Status'], rows: s.p0.users.map((u) => [u.name, u.role, u.unit, u.status]) });
  // ---- GST
  if (/\bgenerate\b.*\birn\b|\birn\b.*\b(for|generate)\b/i.test(t)) { const id = (t.match(/\b(INV-?\d+|AI\/[\w/-]+|\w+-\d{3,})\b/i) || [])[1]; const e = id ? s.p0.einv.find((x) => x.inv.toLowerCase() === id.toLowerCase()) : s.p0.einv.find((x) => x.irn !== 'Generated'); return act('gst', 'gen_irn', `Generate IRN for ${e?.inv || 'pending invoices'}${e ? ` (${e.customer}, ${inr(e.amount)})` : ''}.`, [{ k: 'inv', label: 'Invoice', value: e?.inv || '', required: true, options: s.p0.einv.filter((x) => x.irn !== 'Generated').map((x) => x.inv) }]); }
  if (/\b(e-?way|ewb)\b/i.test(t)) { const r = s.p0.einv.filter((x) => x.ewb); return view('gst', `${r.filter((x) => x.ewbStatus === 'Active').length} e-way bills active, ${r.filter((x) => x.ewbStatus === 'Expiring').length} expiring today, ${r.filter((x) => x.ewbStatus === 'Expired').length} expired.`, undefined, { cols: ['EWB', 'Invoice', 'Vehicle', 'Valid until', 'Status'], rows: r.map((x) => [x.ewb!, x.inv, x.vehicle!, x.ewbValid!, x.ewbStatus]) }); }
  if (/\b(irn|e-?invoic\w*|gstr|3b|gst (return|summary|liability|payable))\b/i.test(t)) { const e = s.p0.einv; return view('gst', `${e.filter((x) => x.irn === 'Generated').length} of ${e.length} invoices have an IRN; ${e.filter((x) => x.irn !== 'Generated').length} need action.`, [{ label: 'IRN generated', value: String(e.filter((x) => x.irn === 'Generated').length), tone: 'green' }, { label: 'Pending', value: String(e.filter((x) => x.irn === 'Pending').length), tone: 'amber' }, { label: 'Failed', value: String(e.filter((x) => x.irn === 'Failed').length), tone: 'red' }], { cols: ['Invoice', 'Customer', 'Value', 'IRN'], rows: e.map((x) => [x.inv, x.customer, inr(x.amount), x.irn]) }); }
  // ---- Attendance & leave
  if (/\bapprove\b.*\bleave\b|\bleave\b.*\bapprove\b/i.test(t)) { const l = s.p0.leaves.find((x) => x.status === 'Pending' && T.includes(x.name.split(' ')[0].toLowerCase())) || s.p0.leaves.find((x) => x.status === 'Pending'); return act('attendance', 'approve_leave', l ? `Approve ${l.type.toLowerCase()} for ${l.name}, ${l.from} → ${l.to} (${l.days} days).` : 'No pending leave requests.', [{ k: 'leave', label: 'Leave request', value: l?.id || '', required: true, options: s.p0.leaves.filter((x) => x.status === 'Pending').map((x) => x.id) }]); }
  if (/\bleave\b/i.test(t) && /\b(request|pending|who|balance|show|list)\b/i.test(t)) return view('attendance', `${s.p0.leaves.filter((l) => l.status === 'Pending').length} leave requests pending.`, undefined, { cols: ['Request', 'Employee', 'Type', 'Dates', 'Status'], rows: s.p0.leaves.map((l) => [l.id, l.name, l.type, `${l.from} → ${l.to}`, l.status]) });
  if (/\b(overtime|ot)\b/i.test(t) && /\b(hours|register|this week|show|how much)\b/i.test(t)) return view('attendance', `${s.p0.ot.reduce((a, o) => a + o.hrs, 0)} OT hours this week.`, undefined, { cols: ['Employee', 'Date', 'Hours', 'Approved'], rows: s.p0.ot.map((o) => [o.name, o.date, String(o.hrs), o.approved ? 'Yes' : 'Pending']) }, s.p0.ot.map((o) => ({ label: o.name.split(' ')[0], value: o.hrs })));
  if (/\bcontract(or)?s?\b.*\b(labour|attendance|present)\b|\bcontract labour\b/i.test(t)) return view('attendance', `${s.p0.contractors.reduce((a, c) => a + c.present, 0)} of ${s.p0.contractors.reduce((a, c) => a + c.heads, 0)} contract workers present today.`, undefined, { cols: ['Agency', 'Deployed', 'Present', 'Day rate'], rows: s.p0.contractors.map((c) => [c.agency, String(c.heads), String(c.present), inr(c.rate)]) });
  if (/\bmuster|shifts?\b/i.test(t)) return view('attendance', `Muster roll for 29 Oct – ${s.employees.filter((e) => /Present|Late/.test(e.status)).length} of ${s.employees.length} present.`, undefined, { cols: ['Shift', 'Headcount', 'Present'], rows: [...new Set(s.employees.map((e) => e.shift))].map((sh) => [sh, String(s.employees.filter((e) => e.shift === sh).length), String(s.employees.filter((e) => e.shift === sh && /Present|Late/.test(e.status)).length)]) });
  // ---- Audit
  if (/\b(audit|who changed|change log|what did the (ai|agent) (change|do)|recent changes)\b/i.test(t)) { const r = s.audit.filter((a) => /\b(ai|agent)\b/i.test(t) ? a.agent : true).slice(0, 8); return view('audit', `${r.length} recent change${r.length === 1 ? '' : 's'}${/\b(ai|agent)\b/i.test(t) ? ' made by the AI agent' : ''}.`, undefined, { cols: ['When', 'Who', 'Action', 'Before → After'], rows: r.map((a) => [a.at, a.who, `${a.action}${a.record ? ` · ${a.record}` : ''}`, `${a.before || '—'} → ${a.after || '—'}`]) }); }
  return null;
}
const view = (module: string, headline: string, kpis?: ModCard['kpis'], table?: ModCard['table'], chart?: ModCard['chart']): ModCard => ({ kind: 'view', module, headline, kpis, table, chart, link: { label: `Open ${moduleByKey(module)?.label.en}`, to: moduleByKey(module)!.to } });
const act = (module: string, action: string, headline: string, fields: Field[]): ModCard => ({ kind: 'action', module, action, headline, fields, status: 'pending', link: { label: `Open ${moduleByKey(module)?.label.en}`, to: moduleByKey(module)!.to } });
export const missing = (c: ModCard) => (c.fields || []).filter((f) => f.required && !f.value.trim());
export const ACTION_PERM: Record<string, ['create' | 'edit' | 'approve', string]> = { run_payroll: ['create', 'payroll'], approve_payroll: ['approve', 'payroll'], advance: ['create', 'payroll'], send_payslips: ['edit', 'payroll'], invite_user: ['create', 'settings'], set_band: ['edit', 'settings'], gen_irn: ['create', 'gst'], approve_leave: ['approve', 'attendance'] };

/** Fold a follow-up answer into a pending action card. "Key - value" lines, or bare values into missing fields in order. */
export function fillCard(c: ModCard, raw: string, s: DemoState): ModCard | null {
  if (c.kind !== 'action' || !c.fields?.length) return null;
  const f = c.fields.map((x) => ({ ...x })); let hit = false;
  const lines = raw.split(/\n|;|,(?![\d]{3})/).map((x) => x.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([a-z ()₹]+?)\s*[-:=–]\s*(.*)$/i);
    const fld = m ? f.find((x) => { const a = x.label.toLowerCase().replace(/\(.*?\)/g, '').trim(), b = m[1].toLowerCase().trim(); return a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4)) || x.k === b; }) : undefined;
    let v = (m && fld ? m[2] : line).trim(); if (/^(none|na|n\/a|skip|-|blank)$/i.test(v)) v = '';
    const target = fld || f.find((x) => !x.value.trim() && (x.k === 'months' ? /^\d+\s*(m|months?)?$/i.test(v) : x.k === 'amount' || x.k === 'min' ? amount(v) > 0 : x.k === 'role' || x.k === 'approver' ? !!roleIn(v) : x.k === 'employee' ? !!findEmp(s, v) : true));
    if (!target) continue;
    if (target.k === 'amount' || target.k === 'min') v = String(amount(v) || v);
    else if (target.k === 'months') v = (v.match(/\d+/) || [v])[0];
    else if (target.k === 'role' || target.k === 'approver') v = roleIn(v) || v;
    else if (target.k === 'employee') v = findEmp(s, v)?.name || v;
    else if (target.k === 'unit') v = unitIn(v) || v;
    target.value = v; hit = true;
  }
  if (!hit) return null;
  const nc: ModCard = { ...c, fields: f };
  const g = (k: string) => f.find((x) => x.k === k)?.value || '';
  if (c.action === 'advance') nc.headline = `Salary advance for ${g('employee') || '…'} of ${g('amount') ? inr(+g('amount')) : '…'}, recovered over ${g('months') || '…'} months.`;
  if (c.action === 'invite_user') nc.headline = `Invite ${g('name') || 'a new user'} as ${g('role') || '…'} at ${g('unit') || '…'}.`;
  if (c.action === 'set_band') nc.headline = `${g('doc') || 'Documents'} above ${g('min') ? lakh(+g('min')) : '…'} will need ${g('approver') || '…'} approval.`;
  return nc;
}

/** Execute a confirmed action; returns a one-line result for the card. */
export function execCard(c: ModCard, d: DemoState): { result: string; record: string; before?: string; after?: string } {
  const g = (k: string) => c.fields?.find((x) => x.k === k)?.value || '';
  switch (c.action) {
    case 'run_payroll': { P0A.draftPayroll(d, g('month')); const P = payTotals(d); return { result: `Draft pay run ready – ${P.heads} employees, gross ${lakh(P.gross)}, net ${lakh(P.net)}, ${P.lop} LOP days. Awaiting approval.`, record: `Pay run ${g('month')}`, after: 'Draft' }; }
    case 'approve_payroll': { const b = d.p0.payrun.status; P0A.approvePayroll(d); return { result: `${d.p0.payrun.month} pay run approved.`, record: `Pay run ${d.p0.payrun.month}`, before: b, after: 'Approved' }; }
    case 'advance': { const e = findEmp(d, g('employee')); if (!e) return { result: `Couldn’t find ${g('employee')} – nothing changed.`, record: g('employee') }; const id = P0A.giveAdvance(d, e.id, e.name, +g('amount'), +g('months')); return { result: `${id}: ${inr(+g('amount'))} advance to ${e.name}, ${inr(Math.round(+g('amount') / +g('months')))}/month recovered from payroll.`, record: e.name, after: `${inr(+g('amount'))} / ${g('months')} mo` }; }
    case 'send_payslips': { P0A.sendPayslips(d); return { result: `${d.employees.length} payslips queued on ${g('channel')} – in-app simulation, no real messages sent.`, record: `Payslips ${d.p0.payrun.month}`, after: 'Shared (simulated)' }; }
    case 'invite_user': { const id = P0A.inviteUser(d, g('name'), g('role') as Role, g('unit')); return { result: `${g('name')} invited as ${g('role')} at ${g('unit')} (${id}) – demo, no email sent.`, record: g('name'), after: `${g('role')} · ${g('unit')}` }; }
    case 'set_band': { P0A.setBand(d, g('doc'), +g('min'), g('approver')); return { result: `${g('doc')}s above ${lakh(+g('min'))} now need ${g('approver')} approval.`, record: `Approval limits · ${g('doc')}`, after: `> ${lakh(+g('min'))} → ${g('approver')}` }; }
    case 'gen_irn': { P0A.generateIRN(d, g('inv')); return { result: `IRN generated for ${g('inv')} (sandbox).`, record: g('inv'), before: 'Pending', after: 'Generated' }; }
    case 'approve_leave': { P0A.leave(d, g('leave'), 'Approved'); const l = d.p0.leaves.find((x) => x.id === g('leave')); return { result: `${g('leave')} approved${l ? ` for ${l.name}` : ''}.`, record: g('leave'), before: 'Pending', after: 'Approved' }; }
  }
  return { result: 'Done.', record: c.module };
}
export const canAct = (s: DemoState, c: ModCard) => { const p = ACTION_PERM[c.action || '']; return !p || can(s, p[1], p[0]); };
