import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { cfg, modes, runtime, emailBackend } from './config';
import { saveSecrets } from './secrets';
import { db, save, analyze, createRun, findRun, findOut, addReply, sendCounter, sendAnswer, draftPo, ranked, summarize, CALL_QUESTIONS, type Out } from './agent';
import { checkLlm, llmModel, llmBase } from './llm';
import { classify } from './assist';
import { dataIntent, dataView } from './intent';
import { pollEmail, resetEmailCursor, checkEmail, isAgentText, sendsInFlight } from './channels/email';
import { cleanReply } from './parse';
import { inboundWhatsApp, messageStatus, placeCall, validSignature, twiml } from './channels/twilio';
import { testEmailFor, testPhoneFor, testNameFor, LETTERS } from './catalog';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
const dist = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'dist');

// ---------- Passcode gate (everything except Twilio webhooks, which are signature-checked) ----------
const sessFile = path.join(cfg.dataDir, 'sessions.json');
const hashTok = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
const sessions = new Set<string>((() => { try { return JSON.parse(fs.readFileSync(sessFile, 'utf8')) as string[]; } catch { return []; } })());
const saveSessions = () => { try { fs.mkdirSync(cfg.dataDir, { recursive: true }); fs.writeFileSync(sessFile, JSON.stringify([...sessions].slice(-500)), { mode: 0o600 }); } catch (e) { console.warn('[sessions]', e); } };
const cookie = (req: express.Request) => Object.fromEntries((req.headers.cookie || '').split(';').map((x) => x.trim().split('=')).filter((x) => x.length === 2))['bw_s'];
const loginPage = (err = '', next = '/') => `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Business Workspace</title><body style="font-family:system-ui;background:#f8fafc;display:grid;place-items:center;height:100vh;margin:0"><form method=post action="/login" style="background:#fff;padding:28px;border-radius:14px;box-shadow:0 4px 24px #0001;width:min(320px,86vw)"><h2 style="margin:0 0 6px">Business Workspace</h2><p style="color:#64748b;margin:0 0 16px;font-size:14px">Live sourcing demo · enter the passcode</p><input type=hidden name=next value="${next.replace(/[^\w\/\-?=&.]/g, '')}"><input name=passcode type=password autofocus placeholder=Passcode style="width:100%;padding:10px;font-size:16px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box"><p style="color:#e11d48;font-size:13px">${err}</p><button style="width:100%;padding:10px;font-size:16px;background:#4f46e5;color:#fff;border:0;border-radius:8px">Open</button></form>`;
let fails = 0;
app.post('/login', (req, res) => {
  if (fails > 30) return res.status(429).send('Too many attempts');
  const ok = cfg.passcode && typeof req.body.passcode === 'string' && crypto.timingSafeEqual(crypto.createHash('sha256').update(req.body.passcode.trim()).digest(), crypto.createHash('sha256').update(cfg.passcode).digest());
  if (!ok) { fails++; return res.status(401).send(loginPage('Wrong passcode')); }
  const t = crypto.randomBytes(24).toString('hex'); sessions.add(hashTok(t)); saveSessions();
  res.setHeader('Set-Cookie', `bw_s=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
  res.redirect(typeof req.body.next === 'string' && req.body.next.startsWith('/') && !req.body.next.startsWith('//') ? req.body.next : '/');
});
app.use((req, res, next) => {
  if (req.path.startsWith('/twilio/') || !cfg.passcode) return next();
  if (sessions.has(hashTok(cookie(req) || ''))) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'locked' });
  res.status(401).send(loginPage('', req.originalUrl));
});

// ---------- API ----------
const view = (r: ReturnType<typeof findRun>) => r && { ...r, top: ranked(r).map((o) => o.ref) };
app.get('/api/status', (_req, res) => res.json({
  modes: modes(), publicUrl: runtime.publicBaseUrl, emailLabel: cfg.emailLabel, sender: runtime.emailOk ? runtime.emailSender || null : null,
  email: { backend: emailBackend(), ok: runtime.emailOk, error: runtime.emailErr, bridgeUrlSet: !!cfg.bridge.url },
  llm: { keySet: !!cfg.llm.key, ok: runtime.llmOk, model: cfg.llm.key ? llmModel() : null, host: cfg.llm.key ? new URL(llmBase()).host : null, error: runtime.llmErr },
  allowlist: { emails: cfg.allowEmails, phones: cfg.allowPhones },
  identities: LETTERS.map((l) => ({ letter: l, name: testNameFor(l), email: testEmailFor(l), phone: testPhoneFor(l) })),
}));
app.get('/api/runs', (_req, res) => res.json(db.runs.map((r) => ({ id: r.id, text: r.text, status: r.status, createdAt: r.createdAt }))));
app.post('/api/runs', async (req, res) => {
  const text = String(req.body.text || '').slice(0, 500);
  if (!text.trim()) return res.status(400).json({ error: 'Say what you need' });
  try {
    const run = await createRun(text, Array.isArray(req.body.skus) && req.body.skus.length ? req.body.skus : undefined, typeof req.body.enquiry === 'string' ? req.body.enquiry : undefined);
    res.json(view(run));
  } catch (e) { const st = (e as any).status; if (st === 400) return res.status(400).json({ error: (e as Error).message }); throw e; }
});
const turns = (h: unknown) => (Array.isArray(h) ? h : []).filter((x) => x && typeof x.text === 'string').slice(-10).map((x) => ({ role: x.role === 'user' ? 'user' as const : 'ai' as const, text: String(x.text).slice(0, 400) }));
app.post('/api/assist', async (req, res) => {
  const text = String(req.body.text || '').slice(0, 500);
  res.json(await classify(text, String(req.body.context || ''), turns(req.body.history)));
});
app.post('/api/view', async (req, res) => { try { const r = await dataView(String(req.body?.question || ''), req.body?.snapshot); res.json(r || { headline: '' }); } catch { res.json({ headline: '' }); } });
app.post('/api/intent', async (req, res) => {
  const r = await dataIntent(String(req.body.text || ''), String(req.body.catalog || '').slice(0, 3000));
  res.json(r || { tool: 'none', args: {}, parser: 'rules' });
});
app.post('/api/check', async (req, res) => {
  const text = String(req.body.text || '').slice(0, 500);
  const a = await analyze(text, Array.isArray(req.body.skus) && req.body.skus.length ? req.body.skus : undefined, { history: turns(req.body.history), context: String(req.body.context || '').slice(0, 4000) });
  res.json(a);
});
app.get('/api/runs/:id', (req, res) => { const r = findRun(String(req.params.id)); r ? res.json(view(r)) : res.status(404).json({ error: 'not found' }); });
const withOut = (h: (o: Out, req: express.Request, res: express.Response) => Promise<void> | void) => async (req: express.Request, res: express.Response) => {
  const f = findOut(String(req.params.ref)); if (!f) return void res.status(404).json({ error: 'not found' });
  try { await h(f.out, req, res); if (!res.headersSent) res.json(view(f.run)); } catch (err) { res.status(500).json({ error: String((err as Error).message) }); }
};
app.post('/api/outs/:ref/counter', withOut(async (o, req) => { await sendCounter(o, Number(req.body.price) || undefined, req.body.text ? String(req.body.text).slice(0, 1500) : undefined); }));
app.post('/api/outs/:ref/answer', withOut(async (o, req) => {
  if (req.body.dismiss) { o.pending = null; save(); return; }
  const text = String(req.body.text || '').trim(); if (!text) throw new Error('Write the answer first');
  await sendAnswer(o, text.slice(0, 1500));
}));
app.post('/api/runs/:id/summary', async (req, res) => { const r = findRun(String(req.params.id)); if (!r) return res.status(404).json({ error: 'not found' }); await summarize(r); res.json(view(r)); });
app.post('/api/outs/:ref/po', withOut((o, _req, res) => { if (!o.quote?.price) { res.status(400).json({ error: 'No price yet' }); return; } const f = findOut(o.ref)!; draftPo(f.run, o); }));
app.post('/api/outs/:ref/note', withOut(async (o, req) => { await addReply(o, String(req.body.text || '').slice(0, 2000), o.channel); }));
app.post('/api/outs/:ref/call', withOut(async (o) => {
  if (modes().call !== 'real') throw new Error('AI calls are not connected yet – use the phone link, then type what they said');
  const r = await placeCall(o.to || cfg.testPhone, o.ref); o.callAttempts = 1; o.callScreened = false; o.callGotAnswers = false; o.providerIds.push(r.sid); o.timeline.push({ stage: 'sent', at: new Date().toISOString(), note: `AI call dialling ${o.to || cfg.testPhone}` }); save();
}));
app.post('/api/reset', (_req, res) => { db.runs = []; save(); resetEmailCursor(); res.json({ ok: true }); });

app.post('/api/connect', async (req, res) => {
  const b = req.body || {};
  const url = typeof b.gmailBridgeUrl === 'string' ? b.gmailBridgeUrl.trim() : '';
  if (url && !/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(url) && !(process.env.ALLOW_LOCAL_BRIDGE === '1' && /^http:\/\/127\.0\.0\.1:\d+\//.test(url))) return res.status(400).json({ error: 'The bridge URL must be the Apps Script web app URL (https://script.google.com/macros/s/…/exec)' });
  saveSecrets({ gmailBridgeUrl: url, twilioSid: b.twilioSid, twilioToken: b.twilioToken, twilioVoiceFrom: b.twilioVoiceFrom, twilioWaFrom: b.twilioWaFrom, llmKey: b.llmKey, llmBase: b.llmBase, llmModel: b.llmModel });
  const result: Record<string, string> = {};
  if (cfg.llm.key && (b.llmKey || b.llmBase || b.llmModel || runtime.llmOk !== true)) result.llm = await checkLlm();
  if (emailBackend()) result[emailBackend() === 'bridge' ? 'gmail bridge' : 'email'] = await checkEmail();
  if (cfg.twilio.sid) { try { const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.twilio.sid}.json`, { headers: { authorization: 'Basic ' + Buffer.from(`${cfg.twilio.sid}:${cfg.twilio.token}`).toString('base64') } }); result.twilio = r.ok ? 'ok' : `HTTP ${r.status}`; } catch (e) { result.twilio = String(e); } }
  res.json({ result, modes: modes() });
});

