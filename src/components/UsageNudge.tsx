import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gauge, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { can } from '../lib/rbac';
import { cx } from './ui';

/** Simulated meters for the current tenant. Users are never metered on Growth and above. */
export const METERS: [string, number, number, string][] = [['WhatsApp messages', 8710, 10000, 'Add a 1,000-message pack (₹900)'], ['AI credits', 6420, 10000, ''], ['E-invoices', 1210, 99999, ''], ['Storage', 77, 1000, '']];
export default function UsageNudge({ full }: { full?: boolean }) {
  const { s } = useStore(); const [hide, setHide] = useState(() => sessionStorage.getItem('bos-nudge') === '1');
  if (!can(s, 'billing', 'view')) return null;
  const hot = METERS.filter(([, v, m]) => v / m >= 0.8);
  if (!full && (hide || !hot.length)) return null;
  return (<div data-testid="usage-nudge" className="mb-4 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur">
    <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600"><Gauge size={16} /></div>
      <div className="min-w-0 flex-1"><div className="text-[13px] font-medium text-slate-900">{hot.length ? `${hot[0][0]} at ${Math.round(hot[0][1] / hot[0][2] * 100)}% of this month's quota` : 'Usage this month'}</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">{METERS.map(([k, v, m]) => { const p = Math.min(100, Math.round(v / m * 100)); return <div key={k} data-meter={k}><div className="flex justify-between text-2xs text-slate-500"><span>{k}</span><span className="tabular">{p}%</span></div><div className="mt-1 h-1.5 rounded bg-slate-100"><div className={cx('h-1.5 rounded', p >= 80 ? 'bg-amber-400' : 'bg-brand-400')} style={{ width: `${p}%` }} /></div></div>; })}</div>
        <div className="mt-2 text-2xs text-slate-500">Users: unlimited on your plan – no per-seat charges. {hot.length ? <>{hot[0][3]} or <Link to="/billing" className="font-medium text-brand-700">see plans</Link> – nothing changes until you choose.</> : null}</div></div>
      {!full && <button aria-label="Dismiss" onClick={() => { sessionStorage.setItem('bos-nudge', '1'); setHide(true); }} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>}</div>
  </div>);
}
