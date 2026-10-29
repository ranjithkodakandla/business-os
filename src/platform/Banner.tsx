import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
/** Shown in the customer app when the platform owner is viewing a tenant. */
export function TenantBanner() {
  const { s, update } = useStore(); const nav = useNavigate();
  if (!s.vendor) return null;
  const t = s.plat.tenants.find((x) => x.id === s.tenant);
  return (<div data-testid="tenant-banner" className="mb-3 flex items-center justify-between rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-4 py-2 text-[13px] text-indigo-800">
    <span>Platform owner viewing <b>{t?.name}</b> as Owner{s.tenant !== 't-aarohan' && ' · demo data is Aarohan’s; only modules & flags are this company’s'}</span>
    <button className="font-semibold underline" onClick={() => { update((d) => { d.tenant = 't-aarohan'; }); nav('/platform'); }}>Back to platform admin</button></div>);
}
