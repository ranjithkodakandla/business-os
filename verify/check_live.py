# End-to-end check of the real sourcing agent against the local mail lab (server/.env.lab).
import sys, time, subprocess, json, urllib.request
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8788/'
OUT = '/workspace/business-workspace/verify/shots/live'
def api(p):
    return json.load(urllib.request.urlopen(BASE + 'api' + p))
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for name, vp in [('desktop', {'width': 1440, 'height': 900}), ('mobile', {'width': 390, 'height': 844})]:
        pg = br.new_page(viewport=vp, device_scale_factor=2 if name == 'mobile' else 1)
        pg.goto(BASE + '#/'); pg.evaluate('localStorage.clear()'); pg.goto(BASE + '#/'); pg.wait_for_timeout(800)
        pg.fill('[data-testid=composer]', 'I need 500 kg MS sheet 2mm by Friday, do we have it?'); pg.click('[data-testid=composer-send]')
        pg.wait_for_selector('[data-testid=live-check] [data-testid=live-approve]', timeout=15000)
        pg.locator('[data-testid=live-check]').scroll_into_view_if_needed(); pg.wait_for_timeout(400)
        pg.screenshot(path=f'{OUT}/{name}-1-chat-stock-check.png')
        pg.click('[data-testid=live-approve]')
        pg.wait_for_url('**/sourcing/live/SRC-*', timeout=15000); pg.wait_for_timeout(1500)
        run_id = pg.url.split('/')[-1]
        pg.screenshot(path=f'{OUT}/{name}-2-outreach-sent.png', full_page=True)
        if True:
            pg.wait_for_timeout(2500)
            subprocess.run(['npx', 'tsx', 'tools/reply-as-supplier.ts', 'A', 'Dear Harish, yes we have 210 kg in stock. Rate Rs 68.5/kg, freight 1,200. Dispatch Friday 30 Oct. Payment Net 45. Regards, Venkata'], cwd='/workspace/business-workspace/server', check=True)
        pg.wait_for_selector('[data-testid=live-top3]', timeout=30000)
        pg.wait_for_function("document.querySelectorAll('[data-testid^=captured-]').length >= 3", timeout=40000)
        pg.wait_for_timeout(3000)
        pg.screenshot(path=f'{OUT}/{name}-3-replies-top3.png', full_page=True)
        r = api(f'/runs/{run_id}')
        print(name, run_id, 'top', r['top'])
        for o in r['suppliers']:
            print(' ', o['ref'], o['channel'], o['mode'], [t['stage'] for t in o['timeline']], (o['quote'] or {}).get('price'), o['score'])
        if name == 'desktop':
            pg.click('[data-testid=counter-A]'); pg.wait_for_timeout(1500)
            subprocess.run(['npx', 'tsx', 'tools/reply-as-supplier.ts', 'A', 'OK sir, final rate Rs 66.5/kg, freight included. Dispatch Friday.'], cwd='/workspace/business-workspace/server', check=True)
            pg.wait_for_function("document.querySelector('[data-testid=supplier-A]').innerText.includes('66.5')", timeout=30000)
            pg.locator('[data-testid=live-cta] button').first.click(); pg.wait_for_selector('[data-testid=live-po]', timeout=10000); pg.wait_for_timeout(800)
            pg.screenshot(path=f'{OUT}/{name}-4-counter-and-po.png', full_page=True)
            r = api(f'/runs/{run_id}'); a = [o for o in r['suppliers'] if o['letter'] == 'A'][0]
            print('after counter: A price', a['quote']['price'], 'freight', a['quote']['freight'], 'top', r['top'], 'po', r['po'] and r['po']['supplier'])
        if name == 'mobile':
            pg.goto(BASE + '#/'); pg.wait_for_timeout(600); pg.screenshot(path=f'{OUT}/mobile-0-home.png')
            pg.click('[data-testid=nav-toggle]'); pg.wait_for_timeout(400); pg.screenshot(path=f'{OUT}/mobile-0-menu.png')
        pg.close()
    br.close()
