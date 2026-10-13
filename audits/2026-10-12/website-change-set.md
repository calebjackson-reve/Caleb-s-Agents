> October12 authoritative correction: Official LREC verifies Caleb J. Jackson SALE.995709547-ACT, Active, expiration12/31/2027. Earlier supplied995709847 belongs to another licensee. Prior license-versus-MLS-ID diagnosis is retracted; use995709547 for public license and preserve existing MLS ID. New execution receipt records current results.

# Website change set for calebjackson.org (Luxury Presence)

Caleb applies these in the Luxury Presence dashboard (or emails support@luxurypresence.com as a new case, one request per email, as they asked). I verify each live page afterward and log it in verification.md. Observed state is from a full fetch of all 39 sitemap pages on October 12, 2026.

## Already done, confirmed live
- Old office address 37325 Market Pl Dr: gone from every page. Luxury Presence case "Website Address" completed October 12 (Footer, Contact Overlay, About, Privacy Policy). Nothing left to do.
- Phone (225) 747-0303 and email aire@calebjackson.org: consistent on every page.

## A. About page (https://calebjackson.org/about)

| # | Element | Now (observed) | Change to |
|---|---|---|---|
| A1 | Contact block, "License Number" | #995709547 | No change. 995709547 is the correct Louisiana license per the LREC registry (SALE.995709547-ACT). The earlier instruction to use 995709847 was wrong and is withdrawn. |
| A2 | Social icons, LinkedIn (appears twice: desktop and mobile blocks) | https://www.linkedin.com/in/caleb-jackson-22b627270/ | https://www.linkedin.com/in/calebjacksonla/ |
| A3 | Social icons | Facebook, Instagram, LinkedIn | add YouTube https://www.youtube.com/@calebjacksonla and TikTok https://www.tiktok.com/@calebjacksonla |
| A4 | Meta description | "Meet Caleb Jackson, a Baton Rouge-area REALTOR serving Zachary, St. Francisville, and New Roads." | "Meet Caleb Jackson, REALTOR with Keller Williams First Choice, serving St. Francisville, Baton Rouge, Zachary, New Roads and the Felicianas." |
| A5 | Bio paragraph "Born and raised in Baton Rouge, I've built my business across Zachary, St. Francisville, New Roads, and the Felicianas." | as quoted | "Born and raised in Baton Rouge, I've built my business across St. Francisville, Baton Rouge, Zachary, New Roads and the Felicianas." (same sentence appears on /testimonials, /neighborhoods pages and the home page "It Isn't Marketing" block; it is one shared block in LP, change it once) |
| A6 | Production proof | none on page | add one line under the bio: "81 closed deals and $25.1M in volume since 2022, as of October 2026." |

The license number and the MLS/Zillow agent ID are the same number, 995709547. Luxury Presence MLS ID B24140 stays untouched.

## B. Global footer and contact overlay (every page)

| # | Element | Now | Change to |
|---|---|---|---|
| B1 | Social icons | Facebook (caleb.jackson.142), Instagram, Zillow | keep those, add YouTube, LinkedIn (/in/calebjacksonla/), TikTok |
| B2 | Brokerage line | "Keller Williams First Choice" appears on 5 pages, not in the footer | add "Caleb Jackson, REALTOR · Keller Williams First Choice · Licensed in Louisiana #995709547" to the footer |

## C. Home page

| # | Element | Now | Change to |
|---|---|---|---|
| C1 | Title tag | "Southern Louisiana Real Estate Agent \| Caleb Jackson" | "St. Francisville and Baton Rouge REALTOR \| Caleb Jackson, Keller Williams First Choice" |
| C2 | Meta description | "...helps buyers and sellers move with urgency across Baton Rouge and beyond." | "Caleb Jackson, REALTOR with Keller Williams First Choice, helps buyers and sellers in St. Francisville, Baton Rouge, Zachary and the Felicianas. No paid leads, just service. (225) 747-0303." |
| C3 | Hero or intro copy | not market-specific | one sentence naming St. Francisville and Baton Rouge as the markets he works most |

## D. Pages with content gaps

