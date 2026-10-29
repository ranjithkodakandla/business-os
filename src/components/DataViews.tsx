// Structured chat answers for data commands: confirm cards, before/after diffs, sortable tables, KPI tiles and charts.
import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, PackagePlus, PenLine, Table2, BarChart3, SearchX, CheckCircle2, X, ArrowRight, ArrowUpDown, ArrowUp, ArrowDown, Lightbulb, Cpu, ContactRound, AlertTriangle, LayoutDashboard, ChevronRight } from 'lucide-react';
import { useStore } from '../lib/store';
import type { Result, Col, Row, Act, Kpi, Bar } from '../lib/dataAgent';
import { apply, missingFields, validGstin, maskPhone, personMissing, type NewPerson } from '../lib/dataAgent';
import { cx } from './ui';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const askInChat = (text: string) => window.dispatchEvent(new CustomEvent('bw-ask', { detail: text }));

const KIND: Record<Result['kind'], { icon: React.ElementType; tone: string; tool: string }> = {
  add_person: { icon: UserPlus, tone: 'from-pink-500 to-rose-500', tool: 'add_person' },
  add_supplier: { icon: UserPlus, tone: 'from-violet-500 to-indigo-500', tool: 'add_supplier' },
  receive: { icon: PackagePlus, tone: 'from-emerald-500 to-teal-500', tool: 'receive_stock' },
  update: { icon: PenLine, tone: 'from-amber-500 to-orange-500', tool: 'update_record' },
  table: { icon: Table2, tone: 'from-sky-500 to-blue-500', tool: 'query' },
  record: { icon: ContactRound, tone: 'from-sky-500 to-indigo-500', tool: 'query' },
  insight: { icon: BarChart3, tone: 'from-fuchsia-500 to-violet-500', tool: 'insight' },
  view: { icon: LayoutDashboard, tone: 'from-indigo-500 to-sky-500', tool: 'view' },
  notfound: { icon: SearchX, tone: 'from-slate-400 to-slate-500', tool: 'lookup' },
};

