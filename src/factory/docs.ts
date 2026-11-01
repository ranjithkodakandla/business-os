/** Reading uploaded documents (PDF text, image OCR), pulling out licence / tender fields, and building the tender bid ZIP. Heavy libraries load only when used. */
import { COMPANY, SITES, DOCS, docById, daysTo, fmtD, inr, type SiteId } from './data';
import { PROFILE } from './more';

export async function readFile(f: File): Promise<{ text: string; how: 'pdf' | 'ocr' | 'text' }> {
  if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise; const out: string[] = [];
    for (let i = 1; i <= Math.min(doc.numPages, 8); i++) {
      const c = await (await doc.getPage(i)).getTextContent(); let line = ''; let y: number | null = null;
      for (const it of c.items as { str: string; transform: number[] }[]) { const yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 2) { out.push(line); line = ''; } line += (line && !line.endsWith(' ') ? ' ' : '') + it.str; y = yy; }
      out.push(line);
    }
    return { text: out.join('\n').replace(/[ \t]+/g, ' '), how: 'pdf' };
  }
  if (f.type.startsWith('image/')) {
    const T = await import('tesseract.js'); const r = await T.recognize(f, 'eng'); return { text: r.data.text, how: 'ocr' };
  }
  return { text: await f.text(), how: 'text' };
}

const DATE = String.raw`(\d{1,2})[-/. ](\d{1,2}|[A-Za-z]{3,9})[-/. ,]+(\d{4})`;
const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
export const toIso = (d: string, m: string, y: string) => { const mm = /\d/.test(m) ? +m : MON[m.slice(0, 3).toLowerCase()] || 0; return mm ? `${y}-${String(mm).padStart(2, '0')}-${String(+d).padStart(2, '0')}` : ''; };
const dateAfter = (t: string, label: string) => { const m = t.match(new RegExp(`(?:${label})[^\\n\\d]{0,20}${DATE}`, 'i')); return m ? toIso(m[1], m[2], m[3]) : ''; };
export const siteOf = (t: string): SiteId | '' => /cherlapally|site ?1\b/i.test(t) ? 'S1' : /hosur|krishnagiri|site ?2\b/i.test(t) ? 'S2' : /medak|site ?3\b/i.test(t) ? 'S3' : '';

export type LicFields = { kind: string; number: string; authority: string; site: SiteId | ''; issued: string; expires: string };
export function parseLicence(t: string): LicFields {
  const kind = /fire/i.test(t) ? 'Fire NOC' : /pollution|consent/i.test(t) ? 'Pollution Board CTO' : /contract labour|clra/i.test(t) ? 'Contract labour licence (CLRA)' : /trade licen/i.test(t) ? 'Trade licence' : /factory licen|factories/i.test(t) ? 'Factory licence' : /electric/i.test(t) ? 'Electrical safety' : /metrology|weights/i.test(t) ? 'Weights & measures' : /iso/i.test(t) ? 'ISO certificate' : '';
  const num = t.match(/(?:licen[cs]e|noc|order|certificate|registration|consent order)\s*no\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9/\-]{4,})/i)?.[1] || '';
  const auth = t.match(/(?:issuing authority|issued by)\s*[:\-]?\s*([^\n]+)/i)?.[1]?.trim() || t.split('\n').find((l) => /board|department|services|municipal|corporation|inspector|directorate/i.test(l))?.trim() || '';
  return { kind, number: num, authority: auth.replace(/\s+/g, ' ').slice(0, 90), site: siteOf(t),
    issued: dateAfter(t, 'date of issue|issued on|issue date|dated'), expires: dateAfter(t, 'valid up ?to|valid till|valid until|validity upto|expiry date|expires on|valid upto') };
}

