// Inventory + supplier directory, read straight from the app's own data files so stock and contacts match the UI.
import { skus as SEED_SKUS, type Sku } from '../../src/lib/data';
import { CONTACTS, type SupplierContact, type Channel } from '../../src/lib/sourcing';
import { cfg } from './config';

export type { Sku, SupplierContact, Channel };
export const seedSkus = SEED_SKUS;
export const contacts = CONTACTS;

// Weight per stock unit, so "2000 kg MS sheet" converts to sheets (2500 x 1250 mm sheet: 7.85 kg/m2/mm).
export const KG_PER_UNIT: Record<string, number> = { 'RM-MS2': 49.1, 'RM-MS5': 122.7, 'RM-A17': 2.1 };

// Words owners actually use for each item (deterministic matcher; the LLM path also returns a SKU).
export const ALIASES: Record<string, string[]> = {
  'RM-MS2': ['ms sheet 2', '2mm ms', '2 mm ms', 'crca 2', 'ms sheet', 'mild steel sheet', 'steel sheet'],
  'RM-MS5': ['ms sheet 5', '5mm ms', '5 mm ms', 'ms plate 5'],
  'RM-A17': ['a-17', 'a17', 'housing', 'casting'],
  'CP-6204': ['6204', 'bearing'],
  'CP-GSK65': ['gasket'],
};

// Demo routing: supplier #k in a run is played by test identity k (A–E). Real supplier addresses are never used.
// A–C default to the presenter (TEST_SUPPLIER_EMAIL_BASE plus-tags / TEST_SUPPLIER_PHONE); any letter can be routed
// to another volunteer with SUPPLIER_ROUTES, e.g. "D:email:friend+supplierD@gmail.com;E:phone:+9198…".
// Every address still has to be on the allowlist (src/allowlist.ts) or the send is blocked.
export const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const routes = new Map<string, string>();
for (const part of (process.env.SUPPLIER_ROUTES || '').split(';').map((x) => x.trim()).filter(Boolean)) {
  const [letter, kind, ...rest] = part.split(':'); if (letter && kind && rest.length) routes.set(`${letter.toUpperCase()}:${kind.toLowerCase()}`, rest.join(':').trim());
}
export function testEmailFor(letter: string) {
  const r = routes.get(`${letter}:email`); if (r) return r;
  const base = cfg.testEmailBase; if (!base) return '';
  const [local, domain] = base.split('@');
  return `${local}+supplier${letter}@${domain}`;
}
export function testPhoneFor(letter: string) { return routes.get(`${letter}:phone`) || cfg.testPhone; }
/** Who plays this supplier (shown next to the neutral "Supplier X" name), e.g. "D:name:Saad Ansari". */
export function testNameFor(letter: string) { return routes.get(`${letter}:name`) || process.env.TEST_SUPPLIER_NAME || 'Test supplier'; }
const DEFAULT_CHANNEL: Record<string, Channel> = { A: 'Email', B: 'WhatsApp', C: 'Call', D: 'Email', E: 'WhatsApp' };
/** Preferred channel per test supplier; override with "A:channel:WhatsApp" in SUPPLIER_ROUTES. */
export function channelFor(letter: string): Channel {
  const r = routes.get(`${letter}:channel`); const c = r && (['Email', 'WhatsApp', 'Call'] as Channel[]).find((x) => x.toLowerCase() === r.toLowerCase());
  return c || DEFAULT_CHANNEL[letter] || 'Email';
}
