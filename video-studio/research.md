# Research round 1: what the AI Creator Course teaches, scored against Caleb's stack

Date: 2026-11-05. Written by: video-researcher. Input: `plan.md` in this folder.
Volume assumption: medium, 10 to 20 videos a month, $50 to $150 a month, one paid video plan acceptable (Caleb, 2026-11-05).
Rubric: 1 to 5 on quality, Claude-drivability, Mac fit, cost at medium volume, setup, lock-in (5 is low lock-in), total out of 30. Definitions in `README.md`.

Labels used below: **source** means read directly from the named page or tool result. **inference** means my conclusion from sources. **not verified** means a claim I could not check.

Live checks run in this session, all read-only, no credits spent, 2026-11-05 between 21:12 and 21:16 UTC:
- Higgsfield `balance`: 270.7 credits, plan `plus`.
- Higgsfield `models_explore` list, image (40 shown, more pages) and video (60, complete), plus `get` on kling4_0, veo3_1, seedance1_5 and two `recommend` calls.
- invideo `current_user`: 50 credits remaining. `list_workspaces`: one workspace. `list_projects`: two projects, "Skool: 7 Days to Your First AI Assistant" and "Reel Studio", both last touched 2026-10-26. `get_help` on timelines and exports.

---

## Blueprint

### What the course is (the thing we are replicating)

1. A seven-phase, beginner-level course by Anthony Gallo of ContentCreator.com. Phases: crash course on AI, AI image and graphic creation, AI thumbnail design, AI video creation (effects, character consistency, self-cloning), content planning and scriptwriting, AI studio upgrades (virtual backgrounds), AI video editing, audio enhancement and captioning. **source**, third party, see Proof.
2. Growth modules sit on top: short-form viral content, long-form YouTube, ads, short films. **source**, third party.
3. Tools named across reviews: CapCut, Premiere Pro, DaVinci Resolve, Final Cut Pro, Fal.ai (video and image generation), Ideogram (graphics), Photoshop AI tools. The prior session's summary also named Claude, Midjourney, Runway, ElevenLabs and Descript. **source** for the first list, **not verified** for the second (the official page cannot be fetched).
4. The course sells structure for beginners, not secret tools. Reviews say the lessons overlap across platforms and the output feels generic without personal input. **source**, Coursebox review, which itself promotes a competing product.
5. So the thing to replicate is the pipeline, not the lessons: idea, script with hook, visuals, clips, edit with captions and clean audio, publish, measure. **inference**.

### Track 1, scripting: the Claude-native workflow spec

Course promise (from the public module list): prompt templates, competitor study, short-form scripts, content planning. Everything below is already covered by skills Caleb has, so no new tool is needed. **inference** from reading the skills.

| Step | What happens | Covered by | Gap |
|---|---|---|---|
| 1. Intake | Listing or topic, the result wanted, the platform, the length tier | `skills/teardown/SKILL.md` section 1 | None |
| 2. Reference teardown | Two reference videos taken apart: hook, promise, beats with timestamps, pacing, on-screen text, audio, CTA | `skills/teardown/SKILL.md` section 2, plugin skill `viral-reverse-engineering` | Caleb picks the references. The Instagram post he mentioned is still missing. |
| 3. Hooks | 5 to 10 candidates across different mechanisms, scored, best two kept as A and B | plugin skill `hook-writer` (steps 2 to 5) | None |
| 4. Script | Two-column audio and visual script, beats with timings, works on mute, 130 to 150 words a minute runtime math | plugin skills `reels-script`, `tiktok-script`, `short-form-video-script`, `scripting-and-storyboarding` | None |
| 5. Shot list | Numbered shots regrouped by setup for batch filming, B-roll slots marked | `scripting-and-storyboarding` step N, `programs/ai-for-agents/PRODUCTION.md` | None |
| 6. Caption and CTA | Keyword in first 3 seconds spoken, on screen and in caption, 3 to 5 hashtags | plugin skills `caption-writer`, `instagram-seo` | None |
| 7. Compliance | Louisiana advertising rules, fair housing, AI disclosure, KW First Choice identity | `skills/ai-compliance-check/SKILL.md` | None |
| 8. Approval | Caleb reads the A and B scripts, picks or edits | `CLAUDE.md` approval gate | None |

