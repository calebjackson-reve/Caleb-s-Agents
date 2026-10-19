# Go-live plan for calebjackson.org

Written October 19, 2026 after Caleb said "push it live and integrate it with Luxury Presence." Nothing in this file has been executed on the live domain. The two things I cannot do from this session are change DNS and change Luxury Presence settings. Everything else is prepared.

## Stop: what should change before the public sees it

These are on the pages today. Going live with them is Caleb's call, but I recommend fixing the first three first.

| # | On the page now | Fix | Time |
| --- | --- | --- | --- |
| 1 | Review template on Home and About with "[Client name]" cards and a line saying nothing is a real review | Hide both sections until two or three clients approve their words (one attribute), or paste the real reviews in | 10 min, or when reviews arrive |
| 2 | "[median price] · as of [date]" on every Communities card and the neighborhood template | Pull the eight medians from the MLS with the date, or remove the line until they exist | 1 hour with MLS access |
| 3 | Forms (home value, text alerts, contact, booker, newsletter) show a done state and send nothing | Wire to a form service (Formspree free tier handles 50 a month, or Basin, or a Google Form endpoint) and a calendar (Calendly or Google appointment schedule) | 1 hour, needs an account Caleb creates |
| 4 | Zachary card is a text placeholder | Reshoot per MEDIA-PLAN.md, or hide the card | Half a morning |
| 5 | Search page says "Home Search loads here" and links to calebjackson.org | Point to the LP Home Search on its subdomain once LP moves it (step 3 below) | After LP |
| 6 | Listing and neighborhood templates are templates | Keep them unlinked from the nav until a real one exists (they are not in the sitemap) | None |

## Hosting: GitHub Pages from this repo (ready)

The repo is public, so Pages is free. A workflow is in `.github/workflows/deploy-site.yml`. It builds the pages, copies only the media the pages use, switches indexing on, and deploys. It runs when Caleb triggers it or when `website-rebuild/` changes on `main`.

Caleb does once:
1. Merge PR #37 (or whichever PR carries the workflow) into `main`.
2. GitHub, repo Settings, Pages, Source: "GitHub Actions".
3. Actions tab, "Deploy calebjackson.org", Run workflow. First deploy appears at `https://calebjackson-reve.github.io/Caleb-s-Agents/` within two minutes. The CNAME file in the bundle makes Pages expect `calebjackson.org`, so until DNS moves, use the github.io address to check it.
4. Settings, Pages, Custom domain: `calebjackson.org`, tick "Enforce HTTPS" once DNS has propagated.

Alternative with the same bundle: Cloudflare Pages or Netlify, connect the repo, build command `python3 website-rebuild/site/scripts/build.py && python3 website-rebuild/site/scripts/dist.py website-rebuild/dist`, publish directory `website-rebuild/dist`. Those two also give form handling, which Pages does not.

## DNS cutover (Caleb or whoever holds the registrar)

Tell me the registrar and I will write the exact screen-by-screen steps. The records, whichever registrar:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153, 8001::153, 8002::153, 8003::153 |
| CNAME | www | calebjackson-reve.github.io |
| CNAME | search | the hostname Luxury Presence gives for the Home Search (step 3) |

Keep every record Google Workspace needs (MX, SPF TXT, DKIM) exactly as they are. Lower the TTL to 300 a day before. Remove the current A or CNAME that points the apex at Luxury Presence at the moment of cutover, not before.

## Luxury Presence: keep the IDX, drop the site

LP has no API, so this is a support case and a settings change, per `lp-integration/README.md`.

1. Caleb or LP support: in LP, Websites, the site's domain settings, change the site's domain from `calebjackson.org` to a subdomain, `search.calebjackson.org`. LP then gives the CNAME target for that subdomain.
2. Support case, one topic: "Please keep our Home Search, saved searches, lead routing and CRM sync live at search.calebjackson.org after we move calebjackson.org to our own host. Please confirm the CNAME target for the subdomain and that SSL will be issued for it."
3. Once it resolves, I change the Search page embed and every "Find a home" button to `https://search.calebjackson.org`, and the text-alert form's note to say the saved search lives there.
4. Lead routing stays inside LP for IDX leads. Site form leads go wherever step 3 of the stop list points them.

What breaks on cutover day: LP's page analytics, any LP landing page URL people have bookmarked (the 404 page on the new site is the home page, and I can add redirects for `/about`, `/sell`, `/contact`, `/home-search` if the host supports them; Pages does not do server redirects, Cloudflare and Netlify do).

## After cutover, checks I run

Fresh load of https://calebjackson.org on desktop and phone: no console errors, hero video plays, forms deliver a test lead, search subdomain loads and saves a search, Lighthouse, Google Search Console verification and sitemap submit, license and brokerage line on every page.

## Decisions I need from Caleb

1. Fix items 1 to 3 in the stop list first, or launch with them as they are?
2. Host: GitHub Pages (free, no forms) or Cloudflare Pages / Netlify (free tier, forms included, needs an account)?
3. Registrar name and who has the login.
4. Who opens the LP support case, Caleb or me by drafting the email for him to send.
