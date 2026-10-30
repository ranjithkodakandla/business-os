import UsageNudge from '../components/UsageNudge';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { type LucideIcon, TrendingUp, Wallet, ClipboardList, Users, CheckCircle2, AlertTriangle, Lightbulb, Compass, ChevronRight, Bot, Inbox, Sparkles, Handshake, ShoppingCart, Boxes, Factory, Truck, IndianRupee, BarChart3, Plug, ArrowUpRight, ArrowLeft, SquarePen, X, Mail, MessageCircle, PhoneCall, Cpu, LayoutGrid, PackageSearch, ShieldCheck, Contact, Calculator, CalendarDays, MessageSquareText, Clock } from 'lucide-react';
import { useStore } from '../lib/store';
import { scopeOf } from '../lib/modAgent';
import { isLow } from '../lib/domain';
import { MessagesSquare, Coins, FileCheck2, CalendarClock } from 'lucide-react';
import { can, ROLE_USER, roleOf } from '../lib/rbac';
import { payTotals } from '../lib/p0actions';
import { cash, kpis, available } from '../lib/domain';
import { lakh } from '../lib/format';
import { greeting, Lang } from '../lib/i18n';
import { cx } from '../components/ui';
import { useChat, Composer, Thread } from '../components/Conversation';
import { ApprovalRow, FeedRow, useApprovals, useFeed, type FeedItem } from '../components/AgentBits';
import { reminder1048 } from '../lib/actions';
import { GUIDE_STEPS } from '../components/Guide';
import { sprintTotals } from '../lib/sprint';
import { SPRINT_PROMPT } from '../lib/converse';
import { live, type Status } from '../lib/live';

/* ───────── Module map: every part of the business, with who runs it ───────── */
type Mod = { key: string; to?: string; icon: LucideIcon; name: string; value: string; state: 'live' | 'preview' | 'soon' };
const MODULES: Mod[] = [
  { key: 'sourcing', to: '/sourcing/live', icon: Sparkles, name: 'Sourcing', value: 'Asks up to 5 suppliers by email, WhatsApp and AI phone call, then tells you who to go with.', state: 'live' },
  { key: 'sales', to: '/sales', icon: Handshake, name: 'Sales & CRM', value: 'Follows up on leads and turns enquiries into quotes.', state: 'preview' },
  { key: 'orders', to: '/orders', icon: ClipboardList, name: 'Orders', value: 'Flags orders at risk before the due date and plans dispatch.', state: 'preview' },
  { key: 'procurement', to: '/procurement', icon: ShoppingCart, name: 'Procurement', value: 'Raises POs from shortfalls and compares supplier quotes.', state: 'preview' },
  { key: 'suppliers', to: '/suppliers', icon: Contact, name: 'Buyers & suppliers', value: 'One contact book for every buyer, supplier and job worker.', state: 'preview' },
  { key: 'inventory', to: '/inventory', icon: Boxes, name: 'Inventory', value: 'Warns before you run short and spots slow stock.', state: 'preview' },
  { key: 'operations', to: '/operations', icon: Factory, name: 'Production', value: 'Tracks work orders and machine breakdowns on the shop floor.', state: 'preview' },
  { key: 'jobwork', to: '/job-work', icon: Truck, name: 'Job work', value: 'Tracks material at job workers and chases late returns.', state: 'preview' },
  { key: 'quality', icon: ShieldCheck, name: 'Quality control', value: 'Inspection checklists, rejections and supplier quality scores.', state: 'soon' },
  { key: 'people', to: '/people', icon: Users, name: 'People & HR', value: 'Syncs attendance and prepares payroll.', state: 'preview' },
  { key: 'finance', to: '/finance', icon: IndianRupee, name: 'Payments & finance', value: 'Chases overdue payments on WhatsApp and keeps GST on time.', state: 'preview' },
  { key: 'approvals', to: '/approvals', icon: Inbox, name: 'Approvals', value: 'Everything your agents drafted, in one inbox, one tap each.', state: 'preview' },
  { key: 'reports', to: '/reports', icon: BarChart3, name: 'Reports', value: 'Revenue, margins and cash in plain words, every morning.', state: 'preview' },
  { key: 'integrations', to: '/integrations', icon: Plug, name: 'Accounting & apps', value: 'Sits on top of Tally, Zoho, WhatsApp and Gmail. No re-entry.', state: 'preview' },
];
const APPS = ['Tally', 'Zoho Books', 'WhatsApp Business', 'Gmail', 'GST portal', 'Bank feeds'];
const STATE_LABEL = { live: 'Live', preview: 'Demo data', soon: 'Coming soon' } as const;

/* ───────── Tiny visuals ───────── */
function Spark({ data, color = '#6366f1', id, h = 36 }: { data: number[]; color?: string; id: string; h?: number }) {
  const w = 120, min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 4 - ((v - min) / (max - min || 1)) * (h - 8)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ height: h }} className="w-full" preserveAspectRatio="none" aria-hidden>
      <defs><linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#sg-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="spark-line" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
}
function Donut({ parts, size = 46, label }: { parts: { v: number; c: string }[]; size?: number; label?: React.ReactNode }) {
  const tot = parts.reduce((a, p) => a + p.v, 0); const r = 15.9; let off = 25;
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-0">
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgb(var(--slate-100))" strokeWidth="4" />
        {tot > 0 && parts.filter((p) => p.v > 0).map((p, i) => { const len = (p.v / tot) * 100; const el = <circle key={i} cx="18" cy="18" r={r} fill="none" stroke={p.c} strokeWidth="4" strokeDasharray={`${Math.max(len - 1.5, 0.5)} ${100 - Math.max(len - 1.5, 0.5)}`} strokeDashoffset={off} strokeLinecap="round" pathLength={100} className="donut-seg" />; off -= len; return el; })}
      </svg>
      {label && <span className="relative text-[11px] font-semibold text-slate-700 tabular">{label}</span>}
    </span>
  );
}
function StackBar({ parts }: { parts: { v: number; c: string; label: string }[] }) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1;
  return <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>{parts.filter((p) => p.v).map((p) => <span key={p.label} className="grow-bar h-full rounded-full" style={{ width: `${(p.v / tot) * 100}%`, background: p.c }} />)}</div>;
}
function Bars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return <div className="flex h-9 items-end gap-1" aria-hidden>{data.map((v, i) => <span key={i} className="grow-y w-full rounded-t-[3px]" style={{ height: `${Math.max(10, (v / max) * 100)}%`, background: color, opacity: 0.35 + (0.65 * (i + 1)) / data.length, animationDelay: `${i * 40}ms` }} />)}</div>;
}

