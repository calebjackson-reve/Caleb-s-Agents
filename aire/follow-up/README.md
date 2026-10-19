# Daily follow-up cadence

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
