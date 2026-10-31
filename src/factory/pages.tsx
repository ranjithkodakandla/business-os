import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, SquarePen, FileCheck2, ShieldAlert, ShoppingCart, Globe2, Users, CheckCircle2, Bot, RotateCcw } from 'lucide-react';
import { useStore } from '../lib/store';
import { useChat, Composer, Thread } from '../components/Conversation';
import { PageHeader, Card, Button, Badge, Callout, cx } from '../components/ui';
import { useFx, fx, renewalRows, TENDERS, tenderView, fmtD, daysTo, DOCS, GROUPS, groupState, groupTotal, inr, lakh, NEEDS, SITES, ORDERS, updateDue, CREW, FX_AGENTS, COMPANY, draftUpdate, LADDER, iso, type SiteId } from './data';
import { approveRenewal, preparePack, approvePack, approvePO, sendUpdate } from './actions';

const Pill = ({ left }: { left: number }) => <Badge tone={left < 0 ? 'red' : left <= 15 ? 'red' : left <= 45 ? 'amber' : 'green'} dot>{left < 0 ? `Expired ${-left}d ago` : `${left} days left`}</Badge>;
const CHIPS = ['What expires this quarter at the Hosur site?', 'Which approvals expire this month?', 'Prepare the tender pack for AP FiberGrid', "What are site 2's open purchase needs?", 'Draft a status update for the customer in Germany'];

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
  const ren = renewalRows(s).filter((x) => (x.left <= 30 || x.late) && x.status !== 'Filed – awaiting authority');
  const tq = TENDERS.map((t) => ({ t, v: tenderView(s, t) })).filter((x) => !x.v.approved).sort((a, b) => a.t.closes.localeCompare(b.t.closes));
  const buys = GROUPS.map((g) => groupState(s, g)).filter((g) => !g.po);
  const ups = ORDERS.filter((o) => updateDue(s, o));
  type Row = { k: string; icon: React.ElementType; tone: string; text: string; sub: string; cta: string; go: () => void; open: string };
  const rows: Row[] = [
    ...(ren.length ? [((): Row => { const ready = ren.filter((x) => x.status.startsWith('Pack ready')); const x = ren[0]; const many = ren.length > 1;
      return { k: 'licences', icon: ShieldAlert, tone: x.left < 0 ? 'bg-rose-500' : 'bg-amber-500', text: many ? `${ren.length} licences need you – ${x.r.kind} (${x.r.site === 'All' ? 'Company' : SITES[x.r.site].short}) ${x.left < 0 ? `expired ${-x.left} days ago` : `expires in ${x.left} days`}` : `${x.d.name} – ${x.left < 0 ? `expired ${-x.left} days ago` : `expires in ${x.left} days`}`,
        sub: ready.length ? `Renewal pack${ready.length > 1 ? 's' : ''} ready for ${ready.map((y) => `${y.r.kind} ${y.r.site === 'All' ? '' : SITES[y.r.site].short}`).join(' and ')} · ${x.r.agentNote}` : x.r.agentNote,
        cta: ready.length > 1 ? `Approve ${ready.length} & file` : ready.length ? 'Approve & file' : 'Draft renewal pack', go: () => ready.length ? ready.forEach((y) => approveRenewal(ctx, y.r.id)) : preparePack(ctx, x.r.id), open: '/renewals' }; })()] : []),
    ...tq.filter((x) => x.v.open.length).slice(0, 1).map((x): Row => ({ k: x.t.id, icon: FileCheck2, tone: 'bg-brand-500', text: `${x.t.id} ${x.t.name}: ${x.v.open.length} questions for you`, sub: `${x.v.pct}% already filled from your library · closes ${fmtD(x.t.closes)} · ${lakh(x.t.value)}`, cta: 'Answer', go: () => nav(`/tenders?t=${x.t.id}`), open: `/tenders?t=${x.t.id}` })),
    ...buys.slice(0, 1).map((g): Row => ({ k: g.id, icon: ShoppingCart, tone: 'bg-violet-500', text: `Buy ${g.item} – ${g.qty.toLocaleString('en-IN')} ${g.unit} from ${g.quotes[g.pick].supplier}`, sub: g.saving, cta: `Approve ${inr(groupTotal(g))}`, go: () => approvePO(ctx, g.id), open: '/purchasing' })),
    ...CREW.filter((c) => c.need && !s.booked[c.site]).map((c): Row => ({ k: 'crew-' + c.site, icon: Users, tone: 'bg-sky-500', text: `${SITES[c.site].short}: ${c.need}`, sub: `${c.presentDaily} of ${c.daily} daily-wage workers in today · ${c.agency} can send 8 by 2 pm at ${inr(c.dailyRate)}/day (${inr(8 * c.dailyRate)})`, cta: `Book 8 · ${inr(8 * c.dailyRate)}`, go: () => { fx.set((d) => { d.booked[c.site] = true; }); ctx.update(() => {}, `Booked 8 daily-wage workers for ${SITES[c.site].short} from ${c.agency} (simulated)`, { module: 'workforce', agent: true }); ctx.toast(`${c.agency} asked for 8 loaders by 2 pm – WhatsApp simulated`, 'green'); }, open: '/workforce' })),
    ...ups.slice(0, 1).map((o): Row => ({ k: o.id, icon: Globe2, tone: 'bg-emerald-500', text: `${o.contact} (${o.country}) is waiting for an update on ${o.id}`, sub: `Last update ${o.lastUpdateDays} days ago · draft ready from floor + QA data`, cta: 'Review & send', go: () => sendUpdate(ctx, o.id), open: `/customers?o=${o.id}` })),
  ].slice(0, 5);
  const crew = CREW.reduce((a, c) => a + c.presentFt + c.presentContract, 0); const crewT = CREW.reduce((a, c) => a + c.ft + c.contract, 0);
  return (
    <div className="pb-6">
      <section className="mx-auto max-w-[820px] pb-2 pt-6 text-center">
        <h1 className="text-[30px] font-semibold tracking-tight text-slate-900 md:text-[36px]">Good day, <span className="text-grad">Ranjith</span></h1>
        <p className="mt-1 text-[15px] text-slate-500">{COMPANY.name} · 3 sites · {rows.length} things need you today</p>
        <div className="mt-5 text-left"><Composer chat={{ ...chat, ask }} big placeholder="Which approvals expire this month?" footer={<span className="inline-flex items-center gap-1.5"><Sparkles size={12} className="text-brand-500" />Knows your licences, tenders, site purchases, export orders and people</span>} /></div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">{CHIPS.map((c) => <button key={c} onClick={() => ask(c)} className="chip-gloss rounded-full px-3 py-1.5 text-[13px] text-slate-600 hover:text-brand-700">{c}</button>)}</div>
      </section>
      <section className="mx-auto mt-6 max-w-[820px]">
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
        <div className="mt-2 text-right"><Link to="/renewals" className="text-[12px] font-medium text-brand-700 hover:underline">Full licence register →</Link></div>
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

/* ───────── Licence & approval register ───────── */
export function FxRenewals() {
  const ctx = useStore(); const s = useFx(); const [params, setParams] = useSearchParams();
  const [site, setSite] = useState<'All' | SiteId>('All'); const [win, setWin] = useState<0 | 30 | 60 | 90>(0);
  const open = params.get('r');
  const all = renewalRows(s); const live = all.filter((x) => x.status !== 'Filed – awaiting authority');
  const b = { over: live.filter((x) => x.left < 0), d30: live.filter((x) => x.left >= 0 && x.left <= 30), d60: live.filter((x) => x.left > 30 && x.left <= 60), d90: live.filter((x) => x.left > 60 && x.left <= 90) };
  const rows = all.filter((x) => (site === 'All' || x.r.site === site || x.r.site === 'All') && (!win || x.left <= win));
  const Tile = ({ k, label, n, tone }: { k: 0 | 30 | 60 | 90; label: string; n: number; tone: string }) => (
    <button onClick={() => setWin(win === k ? 0 : k)} className={cx('rounded-2xl border px-3 py-2.5 text-left', win === k && k ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white')}><div className={cx('text-[22px] font-semibold', tone)}>{n}</div><div className="text-2xs text-slate-500">{label}</div></button>);
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Today', to: '/' }, { label: 'Licences & approvals' }]} title="Licences & approvals – all sites" subtitle="Every government licence, NOC and consent for the 3 sites in one register. The agent starts each renewal early enough for the authority, drafts the pack from your document library, and waits for your OK." />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" data-testid="timeline">
        <Tile k={0} label="Overdue – act today" n={b.over.length} tone="text-rose-600" />
        <Tile k={30} label="Expire in 30 days" n={b.over.length + b.d30.length} tone="text-amber-600" />
        <Tile k={60} label="Expire in 60 days" n={b.over.length + b.d30.length + b.d60.length} tone="text-slate-800" />
        <Tile k={90} label="Expire in 90 days" n={live.filter((x) => x.left <= 90).length} tone="text-slate-800" />
      </div>
      <div className="flex flex-wrap gap-1.5">{(['All', 'S1', 'S2', 'S3'] as const).map((k) => <button key={k} onClick={() => setSite(k)} className={cx('rounded-full px-3 py-1 text-[12.5px]', site === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}>{k === 'All' ? 'All sites' : SITES[k].short}</button>)}</div>
      <Card pad={false}><table className="w-full text-[13px]"><thead className="bg-slate-50 text-left text-2xs uppercase text-slate-500"><tr><th className="px-3 py-2">Licence</th><th className="px-3 py-2">Authority · number</th><th className="px-3 py-2">Issued → expires</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2">Status</th><th /></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((x) => { const isOpen = open === x.r.id; const missing = x.checklist.filter((c) => !c.have); const filed = x.status.startsWith('Filed'); return (<React.Fragment key={x.r.id}>
          <tr data-reg={x.r.id} className={cx('cursor-pointer align-top hover:bg-slate-50/70', x.overdue && !filed && 'bg-rose-50/40')} onClick={() => setParams(isOpen ? {} : { r: x.r.id })}>
            <td className="px-3 py-2.5"><div className="font-medium text-slate-800">{x.r.kind}</div><div className="text-2xs text-slate-500">{x.r.site === 'All' ? 'Company' : SITES[x.r.site].short} · 📎 certificate on file</div></td>
            <td className="px-3 py-2.5 text-2xs text-slate-600"><div>{x.r.authority} <span className="text-slate-400">({x.r.level})</span></div><div className="font-mono">{x.r.number}</div></td>
            <td className="px-3 py-2.5 whitespace-nowrap text-2xs">{fmtD(x.r.issued)} → <b>{fmtD(x.d.validTill!)}</b><div className="mt-1">{filed ? <Badge tone="green">Filed</Badge> : <Pill left={x.left} />}</div>{x.late && !filed && x.left >= 0 && <div className="mt-1 text-rose-600">Authority takes ~{x.r.leadDays} days – start now</div>}</td>
            <td className="px-3 py-2.5 text-2xs text-slate-600">{x.r.owner}<div className="text-slate-400">approver: {x.r.approver}</div></td>
            <td className="px-3 py-2.5"><Badge tone={filed ? 'green' : x.overdue ? 'red' : x.status.startsWith('Pack') ? 'blue' : 'gray'}>{x.overdue && !filed ? 'Overdue' : x.status}</Badge></td>
            <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>{filed ? <span className="text-2xs text-emerald-700">Chasing in 7 days</span> : x.left > 90 ? <span className="text-2xs text-slate-400">No action</span> : x.status.startsWith('Pack') ? <Button size="sm" variant="primary" onClick={() => approveRenewal(ctx, x.r.id)}>Approve & file</Button> : <Button size="sm" onClick={() => { preparePack(ctx, x.r.id); setParams({ r: x.r.id }); }}>Draft pack</Button>}</td>
          </tr>
          {isOpen && <tr data-detail={x.r.id}><td colSpan={6} className="bg-slate-50/60 px-4 py-3"><div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
            <div><div className="mb-1 text-2xs font-semibold uppercase text-slate-500">Renewal checklist · {x.checklist.length - missing.length} of {x.checklist.length} ready</div>
              {x.checklist.map((c) => <div key={c.label} className="flex items-center gap-2 py-0.5 text-[12.5px]"><span className={c.have ? 'text-emerald-600' : 'text-rose-500'}>{c.have ? '✓' : '✗'}</span><span className="text-slate-700">{c.label}</span>{c.docId && <span className="text-2xs text-slate-400">from library</span>}{!c.have && <span className="text-2xs text-rose-600">– to collect</span>}</div>)}
              <div className="mt-2 text-[12.5px] text-violet-700">🤖 {x.r.agentNote}{missing.length ? ` Missing: ${missing.map((m) => m.label.toLowerCase()).join(', ')} – asked ${x.r.owner.split(' ')[0]} on WhatsApp (simulated).` : ''}</div>
              <div className="mt-1 text-2xs text-slate-500">Fee {x.r.fee ? inr(x.r.fee) : 'nil'} · authority usually takes {x.r.leadDays} days</div></div>
            <div><div className="mb-1 text-2xs font-semibold uppercase text-slate-500">Reminders (90 / 60 / 30 / 7 days)</div>
              {LADDER.map((l) => { const sent = x.left <= l.at; return <div key={l.at} className="flex items-center gap-2 py-0.5 text-[12.5px]"><span className={sent ? 'text-emerald-600' : 'text-slate-300'}>{sent ? '●' : '○'}</span><span className="w-14 text-slate-500">{l.at} days</span><span className="text-slate-700">{l.ch} → {l.to === 'owner' ? x.r.owner : l.to === 'owner and Ranjith' ? `${x.r.owner} + Ranjith` : l.to}</span><span className="text-2xs text-slate-400">{sent ? (filed ? 'sent' : 'sent · simulated') : `due ${fmtD(iso(x.left - l.at))}`}</span></div>; })}</div>
          </div></td></tr>}
        </React.Fragment>); })}</tbody></table></Card>
      <p className="text-2xs text-slate-400">Reminders escalate at 90, 60, 30 and 7 days before expiry – in-app, WhatsApp and email. All reminders and filings in this demo are simulated; nothing is sent to any authority.</p>
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
            <div className="grid grid-cols-2 gap-2 text-center text-[12px]"><div className="rounded-xl bg-slate-50 p-2"><div className="text-[17px] font-semibold">{o.qaInspected.toLocaleString('en-IN')}</div>inspected</div><div className="rounded-xl bg-emerald-50 p-2"><div className="text-[17px] font-semibold">{o.qaPass.toLocaleString('en-IN')}</div>passed first time</div><div className="rounded-xl bg-rose-50 p-2"><div className="text-[17px] font-semibold">{(o.qaInspected - o.qaPass).toLocaleString('en-IN')}</div>reworked</div></div>
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
      <PageHeader crumbs={[{ label: 'Today', to: '/' }, { label: 'Workforce' }]} title="Workforce today" subtitle="Full-time, contract and daily-wage headcount by site, from the gate biometric." />
      {!clraOk && <Callout tone="red" icon={<ShieldAlert size={16} />} title="Site 3: contract labour licence expired 3 days ago" action={<Link to="/renewals" className="text-[12px] font-medium text-brand-700 underline">Approve renewal</Link>}>57 contract workers are on site today without licence cover.</Callout>}
      <div className="grid gap-3 md:grid-cols-3">{CREW.map((c) => (
        <Card key={c.site} title={SITES[c.site].short} subtitle={`${SITES[c.site].makes} · ${c.shifts}`}>
          <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-brand-50 p-2"><div className="text-[20px] font-semibold">{c.presentFt}<span className="text-[13px] text-slate-500">/{c.ft}</span></div><div className="text-2xs">Full-time present</div></div><div className="rounded-xl bg-amber-50 p-2"><div className="text-[20px] font-semibold">{c.presentContract}<span className="text-[13px] text-slate-500">/{c.contract}</span></div><div className="text-2xs">Contract present</div></div><div className="rounded-xl bg-sky-50 p-2"><div className="text-[20px] font-semibold">{c.presentDaily + (s.booked[c.site] ? 8 : 0)}<span className="text-[13px] text-slate-500">/{c.daily}</span></div><div className="text-2xs">Daily wage</div></div></div>
          <div className="mt-2 text-2xs text-slate-500">Daily wage: <b>{c.presentDaily}/{c.daily}</b> at {inr(c.dailyRate)}/day{c.need && !s.booked[c.site] ? <span className="text-rose-600"> · {c.need}</span> : c.need ? <span className="text-emerald-700"> · 8 booked from agency</span> : null}</div>
          <div className="mt-1 text-2xs text-slate-500">Contractor: {c.agency} · absent today: {c.ft - c.presentFt + c.contract - c.presentContract}</div>
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
