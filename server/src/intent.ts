// Data commands from the Home chat ("add a supplier", "received 200 kg…", "mark PO-0912 paid", "show steel suppliers", "where am I overpaying").
// The LLM only extracts a structured tool call; the browser resolves it against the session data, shows a confirm card and applies it.
import { llmJson } from './llm';

export type DataIntent = { tool: 'add_supplier' | 'receive_stock' | 'update_record' | 'query' | 'insight' | 'none'; args: Record<string, unknown> };
const TOOLS = ['add_supplier', 'receive_stock', 'update_record', 'query', 'insight', 'none'];

const SYSTEM = (catalog: string) => `You turn an Indian MSME owner's chat message into ONE structured tool call for their business app. Messages may be casual, misspelt, or mixed Hindi/Telugu-English (e.g. "aaya", "vachindi", "chahiye", "kavali", "bhai").
Return only JSON: {"tool": "...", "args": {...}}. Tools:
- add_supplier: register a new supplier/vendor. args: {"supplier": company name, "person": contact name or "", "phone": digits or "", "email": "", "city": area/city or "", "supplies": what they sell or "", "gstin": "", "terms": payment terms or ""}
- receive_stock: goods received / material came in / purchase made. args: {"item": item text, "qty": number, "unit": "kg|pcs|sheets|ton|…", "supplier": name or "", "rate": number or null, "rateUnit": unit the rate is per or ""}
- update_record: change an existing record. args: {"entity": "supplier|po|bill|invoice|customer", "ref": name or id as typed (e.g. "Balaji", "PO-302", "INV-1048"), "field": "phone|email|city|terms|person|gstin|leadDays|status", "value": new value (for "mark … paid" use field "status", value "paid"), "changes": [{"field","value"}, …] listing EVERY field the message changes (area/locality/location → city, lead days/lead time/delivery days → leadDays as a number, payment/credit terms → terms))}
- query: look up / list / show data. args: {"entity": "suppliers|customer_pending|low_stock|pos|bills_due", "category": material/category words or "", "city": "", "name": customer or supplier name or ""}
- insight: analysis. args: {"kind": "reliable_supplier|overpaying|low_stock"}
- none: anything else (greetings, maths/GST, dates, new purchase needs like "need a truck", sourcing requests, general questions).
Never invent values the message does not contain; use "" when unknown. Known records: ${catalog.slice(0, 2500)}`;

export async function dataIntent(text: string, catalog = ''): Promise<DataIntent | null> {
  const t = text.trim().slice(0, 500);
  if (!t) return null;
  const ai = await llmJson<DataIntent>(SYSTEM(catalog), t, { timeoutMs: 5000, maxTokens: 350 });
  if (!ai || !TOOLS.includes(String(ai.tool))) return null;
  return { tool: ai.tool, args: ai.args && typeof ai.args === 'object' ? ai.args : {} };
}

// Generic data answers: the model picks renderable blocks and fills them ONLY from the snapshot it is given.
const VIEW_SYSTEM = `Design ONE dashboard card answering a business owner's question from the JSON snapshot. Keep the reply SHORT. JSON only:
{"headline": one sentence answering with the key numbers, "title": 2-4 words,
"kpis":[{"label","value","format":"inr|num|pct|text","sub"}] (max 3),
"table":{"source":"<snapshot list key>","columns":[{"key":"<field>","label","format":"text|num|inr|pct|status"}],"sort":"<field>","order":"desc|asc","limit":N,"where":{"<field>":value}} (optional; rows are filled from the snapshot by the app – do NOT write rows),
"chart":{"type":"bar|line|donut","title","source":"<list key>","label":"<field>","value":"<field>","limit":N} (optional; title must describe exactly that data),
"callout": one-line next action, "followups": [2 short questions]}.
Use names, not codes. Honour "top N" via limit. Headline/kpi numbers must come from the snapshot (or simple sums/differences). Money = raw rupees, format "inr"; in text write ₹ and lakh (never M, K or "INR").`;
export async function dataView(question: string, snapshot: unknown): Promise<Record<string, unknown> | null> {
  const q = String(question || '').trim().slice(0, 400);
  if (!q) return null;
  const snap = JSON.stringify(snapshot ?? {}).slice(0, 9000);
  // Latency on the hosted model varies a lot call to call; two parallel requests and the first good reply keeps most answers under ~5 s.
  const one = () => llmJson<Record<string, unknown>>(VIEW_SYSTEM, `Question: ${q}\nData snapshot (today is 2026-10-28): ${snap}`, { timeoutMs: 8500, maxTokens: 550, attempts: 1 }).then((r) => (r && r.headline ? r : Promise.reject(new Error('empty'))));
  return Promise.any([one(), one()]).catch(() => null);
}
