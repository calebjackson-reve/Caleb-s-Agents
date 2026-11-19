# LP support cases from the 2026-10-29 SEO audit

Three cases, one topic each, per LP's earlier ask. Evidence for every item is in `audits/2026-10-29/seo-audit.md` (live fetches, 2026-10-29). Drafts only. Caleb sends them.

`lp-integration/lp-fixes.js` already patches items in cases 1 and 3 client-side once the snippet is applied, but server-side fixes are still the real answer: a 301 passes link equity and works for crawlers that skip JavaScript, and the IDX accepts no custom code at all.

## Case 1: two redirects and the links that point at them

To: support@luxurypresence.com
Subject: Add two 301 redirects on calebjackson.org

> Hi team,
>
> Two paths on calebjackson.org return 404 but are still linked from our own page templates:
>
> - /profile (linked from the footer or byline area on roughly every page) should 301 to /about
> - /contact-us (linked from property detail pages) should 301 to /contact
>
> Please add both redirects, and if the links live in a template you manage, point them at /about and /contact directly.
>
> Caleb Jackson, Keller Williams First Choice, (225) 747-0303

## Case 2: Home Search (IDX) templates

To: support@luxurypresence.com
Subject: Home Search area pages show a stray district number in titles

> Hi team,
>
> On our Home Search area pages the URL's district segment leaks into the page copy. Example, fetched October 29, 2026:
>
> https://calebjackson.org/home-search/listings/v2/la/1/port-hudson
> Title and H1 read "Port Hudson, 1 Real Estate & Homes for Sale". The ", 1" is the /la/1/ path segment and appears across these pages.
>
> While you're in those templates, two related asks for the same product:
> 1. Listing detail pages use the price as the H1 (for example "$449,000"). The address would serve visitors and search better, with the price next to it.
> 2. The Home Search pages carry no structured data. The main site has a rich schema stack, but /home-search/ pages have none. BreadcrumbList on area pages and RealEstateListing on detail pages would be the ask.
>
> Happy to split items 1 and 2 into their own cases if that's easier.
>
> Caleb Jackson, Keller Williams First Choice, (225) 747-0303

## Case 3: page weight on the main site

This one is partly ours. The measurements (2026-10-29): every main page is 2.8 to 3.4 MB of HTML. On the homepage that is about 2.24 MB of images inlined as base64 data URIs and 2.76 MB of inline JavaScript, 1.57 MB of it the custom `__cjArchitectureMounted` script pasted into a custom section.

What to do, in order:
1. Ours, no LP needed: move the base64 images in the custom sections to hosted files (the repo already serves assets via jsDelivr, see `architectural-preview/assets/`), and move the inline architecture script to a repo file loaded with `defer` the way `lp-motion.js` is. Whoever edits the custom sections next should do this; it is the single biggest speed lever on the site.
2. LP case, only if base64 images remain after step 1 in LP-managed sections:

To: support@luxurypresence.com
Subject: Images inlined as base64 in page HTML

> Hi team,
>
> Pages on calebjackson.org embed images as base64 data URIs inside the HTML, which makes every page roughly 3 MB before any asset loads. Where these sit in sections you manage, please serve them as normal image files instead.
>
> Caleb Jackson, Keller Williams First Choice, (225) 747-0303