| # | Page | Now | Change |
|---|---|---|---|
| D1 | /testimonials | heading and tagline, zero testimonials | Either add real client quotes with permission (name, city, year) or unpublish until there are some. An empty testimonials page is a trust problem on a branded search. |
| D2 | /video-gallery | five "Featured Property Films" with thumbnails, no playable embed found by a text fetch | Confirm each film is actually embedded (LP uses a YouTube/Vimeo lightbox). If the videos live on @calebjacksonla, use those YouTube URLs so the channel gets the views. Add a "Watch on YouTube" link to the channel. |
| D3 | /neighborhoods/st-francisville | about 100 authored words | Upgrade per content-briefs/st-francisville-buyer-seller-guide.md |
| D4 | new /baton-rouge-real-estate | does not exist | Build per content-briefs/baton-rouge-buyer-seller-guide.md and add to nav |
| D5 | /neighborhoods/false-river-waterfront, /neighborhoods/zachary-golf | imported data | Upgrade per briefs, after D3 and D4 |
| D6 | llms.txt | "referral-driven service", "client-referral-driven business approach", leads with Greater Baton Rouge | Ask LP how llms.txt is generated. If it is editable, replace referral wording with "No paid leads, just service." and name St. Francisville and Baton Rouge first. If auto-generated from page copy, A5 and D1 fix it on the next regeneration. |

## E. Structured data

| # | Now | Change |
|---|---|---|
| E1 | JSON-LD only on the 8 blog posts (BlogPosting). None on / or /about. | Ask LP support: "Please add RealEstateAgent JSON-LD to the home page and About page with these values." Then paste the block below. Validate at https://search.google.com/test/rich-results and https://validator.schema.org before marking done. |

```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Caleb Jackson",
  "alternateName": "Keller Williams First Choice -Caleb Jackson",
  "url": "https://calebjackson.org/",
  "telephone": "+1-225-747-0303",
  "email": "aire@calebjackson.org",
  "image": "https://calebjackson.org/<current-portrait-path>",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "17111 Commerce Centre Drive",
    "addressLocality": "Prairieville",
    "addressRegion": "LA",
    "postalCode": "70769",
    "addressCountry": "US"
  },
  "areaServed": [
    {"@type": "City", "name": "St. Francisville, LA"},
    {"@type": "City", "name": "Baton Rouge, LA"},
    {"@type": "City", "name": "Zachary, LA"},
    {"@type": "City", "name": "New Roads, LA"},
    {"@type": "City", "name": "Prairieville, LA"}
  ],
  "memberOf": {"@type": "Organization", "name": "Keller Williams First Choice"},
  "identifier": {"@type": "PropertyValue", "propertyID": "Louisiana Real Estate License", "value": "995709547"},
  "sameAs": [
    "https://www.instagram.com/calebjacksonla/",
    "https://www.linkedin.com/in/calebjacksonla/",
    "https://www.youtube.com/@calebjacksonla",
    "https://www.tiktok.com/@calebjacksonla",
    "https://www.facebook.com/CalebJacksonKaizenHomes/",
    "https://www.zillow.com/profile/CalebCBR",
    "https://maps.google.com/maps?cid=17113183507740077585"
  ]
}
```

Replace the image path with the real portrait URL before sending. Do not add aggregateRating or review markup; there are no on-site reviews, and Google penalizes self-serving review markup.

## Email to Luxury Presence (one case per topic, as they requested)

Case 1 subject: "About page: license number and LinkedIn link"
> Please leave the About page License Number as #995709547. Please change both LinkedIn social links on the About page from https://www.linkedin.com/in/caleb-jackson-22b627270/ to https://www.linkedin.com/in/calebjacksonla/. Please leave any MLS or IDX agent ID fields as they are.

Case 2 subject: "Add YouTube, LinkedIn and TikTok to social icons site-wide"
> Please add these to the social icons in the footer, contact overlay and About page: YouTube https://www.youtube.com/@calebjacksonla, LinkedIn https://www.linkedin.com/in/calebjacksonla/, TikTok https://www.tiktok.com/@calebjacksonla.

Case 3 subject: "RealEstateAgent schema on home and About"
> Please add the attached JSON-LD to the home page and About page, or tell me where I can add it myself.

## Acceptance
Each row is done when a fresh fetch of the live page shows the new value, logged in verification.md with the timestamp.
