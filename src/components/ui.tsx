import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search, X, Inbox } from 'lucide-react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'violet';
const toneCls: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  blue: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
};
export const dotCls: Record<Tone, string> = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500', blue: 'bg-brand-500', gray: 'bg-slate-400', violet: 'bg-violet-500' };

export function Badge({ tone = 'gray', children, dot }: { tone?: Tone; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-medium ring-1 ring-inset', toneCls[tone])}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', dotCls[tone])} />}
      {children}
    </span>
  );
}
const STATUS_TONE: [RegExp, Tone][] = [
  [/(at risk|blocked|overdue|short|absent|lost|crossed|declined)/i, 'red'],
  [/(watch|behind|partial|pending|due this week|late|draft|waiting|awaiting|negotiation|leave|partly|to generate|with job worker)/i, 'amber'],
  [/(on track|ready|paid|done|passed|approved|won|received|present|confirmed|returned|sent|scheduled|completed|in stock|ok|delivered|filed)/i, 'green'],
  [/(proposal|qualified|in production|due|upcoming|in progress|quotes received|new lead|po issued|in transit|planned)/i, 'blue'],
];
export const toneFor = (s: string): Tone => STATUS_TONE.find(([r]) => r.test(s))?.[1] ?? 'gray';
export const Status = ({ children }: { children: string }) => <Badge tone={toneFor(children)} dot>{children}</Badge>;

