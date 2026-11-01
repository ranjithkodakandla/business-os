"""v4: contact/list answers are always tables with actions; email thread digest; team availability + reassign."""
import os, pytest
from conftest import ask, BASE

OUT = os.environ.get('FX_OUT', '/workspace/factory-demo/v4')
def shot(page, name):
    os.makedirs(OUT, exist_ok=True); page.screenshot(path=f'{OUT}/{name}.png', full_page=False)

CONTACT_QS = [
    'get me supplier contacts', 'Get me supplier contacts', 'supplier contacts', 'show supplier contact details',
    'give me phone numbers of our suppliers', 'vendor contacts please', 'list all suppliers', 'who are our suppliers?',
    'customer contacts', 'email ids of our customers', 'team contacts', 'how do I reach Vega RF?', 'contact for AeroSpark',
]
@pytest.mark.parametrize('q', CONTACT_QS)
def test_contacts_are_tables(page, q):
    a = ask(page, q)
    assert a.locator('[data-fx=contacts] tbody tr').count() >= 1, a.inner_text()
    assert a.locator('[data-act=call]').count() and a.locator('[data-act=whatsapp]').count() and a.locator('[data-act=email]').count()
    assert a.locator('li').count() == 0  # never a bullet list

def test_supplier_contacts_actions(page):
    a = ask(page, 'get me supplier contacts')
    body = a.inner_text()
    for n in ['Vega RF Parts', 'AeroSpark', 'Godavari Paper Mills', 'Site 3 Medak']: assert n in body
    assert a.locator('[data-act=rfq]').count() >= 3
    shot(page, 'supplier-contacts-fixed')
    a.locator('[data-act=call]').first.click(); page.wait_for_timeout(400)
    assert 'simulated' in page.inner_text('body').lower()
    a.locator('[data-act=rfq]').first.click(); page.wait_for_timeout(500)
    assert page.get_by_role('button', name='Approve & send').count()


THREAD_QS = ["what's pending in my email threads?", 'summarise my email threads', 'which emails are stuck?', 'show my inbox follow ups']
@pytest.mark.parametrize('q', THREAD_QS)
def test_thread_digest(page, q):
    a = ask(page, q)
    assert a.locator('[data-fx=threads] [data-thread]').count() == 5, a.inner_text()
    assert 'Waiting on us' in a.inner_text()

def test_thread_summary_vega(page):
    a = ask(page, 'summarise the Vega RF thread')
    c = a.locator('[data-fx=thread]'); assert c.count() == 1
    t = c.inner_text(); assert 'split delivery' in t and '6 days' in t and 'Kiran' in t and 'Draft reply' in t
    shot(page, 'thread-digest')
    c.locator('[data-act=reply]').click(); page.wait_for_timeout(500)
    page.get_by_role('button', name='Approve & send reply').click(); page.wait_for_timeout(500)
    assert 'Reply sent' in page.inner_text('body')

def test_digest_screenshot(page):
    ask(page, "what's pending in my email threads?"); shot(page, 'thread-list')

def test_who_handles_aerospark(page):
    a = ask(page, 'Who is handling the AeroSpark order and are they available?')
    t = a.inner_text(); assert 'Kiran' in t and 'On leave' in t and 'Sunil' in t
    assert a.locator('[data-fx=team]').count() and a.locator('[data-fx=thread]').count()
    shot(page, 'availability-reassign-before')
    a.locator('[data-fx=team] [data-act=reassign]').first.click(); page.wait_for_timeout(600)
    assert 'handed to Sunil' in page.inner_text('body')
    assert a.locator('[data-reassigned=TH-2]').count()
    shot(page, 'availability-reassign')

def test_who_is_on_leave(page):
    a = ask(page, 'who is on leave today?')
    assert a.locator('[data-fx=team] [data-person]').count() == 8
    assert a.locator('[data-status="On leave"]').count() == 2

def test_today_thread_row_and_max5(page):
    keys = page.locator('[data-todo]').evaluate_all('els => els.map(e => e.dataset.todo)')
    assert len(keys) == 5 and 'TH-1' in keys
    shot(page, 'home-needs-you')

def test_pages_for_you(page):
    page.goto(BASE + '/#/email-threads'); page.wait_for_timeout(800)
    assert page.locator('[data-thread]').count() == 5
    page.locator('[data-thread=TH-1] [data-act=open-thread]').click(); page.wait_for_timeout(400)
    assert page.locator('[data-fx=thread]').count() == 1
    page.goto(BASE + '/#/team-status'); page.wait_for_timeout(800)
    assert page.locator('[data-person]').count() == 8
    page.locator('[data-act=reassign]').first.click(); page.wait_for_timeout(500)
    assert page.locator('[data-reassigned]').count() >= 1
    shot(page, 'team-availability-page')

def test_guardrail_list_to_table_unit():
    import subprocess, pathlib
    root = pathlib.Path(__file__).resolve().parents[2]
    r = subprocess.run(['npx', 'tsx', 'scripts/guard_check.ts'], cwd=root, capture_output=True, text=True, timeout=120)
    assert r.returncode == 0, r.stdout + r.stderr
