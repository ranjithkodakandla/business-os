import { useState } from 'react';
import { BellRing, MessageCircle, Mail, Monitor, Lock } from 'lucide-react';
import { useStore } from '../lib/store';
import { can, roleOf } from '../lib/rbac';
import { PageHeader, Card, Badge, Segmented, Callout, cx } from '../components/ui';
import { ALERTS, useAlerts, updateAlerts, prefOf, type Chan, type Freq, type Scope, type Pref } from './data';

const CH: [Chan, string, React.ElementType][] = [['inapp', 'In-app', Monitor], ['wa', 'WhatsApp', MessageCircle], ['email', 'Email', Mail]];
const FREQ: Freq[] = ['Instant', 'Hourly digest', 'Daily digest', 'Weekly'];
/** Scope allowed by RBAC: Owner can watch everything; module owners can see their team; others only their own items. */
export const scopesFor = (role: string, edit: boolean): Scope[] => role === 'Owner' ? ['Own', 'Team', 'All'] : edit ? ['Own', 'Team'] : ['Own'];

export default function AlertsPage() {
  const { s, toast } = useStore(); const st = useAlerts(); const role = roleOf(s);
  const [g, setG] = useState('All');
  const list = ALERTS.filter((a) => a.module === 'home' || can(s, a.module, 'view'));
  const hidden = ALERTS.length - list.length;
  const groups = ['All', ...Array.from(new Set(list.map((a) => a.group)))];
  const shown = g === 'All' ? list : list.filter((a) => a.group === g);
  const set = (id: string, p: Pref) => updateAlerts((x) => ({ ...x, prefs: { ...x.prefs, [role]: { ...(x.prefs[role] || {}), [id]: p } } }));
  const on = list.filter((a) => prefOf(st, role, a).on).length;
  return (<div className="space-y-4" data-testid="alerts-page">
    <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Alerts & preferences' }]} title="Alerts & preferences" subtitle={`Choose what you hear about, where, how often and for whose work. ${on} of ${list.length} alerts on for ${role}.`}
      badge={<Badge tone="violet">Sends simulated</Badge>} actions={<Segmented value={g} onChange={setG} options={groups.map((x) => ({ value: x, label: x }))} />} />
    {hidden > 0 && <Callout tone="gray" icon={<Lock size={15} />} title={`${hidden} alert types hidden`}>They belong to modules outside the {role} role. Scope is limited by your access: {scopesFor(role, true).join(' / ')}.</Callout>}
    <Card pad={false}>
      <div className="divide-y divide-slate-100">{shown.map((a) => { const p = prefOf(st, role, a); const scopes = scopesFor(role, can(s, a.module, 'edit') || a.module === 'home');
        return <div key={a.id} data-alert={a.id} className={cx('flex flex-wrap items-center gap-3 px-4 py-3', !p.on && 'opacity-60')}>
          <button aria-label={`toggle ${a.name}`} data-alert-on={a.id} onClick={() => set(a.id, { ...p, on: !p.on })} className={cx('relative h-6 w-11 shrink-0 rounded-full', p.on ? 'bg-emerald-500' : 'bg-slate-300')}><span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', p.on ? 'left-[22px]' : 'left-0.5')} /></button>
          <div className="min-w-0 flex-1 basis-48"><div className="flex items-center gap-2 text-[13.5px] font-medium text-slate-900"><BellRing size={13} className="text-slate-400" />{a.name}<Badge tone="gray">{a.group}</Badge></div><div className="text-2xs text-slate-500">{a.desc}</div></div>
          <div className="flex gap-1">{CH.map(([c, l, I]) => { const act = p.ch.includes(c); return <button key={c} data-ch={`${a.id}:${c}`} title={l} disabled={!p.on} onClick={() => set(a.id, { ...p, ch: act ? p.ch.filter((x) => x !== c) : [...p.ch, c] })} className={cx('flex h-8 items-center gap-1 rounded-lg border px-2 text-2xs font-medium', act ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-400')}><I size={13} /><span className="hidden sm:inline">{l}</span></button>; })}</div>
          <select aria-label="frequency" data-freq={a.id} disabled={!p.on} value={p.freq} onChange={(e) => set(a.id, { ...p, freq: e.target.value as Freq })} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-2xs">{FREQ.map((f) => <option key={f}>{f}</option>)}</select>
          <select aria-label="scope" data-scope={a.id} disabled={!p.on} value={scopes.includes(p.scope) ? p.scope : 'Own'} onChange={(e) => set(a.id, { ...p, scope: e.target.value as Scope })} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-2xs">{scopes.map((x) => <option key={x} value={x}>{x === 'Own' ? 'Mine' : x === 'Team' ? 'My team' : 'Everyone'}</option>)}</select>
        </div>; })}</div>
    </Card>
    <div className="flex flex-wrap gap-2"><button className="text-[13px] font-medium text-brand-700" onClick={() => toast('Test alert shown in-app (WhatsApp/email simulated – nothing sent)')} data-testid="test-alert">Send me a test alert</button><span className="text-2xs text-slate-400">Quiet hours 21:00–08:00 except Instant critical alerts.</span></div>
  </div>);
}
