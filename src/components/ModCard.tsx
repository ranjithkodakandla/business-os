import { Link } from 'react-router-dom';
import { Lock, CheckCircle2, XCircle, Sparkles, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStore } from '../lib/store';
import { moduleByKey } from '../lib/nav';
import { execCard, missing, canAct, type ModCard } from '../lib/modAgent';
import { roleOf, ROLE_USER } from '../lib/rbac';
import { t } from '../lib/i18n';
import type { Lang } from '../lib/i18n';
import { cx } from './ui';

const TONE = { green: 'text-emerald-700', amber: 'text-amber-700', red: 'text-rose-600', blue: 'text-brand-700' };
const PAL = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];
export function ModCardView({ c, msgId, idx }: { c: ModCard; msgId: number; idx: number }) {
  const { s, update, toast } = useStore();
  const lang = s.lang as Lang;
  const m = moduleByKey(c.module);
  const Icon = c.kind === 'denied' ? Lock : m?.icon || Sparkles;
  const patch = (fn: (x: ModCard) => void) => update((d) => { const b = d.chat.find((x) => x.id === msgId)?.resp?.blocks[idx]; if (b && b.type === 'mod') fn(b.c); });
  const miss = missing(c);
  const confirm = () => {
    let res = '';
    update((d) => {
      const b = d.chat.find((x) => x.id === msgId)?.resp?.blocks[idx]; if (!b || b.type !== 'mod') return;
      const r = execCard(b.c, d); b.c.status = 'done'; b.c.result = res = r.result;
      // AI write: audited as "Business OS agent on behalf of <user>" with before/after
      d.audit.unshift({ id: 'AU-' + Date.now().toString(36), ts: new Date().toISOString(), at: new Date().toTimeString().slice(0, 5), who: `Business OS agent on behalf of ${ROLE_USER[roleOf(d)].name}`, role: roleOf(d), agent: true, module: c.module, record: r.record, action: c.headline.replace(/\.$/, ''), before: r.before, after: r.after || 'Done' });
    }, c.headline);
    void res;
    toast('Done – recorded in the audit log');
  };
  return (
    <div data-testid="mod-card" data-kind={c.kind} data-module={c.module} data-status={c.status || ''} className={cx('overflow-hidden rounded-2xl border bg-white shadow-card', c.kind === 'denied' ? 'border-amber-200' : 'border-slate-200/70')}>
      <div className={cx('flex items-start gap-3 px-4 py-3', c.kind === 'denied' ? 'bg-amber-50/70' : 'bg-gradient-to-r from-brand-50/70 to-violet-50/40')}>
        <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', c.kind === 'denied' ? 'bg-amber-100 text-amber-700' : 'bg-grad text-white shadow-glow')}><Icon size={17} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-2xs font-semibold uppercase tracking-wider text-slate-500">{c.kind === 'denied' ? `${roleOf(s)} role · ${m?.label[lang] || c.module}` : m?.label[lang]}{c.kind === 'action' && ' · needs your OK'}</div>
          <div data-testid="mod-headline" className="text-[14px] font-semibold text-slate-900">{c.kind === 'denied' ? t(lang, 'restricted') : c.headline}</div>
          {c.sub && <div className="mt-0.5 text-[12.5px] text-slate-600">{c.sub}</div>}
        </div>
      </div>
      {c.kpis && <div className="grid grid-cols-2 gap-2 px-4 pt-3 sm:grid-cols-4">{c.kpis.map((k) => <div key={k.label} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"><div className="text-2xs text-slate-500">{k.label}</div><div className={cx('text-[17px] font-semibold tabular', k.tone ? TONE[k.tone] : 'text-slate-900')}>{k.value}</div></div>)}</div>}
      {c.chart && <div className="h-40 px-2 pt-3"><ResponsiveContainer><BarChart data={c.chart}><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={50} /><Tooltip /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{c.chart.map((_, i) => <Cell key={i} fill={PAL[i % 7]} />)}</Bar></BarChart></ResponsiveContainer></div>}
      {c.table && <div className="mx-4 mt-3 overflow-x-auto rounded-xl border border-slate-100"><table className="w-full text-[12.5px]"><thead className="bg-slate-50 text-2xs uppercase tracking-wide text-slate-500"><tr>{c.table.cols.map((h) => <th key={h} className="px-3 py-1.5 text-left font-semibold">{h}</th>)}</tr></thead><tbody>{c.table.rows.map((r, i) => <tr key={i} className="border-t border-slate-100">{r.map((v, j) => <td key={j} className={cx('px-3 py-1.5', j === 0 ? 'font-medium text-slate-800' : 'text-slate-600', v === '✓' && 'text-emerald-600 font-semibold')}>{v}</td>)}</tr>)}</tbody></table></div>}
      {c.kind === 'action' && c.fields && c.fields.length > 0 && (
        <div className="grid gap-2 px-4 pt-3 sm:grid-cols-3">{c.fields.map((f, i) => (
          <label key={f.k} className="text-2xs font-medium text-slate-500">{f.label}{f.required ? <span className="text-rose-500"> *</span> : <span className="text-slate-400"> · optional</span>}
            {f.options ? <select disabled={c.status !== 'pending'} value={f.value} data-field={f.k} onChange={(e) => patch((x) => { x.fields![i].value = e.target.value; })} className={cx('mt-0.5 block w-full rounded-lg border px-2 py-1.5 text-[13px] text-slate-800', f.required && !f.value ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200')}><option value="">Choose…</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
              : <input disabled={c.status !== 'pending'} value={f.value} data-field={f.k} onChange={(e) => patch((x) => { x.fields![i].value = e.target.value; })} className={cx('mt-0.5 block w-full rounded-lg border px-2 py-1.5 text-[13px] text-slate-800', f.required && !f.value ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200')} />}
          </label>))}</div>)}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {c.kind === 'action' && c.status === 'pending' && (canAct(s, c) ? <>
          <button data-testid="mod-confirm" disabled={miss.length > 0} onClick={confirm} className="rounded-lg bg-grad px-3 py-1.5 text-[13px] font-medium text-white shadow-glow disabled:opacity-50">{miss.length ? `Fill ${miss.map((x) => x.label.replace(/ \(.*\)/, '')).join(', ')}` : 'Confirm'}</button>
          <button data-testid="mod-cancel" onClick={() => patch((x) => { x.status = 'cancelled'; })} className="rounded-lg px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100">{t(lang, 'cancel')}</button>
        </> : <span className="text-[12.5px] text-amber-700"><Lock size={12} className="mr-1 inline" />Your role ({roleOf(s)}) can’t do this – ask an admin.</span>)}
        {c.status === 'done' && <span data-testid="mod-done" className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-700"><CheckCircle2 size={15} />{c.result}</span>}
        {c.status === 'cancelled' && <span className="flex items-center gap-1.5 text-[13px] text-slate-500"><XCircle size={15} />Cancelled – nothing changed.</span>}
        {c.status === 'replaced' && <span className="text-[12.5px] text-slate-400">Updated below ↓</span>}
        {c.link && c.kind !== 'denied' && <Link to={c.link.to} className="ml-auto flex items-center gap-1 text-[12.5px] font-medium text-brand-700 hover:underline">{c.link.label}<ArrowRight size={13} /></Link>}
      </div>
    </div>
  );
}
