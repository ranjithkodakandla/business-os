// Real email: SMTP out (nodemailer), IMAP in (imapflow). Works with Gmail (app password), Zoho Mail, Outlook,
// or the local mail lab (src/devmail.ts) used for automated tests.
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { cfg, runtime, emailBackend } from '../config';
import { assertAllowed } from '../allowlist';

export type Inbound = { from: string; to: string; subject: string; text: string; messageId: string; inReplyTo?: string; references: string[]; date: string };

/** Footer on every agent email. A message whose own (unquoted) text carries it is ours, never a supplier reply. */
export const AGENT_MARK = '— sent by the Business Workspace sourcing agent';
export const isAgentText = (unquoted: string) => unquoted.includes(AGENT_MARK);
/** While a send is in flight its id is not yet known, so polling waits (no self-capture race). */
export let sendsInFlight = 0;

// ---------- Gmail via Apps Script web app (HTTPS) ----------
// Apps Script answers a POST with 302 -> script.googleusercontent.com; fetch's redirect:'follow' re-issues it as GET (per spec),
// which is exactly what Apps Script expects.
async function bridgeCall<T>(body: Record<string, unknown> | null, timeoutMs = 25000): Promise<T> {
  const r = await fetch(cfg.bridge.url, {
    method: body ? 'POST' : 'GET', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs),
    headers: body ? { 'content-type': 'text/plain;charset=utf-8' } : undefined,
    body: body ? JSON.stringify({ key: cfg.bridge.key, ...body }) : undefined,
  });
  const txt = await r.text();
  let j: any;
  try { j = JSON.parse(txt); } catch {
    const hint = /accounts\.google\.com|ServiceLogin|signin/i.test(txt) ? ' – the web app is not public; redeploy with "Who has access: Anyone"' : /Script function not found|doPost|doGet/i.test(txt) ? ' – the script code is missing doGet/doPost; paste gmail-bridge.gs and deploy a new version' : '';
    throw new Error(`Bridge did not return JSON (HTTP ${r.status})${hint}`);
  }
  if (!j.ok) throw new Error(`Bridge: ${j.error || 'error'}`);
  return j as T;
}
export async function bridgePing() { return bridgeCall<{ ok: true; user?: string }>(null, 15000); }

/** Real reachability check; sets runtime.emailOk which drives the LIVE/SIMULATED badge. */
export async function checkEmail(): Promise<string> {
  const b = emailBackend();
  if (!b) { runtime.emailOk = null; runtime.emailErr = ''; return 'not configured'; }
  try {
    if (b === 'bridge') { const p = await bridgePing(); runtime.emailSender = p.user || ''; }
    else {
      const t = nodemailer.createTransport({ host: cfg.smtp.host, port: cfg.smtp.port, secure: cfg.smtp.secure, auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined, connectionTimeout: 8000, greetingTimeout: 8000, tls: { rejectUnauthorized: !/^(127\.|localhost)/.test(cfg.smtp.host) } });
      await t.verify();
      const c = new ImapFlow({ host: cfg.imap.host, port: cfg.imap.port, secure: cfg.imap.secure, auth: { user: cfg.imap.user, pass: cfg.imap.pass }, logger: false, connectionTimeout: 8000, tls: { rejectUnauthorized: !/^(127\.|localhost)/.test(cfg.imap.host) } } as any);
      await c.connect(); await c.logout();
      runtime.emailSender = cfg.smtp.from || cfg.smtp.user;
    }
    runtime.emailOk = true; runtime.emailErr = ''; return 'ok';
  } catch (e) { runtime.emailOk = false; runtime.emailErr = String((e as Error).message || e); return runtime.emailErr; }
}

