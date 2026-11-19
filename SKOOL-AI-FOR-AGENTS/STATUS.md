# Status log

Newest first. Every entry says what was done, what it was based on, and what needs Caleb.

## 2026-11-19: brief for Grok and a lesson checker

**Asked by Caleb**
- An audit of how a Skool lesson gets made, start to finish, so Grok (chief of staff) knows what to tell Claude Code (worker), and so new lessons keep the vibe code lingo of the finished ones.

**Done**
- `BRIEF-FOR-GROK.md`: what is on record, the ten-part order every finished lesson follows, a lingo card pulled from three finished lesson transcripts in Drive, and how to command Claude Code.
- `lesson_check.py`: eight checks on a script or a transcript (repeated passages, banned punctuation, hype words, undated prices, unexplained tech words, the closing action, the agent-in-control line, client data). Tested on all ten lessons and one made-up bad transcript.

**Found**
- Three finished lesson videos in Drive belong to a second course, AI TC Masterclass, taught on Grok bot. This repo has no record of how they were made.
- The first upload of "AI Setup Foundation" has a passage of roughly 230 words twice in its transcript. Two uploads share that title with different scripts.
- All ten lessons here say 8 to 11 minutes and hold 358 to 510 words, about 2.5 to 3.5 minutes spoken.

**Needs Caleb**
- Watch the first "AI Setup Foundation" upload around the repeat and say which upload is final.
- Say who wrote the finished scripts and what made the videos, so the brief's unknowns can be closed.
- Say whether "Grok bot uses a Cursor account to sign in" is right.

## 2026-10-19: first pinned post drafted

**Done**
- `programs/ai-for-agents/posts/ai-office-in-a-day.md`: a pinned post that shows Caleb's AI office and offers members a one-page stack memory within 48 hours of posting their tool list. Based on the AIRE rollout built the same day. Compliance passed.

**Needs Caleb**
- Read, edit, post it himself. Commit to answering comments within 48 hours for two weeks.
- Export `aire/STACK.md` with his rows cleared as the classroom template.
## 2026-10-15: hub merged to main, roadmap status check

**Done**
- Merged pull request 13 into main. Resolved README and CLAUDE.md against the new skills library (Nick Saraev's 148 skills, now installed as the caleb-skills plugin).
- Ran the project against Nick Saraev's 22-step roadmap with the `ns-25k-roadmap` skill. Result in `ROADMAP-CHECK-2026-10-15.md`. Short version: steps 1 to 6 and 11 are done, step 10 is prepared but nothing is public, step 14 (daily invites on the calendar) is missing and is the gap.
- Mapped which new skills take over which project pieces: the video editor replaces most CapCut steps, the thumbnail generator replaces step 9 of PRODUCTION, the cold email framework rewrites the invites.

**Needs Caleb**
- Pick one challenge name: "7 Days to Your First AI Assistant" or "7 Days to Find the Leads in Your Phone."
- Decide on the five still-open Skool pull requests (9, 12, 14, 16, 23): merge, close, or let Claude reconcile them.
- The hub's standing decisions: display name, trademark, brokerage permission, values and scripts, free price setting.

**Next for Claude**
- Rewrite invites.md with the four-step framework and one-step ask.
- Set up the video editor workspace for Day 0 and Day 1 once Caleb films.

## 2026-10-14: Skool group copy for the new front door

**Done**
- Drafted every piece of group copy for "7 Days to Find the Leads in Your Phone" in `programs/ai-for-agents/skool-group-copy.md`: name, short description, About page, join questions, rules, feed categories, classroom order, pinned welcome post, auto DM and settings picks.
- Marked the old `skool-setup.md` as superseded.

**Needs Caleb**
- Approve or mark up the copy, then paste it into Skool. Nothing has been changed in Skool.
- Film the "Hey, I'm Caleb" video first. It goes in the About page video slot.
- Confirm the member price setting says free.

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
