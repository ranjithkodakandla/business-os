import sys, time
from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5185'; O='/workspace/business-workspace/verify/shots/domains'
R=[]
def ck(n,c,d=''): R.append(bool(c)); print('PASS' if c else 'FAIL',n,d if not c else '')
QS=[('show inventory','inventory'),('inventory','inventory'),("what's low on stock",None),('stock of MS sheet',None),('pending orders',None),('who owes me money',None),
 ('cash position',None),('open POs',None),('how many people on leave today',None),("how's business",None),('hey show me sales',None),
 ('stock enni undi','inventory'),('paisa kaun dena hai',None),('orders evi pending',None),('kitna stock hai','inventory'),
 ('which item has highest value',None),('compare this month vs last',None),('top 5 customers by revenue',None),('which machine is idle',None),
 ('show me everything about Aarav Interiors',None),('what should I worry about',None),('dispatch today',None),('job work status',None),
 ('quality issues',None),('payables due',None),('attendance today',None),('GST compliance',None),('pending approvals',None)]
with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1440,'height':1000}); pg=ctx.new_page()
  pg.goto(U+'/#/'); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1500)
  def ask(t):
    n=pg.locator('[data-msg=ai]').count(); pg.fill('[data-testid=composer]', t); pg.keyboard.press('Enter'); t0=time.time()
    pg.wait_for_function(f"document.querySelectorAll('[data-msg=ai]').length>{n}", timeout=25000); pg.wait_for_timeout(600)
    return pg.locator('[data-msg=ai]').last, time.time()-t0
  for i,(q,_) in enumerate(QS):
    a,dt=ask(q); card=a.locator('[data-testid=data-card]'); t=a.inner_text()
    rich=a.locator('[data-testid=data-chart],[data-testid=data-items],table,[data-testid=data-kpis],[data-kpi]').count()
    bullets=a.locator('ul li').count()+sum(1 for l in t.split('\n') if l.strip() and l.strip()[0] in '•*' or l.strip().startswith('- '))
    ck(f'{q!r}: visual card ({dt:.1f}s)', card.count()==1 and rich>=1 and bullets==0, f'card={card.count()} rich={rich} bullets={bullets} {t[:160]!r}')
    if q in ('show inventory','which item has highest value','top 5 customers by revenue','who owes me money','how\'s business','compare this month vs last'):
      a.scroll_into_view_if_needed(); a.screenshot(path=f'{O}/{i:02d}-{q.replace(" ","-").replace(chr(39),"")[:30]}.png')
  # non-data stays conversational
  a,_=ask('what is 18% gst on 5000'); ck('maths not hijacked', a.locator('[data-kind=view]').count()==0 and '900' in a.inner_text(), a.inner_text()[:150])
  # AI down → rules view still renders
  ctx.route('**/api/view', lambda r: r.fulfill(status=504, body='{}', content_type='application/json'))
  a,dt=ask('which customer has the most overdue'); ck(f'AI down → rules view ({dt:.1f}s)', a.locator('[data-kind=view]').count()==1 and dt<10, a.inner_text()[:150])
  b.close()
print(f'{sum(R)}/{len(R)}')
