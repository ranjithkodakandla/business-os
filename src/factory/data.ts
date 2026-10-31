/** Factory demo data and store (fictional group: Shakti Electro-Pack Pvt Ltd). Dates are relative to today so the demo never goes stale. */
import { useSyncExternalStore } from 'react';

const DAY = 864e5;
const today0 = () => { const d = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()) + 'T00:00:00'); return d; };
export const TODAY = today0();
export const iso = (n: number) => { const d = new Date(+TODAY + n * DAY); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const daysTo = (isoDate: string) => Math.round((+new Date(isoDate + 'T00:00:00') - +TODAY) / DAY);
export const fmtD = (isoDate: string) => new Date(isoDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const lakh = (n: number) => n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : `₹${(n / 1e5).toFixed(2)} L`;

export const COMPANY = { name: 'Shakti Electro-Pack Pvt Ltd', owner: 'Ranjith', gstin: '36AAKCS7741M1Z3 (fictional)', udyam: 'UDYAM-TS-02-0049217 (fictional)' };
export type SiteId = 'S1' | 'S2' | 'S3';
export const SITES: Record<SiteId, { name: string; short: string; makes: string }> = {
  S1: { name: 'Site 1 · Cherlapally, Hyderabad', short: 'Site 1 Cherlapally', makes: 'RF and communication modules, PCB assembly' },
  S2: { name: 'Site 2 · Shamshabad, Hyderabad', short: 'Site 2 Shamshabad', makes: 'Drone assembly and flight testing' },
  S3: { name: 'Site 3 · Medak', short: 'Site 3 Medak', makes: 'Corrugated boxes and EPE foam packaging' },
};

/* ── 1. Document library (stored once, reused in every tender) ── */
export type Doc = { id: string; name: string; group: 'Company' | 'Financials' | 'Certifications' | 'Approvals' | 'Experience'; site?: SiteId; validTill?: string; note?: string };
export const DOCS: Doc[] = [
  { id: 'D-PROF', name: 'Company profile (2 pages, with plant photos)', group: 'Company' },
  { id: 'D-INC', name: 'Certificate of incorporation + MoA/AoA', group: 'Company' },
  { id: 'D-GST', name: 'GST registration certificate', group: 'Company' },
  { id: 'D-PAN', name: 'Company PAN card', group: 'Company' },
  { id: 'D-UDYAM', name: 'Udyam (MSME) certificate – Small enterprise', group: 'Company' },
  { id: 'D-TO', name: 'Turnover certificate FY23-24 to FY25-26 (CA signed): ₹18.4 Cr / ₹23.1 Cr / ₹27.6 Cr', group: 'Financials', note: 'Average ₹23.0 Cr' },
  { id: 'D-ITR', name: 'Audited balance sheets + ITR, last 3 years', group: 'Financials' },
  { id: 'D-SOLV', name: 'Bank solvency certificate (₹5 Cr)', group: 'Financials', validTill: iso(21) },
  { id: 'D-ISO9', name: 'ISO 9001:2015 certificate', group: 'Certifications', validTill: iso(240) },
  { id: 'D-ISO14', name: 'ISO 14001:2015 certificate', group: 'Certifications', validTill: iso(310) },
  { id: 'D-IPC', name: 'IPC-A-610 trained operators list (Site 1)', group: 'Certifications', site: 'S1' },
  { id: 'D-DGCA', name: 'Drone type certificate – SK-Agri 10L (Site 2)', group: 'Certifications', site: 'S2', validTill: iso(55) },
  { id: 'D-FL1', name: 'Factory licence – Site 1', group: 'Approvals', site: 'S1', validTill: iso(12) },
  { id: 'D-FL2', name: 'Factory licence – Site 2', group: 'Approvals', site: 'S2', validTill: iso(400) },
  { id: 'D-FL3', name: 'Factory licence – Site 3', group: 'Approvals', site: 'S3', validTill: iso(190) },
  { id: 'D-FIRE3', name: 'Fire NOC – Site 3', group: 'Approvals', site: 'S3', validTill: iso(6) },
  { id: 'D-PCB3', name: 'Pollution Board consent to operate (CTO) – Site 3', group: 'Approvals', site: 'S3', validTill: iso(24) },
  { id: 'D-HT1', name: 'Electricity HT connection sanction (500 kVA) – Site 1', group: 'Approvals', site: 'S1', validTill: iso(40) },
  { id: 'D-CLRA3', name: 'Contract labour licence (CLRA) – Site 3', group: 'Approvals', site: 'S3', validTill: iso(-3) },
  { id: 'D-PFESI', name: 'PF and ESI registration + last 6 months challans', group: 'Company' },
  { id: 'D-EXP', name: 'Work orders + completion certificates (6 similar supplies, last 3 years)', group: 'Experience' },
  { id: 'D-EXPORT', name: 'IEC code + export invoices (Germany, UAE, USA)', group: 'Experience' },
];
export const docById = (id: string) => DOCS.find((d) => d.id === id);

/* ── 2. Approvals and renewals (with approver flow) ── */
export type Renewal = { id: string; docId: string; authority: string; owner: string; approver: string; status: 'Not started' | 'Pack ready – needs your OK' | 'Filed – awaiting authority'; fee: number; leadDays: number; agentNote: string };
export const RENEWALS: Renewal[] = [
  { id: 'RN-01', docId: 'D-CLRA3', authority: 'Labour Dept, Telangana', owner: 'Sunitha (HR)', approver: 'Ranjith', status: 'Pack ready – needs your OK', fee: 7500, leadDays: 30, agentNote: 'Expired 3 days ago. 60 contract workers at Site 3 are not covered – a labour inspection now means a penalty. Renewal form, agency list and 6 months muster are ready.' },
  { id: 'RN-02', docId: 'D-FIRE3', authority: 'Telangana Fire Services', owner: 'Prakash (Site 3 head)', approver: 'Ranjith', status: 'Pack ready – needs your OK', fee: 18000, leadDays: 15, agentNote: 'Expires in 6 days. Extinguisher refill certificate (12 Oct) and hydrant test report attached. Needed in the AP FiberGrid tender too.' },
  { id: 'RN-03', docId: 'D-FL1', authority: 'Factories Dept, Telangana', owner: 'Mahesh (Site 1 head)', approver: 'Ranjith', status: 'Not started', fee: 42000, leadDays: 30, agentNote: 'Expires in 12 days, but the department needs about 30 days. Apply this week. Worker count (102) is below the licence limit (150).' },
  { id: 'RN-04', docId: 'D-SOLV', authority: 'HDFC Bank (branch)', owner: 'Padma (Accounts)', approver: 'Ranjith', status: 'Not started', fee: 1180, leadDays: 5, agentNote: 'Expires in 21 days, before the Krishi drone bid closes. Request letter drafted.' },
  { id: 'RN-05', docId: 'D-PCB3', authority: 'TS Pollution Control Board', owner: 'Prakash (Site 3 head)', approver: 'Ranjith', status: 'Not started', fee: 25000, leadDays: 45, agentNote: 'Expires in 24 days; the board usually takes 45. Already late – file now and keep the filing receipt for tenders.' },
  { id: 'RN-06', docId: 'D-HT1', authority: 'TSSPDCL', owner: 'Mahesh (Site 1 head)', approver: 'Ranjith', status: 'Not started', fee: 0, leadDays: 20, agentNote: 'Sanction review in 40 days. Max demand last 3 months was 462 kVA (92% of 500) – consider a load increase with the renewal.' },
  { id: 'RN-07', docId: 'D-DGCA', authority: 'DGCA (Digital Sky)', owner: 'Arjun (Site 2 head)', approver: 'Ranjith', status: 'Not started', fee: 0, leadDays: 30, agentNote: 'Type certificate renewal in 55 days. Flight-test logs from Site 2 are up to date.' },
];

/* ── 3. Tenders ── */
export type TItem = { id: string; ask: string; docId?: string; answer?: string; hint?: string };
export type Tender = { id: string; name: string; buyer: string; value: number; closes: string; items: TItem[] };
export const TENDERS: Tender[] = [
  { id: 'TN-31', name: 'RF modules for telecom towers', buyer: 'AP FiberGrid Ltd (fictional)', value: 3.8e7, closes: iso(9), items: [
    { id: 'a', ask: 'Company profile', docId: 'D-PROF' }, { id: 'b', ask: 'Incorporation certificate', docId: 'D-INC' }, { id: 'c', ask: 'GST certificate', docId: 'D-GST' }, { id: 'd', ask: 'PAN', docId: 'D-PAN' },
    { id: 'e', ask: 'MSME certificate (for EMD exemption)', docId: 'D-UDYAM' }, { id: 'f', ask: 'Average turnover ≥ ₹15 Cr (last 3 years)', docId: 'D-TO' }, { id: 'g', ask: 'Audited financials, 3 years', docId: 'D-ITR' },
    { id: 'h', ask: 'ISO 9001', docId: 'D-ISO9' }, { id: 'i', ask: 'Valid factory licence of manufacturing unit', docId: 'D-FL1' }, { id: 'j', ask: 'Fire NOC of manufacturing unit', docId: 'D-FIRE3', hint: 'Tender asks for the unit that makes the product – that is Site 1, whose fire NOC is not in the library.' },
    { id: 'k', ask: 'Similar supply experience (2 orders ≥ ₹1 Cr)', docId: 'D-EXP' }, { id: 'l', ask: 'PF/ESI registration', docId: 'D-PFESI' },
    { id: 'm', ask: 'Delivery schedule for 6,000 modules', hint: 'Site 1 does about 1,200 modules a week today' }, { id: 'n', ask: 'Warranty period offered', hint: 'Last 2 bids: 18 months' },
    { id: 'o', ask: 'Unit price and price validity', hint: 'Last quote to a similar buyer: ₹612 per module, 90 days' },
  ] },
  { id: 'TN-32', name: 'Agri-spraying drones – 25 units', buyer: 'Krishi Drone Mission, state agriculture dept (fictional)', value: 1.9e7, closes: iso(26), items: [
    { id: 'a', ask: 'Company profile', docId: 'D-PROF' }, { id: 'b', ask: 'GST certificate', docId: 'D-GST' }, { id: 'c', ask: 'MSME certificate', docId: 'D-UDYAM' }, { id: 'd', ask: 'Turnover certificate', docId: 'D-TO' },
    { id: 'e', ask: 'Bank solvency certificate', docId: 'D-SOLV' }, { id: 'f', ask: 'DGCA type certificate', docId: 'D-DGCA' }, { id: 'g', ask: 'Factory licence of assembly unit', docId: 'D-FL2' }, { id: 'h', ask: 'ISO 9001', docId: 'D-ISO9' },
    { id: 'i', ask: 'Past supply orders', docId: 'D-EXP' }, { id: 'j', ask: 'Pilot training plan for farmers', hint: 'Site 2 ran 3 batches of 10 pilots in 2026' }, { id: 'k', ask: 'Service centres in the state', hint: 'Today: Hyderabad only' },
  ] },
  { id: 'TN-33', name: 'Export packaging – annual rate contract', buyer: 'Nordic Home Appliances AB, Sweden (fictional)', value: 1.1e7, closes: iso(15), items: [
    { id: 'a', ask: 'Company profile', docId: 'D-PROF' }, { id: 'b', ask: 'ISO 9001', docId: 'D-ISO9' }, { id: 'c', ask: 'ISO 14001', docId: 'D-ISO14' }, { id: 'd', ask: 'Factory licence – packaging unit', docId: 'D-FL3' },
    { id: 'e', ask: 'Pollution consent of the unit', docId: 'D-PCB3' }, { id: 'f', ask: 'Export experience', docId: 'D-EXPORT' }, { id: 'g', ask: 'Turnover certificate', docId: 'D-TO' },
    { id: 'h', ask: 'Recycled fibre % in boxes', hint: 'Mill certificate says 62%' }, { id: 'i', ask: 'Monthly capacity for their box sizes', hint: 'Site 3: about 4 lakh boxes a month' },
  ] },
];

/* ── 4. Multi-site purchase needs ── */
export type Need = { id: string; site: SiteId; item: string; qty: number; unit: string; by: string; raisedBy: string };
export const NEEDS: Need[] = [
  { id: 'N-101', site: 'S1', item: 'SMA female connector, gold plated', qty: 5000, unit: 'pcs', by: iso(10), raisedBy: 'Mahesh' },
  { id: 'N-102', site: 'S2', item: 'SMA female connector, gold plated', qty: 800, unit: 'pcs', by: iso(14), raisedBy: 'Arjun' },
  { id: 'N-103', site: 'S1', item: 'RG316 coaxial cable', qty: 2000, unit: 'm', by: iso(10), raisedBy: 'Mahesh' },
  { id: 'N-104', site: 'S1', item: 'Corrugated shipper box 5-ply, 450×350×300', qty: 1500, unit: 'pcs', by: iso(7), raisedBy: 'Mahesh' },
  { id: 'N-105', site: 'S2', item: 'BLDC motor 2212, 920 KV', qty: 120, unit: 'pcs', by: iso(12), raisedBy: 'Arjun' },
  { id: 'N-106', site: 'S2', item: 'LiPo battery 6S 10,000 mAh', qty: 60, unit: 'pcs', by: iso(12), raisedBy: 'Arjun' },
  { id: 'N-107', site: 'S3', item: 'Kraft paper 150 GSM', qty: 8, unit: 't', by: iso(5), raisedBy: 'Prakash' },
  { id: 'N-108', site: 'S3', item: 'Kraft paper 150 GSM', qty: 4, unit: 't', by: iso(9), raisedBy: 'Prakash' },
];
export type Quote = { supplier: string; price: number; days: number; note: string };
export type Group = { id: string; item: string; needs: string[]; qty: number; unit: string; quotes: Quote[]; pick: number; internal?: { from: SiteId; price: number; note: string }; saving: string };
export const GROUPS: Group[] = [
  { id: 'PG-1', item: 'SMA female connector, gold plated', needs: ['N-101', 'N-102'], qty: 5800, unit: 'pcs', pick: 1, saving: 'Ordering 5,800 together crosses the 5,000 price break: ₹38 → ₹34.5 each, saves about ₹20,300.', quotes: [
    { supplier: 'Rasa Connectors, Bengaluru', price: 36, days: 7, note: 'MOQ 1,000' }, { supplier: 'Vega RF Parts, Pune', price: 34.5, days: 8, note: 'Price break at 5,000; 98% on time' }, { supplier: 'Lianfa Trading (import)', price: 29, days: 28, note: 'Too slow for Site 1’s date' }] },
  { id: 'PG-2', item: 'RG316 coaxial cable', needs: ['N-103'], qty: 2000, unit: 'm', pick: 0, saving: 'Same supplier as last 3 orders, price unchanged.', quotes: [
    { supplier: 'Vega RF Parts, Pune', price: 41, days: 8, note: 'Can ship with the connectors – one freight' }, { supplier: 'Coaxis India, Noida', price: 39, days: 12, note: '2 late deliveries this year' }] },
  { id: 'PG-3', item: 'Corrugated shipper box 5-ply, 450×350×300', needs: ['N-104'], qty: 1500, unit: 'pcs', pick: 0, internal: { from: 'S3', price: 31, note: 'Site 3 makes this size; spare capacity on Line 2 this week' }, saving: 'Make it at Site 3 for ₹31 instead of buying at ₹46 – saves ₹22,500 and keeps the money in the group.', quotes: [
    { supplier: 'Site 3 Medak (internal transfer)', price: 31, days: 3, note: 'Internal job – no GST invoice, stock transfer note only' }, { supplier: 'Deccan Corrugators, Hyderabad', price: 46, days: 4, note: 'Outside buy' }] },
  { id: 'PG-4', item: 'BLDC motor 2212 + LiPo 6S battery kit', needs: ['N-105', 'N-106'], qty: 1, unit: 'lot', pick: 0, saving: 'One supplier for both cuts freight and gives one warranty contact.', quotes: [
    { supplier: 'AeroSpark Components, Chennai', price: 812000, days: 10, note: '120 motors @ ₹2,150 + 60 batteries @ ₹9,233; 12-month warranty' }, { supplier: 'SkyCell Power, Delhi', price: 846000, days: 9, note: 'Batteries only cheaper; motors from another vendor' }] },
  { id: 'PG-5', item: 'Kraft paper 150 GSM', needs: ['N-107', 'N-108'], qty: 12, unit: 't', pick: 0, saving: 'Two requests from Site 3 merged into one 12 t truckload – ₹1,500/t less freight.', quotes: [
    { supplier: 'Godavari Paper Mills, Rajahmundry', price: 41500, days: 4, note: 'Per tonne; full truck' }, { supplier: 'Sri Sai Kraft, Sangareddy', price: 43200, days: 2, note: 'Per tonne; 2 trips' }] },
];
export const groupTotal = (g: Group) => { const q = g.quotes[g.pick]; return g.unit === 'lot' ? q.price : q.price * g.qty; };

/* ── 5. Customer orders, QA and mail ── */
export type Mail = { from: string; at: string; text: string; dir: 'in' | 'floor' };
export type Order = { id: string; customer: string; country: string; contact: string; email: string; product: string; qty: number; done: number; qaPass: number; qaInspected: number; ncr?: string; ship: string; lastUpdateDays: number; mails: Mail[] };
export const ORDERS: Order[] = [
  { id: 'EX-2041', customer: 'Kessler Funktechnik GmbH (fictional)', country: 'Germany', contact: 'Klaus Weber', email: 'klaus.weber@kessler-funk.example', product: '868 MHz RF module KF-868', qty: 2400, done: 1630, qaInspected: 1630, qaPass: 1584, ncr: 'NCR-17: solder bridging on lot 3 (46 pcs) – rework done, re-test tomorrow', ship: iso(11), lastUpdateDays: 6, mails: [
    { from: 'Klaus Weber', at: iso(-6), dir: 'in', text: 'Can you confirm the ship date for the remaining modules? Our line starts 20 days from now.' },
    { from: 'Klaus Weber', at: iso(-2), dir: 'in', text: 'Following up – also please send the test report of lot 3.' },
    { from: 'Mahesh (Site 1 floor)', at: iso(-1), dir: 'floor', text: 'Lot 4 SMT done, 1,630 of 2,400 tested. Lot 3 rework finished.' },
    { from: 'QA – Lakshmi', at: iso(0), dir: 'floor', text: 'First-pass yield 97.2%. Lot 3 re-test planned tomorrow 10 am.' }] },
  { id: 'EX-2044', customer: 'Al Noor Agritech LLC (fictional)', country: 'UAE', contact: 'Omar Haddad', email: 'omar@alnoor-agri.example', product: 'SK-Agri 10L spraying drone', qty: 10, done: 7, qaInspected: 7, qaPass: 7, ship: iso(8), lastUpdateDays: 2, mails: [
    { from: 'Omar Haddad', at: iso(-2), dir: 'in', text: 'Please share flight test videos before shipping.' },
    { from: 'Arjun (Site 2 floor)', at: iso(0), dir: 'floor', text: '7 drones flight-tested OK, 3 waiting for motors (PG-4).' }] },
  { id: 'EX-2039', customer: 'Pacific Pack Co (fictional)', country: 'USA', contact: 'Jenna Morris', email: 'jenna@pacificpack.example', product: 'EPE foam inserts, custom', qty: 40000, done: 40000, qaInspected: 40000, qaPass: 39880, ship: iso(1), lastUpdateDays: 1, mails: [
    { from: 'Prakash (Site 3 floor)', at: iso(0), dir: 'floor', text: 'All 40,000 packed in 2 containers, BL tomorrow.' }] },
];
export const draftUpdate = (o: Order) => {
  const pct = Math.round((o.done / o.qty) * 100); const fpy = ((o.qaPass / o.qaInspected) * 100).toFixed(1);
  return `Dear ${o.contact.split(' ')[0]},\n\nStatus of order ${o.id} (${o.qty.toLocaleString('en-IN')} × ${o.product}):\n\n• Produced and tested: ${o.done.toLocaleString('en-IN')} of ${o.qty.toLocaleString('en-IN')} (${pct}%)\n• Quality: first-pass yield ${fpy}%${o.ncr ? `. ${o.ncr.replace(/^NCR-\d+: /, 'One issue found and fixed: ')}` : ''}\n• Planned ship date: ${fmtD(o.ship)}${o.ncr ? '\n• The lot 3 test report will follow after tomorrow’s re-test.' : ''}\n\nWe will update you again in 3 days or sooner if anything changes.\n\nBest regards,\nRanjith\n${COMPANY.name}`;
};

/* ── 6. Workforce (light) ── */
export type Crew = { site: SiteId; ft: number; contract: number; presentFt: number; presentContract: number; agency: string; shifts: string };
export const CREW: Crew[] = [
  { site: 'S1', ft: 32, contract: 70, presentFt: 30, presentContract: 64, agency: 'Sri Ganesh Manpower', shifts: '2 shifts' },
  { site: 'S2', ft: 24, contract: 45, presentFt: 23, presentContract: 38, agency: 'Skyline Staffing', shifts: '1 shift' },
  { site: 'S3', ft: 14, contract: 60, presentFt: 14, presentContract: 57, agency: 'Medak Labour Co-op', shifts: '3 shifts' },
];

/* ── Agents ── */
export const FX_AGENTS = [
  { id: 'compliance', name: 'Renewals watcher', does: 'Checks every licence and certificate daily, prepares the renewal pack 30–45 days before expiry.' },
  { id: 'tender', name: 'Tender assistant', does: 'Reads a tender, fills it from your document library, lists only the questions you must answer.' },
  { id: 'purchase', name: 'Purchase consolidator', does: 'Merges needs from all sites, compares suppliers, checks if a sister site can make it.' },
  { id: 'customer', name: 'Customer update writer', does: 'Collects floor and QA updates per order, drafts the update to the customer.' },
];

/* ── Store (localStorage; only decisions are stored, seed data stays in code) ── */
export type FxState = {
  renewals: Record<string, Renewal['status']>; answers: Record<string, string>; packs: Record<string, 'approved'>;
  groups: Record<string, { pick?: number; po?: string; sent?: boolean }>; updates: Record<string, string>; agentsOff: Record<string, boolean>;
};
const KEY = 'bos-factory-v1';
const blank = (): FxState => ({ renewals: {}, answers: {}, packs: {}, groups: {}, updates: {}, agentsOff: {} });
let st: FxState = (() => { try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return blank(); } })();
const subs = new Set<() => void>();
export const fx = { get: () => st, set: (fn: (d: FxState) => void) => { const d = structuredClone(st); fn(d); st = d; localStorage.setItem(KEY, JSON.stringify(st)); subs.forEach((f) => f()); }, reset: () => { st = blank(); localStorage.removeItem(KEY); subs.forEach((f) => f()); } };
export const useFx = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => st);

