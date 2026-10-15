---
name: mk-crm-followup-cadence
description: Automates soft, human-sounding follow-up emails (and SMS) from a CRM on a fixed days-outstanding cadence using a pre-written template pool, checks the real email history so the same nudge never repeats, detects opt-outs and flags the record, and runs daily as a skill, loop, or cloud routine. Use when Caleb says "follow up with leads who went quiet", "chase unsigned listing agreements", "remind buyers about pre-approval", "nudge sellers for documents", "daily follow-up routine from my CRM", or wants AIRE to nurture without sounding like a robot.
---

# CRM follow-up cadence with a template pool

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapter 14, plus SMS note in chapter 15 (https://www.youtube.com/watch?v=yulWjh3rq28&t=18595s and &t=20018s)

## What Nick teaches

Follow-up is the bottom-of-funnel lever. Most people don't chase invoices, proposals, or "are you still coming to the meeting" anywhere near enough. Solid follow-ups can add **20 to 30% revenue**. Stacked with speed to lead (10 leads -> 3 calls becoming 6, and 2 clients becoming 3) that's a 1.5 x 2 = 3x compound.

Unlike speed to lead (event-driven), this is **schedule-driven**: once a day, query the CRM, read the conversation history, check trigger conditions, pick a draft from a **template library you wrote**, send. Using a template pool instead of free-form AI keeps tone of voice and avoids catastrophic screw-ups.

Trigger ideas Nick lists: gone quiet 7 days after proposal -> brief nudge. Ghosted a question -> different nudge. "follow up next month" and it is next month -> follow up. Warm signal (opened last email several times) -> nudge.

### The build (ClickUp CRM, Gmail)
1. His demo CRM in ClickUp: company, deal amount, contact, invoice sent date, days outstanding, due date, paid date, services. Separated into stages (in progress, invoice upcoming, sent, waiting).
2. Connect the **ClickUp built-in connector** (one click, OAuth). "Start at the end": query the list "Invoice collection CRM" for days outstanding = 7, then get their emails (all routed to Nick's own address for the demo).
3. Try a send: the **Gmail connector had no send tool** (only drafts). Fell back to **Gmail API with his own OAuth client**: Claude wrote the auth script, he logged in via a Google Cloud Console link, test email to himself worked. Later added a **read scope** for history checks.
4. **Template pool**: "Write 10 simple one-line check-in messages. Very light language, super soft nudges. Subjects straightforward: `{{firstName}}`, `invoice`, `how are things going`, `quick check-in`, `following up`, `anything you need`. No em dashes. Don't mention the invoice number. Sign off `Thanks, Nick`."
5. **Cadence rule**: once per day query ClickUp. For anyone at **1, 2, 3, 7, 14, 21, 28, 56, 84 days outstanding**, send a template filled with their real name. Never send the same template twice in a row. Before sending, **search the real Gmail history** with that contact to see which templates already went.
6. **Opt-out rule**: if the prospect explicitly says stop ("please stop emailing me, we're disputing through our lawyer"), flag the ClickUp task (notes + chase stage = closed, comment for audit trail) and don't send.
7. Test narration: Claude matched the 7-day records (3), searched Gmail, picked template 3 because 1 and 2 had been used, ran the opt-out path on a planted reply, updated ClickUp. Nick had to insist "run this for real using the CRM info" because Claude tried to economize.
8. **Skill**: "convert everything, including all fixes, into a skill I run every morning. Thresholds 1, 2, 3, 7, 14, 28, 56, 84. Template matching. Opt-out check. Write it as a simple bulleted SOP so a future Claude without this conversation executes reliably." Claude noted the ClickUp connector only works inside a Claude session, which is fine for a skill.
9. **Loop** at 5:59 a.m., then **routine**: add ClickUp as a cloud connector. The local Gmail script moves into the routine's repo/environment. Named "daily invoice/proposal chase."
10. **SMS extension** (ch. 15): add the Quo connector and say "in addition to the email, draft and send a message to their phone number using Quo. Phone numbers come from the record." Test before scaling.

Ideas to extend: value-adding nudges (case studies, insights, pre/post meeting), customer stories, gentle price-objection check-ins.

## Step by step

1. Define the record set and fields in the CRM (stage, last contact date, days outstanding/since last touch, email, phone, opt-out flag).
2. Connect the CRM (connector or API) and verify a filtered read ("everyone at 7 days").
3. Verify you can actually send email (connector tool or Gmail API OAuth with send + read scopes).
4. Write 10 soft one-line templates and 6 plain subjects in your voice. No em dashes.
5. Define thresholds and the no-repeat rule (check real history), the opt-out rule, and quiet conditions (already replied, deal closed).
6. Run once narrated end to end on real records pointed at your own inbox. Fix. Run for real on a small set.
7. Consolidate into an SOP skill. Loop. Routine with CRM + email + SMS connectors. Add error logging.

## Templates / prompts

Cadence SOP (skill body):
```
Daily at 5:59 a.m. Central:
1. Query {{CRM list}} for records where stage in {{stages}} and days since last touch in
   [1, 2, 3, 7, 14, 21, 28, 56, 84].
2. For each: search Gmail history with the contact email. Skip if they replied since last touch,
   if the deal is closed, or if an opt-out phrase exists ("stop emailing", "remove me", "lawyer",
   "not interested"). On opt-out: set {{flag field}} = closed, add a note with the quote, no send.
3. Pick the next unused template from the pool (never the same as the last one sent to them).
4. Fill {{firstName}} and send with a plain subject from the subject pool. Log template id, time,
   and record id to the CRM note.
5. If SMS enabled: send the matching SMS template via {{Quo/Twilio}} to the record's phone.
6. Report: count sent, skipped, flagged. Post errors to Slack #aire-errors.
```

Template pool starter (Caleb voice):
```
1. Hey {{firstName}}, how are things going on your end? Anything I can help with?
2. Hi {{firstName}}, quick check-in. Let me know if any questions came up.
3. {{firstName}}, just following up. Happy to hop on a quick call if easier.
4. Hey {{firstName}}, anything you need from me to keep things moving?
5. Hi {{firstName}}, checking in. No rush, just here when you're ready.
6. {{firstName}}, wanted to make sure this didn't slip. Anything unclear?
7. Hey {{firstName}}, still here if you want to talk through next steps.
8. Hi {{firstName}}, how's the week going? Let me know if I can help.
9. {{firstName}}, quick nudge. Happy to answer anything.
10. Hey {{firstName}}, touching base. Let me know where your head's at.
Subjects: {{firstName}} | quick check-in | following up | how are things going | anything you need | checking in
Sign-off: Thanks, Caleb
```

## Pitfalls Nick calls out

- Gmail connector may not send. Verify tools, don't assume.
- Need read scope to check history or you will repeat yourself.
- Claude will simulate instead of running for real. Say "run for real."
- After 84 days of no reply you have bigger problems. Cap the cadence.
- Free-form AI follow-ups drift from your voice. Use the pool.
- Test SMS additions before scaling. Bugs appear.

## How Caleb should use this

- Cadences for KW First Choice: new internet lead not yet reached (1, 2, 3, 7, 14, 28 days), buyer waiting on pre-approval, seller who took the listing presentation but hasn't signed, under-contract clients needing documents (inspection, insurance, closing checklist), past clients (quarterly check-in, home anniversary). Each gets its own pool so the tone fits.
- Record in the CRM which pool/template went out, so a human can read the thread and nothing repeats.
- Classification: AUTOMATE + HUMAN QA for leads and active clients at first. Past-client check-ins can go fully automated after a review period. Enabling live sends, and especially SMS, **needs Caleb's approval before running** (TCPA consent, DNC, quiet hours 9 p.m. to 8 a.m.).
- Put a hard rule in the SOP: if a reply contains an objection, bad news, or a question about price/strategy, do not auto-reply. Create a task for Caleb (`mk-automate-or-keep-human`).

## Verification

- A narrated test run lists exactly the records at each threshold, the template chosen, and why.
- Re-running the same day produces zero sends (dedupe).
- A planted "stop emailing me" reply flags the record and prevents sends.
- Emails arrive at Caleb's inbox with the right name, subject from the pool, no em dashes.
