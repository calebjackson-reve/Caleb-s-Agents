# Course Notes: CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)

- **Instructor:** Nick Saraev
- **URL:** https://www.youtube.com/watch?v=QoQBzR1NIqI
- **Length:** 250 minutes, 35 chapters
- **Skills folder:** `skills/nick-saraev/claude-code-full-course/`

## Nick's core thesis

Claude Code is a locally running AI that can touch your files, so it is less a coding tool than a second brain for every kind of knowledge work. The highest ROI pattern is simple: steer it with a tight CLAUDE.md, give it a task, let it do the task, and always give it a way to verify its own result (screenshots, tests, scripts), because AI wins on speed through iteration rather than first-try precision. Plan before building anything complex, manage your context window like a budget, and encode anything you do repeatedly as a skill with scripts. Subagents, agent teams and worktrees are all just ways to parallelize, and they trade money for time, so use them deliberately. Deploy with simple services (Netlify for sites, Modal for endpoints) and keep vibe-coded apps internal until a developer reviews them.

## Chapter by chapter

| # | Chapter | One line |
|---|---|---|
| 1 | Introduction | Who Nick is, what the course covers, no technical background needed. |
| 2 | Learning the basics | Course outline and why Claude Code needs at least the Pro plan ($17 at recording). |
| 3 | Setting up | Install via the curl command from code.claude.com/docs, type `claude`, `/login` with the subscription. Docs are the number one resource. |
| 4 | Terminal vs GUI | The terminal layout: model, plan, working directory, mode (Shift+Tab), context percentage, status line, tokens roughly equal words, auto compaction. |
| 5 | Understanding IDEs | An IDE is a file explorer plus text editor plus AI chat. VS Code is the original, Antigravity is "VS Code 2.0". |
| 6 | Exploring VS Code | Install the official Anthropic Claude Code extension only, past conversations, permission mode button, the eye icon marks the file in context. |
| 7 | Getting started with Antigravity | Live edits, plan then pause button to redirect, Thinking tab, same layout in Antigravity after adding the Claude icon. |
| 8 | Building your first web app | CLAUDE.md is the hidden prompt injected before your first message. Ship steering analogy. |
| 9 | CLAUDE.md project brain | Three design approaches: reference plus screenshot loop, voice dump, components (21st.dev). |
| 10 | Approaches to website design | Full-page DevTools screenshot, resize under about 5 MB, copy body styles, build vs deploy, task-do-verify philosophy. |
| 11 | Importance of verification | Watching the loop converge, running two builds in parallel, content swap, voice feedback, tab count rule, chime hook mention. |
| 12 | Advanced functionality intro | Less than 10% of users know what comes next. |
| 13 | The .claude directory (long) | Folder structure, rules split, global vs project, `/init`, dos and don'ts, memory, agents, skills, permission modes, plan mode, proposal generator build with Supabase and Stripe. |
| 14 | Adjusting the proposal design | Alignment fixes, click sign and pay. |
| 15 | Testing payment | Stripe sandbox payment works, confetti tweak, calendar link, public URL test. |
| 16 | Leveraging GitHub | Ask the agent to create the repo and push, then Netlify import. |
| 17 | Setting up the project | Netlify env vars from .env.local, Stripe webhook, paste deploy errors back. |
| 18 | The power of automation | Context hit 100% and compacted, app live, safety: non-obvious URLs, dev review before charging, keep apps internal. |
| 19 | Context management explained | `/context` breakdown: system prompt, system tools (about 17K), MCP, memory, skills, messages. |
| 20 | Understanding MCP tools | Tool definitions sit above your message, Chrome DevTools MCP demo, thinking not in context, auto compact buffer, `/compact`. |
| 21 | Token management strategies | Anthropic's reduction list, `/statusline`, `/clear`, model and thinking effort, intro to his skills folder. |
| 22 | Creating skills | 1,000 dentist leads in 87 seconds, skill folder structure, SKILL.md as conductor and scripts as musicians. |
| 23 | Structure of skills | Scripts over fresh execution, self-updating skills, literature research skill, why he no longer hires for this. |
| 24 | Building a new skill | Voice dump plus screenshot plus HTML plus example data creates a prospect website skill, iterated in minutes. |
| 25 | Intro to MCP | MCPs are skills others make, where to find them, install by pasting JSON, ClickUp with API key, restart session. |
| 26 | Token usage in MCPs | ClickUp MCP cost 20K tokens, frontmatter-only skills cost 60, Gmail label MCP prototype converted to a skill (100 emails in 36 seconds). |
| 27 | Plugins | `/plugins`, claude-mem, front-end design, Context7, marketplaces. Vanilla is enough. |
| 28 | Intro to subagents | Not a cure-all, parallelize and separate context, 7x cost warning for teams. |
| 29 | Skills into subagents | Prompt to parallelize gmail-label into 10 Sonnet subagents, fresh session needed. |
| 30 | Scaling email classification | 100 saved 6 seconds, 1,000 overflowed until subagents stopped returning raw text, then about a minute. Probability multiplication. |
| 31 | Useful subagents | Code reviewer, researcher, QA, the edit-review-QA-ship workflow, parallel vs serial timing. |
| 32 | Understanding agent teams | Team lead plus independent teammates with shared task list and messaging, enable via env setting. |
| 33 | Using agent teams (long) | Three design variants, research teammates, iteration rounds, OpenClaw security scan with 10 scanners and debate agents, $80 in 15 minutes, worktrees intro. |
| 34 | Git worktrees | Netlify for static sites, Modal for backend functions. |
| 35 | Deploying APIs with Modal | Birthday endpoint, remove auth to make it a page, scrape-leads skill behind a form URL returning a CSV, Maker School pitch. |

