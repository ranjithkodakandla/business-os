// One shared first step for every owner message (Home chat and the Live sourcing Ask box):
// is this small talk, a question, a vague need, or a clear sourcing requirement?
import { llmJson } from './llm';

export type Intent = { kind: 'greeting' | 'question' | 'vague' | 'sourcing'; reply: string; questions: { q: string; options: string[] }[]; parser: 'llm' | 'rules' };

const APP = `You are the AI assistant inside "Business Workspace", an AI operations app for Indian MSME manufacturers. The demo company is Aarohan Industries (Hyderabad). You are chatting with the owner's side; the person typing is Ranjith – you may greet him by name.
Talk like a warm, natural, witty chat assistant (like ChatGPT): vary your wording, answer jokes, thanks and off-topic chat naturally, understand Hinglish/Telugu-English, and gently steer back to how you can help the business.
Modules: Sourcing (asks 5 suppliers by email, WhatsApp and AI phone call, compares quotes, recommends one; the owner approves every send), Sales & CRM, Orders, Procurement, Inventory, Operations, Job work, People & HR, Finance (cash, receivables, GST), Approvals inbox, Reports, Connected apps (Tally, Zoho, WhatsApp, Gmail).`;

const GREET = /^(hi+|hey+|hello+|hii+|yo|hola|namaste|namaskar|good (morning|afternoon|evening)|thanks?( you)?|ok(ay)?|cool|hey there|hi there|sup|wassup)[\s!.,?]*(hi+|hey+|there|team|bot|ai)?[\s!.,?]*$/i;
const ASKS_APP = /\b(what can you do|who are you|help|how (does|do) (this|it|you) work|what is this)\b/i;
const QUESTION = /\?|^\s*(what|what's|whats|how|when|who|why|which|where|is|are|can|could|should|do|does|calculate|tell|explain)\b/i;
const UNIT = /\b(kg|kgs|ton|tons|tonne|tonnes|pcs|nos|litres?|ltrs?|trips?|people|helpers|workers|labou?rs?|sheets|bags|metres?|meters|ft|feet|truck|tempo)\b/i;
const NEED = /\b(need|want|require|buy|source|get|order|hire|book|arrange|looking for)\b/i;

export const EXAMPLES = ['500 kg MS sheet 2mm by Friday', '10-ton truck Hyderabad to Pune on Friday', '6 helpers for loading tomorrow 8 am'];

const pick = (opts: string[], history: Turn[]) => { const last = [...history].reverse().find((h) => h.role === 'ai')?.text || ''; const ok = opts.filter((o) => o !== last); return ok[Math.floor(Math.random() * ok.length)] || opts[0]; };
function rules(text: string, history: Turn[] = []): Intent {
  const t = text.trim(); const words = t.split(/\s+/).filter(Boolean);
  const hint = `For example: “${EXAMPLES[0]}” or “${EXAMPLES[1]}”.`;
  if (!t || GREET.test(t)) return { kind: 'greeting', reply: pick([`Hi! What do you need sourced today? Tell me the item, quantity, date and place. ${hint}`, `Hello! Tell me what you need – item, quantity, date and place – and I'll ask suppliers. ${hint}`, `Hey! Good to see you. What can I find for you today? ${hint}`], history), questions: [], parser: 'rules' };
  if (ASKS_APP.test(t)) return { kind: 'question', reply: `I can find suppliers for anything your business needs: raw material, trucks, contract labour, job work, repairs, packaging and tools. I ask 5 suppliers on email, WhatsApp and an AI phone call, compare their quotes and tell you who to go with. Nothing is sent or ordered without your OK. ${hint}`, questions: [], parser: 'rules' };
  if (/\d/.test(t) && words.length >= 3 && !QUESTION.test(t)) return { kind: 'sourcing', reply: '', questions: [], parser: 'rules' };
  if (words.length <= 3 || !/[aeiou]/i.test(t)) return { kind: 'vague', reply: pick([`Happy to help. Tell me a bit more: how much, by when, and where? ${hint}`, `Sure – what exactly, how much, and by when? ${hint}`], history), questions: [{ q: 'How much?', options: [] }, { q: 'By when?', options: ['Today', 'Tomorrow', 'This week'] }], parser: 'rules' };
  return { kind: NEED.test(t) ? 'sourcing' : 'question', reply: NEED.test(t) ? '' : pick([`I couldn't reach the AI just now, so I can't answer that properly – try again in a moment. ${hint}`, `The AI is busy right now – please ask again in a few seconds. Meanwhile I can still draft a sourcing enquiry. ${hint}`], history), questions: [], parser: 'rules' };
}

/** Classify an owner message. Clear requirements (a number and 3+ words) skip the LLM so drafting stays fast. */
export type Turn = { role: 'user' | 'ai'; text: string };
const HOLIDAYS: [string, string][] = [['2026-11-06', 'Dhanteras'], ['2026-11-08', 'Diwali (Lakshmi Puja)'], ['2026-11-10', 'Govardhan Puja'], ['2026-11-11', 'Bhai Dooj'], ['2026-12-25', 'Christmas'], ['2027-01-01', "New Year's Day"], ['2027-01-14', 'Makar Sankranti / Pongal'], ['2027-01-26', 'Republic Day']];
const festivals = () => { const today = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()) + 'T00:00:00Z');
  return HOLIDAYS.map(([d, n]) => { const dt = new Date(d + 'T00:00:00Z'); const days = Math.round((+dt - +today) / 864e5); return days < 0 ? '' : `${n}: ${dt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} (${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`})`; }).filter(Boolean).join('; '); };
const nowIst = () => new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date()) + ' IST';

/** Company figures in a reply (₹ amounts, lakh/crore, %, stock/order counts) that appear nowhere in the data, the chat or the user's message. Dates and times are never checked. */
const FIG = /₹\s?\d[\d,]*(\.\d+)?(\s?(lakh|crore|cr|l)\b)?|\b\d[\d,]*(\.\d+)?\s?(lakh|crore|cr)\b|\b\d+(\.\d+)?\s?%|\b\d[\d,]*\s(pcs|pieces|units|sheets|nos|orders|invoices|suppliers|employees|workers|approvals|customers)\b/gi;
function inventedFigures(reply: string, known: string): string[] {
  return (reply.match(FIG) || []).filter((f) => { const n = (f.match(/\d[\d,]*(\.\d+)?/) || [''])[0].replace(/,/g, ''); return n && !known.includes(n); });
}
function knownNumbers(...parts: string[]) {
  const base = parts.join(' ').replace(/,/g, '');
  return base + ' ' + (base.match(/\d{4,}/g) || []).flatMap((n) => [1e5, 1e7].flatMap((d) => [(+n / d).toFixed(1), (+n / d).toFixed(2), String(Math.round(+n / d)), String(+(+n / d).toFixed(1)), String(+(+n / d).toFixed(2))])).join(' ');
}

export async function classify(text: string, context = '', history: Turn[] = []): Promise<Intent> {
  const t = text.trim().slice(0, 500);
  const r = rules(t, history);
  if (r.kind === 'sourcing' && /\d/.test(t) && (NEED.test(t) || UNIT.test(t) || /chahiye|kavali|kaavali/i.test(t))) return r; // clear requirement: skip straight to drafting
  const system = `${APP}
