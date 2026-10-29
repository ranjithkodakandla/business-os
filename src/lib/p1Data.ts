// P1/P2 modules: seeded demo data for Aarohan Industries (BOM & production, QC, bank & TDS, expenses, dispatch,
// notifications, documents). Lives in this browser session only (sessionStorage), like the rest of the demo.
import { useSyncExternalStore } from 'react';

export type Role = 'Owner' | 'Sales' | 'Stores' | 'Accounts' | 'HR' | 'Supervisor';
export type BomNode = { code: string; name: string; qty: number; unit: string; cost: number; make: boolean; stock: number; children?: BomNode[] };
export type WorkOrder = { id: string; product: string; qty: number; stage: 'Planned' | 'Released' | 'In progress' | 'QC' | 'Done'; start: string; due: string; line: string; planCost: number; actualCost: number; progress: number };
export type Inspection = { id: string; type: 'GRN' | 'In-process' | 'Final'; ref: string; item: string; supplier: string; lot: string; sample: number; passed: number; rejected: number; defect: string; date: string; status: 'Passed' | 'Rejected' | 'On hold' | 'Pending' };
export type Ncr = { id: string; lot: string; item: string; defect: string; qty: number; source: string; owner: string; capa: string; status: 'Open' | 'CAPA in progress' | 'Closed'; raised: string };
export type BankTxn = { id: string; date: string; narration: string; amount: number; type: 'Cr' | 'Dr'; match?: string; matchType?: string; confidence?: number; status: 'Matched' | 'Suggested' | 'Unmatched' };
export type TdsEntry = { id: string; section: '194C' | '194J' | '194Q' | '194I'; party: string; pan: string; billDate: string; amount: number; rate: number; tds: number; deposited: boolean; challan?: string };
export type Expense = { id: string; emp: string; category: string; desc: string; amount: number; date: string; receipt: string; ocr: string; status: 'Submitted' | 'Approved' | 'Rejected' | 'Paid via payroll'; approver: string; gst?: number };
export type Dispatch = { id: string; so: string; customer: string; city: string; items: string; qty: string; boxes: number; weightKg: number; vehicle: string; driver: string; lr: string; transporter: string; date: string; status: 'Planned' | 'Packed' | 'Loaded' | 'In transit' | 'Delivered' | 'POD received'; eta: string; freight: number };
export type Note = { id: string; at: string; title: string; text: string; module: string; to: string; roles: Role[]; tone: 'red' | 'amber' | 'green' | 'blue'; read: boolean };
export type Due = { date: string; title: string; kind: string; amount?: string; roles: Role[] };
export type Doc = { id: string; name: string; type: string; linked: string; lot?: string; size: string; by: string; date: string; tags: string[] };

export type P1State = { boms: BomNode[]; wos: WorkOrder[]; insp: Inspection[]; ncrs: Ncr[]; bank: BankTxn[]; bankRecon: { bank: string; month: string; done: boolean }; tds: TdsEntry[]; exp: Expense[]; disp: Dispatch[]; notes: Note[]; dues: Due[]; docs: Doc[]; prefs: Record<Role, Record<string, boolean>>; rejTrend: { m: string; ppm: number; rejects: number }[] };

const housing: BomNode = { code: 'FG-A17', name: 'A-17 Pump housing assembly', qty: 1, unit: 'nos', cost: 1840, make: true, stock: 64, children: [
  { code: 'SA-A17-C', name: 'Machined housing casting', qty: 1, unit: 'nos', cost: 920, make: true, stock: 120, children: [
    { code: 'RM-CI-FC250', name: 'Grey CI casting FC250 (raw)', qty: 1, unit: 'nos', cost: 610, make: false, stock: 180 },
    { code: 'CS-INSERT-M8', name: 'Threaded insert M8', qty: 4, unit: 'nos', cost: 9, make: false, stock: 900 } ] },
  { code: 'SA-A17-S', name: 'Shaft & bearing sub-assembly', qty: 1, unit: 'nos', cost: 540, make: true, stock: 40, children: [
    { code: 'RM-EN8-32', name: 'EN8 round bar Ø32', qty: 0.6, unit: 'kg', cost: 96, make: false, stock: 140 },
    { code: 'CP-6204', name: 'Bearing 6204 ZZ', qty: 2, unit: 'nos', cost: 118, make: false, stock: 260 },
    { code: 'CP-SEAL-20', name: 'Oil seal 20×35×7', qty: 1, unit: 'nos', cost: 42, make: false, stock: 75 } ] },
  { code: 'CP-GSK65', name: 'Gasket 65 NB', qty: 2, unit: 'nos', cost: 38, make: false, stock: 300 },
  { code: 'CS-BOLT-M10', name: 'Hex bolt M10×40 (8.8)', qty: 6, unit: 'nos', cost: 7, make: false, stock: 2400 },
  { code: 'PK-BOX-A17', name: 'Corrugated box 5-ply', qty: 1, unit: 'nos', cost: 34, make: false, stock: 150 } ] };
