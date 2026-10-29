import { useState } from 'react';
import { Building2, Users, ShieldCheck, GitBranch, Hash, Plug, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Tabs, useTab, DataTable, Badge, Button, Modal, Select, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { company } from '../../lib/data';
import { inr } from '../../lib/format';
import { P0A } from '../../lib/p0actions';
import { MODULES } from '../../lib/nav';
import { ROLES, PERMS, permsFor, type Role, type Perm } from '../../lib/rbac';
import { ModHead, useCan } from './kit';

export default function Settings() {
  const { s, update, toast } = useStore(); const may = useCan('settings');
  const [tab, setTab] = useTab('Permissions');
  const [role, setRole] = useState<Role>('Sales');
  const [inv, setInv] = useState(false);
  const toggle = (k: string, p: Perm) => { const cur = permsFor(s, k, role); const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]; update((d) => P0A.setPerm(d, role, k, p === 'view' && !next.includes('view') ? [] : next), `${role}: ${p} on ${k} ${cur.includes(p) ? 'removed' : 'granted'}`, { module: 'settings', record: `Permissions · ${role} · ${k}`, before: cur.join(', ') || 'none', after: next.join(', ') || 'none' }); };
  return (
    <div data-testid="page-settings">
      <ModHead k="settings" subtitle="Company, units, users, roles & permissions, approval limits, numbering" />
      <Tabs tabs={['Company', 'Units', 'Users', 'Permissions', 'Approval limits', 'Document series', 'Integrations']} value={tab} onChange={setTab} />
      {tab === 'Company' && <Card title={<span className="flex items-center gap-2"><Building2 size={16} />{company.name}</span>}><div className="grid gap-3 sm:grid-cols-3">{[['GSTIN', company.gstin], ['PAN', company.pan], ['CIN', company.cin], ['Udyam', company.udyam], ['Turnover', company.aato], ['Bank', company.bank]].map(([a, b]) => <div key={a} className="rounded-xl bg-slate-50 p-3"><div className="text-2xs text-slate-500">{a}</div><div className="text-[13px] font-medium">{b}</div></div>)}</div><p className="mt-3 text-[13px] text-slate-500">{company.address}</p></Card>}
      {tab === 'Units' && <Card pad={false} title={<span className="flex items-center gap-2"><GitBranch size={16} />Branches & units</span>}><DataTable rows={s.p0.branches} rowKey={(r) => r.name} columns={[{ key: 'n', header: 'Unit', render: (r) => <b>{r.name}</b> }, { key: 'g', header: 'GSTIN', render: (r) => <span className="font-mono text-[12px]">{r.gstin}</span> }, { key: 'a', header: 'Address', render: (r) => r.addr }, { key: 'h', header: 'Head', render: (r) => r.head }]} /></Card>}
      {tab === 'Users' && <Card pad={false} title={<span className="flex items-center gap-2"><Users size={16} />Users</span>} actions={may('create') && <Button size="sm" variant="primary" data-testid="invite-user" onClick={() => setInv(true)}>Invite user</Button>}>
        <DataTable rows={s.p0.users} rowKey={(r) => r.id} columns={[{ key: 'n', header: 'Name', render: (r) => <b>{r.name}</b> }, { key: 'e', header: 'Email', render: (r) => r.email }, { key: 'r', header: 'Role', render: (r) => <Badge tone="violet">{r.role}</Badge> }, { key: 'u', header: 'Unit', render: (r) => r.unit }, { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'Active' ? 'green' : 'amber'} dot>{r.status}</Badge> }]} /></Card>}
      {tab === 'Permissions' && <Card pad={false} title={<span className="flex items-center gap-2"><ShieldCheck size={16} />Permissions matrix</span>} subtitle="Changes apply instantly to nav, Home, search and the AI" actions={<div className="flex gap-1">{ROLES.map((r) => <button key={r} data-perm-role={r} onClick={() => setRole(r)} className={cx('rounded-lg px-2.5 py-1 text-[12px] font-medium', role === r ? 'bg-grad text-white shadow-glow' : 'bg-slate-100 text-slate-600')}>{r}</button>)}</div>}>
        <div className="overflow-x-auto"><table className="w-full text-[13px]" data-testid="perm-matrix"><thead><tr className="text-2xs uppercase tracking-wide text-slate-500"><th className="px-5 py-2 text-left">Module</th>{PERMS.map((p) => <th key={p} className="px-2">{p}</th>)}</tr></thead><tbody>
          {MODULES.map((m) => { const ps = permsFor(s, m.key, role); return <tr key={m.key} className="border-t border-slate-100"><td className="px-5 py-2"><span className="flex items-center gap-2"><m.icon size={14} className="text-slate-400" />{m.label.en}<span className="text-2xs text-slate-400">{m.group}</span></span></td>
            {PERMS.map((p) => <td key={p} className="text-center"><button disabled={role === 'Owner' || !may('edit')} data-cell={`${m.key}:${p}`} onClick={() => toggle(m.key, p)} className={cx('grid h-6 w-6 place-items-center rounded-md border transition mx-auto', ps.includes(p) ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-brand-300', role === 'Owner' && 'opacity-60')}><Check size={13} /></button></td>)}</tr>; })}
        </tbody></table></div></Card>}
      {tab === 'Approval limits' && <Card pad={false} title="Approval hierarchy" subtitle="Amount bands decide who approves"><DataTable rows={s.p0.bands} rowKey={(r) => r.id} columns={[{ key: 'd', header: 'Document', render: (r) => <b>{r.doc}</b> }, { key: 'b', header: 'Amount band', render: (r) => `${inr(r.min)} – ${r.max === null ? 'and above' : inr(r.max)}` }, { key: 'a', header: 'Approver', render: (r) => <Badge tone="violet">{r.approver}</Badge> }]} /></Card>}
      {tab === 'Document series' && <Card pad={false} title={<span className="flex items-center gap-2"><Hash size={16} />Numbering</span>}><DataTable rows={s.p0.series} rowKey={(r) => r.doc} columns={[{ key: 'd', header: 'Document', render: (r) => r.doc }, { key: 'p', header: 'Prefix', render: (r) => <span className="font-mono">{r.prefix}</span> }, { key: 'n', header: 'Next number', render: (r) => <span className="font-mono">{r.prefix}{r.next}</span> }]} /></Card>}
      {tab === 'Integrations' && <Card title={<span className="flex items-center gap-2"><Plug size={16} />Integrations</span>}><p className="text-[13px] text-slate-600">Tally, WhatsApp Business, Gmail, GST portal (GSP) and bank feeds are managed in <Link className="text-brand-700 underline" to="/integrations">Connected apps</Link>.</p></Card>}
      <InviteModal open={inv} onClose={() => setInv(false)} onDone={() => toast('Invite recorded (demo – no email sent)', 'blue')} />
    </div>
  );
}
function InviteModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { update } = useStore();
  const [n, setN] = useState(''); const [r, setR] = useState<string>('Stores'); const [u, setU] = useState(company.units[1]);
  return <Modal open={open} onClose={onClose} title="Invite user" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!n.trim()} onClick={() => { update((d) => { P0A.inviteUser(d, n.trim(), r as Role, u); }, `${n} invited as ${r} at ${u}`, { module: 'settings', record: n, after: `${r} · ${u}` }); onDone(); onClose(); }}>Send invite</Button></>}>
    <div className="grid gap-3"><input value={n} onChange={(e) => setN(e.target.value)} placeholder="Full name" className="rounded-lg border px-3 py-2 text-[13px]" /><Select label="Role" value={r} onChange={setR} options={ROLES} /><Select label="Unit" value={u} onChange={setU} options={company.units} /></div>
  </Modal>;
}