// The Apps Script source (contains the shared key), downloadable only behind the passcode.
app.get('/api/bridge-script', (_req, res) => {
  const f = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'gmail-bridge.gs');
  if (!fs.existsSync(f)) return res.status(404).json({ error: 'gmail-bridge.gs not found' });
  res.type('text/plain').send(fs.readFileSync(f, 'utf8'));
});

// ---------- Twilio webhooks ----------
const twilioOk = (req: express.Request) => validSignature(`${runtime.publicBaseUrl}${req.originalUrl}`, req.body || {}, req.header('x-twilio-signature'));
const answers = new Map<string, string[]>();
import { QS, voiceTwiml, callEnded } from './voice';
app.post('/twilio/voice/:ref/:step', async (req, res) => {
  res.type('text/xml');
  const sig = twilioOk(req);
  console.log(`[voice] webhook ${req.params.ref}/${req.params.step} sig=${sig ? 'ok' : 'BAD'} call=${String(req.body.CallSid || '').slice(0, 10)}… status=${req.body.CallStatus || '-'} answeredBy=${req.body.AnsweredBy || '-'} speech=${JSON.stringify(String(req.body.SpeechResult || '').slice(0, 80))} digits=${req.body.Digits || '-'}`);
  if (!sig) return res.status(403).send(twiml.wrap(''));
  const f = findOut(String(req.params.ref)); if (!f) return res.send(twiml.wrap(twiml.say('Sorry, this enquiry has expired. Goodbye.')));
  const o = f.out; const step = String(req.params.step); const said = String(req.body.SpeechResult || '').trim(); const digits = String(req.body.Digits || '').trim();
  if (step === '0') { answers.set(o.ref, []); o.timeline.push({ stage: 'answered', at: new Date().toISOString(), note: o.callAttempts && o.callAttempts > 1 ? `attempt ${o.callAttempts}` : undefined }); save(); }
  const n = Number(step);
  if (Number.isFinite(n) && n > 0) { const a = answers.get(o.ref) || []; a[n - 1] = said || digits; answers.set(o.ref, a); }
  const xml = voiceTwiml(o, f.run, step, said, digits); if (step.startsWith('screen')) save();
  res.send(xml);
  if (Number.isFinite(n) && n >= QS(o).length) {
    const a = answers.get(o.ref) || [];
    const parts = QS(o).map((_q, k) => (a[k] ? `Q${k + 1} (${CALL_QUESTIONS[k]}) – ${a[k]}` : '')).filter(Boolean);
    answers.delete(o.ref);
    if (parts.length) { o.callGotAnswers = true; await addReply(o, `Call transcript:\n${parts.join('\n')}`, 'Call'); }
  }
});
app.post('/twilio/callstatus/:ref', (req, res) => {
  const sig = twilioOk(req);
  console.log(`[voice] status ${req.params.ref} sig=${sig ? 'ok' : 'BAD'} call=${String(req.body.CallSid || '').slice(0, 10)}… ${req.body.CallStatus || '-'} dur=${req.body.CallDuration || '-'} answeredBy=${req.body.AnsweredBy || '-'}`);
  if (!sig) return res.status(403).end();
  const f = findOut(String(req.params.ref)); const s = String(req.body.CallStatus || '');
  if (f) {
    const o = f.out; const map: Record<string, any> = { ringing: 'ringing', 'in-progress': 'answered', completed: 'call-ended' };
    if (map[s] && !(map[s] === 'answered' && o.timeline.some((t) => t.stage === 'answered'))) o.timeline.push({ stage: map[s], at: new Date().toISOString(), note: `${s}${req.body.CallDuration ? ` · ${req.body.CallDuration}s` : ''}` });
    callEnded(o, s, async () => {
      try { o.callAttempts = (o.callAttempts || 1) + 1; o.callScreened = false; const r = await placeCall(o.to || cfg.testPhone, o.ref); o.providerIds.push(r.sid); o.timeline.push({ stage: 'sent', at: new Date().toISOString(), note: `redialling (attempt ${o.callAttempts})` }); }
      catch (e) { o.timeline.push({ stage: 'failed', at: new Date().toISOString(), note: String((e as Error).message) }); }
      save();
    });
    save();
  }
  res.end();
});
app.post('/twilio/status', (req, res) => {
  if (!twilioOk(req)) return res.status(403).end();
  for (const r of db.runs) for (const o of r.suppliers) if (o.providerIds.includes(req.body.MessageSid)) statusMark(o, String(req.body.MessageStatus), req.body.ErrorMessage);
  save(); res.end();
});
app.post('/twilio/whatsapp', async (req, res) => {
  res.type('text/xml').send(twiml.wrap(''));
  if (!twilioOk(req)) return;
  await routeWhatsApp(String(req.body.From || ''), String(req.body.Body || ''), String(req.body.MessageSid || ''), req.body.OriginalRepliedMessageSid);
});

