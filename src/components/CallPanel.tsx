import { useEffect, useState } from 'react';
import { PhoneCall, PhoneOff, Lightbulb, ListChecks, FlaskConical } from 'lucide-react';
import { Modal, Button, cx } from './ui';

export type CallSpec = { name: string; org: string; phone: string; language: string; context: string; points: string[]; tips: string[]; tipsTitle?: string };
export default function CallPanel({ spec, onClose, onEnd }: { spec: CallSpec | null; onClose: () => void; onEnd: (notes: string) => void }) {
  const [state, setState] = useState<'dialling' | 'connected'>('dialling');
  const [sec, setSec] = useState(0);
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState<Record<number, boolean>>({});
  useEffect(() => {
    if (!spec) return;
    setState('dialling'); setSec(0); setNotes(''); setDone({});
    const a = setTimeout(() => setState('connected'), 1700);
    return () => clearTimeout(a);
  }, [spec]);
  useEffect(() => {
    if (!spec || state !== 'connected') return;
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [spec, state]);
  if (!spec) return null;
  const mm = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  return (
    <Modal open={!!spec} onClose={onClose} width="max-w-2xl" title={`Call ${spec.name} · ${spec.org}`} subtitle={spec.context}
      footer={<><span className="mr-auto flex items-center gap-1 text-2xs text-amber-700"><FlaskConical size={12} /> Simulated call – this demo does not place a real phone call</span>
        <Button variant="danger" data-testid="end-call" icon={<PhoneOff size={14} />} onClick={() => onEnd(notes)}>End call & save notes</Button></>}>
      <div data-testid="call-panel" data-call-state={state} className="space-y-3">
        <div className={cx('flex items-center gap-3 rounded-lg px-3 py-2.5', state === 'connected' ? 'bg-emerald-50' : 'bg-slate-50')}>
          <div className={cx('flex h-10 w-10 items-center justify-center rounded-full text-white', state === 'connected' ? 'bg-emerald-600' : 'bg-slate-400 animate-pulse')}><PhoneCall size={18} /></div>
          <div className="flex-1"><div className="text-[13.5px] font-semibold text-slate-900">{state === 'dialling' ? `Dialling ${spec.phone}…` : `Connected · ${mm}`}</div><div className="text-2xs text-slate-500">{spec.name} · prefers {spec.language} · call sheet ready</div></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase text-slate-500"><ListChecks size={13} /> Talking points</div>
            <ul className="space-y-1.5">{spec.points.map((p, i) => (
              <li key={i}><label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-slate-700"><input type="checkbox" className="mt-0.5" checked={!!done[i]} onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))} /><span className={done[i] ? 'text-slate-400 line-through' : ''}>{p}</span></label></li>
            ))}</ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase text-amber-700"><Lightbulb size={13} /> {spec.tipsTitle || 'Negotiation tips'}</div>
            <ul className="list-disc space-y-1.5 pl-4 text-[12.5px] text-slate-700">{spec.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        </div>
        <textarea data-testid="call-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes from the call (saved to the record)" className="h-16 w-full rounded-md border border-slate-200 px-2.5 py-2 text-[13px] outline-none focus:border-brand-400" />
      </div>
    </Modal>
  );
}
