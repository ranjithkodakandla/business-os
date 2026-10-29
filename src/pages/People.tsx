import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Fingerprint, UserCheck, CalendarClock } from 'lucide-react';
import { useStore } from '../lib/store';
import { Employee } from '../lib/data';
import { fmtDate } from '../lib/format';
import { runApproval } from '../lib/actions';
import { PageHeader, Card, Button, DataTable, SearchBox, Select, Toolbar, Modal, Field, Fields, Status, Tabs, useTab, Callout, Badge, Kpi, Segmented } from '../components/ui';

const SHIFTS = ['Shift A (06:00–14:00)', 'Shift B (14:00–22:00)', 'Day (08:00–17:00)', 'General (09:30–18:30)'];
const initials = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('');
export function PeopleList() {
  const ctx = useStore();
  const { s, update, toast } = ctx;
  const nav = useNavigate();
  const [tab, setTab] = useTab('Directory');
  const [q, setQ] = useState('');
  const [team, setTeam] = useState('All teams');
  const [type, setType] = useState('All');
  const [ex, setEx] = useState<Employee | null>(null);
  const [shiftFor, setShiftFor] = useState<Employee | null>(null);
  const [shift, setShift] = useState(SHIFTS[0]);
  const teams = ['All teams', ...Array.from(new Set(s.employees.map((e) => e.team)))];
  const rows = s.employees.filter((e) => (team === 'All teams' || e.team === team) && (type === 'All' || e.type === type) && (e.name + e.role + e.id).toLowerCase().includes(q.toLowerCase()));
  const present = s.employees.filter((e) => e.status === 'Present' || e.status === 'Late').length;
  const exceptions = s.employees.filter((e) => e.exception);
  const contract = s.employees.filter((e) => e.type === 'Contract').length;
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'People & HR' }]} title="People & HR" subtitle="Team directory, today's attendance from the biometric device, leave and shifts" />
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Team" value={String(s.employees.length)} sub={`${s.employees.length - contract} permanent · ${contract} contract`} />
        <Kpi label="Present today" value={`${present} / ${s.employees.length}`} sub="biometric · Gate 1 · synced 09:12" tone="green" onClick={() => setTab('Attendance')} />
        <Kpi label="Exceptions" value={String(exceptions.length)} sub="late, missed punch, absent, leave" tone="amber" onClick={() => setTab('Attendance')} />
        <Kpi label="ESI / PF covered" value={`${s.employees.filter((e) => e.esi).length} / ${s.employees.filter((e) => e.pf).length}`} sub="ESI / PF members" />
      </div>
      <Tabs tabs={['Directory', 'Attendance', 'Contract labour']} value={tab} onChange={setTab} counts={{ Attendance: exceptions.length }} />
      {tab === 'Directory' && (<>
        <Toolbar right={<Segmented value={type} onChange={setType} options={['All', 'Permanent', 'Contract'].map((v) => ({ value: v, label: v }))} />}>
          <SearchBox value={q} onChange={setQ} placeholder="Search name, role or ID" /><Select value={team} onChange={setTeam} options={teams} />
        </Toolbar>
        <Card pad={false}><DataTable rowKey={(e: Employee) => e.id} rows={rows} onRowClick={(e) => nav(`/people/${e.id}`)} columns={[
          { key: 'n', header: 'Name', render: (e) => <span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-2xs font-semibold text-slate-600">{initials(e.name)}</span><span><span className="block font-medium text-slate-900">{e.name}</span><span className="text-2xs text-slate-400">{e.id}</span></span></span> },
          { key: 'r', header: 'Role', render: (e) => e.role }, { key: 't', header: 'Team', render: (e) => <span className="text-slate-600">{e.team}</span> },
          { key: 'ty', header: 'Type', render: (e) => <Badge tone={e.type === 'Contract' ? 'violet' : 'gray'}>{e.type}</Badge> }, { key: 'sh', header: 'Shift', render: (e) => <span className="text-slate-600">{e.shift}</span> },
          { key: 'st', header: 'Today', render: (e) => <Status>{e.status}</Status> },
        ]} /></Card>
      </>)}
      {tab === 'Attendance' && (<>
        <Callout tone="gray" icon={<Fingerprint size={16} />} title="Source: biometric device at Gate 1 (simulated sync)">The Attendance agent syncs punches every 30 minutes and marks attendance on its own. Leave approvals and shift changes always need you.</Callout>
        <Card title="Needs a look" pad={false}>
          <DataTable rowKey={(e: Employee) => e.id} rows={exceptions} empty="No exceptions – everyone is accounted for." columns={[
            { key: 'n', header: 'Employee', render: (e) => <span><span className="font-medium text-slate-900">{e.name}</span> <span className="text-2xs text-slate-400">{e.id}</span></span> },
            { key: 't', header: 'Team', render: (e) => e.team }, { key: 'ty', header: 'Type', render: (e) => e.type }, { key: 'i', header: 'Check-in', render: (e) => e.checkIn },
            { key: 'x', header: 'Exception', render: (e) => <span className="text-amber-700">{e.exception}</span> },
            { key: 'a', header: '', align: 'right', render: (e) => <span className="flex justify-end gap-1">
              {e.name === 'Mallesh Kurma' && !s.approvals['apr-leave'] ? <Button size="sm" variant="primary" data-testid="approve-leave" onClick={() => runApproval(ctx, 'apr-leave')}>Approve leave</Button> : <Button size="sm" data-review={e.id} onClick={() => setEx(e)}>Review</Button>}
              <Button size="sm" variant="ghost" onClick={() => { setShiftFor(e); setShift(e.shift); }}>Assign shift</Button></span> },
          ]} />
        </Card>
        <Card title="Today by team" pad={false}>
          <DataTable rowKey={(t: string) => t} rows={teams.slice(1)} columns={[
            { key: 't', header: 'Team', render: (t) => <span className="font-medium">{t}</span> },
            { key: 'sh', header: 'Shift', render: (t) => s.employees.find((e) => e.team === t)!.shift },
            { key: 'p', header: 'Present', align: 'right', render: (t) => s.employees.filter((e) => e.team === t && ['Present', 'Late'].includes(e.status)).length },
            { key: 'n', header: 'Headcount', align: 'right', render: (t) => s.employees.filter((e) => e.team === t).length },
            { key: 'l', header: 'Late / absent / leave', align: 'right', render: (t) => s.employees.filter((e) => e.team === t && e.status !== 'Present').length || '—' },
          ]} />
        </Card>
      </>)}
      {tab === 'Contract labour' && (
        <div className="grid grid-cols-3 gap-3">
          <Card title="Sai Manpower Services" subtitle="Licensed contractor · CLRA registration (demo)" className="col-span-2">
            <Fields cols={3}><Field label="Workers deployed">{contract}</Field><Field label="Monthly bill (Oct)">₹2,48,000 · PB-0563</Field><Field label="TDS">194C @ 2% · ₹4,960</Field><Field label="ESI challan (Oct)"><Badge tone="amber">Awaiting from contractor</Badge></Field><Field label="PF ECR (Oct)"><Badge tone="amber">Awaiting from contractor</Badge></Field><Field label="Wage register">Received 26 Oct</Field></Fields>
            <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">As principal employer, check the contractor's ESI/PF challans before paying PB-0563. The Compliance agent will remind you on 5 Nov.</div>
          </Card>
          <Card title="Permanent vs contract"><div className="space-y-2 text-[13px]">{teams.slice(1).map((t) => { const all = s.employees.filter((e) => e.team === t); const c = all.filter((e) => e.type === 'Contract').length; return <div key={t} className="flex justify-between"><span className="truncate pr-2 text-slate-600">{t}</span><span className="tabular">{all.length - c} / {c}</span></div>; })}</div></Card>
        </div>
      )}
      <Modal open={!!ex} onClose={() => setEx(null)} title={`Review · ${ex?.name}`} subtitle={ex?.exception} footer={<><Button onClick={() => setEx(null)}>Cancel</Button><Button variant="primary" data-testid="resolve-exception" onClick={() => { update((d) => { d.employees.find((x) => x.id === ex!.id)!.exception = undefined; }, `Attendance exception reviewed for ${ex!.name}`); toast(`${ex!.name}: exception resolved`); setEx(null); }}>Mark reviewed</Button></>}>
        {ex && <Fields cols={2}><Field label="Status">{ex.status}</Field><Field label="Check-in">{ex.checkIn}</Field><Field label="Shift">{ex.shift}</Field><Field label="Manager">{ex.manager}</Field><Field label="Type">{ex.type}{ex.contractor ? ` · ${ex.contractor}` : ''}</Field><Field label="Leave">{ex.leave}</Field></Fields>}
      </Modal>
      <Modal open={!!shiftFor} onClose={() => setShiftFor(null)} title={`Assign shift · ${shiftFor?.name}`} footer={<><Button onClick={() => setShiftFor(null)}>Cancel</Button><Button variant="primary" data-testid="save-shift" onClick={() => { update((d) => { d.employees.find((x) => x.id === shiftFor!.id)!.shift = shift; }, `${shiftFor!.name} moved to ${shift}`); toast(`${shiftFor!.name} assigned to ${shift.split(' (')[0]}`); setShiftFor(null); }}>Assign</Button></>}>
        <Select value={shift} onChange={setShift} options={SHIFTS} />
      </Modal>
    </div>
  );
}

