# Map CRM and Market Monitor

Map page, Market Monitor page and a deals map toggle inside the native Pipeline app, fed by the AIRE CRM engine (`aire/crm/crm.py`) and East Baton Rouge public records. The contract is `CONTRACT.md`. The engine side is built (2026-10-27). The Pipeline pages are Sol's, on the Mac.

| File | What it is |
|---|---|
| `CONTRACT.md` | The prompt contract: goal, screens, data, constraints, Sol's review, modify, verify order, failure conditions, open choices. |
| `geo.py` | Pure geometry and the Census geocoder: point in polygon, haversine, nearest, address keys, batch geocode with tie resolution. `python3 geo.py` runs its tests. |
| `monitor.py` | Pulls EBR permits (data.brla.gov `7fq7-8j7r`) and Flexmls alert mail into `cache/signals.json`. Dry run by default, `--write` writes. `python3 monitor.py --test`. |
| `farms.example.json` | The shape of a farm polygon file. The real one is `farms.local.json`, written by the Pipeline app, ignored by git. |
| `tests/fixtures/` | Made-up permits in the dataset's real column shape, and a made-up Flexmls alert. |
| `PIPELINE-CHANGES.md` | Not written yet. Sol's note on what changed in the Pipeline app on the Mac. |

Client data (`cache/`, `out/`, `farms.local.json`, geocode reports) stays on the Mac. `python3 tools/check-no-client-data.py` before every push.

## On the Mac, first run

```
cd ~/Caleb-s-Agents/aire/crm
python3 crm.py --test                       # 128 offline checks
python3 ../map-crm/geo.py && python3 ../map-crm/monitor.py --test
python3 crm.py check                        # Geo shows under tabs_to_add
python3 crm.py --dry-run geocode            # how many addresses would be sent, nothing written
python3 crm.py geocode --report reports/$(date +%F)-geocode.report.md   # Geo tab created, Census called once per 2,000 addresses
python3 ../map-crm/monitor.py pull          # dry run: counts by label and farm
python3 ../map-crm/monitor.py pull --write  # cache/signals.json
python3 crm.py feed                         # feed.json now has map and market
```

Expect the first geocode of about 3,600 contacts to take a few minutes (Census batches of 2,000). The report lists what did not match. Fix those addresses in the sheet and the next run retries only them.

## Every day

`crm.py ingest`, `sync-tasks`, `geocode`, `monitor.py pull --write`, `crm.py feed`, in that order (see `aire/crm/README.md`). `geocode` sends only new or edited addresses, so the daily run is quick.

## What Sol builds in Pipeline (the Mac)

Read `CONTRACT.md` section "What is on the screen" and `aire/crm/FEED.md` for `map` and `market`. In short:

1. **Map page.** `feed.map.pins`, colored by `band`, deals as a house marker, `new_lead` pulses, `type` agent/lender/vendor hidden until toggled. Click a pin: the existing card and the existing three actions. Filters on band, stage, type, days_quiet, owes_reply, farm. Cluster past 200 in view. Basemap: street by default, satellite toggle on a free tile source (MapKit in a native app, Leaflet with OpenStreetMap in a web view). Nothing paid without Caleb's yes.
2. **Farms.** Draw a polygon, name it, save to `farms.local.json` (`{"version": 1, "farms": [{"id", "name", "created", "polygon": [[lat, lng], ...]}]}`), then run `crm.py feed`. `feed.map.farms` carries the people count by band per farm.
3. **Market Monitor page.** `feed.market.rows` as a list, newest first: date, label, address, city, value or price, source and source date, farm, nearest known person and miles. Row actions call `crm.py lead`, `crm.py deal --create`, append to `cache/dismissed.json`, or add the row to `out/call-list-<date>.csv` or `out/postcards-<date>.csv`.
4. **Deals view toggle.** List or map, same rows, same card.

Proof to put in `PIPELINE-CHANGES.md`: screenshots of both pages on fixture data, the pin to card to Touched click-through with its audit line, and the load time on the real feed.

## Sources

- Permits: https://catalog.data.gov/dataset/ebr-building-permits (SODA endpoint `https://data.brla.gov/resource/7fq7-8j7r.json`, columns read 2026-10-27, rows carry lat and long, last updated 2026-10-21 per Data.gov and issued dates through 2026-10-26 seen on 2026-10-27).
- Geocoder: Census Bureau, `https://geocoding.geo.census.gov/geocoder/locations/addressbatch`, benchmark Public_AR_Current. Free, no key. Reached from the cloud on 2026-10-27.
- Flexmls: ROAM MLS went live on Flexmls 2026-10-26 (GBRAR mail to aire@). No saved-search alerts existed yet, so the mail parser follows the standard alert layout and reports what it cannot parse. Save the first real alert, names removed, as `tests/fixtures/flex-alert.json` and fix the patterns.
- Louisiana is a non-disclosure state (HomeLight, https://www.homelight.com/blog/non-disclosure-states/): sold prices come only from MLS.
