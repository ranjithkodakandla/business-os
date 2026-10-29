import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, Send, Inbox, Lightbulb, CheckCircle2, AlertTriangle, FileText, BadgePercent, Zap } from 'lucide-react';
import { useStore } from '../lib/store';
import { SPRINT, RECEIVED, sprintTotals, expected, SprintRow, FRIDAY } from '../lib/sprint';
import { channelLabel } from '../lib/sourcing';
import { startSprint, runApproval } from '../lib/actions';
import { inr, lakh, fmtShort } from '../lib/format';
import { PageHeader, Card, Button, Badge, Callout, DataTable, Kpi, cx } from '../components/ui';
import OutreachLive, { ChannelBadge, SimNote } from '../components/Outreach';
import CallPanel, { CallSpec } from '../components/CallPanel';

const tone = (o: SprintRow['outcome']) => (o === 'Promised' ? 'green' : o === 'Part promised' ? 'blue' : o === 'Disputed' ? 'red' : 'gray');
const FOLLOW = { dispute: { id: 'apr-dispute1050', label: 'Review POD + LR reply', icon: AlertTriangle }, statement: { id: 'apr-stmt1054', label: 'Review statement email', icon: FileText }, discount: { id: 'apr-disc1051', label: 'Approve 1% until Fri 11 am', icon: BadgePercent } } as const;

