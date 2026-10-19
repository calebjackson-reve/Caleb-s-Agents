# AIRE CRM engine

There is one CRM: the Google Sheet **AIRE CRM**, id `1w9izcliqmXlFR3_O3dnP2G5SGfCrua7mrCLCE7cdoDc`, 3,626 contacts, created October 16, 2026. The Mac's `~/aire/crm/execution` scripts and Caleb's native Pipeline app already read and write it. This folder is the engine that points Gmail ingest, tier touch cadence, tasks from Next_Action and deals at that same sheet, and hands the result to the Pipeline app as a plain data file. There is no web UI here and there will not be one (Caleb, 2026-10-19).

Sheet: https://docs.google.com/spreadsheets/d/1w9izcliqmXlFR3_O3dnP2G5SGfCrua7mrCLCE7cdoDc/edit

## What is in the sheet

Read from the live sheet on 2026-10-19, not assumed. `python3 crm.py check` compares the live header to this list every run and stops if anything is missing.

| Tab | Status | Columns |
|---|---|---|
| Contacts | existed | person_id, display, first, last, name_tier, primary_phone, email, email_tier, street, city, state, zip, addr_tier, homestead, fair_market_value, band, opportunity_types, provenance, Stage, Do_Not_Contact, Source, Last_Touch, Next_Action, Command_ID, Type |
| Notes | existed | At, person_id, display, Note, By |
| Connector Log | existed | At (CT), Tool, Client, person_id, Detail |
| Tasks | **added by this tool** (only when missing) | task_id, person_id, display, task, due, status, source, created_at, done_at |
| Deals | **added by this tool** (only when missing) | deal_id, person_id, display, address, side, stage, price, expected_close, next_step, last_event, last_event_at, source, updated_at |

No column is added to Contacts. Every column keeps its meaning. The only Contacts columns this tool writes are `Stage`, `Last_Touch`, `Next_Action` and `band`, plus `Do_Not_Contact` one way (to YES). The enrichment block (name_tier through provenance) and `Command_ID` are never written.

Values the sheet actually uses (counted 2026-10-19): band is HOT 117, WARM 46, NURTURE 524, DORMANT 955, blank 1,984. Stage is blank 2,928, nurture 641, past client 57. Type is unknown, client, household, recruit, vendor, agent, lender. Last_Touch is filled on 4 rows and Next_Action on 1. That is why the first feed says "never logged" for nearly everyone, and why the Hot-Warm-Cold merge matters.

## Write gates

The same rules the Mac's `crm_client` enforces, reused here, never loosened. They are tested offline (`python3 crm.py --test`, 59 checks).

- Every contact write is by `person_id`, and the id must already exist. A new person gets a minted id one past the highest id ever seen in Contacts, Notes or the Connector Log, so a deleted row's id is never reused.
- `Do_Not_Contact` can be set to YES. There is no code path that sets it back to NO. A touch on a Do_Not_Contact person is refused.
- `Command_ID` is never written. KW Command is read by the Mac companion only.
- Every write lands in `audit.jsonl` (default `~/aire/crm/audit.jsonl`, override with `AIRE_CRM_AUDIT`) and as a row in the Connector Log tab, with Tool, Client `crm.py`, person_id and detail.
- `--dry-run` on any command lists every planned write and performs none, including tab creation and the audit file.
- Gmail is read only. The tool never sends, labels or deletes mail.

## Cadence

By the sheet's own `band` column. Blank band is not on the touch list. Type vendor, agent and lender are never on it. Do_Not_Contact YES is never on it.

| band | Days between touches |
|---|---|
| HOT | 7 |
| WARM | 14 |
| NURTURE | 90 |
| DORMANT | 365 |

NURTURE 90 and DORMANT 365 are an inference from the band names, not something Caleb has confirmed. Change `CADENCE_DAYS` in `crm.py` if he wants different numbers.

## Commands

