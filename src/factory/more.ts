/** v3 demo data: suppliers for sourcing, money, costing and the eligibility profile used for tenders. All fictional. */
import { DOCS, daysTo, docById } from './data';

/* ── Sourcing: demo supplier catalogue by category ── */
export type Supplier = { name: string; city: string; price: number; moq: number; lead: number; rating: number; note: string };
export type Cat = { id: string; label: string; unit: string; match: RegExp; spec: string; suppliers: Supplier[] };
export const CATS: Cat[] = [
  { id: 'box', label: 'Corrugated boxes', unit: 'boxes', match: /corrugat|carton|\bbox(es)?\b|5.?ply|3.?ply|7.?ply/, spec: '5-ply, 32 ECT, printed 1 colour', suppliers: [
    { name: 'Deccan Corrugators (demo)', city: 'Medak, TS', price: 41.5, moq: 2000, lead: 6, rating: 4.6, note: '18 km from Site 3; supplied us 4 times, 0 rejections' },
    { name: 'Sri Balaji Packaging (demo)', city: 'Patancheru, TS', price: 39.8, moq: 5000, lead: 9, rating: 4.2, note: 'Cheapest, but one late delivery in July' },
    { name: 'Kaveri Boards (demo)', city: 'Hosur, TN', price: 43.0, moq: 1000, lead: 5, rating: 4.7, note: 'Best quality; far from Site 3 (freight ₹1.6/box extra)' },
    { name: 'Lakshmi Kraft Works (demo)', city: 'Sangareddy, TS', price: 40.6, moq: 3000, lead: 8, rating: 4.4, note: 'BIS-tested board; new supplier for us' },
    { name: 'Nizam Cartons (demo)', city: 'Hyderabad, TS', price: 44.2, moq: 500, lead: 4, rating: 4.0, note: 'Fast, small lots, higher price' }] },
  { id: 'conn', label: 'RF connectors (SMA)', unit: 'pcs', match: /connector|sma\b|u\.?fl|rf (jack|plug)/, spec: 'SMA female PCB mount, gold plated, 50 Ω', suppliers: [
    { name: 'Vega Interconnect (demo)', city: 'Bengaluru, KA', price: 23.5, moq: 1000, lead: 10, rating: 4.5, note: 'Our current source; 0.2% rejects' },
    { name: 'Pune RF Parts (demo)', city: 'Pune, MH', price: 21.8, moq: 5000, lead: 14, rating: 4.1, note: 'Cheaper at volume' },
    { name: 'Shenzhen Link via Chennai stockist (demo)', city: 'Chennai, TN', price: 18.9, moq: 10000, lead: 21, rating: 3.8, note: 'Import – customs and 3 weeks lead' }] },
  { id: 'cable', label: 'Coaxial cable', unit: 'm', match: /coax|rg.?\d+|cable/, spec: 'RG-58 / LMR-200, 50 Ω', suppliers: [
    { name: 'Polycab-type Cables (demo)', city: 'Hyderabad, TS', price: 38, moq: 500, lead: 5, rating: 4.4, note: 'Local stock' },
    { name: 'Daman Wires (demo)', city: 'Daman', price: 34, moq: 2000, lead: 12, rating: 4.0, note: 'Mill direct' },
    { name: 'Andhra Coax (demo)', city: 'Vijayawada, AP', price: 36, moq: 1000, lead: 7, rating: 4.3, note: 'Good test reports' }] },
  { id: 'motor', label: 'BLDC drone motors', unit: 'pcs', match: /motor|bldc/, spec: 'BLDC 8120, 100 KV, for 10 L agri drone', suppliers: [
    { name: 'Hosur Motion Tech (demo)', city: 'Hosur, TN', price: 6850, moq: 40, lead: 12, rating: 4.5, note: 'Made in India – helps the domestic content rule' },
    { name: 'AeroDrive Imports (demo)', city: 'Mumbai, MH', price: 6200, moq: 100, lead: 28, rating: 4.2, note: 'Imported; drone import rules apply' },
    { name: 'Coimbatore EV Parts (demo)', city: 'Coimbatore, TN', price: 7100, moq: 20, lead: 8, rating: 4.6, note: 'Small lots, fastest' }] },
  { id: 'lipo', label: 'LiPo battery packs', unit: 'packs', match: /lipo|batter/, spec: '12S 22,000 mAh smart battery', suppliers: [
    { name: 'Volta Cells (demo)', city: 'Chennai, TN', price: 38500, moq: 10, lead: 14, rating: 4.4, note: 'BIS registered' },
    { name: 'Gigawatt Packs (demo)', city: 'Noida, UP', price: 36200, moq: 50, lead: 21, rating: 4.1, note: 'Cheaper at 50+' },
    { name: 'Southern Energy Systems (demo)', city: 'Hosur, TN', price: 39900, moq: 5, lead: 7, rating: 4.7, note: 'Next to Site 2, quick service' }] },
  { id: 'pcb', label: 'Bare PCBs', unit: 'pcs', match: /\bpcbs?\b|circuit board/, spec: '4-layer FR4, 1.6 mm, ENIG', suppliers: [
    { name: 'Circuit Systems India (demo)', city: 'Gandhinagar, GJ', price: 64, moq: 1000, lead: 12, rating: 4.5, note: 'IPC class 2' },
    { name: 'Hyderabad PCB Labs (demo)', city: 'Hyderabad, TS', price: 71, moq: 200, lead: 6, rating: 4.3, note: 'Fast local prototypes' },
    { name: 'Fine-Line Boards (demo)', city: 'Bengaluru, KA', price: 59, moq: 5000, lead: 18, rating: 4.0, note: 'Cheapest at volume' }] },
  { id: 'foam', label: 'EPE foam inserts', unit: 'pcs', match: /foam|epe|insert/, spec: 'EPE 25 mm die-cut', suppliers: [
    { name: 'Telangana Foam Works (demo)', city: 'Medak, TS', price: 7.2, moq: 2000, lead: 5, rating: 4.4, note: 'Local' },
    { name: 'Softpack Industries (demo)', city: 'Pune, MH', price: 6.5, moq: 10000, lead: 12, rating: 4.1, note: 'Cheapest at volume' }] },
  { id: 'encl', label: 'Plastic enclosures', unit: 'pcs', match: /enclosure|housing|cabinet|ip ?6\d/, spec: 'ABS IP65 enclosure 120×80×40', suppliers: [
    { name: 'Polymould Hyderabad (demo)', city: 'Hyderabad, TS', price: 118, moq: 500, lead: 10, rating: 4.5, note: 'Owns the mould already' },
    { name: 'Rajkot Plastics (demo)', city: 'Rajkot, GJ', price: 104, moq: 2000, lead: 16, rating: 4.0, note: 'New mould fee ₹1.8 L' },
    { name: 'Chennai Moulders (demo)', city: 'Chennai, TN', price: 112, moq: 1000, lead: 12, rating: 4.3, note: 'UL-rated resin' }] },
];
/** Pick a recommended supplier: must meet MOQ, then balance price, speed and track record. */
export function rankSuppliers(c: Cat, qty: number) {
  const rows = c.suppliers.map((s) => ({ ...s, ok: qty >= s.moq }));
  const minP = Math.min(...rows.map((r) => r.price)); const minL = Math.min(...rows.map((r) => r.lead));
  const score = (r: typeof rows[number]) => (r.ok ? 0 : 100) + (r.price / minP - 1) * 100 + (r.lead - minL) * 0.6 - (r.rating - 4) * 6;
  const pick = rows.reduce((b, r, i) => (score(r) < score(rows[b]) ? i : b), 0);
  return { rows, pick };
}