/* ── Derived views (shared by screens and chat) ── */
export const renewalStatus = (s: FxState, r: Renewal) => s.renewals[r.id] || r.status;
export const renewalRows = (s: FxState) => RENEWALS.map((r) => { const d = docById(r.docId)!; const left = daysTo(d.validTill!); return { r, d, left, status: renewalStatus(s, r), late: left - r.leadDays < 0 }; }).sort((a, b) => a.left - b.left);
export const tenderView = (s: FxState, t: Tender) => {
  const rows = t.items.map((it) => {
    const d = it.docId ? docById(it.docId) : undefined; const ans = s.answers[`${t.id}.${it.id}`];
    const expires = d?.validTill && d.validTill < t.closes ? d.validTill : undefined;
    const state: 'library' | 'answered' | 'you' | 'expiring' = it.hint && it.docId ? 'you' : d ? (expires ? 'expiring' : 'library') : ans ? 'answered' : 'you';
    return { it, d, ans, expires, state: ans && state === 'you' ? 'answered' as const : state };
  });
  const fromLib = rows.filter((r) => r.state === 'library' || r.state === 'expiring').length;
  return { rows, fromLib, pct: Math.round((fromLib / rows.length) * 100), open: rows.filter((r) => r.state === 'you'), expiring: rows.filter((r) => r.state === 'expiring'), approved: !!s.packs[t.id] };
};
export const groupState = (s: FxState, g: Group) => ({ ...g, pick: s.groups[g.id]?.pick ?? g.pick, po: s.groups[g.id]?.po, sent: s.groups[g.id]?.sent });
export const siteNeeds = (site: SiteId) => NEEDS.filter((n) => n.site === site);
export const updateDue = (s: FxState, o: Order) => !s.updates[o.id] && o.mails.some((m) => m.dir === 'in') && o.lastUpdateDays >= 2;
