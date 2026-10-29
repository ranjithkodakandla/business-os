// Agentic data commands for the Home chat: add, receive, update, view and analyse business data in this browser session.
// Flow: text → structured intent (LLM tool call via /api/intent, with a deterministic rules parser as fallback and gap-filler)
// → resolved against the session data → a structured result the chat renders as UI (confirm card, diff, table, chart).
// Nothing here contacts anyone; changes are applied only when the owner presses the confirm button.
import type { DemoState } from './store';
import type { SupplierContact, Channel } from './sourcing';
import { customerById, outstanding, overdueDays, supplierById } from './domain';
import { todayISO } from './format';

/* ---------- intents (the "tool call") ---------- */
export type Intent =
  | { tool: 'add_supplier'; args: { supplier: string; person?: string; phone?: string; email?: string; city?: string; supplies?: string; gstin?: string; terms?: string } }
  | { tool: 'receive_stock'; args: { item: string; qty: number; unit: string; supplier?: string; rate?: number | null; rateUnit?: string } }
  | { tool: 'update_record'; args: { entity: string; ref: string; field: string; value: string; changes?: { field: string; value: string }[] } }
  | { tool: 'query'; args: { entity: string; category?: string; city?: string; name?: string } }
  | { tool: 'insight'; args: { kind: string } }
  | { tool: 'add_person'; args: PersonArgs };
export type PersonArgs = { name?: string; role?: string; team?: string; type?: string; start?: string; manager?: string; pay?: string };
export type NewPerson = { id: string; name: string; role: string; team: string; type: string; start: string; manager: string; pay: string; shift: string; site: string };

/* ---------- results (what the chat renders) ---------- */
export type Status = 'pending' | 'saved' | 'cancelled' | 'replaced';
export type Act = { label: string; kind: string; primary?: boolean }; // kind: open:/path | ask:text
export type Col = { key: string; label: string; align?: 'l' | 'r'; type?: 'text' | 'num' | 'money' | 'pct' | 'badge' };
export type Row = Record<string, string | number> & { _to?: string; _tone?: string };
export type Kpi = { label: string; value: string; sub?: string; tone?: 'red' | 'amber' | 'green' | 'blue' };
export type Diff = { label: string; before: string; after: string };
export type Bar = { label: string; value: number; display: string; tone?: 'green' | 'amber' | 'red' | 'blue' };
export type Result =
  | { kind: 'add_person'; status: Status; headline: string; person: NewPerson; missing: string[]; dupOf?: string; via: Via }
  | { kind: 'add_supplier'; status: Status; headline: string; contact: SupplierContact & { gstin?: string }; dupOf?: string; via: Via }
  | { kind: 'receive'; status: Status; headline: string; sku: string; skuName: string; qty: number; unit: string; addQty: number; stockUnit: string; conv?: string; supplier: string; contactId?: string; rate?: number; rateUnit?: string; perStockUnit?: number; amount?: number; before: number; after: number; priceNote?: string; priceTone?: 'red' | 'green' | 'amber'; via: Via }
  | { kind: 'update'; status: Status; headline: string; target: { type: 'contact' | 'bill' | 'po' | 'invoice'; id: string; label: string }; diffs: Diff[]; patch: Record<string, string | number>; via: Via }
  | { kind: 'table'; headline: string; title: string; cols: Col[]; rows: Row[]; kpis?: Kpi[]; actions: Act[]; via: Via; empty?: string }
  | { kind: 'record'; headline: string; title: string; subtitle: string; kpis: Kpi[]; sections: { title: string; cols: Col[]; rows: Row[] }[]; actions: Act[]; via: Via }
  | { kind: 'insight'; headline: string; title: string; chartTitle: string; bars: Bar[]; cols: Col[]; rows: Row[]; suggestion: string; actions: Act[]; note: string; via: Via }
  | { kind: 'notfound'; headline: string; detail: string; actions: Act[]; via: Via }
  | import('./domainViews').View;
export type Via = 'llm' | 'rules';

