import { useState } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { Plus, AlertTriangle, Truck } from 'lucide-react';
import { useStore } from '../lib/store';
import { a17Movements, reservations } from '../lib/data';
import { available, isLow } from '../lib/domain';
import { inr, lakh, fmtDate, fmtShort } from '../lib/format';
import { PageHeader, Card, Button, DataTable, SearchBox, Select, Segmented, Toolbar, Modal, Field, Fields, Status, Tabs, useTab, Callout, Badge, Kpi } from '../components/ui';

type S = ReturnType<typeof useStore>['s']['skus'][number];
const VIEWS = ['All items', 'Low stock', 'Slow moving', 'At job workers'];
export function InventoryList() {
  const { s } = useStore();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const view = sp.get('view') || 'All items';
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All categories');
  const atJW = new Set(['CPE-806', 'MB-22']);
  const rows = s.skus.filter((k) => (cat === 'All categories' || k.category === cat) && (k.sku + k.name).toLowerCase().includes(q.toLowerCase()) &&
    (view === 'All items' || (view === 'Low stock' && isLow(k)) || (view === 'Slow moving' && k.agingDays > 120) || (view === 'At job workers' && (k.atJobWorker || atJW.has(k.sku)))));
  const value = s.skus.reduce((a, k) => a + k.onHand * k.unitCost, 0);
  const jwValue = s.challans.reduce((a, c) => a + (c.sent - c.returned - c.scrap) * c.valuePerUnit, 0);
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Inventory' }]} title="Inventory" subtitle="Stock on hand, reserved for orders, and what is actually free to use" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Stock value" value={lakh(value)} sub={`${s.skus.length} items · 2 stores`} />
        <Kpi label="Below reorder level" value={String(s.skus.filter(isLow).length)} sub="incl. Component A-17" tone="amber" onClick={() => setSp({ view: 'Low stock' })} />
        <Kpi label="Slow moving (120+ days)" value={lakh(s.skus.filter((k) => k.agingDays > 120).reduce((a, k) => a + k.onHand * k.unitCost, 0))} sub="2 items · cash tied up" tone="red" onClick={() => setSp({ view: 'Slow moving' })} />
        <Kpi label="With job workers" value={lakh(jwValue)} sub="see Job Work" onClick={() => nav('/job-work')} />
      </div>
      <Toolbar right={<Segmented value={view} onChange={(v) => setSp({ view: v })} options={VIEWS.map((v) => ({ value: v, label: v }))} />}>
        <SearchBox value={q} onChange={setQ} placeholder="Search SKU or item" />
        <Select value={cat} onChange={setCat} options={['All categories', 'Raw material', 'Components', 'Consumables', 'Packaging', 'Finished goods']} />
      </Toolbar>
      <Card pad={false}>
        <DataTable rowKey={(k: S) => k.sku} rows={rows} onRowClick={(k) => nav(`/inventory/${k.sku}`)} highlight={(k) => k.sku === 'RM-A17'} empty={view === 'At job workers' ? 'Material at job workers is tracked by challan in Job Work.' : undefined} columns={[
          { key: 's', header: 'SKU', render: (k) => <span className="font-medium text-slate-900">{k.sku}</span> },
          { key: 'n', header: 'Item', render: (k) => <div><div className="text-slate-800">{k.name}</div><div className="text-2xs text-slate-400">{k.category} · HSN {k.hsn}</div></div> },
          { key: 'l', header: 'Location', render: (k) => <span className="text-slate-500">{k.location}</span> },
          { key: 'o', header: 'On hand', align: 'right', render: (k) => k.onHand }, { key: 'r', header: 'Reserved', align: 'right', render: (k) => k.reserved || '—' },
          { key: 'a', header: 'Available', align: 'right', render: (k) => <span className={isLow(k) ? 'font-semibold text-amber-700' : ''}>{available(k)}</span> },
          { key: 'ro', header: 'Reorder at', align: 'right', render: (k) => k.reorder || '—' }, { key: 'v', header: 'Value', align: 'right', render: (k) => inr(k.onHand * k.unitCost) },
          { key: 'f', header: '', render: (k) => (k.incoming ? <Badge tone="blue">+{k.incoming} incoming</Badge> : isLow(k) ? <Badge tone="amber">Low</Badge> : k.agingDays > 120 ? <Badge tone="red">{k.agingDays} days idle</Badge> : null) },
        ]} />
      </Card>
    </div>
  );
}

