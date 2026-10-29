// Local stand-in for the Apps Script web app. It runs the REAL gmail-bridge.gs in a sandbox with a fake GmailApp
// (an in-memory mailbox for ranjith302@gmail.com), and mimics Apps Script's HTTP behaviour:
// POST/GET /macros/s/MOCK/exec -> 302 -> GET /macros/echo?user_content_key=… (POST to the echo URL is rejected).
// Test hooks: POST /mock/reply {letter, text} = "the user replies in Gmail"; GET /mock/log = every message.
// Nothing here talks to the internet.
import express from 'express';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ME = 'ranjith302@gmail.com';
type Msg = { id: string; threadId: string; from: string; to: string; subject: string; date: Date; body: string };
const mail: Msg[] = [];
const newId = () => crypto.randomBytes(8).toString('hex');
const wrap = (m: Msg) => ({ getId: () => m.id, getFrom: () => m.from, getTo: () => m.to, getSubject: () => m.subject, getDate: () => m.date, getPlainBody: () => m.body, getThread: () => thread(m.threadId) });
const thread = (tid: string) => ({ getId: () => tid, getMessages: () => mail.filter((m) => m.threadId === tid).map(wrap) });
const GmailApp = {
  createDraft: (to: string, subject: string, body: string, opts: { name?: string } = {}) => ({
    send: () => {
      const base = subject.replace(/^(re:\s*)+/i, '');
      const t = mail.find((m) => m.subject.replace(/^(re:\s*)+/i, '') === base);
      const m: Msg = { id: newId(), threadId: t ? t.threadId : newId(), from: `${opts.name || 'Ranjith Kumar'} <${ME}>`, to, subject, date: new Date(), body };
      mail.push(m); return wrap(m);
    },
  }),
  search: (q: string, start: number, max: number) => [...new Set(mail.filter((m) => /RFQ-SRC/.test(m.subject)).map((m) => m.threadId))].slice(start, start + max).map(thread),
};
const ContentService = { MimeType: { JSON: 'json' }, createTextOutput: (s: string) => ({ s, setMimeType() { return this; } }) };
const Session = { getEffectiveUser: () => ({ getEmail: () => ME }) };
const sandbox: any = { GmailApp, ContentService, Session, JSON, Date, String, Math };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../gmail-bridge.gs', import.meta.url), 'utf8'), sandbox);

const app = express();
const results = new Map<string, string>();
const stash = (out: { s: string }) => { const k = newId(); results.set(k, out.s); return `/macros/echo?user_content_key=${k}`; };
export const calls: string[] = [];
app.get('/macros/s/MOCK/exec', (_req, res) => { calls.push('GET exec'); res.redirect(302, stash(sandbox.doGet({}))); });
app.post('/macros/s/MOCK/exec', express.text({ type: '*/*' }), (req, res) => { calls.push('POST exec'); res.redirect(302, stash(sandbox.doPost({ postData: { contents: req.body } }))); });
app.get('/macros/echo', (req, res) => { const k = String(req.query.user_content_key); const v = results.get(k); if (!v) return res.status(404).send('<html>gone</html>'); res.type('application/json').send(v); });
app.post('/macros/echo', (_req, res) => { calls.push('POST echo (wrong)'); res.status(405).send('<html>Method not allowed</html>'); });
app.post('/mock/reply', express.json(), (req, res) => {
  const L = String(req.body.letter).toUpperCase();
  const orig = [...mail].reverse().find((m) => m.to.toLowerCase().includes(`+supplier${L.toLowerCase()}@`));
  if (!orig) return res.status(404).json({ error: 'no RFQ to that supplier yet' });
  // Gmail: replying to a message you sent yourself goes back to the original recipient, From is still you.
  const quoted = orig.body.split('\n').map((l) => `> ${l}`).join('\n');
  // Supplier D is played by a friend from his own Gmail: his reply goes to the sender (ranjith302@gmail.com).
  const friend = !orig.to.toLowerCase().startsWith('ranjith302+');
  const m: Msg = { id: newId(), threadId: orig.threadId, from: friend ? 'Saad Ansari <saad1085@gmail.com>' : `Ranjith Kumar <${ME}>`, to: friend ? ME : orig.to, subject: `Re: ${orig.subject.replace(/^(re:\s*)+/i, '')}`, date: new Date(),
    body: `${req.body.text}\n\nOn Wed, 28 Oct 2026 at 16:40, Aarohan Industries – Purchase <\n${ME}> wrote:\n\n${quoted}\n` };
  mail.push(m); res.json({ ok: true, id: m.id, subject: m.subject });
});
// ---- Mock Twilio (Messages API) ----
type Wa = { sid: string; to: string; from: string; body: string; status: string; direction: string; date_created: string; error_code: number | null };
const wa: Wa[] = []; const joined = new Set<string>(['whatsapp:+919966012363']);
const formBody = express.urlencoded({ extended: false });
app.post('/2010-04-01/Accounts/:sid/Messages.json', formBody, (req, res) => {
  const m: Wa = { sid: 'SM' + newId(), to: req.body.To, from: req.body.From, body: req.body.Body, status: 'queued', direction: 'outbound-api', date_created: new Date().toUTCString(), error_code: null };
  wa.push(m); res.status(201).json(m);
  // Twilio accepts the request, then fails it with 63015 when the recipient has not joined the sandbox.
  setTimeout(() => { if (joined.has(m.to)) m.status = 'delivered'; else { m.status = 'failed'; m.error_code = 63015; } }, 800);
});
app.get('/2010-04-01/Accounts/:sid/Messages/:msid.json', (req, res) => { const m = wa.find((x) => x.sid === req.params.msid.replace(/\.json$/, '')); m ? res.json({ ...m, error_message: null }) : res.status(404).json({ message: 'not found' }); });
app.get('/2010-04-01/Accounts/:sid/Messages.json', (req, res) => res.json({ messages: wa.filter((m) => (!req.query.From || m.from === req.query.From) && (!req.query.To || m.to === req.query.To)).slice().reverse() }));
app.post('/mock/wa-reply', express.json(), (req, res) => { const m: Wa = { sid: 'SM' + newId(), to: 'whatsapp:+14155238886', from: `whatsapp:${req.body.from}`, body: req.body.body, status: 'received', direction: 'inbound', date_created: new Date().toUTCString(), error_code: null }; wa.push(m); res.json({ ok: true }); });
app.post('/mock/wa-join', express.json(), (req, res) => { joined.add(`whatsapp:${req.body.phone}`); res.json({ ok: true }); });
app.get('/mock/wa-log', (_req, res) => res.json(wa));
app.get('/mock/log', (_req, res) => res.json({ calls, mail }));
const port = Number(process.env.MOCK_PORT || 8796);
app.listen(port, '127.0.0.1', () => console.log(`[mock-bridge] http://127.0.0.1:${port}/macros/s/MOCK/exec`));
