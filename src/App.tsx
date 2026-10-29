import { Routes, Route, Link, useLocation } from 'react-router-dom';
import PlatformApp from './platform/Platform';
import { TenantBanner } from './platform/Banner';
import Layout from './components/Layout';
import NetStatus from './components/NetStatus';
import { ROUTES, Guard } from './modules/registry';

export default function App() {
  const loc = useLocation();
  if (loc.pathname.startsWith('/platform')) return <PlatformApp />;
  return (
    <Layout>
      <NetStatus />
      <TenantBanner />
      <Routes>
        {ROUTES.map(([path, key, el]) => <Route key={path} path={path} element={<Guard k={key}>{el}</Guard>} />)}
        <Route path="*" element={<div className="p-10 text-center text-slate-500">Page not found. <Link to="/" className="text-brand-700 underline">Go to Home</Link></div>} />
      </Routes>
    </Layout>
  );
}
