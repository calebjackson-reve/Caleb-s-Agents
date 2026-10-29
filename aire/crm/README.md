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
| Geo | **added by this tool** (only when missing, 2026-10-27) | key, kind, ref_id, address, lat, lng, match, geocoded_at |

No column is added to Contacts. Geo holds one row per geocoded Contacts or Deals address (`key` is `person:<person_id>` or `deal:<deal_id>`), written only by `crm.py geocode`. A row with `match` tie or no_match has no coordinates and is kept so the next run skips it until the address in the sheet changes. Every column keeps its meaning. The only Contacts columns this tool writes are `Stage`, `Last_Touch`, `Next_Action` and `band`, plus `Do_Not_Contact` one way (to YES). The enrichment block (name_tier through provenance) and `Command_ID` are never written.

Values the sheet actually uses (counted 2026-10-19): band is HOT 117, WARM 46, NURTURE 524, DORMANT 955, blank 1,984. Stage is blank 2,928, nurture 641, past client 57. Type is unknown, client, household, recruit, vendor, agent, lender. Last_Touch is filled on 4 rows and Next_Action on 1. That is why the first feed says "never logged" for nearly everyone, and why the Hot-Warm-Cold merge matters.

## Write gates

The same rules the Mac's `crm_client` enforces, reused here, never loosened. They are tested offline (`python3 crm.py --test`, 75 checks).

- Every contact write is by `person_id`, and the id must already exist. A new person gets a minted id one past the highest id ever seen in Contacts, Notes or the Connector Log, so a deleted row's id is never reused.
- `Do_Not_Contact` can be set to YES. There is no code path that sets it back to NO. A touch on a Do_Not_Contact person is refused.
- `Command_ID` is never written. KW Command is read by the Mac companion only.
- Every write lands in `audit.jsonl` (default `~/aire/crm/audit.jsonl`, override with `AIRE_CRM_AUDIT`) and as a row in the Connector Log tab, with Tool, Client `crm.py`, person_id and detail.
- `--dry-run` on any command lists every planned write and performs none, including tab creation and the audit file.
- Gmail is read only. The tool never sends, labels or deletes mail.

## Cadence

By the sheet's own `band` column on Caleb's five-step scale (2026-10-20). Legacy values are read as HOT = hot, WARM = warm, NURTURE = cold, DORMANT = ice-cold until `rescale-band` rewrites them. Blank band is not on the touch list. Type vendor, agent and lender are never on it. Do_Not_Contact YES is never on it.

| band | Days between touches |
|---|---|
| hot | 7 |
| warm | 14 |
| lukewarm | 30 |
| cold | 90 |
| ice-cold | 365 |