const bracket: BomNode = { code: 'FG-B04', name: 'B-04 Motor mounting bracket', qty: 1, unit: 'nos', cost: 412, make: true, stock: 210, children: [
  { code: 'RM-MS-2MM', name: 'MS sheet 2 mm', qty: 2.4, unit: 'kg', cost: 66, make: false, stock: 820 },
  { code: 'CS-BOLT-M10', name: 'Hex bolt M10×40 (8.8)', qty: 4, unit: 'nos', cost: 7, make: false, stock: 2400 },
  { code: 'SV-POWDER', name: 'Powder coating (job work)', qty: 1, unit: 'nos', cost: 38, make: false, stock: 0 } ] };

const R = (...r: Role[]) => r;
const seed = (): P1State => ({
  boms: [housing, bracket],
  wos: [
    { id: 'WO-2291', product: 'A-17 Pump housing assembly', qty: 300, stage: 'In progress', start: '2026-10-26', due: '2026-10-31', line: 'Line 1 · CNC-2', planCost: 552000, actualCost: 318400, progress: 58 },
    { id: 'WO-2292', product: 'B-04 Motor mounting bracket', qty: 800, stage: 'QC', start: '2026-10-24', due: '2026-10-29', line: 'Line 3 · Press', planCost: 329600, actualCost: 341200, progress: 92 },
    { id: 'WO-2293', product: 'A-17 Pump housing assembly', qty: 150, stage: 'Released', start: '2026-10-30', due: '2026-11-04', line: 'Line 1 · VMC-1', planCost: 276000, actualCost: 0, progress: 0 },
    { id: 'WO-2294', product: 'C-09 Impeller (bronze)', qty: 400, stage: 'Planned', start: '2026-11-02', due: '2026-11-07', line: 'Line 2 · Lathe', planCost: 188000, actualCost: 0, progress: 0 },
    { id: 'WO-2288', product: 'B-04 Motor mounting bracket', qty: 600, stage: 'Done', start: '2026-10-19', due: '2026-10-23', line: 'Line 3 · Press', planCost: 247200, actualCost: 239900, progress: 100 },
  ],
  insp: [
    { id: 'QC-5108', type: 'GRN', ref: 'GRN-3312', item: 'Grey CI casting FC250', supplier: 'Deccan Castings', lot: 'L-88', sample: 80, passed: 66, rejected: 14, defect: 'Porosity', date: '2026-10-27', status: 'On hold' },
    { id: 'QC-5109', type: 'GRN', ref: 'GRN-3315', item: 'Bearing 6204 ZZ', supplier: 'Prime Components', lot: 'L-91', sample: 50, passed: 50, rejected: 0, defect: '—', date: '2026-10-28', status: 'Passed' },
    { id: 'QC-5110', type: 'In-process', ref: 'WO-2291', item: 'Machined housing casting', supplier: 'In-house', lot: 'L-88', sample: 40, passed: 38, rejected: 2, defect: 'Bore oversize', date: '2026-10-28', status: 'Passed' },
    { id: 'QC-5111', type: 'Final', ref: 'WO-2292', item: 'B-04 Motor mounting bracket', supplier: 'In-house', lot: 'L-90', sample: 125, passed: 0, rejected: 0, defect: '—', date: '2026-10-29', status: 'Pending' },
    { id: 'QC-5104', type: 'GRN', ref: 'GRN-3298', item: 'MS sheet 2 mm', supplier: 'Sri Lakshmi Steels', lot: 'L-84', sample: 20, passed: 19, rejected: 1, defect: 'Thickness under', date: '2026-10-22', status: 'Passed' },
    { id: 'QC-5101', type: 'GRN', ref: 'GRN-3290', item: 'Oil seal 20×35×7', supplier: 'Hyderabad Seals', lot: 'L-82', sample: 50, passed: 41, rejected: 9, defect: 'Lip damage', date: '2026-10-18', status: 'Rejected' },
  ],
  ncrs: [
    { id: 'NCR-071', lot: 'L-88', item: 'Grey CI casting FC250', defect: 'Porosity', qty: 14, source: 'Deccan Castings', owner: 'Venkat (QA)', capa: 'Supplier to add degassing step; 100% X-ray next 2 lots', status: 'CAPA in progress', raised: '2026-10-27' },
    { id: 'NCR-069', lot: 'L-82', item: 'Oil seal 20×35×7', defect: 'Lip damage', qty: 9, source: 'Hyderabad Seals', owner: 'Venkat (QA)', capa: 'Debit note raised; packing changed to trays', status: 'Closed', raised: '2026-10-18' },
    { id: 'NCR-070', lot: 'L-86', item: 'B-04 bracket', defect: 'Weld spatter', qty: 22, source: 'In-house · Line 3', owner: 'Suresh (Supervisor)', capa: 'Anti-spatter spray + operator retraining', status: 'Open', raised: '2026-10-24' },
  ],
  rejTrend: [{ m: 'May', ppm: 4100, rejects: 61 }, { m: 'Jun', ppm: 3650, rejects: 55 }, { m: 'Jul', ppm: 3900, rejects: 58 }, { m: 'Aug', ppm: 2800, rejects: 44 }, { m: 'Sep', ppm: 2350, rejects: 37 }, { m: 'Oct', ppm: 3120, rejects: 48 }],
  bank: [
    { id: 'BT-01', date: '2026-10-03', narration: 'NEFT CR-AARAV INTERIORS-INV-1042', amount: 236000, type: 'Cr', match: 'INV-1042', matchType: 'Invoice', confidence: 99, status: 'Matched' },
    { id: 'BT-02', date: '2026-10-05', narration: 'RTGS DR-DECCAN CASTINGS-PB-552', amount: 412500, type: 'Dr', match: 'PB-552', matchType: 'Supplier bill', confidence: 97, status: 'Matched' },
    { id: 'BT-03', date: '2026-10-07', narration: 'GST PMT CPIN 26101000233', amount: 184320, type: 'Dr', match: 'GSTR-3B Sep', matchType: 'Tax', confidence: 95, status: 'Matched' },
    { id: 'BT-04', date: '2026-10-09', narration: 'UPI CR-KRISHNA BUILDERS', amount: 50000, type: 'Cr', match: 'INV-1047 (part)', matchType: 'Invoice', confidence: 78, status: 'Suggested' },
    { id: 'BT-05', date: '2026-10-12', narration: 'NEFT DR-SRI LAKSHMI STEELS', amount: 168740, type: 'Dr', match: 'PB-560', matchType: 'Supplier bill', confidence: 88, status: 'Suggested' },
    { id: 'BT-06', date: '2026-10-15', narration: 'CHQ 004512 CLG', amount: 27500, type: 'Dr', status: 'Unmatched' },
    { id: 'BT-07', date: '2026-10-18', narration: 'BANK CHGS + GST', amount: 1180, type: 'Dr', status: 'Unmatched' },
    { id: 'BT-08', date: '2026-10-21', narration: 'IMPS CR-MEHTA PROJECTS', amount: 118000, type: 'Cr', match: 'INV-1051', matchType: 'Invoice', confidence: 96, status: 'Matched' },
    { id: 'BT-09', date: '2026-10-25', narration: 'NEFT DR-SALARY OCT ADV', amount: 85000, type: 'Dr', status: 'Unmatched' },
    { id: 'BT-10', date: '2026-10-28', narration: 'INT CR CC A/C', amount: 3420, type: 'Cr', status: 'Unmatched' },
  ],
  bankRecon: { bank: 'HDFC Current A/c ••4417', month: 'October 2026', done: false },
  tds: [
    { id: 'TD-01', section: '194C', party: 'Ganesh Transport Co', pan: 'AAKFG••12K', billDate: '2026-10-06', amount: 48000, rate: 2, tds: 960, deposited: false },
    { id: 'TD-02', section: '194C', party: 'Shakti Powder Coaters (job work)', pan: 'ABVPS••45L', billDate: '2026-10-11', amount: 126000, rate: 1, tds: 1260, deposited: false },
    { id: 'TD-03', section: '194J', party: 'Rao & Associates (CA)', pan: 'AAHFR••88P', billDate: '2026-10-14', amount: 60000, rate: 10, tds: 6000, deposited: false },
    { id: 'TD-04', section: '194J', party: 'QualiTest Labs', pan: 'AACCQ••09D', billDate: '2026-10-20', amount: 22000, rate: 10, tds: 2200, deposited: false },
    { id: 'TD-05', section: '194I', party: 'Plot 14 landlord (Ramakrishna)', pan: 'BQRPR••71M', billDate: '2026-10-01', amount: 95000, rate: 10, tds: 9500, deposited: false },
    { id: 'TD-06', section: '194Q', party: 'Deccan Castings', pan: 'AADCD••30H', billDate: '2026-10-05', amount: 412500, rate: 0.1, tds: 413, deposited: false },
    { id: 'TD-S1', section: '194C', party: 'Ganesh Transport Co', pan: 'AAKFG••12K', billDate: '2026-09-08', amount: 52000, rate: 2, tds: 1040, deposited: true, challan: 'ITNS281 · 07-Oct' },
    { id: 'TD-S2', section: '194J', party: 'Rao & Associates (CA)', pan: 'AAHFR••88P', billDate: '2026-09-15', amount: 60000, rate: 10, tds: 6000, deposited: true, challan: 'ITNS281 · 07-Oct' },
  ],
  exp: [
    { id: 'EX-301', emp: 'Kiran Kumar (Sales)', category: 'Travel', desc: 'Pune customer visit – Volvo bus + auto', amount: 3860, date: '2026-10-22', receipt: 'redbus-ticket.pdf', ocr: 'RedBus · ₹3,860 · 22 Oct · HYD→PNQ', status: 'Submitted', approver: 'Ranjith (Owner)' },
    { id: 'EX-302', emp: 'Suresh (Supervisor)', category: 'Shop consumables', desc: 'Welding gloves & anti-spatter spray', amount: 2140, date: '2026-10-24', receipt: 'bill-2231.jpg', ocr: 'Balaji Hardware · GSTIN 36AAB… · ₹2,140 incl. GST ₹326', status: 'Approved', approver: 'Ranjith (Owner)', gst: 326 },
    { id: 'EX-303', emp: 'Anitha (Accounts)', category: 'Courier', desc: 'Documents to Rao & Associates', amount: 240, date: '2026-10-25', receipt: 'dtdc.jpg', ocr: 'DTDC · ₹240 · 25 Oct', status: 'Paid via payroll', approver: 'Ranjith (Owner)' },
    { id: 'EX-304', emp: 'Kiran Kumar (Sales)', category: 'Meals', desc: 'Customer lunch – Mehta Projects', amount: 4200, date: '2026-10-26', receipt: 'paradise.jpg', ocr: 'Paradise Biryani · ₹4,200 · 4 covers', status: 'Submitted', approver: 'Ranjith (Owner)' },
    { id: 'EX-305', emp: 'Venkat (QA)', category: 'Lab testing', desc: 'Spectro test – lot L-88 castings', amount: 1770, date: '2026-10-27', receipt: 'qualitest.pdf', ocr: 'QualiTest Labs · ₹1,770 incl. GST ₹270', status: 'Approved', approver: 'Ranjith (Owner)', gst: 270 },
  ],
  disp: [
    { id: 'DSP-781', so: 'SO-1186', customer: 'Aarav Interiors', city: 'Hyderabad', items: 'B-04 brackets', qty: '400 nos', boxes: 20, weightKg: 412, vehicle: 'TS 09 UB 4471', driver: 'Mahesh', lr: 'GT-55120', transporter: 'Ganesh Transport Co', date: '2026-10-29', status: 'Loaded', eta: 'Today 5:30 PM', freight: 3200 },
    { id: 'DSP-782', so: 'SO-1190', customer: 'Krishna Builders', city: 'Vijayawada', items: 'A-17 housings', qty: '120 nos', boxes: 120, weightKg: 1380, vehicle: 'AP 16 TX 2208', driver: 'Rafiq', lr: 'VRL-88231', transporter: 'VRL Logistics', date: '2026-10-29', status: 'Packed', eta: '30 Oct', freight: 9400 },
    { id: 'DSP-783', so: 'SO-1192', customer: 'Mehta Projects', city: 'Pune', items: 'A-17 housings + gaskets', qty: '80 nos', boxes: 80, weightKg: 960, vehicle: 'To be assigned', driver: '—', lr: '—', transporter: 'Safexpress', date: '2026-10-29', status: 'Planned', eta: '1 Nov', freight: 14800 },
    { id: 'DSP-779', so: 'SO-1181', customer: 'Sai Engineering', city: 'Warangal', items: 'B-04 brackets', qty: '300 nos', boxes: 15, weightKg: 309, vehicle: 'TS 24 T 9902', driver: 'Ramu', lr: 'GT-55098', transporter: 'Ganesh Transport Co', date: '2026-10-27', status: 'In transit', eta: 'Today', freight: 4100 },
    { id: 'DSP-776', so: 'SO-1177', customer: 'Aarav Interiors', city: 'Hyderabad', items: 'A-17 housings', qty: '60 nos', boxes: 60, weightKg: 690, vehicle: 'TS 09 UB 4471', driver: 'Mahesh', lr: 'GT-55061', transporter: 'Ganesh Transport Co', date: '2026-10-24', status: 'POD received', eta: 'Delivered 24 Oct', freight: 2800 },
    { id: 'DSP-777', so: 'SO-1179', customer: 'Krishna Builders', city: 'Vijayawada', items: 'B-04 brackets', qty: '500 nos', boxes: 25, weightKg: 515, vehicle: 'AP 16 TX 2208', driver: 'Rafiq', lr: 'VRL-88102', transporter: 'VRL Logistics', date: '2026-10-25', status: 'Delivered', eta: 'Delivered 26 Oct', freight: 6200 },
  ],
  notes: [
    { id: 'N-1', at: '09:05', title: 'Lot L-88 on QC hold', text: '14 of 80 castings rejected for porosity – NCR-071 raised against Deccan Castings', module: 'Quality', to: '/quality', roles: R('Owner', 'Stores', 'Supervisor'), tone: 'red', read: false },
    { id: 'N-2', at: '09:20', title: 'TDS for October due 7 Nov', text: '₹20,333 across 6 deductions (194C, 194J, 194I, 194Q) not yet deposited', module: 'Bank & TDS', to: '/bank-tds?tab=TDS', roles: R('Owner', 'Accounts'), tone: 'amber', read: false },
    { id: 'N-3', at: '10:02', title: 'DSP-781 loaded for Aarav Interiors', text: 'TS 09 UB 4471 · LR GT-55120 · ETA 5:30 PM', module: 'Dispatch', to: '/dispatch', roles: R('Owner', 'Stores', 'Supervisor', 'Sales'), tone: 'green', read: false },
    { id: 'N-4', at: '10:40', title: '2 expense claims need approval', text: 'Kiran Kumar · ₹8,060 total (travel, customer lunch)', module: 'Expenses', to: '/expenses', roles: R('Owner', 'Accounts'), tone: 'blue', read: false },
    { id: 'N-5', at: '11:15', title: 'WO-2292 over plan cost by 3.5%', text: 'Rework on weld spatter – NCR-070', module: 'Production', to: '/production?tab=Cost%20vs%20plan', roles: R('Owner', 'Supervisor'), tone: 'amber', read: false },
    { id: 'N-6', at: 'Yesterday', title: '4 bank lines unmatched (HDFC)', text: 'Cheque 004512, bank charges, salary advance, CC interest', module: 'Bank & TDS', to: '/bank-tds', roles: R('Owner', 'Accounts'), tone: 'amber', read: true },
    { id: 'N-7', at: 'Yesterday', title: 'Test certificate uploaded for L-91', text: 'Prime Components – bearing 6204 MTC', module: 'Documents', to: '/documents', roles: R('Owner', 'Stores'), tone: 'blue', read: true },
  ],
  dues: [
    { date: '2026-11-07', title: 'TDS deposit (Oct)', kind: 'Income tax', amount: '₹20,333', roles: R('Owner', 'Accounts') },
    { date: '2026-11-11', title: 'GSTR-1 (Oct)', kind: 'GST', roles: R('Owner', 'Accounts') },
    { date: '2026-11-15', title: 'PF & ESI (Oct wages)', kind: 'Payroll', amount: '₹1.42 lakh', roles: R('Owner', 'Accounts', 'HR') },
    { date: '2026-11-20', title: 'GSTR-3B (Oct)', kind: 'GST', roles: R('Owner', 'Accounts') },
    { date: '2026-11-30', title: 'Factory licence renewal', kind: 'Licence', roles: R('Owner') },
    { date: '2027-01-31', title: 'TDS return 26Q (Q3)', kind: 'Income tax', roles: R('Owner', 'Accounts') },
  ],
  docs: [
    { id: 'DOC-201', name: 'MTC – Grey CI FC250 – Lot L-88.pdf', type: 'Test certificate', linked: 'GRN-3312 · Deccan Castings', lot: 'L-88', size: '412 KB', by: 'Venkat (QA)', date: '2026-10-27', tags: ['L-88', 'casting', 'FC250'] },
    { id: 'DOC-202', name: 'Spectro report – QualiTest – L-88.pdf', type: 'Lab report', linked: 'NCR-071', lot: 'L-88', size: '238 KB', by: 'Venkat (QA)', date: '2026-10-28', tags: ['L-88', 'chemistry'] },
    { id: 'DOC-203', name: 'Drawing A-17 housing Rev D.pdf', type: 'Drawing', linked: 'FG-A17 · BOM', size: '1.8 MB', by: 'Design', date: '2026-08-12', tags: ['A-17', 'drawing'] },
    { id: 'DOC-204', name: 'MTC – Bearing 6204 – Lot L-91.pdf', type: 'Test certificate', linked: 'GRN-3315 · Prime Components', lot: 'L-91', size: '190 KB', by: 'Stores', date: '2026-10-28', tags: ['L-91', 'bearing'] },
    { id: 'DOC-205', name: 'Rate contract – Deccan Castings FY26-27.pdf', type: 'Contract', linked: 'Supplier · Deccan Castings', size: '644 KB', by: 'Ranjith', date: '2026-04-02', tags: ['contract'] },
    { id: 'DOC-206', name: 'POD – DSP-776 – Aarav Interiors.jpg', type: 'Proof of delivery', linked: 'DSP-776 · SO-1177', size: '1.1 MB', by: 'Driver app', date: '2026-10-24', tags: ['POD'] },
    { id: 'DOC-207', name: 'ISO 9001 certificate 2025-28.pdf', type: 'Certificate', linked: 'Company', size: '520 KB', by: 'Ranjith', date: '2025-06-10', tags: ['ISO'] },
    { id: 'DOC-208', name: 'Inspection plan – A-17 housing.xlsx', type: 'Inspection plan', linked: 'FG-A17 · QC', size: '88 KB', by: 'Venkat (QA)', date: '2026-09-02', tags: ['A-17', 'QC'] },
  ],
  prefs: {
    Owner: { Quality: true, 'Bank & TDS': true, Dispatch: true, Expenses: true, Production: true, Documents: true, 'Daily WhatsApp brief': true },
    Sales: { Dispatch: true, 'Daily WhatsApp brief': true }, Stores: { Quality: true, Dispatch: true, Documents: true, Production: true },
    Accounts: { 'Bank & TDS': true, Expenses: true, 'Daily WhatsApp brief': true }, HR: { Expenses: true }, Supervisor: { Production: true, Quality: true, Dispatch: true, 'Daily WhatsApp brief': true },
  },
});

