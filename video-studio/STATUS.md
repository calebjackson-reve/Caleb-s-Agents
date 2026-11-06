# Video studio status log

Newest first. Every entry says what was done, what it was based on, and what needs Caleb.

## 2026-11-05, night (Central): cloud side caught up with Phase 0

Dates in this log: the Mac mini entries are Caleb's local time (Central). The entries written from the cloud session on "2026-11-06" were UTC and belong to the evening of 2026-11-05 Central. From here on, Central.

**Confirmed by Caleb**
- Phase 0 step 6 ran on a real take and pushed (commits 373c75a, df57dac, 3f53ad8). He is watching `engine/out/test/test.mp4`.

**Done (cloud session, pulled the three commits first)**
- `engine/brand/BRAND.md`: end card now carries REALTOR and the license line per `~/reels/CLAUDE.md`, the pill has its 1px ivory edge, and a new section 10 sets 4K finals, records that the listing tour engine in `~/reels/` is a sibling that is not rebuilt here, and names the one open conflict (Didot and gold hairline versus Instrument Serif and no gold).
- `ENGINE-PLAN.md`: Phase 0 result table, delivery changed to 2160x3840, Phase 1 topic steered to talking-head pieces since tours already have an engine, two Unknowns marked resolved.
- `README.md` file table: the playbook and the engine's real contents.

**Not verified**
- The proof render itself. It is on the Mac. Only Caleb can say whether the captions land on his words.
- 4K render time on this engine.

**Needs Caleb**
- Yes or no on the proof render.
- "No gold" or "keep gold" for titles.
- The Phase 1 topic: a market stat, a buyer or seller question, or the TC ad, filmed vertical with headroom.
- What to do with `~/Desktop/TC-Ad-Recordings` (the Mac session asked).

## 2026-11-05, evening: Phase 0 steps 2 to 4 done, step 5 built and waiting on one render

Session on the Mac mini, Claude Code, started 20:46. Steps 2 to 4 took about 8 minutes. The work runs in a separate worktree (`.claude/worktrees/video-studio`) so the main checkout, which the live Pipeline LaunchAgents run from, is never switched again. Earlier in the session a branch switch in the main checkout stopped halfway and Caleb restored it with `git reset` and `git checkout HEAD -- .`. Pipeline on 4747 served every asset afterwards.

**Confirmed by Caleb**
- "Run steps 2 through 5 end to end. Step 1 is done. Review the five scripts in the remotion-reel skill before you copy them. Stop at step 5 and show me the six sample frames."
- Copy `~/reels/playbook/listing-reel.md` into `engine/brand/listing-reel-playbook.md` after checking it for client names and numbers.

**Machine** Apple M6, 12 cores (2 Super, 4 Performance, 6 Efficiency), 16 GB, Node v26.12.1, 44 GB free after the installs (48 GB before).

**Step 2. Tools: pass**
- ffmpeg and ffprobe 9.0.2, Node v26.12.1, npm 11.20.0, Python 3.15.1 with numpy 2.5.4 and Pillow 13.0.0, Google Chrome in /Applications, Xcode Command Line Tools.
- cmake was missing. A portable cmake 4.4.5 lives in `engine/bin/cmake/` (git-ignored) instead of Homebrew, which the sandbox cannot write to.

