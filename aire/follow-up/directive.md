# Directive: daily follow-up cadence

## Objective
Every morning, draft one soft check-in for each contact who has gone quiet for exactly 1, 2, 3, 7, 14, 21, 28, 56 or 84 days, in Caleb's voice, from a fixed template pool, so no lead, seller or client is forgotten. Caleb approves the queue, then it sends.

## Inputs
- `contacts.csv`: a KW Command export (or any sheet) with columns: name, email, phone, stage, last_touch (YYYY-MM-DD), address (optional), notes (optional). Stage is one of new-lead, seller-presentation, under-contract, past-client, closed, opt-out.
- `templates.md`: the pools, subjects, opt-out and hand-to-Caleb phrases.
- `sent-log.json`: which template went to which contact and when.
- Gmail (read scope) for reply and opt-out checks when a token exists. Without it, the tool uses sent-log.json only and says so.

## Process
1. Load contacts. Skip stage closed or opt-out, and the test addresses.
2. For each contact compute days since last_touch. Continue only if days is in the threshold list for that pool.
3. If Gmail is connected: search the thread with that email. Skip if they replied after last_touch. If any reply contains an opt-out phrase, mark the contact opt-out, write the quote to `flags.md`, no send. If any reply contains a hand-to-Caleb phrase, write it to `flags.md` as a task, no send.
4. Pick the next template in that pool that has not gone to this contact. Never repeat the last one. If the pool is exhausted, hand to Caleb.
5. Fill {{firstName}} and {{address}}. Pick the subject in rotation. Append the sign-off.
6. Write everything to `queue-YYYY-MM-DD.md` for Caleb to read. Nothing sends in this step.
7. On `--approve`: send each queued email from aire@calebjackson.org, record template id and time in sent-log.json, append to log.csv. Skip any line Caleb deleted from the queue file.
8. Report counts: queued, sent, skipped, flagged. Errors to errors.log, keep going.

## Definition of done
A dated queue file exists with every due contact, each with a template not yet used on them, no contact appears twice, and after approval log.csv has one row per send.

## Safety
- DRY_RUN=true by default. Sending requires `--approve` and DRY_RUN=false.
- Never send free text. Only pool templates.
- Never send to opt-out, closed, or test addresses.
- Never send between 8 pm and 8 am Central.
- Replies with price, offer, inspection, cancel or upset language go to Caleb, never auto-answered.
