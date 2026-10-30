import { seedPlat } from '../platform/data';
import { setP1AuditSink, resetP1 } from './p1Data';
import { resetBilling } from '../billing/data';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as D from './data';
import { CONTACTS, SupplierContact, Channel, finishSourcing } from './sourcing';
import { finishSprint } from './sprint';
import { seedP0, seedAudit } from './p0data';
import { ROLE_USER, roleOf } from './rbac';

export type ChatMsg = { id: number; role: 'user' | 'system' | 'task' | 'outreach'; flow?: 'sourcing' | 'sprint'; text: string; resp?: import('./converse').Resp; taskId?: string; at: string };
export type DraftMsg = {
  title: string; channel: 'WhatsApp' | 'Email' | 'NEFT batch' | 'Internal'; to: string; toDetail?: string; body: string;
  approveLabel?: string; note?: string; onApprove?: (body: string) => void;
};
export type ConfirmSpec = { title: string; body: React.ReactNode; confirmLabel?: string; tone?: 'primary' | 'danger'; onConfirm: () => void };
export type LogEntry = { at: string; text: string; who?: string };
export type AuditEntry = { id: string; ts: string; at: string; who: string; role: string; agent?: boolean; module: string; record?: string; action: string; before?: string; after?: string };
export type AuditMeta = { module?: string; record?: string; before?: string; after?: string; agent?: boolean; action?: string };
export type AgentTask = { id: string; agent: string; text: string; status: 'running' | 'done'; result?: string; to?: string; startedAt: string };
export type Purchase = { id: string; date: string; sku: string; item: string; qty: number; unit: string; addQty: number; stockUnit: string; supplier: string; contactId?: string; rate?: number; rateUnit?: string; perUnit?: number; amount?: number };
export type Autonomy = 'Suggest only' | 'Prepare for approval' | 'Auto within limits';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export type DemoState = {
  orders: D.Order[]; opportunities: D.Opportunity[]; skus: (D.Sku & { incoming?: number; incomingEta?: string; incomingRef?: string })[]; prs: D.PR[]; pos: D.PO[];
  workOrders: D.WO[]; invoices: D.Invoice[]; bills: (D.Bill & { scheduled?: string })[]; employees: D.Employee[]; challans: D.Challan[]; customers: D.Customer[];
  selectedQuote: string | null; pr208Approved: boolean; po0921Sent: boolean; splitConfirmed: boolean; supplierFollowUp: boolean;
  approvals: Record<string, 'approved' | 'declined'>; log: LogEntry[]; chat: ChatMsg[]; lang: 'en' | 'hi' | 'te';
  guide: { active: boolean; step: number }; unit: string; setupDone: boolean;
  tasks: AgentTask[]; agentCfg: Record<string, { enabled: boolean; autonomy: Autonomy }>; followUpPrepared: boolean; quoteRefreshed: boolean;
  contacts: SupplierContact[];
  purchases: Purchase[];
  sourcing: { status: 'idle' | 'running' | 'done'; startedAt?: number; sent: Record<string, Channel>; picks: Record<string, string>; poDraft: boolean; poApproved: boolean; calls: string[] };
  sprint: { status: 'idle' | 'running' | 'done'; startedAt?: number; target: number; calls: string[] };
  role: import('./rbac').Role; perms: import('./rbac').Matrix; audit: AuditEntry[]; p0: import('./p0data').P0; vendor: boolean; tenant: string; plat: import('../platform/data').PlatState;
};
export const initial = (): DemoState => ({
  orders: clone(D.orders), opportunities: clone(D.opportunities), skus: clone(D.skus), prs: clone(D.purchaseRequests), pos: clone(D.purchaseOrders),
  workOrders: clone(D.workOrders), invoices: clone(D.invoices), bills: clone(D.bills), employees: clone(D.employees), challans: clone(D.challans), customers: clone(D.customers),
  selectedQuote: null, pr208Approved: false, po0921Sent: false, splitConfirmed: false, supplierFollowUp: false,
  approvals: {}, log: [
    { at: '09:12', text: 'Attendance synced from biometric device (Gate 1) – 42 of 45 present', who: 'System' },
    { at: '08:40', text: 'Quote PC/QTN/1042 received from Prime Components for PR-208', who: 'Harish Chandra' },
    { at: '08:05', text: 'WO-3317 flagged behind schedule (Welding Bay 2)', who: 'System' },
  ], chat: [], lang: 'en', guide: { active: false, step: 0 }, unit: 'All units', setupDone: true,
  tasks: [], agentCfg: {}, followUpPrepared: false, quoteRefreshed: false,
  contacts: clone(CONTACTS),
  purchases: [],
  sourcing: { status: 'idle', sent: {}, picks: {}, poDraft: false, poApproved: false, calls: [] },
  sprint: { status: 'idle', target: 500000, calls: [] },
  role: 'Owner', perms: {}, audit: seedAudit(), p0: seedP0(), vendor: false, tenant: 't-aarohan', plat: seedPlat(),
});

