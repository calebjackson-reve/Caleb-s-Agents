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
