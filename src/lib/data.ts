// All data in this file is fictional demo data for "Aarohan Industries" (generic Indian manufacturing & job-work MSME).
export const company = {
  name: 'Aarohan Industries Pvt. Ltd.',
  short: 'Aarohan Industries',
  about: 'Sheet-metal fabrication, machining & assembly · contract manufacturing and job work for OEMs',
  gstin: '36AAMCA4821K1Z6',
  pan: 'AAMCA4821K',
  udyam: 'UDYAM-TS-02-0045671',
  udyamCategory: 'Small enterprise (Manufacturing)',
  cin: 'U26960TG2017PTC118204',
  address: 'Plot 14, IDA Jeedimetla Phase II, Hyderabad, Telangana 500055',
  units: ['All units', 'Jeedimetla Plant', 'Cherlapally Unit 2'],
  owner: { name: 'Riya Reddy', role: 'Managing Director', initials: 'RR' },
  aato: '₹2.9 Cr (FY 2025-26)',
  bank: 'HDFC Bank, Jeedimetla · CA ••4821',
};

export type Customer = {
  id: string; name: string; contact: string; designation: string; phone: string; city: string; area: string;
  gstin: string; stateCode: string; creditLimit: number; creditDays: number; owner: string; segment: string; since: string; whatsapp: boolean;
};
export const customers: Customer[] = [
  { id: 'C01', name: 'Sri Lakshmi Projects', contact: 'Srinivas Rao', designation: 'Managing Partner', phone: '+91 98•••• 4412', city: 'Hyderabad', area: 'Gachibowli', gstin: '36AAKFS7712M1Z3', stateCode: '36', creditLimit: 1000000, creditDays: 30, owner: 'Karthik Varma', segment: 'EPC contractor', since: '2021', whatsapp: true },
  { id: 'C02', name: 'Aarav Interiors', contact: 'Aarav Mehta', designation: 'Principal Designer', phone: '+91 99•••• 2087', city: 'Hyderabad', area: 'Jubilee Hills', gstin: '36ABCPM4410Q1Z8', stateCode: '36', creditLimit: 600000, creditDays: 30, owner: 'Sneha Iyer', segment: 'Project contractor', since: '2022', whatsapp: true },
  { id: 'C03', name: 'UrbanNest Developers', contact: 'Neha Kulkarni', designation: 'Head – Procurement', phone: '+91 90•••• 7731', city: 'Hyderabad', area: 'Kokapet', gstin: '36AAFCU9921H1Z2', stateCode: '36', creditLimit: 0, creditDays: 30, owner: 'Karthik Varma', segment: 'Developer', since: 'Prospect', whatsapp: true },
  { id: 'C04', name: 'Greenfield Builders', contact: 'Mahesh Goud', designation: 'Director', phone: '+91 97•••• 1190', city: 'Hyderabad', area: 'Kompally', gstin: '36AAHFG3381R1Z9', stateCode: '36', creditLimit: 800000, creditDays: 45, owner: 'Imran Khan', segment: 'EPC contractor', since: '2020', whatsapp: true },
  { id: 'C05', name: 'Vasavi Constructions', contact: 'Venkatesh Gupta', designation: 'Proprietor', phone: '+91 94•••• 5523', city: 'Hyderabad', area: 'Kukatpally', gstin: '36AAEFV5520B1Z4', stateCode: '36', creditLimit: 400000, creditDays: 30, owner: 'Imran Khan', segment: 'Contractor', since: '2019', whatsapp: true },
  { id: 'C06', name: 'Deccan Electricals', contact: 'Farhan Ali', designation: 'Owner', phone: '+91 91•••• 3348', city: 'Hyderabad', area: 'Tolichowki', gstin: '36AAJFD1189C1Z7', stateCode: '36', creditLimit: 300000, creditDays: 21, owner: 'Sneha Iyer', segment: 'Panel builder', since: '2023', whatsapp: true },
  { id: 'C07', name: 'Rao & Sons Engineering', contact: 'Prasad Rao', designation: 'Partner', phone: '+91 98•••• 6615', city: 'Warangal', area: 'Hanamkonda Road', gstin: '36AAQFR6612D1Z1', stateCode: '36', creditLimit: 300000, creditDays: 30, owner: 'Karthik Varma', segment: 'Distributor', since: '2018', whatsapp: true },
  { id: 'C08', name: 'Kakatiya Pumps', contact: 'Swathi Reddy', designation: 'Project Manager', phone: '+91 96•••• 8820', city: 'Hanamkonda', area: 'Kazipet', gstin: '36AACCK2298E1Z5', stateCode: '36', creditLimit: 500000, creditDays: 30, owner: 'Sneha Iyer', segment: 'EPC contractor', since: '2022', whatsapp: false },
  { id: 'C09', name: 'Shree Balaji Traders', contact: 'Ramesh Shetty', designation: 'Proprietor', phone: '+91 99•••• 4103', city: 'Bengaluru', area: 'Mysore Road', gstin: '29AAGFS4410K1Z6', stateCode: '29', creditLimit: 400000, creditDays: 30, owner: 'Imran Khan', segment: 'Distributor', since: '2021', whatsapp: true },
  { id: 'C10', name: 'Vertex Automation', contact: 'Arjun Kapoor', designation: 'Projects Lead', phone: '+91 88•••• 0942', city: 'Hyderabad', area: 'HITEC City', gstin: '36AAICV7732L1Z0', stateCode: '36', creditLimit: 0, creditDays: 45, owner: 'Sneha Iyer', segment: 'OEM', since: 'Prospect', whatsapp: true },
  { id: 'C11', name: 'Bhavya Electro Controls', contact: 'Bhavya Jain', designation: 'Founder', phone: '+91 93•••• 2276', city: 'Secunderabad', area: 'Paradise', gstin: '36AAPFB5561G1Z8', stateCode: '36', creditLimit: 350000, creditDays: 30, owner: 'Imran Khan', segment: 'Panel builder', since: '2024', whatsapp: true },
  { id: 'C12', name: 'Nirmaan Infra', contact: 'Rohit Agarwal', designation: 'Admin Head', phone: '+91 70•••• 6658', city: 'Hyderabad', area: 'Madhapur', gstin: '—', stateCode: '36', creditLimit: 0, creditDays: 30, owner: 'Sneha Iyer', segment: 'Corporate', since: 'Prospect', whatsapp: false },
  { id: 'C14', name: 'Kaveri Engineering', contact: 'Lakshmi Narayana', designation: 'Purchase Head', phone: '+91 96•••• 4470', city: 'Patancheru', area: 'IDA Patancheru', gstin: '36AAKFK3307E1Z2', stateCode: '36', creditLimit: 600000, creditDays: 30, owner: 'Karthik Varma', segment: 'Pump OEM', since: 'New – Oct 2026', whatsapp: true },
  { id: 'C13', name: 'Sai Krupa Developers', contact: 'Naveen Chowdary', designation: 'MD', phone: '+91 95•••• 3029', city: 'Hyderabad', area: 'Tellapur', gstin: '—', stateCode: '36', creditLimit: 0, creditDays: 30, owner: 'Karthik Varma', segment: 'Developer', since: 'Prospect', whatsapp: true },
];

