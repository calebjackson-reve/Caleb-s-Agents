# Research plan: reverse engineer the AI Creator Course into Caleb's video studio

Date: 2026-11-05
Written by: video-planner (round 1 input, pasted by Caleb into the session on 2026-11-05)
Goal: replicate what the $98 AI Creator Course teaches, as a working setup on Caleb's Mac mini driven by Claude Code, without buying the course. This is the round 1 input for the video-planner and video-researcher agents.

### Blueprint

1. Map the course's four buckets to research tracks. From the public sales material the course covers AI scriptwriting and planning, AI image and graphic creation, AI filmmaking and video generation, and AI editing. Each bucket becomes one research question for the video-researcher.
2. Track 1, scripting: compare Claude-native prompt workflows (hook-writer, reels-script, tiktok-script skills) against what the course promises (prompt templates, competitor study, short-form scripts). Output: a scripting workflow spec.
3. Track 2, visuals: score the image stack. Candidates already connected: Higgsfield (Nano Banana image models), Ideogram, Flux via skills. Course reportedly leans on free tools, Fal.ai and Ideogram named by one review. Score each 1 to 5 on quality, Claude-drivability, Mac fit, cost at Caleb's volume, setup, lock-in.
4. Track 3, video generation: score Higgsfield (Kling, Veo), Runway, invideo, Sora access options against the course's claims (cinematic clips, consistent characters, effects). Same scoring rubric.
5. Track 4, editing: score Claude-drivable editing paths. Candidates: invideo MCP timeline editing, Descript, CapCut, ffmpeg scripted cuts, captions-and-clipping skill. Course covers captions, audio cleanup, podcast cuts.
6. Hand plan.md and the researcher's research.md to the video-designer for the dashboard spec, then run the blind video-judge round 1 per the README in this folder.
7. After the verdict, build the workflow, run one real listing through it, judge round 2, then Caleb approves before anything is posted or scheduled.

### Proof

- Course scope (scripting, images, filmmaking, editing, with tools including Claude, Midjourney, Runway, ElevenLabs, CapCut, Descript): contentcreator.com sales page as summarized in the prior session, 2026-11, plus [Coursebox review](https://www.coursebox.ai/blog/ai-creator-course-anthony-gallo).
- Module structure (AI filmmaking, viral shorts, long-form YouTube, ads, editing) and the free-tools claim (Fal.ai, Ideogram): [udcourse review](https://udcourse.com/product/the-ai-creator-course-anthony-gallo/), third party, not official.
- Instructor reputation and course update cadence: [Trustpilot reviews of contentcreator.com](https://www.trustpilot.com/review/contentcreator.com), seller-adjacent platform.
- Caleb's existing stack (Higgsfield, invideo, Runway skills, Metricool, Postiz, social-media-skills pack): tool list in this workspace, 2026-11-05.

### Unknowns

- Actual lesson content, prompt files and exact tool settings. Paid content behind a login, cannot be verified. The tracks above replicate the outcomes, not the lessons.
- The checkout page returns 403 to automated fetch, so the current official curriculum text is unverified. Module lists from third-party reviews disagree with each other.
- The Instagram post Caleb referred to. No Instagram link exists in this thread, only the course checkout URL. Caleb needs to resend it before that piece can be reverse engineered.
- Caleb's monthly video volume and budget ceiling, needed for the cost scoring in tracks 2 to 4. **Resolved 2026-11-05 by Caleb:** medium tier, 10 to 20 videos a month, $50 to $150 a month, one paid video plan acceptable.

Label: everything under Proof is from the named source. The track design itself is inference from the course's public scope.

### Corrections made when filing this plan (2026-11-05)

- The hook-writer, reels-script and tiktok-script skills are from the `social-media-skills` plugin on Caleb's Claude account, not from this repo. The repo's own related skills are `skills/teardown` and the Nick Saraev video skills listed in `README.md`.
- No video studio folder, README or agents existed in the repo when this plan arrived. This hub and the four agent files in `.claude/agents/` were created to hold it.
