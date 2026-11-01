"""Factory demo regression tests. Run: FX_BASE=<url> FXPASS=<passcode> pytest e2e/factory"""
import os, pytest
from playwright.sync_api import sync_playwright

BASE = os.environ.get('FX_BASE', 'http://127.0.0.1:18795').rstrip('/')

@pytest.fixture(scope='session')
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(); yield b; b.close()

@pytest.fixture
def page(browser):
    ctx = browser.new_context(viewport={'width': 1440, 'height': 1000}); pg = ctx.new_page()
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + '/'); pg.wait_for_timeout(800)
    if pg.locator('input[name=passcode]').count():
        pg.fill('input[name=passcode]', os.environ['FXPASS']); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_selector('[data-testid=topnav]', timeout=20000)
    pg.errors = errors
    yield pg
    shot = os.environ.get('FX_SHOTS')
    if shot: os.makedirs(shot, exist_ok=True)
    ctx.close()
    assert not errors, f'page errors: {errors}'

def ask(pg, q, wait='[data-testid=chat-view]'):
    if not pg.url.rstrip('/').endswith('/#') and 'chat=1' not in pg.url:
        pg.goto(BASE + '/#/'); pg.wait_for_timeout(500)
    n = pg.locator('[data-msg=ai]').count()
    box = pg.locator('textarea').first; box.fill(q); box.press('Enter')
    pg.wait_for_function(f"document.querySelectorAll('[data-msg=ai]').length > {n}", timeout=25000)
    pg.wait_for_timeout(400)
    return pg.locator('[data-msg=ai]').last
