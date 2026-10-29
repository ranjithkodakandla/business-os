/** Top menu bar: the 7 business-flow groups from lib/nav.ts as tabs with glossy mega-menus. Role-filtered; keyboard accessible. */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { useStore, type DemoState } from '../lib/store';
import { MODULES, GROUPS, GROUP_LABEL, GROUP_ICON, type Group } from '../lib/nav';
import { can, ROLES, ROLE_USER, roleOf, type Role } from '../lib/rbac';
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
      <MobileMenu />
      <nav aria-label="Main navigation" data-testid="topnav" className="no-scrollbar hidden lg:flex min-w-0 items-center gap-0.5 overflow-x-auto">
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

/** Below lg: hamburger + slide-out drawer with the same role-filtered groups, plus View-as, language and quick links. */
function MobileMenu() {
  const { s, update } = useStore(); const loc = useLocation(); const nav = useNavigate(); const groups = useNavGroups();
  const [open, setOpen] = useState(false);
  const [exp, setExp] = useState<Group | null>(null);
  const isOn = (to: string) => to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to);
  useEffect(() => { setOpen(false); }, [loc.pathname, loc.search]);
  useEffect(() => { const t = () => setOpen((o) => !o); const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); window.addEventListener('toggle-nav', t); window.addEventListener('keydown', k); return () => { window.removeEventListener('toggle-nav', t); window.removeEventListener('keydown', k); }; }, []);
  useEffect(() => { if (open) setExp(groups.find(([, ms]) => ms.some((m) => isOn(m.to)))?.[0] ?? null); document.body.style.overflow = open ? 'hidden' : ''; }, [open]);
  return (<>
    <button data-testid="mobile-menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-700 hover:bg-white/80 lg:hidden"><Menu size={21} /></button>
    {open && createPortal(<div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="fly-backdrop absolute inset-0 bg-slate-900/35 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <aside data-testid="mobile-drawer" className="drawer-in absolute inset-y-0 left-0 flex w-[min(340px,88vw)] flex-col bg-white/95 shadow-2xl backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="leading-tight"><div className="text-[15px] font-semibold text-slate-900">Aarohan OS</div><div className="text-[12px] text-slate-500">{ROLE_USER[roleOf(s)].name} · {roleOf(s)}</div></div>
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2" data-testid="mobile-nav">
          {groups.map(([g, ms]) => { const Icon = GROUP_ICON[g]; const on = exp === g; const active = ms.some((m) => isOn(m.to)); const b = ms.reduce((a, m) => a + badgeOf(s, m.key), 0);
            return (<div key={g} className="mb-0.5">
              <button data-mgroup={g} aria-expanded={on} onClick={() => setExp(on ? null : g)} className={cx('flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3 text-left text-[14.5px] font-semibold', active ? 'text-brand-700' : 'text-slate-800', on && 'bg-slate-50')}>
                <span className="icon-gloss grid h-8 w-8 place-items-center rounded-lg"><Icon size={16} /></span><span className="flex-1">{GROUP_LABEL[g][s.lang as 'en']}</span>
                {b > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10.5px] font-semibold leading-5 text-white">{b}</span>}
                <ChevronDown size={16} className={cx('text-slate-400 transition-transform', on && 'rotate-180')} /></button>
              {on && <div className="ml-6 border-l border-slate-200 py-1 pl-3">{ms.map((m) => { const bb = badgeOf(s, m.key); return (
                <NavLink key={m.key} to={m.to} end={m.to === '/'} data-mnav={m.key} onClick={() => setOpen(false)} className={({ isActive }) => cx('flex min-h-[44px] items-center gap-2.5 rounded-lg px-2.5 text-[14px]', isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 active:bg-slate-100')}>
                  <m.icon size={16} className="shrink-0 opacity-70" /><span className="min-w-0 flex-1 truncate">{m.label[s.lang as 'en']}</span>{bb > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold leading-4 text-white">{bb}</span>}
                </NavLink>); })}</div>}
            </div>); })}
        </nav>
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          <label className="block text-[12px] font-medium text-slate-500">View as
            <select data-testid="mobile-role-switch" value={s.vendor ? 'Platform owner' : roleOf(s)} onChange={(e) => { const v = e.target.value; setOpen(false); if (v === 'Platform owner') { update((d) => { d.vendor = true; d.role = 'Owner'; }); nav('/platform'); return; } update((d) => { d.role = v as Role; d.vendor = false; d.tenant = 't-aarohan'; }); nav('/'); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] text-slate-800">{ROLES.map((r) => <option key={r}>{r}</option>)}<option>Platform owner</option></select></label>
          <div className="flex rounded-xl bg-slate-100 p-1 text-[13px] font-medium" data-testid="mobile-lang">{(['en', 'hi', 'te'] as const).map((l) => <button key={l} onClick={() => update((d) => { d.lang = l; })} className={cx('h-10 flex-1 rounded-lg', s.lang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>{l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'తెలుగు'}</button>)}</div>
        </div>
      </aside>
    </div>, document.body)}
  </>);
}
