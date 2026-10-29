import React, { useMemo, useRef, useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Inbox, Handshake, ClipboardList, ShoppingCart, Boxes, Factory, Users, IndianRupee, BarChart3, Bell, ChevronDown, RotateCcw, Search,
  Building2, Truck, Bot, Plug, Sparkles, CheckCircle2, MessageCircle, Mail, Landmark, Send, LogOut, Contact, Moon, Sun, Menu, X, ChevronLeft, ChevronRight, LayoutGrid,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Lang } from '../lib/i18n';
import { MODULES, GROUPS as NAV_GROUPS, GROUP_LABEL, type Group } from '../lib/nav';
import { can, ROLES, ROLE_USER, roleOf, type Role } from '../lib/rbac';
const NAV_LABELS: Record<string, Record<Lang, string>> = Object.fromEntries(MODULES.map((m) => [m.key, m.label]));
import { approvals, customerById, supplierById } from '../lib/domain';
import { company, jobWorkers } from '../lib/data';
import { Badge, Button, Modal, cx, Fields, Field } from './ui';
import { inr } from '../lib/format';
import { GuidePanel } from './Guide';

const NAV_SUB: Record<string, [string, string][]> = {
  suppliers: [['Live sourcing', '/sourcing/live']],
  procurement: [['Purchase orders', '/procurement?tab=Purchase%20orders']],
  operations: [['Work orders', '/operations?tab=Work%20orders'], ['Dispatch plan', '/operations?tab=Dispatch%20plan']],
  people: [['Attendance', '/people?tab=Attendance']],
  finance: [['Receivables', '/finance?tab=Receivables'], ['Collections', '/collections']],
  jobwork: [['Material out', '/job-work?tab=Material%20out']],
};
const NAV_DESC: Record<string, string> = Object.fromEntries(MODULES.map((m) => [m.key, m.desc]));
type NavEntry = (typeof MODULES)[number];
const ALL = MODULES;
/** Groups visible to the current role (RBAC drives the nav). */
const useGroups = () => { const { s } = useStore(); return NAV_GROUPS.map((g) => [g, ALL.filter((m) => m.group === g && can(s, m.key)).map((m) => m.key)] as [Group, string[]]).filter(([, k]) => k.length); };
const ALL_NAV = ALL;

export function LogoMark({ size = 32 }: { size?: number }) {
  const gid = 'bwg' + React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0 drop-shadow-[0_4px_12px_rgba(99,102,241,.45)]">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366f1" /><stop offset=".55" stopColor="#8b5cf6" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
      <path d="M9 10.5h8.2a3.6 3.6 0 0 1 0 7.2H9z" fill="#fff" opacity=".95" />
      <path d="M9 17.7h9.6a3.9 3.9 0 0 1 0 7.8H9z" fill="#fff" opacity=".7" />
      <circle cx="23.5" cy="9.5" r="2.2" fill="#fff" />
    </svg>
  );
}