```
cd ~/Caleb-s-Agents/aire/crm
pip3 install google-api-python-client google-auth-oauthlib
mkdir -p ~/.aire && cp /path/to/credentials.json ~/.aire/credentials.json   # same OAuth client as speed-to-lead
python3 crm.py auth                 # browser opens once: Sheets, Gmail read only
python3 crm.py --test               # offline checks
python3 crm.py check                # live header vs expected, tabs present, tabs it would add. Reads only.
python3 crm.py --dry-run ingest --hours 72   # what Gmail ingest would write. Nothing written.
python3 crm.py ingest --hours 72    # website leads, showings, signatures into the sheet
python3 crm.py sync-tasks           # one Tasks row per HOT/WARM Next_Action, idempotent
python3 crm.py feed                 # writes feed.json for the Pipeline app (see FEED.md)
python3 crm.py due                  # who is past their band's cadence
python3 crm.py tasks                # open tasks, overdue first, plus Next_Action items not yet synced
python3 crm.py deals                # live deals
python3 crm.py touch 247 "called Paul, counter is with Novak"
python3 crm.py task 247 "send BBA to Command" --due 2026-10-21
python3 crm.py done a1b2c3d4
```

`--local FILE` runs any command against a JSON snapshot instead of Google. That is how the cloud session ran the dry runs in `reports/` without a token. `--as-of YYYY-MM-DD` fixes the date for reproducible output.

### What `ingest` does

Only mail from luxurypresence.com, showingtime.com and authentisign.com, only newer than `--hours`.

- **Luxury Presence "New Lead - Name"**: matched to a contact by email, then 10-digit phone, then exact display name. A match gets a Notes row ("Website lead 2026-10-18: Google Sign On email") and a Next_Action if theirs is blank. No match creates a contact: band HOT, Stage `new lead`, Source `Luxury Presence YYYY-MM-DD`, Next_Action "Call within the hour", Type client, Do_Not_Contact NO.
- **ShowingTime "SHOWING CONFIRMED | address ..."**: a Deals row keyed by the address (stage active, side listing) with the last event, and a Notes row when the deal has a person_id.
- **Authentisign "Your signature is requested / Notice of inactivity / Signing complete"**: a Deals row keyed by the address in the document name (or the document name when it has none, stage unknown), the last event, and a Tasks row "Sign <doc>" when Caleb is the one who owes the signature. "Signing complete" closes that task.

Idempotent: the Connector Log is the memory of what was already ingested, so a re-run writes nothing new.

### What `feed` writes

`feed.json`: touches due, tasks (Tasks tab plus Next_Action items), live deals, new leads of the last 14 days, counts, and whether the live header passed. Spec in `FEED.md`. Codex wires the Pipeline app to read it. This tool never shows anything on a screen.

## Hot-Warm-Cold merge

The 458-row sheet "Hot-Warm-Cold Contacts 2026-10-19" (`11t6vex49xdA7RmskELDxt2O044vo1EJkPqL3yCgglHE`) is Caleb's hand-tiered list. It is merged into the real CRM only after a reviewed dry run.

```
python3 crm.py --dry-run --as-of 2026-10-19 merge-hwc --hwc hwc.json --report reports/YYYY-MM-DD-hwc-merge-dry-run.md
```

`hwc.json` is the sheet's Contacts tab as JSON (a list of row dicts, or `{"Contacts": [...]}`). The report classifies every row as matched, new or conflict and lists each planned cell. Nothing is written. The report from 2026-10-19 is `reports/2026-10-19-hwc-merge-dry-run.md`. After Caleb says yes, and only then, `merge-hwc --apply` performs the matched and new plans. Conflicts are never applied by code; Caleb settles them in the sheet.

Mapping decisions in the plan, all open for Caleb to change: HWC tier HOT and WARM fill a blank band; COLD and CONTACT fill no band. HWC Category friend, family, lead and client become Type client; agent and vendor keep their name; other becomes unknown. A phone or email in the CRM is never overwritten.

Note: PR 59 added empty Pipeline, Activity, Tasks and Leads tabs to the Hot-Warm-Cold sheet. They are not used by anything. Removing them is Caleb's call.

## Every day, on the Mac

1. `python3 crm.py ingest --hours 26 && python3 crm.py sync-tasks && python3 crm.py feed`
2. The Pipeline app reads `feed.json`. Caleb works from there.
3. A call, text or visit: `crm.py touch PERSON_ID "what happened"`. Finished a task: `crm.py done TASK_ID`. The Mac companion keeps using its own scripts for Command changes.

## Rules

- One CRM. If something needs a table, it is a tab in the AIRE CRM sheet, listed above.
- `feed.json`, `audit.jsonl` and any snapshot are client data and stay out of git. Reports in `reports/` are for Caleb's review in this private repo.
- No sheet is renamed by this tool, ever.
