// Voice call script (TwiML) and redial policy – pure functions so they can be unit-tested without Twilio.
import { cfg, runtime } from './config';
import { twiml } from './channels/twilio';
import { CALL_QUESTIONS, type Out } from './agent';

export const QS = (_o: Out) => CALL_QUESTIONS.map((q) => `${q} Please answer now.`);
// Screening-friendly opening (iOS "Screen Unknown Callers", Android call screen, voicemail-like prompts): say who we are twice,
// then listen. A screener asking for a name/reason, or speech that is not a person saying hello, gets the intro again and ~8 s to pick up.
export const SCREENER = /\b(your name|name and|reason|record|screen(ing|ed)?|stay on the line|see if|is available|leave a message|after the (tone|beep)|google assistant|virtual assistant)\b/i;
export const HUMAN = /\b(hello|hallo|hi|hey|yes|yeah|haan|ha|ji|speaking|namaste|ok(ay)?|go ahead|tell me|bolo|boliye|who)\b/i;
export function screenVerdict(said: string, digits: string): 'human' | 'screener' | 'silence' {
  if (digits) return 'human';
  const t = said.trim(); if (!t) return 'silence';
  if (SCREENER.test(t)) return 'screener';
  if (/\d/.test(t) || HUMAN.test(t)) return 'human';
  return 'screener'; // speech with no digits and no greeting: most likely a screener / assistant prompt
}
const introLine = (o: Out, item: string) => `Hello, this is the Business Workspace sourcing assistant, calling on behalf of Ranjith from ${cfg.company.split(',')[0]} about a quote request for ${item}.`;
export function voiceTwiml(o: Out, run: { ask: { title: string; enquiry: string }; request: { needBy: string | null } }, step: string, said = '', digits = '') {
  const base = `${runtime.publicBaseUrl}/twilio/voice/${o.ref}`; const item = run.ask.title.slice(0, 120); const intro = introLine(o, item);
  const listen = (next: string, prompt: string, timeout: number) => `<Gather input="speech dtmf" language="${cfg.twilio.voiceLang}" speechTimeout="auto" timeout="${timeout}" numDigits="1" actionOnEmptyResult="true" action="${base}/${next}" method="POST">${twiml.say(prompt)}</Gather><Redirect method="POST">${base}/${next}</Redirect>`;
  if (step === '0') return twiml.wrap(`<Pause length="1"/>${twiml.say(intro)}<Pause length="1"/>${twiml.say(intro)}` + listen('screen1', 'Please say hello, or press any key, to continue.', 6));
  const m = /^screen(\d)$/.exec(step);
  if (m) {
    const round = Number(m[1]); const v = screenVerdict(said, digits);
    if (v !== 'human' && round < 2) { o.callScreened ||= v === 'screener'; return twiml.wrap(twiml.say(`${intro} Please pick up when you can – I will wait.`) + listen(`screen${round + 1}`, 'Say hello, or press any key, when you are ready.', 8)); }
    if (v === 'screener') o.callScreened = true;
    const by = run.request.needBy ? new Date(run.request.needBy + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : '';
    const body = `Namaste ${o.person}. Reference ${o.letter}. We have an enquiry. ${run.ask.enquiry.slice(0, 500)}${by ? ` We need this by ${by}.` : ''}`;
    return twiml.wrap(twiml.say(body) + twiml.gather(`${base}/1`, QS(o)[0]) + `<Redirect method="POST">${base}/1</Redirect>`);
  }
  const n = Number(step); const qs = QS(o);
  if (n < qs.length) return twiml.wrap(twiml.gather(`${base}/${n + 1}`, qs[n]) + `<Redirect method="POST">${base}/${n + 1}</Redirect>`);
  return twiml.wrap(twiml.say('Thank you. We will confirm in writing. This is not an order. Goodbye.') + '<Hangup/>');
}
// Retry once ~60 s later when the call wasn't answered or ended with nothing captured; say why on the timeline.
export const CALL_RETRY_MS = Number(process.env.CALL_RETRY_MS || 60000);
export function callEnded(o: Out, status: string, redial: () => Promise<void>) {
  const unanswered = ['busy', 'no-answer', 'failed', 'canceled'].includes(status);
  if (status !== 'completed' && !unanswered) return;
  if (o.callGotAnswers || o.replies.some((r) => r.via === 'Call')) return;
  const why = o.callScreened ? 'Screened' : unanswered ? 'No answer' : 'Answered, no answers captured';
  if ((o.callAttempts || 1) < 2) {
    o.timeline.push({ stage: 'retrying', at: new Date().toISOString(), note: `${why}, retrying in ${Math.round(CALL_RETRY_MS / 1000)} s` });
    setTimeout(() => { void redial(); }, CALL_RETRY_MS);
  } else o.timeline.push({ stage: 'failed', at: new Date().toISOString(), note: `${why} – tried twice. Call them from the phone link, or wait for email/WhatsApp.` });
}
