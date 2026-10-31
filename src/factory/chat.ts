/** Factory chat: answers the owner's real questions straight from the demo data, with one-tap proposals. Anything else goes to the AI with factoryContext(). */
import type { Resp } from '../lib/converse';
import { fx, renewalRows, TENDERS, tenderView, fmtD, GROUPS, groupState, groupTotal, inr, lakh, SITES, siteNeeds, type SiteId, ORDERS, draftUpdate, CREW, COMPANY, DOCS, NEEDS } from './data';

const R = (title: string, blocks: Resp['blocks'], actions: Resp['actions'] = [], links: Resp['links'] = []): Resp => ({ title, blocks, sources: [], actions, links });
const COUNTRY: Record<string, string> = { germany: 'Germany', german: 'Germany', uae: 'UAE', dubai: 'UAE', usa: 'USA', us: 'USA', america: 'USA' };

export function factoryRespond(raw: string): Resp | null {
  const q = raw.toLowerCase(); const s = fx.get();
  const siteM = q.match(/site\s*([123])|\b(cherlapally|shamshabad|medak)\b/);
  const site = siteM ? (siteM[1] ? `S${siteM[1]}` : ({ cherlapally: 'S1', shamshabad: 'S2', medak: 'S3' } as Record<string, string>)[siteM[2]]) as SiteId : null;

  // 1. Approvals and renewals
  if (/expir|renew|licen[cs]e|\bnoc\b|consent|approvals?\b.*(due|month|week|expir)|compliance/.test(q) && !/tender|bid/.test(q)) {
    const horizon = /week/.test(q) ? 7 : /quarter|90/.test(q) ? 90 : 30;
    const rows = renewalRows(s).filter((x) => x.left <= horizon && x.status !== 'Filed – awaiting authority');
    if (!rows.length) return R(`Nothing expires in the next ${horizon} days that isn't already filed.`, [], [], [{ label: 'All approvals', to: '/renewals' }]);
    return R(`${rows.length} approvals expire in the next ${horizon} days${rows.some((x) => x.left < 0) ? ' – one has already expired' : ''}`, [
      { type: 'table', cols: ['Approval', 'Expires', 'Days left', 'Status'], rows: rows.map((x) => [x.d.name, fmtD(x.d.validTill!), x.left < 0 ? `Expired ${-x.left}d ago` : `${x.left}${x.late ? ' (authority needs ' + x.r.leadDays + ')' : ''}`, x.status]) },
      { type: 'text', text: `**Do first:** ${rows[0].d.name} – ${rows[0].r.agentNote}` },
    ], [...rows.filter((x) => x.status.startsWith('Pack ready')).map((x, i) => ({ label: `Approve ${x.d.name.split(' – ')[0]} renewal`, kind: `fx:renew:${x.r.id}`, primary: i === 0 }))], [{ label: 'Open approvals & renewals', to: '/renewals' }]);
  }
  // 2. Tenders
  if (/tender|\bbid\b|rfq|rate contract/.test(q)) {
    const t = TENDERS.find((x) => q.includes(x.id.toLowerCase()) || x.buyer.toLowerCase().split(/[ ,()]+/).some((w) => w.length > 4 && q.includes(w)) || x.name.toLowerCase().split(/[ –-]+/).some((w) => w.length > 5 && q.includes(w)));
    if (!t) return R(`You have ${TENDERS.length} open tenders. Which one?`, [{ type: 'table', cols: ['Tender', 'Buyer', 'Closes', 'Ready from library'], rows: TENDERS.map((x) => { const v = tenderView(s, x); return [`${x.id} · ${x.name}`, x.buyer, fmtD(x.closes), `${v.pct}% · ${v.open.length} questions for you`]; }) }],
      TENDERS.map((x) => ({ label: `Prepare ${x.id}`, kind: `ask:prepare the tender pack for ${x.id}` })), [{ label: 'Open tenders', to: '/tenders' }]);
    const v = tenderView(s, t);
    return R(`${t.id} pack: ${v.fromLib} of ${t.items.length} items (${v.pct}%) filled from your library. ${v.open.length ? `${v.open.length} need you.` : 'Nothing left for you.'}`, [
      { type: 'text', text: `**${t.name}** for ${t.buyer} – value ${lakh(t.value)}, closes **${fmtD(t.closes)}**.` },
      ...(v.open.length ? [{ type: 'table' as const, cols: ['Only you can answer', 'What I found'], rows: v.open.map((r) => [r.it.ask, r.it.hint || '—']) }] : []),
      ...(v.expiring.length ? [{ type: 'facts' as const, items: v.expiring.map((r) => ({ label: r.d!.name, value: `expires ${fmtD(r.expires!)}, before the bid closes – renew first`, tone: 'red' as const, to: '/renewals' })) }] : []),
    ], [{ label: 'Answer the questions', kind: `open:/tenders?t=${t.id}`, primary: !!v.open.length }, ...(!v.open.length && !v.approved ? [{ label: 'Approve pack', kind: `fx:pack:${t.id}`, primary: true }] : [])], [{ label: `Open ${t.id}`, to: `/tenders?t=${t.id}` }]);
  }
  // 3. Purchasing
  if (/purchas|procure|\bbuy\b|po\b|supplier|needs?\b|requirement|indent/.test(q) && (site || /open|pending|site|all|consolidat|need/.test(q))) {
    const groups = GROUPS.map((g) => groupState(s, g)).filter((g) => !site || g.needs.some((n) => NEEDS.find((x) => x.id === n)?.site === site));
    const needs = site ? siteNeeds(site) : NEEDS;
    return R(site ? `${SITES[site].short} has ${needs.length} open purchase needs` : `${NEEDS.length} needs from 3 sites, merged into ${GROUPS.length} buys`, [
      { type: 'table', cols: ['Item', 'Qty', 'Needed by', 'Plan'], rows: needs.map((n) => { const g = groups.find((x) => x.needs.includes(n.id))!; const q0 = g.quotes[g.pick]; return [`${n.item}${site ? '' : ` (${SITES[n.site].short})`}`, `${n.qty.toLocaleString('en-IN')} ${n.unit}`, fmtD(n.by), g.po ? `${g.po} raised` : `${q0.supplier} @ ${inr(q0.price)}`]; }) },
      { type: 'facts', items: groups.map((g) => ({ label: g.item, value: g.saving, tone: g.po ? 'green' as const : 'blue' as const, to: '/purchasing' })) },
    ], groups.filter((g) => !g.po).map((g, i) => ({ label: `Approve ${g.quotes[g.pick].supplier.startsWith('Site') ? 'transfer' : 'PO'}: ${g.item.split(',')[0]} (${inr(groupTotal(g))})`, kind: `fx:po:${g.id}`, primary: i === 0 })), [{ label: 'Open purchasing', to: '/purchasing' }]);
  }
  // 4. Customer status updates / orders / QA
  const cty = Object.keys(COUNTRY).find((c) => new RegExp(`\\b${c}\\b`).test(q));
  const o = ORDERS.find((x) => q.includes(x.id.toLowerCase()) || q.includes(x.contact.split(' ')[0].toLowerCase()) || q.includes(x.customer.split(' ')[0].toLowerCase()) || (cty && x.country === COUNTRY[cty]));
  if (o && /update|status|draft|mail|email|reply|write/.test(q)) {
    return R(`Draft update for ${o.contact} (${o.customer}, ${o.country})`, [
      { type: 'facts', items: [{ label: 'Progress', value: `${o.done.toLocaleString('en-IN')} of ${o.qty.toLocaleString('en-IN')} done`, tone: 'blue' }, { label: 'QA first-pass yield', value: `${((o.qaPass / o.qaInspected) * 100).toFixed(1)}%`, tone: o.ncr ? 'amber' : 'green' }, { label: 'Ships', value: fmtD(o.ship) }, { label: 'Customer waiting', value: `last update ${o.lastUpdateDays} days ago, ${o.mails.filter((m) => m.dir === 'in').length} unanswered mails`, tone: o.lastUpdateDays > 3 ? 'red' : 'amber' }] },
      { type: 'md', text: '```\n' + draftUpdate(o) + '\n```' },
    ], [{ label: 'Review & send (simulated)', kind: `fx:update:${o.id}`, primary: true }], [{ label: `Open ${o.id}`, to: `/customers?o=${o.id}` }]);
  }
  if (/qa\b|quality|defect|ncr|yield|reject/.test(q) || (/orders?|shipment|customer/.test(q) && /status|where|late|due|export|international/.test(q))) {
    return R('Export orders and quality today', [{ type: 'table', cols: ['Order', 'Customer', 'Done', 'First-pass yield', 'Ships', 'Open issue'], rows: ORDERS.map((x) => [x.id, `${x.customer.replace(' (fictional)', '')}, ${x.country}`, `${Math.round((x.done / x.qty) * 100)}%`, `${((x.qaPass / x.qaInspected) * 100).toFixed(1)}%`, fmtD(x.ship), x.ncr || '—']) }],
      ORDERS.filter((x) => !s.updates[x.id] && x.lastUpdateDays >= 2).map((x, i) => ({ label: `Draft update to ${x.contact.split(' ')[0]} (${x.country})`, kind: `ask:draft a status update for ${x.id}`, primary: i === 0 })), [{ label: 'Open customer orders', to: '/customers' }]);
  }
  // 5. Workforce
  if (/workforce|headcount|attendance|contract|labou?r|workers|staff|employees|present|absent|daily.?wage/.test(q)) {
    const rows = site ? CREW.filter((c) => c.site === site) : CREW;
    const t = rows.reduce((a, c) => ({ ft: a.ft + c.ft, ct: a.ct + c.contract, pf: a.pf + c.presentFt, pc: a.pc + c.presentContract }), { ft: 0, ct: 0, pf: 0, pc: 0 });
    return R(`${t.pf + t.pc} of ${t.ft + t.ct} people at work today (${t.ft} full-time, ${t.ct} contract)`, [
      { type: 'table', cols: ['Site', 'Full-time present', 'Contract present', 'Agency'], align: ['l', 'r', 'r', 'l'], rows: rows.map((c) => [SITES[c.site].short, `${c.presentFt} / ${c.ft}`, `${c.presentContract} / ${c.contract}`, c.agency]) },
      ...(rows.some((c) => c.site === 'S3') ? [{ type: 'facts' as const, items: [{ label: 'Site 3 contract labour licence', value: 'expired 3 days ago – 57 contract workers on site today are not covered', tone: 'red' as const, to: '/renewals' }] }] : []),
    ], rows.some((c) => c.site === 'S3') && !String(s.renewals['RN-01'] || '').startsWith('Filed') ? [{ label: 'Approve CLRA licence renewal', kind: 'fx:renew:RN-01', primary: true }] : [], [{ label: 'Open workforce', to: '/workforce' }]);
  }
  if (/what (can|do) you|help|start|today|attention|needs? me/.test(q)) return null;
  return null;
}

