import { FACTORY } from '../factory/edition';
/** Platform (SaaS vendor) demo data: tenants, plans, billing, support, infra. Browser-session only. */
import { MODULES } from '../lib/nav';
import type { Rollout } from './rollout';
export type Plan = 'Starter' | 'Growth' | 'Pro';
export type Region = 'India-South' | 'India-West' | 'India-North' | 'ME';
export type Status = 'Active' | 'Trial' | 'Suspended';
export type Tenant = { id: string; name: string; city: string; industry: string; plan: Plan; region: Region; status: Status; users: number; mrr: number; health: number; lastActive: string; idleDays: number; db: 'Shared' | 'Dedicated'; version: string; gstin: string; since: string; usage: Record<string, number> };
export type PInvoice = { id: string; tenant: string; month: string; amount: number; status: 'Paid' | 'Failed' | 'Due'; attempts: number; gst: number };
export type PTicket = { id: string; tenant: string; subject: string; priority: 'P1' | 'P2' | 'P3'; status: 'Open' | 'In progress' | 'Resolved'; ageHrs: number; slaHrs: number; owner: string };
export type PlanDef = { name: Plan; price: number; users: string; agents: string; storage: string; modules: string[]; blurb: string };
export type PlatState = { tenants: Tenant[]; flags: Record<string, Record<string, boolean>>; invoices: PInvoice[]; tickets: PTicket[]; rollout: Record<string, Rollout>; log: { at: string; tenant: string; text: string }[] };

