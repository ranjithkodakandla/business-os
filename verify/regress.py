# Regression on LIVE prod (8787). Preview-only: never creates runs or approves sends on prod.
import os, sys, json, urllib.request
from playwright.sync_api import sync_playwright
P='http://127.0.0.1:8787'; out='verify/shots/live'; res=[]; errs=[]
def ok(n,c,d=''): res.append((n,bool(c),d)); print(('PASS' if c else 'FAIL'),n,d)
routes=['/','/approvals','/sales','/orders','/procurement','/inventory','/operations','/job-work','/people','/finance','/reports','/agents','/integrations','/setup','/suppliers','/sourcing','/sourcing/live','/collections']
with sync_playwright() as p:
  b=p.chromium.launch()
  for w,h,dev in [(1440,900,'desktop'),(390,844,'mobile')]:
    ctx=b.new_context(viewport={'width':w,'height':h}); pg=ctx.new_page()
    pg.on('console',lambda m: m.type=='error' and '401' not in m.text and errs.append(f'{dev} {pg.url}: {m.text[:160]}')); pg.on('pageerror',lambda e: errs.append(f'{dev} {pg.url}: {e}'))
    pg.goto(P+'/#/sourcing/live'); gate=pg.locator('input[type=password]').count()>0
    if dev=='desktop':
      ok('passcode gate shown',gate)
      pg.fill('input[type=password]','wrong-x'); pg.keyboard.press('Enter'); pg.wait_for_timeout(1200); ok('wrong passcode rejected',pg.locator('input[type=password]').count()>0)
    pg.fill('input[type=password]',os.environ['BW_PASSCODE']); pg.keyboard.press('Enter'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(1500)
    ok(f'{dev} login + redirect',pg.locator('input[type=password]').count()==0,pg.url.replace(P,''))
    bad=[]
    for r in routes:
      pg.goto(P+'/#'+r); pg.wait_for_timeout(900)
      t=pg.locator('main').inner_text() if pg.locator('main').count() else pg.locator('body').inner_text()
      if len(t)<40 or 'Page not found' in t: bad.append(r)
      if dev=='mobile':
        sw=pg.evaluate('document.documentElement.scrollWidth')
        if sw>w+2: bad.append(r+f'(overflow {sw})')
    ok(f'{dev} all {len(routes)} routes render'+(' w/o horizontal overflow' if dev=='mobile' else ''),not bad,','.join(bad))
    pg.goto(P+'/#/sourcing/live'); pg.wait_for_timeout(2500)
    d=pg.locator('[data-testid=connections-drawer]').first; d.locator('summary').first.click(); pg.wait_for_timeout(600); d.scroll_into_view_if_needed()
    card=pg.locator('[data-testid=ai-parsing]').first.locator('xpath=ancestor::*[contains(@class,"rounded")][1]')
    txt=pg.locator('body').inner_text()
    ai=pg.locator('[data-testid=ai-parsing]').inner_text() if pg.locator('[data-testid=ai-parsing]').count() else ''
    if dev=='desktop':
      ok('AI parsing shows LLM + model','LLM' in ai and 'nemotron' in ai,ai.strip())
      pg.screenshot(path=f'{out}/connections-{dev}.png',full_page=True)
    pg.locator('[data-testid=live-chips] button',has_text='truck').first.click()
    try: pg.wait_for_selector('[data-testid=live-enquiry]',timeout=60000); enq=pg.locator('[data-testid=live-enquiry]').input_value()
    except Exception: enq=''
    ok(f'{dev} AI enquiry preview (no send)','Hyderabad' in enq and 'Pune' in enq,enq[:90])
    pg.screenshot(path=f'{out}/enquiry-preview-{dev}.png',full_page=True)
    if dev=='desktop':
      pg.goto(P+'/#/'); pg.wait_for_timeout(1500)
      box=pg.locator('textarea, input[placeholder*="Ask"]').first; box.fill('Need 50 litres cutting oil, best price'); pg.keyboard.press('Enter')
      try: pg.wait_for_selector('[data-testid=live-enquiry]',timeout=60000); c=True
      except Exception: c=False
      ok('chat sourcing query renders enquiry preview',c); pg.screenshot(path=f'{out}/chat-preview-{dev}.png',full_page=True)
    ctx.close()
  b.close()
ok('no console errors (beyond expected login 401)',not errs,' | '.join(errs[:5]))
print('SUMMARY',sum(r[1] for r in res),'/',len(res))
