# Go-live plan for calebjackson.org

Updated October 19, 2026 after Caleb's answers: fix placeholders first, host on Cloudflare Pages, Google Domains/Squarespace registrar, Luxury Presence by the in-app route if one exists. Nothing on the live domain has been changed.

## What I found about the domain (looked up October 19, 2026, Google public DNS)

- Nameservers: `amy.ns.cloudflare.com` and `byron.ns.cloudflare.com`. **DNS already lives in a Cloudflare account**, not at Squarespace. The registrar only holds the nameserver pointer. That makes this easy: Cloudflare Pages and the DNS are in the same place.
- `calebjackson.org` A record: 104.16.160.240 (a Cloudflare proxy address in front of Luxury Presence).
- `www.calebjackson.org`: CNAME to `production.luxuryproxy.net` (Luxury Presence).
- Mail: MX `smtp.google.com`, SPF for Google. Untouched by any of this.

Whoever set up Luxury Presence put the domain on Cloudflare. Caleb needs the login to that Cloudflare account (or LP holds it, in which case step 0 is asking LP to hand over the zone or using Route 2 in `LP-SUPPORT-DRAFT.md`).

## Done in the build (this PR)

- Review template on Home and About is hidden with `data-until="reviews approved"`. Remove the `hidden` attribute on both sections when real reviews are in.
- Bracketed median lines removed from the Communities cards. The neighborhood template keeps its bracketed slots because it's unlinked and not in the sitemap.
- Every form posts to `/api/lead`, a Cloudflare Pages function in `website-rebuild/functions/api/lead.js`, which forwards to a Google Apps Script webhook (`functions/lead-webhook.gs`, logs to a Sheet and emails Caleb). On failure the form shows the phone number instead. Local previews skip the call.
- `site/scripts/dist.py` builds the launch bundle: pages, assets, only the media in use, `_redirects` (old LP paths and `/home-search` to the search subdomain), `_headers` (cache, security), `robots.txt`, `sitemap.xml`, `404.html`.
- Still open before launch: the Zachary placeholder card (reshoot or hide), the Search page IDX link (set after LP gives the subdomain), real reviews.

## Caleb's steps, in order (about 45 minutes, none of it needs code)

### 1. Lead webhook (10 min)
Follow `functions/README.md`: new Google Sheet, Apps Script, paste `lead-webhook.gs`, deploy as web app, copy the URL.

### 2. Cloudflare Pages (10 min, or one command)

Shortcut: `website-rebuild/site/scripts/deploy-cloudflare.sh` does the whole of this step by direct upload once `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `LEAD_WEBHOOK` are in the session environment. It creates the project, sets the variable, uploads the bundle with the lead function, and requests the custom domains. Re-run it to redeploy.

1. dash.cloudflare.com, the account that holds calebjackson.org. Workers & Pages, Create, Pages, Connect to Git, pick `calebjackson-reve/Caleb-s-Agents`.
2. Production branch: `main`. Root directory: `website-rebuild`. Build command: `python3 site/scripts/build.py && python3 site/scripts/dist.py dist`. Build output directory: `dist`. Functions are picked up from `website-rebuild/functions` automatically.
3. Environment variables (Production): `LEAD_WEBHOOK` = the Apps Script URL from step 1.
4. Save and deploy. First build gives a `*.pages.dev` address. Open it, run through every page, submit the contact form, check the Sheet and the email.

### 3. Luxury Presence (10 min if the in-app route works)
`LP-SUPPORT-DRAFT.md`, Route 1. Outcome needed: LP serving at `search.calebjackson.org` and the CNAME target it wants.

### 4. DNS in Cloudflare (5 min, the actual cutover)
In the zone for calebjackson.org, DNS, Records:
1. Add CNAME `search` → the LP target from step 3, proxy off (grey cloud) unless LP says otherwise. Wait until `https://search.calebjackson.org` loads the Home Search.
2. Pages project, Custom domains, add `calebjackson.org` and `www.calebjackson.org`. Cloudflare offers to create the records itself. Accept. That replaces the A record for the apex and the `www` CNAME that point at LP. This is the moment the new site goes live.
3. Leave MX, SPF, DKIM, the Google verification TXT and everything else alone.

### 5. After cutover (me)
I update the Search page and every "Find a home" button to `https://search.calebjackson.org`, push, Pages redeploys. Then: fresh load on desktop and phone, no console errors, hero video plays, each form delivers a test lead, Lighthouse, Google Search Console (the site verification TXT is already in DNS) and sitemap submit, license and brokerage line on every page.

## What breaks and how it's covered
- Old LP page URLs: `_redirects` sends `/about`, `/sell`, `/contact`, `/communities`, `/search` to the new pages and `/home-search` to the subdomain. Anything else lands on the 404 page, which is the home page.
- LP analytics and LP-hosted landing pages stop. The IDX, CRM, saved searches and lead routing continue on the subdomain.
- Rollback: in the Pages project remove the custom domains and put the two old records back (A `@` 104.16.160.240 proxied, CNAME `www` production.luxuryproxy.net). Five minutes.

## Cost
Cloudflare Pages free tier: unlimited bandwidth, 500 builds a month, functions 100,000 requests a day. Apps Script: free. Luxury Presence: unchanged. Total new cost: $0.
