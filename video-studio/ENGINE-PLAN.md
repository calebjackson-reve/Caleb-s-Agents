# The video editing engine: build plan

Date: 2026-11-06. Written after reading the 24 millee.md guides and the six skill files (`lessons/millee-md-guides/`), on top of round 1 research (`research.md`). Caleb asked for a plan, so this is the plan. Nothing here is built yet.

**The short version.** Build the engine as a Remotion project on the Mac mini, run by Claude Code from Terminal, following Michael Ly's `remotion-reel` method: Caleb films a talking head on his iPhone, drops it in a folder, describes the edit, reviews a storyboard with Keep, Maybe, Drop per beat, and gets a finished reel. Higgsfield supplies disclosed b-roll, ffmpeg and whisper.cpp do the measuring, Metricool takes the draft. Everything in the stack is free or already paid for. Incremental cost at medium volume: $0 a month. Phase 0 is one session and fully reversible.

Labels: **from the source** cites `research.md` or the lesson. **Applied** is the design choice, inference. **Not verified** is a number nobody has tested on Caleb's gear yet.

---

## Phase 0 result (2026-11-05 evening Central, Caleb's Mac mini session)

Phase 0 ran in about 40 minutes, most of it sandbox and sign-in detours, and the chain holds. Numbers from `STATUS.md`:

| Measured | Result |
|---|---|
| Machine | Apple M6, 12 cores, 16 GB, 44 GB free after installs |
| Brand sample render | 6 frames in 4 seconds, all six approved by Caleb |
| Proof take | first 20 s of a 1280x720 landscape TC ad recording, cropped to vertical |
| Frames | 605 in, 605 out, 20.17 s |
| Render | 14 seconds at 1080x1920, crf 17, 14.3 MB |
| Audio | voice gain 0.9989, added audio -83.7 dB (nothing added) |
| Transcript | 42 words, one pass, 3 real defects found and fixed in ingest |

The three defects were real and are now engine rules: the camera file's audio starts 153 ms after its video, so ingest pads audio to zero. Brand names stay whole and capitalized. A caption clears 12 frames after its last word when a pause follows, and whisper's padded word ends are checked against the loudness envelope. The hook touched the cap in the first second only because the landscape crop left 175 px of headroom where a two-line hook needs 210. A vertical iPhone take fixes that.

One thing the plan did not know on 2026-11-06: **Caleb already has a listing tour engine** at `~/reels/` on the Mac mini, with a finished 4K reel, a playbook and a compliance script. This engine is its sibling for talking-head video. Section 10 of `engine/brand/BRAND.md` says how they share the brand sheet and where they still disagree (the gold title).

## Blueprint

### 1. What the engine does, start to finish

| Step | Who | What happens | Files |
|---|---|---|---|
| 1 Brief | Caleb, 2 min | Says what the video is about in plain words (a listing, a stat, a question he hears every week), the platform, the length. | `briefs/<video>.md` (git-ignored folder, already in `.gitignore`) |
| 2 Script | Claude | Runs the eight-step scripting workflow from `research.md` Track 1: two reference teardowns if Caleb named any, 5 to 10 hooks scored down to A and B, a two-column audio and visual script at 130 to 150 words a minute, shot list, caption and CTA, then `ai-compliance-check`. Written with the structural rules from the `/human` skill digest. | `video-studio/engine/src/<video>/brief.md` |
| 3 Approve the script | Caleb, 5 min | Picks hook A or B or edits. | chat |
| 4 Film | Caleb, 10 min | iPhone rear camera, 4K 30fps, eye level, clip-on mic, same spot every time, per `programs/ai-for-agents/PRODUCTION.md`. Says "cut cut" after a flub and restarts the sentence. AirDrop to the Mac. | `engine/public/recordings/<video>.MOV` |
| 5 Ingest and measure | Claude, automatic | Transcode to H.264 mp4 at 30fps. Transcribe once with whisper.cpp to word timestamps. Detect Caleb's own cuts at scene threshold 0.05. Extract grid frames and record hair top, eye line, mouth, chin, mic landmark. Print the frame map: every beat anchored to a word start or a cut. | `recordings/<video>.mp4`, `<video>.words.json`, `<video>.measure.json` |
| 6 Assets | Claude, with a credit gate | Listing photos and Caleb's own clips from the folder. Market stats from `aire/market-data/` with source and date. Screen recordings of Pipeline or the market page if the script shows them. Generated b-roll only where the script calls for it, from Higgsfield, after Caleb approves the credit estimate, and tagged for disclosure. | `public/images/`, `public/screen-recordings/`, `public/broll/` |
| 7 Build | Claude | One Remotion composition per video. Brand sheet drives colours, type, caption style. Layout per segment from the five layouts, switched only on Caleb's own cuts. Captions 1 to 3 words, measured baseline, colour by measured luminance. 3 to 6 motion graphics in a 50-second reel, each with a job (prove, explain, show, feel, emphasize), each anchored to a word. Music bed 15 to 18 dB under the voice, cues fired early by their measured lead. | `src/<video>/<Video>.tsx`, `src/shared/` |
| 8 Verify | Claude, automatic | One range render per graphic to a contact sheet. `camera-check.py` on every screen-recording move. `verify-audio.py` on the render. Safe area check x90 to x990, y285 to y1635. Compliance check on the final caption text. VMAF of the delivered render against the master above a threshold Caleb sets after the first run (ffmpeg on the Mac has libvmaf). | `$TMPDIR/check/`, `out/<video>/report.md` |
| 9 Storyboard review | Caleb, 5 min | A private Artifact page: one clip per beat, Keep, Maybe, Drop, notes, Submit. Claude applies the round, replies per beat, re-renders, same URL, round 2. | `out/<video>/storyboard.html` |
| 10 Deliver | Claude | `out/<video>/<video>.mp4` at 2160x3840 (4K, rendered at `--scale=2` in chunks per the listing playbook), a 1:1 and 16:9 reframe when the brief asks, the cover frame, caption text with 3 to 5 hashtags, and a Metricool draft created for review, never scheduled. Two versions when hooks A and B were both filmed, per the teardown skill's rule. | `out/<video>/` |
| 11 Approve and post | Caleb | Schedules in Metricool. | Metricool |
| 12 Learn | Claude | Appends to `video-studio/STATUS.md` what changed and what Caleb corrected. Corrections that will recur go into `brand/BRAND.md` as learned rules. `teardown-tuesday` reads the 7-day value metrics (saves, shares, DMs, link clicks) the following week. | `STATUS.md`, `brand/BRAND.md` |

