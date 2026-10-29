import type { useStore } from './store';
import { DRAFTS, recommendation, RECOMMENDED, evalQuote, supplierById } from './domain';
import * as D from './data';
import { inr, lakh, fmtShort } from './format';
import { OPTIONS, OUTREACH_MS, contactOf, channelLabel, finishSourcing, poDraftLines, poDraftTotal, REQ } from './sourcing';
import { SPRINT, SPRINT_MS, finishSprint, RECEIVED } from './sprint';
import React from 'react';

type Ctx = ReturnType<typeof useStore>;

export function approvePR208(ctx: Ctx, quoteId?: string) {
  const qid = quoteId || ctx.s.selectedQuote || RECOMMENDED;
  const q = D.quotes.find((x) => x.id === qid)!;
  const ev = evalQuote(q);
  ctx.update((d) => {
    d.selectedQuote = qid;
    d.pr208Approved = true;
    const pr = d.prs.find((p) => p.id === 'PR-208')!;
    pr.status = 'Approved – PO-0921 raised';
    pr.po = 'PO-0921';
    if (!d.pos.find((p) => p.id === 'PO-0921'))
      d.pos.unshift({ id: 'PO-0921', supplierId: q.supplierId, pr: 'PR-208', material: 'Component A-17 · cast aluminium housing', qty: 65, value: ev.total, date: '2026-10-28', eta: ev.arrival, status: 'Approved – not yet sent', confirmed: false });
    const k = d.skus.find((x) => x.sku === 'RM-A17')!;
    k.incoming = 65; k.incomingEta = ev.arrival; k.incomingRef = 'PO-0921';
    const o = d.orders.find((x) => x.id === 'SO-1051')!;
    o.material = 'Partial'; o.risk = 'Watch'; o.status = 'In production';
    o.riskNote = `Shortfall covered by PO-0921 (${ev.sup.name}, arrives ${ev.arrival === '2026-10-30' ? 'Fri 30 Oct' : ev.arrival}). Split delivery proposed – awaiting customer confirmation.`;
    const w1 = d.workOrders.find((w) => w.id === 'WO-3321')!;
    w1.status = 'On track'; w1.planned = 0; w1.dependency = '35 from stock now · 65 via PO-0921';
    w1.note = 'Lot 1: 35 pcs machining today. Lot 2: 65 pcs Sat 31 Oct after PO-0921 arrives.';
    w1.finish = '2026-10-31';
    const w2 = d.workOrders.find((w) => w.id === 'WO-3322')!; w2.note = 'Lot 1 Thu 29 Oct · Lot 2 Sat 31 Oct'; w2.finish = '2026-10-31';
    const w3 = d.workOrders.find((w) => w.id === 'WO-3323')!; w3.note = 'Lot 1 coating Thu 29 Oct (same-day) · Lot 2 Mon 2 Nov'; w3.finish = '2026-11-02';
    const w4 = d.workOrders.find((w) => w.id === 'WO-3324')!; w4.note = 'Dispatch 1: 35 pcs Fri 30 Oct · Dispatch 2: 65 pcs Tue 3 Nov'; w4.finish = '2026-11-03';
    d.approvals['apr-pr208'] = 'approved';
  }, `Approved PR-208 → PO-0921 to ${ev.sup.name} (${inr(ev.total)} incl. GST)`);
  ctx.toast(`PR-208 approved. PO-0921 raised for ${ev.sup.name} – not sent yet`, 'green');
}

export function sendPO(ctx: Ctx) {
  ctx.openDraft({
    title: 'Send PO-0921 to Prime Components', channel: 'WhatsApp', to: 'Sudheer Reddy · Prime Components', toDetail: '+91 99•••• 5208 · PDF attached: PO-0921.pdf',
    body: DRAFTS.po0921, approveLabel: 'Approve & send',
    onApprove: () => {
      ctx.update((d) => { d.po0921Sent = true; const p = d.pos.find((x) => x.id === 'PO-0921'); if (p) p.status = 'Sent – awaiting confirmation'; d.approvals['apr-po-send'] = 'approved'; }, 'PO-0921 sent to Prime Components on WhatsApp (simulated)');
      ctx.toast('PO-0921 marked as sent (simulated – no message left this demo)', 'green');
    },
  });
}

