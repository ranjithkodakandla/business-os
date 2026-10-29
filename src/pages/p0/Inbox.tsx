import { useState } from 'react';
import { MessageCircle, Mail, Users, Phone, Clock, Sparkles, Link2, Star, AlertTriangle } from 'lucide-react';
import { Card, Kpi, Badge, Button, Select, SearchBox, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { P0A, draftReply } from '../../lib/p0actions';
import { t } from '../../lib/i18n';
import { ModHead, Grid, useLang, useCan } from './kit';
import type { Ticket } from '../../lib/p0data';

const CH = { WhatsApp: MessageCircle, Email: Mail, Group: Users, Call: Phone };
export const slaLeft = (k: Ticket) => k.slaHrs - k.ageHrs;
export default function Inbox() {
  const { s, update, openDraft, toast } = useStore();
  const lang = useLang(); const may = useCan('inbox');
  const [sel, setSel] = useState(s.p0.tickets[0]?.id); const [q, setQ] = useState(''); const [f, setF] = useState('All open');
  const rows = s.p0.tickets.filter((k) => (f === 'All' || (f === 'All open' ? k.status !== 'Resolved' : k.kind === f)) && (k.customer + k.subject + k.id).toLowerCase().includes(q.toLowerCase()));
  const k = s.p0.tickets.find((x) => x.id === sel) || rows[0];
  const open = s.p0.tickets.filter((x) => x.status !== 'Resolved');
  const set = (patch: Partial<Ticket>, log: string, note?: string) => update((d) => P0A.ticket(d, k.id, patch, note), log, { module: 'inbox', record: k.id, before: k.status, after: patch.status || JSON.stringify(patch) });
  return (
    <div data-testid="page-inbox">
      <ModHead k="inbox" subtitle="WhatsApp, email, groups and calls land here as tickets – demo inbound only, nothing is sent" />
      <Grid>
        <Kpi label={t(lang, 'open') + ' ' + t(lang, 'tickets')} value={open.length} icon={<MessageCircle size={15} />} />
        <Kpi label="Complaints" value={open.filter((x) => x.kind === 'Complaint').length} tone="red" sub="need CAPA" icon={<AlertTriangle size={15} />} />
        <Kpi label="SLA breached" value={open.filter((x) => slaLeft(x) < 0).length} tone="amber" icon={<Clock size={15} />} />
        <Kpi label="CSAT (30 days)" value="4.6 / 5" tone="green" icon={<Star size={15} />} />
      </Grid>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card pad={false} title="Tickets" actions={<Select value={f} onChange={setF} options={['All open', 'All', 'Complaint', 'Query', 'Order', 'Payment']} />}>
          <div className="p-3"><SearchBox value={q} onChange={setQ} width="w-full" placeholder="Customer, subject, ID…" /></div>
          {rows.map((x) => { const I = CH[x.channel]; const left = slaLeft(x); return (
            <button key={x.id} data-ticket={x.id} onClick={() => setSel(x.id)} className={cx('block w-full border-t border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50', k?.id === x.id && 'bg-brand-50/60')}>
              <div className="flex items-center gap-2 text-2xs text-slate-500"><I size={13} className="text-brand-600" />{x.id} · {x.customer}<span className="ml-auto">{x.status === 'Resolved' ? <Badge tone="green">Resolved</Badge> : <Badge tone={left < 0 ? 'red' : left < 3 ? 'amber' : 'gray'}>{left < 0 ? `SLA −${Math.abs(left).toFixed(0)}h` : `${left.toFixed(1)}h left`}</Badge>}</span></div>
              <div className="mt-0.5 truncate text-[13px] font-medium text-slate-800">{x.subject}</div>
              <div className="mt-1 flex gap-1"><Badge tone={x.kind === 'Complaint' ? 'red' : 'blue'}>{x.kind}</Badge><Badge tone={x.priority === 'High' ? 'red' : 'gray'}>{x.priority}</Badge></div>
            </button>); })}
        </Card>
        {k && <Card title={<span data-testid="ticket-title">{k.id} · {k.subject}</span>} subtitle={`${k.customer} · via ${k.channel} · opened ${k.opened}`}
          actions={<>{may('edit') && <Select value={k.owner} onChange={(v) => set({ owner: v }, `${k.id} assigned to ${v}`)} options={['Karthik Varma', 'Padma Priya', 'Anjali Devi', 'Harish Chandra', 'Riya Reddy']} />}
            {may('edit') && k.status !== 'Resolved' && <Button size="sm" variant="success" onClick={() => set({ status: 'Resolved', csat: 5 }, `${k.id} resolved`, 'Marked resolved')}>Resolve</Button>}</>}>
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            {[['Status', k.status], ['Owner', k.owner], ['Order', k.order || '—'], ['Invoice', k.invoice || '—']].map(([a, b]) => <div key={a} className="rounded-xl bg-slate-50 px-3 py-2"><div className="text-2xs text-slate-500">{a}</div><div className="text-[13px] font-medium text-slate-800">{b}</div></div>)}
          </div>
          <div className="mb-4"><div className="mb-1 flex justify-between text-2xs text-slate-500"><span>SLA {k.slaHrs}h</span><span>{k.ageHrs}h elapsed</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cx('h-full rounded-full', slaLeft(k) < 0 ? 'bg-rose-500' : 'bg-grad')} style={{ width: `${Math.min(100, k.ageHrs / k.slaHrs * 100)}%` }} /></div></div>
          <ol className="relative mb-4 space-y-3 border-l border-slate-200 pl-4">
            {k.thread.map((m, i) => <li key={i} className="text-[13px]"><span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-brand-400 ring-4 ring-white" /><div className="text-2xs text-slate-400">{m.at} · {m.from}{m.ch ? ` · ${m.ch}` : ''}</div><div className="text-slate-700">{m.text}</div></li>)}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={<Sparkles size={14} />} data-testid="ai-draft" onClick={() => openDraft({ title: `Reply to ${k.customer}`, channel: k.channel === 'Email' ? 'Email' : 'WhatsApp', to: k.customer, body: draftReply(k), approveLabel: 'Record as sent (demo)', note: 'Drafted by Business OS agent from ticket context.', onApprove: (b) => { update((d) => P0A.ticket(d, k.id, { status: 'In progress' }, 'Reply recorded (demo – not sent): ' + b.slice(0, 80) + '…', 'Business OS agent'), `Reply drafted for ${k.id}`, { module: 'inbox', record: k.id, agent: true, after: 'Reply recorded (not sent)' }); toast('Recorded in ticket – no real message sent', 'blue'); } })}>AI draft reply</Button>
            {k.kind === 'Complaint' && !k.capa && may('edit') && <Button icon={<Link2 size={14} />} onClick={() => set({ capa: 'CAPA-0' + (10 + s.p0.tickets.indexOf(k)) }, `CAPA raised for ${k.id}`, 'CAPA raised with QC')}>Raise CAPA (QC)</Button>}
            {k.capa && <Badge tone="violet">Linked {k.capa}</Badge>}
            {k.csat && <Badge tone="green">CSAT {k.csat}/5</Badge>}
          </div>
        </Card>}
      </div>
    </div>
  );
}
