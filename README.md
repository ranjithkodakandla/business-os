# Business Workspace: working-title demo

This is a clickable demo of an operating workspace for a small Indian manufacturing and job-work business. The company is **Aarohan Industries, Hyderabad**, a fictional MSME owned by Riya Reddy. The product has no final name yet; "Business Workspace" is only a working title.

> **Talk to your business. Agents do the legwork in the background. You approve what matters.**

All data lives in the browser (localStorage) and is fictional. **No message, payment, bank feed, GST filing, Tally sync or WhatsApp send is real.** Each of these is simulated and labelled as simulated in the UI. The demo date is fixed at **Wednesday 28 Oct 2026**.

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:5173
# or
npm run build && npm run preview   # http://127.0.0.1:4173
```

- **Reset demo** (bottom of the sidebar) restores the original data.
- **Start guided walkthrough** (Home) runs the 10-step SO-1051 story.

Stack: React 18, TypeScript (strict), Vite 5, Tailwind 3, Recharts 2, lucide-react, react-router (hash routes). There is no backend.

## The SO-1051 story (the spine of the demo)

- **The problem.** SO-1051 is for Sri Lakshmi Projects: 100 pump housing assemblies, due Fri 30 Oct. It needs 100 × Component A-17 (RM-A17). Only 35 are available, so the order is **65 short**.
- **Purchase request.** The Procurement agent prepares **PR-208** with three quotes (Deccan Castings, CastHub Rajkot, Prime Components). It recommends Prime Components: 2.5% dearer, but the only supplier that arrives on Friday.
- **Approval.** You review and approve the request, which raises PO-0921. Sending the PO is a separate, simulated approval.
- **Re-plan.** Operations re-plans the order as Lot 1 (35 units, Fri 30 Oct) and Lot 2 (65 units, Tue 3 Nov), with powder coating at a job worker.
- **Money.** Finance shows the margin impact (planned 26.7% vs 23.5%). It also shows that the customer is at about 98% of its credit limit, with **INV-1048** overdue.
- **The answer.** The chat answers "Can we deliver SO-1051 by Friday?" from all of these records, with links and next-step buttons.

## Modules

| Area | What is there |
|---|---|
| **Home** | A cash-first briefing (revenue, receivables, cash, attendance), Needs attention, Approvals, Money stuck, the agent activity feed (overnight and now), and chat that starts work |
| **Approvals** | One inbox for every agent-prepared item, showing which agent prepared it. You can edit, approve or decline each item |
| **Sales & CRM** | Pipeline board (lead to won), deal detail, activity timeline, WhatsApp follow-up drafts |
| **Orders** | Order list with views, and order detail: items with HSN and GST, a materials check (need / free / short), dispatch, credit |
| **Procurement** | PRs, quote comparison (landed cost, GST, arrival, terms, MSME status), review and approve, POs, simulated PO send |
| **Inventory** | On hand / reserved / available, batches, reservations, movements, low stock and slow stock, stock at job workers |
| **Operations** | Work orders, Kanban board, dispatch plan with Hyderabad transporters and LR numbers, the SO-1051 split plan |
| **Job Work** | Material out, inward job work (SAC 9988), job-worker capacity, ITC-04 tracking (1-year and 3-year limits, CSV export), challans |
| **People & HR** | Permanent vs contract staff, biometric attendance exceptions, leave, shifts, contract labour with ESI/PF |
| **Finance** | Receivables aging, payables (MSME 45-day column, 43B(h)), cash runway, bank feed (simulated), GST & compliance calendar, Tally XML export, invoice detail, payment recording |
| **Reports** | Sales vs collections, days to collect, inventory value, margin/OTD/attendance, plain-language insight, CSV download |
| **Supplier contacts** | Who to ask for each part, their preferred channel (WhatsApp, email or AI voice call), language, lead time, on-time %, last price and terms. Edit inline or in a form |
| **Sourcing results** | Stock check against the bill of materials, top 3 supplier options per short part, what we sent vs what they replied, negotiation tips, Call now panel, PO drafts to Approvals |
| **Collections sprint** | Target-by-Friday board: plan, simulated outreach, promise-to-pay entries, disputes and statement requests as follow-up tasks, Call now tips |
| **Agents** | 8 background agents. Each has an on/off switch, three autonomy levels (Suggest only / Prepare for approval / Auto within limits), guardrails, last and next run, a log and Run now |
| **Connected apps** | Tally, WhatsApp Business, GST/e-way bill via GSP, HDFC statement feed, biometric device, email, Excel/Sheets import. All are **simulated** |
| **Quick setup** | "Set up in 5 minutes": GSTIN lookup, import data, connect WhatsApp, invite the team, turn on agents |

## Indian MSME realism

- GSTIN 36AAMCA4821K1Z6 and Udyam number. HSN codes on items, SAC 9988 for job work.
- Each invoice is split into CGST and SGST within Telangana, or IGST for other states. E-invoicing is marked *not applicable* because turnover is under ₹5 Cr.
- E-way bill data on dispatches, with Hyderabad transporters and LR numbers.
- TDS under section 194C on contractor and job-work payments.
- GSTR-1 and GSTR-3B, TDS, and PF/ESI due-date reminders.
- MSMED Act 45-day payment rule, with a 43B(h) deductibility warning on PB-0551.
- Customer credit limits and credit days, with an exposure check on new orders.
- Payment modes UPI, NEFT, RTGS, cheque, post-dated cheque (PDC) and cash. PDCs are tracked.
- Tally XML export (a file download; nothing is synced).
- WhatsApp-first communication: every reminder or chase is a **draft you approve**. Nothing is auto-sent.
- Language toggle EN / हिं / తె. It covers navigation and the greeting only.
- Staff: permanent vs contract labour (via a manpower agency), ESI/PF challans, biometric attendance.
- ₹ amounts in lakh format (₹24.8 lakh, ₹1,81,867), Indian names, Hyderabad localities.
- Cash runway in days and a "money stuck" view: overdue receivables, slow stock, and material at job workers.

## Agents (background)

There are eight agents: Collections, Procurement, Sourcing, Job work, Dispatch planner, Compliance, Attendance and Books sync.

- **What they do.** Agents watch the records, prepare drafts and plans, and post to the Home feed and Approvals.
- **Hard guardrails.** Agents never move money, never file returns, and never send anything above the auto-limit (₹50,000 by default) without approval.
- **Handoff from chat.** Some chat answers offer a handoff button, such as "Ask Procurement to confirm Friday delivery". It starts a visible agent task that runs and then completes. The result lands in Approvals.

## Conversational + agentic use cases (v2)

**1. Source it for me.** Ask: "Kaveri Engineering needs 150 PHA-17 pump housings by 12 Nov – check stock and source what's short" (also a clickable example on Home).
- The answer is an instant stock check against the bill of materials: A-17 housings short 150, bearings 6204-2RS short 68 (buy 100); other parts covered.
- "Approve & send 6 enquiries" opens a confirm. After you approve, the Sourcing agent contacts 3 suppliers per short part on each contact's preferred channel and asks: do you have it, how many, by when, at what price. Progress shows sent → delivered → replied (or dialling → connected → summary for AI voice calls).
- `/sourcing` ranks the top 3 per part (landed price 35%, date 30%, terms 15%, reliability 20%), shows the exact message or call script we sent next to the captured reply, gives negotiation tips from your own purchase history, and has a Call now panel with talking points.
- Create PO draft → Approvals. Approving raises PO-0922 / PO-0923 as "Approved – not yet sent".
- `/suppliers` is the contact list the agent uses.

**2. Collections sprint.** Ask: "Get me ₹5 lakh in by Friday" (clickable on Home). Asking for ₹50 lakh gets an honest answer: customers owe only ₹8.4 lakh, so it is not possible; it shows what is realistic and the CC headroom.
- The plan ranks 6 customers by likelihood × amount, with the 43B(h) angle and channel per customer.
- After you approve, the Collections agent's calls, WhatsApp and email are simulated; replies become promise-to-pay entries.
- `/collections` shows received vs promised vs target, each customer's message and reply, Call now tips, and follow-ups: an early-payment discount, a dispute reply (short supply on INV-1050) and a statement request – each goes through Approvals.
- Home and Finance › Receivables show the amount promised by Friday and a Promise to pay column. Promises are not cash.

## What is simulated (everything external)

- **Messages.** WhatsApp, email and SMS sends are recorded locally as "sent (simulated)".
- **Supplier and customer outreach.** Enquiries, AI voice calls, replies, quotes and promises to pay are scripted. No call is placed and nothing is sent; the Call now panel does not dial.
- **Money.** Payments, the bank statement feed and UPI/NEFT are recorded only; **no payment or bank integration works**.
- **Compliance.** GST portal, GSP, e-way bill, GSTR filing, ITC-04 filing and the Tally sync are simulated. The Tally XML and CSV files are real downloads containing demo data.
- **Devices and setup.** The biometric device, the GSTIN lookup in setup and the WhatsApp QR code are mocked.
- **Agents.** Agent runs are scripted timers over the mock data.
- **Chat.** Chat answers come from a rule-based intent matcher over the store (`src/lib/converse.ts`). It is not a language model.

## Verification

- `verify/check_routes.py` visits 43 routes, checks that each has a heading and no console errors, and saves screenshots.
- `verify/check_flows.py` exercises:
  - chat and handoff, plus the full guide;
  - approvals, payments and downloads;
  - agent runs, setup, the language toggle and reset.

`verify/check_v2.py` runs both v2 use cases end to end (26 screenshots).

All scripts use Playwright (Python) against `npm run preview`.

## Video

The walkthrough video is recorded with Playwright `recordVideo` at 1440×900 and has captions only, no voice. To rebuild it:

1. Run `video/record.py`.
2. Generate the music with `video/music/make_music.py`.
3. Encode with `video/compose.sh`.

The output is `video/business-workspace-walkthrough.mp4`.

v2 (with both new use cases): `video/record_v2.py`, `make_music.py 380 bed_v2.wav`, then `video/compose_v2.sh` → `video/business-workspace-walkthrough-v2.mp4`.
