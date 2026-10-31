/**
 * Module registration (nav metadata). To add a module:
 *  1. add an entry here (key, path, group, icon, labels, desc),
 *  2. map its key to a page in src/modules/registry.tsx (ROUTES),
 *  3. give roles access in src/lib/rbac.ts SCOPE (Owner always sees everything).
 * Nav, the All-modules flyout, Home cards, search and the AI scope check all read from this list.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Home, Inbox, Handshake, ClipboardList, ShoppingCart, Boxes, Factory, Users, IndianRupee, BarChart3, Truck, Bot, Plug, Sparkles, Contact,
  Wallet, MessagesSquare, FileCheck2, CalendarClock, History, Settings, Coins,
  Cog, ShieldCheck, Landmark, Receipt, PackageCheck, Bell, FolderOpen, CreditCard, BellRing, GitCompareArrows,
} from 'lucide-react';
import type { Lang } from './i18n';
import { FACTORY } from '../factory/edition';
export type Group = 'Home' | 'Sell' | 'Make' | 'Buy' | 'People' | 'Money' | 'Admin';
export const GROUPS: Group[] = ['Home', 'Sell', 'Make', 'Buy', 'People', 'Money', 'Admin'];
export const GROUP_LABEL: Record<Group, Record<Lang, string>> = {
  Home: { en: 'Home & Inbox', hi: 'होम और इनबॉक्स', te: 'హోమ్ & ఇన్‌బాక్స్' }, Sell: { en: 'Sell', hi: 'बिक्री', te: 'అమ్మకం' }, Make: { en: 'Make', hi: 'उत्पादन', te: 'తయారీ' },
  Buy: { en: 'Buy & Stock', hi: 'ख़रीद और स्टॉक', te: 'కొనుగోలు & స్టాక్' }, People: { en: 'People', hi: 'कर्मचारी', te: 'ఉద్యోగులు' },
  Money: { en: 'Money', hi: 'पैसा', te: 'డబ్బు' }, Admin: { en: 'Admin', hi: 'एडमिन', te: 'అడ్మిన్' },
};
export const GROUP_ICON: Record<Group, LucideIcon> = { Home: Home, Sell: Handshake, Make: Factory, Buy: Boxes, People: Users, Money: IndianRupee, Admin: Settings };
const ORDER = ['home', 'approvals', 'notifications', 'alerts', 'inbox', 'sales', 'orders', 'dispatch', 'gst', 'bom', 'jobwork', 'qc', 'operations', 'procurement', 'suppliers', 'inventory', 'people', 'attendance', 'payroll', 'expenses', 'finance', 'collections', 'bank', 'match', 'reports', 'settings', 'billing', 'workspace', 'audit', 'documents', 'agents', 'integrations', 'setup'];
export type NavItem = { key: string; to: string; icon: LucideIcon; group: Group; label: Record<Lang, string>; desc: string; sub?: [string, string][]; fx?: boolean };
const L = (en: string, hi: string, te: string) => ({ en, hi, te });
export const MODULES: NavItem[] = [
  { key: 'home', to: '/', icon: Home, group: 'Home', label: L('Home', 'होम', 'హోమ్'), desc: 'Ask anything, see what needs you' },
  { key: 'approvals', to: '/approvals', icon: Inbox, group: 'Home', label: L('Approvals', 'मंज़ूरियाँ', 'ఆమోదాలు'), desc: 'Everything waiting for a decision' },
  { key: 'sales', to: '/sales', icon: Handshake, group: 'Sell', label: L('Sales & CRM', 'बिक्री और CRM', 'అమ్మకాలు & CRM'), desc: 'Leads, quotes and customers' },
  { key: 'orders', to: '/orders', icon: ClipboardList, group: 'Sell', label: L('Orders', 'ऑर्डर', 'ఆర్డర్లు'), desc: 'Customer orders and delivery promises' },
  { key: 'inbox', to: '/inbox', icon: MessagesSquare, group: 'Home', label: L('Customer inbox', 'ग्राहक इनबॉक्स', 'కస్టమర్ ఇన్‌బాక్స్'), desc: 'WhatsApp, email, calls → tickets & complaints' },
  { key: 'operations', to: '/operations', icon: Factory, group: 'Make', label: L('Operations', 'उत्पादन', 'ఉత్పత్తి'), desc: 'Work orders and shop floor; dispatch lives in Dispatch', sub: [] },
  { key: 'jobwork', to: '/job-work', icon: Truck, group: 'Make', label: L('Job Work', 'जॉब वर्क', 'జాబ్ వర్క్'), desc: 'Material out to job workers' },
  { key: 'procurement', to: '/procurement', icon: ShoppingCart, group: 'Buy', label: L('Procurement', 'ख़रीद', 'కొనుగోళ్లు'), desc: 'Purchase requests and orders' },
  { key: 'suppliers', to: '/suppliers', icon: Contact, group: 'Buy', label: L('Supplier contacts', 'सप्लायर संपर्क', 'సరఫరాదారుల సంప్రదింపులు'), desc: 'Supplier contacts and sourcing', sub: [['Live sourcing', '/sourcing/live']] },
  { key: 'inventory', to: '/inventory', icon: Boxes, group: 'Buy', label: L('Inventory', 'स्टॉक', 'స్టాక్'), desc: 'Stock, reorder and slow movers' },
  { key: 'people', to: '/people', icon: Users, group: 'People', label: L('People & HR', 'कर्मचारी', 'ఉద్యోగులు'), desc: 'Employees and contractors' },
  { key: 'attendance', to: '/attendance', icon: CalendarClock, group: 'People', label: L('Attendance & leave', 'हाज़िरी और छुट्टी', 'హాజరు & సెలవు'), desc: 'Muster roll, shifts, leave, OT, contractors' },
  { key: 'payroll', to: '/payroll', icon: Coins, group: 'People', label: L('Payroll', 'वेतन', 'జీతాలు'), desc: 'Pay runs, payslips, PF/ESI, advances' },
  { key: 'finance', to: '/finance', icon: IndianRupee, group: 'Money', label: L('Finance', 'वित्त', 'ఆర్థికం'), desc: 'Invoices, bills and cash' },
  { key: 'collections', to: '/collections', icon: Wallet, group: 'Money', label: L('Collections', 'वसूली', 'వసూళ్లు'), desc: 'Overdue receivables and follow-ups' },
  { key: 'gst', to: '/gst', icon: FileCheck2, group: 'Sell', label: L('GST & e-invoice', 'GST और ई-इनवॉइस', 'GST & ఈ-ఇన్వాయిస్'), desc: 'IRN, e-way bills, GSTR-1/3B' },
  { key: 'reports', to: '/reports', icon: BarChart3, group: 'Money', label: L('Reports', 'रिपोर्ट', 'నివేదికలు'), desc: 'Sales, margin and cash reports' },
  // P1/P2 modules (pages in src/pages/P1Modules.tsx)
  { key: 'bom', to: '/production', icon: Cog, group: 'Make', label: L('BOM & Production', 'BOM और उत्पादन', 'BOM & ఉత్పత్తి'), desc: 'BOMs, MRP shortfall, work orders, cost vs plan' },
  { key: 'qc', to: '/quality', icon: ShieldCheck, group: 'Make', label: L('Quality control', 'गुणवत्ता', 'నాణ్యత'), desc: 'Inspections, NCR/CAPA, supplier scores' },
  { key: 'dispatch', to: '/dispatch', icon: PackageCheck, group: 'Sell', label: L('Dispatch', 'डिस्पैच', 'డిస్పాచ్'), desc: 'Dispatch plan, packing, LR, POD' },
  { key: 'bank', to: '/bank-tds', icon: Landmark, group: 'Money', label: L('Bank & TDS', 'बैंक और TDS', 'బ్యాంక్ & TDS'), desc: 'Bank reconciliation, TDS register, 26Q' },
  { key: 'expenses', to: '/expenses', icon: Receipt, group: 'People', label: L('Expenses', 'ख़र्चे', 'ఖర్చులు'), desc: 'Claims with receipts, approvals, payout' },
  { key: 'alerts', to: '/alerts', icon: BellRing, group: 'Home', label: L('Alerts & preferences', 'अलर्ट और पसंद', 'అలర్ట్‌లు & ప్రాధాన్యతలు'), desc: '28 alert types – channel, frequency and scope per role' },
  { key: 'match', to: '/three-way-match', icon: GitCompareArrows, group: 'Money', label: L('Three-way match', 'थ्री-वे मैच', 'త్రీ-వే మ్యాచ్'), desc: 'PO vs GRN vs bill, SO vs OC vs invoice – AI explains mismatches' },
  { key: 'notifications', to: '/notifications', icon: Bell, group: 'Home', label: L('Notifications', 'सूचनाएँ', 'నోటిఫికేషన్లు'), desc: 'Alerts, compliance calendar, daily brief' },
  { key: 'documents', to: '/documents', icon: FolderOpen, group: 'Admin', label: L('Documents', 'दस्तावेज़', 'పత్రాలు'), desc: 'Certificates, drawings, contracts, PODs' },
  { key: 'settings', to: '/settings', icon: Settings, group: 'Admin', label: L('Settings & access', 'सेटिंग्स', 'సెట్టింగ్‌లు'), desc: 'Company, users, roles, approvals, series' },
  { key: 'billing', to: '/billing', icon: CreditCard, group: 'Admin', label: L('Billing & subscription', 'बिलिंग और सदस्यता', 'బిల్లింగ్ & సబ్‌స్క్రిప్షన్'), desc: 'Your plan, GST invoices, pay dues, TDS & Form 16A' },
  { key: 'workspace', to: '/workspace-admin', icon: ShieldCheck, group: 'Admin', label: L('Workspace admin', 'वर्कस्पेस एडमिन', 'వర్క్‌స్పేస్ అడ్మిన్'), desc: 'SSO/MFA, invites, API keys, import/export, limits, help' },
  { key: 'audit', to: '/audit', icon: History, group: 'Admin', label: L('Audit log', 'ऑडिट लॉग', 'ఆడిట్ లాగ్'), desc: 'Every change, by people and the AI' },
  { key: 'agents', to: '/agents', icon: Bot, group: 'Admin', label: L('Agents', 'एजेंट', 'ఏజెంట్లు'), desc: 'What each AI agent may do' },
  { key: 'integrations', to: '/integrations', icon: Plug, group: 'Admin', label: L('Connected apps', 'जुड़े ऐप', 'అనుసంధాన యాప్‌లు'), desc: 'Tally, WhatsApp, Gmail, GST' },
  { key: 'setup', to: '/setup', icon: Sparkles, group: 'Admin', label: L('Quick setup', 'आसान सेटअप', 'సులభ సెటప్'), desc: 'Guided company setup' },
];
// Factory demo edition: only the screens that solve the factory owner's problems (see src/factory).
const FX_MODULES: NavItem[] = [
  { key: 'home', to: '/', icon: Home, group: 'Home', label: L('Today', 'आज', 'ఈరోజు'), desc: 'What needs you today' },
  { key: 'renewals', to: '/renewals', icon: FileCheck2, group: 'Admin', fx: true, label: L('Licences & approvals', 'लाइसेंस', 'లైసెన్సులు'), desc: 'Licences, NOCs, certificates and expiry reminders' },
  { key: 'tenders', to: '/tenders', icon: FolderOpen, group: 'Admin', fx: true, label: L('Tenders & documents', 'टेंडर', 'టెండర్లు'), desc: 'Document library and tender packs' },
  { key: 'purchasing', to: '/purchasing', icon: ShoppingCart, group: 'Buy', fx: true, label: L('Purchasing', 'ख़रीद', 'కొనుగోళ్లు'), desc: 'Needs from all sites, consolidated' },
  { key: 'customers', to: '/customers', icon: PackageCheck, group: 'Sell', fx: true, label: L('Customer orders & QA', 'ग्राहक ऑर्डर', 'కస్టమర్ ఆర్డర్లు'), desc: 'Export orders, QA and customer updates' },
  { key: 'workforce', to: '/workforce', icon: Users, group: 'People', fx: true, label: L('Workforce', 'कर्मचारी', 'ఉద్యోగులు'), desc: 'Full-time and contract by site' },
  { key: 'agents', to: '/agents', icon: Bot, group: 'Admin', label: L('Agents', 'एजेंट', 'ఏజెంట్లు'), desc: 'What each AI agent may do' },
];
/** Factory edition: the same pillars as the main app; factory screens are pinned first in their pillar and flagged fx (shown with a 'For you' badge). */
export const MAIN_MORE: NavItem[] = [];
if (FACTORY) { const main = MODULES.filter((m) => m.key !== 'home'); const fxm = FX_MODULES.filter((m) => m.key !== 'agents'); MODULES.splice(0, MODULES.length, fxm[0], ...fxm.slice(1), ...main); }
else MODULES.sort((a, b) => (ORDER.indexOf(a.key) + 99) % 999 - (ORDER.indexOf(b.key) + 99) % 999);
export const moduleByKey = (k: string) => MODULES.find((m) => m.key === k);
export const moduleForPath = (p: string) => [...MODULES].filter((m) => m.to !== '/').sort((a, b) => b.to.length - a.to.length).find((m) => p.startsWith(m.to)) || (p === '/' ? MODULES[0] : undefined);
