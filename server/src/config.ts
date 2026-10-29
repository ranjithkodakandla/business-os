// Runtime config. Everything comes from server/.env (or the process env). A channel is REAL only when its
// credentials are present; otherwise it runs in clearly-labelled SIMULATED mode.
import fs from 'node:fs';
import path from 'node:path';

const envFile = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', process.env.ENV_FILE || '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const e = (k: string, d = '') => (process.env[k] ?? d).trim();
const list = (k: string) => e(k).split(',').map((x) => x.trim()).filter(Boolean);

export const cfg = {
  port: Number(e('PORT', '8787')),
  company: e('COMPANY_NAME', 'Aarohan Industries, Hyderabad'),
  buyer: e('BUYER_NAME', 'Harish Chandra, Stores & Purchase'),
  buyerPhone: e('BUYER_PHONE', ''),
  // ---- Safety: the ONLY recipients the agent may ever contact ----
  allowEmails: list('ALLOWLIST_EMAILS').map((x) => x.toLowerCase()),
  allowPhones: list('ALLOWLIST_PHONES'),
  // Demo routing: every supplier identity is mapped onto a test inbox / phone that the presenter controls.
  testEmailBase: e('TEST_SUPPLIER_EMAIL_BASE'),          // e.g. ranjith302@gmail.com -> ranjith302+supplierA@gmail.com
  testPhone: e('TEST_SUPPLIER_PHONE'),                    // E.164, e.g. +919966012363
  // ---- Email (SMTP out, IMAP in) ----
  smtp: { host: e('SMTP_HOST'), port: Number(e('SMTP_PORT', '465')), secure: e('SMTP_SECURE', 'true') === 'true', user: e('SMTP_USER'), pass: e('SMTP_PASS'), from: e('SMTP_FROM') },
  imap: { host: e('IMAP_HOST'), port: Number(e('IMAP_PORT', '993')), secure: e('IMAP_SECURE', 'true') === 'true', user: e('IMAP_USER'), pass: e('IMAP_PASS'), mailbox: e('IMAP_MAILBOX', 'INBOX') },
  // Gmail via a Google Apps Script web app (HTTPS only; used when SMTP/IMAP ports are blocked). Takes precedence over SMTP.
  bridge: { url: e('GMAIL_BRIDGE_URL'), key: e('GMAIL_BRIDGE_KEY') },
  emailLabel: e('EMAIL_LABEL', ''), // e.g. "local mail lab" when pointed at server/src/devmail.ts
  // ---- Twilio (WhatsApp + voice) ----
  twilio: { sid: e('TWILIO_ACCOUNT_SID'), token: e('TWILIO_AUTH_TOKEN'), waFrom: e('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886'), voiceFrom: e('TWILIO_VOICE_FROM'),
    voiceLang: e('TWILIO_VOICE_LANGUAGE', 'en-IN'), voice: e('TWILIO_VOICE', 'Polly.Raveena') },
  publicBaseUrl: e('PUBLIC_BASE_URL'), // https URL Twilio can reach; 'auto' starts a cloudflared quick tunnel
  // ---- LLM (any OpenAI-compatible endpoint) ----
  // NVIDIA (integrate.api.nvidia.com) is picked automatically for an "nvapi-" key. LLM_MODEL overrides the model.
  llm: { key: e('LLM_API_KEY') || e('NVIDIA_API_KEY'), base: e('LLM_BASE_URL'), model: e('LLM_MODEL') },
  pollMs: Number(e('POLL_MS', '8000')),
  passcode: e('BW_PASSCODE') || e('PASSCODE'),
  dataDir: path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', e('DATA_DIR', 'data')),
  envFile,
};

export const modes = () => ({
  // LIVE only after a real reachability check passed (bridge doGet, or SMTP+IMAP login) – see channels/email.ts checkEmail().
  email: emailBackend() && runtime.emailOk === true ? 'real' : 'simulated',
  whatsapp: cfg.twilio.sid && cfg.twilio.token ? 'real' : 'simulated',
  call: cfg.twilio.sid && cfg.twilio.token && cfg.twilio.voiceFrom && runtime.publicBaseUrl ? 'real' : 'simulated',
  llm: cfg.llm.key && runtime.llmOk !== false ? 'real' : 'rules',
} as Record<'email' | 'whatsapp' | 'call' | 'llm', string>);

export const runtime = { publicBaseUrl: cfg.publicBaseUrl === 'auto' ? '' : cfg.publicBaseUrl, emailOk: null as boolean | null, emailErr: '', emailSender: '', llmOk: null as boolean | null, llmErr: '', llmModel: '' };
export const emailBackend = (): 'bridge' | 'smtp' | null => (cfg.bridge.url && cfg.bridge.key ? 'bridge' : cfg.smtp.host && (cfg.smtp.user || cfg.smtp.from) && cfg.imap.host ? 'smtp' : null);
