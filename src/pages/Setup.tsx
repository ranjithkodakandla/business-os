import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Building2, Upload, MessageCircle, Users, Bot, Clock } from 'lucide-react';
import { useStore } from '../lib/store';
import { company } from '../lib/data';
import { PageHeader, Card, Button, Badge, cx } from '../components/ui';

const STEPS = [
  { t: 'Your business', m: '1 min', icon: Building2, body: 'Enter your GSTIN and we fill in your name, address, state and filing type.', done: `${company.gstin} → ${company.name}, Jeedimetla, Telangana · monthly GST filer · Udyam ${company.udyam}` },
  { t: 'Bring your data', m: '2 min', icon: Upload, body: 'Connect Tally or drop an Excel sheet. Customers, suppliers, items and opening balances come across.', done: '38 customers · 24 suppliers · 412 items · opening stock and outstanding invoices imported' },
  { t: 'Connect WhatsApp', m: '30 sec', icon: MessageCircle, body: 'Scan a QR code with your business number. Nothing is ever sent without your approval.', done: '+91 40 •••• 7721 connected · 3 message templates ready' },
  { t: 'Invite your team', m: '1 min', icon: Users, body: 'Add people by phone number. Each person sees only what their role needs.', done: 'Karthik (Sales), Harish (Purchase), Lokesh (Production), Bhargavi (Accounts) invited' },
  { t: 'Turn on agents', m: '30 sec', icon: Bot, body: 'Pick which background agents to switch on. They start in "Prepare for approval" mode.', done: '8 agents on · auto-limit ₹50,000 · everything else waits for you' },
];
export default function Setup() {
  const { toast } = useStore();
  const nav = useNavigate();
  const [done, setDone] = useState<number>(0);
  const all = done >= STEPS.length;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Quick setup' }]} title="Set up in 5 minutes" subtitle="No consultant or implementation partner. One person can do this on a phone call's worth of time." badge={<Badge tone="blue"><Clock size={11} className="mr-1 inline" />about 5 min</Badge>} />
      <div className="h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-600 transition-all" style={{ width: `${(done / STEPS.length) * 100}%` }} /></div>
      <div className="space-y-2">
        {STEPS.map((st, i) => {
          const isDone = i < done, current = i === done;
          return (
            <Card key={st.t} className={cx(current && 'ring-2 ring-brand-200')}>
              <div className="flex items-start gap-3" data-setup-step={i}>
                <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', isDone ? 'bg-emerald-100 text-emerald-700' : current ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400')}>{isDone ? <Check size={16} /> : <st.icon size={16} />}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-900">{i + 1}. {st.t}<span className="text-2xs font-normal text-slate-400">{st.m}</span></div>
                  <div className="text-[13px] text-slate-600">{isDone ? <span className="text-emerald-700">{st.done}</span> : st.body}</div>
                </div>
                {current && <Button variant="primary" size="sm" data-testid="setup-next" onClick={() => { setDone(i + 1); if (i === STEPS.length - 1) toast('Workspace ready (demo setup)', 'green'); }}>{i === 0 ? 'Fetch from GSTIN' : i === 1 ? 'Connect Tally' : i === 2 ? 'Scan QR' : i === 3 ? 'Send invites' : 'Turn on agents'}</Button>}
              </div>
            </Card>
          );
        })}
      </div>
      {all && <Card><div className="flex items-center justify-between"><div><div className="text-[14px] font-semibold text-slate-900">You're set up.</div><div className="text-[13px] text-slate-600">Ask your first question: "Can we deliver SO-1051 by Friday?"</div></div><div className="flex gap-2"><Button onClick={() => setDone(0)}>Start over</Button><Button variant="primary" onClick={() => nav('/')}>Go to Home</Button></div></div></Card>}
      <div className="text-center text-2xs text-slate-400">Demo walkthrough – every step is simulated. Aarohan Industries is already set up.</div>
    </div>
  );
}
