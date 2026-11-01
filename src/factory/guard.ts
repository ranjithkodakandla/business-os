/** Guardrail: an AI answer that lists 3+ things as bullets becomes a table, never a bullet wall. */
export function listToTable(md: string): { lead: string; table: { cols: string[]; rows: string[][] } } | null {
  const lines = md.split('\n'); const items: string[] = []; const rest: string[] = [];
  for (const l of lines) { const m = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/); if (m) items.push(m[1].replace(/\*\*/g, '').trim()); else if (l.trim()) rest.push(l); }
  if (items.length < 3) return null;
  const parts = items.map((it) => it.split(/\s+[–—-]\s+|:\s+|\s*\|\s*/).map((x) => x.trim()).filter(Boolean));
  const n = Math.min(4, Math.max(...parts.map((p) => p.length)));
  const rows = parts.map((p) => { const r = p.slice(0, n - 1); r.push(p.slice(n - 1).join(' – ')); while (r.length < n) r.push(''); return r; });
  const cols = n === 1 ? ['Item'] : n === 2 ? ['Item', 'Details'] : ['Item', ...Array.from({ length: n - 1 }, (_, i) => (i === n - 2 ? 'Details' : `Info ${i + 1}`))];
  return { lead: rest.join('\n').trim(), table: { cols, rows } };
}
