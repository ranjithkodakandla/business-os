/** Top menu bar: the 7 business-flow groups from lib/nav.ts as tabs with glossy mega-menus. Role-filtered; keyboard accessible. */
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useStore, type DemoState } from '../lib/store';
import { MODULES, GROUPS, GROUP_LABEL, GROUP_ICON, type Group } from '../lib/nav';
import { can } from '../lib/rbac';
import { approvals, kpis, cash, isLow, available } from '../lib/domain';
import { lakh } from '../lib/format';
import { cx } from './ui';

export const useNavGroups = () => { const { s } = useStore(); return GROUPS.map((g) => [g, MODULES.filter((m) => m.group === g && can(s, m.key))] as const).filter(([, ms]) => ms.length); };

export const badgeOf = (s: DemoState, k: string) => k === 'approvals' ? approvals(s).length : k === 'inbox' ? s.p0.tickets.filter((x) => x.status !== 'Resolved').length : k === 'gst' ? s.p0.einv.filter((x) => x.irn !== 'Generated').length : k === 'attendance' ? s.p0.leaves.filter((l) => l.status === 'Pending').length : 0;

function Context({ g, s }: { g: Group; s: DemoState }) {
  const k = kpis(s); const c = cash(s);
  const P = (title: string, rows: [string, string][], cta: [string, string], tone = 'from-amber-50 to-orange-50/60 border-amber-200/70') => ({ title, rows, cta, tone });
  const low = s.skus.filter(isLow).slice(0, 3);
  const map: Record<Group, ReturnType<typeof P>> = {
    Home: P('Waiting on you', approvals(s).slice(0, 3).map((a) => [a.title.slice(0, 34), a.due || a.kind]), ['Open approvals', '/approvals'], 'from-indigo-50 to-violet-50/60 border-indigo-200/70'),
    Sell: P('Overdue', [[`${lakh(k.overdueAmt)}`, `${k.overdueCount} customers`], ['Orders at risk', String(k.atRisk)], ['Ready to dispatch', String(k.ready)]], ['Collections', '/collections'], 'from-rose-50 to-pink-50/60 border-rose-200/70'),
    Make: P('Shop floor today', [['OEE · Unit 1', '78%'], ['Work orders open', String(s.workOrders.length)], ['Job work late', 'DC-JW-0709']], ['Operations', '/operations']),
    Buy: P('⚠ Low stock', low.map((x) => [x.name.slice(0, 26), `${available(x)} ${x.unit}`]), ['Ask agent to source', '/sourcing/live']),
    People: P('Today', [['Present', `${k.present}/${k.employees}`], ['Leave pending', String(s.p0.leaves.filter((l) => l.status === 'Pending').length)], ['Pay run', s.p0.payrun.status]], ['Attendance', '/attendance'], 'from-sky-50 to-cyan-50/60 border-sky-200/70'),
    Money: P('Cash position', [['Bank + cash', lakh(c.bank)], ['Overdue', lakh(c.overdue)], ['Payables this week', lakh(c.payablesWeek)]], ['Finance', '/finance'], 'from-emerald-50 to-teal-50/60 border-emerald-200/70'),
    Admin: P('Recent changes', s.audit.slice(0, 3).map((a) => [a.action.slice(0, 30), a.at]), ['Audit log', '/audit'], 'from-slate-50 to-indigo-50/50 border-slate-200'),
  };
  const p = map[g]; const nav = useNavigate();
  return (
    <div className={cx('w-60 shrink-0 rounded-2xl border bg-gradient-to-br p-3.5', p.tone)} data-testid="menu-context">
      <div className="text-[12.5px] font-semibold text-slate-800">{p.title}</div>
      <div className="mt-2 space-y-1">{p.rows.map(([a, b], i) => <div key={i} className="flex justify-between gap-2 text-[12px]"><span className="truncate text-slate-600">{a}</span><b className="shrink-0 font-semibold text-slate-800">{b}</b></div>)}</div>
      <button onClick={() => nav(p.cta[1])} className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-brand-700 hover:underline">{p.cta[0]}<ArrowRight size={12} /></button>
    </div>
  );
}

export function TopNav() {
  const { s } = useStore(); const loc = useLocation(); const groups = useNavGroups();
  const [open, setOpen] = useState<Group | null>(null); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(null); }, [loc.pathname, loc.search]);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const isOn = (to: string) => to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'Escape') { setOpen(null); (e.currentTarget as HTMLElement).focus(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = (i + (e.key === 'ArrowRight' ? 1 : groups.length - 1)) % groups.length; ref.current?.querySelectorAll<HTMLElement>('[data-menu]')[n]?.focus(); if (open) setOpen(groups[n][0]); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(groups[i][0]); setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-testid=mega-menu] a')?.focus(), 30); }
  };
  return (
    <div ref={ref} className="relative flex min-w-0 items-center" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(null); }}>
      <nav aria-label="Main navigation" data-testid="topnav" className="no-scrollbar flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {groups.map(([g, ms], i) => {
          const Icon = GROUP_ICON[g]; const active = ms.some((m) => isOn(m.to)); const b = ms.reduce((a, m) => a + badgeOf(s, m.key), 0);
          return (
            <button key={g} data-menu={g} aria-haspopup="true" aria-expanded={open === g} onClick={() => setOpen(open === g ? null : g)} onKeyDown={(e) => onKey(e, i)}
              className={cx('relative flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-[13px] font-medium transition', active ? 'tab-active text-white' : open === g ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/80 hover:text-slate-900')}>
              <Icon size={15} strokeWidth={1.9} className="hidden xl:block" />{GROUP_LABEL[g][s.lang as 'en']}
              {b > 0 && <span className={cx('rounded-full px-1.5 text-[10px] font-semibold leading-4', active ? 'bg-white/25 text-white' : 'bg-rose-500 text-white')}>{b}</span>}
              <ChevronDown size={12} className={cx('opacity-50 transition-transform', open === g && 'rotate-180')} />
            </button>);
        })}
      </nav>
      {open && (() => { const ms = groups.find(([g]) => g === open)?.[1] || []; return (
        <div role="menu" data-testid="mega-menu" data-group={open} className="glass-pop menu-in fixed left-1/2 top-[60px] z-50 flex w-[min(860px,calc(100vw-24px))] -translate-x-1/2 gap-3 rounded-3xl p-3">
          <div className="grid flex-1 grid-cols-2 gap-1.5">
            {ms.map((m) => { const b = badgeOf(s, m.key); return (
              <NavLink key={m.key} to={m.to} end={m.to === '/'} data-nav={m.key} role="menuitem" onClick={() => setOpen(null)}
                className={({ isActive }) => cx('group flex items-start gap-3 rounded-2xl p-3 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-400', isActive ? 'bg-brand-50/80 ring-1 ring-brand-200' : 'hover:bg-white hover:shadow-[0_8px_24px_-12px_rgb(99_102_241/.35)]')}>
                <span className="icon-gloss grid h-9 w-9 shrink-0 place-items-center rounded-xl"><m.icon size={17} strokeWidth={1.9} /></span>
                <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-900">{m.label[s.lang as 'en']}{b > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold leading-4 text-white">{b}</span>}</span><span className="block truncate text-[12px] text-slate-500">{m.desc}</span></span>
              </NavLink>); })}
          </div>
          <Context g={open} s={s} />
        </div>); })()}
    </div>
  );
}
