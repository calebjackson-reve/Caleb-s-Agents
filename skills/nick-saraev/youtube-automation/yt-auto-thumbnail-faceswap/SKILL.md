---
name: yt-auto-thumbnail-faceswap
description: Rebuilds a proven YouTube thumbnail with Caleb's face the way Nick Saraev does it, matching head direction (yaw and pitch via MediaPipe) to the closest photo in a reference bank before sending to Gemini Nano Banana Pro, three variations per run, then iterative text and color edits. Use when Caleb says "make a thumbnail like this one", "put my face on this thumbnail", "I need a thumbnail for the market update", or "the AI thumbnail doesn't look like me".
---

# Thumbnail face swap with direction matching

**Source:** Nick Saraev, "f*ck it. Here's how I automated my youtube channel in 24 mins", chapter 4 (https://www.youtube.com/watch?v=S3kdxriOESk&t=960s). Free files: https://drive.google.com/drive/folders/1bOQ0EY2eLk7BNnQ9PAwD-x5C6y7x-Fz- (directives/recreate_thumbnails.md, execution/analyze_face_directions.py, execution/recreate_thumbnails.py).

## What Nick teaches
Most people drop their photo and a target thumbnail into an image model and say "replace the face." It fails often, and Nick found the reason: face direction. If the source subject looks straight at the camera and your reference photo is three-quarter profile, the model has to invent your face at an angle and lands in the uncanny valley. His fix: analyze the source thumbnail's face yaw and pitch with MediaPipe, then pick the reference photo of himself whose pose is closest by Euclidean distance, send the source plus two references to Gemini Nano Banana Pro with a face-swap prompt, and always generate three variations because results vary run to run. Then refine with edit passes: "change Pastor X to Nick, change the title text to Y, swap the profile pic." Several thumbnails can run in parallel. One-time setup is a bank of 30 to 40 photos of yourself at different angles, auto-renamed like `name_yawL30_pitchU10.jpg`.

## Step by step
1. One-time: take 30 to 40 photos of Caleb looking left, right, up, down and dead center, same lighting, plain background. Drop in `.tmp/reference_photos/raw/` and run `python3 execution/analyze_face_directions.py` (preview first with --preview). Fill coverage gaps the script reports.
2. Put NANO_BANANA_API_KEY (Gemini) in .env.
3. From an outlier-finder pick: `python3 execution/recreate_thumbnails.py --youtube "https://youtube.com/watch?v=ID"` or from a local image with --source. Default is 3 variations.
4. Open the three. Pick the one whose face reads most like Caleb. Expect one good, one odd, one younger-looking.
5. Edit pass: `python3 execution/recreate_thumbnails.py --edit .tmp/thumbnails/recreated_v1.png --prompt "Change the name to Caleb Jackson. Change the headline to MOVING TO BATON ROUGE? Keep the layout."`
6. Chain edits as needed, then export at 1280x720 and attach to the private upload.

## Templates / prompts
Edit-pass prompt pattern:
```
Swap the name text to "Caleb Jackson". Change the headline from "{{original}}" to "{{new headline}}".
Keep the composition, colors and face. Do not add any brokerage logo other than Keller Williams.
```
Reference bank naming (from the script): `caleb_yaw{L|R}{deg}_pitch{U|D}{deg}.jpg`, edit the "nick_" prefix in analyze_face_directions.py and recreate_thumbnails.py.

## Pitfalls Nick calls out
- Skipping direction matching is the main cause of bad swaps.
- Hair color and neckline drift. Fix with an edit pass, not a regenerate.
- One generation is a coin flip. Three is the minimum.
- You are copying a layout from someone else's video. Change the text and subject fully.

## How Caleb should use this
- Every YouTube upload and the cover frame for Reels and TikTok.
- Build the reference bank once on a clean day, headshot-quality, and reuse it for a year.
- Keep Keller Williams First Choice branding consistent across thumbnails, never Rêve colors.
- Gemini image generation costs per run, so bulk runs need Caleb's approval.

## Verification
- The reference bank lists at least 30 files with yaw and pitch in their names and no coverage gaps flagged.
- Three variation files exist per run, and the chosen one shows Caleb's actual hair color and face shape at the source's angle.
