import sys
from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5185'; O='/workspace/business-workspace/verify/shots/nav'
R=[]
def ck(n,c,d=''): R.append(c); print('PASS' if c else 'FAIL',n,d)
with sync_playwright() as p:
  b=p.chromium.launch(); errs=[]
  pg=b.new_page(viewport={'width':1440,'height':900}); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
  pg.goto(U+'/#/'); pg.evaluate("localStorage.removeItem('bw-nav-collapsed')"); pg.reload(); pg.wait_for_timeout(1500)
  sb=pg.locator('[data-testid=sidebar]'); w=lambda: sb.bounding_box()['width']
  ck('expanded default 240', abs(w()-240)<2); pg.screenshot(path=f'{O}/desktop-expanded.png')
  mw0=pg.locator('#main-scroll').bounding_box()['width']
  pg.click('[data-testid=rail-toggle]'); pg.wait_for_timeout(500)
  ck('collapsed 68', abs(w()-68)<2, w()); ck('content reflowed wider', pg.locator('#main-scroll').bounding_box()['width']>mw0+150)
  ck('badge on rail', pg.locator('[data-testid=rail-badge]').is_visible())
  pg.hover('[data-nav=orders]'); pg.wait_for_timeout(200); ck('tooltip', pg.locator('[data-testid=rail-tip]').inner_text()=='Orders')
  pg.screenshot(path=f'{O}/desktop-collapsed.png')
  pg.reload(); pg.wait_for_timeout(1200); ck('remembered in localStorage', abs(w()-68)<2)
  pg.click('[data-testid=all-modules]'); pg.wait_for_timeout(400)
  fl=pg.locator('[data-testid=module-flyout]'); ck('flyout opens', fl.is_visible()); ck('flyout overlays (sidebar still 68)', abs(w()-68)<2)
  ck('flyout lists 15 modules', pg.locator('[data-fly]').count()==15)
  pg.screenshot(path=f'{O}/desktop-flyout.png')
  pg.keyboard.type('attend'); pg.wait_for_timeout(200); ck('flyout filter', pg.locator('[data-fly]').count()==1)
  pg.keyboard.press('Escape'); pg.wait_for_timeout(200); ck('Esc closes, focus returns', not fl.count() and pg.evaluate("document.activeElement.dataset.testid")=='all-modules')
  pg.keyboard.press('Enter'); pg.wait_for_timeout(300); pg.keyboard.press('ArrowDown'); pg.keyboard.press('ArrowDown'); pg.keyboard.press('Enter'); pg.wait_for_timeout(600)
  ck('keyboard navigate via flyout', '/approvals' in pg.url, pg.url)
  pg.locator('body').click(position={'x':900,'y':500}) if False else None
  pg.evaluate("document.activeElement.blur()"); pg.keyboard.press('['); pg.wait_for_timeout(450); ck('[ expands', abs(w()-240)<2)
  pg.keyboard.press('Control+b'); pg.wait_for_timeout(450); ck('Ctrl+B collapses', abs(w()-68)<2)
  pg.goto(U+'/#/'); pg.wait_for_timeout(800); pg.click('[data-testid=command-bar] textarea, textarea'); pg.keyboard.type('['); ck('[ ignored while typing', abs(w()-68)<2)
  ck('no horiz overflow collapsed', pg.evaluate("document.getElementById('main-scroll').scrollWidth<=document.getElementById('main-scroll').clientWidth+1"))
  pg.screenshot(path=f'{O}/desktop-collapsed-home.png')
  pg.evaluate("localStorage.removeItem('bw-nav-collapsed')")
  m=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); m.on('console',lambda x: x.type=='error' and errs.append(x.text))
  m.goto(U+'/#/'); m.wait_for_timeout(1500)
  ck('mobile drawer hidden', not m.locator('[data-nav=orders]').is_visible())
  m.click('[data-testid=nav-toggle]'); m.wait_for_timeout(500); ck('drawer opens', m.locator('[data-nav=orders]').is_visible() and m.locator('[data-testid=sidebar]').bounding_box()['x']>=-1)
  ck('no rail toggle on mobile', m.locator('[data-testid=rail-toggle]').count()==0)
  m.screenshot(path=f'{O}/mobile-drawer.png')
  m.keyboard.press('Escape'); m.wait_for_timeout(450); ck('Esc closes drawer', not m.locator('[data-nav=orders]').is_visible())
  m.click('[data-testid=nav-toggle]'); m.wait_for_timeout(400); m.click('[data-nav=finance]'); m.wait_for_timeout(600); ck('drawer link navigates+closes', '/finance' in m.url and not m.locator('[data-nav=orders]').is_visible())
  m.click('[data-testid=nav-toggle]'); m.wait_for_timeout(400); m.click('[data-testid=drawer-close]'); m.wait_for_timeout(450); ck('close btn', not m.locator('[data-nav=orders]').is_visible())
  m.screenshot(path=f'{O}/mobile-closed.png')
  ck('no console errors', not errs, errs[:2])
  print('SUMMARY',sum(R),'/',len(R))
