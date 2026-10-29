// Mock OpenAI-compatible LLM (port 8797) for tests. Dispatches on the system prompt, answers with
// deliberately awkward formatting (```json fences, <think> blocks, prose around JSON) and fails the
// first chat call with a 500 so the client's retry path is exercised. Nothing here talks to the internet.
// Hooks: GET /mock/calls (count by kind), POST /mock/mode {invent:true} = enquiry contains a made-up number.
import express from 'express';
const app = express(); app.use(express.json({ limit: '2mb' }));
let calls: Record<string, number> = {}; let n = 0; let invent = false;
app.get('/v1/models', (_q, r) => r.json({ data: [{ id: 'mock/model-a' }, { id: 'mock/model-b' }] }));
app.get('/mock/calls', (_q, r) => r.json(calls));
app.post('/mock/mode', (q, r) => { invent = !!q.body.invent; r.json({ invent }); });
const num = (s: string) => Number(s.replace(/,/g, ''));
const U = '(kgs?|kilo|pcs|pieces|nos|litres?|liters?|ltrs?|trips?|days?|people|persons?|workers?|labou?rers?|machines?|tons?|tonnes?|sheets?|units)';
function request(user: string) {
  const m = user.match(new RegExp(`(\\d[\\d,]*)\\s*-?\\s*${U}\\b`, 'i'));
  const truck = /truck|tempo|vehicle|lorry/i.test(user);
  const qty = m ? num(m[1]) : truck ? 1 : null; const unit = m ? m[2].toLowerCase().replace(/s$/, '') : truck ? 'trip' : null;
  const loc = user.match(/from ([A-Z][a-z]+) to ([A-Z][a-z]+)/); const title = user.replace(/^(need|we need|i need|require)\s+/i, '').split(/[,.]/)[0].slice(0, 50);
  const day = user.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  const needBy = day ? ({ friday: '2026-10-30', monday: '2026-11-02', saturday: '2026-10-31' } as any)[day[1].toLowerCase()] || null : null;
  const sku = /ms sheet|mild steel sheet/i.test(user) ? 'MS-SHEET-2MM' : null;
  const clarify = !m && !truck && /\b(oil|sheet|bearing|steel)\b/i.test(user) ? 'How much do you need?' : null;
  const enquiry = `We would like a quotation for the following requirement: ${user.trim().replace(/\.$/, '')}. Please let us know if you can do this, your price and payment terms, and the earliest date you can deliver.${invent ? ' Minimum order 9999 units.' : ''}`;
  return { title: title.charAt(0).toUpperCase() + title.slice(1), sku, qty, unit, needBy, targetPrice: null, location: loc ? `${loc[1]} to ${loc[2]}` : null, clarify, enquiry };
}
function reply(user: string) {
  const t = user.toLowerCase();
  const no = /sorry|not possible|nahi ho payega|cannot|can't/.test(t);
  const price = t.match(/(?:₹|rs\.?\s*)(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:rs|rupees|\/-)/);
  const qty = t.match(new RegExp(`(\\d[\\d,]*)\\s*${U}\\b`));
  const lump = /lump ?sum|per trip|total|for the job|all inclusive/.test(t) && !/\/(kg|pc|litre|day)|per (kg|piece|litre|day|person)/.test(t);
  const per = t.match(/(?:\/|per\s+|a\s+)(kg|kilo|pc|piece|litre|ltr|day|person|trip|month)/);
  const freight = /freight extra/.test(t) ? null : /free delivery|freight included|incl(uding)? freight/.test(t) ? 0 : null;
  const terms = t.match(/(\d+)\s*days?\s*credit/) ? `${t.match(/(\d+)\s*days?\s*credit/)![1]} days credit` : /advance/.test(t) ? (t.match(/(\d+)\s*%\s*advance/) ? `${t.match(/(\d+)\s*%\s*advance/)![1]}% advance` : 'advance') : /cash on delivery|\bcod\b/.test(t) ? 'cash on delivery' : t.match(/net\s*(\d+)/) ? `Net ${t.match(/net\s*(\d+)/)![1]}` : null;
  const qs = (user.match(/[^.!?\n]*\?/g) || []).map((x) => x.trim()).filter((x) => x.length > 8 && !/^Q\d/.test(x));
  const partial = /only|partly|balance/.test(t);
  const date = /thursday/.test(t) ? '2026-10-29' : /tomorrow|kal/.test(t) ? '2026-10-29' : /friday/.test(t) ? '2026-10-30' : /monday/.test(t) ? '2026-11-02' : null;
  const p = price ? num(price[1] || price[2]) : null;
  return { canDo: no ? 'no' : partial ? 'partial' : p != null || /haan|yes|can do|ho jayega/.test(t) ? 'yes' : 'unclear', qty: qty ? num(qty[1]) : null, unit: qty ? qty[2].replace(/s$/, '') : null,
    price: p, priceUnit: lump ? null : per ? per[1].replace('kilo', 'kg').replace('piece', 'pc') : null, priceBasis: p == null ? null : lump ? 'lump_sum' : 'per_unit', freight, gst: /plus gst|\+ ?gst|gst extra/.test(t) ? 'extra' : /incl(uding)? gst|gst incl/.test(t) ? 'included' : null,
    deliveryDate: date, terms, validity: /valid (\w+ ?\w*)/.test(t) ? t.match(/valid (\w+ ?\w*)/)![0] : null, conditions: /freight extra/.test(t) ? ['freight extra'] : [], questions: qs,
    summary: no ? 'Cannot do it this time.' : `${partial ? 'Can do part' : 'Can do'}${p != null ? `, ₹${p}${lump ? ' lump sum' : per ? `/${per[1]}` : ''}` : ''}${terms ? `, ${terms}` : ''}${qs.length ? '; asks a question' : ''}.` };
}
function summary(user: string) {
  const f = JSON.parse(user); const rows = f.suppliers.map((s: any) => ({ letter: s.letter, cells: [s.name, s.replied ? (s.captured?.canDo || 'unclear') : 'no reply', s.captured?.price != null ? `₹${s.captured.price}${s.captured.priceBasis === 'lump_sum' ? ' lump sum' : s.captured.priceUnit ? `/${s.captured.priceUnit}` : ''}` : '', s.captured?.deliveryDate || '', s.captured?.terms || '', s.captured?.summary || ''] }));
  const best = f.suppliers.find((s: any) => s.rank === 1); const comparable = f.suppliers.every((s: any) => !s.comparison || s.comparison.comparable);
  return { headline: `${f.suppliers.filter((s: any) => s.replied).length} of ${f.suppliers.length} suppliers replied.`, columns: ['Supplier', 'Can do', 'Price', 'When', 'Terms', 'Notes'], rows,
    best: best ? { letter: best.letter, why: `${best.name} ranks first on price, timing and terms.` } : null, comparable, comparabilityNote: comparable ? '' : 'Some quotes use a different price basis.',
    negotiation: best?.suggestedCounter ? [`Ask ${best.name} for ₹${best.suggestedCounter}.`] : ['Ask for a better rate on a repeat order.'], nextActions: ['Approve a PO draft for the best option.', ...f.suppliers.filter((s: any) => s.captured?.questions?.length).map((s: any) => `Answer ${s.name}'s question.`)] };
}
app.post('/v1/chat/completions', (q, r) => {
  n++; const sys = String(q.body.messages?.[0]?.content || ''); const user = String(q.body.messages?.[1]?.content || '');
  const kind = /health check/.test(sys) ? 'health' : /Read the owner's requirement/.test(sys) ? 'request' : /supplier's reply/.test(sys) ? 'reply' : /Draft a short, polite reply/.test(sys) ? 'answer' : /purchase analyst/.test(sys) ? 'summary' : /Rewrite this supplier enquiry/.test(sys) ? 'shortfall' : 'other';
  calls[kind] = (calls[kind] || 0) + 1;
  if (n === 1) return r.status(500).json({ error: 'mock transient failure' });
  if (r.req.headers.authorization !== 'Bearer mock-key') return r.status(401).json({ error: 'bad key' });
  let out: any;
  if (kind === 'health') out = { ok: true };
  else if (kind === 'request') out = request(user);
  else if (kind === 'reply') out = reply(user.replace(/^Supplier reply:\s*/, ''));
  else if (kind === 'answer') out = { answer: `Thank you for asking. Delivery is to our address given below, and unloading will be arranged by our team; we will confirm anything else shortly. ${(user.match(/Our address: (.*)/) || [])[1] || ''}`.trim() };
  else if (kind === 'summary') out = summary(user);
  else if (kind === 'shortfall') { const m = sys.match(/exactly (\S+) (\S+)/); out = { enquiry: user.replace(/\d[\d,]*(\.\d+)?\s*(kg|pcs|sheets?|litres?)/i, `${m?.[1]} ${m?.[2]}`) }; }
  else out = {};
  const json = JSON.stringify(out, null, 1);
  const content = kind === 'reply' && calls.reply % 2 === 0 ? '```json\n' + json + '\n```' : kind === 'summary' ? `<think>compare the rows</think>\nHere is the result:\n${json}` : json;
  r.json({ id: `mock-${n}`, model: q.body.model, choices: [{ index: 0, message: { role: 'assistant', content } }] });
});
app.listen(8797, '127.0.0.1', () => console.log('mock LLM on 127.0.0.1:8797'));
