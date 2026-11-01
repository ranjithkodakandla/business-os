/** v4 chat/page cards: contact table with simulated call/WhatsApp/email, email thread digest, team availability with one-tap reassign. */
import React from 'react';
import { Phone, Mail, MessageCircle, Clock, UserCheck, ArrowRight } from 'lucide-react';
import { useStore } from '../lib/store';
import { Badge, Button, cx } from '../components/ui';
import { useFx } from './data';
import { THREADS, TEAM, person, away, type Contact, type Person, type Thread } from './more';
import { reassign } from './actions';
import type { FxC } from './brain';

const box = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
const TONE: Record<string, 'green' | 'blue' | 'amber' | 'red'> = { Available: 'green', 'On site': 'blue', Travelling: 'amber', 'On leave': 'red' };
const first = (n: string) => n.split(' ')[0];
const co = (c: string) => c.replace(/ \((demo|fictional|internal)\)/, '');
export const Chip = ({ p }: { p: Person }) => <Badge tone={TONE[p.status]} dot>{p.status}{p.until ? ` till ${p.until}` : ''}</Badge>;
const useOwner = () => { const s = useFx(); return (t: Thread) => person(s.reassign?.[t.id] || t.owner); };

export function Contacts({ c }: { c: Extract<FxC, { k: 'contacts' }> }) {
  const ctx = useStore();
  const call = (r: Contact) => { ctx.toast(`Calling ${r.name} at ${r.phone} (simulated – no call placed)`, 'green'); ctx.update(() => {}, `Call to ${r.name}, ${co(r.company)} (simulated)`, { module: 'inbox' }); };
  const msg = (r: Contact, ch: 'WhatsApp' | 'Email', rfq = false) => ctx.openDraft({ title: rfq ? `RFQ – ${co(r.company)}` : `${ch} to ${r.name}`, channel: ch, to: `${r.name} · ${ch === 'Email' ? r.email : r.phone}`, toDetail: 'Simulated – nothing leaves this demo', approveLabel: 'Approve & send',
    body: rfq ? `Dear ${first(r.name)},\n\nPlease quote your best price, MOQ and lead time for ${r.about.split(' – ')[0].toLowerCase()} for delivery to Site 1 Cherlapally.\n\nRegards,\nSunil Reddy\nShakti Electro-Pack` : `Hi ${first(r.name)},\n\n`,
    onApprove: () => { ctx.toast(`${rfq ? 'RFQ' : ch} sent to ${r.name} (simulated)`, 'green'); ctx.update(() => {}, `${rfq ? 'RFQ' : ch} sent to ${r.name} (simulated)`, { module: 'inbox' }); } });
  return <div className={box} data-fx="contacts"><div className="mb-2 text-[13px] font-semibold text-slate-700">{c.title}</div>
    <div className="overflow-x-auto"><table className="w-full text-[12.5px]"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="py-1.5 pr-3">Company</th><th className="pr-3">Person</th><th className="pr-3">Phone / email</th><th className="pr-3">About</th><th /></tr></thead>
      <tbody>{c.rows.map((r) => <tr key={r.company + r.name} data-contact={r.name} className="border-t border-slate-100 align-top">
        <td className="py-2 pr-3"><div className="font-medium text-slate-900">{co(r.company)}</div><div className="text-slate-500">{r.kind} · {r.city}</div></td>
        <td className="py-2 pr-3"><div className="text-slate-900">{r.name}</div><div className="text-slate-500">{r.role}</div></td>
        <td className="py-2 pr-3 tabular-nums"><div>{r.phone}</div><div className="text-slate-500">{r.email}</div></td>
        <td className="py-2 pr-3 text-slate-600">{r.about}</td>
        <td className="py-2"><div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="ghost" data-act="call" onClick={() => call(r)}><Phone size={13} />Call</Button>
          <Button size="sm" variant="ghost" data-act="whatsapp" onClick={() => msg(r, 'WhatsApp')}><MessageCircle size={13} />WhatsApp</Button>
          <Button size="sm" variant="ghost" data-act="email" onClick={() => msg(r, 'Email')}><Mail size={13} />Email</Button>
          {r.kind === 'Supplier' && <Button size="sm" variant="secondary" data-act="rfq" onClick={() => msg(r, 'Email', true)}>RFQ</Button>}
        </div></td></tr>)}</tbody></table></div>
    <div className="mt-2 text-[11.5px] text-slate-400">Fictional demo contacts · numbers masked · calls and messages are simulated</div></div>;
}

export function Threads({ ids, onAsk, onOpen }: { ids: string[]; onAsk?: (q: string) => void; onOpen?: (id: string) => void }) {
  const ctx = useStore(); const ownerOf = useOwner();
  const ts = THREADS.filter((t) => ids.includes(t.id)).sort((a, b) => (a.waitingOn === b.waitingOn ? b.days - a.days : a.waitingOn === 'us' ? -1 : 1));
  return <div className={box} data-fx="threads"><div className="mb-2 text-[13px] font-semibold text-slate-700">Email threads – who is waiting on whom</div>
    <div className="divide-y divide-slate-100">{ts.map((t) => { const o = ownerOf(t); const bk = o.backup ? person(o.backup) : null; return <div key={t.id} data-thread={t.id} className="flex flex-wrap items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-[13px]"><b className="text-slate-900">{co(t.company)}</b><span className="text-slate-500">{t.subject}</span></div>
        <div className="mt-0.5 text-[12.5px] text-slate-700">{t.summary}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
          <Badge tone={t.waitingOn === 'us' ? (t.days >= 4 ? 'red' : 'amber') : 'blue'}>{t.waitingOn === 'us' ? `Waiting on us · ${t.days} d` : `Waiting on them · ${t.days} d`}</Badge>
          <span>Owner {o.name}</span><Chip p={o} /><span className="flex items-center gap-1"><ArrowRight size={12} />{t.next}</span></div></div>
      <div className="flex gap-1.5">{t.waitingOn === 'us' && away(o) && bk && <Button size="sm" variant="primary" data-act="reassign" onClick={() => reassign(ctx, t.id, bk.id)}>Reassign to {first(bk.name)}</Button>}
        {(onAsk || onOpen) && <Button size="sm" variant="ghost" data-act="open-thread" onClick={() => onOpen ? onOpen(t.id) : onAsk!(`summarise the ${co(t.company).split(' ')[0]} ${co(t.company).split(' ')[1] || ''} thread`.replace(/\s+/g, ' '))}>Summary & reply</Button>}</div>
    </div>; })}</div></div>;
}

