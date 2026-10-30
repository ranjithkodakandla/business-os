// P1/P2 module pages: BOM & production, Quality, Bank & TDS, Expenses, Dispatch, Notifications, Documents.
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, ChevronDown, FileText, Upload, Bell, Truck, Package, Check, X, ScanLine, Landmark, ShieldCheck, Factory, Receipt, FolderOpen, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from 'recharts';
import { PageHeader, Card, Button, DataTable, Kpi, Tabs, Badge, Status, Progress, Callout, SearchBox, Toolbar, Modal, Field, Fields, cx, type Tone } from '../components/ui';
import { askInChat } from '../components/DataViews';
import { useP1, updateP1, mrp, supplierScore, flatBom, type BomNode, type Role, type Expense } from '../lib/p1Data';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const inrL = (n: number) => (Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, '')} L` : inr(n));
const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const useTabP = (def: string): [string, (t: string) => void] => { const [sp, setSp] = useSearchParams(); return [sp.get('tab') || def, (t) => { const n = new URLSearchParams(sp); n.set('tab', t); setSp(n, { replace: true }); }]; };
const ask = (t: string) => { askInChat(t); };

function AskBar({ prompts }: { prompts: string[] }) {
  const nav = useNavigate();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 via-violet-50 to-white px-3 py-2.5" data-testid="ask-bar">
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-700"><Sparkles size={14} /> Ask AI</span>
      {prompts.map((p) => <button key={p} data-ask={p} onClick={() => { nav('/'); setTimeout(() => ask(p), 150); }} className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[12px] text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:text-brand-700">{p}</button>)}
    </div>
  );
}
const Hero = ({ icon, tone, children }: { icon: React.ReactNode; tone: string; children: React.ReactNode }) => (
  <div className={cx('flex items-center gap-3 rounded-2xl p-4 text-white shadow-lift', tone)}><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20">{icon}</div><div className="text-[13.5px] leading-snug">{children}</div></div>
);
const toneCls: Record<string, string> = { red: '#f43f5e', amber: '#f59e0b', green: '#10b981', blue: '#6366f1' };

/* =============== 1. BOM & production =============== */
function BomTree({ n, lvl = 0, mult = 1 }: { n: BomNode; lvl?: number; mult?: number }) {
  const [open, setOpen] = useState(lvl < 2);
  const need = n.qty * mult;
  return (
    <div>
      <div className={cx('flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-slate-50', lvl === 0 && 'bg-brand-50/60 font-semibold')} style={{ paddingLeft: 8 + lvl * 22 }}>
        {n.children ? <button onClick={() => setOpen(!open)} className="text-slate-400">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button> : <span className="w-[14px]" />}
        <span className="font-mono text-2xs text-slate-400">{n.code}</span>
        <span className="flex-1 text-slate-800">{n.name}</span>
        <Badge tone={n.make ? 'violet' : 'gray'}>{n.make ? 'Make' : 'Buy'}</Badge>
        <span className="w-20 text-right tabular text-slate-600">{need} {n.unit}</span>
        <span className="w-20 text-right tabular text-slate-500">{inr(n.cost)}</span>
        <span className={cx('w-16 text-right tabular', n.stock < need ? 'text-rose-600' : 'text-emerald-700')}>{n.stock}</span>
      </div>
      {open && n.children?.map((c) => <BomTree key={c.code + lvl} n={c} lvl={lvl + 1} mult={need} />)}
    </div>
  );
}
export function Production() {
  const s = useP1(); const [tab, setTab] = useTabP('BOM'); const [code, setCode] = useState('FG-A17'); const [qty, setQty] = useState(500);
  const req = mrp(code, qty); const short = req.filter((r) => r.short > 0);
  const stages = ['Planned', 'Released', 'In progress', 'QC', 'Done'] as const;
  const b = s.boms.find((x) => x.code === code)!;
  return (
    <div className="space-y-4" data-page="production">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'BOM & Production' }]} title="BOM & Production planning" subtitle="Multi-level bills of material, material requirement (MRP), work orders and cost versus plan" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Open work orders" value={String(s.wos.filter((w) => w.stage !== 'Done').length)} sub={`${s.wos.filter((w) => w.stage === 'In progress').length} running`} />
        <Kpi label="Planned output" value={String(sum(s.wos.filter((w) => w.stage !== 'Done'), (w) => w.qty))} sub="units this fortnight" />
        <Kpi label="Plan cost (open)" value={inrL(sum(s.wos.filter((w) => w.stage !== 'Done'), (w) => w.planCost))} />
        <Kpi label="Material shortfalls" value={String(short.length)} sub={`for ${qty} × ${b.name.split(' ')[0]}`} tone={short.length ? 'red' : 'green'} />
      </div>
      <AskBar prompts={['Plan 500 A-17 housings next week', 'Show BOM for A-17', 'Production status']} />
      <Tabs tabs={['BOM', 'MRP', 'Work orders', 'Cost vs plan']} value={tab} onChange={setTab} />
      {tab === 'BOM' && <Card title="Bill of materials" subtitle="Click a sub-assembly to expand. Red stock = less than one unit's need." actions={<div className="flex gap-1">{s.boms.map((x) => <Button key={x.code} size="sm" variant={code === x.code ? 'primary' : 'secondary'} onClick={() => setCode(x.code)}>{x.name.split(' ').slice(0, 2).join(' ')}</Button>)}</div>}>
        <div className="mb-1 flex px-2 text-2xs font-semibold uppercase tracking-wide text-slate-400"><span className="flex-1 pl-6">Part</span><span className="w-20 text-right">Qty</span><span className="w-20 text-right">Std cost</span><span className="w-16 text-right">Stock</span></div>
        <div data-testid="bom-tree"><BomTree n={b} /></div>
      </Card>}
      {tab === 'MRP' && <Card title="Material requirement" subtitle="Explodes the BOM for the planned quantity against stores stock" actions={<div className="flex items-center gap-2 text-[12.5px]">Plan <input type="number" value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value))} className="h-7 w-20 rounded-md border border-slate-200 px-2" /> × <select value={code} onChange={(e) => setCode(e.target.value)} className="h-7 rounded-md border border-slate-200 px-1">{s.boms.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}</select></div>}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"><div className="col-span-3"><DataTable rowKey={(r) => r.code} rows={req} highlight={(r) => r.short > 0} columns={[
          { key: 'n', header: 'Material', render: (r) => <div><div className="font-medium">{r.name}</div><div className="font-mono text-2xs text-slate-400">{r.code}</div></div> },
          { key: 'need', header: 'Need', align: 'right', render: (r) => `${r.need} ${r.unit}` },
          { key: 'st', header: 'On hand', align: 'right', render: (r) => r.stock },
          { key: 'sh', header: 'Short', align: 'right', render: (r) => r.short ? <span className="font-semibold text-rose-600">{r.short}</span> : <Check size={14} className="ml-auto text-emerald-600" /> },
        ]} /></div>
        <div className="col-span-2 space-y-3"><div className="h-56"><ResponsiveContainer><BarChart data={req.map((r) => ({ n: r.name.split(' ').slice(0, 2).join(' '), cover: Math.min(150, Math.round((r.stock / r.need) * 100)) }))} layout="vertical" margin={{ left: 10 }}><XAxis type="number" hide /><YAxis type="category" dataKey="n" width={110} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="cover" radius={4}>{req.map((r) => <Cell key={r.code} fill={r.short ? toneCls.red : toneCls.green} />)}</Bar></BarChart></ResponsiveContainer></div>
          {short.length > 0 ? <Callout tone="red" title={`${short.length} shortfalls · ${inrL(sum(short, (r) => r.short * r.cost))} to buy`} action={<Button size="sm" variant="primary" onClick={() => location.assign('#/sourcing/live')}>Source with AI agent</Button>}>The sourcing agent can ask your allowlisted suppliers for price and lead time.</Callout> : <Callout tone="green" title="All material in stock">Release the work order.</Callout>}</div></div>
      </Card>}
      {tab === 'Work orders' && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5" data-testid="wo-board">{stages.map((st) => <div key={st} className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-2"><div className="mb-2 flex items-center justify-between px-1 text-2xs font-semibold uppercase tracking-wide text-slate-500">{st}<span className="rounded-full bg-white px-1.5">{s.wos.filter((w) => w.stage === st).length}</span></div>
        <div className="space-y-2">{s.wos.filter((w) => w.stage === st).map((w) => <div key={w.id} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-card"><div className="flex items-center justify-between text-[12px]"><span className="font-semibold text-brand-700">{w.id}</span><span className="text-slate-400">due {w.due.slice(5)}</span></div><div className="mt-1 text-[12.5px] text-slate-800">{w.product}</div><div className="text-2xs text-slate-400">{w.qty} nos · {w.line}</div><div className="mt-2"><Progress value={w.progress} tone={w.progress >= 80 ? 'green' : 'blue'} /></div>
          {st !== 'Done' && <button className="mt-2 text-2xs font-medium text-brand-700 hover:underline" onClick={() => updateP1((d) => { const x = d.wos.find((y) => y.id === w.id)!; x.stage = stages[stages.indexOf(st) + 1]; if (x.stage === 'Done') x.progress = 100; })}>Move to {stages[stages.indexOf(st) + 1]} →</button>}</div>)}</div></div>)}</div>}
      {tab === 'Cost vs plan' && <Card title="Cost versus plan" subtitle="Actual material + labour + overhead booked against each work order">
        <div className="h-64"><ResponsiveContainer><BarChart data={s.wos.filter((w) => w.actualCost).map((w) => ({ id: w.id, Plan: Math.round(w.planCost * (w.progress / 100)), Actual: w.actualCost }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="id" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => inr(v)} /><Bar dataKey="Plan" fill="#c7d2fe" radius={4} /><Bar dataKey="Actual" fill="#6366f1" radius={4} /></BarChart></ResponsiveContainer></div>
        <DataTable rowKey={(w) => w.id} rows={s.wos.filter((w) => w.actualCost)} columns={[{ key: 'i', header: 'WO', render: (w) => w.id }, { key: 'p', header: 'Product', render: (w) => w.product }, { key: 'e', header: 'Earned plan', align: 'right', render: (w) => inr(w.planCost * w.progress / 100) }, { key: 'a', header: 'Actual', align: 'right', render: (w) => inr(w.actualCost) }, { key: 'v', header: 'Variance', align: 'right', render: (w) => { const v = (w.actualCost / (w.planCost * w.progress / 100) - 1) * 100; return <span className={v > 0 ? 'text-rose-600' : 'text-emerald-700'}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</span>; } }]} />
      </Card>}
    </div>
  );
}

/* =============== 2. Quality =============== */
export function Quality() {
  const s = useP1(); const [tab, setTab] = useTabP('Inspections'); const sc = supplierScore(s);
  return (
    <div className="space-y-4" data-page="quality">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Quality control' }]} title="Quality control" subtitle="Inspection plans, incoming (GRN) QC, NCR and CAPA, rejection trend and supplier scores" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Inspections (Oct)" value={String(s.insp.length)} sub={`${s.insp.filter((i) => i.status === 'Pending').length} pending`} />
        <Kpi label="Lots on hold" value={String(s.insp.filter((i) => i.status === 'On hold').length)} tone="amber" sub="blocked from issue" />
        <Kpi label="Open NCRs" value={String(s.ncrs.filter((n) => n.status !== 'Closed').length)} tone="red" sub="CAPA tracked" />
        <Kpi label="Rejection PPM (Oct)" value={s.rejTrend[s.rejTrend.length - 1].ppm.toLocaleString('en-IN')} sub="target 2,500" tone="amber" />
      </div>
      <AskBar prompts={['Log 12 rejects on lot L-88 for porosity', 'Show supplier quality scores', 'Find test certificate for lot L-88']} />
      <Tabs tabs={['Inspections', 'NCR & CAPA', 'Trend & suppliers', 'Inspection plans']} value={tab} onChange={setTab} counts={{ 'NCR & CAPA': s.ncrs.filter((n) => n.status !== 'Closed').length }} />
      {tab === 'Inspections' && <Card pad={false}><DataTable rowKey={(i) => i.id} rows={s.insp} highlight={(i) => i.status === 'On hold'} columns={[
        { key: 'i', header: 'Inspection', render: (i) => <div><div className="font-medium">{i.id}</div><div className="text-2xs text-slate-400">{i.type} · {i.ref}</div></div> },
        { key: 'it', header: 'Item / lot', render: (i) => <div><div>{i.item}</div><div className="text-2xs text-slate-400">Lot {i.lot} · {i.supplier}</div></div> },
        { key: 'sm', header: 'Sample', align: 'right', render: (i) => i.sample },
        { key: 'pr', header: 'Pass / reject', render: (i) => <div className="w-32"><div className="flex h-2 overflow-hidden rounded-full bg-slate-100"><div className="bg-emerald-500" style={{ width: `${(i.passed / i.sample) * 100}%` }} /><div className="bg-rose-500" style={{ width: `${(i.rejected / i.sample) * 100}%` }} /></div><div className="mt-0.5 text-2xs text-slate-500">{i.passed} ok · {i.rejected} rej</div></div> },
        { key: 'd', header: 'Defect', render: (i) => i.defect },
        { key: 's', header: 'Status', render: (i) => <Status>{i.status}</Status> },
      ]} /></Card>}
      {tab === 'NCR & CAPA' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{s.ncrs.map((n) => <Card key={n.id} title={<span className="flex items-center gap-2">{n.id}<Status>{n.status}</Status></span>} subtitle={`${n.item} · lot ${n.lot}`}>
        <div className="space-y-2 text-[13px]"><div className="flex justify-between"><span className="text-slate-500">Defect</span><span className="font-medium text-rose-600">{n.defect} × {n.qty}</span></div><div className="flex justify-between"><span className="text-slate-500">Source</span><span>{n.source}</span></div><div className="flex justify-between"><span className="text-slate-500">Owner</span><span>{n.owner}</span></div>
          <div className="rounded-lg bg-slate-50 p-2 text-[12.5px]"><span className="font-semibold">CAPA: </span>{n.capa}</div>
          {n.status !== 'Closed' && <Button size="sm" variant="success" icon={<Check size={13} />} onClick={() => updateP1((d) => { d.ncrs.find((x) => x.id === n.id)!.status = 'Closed'; })}>Close NCR</Button>}</div></Card>)}</div>}
      {tab === 'Trend & suppliers' && <div className="grid grid-cols-2 gap-4">
        <Card title="Rejection trend" subtitle="Rejected parts per month"><div className="h-60" data-testid="rej-trend"><ResponsiveContainer><LineChart data={s.rejTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="m" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="rejects" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></Card>
        <Card title="Supplier quality score" subtitle="100 − 2.5 × incoming rejection %"><div className="space-y-3">{sc.map((x) => <div key={x.sup}><div className="flex justify-between text-[13px]"><span className="font-medium">{x.sup}</span><span className="tabular">{x.score}/100 · {x.rej}% rej · {x.lots} lots</span></div><Progress value={x.score} tone={x.score < 70 ? 'red' : x.score < 90 ? 'amber' : 'green'} /></div>)}</div></Card>
      </div>}
      {tab === 'Inspection plans' && <Card title="Inspection plans" subtitle="What to check, sample size (AQL 1.0, level II) and acceptance criteria"><DataTable rowKey={(r) => r.p} rows={[
        { p: 'Grey CI casting FC250', st: 'GRN', ch: 'Visual (porosity, cracks), hardness 180–240 HB, chemistry via MTC', aql: '80 of 1,000' },
        { p: 'Bearing 6204 ZZ', st: 'GRN', ch: 'MTC check, bore Ø20 ±0.01, noise test', aql: '50 of 500' },
        { p: 'Machined housing', st: 'In-process', ch: 'Bore Ø47 H7, face runout ≤ 0.03', aql: '40 per shift' },
        { p: 'A-17 housing assembly', st: 'Final', ch: 'Leak test 6 bar 60 s, torque, label & packing', aql: '125 of 1,200' },
      ]} columns={[{ key: 'p', header: 'Part', render: (r) => <span className="font-medium">{r.p}</span> }, { key: 's', header: 'Stage', render: (r) => <Badge tone="blue">{r.st}</Badge> }, { key: 'c', header: 'Checks', render: (r) => r.ch }, { key: 'a', header: 'Sample', render: (r) => r.aql }]} /></Card>}
    </div>
  );
}

/* =============== 3. Bank & TDS =============== */
export function BankTds() {
  const s = useP1(); const [tab, setTab] = useTabP('Bank reconciliation');
  const m = s.bank.filter((b) => b.status === 'Matched').length; const due = s.tds.filter((t) => !t.deposited);
  const bySec = ['194C', '194J', '194I', '194Q'].map((sec) => ({ sec, tds: sum(due.filter((t) => t.section === sec), (t) => t.tds), n: due.filter((t) => t.section === sec).length }));
  return (
    <div className="space-y-4" data-page="banktds">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Finance', to: '/finance' }, { label: 'Bank & TDS' }]} title="Bank reconciliation & TDS" subtitle={`${s.bankRecon.bank} · ${s.bankRecon.month} · statement auto-matched to invoices, bills and tax payments`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Auto-matched" value={`${m}/${s.bank.length}`} sub={`${Math.round((m / s.bank.length) * 100)}% of lines`} tone="green" />
        <Kpi label="Unmatched" value={String(s.bank.filter((b) => b.status === 'Unmatched').length)} sub={inr(sum(s.bank.filter((b) => b.status === 'Unmatched'), (b) => b.amount))} tone="red" />
        <Kpi label="TDS due 7 Nov" value={inr(sum(due, (t) => t.tds))} sub={`${due.length} deductions`} tone="amber" />
        <Kpi label="26Q (Q3) due" value="31 Jan" sub="Oct–Dec deductions" />
      </div>
      <AskBar prompts={['Reconcile HDFC for October', 'TDS due by 7th?', 'Show 26Q summary']} />
      <Tabs tabs={['Bank reconciliation', 'TDS', '26Q summary']} value={tab} onChange={setTab} />
      {tab === 'Bank reconciliation' && <Card pad={false} title="Statement lines" actions={<Button size="sm" variant="primary" icon={<Sparkles size={13} />} onClick={() => updateP1((d) => d.bank.forEach((b) => { if (b.status === 'Suggested') b.status = 'Matched'; }))}>Accept AI matches</Button>}><DataTable rowKey={(b) => b.id} rows={s.bank} highlight={(b) => b.status === 'Unmatched'} columns={[
        { key: 'd', header: 'Date', render: (b) => b.date.slice(5) }, { key: 'n', header: 'Narration', render: (b) => <span className="font-mono text-[12px]">{b.narration}</span> },
        { key: 'a', header: 'Amount', align: 'right', render: (b) => <span className={b.type === 'Cr' ? 'text-emerald-700' : 'text-slate-800'}>{b.type === 'Cr' ? '+' : '−'}{inr(b.amount)}</span> },
        { key: 'm', header: 'Matched to', render: (b) => b.match ? <div><div>{b.match}</div><div className="text-2xs text-slate-400">{b.matchType} · {b.confidence}% confidence</div></div> : <Button size="sm" onClick={() => updateP1((d) => { const x = d.bank.find((y) => y.id === b.id)!; x.status = 'Matched'; x.match = /CHGS/.test(b.narration) ? 'Bank charges (new entry)' : /INT/.test(b.narration) ? 'Interest income (new entry)' : /SALARY/.test(b.narration) ? 'Salary advance – payroll' : 'Journal (new entry)'; x.matchType = 'Created'; x.confidence = 100; })}>Create entry</Button> },
        { key: 's', header: 'Status', render: (b) => <Status>{b.status}</Status> },
      ]} /></Card>}
      {tab === 'TDS' && <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><Card className="lg:col-span-2" pad={false} title="TDS register – October"><DataTable rowKey={(t) => t.id} rows={s.tds} columns={[
        { key: 's', header: 'Section', render: (t) => <Badge tone="blue">{t.section}</Badge> }, { key: 'p', header: 'Deductee', render: (t) => <div><div>{t.party}</div><div className="text-2xs text-slate-400">PAN {t.pan}</div></div> },
        { key: 'a', header: 'Paid', align: 'right', render: (t) => inr(t.amount) }, { key: 'r', header: 'Rate', align: 'right', render: (t) => `${t.rate}%` }, { key: 't', header: 'TDS', align: 'right', render: (t) => <span className="font-semibold">{inr(t.tds)}</span> },
        { key: 'd', header: 'Deposit', render: (t) => t.deposited ? <Badge tone="green">{t.challan}</Badge> : <Badge tone="amber">Due 7 Nov</Badge> },
      ]} /></Card>
        <Card title="Due by section"><div className="h-52"><ResponsiveContainer><BarChart data={bySec}><XAxis dataKey="sec" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => inr(v)} /><Bar dataKey="tds" fill="#6366f1" radius={6} /></BarChart></ResponsiveContainer></div><Callout tone="amber" title="Pay by 7 November">Late deposit attracts 1.5% interest per month (Sec 201(1A)).</Callout></Card></div>}
      {tab === '26Q summary' && <Card title="Form 26Q – Q3 FY 2026-27 (draft)" subtitle="Builds as you deduct; file by 31 January"><DataTable rowKey={(r) => r.sec} rows={bySec} columns={[{ key: 's', header: 'Section', render: (r) => r.sec }, { key: 'n', header: 'Deductees', align: 'right', render: (r) => r.n }, { key: 't', header: 'TDS (Oct)', align: 'right', render: (r) => inr(r.tds) }, { key: 'st', header: 'Status', render: () => <Badge tone="amber">Challan pending</Badge> }]} /></Card>}
    </div>
  );
}

/* =============== 4. Expenses =============== */
export function Expenses() {
  const s = useP1(); const [open, setOpen] = useState(false); const [f, setF] = useState({ emp: 'Kiran Kumar (Sales)', category: 'Travel', desc: '', amount: '' }); const [scan, setScan] = useState(false);
  const setSt = (e: Expense, st: Expense['status']) => updateP1((d) => { d.exp.find((x) => x.id === e.id)!.status = st; });
  const cats = [...new Set(s.exp.map((e) => e.category))].map((c) => ({ c, a: sum(s.exp.filter((e) => e.category === c), (e) => e.amount) }));
  return (
    <div className="space-y-4" data-page="expenses">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Expenses' }]} title="Expenses & reimbursements" subtitle="Staff claim with a photo of the receipt; AI reads it, the owner approves, and it's paid with payroll"
        actions={<Button variant="primary" icon={<Receipt size={14} />} onClick={() => setOpen(true)} data-testid="new-claim">New claim</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Waiting approval" value={String(s.exp.filter((e) => e.status === 'Submitted').length)} sub={inr(sum(s.exp.filter((e) => e.status === 'Submitted'), (e) => e.amount))} tone="amber" />
        <Kpi label="Approved, to pay" value={inr(sum(s.exp.filter((e) => e.status === 'Approved'), (e) => e.amount))} sub="with Nov payroll" />
        <Kpi label="Paid (Oct)" value={inr(sum(s.exp.filter((e) => e.status === 'Paid via payroll'), (e) => e.amount))} tone="green" />
        <Kpi label="Input GST captured" value={inr(sum(s.exp, (e) => e.gst || 0))} sub="from receipts" />
      </div>
      <AskBar prompts={['Claim ₹850 for auto to Medak', 'Show pending expense claims', 'Approve all pending expense claims']} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" pad={false} title="Claims"><DataTable rowKey={(e) => e.id} rows={s.exp} columns={[
          { key: 'i', header: 'Claim', render: (e) => <div><div className="font-medium">{e.id}</div><div className="text-2xs text-slate-400">{e.date.slice(5)} · {e.category}</div></div> },
          { key: 'e', header: 'Employee', render: (e) => e.emp }, { key: 'd', header: 'What', render: (e) => <div><div>{e.desc}</div><div className="flex items-center gap-1 text-2xs text-brand-600"><ScanLine size={11} />{e.ocr}</div></div> },
          { key: 'a', header: 'Amount', align: 'right', render: (e) => <span className="font-semibold">{inr(e.amount)}</span> },
          { key: 's', header: 'Status', render: (e) => e.status === 'Submitted' ? <div className="flex gap-1"><Button size="sm" variant="success" icon={<Check size={12} />} onClick={() => setSt(e, 'Approved')}>Approve</Button><Button size="sm" variant="ghost" icon={<X size={12} />} onClick={() => setSt(e, 'Rejected')}>Reject</Button></div> : <Status>{e.status}</Status> },
        ]} /></Card>
        <Card title="By category"><div className="space-y-2.5">{cats.map((x) => <div key={x.c}><div className="flex justify-between text-[13px]"><span>{x.c}</span><span className="tabular">{inr(x.a)}</span></div><Progress value={(x.a / Math.max(...cats.map((y) => y.a))) * 100} /></div>)}</div>
          <Callout tone="blue" title="Payout via payroll">Approved claims are added as a non-taxable reimbursement line on the next pay run.</Callout></Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New expense claim" subtitle="Upload the receipt and the AI fills the amount and vendor (demo OCR)" footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => { const amt = +f.amount || 0; if (!amt || !f.desc) return; updateP1((d) => { d.exp.unshift({ id: `EX-${306 + d.exp.filter((e) => +e.id.slice(3) >= 306).length}`, emp: f.emp, category: f.category, desc: f.desc, amount: amt, date: '2026-10-29', receipt: 'upload.jpg', ocr: `Read from receipt · ${inr(amt)}`, status: 'Submitted', approver: 'Ranjith (Owner)' }); }); setOpen(false); setF({ ...f, desc: '', amount: '' }); }}>Submit claim</Button></>}>
        <button onClick={() => { setScan(true); setTimeout(() => { setF({ ...f, desc: 'Ola cab – Medak vendor visit', amount: '640', category: 'Travel' }); setScan(false); }, 900); }} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 py-5 text-[13px] text-brand-700"><Upload size={16} />{scan ? 'Reading receipt…' : 'Drop receipt photo (demo: click to scan sample)'}</button>
        <Fields cols={2}><Field label="Employee"><input className="h-8 w-full rounded-md border border-slate-200 px-2 text-[13px]" value={f.emp} onChange={(e) => setF({ ...f, emp: e.target.value })} /></Field><Field label="Category"><select className="h-8 w-full rounded-md border border-slate-200 px-2 text-[13px]" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{['Travel', 'Meals', 'Shop consumables', 'Courier', 'Lab testing', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="What for"><input data-testid="claim-desc" className="h-8 w-full rounded-md border border-slate-200 px-2 text-[13px]" value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></Field><Field label="Amount (₹)"><input data-testid="claim-amt" className="h-8 w-full rounded-md border border-slate-200 px-2 text-[13px]" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field></Fields>
      </Modal>
    </div>
  );
}

/* =============== 5. Dispatch =============== */
export function DispatchPage() {
  const s = useP1(); const [tab, setTab] = useTabP('Dispatch plan'); const [sel, setSel] = useState('DSP-782');
  const flow = ['Planned', 'Packed', 'Loaded', 'In transit', 'Delivered', 'POD received'] as const; const d0 = s.disp.find((d) => d.id === sel) || s.disp[0];
  return (
    <div className="space-y-4" data-page="dispatch">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Dispatch & logistics' }]} title="Dispatch & logistics" subtitle="Dispatch plan, packing lists, vehicle and LR, tracking and proof of delivery" />
      <Hero icon={<Truck size={20} />} tone="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"><b>{s.disp.filter((d) => d.date === '2026-10-29').length} dispatches today</b> · {(sum(s.disp.filter((d) => d.date === '2026-10-29'), (d) => d.weightKg) / 1000).toFixed(2)} t · {s.disp.filter((d) => d.vehicle === 'To be assigned').length} vehicle to assign · {s.disp.filter((d) => d.status === 'Delivered').length} POD awaited</Hero>
      <AskBar prompts={['What ships today?', 'Dispatch status', 'Find POD for DSP-776']} />
      <Tabs tabs={['Dispatch plan', 'Packing list', 'Tracking & POD']} value={tab} onChange={setTab} />
      {tab === 'Dispatch plan' && <Card pad={false}><DataTable rowKey={(d) => d.id} rows={s.disp} onRowClick={(d) => { setSel(d.id); setTab('Packing list'); }} columns={[
        { key: 'i', header: 'Dispatch', render: (d) => <div><div className="font-medium">{d.id}</div><div className="text-2xs text-slate-400">{d.so} · {d.date.slice(5)}</div></div> },
        { key: 'c', header: 'Customer', render: (d) => <div><div>{d.customer}</div><div className="text-2xs text-slate-400">{d.city}</div></div> },
        { key: 'it', header: 'Load', render: (d) => <div><div>{d.items}</div><div className="text-2xs text-slate-400">{d.qty} · {d.boxes} boxes · {d.weightKg} kg</div></div> },
        { key: 'v', header: 'Vehicle / LR', render: (d) => d.vehicle === 'To be assigned' ? <Button size="sm" onClick={(e) => { e.stopPropagation(); updateP1((x) => { const y = x.disp.find((z) => z.id === d.id)!; y.vehicle = 'MH 12 SX 7781'; y.driver = 'Prakash'; y.lr = 'SFX-40217'; }); }}>Assign vehicle</Button> : <div><div className="font-mono text-[12px]">{d.vehicle}</div><div className="text-2xs text-slate-400">{d.transporter} · LR {d.lr}</div></div> },
        { key: 's', header: 'Status', render: (d) => <Status>{d.status}</Status> }, { key: 'e', header: 'ETA', render: (d) => d.eta },
      ]} /></Card>}
      {tab === 'Packing list' && <Card title={`Packing list – ${d0.id}`} subtitle={`${d0.customer}, ${d0.city} · ${d0.so}`} actions={<select value={sel} onChange={(e) => setSel(e.target.value)} className="h-7 rounded-md border border-slate-200 px-1 text-[12.5px]">{s.disp.map((d) => <option key={d.id}>{d.id}</option>)}</select>}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><div className="lg:col-span-2"><DataTable rowKey={(r) => r.b} rows={Array.from({ length: Math.min(6, d0.boxes) }, (_, i) => ({ b: `BX-${String(i + 1).padStart(3, '0')}`, c: d0.items, q: Math.round(parseInt(d0.qty) / d0.boxes) || 1, w: +(d0.weightKg / d0.boxes).toFixed(1) }))} columns={[{ key: 'b', header: 'Box', render: (r) => r.b }, { key: 'c', header: 'Contents', render: (r) => r.c }, { key: 'q', header: 'Qty', align: 'right', render: (r) => r.q }, { key: 'w', header: 'Kg', align: 'right', render: (r) => r.w }]} /><div className="mt-1 text-2xs text-slate-400">Showing {Math.min(6, d0.boxes)} of {d0.boxes} boxes</div></div>
          <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-[13px]">{[['Vehicle', d0.vehicle], ['Driver', d0.driver], ['Transporter', d0.transporter], ['LR no.', d0.lr], ['Freight', inr(d0.freight)], ['E-way bill', d0.status === 'Planned' ? 'Generate on loading' : 'EWB 1612 9984 ' + d0.id.slice(4)]].map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-medium">{v}</span></div>)}</div></div></Card>}
      {tab === 'Tracking & POD' && <div className="space-y-3">{s.disp.filter((d) => d.status !== 'Planned').map((d) => <Card key={d.id}><div className="flex items-center gap-4"><div className="w-40"><div className="font-semibold">{d.id}</div><div className="text-2xs text-slate-400">{d.customer} · {d.city}</div></div>
        <div className="flex flex-1 items-center">{flow.map((st, i) => { const reached = flow.indexOf(d.status) >= i; return <div key={st} className="flex flex-1 items-center"><div className={cx('grid h-6 w-6 place-items-center rounded-full text-[10px]', reached ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500')}>{reached ? <Check size={12} /> : i + 1}</div><div className={cx('mx-1 h-0.5 flex-1', i < flow.length - 1 ? (flow.indexOf(d.status) > i ? 'bg-brand-500' : 'bg-slate-200') : 'bg-transparent')} /></div>; })}</div>
        <div className="w-36 text-right">{d.status === 'Delivered' ? <Button size="sm" icon={<Upload size={12} />} onClick={() => updateP1((x) => { x.disp.find((y) => y.id === d.id)!.status = 'POD received'; })}>Upload POD</Button> : <Status>{d.status}</Status>}</div></div></Card>)}</div>}
    </div>
  );
}

/* =============== 6. Notifications =============== */
const ROLES: Role[] = ['Owner', 'Sales', 'Stores', 'Accounts', 'HR', 'Supervisor'];
export function Notifications() {
  const s = useP1(); const [tab, setTab] = useTabP('Feed'); const [role, setRole] = useState<Role>('Owner');
  const feed = s.notes.filter((n) => role === 'Owner' || n.roles.includes(role)); const cats = ['Quality', 'Bank & TDS', 'Dispatch', 'Expenses', 'Production', 'Documents', 'Daily WhatsApp brief'];
  const toneT: Record<string, Tone> = { red: 'red', amber: 'amber', green: 'green', blue: 'blue' };
  return (
    <div className="space-y-4" data-page="notifications">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Notifications' }]} title="Notifications centre" subtitle="Alerts from every module, per-role preferences, statutory calendar and the daily brief"
        actions={<div className="flex items-center gap-2 text-[12.5px]">Viewing as <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-7 rounded-md border border-slate-200 px-1">{ROLES.map((r) => <option key={r}>{r}</option>)}</select><Button size="sm" onClick={() => updateP1((d) => d.notes.forEach((n) => { n.read = true; }))}>Mark all read</Button></div>} />
      <AskBar prompts={['Give me my daily brief', "What's due this month?", 'Show alerts']} />
      <Tabs tabs={['Feed', 'Compliance calendar', 'Preferences']} value={tab} onChange={setTab} counts={{ Feed: feed.filter((n) => !n.read).length }} />
      {tab === 'Feed' && <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><Card className="lg:col-span-2" pad={false}><div className="divide-y divide-slate-100" data-testid="feed">{feed.map((n) => <a key={n.id} href={'#' + n.to} onClick={() => updateP1((d) => { d.notes.find((x) => x.id === n.id)!.read = true; })} className={cx('flex items-start gap-3 px-4 py-3 hover:bg-slate-50', !n.read && 'bg-brand-50/40')}><span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', { red: 'bg-rose-500', amber: 'bg-amber-500', green: 'bg-emerald-500', blue: 'bg-brand-500' }[n.tone])} /><div className="flex-1"><div className="flex items-center gap-2 text-[13px] font-medium text-slate-900">{n.title}<Badge tone={toneT[n.tone]}>{n.module}</Badge></div><div className="text-[12.5px] text-slate-500">{n.text}</div></div><span className="text-2xs text-slate-400">{n.at}</span></a>)}</div></Card>
        <Card title={<span className="flex items-center gap-2"><Bell size={15} />Daily brief · {role}</span>} subtitle="Sent at 8:30 AM on WhatsApp (simulated)"><div className="space-y-2 text-[13px]">{feed.filter((n) => !n.read).slice(0, 4).map((n) => <div key={n.id} className="rounded-lg bg-slate-50 px-2.5 py-2"><div className="font-medium">{n.title}</div><div className="text-2xs text-slate-500">{n.text}</div></div>)}<div className="rounded-lg bg-amber-50 px-2.5 py-2 text-amber-800"><CalendarDays size={13} className="mr-1 inline" />Next due: {s.dues.find((d) => role === 'Owner' || d.roles.includes(role))?.title} · {s.dues.find((d) => role === 'Owner' || d.roles.includes(role))?.date.slice(5)}</div></div></Card></div>}
      {tab === 'Compliance calendar' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="calendar">{s.dues.filter((d) => role === 'Owner' || d.roles.includes(role)).map((d) => { const days = Math.round((+new Date(d.date) - +new Date('2026-10-29')) / 864e5); return <Card key={d.title}><div className="flex items-start gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-b from-brand-500 to-violet-600 text-center text-white"><div><div className="text-[16px] font-bold leading-none">{d.date.slice(8)}</div><div className="text-[9px] uppercase">{new Date(d.date).toLocaleString('en', { month: 'short' })}</div></div></div><div><div className="font-medium">{d.title}</div><div className="text-2xs text-slate-500">{d.kind}{d.amount ? ' · ' + d.amount : ''}</div><Badge tone={days <= 10 ? 'red' : days <= 25 ? 'amber' : 'gray'}>in {days} days</Badge></div></div></Card>; })}</div>}
      {tab === 'Preferences' && <Card title="Who gets what" subtitle="Each role only receives alerts for modules it can see"><div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="text-2xs uppercase text-slate-400"><th className="py-2 text-left">Alert</th>{ROLES.map((r) => <th key={r} className="py-2">{r}</th>)}</tr></thead><tbody>{cats.map((c) => <tr key={c} className="border-t border-slate-100"><td className="py-2">{c}</td>{ROLES.map((r) => <td key={r} className="text-center"><input type="checkbox" checked={!!s.prefs[r]?.[c]} onChange={(e) => updateP1((d) => { (d.prefs[r] ||= {})[c] = e.target.checked; })} /></td>)}</tr>)}</tbody></table></div></Card>}
    </div>
  );
}

/* =============== 7. Documents =============== */
export function Documents() {
  const s = useP1(); const [sp] = useSearchParams(); const [q, setQ] = useState(sp.get('q') || ''); const [type, setType] = useState('All');
  const types = ['All', ...new Set(s.docs.map((d) => d.type))];
  const rows = s.docs.filter((d) => (type === 'All' || d.type === type) && (d.name + d.linked + d.tags.join(' ') + d.type).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4" data-page="documents">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Documents' }]} title="Documents" subtitle="Drawings, test certificates, contracts and PODs – each linked to the record it belongs to"
        actions={<Button variant="primary" icon={<Upload size={14} />} onClick={() => updateP1((d) => { d.docs.unshift({ id: 'DOC-' + (209 + d.docs.length), name: 'Uploaded file ' + (d.docs.length - 7) + '.pdf', type: 'Other', linked: 'Unlinked', size: '120 KB', by: 'Ranjith', date: '2026-10-29', tags: [] }); })}>Upload</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Test certificates', /certificate/i, <ShieldCheck key="a" size={15} />], ['Drawings', /Drawing/, <Factory key="b" size={15} />], ['Contracts', /Contract/, <Landmark key="c" size={15} />], ['PODs', /delivery/i, <Package key="d" size={15} />]].map(([l, re, ic]) => <Kpi key={String(l)} label={String(l)} value={String(s.docs.filter((d) => (re as RegExp).test(d.type)).length)} icon={ic as React.ReactNode} />)}</div>
      <AskBar prompts={['Find test certificate for lot L-88', 'Find drawing for A-17', 'Find rate contract for Deccan Castings']} />
      <Toolbar right={<div className="flex flex-wrap gap-1">{types.map((t) => <button key={t} onClick={() => setType(t)} className={cx('rounded-full px-2.5 py-1 text-[12px]', type === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>{t}</button>)}</div>}><SearchBox value={q} onChange={setQ} placeholder="Search name, lot, record" /></Toolbar>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="docs">{rows.map((d) => <div key={d.id} className="group rounded-2xl border border-slate-200/70 bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
        <div className="mb-2 grid h-20 place-items-center rounded-xl bg-gradient-to-br from-slate-50 to-brand-50">{/pdf$/.test(d.name) ? <FileText size={28} className="text-rose-500" /> : <FolderOpen size={28} className="text-brand-500" />}</div>
        <div className="line-clamp-2 text-[13px] font-medium text-slate-900">{d.name}</div><div className="mt-1 text-2xs text-slate-500">{d.linked}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1"><Badge tone="blue">{d.type}</Badge>{d.lot && <Badge tone="violet">Lot {d.lot}</Badge>}<span className="ml-auto text-2xs text-slate-400">{d.size}</span></div></div>)}
        {!rows.length && <div className="col-span-4 py-10 text-center text-slate-400">No documents match.</div>}</div>
    </div>
  );
}
