// Credentials pasted in the app's "Connect" panel are kept here (chmod 600) and override .env.
// The allowlist is deliberately NOT settable from the UI.
import fs from 'node:fs';
import path from 'node:path';
import { cfg, runtime } from './config';

const file = path.join(cfg.dataDir, 'secrets.json');
type Secrets = { gmailBridgeUrl?: string; gmailBridgeKey?: string; gmailUser?: string; gmailAppPassword?: string; twilioSid?: string; twilioToken?: string; twilioVoiceFrom?: string; twilioWaFrom?: string; llmKey?: string; llmBase?: string; llmModel?: string };
export let secrets: Secrets = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};

export function applySecrets() {
  const s = secrets;
  if (s.gmailBridgeUrl) cfg.bridge.url = s.gmailBridgeUrl;
  if (s.gmailBridgeKey) cfg.bridge.key = s.gmailBridgeKey;
  if (cfg.bridge.url) cfg.emailLabel = 'Gmail (Apps Script bridge)';
  else if (s.gmailUser && s.gmailAppPassword) {
    Object.assign(cfg.smtp, { host: 'smtp.gmail.com', port: 465, secure: true, user: s.gmailUser, pass: s.gmailAppPassword, from: s.gmailUser });
    Object.assign(cfg.imap, { host: 'imap.gmail.com', port: 993, secure: true, user: s.gmailUser, pass: s.gmailAppPassword, mailbox: '[Gmail]/All Mail' });
    cfg.emailLabel = 'Gmail';
  }
  if (s.twilioSid && s.twilioToken) Object.assign(cfg.twilio, { sid: s.twilioSid, token: s.twilioToken });
  if (s.twilioVoiceFrom) cfg.twilio.voiceFrom = s.twilioVoiceFrom;
  if (s.twilioWaFrom) cfg.twilio.waFrom = s.twilioWaFrom.startsWith('whatsapp:') ? s.twilioWaFrom : `whatsapp:${s.twilioWaFrom}`;
  if (s.llmKey) Object.assign(cfg.llm, { key: s.llmKey, base: s.llmBase || '', model: s.llmModel || '' });
  else { if (s.llmBase) cfg.llm.base = s.llmBase; if (s.llmModel) cfg.llm.model = s.llmModel; }
  void runtime;
}
export function saveSecrets(patch: Secrets) {
  for (const [k, v] of Object.entries(patch)) if (typeof v === 'string' && v.trim()) (secrets as any)[k] = v.trim().replace(/\s+/g, k === 'gmailAppPassword' ? '' : ' ');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(secrets, null, 2), { mode: 0o600 });
  applySecrets();
}
applySecrets();
