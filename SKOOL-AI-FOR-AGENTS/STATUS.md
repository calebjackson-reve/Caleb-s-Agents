# Status log

Newest first. Every entry says what was done, what it was based on, and what needs Caleb.

## 2026-10-19: what beginner agents want from AI

**Done**
- `programs/ai-for-agents/beginner-demand-research.md`: research on local Louisiana AI classes, Skool groups, YouTube and course teachers, agent surveys and Reddit, with a ranked list of what beginner agents need help with. Every claim labeled with a source link.
- Top findings: agents use AI mostly for listing descriptions, social posts and follow-up (NAR 2026). The biggest barrier is not knowing where to start. Nobody in Louisiana teaches hands-on AI to agents, and LREC put out AI guidance in August 2026 that matches our values.
- Inference: the "7 Days to Find the Leads in Your Phone" front door matches the demand. Listing descriptions fit better as Day 2 or 3.

**Needs Caleb**
- Read the ranked list and say if it matches what agents ask you in person.
- Look through one or two local Baton Rouge agent Facebook groups. Claude didn't search Facebook.
- Check GBRAR MLS rules on AI photos before any photo lesson.

## 2026-10-19: first pinned post drafted

**Done**
- `programs/ai-for-agents/posts/ai-office-in-a-day.md`: a pinned post that shows Caleb's AI office and offers members a one-page stack memory within 48 hours of posting their tool list. Based on the AIRE rollout built the same day. Compliance passed.

**Needs Caleb**
- Read, edit, post it himself. Commit to answering comments within 48 hours for two weeks.
- Export `aire/STACK.md` with his rows cleared as the classroom template.

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
