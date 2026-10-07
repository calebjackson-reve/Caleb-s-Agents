# Home Brief acceptance checks

Runs the automatable items of the Home Brief Build Standard against a build folder or a running URL, at 1440 and 390 wide, reduced motion off and on. Writes `report.md`, `report.json` and full-page screenshots.

```
npm i -D playwright          # once, in this repo
node homebrief-checks/check.mjs /path/to/homebrief/revision --out homebrief-report
node homebrief-checks/check.mjs http://127.0.0.1:8921 --out homebrief-report
```

Blocking failures: page does not load, console errors, failed requests, any green in computed styles, sms/tel links that do not carry 225-747-0303, broken images or video, banned text (90+, $24.5M, 54 sales, Market Place, RÊVE, New Orleans, em dashes). Also reported: external network requests, off-palette colors, missing identity text, tap targets under 44px and text under 17px at phone width, and email fields.

Exit code 0 means pass, 1 means at least one blocking failure.
