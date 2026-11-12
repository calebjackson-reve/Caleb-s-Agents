# 3D judge score cards

One entry per round for `website-rebuild/3d/`. Rubric: `judge/3d-rubric.md`. Evidence is shot with `judge/3d-shoot.js` into `judge/out/round-N/` (git-ignored). Each round has a new judge who sees only the screenshots, the measurements and the rubric. No source, no notes, no earlier card.

Pass is 9.5 overall with no category under 8.5. Technical is capped at 8 until someone records frame timing on a real graphics card, which this build machine does not have.

## Round 1, November 12, 2026

**Overall 6.3. Not a pass.** 101 screenshots.

| Category | Weight | Score | What held it down |
| --- | --- | --- | --- |
| Model craft | 20% | 6.5 | Right gable about 100 px off the photo, ridge too low, oval windows missing, egg-shaped shrubs, the edge of the ground in frame |
| Light and material | 15% | 5.5 | Roof pure black at dusk, pool blown to white, porch light leaking through the roof, blocky shadows |
| Drawing and blueprint | 10% | 7.0 | Fence pickets clogging into a block, uneven line weight |
| Camera and motion | 15% | 6.0 | Words over the model, cropped subject, a black to white swing in one step, the photo zooming during the wipe |
| Explore mode | 15% | 6.0 | "Above" view under the controls, a pin showing through the house, the page left on the wrong camera after closing |
| Page craft | 15% | 6.0 | Capped: part labels crossed by model lines and unreadable |
| Technical | 10% | 8.0 | Capped: no frame timing from a real graphics card |

What the judge called professional already: the hero drawing, the dusk porch, the match to the photo at the porch, the type and page sections, the phone layout, the fallback with WebGL off, and the budgets (133 to 199 draw calls, about 171,000 triangles, no errors).

The judge listed 41 fixes. What was changed for round 2:

- **Labels:** numbered points on the model, names on plates in a clear column, elbow lines between. On a phone the names move into the words below.
- **Model:** wings moved out and the main ridge raised to fit the photo, connecting roofs raised to meet the gable peaks, oval windows added, gable windows redrawn as tall pairs, chimney lowered, a continuous hedge in place of the egg row, berry wreaths so they stop reading as pins.
- **Ground:** no edge any more. The ground is the backdrop itself and only darkens under shadows.
- **Light:** roof tone carried from day into dusk, night lifted so nothing is darker than the sky, a sky that lightens toward the horizon after dark, pool light halved, porch and patio lights turned into downward cones so they stop at the ceiling, shadows fitted to the view so they stay crisp up close.
- **Lines:** their own pass, softened and evened. Fence drawn as rails and posts in the line looks. Less fine detail when the house is small on screen.
- **Camera:** lens and distance now change together so the house never shrinks mid-move, a line of copy for the turning beat, the photo held still during both wipes and no longer cropping the house, the day to dusk change spread over more scroll, the blueprint giving way to the model behind a rising line.
- **Explore mode:** "Above" reframed over the controls, pins hidden when a wall is in the way, the chapter's own camera restored on close, take-apart restaged with dotted leaders, the photo card moved clear of the house, larger control type.
- **Evidence:** the shoot now covers what the judge could not see: denser frames across both changes of light, every chapter with WebGL off and with reduced motion, more of the phone viewer, every pin, an orbit limit, four frames at pixel ratio 2, and the drone film playing.

## Round 2, November 12, 2026

**Overall 7.1. Not a pass.** 144 screenshots. A new judge who saw nothing from round 1.

| Category | Weight | Score | What held it down |
| --- | --- | --- | --- |
| Model craft | 20% | 8.0 | Flat window glass, sausage hedges, a grey ellipse for the pond, bare props |
| Light and material | 15% | 7.0 | Capped: a hard band at the horizon while the model builds. Day roof too pale, no shade under the porch, roofs crushed to black from the pool at dusk |
| Drawing and blueprint | 10% | 6.5 | Capped: speckled dots along the walk and drive. Uneven line weight on the ground, lines breaking up at phone size |
| Camera and motion | 15% | 6.5 | Capped: a black cap left on a tree after the blueprint wipe. Words over the model on the phone, the left wing fading under the copy panel |
| Explore mode | 15% | 7.5 | A pin showing through the roof on the phone, no pins in the blueprint look, take-apart cluttered on the phone |
| Page craft | 15% | 6.0 | Capped: copy unreadable for a few frames while day turns to dusk (the "02" label at 1.04 to 1) |
| Technical | 10% | 7.5 | Capped at 8: no frame timing from a real graphics card. Fallback states with loose ends |

