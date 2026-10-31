/** One-tap agent proposals. Every send is simulated – nothing leaves the demo. */
import type { useStore } from '../lib/store';
import { fx, RENEWALS, docById, TENDERS, GROUPS, ORDERS, draftUpdate, groupTotal, groupState, inr, tenderView } from './data';
type Ctx = ReturnType<typeof useStore>;
const audit = (ctx: Ctx, module: string, text: string, record?: string) => ctx.update(() => {}, text, { module, record, agent: true });

let poSeq = 1180;
export function approveRenewal(ctx: Ctx, id: string) {
  const r = RENEWALS.find((x) => x.id === id); if (!r) return;
  fx.set((d) => { d.renewals[id] = 'Filed – awaiting authority'; });
  audit(ctx, 'compliance', `Approved renewal ${id} – ${docById(r.docId)!.name} filed with ${r.authority} (simulated)`, id);
  ctx.toast(`${docById(r.docId)!.name}: renewal approved and filed (simulated). Reminder set to chase in 7 days.`, 'green');
}
export function preparePack(ctx: Ctx, id: string) {
  const r = RENEWALS.find((x) => x.id === id); if (!r) return;
  fx.set((d) => { d.renewals[id] = 'Pack ready – needs your OK'; });
  audit(ctx, 'compliance', `Renewals agent drafted the renewal pack for ${docById(r.docId)!.name} from the document library`, id);
  ctx.toast(`Renewal pack drafted for ${docById(r.docId)!.name} – ${r.checklist.length} documents pulled from your library. Tap "Approve & file" when you are happy.`, 'blue');
}
export function approvePack(ctx: Ctx, id: string) {
  const t = TENDERS.find((x) => x.id === id); if (!t) return;
  const v = tenderView(fx.get(), t);
  if (v.open.length) { ctx.toast(`${v.open.length} question${v.open.length > 1 ? 's' : ''} still need your answer before the pack can be approved`, 'amber'); return; }
  fx.set((d) => { d.packs[id] = 'approved'; });
  audit(ctx, 'tenders', `Approved tender pack ${id} (${t.name}) – ${t.items.length} items`, id);
  ctx.toast(`Tender pack ${id} approved – ready to upload on the portal`, 'green');
}
export function approvePO(ctx: Ctx, gid: string) {
  const g0 = GROUPS.find((x) => x.id === gid); if (!g0) return;
  const g = groupState(fx.get(), g0); if (g.po) return;
  const q = g.quotes[g.pick]; const po = q.supplier.startsWith('Site') ? `STN-${++poSeq}` : `PO-${++poSeq}`;
  fx.set((d) => { d.groups[gid] = { ...d.groups[gid], po }; });
  audit(ctx, 'purchasing', `Approved ${po}: ${g.item} from ${q.supplier} (${inr(groupTotal(g))})`, po);
  ctx.openDraft({ title: `Send ${po} to ${q.supplier}`, channel: 'Email', to: q.supplier, toDetail: 'Simulated – no email leaves this demo', approveLabel: 'Approve & send',
    body: `Dear team,\n\nPlease find our ${po.startsWith('STN') ? 'stock transfer request' : 'purchase order'} ${po}:\n${g.item} – ${g.qty.toLocaleString('en-IN')} ${g.unit}\nTotal: ${inr(groupTotal(g))} + GST\nDelivery: split to ${g.needs.length > 1 ? 'the requesting sites' : 'the requesting site'} as per the attached schedule.\n\nPlease confirm by reply.\n\nRegards,\nPurchase, Shakti Electro-Pack`,
    onApprove: () => { fx.set((d) => { d.groups[gid] = { ...d.groups[gid], po, sent: true }; }); audit(ctx, 'purchasing', `${po} sent to ${q.supplier} (simulated)`, po); ctx.toast(`${po} marked as sent (simulated – nothing left the demo)`, 'green'); } });
}
export function sendUpdate(ctx: Ctx, oid: string) {
  const o = ORDERS.find((x) => x.id === oid); if (!o) return;
  ctx.openDraft({ title: `Status update – ${o.id} to ${o.customer}`, channel: 'Email', to: `${o.contact} · ${o.customer}`, toDetail: `${o.email} · simulated, nothing is sent`, body: draftUpdate(o), approveLabel: 'Approve & send',
    onApprove: () => { fx.set((d) => { d.updates[oid] = new Date().toISOString(); }); audit(ctx, 'customers', `Status update for ${o.id} sent to ${o.contact} (simulated)`, o.id); ctx.toast(`Update for ${o.id} marked as sent (simulated)`, 'green'); } });
}
export function runFx(ctx: Ctx, kind: string) {
  const [, what, id] = kind.split(':');
  if (what === 'renew') return approveRenewal(ctx, id);
  if (what === 'prep') return preparePack(ctx, id);
  if (what === 'renew-all') return RENEWALS.filter((r) => (fx.get().renewals[r.id] || r.status) !== 'Filed – awaiting authority').forEach((r) => approveRenewal(ctx, r.id));
  if (what === 'pack') return approvePack(ctx, id);
  if (what === 'po') return approvePO(ctx, id);
  if (what === 'update') return sendUpdate(ctx, id);
}