export function Button({ variant = 'secondary', size = 'md', icon, children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'; size?: 'sm' | 'md'; icon?: React.ReactNode }) {
  const v = {
    primary: 'btn-primary',
    secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 shadow-sm disabled:text-slate-300',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-white text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  }[variant];
  return (
    <button {...rest} className={cx('inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[.98] disabled:cursor-not-allowed', size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-[13px]', v, className)}>
      {icon}
      {children}
    </button>
  );
}

export function Card({ title, subtitle, actions, children, className, pad = true, id }: { title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean; id?: string }) {
  return (
    <section id={id} className={cx('rounded-2xl border border-slate-200/70 bg-white shadow-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold tracking-tight text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-2xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function PageHeader({ crumbs, title, subtitle, actions, badge }: { crumbs: { label: string; to?: string }[]; title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
      <div className="min-w-0">
        <nav className="mb-1 flex flex-wrap items-center gap-1 text-2xs text-slate-500">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
              {c.to ? <Link to={c.to} className="hover:text-brand-700">{c.label}</Link> : <span className="text-slate-600">{c.label}</span>}
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 md:truncate md:text-[26px]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>}
    </div>
  );
}

export function Kpi({ label, value, sub, tone, icon, onClick, foot }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: Tone; icon?: React.ReactNode; onClick?: () => void; foot?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cx('group rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-card transition duration-200', onClick && 'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift')}>
      <div className="flex items-center justify-between text-2xs font-medium uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        <span className="text-slate-400 group-hover:text-brand-600">{icon}</span>
      </div>
      <div className="mt-1.5 text-[24px] font-semibold tabular tracking-tight text-slate-900">{value}</div>
      {sub && <div className={cx('mt-0.5 text-xs', tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-rose-600' : tone === 'amber' ? 'text-amber-700' : 'text-slate-500')}>{sub}</div>}
      {foot}
    </button>
  );
}

export function Tabs({ tabs, value, onChange, counts }: { tabs: string[]; value: string; onChange: (t: string) => void; counts?: Record<string, number | string> }) {
  return (
    <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t} data-tab={t} onClick={() => onChange(t)} className={cx('-mb-px flex shrink-0 whitespace-nowrap items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors', t === value ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
          {t}
          {counts?.[t] !== undefined && <span className={cx('rounded-full px-1.5 text-2xs', t === value ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500')}>{counts[t]}</span>}
        </button>
      ))}
    </div>
  );
}
export function useTab(def: string): [string, (t: string) => void] {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || def;
  return [tab, (t: string) => { const n = new URLSearchParams(sp); n.set('tab', t); setSp(n, { replace: true }); }];
}

export type Col<T> = { key: string; header: React.ReactNode; render: (r: T) => React.ReactNode; align?: 'left' | 'right' | 'center'; width?: string; className?: string };
export function DataTable<T>({ columns, rows, onRowClick, rowKey, empty = 'No records match these filters', highlight, dense }: { columns: Col<T>[]; rows: T[]; onRowClick?: (r: T) => void; rowKey: (r: T) => string; empty?: string; highlight?: (r: T) => boolean; dense?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className={cx('whitespace-nowrap px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-slate-500', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">{empty}</td></tr>
          )}
          {rows.map((r) => (
            <tr key={rowKey(r)} data-row={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cx('border-b border-slate-100 last:border-0', onRowClick && 'cursor-pointer hover:bg-brand-50/40', highlight?.(r) && 'bg-amber-50/50')}>
              {columns.map((c) => (
                <td key={c.key} className={cx('px-3 text-slate-700', dense ? 'py-1.5' : 'py-2.5', c.align === 'right' ? 'text-right tabular' : c.align === 'center' ? 'text-center' : 'text-left', c.className)}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…', width = 'w-64' }: { value: string; onChange: (v: string) => void; placeholder?: string; width?: string }) {
  return (
    <label className={cx('flex h-8 items-center gap-2 rounded-md bg-white px-2.5 ring-1 ring-inset ring-slate-200 focus-within:ring-brand-500', width)}>
      <Search size={14} className="text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
      {value && <button onClick={() => onChange('')} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>}
    </label>
  );
}
export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label?: string }) {
  return (
    <label className="flex h-8 items-center gap-1.5 rounded-md bg-white pl-2.5 pr-1 text-[13px] ring-1 ring-inset ring-slate-200">
      {label && <span className="text-slate-400">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent pr-1 font-medium text-slate-700 outline-none">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
export function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: React.ReactNode }[] }) {
  return (
    <div className="no-scrollbar inline-flex h-8 max-w-full overflow-x-auto rounded-md bg-slate-100 p-0.5 max-lg:h-11">
      {options.map((o) => (
        <button key={o.value} data-seg={o.value} onClick={() => onChange(o.value)} className={cx('flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-2.5 text-xs font-medium', value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>{o.label}</button>
      ))}
    </div>
  );
}
export function Toolbar({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5"><div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{children}</div><div className="flex max-w-full flex-wrap items-center gap-2">{right}</div></div>;
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg' }: { open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div role="dialog" className={cx('fadein w-full max-w-full rounded-t-2xl pb-[env(safe-area-inset-bottom)] sm:rounded-2xl sm:pb-0 border border-slate-200/70 bg-white shadow-lift', width)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto overflow-x-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-2xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-slate-800">{children}</dd>
    </div>
  );
}
export const Fields = ({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) => (
  <dl className={cx('grid gap-x-6 gap-y-3', cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3')}>{children}</dl>
);

export function Timeline({ items }: { items: { date: string; title: React.ReactNode; text?: React.ReactNode; tone?: Tone; tag?: string }[] }) {
  return (
    <ol className="relative ml-1.5 border-l border-slate-200">
      {items.map((it, i) => (
        <li key={i} className="mb-3.5 ml-4 last:mb-0">
          <span className={cx('absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white', dotCls[it.tone || 'gray'])} />
          <div className="flex items-center gap-2 text-2xs text-slate-400"><span>{it.date}</span>{it.tag && <Badge>{it.tag}</Badge>}</div>
          <div className="text-[13px] text-slate-800">{it.title}</div>
          {it.text && <div className="text-xs text-slate-500">{it.text}</div>}
        </li>
      ))}
    </ol>
  );
}

export function Progress({ value, planned, tone }: { value: number; planned?: number; tone?: Tone }) {
  const t = tone || (planned !== undefined && value < planned - 15 ? 'amber' : value >= 100 ? 'green' : 'blue');
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className={cx('h-full rounded-full', dotCls[t])} style={{ width: `${Math.min(100, value)}%` }} />
        {planned !== undefined && planned > 0 && <div className="absolute top-0 h-full w-0.5 bg-slate-500/60" style={{ left: `${Math.min(99, planned)}%` }} />}
      </div>
      <span className="w-9 text-right text-xs tabular text-slate-600">{value}%</span>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-[13px] text-slate-500"><span className="grid h-10 w-10 place-items-center rounded-full bg-grad-soft text-brand-600"><Inbox size={18} /></span>{children}</div>;
}
export const LinkText = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link to={to} onClick={(e) => e.stopPropagation()} className="font-medium text-brand-700 hover:underline">{children}</Link>
);
export function Callout({ tone = 'blue', icon, title, children, action }: { tone?: Tone; icon?: React.ReactNode; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode }) {
  const c = { blue: 'border-brand-100 bg-brand-50/60', amber: 'border-amber-200 bg-amber-50/70', red: 'border-rose-200 bg-rose-50/70', green: 'border-emerald-200 bg-emerald-50/60', gray: 'border-slate-200 bg-slate-50', violet: 'border-violet-200 bg-violet-50' }[tone];
  return (
    <div className={cx('flex items-start gap-3 rounded-lg border px-3.5 py-3', c)}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        {title && <div className="text-[13px] font-semibold text-slate-900">{title}</div>}
        {children && <div className="text-[13px] text-slate-600">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
