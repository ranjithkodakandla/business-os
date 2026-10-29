// Test helper: play a supplier in the local mail lab. Finds the latest RFQ sent to +supplier<L> and replies to it.
// usage: npx tsx tools/reply-as-supplier.ts A "Yes, 250 kg in stock. Rs 67/kg, freight 1200, dispatch Friday, Net 45"
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';

const [letter, text] = process.argv.slice(2);
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data', 'devmail');
const files = fs.readdirSync(dir).sort().reverse();
for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const rcpt = raw.match(/^X-Lab-Rcpt: (.*)$/m)?.[1] || '';
  if (!rcpt.includes(`+supplier${letter}@`)) continue;
  const p = await simpleParser(raw);
  const t = nodemailer.createTransport({ host: '127.0.0.1', port: 2525, secure: false, ignoreTLS: true });
  const from = p.from!.value[0].address!;
  await t.sendMail({ from: rcpt, to: from, subject: `Re: ${p.subject}`, inReplyTo: p.messageId, references: p.messageId, text: `${text}\n\nOn ${p.date?.toUTCString()}, ${from} wrote:\n> ${(p.text || '').split('\n').join('\n> ')}` });
  console.log(`replied as ${rcpt} to "${p.subject}"`);
  process.exit(0);
}
console.error('no RFQ found for supplier', letter); process.exit(1);
