import { useState } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { MessageCircle, Truck, RefreshCw, FileText, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import { useStore } from '../lib/store';
import { Order } from '../lib/data';
import { customerById, orderValue, available, so1051Economics, outstanding } from '../lib/domain';
import { inr, lakh, fmtDate, fmtShort, gstSplit } from '../lib/format';
import { PageHeader, Card, Button, DataTable, SearchBox, Select, Segmented, Toolbar, Modal, Field, Fields, Timeline, Status, Tabs, useTab, Progress, Callout, Badge, Kpi } from '../components/ui';
import { confirmSplit } from '../lib/actions';

export const HSN: Record<string, string> = { 'FG-PHA17': '8413 91 90', 'FG-BF30': '7308 90 90', 'FG-RA12': '7308 90 90', 'FG-JB15': '8538 10 90', 'FG-MBF20': '7326 90 99', 'FG-CPE806': '8538 10 90', 'FG-CH90': '7326 90 99', 'FG-GP10': '7308 90 90', 'FG-GT08': '7308 30 00' };
const VIEWS = ['All open', 'At risk', 'Ready for dispatch', 'Closed'];
export function OrdersList() {
  const { s } = useStore();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const view = sp.get('view') || 'All open';
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState('All owners');
  const rows = s.orders.filter((o) => {
    if (view === 'Closed' ? o.open : !o.open) return false;
    if (view === 'At risk' && o.risk === 'On track') return false;
    if (view === 'Ready for dispatch' && o.status !== 'Ready for dispatch') return false;
    if (owner !== 'All owners' && o.owner !== owner) return false;
    return (o.id + customerById(s, o.customerId).name + o.project).toLowerCase().includes(q.toLowerCase());
  });
  const open = s.orders.filter((o) => o.open);
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Orders' }]} title="Orders" subtitle="Every sales order from confirmation to delivery, with material, production, payment and dispatch in one row" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Open orders" value={String(open.length)} sub={lakh(open.reduce((a, o) => a + orderValue(o), 0)) + ' + GST'} />
        <Kpi label="At risk" value={String(open.filter((o) => o.risk === 'At risk').length)} sub="material short" tone="red" />
        <Kpi label="Ready for dispatch" value={String(open.filter((o) => o.status === 'Ready for dispatch').length)} sub="packed & QC passed" tone="green" />
        <Kpi label="Due this week" value={String(open.filter((o) => o.promised <= '2026-11-01').length)} sub="promised by Sun 1 Nov" />
      </div>
      <Toolbar right={<Segmented value={view} onChange={(v) => setSp({ view: v })} options={VIEWS.map((v) => ({ value: v, label: v }))} />}>
        <SearchBox value={q} onChange={setQ} placeholder="Search order, customer or project" />
        <Select value={owner} onChange={setOwner} options={['All owners', 'Karthik Varma', 'Sneha Iyer', 'Imran Khan']} />
      </Toolbar>
      <Card pad={false}>
        <DataTable rowKey={(o: Order) => o.id} rows={rows} onRowClick={(o) => nav(`/orders/${o.id}`)} highlight={(o) => o.risk === 'At risk'} columns={[
          { key: 'id', header: 'Order', render: (o) => <span className="font-medium text-slate-900">{o.id}</span> },
          { key: 'c', header: 'Customer', render: (o) => <div><div className="text-slate-800">{customerById(s, o.customerId).name}</div><div className="max-w-[220px] truncate text-2xs text-slate-400">{o.project}</div></div> },
          { key: 'p', header: 'Promised', render: (o) => fmtShort(o.promised) },
          { key: 'v', header: 'Value', align: 'right', render: (o) => inr(orderValue(o)) },
          { key: 'pr', header: 'Production', width: '120px', render: (o) => <div className="w-24"><Progress value={o.production} /></div> },
          { key: 'm', header: 'Material', render: (o) => <Status>{o.material}</Status> },
          { key: 'pay', header: 'Payment', render: (o) => <span className="text-slate-600">{o.payment}</span> },
          { key: 'd', header: 'Dispatch', render: (o) => <span className="text-slate-600">{o.dispatch}</span> },
          { key: 'r', header: 'Risk', render: (o) => <Status>{o.risk}</Status> },
        ]} />
      </Card>
    </div>
  );
}

