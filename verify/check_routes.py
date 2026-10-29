import sys, json
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:4173/#'
ROUTES = ['/', '/approvals', '/sales', '/sales/opportunity/OP-302', '/sales/customer/C01', '/orders', '/orders/SO-1051', '/orders/SO-1051?tab=Materials', '/orders/SO-1051?tab=Items',
  '/procurement', '/procurement/PR-208', '/procurement/PR-208?tab=Compare', '/inventory', '/inventory/RM-A17', '/inventory?view=Slow%20moving', '/operations', '/operations?order=SO-1051', '/operations?tab=Board', '/operations?tab=Dispatch%20plan',
  '/job-work', '/job-work?tab=Material%20out', '/job-work?tab=Capacity', '/job-work?tab=ITC-04', '/job-work?tab=Inward%20job%20work', '/people', '/people?tab=Attendance', '/people?tab=Contract%20labour', '/people/EMP-1022',
  '/finance', '/finance?tab=Receivables', '/finance?tab=Payables', '/finance?tab=Cash', '/finance?tab=GST%20%26%20compliance', '/finance/INV-1048', '/reports', '/agents', '/integrations', '/setup', '/suppliers', '/sourcing', '/sourcing/SRC-0031', '/collections', '/nope']
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('console', lambda m: errs.append((pg.url, m.type, m.text)) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append((pg.url, 'pageerror', str(e))))
    pg.goto(BASE + '/'); pg.evaluate('localStorage.clear()'); pg.reload()
    for r in ROUTES:
        pg.goto(BASE + r); pg.wait_for_timeout(500)
        h1 = pg.locator('h1').first.inner_text() if pg.locator('h1').count() else '(no h1)'
        txt = pg.locator('main').inner_text()
        name = r.strip('/').replace('/', '_').replace('?', '_').replace('%20', ' ').replace('%26', '&') or 'home'
        pg.screenshot(path=f'/workspace/business-workspace/verify/shots/{name}.png')
        print(f'{r:45s} h1={h1[:50]!r} len={len(txt)}')
    b.close()
print('ERRORS', len(errs))
for e in errs[:40]: print(e)