export function confirmSplit(ctx: Ctx) {
  ctx.openDraft({
    title: 'Customer commitment – split delivery for SO-1051', channel: 'WhatsApp', to: 'Srinivas Rao · Sri Lakshmi Projects', toDetail: '+91 98•••• 4412',
    body: DRAFTS.split, approveLabel: 'Approve & send',
    note: 'Sending this commits to 35 units on Fri 30 Oct and 65 units on Tue 3 Nov.',
    onApprove: () => {
      ctx.update((d) => {
        d.splitConfirmed = true; d.approvals['apr-split'] = 'approved';
        const o = d.orders.find((x) => x.id === 'SO-1051')!;
        o.risk = 'On track'; o.dispatch = 'Scheduled';
        o.riskNote = 'Split delivery proposed to customer: 35 pcs Fri 30 Oct, 65 pcs Tue 3 Nov (PO-0921).';
      }, 'Split delivery proposal sent to Sri Lakshmi Projects (simulated)');
      ctx.toast('Split-delivery message marked as sent (simulated)', 'green');
    },
  });
}

export function supplierFollowUp(ctx: Ctx) {
  ctx.openDraft({
    title: 'Supplier follow-up – Prime Components', channel: 'WhatsApp', to: 'Sudheer Reddy · Prime Components', toDetail: '+91 99•••• 5208',
    body: DRAFTS.supplierFollowUp(ctx.s.pr208Approved), approveLabel: 'Approve & send',
    note: 'Nothing is sent until you approve.',
    onApprove: () => { ctx.update((d) => { d.supplierFollowUp = true; }, 'Supplier follow-up sent to Prime Components (simulated)'); ctx.toast('Follow-up marked as sent (simulated)', 'green'); },
  });
}

export function reminder1048(ctx: Ctx) {
  ctx.openDraft({
    title: 'Payment reminder – INV-1048', channel: 'WhatsApp', to: 'Srinivas Rao · Sri Lakshmi Projects', toDetail: '+91 98•••• 4412 · invoice PDF attached',
    body: DRAFTS.reminder1048, approveLabel: 'Approve & send',
    onApprove: () => {
      ctx.update((d) => {
        d.approvals['apr-rem1048'] = 'approved';
        const inv = d.invoices.find((i) => i.id === 'INV-1048')!;
        inv.history.unshift({ date: '2026-10-28', text: 'WhatsApp reminder sent by Riya Reddy (approved from Business Workspace)', mode: 'WhatsApp' });
      }, 'Payment reminder for INV-1048 sent on WhatsApp (simulated)');
      ctx.toast('Reminder marked as sent (simulated)', 'green');
    },
  });
}

export function chaseJobWorker(ctx: Ctx) {
  ctx.openDraft({
    title: 'Job worker follow-up – Bharat Zinc Plating', channel: 'WhatsApp', to: 'Mohd. Ayub · Bharat Zinc Plating', toDetail: '+91 90•••• 4471',
    body: DRAFTS.jw0709, approveLabel: 'Approve & send',
    onApprove: () => { ctx.update((d) => { d.approvals['apr-jw0709'] = 'approved'; }, 'Follow-up sent to Bharat Zinc Plating for DC-JW-0709 (simulated)'); ctx.toast('Follow-up marked as sent (simulated)', 'green'); },
  });
}

export function payBill551(ctx: Ctx) {
  const b = ctx.s.bills.find((x) => x.id === 'PB-0551')!;
  ctx.openConfirm({
    title: 'Approve payment – Sri Venkata Steels',
    body: `Adds ${inr(b.amount)} to the NEFT batch for Fri 30 Oct (HDFC ••4821). Meets the MSMED 45-day limit, so the expense stays deductible under Sec 43B(h). Demo only – no bank instruction is sent.`,
    confirmLabel: 'Approve payment',
    onConfirm: () => {
      ctx.update((d) => { d.approvals['apr-pay551'] = 'approved'; const bb = d.bills.find((x) => x.id === 'PB-0551')!; bb.scheduled = 'NEFT batch · Fri 30 Oct'; }, 'Approved payment PB-0551 to Sri Venkata Steels for NEFT batch (simulated)');
      ctx.toast('Payment approved and added to Friday’s NEFT batch (simulated)', 'green');
    },
  });
}

