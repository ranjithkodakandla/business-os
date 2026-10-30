/** Route registry: module key -> page. Nav metadata lives in src/lib/nav.ts; access in src/lib/rbac.ts. */
import React from 'react';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { can, roleOf } from '../lib/rbac';
import { moduleByKey } from '../lib/nav';
import Home from '../pages/Home';
import Approvals from '../pages/Approvals';
import { SalesList, OpportunityDetail, CustomerDetail } from '../pages/Sales';
import { OrdersList, OrderDetail } from '../pages/Orders';
import { ProcurementList, PRDetail } from '../pages/Procurement';
import { InventoryList, ItemDetail } from '../pages/Inventory';
import Operations from '../pages/Operations';
import JobWork from '../pages/JobWork';
import { PeopleList, EmployeeDetail } from '../pages/People';
import { FinanceHome, InvoiceDetail } from '../pages/Finance';
import Reports from '../pages/Reports';
import Agents from '../pages/Agents';
import Integrations from '../pages/Integrations';
import Setup from '../pages/Setup';
import Suppliers from '../pages/Suppliers';
import Sourcing from '../pages/Sourcing';
import LiveSourcing from '../pages/LiveSourcing';
import Collections from '../pages/Collections';
import BillingPage from '../billing/BillingPage';
import WorkspaceAdmin from '../pages/WorkspaceAdmin';
import { Production, Quality, BankTds, Expenses, DispatchPage, Notifications, Documents } from '../pages/P1Modules';
import { SettingsPage, PayrollPage, InboxPage, GstPage, AttendancePage, AuditPage } from '../pages/p0';

/** [path, module key (for RBAC), element]. Add new module pages here. */
export const ROUTES: [string, string, React.ReactNode][] = [
  ['/', 'home', <Home />], ['/approvals', 'approvals', <Approvals />],
  ['/sales', 'sales', <SalesList />], ['/sales/opportunity/:id', 'sales', <OpportunityDetail />], ['/sales/customer/:id', 'sales', <CustomerDetail />],
  ['/orders', 'orders', <OrdersList />], ['/orders/:id', 'orders', <OrderDetail />],
  ['/procurement', 'procurement', <ProcurementList />], ['/procurement/:id', 'procurement', <PRDetail />],
  ['/inventory', 'inventory', <InventoryList />], ['/inventory/:id', 'inventory', <ItemDetail />],
  ['/operations', 'operations', <Operations />], ['/job-work', 'jobwork', <JobWork />],
  ['/people', 'people', <PeopleList />], ['/people/:id', 'people', <EmployeeDetail />],
  ['/finance', 'finance', <FinanceHome />], ['/finance/:id', 'finance', <InvoiceDetail />],
  ['/reports', 'reports', <Reports />], ['/agents', 'agents', <Agents />], ['/integrations', 'integrations', <Integrations />], ['/setup', 'setup', <Setup />],
  ['/suppliers', 'suppliers', <Suppliers />], ['/sourcing', 'suppliers', <Sourcing />], ['/sourcing/live', 'suppliers', <LiveSourcing />], ['/sourcing/live/:id', 'suppliers', <LiveSourcing />], ['/sourcing/:id', 'suppliers', <Sourcing />],
  ['/collections', 'collections', <Collections />], ['/billing', 'billing', <BillingPage />], ['/workspace-admin', 'workspace', <WorkspaceAdmin />],
  ['/settings', 'settings', <SettingsPage />], ['/payroll', 'payroll', <PayrollPage />], ['/inbox', 'inbox', <InboxPage />], ['/gst', 'gst', <GstPage />],
  ['/attendance', 'attendance', <AttendancePage />], ['/audit', 'audit', <AuditPage />],
  ['/production', 'bom', <Production />], ['/quality', 'qc', <Quality />], ['/bank-tds', 'bank', <BankTds />], ['/expenses', 'expenses', <Expenses />],
  ['/dispatch', 'dispatch', <DispatchPage />], ['/notifications', 'notifications', <Notifications />], ['/documents', 'documents', <Documents />],
];

export function Restricted({ k }: { k: string }) {
  const { s } = useStore();
  const m = moduleByKey(k);
  return (
    <div data-testid="restricted" className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600"><Lock size={22} /></div>
      <h2 className="mt-4 text-[17px] font-semibold text-slate-900">Not in your access</h2>
      <p className="mt-1.5 text-[13px] text-slate-500">{m?.label.en || k} isn’t part of the <b>{roleOf(s)}</b> role. Ask an admin (Owner) to grant access in Settings → Permissions.</p>
      <Link to="/" className="mt-4 inline-block text-[13px] font-medium text-brand-700 underline">Back to Home</Link>
    </div>
  );
}
export function Guard({ k, children }: { k: string; children: React.ReactNode }) {
  const { s } = useStore();
  return can(s, k) ? <>{children}</> : <Restricted k={k} />;
}
