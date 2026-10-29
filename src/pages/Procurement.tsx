import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CheckCircle2, Star, Send, Bot, ShieldCheck, Award } from 'lucide-react';
import { useStore } from '../lib/store';
import { suppliers, quotes, Supplier, PR } from '../lib/data';
import { evalQuote, recommendation, RECOMMENDED, supplierById, so1051Economics } from '../lib/domain';
import { inr, lakh, fmtDate, fmtShort } from '../lib/format';
import { PageHeader, Card, Button, DataTable, SearchBox, Toolbar, Modal, Field, Fields, Timeline, Status, Tabs, useTab, Callout, Badge, Kpi, cx, Segmented } from '../components/ui';
import { approvePR208, sendPO, HANDOFFS } from '../lib/actions';

export function ProcurementList() {
  const { s } = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useTab('Purchase requests');
  const [q, setQ] = useState('');
  const [st, setSt] = useState('All');
  const [sup, setSup] = useState<Supplier | null>(null);
  const prs = s.prs.filter((p) => (st === 'All' || (st === 'Open' ? !/Closed/.test(p.status) : /Closed/.test(p.status))) && (p.id + p.material).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Procurement' }]} title="Procurement" subtitle="Purchase requests, quotes, purchase orders and suppliers. Nothing is ordered without your approval."
        actions={<><Button onClick={() => nav('/suppliers')}>Supplier contacts</Button><Button onClick={() => nav('/sourcing')}>Sourcing results</Button></>} />
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Open requests" value={String(s.prs.filter((p) => !/Closed|PO issued|Approved/.test(p.status)).length)} sub="1 with quotes to review" />
        <Kpi label="POs awaiting supplier" value={String(s.pos.filter((p) => !p.confirmed && p.status !== 'Received').length)} sub="confirmation pending" tone="amber" />
        <Kpi label="Spend this month" value="₹6.8 lakh" sub="across 9 POs" />
        <Kpi label="MSME suppliers" value={String(suppliers.filter((x) => /Micro|Small/.test(x.msme)).length)} sub="45-day payment rule applies" />
      </div>
      <Tabs tabs={['Purchase requests', 'Purchase orders', 'Suppliers']} value={tab} onChange={setTab} />
      {tab === 'Purchase requests' && (<>
        <Toolbar right={<Segmented value={st} onChange={setSt} options={['All', 'Open', 'Closed'].map((x) => ({ value: x, label: x }))} />}><SearchBox value={q} onChange={setQ} placeholder="Search requests" /></Toolbar>
        <Card pad={false}>
          <DataTable rowKey={(p: PR) => p.id} rows={prs} onRowClick={(p) => nav(`/procurement/${p.id}`)} highlight={(p) => p.id === 'PR-208' && !s.pr208Approved} columns={[
            { key: 'i', header: 'Request', render: (p) => <span className="font-medium text-slate-900">{p.id}</span> },
            { key: 'm', header: 'Material', render: (p) => p.material }, { key: 'q', header: 'Qty', align: 'right', render: (p) => p.qty },
            { key: 'o', header: 'For order', render: (p) => p.linkedOrder || 'Stock' }, { key: 'n', header: 'Needed by', render: (p) => fmtShort(p.neededBy) },
            { key: 'qt', header: 'Quotes', align: 'right', render: (p) => p.quotes.length || '—' }, { key: 'pr', header: 'Priority', render: (p) => <Status>{p.priority}</Status> },
            { key: 's', header: 'Status', render: (p) => <Status>{p.status}</Status> },
          ]} />
        </Card>
      </>)}
      {tab === 'Purchase orders' && (
        <Card pad={false}>
          <DataTable rowKey={(p) => p.id} rows={s.pos} onRowClick={(p) => nav(`/procurement/${p.pr}`)} columns={[
            { key: 'i', header: 'PO', render: (p) => <span className="font-medium text-slate-900">{p.id}</span> }, { key: 's', header: 'Supplier', render: (p) => supplierById(p.supplierId).name },
            { key: 'm', header: 'Material', render: (p) => p.material }, { key: 'q', header: 'Qty', align: 'right', render: (p) => p.qty }, { key: 'v', header: 'Value (incl. GST)', align: 'right', render: (p) => inr(p.value) },
            { key: 'e', header: 'ETA', render: (p) => fmtShort(p.eta) }, { key: 'st', header: 'Status', render: (p) => <Status>{p.status}</Status> },
          ]} />
        </Card>
      )}
      {tab === 'Suppliers' && (
        <Card pad={false}>
          <DataTable rowKey={(x) => x.id} rows={suppliers} onRowClick={setSup} columns={[
            { key: 'n', header: 'Supplier', render: (x) => <span className="font-medium text-slate-900">{x.name}</span> }, { key: 'c', header: 'Category', render: (x) => x.category },
            { key: 'l', header: 'Location', render: (x) => `${x.city}${x.interstate ? ' · inter-state' : ''}` }, { key: 'g', header: 'GSTIN', render: (x) => <span className="tabular text-slate-500">{x.gstin}</span> },
            { key: 'm', header: 'MSME (Udyam)', render: (x) => <span className="text-slate-600">{x.msme}</span> }, { key: 'r', header: 'Rating', align: 'right', render: (x) => (x.rating ? x.rating.toFixed(1) : '—') },
            { key: 'o', header: 'On-time', align: 'right', render: (x) => (x.onTime ? `${x.onTime}%` : '—') },
          ]} />
        </Card>
      )}
      <Modal open={!!sup} onClose={() => setSup(null)} title={sup?.name || ''} subtitle={sup?.category}>
        {sup && <Fields cols={2}><Field label="Contact">{sup.contact} · {sup.phone}</Field><Field label="Location">{sup.city}, {sup.state}</Field><Field label="GSTIN">{sup.gstin}</Field><Field label="MSME">{sup.msme}</Field><Field label="Tax on purchases">{sup.interstate ? 'IGST (inter-state)' : 'CGST + SGST'}</Field><Field label="On-time delivery">{sup.onTime ? `${sup.onTime}%` : '—'}</Field></Fields>}
      </Modal>
    </div>
  );
}

