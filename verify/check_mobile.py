# Mobile/tablet responsiveness: every Owner nav route + every Platform route at 375 and 768; no horizontal page overflow.
import os, sys, re
from playwright.sync_api import sync_playwright
U = os.environ.get('BW_URL', sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5185'); O = 'verify/shots/mobile'; os.makedirs(O, exist_ok=True)
SHOTS = os.environ.get('SHOTS', '1') == '1'
src = open('src/lib/nav.ts').read(); routes = sorted(set(re.findall(r"to: '(/[^']*)'", src)))
PLAT = ['/platform', '/platform/companies/t-deccan', '/platform/flags', '/platform/billing', '/platform/plans', '/platform/support', '/platform/tenancy', '/platform/ai', '/platform/tds', '/platform/catalog', '/platform/subscriptions', '/platform/metrics', '/platform/telemetry', '/platform/ai-support', '/platform/demo', '/platform/warehouse', '/platform/security']
fails = []; n = 0
OVF = """() => { const vw = innerWidth; const inScroll = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { if (p.id === 'main-scroll') return false; const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; }; const bad = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed' && !inScroll(e); }).slice(-3).map(e => e.tagName + '.' + (e.className && e.className.baseVal === undefined ? e.className : '').toString().slice(0, 60) + ' r=' + Math.round(e.getBoundingClientRect().right)); return [document.documentElement.scrollWidth, document.body.scrollWidth, (document.getElementById('main-scroll')||document.body).scrollWidth, bad]; }"""
with sync_playwright() as p:
  b = p.chromium.launch()
  for w, h in [tuple(map(int, x.split('x'))) for x in os.environ.get('SIZES', '375x812,768x1024').split(',')]:
    pg = b.new_page(viewport={'width': w, 'height': h}, is_mobile=w < 700, has_touch=True, device_scale_factor=2)
    pg.goto(U + '/'); pc = os.environ.get('BW_PASSCODE')
    if pc and pg.locator('input[type=password]').count(): pg.fill('input[type=password]', pc); pg.keyboard.press('Enter'); pg.wait_for_load_state('networkidle')
    pg.evaluate("localStorage.clear()"); pg.goto(U + '/#/'); pg.reload(); pg.wait_for_selector('[data-testid=topbar]')
    def chk(r, tag):
      global n; n += 1; pg.wait_for_timeout(450); sw, bw, mw, bad = pg.evaluate(OVF)
      ok = max(sw, bw, mw) <= w
      print('PASS' if ok else 'FAIL', w, r, sw, bw, mw, '' if ok else bad)
      if not ok: fails.append((w, r, bad))
      if SHOTS: pg.screenshot(path=f'{O}/{w}-{tag}.png')
    for r in routes:
      pg.goto(U + '/#' + r); chk(r, (r.strip('/').replace('/', '-').split('?')[0] or 'home'))
    pg.evaluate("() => { const s = JSON.parse(localStorage.getItem('business-workspace-demo-v5')||'{}'); }")
    pg.goto(U + '/#/'); pg.wait_for_selector('[data-testid=topbar]')
    if pg.locator('[data-testid=mobile-menu-btn]').is_visible():
      pg.click('[data-testid=mobile-menu-btn]'); pg.wait_for_selector('[data-testid=mobile-drawer]'); pg.wait_for_timeout(350); chk('drawer', 'menu-drawer'); pg.keyboard.press('Escape')
    pg.goto(U + '/#/'); pg.click('[data-testid=profile-menu]'); pg.click('[data-role="Platform owner"]'); pg.wait_for_selector('[data-testid=platform-topbar]')
    for r in PLAT: pg.goto(U + '/#' + r); chk(r, 'plat-' + (r.replace('/platform', '').strip('/').replace('/', '-') or 'companies'))
    pg.close()
  b.close()
print(f'\n{n - len(fails)}/{n} pages without horizontal overflow'); sys.exit(1 if fails else 0)
