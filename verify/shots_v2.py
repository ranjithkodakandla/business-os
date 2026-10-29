# v2 screenshots: light + dark, 1440 + 390. Prod for static pages and previews (no sends); lab 8785 (all simulated) for the run page.
import os, sys, json, urllib.request
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else 'verify/shots/redesign-v2'; tag = sys.argv[2] if len(sys.argv) > 2 else 'after'
os.makedirs(out, exist_ok=True)
PROD, LAB = 'http://127.0.0.1:8787', 'http://127.0.0.1:8785'
runs = json.load(urllib.request.urlopen(LAB + '/api/runs')); rid = runs[-1]['id'] if runs else None
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in ['light', 'dark']:
        for w, h, dev in [(1440, 900, 'desktop'), (390, 844, 'mobile')]:
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1 if dev == 'desktop' else 2)
            ctx.add_init_script(f"try{{localStorage.setItem('bw-theme','{theme}')}}catch(e){{}}")
            pg = ctx.new_page()
            pg.on('console', lambda m: m.type == 'error' and '401' not in m.text and errs.append(f'{theme} {dev} {pg.url}: {m.text[:200]}'))
            pg.on('pageerror', lambda e: errs.append(f'{theme} {dev} {pg.url}: {e}'))
            pg.goto(PROD + '/')
            if pg.locator('input[type=password]').count():
                pg.fill('input[type=password]', os.environ['BW_PASSCODE']); pg.keyboard.press('Enter'); pg.wait_for_load_state('networkidle')
            shot = lambda name, full=False: pg.screenshot(path=f'{out}/{tag}-{name}-{dev}-{theme}.png', full_page=full)
            pg.goto(PROD + '/#/'); pg.wait_for_timeout(2200); shot('home')
            if dev == 'desktop': shot('home-full', True)
            pg.goto(PROD + '/#/procurement'); pg.wait_for_timeout(1500); shot('procurement')
            # chat: a business question (client-side answer) then a sourcing request (preview only)
            pg.goto(PROD + '/#/'); pg.wait_for_timeout(1200)
            pg.fill('[data-testid=composer]', 'Can we deliver SO-1051 by Friday?'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
            if dev == 'desktop': shot('chat-typing')
            pg.wait_for_timeout(1800)
            pg.fill('[data-testid=composer]', 'Need 50 litres cutting oil, best price'); pg.keyboard.press('Enter')
            try: pg.wait_for_selector('[data-testid=live-enquiry]', timeout=60000)
            except Exception as e: errs.append(f'{theme} {dev} chat preview: {e}')
            pg.wait_for_timeout(600); shot('chat')
            pg.evaluate("document.querySelector('[data-testid=reset-demo]')"); 
            pg.goto(PROD + '/#/sourcing/live'); pg.wait_for_timeout(2000); shot('live-start')
            pg.locator('[data-testid=live-chips] button', has_text='truck').first.click()
            try: pg.wait_for_selector('[data-testid=live-enquiry]', timeout=60000)
            except Exception as e: errs.append(f'{theme} {dev} preview: {e}')
            pg.wait_for_timeout(500); shot('live-preview', True)
            c = pg.locator('text=Connections').first; c.scroll_into_view_if_needed(); pg.wait_for_timeout(400); shot('connections')
            if rid:
                pg.goto(LAB + f'/#/sourcing/live/{rid}'); pg.wait_for_timeout(3500); shot('live-run'); shot('live-run-full', True)
                r = pg.locator('[data-testid=live-recommendation]')
                if r.count(): r.scroll_into_view_if_needed(); pg.wait_for_timeout(300); shot('live-recommendation')
            ctx.close()
    b.close()
print('errors:', len(errs)); [print(' ', e) for e in errs[:20]]
