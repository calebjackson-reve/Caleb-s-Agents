# Pipeline changes for the Map CRM and Market Monitor

What changed in `aire/pipeline-app/` on 2026-10-29 to meet `CONTRACT.md` steps 4, 8 and 11. Built by Claude Code on the Mac against the app on `main` (the standard-library Python server and plain JS screen), not the old Codex SwiftUI app the contract first assumed.

## Files

| File | Change |
|---|---|
| `static/map.js` | New. A small slippy map with no library: OpenStreetMap street tiles, USGS The National Map imagery for satellite (public domain), both free and credited on the map. Pins, deal houses, market diamonds and farm outlines on one canvas. Clusters past 200 pins in view. Farm drawing (click corners, double-click or Enter to finish, Backspace undoes, Esc cancels). Point in polygon is the same ray cast as `geo.py`. |
| `static/mapviews.js` | New. The Map page, the Market Monitor page, the deals map, the pin card, farms, lists out. |
| `static/app.js` | Nav gets Map (`8`) and Market Monitor (`9`). Deals gets a LIST / MAP switch. The 30 second poll keeps the map where it is instead of redrawing the page. `personRow` also finds people who are only on the map, so Compose and Touched work from any pin. **Bug fix:** every modal (Touched, Task, Note, Do Not Contact, deal editor) returned null on Save because `closeModal()` resolved the promise before the value was passed. Saves now go through. |
| `static/app.css` | Map, side panel, card and market styles in the existing theme. |
| `static/index.html` | Loads `map.js` and `mapviews.js`. |
| `app.py` | `POST /api/farms` (writes `map-crm/farms.local.json`, checks names and corners, then rebuilds the feed), `POST /api/dismiss` (`map-crm/cache/dismissed.json`), `POST /api/lead` (`crm.py lead`), `POST /api/list` (`map-crm/out/call-list-<date>.csv` or `postcards-<date>.csv`). `/api/state` carries `farms` and leaves dismissed rows out. Demo mode handles `lead`. 11 new offline checks. |
| `fixtures/demo-feed.json` | `map` and `market` sections with made-up people and made-up addresses, so `--demo` shows both pages. |

Engine side, same day: person pins carry `address`, `city` and `zip` so a map selection can become a postcard list (`crm.py`, `FEED.md`), and `monitor.py` reads the real Flexmls alert layout (0 to 73 rows on the live dry run: 22 new listings, 51 listing changes whose kind Flexmls does not state).

## Proof

- `python3 aire/pipeline-app/app.py --test`: 0 failures, including the 11 new map checks. `crm.py --test` and `monitor.py --test`: ALL PASS.
- Screenshots on fixture data: `pipeline-app/screenshots/13-map.png` through `19-map-3600-clustered.png`.
- Click-through on fixture data with real mouse clicks (Playwright, headless Chromium): click the pin for Morgan Demo, the card opens, Touched, type "Called from the map", Save. Toast "Touch logged for Morgan Demo" and Morgan drops off touches due. In demo the write goes to `DemoCRM`, so there is no `audit.jsonl` line; on the real feed the same button is the existing `crm.py --json --client pipeline touch` call, which writes the audit and Connector Log.
- Load time: 3,600 pins (the size of the real CRM) render in 22 ms and redraw in 2 ms in headless Chromium. The contract limit is 3 seconds.

## Not verified

- A real touch, lead, deal or list from the map on the real CRM. Those are Caleb's clicks to make.
- Tile servers under heavy use. OpenStreetMap's tile policy asks for light, attributed use, which one person's daily app is. If it ever gets throttled, a paid tile plan needs Caleb's yes.

## Review

A fresh-context reviewer read the diff against this contract on 2026-10-29 and failed it on three points, all fixed and re-tested the same day:

- Values inside inline click handlers were only HTML-escaped, so an apostrophe ("12 O'Neal Ln", "St. Francisville's Core") broke the button, and a permit id from city data could have run script. Every handler value is now JSON-quoted (`jsa()` in `mapviews.js`), farm ids are letters, numbers and dashes. Checked in the browser with an apostrophe address, an apostrophe farm and a hostile permit id: every button worked, no script ran.
- Call and postcard CSV cells that start with `= + - @` are neutralized with a leading apostrophe (phones excepted).
- Flexmls "Active" listings with no event word were counted as new listings. They are now `listing_change`, and the MIME walk reaches nested HTML parts.

Kept as specified: Make lead pre-fills "Owner at <address>" (CONTRACT.md and FEED.md name it), Caleb edits it before saving.

## 2026-11-04: Google Maps style restyle

Caleb asked for the map to work like a Google-style map product, black and coral with tan only as an accent. Branch `claude/map-google-style`, built by Claude Code in the cloud.

| File | Change |
|---|---|
| `static/gmap.css` | New. Every style scoped to `.gm`: full-bleed map, search pill, suggestion list, place panel with a colored hero and round actions, filter chips, layer swatches, zoom. Black and coral tokens, tan as the accent. |
| `static/map.js` | Dark base by default (OSM tiles under a CSS filter, no new tile source), Map and Satellite as before. Coral and tan palette. Teardrop pins for the selected pin and a searched address, white-edged dots, black clusters with a band ring. Smooth wheel and pinch zoom, gliding buttons and double-click, `flyTo`. |
| `static/mapviews.js` | Search box with suggestions over people (name, address, city, phone, email), deals, market rows and farms, arrow keys and Esc. Place card for people, deals and market rows (Compose, Touched, Task, Note, Directions to Google Maps in a new tab, call list, postcards, Make lead, Make deal, Dismiss). In-view summary when nothing is picked. Band chips plus a Filters popover for last touch, stage and area. Dark, Map and Satellite swatches. The deals map uses the same map and only searches deals. |
| `app.py` | `POST /api/geocode`: one typed address through the free Census one-line geocoder already in `geo.py` (no key, no cost). Needs a house number, adds ", LA" when no state or ZIP is typed, refuses ties. A searched address shows a "Not in your CRM" card with Make lead. 2 new offline checks. |
| `static/index.html` | Loads `gmap.css`. |

Proof:
- `python3 aire/pipeline-app/app.py --test`: 0 failures.
- Click-through on the demo fixtures in jsdom, 26 checks, all pass: search to place card, Touched posts `/api/touch` for that person, close back to the summary, Hot chip, Filters popover, Satellite switch, smooth wheel zoom, address search to a "Not in your CRM" card, market card keeps Make lead and Make deal, deals map, Market Monitor, no script errors.
- Screenshots of a private preview with made-up people, taken in Caleb's Chrome.

Not verified from the cloud:
- The street and satellite tile images (the cloud proxy blocks the tile hosts and the preview page blocks outside images).
- A live Census lookup through `/api/geocode` (the cloud proxy refused it; the same call worked from the cloud on 2026-10-27). The error path shows a plain message.
