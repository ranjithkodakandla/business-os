import { useEffect, useState } from 'react';
import { netState, login, type Net } from '../lib/live';

/** Subtle connection pill + passcode prompt when the session expires. Clears itself when calls succeed again. */
export default function NetStatus() {
  const [n, setN] = useState<Net>(netState.get()); const [code, setCode] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => netState.sub(setN), []);
  if (n === 'reconnecting') return (
    <div className="fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1 text-[12px] font-medium text-amber-800 shadow-sm" data-testid="net-reconnecting" role="status">
      <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500 align-middle" />Reconnecting…
    </div>
  );
  if (n !== 'locked') return null;
  const go = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(''); try { await login(code.trim()); setCode(''); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/30 p-4" data-testid="net-locked">
      <form onSubmit={go} className="w-full max-w-xs space-y-3 rounded-2xl bg-white p-5 shadow-xl">
        <div className="text-[15px] font-semibold text-slate-900">Session expired</div>
        <div className="text-[13px] text-slate-500">Enter the passcode to continue. Nothing you typed is lost.</div>
        <input autoFocus type="password" value={code} onChange={(e) => setCode(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[14px] outline-none focus:border-brand-500" placeholder="Passcode" data-testid="net-passcode" />
        {err && <div className="text-[12px] text-rose-600">{err}</div>}
        <button disabled={busy || !code.trim()} className="h-10 w-full rounded-lg bg-brand-600 text-[14px] font-medium text-white disabled:opacity-50">{busy ? 'Checking…' : 'Unlock'}</button>
      </form>
    </div>
  );
}
