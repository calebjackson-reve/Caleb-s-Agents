# Site string sweep, all 39 sitemap pages, October 12, 2026 (observed)

All 39 non-property URLs from the sitemap returned HTTP 200 to a desktop Chrome user agent. Each page's HTML was searched for identity strings.

| String | Pages | Where |
|---|---|---|
| 37325 Market Pl (old office address) | 0 | Gone. The only raw hits were on /neighborhoods/santa-maria: "37325" is a fragment inside a listing-card ID and "Market Pl" is the Yelp business name "Clean Creations - Highland Park Market Place". Neither is the old office address. |
| 995709547 (Caleb's actual Louisiana license, also his MLS/Zillow agent ID) | 1 | /about, correct |
| 995709847 | 0 | nowhere. Correctly so: the LREC registry shows this number belongs to another licensee. The audit's Oct 8 "confirmed license" value was wrong. |
| linkedin.com/in/caleb-jackson-22b627270 (stale LinkedIn) | 1 | /about, twice (desktop and mobile social blocks) |
| linkedin.com/in/calebjacksonla (current LinkedIn) | 0 | nowhere |
| caleb-jackson-67113b341 (third LinkedIn) | 0 | nowhere |
| youtube.com | 38 | Only inside Luxury Presence's video-embed JavaScript. No YouTube profile link anywhere. |
| tiktok.com | 0 | nowhere |
| "Every client by referral" | 0 | nowhere |
| "Crystal Bonin", "Rêve", "caleb@crystalbonin", "calebjackson_24" | 0 | nowhere |
| 17111 Commerce Centre Drive | 38 | header/footer on every page except one (the home-search listings page, which has a different template) |
| Keller Williams First Choice | 5 | /about, /, /properties, /home-valuation, /home-search/listings. Not in the global footer. |
| JSON-LD (application/ld+json) | 8 | Only the 8 blog posts, as BlogPosting. No Person or RealEstateAgent markup on / or /about. |

Luxury Presence support (case thread "Website Address", completed October 12, 22:52 UTC) replaced the old address in Footer, Contact Overlay, About and Privacy Policy. The sweep confirms those four are clean.

Other page-level observations:
- /testimonials has the heading and tagline but zero testimonials.
- /video-gallery lists five "Featured Property Films" with thumbnails and no playable embed or YouTube link visible to a text fetch.
- /neighborhoods/st-francisville has roughly 100 words of authored prose. The rest is imported MLS, Census and Yelp data. No buyer or seller advice, no dated sources.
- About meta description: "Meet Caleb Jackson, a Baton Rouge-area REALTOR serving Zachary, St. Francisville, and New Roads." Baton Rouge is not named as a served market in that sentence.
- Home title: "Southern Louisiana Real Estate Agent | Caleb Jackson".
