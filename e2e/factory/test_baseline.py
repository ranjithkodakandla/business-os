"""Baseline: menus/pages load, Today actions, existing chat answers, approve/draft flows."""
import re, pytest
from conftest import BASE, ask

PILLARS = ['Home', 'Sell', 'Make', 'Buy', 'People', 'Money', 'Admin']

def test_every_pillar_and_page_loads(page):
    seen = []
    for g in PILLARS:
        page.locator(f'[data-testid=topnav] [data-menu="{g}"]').click(); page.wait_for_timeout(300)
        hrefs = page.locator('[data-testid=mega-menu] [data-nav]').evaluate_all('els => els.map(e => e.getAttribute("href"))')
        assert hrefs, f'{g} menu empty'
        seen += hrefs; page.keyboard.press('Escape'); page.locator(f'[data-testid=topnav] [data-menu="{g}"]').click(); page.wait_for_timeout(100)
    for h in dict.fromkeys(seen):
        page.goto(BASE + '/' + h.lstrip('/')) if h.startswith('#') else page.goto(BASE + '/#' + h)
        page.wait_for_timeout(700)
        main = page.locator('main').inner_text() if page.locator('main').count() else page.inner_text('body')
        assert len(main.strip()) > 40, f'{h} looks blank'
    assert len(seen) >= 30

def test_for_you_badges(page):
    page.locator('[data-testid=topnav] [data-menu="Admin"]').click()
    assert page.locator('[data-testid=mega-menu] [data-foryou]').count() >= 2  # v3 adds Factory agents

def todo(page, prefix):
    return page.locator(f'[data-todo^="{prefix}"] button[data-cta]').first

def test_today_has_five_mixed_items(page):
    keys = page.locator('[data-todo]').evaluate_all('els => els.map(e => e.dataset.todo)')
    assert len(keys) == 5 and keys[0] == 'licences'

def test_today_licence_action(page):
    todo(page, 'licences').click(); page.wait_for_timeout(600)
    assert 'filed' in page.inner_text('body').lower()

def test_today_tender_action(page):
    todo(page, 'TN-').click(); page.wait_for_timeout(800)
    assert '/tenders' in page.url

def test_today_po_action(page):
    todo(page, 'PG-').click(); page.wait_for_timeout(800)
    assert page.get_by_role('button', name='Approve & send').count()

def test_today_crew_action(page):
    todo(page, 'crew-').click(); page.wait_for_timeout(600)
    assert 'loaders' in page.inner_text('body')
    assert page.locator('[data-todo^="crew-"]').count() == 0

def test_today_customer_update_action(page):
    todo(page, 'EX-').click(); page.wait_for_timeout(800)
    assert page.get_by_role('button', name='Approve & send').count()

CHAT = [
    ('What expires this quarter at the Hosur site?', r'licences? at Site 2 Hosur expire'),
    ('Which approvals expire this month?', r'expire'),
    ('Prepare the tender pack for AP FiberGrid', r'TN-31|FiberGrid'),
    ("What are site 2's open purchase needs?", r'Site 2'),
    ('Draft a status update for the customer in Germany', r'EX-2041|Klaus'),
    ('How many contract workers are at work today?', r'people at work today'),
]
@pytest.mark.parametrize('q,expect', CHAT)
def test_existing_chat(page, q, expect):
    a = ask(page, q)
    assert re.search(expect, a.inner_text(), re.I), a.inner_text()[:300]

def test_flow_tender_answer_and_approve(page):
    page.goto(BASE + '/#/tenders?t=TN-33'); page.wait_for_timeout(800)
    while page.locator('input[placeholder="Type your answer"]').count():
        page.locator('input[placeholder="Type your answer"]').first.fill('Answer'); page.get_by_role('button', name='Save').first.click(); page.wait_for_timeout(250)
    page.get_by_role('button', name='Approve pack').click(); page.wait_for_timeout(400)
    assert 'Pack approved' in page.inner_text('body')

def test_flow_renewal_draft_then_approve(page):
    page.goto(BASE + '/#/renewals?r=RN-08'); page.wait_for_timeout(800)
    page.locator('tr[data-reg="RN-08"]').get_by_role('button', name='Draft pack').click(); page.wait_for_timeout(400)
    page.locator('tr[data-reg="RN-08"]').get_by_role('button', name='Approve & file').click(); page.wait_for_timeout(400)
    assert 'Chasing in 7 days' in page.locator('tr[data-reg="RN-08"]').inner_text()

def test_flow_po_approve_send(page):
    page.goto(BASE + '/#/purchasing'); page.wait_for_timeout(800)
    page.get_by_role('button', name=re.compile('^Approve ₹')).first.click(); page.wait_for_timeout(500)
    page.get_by_role('button', name='Approve & send').last.click(); page.wait_for_timeout(500)
    assert re.search(r'PO-\d+ sent', page.inner_text('body'))

def test_flow_customer_update_send(page):
    page.goto(BASE + '/#/customers'); page.wait_for_timeout(800)
    page.get_by_role('button', name=re.compile('send', re.I)).first.click(); page.wait_for_timeout(500)
    page.get_by_role('button', name='Approve & send').last.click(); page.wait_for_timeout(500)
    assert 'simulated' in page.inner_text('body').lower()
