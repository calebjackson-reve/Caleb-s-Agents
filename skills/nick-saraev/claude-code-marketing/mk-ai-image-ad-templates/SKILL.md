---
name: mk-ai-image-ad-templates
description: Builds an AI image-model ad generator (GPT image 2 or similar via API) that stays on-template, using Nick Saraev's method of verifying the model manually first, having Claude digest a winning ad into zones and "levers", then generating 5 variants per template into a picker page. Use when Caleb says "make photo-real listing ads", "generate lifestyle images for this neighborhood", "I want AI images in my ad templates", "the procedural ads look too flat", or asks for product/lifestyle visuals he does not have photos for.
---

# AI image-model ad templates (direct generation steered by Claude)

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapter 7 (https://www.youtube.com/watch?v=yulWjh3rq28&t=6173s)

## What Nick teaches

Two ways to make assets:
- **Compositing tools** (Photoshop, Canva, Paint, HTML/CSS): Claude steers them. Cheap, ~80% okay rate, limited variety. See `mk-procedural-ad-generator`.
- **Direct generation models** (GPT image 2, nano banana, Seedance for video): every pixel is produced by the model. Huge range, ~**25% okay rate**, costs money per generation, and you will need ~**4 generations per keeper**. "Use compositing for simple stuff, direct gen for complicated stuff."

"More freedom and flexibility means more rope to hang itself." Business wants repeatable, consistent outputs, so the job is to constrain the model to a template while letting it vary the right things.

### The build
1. **Collect templates** from Ads Library (he searched "socks": a 4-panel product grid with the logo centered, a kids-in-socks lifestyle shot, a benefits-list "feel better in style" ad). Saved as `socks1..3` in `ad formats for image generator`. Convert `.webp` to PNG first.
2. **Pick the variable**: the product image (Cloud Socks, Linen Tails). Use an unrolled, clear product photo for adherence.
3. **Verify the model manually first.** In ChatGPT (needed Plus/Go plan to upload two images), upload product + template: "use the ad format in the second image but apply the product in the first. Add value props that fit. Don't copy the background. Keep the focus on enumerating benefits in that quirky way. Company name is Cloud Socks." Output was "reasonably good", some cut-off text and odd hands. Good enough to proceed. "If the model can't do it manually, don't bother automating."
4. **Connect the API**: OpenAI playground -> create secret key -> Claude local environment -> `OPENAI_API_KEY=...` (see `mk-connect-tools-keys-and-connectors`).
5. **Prompt**: "Translate the Maker School ads skill into something that steers GPT image 2. The key is in the local env. Go get all the API docs, endpoints, and functions you need. Don't build the skill yet, just verify feasibility with a basic generation using these socks as the template product." Nick stopped Claude when it started using `gpt-image-1` instead of 2: correct mistakes immediately.
6. Claude read the docs, ran a live image-edit test, generated 5 variants. They were clean but **varied wildly** from the template (only the logo opposition was kept).
7. **Constrain**: "Digest the image ad, identify the areas we could tweak (levers), like the compositing workflow. Template out the changes and generate that way. We need more conformity with the main image. The goal is a template we can hot-swap any product into and be ~80% sure the output is okay." Claude decomposed the ad into zones: logo band (0 to 20% of height), negative space, product band, bottom element. Claude asked whether to overlay text procedurally on a generated image. Nick chose a **pure prompt template** (don't mix compositing on top of pixel generation), which Claude also recommended.
8. Iterate until outputs hold the layout (feet-on-couch lifestyle, horizontal grid, collage).
9. **Scale**: "Turn this into the HTML flow with checkboxes. Each template should generate at least 5 variants (3 templates = 15). Feed very different instructions into each (warm/cool, indoor/outdoor) so a creative director can select winners." Result: a mini app with brand pairings, varied backgrounds, skin tones, sock designs, and "download selected." Adherence is adjustable (looser = more diversity).
10. **Skill, loop (5:59 a.m., 5 renders per variant), routine**: for the routine Nick created a second API key, added it to the **default cloud environment**, uploaded the template folder to Google Drive, and told Claude to mirror the "Maker School daily ad batch" routine: Drive folder, dated subfolder, 5 variants per template in the Drive template folder.

## Step by step

1. Save 2 to 5 proven ad layouts as PNG in `ad-formats-image/`.
2. Pick the product/subject image with clear detail.
3. Test by hand in the model's chat UI with product + template. Judge: can it hold the layout and render legible text? If not, change model.
4. Store the API key. Ask Claude to fetch docs and run one feasibility generation.
5. Ask Claude to decompose each template into zones and levers (what varies, what is fixed). Choose pure-prompt templates.
6. Iterate for conformity (~80% okay rate).
7. Build the picker: 5+ variants per template with deliberately different instruction pools. Download selected.
8. Consolidate as a skill. Add cloud env key and Drive folder before making it a routine.

## Templates / prompts

Feasibility prompt:
```
I have OPENAI_API_KEY in the local environment. Fetch the current GPT image 2 API docs
(image generation and image edit endpoints). Using the template folder "ad-formats-image"
and the product photo "{{file}}", run ONE edit call that applies the product to template 1.
Save the result to ./test/. Report cost per image. Do not build a skill yet.
```

Constrain prompt:
```
Digest template {{n}}. Break it into zones by % of height and list, for each zone, what is FIXED
(layout, logo position, text hierarchy) and what is a LEVER (background palette, setting,
people, props, headline wording). Produce a prompt template with {{placeholders}} for the levers.
Use a pure prompt approach, no procedural overlays. Target: hot-swap any product and get an
on-template output ~80% of the time.
```

Variant pools:
```
Pool A palette: warm | cool | neutral
Pool B setting: indoor | outdoor | studio
Pool C headline: {{3 to 5 angles}}
Generate 5 variants per template, each drawing a different combination.
```

## Pitfalls Nick calls out

- Direct gen will not be perfect. Budget 4x generations and some money ($10 to $20 for a first test round).
- Free ChatGPT tier can't upload multiple images or use the API.
- Wrong model name silently costs tokens. Stop and correct immediately.
- Mixing procedural overlays on top of generated pixels tends to look wrong.
- Rolled-up or unclear product photos reduce adherence.
- Review everything. Hands, text spill, and extra objects are common.

## How Caleb should use this

- Use for visuals Caleb can't photograph: "family on porch at dusk in a Louisiana live-oak neighborhood," seasonal mood images for market updates, lifestyle shots for buyer-persona ads, staged-room concepts for vacant listings (label AI-generated staging clearly and never pass it off as the actual property).
- Keep listing-photo ads on the compositing path. Put AI images only in brand/lifestyle/neighborhood zones.
- Every batch costs real money. Set a per-batch cap and confirm cost before scaling. Buying credits or an API plan **needs Caleb's approval before running**.
- Publishing AI images in listing advertising **needs Caleb's approval before running** and a check against MLS/KW rules on altered images.

## Verification

- Manual test in the model's UI yields a usable result before any API work.
- One API call succeeds, with the cost reported.
- After constraining, at least 4 of 5 variants keep the template's zones.
- Picker page shows variants with visible pool differences and downloads selected files.