export function ItemDetail() {
  const { id } = useParams();
  const { s, update, toast } = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useTab('Overview');
  const [pr, setPr] = useState(false);
  const [qty, setQty] = useState('50');
  const k = s.skus.find((x) => x.sku === id);
  if (!k) return <div className="p-8 text-slate-500">Item not found.</div>;
  const is17 = k.sku === 'RM-A17';
  const res = reservations[k.sku] || [];
  const chatGrn = (s.purchases || []).filter((x) => x.sku === k.sku).map((x) => ({ date: x.date, ref: x.id, type: 'Receipt' as const, qty: x.addQty, note: `From ${x.supplier} · logged from chat` }));
  const mov = [...chatGrn, ...(is17 ? [...(k.incoming ? [{ date: '2026-10-30', ref: k.incomingRef!, type: 'Incoming' as const, qty: k.incoming, note: `Expected from PO-0921 · ${fmtShort(k.incomingEta!)}` }] : []), ...a17Movements] : [
    { date: k.lastMovement, ref: 'GRN', type: 'Receipt' as const, qty: Math.max(1, Math.round(k.onHand / 2)), note: 'Last receipt', balance: k.onHand },
  ])];
  const existingPR = s.prs.find((p) => p.sku === k.sku && !/Closed/.test(p.status));
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Inventory', to: '/inventory' }, { label: k.sku }]} title={`${k.sku} · ${k.name}`} subtitle={`${k.category} · ${k.spec} · HSN ${k.hsn} · ${k.location}`} badge={isLow(k) ? <Badge tone="amber">Below reorder level</Badge> : undefined}
        actions={existingPR ? <Button variant="primary" onClick={() => nav(`/procurement/${existingPR.id}`)}>Open {existingPR.id}</Button> : <Button variant="primary" icon={<Plus size={14} />} data-testid="create-pr" onClick={() => setPr(true)}>Create purchase request</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5" data-testid="stock-summary">
        <Kpi label="On hand" value={String(k.onHand)} sub={k.unit} />
        <Kpi label="Reserved" value={String(k.reserved)} sub={res.length ? res.map((r) => r.order).join(' · ') : 'for open orders'} />
        <Kpi label="Available" value={String(available(k))} tone={isLow(k) ? 'amber' : undefined} />
        <Kpi label="Reorder level" value={String(k.reorder || '—')} />
        <Kpi label="Incoming" value={k.incoming ? String(k.incoming) : '—'} sub={k.incoming ? `${k.incomingRef} · ${fmtShort(k.incomingEta!)}` : 'no open PO'} tone={k.incoming ? 'green' : undefined} />
      </div>
      {is17 && !k.incoming && <Callout tone="amber" icon={<AlertTriangle size={16} />} title="SO-1051 needs 100 – only 35 are free">18 of the 53 on hand are already reserved for SO-1047 and SO-1052. PR-208 covers the 65-unit gap. <Link to="/procurement/PR-208?tab=Compare" className="font-medium underline">Compare quotes</Link></Callout>}
      <Tabs tabs={['Overview', 'Batches', 'Reservations', 'Movements']} value={tab} onChange={setTab} />
      {tab === 'Overview' && <Card><Fields cols={3}><Field label="Unit cost (weighted avg.)">{inr(k.unitCost)}</Field><Field label="Stock value">{inr(k.onHand * k.unitCost)}</Field><Field label="Last movement">{fmtDate(k.lastMovement)}</Field><Field label="Days since last issue">{k.agingDays}</Field><Field label="Specification">{k.spec}</Field><Field label="Store location">{k.location}</Field></Fields></Card>}
      {tab === 'Batches' && <Card pad={false}><DataTable rowKey={(b) => b.batch} rows={k.batches} empty="Not batch-tracked" columns={[{ key: 'b', header: 'Batch', render: (b) => <span className="font-medium">{b.batch}</span> }, { key: 'r', header: 'Heat / ref', render: (b) => b.ref }, { key: 's', header: 'Supplier', render: (b) => b.supplier }, { key: 'q', header: 'Qty', align: 'right', render: (b) => b.qty }, { key: 'bin', header: 'Bin', render: (b) => b.bin }, { key: 'd', header: 'Received', render: (b) => fmtDate(b.received) }]} /></Card>}
      {tab === 'Reservations' && <Card pad={false}><DataTable rowKey={(r) => r.order} rows={res} empty="No reservations" onRowClick={(r) => nav(`/orders/${r.order}`)} columns={[{ key: 'o', header: 'Order', render: (r) => <span className="font-medium">{r.order}</span> }, { key: 'c', header: 'Customer', render: (r) => r.customer }, { key: 'q', header: 'Qty', align: 'right', render: (r) => r.qty }, { key: 'd', header: 'Reserved on', render: (r) => fmtDate(r.date) }]} /></Card>}
      {tab === 'Movements' && <Card pad={false}><DataTable rowKey={(m) => m.ref + m.date + m.type} rows={mov} columns={[{ key: 'd', header: 'Date', render: (m) => fmtDate(m.date) }, { key: 'r', header: 'Reference', render: (m) => <span className="font-medium">{m.ref}</span> }, { key: 't', header: 'Type', render: (m) => <Status>{m.type}</Status> }, { key: 'q', header: 'Qty', align: 'right', render: (m) => <span className={m.qty < 0 ? 'text-rose-600' : 'text-emerald-700'}>{m.qty > 0 ? '+' : ''}{m.qty}</span> }, { key: 'b', header: 'Balance', align: 'right', render: (m) => ('balance' in m && m.balance != null ? m.balance : '—') }, { key: 'n', header: 'Note', render: (m) => <span className="text-slate-500">{m.note}</span> }]} /></Card>}
      <Modal open={pr} onClose={() => setPr(false)} title={`Create purchase request · ${k.sku}`} subtitle="The Procurement agent will collect quotes. Nothing is ordered until you approve." footer={<><Button onClick={() => setPr(false)}>Cancel</Button><Button variant="primary" data-testid="save-pr" onClick={() => { const nid = `PR-${210 + s.prs.length - 5}`; update((d) => { d.prs.unshift({ id: nid, sku: k.sku, material: k.name, qty: Number(qty) || 1, required: Number(qty) || 1, inStock: available(k), neededBy: '2026-11-10', requestedBy: 'Riya Reddy', date: '2026-10-28', status: 'Requesting quotes', quotes: [], preferred: ['S04'], priority: 'Medium' }); }, `${nid} raised for ${k.sku}`); toast(`${nid} raised – Procurement agent is requesting quotes (simulated)`); setPr(false); }}>Raise request</Button></>}>
        <div className="space-y-3"><label className="block text-xs font-medium text-slate-600">Quantity<input value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-[13px]" /></label><div className="text-xs text-slate-500">Suggested: bring available stock back above the reorder level ({k.reorder}).</div><div className="flex items-center gap-2 text-xs text-slate-500"><Truck size={13} /> Delivery to {k.location.split(' ·')[0]}, Jeedimetla</div></div>
      </Modal>
    </div>
  );
}
