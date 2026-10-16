# Course Notes: AI Agents Full Course 2026: Master Agentic AI (2 Hours)

- **Instructor:** Nick Saraev
- **URL:** https://www.youtube.com/watch?v=EsTrWCV0Ph4
- **Length:** 133 minutes, 28 chapters
- **Skills folder:** `/home/user/Caleb-s-Agents/skills/nick-saraev/ai-agents-course/`

## Nick's core thesis

An AI agent is not the LLM. It is the LLM plus tools, memory and a loop (observe, think, act)
that runs until a clearly stated definition of done. Agents are not yet smarter than a person at any
one thing, but they are fast and they parallelize, so the leverage comes from architecture: spawn
many of them, vary their framing, let them debate, have fresh-context agents review each other's
work, and route each job to the model best at it. Vague prompts are the number one cause of
disappointment, so contracts and clarifying questions come before building. Context windows are
finite and quality drops as they fill, so keep the always-on core small and load everything else on
demand, and route bulk work to cheaper models.

## Chapter-by-chapter summary

| # | Chapter | One line |
|---|---------|----------|
| 1 | Introduction (0m) | What the course covers: demo first, then loop, platforms, prompting techniques, context, pricing. No skill. |
| 2 | Multi-Agent Chrome MCP Workflow Demonstration (2m) | Fleet of Claude Code agents, each in its own Chrome, filling contact forms for leads with no email. |
| 3 | Core Agent Workflow (4m) | Observe, think, act loop repeating until a definition of done, then a task-complete reply. |
| 4 | Understanding AI Agent Architecture (9m) | Agent = LLM + tools + goal + memory + loop. Codex creatine research demo of the loop. |
| 5 | The Three Major Platforms (13m) | Sign-up and first prompt on Codex, Claude Code, Antigravity. Same portfolio-site prompt on all three. |
| 6 | Platform-Specific Performance Insights (22m) | Claude: interpretable, consistent, slower, weaker design. Gemini: design, video, inconsistent. GPT: backend, math, TDD. |
| 7 | Self-Modifying System Prompts (25m) | GEMINI.md / AGENTS.md / CLAUDE.md with a Learned Rules section the agent appends to on every correction. |
| 8 | Standardizing Workflows with Agent Skills (34m) | Skills as SKILL.md with YAML front matter turn variance into repeatable SOPs. Algorithmic art demo. |
| 9 | Multi-Agent Orchestration Strategies (39m) | Claude as manager, Codex for backend and tests, Gemini for front end, via MCP servers and API keys. |
| 10 | Video-to-Action Pipeline (47m) | Gemini watches a YouTube tutorial, writes hyper-detailed steps, Claude executes them with Chrome MCP (n8n demo). |
| 11 | Implementing Stochastic Multi-Agent Consensus (56m) | Spawn N sub-agents with varied framings to traverse more of the search space. TikTok problem demo. |
| 12 | Agent Suggestions Unveiled (64m) | The 10 agents' suggestions and disagreements (Spark ads, Shorts, micro-topic focus). |
| 13 | Consensus Reports and Insights (65m) | The consensus report: hook reformatting and fresh accounts agreed by all. |
| 14 | Harnessing Multiple Agents (66m) | Consensus, divergent, outlier tiers and how to act on each. About $3 to $4 in tokens. |
| 15 | Agent Chat Rooms Explained (67m) | Agents with distinct personalities debate in a shared chat.json for spikier answers. |
| 16 | Debate and Collaboration Among Agents (70m) | Model-chat demo: systems thinker, pragmatist, edge-case finder, user advocate, contrarian. Synthesis plus disagreements. |
| 17 | Sub-Agent Verification Loops (73m) | Implementer, reviewer, resolver. Fresh-context reviewer sees output only, not reasoning. |
| 18 | The Mixture of Experts (77m) | Why averaging statistical machines works. Agent-review demo finds 22 issues Gemini missed. |
| 19 | Prompt Contracts Introduced (80m) | Vague tasks are the number one problem. Goal, constraints, format, failure. Like a scope of work. |
| 20 | Crafting Effective Prompt Contracts (84m) | prompt-contract skill demo on "beautiful site for leftclick.ai." |
| 21 | Reverse Prompting for Clarity (87m) | Agent asks five clarifying questions first, then chains into a prompt contract. One Second Copy site demo. |
| 22 | Context Management Strategies (91m) | Why one browser agent is slow (2 to 3 min per form) and the multi-Chrome orchestrator design with a shared chat. |
| 23 | Multi-Agent Chrome Automation (97m) | Vancouver rental demo with four parallel Chrome agents, then what fills the context window and /context audit. |
| 24 | Understanding MCP Tools and Skills (108m) | MCP tools as cockpit buttons, memory files, and auto-compaction explained. |
| 25 | Context Compression Techniques (113m) | How compaction squishes text, and the iceberg technique: small always-on core, everything else on demand. |
| 26 | Optimizing Token Usage (119m) | Naive vs strategic loading, YAML front matter, summarized tool results, the cost-quality curve, 60-30-10 intro. |
| 27 | Cost-Efficient Multi-Agent Strategies (126m) | The 60-30-10 math ($500 becomes $200), lead-scraping tiered pipeline at about $0.015 per lead, batch APIs. |
| 28 | LLM Pricing Principles (131m) | Why providers discount batch jobs (load balancing), and the outro. No skill. |

