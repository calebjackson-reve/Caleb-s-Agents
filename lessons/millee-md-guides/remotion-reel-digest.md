# remotion-reel: the method, in our words

Digest of Michael Ly's `remotion-reel` skill (zip dated 2026-10-14, read in full 2026-11-06). The original stays out of git. This is what the engine plan borrows and what it changes for Caleb. Everything under "the method" is from the skill file unless marked applied.

## What it is

A Claude skill that edits a vertical reel (1080x1920 at 30fps) end to end in code. Inputs: a talking-head take in `public/recordings/`, optional screen recordings, stills, a music pack and a sound pack, and the creator's brand sheet. Output: a rendered mp4 and a storyboard page the creator reviews beat by beat. The creator never opens a video editor.

Stack: Remotion (React video framework), ffmpeg (transcode, cut detection, frame extraction, contact sheets, clip cutting), whisper.cpp (word-level transcript, the `small` model with DTW timestamps for re-timing), Python with numpy and Pillow (measuring), HyperFrames (optional, one asset at a time, for shader transitions, real 3D, hand-drawn annotation, liquid glass, and local background removal).

## The method, step by step

1. **Ingest.** If the take is HEVC or `.mov`, transcode to H.264 mp4 at 30fps first. Remotion's video decoder shows duplicate-frame flashes on `.mov`. Confirm the frame count survived.
2. **Transcribe once.** `scripts/transcribe.mjs` wraps whisper.cpp and writes `<name>.words.json` as `[{text, startMs, endMs}]`. Never re-transcribe an unchanged file, because whisper jitters between runs and every anchored beat drifts.
3. **Measure the take before proposing anything.** Detect the creator's own cuts with a scene threshold of 0.05, not the default (0.15 misses soft cuts and a missed cut becomes caption drift). Pull a contact sheet to find footage the creator already edited and schedule around it. Extract frames with a drawn grid and read off the pixel rows: baked title bottom, hair top, eye line, mouth, chin, mic windscreen top and bottom. Record them per take. The Instagram 4:5 grid crop keeps roughly y285 to y1635 of 1920, so anything that must survive lives in that band.
4. **Map the brief to frames.** Every instruction becomes a frame number anchored to a word start or a detected cut, and the mapping is printed before building. "Around 30 seconds" is not a frame. "f894, their cut at 29.8s" is.
5. **Build.** One folder and one Remotion composition per video. The look comes from `brand/BRAND.md` (colours, type, caption and hook style, motifs, music), never from the skill. Reusable components ship with the skill and get copied into `src/shared/` on first use: `Caption.tsx`, `TextHook.tsx`, `TwoThirdsPanel.tsx`, `Silhouette.tsx`.
6. **Verify before rendering** with one range render to a frame sequence and a contact sheet, never a stack of single stills (each still re-bundles the project, 20 to 40 seconds).
7. **Render** at h264, crf 17. A 1,480-frame reel took about 70 seconds on his 12 cores.
8. **Verify the audio** by subtracting the source voice out of the render (`verify-audio.py`): voice gain about 1.0, music bed 15 to 18 dB under the voice, every sound cue visible as a peak at its frame, no new clipping.
9. **Deliver** the mp4, plus the single changed segment when a note touched one beat. Report changes in frames and timecodes. Flag trade-offs instead of resolving them silently.
10. **Storyboard review.** Render first, cut one 360px clip per beat from the render, publish `storyboard.html` as an Artifact with a database. Each beat shows the clip, timecode and frames, the line spoken, on screen, sound, assets have or need, then Keep, Maybe, Drop and a notes box. A sticky bar counts "N of M reviewed". Submit review ends the round. Claude reads the submission, applies notes (Keep leave, Maybe change per note, Drop cut the graphic), replies on each changed beat, re-renders the touched clips, bumps the round and republishes the same URL.

## Captions, the part creators notice first

- 1 to 3 words per chunk, at most about 17 characters, casual lowercase with a small dictionary of exceptions (I, AI, proper nouns) keyed by index.
- A chunk runs from its first word's start to its last word's end plus about 3 frames, with each word's end capped at start plus 550 ms. Never hold a line until the next one starts.
- The outlined TikTok style is an SVG `<text>` with a 10px black stroke painted behind a white fill (`paintOrder: stroke`), Inter 800 at 78px. Never CSS `WebkitTextStroke`, which fills the counters of letters.
- Colour per chunk by measurement: render the segment without captions at quarter scale, take the mean luminance of the caption band per frame, average per chunk, switch to black text with a white outline above about 140 of 255 (`caption-tone.py`).
- Placement on a talking head: baseline about 40 to 50 px below the highest point of the mic windscreen's top edge, never on the chin. Measured per take. Under a full-screen graphic, move it into the clear band, never drop it. Never let a line run across a format change.
- Re-timing when the creator says captions are behind: whisper drifts late inside long speech by up to a second and pads sentence-final words. `retime-captions.py` cuts the audio into 6-second windows stepping 2 to 2.5 seconds, transcribes each with DTW token timestamps, keeps only words in each window's accurate zone (1.1 to 3.6 seconds in), aligns to the approved word list with difflib, lets windows vote, takes the median, and interpolates words with no votes between their neighbours. Then checks every chunk start against a voice envelope so no caption starts in silence. Then re-derives every graphic that hangs off a word.

