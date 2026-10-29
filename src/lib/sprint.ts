// "Get me ₹5 lakh in by Friday" – collections sprint. All messages, calls and replies are simulated demo data.
import type { DemoState } from './store';
import type { Channel } from './sourcing';

export type SprintOutcome = 'Promised' | 'Part promised' | 'Disputed' | 'Statement requested';
export type SprintRow = {
  id: string; rank: number; customerId: string; customer: string; person: string; invoice: string; amount: number;
  channel: Channel; language: string; likelihood: number; why: string; behaviour: string; leverage?: string;
  sent: string; replyHead: string; reply: string; quotes: string[];
  outcome: SprintOutcome; promise: { amount: number; date: string; mode: string }; byFriday: number; later?: { amount: number; date: string };
  confidence: number; tips: string[]; followUp?: 'dispute' | 'statement' | 'discount'; replyAt: number;
};
export const SPRINT_MS = 7200;
export const FRIDAY = '2026-10-30';
export const RECEIVED = { invoice: 'INV-1044', customer: 'Deccan Electricals', amount: 42000, note: 'UPI received today 10:42 after yesterday’s automatic reminder – matched from the bank feed (simulated)' };

export const SPRINT: SprintRow[] = [
  { id: 'SP-1', rank: 1, customerId: 'C01', customer: 'Sri Lakshmi Projects', person: 'Srinivas Rao', invoice: 'INV-1048', amount: 210000, channel: 'Call', language: 'Telugu', likelihood: 90,
    why: '12 days overdue · promised "next week" on 22 Oct', behaviour: 'Paid within 7 days of a call the last 4 times', leverage: '45-day MSME limit falls on 31 Oct (Sec 43B(h)); Tower B Lot 1 (SO-1051) ships Friday',
    sent: 'Call script · Telugu · to Srinivas Rao\n\n"Namaste Srinivas garu, this is an automated call from Aarohan Industries on behalf of Bhargavi Reddy, Accounts."\n• INV-1048 for ₹2,10,000 was due on 16 Oct. Ask for the payment date and mode.\n• If asked: Tower B Lot 1 (SO-1051) ships on Friday – clearing INV-1048 keeps the credit line open for it.\n• Mention: the 45-day MSME limit on this invoice falls on 31 Oct (Sec 43B(h)).\n• Close: "Thank you – Bhargavi will share the UTR confirmation."',
    replyHead: 'Call summary · 1 min 52 s · Telugu (translated)', reply: '• Promise: full ₹2,10,000 by RTGS on Thu 29 Oct\n• Condition: Tower B Lot 1 must reach site on Friday\n• Asked for the UTR to be shared on WhatsApp', quotes: ['Our client’s bank release came yesterday. I will do RTGS for the full ₹2.1 lakh tomorrow, Thursday.', 'Please make sure the Tower B first lot reaches on Friday.'],
    outcome: 'Promised', promise: { amount: 210000, date: '2026-10-29', mode: 'RTGS' }, byFriday: 210000, confidence: 84,
    tips: ['Paid within 7 days of a call the last 4 times – a call beats WhatsApp here.', 'Mention the 43B(h) deduction: the 45-day limit on INV-1048 falls on 31 Oct.', 'Tie it to SO-1051: Lot 1 ships Friday; ask for payment before Lot 2 (Tue 3 Nov).', 'Credit use goes to 98% with SO-1051 – do not offer extra days.'], replyAt: 5200 },
  { id: 'SP-2', rank: 2, customerId: 'C04', customer: 'Greenfield Builders', person: 'Mahesh Goud', invoice: 'INV-1051', amount: 162000, channel: 'Call', language: 'Telugu, English', likelihood: 70,
    why: 'Not due till 24 Nov · reliable payer', behaviour: 'Paid INV-1045 a day early by RTGS; takes early-payment offers', leverage: '1% early-payment discount (₹1,620) if paid by Thu – in the approved plan',
    sent: 'Call script · English/Telugu · to Mahesh Goud\n\n"Namaste Mahesh garu, this is an automated call from Aarohan Industries on behalf of Bhargavi Reddy, Accounts."\n• INV-1051 for ₹1,62,000 is due on 24 Nov.\n• Offer: if paid by Thu 29 Oct, we give a 1% early-payment discount (₹1,620).\n• Close: "Thank you – we will send the revised amount on email."',
    replyHead: 'Call summary · 1 min 21 s · English (translated in parts)', reply: '• Accepts 1% discount but asks to pay on Fri 30 Oct morning\n• Promise: ₹1,60,380 by RTGS on Fri before 11 am\n• Extending the discount by one day needs your OK', quotes: ['Thursday is tight. Can we do Friday morning with the 1%?', 'I will release ₹1,60,380 by RTGS Friday before 11.'],
    outcome: 'Promised', promise: { amount: 160380, date: '2026-10-30', mode: 'RTGS' }, byFriday: 160380, confidence: 80, followUp: 'discount',
    tips: ['Offer 1% only if paid by Thu – they asked for Fri; accept only if it lands before 11 am.', '₹1,620 buys 25 days of cash – cheaper than the 11.25% CC interest (₹1,250 for 25 days on ₹1.62 lakh) plus the risk.', 'SO-1055 (base frames lot 2) is in planning – keep goodwill.'], replyAt: 6000 },
  { id: 'SP-3', rank: 3, customerId: 'C02', customer: 'Aarav Interiors', person: 'Aarav Mehta', invoice: 'INV-1050', amount: 145000, channel: 'Email', language: 'English', likelihood: 60,
    why: 'Due 6 Nov · asked to pay early', behaviour: 'Pays by NEFT 2–4 days after due date', leverage: 'OP-302 balcony grills order under discussion',
    sent: 'Subject: INV-1050 – request to release by Fri 30 Oct\n\nDear Aarav,\n\nINV-1050 for ₹1,45,000 (10 railing assemblies RA-12, SO-1042) is due on 6 Nov. Could you release it by Friday, 30 Oct? It would help us close the month.\n\nBank: HDFC Bank, Kukatpally · A/c ••4821 · IFSC HDFC0001234\n\nRegards,\nBhargavi Reddy\nAccounts, Aarohan Industries',
    replyHead: 'Re: INV-1050 – from aarav@aaravinteriors.example', reply: 'Dear Bhargavi,\n\nWe received only 9 railing modules at Film Nagar against 10 on INV-1050. We will release the undisputed ₹1,30,500 on Mon 2 Nov. The balance after you clarify the short supply.\n\nRegards,\nAarav Mehta', quotes: [],
    outcome: 'Disputed', promise: { amount: 130500, date: '2026-11-02', mode: 'NEFT' }, byFriday: 0, later: { amount: 130500, date: '2026-11-02' }, confidence: 95, followUp: 'dispute',
    tips: ['Dispute: send POD + LR copy first (LR SST/2610/0611, signed by the site supervisor for 10 modules).', 'Ask for the undisputed ₹1,30,500 by Friday instead of Monday.', 'Do not link the OP-302 discount to this payment in writing.'], replyAt: 6600 },
  { id: 'SP-4', rank: 4, customerId: 'C05', customer: 'Vasavi Constructions', person: 'Venkatesh Gupta', invoice: 'INV-1041', amount: 68000, channel: 'WhatsApp', language: 'Telugu', likelihood: 85,
    why: '27 days overdue · PDC 004512 dated 5 Nov on hand', behaviour: 'Cheques clear, but always on the last date', leverage: '45-day MSME limit crossed on 16 Oct (Sec 43B(h))',
    sent: 'Namaste Venkatesh garu, Aarohan Industries here.\nINV-1041 for ₹68,000 was due on 1 Oct. We hold your cheque 004512 dated 5 Nov.\nIf you can pay by UPI by Friday 30 Oct, we will return the cheque.\nUPI: aarohan@hdfcbank\n– Bhargavi Reddy, Accounts',
    replyHead: 'WhatsApp from Venkatesh Gupta', reply: 'Ok sir, builder payment came. Will send 68,000 by UPI on Friday.\nPlease return the cheque.', quotes: [],
    outcome: 'Promised', promise: { amount: 68000, date: '2026-10-30', mode: 'UPI' }, byFriday: 68000, confidence: 93,
    tips: ['The PDC is dated 5 Nov – you are only pulling it forward by 6 days.', 'The 45-day limit passed on 16 Oct – their deduction is stuck until they pay (43B(h)).', 'Return cheque 004512 once the UPI lands and note it in Finance.'], replyAt: 2400 },
  { id: 'SP-5', rank: 5, customerId: 'C07', customer: 'Rao & Sons Engineering', person: 'Prasad Rao', invoice: 'INV-1053', amount: 88000, channel: 'WhatsApp', language: 'Telugu', likelihood: 60,
    why: 'Due 13 Nov · SO-1043 ships to Warangal on Friday', behaviour: 'Pays on the due date, rarely early', leverage: 'SO-1043 (24 JB-15 boxes) dispatches Fri',
    sent: 'Namaste Prasad garu, Aarohan Industries here.\nINV-1053 for ₹88,000 is due on 13 Nov. Your SO-1043 lot dispatches to Warangal on Friday with Sri Sai Transport.\nCould you release part of INV-1053 by Friday 30 Oct?\n– Bhargavi Reddy, Accounts',
    replyHead: 'WhatsApp from Prasad Rao', reply: 'Can do 50,000 by NEFT Friday. Balance on due date.', quotes: [],
    outcome: 'Part promised', promise: { amount: 50000, date: '2026-10-30', mode: 'NEFT' }, byFriday: 50000, later: { amount: 38000, date: '2026-11-13' }, confidence: 92,
    tips: ['They pay on the due date and never early – ₹50,000 now is a good result.', 'Share the SO-1043 LR copy on Friday with a thank-you.'], replyAt: 3400 },
  { id: 'SP-6', rank: 6, customerId: 'C08', customer: 'Kakatiya Pumps', person: 'Swathi Reddy', invoice: 'INV-1054', amount: 125000, channel: 'Email', language: 'English', likelihood: 40,
    why: 'Due 19 Nov · fixed payment runs', behaviour: 'Pays in the fortnightly run after reconciliation', leverage: 'SO-1044 dispatches tomorrow',
    sent: 'Subject: INV-1054 – early release request\n\nDear Swathi,\n\nINV-1054 for ₹1,25,000 is due on 19 Nov. Could it be included in this week’s payment run? SO-1044 (motor base frames, Lot 4) dispatches tomorrow.\n\nRegards,\nBhargavi Reddy\nAccounts, Aarohan Industries',
    replyHead: 'Re: INV-1054 – from swathi@kakatiyapumps.example', reply: 'Dear Bhargavi,\n\nPlease send a statement of account for reconciliation. Our next payment run is Mon 9 Nov – INV-1054 will be included once the statement matches.\n\nThanks,\nSwathi Reddy', quotes: [],
    outcome: 'Statement requested', promise: { amount: 125000, date: '2026-11-09', mode: 'NEFT' }, byFriday: 0, later: { amount: 125000, date: '2026-11-09' }, confidence: 95, followUp: 'statement',
    tips: ['Send the statement today so INV-1054 makes the 9 Nov run.', 'Ask for INV-1054 to be paid before the 45-day mark (4 Dec) – 43B(h) applies to them too.'], replyAt: 4200 },
];