export function EmployeeDetail() {
  const { id } = useParams();
  const ctx = useStore();
  const e = ctx.s.employees.find((x) => x.id === id);
  if (!e) return <div className="p-8 text-slate-500">Employee not found.</div>;
  const week = ['Thu 22', 'Fri 23', 'Sat 24', 'Mon 26', 'Tue 27', 'Wed 28'];
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'People & HR', to: '/people' }, { label: e.name }]} title={e.name} subtitle={`${e.role} · ${e.team} · ${e.id}`} badge={<Badge tone={e.type === 'Contract' ? 'violet' : 'gray'}>{e.type}</Badge>}
        actions={e.name === 'Mallesh Kurma' && !ctx.s.approvals['apr-leave'] ? <Button variant="primary" icon={<UserCheck size={14} />} onClick={() => runApproval(ctx, 'apr-leave')}>Approve leave</Button> : undefined} />
      <div className="grid grid-cols-3 gap-3">
        <Card title="Details" className="col-span-2"><Fields cols={3}><Field label="Reports to">{e.manager}</Field><Field label="Shift">{e.shift}</Field><Field label="Site">{e.site}</Field><Field label="Joined">{fmtDate(e.joined)}</Field><Field label="PF">{e.pf ? 'Member' : 'Not applicable'}</Field><Field label="ESI">{e.esi ? 'Covered' : 'Not applicable'}</Field>{e.contractor && <Field label="Contractor">{e.contractor}</Field>}<Field label="Leave">{e.leave}</Field></Fields></Card>
        <Card title="Today"><div className="space-y-2 text-[13px]"><div className="flex justify-between"><span className="text-slate-500">Status</span><Status>{e.status}</Status></div><div className="flex justify-between"><span className="text-slate-500">Check-in</span><span>{e.checkIn}</span></div><div className="flex justify-between"><span className="text-slate-500">Source</span><span className="flex items-center gap-1"><Fingerprint size={12} /> Gate 1</span></div>{e.exception && <div className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">{e.exception}</div>}</div></Card>
      </div>
      <Card title="Attendance · last 6 working days" actions={<CalendarClock size={15} className="text-slate-400" />}>
        <div className="grid grid-cols-6 gap-2">{week.map((d, i) => { const st = i === 5 ? e.status : i === 4 && e.name === 'Syed Rafi' ? 'Missed check-out' : 'Present'; return <div key={d} className="rounded-lg border border-slate-200 p-2 text-center"><div className="text-2xs text-slate-400">{d}</div><div className="mt-1"><Status>{st}</Status></div></div>; })}</div>
      </Card>
    </div>
  );
}
