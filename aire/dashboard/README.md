# AIRE dashboard

`index.html` is the pipeline and market dashboard. Market section reads `aire/market-data/gbrar-2026-09.json` (baked in at build, update both when a new GBRAR report lands). Pipeline section is an empty state until the "AIRE Pipeline" sheet exists, see `aire/pipeline/README.md`.

Preview: see STATUS.md for the current artifact link. Chart colors were validated with the dataviz palette script in light and dark on October 19, 2026.

When Claude Dashboards (beta) is on Caleb's plan, point it at the same sheet and the same GBRAR report. This page is the fallback that always works.