/* ───────── Card + expanded sheet ───────── */
type Tone = 'indigo' | 'amber' | 'emerald' | 'violet' | 'sky' | 'rose' | 'slate';
const TONE: Record<Tone, { tile: string; glow: string; text: string }> = {
  indigo: { tile: 'bg-grad text-white shadow-glow', glow: 'from-indigo-500/15', text: 'text-brand-700' },
  amber: { tile: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_8px_20px_-8px_rgb(245_158_11/.6)]', glow: 'from-amber-400/15', text: 'text-amber-700' },
  emerald: { tile: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_8px_20px_-8px_rgb(16_185_129/.6)]', glow: 'from-emerald-400/15', text: 'text-emerald-700' },
  violet: { tile: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_8px_20px_-8px_rgb(139_92_246/.6)]', glow: 'from-violet-500/15', text: 'text-violet-700' },
  sky: { tile: 'bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-[0_8px_20px_-8px_rgb(14_165_233/.6)]', glow: 'from-sky-400/15', text: 'text-sky-700' },
  rose: { tile: 'bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-[0_8px_20px_-8px_rgb(244_63_94/.6)]', glow: 'from-rose-400/15', text: 'text-rose-700' },
  slate: { tile: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white', glow: 'from-slate-400/15', text: 'text-slate-700' },
};
type Cta = { label: string; to?: string; onClick?: () => void; icon?: LucideIcon };
type CardDef = { key: string; title: string; icon: LucideIcon; tone: Tone; headline: React.ReactNode; unit?: string; sub: React.ReactNode; visual: React.ReactNode; wide?: boolean; badge?: React.ReactNode; blurb: string; body: React.ReactNode; primary: Cta; secondary: Cta[] };

function GlanceCard({ c, onOpen, i }: { c: CardDef; onOpen: () => void; i: number }) {
  const t = TONE[c.tone];
  return (
    <button type="button" onClick={onOpen} data-card={c.key} aria-haspopup="dialog" aria-label={`${c.title}: open details`} style={{ animationDelay: `${i * 35}ms` }}
      className={cx('glance group relative flex min-h-[176px] flex-col overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-4 text-left shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift focus-visible:-translate-y-1 md:p-5', c.wide && 'col-span-2')}>
      <span className={cx('pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br to-transparent opacity-0 blur-2xl transition duration-500 group-hover:opacity-100', t.glow)} />
      <span className="relative flex items-start gap-3">
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl transition duration-300 group-hover:scale-105', t.tile)}><c.icon size={18} /></span>
        <span className="min-w-0 flex-1 pt-0.5"><span className="block text-[13.5px] font-semibold leading-tight tracking-tight text-slate-900">{c.title}</span>{c.badge && <span className="mt-1 block">{c.badge}</span>}</span>
        <ArrowUpRight size={16} className="shrink-0 text-slate-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600" />
      </span>
      <span className={cx('relative mt-auto flex gap-3 pt-4', c.wide ? 'items-end' : 'flex-col')}>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5"><span className="text-[28px] font-semibold leading-none tracking-tight text-slate-900 tabular md:text-[30px]">{c.headline}</span>{c.unit && <span className="truncate text-[12.5px] font-medium text-slate-500">{c.unit}</span>}</span>
          <span className="mt-1.5 block truncate text-[12.5px]">{c.sub}</span>
        </span>
        <span className={cx('shrink-0', c.wide ? 'w-[42%] max-w-[220px]' : 'w-full')}>{c.visual}</span>
      </span>
    </button>
  );
}

function Sheet({ c, onClose }: { c: CardDef; onClose: () => void }) {
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const t = TONE[c.tone];
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const main = document.getElementById('main-scroll'); const ov = main?.style.overflow; if (main) main.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) { // keep focus inside the sheet
        const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return; const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); if (main) main.style.overflow = ov || ''; prev?.focus?.(); };
  }, [onClose]);
  const go = (x: Cta) => { if (x.onClick) { onClose(); x.onClick(); } else if (x.to) { onClose(); nav(x.to); } };
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center md:items-stretch md:justify-end" role="presentation">
      <div className="sheet-backdrop absolute inset-0 bg-[#0b1020]/40 backdrop-blur-[3px]" onClick={onClose} data-testid="sheet-backdrop" />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-testid="card-sheet" data-sheet={c.key}
        className="sheet-panel relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl outline-none md:m-3 md:max-h-none md:w-[min(600px,calc(100vw-1.5rem))] md:rounded-[24px]">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-200 md:hidden" aria-hidden />
        <div className="relative shrink-0 overflow-hidden border-b border-slate-100 px-5 pb-5 pt-4 md:px-7 md:pt-6">
          <span className={cx('pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br to-transparent blur-2xl', t.glow)} />
          <div className="relative flex items-start gap-3.5">
            <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', t.tile)}><c.icon size={22} /></span>
            <div className="min-w-0 flex-1">
              <h2 id="sheet-title" className="text-[19px] font-semibold tracking-tight text-slate-900">{c.title}</h2>
              <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{c.blurb}</p>
            </div>
            <button onClick={onClose} aria-label="Close" data-testid="sheet-close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X size={18} /></button>
          </div>
          <div className="relative mt-4 flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><span className="text-[34px] font-semibold leading-none tracking-tight text-slate-900 tabular">{c.headline}</span>{c.unit && <span className="text-[13px] font-medium text-slate-500">{c.unit}</span>}</div><div className="mt-1.5 text-[13px]">{c.sub}</div></div>
            <div className="w-full sm:w-[42%] sm:max-w-[220px] sm:shrink-0">{c.visual}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 md:px-5">{c.body}</div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-7">
          <button data-testid="sheet-primary" onClick={() => go(c.primary)} className="btn-primary inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold">{c.primary.icon ? <c.primary.icon size={16} /> : <Sparkles size={16} />}{c.primary.label}</button>
          {c.secondary.map((x) => <button key={x.label} onClick={() => go(x)} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700">{x.label}<ChevronRight size={14} /></button>)}
        </div>
      </div>
    </div>
  );
}

/* ───────── Sheet body pieces ───────── */
type Item = { text: string; sub?: string; to?: string; onClick?: () => void };
function Rows({ items, dot, empty }: { items: Item[]; dot: string; empty: React.ReactNode }) {
  const nav = useNavigate();
  if (!items.length) return <EmptyNote>{empty}</EmptyNote>;
  return (
    <ul className="stagger space-y-1">
      {items.map((it) => (
        <li key={it.text}><button data-pulse={it.text} onClick={() => (it.onClick ? it.onClick() : it.to && nav(it.to))} className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50">
          <span className={cx('h-2 w-2 shrink-0 rounded-full', dot)} />
          <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium text-slate-800">{it.text}</span>{it.sub && <span className="block truncate text-[12.5px] text-slate-500">{it.sub}</span>}</span>
          <ChevronRight size={15} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
        </button></li>
      ))}
    </ul>
  );
}
const EmptyNote = ({ children }: { children: React.ReactNode }) => <div className="mx-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-6 text-center text-[13.5px] leading-relaxed text-slate-500">{children}</div>;
const SectionLabel = ({ children }: { children: React.ReactNode }) => <div className="mb-1.5 mt-4 px-3 text-[11px] font-semibold uppercase tracking-[.1em] text-slate-400 first:mt-0">{children}</div>;
function Tile({ label, value, sub, data, color, id, to, testid }: { label: string; value: string; sub: React.ReactNode; data: number[]; color: string; id: string; to: string; testid?: string }) {
  return (
    <Link to={to} data-kpi={id} className="group rounded-2xl border border-slate-200/80 bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-slate-500">{label}</div>
      <div className="mt-1.5 text-[21px] font-semibold leading-none tracking-tight text-slate-900 tabular">{value}</div>
      <div className="mt-1 text-[12px] font-medium" data-testid={testid}>{sub}</div>
      <div className="-mx-1 mt-1.5"><Spark data={data} color={color} id={'t' + id} h={28} /></div>
    </Link>
  );
}
const DOT: Record<string, string> = { running: 'text-brand-500', awaiting: 'text-amber-500', done: 'text-emerald-500', approved: 'text-emerald-500', auto: 'text-violet-500', info: 'text-slate-400' };
const pill = (text: string, cls: string) => <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', cls)}>{text}</span>;
const RUN_STATUS: Record<string, { label: string; c: string; cls: string }> = {
  'outreach': { label: 'Waiting for replies', c: '#6366f1', cls: 'bg-brand-50 text-brand-700' },
  'replies-in': { label: 'Replies in', c: '#10b981', cls: 'bg-emerald-50 text-emerald-700' },
  'needs-info': { label: 'Needs a detail', c: '#f59e0b', cls: 'bg-amber-50 text-amber-700' },
  'in-stock': { label: 'In stock', c: '#0ea5e9', cls: 'bg-sky-50 text-sky-700' },
};
type RunRow = { id: string; text: string; status: string; createdAt: string };
const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }); };

