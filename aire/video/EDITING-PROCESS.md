# Video editing process

For Grok bot, Claude Code, or any agent that cuts a video for Caleb. Follow the steps in order. Do not skip a step because the last job went fine.

Written 2026-11-19. Steps 1 and 5 are proven on a real Instagram reference. Step 0 is proven on a real 9.7 GB transfer and one real clip. Steps 0 to 6 were run on one real listing on 2026-11-19, to a preview. Step 7, the final export, has not been run on real footage.

## The one rule

**No cut starts until the reference has been watched start to finish and measured.** "Watched" means `teardown.json` exists and an agent has looked at every sheet. Reading the caption or one cover frame is not watching.

## Job folder

One folder per job, on the computer that holds the footage. Nothing in it goes to GitHub.

```
job/
  raw/           the clips, untouched
  music.m4a      a track Caleb has the right to use
  edl.json       the cut list. The only file that gets edited
  out/           previews, finals, timing.json
```

## Step 0. Get the footage

**The standard way in is a WeTransfer link** (Caleb, 2026-11-19). It has no size limit and works from any computer.

```bash
python3 aire/video/fetch.py "<wetransfer link>" job
```

It downloads the transfer and unzips every video into `job/raw/`. Add `--check` to see if a link is still live without downloading. Links normally stop working about a week after they are sent, so fetch the day the link arrives.

Do not pass raw footage through Google Drive. The Drive connector hands an agent nothing over 10 MB, and one real clip was 9.9 MB for 1.6 seconds of 4K.

**When two agents on different computers need the same footage**, the one holding it runs:

```bash
python3 aire/video/inbox.py job/raw
```

That writes `job/raw/proxies/` with a small copy of every clip under the same name, a `clip-log.csv` that flags dark, shaky and very short clips, and `all-clips.jpg`. Upload the `proxies` folder. A cut list written on the proxies builds the final from the raw clips unchanged. Add `--watch` to leave it running on a folder so new clips are handled as they land.

Nobody makes client footage public by link.

## Step 1. Watch the reference

```bash
python3 aire/video/watch.py "<link or file path>" --name <short-name>
```

It writes to `aire/video/out/<short-name>/`: the video, a time-stamped sheet of every half second, `teardown.json`, `teardown.md` and a proxy under 10 MB.

Then open every `sheet-N.jpg` and write down, in the job notes:

- The shot order by type (outside, door, detail, room, drone).
- Where text shows, what it says and how big it is.
- The look: frame shape, color, light.

If the link will not download, the tool says why. Instagram limits readers who are not signed in. Run it on a Mac that is signed in and add `--cookies-from-browser chrome`, or save the video by hand and pass the file.

## Step 2. Log the raw clips

Run the same tool on each raw clip so every clip has a sheet.

```bash
python3 aire/video/watch.py job/raw/IMG_0001.MOV --name job-IMG_0001
```

For each clip note the usable seconds, what room it is and which way the camera moves. A clip nobody has looked at does not go in the cut list.

## Step 3. Write the cut list

`edl.json` is the whole edit. Times are seconds into the raw clip.

```json
{
  "name": "listing-reveal",
  "fps": 30,
  "shapes": ["9x16", "4x3"],
  "music": "music.m4a",
  "clips": [
    {"src": "raw/IMG_0001.MOV", "in": 4.2, "out": 5.12},
    {"src": "raw/IMG_0007.MOV", "in": 1.0, "out": 2.84, "speed": 2, "focus": [0.5, 0.4]}
  ]
}
```

- `out - in`, divided by `speed`, is how long the shot runs on screen.
- `focus` is where the crop looks, `[left to right, top to bottom]`, 0 to 1. Set it on any shot where the vertical crop cuts off the subject.
- Take the shot count and shot lengths from the reference's `teardown.json`. Do not guess them.
- Clips shot at 60 frames a second can run at `"speed": 0.5` and stay smooth. That gives the slow push-in feel. Never slow a 30 frames a second clip, it turns choppy.
- An optional top-level `"titles"` list puts text on screen. Each title has `start`, `end`, a `y` position and `lines` with `text`, `size` and a `font` file. Sizes are a fraction of the short side, and a long line shrinks to fit.
- An optional top-level `"look"` holds ffmpeg filters for the color look, so the grade lives in the cut list too.

