import { useState } from 'react';
import { Coins, Landmark, ShieldCheck, Users, Download, Send, CheckCircle2, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, Kpi, Tabs, useTab, DataTable, Badge, Button, Modal, Select } from '../../components/ui';
import { useStore } from '../../lib/store';
import { inr, lakh } from '../../lib/format';
import { P0A, payTotals, sumBy } from '../../lib/p0actions';
import { t } from '../../lib/i18n';
import { ModHead, Grid, useCan, useLang, COLORS } from './kit';
import type { PayLine } from '../../lib/p0data';

const STEPS = ['Draft', 'Approved', 'Paid'] as const;
export default function Payroll() {
  const { s, update, toast, openConfirm } = useStore();
  const lang = useLang(); const may = useCan('payroll');
  const [tab, setTab] = useTab('Pay run');
  const [slip, setSlip] = useState<PayLine | null>(null);
  const [adv, setAdv] = useState(false);
  const pr = s.p0.payrun; const T = payTotals(s);
  const stat = [{ k: 'PF (employee 12%)', v: T.pf }, { k: 'ESI (0.75%)', v: T.esi }, { k: 'Professional tax', v: T.pt }, { k: 'TDS', v: T.tds }, { k: 'LWF', v: T.lwf }];
  const byTeam = Object.entries(pr.lines.reduce<Record<string, number>>((a, l) => { a[l.team.split(' – ')[0]] = (a[l.team.split(' – ')[0]] || 0) + l.gross; return a; }, {})).map(([k, v]) => ({ k, v }));
  const bankCsv = ['Emp ID,Name,Bank,Net'].concat(pr.lines.map((l) => `${l.emp},${l.name},${l.bank},${l.net}`)).join('\n');
  return (
    <div data-testid="page-payroll">
      <ModHead k="payroll" subtitle={`Pay run · ${pr.month} · ${T.heads} employees`} badge={<Badge tone={pr.status === 'Paid' ? 'green' : pr.status === 'Approved' ? 'blue' : 'amber'} dot>{pr.status}</Badge>}
        actions={<>
          {pr.status === 'Draft' && (may('approve') ? <Button variant="primary" data-testid="payroll-approve" icon={<CheckCircle2 size={14} />} onClick={() => update((d) => P0A.approvePayroll(d), `Payroll ${pr.month} approved`, { module: "payroll", record: `Pay run ${pr.month}`, before: "Draft", after: "Approved" })}>{t(lang, 'approve')}</Button> : <Badge tone="gray">Waiting for approver</Badge>)}
          {pr.status === 'Approved' && may('approve') && <Button variant="primary" data-testid="payroll-pay" icon={<Landmark size={14} />} onClick={() => openConfirm({ title: 'Release salaries?', body: `Generates the HDFC bank upload file for ${inr(T.net)} (${T.heads} employees). Demo – no money moves.`, confirmLabel: 'Generate bank file', onConfirm: () => { update((d) => P0A.payPayroll(d), `Payroll ${pr.month} marked paid – bank file generated`, { module: 'payroll', record: `Pay run ${pr.month}`, before: 'Approved', after: 'Paid' }); toast('Bank payout file ready'); } })}>Pay</Button>}
          <Button icon={<Send size={14} />} data-testid="payslips-send" onClick={() => { update((d) => P0A.sendPayslips(d), `Payslips for ${pr.month} shared on WhatsApp (simulated)`, { module: 'payroll', record: `Pay run ${pr.month}`, after: 'Payslips sent (in-app simulation)' }); toast('Payslips queued on WhatsApp – demo only, nothing sent', 'blue'); }}>{pr.payslipsSent ? 'Payslips sent ✓' : 'Send payslips'}</Button>
        </>} />
      <div className="mb-4 flex items-center gap-2">{STEPS.map((st, i) => { const on = STEPS.indexOf(pr.status) >= i; return <div key={st} className="flex flex-1 items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-semibold ${on ? 'bg-grad text-white shadow-glow' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span><span className={`text-[13px] font-medium ${on ? 'text-slate-900' : 'text-slate-400'}`}>{st}</span>{i < 2 && <span className={`h-0.5 flex-1 rounded ${STEPS.indexOf(pr.status) > i ? 'bg-brand-400' : 'bg-slate-200'}`} />}</div>; })}</div>
      <Grid cols={5}>
        <Kpi label={t(lang, 'gross')} value={lakh(T.gross)} icon={<Coins size={15} />} sub={`${T.heads} ${t(lang, 'employees')}`} />
        <Kpi label={t(lang, 'net')} value={lakh(T.net)} icon={<Landmark size={15} />} sub="to bank" tone="green" />
        <Kpi label="PF this month" value={inr(T.pf)} icon={<ShieldCheck size={15} />} sub="employee share; employer same" />
        <Kpi label="ESI" value={inr(T.esi)} icon={<ShieldCheck size={15} />} sub={`${pr.lines.filter((l) => l.esi).length} covered`} />
        <Kpi label="LOP days" value={T.lop} icon={<Users size={15} />} sub="from attendance" tone={T.lop ? 'amber' : undefined} />
      </Grid>
      <Tabs tabs={['Pay run', 'Statutory', 'Advances & loans', 'Salary structures', 'Bank file', 'Full & final']} value={tab} onChange={setTab} />
      {tab === 'Pay run' && <Card pad={false} title="Employee pay lines" subtitle="Click a row for the payslip">
        <DataTable rows={pr.lines} rowKey={(r) => r.emp} onRowClick={setSlip} dense columns={[
          { key: 'n', header: 'Employee', render: (r) => <span className="font-medium text-slate-800">{r.name}<span className="block text-2xs text-slate-400">{r.emp} · {r.team}</span></span> },
          { key: 'd', header: 'Paid days', align: 'right', render: (r) => <>{r.days}{r.lop > 0 && <Badge tone="amber">LOP {r.lop}</Badge>}</> },
          { key: 'o', header: 'OT hrs', align: 'right', render: (r) => r.ot || '—' },
          { key: 'g', header: 'Gross', align: 'right', render: (r) => inr(r.gross) },
          { key: 'p', header: 'PF / ESI / PT', align: 'right', render: (r) => <span className="text-slate-500">{inr(r.pf)} / {inr(r.esi)} / {inr(r.pt)}</span> },
          { key: 'a', header: 'Advance', align: 'right', render: (r) => r.advance ? <span className="text-rose-600">−{inr(r.advance)}</span> : '—' },
          { key: 'net', header: 'Net', align: 'right', render: (r) => <b>{inr(r.net)}</b> },
        ]} /></Card>}
      {tab === 'Statutory' && <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Statutory dues · October" subtitle="PF/ESI due 15 Nov · PT due 10 Nov · TDS due 7 Nov">
          <div className="h-60"><ResponsiveContainer><BarChart data={stat}><XAxis dataKey="k" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => inr(v)} /><Bar dataKey="v" radius={[6, 6, 0, 0]}>{stat.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Bar></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Cost by team"><div className="h-60"><ResponsiveContainer><PieChart><Pie data={byTeam} dataKey="v" nameKey="k" innerRadius={50} outerRadius={90} paddingAngle={2}>{byTeam.map((_, i) => <Cell key={i} fill={COLORS[i % 7]} />)}</Pie><Tooltip formatter={(v: number) => inr(v)} /></PieChart></ResponsiveContainer></div></Card>
      </div>}
      {tab === 'Advances & loans' && <Card pad={false} title="Advances & loans" actions={may('create') && <Button size="sm" onClick={() => setAdv(true)}>New advance</Button>}>
        <DataTable rows={s.p0.advances} rowKey={(r) => r.id} columns={[{ key: 'i', header: 'ID', render: (r) => r.id }, { key: 'n', header: 'Employee', render: (r) => r.name }, { key: 'a', header: 'Amount', align: 'right', render: (r) => inr(r.amount) }, { key: 'm', header: 'Recovery', render: (r) => `${r.months} months · ${inr(Math.round(r.amount / r.months))}/mo` }, { key: 'r', header: 'Recovered', align: 'right', render: (r) => inr(r.recovered) }, { key: 's', header: t(lang, 'status'), render: (r) => <Badge tone={r.status === 'Active' ? 'blue' : 'gray'} dot>{r.status}</Badge> }]} /></Card>}
      {tab === 'Salary structures' && <Card pad={false} title="Salary structures"><DataTable rows={[['Staff A (Directors)', 250000], ['Managers & heads', 85000], ['Leads / supervisors', 42000], ['Skilled (welder, machinist, exec)', 24000], ['Semi-skilled / helpers', 16500]]} rowKey={(r) => String(r[0])} columns={[{ key: 'g', header: 'Grade', render: (r) => r[0] }, { key: 'c', header: 'CTC / month', align: 'right', render: (r) => inr(r[1] as number) }, { key: 'b', header: 'Basic 50%', align: 'right', render: (r) => inr((r[1] as number) / 2) }, { key: 'h', header: 'HRA 20%', align: 'right', render: (r) => inr((r[1] as number) * 0.2) }, { key: 'o', header: 'Special', align: 'right', render: (r) => inr((r[1] as number) * 0.3) }]} /></Card>}
      {tab === 'Bank file' && <Card title="HDFC bulk upload file" subtitle={pr.bankFile ? 'Generated – ready to upload to net banking' : 'Preview – generated when the pay run is paid'} actions={<Button size="sm" icon={<Download size={13} />} onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bankCsv], { type: 'text/csv' })); a.download = `salary-${pr.month}.csv`; a.click(); }}>Download CSV</Button>}>
        <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-[11.5px] text-emerald-200">{bankCsv.split('\n').slice(0, 14).join('\n')}{'\n'}… {pr.lines.length} rows · {inr(T.net)}</pre></Card>}
      {tab === 'Full & final' && <Card pad={false} title="Full & final settlements"><DataTable rows={s.p0.fnf} rowKey={(r) => r.emp} columns={[{ key: 'n', header: 'Employee', render: (r) => r.name }, { key: 'l', header: 'Last working day', render: (r) => r.lwd }, { key: 'a', header: 'Settlement', align: 'right', render: (r) => inr(r.amount) }, { key: 's', header: t(lang, 'status'), render: (r) => <Badge tone="amber" dot>{r.status}</Badge> }]} /></Card>}
      <Modal open={!!slip} onClose={() => setSlip(null)} title={<span className="flex items-center gap-2"><FileText size={16} /> Payslip · {pr.month}</span>} subtitle={slip ? `${slip.name} · ${slip.emp} · ${slip.bank}` : ''}>
        {slip && <div data-testid="payslip" className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
          {[['Basic', slip.basic], ['HRA + special', slip.gross - slip.basic], ['Paid days', `${slip.days} / 26`], ['OT hours', slip.ot], ['PF', -slip.pf], ['ESI', -slip.esi], ['Professional tax', -slip.pt], ['LWF', -slip.lwf], ['TDS', -slip.tds], ['Advance recovery', -slip.advance]].map(([k, v]) => <div key={k as string} className="flex justify-between border-b border-slate-100 py-1"><span className="text-slate-500">{k}</span><span className="tabular">{typeof v === 'number' ? inr(v) : v}</span></div>)}
          <div className="col-span-2 mt-2 flex justify-between rounded-lg bg-brand-50 px-3 py-2 font-semibold text-brand-800"><span>Net pay</span><span>{inr(slip.net)}</span></div>
        </div>}
      </Modal>
      <AdvanceModal open={adv} onClose={() => setAdv(false)} />
      <p className="mt-3 text-2xs text-slate-400">Totals: deductions {inr(sumBy(pr.lines, (l) => l.pf + l.esi + l.pt + l.lwf + l.tds))} · advances recovered {inr(T.adv)}</p>
    </div>
  );
}
function AdvanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, update, toast } = useStore();
  const [emp, setEmp] = useState(s.employees[5]?.name || ''); const [amt, setAmt] = useState('5000'); const [m, setM] = useState('2');
  return <Modal open={open} onClose={onClose} title="New salary advance" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { const e = s.employees.find((x) => x.name === emp)!; update((d) => { P0A.giveAdvance(d, e.id, e.name, +amt, +m); }, `Advance ${inr(+amt)} to ${e.name}, recover in ${m} months`, { module: 'payroll', record: e.name, after: `${inr(+amt)} / ${m} months` }); toast('Advance recorded'); onClose(); }}>Save</Button></>}>
    <div className="grid gap-3"><Select label="Employee" value={emp} onChange={setEmp} options={s.employees.map((e) => e.name)} />
      <label className="text-[13px]">Amount <input value={amt} onChange={(e) => setAmt(e.target.value)} className="ml-2 rounded border px-2 py-1" /></label>
      <label className="text-[13px]">Recover over (months) <input value={m} onChange={(e) => setM(e.target.value)} className="ml-2 w-16 rounded border px-2 py-1" /></label></div>
  </Modal>;
}