/* ── Money (₹) ── */
export const MONEY = {
  bank: 1_86_40_000, odLimit: 3_00_00_000, odUsed: 1_12_00_000,
  sales: [['May', 2.04], ['Jun', 2.31], ['Jul', 2.18], ['Aug', 2.46], ['Sep', 2.62], ['Oct', 2.39]] as [string, number][], // ₹ Cr per month
  receivables: [
    { who: 'Kessler Funktechnik GmbH (fictional), Germany', amt: 64_20_000, days: 52, note: '€ invoice, LC at sight – docs at bank' },
    { who: 'AP FiberGrid Corp (fictional)', amt: 41_80_000, days: 74, note: 'Govt PSU; bill passed, payment pending' },
    { who: 'Gulf Telecom Trading LLC (fictional), UAE', amt: 22_60_000, days: 18, note: 'Not due yet' },
    { who: 'Agri-Krishi Co-op (fictional)', amt: 17_40_000, days: 96, note: 'Drone order; 2 reminders sent, no reply' },
    { who: 'BoxCo Retail (fictional)', amt: 9_10_000, days: 33, note: 'Usually pays at 45 days' },
  ],
  payables: [
    { who: 'Circuit Systems India (demo)', amt: 18_40_000, due: 3 }, { who: 'Volta Cells (demo)', amt: 12_70_000, due: 5 },
    { who: 'Deccan Corrugators (demo)', amt: 4_20_000, due: 9 }, { who: 'Contract labour agencies (3)', amt: 21_60_000, due: 7 },
  ],
  gst: { due: '20 Nov', amt: 14_30_000, itc: 9_80_000 }, salaries: { amt: 38_50_000, due: '1 Dec' },
  margin: [['RF modules', 17.8], ['Drones', 21.4], ['Packaging', 9.6]] as [string, number][],
};

