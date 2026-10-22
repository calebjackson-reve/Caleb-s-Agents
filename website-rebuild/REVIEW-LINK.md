# Review link

Page: `site/review/` and it goes live at https://home.calebjackson.org/review/ (GitHub Pages, CNAME already in place since Oct 14). It is **not published yet**.

## How it works
1. Caleb texts one personal link. The text preview shows `og-review.jpg` (headshot, 5 stars, "Share your experience with Caleb Jackson").
2. The client taps 6 quick questions. The page writes a review from their answers, with the town, buy or sell, and first-time buyer written in naturally.
3. **Copy and post on Google** copies the text and opens Google's review box. They paste and post. Same for Zillow.

Google and Zillow do not allow anyone to post a review for a client. The client always posts from their own account. This page gets it down to about 90 seconds.

## Before going live (Caleb)
1. Google and Zillow review links are set (Oct 21).
2. Approve the publish to home.calebjackson.org/review.

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
- `site/review/og-review.jpg` is the link thumbnail. `og-card.html` is its source. Re-render it with Playwright at 1200x630.
- `site/review/caleb.jpg` is cropped from `media/headshots/01-balcony-blue-suit.webp`.