const KEY = 'bw-p1-v1';
let state: P1State = (() => { try { const s = sessionStorage.getItem(KEY); if (s) return JSON.parse(s) as P1State; } catch { /* first visit */ } return seed(); })();
const subs = new Set<() => void>();
export const getP1 = () => state;
export function updateP1(fn: (d: P1State) => void) { const d = structuredClone(state); fn(d); state = d; try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* quota */ } subs.forEach((f) => f()); }
export const resetP1 = () => { state = seed(); try { sessionStorage.removeItem(KEY); } catch { /* */ } subs.forEach((f) => f()); };
export const useP1 = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getP1);

/* ---------- P1 module list (keys match src/lib/nav.ts + rbac SCOPE; roles here are informational) ---------- */
export const P1_MODULES = [
  { key: 'bom', to: '/production', label: 'BOM & Production', desc: 'BOMs, MRP, work orders, cost', roles: R('Owner', 'Stores', 'Supervisor') },
  { key: 'qc', to: '/quality', label: 'Quality control', desc: 'Inspections, NCR/CAPA, supplier score', roles: R('Owner', 'Stores', 'Supervisor') },
  { key: 'bank', to: '/bank-tds', label: 'Bank & TDS', desc: 'Bank reconciliation, TDS register, 26Q', roles: R('Owner', 'Accounts') },
  { key: 'expenses', to: '/expenses', label: 'Expenses', desc: 'Claims, receipts, approvals, payout', roles: R('Owner', 'Accounts', 'HR', 'Sales', 'Stores', 'Supervisor') },
  { key: 'dispatch', to: '/dispatch', label: 'Dispatch', desc: 'Dispatch plan, packing, LR, POD', roles: R('Owner', 'Stores', 'Supervisor', 'Sales') },
  { key: 'notifications', to: '/notifications', label: 'Notifications', desc: 'Alerts, compliance calendar, daily brief', roles: R('Owner', 'Sales', 'Stores', 'Accounts', 'HR', 'Supervisor') },
  { key: 'documents', to: '/documents', label: 'Documents', desc: 'Certificates, drawings, PODs', roles: R('Owner', 'Stores', 'Accounts', 'Supervisor') },
] as const;
export const canSee = (role: string, key: string) => role === 'Owner' || !!P1_MODULES.find((m) => m.key === key)?.roles.includes(role as Role);