export function runApproval(ctx: Ctx, id: string) {
  switch (id) {
    case 'apr-pr208': {
      const r = recommendation();
      ctx.openConfirm({
        title: 'Approve PR-208 with recommended quote',
        body: `${r.rec.sup.name} · 65 × ₹4,910 + ₹4,500 freight + GST = ${inr(r.rec.total)}. Arrives Fri 30 Oct, Net 30. This raises PO-0921 – you can still review before it is sent.`,
        confirmLabel: 'Approve purchase', onConfirm: () => approvePR208(ctx, RECOMMENDED),
      });
      return;
    }
    case 'apr-po-send': return sendPO(ctx);
    case 'apr-followup': return supplierFollowUp(ctx);
    case 'apr-split': return confirmSplit(ctx);
    case 'apr-pay551': return payBill551(ctx);
    case 'apr-rem1048': return reminder1048(ctx);
    case 'apr-jw0709': return chaseJobWorker(ctx);
    case 'apr-disc302':
      ctx.update((d) => { d.approvals['apr-disc302'] = 'approved'; const o = d.opportunities.find((x) => x.id === 'OP-302')!; o.activity.unshift({ date: '2026-10-28', who: 'Riya Reddy', text: '3% discount approved (₹16,200). Sneha to share revised quote.', channel: 'Approval' }); }, 'Approved 3% discount for Aarav Interiors (OP-302)');
      ctx.toast('Discount approved – Sneha Iyer notified (simulated)');
      return;
    case 'apr-src-po': return approveSourcingPO(ctx);
    case 'apr-disc1051':
      ctx.update((d) => { d.approvals['apr-disc1051'] = 'approved'; }, 'Approved 1% early-payment discount for Greenfield Builders until Fri 11 am (₹1,620)');
      ctx.toast('Discount extension approved – reply to Mahesh Goud marked as sent (simulated)');
      return;
    case 'apr-dispute1050': return disputeReply(ctx);
    case 'apr-stmt1054': return statementReply(ctx);
    case 'apr-leave':
      ctx.update((d) => { d.approvals['apr-leave'] = 'approved'; const e = d.employees.find((x) => x.name === 'Mallesh Kurma')!; e.leave = 'Sick leave – approved'; e.exception = undefined; }, 'Approved sick leave for Mallesh Kurma');
      ctx.toast('Leave approved');
      return;
  }
}
export const declineApproval = (ctx: Ctx, id: string) => {
  ctx.update((d) => { d.approvals[id] = 'declined'; }, `Declined approval ${id.replace('apr-', '')}`);
  ctx.toast('Marked as declined', 'amber');
};
export { supplierById };

// ---- Agent hand-offs (simulated background work) ----
export const HANDOFFS: Record<string, (ctx: Ctx) => { agent: string; text: string; result: string; to?: string; ms?: number; effect?: (d: import('./store').DemoState) => void }> = {
  'handoff-followup': () => ({
    agent: 'Procurement agent', text: 'Checking Prime Components’ Friday slot and preparing a follow-up', ms: 4200,
    result: 'Follow-up drafted for Prime Components – waiting in Approvals', to: '/approvals',
    effect: (d) => { d.followUpPrepared = true; },
  }),
  'handoff-po0912': () => ({
    agent: 'Procurement agent', text: 'Chasing Sri Venkata Steels on PO-0912 (40 × MS plate 5 mm)', ms: 4000,
    result: 'Sri Venkata Steels confirmed PO-0912 dispatch for Fri 30 Oct, 9 am', to: '/procurement?tab=Purchase%20orders',
    effect: (d) => {
      const p = d.pos.find((x) => x.id === 'PO-0912'); if (p) { p.confirmed = true; p.status = 'Confirmed – arrives Fri 30 Oct'; p.eta = '2026-10-30'; }
      const o = d.orders.find((x) => x.id === 'SO-1049'); if (o) { o.risk = 'Watch'; o.riskNote = 'PO-0912 confirmed for Fri 30 Oct – 12 plates to cut Fri evening, deliver Sat.'; }
      d.log.unshift({ at: '—', text: 'Procurement agent: Sri Venkata Steels confirmed PO-0912 for Fri 30 Oct', who: 'Agent' });
    },
  }),
  'handoff-requote': () => ({
    agent: 'Procurement agent', text: 'Asking Deccan Castings whether they can deliver by Friday', ms: 4000,
    result: 'Deccan Castings can do Saturday at best – Prime Components is still the only Friday option', to: '/procurement/PR-208?tab=Compare',
    effect: (d) => { d.quoteRefreshed = true; },
  }),
  'handoff-eway': () => ({
    agent: 'Dispatch planner', text: 'Preparing e-way bill data for SO-1044 and SO-1048 (inter-state)', ms: 3800,
    result: 'E-way bill data for 2 loads is ready to upload on the portal', to: '/operations?tab=Dispatch%20plan',
  }),
};

