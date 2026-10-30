import { useRef, useState } from 'react';
import { Check, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { runApproval, declineApproval } from '../lib/actions';
import { inr } from '../lib/format';
import { Badge, cx } from './ui';
import type { Approval } from '../lib/domain';

/** Phone approvals: one card at a time; swipe right to approve, left to reject (or tap the buttons). Approvals still open the usual confirm step. */
export default function SwipeApprovals({ list }: { list: Approval[] }) {
  const ctx = useStore(); const [dx, setDx] = useState(0); const x0 = useRef<number | null>(null);
  const a = list[0];
  if (!a) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-[13px] text-slate-500" data-testid="swipe-empty">All caught up 🎉</div>;
  const act = (ok: boolean) => { setDx(0); ok ? runApproval(ctx, a.id) : declineApproval(ctx, a.id); };
  const end = () => { if (dx > 90) act(true); else if (dx < -90) act(false); else setDx(0); x0.current = null; };
  return (<div data-testid="swipe-approvals" className="space-y-3">
    <div className="flex items-center justify-between text-2xs text-slate-500"><span>{list.length} waiting · swipe → approve, ← reject</span></div>
    <div className="relative h-[230px]">
      {list[1] && <div className="absolute inset-x-3 top-3 h-[210px] rounded-2xl border border-slate-200 bg-white/70" />}
      <div data-swipe-card={a.id} onTouchStart={(e) => { x0.current = e.touches[0].clientX; }} onTouchMove={(e) => { if (x0.current !== null) setDx(e.touches[0].clientX - x0.current); }} onTouchEnd={end}
        onPointerDown={(e) => { if (e.pointerType === 'mouse') x0.current = e.clientX; }} onPointerMove={(e) => { if (e.pointerType === 'mouse' && x0.current !== null) setDx(e.clientX - x0.current); }} onPointerUp={(e) => { if (e.pointerType === 'mouse') end(); }}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)`, transition: x0.current === null ? 'transform .2s' : 'none', touchAction: 'pan-y' }}
        className={cx('absolute inset-0 select-none rounded-2xl border bg-white p-4 shadow-lg', dx > 40 ? 'border-emerald-300' : dx < -40 ? 'border-rose-300' : 'border-slate-200')}>
        {dx > 40 && <span className="absolute right-4 top-4 rounded-lg border-2 border-emerald-500 px-2 text-[13px] font-bold text-emerald-600">APPROVE</span>}
        {dx < -40 && <span className="absolute left-4 top-4 rounded-lg border-2 border-rose-500 px-2 text-[13px] font-bold text-rose-600">REJECT</span>}
        <Badge tone="blue">{a.kind}</Badge>{a.urgent && <span className="ml-2 text-2xs font-medium text-rose-600">Urgent</span>}
        <div className="mt-2 line-clamp-2 text-[16px] font-semibold text-slate-900">{a.title}</div>
        <div className="mt-1 line-clamp-3 text-[13px] text-slate-500">{a.detail}</div>
        {a.amount ? <div className="mt-2 text-xl font-bold tabular text-slate-900">{inr(a.amount)}</div> : null}
        <Link to={a.to} className="absolute bottom-3 left-4 flex items-center text-2xs font-medium text-brand-700">Details<ChevronRight size={12} /></Link>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <button data-swipe-reject onClick={() => act(false)} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-[14px] font-semibold text-rose-700"><X size={18} />Reject</button>
      <button data-swipe-approve onClick={() => act(true)} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[14px] font-semibold text-white"><Check size={18} />{a.channel ? 'Review' : 'Approve'}</button>
    </div>
  </div>);
}
