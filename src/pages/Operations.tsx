import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, X, Bot, Route } from 'lucide-react';
import { useStore } from '../lib/store';
import { BOARD_STAGES, WO, dispatchPlan } from '../lib/data';
import { fmtShort } from '../lib/format';
import { PageHeader, Card, Button, DataTable, SearchBox, Toolbar, Modal, Field, Fields, Status, Tabs, Progress, Callout, Badge, Kpi, Select, cx } from '../components/ui';
import { HANDOFFS } from '../lib/actions';

const OWNERS = ['Raju Goud (Machining – Shift A)', 'Yadagiri Mudiraj (Machining)', 'Suresh Babu (Assembly)', 'Kiran Kumar (Assembly)', 'Venu Gopal (Welding)', 'Anil Kumar (Welding)', 'Shankar Nayak (Fabrication – Shift A)', 'Anjali Devi (QC & Packing)', 'Sravani K (QC)'];
export default function Operations() {
  const ctx = useStore();
  const { s, update, toast, startTask } = ctx;
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'Work orders';
  const order = sp.get('order');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<WO | null>(null);
  const [prog, setProg] = useState(0);
  const [owner, setOwner] = useState('');
  const setTab = (t: string) => setSp(order ? { tab: t, order } : { tab: t });
  const rows = s.workOrders.filter((w) => (!order || w.order === order) && (w.id + w.op + w.order + w.center).toLowerCase().includes(q.toLowerCase()));
  const open = (w: WO) => { setSel(w); setProg(w.progress); setOwner(w.team); };
  const live = sel ? s.workOrders.find((w) => w.id === sel.id)! : null;
  const save = (patch: Partial<WO>, msg: string) => { update((d) => { Object.assign(d.workOrders.find((w) => w.id === sel!.id)!, patch); }, `${sel!.id}: ${msg}`); toast(`${sel!.id} – ${msg}`); };
  const ewTask = s.tasks.find((t) => /e-way bill data/.test(t.text));
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Operations' }]} title="Operations" subtitle="Shop-floor plan: work orders, stages, owners and today's dispatches" />
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Work orders in progress" value={String(s.workOrders.filter((w) => w.status !== 'Done').length)} sub="2 units · 2 shifts" />
        <Kpi label="Behind or blocked" value={String(s.workOrders.filter((w) => ['Behind', 'Blocked'].includes(w.status)).length)} sub="WO-3317 behind · material blocks" tone="amber" />
        <Kpi label="Plan adherence (week)" value="88%" sub="target 92%" />
        <Kpi label="Outsourced steps" value={String(s.workOrders.filter((w) => w.outsourced).length)} sub="tracked in Job Work" onClick={() => { window.location.hash = '#/job-work'; }} />
      </div>
      {order === 'SO-1051' && (
        <Callout tone={s.pr208Approved ? 'green' : 'amber'} icon={s.pr208Approved ? <CheckCircle2 size={16} /> : undefined} title={s.pr208Approved ? 'Revised plan for SO-1051: split into two lots' : 'SO-1051 is blocked on material'}
          action={<button onClick={() => setSp({ tab })} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><X size={12} /> Show all orders</button>}>
          {s.pr208Approved
            ? <span data-testid="split-plan">Lot 1 (35 from stock): machining today → assembly Thu → powder coating at Sri Venkateswara (job work) Thu → dispatch <b>Fri 30 Oct</b>. Lot 2 (65 via PO-0921): machining Sat 31 Oct → coating Mon 2 Nov → dispatch <b>Tue 3 Nov</b>.</span>
            : <>CNC machining (WO-3321) can start only 35 of 100. <Link to="/procurement/PR-208?tab=Compare" className="font-medium underline">Approve PR-208</Link> to replan.</>}
        </Callout>
      )}
      <Tabs tabs={['Work orders', 'Board', 'Dispatch plan']} value={tab} onChange={setTab} />
      {tab === 'Work orders' && (<>
        <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search work orders" /></Toolbar>
        <Card pad={false}>
          <DataTable rowKey={(w: WO) => w.id} rows={rows} onRowClick={open} highlight={(w) => w.order === 'SO-1051'} columns={[
            { key: 'i', header: 'WO', render: (w) => <span className="whitespace-nowrap font-medium text-slate-900">{w.id}</span> }, { key: 'o', header: 'Order', render: (w) => <Link onClick={(e) => e.stopPropagation()} to={`/orders/${w.order}`} className="whitespace-nowrap text-brand-700 hover:underline">{w.order}</Link> },
            { key: 'op', header: 'Operation', render: (w) => <span className="flex items-center gap-1.5">{w.op}{w.outsourced && <Badge tone="violet">Job work</Badge>}</span> }, { key: 'c', header: 'Work centre', render: (w) => <span className="text-slate-600">{w.center}</span> },
            { key: 't', header: 'Owner', render: (w) => <span className="text-slate-600">{w.team}</span> }, { key: 'f', header: 'Finish', render: (w) => fmtShort(w.finish) },
            { key: 'p', header: 'Progress vs plan', render: (w) => <div className="w-28"><Progress value={w.progress} planned={w.planned} tone={w.progress < w.planned ? 'amber' : 'green'} /></div> },
            { key: 's', header: 'Status', render: (w) => <Status>{w.status}</Status> }, { key: 'n', header: 'Note', render: (w) => <span className="block max-w-[230px] truncate text-2xs text-slate-500">{w.note || w.dependency}</span> },
          ]} />
        </Card>
      </>)}
      {tab === 'Board' && (
        <div className="grid grid-cols-7 gap-2">
          {BOARD_STAGES.map((st) => (
            <div key={st} className="rounded-xl bg-slate-100/70 p-2">
              <div className="mb-2 px-1 text-2xs font-semibold uppercase tracking-wide text-slate-500">{st} · {rows.filter((w) => w.stage === st).length}</div>
              <div className="space-y-2">{rows.filter((w) => w.stage === st).map((w) => (
                <button key={w.id} data-wo={w.id} onClick={() => open(w)} className={cx('block w-full rounded-lg border bg-white p-2 text-left shadow-sm hover:border-brand-300', w.status === 'Blocked' ? 'border-rose-200' : w.status === 'Behind' ? 'border-amber-200' : 'border-slate-200')}>
                  <div className="flex items-center justify-between text-[12px] font-medium text-slate-900">{w.id}<span className="text-2xs text-slate-400">{w.order}</span></div>
                  <div className="truncate text-2xs text-slate-500">{w.op}</div>
                  <div className="mt-1.5"><Progress value={w.progress} planned={w.planned} /></div>
                  <div className="mt-1"><Status>{w.status}</Status></div>
                </button>))}</div>
            </div>
          ))}
        </div>
      )}
      {tab === 'Dispatch plan' && (
        <Card pad={false} title="Dispatch plan · next 3 days" subtitle={<>Next-3-day loads from the Dispatch planner. Packing lists, LR and POD live in <Link to="/dispatch" className="text-brand-700 hover:underline">Dispatch →</Link></>}
          actions={<Button size="sm" icon={<Bot size={13} />} disabled={!!ewTask} onClick={() => startTask(HANDOFFS['handoff-eway'](ctx))}>{ewTask ? (ewTask.status === 'running' ? 'Preparing e-way bill data…' : 'E-way bill data ready') : 'Prepare e-way bill data'}</Button>}>
          <DataTable rowKey={(d) => d.order} rows={[...dispatchPlan, ...(s.pr208Approved ? [{ date: '2026-10-30', order: 'SO-1051', customer: 'Sri Lakshmi Projects', to: 'Gachibowli', qty: 'Lot 1 · 35 assemblies · 5 pallets', vehicle: 'TS 08 UC 7712', transporter: 'Sri Sai Transport', eway: 'To generate', lr: 'Pending', slot: '16:00', interstate: false }] : [])].sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))} columns={[
            { key: 'd', header: 'Date', render: (d) => fmtShort(d.date) }, { key: 's', header: 'Slot', render: (d) => d.slot },
            { key: 'o', header: 'Order', render: (d) => <Link to={`/orders/${d.order}`} className="font-medium text-brand-700 hover:underline">{d.order}</Link> }, { key: 'c', header: 'Customer', render: (d) => <div><div>{d.customer}</div><div className="text-2xs text-slate-400">{d.to}</div></div> },
            { key: 'q', header: 'Load', render: (d) => d.qty }, { key: 'v', header: 'Vehicle / transporter', render: (d) => <div><div className="tabular">{d.vehicle}</div><div className="text-2xs text-slate-400">{d.transporter}</div></div> },
            { key: 'lr', header: 'LR no.', render: (d) => <span className="tabular text-slate-600">{d.lr}</span> },
            { key: 'e', header: 'E-way bill', render: (d) => <span className="flex items-center gap-1">{ewTask?.status === 'done' && d.date === '2026-10-29' ? <Badge tone="green">Data ready</Badge> : <Status>{d.eway}</Status>}{d.interstate && <Badge tone="violet">IGST</Badge>}</span> },
          ]} />
        </Card>
      )}
      <Modal open={!!live} onClose={() => setSel(null)} title={live ? `${live.id} · ${live.op}` : ''} subtitle={live ? `${live.order} · ${live.center}` : ''} width="max-w-xl"
        footer={live && <><Button onClick={() => setSel(null)}>Close</Button><Button data-testid="mark-qc" disabled={live.stage === 'Quality check' || live.status === 'Blocked'} onClick={() => save({ stage: 'Quality check', progress: Math.max(live.progress, 90), quality: 'Awaiting QC' }, 'marked ready for QC')}>Mark ready for QC</Button></>}>
        {live && (
          <div className="space-y-4">
            <Fields cols={3}><Field label="Status"><Status>{live.status}</Status></Field><Field label="Stage">{live.stage}</Field><Field label="Quantity">{live.qty}</Field><Field label="Start">{fmtShort(live.start)}</Field><Field label="Finish">{fmtShort(live.finish)}</Field><Field label="Depends on">{live.dependency}</Field><Field label="Quality">{live.quality}</Field><Field label="Packing">{live.packing}</Field><Field label="Note">{live.note || '—'}</Field></Fields>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 text-xs font-semibold text-slate-700">Update progress</div>
              <div className="flex items-center gap-3"><input type="range" min={0} max={100} value={prog} onChange={(e) => setProg(Number(e.target.value))} className="flex-1 accent-brand-600" /><span className="tabular w-10 text-right text-[13px]">{prog}%</span>
                <Button size="sm" variant="primary" data-testid="save-progress" onClick={() => save({ progress: prog, status: prog >= live.planned ? (live.status === 'Blocked' ? 'Blocked' : 'On track') : live.status }, `progress ${prog}%`)}>Save</Button></div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 text-xs font-semibold text-slate-700">Assign owner</div>
              <div className="flex items-center gap-2"><Select value={owner} onChange={setOwner} options={Array.from(new Set([live.team, ...OWNERS]))} /><Button size="sm" data-testid="assign-owner" onClick={() => save({ team: owner }, `assigned to ${owner.split(' (')[0]}`)}>Assign</Button></div>
            </div>
          </div>
        )}
      </Modal>
      <div className="hidden"><Route /></div>
    </div>
  );
}
