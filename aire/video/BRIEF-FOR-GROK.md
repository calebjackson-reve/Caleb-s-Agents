# Brief for Grok bot: how Claude Code cut a listing video, and how to command it

Written 2026-11-19 by Claude Code, from one real job done that day. Every number here was measured in that session. The client's name and address are left out on purpose, because this file lives in GitHub.

Read this with `aire/video/EDITING-PROCESS.md`. That file is the method. This file is the audit: what happened, what was used, what broke, and what to hand Claude Code so it does not waste a round.

## The short version

- Claude Code used **no skills and no plugins** to cut the video. It used the terminal, ffmpeg, Python and seven small scripts it wrote during the job. Those scripts are now in `aire/video/`.
- The slow part was not editing. It was **getting the footage**. Five routes failed before one worked.
- The first preview went out about **33 minutes** after the footage link arrived. Each fix after that took **5 to 15 seconds** to rebuild.
- Claude Code got three things wrong along the way and Caleb caught two of them by eye. They are listed under Mistakes so you can check for them.

## Blueprint

What Claude Code did, in order.

1. **Watched the reference.** Downloaded the Instagram Reel with `yt-dlp`, then measured every frame: size, length, every cut, every shot length, whether motion was smooth, loudness. Looked at a picture sheet of every half second.
2. **Got the footage.** Downloaded a 9.74 GB WeTransfer zip straight to disk and unzipped 58 clips.
3. **Logged every clip.** Made a small copy of each clip, wrote a log (length, shape, frame rate, flags), and looked at seven frames from all 58.
4. **Wrote a cut list.** One file, `edl.json`. 56 shots, each given the exact length of the matching shot in the reference, in the reference's order.
5. **Built the preview.** One command built the 4:3 and the vertical from the same cut list.
6. **Checked it against the reference.** Ran the same measuring tool on its own output and compared the numbers. Looked at the output's picture sheets.
7. **Fixed and rebuilt.** Changed lines in the cut list, never the output file. Six rounds, four versions.
8. **Added what Caleb asked for.** A warm look, then no dark corners, a text hook with the address, a logo end card, the song on a review-only copy, cuts moved onto the song's real beats, the drone skyline as the hero shot, and calmer shots.

## Proof

### Tools Claude Code actually used

| Tool | What for |
|---|---|
| Terminal (bash) | Everything below ran here |
| ffmpeg and ffprobe | Reading, cutting, cropping, slowing, text, logo, loudness, picture sheets |
| yt-dlp | Downloading the reference Reel |
| curl | Downloading the footage from WeTransfer |
| Python with numpy and Pillow | Finding cuts, beats and camera motion. Building picture sheets. Fitting text to width |
| fonttools | Making a heavier weight of an open-license font for the titles |
| Its own image reading | Looking at picture sheets and single frames. Claude Code cannot watch video play. It judges from still frames and from measurements |
| Google Drive connector | Finding files, saving the cut list and notes. Not for footage |
| GitHub | Saving the scripts and the process file |

### Scripts written during the job, now in `aire/video/`

| Script | What it does | Measured |
|---|---|---|
| `fetch.py` | WeTransfer link to `job/raw/` | Confirmed a live 9.74 GB link. The unzip half has not been run end to end |
| `watch.py` | Link or file to a full breakdown and picture sheets | 25 s on the reference |
| `inbox.py` | Small copy and log row for every clip, flags dark and very short clips | 949 s for 58 clips of 4K. The slow step, once per shoot |
| `cut.py` | Cut list to video, every shape, with look, titles, logo, loudness | First build 165 s. One-shot fix 5 to 15 s |
| `beats.py` | Real beat times in a song, and cuts moved onto them | 27 s. 129 beats a minute on this song |
| `steady.py` | Moves each shot to the calmest moment of its clip, lists what is still not calm | 103 s. Shots over the limit went from 33 to 3 |
| `selftest.py` | Checks a computer can run the tools | 17 s, all pass |

`selftest.py` does not cover `beats.py`, `steady.py` or `fetch.py` yet.

### Skills and plugins: none used

Claude Code had many skills and plugins loaded in that session. It used none of them for the edit.

