import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FileDown, IndianRupee, MessageCircle, Landmark, ShieldCheck, Wallet } from 'lucide-react';
import { useStore } from '../lib/store';
import { Invoice, compliance, bank } from '../lib/data';
import { inr, lakh, fmtDate, fmtShort, gstSplit, todayISO } from '../lib/format';
import { outstanding, overdueDays, so1051Economics, cash, supplierById, customerById } from '../lib/domain';
import { reminder1048, payBill551 } from '../lib/actions';
import { sprintTotals, promiseFor } from '../lib/sprint';
import { Zap } from 'lucide-react';
import { PageHeader, Card, Button, DataTable, SearchBox, Select, Toolbar, Modal, Field, Fields, Status, Tabs, useTab, Callout, Badge, Kpi, Segmented, Timeline, cx } from '../components/ui';

const taxable = (i: Invoice) => Math.round(i.total / 1.18);
const tallyExport = (s: ReturnType<typeof useStore>['s'], toast: (t: string) => void) => {
  const v = s.invoices.map((i) => { const c = customerById(s, i.customerId); const g = gstSplit(taxable(i), !!i.interstate); return `  <VOUCHER VCHTYPE="Sales"><DATE>${i.issue.replace(/-/g, '')}</DATE><VOUCHERNUMBER>${i.id}</VOUCHERNUMBER><PARTYLEDGERNAME>${c.name}</PARTYLEDGERNAME><GSTIN>${c.gstin}</GSTIN><TAXABLE>${taxable(i)}</TAXABLE><CGST>${g.cgst}</CGST><SGST>${g.sgst}</SGST><IGST>${g.igst}</IGST><AMOUNT>${i.total}</AMOUNT></VOUCHER>`; });
  const xml = `<?xml version="1.0"?>\n<!-- Demo export · Aarohan Industries · not a live Tally connection -->\n<ENVELOPE><BODY><DATA>\n${v.join('\n')}\n</DATA></BODY></ENVELOPE>`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([xml], { type: 'application/xml' })); a.download = 'aarohan-sales-vouchers-oct-2026.xml'; a.click();
  toast(`Exported ${s.invoices.length} sales vouchers in Tally XML format (demo file)`);
};

