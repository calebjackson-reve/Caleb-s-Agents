# Website rebuild command: three Awwwards references into one site

Written October 19, 2026 for calebjackson.org. Paste the block in section 3 into a fresh Claude Code session at the root of this repo. Read sections 1 and 2 first, they explain why the command is shaped the way it is.

## 1. Why one giant "make it identical" prompt fails

Three things go wrong when you ask AI to "replicate these three sites":

- The Awwwards links are showcase pages, not the sites. The agent has to find and open the live sites (Find Real Estate, Sobha Privy Collection, Zorge) and measure them in a real browser. If it only reads the Awwwards page it will guess.
- "Make it look like these" without numbers gives you a vague impression of the sites. The fidelity target here is that a visitor could not tell the rebuild's structure, pacing and motion apart from the references. That only happens when the agent measures every value (type scale, spacing rhythm, scroll choreography, easing curves, durations) and rebuilds from the measurements, with your media and copy in the slots. What cannot be copied: their photos, their copy, their logos, and fonts without a license. Everything else (layout, rhythm, motion, treatment) is fair to reproduce exactly.
- One prompt cannot teardown, synthesize, build and verify at once. Context fills up and the build drifts from the references. The command below runs in five stages with a file written at the end of each, so a fresh session can pick up any stage.

Two constraints from this repo that the agent must respect:

- This is a complete rebuild, not a restyle of the current site. Nothing from the live Luxury Presence design carries over. The build is a standalone site in this repo (like `architectural-preview/`, but every page). The live site stays untouched until Caleb decides how to replace it: LP only allows custom HTML sections and a linked stylesheet, and its Home Search cannot take custom CSS or fonts, so a rebuild at this level most likely means hosting the new site elsewhere and keeping LP's IDX as a linked search. The agent writes that decision up at the end; Caleb makes it.
- Headshots and listing photos are real photos. AI is for backgrounds, textures, renders of unbuilt things, and upscaling. `aire/STACK.md` says generated video is never used for listing photos and is disclosed as AI. Same rule for images. See `skills/ai-compliance-check/`.

## 2. What already exists so the agent does not rebuild it

| Asset | Path | Use |
| --- | --- | --- |
| Teardown method (Blueprint, Proof, Unknowns) | `skills/teardown/SKILL.md` | Stage 1 format |
| Motion kit (Lenis, GSAP, ScrollTrigger, reveals, sticky sequence, loader, cursor, marquee) | `motion-kit/` | Stage 3 base. Extend it, do not fork it |
| Prior motion teardown as a worked example | `motion-kit/TEARDOWN.md` | Shows the level of measurement expected |
| Current site tokens (paper, ink, coral, Instrument Serif, Nunito) | `lp-integration/tokens.css` | Reference only. The new design system is built from the three sites, not from this. Keep only what the references support |
| Standalone page that was built and verified before | `architectural-preview/` | Pattern for Stage 3 output and `verification.json` |
| Screenshot compare loop | `.claude/skills/cc-screenshot-loop-website-design/` | Stage 4 |
| Image and video generation (Higgsfield MCP, Kling) | `aire/STACK.md`, Higgsfield tools | Stage 5, only with approval |
| Compliance check for public copy | `skills/ai-compliance-check/` | Before any copy ships |

Media folders to point the agent at: `architectural-preview/assets/`, `aire/market-update/`, plus whatever folder Caleb drops his photo library into (set `MEDIA_DIR` in the command).

## 3. The command

`MEDIA_DIR` is `website-rebuild/media/`. Read `website-rebuild/media/MEDIA-LIBRARY.md` first, it ranks every file and says what slot it fits.

