// "Source it for me" – supplier contacts, scripted (simulated) supplier replies and scoring.
// Nothing here talks to a real supplier: messages, calls and replies are demo data.
import type { DemoState } from './store';
import { inr, fmtShort, addDays } from './format';

export type Channel = 'WhatsApp' | 'Email' | 'Call';
export const CHANNELS: Channel[] = ['WhatsApp', 'Email', 'Call'];
export const channelLabel = (c: Channel) => (c === 'Call' ? 'AI voice call' : c);

export type SupplierContact = {
  id: string; supplierId: string; supplier: string; person: string; role: string; city: string;
  supplies: string; skus: string[]; channel: Channel; language: string; phone: string; email: string;
  leadDays: number; onTime: number; rejection: number; lastPrice: number; lastPriceNote: string; terms: string; rating: number; gstin?: string;
};
export const CONTACTS: SupplierContact[] = [
  { id: 'CT-01', supplierId: 'S01', supplier: 'Deccan Castings', person: 'Nagendra Prasad', role: 'Sales head', city: 'Medak', supplies: 'Aluminium castings – A-17 housings', skus: ['RM-A17'], channel: 'Call', language: 'Telugu', phone: '+91 98•••• 7710', email: 'nagendra@deccancastings.example', leadDays: 4, onTime: 91, rejection: 0.4, lastPrice: 4760, lastPriceNote: 'avg of last 3 POs', terms: 'Net 15', rating: 4.4 },
  { id: 'CT-02', supplierId: 'S03', supplier: 'Prime Components', person: 'Sudheer Reddy', role: 'Director', city: 'Balanagar', supplies: 'Castings & machined parts', skus: ['RM-A17'], channel: 'WhatsApp', language: 'English, Telugu', phone: '+91 99•••• 5208', email: 'sudheer@primecomponents.example', leadDays: 2, onTime: 95, rejection: 0.3, lastPrice: 4910, lastPriceNote: 'PO-0921 quote', terms: 'Net 30', rating: 4.6 },
  { id: 'CT-03', supplierId: 'S02', supplier: 'CastHub Rajkot', person: 'Rakesh Patel', role: 'Export & sales', city: 'Rajkot, Gujarat', supplies: 'Aluminium & SG iron castings', skus: ['RM-A17'], channel: 'Email', language: 'English, Gujarati', phone: '+91 97•••• 3390', email: 'rakesh@casthub.example', leadDays: 7, onTime: 78, rejection: 6.7, lastPrice: 4720, lastPriceNote: 'last quote (QT-208-B)', terms: '100% advance', rating: 3.9 },
  { id: 'CT-04', supplierId: 'S09', supplier: 'Balaji Bearings & Transmissions', person: 'Mukesh Agarwal', role: 'Proprietor', city: 'Ranigunj, Secunderabad', supplies: 'Bearings, belts, transmission parts', skus: ['CP-6204'], channel: 'WhatsApp', language: 'Hindi', phone: '+91 98•••• 6031', email: 'balajibearings@example.in', leadDays: 1, onTime: 93, rejection: 0.1, lastPrice: 180, lastPriceNote: 'last PO, Sep', terms: 'Net 30', rating: 4.5 },
  { id: 'CT-05', supplierId: 'S10', supplier: 'Krishna Bearing House', person: 'Srinivas Chary', role: 'Owner', city: 'Kukatpally', supplies: 'Bearings (trading, mixed makes)', skus: ['CP-6204'], channel: 'Call', language: 'Telugu', phone: '+91 90•••• 2218', email: 'krishnabearing@example.in', leadDays: 2, onTime: 84, rejection: 2.0, lastPrice: 172, lastPriceNote: 'quote, Aug', terms: 'Cash on delivery', rating: 3.7 },
  { id: 'CT-06', supplierId: 'S04', supplier: 'Hyderabad Tools & Consumables', person: 'Ashok Kumar', role: 'Key accounts', city: 'Jeedimetla', supplies: 'Consumables, bearings, fasteners', skus: ['CP-6204', 'CP-FK8', 'CN-WW08'], channel: 'Email', language: 'English', phone: '+91 93•••• 1184', email: 'ashok@hydtools.example', leadDays: 3, onTime: 88, rejection: 0.2, lastPrice: 185, lastPriceNote: 'last PO, Jul', terms: 'Net 30', rating: 4.2 },
  { id: 'CT-07', supplierId: 'S08', supplier: 'Sri Venkata Steels', person: 'Venkata Ramana Gupta', role: 'Partner', city: 'Jeedimetla', supplies: 'MS / SS / GI sheet and plate', skus: ['RM-MS2', 'RM-MS5', 'RM-SS12', 'RM-GI15'], channel: 'Email', language: 'Telugu', phone: '+91 98•••• 4402', email: 'ranjith302+supplierA@gmail.com', leadDays: 3, onTime: 89, rejection: 0.5, lastPrice: 3250, lastPriceNote: 'MS 2 mm sheet', terms: 'Net 45', rating: 4.3 },
  { id: 'CT-09', supplierId: 'S12', supplier: 'Bhagyanagar Metals', person: 'Ravi Teja Goud', role: 'Sales', city: 'Balanagar', supplies: 'MS / CRCA sheet, coils', skus: ['RM-MS2', 'RM-MS5'], channel: 'WhatsApp', language: 'English, Telugu', phone: '+91 99•••• 2363', email: 'ranjith302+supplierB@gmail.com', leadDays: 2, onTime: 92, rejection: 0.4, lastPrice: 3310, lastPriceNote: 'MS 2 mm sheet, Aug', terms: 'Net 30', rating: 4.4 },
  { id: 'CT-10', supplierId: 'S13', supplier: 'Kakatiya Steel Traders', person: 'Srinivas Rao', role: 'Proprietor', city: 'Kukatpally', supplies: 'MS sheet & plate (trading)', skus: ['RM-MS2'], channel: 'Call', language: 'Telugu, English', phone: '+91 99•••• 2363', email: 'ranjith302+supplierC@gmail.com', leadDays: 1, onTime: 83, rejection: 1.5, lastPrice: 3190, lastPriceNote: 'quote, Sep', terms: 'Cash on delivery', rating: 3.8 },
  { id: 'CT-11', supplierId: 'S14', supplier: 'Charminar Steel Corporation', person: 'Saad Ansari', role: 'Sales Manager', city: 'Begum Bazaar', supplies: 'MS / CRCA sheet, HR coils', skus: ['RM-MS2'], channel: 'Email', language: 'English, Urdu, Hindi', phone: '+91 99•••• 1938', email: 'saad1085+supplierD@gmail.com', leadDays: 3, onTime: 88, rejection: 0.9, lastPrice: 3260, lastPriceNote: 'MS 2 mm sheet, Jul', terms: 'Net 30', rating: 4.2 },
  { id: 'CT-12', supplierId: 'S15', supplier: 'Deccan Sheet Metals', person: 'Saad Ansari', role: 'Partner', city: 'Katedan', supplies: 'MS sheet, slitting & cut-to-length', skus: ['RM-MS2'], channel: 'WhatsApp', language: 'Urdu, Hindi, English', phone: '+91 99•••• 1938', email: '', leadDays: 2, onTime: 90, rejection: 0.7, lastPrice: 3240, lastPriceNote: 'quote, Sep', terms: '30% advance, balance on delivery', rating: 4.0 },
  { id: 'CT-08', supplierId: 'S11', supplier: 'Polyseal Rubber Products', person: 'Imtiaz Ahmed', role: 'Sales', city: 'Cherlapally', supplies: 'EPDM gaskets & seals', skus: ['CP-GSK65'], channel: 'Email', language: 'English, Urdu', phone: '+91 99•••• 7726', email: 'imtiaz@polyseal.example', leadDays: 5, onTime: 90, rejection: 0.8, lastPrice: 120, lastPriceNote: 'gasket set', terms: 'Net 30', rating: 4.1 },
];