export function ThreadCard({ c, onChange }: { c: Extract<FxC, { k: 'thread' }>; onChange: (c: FxC) => void }) {
  const ctx = useStore(); const ownerOf = useOwner(); const t = THREADS.find((x) => x.id === c.id)!; const o = ownerOf(t); const bk = o.backup ? person(o.backup) : null;
  const reply = () => ctx.openDraft({ title: `Re: ${t.subject}`, channel: 'Email', to: co(t.company), toDetail: 'Simulated – nothing leaves this demo', approveLabel: 'Approve & send reply', body: t.draft,
    onApprove: () => { onChange({ ...c, status: 'sent' }); ctx.update(() => {}, `Reply sent on "${t.subject}" (simulated)`, { module: 'inbox', record: t.id }); ctx.toast(`Reply sent to ${co(t.company)} (simulated)`, 'green'); } });
  return <div className={box} data-fx="thread" data-status={c.status}>
    <div className="text-[12px] text-slate-500">{co(t.company)} · {t.subject}</div>
    <div className="mt-1 text-[14px] font-semibold text-slate-900" data-summary>{t.summary}</div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px] md:grid-cols-4">
      <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">Waiting on</div><b>{t.waitingOn === 'us' ? `Us (${first(o.name)})` : co(t.company)}</b></div>
      <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">Stalled</div><b className={t.days >= 4 ? 'text-rose-600' : ''}><Clock size={12} className="mr-1 inline" />{t.days} days</b></div>
      <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">Owner</div><b>{o.name}</b><div className="mt-0.5"><Chip p={o} /></div></div>
      <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">Next action</div><b>{t.next}</b></div></div>
    <div className="mt-3 space-y-1 border-l-2 border-slate-200 pl-3 text-[12.5px]">{t.msgs.map((m, i) => <div key={i}><b className="text-slate-700">{m.from}</b> <span className="text-slate-400">· {m.ago}</span><div className="text-slate-600">{m.text}</div></div>)}</div>
    <div className="mt-3 rounded-xl bg-brand-50/60 p-3"><div className="mb-1 text-[12px] font-semibold text-brand-800">Draft reply (needs your OK)</div><pre className="whitespace-pre-wrap font-sans text-[12.5px] text-slate-700">{t.draft}</pre></div>
    <div className="mt-3 flex flex-wrap gap-2">{c.status === 'sent' ? <Badge tone="green" dot>Reply sent (simulated)</Badge> : <Button size="sm" variant="primary" data-act="reply" onClick={reply}>Review & send reply</Button>}
      {t.waitingOn === 'us' && away(o) && bk && <Button size="sm" variant="secondary" data-act="reassign" onClick={() => reassign(ctx, t.id, bk.id)}><UserCheck size={13} />Reassign to {first(bk.name)} ({bk.status.toLowerCase()})</Button>}</div></div>;
}

export function Team({ ids, focus }: { ids: string[]; focus?: string }) {
  const ctx = useStore(); const ownerOf = useOwner(); const s = useFx();
  return <div className={box} data-fx="team"><div className="mb-2 text-[13px] font-semibold text-slate-700">Team availability today</div>
    <div className="grid gap-2 md:grid-cols-2">{TEAM.filter((p) => ids.includes(p.id)).map((p) => { const mine = THREADS.filter((t) => ownerOf(t).id === p.id && t.waitingOn === 'us' && (!focus || t.id === focus)); const bk = p.backup ? person(p.backup) : null;
      return <div key={p.id} data-person={p.id} data-status={p.status} className={cx('rounded-xl border p-3', away(p) ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200')}>
        <div className="flex items-center justify-between gap-2"><div><div className="text-[13.5px] font-semibold text-slate-900">{p.name}</div><div className="text-[12px] text-slate-500">{p.role} · {p.site}</div></div><Chip p={p} /></div>
        {p.note && <div className="mt-1 text-[12px] text-slate-500">{p.note}</div>}
        {bk && away(p) && <div className="mt-1 text-[12px] text-slate-600">Backup: <b>{bk.name}</b> ({bk.status.toLowerCase()})</div>}
        {mine.length > 0 && <div className="mt-2 space-y-1.5">{mine.map((t) => <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-[12px] ring-1 ring-slate-200"><span>{co(t.company)} · {t.ref || t.subject} · {t.days} d</span>
          {away(p) && bk && <Button size="sm" variant="primary" data-act="reassign" onClick={() => reassign(ctx, t.id, bk.id)}>Reassign to {first(bk.name)}</Button>}</div>)}</div>}
        {Object.entries(s.reassign || {}).filter(([id, to]) => to === p.id && (!focus || id === focus)).map(([id]) => <div key={id} className="mt-1 text-[12px] text-emerald-700" data-reassigned={id}>✓ Now handling {co(THREADS.find((t) => t.id === id)!.company)}</div>)}
      </div>; })}</div>
    <div className="mt-2 text-[11.5px] text-slate-400">From attendance and leave records (demo)</div></div>;
}