- **Available and not used:** HyperFrames, invideo, Higgsfield, Runway skills, the social media skill pack (CapCut, Reels script, captions, hooks), `yt-auto-video-editor`, `motion-reel`, `listing-reel-to-metricool`.
- **Why:** the job needed exact control of every frame from real footage, checked against measurements. Plain ffmpeg does that. Claude Code did not test whether any of those plugins would have done it faster or better, so that is an open question, not a verdict on them.

### Routes to the footage and the reference

| Route | Result |
|---|---|
| Google Drive connector download | Failed. Nothing over 10 MB comes through. One clip was 9.9 MB for 1.6 seconds |
| Setting a Drive file to "anyone with the link" | Blocked by Claude Code's permission system. Not a route |
| Caleb's Macs through Remote Control | Failed. Both Macs listed, neither offered a folder to the cloud session |
| Gmail search for the transfer email | Found nothing |
| **WeTransfer link pasted by Caleb** | **Worked.** 9.74 GB in about 4 minutes |
| Instagram page with a plain fetch | Failed. Login wall |
| Instagram embed in a headless browser | Showed caption and song name. Play led to a login page |
| **yt-dlp on the `/reel/` form of the link** | **Worked** with no login. The `/p/` form failed once on a rate limit |
| YouTube download of the full song | Failed, blocked. Claude Code only has the 49 seconds that were in the Reel |
| Uploading previews to Drive | Failed. Uploads from the session stop at about 3 MB. Previews were sent in chat |

### Timeline of the real job (clock times are UTC, from file stamps)

| Time | Event |
|---|---|
| about 19:20 | Reference downloaded and measured |
| about 19:45 | WeTransfer link arrives, download starts |
| 19:49 | Download done |
| 19:50 to 20:06 | All 58 clips shrunk and logged |
| 20:09 to 20:17 | First build, three rounds of fixes |
| 20:18 | Version 1 sent to Caleb |
| 20:26 | Version 2: dark corners off, text hook |
| 20:28 | Review-only copy with the song |
| 20:44 | Version 3: beats, skyline hero, address, logo |
| 20:59 | Version 4: shaky shots re-picked |

### What the finished preview measured

| | Reference | Version 4 |
|---|---|---|
| Length | 49.1 s | 49.1 s |
| Shots and cuts | 56 and 55 | 56 and 55 |
| Typical shot | 0.92 s | 0.93 s |
| Choppy shots | 0 | 0 |
| Loudness | -14.1 LUFS | -14.1 LUFS |
| Main cuts on a beat | not measured | 52 of 52, within 0.02 s |

### What Claude Code had to know

Nobody told it these. It needed them to do the job, and a brief that states them saves a round.

- **Match a reference by measuring it.** Shot count, shot lengths and cut times come from the reference file, not from a description of its style.
- **60 frames a second footage can run at half speed and stay smooth.** That gives the slow push-in feel. 30 frames a second footage cannot be slowed without turning choppy.
- **A vertical clip cropped to 4:3 keeps about 42 percent of its height.** Framing has to be checked on the 4:3, not assumed.
- **Cut to an exact number of frames.** Cutting by seconds let some clips run one frame long, and the error added up.
- **Beats come from the song file, not from a tempo number.** A tempo number drifts over 49 seconds.
- **"Shaky" means sway and tilt.** Gimbal footage has almost no jitter and still reads as shaky when the move wanders or the frame rolls.
- **Loudness has to be measured after the limiter,** then corrected. One pass undershoots on punchy music.
- **Text size has to come from the short side of the frame,** or it overflows the vertical version.
- **A commercial song baked into a file is a posting risk.** It belongs on a review copy only, and gets added inside Instagram for the real post.
- **Louisiana ad rules may want the brokerage name on screen with a team name.** Claude Code flagged this and did not verify it.

### Mistakes Claude Code made

