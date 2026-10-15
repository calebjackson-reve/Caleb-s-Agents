# Skool video editor

Two scripts that turn a raw challenge take into a cut that moves like Nate Herk's videos.

- `style_probe.py` watches a reference video and writes down how it's edited, in numbers.
- `skool_cut.py` edits your raw face take and screen recording to those numbers.

Built 2026-10-12. Draft. Nothing here posts or uploads anything.

## The mistake phrase (added 2026-10-15)

If you mess up a line, say **"Fuck that, Caleb"** and then say the line again. The cutter finds the phrase in the transcript and drops it along with the sentence you said right before it. It matches loosely, so whisper spellings like "F*** that, Kaleb" still count. A normal sentence like "but that, Caleb" stays in, because the first letter has to match.

After rendering, it transcribes the finished video again and reports `mistake_phrase_gone`. Tested on 2026-10-15:
- 5 word-list cases passed.
- A synthetic voice clip came out clean, even though whisper heard the phrase as "F*** heart, Calib".
- No real take with the phrase exists yet.

## Run it on your Mac

Use the same Python that Studio uses (`~/teardown-studio/.venv`). It already has faster-whisper and the `small.en` speech model. One time, in Terminal:

```bash
cd ~/Caleb-s-Agents/programs/ai-for-agents/editor
~/teardown-studio/.venv/bin/python -m pip install -r requirements.txt
alias skoolcut="HF_HUB_OFFLINE=1 ~/teardown-studio/.venv/bin/python $PWD/skool_cut.py"
```

Not yet checked on your Mac: whether that venv already has OpenCV and Pillow. The pip line adds whatever is missing. `HF_HUB_OFFLINE=1` keeps it from downloading anything, same as Studio.

Then, after filming Day 1:

```bash
skoolcut $HOME/Movies/skool/day-1-cut.mp4 \
  face:$HOME/Movies/skool/day-1-open.mov \
  screen:$HOME/Movies/skool/day-1-screen.mov \
  face:$HOME/Movies/skool/day-1-close.mov \
  --keywords "Claude,bio,prompt"
```

Clips play in the order you list them. `face:` is the iPhone take. `screen:` is the Mac screen recording with your voice on it. You get:

- `day-1-cut.mp4`: 1080p, 30fps, loudness at -14 LUFS
- `day-1-cut.edl.json`: every shot, where it came from, the zoom, the text, and the check against the targets
- `day-1-cut.work/`: work files. Delete it any time.

Your original files are only read, never changed.

Options:
- `--text full` puts running captions on instead of keyword pills. `--text none` has no text.
- `--model base.en` is faster and a little less accurate.
- `--spec specs/other.json` cuts to a different style.

## What the cutter does

1. **Finds every word.** It uses faster-whisper on your Mac. If that isn't installed, it falls back to pocketsphinx, then to silence detection.
2. **Cuts the dead air.** It drops any pause longer than 0.35 seconds and every "um" and "uh."
3. **Keeps the last take.** If you start a line, stop and say it again, it drops the first try. This is the same rule as PRODUCTION.md.
4. **Face takes.** It switches between wide and a 118% punch-in at each jump cut, so the cuts look like a second camera. No framing holds longer than 8 seconds.
5. **Screen recordings.** It finds the part of the screen that's changing, like the prompt box while you type or the reply as it streams in. It zooms there at 125 to 200% and re-aims every 5 seconds. A screen that isn't changing stays full.
6. **Text.** It shows a keyword pill when you say one of the `--keywords`, like Nate's "CLI · COMMAND LINE TOOL" labels. It won't show the same pill twice within 20 seconds.
7. **Checks itself.** It measures the finished file and compares it to the targets in the spec: cuts per minute, median shot length and longest silence.

## Proof it works (2026-10-12)

There's no Caleb footage yet, so the test used a fake raw take. The face part was built from 20 seconds of Nate's talking head with these added:
- a false start
- three long pauses
- a silent lead-in

The screen part was a 1080p browser recording of a bio prompt being typed and answered, with a robot voiceover. That voiceover had a false start ("Keep it under eighty." then "Keep it under eighty words, warm and direct.").

