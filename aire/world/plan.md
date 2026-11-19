# AIRE World: the plan

A miniature Louisiana parish town on a table. Caleb's business as a model village: his Keller Williams First Choice office on the square, a street of the homes he is selling with real yard signs, showing cars on the ring road, a courthouse clock for deadlines, a post office for the inbox, a market billboard, and a construction site for the Market Monitor. Everything that moves is tied to a number in `data.json`, which the sync builds from the AIRE CRM sheet alone (Contacts, Deals, Tasks, Deadlines, Command export, LP leads) plus the GBRAR market report in this repo. Written 2026-11-04, revised the same afternoon when the sheet became the single source.

## Palette (Keller Williams First Choice, in daylight)

- Ink `#14100e` for text, sign posts and the road markings
- Ivory `#fbf8f3` for house trim, the courthouse and the card glass
- Coral `#e87757` for the office sign, For Sale signs, the LIVE dot and anything that needs Caleb
- Under-contract gold `#e9c46a`, Sold sage `#9bbf8a`, brick `#b5563f`, live-oak green `#4f7d4a`, lawn `#cfe3b4`, asphalt `#5c5856`, Mississippi blue `#8fb6c9`
- Sky and table: warm paper `#f3ede3` so the model sits in soft afternoon light

## The eight clickable objects

| Object | Where it sits | What it looks like | Stats on its card (all from data.json) | How it moves |
|---|---|---|---|---|
| 1. KW First Choice office | West side of the square | Two-storey brick office with a coral sign on the roof, ivory trim, a flagpole | Under contract volume (`deals.under_contract_volume`), pending commission (`deals.pending_commission`), live deals (`deals.live`), closed last 90 days and volume (`deals.closed_90d`, `deals.closed_90d_volume`), next closing (`deals.next_close`) | Flag waves, sign glows, the people on the square walk in and out of the door |
| 2. The street | South edge, one house per deal | Seven low-poly houses in pastel siding with a yard sign each: coral For Sale (active), coral with a Showing rider, gold Under Contract, sage Sold | For that house: side, stage, price, expected close, days on market, deadlines filed and the next one (`deals.houses[i]`). Street totals: active listings, under contract, median days on market, next closing (`deals.*`) | Signs swing in the breeze; a sold house gets a moving truck at the kerb |
| 3. Lead traffic | The ring road around the town | Small cars in ivory, coral and ink, one per new lead this week (max 8, always at least 1) | New leads 7 and 30 days (`people.new_leads_7d`, `people.new_leads_30d`), by source (`people.new_leads_7d_by_source`), LP and Command matches (`match.*`) | Drive the loop at different speeds, slow at the corners |
| 4. Post office | East side of the square | Small ivory building with a blue mailbox and a flag | Next actions waiting (`people.next_actions`), touched in 30 days (`people.touched_30d`), nurture stage (`people.nurture`), past clients (`people.past_clients`) | The mail truck runs more often as the next-action pile grows, the mailbox flag flips |
| 5. Town square | Center, under a live oak | A fountain, a live oak with hanging moss, people walking between the square and the office | Contacts (`people.contacts`), hot and warm (`people.hot`, `people.warm`), new leads 7 and 30 days (`people.new_leads_7d`, `people.new_leads_30d`), touched in 30 days (`people.touched_30d`), next actions waiting (`people.next_actions`) | Walkers: 2 plus one per 15 hot contacts (max 12). Fountain water bobs, moss sways |
| 6. Courthouse clock | North side | Ivory courthouse with a clock tower; hands show the real time | Deadlines today and next 30 days (`calendar.deadlines_today`, `calendar.deadlines_30d`), the list (`calendar.deadlines`, kind, date and deal stage, never the address), tasks open and overdue (`engine.*`) | Clock hands move; the bell lamp pulses coral when a deadline is today |
| 7. Market billboard | South-east corner | A roadside billboard on two posts, the GBRAR numbers painted on it | Median price, days on market, months of supply, new listings, closed sales (`market.gbrar.*`), with source and month. Second panel: where the sphere lives (`people.by_city`) | Repaints when a new report lands |
| 8. Construction site | South-west corner | A crane over a framed house and a stack of lumber | The engine room: tasks open and done (`engine.*`), deals in the spine, deadlines and Command matches, unmatched count (`match.*`), sync time (`sync.at`) | Crane swings while tasks are open or records are unmatched |

Also on the table, not clickable: the ring road and main street, live oaks, picket fences, a water tower marked ZACHARY (Caleb's first farm), three birds.

## Rules

- Every number on every card comes from `data.json`, with its period and source. Nothing is typed into the page.
- The page re-reads `data.json` every 60 seconds and animates a number that changed.
- LIVE dot with "updated X min ago" from `sync.at`. Grey after 30 minutes or when the last sync failed, with the time of the last good sync.
- No names, phones, emails or addresses anywhere. Houses are stage and price only.
- Works on a laptop and a phone: drag to orbit, scroll or pinch to zoom, the whole town in view at start, cards stay inside the screen and beside the object.

## Cut

- A seller dashboard, agent recruiting and the Skool program: not in `data.json`, not in the world.
- Per-contact anything. The world shows the business, not the people in it.
