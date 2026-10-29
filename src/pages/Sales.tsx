import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, LayoutGrid, List, MessageCircle, Phone, CalendarClock } from 'lucide-react';
import { useStore } from '../lib/store';
import { STAGES, Opportunity, Stage } from '../lib/data';
import { customerById, outstanding, overdueDays, orderValue } from '../lib/domain';
import { inr, lakh, fmtDate } from '../lib/format';
import { PageHeader, Card, Button, Badge, DataTable, SearchBox, Select, Segmented, Toolbar, Modal, Field, Fields, Timeline, Status, Kpi, Tabs, useTab, cx } from '../components/ui';

const owners = ['All owners', 'Karthik Varma', 'Sneha Iyer', 'Imran Khan'];
export function SalesList() {
  const { s, update, toast } = useStore();
  const nav = useNavigate();
  const [view, setView] = useState('board');
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState('All owners');
  const [add, setAdd] = useState(false);
  const [lead, setLead] = useState({ company: '', contact: '', value: '', need: '' });
  const rows = s.opportunities.filter((o) => (owner === 'All owners' || o.owner === owner) && (o.title + customerById(s, o.customerId).name).toLowerCase().includes(q.toLowerCase()));
  const open = s.opportunities.filter((o) => !['Won', 'Lost'].includes(o.stage));
  const weighted = open.reduce((a, o) => a + (o.value * o.probability) / 100, 0);
  const saveLead = () => {
    if (!lead.company.trim()) return;
    const id = `OP-${313 + s.opportunities.length - 12}`;
    update((d) => {
      const cid = 'C' + (d.customers.length + 1);
      d.customers.push({ id: cid, name: lead.company, contact: lead.contact || '—', designation: '', phone: '—', city: 'Hyderabad', area: '', gstin: '—', stateCode: '36', creditLimit: 0, creditDays: 30, owner: 'Riya Reddy', segment: 'Prospect', since: 'Prospect', whatsapp: true });
      d.opportunities.unshift({ id, customerId: cid, title: lead.need || 'New enquiry', value: Number(lead.value) * 100000 || 0, stage: 'New Lead', close: '2026-12-31', owner: 'Riya Reddy', next: 'First call', probability: 10, source: 'Added manually', products: lead.need, activity: [{ date: '2026-10-28', who: 'Riya Reddy', text: 'Lead created', channel: 'Manual' }] });
    }, `Added lead ${lead.company}`);
    toast(`Lead added – ${lead.company}`);
    setAdd(false); setLead({ company: '', contact: '', value: '', need: '' });
  };
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Sales & CRM' }]} title="Sales & CRM" subtitle="Enquiries to orders: leads, quotations and follow-ups"
        actions={<Button variant="primary" icon={<Plus size={14} />} data-testid="add-lead" onClick={() => setAdd(true)}>Add lead</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Open pipeline" value={lakh(open.reduce((a, o) => a + o.value, 0))} sub={`${open.length} opportunities`} />
        <Kpi label="Weighted forecast" value={lakh(weighted)} sub="by stage probability" />
        <Kpi label="Won this month" value={lakh(s.opportunities.filter((o) => o.stage === 'Won').reduce((a, o) => a + o.value, 0))} sub="2 deals" tone="green" />
        <Kpi label="Follow-ups due today" value="3" sub="Sri Lakshmi · Aarav · UrbanNest" tone="amber" />
      </div>
      <Toolbar right={<Segmented value={view} onChange={setView} options={[{ value: 'board', label: <span className="flex items-center gap-1"><LayoutGrid size={13} /> Board</span> }, { value: 'table', label: <span className="flex items-center gap-1"><List size={13} /> Table</span> }]} />}>
        <SearchBox value={q} onChange={setQ} placeholder="Search opportunities or customers" />
        <Select value={owner} onChange={setOwner} options={owners} />
      </Toolbar>
      {view === 'board' ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
          {STAGES.map((st) => {
            const items = rows.filter((o) => o.stage === st);
            return (
              <div key={st} className="rounded-xl bg-slate-100/70 p-2">
                <div className="mb-2 flex items-center justify-between px-1 text-2xs font-semibold uppercase tracking-wide text-slate-500"><span>{st}</span><span>{items.length} · {lakh(items.reduce((a, o) => a + o.value, 0))}</span></div>
                <div className="space-y-2">
                  {items.map((o) => (
                    <button key={o.id} data-opp={o.id} onClick={() => nav(`/sales/opportunity/${o.id}`)} className="block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm hover:border-brand-300">
                      <div className="text-[12.5px] font-medium leading-snug text-slate-900">{customerById(s, o.customerId).name}</div>
                      <div className="mt-0.5 line-clamp-2 text-2xs text-slate-500">{o.title}</div>
                      <div className="mt-1.5 flex items-center justify-between text-2xs"><span className="font-semibold text-slate-700">{lakh(o.value)}</span><span className="text-slate-400">{o.owner.split(' ')[0]}</span></div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card pad={false}>
          <DataTable rowKey={(o: Opportunity) => o.id} rows={rows} onRowClick={(o) => nav(`/sales/opportunity/${o.id}`)} columns={[
            { key: 'id', header: 'ID', render: (o) => <span className="font-medium text-slate-900">{o.id}</span> },
            { key: 'c', header: 'Customer', render: (o) => customerById(s, o.customerId).name },
            { key: 't', header: 'Opportunity', render: (o) => o.title },
            { key: 'st', header: 'Stage', render: (o) => <Status>{o.stage}</Status> },
            { key: 'v', header: 'Value', align: 'right', render: (o) => inr(o.value) },
            { key: 'p', header: 'Prob.', align: 'right', render: (o) => `${o.probability}%` },
            { key: 'n', header: 'Next step', render: (o) => <span className="text-slate-500">{o.next}</span> },
            { key: 'o', header: 'Owner', render: (o) => o.owner },
          ]} />
        </Card>
      )}
      <Card pad={false} title="Customers" subtitle="Credit limits and terms are checked on every new order">
        <DataTable rowKey={(c) => c.id} rows={s.customers.filter((c) => c.creditLimit > 0)} onRowClick={(c) => nav(`/sales/customer/${c.id}`)} dense columns={[
          { key: 'n', header: 'Customer', render: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
          { key: 'ct', header: 'Contact', render: (c) => `${c.contact} · ${c.phone}` },
          { key: 'city', header: 'City', render: (c) => c.city },
          { key: 'g', header: 'GSTIN', render: (c) => <span className="tabular text-slate-500">{c.gstin}</span> },
          { key: 'lim', header: 'Credit limit', align: 'right', render: (c) => lakh(c.creditLimit) },
          { key: 'd', header: 'Terms', render: (c) => `${c.creditDays} days` },
          { key: 'o', header: 'Outstanding', align: 'right', render: (c) => { const v = s.invoices.filter((i) => i.customerId === c.id).reduce((a, i) => a + outstanding(i), 0); return v ? inr(v) : '—'; } },
        ]} />
      </Card>
      <Modal open={add} onClose={() => setAdd(false)} title="Add lead" subtitle="Just the basics. You can enrich it later." footer={<><Button onClick={() => setAdd(false)}>Cancel</Button><Button variant="primary" data-testid="save-lead" onClick={saveLead} disabled={!lead.company.trim()}>Save lead</Button></>}>
        <div className="space-y-3">
          {([['company', 'Company', 'e.g. Sai Krupa Developers'], ['contact', 'Contact person', 'Name and phone'], ['need', 'What they need', 'e.g. 40 MS enclosures'], ['value', 'Approx. value (₹ lakh)', 'e.g. 3.5']] as const).map(([k, l, p]) => (
            <label key={k} className="block"><span className="text-xs font-medium text-slate-600">{l}</span>
              <input value={lead[k]} onChange={(e) => setLead({ ...lead, [k]: e.target.value })} placeholder={p} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-brand-400" /></label>
          ))}
        </div>
      </Modal>
    </div>
  );
}

export function OpportunityDetail() {
  const { id } = useParams();
  const { s, update, toast, openDraft } = useStore();
  const o = s.opportunities.find((x) => x.id === id);
  const [stageOpen, setStageOpen] = useState(false);
  const [fu, setFu] = useState(false);
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState('Call');
  if (!o) return <div className="p-8 text-slate-500">Opportunity not found. <Link to="/sales" className="text-brand-700">Back to Sales</Link></div>;
  const c = customerById(s, o.customerId);
  const setStage = (st: Stage) => {
    update((d) => { const x = d.opportunities.find((y) => y.id === o.id)!; x.stage = st; x.probability = { 'New Lead': 10, Qualified: 30, Proposal: 50, Negotiation: 70, Won: 100, Lost: 0 }[st]; x.activity.unshift({ date: '2026-10-28', who: 'Riya Reddy', text: `Stage changed to ${st}`, channel: 'Update' }); }, `${o.id} moved to ${st}`);
    toast(`${o.id} moved to ${st}`); setStageOpen(false);
  };
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Sales & CRM', to: '/sales' }, { label: o.id }]} title={o.title} subtitle={<><Link to={`/sales/customer/${c.id}`} className="text-brand-700 hover:underline">{c.name}</Link> · {c.contact} · owner {o.owner}</>} badge={<Status>{o.stage}</Status>}
        actions={<>
          <Button icon={<CalendarClock size={14} />} data-testid="record-followup" onClick={() => setFu(true)}>Record follow-up</Button>
          <Button icon={<MessageCircle size={14} />} onClick={() => openDraft({ title: `WhatsApp to ${c.contact}`, channel: 'WhatsApp', to: `${c.contact} · ${c.name}`, toDetail: c.phone, body: `Namaste ${c.contact.split(' ')[0]} garu,\n\nFollowing up on our proposal for ${o.title.toLowerCase()} (${lakh(o.value)}). Happy to walk you through the drawings and delivery schedule this week. Would Thursday 11 am work?\n\nRegards,\n${o.owner}\nAarohan Industries`, approveLabel: 'Approve & send', onApprove: () => { update((d) => { d.opportunities.find((y) => y.id === o.id)!.activity.unshift({ date: '2026-10-28', who: 'Riya Reddy', text: 'WhatsApp follow-up sent (simulated)', channel: 'WhatsApp' }); }); toast('Follow-up marked as sent (simulated)'); } })}>WhatsApp draft</Button>
          <Button variant="primary" data-testid="update-stage" onClick={() => setStageOpen(true)}>Update stage</Button>
        </>} />
      <div className="flex gap-1">
        {STAGES.filter((x) => x !== 'Lost').map((st, i) => {
          const idx = STAGES.indexOf(o.stage);
          return <div key={st} className={cx('flex-1 rounded-md py-1.5 text-center text-2xs font-semibold', o.stage === 'Lost' ? 'bg-slate-100 text-slate-400' : i < idx ? 'bg-brand-100 text-brand-700' : i === idx ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400')}>{st}</div>;
        })}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card title="Details" className="col-span-2">
          <Fields cols={3}>
            <Field label="Value">{inr(o.value)}</Field><Field label="Probability">{o.probability}%</Field><Field label="Expected close">{fmtDate(o.close)}</Field>
            <Field label="Products">{o.products}</Field><Field label="Source">{o.source}</Field><Field label="Next step">{o.next}</Field>
          </Fields>
          {o.id === 'OP-302' && <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Sneha requested a 3% discount (₹16,200). It is waiting in <Link to="/approvals" className="font-medium underline">Approvals</Link>.</div>}
        </Card>
        <Card title="Customer">
          <div className="space-y-1 text-[13px]"><div className="font-medium text-slate-900">{c.name}</div><div className="text-slate-500">{c.contact}, {c.designation}</div><div className="text-slate-500">{c.phone}{c.whatsapp && ' · WhatsApp'}</div><div className="text-slate-500">{c.area}, {c.city}</div>
            <div className="pt-1 text-2xs text-slate-400">Credit limit {c.creditLimit ? lakh(c.creditLimit) : 'not set (prospect)'} · {c.creditDays} days</div></div>
        </Card>
      </div>
      <Card title="Activity"><Timeline items={o.activity.map((a) => ({ date: fmtDate(a.date), title: a.text, text: a.who, tag: a.channel }))} /></Card>
      <Modal open={stageOpen} onClose={() => setStageOpen(false)} title="Update stage">
        <div className="grid grid-cols-3 gap-2">{STAGES.map((st) => <Button key={st} data-stage={st} variant={st === o.stage ? 'primary' : 'secondary'} onClick={() => setStage(st)}>{st}</Button>)}</div>
      </Modal>
      <Modal open={fu} onClose={() => setFu(false)} title="Record follow-up" footer={<><Button onClick={() => setFu(false)}>Cancel</Button><Button variant="primary" data-testid="save-followup" disabled={!note.trim()} onClick={() => { update((d) => { d.opportunities.find((y) => y.id === o.id)!.activity.unshift({ date: '2026-10-28', who: 'Riya Reddy', text: note, channel }); }, `Follow-up logged on ${o.id}`); toast('Follow-up recorded'); setFu(false); setNote(''); }}>Save</Button></>}>
        <div className="space-y-3">
          <Segmented value={channel} onChange={setChannel} options={['Call', 'WhatsApp', 'Visit', 'Email'].map((x) => ({ value: x, label: x }))} />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="What was discussed? What's next?" className="w-full rounded-md border border-slate-200 p-3 text-[13px] outline-none focus:border-brand-400" />
        </div>
      </Modal>
    </div>
  );
}

export function CustomerDetail() {
  const { id } = useParams();
  const { s } = useStore();
  const nav = useNavigate();
  const c = s.customers.find((x) => x.id === id);
  const [tab, setTab] = useTab('Orders');
  const inv = useMemo(() => s.invoices.filter((i) => i.customerId === id), [s.invoices, id]);
  if (!c) return <div className="p-8 text-slate-500">Customer not found.</div>;
  const owed = inv.reduce((a, i) => a + outstanding(i), 0);
  const ords = s.orders.filter((o) => o.customerId === c.id);
  const opps = s.opportunities.filter((o) => o.customerId === c.id);
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Sales & CRM', to: '/sales' }, { label: c.name }]} title={c.name} subtitle={`${c.segment} · ${c.area}, ${c.city} · customer since ${c.since}`}
        actions={<Button icon={<Phone size={14} />} onClick={() => nav(`/sales/opportunity/${opps[0]?.id ?? ''}`)} disabled={!opps.length}>Open latest opportunity</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Outstanding" value={inr(owed)} sub={inv.some((i) => overdueDays(i) > 0 && outstanding(i) > 0) ? <span className="text-rose-600">Has overdue invoices</span> : 'Nothing overdue'} />
        <Kpi label="Credit limit" value={c.creditLimit ? lakh(c.creditLimit) : '—'} sub={`${c.creditDays} days credit`} />
        <Kpi label="Open orders" value={String(ords.filter((o) => o.open).length)} sub={lakh(ords.filter((o) => o.open).reduce((a, o) => a + orderValue(o), 0)) + ' + GST'} />
        <Kpi label="GSTIN" value={<span className="text-[15px]">{c.gstin}</span>} sub={c.stateCode === '36' ? 'Telangana · CGST + SGST' : 'Other state · IGST'} />
      </div>
      <Tabs tabs={['Orders', 'Invoices', 'Opportunities', 'Contact']} value={tab} onChange={setTab} />
      <Card pad={false}>
        {tab === 'Orders' && <DataTable rowKey={(o) => o.id} rows={ords} onRowClick={(o) => nav(`/orders/${o.id}`)} columns={[{ key: 'i', header: 'Order', render: (o) => <span className="font-medium">{o.id}</span> }, { key: 'p', header: 'Project', render: (o) => o.project }, { key: 'd', header: 'Promised', render: (o) => fmtDate(o.promised) }, { key: 'v', header: 'Value', align: 'right', render: (o) => inr(orderValue(o)) }, { key: 's', header: 'Status', render: (o) => <Status>{o.status}</Status> }]} />}
        {tab === 'Invoices' && <DataTable rowKey={(i) => i.id} rows={inv} onRowClick={(i) => nav(`/finance/${i.id}`)} columns={[{ key: 'i', header: 'Invoice', render: (i) => <span className="font-medium">{i.id}</span> }, { key: 'd', header: 'Due', render: (i) => fmtDate(i.due) }, { key: 't', header: 'Amount', align: 'right', render: (i) => inr(i.total) }, { key: 'o', header: 'Outstanding', align: 'right', render: (i) => inr(outstanding(i)) }, { key: 's', header: 'Status', render: (i) => <Status>{i.status}</Status> }]} />}
        {tab === 'Opportunities' && <DataTable rowKey={(o) => o.id} rows={opps} onRowClick={(o) => nav(`/sales/opportunity/${o.id}`)} columns={[{ key: 'i', header: 'ID', render: (o) => o.id }, { key: 't', header: 'Title', render: (o) => o.title }, { key: 's', header: 'Stage', render: (o) => <Status>{o.stage}</Status> }, { key: 'v', header: 'Value', align: 'right', render: (o) => inr(o.value) }]} />}
        {tab === 'Contact' && <div className="p-4"><Fields cols={3}><Field label="Contact">{c.contact}</Field><Field label="Designation">{c.designation}</Field><Field label="Phone">{c.phone}</Field><Field label="WhatsApp">{c.whatsapp ? 'Yes' : 'No'}</Field><Field label="Account owner">{c.owner}</Field><Field label="State code">{c.stateCode}</Field></Fields></div>}
      </Card>
      <div className="hidden"><Badge>{''}</Badge></div>
    </div>
  );
}