| Check | Result |
|---|---|
| False start in the face take | Dropped ("They don't cover." then the full line) |
| False start in the voiceover | Dropped |
| Raw to cut | 53.6 s of raw footage became 33.3 s |
| Cuts per minute | 12.6 (target 7 to 13) |
| Median shot | 4.47 s (target 3.5 to 6.5) |
| Longest silence | 1.08 s (target 1.2 or less) |
| Loudness | -14.8 LUFS, true peak -1.0 dBFS |
| Screen zoom | 200% on the prompt box while typing, 161 to 185% on the reply, full screen when nothing moves |
| Punch-ins | 100%, 118%, 100%, 118% across the four face shots |

The test cut has Nate's footage in it, so it's for checking only. It isn't in this repo and must never be posted.

## Nate Herk teardown

Source: "I Tried 100+ Github Repos for Claude. These 6 Are the Best," Nate Herk | AI Automation, uploaded 2026-10-11, 10:36, https://www.youtube.com/watch?v=HhZdNYI4pJs. Codex downloaded it on Caleb's Mac on 2026-10-12. Measured with `style_probe.py`. Full numbers are in `specs/nate-herk-2026-10-11-github-repos.json`.

### Blueprint

1. **The open is a motion graphic, not his face.** Animated GitHub cards count up to "100k," then a "Top 10" list appears. His face first shows at 0:15.
2. **Then he alternates.** About half the picture is him talking to the camera. The other half is screen recordings, motion graphics and stock B-roll. Each run of either lasts about 5 to 6 seconds.
3. **The picture changes about every 5 seconds.** There are 9.6 hard cuts a minute. Half of all shots are under 4.8 seconds, and 9 in 10 are under 12.
4. **One camera, one framing.** He barely punches in, about 4 times in 10 minutes. He changes the picture by cutting away to graphics instead.
5. **There are no pauses.** He talks the whole time, with no gap over 1 second between words, at about 250 words a minute on the finished cut.
6. **Labels instead of captions.** There are no running captions. Short teal-bordered pills name the thing he's talking about. One line in red text gets emphasis ("You don't have any video editing experience").
7. **A chapter card between sections.** The "Top 10 Repos" list comes back between items with the next one highlighted.

### Proof

- Steps 1 to 3: 102 cuts at scene score 0.30. Talking head 49% of the time, other 50%, face inset 0.6%. First face frame at 15.0 s. Face run median 6.0 s, other run median 5.5 s. Shot median 4.77 s, 90th percentile 11.87 s, longest 23.7 s. Contact sheet frames at 1 per second, checked by eye.
- Step 4: face width stays between 17% and 21% of the frame (10th to 90th percentile). There were 4 size jumps over 12% at cuts and 2 same-angle jump cuts.
- Step 5: YouTube's word-timed captions give 2,633 words. Pause median is 0.68 s start to start, and the longest gap is 1.0 s.
- Steps 6 and 7: seen on the contact sheets at about 3:30 to 4:30 ("CLI · COMMAND LINE TOOL," "Google cloud project") and at 0:20 to 0:40 (the Top 10 card).

### Unknowns

- **Whether the video is sped up.** 250 words a minute is fast for normal speech. It could be him, a speed-up in the edit, or both. The file can't tell.
- **Loudness.** It measured -19.4 LUFS, but this is YouTube's copy and may not be his master.
- **The "other" bucket isn't split automatically.** Screen vs graphic vs B-roll shares are read by eye.
- **One video is not a style.** Two or three more of his and two of Nick's would make the spec solid.
- **Nick Saraev's picture.** Only his captions were on the Mac (a 4-hour course from 2026-05-11, 237 words a minute, pause median 0.8 s). No video file, so no cut or framing numbers for Nick yet.

## What's different from Nate on purpose

- **Face first.** Nate opens on a graphic. The Day 1 film kit opens on your face with the promise, because your audience knows you, not your channel. The cutter keeps the order you film in. Your call.
- **Punch-ins.** Nate barely uses them because he has a motion graphics team. You don't, so the cutter uses 118% punch-ins at jump cuts to get the same picture change.
- **No motion graphics yet.** The chapter card and animated lists are the biggest gap between this and Nate. Studio or HyperFrames could make them as clips later.

## Next

- Measure 2 more Nate videos and 2 Nick videos on your Mac. yt-dlp works there.
- Run this on your real Day 1 takes.
- Hand the cut to Studio as a timeline so you can change it by voice there.
