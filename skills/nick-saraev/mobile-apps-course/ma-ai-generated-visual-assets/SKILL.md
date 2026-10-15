---
name: ma-ai-generated-visual-assets
description: Produces a polished, illustrated app look by having Claude write an image-generation prompt for the app, generating full-screen mockups with an AI image model (Nick used GPT Image), dropping them into an images folder, having Claude crop out assets and rebuild screens to match, then regenerating individual sprites with transparent backgrounds and masking edges with gradients. Use when Caleb says "I want custom illustrations", "make it look like a mockup I saw", "generate the icons and backgrounds", "the trees/sprites are cut off", "animated growing thing", or wants an AIRE or KW app to look designed rather than default.
---

# AI-Generated Mockups and Visual Assets

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapter 33 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=11909s), with the Pomodoro build setup in chapter 32 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=10762s)

## What Nick teaches

The Pomodoro app's core loop was purely visual (plant a seed, watch a tree grow for 25 minutes, phone buzzes at the end), so Claude's first SVG trees ("a couple of circles") were not good enough. Dribbble references helped with layout but "this has more to do with the pictures than anything else." So Nick had AI generate the pictures.

### The flow
1. **Get a prompt from Claude.** Using `/btw` so the build kept running: "Describe this app in a prompt for feeding into an image generator so it can come up with an in-depth set of designs."
2. **Generate mockups.** Fed that prompt to GPT Image (he called it "GPT Image 2," "one of the better AI image generators right now"). It produced full phone-screen mockups: onboarding (four screens), the grow screen with a field and a growing tree, the forest screen with stats. "It's actually mimicked the structure and layout, which tells me the thing we're lacking is just the visual assets." Cost: "maybe 10 to 20 cents."
3. **Save them to the repo.** Create an `images/` folder in the project (he had to open the folder in Finder to drag files in). Tell Claude: "You can find the images for each section in images/."
4. **Rebuild the onboarding to match.** "These are the four onboarding screens. Design the app onboarding to look exactly like this. Standardize the design, colors, everything so it follows this structure. Screenshot-loop over and over until it's just about pixel perfect. Minor position differences are fine, but it should look the same otherwise."
5. **Extract assets.** "Isolate all of the image assets in these mockups (the trees, the backgrounds, etc.) and give them to me as images so I can import them into the app." Some mockups contained several screens or a grid of trees: "Some of these images feature multiple mockups. Cut, crop, divide the image as needed before proceeding so you end up with a straightforward list of assets. Think hard as you chop them up. Important we get this right. Once done, loop infinitely until the design is close to pixel perfect."
6. **Roll out to the other screens.** "The onboarding now looks fantastic, but the rest of the app does not. Continue rolling out the generated images and assets through the Grow and Forest pages, top to bottom, as similar as possible to the images in images/. Take screenshots and loop as many times as you need."
7. **Fix edges with gradients.** The mockup backgrounds were baked-in squares with artifacts from background removal. "The top corners of these images still look square. Make the gradients come in a bit more, but only on the top." Result: a soft arch mask so "you won't even cue into the idea that it's a square image." Then "make it 10% stronger."
8. **Regenerate sprites one at a time.** Trees cropped from a grid were cut off ("additional trees above or below the main tree"). Nick's conclusion: go back to the image model and "replace these and generate them one at a time, with the background removed." Cheaper than making Claude guess bounding boxes.
9. **Add life.** "When you tap on the seed or any tree, slight haptics and it jiggles, almost like it's organic or alive." Move the timer above the tree so the ground reads as ground. A dev mode (long press) to trigger every growth state so clipping can be checked.
10. **Compress images** before shipping on any image-heavy app so they load faster on mobile. Nick skipped it and names it as a dedicated step to add.

### Where Claude planned it
Before building, Claude went into plan mode and used a subagent to research React Native animation libraries, then asked: real-time growth or pre-made animation (real-time), persistence (local SQLite for now), default duration (25 minutes).

## Step by step

1. Build and test functionality first (`ma-five-step-app-design-framework`, `ma-feedback-dump-iteration`).
2. `/btw`: ask Claude for an image-generation prompt describing every screen, mood, palette, and characters.
3. Generate mockups in an image model. Pick the best set. Note the price.
4. Create `images/` in the repo and save mockups with descriptive names (`onboarding-1.png`, `grow-screen.png`, `forest.png`, `trees-grid.png`).
5. Have Claude rebuild one screen (onboarding) to match, screenshot-looping.
6. Have Claude crop assets out, then roll the look to every other screen.
7. Apply gradient masks on image edges.
8. Regenerate any clipped sprite individually with a transparent background and replace it.
9. Add micro-interactions (haptic + jiggle) and a dev mode to trigger each visual state.
10. Compress images. Run the phone pass. Verify the pictures look clean at phone resolution.

## Templates / prompts

```
/btw Describe this app in a prompt for an image generator so it can produce an in-depth set of mobile UI mockups: every screen, the visual style ([warm, youthful, hand-drawn / clean, professional]), the palette, and the key illustrated elements.
```

```
These are the four onboarding screens (images/onboarding-1..4.png). Design the app onboarding to look exactly like this. Standardize the design, colors and layout to follow this structure. Screenshot-loop until it's close to pixel perfect. Exact button positions can differ slightly. Everything else should match.
```

```
Isolate all of the image assets in these mockups (trees, backgrounds, characters) and save them as separate images I can import. Some files contain multiple mockups or a grid: cut, crop and divide them first so we end up with a clean list of assets. Think hard as you chop them up. Then loop until the Grow and Forest pages match images/ as closely as possible.
```

```
The image corners still look square at the top. Add a gradient mask so the top fades into the background, about 10% stronger than the bottom. It should read as an arch, not a square photo.
```

Image-model prompt for a single sprite:

```
A single [oak tree] in [the same hand-painted style as the attached mockup], centered, nothing else in frame, transparent background, no ground, no shadow outside the trunk base, PNG.
```

Folder layout:

```
images/           raw mockups from the image model
assets/sprites/   cropped or regenerated single assets, transparent PNG
assets/bg/        backgrounds
```

## Pitfalls Nick calls out

- AI mockups are not internally consistent (tree counts differ, buttons vary). Use them for look and assets, not as the spec for logic.
- Cropping sprites from a grid produces clipped edges. Generate them individually.
- Background-removal artifacts show on phone. Mask with gradients or regenerate.
- Watercolor-style buttons and textures may not be reproducible procedurally. Expect to drop some.
- Image-heavy apps need a compression step before shipping.
- Image generation costs real money per run (cents, but it adds up).
- Tool names and capabilities (GPT Image, Chrome DevTools MCP, plan mode, subagents) are as Nick described and may have changed.

## How Caleb should use this

- Generate an illustrated onboarding for the AIRE buyer app (a Louisiana porch, live oaks, a St. Francisville street) so it feels local and designed, not stock.
- Create a set of monochrome listing-status icons (coming soon, active, under contract, sold) as individual transparent PNGs rather than cropping from one sheet.
- Use the mask-with-gradient trick on listing hero photos so the home screen looks native instead of pasted.
- Keep a `images/` folder of approved brand mockups in the AIRE repo so future screens match.
- Image generation and any paid image tool need Caleb's approval before running. Always note the cost.

## Verification

- `images/` holds the approved mockups, `assets/` holds one file per sprite with transparent backgrounds.
- Side-by-side screenshot of each screen versus its mockup shows the same structure, palette, and assets.
- No sprite is clipped in any growth or status state (checked via the dev trigger).
- Image edges show no square corners or removal artifacts on the phone.
- Image files are compressed and the app still loads quickly on cellular.