/* ---------- derived ---------- */
export const flatBom = (n: BomNode, mult = 1, lvl = 0, out: { n: BomNode; lvl: number; need: number }[] = []) => { out.push({ n, lvl, need: n.qty * mult }); n.children?.forEach((c) => flatBom(c, n.qty * mult, lvl + 1, out)); return out; };
export function mrp(code: string, qty: number) {
  const b = state.boms.find((x) => x.code === code) || state.boms[0];
  const rows = flatBom(b, qty).filter((x) => !x.n.make && x.lvl > 0);
  const agg = new Map<string, { n: BomNode; need: number }>();
  rows.forEach((r) => { const a = agg.get(r.n.code); if (a) a.need += r.need; else agg.set(r.n.code, { n: r.n, need: r.need }); });
  return [...agg.values()].map(({ n, need }) => ({ code: n.code, name: n.name, unit: n.unit, need: +need.toFixed(1), stock: n.stock, short: Math.max(0, +(need - n.stock).toFixed(1)), cost: n.cost }));
}
export const supplierScore = (s: P1State) => {
  const by = new Map<string, { sample: number; rej: number; lots: number }>();
  s.insp.filter((i) => i.type === 'GRN').forEach((i) => { const a = by.get(i.supplier) || { sample: 0, rej: 0, lots: 0 }; a.sample += i.sample; a.rej += i.rejected; a.lots++; by.set(i.supplier, a); });
  return [...by.entries()].map(([sup, a]) => { const rr = a.sample ? (a.rej / a.sample) * 100 : 0; return { sup, lots: a.lots, rej: +rr.toFixed(1), score: Math.round(Math.max(0, 100 - rr * 2.5)) }; }).sort((x, y) => x.score - y.score);
};
