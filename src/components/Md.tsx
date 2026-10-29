import React, { useEffect, useState } from 'react';
/** Tiny markdown for AI replies: paragraphs, "-"/"*"/"1." bullets and **bold**. */
const inline = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>);
/** Reveals text progressively, like a streamed chat reply. */
export function useTyped(text: string, on = true) {
  const [n, setN] = useState(on ? 0 : text.length);
  useEffect(() => { if (!on) { setN(text.length); return; } setN(0); const step = Math.max(2, Math.ceil(text.length / 60)); const t = window.setInterval(() => setN((x) => { if (x + step >= text.length) { window.clearInterval(t); return text.length; } return x + step; }), 16); return () => window.clearInterval(t); }, [text, on]);
  return text.slice(0, n);
}
export function Md({ text: full, className = '', typed = false }: { text: string; className?: string; typed?: boolean }) {
  const text = useTyped(full, typed);
  const out: React.ReactNode[] = []; let list: string[] = [];
  const flush = () => { if (list.length) out.push(<ul key={out.length} className="ml-4 list-disc space-y-0.5">{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>); list = []; };
  for (const raw of text.split('\n')) { const l = raw.trim(); const m = l.match(/^([-*•]|\d+[.)])\s+(.*)$/); if (m) { list.push(m[2]); continue; } flush(); if (l) out.push(<p key={out.length}>{inline(l)}</p>); }
  flush();
  return <div className={`space-y-1.5 ${className}`}>{out}</div>;
}
