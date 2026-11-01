"""Generates the fictional sample uploads for the factory demo (licences + tenders) into public/samples/.
Run: python scripts/factory_samples.py   (needs reportlab + pillow). All names, numbers and authorities are fictional."""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'samples'); os.makedirs(OUT, exist_ok=True)

def doc(name, title, sub, lines, foot='This is a fictional sample document for a product demo.'):
    c = canvas.Canvas(os.path.join(OUT, name), pagesize=A4); w, h = A4; y = h - 25 * mm
    c.setFont('Helvetica-Bold', 15); c.drawCentredString(w / 2, y, title); y -= 7 * mm
    c.setFont('Helvetica', 10); c.drawCentredString(w / 2, y, sub); y -= 6 * mm
    c.line(20 * mm, y, w - 20 * mm, y); y -= 10 * mm
    for ln in lines:
        if ln == '':
            y -= 4 * mm; continue
        if ln.startswith('#'):
            c.setFont('Helvetica-Bold', 11); c.drawString(20 * mm, y, ln[1:].strip()); y -= 6.5 * mm; continue
        c.setFont('Helvetica', 10)
        for part in [ln[i:i + 100] for i in range(0, len(ln), 100)]:
            c.drawString(22 * mm, y, part); y -= 5.5 * mm
        if y < 30 * mm: c.showPage(); y = h - 25 * mm
    c.setFont('Helvetica-Oblique', 8); c.drawString(20 * mm, 15 * mm, foot); c.save()

doc('Licence_FireNOC_Site1_Cherlapally.pdf', 'TELANGANA STATE DISASTER RESPONSE & FIRE SERVICES', 'Fire No Objection Certificate (Renewal) - Industrial Occupancy', [
    'NOC No.: TSFS/HYD/NOC/2026/0457', 'Date of issue: 15-01-2026', 'Valid up to: 14-01-2027', '',
    'Issued to: Shakti Electro-Pack Pvt Ltd (fictional)', 'Premises: Plot 14, IDA Cherlapally, Hyderabad - 500051 (Site 1)',
    'Occupancy: Industrial - RF module and PCB assembly, G+1, built-up area 2,860 sq m', '',
    '#Conditions', '1. Fire extinguishers to be refilled annually and records kept.', '2. Hydrant and sprinkler system to be tested every 6 months.',
    '3. Renewal application to be filed at least 30 days before expiry.', '',
    'Issuing authority: District Fire Officer, Medchal-Malkajgiri, Telangana Fire Services'])

doc('Licence_PollutionCTO_Site1_Cherlapally.pdf', 'TELANGANA STATE POLLUTION CONTROL BOARD', 'Consent for Operation (CFO) under the Water Act 1974 and the Air Act 1981', [
    'Consent Order No.: TSPCB/RCP/CHP/CFO/2024/3381', 'Date of issue: 01-01-2024', 'Valid till: 31-12-2026', '',
    'Name of industry: Shakti Electro-Pack Pvt Ltd (fictional), Unit: Site 1 Cherlapally',
    'Address: Plot 14, IDA Cherlapally, Hyderabad - 500051', 'Category: Orange - electronic assembly with wave soldering', '',
    '#Conditions', '1. Stack monitoring report to be submitted every quarter.', '2. Hazardous waste (solder dross, flux waste) returns in Form 4 by 30 June.',
    '3. Apply for renewal 120 days before expiry through the online portal.', '',
    'Issued by: Environmental Engineer, Regional Office Ranga Reddy, TS Pollution Control Board'])

