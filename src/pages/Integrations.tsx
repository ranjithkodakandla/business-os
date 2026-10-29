import { useState } from 'react';
import { RefreshCw, BookOpen, MessageCircle, Landmark, Fingerprint, Mail, FileCheck2, Sheet } from 'lucide-react';
import { useStore } from '../lib/store';
import { PageHeader, Card, Button, Badge, Modal, Fields, Field, Callout } from '../components/ui';

const APPS = [
  { id: 'tally', name: 'Tally', icon: BookOpen, what: 'Sales, purchase and receipt vouchers both ways. Ledgers matched by GSTIN.', status: 'Connected', detail: 'Tally company "Aarohan Industries 2026-27" · last sync 02:00 · 124 vouchers' },
  { id: 'wa', name: 'WhatsApp Business', icon: MessageCircle, what: 'Customer, supplier and job-worker messages. Every message is a draft until you approve.', status: 'Connected', detail: '+91 40 •••• 7721 · approved templates: reminder, PO, dispatch' },
  { id: 'gst', name: 'GST portal & e-way bill (via GSP)', icon: FileCheck2, what: 'Prepare GSTR-1 data and e-way bill JSON. You file and generate on the portal.', status: 'Connected', detail: 'GSTIN 36AAMCA4821K1Z6 · read-only + JSON prepare' },
  { id: 'bank', name: 'HDFC Bank statement feed', icon: Landmark, what: 'Read-only statement import for matching receipts. No payments are initiated.', status: 'Connected', detail: 'Current account ••4821 · daily import' },
  { id: 'bio', name: 'Biometric attendance device', icon: Fingerprint, what: 'Punches from the Gate 1 device every 30 minutes.', status: 'Connected', detail: 'Gate 1 · 45 enrolled · last sync 09:12' },
  { id: 'mail', name: 'Email (Google Workspace)', icon: Mail, what: 'Send POs and invoices as PDF from your own address – after approval.', status: 'Connected', detail: 'accounts@aarohan.example' },
  { id: 'xl', name: 'Excel / Google Sheets import', icon: Sheet, what: 'One-time import of customers, items and opening stock.', status: 'Available', detail: 'Template: 4 sheets' },
];
export default function Integrations() {
  const { toast } = useStore();
  const [sel, setSel] = useState<(typeof APPS)[number] | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const sync = (id: string, name: string) => { setSyncing(id); setTimeout(() => { setSyncing(null); toast(`${name}: test sync OK (simulated)`, 'green'); }, 1400); };
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Connected apps' }]} title="Connected apps" subtitle="Keep using Tally and WhatsApp. This workspace sits on top of them." />
      <Callout tone="amber" title="Demo connections">All connections on this screen are simulated. No real Tally, WhatsApp, GST portal, bank or device is connected, and no data leaves your browser.</Callout>
      <div className="grid grid-cols-2 gap-3">
        {APPS.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start gap-3" data-app={a.id}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700"><a.icon size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-900">{a.name}<Badge tone={a.status === 'Connected' ? 'green' : 'gray'} dot>{a.status === 'Connected' ? 'Connected · simulated' : 'Available'}</Badge></div>
                <div className="mt-0.5 text-[13px] text-slate-600">{a.what}</div>
                <div className="mt-1 text-2xs text-slate-400">{a.detail}</div>
                <div className="mt-2 flex gap-2">
                  {a.status === 'Connected' ? <Button size="sm" icon={<RefreshCw size={12} className={syncing === a.id ? 'animate-spin' : ''} />} disabled={syncing === a.id} onClick={() => sync(a.id, a.name)}>{syncing === a.id ? 'Testing…' : 'Test sync'}</Button> : <Button size="sm" variant="primary" onClick={() => toast('Import template downloaded (demo)')}>Get template</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setSel(a)}>Settings</Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)} title={`${sel?.name} · settings`} footer={<Button variant="primary" onClick={() => setSel(null)}>Done</Button>}>
        {sel && <Fields cols={2}><Field label="Status">{sel.status} (simulated)</Field><Field label="Account">{sel.detail}</Field><Field label="Direction">{sel.id === 'bank' || sel.id === 'bio' ? 'Read-only' : 'Two-way, approval required'}</Field><Field label="Who can change">Riya Reddy (owner)</Field></Fields>}
      </Modal>
    </div>
  );
}