## Step 4. Build the preview

```bash
python3 aire/video/cut.py job/edl.json
```

One run builds every shape from the same cut list, so the vertical and the 4:3 never drift apart. A first run of 16 clips took 38 seconds on a 4-core box. Changing one clip and running again took 5 seconds, because finished clips are kept.

## Step 5. Check the cut against the reference

Run the watch tool on your own preview, then compare the two `teardown.json` files.

```bash
python3 aire/video/watch.py job/out/listing-reveal-4x3-preview.mp4 --name job-check
```

| Number | Pass when |
|---|---|
| Duration | Within 1 second of the brief |
| Shots | Within 10 percent of the reference |
| Median shot | Within 0.15 seconds of the reference |
| Longest shot | Not longer than the reference's longest, except the closing shot |
| Motion counts | No `stepped` shots unless the reference has them |
| Loudness | -14 LUFS, give or take 1 |

Then look at your own sheets for a cropped-off subject, a repeated shot, a shaky clip or a dark frame. Report the numbers and what you saw. Do not write "plays clean" without them.

## Step 6. Fix and repeat

Change `edl.json` only. Never hand-edit an output file. Run steps 4 and 5 again until every row passes.

## Step 7. Final export

Only after Caleb says the preview is good.

```bash
python3 aire/video/cut.py job/edl.json --final
```

Full quality took 77 seconds for 49 seconds of video in two shapes on the same box.

## Step 8. Log the time

`out/timing.json` is written for you. Add to the job notes: when the brief came in, when the preview went to Caleb, how many rounds it took and anything that broke. This is how the next audit gets real numbers.

## Reference style on file: Bay Creatives "vintage" (measured 2026-11-19)

Source: `instagram.com/p/DX16PojSA9s`, account baycreativesmedia, posted 2026-05-02. Numbers from `watch.py`. The look notes are from reading the sheets.

**Measured**

- 1440x1080, a 4:3 frame. 49.1 seconds. Loudness -14.1 LUFS.
- 56 shots, 55 cuts. Median shot 0.92 seconds. Shortest 0.13. Longest 2.0.
- **The motion is smooth, not stop-motion.** 51 of 56 shots show a new frame every 33 ms, which is plain 30 frames a second video inside a 60 frames a second file. Four shots are flashes and one is a near still. No shot is stepped.
- Hard cuts only. No fades, no wipes.
- Most gaps between cuts are 1, 2, 3 or 4 units of about 0.46 seconds. Two units, 0.92 seconds, is the usual shot.

**Order of shots**

1. 0.0 to 0.75: four flashes, each under a quarter second (a window, a room, a detail).
2. 0.75 to 2.1: the front of the house, wide and low.
3. 2.1 to 3.5: looking out the open front door, with the only text in the video. Small white serif, the street address on one line and the city under it, lower left of the doorway.
4. 3.5 to 7: light and shadow details, the front again, the first drone shot.
5. 7 to 37: room by room, one or two shots a room, each a slow push in or slide.
6. 37 to 45: two details, the back yard, the porch, drone shots.
7. 45 to 49: two wide drone shots of the town. These are the longest shots, about 2 seconds each.

**Look**

- Wide lens, low camera, slow moves.
- Warm inside, dark corners, deep shadows left dark.
- Nobody on camera. No voice. Music only.

**Inference, not measured**

- The cuts look timed to the music. The gaps fit a steady grid, but beat positions were not checked one by one.

## What the tools do not do yet

- Titles are plain text only: lines, size, position and a fade, set under `"titles"` in the cut list. No animation.
- Color look is a plain filter string in the cut list. It is not a real grade.
- Music only. Sound from the raw clips is dropped.
- Hard cuts only, which is all this reference needs.

## Never

- Never post, send or schedule a video. Caleb approves, then Caleb posts.
- Never put a client name, address or footage in GitHub.
- Never use the reference's song or footage in Caleb's video. The reference is for study only.
- Never use an AI-generated clip in place of a real room. Disclose any AI-generated clip.
- Never call a job done from a preview. Say "preview" until the final is built and checked.
