// Hard safety gate. Every outbound adapter calls assertAllowed() immediately before it talks to a provider.
import { cfg } from './config';

export class BlockedRecipient extends Error {}
const normPhone = (p: string) => p.replace(/^whatsapp:/, '').replace(/[^\d+]/g, '');

export function emailAllowed(addr: string) {
  const a = addr.trim().toLowerCase();
  return cfg.allowEmails.includes(a);
}
export function phoneAllowed(p: string) {
  const n = normPhone(p);
  return !!n && cfg.allowPhones.map(normPhone).includes(n);
}
export function assertAllowed(kind: 'email' | 'phone', to: string) {
  const ok = kind === 'email' ? emailAllowed(to) : phoneAllowed(to);
  if (!ok) throw new BlockedRecipient(`Blocked: ${to} is not on the test-recipient allowlist`);
}
