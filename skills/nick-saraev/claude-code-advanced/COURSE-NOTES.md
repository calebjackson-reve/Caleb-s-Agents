# Course Notes: Claude Code Advanced Full Course (3 Hours)

**Instructor:** Nick Saraev
**URL:** https://www.youtube.com/watch?v=UPtmKh1vMN8
**Length:** 198 minutes, 29 chapters
**Skills folder:** `/home/user/Caleb-s-Agents/skills/nick-saraev/claude-code-advanced/`

## Nick's core thesis

Claude Code is a harness around a very smart model, and the harness is what you control: the system prompts, the folder structure, the skills and subagents, and the loops you run it in. Advanced use is not a magic mega-prompt. It is a discipline of compressing knowledge into CLAUDE.md, writing learnings back after every task, parallelizing work across cheap fresh-context agents with a smart synthesizer, and eventually handing whole optimization problems to autonomous research loops. Because you will end up depending on Claude for most of your productivity, you also diversify (a backup agent, portable workspaces), keep the workspace clean, and cover the cheap 80/20 security basics. Human involvement keeps shrinking, so the people who learn to run these loops now get asymmetric leverage.

## Chapter by chapter

| # | Chapter (start) | One line |
|---|---|---|
| 1 | Introduction (0:00) | Course assumes Claude Code experience. Outline: CLAUDE.md, harnesses, agent teams, skills/subagents, auto-research, browser automation, performance fluctuations, workspace organization, security, future. |
| 2 | Advanced System Prompts and CLAUDE.md (0:57) | Uses Claude Code extension in Antigravity (desktop app works too). A CLAUDE.md is four things: knowledge compression, preferences and conventions, declaration of capabilities, log of failures and successes. |
| 3 | Optimizing Workspace Organization (9:03) | Global `~/.claude/CLAUDE.md` vs local project CLAUDE.md. Global gets profile, reasoning strategies, preferences, agency reminders, token conservation. Local gets compressed project map, API docs, project capabilities. |
| 4 | Planning Features (13:57) | The local loop: plan, instantiate, compile learnings, update CLAUDE.md, repeat. The global loop: after many runs, `/insights`, distill, manually review (0.9^3 = 73%), update global. |
| 5 | Workflow Management and Learning Loop (17:30) | The two loops form an infinity sign. Tight workspaces stop Claude from stumbling through 20k tokens per task. |
| 6 | Starting a New Project (17:53) | Develop vanilla first, then `/init` (45x compression example, 6k tokens saved per lookup). Capture preferences in the moment. Ask "how could you have done this faster and for fewer tokens." Lab-notes meta prompt. |
| 7 | Utilizing Agent Harnesses (26:47) | Run `/insights` (1,049 messages, 200 sessions), distill into dense global rules, check for contradictions, add docs-first rule, drop into `~/.claude/CLAUDE.md`. Profile section example. |
| 8 | Understanding Parallelization (34:28) | What a harness is: everything around the LLM (system prompt, hooks, tools, compaction limits). Other harnesses: Droid, Pi, LangChain's post, Anthropic's "Effective Harnesses for Long Running Agents" (Nov 26, 2025). Harness affects safety (Codex rm -rf anecdote). |
| 9 | Stochastic Consensus and Debate (42:07) | Why parallelize: waiting is unproductive, independent steps (20 min to 12), stochastic outputs cover more space, context degrades. Fan-out/fan-in with Sonnet researchers and Opus synthesizer, live demo with six subagents. |
| 10 | Multi-Agent Consensus (58:09) | Stochastic consensus: count the mode across agents, surface outliers. Debate: agents see each other over time steps. Tomatillo demo: 10 personas, 119 raw ideas, 52 unique. |
| 11 | AI-Powered Cooking (66:12) | Outliers like tomatillo beurre blanc. Introduces the `model-chat` skill: five instances in a shared room, round-robin with parallel rounds. |
| 12 | Model-Chat (67:32) | Skill extracts topic, mode, agents, rounds, runs a script where agents read each other, then synthesizes tiers (settled, rejected, open). |
| 13 | Algorithmic Art (69:17) | Applies consensus via agent teams to Anthropic's algorithmic-art demo app. Terminal preferred for agent teams. |
| 14 | Streamlining Agent Teams (71:35) | 10 analysts in parallel, Shift+Down to view, consensus/bugs/divergence/outliers, implement with agent teams, reviewer-bugs and reviewer-features agents report to lead. Pipeline: dev, bug fix, QA specialists. |
| 15 | The Pipeline Concept (76:58) | Combine debate, fan-out, pipeline. Context management defined. Skills and subagents are the same markdown SOP in different wrappers. |
| 16 | Skills vs Subagents (81:36) | Org-chart tools (Paperclip, Company Helm) organize by role, skills by task. Skills don't delegate to skills. |
| 17 | Organizational Hierarchies (82:58) | OpenGoat, "the system", Gas Town, CrewAI, Swarm Claw all "suck right now." Two patterns worth using: Parent + Sonnet researchers + Opus QA, or Developer + context-free QA. Every hop compounds drift. |
| 18 | Introduction to Auto-Research (89:26) | Karpathy's loop applied to Lighthouse (LCP, FCP, TBT, performance) on leftclick.ai. Needs a defined goal, change method, standardized assessment. |
| 19 | Setting Up Auto-Research (92:03) | Repo files: prepare.py (skip), train.py (the target), program.md (instructions). Clone into a subfolder, build a demo site, prompt for loop plus dashboard. Vibe coding to agentic engineering to independent research. Pixel-parity constraint. |
| 20 | Key Components (102:45) | Metric, change method, assessment, all fast. 30s + 30s = 1,440 runs/day, 1.01^30 = 34%/day. Tobi Lutke on Shopify Liquid: 53% faster, 61% fewer allocations. Applies to SaaS, support prompts, cold email (6 to 10 tests/day at 500 to 1,000 emails), ads, copy. |
| 21 | Applications of Auto-Research (108:43) | Conversion rate, anything with data volume. Then HTTP basics: GET returns HTML, view source, web fetch "just the text," scrape 400 URLs from a list. |
| 22 | HTTP Requests (113:35) | Booking a cal.com slot via HTTP: found API docs, checked availability, booked after 10 to 15 minutes. Works but fragile and narrow. |
| 23 | Browser Automation (115:29) | Chrome DevTools MCP drives a real browser (about 5s per action), completed the booking with dropdowns and phone reformatting. Rentals.ca demo. Gradient: HTTP is setup-heavy but cheap/fast, browser always works but slower. Prototype in browser, then HTTP. |
| 24 | Advanced Browser Automation (120:10) | Browser Use: undetectable fingerprinted browsers, about $100 plus credits, for social media. Computer use via Claude desktop app: controls mouse and keyboard, renamed a Downloads file. Standard play: browser first, capture network requests, build HTTP utility, document it. ToS warning. |
| 25 | Performance Fluctuations (127:51) | Monoculture analogy (Interstellar corn). Claude is the best harness, so everyone depends on it. Opus 4.6 outage (about an hour), Opus 4.5 degradation from Dec 17, 2025. |
| 26 | Diversifying Your Models (132:54) | 70% Claude, 30% Codex and open models. Conductor (parallel Claude and Codex agents), Codex MCP server inside Claude Code (`npm i -g @openai/codex`), Codex desktop app. Duplicate workspace to agents.md spec, or keep AGENTS.md/GEMINI.md in sync. Gemini only strong at front-end design in his tests. |
| 27 | Organizing Your Workspace (144:17) | `.claude/`, `active/`, `.env`, `CLAUDE.md`. Business and personal workspaces, client subfolders with own .env/skills/CLAUDE.md, pointer line for client skills, never pollute root, skills specify output paths, `active/.tmp`, cleanup prompt, VS Code color per workspace. |
| 28 | Security Concerns (159:16) | 80/20 security: chat logs in `~/.claude` JSONL leak pasted keys (use .env), hallucinated/typosquatted packages, Supabase RLS (Moltbook breach), public servers scanned constantly, never touch card numbers (Stripe), fresh-session security audit, different agent implements, Claude reviews. |
| 29 | Future of Claude and Agentic Engineering (180:28) | Decreasing human involvement (auto mode, Claude planning and QA itself), each person becomes CEO of an agent fleet, software quality is no longer the moat (distribution, compliance, relationships are), SaaS less attractive, pace of change accelerating, early adopters hold asymmetric leverage. |

