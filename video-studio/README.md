# Video studio hub

Caleb's AI video setup, driven by Claude Code on the Mac mini. Round 1 reverse engineers what the $98 AI Creator Course teaches into a working workflow without buying the course. Read `STATUS.md` before touching anything here.

| File | What it is |
|---|---|
| `STATUS.md` | Status log, newest first. What was done, what needs Caleb. |
| `plan.md` | Round 1 research plan from the video-planner. The four research tracks. |
| `research.md` | Round 1 report from the video-researcher. Scored tool matrix for images, video and editing, plus the scripting workflow spec. |
| `ENGINE-PLAN.md` | The build plan for the video editing engine: a Remotion project on the Mac mini run by Claude Code, following the millee.md remotion-reel method. Phases 0 to 3, costs, unknowns. Written 2026-11-06. |
| `engine/` | Not created yet. The Remotion project itself (Phase 0). Media folders inside it are git-ignored. |
| `dashboard-spec.md` | Not written yet. The video-designer's two candidate stacks, A and B, and the workflow Claude Code runs on the Mac. |
| `verdict-round-1.md` | Not written yet. The blind video-judge's scores and verdict. |

## The round loop

1. **video-planner** turns a goal into `plan.md`: one research question per track, Blueprint, Proof, Unknowns.
2. **video-researcher** runs the tracks read-only and writes `research.md`. Every price has a source and a date. Nothing is generated and no credits are spent.
3. **video-designer** reads `plan.md` and `research.md` and writes `dashboard-spec.md` with two candidate stacks, A and B, and the step-by-step workflow.
4. **video-judge** scores both candidates blind (procedure below) and writes `verdict-round-N.md`.
5. Caleb approves. Only then does anything get built, generated, posted or paid for.
6. Round 2 repeats after one real listing runs through the winning workflow.

The agent definitions live in `.claude/agents/video-planner.md`, `video-researcher.md`, `video-designer.md` and `video-judge.md`.

## Scoring rubric

Every tool gets 1 to 5 on each of six criteria. Equal weights, total out of 30.

| Criterion | 5 means | 1 means |
|---|---|---|
| Quality | Output Caleb would post as is | Needs heavy rework or looks AI-generated in a bad way |
| Claude-drivability | Connected MCP or clean API Claude Code already calls | Mouse and keyboard only, no API |
| Mac fit | Runs from Apple Terminal with Claude Code, or native Mac app | Windows only, browser only with no automation |
| Cost at medium volume | Covered by a plan Caleb already pays for, or under $10 a month at 10 to 20 videos | Over $100 a month or a second paid video plan |
| Setup | Already connected | New account, new key, new install, new learning curve |
| Lock-in | Pay as you go, exports to open formats | Credits that expire, proprietary project files |

Rules: every price shows its source URL and the date it was checked. A score with no source moves to Unknowns. Medium volume means 10 to 20 videos a month and $50 to $150 a month, one paid video plan acceptable (Caleb, 2026-11-05).

## Blind judge round 1 procedure

1. The judge is a fresh-context subagent (see `skills/nick-saraev/ai-agents-course/aa-sub-agent-verification-loop/SKILL.md`). It gets only three files: `plan.md`, `research.md` with the Recommendations section removed, and `dashboard-spec.md`. It never sees the planner's or researcher's reasoning, chat history or recommendations.
2. The designer's spec must contain at least two candidate stacks, A and B, per the two-version rule in `skills/teardown/SKILL.md`. They share the blueprint and differ in one main variable.
3. The judge scores each candidate against the rubric above, then checks every hard constraint from `aire/STACK.md` and `CLAUDE.md`: one system (no new database, no new tool unless a paid plan already covers it or nothing paid can do the job), approval gate, AI disclosure on generated media, no AI listing photos or AI neighborhood photos presented as real, Keller Williams First Choice branding only, sourced numbers only. A constraint failure is a veto regardless of score.
4. The verdict is written in Blueprint, Proof, Unknowns. Blueprint names the winner and the one change that would flip the result. Proof cites the lines in the three input files. Unknowns lists what the judge could not verify from the files alone.
5. The verdict goes to Caleb. Nothing is built until Caleb says yes.
6. Round 2 uses the same procedure on the workflow after one real listing has run through it, with the real outputs attached.

## Related skills in this repo

- `lessons/millee-md-guides/LESSON.md` and `remotion-reel-digest.md`: the 24 millee.md guides and the six free skills, digested. The engine plan is built on them. `tools/fetch-millee-skills.sh` downloads the originals onto the Mac.

- `skills/teardown/SKILL.md`: the short video checklist and the two-version rebuild rule.
- `skills/ai-compliance-check/SKILL.md`: runs on every script and caption before Caleb sees it.
- `skills/nick-saraev/claude-code-marketing/mk-ugc-video-ad-pipeline/SKILL.md`: Higgsfield pipeline, 3 concurrent job cap, word count to duration rule.
- `skills/nick-saraev/vibe-coding-course/vc-ai-assets-nano-banana-veo/SKILL.md`: Nano Banana images and Veo loops.
- `skills/nick-saraev/youtube-automation/yt-auto-video-editor/SKILL.md`: ffmpeg and Silero VAD silence cutting, Auphonic mastering.
- `programs/ai-for-agents/PRODUCTION.md`: filming schedule and CapCut edit steps for the Skool videos.

The hook-writer, reels-script, tiktok-script, short-form-video-script, scripting-and-storyboarding, captions-and-clipping, descript, capcut, runway, kling, veo-3, ideogram, flux and nano-banana skills come from the `social-media-skills` plugin installed on Caleb's Claude account. They are not in this repo.

## Guardrails

Agents draft. Caleb approves before anything is posted, scheduled, published, generated for money, or paid for. No client data in this folder. No Rêve branding. Warm, direct, natural voice. Every market stat shows source and date.
