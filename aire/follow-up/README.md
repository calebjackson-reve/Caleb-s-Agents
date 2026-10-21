# Daily follow-up cadence

**Pipeline is the one sender (Caleb, 2026-10-20).** This folder is the drafting library behind it, not a second outreach system. `pools.py` is what Pipeline's predraft step imports: `audience(row)` says which pool a person is in, `next_line(pool, used, row)` hands back the next unused line filled with their first name. `followups.py --queue` still writes the review files and `out/email-queue.json` plus `out/text-queue.json` for Pipeline to show. `--approve` is a dry run unless `FOLLOWUP_SENDER=followups` is set on purpose. Pipeline keeps the send log, the Do Not Contact check on every send and the daily cap, so nobody gets two messages from two places.

**Since 2026-10-20 the queue comes from the CRM.** `python3 followups.py --queue` reads `aire/crm/feed.json` (written by `crm.py feed`, see `aire/crm/FEED.md`) and sorts every person who is due into a pool by who they are to Caleb:

| Pool | Who | Decided by |
|---|---|---|
| sphere | friends, family, households, anyone with no live intent | the default |
| past-client | closed with Caleb before | Stage "past client" or opportunity past_client_review |
| active-buyer | looking now, pre-approved | opportunity active_buyer, or buyer words in Next_Action |
| seller-candidate | equity, a move coming, said "sell" | opportunity equity_review_candidate or mover, seller words in Next_Action |
| partner | agents, lenders, vendors, title | Type, from the feed's partners section (own 60 day cadence, never on the client list) |
| recruit | agents Caleb wants on the team | Type recruit |
| new-lead, under-contract, seller-presentation | the deal stages | Stage |

Email drafts go to `queue-<date>.md`. Phone-only people get a text draft in `texts-<date>.md` and `out/text-queue.json`, which the Pipeline app shows in its compose box (Caleb taps send or skip, nothing sends itself). Anyone who texted Caleb last gets no template: they sit at the top as REPLY FIRST with their last three messages. After `--approve` sends an email, the tool calls `crm.py touch` with the person_id so Last_Touch moves and they drop off tomorrow's list. Edit any draft in the queue file before approving; the file is what gets sent.

The CSV mode below still works with `--contacts FILE` and is only for a machine without the feed.


Caleb's second automation tool, from Nick Saraev's `mk-crm-followup-cadence` skill. Once a morning it finds every contact who went quiet 1, 2, 3, 7, 14, 21, 28, 56 or 84 days ago (90, 180, 365 for past clients), picks the next unused soft check-in from the pool for their stage, and writes a queue file. Caleb reads it, deletes anything he does not want, and approves. Then it sends from aire@calebjackson.org.

## Why a CSV and not a live CRM link

KW Command has no public API and exports contacts from its own screen, up to 50 at a time ([KW documentation, bulk export](https://documentation.kw.com/html/kellercloud/command/contacts/managing-contacts/bulk-actions-contacts/export-bulk.html), read 2026-10-16). So the tool reads a `contacts.csv`. Since 2026-10-19 that file comes from the CRM: `python3 ../crm/crm.py export-followup` writes it from the AIRE CRM sheet (see `aire/crm/README.md`). The columns:

```
name,email,phone,stage,last_touch,address,notes
```

Stage is one of `new-lead`, `seller-presentation`, `under-contract`, `past-client`, `closed`, `opt-out`. `last_touch` is YYYY-MM-DD. A Command export will need its columns renamed once, and Claude on the Mac can do that mapping.

## Run it

```
cd ~/Caleb-s-Agents/aire/follow-up
python3 followups.py --test                      # proves pools, thresholds, no-repeat, round trip
python3 followups.py --queue                     # writes queue-<today>.md, sends nothing
open queue-2026-10-16.md                         # read, delete what you don't want
python3 followups.py --approve queue-2026-10-16.md            # dry run of the send
DRY_RUN=false python3 followups.py --approve queue-2026-10-16.md   # live
```

Gmail history checks (did they reply, did they say stop) turn on automatically when the speed-to-lead responder's `token.json` exists. Without it the tool uses its own sent log and says so at the top of the queue file.

## Rules it will not break

- Only pool templates, never free text. Four pools in `templates.md`, in Caleb's voice.
- Never the same template twice to the same person. Pool exhausted means hand to Caleb.
- Opt-out phrases flag the contact and stop. Price, offer, inspection, cancel or upset language goes to `flags.md` for Caleb, never auto-answered.
- Closed, opt-out and test addresses are never contacted.
- No sends between 8 pm and 8 am Central.
- Every message signs Caleb Jackson, REALTOR, Keller Williams First Choice.
