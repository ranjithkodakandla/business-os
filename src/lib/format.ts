export const inr = (n: number, opts: { decimals?: number } = {}) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: opts.decimals ?? 0, minimumFractionDigits: opts.decimals ?? 0 });

/** ₹24.8 lakh style */
export const lakh = (n: number, d = 1) => {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(d).replace(/\.0+$/, '')} lakh`;
  return inr(n);
};
/** compact ₹2.1L */
export const lakhShort = (n: number, d = 1) => (Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(d)}L` : inr(n));

export const TODAY = new Date('2026-10-28T09:30:00+05:30');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const d = (iso: string) => new Date(iso + 'T00:00:00+05:30');
export const fmtDate = (iso: string) => {
  const x = d(iso);
  return `${String(x.getDate()).padStart(2, '0')} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
};
export const fmtShort = (iso: string) => {
  const x = d(iso);
  return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`;
};
export const daysBetween = (a: string, b: string) => Math.round((d(b).getTime() - d(a).getTime()) / 86400000);
export const todayISO = '2026-10-28';
export const longToday = 'Wednesday, 28 October 2026';
export const addDays = (iso: string, n: number) => {
  const x = d(iso);
  x.setDate(x.getDate() + n);
  const p = (v: number) => String(v).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};
export const gstSplit = (taxable: number, interstate: boolean, rate = 18) => {
  const tax = Math.round((taxable * rate) / 100);
  return interstate ? { igst: tax, cgst: 0, sgst: 0, total: taxable + tax } : { igst: 0, cgst: tax / 2, sgst: tax / 2, total: taxable + tax };
};
