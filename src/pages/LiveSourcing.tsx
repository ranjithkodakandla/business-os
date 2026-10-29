import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Package, Wrench, Hammer, HardHat, Layers, Truck as TruckIcon, Box } from 'lucide-react';
import { Mail, MessageCircle, PhoneCall, Send, Inbox, Lightbulb, CheckCircle2, Loader2, RotateCcw, Award, FileCheck2, Plug, Radio, AlertTriangle, Phone, PackageSearch, ShieldCheck, Bot, Sparkles, HelpCircle, Check as CheckIcon, ListChecks, RefreshCw } from 'lucide-react';
import { useStore } from '../lib/store';
import { live, netState, Offline, Run, Out, Check, Turn, Status, Channel, landed, inrs, fmtDay, fmtTime, maskTo, priceText, SAMPLE_REQUESTS } from '../lib/live';
import { PageHeader, Card, Button, Badge, cx } from '../components/ui';
import { Md } from '../components/Md';
import { bizContext } from '../lib/bizContext';

const chIcon = (c: Channel, size = 13) => (c === 'WhatsApp' ? <MessageCircle size={size} className="text-emerald-600" /> : c === 'Email' ? <Mail size={size} className="text-sky-600" /> : <PhoneCall size={size} className="text-violet-600" />);
const CH_TILE: Record<Channel, string> = { WhatsApp: 'bg-emerald-50 text-emerald-600 ring-emerald-500/20', Email: 'bg-sky-50 text-sky-600 ring-sky-500/20', Call: 'bg-violet-50 text-violet-600 ring-violet-500/20' };
const ChTile = ({ c, size = 34 }: { c: Channel; size?: number }) => <span className={cx('grid shrink-0 place-items-center rounded-xl ring-1 ring-inset', CH_TILE[c])} style={{ width: size, height: size }}>{chIcon(c, Math.round(size * 0.45))}</span>;
const Avatar = ({ letter, best }: { letter: string; best?: boolean }) => <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold', best ? 'bg-grad text-white shadow-glow' : 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200')}>{letter}</span>;
const chName = (c: Channel) => (c === 'Call' ? 'AI voice call' : c);
export const ModeBadge = ({ mode }: { mode: string }) => mode === 'real'
  ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"><Radio size={10} />LIVE</span>
  : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">SIMULATED</span>;
const ChBadge = ({ c, mode }: { c: Channel; mode: string }) => <span className="inline-flex items-center gap-1.5"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-700">{chIcon(c, 11)}{chName(c)}</span><ModeBadge mode={mode} /></span>;
const ParserBadge = ({ p }: { p: 'llm' | 'rules' }) => p === 'llm' ? <span className="inline-flex items-center gap-1 rounded-full bg-grad px-2 py-0.5 text-2xs font-semibold text-white"><Sparkles size={10} />AI</span> : <Badge tone="gray">rules</Badge>;
const canDoText = (c?: string, a?: boolean | null) => (c === 'yes' ? 'Yes' : c === 'no' ? 'No' : c === 'partial' ? 'Partly' : a === false ? 'No' : a ? 'Yes' : 'Unclear');

function StockTiles({ st, needBy, qty }: { st: NonNullable<Check['stock']>; needBy: string | null; qty: number }) {
  const short = st.shortUnits > 0;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="live-stock">
      <Tile label="You need" value={`${(qty || st.needUnits).toLocaleString('en-IN', { maximumFractionDigits: 1 })} ${st.askUnit}`} sub={`by ${fmtDay(needBy)}`} />
      <Tile label="On hand" value={`${st.onHand} ${st.unit}`} sub={`${st.reserved} reserved for orders`} />
      <Tile label="Free now" value={`${st.free} ${st.unit}`} sub={st.askUnit !== st.unit ? `≈ ${st.freeInAskUnit.toLocaleString('en-IN')} ${st.askUnit}` : 'live from Inventory'} />
      <Tile label={short ? 'Short' : 'Covered'} value={short ? `${st.askQty.toLocaleString('en-IN')} ${st.askUnit}` : 'Yes'} sub={short ? 'to buy now' : 'no purchase needed'} tone={short ? 'red' : 'green'} />
    </div>
  );
}
const Tile = ({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'red' | 'green' }) => (
  <div className={cx('rounded-lg border p-2.5', tone === 'red' ? 'border-rose-200 bg-rose-50/60' : tone === 'green' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white')}>
    <div className="text-2xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
    <div className={cx('text-[15px] font-semibold', tone === 'red' ? 'text-rose-700' : 'text-slate-900')}>{value}</div>
    {sub && <div className="text-2xs text-slate-500">{sub}</div>}
  </div>
);
const facts = (r: Check['request']) => [r.qty ? `${r.qty.toLocaleString('en-IN')} ${r.qty === 1 ? (r.unit || '').replace(/s$/, '') : r.unit}`.trim() : '', r.needBy ? `by ${fmtDay(r.needBy)}` : '', r.location || '', r.targetPrice ? `target ₹${Math.round(r.targetPrice).toLocaleString('en-IN')}` : ''].filter(Boolean).join(' · ');

/** Shown inside the AI chat and on the agent page: understand the requirement, preview the enquiry, approve to send to all suppliers. */
export function LiveCheck({ text, onRefine, history, onNext, onResult }: { text: string; onRefine?: (t: string) => void; history?: Turn[]; onNext?: (t: string) => void; onResult?: (c: Check) => void }) {
  const { s } = useStore(); const nav = useNavigate();
  const [c, setC] = useState<Check | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [enquiry, setEnquiry] = useState(''); const [extra, setExtra] = useState(''); const [cur, setCur] = useState(text); const [tries, setTries] = useState(0); const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setC(null); setErr(''); live.check(cur, s.skus, history, bizContext(s)).then((r) => { setC(r); setEnquiry(r.ask.enquiry); onResult?.(r); }).catch((e) => setErr(String(e.message || e))); }, [cur, tries]);
  // A failed check keeps the message and retries by itself once the connection is back (or on tap).
  useEffect(() => { if (!err) return; const t = window.setInterval(() => { if (netState.get() === 'ok') setTries((n) => n + 1); }, 3000); return () => window.clearInterval(t); }, [err]);
  if (err) return <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-600" data-testid="live-check-retry"><span className="typing flex gap-1"><span /><span /><span /></span> Waiting for the connection – I'll pick this up as soon as it's back.<button className="ml-auto text-brand-600 underline" onClick={() => setTries((n) => n + 1)}>Retry now</button></div>;
  if (!c) return <div className="space-y-2.5" data-testid="live-check-loading"><div className="flex items-center gap-2 text-[13px] text-slate-500"><span className="typing flex gap-1"><span /><span /><span /></span> AI is thinking…</div><div className="skeleton h-5 w-2/5" /><div className="skeleton h-16 w-full" /><div className="grid gap-2 sm:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14" />)}</div></div>;
  const go = async () => { setBusy(true); try { const r = await live.start(cur, s.skus, enquiry); nav(`/sourcing/live/${r.id}`); } catch (e) { setErr(String((e as Error).message)); setBusy(false); } };
  const refine = () => { const t = `${cur.replace(/[.\s]+$/, '')}. ${extra.trim()}`; setExtra(''); setCur(t); onRefine?.(t); };
  const plan = c.status === 'in-stock' || c.status === 'chat' || c.status === 'clarify' ? [] : c.plan;
  if (c.status === 'chat' || c.status === 'clarify') return <AiReply c={c} cur={cur} onNext={(t, merged) => { if (onNext) return onNext(t); setCur(merged); onRefine?.(merged); }} />;
  return (
    <div className="fadein space-y-3" data-testid="live-check">
      <div className="flex flex-wrap items-center gap-2 text-[17px] font-semibold tracking-tight text-slate-900">{c.status === 'in-stock' ? `Yes, we have it – ${c.stock!.name}` : c.stock ? `Short ${c.stock.askQty.toLocaleString('en-IN')} ${c.stock.askUnit} of ${c.stock.name}` : c.ask.title}</div>
      {facts(c.request) && <div className="text-[12.5px] text-slate-500">{facts(c.request)}</div>}
      {c.stock && <StockTiles st={c.stock} needBy={c.request.needBy} qty={c.request.qty} />}
      {c.status === 'needs-info' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px]" data-testid="live-clarify">
          <div className="flex items-start gap-1.5 font-medium text-amber-900"><HelpCircle size={14} className="mt-0.5 shrink-0" />{c.note}</div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (extra.trim()) refine(); }}>
            <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Your answer" className="h-8 flex-1 rounded-md border border-amber-300 bg-white px-2" data-testid="live-clarify-input" />
            <Button size="sm" variant="primary" type="submit" disabled={!extra.trim()}>Add</Button>
          </form>
        </div>
      ) : c.status === 'in-stock' ? <p className="text-[14px] text-slate-600">{c.note}</p> : null}
      {plan.length > 0 && <>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-2 flex items-center justify-between text-[13px] text-slate-500"><span>{c.request.parser === 'llm' ? 'Enquiry written by AI' : 'Your enquiry'} – you can edit it</span></div>
          <textarea ref={ta} value={enquiry} onChange={(e) => setEnquiry(e.target.value)} rows={Math.min(8, 2 + Math.ceil(enquiry.length / 90))} className="w-full resize-none rounded-lg border border-transparent bg-transparent p-0 text-[15px] leading-relaxed text-slate-800 outline-none focus:border-brand-300 focus:bg-white focus:p-2 dark:focus:bg-transparent" data-testid="live-enquiry" />
        </div>
        <div className="flex items-center gap-3" data-testid="live-plan">
          <div className="flex gap-1">{plan.map((p) => <span key={p.letter} title={`${p.supplier} · ${p.person} · ${chName(p.channel)}`}><Who o={p} size={32} /></span>)}</div>
          <span className="text-[13px] text-slate-500">{plan.length} suppliers · {[...new Set(plan.map((p) => p.channel === 'Call' ? 'AI phone call' : p.channel))].join(', ')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3"><Button variant="primary" className="h-11 px-5 text-[14px]" data-testid="live-approve" disabled={busy || !enquiry.trim()} icon={busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} onClick={go}>{`Send to ${plan.length} suppliers`}</Button><Button className="h-11 px-4 text-[14px]" onClick={() => ta.current?.focus()}>Edit</Button><span className="text-[12px] text-slate-500">Nothing is ordered without you.</span></div>
      </>}
    </div>
  );
}