export const sprintTotals = (s: DemoState) => {
  const done = s.sprint.status === 'done';
  const received = done ? RECEIVED.amount : 0;
  const promised = done ? SPRINT.reduce((a, r) => a + r.byFriday, 0) : 0;
  const later = done ? SPRINT.reduce((a, r) => a + (r.later?.amount || 0), 0) : 0;
  const target = s.sprint.target;
  return { received, promised, later, target, total: received + promised, pct: Math.round(((received + promised) / target) * 100) };
};
export const expected = () => Math.round(SPRINT.reduce((a, r) => a + (r.amount * r.likelihood) / 100, 0));
export const promiseFor = (s: DemoState, inv: string) => (s.sprint.status === 'done' ? SPRINT.find((r) => r.invoice === inv) : undefined);

export function finishSprint(d: DemoState) {
  if (d.sprint.status === 'done') return;
  d.sprint.status = 'done';
  const i = d.invoices.find((x) => x.id === RECEIVED.invoice);
  if (i && i.paid < i.total) { i.paid = i.total; i.status = 'Paid'; i.history.unshift({ date: '2026-10-28', text: 'UPI ₹42,000 received – matched from bank feed (simulated)', mode: 'UPI', amount: 42000 }); }
  SPRINT.forEach((r) => {
    const inv = d.invoices.find((x) => x.id === r.invoice);
    if (inv) inv.history.unshift({ date: '2026-10-28', text: `${r.outcome === 'Disputed' ? 'Short-supply claim (9 of 10 received)' : r.outcome === 'Statement requested' ? 'Statement of account requested' : 'Promise to pay'} – ₹${r.promise.amount.toLocaleString('en-IN')} by ${r.promise.mode} on ${r.promise.date.slice(8)} ${r.promise.date.slice(5, 7) === '10' ? 'Oct' : 'Nov'} (Collections agent, simulated ${r.channel === 'Call' ? 'call' : r.channel})`, mode: r.channel });
  });
}
