import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore, Autonomy } from '../lib/store';
import { AGENTS } from '../lib/domain';
import { AgentIcon } from '../components/AgentBits';
import { PageHeader, Card, Button, Badge, Callout, Segmented, Select, cx } from '../components/ui';

const LEVELS: Autonomy[] = ['Suggest only', 'Prepare for approval', 'Auto within limits'];
const RUN_TEXT: Record<string, [string, string]> = {
  collections: ['Checking invoices, PDCs and promised dates', 'No new reminders needed – INV-1048 draft still waiting for you'],
  sourcing: ['Checking new orders against stock and supplier contacts', 'No new shortfalls – Kaveri enquiry (SRC-0031) is the only open one'],
  procurement: ['Re-checking material needs against stock and quotes', 'No new shortfalls. PR-208 is the only open gap.'],
  jobwork: ['Checking challans and pending returns', 'DC-JW-0709 is still overdue – chaser draft ready in Approvals'],
  dispatch: ['Re-planning loads for the next 3 days', 'Plan unchanged: 2 loads tomorrow, 2 on Friday'],
  compliance: ['Checking GST, TDS, PF/ESI and MSME due dates', 'Next: PB-0551 MSME payment by Fri 30 Oct'],
  attendance: ['Syncing biometric punches from Gate 1', '42 of 45 present · 3 exceptions unchanged'],
  books: ['Importing Tally vouchers and bank statement', '0 new vouchers · 2 bank entries still to match'],
};
export default function Agents() {
  const { s, update, startTask, toast } = useStore();
  const [open, setOpen] = useState<string | null>('collections');
  const [limit, setLimit] = useState('₹50,000');
  const cfg = (id: string, def: Autonomy) => s.agentCfg[id] || { enabled: true, autonomy: def };
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Agents' }]} title="Agents" subtitle="They work in the background. You decide how much each one may do on its own." />
      <Callout tone="gray" icon={<ShieldCheck size={16} />} title="Guardrails that apply to every agent"
        action={<div className="flex items-center gap-2 text-xs text-slate-600">Auto limit <Select value={limit} onChange={(v) => { setLimit(v); toast(`Auto-limit set to ${v} (demo)`); }} options={['₹10,000', '₹25,000', '₹50,000', '₹1,00,000']} /></div>}>
        Agents never move money, file a return, or change prices or terms. Messages above {limit} or to a new contact always wait in Approvals. Every action is logged and can be undone.
      </Callout>
      <div className="space-y-2">
        {AGENTS.map((a) => {
          const c = cfg(a.id, a.defaultAutonomy);
          const running = s.tasks.find((t) => t.agent.startsWith(a.name) && t.status === 'running');
          const isOpen = open === a.id;
          return (
            <Card key={a.id} pad={false}>
              <div className="flex items-center gap-3 px-4 py-3" data-agent={a.id}>
                <span className={cx('grid h-9 w-9 place-items-center rounded-lg', c.enabled ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-400')}><AgentIcon kind={a.icon} size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-900">{a.name} agent {running ? <Badge tone="blue" dot>Working…</Badge> : !c.enabled ? <Badge>Paused</Badge> : null}</div>
                  <div className="truncate text-xs text-slate-500">Watches: {a.watches}</div>
                </div>
                <div className="text-right text-2xs text-slate-500"><div>Last run {a.lastRun}</div><div>Next {a.next}</div></div>
                <Segmented value={c.autonomy} onChange={(v) => update((d) => { d.agentCfg[a.id] = { ...c, autonomy: v as Autonomy }; }, `${a.name} agent set to "${v}"`)} options={LEVELS.map((l) => ({ value: l, label: l }))} />
                <button role="switch" aria-checked={c.enabled} data-toggle={a.id} onClick={() => update((d) => { d.agentCfg[a.id] = { ...c, enabled: !c.enabled }; }, `${a.name} agent ${c.enabled ? 'paused' : 'resumed'}`)} className={cx('relative h-5 w-9 rounded-full transition', c.enabled ? 'bg-brand-600' : 'bg-slate-300')}><span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition', c.enabled ? 'left-[18px]' : 'left-0.5')} /></button>
                <button onClick={() => setOpen(isOpen ? null : a.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Details">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              </div>
              {isOpen && (
                <div className="grid grid-cols-3 gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                  <div><div className="text-2xs font-semibold uppercase text-slate-500">Guardrail</div><div className="mt-1 text-[13px] text-slate-700">{a.guardrail}</div>
                    <Button size="sm" className="mt-3" icon={<Play size={12} />} disabled={!c.enabled || !!running} data-run={a.id} onClick={() => startTask({ agent: `${a.name} agent`, text: RUN_TEXT[a.id][0], result: RUN_TEXT[a.id][1], ms: 2600 })}>{running ? 'Running…' : 'Run now'}</Button></div>
                  <div className="col-span-2"><div className="text-2xs font-semibold uppercase text-slate-500">Recent log</div>
                    <div className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                      {[...s.tasks.filter((t) => t.agent.startsWith(a.name)).map((t) => ({ at: t.startedAt, text: t.status === 'done' ? t.result! : t.text, to: t.to, state: t.status === 'done' ? 'done' : 'info' })), ...a.log].map((l, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 text-[13px]"><span className="w-24 shrink-0 text-2xs text-slate-400">{l.at}</span><span className="flex-1 text-slate-700">{l.to ? <Link to={l.to} className="hover:text-brand-700 hover:underline">{l.text}</Link> : l.text}</span><Badge tone={l.state === 'awaiting' ? 'amber' : l.state === 'auto' ? 'violet' : l.state === 'done' ? 'green' : 'gray'}>{l.state === 'awaiting' ? 'Waiting for you' : l.state === 'auto' ? 'Done automatically' : l.state === 'done' ? 'Done' : 'FYI'}</Badge></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <div className="text-2xs text-slate-400">Demo: agent runs are simulated in your browser. No messages, payments or filings leave this workspace.</div>
    </div>
  );
}