/** Compact data the AI may quote from for anything the rules above don't cover. */
export function factoryContext(): string {
  const s = fx.get();
  return JSON.stringify({
    company: `${COMPANY.name} – fictional MSME group, 3 sites: ${Object.values(SITES).map((x) => `${x.name} (${x.makes})`).join('; ')}. Owner Ranjith. 70 full-time + 175 contract workers. Exports to Germany, UAE, USA.`,
    modules: 'Today, Tenders & documents, Approvals & renewals, Purchasing (multi-site), Customer orders & QA, Workforce, Agents. All sends are simulated.',
    renewals: renewalRows(s).map((x) => `${x.d.name}: expires ${x.d.validTill} (${x.left} days), ${x.status}`),
    tenders: TENDERS.map((t) => { const v = tenderView(s, t); return `${t.id} ${t.name} (${t.buyer}) closes ${t.closes}, ${v.pct}% from library, open questions: ${v.open.map((r) => r.it.ask).join('; ')}`; }),
    library: DOCS.map((d) => d.name + (d.validTill ? ` (valid till ${d.validTill})` : '')),
    purchasing: GROUPS.map((g) => { const x = groupState(s, g); return `${x.item}: ${x.qty} ${x.unit}, best ${x.quotes[x.pick].supplier} ₹${x.quotes[x.pick].price}${x.po ? ', ' + x.po : ''}`; }),
    orders: ORDERS.map((o) => `${o.id} ${o.customer} (${o.country}) ${o.done}/${o.qty} ${o.product}, QA pass ${o.qaPass}/${o.qaInspected}, ships ${o.ship}`),
    workforce: CREW.map((c) => `${SITES[c.site].short}: ${c.presentFt}/${c.ft} FT, ${c.presentContract}/${c.contract} contract`),
  });
}
