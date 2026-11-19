# Prompt contract: Map CRM and Market Monitor in Pipeline

Per `aa-prompt-contract`. Caleb asked for this on 2026-10-27 after an Instagram reel by alex.poplawskii (a Tampa commercial broker) showing a Claude Code CRM with a Market Monitor permit feed and a satellite map of every record. Caleb's answers: use both data paths (Command and MLS through the channels we already have, plus parish public records), build both a Map page and a Market Monitor page in Pipeline, and add a map toggle to the Pipeline deals view. Caleb said "build it and push" the same morning with the defaults on every open choice.

**Status 2026-10-27:** the engine side (steps 1 to 3, 5 to 7, 9 to 10 below) is built and tested. The Pipeline app pages (steps 4, 8, 11) are Sol's on the Mac. Changes from the first draft, made while building: the feed section is called `market`, not `signals`, because `signals` was already the iMessage summary. A Census "Tie" is resolved through the single-address lookup and counts as a match only when every candidate sits on one point. Permits get a short `label` (roof, new build, moved in, remodel, pool, teardown, outbuilding, minor, other) read from the live permit types. The Flexmls parser is unverified because no alert mail existed yet (ROAM moved to Flexmls on 2026-10-26).

## What the reel showed (source), and what we are copying (inference)

From the video: a sidebar with Dashboard, Map, Pipeline, then Prospecting (Leads, Deal Radar, Market Monitor, Import List, Calls and Tasks, Email, Postcards). A Market Monitor list of county permits, one row each with permit type, street address, city and permit value. A satellite map of Tampa Bay with hundreds of blue dots. A top comment asked about non-disclosure states, so the data layer is public records. The audio was not available, so the rest is inference.

What we take from it: public data is a lead source, every record gets a pin, and the map is a way to work the pipeline, not a decoration. What we leave: the commercial permit focus and a second app. Pipeline is the one daily tool (STACK.md, 2026-10-19), so this lands inside it.

## Goal

Caleb opens Pipeline, clicks Map, and sees every contact, live deal and new lead pinned where they live, colored by band, with the farm areas he drew outlined. He clicks a pin and gets the same card and the same actions he has today (Touched, task, compose). He clicks Market Monitor and sees what changed in his farm areas this week (permits, new listings, price changes, pendings, solds) with a one-click way to turn any row into a lead or a deal. Success is Caleb planning a farm day or a call block from the map instead of from a list.

## What is on the screen (version one, in this order)

