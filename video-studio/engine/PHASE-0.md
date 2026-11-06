# Phase 0 runbook: set up the engine and prove the chain

Approved by Caleb 2026-11-06 ("Yes on phase 0"). One session on the Mac mini in Apple Terminal with Claude Code, about an hour. Costs nothing. Everything it creates lives in this folder, `~/.claude/skills/` and Homebrew. Rendering needs Claude Code on the Mac, not the chat app, because Remotion and ffmpeg run locally. Looking at the sample frames and saying yes or no can happen anywhere.

Report back in `video-studio/STATUS.md`: chip, cores, free disk, Node version, each step's result, the proof render's duration and frame count, and the time the session took.

## Before the session (Caleb, 1 minute)

```bash
node -v
```

```bash
python3 -c "import numpy, PIL; print(numpy.__version__, PIL.__version__)"
```

```bash
sysctl -n machdep.cpu.brand_string hw.ncpu && df -h ~ | tail -1
```

## Step 1. Pull the repo and fetch the skills

```bash
cd ~/Caleb-s-Agents && git pull
```

```bash
sh tools/fetch-millee-skills.sh
```

```bash
ln -sfn "$PWD/skills/third-party/millee-md/remotion-reel" ~/.claude/skills/remotion-reel
```

```bash
npx skills add remotion-dev/skills
```

Done when `ls ~/.claude/skills/remotion-reel/SKILL.md` prints the path and `npx skills add` reports the 13 Remotion skills.

## Step 2. Node, Python and the tools

Pre-check results, 2026-11-06 (Caleb's Mac session): Node v26.12.1, Python 3.15.1 from Homebrew, numpy 2.5.4, Pillow missing. Mac mini, Apple M6, 12 cores (2 Super, 4 Performance, 6 Efficiency), 16 GB memory, 48 GB free of 228 GB.

Node is fine (HyperFrames needs 22 or later). Homebrew's Python refuses `pip install` (PEP 668, externally managed), and the Claude Code sandbox cannot write to `/opt/homebrew`, so Caleb runs this one line himself with the `!` prefix in the Claude Code session, or in a plain Terminal tab:

```bash
brew install pillow
```

Then confirm:

```bash
python3 -c "import numpy, PIL; print(numpy.__version__, PIL.__version__)"
```

ffmpeg 9.0.2 is already installed (confirmed 2026-11-05). Google Chrome is on the Mac. Nothing else to install for Remotion itself.

Disk note: 48 GB free is enough for Phase 0 (whisper models about 650 MB, node_modules about 1 GB, renders a few hundred MB). Background removal in Phase 3 writes ProRes 4444 at about 340 MB per 7 seconds, so cut-outs stay short and `out/` gets cleared between videos.

## Step 3. Create the Remotion project here

Open Claude Code in this folder (`video-studio/engine/`) and paste:

```
Set up this folder as the video editing engine from video-studio/ENGINE-PLAN.md.
1. Create a Remotion project in TypeScript in this folder with /remotion-create (1080x1920, 30fps). Keep brand/BRAND.md and PHASE-0.md, they are ours.
2. Make the folders: public/recordings, public/screen-recordings, public/images, public/logos, public/broll, "public/music pack", "public/sound pack", public/fonts, out. They are git-ignored.
3. Build whisper.cpp into bin/whisper.cpp and download the base.en and small models. Write scripts/transcribe.mjs that wraps whisper-cli and writes [{text,startMs,endMs}] word JSON next to the recording, the way the remotion-reel skill describes.
4. Copy the remotion-reel skill's components (Caption, TextHook, TwoThirdsPanel, Silhouette) into src/shared/ and swap their colours and fonts for brand/BRAND.md: ivory fill and ink outline captions, Hauora or Instrument Sans, Instrument Serif for display. Copy its five Python scripts into scripts/ unchanged.
5. Confirm ffmpeg, ffprobe, node, whisper-cli and Chrome all run. Do not build any video yet.
Report what you installed and anything that failed.
```

Done when `npx remotion studio` opens with an empty composition and `bin/whisper.cpp/build/bin/whisper-cli -h` prints its help.

## Step 4. Fonts

Instrument Serif and Instrument Sans load from Google Fonts inside Remotion. Hauora is the brand body face: if Caleb has the files from the July 2026 brand package, drop the `.woff2` or `.ttf` files into `public/fonts/`. If not, Instrument Sans stands in and the sample frames say so.

## Step 5. Sample frames for the brand sheet

Ask Claude Code:

```
Render six still frames from brand/BRAND.md so Caleb can approve the look, each 1080x1920 at full size, into out/brand-samples/:
1. a caption chunk (ivory fill, ink outline) over a dark test frame
2. the same chunk flipped (ink fill, ivory outline) over an ivory ground with the 4 percent code grain
3. the default text hook, two lines, above where a head would be
4. the title pair: an Instrument Serif Italic word over an uppercase line, ivory on ink, ember period
5. a stat tile: a serif number, a Hauora label, a stone source and date line, on ivory
6. the end card: Caleb Jackson, Keller Williams First Choice, the Call or text pill
Use the one-range-render method, not six single stills. Then build one contact sheet with ffmpeg and open it.
```

Caleb looks and says yes, or names changes. Changes go into `brand/BRAND.md` section 9 as learned rules. Done when Caleb has said yes to all six.

## Step 6. Prove the chain

Caleb films a 20-second take on the iPhone saying anything about a listing or the market (rear camera, 4K 30fps, eye level, the clip-on mic), AirDrops it, and drops it in `public/recordings/test.MOV`. Then:

```
Run the full remotion-reel ingest on public/recordings/test.MOV: transcode to H.264 mp4 at 30fps and confirm the frame count, transcribe once to test.words.json, detect my cuts at scene 0.05, extract three grid frames and record hair top, eye line, mouth, chin and where the mic is or is not, and print the frame map. Then build one composition with the brand captions and the default text hook with the words "Testing the engine / first run", render it to out/test/test.mp4 at crf 17, run verify-audio.py against the source, and tell me the render time.
```

Done when `out/test/test.mp4` plays with the captions on the right words, the text hook sits above the head inside the safe band, `verify-audio.py` reports voice gain about 1.0, and the frame map matches the transcript. Write the render time and the measured rows into `STATUS.md`.

## Step 7. Commit the code, not the media

```bash
cd ~/Caleb-s-Agents && python3 tools/check-no-client-data.py && git add video-studio/engine && git status --short
```

`public/`, `bin/`, `node_modules/` and `out/` are git-ignored, so only `src/`, `scripts/`, `brand/`, `package.json` and config land. Commit and push to the current branch, then add the Phase 0 entry to `video-studio/STATUS.md`.

## If something fails

- `npx remotion` cannot find Chrome: `npx remotion browser ensure` downloads a headless shell.
- whisper.cpp build fails: `xcode-select --install`, then `brew install cmake`, retry.
- A `.MOV` flashes in the render: it was not transcoded. Step 6 starts with the transcode for exactly this reason.
- Captions late by up to a second inside long speech: expected, that is what `scripts/retime-captions.py` is for. Not a Phase 0 blocker.

Phase 1 (the first real reel) starts only after Caleb says the proof render is right.