const KEY = 'business-workspace-demo-v5';
type Toast = { id: number; text: string; tone?: 'green' | 'blue' | 'amber' };
type Ctx = {
  s: DemoState;
  update: (fn: (d: DemoState) => void, log?: string, meta?: AuditMeta) => void;
  reset: () => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  toasts: Toast[];
  draft: DraftMsg | null; openDraft: (d: DraftMsg) => void; closeDraft: () => void;
  confirm: ConfirmSpec | null; openConfirm: (c: ConfirmSpec) => void; closeConfirm: () => void;
  startTask: (t: { agent: string; text: string; result: string; to?: string; ms?: number; effect?: (d: DemoState) => void }) => string;
};
const StoreCtx = createContext<Ctx>(null as unknown as Ctx);

const nowHM = () => {
  const t = new Date();
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<DemoState>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = { ...initial(), ...JSON.parse(raw) } as DemoState;
        if (p.plat && !p.plat.rollout) p.plat.rollout = initial().plat.rollout;
        p.tasks = p.tasks.map((t) => ({ ...t, status: 'done' as const }));
        if (p.sourcing.status === 'running') finishSourcing(p);
        if (p.sprint.status === 'running') finishSprint(p);
        return p;
      }
    } catch { /* ignore */ }
    return initial();
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [draft, setDraft] = useState<DraftMsg | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(s)); }, [s]);

  const update = useCallback((fn: (d: DemoState) => void, log?: string, meta?: AuditMeta) => {
    setS((prev) => {
      const d = clone(prev);
      fn(d);
      const who = ROLE_USER[roleOf(d)].name;
      if (log) d.log = [{ at: nowHM(), text: log, who }, ...d.log].slice(0, 40);
      // Audit: every logged mutation (people or AI) is recorded with before/after where known.
      if (log || meta) d.audit = [{ id: 'AU-' + Date.now().toString(36) + Math.floor(Math.random() * 99), ts: new Date().toISOString(), at: nowHM(), who: meta?.agent ? `Business OS agent on behalf of ${who}` : who, role: roleOf(d), agent: !!meta?.agent, module: meta?.module || 'general', record: meta?.record, action: meta?.action || log || 'Updated', before: meta?.before, after: meta?.after }, ...(d.audit || [])].slice(0, 300);
      return d;
    });
  }, []);
  const toast = useCallback((text: string, tone: Toast['tone'] = 'green') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  useEffect(() => { setP1AuditSink((a) => update(() => {}, undefined, { module: a.module, action: a.action, record: a.record, agent: a.agent })); return () => setP1AuditSink(null); }, [update]);
  const reset = useCallback(() => {
    resetP1(); resetBilling();
    localStorage.removeItem(KEY);
    setS(initial());
    toast('Demo data restored to the original sample', 'blue');
  }, [toast]);
  const startTask = useCallback<Ctx['startTask']>((t) => {
    const id = 'T' + Date.now() + Math.floor(Math.random() * 1000);
    update((d) => { d.tasks.unshift({ id, agent: t.agent, text: t.text, status: 'running', to: t.to, startedAt: nowHM() }); });
    setTimeout(() => {
      update((d) => {
        const x = d.tasks.find((k) => k.id === id);
        if (x) { x.status = 'done'; x.result = t.result; }
        t.effect?.(d);
      });
      toast(`${t.agent}: ${t.result}`, 'blue');
    }, t.ms ?? 3500);
    return id;
  }, [update, toast]);
  const value = useMemo<Ctx>(() => ({
    s, update, reset, toast, toasts, draft, openDraft: setDraft, closeDraft: () => setDraft(null), confirm, openConfirm: setConfirm, closeConfirm: () => setConfirm(null), startTask,
  }), [s, update, reset, toast, toasts, draft, confirm, startTask]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
export const useStore = () => useContext(StoreCtx);
