/** Business OS subscription billing (SaaS provider → tenant) with TDS, Form 16A and Section 197 lower-deduction certificates.
 *  Shared by the tenant Billing page and the Platform admin TDS receivables view. Browser-only demo; payments are simulated. */
import { useSyncExternalStore } from 'react';
import { seedPlat, PLANS, type Tenant } from '../platform/data';

export const PROVIDER = { name: 'Business OS Technologies Pvt Ltd', gstin: '36AAKCB4821M1Z6', pan: 'AAKCB4821M', tan: '—', addr: 'Plot 12, Hitech City, Madhapur, Hyderabad, Telangana 500081', state: 'Telangana (36)', sac: '998314', sacDesc: 'IT design & development services – SaaS subscription (Business OS)', bank: 'HDFC Bank · A/c ••••4417 · IFSC HDFC0001234' };
export type Section = '194J-2' | '194J-10' | '197';
export type Rates = { '194J-2': number; '194J-10': number };
export type BInvoice = { id: string; tenant: string; month: string; period: string; date: string; due: string; plan: string; users: number; taxable: number; cgst: number; sgst: number; igst: number; total: number; status: 'Paid' | 'Due' | 'Overdue' | 'Part-paid'; paid: number };
export type BPayment = { id: string; tenant: string; invoice: string; date: string; method: 'UPI' | 'Card' | 'Netbanking' | 'UPI autopay'; gross: number; tds: number; net: number; tdsLines: { section: Section; base: number; rate: number; amt: number; cert?: string }[]; ref: string };
export type F16A = { id: string; tenant: string; quarter: string; tds: number; status: 'Pending' | 'Received' | 'Matched' | 'Mismatch'; file?: string; as26?: number; dueBy: string; note?: string };
export type Cert197 = { id: string; certNo: string; fy: string; rate: number; threshold: number; validFrom: string; validTo: string; tenants: string[]; issuedBy: string; status: 'Active' | 'Exhausted' | 'Expired'; openingUtilised: number };
export type BillingState = { invoices: BInvoice[]; payments: BPayment[]; f16a: F16A[]; certs: Cert197[]; rates: Rates; defaultSection: Record<string, Section | 'none'>; log: { at: string; tenant: string; text: string }[] };

const STATE: Record<string, string> = { Hyderabad: '36', Vijayawada: '37', Ahmedabad: '24', Surat: '24', Pune: '27', Indore: '23', Coimbatore: '33', Chennai: '33', Ludhiana: '03' };
export const custGstin = (t: Tenant) => (STATE[t.city] || '36') + t.gstin.slice(2);
export const STATE_NAME: Record<string, string> = { '36': 'Telangana', '37': 'Andhra Pradesh', '24': 'Gujarat', '27': 'Maharashtra', '23': 'Madhya Pradesh', '33': 'Tamil Nadu', '03': 'Punjab' };
export const isIndian = (t: Tenant) => t.region !== 'ME';
export const tenantsAll = () => seedPlat().tenants;
export const tenantName = (id: string) => tenantsAll().find((t) => t.id === id)?.name || id;
const MONTHS = [['Apr 2026', '2026-04'], ['May 2026', '2026-05'], ['Jun 2026', '2026-06'], ['Jul 2026', '2026-07'], ['Aug 2026', '2026-08'], ['Sep 2026', '2026-09'], ['Oct 2026', '2026-10']];
export const quarterOf = (ym: string) => { const m = +ym.slice(5, 7); return m >= 4 && m <= 6 ? 'Q1 FY26-27' : m <= 9 && m >= 7 ? 'Q2 FY26-27' : m >= 10 ? 'Q3 FY26-27' : 'Q4 FY26-27'; };
const Q_DUE: Record<string, string> = { 'Q1 FY26-27': '15 Aug 2026', 'Q2 FY26-27': '15 Nov 2026', 'Q3 FY26-27': '15 Feb 2027', 'Q4 FY26-27': '15 Jun 2027' };
const r2 = (n: number) => Math.round(n);

export const taxSplit = (taxable: number, gstin: string) => gstin.startsWith('36') ? { cgst: r2(taxable * 0.09), sgst: r2(taxable * 0.09), igst: 0 } : { cgst: 0, sgst: 0, igst: r2(taxable * 0.18) };