Right now it is ${nowIst()}. Use this for any question about today's date, day or time; answer only what was asked (no panchang, tithi, sunrise or other extras). Upcoming Indian festivals and holidays (exact, use these): ${festivals()}. For other festivals use general knowledge and say the date is approximate.
Scope policy. ANSWER naturally and directly, like ChatGPT: greetings and small talk, today's date/day/time, arithmetic and percentages, GST/tax rates and calculations, Indian festivals and holidays, units and conversions, definitions, general business and MSME knowledge (MOQ, lead time, GRN, Udyam, payment terms…), and anything about this app and the company data.
POLITELY DECLINE (one friendly line, e.g. for "write python code" or "which insurance should I buy", then a redirect to what you can do: sourcing, inventory, orders, approvals, finance view) clearly off-topic domains: programming/coding help, banking products, insurance, investments/stocks/crypto, medical advice, legal advice. Use kind "question" for both answers and declines.
Classify the owner's message and answer it. Return {"kind": "greeting" | "question" | "vague" | "sourcing", "reply": "...", "questions": [{"q": "...", "options": ["...", "..."]}]}.
- greeting: hello, how are you, thanks, jokes, small talk or gibberish. reply: a natural, friendly 1-2 sentence answer to exactly what they said (tell the joke, say you're doing well, etc.), then a light nudge toward what you can do for the business. Do not repeat earlier replies.
- question: any question that is not a purchase – about the app, the business, the date/time, maths/GST, general knowledge. reply: the COMPLETE answer inside "reply" – any list goes inside reply as "- " bullet lines separated by \n (up to 6 bullets), never just a lead line ending with ":". At most 3 short sentences otherwise. Answer it directly. For company figures (cash, stock, orders, suppliers) use only the context below and say so if a figure is not there; general facts and calculations are fine – just give the result, with no disclaimer about whether a number is in the data.
- vague: they want to buy, hire or book something but key facts are missing. A bare item or service name such as "truck", "steel", "labour" or "bearings" is vague, not a greeting (quantity, spec, date, location). reply: one short line. questions: 1-2 short questions about the missing facts, each with 2-4 tappable answer options that fit the request type. Hire/transport (truck, tempo, crane, forklift, JCB): the type/capacity of THAT equipment (truck: "Tata Ace", "14 ft", "10-ton"; crane: "20-ton", "50-ton"; forklift: "3-ton"), date ("Today", "Tomorrow", "This week"), route ("Within Hyderabad", "Hyderabad to Pune") or load weight ("1 ton", "5 ton"). Labour/manpower: how many people, date/time, location. Goods/material: quantity ("500 kg", "1 ton"), spec/grade, needed by. Services/repair: what needs doing, location, when. Never ask for a budget or price range.
- sourcing: a clear requirement with enough to ask suppliers for a quote. reply: "".
Always answer the NEW message (never re-answer an earlier one). If the owner repeats or rephrases a question, the earlier answer did not help: answer it properly this time, differently. Use the conversation so far to understand follow-ups (e.g. "500 kg" after "need steel" is part of that need). Never claim to have sent, ordered, approved or paid for anything.${context ? `\nCompany data (demo): ${context.slice(0, 3500)}` : '\nNo company data is loaded in this box: for company figures say the user can see them on Home or in Finance/Orders/Inventory; still answer everything else (date, time, maths, general questions) directly.'}`;
  const OFF = /\b(python|javascript|java|c\+\+|code|coding|program(ming)?|sql|html|insurance|invest(ment)?s?|stocks?|shares|mutual funds?|crypto|bitcoin|loan|credit card|medical|medicine|doctor|symptoms?|lawyer|legal|lawsuit)\b/i;
  const offTopic = OFF.test(t) && !/\b(supplier|source|need|buy|stock (of|check|level)|in stock)\b/i.test(t);
  const convo = (history.length ? `Conversation so far:\n${history.slice(-10).map((h) => `${h.role === 'user' ? 'Owner' : 'Assistant'}: ${h.text.slice(0, 300)}`).join('\n')}\n\nNew message from the owner: ` : '') + t;
  type Out = { kind: string; reply: string; questions: { q: string; options: string[] }[] };
  const kinds = ['greeting', 'question', 'vague', 'sourcing'];
  const valid = (a: Out | null): a is Out => !!a && kinds.includes(a.kind) && (a.kind === 'sourcing' || !!String(a.reply || '').trim());
  let ai = await llmJson<Out>(system, convo, { timeoutMs: 12000, maxTokens: 500 });
  if (process.env.ASSIST_DEBUG) console.log("[assist raw]", JSON.stringify(ai));
  const DECLINES = [
    "That's outside what I can help with here – I'm built for Aarohan's sourcing, inventory, orders, approvals and finance. Want me to check low stock or draft a supplier enquiry?",
    "I'll have to pass on that one – it's not something this workspace covers. I can help with sourcing, stock, orders, approvals or your finance view. What do you need?",
    "Sorry, that's beyond this app's scope. I'm here for sourcing, inventory, orders and finance – shall I compare supplier quotes or check pending approvals?",
  ];
  const declined = (x: string) => /outside|beyond|scope|can't help|cannot help|not able|pass on|not something/i.test(x);
  if (offTopic && (!valid(ai) || !declined(String(ai.reply || '')))) return { kind: 'question', reply: pick(DECLINES, history), questions: [], parser: 'llm' };
  if (!valid(ai)) return r;
  if (ai.kind !== 'sourcing' && /:\s*$/.test(String(ai.reply).trim())) {
    const more = await llmJson<Out>(system, `${convo}\n\n(Your last reply was only a lead line ending with ":" – put the full answer, including every list item as "- " lines, inside "reply".)`, { timeoutMs: 12000, maxTokens: 600 });
    if (valid(more) && !/:\s*$/.test(String(more.reply).trim())) ai = more;
  }
  const known = knownNumbers(t, context, history.map((h) => h.text).join(' '), EXAMPLES.join(' '));
  const clean = (x: string) => x.replace(/\b(I('| ha)ve|I) (sent|ordered|approved|paid)\b/gi, 'I can prepare').trim().slice(0, 900);
  let reply = clean(String(ai.reply || ''));
  const calc = /\d/.test(t) && /%|\bof\b|plus|minus|times|into|divided|gst|calculate|convert|[+*\/x-]\s*\d/i.test(t);
  let bad = calc ? [] : inventedFigures(reply, known);
  if (bad.length) {
    console.warn('[assist] reply stated company figures not in the data; asking again', bad.length);
    const again = await llmJson<Out>(system, `${convo}\n\n(Your previous answer stated company figures that are not in the company data: ${bad.join(', ')}. Answer again using only figures from the company data, or say that figure isn't available.)`, { timeoutMs: 12000, maxTokens: 500 });
    if (valid(again)) { ai = again; reply = clean(String(again.reply || '')); bad = inventedFigures(reply, known); }
    if (bad.length) { const kept = reply.split(/(?<=[.!?])\s+|\n/).filter((x) => !inventedFigures(x, known).length).join(' ').trim(); if (kept) reply = kept; }
  }
  const questions = (Array.isArray(ai.questions) ? ai.questions : []).filter((x) => x && x.q).slice(0, 2).map((x) => ({ q: String(x.q).slice(0, 80), options: (Array.isArray(x.options) ? x.options : []).map(String).slice(0, 4) }));
  return { kind: ai.kind as Intent['kind'], reply, questions: ai.kind === 'vague' ? (questions.length ? questions : r.questions) : [], parser: 'llm' };
}
