import { FileCheck2, QrCode, Truck, AlertTriangle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, Kpi, Tabs, useTab, DataTable, Badge, Button } from '../../components/ui';
import { useStore } from '../../lib/store';
import { inr, lakh } from '../../lib/format';
import { P0A, sumBy } from '../../lib/p0actions';
import { ModHead, Grid, useCan } from './kit';

export const gstSummary = (s: ReturnType<typeof useStore>['s']) => {
  const taxable = Math.round(sumBy(s.invoices, (i) => i.total) / 1.18); const out = Math.round(taxable * 0.18);
  const itc = Math.round(sumBy(s.bills, (b) => b.amount) / 1.18 * 0.18);
  return { taxable, out, itc, net: Math.max(0, out - itc), b2b: s.invoices.length };
};
export default function Gst() {
  const { s, update, toast } = useStore(); const may = useCan('gst');
  const [tab, setTab] = useTab('e-Invoices');
  const g = gstSummary(s); const e = s.p0.einv;
  const months = [['Jul', 5.1, 3.9], ['Aug', 5.8, 4.2], ['Sep', 6.4, 4.7], ['Oct', g.out / 1e5, g.itc / 1e5]].map(([m, o, i]) => ({ m, Output: +(+o).toFixed(1), ITC: +(+i).toFixed(1) }));
  return (
    <div data-testid="page-gst">
      <ModHead k="gst" subtitle="e-Invoice (IRN/QR), e-way bills and GSTR-1 / 3B – sandbox demo, nothing is filed" />
      <Grid>
        <Kpi label="IRN generated" value={`${e.filter((x) => x.irn === 'Generated').length}/${e.length}`} icon={<QrCode size={15} />} sub={`${e.filter((x) => x.irn !== 'Generated').length} pending/failed`} tone="amber" />
        <Kpi label="e-way bills active" value={e.filter((x) => x.ewbStatus === 'Active').length} icon={<Truck size={15} />} sub={`${e.filter((x) => x.ewbStatus === 'Expiring').length} expiring today`} tone="amber" />
        <Kpi label="Output GST (Oct)" value={lakh(g.out)} icon={<FileCheck2 size={15} />} sub={`on ${lakh(g.taxable)} taxable`} />
        <Kpi label="Net payable (3B)" value={lakh(g.net)} icon={<AlertTriangle size={15} />} sub="due 20 Nov" tone="red" />
      </Grid>
      <Tabs tabs={['e-Invoices', 'e-Way bills', 'GSTR-1 / 3B']} value={tab} onChange={setTab} />
      {tab === 'e-Invoices' && <Card pad={false} title="e-Invoice register"><DataTable rows={e} rowKey={(r) => r.inv} columns={[
        { key: 'i', header: 'Invoice', render: (r) => <b>{r.inv}</b> }, { key: 'c', header: 'Customer', render: (r) => r.customer }, { key: 'a', header: 'Value', align: 'right', render: (r) => inr(r.amount) },
        { key: 's', header: 'IRN', render: (r) => <Badge tone={r.irn === 'Generated' ? 'green' : r.irn === 'Failed' ? 'red' : 'amber'} dot>{r.irn}</Badge> },
        { key: 'n', header: 'IRN / QR', render: (r) => r.irnNo ? <span className="flex items-center gap-1 font-mono text-2xs text-slate-500"><QrCode size={14} className="text-slate-700" />{r.irnNo}</span> : '—' },
        { key: 'x', header: '', render: (r) => r.irn !== 'Generated' && may('create') ? <Button size="sm" data-irn={r.inv} icon={<RefreshCw size={12} />} onClick={() => { update((d) => P0A.generateIRN(d, r.inv), `IRN generated for ${r.inv}`, { module: 'gst', record: r.inv, before: r.irn, after: 'Generated' }); toast('IRN generated (sandbox)'); }}>Generate IRN</Button> : null },
      ]} /></Card>}
      {tab === 'e-Way bills' && <Card pad={false} title="e-Way bills" subtitle="Validity 1 day per 200 km"><DataTable rows={e.filter((x) => x.ewb)} rowKey={(r) => r.inv} columns={[
        { key: 'e', header: 'EWB no.', render: (r) => <span className="font-mono">{r.ewb}</span> }, { key: 'i', header: 'Invoice', render: (r) => r.inv }, { key: 'v', header: 'Vehicle', render: (r) => r.vehicle }, { key: 'k', header: 'Distance', align: 'right', render: (r) => `${r.km} km` },
        { key: 'u', header: 'Valid until', render: (r) => r.ewbValid }, { key: 's', header: 'Status', render: (r) => <Badge tone={r.ewbStatus === 'Active' ? 'green' : r.ewbStatus === 'Expiring' ? 'amber' : 'red'} dot>{r.ewbStatus}</Badge> },
        { key: 'x', header: '', render: (r) => r.ewbStatus !== 'Active' && may('edit') ? <Button size="sm" onClick={() => update((d) => P0A.extendEwb(d, r.inv), `e-way bill extended for ${r.inv}`, { module: 'gst', record: r.ewb, before: r.ewbStatus, after: 'Active till 31 Oct' })}>Extend</Button> : null },
      ]} /></Card>}
      {tab === 'GSTR-1 / 3B' && <div className="grid gap-4 lg:grid-cols-2">
        <Card title="GSTR-1 · October" subtitle="Due 11 Nov"><div className="grid grid-cols-2 gap-3 text-[13px]">{[['B2B invoices', g.b2b], ['Taxable value', inr(g.taxable)], ['CGST + SGST', inr(Math.round(g.out * 0.9))], ['IGST', inr(Math.round(g.out * 0.1))], ['HSN lines', 14], ['Credit notes', 2]].map(([a, b]) => <div key={a as string} className="rounded-xl bg-slate-50 p-3"><div className="text-2xs text-slate-500">{a}</div><div className="text-[16px] font-semibold">{b}</div></div>)}</div></Card>
        <Card title="GSTR-3B · output vs ITC (₹ lakh)"><div className="h-56"><ResponsiveContainer><BarChart data={months}><XAxis dataKey="m" /><YAxis /><Tooltip /><Legend /><Bar dataKey="Output" fill="#6366f1" radius={[6, 6, 0, 0]} /><Bar dataKey="ITC" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div><p className="text-[13px]">Net cash payable <b>{inr(g.net)}</b> after ITC {inr(g.itc)}.</p></Card>
      </div>}
    </div>
  );
}
