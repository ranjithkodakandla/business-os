import { useState } from 'react';
import { maskPhone } from '../lib/dataAgent';
import { Plus, Pencil, Star, PackageSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { SupplierContact, Channel, CHANNELS, channelLabel } from '../lib/sourcing';
import { PageHeader, Card, Button, DataTable, SearchBox, Toolbar, Modal, Segmented, Kpi, Badge, Callout } from '../components/ui';
import { ChannelBadge, ChannelIcon } from '../components/Outreach';

const blank = (n: number): SupplierContact => ({ id: `CT-${String(n).padStart(2, '0')}`, supplierId: '', supplier: '', person: '', role: '', city: 'Hyderabad', supplies: '', skus: [], channel: 'WhatsApp', language: 'Telugu', phone: '', email: '', leadDays: 3, onTime: 0, rejection: 0, lastPrice: 0, lastPriceNote: 'no POs yet', terms: 'Net 30', rating: 0 });
const Input = ({ label, value, onChange, w }: { label: string; value: string; onChange: (v: string) => void; w?: string }) => (
  <label className={w || 'block'}><span className="text-2xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
    <input data-field={label} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-brand-400" /></label>
);

export default function Suppliers() {
  const { s, update, toast } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [ch, setCh] = useState('All');
  const [edit, setEdit] = useState<SupplierContact | null>(null);
  const isNew = edit && !s.contacts.find((c) => c.id === edit.id);
  const rows = s.contacts.filter((c) => (ch === 'All' || c.channel === ch) && (c.supplier + c.person + c.supplies).toLowerCase().includes(q.toLowerCase()));
  const setChannel = (id: string, v: Channel) => update((d) => { d.contacts.find((c) => c.id === id)!.channel = v; }, `Preferred channel for ${s.contacts.find((c) => c.id === id)!.person} set to ${channelLabel(v)}`);
  const save = () => {
    if (!edit) return;
    if (!edit.supplier.trim() || !edit.person.trim()) { toast('Add a supplier and contact name', 'amber'); return; }
    update((d) => { const i = d.contacts.findIndex((c) => c.id === edit.id); if (i >= 0) d.contacts[i] = edit; else d.contacts.push(edit); }, `${isNew ? 'Added' : 'Updated'} supplier contact ${edit.person} (${edit.supplier})`);
    toast(isNew ? 'Contact added – the Sourcing agent will use it for matching items' : 'Contact updated');
    setEdit(null);
  };
  const count = (c: Channel) => s.contacts.filter((x) => x.channel === c).length;
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Procurement', to: '/procurement' }, { label: 'Supplier contacts' }]} title="Supplier contacts"
        subtitle="Who to ask, on which channel and in which language. The Sourcing agent contacts suppliers the way they prefer."
        actions={<><Button icon={<PackageSearch size={14} />} onClick={() => nav('/sourcing')}>Sourcing results</Button><Button variant="primary" data-testid="add-contact" icon={<Plus size={14} />} onClick={() => setEdit(blank(s.contacts.length + 1))}>Add contact</Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Contacts" value={String(s.contacts.length)} sub={`${new Set(s.contacts.map((c) => c.supplier)).size} suppliers`} />
        {CHANNELS.map((c) => <Kpi key={c} label={`Prefer ${channelLabel(c)}`} value={String(count(c))} sub={c === 'Call' ? 'automated call, announced as such' : c === 'WhatsApp' ? 'WhatsApp Business (simulated)' : 'from purchase@aarohan (simulated)'} icon={<ChannelIcon c={c} size={15} />} />)}
      </div>
      <Toolbar right={<Segmented value={ch} onChange={setCh} options={['All', ...CHANNELS].map((x) => ({ value: x, label: x === 'Call' ? 'AI call' : x }))} />}><SearchBox value={q} onChange={setQ} placeholder="Search supplier, person or item" /></Toolbar>
      <Card pad={false}>
        <DataTable rowKey={(c: SupplierContact) => c.id} rows={rows} onRowClick={(c) => setEdit({ ...c })} columns={[
          { key: 's', header: 'Supplier', render: (c) => <div><div className="font-medium text-slate-900">{c.supplier}</div><div className="text-2xs text-slate-400">{c.supplies} · {c.city}</div></div> },
          { key: 'p', header: 'Contact', render: (c) => <div><div className="text-slate-800">{c.person} <span className="text-2xs text-slate-400">· {c.role}</span></div><div className="text-2xs text-slate-400">{c.phone ? maskPhone(c.phone) : '—'} · {c.email || '—'}</div><div className="mt-0.5">{c.gstin ? <span className="text-2xs text-slate-400">GSTIN {c.gstin}</span> : !c.supplierId ? <span data-testid="gstin-missing" className="rounded-full bg-amber-50 px-1.5 py-0.5 text-2xs font-medium text-amber-700">GSTIN missing</span> : null}</div></div> },
          { key: 'c', header: 'Preferred channel', render: (c) => (
            <select data-channel={c.id} value={c.channel} onClick={(e) => e.stopPropagation()} onChange={(e) => setChannel(c.id, e.target.value as Channel)} className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[12.5px]">
              {CHANNELS.map((x) => <option key={x} value={x}>{channelLabel(x)}</option>)}
            </select>) },
          { key: 'l', header: 'Language', render: (c) => <span className="text-slate-600">{c.language}</span> },
          { key: 'lt', header: 'Lead time', align: 'right', render: (c) => `${c.leadDays} days` },
          { key: 'o', header: 'On-time', align: 'right', render: (c) => c.onTime ? <span className={c.onTime < 85 ? 'text-rose-600' : 'text-slate-700'}>{c.onTime}%</span> : '—' },
          { key: 'lp', header: 'Last price', align: 'right', render: (c) => c.lastPrice ? <div><div>₹{c.lastPrice.toLocaleString('en-IN')}</div><div className="text-2xs text-slate-400">{c.lastPriceNote}</div></div> : '—' },
          { key: 't', header: 'Terms', render: (c) => <Badge tone={/advance/.test(c.terms) ? 'red' : /Cash/.test(c.terms) ? 'amber' : 'gray'}>{c.terms}</Badge> },
          { key: 'r', header: 'Rating', align: 'right', render: (c) => c.rating ? <span className="inline-flex items-center gap-0.5"><Star size={12} className="fill-amber-400 text-amber-400" />{c.rating.toFixed(1)}</span> : 'New' },
          { key: 'e', header: '', render: (c) => <button data-edit={c.id} onClick={(e) => { e.stopPropagation(); setEdit({ ...c }); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil size={14} /></button> },
        ]} />
      </Card>
      <Callout tone="gray" title="Where these numbers come from">Lead time, on-time % and rejection come from your goods receipts (GRNs) and debit notes; last price from past POs. Demo data – no supplier is contacted from this screen.</Callout>
      <Modal open={!!edit} onClose={() => setEdit(null)} width="max-w-xl" title={isNew ? 'Add supplier contact' : `Edit contact · ${edit?.person}`} subtitle={isNew ? 'New contacts are used for matching items on the next enquiry' : edit?.supplier}
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" data-testid="save-contact" onClick={save}>Save contact</Button></>}>
        {edit && (
          <div className="space-y-3" data-testid="contact-form">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Supplier" value={edit.supplier} onChange={(v) => setEdit({ ...edit, supplier: v })} />
              <Input label="Contact person" value={edit.person} onChange={(v) => setEdit({ ...edit, person: v })} />
              <Input label="Role" value={edit.role} onChange={(v) => setEdit({ ...edit, role: v })} />
              <Input label="City" value={edit.city} onChange={(v) => setEdit({ ...edit, city: v })} />
              <Input label="Phone" value={edit.phone} onChange={(v) => setEdit({ ...edit, phone: v })} />
              <Input label="Email" value={edit.email} onChange={(v) => setEdit({ ...edit, email: v })} />
              <Input label="Items / categories" value={edit.supplies} onChange={(v) => setEdit({ ...edit, supplies: v })} />
              <Input label="Language" value={edit.language} onChange={(v) => setEdit({ ...edit, language: v })} />
              <Input label="Payment terms" value={edit.terms} onChange={(v) => setEdit({ ...edit, terms: v })} />
              <Input label="Lead time (days)" value={String(edit.leadDays)} onChange={(v) => setEdit({ ...edit, leadDays: Number(v.replace(/\D/g, '')) || 0 })} />
            </div>
            <div><div className="mb-1 text-2xs font-medium uppercase tracking-wide text-slate-400">Preferred channel</div>
              <Segmented value={edit.channel} onChange={(v) => setEdit({ ...edit, channel: v as Channel })} options={CHANNELS.map((x) => ({ value: x, label: <span className="inline-flex items-center gap-1"><ChannelIcon c={x} size={12} />{channelLabel(x)}</span> }))} />
            </div>
            {!isNew && <div className="flex flex-wrap items-center gap-2 text-2xs text-slate-500">From records: <Badge>{edit.onTime}% on-time</Badge><Badge>{edit.rejection}% rejection</Badge><Badge>last ₹{edit.lastPrice.toLocaleString('en-IN')} ({edit.lastPriceNote})</Badge><ChannelBadge c={edit.channel} /></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
