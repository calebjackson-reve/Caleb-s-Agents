# Video studio status log

Newest first. Every entry says what was done, what it was based on, and what needs Caleb.

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
