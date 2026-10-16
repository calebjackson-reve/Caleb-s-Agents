# Course notes: The Only Codex Course You Need in 2026 (4.5 Hours)

- **Author:** Nick Saraev
- **URL:** https://www.youtube.com/watch?v=DJZISqryDfw
- **Length:** 277 minutes, 12 chapters
- **Skill prefix:** `cx-` (folder: `skills/nick-saraev/codex-course/`)
- **Note:** Nick demonstrates in the Codex desktop app. Every skill here is written so the same technique runs in Claude Code (skills in `.claude/skills`, scheduled tasks, MCP servers and connectors, Agent tool for sub-agents). Tool names, model names, prices and limits are recorded as Nick stated them and may have changed.

## Nick's core thesis

AI coding agents are a business tool, not a developer tool. Automate the front of the business first (Reach, Acquisition, Conversion, Expansion) because small lifts there compound into a 2x business, while back-office automations rarely move revenue. Every system goes up the same four-level ladder: a prompt that works once, a skill that works every time, a local automation that runs itself, and a cloud automation that runs without your computer. Generate many samples and pick the best, dictate long context-rich prompts, parallelize with sub-agents, and keep a human on the last 10% of taste and judgment. Maintenance is mostly GitHub, model swaps and evals.

## Chapter by chapter

| # | Chapter | Start | One line |
|---|---|---|---|
| 1 | What you'll build | 0m | Intro and roadmap: install, RACE, four levels, then sales, marketing, ops and voice systems. No skill. |
| 2 | Install Codex, account, interface tour | 2m | Install, sign up, every button: projects (a folder), approval modes (Nick uses full access), model and effort picker (medium default), dictation, diffs, scheduled tasks, plugins, browser and terminal panes. Mostly orientation, plugin notes folded into `cx-plugins-and-mcp`. |
| 3 | RACE framework | 24m | Reach, Acquisition, Conversion, Expansion. Front of business first. 1.5 x 1.2 x 1.1 x 1.1 = 2.2x. |
| 4 | The 4 levels | 31m | Prompt, skill, local automation, cloud automation, always in that order. |
| 5 | Sales: call to proposal with e-sign and checkout | 33m | Three proposal templates, signature canvas, simulated checkout, templated version plus SOP, fake transcript, Netlify at an unguessable URL, skill, three parallel sub-agent runs. |
| 6 | Automate it: webhook from recorder to proposal | 68m | Local folder-polling dispatcher (15 minutes, not 1), goal mode with a definition of done, Fathom webhook to a cloud worker, token-gated proposal inbox. |
| 7 | Marketing: content repurposing with skills | 88m | Newsletter to X, LinkedIn, Instagram plus handwritten lined-paper images, anti-slop playbook, examples beat rules, dated folders, sub-agents for speed, Kit MCP, 5:59 a.m. dispatcher with a ledger, cloud environment via GitHub. Video clipping via Opus Clip or Vizard. |
| 8 | Operations: daily pipeline hygiene | 138m | The AI as CRM and PM "champion": knowledge base files, ClickUp and Slack plugins, one plain nudge per item with link first and dollars at stake, speed pass to halve run time, 6 a.m. local then cloud. |
| 9 | After-hours voice agent | 166m | LTV versus volume matrix (only high-volume, low-LTV fits), realtime API web MVP with a calendar tool and confirmation, then Twilio, SIP, Modal phone agent with the same tool. |
| 10 | Maintaining and upgrading | 215m | Three failure causes: dependency and API changes (fix via GitHub), upgrades available (swap models), non-determinism (evals and self-healing). |
| 11 | Advanced tips: browser and computer use | 236m | Browser use on an open sheet, computer use on Spotify, sub-agents fan out and fan in with fresh context, AGENTS.md and CLAUDE.md as linked system prompts, skills folder portability, Codex vs Claude pricing and why not to orchestrate across models. |
| 12 | FAQ: clients, security, what next | 266m | Build on the client's infrastructure and token bill, two delivery shapes (skills and automations, or a hosted app), safety is never 100%, plugins for keys, strip PII, prompt injection, `.env` and the pre-publish check. |

## Skills