The course's "prompt templates" are the one artifact worth adding: a `video-studio/prompts/` folder with the exact prompts the workflow uses for hooks, scripts, image generation and video generation, so the designer can wire them in and Caleb can edit them in one place. **inference**. Not created in this round.

### Track 2, images

Scores at medium volume. Image needs at this volume: covers, thumbnails, B-roll stills, text cards, roughly 50 to 150 images a month. **inference**.

| Tool | Quality | Claude-drivable | Mac fit | Cost | Setup | Lock-in | Total |
|---|---|---|---|---|---|---|---|
| Higgsfield image models (Nano Banana 2 and Pro, GPT Image 2.6, FLUX.2 and FLUX 3, Ideogram 4.5, Seedream 5, Recraft) | 5 | 5 | 5 | 4 | 5 | 3 | **27** |
| Fal.ai direct (same Nano Banana and FLUX models by API) | 5 | 4 | 4 | 5 | 3 | 5 | **26** |
| Ideogram direct (web app plus API) | 4 | 3 | 4 | 3 | 3 | 3 | **20** |
| Midjourney | 5 | 1 | 3 | 2 | 3 | 2 | **16** |

Why: Higgsfield already holds Ideogram 4.5, FLUX, Nano Banana and GPT Image behind one connected MCP, so the course's Ideogram and Fal.ai steps are both covered by a plan Caleb already pays for. Fal.ai is the pay-as-you-go fallback if Higgsfield credits run short. Midjourney has no public API, so Claude cannot drive it. **inference** from the Proof rows.

### Track 3, video generation

Video needs at this volume: 2 to 4 generated clips of 5 to 10 seconds per video for B-roll and openers, so roughly 40 to 80 clips a month, plus an occasional talking-head avatar clip. Caleb's own camera footage stays the main source. **inference**.

| Tool | Quality | Claude-drivable | Mac fit | Cost | Setup | Lock-in | Total |
|---|---|---|---|---|---|---|---|
| Higgsfield video models (Kling 4.0 and 3.0, Veo 3.1, Seedance 1.5 Pro and 2.x, Intone talking head, Sync Lipsync, Genjutsu motion transfer) | 5 | 5 | 5 | 3 | 5 | 3 | **26** |
| invideo generation (Seedance 2, Kling, Veo through the invideo agent) | 4 | 4 | 4 | 3 | 4 | 3 | **22** |
| Claude Motion (code-driven animation, no footage) | 3 | 5 | 5 | 1 | 1 | 4 | **19** |
| Runway (Gen-4.5) | 5 | 3 | 4 | 2 | 2 | 2 | **18** |
| Sora | excluded | | | | | | **0** |

Why: Higgsfield covers the course's "cinematic clips, consistent characters, effects" claims in one place: Kling 4.0 takes ordered keyframes and up to seven reference elements for consistency, Veo 3.1 and Seedance 1.5 Pro give native audio, Intone does a talking head from a character image plus voice recordings, Genjutsu transfers motion. Runway's Standard plan buys about 52 seconds of Gen-4.5 a month, too little at medium volume without the Pro plan, and it would be a second paid video plan. Claude Motion is not available on Caleb's Claude Max plan per secondary sources, so it stays on watch as `aire/STACK.md` already says. Sora is shut down. **inference** from the Proof rows.

### Track 4, editing

Editing needs: cut Caleb's talking-head footage, drop in B-roll and generated clips, burned-in captions for mute viewing, audio cleanup, 9:16 and 16:9 exports, clips cut from Skool lessons. **inference** from `programs/ai-for-agents/PRODUCTION.md` and the plan.

