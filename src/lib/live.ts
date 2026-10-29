// Client for the real sourcing backend (server/). Only the Sourcing flow talks to it; every other module is demo data.
export type Channel = 'WhatsApp' | 'Email' | 'Call';
export type Quote = {
  available: boolean | null; canDo?: 'yes' | 'no' | 'partial' | 'unclear'; qty: number | null; unit: string | null; price: number | null; priceUnit: string | null; priceBasis?: 'per_unit' | 'lump_sum' | null;
  freight: number | null; gst?: 'included' | 'extra' | null; shipDate: string | null; terms: string | null; validity?: string | null; conditions?: string[]; questions?: string[]; summary?: string;
  notes: string; parser: 'llm' | 'rules'; confidence: number;
};
export type Out = {
  ref: string; letter: string; supplier: string; person: string; channel: Channel; mode: 'real' | 'simulated'; to: string; telLink: string;
  sent: { subject?: string; body: string; at: string; kind?: string }[]; timeline: { stage: string; at: string; note?: string }[]; replies: { at: string; text: string; via: string; simulated?: boolean }[];
  quote: Quote | null; score: number | null; tips: string[]; counterPrice: number | null; error?: string;
  compare?: { unitPrice: number | null; basis: string; total: number | null; comparable: boolean; note?: string };
  pending?: { questions: string[]; draft: string; drafter: 'llm' | 'rules'; at: string } | null;
  history: { lastPrice: number | null; lastPriceNote: string };
};
export type Summary = { headline: string; columns: string[]; rows: { letter: string; cells: string[] }[]; best: { letter: string; why: string } | null; comparable: boolean; comparabilityNote: string; negotiation: string[]; nextActions: string[]; parser: 'llm' | 'rules'; at: string; basedOn: number };
export type Stock = { sku: string; name: string; unit: string; onHand: number; reserved: number; free: number; needUnits: number; shortUnits: number; askQty: number; askUnit: string; freeInAskUnit: number };
export type Req = { title: string; sku: string | null; itemText: string; qty: number; unit: string; needBy: string | null; targetPrice?: number; location?: string | null; clarify?: string | null; enquiry: string; parser: 'llm' | 'rules' };
export type Ask = { title: string; qty: number; unit: string; enquiry: string };
export type Run = { id: string; createdAt: string; text: string; request: Req; status: 'needs-info' | 'in-stock' | 'outreach' | 'replies-in'; ask: Ask; stock: Stock | null; suppliers: Out[]; summary: Summary | null; po: null | { ref: string; supplier: string; qty: number; unit: string; price: number; freight: number; total: number; at: string; status: string }; note: string; top: string[] };
export type Turn = { role: 'user' | 'ai'; text: string };
export type Intent = { kind: 'greeting' | 'question' | 'vague' | 'sourcing'; reply: string; questions: { q: string; options: string[] }[]; parser: 'llm' | 'rules' };
export type Check = { intent?: Intent; request: Req; status: Run['status'] | 'chat' | 'clarify'; stock: Stock | null; ask: Ask; note: string; plan: { letter: string; supplier: string; person: string; channel: Channel; mode: 'real' | 'simulated'; to: string }[] };
export type Status = { modes: Record<'email' | 'whatsapp' | 'call' | 'llm', string>; publicUrl: string; emailLabel: string; sender: string | null; email?: { backend: 'bridge' | 'smtp' | null; ok: boolean | null; error: string; bridgeUrlSet: boolean }; llm?: { keySet: boolean; ok: boolean | null; model: string | null; host: string | null; error: string }; allowlist: { emails: string[]; phones: string[] }; identities: { letter: string; name: string; email: string; phone: string }[] };

