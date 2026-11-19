# The millee.md free guides and skills

**Knowledge entry for Caleb Jackson, Keller Williams First Choice, and AIRE**

- Source: Michael Ly's free guides at https://milleemd.com/guides/ (the site's short domain is millee.md). 24 guides, no email wall, read 2026-11-06.
- Skill files: six downloads from his public Google Drive folders, fetched 2026-11-06 and read in full. `tools/fetch-millee-skills.sh` pulls them onto the Mac into `skills/third-party/millee-md/`, which is git-ignored because the files are his, not ours. The digests below are ours.
- Why it matters: the Claude x Remotion guide and the `remotion-reel` skill are the closest working example found so far of the video editing engine Caleb wants: a creator who never opens an editor, Claude cutting footage in code, captions synced to the spoken word, a storyboard review page. The engine plan in `video-studio/ENGINE-PLAN.md` is built on it.

Labels: **from the source** is what the guide or skill file says. **Applied** is the translation to Caleb's business, inference. **Not verified** is a claim nothing here could check.

---

## Blueprint

### The 24 guides, in one table

| # | Guide | What it is (from the source) | Skill file | Use for Caleb (applied) |
|---|---|---|---|---|
| 1 | Claude x Remotion: edit your videos by talking | Remotion project plus ffmpeg plus whisper.cpp plus HyperFrames. Describe the edit, review a storyboard with Keep, Maybe, Drop per beat, Claude renders the reel. | `remotion-reel.zip` | The engine. See `remotion-reel-digest.md`. |
| 2 | The 5 skills worth installing | claude-mem (session memory), agent-skills (25 engineering workflows), headroom (compresses tool output), remotion-reel, web-designer. | remotion-reel, web-designer | remotion-reel now. headroom later if token cost bites. |
| 3 | The 5 Claude Code skills you actually need | Skill Creator, Caveman (shorter output), UX UI Pro Max, Claude SEO, Remotion. Install via `/plugin marketplace add user/repo` or by pasting the GitHub URL. | GitHub links only | Skill Creator is already in Caleb's plugins. Remotion via the official `remotion-dev/skills`. |
| 4 | How to install the 5 Claude Code skills | Copy SKILL.md into `.claude/skills/<name>/`, restart. | none | Matches how this repo links skills. |
| 5 | Motion graphics videos with Claude | No framework. Claude writes an HTML page where each element's position is a function of the frame number, headless Chrome screenshots 1,200 frames for 20 seconds at 60fps, ffmpeg joins them, a synthesized soundtrack lands on beats. 8 to 10 minutes a render. Cannot animate people or lip sync. | none, prompt only | A fallback for a market-stat animation when Claude Motion stays Team-only. |
| 6 | Competitor research skill | Apify `instagram-reel-scraper` and `instagram-post-scraper`, last 7 days, score each post against the creator's own 4-week median, keep top 10 reels and top 5 carousels, contact sheet of 8 frames, whisper.cpp transcript, one sub-agent per winner, one HTML report. About $0.37 a run. Manual trigger. | none, steps in the guide | A direct upgrade for `skills/teardown-tuesday`. Apify is not connected and would be a new tool, so it needs a one-system check. |
| 7 | Instagram carousel system | Slides as HTML at 420x525, screenshotted at scale 1080/420 to 1080x1350 PNGs, overflow check before export, a locked `brand.json` after a four-question style interview, 13 slide archetypes. | `carousel-studio.zip` | Listing and market-stat carousels in Caleb's own tokens. Same render method as the engine's stills. |
| 8 | Make Claude write like a human | The `/human` skill. Fixes structure first: no stated moral, name feelings plainly, name real things, talk to the reader, leave tension, let it wander once, start in the middle, build to a peak, pick the less obvious angle. Then the surface pass (no em dashes, no AI vocabulary). Cites the StoryScope study, arXiv 2604.03136. | `human.skill` | Scripts and captions. It agrees with CLAUDE.md's voice rule and adds the structural half. |
| 9 | Claude Council | Five one-sided advisors (Contrarian, First Principles, Expansionist, Outsider who sees a stripped one-line question, Executor), five anonymous peer reviewers, a Chairman verdict with "Do this first". Inspired by Karpathy's llm-council. | `the-council-skill.zip` | Already covered by `aa-agent-chat-room-debate` and `aa-stochastic-consensus` in this repo. The anonymous review stage is the one new idea worth adding to the video-judge. |
| 10 | Web designer skill | Interview, propose a menu, build small, screenshot with Playwright before asking, cut half. Motion recipes: line masks, word flow, parallax, pinning, tilt, magnetic, coverflow, page transitions. | `web-designer.zip` | The verification loop (render, capture, read the image back, assert numerically) is the same discipline the engine uses. |
| 11 | Social media command center | Local HTML dashboard over TikTok and Instagram official APIs, OAuth with PKCE, localStorage, Node sync script, rate card PDF, public media kit on Netlify. | none, steps in the guide | Caleb's Pipeline app already is the one daily tool. Take the Instagram insights sync idea only, into Metricool or a sheet, never a second dashboard. |
| 12 | The 5 MCPs worth installing | Playwright, Gmail, Notion, Apify, Canva. | none | Gmail is connected. Playwright is built into this environment. |
| 13 | Content Creator HQ template | Notion template: content bank, idea pipeline, script template (hook, setup, payoff, CTA, caption), viral hooks bank, brand deals and income trackers. | Notion link | Caleb's one-system rule says Sheets, not Notion. The script template shape is worth copying into the engine's brief. |
| 14 | Answer-first setup | A preferences paste for the app and an `answer-first` skill for Claude Code: open with the deliverable, caveats only when they change the next step. | text in the guide | Already how this repo's agents are told to write. |
| 15 | Instagram Saves Engine | Python script with browser session cookies pulls saved posts into Notion twice a day via launchd, a skill turns them into hooks and outlines. | none, build prompt in the guide | Fragile (cookies expire) and Notion. Skip. The saved-posts-to-hooks idea fits teardown-tuesday. |
| 16 | Daily Gmail organizer | Cowork scheduled task at 9am labels Primary inbox, learns rules from labels Caleb applies, memory page in Notion. | prompt in the guide | AIRE's crm Gmail ingest already reads the inbox. Not needed. |
| 17 | Weekly file organizer | Sunday Cowork task, Python script, dry run by default, never deletes, flags installers. | prompt in the guide | Fine idea for the Mac mini's Downloads folder. Not video. |
| 18 | Pinterest photo of you | Train a Higgsfield Soul 2.0 character on 15 to 20 photos, lock a benchmark face, describe a reference in words (never upload the Pinterest image as a reference), add realism words. | prompts in the guide | Flagged. A trained likeness of Caleb would be an AI headshot. `aire/STACK.md` and the media plan say no AI headshots presented as real. Only with disclosure, and only if Caleb wants it. |
| 19 | Job search outreach with Apify | Apify finds contacts, Claude drafts, human sends every email. | none | Not relevant. The "review every message, send by hand" rule is the approval gate. |
| 20 | Pre-launch security checklist | 30 audit prompts: secrets server-side, anon key on the client, row-level security, ownership checks, rate limits, billing caps, parameterized queries, webhook signatures, prompt injection. | prompts in the guide | Already covered by `vc-security-audit` and `ma-security-audit-loop`. Run before any AIRE page goes public. |
| 21 | Resume unrejectable | Four chained skills: ATS parse simulator, keyword gap from live postings, XYZ bullet rewrite with no invented numbers, mock interview scored out of 10. | four `.md` files | Not relevant to video. The "never invent a number, interview for evidence" rule is the same as this repo's sourced-numbers rule. |
| 22 | Learn Claude in one weekend | PRD into a folder, Claude writes `to-do.md`, builds, `npm run dev`, then write CLAUDE.md. | none | Already how the Pipeline app was built. |
| 23 | How to conquer Claude | Install Claude Code, pick an IDE, `.claude/skills/`, plugins, MCPs, CLAUDE.md plus an `anti-style.md` of banned phrases. | none | `anti-style.md` is a good addition to `global-claude-md/`. |
| 24 | Vowen | Free dictation app for Mac, local Parakeet or Whisper model or a free Groq key, Command Mode. $49 one-time Pro. | none | Caleb already pays for Wispr Flow. Note it in STACK.md as the free alternative. |