function Shell({ r, children, footer }: { r: Result; children?: React.ReactNode; footer?: React.ReactNode }) {
  const k = KIND[r.kind];
  return (
    <div data-testid="data-card" data-kind={r.kind} data-status={'status' in r ? r.status : 'view'} className="fadein overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_-12px_rgba(15,23,42,.12)] dark:border-white/10">
      <div className="flex items-start gap-3 px-4 pb-3 pt-4">
        <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm', k.tone)}><k.icon size={17} /></span>
        <div className="min-w-0 flex-1">
          {'title' in r && r.title && <div className="text-2xs font-semibold uppercase tracking-wide text-slate-400">{r.title}</div>}
          <div data-testid="data-headline" className="text-[14.5px] font-semibold leading-snug tracking-tight text-slate-900">{r.headline}</div>
        </div>
        <span title={r.via === 'llm' ? 'The AI turned your message into a structured action' : 'Matched by the built-in parser'} className="hidden shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10.5px] font-medium text-slate-400 sm:inline-flex" data-via={r.via}><Cpu size={11} />{k.tool}</span>
      </div>
      {children && <div className="space-y-3 px-4 pb-4">{children}</div>}
      {footer && <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-white/5 dark:bg-white/[.02]">{footer}</div>}
    </div>
  );
}

function Actions({ acts }: { acts: Act[] }) {
  const nav = useNavigate();
  return <>{acts.map((a) => (
    <button key={a.kind} data-act={a.kind} onClick={() => (a.kind.startsWith('open:') ? nav(a.kind.slice(5)) : askInChat(a.kind.slice(4)))}
      className={cx('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition', a.primary ? 'btn-primary' : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700')}>
      {a.label}{a.primary && <ArrowRight size={13} />}
    </button>))}</>;
}

const toneTxt = { red: 'text-rose-600', amber: 'text-amber-600', green: 'text-emerald-600', blue: 'text-brand-600' } as const;
function Kpis({ items }: { items: Kpi[] }) {
  return (
    <div className={cx('grid gap-2', items.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')} data-testid="data-kpis">
      {items.map((k) => (
        <div key={k.label} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-white/5 dark:bg-white/[.03]">
          <div className="text-2xs font-medium text-slate-400">{k.label}</div>
          <div className={cx('tabular text-[17px] font-semibold tracking-tight', k.tone ? toneTxt[k.tone] : 'text-slate-900')}>{k.value}</div>
          {k.sub && <div className="truncate text-2xs text-slate-400">{k.sub}</div>}
        </div>
      ))}
    </div>
  );
}

const fmt = (c: Col, v: unknown) => v === '' || v === undefined || v === null ? '—' : c.type === 'money' ? (Number(v) ? inr(Number(v)) : '—') : c.type === 'pct' ? (Number(v) || v === 0 ? `${v}%` : '—') : String(v);
const badgeTone = (v: string) => (/at risk|overdue|blocked|awaiting/i.test(v) ? 'bg-rose-50 text-rose-700' : /due this week|watch|proposal|negotiation/i.test(v) ? 'bg-amber-50 text-amber-700' : /paid|received|confirmed|delivered|won|on track/i.test(v) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600');
export function SortTable({ cols, rows, empty, max = 8 }: { cols: Col[]; rows: Row[]; empty?: string; max?: number }) {
  const nav = useNavigate();
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null);
  const [all, setAll] = useState(false);
  const sorted = useMemo(() => { if (!sort) return rows; const c = cols.find((x) => x.key === sort.k)!; return [...rows].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; const n = c.type && c.type !== 'text' && c.type !== 'badge'; return (n ? (Number(x) || 0) - (Number(y) || 0) : String(x).localeCompare(String(y))) * sort.dir; }); }, [rows, sort, cols]);
  if (!rows.length) return <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[13px] text-slate-500">{empty || 'Nothing to show.'}</div>;
  const shown = all ? sorted : sorted.slice(0, max);
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[520px] text-[12.5px]" data-testid="data-table">
        <thead><tr className="border-b border-slate-100 text-2xs uppercase tracking-wide text-slate-400">
          {cols.map((c) => { const on = sort?.k === c.key; return (
            <th key={c.key} aria-sort={on ? (sort!.dir === 1 ? 'ascending' : 'descending') : 'none'} className={cx('whitespace-nowrap px-2 py-1.5 font-semibold', c.align === 'r' ? 'text-right' : 'text-left')}>
              <button data-sort={c.key} onClick={() => setSort(on ? { k: c.key, dir: sort!.dir === 1 ? -1 : 1 } : { k: c.key, dir: c.type && c.type !== 'text' && c.type !== 'badge' ? -1 : 1 })} className={cx('inline-flex items-center gap-1 rounded hover:text-slate-700', on && 'text-slate-700')}>
                {c.label}{on ? (sort!.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
              </button>
            </th>); })}
        </tr></thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={i} onClick={() => r._to && nav(String(r._to))} className={cx('border-b border-slate-50 transition last:border-0', r._to && 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[.03]')}>
              {cols.map((c, j) => (
                <td key={c.key} className={cx('px-2 py-2 align-top', c.align === 'r' ? 'tabular text-right' : 'text-left', j === 0 ? 'font-medium text-slate-900' : 'text-slate-600')}>
                  {c.type === 'badge' ? <span className={cx('rounded-full px-2 py-0.5 text-2xs font-medium', badgeTone(String(r[c.key])))}>{String(r[c.key])}</span>
                    : <span className={cx(j === 0 && r._tone === 'red' && 'inline-flex items-center gap-1')}>{j === 0 && r._tone === 'red' && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}{j === 0 && r._tone === 'amber' && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />}{fmt(c, r[c.key])}</span>}
                  {j === 0 && r._sub && <div className="max-w-[220px] truncate text-2xs font-normal text-slate-400">{String(r._sub)}</div>}
                  {c.key === 'c' && r._csub && <div className="text-2xs text-slate-400">{String(r._csub)}</div>}
                  {c.key === 'a' && r._asub && <div className={cx('text-2xs', /riskier/.test(String(r._asub)) ? 'text-amber-600' : 'text-slate-400')}>{String(r._asub)}</div>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > max && <button onClick={() => setAll((v) => !v)} className="mt-1 text-[12px] font-medium text-brand-700 hover:underline">{all ? 'Show fewer' : `Show all ${rows.length}`}</button>}
    </div>
  );
}

const barTone = { green: 'from-emerald-400 to-emerald-500', amber: 'from-amber-400 to-amber-500', red: 'from-rose-400 to-rose-500', blue: 'from-indigo-400 to-violet-500' } as const;
function Bars({ bars, title }: { bars: Bar[]; title: string }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-3 dark:border-white/5 dark:from-white/[.03] dark:to-transparent" data-testid="data-chart" role="img" aria-label={`${title}: ${bars.map((b) => `${b.label} ${b.display}`).join(', ')}`}>
      <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="space-y-1.5">
        {bars.map((b, i) => (
          <div key={b.label + i} className="grid grid-cols-[minmax(90px,38%)_1fr_auto] items-center gap-2 text-[12px]">
            <span className="truncate text-slate-600">{b.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5"><span className={cx('grow-bar block h-full rounded-full bg-gradient-to-r', barTone[b.tone || 'blue'])} style={{ width: `${Math.max(3, (b.value / max) * 100)}%`, animationDelay: `${i * 50}ms` }} /></span>
            <span className="tabular w-[72px] text-right font-medium text-slate-800">{b.display}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Done({ text, to, label }: { text: string; to?: string; label?: string }) {
  return <div className="flex w-full flex-wrap items-center gap-2 text-[12.5px]" data-testid="data-done"><CheckCircle2 size={15} className="text-emerald-600" /><span className="font-medium text-emerald-700">{text}</span>{to && <Link to={to} className="ml-auto inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">{label}<ArrowRight size={12} /></Link>}</div>;
}
const Replaced = () => <div className="flex items-center gap-2 text-[12.5px] text-slate-500" data-testid="data-replaced"><ArrowDown size={14} /> Updated with your answers – see the card below.</div>;
const Cancelled = () => <div className="flex items-center gap-2 text-[12.5px] text-slate-500" data-testid="data-cancelled"><X size={14} /> Cancelled – nothing was changed.</div>;

function useCommit(msgId: number, idx: number) {
  const { update, toast } = useStore();
  return (r: Result, status: 'saved' | 'cancelled') => {
    let msg = '';
    update((d) => {
      const m = d.chat.find((x) => x.id === msgId); const b = m?.resp?.blocks[idx];
      if (b && b.type === 'data') b.r = { ...r, status } as Result;
      if (status === 'saved') msg = apply(d, r);
    });
    if (status === 'saved') setTimeout(() => toast(msg || 'Saved'), 0);
  };
}
const Primary = ({ children, onClick, disabled, testid }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; testid: string }) => (
  <button data-testid={testid} disabled={disabled} onClick={onClick} className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold disabled:opacity-50"><CheckCircle2 size={14} />{children}</button>
);
const Ghost = ({ children, onClick, testid }: { children: React.ReactNode; onClick: () => void; testid: string }) => (
  <button data-testid={testid} onClick={onClick} className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100">{children}</button>
);

function AddSupplier({ r, msgId, idx }: { r: Extract<Result, { kind: 'add_supplier' }>; msgId: number; idx: number }) {
  const commit = useCommit(msgId, idx);
  const [c, setC] = useState(r.contact);
  const miss = missingFields(c);
  const pending = r.status === 'pending';
  const F = ({ k, label, ph, wide }: { k: 'supplier' | 'person' | 'phone' | 'email' | 'city' | 'supplies' | 'gstin' | 'terms'; label: string; ph?: string; wide?: boolean }) => {
    const v = String(c[k] || ''); const bad = k === 'gstin' && v && !validGstin(v); const isMiss = !v && (k === 'supplier' || k === 'person' || k === 'gstin' || k === 'city' || k === 'supplies' || ((k === 'phone' || k === 'email') && !c.phone && !c.email));
    return (
      <label className={cx('block rounded-xl border px-3 py-1.5 transition focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10', wide && 'sm:col-span-2', isMiss ? 'border-amber-200 bg-amber-50/50' : bad ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white')}>
        <span className="flex items-center justify-between text-2xs font-medium text-slate-400">{label}{isMiss && <span className="font-semibold text-amber-600">Missing</span>}{bad && <span className="font-semibold text-rose-600">Check format</span>}</span>
        {pending ? <input data-field={k} defaultValue={v} placeholder={ph} onBlur={(e) => setC((x) => ({ ...x, [k]: k === 'phone' && e.target.value.replace(/\D/g, '').length >= 10 ? maskPhone(e.target.value) : k === 'gstin' ? e.target.value.toUpperCase().trim() : e.target.value }))}
          className="w-full bg-transparent text-[13.5px] text-slate-900 outline-none placeholder:text-slate-300" />
          : <div className="truncate text-[13.5px] text-slate-900">{v || '—'}</div>}
      </label>
    );
  };
  return (
    <Shell r={r} footer={r.status === 'saved' ? <Done text={`${c.supplier} saved to Supplier contacts`} to="/suppliers" label="View" /> : r.status === 'replaced' ? <Replaced /> : r.status === 'cancelled' ? <Cancelled /> : <>
      <Primary testid="data-confirm" disabled={!c.supplier.trim()} onClick={() => commit({ ...r, contact: c }, 'saved')}>Save supplier</Primary>
      <Ghost testid="data-cancel" onClick={() => commit(r, 'cancelled')}>Cancel</Ghost>
      <span className="ml-auto text-2xs text-slate-400">{miss.length ? `${miss.length} missing · you can add them later` : 'All set'}</span>
    </>}>
      {r.dupOf && <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800"><AlertTriangle size={14} /> A contact with this name already exists.</div>}
      <div className="grid gap-2 sm:grid-cols-2" data-testid="supplier-form">
        <F k="supplier" label="Supplier" ph="Company name" /><F k="person" label="Contact person" ph="Who to ask for" />
        <F k="phone" label="Phone (stored masked)" ph="10-digit mobile" /><F k="email" label="Email" ph="optional" />
        <F k="city" label="City / area" ph="e.g. Jeedimetla" /><F k="gstin" label="GSTIN" ph="15 characters, needed for POs" />
        <F k="supplies" label="What they supply" ph="e.g. MS sheet, pipes" wide /><F k="terms" label="Payment terms" ph="Net 30" />
      </div>
      {c.skus.length > 0 && <div className="text-[12px] text-slate-500">Will be matched for: {c.skus.map((x) => <span key={x} className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">{x}</span>)}</div>}
    </Shell>
  );
}


function AddPerson({ r, msgId, idx }: { r: Extract<Result, { kind: 'add_person' }>; msgId: number; idx: number }) {
  const commit = useCommit(msgId, idx);
  const [p, setP] = useState<NewPerson>(r.person);
  const pending = r.status === 'pending';
  const miss = personMissing(p);
  const F = ({ k, label, ph, req, type }: { k: keyof NewPerson; label: string; ph?: string; req?: boolean; type?: string }) => {
    const v = String(p[k] || ''); const isMiss = req && !v;
    return (
      <label className={cx('block rounded-xl border px-3 py-1.5 transition focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10', isMiss ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-white')}>
        <span className="flex items-center justify-between text-2xs font-medium text-slate-400">{label}{isMiss ? <span className="font-semibold text-amber-600">Needed</span> : !req && !v && pending ? <span className="text-slate-300">Optional</span> : null}</span>
        {pending ? <input data-field={k} type={type} defaultValue={v} placeholder={ph} onBlur={(e) => setP((x) => ({ ...x, [k]: e.target.value.trim() }))} className="w-full bg-transparent text-[13.5px] text-slate-900 outline-none placeholder:text-slate-300" />
          : <div className="truncate text-[13.5px] text-slate-900">{v || '—'}</div>}
      </label>
    );
  };
  const initials = (p.name || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  return (
    <Shell r={r} footer={r.status === 'saved' ? <Done text={`${p.name} added to People & HR · ${p.id}`} to="/people" label="Open People & HR" /> : r.status === 'replaced' ? <Replaced /> : r.status === 'cancelled' ? <Cancelled /> : <>
      <Primary testid="data-confirm" disabled={!p.name.trim()} onClick={() => commit({ ...r, person: { ...p, role: p.role || 'Team member' } }, 'saved')}>Add to People & HR</Primary>
      <Ghost testid="data-cancel" onClick={() => commit(r, 'cancelled')}>Cancel</Ghost>
      <span className="ml-auto text-2xs text-slate-400">{miss.length ? `${miss.join(' & ')} needed · or reply in chat` : 'Optional fields can stay blank'}</span>
    </>}>
      {r.dupOf && <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800"><AlertTriangle size={14} /> Someone with this name is already in People & HR.</div>}
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-rose-50 to-violet-50 px-3 py-2.5" data-testid="person-head">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[13px] font-semibold text-rose-600 shadow-sm">{initials}</span>
        <div className="min-w-0"><div className="truncate text-[14px] font-semibold text-slate-900">{p.name || 'New team member'}</div><div className="truncate text-[12px] text-slate-500">{[p.role || 'Role not set', p.team, p.type].filter(Boolean).join(' · ')}</div></div>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-2xs font-medium text-slate-500">{p.id}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2" data-testid="person-form">
        <F k="name" label="Full name" ph="e.g. Saad Ansari" req /><F k="role" label="Role" ph="e.g. Co-founder, Accountant" req />
        <F k="team" label="Team" ph="e.g. Management, Sales" /><F k="type" label="Employment type" ph="Full time / Contract / Intern" />
        <F k="start" label="Start date" ph="YYYY-MM-DD" /><F k="manager" label="Reports to" ph="optional" />
        <F k="pay" label="Compensation" ph="optional, e.g. ₹60,000 / month" />
      </div>
    </Shell>
  );
}

function Receive({ r, msgId, idx }: { r: Extract<Result, { kind: 'receive' }>; msgId: number; idx: number }) {
  const commit = useCommit(msgId, idx);
  const pct = Math.min(100, (r.before / Math.max(r.after, 1)) * 100);
  return (
    <Shell r={r} footer={r.status === 'saved' ? <Done text={`Stock updated · purchase logged against ${r.supplier}`} to={`/inventory/${r.sku}`} label="Open item" /> : r.status === 'cancelled' ? <Cancelled /> : <>
      <Primary testid="data-confirm" onClick={() => commit(r, 'saved')}>Update stock</Primary><Ghost testid="data-cancel" onClick={() => commit(r, 'cancelled')}>Cancel</Ghost>
    </>}>
      <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between text-2xs font-medium text-slate-400"><span>{r.sku} · stock on hand</span><span>{r.stockUnit}</span></div>
          <div className="mt-1 flex items-baseline gap-2 tabular"><span className="text-[15px] text-slate-400 line-through decoration-slate-300">{r.before}</span><ArrowRight size={14} className="text-slate-400" /><span className="text-[22px] font-semibold text-emerald-600">{r.after}</span><span className="text-[12px] font-medium text-emerald-600">+{r.addQty}</span></div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200/70"><span className="h-full bg-slate-400" style={{ width: `${pct}%` }} /><span className="grow-bar h-full bg-emerald-500" style={{ width: `${100 - pct}%` }} /></div>
          {r.conv && <div className="mt-2 text-2xs text-slate-500">{r.conv}</div>}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl border border-slate-100 p-3 text-[12.5px]">
          <dt className="text-slate-400">Supplier</dt><dd className="truncate text-right font-medium text-slate-800">{r.supplier}</dd>
          <dt className="text-slate-400">Quantity</dt><dd className="text-right tabular text-slate-800">{r.qty.toLocaleString('en-IN')} {r.unit}</dd>
          <dt className="text-slate-400">Rate</dt><dd className="text-right tabular text-slate-800">{r.rate ? `${inr(r.rate)}/${r.rateUnit}` : '—'}</dd>
          <dt className="text-slate-400">Purchase value</dt><dd className="text-right tabular font-semibold text-slate-900">{r.amount ? inr(r.amount) : '—'}</dd>
        </dl>
      </div>
      {r.priceNote && <div className={cx('flex items-start gap-2 rounded-lg px-3 py-2 text-[12.5px]', r.priceTone === 'red' ? 'bg-rose-50 text-rose-800' : r.priceTone === 'green' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')} data-testid="price-note"><Lightbulb size={14} className="mt-0.5 shrink-0" />{r.priceNote}</div>}
    </Shell>
  );
}

function Update({ r, msgId, idx }: { r: Extract<Result, { kind: 'update' }>; msgId: number; idx: number }) {
  const commit = useCommit(msgId, idx);
  const to = r.target.type === 'contact' ? '/suppliers' : r.target.type === 'invoice' ? `/finance/${r.target.id}` : r.target.type === 'bill' ? '/finance?tab=Payables' : '/procurement?tab=Purchase%20orders';
  return (
    <Shell r={r} footer={r.status === 'saved' ? <Done text="Change saved" to={to} label="Open record" /> : r.status === 'cancelled' ? <Cancelled /> : <>
      <Primary testid="data-confirm" onClick={() => commit(r, 'saved')}>Apply change</Primary><Ghost testid="data-cancel" onClick={() => commit(r, 'cancelled')}>Cancel</Ghost>
    </>}>
      <div className="overflow-hidden rounded-xl border border-slate-200/80" data-testid="diff">
        <div className="bg-slate-50/80 px-3 py-1.5 text-[12px] font-semibold text-slate-700">{r.target.label}</div>
        {r.diffs.map((d) => (
          <div key={d.label} className="grid grid-cols-[110px_1fr] items-center gap-2 border-t border-slate-100 px-3 py-2 text-[13px] sm:grid-cols-[150px_1fr_auto_1fr]">
            <span className="text-2xs font-medium uppercase tracking-wide text-slate-400">{d.label}</span>
            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-rose-700 line-through decoration-rose-300 sm:no-underline" data-before>{d.before}</span>
            <ArrowRight size={13} className="hidden text-slate-400 sm:block" />
            <span className="col-start-2 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 sm:col-start-auto" data-after>{d.after}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

const DOT = { red: 'bg-rose-500', amber: 'bg-amber-500', green: 'bg-emerald-500', blue: 'bg-brand-500' } as const;
const HEX = { red: '#f43f5e', amber: '#f59e0b', green: '#10b981', blue: '#6366f1' } as const;
function Line({ bars, title }: { bars: Bar[]; title: string }) {
  const W = 560, Hh = 120, max = Math.max(...bars.map((b) => b.value), 1), min = Math.min(...bars.map((b) => b.value), 0) * 0.9;
  const pts = bars.map((b, i) => [16 + (i * (W - 32)) / Math.max(1, bars.length - 1), Hh - 18 - ((b.value - min) / (max - min || 1)) * (Hh - 36)] as const);
  return (
    <div className="rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-3" data-testid="data-chart" data-chart="line" role="img" aria-label={`${title}: ${bars.map((b) => `${b.label} ${b.display}`).join(', ')}`}>
      <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <svg viewBox={`0 0 ${W} ${Hh}`} className="h-28 w-full">
        <defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6366f1" stopOpacity=".25" /><stop offset="1" stopColor="#6366f1" stopOpacity="0" /></linearGradient></defs>
        <path d={`M${pts[0][0]},${Hh - 18} ${pts.map((p) => `L${p[0]},${p[1]}`).join(' ')} L${pts[pts.length - 1][0]},${Hh - 18}Z`} fill="url(#lg)" />
        <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke="#6366f1" strokeWidth="2" /><text x={p[0]} y={Hh - 3} textAnchor="middle" fontSize="11" fill="#94a3b8">{bars[i].label}</text>{(i === pts.length - 1 || i === 0) && <text x={p[0]} y={p[1] - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="#334155">{bars[i].display}</text>}</g>)}
      </svg>
    </div>
  );
}
function Donut({ bars, title }: { bars: Bar[]; title: string }) {
  const tot = bars.reduce((a, b) => a + b.value, 0) || 1; let acc = 0; const R = 42, L = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-3" data-testid="data-chart" data-chart="donut" role="img" aria-label={`${title}: ${bars.map((b) => `${b.label} ${b.display}`).join(', ')}`}>
      <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90">{bars.map((b, i) => { const len = (b.value / tot) * L; const el = <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={HEX[b.tone || 'blue']} strokeWidth="13" strokeDasharray={`${len} ${L - len}`} strokeDashoffset={-acc} />; acc += len; return el; })}</svg>
      <div className="min-w-0 flex-1"><div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
        <div className="space-y-1">{bars.map((b) => <div key={b.label} className="flex items-center gap-2 text-[12px]"><span className={cx('h-2 w-2 rounded-full', DOT[b.tone || 'blue'])} /><span className="truncate text-slate-600">{b.label}</span><span className="tabular ml-auto font-medium text-slate-800">{b.display}</span><span className="tabular w-9 text-right text-2xs text-slate-400">{Math.round((b.value / tot) * 100)}%</span></div>)}</div>
      </div>
    </div>
  );
}
function Items({ items }: { items: NonNullable<Extract<Result, { kind: 'view' }>['items']> }) {
  const nav = useNavigate();
  return <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100" data-testid="data-items">{items.map((x, i) => (
    <div key={i} onClick={() => x.to && nav(x.to)} className={cx('flex items-center gap-3 px-3 py-2 text-[13px]', x.to && 'cursor-pointer hover:bg-slate-50')}>
      {x.tone && <span className={cx('h-2 w-2 shrink-0 rounded-full', DOT[x.tone])} />}
      <div className="min-w-0 flex-1"><div className={cx('truncate', x.tone ? 'font-medium text-slate-900' : 'text-slate-500')}>{x.label}</div>{x.sub && <div className="truncate text-2xs text-slate-400">{x.sub}</div>}</div>
      {x.value && <span className={cx('shrink-0 text-right', x.tone ? 'tabular text-[12.5px] font-medium text-slate-700' : 'max-w-[60%] truncate text-slate-800')}>{x.value}</span>}
      {x.to && <ChevronRight size={14} className="shrink-0 text-slate-300" />}
    </div>))}</div>;
}
function ViewCard({ r }: { r: Extract<Result, { kind: 'view' }> }) {
  return (
    <Shell r={r} footer={r.actions.length ? <Actions acts={r.actions} /> : undefined}>
      {r.kpis && r.kpis.length > 0 && <Kpis items={r.kpis} />}
      {r.charts?.map((c, i) => c.type === 'line' ? <Line key={i} bars={c.bars} title={c.title} /> : c.type === 'donut' ? <Donut key={i} bars={c.bars} title={c.title} /> : <Bars key={i} bars={c.bars} title={c.title} />)}
      {r.callout && <div className="flex items-start gap-2 rounded-xl bg-gradient-to-r from-brand-50 to-violet-50 px-3 py-2.5 text-[13px] text-slate-800" data-testid="suggestion"><Lightbulb size={15} className="mt-0.5 shrink-0 text-brand-600" /><span>{r.callout}</span></div>}
      {r.items && r.items.length > 0 && <Items items={r.items} />}
      {r.tables?.map((t, i) => <div key={i}>{t.title && <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-slate-400">{t.title}</div>}<SortTable cols={t.cols} rows={t.rows} /></div>)}
      {r.note && <p className="text-2xs text-slate-400">{r.note}</p>}
    </Shell>
  );
}

export function DataView({ r, msgId, idx }: { r: Result; msgId: number; idx: number }) {
  if (r.kind === 'add_person') return <AddPerson r={r} msgId={msgId} idx={idx} />;
  if (r.kind === 'add_supplier') return <AddSupplier r={r} msgId={msgId} idx={idx} />;
  if (r.kind === 'receive') return <Receive r={r} msgId={msgId} idx={idx} />;
  if (r.kind === 'update') return <Update r={r} msgId={msgId} idx={idx} />;
  if (r.kind === 'view') return <ViewCard r={r} />;
  if (r.kind === 'notfound') return <Shell r={r} footer={r.actions.length ? <Actions acts={r.actions} /> : undefined}>{r.detail && <p className="text-[13px] text-slate-600">{r.detail}</p>}</Shell>;
  if (r.kind === 'table') return <Shell r={r} footer={<Actions acts={r.actions} />}>{r.kpis && <Kpis items={r.kpis} />}<SortTable cols={r.cols} rows={r.rows} empty={r.empty} /></Shell>;
  if (r.kind === 'record') return (
    <Shell r={r} footer={<Actions acts={r.actions} />}>
      <div className="text-[12.5px] text-slate-500">{r.subtitle}</div>
      <Kpis items={r.kpis} />
      {r.sections.map((s) => <div key={s.title}><div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-slate-400">{s.title}</div><SortTable cols={s.cols} rows={s.rows} /></div>)}
    </Shell>
  );
  return (
    <Shell r={r} footer={<Actions acts={r.actions} />}>
      {r.bars.length > 0 && <Bars bars={r.bars} title={r.chartTitle} />}
      {r.suggestion && <div className="flex items-start gap-2 rounded-xl bg-gradient-to-r from-brand-50 to-violet-50 px-3 py-2.5 text-[13px] text-slate-800 dark:from-white/5 dark:to-white/[.02]" data-testid="suggestion"><Lightbulb size={15} className="mt-0.5 shrink-0 text-brand-600" /><span><span className="font-semibold">Suggested: </span>{r.suggestion}</span></div>}
      <SortTable cols={r.cols} rows={r.rows} max={6} />
      <p className="text-2xs text-slate-400">{r.note}</p>
    </Shell>
  );
}