const STATUSES: Order['status'][] = ['Confirmed', 'In production', 'Ready for dispatch', 'Delivered', 'Blocked'];
export function OrderDetail() {
  const { id } = useParams();
  const ctx = useStore();
  const { s, update, toast, openDraft } = ctx;
  const nav = useNavigate();
  const [tab, setTab] = useTab('Overview');
  const [stOpen, setStOpen] = useState(false);
  const [dpOpen, setDpOpen] = useState(false);
  const [doc, setDoc] = useState<string | null>(null);
  const o = s.orders.find((x) => x.id === id);
  if (!o) return <div className="p-8 text-slate-500">Order not found. <Link to="/orders" className="text-brand-700">Back to orders</Link></div>;
  const c = customerById(s, o.customerId);
  const interstate = c.stateCode !== '36';
  const taxable = orderValue(o);
  const g = gstSplit(taxable, interstate);
  const wos = s.workOrders.filter((w) => w.order === o.id);
  const sku = o.material_sku ? s.skus.find((k) => k.sku === o.material_sku) : undefined;
  const is51 = o.id === 'SO-1051';
  const pr = is51 ? s.prs.find((p) => p.id === 'PR-208') : o.id === 'SO-1049' ? s.prs.find((p) => p.id === 'PR-207') : undefined;
  const owed = s.invoices.filter((i) => i.customerId === c.id).reduce((a, i) => a + outstanding(i), 0);
  const contact = () => openDraft({
    title: `Message ${c.contact}`, channel: 'WhatsApp', to: `${c.contact} · ${c.name}`, toDetail: c.phone,
    body: is51 ? (s.pr208Approved ? `Namaste ${c.contact.split(' ')[0]} garu,\n\nUpdate on ${o.id} (Tower B pump sets): 35 units will be dispatched on Fri 30 Oct and the balance 65 on Tue 3 Nov. We will share the e-way bill and LR number on dispatch.\n\nRegards,\nRiya Reddy` : `Namaste ${c.contact.split(' ')[0]} garu,\n\nQuick update on ${o.id}: production is underway. We will confirm the Friday dispatch quantity by this evening.\n\nRegards,\nRiya Reddy`) : `Namaste ${c.contact.split(' ')[0]} garu,\n\nUpdate on ${o.id} (${o.project}): status is "${o.status}", planned delivery ${fmtShort(o.promised)}.\n\nRegards,\nAarohan Industries`,
    approveLabel: 'Approve & send', onApprove: () => { update(() => {}, `Customer update sent for ${o.id} (simulated)`); toast('Message marked as sent (simulated)'); },
  });
  const docs = [
    ['Sales order', `${o.id}.pdf`, fmtDate(o.date)], ['Proforma invoice', `PI-${o.id.slice(3)}.pdf`, fmtDate(o.date)],
    ...(o.invoice ? [['Tax invoice', `${o.invoice}.pdf`, '—']] : []),
    ...(o.jobWork ? [['Job-work challan (Rule 45)', 'To be raised with WO-3323', '—']] : []),
    ['Delivery challan', o.dispatch === 'Delivered' ? `DC-${o.id.slice(3)}.pdf` : 'Generated at dispatch', '—'],
    ['E-way bill', o.status === 'Ready for dispatch' ? 'Draft ready (simulated)' : 'Generated at dispatch', '—'],
  ];
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Orders', to: '/orders' }, { label: o.id }]} title={<>{o.id} · {c.name}</>} subtitle={`${o.project} · ordered ${fmtDate(o.date)} · owner ${o.owner}`} badge={<><Status>{o.status}</Status> <Status>{o.risk}</Status></>}
        actions={<>
          <Button icon={<MessageCircle size={14} />} data-testid="contact-customer" onClick={contact}>Contact customer</Button>
          <Button icon={<Truck size={14} />} data-testid="prepare-dispatch" onClick={() => setDpOpen(true)}>Prepare dispatch plan</Button>
          <Button variant="primary" icon={<RefreshCw size={14} />} data-testid="update-status" onClick={() => setStOpen(true)}>Update status</Button>
        </>} />
      {o.riskNote && (
        <Callout tone={o.risk === 'At risk' ? 'red' : o.risk === 'Watch' ? 'amber' : 'green'} icon={o.risk === 'On track' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} title={o.risk === 'At risk' ? `Delivery on ${fmtShort(o.promised)} is at risk` : o.risk === 'Watch' ? 'Recovering – watch closely' : 'On track'}
          action={is51 && !s.pr208Approved ? <Button size="sm" variant="primary" onClick={() => nav('/procurement/PR-208?tab=Compare')}>Review quotes for PR-208</Button> : is51 && s.pr208Approved && !s.splitConfirmed ? <Button size="sm" variant="primary" onClick={() => confirmSplit(ctx)}>Confirm split with customer</Button> : undefined}>
          {o.riskNote}
        </Callout>
      )}
      <Tabs tabs={['Overview', 'Items', 'Production', 'Materials', 'Dispatch', 'Documents', 'Activity']} value={tab} onChange={setTab} />
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card title="Commitment" className="col-span-2">
            <Fields cols={3}>
              <Field label="Promised delivery">{fmtShort(o.promised)}</Field><Field label="Order value">{inr(taxable)} + GST</Field><Field label="Invoice value (incl. GST)">{inr(g.total)}</Field>
              <Field label="Production">{o.production}% complete</Field><Field label="Material">{o.material}</Field><Field label="Payment">{o.payment}{o.advance ? ` · ${inr(o.advance)} advance` : ''}</Field>
              <Field label="Dispatch">{o.dispatch}</Field><Field label="Job work">{o.jobWork || 'None'}</Field><Field label="Deliver to">{o.deliverTo}</Field>
            </Fields>
          </Card>
          <Card title="Customer & credit">
            <div className="space-y-1 text-[13px]"><Link to={`/sales/customer/${c.id}`} className="font-medium text-brand-700 hover:underline">{c.name}</Link>
              <div className="text-slate-500">{c.contact} · {c.phone}</div><div className="text-slate-500">GSTIN {c.gstin}</div>
              <div className="pt-2 text-xs text-slate-600">Outstanding {inr(owed)} · limit {lakh(c.creditLimit)} · {c.creditDays} days</div>
              {is51 && <div className="mt-1"><Progress value={so1051Economics(s).utilisation} tone={so1051Economics(s).utilisation > 90 ? 'amber' : 'green'} /><div className="mt-1 text-2xs text-amber-700">After this order: {so1051Economics(s).utilisation.toFixed(0)}% of credit limit</div></div>}
            </div>
          </Card>
        </div>
      )}
      {tab === 'Items' && (
        <Card pad={false}>
          <table className="w-full text-[13px]">
            <thead className="border-b border-slate-100 text-2xs uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-2 text-left">Item</th><th className="px-4 py-2 text-left">HSN</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">Rate</th><th className="px-4 py-2 text-right">Taxable</th></tr></thead>
            <tbody>{o.items.map((it) => <tr key={it.sku} className="border-b border-slate-50"><td className="px-4 py-2.5"><div className="font-medium text-slate-900">{it.sku}</div><div className="text-2xs text-slate-500">{it.desc}</div></td><td className="tabular px-4 py-2.5 text-slate-500">{HSN[it.sku] || '7326 90 99'}</td><td className="tabular px-4 py-2.5 text-right">{it.qty}</td><td className="tabular px-4 py-2.5 text-right">{inr(it.rate)}</td><td className="tabular px-4 py-2.5 text-right">{inr(it.qty * it.rate)}</td></tr>)}</tbody>
            <tfoot className="text-[13px]">
              {interstate ? <tr><td colSpan={4} className="px-4 py-1.5 text-right text-slate-500">IGST 18% (inter-state, place of supply {c.stateCode === '29' ? 'Karnataka (29)' : c.stateCode})</td><td className="tabular px-4 py-1.5 text-right">{inr(g.igst)}</td></tr>
                : <><tr><td colSpan={4} className="px-4 py-1.5 text-right text-slate-500">CGST 9%</td><td className="tabular px-4 py-1.5 text-right">{inr(g.cgst)}</td></tr><tr><td colSpan={4} className="px-4 py-1.5 text-right text-slate-500">SGST 9% (Telangana)</td><td className="tabular px-4 py-1.5 text-right">{inr(g.sgst)}</td></tr></>}
              <tr className="font-semibold"><td colSpan={4} className="px-4 py-2 text-right">Total</td><td className="tabular px-4 py-2 text-right">{inr(g.total)}</td></tr>
            </tfoot>
          </table>
        </Card>
      )}
      {tab === 'Production' && (
        <Card pad={false} title="Work orders" actions={<Link to={`/operations?order=${o.id}`} className="text-xs font-medium text-brand-700 hover:underline">Open in Operations</Link>}>
          <DataTable rowKey={(w) => w.id} rows={wos} empty="No work orders yet" onRowClick={() => nav(`/operations?order=${o.id}`)} columns={[
            { key: 'i', header: 'WO', render: (w) => <span className="font-medium">{w.id}</span> }, { key: 'op', header: 'Operation', render: (w) => <span>{w.op}{w.outsourced && <Badge tone="violet">Job work</Badge>}</span> },
            { key: 'c', header: 'Work centre', render: (w) => w.center }, { key: 'f', header: 'Finish', render: (w) => fmtShort(w.finish) },
            { key: 'p', header: 'Progress', render: (w) => <div className="w-28"><Progress value={w.progress} planned={w.planned} /></div> }, { key: 's', header: 'Status', render: (w) => <Status>{w.status}</Status> },
            { key: 'n', header: 'Note', render: (w) => <span className="text-2xs text-slate-500">{w.note || w.dependency}</span> },
          ]} />
        </Card>
      )}
      {tab === 'Materials' && (
        <Card title="Material requirement" subtitle="Checked live against inventory and open purchase orders">
          {sku ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5" data-testid="material-summary">
                <Kpi label="Required" value={String(o.materialNeed)} sub={sku.name} />
                <Kpi label="On hand" value={String(sku.onHand)} sub={sku.location} />
                <Kpi label="Reserved elsewhere" value={String(sku.reserved)} sub={is51 ? 'SO-1047 · SO-1052' : 'other orders'} />
                <Kpi label="Available" value={String(available(sku))} tone="amber" />
                <Kpi label="Shortfall" value={String(Math.max(0, (o.materialNeed || 0) - available(sku)))} tone={sku.incoming ? 'green' : 'red'} sub={sku.incoming ? `${sku.incoming} incoming on ${sku.incomingRef} · ${fmtShort(sku.incomingEta!)}` : 'not covered yet'} />
              </div>
              <div className="mt-3 flex items-center gap-3 text-[13px]">
                <Link to={`/inventory/${sku.sku}`} className="font-medium text-brand-700 hover:underline">Open {sku.sku} in Inventory</Link>
                {pr && <Link to={`/procurement/${pr.id}`} className="font-medium text-brand-700 hover:underline">{pr.id} · {pr.status}</Link>}
              </div>
            </>
          ) : <div className="text-[13px] text-slate-500">All materials for this order are in stock and reserved.</div>}
        </Card>
      )}
      {tab === 'Dispatch' && (
        <Card title="Dispatch">
          {is51 && s.pr208Approved ? (
            <div className="grid grid-cols-2 gap-3">
              {[['Lot 1 · 35 units', 'Fri 30 Oct', 'From stock · coated Thu 29 Oct'], ['Lot 2 · 65 units', 'Tue 3 Nov', 'After PO-0921 arrives Fri 30 Oct']].map(([a, b, c2]) => (
                <div key={a} className="rounded-lg border border-slate-200 p-3"><div className="text-[13px] font-semibold text-slate-900">{a}</div><div className="text-[13px] text-slate-700">{b}</div><div className="text-2xs text-slate-500">{c2}</div><div className="mt-2 text-2xs text-slate-400">Sri Sai Transport · e-way bill at dispatch</div></div>
              ))}
              <div className="col-span-2 text-xs text-slate-500">{s.splitConfirmed ? 'Split delivery communicated to Srinivas Rao.' : 'Split not yet confirmed with the customer – waiting in Approvals.'}</div>
            </div>
          ) : (
            <Fields cols={3}><Field label="Deliver to">{o.deliverTo}</Field><Field label="Transporter">{o.transporter || 'To assign'}</Field><Field label="Vehicle">{o.vehicle || '—'}</Field><Field label="E-way bill">{interstate ? 'Required – inter-state' : g.total > 50000 ? 'Required (over ₹50,000)' : 'Not required'}</Field><Field label="Dispatch status">{o.dispatch}</Field><Field label="Planned">{fmtShort(o.promised)}</Field></Fields>
          )}
        </Card>
      )}
      {tab === 'Documents' && (
        <Card pad={false}>
          <DataTable rowKey={(d) => d[0]} rows={docs} columns={[{ key: 'n', header: 'Document', render: (d) => <span className="flex items-center gap-2"><FileText size={14} className="text-slate-400" />{d[0]}</span> }, { key: 'f', header: 'File', render: (d) => <span className="text-slate-500">{d[1]}</span> }, { key: 'd', header: 'Date', render: (d) => d[2] }, { key: 'a', header: '', align: 'right', render: (d) => <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => setDoc(d[0])}>Preview</Button> }]} />
        </Card>
      )}
      {tab === 'Activity' && (
        <Card><Timeline items={[
          ...s.log.filter((l) => l.text.includes(o.id) || (is51 && /PR-208|PO-0921|split/i.test(l.text))).map((l) => ({ date: `Today ${l.at}`, title: l.text, text: l.who, tone: 'blue' as const })),
          ...(is51 ? [{ date: '27 Oct 2026', title: 'Shortfall detected – PR-208 raised automatically', text: 'Procurement agent', tone: 'amber' as const }, { date: '20 Oct 2026', title: 'Advance ₹1,50,000 received (NEFT)', text: 'Bhargavi Reddy' }] : []),
          { date: fmtDate(o.date), title: `Order confirmed · ${inr(taxable)} + GST`, text: o.owner },
        ]} /></Card>
      )}
      <Modal open={stOpen} onClose={() => setStOpen(false)} title={`Update status · ${o.id}`}>
        <div className="grid grid-cols-2 gap-2">{STATUSES.map((st) => <Button key={st} variant={o.status === st ? 'primary' : 'secondary'} onClick={() => { update((d) => { const x = d.orders.find((y) => y.id === o.id)!; x.status = st; }, `${o.id} status set to ${st}`); toast(`${o.id} → ${st}`); setStOpen(false); }}>{st}</Button>)}</div>
      </Modal>
      <Modal open={dpOpen} onClose={() => setDpOpen(false)} title={`Dispatch plan · ${o.id}`} subtitle="Prepared from order, packing and transporter data" footer={<><Button onClick={() => setDpOpen(false)}>Close</Button><Button variant="primary" onClick={() => { update((d) => { const x = d.orders.find((y) => y.id === o.id)!; if (x.dispatch === 'Not started' || x.dispatch === 'Ready') x.dispatch = 'Scheduled'; }, `Dispatch planned for ${o.id}`); toast('Dispatch plan saved. E-way bill data drafted (simulated)'); setDpOpen(false); }}>Save plan</Button></>}>
        <Fields cols={2}>
          <Field label="Date">{is51 && s.pr208Approved ? 'Fri 30 Oct (35) · Tue 3 Nov (65)' : fmtShort(o.promised)}</Field>
          <Field label="Vehicle">{o.vehicle || 'TS 08 UB 4521 · Sri Sai Transport'}</Field>
          <Field label="Packing">{o.items.reduce((a, i) => a + i.qty, 0)} pcs · est. {Math.ceil(o.items.reduce((a, i) => a + i.qty, 0) / 7)} pallets</Field>
          <Field label="E-way bill">{interstate ? 'Inter-state – IGST' : 'Intra-state – CGST + SGST'}; Part-B with vehicle no.</Field>
          <Field label="Deliver to" className="col-span-2">{o.deliverTo}</Field>
        </Fields>
        {is51 && !s.pr208Approved && <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Only 35 units can be planned until PR-208 is approved.</div>}
      </Modal>
      <Modal open={!!doc} onClose={() => setDoc(null)} title={`${doc} · ${o.id}`} subtitle="Preview (simulated document)" width="max-w-2xl">
        <div className="rounded-lg border border-slate-200 p-5 text-[12.5px]">
          <div className="flex justify-between"><div><div className="font-semibold text-slate-900">Aarohan Industries Pvt. Ltd.</div><div className="text-slate-500">Plot 14, IDA Jeedimetla Phase II, Hyderabad 500055</div><div className="text-slate-500">GSTIN 36AAMCA4821K1Z6 · UDYAM-TS-02-0045671</div></div><div className="text-right"><div className="text-[15px] font-semibold uppercase text-slate-800">{doc}</div><div className="text-slate-500">Ref {o.id} · {fmtDate(o.date)}</div></div></div>
          <div className="mt-4 text-slate-600">Bill to: <span className="font-medium text-slate-800">{c.name}</span>, GSTIN {c.gstin} · Place of supply: {c.stateCode === '36' ? 'Telangana (36)' : 'Karnataka (29)'}</div>
          <table className="mt-3 w-full"><tbody>{o.items.map((it) => <tr key={it.sku} className="border-t border-slate-100"><td className="py-1.5">{it.desc}</td><td className="tabular">{HSN[it.sku] || '7326 90 99'}</td><td className="tabular text-right">{it.qty} × {inr(it.rate)}</td><td className="tabular text-right">{inr(it.qty * it.rate)}</td></tr>)}</tbody></table>
          <div className="mt-2 text-right text-slate-600">{interstate ? `IGST 18%: ${inr(g.igst)}` : `CGST 9%: ${inr(g.cgst)} · SGST 9%: ${inr(g.sgst)}`} · <span className="font-semibold text-slate-900">Total {inr(g.total)}</span></div>
        </div>
      </Modal>
    </div>
  );
}