function statusMark(o: Out, s: string, err?: string) {
  const stage = s === 'delivered' ? 'delivered' : s === 'read' ? 'read' : s === 'failed' || s === 'undelivered' ? 'failed' : null;
  const note = stage === 'failed' && /6301[56]|sandbox|not.*join/i.test(err || '') ? `${err} – this number has not joined the Twilio WhatsApp sandbox yet (send the join code to +1 415 523 8886)` : err || s;
  if (stage === 'failed') o.error = note;
  if (stage && !o.timeline.some((t) => t.stage === stage)) o.timeline.push({ stage, at: new Date().toISOString(), note });
}
const seenWa = new Set<string>();
async function routeWhatsApp(from: string, body: string, sid: string, replied?: string) {
  if (seenWa.has(sid)) return; seenWa.add(sid);
  const outs = db.runs.flatMap((r) => r.suppliers).filter((o) => o.channel === 'WhatsApp' && o.mode === 'real' && from.endsWith(o.to.replace(/^\+/, '')));
  if (!outs.length) return;
  const m = body.match(/^\s*\*?([A-E])\*?\s*[:\-.)]/i) || body.match(/RFQ-SRC-\d+-([A-E])/i);
  const target = (replied && outs.find((o) => o.providerIds.includes(replied))) || (m && outs.find((o) => o.letter === m[1].toUpperCase())) || outs[0];
  await addReply(target, body, 'WhatsApp');
}

