import { Link } from 'react-router-dom';
import { Wallet, ShoppingCart, Truck, Route, ShieldCheck, Fingerprint, BookOpen, Loader2, CheckCircle2, Clock, Send, Info, ChevronRight, PackageSearch } from 'lucide-react';
import { useStore } from '../lib/store';
import { AGENTS, AgentDef, approvals, Approval } from '../lib/domain';
import { runApproval, declineApproval } from '../lib/actions';
import { Badge, Button, cx } from './ui';
import { inr } from '../lib/format';

const ICONS = { collections: Wallet, sourcing: PackageSearch, procurement: ShoppingCart, jobwork: Truck, dispatch: Route, compliance: ShieldCheck, attendance: Fingerprint, books: BookOpen };
export function AgentIcon({ kind, size = 15 }: { kind: AgentDef['icon']; size?: number }) {
  const I = ICONS[kind];
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-grad-soft text-brand-600 ring-1 ring-inset ring-brand-500/10"><I size={size} /></span>;
}
const APPROVAL_FOR = (text: string) =>
  /INV-1048/.test(text) ? 'apr-rem1048' : /PR-208/.test(text) && /recommend/i.test(text) ? 'apr-pr208' : /DC-JW-0709/.test(text) ? 'apr-jw0709' : /PB-0551/.test(text) ? 'apr-pay551' : /Mallesh/.test(text) ? 'apr-leave' : null;

export type FeedItem = { key: string; agent: AgentDef; at: string; text: string; to?: string; state: 'running' | 'awaiting' | 'done' | 'auto' | 'info' | 'approved' };
export function useFeed(): FeedItem[] {
  const { s } = useStore();
  const byName = (n: string) => AGENTS.find((a) => n.toLowerCase().startsWith(a.name.toLowerCase().split(' ')[0])) || AGENTS[1];
  const live: FeedItem[] = s.tasks.map((t) => ({ key: t.id, agent: byName(t.agent), at: t.startedAt, text: t.status === 'running' ? t.text + '…' : t.result || t.text, to: t.to, state: t.status === 'running' ? 'running' : t.to === '/approvals' && !s.supplierFollowUp ? 'awaiting' : 'done' }));
  const logs: FeedItem[] = AGENTS.flatMap((a) => a.log.map((l, i) => {
    const ap = APPROVAL_FOR(l.text);
    const state = l.state === 'awaiting' && ap && s.approvals[ap] ? 'approved' : l.state === 'awaiting' && ap === 'apr-pr208' && s.pr208Approved ? 'approved' : l.state;
    return { key: a.id + i, agent: a, at: l.at, text: l.text, to: l.to, state } as FeedItem;
  }));
  const rank = (x: FeedItem) => (x.state === 'running' ? 0 : x.state === 'awaiting' ? 1 : 2);
  return [...live, ...logs.sort((x, y) => rank(x) - rank(y))];
}
const STATE: Record<FeedItem['state'], { label: string; tone: 'blue' | 'amber' | 'green' | 'gray' | 'violet'; icon: typeof Clock }> = {
  running: { label: 'Working', tone: 'blue', icon: Loader2 },
  awaiting: { label: 'Waiting for you', tone: 'amber', icon: Clock },
  done: { label: 'Done', tone: 'green', icon: CheckCircle2 },
  auto: { label: 'Done automatically', tone: 'violet', icon: Send },
  info: { label: 'FYI', tone: 'gray', icon: Info },
  approved: { label: 'Approved', tone: 'green', icon: CheckCircle2 },
};
export function FeedRow({ f }: { f: FeedItem }) {
  const st = STATE[f.state];
  const body = (
    <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3 transition hover:bg-slate-50">
      <AgentIcon kind={f.agent.icon} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-slate-800">{f.text}</div>
        <div className="text-2xs text-slate-400">{f.agent.name} agent · {f.at}</div>
      </div>
      <Badge tone={st.tone}><st.icon size={11} className={cx('mr-1 inline', f.state === 'running' && 'animate-spin')} />{st.label}</Badge>
      <ChevronRight size={14} className="text-slate-300" />
    </div>
  );
  return f.to ? <Link to={f.to} data-feed={f.key} className="block">{body}</Link> : body;
}

const KIND_TONE: Record<Approval['kind'], 'blue' | 'amber' | 'green' | 'violet' | 'gray' | 'red'> = { Purchase: 'blue', Payment: 'violet', Reminder: 'amber', 'Customer commitment': 'green', Leave: 'gray', 'Job work': 'amber', 'Vendor message': 'blue', Discount: 'gray', Dispute: 'red', Statement: 'gray' };
export function ApprovalRow({ a, compact }: { a: Approval; compact?: boolean }) {
  const ctx = useStore();
  return (
    <div data-approval={a.id} className={cx('flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3 transition hover:bg-slate-50/70', compact && 'flex-wrap sm:flex-nowrap')}>
      <div className={cx('min-w-0 flex-1 basis-full sm:basis-auto')}>
        <div className="flex items-center gap-2">
          <Link to={a.to} className="truncate text-[13px] font-medium text-slate-900 hover:text-brand-700">{a.title}</Link>
          {a.urgent && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}
        </div>
        <div className="truncate text-2xs text-slate-500">{a.agent && <span className="text-slate-400">{a.agent} · </span>}{a.detail}</div>
      </div>
      {!compact && <Badge tone={KIND_TONE[a.kind]}>{a.kind}</Badge>}
      {a.amount ? <div className={cx('tabular w-24 text-[13px] font-medium text-slate-800', compact ? 'mr-auto sm:mr-0 sm:text-right' : 'text-right')}>{inr(a.amount)}</div> : !compact && <div className="w-24" />}
      {!compact && <div className="w-24 text-2xs text-slate-500">{a.due || ''}</div>}
      {!compact && <Button size="sm" variant="ghost" onClick={() => declineApproval(ctx, a.id)}>Decline</Button>}
      <Button size="sm" variant="primary" data-approve={a.id} onClick={() => runApproval(ctx, a.id)}>{a.channel ? 'Review & send' : 'Approve'}</Button>
    </div>
  );
}
export const useApprovals = () => approvals(useStore().s);
