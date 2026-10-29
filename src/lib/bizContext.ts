import type { DemoState } from './store';
import { kpis, cash, outstanding, overdueDays } from './domain';
import * as D from './data';
/** Compact demo-data snapshot the AI may quote from (both chat boxes). */
export function bizContext(s: DemoState): string {
  const c = cash(s);
  return JSON.stringify({
    company: 'Aarohan Industries, Jeedimetla, Hyderabad (pump housings, fabrication)', owner: 'Riya Reddy (Owner); you are chatting with Ranjith',
    kpis: kpis(s), cash: c,
    suppliers: D.suppliers.map((x) => `${x.name} (${x.city}; ${x.category}; rating ${x.rating}; on-time ${x.onTime}%)`),
    openOrders: s.orders.filter((o) => o.open).slice(0, 8).map((o) => `${o.id} ${o.project.slice(0, 40)} – ${o.status}, promised ${o.promised}${o.risk ? `, ${o.risk}` : ''}`),
    lowStock: s.skus.filter((k) => k.onHand - k.reserved <= k.reorder).slice(0, 6).map((k) => `${k.name}: ${k.onHand} ${k.unit} on hand, ${k.reserved} reserved`),
    overdueInvoices: s.invoices.filter((i) => outstanding(i) > 0 && overdueDays(i) > 0).map((i) => `${i.id} ₹${outstanding(i)} ${overdueDays(i)} days overdue`),
    pendingPRs: s.prs.filter((p) => p.status !== 'Approved').map((p) => `${p.id} ${p.material} ×${p.qty} (${p.status})`),
  });
}
