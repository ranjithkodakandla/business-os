/** Plan catalog, add-ons and subscription lifecycle seed (simulated). Shared by Platform admin and tenant Billing. */
export type Tier = 'Basic' | 'Starter' | 'Growth' | 'Pro' | 'Enterprise';
export const TIERS: { name: Tier; price: number | null; annual: number | null; users: number | string; companies: number; aiCredits: number | string; wa: number | string; einv: number | string; storage: string; support: string; blurb: string }[] = [
  { name: 'Basic', price: 1999, annual: 19990, users: 2, companies: 1, aiCredits: 200, wa: 300, einv: 100, storage: '5 GB', support: 'Help centre', blurb: 'Billing, GST and stock for micro units' },
  { name: 'Starter', price: 4999, annual: 49990, users: 5, companies: 1, aiCredits: 500, wa: 1000, einv: 300, storage: '10 GB', support: 'Email · 48h', blurb: 'Sell, bill and stock for one unit' },
  { name: 'Growth', price: 14999, annual: 149990, users: 25, companies: 2, aiCredits: 2500, wa: 3000, einv: 1500, storage: '100 GB', support: 'Chat + WhatsApp · 24h', blurb: 'Adds buying, people & payroll, shop floor' },
  { name: 'Pro', price: 39999, annual: 399990, users: 200, companies: 5, aiCredits: 10000, wa: 10000, einv: 'Unlimited', storage: '1 TB', support: 'Priority · 4h, CSM', blurb: 'Everything incl. BOM, QC, bank recon, voice agents' },
  { name: 'Enterprise', price: null, annual: null, users: 'Unlimited', companies: 99, aiCredits: 'Custom', wa: 'Custom', einv: 'Unlimited', storage: 'Custom', support: '24×7 · named TAM, SLA 99.95%', blurb: 'Multi-entity groups, SSO, dedicated DB, custom contract' },
];
export const FEATURES: [string, Tier][] = [['Sales, orders, GST invoicing', 'Basic'], ['Inventory & stock', 'Basic'], ['Finance & reports', 'Basic'], ['Collections agent', 'Starter'], ['Customer inbox (WhatsApp)', 'Starter'], ['Procurement & suppliers', 'Growth'], ['People, attendance, payroll', 'Growth'], ['Operations & job work', 'Growth'], ['AI agents (4)', 'Growth'], ['BOM, MRP & QC', 'Pro'], ['Bank recon & TDS', 'Pro'], ['Voice calling agents', 'Pro'], ['Sourcing agent', 'Pro'], ['SSO (SAML/OIDC) & audit export', 'Pro'], ['Dedicated database & data residency', 'Enterprise'], ['Custom roles & approval workflows', 'Enterprise'], ['Multi-entity consolidation', 'Enterprise']];
export const tierRank = (t: Tier) => TIERS.findIndex((x) => x.name === t);
export type Addon = { id: string; name: string; unit: string; price: number; desc: string; meter?: string };
export const ADDONS: Addon[] = [
  { id: 'users', name: 'Extra users', unit: 'per user / month', price: 499, desc: 'Beyond your plan limit' },
  { id: 'wa', name: 'WhatsApp message pack', unit: '1,000 msgs', price: 900, desc: 'Utility/marketing conversations at Meta rates + margin', meter: 'WhatsApp messages' },
  { id: 'ai', name: 'AI credits', unit: '1,000 credits', price: 1200, desc: 'Agent runs, document reading, voice minutes', meter: 'AI credits' },
  { id: 'einv', name: 'E-invoice / e-way volume', unit: '500 IRNs', price: 750, desc: 'Above plan quota (GSP charges)', meter: 'E-invoices' },
  { id: 'gstin', name: 'Extra company / GSTIN', unit: 'per GSTIN / month', price: 2999, desc: 'Another legal entity or state registration' },
  { id: 'storage', name: 'Storage', unit: '100 GB / month', price: 600, desc: 'Documents, drawings, PODs' },
  { id: 'device', name: 'Attendance device', unit: 'per device / month (rental)', price: 699, desc: 'Face + fingerprint terminal supplied & managed by us' },
];
export const OVERAGE = [['WhatsApp messages', '₹0.95 per msg above quota', 'Soft limit – alert at 80%, 100%'], ['AI credits', '₹1.40 per credit above quota', 'Hard stop at 120% unless auto top-up'], ['E-invoices', '₹1.75 per IRN above quota', 'Soft limit'], ['Users', '₹499 pro-rated per user', 'Admin approval to add'], ['Storage', '₹6 per GB', 'Soft limit']];
/** Days-based proration for a mid-cycle plan change. */
export const prorate = (from: number, to: number, daysLeft: number, daysInCycle = 30) => Math.round((to - from) * daysLeft / daysInCycle);
