// LLM over any OpenAI-compatible chat-completions API (NVIDIA by default for "nvapi-" keys).
// Every helper returns null on failure so callers always have a deterministic rules fallback.
import { cfg, runtime } from './config';

const NVIDIA = 'https://integrate.api.nvidia.com/v1';
// Measured on this account (Oct 2026) on a Hinglish supplier reply, reasoning off: lightning ≈2–6 s, ultra ≈3–19 s, bolt ≈2 s (small, last resort).
// Many catalog ids (llama-3.3-70b, mistral-large-2, kimi-k2.6…) return 404 "Function not found" for this account, so we only list ones that answered.
export const NVIDIA_MODELS = ['nvidia/nemotron-3.5-lightning-30b-a3b', 'nvidia/nemotron-3-ultra-550b-a55b', 'nvidia/nemotron-3.5-bolt-e4b'];
export const llmBase = () => (cfg.llm.base || (cfg.llm.key.startsWith('nvapi-') ? NVIDIA : 'https://api.openai.com/v1')).replace(/\/$/, '');
const isNvidia = () => llmBase().includes('nvidia.com');
let chosen = '';
/** Models to try, in order: LLM_MODEL, LLM_FALLBACK_MODEL, then the NVIDIA preference list. */
const chain = () => [...new Set([cfg.llm.model, process.env.LLM_FALLBACK_MODEL || '', ...(isNvidia() ? NVIDIA_MODELS : cfg.llm.model ? [] : ['gpt-4o-mini'])].filter(Boolean))];
export const llmModel = () => chosen || chain()[0] || 'gpt-4o-mini';
const headers = () => ({ 'content-type': 'application/json', authorization: `Bearer ${cfg.llm.key}` });

/** Drops models the endpoint does not list (only when LLM_MODEL is not set). */
export async function resolveModel() {
  if (!cfg.llm.key || cfg.llm.model) return llmModel();
  try {
    const r = await fetch(`${llmBase()}/models`, { headers: headers(), signal: AbortSignal.timeout(10000) });
    if (r.ok) { const ids = new Set(((await r.json()) as any).data?.map((m: any) => m.id) || []); chosen = chain().find((m) => ids.has(m)) || ''; }
  } catch { /* keep the default */ }
  return llmModel();
}

/** Pulls the first JSON object out of a model reply (tolerates ```json fences, <think> blocks, prose around it). */
export function extractJson(s: string): any {
  const t = s.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/gi, '');
  try { return JSON.parse(t); } catch { /* scan */ }
  const start = t.indexOf('{'); if (start < 0) throw new Error('no JSON object in reply');
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}' && --depth === 0) return JSON.parse(t.slice(start, i + 1));
  }
  throw new Error('unterminated JSON in reply');
}

let jsonMode = true; // switched off if the endpoint rejects response_format
let noThink = true;  // NVIDIA reasoning models: ask for a direct answer (much faster); switched off if rejected
export async function llmJson<T>(system: string, user: string, opts: { timeoutMs?: number; maxTokens?: number; model?: string; attempts?: number } = {}): Promise<T | null> {
  if (!cfg.llm.key) return null;
  if (!chosen && !cfg.llm.model) await resolveModel();
  let lastErr = ''; let model = opts.model || llmModel();
  const nextModel = () => { const c = chain(); const n = c[c.indexOf(model) + 1]; if (n) { model = n; return true; } return false; };
  for (let attempt = 0; attempt < (opts.attempts || 4); attempt++) {
    try {
      const body: any = { model, temperature: 0.1, max_tokens: opts.maxTokens || 1200, messages: [{ role: 'system', content: `${system}\nReply with ONE JSON object only. No prose, no markdown.` }, { role: 'user', content: user }] };
      if (jsonMode) body.response_format = { type: 'json_object' };
      if (noThink && isNvidia()) body.chat_template_kwargs = { enable_thinking: false };
      const r = await fetch(`${llmBase()}/chat/completions`, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal: AbortSignal.timeout(opts.timeoutMs || 30000) });
      if (!r.ok) {
        const txt = (await r.text()).slice(0, 300); lastErr = `HTTP ${r.status} ${txt.replace(/\s+/g, ' ').slice(0, 140)}`;
        if (r.status === 400 && jsonMode && /response_format|json_object/i.test(txt)) { jsonMode = false; continue; }
        if (r.status === 400 && noThink && /chat_template|enable_thinking/i.test(txt)) { noThink = false; continue; }
        if (r.status === 401 || r.status === 403) break; // bad key – retrying will not help
        if ((r.status === 404 || r.status >= 500) && nextModel()) continue;
        await new Promise((res) => setTimeout(res, 800 * (attempt + 1))); continue;
      }
      const j: any = await r.json();
      const content = String(j.choices?.[0]?.message?.content ?? '');
      if (!content.trim()) { lastErr = 'empty reply'; if (!nextModel()) await new Promise((res) => setTimeout(res, 500)); continue; }
      const out = extractJson(content);
      runtime.llmOk = true; runtime.llmErr = ''; runtime.llmModel = model;
      return out as T;
    } catch (err) {
      lastErr = String((err as Error).message || err);
      if (/timeout|aborted/i.test(lastErr)) nextModel(); // slow model: try the fallback for the next attempt
    }
  }
  console.warn('[llm] failed, using rules:', lastErr.slice(0, 160));
  runtime.llmErr = lastErr; if (/HTTP 40[13]/.test(lastErr)) runtime.llmOk = false;
  return null;
}

/** Connection test for the Connections panel. */
export async function checkLlm(): Promise<string> {
  if (!cfg.llm.key) { runtime.llmOk = null; return 'no key'; }
  runtime.llmOk = null; chosen = '';
  await resolveModel();
  const j = await llmJson<{ ok: boolean }>('You are a health check.', 'Return {"ok": true}', { timeoutMs: 25000, maxTokens: 30 });
  if (j) { runtime.llmOk = true; runtime.llmModel = llmModel(); return `ok (${llmModel()})`; }
  runtime.llmOk = false; return `failed – ${runtime.llmErr}`;
}
