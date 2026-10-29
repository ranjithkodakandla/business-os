# P1/P2 modules: each page renders, and each chat command returns a structured card (incl. follow-up answers).
# Runs against a local `vite preview` of this build (no server, no sends): P1_URL defaults to http://127.0.0.1:4179
import os
from playwright.sync_api import sync_playwright
P=os.environ.get('P1_URL','http://127.0.0.1:4179'); out='verify/shots/p1'; res=[]; errs=[]
def ok(n,c,d=''): res.append(c); print(('PASS' if c else 'FAIL'),n,d)
pages={'/production':'Bill of materials','/quality':'Inspection','/bank-tds':'Statement lines','/expenses':'Claims','/dispatch':'Dispatch plan','/notifications':'Daily brief','/documents':'MTC'}
tabs={'/production':['MRP','Work orders','Cost vs plan'],'/quality':['NCR & CAPA','Trend & suppliers'],'/bank-tds':['TDS','26Q summary'],'/dispatch':['Packing list','Tracking & POD'],'/notifications':['Compliance calendar','Preferences']}
chat=[('Plan 500 A-17 housings next week','WO-2295'),('Show BOM for A-17','BOM'),('Log 12 rejects on lot L-88 for porosity','NCR-071'),
 ('Log rejects on lot L-86','how many'),('7 weld spatter','lot L-86'),
 ('Reconcile HDFC for October','Matched'),('TDS due by 7th?','7 November'),('Claim an expense','How much'),('850 auto to Medak','EX-306'),
 ('Show pending expense claims','Expense claims'),('What ships today?','dispatches today'),('Give me my daily brief','daily brief'),('Find test certificate for lot L-88','MTC'),
 ('Plan production next week','Which product'),('250 B-04 brackets','B-04')]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':1440,'height':900})
  pg.on('pageerror',lambda e: errs.append(str(e)))
  # no backend here: abort /api/* calls so nothing leaves the box and the commands run on rules alone
  pg.route('**/api/**',lambda r: r.abort())
  pg.goto(P+'/#/'); pg.wait_for_timeout(1500)
  for r,want in pages.items():
    pg.goto(P+'/#'+r); pg.wait_for_timeout(700); t=pg.locator('body').inner_text()
    ok('page '+r,want.lower() in t.lower() and 'Page not found' not in t)
    for tb in tabs.get(r,[]):
      pg.locator(f'[data-tab="{tb}"]').first.dispatch_event('click'); pg.wait_for_timeout(300); ok(f'  tab {tb}',len(pg.locator('main').inner_text() if pg.locator('main').count() else pg.locator('body').inner_text())>200)
    pg.screenshot(path=f'{out}{r.replace("/","-")}.png',full_page=True)
  nav=pg.locator('body').inner_text(); ok('nav lists new modules',all(x in nav for x in ['BOM & Production','Quality control','Bank & TDS','Documents']))
  pg.goto(P+'/#/'); pg.wait_for_timeout(1200)
  for i,(q,want) in enumerate(chat):
    n=pg.locator('[data-testid=data-chart],[data-testid=suggestion],[data-testid=data-items]').count()
    pg.fill('[data-testid=composer]',q); pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
    th=pg.locator('[data-testid=chat-thread]').inner_text(); k=th.rfind(q); last=th[k+len(q):] if k>=0 else '(message not sent)'
    ok(f'chat: {q}',want.lower() in last.lower() and '\n• ' not in last,last.replace('\n',' | ')[:110])
  pg.screenshot(path=f'{out}/chat.png',full_page=True)
  ok('no page errors',not errs,'; '.join(errs)[:300])
print(f'{sum(res)}/{len(res)} passed')