export async function sendEmail(to: string, subject: string, text: string, opts: { inReplyTo?: string } = {}) {
  assertAllowed('email', to);
  text = `${text}\n\n${AGENT_MARK}`;
  if (emailBackend() === 'bridge') {
    sendsInFlight++;
    try {
      const r = await bridgeCall<{ id: string; threadId: string }>({ action: 'send', to, subject, body: text, fromName: `${cfg.company.split(',')[0]} – Purchase` });
      ownIds.add(r.id);
      return { messageId: r.id, accepted: true };
    } finally { sendsInFlight--; }
  }
  const t = nodemailer.createTransport({ host: cfg.smtp.host, port: cfg.smtp.port, secure: cfg.smtp.secure, auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined, tls: { rejectUnauthorized: !/^(127\.|localhost)/.test(cfg.smtp.host) } });
  const domain = (cfg.smtp.from || cfg.smtp.user || 'agent.local').split('@').pop();
  const messageId = `<rfq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@${domain}>`;
  ownIds.add(messageId); // registered BEFORE sending, so a fast poll can never mistake our own RFQ for a reply
  const info = await t.sendMail({ messageId, headers: { 'X-BW-Agent': 'rfq-out' }, from: `"${cfg.company.split(',')[0]} – Purchase" <${cfg.smtp.from || cfg.smtp.user}>`, to, subject, text, inReplyTo: opts.inReplyTo, references: opts.inReplyTo });
  return { messageId: info.messageId as string, accepted: (info.accepted as string[]).length > 0 };
}

/** Message-IDs we sent; inbound copies of these are ignored. */
export const ownIds = new Set<string>();
let lastUid = 0;
let since = new Date(Date.now() - 60 * 60 * 1000);
/** Fetch new messages whose subject or headers carry an RFQ reference. */
let bridgeSince = new Date(Date.now() - 6 * 3600 * 1000);
export async function pollEmail(): Promise<Inbound[]> {
  if (emailBackend() === 'bridge') {
    const r = await bridgeCall<{ messages: { id: string; threadId: string; from: string; to: string; subject: string; dateIso: string; body: string }[] }>({ action: 'list', sinceIso: bridgeSince.toISOString(), query: 'subject:"RFQ-SRC" newer_than:2d' });
    const addr = (s: string) => (s.match(/<([^>]+)>/)?.[1] || s).trim().toLowerCase();
    return r.messages.filter((m) => !ownIds.has(m.id)).map((m) => ({ from: addr(m.from), to: addr(m.to.split(',')[0] || ''), subject: m.subject, text: m.body, messageId: m.id, references: [m.threadId], date: m.dateIso }));
  }
  const c = new ImapFlow({ host: cfg.imap.host, port: cfg.imap.port, secure: cfg.imap.secure, auth: { user: cfg.imap.user, pass: cfg.imap.pass }, logger: false, tls: { rejectUnauthorized: !/^(127\.|localhost)/.test(cfg.imap.host) } });
  const out: Inbound[] = [];
  await c.connect();
  try {
    let box = cfg.imap.mailbox;
    try { await c.mailboxOpen(box); } catch { box = 'INBOX'; await c.mailboxOpen(box); }
    const lock = await c.getMailboxLock(box);
    try {
      const uids = (await c.search({ since, subject: 'RFQ-' }, { uid: true })) || [];
      for (const uid of uids.filter((u) => u > lastUid)) {
        const m = await c.fetchOne(String(uid), { source: true }, { uid: true });
        if (!m || !m.source) continue;
        const p = await simpleParser(m.source);
        if (p.headers.get('x-bw-agent') || (p.messageId && ownIds.has(p.messageId))) { lastUid = Math.max(lastUid, uid); continue; }
        const refs = Array.isArray(p.references) ? p.references : p.references ? [p.references] : [];
        out.push({ from: p.from?.value?.[0]?.address || '', to: (Array.isArray(p.to) ? p.to[0] : p.to)?.value?.[0]?.address || '', subject: p.subject || '', text: p.text || '', messageId: p.messageId || `uid-${uid}`, inReplyTo: p.inReplyTo, references: refs, date: (p.date || new Date()).toISOString() });
        lastUid = Math.max(lastUid, uid);
      }
    } finally { lock.release(); }
  } finally { await c.logout().catch(() => {}); }
  return out;
}
export function resetEmailCursor() { since = new Date(Date.now() - 5 * 60 * 1000); bridgeSince = new Date(Date.now() - 5 * 60 * 1000); }
