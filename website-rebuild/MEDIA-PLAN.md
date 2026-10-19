# Stage 5: media plan

Written October 19, 2026 after the Stage 3 build and the Stage 4 verification. Nothing on this page has been generated or paid for. Caleb picks what runs.

Balance at time of writing: 381.8 Higgsfield credits on the free plan (source: Higgsfield `balance`, October 19, 2026). Seedance 1.5 Pro, 1080p, 8 seconds, costs 24 credits per run. Kling needs a paid plan.

Rule from `aire/STACK.md` and the media library: AI only for backgrounds, textures and motion applied to Caleb's own photos. No AI headshots, no AI listing photos, no AI neighborhood photos presented as real.

## Slots that are empty or weak

| # | Slot | Page | Now | Best fix | Cost |
| --- | --- | --- | --- | --- | --- |
| 1 | Zachary card | Home runway, Communities | Text placeholder | Reshoot, real photo | Half a morning |
| 2 | New Roads / False River card | Home runway, Communities | 800px photo from 2006 | Reshoot from the public landing or a boat | Half a morning |
| 3 | Country Club of Louisiana, University Club, Bocage, Santa Maria, Copper Mill cards | Communities | Caleb's saved web images, copyrighted, not publishable | Reshoot, brief in `media/places/reference-unlicensed/README.md` | One morning for all five |
| 4 | Plain-background headshot for tiny crops and the nav | Header, listing "Listed by" block | Balcony headshot cropped tight | Studio or wall shot, ivory or ink background, straight on | One hour with the photographer |
| 5 | Section paper grain | Every ivory section | Flat color | AI texture, tileable | 1 image run, about 2 to 4 credits |
| 6 | Loader and transition plate | Loader, menu | Flat ink | AI gradient, ember on ink | 1 image run, about 2 to 4 credits |
| 7 | Pool still animation, water held still | Sell page case block | Rejected version (water looked fake) | Rerun with the prompt below | 24 credits |
| 8 | Gazebo still animation, camera nearly fixed | Home closing or Sell | Current version drifts too far | Rerun with the prompt below | 24 credits |
| 9 | Listing template gallery | Listing template | Basil Lane photos as example | Real MLS photos per listing at publish time | None |
| 10 | Testimonials | About, hidden slot | Empty on purpose | Written permission from two or three past clients, then their words verbatim | None |

## Prompts for the AI slots (only on approval)

### 5. Paper grain texture
- Tool: Higgsfield `generate_image`, any image model, 2048 square.
- Prompt: "Seamless tileable fine paper grain texture, warm off-white #FBF8F3, very subtle fiber, no visible pattern repeat, no text, flat lighting, scanned paper look."
- Use: `background-image` at 8 to 12 percent opacity over `--ivory`. Disclose as AI texture in the footer credits line.

### 6. Ember on ink gradient plate
- Tool: Higgsfield `generate_image`, 2560 by 1440.
- Prompt: "Abstract soft gradient, near-black warm charcoal #14100E fading to a single faint ember glow #E87757 in the lower left corner, grain, no shapes, no text, cinematic, matte."
- Use: loader background and menu panel. Disclosed as AI.

### 7. Pool at night, water still
- Tool: Higgsfield `generate_video`, Seedance 1.5 Pro, 1080p, 8s, 16x9. Reference: `media/listing-basil-ln/basil-pool.webp` (imported earlier as the still-anim-2 source).
- Prompt: "Slow push in, camera only, 3 percent over 8 seconds. Water surface completely still, pool lights steady, no ripples, no reflections moving. Porch lights steady. Very subtle leaf movement in the far trees only. Photoreal, no added objects, no people."
- Cost: 24 credits. Verdict after: keep only if the water reads as real on a phone at full brightness.

### 8. Gazebo, fixed camera
- Tool and settings as above. Reference: the gazebo still used for `still-anim-3`.
- Prompt: "Locked-off camera, no pan, no zoom. Only motion: slight breeze in the trees, faint movement on the pond surface in the distance, clouds drifting one percent. Photoreal, no added objects, no people, no birds."
- Cost: 24 credits.

## Reshoot brief (one morning, no cost beyond the photographer)

Golden hour, 7 to 9 am, 35mm equivalent, horizontal and vertical of each. Streetscape with an entry monument or a signature street for: Zachary (Main Street, Copper Mill entry), New Roads (False River from the public landing, Main Street storefronts), Country Club of Louisiana (gate from the public road, fairway edge if accessible), University Club (entry, lake), Bocage (oak street), Santa Maria (entry, golf edge). Plus one straight-on headshot against a plain wall. Deliver as 3000px long edge, webp exports go in `media/places/`.

## What I recommend

Run items 5 and 6 (under 10 credits together) once Caleb says yes, book the reshoot for items 1 to 4, and skip 7 and 8 unless the reshoot gives nothing better. Every AI item gets a credit line in the footer.
