// Local mail lab for automated tests: a real SMTP server (2525) and a real IMAP server (1143) on this box.
// Every message is delivered into one IMAP mailbox and also saved as .eml so tools/reply-as-supplier.ts can read it.
import { SMTPServer } from 'smtp-server';
import hoodiecrow from 'hoodiecrow-imap';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data', 'devmail');
fs.mkdirSync(dir, { recursive: true });
const imap: any = hoodiecrow({ plugins: ['IDLE', 'UIDPLUS', 'ENABLE', 'CONDSTORE', 'SPECIAL-USE', 'LITERALPLUS', 'ID', 'NAMESPACE', 'UNSELECT', 'SASL-IR', 'AUTH-PLAIN'], storage: { INBOX: { messages: [] } }, users: { lab: { password: 'lab' } } });
imap.listen(1143, () => console.log('[devmail] IMAP 127.0.0.1:1143 user=lab pass=lab'));
let n = 0;
new SMTPServer({ authOptional: true, disabledCommands: ['STARTTLS'], onData(stream, session, cb) {
  const chunks: Buffer[] = []; stream.on('data', (c) => chunks.push(c)); stream.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    imap.appendMessage('INBOX', [], new Date(), raw);
    const to = session.envelope.rcptTo.map((r) => r.address).join(',');
    fs.writeFileSync(path.join(dir, `${Date.now()}-${++n}.eml`), `X-Lab-Rcpt: ${to}\r\n${raw}`);
    console.log(`[devmail] ${session.envelope.mailFrom && (session.envelope.mailFrom as any).address} -> ${to}`);
    cb();
  });
} }).listen(2525, '127.0.0.1', () => console.log('[devmail] SMTP 127.0.0.1:2525'));
