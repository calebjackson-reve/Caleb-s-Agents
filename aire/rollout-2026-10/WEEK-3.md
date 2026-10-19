# Week 3: dashboard and the first market update

Written October 19, 2026. Started the same day as week 2 on Caleb's say-so.

## Status
| # | Move | Who | State |
|---|---|---|---|
| 1 | Pipeline and market dashboard | Claude built, proven | live at https://claude.ai/artifact/BaiAEbjMLYo9neapCpaXhn (private) |
| 2 | Pipeline sheet | Caleb, 5 minutes | template ready, sheet not created |
| 3 | October market update for Claude Motion | Claude scripted, compliance passed | waiting on Caleb to run Motion or record it |
| 4 | Claude Dashboards beta on the same data | Caleb | optional, this page is the fallback |

## 1. Dashboard
File: `aire/dashboard/index.html`. Data: `aire/market-data/gbrar-2026-09.json`, pulled from the official GBRAR Monthly Indicators PDF for September 2026 (current as of October 6, 2026).

Proof, October 19, headless browser:
- Phone width: no horizontal scroll, no console errors, twelve table rows, four chart lines drawn.
- Desktop dark mode: hovering September on the price chart reads "This year $269k, Prior year $270k", which matches the report.
- Chart colors validated with the dataviz palette script in both light and dark (lightness, chroma, colorblind separation, contrast all pass).

What it shows: five September tiles, median price and days on market over twelve months against the prior year, a table view, the pipeline section (empty until the sheet exists), and the confirmed production line.

## 2. Pipeline sheet
No deals or pipeline sheet exists in Caleb's Drive (searched October 19). Template and steps in `aire/pipeline/README.md`. Five minutes.

## 3. Market update
`aire/market-update/2026-10-script.md`: an 85 word script, the Motion prompt scene by scene, the post caption, and the compliance pass (PASS, no AI label needed because no synthetic people or footage). Every number is GBRAR September 2026.

The story for October: sales and prices flat, days on market up from 61 to 79, inventory 4.6 months, rates crossed seven percent. Sellers price right on day one, buyers have room.

## 4. What Claude cannot do from here
Run Claude Motion or Claude Dashboards. Both are Claude app features on Caleb's plan. The script and the data are ready so the only work left is the paste.
