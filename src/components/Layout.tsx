import React, { useMemo, useRef, useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Inbox, Handshake, ClipboardList, ShoppingCart, Boxes, Factory, Users, IndianRupee, BarChart3, Bell, ChevronDown, RotateCcw, Search,
  Building2, Truck, Bot, Plug, Sparkles, CheckCircle2, MessageCircle, Mail, Landmark, Send, LogOut, Contact, Moon, Sun, Menu, X, ChevronLeft, ChevronRight, LayoutGrid,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Lang } from '../lib/i18n';
import { MODULES, GROUPS as NAV_GROUPS, GROUP_LABEL, GROUP_ICON, type Group } from '../lib/nav';
import { can, ROLES, ROLE_USER, roleOf, type Role } from '../lib/rbac';
const NAV_LABELS: Record<string, Record<Lang, string>> = Object.fromEntries(MODULES.map((m) => [m.key, m.label]));
import { approvals, customerById, supplierById } from '../lib/domain';
import { company, jobWorkers } from '../lib/data';
import { Badge, Button, Modal, cx, Fields, Field } from './ui';
import { inr } from '../lib/format';
import { GuidePanel } from './Guide';
import { TopNav } from './TopNav';

const NAV_SUB: Record<string, [string, string][]> = {
  suppliers: [['Live sourcing', '/sourcing/live']],
  procurement: [['Purchase orders', '/procurement?tab=Purchase%20orders']],
  operations: [['Work orders', '/operations?tab=Work%20orders'], ['Dispatch (packing, LR, POD)', '/dispatch']],
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
    ...s.p0.tickets.map((k) => ({ type: 'Ticket', id: k.id, label: `${k.id} · ${k.customer} · ${k.subject}`, to: '/inbox' })),
    ...s.workOrders.map((w) => ({ type: 'Work order', id: w.id, label: `${w.id} · ${w.op} (${w.order})`, to: `/operations?tab=Work%20orders` })),
  ], [s]);
  const KM: Record<string, string> = { Order: 'orders', Customer: 'sales', Invoice: 'finance', Item: 'inventory', 'Purchase request': 'procurement', 'Purchase order': 'procurement', Employee: 'people', 'Job work challan': 'jobwork', 'Work order': 'operations', Ticket: 'inbox' };
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.querySelector<HTMLInputElement>('[data-testid=global-search]')?.focus(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  const res = q.trim().length < 2 ? [] : index.filter((r) => can(s, KM[r.type] || 'home')).filter((r) => (r.label + ' ' + r.type).toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="relative">
      <label className="hidden h-8 w-[150px] items-center md:flex 2xl:w-[220px] gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-3 shadow-sm transition focus-within:border-brand-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10">
        <Search size={14} className="text-slate-400" />
        <input data-testid="global-search" value={q} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)}
          placeholder="Search…" className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" />
        <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 text-2xs font-medium text-slate-400">⌘K</kbd>
      </label>
      {open && res.length > 0 && (
        <div className="glass-pop absolute right-0 top-10 z-50 w-[460px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
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
    <header className="topbar sticky top-0 z-40 flex h-[60px] shrink-0 items-center justify-between gap-3 px-3 md:px-5" data-testid="topbar">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Home"><LogoMark size={30} /><span className="hidden text-[14px] font-semibold tracking-tight text-slate-900 2xl:inline">Aarohan OS</span></Link>
        <TopNav />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <GlobalSearch />
        <label className="hidden items-center gap-1 lg:flex" title="View the app as a role"><span className="hidden text-2xs text-slate-400 2xl:inline">View as</span>
          <select data-testid="role-switch" value={roleOf(s)} onChange={(e) => { update((d) => { d.role = e.target.value as Role; }); nav('/'); }} className="h-8 rounded-lg border border-slate-200 bg-white/80 px-2 text-[12px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-300">{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label><div className="hidden rounded-lg bg-slate-100 p-0.5 text-2xs font-medium sm:flex" title="Interface language (navigation & greeting)">
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
            <span className="hidden text-left leading-tight 2xl:inline"><span className="block text-[13px] font-medium text-slate-800">{ROLE_USER[roleOf(s)].name}</span><span data-testid="current-role" className="block text-2xs text-slate-400">{roleOf(s)}</span></span>
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
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [loc.pathname, loc.search]);
  useEffect(() => { document.documentElement.classList.remove('dark'); }, []);
  return (
    <div className="flex h-full flex-col" data-nav-state="top">
      <main ref={mainRef} id="main-scroll" className="app-canvas relative flex-1 overflow-y-auto">
        <Topbar />
        <div className={cx('mx-auto w-full max-w-[1600px] px-3 pb-24 pt-4 md:px-6 md:pt-6 lg:pb-8', guideOn && 'pb-[250px]')}>{children}</div>
      </main>
      <BottomNav />
      <DraftModal />
      <ConfirmModal />
      <Toasts />
      <GuidePanel />
    </div>
  );
}
export { Badge, inr };