export const REQ = {
  id: 'SRC-0031', customerId: 'C14', customer: 'Kaveri Engineering', product: 'PHA-17 pump housing assembly', qty: 150,
  due: '2026-11-12', inStoresBy: '2026-11-09', deliverTo: 'Jeedimetla, Hyderabad',
};
type BomLine = { sku: string; label: string; per: number; unit: string; committed?: number; committedNote?: string; buy?: number; buyNote?: string };
export const BOM: BomLine[] = [
  { sku: 'RM-A17', label: 'A-17 cast housing', per: 1, unit: 'pcs', committed: 35, committedNote: '35 free units are committed to SO-1051 (Fri)', buy: 150 },
  { sku: 'CP-6204', label: 'Bearing 6204-2RS', per: 2, unit: 'pcs', buy: 100, buyNote: 'box of 100 – also restores the reorder level' },
  { sku: 'CP-FK8', label: 'Fastener kit M8', per: 1, unit: 'kits' },
  { sku: 'CN-PCP7035', label: 'Powder RAL 7035', per: 0.2, unit: 'kg' },
  { sku: 'PK-CTN5', label: 'Carton 5-ply', per: 1, unit: 'pcs' },
];
export const stockCheck = (s: DemoState) => BOM.map((b) => {
  const k = s.skus.find((x) => x.sku === b.sku)!;
  const need = Math.round(b.per * REQ.qty * 10) / 10;
  const committed = (b.committed || 0);
  const free = Math.max(0, k.onHand - k.reserved - committed);
  const short = Math.max(0, need - free);
  return { ...b, need, onHand: k.onHand, reserved: k.reserved, committed, free, short, buy: short ? (b.buy || short) : 0 };
});