const TRY = ['500 kg MS sheet 2mm by Friday', '10-ton truck Hyderabad to Pune on Friday', '6 helpers for loading tomorrow 8 am, Jeedimetla'];
/** Small talk, questions and vague needs: a friendly AI reply, never an enquiry. Vague needs get tappable answers that are merged into the request. */
function AiReply({ c, cur, onNext }: { c: Check; cur: string; onNext: (said: string, merged: string) => void }) {
  const qs = c.intent?.questions || []; const [ans, setAns] = useState<string[]>(qs.map(() => '')); const [more, setMore] = useState('');
  const merged = [cur.replace(/[.\s]+$/, ''), ...ans.filter(Boolean), more.trim()].filter(Boolean).join(', ');
  const ready = c.status === 'clarify' && (ans.some(Boolean) || more.trim());
  return (
    <div className="fadein space-y-3" data-testid="ai-reply">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white"><Sparkles size={15} /></div>
        <Md text={c.note} typed className="pt-1 text-[15px] leading-relaxed text-slate-800" />
      </div>
      {c.status === 'clarify' ? (
        <div className="space-y-2.5 pl-10" data-testid="ai-questions">
          {qs.map((q, i) => (
            <div key={i}><div className="mb-1 text-[12.5px] font-medium text-slate-600">{q.q}</div>
              <div className="flex flex-wrap gap-1.5">{q.options.map((o) => <button key={o} type="button" data-chip-answer onClick={() => setAns((a) => a.map((x, j) => (j === i ? (x === o ? '' : o) : x)))} className={cx('rounded-full border px-3 py-1 text-[12.5px] transition', ans[i] === o ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300')}>{o}</button>)}</div>
            </div>))}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (ready) onNext([...ans.filter(Boolean), more.trim()].filter(Boolean).join(', '), merged); }}>
            <input value={more} onChange={(e) => setMore(e.target.value)} placeholder="Or type details (qty, spec, date, place)" className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-2.5 text-[13px]" data-testid="ai-more" />
            <Button variant="primary" type="submit" disabled={!ready} data-testid="ai-draft">Draft enquiry</Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 pl-10">{TRY.map((t) => <button key={t} type="button" onClick={() => onNext(t, t)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12.5px] text-slate-700 hover:border-brand-300">{t}</button>)}</div>
      )}
    </div>
  );
}

const STAGES: Record<Channel, { key: string[]; label: string }[]> = {
  Email: [{ key: ['sent'], label: 'Sent' }, { key: ['delivered'], label: 'Delivered' }, { key: ['replied'], label: 'Replied' }, { key: ['parsed'], label: 'Captured' }],
  WhatsApp: [{ key: ['sent'], label: 'Sent' }, { key: ['delivered', 'read'], label: 'Delivered' }, { key: ['replied'], label: 'Replied' }, { key: ['parsed'], label: 'Captured' }],
  Call: [{ key: ['sent'], label: 'Dialling' }, { key: ['answered', 'delivered'], label: 'Answered' }, { key: ['replied'], label: 'Answers' }, { key: ['parsed'], label: 'Captured' }],
};
function Steps({ o }: { o: Out }) {
  const at = (keys: string[]) => o.timeline.find((t) => keys.includes(t.stage));
  const bad = o.timeline.find((t) => t.stage === 'failed' || t.stage === 'blocked');
  const waiting = !at(['replied']) && !bad;
  return (
    <div>
      <div className="flex items-center gap-1" data-testid={`steps-${o.letter}`}>
        {STAGES[o.channel].map((s, i) => { const t = at(s.key); return (
          <div key={s.label} className="flex flex-1 items-center gap-1">
            <div className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold', t ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500')}>{t ? <CheckCircle2 size={12} /> : i + 1}</div>
            <div className="min-w-0 leading-tight"><div className={cx('text-[11px] font-medium', t ? 'text-slate-800' : 'text-slate-400')}>{s.label}</div><div className="text-[10px] text-slate-400">{t ? fmtTime(t.at) : ''}</div></div>
          </div>); })}
      </div>
      {bad && <div className="mt-1.5 flex items-start gap-1 text-2xs text-rose-600"><AlertTriangle size={12} className="mt-px shrink-0" />{bad.note}</div>}
      {waiting && at(['sent']) && <div className="mt-1.5 flex items-center gap-1 text-2xs text-slate-500"><Loader2 size={11} className="animate-spin" /> Waiting for {o.person.split(' ')[0]}'s reply{o.mode === 'real' ? ' – checking every few seconds' : ''}</div>}
    </div>
  );
}


