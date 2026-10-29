import { useState } from 'react';
import { History, Bot, User, ArrowRight } from 'lucide-react';
import { Card, Kpi, Badge, Select, SearchBox, cx } from '../../components/ui';
import { useStore } from '../../lib/store';
import { MODULES } from '../../lib/nav';
import { ModHead, Grid } from './kit';

export default function Audit() {
  const { s } = useStore();
  const [m, setM] = useState('All modules'); const [who, setWho] = useState('Everyone'); const [q, setQ] = useState('');
  const mods = ['All modules', ...new Set(s.audit.map((a) => a.module))];
  const rows = s.audit.filter((a) => (m === 'All modules' || a.module === m) && (who === 'Everyone' || (who === 'AI agent' ? a.agent : !a.agent)) && (a.action + a.record + a.who).toLowerCase().includes(q.toLowerCase()));
  const label = (k: string) => MODULES.find((x) => x.key === k)?.label.en || k;
  return (
    <div data-testid="page-audit">
      <ModHead k="audit" subtitle="Every change in Business OS – by people and by the AI agent on their behalf – with before / after" />
      <Grid cols={3}>
        <Kpi label="Changes logged" value={s.audit.length} icon={<History size={15} />} />
        <Kpi label="By AI agent" value={s.audit.filter((a) => a.agent).length} icon={<Bot size={15} />} sub="always on behalf of a person" />
        <Kpi label="Modules touched" value={new Set(s.audit.map((a) => a.module)).size} icon={<User size={15} />} />
      </Grid>
      <Card pad={false} title="Activity" actions={<><SearchBox value={q} onChange={setQ} placeholder="Record, action, person…" /><Select value={m} onChange={setM} options={mods} /><Select value={who} onChange={setWho} options={['Everyone', 'People', 'AI agent']} /></>}>
        <ol data-testid="audit-list">
          {rows.map((a) => (
            <li key={a.id} className="flex gap-3 border-t border-slate-100 px-5 py-3">
              <span className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', a.agent ? 'bg-grad text-white' : 'bg-slate-100 text-slate-500')}>{a.agent ? <Bot size={15} /> : <User size={15} />}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-slate-800"><b>{a.action}</b>{a.record && <span className="text-slate-500"> · {a.record}</span>}</div>
                <div className="text-2xs text-slate-500">{a.who} ({a.role}) · {a.at} · <Badge tone="blue">{label(a.module)}</Badge></div>
                {(a.before || a.after) && <div className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs"><span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 line-through">{a.before || '—'}</span><ArrowRight size={12} className="text-slate-400" /><span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{a.after || '—'}</span></div>}
              </div>
            </li>
          ))}
          {!rows.length && <li className="px-5 py-8 text-center text-[13px] text-slate-400">No changes match.</li>}
        </ol>
      </Card>
    </div>
  );
}
