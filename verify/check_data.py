import sys, re
from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5185'; O='/workspace/business-workspace/verify/shots/data'
R=[]
def ck(n,c,d=''): R.append(bool(c)); print('PASS' if c else 'FAIL',n,d if not c else '')
FAKE_SR="""window.SpeechRecognition=class{constructor(){this.lang='';window.__sr=this}start(){window.__srLang=this.lang;setTimeout(()=>this.onresult&&this.onresult({resultIndex:0,results:[Object.assign([{transcript:'show steel suppliers'}],{isFinal:false})]}),200);setTimeout(()=>this.onresult&&this.onresult({resultIndex:0,results:[Object.assign([{transcript:'show steel suppliers in Hyderabad'}],{isFinal:true})]}),500)}stop(){this.onend&&this.onend()}}"""
with sync_playwright() as p:
  b=p.chromium.launch(); errs=[]
  ctx=b.new_context(viewport={'width':1440,'height':900}); ctx.add_init_script(FAKE_SR)
  pg=ctx.new_page(); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
  pg.goto(U+'/#/'); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1500)
  def ask(t, wait='[data-testid=data-card]'):
    n=pg.locator('[data-msg=ai]').count()
    pg.fill('[data-testid=composer]', t); pg.keyboard.press('Enter')
    pg.wait_for_function(f"document.querySelectorAll('[data-msg=ai]').length>{n}", timeout=20000); pg.wait_for_timeout(700)
    return pg.locator('[data-msg=ai]').last
  def shot(name): pg.locator('[data-msg=ai]').last.scroll_into_view_if_needed(); pg.screenshot(path=f'{O}/{name}.png')
  # 1 add supplier
  a=ask('hey add new vendor Ganesh Steel Traders, contact Ravi 9876543210, Jeedimetla, they do MS sheets and plates')
  card=a.locator('[data-testid=data-card]'); ck('add: confirm card', card.get_attribute('data-kind')=='add_supplier', a.inner_text()[:200])
  ck('add: GSTIN flagged missing', 'Missing' in card.locator('label', has_text='GSTIN').inner_text())
  ck('add: phone masked in card', '98•••• 3210' in card.inner_text() or pg.locator('[data-field=phone]').input_value().find('••••')>0, pg.locator('[data-field=phone]').input_value() if pg.locator('[data-field=phone]').count() else '')
  shot('1-add-supplier-confirm')
  card.locator('[data-testid=data-confirm]').click(); pg.wait_for_timeout(500)
  ck('add: saved state', a.locator('[data-testid=data-done]').count()==1)
  # 2 receive
  a=ask('recieved 200 kg 2mm MS sheet from balaji @ 68/kg')
  card=a.locator('[data-testid=data-card]'); ck('receive: card', card.get_attribute('data-kind')=='receive', a.inner_text()[:300])
  txt=card.inner_text(); ck('receive: kg converted to sheets', 'sheet' in txt.lower() and '49' in txt, txt[:300])
  shot('2-receive-stock-confirm')
  card.locator('[data-testid=data-confirm]').click(); pg.wait_for_timeout(500)
  # 4 update
  a=ask("balaji's new number is 9123456780 pls update")
  card=a.locator('[data-testid=data-card]'); ck('update phone: diff card', card.get_attribute('data-kind')=='update' and a.locator('[data-before]').count()>=1, a.inner_text()[:300])
  ck('update phone: masked', '••••' in a.locator('[data-after]').first.inner_text() and '9123456780' not in a.inner_text())
  shot('4a-update-phone-diff'); card.locator('[data-testid=data-confirm]').click(); pg.wait_for_timeout(400)
  a=ask('mark PO-302 paid'); k=a.locator('[data-testid=data-card]').get_attribute('data-kind')
  ck('unknown PO: not found with suggestions', k=='notfound' and a.locator('[data-act^="ask:"]').count()>=1, a.inner_text()[:300]); shot('4b-po-notfound')
  a.locator('[data-act^="ask:"]').first.click(); pg.wait_for_timeout(2500); a=pg.locator('[data-msg=ai]').last
  ck('suggestion chip → update diff', a.locator('[data-testid=data-card]').get_attribute('data-kind')=='update', a.inner_text()[:200])
  a.locator('[data-testid=data-cancel]').click(); pg.wait_for_timeout(300); ck('cancel leaves data', a.locator('[data-testid=data-cancelled]').count()==1)
  # 4c multi-field update (user's prod report) + variants
  n=pg.locator('[data-msg=ai]').count(); pg.fill('[data-testid=composer]','can you update Decan Castings area from Medak to Nampally and lead days to 6 days'); pg.keyboard.press('Enter')
  pg.wait_for_timeout(150); ck('immediate Understanding state', 'Understanding' in (pg.locator('[data-testid=thinking-stage]').inner_text() if pg.locator('[data-testid=thinking-stage]').count() else ''))
  pg.wait_for_function(f"document.querySelectorAll('[data-msg=ai]').length>{n}", timeout=8000); pg.wait_for_timeout(500); a=pg.locator('[data-msg=ai]').last
  t=a.inner_text(); ck('exact msg: one diff card, 2 fields', a.locator('[data-testid=data-card]').get_attribute('data-kind')=='update' and a.locator('[data-after]').count()==2 and 'Nampally' in t and '6 days' in t and 'Deccan Castings' in t, t[:300])
  shot('4c-multi-field-update'); a.locator('[data-testid=data-confirm]').click(); pg.wait_for_timeout(400)
  for v,exp in [('chnage deccan casting location to Kukatpally, lead time 7','Kukatpally'),('Deccan Castings area Uppal ki marchu, lead days 5 cheyyi','Uppal'),('pls updte decan castngs lead days to 4 and payment terms to Net 45','Net 45')]:
    a=ask(v); t=a.inner_text(); ck(f'variant: {v[:30]}', a.locator('[data-testid=data-card]').get_attribute('data-kind')=='update' and exp in t and a.locator('[data-after]').count()==2, t[:250])
    a.locator('[data-testid=data-cancel]').click(); pg.wait_for_timeout(200)
  a=ask('update deccan area to nampally'); t=a.inner_text(); ck('ambiguous → did you mean', 'Did you mean' in t and a.locator('[data-act^="ask:"]').count()>=2, t[:250]); shot('4d-did-you-mean')
  a.locator('[data-act^="ask:"]', has_text='Deccan Castings').first.click(); pg.wait_for_timeout(5000); a=pg.locator('[data-msg=ai]').last
  ck('did-you-mean → diff', a.locator('[data-testid=data-card]').get_attribute('data-kind')=='update' and 'Deccan Castings' in a.inner_text(), a.inner_text()[:200]); a.locator('[data-testid=data-cancel]').click()
  # slow AI: card still within ~5 s via rules
  ctx.route('**/api/intent', lambda r: r.fulfill(status=504, body='{}', content_type='application/json'))
  import time; t0=time.time(); a=ask('change deccan castings lead days to 8'); dt=time.time()-t0
  ck('AI slow/down → rules card within ~5s', a.locator('[data-testid=data-card]').get_attribute('data-kind')=='update' and dt<6.5, f'{dt:.1f}s'); a.locator('[data-testid=data-cancel]').click()
  ctx.unroute('**/api/intent')
  # 7 view
  a=ask('show me steel suppliers in hyd')
  ck('view: table', a.locator('[data-testid=data-table]').count()>=1 and a.locator('[data-testid=data-table] tbody tr').count()>=2, a.inner_text()[:300])
  ck('view: new supplier listed', 'Ganesh Steel' in a.inner_text())
  ck('view: no raw phones', not re.search(r'\b[6-9]\d{9}\b', a.inner_text()))
  first=a.locator('tbody tr td').first.inner_text(); a.locator('[data-sort]').first.click(); a.locator('[data-sort]').first.click(); pg.wait_for_timeout(200)
  ck('view: sortable', a.locator('th[aria-sort=descending]').count()==1); shot('7a-view-suppliers-table')
  a=ask("whats pending from lakshmi projects?")
  ck('view: customer record card', a.locator('[data-testid=data-card]').get_attribute('data-kind')=='record' and 'INV-1048' in a.inner_text(), a.inner_text()[:300]); shot('7b-pending-lakshmi')
  # 8 insights
  a=ask('who is my most reliable supplier this quarter')
  ck('insight reliable: chart + suggestion', a.locator('[data-testid=data-chart]').count()==1 and a.locator('[data-testid=suggestion]').count()==1, a.inner_text()[:300]); shot('8a-insight-reliable')
  a=ask('where am i overpaying?')
  ck('insight overpaying: chart', a.locator('[data-testid=data-chart]').count()==1, a.inner_text()[:300]); shot('8b-insight-overpaying')
  ck('no bullet-point text in data answers', all(c.locator('ul').count()==0 for c in pg.locator('[data-testid=data-card]').all()))
  # 10 voice
  pg.click('[data-testid=composer-mic]'); pg.wait_for_timeout(250)
  ck('voice: live indicator', pg.locator('[data-testid=voice-live]').is_visible()); pg.screenshot(path=f'{O}/10-voice-listening.png')
  pg.wait_for_timeout(500); ck('voice: transcript in box, not sent', pg.locator('[data-testid=composer]').input_value()=='show steel suppliers in Hyderabad' and pg.evaluate('window.__srLang')=='en-IN')
  pg.click('[data-testid=composer-mic]'); pg.wait_for_timeout(200); ck('voice: stop', not pg.locator('[data-testid=voice-live]').count())
  pg.fill('[data-testid=composer]','')
  # old behaviours
  a=ask('hi', '[data-msg=ai]'); ck('greeting still text', a.locator('[data-testid=data-card]').count()==0)
  a=ask('18% gst on 45000', '[data-msg=ai]'); ck('gst maths still works', '8,100' in a.inner_text() or '8100' in a.inner_text(), a.inner_text()[:200])
  a=ask('need 50 sheets 2mm MS urgently', '[data-msg=ai]'); ck('sourcing still preview (not receive)', a.locator('[data-testid=data-card]').count()==0, a.inner_text()[:200])
  # reflects across pages
  pg.goto(U+'/#/suppliers'); pg.wait_for_timeout(900); t=pg.locator('main').inner_text()
  ck('Suppliers page: new supplier + GSTIN missing', 'Ganesh Steel' in t and pg.locator('[data-testid=gstin-missing]').count()>=1)
  ck('Suppliers page: Balaji phone updated masked', '91•••• 6780' in t and '9123456780' not in t); pg.screenshot(path=f'{O}/page-suppliers.png')
  pg.goto(U+'/#/inventory/RM-MS2'); pg.wait_for_timeout(900); pg.get_by_role('tab', name='Movements').or_(pg.get_by_role('button', name='Movements')).first.click(); pg.wait_for_timeout(300); ck('Inventory: chat GRN in movements', 'logged from chat' in pg.locator('main').inner_text()); pg.screenshot(path=f'{O}/page-inventory.png')
  # mobile
  m=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True).new_page(); m.goto(U+'/#/'); m.wait_for_timeout(1200)
  m.fill('[data-testid=composer]','where am i overpaying'); m.keyboard.press('Enter'); m.wait_for_selector('[data-testid=data-card]',timeout=20000); m.wait_for_timeout(800)
  ck('mobile: no horizontal overflow', m.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1")); m.locator('[data-testid=data-card]').last.scroll_into_view_if_needed(); m.screenshot(path=f'{O}/mobile-insight.png')
  m.fill('[data-testid=composer]','add supplier Om Sai Gaskets, Balanagar, gaskets and seals'); m.keyboard.press('Enter'); m.wait_for_timeout(5000); m.locator('[data-testid=data-card]').last.scroll_into_view_if_needed(); m.screenshot(path=f'{O}/mobile-add-supplier.png')
  errs=[e for e in errs if '504' not in e]; ck('no console errors', not errs, errs[:3])
  print(f'{sum(R)}/{len(R)}')
