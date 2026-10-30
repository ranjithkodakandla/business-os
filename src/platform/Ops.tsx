/** Platform admin: SaaS metrics, product telemetry, AI support, demo access, data warehouse, security & privacy. All simulated. */
import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, LineChart, Line } from 'recharts';
import { Bot, UserRound, Plus, RotateCcw, Trash2, Lock, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../lib/store';
import { MODULES } from '../lib/nav';
import { Card, Kpi, DataTable, Button, Badge, Status, Tabs, cx } from '../components/ui';
import { MRR_TREND, mrrOf, lakhP, inrP } from './data';
import { bucket } from './rollout';

const H = ({ t, sub, right }: { t: string; sub?: string; right?: React.ReactNode }) => <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div className="min-w-0"><h1 className="text-xl font-semibold text-slate-900">{t}</h1>{sub && <p className="text-sm text-slate-500">{sub}</p>}</div>{right}</div>;
const Sim = () => <Badge tone="violet">Simulated data</Badge>;
const lbl = (k: string) => MODULES.find((m) => m.key === k)?.label.en || k;
const Ch = ({ children, h = 'h-60' }: { children: React.ReactElement; h?: string }) => <div className={h}><ResponsiveContainer>{children}</ResponsiveContainer></div>;

export function Metrics() {
  const { s } = useStore(); const p = s.plat; const m = mrrOf(p);
  const top = [...p.tenants].filter((t) => t.mrr).sort((a, b) => b.mrr - a.mrr).slice(0, 6);
  const nrr = [{ m: 'May', v: 104 }, { m: 'Jun', v: 106 }, { m: 'Jul', v: 105 }, { m: 'Aug', v: 109 }, { m: 'Sep', v: 111 }, { m: 'Oct', v: 112 }];
  const churn = [{ m: 'May', logo: 2.1, rev: 1.4 }, { m: 'Jun', logo: 1.8, rev: 1.2 }, { m: 'Jul', logo: 2.4, rev: 1.9 }, { m: 'Aug', logo: 1.5, rev: 0.8 }, { m: 'Sep', logo: 1.2, rev: 0.6 }, { m: 'Oct', logo: 1.6, rev: 1.1 }];
  const cohorts = [['Q4 2024', [100, 96, 93, 92, 92, 91]], ['Q1 2025', [100, 94, 90, 88, 87]], ['Q2 2025', [100, 97, 95, 94]], ['Q3 2025', [100, 92, 89]], ['Q4 2025', [100, 95]], ['Q1 2026', [100]]] as [string, number[]][];
  return (<div data-testid="platform-metrics"><H t="SaaS metrics" sub="Revenue health of Business OS" right={<Sim />} />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6"><Kpi label="ARR" value={lakhP(m * 12)} tone="green" sub="+41% YoY" /><Kpi label="MRR" value={lakhP(m)} sub="+3.4% MoM" tone="green" /><Kpi label="NRR (TTM)" value="112%" tone="green" sub="Expansion > churn" /><Kpi label="GRR" value="94%" /><Kpi label="Logo churn (Oct)" value="1.6%" tone="amber" /><Kpi label="ARPA" value={inrP(Math.round(m / p.tenants.filter((t) => t.mrr).length))} /></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="MRR trend (₹ lakh)"><Ch><AreaChart data={MRR_TREND}><XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Area dataKey="v" stroke="#6366f1" fill="#c7d2fe" strokeWidth={2} /></AreaChart></Ch></Card>
      <Card title="Net revenue retention %"><Ch><LineChart data={nrr}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="m" fontSize={11} /><YAxis domain={[95, 115]} fontSize={11} /><Tooltip /><Line dataKey="v" stroke="#10b981" strokeWidth={2} /></LineChart></Ch></Card>
      <Card title="Churn % (logo vs revenue)"><Ch><BarChart data={churn}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="logo" name="Logo" fill="#f59e0b" radius={[4, 4, 0, 0]} /><Bar dataKey="rev" name="Revenue" fill="#f43f5e" radius={[4, 4, 0, 0]} /></BarChart></Ch></Card>
      <Card title="Cohort retention (% of logos)" pad={false}><div className="overflow-x-auto p-3"><table className="w-full min-w-[420px] text-[12px]" data-testid="cohorts"><thead><tr className="text-2xs text-slate-400"><th className="text-left">Signed up</th>{['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5'].map((q) => <th key={q}>{q}</th>)}</tr></thead><tbody>{cohorts.map(([c, v]) => <tr key={c}><td className="py-1 font-medium">{c}</td>{[0, 1, 2, 3, 4, 5].map((i) => <td key={i} className="p-0.5">{v[i] != null && <div className="rounded py-1 text-center text-white" style={{ background: `rgba(79,70,229,${0.25 + (v[i] - 85) / 20})` }}>{v[i]}</div>}</td>)}</tr>)}</tbody></table></div></Card>
    </div>
    <Card title="Top customers by MRR" className="mt-4" pad={false}><DataTable rows={top} rowKey={(t) => t.id} columns={[{ key: 'n', header: 'Company', render: (t) => t.name }, { key: 'p', header: 'Plan', render: (t) => t.plan }, { key: 'm', header: 'MRR', align: 'right', render: (t) => inrP(t.mrr) }, { key: 's', header: 'Share', align: 'right', render: (t) => Math.round(t.mrr / m * 100) + '%' }, { key: 'h', header: 'Health', render: (t) => t.health }]} /></Card>
  </div>);
}

export function Telemetry() {
  const { s } = useStore(); const p = s.plat;
  const mods = MODULES.filter((m) => m.key !== 'home').map((m) => { const on = p.tenants.filter((t) => p.flags[t.id]?.[m.key] !== false).length; const act = Math.round(on * (0.35 + (bucket(m.key, 'x') % 60) / 100)); return { k: m.key, name: m.label.en, enabled: on, active: Math.min(on, act), events: (bucket(m.key, 'e') + 7) * 431, stage: p.rollout[m.key]?.killed ? 'Killed' : p.rollout[m.key]?.stage || 'GA' }; }).sort((a, b) => b.events - a.events);
  const dau = Array.from({ length: 14 }, (_, i) => ({ d: `${16 + i} Oct`, v: 210 + i * 6 + (i % 3) * 18 }));
  return (<div data-testid="platform-telemetry"><H t="Product telemetry" sub="Feature and flag usage across tenants (privacy-safe, aggregated)" right={<Sim />} />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi label="DAU" value="294" sub="+12% WoW" tone="green" /><Kpi label="WAU / MAU" value="61%" /><Kpi label="AI chats / day" value="1,840" /><Kpi label="Avg modules per tenant" value="9.4" /></div>
    <div className="grid gap-4 lg:grid-cols-2"><Card title="Daily active users"><Ch><AreaChart data={dau}><XAxis dataKey="d" fontSize={10} /><YAxis fontSize={11} /><Tooltip /><Area dataKey="v" stroke="#0ea5e9" fill="#bae6fd" /></AreaChart></Ch></Card>
      <Card title="Events by module (30 days)"><Ch><BarChart data={mods.slice(0, 10)} layout="vertical"><XAxis type="number" fontSize={10} /><YAxis type="category" dataKey="name" width={110} fontSize={10} /><Tooltip /><Bar dataKey="events" fill="#6366f1" radius={[0, 4, 4, 0]} /></BarChart></Ch></Card></div>
    <Card title="Flag adoption" className="mt-4" pad={false}><DataTable rows={mods} rowKey={(m) => m.k} columns={[{ key: 'n', header: 'Module / flag', render: (m) => m.name }, { key: 's', header: 'Stage', render: (m) => <Status>{m.stage}</Status> }, { key: 'e', header: 'Enabled tenants', align: 'right', render: (m) => m.enabled }, { key: 'a', header: 'Active (7d)', align: 'right', render: (m) => m.active }, { key: 'r', header: 'Adoption', render: (m) => <div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded bg-slate-100"><div className="h-1.5 rounded bg-indigo-500" style={{ width: (m.enabled ? m.active / m.enabled * 100 : 0) + '%' }} /></div><span className="text-2xs">{m.enabled ? Math.round(m.active / m.enabled * 100) : 0}%</span></div> }, { key: 'v', header: 'Events', align: 'right', render: (m) => m.events.toLocaleString('en-IN') }]} /></Card>
  </div>);
}


type T = { id: string; tenant: string; subj: string; diag: string; state: 'AI resolved' | 'AI working' | 'Escalated' | 'Human resolved'; conf: number };
export function AiSupport() {
  const { s } = useStore(); const nm = (id: string) => s.plat.tenants.find((t) => t.id === id)?.name || id;
  const [rows, setRows] = useState<T[]>([
    { id: 'PS-230', tenant: 't-deccan', subj: 'Payslip shows wrong PF for 2 workers', diag: 'Tenant-scoped check: PF wage ceiling override on 2 employees (Deccan only). Suggested fix sent.', state: 'AI resolved', conf: 0.93 },
    { id: 'PS-229', tenant: 't-chola', subj: 'Cannot generate IRN for INV-2231', diag: 'IRP error 2150 – duplicate IRN. Found earlier IRN in Chola e-invoice log; linked it.', state: 'AI resolved', conf: 0.88 },
    { id: 'PS-228', tenant: 't-sahyadri', subj: 'E-way bill generation timing out', diag: 'NIC API latency 14s (platform-wide INC-041). Not tenant-specific.', state: 'Escalated', conf: 0.41 },
    { id: 'PS-227', tenant: 't-shree', subj: 'Card payment failed – switch to UPI autopay', diag: 'Billing: 2 failed card retries. UPI mandate link prepared (simulated).', state: 'AI working', conf: 0.76 },
    { id: 'PS-226', tenant: 't-kaveri', subj: 'Form 16A Q2 uploaded but status not updated', diag: 'Billing TDS: 16A received, 26AS match runs nightly. Explained timeline.', state: 'AI resolved', conf: 0.9 },
    { id: 'PS-225', tenant: 't-narmada', subj: 'Want custom field on job card', diag: 'Feature request – outside AI scope.', state: 'Human resolved', conf: 0.2 },
  ]);
  const res = rows.filter((r) => r.state === 'AI resolved').length;
  return (<div data-testid="platform-aisupport"><H t="AI support assistant" sub="AI answers tenant tickets using diagnostics scoped to that tenant only; low confidence → human" right={<Sim />} />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi label="Deflection rate (30d)" value="68%" tone="green" sub={`${res}/${rows.length} in view resolved by AI`} /><Kpi label="Escalated to human" value={rows.filter((r) => r.state === 'Escalated').length} tone="amber" /><Kpi label="Median AI resolution" value="4 min" /><Kpi label="CSAT on AI answers" value="4.5/5" /></div>
    <Card pad={false} title="Tickets"><DataTable rows={rows} rowKey={(r) => r.id} columns={[{ key: 'i', header: 'Ticket', render: (r) => r.id }, { key: 'c', header: 'Company', render: (r) => nm(r.tenant) }, { key: 's', header: 'Subject', render: (r) => <div><div>{r.subj}</div><div className="flex gap-1 text-2xs text-slate-500"><Bot size={12} className="shrink-0" />{r.diag}</div></div> }, { key: 'f', header: 'Confidence', render: (r) => <span className={r.conf < 0.6 ? 'text-rose-600' : 'text-emerald-700'}>{Math.round(r.conf * 100)}%</span> }, { key: 'st', header: 'State', render: (r) => <Status>{r.state}</Status> },
      { key: 'x', header: '', render: (r) => r.state === 'AI working' || r.state === 'AI resolved' ? <Button size="sm" icon={<UserRound size={13} />} data-escalate={r.id} onClick={() => setRows(rows.map((x) => x.id === r.id ? { ...x, state: 'Escalated' } : x))}>Escalate</Button> : null }]} /></Card>
    <div className="mt-3 text-2xs text-slate-500">Guardrails: diagnostics run with a read-only token for the ticket's tenant; no cross-tenant data; PII masked in AI context; every AI reply logged.</div>
  </div>);
}

type D = { id: string; name: string; industry: string; created: string; expires: string; by: string; state: 'Live' | 'Expired' };
export function DemoAccess() {
  const [rows, setRows] = useState<D[]>([{ id: 'demo-7f3a', name: 'Demo · Hyderabad fabricator', industry: 'Fabrication', created: '26 Oct', expires: '09 Nov', by: 'Ranjith', state: 'Live' }, { id: 'demo-21cc', name: 'Demo · Pune auto ancillary', industry: 'Auto ancillary', created: '14 Oct', expires: '28 Oct', by: 'Meera', state: 'Expired' }]);
  const [ind, setInd] = useState('Fabrication'); const [days, setDays] = useState('14');
  const create = () => { const id = 'demo-' + Math.random().toString(16).slice(2, 6); setRows([{ id, name: `Demo · ${ind}`, industry: ind, created: 'Today', expires: `in ${days} days`, by: 'Ranjith', state: 'Live' }, ...rows]); };
  return (<div data-testid="platform-demo"><H t="Demo access" sub="Spin up sandbox tenants with seeded data for sales demos. Isolated, auto-expire, no real sends." right={<Sim />} />
    <Card title="New sandbox" className="mb-4"><div className="flex flex-wrap items-end gap-3 text-[13px]"><label>Industry seed<select value={ind} onChange={(e) => setInd(e.target.value)} className="ml-2 h-10 rounded-lg border px-2">{['Fabrication', 'Castings', 'Plastics', 'Textile machinery', 'Pumps'].map((x) => <option key={x}>{x}</option>)}</select></label><label>Expires after<select value={days} onChange={(e) => setDays(e.target.value)} className="ml-2 h-10 rounded-lg border px-2">{['3', '7', '14', '30'].map((x) => <option key={x}>{x}</option>)}</select> days</label><Button variant="primary" icon={<Plus size={14} />} data-testid="demo-create" onClick={create}>Create sandbox</Button></div>
      <div className="mt-2 text-2xs text-slate-500">Seeds 6 months of orders, invoices, stock, 40 employees and payroll. Outbound WhatsApp/email/calls are forced to simulation mode.</div></Card>
    <Card pad={false} title="Sandboxes"><DataTable rows={rows} rowKey={(r) => r.id} columns={[{ key: 'n', header: 'Sandbox', render: (r) => <div data-demo={r.id}><div className="font-medium">{r.name}</div><div className="text-2xs text-slate-400">{r.id}.demo.businessos.in</div></div> }, { key: 'c', header: 'Created', render: (r) => r.created }, { key: 'e', header: 'Expires', render: (r) => r.expires }, { key: 'b', header: 'By', render: (r) => r.by }, { key: 's', header: 'State', render: (r) => <Status>{r.state}</Status> },
      { key: 'x', header: '', render: (r) => <div className="flex gap-1"><Button size="sm" icon={<RotateCcw size={13} />} onClick={() => setRows(rows.map((x) => x.id === r.id ? { ...x, state: 'Live', created: 'Today (reset)' } : x))}>Reset</Button><Button size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={() => setRows(rows.filter((x) => x.id !== r.id))}>Delete</Button></div> }]} /></Card>
  </div>);
}

export function Warehouse() {
  const sync = [['Tenant OLTP → BigQuery (CDC)', 'Healthy', '4 min ago', '1.2 M rows'], ['Billing & TDS', 'Healthy', '12 min ago', '3,410 rows'], ['Product telemetry events', 'Lagging', '52 min ago', '8.7 M events'], ['Support tickets', 'Healthy', '1 h ago', '620 rows']];
  const ex = [['MRR & churn (Looker Studio)', 'Daily 07:00', 'Founders'], ['Module adoption', 'Weekly Mon', 'Product'], ['TDS receivables vs 26AS', 'Monthly 5th', 'CA'], ['Tenant health scores', 'Daily', 'CSM']];
  return (<div data-testid="platform-warehouse"><H t="Data warehouse" sub="Analytics copy of platform data for BI – never queried by the live app" right={<div className="flex gap-2"><Badge tone="amber">Scale-later</Badge><Sim /></div>} />
    <div className="mb-4 rounded-xl bg-amber-50 p-3 text-[13px] text-amber-800">Tagged <b>Scale-later</b>: build after ~100 customers. Until then reports run on read replicas.</div>
    <div className="grid gap-4 lg:grid-cols-2"><Card title="Sync status" pad={false}><DataTable rows={sync} rowKey={(r) => r[0]} columns={[{ key: 'p', header: 'Pipeline', render: (r) => r[0] }, { key: 's', header: 'Status', render: (r) => <Status>{r[1]}</Status> }, { key: 'l', header: 'Last sync', render: (r) => r[2] }, { key: 'v', header: 'Volume', align: 'right', render: (r) => r[3] }]} /></Card>
      <Card title="BI exports" pad={false}><DataTable rows={ex} rowKey={(r) => r[0]} columns={[{ key: 'n', header: 'Export', render: (r) => r[0] }, { key: 's', header: 'Schedule', render: (r) => r[1] }, { key: 'a', header: 'Audience', render: (r) => r[2] }, { key: 'x', header: '', render: () => <Button size="sm">Run now</Button> }]} /></Card></div>
  </div>);
}

export function Security() {
  const [tab, setTab] = useState('Controls');
  const ctl = [['Encryption at rest', 'AES-256 (Cloud SQL + GCS, CMEK)', 'ok'], ['Encryption in transit', 'TLS 1.3, HSTS', 'ok'], ['Per-tenant keys', 'Pro: dedicated KMS key · others: shared key, row-level isolation', 'ok'], ['PII masking', 'Aadhaar/PAN/phone masked in logs, AI context and support views', 'ok'], ['MFA', 'Enforced for platform staff; optional for tenants (73% enabled)', 'warn'], ['SSO', 'Google Workspace / Microsoft (Pro)', 'ok'], ['Backups', 'Daily + 30-day PITR, restore tested 12 Oct', 'ok'], ['DR', 'Hyderabad replica · RPO 15 min, RTO 4 h', 'ok'], ['VAPT', 'Last test Jul 2026 · 0 high, 2 medium open', 'warn'], ['Audit log', 'Immutable, 7-year retention', 'ok']] as [string, string, string][];
  const dsr = [['DSR-018', 'Kaveri Pumps', 'Erasure (ex-employee)', 'In progress', '12 days left'], ['DSR-017', 'Deccan Castings', 'Access request', 'Completed', '—'], ['DSR-016', 'Chola Electricals', 'Consent withdrawal (marketing WhatsApp)', 'Completed', '—']];
  return (<div data-testid="platform-security"><H t="Security & privacy" sub="Controls, DPDP Act requests and assurance" right={<Sim />} />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi label="Controls passing" value={`${ctl.filter((c) => c[2] === 'ok').length}/${ctl.length}`} tone="green" /><Kpi label="Open DPDP requests" value="1" tone="amber" sub="30-day SLA" /><Kpi label="VAPT open findings" value="2 medium" tone="amber" /><Kpi label="Tenants with MFA" value="73%" /></div>
    <Tabs tabs={['Controls', 'DPDP requests', 'Consents']} value={tab} onChange={setTab} />
    {tab === 'Controls' && <div className="grid gap-3 md:grid-cols-2">{ctl.map(([k, v, st]) => <div key={k} className="tile-gloss flex gap-3 rounded-xl border border-slate-200 bg-white/90 p-3">{st === 'ok' ? <CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> : <AlertTriangle size={18} className="shrink-0 text-amber-500" />}<div><div className="flex items-center gap-1 font-medium text-slate-800">{/key|encrypt/i.test(k) ? <KeyRound size={13} /> : <Lock size={13} />}{k}</div><div className="text-[12px] text-slate-500">{v}</div></div></div>)}</div>}
    {tab === 'DPDP requests' && <Card pad={false}><DataTable rows={dsr} rowKey={(r) => r[0]} columns={[{ key: 'i', header: 'Request', render: (r) => r[0] }, { key: 'c', header: 'Company', render: (r) => r[1] }, { key: 't', header: 'Type', render: (r) => r[2] }, { key: 's', header: 'Status', render: (r) => <Status>{r[3]}</Status> }, { key: 'd', header: 'SLA', render: (r) => r[4] }]} /></Card>}
    {tab === 'Consents' && <Card title="Consent records (DPDP)"><div className="grid gap-2 text-[13px] sm:grid-cols-3">{[['WhatsApp business messaging', '18,420 opted in', '312 withdrawn'], ['Call recording', '2,140 opted in', '41 withdrawn'], ['AI processing of documents', 'All tenants (DPA signed)', '0 withdrawn']].map(([a, b, c]) => <div key={a} className="rounded-xl border border-slate-200 p-3"><div className="font-medium">{a}</div><div className="text-emerald-700">{b}</div><div className="text-2xs text-slate-500">{c}</div></div>)}</div></Card>}
  </div>);
}
export const _unused = cx;
