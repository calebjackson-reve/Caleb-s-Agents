# The builders page for calebjackson.org, in 3D

"See it before it's built." A scroll story built with three.js for builders and new construction. A front elevation drawing of Basil Lane turns into a paper model, the light goes from day to dusk, the model gives way to the real twilight photo, then it becomes a blueprint that comes apart with the parts named. At the end the visitor can turn the house themselves.

Caleb approved this as the builders page on November 12, 2026 ("yes for builders page"). Basil Lane is the worked example: a finished, sold home shown the way a builder's plan would be shown.

Built November 12, 2026. Prototype for Caleb's review. Nothing here is published.

## Status

| Item | State |
| --- | --- |
| Page | Built, runs locally, checked on desktop and phone sizes |
| Published | No. `noindex,nofollow` is on. The deploy workflow does not pick this folder up |
| Caleb's approval | Pending. See "Needs Caleb's yes" below |
| Linked from the live site | No |
| 3D judge | Three blind rounds on November 12, 2026: 6.3, 7.1, 7.4 out of 10. Target was 9.5. Stopped at Caleb's request. Cards in `judge/3d-scorecards.md` |
| Private review link | https://claude.ai/artifact/Fg9nKQXn7Lruwt5KEUQMMd (only Caleb can open it). Version 5, the round 3 build plus the round 3 fixes. A bundled copy of this folder: one script file, Google Fonts, buttons pointing at home.calebjackson.org, plus a "Time this page" button |

## How to look at it

From `website-rebuild/`:

```bash
python3 -m http.server 8787
```

Then open `http://localhost:8787/3d/index.html`. It has to be served, a double-clicked file will not load the 3D.

Walkthrough video and screenshots from the build session are in `verification/`.

## The story, top to bottom

| Chapter | What the visitor sees | What it says |
| --- | --- | --- |
| The line | Ink elevation of Basil Lane on ivory paper | See it before it's built. So your buyers can too |
| The plan | The drawing turns in space and fills in from the ground up behind a thin ember line | A plan is hard to fall for. A house isn't |
| 01 Price it | The camera walks up to the porch, soft focus behind | Priced before it's poured |
| 02 Show it | Day turns to dusk, the windows and porch lights come on | Launched like it's already standing |
| The photo | The real twilight photo rises over the model, lined up on the porch | And when it's built. This is the real one. Basil Lane, St. Francisville. Sold |
| 03 Know it | Blueprint lines on ink. Roofs lift, dormers lift, posts slide out, parts are named | Every part, named |
| The house | The model back together in daylight, with a button into the explore mode | Now hand them the house |
| Photos | Eight listing photos in a sideways strip | Then the photos take over |
| Numbers and steps | 81 closed deals, $25.1M, 8 areas, each with its source and date. Then three steps: send the plan, see the model, launch it | The work, in numbers |
| Close | Drone footage of the estate | When it's time to move, we move |

Explore mode: drag to turn, scroll or pinch to zoom, four looks (Drawing, Day, Dusk, Blueprint), a "Take it apart" slider, four set views, and seven pins that open the real listing photo for that spot.

## What is real and what is drawn

- The 3D house and grounds are a computer-made study, built in code from the listing photos, the aerial footage and the elevation drawing in `architectural-preview/`. It shows the outside only. It is not a floor plan and not to scale. The page says so in the hero and in the footer.
- Every photograph and the drone clip come from `../media/` and are listed in `../media/MEDIA-LIBRARY.md`.
- No AI image, video or 3D generation was used for this page. Nothing was paid for.
- Look: a paper model on an ivory base, not a full color render. Caleb asked for luxury and not cartoonish (November 12, 2026). Green grass and blue sky made it read like a game, so the real photos carry the realism instead.
- One palette: after the first review Caleb said going from one color to another felt off (November 12, 2026). The model now stays in the tones of the drawing with the ink lines left on, and the only moves are ivory to ink. The earlier look with a charcoal roof and cedar is still in `materials.js` as the `material` palette.

## Caleb's notes from the first review (November 12, 2026)

- Likes the architectural feel and the flow.
- The color changes felt off. Fixed, see "One palette" above.
- "There needs to be a page for it, and there needs to be a reason for it." Open. My recommendation is in the chat of that date: make it the builders and new construction page, with a short teaser on the home page.
- Wants to try a real floor plan turned into a 3D layout. Needs a plan with dimensions. Not started.

## Needs Caleb's yes

1. **The builder copy, line by line.** The page is approved as the builders page. The words are my draft. The service claims to confirm: you turn a plan into a 3D house buyers can walk around, you price a plan against real comps before it's built, and you launch new construction with twilight views, drone and film.
2. **The 32-unit line.** "I sold a 32-unit property in St. Francisville." It has no year on the page. Give the year, or say to leave it.
3. **Basil Lane as the example.** A sold home, shown in 3D, on a page aimed at builders. Confirm you're fine using it this way.
4. **The address.** I'd put it at `/builders`. Nothing is wired until you say so.
5. **The home page teaser.** A short version of the drawing turning into the model, linking here. That means editing `../site/`, which publishes on merge, so it waits for a separate yes.
6. **One fallback line (added November 12, 2026).** On a browser that can't draw 3D, the last chapter says: "This browser can't draw the 3D model. The photos just below are the real house." It replaces a line that promised controls the visitor could not see.

## Next: a real floor plan in 3D

Caleb wants a real floor plan turned into a 3D layout: roof off, walls standing, rooms you can tap. It needs a plan with dimensions (a builder's plan set, an appraiser's sketch or an MLS floor plan). No plan has been supplied yet, so nothing is built. Basil Lane's inside is not modelled because its floor plan is not known.