```text
Read CLAUDE.md, skills/teardown/SKILL.md, motion-kit/README.md, motion-kit/TEARDOWN.md, lp-integration/README.md and aire/STACK.md before doing anything.

Goal: a complete ground-up rebuild of calebjackson.org for Caleb Jackson, REALTOR with Keller Williams First Choice. Nothing from the current site's design carries over. The target is that the rebuild's structure, pacing, spacing, type rhythm and motion are not distinguishable from the three reference sites, with our own photos, copy, logo and licensed fonts in every slot. The references are the live sites behind these Awwwards entries:
1. https://www.awwwards.com/sites/find-real-estate
2. https://www.awwwards.com/sites/sobha-privy-collection
3. https://www.awwwards.com/sites/zorge-9
Find each live URL from the Awwwards page. If a site cannot be opened from this environment, say so and stop that site's teardown rather than guessing.

Work in five stages. Write the named file at the end of each stage before starting the next. Never move on with an unverified claim: label every finding as measured, read from source, inferred, or not verified.

STAGE 1, teardown each site into website-rebuild/teardown/<site>.md
Use a headless browser at 1440x900 and 390x844. For each site record, with numbers:
- Stack: builder, animation library, smooth scroll, fonts (names and where loaded), palette as hex, base font size.
- Page skeleton: every home page section in order with its height, and what each one does.
- Type scale: every heading and body size, line height, letter spacing, weight, case.
- Spacing rhythm: section padding, grid columns, gutters, max content width, image aspect ratios.
- Scroll choreography: for every scroll-driven effect, the trigger start and end, what property changes, duration, easing, stagger. Pull the real values from the site's code where possible.
- Hero: what loads first, the loader if any, and the first 3 seconds of motion.
- Image treatment: crop, overlay, grain, color grade, reveal style, hover behavior.
- Headshot and people photography: framing, lighting, background, how it sits in the layout.
- Navigation, cursor, page transitions, footer.
Save full-page screenshots and short screen recordings to website-rebuild/teardown/<site>/ as proof. Report under Blueprint, Proof, Unknowns per skills/teardown/SKILL.md.

STAGE 2, synthesize into website-rebuild/DESIGN-SYSTEM.md
From the three teardowns pick the single best version of each element and say which site it came from and why. Produce:
- Tokens: color, type scale, spacing scale, radii, borders, easing curves, durations. Take them from the measurements, not from lp-integration/tokens.css. Where the references use a paid font, name it and pick the closest licensed or Google font with a side-by-side screenshot.
- Component list with the motion each one gets, mapped to motion-kit modules that already exist and a list of modules that must be added.
- Page map for calebjackson.org: Home, Search, Communities (Baton Rouge area), Sell, About, Contact, one listing page template, one neighborhood page template.
- Media spec: for every image slot, the aspect ratio, minimum pixel size, treatment, and whether it comes from MEDIA_DIR, needs a reshoot, or is a candidate for AI generation. Headshots and listing photos are never AI generated. AI is only for backgrounds, textures, abstract renders and upscaling, and every AI image gets flagged for disclosure.
Stop here and show Caleb DESIGN-SYSTEM.md for approval before building.

STAGE 3, build in website-rebuild/site/
Static HTML, CSS and JS, no framework. Extend motion-kit/ with the new modules rather than forking it. Use real files from MEDIA_DIR and architectural-preview/assets/. Write copy in Caleb's voice (warm, direct, natural, no em dashes, no semicolons, no corporate polish) and run skills/ai-compliance-check on every page. Every market stat shows its source and date or does not appear. Build every page in the page map, same header, footer, type, spacing and motion on all of them. Keep Lighthouse performance above 85 on desktop and reduce motion for prefers-reduced-motion.

STAGE 4, verify against the references
Screenshot each built page at 1440x900 and 390x844 and place it beside the reference screenshot it is modeled on. For each section write what matches and what differs. The only accepted differences are our media, our copy, our logo and font substitutions. Fix everything else until the pairs are not distinguishable in structure, spacing and motion, and record scroll videos of both side by side. Record scroll videos of the home page. Write website-rebuild/site/verification.json with the screenshot paths, Lighthouse scores, console errors (must be zero), and the list of remaining differences. Open the real page in the browser and confirm every animation fires before reporting.

STAGE 5, media plan, no generation without approval
List every image slot still empty or weak after Stage 3. For each, write the Higgsfield prompt, model, reference image and cost, or the reshoot brief if it must be a real photo. Put the list in website-rebuild/MEDIA-PLAN.md and stop. Caleb approves what gets generated.

Then write website-rebuild/LAUNCH-OPTIONS.md: how to replace the live site with this build (hosting options, domain cutover, keeping LP's Home Search as a linked IDX, what breaks, cost), and the smaller fallback of injecting parts into LP. Do not change the live site.

Definition of done: all five stage files exist, every page in the page map opens with zero console errors, verification.json is filled in with real paths, and nothing has been posted, published, generated or paid for.
```

## 4. How to run it

1. The media folder is already in the repo at `website-rebuild/media/`.
2. Run the command in plan mode first so you can read the stage plan, then accept.
3. Stage 2 stops for your approval. Read `DESIGN-SYSTEM.md` and say what to change before Stage 3 starts, that is the cheapest place to steer.
4. Stage 5 stops again before any image is generated.
5. If the session compacts mid-build, start a new one with: "Read website-rebuild/COMMAND.md and continue from the first stage whose output file is missing or incomplete."

## 5. Unknowns

- Whether the three live sites can be opened from a cloud session. Some hosts block headless browsers. If blocked, run Stage 1 locally or feed the agent screen recordings and the sites' source.
- Whether Luxury Presence will accept the amount of custom code the build needs. `lp-integration/README.md` records what was possible on October 13, 2026.
- Whether the Mac Photos library holds better shots than the seven on Drive. Not reachable from a cloud session.
