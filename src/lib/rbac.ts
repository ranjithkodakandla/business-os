/** Role-based access. Every module has a scope; the permissions matrix (editable in Settings) drives nav, Home, search and the AI. */
export type Role = 'Owner' | 'Sales' | 'Stores' | 'Accounts' | 'HR' | 'Supervisor';
export const ROLES: Role[] = ['Owner', 'Sales', 'Stores', 'Accounts', 'HR', 'Supervisor'];
export type Perm = 'view' | 'create' | 'edit' | 'approve' | 'delete';
export const PERMS: Perm[] = ['view', 'create', 'edit', 'approve', 'delete'];
export const ROLE_USER: Record<Role, { name: string; unit: string }> = {
  Owner: { name: 'Riya Reddy', unit: 'All units' }, Sales: { name: 'Karthik Varma', unit: 'Jeedimetla Plant' }, Stores: { name: 'Harish Chandra', unit: 'Jeedimetla Plant' },
  Accounts: { name: 'Padma Priya', unit: 'All units' }, HR: { name: 'Sunitha Rao', unit: 'All units' }, Supervisor: { name: 'Ramesh Yadav', unit: 'Jeedimetla Plant' },
};
/** Scope = which module keys a role can see by default (Owner sees all). Unknown/new modules default to Owner only unless listed. */
const SCOPE: Record<Exclude<Role, 'Owner'>, string[]> = {
  Sales: ['home', 'approvals', 'sales', 'orders', 'inbox', 'gst', 'dispatch', 'documents', 'notifications', 'reports'],
  Stores: ['home', 'approvals', 'procurement', 'suppliers', 'inventory', 'jobwork', 'qc', 'dispatch', 'bom', 'documents', 'notifications', 'sourcing'],
  Accounts: ['home', 'approvals', 'finance', 'collections', 'gst', 'payroll', 'bank', 'expenses', 'audit', 'reports', 'documents', 'notifications'],
  HR: ['home', 'approvals', 'people', 'attendance', 'payroll', 'expenses', 'documents', 'notifications'],
  Supervisor: ['home', 'approvals', 'operations', 'jobwork', 'attendance', 'bom', 'qc', 'dispatch', 'inventory', 'documents', 'notifications'],
};
export type Matrix = Record<string, Record<string, Perm[]>>; // role -> module -> perms
export const defaultPerms = (role: Role, key: string): Perm[] => {
  if (role === 'Owner') return [...PERMS];
  if (!SCOPE[role].includes(key)) return [];
  if (key === 'home' || key === 'notifications') return ['view'];
  const own: Record<string, string[]> = { Sales: ['sales', 'orders', 'inbox'], Stores: ['inventory', 'procurement', 'qc', 'dispatch'], Accounts: ['finance', 'gst', 'bank', 'payroll', 'expenses', 'collections'], HR: ['people', 'attendance', 'payroll'], Supervisor: ['operations', 'attendance', 'bom', 'qc'] };
  return own[role].includes(key) ? ['view', 'create', 'edit', ...(role === 'Accounts' || role === 'HR' ? ['approve' as Perm] : [])] : ['view'];
};
type S = { role?: Role; perms?: Matrix };
export const roleOf = (s: S): Role => s.role || 'Owner';
export const permsFor = (s: S, key: string, role = roleOf(s)): Perm[] => s.perms?.[role]?.[key] ?? defaultPerms(role, key);
export const can = (s: S, key: string, p: Perm = 'view', role = roleOf(s)) => permsFor(s, key, role).includes(p);
/** Map an AI domain / keyword area to the module that owns it. */
export const DOMAIN_MODULE: Record<string, string> = { sales: 'sales', customers: 'sales', orders: 'orders', inventory: 'inventory', stock: 'inventory', procurement: 'procurement', suppliers: 'suppliers', operations: 'operations', production: 'operations', jobwork: 'jobwork', people: 'people', hr: 'people', attendance: 'attendance', finance: 'finance', cash: 'finance', collections: 'collections', payroll: 'payroll', gst: 'gst', inbox: 'inbox', audit: 'audit', settings: 'settings' };
