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
  Cog, ShieldCheck, Landmark, Receipt, PackageCheck, Bell, FolderOpen,
} from 'lucide-react';
import type { Lang } from './i18n';
export type Group = 'Overview' | 'Sell' | 'Make' | 'Buy' | 'Stock' | 'People' | 'Money' | 'Service' | 'Admin';
export const GROUPS: Group[] = ['Overview', 'Sell', 'Service', 'Make', 'Buy', 'Stock', 'People', 'Money', 'Admin'];
export const GROUP_LABEL: Record<Group, Record<Lang, string>> = {
  Overview: { en: 'Overview', hi: 'सारांश', te: 'అవలోకనం' }, Sell: { en: 'Sell', hi: 'बिक्री', te: 'అమ్మకం' }, Make: { en: 'Make', hi: 'उत्पादन', te: 'తయారీ' },
  Buy: { en: 'Buy', hi: 'ख़रीद', te: 'కొనుగోలు' }, Stock: { en: 'Stock', hi: 'स्टॉक', te: 'స్టాక్' }, People: { en: 'People', hi: 'कर्मचारी', te: 'ఉద్యోగులు' },
  Money: { en: 'Money', hi: 'पैसा', te: 'డబ్బు' }, Service: { en: 'Service', hi: 'सेवा', te: 'సేవ' }, Admin: { en: 'Admin', hi: 'एडमिन', te: 'అడ్మిన్' },
};
export type NavItem = { key: string; to: string; icon: LucideIcon; group: Group; label: Record<Lang, string>; desc: string; sub?: [string, string][] };
const L = (en: string, hi: string, te: string) => ({ en, hi, te });
export const MODULES: NavItem[] = [
  { key: 'home', to: '/', icon: Home, group: 'Overview', label: L('Home', 'होम', 'హోమ్'), desc: 'Ask anything, see what needs you' },
  { key: 'approvals', to: '/approvals', icon: Inbox, group: 'Overview', label: L('Approvals', 'मंज़ूरियाँ', 'ఆమోదాలు'), desc: 'Everything waiting for a decision' },
  { key: 'sales', to: '/sales', icon: Handshake, group: 'Sell', label: L('Sales & CRM', 'बिक्री और CRM', 'అమ్మకాలు & CRM'), desc: 'Leads, quotes and customers' },
  { key: 'orders', to: '/orders', icon: ClipboardList, group: 'Sell', label: L('Orders', 'ऑर्डर', 'ఆర్డర్లు'), desc: 'Customer orders and delivery promises' },
  { key: 'inbox', to: '/inbox', icon: MessagesSquare, group: 'Service', label: L('Customer inbox', 'ग्राहक इनबॉक्स', 'కస్టమర్ ఇన్‌బాక్స్'), desc: 'WhatsApp, email, calls → tickets & complaints' },
  { key: 'operations', to: '/operations', icon: Factory, group: 'Make', label: L('Operations', 'उत्पादन', 'ఉత్పత్తి'), desc: 'Work orders and dispatch plan', sub: [] },
  { key: 'jobwork', to: '/job-work', icon: Truck, group: 'Make', label: L('Job Work', 'जॉब वर्क', 'జాబ్ వర్క్'), desc: 'Material out to job workers' },
  { key: 'procurement', to: '/procurement', icon: ShoppingCart, group: 'Buy', label: L('Procurement', 'ख़रीद', 'కొనుగోళ్లు'), desc: 'Purchase requests and orders' },
  { key: 'suppliers', to: '/suppliers', icon: Contact, group: 'Buy', label: L('Supplier contacts', 'सप्लायर संपर्क', 'సరఫరాదారుల సంప్రదింపులు'), desc: 'Supplier contacts and sourcing', sub: [['Live sourcing', '/sourcing/live']] },
  { key: 'inventory', to: '/inventory', icon: Boxes, group: 'Stock', label: L('Inventory', 'स्टॉक', 'స్టాక్'), desc: 'Stock, reorder and slow movers' },
  { key: 'people', to: '/people', icon: Users, group: 'People', label: L('People & HR', 'कर्मचारी', 'ఉద్యోగులు'), desc: 'Employees and contractors' },
  { key: 'attendance', to: '/attendance', icon: CalendarClock, group: 'People', label: L('Attendance & leave', 'हाज़िरी और छुट्टी', 'హాజరు & సెలవు'), desc: 'Muster roll, shifts, leave, OT, contractors' },
  { key: 'payroll', to: '/payroll', icon: Coins, group: 'People', label: L('Payroll', 'वेतन', 'జీతాలు'), desc: 'Pay runs, payslips, PF/ESI, advances' },
  { key: 'finance', to: '/finance', icon: IndianRupee, group: 'Money', label: L('Finance', 'वित्त', 'ఆర్థికం'), desc: 'Invoices, bills and cash' },
  { key: 'collections', to: '/collections', icon: Wallet, group: 'Money', label: L('Collections', 'वसूली', 'వసూళ్లు'), desc: 'Overdue receivables and follow-ups' },
  { key: 'gst', to: '/gst', icon: FileCheck2, group: 'Money', label: L('GST & e-invoice', 'GST और ई-इनवॉइस', 'GST & ఈ-ఇన్వాయిస్'), desc: 'IRN, e-way bills, GSTR-1/3B' },
  { key: 'reports', to: '/reports', icon: BarChart3, group: 'Money', label: L('Reports', 'रिपोर्ट', 'నివేదికలు'), desc: 'Sales, margin and cash reports' },
  // P1/P2 modules (pages in src/pages/P1Modules.tsx)
  { key: 'bom', to: '/production', icon: Cog, group: 'Make', label: L('BOM & Production', 'BOM और उत्पादन', 'BOM & ఉత్పత్తి'), desc: 'BOMs, MRP shortfall, work orders, cost vs plan' },
  { key: 'qc', to: '/quality', icon: ShieldCheck, group: 'Make', label: L('Quality control', 'गुणवत्ता', 'నాణ్యత'), desc: 'Inspections, NCR/CAPA, supplier scores' },
  { key: 'dispatch', to: '/dispatch', icon: PackageCheck, group: 'Stock', label: L('Dispatch', 'डिस्पैच', 'డిస్పాచ్'), desc: 'Dispatch plan, packing, LR, POD' },
  { key: 'bank', to: '/bank-tds', icon: Landmark, group: 'Money', label: L('Bank & TDS', 'बैंक और TDS', 'బ్యాంక్ & TDS'), desc: 'Bank reconciliation, TDS register, 26Q' },
  { key: 'expenses', to: '/expenses', icon: Receipt, group: 'Money', label: L('Expenses', 'ख़र्चे', 'ఖర్చులు'), desc: 'Claims with receipts, approvals, payout' },
  { key: 'notifications', to: '/notifications', icon: Bell, group: 'Overview', label: L('Notifications', 'सूचनाएँ', 'నోటిఫికేషన్లు'), desc: 'Alerts, compliance calendar, daily brief' },
  { key: 'documents', to: '/documents', icon: FolderOpen, group: 'Admin', label: L('Documents', 'दस्तावेज़', 'పత్రాలు'), desc: 'Certificates, drawings, contracts, PODs' },
  { key: 'settings', to: '/settings', icon: Settings, group: 'Admin', label: L('Settings & access', 'सेटिंग्स', 'సెట్టింగ్‌లు'), desc: 'Company, users, roles, approvals, series' },
  { key: 'audit', to: '/audit', icon: History, group: 'Admin', label: L('Audit log', 'ऑडिट लॉग', 'ఆడిట్ లాగ్'), desc: 'Every change, by people and the AI' },
  { key: 'agents', to: '/agents', icon: Bot, group: 'Admin', label: L('Agents', 'एजेंट', 'ఏజెంట్లు'), desc: 'What each AI agent may do' },
  { key: 'integrations', to: '/integrations', icon: Plug, group: 'Admin', label: L('Connected apps', 'जुड़े ऐप', 'అనుసంధాన యాప్‌లు'), desc: 'Tally, WhatsApp, Gmail, GST' },
  { key: 'setup', to: '/setup', icon: Sparkles, group: 'Admin', label: L('Quick setup', 'आसान सेटअप', 'సులభ సెటప్'), desc: 'Guided company setup' },
];
export const moduleByKey = (k: string) => MODULES.find((m) => m.key === k);
export const moduleForPath = (p: string) => [...MODULES].filter((m) => m.to !== '/').sort((a, b) => b.to.length - a.to.length).find((m) => p.startsWith(m.to)) || (p === '/' ? MODULES[0] : undefined);
