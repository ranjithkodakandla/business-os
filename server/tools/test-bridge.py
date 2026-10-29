# Five-supplier RFQ round trip against tools/mock-bridge.ts (mock Apps Script bridge + mock Twilio). Sends nothing real.
#   A email (ranjith+A) · B WhatsApp (Ranjith's phone) · C call (simulated) · D email (Saad) · E WhatsApp (Saad's phone)
import json, time, urllib.request, sys
S = 'http://127.0.0.1:8789/api'; M = 'http://127.0.0.1:8796'
RANJITH, SAAD = '+919966012363', '+919985381938'
def req(url, body=None, method=None):
    r = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), headers={'content-type': 'application/json'}, method=method or ('POST' if body is not None else 'GET'))
    try:
        with urllib.request.urlopen(r) as f: return f.status, json.loads(f.read() or b'null')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'null')
ok = True
def check(name, cond, extra=''):
    global ok; ok &= bool(cond); print(('PASS ' if cond else 'FAIL ') + name, extra)
def get(rid):
    r = req(S + f'/runs/{rid}')[1]
    for x in r['suppliers']: x['stage'] = x['timeline'][-1]['stage'] if x['timeline'] else ''
    return r, {x['letter']: x for x in r['suppliers']}
def mask(t): return t[:5] + '••••' + t[-4:] if t.startswith('+') else t
def wait(pred, secs=25):
    for _ in range(secs * 2):
        if pred(): return True
        time.sleep(0.5)
    return False

st = req(S + '/status')[1]
check('email LIVE via bridge after doGet check', st['modes']['email'] == 'real' and st['email']['backend'] == 'bridge' and st['email']['ok'], st['email'])
check('whatsapp real (mock Twilio)', st['modes']['whatsapp'] == 'real')
check('5 identities with D/E routed to Saad', [i['letter'] for i in st['identities']] == list('ABCDE') and st['identities'][3]['email'] == 'saad1085+supplierD@gmail.com' and st['identities'][4]['phone'] == SAAD)

# ---- Run 1: Saad has NOT joined the sandbox -> E fails, the other four carry on ----
code, run = req(S + '/runs', {'text': 'I need 500 kg MS sheet 2mm by Friday, do we have it?'})
rid = run['id']; print('run1', rid, [(o['letter'], o['supplier'], o['channel'], mask(o['to'])) for o in run['suppliers']])
check('5 enquiries planned', len(run['suppliers']) == 5)
check('D = Supplier D (Saad) by email, E = Supplier E (Saad) on WhatsApp',
      run['suppliers'][3]['supplier'] == 'Supplier D' and run['suppliers'][3]['person'] == 'Saad Ansari' and run['suppliers'][3]['to'] == 'saad1085+supplierD@gmail.com'
      and run['suppliers'][4]['supplier'] == 'Supplier E' and run['suppliers'][4]['to'] == SAAD and run['suppliers'][4]['channel'] == 'WhatsApp')