export type Reply = { qty: number; lots?: string; arrives: string; price: number; freight: number; terms: string; make?: string; quotes: string[]; duration?: string };
export type SourceOption = { id: string; contactId: string; sku: string; reply: Reply; replyAt: number; tips: string[] };
export const OPTIONS: SourceOption[] = [
  { id: 'OPT-A1', contactId: 'CT-01', sku: 'RM-A17', replyAt: 4600, reply: { qty: 150, lots: '100 by Thu 5 Nov + 50 by Sat 7 Nov', arrives: '2026-11-07', price: 4820, freight: 7500, terms: 'Net 15', duration: '2 min 14 s', quotes: ['We can do all 150 pieces – 100 by Thursday the 5th, the other 50 by Saturday the 7th.', 'Rate is ₹4,820 per piece, freight ₹7,500 to Jeedimetla.', 'Payment Net 15, same as the October batch.'] },
    tips: ['Their last 3 POs averaged ₹4,760. ₹4,820 is 1.3% higher – counter at ₹4,770 (saves ₹7,500).', 'CastHub quoted ₹130 less per piece but wants 100% advance and had 6.7% rejection on the last lot – use the price as leverage, not the supplier.', 'Offer Net 7 instead of Net 15 for 1% off (₹7,230) – only if the collections sprint lands.', 'Bundle this with the next A-17 reorder (reorder level 50) and ask them to waive the ₹7,500 freight.'] },
  { id: 'OPT-A2', contactId: 'CT-02', sku: 'RM-A17', replyAt: 2600, reply: { qty: 150, arrives: '2026-11-09', price: 4890, freight: 6000, terms: 'Net 30', quotes: ['Yes, 150 pcs possible. Full lot by Mon 9 Nov.', '₹4,890/pc, freight ₹6,000. Net 30 same as PO-0921.', 'If you confirm by Friday we can block the furnace slot.'] },
    tips: ['₹4,890 is already ₹20 below PO-0921 (₹4,910). Ask ₹4,850 – this order is 2.3× the last one.', '9 Nov leaves no buffer before machining. Ask for 100 by 5 Nov – they turned PR-208 around in 2 days.', 'Deccan quoted ₹70 less and 2 days earlier – mention a competing quote.', 'Keep Net 30 – it is worth more than a ₹20 price cut while ₹3.2 lakh is overdue.'] },
  { id: 'OPT-A3', contactId: 'CT-03', sku: 'RM-A17', replyAt: 5600, reply: { qty: 150, lots: 'dispatch Mon 2 Nov from Rajkot, 4 days transit', arrives: '2026-11-06', price: 4690, freight: 14000, terms: '100% advance', quotes: ['We can dispatch 150 pcs on Monday 2 Nov; transit is 4 days, so you should have them by Friday 6 Nov.', 'Price ₹4,690 per piece ex-works plus ₹14,000 freight. IGST extra.', 'Terms: 100% advance before dispatch.'] },
    tips: ['On-time is 78% – ask for a delivery-penalty clause (0.5% per day late).', '2 pcs failed for porosity last time (DN-0042). Ask for pre-dispatch inspection photos and free replacement.', 'Offer 30% advance, balance on receipt – 100% advance would block ₹8.5 lakh of cash.', 'Inter-state supply: IGST applies and the e-way bill must travel with the truck.'] },
  { id: 'OPT-B1', contactId: 'CT-04', sku: 'CP-6204', replyAt: 2000, reply: { qty: 100, arrives: '2026-10-29', price: 176, freight: 0, terms: 'Net 30', make: 'approved make', quotes: ['100 pcs 6204-2RS in stock, approved make. Can deliver tomorrow (Thu 29 Oct) by 11 am.', '₹176 per piece, free delivery in Hyderabad. Net 30.'] },
    tips: ['₹176 is already 2% below your last price (₹180). Ask ₹172 for 200 pcs – stock falls below the 200 reorder level after this order.', 'Krishna quoted ₹168 for an equivalent make – use it as leverage but stay with the approved make.', 'Free delivery tomorrow – ask for a GST invoice with HSN 8482 10 11.'] },
  { id: 'OPT-B2', contactId: 'CT-06', sku: 'CP-6204', replyAt: 5200, reply: { qty: 100, arrives: '2026-11-02', price: 184, freight: 300, terms: 'Net 30', make: 'approved make', quotes: ['We can supply 100 nos 6204-2RS by Monday 2 Nov.', '₹184 each plus ₹300 courier. Net 30 on our running account.'] },
    tips: ['₹184 is 2% above your last price (₹180). Ask them to match Balaji at ₹176.', 'Running account already open (PO-0915) – ask them to waive the ₹300 courier.'] },
  { id: 'OPT-B3', contactId: 'CT-05', sku: 'CP-6204', replyAt: 3800, reply: { qty: 68, arrives: '2026-10-30', price: 168, freight: 0, terms: 'Cash on delivery', make: 'equivalent make – not approved', duration: '1 min 38 s', quotes: ['I have 68 pieces right now, equivalent make – not the brand you usually take.', '₹168 each, cash on delivery. I can bring them on Friday.'] },
    tips: ['Only 68 of 100 available and not your approved make – keep as a backup only.', 'Cash on delivery: ask for Net 15 against a GST invoice.'] },
];
export const OUTREACH_MS = 6800;

