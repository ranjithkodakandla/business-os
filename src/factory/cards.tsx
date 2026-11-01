/** Interactive chat cards for the factory demo: mini bar charts, licence confirm, supplier comparison, tender eligibility + price + bid ZIP. */
import React, { useState } from 'react';
import { Check, X, AlertTriangle, Download, Bell, Star, FileText } from 'lucide-react';
import { useStore } from '../lib/store';
import { Badge, Button, cx } from '../components/ui';
import { fx, SITES, inr, fmtD, daysTo, lakh, type Renewal, type SiteId } from './data';
import { reminderPlan, tenderTitle, type FxC } from './brain';
import { buildBidZip, download } from './docs';

const TONE = { red: 'bg-rose-500', amber: 'bg-amber-500', green: 'bg-emerald-500', blue: 'bg-brand-500' };
const box = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
let seq = 0;

export function FxCard({ c, onChange }: { c: FxC; onChange: (c: FxC) => void }) {
  if (c.k === 'bars') return <Bars c={c} />;
  if (c.k === 'licence') return <Licence c={c} onChange={onChange} />;
  if (c.k === 'sourcing') return <Sourcing c={c} onChange={onChange} />;
  return <TenderCard c={c} onChange={onChange} />;
}

function Bars({ c }: { c: Extract<FxC, { k: 'bars' }> }) {
  const max = Math.max(...c.bars.map((b) => b.v), 1);
  return <div className={box} data-fx="bars"><div className="mb-3 text-[13px] font-semibold text-slate-700">{c.title}</div>
    <div className="space-y-2">{c.bars.map((b) => <div key={b.label} className="flex items-center gap-3 text-[12.5px]"><div className="w-40 shrink-0 truncate text-slate-600">{b.label}</div>
      <div className="h-3 flex-1 rounded-full bg-slate-100"><div className={cx('h-3 rounded-full', TONE[b.tone || 'blue'])} style={{ width: `${Math.max(3, (b.v / max) * 100)}%` }} /></div><div className="w-16 text-right font-medium tabular-nums text-slate-800">{b.v}{c.unit === '%' ? '%' : ` ${c.unit}`}</div></div>)}</div>
    {c.note && <div className="mt-3 text-[12px] text-slate-500">{c.note}</div>}</div>;
}

const Field = ({ label, value, set, type = 'text', disabled, testid }: { label: string; value: string; set: (v: string) => void; type?: string; disabled?: boolean; testid?: string }) => (
  <label className="block text-[11.5px] text-slate-500">{label}<input data-field={testid} type={type} value={value} disabled={disabled} onChange={(e) => set(e.target.value)} className={cx('mt-0.5 w-full rounded-lg border px-2 py-1.5 text-[13px] text-slate-900', !value ? 'border-amber-400 bg-amber-50' : 'border-slate-200')} /></label>);

