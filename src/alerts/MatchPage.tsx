import { useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../lib/store';
import { can } from '../lib/rbac';
import { inr } from '../lib/format';
import { PageHeader, Card, Badge, Kpi, Button, Tabs, Status, Callout, cx } from '../components/ui';
import { useAlerts, updateAlerts, type MatchRow } from './data';

const HEAD = { P2P: ['PO', 'GRN', 'Purchase bill'], O2C: ['Sales order', 'Order confirmation', 'Invoice'] };
export default function MatchPage() {
  const { s, toast } = useStore(); const st = useAlerts();
  const tabs = [...(can(s, 'procurement', 'view') || can(s, 'finance', 'view') ? ['PO · GRN · Bill'] : []), ...(can(s, 'orders', 'view') || can(s, 'finance', 'view') ? ['SO · OC · Invoice'] : [])];
  const [tab, setTab] = useState(tabs[0] || ''); const kind = tab.startsWith('PO') ? 'P2P' : 'O2C';
  const rows = st.match.filter((m) => m.kind === kind);
  const open = st.match.filter((m) => m.status === 'Mismatch' && tabs.some((t) => (t.startsWith('PO') ? 'P2P' : 'O2C') === m.kind));
  const value = (m: MatchRow) => Math.abs(m.qty[2] * m.rate[2] - m.qty[0] * m.rate[0]) || Math.abs(m.qty[1] - m.qty[2]) * m.rate[0];
  const resolve = (m: MatchRow) => { updateAlerts((x) => ({ ...x, match: x.match.map((r) => r.id === m.id ? { ...r, status: 'Resolved', resolution: m.fix } : r) })); toast(`${m.id} resolved: ${m.fix} (simulated – documents drafted, nothing sent)`); };
  return (<div className="space-y-4" data-testid="match-page">
    <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Money' }, { label: 'Three-way match' }]} title="Three-way match" subtitle="Every bill and invoice checked against the order and the goods that actually moved. The AI explains each mismatch and proposes a fix." badge={<Badge tone="violet">AI · simulated</Badge>} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Open mismatches" value={open.length} tone={open.length ? 'amber' : 'green'} />
      <Kpi label="Value at stake" value={inr(open.reduce((a, m) => a + value(m), 0))} />
      <Kpi label="Auto-matched" value={`${st.match.filter((m) => m.status === 'Matched').length}`} sub="within tolerance" tone="green" />
      <Kpi label="Resolved today" value={st.match.filter((m) => m.status === 'Resolved').length} />
    </div>
    {tabs.length === 0 ? <Callout tone="gray" title="Not in your access">Needs Procurement, Orders or Finance access.</Callout> : <>
    <Tabs tabs={tabs} value={tab} onChange={setTab} />
    <div className="space-y-3">{rows.map((m) => { const bad = (i: number) => m.qty[i] !== m.qty[0] || m.rate[i] !== m.rate[0];
      return <Card key={m.id} pad={false}><div data-match={m.id} className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[14px] font-semibold text-slate-900">{m.party} · {m.item}</div><div className="text-2xs text-slate-500">{m.id}</div></div><Status>{m.status}</Status></div>
        <div className="mt-3 grid grid-cols-3 gap-2">{m.docs.map((d, i) => <div key={d} className={cx('rounded-xl border p-2.5 text-[12.5px]', i > 0 && bad(i) && m.status === 'Mismatch' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white')}>
          <div className="text-2xs uppercase tracking-wide text-slate-400">{HEAD[m.kind][i]}</div><div className="font-medium text-brand-700">{d}</div><div className="tabular">{m.qty[i].toLocaleString('en-IN')} × {inr(m.rate[i])}</div></div>)}</div>
        {m.reason && m.status === 'Mismatch' && <div className="mt-3 flex flex-wrap items-start gap-3 rounded-xl bg-indigo-50/70 p-3" data-testid="ai-reason"><Sparkles size={16} className="mt-0.5 shrink-0 text-indigo-500" /><div className="min-w-0 flex-1 text-[13px] text-slate-700"><b>Why:</b> {m.reason}<div className="mt-1 text-indigo-700"><b>Suggested:</b> {m.fix}</div></div>
          <Button size="sm" variant="primary" data-resolve={m.id} icon={<CheckCircle2 size={14} />} onClick={() => resolve(m)}>Resolve</Button></div>}
        {m.status === 'Resolved' && <div className="mt-3 flex items-center gap-2 text-[12.5px] text-emerald-700"><CheckCircle2 size={14} />{m.resolution}</div>}
        {m.status === 'Matched' && <div className="mt-3 flex items-center gap-2 text-[12.5px] text-emerald-700"><CheckCircle2 size={14} />Quantity and price agree across all three documents.</div>}
      </div></Card>; })}</div>
    <div className="flex items-center gap-2 text-2xs text-slate-500"><AlertTriangle size={12} />Tolerance: qty ±5%, price ±0.5%. Mismatches also raise the "{kind === 'P2P' ? 'PO vs GRN vs bill' : 'SO vs OC vs invoice'} mismatch" alert.</div></>}
  </div>);
}