| Skill | What it does | Trigger phrases |
|---|---|---|
| `cx-race-framework` | Ranks automation ideas by Reach, Acquisition, Conversion, Expansion with the compounding multiplier | "what should I automate first", "is this worth building", "prioritize my AIRE roadmap" |
| `cx-four-levels-ladder` | Moves a task through prompt, skill, local automation, cloud automation with checkpoints | "make this repeatable", "put this on autopilot", "run without my laptop on" |
| `cx-variant-sampling-prompting` | Generate many variants and pick the best, dictate context-rich prompts, nudge the model when it says it cannot | "the output was bad", "give me options", "it says it can't" |
| `cx-sales-call-to-proposal` | Consult transcript to hosted HTML proposal with signature, package picker and checkout, then a skill | "turn this consult into a proposal", "listing presentation from this recording" |
| `cx-prompt-to-skill` | Prune a working conversation into a SKILL.md, install, verify on original and fresh inputs | "save this as a skill", "I'll need to do this again" |
| `cx-parallel-subagents` | Fan out, fan in, wall clock time, fresh-context sub-agents | "do these all at once", "this is taking forever", "research from every angle" |
| `cx-event-automation-local-to-cloud` | Local heartbeat with a ledger, then webhook or scheduled cloud run in goal mode with a definition of done and a token-gated dashboard | "run this every morning", "every time I finish a call", "fire from a webhook" |
| `cx-content-repurposing` | One long piece to X, LinkedIn, Instagram plus handwritten images in a dated folder, then a daily dispatcher | "repurpose this", "social content from my newsletter", "Reels captions from this video" |
| `cx-anti-slop-writing` | Rules and example-encoding to remove AI tells from any copy | "this sounds like AI", "make it sound like me", "fix the tone" |
| `cx-plugins-and-mcp` | Connect a service by plugin or manual MCP, verify in a new session with a read and a reversible write, scope guard, `.env` | "connect my CRM", "is the MCP working", "hook up Slack" |
| `cx-pipeline-hygiene-champion` | Daily champion over CRM, projects and ops with knowledge base, one nudge per item, dollars at stake | "what's going stale", "nudge me on my pipeline", "check my CRM every morning" |
| `cx-skill-evals-self-healing` | Eval cases, accuracy scores, self-patching from failures, speed and cost passes | "it worked once then failed", "make this reliable", "make the skill faster" |
| `cx-voice-agent-fit-matrix` | LTV versus volume decision before any voice agent | "should I use an AI phone agent", "AI for my listing line" |
| `cx-voice-agent-build` | Web MVP with calendar tool and confirmation, then Twilio, SIP, Modal phone agent, keys in `.env` | "build an after-hours phone agent", "book showings by phone" |
| `cx-maintenance-github-versioning` | GitHub as the fix point, rollback and cherry-pick, model swaps, failure notifications, MAINTENANCE.md | "it stopped working", "the API changed", "roll it back" |
| `cx-browser-computer-use` | Browser and desktop control for pages and apps with no API, with terms-of-service limits | "there's no API for this", "grab this from the open page", "control the app" |
| `cx-agents-md-portability` | AGENTS.md and CLAUDE.md as linked system prompts, mirrored skill folders | "make this work in Codex too", "where does the system prompt live" |
| `cx-deliver-to-clients-security` | Client's infra and token bill, two delivery shapes, password-protected staging, 80/20 security checklist | "how do I hand this to a client", "who pays for tokens", "is client data safe" |

## Deliberately not turned into skills

- Chapter 1 intro and the Maker School pitch in chapter 12 (marketing, no technique).
- Chapter 2 installation and the button-by-button tour (Codex-specific UI, changes often). The durable bits (full access vs approve mode, medium effort default to save usage, dictation, plugins) are folded into `cx-variant-sampling-prompting` and `cx-plugins-and-mcp`.
- The "pet" companion feature, upvote and downvote, and pull request review (dev-specific, not a business technique).
- Nick's pricing commentary on ChatGPT Plus, Codex vs Claude plans and image credits. Recorded in the relevant skills as "as he said it, may have changed," not a skill.
- Video clipping tools (Opus Clip, Vizard). Nick explicitly did not go deep, so they are a note inside `cx-content-repurposing`.

## Top 5 takeaways for Caleb

1. **Front of the funnel first.** Listing marketing, speed to lead, proposals and follow-up compound. Transaction admin can wait.
2. **Prompt, skill, local, cloud, in that order.** Make the listing kit or consult-to-proposal work once by hand before scheduling anything. Each level is a checkpoint.
3. **Sample and dictate.** Ask for 10 listing descriptions, not one. Talk the context in, do not type a clever sentence. If Claude says it cannot, tell it that it can.
4. **Humans keep the last 10%.** Nothing posts, sends or publishes without Caleb's review. The system generates, Caleb QAs. This is both the quality rule and the compliance rule for a REALTOR.
5. **Build for maintenance from day one.** GitHub repo, `MAINTENANCE.md`, evals, a failure DM, and a knowledge base file about Caleb's business that every skill reads. Voice agents only for high-volume, low-stakes calls like after-hours listing inquiries, never for seller consults.
