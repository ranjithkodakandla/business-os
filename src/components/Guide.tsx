import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Compass, X, CheckCircle2, Lock, Minus } from 'lucide-react';
import { useStore } from '../lib/store';
import { Button, cx } from './ui';

export const GUIDE_STEPS = [
  { title: 'SO-1051 is flagged at risk', body: 'Your briefing shows 2 orders at risk. SO-1051 for Sri Lakshmi Projects is due Friday.', to: '/' },
  { title: 'Open the order', body: 'See the delivery commitment (Fri 30 Oct) and what the order needs: 100 × Component A-17.', to: '/orders/SO-1051' },
  { title: 'Check the Materials tab', body: 'Required 100, available 35 – a shortfall of 65.', to: '/orders/SO-1051?tab=Materials' },
  { title: 'Confirm in Inventory', body: 'RM-A17: 53 on hand, 18 reserved for other orders, 35 available, reorder level 50.', to: '/inventory/RM-A17' },
  { title: 'Open purchase request PR-208', body: 'The Procurement agent raised PR-208 for the 65 units and collected three quotes.', to: '/procurement/PR-208' },
  { title: 'Compare the three quotes', body: 'Price, landed cost, delivery date, payment terms and quality side by side.', to: '/procurement/PR-208?tab=Compare' },
  { title: 'Review and approve', body: 'Select a quote and approve it. Nothing is ordered until you do.', to: '/procurement/PR-208?tab=Compare', gate: 'approve' as const },
  { title: 'See the revised production plan', body: 'Operations now shows a split plan: 35 from stock now, 65 after PO-0921 arrives.', to: '/operations?order=SO-1051' },
  { title: 'Check margin and customer balance', body: 'Finance shows the expected margin and Sri Lakshmi Projects’ outstanding ₹2.1 lakh against its credit limit.', to: '/finance?tab=Overview' },
  { title: 'Back to your briefing', body: 'The briefing and Approvals inbox now reflect the new plan.', to: '/' },
];

export function GuidePanel() {
  const { s, update } = useStore();
  const nav = useNavigate();
  const [min, setMin] = useState(false);
  if (!s.guide.active) return null;
  const i = s.guide.step;
  const st = GUIDE_STEPS[i];
  const locked = st.gate === 'approve' && !s.pr208Approved;
  const go = (n: number) => {
    if (n < 0 || n >= GUIDE_STEPS.length) return;
    update((d) => { d.guide.step = n; });
    nav(GUIDE_STEPS[n].to);
  };
  if (min) return <button data-testid="guide-expand" onClick={() => setMin(false)} className="fadein fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 shadow-xl"><Compass size={14} /> Walkthrough · step {s.guide.step + 1} of {GUIDE_STEPS.length}</button>;
  return (
    <div data-testid="guide-panel" className="fadein fixed bottom-5 right-5 z-40 w-[340px] rounded-xl border border-brand-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-700"><Compass size={14} /> Guided walkthrough · SO-1051</div>
        <span className="flex gap-0.5"><button aria-label="Minimise" onClick={() => setMin(true)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><Minus size={14} /></button><button aria-label="Close walkthrough" onClick={() => update((d) => { d.guide.active = false; })} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={14} /></button></span>
      </div>
      <div className="px-4 py-3">
        <div className="mb-2 flex gap-1">
          {GUIDE_STEPS.map((_, k) => <span key={k} className={cx('h-1 flex-1 rounded-full', k < i ? 'bg-brand-500' : k === i ? 'bg-brand-300' : 'bg-slate-100')} />)}
        </div>
        <div className="text-2xs font-medium text-slate-400">Step {i + 1} of {GUIDE_STEPS.length}</div>
        <div className="mt-0.5 text-[14px] font-semibold text-slate-900">{st.title}</div>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{st.body}</p>
        {st.gate === 'approve' && (
          <div className={cx('mt-2 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs', locked ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700')}>
            {locked ? <><Lock size={13} /> Waiting for your approval on PR-208</> : <><CheckCircle2 size={13} /> Approved – PO-0921 raised</>}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
        <Button size="sm" variant="ghost" icon={<ArrowLeft size={13} />} disabled={i === 0} onClick={() => go(i - 1)}>Back</Button>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => nav(st.to)}>Show me</Button>
          {i < GUIDE_STEPS.length - 1
            ? <Button size="sm" variant="primary" data-testid="guide-next" disabled={locked} onClick={() => go(i + 1)}>Next <ArrowRight size={13} /></Button>
            : <Button size="sm" variant="primary" onClick={() => update((d) => { d.guide.active = false; })}>Finish</Button>}
        </div>
      </div>
    </div>
  );
}