// ---- Use case 1: source it for me (all supplier contact is simulated) ----
export function startSourcing(ctx: Ctx) {
  const s = ctx.s;
  if (s.sourcing.status !== 'idle') return;
  const rows = OPTIONS.map((o) => { const c = contactOf(s, o.contactId); return `${c.supplier} · ${c.person} · ${channelLabel(c.channel)}${c.channel === 'Call' ? ` (${c.language.split(',')[0]})` : ''}`; });
  ctx.openConfirm({
    title: `Send ${rows.length} supplier enquiries?`,
    body: React.createElement('div', { className: 'space-y-2' },
      React.createElement('div', null, 'The Sourcing agent will ask each supplier: do you have it, how many, by when can you ship, and at what price. Each supplier is contacted on their preferred channel.'),
      React.createElement('ul', { className: 'list-disc pl-5 text-[13px]' }, ...rows.map((r) => React.createElement('li', { key: r }, r))),
      React.createElement('div', { className: 'text-xs text-slate-500' }, 'Enquiries only – no price is accepted and no order is placed. Demo: messages and calls are simulated; nothing leaves this app.')),
    confirmLabel: `Approve & send ${rows.length} enquiries`,
    onConfirm: () => {
      const sent: Record<string, import('./sourcing').Channel> = {};
      OPTIONS.forEach((o) => { sent[o.id] = contactOf(s, o.contactId).channel; });
      ctx.update((d) => {
        d.sourcing = { ...d.sourcing, status: 'running', startedAt: Date.now(), sent };
        d.chat.push({ id: Date.now(), role: 'outreach', flow: 'sourcing', text: 'Supplier outreach', at: '' });
      }, `Approved ${rows.length} supplier enquiries for ${REQ.customer} (${REQ.id})`);
      ctx.startTask({ agent: 'Sourcing agent', text: `Contacting ${rows.length} suppliers for 150 × A-17 and 100 × 6204 bearings`, result: `${rows.length} of ${rows.length} suppliers replied – top 3 options ready for review`, to: '/sourcing', ms: OUTREACH_MS, effect: finishSourcing });
    },
  });
}
export function createPoDraft(ctx: Ctx) {
  ctx.update((d) => { d.sourcing.poDraft = true; }, `PO drafts prepared for ${REQ.id} – waiting in Approvals`);
  ctx.toast('PO drafts are in Approvals – nothing is sent or ordered until you approve', 'blue');
}
export function approveSourcingPO(ctx: Ctx) {
  const ls = poDraftLines(ctx.s);
  ctx.openConfirm({
    title: 'Approve PO drafts for the Kaveri order',
    body: `${ls.map((l) => `${l.c.supplier}: ${l.o.reply.qty} × ₹${l.o.reply.price.toLocaleString('en-IN')} + ${inr(l.o.reply.freight)} freight`).join(' · ')}. Total with GST ${inr(poDraftTotal(ctx.s))}. This raises PO-0922 and PO-0923 – they are not sent to the suppliers until you send them.`,
    confirmLabel: 'Approve PO drafts',
    onConfirm: () => ctx.update((d) => {
      d.sourcing.poApproved = true; d.approvals['apr-src-po'] = 'approved';
      ls.forEach((l, i) => {
        const id = `PO-092${2 + i}`;
        if (!d.pos.find((p) => p.id === id)) d.pos.unshift({ id, supplierId: l.c.supplierId, pr: REQ.id, material: l.sku === 'RM-A17' ? 'Component A-17 · cast aluminium housing' : 'Bearing 6204-2RS', qty: l.o.reply.qty, value: Math.round(l.value * 1.18), date: '2026-10-28', eta: l.o.reply.arrives, status: 'Approved – not yet sent', confirmed: false });
      });
    }, `Approved PO-0922 and PO-0923 for ${REQ.customer} – not yet sent to suppliers`),
  });
}
// ---- Use case 2: collections sprint (all customer contact is simulated) ----
export function startSprint(ctx: Ctx, target: number) {
  if (ctx.s.sprint.status !== 'idle') return;
  ctx.openConfirm({
    title: `Approve collections sprint – ${lakh(target)} by ${fmtShort('2026-10-30')}`,
    body: React.createElement('div', { className: 'space-y-2' },
      React.createElement('div', null, 'The Collections agent will contact 6 customers on their preferred channel using your approved templates:'),
      React.createElement('ul', { className: 'list-disc pl-5 text-[13px]' }, ...SPRINT.map((r) => React.createElement('li', { key: r.id }, `${r.customer} · ${r.invoice} ${inr(r.amount)} · ${channelLabel(r.channel)}`))),
      React.createElement('div', { className: 'rounded-md bg-amber-50 px-2 py-1.5 text-[13px] text-amber-800' }, 'Includes a 1% early-payment discount (₹1,620) for Greenfield Builders if paid by Thu 29 Oct.'),
      React.createElement('div', { className: 'text-xs text-slate-500' }, `Demo: messages and calls are simulated. ${RECEIVED.customer} (${RECEIVED.invoice}) was already reminded automatically yesterday.`)),
    confirmLabel: 'Approve plan & contact 6 customers',
    onConfirm: () => {
      ctx.update((d) => {
        d.sprint = { ...d.sprint, status: 'running', startedAt: Date.now(), target };
        d.chat.push({ id: Date.now(), role: 'outreach', flow: 'sprint', text: 'Collections outreach', at: '' });
      }, `Approved collections sprint – ${lakh(target)} by Fri 30 Oct`);
      ctx.startTask({ agent: 'Collections agent', text: 'Contacting 6 customers for the Friday collections sprint', result: '6 of 6 responded – ₹4.9 lakh promised by Fri, 1 dispute, 1 statement request', to: '/collections', ms: SPRINT_MS, effect: finishSprint });
    },
  });
}
export function disputeReply(ctx: Ctx) {
  ctx.openDraft({
    title: 'Reply to short-supply claim – INV-1050', channel: 'Email', to: 'Aarav Mehta', toDetail: 'aarav@aaravinteriors.example · Aarav Interiors',
    body: `Dear Aarav,

Thank you for flagging this. Our records show 10 railing assemblies RA-12 delivered to Film Nagar on 6 Oct against SO-1042.

Attached:
• Proof of delivery signed by your site supervisor (10 modules)
• LR SST/2610/0611 – Sri Sai Transport
• Packing list with photos (10 crates)

If one module is missing at site, we will check with our transporter today. Could you release the undisputed ₹1,30,500 by Friday?

Regards,
Bhargavi Reddy
Accounts, Aarohan Industries`,
    approveLabel: 'Approve & send (simulated)', note: 'Prepared by the Collections agent. Attachments are from the delivery record. Demo: nothing is actually emailed.',
    onApprove: () => { ctx.update((d) => { d.approvals['apr-dispute1050'] = 'approved'; }, 'Approved POD + LR reply to Aarav Interiors (INV-1050)'); ctx.toast('Reply with POD + LR marked as sent (simulated)'); },
  });
}
export function statementReply(ctx: Ctx) {
  ctx.openDraft({
    title: 'Statement of account – Kakatiya Pumps', channel: 'Email', to: 'Swathi Reddy', toDetail: 'swathi@kakatiyapumps.example',
    body: `Dear Swathi,

Please find attached our statement of account as on 28 Oct 2026.

Open: INV-1054 dated 20 Oct – ₹1,25,000 (due 19 Nov)
All earlier invoices are settled.

Please include INV-1054 in your 9 Nov payment run.

Regards,
Bhargavi Reddy
Accounts, Aarohan Industries`,
    approveLabel: 'Approve & send (simulated)', note: 'Statement PDF generated from the ledger. Demo: nothing is actually emailed.',
    onApprove: () => { ctx.update((d) => { d.approvals['apr-stmt1054'] = 'approved'; }, 'Approved statement of account for Kakatiya Pumps'); ctx.toast('Statement marked as sent (simulated)'); },
  });
}