What the judge called professional already: the dusk model to twilight photo wipe ("roof, dormers, gables and windows land on the photo"), the dusk lighting on the front, day to dusk with no pop, line quality at pixel ratio 2, the named parts, the pin cards, the phone control card, the type, and the budgets (238 draw calls and 196,446 triangles at peak, no errors).

What changed between round 1 and round 2, beyond the first fix list:

- **The model was fitted to the photo.** 50 points on the twilight photo against the same points on the model. The wings moved about 2.5 m back, the tall roof got deeper, the oval windows moved out between the porch and the wings. Error went from about 60 photo pixels on the right wing to about 5 on average.
- **Framing:** every chapter pulled back so the whole house shows.
- **Bugs found along the way:** the pointer leaned the camera at the photo moment, and photo pins kept an old answer about what was in front of them.
- **A frame timer** on the page (`?perf=1`), so the Technical cap can be lifted with a run on a real machine.

The judge listed 34 fixes. Round 3 starts with the four that lift caps: the copy contrast at dusk, the tree cap, the horizon band and the ground speckle.

## Round 3, November 12, 2026

**Overall 7.4. Not a pass.** 144 screenshots. A third judge who saw nothing from rounds 1 or 2. Caleb asked for the loop to stop after this round, so the judge was told to wrap up before a second read. It scored only from the frames it had notes on and listed the rest as not judged: 13 of the desktop viewer frames (the day, dusk and blueprint looks from the set views, and the pool view in dusk and blueprint) plus 4 others. No score was moved to cover them.

| Category | Weight | Score | What held it down |
| --- | --- | --- | --- |
| Model craft | 20% | 7.0 | Capped: a small white gap where the back dormer meets the roof valley. Front dormers about 30% too wide against the photo, the main roof one flat tone, trees and planters still read as toys |
| Light and material | 15% | 7.0 | Capped: a tree shadow sitting away from its tree for two frames at dusk. A flat grey moment halfway through day to dusk, no contact shadow under the house by day, posts near black at dusk where the photo has them amber |
| Drawing and blueprint | 10% | 6.5 | Capped: lines breaking up on the phone hero and the phone blueprint. Hip caps drawing as dashes from above |
| Camera and motion | 15% | 7.5 | Both wings off the sides on three phone frames, one empty phone beat, a tree cut by the right edge, porch windows about 40 px off the photo |
| Explore mode | 15% | 8.0 | Part judged only. What was judged works: looks, take-apart, six pins, close |
| Page craft | 15% | 8.0 | A grey band on the phone during the blueprint wipe, chapter marks over the model, part labels out of number order |
| Technical | 10% | 8.0 | Capped at 8: no frame timing from a real graphics card |

What the judge called professional already: the dissolve from model to photograph ("ridge, eave, posts and wing peaks land within a few pixels"), the desktop drawing and blueprint, the exploded view, the dusk lighting on the front, type and layout on both sizes, the phone viewer controls, pins hiding behind roofs, both fallbacks, and a clean browser report (0 errors, 170 to 267 draw calls, about 130,000 triangles).

What moved between round 2 and round 3: Page craft 6.0 to 8.0 (the unreadable dusk copy is gone), Camera 6.5 to 7.5, Explore 7.5 to 8.0, Technical 7.5 to 8.0. Model craft went 8.0 to 7.0. That is a different judge finding a gap the last one did not, and it is recorded as scored.

### Where it stopped

The loop ended here on Caleb's instruction, at 7.4 against a target of 9.5. The 39 fixes from round 3 are in `judge/out/round-3/scorecard.md` on the machine that ran it (git ignores that folder). The ones that would move the score most:

1. Line width set in device pixels so the drawing holds on a phone.
2. Hip caps lifted clear of the roof so they stop drawing as dashes.
3. The tree shadow that slides off its tree at dusk, and a contact shadow under the house by day.
4. Front dormers narrowed about 30% to sit on the photo.
5. Phone camera pulled back in the buy and sell chapters.
6. A frame timing run on a real laptop and a real phone (`?perf=1`). Without it Technical stays at 8 and no score can pass.

| Round | Overall |
| --- | --- |
| 1 | 6.3 |
| 2 | 7.1 |
| 3 | 7.4 |
