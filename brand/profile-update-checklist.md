# Profile update checklist: make every bio and picture match

Built October 7, 2026. One headshot, one wordmark, one set of words, every surface. Assets are in `brand/profile-assets/`. Bio text is in `brand/profile-copy-kit.md`. Each surface needs Caleb's own login. Nothing here has been applied yet.

## The set

| File | Use |
|---|---|
| `avatar-1024.jpg` | Profile photo everywhere: Instagram, Facebook, LinkedIn, YouTube, Google Business Profile, Zoom, email. The seated headshot in the tan jacket. |
| `avatar-tight-1024.jpg` | Same photo, cropped closer. Use where the circle is small: Instagram, YouTube. |
| `avatar-monogram-1024.png` | The "aj." monogram. Favicon and app icon only, per the brand package. Not for social profiles, where a face wins. |
| `cover-facebook-1640x624.png` | Facebook page cover. Text sits inside the phone-safe center. |
| `cover-linkedin-1584x396.png` | LinkedIn banner. Left side is clear for the avatar overlap. |
| `cover-youtube-2560x1440.png` | YouTube channel art. Everything that matters sits inside the 1546 by 423 safe area. |
| `cover-google-business-1024x576.png` | Google Business Profile cover photo. |
| `ig-highlight-*.png` | Four Instagram highlight covers: Receipts, Answers, Places, Family. The four content pillars. |
| `contact-sheet.jpg` | Everything on one page for a quick look. |

The covers are generated from `gen.html` with Chromium, so a change to the receipts or the tagline is a one-line edit and a re-render, not a design job.

## Identity, identical on every surface

| Field | Value |
|---|---|
| Display name | Caleb Jackson |
| Title | REALTOR, Keller Williams First Choice |
| Handle | @calebjacksonla |
| Phone | (225) 747-0303 |
| Website | https://calebjackson.org/?utm_source=[platform]&utm_medium=social&utm_campaign=profile |
| Address, where shown | 37325 Market Place Drive (brokerage). The Google profile keeps its current address as is. |
| Service area line | Baton Rouge, Zachary, St. Francisville, New Roads and the Felicianas |
| Never | Rêve, @calebjackson_24, Commerce Centre Drive, any old brokerage logo |

## Order of work, about 45 minutes

1. **Instagram (@calebjacksonla).** Profile photo: `avatar-tight-1024.jpg`. Name field: Caleb Jackson, REALTOR. Bio: the 132-character Instagram bio from the copy kit. Link: the website with utm_source=instagram. Category: Real Estate Agent. Then add the four highlight covers to existing or new highlights named Receipts, Answers, Places, Family.
2. **Facebook page.** Profile photo: `avatar-1024.jpg`. Cover: `cover-facebook-1640x624.png`. Intro: the 165-character Facebook intro. About: the long bio. Username: calebjacksonla if available. Phone, website with utm_source=facebook, address, hours. Category: Real Estate Agent.
3. **LinkedIn.** Photo: `avatar-1024.jpg`. Banner: `cover-linkedin-1584x396.png`. Headline: the 196-character LinkedIn headline. About: the long bio. Current position: REALTOR at Keller Williams First Choice, Prairieville, with the brokerage as the company. Custom URL: linkedin.com/in/calebjacksonla if available. Website with utm_source=linkedin.
4. **YouTube.** Picture: `avatar-tight-1024.jpg`. Banner: `cover-youtube-2560x1440.png`. Channel name: Caleb Jackson. Handle: @calebjacksonla if available. Description: the 450-character YouTube description. Links: website with utm_source=youtube, Instagram, Facebook.
5. **Google Business Profile.** Logo: `avatar-1024.jpg`. Cover: `cover-google-business-1024x576.png`. Description: the 617-character description from the copy kit, plus the sponsoring broker's name and phone. Phone, hours, services, service areas per the Phase 0 sheet. Address stays as it is.
6. **Luxury Presence.** Hero and About page copy from the kit. Headshot on the About page from the current set. Footer: brokerage name, Market Place Drive, phone, @calebjacksonla.
7. **Email signature.** The plain-text signature from the copy kit. In Gmail: Settings, See all settings, Signature.
8. **Zoom, KW Command profile, Zillow, Realtor.com, Homes.com, theadvocate.com agent page.** Same photo, same title, same phone. The Advocate page still says Rêve per the October 6 research and needs a correction request.

## After the pass

- Open each profile logged out and confirm the photo, name, brokerage and handle match.
- Screenshot each one into the Drive brand folder as the record.
- Reconnect the Google Business Profile in Luxury Presence so its reporting stops reading blank.

## Can this be done from a command line instead?

Only partly, and for a one-time pass it is slower than pasting. The honest map:

| Surface | API path | Verdict |
|---|---|---|
| Facebook page | Graph API can update the about text, website, phone, profile picture and cover with a Page token that has pages_manage_metadata. Needs a Meta developer app and a token Caleb generates. | Possible. Setup takes longer than the paste. |
| Instagram | The Graph API has no endpoint to change a bio or profile photo. | Not possible. App only. |
| LinkedIn | Profile editing is closed to the public API. | Not possible. |
| YouTube | Data API can set the channel description and upload the banner with an OAuth client. The channel picture is tied to the Google account and is not exposed. | Partly. Needs an OAuth client. |
| Google Business Profile | The Business Profile API requires a separate access request Google reviews over days. | Not today. |
| Luxury Presence | No content API, per the October 6 audit. | Not possible. |
| Gmail signature | The Gmail API can set a send-as signature with an OAuth client. | Possible. Setup longer than the paste. |

Recommendation: do this pass by hand with the kit. If the receipts change quarterly and Caleb wants Facebook and YouTube to update themselves, a small script with his own tokens is worth building then, and it would never commit a token to this public repo.
