# Mobile hero screenshots: drawer, chat answer, platform rollout + kill confirm, platform drawer.
import os
from playwright.sync_api import sync_playwright
U=os.environ.get('BW_URL','http://127.0.0.1:5185'); O='verify/shots/mobile'
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':375,'height':812},is_mobile=True,has_touch=True,device_scale_factor=2)
  pg.goto(U+'/#/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_selector('[data-testid=topbar]')
  pg.click('[data-testid=mobile-menu-btn]'); pg.wait_for_timeout(400); pg.click('[data-mgroup=Sell]'); pg.wait_for_timeout(200); pg.screenshot(path=O+'/375-menu-drawer.png')
  pg.click('[data-mnav=orders]'); pg.wait_for_timeout(500); print('drawer nav ->', pg.url, pg.locator('[data-testid=mobile-drawer]').count())
  pg.goto(U+'/#/'); pg.wait_for_timeout(300); pg.fill('textarea', 'Which customers owe more than 5 lakh for over 45 days?'); pg.keyboard.press('Enter'); pg.wait_for_timeout(9000); pg.screenshot(path=O+'/375-chat-answer.png')
  print('chat sw', pg.evaluate('document.getElementById("main-scroll").scrollWidth'))
  pg.goto(U+'/#/'); pg.click('[data-testid=mobile-menu-btn]'); pg.select_option('[data-testid=mobile-role-switch]','Platform owner'); pg.wait_for_selector('[data-testid=platform-topbar]')
  pg.goto(U+'/#/platform/flags'); pg.wait_for_timeout(400); pg.click('[data-rflag=bank]'); pg.wait_for_timeout(800); pg.screenshot(path=O+'/375-plat-rollout.png')
  sl=pg.locator('[data-testid=rollout-pct]'); bb=sl.bounding_box(); print('slider box', bb)
  pg.click('[data-rflag=payroll]'); pg.wait_for_timeout(600); pg.click('[data-testid=kill-switch]'); pg.wait_for_timeout(300); pg.screenshot(path=O+'/375-plat-kill-confirm.png'); print('confirm box', pg.locator('[data-testid=kill-confirm-yes]').bounding_box())
  pg.mouse.click(5,5); pg.wait_for_timeout(200); pg.click('[data-testid=plat-menu-btn]'); pg.wait_for_timeout(300); pg.screenshot(path=O+'/375-plat-drawer.png')