wait(lambda: get(rid)[1]['E']['stage'] == 'failed')
r, o = get(rid)
log = req(M + '/mock/log')[1]; wal = req(M + '/mock/wa-log')[1]
check('2 RFQ emails via bridge (A, D)', sorted(m['to'].lower() for m in log['mail']) == ['ranjith302+suppliera@gmail.com', 'saad1085+supplierd@gmail.com'], [m['to'] for m in log['mail']])
check('POST then 302 then GET (no POST to echo URL)', 'POST echo (wrong)' not in log['calls'] and 'POST exec' in log['calls'])
check('2 WhatsApp RFQs via Twilio (B to Ranjith, E to Saad)', sorted(m['to'] for m in wal) == sorted(['whatsapp:' + RANJITH, 'whatsapp:' + SAAD]))
check('E shows failed with sandbox hint', o['E']['stage'] == 'failed' and 'sandbox' in (o['E'].get('error') or ''), (o['E']['stage'], o['E'].get('error')))
check('A, B, D unaffected by E failing', all(o[l]['stage'] not in ('failed', 'blocked') for l in 'ABD'), [(l, o[l]['stage']) for l in 'ABCDE'])
check('timeline notes mask phones', all(SAAD not in t.get('note', '') and RANJITH not in t.get('note', '') for x in r['suppliers'] for t in x['timeline'] if True))
check('no self-capture of our RFQs', all(len(o[l]['replies']) == 0 for l in 'ABDE'))
req(M + '/mock/reply', {'letter': 'A', 'text': 'Dear Harish, yes we have 210 kg in stock. Rate Rs 68.5/kg, freight 1,200. Dispatch Friday 30 Oct. Payment Net 45.'})
req(M + '/mock/reply', {'letter': 'D', 'text': 'Salaam Harish bhai, 210 kg available ex-stock. Rate Rs 65/kg plus freight 800. Can dispatch Thursday 29 Oct. Net 30.'})
req(M + '/mock/wa-reply', {'from': RANJITH, 'body': 'Available 210 kg at 64/kg, free delivery on 2 Nov, 50% advance'})
wait(lambda: all(len(get(rid)[1][l]['replies']) >= 1 for l in 'ABCD'))
r, o = get(rid)
check('A email reply captured', len(o['A']['replies']) == 1 and o['A']['quote']['price'] == 68.5, o['A']['quote'])
check("D reply (from Saad's own Gmail) matched by -D ref", len(o['D']['replies']) == 1 and o['D']['quote']['price'] == 65, (len(o['D']['replies']), o['D']['quote']))
check('B WhatsApp reply routed by phone (no letter prefix)', len(o['B']['replies']) == 1 and o['B']['quote']['price'] == 64, o['B']['quote'])
check('E has no reply', len(o['E']['replies']) == 0)
check('ranking over 4 quotes returns top 3', len(r['top']) == 3, [(t['letter'], t['score']) for t in r['top']] if r['top'] and isinstance(r['top'][0], dict) else r['top'])
code, c = req(S + f"/outs/{o['D']['ref']}/counter", {'price': 63})
check('counter-offer to D sent via bridge', code == 200, code)
time.sleep(5)
check('counter not self-captured', len(get(rid)[1]['D']['replies']) == 1)
req(M + '/mock/reply', {'letter': 'D', 'text': 'OK, final 63.5/kg, freight included.'})
wait(lambda: len(get(rid)[1]['D']['replies']) == 2)
r, o = get(rid)
check('D counter reply captured, quote updated', len(o['D']['replies']) == 2 and o['D']['quote']['price'] == 63.5, o['D']['quote'])
time.sleep(6)
r, o = get(rid)
check('no double counting', [len(o[l]['replies']) for l in 'ABCDE'] == [1, 1, 1, 2, 0], [len(o[l]['replies']) for l in 'ABCDE'])

# ---- Run 2: Saad joined the sandbox -> both WhatsApp suppliers reply, routed by sender phone ----
req(M + '/mock/wa-join', {'phone': SAAD})
code, run = req(S + '/runs', {'text': 'Need 300 kg MS sheet 2mm by Monday'})
rid2 = run['id']
wait(lambda: get(rid2)[1]['E']['stage'] in ('delivered', 'failed'))
check('run2: E delivered after joining sandbox', get(rid2)[1]['E']['stage'] == 'delivered', get(rid2)[1]['E']['stage'])
req(M + '/mock/wa-reply', {'from': SAAD, 'body': '300 kg ok, Rs 62/kg, delivery Monday, 30% advance'})
req(M + '/mock/wa-reply', {'from': RANJITH, 'body': '300 kg at 66/kg delivered Monday'})
wait(lambda: len(get(rid2)[1]['E']['replies']) >= 1 and len(get(rid2)[1]['B']['replies']) >= 1)
r, o = get(rid2)
check("run2: Saad's WhatsApp -> E", len(o['E']['replies']) == 1 and o['E']['quote']['price'] == 62, o['E']['quote'])
check("run2: Ranjith's WhatsApp -> B", len(o['B']['replies']) == 1 and o['B']['quote']['price'] == 66, o['B']['quote'])
r1, o1 = get(rid)
check('run1 B/E untouched by run2 replies', len(o1['B']['replies']) == 1 and len(o1['E']['replies']) == 0)

key = [l.split('=',1)[1].strip() for l in open('.env') if l.startswith('GMAIL_BRIDGE_KEY=')][0]
def raw(body):
    rq = urllib.request.Request(M + '/macros/s/MOCK/exec', data=json.dumps(body).encode(), method='POST')
    with urllib.request.urlopen(rq) as f: return json.loads(f.read())
check('script rejects a wrong key', raw({'key': 'nope', 'action': 'list'}).get('error') == 'unauthorized')
b = raw({'key': key, 'action': 'send', 'to': 'buyer@realcompany.com', 'subject': '[RFQ-SRC-0999-A] x', 'body': 'x'})
check('script allowlist blocks other recipients', not b['ok'] and 'blocked' in b['error'], b.get('error'))
b = raw({'key': key, 'action': 'send', 'to': 'Saad1085+SupplierD@gmail.com', 'subject': '', 'body': ''})
check('script allowlist has D, case-insensitive', b.get('error') == 'subject and body are required', b.get('error'))
b = raw({'key': key, 'action': 'send', 'to': 'saad1085@gmail.com', 'subject': 'x', 'body': 'x'})
check("script blocks Saad's plain address (only +supplierD allowed)", not b['ok'] and 'blocked' in b['error'])
print('ALL PASS' if ok else 'SOME FAILED'); sys.exit(0 if ok else 1)