export const STAGES = ['New Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const;
export type Stage = (typeof STAGES)[number];
export type Activity = { date: string; who: string; text: string; channel?: string };
export type Opportunity = {
  id: string; customerId: string; title: string; value: number; stage: Stage; close: string; owner: string; next: string;
  probability: number; source: string; products: string; activity: Activity[];
};
export const opportunities: Opportunity[] = [
  { id: 'OP-301', customerId: 'C01', title: 'Kitchen project – modular frame assemblies (Phase 2)', value: 820000, stage: 'Proposal', close: '2026-11-14', owner: 'Karthik Varma', next: 'Share revised quote with powder-coat colour options', probability: 60, source: 'Repeat customer', products: 'SS frame assemblies, brackets', activity: [
    { date: '2026-10-26', who: 'Karthik Varma', text: 'Proposal v2 shared (₹8.2 lakh, 96 kitchen frame sets).', channel: 'Email' },
    { date: '2026-10-21', who: 'Karthik Varma', text: 'Site visit at Tower C with Srinivas Rao.', channel: 'Visit' },
    { date: '2026-10-15', who: 'Sneha Iyer', text: 'Requirement call – wants one colour batch across all towers.', channel: 'Call' },
  ] },
  { id: 'OP-302', customerId: 'C02', title: 'Villa package – railings & gate assemblies', value: 540000, stage: 'Negotiation', close: '2026-11-06', owner: 'Sneha Iyer', next: 'Negotiate 3% volume discount; send sample piece', probability: 70, source: 'Architect referral', products: 'MS railings, gate assemblies', activity: [
    { date: '2026-10-27', who: 'Sneha Iyer', text: 'Client asked for 5% discount; counter at 3% pending your approval.', channel: 'WhatsApp' },
    { date: '2026-10-22', who: 'Sneha Iyer', text: 'Plant visit at Jeedimetla.', channel: 'Visit' },
  ] },
  { id: 'OP-303', customerId: 'C03', title: 'Apartment project – 120 units, electrical enclosures', value: 1200000, stage: 'Qualified', close: '2026-11-30', owner: 'Karthik Varma', next: 'Site visit with procurement head on 3 Nov', probability: 40, source: 'IndiaMART enquiry', products: 'Distribution enclosures, meter boxes', activity: [
    { date: '2026-10-24', who: 'Karthik Varma', text: 'Budget confirmed; tender closes 25 Nov.', channel: 'Call' },
    { date: '2026-10-19', who: 'Karthik Varma', text: 'Enquiry received via IndiaMART; qualified on call.', channel: 'IndiaMART' },
  ] },
  { id: 'OP-304', customerId: 'C10', title: 'Machine guards – contract manufacturing', value: 680000, stage: 'New Lead', close: '2026-12-20', owner: 'Sneha Iyer', next: 'Book discovery call with Arjun Kapoor', probability: 15, source: 'Website', products: 'Sheet-metal guards (job work)', activity: [{ date: '2026-10-27', who: 'System', text: 'Lead captured from website form.', channel: 'Web' }] },
  { id: 'OP-305', customerId: 'C11', title: 'Monthly enclosure supply (H2 FY27)', value: 360000, stage: 'Qualified', close: '2026-11-18', owner: 'Imran Khan', next: 'Send rate card for 6-month contract', probability: 45, source: 'Existing customer', products: 'Control panel enclosures', activity: [{ date: '2026-10-23', who: 'Imran Khan', text: 'Discussed 120 enclosures / month commitment.', channel: 'Call' }] },
  { id: 'OP-306', customerId: 'C04', title: 'Clubhouse – structural brackets', value: 425000, stage: 'Proposal', close: '2026-11-12', owner: 'Imran Khan', next: 'Follow up on proposal sent 24 Oct', probability: 55, source: 'Existing customer', products: 'Mounting brackets, base frames', activity: [{ date: '2026-10-24', who: 'Imran Khan', text: 'Proposal sent.', channel: 'Email' }] },
  { id: 'OP-307', customerId: 'C08', title: 'Pump housing assemblies – annual rate contract', value: 290000, stage: 'Negotiation', close: '2026-11-03', owner: 'Sneha Iyer', next: 'Confirm delivery schedule', probability: 75, source: 'Existing customer', products: 'PHA-17 assemblies', activity: [{ date: '2026-10-26', who: 'Sneha Iyer', text: 'Price agreed; schedule open.', channel: 'Call' }] },
  { id: 'OP-308', customerId: 'C09', title: 'Distributor stock – chassis', value: 185000, stage: 'Won', close: '2026-10-22', owner: 'Imran Khan', next: 'Converted to SO-1048', probability: 100, source: 'Distributor network', products: 'Chassis CH-90', activity: [{ date: '2026-10-22', who: 'Imran Khan', text: 'Won – converted to SO-1048.', channel: 'System' }] },
  { id: 'OP-309', customerId: 'C07', title: 'Junction boxes – trial lot', value: 95000, stage: 'Won', close: '2026-10-19', owner: 'Karthik Varma', next: 'Converted to SO-1053', probability: 100, source: 'Existing customer', products: 'Junction box JB-15', activity: [{ date: '2026-10-19', who: 'Karthik Varma', text: 'Won – converted to SO-1053.', channel: 'System' }] },
  { id: 'OP-310', customerId: 'C12', title: 'Office storage racks', value: 140000, stage: 'New Lead', close: '2026-11-28', owner: 'Sneha Iyer', next: 'Send catalogue on WhatsApp', probability: 20, source: 'Walk-in', products: 'Racks', activity: [{ date: '2026-10-25', who: 'Sneha Iyer', text: 'Walk-in enquiry.', channel: 'Visit' }] },
  { id: 'OP-311', customerId: 'C06', title: 'Bulk enclosure order', value: 220000, stage: 'Lost', close: '2026-10-15', owner: 'Imran Khan', next: 'Lost on price (6% lower elsewhere)', probability: 0, source: 'Existing customer', products: 'Enclosures', activity: [{ date: '2026-10-15', who: 'Imran Khan', text: 'Marked lost – price 6% lower elsewhere.', channel: 'Call' }] },
  { id: 'OP-312', customerId: 'C13', title: 'Gated community – gates & railings', value: 950000, stage: 'New Lead', close: '2026-12-15', owner: 'Karthik Varma', next: 'Intro meeting at Tellapur site office', probability: 15, source: 'Referral – Srinivas Rao', products: 'Gates, railings', activity: [{ date: '2026-10-27', who: 'Karthik Varma', text: 'Referral received from Sri Lakshmi Projects.', channel: 'WhatsApp' }] },
];

export type Sku = {
  sku: string; name: string; category: 'Raw material' | 'Components' | 'Consumables' | 'Packaging' | 'Finished goods'; spec: string; hsn: string;
  location: string; onHand: number; reserved: number; reorder: number; unitCost: number; unit: string; lastMovement: string; agingDays: number; atJobWorker?: number;
  batches: { batch: string; ref: string; supplier: string; qty: number; bin: string; received: string }[];
};
export const skus: Sku[] = [
  { sku: 'RM-A17', name: 'Component A-17 · cast aluminium housing', category: 'Components', spec: 'LM6 alloy, as-cast, 2.1 kg', hsn: '7616 99 90', location: 'Main stores · Rack C3', onHand: 53, reserved: 18, reorder: 50, unitCost: 4600, unit: 'pcs', lastMovement: '2026-10-24', agingDays: 18, batches: [
    { batch: 'B-A17-2409', ref: 'Heat H-1182', supplier: 'Deccan Castings', qty: 25, bin: 'C3-01', received: '2026-10-02' },
    { batch: 'B-A17-2410', ref: 'Heat RJ-7741', supplier: 'CastHub Rajkot', qty: 28, bin: 'C3-02', received: '2026-10-14' },
  ] },
  { sku: 'RM-MS2', name: 'MS sheet 2 mm (CRCA)', category: 'Raw material', spec: '2500 × 1250 mm, IS 513', hsn: '7209 17 00', location: 'Sheet yard · Bay 1', onHand: 14, reserved: 8, reorder: 30, unitCost: 3250, unit: 'sheets', lastMovement: '2026-10-23', agingDays: 21, batches: [{ batch: 'B-MS2-2407', ref: 'Mill TC 55120', supplier: 'Sri Venkata Steels', qty: 14, bin: 'Bay 1', received: '2026-10-07' }] },
  { sku: 'RM-MS5', name: 'MS plate 5 mm', category: 'Raw material', spec: '2500 × 1250 mm, IS 2062 E250', hsn: '7208 52 90', location: 'Sheet yard · Bay 2', onHand: 20, reserved: 20, reorder: 25, unitCost: 7600, unit: 'sheets', lastMovement: '2026-10-20', agingDays: 41, batches: [{ batch: 'B-MS5-2398', ref: 'Mill TC 54871', supplier: 'Sri Venkata Steels', qty: 20, bin: 'Bay 2', received: '2026-09-17' }] },
  { sku: 'RM-SS12', name: 'SS 304 sheet 1.2 mm', category: 'Raw material', spec: '2500 × 1250 mm, 2B finish', hsn: '7219 34 00', location: 'Sheet yard · Bay 3', onHand: 72, reserved: 60, reorder: 30, unitCost: 6900, unit: 'sheets', lastMovement: '2026-10-26', agingDays: 22, batches: [{ batch: 'B-SS-2408', ref: 'Mill TC 33041', supplier: 'Sri Venkata Steels', qty: 72, bin: 'Bay 3', received: '2026-10-06' }] },
  { sku: 'RM-GI15', name: 'GI sheet 1.5 mm', category: 'Raw material', spec: '2500 × 1250 mm, Z120', hsn: '7210 49 00', location: 'Sheet yard · Bay 4', onHand: 88, reserved: 60, reorder: 40, unitCost: 2700, unit: 'sheets', lastMovement: '2026-10-25', agingDays: 27, batches: [{ batch: 'B-GI-2405', ref: 'Mill TC 54402', supplier: 'Sri Venkata Steels', qty: 88, bin: 'Bay 4', received: '2026-09-30' }] },
  { sku: 'RM-PIPE40', name: 'MS pipe 40 NB (6 m)', category: 'Raw material', spec: 'IS 1239 medium', hsn: '7306 30 90', location: 'Pipe rack', onHand: 46, reserved: 30, reorder: 25, unitCost: 1850, unit: 'lengths', lastMovement: '2026-10-22', agingDays: 30, batches: [] },
  { sku: 'CP-6204', name: 'Bearing 6204-2RS', category: 'Components', spec: '20 × 47 × 14 mm', hsn: '8482 10 11', location: 'Main stores · Bin B12', onHand: 340, reserved: 108, reorder: 200, unitCost: 180, unit: 'pcs', lastMovement: '2026-10-26', agingDays: 15, batches: [] },
  { sku: 'CP-FK8', name: 'Fastener kit M8 (SS)', category: 'Components', spec: '8 bolts, nuts, washers', hsn: '7318 15 00', location: 'Main stores · Bin B04', onHand: 1200, reserved: 400, reorder: 500, unitCost: 45, unit: 'kits', lastMovement: '2026-10-27', agingDays: 9, batches: [] },
  { sku: 'CP-GSK65', name: 'Gasket set IP65', category: 'Components', spec: 'EPDM, for CPE enclosures', hsn: '4016 93 30', location: 'Main stores · Bin B07', onHand: 140, reserved: 38, reorder: 150, unitCost: 120, unit: 'sets', lastMovement: '2026-10-25', agingDays: 12, batches: [] },
  { sku: 'CN-PCP7035', name: 'Powder-coat powder RAL 7035', category: 'Consumables', spec: 'Polyester, 20 kg box', hsn: '3208 90 90', location: 'Paint store', onHand: 85, reserved: 0, reorder: 100, unitCost: 820, unit: 'kg', lastMovement: '2026-10-22', agingDays: 19, batches: [] },
  { sku: 'CN-WW08', name: 'MIG welding wire 0.8 mm', category: 'Consumables', spec: '15 kg spool, ER70S-6', hsn: '7217 30 90', location: 'Main stores · Shelf A1', onHand: 6, reserved: 0, reorder: 8, unitCost: 2350, unit: 'spools', lastMovement: '2026-10-25', agingDays: 12, batches: [] },
  { sku: 'PK-CTN5', name: 'Corrugated carton 5-ply', category: 'Packaging', spec: '600 × 400 × 250 mm', hsn: '4819 10 10', location: 'Packing bay', onHand: 420, reserved: 0, reorder: 300, unitCost: 65, unit: 'pcs', lastMovement: '2026-10-27', agingDays: 6, batches: [] },
  { sku: 'PK-PLT', name: 'Wooden pallet (heat-treated)', category: 'Packaging', spec: '1200 × 1000 mm', hsn: '4415 20 00', location: 'Packing bay', onHand: 14, reserved: 0, reorder: 10, unitCost: 850, unit: 'pcs', lastMovement: '2026-10-27', agingDays: 8, batches: [] },
  { sku: 'FG-ENC86-OLD', name: 'Enclosure 800×600 (old design)', category: 'Finished goods', spec: 'Superseded by CPE-806', hsn: '8538 10 90', location: 'FG store · Rack F6', onHand: 36, reserved: 0, reorder: 0, unitCost: 4600, unit: 'pcs', lastMovement: '2026-06-10', agingDays: 142, batches: [] },
  { sku: 'RM-AL3', name: 'Aluminium sheet 3 mm (excess)', category: 'Raw material', spec: '2440 × 1220 mm, 5052', hsn: '7606 12 00', location: 'Sheet yard · Bay 5', onHand: 22, reserved: 0, reorder: 0, unitCost: 4300, unit: 'sheets', lastMovement: '2026-06-18', agingDays: 131, batches: [] },
];
export type Movement = { date: string; ref: string; type: 'Receipt' | 'Issue' | 'Reservation' | 'Rejection' | 'Adjustment' | 'Incoming'; qty: number; note: string; balance?: number };
export const a17Movements: Movement[] = [
  { date: '2026-10-24', ref: 'SO-1052', type: 'Reservation', qty: -8, note: 'Reserved for Kakatiya Pumps (B-A17-2410)' },
  { date: '2026-10-21', ref: 'SO-1047', type: 'Reservation', qty: -10, note: 'Reserved for Deccan Electricals (B-A17-2409)' },
  { date: '2026-10-16', ref: 'DN-0042', type: 'Rejection', qty: -2, note: 'Porosity found at incoming QC – returned to CastHub Rajkot, debit note raised', balance: 53 },
  { date: '2026-10-14', ref: 'GRN-0791', type: 'Receipt', qty: 30, note: 'CastHub Rajkot · B-A17-2410 · e-way bill 0812 3341 9920', balance: 55 },
  { date: '2026-10-08', ref: 'WO-3290', type: 'Issue', qty: -24, note: 'Issued to machining for SO-1036', balance: 25 },
  { date: '2026-10-02', ref: 'GRN-0784', type: 'Receipt', qty: 40, note: 'Deccan Castings · B-A17-2409', balance: 49 },
  { date: '2026-10-01', ref: 'OPEN', type: 'Adjustment', qty: 9, note: 'Opening balance after September stock count', balance: 9 },
];
export const reservations: Record<string, { order: string; qty: number; customer: string; date: string }[]> = {
  'RM-A17': [
    { order: 'SO-1047', qty: 10, customer: 'Deccan Electricals', date: '2026-10-21' },
    { order: 'SO-1052', qty: 8, customer: 'Kakatiya Pumps', date: '2026-10-24' },
  ],
};

export type OrderItem = { sku: string; desc: string; qty: number; rate: number };
export type Order = {
  id: string; customerId: string; date: string; promised: string; project: string; items: OrderItem[]; production: number;
  material: 'Ready' | 'Partial' | 'Short'; payment: 'Paid' | 'Advance received' | 'Partially paid' | 'Unpaid'; advance: number;
  dispatch: 'Not started' | 'Ready' | 'Scheduled' | 'In transit' | 'Delivered'; owner: string; risk: 'On track' | 'Watch' | 'At risk';
  status: 'Confirmed' | 'In production' | 'Ready for dispatch' | 'Delivered' | 'Blocked'; open: boolean; riskNote?: string; invoice?: string;
  deliverTo: string; transporter?: string; vehicle?: string; material_sku?: string; materialNeed?: number; jobWork?: string;
};
export const orders: Order[] = [
  { id: 'SO-1051', customerId: 'C01', date: '2026-10-19', promised: '2026-10-30', project: 'Lakshmi Residency – booster pump sets, Tower B', items: [{ sku: 'FG-PHA17', desc: 'Pump housing assembly PHA-17 (machined A-17 housing, bearings, powder coated RAL 7035)', qty: 100, rate: 7800 }], production: 0, material: 'Short', payment: 'Advance received', advance: 150000, dispatch: 'Not started', owner: 'Karthik Varma', risk: 'At risk', status: 'Blocked', open: true, riskNote: 'Needs 100 × Component A-17; 35 available. 65 short – supplier confirmation pending (PR-208).', deliverTo: 'Lakshmi Residency, Tower B, Gachibowli, Hyderabad 500032', material_sku: 'RM-A17', materialNeed: 100, jobWork: 'Powder coating – Sri Venkateswara Powder Coaters' },
  { id: 'SO-1049', customerId: 'C04', date: '2026-10-15', promised: '2026-10-31', project: 'Greenfield Meadows – pump room base frames', items: [{ sku: 'FG-BF30', desc: 'Base frame BF-30 (MS plate 5 mm, welded, primed)', qty: 32, rate: 5600 }], production: 35, material: 'Short', payment: 'Partially paid', advance: 50000, dispatch: 'Not started', owner: 'Imran Khan', risk: 'At risk', status: 'In production', open: true, riskNote: '20 of 32 MS plates in stock; PO-0912 (Sri Venkata Steels) delivery date not yet confirmed.', deliverTo: 'Greenfield Meadows, Kompally, Hyderabad 500014', material_sku: 'RM-MS5', materialNeed: 32 },
  { id: 'SO-1046', customerId: 'C02', date: '2026-10-12', promised: '2026-11-03', project: 'Banjara Hills villa – SS railings', items: [{ sku: 'FG-RA12', desc: 'Railing assembly RA-12 (SS 304, 1.2 m modules)', qty: 40, rate: 12600 }], production: 55, material: 'Ready', payment: 'Advance received', advance: 120000, dispatch: 'Not started', owner: 'Sneha Iyer', risk: 'Watch', status: 'In production', open: true, riskNote: 'Welding & finishing (WO-3317) behind schedule – TIG welder repair.', deliverTo: 'Road No. 12, Banjara Hills, Hyderabad 500034' },
  { id: 'SO-1043', customerId: 'C07', date: '2026-10-08', promised: '2026-10-30', project: 'Distributor stock – Warangal', items: [{ sku: 'FG-JB15', desc: 'Junction box JB-15, IP65, powder coated', qty: 24, rate: 4300 }], production: 100, material: 'Ready', payment: 'Partially paid', advance: 40000, dispatch: 'Ready', owner: 'Karthik Varma', risk: 'On track', status: 'Ready for dispatch', open: true, deliverTo: 'Rao & Sons Engineering, Hanamkonda Road, Warangal 506002', transporter: 'Sri Sai Transport', vehicle: 'TS 08 UB 4521' },
  { id: 'SO-1044', customerId: 'C08', date: '2026-10-09', promised: '2026-10-29', project: 'Motor base frames – Lot 4', items: [{ sku: 'FG-MBF20', desc: 'Motor base frame MBF-20 (MS, painted)', qty: 30, rate: 4700 }], production: 100, material: 'Ready', payment: 'Advance received', advance: 60000, dispatch: 'Ready', owner: 'Sneha Iyer', risk: 'On track', status: 'Ready for dispatch', open: true, deliverTo: 'Kakatiya Pumps, Kazipet Industrial Area, Hanamkonda 506003', transporter: 'Sri Sai Transport', vehicle: 'TS 08 UC 7712' },
  { id: 'SO-1045', customerId: 'C11', date: '2026-10-10', promised: '2026-10-31', project: 'Panel batch Oct-B', items: [{ sku: 'FG-CPE806', desc: 'Control panel enclosure CPE-806 (800×600×250, IP65)', qty: 18, rate: 12400 }], production: 100, material: 'Ready', payment: 'Partially paid', advance: 80000, dispatch: 'Ready', owner: 'Imran Khan', risk: 'On track', status: 'Ready for dispatch', open: true, deliverTo: 'Bhavya Electro Controls, Paradise, Secunderabad 500003', transporter: 'Own vehicle', vehicle: 'TS 07 EZ 3390' },
  { id: 'SO-1048', customerId: 'C09', date: '2026-10-22', promised: '2026-10-29', project: 'Distributor lot – Bengaluru', items: [{ sku: 'FG-CH90', desc: 'Sheet-metal chassis CH-90 (GI, 1.5 mm)', qty: 36, rate: 4400 }], production: 100, material: 'Ready', payment: 'Advance received', advance: 70000, dispatch: 'Ready', owner: 'Imran Khan', risk: 'On track', status: 'Ready for dispatch', open: true, deliverTo: 'Shree Balaji Traders, Mysore Road, Bengaluru 560039', transporter: 'VRL Logistics', vehicle: 'KA 25 AB 6170' },
  { id: 'SO-1050', customerId: 'C05', date: '2026-10-16', promised: '2026-10-30', project: 'Vasavi Heights – grill panels', items: [{ sku: 'FG-GP10', desc: 'Grill panel GP-10 (MS, primed)', qty: 22, rate: 3900 }], production: 100, material: 'Ready', payment: 'Unpaid', advance: 0, dispatch: 'Ready', owner: 'Imran Khan', risk: 'On track', status: 'Ready for dispatch', open: true, deliverTo: 'Vasavi Heights, KPHB Colony, Kukatpally 500072', transporter: 'Sri Sai Transport', vehicle: 'TS 08 UB 4521' },
  { id: 'SO-1047', customerId: 'C06', date: '2026-10-14', promised: '2026-11-02', project: 'Pump & panel batch – Tolichowki', items: [{ sku: 'FG-PHA17', desc: 'Pump housing assembly PHA-17', qty: 10, rate: 7900 }, { sku: 'FG-CPE806', desc: 'Control panel enclosure CPE-806', qty: 6, rate: 12400 }], production: 60, material: 'Ready', payment: 'Advance received', advance: 30000, dispatch: 'Not started', owner: 'Sneha Iyer', risk: 'On track', status: 'In production', open: true, deliverTo: 'Deccan Electricals, Tolichowki, Hyderabad 500008' },
  { id: 'SO-1052', customerId: 'C08', date: '2026-10-24', promised: '2026-11-05', project: 'PHA-17 sample units', items: [{ sku: 'FG-PHA17', desc: 'Pump housing assembly PHA-17', qty: 8, rate: 7900 }], production: 40, material: 'Ready', payment: 'Unpaid', advance: 0, dispatch: 'Not started', owner: 'Sneha Iyer', risk: 'On track', status: 'In production', open: true, deliverTo: 'Kakatiya Pumps, Kazipet 506003' },
  { id: 'SO-1053', customerId: 'C07', date: '2026-10-20', promised: '2026-11-06', project: 'Junction boxes – trial lot', items: [{ sku: 'FG-JB15', desc: 'Junction box JB-15', qty: 14, rate: 3650 }], production: 20, material: 'Ready', payment: 'Unpaid', advance: 0, dispatch: 'Not started', owner: 'Karthik Varma', risk: 'On track', status: 'In production', open: true, deliverTo: 'Rao & Sons Engineering, Warangal 506002' },
  { id: 'SO-1054', customerId: 'C02', date: '2026-10-25', promised: '2026-11-09', project: 'Jubilee Hills villa – gates', items: [{ sku: 'FG-GT08', desc: 'Gate assembly GT-08 (MS, powder coated)', qty: 12, rate: 12500 }], production: 0, material: 'Ready', payment: 'Unpaid', advance: 0, dispatch: 'Not started', owner: 'Sneha Iyer', risk: 'On track', status: 'Confirmed', open: true, deliverTo: 'Plot 221, Jubilee Hills, Hyderabad 500033' },
  { id: 'SO-1055', customerId: 'C04', date: '2026-10-26', promised: '2026-11-10', project: 'Greenfield Meadows – base frames lot 2', items: [{ sku: 'FG-BF30', desc: 'Base frame BF-30', qty: 26, rate: 5200 }], production: 0, material: 'Ready', payment: 'Unpaid', advance: 0, dispatch: 'Not started', owner: 'Imran Khan', risk: 'On track', status: 'Confirmed', open: true, deliverTo: 'Greenfield Meadows, Kompally 500014' },
  { id: 'SO-1056', customerId: 'C11', date: '2026-10-27', promised: '2026-11-12', project: 'Panel batch Nov-A', items: [{ sku: 'FG-CPE806', desc: 'Control panel enclosure CPE-806', qty: 20, rate: 12300 }], production: 0, material: 'Ready', payment: 'Unpaid', advance: 0, dispatch: 'Not started', owner: 'Imran Khan', risk: 'On track', status: 'Confirmed', open: true, deliverTo: 'Bhavya Electro Controls, Secunderabad 500003' },
  // Closed (delivered & invoiced)
  { id: 'SO-1042', customerId: 'C02', date: '2026-09-22', promised: '2026-10-06', project: 'Film Nagar residence – railings', items: [{ sku: 'FG-RA12', desc: 'Railing assembly RA-12', qty: 10, rate: 12288 }], production: 100, material: 'Ready', payment: 'Unpaid', advance: 0, dispatch: 'Delivered', owner: 'Sneha Iyer', risk: 'On track', status: 'Delivered', open: false, invoice: 'INV-1050', deliverTo: 'Film Nagar, Hyderabad' },
  { id: 'SO-1041', customerId: 'C06', date: '2026-09-25', promised: '2026-10-02', project: 'PHA-17 – Sep batch', items: [{ sku: 'FG-PHA17', desc: 'Pump housing assembly PHA-17', qty: 4, rate: 8898 }], production: 100, material: 'Ready', payment: 'Unpaid', advance: 0, dispatch: 'Delivered', owner: 'Sneha Iyer', risk: 'On track', status: 'Delivered', open: false, invoice: 'INV-1044', deliverTo: 'Tolichowki, Hyderabad' },
  { id: 'SO-1039', customerId: 'C01', date: '2026-09-02', promised: '2026-09-15', project: 'Lakshmi Residency – pump sets, Tower A', items: [{ sku: 'FG-PHA17', desc: 'Pump housing assembly PHA-17', qty: 23, rate: 7738 }], production: 100, material: 'Ready', payment: 'Unpaid', advance: 0, dispatch: 'Delivered', owner: 'Karthik Varma', risk: 'On track', status: 'Delivered', open: false, invoice: 'INV-1048', deliverTo: 'Lakshmi Residency, Tower A, Gachibowli' },
  { id: 'SO-1038', customerId: 'C05', date: '2026-08-24', promised: '2026-09-01', project: 'Vasavi Enclave – grills', items: [{ sku: 'FG-GP10', desc: 'Grill panel GP-10', qty: 15, rate: 3842 }], production: 100, material: 'Ready', payment: 'Unpaid', advance: 0, dispatch: 'Delivered', owner: 'Imran Khan', risk: 'On track', status: 'Delivered', open: false, invoice: 'INV-1041', deliverTo: 'Kukatpally, Hyderabad' },
];

export type Supplier = { id: string; name: string; city: string; state: string; gstin: string; msme: string; contact: string; phone: string; rating: number; onTime: number; category: string; interstate: boolean };
export const suppliers: Supplier[] = [
  { id: 'S01', name: 'Deccan Castings', city: 'Medak', state: 'Telangana', gstin: '36AACFD2201N1Z5', msme: 'Micro (UDYAM-TS-11-0012876)', contact: 'Nagendra Prasad', phone: '+91 98•••• 7710', rating: 4.4, onTime: 91, category: 'Aluminium castings', interstate: false },
  { id: 'S02', name: 'CastHub Rajkot', city: 'Rajkot', state: 'Gujarat', gstin: '24AAKCC6609P1Z2', msme: 'Not registered', contact: 'Rakesh Patel', phone: '+91 94•••• 3361', rating: 3.9, onTime: 78, category: 'Castings', interstate: true },
  { id: 'S03', name: 'Prime Components', city: 'Cherlapally, Hyderabad', state: 'Telangana', gstin: '36AAGCP8812Q1Z9', msme: 'Small (UDYAM-TS-07-0031145)', contact: 'Sudheer Reddy', phone: '+91 99•••• 5208', rating: 4.6, onTime: 95, category: 'Castings & machined parts', interstate: false },
  { id: 'S04', name: 'Hyderabad Tools & Consumables', city: 'Balanagar, Hyderabad', state: 'Telangana', gstin: '36AAFFH4471J1Z3', msme: 'Micro (UDYAM-TS-02-0020911)', contact: 'Ashok Kumar', phone: '+91 90•••• 1284', rating: 4.2, onTime: 88, category: 'Consumables', interstate: false },
  { id: 'S05', name: 'Sri Sai Transport', city: 'Jeedimetla, Hyderabad', state: 'Telangana', gstin: '36ABJPS2290F1Z6', msme: 'Micro (UDYAM-TS-02-0039402)', contact: 'Sai Kumar', phone: '+91 98•••• 0457', rating: 4.0, onTime: 86, category: 'Transport (GTA)', interstate: false },
  { id: 'S06', name: 'Sai Manpower Services', city: 'Quthbullapur, Hyderabad', state: 'Telangana', gstin: '36AAQFS8814D1Z2', msme: 'Micro (UDYAM-TS-02-0051173)', contact: 'Venkat Ramana', phone: '+91 97•••• 6612', rating: 3.8, onTime: 0, category: 'Contract labour', interstate: false },
  { id: 'S07', name: 'TGSPDCL (Power)', city: 'Hyderabad', state: 'Telangana', gstin: '—', msme: '—', contact: '—', phone: '—', rating: 0, onTime: 0, category: 'Utility', interstate: false },
  { id: 'S09', name: 'Balaji Bearings & Transmissions', city: 'Ranigunj, Secunderabad', state: 'Telangana', gstin: '36AAEFB6620L1Z8', msme: 'Micro (UDYAM-TS-09-0027410)', contact: 'Mukesh Agarwal', phone: '+91 98•••• 6031', rating: 4.5, onTime: 93, category: 'Bearings & transmission', interstate: false },
  { id: 'S10', name: 'Krishna Bearing House', city: 'Kukatpally, Hyderabad', state: 'Telangana', gstin: '36ACXPK7719M1Z4', msme: 'Micro (UDYAM-TS-02-0061205)', contact: 'Srinivas Chary', phone: '+91 90•••• 2218', rating: 3.7, onTime: 84, category: 'Bearings (trading)', interstate: false },
  { id: 'S11', name: 'Polyseal Rubber Products', city: 'Cherlapally, Hyderabad', state: 'Telangana', gstin: '36AAJFP5512H1Z6', msme: 'Small (UDYAM-TS-07-0044318)', contact: 'Imtiaz Ahmed', phone: '+91 99•••• 7726', rating: 4.1, onTime: 90, category: 'Rubber gaskets & seals', interstate: false },
  { id: 'S08', name: 'Sri Venkata Steels', city: 'Bowenpally, Hyderabad', state: 'Telangana', gstin: '36AAHFS3318K1Z4', msme: 'Micro (UDYAM-TS-02-0018834)', contact: 'Venkata Ramana Gupta', phone: '+91 98•••• 2291', rating: 4.3, onTime: 89, category: 'Steel stockist', interstate: false },
];

export type Quote = { id: string; supplierId: string; ref: string; unitPrice: number; leadDays: number; terms: string; freight: number; validity: string; received: string; notes: string; quality: string; cashImpact: string };
export const quotes: Quote[] = [
  { id: 'QT-208-A', supplierId: 'S01', ref: 'DC/Q/2610/118', unitPrice: 4850, leadDays: 3, terms: 'Net 15', freight: 6500, validity: '2026-11-04', received: '2026-10-27', notes: 'Same pattern and alloy as batch B-A17-2409. PPAP on file.', quality: 'Approved source · 0.4% rejection', cashImpact: 'Pay by 15 Nov' },
  { id: 'QT-208-B', supplierId: 'S02', ref: 'CHR/2026/Q-0931', unitPrice: 4720, leadDays: 5, terms: '100% advance', freight: 9000, validity: '2026-10-31', received: '2026-10-27', notes: 'Ships from Rajkot (IGST). 2 pcs rejected for porosity in last lot (DN-0042).', quality: '6.7% rejection last lot', cashImpact: '₹3.6 lakh advance today' },
  { id: 'QT-208-C', supplierId: 'S03', ref: 'PC/QTN/1042', unitPrice: 4910, leadDays: 2, terms: 'Net 30', freight: 4500, validity: '2026-11-06', received: '2026-10-28', notes: 'Can deliver Fri 30 Oct morning if PO is released by 4 pm today. Pre-machined datum faces.', quality: 'Approved source · 0.2% rejection', cashImpact: 'Pay by 29 Nov' },
];

export type PR = { id: string; sku: string; material: string; qty: number; required: number; inStock: number; neededBy: string; requestedBy: string; date: string; linkedOrder?: string; status: string; quotes: string[]; preferred: string[]; po?: string; priority: 'High' | 'Medium' | 'Low' };
export const purchaseRequests: PR[] = [
  { id: 'PR-208', sku: 'RM-A17', material: 'Component A-17 · cast aluminium housing', qty: 65, required: 100, inStock: 35, neededBy: '2026-10-30', requestedBy: 'Harish Chandra', date: '2026-10-27', linkedOrder: 'SO-1051', status: 'Quotes received', quotes: ['QT-208-A', 'QT-208-B', 'QT-208-C'], preferred: ['S01', 'S03'], priority: 'High' },
  { id: 'PR-209', sku: 'CN-PCP7035', material: 'Powder-coat powder RAL 7035', qty: 100, required: 100, inStock: 85, neededBy: '2026-11-10', requestedBy: 'Gopi Krishna', date: '2026-10-28', status: 'Draft', quotes: [], preferred: ['S04'], priority: 'Low' },
  { id: 'PR-207', sku: 'RM-MS5', material: 'MS plate 5 mm, IS 2062', qty: 40, required: 32, inStock: 20, neededBy: '2026-10-30', requestedBy: 'Harish Chandra', date: '2026-10-16', linkedOrder: 'SO-1049', status: 'PO issued', quotes: [], preferred: ['S08'], po: 'PO-0912', priority: 'High' },
  { id: 'PR-206', sku: 'CN-WW08', material: 'MIG welding wire 0.8 mm', qty: 10, required: 10, inStock: 6, neededBy: '2026-10-31', requestedBy: 'Lokesh Naidu', date: '2026-10-20', status: 'PO issued', quotes: [], preferred: ['S04'], po: 'PO-0915', priority: 'Medium' },
  { id: 'PR-205', sku: 'PK-PLT', material: 'Wooden pallets (heat-treated)', qty: 20, required: 20, inStock: 4, neededBy: '2026-10-15', requestedBy: 'Mohammed Salim', date: '2026-10-06', status: 'Closed', quotes: [], preferred: ['S04'], po: 'PO-0904', priority: 'Low' },
];
export type PO = { id: string; supplierId: string; pr: string; material: string; qty: number; value: number; date: string; eta: string; status: string; confirmed: boolean };
export const purchaseOrders: PO[] = [
  { id: 'PO-0912', supplierId: 'S08', pr: 'PR-207', material: 'MS plate 5 mm', qty: 40, value: 304000, date: '2026-10-17', eta: '2026-10-31', status: 'Awaiting confirmation', confirmed: false },
  { id: 'PO-0915', supplierId: 'S04', pr: 'PR-206', material: 'MIG welding wire 0.8 mm', qty: 10, value: 23500, date: '2026-10-21', eta: '2026-10-29', status: 'Confirmed', confirmed: true },
  { id: 'PO-0905', supplierId: 'S08', pr: 'PR-201', material: 'MS sheet 2 mm & GI sheet 1.5 mm', qty: 60, value: 184000, date: '2026-09-12', eta: '2026-09-15', status: 'Received', confirmed: true },
  { id: 'PO-0904', supplierId: 'S04', pr: 'PR-205', material: 'Wooden pallets', qty: 20, value: 17000, date: '2026-10-07', eta: '2026-10-10', status: 'Received', confirmed: true },
];

export const BOARD_STAGES = ['Planned', 'Fabrication', 'Assembly', 'Job work', 'Quality check', 'Packing', 'Ready for dispatch'] as const;
export type WO = {
  id: string; order: string; op: string; stage: (typeof BOARD_STAGES)[number];
  center: string; team: string; start: string; finish: string; progress: number; planned: number; dependency: string; quality: string; packing: string; dispatchReady: boolean;
  status: 'On track' | 'Behind' | 'Blocked' | 'Waiting' | 'Done'; qty: number; outsourced?: boolean; note?: string;
};
export const workOrders: WO[] = [
  { id: 'WO-3321', order: 'SO-1051', op: 'CNC machining', stage: 'Fabrication', center: 'CNC Machining Centre 1', team: 'Raju Goud (Machining – Shift A)', start: '2026-10-27', finish: '2026-10-28', progress: 0, planned: 60, dependency: 'RM-A17 × 100 (35 available)', quality: 'Not started', packing: '—', dispatchReady: false, status: 'Blocked', qty: 100, note: 'Material shortage – 65 × A-17 awaiting PR-208' },
  { id: 'WO-3322', order: 'SO-1051', op: 'Assembly', stage: 'Planned', center: 'Assembly Line 1', team: 'Suresh Babu (Assembly)', start: '2026-10-28', finish: '2026-10-29', progress: 0, planned: 0, dependency: 'WO-3321', quality: 'Not started', packing: '—', dispatchReady: false, status: 'Waiting', qty: 100 },
  { id: 'WO-3323', order: 'SO-1051', op: 'Powder coating (job work)', stage: 'Planned', center: 'Sri Venkateswara Powder Coaters', team: 'Job worker · DC to be raised', start: '2026-10-29', finish: '2026-10-29', progress: 0, planned: 0, dependency: 'WO-3322', quality: 'Not started', packing: '—', dispatchReady: false, status: 'Waiting', qty: 100, outsourced: true },
  { id: 'WO-3324', order: 'SO-1051', op: 'QC, packing & dispatch', stage: 'Planned', center: 'Packing Bay / Dispatch Dock', team: 'Anjali Devi (QC & Packing)', start: '2026-10-30', finish: '2026-10-30', progress: 0, planned: 0, dependency: 'WO-3323 · e-way bill', quality: 'Not started', packing: 'Pending', dispatchReady: false, status: 'Waiting', qty: 100 },
  { id: 'WO-3319', order: 'SO-1049', op: 'Laser cutting', stage: 'Fabrication', center: 'Fibre Laser 1', team: 'Shankar Nayak (Fabrication – Shift A)', start: '2026-10-26', finish: '2026-10-29', progress: 35, planned: 70, dependency: 'RM-MS5 × 32 (20 available) · PO-0912', quality: 'In progress', packing: '—', dispatchReady: false, status: 'Blocked', qty: 32, note: '12 plates awaiting PO-0912' },
  { id: 'WO-3317', order: 'SO-1046', op: 'Welding & finishing', stage: 'Assembly', center: 'Welding Bay 2', team: 'Venu Gopal (Welding)', start: '2026-10-26', finish: '2026-10-28', progress: 45, planned: 80, dependency: 'WO-3316 ✓', quality: 'In progress', packing: '—', dispatchReady: false, status: 'Behind', qty: 40, note: 'TIG welder repair – 4 hrs lost on 27 Oct' },
  { id: 'WO-3318', order: 'SO-1047', op: 'CNC machining', stage: 'Fabrication', center: 'CNC Machining Centre 2', team: 'Yadagiri Mudiraj (Machining)', start: '2026-10-27', finish: '2026-10-29', progress: 60, planned: 55, dependency: 'Material ready ✓', quality: 'In progress', packing: '—', dispatchReady: false, status: 'On track', qty: 16 },
  { id: 'WO-3320', order: 'SO-1052', op: 'Bearing fit & assembly', stage: 'Assembly', center: 'Assembly Line 1', team: 'Kiran Kumar (Assembly)', start: '2026-10-28', finish: '2026-10-30', progress: 40, planned: 35, dependency: 'Material ready ✓', quality: 'In progress', packing: '—', dispatchReady: false, status: 'On track', qty: 8 },
  { id: 'WO-3326', order: 'SO-1056', op: 'Powder coating (job work)', stage: 'Job work', center: 'Sri Venkateswara Powder Coaters', team: 'Job worker · DC-JW-0712', start: '2026-10-22', finish: '2026-10-29', progress: 58, planned: 70, dependency: 'DC-JW-0712 (50 pending return)', quality: '—', packing: '—', dispatchReady: false, status: 'On track', qty: 120, outsourced: true },
  { id: 'WO-3325', order: 'SO-1053', op: 'Bending', stage: 'Planned', center: 'Press Brake 1', team: 'Naresh Kumar (Fabrication)', start: '2026-10-30', finish: '2026-11-02', progress: 20, planned: 20, dependency: 'Material ready ✓', quality: 'Not started', packing: '—', dispatchReady: false, status: 'On track', qty: 14 },
  { id: 'WO-3314', order: 'SO-1048', op: 'Final QC', stage: 'Quality check', center: 'QC Table', team: 'Sravani K (QC)', start: '2026-10-27', finish: '2026-10-28', progress: 90, planned: 90, dependency: 'WO-3313 ✓', quality: 'Passed – 1 pc reworked', packing: 'Cartoned (6 pallets)', dispatchReady: true, status: 'On track', qty: 36 },
  { id: 'WO-3311', order: 'SO-1045', op: 'Packing', stage: 'Packing', center: 'Packing Bay', team: 'Ashok Rao (Packing)', start: '2026-10-27', finish: '2026-10-28', progress: 85, planned: 80, dependency: '—', quality: 'Passed', packing: 'In progress', dispatchReady: true, status: 'On track', qty: 18 },
  { id: 'WO-3312', order: 'SO-1043', op: 'Packing', stage: 'Ready for dispatch', center: 'Packing Bay', team: 'Anjali Devi (QC & Packing)', start: '2026-10-24', finish: '2026-10-26', progress: 100, planned: 100, dependency: '—', quality: 'Passed', packing: 'Cartoned (4 pallets)', dispatchReady: true, status: 'Done', qty: 24 },
  { id: 'WO-3313', order: 'SO-1044', op: 'Packing', stage: 'Ready for dispatch', center: 'Packing Bay', team: 'Anjali Devi (QC & Packing)', start: '2026-10-25', finish: '2026-10-27', progress: 100, planned: 100, dependency: '—', quality: 'Passed', packing: 'Strapped (5 pallets)', dispatchReady: true, status: 'Done', qty: 30 },
  { id: 'WO-3315', order: 'SO-1050', op: 'Packing', stage: 'Ready for dispatch', center: 'Packing Bay', team: 'Ashok Rao (Packing)', start: '2026-10-26', finish: '2026-10-27', progress: 100, planned: 100, dependency: '—', quality: 'Passed', packing: 'Strapped (3 pallets)', dispatchReady: true, status: 'Done', qty: 22 },
];
export const dispatchPlan = [
  { date: '2026-10-29', order: 'SO-1044', customer: 'Kakatiya Pumps', to: 'Kazipet, Hanamkonda', qty: '30 frames · 5 pallets', vehicle: 'TS 08 UC 7712', transporter: 'Sri Sai Transport', eway: 'To generate', lr: 'SST/2610/0884', slot: '06:30', interstate: false },
  { date: '2026-10-29', order: 'SO-1048', customer: 'Shree Balaji Traders', to: 'Mysore Road, Bengaluru', qty: '36 chassis · 6 pallets', vehicle: 'KA 25 AB 6170', transporter: 'VRL Logistics', eway: 'To generate (inter-state)', lr: 'VRL/HYD/77120', slot: '09:00', interstate: true },
  { date: '2026-10-30', order: 'SO-1043', customer: 'Rao & Sons Engineering', to: 'Warangal', qty: '24 boxes · 4 pallets', vehicle: 'TS 08 UB 4521', transporter: 'Sri Sai Transport', eway: 'To generate', lr: 'Pending', slot: '07:00', interstate: false },
  { date: '2026-10-30', order: 'SO-1050', customer: 'Vasavi Constructions', to: 'KPHB, Kukatpally', qty: '22 panels · 3 pallets', vehicle: 'TS 08 UB 4521', transporter: 'Sri Sai Transport', eway: 'To generate', lr: 'Pending', slot: '14:00', interstate: false },
  { date: '2026-10-31', order: 'SO-1045', customer: 'Bhavya Electro Controls', to: 'Paradise, Secunderabad', qty: '18 enclosures · 3 pallets', vehicle: 'TS 07 EZ 3390', transporter: 'Own vehicle', eway: 'To generate', lr: 'Own vehicle', slot: '10:00', interstate: false },
];

// ---- Job work / outsourcing ----
export type JobWorker = { id: string; name: string; area: string; process: string; gstin: string; contact: string; phone: string; rate: string; onTime: number; whatsapp: boolean };
export const jobWorkers: JobWorker[] = [
  { id: 'JW01', name: 'Sri Venkateswara Powder Coaters', area: 'Cherlapally', process: 'Powder coating', gstin: '36ABMFS1180C1Z2', contact: 'Venkatesh', phone: '+91 98•••• 3317', rate: '₹180 / enclosure · ₹95 / housing', onTime: 92, whatsapp: true },
  { id: 'JW02', name: 'Laxmi CNC Works', area: 'Balanagar', process: 'CNC turning (overflow)', gstin: '36AAXPL5521M1Z7', contact: 'Laxman Rao', phone: '+91 99•••• 6620', rate: '₹42 / shaft', onTime: 87, whatsapp: true },
  { id: 'JW03', name: 'Bharat Zinc Plating', area: 'Kattedan', process: 'Zinc plating', gstin: '36AAJFB7714H1Z9', contact: 'Mohd. Ayub', phone: '+91 90•••• 4471', rate: '₹6 / bracket', onTime: 74, whatsapp: true },
  { id: 'JW04', name: 'Anand Welding Works', area: 'Jeedimetla', process: 'Fabrication overflow', gstin: '36AEZPA9902Q1Z1', contact: 'Anand Kumar', phone: '+91 97•••• 1185', rate: '₹ per job', onTime: 90, whatsapp: false },
];
export type Challan = {
  id: string; workerId: string; date: string; item: string; order: string; sent: number; returned: number; scrap: number; unit: string; expected: string; valuePerUnit: number;
  capital?: boolean; status: 'With job worker' | 'Partly returned' | 'Overdue' | 'Returned' | 'Draft'; eway?: string;
};
export const challans: Challan[] = [
  { id: 'DC-JW-0712', workerId: 'JW01', date: '2026-10-22', item: 'CPE-806 enclosure bodies (uncoated)', order: 'SO-1056', sent: 120, returned: 70, scrap: 0, unit: 'pcs', expected: '2026-10-29', valuePerUnit: 2900, status: 'Partly returned', eway: '3610 5521 0098' },
  { id: 'DC-JW-0714', workerId: 'JW02', date: '2026-10-24', item: 'EN8 shaft blanks for PHA-17', order: 'SO-1047', sent: 200, returned: 140, scrap: 2, unit: 'pcs', expected: '2026-10-30', valuePerUnit: 350, status: 'Partly returned' },
  { id: 'DC-JW-0709', workerId: 'JW03', date: '2026-10-15', item: 'MB-22 mounting brackets for zinc plating', order: 'Stock', sent: 2000, returned: 0, scrap: 0, unit: 'pcs', expected: '2026-10-25', valuePerUnit: 95, status: 'Overdue', eway: '3610 4419 7735' },
  { id: 'DC-JW-0688', workerId: 'JW04', date: '2026-05-06', item: 'Welding fixtures (tooling – capital goods)', order: 'Tooling', sent: 4, returned: 0, scrap: 0, unit: 'sets', expected: '2026-12-31', valuePerUnit: 12000, capital: true, status: 'With job worker' },
  { id: 'DC-JW-0701', workerId: 'JW01', date: '2026-10-09', item: 'JB-15 junction boxes (uncoated)', order: 'SO-1043', sent: 38, returned: 38, scrap: 0, unit: 'pcs', expected: '2026-10-14', valuePerUnit: 1900, status: 'Returned' },
];
export const inwardJobWork = [
  { id: 'JWI-031', principal: 'Bharat Electricals (OEM)', received: '2026-10-12', material: 'Customer-supplied CRCA sheet 1.6 mm', qtyIn: 150, consumed: 90, balance: 60, output: '180 of 300 enclosure doors delivered', charges: 54000, sac: '9988', status: 'In progress' },
  { id: 'JWI-029', principal: 'Vertex Automation', received: '2026-09-28', material: 'Customer-supplied SS 304 sheet 2 mm', qtyIn: 40, consumed: 40, balance: 0, output: '80 machine guards delivered', charges: 72000, sac: '9988', status: 'Completed – invoiced' },
];
export const capacity = [
  { process: 'Laser cutting', inhouse: 100, outsourced: 0, utilisation: 86 },
  { process: 'Bending', inhouse: 100, outsourced: 0, utilisation: 78 },
  { process: 'CNC machining', inhouse: 70, outsourced: 30, utilisation: 94 },
  { process: 'Welding', inhouse: 85, outsourced: 15, utilisation: 81 },
  { process: 'Assembly', inhouse: 100, outsourced: 0, utilisation: 72 },
  { process: 'Powder coating', inhouse: 0, outsourced: 100, utilisation: 0 },
  { process: 'Zinc plating', inhouse: 0, outsourced: 100, utilisation: 0 },
];
// ---- People ----
type EmpRow = [string, string, string, string, 'Permanent' | 'Contract', string];
const teamRows: [string, string, EmpRow[]][] = [
  ['Management', 'General (09:30–18:30)', [
    ['Riya Reddy', 'Managing Director', '—', 'Permanent', 'Permanent', 'Office'], ['Arvind Sharma', 'Head – Operations', 'Riya Reddy', 'Permanent', 'Permanent', 'Office'], ['Padma Priya', 'Finance Controller', 'Riya Reddy', 'Permanent', 'Permanent', 'Office']] ],
  ['Sales', 'General (09:30–18:30)', [
    ['Karthik Varma', 'Sales Manager', 'Riya Reddy', '', 'Permanent', 'Office'], ['Sneha Iyer', 'Senior Sales Executive', 'Karthik Varma', '', 'Permanent', 'Unit2'], ['Imran Khan', 'Sales Executive', 'Karthik Varma', '', 'Permanent', 'Office'], ['Divya Teja', 'Sales Coordinator', 'Karthik Varma', '', 'Permanent', 'Unit2']] ],
  ['Production – Fabrication & Machining', 'Shift A (06:00–14:00)', [
    ['Lokesh Naidu', 'Production Manager', 'Arvind Sharma', '', 'Permanent', 'Plant'], ['Ramesh Yadav', 'Fabrication Supervisor', 'Lokesh Naidu', '', 'Permanent', 'Plant'], ['Raju Goud', 'CNC Machinist', 'Ramesh Yadav', '', 'Permanent', 'Plant'], ['Shankar Nayak', 'Laser / Press Brake Operator', 'Ramesh Yadav', '', 'Permanent', 'Plant'], ['Bablu Kumar', 'Helper', 'Ramesh Yadav', '', 'Contract', 'Plant'], ['Manoj Paswan', 'Helper', 'Ramesh Yadav', '', 'Contract', 'Plant'], ['Sanjay Mahto', 'Helper', 'Ramesh Yadav', '', 'Contract', 'Plant'], ['Naresh Kumar', 'Laser / Press Brake Operator', 'Ramesh Yadav', '', 'Permanent', 'Plant'], ['Prakash Rathod', 'Helper', 'Ramesh Yadav', '', 'Contract', 'Plant'], ['Yadagiri Mudiraj', 'CNC Machinist', 'Ramesh Yadav', '', 'Permanent', 'Plant']] ],
  ['Production – Welding & Assembly', 'Day (08:00–17:00)', [
    ['Suresh Babu', 'Assembly Supervisor', 'Lokesh Naidu', '', 'Permanent', 'Plant'], ['Venu Gopal', 'Welder', 'Suresh Babu', '', 'Permanent', 'Plant'], ['Anil Kumar', 'Welder', 'Suresh Babu', '', 'Permanent', 'Plant'], ['Sunil Oraon', 'Assembly Technician', 'Suresh Babu', '', 'Contract', 'Plant'], ['Mallesh Kurma', 'Assembly Technician', 'Suresh Babu', '', 'Permanent', 'Plant'], ['Rakesh Munda', 'Assembly Technician', 'Suresh Babu', '', 'Contract', 'Plant'], ['Kiran Kumar', 'Fitter', 'Suresh Babu', '', 'Permanent', 'Plant'], ['Satish Chary', 'Assembly Technician', 'Suresh Babu', '', 'Permanent', 'Plant'], ['Ravi Teja', 'Assembly Technician', 'Suresh Babu', '', 'Contract', 'Plant']] ],
  ['QC & Packing', 'Day (08:00–17:00)', [
    ['Anjali Devi', 'QC Lead', 'Lokesh Naidu', '', 'Permanent', 'Plant'], ['Sravani K', 'QC Inspector', 'Anjali Devi', '', 'Permanent', 'Plant'], ['Mahesh Bind', 'Packer', 'Anjali Devi', '', 'Contract', 'Plant'], ['Chandu Naik', 'Packer', 'Anjali Devi', '', 'Contract', 'Plant'], ['Pooja Kumari', 'Packer', 'Anjali Devi', '', 'Contract', 'Plant'], ['Ashok Rao', 'Senior Packer', 'Anjali Devi', '', 'Permanent', 'Plant']] ],
  ['Dispatch & Logistics', 'Day (08:00–17:00)', [
    ['Mohammed Salim', 'Dispatch In-charge', 'Arvind Sharma', '', 'Permanent', 'Plant'], ['Syed Rafi', 'Driver', 'Mohammed Salim', '', 'Permanent', 'Plant'], ['Jagadish', 'Loader', 'Mohammed Salim', '', 'Contract', 'Plant'], ['Narsimha Rao', 'Forklift Operator', 'Mohammed Salim', '', 'Permanent', 'Plant'], ['Abdul Khader', 'Loader', 'Mohammed Salim', '', 'Contract', 'Plant']] ],
  ['Stores & Purchase', 'General (09:30–18:30)', [
    ['Harish Chandra', 'Stores & Purchase Executive', 'Arvind Sharma', '', 'Permanent', 'Plant'], ['Gopi Krishna', 'Storekeeper', 'Harish Chandra', '', 'Permanent', 'Plant'], ['Ramya Sri', 'Purchase Assistant', 'Harish Chandra', '', 'Permanent', 'Plant']] ],
  ['Accounts & Admin', 'General (09:30–18:30)', [
    ['Srikanth Mantri', 'Accountant', 'Padma Priya', '', 'Permanent', 'Office'], ['Bhargavi Reddy', 'Accounts Executive – Receivables', 'Srikanth Mantri', '', 'Permanent', 'Office'], ['Kavya Menon', 'HR & Admin Executive', 'Padma Priya', '', 'Permanent', 'Office'], ['Ramu Naik', 'Security Guard', 'Kavya Menon', '', 'Contract', 'Plant'], ['Lalitha', 'Housekeeping', 'Kavya Menon', '', 'Contract', 'Office']] ],
];
export type Employee = {
  id: string; name: string; role: string; team: string; manager: string; type: 'Permanent' | 'Contract'; shift: string; site: string;
  status: 'Present' | 'Absent' | 'On leave' | 'Late'; checkIn: string; checkOut: string; leave: string; exception?: string; pf: boolean; esi: boolean; joined: string; contractor?: string;
};
const specials: Record<string, Partial<Employee>> = {
  'Manoj Paswan': { status: 'Absent', checkIn: '—', exception: 'No punch – absent without intimation' },
  'Mallesh Kurma': { status: 'On leave', checkIn: '—', leave: 'Sick leave – pending approval', exception: 'Leave request pending approval' },
  'Gopi Krishna': { status: 'On leave', checkIn: '—', leave: 'Casual leave – approved' },
  'Prakash Rathod': { status: 'Late', checkIn: '06:38', exception: 'Late check-in (38 min)' },
  'Imran Khan': { status: 'Late', checkIn: '10:12', exception: 'Late check-in (42 min) – customer visit noted' },
  'Syed Rafi': { exception: 'Missed check-out on 27 Oct' },
};
let n = 1001;
export const employees: Employee[] = teamRows.flatMap(([team, shift, rows]) =>
  rows.map(([name, role, manager, , type, site], i) => {
    const id = `EMP-${n++}`;
    const cin = shift.startsWith('Shift A') ? `05:${String(48 + (i % 10)).padStart(2, '0')}` : shift.startsWith('Day') ? `07:${String(46 + (i % 12)).padStart(2, '0')}` : `09:${String(14 + ((i * 3) % 15)).padStart(2, '0')}`;
    const prodLike = !['Management', 'Sales', 'Accounts & Admin'].includes(team) || ['Ramu Naik', 'Lalitha'].includes(name);
    const base: Employee = {
      id, name, role, team, manager, type, shift, site: site === 'Office' ? 'Jeedimetla – Office' : site === 'Unit2' ? 'Cherlapally Unit 2' : 'Jeedimetla – Plant',
      status: 'Present', checkIn: cin, checkOut: '—', leave: '—', pf: type === 'Permanent', esi: prodLike, joined: `20${18 + ((i * 7 + team.length) % 8)}-0${1 + (i % 9)}-1${i % 9}`,
      contractor: type === 'Contract' ? 'Sai Manpower Services' : undefined,
    };
    return { ...base, ...(specials[name] || {}) } as Employee;
  }),
);

// ---- Finance ----
export type Invoice = {
  id: string; customerId: string; order: string; issue: string; due: string; total: number; paid: number; status: 'Overdue' | 'Due' | 'Paid' | 'Part paid';
  history: { date: string; text: string; mode?: string; amount?: number }[]; pdc?: { cheque: string; bank: string; date: string; amount: number }; ewb?: string; interstate?: boolean;
};
export const invoices: Invoice[] = [
  { id: 'INV-1048', customerId: 'C01', order: 'SO-1039', issue: '2026-09-16', due: '2026-10-16', total: 210000, paid: 0, status: 'Overdue', ewb: '3610 4482 7719', history: [
    { date: '2026-10-22', text: 'WhatsApp reminder sent to Srinivas Rao – "payment next week"', mode: 'WhatsApp' },
    { date: '2026-10-17', text: 'Call by Bhargavi Reddy – promised to clear after their bank release', mode: 'Call' },
    { date: '2026-09-16', text: 'Invoice issued & shared on WhatsApp/email. E-way bill 3610 4482 7719.' },
  ] },
  { id: 'INV-1041', customerId: 'C05', order: 'SO-1038', issue: '2026-09-01', due: '2026-10-01', total: 68000, paid: 0, status: 'Overdue', pdc: { cheque: '004512', bank: 'Canara Bank, KPHB', date: '2026-11-05', amount: 68000 }, history: [
    { date: '2026-10-20', text: 'Post-dated cheque 004512 received (dated 05 Nov 2026)', mode: 'Cheque (PDC)', amount: 68000 },
    { date: '2026-10-08', text: 'Reminder call – customer cited delayed builder payment', mode: 'Call' },
    { date: '2026-09-01', text: 'Invoice issued' },
  ] },
  { id: 'INV-1044', customerId: 'C06', order: 'SO-1041', issue: '2026-10-02', due: '2026-10-23', total: 42000, paid: 0, status: 'Overdue', history: [{ date: '2026-10-02', text: 'Invoice issued' }] },
  { id: 'INV-1050', customerId: 'C02', order: 'SO-1042', issue: '2026-10-07', due: '2026-11-06', total: 145000, paid: 0, status: 'Due', history: [{ date: '2026-10-07', text: 'Invoice issued' }] },
  { id: 'INV-1051', customerId: 'C04', order: 'SO-1040', issue: '2026-10-10', due: '2026-11-24', total: 162000, paid: 0, status: 'Due', history: [{ date: '2026-10-10', text: 'Invoice issued' }] },
  { id: 'INV-1053', customerId: 'C07', order: 'SO-1037', issue: '2026-10-14', due: '2026-11-13', total: 88000, paid: 0, status: 'Due', history: [{ date: '2026-10-14', text: 'Invoice issued' }] },
  { id: 'INV-1054', customerId: 'C08', order: 'SO-1036', issue: '2026-10-20', due: '2026-11-19', total: 125000, paid: 0, status: 'Due', history: [{ date: '2026-10-20', text: 'Invoice issued' }] },
  { id: 'INV-1047', customerId: 'C09', order: 'SO-1034', issue: '2026-09-12', due: '2026-10-12', total: 118000, paid: 118000, status: 'Paid', interstate: true, history: [{ date: '2026-10-10', text: 'Payment received', mode: 'NEFT', amount: 118000 }, { date: '2026-09-12', text: 'Invoice issued (IGST)' }] },
  { id: 'INV-1046', customerId: 'C11', order: 'SO-1033', issue: '2026-09-10', due: '2026-10-10', total: 96000, paid: 96000, status: 'Paid', history: [{ date: '2026-10-09', text: 'Payment received', mode: 'UPI', amount: 96000 }, { date: '2026-09-10', text: 'Invoice issued' }] },
  { id: 'INV-1045', customerId: 'C04', order: 'SO-1032', issue: '2026-09-05', due: '2026-10-20', total: 204000, paid: 204000, status: 'Paid', history: [{ date: '2026-10-19', text: 'Payment received', mode: 'RTGS', amount: 204000 }, { date: '2026-09-05', text: 'Invoice issued' }] },
];
export type Bill = { id: string; supplierId: string; ref: string; date: string; due: string; amount: number; paid: number; tds?: string; msme45: string; status: 'Due this week' | 'Upcoming' | 'Paid' | 'Overdue'; note?: string };
export const bills: Bill[] = [
  { id: 'PB-0551', supplierId: 'S08', ref: 'SVS/INV/2609/442 (PO-0905)', date: '2026-09-15', due: '2026-10-30', amount: 184000, paid: 0, msme45: '2026-10-30', status: 'Due this week', note: 'MSME supplier – 45-day limit falls on 30 Oct (Sec 43B(h))' },
  { id: 'PB-0558', supplierId: 'S04', ref: 'HTC/1187 (PO-0910)', date: '2026-10-01', due: '2026-10-31', amount: 38500, paid: 0, msme45: '2026-11-15', status: 'Due this week' },
  { id: 'PB-0560', supplierId: 'S05', ref: 'SST/BILL/2610-14', date: '2026-10-15', due: '2026-10-30', amount: 21600, paid: 0, tds: 'TDS 194C @1% – ₹216', msme45: '2026-11-29', status: 'Due this week' },
  { id: 'PB-0561', supplierId: 'S07', ref: 'TGSPDCL – HT Svc 1124', date: '2026-10-19', due: '2026-11-02', amount: 62400, paid: 0, msme45: '—', status: 'Due this week', note: 'Power bill – Jeedimetla plant (HT)' },
  { id: 'PB-0563', supplierId: 'S06', ref: 'SMS/OCT/2026', date: '2026-10-25', due: '2026-11-07', amount: 248000, paid: 0, tds: 'TDS 194C @2% – ₹4,960', msme45: '2026-12-09', status: 'Upcoming', note: 'Contract labour (14 workers) – verify ESI/PF challans before payment' },
  { id: 'PB-0549', supplierId: 'S03', ref: 'PC/INV/0977 (PO-0901)', date: '2026-09-24', due: '2026-10-24', amount: 352000, paid: 352000, msme45: '2026-11-08', status: 'Paid' },
];
export const bank = { hdfc: 586000, cash: 18500, ccLimit: 2500000, ccUsed: 1640000, monthlyFixed: 1120000 };

// ---- Reports ----
export const monthly = [
  { m: 'Apr', revenue: 17.9, collected: 17.4, margin: 33.1, dso: 34, invValue: 15.2, stockouts: 1, production: 92, onTime: 95, attendance: 94.2, orders: 21 },
  { m: 'May', revenue: 18.6, collected: 18.1, margin: 32.8, dso: 35, invValue: 15.9, stockouts: 0, production: 94, onTime: 93, attendance: 95.1, orders: 22 },
  { m: 'Jun', revenue: 19.4, collected: 18.6, margin: 33.5, dso: 36, invValue: 16.4, stockouts: 2, production: 91, onTime: 94, attendance: 93.8, orders: 23 },
  { m: 'Jul', revenue: 20.9, collected: 19.2, margin: 32.4, dso: 38, invValue: 17.1, stockouts: 1, production: 93, onTime: 91, attendance: 92.6, orders: 25 },
  { m: 'Aug', revenue: 21.5, collected: 19.0, margin: 31.9, dso: 41, invValue: 17.8, stockouts: 2, production: 90, onTime: 90, attendance: 94.0, orders: 25 },
  { m: 'Sep', revenue: 22.1, collected: 18.9, margin: 32.2, dso: 44, invValue: 18.6, stockouts: 2, production: 89, onTime: 88, attendance: 93.6, orders: 26 },
  { m: 'Oct', revenue: 24.8, collected: 19.6, margin: 31.6, dso: 47, invValue: 0, stockouts: 3, production: 88, onTime: 86, attendance: 93.3, orders: 28 },
];
export const compliance = [
  { name: 'GSTR-1 (October)', due: '2026-11-11', status: 'Draft ready – 46 invoices', tone: 'blue' },
  { name: 'GSTR-3B (October)', due: '2026-11-20', status: 'ITC mismatch ₹85,000 vs GSTR-2B', tone: 'amber' },
  { name: 'TDS deposit (194C, Oct)', due: '2026-11-07', status: '₹5,176 to deposit', tone: 'blue' },
  { name: 'PF & ESI (October wages)', due: '2026-11-15', status: 'Contractor challans pending', tone: 'amber' },
  { name: 'ITC-04 (job work, annual)', due: '2027-04-25', status: '5 challans recorded for FY 2026-27', tone: 'green' },
];
