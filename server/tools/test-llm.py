# Generic sourcing with an LLM: 3 very different free-text requirements, messy replies, a supplier question
# answered only on approval, the AI summary, the grounding guard and retries. Runs against .env.llmlab
# (port 8788, every channel simulated) + tools/mock-llm.ts (8797). Sends nothing real.
import json, time, urllib.request, sys
S = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8788/api'; M = 'http://127.0.0.1:8797'
MOCK = len(sys.argv) < 3 or sys.argv[2] != 'real'
def req(url, body=None):
    r = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), headers={'content-type': 'application/json'}, method='POST' if body is not None else 'GET')
    try:
        with urllib.request.urlopen(r, timeout=180) as f: return f.status, json.loads(f.read() or b'null')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'null')
ok = True
def check(name, cond, extra=''):
    global ok; ok &= bool(cond); print(('PASS ' if cond else 'FAIL ') + name, str(extra)[:300], flush=True)
def get(rid): r = req(S + f'/runs/{rid}')[1]; return r, {x['letter']: x for x in r['suppliers']}
def wait(pred, secs=60):
    for _ in range(secs * 2):
        try:
            if pred(): return True
        except Exception: pass
        time.sleep(0.5)
    return False
SKUS = [{'sku': 'MS-SHEET-2MM', 'name': 'MS sheet 2mm', 'unit': 'kg', 'onHand': 300, 'reserved': 0, 'unitCost': 62}]
st = req(S + '/status')[1]
check('AI parsing = LLM with model name', st['modes']['llm'] == 'real' and st['llm']['ok'] and st['llm']['model'], st['llm'])
check('neutral identities A-E with person names', [i['letter'] for i in st['identities']] == list('ABCDE'), [(i['letter'], i.get('name')) for i in st['identities']])
req(S + '/reset', {})
CASES = [
  ('material', 'Need 50 litres cutting oil, best price, delivery by Monday',
   {'A': 'Dear sir, yes available. Rs 185 per litre + GST, freight extra. Can deliver Monday. Payment 30 days credit. Regards',
    'B': 'B: only 20 litres now, 190/litre, balance next week. Net 30',
    'D': 'Hi, we can supply at ₹178/litre including GST. Which grade do you need – soluble or neat oil? And is unloading at your side?'}),
  ('truck', 'Need a 10-ton truck from Hyderabad to Pune on Friday',
   {'A': 'Sir truck ho jayega friday, 32,000 rs per trip all inclusive, 50% advance baaki delivery pe',
    'B': 'B: available, 34500 total, toll extra, cash on delivery',
    'D': 'Can do. Rs 30,000 lump sum. Will the material be loaded by your staff? What is the weight?'}),
  ('labour', 'Need 6 contract labourers for 10 days for loading and housekeeping at our Patancheru unit',
   {'A': 'Namaste, 6 workers mil jayenge, 750 rs per day per person, start from Monday, weekly payment',
    'B': 'B: sorry, not possible this time',
    'D': 'We can provide 6 people at ₹820/day each including PF/ESI. Do you provide food and accommodation?'}),
]
for kind, text, replies in CASES:
    print(f'\n=== {kind}: {text}')
    t0 = time.time(); code, c = req(S + '/check', {'text': text, 'skus': SKUS}); dt = time.time() - t0
    check(f'{kind}: check ok, parsed by llm ({dt:.1f}s)', code == 200 and c['request']['parser'] == 'llm', (code, c.get('request', {}).get('parser')))
    print('   enquiry:', c['ask']['enquiry'])
    check(f'{kind}: enquiry keeps the user wording, no new numbers', all(w in c['ask']['enquiry'].lower() for w in [x for x in text.lower().replace(',', ' ').split() if x.isdigit()]))
    check(f'{kind}: 5 suppliers planned, neutral names', [p['supplier'] for p in c['plan']] == [f'Supplier {l}' for l in 'ABCDE'], [(p['supplier'], p['person'], p['channel'], p['mode']) for p in c['plan']])
    check(f'{kind}: no stock check for non-inventory item', c.get('stock') is None)
    check(f'{kind}: all channels simulated in the lab', all(p['mode'] == 'simulated' for p in c['plan']))
    code, run = req(S + '/runs', {'text': text, 'skus': SKUS, 'enquiry': c['ask']['enquiry']})
    rid = run['id']
    check(f'{kind}: run created and approved enquiry is what was sent', code == 200 and run['ask']['enquiry'] == c['ask']['enquiry'])
    wait(lambda: all(len(get(rid)[1][l]['replies']) >= 1 for l in 'ABCDE'), 40)
    for l, t in replies.items():
        req(S + f"/outs/{get(rid)[1][l]['ref']}/note", {'text': t})
    wait(lambda: get(rid)[0]['summary'] and get(rid)[0]['summary']['basedOn'] >= 8, 90)
    r, o = get(rid)
    for l in 'ABD':
        q = o[l]['quote']; print(f'   {l} {o[l]["person"]:<14} {o[l]["channel"]:<8} canDo={q.get("canDo")} price={q["price"]} {q.get("priceBasis")} /{q["priceUnit"]} terms={q["terms"]} parser={q["parser"]} | {q.get("summary")}')
    check(f'{kind}: replies parsed by llm', all(o[l]['quote']['parser'] == 'llm' for l in 'ABD'))
    check(f'{kind}: per-reply summaries present', all(o[l]['quote'].get('summary') for l in 'ABDE'))
    check(f'{kind}: supplier D question -> pending draft, not sent', o['D']['pending'] and o['D']['pending']['questions'] and o['D']['sent'][-1]['kind'] == 'enquiry', o['D']['pending'])
    sm = r['summary']; print('   summary:', sm['headline'], '| best', sm['best'], '| cols', sm['columns'])
    check(f'{kind}: overall summary by llm with table + best + actions', sm['parser'] == 'llm' and len(sm['rows']) >= 4 and sm['best'] and sm['nextActions'], (sm['parser'], len(sm['rows']), sm['best'], sm['nextActions'], sm.get('comparabilityNote')))
    check(f'{kind}: deterministic top-3 present', len(r['top']) >= 2, r['top'])
    if kind == 'truck':
        check('truck: lump-sum quotes recognised', o['D']['quote']['priceBasis'] == 'lump_sum' and o['D']['quote']['price'] == 30000, o['D']['quote'])
    if kind == 'labour':
        check('labour: B declined', o['B']['quote']['canDo'] == 'no', o['B']['quote'])
    code, rr = req(S + f"/outs/{o['D']['ref']}/answer", {'text': o['D']['pending']['draft']})
    r, o = get(rid)
    check(f'{kind}: approved answer sent once, pending cleared', code == 200 and o['D']['pending'] is None and o['D']['sent'][-1]['kind'] == 'answer', code)
if MOCK:
    print('\n=== grounding guard + retries')
    req(M + '/mock/mode', {'invent': True})
    code, c = req(S + '/check', {'text': 'Need 40 pcs safety helmets', 'skus': SKUS})
    check('invented number in AI enquiry -> falls back to verbatim requirement', '9999' not in c['ask']['enquiry'] and c['ask']['enquiry'] == 'Need 40 pcs safety helmets', c['ask']['enquiry'])
    req(M + '/mock/mode', {'invent': False})
    calls = req(M + '/mock/calls')[1]; print('   mock LLM calls', calls)
    check('mock saw every prompt kind', all(calls.get(k) for k in ['request', 'reply', 'answer', 'summary']))
print('\nALL PASS' if ok else '\nSOME FAILED'); sys.exit(0 if ok else 1)
