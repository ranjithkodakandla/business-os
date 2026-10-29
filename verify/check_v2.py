# v2 flow checks: sourcing + collections sprint. Run against vite preview on :4173.
import sys, time
from playwright.sync_api import sync_playwright
B = 'http://127.0.0.1:4173/#'
errs = []
def shot(p, n): p.screenshot(path=f'/workspace/business-workspace/verify/shots/v2_{n}.png')
with sync_playwright() as pw:
    br = pw.chromium.launch()
    p = br.new_page(viewport={'width': 1440, 'height': 900})
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    p.goto(B + '/'); p.wait_for_timeout(800)
    # --- sourcing
    p.fill('[data-testid=composer]', 'Kaveri Engineering needs 150 PHA-17 pump housings by 12 Nov – check stock and source what’s short')
    p.click('[data-testid=composer-send]'); p.wait_for_selector('[data-action=start-sourcing]', timeout=5000); p.wait_for_timeout(400)
    shot(p, '01_sourcing_answer')
    p.click('[data-action=start-sourcing]'); p.wait_for_timeout(300); shot(p, '02_sourcing_confirm')
    p.click('text=Approve & send 6 enquiries >> nth=-1'); p.wait_for_timeout(2500); shot(p, '03_outreach_mid')
    p.wait_for_selector('[data-outreach=sourcing][data-state=done]', timeout=10000); p.wait_for_timeout(300); shot(p, '04_outreach_done')
    p.click('[data-testid=open-sourcing]'); p.wait_for_timeout(600); shot(p, '05_results')
    p.click('[data-option=OPT-A1]'); p.wait_for_timeout(300)
    p.locator('[data-testid=sent-replied]').scroll_into_view_if_needed(); shot(p, '06_sent_replied')
    p.click('[data-testid=call-now]'); p.wait_for_timeout(400); shot(p, '07_call_dialling')
    p.wait_for_selector('[data-call-state=connected]', timeout=4000); p.wait_for_timeout(500); shot(p, '08_call_connected')
    p.click('[data-testid=end-call]'); p.wait_for_timeout(300)
    p.click('main [data-seg="CP-6204"]'); p.wait_for_timeout(300); shot(p, '09_bearings')
    p.click('[data-testid=create-po-draft]'); p.wait_for_timeout(400)
    p.goto(B + '/approvals'); p.wait_for_timeout(600); shot(p, '10_approvals_po')
    assert p.locator('text=PO drafts for Kaveri order').count() > 0, 'po draft approval missing'
    p.goto(B + '/suppliers'); p.wait_for_timeout(600); shot(p, '11_suppliers')
    p.click('[data-edit=CT-01]'); p.wait_for_timeout(300); shot(p, '12_edit_contact')
    p.click('[data-testid=contact-form] [data-seg=WhatsApp]'); p.click('[data-testid=save-contact]'); p.wait_for_timeout(300)
    assert 'WhatsApp' == p.locator('[data-channel=CT-01]').input_value(), 'channel not saved'
    p.select_option('[data-channel=CT-01]', 'Call'); p.wait_for_timeout(200)
    # --- sprint
    p.goto(B + '/'); p.wait_for_timeout(500)
    p.fill('[data-testid=composer]', 'Get me ₹50 lakh in by Friday'); p.click('[data-testid=composer-send]'); p.wait_for_timeout(1800)
    shot(p, '13_sprint_50L')
    assert p.locator("text=isn’t possible by Friday").count() > 0, 'no cap message'
    p.fill('[data-testid=composer]', 'Get me ₹5 lakh in by Friday'); p.click('[data-testid=composer-send]'); p.wait_for_timeout(1800)
    shot(p, '14_sprint_plan')
    p.locator('[data-action="start-sprint:500000"]').last.click(); p.wait_for_timeout(300); shot(p, '15_sprint_confirm')
    p.click('text=Approve plan & contact 6 customers >> nth=-1'); p.wait_for_timeout(3000); shot(p, '16_sprint_mid')
    p.wait_for_selector('[data-outreach=sprint][data-state=done]', timeout=10000); p.wait_for_timeout(300); shot(p, '17_sprint_done')
    p.click('[data-testid=open-sprint]'); p.wait_for_timeout(600); shot(p, '18_board')
    p.locator('[data-testid=sprint-detail]').scroll_into_view_if_needed(); shot(p, '19_board_detail')
    p.click('[data-testid=sprint-call]'); p.wait_for_selector('[data-call-state=connected]', timeout=4000); p.wait_for_timeout(300); shot(p, '20_sprint_call')
    p.click('[data-testid=end-call]'); p.wait_for_timeout(200)
    p.click('main tr[data-row=SP-3]'); p.wait_for_timeout(300); p.locator('[data-testid=sprint-detail]').scroll_into_view_if_needed(); shot(p, '21_dispute')
    p.click('[data-testid=sprint-followup]'); p.wait_for_timeout(400); shot(p, '22_dispute_draft')
    p.keyboard.press('Escape')
    p.goto(B + '/'); p.wait_for_timeout(600); shot(p, '23_home_after')
    assert p.locator('[data-testid=home-promised]').count() == 1, 'home promised missing'
    p.goto(B + '/finance'); p.wait_for_timeout(500); shot(p, '24_finance')
    p.goto(B + '/finance?tab=Receivables'); p.wait_for_timeout(500); shot(p, '25_receivables')
    assert p.locator('[data-promise=INV-1048]').count() == 1
    for r in ['/agents', '/procurement', '/procurement?tab=Purchase%20orders', '/sourcing', '/collections']:
        p.goto(B + r); p.wait_for_timeout(400)
    shot(p, '26_collections_final')
    # reload mid-state persistence
    p.reload(); p.wait_for_timeout(600)
    br.close()
print('ERRORS', errs)
sys.exit(1 if errs else 0)
