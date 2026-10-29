# Production profile smoke test: passcode gate, then Home chat -> live stock check (dry run, sends nothing).
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1]; PASS = sys.argv[2]; OUT = '/workspace/business-workspace/verify/shots/live'
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    pg.goto(BASE); pg.wait_for_timeout(500); pg.screenshot(path=f'{OUT}/prod-0-passcode.png')
    pg.fill('input[name=passcode]', PASS); pg.keyboard.press('Enter'); pg.wait_for_selector('[data-testid=composer]', timeout=15000)
    pg.fill('[data-testid=composer]', 'I need 500 kg MS sheet 2mm by Friday, do we have it?'); pg.click('[data-testid=composer-send]')
    pg.wait_for_selector('[data-testid=live-approve]', timeout=15000); pg.locator('[data-testid=live-check]').scroll_into_view_if_needed(); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{OUT}/prod-1-chat-check.png')
    print(pg.locator('[data-testid=live-check]').inner_text()[:900])
    pg.goto(BASE + '#/sourcing/live'); pg.wait_for_timeout(1500); pg.screenshot(path=f'{OUT}/prod-2-live-page.png', full_page=True)
    br.close()
