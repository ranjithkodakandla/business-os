import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, SquarePen, FileCheck2, ShieldAlert, ShoppingCart, Globe2, Users, CheckCircle2, Bot, RotateCcw } from 'lucide-react';
import { useStore } from '../lib/store';
import { useChat, Composer, Thread } from '../components/Conversation';
import { PageHeader, Card, Button, Badge, Callout, cx } from '../components/ui';
import { useFx, fx, renewalRows, TENDERS, tenderView, fmtD, daysTo, DOCS, GROUPS, groupState, groupTotal, inr, lakh, NEEDS, SITES, ORDERS, updateDue, CREW, FX_AGENTS, COMPANY, draftUpdate } from './data';
import { approveRenewal, approvePack, approvePO, sendUpdate } from './actions';

const Pill = ({ left }: { left: number }) => <Badge tone={left < 0 ? 'red' : left <= 15 ? 'red' : left <= 45 ? 'amber' : 'green'} dot>{left < 0 ? `Expired ${-left}d ago` : `${left} days left`}</Badge>;
const CHIPS = ['Which approvals expire this month?', 'Prepare the tender pack for AP FiberGrid', "What are site 2's open purchase needs?", 'Draft a status update for the customer in Germany'];

/* ───────── Today ───────── */
export function FxHome() {
  const ctx = useStore(); const s = useFx(); const chat = useChat(); const nav = useNavigate();
  const [params, setParams] = useSearchParams(); const inChat = params.get('chat') === '1';
  const ask = (t: string) => { const ok = chat.ask(t); if (ok && !inChat) setParams({ chat: '1' }); return ok; };
  if (inChat) return (
    <div className="mx-auto flex min-h-[calc(100vh-150px)] max-w-[820px] flex-col" data-testid="chat-view">
      <div className="surface-glass sticky top-14 z-20 -mx-3 -mt-4 mb-4 flex items-center gap-2 border-b border-slate-200/60 px-3 py-2 md:-mx-8 md:-mt-6 md:px-8">
        <button onClick={() => setParams({})} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100"><ArrowLeft size={16} />Today</button>
        <div className="flex-1 text-center text-[13px] font-medium text-slate-500"><Sparkles size={13} className="mr-1 inline text-brand-600" />Shakti AI</div>
        <button onClick={() => { ctx.update((d) => { d.chat = []; }); setParams({}); }} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700"><SquarePen size={15} />New chat</button>
      </div>
      <div className="flex-1 pb-6"><Thread thinking={chat.thinking} stage={chat.stage} /></div>
      <div className="sticky bottom-0 z-20 bg-gradient-to-t from-[var(--canvas)] via-[var(--canvas)] to-transparent pb-4 pt-6">
        <Composer chat={{ ...chat, ask }} placeholder="Ask about approvals, tenders, purchases, customers…" />
        <div className="mt-2 text-center text-[11.5px] text-slate-400">Nothing is sent to a customer, supplier or authority without your OK. All sends in this demo are simulated.</div>
      </div>
    </div>
  );
  const ren = renewalRows(s).filter((x) => x.left <= 30 && x.status !== 'Filed – awaiting authority');
  const tq = TENDERS.map((t) => ({ t, v: tenderView(s, t) })).filter((x) => !x.v.approved).sort((a, b) => a.t.closes.localeCompare(b.t.closes));
  const buys = GROUPS.map((g) => groupState(s, g)).filter((g) => !g.po);
  const ups = ORDERS.filter((o) => updateDue(s, o));
  type Row = { k: string; icon: React.ElementType; tone: string; text: string; sub: string; cta: string; go: () => void; open: string };
  const rows: Row[] = [
    ...ren.slice(0, 3).map((x): Row => ({ k: x.r.id, icon: ShieldAlert, tone: x.left < 0 ? 'bg-rose-500' : 'bg-amber-500', text: `${x.d.name} – ${x.left < 0 ? `expired ${-x.left} days ago` : `expires in ${x.left} days`}`, sub: x.r.agentNote, cta: x.status.startsWith('Pack ready') ? 'Approve renewal' : 'Start renewal', go: () => x.status.startsWith('Pack ready') ? approveRenewal(ctx, x.r.id) : nav('/renewals'), open: '/renewals' })),
    ...tq.filter((x) => x.v.open.length).slice(0, 2).map((x): Row => ({ k: x.t.id, icon: FileCheck2, tone: 'bg-brand-500', text: `${x.t.id} ${x.t.name}: ${x.v.open.length} questions for you`, sub: `${x.v.pct}% already filled from your library · closes ${fmtD(x.t.closes)} · ${lakh(x.t.value)}`, cta: 'Answer', go: () => nav(`/tenders?t=${x.t.id}`), open: `/tenders?t=${x.t.id}` })),
    ...buys.slice(0, 2).map((g): Row => ({ k: g.id, icon: ShoppingCart, tone: 'bg-violet-500', text: `Buy ${g.item} – ${g.qty.toLocaleString('en-IN')} ${g.unit} from ${g.quotes[g.pick].supplier}`, sub: g.saving, cta: `Approve ${inr(groupTotal(g))}`, go: () => approvePO(ctx, g.id), open: '/purchasing' })),
    ...ups.map((o): Row => ({ k: o.id, icon: Globe2, tone: 'bg-emerald-500', text: `${o.contact} (${o.country}) is waiting for an update on ${o.id}`, sub: `Last update ${o.lastUpdateDays} days ago · draft ready from floor + QA data`, cta: 'Review & send', go: () => sendUpdate(ctx, o.id), open: `/customers?o=${o.id}` })),
  ];
  const crew = CREW.reduce((a, c) => a + c.presentFt + c.presentContract, 0); const crewT = CREW.reduce((a, c) => a + c.ft + c.contract, 0);
  return (
    <div className="pb-6">
      <section className="mx-auto max-w-[820px] pb-2 pt-6 text-center">
        <h1 className="text-[30px] font-semibold tracking-tight text-slate-900 md:text-[36px]">Good day, <span className="text-grad">Ranjith</span></h1>
        <p className="mt-1 text-[15px] text-slate-500">{COMPANY.name} · 3 sites · {rows.length} things need you today</p>
        <div className="mt-5 text-left"><Composer chat={{ ...chat, ask }} big placeholder="Which approvals expire this month?" footer={<span className="inline-flex items-center gap-1.5"><Sparkles size={12} className="text-brand-500" />Knows your licences, tenders, site purchases, export orders and people</span>} /></div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">{CHIPS.map((c) => <button key={c} onClick={() => ask(c)} className="chip-gloss rounded-full px-3 py-1.5 text-[13px] text-slate-600 hover:text-brand-700">{c}</button>)}</div>
      </section>
      <section className="mx-auto mt-6 grid max-w-[1240px] gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="tile-gloss rounded-3xl p-4" data-testid="needs-today">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[15px] font-semibold text-slate-900">Needs you today</h2><span className="rounded-full bg-rose-50 px-2 py-0.5 text-2xs font-semibold text-rose-600">{rows.length}</span></div>
          {rows.length === 0 ? <div className="py-6 text-center text-[13px] text-slate-500"><CheckCircle2 className="mx-auto mb-1 text-emerald-500" />All clear for today.</div> :
          <div className="space-y-1.5">{rows.map((r) => (
            <div key={r.k} data-todo={r.k} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2.5">
              <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-white', r.tone)}><r.icon size={15} /></span>
              <Link to={r.open} className="min-w-0 flex-1"><div className="text-[13px] font-medium text-slate-800">{r.text}</div><div className="line-clamp-2 text-2xs text-slate-500">{r.sub}</div></Link>
              <button onClick={r.go} data-cta={r.k} className="btn-primary h-8 shrink-0 whitespace-nowrap rounded-full px-3 text-[12px] font-medium">{r.cta}</button>
            </div>))}</div>}
        </div>
        <div className="space-y-4">
          <div className="agent-panel rounded-3xl p-4" data-testid="agent-activity">
            <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><span className="live-dot text-emerald-500" />Agents at work</h2><Link to="/agents" className="text-[12px] font-medium text-brand-700 hover:underline">Settings →</Link></div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 text-[13px]">
              {[['Renewals watcher', `Checked ${DOCS.filter((d) => d.validTill).length} licences · ${ren.length} due in 30 days · ${ren.filter((x) => x.status.startsWith('Pack')).length} packs ready`, '/renewals'],
                ['Tender assistant', `${TENDERS.length} tenders filled from library (${TENDERS.map((t) => tenderView(s, t).pct + '%').join(', ')})`, '/tenders'],
                ['Purchase consolidator', `${NEEDS.length} site needs → ${GROUPS.length} buys · found 1 internal transfer from Site 3`, '/purchasing'],
                ['Customer update writer', `${ups.length} customer update${ups.length === 1 ? '' : 's'} drafted from floor + QA notes`, '/customers']].map(([a, t, to]) => (
                <Link key={a} to={to} className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50"><Bot size={15} className="mt-0.5 shrink-0 text-violet-600" /><div><div className="font-medium text-slate-800">{a}</div><div className="text-2xs text-slate-500">{t}</div></div></Link>))}
            </div>
          </div>
          <Link to="/workforce" className="tile-gloss block rounded-3xl p-4"><div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900"><Users size={15} className="text-brand-600" />At work today</div><div className="mt-1 text-[22px] font-semibold text-slate-900">{crew} <span className="text-[13px] font-normal text-slate-500">of {crewT} · 70 full-time, 175 contract</span></div></Link>
        </div>
      </section>
      <div className="mt-6 text-center"><button onClick={() => { fx.reset(); ctx.update((d) => { d.chat = []; }); ctx.toast('Factory demo data restored', 'blue'); }} className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-700"><RotateCcw size={12} />Reset demo</button></div>
    </div>
  );
}

/* ───────── Tenders & document library ───────── */
export function FxTenders() {
  const ctx = useStore(); const s = useFx(); const [params, setParams] = useSearchParams();
  const t = TENDERS.find((x) => x.id === params.get('t')) || TENDERS[0]; const v = tenderView(s, t);
  const [lib, setLib] = useState(false);
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Today', to: '/' }, { label: 'Tenders & documents' }]} title="Tenders & documents" subtitle="Your company documents are stored once. Each tender is filled from them – you only answer what is new." actions={<Button onClick={() => setLib(!lib)}>{lib ? 'Back to tenders' : `Document library (${DOCS.length})`}</Button>} />
      {lib ? (
        <Card title="Document library" subtitle="Reused in every tender. Expiry dates feed Approvals & renewals.">
          <table className="w-full text-[13px]"><tbody className="divide-y divide-slate-100">{DOCS.map((d) => <tr key={d.id}><td className="py-2 pr-3 text-slate-800">{d.name}</td><td className="py-2 pr-3 text-slate-500">{d.group}</td><td className="py-2 text-right">{d.validTill ? <Pill left={daysTo(d.validTill)} /> : <span className="text-2xs text-slate-400">no expiry</span>}</td></tr>)}</tbody></table>
        </Card>) : (<>
        <div className="grid gap-3 md:grid-cols-3">{TENDERS.map((x) => { const xv = tenderView(s, x); return (
          <button key={x.id} onClick={() => setParams({ t: x.id })} className={cx('rounded-2xl border bg-white p-3 text-left transition', x.id === t.id ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-300')}>
            <div className="text-2xs font-semibold text-slate-500">{x.id} · closes {fmtD(x.closes)}</div><div className="text-[14px] font-semibold text-slate-900">{x.name}</div><div className="text-2xs text-slate-500">{x.buyer} · {lakh(x.value)}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-500" style={{ width: `${xv.pct}%` }} /></div>
            <div className="mt-1 text-2xs text-slate-600">{xv.approved ? '✓ Pack approved' : `${xv.pct}% from library · ${xv.open.length} questions for you`}</div>
          </button>); })}</div>
        <Card title={`${t.id} · ${t.name}`} subtitle={`${v.fromLib} of ${t.items.length} items filled from your library (${v.pct}%).`} actions={v.approved ? <Badge tone="green" dot>Pack approved</Badge> : <Button variant="primary" disabled={v.open.length > 0} onClick={() => approvePack(ctx, t.id)}>{v.open.length ? `Answer ${v.open.length} to approve` : 'Approve pack'}</Button>}>
          {v.expiring.map((r) => <Callout key={r.it.id} tone="red" icon={<ShieldAlert size={16} />} title={`${r.d!.name} expires ${fmtD(r.expires!)} – before this bid closes`} action={<Link to="/renewals" className="text-[12px] font-medium text-brand-700 underline">Renew</Link>}>The buyer may reject an expired certificate during evaluation.</Callout>)}
          <div className="mt-2 divide-y divide-slate-100">{v.rows.map((r) => (
            <div key={r.it.id} className="flex flex-wrap items-start gap-3 py-2.5 text-[13px]">
              <span className="w-56 shrink-0 font-medium text-slate-800">{r.it.ask}</span>
              <div className="min-w-0 flex-1">{r.state === 'library' || r.state === 'expiring' ? <span className="text-slate-600">📎 {r.d!.name}</span> : r.state === 'answered' ? <span className="text-slate-700">✍️ {r.ans}</span> : (
                <AnswerBox hint={r.it.hint} onSave={(a) => { fx.set((d) => { d.answers[`${t.id}.${r.it.id}`] = a; }); ctx.toast('Answer saved to the pack', 'green'); }} />)}</div>
              <span className="shrink-0">{r.state === 'library' ? <Badge tone="green">From library</Badge> : r.state === 'expiring' ? <Badge tone="red">Expiring</Badge> : r.state === 'answered' ? <Badge tone="blue">Your answer</Badge> : <Badge tone="amber">Needs you</Badge>}</span>
            </div>))}</div>
        </Card></>)}
    </div>
  );
}
function AnswerBox({ hint, onSave }: { hint?: string; onSave: (a: string) => void }) {
  const [a, setA] = useState('');
  return <div><div className="mb-1 text-2xs text-slate-500">💡 {hint}</div><div className="flex gap-2"><input value={a} onChange={(e) => setA(e.target.value)} placeholder="Type your answer" className="h-8 flex-1 rounded-lg border border-slate-200 px-2 text-[13px]" /><Button size="sm" variant="primary" disabled={!a.trim()} onClick={() => onSave(a.trim())}>Save</Button></div></div>;
}

/* ───────── Approvals & renewals ───────── */
export function FxRenewals() {
  const ctx = useStore(); const s = useFx(); const rows = renewalRows(s);
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Today', to: '/' }, { label: 'Approvals & renewals' }]} title="Approvals & renewals" subtitle="Every licence, NOC and certificate across 3 sites. The agent starts each renewal early enough for the authority's usual time, prepares the pack, and you approve." />
      <Card pad={false}><table className="w-full text-[13px]"><thead className="bg-slate-50 text-left text-2xs uppercase text-slate-500"><tr><th className="px-3 py-2">Approval</th><th className="px-3 py-2">Expires</th><th className="px-3 py-2">Owner → approver</th><th className="px-3 py-2">Status</th><th /></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((x) => (
          <tr key={x.r.id} className="align-top">
            <td className="px-3 py-2.5"><div className="font-medium text-slate-800">{x.d.name}</div><div className="text-2xs text-slate-500">{x.r.authority} · fee {x.r.fee ? inr(x.r.fee) : 'nil'}</div><div className="mt-1 max-w-[460px] text-2xs text-slate-600">🤖 {x.r.agentNote}</div></td>
            <td className="px-3 py-2.5 whitespace-nowrap">{fmtD(x.d.validTill!)}<div className="mt-1"><Pill left={x.left} /></div>{x.late && x.status !== 'Filed – awaiting authority' && <div className="mt-1 text-2xs text-rose-600">Authority takes ~{x.r.leadDays} days</div>}</td>
            <td className="px-3 py-2.5 text-2xs text-slate-600">{x.r.owner} → {x.r.approver}</td>
            <td className="px-3 py-2.5"><Badge tone={x.status.startsWith('Filed') ? 'green' : x.status.startsWith('Pack') ? 'blue' : 'gray'}>{x.status}</Badge></td>
            <td className="px-3 py-2.5 text-right">{x.status.startsWith('Filed') ? <span className="text-2xs text-emerald-700">Chasing in 7 days</span> : x.status.startsWith('Pack') ? <Button size="sm" variant="primary" onClick={() => approveRenewal(ctx, x.r.id)}>Approve & file</Button> : <Button size="sm" onClick={() => { fx.set((d) => { d.renewals[x.r.id] = 'Pack ready – needs your OK'; }); ctx.toast(`Renewal pack prepared and sent to ${x.r.owner} to check (simulated)`, 'blue'); }}>Prepare pack</Button>}</td>
          </tr>))}</tbody></table></Card>
      <p className="text-2xs text-slate-400">Reminders go to the owner 45, 30, 15 and 7 days before expiry on WhatsApp and email (simulated in this demo).</p>
    </div>
  );
}

/* ───────── Purchasing (multi-site) ───────── */
export function FxPurchasing() {
  const ctx = useStore(); const s = useFx();
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Today', to: '/' }, { label: 'Purchasing' }]} title="Purchasing – all sites" subtitle={`${NEEDS.length} needs raised by 3 site heads, merged into ${GROUPS.length} buys. Compare and approve – the PO is sent only after your OK.`} />
      {GROUPS.map((g0) => { const g = groupState(s, g0); return (
        <Card key={g.id} title={`${g.item} · ${g.qty.toLocaleString('en-IN')} ${g.unit}`} subtitle={g.needs.map((n) => { const x = NEEDS.find((y) => y.id === n)!; return `${SITES[x.site].short}: ${x.qty.toLocaleString('en-IN')} ${x.unit} by ${fmtD(x.by)}`; }).join(' · ')}
          actions={g.po ? <Badge tone="green" dot>{g.po} {g.sent ? 'sent' : 'approved'}</Badge> : <Button variant="primary" onClick={() => approvePO(ctx, g.id)}>Approve {inr(groupTotal(g))}</Button>}>
          <div className="mb-2 text-[12.5px] text-violet-700">🤖 {g.saving}</div>
          <table className="w-full text-[13px]"><tbody className="divide-y divide-slate-100">{g.quotes.map((q, i) => (
            <tr key={q.supplier} className={cx(i === g.pick && 'bg-brand-50/50')}>
              <td className="py-2 pl-2"><input type="radio" disabled={!!g.po} checked={i === g.pick} onChange={() => fx.set((d) => { d.groups[g.id] = { ...d.groups[g.id], pick: i }; })} /></td>
              <td className="py-2 font-medium text-slate-800">{q.supplier}{i === g0.pick && <Badge tone="violet">Recommended</Badge>}</td>
              <td className="py-2 text-right tabular-nums">{inr(q.price)}{g.unit === 'lot' ? '' : ` / ${g.unit === 't' ? 't' : g.unit === 'm' ? 'm' : 'pc'}`}</td>
              <td className="py-2 text-right text-slate-600">{q.days} days</td><td className="py-2 pl-3 text-2xs text-slate-500">{q.note}</td>
            </tr>))}</tbody></table>
        </Card>); })}
    </div>
  );
}

/* ───────── Customer orders, QA and mail ───────── */
export function FxCustomers() {
  const ctx = useStore(); const s = useFx(); const [params, setParams] = useSearchParams();
  const o = ORDERS.find((x) => x.id === params.get('o')) || ORDERS[0];
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Today', to: '/' }, { label: 'Customer orders & QA' }]} title="Customer orders & QA" subtitle="Floor updates, QA results and the customer's emails in one place per order. The agent drafts the update; you send it." />
      <div className="grid gap-3 md:grid-cols-3">{ORDERS.map((x) => (
        <button key={x.id} onClick={() => setParams({ o: x.id })} className={cx('rounded-2xl border bg-white p-3 text-left', x.id === o.id ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-300')}>
          <div className="flex justify-between text-2xs font-semibold text-slate-500"><span>{x.id} · {x.country}</span>{updateDue(s, x) ? <span className="text-rose-600">Update due</span> : s.updates[x.id] ? <span className="text-emerald-600">Updated</span> : null}</div>
          <div className="text-[14px] font-semibold text-slate-900">{x.customer.replace(' (fictional)', '')}</div><div className="text-2xs text-slate-500">{x.qty.toLocaleString('en-IN')} × {x.product}</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${(x.done / x.qty) * 100}%` }} /></div>
          <div className="mt-1 text-2xs text-slate-600">{Math.round((x.done / x.qty) * 100)}% done · QA {((x.qaPass / x.qaInspected) * 100).toFixed(1)}% · ships {fmtD(x.ship)}</div>
        </button>))}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Order thread" subtitle="Customer emails and floor / QA notes, newest last">
          <div className="space-y-2">{o.mails.map((m, i) => (
            <div key={i} className={cx('rounded-xl px-3 py-2 text-[13px]', m.dir === 'in' ? 'bg-sky-50' : 'bg-slate-50')}><div className="text-2xs font-semibold text-slate-500">{m.dir === 'in' ? '✉️ ' : '🏭 '}{m.from} · {fmtD(m.at)}</div>{m.text}</div>))}
            {o.ncr && <Callout tone="amber" title="Open QA issue">{o.ncr}</Callout>}
            <div className="grid grid-cols-3 gap-2 text-center text-[12px]"><div className="rounded-xl bg-slate-50 p-2"><div className="text-[17px] font-semibold">{o.qaInspected.toLocaleString('en-IN')}</div>inspected</div><div className="rounded-xl bg-emerald-50 p-2"><div className="text-[17px] font-semibold">{o.qaPass.toLocaleString('en-IN')}</div>passed first time</div><div className="rounded-xl bg-rose-50 p-2"><div className="text-[17px] font-semibold">{(o.qaInspected - o.qaPass).toLocaleString('en-IN')}</div>reworked</div></div>
          </div>
        </Card>
        <Card title={`Draft update to ${o.contact}`} subtitle={`${o.email} · written from the floor and QA data`} actions={s.updates[o.id] ? <Badge tone="green" dot>Sent (simulated)</Badge> : <Button variant="primary" onClick={() => sendUpdate(ctx, o.id)}>Review & send</Button>}>
          <pre className="whitespace-pre-wrap font-sans text-[13px] text-slate-700">{draftUpdate(o)}</pre>
        </Card>
      </div>
    </div>
  );
}

/* ───────── Workforce ───────── */
export function FxWorkforce() {
  const s = useFx(); const clraOk = String(s.renewals['RN-01'] || '').startsWith('Filed');
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Today', to: '/' }, { label: 'Workforce' }]} title="Workforce today" subtitle="Full-time and contract headcount by site, from the gate biometric." />
      {!clraOk && <Callout tone="red" icon={<ShieldAlert size={16} />} title="Site 3: contract labour licence expired 3 days ago" action={<Link to="/renewals" className="text-[12px] font-medium text-brand-700 underline">Approve renewal</Link>}>57 contract workers are on site today without licence cover.</Callout>}
      <div className="grid gap-3 md:grid-cols-3">{CREW.map((c) => (
        <Card key={c.site} title={SITES[c.site].short} subtitle={`${SITES[c.site].makes} · ${c.shifts}`}>
          <div className="grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-brand-50 p-2"><div className="text-[20px] font-semibold">{c.presentFt}<span className="text-[13px] text-slate-500">/{c.ft}</span></div><div className="text-2xs">Full-time present</div></div><div className="rounded-xl bg-amber-50 p-2"><div className="text-[20px] font-semibold">{c.presentContract}<span className="text-[13px] text-slate-500">/{c.contract}</span></div><div className="text-2xs">Contract present</div></div></div>
          <div className="mt-2 text-2xs text-slate-500">Contractor: {c.agency} · absent today: {c.ft - c.presentFt + c.contract - c.presentContract}</div>
        </Card>))}</div>
    </div>
  );
}

/* ───────── Agents ───────── */
export function FxAgents() {
  const ctx = useStore(); const s = useFx();
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Today', to: '/' }, { label: 'Agents' }]} title="Agents" subtitle="They prepare the work in the background. Nothing is filed, bought or sent without your OK." />
      <div className="grid gap-3 md:grid-cols-2">{FX_AGENTS.map((a) => { const off = !!s.agentsOff[a.id]; return (
        <Card key={a.id} title={a.name} actions={<Button size="sm" variant={off ? 'primary' : 'secondary'} onClick={() => { fx.set((d) => { d.agentsOff[a.id] = !off; }); ctx.toast(`${a.name} ${off ? 'turned on' : 'paused'}`, 'blue'); }}>{off ? 'Turn on' : 'Pause'}</Button>}>
          <p className="text-[13px] text-slate-600">{a.does}</p><div className="mt-2"><Badge tone={off ? 'gray' : 'green'} dot>{off ? 'Paused' : 'On · prepares for your approval'}</Badge></div>
        </Card>); })}</div>
    </div>
  );
}