1. **Map page.** Satellite or street basemap, toggle. Pins for every Contacts row with a geocoded address, colored by band (hot, warm, lukewarm, cold, ice-cold, blank is grey). Live deals as a distinct marker (house icon) colored by stage. New leads of the last 14 days pulse. Partners (agent, lender, vendor) hidden by default, toggle on. Click a pin: display, band, stage, type, last touch, days quiet, next action, phone tap-to-call, and the three existing actions. Filters: band, stage, type, "quiet more than N days", "owes reply", farm area. Clusters past 200 pins in view.
2. **Farms.** Draw a polygon on the map, name it, save. Each farm shows who Caleb already knows inside it (count by band) and the signals inside it this week. Farms are config, not CRM rows: `aire/map-crm/farms.local.json` on the Mac.
3. **Market Monitor page.** One list, newest first, like the reel: date, signal type, street address, city, value or price, source and source date, which farm it fell in, nearest known contact and distance. Signal types in version one: `permit` (East Baton Rouge), `new_listing`, `price_change`, `pending`, `sold`, `back_on_market` (all from Flexmls alert mail). Row actions: Make lead (creates a Contacts row through the engine's new-person path, band warm, Source `Market Monitor <type> <date>`), Make deal (Deals row keyed by address), Dismiss (local, never written to the sheet), Add to postcard list, Add to call list.
4. **Pipeline deals view, map toggle.** List or map, one switch, same rows, same card.
5. **Lists out.** Any map selection or farm becomes `out/call-list-<date>.csv` or `out/postcards-<date>.csv` on the Mac. Both are client data and never leave the Mac.

## Data, and where it lives

One system. Google Sheets is the database (STACK.md). The engine in `aire/crm/crm.py` is the only writer and keeps every write gate.

| Data | Source | Where it lives | Written by |
|---|---|---|---|
| Contact pins | Contacts tab street, city, state, zip (already there) | New tab **Geo**: `key, kind (person or deal), person_id or deal_id, address, lat, lng, match, geocoded_at` | `crm.py geocode` |
| Deal pins | Deals tab address | Geo tab | `crm.py geocode` |
| Permits | data.brla.gov dataset `7fq7-8j7r`, "All construction and occupancy permits issued in East Baton Rouge Parish", GeoJSON export, last updated 2026-10-21 per Data.gov | `aire/map-crm/cache/signals.json` on the Mac, same standing as `feed.json` | `monitor.py pull` |
| MLS signals | Flexmls saved-search alert emails to aire@, read only, same Gmail token as ingest | `cache/signals.json` | `monitor.py pull` |
| Farms | Caleb draws them | `farms.local.json` on the Mac | Pipeline app |
| Map feed | everything above joined | `feed.json` gains a `map` section and a `market` section (see `aire/crm/FEED.md`) | `crm.py feed` |

Why signals are a cache and not a tab: they are public records about properties, thousands a month, most never acted on. A row enters the sheet only when Caleb clicks Make lead or Make deal, through the existing gates, and then it is a Contacts or Deals row like any other. If Caleb would rather see them in the sheet, a **Signals** tab is the alternative (open choice 2).

Geocoding: the Census Bureau batch geocoder (free, no key, US addresses, up to 10,000 per file) is the default. It is a public web service and should be confirmed reachable from the Mac on the first run. Google Maps geocoding costs money and is off unless Caleb says yes. Addresses that fail to match are listed in the geocode report for Caleb to fix in the sheet, never guessed.

Louisiana is a non-disclosure state (HomeLight's list includes Louisiana with eleven others), so sold prices come only from MLS. Public records give permits, not prices. The reel's "sales data" layer does not exist here and the spec does not pretend it does.

## Constraints

- Pipeline is the front end. The source is on the Mac, not in this repo, so Sol reads it first and matches its stack. Map rendering uses whatever is free in that stack (MapKit in a native app, Leaflet with OpenStreetMap tiles in a web view). Satellite tiles need a free source or Caleb's yes on a paid one.
- The engine only grows: new commands `geocode` and the `map` section of `feed`. No column is added to Contacts. Geo is a new tab, added only when missing, same as Tasks and Deals were.
- Every engine write goes through `person_id` gates, `audit.jsonl` and the Connector Log. `--dry-run` on everything. Gmail stays read only.
- No message is sent from the map or the monitor. Compose opens the existing compose box with the existing rules.
- `feed.json`, `cache/`, `out/`, `farms.local.json` and any geocode report with real addresses stay on the Mac. Test fixtures use made-up people and made-up addresses. `python3 tools/check-no-client-data.py` before every push.
- Every signal row shows its source and date on screen (the numbers rule in CLAUDE.md).
- Fair housing: farms are drawn by Caleb for prospecting. Nothing in the tool scores, filters or ranks people by any protected characteristic, and no signal field carries one. `ai-compliance-check` runs on the postcard copy when that gets built, not on this contract.

## Format

- Folder `aire/map-crm/`: this contract, `README.md` (run steps), `monitor.py` (pull and normalize signals, dry run by default), `farms.example.json`, `tests/` with fixtures of made-up addresses, `.gitignore` for `cache/`, `out/`, `farms.local.json`, `*.report.md`.
- `aire/crm/crm.py`: `geocode [--dry-run] [--report FILE]` and the `map` and `signals` sections in `feed`. `FEED.md` documents the new sections.
- The Pipeline app changes live on the Mac with Sol. The contract for them is section "What is on the screen" above. Sol writes a short `PIPELINE-CHANGES.md` in this folder saying what files changed there, so the repo knows.
- Proof in the pull request: offline tests passing (engine and monitor), a dry-run geocode report on the real sheet with counts only (matched, unmatched, skipped), a dry-run monitor pull with counts by signal type and farm, Map page and Market Monitor page screenshots at desktop size with fixture data, a click-through of pin to card to Touched on fixture data, and the client-data guard passing.

## Sol's run order: review, modify, verify

**Review**
1. Read `aire/STATUS.md`, `aire/STACK.md`, `aire/crm/README.md`, `aire/crm/FEED.md`, then the Pipeline app source on the Mac. Write down the app's stack and how it reads `feed.json` and calls `crm.py` before changing anything.
2. Read the Contacts header live with `crm.py check`. Count rows with a usable street plus city or zip. That number is the ceiling for pins and goes in the report.
3. Pull the EBR permits GeoJSON once by hand, read its columns, and write the field mapping into `monitor.py` as a table, not guessed names.
4. Confirm Flexmls alert mail is arriving at aire@ for at least one saved search. If not, stop and tell Caleb which saved searches to create (one per farm, new and changed listings, daily).

**Modify**
5. `crm.py geocode`: read Contacts and Deals addresses, skip rows already in Geo with the same address, batch the rest to the Census geocoder, write Geo rows, audit each, report matched, unmatched and skipped. Idempotent.
6. `crm.py feed`: add `map` (pins with `key, kind, person_id or deal_id, display, band, stage, type, lat, lng, days_quiet, owes_reply, next_action`) and `signals` (from `cache/signals.json`, with `farm` filled from `farms.local.json`). Partners carry `type` so the app can hide them.
7. `monitor.py pull`: permits from data.brla.gov for the last N days (default 14), MLS signals from alert mail for the same window, normalize to one row shape, geocode permit rows that lack coordinates, tag the farm, compute nearest known contact from Geo, write `cache/signals.json`. Dry run prints counts and writes nothing.
8. Pipeline app: Map page, Market Monitor page, deals map toggle, farm drawing, lists out. Reuse the existing card and actions. No new sender.

**Verify**
9. Offline tests on fixtures: geocode skips known rows, unmatched addresses are reported not guessed, feed carries `map` and `signals`, monitor normalizes both sources, farm tagging works on a square polygon, nearest-contact math is right on three hand-checked pairs.
10. Dry runs on the real sheet and the real mail, counts only in the report, nothing written.
11. Screenshots and the click-through on fixture data. Open the actual Map page, click a pin, see the card, click Touched, see the audit line. If any step fails the contract is not met.
12. `python3 tools/check-no-client-data.py --all`, then the STATUS entry: done, inference, needs Caleb.

## Failure conditions

- A pin is placed on a guessed location. Fail. Unmatched means unpinned and listed.
- Any write bypasses `crm.py` or its gates. Fail.
- A second database, a Supabase, a Postgres, a SQLite "just for the map". Fail (STACK.md one-system rule).
- Client data in git, including a geocode report with real addresses. Fail.
- A signal row without a source and date on screen. Fail.
- The map page takes more than 3 seconds to show pins on the real CRM (about 3,600 rows). Fail, add clustering or a viewport filter.
- The Pipeline app gets a parallel dashboard instead of two new pages and a toggle. Stop and ask.
- Anything paid (Google Maps, a satellite tile plan, a data vendor) gets added without Caleb's yes. Fail.

## Open choices for Caleb (defaults in bold)

1. Parishes in version one: **East Baton Rouge only** (the open data portal is there) / add Ascension and Livingston once a public permit source is found for each (not verified yet).
2. Where signals live: **local cache, promoted to the sheet only on Make lead or Make deal** / a Signals tab in the AIRE CRM sheet.
3. Permit filter: **residential permits only, any value** / all permits / permits over a dollar floor Caleb sets.
4. Signal window: **14 days** / 30 days.
5. New lead from a permit: **band warm, Stage new lead, Type client** / band lukewarm.
6. Basemap: **street by default, satellite toggle on a free tile source** / satellite by default (may need a paid tile plan, needs a yes).
7. KW Command contacts on the map: **through the sheet mirror only, as today** / nothing else, Command has no API here.

## What comes after version one

Postcard copy and a print export for a farm (compliance check first). Expireds and withdrawns if MLS alerts can carry them. A "who moved" pass comparing permit addresses to past clients. A phone view of the map through a Claude Dashboard over the same sheet, never a second database.

## Sources

- Reel: https://www.instagram.com/reel/Dc1PEiZyXHl/ (alex.poplawskii, September 3, caption is hashtags only, viewed 2026-10-27)
- EBR Building Permits dataset: https://catalog.data.gov/dataset/ebr-building-permits (data.brla.gov `7fq7-8j7r`, last updated 2026-10-21)
- Non-disclosure states: https://www.homelight.com/blog/non-disclosure-states/
- Census geocoder: https://geocoding.geo.census.gov/geocoder/locations/addressbatch, reached from the cloud on 2026-10-27 (batch and single lookups both answered).
- EBR SODA endpoint: `https://data.brla.gov/resource/7fq7-8j7r.json`, 239 residential permits issued 2026-10-13 to 2026-10-26 on the 2026-10-27 dry run, 238 with coordinates.
