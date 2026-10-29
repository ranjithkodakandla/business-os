import React, { useMemo, useState } from 'react';
import { NavLink, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { Building2, ToggleRight, IndianRupee, Layers, LifeBuoy, Server, Sparkles, ShieldAlert, LogOut, Send } from 'lucide-react';
import { useStore } from '../lib/store';
import { MODULES } from '../lib/nav';
import { Badge, Button, Card, Kpi, DataTable, SearchBox, Select, Status, Tabs, cx } from '../components/ui';
import { PLANS, MRR_TREND, FLAG_KEYS, mrrOf, churnRisk, inrP, lakhP, type Tenant } from './data';
import { STAGES, stageAllows, bucket, INTERNAL, type Stage } from './rollout';
import { platIntent, fillPCard, execP, missing, type PCard, type PMsg } from './agent';

const NAV: [string, string, React.ElementType][] = [['/platform', 'Companies', Building2], ['/platform/flags', 'Feature flags', ToggleRight], ['/platform/billing', 'Billing & revenue', IndianRupee], ['/platform/plans', 'Plans', Layers], ['/platform/support', 'Support', LifeBuoy], ['/platform/tenancy', 'Tenancy & infra', Server], ['/platform/ai', 'Ask AI', Sparkles]];
const label = (k: string) => MODULES.find((m) => m.key === k)?.label.en || k;
const healthTone = (h: number) => (h >= 75 ? 'green' : h >= 55 ? 'amber' : 'red') as 'green' | 'amber' | 'red';

export default function PlatformApp() {
  const { s, update } = useStore(); const nav = useNavigate();
  if (!s.vendor) return (
    <div className="app-canvas flex min-h-screen items-center justify-center p-6"><div data-testid="platform-restricted" className="max-w-md rounded-2xl border border-slate-200 bg-white/90 p-8 text-center shadow-xl">
      <ShieldAlert className="mx-auto mb-3 text-rose-500" size={32} /><div className="text-lg font-semibold text-slate-800">Platform admin is restricted</div>
      <p className="mt-1 text-sm text-slate-500">This console is only for the platform owner. Company users can't open it.</p><Link to="/" className="mt-4 inline-block text-sm font-medium text-brand-700 underline">Back to your workspace</Link></div></div>);
  return (
    <div className="app-canvas min-h-screen">
      <header data-testid="platform-topbar" className="topbar sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-white/60 bg-white/75 px-5 backdrop-blur-xl">
        <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-xs font-bold text-white shadow">B</span><div className="leading-tight"><div className="text-[13px] font-semibold text-slate-800">Business OS</div><div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">Platform admin</div></div></div>
        <nav className="flex flex-1 gap-1 overflow-x-auto">{NAV.map(([to, l, I]) => <NavLink key={to} end={to === '/platform'} to={to} data-pnav={l} className={({ isActive }) => cx('flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium', isActive ? 'tab-active bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100' : 'text-slate-600 hover:bg-white/70')}><I size={15} />{l}</NavLink>)}</nav>
        <div className="flex items-center gap-2 text-[12px] text-slate-500"><span className="hidden lg:inline">Ranjith Kumar · Platform owner</span>
          <Button size="sm" icon={<LogOut size={14} />} data-testid="exit-platform" onClick={() => { update((d) => { d.vendor = false; d.tenant = 't-aarohan'; d.role = 'Owner'; }); nav('/'); }}>Customer app</Button></div>
      </header>
      <main className="mx-auto max-w-[1500px] p-5">
        <Routes>
          <Route path="/platform" element={<Companies />} /><Route path="/platform/companies/:id" element={<CompanyDetail />} /><Route path="/platform/flags" element={<Flags />} />
          <Route path="/platform/billing" element={<Billing />} /><Route path="/platform/plans" element={<Plans />} /><Route path="/platform/support" element={<Support />} />
          <Route path="/platform/tenancy" element={<Tenancy />} /><Route path="/platform/ai" element={<PlatAI />} />
        </Routes>
      </main>
    </div>);
}
const H = ({ t, sub, right }: { t: string; sub?: string; right?: React.ReactNode }) => <div className="mb-4 flex items-end justify-between"><div><h1 className="text-xl font-semibold text-slate-900">{t}</h1>{sub && <p className="text-sm text-slate-500">{sub}</p>}</div>{right}</div>;

function Companies() {
  const { s } = useStore(); const p = s.plat; const nav = useNavigate();
  const [q, setQ] = useState(''); const [plan, setPlan] = useState('All plans'); const [reg, setReg] = useState('All regions'); const [st, setSt] = useState('All status');
  const rows = p.tenants.filter((t) => (!q || t.name.toLowerCase().includes(q.toLowerCase()) || t.city.toLowerCase().includes(q.toLowerCase())) && (plan === 'All plans' || t.plan === plan) && (reg === 'All regions' || t.region === reg) && (st === 'All status' || t.status === st));
  const m = mrrOf(p);
  return (<div data-testid="platform-companies">
    <H t="Companies" sub={`${p.tenants.length} tenants on Business OS`} right={<Button variant="primary" onClick={() => nav('/platform/ai?q=' + encodeURIComponent('create a trial for '))}>+ New trial</Button>} />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Kpi label="MRR" value={lakhP(m)} sub="+3.4% vs Sep" tone="green" /><Kpi label="ARR" value={lakhP(m * 12)} /><Kpi label="Active" value={p.tenants.filter((t) => t.status === 'Active').length} /><Kpi label="Trials" value={p.tenants.filter((t) => t.status === 'Trial').length} tone="blue" /><Kpi label="Churn risk" value={churnRisk(p).length} tone="red" onClick={() => nav('/platform/ai?q=' + encodeURIComponent('which tenants are at churn risk?'))} />
    </div>
    <Card pad={false}><div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3"><SearchBox value={q} onChange={setQ} placeholder="Search company or city…" />
      <Select value={plan} onChange={setPlan} options={['All plans', 'Starter', 'Growth', 'Pro']} /><Select value={reg} onChange={setReg} options={['All regions', 'India-South', 'India-West', 'India-North', 'ME']} /><Select value={st} onChange={setSt} options={['All status', 'Active', 'Trial', 'Suspended']} /></div>
      <DataTable<Tenant> rows={rows} rowKey={(t) => t.id} onRowClick={(t) => nav('/platform/companies/' + t.id)} columns={[
        { key: 'n', header: 'Company', render: (t) => <div data-tenant={t.id}><div className="font-medium text-slate-800">{t.name}</div><div className="text-2xs text-slate-400">{t.city} · {t.industry}</div></div> },
        { key: 'p', header: 'Plan', render: (t) => <Badge tone={t.plan === 'Pro' ? 'violet' : t.plan === 'Growth' ? 'blue' : 'gray'}>{t.plan}</Badge> },
        { key: 'r', header: 'Region', render: (t) => t.region }, { key: 's', header: 'Status', render: (t) => <Status>{t.status}</Status> },
        { key: 'u', header: 'Users', align: 'right', render: (t) => t.users }, { key: 'm', header: 'MRR', align: 'right', render: (t) => t.mrr ? inrP(t.mrr) : '—' },
        { key: 'h', header: 'Health', render: (t) => <div className="flex items-center gap-2"><div className="h-1.5 w-16 rounded bg-slate-100"><div className={cx('h-1.5 rounded', t.health >= 75 ? 'bg-emerald-500' : t.health >= 55 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: t.health + '%' }} /></div><span className="text-2xs">{t.health}</span></div> },
        { key: 'l', header: 'Last active', render: (t) => t.lastActive },
      ]} /></Card></div>);
}

function FlagGrid({ ids }: { ids: string[] }) {
  const { s, update } = useStore(); const p = s.plat;
  const eff = (id: string, k: string) => p.flags[id]?.[k] !== false && stageAllows(p.rollout[k], k, id);
  return (<div className="overflow-auto rounded-xl border border-slate-200 bg-white/90"><table className="min-w-full text-[12px]"><thead><tr className="bg-slate-50"><th className="sticky left-0 bg-slate-50 px-3 py-2 text-left">Module</th>{ids.map((id) => <th key={id} className="px-2 py-2 text-center font-medium text-slate-600">{p.tenants.find((t) => t.id === id)!.name.split(' ').slice(0, 2).join(' ')}</th>)}</tr></thead>
    <tbody>{FLAG_KEYS.map((k) => <tr key={k} className="border-t border-slate-100"><td className="sticky left-0 bg-white px-3 py-1.5 font-medium text-slate-700">{label(k)}</td>{ids.map((id) => { const on = p.flags[id]?.[k] !== false; return <td key={id} className="px-2 py-1 text-center">
      <button data-flag={`${id}:${k}`} data-on={on ? '1' : '0'} aria-label={`${label(k)} for ${id}`} onClick={() => update((d) => { d.plat.flags[id][k] = !on; d.plat.log.unshift({ at: new Date().toTimeString().slice(0, 5), tenant: id, text: `Platform: ${label(k)} turned ${on ? 'off' : 'on'}` }); }, `Platform: ${label(k)} ${on ? 'off' : 'on'} for ${p.tenants.find((t) => t.id === id)!.name}`)} className={cx('relative h-5 w-9 rounded-full transition', on ? 'bg-emerald-500' : 'bg-slate-300')}><span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition', on ? 'left-[18px]' : 'left-0.5')} /></button>{on && !eff(id, k) && <span title="Entitled, but held back by rollout stage / kill switch" data-held={`${id}:${k}`} className="ml-1 text-[10px] text-amber-600">⏸</span>}</td>; })}</tr>)}</tbody></table></div>);
}
function Flags() { const { s } = useStore(); const [tab, setTab] = useState('Rollouts');
  return <div data-testid="platform-flags"><H t="Feature flags" sub="Release stages per flag, plus per-company entitlements. Changes apply live — Aarohan Industries (internal tenant) is the one you can open in the customer app." />
  <Tabs tabs={['Rollouts', 'Company grid']} value={tab} onChange={setTab} /><div className="mt-4">{tab === 'Rollouts' ? <Rollouts /> : <FlagGrid ids={s.plat.tenants.map((t) => t.id)} />}</div></div>; }
const STAGE_TONE: Record<Stage, 'gray' | 'violet' | 'amber' | 'blue' | 'green' | 'red'> = { Off: 'gray', Internal: 'violet', Alpha: 'amber', Beta: 'blue', Gradual: 'blue', GA: 'green' };
function Rollouts() {
  const { s, update } = useStore(); const p = s.plat; const [sel, setSel] = useState('agents'); const [kill, setKill] = useState('');
  const r = p.rollout[sel]; const now = () => new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const tn = (id: string) => p.tenants.find((t) => t.id === id)?.name || id;
  const change = (fn: (x: typeof r) => void, text: string, k = sel) => update((d) => { const x = d.plat.rollout[k]; fn(x); if (/^Gradual \d/.test(text) && /^Gradual \d/.test(x.history[0]?.text || '') && x.history[0].at === now()) x.history[0].text = text; else x.history.unshift({ at: now(), by: 'Ranjith Kumar', text }); d.plat.log.unshift({ at: new Date().toTimeString().slice(0, 5), tenant: 't-aarohan', text: `Flag ${label(k)}: ${text}` }); }, `Platform flag ${label(k)}: ${text}`, { module: 'platform', action: text, record: k });
  const gets = p.tenants.filter((t) => p.flags[t.id]?.[sel] !== false && stageAllows(r, sel, t.id));
  const pick = (list: 'alpha' | 'beta') => <div className="flex flex-wrap gap-1">{p.tenants.filter((t) => !INTERNAL.includes(t.id)).map((t) => { const on = r[list].includes(t.id); return <button key={t.id} data-pick={`${list}:${t.id}`} onClick={() => change((x) => { x[list] = on ? x[list].filter((y) => y !== t.id) : [...x[list], t.id]; }, `${list === 'alpha' ? 'Alpha' : 'Beta opt-in'} ${on ? '−' : '+'} ${t.name}`)} className={cx('rounded-full border px-2 py-0.5 text-[11px]', on ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500')}>{t.name.split(' ').slice(0, 2).join(' ')}</button>; })}</div>;
  return (<div className="grid gap-4 lg:grid-cols-[340px_1fr]">
    <Card pad={false} title="Flags"><div className="max-h-[640px] overflow-auto">{FLAG_KEYS.map((k) => { const x = p.rollout[k]; return <button key={k} data-rflag={k} onClick={() => setSel(k)} className={cx('flex w-full items-center justify-between border-b border-slate-50 px-3 py-2 text-left text-[13px]', sel === k && 'bg-indigo-50/60')}><span>{label(k)}</span>{x.killed ? <Badge tone="red">Killed</Badge> : <Badge tone={STAGE_TONE[x.stage]}>{x.stage === 'Gradual' ? `Gradual ${x.pct}%` : x.stage}</Badge>}</button>; })}</div></Card>
    <div className="space-y-4" data-testid="rollout-detail">
      <Card title={<span>{label(sel)} <span className="text-2xs font-normal text-slate-400">flag key: module.{sel}</span></span>} actions={r.killed
        ? <Button size="sm" data-testid="kill-restore" onClick={() => change((x) => { x.killed = false; }, 'Kill switch released')}>Release kill switch</Button>
        : <Button size="sm" variant="danger" data-testid="kill-switch" onClick={() => setKill(sel)}>⛔ Kill switch</Button>}>
        {r.killed && <div data-testid="killed-banner" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700">Killed — disabled for every company right now.</div>}
        <div className="flex flex-wrap gap-1" data-testid="stage-picker">{STAGES.map((st) => <button key={st} data-stage={st} disabled={r.killed} onClick={() => change((x) => { x.stage = st; }, `Stage → ${st === 'Gradual' ? `Gradual ${r.pct}%` : st}`)} className={cx('rounded-lg border px-3 py-1.5 text-[12px] font-medium', r.stage === st ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600', r.killed && 'opacity-40')}>{st}</button>)}</div>
        <div className="mt-3 text-[12px] text-slate-500">{({ Off: 'Nobody gets it.', Internal: 'Only our internal tenant (Aarohan Industries).', Alpha: 'Internal + hand-picked alpha companies.', Beta: 'Internal + alpha + companies that opted in.', Gradual: 'Internal + a deterministic % of companies (hash of flag + company id, stable as % grows).', GA: 'Everyone entitled by plan.' } as Record<Stage, string>)[r.stage]}</div>
        {r.stage === 'Alpha' && <div className="mt-3"><div className="mb-1 text-2xs font-semibold text-slate-500">Alpha companies</div>{pick('alpha')}</div>}
        {r.stage === 'Beta' && <div className="mt-3"><div className="mb-1 text-2xs font-semibold text-slate-500">Beta opt-ins</div>{pick('beta')}</div>}
        {r.stage === 'Gradual' && <div className="mt-3 flex items-center gap-3"><input data-testid="rollout-pct" type="range" min={0} max={100} step={5} value={r.pct} onChange={(e) => { const v = +e.target.value; update((d) => { d.plat.rollout[sel].pct = v; }); }} onMouseUp={() => change(() => {}, `Gradual ${r.pct}%`)} onKeyUp={() => change(() => {}, `Gradual ${r.pct}%`)} className="w-72 accent-indigo-600" /><span data-testid="pct-label" className="font-semibold">{r.pct}%</span></div>}
      </Card>
      <Card title={`Who gets it now · ${gets.length} of ${p.tenants.length}`} pad={false}><div data-testid="who-gets" className="grid grid-cols-2 gap-x-4 p-3 text-[12px] lg:grid-cols-3">{p.tenants.map((t) => { const g = gets.includes(t); return <div key={t.id} data-gets={t.id} data-on={g ? '1' : '0'} className={cx('flex items-center justify-between border-b border-slate-50 py-1', !g && 'text-slate-400')}><span>{g ? '✓' : '–'} {t.name}</span><span className="text-[10px]">{INTERNAL.includes(t.id) ? 'internal' : r.stage === 'Gradual' ? `bucket ${bucket(sel, t.id)}` : p.flags[t.id]?.[sel] === false ? 'not in plan' : ''}</span></div>; })}</div></Card>
      <Card title="Rollout history" pad={false}><div data-testid="rollout-history">{r.history.map((h, i) => <div key={i} className="flex gap-3 border-b border-slate-50 px-3 py-1.5 text-[12px]"><span className="w-28 shrink-0 text-slate-400">{h.at}</span><span className="flex-1">{h.text}</span><span className="text-slate-400">{h.by}</span></div>)}</div></Card>
    </div>
    {kill && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40"><div data-testid="kill-confirm" className="w-[420px] rounded-2xl bg-white p-5 shadow-2xl"><div className="text-lg font-semibold text-rose-700">Kill {label(kill)} everywhere?</div><p className="mt-1 text-sm text-slate-600">Instantly disables it for all {p.tenants.length} companies, overriding stage and plan. Logged to the audit trail.</p>
      <div className="mt-4 flex justify-end gap-2"><Button onClick={() => setKill('')}>Cancel</Button><Button variant="danger" data-testid="kill-confirm-yes" onClick={() => { change((x) => { x.killed = true; }, 'KILL SWITCH — disabled everywhere', kill); setKill(''); }}>Kill now</Button></div></div></div>}
  </div>);
}

function CompanyDetail() {
  const { id = '' } = useParams(); const { s, update } = useStore(); const nav = useNavigate(); const p = s.plat; const t = p.tenants.find((x) => x.id === id);
  const [tab, setTab] = useState('Overview');
  if (!t) return <div>Company not found. <Link to="/platform" className="underline">Back</Link></div>;
  const usage = Object.entries(t.usage).map(([k, v]) => ({ m: label(k), v }));
  const inv = p.invoices.filter((i) => i.tenant === id);
  const users = ['Owner', 'Accounts', 'Sales', 'Stores', 'HR', 'Supervisor'].slice(0, Math.min(6, t.users)).map((r, i) => [['Ravi', 'Priya', 'Suresh', 'Lakshmi', 'Imran', 'Kavya'][i] + ' ' + t.name.split(' ')[0].slice(0, 1) + '.', r, i < 3 ? 'Today' : `${i} days ago`]);
  return (<div data-testid="platform-company">
    <H t={t.name} sub={`${t.city} · ${t.industry} · since ${t.since} · GSTIN ${t.gstin}`} right={<div className="flex gap-2"><Button onClick={() => nav('/platform')}>← Companies</Button><Button variant="primary" data-testid="view-as-company" onClick={() => { update((d) => { d.tenant = t.id; d.role = 'Owner'; }); nav('/'); }}>View as this company</Button></div>} />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5"><Kpi label="Plan" value={t.plan} /><Kpi label="Status" value={t.status} /><Kpi label="Users" value={t.users} /><Kpi label="MRR" value={t.mrr ? inrP(t.mrr) : '—'} /><Kpi label="Health" value={t.health} tone={healthTone(t.health)} /></div>
    <Tabs tabs={['Overview', 'Users', 'Activity', 'Invoices', 'Feature flags']} value={tab} onChange={setTab} />
    <div className="mt-4">
      {tab === 'Overview' && <Card title="Module usage (sessions, last 30 days)"><div className="h-64"><ResponsiveContainer><BarChart data={usage}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="v" fill="#6366f1" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>}
      {tab === 'Users' && <Card pad={false}><DataTable<string[]> rows={users} rowKey={(r) => r[0]} columns={[{ key: 'a', header: 'Name', render: (r) => r[0] }, { key: 'b', header: 'Role', render: (r) => r[1] }, { key: 'c', header: 'Last login', render: (r) => r[2] }]} /><div className="p-3 text-2xs text-slate-400">Showing 6 of {t.users} users</div></Card>}
      {tab === 'Activity' && <Card title="Activity & audit">{(p.log.filter((l) => l.tenant === id).length ? p.log.filter((l) => l.tenant === id) : [{ at: '—', tenant: id, text: 'No platform events in last 24h' }]).map((l, i) => <div key={i} className="border-b border-slate-100 py-2 text-[13px]"><span className="mr-3 text-slate-400">{l.at}</span>{l.text}</div>)}</Card>}
      {tab === 'Invoices' && <Card pad={false}><DataTable rows={inv} rowKey={(i) => i.id} empty="Trial – no invoices yet" columns={[{ key: 'i', header: 'Invoice', render: (i) => i.id }, { key: 'm', header: 'Month', render: (i) => i.month }, { key: 'a', header: 'Amount', align: 'right', render: (i) => inrP(i.amount) }, { key: 'g', header: 'GST 18%', align: 'right', render: (i) => inrP(i.gst) }, { key: 's', header: 'Status', render: (i) => <Status>{i.status}</Status> }]} /></Card>}
      {tab === 'Feature flags' && <FlagGrid ids={[id]} />}
    </div></div>);
}

function Billing() {
  const { s, update } = useStore(); const p = s.plat; const m = mrrOf(p); const bad = p.invoices.filter((i) => i.status !== 'Paid');
  const name = (id: string) => p.tenants.find((t) => t.id === id)!.name;
  return (<div data-testid="platform-billing"><H t="Billing & revenue" sub="Subscriptions, dunning and GST invoices (demo — no payment gateway calls)" />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi label="MRR" value={lakhP(m)} tone="green" sub="+3.4% MoM" /><Kpi label="ARR" value={lakhP(m * 12)} /><Kpi label="Failed / due (Oct)" value={bad.filter((i) => i.month === 'Oct 2026').length} tone="red" /><Kpi label="GST collected (Oct)" value={lakhP(p.invoices.filter((i) => i.month === 'Oct 2026' && i.status === 'Paid').reduce((a, i) => a + i.gst, 0))} /></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="MRR trend (₹ lakh)"><div className="h-60"><ResponsiveContainer><AreaChart data={MRR_TREND}><defs><linearGradient id="pm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6366f1" stopOpacity={0.4} /><stop offset="1" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Area dataKey="v" stroke="#6366f1" fill="url(#pm)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></Card>
      <Card title="Failed payments & dunning" pad={false}><DataTable rows={bad} rowKey={(i) => i.id} columns={[{ key: 't', header: 'Company', render: (i) => name(i.tenant) }, { key: 'm', header: 'Month', render: (i) => i.month }, { key: 'a', header: 'Amount', align: 'right', render: (i) => inrP(i.amount + i.gst) }, { key: 's', header: 'Status', render: (i) => <Status>{i.status}</Status> }, { key: 'r', header: 'Dunning', render: (i) => <span className="text-2xs">{i.attempts >= 4 ? 'Suspended after 4 retries' : `Retry ${i.attempts}/4`}</span> },
        { key: 'x', header: '', render: (i) => <Button size="sm" onClick={() => update((d) => { const x = d.plat.invoices.find((y) => y.id === i.id)!; x.status = 'Paid'; }, `Platform: marked ${i.id} paid`)}>Mark paid</Button> }]} /></Card>
    </div>
    <Card title="Subscriptions" className="mt-4" pad={false}><DataTable rows={p.tenants} rowKey={(t) => t.id} columns={[{ key: 'n', header: 'Company', render: (t) => t.name }, { key: 'p', header: 'Plan', render: (t) => t.plan }, { key: 's', header: 'Status', render: (t) => <Status>{t.status}</Status> }, { key: 'c', header: 'Billing', render: (t) => t.status === 'Trial' ? 'Trial ends 12 Nov' : t.region === 'ME' ? 'Annual · AED invoice' : 'Monthly · UPI autopay' }, { key: 'm', header: 'MRR', align: 'right', render: (t) => t.mrr ? inrP(t.mrr) : '—' }]} /></Card>
    <Card title="GST invoices (Oct 2026)" className="mt-4" pad={false}><DataTable rows={p.invoices.filter((i) => i.month === 'Oct 2026')} rowKey={(i) => i.id} columns={[{ key: 'i', header: 'Invoice no.', render: (i) => i.id }, { key: 't', header: 'Company', render: (i) => name(i.tenant) }, { key: 'a', header: 'Taxable', align: 'right', render: (i) => inrP(i.amount) }, { key: 'g', header: 'IGST/CGST+SGST 18%', align: 'right', render: (i) => inrP(i.gst) }, { key: 's', header: 'Status', render: (i) => <Status>{i.status}</Status> }]} /></Card>
  </div>);
}
function Plans() { const { s } = useStore();
  return (<div data-testid="platform-plans"><H t="Plans" sub="Price per company per month, excl. GST" /><div className="grid gap-4 lg:grid-cols-3">{PLANS.map((pl) => <div key={pl.name} data-plan={pl.name} className={cx('tile-gloss rounded-2xl border bg-white/90 p-5 shadow-sm', pl.name === 'Growth' ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200')}>
    <div className="flex items-center justify-between"><div className="text-lg font-semibold">{pl.name}</div><Badge tone="gray">{s.plat.tenants.filter((t) => t.plan === pl.name).length} companies</Badge></div>
    <div className="mt-1 text-3xl font-bold text-slate-900">{inrP(pl.price)}<span className="text-sm font-normal text-slate-400"> /month</span></div><p className="mt-1 text-sm text-slate-500">{pl.blurb}</p>
    <div className="mt-3 space-y-1 text-[13px] text-slate-700"><div>👥 {pl.users}</div><div>🤖 {pl.agents}</div><div>💾 {pl.storage}</div></div>
    <div className="mt-3 flex flex-wrap gap-1">{pl.modules.filter((k) => k !== 'home').map((k) => <span key={k} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{label(k)}</span>)}</div></div>)}</div></div>); }
function Support() { const { s } = useStore(); const p = s.plat;
  return (<div data-testid="platform-support"><H t="Support" sub="Tickets raised by tenants · SLA P1 4h, P2 24h, P3 48h" /><Card pad={false}><DataTable rows={p.tickets} rowKey={(t) => t.id} columns={[{ key: 'i', header: 'Ticket', render: (t) => t.id }, { key: 'c', header: 'Company', render: (t) => p.tenants.find((x) => x.id === t.tenant)!.name }, { key: 's', header: 'Subject', render: (t) => t.subject }, { key: 'p', header: 'Priority', render: (t) => <Badge tone={t.priority === 'P1' ? 'red' : t.priority === 'P2' ? 'amber' : 'gray'}>{t.priority}</Badge> }, { key: 'st', header: 'Status', render: (t) => <Status>{t.status}</Status> },
    { key: 'sla', header: 'SLA', render: (t) => t.status === 'Resolved' ? <span className="text-slate-400">Met</span> : t.ageHrs > t.slaHrs ? <Badge tone="red">Breached {t.ageHrs - t.slaHrs}h</Badge> : <Badge tone="green">{t.slaHrs - t.ageHrs}h left</Badge> }, { key: 'o', header: 'Owner', render: (t) => t.owner }]} /></Card></div>); }
function Tenancy() { const { s } = useStore(); const p = s.plat;
  const regions = [['India-South', 'asia-south1 (Mumbai) + Hyderabad DR', 'India (DPDP)'], ['India-West', 'asia-south1 (Mumbai)', 'India (DPDP)'], ['India-North', 'asia-south2 (Delhi)', 'India (DPDP)'], ['ME', 'me-central1 (Doha)', 'UAE / GCC']];
  return (<div data-testid="platform-tenancy"><H t="Tenancy & infra" sub="Where each company's data lives and which version it runs" />
    <div className="mb-4 grid gap-3 lg:grid-cols-4">{regions.map(([r, c, res]) => <div key={r} className="tile-gloss rounded-xl border border-slate-200 bg-white/90 p-4"><div className="font-semibold">{r}</div><div className="text-2xs text-slate-500">{c}</div><div className="mt-2 text-[12px]">Residency: <b>{res}</b></div><div className="text-[12px]">{p.tenants.filter((t) => t.region === r).length} tenants</div></div>)}</div>
    <Card pad={false}><DataTable rows={p.tenants} rowKey={(t) => t.id} columns={[{ key: 'n', header: 'Company', render: (t) => t.name }, { key: 'r', header: 'Region', render: (t) => t.region }, { key: 'd', header: 'Database', render: (t) => <Badge tone={t.db === 'Dedicated' ? 'violet' : 'gray'}>{t.db} DB</Badge> }, { key: 'v', header: 'Version', render: (t) => <span className={t.version === 'v2.14.0' ? 'text-emerald-700' : 'text-amber-700'}>{t.version}{t.version !== 'v2.14.0' && ' · update pending'}</span> }, { key: 'b', header: 'Backups', render: () => 'Daily · 30-day PITR' }]} /></Card></div>); }

function CardView({ c, onConfirm, onCancel }: { c: PCard; onConfirm?: () => void; onCancel?: () => void }) {
  const miss = missing(c);
  return (<div data-pcard={c.kind} data-status={c.status || ''} className="agent-panel rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
    <div className="font-semibold text-slate-800">{c.title}</div>{c.sub && <div className="text-2xs text-slate-500">{c.sub}</div>}
    {c.kpis && <div className="mt-2 grid grid-cols-4 gap-2">{c.kpis.map(([k, v]) => <div key={k} className="rounded-lg bg-slate-50 p-2"><div className="text-[10px] text-slate-400">{k}</div><div className="font-semibold">{v}</div></div>)}</div>}
    {c.chart && <div className="mt-2 h-40"><ResponsiveContainer><AreaChart data={c.chart}><XAxis dataKey="m" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Area dataKey="v" stroke="#6366f1" fill="#c7d2fe" /></AreaChart></ResponsiveContainer></div>}
    {c.table && <table className="mt-2 w-full text-[12px]"><thead><tr>{c.table.cols.map((h) => <th key={h} className="border-b border-slate-100 py-1 text-left text-slate-500">{h}</th>)}</tr></thead><tbody>{c.table.rows.map((r, i) => <tr key={i}>{r.map((x, j) => <td key={j} className="border-b border-slate-50 py-1">{x}</td>)}</tr>)}</tbody></table>}
    {c.fields && <div className="mt-2 grid grid-cols-3 gap-2">{c.fields.map((f) => <div key={f.k} data-field={f.k} className={cx('rounded-lg border p-2', f.value ? 'border-slate-200' : 'border-amber-300 bg-amber-50')}><div className="text-[10px] text-slate-400">{f.label}</div><div className="text-[13px] font-medium">{f.value || 'needed'}</div></div>)}</div>}
    {c.status === 'pending' && <div className="mt-3 flex items-center gap-2">{miss.length ? <span className="text-2xs text-amber-700">Reply with {miss.join(', ')} to continue</span> : <Button variant="primary" size="sm" data-testid="pcard-confirm" onClick={onConfirm}>Confirm</Button>}<Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button></div>}
    {c.status === 'done' && <div className="mt-2 text-[13px] font-medium text-emerald-700">✓ {c.result}</div>}{c.status === 'cancelled' && <div className="mt-2 text-2xs text-slate-400">Cancelled</div>}
  </div>);
}
function PlatAI() {
  const { update } = useStore(); const { s } = useStore();
  const init = useMemo(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('q') || '', []);
  const [msgs, setMsgs] = useState<PMsg[]>([{ role: 'ai', text: 'Hi Ranjith — ask about tenants, billing, churn or flags. I show a card before changing anything.' }]); const [q, setQ] = useState(init);
  const pending = [...msgs].reverse().find((m) => m.card?.status === 'pending')?.card;
  const setCard = (c: PCard) => setMsgs((ms) => ms.map((m) => (m.card?.id === c.id ? { ...m, card: c } : m)));
  const send = (t: string) => { if (!t.trim()) return; setQ('');
    const fresh = platIntent(t, s.plat);
    if (pending && missing(pending).length && (!fresh || (fresh.kind === 'view' && t.trim().split(/\s+/).length <= 5) || fresh.action === pending.action)) { const f = fillPCard(pending, t); if (f) { setMsgs((ms) => [...ms.map((m) => (m.card?.id === f.id ? { ...m, card: f } : m)), { role: 'user', text: t }, { role: 'ai', text: missing(f).length ? `Got it. Still need: ${missing(f).join(', ')}.` : 'All set — confirm to apply.' }]); return; } }
    setMsgs((ms) => [...ms, { role: 'user', text: t }, fresh ? { role: 'ai', card: fresh } : { role: 'ai', text: "Try: “which companies haven't paid this month?”, “turn on Payroll for Deccan Castings”, “show MRR trend”, “which tenants are at churn risk?”, “create a trial for XYZ Forgings on Growth plan”." }]); };
  const confirm = (c: PCard) => { let r = ''; update((d) => { r = execP(d.plat, c); }, `Platform AI: ${c.title}`); setCard({ ...c, status: 'done', result: r || 'Done' }); };
  const chips = ["which companies haven't paid this month?", 'turn on Payroll for Deccan Castings', 'show MRR trend', 'which tenants are at churn risk?', 'create a trial for XYZ Forgings on Growth plan'];
  return (<div data-testid="platform-ai" className="mx-auto max-w-4xl"><H t="Ask AI" sub="Platform assistant — answers with cards, asks before changing" />
    <div className="space-y-3">{msgs.map((m, i) => <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>{m.card ? <CardView c={m.card} onConfirm={() => confirm(m.card!)} onCancel={() => setCard({ ...m.card!, status: 'cancelled' })} /> : <div data-msg={m.role} className={cx('inline-block rounded-2xl px-4 py-2 text-[13px]', m.role === 'user' ? 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white' : 'bg-white/90 text-slate-700 shadow-sm')}>{m.text}</div>}</div>)}</div>
    <div className="mt-4 flex flex-wrap gap-2">{chips.map((c) => <button key={c} onClick={() => send(c)} className="chip-gloss rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[12px] text-slate-600">{c}</button>)}</div>
    <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(q); }}><input data-testid="platform-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your tenants…" className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-200" /><Button variant="primary" icon={<Send size={15} />} type="submit">Send</Button></form>
  </div>);
}