export type TenderFields = { buyer: string; number: string; item: string; qty: number; unit: string; due: string; minTurnoverCr: number | null; certs: string[]; similarOrders: number | null; emd: number | null; msmeExempt: boolean; other: string[]; family: 'rf' | 'drone' | 'packaging' | 'other' };
export function parseTender(t: string): TenderFields {
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  const num = t.match(/tender\s*no\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9/\-]{4,})/i)?.[1] || '';
  const buyer = (lines.find((l) => /limited|ltd|mission|corporation|board|department|authority/i.test(l) && !/^issued to|^name/i.test(l)) || '').replace(/\s*-\s*Tender.*$/i, '').replace(/^Tender No:?\s*\S+\s*-\s*/i, '').slice(0, 80);
  const item = (t.match(/(?:item|subject|supply of)\s*[:\-]?\s*([^\n]+)/i)?.[1] || '').replace(/^supply of\s*/i, '').replace(/,\s*[\d,]+ units.*$/i, '').slice(0, 100);
  const q = t.match(/quantity\s*[:\-]?\s*([\d,]+)\s*([a-z]+)?/i) || t.match(/([\d,]{3,})\s*(units|nos|pcs|drones|boxes)/i);
  const to = t.match(/turnover[^\n]{0,80}?(?:rs\.?|₹|inr)\s*([\d.]+)\s*(crore|cr|lakh)/i);
  const emd = t.match(/emd\s*[:\-]?\s*(?:rs\.?|₹|inr)\s*([\d,]+)/i);
  const sim = t.match(/(?:minimum|min\.?|at least)\s*(\d+)\s*(?:similar|orders)|similar[^\n]{0,60}?minimum\s*(\d+)/i);
  const certs = [...new Set([...t.matchAll(/ISO\s*\d{4,5}|IPC-A-\d+|DGCA type certificate|factory licence/gi)].map((m) => m[0].replace(/\s+/g, ' ').replace(/^iso/i, 'ISO').replace(/^dgca/i, 'DGCA')))];
  const fam = /drone|uav|spray/i.test(t) ? 'drone' : /rf|transceiver|antenna|telecom|module/i.test(t) ? 'rf' : /carton|corrugat|box|packag/i.test(t) ? 'packaging' : 'other';
  const other = [/service centre[^\n.]*/i, /manufacturer[^\n.]*/i, /pilot training[^\n.]*/i].map((r) => t.match(r)?.[0]).filter(Boolean) as string[];
  return { buyer, number: num, item, qty: q ? +q[1].replace(/,/g, '') : 0, unit: q?.[2] || 'units', due: dateAfter(t, 'bid due date|due date|bid due|closing date|last date'),
    minTurnoverCr: to ? +to[1] / (/lakh/i.test(to[2]) ? 100 : 1) : null, certs, similarOrders: sim ? +(sim[1] || sim[2]) : null, emd: emd ? +emd[1].replace(/,/g, '') : null,
    msmeExempt: /(mse|msme|micro and small)[^\n.]{0,60}exempt/i.test(t) && !/no exemption/i.test(t), other, family: fam };
}
/** Merge AI fields over the rules: rules win for numbers and dates they found, AI fills gaps. */
export function merge<T extends Record<string, unknown>>(rule: T, ai: Record<string, unknown> | null): T {
  if (!ai) return rule; const out: Record<string, unknown> = { ...rule };
  for (const k of Object.keys(rule)) { const r = rule[k]; const a = ai[k]; const empty = r === '' || r === null || r === 0 || (Array.isArray(r) && !r.length); if (empty && a !== undefined && a !== null && a !== '') out[k] = a; }
  return out as T;
}
export async function aiExtract(kind: 'licence' | 'tender', text: string): Promise<Record<string, unknown> | null> {
  try { const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 11000); const r = await fetch('/api/fx/extract', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, text }), signal: ctl.signal }); clearTimeout(tm); const j = await r.json(); return j.ok ? j.fields : null; } catch { return null; }
}