### The six skill files, what each one actually contains

1. **remotion-reel** (53 KB zip, Michael Ly, updated 2026-10-14). `SKILL.md` plus 11 reference files, 5 Python measuring scripts, 4 React components and a storyboard review HTML kit. Its one rule: measure before building, verify after, because "almost every defect in this workflow comes from guessing a number that could have been measured." Full digest in `remotion-reel-digest.md`.
2. **carousel-studio** (349 KB zip, v1.1). `SKILL.md`, design system, 13 layouts, onboarding interview, photo format, asset rules, and Python scripts (`kit.py` slide builders, `render.py` Playwright overflow check and export, `setup_fonts.py`, `preview.py`). Guards at 471px bottom and 374px right on the 420x525 base. Exports `slide-01.png` onward plus a contact sheet and a 146px grid strip.
3. **human** (4 KB `.skill`, which is a zip). One `SKILL.md`. Nine structural principles with the study's percentages, a surface pass, an audit mode, a before and after example.
4. **the-council** (9 KB zip). `SKILL.md` and `personas.md` with the exact prompts for five advisors, the reviewer and the Chairman. Three stages run as parallel subagents, falls back to sequential in-context.
5. **web-designer** (26 KB zip). `SKILL.md`, inspiration, motion recipes, verification loop, WebGL particles, two Playwright scripts (`capture_scroll.js`, `inspect_site.js`).
6. **resume skills** (four `.md` files, 2026-08-03). Reviewer, Recruiter, Remixer, Interviewer, each a standalone SKILL.md.

### The method that runs through all of them (applied)

