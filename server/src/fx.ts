// Factory demo AI endpoints: open questions answered from the factory data, and field extraction from uploaded documents.
// Each call is capped at about 10 s: the main model gets ~6.5 s, then the small fast model gets ~3.5 s; callers fall back to rules on null.
import type { Express } from 'express';
import { llmJson, NVIDIA_MODELS } from './llm';

const FAST = NVIDIA_MODELS[NVIDIA_MODELS.length - 1];
async function quick<T>(system: string, user: string, maxTokens: number): Promise<{ out: T | null; model: string }> {
  const a = await llmJson<T>(system, user, { timeoutMs: 6500, maxTokens, attempts: 1 });
  if (a) return { out: a, model: 'main' };
  const b = await llmJson<T>(system, user, { timeoutMs: 3500, maxTokens, attempts: 1, model: FAST });
  return { out: b, model: b ? 'fast' : 'none' };
}

const ASK = `You are the AI assistant in "Shakti OS", the operations app of Shakti Electro-Pack Pvt Ltd (a fictional Indian MSME with 3 sites: RF modules, drones, packaging). The owner Ranjith is asking.
Answer the owner's question directly in plain, simple English, using ONLY the company data given for any company figure. If the data does not have it, say so in one line and suggest where to look.
General business knowledge questions (e.g. what is EMD, how CLRA works, GST rate on corrugated boxes) may be answered from general knowledge, briefly.
Return {"reply": "...", "table": {"cols": [...], "rows": [[...]]} | null, "followups": ["...", "..."]}.
- reply: max 4 short lines, markdown allowed ("- " bullets, **bold**). No long paragraphs. Never claim to have sent, filed, ordered or paid anything.
- table: include only when the answer is a list of 3+ comparable things from the data (max 8 rows, max 5 columns). Otherwise null.
- followups: 2-3 short next questions the owner may tap.`;

const EXTRACT: Record<string, string> = {
  licence: `Read the text of an Indian government licence / approval / certificate and extract fields. Return {"kind": "...", "number": "...", "authority": "...", "site": "S1"|"S2"|"S3"|"", "issued": "YYYY-MM-DD", "expires": "YYYY-MM-DD", "holder": "..."}.
kind is a short plain name like "Fire NOC", "Pollution Board CTO", "Factory licence", "Trade licence". Sites: S1 = Cherlapally (Hyderabad), S2 = Hosur (Tamil Nadu), S3 = Medak. Use "" when unknown. Dates in the document are usually DD-MM-YYYY.`,
  tender: `Read an Indian tender notice and extract the bid details. Return {"buyer": "...", "number": "...", "item": "...", "qty": number, "unit": "...", "due": "YYYY-MM-DD", "minTurnoverCr": number|null, "certs": ["ISO 9001", ...], "similarOrders": number|null, "emd": number|null, "msmeExempt": true|false, "other": ["short requirement", ...], "family": "rf"|"drone"|"packaging"|"other"}.`,
};

export function mountFx(app: Express) {
  app.post('/api/fx/ask', async (req, res) => {
    const text = String(req.body?.text || '').slice(0, 800); const context = String(req.body?.context || '').slice(0, 9000);
    const hist = (Array.isArray(req.body?.history) ? req.body.history : []).slice(-6).map((h: any) => `${h.role === 'user' ? 'Owner' : 'Assistant'}: ${String(h.text || '').slice(0, 240)}`).join('\n');
    const t0 = Date.now();
    const { out, model } = await quick<{ reply: string; table?: { cols: string[]; rows: string[][] } | null; followups?: string[] }>(ASK, `Company data (fictional demo):\n${context}\n\n${hist ? `Conversation so far:\n${hist}\n\n` : ''}Owner's question: ${text}`, 700);
    if (!out || !String(out.reply || '').trim()) return res.json({ ok: false, ms: Date.now() - t0 });
    const reply = String(out.reply).replace(/\b(I('| ha)ve|I) (sent|filed|ordered|approved|paid)\b/gi, 'I can prepare').slice(0, 1400);
    const table = out.table && Array.isArray(out.table.cols) && Array.isArray(out.table.rows) && out.table.rows.length ? { cols: out.table.cols.slice(0, 5).map(String), rows: out.table.rows.slice(0, 8).map((r) => (Array.isArray(r) ? r : []).slice(0, 5).map(String)) } : null;
    res.json({ ok: true, reply, table, followups: (out.followups || []).slice(0, 3).map(String), model, ms: Date.now() - t0 });
  });
  app.post('/api/fx/extract', async (req, res) => {
    const kind = req.body?.kind === 'tender' ? 'tender' : 'licence'; const text = String(req.body?.text || '').slice(0, 12000);
    const t0 = Date.now(); const { out } = await quick<Record<string, unknown>>(EXTRACT[kind], text, 600);
    res.json({ ok: !!out, fields: out || null, ms: Date.now() - t0 });
  });
}
