import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Plus, PackageCheck, FileDown, Factory, ArrowRightLeft } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useStore } from '../lib/store';
import { jobWorkers, inwardJobWork, capacity, Challan } from '../lib/data';
import { inr, lakh, fmtDate, fmtShort, daysBetween, todayISO, addDays } from '../lib/format';
import { PageHeader, Card, Button, DataTable, Modal, Field, Fields, Status, Tabs, useTab, Callout, Badge, Kpi, Select } from '../components/ui';
import { chaseJobWorker } from '../lib/actions';

const pending = (c: Challan) => c.sent - c.returned - c.scrap;
export default function JobWork() {
  const ctx = useStore();
  const { s, update, toast, openDraft } = ctx;
  const [tab, setTab] = useTab('Overview');
  const [ret, setRet] = useState<Challan | null>(null);
  const [retQty, setRetQty] = useState('');
  const [nc, setNc] = useState(false);
  const [ncW, setNcW] = useState(jobWorkers[0].name);
  const [ncItem, setNcItem] = useState('PHA-17 housings – Lot 1 (machined)');
  const [ncQty, setNcQty] = useState('35');
  const open = s.challans.filter((c) => pending(c) > 0);
  const value = open.reduce((a, c) => a + pending(c) * c.valuePerUnit, 0);
  const chase = (c: Challan) => {
    if (c.id === 'DC-JW-0709') return chaseJobWorker(ctx);
    const w = jobWorkers.find((j) => j.id === c.workerId)!;
    openDraft({ title: `Follow-up – ${w.name}`, channel: 'WhatsApp', to: `${w.contact} · ${w.name}`, toDetail: w.phone, approveLabel: 'Approve & send',
      body: `Hi ${w.contact} garu,\n\nChecking on ${c.id} (${c.item}). ${pending(c)} ${c.unit} are still with you, due back ${fmtShort(c.expected)}. Please confirm the return time.\n\nThanks,\nHarish – Aarohan Industries`,
      onApprove: () => { update(() => {}, `Follow-up sent to ${w.name} for ${c.id} (simulated)`); toast('Follow-up marked as sent (simulated)'); } });
  };
  const itc = s.challans.map((c) => { const limit = c.capital ? 3 * 365 : 365; const age = daysBetween(c.date, todayISO); return { ...c, limit, age, deadline: addDays(c.date, limit) }; });
  const downloadITC = () => {
    const rows = [['Challan', 'Job worker', 'GSTIN', 'Date', 'Description', 'Type', 'Qty sent', 'Qty returned', 'Scrap', 'Taxable value'], ...itc.map((c) => { const w = jobWorkers.find((j) => j.id === c.workerId)!; return [c.id, w.name, w.gstin, c.date, c.item, c.capital ? 'Capital goods' : 'Inputs', c.sent, c.returned, c.scrap, c.sent * c.valuePerUnit]; })];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ITC-04-draft-FY2026-27.csv'; a.click();
    toast('ITC-04 working file downloaded (demo data)');
  };
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Job Work' }]} title="Job Work & outsourcing" subtitle="Material sent to job workers, what's pending return, job work you do for customers, and ITC-04"
        actions={<Button variant="primary" icon={<Plus size={14} />} data-testid="new-challan" onClick={() => setNc(true)}>New job-work challan</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Material at job workers" value={lakh(value)} sub={`${open.length} open challans`} tone="amber" />
        <Kpi label="Pending returns" value={open.reduce((a, c) => a + pending(c), 0).toLocaleString('en-IN')} sub="pieces across 4 job workers" />
        <Kpi label="Overdue" value={String(open.filter((c) => c.expected < todayISO).length)} sub="DC-JW-0709 · 3 days late" tone="red" />
        <Kpi label="Work outsourced" value="22%" sub="of machine hours this month" />
      </div>
      <Tabs tabs={['Overview', 'Material out', 'Inward job work', 'Capacity', 'ITC-04']} value={tab} onChange={setTab} counts={{ 'Material out': open.length }} />
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {jobWorkers.map((w) => {
            const cs = open.filter((c) => c.workerId === w.id);
            return (
              <Card key={w.id} title={w.name} subtitle={`${w.process} · ${w.area}`} actions={<Badge tone={w.onTime >= 90 ? 'green' : w.onTime >= 80 ? 'amber' : 'red'}>{w.onTime}% on time</Badge>}>
                <div className="space-y-1.5">
                  {cs.length === 0 ? <div className="text-[13px] text-slate-500">Nothing pending.</div> : cs.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-[13px]">
                      <div className="min-w-0"><span className="font-medium text-slate-900">{c.id}</span> <span className="text-slate-500">· {pending(c)} {c.unit} pending · back {fmtShort(c.expected)}</span></div>
                      <div className="flex shrink-0 items-center gap-2"><Status>{c.status}</Status><Button size="sm" variant="ghost" icon={<MessageCircle size={13} />} onClick={() => chase(c)}>Chase</Button></div>
                    </div>
                  ))}
                  <div className="pt-1 text-2xs text-slate-400">{w.rate} · GSTIN {w.gstin}</div>
                </div>
              </Card>
            );
          })}
          <Callout tone="blue" icon={<Factory size={16} />} title="SO-1051 uses job work">
            Powder coating for the PHA-17 assemblies goes to Sri Venkateswara Powder Coaters (WO-3323). The challan is raised when Lot 1 leaves machining. <Link to="/operations?order=SO-1051" className="font-medium underline">See plan</Link>
          </Callout>
        </div>
      )}
      {tab === 'Material out' && (
        <Card pad={false}>
          <DataTable rowKey={(c: Challan) => c.id} rows={s.challans} highlight={(c) => c.status === 'Overdue'} columns={[
            { key: 'i', header: 'Challan', render: (c) => <span className="font-medium text-slate-900">{c.id}</span> }, { key: 'w', header: 'Job worker', render: (c) => jobWorkers.find((j) => j.id === c.workerId)!.name },
            { key: 'it', header: 'Material', render: (c) => <div><div>{c.item}</div><div className="text-2xs text-slate-400">for {c.order}{c.capital ? ' · capital goods' : ''}</div></div> },
            { key: 'd', header: 'Sent', render: (c) => fmtShort(c.date) }, { key: 's', header: 'Sent / back / scrap', align: 'right', render: (c) => `${c.sent} / ${c.returned} / ${c.scrap}` },
            { key: 'p', header: 'Pending', align: 'right', render: (c) => <span className="font-semibold">{pending(c)}</span> }, { key: 'v', header: 'Value pending', align: 'right', render: (c) => inr(pending(c) * c.valuePerUnit) },
            { key: 'e', header: 'Due back', render: (c) => fmtShort(c.expected) }, { key: 'st', header: 'Status', render: (c) => <Status>{c.status}</Status> },
            { key: 'a', header: '', align: 'right', render: (c) => pending(c) > 0 && c.status !== 'Draft' ? <span className="flex justify-end gap-1"><Button size="sm" variant="ghost" icon={<PackageCheck size={13} />} data-return={c.id} onClick={() => { setRet(c); setRetQty(String(pending(c))); }}>Record return</Button><Button size="sm" variant="ghost" icon={<MessageCircle size={13} />} onClick={() => chase(c)}>Chase</Button></span> : null },
          ]} />
        </Card>
      )}
      {tab === 'Inward job work' && (
        <Card pad={false} title="Job work we do for customers" subtitle="Customer-supplied material is not our stock. We bill only job charges (SAC 9988).">
          <DataTable rowKey={(r) => r.id} rows={inwardJobWork} columns={[
            { key: 'i', header: 'Job', render: (r) => <span className="font-medium">{r.id}</span> }, { key: 'p', header: 'Principal', render: (r) => r.principal }, { key: 'm', header: 'Material received', render: (r) => r.material },
            { key: 'q', header: 'Received / used / balance', align: 'right', render: (r) => `${r.qtyIn} / ${r.consumed} / ${r.balance}` }, { key: 'o', header: 'Output', render: (r) => r.output },
            { key: 'c', header: 'Job charges', align: 'right', render: (r) => inr(r.charges) }, { key: 's', header: 'Status', render: (r) => <Status>{r.status}</Status> },
          ]} />
        </Card>
      )}
      {tab === 'Capacity' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card title="In-house vs outsourced, by process" subtitle="Share of this month's work (%)" className="col-span-2">
            <div className="h-72"><ResponsiveContainer><BarChart data={capacity} layout="vertical" margin={{ left: 30 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="process" tick={{ fontSize: 11 }} width={100} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="inhouse" name="In-house" stackId="a" fill="#3b6fe0" isAnimationActive={false} /><Bar dataKey="outsourced" name="Outsourced" stackId="a" fill="#a78bfa" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
          </Card>
          <Card title="Machine utilisation">
            <div className="space-y-2">{capacity.filter((c) => c.utilisation).map((c) => <div key={c.process}><div className="flex justify-between text-xs"><span className="text-slate-600">{c.process}</span><span className="tabular font-medium">{c.utilisation}%</span></div><div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${c.utilisation > 90 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${c.utilisation}%` }} /></div></div>)}</div>
            <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">CNC is at 94%. Send SO-1051 Lot 2 shaft turning to Laxmi CNC Works to protect Tue 3 Nov.</div>
          </Card>
        </div>
      )}
      {tab === 'ITC-04' && (
        <>
          <Callout tone="gray" icon={<ArrowRightLeft size={16} />} title="ITC-04 · filed annually (turnover up to ₹5 Cr) · FY 2026-27 due 25 Apr 2027"
            action={<Button size="sm" icon={<FileDown size={13} />} data-testid="itc04-download" onClick={downloadITC}>Download working file</Button>}>
            Inputs must come back within 1 year, and capital goods within 3 years. If they don't, the transfer is treated as a supply. Every challan below is within its limit.
          </Callout>
          <Card pad={false}>
            <DataTable rowKey={(c) => c.id} rows={itc} columns={[
              { key: 'i', header: 'Challan', render: (c) => <span className="font-medium">{c.id}</span> }, { key: 'w', header: 'Job worker', render: (c) => jobWorkers.find((j) => j.id === c.workerId)!.name },
              { key: 't', header: 'Type', render: (c) => (c.capital ? 'Capital goods' : 'Inputs') }, { key: 'd', header: 'Sent on', render: (c) => fmtDate(c.date) },
              { key: 'v', header: 'Value sent', align: 'right', render: (c) => inr(c.sent * c.valuePerUnit) }, { key: 'a', header: 'Days out', align: 'right', render: (c) => (pending(c) ? c.age : '—') },
              { key: 'l', header: 'Return by', render: (c) => fmtDate(c.deadline) }, { key: 's', header: 'ITC-04 status', render: (c) => <Badge tone={pending(c) ? 'blue' : 'green'}>{pending(c) ? 'Open – within limit' : 'Closed'}</Badge> },
            ]} />
          </Card>
        </>
      )}
      <Modal open={!!ret} onClose={() => setRet(null)} title={`Record return · ${ret?.id}`} footer={<><Button onClick={() => setRet(null)}>Cancel</Button><Button variant="primary" data-testid="save-return" onClick={() => { const n = Math.min(Number(retQty) || 0, pending(ret!)); update((d) => { const c = d.challans.find((x) => x.id === ret!.id)!; c.returned += n; c.status = c.sent - c.returned - c.scrap <= 0 ? 'Returned' : 'Partly returned'; }, `Recorded return of ${n} on ${ret!.id}`); toast(`${n} received back on ${ret!.id}`); setRet(null); }}>Save</Button></>}>
        {ret && <div className="space-y-3"><div className="text-[13px] text-slate-600">{ret.item} · {pending(ret)} {ret.unit} pending</div><label className="block text-xs font-medium text-slate-600">Quantity received back<input value={retQty} onChange={(e) => setRetQty(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-[13px]" /></label></div>}
      </Modal>
      <Modal open={nc} onClose={() => setNc(false)} title="New job-work challan" subtitle="Delivery challan under Rule 45. Saved as a draft – nothing leaves the gate until it is approved." footer={<><Button onClick={() => setNc(false)}>Cancel</Button><Button variant="primary" data-testid="save-challan" onClick={() => { const id = `DC-JW-07${15 + s.challans.length - 5}`; const w = jobWorkers.find((j) => j.name === ncW)!; update((d) => { d.challans.unshift({ id, workerId: w.id, date: todayISO, item: ncItem, order: 'SO-1051', sent: Number(ncQty) || 0, returned: 0, scrap: 0, unit: 'pcs', expected: addDays(todayISO, 1), valuePerUnit: 5200, status: 'Draft' }); }, `Draft challan ${id} for ${w.name}`); toast(`${id} saved as draft`); setNc(false); }}>Save draft</Button></>}>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-600">Job worker<div className="mt-1"><Select value={ncW} onChange={setNcW} options={jobWorkers.map((j) => j.name)} /></div></label>
          <label className="block text-xs font-medium text-slate-600">Material<input value={ncItem} onChange={(e) => setNcItem(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-[13px]" /></label>
          <label className="block text-xs font-medium text-slate-600">Quantity<input value={ncQty} onChange={(e) => setNcQty(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-[13px]" /></label>
          <Fields cols={2}><Field label="Expected back">{fmtShort(addDays(todayISO, 1))}</Field><Field label="E-way bill">Prepared if required (simulated)</Field></Fields>
        </div>
      </Modal>
    </div>
  );
}
