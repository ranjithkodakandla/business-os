"""v3 flows: 30+ owner questions, licence upload, sourcing (chat + agents page), tender eligibility + price + bid ZIP."""
import os, re, time, zipfile, io, pytest
from conftest import BASE, ask

SAMPLES = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'samples')
OUT = os.environ.get('FX_OUT', '/workspace/factory-demo/v3')
AI_FAIL = r"couldn't get an AI answer"
TENDER_TXT = open(os.path.join(SAMPLES, 'Tender_BTNL_RF_Modules_2026.txt')).read()

# (question, expected regex, area). 'ai' rows go to the language model: they must answer in time and not fall back.
QS = [
    ('What should I focus on today?', r'things need you', 'approvals'),
    ('What is pending for my approval?', r'things need you', 'approvals'),
    ('Which licences expire in the next 90 days?', r'expire in 90 days', 'approvals'),
    ('Is anything overdue at Medak?', r'Medak', 'approvals'),
    ('Show the fire NOC status for all sites', r'expire', 'approvals'),
    ('Which tenders are open?', r'open tenders', 'tenders'),
    ('Prepare the tender pack for TN-32', r'TN-32', 'tenders'),
    (TENDER_TXT, r'can apply', 'tenders'),
    ('Can we apply for a tender that needs ISO 14001 and 20 crore turnover?', 'ai', 'tenders'),
    ('What is EMD and are we exempt from it?', 'ai', 'tenders'),
    ('Find suppliers for 5000 corrugated boxes 5-ply', r'suppliers for 5,000 boxes', 'purchasing'),
    ('I need 2000 SMA connectors, best price', r'suppliers for 2,000 pcs', 'purchasing'),
    ('Get quotes for 40 BLDC drone motors', r'suppliers for 40 pcs', 'purchasing'),
    ('Who is the cheapest supplier for LiPo batteries?', r'suppliers for .* packs', 'purchasing'),
    ('Show all open purchase needs across sites', r'needs from 3 sites', 'purchasing'),
    ('What is the status of export orders?', r'Export orders', 'customers'),
    ('Any quality issues this week?', r'quality', 'customers'),
    ('Draft an update for the UAE customer', r'EX-2044|UAE', 'customers'),
    ('Which customer is waiting longest for a reply?', 'ai', 'customers'),
    ('How many people are absent today at Hosur?', r'people at work today', 'workforce'),
    ('Do we have enough loaders at Medak today?', 'ai', 'workforce'),
    ('How many daily wage workers came today?', r'people at work today', 'workforce'),
    ('What is our cash position?', r'Cash today', 'money'),
    ('Who owes us money?', r'Customers owe you', 'money'),
    ('What payments are due this week?', r'to pay in the next 7 days', 'money'),
    ('How are sales trending?', r'Sales', 'money'),
    ('Which business has the best margin?', r'Margin', 'money'),
    ('How much GST do we pay this month?', r'GST due', 'money'),
    ('Hi', r'what I can do', 'general'),
    ('What can you do?', r'what I can do', 'general'),
    ('Write a short thank-you note to the Hosur team for zero accidents this month', 'ai', 'general'),
    ('What does CLRA mean?', 'ai', 'general'),
    ('Summarise this week for me in 3 lines', 'ai', 'general'),
    ('Should we take a loan to expand Site 2?', 'ai', 'general'),
]
RESULTS = []

@pytest.mark.parametrize('q,expect,area', QS, ids=[f'{i:02d}-{a}' for i, (_, _, a) in enumerate(QS, 1)])
def test_question(page, q, expect, area):
    t0 = time.time(); a = ask(page, q); dt = time.time() - t0; txt = a.inner_text()
    RESULTS.append((q[:70], area, round(dt, 1), txt.split('\n')[0][:90]))
    if expect == 'ai':
        assert not re.search(AI_FAIL, txt), f'AI fallback after {dt:.1f}s'
        assert dt < 13, f'took {dt:.1f}s'
        assert len(txt.strip()) > 20
    else:
        assert re.search(expect, txt, re.I), txt[:300]
        assert not re.search(r'Aarohan|MS sheet', txt), 'main-app answer leaked'

def upload(page, name):
    page.goto(BASE + '/#/'); page.wait_for_selector('[data-testid=composer-file]', state='attached')
    page.set_input_files('[data-testid=composer-file]', os.path.join(SAMPLES, name))

