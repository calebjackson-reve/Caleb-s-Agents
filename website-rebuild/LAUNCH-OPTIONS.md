# Launch options for the rebuild

Written October 19, 2026. The live site at calebjackson.org is on Luxury Presence (LP). Nothing here has been changed on the live site. Facts marked "from LP docs" come from training.luxurypresence.com as read October 13, 2026 (see `lp-integration/README.md`). Prices are not verified in this session and are marked as such.

## What the build is

Eight static HTML pages in `website-rebuild/site/`, two CSS files, one JS file, GSAP and Lenis from CDNs, Google Fonts, and media served from `website-rebuild/media/`. No build step beyond `python3 scripts/build.py`, no server code. It can be hosted anywhere that serves files.

## Option A: replace the site, keep LP's Home Search as a linked IDX (recommended)

1. Host the static build on Cloudflare Pages, Netlify or Vercel (all have a free tier for a site this size, not verified this session). Connect this repo, build command `python3 website-rebuild/site/scripts/build.py`, publish directory `website-rebuild`.
2. Move media next to the site before launch: copy `website-rebuild/media/` into the publish directory and change the `../media/` paths to `/media/`. Convert poster JPGs to 1200px webp and add `<link rel="preload">` for the hero poster. This is the Lighthouse performance fix.
3. Remove `<meta name="robots" content="noindex,nofollow">` from `_head.html` and rebuild. That alone takes Lighthouse SEO from 63 to 100.
4. Keep LP for the IDX only. Point the Search page's embed slot and every "Find a home" button at the LP Home Search URL (today `https://calebjackson.org/home-search`, which will move to a subdomain, for example `search.calebjackson.org`, set up in LP's domain settings). LP's Home Search accepts logo and colors but not fonts or CSS (from LP docs), so it will match on color only.
5. Domain cutover: at the registrar, point the apex and `www` to the new host, and add a CNAME for the search subdomain to LP. Lower the TTL a day before. Keep LP's SSL on the subdomain. Expect an hour of mixed resolution.
6. Redirects: map the old LP URLs to the new pages (`/about`, `/sell`, `/communities`, `/contact`, `/home-search` to the subdomain). Put them in the host's redirects file.
7. Form delivery: the contact form is not wired. Cheapest: the host's form handling (Netlify Forms or Cloudflare Workers to email) or a Formspree-style service. Must keep the STOP consent line and store consent with the lead.
8. Compliance check before go-live: `skills/ai-compliance-check/` on every page. License 995709547, brokerage name and Equal Housing are in the footer of every page now.

What breaks: LP's lead routing, saved searches and CRM sync keep working only inside the IDX subdomain. Any LP page-level analytics stop. Google Business and social links to old URLs rely on the redirects. Cost: hosting free to about $20 per month, LP plan stays (price per Caleb's contract, not verified).

## Option B: full LP, inject the new design into LP pages

Use the method in `lp-integration/README.md`: paste `tokens.css` and a trimmed `site.js` into LP's custom code slots. Gets the type, colors and the entrance animations onto LP's own sections. Does not get the pinned hero, the runway, the curved gallery or the page structure, because LP controls the markup. Cost: nothing new. Risk: LP template updates can override the injected CSS.

## Option C: host the build on Higgsfield's website hosting

Higgsfield's `create_website` and `deploy_website` tools exist in this session and can host static files. Not tested with this build, pricing not checked, and it would put the brand site on a tool account rather than infrastructure Caleb controls. Listed for completeness, not recommended.

## Before any of these

- Caleb approves the copy page by page (see the Stage 3 pages in `site/src/`).
- Decide the eight neighborhood photos per `MEDIA-PLAN.md`.
- Choose a host and tell me the registrar so I can write the exact DNS records.
- Nothing is cut over until Caleb says go.