## Skills created

| Skill | What it does | Trigger phrases |
|---|---|---|
| cc-claude-md-project-brain | Write, `/init` and prune a CLAUDE.md with primacy ordering, line limits and the three layers | "set up a CLAUDE.md", "init this folder", "add this to the rules", "CLAUDE.md is bloated" |
| cc-claude-directory-rules | Organize `.claude/` (settings, local files, rules, agents, skills, mcp) and split CLAUDE.md into rules | "organize my .claude folder", "split CLAUDE.md into rules", "keep keys out of GitHub" |
| cc-permission-modes | Choose and configure ask, accept edits, plan, bypass and `/permissions` rules | "which mode", "stop asking me every five seconds", "turn on bypass", "is bypass safe" |
| cc-screenshot-loop-website-design | Build a site from a reference screenshot and CSS with a screenshot-compare-fix loop | "build a listing page like this site", "landing page for the open house", "three design variants" |
| cc-verify-loop-and-parallel-tabs | Task, do, verify loop and running multiple instances without idle time | "make Claude check its own work", "how many tabs", "why isn't the output what I wanted" |
| cc-plan-mode-full-stack-build | Plan mode spec, Supabase and Stripe keys, local testing, Netlify deploy, safety rules | "build me an app", "client portal with login", "AIRE dashboard", "DocuSign for my agreements" |
| cc-context-and-token-management | `/context`, `/compact`, `/clear`, `/cost`, `/model`, status line, token reduction list | "Claude is getting dumber", "hit 100% context", "save tokens" |
| cc-skills-sop-to-skill | Turn an SOP into a skill folder with SKILL.md and scripts, iterate to 99% | "make this a skill", "I do this every week", "open house checklist skill" |
| cc-mcp-prototype-then-skill | Install an MCP, prove the workflow, measure cost, convert to a direct-API skill | "connect Claude to my CRM / Gmail", "install this MCP", "MCP eating my context" |
| cc-subagents-research-review-qa | Researcher, reviewer and QA subagents, edit-review-QA-ship workflow, parallel chunking | "make a subagent", "run in parallel", "fresh-eyes review", "classify 500 leads faster" |
| cc-agent-teams | Enable and run agent teams for variants, research and adversarial review with cost controls | "spin up a team", "agents debate", "audit the codebase fast" |
| cc-git-worktrees-parallel | One worktree per feature so parallel agents never collide, then merge | "build three pages at once", "agents overwriting each other" |
| cc-modal-deploy-endpoint | Deploy a function or skill to a public Modal URL, form or webhook | "put this skill online", "webhook for my CRM", "URL that runs this" |

## Top 5 takeaways for Caleb

1. Put a global `~/.claude/CLAUDE.md` in place today with identity (REALTOR, Keller Williams First Choice, St. Francisville and Baton Rouge), voice rules, compliance rules and the standing rule that nothing is sent, posted, purchased or deployed without approval. Then `/init` every project folder.
2. Every build gets a verify step. Listing pages get screenshot comparison, AIRE scripts get a dry run on sample leads, and nothing is "done" until Claude shows the evidence.
3. Plan mode for anything bigger than a page. Voice-dump the spec, answer the questions, approve the plan, then let it build while you do something else.
4. The repeatable work of a real estate business (just-listed kits, open house prep, weekly follow-ups, CMA summaries, investor lists) belongs in `.claude/skills/` with scripts and a STOP step for approval. Prototype connections with MCPs, then convert to skills and keep the context window lean.
5. Subagents and agent teams are for parallel throughput (classifying a whole CRM, generating ten listing pages) and fresh-eyes review. They cost real money, so set a budget first and default to the single agent for routine tasks.

## Not turned into skills

- Chapters 1 to 7 (intro, purchase, install, terminal vs GUI, IDE setup, VS Code and Antigravity walkthroughs): setup and interface orientation rather than a reusable technique. Caleb already runs Claude Code. The useful bits (Shift+Tab mode cycling, pause button, Thinking tab, official extension only) are folded into the permission modes and verify loop skills.
- Chapter 12 (advanced functionality intro) and the Maker School pitch in chapter 35: transitional and promotional.
- Chapter 27 (plugins): Nick's own view is that plugins are optional and likely to fold into skills. Summarized inside the MCP skill instead of a standalone skill.
- The completion chime hook: Nick references it repeatedly but the transcript never shows the configuration, so the verify loop skill includes a clearly labeled generic hook template rather than claiming it is his.