/** TDS on the taxable value (GST excluded, CBDT circular 23/2017). Section 197 rate applies until the certificate's remaining limit, then the normal rate. */
export function computeTds(st: BillingState, tenant: string, taxable: number, section: Section | 'none', fallback: '194J-2' | '194J-10' = '194J-2') {
  if (section === 'none') return { lines: [] as BPayment['tdsLines'], tds: 0, warn: '' };
  if (section !== '197') { const rate = st.rates[section]; return { lines: [{ section, base: taxable, rate, amt: r2(taxable * rate / 100) }], tds: r2(taxable * rate / 100), warn: '' }; }
  const c = certFor(st, tenant);
  if (!c) { const rate = st.rates[fallback]; return { lines: [{ section: fallback, base: taxable, rate, amt: r2(taxable * rate / 100) }], tds: r2(taxable * rate / 100), warn: 'No valid Section 197 certificate covers your company – normal 194J rate applied.' }; }
  const rem = certRemaining(st, c);
  const lowBase = Math.min(rem, taxable); const hiBase = taxable - lowBase; const nr = st.rates[fallback];
  const lines: BPayment['tdsLines'] = [];
  if (lowBase > 0) lines.push({ section: '197', base: lowBase, rate: c.rate, amt: r2(lowBase * c.rate / 100), cert: c.certNo });
  if (hiBase > 0) lines.push({ section: fallback, base: hiBase, rate: nr, amt: r2(hiBase * nr / 100) });
  const warn = hiBase > 0 ? (lowBase > 0 ? `Section 197 limit crosses on this payment: ₹${lowBase.toLocaleString('en-IN')} at ${c.rate}%, the remaining ₹${hiBase.toLocaleString('en-IN')} at the normal ${nr}% (194J).` : `Section 197 certificate ${c.certNo} limit is fully used – normal ${nr}% (194J) applies from now on.`) : rem - lowBase < c.threshold * 0.1 ? `Only ₹${(rem - lowBase).toLocaleString('en-IN')} of the Section 197 limit will remain after this payment.` : '';
  return { lines, tds: lines.reduce((a, l) => a + l.amt, 0), warn };
}
export const certFor = (st: BillingState, tenant: string) => st.certs.find((c) => c.tenants.includes(tenant) && c.status !== 'Expired');
export const certUtilised = (st: BillingState, c: Cert197) => c.openingUtilised + st.payments.flatMap((p) => p.tdsLines).filter((l) => l.cert === c.certNo).reduce((a, l) => a + l.base, 0);
export const certRemaining = (st: BillingState, c: Cert197) => Math.max(0, c.threshold - certUtilised(st, c));
export const certUseBy = (st: BillingState, c: Cert197) => c.tenants.map((t) => ({ tenant: t, used: st.payments.filter((p) => p.tenant === t).flatMap((p) => p.tdsLines).filter((l) => l.cert === c.certNo).reduce((a, l) => a + l.base, 0) }));

