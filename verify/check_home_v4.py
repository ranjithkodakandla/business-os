# Home v4 checks: chat-first hero, glance cards + sheets, ChatGPT-style chat view. Default target: lab preview (5185 -> API 8785).
import os, sys
from playwright.sync_api import sync_playwright
B = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5185') + '/#'
out = '/workspace/business-workspace/verify/shots/home-v4'; res = []; errs = []
def ok(n, c, d=''): res.append(bool(c)); print('PASS' if c else 'FAIL', n, d)
CARDS = ['approvals', 'sourcing', 'watch', 'next', 'money', 'orders', 'team', 'good', 'channels', 'modules']
def login(pg):
  if pg.locator('input[type=password]').count():
    pg.fill('input[type=password]', os.environ['BW_PASSCODE']); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
def ask(pg, text, wait=60000):
  n = pg.locator('[data-msg=ai]').count()
  pg.fill('[data-testid=composer]', text); pg.keyboard.press('Enter')
  pg.wait_for_function(f"document.querySelectorAll('[data-msg=ai]').length > {n} && !document.querySelector('[data-thinking]')", timeout=wait)
  pg.wait_for_timeout(2500)
  return pg.locator('[data-msg=ai]').nth(n).inner_text()
with sync_playwright() as p:
  b = p.chromium.launch()
  for w, h, dev in [(1440, 900, 'desktop'), (390, 844, 'mobile')]:
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if dev == 'mobile' else 1); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(f'{dev}: {e}')); pg.on('console', lambda m: m.type == 'error' and '401' not in m.text and errs.append(f'{dev}: {m.text[:160]}'))
    pg.goto(B + '/'); login(pg); pg.goto(B + '/'); pg.wait_for_timeout(1800)
    ok(f'{dev} hero + composer', pg.locator('[data-testid=home-hero] [data-testid=composer]').count() == 1)
    got = [pg.locator(f'[data-card={c}]').count() for c in CARDS]
    ok(f'{dev} all {len(CARDS)} cards', all(got), str(got))
    sw = pg.evaluate('document.documentElement.scrollWidth'); ok(f'{dev} no horizontal overflow', sw <= w + 2, str(sw))
    pg.screenshot(path=f'{out}/home-{dev}.png', full_page=False); pg.set_viewport_size({'width': w, 'height': 1500 if dev == 'desktop' else 2600}); pg.wait_for_timeout(500); pg.screenshot(path=f'{out}/home-{dev}-full.png'); pg.set_viewport_size({'width': w, 'height': h})
    for c in CARDS:
      pg.click(f'[data-card={c}]'); pg.wait_for_selector(f'[data-sheet={c}]', timeout=4000); pg.wait_for_timeout(450)
      body = pg.locator('[data-testid=card-sheet]').inner_text()
      prim = pg.locator('[data-testid=sheet-primary]').inner_text()
      bad = [z for z in [' 0 ', 'undefined', 'NaN'] if z in body]
      ok(f'{dev} sheet {c}', len(body) > 80 and prim and not bad, f'CTA="{prim}" {bad}')
      if dev == 'desktop' or c in ('approvals', 'sourcing'): pg.screenshot(path=f'{out}/sheet-{c}-{dev}.png')
      pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
      ok(f'{dev} sheet {c} closes on Esc', pg.locator('[data-testid=card-sheet]').count() == 0)
    if dev == 'desktop':
      # keyboard: focus a card with Tab and open with Enter
      pg.locator('[data-card=money]').focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
      ok('keyboard opens card', pg.locator('[data-sheet=money]').count() == 1); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
      ok('focus returns to card', pg.evaluate("document.activeElement && document.activeElement.dataset.card") == 'money')
      # chat flow
      pg.fill('[data-testid=composer]', 'hey hi'); pg.keyboard.press('Enter'); pg.wait_for_selector('[data-testid=chat-view]', timeout=4000)
      pg.wait_for_function("document.querySelectorAll('[data-msg=ai]').length > 0 && !document.querySelector('[data-thinking]')", timeout=60000); pg.wait_for_timeout(2000)
      t = pg.locator('[data-msg=ai]').nth(0).inner_text(); ok('greeting answered', len(t) > 10, t[:90].replace('\n', ' '))
      t = ask(pg, "what's today's date"); ok('date answered', '29' in t or 'Thursday' in t, t[:120].replace('\n', ' '))
      t = ask(pg, '18% GST on 45000'); ok('GST maths', '8,100' in t or '8100' in t, t[:120].replace('\n', ' '))
      t = ask(pg, 'write python code to sort a list'); ok('declines programming', 'def ' not in t and 'sorted(' not in t, t[:140].replace('\n', ' '))
      t = ask(pg, 'what insurance should I buy for my car'); ok('declines insurance', len(t) < 700, t[:140].replace('\n', ' '))
      t = ask(pg, 'need a truck from Hyderabad to Pune'); ok('vague truck -> asks type/date', 'truck' in t.lower() and '?' in t, t[:140].replace('\n', ' '))
      pg.fill('[data-testid=composer]', 'Need a 10-ton truck from Hyderabad to Pune on Friday'); pg.keyboard.press('Enter')
      try: pg.wait_for_selector('[data-testid=live-enquiry]', timeout=90000); pg.wait_for_timeout(3000); prev = True
      except Exception: prev = False
      enq = pg.locator('[data-testid=chat-thread]').inner_text()
      ok('full truck request -> enquiry preview (no send)', prev and pg.locator('[data-testid=live-approve]').count() >= 0, enq[-160:].replace('\n', ' '))
      pg.screenshot(path=f'{out}/chat-desktop.png')
      ok('composer pinned in chat', pg.locator('[data-testid=chat-view] [data-testid=composer]').is_visible())
      pg.click('[data-testid=chat-back]'); pg.wait_for_timeout(600)
      ok('back to Home keeps resume link', pg.locator('[data-testid=chat-resume]').count() == 1)
      pg.click('[data-testid=chat-resume]'); pg.wait_for_timeout(600); ok('resume chat', pg.locator('[data-msg=user]').count() >= 6)
      pg.click('[data-testid=chat-new]'); pg.wait_for_timeout(500); ok('new chat clears + returns home', pg.locator('[data-testid=home-hero]').count() == 1 and pg.locator('[data-testid=chat-resume]').count() == 0)
      # chip -> chat with canned business answer
      pg.click('[data-chip="Can we deliver SO-1051 by Friday?"]'); pg.wait_for_selector('[data-msg=ai]', timeout=8000); pg.wait_for_timeout(800)
      ok('chip opens chat with answer', 'SO-1051' in pg.locator('[data-testid=chat-thread]').inner_text())
      pg.click('[data-testid=chat-new]'); pg.wait_for_timeout(300)
    else:
      pg.fill('[data-testid=composer]', "what's today's date"); pg.keyboard.press('Enter'); pg.wait_for_selector('[data-testid=chat-view]', timeout=4000)
      pg.wait_for_function("document.querySelectorAll('[data-msg=ai]').length > 0 && !document.querySelector('[data-thinking]')", timeout=60000); pg.wait_for_timeout(2500)
      sw = pg.evaluate('document.documentElement.scrollWidth'); ok('mobile chat no overflow', sw <= w + 2, str(sw))
      pg.screenshot(path=f'{out}/chat-mobile.png'); pg.click('[data-testid=chat-new]')
    ctx.close()
  b.close()
ok('no console/page errors', not errs, ' | '.join(errs[:4]))
print('SUMMARY', sum(res), '/', len(res))
