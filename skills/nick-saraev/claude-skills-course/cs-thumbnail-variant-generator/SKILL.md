---
name: cs-thumbnail-variant-generator
description: Builds a one-shot image skill that reproduces a reference thumbnail or viral image with Caleb's face superimposed realistically, generating several variants (lighting, tone, background) so he can pick the best one. Use when Caleb says "make me a thumbnail like this", "put my face on this", "give me a few versions of this graphic", or wants listing-video thumbnails, YouTube or Reels covers, or social graphics for Keller Williams First Choice content.
---

# One-Shot Thumbnail Variant Generator

**Source:** Nick Saraev, "CLAUDE SKILLS FULL COURSE: Automate Your Work (2026)", chapters 3-4 (https://www.youtube.com/watch?v=sduaTkhIm_w&t=150s)

## What Nick teaches

Nick's second skill is "a one-shot thumbnail generator." He had a viral image of Jon Hamm as Don Draper from Mad Men ("it's all about vibes") and wanted to reproduce it as a thumbnail for his vibe-coding videos without doing it by hand.

The prompt he gives: **"Reproduce the Jon Hamm thumbnail. Use similar lighting, etc."**

What the skill does:
1. Takes the source image that already exists.
2. Goes and gets his face (a stored reference photo).
3. Superimposes his face onto the image "in a really realistic-looking way."
4. **Generates multiple variants instead of one**, "so that we can pick and choose which one looks the best. And also because not all AI outputs are perfect."

He ran it twice and showed the results: "pretty freaking close," but with differences. Background people change, lighting shifts slightly, one had "darker lighting and different tone," another was "Matrix-style blue and sepia." He likes that because the outputs are not "a one-to-one rip of the source image," and he gets to pick the one that "did the most justice to my face." All of this took "just a few seconds."

Nick does not name the image model in the transcript. The skill wraps whatever image-generation tool he has configured, plus a stored face reference. Note: tool and pricing details may have changed since recording.

## Step by step

1. Store 2 to 4 clean reference photos of Caleb (front-facing, good light, no sunglasses) in the skill folder, e.g. `assets/face/`.
2. Accept a reference image (a path or URL) and a one-line direction ("similar lighting", "brighter", "make it feel like a listing reveal").
3. Build a generation prompt that describes the reference composition, lighting and mood, and instructs the model to place Caleb's face from the reference photos with matching lighting and angle.
4. Generate 4 to 6 variants, intentionally varying one dimension each (lighting, color grade, background density, crop).
5. Save all variants to an output folder with numbered names and show them side by side.
6. Caleb picks. Optionally re-run with "more like #3" to converge.
7. Export at the target size (YouTube 1280x720, Reels 1080x1920, Facebook 1200x630).

## Templates / prompts

Trigger phrasing:

```
/thumbnail <path-or-url> "Use similar lighting, keep the composition, 5 variants"
```

Generation prompt skeleton the skill assembles:

```
Recreate the composition, framing, lighting and mood of the reference image.
Replace the main subject's face with the person in the reference face photos.
Match skin tone, head angle and light direction so it looks photographed, not pasted.
Variant {n}: {lighting: warm | cool | dramatic side light}, {grade: natural | sepia | teal-orange}, {background: as reference | simplified}.
Output {width}x{height}.
```

Skill request Caleb can give Claude:

```
Build a skill called thumbnail-variants.
Inputs: a reference image and a short direction.
Use the face photos in assets/face/.
Generate 5 variants with different lighting and color grades using the image tool we have configured.
Save to output/thumbnails/<date>/ and show them to me in a grid. Do not post anywhere.
```

## Pitfalls Nick calls out

- "Not all AI outputs are perfect." Always generate multiples, never trust a single run.
- Expect small drift from the source (background people, lighting). Treat that as a feature for originality.
- Pick with your own eye. The one that "did the most justice" to the face is the one to use.

## How Caleb should use this

- Listing-video and walkthrough thumbnails: Caleb's face plus the property exterior, consistent branding across the channel.
- Reels and Shorts covers for market updates ("St. Francisville market, October") with a repeatable look.
- Open house and "Just Listed" graphics with the same composition each time so the feed looks like one brand.
- Recreating a trending meme or viral format with Caleb's face for engagement posts.
- Image generation costs credits and posting is external. Generating is fine, but publishing to social or paid ads needs Caleb's approval before running. Keep Keller Williams brand guidelines in mind for anything public.

## Verification

- Output folder contains 4 to 6 numbered variants from one command.
- Face is recognizably Caleb with lighting that matches the scene (no obvious paste edges).
- Variants differ in at least one visible dimension each.
- Chosen variant exported at the correct platform dimensions.

## Example run (Caleb)

```
Caleb: /thumbnail refs/just-listed-template.png "Same framing, brighter, 5 variants"
Claude: Loads assets/face/caleb-01.jpg and caleb-02.jpg.
        Generates 5 variants: warm natural, cool bright, dramatic side light, teal-orange grade, simplified background.
        Saves to output/thumbnails/2026-10-15/variant-1.png ... variant-5.png and shows a grid.
Caleb: #3, but with the warmer tone from #1.
Claude: Regenerates 3 more around that combination. Exports the pick at 1280x720 and 1080x1920.
```

Skill body section for consistency across the channel:

```markdown
## Brand constants
- Face reference: assets/face/
- Font for any overlay text: <brand font>, white with soft shadow
- Keller Williams First Choice mark bottom-right on public graphics
- Never alter the face shape. Match lighting and angle only.
```

Nick's reason for multiples bears repeating: he picked the one that "did the most justice to my face." The skill's job is to give Caleb choices fast, not to be right on the first try.