export function FinanceHome() {
  const ctx = useStore();
  const { s, toast } = ctx;
  const nav = useNavigate();
  const [tab, setTab] = useTab('Overview');
  const [q, setQ] = useState('');
  const [view, setView] = useState('Outstanding');
  const e = so1051Economics(s);
  const c = cash(s);
  const recv = s.invoices.filter((i) => (view === 'All' || (view === 'Outstanding' && outstanding(i) > 0) || (view === 'Overdue' && overdueDays(i) > 0 && outstanding(i) > 0) || (view === 'Paid' && outstanding(i) === 0)) && (i.id + customerById(s, i.customerId).name).toLowerCase().includes(q.toLowerCase()));
  const totalRecv = s.invoices.reduce((a, i) => a + outstanding(i), 0);
  const buckets = [['Not yet due', (d: number) => d === 0], ['1–15 days', (d: number) => d > 0 && d <= 15], ['16–30 days', (d: number) => d > 15 && d <= 30], ['30+ days', (d: number) => d > 30]] as const;
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Finance' }]} title="Finance" subtitle="Cash, who owes you, what you owe, and GST – in plain numbers"
        actions={<><Button icon={<Zap size={14} />} data-testid="open-sprint-finance" onClick={() => nav('/collections')}>Collections sprint</Button><Button icon={<FileDown size={14} />} data-testid="tally-export" onClick={() => tallyExport(s, toast)}>Export to Tally</Button></>} />
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Cash in bank" value={lakh(c.bank)} sub={`HDFC ••4821 · runway ${c.runwayCash} days`} onClick={() => setTab('Cash')} />
        <Kpi label="Receivables" value={lakh(totalRecv)} sub={s.sprint.status === 'done' ? `${lakh(sprintTotals(s).promised)} promised by Fri · ${lakh(c.overdue)} overdue` : `${lakh(c.overdue)} overdue`} tone="amber" onClick={() => setTab('Receivables')} />
        <Kpi label="Payables this week" value={lakh(c.payablesWeek)} sub="1 MSME 45-day deadline" tone="red" onClick={() => setTab('Payables')} />
        <Kpi label="Money stuck" value={lakh(c.stuck)} sub="overdue + slow stock + job workers" tone="amber" onClick={() => setTab('Cash')} />
      </div>
      <Tabs tabs={['Overview', 'Receivables', 'Payables', 'Cash', 'GST & compliance']} value={tab} onChange={setTab} />
      {tab === 'Overview' && s.sprint.status === 'done' && (() => { const t = sprintTotals(s); return (
        <Callout tone="green" icon={<Zap size={16} />} title={`Collections sprint: ${lakh(t.total)} lined up for Fri 30 Oct (${t.pct}% of ${lakh(t.target)})`} action={<Button size="sm" onClick={() => nav('/collections')}>Open sprint board</Button>}>
          {lakh(t.promised)} promised by Friday from 4 customers + {lakh(t.received)} received (INV-1044). {lakh(t.later)} more promised next month. 1 dispute and 1 statement request wait in Approvals. Promises are not cash until the money lands.
        </Callout>); })()}
      {tab === 'Overview' && (
        <div className="grid grid-cols-2 gap-3">
          <Card title="SO-1051 · margin check" subtitle="Sri Lakshmi Projects · 100 × PHA-17 · ₹7.8 lakh" actions={<Link to="/orders/SO-1051" className="text-xs text-brand-700 hover:underline">Open order</Link>}>
            <div data-testid="so1051-margin" className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-2xs uppercase text-slate-500">Planned margin</div><div className="text-xl font-semibold tabular">{e.plannedPct.toFixed(1)}%</div></div>
              <div className={cx('rounded-lg p-3', s.pr208Approved ? 'bg-emerald-50' : 'bg-amber-50')}><div className="text-2xs uppercase text-slate-500">{s.pr208Approved ? 'With PO-0921' : 'With recommended quote'}</div><div className="text-xl font-semibold tabular">{e.marginPct.toFixed(1)}%</div></div>
            </div>
            <div className="mt-3 text-[13px] text-slate-600">Buying 65 housings at ₹4,910 instead of the ₹4,600 stock cost lowers the margin by about {(e.plannedPct - e.marginPct).toFixed(1)} points. That keeps the order profitable and protects the ₹7.8 lakh.</div>
          </Card>
          <Card title="Customer exposure · Sri Lakshmi Projects" subtitle={`Credit limit ${lakh(e.limit)} · 30 days`}>
            <div className="flex items-end justify-between"><div className="text-2xl font-semibold tabular">{lakh(e.exposure)}</div><Badge tone={e.utilisation > 90 ? 'red' : 'amber'}>{e.utilisation.toFixed(0)}% of limit</Badge></div>
            <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.min(100, e.utilisation)}%` }} /></div>
            <div className="mt-3 text-[13px] text-slate-600">₹2.1 lakh is already overdue on INV-1048, and SO-1051 adds {lakh(Math.round(780000 * 1.18) - 150000)} after the advance. Collect INV-1048 before the second lot ships.</div>
            <div className="mt-3"><Button size="sm" icon={<MessageCircle size={13} />} disabled={!!s.approvals['apr-rem1048']} onClick={() => reminder1048(ctx)}>{s.approvals['apr-rem1048'] ? 'Reminder sent (simulated)' : 'Review reminder for INV-1048'}</Button></div>
          </Card>
          <Card title="Receivables by age" className="col-span-2">
            <div className="grid grid-cols-4 gap-3">{buckets.map(([l, f]) => { const v = s.invoices.filter((i) => outstanding(i) > 0 && f(overdueDays(i))).reduce((a, i) => a + outstanding(i), 0); return <div key={l} className="rounded-lg border border-slate-200 p-3"><div className="text-2xs uppercase text-slate-500">{l}</div><div className="mt-1 text-lg font-semibold tabular">{lakh(v)}</div></div>; })}</div>
          </Card>
        </div>
      )}
      {tab === 'Receivables' && (<>
        <Toolbar right={<Segmented value={view} onChange={setView} options={['Outstanding', 'Overdue', 'Paid', 'All'].map((v) => ({ value: v, label: v }))} />}><SearchBox value={q} onChange={setQ} placeholder="Search invoice or customer" /></Toolbar>
        <Card pad={false}><DataTable rowKey={(i: Invoice) => i.id} rows={recv} onRowClick={(i) => nav(`/finance/${i.id}`)} highlight={(i) => i.id === 'INV-1048'} columns={[
          { key: 'i', header: 'Invoice', render: (i) => <span className="font-medium text-slate-900">{i.id}</span> }, { key: 'c', header: 'Customer', render: (i) => customerById(s, i.customerId).name },
          { key: 'd', header: 'Issued', render: (i) => fmtShort(i.issue) }, { key: 'du', header: 'Due', render: (i) => fmtShort(i.due) },
          { key: 't', header: 'Amount', align: 'right', render: (i) => inr(i.total) }, { key: 'o', header: 'Outstanding', align: 'right', render: (i) => <span className="font-semibold">{inr(outstanding(i))}</span> },
          { key: 'od', header: 'Overdue', align: 'right', render: (i) => (outstanding(i) && overdueDays(i) ? <span className="text-rose-600">{overdueDays(i)} days</span> : '—') },
          { key: 's', header: 'Status', render: (i) => <span className="flex items-center gap-1"><Status>{i.status}</Status>{i.pdc && <Badge tone="blue">PDC {fmtShort(i.pdc.date)}</Badge>}</span> },
          ...(s.sprint.status === 'done' ? [{ key: 'pp', header: 'Promise to pay', render: (i: Invoice) => { const p = promiseFor(s, i.id); if (!p || outstanding(i) === 0) return '—'; return <span data-promise={i.id} className={p.outcome === 'Disputed' ? 'text-rose-600' : p.byFriday ? 'text-emerald-700' : 'text-slate-600'}>{p.outcome === 'Disputed' ? 'Disputed · ' : ''}{inr(p.promise.amount)} · {fmtShort(p.promise.date)}</span>; } }] : []),
        ]} /></Card>
      </>)}
      {tab === 'Payables' && (
        <Card pad={false} title="Bills to pay" subtitle="Payments are approved here and added to a NEFT batch. Demo only – no bank instruction is sent.">
          <DataTable rowKey={(b) => b.id} rows={s.bills} highlight={(b) => b.id === 'PB-0551'} columns={[
            { key: 'i', header: 'Bill', render: (b) => <div><div className="font-medium text-slate-900">{b.id}</div><div className="text-2xs text-slate-400">{b.ref}</div></div> },
            { key: 'sp', header: 'Supplier', render: (b) => <div><div>{supplierById(b.supplierId).name}</div><div className="text-2xs text-slate-400">{supplierById(b.supplierId).msme}</div></div> },
            { key: 'd', header: 'Due', render: (b) => fmtShort(b.due) }, { key: 'm', header: 'MSME 45-day', render: (b) => (b.msme45 === '—' ? '—' : <span className={b.msme45 <= '2026-10-30' && !b.paid ? 'font-medium text-rose-600' : ''}>{fmtShort(b.msme45)}</span>) },
            { key: 'a', header: 'Amount', align: 'right', render: (b) => inr(b.amount) }, { key: 't', header: 'TDS', render: (b) => <span className="text-2xs text-slate-500">{b.tds || '—'}</span> },
            { key: 's', header: 'Status', render: (b) => (b.scheduled ? <Badge tone="green">{b.scheduled}</Badge> : <Status>{b.status}</Status>) },
            { key: 'x', header: '', align: 'right', render: (b) => (b.id === 'PB-0551' && !b.scheduled ? <Button size="sm" variant="primary" data-testid="pay-551" onClick={() => payBill551(ctx)}>Approve payment</Button> : null) },
          ]} />
          <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">Sec 43B(h): payments to micro and small suppliers made after 45 days are not deductible this year. Notes are shown against each bill.</div>
        </Card>
      )}
      {tab === 'Cash' && (
        <div className="grid grid-cols-3 gap-3">
          <Card title="Cash runway" subtitle={`Fixed costs ${lakh(c.monthlyFixed)} / month`}>
            <div className="text-3xl font-semibold tabular">{c.runwayCash} days</div><div className="text-xs text-slate-500">from bank balance · {c.runwayTotal} days incl. unused CC limit</div>
            <div className="mt-3 space-y-1.5 text-[13px]"><div className="flex justify-between"><span className="text-slate-500">HDFC current ••4821</span><span className="tabular">{inr(bank.hdfc)}</span></div><div className="flex justify-between"><span className="text-slate-500">Cash in hand</span><span className="tabular">{inr(bank.cash)}</span></div><div className="flex justify-between"><span className="text-slate-500">CC limit unused</span><span className="tabular">{inr(c.headroom)}</span></div></div>
          </Card>
          <Card title="Money stuck" subtitle="What would free up cash" className="col-span-2">
            <div className="space-y-2">{[['Overdue from customers', c.overdue, '/finance?tab=Receivables', 'INV-1048 is ₹2.1 lakh of it'], ['Slow-moving stock (120+ days)', c.slow, '/inventory?view=Slow%20moving', 'Old enclosures, excess aluminium sheet'], ['Material with job workers', c.atJobWorkers, '/job-work?tab=Material%20out', 'DC-JW-0709 is overdue']].map(([l, v, to, n]) => (
              <Link key={l as string} to={to as string} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:border-brand-200"><div><div className="text-[13px] font-medium text-slate-800">{l}</div><div className="text-2xs text-slate-500">{n}</div></div><div className="text-lg font-semibold tabular">{lakh(v as number)}</div></Link>))}</div>
          </Card>
          <Card title="Bank feed (simulated)" subtitle="Books sync agent · read-only import" className="col-span-3" actions={<Landmark size={15} className="text-slate-400" />}>
            <DataTable rowKey={(r) => r.ref} rows={[{ date: '2026-10-27', ref: 'NEFT/HDFC/88120', text: 'Rao & Sons Engineering', amt: 64000, match: 'Unmatched – 2 invoices possible' }, { date: '2026-10-27', ref: 'UPI/4410293', text: 'Bhavya Electro Controls', amt: 12500, match: 'Unmatched – advance?' }, { date: '2026-10-26', ref: 'NEFT/SBIN/33201', text: 'TGSPDCL', amt: -58200, match: 'Matched – Sep power bill' }]} columns={[{ key: 'd', header: 'Date', render: (r) => fmtShort(r.date) }, { key: 'r', header: 'Reference', render: (r) => <span className="tabular text-slate-600">{r.ref}</span> }, { key: 't', header: 'Narration', render: (r) => r.text }, { key: 'a', header: 'Amount', align: 'right', render: (r) => <span className={r.amt < 0 ? 'text-rose-600' : 'text-emerald-700'}>{inr(r.amt)}</span> }, { key: 'm', header: 'Match', render: (r) => <Status>{r.match}</Status> }]} />
          </Card>
        </div>
      )}
      {tab === 'GST & compliance' && (
        <div className="space-y-3">
          <Callout tone="gray" icon={<ShieldCheck size={16} />} title="GSTIN 36AAMCA4821K1Z6 · Telangana · monthly filer">E-invoicing is not required because turnover is under ₹5 Cr. E-way bills are prepared for consignments over ₹50,000. The Compliance agent reminds you; it never files anything.</Callout>
          <Card pad={false}><DataTable rowKey={(r) => r.name} rows={compliance} columns={[{ key: 'n', header: 'Return / payment', render: (r) => <span className="font-medium">{r.name}</span> }, { key: 'd', header: 'Due', render: (r) => fmtDate(r.due) }, { key: 's', header: 'Status', render: (r) => <Badge tone={r.tone as 'blue'}>{r.status}</Badge> }, { key: 'a', header: '', align: 'right', render: (r) => (/ITC-04/.test(r.name) ? <Link to="/job-work?tab=ITC-04" className="text-xs text-brand-700 hover:underline">Open</Link> : /3B/.test(r.name) ? <Button size="sm" variant="ghost" onClick={() => toast('Mismatch: 3 bills from CastHub Rajkot not yet in GSTR-2B (demo)')}>See mismatch</Button> : null) }]} /></Card>
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Output GST (Oct)" value={lakh(446400)} sub="CGST + SGST ₹3.9L · IGST ₹0.56L" />
            <Kpi label="Input credit (Oct)" value={lakh(318000)} sub="₹85,000 not yet in 2B" tone="amber" />
            <Kpi label="Estimated GST payable" value={lakh(128400)} sub="in cash, due 20 Nov" />
          </div>
        </div>
      )}
    </div>
  );
}

export function InvoiceDetail() {
  const { id } = useParams();
  const ctx = useStore();
  const { s, update, toast, openDraft } = ctx;
  const [pay, setPay] = useState(false);
  const [mode, setMode] = useState('UPI');
  const [amt, setAmt] = useState('');
  const [ref, setRef] = useState('');
  const i = s.invoices.find((x) => x.id === id);
  if (!i) return <div className="p-8 text-slate-500">Invoice not found.</div>;
  const c = customerById(s, i.customerId);
  const g = gstSplit(taxable(i), !!i.interstate);
  const out = outstanding(i);
  const remind = () => {
    if (i.id === 'INV-1048') return reminder1048(ctx);
    openDraft({ title: `Payment reminder – ${i.id}`, channel: 'WhatsApp', to: `${c.contact} · ${c.name}`, toDetail: c.phone, approveLabel: 'Approve & send',
      body: `Namaste ${c.contact.split(' ')[0]} garu,\n\nA reminder that invoice ${i.id} for ${inr(out)} was due on ${fmtDate(i.due)}. You can pay by UPI (aarohan@hdfcbank) or NEFT to HDFC Bank ••4821.\n\nThank you,\nBhargavi – Aarohan Industries`,
      onApprove: () => { update((d) => { d.invoices.find((x) => x.id === i.id)!.history.unshift({ date: todayISO, text: 'WhatsApp reminder sent (approved)', mode: 'WhatsApp' }); }, `Reminder sent for ${i.id} (simulated)`); toast('Reminder marked as sent (simulated)', 'green'); } });
  };
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Finance', to: '/finance?tab=Receivables' }, { label: i.id }]} title={`${i.id} · ${c.name}`} subtitle={`Tax invoice · ${fmtDate(i.issue)} · for ${i.order}`} badge={<Status>{i.status}</Status>}
        actions={<>{out > 0 && <Button icon={<MessageCircle size={14} />} data-testid="invoice-reminder" onClick={remind}>Send reminder</Button>}{out > 0 && <Button variant="primary" icon={<IndianRupee size={14} />} data-testid="record-payment" onClick={() => { setAmt(String(out)); setPay(true); }}>Record payment</Button>}</>} />
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Invoice total" value={inr(i.total)} /><Kpi label="Received" value={inr(i.paid)} tone="green" />
        <Kpi label="Outstanding" value={inr(out)} tone={out ? 'amber' : 'green'} /><Kpi label="Overdue" value={out && overdueDays(i) ? `${overdueDays(i)} days` : '—'} tone="red" sub={`Terms: ${c.creditDays} days`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card title="GST breakup" className="col-span-2">
          <Fields cols={3}><Field label="Taxable value">{inr(taxable(i))}</Field>{i.interstate ? <Field label="IGST 18%">{inr(g.igst)}</Field> : <><Field label="CGST 9%">{inr(g.cgst)}</Field><Field label="SGST 9%">{inr(g.sgst)}</Field></>}<Field label="Customer GSTIN">{c.gstin}</Field><Field label="Place of supply">{i.interstate ? 'Karnataka (29) – inter-state' : 'Telangana (36)'}</Field><Field label="E-way bill">{i.ewb || 'Not required / not recorded'}</Field></Fields>
          {i.pdc && <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">Post-dated cheque {i.pdc.cheque} · {i.pdc.bank} · dated {fmtDate(i.pdc.date)} · {inr(i.pdc.amount)}. Deposit on the date; the Collections agent will remind you.</div>}
        </Card>
        <Card title="History"><Timeline items={i.history.map((h) => ({ date: fmtShort(h.date), title: h.text, tag: h.mode }))} /></Card>
      </div>
      <Modal open={pay} onClose={() => setPay(false)} title={`Record payment · ${i.id}`} subtitle="Records a payment you already received. It does not collect money." footer={<><Button onClick={() => setPay(false)}>Cancel</Button><Button variant="primary" data-testid="save-payment" onClick={() => { const n = Math.min(Number(amt) || 0, out); update((d) => { const x = d.invoices.find((v) => v.id === i.id)!; x.paid += n; x.status = x.paid >= x.total ? 'Paid' : 'Part paid'; x.history.unshift({ date: todayISO, text: `Payment recorded${ref ? ` · ref ${ref}` : ''}`, mode, amount: n }); }, `Recorded ${inr(n)} against ${i.id} via ${mode}`); toast(`${inr(n)} recorded against ${i.id}`, 'green'); setPay(false); }}>Save payment</Button></>}>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-600">Mode<div className="mt-1"><Select value={mode} onChange={setMode} options={['UPI', 'NEFT', 'RTGS', 'Cheque', 'Post-dated cheque', 'Cash']} /></div></label>
          <label className="block text-xs font-medium text-slate-600">Amount (₹)<input value={amt} onChange={(e) => setAmt(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-[13px]" /></label>
          <label className="block text-xs font-medium text-slate-600">{mode.includes('heque') ? 'Cheque number' : 'UTR / reference'}<input value={ref} onChange={(e) => setRef(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-[13px]" placeholder={mode === 'UPI' ? 'e.g. 4410 2931 8872' : ''} /></label>
          <div className="flex items-center gap-2 text-2xs text-slate-400"><Wallet size={12} /> Syncs to Tally as a receipt voucher on the next Books sync (simulated).</div>
        </div>
      </Modal>
    </div>
  );
}