/* ── Tender bid ZIP ── */
export type BidInput = { t: TenderFields; price: number; perUnit: number; checks: { label: string; ok: boolean | null; have: string }[] };
export async function buildBidZip(b: BidInput): Promise<{ blob: Blob; name: string; files: string[] }> {
  const [{ jsPDF }, JSZip] = await Promise.all([import('jspdf'), import('jszip').then((m) => m.default)]);
  const zip = new JSZip(); const files: string[] = []; const today = fmtD(new Date().toISOString().slice(0, 10));
  const pdf = (name: string, title: string, body: (string | [string, string])[]) => {
    const d = new jsPDF({ unit: 'mm', format: 'a4' }); let y = 20;
    d.setFont('helvetica', 'bold'); d.setFontSize(13); d.text(COMPANY.name + ' (fictional)', 20, y); y += 5; d.setFont('helvetica', 'normal'); d.setFontSize(8.5);
    d.text(`Plot 14, IDA Cherlapally, Hyderabad 500051 · GSTIN ${COMPANY.gstin} · ${COMPANY.udyam}`, 20, y); y += 4; d.line(20, y, 190, y); y += 9;
    d.setFont('helvetica', 'bold'); d.setFontSize(12); d.text(title, 20, y); y += 8; d.setFontSize(10);
    for (const ln of body) {
      if (Array.isArray(ln)) { d.setFont('helvetica', 'bold'); d.text(ln[0], 20, y); d.setFont('helvetica', 'normal'); const w = d.splitTextToSize(ln[1], 110); d.text(w, 80, y); y += 5.5 * w.length + 1; }
      else { d.setFont('helvetica', 'normal'); const w = d.splitTextToSize(ln.replace(/₹/g, 'Rs '), 170); d.text(w, 20, y); y += 5.2 * w.length + 1.5; }
      if (y > 275) { d.addPage(); y = 20; }
    }
    d.setFontSize(7.5); d.setTextColor(120); d.text('Fictional demo document generated by Shakti OS. Not a real bid.', 20, 290);
    zip.file(name, d.output('arraybuffer')); files.push(name);
  };
  const t = b.t; const ref = t.number || 'Tender';
  pdf('01_Cover_Letter.pdf', 'Cover letter', [`Date: ${today}`, `To: The Tender Inviting Authority, ${t.buyer || 'Buyer'}`, `Subject: Bid for ${t.item || 'the tendered item'} – Tender No. ${ref}`, '',
    'Dear Sir / Madam,', `We, ${COMPANY.name}, a manufacturer registered as an MSME (${PROFILE.msme}), submit our bid for the supply of ${t.qty ? t.qty.toLocaleString('en-IN') + ' ' + t.unit + ' of ' : ''}${t.item || 'the tendered item'}.`,
    `Our quoted total is ${inr(b.price)} (${inr(b.perUnit)} per unit), excluding GST, valid for 90 days. ${t.msmeExempt ? 'We claim EMD exemption as a registered MSE (Udyam certificate enclosed).' : t.emd ? `EMD of ${inr(t.emd)} is submitted as a bank guarantee.` : ''}`,
    'All documents listed in the tender are enclosed. We accept the tender terms and conditions.', '', 'Yours faithfully,', 'Ranjith', 'Managing Director']);
  pdf('02_Company_Profile.pdf', 'Company profile', [['Company', COMPANY.name], ['Type', `Manufacturer · ${PROFILE.msme}`], ['Sites', Object.values(SITES).map((s) => `${s.name} – ${s.makes}`).join('; ')],
    ['People', '70 full-time, about 175 contract and 36 daily-wage workers'], ['Customers', 'PSUs and exporters in Germany, UAE and USA'], ['Quality', 'ISO 9001:2015, ISO 14001:2015, IPC-A-610 trained operators'], ['Experience', `${PROFILE.similar[t.family] || 0} similar supplies in the last 3 years`]]);
  pdf('03_Turnover_Certificate.pdf', 'Turnover certificate (CA certified)', ['This is to certify that the turnover of the company as per audited accounts is:', ...PROFILE.turnover.map(([y, v]) => [y, `₹${v} Crore`.replace('₹', 'Rs ')] as [string, string]), ['Average', `Rs ${PROFILE.avgTurnoverCr} Crore`], '', 'For R. K. Associates (fictional), Chartered Accountants – UDIN 26XXXXXXXXXXXX (masked)']);
  const lic = DOCS.filter((d) => d.group === 'Approvals' || d.group === 'Certifications');
  pdf('04_Licences_and_Certificates.pdf', 'Licences and certificates enclosed', lic.map((d) => [d.name, d.validTill ? `valid till ${fmtD(d.validTill)}${daysTo(d.validTill) < 0 ? ' (renewal filed)' : ''}` : 'enclosed'] as [string, string]));
  pdf('05_Technical_Compliance.pdf', 'Technical and eligibility compliance', b.checks.map((c) => [c.label, `${c.ok === false ? 'Gap – ' : c.ok === null ? 'Undertaking – ' : 'Complied – '}${c.have}`] as [string, string]));
  pdf('06_Price_Bid.pdf', 'Price bid', [['Tender', ref], ['Item', t.item || '—'], ['Quantity', `${t.qty.toLocaleString('en-IN')} ${t.unit}`], ['Unit price', `Rs ${b.perUnit.toLocaleString('en-IN')} (excl. GST)`], ['Total', `Rs ${Math.round(b.price).toLocaleString('en-IN')} (excl. GST)`], ['GST', 'Extra at actuals'], ['Validity', '90 days'], ['Delivery', 'As per tender schedule'], '', `Approved by the owner on ${today}.`]);
  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, name: `Bid_${ref.replace(/[^A-Za-z0-9]+/g, '_')}.zip`, files };
}
export const download = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };
void docById;