// Connection state shared by every API call: a subtle "Reconnecting…" pill and a passcode prompt read it (see components/NetStatus.tsx).
export type Net = 'ok' | 'reconnecting' | 'locked';
let net: Net = 'ok'; const subs = new Set<(n: Net) => void>();
const setNet = (n: Net) => { if (n !== net) { net = n; subs.forEach((f) => f(n)); } };
export const netState = { get: () => net, sub: (f: (n: Net) => void) => { subs.add(f); return () => { subs.delete(f); }; } };
let unlock: Promise<void> | null = null; let resolveUnlock: (() => void) | null = null;
const waitUnlock = () => (unlock ||= new Promise<void>((r) => { resolveUnlock = r; }));
export async function login(passcode: string) {
  const r = await fetch('./login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ passcode, next: '/' }), credentials: 'same-origin' });
  if (!r.ok) throw new Error(r.status === 429 ? 'Too many attempts – try later' : 'Wrong passcode');
  setNet('ok'); resolveUnlock?.(); unlock = null; resolveUnlock = null;
}
export class Offline extends Error {}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DELAYS = [700, 1800, 3500]; // ~6 s of retries before giving up
// Safe to retry: reads and preview-only endpoints. Anything that creates or sends gets one try (a retry could send twice).
const idempotent = (path: string, body: unknown) => body === undefined || /^\/(check|assist|status|intent)$/.test(path) || /\/summary$/.test(path);

async function call<T>(path: string, body?: unknown): Promise<T> {
  const retry = idempotent(path, body);
  for (let i = 0; ; i++) {
    let r: Response;
    try {
      r = await fetch(`./api${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' });
    } catch {
      if (!retry || i >= DELAYS.length) { setNet('reconnecting'); throw new Offline("Can't reach the server right now – check your connection and try again."); }
      if (i >= 1) setNet('reconnecting'); await sleep(DELAYS[i]); continue; // first blip retries silently
    }
    if (r.status === 401) { setNet('locked'); await waitUnlock(); i = -1; continue; } // session expired: ask for the passcode, then carry on with the same request
    if ([502, 503, 504].includes(r.status) && retry && i < DELAYS.length) { setNet('reconnecting'); await sleep(DELAYS[i]); continue; }
    setNet('ok');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Server error ${r.status}`);
    return j as T;
  }
}
// While offline, quietly probe so the pill clears itself once the server is back.
setInterval(() => { if (net === 'reconnecting') fetch('./api/status', { credentials: 'same-origin' }).then((r) => setNet(r.status === 401 ? 'locked' : 'ok')).catch(() => {}); }, 2500);
export const live = {
  status: () => call<Status>('/status'),
  check: (text: string, skus?: unknown, history?: Turn[], context?: string) => call<Check>('/check', { text, skus, history, context }),
  intent: (text: string, catalog: unknown) => call<{ tool: string; args: Record<string, unknown> }>('/intent', { text, catalog }),
  view: (question: string, snapshot: unknown) => call<Record<string, unknown>>('/view', { question, snapshot }),
  assist: (text: string, context?: string, history?: Turn[]) => call<Intent>('/assist', { text, context, history }),
  start: (text: string, skus?: unknown, enquiry?: string) => call<Run>('/runs', { text, skus, enquiry }),
  answer: (ref: string, text: string, dismiss = false) => call<Run>(`/outs/${ref}/answer`, { text, dismiss }),
  summarize: (id: string) => call<Run>(`/runs/${id}/summary`, {}),
  run: (id: string) => call<Run>(`/runs/${id}`),
  runs: () => call<{ id: string; text: string; status: string; createdAt: string }[]>('/runs'),
  counter: (ref: string, price?: number, text?: string) => call<Run>(`/outs/${ref}/counter`, { price, text }),
  po: (ref: string) => call<Run>(`/outs/${ref}/po`, {}),
  note: (ref: string, text: string) => call<Run>(`/outs/${ref}/note`, { text }),
  aiCall: (ref: string) => call<Run>(`/outs/${ref}/call`, {}),
  reset: () => call<{ ok: boolean }>('/reset', {}),
  bridgeScript: async () => { const r = await fetch('./api/bridge-script', { credentials: 'same-origin' }); if (r.status === 401) { setNet('locked'); throw new Error('Locked – enter the passcode'); } if (!r.ok) throw new Error(`Server error ${r.status}`); return r.text(); },
  connect: (b: Record<string, string>) => call<{ result: Record<string, string>; modes: Status['modes'] }>('/connect', b),
};
// Chat routing: any purchase / sourcing requirement goes to the live agent (the scripted PHA-17 and cash demos keep their own flows).
export const LIVE_RE = /(ms sheet|steel|sheet|\bkg\b|kgs|bearing|6204|a-?17|housing|gasket|do we have|in stock\?)/i;
const SOURCING_VERB = /\b(need|needs|want|require|required|looking for|source|sourcing|buy|purchase|procure|hire|rent|get (me|us)|quote|quotation|rfq|supplier for|vendor for)\b/i;
export const isLiveQuery = (q: string) => !/kaveri|pha-?17|pump housing|₹\s*\d|\blakh|\bcrore|owe|dispatch plan|at risk|short of\b/i.test(q)
  && (LIVE_RE.test(q) && /(need|want|require|do we have|have we got|source|buy|order|get me)/i.test(q) || SOURCING_VERB.test(q) && /\d|\b(a|an|one|some)\b/i.test(q));
export const SAMPLE_REQUESTS = ['I need 500 kg MS sheet 2mm by Friday, do we have it?', '200 pcs 6204 bearings by Monday', 'Need 50 litres cutting oil, best price', 'Need a 10-ton truck from Hyderabad to Pune on Friday', 'AMC for our 2 CNC machines'];
export const landed = (o: Out) => o.compare?.total ?? 0;
export const priceText = (q: Quote, fallbackUnit = '') => (q.price == null ? '?' : `₹${q.price.toLocaleString('en-IN')}${q.priceBasis === 'lump_sum' ? ' lump sum' : q.priceUnit || fallbackUnit ? `/${q.priceUnit || fallbackUnit}` : ''}${q.gst === 'extra' ? ' + GST' : q.gst === 'included' ? ' incl. GST' : ''}`);
export const inrs = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const fmtDay = (d: string | null | undefined) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** +919985381938 -> "+91 99•••• 1938"; e-mail addresses pass through unchanged. */
export const maskTo = (to: string) => { const d = (to || '').replace(/[^\d+]/g, ''); return /^\+?\d{10,}$/.test(d) && !to.includes('@') ? `${d.slice(0, 3)} ${d.slice(3, 5)}•••• ${d.slice(-4)}` : to; };
