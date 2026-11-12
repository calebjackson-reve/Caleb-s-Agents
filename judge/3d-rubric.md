# 3D page judge rubric

For any page where a three.js scene carries the story. Written November 12, 2026 for `website-rebuild/3d/`.

The judge is a specialist in real-time 3D for the web. The judge scores from what is on screen and what the browser measured. Not from the code, not from the README, not from what the builder meant. Every score cites a screenshot file or a report field. No evidence, no points.

Start every category at 6. The evidence has to earn each point above that. A 9 means a working 3D artist would not change anything that matters. A 10 means it would hold up next to the best architectural 3D on the web.

## Categories

| # | Category | Weight | What earns the points |
| --- | --- | --- | --- |
| 1 | Model craft | 20% | Proportions match the reference photos and the elevation. Detail is consistent, not rich in one spot and bare in the next. Nothing floats, sinks, pokes through or z-fights. Silhouettes are clean. The grounds support the house and don't distract. |
| 2 | Light and material | 15% | Shadows ground every object. Contact shading reads under eaves and at the base of walls. Nothing clips to white or crushes to black. Dusk is readable and the lights look placed, not sprayed. The palette holds from one state to the next. |
| 3 | Drawing and blueprint pass | 10% | Line weight is even. No stair-steps, speckle, banding or missing edges. Hidden lines stay hidden. Reads at phone size. |
| 4 | Camera and motion | 15% | Judged from frame sequences. Every beat is framed on purpose. The subject is never cropped by accident. The camera never passes through geometry. Consecutive frames flow with no jump, pop or flash. The model and the words never collide. |
| 5 | Explore mode and toggles | 15% | Every look works from every set view. Switching looks never leaves a broken in-between state. Take-apart reads as the order a house goes together. Pins sit on the thing they name and never show through walls. Controls are legible and reachable on a phone. |
| 6 | Page craft | 15% | Type hierarchy, spacing and rhythm. Copy is readable over the stage at every beat. The phone layout is designed, not shrunk. Nothing is clipped or overlapping. |
| 7 | Technical | 10% | No console errors, no failed requests, no sideways scroll. Draw calls and triangles inside budget (under 300 calls, under 2 million triangles a frame). The page works with WebGL off and with reduced motion. |

Overall = the weighted sum, to one decimal.

## Caps

- Any console error or failed request caps Technical at 5.
- No frame timing from a real graphics card caps Technical at 8. Software rendering numbers don't count.
- Any toggle, view or pin that does nothing or breaks the scene caps Explore mode at 6.
- Any text a visitor cannot read caps Page craft at 6.
- A visible artifact (z-fighting, banding, speckle, a hard seam, a floating object) caps the category it belongs to at 7.
- A state that is plainly broken (blank, washed out, wrong colours) caps its category at 5.

## Pass

The page passes at an overall of 9.5 or higher with no category under 8.5.

## What the judge hands back

1. The score card: each category with its score, the cap applied if any, and the files that justify it.
2. The overall.
3. Fixes, most score first. Each one names the file that shows the problem, what is wrong, and what to change. Specific, not cruel: "explore/dusk-pool.png: the pool light blows out to white, halve it", never "the lighting needs work".
4. What could not be judged from the evidence.

## Rules for the loop

- A new judge every round. The new judge never sees an earlier score card.
- Don't argue a score up. A score is only disputed by pointing at a screenshot the judge misread.
- The builder fixes what the judge found and nothing else in that round, then re-shoots all the evidence.
- Score cards are kept in `judge/3d-scorecards.md`, one entry per round, so the trend is on the record.
