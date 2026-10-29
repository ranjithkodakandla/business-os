import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MessageCircle, PhoneCall, Check, CheckCheck, Loader2, PackageSearch, Wallet, ArrowRight, FlaskConical } from 'lucide-react';
import { useStore } from '../lib/store';
import { OPTIONS, OUTREACH_MS, Channel, channelLabel, channelFor, contactOf } from '../lib/sourcing';
import { SPRINT, SPRINT_MS, sprintTotals } from '../lib/sprint';
import { fmtShort, inr, lakh } from '../lib/format';
import { Button, Badge, cx } from './ui';

export function ChannelIcon({ c, size = 13 }: { c: Channel; size?: number }) {
  if (c === 'WhatsApp') return <MessageCircle size={size} className="text-emerald-600" />;
  if (c === 'Email') return <Mail size={size} className="text-sky-600" />;
  return <PhoneCall size={size} className="text-violet-600" />;
}
export function ChannelBadge({ c }: { c: Channel }) {
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-700"><ChannelIcon c={c} size={11} />{channelLabel(c)}</span>;
}
export const SimNote = ({ children }: { children?: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200"><FlaskConical size={11} />{children || 'Simulated'}</span>
);

type Row = { id: string; who: string; sub: string; ch: Channel; sentAt: number; delAt: number; repAt: number; teaser: string };
const stageLabels = (c: Channel) => (c === 'Call' ? ['Dialling', 'Connected', 'Summary ready'] : c === 'WhatsApp' ? ['Sent', 'Delivered', 'Replied'] : ['Sent', 'Delivered', 'Replied']);

export function useElapsed(startedAt: number | undefined, running: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [running]);
  return running && startedAt ? now - startedAt : Infinity;
}

export default function OutreachLive({ flow }: { flow: 'sourcing' | 'sprint' }) {
  const { s } = useStore();
  const nav = useNavigate();
  const st = flow === 'sourcing' ? s.sourcing : s.sprint;
  const running = st.status === 'running';
  const el = useElapsed(st.startedAt, running);
  const rows: Row[] = flow === 'sourcing'
    ? OPTIONS.map((o, i) => { const c = contactOf(s, o.contactId); const ch = channelFor(s, o); return { id: o.id, who: c.supplier, sub: `${o.sku === 'RM-A17' ? 'A-17 housings' : '6204 bearings'} · ${c.person}`, ch, sentAt: 250 + i * 260, delAt: 1000 + i * 260, repAt: o.replyAt, teaser: `${o.reply.qty} pcs · ₹${o.reply.price.toLocaleString('en-IN')} · by ${fmtShort(o.reply.arrives)}` }; })
    : SPRINT.map((r, i) => ({ id: r.id, who: r.customer, sub: `${r.invoice} · ${r.person}`, ch: r.channel, sentAt: 250 + i * 260, delAt: 1000 + i * 260, repAt: r.replyAt, teaser: r.outcome === 'Disputed' ? `Dispute: 9 of 10 received · ${inr(r.promise.amount)} on ${fmtShort(r.promise.date)}` : r.outcome === 'Statement requested' ? `Wants statement · pays ${fmtShort(r.promise.date)}` : `${r.outcome}: ${inr(r.promise.amount)} by ${fmtShort(r.promise.date)} (${r.promise.mode})` }));
  const replied = rows.filter((r) => el >= r.repAt).length;
  const total = flow === 'sourcing' ? OUTREACH_MS : SPRINT_MS;
  const done = st.status === 'done';
  const t = sprintTotals(s);
  return (
    <div data-outreach={flow} data-state={done ? 'done' : 'running'} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
      <div className="flex items-center gap-2">
        <div className={cx('flex h-7 w-7 items-center justify-center rounded-lg', flow === 'sourcing' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700')}>{flow === 'sourcing' ? <PackageSearch size={15} /> : <Wallet size={15} />}</div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-slate-900">{flow === 'sourcing' ? 'Sourcing agent' : 'Collections agent'} · {done ? 'Outreach complete' : 'Outreach in progress'}</div>
          <div className="text-2xs text-slate-500">{done ? `${rows.length} of ${rows.length} replied` : `${replied} of ${rows.length} replied`} · each contact on their preferred channel</div>
        </div>
        <SimNote>Simulated – nothing leaves this demo</SimNote>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${done ? 100 : Math.min(100, (el / total) * 100)}%` }} /></div>
      <div className="mt-2.5 divide-y divide-slate-100">
        {rows.map((r) => {
          const stage = done || el >= r.repAt ? 3 : el >= r.delAt ? 2 : el >= r.sentAt ? 1 : 0;
          const L = stageLabels(r.ch);
          return (
            <div key={r.id} data-row={r.id} data-stage={stage} className="flex items-center gap-3 py-1.5 text-[12.5px]">
              <ChannelIcon c={r.ch} />
              <div className="w-56 min-w-0"><div className="truncate font-medium text-slate-800">{r.who}</div><div className="truncate text-2xs text-slate-400">{r.sub}</div></div>
              <div className="flex w-[290px] shrink-0 items-center gap-1">
                {L.map((l, i) => (
                  <span key={l} className={cx('inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-2xs', stage > i ? (i === 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700') : stage === i ? 'bg-brand-50 text-brand-700' : 'text-slate-300')}>
                    {stage > i ? (i === 1 && r.ch === 'WhatsApp' ? <CheckCheck size={11} /> : <Check size={11} />) : stage === i && running ? <Loader2 size={10} className="animate-spin" /> : null}{l}
                  </span>
                ))}
              </div>
              <div className={cx('flex-1 truncate text-right text-2xs', stage === 3 ? 'text-slate-700' : 'text-slate-300')}>{stage === 3 ? r.teaser : '…'}</div>
            </div>
          );
        })}
      </div>
      {done && (
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <div className="text-[12.5px] text-slate-700">
            {flow === 'sourcing' ? <>Best so far: <b>A-17</b> → Deccan Castings ₹4,820 (100 by 5 Nov + 50 by 7 Nov) · <b>bearings</b> → Balaji ₹176, tomorrow</> : <>{lakh(t.total)} lined up for Friday vs {lakh(t.target)} target · <Badge tone="green">{t.pct}%</Badge> · 1 dispute, 1 statement request</>}
          </div>
          <Button size="sm" variant="primary" data-testid={flow === 'sourcing' ? 'open-sourcing' : 'open-sprint'} onClick={() => nav(flow === 'sourcing' ? '/sourcing' : '/collections')}>{flow === 'sourcing' ? 'Open sourcing results' : 'Open collections sprint'} <ArrowRight size={13} /></Button>
        </div>
      )}
    </div>
  );
}
