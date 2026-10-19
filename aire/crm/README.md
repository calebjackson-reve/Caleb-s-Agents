# AIRE CRM

The one database. A Google Sheet named **AIRE CRM** (Caleb's Hot-Warm-Cold list, renamed on 2026-10-19) with five tabs, and `crm.py`, the engine every other AIRE tool goes through. Nothing else keeps its own copy of a contact.

Sheet: https://docs.google.com/spreadsheets/d/11t6vex49xdA7RmskELDxt2O044vo1EJkPqL3yCgglHE/edit

| Tab | What it holds | Who writes it |
|---|---|---|
| Contacts | Caleb's columns A to L untouched (Name, Phone, Email, Category, Tier, Why this tier, Last touch, Next action, Notes, socials). The tool owns M to P: stage, last_touch_iso, source, id. | Caleb edits A to L. `crm.py` fills M to P. |
| Pipeline | One row per deal: client, side, address, stage, price, commission, expected close, next step, listing_id. | Caleb and the Mac companion (from KW Command). |
| Activity | Every touch and event: calls, texts, notes, showings, signings. | `crm.py log`, `crm.py ingest`, the command center. |
| Tasks | What to do, for whom, by when. | `crm.py task`, `import-hwc`, `ingest`, the command center. |
| Leads | Every website lead the moment it lands, matched to a contact. | `crm.py ingest` (Luxury Presence emails). |

Stages for a contact: `new-lead`, `seller-presentation`, `under-contract`, `past-client`, `closed`, `opt-out` (same as the follow-up tool). Pipeline stages: `lead, consult, active, showing, under_contract, closed, lost`.

Cadence (days between touches): HOT 7, WARM 14, COLD 90, CONTACT 365. Vendors, agents and "other" are never on the touch list.

## First run on the Mac
```
cd ~/Caleb-s-Agents/aire/crm
pip3 install google-api-python-client google-auth-oauthlib
mkdir -p ~/.aire && cp /path/to/credentials.json ~/.aire/credentials.json   # the same OAuth client the speed-to-lead runner uses
python3 crm.py auth              # browser opens once, grants Sheets + Gmail read
python3 crm.py --test            # 35 offline checks
python3 crm.py import-hwc        # fills stage/last_touch/id for all 458 contacts, one task per HOT/WARM "Next action"
python3 crm.py ingest --hours 72 # website leads, showings, signings from Gmail into Leads/Activity/Tasks
python3 crm.py pull              # cache.json for the command center
python3 crm.py brief             # the text block the morning brief uses
```
Simulated on the real contact list on 2026-10-19 (offline, nothing written to the sheet): 458 contacts, 456 last-touch dates parsed, 54 tasks created from "Next action", 118 touches due (3 hot, 35 warm, 80 cold).

## Every day
- Morning run (cloud, 6:40 am): reads the sheet through the Google connector, writes the brief.
- Mac, after the brief: `crm.py ingest && crm.py pull`, then the command center shows deals, touches due and tasks. "Log a touch" and "Done" on the page write to the sheet through `crm.py`.
- Follow-up tool: `crm.py export-followup` writes `aire/follow-up/contacts.csv` from the sheet. Nobody edits that CSV by hand any more.
- Mac companion: anything that changed in KW Command goes in with `crm.py log "Name" "what changed"` or a Pipeline row.

## Rules
- Read only on Gmail. The tool never sends, labels or deletes mail.
- Columns A to L on Contacts are Caleb's. The tool never rewrites them.
- `cache.json` and `contacts.csv` are client data and stay out of git.
- No second database. If something needs a table, it is a tab here.
