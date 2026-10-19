# Calculators for calebjackson.org

Interactive pages a visitor can use without talking to anyone, so the site does what GPT-6's Intelligent UI does for a ChatGPT user: answers with something to work with, not a paragraph.

| File | What it does | Status |
|---|---|---|
| `net-sheet.html` | Seller net sheet. Sale price, payoff, commissions, Louisiana closing costs, estimated net. Copy button. Brand tokens from `lp-integration/tokens.css`. | Built Oct 19 2026, waiting on Caleb's review |

## Rules every calculator follows
- "Estimate only" is the first words on the page and the last words in the note. No promise of price, timing or proceeds.
- Louisiana has no transfer tax. Defaults carry their source and date in the page note.
- Caleb Jackson, Keller Williams First Choice, license 995709547, office address, phone and email at the bottom.
- Every number is editable. Nothing is hidden.

## How it goes on the site
1. Caleb reviews the defaults (commission splits, title percentage, recording fee) against his last three closings and corrects any he disagrees with.
2. Luxury Presence, Site Editor, add a custom HTML section to the Sell page. Paste the whole file. The fonts are already loaded site-wide by `lp-integration/snippets.html`.
3. Publish, open the page on a phone, change the sale price, confirm the net updates.

## Defaults and sources
- Title and closing services about 0.5 percent of sale price, seller side: listwithclever.com Louisiana seller closing costs, 2026 update.
- No statewide transfer tax: realestatewitch.com Louisiana seller closing costs, 2026.
- Recording fees: sources conflict ($50 average vs $100 for a short deed plus $5 portal fee). Default $150 covers deed plus mortgage release. Confirm with the East Baton Rouge or West Feliciana Clerk of Court.
- Commission defaults 3 and 2.5 percent are placeholders for Caleb's actual listing agreement, not market data.
