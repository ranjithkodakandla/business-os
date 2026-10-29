/** Feature-flag rollout stages. Pure, import-free so rbac.ts can use it. */
export type Stage = 'Off' | 'Internal' | 'Alpha' | 'Beta' | 'Gradual' | 'GA';
export const STAGES: Stage[] = ['Off', 'Internal', 'Alpha', 'Beta', 'Gradual', 'GA'];
export type Rollout = { stage: Stage; alpha: string[]; beta: string[]; pct: number; killed: boolean; history: { at: string; by: string; text: string }[] };
export const INTERNAL = ['t-aarohan']; // vendor's own demo/dogfood tenant
/** Deterministic bucket 0-99 from flag+tenant (FNV-1a). */
export const bucket = (flag: string, tenant: string) => { let h = 2166136261; for (const c of flag + ':' + tenant) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 100; };
export const stageAllows = (r: Rollout | undefined, flag: string, tenant: string) => {
  if (!r) return true; if (r.killed) return false;
  switch (r.stage) { case 'Off': return false; case 'Internal': return INTERNAL.includes(tenant); case 'Alpha': return INTERNAL.includes(tenant) || r.alpha.includes(tenant);
    case 'Beta': return INTERNAL.includes(tenant) || r.alpha.includes(tenant) || r.beta.includes(tenant); case 'Gradual': return INTERNAL.includes(tenant) || bucket(flag, tenant) < r.pct; default: return true; }
};
