# Top menu bar regression: groups, mega-menus, keyboard, outside click, Cmd-K, full-width pages, role filtering.
import os, sys
from playwright.sync_api import sync_playwright
U = os.environ.get('BW_URL', sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'); O = 'verify/shots/nav'; R = []
def ck(n, c, d=''): R.append(bool(c)); print('PASS' if c else 'FAIL', n, d)
with sync_playwright() as p:
  b = p.chromium.launch(); errs = []
  pg = b.new_page(viewport={'width': 1440, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e)))
  pg.goto(U + '/'); pc = os.environ.get('BW_PASSCODE')
  if pc and pg.locator('input[type=password]').count(): pg.fill('input[type=password]', pc); pg.keyboard.press('Enter'); pg.wait_for_load_state('networkidle')
  pg.evaluate("localStorage.removeItem('business-workspace-demo-v5')"); pg.goto(U + '/#/'); pg.reload(); pg.wait_for_selector('[data-testid=topnav]')
  ck('no sidebar', pg.locator('[data-testid=sidebar]').count() == 0)
  ck('7 groups', pg.locator('[data-menu]').count() == 7)
  ck('all group tabs visible at 1440', all(x.is_visible() and x.bounding_box()['x'] + x.bounding_box()['width'] < 1440 for x in pg.locator('[data-menu]').all()))
  pg.click('[data-menu=Sell]'); pg.wait_for_timeout(250); m = pg.locator('[data-testid=mega-menu]')
  ck('Sell menu lists modules', m.locator('[data-nav]').count() >= 4 and m.locator('[data-nav=orders]').count() == 1)
  ck('context panel', pg.locator('[data-testid=menu-context]').is_visible())
  pg.screenshot(path=f'{O}/top-menu-sell.png')
  pg.keyboard.press('Escape'); pg.wait_for_timeout(150); ck('Esc closes', m.count() == 0)
  pg.click('[data-menu=Money]'); pg.mouse.click(720, 700); pg.wait_for_timeout(150); ck('outside click closes', m.count() == 0)
  pg.focus('[data-menu=Home]'); pg.keyboard.press('ArrowRight'); ck('arrow moves between tabs', pg.evaluate("document.activeElement.dataset.menu") == 'Sell')
  pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(150); ck('ArrowDown opens + focuses first item', pg.evaluate("!!document.activeElement.closest('[data-testid=mega-menu]')"))
  pg.keyboard.press('Enter'); pg.wait_for_timeout(500); ck('Enter navigates', '/sales' in pg.url, pg.url)
  ck('active group highlighted', 'tab-active' in (pg.locator('[data-menu=Sell]').get_attribute('class') or ''))
  ck('inner page full width', pg.locator('#main-scroll > div').last.bounding_box()['width'] > 1300)
  pg.keyboard.press('Control+k'); ck('Ctrl+K focuses search', pg.evaluate("document.activeElement.dataset.testid") == 'global-search')
  pg.keyboard.type('SO-105'); pg.wait_for_timeout(200); ck('search results', pg.locator('.glass-pop button').count() > 0)
  pg.goto(U + '/#/'); pg.select_option('[data-testid=role-switch]', 'Stores'); pg.wait_for_timeout(400)
  ck('Stores: People hidden, Money shows only Three-way match', pg.locator('[data-menu=People]').count() == 0 and pg.locator('[data-menu=Money]').count() == 1)
  pg.screenshot(path=f'{O}/top-menu-stores.png'); pg.select_option('[data-testid=role-switch]', 'Owner')
  ck('no page errors', not errs, errs[:2])
  b.close()
print('SUMMARY', sum(R), '/', len(R)); sys.exit(0 if all(R) else 1)