| Mistake | How it showed | Fix |
|---|---|---|
| Said 47 of 51 cuts were on the beat. It had checked the plan, not the finished file | Caleb said the beats were off | Check is now run on the finished file |
| 17 of 56 clips ran one frame long, so cuts drifted up to half a second late | Found while fixing the beat check. Versions 1 and 2 both had it | `cut.py` now cuts to an exact frame count |
| First shake measure only caught jitter. Reported shake as fixed when it was not | Caleb said, twice, to take out the shaky shots | New measure for sway and roll, now `steady.py` |
| First loudness came out at -16.6, then -15.7 | Its own check | Loudness now measures and corrects itself |
| Added dark corners nobody asked for | Caleb asked for them off | Removed. Ask before adding a look |
| Text ran off the edge of the vertical version | Its own frame check | Text is sized off the short side and shrinks to fit |
| Calm picks landed on a door frame, an empty field and the same window three times | Its own picture sheets | Swapped by hand. Calm is not the same as good |
| Wrote the build tool's options in the wrong order when adding the logo | Build failed | Fixed in one round |

## Unknowns

- **Whether the plugins would have done better.** None were tried.
- **Whether version 4 looks steady to a person.** Claude Code measures motion and looks at stills. Caleb has not yet said version 4 passes.
- **Full-quality export on real footage.** Only previews were built. `--final` has only run on test clips.
- **How the tools run on your computer.** They ran on a 4-core Linux cloud box. `selftest.py` is the check.
- **Whether `yt-dlp` keeps working on Instagram without a login.** It worked once and failed once on the same day.
- **Where the Reel's 49 seconds sit inside the full song.**
- **The brokerage name rule** for this ad.
- **Cost.** Claude Code has no reading of what this session cost. Your one-run method was $10 for 31 minutes.

## How to command Claude Code

### Before you send the command, check these

```bash
python3 aire/video/selftest.py
```

```bash
python3 aire/video/fetch.py "<wetransfer link>" job --check
```

```bash
ffmpeg -hide_banner -filters | grep -E "drawtext|overlay|loudnorm|vidstab"
```

```bash
df -h .
```

Stop and tell Caleb if any of these fail. Free disk should be at least three times the size of the footage.

### What to put in the command

A command missing any of these cost a round on the real job.

| Give this | Why it mattered |
|---|---|
| Reference link, and a saved copy of the file if you have one | The reference decides every shot length |
| Footage as a **WeTransfer link**, never a Drive folder | Five routes failed before this one |
| Which shapes | 4:3, vertical, or both |
| Target length | Default is the reference's length |
| The hero shot, in words | "Drone skyline" came three versions late |
| Exact on-screen text: address, city, "presented by" line, brokerage | Claude Code will not guess an address |
| Logo file, transparent, at least 1000 pixels wide | The one supplied was 258 wide and will be soft at full quality |
| The song as a file, or "no music" | Without the file, beats can only be matched to a clip of it |
| The look, in words, and what you do not want | Dark corners were added and then removed |
| People on camera: yes or no | Six clips had a person. They were left out to match the reference |
| Any AI-generated clips allowed: yes or no | Default is no |
| "Preview first" | Default. Full quality waits on Caleb |

### Order of work to ask for

```
1. python3 aire/video/fetch.py "<link>" job
2. python3 aire/video/watch.py "<reference link>" --name <ref>
3. python3 aire/video/inbox.py job/raw
4. python3 aire/video/beats.py job/song.m4a --cuts aire/video/out/<ref>/teardown.json
5. Write job/edl.json using the shot_lengths from step 4
6. python3 aire/video/steady.py job/edl.json     then look at every swapped shot
7. python3 aire/video/cut.py job/edl.steady.json
8. python3 aire/video/watch.py job/out/<preview>.mp4 --name <check>
9. Send Caleb the preview with the comparison table
```

### What to demand back with every preview

- The comparison table against the reference.
- Beats checked **on the finished file**.
- The `steady.py` line: how many shots are over the limit, and why.
- A list of what is a stand-in (text, music, logo size).
- What was not checked.

Do not accept "plays clean" or "looks good". Claude Code cannot watch the video. Ask for the numbers and ask Caleb's eye for the rest.

### What Claude Code will not do

- Post, schedule or send anything. Caleb approves, Caleb posts.
- Put client footage behind a public link.
- Put a client name, address or footage in GitHub.
- Guess an address or any on-screen fact.
- Bake a commercial song into a file meant for posting.