function useDesktop() {
  const q = '(min-width: 1024px)';
  const [d, setD] = useState(() => window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q); const h = () => setD(m.matches); m.addEventListener('change', h); return () => m.removeEventListener('change', h); }, []);
  return d;
}
const isTyping = (t: EventTarget | null) => { const e = t as HTMLElement | null; return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' || e.isContentEditable); };
const SHORTCUT = /Mac/.test(navigator.platform) ? '⌘B' : 'Ctrl+B';

function ModuleFlyout({ onClose, returnTo }: { onClose: () => void; returnTo: React.RefObject<HTMLButtonElement> }) {
  const { s } = useStore();
  const lang = s.lang as Lang;
  const nAp = approvals(s).length;
  const loc = useLocation();
  const [q, setQ] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = () => { onClose(); setTimeout(() => returnTo.current?.focus(), 0); };
  useEffect(() => { input.current?.focus(); }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = Array.from(panel.current!.querySelectorAll<HTMLElement>('[data-fly-item]'));
      const i = items.indexOf(document.activeElement as HTMLElement);
      const n = e.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
      items[n]?.focus(); e.preventDefault();
    }
    if (e.key === 'Enter' && document.activeElement === input.current) { (panel.current!.querySelector<HTMLElement>('[data-fly-item]'))?.click(); }
    if (e.key === 'Tab') {
      const f = Array.from(panel.current!.querySelectorAll<HTMLElement>('a[href],button,input'));
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { f[0].focus(); e.preventDefault(); }
    }
  };
  const match = (k: string) => { const t = (NAV_LABELS[k][lang] + ' ' + NAV_DESC[k] + ' ' + (NAV_SUB[k] || []).map((x) => x[0]).join(' ')).toLowerCase(); return t.includes(q.trim().toLowerCase()); };
  const groups = useGroups().map(([g, ks]) => [GROUP_LABEL[g][lang], ks.filter(match)] as const).filter(([, ks]) => ks.length);
  return (
    <>
      <div className="fixed inset-0 left-[68px] z-40 bg-[#05070f]/25 backdrop-blur-[2px] fly-backdrop" onClick={close} data-testid="flyout-backdrop" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label="All modules" data-testid="module-flyout" onKeyDown={onKey}
        className="fly-panel fixed bottom-0 left-[68px] top-0 z-50 flex w-[360px] flex-col border-r border-white/[.06] bg-[#0d1328] text-white shadow-[24px_0_60px_-20px_rgba(0,0,0,.6)] dark:bg-[#080c1a]">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <div><div className="text-[15px] font-semibold tracking-tight">All modules</div><div className="text-2xs text-[#8b94b8]">Jump anywhere · ↑↓ to move · Esc to close</div></div>
          <button onClick={close} aria-label="Close modules" data-testid="flyout-close" className="grid h-8 w-8 place-items-center rounded-lg text-[#9aa4c4] hover:bg-white/[.06] hover:text-white"><X size={16} /></button>
        </div>
        <label className="mx-5 mb-2 flex h-9 items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.04] px-3 focus-within:border-[#818cf8]/60">
          <Search size={14} className="text-[#8b94b8]" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a module…" data-testid="flyout-search" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-[#6b7499]" />
        </label>
        <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-5">
          {groups.map(([g, ks]) => (
            <div key={g} className="mt-3">
              <div className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[.12em] text-[#5d6890]">{g}</div>
              {ks.map((k) => {
                const n = ALL_NAV.find((x) => x.key === k)!;
                const active = n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to);
                return (
                  <div key={k} className={cx('rounded-xl transition', active && 'bg-white/[.06]')}>
                    <Link to={n.to} onClick={onClose} data-fly-item data-fly={k} className="group flex items-center gap-3 rounded-xl px-2 py-2 outline-none hover:bg-white/[.05] focus-visible:bg-white/[.08] focus-visible:ring-1 focus-visible:ring-[#818cf8]/60">
                      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg', active ? 'bg-grad text-white shadow-glow' : 'bg-white/[.06] text-[#a5b4fc] group-hover:bg-white/[.1]')}><n.icon size={17} strokeWidth={1.9} /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{NAV_LABELS[k][lang]}</span><span className="block truncate text-2xs text-[#8b94b8]">{NAV_DESC[k]}</span></span>
                      {k === 'approvals' && nAp > 0 && <span className="rounded-full bg-grad px-1.5 text-2xs font-semibold leading-[18px]">{nAp}</span>}
                      <ChevronRight size={14} className="text-[#5d6890] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
                    </Link>
                    {NAV_SUB[k] && <div className="flex flex-wrap gap-1.5 pb-2 pl-[56px] pr-2">{NAV_SUB[k].map(([l, to]) => (
                      <Link key={to} to={to} onClick={onClose} data-fly-item className="rounded-full border border-white/[.08] px-2.5 py-0.5 text-2xs text-[#c7cde4] outline-none hover:border-white/20 hover:text-white focus-visible:ring-1 focus-visible:ring-[#818cf8]/60">{l}</Link>
                    ))}</div>}
                  </div>
                );
              })}
            </div>
          ))}
          {!groups.length && <div className="px-3 py-8 text-center text-[13px] text-[#8b94b8]">No module matches “{q}”.</div>}
        </div>
      </div>
    </>
  );
}

function Sidebar({ collapsed, mobile, onToggle, onClose, onFlyout, flyOpen, pillRef }: { collapsed: boolean; mobile: boolean; onToggle: () => void; onClose: () => void; onFlyout: () => void; flyOpen: boolean; pillRef: React.RefObject<HTMLButtonElement> }) {
  const { s, reset, openConfirm } = useStore();
  const lang = s.lang as Lang;
  const nApprovals = approvals(s).length;
  const loc = useLocation();
  const [tip, setTip] = useState<{ label: string; y: number } | null>(null);
  const tipOn = (label: string) => (e: React.SyntheticEvent<HTMLElement>) => { if (!collapsed) return; const r = e.currentTarget.getBoundingClientRect(); setTip({ label, y: r.top + r.height / 2 }); };
  const tipOff = () => setTip(null);
  const c = collapsed;
  const groups = useGroups();
  const [shut, setShut] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('bw-nav-groups') || '{}'); } catch { return {}; } });
  const flip = (g: string) => setShut((x) => { const n = { ...x, [g]: !x[g] }; try { localStorage.setItem('bw-nav-groups', JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const item = (n: NavEntry) => {
    const label = NAV_LABELS[n.key][lang];
    return (
      <NavLink key={n.key} to={n.to} end={n.to === '/'} data-nav={n.key} aria-label={c ? label + (n.key === 'approvals' && nApprovals ? `, ${nApprovals} waiting` : '') : undefined}
        onMouseEnter={tipOn(label + (n.key === 'approvals' && nApprovals ? ` · ${nApprovals} waiting` : ''))} onMouseLeave={tipOff} onFocus={tipOn(label)} onBlur={tipOff}
        className={({ isActive }) => cx('group relative flex h-9 items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg text-[13px] font-medium outline-none transition-all duration-200 focus-visible:ring-1 focus-visible:ring-[#818cf8]/70', c ? 'px-[14px]' : 'px-3', isActive ? 'bg-white/[.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]' : 'text-[#9aa4c4] hover:bg-white/[.05] hover:text-white')}>
        {({ isActive }) => <>
          {isActive && <span className={cx('absolute top-1.5 h-6 w-1 rounded-r-full bg-grad', c ? 'left-0' : '-left-0')} />}
          <span className="relative shrink-0">
            <n.icon size={c ? 18 : 16} strokeWidth={1.9} className={cx('transition-all', isActive ? 'text-[#a5b4fc]' : '')} />
            {c && n.key === 'approvals' && nApprovals > 0 && <span data-testid="rail-badge" className="absolute -right-2.5 -top-2 h-4 min-w-4 rounded-full bg-grad px-1 text-center text-[9.5px] font-semibold leading-4 text-white ring-2 ring-[#0b1022]">{nApprovals}</span>}
          </span>
          <span className={cx('flex-1 truncate transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')}>{label}</span>
          {!c && n.key === 'approvals' && nApprovals > 0 && <span className="rounded-full bg-grad px-1.5 text-2xs font-semibold leading-[18px] text-white">{nApprovals}</span>}
        </>}
      </NavLink>
    );
  };
  return (
    <aside className={cx('sidebar-rail group/rail relative flex h-full shrink-0 flex-col bg-[#0b1022] text-white dark:bg-[#060914]', c ? 'w-[68px]' : 'w-[240px]')} data-testid="sidebar" data-collapsed={c ? 'true' : 'false'} aria-label="Main navigation">
      <div className={cx('flex h-16 items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-200', c ? 'px-[18px]' : 'px-5')}>
        <LogoMark />
        <div className={cx('min-w-0 flex-1 leading-tight transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')}>
          <div className="text-[14px] font-semibold tracking-tight text-white">Business Workspace</div>
          <div className="text-2xs text-[#8b94b8]">AI operations for MSMEs</div>
        </div>
        {mobile && <button onClick={onClose} aria-label="Close menu" data-testid="drawer-close" className="grid h-8 w-8 place-items-center rounded-lg text-[#9aa4c4] hover:bg-white/[.06] hover:text-white"><X size={18} /></button>}
      </div>
      {!mobile && (
        <button onClick={onToggle} data-testid="rail-toggle" aria-expanded={!c} aria-controls="side-nav" aria-label={c ? 'Expand sidebar' : 'Collapse sidebar'} title={`${c ? 'Expand' : 'Collapse'} sidebar  ( [ or ${SHORTCUT} )`}
          className="absolute -right-3 top-5 z-10 grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md opacity-70 transition hover:scale-110 hover:text-brand-600 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand-400 group-hover/rail:opacity-100 dark:border-white/10 dark:bg-[#141a33] dark:text-slate-300">
          {c ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}
      <nav id="side-nav" className={cx('no-scrollbar flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden py-2 transition-all duration-200', c ? 'px-2.5' : 'px-2.5')}>
        {groups.map(([g, ks]) => (
          <div key={g} data-nav-group={g}>
            {g !== 'Overview' && (c ? <div className="mx-3 my-2 border-t border-white/[.06]" /> :
              <button onClick={() => flip(g)} aria-expanded={!shut[g]} className="flex w-full items-center justify-between px-3 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[.12em] text-[#5d6890] hover:text-[#9aa4c4]">
                {GROUP_LABEL[g][lang]}<ChevronDown size={12} className={cx('transition-transform', shut[g] && '-rotate-90')} />
              </button>)}
            {(c || !shut[g] || ks.some((k) => loc.pathname.startsWith(ALL.find((m) => m.key === k)!.to) && k !== 'home')) && ks.map((k) => item(ALL.find((m) => m.key === k)!))}
          </div>
        ))}
      </nav>
      {c ? (
        <div className="flex flex-col items-center gap-2 pb-4 pt-2">
          <button ref={pillRef} onClick={onFlyout} data-testid="all-modules" aria-haspopup="dialog" aria-expanded={flyOpen} onMouseEnter={tipOn('All modules')} onMouseLeave={tipOff} onFocus={tipOn('All modules')} onBlur={tipOff}
            className={cx('all-modules-pill flex w-9 flex-col items-center gap-2 rounded-full py-3 text-[10px] font-semibold uppercase tracking-[.18em] outline-none transition focus-visible:ring-2 focus-visible:ring-[#818cf8]', flyOpen ? 'bg-grad text-white shadow-glow' : 'bg-white/[.06] text-[#c7cde4] hover:bg-white/[.1] hover:text-white')}>
            <LayoutGrid size={15} />
            <span className="[writing-mode:vertical-rl] rotate-180">All modules</span>
          </button>
          <span className="mt-1 grid h-9 w-9 place-items-center rounded-lg" onMouseEnter={tipOn('6 agents online')} onMouseLeave={tipOff}><span className="live-dot text-emerald-400" /></span>
        </div>
      ) : (
        <div className="m-3 overflow-hidden whitespace-nowrap rounded-xl border border-white/[.06] bg-white/[.04] p-3">
          <div className="flex items-center gap-2 text-[12px] font-medium text-white"><span className="live-dot text-emerald-400" /> 6 agents online</div>
          <div className="mt-0.5 truncate text-2xs text-[#8b94b8]">Working on orders, stock, suppliers and cash</div>
          <button data-testid="reset-demo" onClick={() => openConfirm({ title: 'Reset demo data?', body: 'Restores every module to the original Aarohan Industries sample data and clears approvals, chat and agent tasks.', confirmLabel: 'Reset demo', tone: 'danger', onConfirm: reset })}
            className="mt-2.5 flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-white/[.06] text-[12px] text-[#c7cde4] transition hover:bg-white/[.1] hover:text-white">
            <RotateCcw size={13} /> Reset demo
          </button>
          {!mobile && <div className="mt-2 text-center text-[10.5px] text-[#5d6890]">Press <kbd className="rounded border border-white/10 px-1">[</kbd> to collapse</div>}
        </div>
      )}
      {c && tip && <div role="tooltip" data-testid="rail-tip" className="rail-tip pointer-events-none fixed left-[76px] z-[70] -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[12px] font-medium text-white shadow-lg dark:bg-slate-700" style={{ top: tip.y }}>{tip.label}</div>}
    </aside>
  );
}

function useTheme(): [boolean, () => void] {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => setDark((d) => { const n = !d; document.documentElement.classList.toggle('dark', n); try { localStorage.setItem('bw-theme', n ? 'dark' : 'light'); } catch { /* ignore */ } return n; });
  return [dark, toggle];
}

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/approvals', label: 'Approvals', icon: Inbox },
  { to: '/sourcing/live', label: 'Sourcing', icon: Sparkles, ai: true },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
];
function BottomNav() {
  const { s } = useStore();
  const n = approvals(s).length;
  return (
    <nav data-testid="bottom-nav" className="surface-glass fixed inset-x-0 bottom-0 z-40 flex h-[62px] items-stretch border-t border-slate-200/70 px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cx('relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition', isActive ? 'text-brand-600' : 'text-slate-500')}>
          {({ isActive }) => <>
            <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', isActive && (t.ai ? 'bg-grad text-white shadow-glow' : 'bg-brand-50'))}><t.icon size={18} strokeWidth={isActive ? 2.2 : 1.9} /></span>
            {t.label}
            {t.to === '/approvals' && n > 0 && <span className="absolute right-[calc(50%-20px)] top-1.5 h-4 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9.5px] font-semibold leading-4 text-white">{n}</span>}
          </>}
        </NavLink>
      ))}
      <button onClick={() => window.dispatchEvent(new Event('toggle-nav'))} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-slate-500">
        <span className="grid h-7 w-12 place-items-center"><Menu size={18} /></span>More
      </button>
    </nav>
  );
}

function GlobalSearch() {
  const { s } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const index = useMemo(() => [
    ...s.orders.map((o) => ({ type: 'Order', id: o.id, label: `${o.id} · ${customerById(s, o.customerId).name}`, to: `/orders/${o.id}` })),
    ...s.customers.map((c) => ({ type: 'Customer', id: c.id, label: c.name, to: `/sales/customer/${c.id}` })),
    ...s.invoices.map((i) => ({ type: 'Invoice', id: i.id, label: `${i.id} · ${customerById(s, i.customerId).name}`, to: `/finance/${i.id}` })),
    ...s.skus.map((k) => ({ type: 'Item', id: k.sku, label: `${k.sku} · ${k.name}`, to: `/inventory/${k.sku}` })),
    ...s.prs.map((p) => ({ type: 'Purchase request', id: p.id, label: `${p.id} · ${p.material}`, to: `/procurement/${p.id}` })),
    ...s.pos.map((p) => ({ type: 'Purchase order', id: p.id, label: `${p.id} · ${supplierById(p.supplierId).name}`, to: `/procurement?tab=Purchase%20orders` })),
    ...s.employees.map((e) => ({ type: 'Employee', id: e.id, label: `${e.name} · ${e.role}`, to: `/people/${e.id}` })),
    ...s.challans.map((c) => ({ type: 'Job work challan', id: c.id, label: `${c.id} · ${jobWorkers.find((j) => j.id === c.workerId)!.name}`, to: `/job-work?tab=Material%20out` })),
    ...s.workOrders.map((w) => ({ type: 'Work order', id: w.id, label: `${w.id} · ${w.op} (${w.order})`, to: `/operations?tab=Work%20orders` })),
  ], [s]);
  const res = q.trim().length < 2 ? [] : index.filter((r) => (r.label + ' ' + r.type).toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="relative">
      <label className="hidden h-9 w-[380px] items-center md:flex xl:w-[400px] lg:w-[300px] md:w-[220px] gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-3 shadow-sm transition focus-within:border-brand-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10">
        <Search size={14} className="text-slate-400" />
        <input data-testid="global-search" value={q} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)}
          placeholder="Search orders, customers, invoices, items, people…" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
        <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 text-2xs font-medium text-slate-400">⌘K</kbd>
      </label>
      {open && res.length > 0 && (
        <div className="absolute left-0 top-10 z-40 w-[460px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          {res.map((r) => (
            <button key={r.type + r.id} onMouseDown={() => { nav(r.to); setQ(''); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-slate-50">
              <span className="truncate text-slate-800">{r.label}</span><span className="ml-3 shrink-0 text-2xs text-slate-400">{r.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useClickAway(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cb]);
}

function ThemeToggle() {
  const [dark, toggle] = useTheme();
  return (
    <button data-testid="theme-toggle" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Light theme' : 'Dark theme'} onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function Topbar() {
  const { s, update, reset, openConfirm } = useStore();
  const nav = useNavigate();
  const [bell, setBell] = useState(false);
  const [prof, setProf] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [profile, setProfile] = useState(false);
  const r1 = useRef<HTMLDivElement>(null), r2 = useRef<HTMLDivElement>(null), r3 = useRef<HTMLDivElement>(null);
  useClickAway(r1, () => setBell(false)); useClickAway(r2, () => setProf(false)); useClickAway(r3, () => setUnitOpen(false));
  const ap = approvals(s);
  const notes = [
    ...ap.slice(0, 4).map((a) => ({ text: a.title, sub: `${a.agent ?? ''} · waiting for you`, to: a.to })),
    { text: 'Prime Components quote received for PR-208', sub: 'Procurement agent · 08:40', to: '/procurement/PR-208?tab=Compare' },
    { text: 'Attendance synced – 42 of 45 present', sub: 'Attendance agent · 09:12', to: '/people?tab=Attendance' },
  ];
  return (
    <header className="surface-glass sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200/70 px-3 md:gap-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <button aria-label="Menu" data-testid="nav-toggle" onClick={() => window.dispatchEvent(new Event('toggle-nav'))} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button><span className="md:hidden"><LogoMark size={26} /></span>
        <div ref={r3} className="relative">
          <button data-testid="unit-selector" onClick={() => setUnitOpen((v) => !v)} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100">
            <Building2 size={15} className="text-slate-400" />
            <span className="max-w-[104px] truncate whitespace-nowrap text-[13px] font-semibold text-slate-900 sm:max-w-none">{company.short}</span>
            <span className="hidden text-[13px] text-slate-400 sm:inline">/</span>
            <span className="hidden text-[13px] text-slate-600 sm:inline">{s.unit}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {unitOpen && (
            <div className="absolute left-0 top-9 z-40 w-60 rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
              {company.units.map((u) => (
                <button key={u} onClick={() => { update((d) => { d.unit = u; }); setUnitOpen(false); }} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-slate-50">
                  {u}{s.unit === u && <CheckCircle2 size={14} className="text-brand-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle /><div className="hidden rounded-lg bg-slate-100 p-0.5 text-2xs font-medium sm:flex" title="Interface language (navigation & greeting)">
          {(['en', 'hi', 'te'] as const).map((l) => (
            <button key={l} data-lang={l} onClick={() => update((d) => { d.lang = l; })} className={cx('rounded px-2 py-1', s.lang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>{l === 'en' ? 'EN' : l === 'hi' ? 'हिं' : 'తె'}</button>
          ))}
        </div>
        <div ref={r1} className="relative">
          <button data-testid="notifications" onClick={() => setBell((v) => !v)} className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100">
            <Bell size={17} />
            <span className="absolute right-1 top-1 h-4 min-w-4 rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-4 text-white">{notes.length}</span>
          </button>
          {bell && (
            <div className="absolute right-0 top-10 z-40 w-80 rounded-lg border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Notifications</div>
              {notes.map((n, i) => (
                <button key={i} onClick={() => { nav(n.to); setBell(false); }} className="block w-full border-b border-slate-50 px-3 py-2 text-left hover:bg-slate-50">
                  <div className="text-[13px] text-slate-800">{n.text}</div><div className="text-2xs text-slate-400">{n.sub}</div>
                </button>
              ))}
              <Link to="/approvals" onClick={() => setBell(false)} className="block px-3 py-2 text-center text-xs font-medium text-brand-700 hover:bg-slate-50">Open approvals inbox</Link>
            </div>
          )}
        </div>
        <div ref={r2} className="relative">
          <button data-testid="profile-menu" onClick={() => setProf((v) => !v)} className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-grad text-2xs font-semibold text-white ring-2 ring-white/80 dark:ring-white/10">{ROLE_USER[roleOf(s)].name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span>
            <span className="hidden text-left leading-tight sm:inline"><span className="block text-[13px] font-medium text-slate-800">{ROLE_USER[roleOf(s)].name}</span><span data-testid="current-role" className="block text-2xs text-slate-400">{roleOf(s)}</span></span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {prof && (
            <div className="absolute right-0 top-11 z-40 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
              <div className="px-3 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-400">View as role</div>
              <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                {ROLES.map((r) => (
                  <button key={r} data-role={r} onClick={() => { update((d) => { d.role = r as Role; }); setProf(false); nav('/'); }} className={cx('rounded-md px-2 py-1 text-left text-[12px]', roleOf(s) === r ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-50')}>{r}<span className="block truncate text-[10px] font-normal text-slate-400">{ROLE_USER[r as Role].name}</span></button>
                ))}
              </div>
              <div className="my-1 border-t border-slate-100" />
              {[['Company profile', () => setProfile(true)], ['Agents & automations', () => nav('/agents')], ['Connected apps', () => nav('/integrations')], ['Quick setup', () => nav('/setup')]].map(([l, f]) => (
                <button key={l as string} onClick={() => { (f as () => void)(); setProf(false); }} className="block w-full px-3 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-50">{l as string}</button>
              ))}
              <div className="my-1 border-t border-slate-100" />
              <button onClick={() => { setProf(false); openConfirm({ title: 'Reset demo data?', body: 'Restores the original sample data.', confirmLabel: 'Reset demo', tone: 'danger', onConfirm: reset }); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-50"><RotateCcw size={13} /> Reset demo</button>
              <button onClick={() => setProf(false)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-slate-400 hover:bg-slate-50"><LogOut size={13} /> Sign out (disabled in demo)</button>
            </div>
          )}
        </div>
      </div>
      <Modal open={profile} onClose={() => setProfile(false)} title="Company profile" subtitle="Used on invoices, challans and statutory filings" width="max-w-xl">
        <Fields cols={2}>
          <Field label="Legal name">{company.name}</Field>
          <Field label="What we do">{company.about}</Field>
          <Field label="GSTIN">{company.gstin}</Field>
          <Field label="PAN">{company.pan}</Field>
          <Field label="Udyam registration">{company.udyam}</Field>
          <Field label="MSME category">{company.udyamCategory}</Field>
          <Field label="CIN">{company.cin}</Field>
          <Field label="Aggregate turnover">{company.aato} · e-invoicing not applicable (below ₹5 Cr)</Field>
          <Field label="Registered address" className="col-span-2">{company.address}</Field>
          <Field label="Primary bank">{company.bank}</Field>
          <Field label="Units">{company.units.slice(1).join(' · ')}</Field>
        </Fields>
      </Modal>
    </header>
  );
}

const channelIcon = (c: string) => (c === 'WhatsApp' ? <MessageCircle size={14} className="text-emerald-600" /> : c === 'Email' ? <Mail size={14} className="text-brand-600" /> : c === 'NEFT batch' ? <Landmark size={14} className="text-slate-600" /> : <Send size={14} />);

function DraftModal() {
  const { draft, closeDraft } = useStore();
  const [body, setBody] = useState('');
  useEffect(() => { if (draft) setBody(draft.body); }, [draft]);
  if (!draft) return null;
  return (
    <Modal open onClose={closeDraft} title={draft.title} subtitle="Drafted for your review – nothing is sent until you approve" width="max-w-xl"
      footer={<>
        <Button onClick={closeDraft}>Cancel</Button>
        <Button variant="primary" data-testid="draft-approve" icon={<CheckCircle2 size={14} />} onClick={() => { draft.onApprove?.(body); closeDraft(); }}>{draft.approveLabel || 'Approve'}</Button>
      </>}>
      <div className="mb-3 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-[13px]">
        {channelIcon(draft.channel)}<span className="font-medium text-slate-800">{draft.channel}</span><span className="text-slate-400">to</span>
        <span className="text-slate-800">{draft.to}</span>{draft.toDetail && <span className="truncate text-2xs text-slate-400">· {draft.toDetail}</span>}
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={11} className={cx('w-full resize-none rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed text-slate-800 outline-none focus:border-brand-400', draft.channel === 'WhatsApp' ? 'border-emerald-100 bg-[#f3fbf5]' : 'border-slate-200')} />
      {draft.note && <p className="mt-2 text-xs text-amber-700">{draft.note}</p>}
      <p className="mt-2 text-2xs text-slate-400">Demo: approving records the message as sent. No real WhatsApp, email or bank message is sent.</p>
    </Modal>
  );
}

function ConfirmModal() {
  const { confirm, closeConfirm } = useStore();
  if (!confirm) return null;
  return (
    <Modal open onClose={closeConfirm} title={confirm.title} width="max-w-md"
      footer={<>
        <Button onClick={closeConfirm}>Cancel</Button>
        <Button data-testid="confirm-ok" variant={confirm.tone === 'danger' ? 'danger' : 'primary'} onClick={() => { confirm.onConfirm(); closeConfirm(); }}>{confirm.confirmLabel || 'Confirm'}</Button>
      </>}>
      <div className="text-[13px] leading-relaxed text-slate-600">{confirm.body}</div>
    </Modal>
  );
}

function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed right-3 top-16 z-[60] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="fadein pointer-events-auto flex items-start gap-2.5 rounded-xl border border-slate-200/70 bg-white px-3.5 py-3 text-[13px] text-slate-700 shadow-lift">
          <CheckCircle2 size={16} className={cx('mt-px shrink-0', t.tone === 'amber' ? 'text-amber-500' : t.tone === 'blue' ? 'text-brand-600' : 'text-emerald-600')} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const guideOn = useStore().s.guide.active;
  const [navOpen, setNavOpen] = useState(false);
  const desktop = useDesktop();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('bw-nav-collapsed') === '1'; } catch { return false; } });
  const [fly, setFly] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const toggle = () => setCollapsed((v) => { const n = !v; try { localStorage.setItem('bw-nav-collapsed', n ? '1' : '0'); } catch { /* ignore */ } if (!n) setFly(false); return n; });
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); setNavOpen(false); setFly(false); }, [loc.pathname, loc.search]);
  useEffect(() => { const t = () => setNavOpen((v) => !v); window.addEventListener('toggle-nav', t); return () => window.removeEventListener('toggle-nav', t); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!desktop) { if (e.key === 'Escape' && navOpen) setNavOpen(false); return; }
      const mod = (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b';
      const br = e.key === '[' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target);
      if (mod || br) { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [desktop, navOpen]);
  useEffect(() => { if (navOpen && !desktop) setTimeout(() => document.querySelector<HTMLElement>('[data-testid=sidebar] [data-nav]')?.focus(), 50); }, [navOpen, desktop]);
  const rail = desktop && collapsed;
  return (
    <div className="flex h-full" data-nav-state={desktop ? (collapsed ? 'collapsed' : 'expanded') : (navOpen ? 'drawer-open' : 'drawer-closed')}>
      {navOpen && !desktop && <div className="drawer-backdrop fixed inset-0 z-40 bg-[#05070f]/50 backdrop-blur-sm" onClick={() => setNavOpen(false)} data-testid="drawer-backdrop" />}
      <div className={cx('fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] lg:relative lg:z-[35] lg:translate-x-0', navOpen ? 'translate-x-0' : '-translate-x-full invisible lg:visible')}
        role={!desktop ? 'dialog' : undefined} aria-modal={!desktop && navOpen ? true : undefined} aria-label={!desktop ? 'Menu' : undefined} data-testid="nav-drawer">
        <Sidebar collapsed={rail} mobile={!desktop} onToggle={toggle} onClose={() => setNavOpen(false)} onFlyout={() => setFly((v) => !v)} flyOpen={fly} pillRef={pillRef} />
      </div>
      {rail && fly && <ModuleFlyout onClose={() => setFly(false)} returnTo={pillRef} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <main ref={mainRef} id="main-scroll" className="relative flex-1 overflow-y-auto bg-[var(--canvas)]">
          <Topbar />
          <div className={cx('mx-auto px-3 transition-[max-width] duration-300', rail ? 'max-w-[1480px]' : 'max-w-[1240px]', ' pb-24 pt-4 md:px-8 md:pt-6 lg:pb-8', guideOn && 'pb-[250px]')}>{children}</div>
        </main>
        <BottomNav />
      </div>
      <DraftModal />
      <ConfirmModal />
      <Toasts />
      <GuidePanel />
    </div>
  );
}
export { Badge, inr };
