import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUp, Loader2, CheckCircle2, CornerDownRight, Sparkles, Bot, Database, Mic, Square, MessageCircleQuestion } from 'lucide-react';
import { domainOf, domainView, snapshot, isSpecific, validateView, type GenBlock } from '../lib/domainViews';
import { ModCardView } from './ModCard';
import { modIntent, fillCard, scopeOf, denied, type ModCard } from '../lib/modAgent';
import { can, roleOf, ROLE_USER, DOMAIN_MODULE } from '../lib/rbac';
import { MODULES } from '../lib/nav';
import { p1Answer } from '../lib/p1Agent';
import { asAgent } from '../lib/p1Data';
import { looksLikeData, parseRules, merge, build, catalog, mergeAnswers, looksLikeAnswers, type Intent as DataIntent } from '../lib/dataAgent';
import { DataView } from './DataViews';
import { useStore } from '../lib/store';
import { respond, Resp, Block } from '../lib/converse';
import OutreachLive from './Outreach';
import { LiveCheck } from '../pages/LiveSourcing';
import { Md } from './Md';
import { live, Offline, type Turn, type Intent } from '../lib/live';
import { bizContext } from '../lib/bizContext';
import { HANDOFFS, runApproval, sendPO, confirmSplit, reminder1048, chaseJobWorker, startSourcing, startSprint } from '../lib/actions';
import { cx, Button } from './ui';
import { FACTORY } from '../factory/edition';
import { factoryRespond, factoryContext } from '../factory/chat';
import { runFx } from '../factory/actions';

const ID_RE = /(SO-\d{4}|PR-\d{3}|PO-\d{4}|INV-\d{4}|WO-\d{4}|DC-JW-\d{4}|RM-A17|PB-\d{4}|OP-\d{3}|SRC-\d{4})/g;
const ID_ONE = new RegExp('^' + ID_RE.source + '$');
export const recordPath = (id: string) => {
  if (id.startsWith('SO-')) return `/orders/${id}`;
  if (id.startsWith('PR-')) return `/procurement/${id}`;
  if (id.startsWith('PO-')) return `/procurement?tab=Purchase%20orders`;
  if (id.startsWith('INV-')) return `/finance/${id}`;
  if (id.startsWith('WO-')) return `/operations?tab=Work%20orders`;
  if (id.startsWith('DC-JW')) return `/job-work?tab=Material%20out`;
  if (id.startsWith('PB-')) return `/finance?tab=Payables`;
  if (id.startsWith('OP-')) return `/sales/opportunity/${id}`;
  if (id.startsWith('SRC-')) return '/sourcing';
  return `/inventory/${id}`;
};
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        const bold = p.startsWith('**');
        const inner = bold ? p.slice(2, -2) : p;
        const segs = inner.split(ID_RE).map((seg, j) => (ID_ONE.test(seg) ? <Link key={j} to={recordPath(seg)} className="font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600">{seg}</Link> : <React.Fragment key={j}>{seg}</React.Fragment>));
        return bold ? <strong key={i} className="font-semibold text-slate-900">{segs}</strong> : <React.Fragment key={i}>{segs}</React.Fragment>;
      })}
    </>
  );
}