/* ---------- helpers ---------- */
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9\u0900-\u0D7F ]+/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['the', 'and', 'of', 'a', 'an', 'to', 'from', 'pvt', 'ltd', 'private', 'limited', 'co', 'company', 'enterprises', 'traders', 'trading', 'industries', 'sri', 'shri', 'm', 's', 'bhai', 'garu', 'ji', 'sir', 'anna']);
const toks = (x: string) => norm(x).split(' ').filter((w) => w.length > 1 && !STOP.has(w));
const lev = (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
const wordHit = (q: string, w: string) => q === w || (q.length >= 4 && (w.startsWith(q) || q.startsWith(w))) || (q.length >= 5 && lev(q, w) <= 1);
/** 0..1: how well the query names this text (typo tolerant). */
export const nameScore = (query: string, text: string) => { const q = toks(query); const w = toks(text); if (!q.length || !w.length) return 0; const hit = q.filter((x) => w.some((y) => wordHit(x, y))).length; return hit / q.length; };
export const maskPhone = (p: string) => { const d = p.replace(/\D/g, ''); const n = d.length >= 12 && d.startsWith('91') ? d.slice(2) : d.slice(-10); return n.length === 10 ? `+91 ${n.slice(0, 2)}•••• ${n.slice(-4)}` : p; };
const PHONE_RE = /(?:\+?91[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b|(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const GSTIN_RE = /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/i;
export const validGstin = (g: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g.trim().toUpperCase());
const AREAS = ['hyderabad', 'secunderabad', 'jeedimetla', 'balanagar', 'kukatpally', 'begum bazaar', 'katedan', 'cherlapally', 'ranigunj', 'medak', 'patancheru', 'uppal', 'nacharam', 'mallapur', 'gachibowli', 'kompally', 'bollaram', 'moula ali', 'sanathnagar', 'ameerpet', 'miyapur', 'shamshabad', 'lb nagar', 'dilsukhnagar', 'kondapur', 'madhapur', 'bachupally', 'nampally', 'abids', 'charminar', 'tolichowki', 'mehdipatnam', 'rajkot', 'pune', 'mumbai', 'chennai', 'bengaluru', 'bangalore', 'vijayawada', 'warangal', 'vizag', 'visakhapatnam', 'nagpur', 'ahmedabad'];
const HYD = new Set(AREAS.slice(0, 31));
const isHyd = (city: string) => [...HYD].some((a) => norm(city).includes(a));
const cap = (x: string) => x.replace(/\b([a-z])/g, (m) => m.toUpperCase());
const num = (x: string) => Number(String(x).replace(/,/g, ''));
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const inrL = (n: number) => (Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(n >= 1e6 ? 1 : 2).replace(/\.?0+$/, '')} lakh` : inr(n));
const CATS: [RegExp, string[]][] = [
  [/\b(steel|ms|mild steel|ss|stainless|gi|crca|sheet|plate|coil|metal|metals|iron|pipe)s?\b/, ['steel', 'ms ', 'ms/', 'ss ', 'gi ', 'crca', 'sheet', 'plate', 'coil', 'metal', 'pipe']],
  [/\bbearings?\b/, ['bearing']], [/\bcasting|castings|aluminium|alu\b/, ['casting', 'aluminium']], [/\bgaskets?|seals?|rubber\b/, ['gasket', 'seal', 'rubber']],
  [/\bconsumables?|fasteners?|tools?\b/, ['consumable', 'fastener', 'tool']],
];
export const sheetKg = 2.5 * 1.25 * 0.002 * 7850; // 2500×1250×2 mm MS sheet ≈ 49 kg
const unitNorm = (u: string) => { const x = norm(u); return /^(kg|kgs|kilo|kilos|kilogram)/.test(x) ? 'kg' : /^(ton|tons|tonne|tonnes|t|mt)$/.test(x) ? 'ton' : /^(pc|pcs|piece|pieces|nos|no|units?)$/.test(x) ? 'pcs' : /^sheets?$/.test(x) ? 'sheets' : x; };

/* ---------- 1. the gate: is this a data command at all? ---------- */
const VERB_ADD = /\b(add|create|register|onboard|save|enter|new)\b[^.?!]*\b(supplier|vendor|party|dealer|contact)\b|\b(supplier|vendor)\b[^.?!]*\b(add|save|register)\b/i;
const VERB_RECV = /\b(received|recieved|receive|got|came|come in|arrived|delivered|inward(ed)?|grn|unloaded|aaya|aaye|aagaya|vachindi|vachayi|purchased|bought)\b/i;
const VERB_UPD = /\b(change|chnage|chage|cahnge|chang|update|updte|upate|udpate|modify|set|edit|correct|replace|mark|make|marchu|maarchu|marchandi|badlo|badal|badli)\b|\bnew (phone|number|mobile|email|address)\b|\b(is|got|been) paid\b|\bpaid\b.*\b(po|pb|inv)[\s-]?\d/i;
const VERB_VIEW = /\b(show|list|find|display|view|give me|get me|pull up|which|who are|what'?s pending|whats pending|pending (from|with|for)|outstanding (from|for|with)|due from|dikhao|chupinchu|chupi)\b/i;
const INSIGHT = /\b(most reliable|least reliable|reliable|best supplier|top supplier|worst supplier|over ?pay(ing)?|paying (too much|more)|too expensive|costl(y|ier)|where can i save|save money|running low|low stock|below reorder)\b/i;
export const looksLikeData = (t: string) => isAddPerson(t) || VERB_ADD.test(t) || (VERB_RECV.test(t) && /\d/.test(t) && !/\b(need|want|require|chahiye|kavali)\b/i.test(t)) || (VERB_UPD.test(t) && (FIELD_RE.test(t) || /\b(po|pb|inv|bill|invoice)[\s-]?\d/i.test(t))) || (VERB_VIEW.test(t) && /\b(suppliers?|vendors?|pending|outstanding|due|stock|pos?|purchase orders?|bills?)\b/i.test(t)) || INSIGHT.test(t);

/* field words people use → contact field */
const FIELD_SRC = String.raw`phone(?: number| no)?|mobile(?: number| no)?|whatsapp(?: number| no)?|contact number|number|e-?mail(?: id| address)?|mail id|city|area|locality|location|address|place|town|lead[ -]?(?:time|days?)|delivery (?:time|days?)|lead|payment terms|credit (?:days|period)|terms|gstin|gst(?: number| no)?|contact person|contact name|person|supplies|items|products|material`;
const FIELD_RE = new RegExp(String.raw`\b(${FIELD_SRC})\b`, 'i');
const fieldKey = (f: string) => { const x = f.toLowerCase(); return /gst/.test(x) ? 'gstin' : /mail/.test(x) ? 'email' : /phone|mobile|whatsapp|number/.test(x) ? 'phone' : /city|area|locality|location|address|place|town/.test(x) ? 'city' : /lead|delivery/.test(x) ? 'leadDays' : /terms|credit/.test(x) ? 'terms' : /person|name/.test(x) ? 'person' : /supplies|items|products|material/.test(x) ? 'supplies' : ''; };
const NOISE = /\b(please|pls|plz|kindly|can you|could you|also|and|then|change|chnage|update|updte|set|make|it|ki|ko|ga|gaa|ni|kar do|kardo|karo|kar dena|cheyyi|cheyyandi|chey|marchu|maarchu|marchandi|badlo|badal do|now|new|the|his|their|its|value|days?|din|rojulu)\b/gi;
/** Every "field … value" pair in one message: "area from Medak to Nampally and lead days to 6 days". */
export function parseChanges(t: string): { field: string; value: string }[] {
  const re = new RegExp(String.raw`\b(${FIELD_SRC})\b`, 'gi'); const hits: { f: string; start: number; end: number }[] = []; let m: RegExpExecArray | null;
  while ((m = re.exec(t))) { if (fieldKey(m[1])) hits.push({ f: fieldKey(m[1]), start: m.index, end: m.index + m[0].length }); }
  const out: { field: string; value: string }[] = [];
  hits.forEach((h, i) => {
    const seg = t.slice(h.end, hits[i + 1]?.start ?? t.length).replace(/\s*(,|;|\band\b|\balso\b|&)\s*$/i, '');
    let v = '';
    if (h.f === 'phone') v = (seg.match(PHONE_RE) || [''])[0];
    else if (h.f === 'email') v = (seg.match(EMAIL_RE) || [''])[0];
    else if (h.f === 'gstin') v = (seg.match(GSTIN_RE) || [''])[0].toUpperCase();
    else if (h.f === 'leadDays') v = (seg.match(/\d+/) || [''])[0];
    else { const to = seg.match(/.*\b(?:to|as|is|=|:|into|->|→)\s+(.+)$/i); v = (to ? to[1] : seg.replace(/^\s*(?:from\s+\S+(?:\s+\S+)?\s+)?/i, '')).replace(NOISE, ' ').replace(/[.!?,;]+/g, ' ').replace(/\s+/g, ' ').trim(); }
    if (v && !out.some((o) => o.field === h.f)) out.push({ field: h.f, value: v });
  });
  return out;
}
const refBefore = (t: string) => { const i = t.search(FIELD_RE); const head = (i > 0 ? t.slice(0, i) : '').replace(/^.*?\b(change|chnage|chage|cahnge|chang|update|updte|upate|udpate|modify|set|edit|correct)\b\s*/i, '').replace(/\b(can you|could you|please|pls|the|my|for|of|supplier|vendor|details?|new|current|old)\b/gi, ' ').trim().replace(/('s|’s|s')\s*$/i, '').replace(/[,:]/g, ' ').replace(/\s+/g, ' ').trim(); return head.split(' ').length <= 5 ? head : ''; };

/* ---------- 2. rules parser (fallback + fills gaps in the LLM call) ---------- */
export function parseRules(raw: string): Intent | null {
  if (isAddPerson(raw)) return { tool: 'add_person', args: parsePerson(raw) };
  const t = raw.trim().replace(/\s+/g, ' ');
  const low = t.toLowerCase();
  if (INSIGHT.test(t)) {
    if (/over ?pay|paying (too much|more)|expensive|costl|save/i.test(t)) return { tool: 'insight', args: { kind: 'overpaying' } };
    if (/running low|low stock|below reorder/i.test(t)) return { tool: 'insight', args: { kind: 'low_stock' } };
    return { tool: 'insight', args: { kind: 'reliable_supplier' } };
  }
  if (VERB_ADD.test(t)) {
    const phone = (t.match(PHONE_RE) || [''])[0]; const email = (t.match(EMAIL_RE) || [''])[0]; const gstin = (t.match(GSTIN_RE) || [''])[0].toUpperCase();
    let rest = t.replace(PHONE_RE, ' ').replace(EMAIL_RE, ' ').replace(GSTIN_RE, ' ');
    const supplies = (rest.match(/\b(?:supplies|supplying|sells|selling|deals? in|dealer (?:of|for)|for|makes|provides|trader of|stockist of)\s+([^,.;]+?)(?=\s*(?:,|;|\.|$|\bin\b|\bat\b|\bfrom\b|\bcontact\b|\bphone\b|\bnumber\b|\bgst))/i) || [])[1] || '';
    const city = (rest.match(/\b(?:in|at|from|located in|based in)\s+([A-Za-z ]+?)(?=\s*(?:,|;|\.|$|\bcontact\b|\bphone\b|\bnumber\b|\bsupplies|\bsells|\bwho|\bthey|\bfor\b|\bgst))/i) || [])[1]?.trim() || AREAS.find((a) => low.includes(a)) || '';
    const person = (rest.match(/\b(?:contact(?: person)?(?: is)?|person|owner(?: is)?|name is|ask for|talk to|speak to|mr\.?|mrs\.?|ms\.?)\s*[:-]?\s*([A-Za-z]+(?: [A-Za-z]+)?)/i) || [])[1]
      || (t.match(/,\s*([A-Za-z]+(?: [A-Za-z]+)?)\s*[,-]?\s*(?:\+?91[\s-]?)?[6-9]\d{4}/) || [])[1] || '';
    let name = (rest.match(/\b(?:add|create|register|onboard|save|enter)\s+(?:a\s+)?(?:new\s+)?(?:supplier|vendor|party|dealer|contact)?\s*[:-]?\s*(?:called|named)?\s*([^,.;]+?)(?=\s*(?:,|;|\.|$|\bas (?:a |our )?(?:new )?(?:supplier|vendor)|\bin\b|\bat\b|\bfrom\b|\bcontact\b|\bphone\b|\bnumber\b|\bsupplies|\bsells|\bselling|\bdeals?\b|\bwho\b|\bthey\b|\bfor\b|\bgst))/i) || [])[1] || '';
    name = name.replace(/\b(supplier|vendor|party|dealer|contact|new|a)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!name) name = (rest.match(/(?:supplier|vendor)\s*[:-]?\s*([^,.;]+)/i) || [])[1]?.trim() || '';
    return { tool: 'add_supplier', args: { supplier: cap(name), person: cap(person.replace(/\b(phone|number|mobile)\b.*$/i, '').trim()), phone, email, city: cap(city), supplies: supplies.trim(), gstin, terms: (t.match(/\b(net ?\d+|cash on delivery|cod|\d+% advance|advance)\b/i) || [''])[0] } };
  }
  const qty = t.match(/(\d[\d,]*(?:\.\d+)?)\s*(kgs?|kilos?|kilograms?|tons?|tonnes?|mt|pcs|pieces?|nos|units?|sheets?|boxes?|spools?|kits?|sets?|litres?|ltrs?|bags?|lengths?)\b/i);
  if (VERB_RECV.test(t) && qty && !/\b(need|want|require|chahiye|kavali)\b/i.test(t)) {
    const rate = t.match(/(?:@|\bat\b|\brate\b|₹|\brs\.?|\binr)\s*₹?\s*(?:rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)\s*(?:\/|per|a|each)?\s*-?\s*(kg|kgs|kilo|pc|pcs|piece|sheet|unit|ton|nos)?/i);
    const sup = (t.match(/\bfrom\s+([A-Za-z][A-Za-z&.' ]*?)(?=\s*(?:@|\bat\b|,|\.|;|$|\brate\b|₹|\brs\b|\bfor\b|\btoday\b|\byesterday\b|\bjust\b|\bthis\b))/i) || t.match(/\b([A-Za-z]+)\s+(?:se|nunchi|nundi)\b/i) || [])[1] || '';
    const after = t.slice((qty.index || 0) + qty[0].length);
    const item = (after.match(/^\s*(?:of\s+)?(.+?)(?=\s*(?:\bfrom\b|@|\bat\b|,|\.|;|$|\brate\b|₹|\brs\b|\bse\b|\bnunchi\b|\baaya\b|\bvachindi\b|\breceived\b|\bcame\b|\barrived\b))/i) || [])[1] || '';
    return { tool: 'receive_stock', args: { item: item.trim(), qty: num(qty[1]), unit: unitNorm(qty[2]), supplier: sup.trim(), rate: rate ? num(rate[1]) : null, rateUnit: rate?.[2] ? unitNorm(rate[2]) : '' } };
  }
  const id = t.match(/\b(po|pb|inv)[\s-]?(\d{2,4})\b/i);
  if (id && /\b(paid|pay(ed)?|cleared|settled|received|done)\b/i.test(t)) {
    const kind = id[1].toLowerCase(); return { tool: 'update_record', args: { entity: kind === 'po' ? 'po' : kind === 'pb' ? 'bill' : 'invoice', ref: `${id[1].toUpperCase()}-${id[2]}`, field: 'status', value: 'paid' } };
  }
  const changes = parseChanges(t);
  if (changes.length && VERB_UPD.test(t)) {
    const ref = refBefore(t) || (t.match(/\b([A-Za-z][A-Za-z&.]*(?:\s+[A-Za-z][A-Za-z&.]*){0,3})(?:'s|’s|s')\s/i) || t.match(/\b(?:of|for)\s+([A-Za-z][A-Za-z&. ]+?)\s+(?:to|as|is|=)\b/i) || [])[1] || '';
    return { tool: 'update_record', args: { entity: 'supplier', ref: ref.replace(/^(change|update|set|edit|correct|the|my)\s+/i, '').trim(), field: changes[0].field, value: changes[0].value, changes } };
  }
  if (VERB_VIEW.test(t) || /\bpending\b|\boutstanding\b/i.test(t)) {
    if (/\b(pending|outstanding|due|dues|owe|balance)\b/i.test(t) && !/\bbills?\b|\bpayables?\b/i.test(t)) {
      const name = (t.match(/\b(?:from|with|for|of|by)\s+([A-Za-z][A-Za-z&.' ]+?)(?=\s*[?.!,]|$)/i) || t.match(/\b([A-Za-z][A-Za-z&.' ]+?)\s+(?:pending|outstanding|dues|balance)\b/i) || [])[1] || '';
      return { tool: 'query', args: { entity: 'customer_pending', name: name.replace(/^(is|are|what|whats|what's|show|me|the)\s+/gi, '').trim() } };
    }
    if (/\b(bills?|payables?)\b/i.test(t)) return { tool: 'query', args: { entity: 'bills_due' } };
    if (/\b(po|pos|purchase orders?)\b/i.test(t)) return { tool: 'query', args: { entity: 'pos' } };
    if (/\b(low|stock)\b/i.test(t)) return { tool: 'query', args: { entity: 'low_stock' } };
    if (/\b(supplier|vendor|dealer)s?\b/i.test(t)) {
      const cat = CATS.find(([re]) => re.test(low)); const city = AREAS.find((a) => low.includes(a)) || '';
      return { tool: 'query', args: { entity: 'suppliers', category: cat ? (low.match(cat[0]) || [''])[0] : '', city: city || (/\bhyd\b/.test(low) ? 'hyderabad' : '') } };
    }
  }
  return null;
}

/** Merge an LLM tool call with the rules parse: the LLM decides the tool; rules fill blanks the LLM left empty (phone, GSTIN…). */
export function merge(llm: Intent | null, rules: Intent | null): { intent: Intent | null; via: Via } {
  if (!llm) return { intent: rules, via: 'rules' };
  if (rules?.tool === 'add_person') return { intent: rules, via: 'rules' }; // the AI has no people tool yet – never let it turn a new hire into a supplier
  if (rules && rules.tool === llm.tool) {
    const a = { ...(llm.args as Record<string, unknown>) }; const r = rules.args as Record<string, unknown>;
    if (llm.tool === 'update_record') { const lc = (a.changes as unknown[] | undefined)?.length || (a.field ? 1 : 0); const rc = (r.changes as unknown[] | undefined)?.length || 0; if (rc > lc) a.changes = r.changes;  const lr = String(a.ref || '').toLowerCase(), rr = String(r.ref || '').toLowerCase().trim(); if (rr && lr !== rr && lr.includes(rr)) a.ref = r.ref; /* keep what the owner typed so an ambiguous name still asks */ }
    for (const k of Object.keys(r)) if (a[k] === undefined || a[k] === null || a[k] === '' || a[k] === 0) a[k] = r[k];
    return { intent: { tool: llm.tool, args: a } as Intent, via: 'llm' };
  }
  return { intent: llm, via: 'llm' };
}
export const catalog = (s: DemoState) => [
  'Suppliers: ' + s.contacts.map((c) => `${c.supplier} (${c.person}, ${c.city}; ${c.supplies})`).join('; '),
  'Customers: ' + s.customers.map((c) => c.name).join(', '),
  'Items: ' + s.skus.map((k) => `${k.sku} ${k.name} [${k.unit}]`).join('; '),
  'POs: ' + s.pos.map((p) => p.id).join(', ') + '. Bills: ' + s.bills.map((b) => `${b.id} (${b.ref})`).join(', ') + '. Invoices: ' + s.invoices.map((i) => i.id).join(', '),
].join('\n');

/* ---------- 3. resolve + build results ---------- */
const findContact = (s: DemoState, ref: string) => {
  if (!ref) return null;
  const scored = s.contacts.map((c) => ({ c, sc: Math.max(nameScore(ref, c.supplier), nameScore(ref, c.person) * 0.95, nameScore(ref, c.supplier + ' ' + c.person) * 0.9) })).sort((a, b) => b.sc - a.sc);
  return scored[0] && scored[0].sc >= 0.5 ? scored[0].c : null;
};
const contactMatches = (s: DemoState, ref: string) => s.contacts.map((c) => ({ c, sc: Math.max(nameScore(ref, c.supplier), nameScore(ref, c.person) * 0.95) })).filter((x) => x.sc >= 0.5).sort((a, b) => b.sc - a.sc);
const exactName = (ref: string, name: string) => norm(name).includes(norm(ref)) || toks(ref).every((w) => toks(name).includes(w));
const findCustomer = (s: DemoState, ref: string) => { const sc = s.customers.map((c) => ({ c, sc: Math.max(nameScore(ref, c.name), nameScore(ref, c.contact) * 0.9) })).sort((a, b) => b.sc - a.sc); return sc[0] && sc[0].sc >= 0.5 ? sc[0].c : null; };
const findSku = (s: DemoState, item: string) => {
  const t = norm(item);
  const mm = t.match(/(\d+(?:\.\d+)?)\s?mm/);
  const scored = s.skus.map((k) => {
    const name = norm(k.name + ' ' + k.sku + ' ' + k.spec); let sc = nameScore(item.replace(/\d+(\.\d+)?\s?mm/gi, ''), name);
    if (mm) { const kmm = norm(k.name).match(/(\d+(?:\.\d+)?)\s?mm/); if (kmm) sc += kmm[1] === mm[1] ? 0.6 : -0.6; }
    if (/\bms\b|mild steel/.test(t) && /\bms\b/.test(name)) sc += 0.3; if (/\bsheet/.test(t) && /sheet/.test(name)) sc += 0.2; if (/\bplate/.test(t) && /plate/.test(name)) sc += 0.3;
    if (/6204/.test(t) && k.sku === 'CP-6204') sc += 1; if (/bearing/.test(t) && /bearing/.test(name)) sc += 0.4;
    return { k, sc };
  }).sort((a, b) => b.sc - a.sc);
  return scored[0] && scored[0].sc >= 0.6 ? scored[0].k : null;
};
const head = (via: Via) => via;

export function build(intent: Intent, s: DemoState, via: Via, text = ''): Result {
  if (intent.tool === 'add_person') return buildPerson(intent.args, s, via);
  if (intent.tool === 'add_supplier') {
    const a = intent.args;
    const name = cap(String(a.supplier || '').trim());
    const supplies = String(a.supplies || '').trim();
    const contact: SupplierContact & { gstin?: string } = {
      id: `CT-${String(Math.max(0, ...s.contacts.map((c) => Number(c.id.replace(/\D/g, '')) || 0)) + 1).padStart(2, '0')}`,
      supplierId: '', supplier: name, person: cap(String(a.person || '').trim()), role: 'Sales', city: cap(String(a.city || '').trim()), supplies: supplies ? supplies.charAt(0).toUpperCase() + supplies.slice(1) : '',
      skus: [], channel: 'WhatsApp' as Channel, language: 'English, Telugu', phone: a.phone ? maskPhone(String(a.phone)) : '', email: String(a.email || ''), leadDays: 3, onTime: 0, rejection: 0, lastPrice: 0, lastPriceNote: 'new – no PO yet', terms: String(a.terms || '').replace(/^cod$/i, 'Cash on delivery') || 'Net 30', rating: 0,
      gstin: String(a.gstin || '').toUpperCase(),
    };
    const t = norm(supplies); contact.skus = s.skus.filter((k) => (/\bms\b|steel|sheet/.test(t) && /^RM-MS/.test(k.sku)) || (/bearing/.test(t) && k.sku === 'CP-6204') || (/gasket/.test(t) && k.sku === 'CP-GSK65') || (/pipe/.test(t) && k.sku === 'RM-PIPE40')).map((k) => k.sku);
    const dup = name ? s.contacts.find((c) => nameScore(name, c.supplier) >= 0.99 && toks(name).length === toks(c.supplier).length) : undefined;
    const missing = missingFields(contact);
    return { kind: 'add_supplier', status: 'pending', contact, dupOf: dup?.id, via,
      headline: !name ? 'Tell me the supplier’s name and I’ll set up the record.' : dup ? `${dup.supplier} is already in your contacts – saving will add a second contact for them.` : missing.length ? `Ready to add ${name}. ${missing.length} detail${missing.length > 1 ? 's are' : ' is'} missing – fill ${missing.length > 1 ? 'them' : 'it'} in below or save now and add later.` : `Ready to add ${name} – everything needed for a purchase order is here.` };
  }
  if (intent.tool === 'receive_stock') {
    const a = intent.args;
    const k = findSku(s, a.item || '');
    const c = findContact(s, a.supplier || '');
    if (!k) return { kind: 'notfound', via, headline: `I couldn’t match “${a.item || 'that item'}” to an item in Inventory.`, detail: 'Try the item code or name, e.g. “RM-MS2” or “MS sheet 2 mm”.', actions: [{ label: 'Open Inventory', kind: 'open:/inventory', primary: true }] };
    let addQty = a.qty, conv: string | undefined, perStockUnit: number | undefined;
    const unit = unitNorm(a.unit || k.unit);
    if (unit !== unitNorm(k.unit) && k.unit === 'sheets' && /^RM-MS2$/.test(k.sku) && (unit === 'kg' || unit === 'ton')) {
      const kg = unit === 'ton' ? a.qty * 1000 : a.qty; addQty = Math.max(1, Math.round(kg / sheetKg)); conv = `${kg.toLocaleString('en-IN')} kg ≈ ${addQty} sheets (2500 × 1250 × 2 mm ≈ ${sheetKg.toFixed(0)} kg each)`;
    } else if (unit !== unitNorm(k.unit) && !(unit === 'pcs' && /pcs|sets|kits/.test(k.unit))) { conv = `Recorded as ${a.qty} ${k.unit} – check the unit (you said ${unit}).`; }
    const rate = a.rate ? Number(a.rate) : undefined; const rUnit = unitNorm(a.rateUnit || unit);
    if (rate) perStockUnit = rUnit === 'kg' && k.unit === 'sheets' ? rate * sheetKg : rUnit === 'ton' && k.unit === 'sheets' ? (rate / 1000) * sheetKg : rate;
    const amount = rate ? (rUnit === unit ? rate * a.qty : (perStockUnit || rate) * addQty) : undefined;
    let priceNote: string | undefined, priceTone: 'red' | 'green' | 'amber' | undefined;
    if (perStockUnit) {
      const gap = (perStockUnit - k.unitCost) / k.unitCost * 100;
      const alts = s.contacts.filter((x) => x.skus.includes(k.sku) && x.lastPrice && x.onTime >= 85 && x.id !== c?.id).sort((x, y) => x.lastPrice - y.lastPrice);
      priceNote = `${inr(perStockUnit)} per ${k.unit.replace(/s$/, '')} is ${Math.abs(gap).toFixed(1)}% ${gap >= 0 ? 'above' : 'below'} your standard cost (${inr(k.unitCost)})${gap > 1 && alts[0] ? `. ${alts[0].supplier} last quoted ${inr(alts[0].lastPrice)}.` : '.'}`;
      priceTone = gap > 1.5 ? 'red' : gap < -0.5 ? 'green' : 'amber';
    }
    const supplier = c?.supplier || cap(a.supplier || '') || 'Supplier not given';
    return { kind: 'receive', status: 'pending', via, sku: k.sku, skuName: k.name, qty: a.qty, unit, addQty, stockUnit: k.unit, conv, supplier, contactId: c?.id, rate, rateUnit: rUnit, perStockUnit, amount, before: k.onHand, after: k.onHand + addQty, priceNote, priceTone,
      headline: `${k.name}: stock goes from ${k.onHand} to ${k.onHand + addQty} ${k.unit}${amount ? ` · ${inrL(amount)} purchase logged against ${supplier}` : ''}.${!c && a.supplier ? ` “${a.supplier}” isn’t in your supplier contacts yet.` : ''}` };
  }
  if (intent.tool === 'update_record') {
    const a = intent.args; const field = String(a.field || '').toLowerCase(); const value = String(a.value || '').trim(); const ent = String(a.entity || '').toLowerCase(); const ref = String(a.ref || '');
    const idm = ref.match(/\b(po|pb|inv)[\s-]?(\d{2,4})\b/i);
    if (idm || /po|bill|invoice/.test(ent)) {
      const kind = (idm?.[1] || (ent === 'bill' ? 'pb' : ent === 'invoice' ? 'inv' : 'po')).toUpperCase(); const digits = (idm?.[2] || ref.replace(/\D/g, '')); const id = `${kind}-${digits.padStart(4, '0')}`;
      if (kind === 'INV') {
        const inv = s.invoices.find((i) => i.id === id);
        if (!inv) return notFoundId(s, ref || id, via, 'INV');
        const due = outstanding(inv);
        if (!due) return { kind: 'notfound', via, headline: `${inv.id} is already fully paid.`, detail: '', actions: [{ label: `Open ${inv.id}`, kind: `open:/finance/${inv.id}` }] };
        return { kind: 'update', status: 'pending', via, target: { type: 'invoice', id: inv.id, label: `${inv.id} · ${customerById(s, inv.customerId).name}` }, patch: { paid: inv.total, status: 'Paid' },
          diffs: [{ label: 'Status', before: inv.status, after: 'Paid' }, { label: 'Received', before: inr(inv.paid), after: inr(inv.total) }, { label: 'Outstanding', before: inr(due), after: '₹0' }],
          headline: `Mark ${inv.id} paid: ${inrL(due)} comes off ${customerById(s, inv.customerId).name}’s outstanding.` };
      }
      const po = kind === 'PO' ? s.pos.find((p) => p.id === id) : undefined;
      const bill = kind === 'PB' ? s.bills.find((b) => b.id === id) : po ? s.bills.find((b) => b.ref.includes(po.id)) : undefined;
      if (kind === 'PO' && !po) return notFoundId(s, ref || id, via, 'PO');
      if (kind === 'PB' && !bill) return notFoundId(s, ref || id, via, 'PB');
      if (bill) {
        if (bill.status === 'Paid') return { kind: 'notfound', via, headline: `${po ? po.id + ' (bill ' + bill.id + ')' : bill.id} is already paid.`, detail: '', actions: [{ label: 'Open payables', kind: 'open:/finance?tab=Payables' }] };
        const sup = supplierById(bill.supplierId)?.name || 'supplier';
        return { kind: 'update', status: 'pending', via, target: { type: 'bill', id: bill.id, label: `${po ? po.id + ' → bill ' : ''}${bill.id} · ${sup}` }, patch: { paid: bill.amount, status: 'Paid' },
          diffs: [{ label: 'Bill status', before: bill.status, after: 'Paid' }, { label: 'Paid', before: inr(bill.paid), after: inr(bill.amount) }, { label: 'Balance due', before: inr(bill.amount - bill.paid), after: '₹0' }, ...(bill.msme45 !== '—' ? [{ label: 'MSME 45-day limit', before: bill.msme45, after: 'Cleared' }] : [])],
          headline: `Mark ${po ? po.id : bill.id} paid: ${inrL(bill.amount - bill.paid)} to ${sup} moves to Paid in Payables.` };
      }
      const p = po!;
      return { kind: 'update', status: 'pending', via, target: { type: 'po', id: p.id, label: `${p.id} · ${supplierById(p.supplierId)?.name}` }, patch: { status: 'Paid' },
        diffs: [{ label: 'PO status', before: p.status, after: 'Paid' }, { label: 'Value', before: inr(p.value), after: inr(p.value) }],
        headline: `${p.id} has no supplier bill yet – I’ll mark the PO itself as paid (${inrL(p.value)}).` };
    }
    const ms = contactMatches(s, ref);
    if (!ms.length) return { kind: 'notfound', via, headline: ref ? `I couldn’t find a supplier called “${ref}”.` : 'Which supplier should I update?', detail: 'Say the supplier or contact name, e.g. “Change Balaji’s phone to 98480 12345”.', actions: [{ label: 'Open Supplier contacts', kind: 'open:/suppliers', primary: true }] };
    const tied = ms.filter((x) => x.sc >= ms[0].sc - 0.05).slice(0, 3);
    if (tied.length > 1 && tied.filter((x) => exactName(ref, x.c.supplier) || exactName(ref, x.c.person)).length !== 1) {
      const swap = (name: string) => (text && ref && new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text) ? text.replace(new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), name) : `Update ${name}: ${field} to ${value}`);
      return { kind: 'notfound', via, headline: `Did you mean ${tied.map((x) => x.c.supplier).join(' or ')}?`, detail: `“${ref}” matches more than one supplier. Pick one and I’ll prepare the change.`, actions: tied.map((x, k) => ({ label: x.c.supplier, kind: `ask:${swap(x.c.supplier)}`, primary: k === 0 })) };
    }
    const c = (tied.length > 1 ? tied.find((x) => exactName(ref, x.c.supplier) || exactName(ref, x.c.person))?.c : undefined) || ms[0].c;
    const raw = (a.changes && a.changes.length ? a.changes : [{ field, value }]).map((x) => ({ field: String(x.field || ''), value: String(x.value ?? '').trim() }));
    const map: Record<string, keyof SupplierContact | 'gstin'> = { phone: 'phone', mobile: 'phone', email: 'email', city: 'city', area: 'city', location: 'city', locality: 'city', address: 'city', terms: 'terms', person: 'person', gstin: 'gstin', leaddays: 'leadDays', leadtime: 'leadDays', supplies: 'supplies' };
    const LABEL: Record<string, string> = { phone: 'Phone', email: 'Email', city: 'City / area', terms: 'Payment terms', person: 'Contact person', gstin: 'GSTIN', leadDays: 'Lead time (days)', supplies: 'Supplies' };
    const patch: Record<string, string | number> = {}; const diffs: Diff[] = []; const problems: string[] = [];
    for (const ch of raw) {
      const key = map[ch.field.toLowerCase().replace(/[\s_-]/g, '')] || (fieldKey(ch.field) as keyof SupplierContact | 'gstin' | '');
      if (!key || !ch.value || patch[key] !== undefined) continue;
      let after: string | number = ch.value;
      if (key === 'phone') { if (ch.value.replace(/\D/g, '').length < 10) { problems.push(`“${maskPhone(ch.value)}” isn’t a 10-digit mobile`); continue; } after = maskPhone(ch.value); }
      if (key === 'gstin') { if (!validGstin(ch.value)) { problems.push(`“${ch.value}” isn’t a valid GSTIN`); continue; } after = ch.value.toUpperCase(); }
      if (key === 'leadDays') { const n = Number(ch.value.replace(/[^\d]/g, '')); if (!n) { problems.push('lead time needs a number of days'); continue; } after = n; }
      if (key === 'city' || key === 'person') after = cap(ch.value);
      const before = String((c as Record<string, unknown>)[key] ?? '') || '—';
      patch[key] = after;
      diffs.push({ label: LABEL[key] || key, before: key === 'phone' ? maskPhone(before) : key === 'leadDays' ? `${before} days` : before, after: key === 'leadDays' ? `${after} days` : String(after) });
    }
    if (!diffs.length) return { kind: 'notfound', via, headline: problems.length ? `I couldn’t prepare that change: ${problems.join('; ')}.` : `What should change for ${c.supplier}?`, detail: 'For example: “Change Deccan Castings area to Nampally and lead days to 6”.', actions: [{ label: `Open Supplier contacts`, kind: 'open:/suppliers' }] };
    const fuzzy = ref && !exactName(ref, c.supplier) && !exactName(ref, c.person) ? ` (matched “${ref}”)` : '';
    const what = diffs.map((d) => d.label.replace(' (days)', '').toLowerCase());
    return { kind: 'update', status: 'pending', via, target: { type: 'contact', id: c.id, label: `${c.supplier} · ${c.person}` }, patch, diffs,
      headline: `Update ${c.supplier}${fuzzy}: ${what.length > 1 ? what.slice(0, -1).join(', ') + ' and ' + what.slice(-1) : what[0]}. The Sourcing agent uses the new details from the next enquiry.${problems.length ? ` Skipped: ${problems.join('; ')}.` : ''}` };
  }
  if (intent.tool === 'query') return query(intent.args, s, via);
  return insight(String(intent.args.kind || 'reliable_supplier'), s, via);
}
export const missingFields = (c: SupplierContact & { gstin?: string }) => [!c.supplier && 'Supplier name', !c.person && 'Contact person', !c.phone && !c.email && 'Phone or email', !c.gstin && 'GSTIN', !c.city && 'City / area', !c.supplies && 'What they supply'].filter(Boolean) as string[];
function notFoundId(s: DemoState, ref: string, via: Via, kind: 'PO' | 'PB' | 'INV'): Result {
  const open = kind === 'INV' ? s.invoices.filter((i) => outstanding(i) > 0).map((i) => i.id) : kind === 'PB' ? s.bills.filter((b) => b.status !== 'Paid').map((b) => b.id) : s.pos.filter((p) => { const b = s.bills.find((x) => x.ref.includes(p.id)); return b ? b.status !== 'Paid' : p.status !== 'Paid'; }).map((p) => p.id);
  const d = ref.replace(/\D/g, '');
  const near = [...open].sort((a, b) => lev(a.replace(/\D/g, ''), d.padStart(4, '0')) - lev(b.replace(/\D/g, ''), d.padStart(4, '0'))).slice(0, 3);
  return { kind: 'notfound', via, headline: `There’s no ${ref.toUpperCase()} in your records.`, detail: near.length ? `Did you mean ${near.join(', ')}? These are still unpaid.` : 'Nothing is unpaid right now.', actions: near.map((x, i) => ({ label: `Mark ${x} paid`, kind: `ask:Mark ${x} paid`, primary: i === 0 })) };
}

function query(a: { entity: string; category?: string; city?: string; name?: string }, s: DemoState, via: Via): Result {
  const e = String(a.entity || '');
  if (e === 'customer_pending') {
    const c = a.name ? findCustomer(s, a.name) : null;
    if (!c) return { kind: 'notfound', via, headline: a.name ? `I couldn’t find a customer called “${a.name}”.` : 'Which customer?', detail: 'Try the name as it appears in Sales, e.g. “Sri Lakshmi Projects”.', actions: [{ label: 'Open customers', kind: 'open:/sales?tab=Customers', primary: true }] };
    const inv = s.invoices.filter((i) => i.customerId === c.id && outstanding(i) > 0);
    const ords = s.orders.filter((o) => o.customerId === c.id && o.open);
    const opps = s.opportunities.filter((o) => o.customerId === c.id && !/won|lost/i.test(o.stage));
    const due = inv.reduce((x, i) => x + outstanding(i), 0); const over = inv.filter((i) => overdueDays(i) > 0);
    const overAmt = over.reduce((x, i) => x + outstanding(i), 0);
    const worst = [...over].sort((x, y) => overdueDays(y) - overdueDays(x))[0];
    return { kind: 'record', via, title: c.name, subtitle: `${c.contact} · ${c.designation} · ${c.area}, ${c.city} · ${maskPhone(c.phone)}`,
      headline: due ? `${c.name} owes you ${inrL(due)}${overAmt ? `, ${inrL(overAmt)} of it overdue${worst ? ` (${worst.id}, ${overdueDays(worst)} days late)` : ''}` : ''}${ords.length ? ` · ${ords.length} open order${ords.length > 1 ? 's' : ''} in progress` : ''}.` : `Nothing is owed by ${c.name}${ords.length ? ` – ${ords.length} open order${ords.length > 1 ? 's' : ''} in progress` : ''}.`,
      kpis: [{ label: 'Outstanding', value: inrL(due), tone: due ? 'amber' : 'green' }, { label: 'Overdue', value: inrL(overAmt), sub: over.length ? `${over.length} invoice${over.length > 1 ? 's' : ''}` : 'none', tone: overAmt ? 'red' : 'green' }, { label: 'Open orders', value: String(ords.length), sub: ords.map((o) => o.id).join(', ') || '—', tone: 'blue' }, { label: 'Credit limit', value: inrL(c.creditLimit), sub: `${c.creditDays} days`, tone: due > c.creditLimit ? 'red' : undefined }],
      sections: [
        ...(inv.length ? [{ title: 'Unpaid invoices', cols: [{ key: 'id', label: 'Invoice' }, { key: 'due', label: 'Due' }, { key: 'late', label: 'Days late', align: 'r' as const, type: 'num' as const }, { key: 'amt', label: 'Outstanding', align: 'r' as const, type: 'money' as const }], rows: inv.map((i) => ({ id: i.id, due: i.due, late: overdueDays(i), amt: outstanding(i), _to: `/finance/${i.id}`, _tone: overdueDays(i) > 0 ? 'red' : '' })) }] : []),
        ...(ords.length ? [{ title: 'Open orders', cols: [{ key: 'id', label: 'Order' }, { key: 'p', label: 'Project' }, { key: 'prom', label: 'Promised' }, { key: 'st', label: 'Status', type: 'badge' as const }], rows: ords.map((o) => ({ id: o.id, p: o.project, prom: o.promised, st: o.risk === 'At risk' ? 'At risk' : o.status, _to: `/orders/${o.id}`, _tone: o.risk === 'At risk' ? 'red' : '' })) }] : []),
        ...(opps.length ? [{ title: 'Open opportunities', cols: [{ key: 'id', label: 'Deal' }, { key: 't', label: 'Title' }, { key: 'st', label: 'Stage', type: 'badge' as const }, { key: 'v', label: 'Value', align: 'r' as const, type: 'money' as const }], rows: opps.map((o) => ({ id: o.id, t: o.title, st: o.stage, v: o.value, _to: `/sales/opportunity/${o.id}` })) }] : []),
      ],
      actions: [...(worst ? [{ label: `Draft a reminder for ${worst.id}`, kind: `open:/finance/${worst.id}`, primary: true }] : []), { label: 'Open customer', kind: `open:/sales/customer/${c.id}`, primary: !worst }, ...(due ? [{ label: 'Collections sprint', kind: 'open:/collections' }] : [])] };
  }
  if (e === 'low_stock') return insight('low_stock', s, via);
  if (e === 'pos' || e === 'bills_due') {
    if (e === 'bills_due') {
      const b = s.bills.filter((x) => x.status !== 'Paid');
      const tot = b.reduce((x, y) => x + y.amount - y.paid, 0);
      return { kind: 'table', via, title: 'Bills to pay', headline: `${b.length} supplier bills unpaid, ${inrL(tot)} in total – ${b.filter((x) => x.status === 'Due this week').length} due this week.`,
        cols: [{ key: 'id', label: 'Bill' }, { key: 'sup', label: 'Supplier' }, { key: 'due', label: 'Due' }, { key: 'st', label: 'Status', type: 'badge' }, { key: 'amt', label: 'Balance', align: 'r', type: 'money' }],
        rows: b.map((x) => ({ id: x.id, sup: supplierById(x.supplierId)?.name || x.supplierId, due: x.due, st: x.status, amt: x.amount - x.paid, _to: '/finance?tab=Payables', _tone: x.status === 'Due this week' ? 'amber' : '' })),
        actions: [{ label: 'Open payables', kind: 'open:/finance?tab=Payables', primary: true }] };
    }
    const open = s.pos.filter((p) => p.status !== 'Received' && p.status !== 'Paid');
    return { kind: 'table', via, title: 'Open purchase orders', headline: `${open.length} purchase orders are open, worth ${inrL(open.reduce((x, p) => x + p.value, 0))}${open.filter((p) => !p.confirmed).length ? ` – ${open.filter((p) => !p.confirmed).length} not yet confirmed by the supplier` : ''}.`,
      cols: [{ key: 'id', label: 'PO' }, { key: 'sup', label: 'Supplier' }, { key: 'm', label: 'Material' }, { key: 'eta', label: 'ETA' }, { key: 'st', label: 'Status', type: 'badge' }, { key: 'v', label: 'Value', align: 'r', type: 'money' }],
      rows: s.pos.map((p) => ({ id: p.id, sup: supplierById(p.supplierId)?.name || p.supplierId, m: p.material, eta: p.eta, st: p.status, v: p.value, _to: '/procurement?tab=Purchase%20orders', _tone: !p.confirmed ? 'amber' : '' })),
      actions: [{ label: 'Open purchase orders', kind: 'open:/procurement?tab=Purchase%20orders', primary: true }] };
  }
  // suppliers
  const cat = String(a.category || '').toLowerCase(); const city = String(a.city || '').toLowerCase();
  const catHit = CATS.find(([re]) => re.test(cat));
  const words = catHit ? catHit[1] : cat ? [cat] : [];
  const rows = s.contacts.filter((c) => {
    const hay = ' ' + norm(c.supplies + ' ' + c.supplier) + ' ' + c.supplies.toLowerCase() + ' ';
    const okCat = !words.length || words.some((w) => hay.includes(w));
    const okCity = !city || (/hyderabad|secunderabad|hyd\b/.test(city) ? isHyd(c.city) || /hyderabad|secunderabad/i.test(c.city) || !/,/.test(c.city) && !/rajkot|pune|mumbai|chennai/i.test(c.city) : norm(c.city).includes(norm(city)));
    return okCat && okCity;
  });
  const label = `${catHit ? cap(cat === 'ms' ? 'MS' : cat) + ' ' : cat ? cap(cat) + ' ' : ''}suppliers${city ? ' in ' + cap(city) : ''}`;
  const best = [...rows].sort((x, y) => score(y) - score(x))[0];
  return { kind: 'table', via, title: cap(label), empty: `No ${label} in your contacts yet.`,
    headline: rows.length ? `${rows.length} ${label}${best ? ` – ${best.supplier} scores best (${best.onTime || '—'}% on time${best.lastPrice ? `, last ${inr(best.lastPrice)}` : ''}).` : '.'}` : `No ${label} in your contacts yet – add one by telling me their name and number.`,
    kpis: rows.length ? [{ label: 'Suppliers', value: String(rows.length) }, { label: 'Avg on-time', value: rows.filter((r) => r.onTime).length ? Math.round(rows.filter((r) => r.onTime).reduce((x, r) => x + r.onTime, 0) / rows.filter((r) => r.onTime).length) + '%' : '—' }, { label: 'Fastest', value: `${Math.min(...rows.map((r) => r.leadDays))} day${Math.min(...rows.map((r) => r.leadDays)) > 1 ? 's' : ''}`, sub: rows.find((r) => r.leadDays === Math.min(...rows.map((x) => x.leadDays)))?.supplier }] : undefined,
    cols: [{ key: 'sup', label: 'Supplier' }, { key: 'city', label: 'Area' }, { key: 'ph', label: 'Phone' }, { key: 'on', label: 'On-time', align: 'r', type: 'pct' }, { key: 'lead', label: 'Lead (days)', align: 'r', type: 'num' }, { key: 'price', label: 'Last price', align: 'r', type: 'money' }, { key: 'r', label: 'Rating', align: 'r', type: 'num' }],
    rows: rows.map((c) => ({ sup: c.supplier, _sub: c.supplies, city: c.city, ph: maskPhone(c.phone), on: c.onTime, lead: c.leadDays, price: c.lastPrice, r: c.rating, _to: '/suppliers', _tone: c.onTime && c.onTime < 85 ? 'red' : '' } as Row)),
    actions: [{ label: 'Open Supplier contacts', kind: 'open:/suppliers', primary: true }, ...(catHit && /steel|ms|sheet/.test(cat) ? [{ label: 'Get quotes for 500 kg MS sheet', kind: 'ask:I need 500 kg MS sheet 2mm by Friday' }] : []), { label: 'Most reliable supplier?', kind: 'ask:Who is my most reliable supplier this quarter?' }] };
}

const score = (c: SupplierContact) => c.onTime ? Math.round(0.5 * c.onTime + 0.3 * Math.max(0, 100 - c.rejection * 12) + 0.2 * (c.rating / 5) * 100) : 0;
function insight(kind: string, s: DemoState, via: Via): Result {
  if (kind === 'low_stock') {
    const low = s.skus.filter((k) => k.reorder > 0 && k.onHand - k.reserved < k.reorder).map((k) => ({ k, free: k.onHand - k.reserved, gap: k.reorder - (k.onHand - k.reserved) })).sort((a, b) => b.gap * b.k.unitCost - a.gap * a.k.unitCost);
    const top = low[0];
    return { kind: 'insight', via, title: 'Running low', chartTitle: 'Free stock vs reorder level', note: 'Free stock = on hand minus reserved for orders.',
      headline: top ? `${low.length} items are below their reorder level – ${top.k.name} is the most urgent (${top.free} free vs reorder ${top.k.reorder} ${top.k.unit}).` : 'Everything is above its reorder level.',
      bars: low.slice(0, 7).map(({ k, free }) => ({ label: k.name.split(' · ')[0].slice(0, 26), value: Math.max(0, free) / k.reorder * 100, display: `${Math.max(0, free)} / ${k.reorder} ${k.unit}`, tone: free <= 0 ? 'red' : free < k.reorder / 2 ? 'amber' : 'blue' })),
      cols: [{ key: 'i', label: 'Item' }, { key: 'f', label: 'Free', align: 'r', type: 'num' }, { key: 'r', label: 'Reorder at', align: 'r', type: 'num' }, { key: 'v', label: 'Value to restore', align: 'r', type: 'money' }],
      rows: low.map(({ k, free, gap }) => ({ i: k.name, f: free, r: k.reorder, v: gap * k.unitCost, _to: `/inventory/${k.sku}`, _tone: free <= 0 ? 'red' : '' })),
      suggestion: top ? `Get quotes for ${top.gap} ${top.k.unit} of ${top.k.name.split(' · ')[0]} before it holds up an order.` : 'No action needed today.',
      actions: top ? [{ label: `Get quotes for ${top.k.name.split(' · ')[0].slice(0, 22)}`, kind: `ask:I need ${top.gap} ${top.k.unit} ${top.k.name.split(' · ')[0]} by next week`, primary: true }, { label: 'Open Inventory', kind: 'open:/inventory' }] : [{ label: 'Open Inventory', kind: 'open:/inventory', primary: true }] };
  }
  if (kind === 'overpaying') {
    type R = { sku: string; item: string; cur: string; curP: number; alt: string; altP: number; altOn: number; gap: number; pct: number; lot: number; risky: boolean; src: string };
    const rows: R[] = [];
    for (const k of s.skus) {
      const cs = s.contacts.filter((c) => c.skus.includes(k.sku) && c.lastPrice);
      const mine = (s.purchases || []).find((p) => p.sku === k.sku && p.perUnit);
      const cur = mine ? { name: mine.supplier, price: mine.perUnit!, src: `your purchase on ${mine.date}` } : (() => { const c = cs.find((x) => /last PO|avg of last|PO-\d/.test(x.lastPriceNote)) || cs.find((x) => s.pos.some((p) => p.supplierId === x.supplierId)); return c ? { name: c.supplier, price: c.lastPrice, src: c.lastPriceNote } : null; })();
      if (!cur) continue;
      const alts = cs.filter((c) => c.supplier !== cur.name && c.lastPrice < cur.price).sort((a, b) => a.lastPrice - b.lastPrice);
      const safe = alts.find((c) => c.onTime >= 85 && c.rejection <= 1.5); const alt = safe || alts[0];
      if (!alt) continue;
      const gap = cur.price - alt.lastPrice; const lot = Math.max(k.reorder, 1);
      rows.push({ sku: k.sku, item: k.name.split(' · ')[0], cur: cur.name, curP: cur.price, alt: alt.supplier, altP: alt.lastPrice, altOn: alt.onTime, gap, pct: gap / cur.price * 100, lot: gap * lot, risky: !safe, src: cur.src });
    }
    rows.sort((a, b) => Number(a.risky) - Number(b.risky) || b.lot - a.lot);
    const top = rows.find((r) => !r.risky) || rows[0]; const total = rows.filter((r) => !r.risky).reduce((x, r) => x + r.lot, 0);
    return { kind: 'insight', via, title: 'Where you may be overpaying', chartTitle: 'Extra paid per reorder lot', note: 'Compares what you last paid with the cheapest supplier quote on record for the same item. Amber = cheaper but less reliable (under 85% on time or high rejection).',
      headline: top ? `${top.item}: you pay ${top.pct.toFixed(1)}% more than ${top.alt}${top.risky ? ' (but they’re less reliable)' : ''} – about ${inr(top.lot)} extra per reorder lot${total && rows.filter((r) => !r.risky).length > 1 ? `; ${inr(total)} across ${rows.filter((r) => !r.risky).length} items` : ''}.` : 'You’re already paying the best price on record for every item.',
      bars: rows.slice(0, 6).map((r) => ({ label: r.item.slice(0, 24), value: r.lot, display: inr(r.lot), tone: r.risky ? 'amber' : 'red' })),
      cols: [{ key: 'i', label: 'Item' }, { key: 'c', label: 'You pay' }, { key: 'a', label: 'Cheaper option' }, { key: 'g', label: 'Gap / unit', align: 'r', type: 'money' }, { key: 'p', label: 'Gap %', align: 'r', type: 'pct' }, { key: 'l', label: 'Per reorder lot', align: 'r', type: 'money' }],
      rows: rows.map((r) => ({ i: r.item, c: `${r.cur} · ${inr(r.curP)}`, _csub: r.src, a: `${r.alt} · ${inr(r.altP)}`, _asub: `${r.altOn}% on time${r.risky ? ' · riskier' : ''}`, g: r.gap, p: Math.round(r.pct * 10) / 10, l: r.lot, _to: `/inventory/${r.sku}`, _tone: r.risky ? 'amber' : '' } as Row)),
      suggestion: top ? `Ask ${top.alt} to quote your next ${top.item} lot${top.risky ? ' – and use their price to negotiate with ' + top.cur : ''}.` : 'Keep your current suppliers.',
      actions: top ? [{ label: `Get quotes for ${top.item.slice(0, 22)}`, kind: `ask:I need ${s.skus.find((k) => k.sku === top.sku)?.reorder || 100} ${s.skus.find((k) => k.sku === top.sku)?.unit || 'pcs'} ${top.item} by next week`, primary: true }, { label: 'Open Supplier contacts', kind: 'open:/suppliers' }] : [] };
  }
  const ranked = s.contacts.filter((c) => c.onTime).map((c) => ({ c, sc: score(c) })).sort((a, b) => b.sc - a.sc);
  const top = ranked[0]; const worst = ranked[ranked.length - 1];
  const peer = top && ranked.find((r) => r.c !== top.c && r.c.skus.some((k) => top.c.skus.includes(k)));
  return { kind: 'insight', via, title: 'Most reliable suppliers this quarter', chartTitle: 'Reliability score (0–100)', note: 'Score = 50% on-time delivery + 30% quality (rejections from debit notes) + 20% rating. From GRNs this quarter (demo data).',
    headline: top ? `${top.c.supplier} is your most reliable supplier: ${top.c.onTime}% on time, ${top.c.rejection}% rejection${peer ? ` – ahead of ${peer.c.supplier} for the same items` : ''}.` : 'No delivery history yet.',
    bars: ranked.slice(0, 8).map((r) => ({ label: r.c.supplier.slice(0, 24), value: r.sc, display: String(r.sc), tone: r.sc >= 88 ? 'green' : r.sc >= 80 ? 'blue' : 'amber' })),
    cols: [{ key: 's', label: 'Supplier' }, { key: 'on', label: 'On-time', align: 'r', type: 'pct' }, { key: 'rej', label: 'Rejection', align: 'r', type: 'pct' }, { key: 'lead', label: 'Lead (days)', align: 'r', type: 'num' }, { key: 'r', label: 'Rating', align: 'r', type: 'num' }, { key: 'sc', label: 'Score', align: 'r', type: 'num' }],
    rows: ranked.map((r) => ({ s: r.c.supplier, _sub: r.c.supplies, on: r.c.onTime, rej: r.c.rejection, lead: r.c.leadDays, r: r.c.rating, sc: r.sc, _to: '/suppliers', _tone: r.c.onTime < 85 || r.c.rejection > 2 ? 'red' : '' } as Row)),
    suggestion: top && worst ? `Make ${top.c.supplier} the first call for ${top.c.supplies.split(/[,–-]/)[0].trim().toLowerCase()}; ${worst.c.supplier} is the weakest (${worst.c.onTime}% on time, ${worst.c.rejection}% rejection) – ask for inspection photos before dispatch.` : '',
    actions: [{ label: 'Open Supplier contacts', kind: 'open:/suppliers', primary: true }, { label: 'Where am I overpaying?', kind: 'ask:Where am I overpaying?' }] };
}

/* ---------- 4. apply a confirmed change to the session data ---------- */
export function apply(d: DemoState, r: Result) {
  const today = todayISO;
  if (r.kind === 'add_person') {
    const p = r.person; const contract = /contract|temp|intern|consult|freelanc|part/i.test(p.type);
    d.employees.unshift({ id: p.id, name: p.name, role: p.role || 'Team member', team: p.team || 'General', manager: p.manager || '—', type: contract ? 'Contract' : 'Permanent', shift: p.shift, site: p.site,
      status: 'Present', checkIn: '—', checkOut: '—', leave: '—', pf: !contract, esi: false, joined: p.start || todayISO, pay: p.pay || undefined, employment: p.type });
    d.log = [{ at: hm(), text: `Added ${p.name} (${p.role || 'team member'}) to People & HR from chat`, who: 'Workspace AI' }, ...d.log].slice(0, 40);
    return `${p.name} added to People & HR`;
  }
  if (r.kind === 'add_supplier') { d.contacts.push({ ...r.contact }); d.log = [{ at: hm(), text: `Added supplier ${r.contact.supplier} from chat`, who: 'Workspace AI' }, ...d.log].slice(0, 40); return `${r.contact.supplier} added to Supplier contacts`; }
  if (r.kind === 'receive') {
    const k = d.skus.find((x) => x.sku === r.sku)!; k.onHand += r.addQty; k.lastMovement = today; k.agingDays = 0;
    k.batches = [{ batch: `B-${r.sku.replace(/^[A-Z]+-/, '')}-${today.slice(2, 4)}${today.slice(5, 7)}${String(k.batches.length + 1).padStart(2, '0')}`, ref: 'GRN from chat', supplier: r.supplier, qty: r.addQty, bin: '—', received: today }, ...k.batches];
    d.purchases = [{ id: `GRN-${String((d.purchases || []).length + 1).padStart(3, '0')}`, date: today, sku: r.sku, item: r.skuName, qty: r.qty, unit: r.unit, addQty: r.addQty, stockUnit: r.stockUnit, supplier: r.supplier, contactId: r.contactId, rate: r.rate, rateUnit: r.rateUnit, perUnit: r.perStockUnit, amount: r.amount }, ...(d.purchases || [])];
    if (r.contactId && r.perStockUnit) { const c = d.contacts.find((x) => x.id === r.contactId); if (c) { c.lastPrice = Math.round(r.perStockUnit); c.lastPriceNote = `${r.skuName.split(' ')[0]} ${r.skuName.split(' ')[1] || ''} · GRN ${today}`.trim(); if (!c.skus.includes(r.sku)) c.skus.push(r.sku); } }
    d.log = [{ at: hm(), text: `Received ${r.qty} ${r.unit} ${r.skuName} from ${r.supplier}${r.amount ? ` (${inr(r.amount)})` : ''}`, who: 'Workspace AI' }, ...d.log].slice(0, 40);
    return `Stock updated: ${r.skuName} is now ${r.after} ${r.stockUnit}`;
  }
  if (r.kind === 'update') {
    const t = r.target;
    if (t.type === 'contact') Object.assign(d.contacts.find((c) => c.id === t.id)!, r.patch);
    if (t.type === 'bill') Object.assign(d.bills.find((b) => b.id === t.id)!, r.patch);
    if (t.type === 'po') Object.assign(d.pos.find((p) => p.id === t.id)!, r.patch);
    if (t.type === 'invoice') { const i = d.invoices.find((x) => x.id === t.id)!; Object.assign(i, r.patch); i.history = [{ date: today, text: 'Marked paid from chat', amount: i.total }, ...i.history]; }
    d.log = [{ at: hm(), text: `Updated ${t.label}: ${r.diffs.map((x) => `${x.label} ${x.before} → ${x.after}`).join(', ')}`, who: 'Workspace AI' }, ...d.log].slice(0, 40);
    return `${t.label.split(' · ')[0]} updated`;
  }
  return '';
}
const hm = () => { const t = new Date(); return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; };

/* ---------- 5. people: add an employee / team member ---------- */
const PERSON_WORD = String.raw`employee|employe|emplyee|staff(?: member)?|team ?member|worker|joinee|joiner|new hire|recruit|co-?\s?founder|cofounder|founder|partner|intern`;
const NOT_PERSON = /\b(supplier|vendor|dealer|party|contact|customer|client|stock|item|kg|pcs|po|bill|invoice)s?\b/i;
const ADD_V = String.raw`add|ad|onboard|hire|hired|register|create|enroll|enrol|include`;
/** "add Saad Ansari as co-founder", "add new employee Ravi in sales", "hire Priya as accountant", "onboard a new staff member Kiran". */
export const isAddPerson = (raw: string) => {
  const first = raw.split('\n')[0];
  if (new RegExp(String.raw`\b(${ADD_V}|new)\b[^.?!\n]*\b(${PERSON_WORD})\b`, 'i').test(first) && !/\b(supplier|vendor|dealer)\b/i.test(first)) return true;
  const m = first.match(new RegExp(String.raw`\b(?:${ADD_V})\s+(?:mr\.?\s+|ms\.?\s+|mrs\.?\s+)?([a-z][a-z.']*(?:\s+[a-z][a-z.']*){0,3}?)\s+as\s+(?:(?:a|an|our|the|new)\s+)?([a-z][a-z -]*)`, 'i'));
  return !!m && !NOT_PERSON.test(m[2]) && !NOT_PERSON.test(m[1]);
};
const SKIP_V = /^(blank|none|nil|null|na|n\/a|-+|—|skip|no|nothing|not yet|tbd|tba|later|empty|nobody|no one|not applicable|leave (it )?blank|\?)$/i;
const addD = (n: number) => { const d = new Date(todayISO + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dateVal = (v: string) => /^(today|tdy|now|immediately|asap|right away)$/i.test(v) ? todayISO : /^(tomorrow|tmrw|tmr|tomorow)$/i.test(v) ? addD(1) : /^yesterday$/i.test(v) ? addD(-1) : /^next (week|monday)$/i.test(v) ? addD(7) : /^(1st|first) (of )?next month$/i.test(v) ? '2026-11-01' : /^(?:next |this |coming )?(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/i.test(v) ? (() => { const want = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(v.toLowerCase().replace(/^(next|this|coming) /, '').slice(0, 3)); const now = new Date(todayISO + 'T00:00:00').getDay(); return addD(((want - now + 7) % 7) || 7); })() : v;
/** Answer keys people type, typo tolerant ("compnesatink", "employeement type", "reporting"). */
const keyOf = (k0: string): string => {
  const k = k0.toLowerCase().replace(/[^a-z ]/g, ' ').trim(); const w = k.split(/\s+/);
  const has = (...p: string[]) => w.some((x) => p.some((y) => x.startsWith(y) || (x.length >= 5 && lev(x.slice(0, y.length + 1), y) <= 1)));
  if (/^name$|full name|employee name|person name/.test(k)) return 'name';
  if (has('report', 'manag', 'boss', 'superv', 'under')) return 'manager';
  if (has('compen', 'compn', 'salar', 'sallar', 'ctc', 'pay', 'wage', 'stipen', 'remun')) return 'pay';
  if (has('start', 'join', 'doj', 'date')) return 'start';
  if (has('type', 'employm', 'employe', 'emplo', 'full', 'part')) return 'type';
  if (has('team', 'dept', 'depart', 'divis', 'unit')) return 'team';
  if (has('role', 'design', 'posit', 'title', 'job')) return 'role';
  if (has('phone', 'mobile', 'whatsapp', 'number', 'cell')) return 'phone';
  if (has('mail', 'email')) return 'email';
  if (has('gst')) return 'gstin';
  if (has('city', 'area', 'locat', 'place', 'addres', 'town')) return 'city';
  if (has('contact', 'person', 'owner')) return 'person';
  if (has('suppl', 'items', 'product', 'materi', 'sells')) return 'supplies';
  if (has('terms', 'credit', 'payment')) return 'terms';
  if (has('compan', 'supplier', 'vendor', 'firm')) return 'supplier';
  return '';
};
/** Every "field – value" answer in a reply: one per line, or separated by ; or , – plus "no compensation" style negatives. */
export function parseAnswers(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const segs = raw.split(/\n|;|,(?=\s*[a-z][a-z ]{1,25}\s*(?:-|:|=|–|—)\s)/i).map((x) => x.trim()).filter(Boolean);
  for (const seg of segs) {
    const m = seg.match(/^[•*\-\d.)\s]*([a-z][a-z .\/']{1,30}?)\s*(?:-|:|=|–|—|\bis\b|\bwill be\b)\s*(.*)$/i);
    if (m) { const k = keyOf(m[1]); if (k && out[k] === undefined) { const v = m[2].trim().replace(/[.!]+$/, ''); out[k] = SKIP_V.test(v) ? '' : v; } continue; }
    const neg = seg.match(/^(?:no|without|nil|zero|not decided|no fixed)\s+([a-z ]{3,30})$/i);
    if (neg) { const k = keyOf(neg[1]); if (k && out[k] === undefined) out[k] = ''; }
  }
  return out;
}
/** A reply that answers a clarifying question rather than starting something new. */
export const looksLikeAnswers = (t: string) => { const n = Object.keys(parseAnswers(t)).length; return n >= 2 || (n === 1 && /\n/.test(t.trim())) || (n === 1 && t.trim().split(/\s+/).length <= 6); };

export function parsePerson(raw: string): PersonArgs {
  const first = raw.split('\n')[0].trim(); const a: PersonArgs = {};
  const nm = first.match(new RegExp(String.raw`\b(?:${ADD_V}|new)\s+(?:a\s+|an\s+|one\s+)?(?:new\s+)?(?:(?:${PERSON_WORD})\s+)?(?:called\s+|named\s+|name\s+|:\s*|-\s*)?(?:mr\.?\s+|ms\.?\s+|mrs\.?\s+)?([a-z][a-z.']*(?:\s+[a-z][a-z.']*){0,3}?)(?=\s+(?:as|in|to|for|into|joining|from|on|with|under|reporting|starting|who|at)\b|\s*[,.;:]|$)`, 'i'));
  let name = (nm?.[1] || '').replace(new RegExp(String.raw`\b(${PERSON_WORD}|new|one|a|an|the|member|person)\b`, 'gi'), ' ').replace(/\s+/g, ' ').trim();
  if (!name) name = (first.match(new RegExp(String.raw`\b(?:${PERSON_WORD})\s+(?:called\s+|named\s+)?([a-z][a-z.']*(?:\s+[a-z][a-z.']*)?)`, 'i'))?.[1] || '').replace(/\b(as|in|to|for)\b.*$/i, '').trim();
  a.name = cap(name);
  const role = first.match(/\bas\s+(?:(?:a|an|our|the|new)\s+)?([a-z][a-z\- ]*?)(?=\s+(?:in|for|from|on|with|under|reporting|joining|starting|at|and)\b|[,.;]|$)/i)?.[1];
  if (role) a.role = role.trim();
  else { const w = first.match(new RegExp(String.raw`\b(${PERSON_WORD})\b`, 'i'))?.[1]; if (w && /founder|partner|intern/i.test(w)) a.role = w; }
  const team = first.match(/\b(?:in|into|to|for|join(?:ing)?)\s+(?:the\s+|our\s+)?([a-z&]+(?:\s+[a-z&]+)?)\s*(?:team|dept|department)?\b/i)?.[1];
  if (team && !/^(today|tomorrow|monday|next|the|a|an)$/i.test(team)) a.team = team.trim();
  const st = first.match(/\b(?:from|starting|joining|joins|start(?:s|ing)? on)\s+(today|tomorrow|monday|next week|\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?|\d{1,2}\s+[a-z]{3,9})/i)?.[1]; if (st) a.start = st;
  const pay = first.match(/(?:₹|rs\.?|inr)\s*\d[\d,]*(?:\s*(?:k|lakh|l|lpa|per month|\/month|pm|p\.m\.))?|\d+(?:\.\d+)?\s*(?:lpa|lakh(?:s)? per annum|k per month|k\/month)/i)?.[0]; if (pay) a.pay = pay;
  if (/\b(contract|contractual|part[ -]?time|intern(ship)?|temporary|consultant)\b/i.test(first)) a.type = first.match(/\b(contract|contractual|part[ -]?time|intern(ship)?|temporary|consultant)\b/i)![1];
  const ans = parseAnswers(raw.split('\n').length > 1 ? raw.split('\n').slice(1).join('\n') : (/(-|:|=)/.test(first.replace(/co-?founder/gi, '')) && !nm ? first : ''));
  for (const k of ['name', 'role', 'team', 'type', 'start', 'manager', 'pay'] as const) if (ans[k] !== undefined) a[k] = ans[k];
  return a;
}
const typeLabel = (t: string) => { const x = t.toLowerCase(); return !x.trim() ? 'Full time' : /part/.test(x) ? 'Part time' : /intern/.test(x) ? 'Intern' : /contract|temp|consult|freelanc/.test(x) ? 'Contract' : /full|perm|regular|ft\b/.test(x) ? 'Full time' : cap(t.trim()); };
const teamFor = (s: DemoState, team: string, role: string) => {
  const teams = [...new Set(s.employees.map((e) => e.team))];
  if (team) { const hit = teams.map((t) => ({ t, sc: Math.max(nameScore(team, t), norm(t).startsWith(norm(team)) ? 1 : 0) })).sort((x, y) => y.sc - x.sc)[0]; return hit && hit.sc >= 0.5 ? hit.t : cap(team); }
  const r = role.toLowerCase();
  if (/founder|director|ceo|cto|coo|cfo|chief|head|partner|owner|president|gm\b|general manager/.test(r)) return teams.find((t) => /manage/i.test(t)) || 'Management';
  if (/sales|business dev|bd\b|marketing|account manager|key account/.test(r)) return teams.find((t) => /sales/i.test(t)) || 'Sales';
  if (/account|finance|admin|hr\b|human|payroll|clerk|receptionist|office/.test(r)) return teams.find((t) => /account|admin/i.test(t)) || 'Accounts & Admin';
  if (/quality|qc|inspector/.test(r)) return teams.find((t) => /quality/i.test(t)) || 'Quality';
  if (/store|purchase|procure|buyer/.test(r)) return teams.find((t) => /store|purchase/i.test(t)) || 'Stores & Purchase';
  if (/weld|fitter|assembl/.test(r)) return teams.find((t) => /weld/i.test(t)) || 'Production';
  return '';
};
const cleanRole = (r: string) => r.trim() ? cap(r.trim().replace(/\bco[\s-]?founder\b/i, 'Co-founder').replace(/\bcofounder\b/i, 'Co-founder')).replace(/\bCo-Founder\b/, 'Co-founder').replace(/\b(Ceo|Cto|Coo|Cfo|Hr|Qc|Gm|Md)\b/g, (m) => m.toUpperCase()) : '';
export const personMissing = (p: { name: string; role: string }) => [!p.name && 'Name', !p.role && 'Role'].filter(Boolean) as string[];
function buildPerson(a: PersonArgs, s: DemoState, via: Via): Result {
  const role = cleanRole(String(a.role || '')); const team = teamFor(s, String(a.team || ''), role);
  const shift = s.employees.find((e) => e.team === team)?.shift || 'General (09:30–18:30)';
  const mgr0 = String(a.manager || '').trim(); const mgrHit = mgr0 ? s.employees.map((e) => ({ e, sc: nameScore(mgr0, e.name) })).sort((x, y) => y.sc - x.sc)[0] : undefined;
  const person: NewPerson = {
    id: `EMP-${Math.max(1000, ...s.employees.map((e) => Number(e.id.replace(/\D/g, '')) || 0)) + 1}`,
    name: cap(String(a.name || '').trim()), role, team, type: typeLabel(String(a.type || '')), start: dateVal(String(a.start || 'today').trim()) || todayISO,
    manager: mgrHit && mgrHit.sc >= 0.5 ? mgrHit.e.name : cap(mgr0), pay: String(a.pay || '').trim(), shift, site: s.employees.find((e) => e.team === team)?.site || 'Jeedimetla – Office',
  };
  const missing = personMissing(person);
  const dup = person.name ? s.employees.find((e) => norm(e.name) === norm(person.name)) : undefined;
  return { kind: 'add_person', status: 'pending', person, missing, dupOf: dup?.id, via,
    headline: !person.name ? 'Who should I add? Type the name below – everything else is optional.' : dup ? `${dup.name} is already in People & HR (${dup.id}) – saving adds a second record.` : missing.length ? `Almost there – just need ${person.name}’s role. Fill it in below; the rest is optional.` : `Ready to add ${person.name} as ${person.role}${team ? ` in ${team}` : ''}, starting ${person.start === todayISO ? 'today' : person.start}.` };
}
/** Fold a reply ("Role - Co founder / Start date - today / reporting - blank") into the card that asked for it. */
export function mergeAnswers(r: Result, raw: string, s: DemoState): Result | null {
  const ans = parseAnswers(raw);
  if (r.kind === 'add_person') {
    if (!Object.keys(ans).some((k) => ['name', 'role', 'team', 'type', 'start', 'manager', 'pay'].includes(k))) return null;
    const p = r.person; const args: PersonArgs = { name: p.name, role: p.role, team: p.team, type: p.type, start: p.start, manager: p.manager, pay: p.pay };
    for (const k of Object.keys(args) as (keyof PersonArgs)[]) if (ans[k] !== undefined) args[k] = ans[k];
    if (ans.role !== undefined && ans.team === undefined) args.team = '';
    const out = buildPerson(args, s, r.via) as Extract<Result, { kind: 'add_person' }>; out.person.id = p.id; return out;
  }
  if (r.kind === 'add_supplier') {
    const c = { ...r.contact }; let hit = false;
    const phone = (raw.match(PHONE_RE) || [''])[0]; const email = (raw.match(EMAIL_RE) || [''])[0]; const gst = (raw.match(GSTIN_RE) || [''])[0];
    if (phone) { c.phone = maskPhone(phone); hit = true; } if (email) { c.email = email; hit = true; } if (gst) { c.gstin = gst.toUpperCase(); hit = true; }
    for (const [k, v] of Object.entries(ans)) {
      if (k === 'person') { c.person = cap(v); hit = true; } else if (k === 'city') { c.city = cap(v); hit = true; } else if (k === 'supplies') { c.supplies = v; hit = true; }
      else if (k === 'terms') { c.terms = v || c.terms; hit = true; } else if (k === 'supplier') { c.supplier = cap(v) || c.supplier; hit = true; }
      else if (k === 'gstin' && !gst) { c.gstin = v.toUpperCase(); hit = true; } else if (k === 'name' && !c.person) { c.person = cap(v); hit = true; }
    }
    if (!hit) return null;
    const miss = missingFields(c);
    return { ...r, contact: c, status: 'pending', headline: miss.length ? `Updated ${c.supplier || 'the supplier'} – ${miss.length} detail${miss.length > 1 ? 's' : ''} still missing (optional, you can save now).` : `Ready to add ${c.supplier} – everything needed for a purchase order is here.` };
  }
  return null;
}

export { head, isHyd };