doc('Tender_BTNL_RF_Modules_2026.pdf', 'BHARAT TELECOM NETWORKS LIMITED (fictional)', 'Notice Inviting Tender - Open e-tender', [
    'Tender No.: BTNL/PROC/RF/2026/118', 'Item: Supply of 868 MHz RF transceiver modules for smart meters', 'Quantity: 6,000 units',
    'Delivery: 50% within 60 days of PO, balance within 90 days', 'Bid due date: 25-11-2026, 15:00 hrs', '',
    '#Eligibility criteria', '1. Average annual turnover of the last 3 financial years: minimum Rs 15 Crore.',
    '2. ISO 9001:2015 certification is mandatory.', '3. Bidder must have supplied similar RF / communication modules: minimum 3 orders in the last 3 years.',
    '4. Valid factory licence of the manufacturing unit.', '5. IPC-A-610 trained workforce for soldering.', '6. Bidder must be the manufacturer (no traders).', '',
    '#Earnest Money Deposit', 'EMD: Rs 3,50,000. Micro and Small Enterprises registered on Udyam are exempt from EMD.', '',
    '#Technical requirements', 'Frequency 865-868 MHz, output power +20 dBm, sensitivity -110 dBm, IP54 enclosure, 2 year warranty.',
    '#Documents to submit', 'Cover letter, company profile, turnover certificate (CA), ISO certificates, factory licence, technical compliance sheet, price bid.'])

doc('Tender_OAM_Agri_Drones_2026.pdf', 'ODISHA AGRI MECHANISATION MISSION (fictional)', 'Tender for supply of agricultural spraying drones', [
    'Tender No.: OAM/DRN/2026-27/07', 'Item: Supply of 10 litre agricultural spraying drones with 2 batteries each', 'Quantity: 40 drones',
    'Delivery: within 45 days of PO, with pilot training', 'Bid due date: 30-11-2026', '',
    '#Eligibility criteria', '1. Average annual turnover of the last 3 financial years: minimum Rs 30 Crore.',
    '2. DGCA type certificate for the offered drone model is mandatory.', '3. ISO 9001:2015 and ISO 14001:2015 certification.',
    '4. Minimum 5 similar drone supply orders in the last 3 years.', '5. Service centre in Odisha or an undertaking to set one up within 30 days.', '',
    '#Earnest Money Deposit', 'EMD: Rs 6,00,000 (no exemption for MSEs in this tender).', '',
    '#Documents to submit', 'Cover letter, company profile, turnover certificate, DGCA certificate, ISO certificates, technical compliance sheet, price bid.'])

open(os.path.join(OUT, 'Tender_BTNL_RF_Modules_2026.txt'), 'w').write('''Tender No: BTNL/PROC/RF/2026/118 - Bharat Telecom Networks Ltd (fictional)
Supply of 868 MHz RF transceiver modules for smart meters, 6,000 units. Bid due 25-11-2026.
Eligibility: average annual turnover last 3 years min Rs 15 Crore; ISO 9001:2015 mandatory; minimum 3 similar RF module orders in last 3 years; valid factory licence; IPC-A-610 trained workforce; manufacturer only.
EMD Rs 3,50,000 - MSEs registered on Udyam exempt.
''')

# image licence (for OCR)
from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGB', (1240, 900), 'white'); d = ImageDraw.Draw(img)
try:
    F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 30); B = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 36)
except Exception:
    F = B = ImageFont.load_default()
d.text((140, 60), 'MEDAK MUNICIPALITY - TRADE LICENCE', font=B, fill='black'); d.line((60, 120, 1180, 120), fill='black', width=3)
for i, t in enumerate(['Licence No.: MDK/TL/2026/0784', 'Date of issue: 01-04-2026', 'Valid up to: 31-03-2027', 'Trade: Manufacture of corrugated boxes',
                       'Name: Shakti Electro-Pack Pvt Ltd (fictional)', 'Premises: Site 3, Survey No. 212, Medak', 'Issued by: Commissioner, Medak Municipality', '(fictional sample for a demo)']):
    d.text((80, 170 + i * 75), t, font=F, fill='black')
img.save(os.path.join(OUT, 'Licence_TradeLicence_Site3_Medak.png'))
print('ok', sorted(os.listdir(OUT)))