export function seedBilling(): BillingState {
  const ts = tenantsAll().filter((t) => isIndian(t) && t.status !== 'Trial');
  const rates: Rates = { '194J-2': 2, '194J-10': 10 };
  const defaultSection: Record<string, Section | 'none'> = { 't-aarohan': '197', 't-kaveri': '197', 't-deccan': '197', 't-narmada': '194J-2', 't-chola': '194J-2', 't-sahyadri': '194J-10', 't-vindhya': '194J-2', 't-shree': 'none', 't-punjab': 'none' };
  const certs: Cert197[] = [{ id: 'c1', certNo: '197/HYD/FY27/0004821', fy: 'FY 2026-27', rate: 0.5, threshold: 650000, validFrom: '01 Apr 2026', validTo: '31 Mar 2027', tenants: ['t-aarohan', 't-kaveri', 't-deccan'], issuedBy: 'ITO TDS Ward 2(1), Hyderabad (TRACES)', status: 'Active', openingUtilised: 0 }];
  const unpaid: Record<string, BInvoice['status']> = { 't-shree': 'Overdue', 't-sahyadri': 'Overdue', 't-vindhya': 'Overdue', 't-punjab': 'Due', 't-chola': 'Due', 't-aarohan': 'Due' };
  const st: BillingState = { invoices: [], payments: [], f16a: [], certs, rates, defaultSection, log: [] };
  let n = 120;
  ts.forEach((t) => {
    const base = PLANS.find((x) => x.name === t.plan)!.price;
    const g = custGstin(t);
    MONTHS.forEach(([m, ym], j) => {
      if (t.id === 't-tirupati') return;
      const tx = taxSplit(base, g); const total = base + tx.cgst + tx.sgst + tx.igst;
      const unpaidNow = (j === 6 && unpaid[t.id]) || (t.id === 't-vindhya' && j === 5 ? 'Overdue' : null);
      const inv: BInvoice = { id: `BOS/26-27/${String(n++).padStart(4, '0')}`, tenant: t.id, month: m, period: `01–${j === 1 || j === 3 || j === 6 ? 31 : 30} ${m.slice(0, 3)} 2026`, date: `01 ${m}`, due: `10 ${m}`, plan: t.plan, users: t.users, taxable: base, ...tx, total, status: unpaidNow || 'Paid', paid: unpaidNow ? 0 : total };
      st.invoices.push(inv);
      if (!unpaidNow) {
        const sec = defaultSection[t.id] || 'none';
        const c = computeTds(st, t.id, base, sec);
        st.payments.push({ id: `RCPT-${ym.replace('-', '')}-${t.id.slice(2, 5).toUpperCase()}`, tenant: t.id, invoice: inv.id, date: `0${3 + (j % 5)} ${m}`, method: t.plan === 'Starter' ? 'UPI autopay' : j % 2 ? 'Netbanking' : 'UPI', gross: total, tds: c.tds, net: total - c.tds, tdsLines: c.lines, ref: `pay_sim_${ym.replace('-', '')}${t.id.slice(2, 6)}` });
      }
    });
  });
  // Form 16A per quarter for every deductor
  const as26Off: Record<string, number> = { 't-chola': -600 };
  [...new Set(st.payments.filter((p) => p.tds > 0).map((p) => p.tenant))].forEach((tid) => ['Q1 FY26-27', 'Q2 FY26-27'].forEach((q) => {
    const tds = st.payments.filter((p) => p.tenant === tid && quarterOf(MONTHS.find(([m]) => p.date.endsWith(m))![1]) === q).reduce((a, p) => a + p.tds, 0);
    if (!tds) return;
    const q1 = q.startsWith('Q1');
    const status: F16A['status'] = q1 ? (as26Off[tid] ? 'Mismatch' : tid === 't-sahyadri' ? 'Pending' : 'Matched') : tid === 't-kaveri' || tid === 't-deccan' ? 'Received' : 'Pending';
    st.f16a.push({ id: `16A-${tid}-${q.slice(0, 2)}`, tenant: tid, quarter: q, tds, status, file: status === 'Pending' ? undefined : `Form16A_${q.slice(0, 2)}_${tid.slice(2)}.pdf`, as26: q1 && status !== 'Pending' ? tds + (as26Off[tid] || 0) : undefined, dueBy: Q_DUE[q], note: status === 'Mismatch' ? `26AS shows ₹${(tds + (as26Off[tid] || 0)).toLocaleString('en-IN')} – customer's 26Q short by ₹${Math.abs(as26Off[tid]).toLocaleString('en-IN')}` : tid === 't-sahyadri' && q1 ? 'Overdue since 15 Aug' : undefined });
  }));
  st.log.push({ at: '28 Oct 09:10', tenant: 't-kaveri', text: 'Form 16A Q2 uploaded by Kaveri Pumps' });
  return st;
}

const KEY = 'bos-billing-v1';
let state: BillingState = (() => { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) as BillingState; } catch { /* first visit */ } return seedBilling(); })();
const subs = new Set<() => void>();
export const getBilling = () => state;
export function updateBilling(fn: (d: BillingState) => void) { const d = structuredClone(state); fn(d); state = d; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* quota */ } subs.forEach((f) => f()); }
export const resetBilling = () => { state = seedBilling(); try { localStorage.removeItem(KEY); } catch { /* */ } subs.forEach((f) => f()); };
export const useBilling = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, getBilling);
export const nowStamp = () => new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const SECTION_LABEL = (st: BillingState, s: Section | 'none') => s === 'none' ? 'No TDS' : s === '197' ? 'Sec 197 certificate' : s === '194J-2' ? `194J technical · ${st.rates['194J-2']}%` : `194J professional · ${st.rates['194J-10']}%`;