## Skills created

| Skill | What it does | Trigger phrases |
|-------|--------------|-----------------|
| aa-core-agent-loop | Observe/think/act loop and writing a definition of done | "why did it stop early", "add a definition of done", "how do agents work" |
| aa-pick-model-by-strength | Choose Claude, Codex or Gemini by task strength | "which model should I use", "front end vs back end", "video understanding" |
| aa-self-modifying-claude-md | CLAUDE.md with a Learned Rules section that grows on every correction | "remember this for next time", "stop doing that", "set up my CLAUDE.md" |
| aa-skills-as-sops | Turn a repeated workflow into a SKILL.md | "make this a skill", "standardize how we do X", "save this as a workflow" |
| aa-multi-model-mcp-orchestration | Claude manages Codex and Gemini as MCP servers | "use the best model for each part", "have Claude manage Codex and Gemini" |
| aa-video-to-action-pipeline | Gemini extracts steps from a video, Claude executes them | "learn this from the video", "replicate this tutorial", "extract the steps" |
| aa-stochastic-consensus | N varied sub-agents, aggregated into consensus/divergent/outlier | "give me every angle", "stochastic consensus", "rank these options" |
| aa-agent-chat-room-debate | Persona agents debate in chat.json, then synthesis | "have the agents debate", "model chat", "pressure test this" |
| aa-sub-agent-verification-loop | Fresh-context reviewer and resolver on output only | "review this", "agent review", "/agent-review", "is this right" |
| aa-prompt-contract | Goal, constraints, format, failure contract before building | "prompt contract", "scope this first", any vague build request |
| aa-reverse-prompting | Five clarifying questions, then contract | "ask me questions first", "reverse prompt", "interview me" |
| aa-multi-agent-chrome-orchestration | Parallel Chrome DevTools MCP agents with a shared chat file | "do this on every site", "fill out all these forms", "scrape multiple sites" |
| aa-context-window-management | /context audit, compaction, iceberg technique | "/context", "it's getting dumber", "it compacted", "CLAUDE.md is huge" |
| aa-tiered-model-cost-routing | 60-30-10 model tiers and batch APIs | "costing too much", "cheaper model", "cost per lead", "optimize tokens" |

## Top 5 takeaways for Caleb

1. **Write the definition of done every time.** Every AIRE prompt, follow-up draft, CMA or outreach
   list should end with a concrete stopping condition and "wait for Caleb" before anything sends.
2. **Let CLAUDE.md learn.** Add a Learned Rules section to the main project file so voice rules
   (no em dashes), brokerage name, market defaults and safety rules accumulate instead of being
   repeated in chat.
3. **Scope before building.** Reverse-prompt (five questions) then prompt-contract (goal,
   constraints, format, failure) on anything client-facing. This is the single biggest quality lever
   and costs nothing.
4. **Use fresh eyes.** Run agent-review on code, CMAs and email sequences before they reach a
   client. The agent that built it cannot see its own mistakes.
5. **Mind the window and the bill.** Audit `/context`, keep the core small, load detail on demand,
   and route bulk lead work to cheaper model tiers. Any spend beyond the subscription needs Caleb's
   approval first.

## Deliberately not turned into skills

- Chapter 1 (intro) and chapter 28's outro: no technique.
- Platform sign-up walkthroughs in chapter 5: pure UI setup that changes often, and the
  strengths/weaknesses are captured in aa-pick-model-by-strength.
- Nick's personal "Claude Code inside Antigravity" stack (chapter 10): mentioned inside
  aa-video-to-action-pipeline, not its own skill, since it is a preference not a technique.
- Mixture-of-experts theory (chapter 18): folded into aa-sub-agent-verification-loop as the "why."
- Browser fingerprint evasion (chapter 23): Nick declined to teach it and so does this repo.
- The LLM pricing cheat sheet (chapter 27): prices change too fast, so the skill tells Caleb to check
  the provider pricing page instead.
