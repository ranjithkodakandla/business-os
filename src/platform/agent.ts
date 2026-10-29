/** Platform admin AI: rules-first intents that return structured cards; follow-up answers fill a pending action. */
import { MODULES } from '../lib/nav';
import { PLANS, MRR_TREND, mrrOf, churnRisk, tenantByName, inrP, lakhP, planMods, FLAG_KEYS, type PlatState, type Plan, type Region, type Tenant } from './data';

export type PField = { k: string; label: string; value: string; options?: string[] };
export type PCard = { id: string; kind: 'view' | 'action'; title: string; sub?: string; kpis?: [string, string][]; table?: { cols: string[]; rows: string[][] }; chart?: { m: string; v: number }[]; fields?: PField[]; action?: 'flag' | 'trial'; status?: 'pending' | 'done' | 'cancelled'; result?: string };
export type PMsg = { role: 'user' | 'ai'; text?: string; card?: PCard };
const id = () => 'pc' + Math.random().toString(36).slice(2, 8);
const modIn = (t: string) => { const T = t.toLowerCase(); return MODULES.find((m) => T.includes(m.label.en.toLowerCase()) || T.includes(m.key)) || (/\bqc|quality/.test(T) ? MODULES.find((m) => m.key === 'qc') : /\bbom|production/.test(T) ? MODULES.find((m) => m.key === 'bom') : /\bhr\b|employees/.test(T) ? MODULES.find((m) => m.key === 'people') : undefined); };
const planIn = (t: string): Plan | '' => (/\bpro\b/i.test(t) ? 'Pro' : /growth/i.test(t) ? 'Growth' : /starter|basic/i.test(t) ? 'Starter' : '');
const regionIn = (t: string): Region | '' => (/middle east|\bme\b|uae|dubai|gulf/i.test(t) ? 'ME' : /west|pune|mumbai|gujarat|ahmedabad/i.test(t) ? 'India-West' : /north|delhi|punjab/i.test(t) ? 'India-North' : /south|hyderabad|chennai|bangalore|bengaluru/i.test(t) ? 'India-South' : '');
const tRow = (t: Tenant) => [t.name, t.plan, t.region, t.status, String(t.health), t.lastActive];

