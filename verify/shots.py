# Screenshots of the main screens at 1440 and 390 wide. Usage: shots.py <outdir> <tag>
# Prod (8787) for static pages (login with the passcode from the env, never printed); the real-LLM lab (8785,
# all channels simulated) for an RFQ run page, so nothing real is sent.
import os, sys, json, urllib.request
from playwright.sync_api import sync_playwright
out, tag = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
PROD, LAB = 'http://127.0.0.1:8787', 'http://127.0.0.1:8785'
runs = json.load(urllib.request.urlopen(LAB + '/api/runs'))
rid = runs[-1]['id'] if runs else None
pages = [('home', PROD, '/#/'), ('procurement', PROD, '/#/procurement'), ('inventory', PROD, '/#/inventory'), ('sales', PROD, '/#/sales'), ('finance', PROD, '/#/finance'),
         ('approvals', PROD, '/#/approvals'), ('live-start', PROD, '/#/sourcing/live')] + ([('live-run', LAB, f'/#/sourcing/live/{rid}')] if rid else [])
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, dev in [(1440, 900, 'desktop'), (390, 844, 'mobile')]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1 if dev == 'desktop' else 2)
        pg = ctx.new_page(); pg.on('console', lambda m: m.type == 'error' and errs.append(f'{dev} {pg.url}: {m.text[:200]}')); pg.on('pageerror', lambda e: errs.append(f'{dev} {pg.url}: {e}'))
        pg.goto(PROD + '/'); 
        if pg.locator('input[type=password]').count():
            pg.fill('input[type=password]', os.environ['BW_PASSCODE']); pg.keyboard.press('Enter'); pg.wait_for_load_state('networkidle')
        for name, base, route in pages:
            pg.goto(base + route); pg.wait_for_timeout(2500)
            pg.screenshot(path=f'{out}/{tag}-{name}-{dev}.png', full_page=name.startswith('live'))
        pg.goto(PROD + '/#/sourcing/live'); pg.wait_for_timeout(1500)  # preview only: /api/check never sends
        pg.locator('[data-testid=live-chips] button', has_text='truck').first.click()
        try: pg.wait_for_selector('[data-testid=live-enquiry]', timeout=60000)
        except Exception as e: errs.append(f'{dev} preview: {e}')
        pg.screenshot(path=f'{out}/{tag}-live-preview-{dev}.png', full_page=True)
        if True:  # Connections area + chat example
            pg.goto(PROD + '/#/sourcing/live'); pg.wait_for_timeout(2000)
            c = pg.locator('text=Connections').first
            if c.count(): c.scroll_into_view_if_needed(); pg.wait_for_timeout(500); pg.screenshot(path=f'{out}/{tag}-connections-{dev}.png')
        ctx.close()
    b.close()
print('errors:', len(errs)); [print(' ', e) for e in errs[:20]]
