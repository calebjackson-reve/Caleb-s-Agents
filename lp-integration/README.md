# Luxury Presence integration package

Prepared October 13, 2026 for calebjackson.org. Caleb chose: the architectural preview's paper, ink and coral, with the site's existing type (Instrument Serif headings, Nunito body), applied to the live Luxury Presence site and its Home Search. This folder is everything that can be prepared without LP access. Nothing here changes the live site until Caleb or LP support applies it.

## What is in this folder

| File | What it does | Where it goes |
| --- | --- | --- |
| `tokens.css` | Brand tokens plus overrides for LP's masterpiece template (buttons, headings, nav, footer, section surfaces), and the few motion-kit rules the site needs. The full kit stylesheet is deliberately not loaded because it resets the base font size. Read from the live markup on October 13, 2026. | Linked from the site head, after LP's own stylesheet |
| `lp-motion.js` | Loads GSAP, ScrollTrigger, SplitText and the motion kit from jsDelivr and applies heading rise, word sweep, fade-ups and the pixel button fill to LP's sections and buttons. No smooth scroll, cursor or loader. | Linked before `</body>` |
| `snippets.html` | The exact head and footer tags to paste or send. | Site Editor custom code, or an LP support case |

Both files are served from this repository's main branch through jsDelivr, so there is nothing to host.

## Step 1: global brand settings (Site Editor, no code)

1. Site Editor, global styles. Set the background color to `#FBF8F3`, primary text to `#14100E`, accent or button color to `#E87757`.
2. Keep the fonts as they are: Instrument Serif (primary) and Nunito (secondary). The live site already uses both.
3. Button style: choose the square or outlined variant if the template offers one. `tokens.css` removes rounded corners either way.

## Step 2: Home Search (IDX) branding (Site Editor, no code)

LP's Home Search is a separate app. It does not read the site's CSS, so this is done in its own settings. Per LP's training page (training.luxurypresence.com, "Customizing Your Home Search Tool Settings"), reached from the Websites tab, the Site Editor, or the three-dot menu under Site Settings:

1. Header branding: upload the wordmark logo, set header background to `#FBF8F3` and header text to `#14100E`. Hex codes are accepted.
2. Navigation tabs: match the site nav order: Search, Communities, Sell, About, Contact.
3. Lead contact form: Caleb's current portrait, name, (225) 747-0303, aire@calebjackson.org.
4. Custom listing badge: on, named "Caleb's listing" (check KW First Choice compliance wording first).
5. Default sort: Newest.
6. Save. The page notes changes do not apply until saved.

What LP's Home Search does not offer, per that page: font selection and custom CSS. The IDX will match on logo and colors, not on type or motion. That is the ceiling until LP exposes more.

## Step 3: the code

The live home page already contains custom-coded sections (class prefix `cj-`, with their own `<style>` and `<script>` blocks and an "Inject Section Specific Javascript" comment), so whoever built those used LP's custom HTML section editor. Use the same place:

1. Site Editor, open the first custom HTML section on each page (the `cj-experience` block on the home page). Paste the HEAD block from `snippets.html` at the top of its HTML and the FOOTER block at the bottom. Link and script tags work from inside the body.
2. If Site Settings offers a site-wide "Custom Code" or "Header/Footer Scripts" field, use that instead so every page gets it once.
3. Publish, then run the verification below.

The existing `cj-experience` block sets its headings to Arial with `!important`. `tokens.css` out-ranks that rule on purpose, per Caleb's October 13 decision for Instrument Serif. If the Arial rule was wanted somewhere specific, remove the two `html body .cj-experience h1/h2/h3` lines from `tokens.css` for that page.

If none of that is available, send one support case (one topic per email, as LP asked before):

Subject: "Add brand stylesheet and motion script to all pages"

> Please add the following to the head of every page on calebjackson.org, after the theme stylesheet:
> (paste the HEAD block from snippets.html)
> and the following before the closing body tag on every page:
> (paste the FOOTER block)
> These are hosted files; no change to page content is needed. Please leave Home Search, IDX, saved search and lead forms as they are.

## Step 4: verify on the live site

After it is applied, check each line on a fresh load of https://calebjackson.org/ in a desktop browser:

- Headings are Instrument Serif, sentence case, and rise into view line by line as you scroll.
- The first paragraph of each section sweeps word by word through coral into ink.
- Buttons are square with a hairline border and fill with the coral pixel dissolve on hover, then clear on leave.
- Background is paper (`#FBF8F3`), not pure white.
- No console errors, and the IDX at /home-search still loads, logs in and saves searches.
- On a phone: no horizontal scroll, headings readable, buttons tappable.
- With "Reduce motion" on in the OS: all text visible, no animation.

Log each as done in `audits/2026-10-12/verification.md` style: fresh fetch, timestamp, what was observed.

## What was tested before handing this over

`tokens.css` and `lp-motion.js` were injected into the live home page's HTML (fetched October 13, 2026) in headless Chromium at 1440 by 900, with the package files served exactly as the snippets reference them. Observed:

- Motion kit loaded, GSAP 3.13.0, 12 scroll triggers registered, 13 section groups and 92 reveal targets tagged.
- Headings computed to Instrument Serif, body background to `#FBF8F3`, 18 LP buttons picked up with 0 border radius and Nunito.
- Hovering a form submit button ran the coral pixel fill (`is-fill-active`, `is-fill-entered`) with ink text, matching the site's existing hover rule.
- Console errors were the same 8 to 12 pre-existing ones from LP's Google Maps and analytics loaders, present on the untouched page too. None came from this package.

That is a simulation of the live markup, not the live site. Step 4 is still required.

## Not in this package

- A rebuild of the GitHub Pages site. Caleb chose the LP package only.
- Smooth scroll, custom cursor and the loader. Not approved.
- IDX typography and motion. LP does not expose it.