export const contactOf = (s: DemoState, id: string) => s.contacts.find((c) => c.id === id) || CONTACTS.find((c) => c.id === id)!;
export const channelFor = (s: DemoState, o: SourceOption): Channel => s.sourcing.sent[o.id] || contactOf(s, o.contactId).channel;
const honorific = (c: SupplierContact) => (/Telugu/.test(c.language) ? 'garu' : /Hindi/.test(c.language) ? 'ji' : /Gujarati/.test(c.language) ? 'bhai' : '');
const first = (c: SupplierContact) => `${c.person.split(' ')[0]}${honorific(c) ? ' ' + honorific(c) : ''}`;
const itemOf = (sku: string) => (sku === 'RM-A17' ? { name: 'A-17 cast aluminium housings', spec: 'LM6, as-cast, drawing A17-R3' } : { name: '6204-2RS bearings', spec: '20 × 47 × 14 mm, approved make' });
const buyOf = (sku: string) => (sku === 'RM-A17' ? 150 : 100);

export const landed = (o: SourceOption) => o.reply.qty * o.reply.price + o.reply.freight;
const termsScore = (t: string) => (/Net 30/.test(t) ? 100 : /Net 15/.test(t) ? 80 : /Cash/.test(t) ? 50 : 30);
export const scoreOf = (s: DemoState, o: SourceOption) => {
  const peers = OPTIONS.filter((x) => x.sku === o.sku);
  const unit = (x: SourceOption) => landed(x) / x.reply.qty;
  const priceS = (100 * Math.min(...peers.map(unit))) / unit(o);
  const c = contactOf(s, o.contactId);
  const late = o.reply.arrives > REQ.inStoresBy;
  const dateS = (late ? 40 : o.reply.arrives === REQ.inStoresBy ? 85 : 100) * Math.min(1, o.reply.qty / buyOf(o.sku));
  const relS = c.onTime - c.rejection * 3 - (/not approved/.test(o.reply.make || '') ? 6 : 0);
  const v = 0.35 * priceS + 0.3 * dateS + 0.15 * termsScore(o.reply.terms) + 0.2 * relS;
  return Math.round(v);
};
export const confidenceOf = (s: DemoState, o: SourceOption) => {
  const ch = channelFor(s, o);
  return ch === 'Email' ? 96 : ch === 'WhatsApp' ? 93 : /not approved/.test(o.reply.make || '') ? 78 : 84;
};
export const ranked = (s: DemoState, sku: string) => OPTIONS.filter((o) => o.sku === sku).sort((a, b) => scoreOf(s, b) - scoreOf(s, a));
export const pickFor = (s: DemoState, sku: string) => OPTIONS.find((o) => o.id === s.sourcing.picks[sku]) || ranked(s, sku)[0];