Approval points are steps 3, 6 (credits), 9 and 11. Nothing posts, spends or publishes without one.

### 2. The stack and what each piece costs

| Piece | Job | Cost | Status |
|---|---|---|---|
| Remotion 4 | The timeline, compositions, captions, render | Free. Remotion's license covers an individual for commercial use and any team of up to 3 people. $25 a month per seat only if Caleb grows past 3 people who write Remotion code. | **from the source**, `research.md` and the lesson's Proof |
| ffmpeg 9.0.2 | Transcode, cuts, frames, clips, contact sheets, VMAF | Free, installed via Homebrew with VideoToolbox and libvmaf | Confirmed by Caleb 2026-11-05 |
| whisper.cpp with `ggml-small` | Word timestamps, re-timing | Free, builds from source, English small model about 500 MB | **not verified** on the Mac mini |
| Node.js LTS | Runs Remotion and the transcribe script | Free | **not verified** installed |
| Python 3 with numpy and Pillow | The five measuring scripts | Free | Python is on the Mac (Pipeline runs on it). numpy and Pillow **not verified** |
| `remotion-reel` skill plus `remotion-dev/skills` | The method, the components, the official Remotion rules | Free downloads | Fetch script written, not yet run on the Mac |
| HyperFrames | Optional, phase 3: shader transitions, 3D, hand-drawn annotation, local background removal | Free, Apache 2.0, Node 22 or later | Phase 3 only |
| Higgsfield Plus | Generated b-roll, disclosed | Already paid, 270.7 credits on 2026-11-05, 1,200 a month on Plus per a third-party price capture | Connected |
| Metricool | The draft and the schedule | Already paid | Connected |
| Google Chrome | Remotion's and HyperFrames' headless renderer | Free | On the Mac for Claude's browser |

Incremental spend to run the engine at medium volume: $0 a month, plus Higgsfield credits only when a brief calls for generated b-roll (estimate shown before each run). **Applied**, from the table above.

### 3. Why this and not the alternatives from round 1

- **Not invideo timeline editing (candidate B).** invideo can only be driven through its full connector from Claude Code, its credit counts conflict between its own pages, and the account shows 50 credits. Remotion gives the same op-by-op control with no cloud dependency and a proven creator workflow attached. **Applied**, from `research.md` Track 4 and the lesson.
- **Not CapCut.** No API. Stays as the manual fallback in `PRODUCTION.md`. **from the source**, `research.md`.
- **Not Descript.** Best human editor, but $24 to $35 a month and its API is not on any plan card. Revisit if Caleb wants to hand-edit long form. **from the source**.
- **Not the ffmpeg-only scripts (candidate A as first written).** They cut silence and fix loudness but cannot place captions, layouts or graphics. The Remotion engine includes them as its ingest step, so nothing is lost. **Applied**.
- **Not HyperFrames as the base.** Michael Ly tried it and kept Remotion for the reel because captions, cameras and audio verification all live there. HyperFrames is an asset generator. **from the source**, `remotion-reel-digest.md`.