function CompareGrid({ sel, setSel }: { sel: string; setSel: (id: string) => void }) {
  const ev = quotes.map(evalQuote);
  const rec = recommendation();
  const best = (f: (e: ReturnType<typeof evalQuote>) => number) => ev.reduce((a, b) => (f(b) < f(a) ? b : a)).q.id;
  const rows: [string, (e: ReturnType<typeof evalQuote>) => React.ReactNode, string?][] = [
    ['Unit price', (e) => inr(e.q.unitPrice), best((e) => e.q.unitPrice)],
    ['Freight', (e) => inr(e.q.freight)],
    ['Landed cost (65 pcs, before GST)', (e) => inr(e.taxable), best((e) => e.taxable)],
    ['GST', (e) => `${inr(e.gst)} ${e.sup.interstate ? '(IGST)' : '(CGST + SGST)'}`],
    ['Total payable', (e) => <span className="font-semibold">{inr(e.total)}</span>],
    ['Arrives', (e) => <span className={e.meetsFriday ? 'font-semibold text-emerald-700' : 'text-rose-600'}>{fmtShort(e.arrival)} {e.meetsFriday ? '· meets Friday' : '· after Friday'}</span>],
    ['Payment terms', (e) => e.q.terms],
    ['Cash impact', (e) => e.q.cashImpact],
    ['Quality history', (e) => e.q.quality],
    ['Supplier on-time', (e) => `${e.sup.onTime}% · ★ ${e.sup.rating}`],
    ['MSME status', (e) => e.sup.msme.split(' (')[0]],
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" data-testid="compare-grid">
      <div className="grid grid-cols-[220px_1fr_1fr_1fr]">
        <div className="border-b border-slate-100 bg-slate-50" />
        {ev.map((e) => (
          <button key={e.q.id} data-quote={e.q.id} onClick={() => setSel(e.q.id)} className={cx('border-b border-l border-slate-100 px-4 py-3 text-left', sel === e.q.id ? 'bg-brand-50' : 'bg-slate-50 hover:bg-slate-100')}>
            <div className="flex items-center gap-2">
              <span className={cx('flex h-4 w-4 items-center justify-center rounded-full border', sel === e.q.id ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white')}>{sel === e.q.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
              <span className="text-[13px] font-semibold text-slate-900">{e.sup.name}</span>
            </div>
            <div className="mt-0.5 pl-6 text-2xs text-slate-500">{e.q.id} · {e.sup.city}</div>
            {e.q.id === rec.rec.q.id && <div className="mt-1 pl-6"><Badge tone="green"><Award size={11} className="mr-1 inline" />Recommended</Badge></div>}
          </button>
        ))}
        {rows.map(([label, f, b]) => (
          <div key={label} className="contents">
            <div className="border-b border-slate-50 px-4 py-2 text-xs text-slate-500">{label}</div>
            {ev.map((e) => <div key={e.q.id} className={cx('tabular border-b border-l border-slate-50 px-4 py-2 text-[13px] text-slate-700', sel === e.q.id && 'bg-brand-50/40')}>{f(e)}{b === e.q.id && <span className="ml-1 text-2xs text-emerald-600">lowest</span>}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PRDetail() {
  const { id } = useParams();
  const ctx = useStore();
  const { s, update, toast, startTask } = ctx;
  const nav = useNavigate();
  const pr = s.prs.find((p) => p.id === id);
  const [tab, setTab] = useTab('Overview');
  const [sel, setSel] = useState<string>(s.selectedQuote || RECOMMENDED);
  const [review, setReview] = useState(false);
  const [qd, setQd] = useState<string | null>(null);
  if (!pr) return <div className="p-8 text-slate-500">Request not found.</div>;
  const is208 = pr.id === 'PR-208';
  const rec = recommendation();
  const selEv = evalQuote(quotes.find((q) => q.id === sel)!);
  const po = s.pos.find((p) => p.id === pr.po);
  const task = s.tasks.find((t) => /Prime Components’ Friday slot/.test(t.text));
  if (!is208) {
    return (
      <div className="space-y-4">
        <PageHeader crumbs={[{ label: 'Procurement', to: '/procurement' }, { label: pr.id }]} title={`${pr.id} · ${pr.material}`} subtitle={`Requested by ${pr.requestedBy} on ${fmtDate(pr.date)}`} badge={<Status>{pr.status}</Status>}
          actions={pr.status === 'Draft' ? <Button variant="primary" onClick={() => { update((d) => { d.prs.find((x) => x.id === pr.id)!.status = 'Requesting quotes'; }, `${pr.id} sent for quotes`); toast('Procurement agent will request quotes from 2 suppliers (simulated)'); }}>Request quotes</Button> : undefined} />
        <Card title="Request"><Fields cols={3}><Field label="Quantity">{pr.qty}</Field><Field label="Needed by">{fmtShort(pr.neededBy)}</Field><Field label="For">{pr.linkedOrder ? <Link className="text-brand-700" to={`/orders/${pr.linkedOrder}`}>{pr.linkedOrder}</Link> : 'Stock replenishment'}</Field><Field label="In stock">{pr.inStock}</Field><Field label="Preferred suppliers">{pr.preferred.map((x) => supplierById(x).name).join(', ')}</Field><Field label="Purchase order">{po ? `${po.id} · ${po.status}` : '—'}</Field></Fields></Card>
      </div>
    );
  }
  const e = so1051Economics(s);
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Procurement', to: '/procurement' }, { label: pr.id }]} title={`${pr.id} · 65 × Component A-17`} subtitle={<>For <Link to="/orders/SO-1051" className="text-brand-700 hover:underline">SO-1051</Link> (Sri Lakshmi Projects, due Fri 30 Oct) · raised by the Procurement agent for {pr.requestedBy}</>} badge={<Status>{pr.status}</Status>}
        actions={s.pr208Approved ? <>
          {!s.po0921Sent && <Button icon={<Send size={14} />} variant="primary" data-testid="send-po" onClick={() => sendPO(ctx)}>Review & send PO-0921</Button>}
          <Button icon={<Bot size={14} />} disabled={!!task} data-testid="followup-agent" onClick={() => startTask(HANDOFFS['handoff-followup'](ctx))}>{task ? (task.status === 'running' ? 'Procurement agent working…' : 'Follow-up prepared') : 'Prepare supplier follow-up'}</Button>
        </> : <Button variant="primary" data-testid="review-approve" onClick={() => { setTab('Compare'); setReview(true); }}>Review and approve</Button>} />
      {s.pr208Approved ? (
        <Callout tone="green" icon={<CheckCircle2 size={16} />} title={`Approved – ${po?.id} raised for ${supplierById(po!.supplierId).name}`}>
          {inr(po!.value)} incl. GST · arrives {fmtShort(po!.eta)} · {po!.status}. SO-1051 production replanned: 35 units ship Fri 30 Oct, 65 on Tue 3 Nov.
          <span className="ml-2"><Link to="/operations?order=SO-1051" className="font-medium underline">See production plan</Link></span>
        </Callout>
      ) : (
        <Callout tone="blue" icon={<Star size={16} />} title={`Recommended: ${rec.rec.sup.name}`} action={<Button size="sm" variant="primary" onClick={() => { setSel(RECOMMENDED); setTab('Compare'); }}>Compare quotes</Button>}>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">{rec.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </Callout>
      )}
      <Tabs tabs={['Overview', 'Quotes', 'Compare', 'Activity']} value={tab} onChange={setTab} counts={{ Quotes: 3 }} />
      {tab === 'Overview' && (
        <div className="grid grid-cols-3 gap-3">
          <Card title="Requirement" className="col-span-2">
            <div className="grid grid-cols-4 gap-3">
              <Kpi label="Order needs" value="100" sub="SO-1051" /><Kpi label="Available" value="35" sub="53 on hand − 18 reserved" /><Kpi label="To buy" value="65" tone="red" sub="this request" /><Kpi label="Needed by" value="Fri 30 Oct" sub="10 am at Jeedimetla" />
            </div>
            <div className="mt-3 text-xs text-slate-500">HSN 7616 99 90 · Approved sources: Deccan Castings, Prime Components · Last price ₹4,600 (GRN-0784)</div>
          </Card>
          <Card title="Impact on SO-1051">
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between"><span className="text-slate-500">Expected margin</span><span className="font-medium">{e.marginPct.toFixed(1)}% <span className="text-2xs text-slate-400">vs {e.plannedPct.toFixed(1)}% planned</span></span></div>
              <div className="flex justify-between"><span className="text-slate-500">Customer exposure</span><span className="font-medium">{lakh(e.exposure)} / {lakh(e.limit)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cash today</span><span className="font-medium">{s.pr208Approved ? '₹0 (Net 30)' : 'depends on quote'}</span></div>
            </div>
          </Card>
        </div>
      )}
      {tab === 'Quotes' && (
        <Card pad={false}>
          <DataTable rowKey={(q) => q.id} rows={quotes} onRowClick={(q) => setQd(q.id)} columns={[
            { key: 'i', header: 'Quote', render: (q) => <span className="font-medium">{q.id}</span> }, { key: 's', header: 'Supplier', render: (q) => supplierById(q.supplierId).name }, { key: 'r', header: 'Their ref', render: (q) => <span className="text-slate-500">{q.ref}</span> },
            { key: 'u', header: 'Unit price', align: 'right', render: (q) => inr(q.unitPrice) }, { key: 'l', header: 'Lead time', render: (q) => `${q.leadDays} days` }, { key: 't', header: 'Terms', render: (q) => q.terms },
            { key: 'v', header: 'Valid till', render: (q) => fmtShort(q.validity) }, { key: 'rc', header: 'Received', render: (q) => fmtShort(q.received) },
          ]} />
        </Card>
      )}
      {tab === 'Compare' && (
        <>
          <CompareGrid sel={sel} setSel={setSel} />
          {!s.pr208Approved && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[13px] text-slate-600">Selected: <span className="font-semibold text-slate-900">{selEv.sup.name}</span> · {inr(selEv.total)} incl. GST · arrives {fmtShort(selEv.arrival)}{!selEv.meetsFriday && <span className="ml-2 text-rose-600">Misses Friday for all 100 units</span>}</div>
              <Button variant="primary" data-testid="review-approve-bottom" icon={<ShieldCheck size={14} />} onClick={() => setReview(true)}>Review and approve</Button>
            </div>
          )}
        </>
      )}
      {tab === 'Activity' && (
        <Card><Timeline items={[
          ...s.log.filter((l) => /PR-208|PO-0921|Prime/.test(l.text)).map((l) => ({ date: `Today ${l.at}`, title: l.text, text: l.who, tone: 'blue' as const })),
          { date: '28 Oct 08:40', title: 'Quote PC/QTN/1042 received – Prime Components', text: 'Procurement agent' },
          { date: '27 Oct 17:55', title: 'Quotes received – Deccan Castings, CastHub Rajkot', text: 'Procurement agent' },
          { date: '27 Oct 11:20', title: 'Quote requests sent to 3 approved suppliers', text: 'Procurement agent' },
          { date: '27 Oct 11:05', title: 'PR-208 raised automatically: SO-1051 needs 100, 35 available', text: 'Procurement agent', tone: 'amber' as const },
        ]} /></Card>
      )}
      <Modal open={review} onClose={() => setReview(false)} title="Review and approve PR-208" subtitle="This raises a purchase order. It is not sent to the supplier until you approve the message." width="max-w-xl"
        footer={<><Button onClick={() => setReview(false)}>Cancel</Button><Button variant="primary" data-testid="approve-pr" icon={<CheckCircle2 size={14} />} onClick={() => { approvePR208(ctx, sel); setReview(false); }}>Approve purchase</Button></>}>
        <div className="space-y-3">
          <Fields cols={2}>
            <Field label="Supplier">{selEv.sup.name} · {selEv.sup.msme.split(' (')[0]}</Field><Field label="Quote">{selEv.q.id} ({selEv.q.ref})</Field>
            <Field label="Quantity">65 × Component A-17 @ {inr(selEv.q.unitPrice)}</Field><Field label="Freight">{inr(selEv.q.freight)}</Field>
            <Field label="Taxable value">{inr(selEv.taxable)}</Field><Field label={selEv.sup.interstate ? 'IGST 18%' : 'CGST 9% + SGST 9%'}>{selEv.sup.interstate ? inr(selEv.gst) : `${inr(selEv.gst / 2)} + ${inr(selEv.gst / 2)}`}</Field>
            <Field label="Total payable">{inr(selEv.total)}</Field><Field label="Payment">{selEv.q.terms} · {selEv.q.cashImpact}</Field>
            <Field label="Arrives">{fmtShort(selEv.arrival)}</Field><Field label="SO-1051 outcome">{selEv.meetsFriday ? '35 Fri 30 Oct + 65 Tue 3 Nov' : 'Balance 65 slips past Tue 3 Nov'}</Field>
          </Fields>
          {sel !== RECOMMENDED && <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">You picked a quote other than the recommendation. That's fine; the reason will be logged.</div>}
          <div className="rounded-md bg-slate-50 px-3 py-2 text-2xs text-slate-500">Within your approval limit (₹5 lakh). Budget: Components – Oct (₹2.1 lakh left before this PO).</div>
        </div>
      </Modal>
      <Modal open={!!qd} onClose={() => setQd(null)} title={qd ? `${qd} · ${supplierById(quotes.find((q) => q.id === qd)!.supplierId).name}` : ''} subtitle="Supplier quotation">
        {qd && (() => { const ev = evalQuote(quotes.find((q) => q.id === qd)!); return (
          <div className="space-y-3"><Fields cols={2}><Field label="Their reference">{ev.q.ref}</Field><Field label="Received">{fmtDate(ev.q.received)}</Field><Field label="Unit price">{inr(ev.q.unitPrice)}</Field><Field label="Freight">{inr(ev.q.freight)}</Field><Field label="Lead time">{ev.q.leadDays} days → {fmtShort(ev.arrival)}</Field><Field label="Payment terms">{ev.q.terms}</Field><Field label="Valid till">{fmtDate(ev.q.validity)}</Field><Field label="GST">{ev.sup.interstate ? 'IGST 18% (from Gujarat)' : 'CGST + SGST 18%'}</Field></Fields>
            <div className="rounded-md bg-slate-50 px-3 py-2 text-[13px] text-slate-600">{ev.q.notes}</div>
            <Button size="sm" onClick={() => { setSel(ev.q.id); setQd(null); setTab('Compare'); }}>Select in comparison</Button></div>); })()}
      </Modal>
    </div>
  );
}