## The five layouts

| # | Layout | Captions |
|---|---|---|
| 1 | Talking head, full frame | on the mic windscreen top |
| 2 | 50/50 split, graphic above the seam at y960, the take cropped and scaled into the bottom pane (zoom at most about 1.3x, head top 25 to 60 px under the seam, measured across every frame because heads move) | just above the seam |
| 3 | Full-screen motion graphic | same spot as layout 1, graphic keeps that band clear |
| 4b | Two-thirds split, the default: graphic or screen recording full-bleed y0 to 1400, the take at 1:1 in a full-width panel with 110px rounded top corners starting about 40 px above the cap, whole head inside | 35 px above the panel edge, colour by background |
| 5 | Full screen plus a matte cut-out of the creator at 0.55 scale standing at the bottom edge | above the cut-out's head, about y1185 |

Switch layouts only on the creator's own cuts.

## Motion graphics rules

- Read the story (hook, setup, turn, payoff, CTA). In a 50-second reel, 3 to 6 graphics, with clean talking head between them. A graphic on every line is noise.
- Each moment gets a job: prove (the real source, its actual figure), explain (a drawn analogy), show (the real screen recording or redrawn UI), feel (a scene), emphasize (cinematic type, and while the words are on screen as type, hide the regular captions).
- Safe area for every graphic: x90 to x990, y285 to y1635. Measure the rendered pixel extents, never eyeball.
- Graphics start on the word's frame already moving. No fade-ins on short-form. Key hits land on the words they illustrate.
- Overlay images go big and centred over the face, hair to chin. Small tiles at the edges get cut off on Instagram.
- Two modes: "illustrate it" (Claude picks, shows on the storyboard) or "pitch me" (2 to 3 angles per moment, wait for picks).
- His taste rules, which Caleb's brand sheet will replace: no purple, no busy animated backgrounds behind a cutout, no skin smoothing, no letterbox bars, no scrapbook collage, no clip-art, no slam stamps, no centre glow, no image-generator art unless asked.

## Screen recordings

A 16:10 recording in a 9:16 frame: bleed against the app's own flat edge colour (measure it, mean and standard deviation of the top and bottom rows, and sample per frame because a modal dims it), or split screen, or crop only when the region is narrow. Camera keyframes in source pixels (window width plus centre). Never clamp the centre with a "stay inside the source" rule, it collapses to one value and snaps the frame. Clamp against a fixed bleed allowance instead. `camera-check.py` replays the path and flags any per-frame move over about 25 output px as too fast. Pre-cut every clip to its exact frame count. Mute every screen recording.

## Audio

Trim music in code with `trimBefore`, never write trimmed copies. Profile the track's RMS envelope to choose the start, usually the full-band downbeat. Bed at 15 to 18 dB under the voice, gain set from the measured mean. Every sound file carries silence before its hit, so fire each cue early by its measured lead. Propose sound effects as a list with frames and expect the creator to cut about a third.

## HyperFrames, only as an asset generator

Remotion owns the reel. HyperFrames renders one asset at a time when a look is easier there: WebGL shader transitions, light leaks and grain overlays, real 3D, hand-drawn annotations with boil, liquid glass, ready-made vertical mock UI, maps and chart races. Author at 1080x1920 and in reel time, render to a ProRes 4444 `.mov` for transparent overlays (never the `.webm`, whose alpha renders fully transparent in Remotion), composite inside an `AbsoluteFill` wrapper. 3D and shader blocks are hard-coded 16:9, so use them as a band or quote the retargeting work. Telemetry off. Background removal: `npx hyperframes remove-background clip.mp4 -o clip-subject.mov --quality best`, about 5 to 6 fps on Apple silicon, 340 MB per 7 seconds, so cut out only the stretches that need it.

## The 13 gotchas, kept

`.mov` in the video component flashes. Trim music in code. Two video elements on the same file deadlock the decoder. Whisper emits punctuation as words. Whisper drifts late. Key word fixes by index not timestamp. A re-exported take re-paces non-uniformly, re-detect every anchor. The camera clamp pinches. Mute screen recordings. Check the creator's cuts before a caption spans one. `interpolate()` needs an increasing input range. A second video layer needs its own `AbsoluteFill`. Render sequences name frames without padding.

## What changes for Caleb (applied)

- The brand sheet comes from `website-rebuild/DESIGN-SYSTEM.md`: ink `#14100E`, ivory `#FBF8F3`, ember `#E87757` once per view, stone `#8D8578`, Instrument Serif for display, Hauora for body and labels. Caleb confirms this is the current Keller Williams First Choice era palette and not a Rêve carry-over before it goes in `brand/BRAND.md`.
- Every measured constant (windscreen row, cap top, caption baseline) is re-measured on Caleb's takes. His setup from `programs/ai-for-agents/PRODUCTION.md` is an iPhone at eye level with a clip-on mic, so the mic landmark may be a lapel, not a handheld windscreen.
- The compliance check runs on the script and the caption text before the storyboard round.
- Generated b-roll from Higgsfield is disclosed on screen or in the caption, and never shows a listing, a neighbourhood or a person as real.
- The storyboard review stays private and the finished mp4 goes to Metricool as a draft. Caleb schedules.
