import React from 'react';
import { Printer } from 'lucide-react';
import { Modal, Button } from '../components/ui';
import { inr } from '../lib/format';
import { PROVIDER, STATE_NAME, custGstin, tenantsAll, type BInvoice, type BPayment } from './data';

const words = (n: number) => { const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']; const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''); const three = (x: number) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  let s = ''; const cr = Math.floor(n / 1e7), l = Math.floor(n / 1e5) % 100, th = Math.floor(n / 1000) % 100, r = n % 1000;
  if (cr) s += two(cr) + ' Crore '; if (l) s += two(l) + ' Lakh '; if (th) s += two(th) + ' Thousand '; if (r) s += three(r); return 'Rupees ' + s.trim() + ' Only'; };

export function InvoiceModal({ inv, onClose, receipt }: { inv: BInvoice | null; onClose: () => void; receipt?: BPayment }) {
  if (!inv) return null;
  const t = tenantsAll().find((x) => x.id === inv.tenant)!; const g = custGstin(t);
  const Row = ({ k, v, b }: { k: string; v: React.ReactNode; b?: boolean }) => <div className={'flex justify-between py-1 ' + (b ? 'border-t border-slate-300 font-semibold' : '')}><span>{k}</span><span className="tabular">{v}</span></div>;
  return (
    <Modal open onClose={onClose} width="max-w-2xl" title={receipt ? `Payment receipt ${receipt.id}` : `Tax invoice ${inv.id}`} subtitle="Original for recipient · system-generated (demo)"
      footer={<><Button onClick={onClose}>Close</Button><Button variant="primary" icon={<Printer size={15} />} data-testid="inv-download" onClick={() => window.print()}>Download PDF</Button></>}>
      <div data-testid="invoice-doc" className="print-area rounded-xl border border-slate-200 bg-white p-4 text-[12.5px] text-slate-700 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-xs font-bold text-white">B</span><span className="text-[15px] font-semibold text-slate-900">{PROVIDER.name}</span></div>
            <div className="mt-1 max-w-xs text-2xs text-slate-500">{PROVIDER.addr}</div><div className="text-2xs">GSTIN <b>{PROVIDER.gstin}</b> · PAN {PROVIDER.pan}</div></div>
          <div className="text-right"><div className="text-[15px] font-bold uppercase tracking-wide text-indigo-700">{receipt ? 'Receipt' : 'Tax invoice'}</div><div>No. <b>{receipt ? receipt.id : inv.id}</b></div><div>Date {receipt ? receipt.date : inv.date}</div>{!receipt && <div>Due {inv.due}</div>}</div>
        </div>
        <div className="grid gap-3 border-b border-slate-200 py-3 sm:grid-cols-2">
          <div><div className="text-2xs uppercase text-slate-400">Billed to</div><div className="font-semibold text-slate-900">{t.name}</div><div>{t.city}, {STATE_NAME[g.slice(0, 2)]}</div><div>GSTIN <b>{g}</b></div></div>
          <div className="sm:text-right"><div className="text-2xs uppercase text-slate-400">Place of supply</div><div>{STATE_NAME[g.slice(0, 2)]} ({g.slice(0, 2)})</div><div className="text-2xs text-slate-500">Reverse charge: No · Period {inv.period}</div></div>
        </div>
        {!receipt ? <>
          <div className="overflow-x-auto"><table className="mt-3 w-full min-w-[460px]"><thead><tr className="bg-slate-50 text-left text-2xs uppercase text-slate-500"><th className="p-2">Description</th><th className="p-2">SAC</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Taxable</th></tr></thead>
            <tbody><tr className="border-b border-slate-100"><td className="p-2">Business OS {inv.plan} plan – subscription for {inv.month}<div className="text-2xs text-slate-400">{inv.users} users · {PROVIDER.sacDesc}</div></td><td className="p-2">{PROVIDER.sac}</td><td className="p-2 text-right">1</td><td className="p-2 text-right tabular">{inr(inv.taxable)}</td></tr></tbody></table></div>
          <div className="ml-auto mt-2 w-full max-w-xs"><Row k="Taxable value" v={inr(inv.taxable)} />{inv.igst ? <Row k="IGST @18%" v={inr(inv.igst)} /> : <><Row k="CGST @9%" v={inr(inv.cgst)} /><Row k="SGST @9%" v={inr(inv.sgst)} /></>}<Row b k="Invoice total" v={inr(inv.total)} /></div>
          <div className="mt-2 text-2xs text-slate-500">{words(inv.total)}</div>
          <div className="mt-3 rounded-lg bg-amber-50 p-2 text-2xs text-amber-800">TDS, if any, is deducted on the taxable value ({inr(inv.taxable)}) – not on GST. Our PAN for Form 16A: {PROVIDER.pan}. Lower-deduction certificate under Section 197 available in Billing → TDS.</div>
          <div className="mt-2 text-2xs text-slate-400">Pay to {PROVIDER.bank} · IRN generated via IRP (simulated)</div>
        </> : <div className="mt-3 max-w-sm"><Row k={`Against invoice ${inv.id}`} v={inr(receipt.gross)} />{receipt.tdsLines.map((l, i) => <Row key={i} k={`Less TDS ${l.section === '197' ? `Sec 197 @${l.rate}%` : `194J @${l.rate}%`} on ${inr(l.base)}`} v={'– ' + inr(l.amt)} />)}<Row b k={`Received via ${receipt.method}`} v={inr(receipt.net)} /><div className="text-2xs text-slate-400">Ref {receipt.ref} (simulated – no real payment)</div></div>}
      </div>
    </Modal>);
}
