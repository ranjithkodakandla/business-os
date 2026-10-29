import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, Lightbulb, FileCheck2, Users, Award, CheckCircle2, Send, Inbox } from 'lucide-react';
import { useStore } from '../lib/store';
import { REQ, stockCheck, ranked, scoreOf, confidenceOf, landed, sentMessage, replyView, channelFor, contactOf, callPoints, pickFor, poDraftLines, poDraftTotal, SourceOption, channelLabel } from '../lib/sourcing';
import { startSourcing, createPoDraft, runApproval } from '../lib/actions';
import { inr, lakh, fmtShort } from '../lib/format';
import { PageHeader, Card, Button, Badge, Segmented, Callout, cx } from '../components/ui';
import OutreachLive, { ChannelBadge, SimNote } from '../components/Outreach';
import CallPanel, { CallSpec } from '../components/CallPanel';

const ITEMS = [{ sku: 'RM-A17', label: 'A-17 housings · short 150' }, { sku: 'CP-6204', label: 'Bearings 6204-2RS · short 68' }];

export default function Sourcing() {
  const ctx = useStore();
  const { s, update, toast } = ctx;
  const nav = useNavigate();
  const [item, setItem] = useState('RM-A17');
  const opts = ranked(s, item);
  const [sel, setSel] = useState<string | null>(null);
  const cur = opts.find((o) => o.id === sel) || opts[0];
  const [call, setCall] = useState<{ spec: CallSpec; o: SourceOption } | null>(null);
  const st = s.sourcing.status;
  const rows = stockCheck(s);
  const pick = (o: SourceOption) => update((d) => { d.sourcing.picks[o.sku] = o.id; }, `Picked ${contactOf(s, o.contactId).supplier} for ${o.sku} (${REQ.id})`);
  const openCall = (o: SourceOption) => { const c = contactOf(s, o.contactId); setCall({ o, spec: { name: c.person, org: c.supplier, phone: c.phone, language: c.language, context: `${REQ.id} · ${o.reply.qty} × ${o.sku === 'RM-A17' ? 'A-17 housings' : '6204 bearings'} for ${REQ.customer}`, points: callPoints(s, o), tips: o.tips } }); };
  const endCall = (notes: string) => {
    if (!call) return;
    update((d) => { d.sourcing.calls.push(call.o.id); }, `Call with ${call.spec.name} (${call.spec.org}) – simulated, notes saved${notes ? `: ${notes.slice(0, 60)}` : ''}`);
    toast('Call notes saved to the supplier record (simulated call)');
    setCall(null);
  };
  const poLabel = s.sourcing.poApproved ? 'PO-0922 & PO-0923 approved – not sent' : s.sourcing.poDraft ? 'PO drafts waiting in Approvals' : 'Create PO draft for review';
  return (
    <div className="space-y-4">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Procurement', to: '/procurement' }, { label: `Sourcing · ${REQ.id}` }]} title={`Sourcing results · ${REQ.customer}`}
        subtitle={`${REQ.qty} × ${REQ.product} · due ${fmtShort(REQ.due)} · parts needed in stores by ${fmtShort(REQ.inStoresBy)}`} badge={<SimNote>Supplier replies simulated</SimNote>}
        actions={<><Button variant="success" onClick={() => nav('/sourcing/live')}>Live agent (real)</Button><Button icon={<Users size={14} />} onClick={() => nav('/suppliers')}>Supplier contacts</Button>
          <Button variant="primary" data-testid="create-po-draft" icon={<FileCheck2 size={14} />} disabled={st !== 'done' || s.sourcing.poDraft} onClick={() => createPoDraft(ctx)}>{poLabel}</Button></>} />
      <Card title="Stock check" subtitle="Bill of materials × 150, against live stock">
        <div className="grid grid-cols-5 gap-2">
          {rows.map((r) => (
            <div key={r.sku} data-stock={r.sku} className={cx('rounded-lg border p-2.5', r.short ? 'border-rose-200 bg-rose-50/50' : 'border-emerald-200 bg-emerald-50/40')}>
              <div className="text-2xs font-medium uppercase text-slate-500">{r.sku}</div>
              <div className="text-[13px] font-medium text-slate-800">{r.label}</div>
              <div className="mt-1 text-2xs text-slate-500">Need {r.need} {r.unit} · free {r.free}</div>
              <div className={cx('mt-0.5 text-[12.5px] font-semibold', r.short ? 'text-rose-600' : 'text-emerald-700')}>{r.short ? `Short ${r.short} → buy ${r.buy}` : 'Covered'}</div>
            </div>
          ))}
        </div>
      </Card>
      {st === 'idle' && <Callout tone="blue" title="No enquiries sent yet" action={<Button size="sm" variant="primary" data-testid="start-sourcing" onClick={() => startSourcing(ctx)}>Review & send 6 enquiries</Button>}>The Sourcing agent will ask 3 suppliers per short part on their preferred channel. You approve before anything goes out.</Callout>}
      {st === 'running' && <OutreachLive flow="sourcing" />}
      {st === 'done' && (<>
        <Callout tone="green" icon={<Award size={16} />} title="Recommended: Deccan Castings for A-17 · Balaji Bearings for 6204 bearings">
          Deccan lands all 150 by Sat 7 Nov (2 days of buffer) at ₹4,820 – close to your last price. Balaji delivers 100 bearings tomorrow at ₹176. PO drafts total {lakh(poDraftTotal(s))} with GST: {poDraftLines(s).map((l) => `${l.c.supplier} (${l.o.reply.qty} pcs)`).join(' + ')}.
        </Callout>
        <div className="flex items-center justify-between">
          <Segmented value={item} onChange={(v) => { setItem(v); setSel(null); }} options={ITEMS.map((i) => ({ value: i.sku, label: i.label }))} />
          <div className="text-2xs text-slate-500">Score = landed price 35% · in stores by {fmtShort(REQ.inStoresBy)} 30% · terms 15% · on-time & quality 20%</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {opts.map((o, i) => {
            const c = contactOf(s, o.contactId); const chosen = pickFor(s, o.sku).id === o.id;
            return (
              <button key={o.id} data-option={o.id} onClick={() => setSel(o.id)} className={cx('rounded-lg border bg-white p-3.5 text-left shadow-card transition', cur.id === o.id ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-200')}>
                <div className="flex items-start justify-between">
                  <div><div className="flex items-center gap-1.5"><Badge tone={i === 0 ? 'green' : 'gray'}>#{i + 1}{i === 0 ? ' Best overall' : ''}</Badge>{chosen && <Badge tone="blue">In PO draft</Badge>}</div>
                    <div className="mt-1.5 text-[14px] font-semibold text-slate-900">{c.supplier}</div><div className="text-2xs text-slate-500">{c.person} · {c.city}</div></div>
                  <div className="text-right"><div className="text-2xl font-semibold tabular text-slate-900">{scoreOf(s, o)}</div><div className="text-2xs text-slate-400">score</div></div>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
                  <span className="text-slate-500">Available</span><span className="text-right font-medium">{o.reply.qty} pcs{o.reply.qty < (o.sku === 'RM-A17' ? 150 : 100) ? ' (partial)' : ''}</span>
                  <span className="text-slate-500">In stores by</span><span className="text-right font-medium">{fmtShort(o.reply.arrives)}</span>
                  <span className="text-slate-500">Unit price</span><span className="text-right font-medium">₹{o.reply.price.toLocaleString('en-IN')}</span>
                  <span className="text-slate-500">Landed total</span><span className="text-right font-medium">{inr(landed(o))}</span>
                  <span className="text-slate-500">Terms</span><span className={cx('text-right font-medium', /advance|Cash/.test(o.reply.terms) && 'text-rose-600')}>{o.reply.terms}</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between"><ChannelBadge c={channelFor(s, o)} /><span className="text-2xs text-slate-500">confidence {confidenceOf(s, o)}%</span></div>
              </button>
            );
          })}
        </div>
        <SentVsReplied o={cur} onCall={() => openCall(cur)} onPick={() => pick(cur)} />
      </>)}
      {s.sourcing.poDraft && !s.sourcing.poApproved && <Callout tone="amber" title="PO drafts are waiting for your approval" action={<Button size="sm" variant="primary" data-testid="approve-src-po" onClick={() => runApproval(ctx, 'apr-src-po')}>Review & approve</Button>}>Nothing is sent or ordered until you approve – and even then, POs are sent separately.</Callout>}
      <CallPanel spec={call?.spec || null} onClose={() => setCall(null)} onEnd={endCall} />
    </div>
  );
}

function SentVsReplied({ o, onCall, onPick }: { o: SourceOption; onCall: () => void; onPick: () => void }) {
  const { s } = useStore();
  const c = contactOf(s, o.contactId); const ch = channelFor(s, o); const rv = replyView(s, o); const chosen = pickFor(s, o.sku).id === o.id;
  return (
    <Card title={`${c.supplier} · what we sent and what they replied`} subtitle={`${channelLabel(ch)} to ${c.person} · ${c.language}`} actions={<><Button size="sm" data-testid="pick-option" disabled={chosen} onClick={onPick}>{chosen ? 'In PO draft' : 'Use this option'}</Button><Button size="sm" variant="primary" data-testid="call-now" icon={<PhoneCall size={13} />} onClick={onCall}>Call now</Button></>}>
      <div className="grid grid-cols-2 gap-3" data-testid="sent-replied">
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase text-slate-500"><Send size={12} /> What we sent <ChannelBadge c={ch} /></div>
          <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-slate-700">{sentMessage(s, o)}</pre>
        </div>
        <div className={cx('rounded-lg border p-3', rv.kind === 'WhatsApp' ? 'border-emerald-200 bg-emerald-50/50' : rv.kind === 'Call' ? 'border-violet-200 bg-violet-50/40' : 'border-sky-200 bg-sky-50/40')}>
          <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase text-slate-500"><Inbox size={12} /> What they replied · {rv.head}</div>
          <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-slate-800">{rv.text}</pre>
          {rv.quotes.length > 0 && <div className="mt-2 space-y-1">{rv.quotes.map((q) => <div key={q} className="border-l-2 border-violet-300 pl-2 text-[12.5px] italic text-slate-600">“{q}”</div>)}</div>}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-1.5 flex items-center justify-between text-2xs font-semibold uppercase text-slate-500"><span className="flex items-center gap-1.5"><CheckCircle2 size={12} /> Captured response</span><Badge tone={confidenceOf(s, o) >= 90 ? 'green' : 'amber'}>confidence {confidenceOf(s, o)}%</Badge></div>
          <div data-testid="captured" className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
            <span className="text-slate-500">Has it?</span><span>{o.reply.qty ? 'Yes' : 'No'}{o.reply.make ? ` · ${o.reply.make}` : ''}</span>
            <span className="text-slate-500">Quantity</span><span>{o.reply.qty} pcs{o.reply.lots ? ` · ${o.reply.lots}` : ''}</span>
            <span className="text-slate-500">In stores by</span><span>{fmtShort(o.reply.arrives)}</span>
            <span className="text-slate-500">Price</span><span>₹{o.reply.price.toLocaleString('en-IN')}/pc · freight {o.reply.freight ? inr(o.reply.freight) : 'free'}</span>
            <span className="text-slate-500">Terms</span><span>{o.reply.terms}</span>
            <span className="text-slate-500">Landed (excl. GST)</span><span className="font-semibold">{inr(landed(o))}</span>
          </div>
          {ch === 'Call' && <div className="mt-2 text-2xs text-amber-700">Verbal reply – ask for written confirmation before the PO.</div>}
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3" data-testid="nego-tips">
          <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase text-amber-700"><Lightbulb size={12} /> Negotiation tips</div>
          <ul className="list-disc space-y-1 pl-4 text-[12.5px] text-slate-700">{o.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>
    </Card>
  );
}