const toneCls = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500', blue: 'bg-brand-500' } as const;
function BlockView({ b }: { b: Block }) {
  if (b.type === 'live') return <LiveCheck text={b.text} />;
  if (b.type === 'md') return <Md text={b.text} typed={!!b.at && Date.now() - b.at < 6000} className="text-[13.5px] leading-relaxed text-slate-700" />;
  if (b.type === 'text') return <p className="text-[13px] leading-relaxed text-slate-700"><RichText text={b.text} /></p>;
  if (b.type === 'facts')
    return (
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/40">
        {b.items.map((f, i) => (
          <div key={i} className="flex gap-3 px-3 py-2">
            <span className={cx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', f.tone ? toneCls[f.tone] : 'bg-slate-300')} />
            <div className="min-w-0 flex-1">
              <div className="text-2xs font-semibold uppercase tracking-wide text-slate-400">{f.to ? <Link to={f.to} className="hover:text-brand-700">{f.label}</Link> : f.label}</div>
              <div className="text-[13px] leading-snug text-slate-700"><RichText text={f.value} /></div>
            </div>
          </div>
        ))}
      </div>
    );
  if (b.type === 'steps')
    return (
      <div>
        <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-slate-400">{b.title}</div>
        <ol className="space-y-1">
          {b.items.map((t, i) => <li key={i} className="flex gap-2 text-[13px] text-slate-700"><span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">{i + 1}</span><span><RichText text={t} /></span></li>)}
        </ol>
      </div>
    );
  if (b.type === 'ask')
    return (
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50/50 to-white" data-testid="ask-card">
        <div className="flex items-center gap-2 px-3.5 pt-2.5 text-2xs font-semibold uppercase tracking-wide text-brand-700"><MessageCircleQuestion size={13} /> A few details</div>
        <div className="divide-y divide-brand-100/60">
          {b.items.map((x, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 px-3.5 py-2">
              <span className="min-w-[140px] flex-1 text-[13px] font-medium text-slate-800">{x.q}</span>
              {x.options.map((o) => <button key={o} type="button" data-ask-option={o} onClick={() => window.dispatchEvent(new CustomEvent('bw-fill', { detail: `${x.q.replace(/\?$/, '')} - ${o}` }))} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[12px] text-slate-700 hover:border-brand-300 hover:text-brand-700">{o}</button>)}
            </div>
          ))}
        </div>
        <div className="px-3.5 pb-2.5 pt-1 text-[11.5px] text-slate-400">Reply in one message with what you know – skip anything optional.</div>
      </div>
    );
  if (b.type === 'data' || b.type === 'mod') return null;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      <table className="w-full text-[12.5px]">
        <thead className="bg-slate-50 text-2xs uppercase tracking-wide text-slate-400"><tr>{b.cols.map((c, i) => <th key={c} className={cx('px-3 py-1.5 font-semibold', b.align?.[i] === 'r' ? 'text-right' : 'text-left')}>{c}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cx('px-3 py-1.5 text-slate-700', b.align?.[j] === 'r' && 'tabular text-right')}><RichText text={c} /></td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function TaskCard({ id }: { id: string }) {
  const { s } = useStore();
  const t = s.tasks.find((x) => x.id === id);
  if (!t) return null;
  return (
    <div data-task={t.status} className={cx('flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px]', t.status === 'running' ? 'border-brand-200 bg-brand-50/60' : 'border-emerald-200 bg-emerald-50/60')}>
      {t.status === 'running' ? <Loader2 size={16} className="mt-px shrink-0 animate-spin text-brand-600" /> : <CheckCircle2 size={16} className="mt-px shrink-0 text-emerald-600" />}
      <div className="min-w-0 flex-1">
        <div className="text-2xs font-semibold uppercase tracking-wide text-slate-500">{t.agent} · {t.status === 'running' ? 'working in the background' : 'done'}</div>
        <div className="text-slate-700">{t.status === 'running' ? t.text + '…' : t.result}</div>
      </div>
      {t.status === 'done' && t.to && <Link to={t.to} className="shrink-0 text-xs font-medium text-brand-700 hover:underline">Open</Link>}
    </div>
  );
}

function Answer({ r, msgId }: { r: Resp; msgId: number }) {
  const ctx = useStore();
  const nav = useNavigate();
  const [used, setUsed] = useState<Record<string, boolean>>({});
  const started = (k: string) => (k === 'start-sourcing' && ctx.s.sourcing.status !== 'idle') || (k.startsWith('start-sprint') && ctx.s.sprint.status !== 'idle');
  const act = (kind: string) => {
    if (kind.startsWith('fx:')) return runFx(ctx, kind);
    if (kind.startsWith('open:')) return nav(kind.slice(5));
    if (kind.startsWith('ask:')) return window.dispatchEvent(new CustomEvent('bw-ask', { detail: kind.slice(4) }));
    if (kind.startsWith('handoff-')) {
      const spec = HANDOFFS[kind](ctx);
      const tid = ctx.startTask(spec);
      ctx.update((d) => { d.chat.push({ id: Date.now(), role: 'task', text: spec.text, taskId: tid, at: '' }); });
      setUsed((u) => ({ ...u, [kind]: true }));
      return;
    }
    if (kind === 'approve-pr208') return runApproval(ctx, 'apr-pr208');
    if (kind === 'send-po') return sendPO(ctx);
    if (kind === 'split') return confirmSplit(ctx);
    if (kind === 'reminder1048') return reminder1048(ctx);
    if (kind === 'chase-jw') return chaseJobWorker(ctx);
    if (kind === 'start-sourcing') return startSourcing(ctx);
    if (kind.startsWith('start-sprint')) return startSprint(ctx, Number(kind.split(':')[1]) || 500000);
  };
  return (
    <div className="fadein space-y-2.5" data-answer={msgId}>
      {r.title && <div className="text-[15px] font-semibold leading-snug tracking-tight text-slate-900">{r.title}</div>}
      {r.blocks.map((b, i) => b.type === 'data' ? <DataView key={i} r={b.r} msgId={msgId} idx={i} /> : b.type === 'mod' ? <ModCardView key={i} c={b.c} msgId={msgId} idx={i} /> : <BlockView key={i} b={b} />)}
      {r.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-2xs text-slate-400">
          <Database size={12} /> Based on
          {r.sources.map((x) => <Link key={x.label} to={x.to} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700">{x.label}</Link>)}
        </div>
      )}
      {(r.actions.length > 0 || r.links.length > 0) && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {r.actions.map((a) => (
            <Button key={a.kind} size="sm" data-action={a.kind} variant={a.primary ? 'primary' : 'secondary'} disabled={used[a.kind] || started(a.kind)} icon={a.kind.startsWith('handoff') ? <Bot size={13} /> : undefined} onClick={() => act(a.kind)}>
              {used[a.kind] ? 'Handed off' : started(a.kind) ? 'Approved – agent working' : a.label}
            </Button>
          ))}
          {r.links.map((l) => <Button key={l.to} size="sm" variant="ghost" icon={<CornerDownRight size={13} />} onClick={() => nav(l.to)}>{l.label}</Button>)}
        </div>
      )}
    </div>
  );
}

/** Chat state for Home: one composer value, one in-flight question. The routing below is unchanged from the original Home chat. */
export function useChat() {
  const { s, update } = useStore();
  const [q, setQ] = useState('');
  const [thinking, setThinking0] = useState<string | null>(null);
  const [stage, setStage] = useState('');
  const timers = useRef<number[]>([]);
  const setThinking = (v: string | null, label = '', later?: [number, string]) => { timers.current.forEach(clearTimeout); timers.current = []; setThinking0(v); setStage(label); if (v && later) timers.current.push(window.setTimeout(() => setStage(later[1]), later[0])); };
  const ask = (text: string) => {
    const t = text.trim();
    if (!t || thinking) return false;
    setQ('');
    update((d) => { d.chat.push({ id: Date.now(), role: 'user', text: t, at: '' }); });
    setThinking(t);
    const put0 = (resp: Resp) => { update((d) => { d.chat.push({ id: Date.now() + 1, role: 'system', text: '', resp, at: '' }); }); setThinking(null); };
    // Data commands (add / receive / update / view / insights): the AI turns the message into a tool call, rules fill the gaps,
    // and the answer is structured UI that ends in a confirm card before anything changes.
    // Any question about business data → a visual card (KPIs, charts, tables, status items), never bullet text.
    // Conversation context: a reply to the card or question just above is an ANSWER, not a new question – no instant keyword card may hijack it.
    if (!FACTORY) { const p1 = asAgent(() => p1Answer(t, (k) => can(s, k))); if (p1) { put0({ title: '', blocks: [{ type: 'data', r: p1 }], sources: [], actions: [], links: [] }); return true; } } // P1/P2 module commands (BOM, QC, bank/TDS, expenses, dispatch, alerts, documents)
    const lastAi = [...s.chat].reverse().find((m) => m.role === 'system' && m.resp);
    const lastIdx = lastAi ? s.chat.indexOf(lastAi) : -1;
    const pendIdx = lastAi?.resp ? lastAi.resp.blocks.findIndex((b) => b.type === 'data' && 'status' in b.r && b.r.status === 'pending' && (b.r.kind === 'add_person' || b.r.kind === 'add_supplier')) : -1;
    const asked = !!lastAi?.resp && pendIdx < 0 && lastAi.resp.blocks.some((b) => b.type === 'ask' || (b.type === 'md' && /\?\s*(\n|$)/.test(b.text)) || (b.type === 'data' && b.r.kind === 'notfound' && /\?/.test(b.r.headline)));
    const answers = looksLikeAnswers(t);
    const fresh = !answers && /^(show|list|add|update|change|create|hire|onboard|what|who|how|why|when|which|where|hi|hey|hello|need|i need|mark|received|get|find|give)\b/i.test(t);
    let followUp = false;
    // Factory edition: answer from factory data with one-tap proposals; anything else goes to the AI with the factory context (no main-app cards).
    if (FACTORY) { const fr = factoryRespond(t); if (fr) setTimeout(() => put0(fr), 400); else normal(); return true; }
    const putMod = (c: ModCard) => put0({ title: '', blocks: [{ type: 'mod', c }], sources: [], actions: [], links: [] });
    // A pending AI action card (payroll, users, approvals, GST, leave…) takes the follow-up as its answer.
    const modPend = lastAi?.resp ? lastAi.resp.blocks.findIndex((b) => b.type === 'mod' && b.c.status === 'pending' && b.c.kind === 'action') : -1;
    if (modPend >= 0 && !(fresh && modIntent(t, s))) {
      const b = lastAi!.resp!.blocks[modPend] as Extract<Block, { type: 'mod' }>;
      const next = fillCard(b.c, t, s);
      if (next) { update((d) => { const bb = d.chat.find((x) => x.id === lastAi!.id)?.resp?.blocks[modPend]; if (bb && bb.type === 'mod') bb.c.status = 'replaced'; }); putMod(next); return true; }
    }
    // Role scope: politely refuse anything outside the signed-in role's modules (Owner sees all).
    const rulesTool = parseRules(t)?.tool || '';
    const sk = scopeOf(t) || ({ add_person: 'people', add_supplier: 'suppliers', receive_stock: 'inventory' } as Record<string, string>)[rulesTool];
    if (sk && !can(s, sk)) { putMod(denied(s, sk)); return true; }
    const mc = !(pendIdx >= 0 && !fresh) ? modIntent(t, s) : null;
    if (mc) { putMod(can(s, mc.module) ? mc : denied(s, mc.module)); return true; }
    if (pendIdx >= 0 && !fresh) {
      const b = lastAi!.resp!.blocks[pendIdx] as Extract<Block, { type: 'data' }>;
      const next = mergeAnswers(b.r, t, s);
      if (next) {
        update((d) => { const m = d.chat.find((x) => x.id === lastAi!.id); const bb = m?.resp?.blocks[pendIdx]; if (bb && bb.type === 'data' && 'status' in bb.r) bb.r = { ...bb.r, status: 'replaced' } as typeof bb.r; });
        put0({ title: '', blocks: [{ type: 'data', r: next }], sources: [], actions: [], links: [] }); return true;
      }
    }
    if (asked && !fresh) {
      const prevUser = [...s.chat.slice(0, lastIdx)].reverse().find((m) => m.role === 'user')?.text || '';
      const combined = prevUser ? `${prevUser}\n${t}` : t;
      const ci = prevUser ? parseRules(combined) : null;
      if (ci && ['add_person', 'add_supplier', 'receive_stock', 'update_record'].includes(ci.tool)) { put0({ title: '', blocks: [{ type: 'data', r: build(ci, s, 'rules', combined) }], sources: [], actions: [], links: [] }); return true; }
      followUp = true;
    }
    if (answers && !looksLikeData(t)) followUp = true;
    if (followUp) { normal(); return true; }
    const pre = parseRules(t);
    const mutation = pre && ['add_person', 'add_supplier', 'receive_stock', 'update_record'].includes(pre.tool);
    const dom = !mutation && (!/\b(suppliers?|vendors?)\b/i.test(t) || /\b(rejections?|quality|defects?)\b/i.test(t)) ? domainOf(t, s) : null;
    if (dom && !can(s, DOMAIN_MODULE[dom.domain] || dom.domain)) { putMod(denied(s, DOMAIN_MODULE[dom.domain] || dom.domain)); return true; }
    if (dom) {
      const base = domainView(dom.domain, s, dom.name);
      const show = (r: unknown) => put0({ title: '', blocks: [{ type: 'data', r: r as never }], sources: [], actions: [], links: [] });
      if (!isSpecific(t) && base) { show(base); return true; }
      // Specific / unpredictable question: the AI designs the card from a compact data snapshot; every number is checked against it.
      setThinking(t, 'Building your view…', [3500, 'Crunching the numbers…']);
      const snap = snapshot(s, dom.domain);
      const timeout = new Promise<null>((res) => setTimeout(() => res(null), 9000));
      Promise.race([live.view(t, snap).catch(() => null), timeout]).then((g) => {
        const v = g && (g as GenBlock).headline ? validateView(g as GenBlock, snap, dom.domain, t) : null;
        const fb = base || domainView('business', s);
        if (v) show(v); else if (fb) show(fb); else { setThinking(null); setTimeout(() => normal(), 0); }
      });
      return true;
    }
    if (looksLikeData(t)) {
      setThinking(t, 'Understanding your request…', [2500, 'Reading the details – almost there…']);
      const rules = parseRules(t);
      // The AI gets ~4 s; after that the built-in parser answers so the chat never sits waiting.
      const timeout = new Promise<null>((res) => setTimeout(() => res(null), rules ? 4000 : 6000));
      Promise.race([live.intent(t, catalog(s)).catch(() => null), timeout]).then((a) => {
        const llm = a && a.tool && a.tool !== 'none' ? (a as unknown as DataIntent) : null;
        const { intent, via } = merge(llm, rules);
        if (intent) return put0({ title: '', blocks: [{ type: 'data', r: build(intent, s, via, t) }], sources: [], actions: [], links: [] });
        setThinking(null); setTimeout(() => normal(), 0);
      }).catch(() => put0({ title: '', blocks: [{ type: 'data', r: { kind: 'notfound', via: 'rules', headline: 'Something went wrong while preparing that – nothing was changed.', detail: 'Try again, or rephrase it, e.g. “Change Deccan Castings area to Nampally”.', actions: [{ label: 'Try again', kind: `ask:${t}`, primary: true }] } }], sources: [], actions: [], links: [] }));
      return true;
    }
    normal();
    return true;
    function normal() {
    setThinking(t, '', [9000, 'Still working – the AI is a little slow right now…']);
    const r = respond(t, s);
    const put = (resp: Resp) => { update((d) => { d.chat.push({ id: Date.now() + 1, role: 'system', text: '', resp, at: '' }); }); setThinking(null); };
    // General questions (date/time, maths, GST calculations, definitions, supplier list, off-topic) go to the AI even if a keyword matches a canned card.
    const general = /\d+(\.\d+)?\s?%\s*(of|gst|on)\b|\b(calculate|what is|what's|whats|define|meaning of)\b(?!.*\b(so-|inv-|pr-|po-))|\b(today'?s date|what (day|date|time)|diwali|holiday|festival|joke)\b|who are (my|our) suppliers|list (my|our|all) suppliers|\b(python|code|insurance|invest)/i.test(t);
    const isLive = r.blocks.some((b) => b.type === 'live'); const generic = general || r.title === 'Here is what I can help with';
    if (!followUp && !isLive && !generic) { setTimeout(() => put(r), 450); return; } // a known business question: answer from the data
    // Everything else goes through the AI first: small talk, questions, vague and clear sourcing needs.
    const LN = { en: '', hi: 'Hindi (Devanagari script)', te: 'Telugu (Telugu script)' }[s.lang];
    const context = (FACTORY ? factoryContext() : bizContext(s)) + `\nSigned-in user: ${ROLE_USER[roleOf(s)].name}, role ${roleOf(s)}. They may only see: ${MODULES.filter((m) => can(s, m.key)).map((m) => m.label.en).join(', ')}. If asked about anything else, reply: "Not in your access – ask an admin."` + (LN ? `\nIMPORTANT: Reply in ${LN}.` : '');
    const history = s.chat.slice(-12).flatMap((m): Turn[] => m.role === 'user' ? [{ role: 'user' as const, text: m.text }] : m.resp ? [{ role: 'ai' as const, text: [m.resp.title, ...m.resp.blocks.map((b) => ('text' in b ? b.text : b.type === 'data' ? b.r.headline : b.type === 'mod' ? b.c.headline + (b.c.fields ? ' Fields: ' + b.c.fields.map((f) => `${f.label}=${f.value || '?'}`).join(', ') : '') : b.type === 'ask' ? 'Asked: ' + b.items.map((x) => x.q).join(' / ') : ''))].filter(Boolean).join(' ').slice(0, 300) }] : []);
    // If the connection drops, keep the message and try again once it's back (the Reconnecting pill shows meanwhile).
    const assist = async (): Promise<Intent> => { for (let k = 0; ; k++) { try { return await live.assist(t, context, history); } catch (e) { if (!(e instanceof Offline) || k >= 20) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
    const cap = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('slow')), 25000));
    Promise.race([assist(), cap]).then((a) => {
      if (a.kind === 'sourcing') return put({ title: 'Checking live stock and your suppliers', blocks: [{ type: 'live', text: t }], sources: [], actions: [], links: [{ label: 'Open Live sourcing', to: '/sourcing/live' }] });
      put({ title: '', blocks: [{ type: 'md', at: Date.now(), text: a.reply }, ...(a.questions.length ? [{ type: 'ask' as const, items: a.questions }] : [])], sources: [], actions: [], links: a.kind === 'greeting' ? [{ label: 'Live sourcing', to: '/sourcing/live' }, { label: 'Approvals', to: '/approvals' }] : [] });
    }).catch(() => put(generic || isLive ? { title: '', blocks: [{ type: 'text', text: "That took too long – I couldn't reach the AI just now. Nothing was sent or changed." }, ...(isLive ? [] : r.blocks)], sources: [], actions: [{ label: 'Try again', kind: `ask:${t}`, primary: true }], links: [] } : r));
    }
  };
  const askRef = useRef(ask); askRef.current = ask;
  useEffect(() => { const h = (e: Event) => askRef.current(String((e as CustomEvent).detail || '')); window.addEventListener('bw-ask', h); return () => window.removeEventListener('bw-ask', h); }, []);
  useEffect(() => { const h = (e: Event) => { const line = String((e as CustomEvent).detail || ''); setQ((v) => (v.trim() ? v.replace(/\s*$/, '\n') : '') + line); }; window.addEventListener('bw-fill', h); return () => window.removeEventListener('bw-fill', h); }, []);
  return { q, setQ, ask, thinking, stage };
}
export type Chat = ReturnType<typeof useChat>;

/** Voice input: Web Speech API (en-IN). The transcript lands in the box for editing; it never sends by itself. */
type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
function useVoice(q: string, setQ: (v: string) => void) {
  const { toast } = useStore();
  const [on, setOn] = useState(false);
  const rec = useRef<SR | null>(null);
  const base = useRef('');
  const stop = () => { rec.current?.stop(); };
  const start = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const langRef = { current: (JSON.parse(localStorage.getItem('business-workspace-demo-v5') || '{}').lang || 'en') as string };
    const C = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!C) { toast('Voice input needs Chrome, Edge or Safari – you can type instead', 'amber'); return; }
    const r = new C(); r.lang = ({ en: 'en-IN', hi: 'hi-IN', te: 'te-IN' } as Record<string, string>)[langRef.current] || 'en-IN'; r.interimResults = true; r.continuous = true;
    base.current = q ? q.replace(/\s*$/, ' ') : '';
    let fin = '';
    r.onresult = (e) => { let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const x = e.results[i]; if (x.isFinal) fin += x[0].transcript + ' '; else interim += x[0].transcript; } setQ((base.current + fin + interim).replace(/\s+/g, ' ').trim()); };
    r.onerror = (e) => { if (e.error === 'not-allowed') toast('Microphone permission was blocked', 'amber'); };
    r.onend = () => { setOn(false); rec.current = null; };
    rec.current = r; r.start(); setOn(true);
  };
  return { on, start, stop, toggle: () => (on ? stop() : start()) };
}
function MicButton({ v }: { v: ReturnType<typeof useVoice> }) {
  return <button type="button" data-testid="composer-mic" aria-label={v.on ? 'Stop voice input' : 'Speak your message'} aria-pressed={v.on} onClick={v.toggle}
    className={cx('mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition', v.on ? 'bg-rose-500 text-white shadow-[0_0_0_6px_rgba(244,63,94,.15)]' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}>{v.on ? <Square size={14} fill="currentColor" /> : <Mic size={18} />}</button>;
}

/** ChatGPT-style composer: grows with the text, Enter sends, Shift+Enter adds a line. */
export function Composer({ chat, big, placeholder = 'Ask anything or tell me what to source…', inputRef, footer }: { chat: Chat; big?: boolean; placeholder?: string; inputRef?: React.RefObject<HTMLTextAreaElement>; footer?: React.ReactNode }) {
  const own = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef || own;
  const { q, setQ, ask, thinking } = chat;
  useEffect(() => { const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 220) + 'px'; }, [q, ref]);
  const send = () => { voice.stop(); ask(q); };
  const voice = useVoice(q, setQ);
  const mic = <MicButton v={voice} />;
  return (
    <form data-testid="command-bar" onSubmit={(e) => { e.preventDefault(); send(); }} className={cx('ask-field relative rounded-[22px] bg-white transition', big ? 'px-4 pb-3 pt-3.5 md:px-5' : 'px-3 py-2')}>
      <div className="flex items-end gap-2">
        {!big && <Sparkles size={18} className="mb-2.5 shrink-0 text-brand-600" aria-hidden />}
        <textarea ref={ref} data-testid="composer" rows={1} value={q} aria-label="Message Workspace AI" onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
          placeholder={placeholder} className={cx('min-w-0 flex-1 resize-none bg-transparent leading-relaxed text-slate-900 outline-none placeholder:text-slate-400', big ? 'min-h-[56px] py-1 text-[16px] md:text-[17px]' : 'max-h-[220px] py-2 text-[15px]')} />
        {!big && mic}
        {!big && <button type="submit" data-testid="composer-send" aria-label="Send" disabled={!q.trim() || !!thinking} className="btn-primary mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition">{thinking ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={17} />}</button>}
      </div>
      {voice.on && <div data-testid="voice-live" className="mt-1 flex items-center gap-2 text-[12px] text-rose-600"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" /></span>Listening… speak in English, Hindi or Telugu-English. Tap the mic to stop, then edit and send.</div>}
      {big && (
        <div className="mt-2 flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate text-[12px] text-slate-400">{footer}</div>
          {mic}
          <kbd className="hidden rounded-md border border-slate-200 px-1.5 py-0.5 text-2xs text-slate-400 sm:inline">Enter ↵</kbd>
          <button type="submit" data-testid="composer-send" aria-label="Send" disabled={!q.trim() || !!thinking} className="btn-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition">{thinking ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={17} />}</button>
        </div>
      )}
    </form>
  );
}

/** The message thread. AI turns sit on the page like ChatGPT; your turns are bubbles on the right. */
export function Thread({ thinking, stage }: { thinking: string | null; stage?: string }) {
  const { s } = useStore();
  const endRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(-1);
  useEffect(() => {
    if (s.chat.length !== prevLen.current || thinking) endRef.current?.scrollIntoView({ behavior: prevLen.current < 0 ? 'auto' : 'smooth', block: 'end' });
    prevLen.current = s.chat.length;
  }, [s.chat.length, thinking]);
  const Avatar = () => <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grad text-white shadow-glow"><Sparkles size={14} /></div>;
  return (
    <div id="conversation" className="space-y-6" data-testid="chat-thread" aria-live="polite">
      {s.chat.map((m) =>
        m.role === 'user' ? (
          <div key={m.id} className="fadein flex justify-end" data-msg="user"><div className="max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-br-md bg-slate-100 px-4 py-2.5 text-[14.5px] leading-relaxed text-slate-900 md:max-w-[75%]">{m.text}</div></div>
        ) : m.role === 'outreach' ? (
          <div key={m.id} className="ml-11"><OutreachLive flow={m.flow!} /></div>
        ) : m.role === 'task' ? (
          <div key={m.id} className="ml-11 max-w-[90%]"><TaskCard id={m.taskId!} /></div>
        ) : (
          <div key={m.id} className="flex gap-3" data-msg="ai">
            <Avatar />
            <div className="min-w-0 flex-1 pt-1">{m.resp && <Answer r={m.resp} msgId={m.id} />}</div>
          </div>
        ),
      )}
      {thinking && (
        <div className="flex gap-3" data-thinking>
          <Avatar />
          <div className="flex items-center gap-3 pt-2 text-[13.5px] text-slate-500"><span className="typing flex gap-1"><span /><span /><span /></span> <span data-testid="thinking-stage">{stage || 'Thinking – checking orders, stock, suppliers and finance…'}</span></div>
        </div>
      )}
      <div ref={endRef} className="h-1" />
    </div>
  );
}
