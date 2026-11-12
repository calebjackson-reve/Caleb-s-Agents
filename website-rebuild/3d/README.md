# The 3D page for calebjackson.org

A scroll story built with three.js. A front elevation drawing of Basil Lane turns into an architect's model, the light goes from day to dusk, the model gives way to the real twilight photo, then it becomes a blueprint that comes apart for builders. At the end the visitor can turn the house themselves.

Built November 12, 2026. Prototype for Caleb's review. Nothing here is published.

## Status

| Item | State |
| --- | --- |
| Page | Built, runs locally, checked on desktop and phone sizes |
| Published | No. `noindex,nofollow` is on. The deploy workflow does not pick this folder up |
| Caleb's approval | Pending. See "Needs Caleb's yes" below |
| Linked from the live site | No |

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
| The line | Ink elevation of Basil Lane on ivory paper | The dream is the easy part. I handle the rest |
| The form | The drawing turns in space and fills in from the ground up behind a thin ember line | Every home starts as a line on paper |
| 01 Buy | The camera walks up to the porch, soft focus behind | Walk up knowing the real number |
| 02 Sell | Day turns to dusk, the windows and porch lights come on | Sold starts with how it's shown |
| The photo | The real twilight photo rises over the model, lined up on the porch | This is the real one. Basil Lane, St. Francisville. Sold |
| 03 Build | Blueprint lines on ink. Roofs lift, dormers lift, posts slide out, parts are named | Builders, bring me in before the slab |
| Explore | The model back together in daylight, with a button into the explore mode | Now walk around it |
| Inside | Eight listing photos in a sideways strip | And step inside |
| Numbers | 81 closed deals, $25.1M, 8 areas, each with its source and date | The work, in numbers |
| Close | Drone footage of the estate | When it's time to move, we move |

Explore mode: drag to turn, scroll or pinch to zoom, four looks (Drawing, Day, Dusk, Blueprint), a "Take it apart" slider, four set views, and seven pins that open the real listing photo for that spot.

## What is real and what is drawn

- The 3D house and grounds are a computer-made study, built in code from the listing photos, the aerial footage and the elevation drawing in `architectural-preview/`. It shows the outside only. It is not a floor plan and not to scale. The page says so in the hero and in the footer.
- Every photograph and the drone clip come from `../media/` and are listed in `../media/MEDIA-LIBRARY.md`.
- No AI image, video or 3D generation was used for this page. Nothing was paid for.
- Look: a studio model on an ivory base, not a full color render. Caleb asked for luxury and not cartoonish (November 12, 2026). Green grass and blue sky made it read like a game, so the real photos carry the realism instead.

## Needs Caleb's yes

1. **Builder copy.** This is new. "Builders, bring me in before the slab. I'm not an architect. I'm the agent who can show you what buyers here are paying for, so the plan gets priced before it gets poured. Then I launch it the way you just saw." Confirm this is a service you want to offer in these words.
2. **The 32-unit line.** "I sold a 32-unit property in St. Francisville." You confirmed the sale in October. It has no year on the page. Give the year, or say to leave it.
3. **Basil Lane as "Sold".** Matches the current site copy. Confirm it is still right to show it this way with the seller's home in 3D.
4. **Hero line.** Uses "The dream is the easy part. I handle the rest", the line already live on the rebuild.
5. **Where this goes.** Replace the home page, sit at its own address such as `/basil-lane`, or stay a private showpiece. Nothing is wired until you pick.

## Compliance check (skills/ai-compliance-check), November 12, 2026

Compliance: PASS, with two flags for Caleb.

- Identity: Caleb Jackson, REALTOR, Keller Williams First Choice, 17111 Commerce Centre Drive, Prairieville, LA 70769, license 995709547, (225) 747-0303 and aire@calebjackson.org are on the page. Equal Housing Opportunity is in the footer. No Rêve.
- Guarantees: none on price, value or timing.
- Fair housing: copy describes the house and the work, not people.
- Production numbers: 81 deals and $25.1M show "Production records, as of October 7, 2026". "8 areas" shows "Brand package, July 2026".
- Flag 1: the 32-unit line has no date. Unknown whether one past sale needs one, ask the broker or add the year.
- Flag 2: the builder copy is a new service claim. It says "I'm not an architect" on purpose so nothing reads as design services. Needs Caleb's yes.
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
| `dev.html` | A bare stage for checking one view, for example `dev.html?az=-30&el=10&dist=50&fov=26&build=1` |
| `vendor/` | three.js r169 (MIT), Lenis 1.3.4 (MIT), each with its licence file |
| `assets/fonts/` | Instrument Serif and Instrument Sans (SIL OFL), with licence files |

Useful switches on the address: `?at=buy:0.5` jumps to the middle of a chapter, `?view=1&look=dusk` opens the explore mode, `?q=fast` forces the lighter setting, `?nowebgl=1` shows the fallback, `?still=1` turns easing off for screenshots.

How it stays fast: the model is about 170,000 triangles and 140 draw calls a frame. It only draws a new frame when something moved. If a device runs slow for the first second and a half it drops to a lighter setting on its own (no soft shading, no focus blur, smaller shadows). With no WebGL the page shows the still elevation drawing and all the copy still reads.

Method reference: the `threejs-scene`, `exploded-view` and `site-check` skills from `Moh4696/open-3d-skills` (MIT), pulled with `skills/web-3d`. Their approach was followed. No code was copied.

## Checked, and not checked

Checked in headless Chromium on November 12, 2026:

- Every chapter at 1440 by 900 and 390 by 844, plus the explore mode in all four looks, a set view and an open photo pin.
- No console errors, no failed requests, no sideways overflow at either size.
- The fallback page with WebGL off.
- Draw calls and triangles per frame, read from the renderer.

Not checked, say so before calling it done:

- Frame rate. The test machine has no graphics card, so it draws in software and its timing means nothing. Needs a look on a real laptop and a real phone.
- Safari and iPhone. Only Chromium was run.
- Reduced motion with a real setting turned on. The code path is there and was read, not watched.
- A slow connection.

## Not done on purpose

- No change to `../site/`, to DNS, or to the deploy workflow.
- No link from the live pages to this one.
- Interiors are not modelled. The floor plan is not known, so rooms are shown with photos only.