function Licence({ c, onChange }: { c: Extract<FxC, { k: 'licence' }>; onChange: (c: FxC) => void }) {
  const ctx = useStore(); const f = c.f; const done = c.status !== 'pending';
  const set = (k: keyof typeof f) => (v: string) => onChange({ ...c, f: { ...f, [k]: v } });
  const left = f.expires ? daysTo(f.expires) : null; const plan = f.expires ? reminderPlan(f.expires) : [];
  const confirm = () => {
    if (!f.kind || !f.expires || !f.site) { ctx.toast('Please fill the licence type, site and expiry date first', 'amber'); return; }
    const id = `RN-U${Date.now().toString().slice(-4)}${++seq}`; const site = f.site as SiteId;
    const r: Renewal = { id, docId: `D-${id}`, site, kind: f.kind, authority: f.authority || '—', level: /municipal|corporation/i.test(f.authority) ? 'Local' : /dgca|central/i.test(f.authority) ? 'Central' : 'State', number: f.number || '—', issued: f.issued || '',
      owner: ({ S1: 'Mahesh (Site 1 head)', S2: 'Arjun (Site 2 head)', S3: 'Prakash (Site 3 head)' } as const)[site], approver: 'Ranjith', status: 'Not started', fee: 0, leadDays: /pollution|cto/i.test(f.kind) ? 45 : 30,
      agentNote: `Added from ${c.file}. Renewals watcher will prepare the pack ${/pollution|cto/i.test(f.kind) ? 45 : 30} days before expiry.`, checklist: [{ label: `Previous ${f.kind} (uploaded)`, ok: true }, { label: 'Renewal application (auto-filled)', ok: true }],
      doc: { id: `D-${id}`, name: `${f.kind} – ${SITES[site].short}`, group: 'Approvals', site, validTill: f.expires }, reminders: plan };
    fx.set((d) => { d.added = [...(d.added || []).filter((x) => x.number !== r.number || r.number === '—'), r]; });
    ctx.update(() => {}, `Added ${r.doc!.name} (${r.number}) to the licence register from an uploaded document; reminders set at 90/60/30/7 days`, { module: 'compliance', record: id, agent: true });
    ctx.toast(`${r.doc!.name} added to the register – ${plan.filter((p) => !p.done).length} reminders scheduled`, 'green');
    onChange({ ...c, status: 'added', id });
  };
  return <div className={box} data-fx="licence" data-status={c.status}>
    <div className="flex items-center gap-2 text-[13px] text-slate-500"><FileText size={15} />{c.file}<span className="text-slate-400">· read by {c.how === 'ocr' ? 'photo text recognition' : c.how === 'pdf' ? 'PDF reader' : 'text'}</span></div>
    {c.dup && !done && <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">This number is already in your register ({c.dup}). Confirming will add it as a new entry.</div>}
    <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-3">
      <Field label="Licence type" value={f.kind} set={set('kind')} disabled={done} testid="kind" /><Field label="Number" value={f.number} set={set('number')} disabled={done} testid="number" />
      <label className="block text-[11.5px] text-slate-500">Site<select data-field="site" value={f.site} disabled={done} onChange={(e) => set('site')(e.target.value)} className={cx('mt-0.5 w-full rounded-lg border px-2 py-1.5 text-[13px]', !f.site ? 'border-amber-400 bg-amber-50' : 'border-slate-200')}><option value="">Choose…</option>{(Object.keys(SITES) as SiteId[]).map((k) => <option key={k} value={k}>{SITES[k].short}</option>)}</select></label>
      <div className="col-span-2 md:col-span-3"><Field label="Issuing authority" value={f.authority} set={set('authority')} disabled={done} testid="authority" /></div>
      <Field label="Issued on" type="date" value={f.issued} set={set('issued')} disabled={done} testid="issued" /><Field label="Expires on" type="date" value={f.expires} set={set('expires')} disabled={done} testid="expires" />
      <div className="flex items-end pb-1">{left !== null && <Badge tone={left < 0 ? 'red' : left <= 30 ? 'red' : left <= 90 ? 'amber' : 'green'} dot>{left < 0 ? `Expired ${-left} days ago` : `${left} days left`}</Badge>}</div>
    </div>
    {plan.length > 0 && <div className="mt-3 rounded-xl bg-slate-50 p-3"><div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-slate-600"><Bell size={13} />Reminders {done ? 'scheduled' : 'I will set'}</div>
      <div className="grid grid-cols-2 gap-1.5 text-[12px] md:grid-cols-4">{plan.map((p) => <div key={p.at} data-reminder={p.at} className="rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200"><b>{p.at} days</b> · {fmtD(p.on)}<div className="text-slate-500">{p.ch}{p.done ? ' · due now' : ''}</div></div>)}</div></div>}
    <div className="mt-3 flex flex-wrap gap-2">{c.status === 'pending' ? <><Button size="sm" variant="primary" data-fx-act="confirm-licence" onClick={confirm}>Confirm & add to register</Button><Button size="sm" variant="ghost" onClick={() => onChange({ ...c, status: 'cancelled' })}>Cancel</Button></>
      : c.status === 'added' ? <><Badge tone="green" dot>Added to the licence register</Badge><a href="#/renewals" className="text-[13px] font-medium text-brand-700 underline">Open register</a></> : <Badge tone="gray">Cancelled – nothing saved</Badge>}</div>
  </div>;
}

function Sourcing({ c, onChange }: { c: Extract<FxC, { k: 'sourcing' }>; onChange: (c: FxC) => void }) {
  const ctx = useStore(); const p = c.rows[c.pick]; const total = p.price * c.qty;
  const rfq = () => { const top = c.rows.filter((r) => r.ok).slice(0, 3); ctx.openDraft({ title: `RFQ – ${c.qty.toLocaleString('en-IN')} ${c.unit} ${c.item}`, channel: 'Email', to: top.map((r) => r.name).join(', '), toDetail: 'Simulated – no email leaves this demo', approveLabel: 'Approve & send RFQ',
    body: `Dear team,\n\nPlease quote for:\n${c.item} – ${c.spec}\nQuantity: ${c.qty.toLocaleString('en-IN')} ${c.unit}\nDelivery: Site 3 Medak, within 10 days of PO\nPayment: 45 days\n\nPlease send price per ${c.unit.replace(/s$/, '')}, freight, GST and lead time by tomorrow 5 pm.\n\nRegards,\nPurchase, Shakti Electro-Pack`,
    onApprove: () => { onChange({ ...c, status: 'rfq', ref: `RFQ-${2200 + (++seq)}` }); ctx.update(() => {}, `RFQ for ${c.item} sent to ${top.length} suppliers (simulated)`, { module: 'purchasing', agent: true }); ctx.toast(`RFQ sent to ${top.length} suppliers (simulated)`, 'green'); } }); };
  const po = () => { const ref = `PO-${1300 + (++seq)}`; ctx.openDraft({ title: `${ref} to ${p.name}`, channel: 'Email', to: p.name, toDetail: 'Simulated – no email leaves this demo', approveLabel: 'Approve & send PO',
    body: `Dear team,\n\nPurchase order ${ref}\n${c.item} – ${c.spec}\nQuantity: ${c.qty.toLocaleString('en-IN')} ${c.unit} @ ${inr(p.price)} = ${inr(total)} + GST\nDelivery: within ${p.lead} days to Site 3 Medak\nPayment: 45 days from delivery\n\nPlease confirm by reply.\n\nRegards,\nRanjith, Shakti Electro-Pack`,
    onApprove: () => { onChange({ ...c, status: 'po', ref }); ctx.update(() => {}, `${ref} sent to ${p.name} for ${c.item} (${inr(total)}) (simulated)`, { module: 'purchasing', record: ref, agent: true }); ctx.toast(`${ref} sent to ${p.name} (simulated)`, 'green'); } }); };
  return <div className={box} data-fx="sourcing" data-status={c.status}>
    <div className="text-[12.5px] text-slate-500">{c.item} · {c.spec} · {c.qty.toLocaleString('en-IN')} {c.unit}</div>
    <div className="mt-2 overflow-x-auto"><table className="w-full text-[12.5px]"><thead><tr className="text-left text-slate-500">{['', 'Supplier', 'Price', 'MOQ', 'Lead time', 'Rating', 'Location'].map((h) => <th key={h} className="px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
      <tbody>{c.rows.map((r, i) => <tr key={r.name} data-supplier={i} onClick={() => c.status === 'pending' && onChange({ ...c, pick: i })} className={cx('cursor-pointer border-t border-slate-100', i === c.pick && 'bg-brand-50/70', !r.ok && 'text-slate-400')}>
        <td className="px-2 py-1.5"><input type="radio" readOnly checked={i === c.pick} /></td><td className="px-2 py-1.5 font-medium">{r.name.replace(' (demo)', '')}{i === c.pick && <span className="ml-1.5"><Badge tone="green">Recommended</Badge></span>}<div className="text-[11.5px] font-normal text-slate-500">{r.note}</div></td>
        <td className="px-2 py-1.5 tabular-nums">{inr(r.price)}</td><td className="px-2 py-1.5 tabular-nums">{r.moq.toLocaleString('en-IN')}{!r.ok && <div className="text-[11px] text-amber-600">above your qty</div>}</td><td className="px-2 py-1.5">{r.lead} days</td>
        <td className="px-2 py-1.5"><Star size={11} className="mr-0.5 inline fill-amber-400 text-amber-400" />{r.rating}</td><td className="px-2 py-1.5">{r.city}</td></tr>)}</tbody></table></div>
    <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900"><b>My pick: {p.name.replace(' (demo)', '')}</b> – {inr(p.price)} × {c.qty.toLocaleString('en-IN')} = <b>{inr(total)}</b> + GST, in {p.lead} days. {p.note}.</div>
    <div className="mt-3 flex flex-wrap gap-2">{c.status === 'pending' ? <><Button size="sm" variant="primary" data-fx-act="po" onClick={po}>Raise PO to {p.name.replace(' (demo)', '').split(' ').slice(0, 2).join(' ')} ({lakh(total)})</Button><Button size="sm" data-fx-act="rfq" onClick={rfq}>Send RFQ to top 3 first</Button></>
      : <Badge tone="green" dot>{c.status === 'po' ? `${c.ref} sent to ${p.name.replace(' (demo)', '')} (simulated)` : `${c.ref} sent to 3 suppliers (simulated) – quotes due tomorrow 5 pm`}</Badge>}</div>
  </div>;
}

function TenderCard({ c, onChange }: { c: Extract<FxC, { k: 'tender' }>; onChange: (c: FxC) => void }) {
  const ctx = useStore(); const [busy, setBusy] = useState(false); const t = c.t; const k = c.cost;
  const total = Math.round(c.price * (t.qty || 1));
  const make = async (approve: boolean) => {
    setBusy(true);
    try {
      const z = await buildBidZip({ t, price: total, perUnit: c.price, checks: c.checks }); download(z.blob, z.name);
      if (approve) { onChange({ ...c, status: 'approved', files: z.files }); ctx.update(() => {}, `Approved bid price ${inr(c.price)}/unit (${inr(total)}) for tender ${t.number}; bid pack ZIP generated`, { module: 'tenders', record: t.number, agent: true }); ctx.toast(`Bid pack ready – ${z.files.length} PDFs in ${z.name}`, 'green'); }
    } catch (e) { ctx.toast('Could not build the ZIP: ' + String((e as Error).message || e).slice(0, 80), 'amber'); } finally { setBusy(false); }
  };
  const Icon = ({ ok }: { ok: boolean | null }) => ok === true ? <Check size={15} className="text-emerald-600" /> : ok === false ? <X size={15} className="text-rose-600" /> : <AlertTriangle size={14} className="text-amber-500" />;
  const gaps = c.checks.filter((x) => x.ok !== true);
  return <div className={box} data-fx="tender" data-verdict={c.verdict} data-status={c.status}>
    <div className="text-[12.5px] text-slate-500">{t.buyer || 'Tender'} · {t.number || '—'} · {t.item}{t.qty ? ` · ${t.qty.toLocaleString('en-IN')} ${t.unit}` : ''}{t.due ? ` · due ${fmtD(t.due)}` : ''}</div>
    <div className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Can you apply?</div>
    <table className="mt-1 w-full text-[12.5px]"><tbody>{c.checks.map((x) => <tr key={x.label} data-check={x.ok === true ? 'ok' : x.ok === false ? 'fail' : 'warn'} className="border-t border-slate-100"><td className="w-6 py-1.5"><Icon ok={x.ok} /></td><td className="py-1.5 pr-2 font-medium">{x.label}</td><td className="py-1.5 pr-2 text-slate-500">needs {x.need}</td><td className="py-1.5 text-slate-700">{x.have}</td></tr>)}</tbody></table>
    {gaps.length > 0 && <div className={cx('mt-2 rounded-lg px-3 py-2 text-[12.5px]', c.verdict === 'no' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800')}><b>Gaps:</b> {gaps.map((g) => `${g.label} (${g.have})`).join('; ')}.{c.verdict === 'no' ? ' You could still bid with a partner (consortium) if the tender allows it.' : ''}</div>}
    {k && c.verdict !== 'no' && <>
      <div className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-slate-500">What to quote</div>
      <div className="mt-1 grid grid-cols-2 gap-2 md:grid-cols-4">{[['Material', k.material], ['Labour', k.labour], ['Overhead', k.overhead], ['Your cost', k.unitCost]].map(([l, v]) => <div key={l as string} className="rounded-lg bg-slate-50 px-2.5 py-2"><div className="text-[11px] text-slate-500">{l} / unit</div><div className="text-[14px] font-semibold tabular-nums">{inr(v as number)}</div></div>)}</div>
      <div className="mt-2 text-[13px] text-slate-700">Quote range <b>{inr(k.lo)} – {inr(k.hi)}</b> per unit. Suggested <b>{inr(k.rec)}</b> ({k.marginRec}% margin).</div>
      <ul className="mt-1 list-disc pl-5 text-[12px] text-slate-500">{k.why.filter(Boolean).map((w) => <li key={w}>{w}</li>)}</ul>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-[11.5px] text-slate-500">Your price per unit (₹)<input data-field="price" type="number" value={c.price} disabled={c.status === 'approved'} onChange={(e) => onChange({ ...c, price: +e.target.value })} className="mt-0.5 block w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-[14px] font-semibold" /></label>
        <div className="pb-1.5 text-[13px]">Total <b className="tabular-nums">{inr(total)}</b> + GST · margin {(((c.price - k.unitCost) / c.price) * 100).toFixed(1)}%</div>
      </div></>}
    <div className="mt-3 flex flex-wrap gap-2">{c.verdict === 'no' ? <Badge tone="red" dot>Not eligible – no bid pack made</Badge> : c.status === 'pending'
      ? <Button size="sm" variant="primary" data-fx-act="approve-bid" disabled={busy || !c.price} icon={<Download size={13} />} onClick={() => make(true)}>{busy ? 'Making the bid pack…' : `Approve ${inr(c.price)}/unit & download bid pack`}</Button>
      : <><Badge tone="green" dot>Price approved – {c.files?.length || 6} PDFs in the ZIP</Badge><Button size="sm" data-fx-act="download-bid" icon={<Download size={13} />} disabled={busy} onClick={() => make(false)}>Download again</Button></>}</div>
    {c.status === 'approved' && <div className="mt-2 text-[12px] text-slate-500">{(c.files || []).join(' · ')}</div>}
    <div className="sr-only">{tenderTitle(c)}</div>
  </div>;
}
