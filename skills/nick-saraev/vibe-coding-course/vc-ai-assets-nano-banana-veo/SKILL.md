---
name: vc-ai-assets-nano-banana-veo
description: Produces custom visual assets for a vibe-coded site with Google AI Studio the way Nick Saraev does: generate a hero image with Nano Banana at the right aspect ratio and resolution, animate it with Veo into a seamless looping video, drop it in /public, generate a simple flat logo, and face-swap thumbnails using an inspiration image plus reference photos. Use when Caleb says "make a hero animation", "I need a logo for AIRE", "generate a thumbnail with my face", "make this image into a looping video", "the site needs something to stand out", or wants branded listing graphics without hiring a designer.
---

# AI assets: Nano Banana images, Veo loops, logos, face-swap thumbnails

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 18-19, 35, 41 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=3821s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=4015s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=13001s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=14816s)

## What Nick teaches

Since anyone can now replicate a design, "the way people are standing out now is through animations, through videos that are playing." Stills no longer read as human-made, motion still does. It costs a little money. Everything runs in **aistudio.google.com** (same Google account as Antigravity, you link an API key for billing, and he hopped accounts when credits ran out).

### Hero image with Nano Banana (image generation)
1. Find a 3D or abstract shape on Dribbble ("3D shape", "organic 3D shapes", "round egg 3D shapes"). Screenshot.
2. AI Studio > Playground > generate images. Paste the screenshot. Prompt: "**Create me a new organic shape that looks like this except with a fully white background. It should look very sexy and have a purple blue hue to it.**"
3. Set **aspect ratio** to match the slot in your design (he used 3:4, "three wide, four high", because the hero pane was taller than wide) and **2K** resolution. Matching the target dimensions matters.
4. Save image as.

### Animate with Veo (image to video)
1. Switch to the Veo model (he called it VO3 / Veo 3.1), link the API key, enable Google Drive access if asked.
2. Paste the generated image. Aspect ratio 9:16 for a tall pane. Duration **6 seconds**.
3. Prompt: "**Rotate this slowly so that the last frame is like the first frame. 100% white background.**" The last-frame-equals-first-frame instruction makes it loop seamlessly.
4. Download the mp4. Drop it into the project's `public/` folder, for example `public/hero-header-video.mp4`.
5. Tell the agent: "For the video, use `public/hero-header-video.mp4`." (He first said "URL", then corrected to the path.)
6. Reality check: the generated background was not pure white and showed a border. Options: remove the background, drop the border, or use a better asset. He ended up using a Spline community scene (an interactive 3D orb by a designer he credited) and told the agent to make sure the orb is not cut off, put glassmorphism cards over it, and match the container background to the orb's background color so it floats cleanly on mobile.

### Logo with Nano Banana
Prompt: "**Generate me a simple square logo, minimalistic, straightforward but immediately interpretable and high-end, for a lead scraping SaaS called Leadzo.**" Aspect ratio 1:1, 2K. Attach an inspiration logo and say "flat icon style, look at the below for inspiration, mimic this." Follow-ups: "Remove the text, just keep the shape." Then in the app: "make the background color a little lighter gray." He admits iterating more or hiring a designer would beat it, but it shipped.

### Face-swap thumbnails (the Thumbly flow)
1. Find an outlier high-performing thumbnail (he used 1of10 to browse by niche). Save it.
2. AI Studio > image generation. Attach the thumbnail and a photo of yourself.
3. Prompt: "**Replace the man in the thumbnail that includes 'how to build a portfolio' with the man in the profile picture provided.**" (Describe one change only.) Nano Banana kept the room, text and composition and swapped the person in.
4. In the app version the default prompt became: "Replace the face of the person in the provided thumbnail image with the face of the supplied user. Cinematic and dramatic lighting on the face." Three variants per run, user keeps one. He also tested "replace 100 with 1,000" to change a number in the background, which worked.
5. To build this into an app: AI Studio > Get code > REST snippet, paste it to the agent, "test via curl first," supply the three inputs (inspiration image, face images, prompt) as files. Endpoint was under `generativelanguage.googleapis.com`. Images of 4 to 6 MB were "pretty chunky" for tokens.

## Step by step

1. Decide the slot: hero pane size (aspect ratio), logo (1:1), or thumbnail.
2. Collect an inspiration image from Dribbble or a top-performing example.
3. AI Studio image generation with the inspiration attached, one clear change described, matching aspect ratio, 2K.
4. For motion: Veo, same image, 6 seconds, "last frame like the first frame," plain background.
5. Save into `public/` with a descriptive filename and reference the path in your prompt to the agent.
6. Check on desktop and phone that the asset is not cropped and its background matches the container.
7. Iterate one change at a time (remove text, lighter background, darker hue).

## Templates / prompts

Hero shape:
```
Create me a new organic shape that looks like this except with a fully
white background. High-end, soft, with a [brand color] hue.
Aspect ratio: [3:4]. Resolution: 2K.
```

Loop video:
```
Rotate this slowly so that the last frame is like the first frame.
100% white background. 6 seconds.
```

Logo:
```
Generate me a simple square logo, minimalistic, straightforward but
immediately interpretable and high-end, for [business] called [name].
Flat icon style. Look at the attached logo for inspiration, mimic this.
Aspect ratio 1:1, 2K.
```

Thumbnail / face swap:
```
Replace the person in the attached thumbnail with the person in the
attached reference photo. Keep the style, text and composition identical.
Cinematic and dramatic lighting on the face.
```

Agent instruction after saving the asset:
```
Use public/hero-header-video.mp4 as the hero animation on the right pane.
Make sure it is not cut off at any screen size, set the container
background to match the video background, and place two glassmorphism
cards over it.
```

## Pitfalls Nick calls out

- Wrong aspect ratio means the asset gets cropped or letterboxed in the slot.
- "Fully white background" is not guaranteed. Expect to remove backgrounds or match container colors.
- Generated faces drift (nose shape, skin texture, bonus beard). Generate three, keep the best.
- Big image inputs burn usage. Downsize before uploading.
- Credits run out mid-session. Have a second account or budget.
- Credit the original designers when you borrow a community asset for a demo. Do not use someone's Dribbble shot as-is in a live product.

## How Caleb should use this

- AIRE logo and a subtle looping hero animation for calebjackson.org.
- Listing graphics: a consistent template where the property photo and price swap in, generated at Instagram and Facebook aspect ratios.
- YouTube or Reels thumbnails for market updates with Caleb's face dropped into a proven layout.
- All of this bills the Google AI Studio account: needs Caleb's approval before running. Anything using a client's photos or a listing photo publicly also needs the client's okay.

## Verification

- Generated image has the intended aspect ratio and resolution in its file properties.
- The video loops without a visible jump and plays from `public/` on the local site.
- The logo reads clearly at 32 px and at 512 px.
- The thumbnail variant matches the inspiration's composition with the correct face and no extra fingers.
