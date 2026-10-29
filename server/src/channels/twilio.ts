// Twilio WhatsApp + Voice over the plain REST API (no SDK needed), plus webhook signature checking.
import crypto from 'node:crypto';
import { cfg, runtime } from '../config';
import { assertAllowed } from '../allowlist';

// TWILIO_API_BASE exists only so tests can point at tools/mock-bridge.ts; production always uses api.twilio.com.
const api = (p: string) => `${process.env.TWILIO_API_BASE || 'https://api.twilio.com'}/2010-04-01/Accounts/${cfg.twilio.sid}${p}`;
const auth = () => 'Basic ' + Buffer.from(`${cfg.twilio.sid}:${cfg.twilio.token}`).toString('base64');
// Array values become repeated form fields (Twilio wants StatusCallbackEvent=initiated&StatusCallbackEvent=ringing…, not one space-separated string).
export const formBody = (form: Record<string, string | string[]>) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries(form)) for (const x of [v].flat()) u.append(k, x); return u; };
async function tw(method: 'GET' | 'POST', p: string, form?: Record<string, string | string[]>) {
  const r = await fetch(api(p), { method, headers: { authorization: auth(), 'content-type': 'application/x-www-form-urlencoded' }, body: form ? formBody(form) : undefined });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${j.message || 'error'}${j.code ? ` (code ${j.code})` : ''}`);
  return j;
}
const wa = (p: string) => (p.startsWith('whatsapp:') ? p : `whatsapp:${p}`);

export async function sendWhatsApp(to: string, body: string) {
  assertAllowed('phone', to);
  const form: Record<string, string> = { To: wa(to), From: cfg.twilio.waFrom, Body: body };
  if (runtime.publicBaseUrl) form.StatusCallback = `${runtime.publicBaseUrl}/twilio/status`;
  const j = await tw('POST', '/Messages.json', form);
  return { sid: j.sid as string, status: j.status as string };
}
export async function messageStatus(sid: string) { const j = await tw('GET', `/Messages/${sid}.json`); return { status: j.status as string, error: j.error_code ? `Twilio ${j.error_code}${j.error_message ? `: ${j.error_message}` : ''}` : (j.error_message as string | null) }; }

/** Inbound WhatsApp messages from one number since a time (polling fallback when no webhook is reachable). */
export async function inboundWhatsApp(from: string, sinceIso: string) {
  const q = new URLSearchParams({ To: cfg.twilio.waFrom, From: wa(from), 'DateSent>': sinceIso.slice(0, 10), PageSize: '50' });
  const j = await tw('GET', `/Messages.json?${q}`);
  return (j.messages || []).filter((m: any) => m.direction === 'inbound').map((m: any) => ({ sid: m.sid as string, body: m.body as string, date: new Date(m.date_created).toISOString() }));
}

export async function placeCall(to: string, ref: string) {
  assertAllowed('phone', to);
  if (!runtime.publicBaseUrl) throw new Error('AI call needs a public URL (PUBLIC_BASE_URL or tunnel) for Twilio to fetch the call script');
  const j = await tw('POST', '/Calls.json', { To: to, From: cfg.twilio.voiceFrom, Url: `${runtime.publicBaseUrl}/twilio/voice/${ref}/0`, StatusCallback: `${runtime.publicBaseUrl}/twilio/callstatus/${ref}`, StatusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'], Timeout: '30' });
  console.log(`[voice] call placed ${String(j.sid).slice(0, 10)}… to ${to.replace(/(\+\d{3})\d+(\d{4})/, '$1••••$2')} ref ${ref} status ${j.status}`);
  return { sid: j.sid as string, status: j.status as string };
}

export function validSignature(url: string, params: Record<string, string>, signature: string | undefined) {
  if (!cfg.twilio.token || !signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const expect = crypto.createHmac('sha1', cfg.twilio.token).update(Buffer.from(data, 'utf8')).digest('base64');
  return expect.length === signature.length && crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(signature));
}
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
export const twiml = {
  say: (t: string) => `<Say voice="${cfg.twilio.voice}" language="${cfg.twilio.voiceLang}">${esc(t)}</Say>`,
  gather: (action: string, prompt: string) => `<Gather input="speech dtmf" language="${cfg.twilio.voiceLang}" speechTimeout="auto" timeout="6" action="${esc(action)}" method="POST">${twiml.say(prompt)}</Gather>`,
  wrap: (inner: string) => `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`,
};
