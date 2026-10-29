# Redesign screenshots: Home, a mega-menu open, a module page, a role view.
import os
from playwright.sync_api import sync_playwright
P = os.environ.get('BW_URL', 'http://127.0.0.1:8787'); O = 'verify/shots/redesign'
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(P + '/'); pg.fill('input[type=password]', os.environ['BW_PASSCODE']); pg.keyboard.press('Enter'); pg.wait_for_load_state('networkidle')
    pg.evaluate("localStorage.removeItem('business-workspace-demo-v5')"); pg.goto(P + '/#/'); pg.reload(); pg.wait_for_selector('[data-testid=stat-tiles]'); pg.wait_for_timeout(1200)
    pg.screenshot(path=f'{O}/home.png'); pg.screenshot(path=f'{O}/home-full.png', full_page=True)
    pg.click('[data-menu=Buy]'); pg.wait_for_timeout(300); pg.screenshot(path=f'{O}/menu-buy.png')
    pg.keyboard.press('Escape'); pg.goto(P + '/#/payroll'); pg.wait_for_timeout(900); pg.screenshot(path=f'{O}/payroll.png')
    pg.goto(P + '/#/orders'); pg.wait_for_timeout(900); pg.screenshot(path=f'{O}/orders.png')
    pg.goto(P + '/#/'); pg.select_option('[data-testid=role-switch]', 'Sales'); pg.wait_for_timeout(900); pg.screenshot(path=f'{O}/role-sales-home.png')
    pg.click('[data-menu=Sell]'); pg.wait_for_timeout(300); pg.screenshot(path=f'{O}/role-sales-menu.png')
    pg.select_option('[data-testid=role-switch]', 'Owner')
    print('errors', errs)
    b.close()
