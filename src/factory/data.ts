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
  S2: { name: 'Site 2 · Hosur, Tamil Nadu', short: 'Site 2 Hosur', makes: 'Drone assembly and flight testing' },
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

/* ── 2. Licence & approval register – per site, local + state government ── */
export type RStatus = 'Not started' | 'Pack ready – needs your OK' | 'Filed – awaiting authority';
export type Renewal = { id: string; docId: string; site: SiteId | 'All'; kind: string; authority: string; level: 'State' | 'Local' | 'Central' | 'Bank'; number: string; issued: string;
  owner: string; approver: string; status: RStatus; fee: number; leadDays: number; agentNote: string; checklist: { label: string; docId?: string; ok?: boolean }[] };
const CK = {
  factory: (s: SiteId) => [{ label: 'Form 2 – renewal application (auto-filled)', ok: true }, { label: 'Approved building plan + occupancy', docId: `D-OCC${s[1]}` }, { label: 'Structural stability certificate', docId: `D-STAB${s[1]}` }, { label: 'PF and ESI challans, last 6 months', docId: 'D-PFESI' }, { label: 'Worker count from muster (auto)', ok: true }],
  fire: (s: SiteId) => [{ label: 'Extinguisher refill certificate', ok: true }, { label: 'Hydrant / sprinkler test report', ok: s !== 'S1' }, { label: 'Approved building plan + occupancy', docId: `D-OCC${s[1]}` }, { label: 'Previous fire NOC', docId: `D-FIRE${s[1]}` }],
  pcb: (s: SiteId) => [{ label: 'Online CTO renewal form (auto-filled)', ok: true }, { label: 'Stack / ambient monitoring report (last quarter)', ok: s === 'S3' }, { label: 'Hazardous waste returns (Form 4)', ok: true }, { label: 'Factory licence', docId: `D-FL${s[1]}` }, { label: 'CA certificate of capital investment', docId: 'D-TO' }],
  elec: (s: SiteId) => [{ label: 'Annual inspection report by licensed contractor', ok: s !== 'S2' }, { label: 'Earthing test results', ok: true }, { label: 'Previous electrical safety certificate', docId: `D-EL${s[1]}` }],
  trade: (s: SiteId) => [{ label: 'Property tax receipt (current year)', ok: true }, { label: 'GST registration', docId: 'D-GST' }, { label: 'Previous trade licence', docId: `D-TL${s[1]}` }],
  clra: (s: SiteId) => [{ label: 'Form IV – licence renewal (auto-filled)', ok: true }, { label: 'Agency list with RC numbers', ok: true }, { label: 'Muster + wage register, last 6 months', ok: true }, { label: 'PF and ESI challans', docId: 'D-PFESI' }, { label: 'Factory licence', docId: `D-FL${s[1]}` }],
  lift: (s: SiteId) => [{ label: 'Lift maintenance contract (AMC)', ok: true }, { label: 'Load test report', ok: false }, { label: 'Previous lift licence', docId: `D-LIFT${s[1]}` }],
  wm: (s: SiteId) => [{ label: 'Calibration certificates – 6 weighing scales', ok: s !== 'S3' }, { label: 'Previous W&M verification', docId: `D-WM${s[1]}` }],
};
type Seed = [id: string, docId: string, site: SiteId | 'All', kind: string, name: string, authority: string, level: Renewal['level'], number: string, issuedAgo: number, days: number, owner: string, status: RStatus, fee: number, lead: number, note: string, ck: Renewal['checklist']];
const SEEDS: Seed[] = [
  ['RN-01', 'D-CLRA3', 'S3', 'Contract labour licence (CLRA)', 'Contract labour licence (CLRA) – Site 3', 'Labour Dept, Telangana', 'State', 'CLRA/MDK/2024/0412', 365, -3, 'Sunitha (HR)', 'Pack ready – needs your OK', 7500, 30, 'Expired 3 days ago. 60 contract workers at Site 3 are not covered – a labour inspection now means a penalty. Renewal form, agency list and 6 months muster are ready.', CK.clra('S3')],
  ['RN-02', 'D-FIRE3', 'S3', 'Fire NOC', 'Fire NOC – Site 3', 'Telangana Fire Services', 'State', 'TSFS/MDK/NOC/2025/1187', 365, 6, 'Prakash (Site 3 head)', 'Pack ready – needs your OK', 18000, 15, 'Expires in 6 days. Extinguisher refill certificate (12 Oct) and hydrant test report attached. Needed in the AP FiberGrid tender too.', CK.fire('S3')],
  ['RN-03', 'D-FL1', 'S1', 'Factory licence', 'Factory licence – Site 1', 'Factories Dept, Telangana', 'State', 'TS/HYD/FL/18842', 365 * 5, 12, 'Mahesh (Site 1 head)', 'Not started', 42000, 30, 'Expires in 12 days, but the department needs about 30 days. Apply this week. Worker count (102) is below the licence limit (150).', CK.factory('S1')],
  ['RN-04', 'D-SOLV', 'All', 'Bank solvency certificate', 'Bank solvency certificate (₹5 Cr)', 'HDFC Bank (branch)', 'Bank', 'HDFC/SOLV/26/0931', 180, 21, 'Padma (Accounts)', 'Not started', 1180, 5, 'Expires in 21 days, before the Krishi drone bid closes. Request letter drafted.', [{ label: 'Request letter on letterhead (drafted)', ok: true }, { label: 'Audited balance sheet', docId: 'D-ITR' }]],
  ['RN-05', 'D-PCB3', 'S3', 'Pollution Board CTO', 'Pollution Board consent to operate (CTO) – Site 3', 'TS Pollution Control Board', 'State', 'TSPCB/CTO/MDK/2023/552', 365 * 3, 24, 'Prakash (Site 3 head)', 'Not started', 25000, 45, 'Expires in 24 days; the board usually takes 45. Already late – file now and keep the filing receipt for tenders.', CK.pcb('S3')],
  ['RN-06', 'D-HT1', 'S1', 'Electricity HT sanction', 'Electricity HT connection sanction (500 kVA) – Site 1', 'TSSPDCL', 'State', 'TSSPDCL/HT/CHP/2291', 365 * 2, 40, 'Mahesh (Site 1 head)', 'Not started', 0, 20, 'Sanction review in 40 days. Max demand last 3 months was 462 kVA (92% of 500) – consider a load increase with the renewal.', CK.elec('S1')],
  ['RN-07', 'D-DGCA', 'S2', 'Drone type certificate', 'Drone type certificate – SK-Agri 10L (Site 2)', 'DGCA (Digital Sky)', 'Central', 'DGCA/TC/AGRI/0177', 365 * 2, 55, 'Arjun (Site 2 head)', 'Not started', 0, 30, 'Type certificate renewal in 55 days. Flight-test logs from Site 2 are up to date.', CK.elec('S2').slice(0, 0).concat([{ label: 'Flight-test logs (auto from Site 2)', ok: true }, { label: 'QA manual rev 4', ok: true }])],
  ['RN-08', 'D-FIRE2', 'S2', 'Fire NOC', 'Fire NOC – Site 2', 'TN Fire & Rescue Services, Krishnagiri', 'State', 'TNFRS/KGI/NOC/2025/0638', 330, 34, 'Arjun (Site 2 head)', 'Not started', 15000, 30, 'Expires in 34 days. LiPo battery store was added in June – the NOC must now mention it, so a site inspection is likely. Start now.', CK.fire('S2')],
  ['RN-09', 'D-PCB2', 'S2', 'Pollution Board CTO', 'TNPCB consent to operate (CTO) – Site 2', 'TN Pollution Control Board, Hosur', 'State', 'TNPCB/HSR/CTO/2024/2210', 365 * 2, 47, 'Arjun (Site 2 head)', 'Not started', 22000, 45, 'Expires in 47 days and TNPCB takes about 45. Stack monitoring report for last quarter is missing – asked the lab (simulated).', CK.pcb('S2')],
  ['RN-10', 'D-TL2', 'S2', 'Trade licence', 'Trade licence – Site 2', 'Hosur City Municipal Corporation', 'Local', 'HCMC/TL/2026/4471', 335, 30, 'Padma (Accounts)', 'Not started', 6400, 15, 'Due on 31 Mar cycle, renews in 30 days. Property tax already paid.', CK.trade('S2')],
  ['RN-11', 'D-EL2', 'S2', 'Electrical safety', 'Electrical safety certificate (CEIG) – Site 2', 'Chief Electrical Inspector, Tamil Nadu', 'State', 'CEIG/TN/HSR/88213', 365, 68, 'Arjun (Site 2 head)', 'Not started', 9500, 30, 'Due in 68 days. Annual inspection by the licensed contractor is not booked yet.', CK.elec('S2')],
  ['RN-12', 'D-WM3', 'S3', 'Weights & measures', 'Weights & measures verification – Site 3', 'Legal Metrology, Telangana', 'State', 'LM/MDK/2025/3310', 365, 18, 'Prakash (Site 3 head)', 'Not started', 3000, 10, 'Expires in 18 days. 2 of 6 dispatch scales are past calibration – book the lab first.', CK.wm('S3')],
  ['RN-13', 'D-LIFT1', 'S1', 'Lift licence', 'Goods lift licence – Site 1', 'Electrical Inspectorate, Telangana', 'State', 'EI/LIFT/HYD/7712', 365, 83, 'Mahesh (Site 1 head)', 'Not started', 2500, 20, 'Due in 83 days. Load test report is due with the AMC visit next month.', CK.lift('S1')],
  ['RN-14', 'D-TL1', 'S1', 'Trade licence', 'Trade licence – Site 1', 'GHMC, Hyderabad', 'Local', 'GHMC/TL/CHP/2026/1092', 330, 35, 'Padma (Accounts)', 'Not started', 8200, 15, 'Renews in 35 days. Nothing missing.', CK.trade('S1')],
  ['RN-15', 'D-CLRA2', 'S2', 'Contract labour licence (CLRA)', 'Contract labour licence (CLRA) – Site 2', 'Labour Dept, Tamil Nadu', 'State', 'CLRA/KGI/2025/0921', 300, 74, 'Sunitha (HR)', 'Not started', 6000, 30, 'Due in 74 days. Contract headcount rose to 58 – licence limit is 60, apply for 80 with the renewal.', CK.clra('S2')],
  ['RN-16', 'D-FL2', 'S2', 'Factory licence', 'Factory licence – Site 2', 'Directorate of Industrial Safety & Health, TN', 'State', 'DISH/KGI/FL/30458', 365 * 2, 400, 'Arjun (Site 2 head)', 'Not started', 38000, 30, 'Valid for over a year. Nothing to do.', CK.factory('S2')],
  ['RN-17', 'D-FL3', 'S3', 'Factory licence', 'Factory licence – Site 3', 'Factories Dept, Telangana', 'State', 'TS/MDK/FL/09931', 365 * 3, 190, 'Prakash (Site 3 head)', 'Not started', 30000, 30, 'Valid till next year.', CK.factory('S3')],
  ['RN-18', 'D-OCC1', 'S1', 'Building / occupancy', 'Building occupancy certificate – Site 1', 'HMDA', 'Local', 'HMDA/OC/2019/6634', 365 * 7, 9999, 'Mahesh (Site 1 head)', 'Not started', 0, 0, 'Permanent – kept for tenders and fire NOC.', []],
  ['RN-19', 'D-EL3', 'S3', 'Electrical safety', 'Electrical safety certificate – Site 3', 'Electrical Inspectorate, Telangana', 'State', 'EI/MDK/2025/4410', 300, 58, 'Prakash (Site 3 head)', 'Not started', 7000, 30, 'Due in 58 days. Inspection contractor booked for 20 Nov (simulated).', CK.elec('S3')],
];
// Register entries add their certificates to the library, so tenders and checklists can reuse them.
for (const x of SEEDS) if (!docById(x[1])) DOCS.push({ id: x[1], name: x[4], group: 'Approvals', site: x[2] === 'All' ? undefined : x[2], validTill: x[9] >= 9999 ? undefined : iso(x[9]) });
for (const [i, n] of [['1', 'Site 1'], ['2', 'Site 2'], ['3', 'Site 3']]) {
  for (const [k, l] of [['OCC', 'Building plan + occupancy certificate'], ['STAB', 'Structural stability certificate'], ['WM', 'Weights & measures verification'], ['LIFT', 'Lift licence'], ['EL', 'Electrical safety certificate'], ['TL', 'Trade licence'], ['FIRE', 'Fire NOC']])
    if (!docById(`D-${k}${i}`) && !(k === 'LIFT' && i !== '1') && !(k === 'STAB' && i === '2')) DOCS.push({ id: `D-${k}${i}`, name: `${l} – ${n}`, group: 'Approvals', site: `S${i}` as SiteId, validTill: k === 'STAB' ? iso(200) : k === 'OCC' ? undefined : iso(150) });
}
export const RENEWALS: Renewal[] = SEEDS.map(([id, docId, site, kind, , authority, level, number, ago, days, owner, status, fee, leadDays, agentNote, checklist]) => {
  if (days < 9999) { const d = docById(docId); if (d) d.validTill = iso(days); }
  return { id, docId, site, kind, authority, level, number, issued: iso(Math.min(days, 365) - ago), owner, approver: 'Ranjith', status, fee, leadDays, agentNote, checklist };
});
/** Reminder ladder: who gets nudged at 90/60/30/7 days before expiry (all simulated). */
export const LADDER = [
  { at: 90, ch: 'In-app', to: 'owner' }, { at: 60, ch: 'WhatsApp', to: 'owner' }, { at: 30, ch: 'Email + WhatsApp', to: 'owner and Ranjith' }, { at: 7, ch: 'WhatsApp + call', to: 'Ranjith (escalated)' },
] as const;
export const remindersSent = (left: number) => LADDER.filter((l) => left <= l.at);
export const siteMatch = (q: string): SiteId | undefined => /hosur|site ?2|drone/.test(q) ? 'S2' : /cherlapally|site ?1/.test(q) ? 'S1' : /medak|site ?3|packag/.test(q) ? 'S3' : undefined;

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
export type Crew = { site: SiteId; ft: number; contract: number; presentFt: number; presentContract: number; agency: string; shifts: string; daily: number; presentDaily: number; dailyRate: number; need?: string };
export const CREW: Crew[] = [
  { site: 'S1', ft: 32, contract: 70, presentFt: 30, presentContract: 64, agency: 'Sri Ganesh Manpower', shifts: '2 shifts', daily: 10, presentDaily: 10, dailyRate: 620 },
  { site: 'S2', ft: 24, contract: 45, presentFt: 23, presentContract: 38, agency: 'Skyline Staffing', shifts: '1 shift', daily: 6, presentDaily: 5, dailyRate: 650 },
  { site: 'S3', ft: 14, contract: 60, presentFt: 14, presentContract: 57, agency: 'Medak Labour Co-op', shifts: '3 shifts', daily: 20, presentDaily: 12, dailyRate: 600, need: '8 daily-wage loaders short for the 3 Pacific Pack trucks leaving at 6 pm' },
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
  groups: Record<string, { pick?: number; po?: string; sent?: boolean }>; updates: Record<string, string>; agentsOff: Record<string, boolean>; booked: Record<string, boolean>;
};
const KEY = 'bos-factory-v1';
const blank = (): FxState => ({ renewals: {}, answers: {}, packs: {}, groups: {}, updates: {}, agentsOff: {}, booked: {} });
let st: FxState = (() => { try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return blank(); } })();
const subs = new Set<() => void>();
export const fx = { get: () => st, set: (fn: (d: FxState) => void) => { const d = structuredClone(st); fn(d); st = d; localStorage.setItem(KEY, JSON.stringify(st)); subs.forEach((f) => f()); }, reset: () => { st = blank(); localStorage.removeItem(KEY); subs.forEach((f) => f()); } };
export const useFx = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => st);

/* ── Derived views (shared by screens and chat) ── */
export const renewalStatus = (s: FxState, r: Renewal) => s.renewals[r.id] || r.status;
export const renewalRows = (s: FxState) => RENEWALS.filter((r) => docById(r.docId)?.validTill).map((r) => { const d = docById(r.docId)!; const left = daysTo(d.validTill!); return { r, d, left, status: renewalStatus(s, r), late: left - r.leadDays < 0, overdue: left < 0, checklist: r.checklist.map((c) => { const cd = c.docId ? docById(c.docId) : undefined; return { ...c, have: c.docId ? !!cd && (!cd.validTill || daysTo(cd.validTill) > 0 || c.docId === r.docId) : !!c.ok }; }) }; }).sort((a, b) => a.left - b.left);
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