**Step 3. Remotion project: pass, with three sandbox limits**
- `create-video` cannot reach npm or GitHub from the sandbox (Node's own fetch skips the proxy), so the blank template was written by hand: Remotion 4.0.541, React 19.2, TypeScript 5.9, `@remotion/google-fonts`. `npx remotion versions` clean, `tsc` clean, `npx remotion bundle` builds.
- Folders made: `public/recordings`, `screen-recordings`, `images`, `logos`, `broll`, `music pack`, `sound pack`, `fonts`, `out`, `bin`. All git-ignored.
- whisper.cpp built from source (master `b1535f5fb1`, 2026-11-05) into `bin/whisper.cpp/build/bin/whisper-cli`. Models `ggml-base.en.bin` (148 MB) and `ggml-small.bin` (488 MB). `whisper-cli -h` prints its help and a CPU test run writes JSON.
- `scripts/transcribe.mjs` (ours): ffmpeg to 16 kHz mono, whisper-cli with word timestamps, drops punctuation-only tokens, writes `[{text,startMs,endMs}]` next to the recording, refuses to re-transcribe an existing file unless `--force`. Defaults to the small model.
- The five Python scripts were reviewed line by line before copying: no network calls, no shell strings, subprocess only to ffmpeg, ffprobe and whisper-cli, writes only to the paths given or to temp folders. `verify-audio.py` and `retime-captions.py` leave temp WAVs in `$TMPDIR`, harmless. Copied unchanged into `scripts/`.
- Caption, TextHook, TwoThirdsPanel and Silhouette copied into `src/shared/` with the brand swapped in: Hauora, ivory fill and ink outline captions with the light-ground flip, Instrument Serif Italic ember emphasis, the hook default as ivory text in an ink outline, drop shadows and the white sheen gradient replaced by hairlines. Theme tokens live in `src/brand/theme.ts`.
- **Kept off GitHub:** the five scripts and `src/shared/` are Michael Ly's work with no license, so `engine/.gitignore` keeps them on the Mac. A fresh clone needs `tools/fetch-millee-skills.sh` plus the copy step to build.
- Three things the Claude Code sandbox blocks: Chrome (Mach port registration, SIGABRT on launch), Metal for whisper (falls back to CPU with `-ng`), and macOS `say`. Renders and GPU transcription run outside the sandbox with the `!` prefix.

**Step 4. Fonts: pass**
- Hauora Regular, SemiBold and Bold (`.woff2`, SIL OFL) copied from iCloud Drive into `public/fonts/`, loaded in `src/brand/theme.ts`, present in the bundle. Instrument Serif and Instrument Sans load from Google Fonts. No stand-in needed.

**Step 5. Sample frames: approved**
- Caleb: "yes" on all six frames (2026-11-05, evening). No changes, so BRAND.md section 9 stays empty. The end card's REALTOR and license line and the outlined pill stand as rendered.
- `src/brand-samples/BrandSamples.tsx`: one six-frame composition, one sample per frame, so `scripts/render-brand-samples.sh` does a single range render plus a 3x2 contact sheet in `out/brand-samples/`.
- Caleb ran it with `!` at 20:58: the range render took 4 s, six PNGs at 1080x1920, contact sheet built. Measured on the frames: the hook's ink shape spans y430 to y639, inside the y285 to y1635 safe band and above the stand-in head (top y690), 686 px wide (limit 880). The caption's letters span y1091 to y1150 with the baseline 40 px below the stand-in chin, so the tops of the letters overlap the chin by about 19 px. That follows BRAND.md section 4 (baseline about 45 px below the chin), and real takes get measured per video.
- Hook line widths are measured in the loaded font at render time, not guessed.
- The stat tile uses a placeholder number labelled "placeholder, not a market stat" with a source and date line, so no unsourced number appears.

**Judgment calls to check on the frames**
- End card adds "REALTOR" and "Louisiana license 995709547". BRAND.md section 5 says license only when compliance needs it, but `~/reels/CLAUDE.md` makes name, REALTOR, Keller Williams First Choice and license a hard rule on every reel.
- End card pill: BRAND.md says ink fill on an ink ground, which would be invisible, so it has a 1px ivory edge.
- The copied listing reel playbook still describes LuxTitle in Didot with a gold hairline, which BRAND.md section 1 rules out (no gold). Copied unchanged, Caleb's call which wins.

**Sandbox settings changed by Caleb** (`~/.claude/settings.json`): `allowUnsandboxedCommands: true`, and `npx remotion *`, the brand samples render script, `node scripts/transcribe.mjs *`, `*/whisper-cli *` and `python3 scripts/retime-captions.py *` excluded from the sandbox. The rest stays sandboxed.

**Committed** with Caleb's OK on the size (about 4,500 lines, about 4,000 of them the generated `package-lock.json`).

**Step 6. Proof render: done on a real take, waiting on Caleb's look**
- Take: Caleb chose the first 20 s of `~/Desktop/TC-Ad-Recordings/Untitled.MOV` (1280x720 landscape, mono AAC, his TC system ad) over filming a new iPhone take. Cropped to vertical, so it is upscaled 2.7x and softer than a real reel will be.
- Ingest: 602 source frames, 605 in the 30fps mp4 (20.17 s), one transcription of 42 words, no cuts at scene 0.05, grid frames at f151, f302, f453.
- Measured rows (1080x1920): cap top about y460 (higher in the first second, about y420), eye line about y880, mouth about y1160, chin about y1380, lav mic on the jacket about y1660 to 1690 at x about 840, below the safe band.
- Placement: caption baseline y1425 (45 px below the chin, BRAND.md 4). Hook top y250, ending at y460 on the cap line: the crop leaves only 175 px between the safe band top (y285) and the cap, a two-line hook needs 210, so its top sits 35 px above the 4:5 grid crop and its bottom touches the cap in the first second. A vertical iPhone take with more headroom will not have this problem.
- Render: `out/test/test.mp4`, 605 frames, 1080x1920, crf 17, 14 s render, 14.3 MB. `verify-audio.py` voice gain 0.9989, added audio -83.7 dB.
- Frame map (final): f5 what if you, f35 never had to, f74 type a contract, f121 again, f141 I'm Caleb Jackson, f171 with, f185 Keller Williams, f211 First Choice and, f242 I built my, f262 own TC system, f285 with AI (clears f335), pause with no caption, f436 I just say, f457 the terms out, f475 loud, f497 the price, f516 the closing date, f547 who pays what (clears f590).
- Found and fixed on the real take:
  - The camera file starts its audio 153 ms after the video. whisper read from the first audio sample, so every caption was about 5 frames early, and `verify-audio.py` read gain 0.036 because the offset was past its search window. `ingest.sh` now pads the audio to start at zero, and the take was re-ingested.
  - "Keller Williams First Choice" was lowercased and split. Names in `PHRASES` now stay one unit in their own capitals. "TC" added to `KEEP`.
  - A chunk held through a pause ("with AI" for 4.4 s). Chunks now clear 12 frames after their last word when a pause follows.
  - whisper padded "AI." to the next sentence and the two retime passes disagreed. The loudness envelope settled it: speech ends at 10.75 s and resumes at 14.5 s. Applied as index-keyed fixes in `out/test/fixes.json` (local), with "build" corrected back to "built".
- Session 20:46 to 21:26, about 40 minutes for steps 2 to 6, most of it the sandbox and sign-in detours.
- Caleb turned the sandbox off for this project (`.claude/settings.local.json` in the main checkout and the worktree, never committed) and allowed git push for the session.
- `scripts/ingest.sh`: probe, transcode to H.264 1080x1920 30fps with stereo AAC, confirm the frame count, transcribe once, cuts at scene 0.05, three grid frames at 25, 50 and 75 percent.
- `src/test-run/TestRun.tsx`: the take, brand captions chunked 1 to 3 words and at most about 17 characters, casual lowercase with a proper-noun list (`KEEP`), the default hook for the first 90 frames. Caption Y, hook top and frame count come in as measured props.
- Synthetic run (5 s test pattern with a tone): 150 frames in and out, render 6 s at crf 17, `verify-audio.py` voice gain 1.0003 against a stereo source, added audio -87 dB (nothing added).
- Three bugs found and fixed on the synthetic run: ffmpeg 9 dropped `-vsync` (now `-fps_mode passthrough`); whisper emitted "(Bell)" as a word (sound tags are now dropped); "St." ended a caption chunk on its own (abbreviations no longer break chunks). A mono source reads voice gain 0.707 against Remotion's stereo output, so ingest now always writes stereo.

**Needs Caleb**
- Watch `engine/out/test/test.mp4` and say whether captions land on the right words and the hook placement works. Phase 1 starts only after that yes.
- Decide whether the listing reel playbook's gold hairline title or BRAND.md's no-gold rule wins for listing reels.
- Optional: a 20-second vertical iPhone take to test real framing and 4K, since this proof used a cropped 720p landscape file.
- Pick the Phase 1 topic.

## 2026-11-06, evening: Phase 0 pre-checks done on the Mac mini

**Confirmed by Caleb** (pasted from his Mac session)
- Node v26.12.1. Python 3.15.1 (Homebrew). numpy 2.5.4. Pillow not installed, Homebrew Python blocks pip (PEP 668).
- Mac mini, Apple M6, 12 cores (2 Super, 4 Performance, 6 Efficiency), 16 GB memory, 48 GB free of 228 GB.

**Done**
- `engine/PHASE-0.md` step 2 now records the results and uses `brew install pillow`, run by Caleb with the `!` prefix since the sandbox cannot write to Homebrew. Disk note added.

- Pillow 13.0.0 installed through Homebrew and importing alongside numpy 2.5.4 (Caleb, 2026-11-06 evening). Homebrew also upgraded jpeg-turbo to 3.2.1 and lz4 to 1.11.0. All Phase 0 pre-checks pass.

**Needs Caleb**
- Step 1 of `engine/PHASE-0.md` in the Mac mini session: pull the branch, fetch the skills, link remotion-reel, add the Remotion skills.

## 2026-11-06, later: Phase 0 approved, brand sheet drafted in our own design system

**Confirmed by Caleb**
- "Yes, it's good." Yes on Phase 0. Design the engine in our own design system (the `website-rebuild/DESIGN-SYSTEM.md` tokens, not Michael Ly's look).

**Done**
- `engine/brand/BRAND.md`: ink and ivory grounds, ember once per graphic, stone for labels and source lines, Instrument Serif display, Hauora body and captions with Instrument Sans as the stand-in, captions ivory with an ink outline flipping by measured luminance, the default text hook and the title-pair option, an end card for Keller Williams First Choice, the site's easing and durations in frames, no radius, no shadow, hairlines, real photos only, generated b-roll disclosed, original audio until licensed music exists, an empty Learned Rules section.
- `engine/PHASE-0.md`: the runbook. Pre-checks, seven steps with the exact prompts to paste into Claude Code on the Mac, done criteria per step, fixes for the likely failures.
- `README.md` file table updated.

**Not verified**
- Nothing in Phase 0 has run. The Mac mini session does it.
- Hauora font files: the brand package has them, the repo does not.

**Needs Caleb**
- Run Phase 0 on the Mac mini per `engine/PHASE-0.md`, starting with the three pre-checks.
- Say yes or no to the six sample frames in step 5. Changes become learned rules.
- Film the 20-second test take for step 6.
- Pick the Phase 1 topic.
- Still open: the Instagram post, Higgsfield Plus price, invideo plan.

## 2026-11-06: millee.md guides read, engine plan written

**Confirmed by Caleb**
- "Go to milleemd.com/guides, download all the free skills, read them, come back with a plan on how we should build our video editing engine." Then: "collect all the skills, add them to our 2nd brain knowledge and then use them to help build the plan." Also sent an Instagram reference, `instagram.com/p/De2SEI7JP8r`.

**Done**
- All 24 guides read (the millee.md short domain does not resolve from the cloud session, milleemd.com does). Six skill files downloaded from the public Drive folders and read in full: remotion-reel, carousel-studio, human, the-council, web-designer, the four resume skills.
- `lessons/millee-md-guides/LESSON.md`: every guide in one table with what it is and what it is for here, the six skill files described, the shared method, Proof, Unknowns, proposed changes.
- `lessons/millee-md-guides/remotion-reel-digest.md`: the editing method in our words, with the numbers, the five layouts, caption math, audio rules, the 13 gotchas, and what changes for Caleb.
- `tools/fetch-millee-skills.sh`: downloads the originals into `skills/third-party/millee-md/`, now git-ignored, because the files are Michael Ly's and carry no license.
- `ENGINE-PLAN.md`: the twelve-step engine, the stack at $0 incremental, why Remotion over invideo, CapCut, Descript and ffmpeg-only, the project layout, Phases 0 to 3, Proof, Unknowns, recommendations.
- `.gitignore`: `skills/third-party/`, `video-studio/engine/public/`, `engine/node_modules/`, `engine/bin/`.
- Root `README.md` lessons table row.

**Not verified**
- The Instagram post. Age-restricted login wall on the post and reel URLs, the embed says the post may be removed. Nothing read.
- Michael Ly's time claims and render speeds. His machine, not the Mac mini.
- Node, numpy and Pillow on the Mac mini.

**Needs Caleb**
- Yes or no on Phase 0 of the engine plan (one session, $0, reversible).
- The Phase 1 topic: a listing with photos he owns, or a market stat.
- Confirm the `website-rebuild/DESIGN-SYSTEM.md` palette is the current Keller Williams First Choice era, not Rêve, before it becomes `brand/BRAND.md`.
- Open the Instagram post on the Mac and say what it shows, or send a screen recording.
- Run the three Terminal checks at the end of `ENGINE-PLAN.md`.
- Still open from 2026-11-05: Higgsfield Plus price, invideo plan.

## 2026-11-05, afternoon: ffmpeg confirmed on the Mac mini

**Confirmed by Caleb**
- Pasted the Terminal result: FFmpeg 9.0.2 installed through Homebrew, with x264, x265, SVT-AV1, VP8 and VP9, VideoToolbox and AudioToolbox hardware encoding, Opus and MP3, libvmaf, ffplay and ffprobe. Dynamically linked.

**Done**
- `research.md` Track 4: ffmpeg setup score 3 to 4, total 26 to 27. Proof row added with the feature list. Unknowns now name only the Python side (torch and Silero VAD requirements). Recommendations: the ffmpeg check is off Caleb's list, and a VMAF quality gate is noted as an option for candidate A.

**Not verified**
- Python, torch and the Silero VAD requirements on the Mac mini.

**Needs Caleb**
- Resend the Instagram post link he wants torn down.
- Confirm the Higgsfield Plus price he pays and whether invideo is paid or free.
- Say go for the designer round, then the blind judge round 1.

## 2026-11-05: hub created, research round 1 done

**Confirmed by Caleb**
- Build the video studio as a new top-level hub in this repo, matching the AIRE and Skool hubs, with the four agents under `.claude/agents/`.
- This session runs research tracks 1 to 4 and scaffolds the agents and the judge README. The designer and judge rounds wait for his go-ahead.
- Cost scoring at the medium tier: 10 to 20 videos a month, $50 to $150 a month, one paid video plan acceptable.
- Live read-only checks on connected tools allowed. No generation, no credits spent.

**Done**
- `README.md`: the round loop, the scoring rubric, the blind judge round 1 procedure, related skills.
- `plan.md`: the round 1 plan as Caleb pasted it, with the volume and budget unknown marked resolved and two corrections noted.
- `research.md`: Blueprint, Proof, Unknowns and Recommendations across the four tracks. Scored matrices for images (Higgsfield 27, Fal.ai 26, Ideogram 20, Midjourney 16), video (Higgsfield 26, invideo 22, Claude Motion 19, Runway 18, Sora excluded) and editing (ffmpeg 26, invideo timeline 24, Descript 22, CapCut 21, Opus Clip 20), plus the eight-step scripting spec built from skills Caleb already has.
- Live checks 2026-11-05 21:12 to 21:16 UTC: Higgsfield shows 270.7 credits on the Plus plan (was 381.8 on the free plan on 2026-10-19). invideo shows 50 credits, one workspace, two projects. Sora shutdown confirmed from news sources.
- `.claude/agents/video-planner.md`, `video-researcher.md`, `video-designer.md`, `video-judge.md`.
- Root `README.md` Projects table: new row for this hub.

**Not verified**
- The official course page returns 403 and one review URL from the plan returns 404. Course scope rests on third-party pages that disagree with each other.
- Higgsfield per-run credit costs are from a third-party capture dated 2026-08-31 plus one first-hand data point from 2026-10-19. Veo 3.1 cost on Higgsfield unknown.
- Claude Motion plan availability comes from secondary sources. The official announcement URL returned 404.
- Nothing has been generated, so the quality scores are reputation and feature reads, not tests on Caleb's material.

**Needs Caleb**
- Resend the Instagram post link he wants torn down.
- Confirm the Higgsfield Plus price he pays and whether invideo is paid or free (account shows 50 credits).
- Run `ffmpeg -version` in Terminal on the Mac mini and say whether it prints a version.
- Say go for the designer round (writes `dashboard-spec.md` with candidates A and B) and then the blind judge round 1.
- Approve the first real test run and its credit estimate before anything is generated.