export function sentMessage(s: DemoState, o: SourceOption) {
  const c = contactOf(s, o.contactId); const it = itemOf(o.sku); const q = buyOf(o.sku); const by = fmtShort(REQ.inStoresBy);
  const ch = channelFor(s, o);
  if (ch === 'WhatsApp') return `Namaste ${first(c)}, Aarohan Industries here.\nWe need ${q} pcs ${it.name} (${it.spec}) at ${REQ.deliverTo} by ${by}.\n1. Do you have it in stock?\n2. How many can you supply?\n3. Earliest ship date?\n4. Best price per pc incl. freight, and payment terms?\n– Harish Chandra, Stores & Purchase`;
  if (ch === 'Email') return `Subject: Enquiry – ${q} pcs ${it.name} by ${by} (ref ${REQ.id})\n\nDear ${c.person.split(' ')[0]},\n\nWe have a new order and need ${q} pcs of ${it.name} (${it.spec}), delivered to ${REQ.deliverTo} by ${by}.\n\nPlease confirm:\n1. Availability and quantity you can supply\n2. Earliest dispatch date (and lots, if split)\n3. Unit price, freight and payment terms\n\nThis is an enquiry, not a purchase order.\n\nRegards,\nHarish Chandra\nStores & Purchase, Aarohan Industries`;
  return `Call script · ${c.language.split(',')[0]} · to ${c.person}\n\n"Namaste ${first(c)}, this is an automated call from Aarohan Industries, Hyderabad, on behalf of Harish Chandra."\n• Ask: Do you have ${q} pcs ${it.name} available?\n• Ask: How many, and by which date can you deliver to Jeedimetla? We need them by ${by}.\n• Ask: Price per piece, freight and payment terms?\n• Close: "Thank you – we will confirm in writing. This is not an order."\n\nIf they ask for a person: offer a call-back from Harish (+91 98•••• 3307).`;
}
export function replyView(s: DemoState, o: SourceOption) {
  const c = contactOf(s, o.contactId); const ch = channelFor(s, o); const r = o.reply;
  if (ch === 'WhatsApp') return { kind: 'WhatsApp' as const, head: `WhatsApp from ${c.person}`, text: r.quotes.join('\n'), quotes: [] as string[] };
  if (ch === 'Email') return { kind: 'Email' as const, head: `Re: Enquiry ${REQ.id} – from ${c.email}`, text: `Dear Harish,\n\n${r.quotes.join('\n\n')}\n\nRegards,\n${c.person}\n${c.supplier}`, quotes: [] as string[] };
  return { kind: 'Call' as const, head: `Call summary · ${r.duration || '1 min 50 s'} · ${c.language.split(',')[0]}${/Telugu|Hindi/.test(c.language) ? ' (translated)' : ''}`,
    text: `• Available: ${r.qty} pcs${r.lots ? ` (${r.lots})` : ''}\n• Price: ₹${r.price.toLocaleString('en-IN')}/pc · freight ${r.freight ? inr(r.freight) : 'free'}\n• Terms: ${r.terms}${r.make ? `\n• Make: ${r.make}` : ''}`, quotes: r.quotes };
}
export function callPoints(s: DemoState, o: SourceOption) {
  const c = contactOf(s, o.contactId); const r = o.reply;
  return [`Confirm ${r.qty} pcs${r.lots ? ` – ${r.lots}` : ''}, in stores by ${fmtShort(REQ.inStoresBy)}`, `Price on the table: ₹${r.price.toLocaleString('en-IN')}/pc · last price ₹${c.lastPrice.toLocaleString('en-IN')} (${c.lastPriceNote})`, `Terms: ${r.terms} · freight ${r.freight ? inr(r.freight) : 'free'}`, 'Ask for written confirmation on WhatsApp or email after the call'];
}

// Called when outreach finishes (timer or reload): adds the agent log line; replies are already scripted.
export function finishSourcing(d: DemoState) {
  d.sourcing.status = 'done';
}
export const poDraftLines = (s: DemoState) => ['RM-A17', 'CP-6204'].map((sku) => { const o = pickFor(s, sku); const c = contactOf(s, o.contactId); return { sku, o, c, value: landed(o) }; });
export const poDraftTotal = (s: DemoState) => poDraftLines(s).reduce((a, l) => a + Math.round(l.value * 1.18), 0);
export const etaPlus = (d: string, n: number) => addDays(d, n);
