# P0 regression: RBAC + role-scoped AI, settings, payroll, inbox, GST, attendance, audit, i18n. Browser-session only; nothing is sent.
import os, sys
from playwright.sync_api import sync_playwright
P = os.environ.get('BW_URL', 'http://127.0.0.1:8787'); out = 'verify/shots/p0'; res = []
def ok(n, c, d=''): res.append((n, bool(c))); print(('PASS' if c else 'FAIL'), n, '|', (d or '')[:150].replace('\n', ' '))
def send(pg, text, wait=20000):
    n = pg.locator('[data-msg=ai]').count()
    pg.fill('[data-testid=composer]', text); pg.keyboard.press('Enter')
    pg.wait_for_function(f"document.querySelectorAll('[data-msg=ai]').length > {n}", timeout=wait); pg.wait_for_timeout(600)
    return pg.locator('[data-msg=ai]').last
def card(a): c = a.locator('[data-testid=mod-card]'); return (c.get_attribute('data-kind'), c.get_attribute('data-module')) if c.count() else (None, None)
def role(pg, r):
    pg.click('[data-testid=profile-menu]'); pg.click(f'[data-role={r}]'); pg.wait_for_timeout(500)
def nav(pg, k):
    n = 0
    for g in pg.locator('[data-menu]').all():
        g.click(); pg.wait_for_timeout(120); n += pg.locator(f'[data-testid=mega-menu] [data-nav={k}]').count(); pg.keyboard.press('Escape')
    return n