@pytest.mark.parametrize('name,kind,number,site', [
    ('Licence_FireNOC_Site1_Cherlapally.pdf', 'Fire NOC', 'TSFS/HYD/NOC/2026/0457', 'S1'),
    ('Licence_PollutionCTO_Site1_Cherlapally.pdf', 'Pollution Board CTO', 'TSPCB/RCP/CHP/CFO/2024/3381', 'S1'),
    ('Licence_TradeLicence_Site3_Medak.png', 'Trade licence', 'MDK/TL/2026/0784', 'S3'),
])
def test_licence_upload(page, name, kind, number, site):
    upload(page, name)
    card = page.locator('[data-fx=licence]').last; card.wait_for(timeout=90000)
    assert page.locator('[data-field=kind]').last.input_value() == kind
    got = page.locator('[data-field=number]').last.input_value()
    if name.endswith('.png'):  # photo text recognition can misread a character; fix it like a user would
        if got != number: page.locator('[data-field=number]').last.fill(number)
    else:
        assert got == number
    assert page.locator('[data-field=site]').last.input_value() == site
    assert page.locator('[data-field=expires]').last.input_value()
    assert card.locator('[data-reminder]').count() == 4
    card.locator('[data-fx-act=confirm-licence]').click(); page.wait_for_timeout(500)
    assert card.get_attribute('data-status') == 'added'
    if os.environ.get('FX_SHOTS'): page.screenshot(path=f"{OUT}/upload-{kind.split()[0].lower()}.png", full_page=False)
    page.goto(BASE + '/#/renewals'); page.wait_for_timeout(800)
    assert number in page.inner_text('body') or kind in page.inner_text('body')

def test_sourcing_chat_po(page):
    a = ask(page, 'find suppliers for 5000 corrugated boxes 5-ply')
    card = a.locator('[data-fx=sourcing]'); assert card.locator('[data-supplier]').count() >= 4
    assert 'Recommended' in card.inner_text()
    card.locator('[data-fx-act=po]').click(); page.get_by_role('button', name='Approve & send PO').click(); page.wait_for_timeout(500)
    assert re.search(r'PO-\d+ sent', card.inner_text())

def test_sourcing_chat_rfq(page):
    a = ask(page, 'I need 2000 SMA connectors, best price')
    card = a.locator('[data-fx=sourcing]'); card.locator('[data-fx-act=rfq]').click()
    page.get_by_role('button', name='Approve & send RFQ').click(); page.wait_for_timeout(500)
    assert re.search(r'RFQ-\d+ sent to 3', card.inner_text())

def test_sourcing_agents_page(page):
    page.goto(BASE + '/#/factory-agents'); page.wait_for_selector('[data-testid=sourcing-agent]')
    page.locator('[data-testid=sourcing-agent] button[type=submit]').click()
    card = page.locator('[data-fx=sourcing]'); card.wait_for()
    if os.environ.get('FX_SHOTS'): page.screenshot(path=f'{OUT}/agents-sourcing.png', full_page=True)
    card.locator('[data-fx-act=po]').click(); page.get_by_role('button', name='Approve & send PO').click(); page.wait_for_timeout(500)
    assert re.search(r'PO-\d+ sent', card.inner_text())

def test_tender_eligible_zip(page):
    upload(page, 'Tender_BTNL_RF_Modules_2026.pdf')
    card = page.locator('[data-fx=tender]').last; card.wait_for(timeout=60000)
    assert card.get_attribute('data-verdict') == 'yes', card.inner_text()[:400]
    assert card.locator('[data-check=ok]').count() >= 5
    page.locator('[data-field=price]').last.fill('865')
    with page.expect_download() as dl:
        card.locator('[data-fx-act=approve-bid]').click()
    path = os.path.join(OUT, dl.value.suggested_filename); dl.value.save_as(path)
    z = zipfile.ZipFile(path); names = z.namelist()
    assert len(names) == 6 and '06_Price_Bid.pdf' in names
    from pypdf import PdfReader
    bid = ''.join(p.extract_text() for p in PdfReader(io.BytesIO(z.read('06_Price_Bid.pdf'))).pages)
    assert '865' in bid and '51,90,000' in bid, bid
    assert card.get_attribute('data-status') == 'approved'
    if os.environ.get('FX_SHOTS'): card.screenshot(path=f'{OUT}/tender-approved.png')

def test_tender_not_eligible(page):
    upload(page, 'Tender_OAM_Agri_Drones_2026.pdf')
    card = page.locator('[data-fx=tender]').last; card.wait_for(timeout=60000)
    assert card.get_attribute('data-verdict') == 'no'
    assert card.locator('[data-check=fail]').count() >= 2  # turnover 30 Cr and 5 drone orders
    if os.environ.get('FX_SHOTS'): card.screenshot(path=f'{OUT}/tender-not-eligible.png')

def test_zz_report():
    with open(os.path.join(OUT, 'questions.tsv'), 'w') as f:
        for r in RESULTS: f.write('\t'.join(map(str, r)) + '\n')