| Tool | Quality | Claude-drivable | Mac fit | Cost | Setup | Lock-in | Total |
|---|---|---|---|---|---|---|---|
| ffmpeg scripted cuts plus the yt-auto-video-editor scripts (Silero VAD silence removal, "cut cut" restarts, loudness, subtitle burn-in) | 3 | 5 | 5 | 5 | 4 | 5 | **27** |
| invideo timeline editing through MCP (explicit ops, text and captions, effects, transitions, free export to MP4 or Premiere, Final Cut, DaVinci project) | 4 | 5 | 4 | 4 | 4 | 3 | **24** |
| Descript (text-based edit, Studio Sound, native Mac app, API and MCP advertised) | 5 | 3 | 5 | 3 | 3 | 3 | **22** |
| CapCut desktop (free manual editor, auto captions) | 4 | 1 | 5 | 4 | 4 | 3 | **21** |
| Opus Clip (moment detection, reframe, captions) | 4 | 2 | 4 | 3 | 4 | 3 | **20** |

Why: the course's editing promise is captions, audio cleanup and podcast cuts. ffmpeg plus the Nick Saraev scripts already in this repo do the silence cutting, loudness and burn-in for free and run from Terminal, which is the Mac fit the plan asks for. ffmpeg 9.0.2 is already installed on the Mac mini (Caleb, 2026-11-05), so only the Python side of the scripts is left to confirm. invideo is the only connected editor Claude can drive op by op, with captions and free exports, and it hands an editable project to Final Cut or DaVinci if Caleb wants to finish by hand. Descript is the best human editing experience but its API and MCP are not connected here and not listed on any plan card. CapCut has no API, so it stays the manual fallback in `PRODUCTION.md`. Opus Clip gates its API to the Business plan. **inference** from the Proof rows.

---

## Proof

### Course scope