export default function Collections() {
  const ctx = useStore();
  const { s, update, toast } = ctx;
  const nav = useNavigate();
  const t = sprintTotals(s);
  const [sel, setSel] = useState('SP-1');
  const cur = SPRINT.find((r) => r.id === sel)!;
  const [call, setCall] = useState<{ spec: CallSpec; r: SprintRow } | null>(null);
  const st = s.sprint.status;
  const scale = Math.max(t.target, t.total) * 1.12;
  const openCall = (r: SprintRow) => { const c = s.customers.find((x) => x.id === r.customerId)!; setCall({ r, spec: { name: r.person, org: r.customer, phone: c.phone, language: r.language, context: `${r.invoice} · ${inr(r.amount)} · ${r.outcome}`, tipsTitle: 'Tips for this call', points: [`${r.invoice} ${inr(r.amount)} – ${r.why}`, r.outcome === 'Disputed' ? 'Acknowledge the claim; POD + LR copy is on its way' : `Confirm ${inr(r.promise.amount)} by ${r.promise.mode} on ${fmtShort(r.promise.date)}`, ...(r.leverage ? [r.leverage] : []), 'Ask them to share the UTR once paid'], tips: r.tips } }); };
  const endCall = (notes: string) => {
    if (!call) return;
    update((d) => { d.sprint.calls.push(call.r.id); }, `Call with ${call.spec.name} (${call.spec.org}) – simulated, notes saved${notes ? `: ${notes.slice(0, 60)}` : ''}`);
    toast('Call notes saved to the invoice (simulated call)');
    setCall(null);
  };
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Finance', to: '/finance' }, { label: 'Collections sprint' }]} title={`Collections sprint · ${lakh(s.sprint.target)} by ${fmtShort(FRIDAY)}`}
        subtitle="Ranked by likelihood to pay × amount. Every message used an approved template; you approved the plan." badge={<SimNote>Messages, calls and replies simulated</SimNote>}
        actions={<Button onClick={() => nav('/finance?tab=Receivables')}>Receivables</Button>} />
      {st === 'idle' && <>
        <Callout tone="blue" icon={<Zap size={16} />} title={`No sprint running · about ${lakh(expected())} likely from 6 customers this week`} action={<Button size="sm" variant="primary" data-testid="start-sprint" onClick={() => startSprint(ctx, 500000)}>Review plan & start</Button>}>Ask on Home: “Get me ₹5 lakh in by Friday”, or start from here. Nothing is sent until you approve.</Callout>
        <Card pad={false} title="Proposed plan"><PlanTable /></Card>
      </>}
      {st === 'running' && <OutreachLive flow="sprint" />}
      {st === 'done' && (<>
        <Card>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Kpi label="Target" value={lakh(t.target)} sub={`by ${fmtShort(FRIDAY)}`} />
            <Kpi label="Received" value={lakh(t.received)} sub="INV-1044 · bank feed (simulated)" tone="green" />
            <Kpi label="Promised by Fri" value={lakh(t.promised)} sub="4 customers" tone="blue" />
            <Kpi label="Lined up" value={lakh(t.total)} sub={<span className="text-emerald-600">{t.pct}% of target</span>} />
            <Kpi label="Promised later" value={lakh(t.later)} sub="2–13 Nov" />
          </div>
          <div className="relative mt-4 h-4 rounded-full bg-slate-100" data-testid="sprint-progress" data-pct={t.pct}>
            <div className="absolute left-0 top-0 h-4 rounded-l-full bg-emerald-500" style={{ width: `${(t.received / scale) * 100}%` }} />
            <div className="absolute top-0 h-4 bg-brand-500" style={{ left: `${(t.received / scale) * 100}%`, width: `${(t.promised / scale) * 100}%` }} />
            <div className="absolute -top-1 h-6 w-0.5 bg-slate-800" style={{ left: `${(t.target / scale) * 100}%` }} />
            <div className="absolute -top-5 -translate-x-1/2 text-2xs font-semibold text-slate-700" style={{ left: `${(t.target / scale) * 100}%` }}>Target {lakh(t.target)}</div>
          </div>
          <div className="mt-2 flex gap-4 text-2xs text-slate-500"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Received</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-500" />Promised by Friday</span><span>Promises are not cash – the board updates when money lands in the bank feed.</span></div>
        </Card>
        <Callout tone="green" icon={<CheckCircle2 size={16} />} title={`Received ${inr(RECEIVED.amount)} from ${RECEIVED.customer} (${RECEIVED.invoice})`}>{RECEIVED.note}.</Callout>
        <Card pad={false} title="Customers in this sprint" subtitle="Click a row to see what we sent and what they said">
          <DataTable rowKey={(r: SprintRow) => r.id} rows={SPRINT} onRowClick={(r) => setSel(r.id)} highlight={(r) => r.id === sel} columns={[
            { key: 'n', header: '#', render: (r) => <span data-sprint-row={r.id} className="text-slate-400">{r.rank}</span> },
            { key: 'c', header: 'Customer', render: (r) => <div><div className="font-medium text-slate-900">{r.customer}</div><div className="text-2xs text-slate-400">{r.behaviour}</div></div> },
            { key: 'i', header: 'Invoice', render: (r) => <span>{r.invoice} · {inr(r.amount)}</span> },
            { key: 'ch', header: 'Channel', render: (r) => <ChannelBadge c={r.channel} /> },
            { key: 'o', header: 'Outcome', render: (r) => <Badge tone={tone(r.outcome)}>{r.outcome}</Badge> },
            { key: 'p', header: 'Promise to pay', render: (r) => <span className={r.byFriday ? 'font-medium text-emerald-700' : 'text-slate-600'}>{inr(r.promise.amount)} · {fmtShort(r.promise.date)} · {r.promise.mode}</span> },
            { key: 'cf', header: 'Confidence', align: 'right', render: (r) => `${r.confidence}%` },
          ]} />
        </Card>
        <Card title={`${cur.customer} · what we sent and what they said`} subtitle={`${channelLabel(cur.channel)} to ${cur.person} · ${cur.language}`}
          actions={<>{cur.followUp && !s.approvals[FOLLOW[cur.followUp].id] && <Button size="sm" data-testid="sprint-followup" onClick={() => runApproval(ctx, FOLLOW[cur.followUp!].id)}>{FOLLOW[cur.followUp].label}</Button>}
            <Button size="sm" variant="primary" data-testid="sprint-call" icon={<PhoneCall size={13} />} onClick={() => openCall(cur)}>Call now</Button></>}>
          <div className="grid grid-cols-2 gap-3" data-testid="sprint-detail">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase text-slate-500"><Send size={12} /> What we sent <ChannelBadge c={cur.channel} /></div>
              <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-slate-700">{cur.sent}</pre>
            </div>
            <div className={cx('rounded-lg border p-3', cur.channel === 'WhatsApp' ? 'border-emerald-200 bg-emerald-50/50' : cur.channel === 'Call' ? 'border-violet-200 bg-violet-50/40' : 'border-sky-200 bg-sky-50/40')}>
              <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase text-slate-500"><Inbox size={12} /> What they said · {cur.replyHead}</div>
              <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-slate-800">{cur.reply}</pre>
              {cur.quotes.length > 0 && <div className="mt-2 space-y-1">{cur.quotes.map((q) => <div key={q} className="border-l-2 border-violet-300 pl-2 text-[12.5px] italic text-slate-600">“{q}”</div>)}</div>}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-1.5 flex items-center justify-between text-2xs font-semibold uppercase text-slate-500"><span>Promise-to-pay entry</span><Badge tone={tone(cur.outcome)}>{cur.outcome}</Badge></div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
                <span className="text-slate-500">Amount</span><span className="font-semibold">{inr(cur.promise.amount)}</span>
                <span className="text-slate-500">Date · mode</span><span>{fmtShort(cur.promise.date)} · {cur.promise.mode}</span>
                <span className="text-slate-500">Counts for Friday</span><span>{cur.byFriday ? inr(cur.byFriday) : 'No – after Friday'}</span>
                <span className="text-slate-500">Confidence</span><span>{cur.confidence}%{cur.channel === 'Call' ? ' · verbal' : ' · in writing'}</span>
                {cur.leverage && <><span className="text-slate-500">Leverage</span><span>{cur.leverage}</span></>}
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3" data-testid="sprint-tips">
              <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase text-amber-700"><Lightbulb size={12} /> Tips</div>
              <ul className="list-disc space-y-1 pl-4 text-[12.5px] text-slate-700">{cur.tips.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        </Card>
        <Card title="Follow-ups routed to you" subtitle="Disputes and requests become tasks in Approvals">
          <div className="divide-y divide-slate-100">
            {SPRINT.filter((r) => r.followUp).map((r) => { const f = FOLLOW[r.followUp!]; const done = !!s.approvals[f.id]; const I = f.icon; return (
              <div key={r.id} data-followup={f.id} className="flex items-center gap-3 py-2 text-[13px]">
                <I size={15} className={r.followUp === 'dispute' ? 'text-rose-500' : 'text-slate-400'} />
                <div className="flex-1"><div className="text-slate-800">{r.followUp === 'dispute' ? `Dispute on ${r.invoice}: “received 9 of 10 RA-12” – send POD + LR first` : r.followUp === 'statement' ? `${r.customer} asked for a statement of account` : `${r.customer} asked to extend the 1% discount to Friday`}</div><div className="text-2xs text-slate-400">{r.customer} · {r.invoice}</div></div>
                {done ? <Badge tone="green">Done</Badge> : <Button size="sm" onClick={() => runApproval(ctx, f.id)}>{f.label}</Button>}
              </div>); })}
          </div>
        </Card>
      </>)}
      <CallPanel spec={call?.spec || null} onClose={() => setCall(null)} onEnd={endCall} />
    </div>
  );
}

function PlanTable() {
  return (
    <DataTable rowKey={(r: SprintRow) => r.id} rows={SPRINT} columns={[
      { key: 'n', header: '#', render: (r) => r.rank },
      { key: 'c', header: 'Customer', render: (r) => <span className="font-medium text-slate-900">{r.customer}</span> },
      { key: 'i', header: 'Invoice', render: (r) => `${r.invoice} · ${inr(r.amount)}` },
      { key: 'w', header: 'Why', render: (r) => <span className="text-slate-600">{r.why}</span> },
      { key: 'ch', header: 'Channel', render: (r) => <ChannelBadge c={r.channel} /> },
      { key: 'l', header: 'Likely', align: 'right', render: (r) => `${r.likelihood}%` },
    ]} />
  );
}
