# Chat context regression: follow-up answers, add-employee flow, messy inputs. Read-only on the server (no runs, no sends).
import os, sys, re
from playwright.sync_api import sync_playwright
P = os.environ.get('BW_URL', 'http://127.0.0.1:8787'); out = 'verify/shots/context'; res = []
def ok(n, c, d=''): res.append((n, bool(c))); print(('PASS' if c else 'FAIL'), n, '|', d[:160].replace('\n', ' '))
def send(pg, text, wait=20000):
    n = pg.locator('[data-msg=ai]').count()
    pg.fill('[data-testid=composer]', text); pg.keyboard.press('Enter')
    pg.wait_for_function(f"document.querySelectorAll('[data-msg=ai]').length > {n}", timeout=wait); pg.wait_for_timeout(700)
    return pg.locator('[data-msg=ai]').last
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 1360, 'height': 1000}).new_page()
    pg.goto(P + '/'); pg.fill('input[type=password]', os.environ['BW_PASSCODE']); pg.keyboard.press('Enter'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(1500)
    pg.goto(P + '/#/'); pg.wait_for_selector('[data-testid=composer]')
    # 1. exact repro, as one-shot + follow-up answers
    a = send(pg, 'add Saad Ansari as co-founder')
    k = a.locator('[data-testid=data-card]').get_attribute('data-kind') if a.locator('[data-testid=data-card]').count() else ''
    ok('add Saad Ansari as co-founder -> person card', k == 'add_person', a.inner_text())
    a = send(pg, 'Role - Co founder\nEmployeement type - Full time\nStart date - today\nreporting - blank\nno compnesatink')
    t = a.inner_text(); ok('multi-line answers update the same card (no attendance table)', 'add_person' == (a.locator('[data-testid=data-card]').get_attribute('data-kind') or '') and 'people are in' not in t and 'Co-founder' in t, t)
    pg.screenshot(path=f'{out}/1-saad-answers.png', full_page=False)
    a.locator('[data-testid=data-confirm]').click(); pg.wait_for_timeout(600)
    ok('saved confirmation', 'added to People & HR' in a.inner_text(), a.inner_text())
    # 2. one-shot with missing role
    a = send(pg, 'add new employee Ravi in sales'); t = a.inner_text()
    ok('add new employee Ravi in sales -> card asks role, team Sales', 'Ravi' in t and 'Sales' in t and 'role' in t.lower(), t)
    a = send(pg, 'role - sales executive'); t = a.inner_text()
    ok('single answer fills role', 'Sales Executive' in t, t)
    a.locator('[data-testid=data-confirm]').click(); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{out}/2-ravi.png')
    # 3. messy general inputs
    a = send(pg, 'hey hi', 30000); ok('hey hi -> greeting text', len(a.inner_text()) > 10 and 'people are in' not in a.inner_text(), a.inner_text())
    a = send(pg, 'show suppliers'); ok('show suppliers -> table', a.locator('[data-testid=data-card]').count() > 0, a.inner_text())
    a = send(pg, 'update Decan Castings lead time to 7 days'); t = a.inner_text()
    ok('update Decan Castings lead time -> diff card', 'Deccan' in t and '7 days' in t, t)
    a.locator('[data-testid=data-cancel]').click()
    # 4. supplier add + follow-up answer
    a = send(pg, 'add supplier Sri Ganesh Metals'); ok('supplier add card', (a.locator('[data-testid=data-card]').get_attribute('data-kind') or '') == 'add_supplier', a.inner_text())
    a = send(pg, 'contact person - Ramesh\ncity - Balanagar\nsupplies - MS pipes'); t = a.inner_text()
    ok('supplier follow-up merged', (a.locator('[data-testid=data-card]').get_attribute('data-kind') or '') == 'add_supplier' and a.locator('[data-field=person]').input_value() == 'Ramesh', t)
    pg.screenshot(path=f'{out}/3-supplier-followup.png')
    a.locator('[data-testid=data-cancel]').click()
    a = send(pg, 'what is 18% GST on 50000?', 30000); ok('GST question answered', '9,000' in a.inner_text(), a.inner_text())
    # 5. People & HR list shows new people
    pg.goto(P + '/#/people'); pg.wait_for_timeout(1200); t = pg.locator('main').inner_text()
    ok('People & HR lists Saad + Ravi', 'Saad Ansari' in t and 'Ravi' in t, '')
    pg.screenshot(path=f'{out}/4-people.png')
    b.close()
print(f"{sum(c for _, c in res)}/{len(res)} passed"); sys.exit(0 if all(c for _, c in res) else 1)