// ---------- Poll loop (email always; WhatsApp when no webhook) ----------
let polling = false;
let emailFails = 0;
async function poll() {
  if (polling) return; polling = true;
  try {
    const open = db.runs.slice(0, 5).flatMap((r) => r.suppliers).filter((o) => o.mode === 'real' && o.providerIds.length);
    const sentIds = new Set(db.runs.flatMap((r) => r.suppliers.flatMap((o) => o.providerIds)));
    if (open.some((o) => o.channel === 'Email') && sendsInFlight === 0 && emailBackend()) {
      let inbox: Awaited<ReturnType<typeof pollEmail>> = [];
      try { inbox = await pollEmail(); emailFails = 0; if (runtime.emailOk === false) void checkEmail(); }
      catch (err) { if (++emailFails >= 3) { runtime.emailOk = false; runtime.emailErr = String((err as Error).message); } throw err; }
      for (const m of inbox) {
        if (sentIds.has(m.messageId)) continue; // our own RFQ landing in the same mailbox
        if (isAgentText(cleanReply(m.text) || m.text)) { sentIds.add(m.messageId); continue; } // our own message (footer outside any quote)
        const ref = (m.subject + '\n' + m.text).match(/RFQ-(SRC-\d{4})-([A-E])/);
        const f = ref && findOut(`RFQ-${ref[1]}-${ref[2]}`);
        if (!f || f.out.channel !== 'Email') continue;
        const sentAt = f.out.timeline.find((t) => t.stage === 'sent')?.at;
        if (sentAt && Date.parse(m.date) < Date.parse(sentAt) - 30_000) continue; // older mail with a recycled ref
        f.out.providerIds.push(m.messageId); sentIds.add(m.messageId); // never ingest the same message twice
        await addReply(f.out, m.text, 'Email');
      }
    }
    for (const o of open.filter((x) => x.channel === 'WhatsApp')) {
      for (const sid of o.providerIds) { const s = await messageStatus(sid).catch(() => null); if (s) statusMark(o, s.status, s.error || undefined); }
      const since = o.timeline.find((t) => t.stage === 'sent')?.at || new Date().toISOString();
      for (const m of (await inboundWhatsApp(o.to, since).catch(() => [])).reverse()) if (m.date >= since) await routeWhatsApp(`whatsapp:${o.to}`, m.body, m.sid);
    }
    save();
  } catch (err) { console.warn('[poll]', String(err)); } finally { polling = false; }
}
setInterval(poll, cfg.pollMs);
void checkEmail().then((r) => { console.log(`[email] ${emailBackend() || 'none'}: ${r}`); console.log(`[server] modes after channel checks=${JSON.stringify(modes())}`); });
if (cfg.llm.key) void checkLlm().then((r) => console.log(`[llm] ${r}`)); else console.log('[llm] no key – rules parser');
setInterval(() => { if (emailBackend()) void checkEmail(); }, 5 * 60 * 1000);

// ---------- Static app ----------
app.use(express.static(dist, { index: 'index.html' }));
app.get(/^\/(?!api\/|twilio\/|webhook).*/, (req, res, next) => { if (req.method !== 'GET' || path.extname(req.path)) return next(); res.sendFile(path.join(dist, 'index.html')); });

app.listen(cfg.port, '127.0.0.1', () => {
  console.log(`[server] http://127.0.0.1:${cfg.port}  modes=${JSON.stringify({ ...modes(), ...(emailBackend() && runtime.emailOk === null ? { email: 'checking' } : {}) })}`);
  if (cfg.publicBaseUrl === 'auto') {
    const p = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${cfg.port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    const onData = (b: Buffer) => { const m = b.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/); if (m && !runtime.publicBaseUrl) { runtime.publicBaseUrl = m[0]; fs.writeFileSync(path.join(cfg.dataDir, 'public_url.txt'), m[0]); console.log(`[tunnel] ${m[0]}`); } };
    p.stdout.on('data', onData); p.stderr.on('data', onData);
    p.on('exit', (c) => { console.warn('[tunnel] exited', c); process.exit(1); });
  }
});
