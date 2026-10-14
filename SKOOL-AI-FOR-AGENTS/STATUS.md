# Status log

Newest first. Every entry says what was done, what it was based on, and what needs Caleb.

## 2026-10-14: the teaching game plan

**Done**
- `programs/ai-for-agents/GAME-PLAN.md`: the full teaching plan, built from Caleb's answers to 3 rounds of questions in the project thread. Free front door, then a paid build path, basics first.
- New front door: "7 Days to Find the Leads in Your Phone." Phone first, ChatGPT. Setup, AI rules, practice on fake texts, the text message scavenger hunt, who's who, 3 follow-ups, a saved lead assistant. One psychology idea per day.
- Paid later, with Claude: Google Sheets CRM, AI video, a Claude-built website, lead tools and automations, analytics and ads.
- Ethics check table every script must pass: client confidentiality, truth in advertising, Fair Housing, other agents' clients, deepfakes, texting consent.

**Confirmed by Caleb**
- This replaces the old 7-day challenge. Old Day 1 bio video is shelved. ChatGPT for basics, Claude for builds. Phone first. Tell members about $20 a month. Setup and the lead hunt free.
- Nothing taught can create an ethics violation.

**Inference, needs a test**
- An iPhone app can't read the whole iMessage history, so the free lesson is pick and paste. The Mac full scan is a bonus.
- NAR Code article numbers are from Claude's knowledge, recheck against the current Code.

**Needs Caleb**
- Approve the outline or mark changes.
- Ask KW First Choice about the AI and client records policy.

**Next for Claude**
- Script Days 0 to 7 in the new order, each with its ethics check. Test the phone and Mac scan methods live first.

## 2026-10-12, late night: the video editor

**Done**
- `programs/ai-for-agents/editor/`: two scripts. `style_probe.py` measures how a reference video is cut. `skool_cut.py` edits a raw face take and screen recording to those numbers: it cuts pauses and false starts, punches in at jump cuts, zooms the screen where it's changing, adds keyword pills or captions, sets loudness to -14 LUFS and checks its own output. How to run it is in `editor/README.md`.
- First real measurement of Nate Herk (confirmed, from the file): his 2026-10-11 video, which Codex downloaded on Caleb's Mac. 9.6 cuts a minute, median shot 4.8 s, half face and half screen or graphics, face first appears at 0:15, almost no punch-ins, no pause over 1 second, keyword pills instead of captions. Teardown in `editor/README.md`.
- Nick Saraev: speech only (his captions were on the Mac, no video file). 237 words a minute, pause median 0.8 s.
- Tested on a fake raw take built from 20 s of Nate's talking head plus a recorded bio prompt. Both false starts were dropped, and all three targets were met (12.6 cuts a minute, 4.47 s median shot, longest silence 1.08 s). The test file uses Nate's footage, so it stays out of the repo and is never posted.

**Historical, now corrected**
- The shot board's "formula" was inference from posts. The measured numbers replace it where they differ. The biggest difference: Nate opens on a motion graphic, not his face.

**Needs Caleb**
- Keep face first (the Day 1 kit) or open on a graphic like Nate? Claude's pick is face first.
- Run the cutter on the real Day 1 takes after filming.
- Ok to measure 2 more Nate videos and 2 Nick videos on the Mac with yt-dlp?

**Next for Claude**
- Measure more reference videos, then send the cut to Studio as a timeline so it can be changed by voice.

## 2026-10-12, late night: Day 1 film kit

**Done**
- `day-1-film-kit.html`: one page to film Day 1 from. Room, light, camera, audio and screen checklists, a run of show with every line to say and the timestamp it lands on, the shot list, the Fair Housing check, the Skool lesson text and an after-filming list. Rendered in Chromium at desktop and phone width, light and dark, no errors, no sideways scroll, checkboxes and copy buttons work.
- Face first, screen by 0:18. The script had the screen at about 0:50, so the curse-of-knowledge line moved after the weak prompt.
- Spoken lines trimmed to about 260 words. With typing and reading results aloud that lands near 4 to 4:30 (inference, not timed).
- Free download `programs/ai-for-agents/downloads/day-1-bio-builder.pdf` (one letter page) and the `.html` it's made from. Lives only in the Skool Classroom.

**Fair Housing**
- Changed the script's example "families moving up" to "move-up buyers." Familial status is protected and a bio is advertising.
- Added "Describe what I do, not who should live where." to the prompt.
- Plain-language read by Claude, not legal advice. KW First Choice compliance has the final word.

