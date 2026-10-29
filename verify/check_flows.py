from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:4173/#'
errs = []
def ok(c, m): print(('PASS ' if c else 'FAIL ') + m)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    # chat prompts
    for q, must in [('Can we deliver SO-1051 by Friday?', ['35', '65', 'PR-208']), ('Why are two orders at risk?', ['SO-1049']), ('Which customers owe us the most?', ['Sri Lakshmi']),
                    ('Find suppliers for the material we\'re short of.', ['Prime Components']), ('Prepare tomorrow\'s dispatch plan.', ['SO-1044']), ('Raise a PO for the shortfall from the best quote', ['Prime']),
                    ('How much money is stuck?', ['lakh']), ('Which job work challans are pending?', ['DC-JW-0709']), ('What GST is due?', ['GSTR'])]:
        pg.fill('[data-testid=composer]', q); pg.click('[data-testid=composer-send]'); pg.wait_for_timeout(1900)
        last = pg.locator('[data-answer]').last if pg.locator('[data-answer]').count() else pg.locator('#conversation ~ *').last
        txt = pg.locator('main').inner_text()
        ok(all(m in txt for m in must), f'chat: {q}')
    # handoff
    btn = pg.locator('[data-action=handoff-followup]').first
    ok(btn.count() > 0, 'handoff button present')
    btn.click(); pg.wait_for_timeout(500); ok(pg.locator('[data-task=running]').count() > 0, 'task running')
    pg.wait_for_timeout(4500); ok(pg.locator('[data-task=done]').count() > 0, 'task done')
    # link from answer
    pg.locator('main a[href="#/inventory/RM-A17"]').first.click(); pg.wait_for_timeout(400); ok('RM-A17' in pg.locator('h1').inner_text(), 'answer link -> RM-A17')
    # guide
    pg.goto(BASE + '/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
    pg.click('[data-testid=start-guide]'); pg.wait_for_timeout(400)
    for i in range(10):
        nxt = pg.locator('[data-testid=guide-next]')
        if nxt.count() == 0: break
        if nxt.is_disabled():
            pg.click('[data-testid=review-approve]'); pg.wait_for_timeout(300); pg.click('[data-testid=approve-pr]'); pg.wait_for_timeout(500)
            ok(not nxt.is_disabled(), 'guide gate unlocked after approval')
        nxt.click(); pg.wait_for_timeout(500)
        print('  guide step ->', pg.url.split('#')[1])
    # approvals page agent item approve
    pg.goto(BASE + '/approvals'); pg.wait_for_timeout(400)
    n0 = pg.locator('[data-approval]').count()
    pg.locator('[data-approve="apr-jw0709"]').click(); pg.wait_for_timeout(300); pg.click('[data-testid=draft-approve]'); pg.wait_for_timeout(400)
    ok(pg.locator('[data-approval]').count() == n0 - 1, f'approval removed ({n0}->{pg.locator("[data-approval]").count()})')
    # finance flows
    pg.goto(BASE + '/finance/INV-1044'); pg.wait_for_timeout(300); pg.click('[data-testid=record-payment]'); pg.click('[data-testid=save-payment]'); pg.wait_for_timeout(300)
    ok('Paid' in pg.locator('main').inner_text(), 'record payment')
    with pg.expect_download() as d: pg.goto(BASE + '/finance'); pg.wait_for_timeout(300); pg.click('[data-testid=tally-export]')
    ok(d.value.suggested_filename.endswith('.xml'), 'tally export download')
    pg.goto(BASE + '/job-work?tab=ITC-04'); pg.wait_for_timeout(300)
    with pg.expect_download() as d2: pg.click('[data-testid=itc04-download]')
    ok(d2.value.suggested_filename.endswith('.csv'), 'itc04 download')
    # ops
    pg.goto(BASE + '/operations'); pg.wait_for_timeout(300); pg.locator('tbody tr').nth(5).click(); pg.wait_for_timeout(300); pg.click('[data-testid=assign-owner]'); pg.wait_for_timeout(300); pg.keyboard.press('Escape')
    pg.goto(BASE + '/operations?order=SO-1051'); pg.wait_for_timeout(300); ok(pg.locator('[data-testid=split-plan]').count() == 1, 'split plan shown after approval')
    # agents
    pg.goto(BASE + '/agents'); pg.wait_for_timeout(300); pg.click('[data-run=collections]'); pg.wait_for_timeout(3200); ok('No new reminders' in pg.locator('main').inner_text(), 'agent run now logs')
    # setup
    pg.goto(BASE + '/setup'); pg.wait_for_timeout(300)
    for i in range(5): pg.click('[data-testid=setup-next]'); pg.wait_for_timeout(200)
    ok("You're set up" in pg.locator('main').inner_text(), 'setup completes')
    # lang
    pg.goto(BASE + '/'); pg.click('[data-lang=te]'); pg.wait_for_timeout(300); ok('శుభోదయం' in pg.locator('h1').inner_text(), 'telugu toggle'); pg.click('[data-lang=en]')
    # reset
    pg.click('[data-testid=reset-demo]'); pg.wait_for_timeout(200); pg.click('[data-testid=confirm-ok]'); pg.wait_for_timeout(500)
    pg.goto(BASE + '/approvals'); pg.wait_for_timeout(300); ok(pg.locator('[data-approval]').count() >= 6, 'reset restores approvals')
    b.close()
print('ERRORS', len(errs), errs[:10])
