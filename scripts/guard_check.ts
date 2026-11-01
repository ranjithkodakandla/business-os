import { listToTable } from '../src/factory/guard';
const cases: [string, number][] = [
  ['Here are your suppliers:\n- Vega RF Parts – Pune – connectors\n- AeroSpark – Chennai – motors\n- Godavari Paper Mills – kraft paper\n- Site 3 Medak – internal', 4],
  ['1. Kiran: on leave\n2. Meena: travelling\n3. Sunil: available', 3],
  ['* **Fire NOC** | Site 1 | 12 days\n* **CTO** | Site 1 | 40 days\n* **Trade** | Site 3 | 70 days', 3],
];
let bad = 0;
for (const [md, n] of cases) { const r = listToTable(md); if (!r || r.table.rows.length !== n || r.table.cols.length < 2 || /^[-*\d]/.test(r.lead)) { bad++; console.log('FAIL', md, JSON.stringify(r)); } }
if (listToTable('Cash is ₹42 L.\n- one\n- two')) { bad++; console.log('FAIL 2-item list converted'); }
console.log(bad ? `guard: ${bad} failed` : 'guard: all ok'); process.exit(bad ? 1 : 0);