## Skills created

| Skill | What it does | Trigger phrases |
|---|---|---|
| `cca-claude-md-global-vs-local` | Four-pillar CLAUDE.md design and the global vs local split, with templates | "set up my CLAUDE.md", "global vs project CLAUDE.md", "Claude forgets it can do X", "Claude asks me to run commands" |
| `cca-local-learning-loop` | `/init`, plan, build, reflection question, lab-notes meta prompt, preference capture | "init this project", "same mistake again", "save that as a preference", "add lab notes" |
| `cca-insights-global-distill` | `/insights`, distillation prompt, manual contradiction review, global file install | "run insights", "update my global CLAUDE.md", "Claude does this wrong everywhere" |
| `cca-fan-out-fan-in-research` | Parallel cheap researchers plus Opus synthesizer for any research or analysis | "research this from several angles", "compare these tools", "competitor research", "analyze my market" |
| `cca-stochastic-consensus` | n persona agents, count the mode, surface outliers, consensus report | "poll agents", "get consensus", "spawn n agents", "all my options for" |
| `cca-model-chat-debate` | Shared-room multi-round debate with synthesis tiers | "have the agents debate", "model chat", "stress test this idea", "tier these options" |
| `cca-agent-teams-consensus-build` | Agent teams: analysts to consensus, team implementation, reviewer agents, pipeline of specialists | "use agent teams", "have a team build and review this", "turn this prototype into a real app" |
| `cca-lean-agent-hierarchies` | Skill vs subagent decision, Parent+Researchers+QA or Dev+QA, reject bloated org charts | "skill or subagent", "set up a QA agent", "build an agent org", "how should my agents delegate" |
| `cca-auto-research-loop` | Metric, change method, assessment, clone autoresearch, write program.md, dashboard | "auto research", "optimize until", "run experiments overnight", "improve Lighthouse" |
| `cca-automation-ladder` | HTTP vs Chrome DevTools MCP vs Browser Use vs computer use, and graduating browser flows to HTTP | "scrape this", "book this", "fill out this form", "browser or API", "automate posting" |
| `cca-model-diversification` | Codex MCP, Codex app, Conductor, AGENTS.md sync, outage runbook | "Claude is down", "backup for Claude Code", "sync CLAUDE.md to AGENTS.md" |
| `cca-workspace-organization` | Business/personal/client structure, active/, never pollute root, cleanup prompt, color cue | "organize my workspace", "clean up active", "folder for a client or listing", "root is a mess" |
| `cca-security-80-20` | .env only, chat-log leakage, typosquats, RLS, public servers, Stripe, fresh-agent audit | "is this safe", "security audit", "before I put AIRE online", "I pasted a key in chat" |