**Needs Caleb**
- Approve or rewrite the trimmed lines and the lesson text.
- Film Day 1 from the kit, watch it on your phone, say what felt off.
- Before Day 1 goes live, pin your own before and after bio in the challenge feed. The video promises it.
- Leave KW First Choice out of the typed bio until the brokerage answers.

**Next for Claude**
- Fold Caleb's notes from the Day 1 test into the kit, then build the same kit for Days 0 and 2 to 7.

## 2026-10-12, night: Skool plan and privacy

**Confirmed by Caleb**
- The group is on the Hobby plan. Per the morning research, Hobby costs $9 a month plus 10% of paid memberships (historical, from skool.com research, not rechecked).
- The group is public.

**Inference**
- Membership is free to join. That matches the project goal of 100 free members, but Caleb has not checked the price setting yet.

**Needs Caleb**
- Confirm the group's price setting says free.

## 2026-10-12, evening: Skool group is live

**Confirmed by Caleb**
- The group exists at https://www.skool.com/ai-for-agents-caleb-jackson-2010. Skool blocks this server, so Claude could not load the page. URL and name are Caleb's word.
- That closes open decision 1 (web address).

**Needs Caleb**
- Which plan the group is on and whether billing is active.
- Fill the group from `programs/ai-for-agents/skool-setup.md`: about text, sections, rules, welcome post, join questions, auto welcome DM. Claude can draft each one as paste-ready text.

**Next for Claude**
- Draft the paste-ready about text and join questions for this exact URL.
- Then the script trim and the Day 1 teleprompter page.

## 2026-10-12, afternoon: project hub and shot board

**Done**
- Merged the Skool work from pull request 10 into this branch so everything lives in one place.
- Created this hub folder with the project README, this log and the shot board.
- Built the Challenge Shot Board: set diagram, the Nate Herk and Nick Saraev formula with reference links, one storyboard card per video with frames, time bar, shot list, B-roll, on-screen text and clip markers, and the 4-hour batch day order. Rendered in Chromium, 8 cards, no errors.
- Decided video lengths: Day 0 at 90 seconds, Days 1 to 7 at 3:30 to 5:30.
- Decided the order of work: Day 1 as the test film, then batch day, then weekly lessons.

**Needs Caleb**
- Review the shot board and say what doesn't look like you.
- Pick a Skool URL. Both obvious ones are taken.
- Approve the room and gear. No purchases without a yes.

**Next for Claude**
- Trim the 8 challenge scripts in `programs/ai-for-agents/challenge/` to the shot board lengths.
- Build a phone teleprompter page for Day 1.
- Draft 3 Skool URL and description options.

## 2026-10-12, midday: foundation, production playbook, challenge scripts

**Done**
- `FOUNDATION.md`: goal, mission, 7 core values, the flywheel, a 5-question content check.
- `PRODUCTION.md`: filming schedule, 12-week calendar, setup, CapCut steps, clip cutting, upload and safety checklists.
- `challenge/`: Skool layout, launch post, auto welcome DM, and 8 word-for-word scripts, Day 0 to Day 7.
- Linked everything into `PLAN.md` and the repo README.

**Needs Caleb**
- Approve or rewrite the values and scripts.
- Recheck Claude and ChatGPT menu names on filming day. Days 6 and 7 walk through settings screens.
- Ask KW First Choice about using the brokerage name.

## 2026-10-12, morning: Skool research and competitor teardown

**Done**
- Scanned 291 Skool groups across 7 searches, live from skool.com. Saved in `skool-research.md`.
- Found `skool.com/aire` and `skool.com/ai-for-agents` already taken. Flagged a possible trademark issue on AIRE.
- Confirmed Skool Hobby plan pricing: $9 a month plus 10% of paid memberships.
- Tore down AI Automation Society (469,685 free members, 3,498 paid at $129) and Chase AI (80,249 free, 1,167 paid at $99). Saved in `skool-teardown-ais-chase.md`.
- Opened draft pull request 10 with the research.

**Needs Caleb**
- Decide on the URL and the trademark question.

## Earlier: plan, lessons and setup

- `PLAN.md`: the 90-day plan, weekly rhythm, scorecard and guardrails.
- `lessons/01` to `10`: the beginner path, each with a plan and script.
- `skool-setup.md` and `invites.md`: group setup text and invite drafts.
- Lesson built from Nick Saraev's Reverse Engineer Anything video, plus the `teardown` skill.
