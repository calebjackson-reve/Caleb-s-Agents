# Listing reel playbook

Built from reel 01 (Acadian estate, St. Francisville), finished 2026-10-25 after 19 cuts. Follow this order and the first cut should land close to final.

## What Caleb approved (the target)
- Vertical 9:16, 4K final (2160x3840), about 45 s, 13 shots, every shot a smooth camera move.
- Outside first, it is the best footage: front of the house, front porch, backyard, pool, koi pond, guest suite, then a short inside run, then the pond, then the gate as the closer.
- No hard cuts. Every clip dissolves into the next in 12 frames, and every dissolve lands on a music beat.
- Elegant animated titles, only five or six. Ends on the gate with "Welcome home" and the brand sign-off line, then fades to black. No separate end card.

## Things Caleb rejected (do not repeat)
- Handheld walking shots back to back. Quick moving shots of any kind.
- Still photos with a Ken Burns push mixed with video. They looked horrific next to video.
- Clips under 2 s. Shots that pan into something unwanted, like the koi pan reaching the pavilion.
- A title that names one area over a shot of a different area, like "The backyard" over the front porch.
- Kitchen, dining and library made the middle drag. Lead with the strongest spaces.
- A gray-world color match at full strength. It turned fall trees orange. Clamp it.

## Steps
1. **Index the shoot.** Run scripts/index-footage.sh, then contact sheets. Flag kids, shooter shadows, hands and rotations.
2. **Pick the shots.** Use about 13 beats in story order: front hero, porch with the town name, backyard, pool, signature feature, guest house, two or three interiors, water or grounds, then the arrival closer.
3. **Make the motion.** Pull one clean frame per shot at 1080x1920 into projects/<reel>/stills/. Then use Higgsfield Kling 3.0 Pro, image to video, 9:16, 5 s, sound off. Prompt: "Slow smooth cinematic dolly push forward toward <subject>. Camera moves only, steady and even. Keep every object exactly as in the photo. No people, no new objects, no warping, no flicker." Pass declined_preset_id if it suggests a preset. Cost is 8.75 credits per clip. It needs the Plus plan, and the unlimited allowance does not cover Kling through MCP. Check every clip with a 6-frame strip before using it. Small natural motion is fine to ask for, like koi swimming, fans turning or leaves moving.
4. **Pick the music and find the beat.** Decode 60 s from the chosen start, then run scripts/beats.py on it. Fable by Jakob Ahlbom is 73 bpm, 0.82 s per beat, and starts at 32.31 s. Clip lengths are whole beats: hero 7, porches 3, most shots 4, closer 6.
5. **Grade and make 4K.** Run scripts/grade4k.py <edl> footage/<shoot>/raw remotion/public/segs4k 2. It color-matches each clip toward the group, with a 0.5 strength and a plus or minus 6% clamp per channel. It applies one shared look: an S-curve, vibrance 0.22, a light warm balance, sharpening and a soft vignette.
6. **Assemble.** Write remotion/tour-props.json with segs, xfade 12, cardFrames 0, brandFrames 96, fadeOut 18 and titles. The Tour composition handles the dissolves, LuxTitle (Didot, letter-by-letter rise, unblur and fade, gold hairline, soft shade) and BrandLine.
7. **Render.** Remotion runs outside the sandbox with Chrome. For 4K use --scale=2 in chunks of about 450 frames, then ffmpeg concat -c copy. One pass runs out of Chrome's video cache. Keep at least 6 GB free.
8. **Add music.** Music starts at offset 32.31 s, fades in 0.3 s and out 2.5 s, normalized to -14 LUFS, AAC 256k.
9. **Check compliance.** Run scripts/compliance-check.sh. onscreen-text.txt lists every title. The caption discloses AI motion. Name, REALTOR, Keller Williams First Choice and license 995709547 must be on screen.

## Title set that worked
Welcome / Come tour this home / with me. Louisiana / St. Francisville. Out back / The backyard. The grounds / A koi pond out back. On the grounds / Mother-in-law suite. Welcome home, with the brand line under it.

## Time and cost on reel 01
About 22 Higgsfield clips, roughly 190 credits including retries. 4K grade 3 min, 4K render 4 min.
