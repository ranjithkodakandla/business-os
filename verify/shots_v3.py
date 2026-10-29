# v3 UX screenshots (light default): home, ask, enquiry preview, live waiting, decision, all quotes, connections.
# Prod: static pages + previews only (no sends). Lab 8785 (all channels simulated): a fresh run for waiting + decision.
import os, sys, json, time, urllib.request
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else 'verify/shots/redesign-v3'; os.makedirs(out, exist_ok=True)
PROD, LAB = 'http://127.0.0.1:8787', 'http://127.0.0.1:8785'
def req(u, b=None):
    r = urllib.request.Request(LAB + '/api' + u, data=None if b is None else json.dumps(b).encode(), headers={'content-type': 'application/json'}, method='POST' if b is not None else 'GET')
    return json.loads(urllib.request.urlopen(r, timeout=120).read())
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, dev in [(1440, 900, 'desktop'), (390, 844, 'mobile')]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1 if dev == 'desktop' else 2)
        pg = ctx.new_page()
        pg.on('console', lambda m: m.type == 'error' and '401' not in m.text and errs.append(f'{dev} {pg.url}: {m.text[:200]}'))
        pg.on('pageerror', lambda e: errs.append(f'{dev} {pg.url}: {e}'))
        def shot(name, full=False):
            if not full: return pg.screenshot(path=f'{out}/{name}-{dev}.png')
            H = min(6000, pg.evaluate("Math.max(...[...document.querySelectorAll('main,main *,body')].map(e=>e.scrollHeight))") + 80)
            pg.set_viewport_size({'width': w, 'height': H}); pg.wait_for_timeout(500)
            pg.screenshot(path=f'{out}/{name}-{dev}.png'); pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(300)
        pg.goto(PROD + '/')
        if pg.locator('input[type=password]').count():
            pg.fill('input[type=password]', os.environ['BW_PASSCODE']); pg.keyboard.press('Enter'); pg.wait_for_load_state('networkidle')
        pg.goto(PROD + '/#/'); pg.wait_for_timeout(2000); shot('home'); shot('home-full', True)
        pg.goto(PROD + '/#/sourcing/live'); pg.wait_for_timeout(1500); shot('ask')
        pg.locator('[data-testid=live-chips] button', has_text='truck').first.click()
        try: pg.wait_for_selector('[data-testid=live-enquiry]', timeout=60000)
        except Exception as e: errs.append(f'{dev} preview: {e}')
        pg.wait_for_timeout(500); shot('enquiry-preview')
        pg.goto(PROD + '/#/sourcing/live'); pg.reload(); pg.wait_for_timeout(1500); d=pg.locator('[data-testid=connections-drawer]').first; d.locator('summary').first.click(); pg.wait_for_timeout(600); d.scroll_into_view_if_needed(); shot('connections')
        # lab: fresh run -> waiting -> decision
        req('/reset', {}); t = 'Need a 10-ton truck from Hyderabad to Pune on Friday'
        ck = req('/check', {'text': t, 'skus': []}); run = req('/runs', {'text': t, 'skus': [], 'enquiry': ck['ask']['enquiry']})
        pg.goto(LAB + f"/#/sourcing/live/{run['id']}")
        for _ in range(60):
            x = req(f"/runs/{run['id']}")
            if sum(1 for o in x['suppliers'] if o['replies']) >= 2: break
            time.sleep(1)
        pg.wait_for_timeout(2800)
        if pg.locator('[data-testid=live-waiting]').count(): shot('live-waiting')
        else: errs.append(f'{dev}: waiting view already passed')
        for _ in range(120):
            x = req(f"/runs/{run['id']}")
            if x['summary'] and all(o['replies'] for o in x['suppliers'] if o['letter'] != 'D'): break
            time.sleep(2)
        if not pg.locator('[data-testid=live-recommendation]').count():
            if pg.locator('[data-testid=compare-now]').count(): pg.click('[data-testid=compare-now]')
        try: pg.wait_for_selector('[data-testid=live-recommendation]', timeout=30000)
        except Exception as e: errs.append(f'{dev} decision: {e}')
        pg.wait_for_timeout(1200); shot('decision'); shot('decision-full', True)
        q = pg.locator('[data-testid=all-quotes]'); q.scroll_into_view_if_needed()
        v = pg.locator('[data-testid^=view-reply-]').first
        if v.count(): v.click(); pg.wait_for_timeout(400)
        shot('all-quotes')
        ctx.close()
    b.close()
print('errors:', len(errs)); [print(' ', e) for e in errs[:20]]
