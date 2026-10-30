import { CalendarClock, UserCheck, UserX, Timer, HardHat } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, Kpi, Tabs, useTab, DataTable, Badge, Button } from '../../components/ui';
import { useStore } from '../../lib/store';
import { inr } from '../../lib/format';
import { P0A } from '../../lib/p0actions';
import { t } from '../../lib/i18n';
import AttendanceDevices from '../AttendanceDevices';
import { ModHead, Grid, useCan, useLang } from './kit';

const DAYS = Array.from({ length: 7 }, (_, i) => 23 + i);
const mark = (name: string, day: number, today: string) => day === 29 ? today : ((name.length * 7 + day * 3) % 23 === 0 ? 'A' : (name.length + day) % 7 === 0 && day % 7 === 4 ? 'W' : 'P');
export default function Attendance() {
  const { s, update, toast } = useStore(); const lang = useLang(); const may = useCan('attendance');
  const [tab, setTab] = useTab('Muster roll');
  const E = s.employees; const cnt = (st: string) => E.filter((e) => e.status === st).length;
  const pie = [{ k: t(lang, 'present'), v: cnt('Present') + cnt('Late'), c: '#10b981' }, { k: t(lang, 'absent'), v: cnt('Absent'), c: '#f43f5e' }, { k: t(lang, 'onLeave'), v: cnt('On leave'), c: '#f59e0b' }];
  const code = (st: string) => st === 'Present' ? 'P' : st === 'Late' ? 'L' : st === 'Absent' ? 'A' : 'LV';
  const tone = (c: string) => c === 'P' ? 'bg-emerald-50 text-emerald-700' : c === 'A' ? 'bg-rose-50 text-rose-600' : c === 'W' ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 text-amber-700';
  return (
    <div data-testid="page-attendance">
      <ModHead k="attendance" subtitle="Biometric sync from Gate 1 · 29 Oct 2026 · shifts A (06–14), General (09:30–18:30), Day (08–17)" />
      <Grid cols={5}>
        <Kpi label={t(lang, 'present')} value={`${cnt('Present') + cnt('Late')}/${E.length}`} icon={<UserCheck size={15} />} tone="green" sub={`${cnt('Late')} late`} />
        <Kpi label={t(lang, 'absent')} value={cnt('Absent')} icon={<UserX size={15} />} tone="red" />
        <Kpi label={t(lang, 'onLeave')} value={cnt('On leave')} icon={<CalendarClock size={15} />} sub={`${s.p0.leaves.filter((l) => l.status === 'Pending').length} requests pending`} tone="amber" />
        <Kpi label="OT this week" value={`${s.p0.ot.reduce((a, o) => a + o.hrs, 0)} h`} icon={<Timer size={15} />} />
        <Kpi label="Contract labour" value={`${s.p0.contractors.reduce((a, c) => a + c.present, 0)}/${s.p0.contractors.reduce((a, c) => a + c.heads, 0)}`} icon={<HardHat size={15} />} />
      </Grid>
      <Tabs tabs={['Muster roll', 'Leave', 'Leave balance', 'OT register', 'Contractors', 'Shifts', 'Devices & check-in']} value={tab} onChange={setTab} counts={{ Leave: s.p0.leaves.filter((l) => l.status === 'Pending').length }} />
      {tab === 'Muster roll' && <div className="grid gap-4 lg:grid-cols-[1fr_280px]"><Card pad={false} title="Muster roll · 23–29 Oct"><div className="overflow-x-auto"><table className="w-full text-[12px]"><thead><tr className="text-2xs text-slate-500"><th className="px-3 py-2 text-left">Employee</th>{DAYS.map((d) => <th key={d} className="px-1">{d}</th>)}</tr></thead><tbody>
        {E.map((e) => <tr key={e.id} className="border-t border-slate-100"><td className="px-3 py-1.5 font-medium text-slate-800">{e.name}<span className="block text-2xs font-normal text-slate-400">{e.team.split(' – ')[0]} · {e.shift.split(' ')[0]}</span></td>{DAYS.map((d) => { const c = mark(e.name, d, code(e.status)); return <td key={d} className="px-0.5 text-center"><span className={`inline-block w-7 rounded py-0.5 text-[10.5px] font-semibold ${tone(c)}`}>{c}</span></td>; })}</tr>)}
      </tbody></table></div></Card>
        <Card title="Today"><div className="h-52"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="v" nameKey="k" innerRadius={48} outerRadius={80}>{pie.map((p) => <Cell key={p.k} fill={p.c} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>{pie.map((p) => <div key={p.k} className="flex justify-between text-[13px]"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.c }} />{p.k}</span><b>{p.v}</b></div>)}</Card></div>}
      {tab === 'Leave' && <Card pad={false} title="Leave requests"><DataTable rows={s.p0.leaves} rowKey={(r) => r.id} columns={[
        { key: 'n', header: 'Employee', render: (r) => <b>{r.name}</b> }, { key: 't', header: 'Type', render: (r) => r.type }, { key: 'd', header: 'Dates', render: (r) => `${r.from} → ${r.to} (${r.days}d)` }, { key: 'r', header: 'Reason', render: (r) => r.reason },
        { key: 's', header: t(lang, 'status'), render: (r) => <Badge tone={r.status === 'Approved' ? 'green' : r.status === 'Rejected' ? 'red' : 'amber'} dot>{r.status}</Badge> },
        { key: 'x', header: '', render: (r) => r.status === 'Pending' && may('approve') ? <span className="flex gap-1"><Button size="sm" variant="success" data-leave={r.id} onClick={() => { update((d) => P0A.leave(d, r.id, 'Approved'), `Leave ${r.id} approved for ${r.name}`, { module: 'attendance', record: r.id, before: 'Pending', after: 'Approved' }); toast('Leave approved'); }}>{t(lang, 'approve')}</Button><Button size="sm" onClick={() => update((d) => P0A.leave(d, r.id, 'Rejected'), `Leave ${r.id} rejected`, { module: 'attendance', record: r.id, before: 'Pending', after: 'Rejected' })}>{t(lang, 'reject')}</Button></span> : null },
      ]} /></Card>}
      {tab === 'Leave balance' && <Card pad={false} title="Leave balance (days)"><DataTable dense rows={E} rowKey={(r) => r.id} columns={[{ key: 'n', header: 'Employee', render: (r) => r.name }, { key: 'c', header: 'Casual', align: 'right', render: (r) => 8 - (r.name.length % 5) }, { key: 's', header: 'Sick', align: 'right', render: (r) => 7 - (r.name.length % 3) }, { key: 'e', header: 'Earned', align: 'right', render: (r) => 4 + (r.name.length % 11) }, { key: 'l', header: 'LOP YTD', align: 'right', render: (r) => r.name.length % 9 === 0 ? 2 : 0 }]} /></Card>}
      {tab === 'OT register' && <Card pad={false} title="Overtime register" subtitle="Paid at 2× hourly rate via payroll"><DataTable rows={s.p0.ot} rowKey={(r) => r.emp + r.date} columns={[{ key: 'n', header: 'Employee', render: (r) => r.name }, { key: 'd', header: 'Date', render: (r) => r.date }, { key: 'h', header: 'Hours', align: 'right', render: (r) => r.hrs }, { key: 'a', header: 'Approved', render: (r) => <Badge tone={r.approved ? 'green' : 'amber'}>{r.approved ? 'Approved' : 'Pending'}</Badge> }]} /></Card>}
      {tab === 'Contractors' && <Card pad={false} title="Contract labour attendance"><DataTable rows={s.p0.contractors} rowKey={(r) => r.agency} columns={[{ key: 'a', header: 'Agency', render: (r) => <b>{r.agency}</b> }, { key: 'h', header: 'Deployed', align: 'right', render: (r) => r.heads }, { key: 'p', header: 'Present today', align: 'right', render: (r) => r.present }, { key: 'r', header: 'Day rate', align: 'right', render: (r) => inr(r.rate) }, { key: 'b', header: 'Month bill (est.)', align: 'right', render: (r) => inr(r.present * r.rate * 26) }]} /></Card>}
      {tab === 'Shifts' && <Card pad={false} title="Shift roster"><DataTable rows={[...new Set(E.map((e) => e.shift))]} rowKey={(r) => r} columns={[{ key: 's', header: 'Shift', render: (r) => <b>{r}</b> }, { key: 'n', header: 'Headcount', align: 'right', render: (r) => E.filter((e) => e.shift === r).length }, { key: 'p', header: 'Present', align: 'right', render: (r) => E.filter((e) => e.shift === r && /Present|Late/.test(e.status)).length }]} /></Card>}
      {tab === 'Devices & check-in' && <AttendanceDevices />}
    </div>
  );
}