### 4. The project layout on the Mac

```
Caleb-s-Agents/video-studio/engine/
  brand/BRAND.md               colours, type, caption style, hook style, motifs, music  (in git)
  brand/*.tsx                  theme code (in git)
  public/recordings/           takes and .words.json            (git-ignored)
  public/screen-recordings/    screen captures                  (git-ignored)
  public/images/  logos/       stills                           (git-ignored)
  public/broll/                Higgsfield clips, each with a .disclosure.txt (git-ignored)
  public/music pack/  sound pack/   Caleb's licensed audio      (git-ignored)
  bin/whisper.cpp/             built binary and models          (git-ignored)
  scripts/transcribe.mjs       whisper wrapper                  (in git)
  scripts/*.py                 our copies of the measuring scripts, adapted (in git)
  src/shared/                  Caption, TextHook, TwoThirdsPanel, Silhouette, our additions (in git)
  src/<video>/                 one folder per video             (in git, no media)
  src/Root.tsx                 registers compositions           (in git)
  out/                         renders and storyboards          (git-ignored, already in .gitignore)
```

Code goes to GitHub, media never does. `.gitignore` already covers `public/`, `bin/`, `node_modules/` and `out/`. Client data rules in `CLAUDE.md` still apply to anything in `src/` and `brand/`. **Applied**.

### 5. Phases

**Phase 0, set up and prove the chain. One session on the Mac mini, about an hour. $0.**
1. `sh tools/fetch-millee-skills.sh`, link `remotion-reel` into `~/.claude/skills/`, then `npx skills add remotion-dev/skills`.
2. Install Node LTS if missing. Create the Remotion project at `video-studio/engine/` with the setup prompt pattern from the Claude x Remotion guide (TypeScript, whisper.cpp built, transcribe script, media folders, Chrome check). Record the Mac mini's chip and cores in `STATUS.md`.
3. Write `brand/BRAND.md` from `website-rebuild/DESIGN-SYSTEM.md` (ink, ivory, ember once per view, stone, Instrument Serif display, Hauora body). Caleb confirms this palette is the current Keller Williams First Choice era and not a Rêve carry-over. Render three sample caption and hook frames and get a yes.
4. Prove the chain on a 20-second test take of Caleb saying anything: transcode, transcribe, measure, one caption layer, one text hook, render, `verify-audio.py`. Done when the mp4 plays with captions on the right words and the frame map matches the transcript. **Not verified** until it runs.

**Phase 1, the first real reel. One filming day plus one edit session.**
1. Caleb picks the topic. Because the listing tour engine in `~/reels/` already covers property tours, the first run of this engine should be a talking-head piece: one market stat from `aire/market-data/` with its source, or one buyer or seller question he hears every week, or the TC system ad he already recorded. Filmed vertical on the iPhone with headroom. Hooks A and B scripted and compliance-checked. He films both hooks and one body.
2. Full pipeline. Ingest, measure, 3 to 5 graphics (at least one "prove" with a sourced number on screen, one "show" with his own photos), captions, a music bed from his own pack, storyboard round, round 2, deliver two versions.
3. Metricool drafts for both. Caleb schedules one and holds the other for the test window per the teardown skill.
4. Measure the time Caleb spent and the time Claude spent, and log both in `STATUS.md` against Michael Ly's 20-minute claim.

**Phase 2, make it a skill.**
1. `skills/listing-reel/SKILL.md`: brief in, the twelve steps above out, with the approval points, the credit gate, the compliance check and the Metricool draft step baked in. Reads `brand/BRAND.md` and `aire/STACK.md`. Written per `aa-skills-as-sops`.
2. `video-studio/prompts/`: the exact hook, script, caption and b-roll prompts, one file each, so Caleb edits them in one place.
3. `brand/BRAND.md` gets a numbered Learned Rules section that grows from Caleb's storyboard notes (the self-modifying pattern from `aa-self-modifying-claude-md`).
4. Blind judge round 2 on the two real reels, with the anonymous peer-review stage from the council skill added to `video-judge.md`.

**Phase 3, widen.**
1. Higgsfield b-roll lane: Seedance 1.5 Pro or Kling for 5 to 8 second disclosed inserts, one `generate_video` per beat, 3 concurrent at most, credit estimate first, per `mk-ugc-video-ad-pipeline`.
2. Long form: a 16:9 composition for the Skool lessons so `PRODUCTION.md`'s CapCut steps can retire, and a clips lane that cuts each lesson into shorts using the same caption engine (the captions-and-clipping skill's rule: a human picks the moment, about 70 percent of auto-clips need cleanup).
3. HyperFrames for one named effect when a brief asks for it (a shader transition on a cut, a hand-drawn arrow on a listing photo), rendered as a transparent `.mov` and composited.
4. Carousel Studio for the listing and stat carousels, same brand tokens, same Playwright render discipline.
5. `teardown-tuesday` reads the results and proposes next week's two hooks.

