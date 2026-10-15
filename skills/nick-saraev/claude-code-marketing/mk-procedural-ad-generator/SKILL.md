---
name: mk-procedural-ad-generator
description: Builds a cheap, repeatable static-ad generator in Claude Code using Nick Saraev's compositing method: save winning ad formats as a template folder, have Claude rebuild them as HTML/CSS with a slider "tuner" page, lock the settings as JSON, then batch-generate 50+ copy/color/angle variants with a contact sheet and a pick-and-download picker. Use when Caleb says "make me listing ads", "I need 30 versions of this just-listed graphic", "open house ad variants", "turn my best-performing post into a template", "generate neighborhood ads for St. Francisville", or wants ad creative without paying per image.
---

# Procedural (compositing) ad generator

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapters 6 and 7 (https://www.youtube.com/watch?v=yulWjh3rq28&t=4523s and &t=6173s)

## What Nick teaches

The pipeline: **save high-performing ad formats as templates -> feed in a variable (niche, offer, angle) -> Claude generates niche x format, offer x format, angle x format combinations -> you review, pick, ship.** The human stays in the loop "all the way up until the end where taste matters." Only build this if **creative is the bottleneck** (lots of ideas and distribution, not enough output).

Claude has no built-in image generation. For simple ads, Nick has Claude write **HTML/CSS templates** rendered with cheap image tooling (he mentions ImageMagick-style processing and SVG filter pipelines) so a thousand variants cost nothing versus ~$2 per generated image on an AI model. Compositing gives roughly an **80% "okay" rate** (layout right, no weird elements) versus ~25% for direct image models.

### The build, as Nick did it
1. **Collect formats.** Facebook Ads Library -> search a brand (he used Stripe) -> open ad details -> zoom in -> screenshot each format -> save to a folder `ad formats for claude`. Note aspect ratios (one was taller, for mobile). Fill this with *your own* winners when you have them.
2. **Voice-dump the brief** with the folder and one screenshot attached: goal is a creative pipeline skill. Prompt back and forth first. Replicate these formats for his product (Maker School). Swap logos/brand. Same style, different header image. Then make it a repeatable engine for dozens or hundreds.
3. Answer Claude's questions: logo (typeset the wordmark), **niches** (people quitting 9 to 5, freelancers/agency owners adding AI, marketers, ex-corporate), **offers** (90-day guarantee, $21k bundle, "I'm in the community every day").
4. Claude breaks down the pattern (bright gradient, bold short benefit headline, tiny wordmark, single CTA, high contrast) and renders a first test PNG. Nick: "70% there."
5. **Ask for a tuner page**: "create me a web page with sliders to adjust font width, styles, placement, gradient angle, noise/grain, until the settings are exactly how I want. Then we save those and make them concrete, then spin hundreds." Claude opens it in its built-in browser. Controls that showed up: gradient angle and colors, noise/grain amount, grain size, seed, blend mode (overlay/soft light/multiply), radial vs linear, wordmark size, letter spacing, line height, content padding X, block gap, CTA as plain text or pill button, CTA text, 20 font candidates (he chose Red Hat Display, tight letter spacing).
6. **Export settings as JSON**, paste back: "apply these settings and generate 50 different ads with different CTAs and looks. I'll pick the best. Then turn this into an artifact / reusable resource so anyone on my team can generate at scale."
7. Claude writes a script that iterates the variants and produces a **contact sheet** with the angles listed ("Land your first AI client in 90 days or it's free", "Add AI services, get $21k in tools free", "I'm in your inbox every day until you land a client").
8. Feedback round: "vary the gradient angle, most look vertical. Add a quick way to select winners and download them." Result: a picker page, selected ads download to disk ready for Meta/Google upload.
9. **Skill**: Claude writes `skill.md` from the conversation: "Generate Stripe-style minimalistic ad creative with an organic gradient header and bold headline plus CTA for Maker School. Use whenever anyone asks to create ad creative, ad variants, ad copy with visuals, or run a creative pipeline or ad batch." Tested in a fresh chat on a different product ("Gen 10 ads for Clarvo, research clarvo.io, send me a contact sheet") and it worked.
10. **Loop** at 5:59 a.m. (batch 20, fresh copy each run, local output) and **routine** to a shared Google Drive folder with dated subfolders (see `mk-prompt-skill-loop-routine-ladder`).

Design notes Nick made while tuning: make everything bigger ("one of the biggest problems with ads is people can't see them on their phones"). Add grain for finesse. Pick a font that doesn't bleed into the "default Inter" look. Vary angle so the batch doesn't look uniform.

## Step by step

1. Make `ad-formats/` with 2 to 5 screenshots of proven formats (Caleb's own top posts first, then Ads Library examples from top real estate brands or local competitors).
2. New chat, attach the folder plus one screenshot, voice-dump: product/service, audience segments, offers/hooks, brand constraints (KW First Choice colors, logo rules, Equal Housing logo if required, license disclosure).
3. Iterate on the first render until ~70% right, then request the tuner page.
4. Tune: size up text, pick a font, set gradient/grain, set CTA. Export JSON.
5. Ask for 50 variants + contact sheet + picker with download. Review, pick, download.
6. Consolidate into a skill with the JSON profile and the scripts embedded. Test in a fresh chat with a different listing.
7. Optionally loop/routine it to Drive for a morning review.

## Templates / prompts

Opening brief (voice-dump style, adapt):
```
Goal: build a creative pipeline skill. Before the skill, we prompt back and forth to get outputs I like.
In the attached folder "ad-formats" are {{n}} ad screenshots whose layout I want to replicate.
Product: {{e.g. a new listing at 123 Oak St, St. Francisville, 4 bed / 3 bath, $425k, 2 acres}}.
Audiences: {{e.g. Baton Rouge families moving out for land, retirees, LSU-area investors}}.
Offers / angles: {{e.g. open house Sat 1-3, free home valuation, new-to-market}}.
Brand: Caleb Jackson, REALTOR, Keller Williams First Choice. Use my wordmark, KW red/black/white,
no Stripe or other brand logos. Replace the header art, keep the layout.
Start with a single test render, then we tune, then we scale to 50+ variants.
```

Tuner request:
```
Build me a local web page with sliders and controls for: headline font (give 20 clean modern
options), size, letter spacing, line height, padding, block gap, wordmark size, gradient colors
and angle, grain amount/size/blend, CTA style (text or pill) and text. Include an "Export JSON"
button so I can paste the settings back to you.
```

Batch request:
```
Apply this settings JSON: {{paste}}. Generate 50 variants: rotate headlines across these angles
{{list}}, vary gradient angle and palette, vary CTA text. Output PNGs to ./out/{{date}}/, plus a
contact sheet HTML with checkboxes and a "download selected" button.
```

Skill description Claude should write:
```
Generate {{style}} static ad creative (header art + bold headline + CTA) for {{brand}}.
Use whenever asked for ad creative, ad variants, listing graphics, or an ad batch.
```

## Pitfalls Nick calls out

- "Make me great ads" with no process produces a wild goose chase. Bring the process.
- Don't scoop other brands' logos. Scoop structure, then use your own winners.
- Procedural output has a ceiling. When variety matters more than cost, move to `mk-ai-image-ad-templates`.
- Batches that don't vary angle/palette look identical. Say so explicitly.
- Review before publishing. The system takes shots, you pick.

## How Caleb should use this

- Templates worth building: Just Listed, Just Sold, Open House, Price Improvement, Coming Soon, Monthly market stat, Testimonial quote, Free valuation CTA. Each is one JSON profile.
- Feed the skill a listing's MLS facts and 6 to 10 photos. It drops the hero photo into the header zone and spins 30 headline variants. Caleb picks 3 per listing for Facebook/Instagram and prints.
- Local-flavor angles: "15 minutes to downtown St. Francisville," "Zachary schools," "acreage under $400k," "Baton Rouge commute without the traffic."
- Route output to a Drive folder shared with a transaction coordinator or marketing helper. Publishing any ad or post **needs Caleb's approval before running**, and must respect KW/MLS advertising rules (brokerage name, fair housing).
- This costs tokens only, so run large batches freely.

## Verification

- A test render matches the template layout at ~70% on first pass and ~90% after tuning.
- JSON export reproduces the same look when re-applied.
- 50 PNGs exist with visibly different headlines, angles and colors. The picker downloads the selected ones.
- The skill runs from a fresh chat on a different listing with no extra instructions.
