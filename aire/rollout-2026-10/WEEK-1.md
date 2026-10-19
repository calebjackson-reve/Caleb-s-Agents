# Week 1: switches to flip

Written October 19, 2026. Four of these are clicks only Caleb can make. Each one says where to click, what it needs, and how to prove it worked. Sources are vendor help pages unless marked otherwise.

## Status
| # | Switch | Who | State |
|---|---|---|---|
| 1 | Claude for Google Workspace sidebar | Caleb | not started |
| 2 | Gmail AI Inbox | Google rolls it out, Caleb checks | arriving Oct 12 to 26 |
| 3 | Google Meet next steps to Gmail draft | Caleb | not started |
| 4 | Link Claude Console org for monthly API credits | Caleb | not started |
| 5 | Monday AI brief on a schedule | Claude | done, first run Monday Oct 26, 7:47 am Central |
| 6 | List any custom GPTs to rebuild as skills | Caleb | waiting on list |

## 1. Claude for Google Workspace sidebar
Needs: paid Claude plan (Pro, Max, Team or Enterprise) and a Google account allowed to install Marketplace apps. Caleb is the admin of calebjackson.org, so no allowlist should block it.
1. Open the Claude listing in the Google Workspace Marketplace and click Install.
2. Open any Google Doc. Extensions, Claude, Open Claude.
3. Allow the two permissions Google asks for the first time.
4. Sign in with the Claude account in the sidebar.
5. Leave edit mode on "Ask before edits".
Proof: in a Doc, ask the sidebar to rewrite one paragraph in Caleb's voice and see the change proposed.
Source: [Claude help article 16951679](https://support.claude.com/en/articles/16951679-use-claude-in-google-docs-sheets-and-slides).

## 2. Gmail AI Inbox
Needs: paid Workspace (calebjackson.org is paid), US location, language set to English (US). Google says it is on by default for domains using Gemini features. Rapid Release domains from Oct 12, Scheduled Release from Oct 26.
1. Open Gmail on the web. If the AI Inbox view is there, it shows to-dos and a priority summary at the top.
2. If it is not there by Oct 27: Admin console, Apps, Google Workspace, Gmail, User settings, confirm Gemini features are enabled. Then check Admin console, Company profile, Release track. Rapid Release gets features first.
Proof: a to-do pulled from a real email shows in the inbox summary.
Sources: [Workspace Updates blog](https://workspaceupdates.googleblog.com/2026/10/weekly-recap-10-16-2026.html), [WebProNews](https://www.webpronews.com/gmails-ai-inbox-and-gmail-live-begin-rolling-out-to-paid-google-workspace-users). The admin path is from a third-party article, not Google, so treat it as a starting point.

## 3. Google Meet next steps to Gmail draft
Needs: Gemini in Meet turned on, "Take notes for me" enabled on the call.
1. On the next buyer consult or listing appointment held on Meet, turn on "Take notes for me" at the start.
2. After the call, open the notes doc. The next steps section offers to draft the follow-up email in Gmail.
3. The draft goes through `ai-compliance-check` before Caleb sends it.
Proof: one recap email drafted from a real Meet.
Source: [Workspace weekly recap Oct 16](https://workspaceupdates.googleblog.com/2026/10/weekly-recap-10-16-2026.html).

## 4. Link the Claude Console org for monthly API credits
Needs: Claude Max (5x gets $100 a month, 20x gets $200), at least seven days on the plan. Only one org can be linked and support has to change it later, so pick the org AIRE will use.
1. claude.ai, Settings, Billing.
2. API credits section, Link organization.
3. Pick the Console org (or create one named AIRE).
4. Accept the Supplemental Credit Terms.
5. Console, Settings, Billing, Promotional credits shows the balance.
Credits expire at the end of each billing cycle and do not cover Claude Code. They cover the API, which is where the Haiku 5.5 bulk jobs will run.
Proof: a non-zero promotional balance in the Console.
Source: [API credits for Max and Team](https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers).

## 5. Monday AI brief (done)
A scheduled task fires every Monday at 7:47 am Central in a fresh session. It runs the `ai-weekly-brief` skill, writes the dated brief, and opens a draft pull request with the ranked list. Nothing leaves the repo. Caleb can pause or delete it from the scheduled tasks list in Claude.
Known gap: the scheduled session runs without connectors (no Gmail, Metricool). The brief only needs web search and GitHub, so that is fine. If the first run fails to push, the fix is to recreate the task from a session that holds the GitHub source.

## 6. Custom GPTs
OpenAI is retiring custom GPTs (Enterprise loses creation Oct 26 and access Dec 11, other plans to follow, per secondary coverage). Caleb lists any GPTs he built or relies on. Each one becomes a skill here using `cx-prompt-to-skill`.
