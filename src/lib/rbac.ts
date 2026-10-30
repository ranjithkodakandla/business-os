import { stageAllows, type Rollout } from '../platform/rollout';
/** Role-based access. Every module has a scope; the permissions matrix (editable in Settings) drives nav, Home, search and the AI. */
export type Role = 'Owner' | 'Sales' | 'Stores' | 'Accounts' | 'HR' | 'Supervisor' | 'Billing';
export const ROLES: Role[] = ['Owner', 'Sales', 'Stores', 'Accounts', 'HR', 'Supervisor', 'Billing'];
export type Perm = 'view' | 'create' | 'edit' | 'approve' | 'delete';
export const PERMS: Perm[] = ['view', 'create', 'edit', 'approve', 'delete'];
export const ROLE_USER: Record<Role, { name: string; unit: string }> = {
  Owner: { name: 'Riya Reddy', unit: 'All units' }, Sales: { name: 'Karthik Varma', unit: 'Jeedimetla Plant' }, Stores: { name: 'Harish Chandra', unit: 'Jeedimetla Plant' },
  Accounts: { name: 'Padma Priya', unit: 'All units' }, HR: { name: 'Sunitha Rao', unit: 'All units' }, Supervisor: { name: 'Ramesh Yadav', unit: 'Jeedimetla Plant' }, Billing: { name: 'Anil Gupta', unit: 'All units' },
};
/** Scope = which module keys a role can see by default (Owner sees all). Unknown/new modules default to Owner only unless listed. */
const SCOPE: Record<Exclude<Role, 'Owner'>, string[]> = {
  Sales: ['home', 'alerts', 'match', 'approvals', 'sales', 'orders', 'inbox', 'gst', 'dispatch', 'documents', 'notifications', 'reports'],
  Stores: ['home', 'alerts', 'match', 'approvals', 'procurement', 'suppliers', 'inventory', 'jobwork', 'qc', 'dispatch', 'bom', 'documents', 'notifications', 'sourcing'],
  Accounts: ['home', 'alerts', 'match', 'approvals', 'finance', 'collections', 'gst', 'payroll', 'bank', 'expenses', 'audit', 'reports', 'documents', 'notifications'],
  HR: ['home', 'alerts', 'approvals', 'people', 'attendance', 'payroll', 'expenses', 'documents', 'notifications'],
  Billing: ['home', 'alerts', 'billing', 'notifications', 'documents'],
  Supervisor: ['home', 'alerts', 'approvals', 'operations', 'jobwork', 'attendance', 'bom', 'qc', 'dispatch', 'inventory', 'documents', 'notifications'],
};
export type Matrix = Record<string, Record<string, Perm[]>>; // role -> module -> perms
export const defaultPerms = (role: Role, key: string): Perm[] => {
  if (role === 'Owner') return [...PERMS];
  if (!SCOPE[role].includes(key)) return [];
  if (key === 'home' || key === 'notifications') return ['view'];
  if (key === 'alerts') return ['view', 'edit'];
  const own: Record<string, string[]> = { Sales: ['sales', 'orders', 'inbox'], Stores: ['match', 'inventory', 'procurement', 'qc', 'dispatch'], Accounts: ['match', 'finance', 'gst', 'bank', 'payroll', 'expenses', 'collections'], HR: ['people', 'attendance', 'payroll'], Supervisor: ['operations', 'attendance', 'bom', 'qc'], Billing: ['billing'] };
  return own[role].includes(key) ? ['view', 'create', 'edit', ...(role === 'Accounts' || role === 'HR' ? ['approve' as Perm] : [])] : ['view'];
};
type S = { role?: Role; perms?: Matrix; tenant?: string; plat?: { flags: Record<string, Record<string, boolean>>; rollout?: Record<string, Rollout> } };
/** Platform feature flags for the tenant being viewed switch modules off for every role. */
export const flagOn = (s: S, key: string) => { const t = s.tenant || 't-aarohan'; return s.plat?.flags?.[t]?.[key] !== false && stageAllows(s.plat?.rollout?.[key], key, t); };
export const roleOf = (s: S): Role => s.role || 'Owner';
export const permsFor = (s: S, key: string, role = roleOf(s)): Perm[] => s.perms?.[role]?.[key] ?? defaultPerms(role, key);
export const can = (s: S, key: string, p: Perm = 'view', role = roleOf(s)) => flagOn(s, key) && permsFor(s, key, role).includes(p);
/** Map an AI domain / keyword area to the module that owns it. */
export const DOMAIN_MODULE: Record<string, string> = { business: 'reports', compliance: 'gst', sourcing: 'suppliers', approvals: 'approvals', compare: 'reports', payables: 'finance', receivables: 'finance', purchases: 'procurement', dispatch: 'operations', pipeline: 'sales', quality: 'operations', customer: 'sales', item: 'inventory', sales: 'sales', customers: 'sales', orders: 'orders', inventory: 'inventory', stock: 'inventory', procurement: 'procurement', suppliers: 'suppliers', operations: 'operations', production: 'operations', jobwork: 'jobwork', people: 'people', hr: 'people', attendance: 'attendance', finance: 'finance', cash: 'finance', collections: 'collections', payroll: 'payroll', gst: 'gst', inbox: 'inbox', audit: 'audit', settings: 'settings', billing: 'billing', subscription: 'billing' };