def home(pg): pg.goto(P + '/#/'); pg.wait_for_selector('[data-testid=composer]')
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 1400, 'height': 1000}).new_page()
    pg.goto(P + '/'); pg.fill('input[type=password]', os.environ['BW_PASSCODE']); pg.keyboard.press('Enter'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(1200)
    pg.evaluate("localStorage.removeItem('business-workspace-demo-v5')"); home(pg); pg.reload(); pg.wait_for_selector('[data-testid=composer]')
    # ---- Owner: actions by text
    a = send(pg, 'run october payroll'); ok('run payroll -> action card', card(a) == ('action', 'payroll'), a.inner_text())
    a.locator('[data-testid=mod-confirm]').click(); pg.wait_for_timeout(400); ok('payroll drafted', 'Draft pay run ready' in a.inner_text(), a.inner_text())
    a = send(pg, 'give Ramesh 5,000 advance recover in 2 months'); ok('advance card filled', a.locator('[data-field=amount]').input_value() == '5000' and a.locator('[data-field=months]').input_value() == '2' and 'Ramesh' in a.locator('[data-field=employee]').input_value(), a.inner_text())
    a.locator('[data-testid=mod-confirm]').click(); pg.wait_for_timeout(400); ok('advance saved', 'advance to Ramesh' in a.inner_text(), a.inner_text())
    a = send(pg, 'giv advnce to venu'); ok('typo advance asks missing', card(a)[0] == 'action' and a.locator('[data-field=amount]').input_value() == '', a.inner_text())
    a = send(pg, '3000\n3 months'); ok('follow-up fills pending action', a.locator('[data-field=amount]').input_value() == '3000' and a.locator('[data-field=months]').input_value() == '3' and 'people are in' not in a.inner_text(), a.inner_text())
    a.locator('[data-testid=mod-cancel]').click()
    a = send(pg, 'total PF this month'); ok('total PF -> payroll view w/ chart', card(a) == ('view', 'payroll') and 'PF' in a.inner_text(), a.inner_text())
    a = send(pg, 'send payslips on whatsapp'); a.locator('[data-testid=mod-confirm]').click(); pg.wait_for_timeout(300); ok('payslips simulated only', 'simulation' in a.inner_text(), a.inner_text())
    a = send(pg, 'show open complaints for Sri Venkateswara Motors'); t = a.inner_text(); ok('open complaints for SVM -> table', card(a) == ('view', 'inbox') and 'TKT-1041' in t and 'Kakatiya' not in t, t)
    pg.screenshot(path=f'{out}/1-owner-chat.png')
    a = send(pg, 'add Kiran as stores user at Unit 2'); ok('invite user card', a.locator('[data-field=name]').input_value() == 'Kiran' and a.locator('[data-field=role]').input_value() == 'Stores' and 'Cherlapally' in a.locator('[data-field=unit]').input_value(), a.inner_text())
    a.locator('[data-testid=mod-confirm]').click(); pg.wait_for_timeout(300)
    a = send(pg, 'POs above 2 lakh need owner approval'); ok('approval band card', a.locator('[data-field=min]').input_value() == '200000' and a.locator('[data-field=approver]').input_value() == 'Owner', a.inner_text())
    a.locator('[data-testid=mod-confirm]').click(); pg.wait_for_timeout(300)
    a = send(pg, 'who can approve payments?'); ok('who can approve -> matrix card', card(a) == ('view', 'settings') and 'Accounts' in a.inner_text(), a.inner_text())
    a = send(pg, 'e-invoice status'); ok('e-invoice -> gst view', card(a) == ('view', 'gst'), a.inner_text())
    a = send(pg, 'pending leave requests'); ok('leave -> attendance view', card(a) == ('view', 'attendance'), a.inner_text())
    a = send(pg, 'what did the AI change'); ok('audit via chat shows agent writes', 'on behalf of' in a.inner_text(), a.inner_text())
    a = send(pg, 'what is 18% GST on 50000?', 30000); ok('GST calc still general', '9,000' in a.inner_text(), a.inner_text())
    for path, tid in [('payroll', 'page-payroll'), ('inbox', 'page-inbox'), ('gst', 'page-gst'), ('attendance', 'page-attendance'), ('audit', 'page-audit'), ('settings', 'page-settings')]:
        pg.goto(P + f'/#/{path}'); pg.wait_for_timeout(700); ok(f'/{path} renders', pg.locator(f'[data-testid={tid}]').count() == 1)
        pg.screenshot(path=f'{out}/page-{path}.png')
    pg.goto(P + '/#/audit'); pg.wait_for_timeout(500); ok('audit page lists AI writes on behalf', 'Business OS agent on behalf of Riya Reddy' in pg.inner_text('main'))
    pg.goto(P + '/#/settings?tab=Users'); pg.wait_for_timeout(400); ok('Kiran in users', 'Kiran' in pg.inner_text('main'))
    # ---- Sales role
    home(pg); role(pg, 'Sales'); ok('Sales tiles filtered (no payroll-ish tiles)', pg.locator('[data-tile=attendance]').count() == 0); ok('role badge Sales', pg.inner_text('[data-testid=current-role]') == 'Sales')
    ok('Sales nav hides payroll', nav(pg, 'payroll') == 0 and nav(pg, 'sales') == 1 and pg.locator('[data-menu=People]').count() == 0)
    a = send(pg, 'total PF this month'); ok('Sales asking payroll is refused (card)', card(a)[0] == 'denied' and 'ask an admin' in a.inner_text(), a.inner_text())
    a = send(pg, 'whats our salary bill'); ok('Sales salary refused', card(a)[0] == 'denied', a.inner_text())
    a = send(pg, 'show open complaints'); ok('Sales sees complaints', card(a) == ('view', 'inbox'), a.inner_text())
    pg.screenshot(path=f'{out}/2-sales-refused.png')
    pg.goto(P + '/#/payroll'); pg.wait_for_timeout(400); ok('Sales /payroll restricted', pg.locator('[data-testid=restricted]').count() == 1)
    # ---- HR role
    home(pg); role(pg, 'HR'); ok('HR nav shows payroll', nav(pg, 'payroll') == 1)
    a = send(pg, 'total PF this month'); ok('HR sees payroll answer', card(a) == ('view', 'payroll'), a.inner_text())
    a = send(pg, 'show sales pipeline'); ok('HR asking pipeline refused', card(a)[0] == 'denied', a.inner_text())
    # ---- Matrix drives RBAC live
    role(pg, 'Owner'); pg.goto(P + '/#/settings?tab=Permissions'); pg.wait_for_timeout(400); pg.click('[data-perm-role=Sales]'); pg.click('[data-cell="payroll:view"]'); pg.wait_for_timeout(200)
    pg.screenshot(path=f'{out}/3-matrix.png')
    home(pg); role(pg, 'Sales'); ok('matrix grant shows payroll for Sales', nav(pg, 'payroll') == 1)
    role(pg, 'Owner')
    # ---- i18n
    pg.click('[data-lang=te]'); pg.wait_for_timeout(300); ok("Telugu nav", 'ఉద్యోగులు' in pg.inner_text('[data-testid=topnav]'))
    pg.click('[data-lang=hi]'); pg.wait_for_timeout(300); ok('Hindi nav', 'कर्मचारी' in pg.inner_text('[data-testid=topnav]')); pg.screenshot(path=f'{out}/4-hindi.png'); pg.click('[data-lang=en]')
    # ---- top menu: 7 groups, mega-menu with context panel, keyboard + outside click
    home(pg)
    ok('7 top menu groups for Owner', pg.locator('[data-menu]').count() == 7)
    pg.click('[data-menu=Buy]'); pg.wait_for_timeout(200)
    ok('mega-menu shows modules + low-stock panel', pg.locator('[data-testid=mega-menu] [data-nav=inventory]').count() == 1 and 'Low stock' in pg.inner_text('[data-testid=menu-context]'))
    pg.mouse.click(700, 600); pg.wait_for_timeout(200); ok('outside click closes', pg.locator('[data-testid=mega-menu]').count() == 0)
    pg.focus('[data-menu=People]'); pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    ok('keyboard opens menu + navigates', pg.locator('[data-testid=mega-menu]').count() == 0 and ('/people' in pg.url or '/attendance' in pg.url), pg.url)
    home(pg); ok('stat tiles with trend', pg.locator('[data-tile]').count() == 7 and pg.locator('[data-trend=bad]').count() > 0)
    pg.click('[data-tile=overdue]'); pg.wait_for_timeout(400); ok('tile opens filtered view', 'Receivables' in pg.url, pg.url)
    home(pg); ok('needs-today + agent panel', pg.locator('[data-testid=needs-today]').count() == 1 and pg.locator('[data-testid=agent-activity]').count() == 1)
    b.close()
print(f"{sum(c for _, c in res)}/{len(res)} passed"); sys.exit(0 if all(c for _, c in res) else 1)