1. Interview first, lock a brand file, never ask about style again (`brand/BRAND.md`, `brand.json`).
2. Write the copy before any code.
3. Build in code (React, HTML), render with headless Chrome plus ffmpeg, so every output is deterministic and reviewable.
4. Measure, do not eyeball: pixel extents, luminance of the caption band, word timestamps, audio residuals, overflow guards.
5. Review on a page with per-item Keep, Maybe, Drop and notes, then apply the round and republish the same URL.
6. The human approves. Nothing posts itself.

That is the same loop this repo already runs (teardown, two versions, approval gate), with the video and design craft filled in.

---

## Proof

- Guide list, titles, descriptions, free with no email wall: https://milleemd.com/guides/, fetched 2026-11-06.
- Claude x Remotion guide requirements and flow (Claude desktop with Claude Code, Node LTS, ffmpeg, Chrome, about 15 minutes, `brand/BRAND.md`, `public/sound pack/`, `public/music pack/`, `public/recordings/`, Keep Maybe Drop storyboard): https://milleemd.com/guides/claude-x-remotion/, fetched 2026-11-06.
- "Reduced editing time from about an hour per video to about twenty minutes": https://milleemd.com/guides/5-skills-worth-installing/, updated 2026-09-30, fetched 2026-11-06. Michael Ly's own claim. **Not verified.**
- Skill file contents: downloaded 2026-11-06 from the Google Drive folders linked on each guide (remotion-reel folder `1G5U_S-XakRNqOxfvH9lk57Ixf7tc9Roa`, web-designer `1VBPyQ0jfmTetmPxUSXiPzOfgJ2gIk_nF`, carousel `1SyqzrBOfjF24omHkvZZRpYOLBIJBZsuS`, human `1CIF5kR1Hve985sfJwlfyMYSrAiqIvF3k`, council file `1l1OLVxTn0wkcVx9TCqwjduQjmWmdK5e1`, resume `1C0_XVhuN3nAg_FCnLHpcluy6GFSvEKkZ`). File sizes and dates in `tools/fetch-millee-skills.sh`.
- Remotion license: free for "an individual, whether for personal or commercial use" and for "an organization or team of individuals with up to 3 people". Company license $25 a month per person who writes Remotion code, or $0.01 a render with a $100 a month minimum for automations: https://www.remotion.dev/docs/license/faq, fetched 2026-11-06.
- HyperFrames: Apache 2.0, Node 22 or later plus ffmpeg, `npx hyperframes init`, `npx skills add heygen-com/hyperframes`, catalog of blocks including shader transitions and captions: https://github.com/heygen-com/hyperframes, fetched 2026-11-06.
- Official Remotion agent skills, 13 skills including `/remotion-captions` and `/remotion-render`, install `npx skills add remotion-dev/skills`: https://github.com/remotion-dev/skills, fetched 2026-11-06.
- Competitor research costs ($0.17 reels, $0.20 carousels per weekly run): https://milleemd.com/guides/competitor-research-skill/, fetched 2026-11-06. His figures.
- StoryScope study behind the `/human` skill: https://arxiv.org/abs/2604.03136, cited in the skill file. Not read here.

---

## Unknowns

- **The Instagram reference Caleb sent** (`instagram.com/p/De2SEI7JP8r`). It is a millee.md post. Both the post page and the reel page return an age-restricted login wall, and the embed endpoint says the post may be broken or removed. Nothing about its content could be read from here. Caleb can send a screen recording, the caption text, or open it on the Mac where Chrome is signed in.
- **Michael Ly's time claims** (15 minute setup, 20 minutes an edit). Not tested.
- **Render speed on Caleb's Mac mini.** His numbers (a 1,480 frame reel in about 70 seconds on 12 cores, background removal at 5 to 6 fps with CoreML) are from his machine. The Mac mini's chip and core count are not recorded in this repo.
- **Whether the storyboard review page works from Claude Code on the Mac.** The skill publishes an Artifact with a database capability. This cloud session has that tool. The Mac session's tool list is not confirmed.
- **Whisper accuracy on local names** (Zachary, Bocage, St. Francisville, Prairieville). Expect a fix dictionary.
- **The `video-shotcraft` skill** the motion-graphics reference points to (152 shot recipes at `~/.claude/skills/video-shotcraft`). Not on any guide page and not in the Drive folders. Source unknown.
- **Licensing of the skill files themselves.** No license file in any zip. They are free downloads for personal use. That is why the fetch script keeps them out of git.

---

## Proposed changes (need Caleb's OK)

1. **Done:** this lesson and `remotion-reel-digest.md`, the fetch script, and `video-studio/ENGINE-PLAN.md`.
2. **Proposed:** run `sh tools/fetch-millee-skills.sh` on the Mac mini, then follow Phase 0 of the engine plan.
3. **Proposed:** `global-claude-md/anti-style.md`, a banned-phrase list the way guide 23 describes, seeded from CLAUDE.md's voice rule.
4. **Proposed:** add the anonymous peer-review stage from the council skill to `.claude/agents/video-judge.md` for round 2.
5. **Proposed:** note Vowen in `aire/STACK.md` as the free dictation fallback.
6. **Flagged, not proposed:** the Higgsfield Soul character of Caleb (guide 18). Only with his explicit yes and AI disclosure, and never as a listing or headshot presented as real.
