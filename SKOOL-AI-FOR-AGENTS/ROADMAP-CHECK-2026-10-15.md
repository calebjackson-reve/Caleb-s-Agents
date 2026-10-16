# Skool project vs Nick Saraev's roadmap: status check, October 15, 2026

Run with the `ns-25k-roadmap` skill against everything on main after merging pull request 13. Labels: **confirmed** (in the repo or said by Caleb), **inference** (Claude's read), **unknown**.

## The one-line verdict

The Skool project is at roadmap step 10 (communities and content), and it has already done most of steps 1 to 5 for the teaching business. The thing it is missing is the thing Nick says kills 90% of these: no daily sales block exists yet. All of the work so far is preparation. Nothing has been filmed, posted or invited.

## Where it stands against the 22 steps

| # | Step | Status | Evidence |
|---|---|---|---|
| 1 | Niche sentence | **Done** (confirmed) | "Help agents use AI so they think better, not just faster." FOUNDATION.md. Niche: Louisiana agents starting at step 1. |
| 2 | Name | **Done** (confirmed) | Group exists at skool.com/ai-for-agents-caleb-jackson-2010. Display name still to pick from three options in skool-group-copy.md. |
| 3 | 5 case studies / templates | **Half** (inference) | 10 lessons and 8 challenge scripts are the templates. No case study with a before-and-after number from a real agent yet. The first 7-day challenge graduates become the case studies. |
| 4, 5, 6 | Domain, website, workspace | **Done** (confirmed) | calebjackson.org, aire@calebjackson.org. For this business the Skool group is the website. |
| 7, 8 | Sending domains, cold email | **Skip for now** (inference) | Nick's roadmap sells to businesses. Members here come from Caleb's roughly 500 agent friends on personal Facebook. Personal invites replace cold email. |
| 9 | Upwork profile | **Not applicable** | |
| 10 | 3 communities, 3 value posts a week | **In progress, not started publicly** (confirmed) | The group is live and empty. Scripts, shot board, set and gear are decided. Nothing filmed. Nick's "3 communities" also means posting in other people's groups: KW office groups, GBRAR, Louisiana agent Facebook groups. Not in the plan yet. |
| 11 | CRM | **Done** (confirmed) | KW Command. Member tracking for Skool is not set up. |
| 12, 13 | Proposal, payments | **Not yet, correctly** (inference) | Paid tier is planned after 100 members. Nick agrees: customers over admin. |
| 14 | Daily sales block | **Missing** (confirmed) | PLAN.md has "personal invites to 10 to 15 agents, any day, 1 hour." Nothing is on a calendar and no invite has gone out. This is the gap. |
| 15, 16 | Time it, compute $/hr, retrospective | **Not yet** | Starts after the first paid one-on-one. |
| 17 | Project management | **Done early** (confirmed) | The hub, STATUS.md and shot board. Nick would say this came before the first customer, but it is light and already built, so keep it. |
| 18 to 21 | Scale | **Not yet** | |

## What the new skills change for this project

| Project piece | Skill that now applies | What changes |
|---|---|---|
| Filming and CapCut editing (PRODUCTION.md) | `yt-auto-video-editor` | Record in one take, say "cut cut" after flubs, the script removes silences and mistakes, enhances audio, writes chapters, uploads private. Replaces most of the manual CapCut steps. |
| Pull request 16, the Nate Herk pacing editor | `yt-auto-video-editor` | Two editors doing one job. Compare before merging 16. Nick's uses neural silence detection, PR 16 matches a reference pace. |
| Thumbnails (PRODUCTION step 9) | `yt-auto-thumbnail-faceswap` | One photo session of 30 to 40 angles of Caleb, then thumbnails rebuild from proven layouts. |
| Lesson topics and titles | `yt-auto-outlier-finder` | Pull what is working in agent, sales and small business channels before writing week 5 onward. |
| Clips from each lesson (3 to 5 per video) | `cx-content-repurposing`, `cx-anti-slop-writing` | Long video to short posts with Nick's tone rules. |
| Personal Facebook invites (invites.md) | `ce-four-step-framework`, `ce-offer-formula`, `ce-one-step-cta` | Personalization, who I am, offer, one-step ask. The current drafts are warm but have no specific offer or single step. |
| Launch post and group copy | `vc-anti-slop-content-prompting` | No hashtags, no alternating sentence lengths, no AI openers. |
| Friday Q&A questions into next lessons | `cx-pipeline-hygiene-champion` pattern | A weekly skill that reads the feed and drafts next week's lesson brief. |
| Member tracking | `aw-crm-wrapper` | Members, challenge day, wins, one-on-one interest in KW Command or a sheet. |
| Scorecard in PLAN.md | `mk-race-bottleneck-thinking` | Reach (views), Acquire (joins), Close (challenge day 7 completions), Expand (one-on-ones). Find the bottleneck weekly. |
| The whole program | `ns-25k-roadmap` | This check. Rerun monthly. |

## Open items the merge surfaced

- **Two challenge names.** The hub and challenge README say "7 Days to Your First AI Assistant." The newest group copy (Oct 14) says "7 Days to Find the Leads in Your Phone." One has to win before filming. Caleb's call.
- **Five Skool pull requests are still open and unmerged:** 9 (lessons, teardown skills, local setup), 12 (Nate toolkit), 14 (Day 1 film kit and Bio Builder), 16 (video editor), 23 (teaching game plan). Some overlap with what just merged. They need a pass to merge or close.
- **Decisions still with Caleb from the hub:** display name, trademark check on AIRE, brokerage name permission from KW First Choice, approve values and scripts, confirm the group's price setting says free.
- **Set and gear:** decided, no purchases approved.

## The single next action

Film Day 0 and Day 1 this week, run them through `yt-auto-video-editor`, and send 10 personal invites from invites.md rewritten with the four-step framework. Put the invites on the calendar as the step 14 block. Everything else in the project is ready enough.

## Verification for this check

- All claims trace to files on main after the PR 13 merge (commit e5e3763) or to STATUS.md entries confirmed by Caleb.
- No Skool page was loaded. Skool blocks this server. Group state is Caleb's word as of Oct 12 and 14.