**iMessage data first.** `feed --signals FILE` and `due --signals FILE` take either output of `aire/enrichment` (`out/enriched.csv` or `out/imessage-signals.json`, both stay on the Mac and out of git). With signals loaded, the last real text in or out counts as the last touch when it is newer than Last_Touch, the enrichment label sets the cadence instead of the sheet band, and anyone who texted last and is still waiting on Caleb (`owes_reply`) is due today and sorts to the top. Without `--signals` the feed falls back to Last_Touch and band alone. Signals are read only, nothing from them is written to the sheet.

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
python3 crm.py --dry-run website-leads   # what the Website leads sheet import would write. Nothing written.
python3 crm.py website-leads        # new form leads: note + call-today task, or a new hot contact. Each row imports once (crm_import column). DNC people get nothing.
python3 crm.py sync-tasks           # one Tasks row per HOT/WARM Next_Action, idempotent
python3 crm.py feed                 # writes feed.json for the Pipeline app (see FEED.md)
python3 crm.py feed --signals ../enrichment/out/enriched.csv   # same, ranked by iMessage data first
python3 crm.py geocode --report reports/YYYY-MM-DD-geocode.report.md   # addresses -> Geo tab (Census geocoder, free), unmatched listed for Caleb
python3 crm.py --json lead "Owner at 2135 Shady Oaks Dr" --source "Market Monitor permit 2026-10-26"   # Make lead from the Market Monitor
python3 crm.py due                  # who is past their band's cadence (--signals works here too)
python3 crm.py rescale-band         # legacy HOT/WARM/NURTURE/DORMANT cells to the five-step scale, audited
python3 crm.py tasks                # open tasks, overdue first, plus Next_Action items not yet synced
python3 crm.py deals                # live deals
python3 crm.py touch 247 "called Paul, counter is with Novak"
python3 crm.py task 247 "send BBA to Command" --due 2026-10-21
python3 crm.py done a1b2c3d4
```

Cloud sessions have no token file. Put the token JSON in the environment's secrets as `AIRE_GOOGLE_TOKEN_JSON` (never in chat) and the engine writes it to the token path on first use.

`--local FILE` runs any command against a JSON snapshot instead of Google. That is how the cloud session ran the dry runs in `reports/` without a token. `--as-of YYYY-MM-DD` fixes the date for reproducible output.

### What `ingest` does

Only mail from luxurypresence.com, showingtime.com and authentisign.com, only newer than `--hours`.

- **Luxury Presence "New Lead - Name"**: matched to a contact by email, then 10-digit phone, then exact display name. A match gets a Notes row ("Website lead 2026-10-18: Google Sign On email") and a Next_Action if theirs is blank. No match creates a contact: band HOT, Stage `new lead`, Source `Luxury Presence YYYY-MM-DD`, Next_Action "Call within the hour", Type client, Do_Not_Contact NO.
- **ShowingTime "SHOWING CONFIRMED | address ..."**: a Deals row keyed by the address (stage active, side listing) with the last event, and a Notes row when the deal has a person_id.
- **Authentisign "Your signature is requested / Notice of inactivity / Signing complete / Signing updated"**: a Deals row only when there is a real street address, taken from the document name ("9241 Pecan Tree Drive - Inspection Response.pdf") or lent by another mail in the same Gmail thread that named one. A document with no address ("GBRAR Counteroffer Addendum", "LRA General Addendum") never becomes a Deals row. It is attached as a Notes row to the signer when the mail names a Participant or waiting-on email the CRM knows, otherwise it is logged once as `unmatched_authentisign` in the audit file and the Connector Log. Either way a Tasks row "Sign <doc>" is created when Caleb is the one who owes the signature, and "Signing complete" closes it.

Idempotent: the Connector Log is the memory of what was already ingested, so a re-run writes nothing new.

### What `feed` writes

`feed.json`: touches due, tasks (Tasks tab plus Next_Action items), live deals, new leads of the last 14 days, counts, whether the live header passed, plus `map` (pins from the Geo tab and the farms Caleb drew) and `market` (Market Monitor rows from `aire/map-crm/cache/signals.json`, joined to the nearest known person). Spec in `FEED.md`. The Pipeline app reads it. This tool never shows anything on a screen.

### What `geocode` does

Every Contacts row with a numbered street plus a city or zip, and every live deal, goes to the Census Bureau batch geocoder (free, no key, up to 10,000 per file). Results land in the Geo tab. A row whose address has not changed since its last run is skipped, matched or not, so a daily run sends only what is new or edited. A batch "Tie" is looked up once more one address at a time: when every candidate sits on the same point (two spellings of one street) it is a match, otherwise it stays unmatched. Nothing is pinned on a guess. `--report FILE` lists the unmatched addresses for Caleb to fix in the sheet (client data, keep the report on the Mac). One audit line per run.

## Hot-Warm-Cold merge

The 458-row sheet "Hot-Warm-Cold Contacts 2026-10-19" (`11t6vex49xdA7RmskELDxt2O044vo1EJkPqL3yCgglHE`) is Caleb's hand-tiered list. It is merged into the real CRM only after a reviewed dry run.

```
python3 crm.py --dry-run --as-of 2026-10-19 merge-hwc --hwc hwc.json --report reports/YYYY-MM-DD-hwc-merge-dry-run.md
```

`hwc.json` is the sheet's Contacts tab as JSON (a list of row dicts, or `{"Contacts": [...]}`). The report classifies every row as matched, new or conflict and lists each planned cell. Nothing is written. The report from 2026-10-19 is `reports/2026-10-19-hwc-merge-dry-run.md`. After Caleb says yes, and only then, `merge-hwc --apply` performs the matched and new plans. Conflicts are never applied by code; Caleb settles them in the sheet.

**Applied 2026-10-19.** Caleb said yes the same evening. The cloud session had no Google token, so the engine computed the exact writes on a local copy and the Google Sheets connector carried them to the sheet: 391 matched rows updated (Last_Touch and Next_Action, never band), 25 new contacts (person_id 7229 to 7253), 416 Notes rows, 855 Connector Log rows. Every row was read back and matched the plan. The 42 conflicts are still Caleb's to settle. Do not run `merge-hwc --apply` again for the 2026-10-19 list; a re-run would add duplicate Notes.

Mapping decisions in the plan, all open for Caleb to change: HWC tier HOT and WARM fill a blank band; COLD and CONTACT fill no band. HWC Category friend, family, lead and client become Type client; agent and vendor keep their name; other becomes unknown. A phone or email in the CRM is never overwritten.

Note: PR 59 added empty Pipeline, Activity, Tasks and Leads tabs to the Hot-Warm-Cold sheet. They are not used by anything. Removing them is Caleb's call.

## Every day, on the Mac

1. `python3 crm.py ingest --hours 26 && python3 crm.py sync-tasks && python3 crm.py geocode && python3 ../map-crm/monitor.py pull --write && python3 crm.py feed`
2. The Pipeline app reads `feed.json`. Caleb works from there.
3. A call, text or visit: `crm.py touch PERSON_ID "what happened"`. Finished a task: `crm.py done TASK_ID`. The Mac companion keeps using its own scripts for Command changes.

## Rules

- One CRM. If something needs a table, it is a tab in the AIRE CRM sheet, listed above.
- `feed.json`, `audit.jsonl` and any snapshot are client data and stay out of git. Reports in `reports/` are for Caleb's review in this private repo.
- No sheet is renamed by this tool, ever.
