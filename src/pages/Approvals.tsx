import { useState } from 'react';
import { Inbox, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store';
import { PageHeader, Card, Segmented, Callout } from '../components/ui';
import { ApprovalRow, useApprovals } from '../components/AgentBits';

export default function Approvals() {
  const { s } = useStore();
  const all = useApprovals();
  const [f, setF] = useState('All');
  const groups: Record<string, string[]> = { All: [], Money: ['Purchase', 'Payment', 'Discount'], Messages: ['Reminder', 'Vendor message', 'Customer commitment', 'Job work', 'Dispute', 'Statement'], People: ['Leave'] };
  const list = f === 'All' ? all : all.filter((a) => groups[f].includes(a.kind));
  const urgent = list.filter((a) => a.urgent), rest = list.filter((a) => !a.urgent);
  const done = s.log.filter((l) => /^(Approved|PO-0921 sent|Split|Payment reminder|Follow-up|Supplier follow-up|Declined)/.test(l.text)).slice(0, 8);
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Approvals' }]} title="Approvals" subtitle="One inbox for everything that needs your yes. Agents prepare the work, and nothing consequential happens until you approve it."
        actions={<Segmented value={f} onChange={setF} options={Object.keys(groups).map((g) => ({ value: g, label: g }))} />} />
      <Card pad={false} title={`Needs you today · ${urgent.length}`}>
        <div className="divide-y divide-slate-50">{urgent.map((a) => <ApprovalRow key={a.id} a={a} />)}{urgent.length === 0 && <div className="px-4 py-5 text-[13px] text-slate-500">Nothing urgent.</div>}</div>
      </Card>
      <Card pad={false} title={`When you have a minute · ${rest.length}`}>
        <div className="divide-y divide-slate-50">{rest.map((a) => <ApprovalRow key={a.id} a={a} />)}{rest.length === 0 && <div className="px-4 py-5 text-[13px] text-slate-500">All caught up.</div>}</div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Card title="Recently decided">
          {done.length === 0 ? <div className="text-[13px] text-slate-500">Approvals you make show up here with a time stamp.</div> : (
            <ul className="space-y-1.5">{done.map((l, i) => <li key={i} className="flex gap-3 text-[13px]"><span className="tabular w-10 shrink-0 text-slate-400">{l.at}</span><span className="text-slate-700">{l.text}</span></li>)}</ul>
          )}
        </Card>
        <Callout tone="gray" icon={<ShieldCheck size={16} />} title="How approvals work">
          Purchases, payments, discounts, customer commitments and outgoing messages always wait here. Agents may act on their own only within limits you set (for example, reminders under ₹50,000). You can change those limits in <a href="#/agents" className="font-medium text-brand-700">Agents</a>. In this demo, approving records the action and sends nothing.
        </Callout>
      </div>
      <div className="hidden"><Inbox /></div>
    </div>
  );
}
