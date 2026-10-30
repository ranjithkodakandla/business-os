/** Alert catalogue (28 types), per-user preferences and three-way match seed. Simulated – no real sends. */
import { useSyncExternalStore } from 'react';
export type Chan = 'inapp' | 'wa' | 'email';
export type Freq = 'Instant' | 'Hourly digest' | 'Daily digest' | 'Weekly';
export type Scope = 'Own' | 'Team' | 'All';
export type AlertDef = { id: string; group: string; name: string; desc: string; module: string; def: { ch: Chan[]; freq: Freq; scope: Scope } };
const A = (id: string, group: string, name: string, desc: string, module: string, ch: Chan[] = ['inapp'], freq: Freq = 'Instant', scope: Scope = 'Own'): AlertDef => ({ id, group, name, desc, module, def: { ch, freq, scope } });
export const ALERTS: AlertDef[] = [
  A('stock-low', 'Stock', 'Low stock', 'Item falls below reorder level', 'inventory', ['inapp', 'wa']),
  A('stock-excess', 'Stock', 'Excess stock', 'Item above max level or 90+ days cover', 'inventory', ['inapp'], 'Weekly'),
  A('stock-slow', 'Stock', 'Slow / non-moving stock', 'No movement in 60 days', 'inventory', ['inapp'], 'Weekly'),
  A('batch-expiry', 'Stock', 'Batch / lot expiry', 'Batch expires within 30 days', 'inventory', ['inapp', 'email'], 'Daily digest'),
  A('barcode-expiry', 'Stock', 'Barcode / label expiry', 'Printed label or certificate expiring', 'inventory', ['inapp'], 'Daily digest'),
  A('so-overdue', 'Sales', 'Overdue sales order', 'Promised date passed, not dispatched', 'orders', ['inapp', 'wa']),
  A('so-at-risk', 'Sales', 'Sales order at risk', 'Material or capacity short for promise date', 'orders', ['inapp']),
  A('quote-expiry', 'Sales', 'Quotation expiring', 'Quote validity ends in 3 days', 'sales', ['inapp'], 'Daily digest'),
  A('next-action', 'Sales', 'Next action date', 'Follow-up due on a lead or deal', 'sales', ['inapp', 'wa'], 'Daily digest'),
  A('oc-mismatch', 'Sales', 'SO vs OC vs invoice mismatch', 'Price or qty differs between order, acknowledgement and invoice', 'orders', ['inapp', 'email']),
  A('po-overdue', 'Purchase', 'Overdue purchase order', 'Supplier delivery date passed', 'procurement', ['inapp', 'wa']),
  A('po-mismatch', 'Purchase', 'PO vs GRN vs bill mismatch', 'Three-way match failed on price or qty', 'procurement', ['inapp', 'email']),
  A('grn-pending', 'Purchase', 'GRN pending QC', 'Goods received but not inspected in 24h', 'qc', ['inapp']),
  A('rfq-reply', 'Purchase', 'Supplier quote received', 'Reply captured by sourcing agent', 'suppliers', ['inapp']),
  A('recv-overdue', 'Money', 'Receivable overdue', 'Customer invoice past due date', 'collections', ['inapp', 'wa'], 'Daily digest', 'Team'),
  A('pay-due', 'Money', 'Payable due', 'Supplier bill due in 3 days', 'finance', ['inapp', 'email'], 'Daily digest', 'Team'),
  A('credit-limit', 'Money', 'Credit limit crossed', 'Customer exposure above limit', 'finance', ['inapp', 'wa']),
  A('bank-unrec', 'Money', 'Unreconciled bank lines', 'Bank entries older than 7 days', 'bank', ['inapp'], 'Weekly'),
  A('cash-low', 'Money', 'Cash below buffer', '30-day forecast below minimum balance', 'finance', ['inapp', 'wa', 'email'], 'Daily digest', 'All'),
  A('approval-pending', 'Approvals', 'Pending approvals', 'Items waiting for your decision', 'approvals', ['inapp', 'wa']),
  A('approval-sla', 'Approvals', 'Approval SLA breached', 'Waiting more than 24h', 'approvals', ['inapp', 'email'], 'Hourly digest', 'Team'),
  A('task-due', 'Tasks', 'Due tasks', 'Task assigned to you is due today', 'home', ['inapp'], 'Daily digest'),
  A('wo-delay', 'Tasks', 'Work order delayed', 'Production behind plan', 'operations', ['inapp'], 'Instant', 'Team'),
  A('gst-due', 'Compliance', 'GST deadlines', 'GSTR-1, 3B and e-invoice cut-offs', 'gst', ['inapp', 'wa', 'email'], 'Daily digest', 'All'),
  A('tds-due', 'Compliance', 'TDS / PF / ESI due', 'Statutory payment due dates', 'payroll', ['inapp', 'email'], 'Daily digest', 'All'),
  A('renewal', 'Compliance', 'Renewals', 'Licences, insurance, AMC, certificates, subscriptions', 'documents', ['inapp', 'email'], 'Weekly', 'All'),
  A('leave-req', 'People', 'Leave request', 'Team member applied for leave', 'attendance', ['inapp', 'wa']),
  A('attendance-exc', 'People', 'Attendance exception', 'Missed punch, late, absent without leave', 'attendance', ['inapp'], 'Daily digest', 'Team'),
];
export type Pref = { on: boolean; ch: Chan[]; freq: Freq; scope: Scope };
export type MatchRow = { id: string; kind: 'P2P' | 'O2C'; party: string; docs: [string, string, string]; item: string; qty: [number, number, number]; rate: [number, number, number]; status: 'Matched' | 'Mismatch' | 'Resolved'; reason?: string; fix?: string; resolution?: string };
export const MATCH_SEED: MatchRow[] = [
  { id: 'M-101', kind: 'P2P', party: 'Sri Lakshmi Steels', docs: ['PO-0912', 'GRN-4410', 'PINV-7781'], item: 'MS sheet 2mm', qty: [500, 480, 500], rate: [68.5, 68.5, 68.5], status: 'Mismatch', reason: 'Supplier billed 500 kg but stores received 480 kg (GRN-4410). The 20 kg short is noted on the gate entry as "2 sheets damaged in transit".', fix: 'Hold ₹1,370 + GST and raise a debit note for 20 kg' },
  { id: 'M-102', kind: 'P2P', party: 'Deccan Fasteners', docs: ['PO-0918', 'GRN-4417', 'PINV-0932'], item: 'M8 bolts', qty: [2000, 2000, 2000], rate: [3.2, 3.2, 3.45], status: 'Mismatch', reason: 'Bill rate ₹3.45 is 7.8% above PO rate ₹3.20. No revised PO or approved price change on file; supplier email of 14 Oct mentions a zinc surcharge.', fix: 'Pay at PO rate and ask supplier for credit note of ₹500' },
  { id: 'M-103', kind: 'P2P', party: 'Hyd Paints', docs: ['PO-0920', 'GRN-4421', 'PINV-118'], item: 'Primer 20L', qty: [12, 12, 12], rate: [3150, 3150, 3150], status: 'Matched' },
  { id: 'M-104', kind: 'P2P', party: 'Kaveri Castings', docs: ['PO-0923', 'GRN-4425', 'PINV-2209'], item: 'Housing casting', qty: [300, 310, 310], rate: [412, 412, 412], status: 'Mismatch', reason: 'Received and billed 310 against PO 300 (3.3% over). Within the 5% tolerance on the PO, but over-receipt needs approval.', fix: 'Accept over-receipt within tolerance and amend PO to 310' },
  { id: 'M-201', kind: 'O2C', party: 'Tata AutoComp (Pune)', docs: ['SO-2291', 'OC-2291', 'INV-26-0412'], item: 'Bracket assy', qty: [1200, 1200, 1200], rate: [184, 179, 184], status: 'Mismatch', reason: 'Our order confirmation went out at ₹179 (old price list), but the SO and invoice use ₹184. Customer will short-pay ₹6,000.', fix: 'Issue revised OC at ₹184 or credit note of ₹6,000' },
  { id: 'M-202', kind: 'O2C', party: 'Bharat Pumps', docs: ['SO-2295', 'OC-2295', 'INV-26-0418'], item: 'Impeller', qty: [400, 400, 380], rate: [920, 920, 920], status: 'Mismatch', reason: 'Invoiced 380 vs 400 ordered – partial dispatch DC-881; balance 20 not yet back-ordered.', fix: 'Create back-order for 20 and notify customer' },
  { id: 'M-203', kind: 'O2C', party: 'Sahyadri Agro', docs: ['SO-2297', 'OC-2297', 'INV-26-0421'], item: 'Frame kit', qty: [60, 60, 60], rate: [5400, 5400, 5400], status: 'Matched' },
];
type St = { prefs: Record<string, Record<string, Pref>>; match: MatchRow[] };
const KEY = 'bos-alerts-v1'; const subs = new Set<() => void>();
const seed = (): St => ({ prefs: {}, match: MATCH_SEED.map((m) => ({ ...m })) });
let cur: St = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '') as St; } catch { return seed(); } })();
export const getAlerts = () => cur;
export const updateAlerts = (f: (s: St) => St) => { cur = f(cur); localStorage.setItem(KEY, JSON.stringify(cur)); subs.forEach((x) => x()); };
export const resetAlerts = () => updateAlerts(() => seed());
export const useAlerts = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, getAlerts);
export const prefOf = (s: St, role: string, a: AlertDef): Pref => s.prefs[role]?.[a.id] ?? { on: true, ...a.def, ch: [...a.def.ch] };