## Not turned into skills

- Chapter 1 (intro) and chapter 29 (future of work): opinion and framing, summarized above.
- Chapter 8's harness survey (Droid, Pi, LangChain post, Anthropic's long-running agents post): conceptual background, folded into the fan-out skill's rationale rather than a standalone skill.
- Chapter 16 and 17's tour of org-chart frameworks (Paperclip, Company Helm, OpenGoat, Gas Town, CrewAI, Swarm Claw): Nick recommends against them, so they appear only as "what not to do" inside `cca-lean-agent-hierarchies`.
- Chapter 25's monoculture analogy: motivation only, captured in `cca-model-diversification`.

## Top 5 takeaways for Caleb

1. **Give every Claude conversation a Caleb profile.** A global CLAUDE.md that says he is a REALTOR building AIRE, not an engineer, and prefers speed over cost will change the quality of every answer. Add the "you do the work, don't hand me commands" reminder and the docs-first rule.
2. **Close the loop after every AIRE build.** Ask "how could you have done that faster and for fewer tokens," save the answer as a one-line preference, and keep a lab-notes section so Claude stops repeating CRM and formatting mistakes.
3. **Stop researching in one long thread.** For tool comparisons, market analysis, listing strategy or competitor research, fan out five Sonnet researchers and let Opus synthesize. For idea generation, poll 10 persona agents and read the outliers. For judgment calls, run a model-chat debate.
4. **Point auto-research at measurable things.** Listing landing page speed (Lighthouse, pixel-parity constraint) and AIRE's lead response pipeline (replay past leads) are safe local loops. Cold outreach copy is a real use but sends messages, so it needs Caleb's sign-off and volume.
5. **Do the cheap security and resilience work before AIRE goes public.** Keys only in `.env` (chat logs are plain text on disk), RLS on every Supabase table, Stripe for any payment, a fresh-session audit implemented by a different agent, an `AGENTS.md` mirror and Codex ready so an Anthropic outage does not stop lead follow-up.
