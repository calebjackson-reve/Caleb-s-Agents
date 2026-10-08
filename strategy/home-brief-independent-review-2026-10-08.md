# Louisiana Home Brief, black and coral revision: independent review

Reviewed October 8, 2026 by the cloud session, against Caleb's seven requirements of October 7. Build reviewed: `homebrief-blackcoral` as uploaded to Drive by the Mac session (ten 4 MB parts, rejoined to 40,855,401 bytes, zip test clean). Nothing was published, submitted, bought or connected. The Mac session's own QA reports 402 checks passed and none failed. I did not rerun those. I ran my own checks and list exactly what they covered.

## What I ran

- All 16 pages served locally and loaded in headless Chromium at 1440 wide, 390 wide, and 390 wide with reduced motion. 48 page loads.
- Static scan of every HTML, CSS and JS file for banned identity strings, green colors, contact links and network calls.
- Click-through of the payment calculator, the seller net sheet and the Showing Game Plan at phone width, with no contact details entered.

## Result against the seven requirements

| # | Requirement | Verified result |
|---|---|---|
| 1 | Black, white and coral, no green | Pass. Zero green found in CSS or in computed styles on all 48 loads. Coral #E87757 buttons with black text. Real property photos keep natural color. |
| 2 | Free tools usable with no email, phone or signup, answer first | Partly. No contact field is visible on any page at load and no tool asks for contact. But both calculators open blank. See finding 1. |
| 3 | Understandable to a newcomer | Mostly pass. Each tool opens with a plain question as its heading and a "free, no contact details required" label. Worked examples exist. No page uses a labeled "when to use this" section, so the why-it-matters step is implied, not stated. |
| 4 | Less typing | Pass. Price list runs $75,000 to $1,000,000 in steps with an "Enter my own" option. Down payment, rate, term, taxes, insurance, flood and HOA are all presets with custom entry. No sliders, which is fine. No address search was added, which is correct since no verified data source is connected. |
| 5 | Text Caleb primary, Call secondary, 225-747-0303 | Pass. The first visible contact link is Text on all 48 loads. 127 sms links and 138 tel links, all +12257470303. Nothing sends automatically. No non-GET request fired on any page or flow. |
| 6 | Real footage, purposeful motion, mobile and reduced-motion fallbacks | Partly verified. Poster images and a Play video control show on mobile. Reduced motion left every page usable. The video files are not in the zip, so playback was not tested. See finding 3. |
| 7 | Sample Showing Game Plan before contact, Cost, Water, Condition, Offer explorable, equal seller experience | Pass. The sample opens in a dialog with no email field on the page. All four tabs show their own panels, Water first. Escape closes it. The email form appears only after the explicit "Email me a Showing Game Plan" request, with phone optional, consent unchecked and the honeypot empty. The seller net sheet mirrors the payment tool. |

Identity checks passed: 17111 Commerce Centre Drive appears on the pages, "81 deals and $25.1M in sales since 2022" appears with the user-confirmed wording, and no page shows the Market Place address, 90+ families, $24.5M or Rêve. The old 90+ and $24.5M text exists only in a scraped copy of the current site (`data/native-inventory.json`) that the build reads as a source. It is not in any page or in the Luxury Presence markup.

I checked the payment math by hand. The example of $300,000 with 20% down at 6.5% over 30 years gives $1,516.97 a month for principal and interest, and the page shows $1,516.96. The seller example subtracts the payoff correctly.

## Prioritized findings

1. **Answer-first gap on both calculators.** On load the payment tool shows "Choose your rate" and the seller tool shows "Enter your payoff." Pressing the main button returns a list of "not entered" inputs and a red message, with no number. A number only appears after "Try an example" or after the visitor picks a rate or payoff. This is honest, and the build says plainly that no rate is assumed. It also means a first-time visitor sees an error before an answer. Recommendation: render the labeled example result on load so a number is on screen immediately, then let visitors change inputs. The build's own handoff notes already describe an option for this (an initial illustrative estimate), so the change is small.
2. **Native Luxury Presence release blockers.** The Mac session wrote these up itself and I agree with all six: the homepage and AI form still require a phone number in the native builder while the new design makes phone optional, the valuation email route has no real form behind it, the IDX search pages are outside the new header and footer, the existing flood widget has no reserved slot, Google Maps reported key errors on several public pages that were not traced to the new code, and the account-level rollback is untested. Publishing stays paused until these are cleared. A fresh authenticated snapshot of the current head and body scripts is required before any save, because a native body save goes public instantly.
3. **Video and image dependencies.** The zip was built without video, so the home page requests `assets/home-background.mp4` and gets a 404, and the hero falls back to its poster. Several pages also load photos from Luxury Presence's media host. That host is blocked inside this cloud container, so those images could not be checked here. They load on the Mac. Confirm the release bundle carries the films and that the image host is an accepted dependency.
4. **Flood tool is a third-party embed.** The release body loads the flood explainer in an iframe from an outside Netlify address. It works today, but it is a dependency Caleb does not host. Decide whether to host it with the site.
5. **The AI assistant and chat box are not built.** Property AI is local and off by design, and no chat interface appears on any page. That is the right call until a secure server, provider and verified data are chosen. When it is built, it should answer only from the site's own tools, pages and Caleb's bio, cite sources, and say "I don't know, text Caleb" otherwise. It must not promise to answer every property question.
6. **Value beyond real estate is absent.** No golf course guide or other local explorer exists yet. The neighborhood page is a home comparison checklist, deliberately without rankings. Golf courses, schools, drive times and local resources would each need named public sources with dates. This is the largest gap against Caleb's goal of being the best site to explore.
7. **Small items.** The "Release preview, not published" banner must come off at launch. The why-it-matters line could be made explicit on each tool.

## Works, illustrative, and still needs integration

**Works end to end in the local preview:** the black, white and coral design, ungated tools, Text-first contact on every page, the sample Showing Game Plan, the email-on-request form behavior, the dated market report source, and the identity and figures.

**Illustrative:** every calculator input and result (fictional editable examples, never rate, tax, insurance or commission quotes), the sample Showing Game Plan content, and the contact forms, which do not send anything in this preview.

**Still needs integration:** the six native release blockers above, video delivery, a decision on the flood embed, a verified address search source if one is wanted, the property assistant backend, and any golf or local explorer content.

## What I could not verify

Playback of the films, images hosted on the Luxury Presence media host, any behavior inside the live Luxury Presence builder, real phone hardware, and the Mac session's 402 checks, which I did not rerun.