const STARTER = ['home', 'approvals', 'notifications', 'sales', 'orders', 'gst', 'inventory', 'finance', 'reports', 'settings', 'audit', 'documents', 'integrations', 'setup', 'billing', 'workspace', 'alerts'];
const GROWTH = [...STARTER, 'inbox', 'dispatch', 'procurement', 'suppliers', 'people', 'attendance', 'payroll', 'expenses', 'operations', 'jobwork', 'collections', 'agents', 'match'];
export const PLANS: PlanDef[] = [
  { name: 'Starter', price: 4999, users: 'Up to 10 users', agents: '1 AI agent', storage: '10 GB', modules: STARTER, blurb: 'Sell, bill and stock for a single unit' },
  { name: 'Growth', price: 14999, users: 'Unlimited users', agents: '4 AI agents', storage: '100 GB', modules: GROWTH, blurb: 'Adds buying, people & payroll, shop floor' },
  { name: 'Pro', price: 39999, users: 'Unlimited users', agents: 'All agents + voice calls', storage: '1 TB · dedicated DB option', modules: MODULES.map((m) => m.key), blurb: 'Everything incl. BOM, QC, bank recon, sourcing agent' },
];
export const FLAG_KEYS = MODULES.filter((m) => m.key !== 'home').map((m) => m.key);
export const planMods = (p: Plan) => PLANS.find((x) => x.name === p)!.modules;
const T = (id: string, name: string, city: string, industry: string, plan: Plan, region: Region, status: Status, users: number, health: number, idleDays: number, db: 'Shared' | 'Dedicated', version: string, since: string): Tenant => ({
  id, name, city, industry, plan, region, status, users, mrr: status === 'Trial' ? 0 : status === 'Suspended' ? 0 : PLANS.find((x) => x.name === plan)!.price,
  health, idleDays, lastActive: idleDays === 0 ? 'Today' : idleDays === 1 ? 'Yesterday' : `${idleDays} days ago`, db, version, since,
  gstin: `36AAB${id.slice(-3).toUpperCase()}${(users * 7) % 9}Z${(health % 9) + 1}`,
  usage: Object.fromEntries(planMods(plan).slice(0, 9).map((k, i) => [k, Math.max(4, Math.round((health / 100) * (90 - i * 8) + ((users * (i + 3)) % 17)))])),
});
export const seedPlat = (): PlatState => {
  const tenants = [
    T('t-aarohan', 'Aarohan Industries', 'Hyderabad', 'Fabrication & components', 'Pro', 'India-South', 'Active', 45, 92, 0, 'Dedicated', 'v2.14.0', 'Apr 2025'),
    T('t-deccan', 'Deccan Castings', 'Hyderabad', 'Ferrous castings', 'Growth', 'India-South', 'Active', 22, 78, 1, 'Shared', 'v2.14.0', 'Aug 2025'),
    T('t-shree', 'Shree Balaji Polymers', 'Ahmedabad', 'Plastic moulding', 'Starter', 'India-West', 'Active', 6, 54, 9, 'Shared', 'v2.13.2', 'Jan 2026'),
    T('t-kaveri', 'Kaveri Pumps & Motors', 'Coimbatore', 'Pumps', 'Pro', 'India-South', 'Active', 68, 88, 0, 'Dedicated', 'v2.14.0', 'Nov 2024'),
    T('t-sahyadri', 'Sahyadri Auto Components', 'Pune', 'Auto ancillary', 'Growth', 'India-West', 'Active', 31, 41, 14, 'Shared', 'v2.12.5', 'Mar 2025'),
    T('t-gulf', 'Gulf Precision Engineering', 'Sharjah', 'Precision machining', 'Pro', 'ME', 'Active', 40, 83, 0, 'Dedicated', 'v2.14.0', 'Jun 2025'),
    T('t-vindhya', 'Vindhya Steel Fabricators', 'Indore', 'Structural steel', 'Growth', 'India-West', 'Suspended', 18, 22, 37, 'Shared', 'v2.11.0', 'Sep 2024'),
    T('t-tirupati', 'Tirupati Packaging', 'Vijayawada', 'Corrugated boxes', 'Starter', 'India-South', 'Trial', 4, 66, 2, 'Shared', 'v2.14.0', 'Oct 2026'),
    T('t-narmada', 'Narmada Textiles Machinery', 'Surat', 'Textile machinery', 'Growth', 'India-West', 'Active', 27, 72, 3, 'Shared', 'v2.13.2', 'Feb 2025'),
    T('t-chola', 'Chola Electricals', 'Chennai', 'Switchgear', 'Growth', 'India-South', 'Active', 24, 58, 6, 'Shared', 'v2.14.0', 'May 2025'),
    T('t-punjab', 'Punjab Agro Implements', 'Ludhiana', 'Farm equipment', 'Starter', 'India-North', 'Active', 5, 47, 11, 'Shared', 'v2.13.2', 'Dec 2025'),
    T('t-emirates', 'Emirates Fasteners LLC', 'Dubai', 'Fasteners', 'Growth', 'ME', 'Trial', 9, 74, 1, 'Shared', 'v2.14.0', 'Oct 2026'),
  ];
  const flags = Object.fromEntries(tenants.map((t) => [t.id, Object.fromEntries(FLAG_KEYS.map((k) => [k, planMods(t.plan).includes(k)]))]));
  const unpaid: Record<string, 'Failed' | 'Due'> = { 't-shree': 'Failed', 't-sahyadri': 'Failed', 't-vindhya': 'Failed', 't-punjab': 'Due', 't-chola': 'Due' };
  const invoices: PInvoice[] = tenants.filter((t) => t.status !== 'Trial').flatMap((t, i) => ['Aug 2026', 'Sep 2026', 'Oct 2026'].map((m, j) => {
    const base = PLANS.find((x) => x.name === t.plan)!.price;
    const st = j === 2 ? (unpaid[t.id] || 'Paid') : t.id === 't-vindhya' && j === 1 ? 'Failed' : 'Paid';
    return { id: `AOS/26-27/${String(300 + i * 3 + j).padStart(4, '0')}`, tenant: t.id, month: m, amount: base, status: st, attempts: st === 'Failed' ? (t.id === 't-vindhya' ? 4 : 2) : st === 'Due' ? 0 : 1, gst: Math.round(base * 0.18) };
  }));
  const tickets: PTicket[] = [
    { id: 'PS-221', tenant: 't-sahyadri', subject: 'E-way bill generation timing out', priority: 'P1', status: 'Open', ageHrs: 6, slaHrs: 4, owner: 'Anil (L2)' },
    { id: 'PS-219', tenant: 't-deccan', subject: 'Need Payroll module – quote please', priority: 'P3', status: 'Open', ageHrs: 20, slaHrs: 48, owner: 'Meera (CSM)' },
    { id: 'PS-218', tenant: 't-gulf', subject: 'VAT invoice format for UAE customers', priority: 'P2', status: 'In progress', ageHrs: 30, slaHrs: 24, owner: 'Anil (L2)' },
    { id: 'PS-216', tenant: 't-kaveri', subject: 'Add 10 more users to Unit 3', priority: 'P3', status: 'Resolved', ageHrs: 50, slaHrs: 48, owner: 'Meera (CSM)' },
    { id: 'PS-215', tenant: 't-shree', subject: 'Card payment failed – change to UPI autopay', priority: 'P2', status: 'Open', ageHrs: 9, slaHrs: 24, owner: 'Billing desk' },
    { id: 'PS-212', tenant: 't-chola', subject: 'Tally export missing cost centres', priority: 'P2', status: 'In progress', ageHrs: 12, slaHrs: 24, owner: 'Sana (L1)' },
  ];
  const H = (text: string, at = '12 Oct 2026') => ({ at, by: 'Ranjith Kumar', text });
  const rollout: Record<string, Rollout> = Object.fromEntries(FLAG_KEYS.map((k) => [k, { stage: 'GA', alpha: [], beta: [], pct: 100, killed: false, history: [H('Created · GA', '01 Apr 2025')] } as Rollout]));
  if (rollout.agents && !FACTORY) Object.assign(rollout.agents, { stage: 'Beta', beta: ['t-kaveri', 't-gulf', 't-deccan'], history: [H('Beta · opt-ins Kaveri, Gulf Precision, Deccan'), H('Alpha → Kaveri Pumps', '20 Sep 2026'), H('Created · Internal', '02 Sep 2026')] });
  if (rollout.bank) Object.assign(rollout.bank, { stage: 'Gradual', pct: 40, history: [H('Gradual 40%'), H('Gradual 20%', '01 Oct 2026'), H('Created · Internal', '15 Aug 2026')] });
  if (rollout.qc) Object.assign(rollout.qc, { stage: 'Alpha', alpha: ['t-kaveri', 't-narmada'], history: [H('Alpha → Kaveri Pumps, Narmada Textiles'), H('Created · Internal', '05 Oct 2026')] });
  return { tenants, flags, invoices, tickets, rollout, log: [
    { at: '18:42', tenant: 't-aarohan', text: 'Riya Reddy approved PR-208 (₹3.8 lakh)' }, { at: '17:10', tenant: 't-kaveri', text: '12 users logged in · sourcing agent ran 3 RFQs' },
    { at: '15:55', tenant: 't-deccan', text: 'Payroll quote requested via support' }, { at: '12:30', tenant: 't-sahyadri', text: 'Payment retry failed (card declined)' },
    { at: '09:05', tenant: 't-gulf', text: 'Deployed v2.14.0 to ME region' },
  ] };
};
export const MRR_TREND = [['Nov', 1.42], ['Dec', 1.51], ['Jan', 1.63], ['Feb', 1.70], ['Mar', 1.84], ['Apr', 1.92], ['May', 2.05], ['Jun', 2.11], ['Jul', 2.24], ['Aug', 2.31], ['Sep', 2.38], ['Oct', 2.46]].map(([m, v]) => ({ m: m as string, v: v as number }));
export const mrrOf = (p: PlatState) => p.tenants.reduce((a, t) => a + t.mrr, 0);
export const churnRisk = (p: PlatState) => p.tenants.filter((t) => t.status !== 'Trial' && (t.health < 60 || t.idleDays > 7 || p.invoices.some((i) => i.tenant === t.id && i.status === 'Failed')));
export const tenantByName = (p: PlatState, q: string) => { const n = q.toLowerCase().replace(/[^a-z ]/g, '').trim(); return n ? p.tenants.find((t) => t.name.toLowerCase().includes(n) || n.includes(t.name.toLowerCase().split(' ')[0])) : undefined; };
export const inrP = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const lakhP = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : inrP(n);
