import { Routes, Route, Link } from 'react-router-dom';
import Layout from './components/Layout';
import NetStatus from './components/NetStatus';
import Home from './pages/Home';
import Approvals from './pages/Approvals';
import { SalesList, OpportunityDetail, CustomerDetail } from './pages/Sales';
import { OrdersList, OrderDetail } from './pages/Orders';
import { ProcurementList, PRDetail } from './pages/Procurement';
import { InventoryList, ItemDetail } from './pages/Inventory';
import Operations from './pages/Operations';
import JobWork from './pages/JobWork';
import { PeopleList, EmployeeDetail } from './pages/People';
import { FinanceHome, InvoiceDetail } from './pages/Finance';
import Reports from './pages/Reports';
import Agents from './pages/Agents';
import Integrations from './pages/Integrations';
import Setup from './pages/Setup';
import Suppliers from './pages/Suppliers';
import Sourcing from './pages/Sourcing';
import LiveSourcing from './pages/LiveSourcing';
import Collections from './pages/Collections';

export default function App() {
  return (
    <Layout>
      <NetStatus />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/sales" element={<SalesList />} />
        <Route path="/sales/opportunity/:id" element={<OpportunityDetail />} />
        <Route path="/sales/customer/:id" element={<CustomerDetail />} />
        <Route path="/orders" element={<OrdersList />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/procurement" element={<ProcurementList />} />
        <Route path="/procurement/:id" element={<PRDetail />} />
        <Route path="/inventory" element={<InventoryList />} />
        <Route path="/inventory/:id" element={<ItemDetail />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/job-work" element={<JobWork />} />
        <Route path="/people" element={<PeopleList />} />
        <Route path="/people/:id" element={<EmployeeDetail />} />
        <Route path="/finance" element={<FinanceHome />} />
        <Route path="/finance/:id" element={<InvoiceDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/sourcing" element={<Sourcing />} />
        <Route path="/sourcing/live" element={<LiveSourcing />} />
        <Route path="/sourcing/live/:id" element={<LiveSourcing />} />
        <Route path="/sourcing/:id" element={<Sourcing />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="*" element={<div className="p-10 text-center text-slate-500">Page not found. <Link to="/" className="text-brand-700 underline">Go to Home</Link></div>} />
      </Routes>
    </Layout>
  );
}