/* ── Costing per product family, per unit (₹) – used to suggest tender prices ── */
export const COSTING: Record<string, { label: string; unit: string; material: number; labour: number; overhead: number; marginLo: number; marginHi: number; won: string }> = {
  rf: { label: 'RF module', unit: 'unit', material: 612, labour: 58, overhead: 74, marginLo: 8, marginHi: 16, won: 'Your last 3 PSU RF wins were at 11–13% margin; L1 is usually within 6% of the next bidder.' },
  drone: { label: 'Agri drone (10 L) with 2 batteries', unit: 'drone', material: 3_42_000, labour: 21_000, overhead: 34_000, marginLo: 8, marginHi: 16, won: 'State agri tenders were won at 9–12% margin; pilot training adds about ₹12,000 per drone.' },
  packaging: { label: '5-ply corrugated box', unit: 'box', material: 38.4, labour: 3.9, overhead: 4.6, marginLo: 6, marginHi: 12, won: 'Packaging is price-led: 7–9% wins most rate contracts.' },
  other: { label: 'Item', unit: 'unit', material: 0, labour: 0, overhead: 0, marginLo: 8, marginHi: 15, won: '' },
};

/* ── What the company has, for tender eligibility ── */
export const PROFILE = {
  avgTurnoverCr: 23.0, turnover: [['FY23-24', 18.4], ['FY24-25', 23.1], ['FY25-26', 27.6]] as [string, number][],
  similar: { rf: 6, drone: 2, packaging: 4, other: 0 } as Record<string, number>,
  msme: 'Udyam – Small enterprise', manufacturer: true,
};
export const certHave = (name: string): { ok: boolean; how: string } => {
  const n = name.toLowerCase(); const v = (id: string) => { const d = docById(id); const left = d?.validTill ? daysTo(d.validTill) : 999; return { ok: !!d && left > 0, how: d ? `${d.name}${d.validTill ? ` – valid ${left} more days` : ''}` : '' }; };
  if (/9001/.test(n)) return v('D-ISO9'); if (/14001/.test(n)) return v('D-ISO14');
  if (/ipc/.test(n)) return { ok: true, how: 'IPC-A-610 trained operators list (Site 1)' };
  if (/dgca|type cert/.test(n)) { const r = v('D-DGCA'); return { ok: r.ok, how: r.how + ' (renew before delivery)' }; }
  if (/factory/.test(n)) return { ok: true, how: 'Factory licences for all 3 sites (Site 1 renewal due in 12 days – file it first)' };
  const d = DOCS.find((x) => x.name.toLowerCase().includes(n.split(' ')[0])); return d ? { ok: true, how: d.name } : { ok: false, how: 'Not in your document library' };
};