- Seven phases, instructor, $98 winter sale price down from $298, 30-day guarantee, bonuses: [Grokipedia page on The AI Creator Course](https://grokipedia.com/page/The_AI_Creator_Course), fetched 2026-11-05. An AI-written encyclopedia page citing contentcreator.com pages, Coursebox, Trustpilot and a Scribd PDF. Third party, and one of its Trustpilot citations is for a different course.
- Modules (AI filmmaking, viral short-form, long-form YouTube, ads, editing and audio), tools CapCut, Premiere Pro, DaVinci Resolve, Final Cut Pro, pros and cons, review dated 2026-01-11: [Coursebox review](https://www.coursebox.ai/blog/ai-creator-course-anthony-gallo), fetched 2026-11-05. Coursebox sells a competing course builder.
- Fal.ai and Ideogram as the free tools, phase names including "Fal Ai Image Generators" and "Premiere Pro AI Features": web search results 2026-11-05 quoting course listings on resale sites. Those sites also host unauthorized copies, so they are cited for the module names only and not linked.
- Official sales page: `https://www.contentcreator.com/ai-creator-course` returned HTTP 403 on 2026-11-05. The udcourse review URL in `plan.md` returned HTTP 404 on 2026-11-05.

### Track 1 sources

- `skills/teardown/SKILL.md` sections 1 to 5, read 2026-11-05.
- `skills/ai-compliance-check/SKILL.md`, read 2026-11-05.
- `programs/ai-for-agents/PRODUCTION.md`, filming schedule and CapCut steps, read 2026-11-05.
- Plugin skills `reels-script`, `hook-writer`, `captions-and-clipping`, `scripting-and-storyboarding`, loaded with the Skill tool 2026-11-05. Key facts from them: 3-second hook on three channels, write the muted version first, 130 to 150 words a minute, two-column AV script, shots regrouped by setup, no CapCut or TikTok watermark on a Reel, about 70 percent of auto-clips need human cleanup.

### Track 2 sources

- Higgsfield image model list with ids, resolutions and reference support: `models_explore` list type image, 2026-11-05 21:12 UTC. Includes nano_banana, nano_banana_pro, nano_banana_2, gpt_image_2_6, flux_2, flux_3_image, ideogram_4_5, ideogram_vector, seedream_v5_pro, recraft_v4_1.
- Higgsfield plan and balance: `balance` 2026-11-05 21:12 UTC, 270.7 credits on plan `plus`. On 2026-10-19 the same call showed 381.8 credits on the free plan (`website-rebuild/MEDIA-PLAN.md`), so Caleb upgraded between those dates.
- Higgsfield Plus price $59 a month or $47 a month billed annually with 1,200 credits a month, Nano Banana Pro about 2 credits per image and about 4 at 4K, Kling 3.0 10 credits for 5 seconds at 720p and 12.5 at 1080p, Seedance 2.0 45 credits for 5 seconds at 1080p: [Krea blog on Higgsfield pricing](https://www.krea.ai/blog/higgsfield-pricing-explained-2026-unlimited-credits-and-real-monthly-costs), prices captured 2026-08-31, fetched 2026-11-05. Third party. `https://higgsfield.ai/pricing` returned only page metadata to automated fetch on 2026-11-05.
- Fal.ai: Nano Banana 2 $0.08 per image, Nano Banana Pro $0.15 per image, FLUX 2 $0.012 per megapixel, FLUX.1 schnell $0.003 per megapixel, Kling v2.6 Pro $0.07 per second, Kling v3 and O3 $0.14 per second: [fal.ai/pricing](https://fal.ai/pricing), fetched 2026-11-05. Official.
- Ideogram: Free 30 credits a week for Google, Apple or Microsoft sign-ins, Plus $20 a month or $15 billed annually with 2,400 credits, Pro $60 or $42 with 7,500 credits, Basic no longer sold, API billed from the same credits with no per-image rate on the page: [docs.ideogram.ai plans and pricing](https://docs.ideogram.ai/plans-and-pricing/plans-and-pricing), fetched 2026-11-05. Official.
- Midjourney: Basic $10, Standard $30, Pro $60, Mega $120 a month, 20 percent off annual, no public API: web search 2026-11-05 citing Midjourney's Comparing Plans page as of 2026-10-18, for example [eesel.ai Midjourney pricing](https://eesel.ai/blog/midjourney-pricing). Third party.

### Track 3 sources

- Higgsfield video model list, 60 models, complete: `models_explore` list type video, 2026-11-05 21:14 UTC. Kling 4.0: text, image, reference and video-edit modes, 3 to 30 seconds, 720p or 1080p, up to seven element ids. Veo 3.1: 4, 6 or 8 seconds, basic, high or ultra, preview or fast variant, 16:9 or 9:16, audio. Seedance 1.5 Pro: 4, 8 or 12 seconds, up to 1080p, native audio. Intone: talking head from character image plus 2 to 30 seconds of voice recordings, up to 1080p. Sync Lipsync 3, Genjutsu motion transfer, Reframe, Video Upscale also present. Unlimited generations not available on this account (`unlim.available: false`).
- Seedance 1.5 Pro 8 seconds 1080p costs 24 credits: `website-rebuild/MEDIA-PLAN.md`, Higgsfield balance read 2026-10-19.
- Kling and Seedance credit costs on Higgsfield: Krea blog above, 2026-08-31. Veo 3.1 credit cost: not given there.
- Runway: Free 125 one-time credits, Standard $15 a month or $12 annual with 625 credits, Pro $35 or $28 with 2,250, Max $95 or $76 with 9,500, Gen-4.5 at 12 credits per second, no Unlimited plan on the page: [runway.com/pricing](https://runway.com/pricing), fetched 2026-11-05. Official. So Standard buys about 52 seconds of Gen-4.5 a month and Pro about 187 seconds. **inference** from those numbers. The `runway-api` plugin in this session requires authentication and is not connected (session tool list, 2026-11-05).
- invideo plans: Plus $20 a month, Max $100, Generative $200, Elite $1,000 per an invideo FAQ updated 2026-07-27, found by web search 2026-11-05. Credits per plan: the [invideo plan limits help page](https://invideo.io/help/billing/plan-limits/), fetched 2026-11-05, lists Starter 400, Plus 2,000, Max 8,000 credits a month, about 800 Nano Banana Pro images or about 52 Seedance 2 videos on Plus, video priced per second, a Kling 2.6 Standard video "might cost 5 credits" and a Veo 3.1 4K video with audio "can cost 100+ credits". The FAQ's credit figures (Plus 80) conflict with the help page (Plus 2,000). Caleb's account shows 50 credits (`current_user`, 2026-11-05). The connector in this session is invideo's Claude app connector. Its own instructions say Claude Code must use the full connector at `https://mcp.invideo.io/mcp` instead.
- Claude Motion: launched in beta 2026-10-08, code-driven animation, no video generation model, exports MP4, available on Team and Enterprise plans and marked No for Free, Pro and Max in a pricing table quoted by secondary sites: web searches 2026-11-05, for example [eesel.ai on Claude Motion pricing](https://eesel.ai/blog/claude-motion-pricing). `https://www.anthropic.com/news/claude-motion` returned 404 on 2026-11-05, so plan availability is **not verified** from an official page. `aire/STACK.md` lists Claude Motion as "watch" since 2026-10-19.
- Sora: OpenAI announced the shutdown 2026-03-24, app closed 2026-04-26, API ends 2026-09-24: [Engadget](https://engadget.com/ai/openai-is-shutting-down-its-sora-video-generation-app-211023358.html), [MacRumors](https://www.macrumors.com/2026/03/24/openai-discontinuing-sora-ai-video-app/), found 2026-11-05. Confirms the "gone" note in `aire/STACK.md`.

### Track 4 sources

- ffmpeg path: `skills/nick-saraev/youtube-automation/yt-auto-video-editor/SKILL.md`, read 2026-11-05. Silero VAD silence removal over 0.5 seconds, "cut cut" restart removal, EQ, compression, loudness to -16 LUFS, optional Auphonic mastering. ffmpeg is free software. **source**, Caleb's Terminal on the Mac mini, 2026-11-05: FFmpeg 9.0.2 installed through Homebrew at `/opt/homebrew/Cellar/ffmpeg/9.0.2_1`, with x264, x265, SVT-AV1, VP8 and VP9 encoders, VideoToolbox and AudioToolbox hardware encoding (h264_videotoolbox, hevc_videotoolbox), Opus and MP3, libvmaf, ffplay and ffprobe, dynamically linked. The Python requirements for the Silero VAD scripts (torch, numpy, requests, anthropic, python-dotenv) are still **not verified**.
- invideo timeline editing: `get_help` topics timelines and exports, 2026-11-05 21:14 UTC. Explicit ops for placement, cutting, trimming, text and captions, effects, transitions, keyframes, color, audio and markers, no natural-language editing, `capture` for frame checks, exports free in video, Premiere, Final Cut, DaVinci and invideo formats.
- Descript: Free $0 with 60 media minutes, Hobbyist $24 a month or $16 annual with 600 media minutes, Creator $35 or $24 with 1,800, Business $65 or $50 with 2,400, "API + MCP" and "Video Editing MCP" linked in the site navigation but not on any plan card: [descript.com/pricing](https://www.descript.com/pricing), fetched 2026-11-05. Official. `programs/ai-for-agents/PRODUCTION.md` already names Descript as the alternative editor.
- CapCut: no public API. Pro reported at $19.99 a month or $179.99 a year in the most recent third-party sources, after a 2025 price increase, with lower figures on older pages: web search 2026-11-05, for example [nemovideo CapCut Pro pricing](https://www.nemovideo.com/blog/capcut-pro-pricing-2026). Third party, official page not reachable. Free tier includes basic auto captions. The plugin skill `reels-script` warns that a CapCut watermark fails the Reels eligibility gate.
- Opus Clip: Free 60 credits with watermark, Starter $15 a month with 150 credits, Pro $29 a month or about $14.50 annual with 300 credits per pack, API gated to Business: web search 2026-11-05, for example [castmagic Opus Clip pricing](https://www.castmagic.io/blog/opus-clip-pricing), and the plugin skill `captions-and-clipping`. Third party.

---

## Unknowns

- **Course content.** Lesson videos, prompt files and settings are behind the $98 paywall. The official sales page returns 403 to automated fetch, so even the current public module list is from third parties that disagree with each other (seven phases on one page, five modules on another, a "two-day intensive" on a third).
- **The Instagram post.** Caleb referred to a post to reverse engineer. No link has reached a session yet. Caleb needs to resend it before the teardown skill can run on it.
- **Higgsfield exact credit costs on this account.** The MCP model list does not show credits per run. The Kling, Seedance and Nano Banana costs above are from a third-party capture dated 2026-08-31 and the one first-hand data point from 2026-10-19 (Seedance 1.5 Pro 8 seconds 1080p, 24 credits). Veo 3.1 cost on Higgsfield is unknown. The exact numbers come out of the first approved test run, which the designer should budget at 3 clips.
- **Higgsfield Plus price Caleb actually pays.** The plan shows as `plus` but the price and renewal date are not readable through the MCP. Caleb confirms.
- **invideo credits.** invideo's own FAQ and help page give conflicting credit counts for the Plus plan (80 versus 2,000). The 50 credits on Caleb's account suggest the free tier. Caleb confirms which plan, if any, he pays for.
- **Claude Motion access.** Team and Enterprise only, according to secondary sources quoting Anthropic's pricing table. The official announcement URL returned 404. Caleb can check his claude.ai plan settings in one click.
- **Descript API and MCP.** Advertised in the site navigation. Which plan includes it, and whether it can run a full cut from Claude Code, is unknown.
- **Python side of the ffmpeg scripts.** ffmpeg itself is confirmed (9.0.2, see Track 4 Proof). Whether Python, torch and the Silero VAD requirements are installed on the Mac mini is still unknown. One `pip show torch` in Terminal answers it. Because ffmpeg is linked dynamically, a Homebrew upgrade can break Python wheels built against the old libraries until they are rebuilt.
- **Caleb's camera footage volume.** The scoring assumes his own footage is the main source and generated clips are B-roll. If he wants fully generated videos, the Track 3 cost scores drop by about one point each.
- **Quality judgments.** The quality column is my read of each tool's reputation and feature list, not a side-by-side test on Caleb's material. Round 2 replaces it with real outputs.

---

## Recommendations (for the video-designer, not for Caleb to act on yet)

1. **Images and video both stay on Higgsfield.** It is connected, paid, and holds every model the course's reviews name (Ideogram, FLUX, Nano Banana) plus Kling, Veo and Seedance. The one-system rule in `aire/STACK.md` says no second tool unless nothing paid can do the job. Fal.ai is the documented fallback only if credits run short, since it costs $0.08 per image with no subscription.
2. **Two candidate stacks for the judge.** Candidate A: Higgsfield for media, ffmpeg scripts for the cut and captions, Metricool for the scheduled draft. All free or already paid, fully Terminal-driven, lowest polish. Candidate B: Higgsfield for media, invideo timeline editing through MCP for the cut, captions and free export, Metricool for the draft. More polish, one more connector to wire for Claude Code, credits only if invideo generates. The one variable that differs is the editing path.
3. **Scripting adds no tool.** Wire the eight steps in Track 1 as the first stage of both candidates, with `ai-compliance-check` before every approval point, and create `video-studio/prompts/` to hold the exact prompts.
4. **Drop from consideration:** Sora (shut down), Midjourney (no API), Runway (second paid plan, 52 seconds a month on Standard), Opus Clip (API gated to Business). Keep Claude Motion on watch for the monthly market update if Caleb's plan ever includes it.
5. **First real run budget.** Three generated clips at 5 to 8 seconds plus five images, estimated under 120 Higgsfield credits from the sources above, shown to Caleb before anything is submitted. The run gives the exact credit costs the Unknowns section is missing.
6. **Before round 2,** Caleb resends the Instagram link and confirms his Higgsfield and invideo plans. ffmpeg is confirmed, so candidate A needs no ffmpeg install step.
7. **For the designer, one option from the ffmpeg check.** libvmaf is built in, so candidate A can score each render against its source and hold anything under a set VMAF threshold before it reaches Caleb for approval. Inference, not required.
