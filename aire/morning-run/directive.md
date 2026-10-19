# Directive: the morning run

## Objective
Every morning before Caleb's 7:30 sales block, one brief lands in his calendar that answers: what came in overnight, what moved in the pipeline, which contract deadlines are live, and where he has to be today, with travel already blocked. He opens the calendar, not six apps.

## Two runners, one brief
- **Cloud (this session, 6:40 am Central daily).** Gmail, Google Calendar, the AIRE CRM sheet (Contacts, Pipeline, Tasks, Leads tabs), the AIRE repo. Produces the brief and the calendar event.
- **Mac companion (Caleb's Mac, on demand or scheduled after 6:50 am).** KW Command and ROAM MLS have no API. The Mac's Claude session opens them in Chrome, reads what the cloud cannot, and appends to the same brief. See `mac-companion.md`.

## Cloud process
1. **Overnight inbox (last 26 hours), read only.**
   - Luxury Presence "New Lead" and "Property Value Request" emails: name, type, phone, when.
   - ShowingTime: requested, confirmed, rescheduled, cancelled showings, by property and time.
   - Authentisign: signing invitations (who still owes a signature), signing complete (which document, which deal), inactivity notices (deadline risk).
   - KW First Choice office emails with a date or deadline (open house posting cutoff, CE, phone duty).
   - Anything with inspection, appraisal, closing, walk through, listing appointment in the subject or body.
2. **AIRE CRM sheet** (id 11t6vex49xdA7RmskELDxt2O044vo1EJkPqL3yCgglHE, see `aire/crm/README.md`).
   - Pipeline tab: every live row (stage not closed or lost): client, stage, expected_close, next_step. Flag close within 14 days.
   - Tasks tab: open tasks, overdue first.
   - Contacts tab: touches due by tier cadence (HOT 7 days, WARM 14, COLD 90, CONTACT 365) from last_touch_iso, or from "Last touch" if column N is empty. List HOT and WARM by name with their "Next action". Count the rest.
   - Leads tab: rows with status new.
   If a tab is empty, say so in one line.
3. **Contract terms.** From Authentisign subjects and the pipeline sheet, list each live contract with: document, parties still to sign, next dated deadline Caleb knows about. Never infer a deadline the emails do not state. Unknown dates read "date not in email, check Command."
4. **Calendar.**
   - Read today's events on aire@calebjackson.org.
   - Create or update one event "AIRE Morning Brief" at 6:45 to 7:00 am with the full brief in the description. One per day, update in place if it exists.
   - For every item that requires Caleb's presence and has an explicit date and time in an email (inspection, appraisal meeting, closing, listing appointment, a showing Caleb is the showing agent for), create a calendar event if none exists within 30 minutes of that time, with a 30 minute "Drive to ..." event before it. Mark conflicts in the brief. Showings of Caleb's own listings by other agents are listed, not scheduled.
5. **Write the brief** to `aire/morning-run/briefs/YYYY-MM-DD.md`, commit and push to main. Same text as the calendar description.
6. **Report** in one line in `aire/STATUS.md` under "Morning run log": date, counts, and anything that failed.

## Brief layout
```
AIRE Morning Brief, Tue Oct 20
NEW LEADS (n): name, type, phone, came in 9:52 pm, drafts waiting in Gmail
PIPELINE (n live): client, stage, close date, next step. Flag: close within 14 days.
TOUCHES DUE (n): hot and warm by name with next action, cold/contact as a count
TASKS (n open, n overdue): due, who, what
CONTRACTS: document, who still owes a signature, deadline or "check Command"
TODAY: time, what, where, travel blocked / conflict
SHOWINGS ON MY LISTINGS: property, time, status
OFFICE: deadline items
MAC COMPANION: run "morning companion" on the Mac for MLS new listings and Command updates (or the companion's appended text)
```

## Definition of done
The calendar event exists for today with the brief, any Caleb-attended appointment from email is on the calendar with travel, the brief file is pushed, and the status log has the line.

## Safety
- Read only on Gmail. Never send, reply, label or mark read.
- Calendar writes are limited to: the brief event, appointment events with explicit times from emails, and travel blocks. Never delete or move an event Caleb made. Never invite anyone.
- Nothing about any client goes anywhere but Caleb's own calendar and the private repo.