export function platIntent(t0: string, p: PlatState): PCard | null {
  const t = t0.replace(/\bpayrol\b/gi, 'payroll').replace(/\bcompnies\b/gi, 'companies');
  if (/(haven'?t|not|un)\s*paid|unpaid|failed payment|dunning|overdue (invoice|payment)/i.test(t)) {
    const inv = p.invoices.filter((i) => i.month === 'Oct 2026' && i.status !== 'Paid');
    return { id: id(), kind: 'view', title: `${inv.length} companies haven't paid for October`, sub: `${lakhP(inv.reduce((a, i) => a + i.amount + i.gst, 0))} outstanding incl. GST`,
      table: { cols: ['Company', 'Invoice', 'Amount', 'Status', 'Retries'], rows: inv.map((i) => [p.tenants.find((x) => x.id === i.tenant)!.name, i.id, inrP(i.amount + i.gst), i.status, String(i.attempts)]) } };
  }
  if (/\bmrr\b|\barr\b|revenue trend|recurring revenue/i.test(t)) {
    const m = mrrOf(p);
    return { id: id(), kind: 'view', title: `MRR ${lakhP(m)} · ARR ${lakhP(m * 12)}`, sub: '+3.4% month on month · 12-month trend (₹ lakh)', kpis: [['MRR', lakhP(m)], ['ARR', lakhP(m * 12)], ['Paying', String(p.tenants.filter((x) => x.mrr > 0).length)], ['Trials', String(p.tenants.filter((x) => x.status === 'Trial').length)]], chart: MRR_TREND };
  }
  if (/churn|at risk|unhappy|inactive|health/i.test(t)) {
    const r = churnRisk(p);
    return { id: id(), kind: 'view', title: `${r.length} tenants at churn risk`, sub: 'Health < 60, idle > 7 days, or a failed payment', table: { cols: ['Company', 'Plan', 'Region', 'Status', 'Health', 'Last active'], rows: r.map(tRow) } };
  }
  const flag = t.match(/\b(turn on|enable|activate|switch on|give|turn off|disable|deactivate|switch off|remove)\b/i);
  if (flag && (/\bfor\b/i.test(t) || modIn(t))) {
    const on = !/off|disable|deactivate|remove/i.test(flag[1]);
    const m = modIn(t); const ten = tenantByName(p, (t.match(/\bfor\s+(.+?)(\?|$)/i) || [])[1] || '');
    return { id: id(), kind: 'action', action: 'flag', status: 'pending', title: `${on ? 'Turn on' : 'Turn off'} ${m?.label.en || 'a module'}${ten ? ` for ${ten.name}` : ''}`, sub: ten && m && !planMods(ten.plan).includes(m.key) && on ? `Not in ${ten.plan} plan – will be added as a paid add-on` : 'Takes effect immediately for every user of that company',
      fields: [{ k: 'company', label: 'Company', value: ten?.name || '', options: p.tenants.map((x) => x.name) }, { k: 'module', label: 'Module', value: m?.label.en || '', options: MODULES.filter((x) => FLAG_KEYS.includes(x.key)).map((x) => x.label.en) }, { k: 'state', label: 'State', value: on ? 'On' : 'Off', options: ['On', 'Off'] }] };
  }
  if (/\b(create|start|set up|setup|open|new)\b.*\btrial\b|\btrial for\b/i.test(t)) {
    const nm = (t.match(/trial (?:account )?for\s+(.+?)(?:\s+on\b|\s+in\b|,|$)/i) || t.match(/for\s+(.+?)(?:\s+on\b|$)/i) || [])[1] || '';
    return { id: id(), kind: 'action', action: 'trial', status: 'pending', title: `Create a 14-day trial${nm ? ` for ${nm}` : ''}`, sub: 'Seeds a sandbox tenant · no emails sent in demo',
      fields: [{ k: 'name', label: 'Company', value: nm.trim() }, { k: 'plan', label: 'Plan', value: planIn(t), options: PLANS.map((x) => x.name) }, { k: 'region', label: 'Region', value: regionIn(t), options: ['India-South', 'India-West', 'India-North', 'ME'] }] };
  }
  if (/companies|tenants|customers list|all clients/i.test(t)) return { id: id(), kind: 'view', title: `${p.tenants.length} companies`, table: { cols: ['Company', 'Plan', 'Region', 'Status', 'Health', 'Last active'], rows: p.tenants.map(tRow) } };
  if (/plans?|pricing/i.test(t)) return { id: id(), kind: 'view', title: 'Plans', table: { cols: ['Plan', 'Price / month', 'Users', 'Agents', 'Modules'], rows: PLANS.map((x) => [x.name, inrP(x.price), x.users, x.agents, String(x.modules.length)]) } };
  if (/support|tickets?|sla/i.test(t)) return { id: id(), kind: 'view', title: 'Open support tickets', table: { cols: ['Ticket', 'Company', 'Subject', 'Priority', 'SLA'], rows: p.tickets.filter((x) => x.status !== 'Resolved').map((x) => [x.id, p.tenants.find((y) => y.id === x.tenant)!.name, x.subject, x.priority, x.ageHrs > x.slaHrs ? 'Breached' : `${x.slaHrs - x.ageHrs}h left`]) } };
  return null;
}
export const missing = (c: PCard) => (c.fields || []).filter((f) => !f.value).map((f) => f.k);
/** Fold a follow-up answer ("plan - growth", "west", "XYZ Forgings") into the pending card. */
export function fillPCard(c: PCard, t: string): PCard | null {
  const f = (c.fields || []).map((x) => ({ ...x })); let hit = false;
  for (const line of t.split(/\n|;|,(?=\s*\w+\s*[-:])/)) {
    const kv = line.match(/^\s*([a-z ]+?)\s*[-:=]\s*(.+)$/i);
    const target = kv ? f.find((x) => x.k === kv[1].trim().toLowerCase() || x.label.toLowerCase() === kv[1].trim().toLowerCase()) : undefined;
    const val = (kv && target ? kv[2] : line).trim(); if (!val) continue;
    const norm = (x: PField) => x.k === 'plan' ? planIn(val) : x.k === 'region' ? regionIn(val) : x.options ? x.options.find((o) => o.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(o.toLowerCase().split(' ')[0])) || '' : val;
    if (target) { const v = norm(target); if (v) { target.value = v; hit = true; } continue; }
    for (const x of f.filter((y) => !y.value)) { const v = norm(x); if (v) { x.value = v; hit = true; break; } }
  }
  for (const x of f) if (!x.value) { if (x.k === 'plan' && planIn(t)) { x.value = planIn(t); hit = true; } if (x.k === 'region' && regionIn(t)) { x.value = regionIn(t); hit = true; } }
  if (!hit) return null;
  const g = (k: string) => f.find((x) => x.k === k)?.value || '';
  return { ...c, fields: f, title: c.action === 'trial' ? `Create a 14-day trial for ${g('name') || '…'} on ${g('plan') || '…'} (${g('region') || '…'})` : `${g('state') === 'Off' ? 'Turn off' : 'Turn on'} ${g('module') || '…'} for ${g('company') || '…'}` };
}
/** Run a confirmed platform action on a draft state. */
export function execP(p: PlatState, c: PCard): string {
  const g = (k: string) => c.fields?.find((x) => x.k === k)?.value || '';
  if (c.action === 'flag') {
    const ten = p.tenants.find((x) => x.name === g('company')) || tenantByName(p, g('company')); const m = MODULES.find((x) => x.label.en === g('module'));
    if (!ten || !m) return 'Could not find that company or module – nothing changed.';
    p.flags[ten.id][m.key] = g('state') !== 'Off';
    p.log.unshift({ at: new Date().toTimeString().slice(0, 5), tenant: ten.id, text: `Platform: ${m.label.en} turned ${g('state') === 'Off' ? 'off' : 'on'}` });
    return `${m.label.en} is now ${g('state') === 'Off' ? 'off' : 'on'} for ${ten.name}.`;
  }
  const plan = (g('plan') || 'Growth') as Plan; const tid = 't-' + g('name').toLowerCase().replace(/[^a-z]/g, '').slice(0, 10);
  if (!p.tenants.some((x) => x.id === tid)) {
    p.tenants.unshift({ id: tid, name: g('name'), city: '—', industry: 'Manufacturing', plan, region: (g('region') || 'India-South') as Region, status: 'Trial', users: 1, mrr: 0, health: 70, lastActive: 'Today', idleDays: 0, db: 'Shared', version: 'v2.14.0', gstin: '—', since: 'Oct 2026', usage: {} });
    p.flags[tid] = Object.fromEntries(FLAG_KEYS.map((k) => [k, planMods(plan).includes(k)]));
    p.log.unshift({ at: new Date().toTimeString().slice(0, 5), tenant: tid, text: `Trial created on ${plan}` });
  }
  return `Trial created for ${g('name')} on ${plan} · ${g('region') || 'India-South'} · ends 12 Nov 2026 (demo – no email sent).`;
}