const Spark2 = ({ d, c }: { d: number[]; c: string }) => { const mn = Math.min(...d), mx = Math.max(...d) || 1, w = 64, h = 24; const pts = d.map((v, i) => `${(i / (d.length - 1)) * w},${h - 2 - ((v - mn) / (mx - mn || 1)) * (h - 4)}`).join(' '); return <svg width={w} height={h} className="shrink-0" aria-hidden><polyline points={pts} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; };
/* ───────── Page ───────── */
export default function Home() {
  const ctx = useStore();
  const { s, update } = ctx;
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const chat = useChat();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const k = kpis(s);
  const c = cash(s);
  const ap = useApprovals();
  const feed = useFeed();
  const sku = s.skus.find((x) => x.sku === 'RM-A17')!;
  const po912 = s.pos.find((p) => p.id === 'PO-0912')!;
  const sp = sprintTotals(s);
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [status, setStatus] = useState<Status | null | 'err'>(null);
  useEffect(() => {
    let on = true;
    live.runs().then((r) => on && setRuns(r)).catch(() => on && setRuns([]));
    live.status().then((x) => on && setStatus(x)).catch(() => on && setStatus('err'));
    return () => { on = false; };
  }, []);

  const inChat = params.get('chat') === '1';
  const openKey = params.get('card');
  const setParam = (k2: string, v: string | null) => setParams((p) => { const n = new URLSearchParams(p); if (v == null) n.delete(k2); else n.set(k2, v); return n; });
  const send = (text: string) => { if (chat.ask(text) && !inChat) setParams({ chat: '1' }); };
  const sendCurrent = { ...chat, ask: (t: string) => { const ok = chat.ask(t); if (ok && !inChat) setParams({ chat: '1' }); return ok; } };
  useEffect(() => { document.getElementById('main-scroll')?.scrollTo({ top: 0 }); if (inChat) setTimeout(() => inputRef.current?.focus(), 50); }, [inChat]);

  const good: Item[] = [
    ...(s.sprint.status === 'done' ? [{ text: `Collections sprint: ${lakh(sp.total)} lined up for Friday`, sub: `${sp.pct}% of ${lakh(sp.target)} target · ${lakh(sp.promised)} promised + ${lakh(sp.received)} received`, to: '/collections' }] : []),
    ...(s.sourcing.status === 'done' ? [{ text: 'Kaveri order: 6 of 6 suppliers replied', sub: 'Top 3 options per part ready · SRC-0031', to: '/sourcing' }] : []),
    { text: `${k.ready} orders packed and ready for dispatch`, sub: 'Thursday’s 2 loads are planned', to: '/orders?view=Ready%20for%20dispatch' },
    { text: 'Revenue up 12% on September', sub: '₹24.8 lakh month to date', to: '/reports' },
    { text: `${k.present} of ${k.employees} people in today`, sub: 'From biometric · 3 exceptions', to: '/people?tab=Attendance' },
    ...(s.pr208Approved ? [{ text: 'SO-1051 shortfall covered by PO-0921', sub: '35 ship Friday, 65 by Tue 3 Nov', to: '/orders/SO-1051' }] : []),
  ];
  const attention: Item[] = [
    ...(s.pr208Approved ? [] : [{ text: 'SO-1051 at risk: 65 × A-17 short', sub: `Due Fri 30 Oct · ${available(sku)} of 100 available`, to: '/orders/SO-1051' }]),
    ...(po912.confirmed ? [] : [{ text: 'SO-1049 at risk: MS plate not confirmed', sub: 'PO-0912 · Sri Venkata Steels', to: '/orders/SO-1049' }]),
    { text: `${lakh(k.overdueAmt)} overdue from ${k.overdueCount} customers`, sub: 'INV-1048 ₹2.1 lakh · 12 days', to: '/finance?tab=Receivables' },
    { text: '2,000 brackets late at a job worker', sub: 'DC-JW-0709 · Bharat Zinc Plating · 3 days', to: '/job-work?tab=Material%20out' },
    { text: 'Welding behind on SO-1046', sub: 'WO-3317 · TIG welder repair', to: '/operations?tab=Work%20orders' },
  ].slice(0, 4);
  good.splice(4);
  const suggested: Item[] = [
    ...(s.pr208Approved ? [] : [{ text: 'Approve PR-208 with Prime Components', sub: 'Only quote that lands by Friday', to: '/procurement/PR-208?tab=Compare' }]),
    ...(s.approvals['apr-rem1048'] ? [] : [{ text: 'Send reminder for INV-1048', sub: 'WhatsApp draft ready', onClick: () => reminder1048(ctx) }]),
    { text: 'Pay Sri Venkata Steels by Fri 30 Oct', sub: 'MSME 45-day limit · 43B(h)', to: '/finance?tab=Payables' },
    { text: 'Clear slow stock worth ₹2.6 lakh', sub: '2 items idle 120+ days', to: '/inventory?view=Slow%20moving' },
  ].slice(0, 4);
  const startGuide = () => { update((d) => { d.guide = { active: true, step: 0 }; }); nav(GUIDE_STEPS[0].to); };
  const focusComposer = (prefill: string) => { chat.setQ(prefill); setTimeout(() => { const el = inputRef.current; if (el) { el.focus(); el.setSelectionRange(prefill.length, prefill.length); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 80); };

  /* derived numbers for the cards */
  const urgent = ap.filter((a) => a.urgent).length;
  const apValue = ap.reduce((t, a) => t + (a.amount || 0), 0);
  const kinds = ap.reduce<Record<string, number>>((m, a) => { m[a.kind] = (m[a.kind] || 0) + 1; return m; }, {});
  const KIND_C: Record<string, string> = { Purchase: '#6366f1', Payment: '#8b5cf6', Reminder: '#f59e0b', 'Job work': '#f97316', 'Vendor message': '#0ea5e9', 'Customer commitment': '#10b981', Discount: '#94a3b8', Leave: '#cbd5e1', Dispute: '#f43f5e', Statement: '#64748b' };
  const runCounts = (runs || []).reduce<Record<string, number>>((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {});
  const waiting = runCounts['outreach'] || 0, repliesIn = runCounts['replies-in'] || 0;
  const latest = (runs || []).slice().sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const running = feed.filter((f) => f.state === 'running').length, awaiting = feed.filter((f) => f.state === 'awaiting').length;
  const doneToday = feed.filter((f) => ['done', 'auto', 'approved'].includes(f.state)).length;
  const perAgent = Object.values(feed.reduce<Record<string, number>>((m, f) => { m[f.agent.id] = (m[f.agent.id] || 0) + 1; return m; }, {}));
  const st = status && status !== 'err' ? status : null;
  const CH = [
    { key: 'email', name: 'Email', icon: Mail, desc: 'Enquiries and replies through your Gmail' },
    { key: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, desc: 'Supplier messages on WhatsApp' },
    { key: 'call', name: 'AI phone call', icon: PhoneCall, desc: 'A short scripted call that captures the quote' },
    { key: 'llm', name: 'AI understanding', icon: Cpu, desc: 'Reads replies and compares quotes' },
  ] as const;
  const liveCh = st ? CH.filter((x) => st.modes[x.key] === 'real').length : 0;
  const liveMods = MODULES.filter((m) => m.state === 'live').length;

  const cards: CardDef[] = [
    {
      key: 'approvals', title: 'Needs your OK', icon: Inbox, tone: 'indigo', wide: true,
      headline: ap.length || '✓', unit: ap.length ? `approval${ap.length === 1 ? '' : 's'} waiting` : 'All caught up',
      sub: ap.length ? <span className="text-slate-500">{urgent ? <span className="font-semibold text-rose-600">{urgent} urgent · </span> : null}{apValue ? `${lakh(apValue)} in drafts` : 'Drafted by your agents'}</span> : <span className="text-emerald-600">Nothing waiting on you</span>,
      visual: <div className="space-y-2"><StackBar parts={Object.entries(kinds).map(([label, v]) => ({ label, v, c: KIND_C[label] || '#94a3b8' }))} /><div className="flex flex-wrap gap-x-2.5 gap-y-1">{Object.entries(kinds).slice(0, 4).map(([kk, v]) => <span key={kk} className="flex items-center gap-1 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_C[kk] }} />{kk} {v}</span>)}</div></div>,
      blurb: 'Everything your agents drafted for you. Nothing goes out without your OK.',
      body: ap.length ? <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80" id="home-approvals">{ap.slice(0, 6).map((a) => <ApprovalRow key={a.id} a={a} compact />)}</div>
        : <EmptyNote>You're all caught up. When an agent drafts a PO, a reminder or a payment, it lands here for one-tap approval.</EmptyNote>,
      primary: { label: ap.length ? `Review all ${ap.length}` : 'Open approvals', to: '/approvals', icon: Inbox }, secondary: [{ label: 'Agent settings', to: '/agents' }],
    },
    {
      key: 'sourcing', title: 'Live sourcing', icon: PackageSearch, tone: 'violet', wide: true, badge: pill('● Live agent', 'bg-emerald-50 text-emerald-700'),
      headline: runs == null ? '…' : runs.length || 'Ready', unit: runs == null ? '' : runs.length ? `request${runs.length === 1 ? '' : 's'}` : 'to source anything',
      sub: runs && runs.length ? <span className="text-slate-500"><b className="font-semibold text-emerald-600">{repliesIn} with replies</b> · {waiting} waiting on suppliers</span> : <span className="text-slate-500">Materials, trucks, tools, services – just type it</span>,
      visual: runs && runs.length ? <div className="flex items-center justify-end gap-3"><div className="space-y-1 text-[11px] text-slate-500">{Object.entries(runCounts).slice(0, 3).map(([kk, v]) => <div key={kk} className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: RUN_STATUS[kk]?.c || '#94a3b8' }} />{RUN_STATUS[kk]?.label || kk} {v}</div>)}</div><Donut size={54} parts={Object.entries(runCounts).map(([kk, v]) => ({ v, c: RUN_STATUS[kk]?.c || '#94a3b8' }))} label={runs.length} /></div>
        : <div className="flex items-center justify-end gap-1.5">{[Mail, MessageCircle, PhoneCall].map((I, i) => <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-violet-50 text-violet-600 ring-4 ring-white"><I size={15} /></span>)}</div>,
      blurb: 'Tell me what you need. I ask up to 5 suppliers by email, WhatsApp and an AI phone call, compare the replies and tell you who to go with.',
      body: <div>
        <SectionLabel>Recent requests</SectionLabel>
        {latest.length ? <ul className="space-y-1">{latest.slice(0, 5).map((r) => { const rs = RUN_STATUS[r.status]; return (
          <li key={r.id}><Link to={`/sourcing/live/${r.id}`} data-run={r.id} className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><PackageSearch size={16} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium text-slate-800">{r.text}</span><span className="block text-[12px] text-slate-500">{r.id} · {ago(r.createdAt)}</span></span>
            {pill(rs?.label || r.status, rs?.cls || 'bg-slate-100 text-slate-600')}<ChevronRight size={15} className="shrink-0 text-slate-300 group-hover:text-brand-500" />
          </Link></li>); })}</ul>
          : <EmptyNote>No requests yet. Try typing <b className="font-semibold text-slate-700">“Need a 10-ton truck from Hyderabad to Pune on Friday”</b> above – I'll show you the enquiry before anything is sent.</EmptyNote>}
        <SectionLabel>How it works</SectionLabel>
        <ol className="grid gap-2 px-2 sm:grid-cols-3">{[['Tell me', 'Type what you need, in your own words.'], ['I ask around', 'Up to 5 suppliers, by email, WhatsApp and call.'], ['You decide', 'Replies compared, best option recommended.']].map(([h, d], i) => <li key={h} className="rounded-2xl bg-slate-50 p-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-grad text-[11px] font-semibold text-white">{i + 1}</span><div className="mt-2 text-[13px] font-semibold text-slate-800">{h}</div><div className="text-[12px] leading-snug text-slate-500">{d}</div></li>)}</ol>
      </div>,
      primary: { label: 'Start sourcing', icon: Sparkles, onClick: () => focusComposer('I need ') },
      secondary: [...(latest[0] ? [{ label: `Open ${latest[0].id}`, to: `/sourcing/live/${latest[0].id}` }] : []), { label: 'Live sourcing', to: '/sourcing/live' }],
    },
    {
      key: 'watch', title: 'To watch', icon: AlertTriangle, tone: 'amber',
      headline: attention.length || '✓', unit: attention.length ? 'things slipping' : 'Nothing slipping',
      sub: attention[0] ? <span className="text-amber-700">{attention[0].text}</span> : <span className="text-emerald-600">Orders, cash and job work on track</span>,
      visual: <div className="flex gap-1">{attention.map((a, i) => <span key={a.text} className={cx('h-1.5 flex-1 rounded-full', i === 0 ? 'bg-rose-400' : 'bg-amber-300')} />)}{!attention.length && <span className="h-1.5 flex-1 rounded-full bg-emerald-300" />}</div>,
      blurb: 'Risks your agents spotted before they turn into problems.',
      body: <div id="pulse-attention"><Rows items={attention} dot="bg-amber-500" empty="Nothing at risk right now. I'll flag late orders, overdue payments and stuck job work here." /></div>,
      primary: attention[0] ? { label: 'Fix the top one', to: attention[0].to, icon: AlertTriangle } : { label: 'Open orders', to: '/orders' },
      secondary: [{ label: 'Orders', to: '/orders' }, { label: 'Job work', to: '/job-work' }],
    },
    {
      key: 'next', title: 'Suggested next', icon: Lightbulb, tone: 'sky',
      headline: suggested.length || '✓', unit: suggested.length ? 'smart moves' : 'No suggestions',
      sub: suggested[0] ? <span className="text-slate-600">{suggested[0].text}</span> : <span className="text-slate-500">I'll suggest moves as data comes in</span>,
      visual: <Bars data={[3, 5, 4, 6, 5, 7, 8]} color="#0ea5e9" />,
      blurb: 'The moves that save money or time this week, ready to act on.',
      body: <div id="pulse-suggested"><Rows items={suggested} dot="bg-sky-500" empty="No suggestions right now." /></div>,
      primary: suggested[0] ? { label: suggested[0].text.length > 40 ? suggested[0].text.slice(0, 38) + '…' : suggested[0].text, to: suggested[0].to, onClick: suggested[0].onClick, icon: Lightbulb } : { label: 'Open reports', to: '/reports' },
      secondary: [{ label: 'Finance', to: '/finance' }, { label: 'Inventory', to: '/inventory' }],
    },
    {
      key: 'money', title: 'Cash & collections', icon: Wallet, tone: 'emerald',
      headline: lakh(c.bank).replace(' lakh', 'L'), unit: 'in bank',
      sub: s.sprint.status === 'done' ? <span className="font-medium text-emerald-600">{lakh(sp.promised)} promised by Fri</span> : <span className="font-medium text-rose-600">{lakh(k.overdueAmt)} overdue</span>,
      visual: <Spark data={[7.4, 7.1, 6.9, 7.3, 6.6, 6.2, 6.4, 6.0]} color="#10b981" id="cash" />,
      blurb: `Cash in bank covers ${c.runwayCash} days of fixed costs (${c.runwayTotal} with the credit line).`,
      body: <div className="px-2" id="home-cash">
        <div className="grid grid-cols-2 gap-2.5" data-testid="home-kpis">
          <Tile id="rev" label="Revenue this month" value="₹24.8 lakh" color="#6366f1" data={[16.2, 17.1, 18.4, 17.9, 20.3, 22.1, 22.0, 24.8]} sub={<span className="text-emerald-600">+12% vs September</span>} to="/reports" />
          <Tile id="ar" label="To collect" value={lakh(k.receivables)} color="#f43f5e" data={[6.1, 6.8, 7.4, 7.0, 7.9, 8.6, 8.2, 8.4]} testid={s.sprint.status === 'done' ? 'home-promised' : undefined} sub={s.sprint.status === 'done' ? <span className="text-emerald-600">{lakh(sp.promised)} promised by Fri</span> : <span className="text-rose-600">{lakh(k.overdueAmt)} overdue</span>} to="/finance?tab=Receivables" />
          <Tile id="cash" label="Cash in bank" value={lakh(c.bank)} color="#10b981" data={[7.4, 7.1, 6.9, 7.3, 6.6, 6.2, 6.4, 6.0]} sub={<span className="text-slate-500">{c.runwayCash} days of costs</span>} to="/finance?tab=Cash" />
          <Tile id="bills" label="Bills this week" value={lakh(c.payablesWeek)} color="#8b5cf6" data={[2.1, 1.8, 2.6, 2.2, 3.0, 2.4, 2.7, 2.5]} sub={<span className="text-slate-500">Due by Friday</span>} to="/finance?tab=Payables" />
        </div>
        <dl className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3.5 text-[13px]">
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Overdue from customers</dt><dd className="font-medium text-rose-600 tabular">{lakh(c.overdue)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Stuck in slow stock and job work</dt><dd className="font-medium text-amber-600 tabular">{lakh(c.slow + c.atJobWorkers)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Credit line headroom</dt><dd className="font-medium text-slate-800 tabular">{lakh(c.headroom)}</dd></div>
        </dl>
      </div>,
      primary: s.sprint.status === 'idle' ? { label: 'Get ₹5 lakh in by Friday', icon: IndianRupee, onClick: () => send(SPRINT_PROMPT) } : { label: 'Open collections sprint', to: '/collections', icon: IndianRupee },
      secondary: [{ label: 'Finance', to: '/finance?tab=Cash' }, { label: 'Reports', to: '/reports' }],
    },
    {
      key: 'orders', title: 'Orders & dispatch', icon: ClipboardList, tone: 'rose',
      headline: k.openOrders, unit: 'open orders',
      sub: <span className={k.atRisk ? 'font-medium text-amber-600' : 'font-medium text-emerald-600'}>{k.atRisk ? `${k.atRisk} at risk` : 'None at risk'} · {k.ready} ready to ship</span>,
      visual: <Spark data={[9, 11, 10, 12, 13, 12, 15, k.openOrders]} color="#f43f5e" id="orders" />,
      blurb: 'Every open order, what is at risk and what is ready to go out.',
      body: <div>
        <div className="grid grid-cols-3 gap-2 px-2">{[['Open', k.openOrders, 'text-slate-900', '/orders'], ['At risk', k.atRisk, 'text-amber-600', '/orders'], ['Ready', k.ready, 'text-emerald-600', '/orders?view=Ready%20for%20dispatch']].map(([l, v, cl, to]) => <Link key={l as string} to={to as string} className="rounded-2xl bg-slate-50 p-3 text-center transition hover:bg-slate-100"><div className={cx('text-[22px] font-semibold tabular', cl as string)}>{v}</div><div className="text-[12px] text-slate-500">{l}</div></Link>)}</div>
        <SectionLabel>Needs attention</SectionLabel>
        <Rows items={attention.filter((a) => /SO-|Welding|brackets/.test(a.text))} dot="bg-rose-500" empty="No order is at risk. Dispatch is on plan." />
      </div>,
      primary: k.atRisk ? { label: 'Can we deliver SO-1051 by Friday?', icon: MessageSquareText, onClick: () => send('Can we deliver SO-1051 by Friday?') } : { label: 'Open orders', to: '/orders' },
      secondary: [{ label: 'Dispatch plan', to: '/orders?view=Ready%20for%20dispatch' }, { label: 'Production', to: '/operations' }],
    },
    {
      key: 'team', title: 'AI team at work', icon: Bot, tone: 'indigo', badge: <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"><span className="live-dot !h-1.5 !w-1.5 text-emerald-500" />Live</span>,
      headline: doneToday, unit: 'done today',
      sub: <span className="text-slate-500">{running ? <b className="font-semibold text-brand-700">{running} working · </b> : null}{awaiting} waiting for you</span>,
      visual: <Bars data={perAgent.length ? perAgent : [1]} color="#6366f1" />,
      blurb: 'One agent per part of the business. Each one drafts the work; you stay in charge.',
      body: <div id="home-feed" data-testid="agents-live" className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80">{feed.slice(0, 7).map((f: FeedItem) => <FeedRow key={f.key} f={f} />)}</div>,
      primary: { label: 'See all agent activity', to: '/agents', icon: Bot }, secondary: [{ label: 'Approvals', to: '/approvals' }],
    },
    {
      key: 'good', title: 'On track', icon: CheckCircle2, tone: 'emerald',
      headline: good.length, unit: 'going well',
      sub: <span className="text-emerald-600">Revenue +12% on September</span>,
      visual: <div className="flex items-center gap-2.5"><Donut size={40} parts={[{ v: k.present, c: '#10b981' }, { v: k.employees - k.present, c: 'rgb(var(--slate-200))' }]} /><span className="text-[11.5px] leading-tight text-slate-500"><b className="block text-[13px] font-semibold text-slate-800 tabular">{k.present}/{k.employees}</b>people in today</span></div>,
      blurb: 'What is going right today, so you know where not to spend time.',
      body: <div id="pulse-good"><Rows items={good} dot="bg-emerald-500" empty="Good news will show up here." /></div>,
      primary: { label: 'Open reports', to: '/reports', icon: TrendingUp }, secondary: [{ label: 'People', to: '/people?tab=Attendance' }],
    },
    {
      key: 'channels', title: 'Channels', icon: Plug, tone: 'sky',
      headline: st ? `${liveCh}/4` : status === 'err' ? '–' : '…', unit: st ? 'connected live' : status === 'err' ? "Couldn't check" : 'checking',
      sub: <span className="text-slate-500">Email · WhatsApp · Call · AI</span>,
      visual: <div className="flex gap-1.5">{CH.map((x) => { const on = st?.modes[x.key] === 'real'; return <span key={x.key} title={x.name} className={cx('grid h-8 flex-1 place-items-center rounded-lg', on ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}><x.icon size={14} /></span>; })}</div>,
      blurb: 'How your agents reach suppliers and customers, and the apps they work with.',
      body: <div>
        <ul className="space-y-1">{CH.map((x) => { const on = st?.modes[x.key] === 'real'; return (
          <li key={x.key} data-channel-row={x.key} className="flex items-center gap-3 rounded-2xl px-3 py-3"><span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', on ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}><x.icon size={16} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium text-slate-800">{x.name}</span><span className="block text-[12.5px] text-slate-500">{x.desc}</span></span>
            {st ? pill(on ? '● Live' : 'Practice mode', on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600') : pill(status === 'err' ? 'Unknown' : 'Checking…', 'bg-slate-100 text-slate-500')}</li>); })}</ul>
        <SectionLabel>Works with the apps you already use</SectionLabel>
        <div className="flex flex-wrap gap-2 px-3" data-testid="home-apps">{APPS.map((a) => <Link key={a} to="/integrations" className="rounded-full border border-slate-200 px-3 py-1.5 text-[13px] text-slate-600 transition hover:border-brand-300 hover:text-brand-700">{a}</Link>)}</div>
      </div>,
      primary: { label: 'Manage connections', to: '/sourcing/live', icon: Plug }, secondary: [{ label: 'Connected apps', to: '/integrations' }],
    },
    {
      key: 'modules', title: 'Modules & agents', icon: LayoutGrid, tone: 'slate',
      headline: MODULES.length, unit: `modules · ${liveMods} live`,
      sub: <span className="text-slate-500">Sales to accounting, on one map</span>,
      visual: <div className="grid grid-cols-7 gap-1">{MODULES.map((m) => <span key={m.key} className={cx('grid aspect-square place-items-center rounded-md', m.state === 'live' ? 'bg-grad text-white' : m.state === 'soon' ? 'border border-dashed border-slate-300 text-slate-300' : 'bg-slate-100 text-slate-500')}><m.icon size={11} /></span>)}</div>,
      blurb: 'Every part of your business and the agent that runs it. Live ones work on real data today.',
      body: <div className="grid grid-cols-1 gap-2 px-1 sm:grid-cols-2" data-testid="ai-team">{MODULES.map((m) => {
        const inner = <><span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', m.state === 'live' ? 'bg-grad text-white shadow-glow' : m.state === 'soon' ? 'border border-dashed border-slate-300 text-slate-400' : 'bg-slate-100 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600')}><m.icon size={18} /></span>
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><span className="text-[13.5px] font-semibold text-slate-900">{m.name}</span>{pill(STATE_LABEL[m.state], m.state === 'live' ? 'bg-emerald-50 text-emerald-700' : m.state === 'soon' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')}</span><span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500">{m.value}</span></span></>;
        return m.to ? <Link key={m.key} to={m.to} data-module={m.key} className="group flex gap-3 rounded-2xl border border-slate-200/80 p-3 transition hover:border-brand-300 hover:shadow-card">{inner}</Link>
          : <div key={m.key} data-module={m.key} aria-disabled className="flex gap-3 rounded-2xl border border-dashed border-slate-200 p-3 opacity-80">{inner}</div>;
      })}</div>,
      primary: { label: 'Try Live sourcing', to: '/sourcing/live', icon: Sparkles }, secondary: [{ label: 'Manage agents', to: '/agents' }, { label: 'Guided walkthrough', onClick: startGuide }],
    },
  ];
  const PT = payTotals(s); const openT = s.p0.tickets.filter((x) => x.status !== 'Resolved'); const irnP = s.p0.einv.filter((x) => x.irn !== 'Generated');
  cards.splice(6, 0,
    { key: 'inbox', title: 'Customer inbox', icon: MessagesSquare, tone: 'rose', headline: openT.length, unit: 'open tickets', sub: <span className="text-rose-600">{openT.filter((x) => x.slaHrs - x.ageHrs < 0).length} past SLA · {openT.filter((x) => x.kind === 'Complaint').length} complaints</span>,
      visual: <div className="flex gap-1">{openT.slice(0, 5).map((x) => <span key={x.id} className={cx('h-8 flex-1 rounded-md', x.priority === 'High' ? 'bg-rose-400' : 'bg-rose-200')} />)}</div>, blurb: 'WhatsApp, email, groups and calls become tickets with SLA timers.',
      body: <Rows items={openT.map((x) => ({ text: `${x.id} · ${x.subject}`, sub: `${x.customer} · ${x.channel} · ${x.status}`, to: '/inbox' }))} dot="bg-rose-500" empty="No open tickets." />, primary: { label: 'Open inbox', to: '/inbox', icon: MessagesSquare }, secondary: [{ label: 'Complaints', to: '/inbox' }] },
    { key: 'payroll', title: 'Payroll', icon: Coins, tone: 'violet', headline: lakh(PT.net), unit: `net · ${s.p0.payrun.month}`, sub: <span className="text-slate-500">{s.p0.payrun.status} · PF {lakh(PT.pf * 2)} · {PT.lop} LOP days</span>,
      visual: <div className="flex items-end gap-1">{[0.82, 0.86, 0.9, 0.88, 0.95, 1].map((v, i) => <span key={i} className="w-full rounded-t bg-violet-300" style={{ height: v * 36 }} />)}</div>, blurb: 'Pay run, statutory dues and advances.',
      body: <Rows items={[{ text: `Pay run ${s.p0.payrun.month}: ${s.p0.payrun.status}`, sub: `${PT.heads} employees · gross ${lakh(PT.gross)}`, to: '/payroll' }, { text: `PF + ESI due 15 Nov: ${lakh(PT.pf * 2 + PT.esi)}`, sub: 'Statutory', to: '/payroll?tab=Statutory' }, ...s.p0.advances.filter((a) => a.status === 'Active').map((a) => ({ text: `${a.name}: advance ${lakh(a.amount)}`, sub: `${a.months} months`, to: '/payroll?tab=Advances%20%26%20loans' }))]} dot="bg-violet-500" empty="" />, primary: { label: 'Open payroll', to: '/payroll', icon: Coins }, secondary: [] },
    { key: 'gst', title: 'GST & e-invoice', icon: FileCheck2, tone: 'amber', headline: irnP.length, unit: 'IRNs pending', sub: <span className="text-amber-700">{s.p0.einv.filter((x) => x.ewbStatus === 'Expiring').length} e-way bill expiring today</span>,
      visual: <div className="flex gap-1">{s.p0.einv.map((x) => <span key={x.inv} className={cx('h-8 flex-1 rounded-md', x.irn === 'Generated' ? 'bg-emerald-300' : x.irn === 'Failed' ? 'bg-rose-400' : 'bg-amber-300')} />)}</div>, blurb: 'IRN/QR, e-way validity and GSTR-1/3B.',
      body: <Rows items={irnP.map((x) => ({ text: `${x.inv}: IRN ${x.irn.toLowerCase()}`, sub: `${x.customer}`, to: '/gst' }))} dot="bg-amber-500" empty="All IRNs generated." />, primary: { label: 'Open GST', to: '/gst', icon: FileCheck2 }, secondary: [] },
    { key: 'attendance', title: 'Attendance & leave', icon: CalendarClock, tone: 'sky', headline: `${k.present}/${k.employees}`, unit: 'present today', sub: <span className="text-slate-500">{s.p0.leaves.filter((l) => l.status === 'Pending').length} leave requests · {s.p0.ot.reduce((a, o) => a + o.hrs, 0)}h OT this week</span>,
      visual: <Donut size={40} parts={[{ v: k.present, c: '#0ea5e9' }, { v: k.employees - k.present, c: 'rgb(var(--slate-200))' }]} />, blurb: 'Muster roll, leave, OT and contract labour.',
      body: <Rows items={s.p0.leaves.map((l) => ({ text: `${l.name}: ${l.type}`, sub: `${l.from} → ${l.to} · ${l.status}`, to: '/attendance?tab=Leave' }))} dot="bg-sky-500" empty="" />, primary: { label: 'Open attendance', to: '/attendance', icon: CalendarClock }, secondary: [] },
  );
  const CARD_MOD: Record<string, string> = { sourcing: 'suppliers', watch: 'orders', next: 'home', money: 'finance', team: 'home', good: 'reports', channels: 'integrations', modules: 'home' };
  const shown = cards.filter((x) => can(s, CARD_MOD[x.key] || x.key));
  const open = shown.find((x) => x.key === openKey) || null;

  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(new Date()));
  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date());
  const [hello] = greeting(s.lang as Lang).split(', '); const name = ROLE_USER[roleOf(s)].name.split(' ')[0];
  const chips: { t: string; icon: LucideIcon }[] = [
    { t: 'Who owes us money?', icon: Wallet }, { t: 'Run October payroll', icon: Coins }, { t: 'What is low in stock?', icon: Boxes },
    { t: 'What ships today?', icon: Truck }, { t: 'Show open complaints', icon: MessagesSquare }, { t: '18% GST on ₹45,000', icon: Calculator },
  ].filter((x) => !scopeOf(x.t) || can(s, scopeOf(x.t)!));
  const lowN = s.skus.filter(isLow).length; const urgentN = ap.filter((a) => a.urgent).length;
  const TILES = [
    { k: 'cash', m: 'finance', label: 'Cash', value: lakh(c.bank), change: '₹1.2L this week', up: true, good: true, spark: [5, 6, 5.5, 6.4, 6.2, 7, 7.4], to: '/finance' },
    { k: 'overdue', m: 'finance', label: 'Overdue', value: lakh(k.overdueAmt), change: '₹2L this week', up: true, good: false, spark: [3, 3.4, 3.2, 4, 4.4, 4.8, 5.2], to: '/finance?tab=Receivables' },
    { k: 'approvals', m: 'approvals', label: 'Approvals', value: String(ap.length), change: `${urgentN} urgent`, up: true, good: urgentN === 0, spark: [2, 3, 2, 4, 3, 5, ap.length], to: '/approvals' },
    { k: 'gst', m: 'gst', label: 'GST due', value: '20 Nov', change: `${irnP.length} IRN pending`, up: false, good: irnP.length === 0, spark: [1, 2, 2, 3, 2, 3, 2], to: '/gst' },
    { k: 'attendance', m: 'attendance', label: 'Attendance', value: `${k.present}/${k.employees}`, change: '2 vs yesterday', up: false, good: false, spark: [43, 44, 42, 44, 45, 44, k.present], to: '/attendance' },
    { k: 'lowstock', m: 'inventory', label: 'Low stock', value: `${lowN} items`, change: '1 since Monday', up: true, good: false, spark: [1, 1, 2, 2, 2, 3, lowN], to: '/inventory' },
    { k: 'oee', m: 'operations', label: 'OEE · Unit 1', value: '78%', change: '3 pts this week', up: true, good: true, spark: [70, 72, 71, 74, 75, 77, 78], to: '/operations' },
  ];
  const tiles = TILES.filter((t) => can(s, t.m));
  const breach = s.p0.tickets.filter((x) => x.status !== 'Resolved' && x.slaHrs - x.ageHrs < 0);
  const todo = [
    ...(can(s, 'finance') ? [{ id: 'call1048', dot: 'bg-rose-500', text: 'Overdue call: Sri Lakshmi Projects · INV-1048', sub: '₹2.1 lakh · 12 days overdue', cta: 'Draft reminder', act: () => send('remind Sri Lakshmi Projects about INV-1048') }] : []),
    ...(can(s, 'gst') ? [{ id: 'gst', dot: 'bg-amber-500', text: `GSTR-1 due 11 Nov · ${irnP.length} IRN pending`, sub: 'E-invoice register', cta: 'Open GST', act: () => nav('/gst') }] : []),
    ...(can(s, 'inbox') ? breach.slice(0, 2).map((t) => ({ id: t.id, dot: 'bg-rose-500', text: `${t.id} breaching SLA · ${t.customer}`, sub: t.subject, cta: 'Open ticket', act: () => nav('/inbox') })) : []),
  ];

  const actionPills = [
    ap.length ? { k: 'approvals', t: `${ap.length} approvals`, c: 'bg-brand-500' } : null,
    k.atRisk ? { k: 'orders', t: `${k.atRisk} orders at risk`, c: 'bg-amber-500' } : null,
    k.overdueAmt ? { k: 'money', t: `${lakh(k.overdueAmt)} overdue`, c: 'bg-rose-500' } : null,
    repliesIn ? { k: 'sourcing', t: `${repliesIn} supplier ${repliesIn === 1 ? 'reply' : 'replies'} to review`, c: 'bg-emerald-500' } : null,
  ].filter(Boolean) as { k: string; t: string; c: string }[];

  /* ───── ChatGPT-style conversation view ───── */
  if (inChat) return (
    <div className="mx-auto flex min-h-[calc(100vh-150px)] max-w-[820px] flex-col" data-testid="chat-view">
      <div className="surface-glass sticky top-14 z-20 -mx-3 -mt-4 mb-4 border-b border-slate-200/60 md:-mt-6 flex items-center gap-2 px-3 py-2 md:-mx-8 md:px-8">
        <button onClick={() => setParams({})} data-testid="chat-back" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"><ArrowLeft size={16} />Home</button>
        <div className="min-w-0 flex-1 truncate text-center text-[13px] font-medium text-slate-500"><Sparkles size={13} className="mr-1 inline text-brand-600" />Workspace AI</div>
        <button onClick={() => { update((d) => { d.chat = []; }); setParams({}); }} data-testid="chat-new" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700"><SquarePen size={15} />New chat</button>
      </div>
      <div className="flex-1 pb-6">{s.chat.length || chat.thinking ? <Thread thinking={chat.thinking} stage={chat.stage} /> : <EmptyNote>Start by asking anything – a delivery date, a GST sum, or what you need to source.</EmptyNote>}</div>
      <div className="sticky bottom-[calc(66px+env(safe-area-inset-bottom))] z-20 -mx-1 bg-gradient-to-t from-[var(--canvas)] via-[var(--canvas)] to-transparent px-1 pb-2 pt-6 lg:bottom-0 lg:pb-4">
        <Composer chat={chat} inputRef={inputRef} placeholder="Message Workspace AI…" />
        <div className="mt-2 text-center text-[11.5px] text-slate-400">Nothing is sent to a supplier or customer without your OK.</div>
      </div>
    </div>
  );

  /* ───── Home: chat-first hero + business at a glance ───── */
  return (
    <div className="pb-6">
      <section data-testid="stat-tiles" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {tiles.map((t) => (
          <button key={t.k} data-tile={t.k} onClick={() => nav(t.to)} className="tile-gloss group rounded-2xl p-3.5 text-left">
            <div className="flex items-center justify-between text-[11.5px] font-medium text-slate-500">{t.label}<ChevronRight size={13} className="opacity-0 transition group-hover:opacity-100" /></div>
            <div className="mt-1 flex items-end justify-between gap-2"><span className="whitespace-nowrap text-[19px] font-semibold tracking-tight text-slate-900 tabular-nums">{t.value}</span><Spark2 d={t.spark} c={t.good ? '#10b981' : '#f43f5e'} /></div>
            <div data-trend={t.good ? 'good' : 'bad'} className={cx('mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium', t.good ? 'text-emerald-600' : 'text-rose-600')}>{t.up ? '▲' : '▼'} {t.change}</div>
          </button>))}
      </section>
      <div className="mt-4"><UsageNudge /></div>
      <section className="ask-hero relative isolate mx-auto max-w-[820px] pb-2 pt-8 text-center md:pt-10" data-testid="home-hero">
        <div className="hero-orbs" aria-hidden><span /><span /><span /></div>
        <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[40px]">{hello}{name && <>, <span className="text-grad">{name}</span></>}</h1>
        <p className="mx-auto mt-1.5 max-w-[560px] text-[15px] text-slate-500">Ask anything about Aarohan Industries – type or speak. <span className="text-slate-400">{today}</span></p>
        <div className="home-ask mt-5 text-left">
          <Composer chat={sendCurrent} big inputRef={inputRef} placeholder="Which customers owe more than ₹5L for over 45 days?" footer={<span className="inline-flex items-center gap-1.5"><Sparkles size={12} className="text-brand-500" />Knows your orders, stock, people, GST and cash</span>} />
        </div>
        <div className="no-scrollbar -mx-3 mt-4 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0" data-testid="home-chips">
          {chips.map((x) => <button key={x.t} data-chip={x.t} onClick={() => send(x.t)} className="chip-gloss group inline-flex max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] text-slate-600 transition hover:-translate-y-0.5 hover:text-brand-700"><x.icon size={14} className="shrink-0 text-slate-400 transition group-hover:text-brand-600" /><span className="truncate">{x.t}</span></button>)}
        </div>
        {s.chat.length > 0 && <button onClick={() => setParams({ chat: '1' })} data-testid="chat-resume" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:underline"><MessageSquareText size={14} />Continue your conversation ({s.chat.filter((m) => m.role === 'user').length} message{s.chat.filter((m) => m.role === 'user').length === 1 ? '' : 's'})<ChevronRight size={14} /></button>}
      </section>
      <section className="mx-auto mt-8 grid max-w-[1240px] gap-4 lg:grid-cols-[1.05fr_1fr]">
        <div className="tile-gloss rounded-3xl p-4" data-testid="needs-today">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[15px] font-semibold text-slate-900">Needs you today</h2><span className="rounded-full bg-rose-50 px-2 py-0.5 text-2xs font-semibold text-rose-600">{todo.length + ap.slice(0, 3).length}</span></div>
          <div className="space-y-1.5">
            {can(s, 'approvals') && ap.slice(0, 3).map((a) => <ApprovalRow key={a.id} a={a} compact />)}
            {todo.map((t) => (
              <div key={t.id} data-todo={t.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2.5">
                <span className={cx('h-2 w-2 shrink-0 rounded-full', t.dot)} />
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium text-slate-800">{t.text}</div><div className="truncate text-2xs text-slate-500">{t.sub}</div></div>
                <button onClick={t.act} className="btn-primary h-8 shrink-0 rounded-full px-3 text-[12px] font-medium">{t.cta}</button>
              </div>))}
          </div>
        </div>
        <div className="agent-panel rounded-3xl p-4" data-testid="agent-activity">
          <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><span className="live-dot text-emerald-500" />Agents at work</h2><Link to="/agents" className="text-[12px] font-medium text-brand-700 hover:underline">All activity →</Link></div>
          {can(s, 'suppliers') && (
            <Link to={latest[0] ? `/sourcing/live/${latest[0].id}` : '/sourcing/live'} className="mb-2 block rounded-2xl border border-violet-200/70 bg-gradient-to-r from-violet-50 to-indigo-50/70 p-3" data-testid="sourcing-strip">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900"><PackageSearch size={15} className="text-violet-600" />Sourcing agent<span className="text-2xs font-normal text-slate-500">{latest[0] ? `${latest[0].id} · ${latest[0].text.slice(0, 40)}` : 'SRC-0031 · Kaveri order parts'}</span></div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-2xs font-medium">{['Stock checked', '6 suppliers contacted', `${s.sourcing.status === 'done' ? 6 : 3} quotes in`, 'Calling Balaji Steels…'].map((x, i) => <span key={x} className={cx('rounded-full px-2 py-0.5', i < 3 ? 'bg-emerald-100 text-emerald-700' : 'animate-pulse bg-white text-violet-700 ring-1 ring-violet-200')}>{i < 3 ? '✓ ' : '● '}{x}</span>)}</div>
            </Link>)}
          <div className="divide-y divide-slate-100/80 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70">{feed.slice(0, 5).map((f: FeedItem) => <FeedRow key={f.key} f={f} />)}</div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-[1240px]" data-testid="home-glance">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div><h2 className="text-[17px] font-semibold tracking-tight text-slate-900">Your business at a glance</h2><p className="text-[13px] text-slate-500">Tap a card for the details and the next step.</p></div>
          {actionPills.length > 0 && <div className="flex flex-wrap gap-1.5" data-testid="action-items" aria-label="Your action items for today">{actionPills.map((p) => <button key={p.k} onClick={() => setParam('card', p.k)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 transition hover:border-brand-300"><span className={cx('h-1.5 w-1.5 rounded-full', p.c)} />{p.t}</button>)}</div>}
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4" data-testid="needs-you">
          {shown.map((x, i) => <GlanceCard key={x.key} c={x} i={i} onOpen={() => setParam('card', x.key)} />)}
        </div>
        <div className="mt-6 text-center"><button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" data-testid="start-guide" onClick={startGuide}><Compass size={14} />Guided walkthrough</button></div>
      </section>
      {open && <Sheet c={open} onClose={() => setParam('card', null)} />}
    </div>
  );
}