---

## Proof

- The engine's steps 5 to 10 and their numbers (scene threshold 0.05, safe band y285 to y1635, 1 to 3 word chunks, 550 ms word cap, bed 15 to 18 dB under voice, five layouts, 3 to 6 graphics a reel, storyboard Keep Maybe Drop with a database-backed Artifact) are from the `remotion-reel` skill file, read 2026-11-06, digested in `lessons/millee-md-guides/remotion-reel-digest.md`.
- Step 2's scripting workflow is `research.md` Track 1, built from `skills/teardown`, the plugin scripting skills and `skills/ai-compliance-check`, read 2026-11-05.
- Step 4's filming setup is `programs/ai-for-agents/PRODUCTION.md`, written 2026-10-12. The "cut cut" restart is from `skills/nick-saraev/youtube-automation/yt-auto-video-editor/SKILL.md`.
- ffmpeg 9.0.2 with libvmaf and VideoToolbox: Caleb's Terminal, 2026-11-05, in `STATUS.md`.
- Remotion license thresholds and prices: https://www.remotion.dev/docs/license/faq, fetched 2026-11-06.
- HyperFrames license, Node 22 requirement, skills install: https://github.com/heygen-com/hyperframes, fetched 2026-11-06.
- Official Remotion skills and the install command: https://github.com/remotion-dev/skills, fetched 2026-11-06.
- Higgsfield balance and plan: `balance` call 2026-11-05 21:12 UTC. Plus credits per month: Krea price capture 2026-08-31, third party, in `research.md`.
- Brand tokens: `website-rebuild/DESIGN-SYSTEM.md`, drafted 2026-10-19 from the July 2026 brand package.
- The one-system rule, AI disclosure and the never-AI-listing-photos rule: `aire/STACK.md`, 2026-10-19.

---

## Unknowns

- **Resolved in Phase 0:** the Mac mini is an M6 with 12 cores, 16 GB and 44 GB free. Node 26, numpy and Pillow are present. A 605-frame 1080p render took 14 seconds. 4K render time is unmeasured on this engine (the tour engine's playbook reports 4 minutes for a 45-second reel).
- **The storyboard Artifact from the Mac's Claude Code.** This cloud session has the Artifact tool with the database capability. Whether Caleb's Mac session has it is unconfirmed. Fallback: a local HTML page with the notes saved to a JSON file in `out/`, same Keep Maybe Drop layout, no cloud.
- **Resolved in Phase 0:** the lav mic sits on the jacket below the safe band, so the caption baseline is 45 px below the chin. Caleb approved the palette by approving the six frames.
- **Whisper on local names.** Zachary, Bocage, St. Francisville, Prairieville and Louisiana street names will need a fix dictionary, keyed by index per the skill's rule. Size unknown until the first transcript.
- **Michael Ly's time claims.** Setup about 15 minutes, edits about 20 minutes. Phase 1 step 4 measures ours.
- **Caleb's music and sound packs.** The skill wants licensed originals in `public/music pack/` and `public/sound pack/`. What Caleb owns the rights to use on Instagram and Facebook is not recorded here. Until then, reels run with original audio only, which the reels-script skill says is fine for a founder voice.
- **The Instagram reference** `instagram.com/p/De2SEI7JP8r` by millee.md: age-restricted login wall, embed reports the post missing. Unread. If it is the Claude x Remotion demo reel, this plan already covers it. Caleb can open it on the Mac and say what it shows.

---

## Recommendations

1. **Say yes to Phase 0.** It is one session, costs nothing, changes nothing outside `video-studio/engine/` and `~/.claude/skills/`, and ends with a 20-second proof render Caleb can watch. If the chain does not hold on the Mac mini, we learn that for free.
2. **Pick the Phase 1 topic now** so the script can be written before the next filming slot. A listing with photos Caleb owns is the easiest first run because the "show" graphics need no generation and no credits.
3. **Skip the blind judge for round 1.** The judge was designed to compare candidate stacks on paper. The millee.md material settled that comparison with a working example that fits every rule in `aire/STACK.md`. Run the judge at round 2, on the two real reels, where it has outputs to score. If Caleb prefers the process as written, the designer agent can still write `dashboard-spec.md` from this plan in one pass.
4. **Keep invideo on the shelf, not cancelled.** If Phase 0 fails on the Mac mini, the invideo timeline path is the fallback and its research is done.
5. **Do the three Terminal checks before the session** so Phase 0 starts at step 2:

```bash
node -v
```

```bash
python3 -c "import numpy, PIL; print(numpy.__version__, PIL.__version__)"
```

```bash
sysctl -n machdep.cpu.brand_string hw.ncpu && df -h ~ | tail -1
```
