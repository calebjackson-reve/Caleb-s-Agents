# Review link

Page: `site/review/`, live at https://home.calebjackson.org/review/ (GitHub Pages). Any merge to main that touches `website-rebuild/site/` republishes it.

## How it works
1. Caleb texts one personal link. The text preview shows `og-review.jpg` (headshot, 5 stars, "Share your experience with Caleb Jackson").
2. The client taps through a few quick questions: stars, bought or sold, town, first home, who was moving (sets "we" or "I"), what Caleb helped with (31 options in six groups, pick up to 6, sellers do not see the buying options and buyers do not see the selling ones), two free-text boxes, who they would recommend him to, and the tone.
3. The page writes the review from their answers. Every option has 4 to 6 phrasings, the sentence order is shuffled, two thoughts sometimes join into one sentence, and the tone (warm, straight to the point, excited, short and sweet, or a surprise) changes the opening, the connectors and the closer. The same taps produce a different review every time, and "Write it a different way" rerolls it. The point is that no two clients post the same text, and they read like people, not a template.
4. **Copy and post on Google** copies the text and opens Google's review box. They paste and post. Same for Zillow.

Google and Zillow do not allow anyone to post a review for a client. The client always posts from their own account. This page gets it down to about 90 seconds.

## Testing it
- `node website-rebuild/tests/review-writer.test.js` checks the writer alone: no leftover tokens, every tapped option shows up, we/I switching, 300 seeds give 300 different reviews.
- `node website-rebuild/tests/review-e2e.js` opens the page in Chromium on a phone-sized screen, taps through it like a client, checks the 6-pick limit, the tone and we/I switches, the clipboard copy and that the Google and Zillow buttons open the right links. Screenshots land in `tests/out/` (git-ignored). Pass a URL to test the live page: `node website-rebuild/tests/review-e2e.js https://home.calebjackson.org/review/`.

## Building a link
`https://home.calebjackson.org/review/?n=FIRSTNAME&a=TOWN&t=buy`
- `n` is the first name
- `a` is the town or neighborhood
- `t` is `buy`, `sell` or `both`

Example: `https://home.calebjackson.org/review/?n=Sarah&a=Zachary&t=buy`

## Text to send (one person at a time)
> Hey Sarah, it meant a lot to help you get into your place in Zachary. If you have two minutes, would you leave me a quick review? This link walks you through it: [link]. No pressure at all, and thank you either way.

## Rules
- Send it to every client the same way. Don't only send it to the happy ones.
- No gifts or incentives in exchange for reviews.
- Send one at a time, a few a week, never in a batch (per `audits/2026-10-12/google-review-investigation.md`).
- Reply to every review within a day.
- Keep your log of who you asked off GitHub.

## Files
- `site/review/index.html` is the page. Nothing a client types is saved or sent.
- `site/review/config.js` holds the review URLs.
- `site/review/writer.js` is the writer: the option list, the groups, every phrasing, the tones. Add a new option by adding it to `VALUES`, a group in `GROUPS` and `ORDER`. No DOM in there, so the Node test can run it.
- `site/review/og-review.jpg` is the link thumbnail. `og-card.html` is its source. Re-render it with Playwright at 1200x630.
- `site/review/caleb.jpg` is cropped from `media/headshots/01-balcony-blue-suit.webp`.
