import { useState } from 'react';
import { Lightbulb, FileDown } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, AreaChart, Area } from 'recharts';
import { useStore } from '../lib/store';
import { monthly } from '../lib/data';
import { PageHeader, Card, Button, Callout, Kpi, Segmented } from '../components/ui';

const RANGES = { '3M': 3, '6M': 6, 'FY YTD': 7 } as const;
export default function Reports() {
  const { s, toast } = useStore();
  const [range, setRange] = useState<keyof typeof RANGES>('6M');
  const octInv = Math.round(s.skus.reduce((a, k) => a + k.onHand * k.unitCost, 0) / 1e4) / 10;
  const data = monthly.map((m) => (m.m === 'Oct' ? { ...m, invValue: octInv } : m)).slice(-RANGES[range]);
  const first = data[0], last = data[data.length - 1];
  const tick = { fontSize: 11, fill: '#64748b' };
  const download = () => {
    const csv = ['Month,Revenue (₹L),Collected (₹L),Gross margin %,DSO days,Inventory (₹L),On-time %', ...data.map((m) => [m.m, m.revenue, m.collected, m.margin, m.dso, m.invValue, m.onTime].join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `aarohan-monthly-${range.replace(' ', '-')}.csv`; a.click();
    toast('Report downloaded (demo data)');
  };
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Reports' }]} title="Reports" subtitle={`FY 2026-27 · ${data[0].m}–${last.m} 2026 · all units`}
        actions={<><Segmented value={range} onChange={(v) => setRange(v as keyof typeof RANGES)} options={Object.keys(RANGES).map((r) => ({ value: r, label: r === '3M' ? 'Last 3 months' : r === '6M' ? 'Last 6 months' : 'FY to date' }))} /><Button icon={<FileDown size={14} />} onClick={download}>Download</Button></>} />
      <Callout tone="amber" icon={<Lightbulb size={16} />} title="What the numbers say" >
        <span data-testid="report-insight">Sales are growing, but collection speed is slowing. Review overdue accounts before increasing inventory commitments.</span> Revenue went from ₹{first.revenue}L to ₹{last.revenue}L, while days to collect rose from {first.dso} to {last.dso}.
      </Callout>
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Revenue (Oct)" value={`₹${last.revenue}L`} sub={`+${(((last.revenue - first.revenue) / first.revenue) * 100).toFixed(0)}% vs ${first.m}`} tone="green" />
        <Kpi label="Collected (Oct)" value={`₹${last.collected}L`} sub={`${((last.collected / last.revenue) * 100).toFixed(0)}% of billing`} tone="amber" />
        <Kpi label="Days to collect (DSO)" value={`${last.dso} days`} sub={`up from ${first.dso}`} tone="red" />
        <Kpi label="On-time delivery" value={`${last.onTime}%`} sub={`${first.onTime}% in ${first.m}`} tone="amber" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card title="Billing vs collections (₹ lakh)"><div className="h-60" data-testid="chart-revenue"><ResponsiveContainer><ComposedChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" /><XAxis dataKey="m" tick={tick} /><YAxis tick={tick} width={30} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="revenue" name="Billed" fill="#3b6fe0" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Bar dataKey="collected" name="Collected" fill="#93c5fd" radius={[3, 3, 0, 0]} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div></Card>
        <Card title="Days to collect (DSO)"><div className="h-60"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" /><XAxis dataKey="m" tick={tick} /><YAxis tick={tick} width={30} domain={[30, 50]} /><Tooltip /><Line dataKey="dso" name="DSO (days)" stroke="#e11d48" strokeWidth={2} dot isAnimationActive={false} /></LineChart></ResponsiveContainer></div></Card>
        <Card title="Inventory value in stores (₹ lakh)" subtitle="October computed from live stock"><div className="h-60"><ResponsiveContainer><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" /><XAxis dataKey="m" tick={tick} /><YAxis tick={tick} width={30} /><Tooltip /><Area dataKey="invValue" name="Inventory ₹L" stroke="#7c3aed" fill="#ede9fe" isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></Card>
        <Card title="Margin, on-time delivery and attendance (%)"><div className="h-60"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" /><XAxis dataKey="m" tick={tick} /><YAxis tick={tick} width={30} domain={[25, 100]} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Line dataKey="margin" name="Gross margin" stroke="#059669" strokeWidth={2} isAnimationActive={false} /><Line dataKey="onTime" name="On-time" stroke="#d97706" strokeWidth={2} isAnimationActive={false} /><Line dataKey="attendance" name="Attendance" stroke="#64748b" strokeWidth={2} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></Card>
      </div>
    </div>
  );
}