## Compliance check (skills/ai-compliance-check), November 12, 2026

Compliance: PASS, with two flags for Caleb. Re-run on the builder copy the same day.

- Identity: Caleb Jackson, REALTOR, Keller Williams First Choice, 17111 Commerce Centre Drive, Prairieville, LA 70769, license 995709547, (225) 747-0303 and aire@calebjackson.org are on the page. Equal Housing Opportunity is in the footer. No Rêve.
- Guarantees: none on price, value or timing.
- Fair housing: copy describes the house and the work, not people.
- Production numbers: 81 deals and $25.1M show "Production records, as of October 7, 2026". "8 areas" shows "Brand package, July 2026".
- Flag 1: the 32-unit line has no date. Unknown whether one past sale needs one, ask the broker or add the year.
- Flag 2: the builder copy is all new service claims. It says "I'm not an architect" on purpose so nothing reads as design services. Nothing promises a sale, a price or a timeline. Needs Caleb's yes on each claim.
- Texting: text links only open the visitor's own messages app. No form, no automated texts.
- AI disclosure: the 3D study is labeled as a computer-made illustration in the hero and the footer. Listing photos are shown as shot.
- Sold status: Basil Lane is shown as sold with the brokerage line.

## How it is built

No build step. Plain files, ES modules, an import map.

| File | What it does |
| --- | --- |
| `index.html` | The page, all copy, the explore mode markup |
| `assets/page.css` | Styling. Tokens follow `../DESIGN-SYSTEM.md` |
| `assets/js/app.js` | Scroll to keyframes, the photo reveal, part names, explore mode, loader |
| `assets/js/stage.js` | Renderer, studio light, the drawing pass, soft shading, shallow focus |
| `assets/js/house.js` | The house, in metres, in named parts that can come apart |
| `assets/js/grounds.js` | Base, walk, drive, pool terrace, barn, pond, gazebo, trees |
| `assets/js/materials.js` | Materials and textures, painted in code |
| `assets/js/kit.js` | Geometry helpers |
| `assets/js/match.js` | The camera that lines the model up with the twilight photo. Written by the photo fit, not by hand |
| `assets/js/perf.js` | The frame timer. See "Timing it on a real machine" |
| `dev.html` | A bare stage for checking one view, for example `dev.html?az=-30&el=10&dist=50&fov=26&build=1` |
| `vendor/` | three.js r169 (MIT), Lenis 1.3.4 (MIT), each with its licence file |
| `assets/fonts/` | Instrument Serif and Instrument Sans (SIL OFL), with licence files |

Useful switches on the address: `?perf=1` runs the frame timer, `?at=buy:0.5` jumps to the middle of a chapter, `?view=1&look=dusk` opens the explore mode, `?q=fast` forces the lighter setting, `?nowebgl=1` shows the fallback, `?still=1` turns easing off for screenshots.

How it stays fast: the model is about 170,000 triangles and 140 draw calls a frame. It only draws a new frame when something moved. If a device runs slow for the first second and a half it drops to a lighter setting on its own (no soft shading, no focus blur, smaller shadows). With no WebGL the page shows the still elevation drawing and all the copy still reads.

### How the model meets the photo

The page ends its story by wiping from the model to the real twilight photo, so the model has to sit on that photo.

- **What was done (November 12, 2026):** 50 points were picked on the photo (post tops and feet, dormer peaks and windows, both gable peaks and eaves, bay corners, the oval windows, the roof ridge) and matched to the same points on the model. A least-squares fit then solved the camera and the house dimensions together.
- **What it found:** the wings sit about 2.5 m behind the porch front, close to level with the porch's back wall. The first model had them level with the porch front. The aerial photo shows the same thing. The photo was taken from about 42 m with a long lens.
- **Result:** about 5 photo pixels of error on average, 20 at worst, on a 1672 pixel wide photo. Before the fit the right wing was off by about 60.
- **Inference, not measured:** the house is treated as a mirror image left to right. The head-on daytime photo supports that.
- **If the house changes shape,** fit the camera again. Do not nudge `match.js` by hand.

### Timing it on a real machine

The cloud machine that builds this page has no graphics card, so it cannot say how smooth the page is. The page can time itself instead.

Open the page with `?perf=1` on the end of the address, or press Shift+P three times. It scrolls the whole story for 24 seconds, then turns the model in the viewer for 10, drawing every frame. A card then shows the median, 95th percentile and worst frame time, the share of late frames, and the graphics chip. "Copy result" puts the numbers on the clipboard. Paste them into `judge/3d-scorecards.md`.

Method reference: the `threejs-scene`, `exploded-view` and `site-check` skills from `Moh4696/open-3d-skills` (MIT), pulled with `skills/web-3d`. Their approach was followed. No code was copied.

## Checked, and not checked

Checked in headless Chromium on November 12, 2026:

- Every chapter at 1440 by 900 and 390 by 844, plus the explore mode in all four looks, a set view and an open photo pin.
- No console errors, no failed requests, no sideways overflow at either size.
- The fallback page with WebGL off.
- Draw calls and triangles per frame, read from the renderer.

Not checked, say so before calling it done:

- Frame rate. The test machine has no graphics card, so it draws in software and its timing means nothing. The page now has its own timer (`?perf=1`). It needs one run on a real laptop and one on a real phone.
- Safari and iPhone. Only Chromium was run.
- Reduced motion with a real setting turned on. The code path is there and was read, not watched.
- A slow connection.

## Not done on purpose

- No change to `../site/`, to DNS, or to the deploy workflow.
- No link from the live pages to this one.
- Interiors are not modelled. The floor plan is not known, so rooms are shown with photos only.
