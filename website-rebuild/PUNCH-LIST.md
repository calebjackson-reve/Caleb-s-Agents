# Go-live punch list for calebjackson.org

Checked live on 2026-10-29. Every status below was verified this session: DNS lookups, fresh fetches of both sites, the deploy workflow history, and the LP case threads in the inbox. Facts are labeled; the one inference is marked.

## Already done (no action)

- Lead webhook: Apps Script deployed and tested 2026-10-29, test POST landed a row. The live site.js on home.calebjackson.org posts straight to the exec URL. Verified in the served file today.
- Deploys: the "Deploy calebjackson.org" workflow is green, 19 runs, latest today 16:34 UTC. Pushes to main under website-rebuild/ auto-publish.
- Old-URL redirects: every old LP sitemap URL now has a stub page and _redirects entry on the rebuild (merged today, PR 75 and 74), including /profile and /contact-us.
- IDX paperwork: ROAM MLS approved the new IDX agreement, LP confirmed "paperwork process is now complete" (Marli Espinales, idx@luxurypresence.com, 2026-10-28). The Home Search feed is safe to move.
- Review page: live at home.calebjackson.org/review/ (HTTP 200 today) with the Google and Zillow links set.
- Bridge styling on the LP site: both snippet scripts published and verified working today.

## Blocking the cutover, in order

1. LP case 00677715 is stale. Logan Standridge (LP Advanced Client Support) wrote on 2026-10-21 that he was "checking with engineering" about serving the site at search.calebjackson.org. No reply since, 8 days. Action, Caleb: nudge on the same thread (a new email opens a new case at the back of the queue), or faster per LP's own note, the gold chat button in the Presence platform or 310-955-1077 option 2. Draft reply below.
2. search.calebjackson.org exists in DNS but serves nothing. The CNAME resolves (104.18.120.91, LP's Cloudflare) but returns HTTP 404 with an empty body (checked today). LP created the record but has not attached Home Search to it. Same case, same nudge.
3. The three DNS records. Once Home Search loads on the subdomain, LP flips the apex: CNAME @ and www to the GitHub Pages host (calebjackson-reve.github.io), keeping MX, SPF, the Google TXT and the home record. The table is in GO-LIVE.md. The same day, run the deploy workflow with site_host = calebjackson.org. That moment is the cutover.

## Content gaps to close before or at cutover (Caleb approves each)

4. Zachary card on the communities page is still a placeholder ("my own photo coming") and links to neighborhood-template.html, which ships noindex with bracketed stats. Pick one: drop in a real Zachary photo and unlink the template, or hide the card until the photo exists.
5. Reviews sections on Home and About are hidden behind data-until="reviews approved". The review link page is live, so the fastest path is sending it to 3 to 5 past clients, then unhiding the sections once real Google reviews exist and filling in the count and date with their source.
6. Search page IDX link still points nowhere until the subdomain works (GO-LIVE open item). Covered by item 1.
7. Prairieville: the rebuild has no Prairieville page either. PRAIRIEVILLE-PAGE.md is written for the LP site today; when the rebuild becomes the main site, the same copy becomes a rebuild page. Decide at cutover which site it lands on first.

## Day-of checklist (from GO-LIVE.md, unchanged)

- Run the deploy workflow with site_host = calebjackson.org the same day LP repoints the apex.
- Fresh load desktop and phone, no console errors, hero video plays, each form delivers a test lead to the sheet and aire@.
- Lighthouse pass, Search Console verify and sitemap submit, license and brokerage line on every page.
- Rollback if needed: remove the Pages custom domains, restore A @ 104.16.160.240 and CNAME www production.luxuryproxy.net. Five minutes.

## After cutover

- The lp-fixes.js/lp-motion.js snippet keeps working on whatever LP serves at search.calebjackson.org only if LP carries the custom code over; check once and re-paste if not. The main-site SEO fixes stop mattering because the rebuild pages are correct natively.
- Send LP SUPPORT-CASES-SEO.md case 2 anyway (IDX titles, price H1s, schema): the IDX bugs follow the Home Search product to the subdomain.
- Google Business Profile: LP's SEO team emailed 2026-10-23 that no GBP location was found to transfer ownership of. If there is no GBP at all, creating one matters more than everything above for "Baton Rouge realtor" map-pack visibility, which the audit couldn't measure.

## Draft nudge for case 00677715 (Caleb sends, reply on the existing thread)

> Hi Logan,
>
> Following up on this one from October 19. Two things since then: ROAM MLS approved the new IDX agreement on October 28, so the feed paperwork is complete, and the DNS record for search.calebjackson.org already resolves but serves a 404, so it looks like the site just needs to be attached to it on your side.
>
> Can engineering confirm the configuration and turn on Home Search at search.calebjackson.org? Once that loads we'll send the final three DNS records for the apex swap in this same thread.
>
> Caleb Jackson, Keller Williams First Choice, (225) 747-0303