/** Plain-English delivery state for one supplier. */
function stateOf(o: Out): { label: string; tone: 'green' | 'amber' | 'red' | 'blue' | 'gray' } {
  const st = o.timeline.map((t) => t.stage);
  if (o.replies.length) return { label: 'Replied', tone: 'green' };
  const last = [...o.timeline].reverse().find((t) => ['retrying', 'failed', 'sent', 'answered', 'ringing'].includes(t.stage));
  if (o.channel === 'Call' && last?.stage === 'retrying') return { label: (last.note || 'Retrying').replace(/ in \d+ s$/, ''), tone: 'amber' };
  if (o.channel === 'Call' && last?.stage === 'failed' && last.note) return { label: /^Screened/.test(last.note) ? 'Screened – no answer' : /^No answer/.test(last.note) ? 'No answer' : 'Call failed', tone: 'red' };
  if (o.channel === 'Call' && last && last.stage !== 'failed' && st.includes('retrying')) return { label: last.stage === 'answered' ? 'Waiting for reply' : 'Redialling', tone: 'amber' };
  if (st.some((x) => x === 'failed' || x === 'blocked')) return { label: 'Not delivered', tone: 'red' };
  if (st.some((x) => ['delivered', 'read', 'answered'].includes(x))) return { label: 'Waiting for reply', tone: 'amber' };
  if (st.includes('sent')) return { label: 'Sent', tone: 'blue' };
  return { label: 'Sending…', tone: 'gray' };
}
const JOURNEY = ['Request', 'Enquiry sent', 'Replies', 'AI comparison', 'Your decision'];
function Journey({ run }: { run: Run }) {
  const sent = run.suppliers.some((o) => o.timeline.some((t) => t.stage === 'sent'));
  const replies = run.suppliers.filter((o) => o.replies.length).length;
  const acted = !!run.po || run.suppliers.some((o) => o.sent.some((m) => m.kind !== 'enquiry'));
  const done = [true, sent, replies > 0, !!run.summary, acted];
  const cur = done.indexOf(false);
  const sub = ['Understood', `${run.suppliers.length} suppliers`, `${replies} of ${run.suppliers.length} in`, run.summary ? (run.summary.parser === 'llm' ? 'by AI' : 'by rules') : 'waiting', run.po ? 'PO draft ready' : 'up to you'];
  const pct = Math.round(((done.filter(Boolean).length - 1 + (replies && replies < run.suppliers.length ? replies / run.suppliers.length - 1 : 0)) / (JOURNEY.length - 1)) * 100);
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card md:px-6" data-testid="journey">
      <div className="relative">
        <div className="absolute left-[10%] right-[10%] top-[15px] h-1 rounded-full bg-slate-100" />
        <div className={cx('absolute left-[10%] top-[15px] h-1 rounded-full transition-[width] duration-700', cur === -1 ? 'bg-grad' : 'bar-live')} style={{ width: `${Math.max(0, Math.min(100, pct)) * 0.8}%` }} />
        <ol className="relative flex" aria-label="Progress">
          {JOURNEY.map((label, i) => {
            const state = done[i] ? 'done' : i === cur ? 'now' : 'next';
            return (
              <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                <span className={cx('grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold transition', state === 'done' ? 'bg-grad text-white shadow-glow' : state === 'now' ? 'bg-white text-brand-600 ring-2 ring-brand-400 dark:bg-[#111729]' : 'bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-[#111729]')}>
                  {state === 'done' ? <CheckCircle2 size={16} /> : state === 'now' ? <Loader2 size={14} className="animate-spin" /> : i + 1}
                </span>
                <span className={cx('text-[11px] font-semibold leading-tight sm:text-[12.5px]', state === 'next' ? 'text-slate-400' : 'text-slate-900')}>{label}</span>
                <span className={cx('hidden text-2xs sm:block', state === 'now' ? 'text-brand-600' : 'text-slate-500')}>{sub[i]}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
function WhoWeAsked({ run, best }: { run: Run; best?: string }) {
  return (
    <Card title="Who we asked" subtitle="Same enquiry, each on their usual channel. Tap one to open the conversation." pad={false}>
      <ul className="p-2" data-testid="channel-status">
        {run.suppliers.map((o) => { const s = stateOf(o); const live = s.label === 'Waiting for reply' || s.label === 'Sent' || s.label === 'Sending…'; return (
          <li key={o.ref}>
            <a href={`#supplier-${o.letter}`} onClick={(e) => { e.preventDefault(); document.getElementById(`supplier-card-${o.letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50', best === o.ref && 'bg-emerald-50/60 ring-1 ring-inset ring-emerald-200')}>
              <span className="relative"><Avatar letter={o.letter} best={best === o.ref} /><span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 dark:bg-[#111729]">{chIcon(o.channel, 11)}</span></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">{o.supplier}{best === o.ref && <Badge tone="green">Recommended</Badge>}</span>
                <span className="block truncate text-2xs text-slate-500">{o.person} · {chName(o.channel)}{o.mode !== 'real' ? ' · simulated' : ''}</span>
              </span>
              <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-semibold', s.tone === 'green' ? 'bg-emerald-50 text-emerald-700' : s.tone === 'amber' ? 'bg-amber-50 text-amber-700' : s.tone === 'red' ? 'bg-rose-50 text-rose-700' : s.tone === 'blue' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600')}>
                {live ? <span className="live-dot !h-1.5 !w-1.5" /> : <CheckCircle2 size={11} />}{s.label}
              </span>
            </a>
          </li>); })}
      </ul>
    </Card>
  );
}

function QuestionBox({ o, onRun }: { o: Out; onRun: (r: Run) => void }) {
  const [text, setText] = useState(o.pending?.draft || ''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { setText(o.pending?.draft || ''); }, [o.pending?.at]);
  if (!o.pending) return null;
  const act = async (dismiss: boolean) => { setBusy(true); setErr(''); try { onRun(await live.answer(o.ref, text, dismiss)); } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); } };
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 text-[12.5px]" data-testid={`question-${o.letter}`}>
      <div className="mb-1 flex items-center gap-1.5 font-semibold text-violet-900"><HelpCircle size={13} /> {o.supplier} asks: {o.pending.questions.join(' ')} Reply?</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-md border border-violet-200 bg-white p-2 text-[12.5px]" placeholder="Type your answer" />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" data-testid={`answer-${o.letter}`} disabled={busy || !text.trim()} icon={busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} onClick={() => act(false)}>{o.channel === 'Call' ? 'Note answer for the call' : 'Approve & send reply'}</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(true)}>Dismiss</Button>
        <span className="text-2xs text-slate-500">Draft by {o.pending.drafter === 'llm' ? 'AI, from your requirement only' : 'rules'} – nothing is sent until you approve.</span>
      </div>
      {err && <div className="text-2xs text-rose-600">{err}</div>}
    </div>
  );
}

function SupplierCard({ o, run, rank, recommended, onRun }: { o: Out; run: Run; rank: number; recommended: boolean; onRun: (r: Run) => void }) {
  const [counter, setCounter] = useState<string>(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { if (o.counterPrice && !counter) setCounter(String(o.counterPrice)); }, [o.counterPrice]);
  const act = async (k: string, f: () => Promise<Run>) => { setBusy(k); setErr(''); try { onRun(await f()); } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(''); } };
  const q = o.quote; const u = q?.priceUnit || run.ask.unit || 'unit'; const last = o.sent[o.sent.length - 1];
  const row = (k: string, v: React.ReactNode) => <><span className="text-slate-500">{k}</span><span>{v}</span></>;
  return (
    <Card id={`supplier-card-${o.letter}`} className={cx('scroll-mt-20', recommended && 'ring-2 ring-emerald-400/60 glow-green')} title={<span className="flex flex-wrap items-center gap-2"><ChTile c={o.channel} size={28} />{rank >= 0 && <Badge tone={rank === 0 ? 'green' : 'gray'}>#{rank + 1}{o.score ? ` · score ${o.score}` : ''}</Badge>}<span>{o.supplier}</span>{recommended && <Badge tone="green">Recommended</Badge>}<Badge tone={stateOf(o).tone} dot>{stateOf(o).label}</Badge></span>}
      subtitle={<span className="flex flex-wrap items-center gap-x-2 gap-y-1">{o.person} · <ChBadge c={o.channel} mode={o.mode} /></span>}>
      <div data-testid={`supplier-${o.letter}`} className="space-y-3">
        <Steps o={o} />
        <div className="space-y-2.5 rounded-2xl bg-slate-50 p-3 md:p-4" data-testid={`thread-${o.letter}`}>
          <div className="flex justify-end">
            <div className="max-w-[88%] rounded-2xl rounded-br-md bg-grad px-3.5 py-2.5 text-white shadow-glow md:max-w-[75%]">
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[.08em] text-white/75"><Send size={11} /> {o.channel === 'Call' ? 'AI voice call script' : `AI sent on ${chName(o.channel)}`}{o.to && <span className="normal-case tracking-normal text-white/60">→ {maskTo(o.to)}</span>}</div>
              {last?.subject && <div className="mb-1 text-[12.5px] font-semibold">{last.subject}</div>}
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed">{last?.body || '—'}</pre>
              {o.sent.length > 1 && <div className="mt-1 text-2xs text-white/70">{o.sent.length} messages sent (latest shown)</div>}
            </div>
          </div>
          {o.replies.length ? o.replies.map((r, i) => (
            <div key={i} className="fadein flex items-end gap-2">
              <Avatar letter={o.letter} />
              <div className={cx('max-w-[88%] rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm md:max-w-[75%]', o.channel === 'WhatsApp' ? 'border border-emerald-200/70 bg-[#e7fbe9] dark:bg-emerald-500/10' : o.channel === 'Call' ? 'border border-violet-200/70 bg-violet-50' : 'border border-slate-200/80 bg-white')}>
                <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[.08em] text-slate-500">{chIcon(o.channel, 11)}{o.channel === 'Call' ? 'Call transcript' : o.channel === 'Email' ? `Email from ${o.person}` : o.person}<span className="normal-case tracking-normal text-slate-400">· {fmtTime(r.at)}{r.simulated ? ' · simulated' : ''}</span></div>
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-800">{o.channel === 'Call' ? `“${r.text}”` : r.text}</pre>
              </div>
            </div>)) : (
            <div className="flex items-center gap-2 pl-1 text-[12.5px] text-slate-500"><Avatar letter={o.letter} /><span className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-dashed border-slate-300 bg-white px-3 py-2 dark:bg-transparent"><span className="typing flex gap-1"><span /><span /><span /></span>Waiting for {o.person.split(' ')[0]}…</span></div>
          )}
        </div>
        {q && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 p-3.5" data-testid={`captured-${o.letter}`}>
              <div className="mb-1.5 flex items-center justify-between text-2xs font-semibold uppercase text-slate-500"><span className="flex items-center gap-1.5"><CheckCircle2 size={12} /> Captured by {q.parser === 'llm' ? 'AI' : 'rules'}</span><Badge tone={q.confidence >= 85 ? 'green' : 'amber'}>confidence {q.confidence}%</Badge></div>
              {q.summary && <div className="mb-2.5 flex gap-2 rounded-lg bg-grad-soft p-2.5 text-[12.5px] text-slate-800" data-testid={`reply-summary-${o.letter}`}><Sparkles size={13} className="mt-0.5 shrink-0 text-brand-600" />{q.summary}</div>}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
                {row('Can do?', canDoText(q.canDo, q.available))}
                {q.qty != null && row('Quantity', `${q.qty.toLocaleString('en-IN')} ${q.unit || run.ask.unit}`)}
                {row('Price', <>{priceText(q, run.ask.unit)}{o.history.lastPrice ? <span className="text-slate-400"> · last cost ₹{o.history.lastPrice}</span> : null}</>)}
                {q.freight != null && row('Freight', q.freight === 0 ? 'free / included' : inrs(q.freight))}
                {q.shipDate && row('When', <span className={cx(run.request.needBy && q.shipDate > run.request.needBy && 'text-rose-600')}>{fmtDay(q.shipDate)}</span>)}
                {q.terms && row('Terms', q.terms)}
                {q.validity && row('Valid', q.validity)}
                {!!q.conditions?.length && row('Conditions', q.conditions.join('; '))}
                {o.compare && row('Compared as', <span className={cx(!o.compare.comparable && 'text-amber-700')}>{o.compare.unitPrice != null ? `₹${(Math.round(o.compare.unitPrice * 100) / 100).toLocaleString('en-IN')}/${o.compare.basis} ex-GST` : '—'}{o.compare.note ? ` · ${o.compare.note}` : ''}</span>)}
                {o.compare?.total != null && row('Total (excl. GST)', <span className="font-semibold">{inrs(landed(o))}</span>)}
              </div>
            </div>
            {o.tips.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5" data-testid={`tips-${o.letter}`}>
              <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase text-amber-700"><Lightbulb size={12} /> Negotiation ideas</div>
              <div className="flex flex-wrap gap-1.5">{o.tips.map((t) => <span key={t} className="rounded-lg border border-amber-200/80 bg-white px-2.5 py-1.5 text-[12px] text-slate-700 dark:bg-transparent">{t}</span>)}</div>
            </div>}
          </div>
        )}
        <QuestionBox o={o} onRun={onRun} />
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {q?.price != null && <Button size="sm" variant={recommended ? 'primary' : 'secondary'} data-testid={`po-${o.letter}`} disabled={!!busy || run.po?.ref === o.ref} icon={<FileCheck2 size={13} />} onClick={() => act('po', () => live.po(o.ref))}>{run.po?.ref === o.ref ? 'PO draft ready' : 'Approve PO draft'}</Button>}
          {q?.price != null && o.channel !== 'Call' && <span className="inline-flex items-center gap-1"><span className="text-[12px] text-slate-500">Counter ₹</span><input value={counter} onChange={(e) => setCounter(e.target.value)} inputMode="decimal" className="h-7 w-20 rounded-md border border-slate-300 px-2 text-[13px]" /><span className="text-[12px] text-slate-500">{q.priceBasis === 'lump_sum' ? 'lump sum' : `/${u}`}</span><Button size="sm" data-testid={`counter-${o.letter}`} disabled={!!busy || !Number(counter)} icon={busy === 'counter' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} onClick={() => act('counter', () => live.counter(o.ref, Number(counter)))}>Send counter-offer</Button></span>}
          <Button size="sm" variant="ghost" disabled={!!busy} icon={<Bot size={13} />} onClick={() => act('ai', () => live.aiCall(o.ref))}>AI call</Button>
        </div>
        <details className="text-[12.5px]"><summary className="cursor-pointer text-slate-500">Spoke to them on the phone? Type what they said</summary>
          <div className="mt-2 flex gap-2"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. can do, ₹65 per unit, delivery tomorrow, 30 days credit" className="h-8 flex-1 rounded-md border border-slate-300 px-2" data-testid={`note-${o.letter}`} /><Button size="sm" disabled={!note.trim() || !!busy} onClick={() => act('note', async () => { const r = await live.note(o.ref, note); setNote(''); return r; })}>Capture</Button></div>
        </details>
        {err && <div className="text-2xs text-rose-600">{err}</div>}
      </div>
    </Card>
  );
}

function SummaryCard({ run, onRun }: { run: Run; onRun: (r: Run) => void }) {
  const sm = run.summary; const [busy, setBusy] = useState(false);
  const replies = run.suppliers.reduce((n, o) => n + o.replies.length, 0);
  if (!replies) return (
    <Card title={<span className="flex items-center gap-2"><Sparkles size={15} className="text-violet-600" /> AI comparison</span>}>
      <div className="flex items-start gap-4 text-[13px] text-slate-600" data-testid="summary-empty"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-grad-soft text-brand-600"><Inbox size={20} /></span><div className="flex-1"><div className="font-semibold text-slate-900">Waiting for the first reply</div>Suppliers usually answer within minutes. As soon as replies arrive, the AI compares them here – you don't need to refresh.<div className="mt-3 space-y-2"><div className="skeleton h-3 w-3/4" /><div className="skeleton h-3 w-1/2" /></div></div></div>
    </Card>);
  const refresh = async () => { setBusy(true); try { onRun(await live.summarize(run.id)); } finally { setBusy(false); } };
  const name = (l: string) => run.suppliers.find((o) => o.letter === l)?.supplier || `Supplier ${l}`;
  return (
    <Card title={<span className="flex items-center gap-2"><Sparkles size={15} className="text-violet-600" /> AI comparison of all replies {sm && <ParserBadge p={sm.parser} />}</span>}
      subtitle={sm ? `${sm.basedOn} replies read · ${fmtTime(sm.at)}${sm.basedOn < replies ? ' · updating…' : ''}` : 'Reading the replies and writing a comparison…'}
      actions={<Button size="sm" variant="ghost" icon={busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} disabled={busy} onClick={refresh}>Refresh</Button>}>
      {!sm ? <div className="flex items-center gap-2 text-[13px] text-slate-500"><Loader2 size={14} className="animate-spin" /> Reading the replies…</div> : (
        <div className="space-y-3" data-testid="live-summary">
          <p className="text-[15px] font-semibold leading-snug tracking-tight text-slate-900">{sm.headline}</p>
          <div className="space-y-2 md:hidden" data-testid="summary-cards">{sm.rows.map((r) => (
            <div key={r.letter} className={cx('rounded-xl border p-3 text-[12.5px]', sm.best?.letter === r.letter ? 'border-emerald-300 bg-emerald-50/60 glow-green' : 'border-slate-200')}>
              <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">{name(r.letter)}{sm.best?.letter === r.letter && <Badge tone="green">Recommended</Badge>}</div>
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5">{sm.columns.slice(1).map((c, i) => r.cells[i + 1] ? <React.Fragment key={c}><dt className="text-slate-500">{c}</dt><dd className="text-slate-800">{r.cells[i + 1]}</dd></React.Fragment> : null)}</dl>
            </div>))}</div>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 md:block"><table className="w-full text-left text-[12.5px]" data-testid="summary-table">
            <thead><tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] uppercase tracking-[.06em] text-slate-500">{sm.columns.map((c) => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}</tr></thead>
            <tbody>{sm.rows.map((r) => <tr key={r.letter} className={cx('border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60', sm.best?.letter === r.letter && 'bg-emerald-50/70 font-medium shadow-[inset_3px_0_0_#10b981]')}>{r.cells.map((c, i) => <td key={i} className="px-3 py-2.5 align-top tabular text-slate-700">{i === 0 ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-slate-900">{name(r.letter)}{sm.best?.letter === r.letter && <Badge tone="green">Recommended</Badge>}</span> : c || '—'}</td>)}</tr>)}</tbody>
          </table></div>
          {!sm.comparable && sm.comparabilityNote && <div className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-[12.5px] text-amber-800"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{sm.comparabilityNote}</div>}
          {sm.best && <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-[13px] text-slate-800"><Award size={16} className="mt-0.5 shrink-0 text-emerald-600" /><span><b className="text-slate-900">Best option: {name(sm.best.letter)}</b> – {sm.best.why}</span></div>}
          <div className="grid gap-3 md:grid-cols-2">
            {sm.negotiation.length > 0 && <div><div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase text-amber-700"><Lightbulb size={12} /> Negotiation ideas</div><div className="flex flex-wrap gap-1.5" data-testid="negotiation-chips">{sm.negotiation.map((t) => <span key={t} className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5 text-[12px] leading-snug text-slate-700">{t}</span>)}</div></div>}
            {sm.nextActions.length > 0 && <div><div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase text-brand-700"><ListChecks size={12} /> Next actions</div><ol className="space-y-1.5 text-[12.5px] text-slate-700">{sm.nextActions.map((t, i) => <li key={t} className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">{i + 1}</span>{t}</li>)}</ol></div>}
          </div>
          <p className="text-2xs text-slate-400">{sm.parser === 'llm' ? 'Written by AI from the replies only; any number not found in the replies is rejected. Ranking scores are computed, not AI-generated.' : 'Rules summary (no LLM).'}</p>
        </div>
      )}
    </Card>
  );
}

function Connect({ st, onSaved }: { st: Status | null; onSaved: () => void }) {
  const [f, setF] = useState<Record<string, string>>({}); const [res, setRes] = useState<string>(''); const [busy, setBusy] = useState(false);
  const inp = (k: string, label: string, type = 'text', ph = '') => <label className="block text-[12px] text-slate-600">{label}<input type={type} placeholder={ph} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="mt-0.5 h-8 w-full rounded-md border border-slate-300 px-2 text-[13px]" autoComplete="off" /></label>;
  const [copied, setCopied] = useState('');
  const copyScript = async () => { try { const t = await live.bridgeScript(); await navigator.clipboard.writeText(t); setCopied('Script copied – paste it into a new Apps Script project.'); } catch { setCopied('Copy failed – use "download .gs" instead.'); } };
  const save = async () => { setBusy(true); try { const r = await live.connect(f); setRes(Object.entries(r.result).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Saved'); setF({}); onSaved(); } catch (e) { setRes(String((e as Error).message)); } finally { setBusy(false); } };
  return (
    <Card title={<span className="flex items-center gap-2"><Plug size={15} /> Connections</span>} subtitle="Live = real messages go out. Simulated = clearly marked, nothing leaves the server.">
      <div className="mb-3 flex flex-wrap gap-3 text-[12.5px]">
        {st && (['email', 'whatsapp', 'call'] as const).map((k) => <span key={k} className="inline-flex items-center gap-1.5">{chIcon(k === 'email' ? 'Email' : k === 'whatsapp' ? 'WhatsApp' : 'Call')} {k === 'call' ? 'AI call' : k[0].toUpperCase() + k.slice(1)} <ModeBadge mode={st.modes[k]} /></span>)}
        {st && <span data-testid="ai-parsing" className="inline-flex items-center gap-1.5 text-slate-500"><Sparkles size={13} className="text-violet-600" />AI parsing: {st.modes.llm === 'real' ? `LLM (${st.llm?.model || 'model'})` : st.llm?.keySet ? `rules – LLM unavailable${st.llm.error ? `: ${st.llm.error.slice(0, 80)}` : ''}` : 'rules (no key)'}</span>}
      </div>
      {st?.email?.backend && <div data-testid="email-health" className={cx('mb-2 rounded-md p-2 text-2xs', st.email.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
        {st.email.backend === 'bridge' ? 'Gmail bridge' : 'SMTP/IMAP'}: {st.email.ok ? `connected${st.sender ? ` – sending as ${st.sender}` : ''}` : st.email.ok === false ? `not reachable – ${st.email.error}` : 'checking…'}
      </div>}
      {st && <div className="mb-3 flex items-start gap-1.5 rounded-md bg-slate-50 p-2 text-2xs text-slate-600"><ShieldCheck size={13} className="mt-px shrink-0 text-emerald-600" />Safety allowlist – the agent can only contact: {[...st.allowlist.emails, ...st.allowlist.phones.map(maskTo)].join(', ') || 'nobody yet'}.{st.sender ? ` Emails go out from ${st.sender}.` : ''}</div>}
      <details><summary className="cursor-pointer text-[12.5px] font-medium text-brand-700">Paste credentials</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">{inp('gmailBridgeUrl', 'Gmail bridge URL (Apps Script web app)', 'url', 'https://script.google.com/macros/s/…/exec')}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-2xs text-slate-500">
              <button type="button" data-testid="copy-bridge" onClick={copyScript} className="rounded border border-slate-300 px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-50">Copy bridge script</button>
              <a className="text-brand-700 underline" href="./api/bridge-script" download="gmail-bridge.gs" target="_blank" rel="noreferrer">download .gs</a>
              <span>{copied || 'Paste into script.google.com, deploy as a Web app (Execute as: Me, Who has access: Anyone), then paste the /exec URL here.'}</span>
            </div>
          </div>
          {inp('twilioSid', 'Twilio Account SID', 'text', 'AC…')}
          {inp('twilioToken', 'Twilio Auth Token', 'password')}
          {inp('twilioVoiceFrom', 'Twilio voice number', 'text', '+1…')}
          {inp('twilioWaFrom', 'WhatsApp sender (optional)', 'text', 'whatsapp:+14155238886')}
          {inp('llmKey', 'LLM API key (NVIDIA nvapi-… or OpenAI-compatible)', 'password')}
          {inp('llmModel', 'LLM model (optional)', 'text', 'auto – picked from the provider catalog')}
          {inp('llmBase', 'LLM base URL (optional)', 'text', 'auto – NVIDIA for nvapi- keys')}
        </div>
        <div className="mt-2 flex items-center gap-2"><Button size="sm" variant="primary" disabled={busy} onClick={save}>Save & test</Button><span className="text-2xs text-slate-500">{res}</span></div>
      </details>
    </Card>
  );
}

/* ---------------------------------------------------------------- owner flow: Ask → Waiting → Decision */
const CATEGORIES = [
  { label: 'Raw material', icon: Layers, text: 'I need 500 kg MS sheet 2mm by Friday, do we have it?' },
  { label: 'Vehicles & trucks', icon: TruckIcon, text: 'Need a 10-ton truck from Hyderabad to Pune on Friday' },
  { label: 'Contract labour', icon: HardHat, text: 'Need 6 contract helpers for loading and unloading at our Balanagar factory, Hyderabad, this Saturday, 9 am to 6 pm' },
  { label: 'Job work', icon: Hammer, text: 'Zinc plating job work for 2,000 MS brackets, pickup from Balanagar, Hyderabad, return by next Wednesday' },
  { label: 'Machine repair', icon: Wrench, text: 'AMC for our 2 CNC machines' },
  { label: 'Packaging', icon: Box, text: '2,000 corrugated boxes 400x300x200 mm by Monday' },
  { label: 'Spares & tools', icon: Package, text: '200 pcs 6204 bearings by Monday' },
];
/** Mirrors server recommend(): cheapest total among suppliers who can do it on time; ties go to the better score. */
function recommend(run: Run): Out | undefined {
  const ok = run.suppliers.filter((o) => o.quote && o.quote.canDo !== 'no' && o.quote.available !== false && landed(o) > 0 && o.compare?.comparable !== false);
  const need = run.request.needBy;
  const sure = ok.filter((o) => !need || (!!o.quote!.shipDate && o.quote!.shipDate <= need)); const maybe = ok.filter((o) => !need || !o.quote!.shipDate || o.quote!.shipDate <= need);
  return [...(sure.length ? sure : maybe.length ? maybe : ok)].sort((a, b) => landed(a) - landed(b) || (b.score || 0) - (a.score || 0))[0];
}
const first = (n: string) => n.split(' ')[0];
const Who = ({ o, size = 36 }: { o: { letter: string; channel: Channel }; size?: number }) => (
  <span className="relative inline-block shrink-0 align-middle" style={{ width: size, height: size }}>
    <span className="grid h-full w-full place-items-center rounded-full bg-slate-100 text-[13px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">{o.letter}</span>
    <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 dark:bg-[#111729]">{chIcon(o.channel, 10)}</span>
  </span>
);
const DemoTag = () => <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500" title="Lab mode: messages are simulated, nothing leaves the server">Demo</span>;
const replied = (o: Out) => o.replies.length > 0;
const failed = (o: Out) => o.timeline.some((t) => t.stage === 'failed' || t.stage === 'blocked');
const snippet = (o: Out) => (o.quote?.summary || o.replies[o.replies.length - 1]?.text || '').replace(/\s+/g, ' ').trim().replace(/^[A-E]:\s*/, '');
const sentence = (t?: string | null) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '');
const whenText = (o: Out) => o.quote?.shipDate ? fmtDay(o.quote.shipDate) : '—';
const priceOf = (o: Out, unit: string) => (landed(o) ? inrs(landed(o)) : o.quote ? priceText(o.quote, unit) : '—');

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-[13px]" data-testid="journey" aria-label="Progress">
      {['Ask', 'Replies', 'Decide'].map((l, i) => (
        <li key={l} className="flex items-center gap-2">
          {i > 0 && <span className={cx('h-px w-6 sm:w-10', i < step ? 'bg-brand-500' : 'bg-slate-200')} />}
          <span className={cx('grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold', i + 1 < step ? 'bg-brand-600 text-white' : i + 1 === step ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-300' : 'bg-slate-100 text-slate-400')}>{i + 1 < step ? <CheckCircle2 size={13} /> : i + 1}</span>
          <span className={cx(i + 1 === step ? 'font-semibold text-slate-900' : 'text-slate-500')}>{l}</span>
        </li>))}
    </ol>
  );
}

/** Step 2: calm progress. */
function Waiting({ run, onCompare, busy, onRun }: { run: Run; onCompare: () => void; busy: boolean; onRun: (r: Run) => void }) {
  const n = run.suppliers.filter(replied).length; const total = run.suppliers.length;
  const tick = (o: Out) => { const st = o.timeline.map((t) => t.stage); return [st.includes('sent'), st.some((x) => ['delivered', 'read', 'answered'].includes(x)) || replied(o), replied(o)]; };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-7" data-testid="live-waiting">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[32px] font-semibold leading-none tracking-tight text-slate-900 tabular" data-testid="replied-count">{n} of {total} replied</div>
          <p className="mt-2 text-[14px] text-slate-500">{n < total ? 'Suppliers usually answer within minutes. You can compare as soon as two have replied.' : 'Everyone has answered.'}</p>
        </div>
        <Button variant="primary" className="h-11 px-5 text-[14px]" data-testid="compare-now" disabled={n < 2 || busy} icon={busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} onClick={onCompare}>{n < 2 ? 'Compare (needs 2 replies)' : 'Compare now'}</Button>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500 transition-[width] duration-700" style={{ width: `${(n / total) * 100}%` }} /></div>
      <ul className="mt-5 divide-y divide-slate-100" data-testid="channel-status">
        {run.suppliers.map((o) => { const t = tick(o); return (
          <li key={o.ref} className="flex items-center gap-3 py-3">
            <Who o={o} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[14px] font-medium text-slate-900">{o.supplier}<span className="font-normal text-slate-400">{first(o.person)}</span></div>
              <div className="truncate text-[13px] text-slate-500">{failed(o) ? <span className="text-rose-600">Could not reach them</span> : replied(o) ? `“${snippet(o)}”` : o.pending ? 'Asked a question' : `Waiting for ${first(o.person)}…`}</div>
            </div>
            <div className="hidden items-center gap-1.5 text-[12px] sm:flex">{['Sent', 'Delivered', 'Replied'].map((l, i) => <span key={l} className={cx('flex items-center gap-1', t[i] ? 'text-emerald-700' : 'text-slate-400')}>{t[i] ? <CheckCircle2 size={13} /> : <span className="h-3 w-3 rounded-full border border-slate-300" />}{l}{i < 2 && <span className="mx-0.5 text-slate-300">›</span>}</span>)}</div>
            <span className="sm:hidden">{replied(o) ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Loader2 size={14} className="animate-spin text-slate-400" />}</span>
          </li>); })}
      </ul>
      {run.suppliers.filter((o) => o.pending).map((o) => <div key={o.ref} className="mt-3"><QuestionBox o={o} onRun={onRun} /></div>)}
    </section>
  );
}

function counterDraft(o: Out, run: Run, p: number) {
  const u = o.quote?.priceBasis === 'lump_sum' ? '' : `/${o.quote?.priceUnit || run.ask.unit || 'unit'}`;
  return `Hi ${first(o.person)}, thanks for your quote. We can confirm today if you can do ${inrs(p)}${u}${run.request.needBy ? `, delivered by ${fmtDay(run.request.needBy)}` : ''}. Can you confirm?`;
}

/** Step 3: the money screen. */
function Decision({ run, best, onRun }: { run: Run; best: Out; onRun: (r: Run) => void }) {
  const [neg, setNeg] = useState(false); const [busy, setBusy] = useState(''); const [err, setErr] = useState(''); const [open, setOpen] = useState<string | null>(null);
  const price0 = best.counterPrice || 0; const [cp, setCp] = useState(String(price0 || '')); const [msg, setMsg] = useState(price0 ? counterDraft(best, run, price0) : '');
  const quoted = run.suppliers.filter((o) => landed(o) > 0);
  const high = quoted.reduce((m, o) => Math.max(m, landed(o)), 0); const save = landed(best) && high > landed(best) ? high - landed(best) : 0;
  const why = run.summary?.best?.letter === best.letter ? run.summary.best.why : '';
  const rank = (o: Out) => { const i = run.top.indexOf(o.ref); return i < 0 ? 99 : i; };
  const key = (o: Out) => (o.ref === best.ref ? -1 : landed(o) > 0 && o.quote?.canDo !== 'no' ? landed(o) : Infinity);
  const rows = [...run.suppliers].sort((a, b) => key(a) - key(b) || rank(a) - rank(b)).slice(0, 5);
  const act = async (k: string, f: () => Promise<Run>) => { setBusy(k); setErr(''); try { onRun(await f()); } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(''); } };
  const poDone = run.po?.ref === best.ref; const countered = best.sent.some((m) => m.kind === 'counter');
  const tips = [...(run.summary?.negotiation || []), ...best.tips].filter((t, i, a) => a.indexOf(t) === i && t.length < 160).slice(0, 3);
  const next = (run.summary?.nextActions || []).filter((t) => t.length < 180).slice(0, 4);
  const said = run.suppliers.filter(replied).sort((a, b) => (a.ref === best.ref ? -1 : b.ref === best.ref ? 1 : landed(a) - landed(b)));
  const approve = () => act('po', () => live.po(best.ref));
  const sendCounter = () => { const p = Number(cp); const def = counterDraft(best, run, p); act('counter', () => live.counter(best.ref, p, msg.trim() && msg.trim() !== def ? msg.trim() : undefined)).then(() => setNeg(false)); };
  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <section className={cx('decision-card relative overflow-hidden rounded-2xl border bg-white p-5 shadow-card transition-colors md:p-8 dark:bg-[#111729]', poDone ? 'border-emerald-300' : 'border-slate-200')} data-testid="live-recommendation">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700"><Sparkles size={12} />Recommended</span>
          {save > 0 && <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700">Saves {inrs(save)}</span>}
        </div>
        <h2 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-slate-900 md:text-[38px]" data-testid="decision-title">Go with {best.supplier}</h2>
        {why && <p className="mt-2 max-w-2xl text-[15px] text-slate-600" data-testid="decision-why">{why}</p>}
        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-slate-100 pt-5 md:grid-cols-4" data-testid="live-cta">
          <div><dt className="text-[13px] text-slate-500">Price</dt><dd className="mt-0.5 text-[20px] font-semibold text-slate-900 tabular">{priceOf(best, run.ask.unit)}</dd>{landed(best) > 0 && <dd className="text-[12px] text-slate-400">total, excl. GST</dd>}</div>
          <div><dt className="text-[13px] text-slate-500">Delivery</dt><dd className="mt-0.5 text-[20px] font-semibold text-slate-900">{whenText(best)}</dd></div>
          <div><dt className="text-[13px] text-slate-500">Payment</dt><dd className="mt-0.5 text-[20px] font-semibold text-slate-900">{sentence(best.quote?.terms) || '—'}</dd></div>
          {save > 0 && <div data-testid="live-savings" className="-m-2 rounded-xl bg-emerald-50 p-2 dark:bg-emerald-500/10"><dt className="text-[13px] text-emerald-700">You save</dt><dd className="mt-0.5 text-[20px] font-semibold text-emerald-700 tabular">{inrs(save)}</dd><dd className="text-[12px] text-emerald-700/70">vs highest quote</dd></div>}
        </dl>
        <div className="mt-6 hidden flex-wrap items-center gap-3 md:flex">
          <Button variant="primary" className={cx('h-12 px-6 text-[15px] transition active:scale-[.98]', poDone && '!bg-none !bg-emerald-600')} data-testid="approve-po" disabled={!!busy || poDone} icon={busy === 'po' ? <Loader2 size={16} className="animate-spin" /> : poDone ? <CheckIcon size={16} className="pop" /> : <FileCheck2 size={16} />} onClick={approve}>{poDone ? 'PO created' : 'Approve & create PO'}</Button>
          {!!price0 && <Button className="h-12 px-5 text-[15px]" data-testid="negotiate" disabled={!!busy || countered} onClick={() => setNeg((v) => !v)}>{countered ? 'Counter-offer sent' : 'Negotiate first'}</Button>}
          <a href="#all-quotes" className="px-2 text-[14px] font-medium text-brand-700 hover:underline">See all quotes</a>
        </div>
        {neg && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4" data-testid="counter-draft">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">Ask {first(best.person)} for <span className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2"><span>₹</span><input value={cp} onChange={(e) => { setCp(e.target.value); if (Number(e.target.value)) setMsg(counterDraft(best, run, Number(e.target.value))); }} inputMode="numeric" className="h-8 w-24 bg-transparent px-1 text-[14px] font-semibold outline-none" /></span><span>on {chName(best.channel)}</span></div>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="mt-3 w-full rounded-lg border border-slate-200 bg-white p-3 text-[14px] leading-relaxed text-slate-800 outline-none focus:border-brand-300" />
            <div className="mt-3 flex flex-wrap items-center gap-2"><Button variant="primary" data-testid="send-counter" disabled={!!busy || !Number(cp)} icon={busy === 'counter' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} onClick={sendCounter}>{best.channel === 'Call' ? 'Approve – AI calls with this offer' : `Approve & send to ${first(best.person)}`}</Button><Button variant="ghost" onClick={() => setNeg(false)}>Cancel</Button><span className="text-[12px] text-slate-500">Nothing is sent until you approve.</span></div>
          </div>
        )}
        {poDone && run.po && <div className="pop mt-5 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-[14px] text-emerald-800 dark:bg-emerald-500/10" data-testid="live-po"><CheckIcon size={16} className="mt-0.5 shrink-0" /><span>PO draft for {run.po.supplier}: {run.po.qty.toLocaleString('en-IN')} {run.po.unit} · total {inrs(run.po.total)} incl. GST. {run.po.status}</span></div>}
        {err && <div className="mt-3 text-[13px] text-rose-600">{err}</div>}
      </section>

      <section id="all-quotes" className="scroll-mt-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card" data-testid="all-quotes">
        <div className="px-5 py-4 text-[15px] font-semibold text-slate-900">All quotes</div>
        <div className="overflow-x-auto"><table className="w-full text-left text-[14px]" data-testid="live-top3">
          <thead><tr className="border-y border-slate-100 bg-slate-50/60 text-[13px] text-slate-500"><th className="px-5 py-2 font-medium">Supplier</th><th className="px-3 py-2 font-medium">Price</th><th className="hidden px-3 py-2 font-medium sm:table-cell">Delivery</th><th className="hidden px-3 py-2 font-medium md:table-cell">Terms</th><th className="hidden px-3 py-2 font-medium md:table-cell">Channel</th><th className="px-5 py-2" /></tr></thead>
          <tbody>{rows.map((o) => { const isBest = o.ref === best.ref; const no = o.quote?.canDo === 'no' || o.quote?.available === false || (replied(o) && !o.quote?.price && /not possible|can'?t|cannot|sorry/i.test(snippet(o))); return (
            <React.Fragment key={o.ref}>
              <tr className={cx('border-b border-slate-100', isBest && 'bg-emerald-50/60')}>
                <td className="px-5 py-3"><span className="flex items-center gap-2 font-medium text-slate-900">{o.supplier}{isBest && <Badge tone="green">Recommended</Badge>}</span></td>
                <td className="px-3 py-3 tabular text-slate-900">{no ? <span className="text-slate-400">Can't do</span> : !replied(o) ? <span className="text-slate-400">{failed(o) ? 'Not reached' : 'No reply yet'}</span> : priceOf(o, run.ask.unit)}</td>
                <td className="hidden px-3 py-3 text-slate-700 sm:table-cell">{no || !replied(o) ? '' : o.quote?.shipDate ? fmtDay(o.quote.shipDate) : <span className="text-slate-400">Not stated</span>}</td>
                <td className="hidden px-3 py-3 text-slate-700 md:table-cell">{sentence(o.quote?.terms)}</td>
                <td className="hidden px-3 py-3 text-slate-600 md:table-cell"><span className="inline-flex items-center gap-1.5">{chIcon(o.channel, 13)}{o.channel === 'Call' ? 'Call' : o.channel}</span></td>
                <td className="px-5 py-3 text-right">{replied(o) && <button className="text-[13px] font-medium text-brand-700 hover:underline" data-testid={`view-reply-${o.letter}`} onClick={() => setOpen(open === o.ref ? null : o.ref)}>{open === o.ref ? 'Hide' : 'View reply'}</button>}</td>
              </tr>
              {open === o.ref && <tr className="border-b border-slate-100 bg-slate-50/50"><td colSpan={6} className="px-5 py-3" data-testid={`thread-${o.letter}`}>
                {o.replies.map((r, i) => <div key={i} className="mb-2 max-w-2xl whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-[13px] leading-relaxed text-slate-700"><div className="mb-1 flex items-center gap-1.5 text-[12px] text-slate-400">{chIcon(o.channel, 12)}{o.channel === 'Call' ? 'Call transcript' : `${o.person} on ${o.channel}`}</div>{r.text}</div>)}
                {!isBest && o.quote?.price != null && <Button size="sm" data-testid={`po-${o.letter}`} disabled={!!busy || run.po?.ref === o.ref} onClick={() => act('po', () => live.po(o.ref))}>{run.po?.ref === o.ref ? 'PO created' : `Create PO with ${o.supplier} instead`}</Button>}
              </td></tr>}
            </React.Fragment>); })}</tbody>
        </table></div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tips.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card" data-testid="negotiation-chips">
          <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-900"><span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600"><Lightbulb size={15} /></span>Negotiation ideas</div>
          <ul className="space-y-2 text-[14px] leading-snug text-slate-600">{tips.map((t) => <li key={t} className="flex gap-2.5"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{t}</li>)}</ul>
        </section>}
        {next.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card" data-testid="next-actions">
          <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-900"><span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600"><ListChecks size={15} /></span>Next steps</div>
          <ol className="space-y-2 text-[14px] leading-snug text-slate-600">{next.map((t, i) => <li key={t} className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{i + 1}</span>{t}</li>)}</ol>
        </section>}
      </div>

      {said.length > 0 && <section data-testid="supplier-replies">
        <div className="mb-3 flex items-baseline justify-between"><h3 className="text-[15px] font-semibold text-slate-900">What suppliers said</h3><span className="text-[13px] text-slate-500">{said.length} of {run.suppliers.length} replied · email, WhatsApp and call transcripts</span></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{said.map((o) => { const isBest = o.ref === best.ref; const r = o.replies[o.replies.length - 1]; return (
          <article key={o.ref} className={cx('rounded-2xl border bg-white p-4 shadow-card', isBest ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200')} data-testid={`reply-card-${o.letter}`}>
            <div className="flex items-center gap-3"><Who o={o} size={34} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[14px] font-semibold text-slate-900">{o.supplier}{isBest && <Badge tone="green">Recommended</Badge>}</div><div className="text-[12px] text-slate-500">{o.person} · {o.channel === 'Call' ? 'AI phone call' : chName(o.channel)}</div></div><div className="text-right text-[14px] font-semibold tabular text-slate-900">{o.quote?.canDo === 'no' || o.quote?.available === false || (!o.quote?.price && /not possible|can'?t|cannot|sorry/i.test(snippet(o))) ? <span className="text-slate-400">Can't do</span> : priceOf(o, run.ask.unit)}</div></div>
            <p className="mt-3 line-clamp-4 rounded-xl bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-700 dark:bg-white/[.03]">{(r?.text || '').replace(/\s+/g, ' ').replace(/^[A-E]:\s*/, '')}</p>
          </article>); })}</div>
      </section>}

      {/* Mobile: one sticky primary action above the tab bar. */}
      <div className="fixed inset-x-0 bottom-[64px] z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden dark:bg-[#111729]/95" data-testid="sticky-cta">
        <div className="flex gap-2"><Button variant="primary" className={cx('h-12 flex-1 text-[15px] active:scale-[.98]', poDone && '!bg-none !bg-emerald-600')} disabled={!!busy || poDone} icon={busy === 'po' ? <Loader2 size={16} className="animate-spin" /> : poDone ? <CheckIcon size={16} className="pop" /> : undefined} onClick={approve}>{poDone ? 'PO created' : 'Approve & create PO'}</Button>{!!price0 && <Button className="h-12 px-4 text-[15px]" disabled={!!busy || countered} onClick={() => { setNeg(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Negotiate</Button>}</div>
      </div>
    </div>
  );
}

export default function LiveSourcing() {
  const { id } = useParams(); const nav = useNavigate(); const { s } = useStore();
  const [run, setRun] = useState<Run | null>(null); const [st, setSt] = useState<Status | null>(null); const [err, setErr] = useState('');
  const [text, setText] = useState('');
  type T = { id: number; said: string; merged: string; history: Turn[]; status?: string; reply?: string };
  const [turns, setTurns] = useState<T[]>([]); const endRef = useRef<HTMLDivElement>(null);
  const check = turns.length ? turns[turns.length - 1].said : null;
  const setCheck = (t: string | null) => { if (t === null) setTurns([]); else send(t); };
  const send = (said: string) => setTurns((ts) => {
    const last = ts[ts.length - 1];
    const follow = last && last.status === 'clarify' && !/\?|\b(joke|thanks?|thank you|hi|hello|hey|need|want|require|chahiye|book|hire|get me|looking for)\b/i.test(said);
    const merged = follow ? `${last.merged.replace(/[.\s]+$/, '')}, ${said}` : said;
    const history = ts.flatMap((x) => [{ role: 'user' as const, text: x.said }, ...(x.reply ? [{ role: 'ai' as const, text: x.reply }] : [])]);
    setText(''); window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
    return [...ts, { id: Date.now(), said, merged, history }];
  });
  const onResult = (id: number, c: Check) => setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, status: c.status, reply: c.status === 'chat' || c.status === 'clarify' ? c.note : `Drafted an enquiry: ${c.ask.enquiry}` } : x)));
  const [runs, setRuns] = useState<{ id: string; text: string; status: string; createdAt: string }[]>([]);
  const [compare, setCompare] = useState(false); const [cbusy, setCbusy] = useState(false);
  const timer = useRef<number>();
  const loadSt = () => live.status().then(setSt).catch((e) => { if (!(e instanceof Offline)) setErr(String(e.message)); else window.setTimeout(loadSt, 4000); });
  useEffect(() => { loadSt(); live.runs().then(setRuns).catch(() => {}); setCompare(false); }, [id]);
  useEffect(() => {
    if (!id) { setRun(null); return; }
    const tick = () => live.run(id).then((r) => { setRun(r); setErr(''); }).catch((e) => { if (!(e instanceof Offline)) setErr(String(e.message)); });
    tick(); timer.current = window.setInterval(tick, 2500);
    return () => window.clearInterval(timer.current);
  }, [id]);
  const reset = async () => { await live.reset(); setRuns([]); setCheck(null); nav('/sourcing/live'); };
  const top = run ? run.top.map((r) => run.suppliers.find((o) => o.ref === r)!).filter(Boolean) : [];
  const best = run ? recommend(run) || top[0] : undefined; // one recommendation (same rule as the server); the AI only explains why
  const lab = !!run && run.suppliers.every((o) => o.mode !== 'real') || (!run && !!st && Object.entries(st.modes).every(([k, v]) => k === 'llm' || v !== 'real'));
  const settled = !!run && run.suppliers.every((o) => replied(o) || failed(o));
  const decide = !!run && !!best && !!run.summary && (compare || settled || !!run.po);
  const doCompare = async () => { if (!run) return; setCbusy(true); try { if (!run.summary) setRun(await live.summarize(run.id)); setCompare(true); } finally { setCbusy(false); } };
  const composer = (
            <form className="ask-field mt-8 flex shadow-lg items-center gap-2 rounded-2xl bg-white p-2 pl-5 text-left dark:bg-[#111729]" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send(text.trim()); }}>
              <Sparkles size={18} className="shrink-0 text-brand-500" />
              <input autoFocus value={text} onChange={(e) => setText(e.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-[17px] text-slate-900 outline-none placeholder:text-slate-400" data-testid="live-query" placeholder={turns.length ? 'Reply…' : 'e.g. 10-ton truck, Hyderabad to Pune, Friday'} />
              <Button variant="primary" type="submit" className="h-12 shrink-0 rounded-xl px-5 text-[15px]" disabled={!text.trim()}>Continue</Button>
            </form>
  );
  return (
    <div className={cx('mx-auto max-w-4xl space-y-5', decide && 'pb-20 md:pb-0')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StepBar step={!run ? 1 : decide ? 3 : 2} />
        <div className="flex items-center gap-2">{lab && <DemoTag />}<Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} data-testid="live-reset" onClick={reset}>{run ? 'New request' : 'Reset demo'}</Button></div>
      </div>
      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">{err}</div>}
      {!run && (
        <section className="ask-hero relative px-1 pb-2 pt-6 md:px-0 md:pt-12" data-testid="live-hero">
          <div className={cx('mx-auto max-w-[680px]', !check && 'md:text-center')}>
            <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-slate-900 md:text-[44px]">What do you need?</h1>
            <p className="mt-3 text-[16px] text-slate-500">Say it like you'd tell your purchase manager. We ask 5 suppliers and tell you who to go with.</p>
            {!turns.length && composer}
            <div className={cx('mt-5 flex flex-wrap gap-2', !check && 'md:justify-center')} data-testid="live-chips">{CATEGORIES.map((x) => { const on = check === x.text; return <button key={x.label} type="button" title={x.text} aria-pressed={on} onClick={() => send(x.text)} className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition active:scale-[.97]', on ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-px hover:border-brand-300 hover:text-slate-900 dark:bg-transparent')}>{on ? <CheckIcon size={14} /> : <x.icon size={14} className="text-slate-400" />}{x.label}</button>; })}</div>
            <div className={cx('mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-slate-500', !check && 'md:justify-center')} data-testid="live-channels">
              <span>Reaches suppliers on</span>
              {[{ i: <Mail size={14} />, t: 'Email', c: 'text-sky-600 bg-sky-50' }, { i: <MessageCircle size={14} />, t: 'WhatsApp', c: 'text-emerald-600 bg-emerald-50' }, { i: <PhoneCall size={14} />, t: 'AI phone call', c: 'text-violet-600 bg-violet-50' }].map((x) => <span key={x.t} className="inline-flex items-center gap-1.5 font-medium text-slate-700"><span className={cx('grid h-6 w-6 place-items-center rounded-full', x.c)}>{x.i}</span>{x.t}</span>)}
            </div>
          </div>
          {turns.length > 0 && <div className="mx-auto mt-8 max-w-[680px] space-y-4" data-testid="live-thread">
            {turns.map((t) => <div key={t.id} className="space-y-3">
              <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-[14.5px] text-white shadow-sm" data-testid="thread-user">{t.said}</div></div>
              <div className="fadein rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-6"><LiveCheck text={t.merged} history={t.history} onNext={send} onResult={(c) => onResult(t.id, c)} /></div>
            </div>)}
            <div ref={endRef} className="sticky bottom-3 z-10">{composer}</div>
          </div>}
        </section>
      )}
      {!run && !check && runs.length > 0 && <div className="text-[13px]"><div className="mb-2 text-slate-500">Recent requests</div><div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">{runs.slice(0, 4).map((r) => <Link key={r.id} className="flex items-center justify-between px-4 py-3 text-slate-700 hover:bg-slate-50" to={`/sourcing/live/${r.id}`}><span className="truncate">{r.text}</span><span className="ml-3 shrink-0 text-slate-400">›</span></Link>)}</div></div>}
      {run && (
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">{run.ask.title}</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">“{run.text}”</p>
          {run.stock && <div className="mt-3"><StockTiles st={run.stock} needBy={run.request.needBy} qty={run.request.qty} /></div>}
        </div>
      )}
      {run && !decide && <Waiting run={run} onCompare={doCompare} busy={cbusy} onRun={setRun} />}
      {run && decide && best && <Decision run={run} best={best} onRun={setRun} />}
      {run && (
        <details className="group rounded-2xl border border-slate-200 bg-white" data-testid="details-drawer">
          <summary className="cursor-pointer list-none px-5 py-4 text-[14px] font-medium text-slate-600 hover:text-slate-900">Details <span className="font-normal text-slate-400">– enquiry sent, scores, rule notes and full message log</span></summary>
          <div className="space-y-4 border-t border-slate-100 p-4">
            <div className="rounded-xl bg-slate-50 p-3.5 text-[13.5px] leading-relaxed text-slate-700" data-testid="run-enquiry"><div className="mb-1 text-[12px] text-slate-400">Enquiry sent</div>{run.ask.enquiry}</div>
            <SummaryCard run={run} onRun={setRun} />
            {top.concat(run.suppliers.filter((o) => !run.top.includes(o.ref))).map((o) => <SupplierCard key={o.ref} o={o} run={run} rank={run.top.indexOf(o.ref)} recommended={best?.ref === o.ref} onRun={setRun} />)}
          </div>
        </details>
      )}
      {!run && !check && <details className="group mx-auto w-full max-w-[680px] text-[14px]" data-testid="connections-drawer">
        <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 py-2 text-slate-500 hover:text-slate-800"><Plug size={14} />Connections<span className="text-slate-400">· how messages reach suppliers</span></summary>
        <div className="mt-3 text-left"><Connect st={st} onSaved={loadSt} /></div>
      </details>}
    </div>
  );
}
