import React, { useState } from 'react';
import { CreditCard, FileText, Upload, ShieldCheck, AlertTriangle, Receipt, Settings2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { PageHeader, Card, Button, Badge, Kpi, DataTable, Tabs, Modal, Status, Callout, Segmented, cx } from '../components/ui';
import { inr } from '../lib/format';
import { PLANS } from '../platform/data';
import { InvoiceModal } from './Invoice';
import { TIERS, ADDONS, tierRank, prorate, type Tier } from './catalog';
import { useBilling, updateBilling, computeTds, certFor, certUtilised, certRemaining, tenantsAll, quarterOf, nowStamp, SECTION_LABEL, PROVIDER, type BInvoice, type BPayment, type Section } from './data';

const YM: Record<string, string> = { Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11' };

export default function BillingPage() {
  const { s, toast } = useStore(); const st = useBilling(); const tid = s.tenant || 't-aarohan';
  const t = tenantsAll().find((x) => x.id === tid)!; const plan = PLANS.find((p) => p.name === t.plan)!;
  const [tab, setTab] = useState('Overview'); const [view, setView] = useState<BInvoice | null>(null); const [rcpt, setRcpt] = useState<BPayment | undefined>(); const [pay, setPay] = useState<BInvoice | null>(null);
  const inv = st.invoices.filter((i) => i.tenant === tid).slice().reverse(); const pays = st.payments.filter((p) => p.tenant === tid).slice().reverse();
  const dues = inv.filter((i) => i.status !== 'Paid'); const dueAmt = dues.reduce((a, i) => a + i.total - i.paid, 0);
  const cert = certFor(st, tid); const f16 = st.f16a.filter((f) => f.tenant === tid);
  const tdsFy = pays.reduce((a, p) => a + p.tds, 0);
  const usage = [['Users', t.users, plan.name === 'Starter' ? 5 : plan.name === 'Growth' ? 25 : 200], ['AI agent runs (Oct)', Math.round(t.health * 21), plan.name === 'Starter' ? 500 : plan.name === 'Growth' ? 2500 : 10000], ['WhatsApp messages (Oct)', t.users * 61, plan.name === 'Pro' ? 10000 : 3000], ['Storage (GB)', Math.round(t.users * 1.7), plan.name === 'Starter' ? 10 : plan.name === 'Growth' ? 100 : 1000]] as [string, number, number][];
  if (t.region === 'ME' || t.status === 'Trial') return <div data-testid="billing-page"><PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Billing & subscription' }]} title="Billing & subscription" subtitle={t.status === 'Trial' ? 'You are on a free trial – no invoices yet. Trial ends 12 Nov.' : 'Billed in AED by our UAE entity – Indian TDS does not apply.'} /><Callout tone="blue" title="Nothing due">Choose a plan before the trial ends to keep your data.</Callout></div>;
  return (<div data-testid="billing-page">
    <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Admin' }, { label: 'Billing & subscription' }]} title="Billing & subscription" subtitle={`Your Business OS plan, GST invoices, payments and TDS – visible only to company admins and the Billing role.`}
      badge={<Badge tone="violet">Payments simulated</Badge>} actions={dues.length ? <Button variant="primary" icon={<CreditCard size={15} />} data-testid="pay-now-top" onClick={() => setPay(dues[dues.length - 1])}>Pay {inr(dueAmt)} now</Button> : <Badge tone="green">All paid</Badge>} />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Current plan" value={t.plan} sub={`${inr(plan.price)}/month + GST · renews 01 Nov`} />
      <Kpi label="Outstanding" value={inr(dueAmt)} tone={dueAmt ? 'red' : 'green'} sub={dues.length ? `${dues.length} invoice${dues.length > 1 ? 's' : ''} · ${dues.map((d) => d.status).join(', ')}` : 'Nothing due'} onClick={() => setTab('Invoices')} />
      <Kpi label="TDS deducted FY26-27" value={inr(tdsFy)} sub={`${f16.filter((f) => f.status === 'Pending').length} Form 16A pending`} tone={f16.some((f) => f.status === 'Pending') ? 'amber' : 'green'} onClick={() => setTab('TDS & Form 16A')} />
      <Kpi label="Sec 197 rate" value={cert ? `${cert.rate}%` : '—'} sub={cert ? `${inr(certRemaining(st, cert))} of ${inr(cert.threshold)} left` : 'Not applicable to you'} tone={cert && certRemaining(st, cert) < cert.threshold * 0.1 ? 'amber' : undefined} onClick={() => setTab('TDS & Form 16A')} />
    </div>
    <Tabs tabs={['Overview', 'Plan & add-ons', 'Invoices', 'Payments', 'TDS & Form 16A']} value={tab} onChange={setTab} counts={{ Invoices: inv.length, Payments: pays.length }} />
    {tab === 'Overview' && <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Plan & usage" subtitle={plan.blurb}><div className="space-y-3" data-testid="usage">{usage.map(([k, v, max]) => { const pct = Math.min(100, Math.round((v / max) * 100)); return <div key={k}><div className="flex justify-between text-[13px]"><span>{k}</span><span className="tabular text-slate-500">{v.toLocaleString('en-IN')} / {max.toLocaleString('en-IN')}</span></div><div className="mt-1 h-2 rounded bg-slate-100"><div className={cx('h-2 rounded', pct > 85 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-sky-400')} style={{ width: pct + '%' }} /></div></div>; })}</div>
        <div className="mt-3 text-2xs text-slate-500">Extra users ₹499/user/month. Upgrade or downgrade from the Platform team – changes pro-rate on the next invoice.</div></Card>
      <Card title="Dues" subtitle="Pay with UPI, card or netbanking – deduct TDS at payment if you are liable">{dues.length ? dues.map((d) => <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-[13px]"><div><div className="font-medium">{d.id} · {d.month}</div><div className="text-2xs text-slate-500">Due {d.due}</div></div><div className="flex items-center gap-2"><Status>{d.status}</Status><span className="font-semibold tabular">{inr(d.total)}</span><Button size="sm" variant="primary" data-testid={`pay-${d.id}`} onClick={() => setPay(d)}>Pay now</Button></div></div>) : <div className="text-[13px] text-emerald-700">✓ No dues</div>}
        <div className="mt-3 grid grid-cols-2 gap-2 text-2xs text-slate-500"><div>Billed by <b className="text-slate-700">{PROVIDER.name}</b></div><div>GSTIN {PROVIDER.gstin} · SAC {PROVIDER.sac}</div></div></Card>
    </div>}
    {tab === 'Plan & add-ons' && <PlanTab cur={t.plan as Tier} />}
    {tab === 'Invoices' && <Card pad={false}><DataTable<BInvoice> rows={inv} rowKey={(i) => i.id} onRowClick={setView} columns={[{ key: 'i', header: 'Invoice no.', render: (i) => <span className="font-medium text-brand-700">{i.id}</span> }, { key: 'm', header: 'Period', render: (i) => i.month }, { key: 'x', header: 'Taxable', align: 'right', render: (i) => inr(i.taxable) }, { key: 'g', header: 'GST 18%', align: 'right', render: (i) => inr(i.cgst + i.sgst + i.igst) }, { key: 't', header: 'Total', align: 'right', render: (i) => <b>{inr(i.total)}</b> }, { key: 's', header: 'Status', render: (i) => <Status>{i.status}</Status> }, { key: 'a', header: '', render: (i) => <div className="flex gap-1"><Button size="sm" icon={<FileText size={13} />} onClick={(e) => { e.stopPropagation(); setView(i); }}>View</Button>{i.status !== 'Paid' && <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); setPay(i); }}>Pay</Button>}</div> }]} /></Card>}
    {tab === 'Payments' && <Card pad={false}><DataTable<BPayment> rows={pays} rowKey={(p) => p.id} columns={[{ key: 'r', header: 'Receipt', render: (p) => <span className="font-medium">{p.id}</span> }, { key: 'd', header: 'Date', render: (p) => p.date }, { key: 'i', header: 'Invoice', render: (p) => p.invoice }, { key: 'm', header: 'Method', render: (p) => p.method }, { key: 'g', header: 'Invoice amt', align: 'right', render: (p) => inr(p.gross) }, { key: 't', header: 'TDS', align: 'right', render: (p) => p.tds ? <span title={p.tdsLines.map((l) => `${l.section} ${l.rate}%`).join(' + ')}>{inr(p.tds)} <span className="text-2xs text-slate-400">{p.tdsLines.map((l) => l.section === '197' ? `197@${l.rate}%` : `194J@${l.rate}%`).join('+')}</span></span> : '—' }, { key: 'n', header: 'Paid', align: 'right', render: (p) => <b>{inr(p.net)}</b> }, { key: 'x', header: '', render: (p) => <Button size="sm" icon={<Receipt size={13} />} onClick={() => { setRcpt(p); setView(st.invoices.find((i) => i.id === p.invoice)!); }}>Receipt</Button> }]} /></Card>}
    {tab === 'TDS & Form 16A' && <TdsTab tid={tid} />}
    <InvoiceModal inv={view} receipt={rcpt} onClose={() => { setView(null); setRcpt(undefined); }} />
    {pay && <PayModal inv={pay} onClose={() => setPay(null)} onDone={(p) => { setPay(null); toast(`Payment ${p.id} recorded – ${inr(p.net)} paid${p.tds ? `, TDS ${inr(p.tds)} recorded` : ''} (simulated)`); setTab('Payments'); }} />}
  </div>);
}

function TdsTab({ tid }: { tid: string }) {
  const st = useBilling(); const { toast } = useStore(); const cert = certFor(st, tid); const f16 = st.f16a.filter((f) => f.tenant === tid);
  const [cfg, setCfg] = useState(false);
  const upload = (id: string, file: string) => { updateBilling((d) => { const f = d.f16a.find((x) => x.id === id)!; f.status = 'Received'; f.file = file; f.note = 'Awaiting 26AS match by Business OS'; d.log.unshift({ at: nowStamp(), tenant: tid, text: `Form 16A ${f.quarter} uploaded (${file})` }); }); toast(`Form 16A uploaded – we'll match it with our 26AS`); };
  return (<div className="grid gap-4 lg:grid-cols-[1fr_380px]">
    <Card title="Form 16A by quarter" subtitle="Upload the TDS certificate from TRACES after you file 26Q. We match it against our Form 26AS." pad={false} actions={<Button size="sm" icon={<Settings2 size={13} />} data-testid="tds-config" onClick={() => setCfg(true)}>TDS rates</Button>}>
      <DataTable rows={f16.length ? f16 : []} empty="No TDS deducted yet" rowKey={(f) => f.id} columns={[{ key: 'q', header: 'Quarter', render: (f) => <b>{f.quarter}</b> }, { key: 't', header: 'TDS deducted', align: 'right', render: (f) => inr(f.tds) }, { key: 'd', header: '16A due', render: (f) => f.dueBy }, { key: 's', header: 'Status', render: (f) => <span data-f16={f.status}><Status>{f.status === 'Matched' ? 'Matched with 26AS' : f.status}</Status></span> }, { key: 'n', header: 'Note', render: (f) => <span className="text-2xs text-slate-500">{f.note || f.file || ''}</span> },
        { key: 'u', header: '', render: (f) => f.status === 'Pending' || f.status === 'Mismatch' ? <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] font-medium hover:bg-slate-50"><Upload size={13} />Upload 16A<input data-upload={f.id} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && upload(f.id, e.target.files[0].name)} /></label> : null }]} />
      <div className="p-3 text-2xs text-slate-500">Mismatch means the TDS in your 26Q filing differs from your deduction – file a correction so we get the credit.</div>
    </Card>
    <Card title={<span className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" />Our Section 197 certificate</span>} subtitle="Lower TDS deduction certificate issued to Business OS by the Income Tax Department">
      {cert ? (() => { const used = certUtilised(st, cert); const rem = certRemaining(st, cert); const pct = Math.min(100, Math.round(used / cert.threshold * 100)); return <div data-testid="cert-197" className="space-y-2 text-[13px]">
        <div className="grid grid-cols-2 gap-2"><div><div className="text-2xs text-slate-400">Certificate no.</div><b>{cert.certNo}</b></div><div><div className="text-2xs text-slate-400">Rate</div><b className="text-emerald-700">{cert.rate}%</b> <span className="text-2xs">(vs {st.rates['194J-2']}% normal)</span></div><div><div className="text-2xs text-slate-400">Valid</div>{cert.fy} · {cert.validFrom} – {cert.validTo}</div><div><div className="text-2xs text-slate-400">Issued by</div><span className="text-2xs">{cert.issuedBy}</span></div></div>
        <div><div className="flex justify-between text-2xs text-slate-500"><span>Utilised {inr(used)}</span><span>Limit {inr(cert.threshold)}</span></div><div className="mt-1 h-2.5 rounded bg-slate-100"><div className={cx('h-2.5 rounded', pct >= 90 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: pct + '%' }} /></div><div className="mt-1 font-medium">Remaining {inr(rem)}</div></div>
        {rem < cert.threshold * 0.1 && <div data-testid="cert-warning" className="flex gap-2 rounded-lg bg-amber-50 p-2 text-2xs text-amber-800"><AlertTriangle size={14} className="shrink-0" />{rem ? `Nearly used up. Payments beyond ${inr(rem)} switch automatically to the normal 194J rate.` : 'Limit used up – the normal 194J rate now applies.'}</div>}
        <div className="text-2xs text-slate-400">The limit is on payments (taxable value) across all companies named in the certificate. We switch the rate automatically – no action needed.</div></div>; })() : <div className="text-[13px] text-slate-500">Our certificate doesn't cover your company – deduct at the normal 194J rate.</div>}
    </Card>
    {cfg && <RatesModal onClose={() => setCfg(false)} tid={tid} />}
  </div>);
}

function RatesModal({ onClose, tid }: { onClose: () => void; tid: string }) {
  const st = useBilling(); const [a, setA] = useState(String(st.rates['194J-2'])); const [b, setB] = useState(String(st.rates['194J-10'])); const [def, setDef] = useState<Section | 'none'>(st.defaultSection[tid] || 'none');
  return <Modal open onClose={onClose} title="TDS settings" subtitle="Rates are configurable in case the law or your classification changes. Confirm with your CA." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" data-testid="rates-save" onClick={() => { updateBilling((d) => { d.rates['194J-2'] = +a || 0; d.rates['194J-10'] = +b || 0; d.defaultSection[tid] = def; }); onClose(); }}>Save</Button></>}>
    <div className="grid gap-3 text-[13px]"><label>194J – technical services / software (%)<input value={a} onChange={(e) => setA(e.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3" /></label><label>194J – professional services (%)<input value={b} onChange={(e) => setB(e.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3" /></label>
      <label>Default at payment<select value={def} onChange={(e) => setDef(e.target.value as Section)} className="mt-1 h-10 w-full rounded-lg border px-2">{(['none', '194J-2', '194J-10', '197'] as const).map((x) => <option key={x} value={x}>{SECTION_LABEL(st, x)}</option>)}</select></label></div></Modal>;
}

function PayModal({ inv, onClose, onDone }: { inv: BInvoice; onClose: () => void; onDone: (p: BPayment) => void }) {
  const st = useBilling(); const [method, setMethod] = useState<'UPI' | 'Card' | 'Netbanking'>('UPI');
  const def = st.defaultSection[inv.tenant] || 'none'; const [ded, setDed] = useState(def !== 'none'); const [sec, setSec] = useState<Section>(def === 'none' ? '194J-2' : def);
  const c = computeTds(st, inv.tenant, inv.taxable, ded ? sec : 'none'); const net = inv.total - c.tds; const cert = certFor(st, inv.tenant);
  const go = () => { const ym = YM[inv.month.slice(0, 3)] || '10'; const p: BPayment = { id: `RCPT-2026${ym}-${inv.tenant.slice(2, 5).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`, tenant: inv.tenant, invoice: inv.id, date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), method, gross: inv.total, tds: c.tds, net, tdsLines: c.lines, ref: `pay_sim_${Date.now().toString(36)}` };
    updateBilling((d) => { d.payments.push(p); const i = d.invoices.find((x) => x.id === inv.id)!; i.status = 'Paid'; i.paid = inv.total; if (c.tds) { const q = quarterOf(`2026-${ym}`); let f = d.f16a.find((x) => x.tenant === inv.tenant && x.quarter === q); if (!f) { f = { id: `16A-${inv.tenant}-${q.slice(0, 2)}`, tenant: inv.tenant, quarter: q, tds: 0, status: 'Pending', dueBy: q.startsWith('Q3') ? '15 Feb 2027' : '15 Nov 2026' }; d.f16a.push(f); } f.tds += c.tds; if (f.status !== 'Pending') { f.status = 'Pending'; f.note = 'New TDS added – upload revised 16A'; } } d.log.unshift({ at: nowStamp(), tenant: inv.tenant, text: `Paid ${inv.id}: ${inr(net)} via ${method}${c.tds ? `, TDS ${inr(c.tds)}` : ''}` }); });
    onDone(p); };
  return <Modal open onClose={onClose} width="max-w-xl" title={`Pay ${inv.id}`} subtitle={`${inv.month} · ${inv.plan} plan · simulated – no money moves`}
    footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" data-testid="pay-confirm" onClick={go}>Pay {inr(net)}</Button></>}>
    <div className="space-y-4 text-[13px]" data-testid="pay-modal">
      <div><div className="mb-1 text-2xs font-semibold uppercase text-slate-500">Method</div><Segmented value={method} onChange={(v) => setMethod(v as typeof method)} options={[{ value: 'UPI', label: 'UPI' }, { value: 'Card', label: 'Card' }, { value: 'Netbanking', label: 'Netbanking' }]} />
        <div className="mt-2 text-2xs text-slate-500">{method === 'UPI' ? 'Pay to businessos@hdfcbank – or scan the QR in your UPI app.' : method === 'Card' ? 'Visa / Mastercard / RuPay – 3-D Secure.' : 'All major banks via the payment gateway.'}</div></div>
      <label className="flex items-center gap-2 font-medium"><input data-testid="tds-toggle" type="checkbox" checked={ded} onChange={(e) => setDed(e.target.checked)} className="h-4 w-4 accent-indigo-600" />I am deducting TDS on this payment</label>
      {ded && <div className="grid gap-2 sm:grid-cols-3">{(['194J-2', '194J-10', '197'] as Section[]).map((x) => <button key={x} data-sec={x} disabled={x === '197' && !cert} onClick={() => setSec(x)} className={cx('rounded-xl border p-2 text-left', sec === x ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 bg-white', x === '197' && !cert && 'opacity-40')}><div className="font-semibold">{x === '197' ? `Sec 197 · ${cert?.rate ?? '–'}%` : `194J · ${st.rates[x as '194J-2']}%`}</div><div className="text-2xs text-slate-500">{x === '194J-2' ? 'Technical / software' : x === '194J-10' ? 'Professional' : cert ? `Cert ${cert.certNo.slice(-7)}` : 'Not covered'}</div></button>)}</div>}
      {c.warn && <div data-testid="tds-warning" className="flex gap-2 rounded-lg bg-amber-50 p-2 text-[12px] text-amber-800"><AlertTriangle size={15} className="shrink-0" />{c.warn}</div>}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 tabular" data-testid="net-calc">
        <div className="flex justify-between"><span>Invoice total (taxable {inr(inv.taxable)} + GST)</span><span>{inr(inv.total)}</span></div>
        {c.lines.map((l, i) => <div key={i} className="flex justify-between text-rose-700"><span>Less TDS {l.section === '197' ? `Sec 197 @ ${l.rate}%` : `194J @ ${l.rate}%`} on {inr(l.base)}</span><span>– {inr(l.amt)}</span></div>)}
        <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-[15px] font-semibold"><span>Net payable</span><span data-testid="net-payable">{inr(net)}</span></div>
      </div>
      {ded && <div className="text-2xs text-slate-500">TDS is on the taxable value, not GST. Deposit it by the 7th of next month, file 26Q and upload Form 16A here each quarter.</div>}
    </div></Modal>;
}

function PlanTab({ cur }: { cur: Tier }) {
  const { toast } = useStore(); const [req, setReq] = useState<string[]>([]); const [qty, setQty] = useState<Record<string, number>>({});
  return (<div className="space-y-4" data-testid="plan-tab">
    <Card title="Your plan" subtitle="Renews 01 Nov 2026 · Monthly · auto-renew on (UPI autopay) · cancel anytime from here with 30 days' data export">
      <div className="grid gap-3 md:grid-cols-5">{TIERS.map((t) => { const isCur = t.name === cur; const up = tierRank(t.name) > tierRank(cur); return <div key={t.name} className={cx('rounded-xl border p-3 text-[12px]', isCur ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-100' : 'border-slate-200 bg-white')}>
        <div className="flex items-center justify-between"><b className="text-[13px]">{t.name}</b>{isCur && <Badge tone="blue">Current</Badge>}</div><div className="mt-1 text-lg font-bold">{t.price ? inr(t.price) : 'Custom'}</div><div className="text-slate-500">{t.users} users · {t.aiCredits} AI credits</div>
        {!isCur && <Button size="sm" className="mt-2 w-full" data-req-plan={t.name} variant={up ? 'primary' : 'secondary'} disabled={req.includes(t.name)} onClick={() => { setReq([...req, t.name]); toast(`${up ? 'Upgrade' : 'Change'} to ${t.name} requested${t.price && up ? ` – about ${inr(prorate(TIERS.find((x) => x.name === cur)!.price || 0, t.price, 2))} prorated for the rest of this cycle` : ''}. Our team confirms within 1 business day.`); }}>{req.includes(t.name) ? 'Requested' : t.name === 'Enterprise' ? 'Talk to sales' : up ? 'Request upgrade' : 'Request downgrade'}</Button>}</div>; })}</div></Card>
    <Card title="Add-on marketplace" subtitle="Billed pro-rata on your next invoice">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ADDONS.map((a) => <div key={a.id} data-addon={a.id} className="tile-gloss flex flex-col rounded-xl border border-slate-200 bg-white/90 p-3"><div className="font-medium">{a.name}</div><div className="text-2xs text-slate-500">{a.desc}</div><div className="mt-2 text-[13px]"><b>{inr(a.price)}</b> <span className="text-2xs text-slate-500">{a.unit}</span></div>
        <div className="mt-2 flex items-center gap-2"><input type="number" min={1} value={qty[a.id] || 1} onChange={(e) => setQty({ ...qty, [a.id]: +e.target.value })} className="h-9 w-16 rounded-lg border px-2 text-[13px]" /><Button size="sm" variant="primary" onClick={() => toast(`${a.name} ×${qty[a.id] || 1} added – ${inr(a.price * (qty[a.id] || 1))} on next invoice (simulated)`)}>Add</Button></div></div>)}</div></Card>
  </div>);
}
