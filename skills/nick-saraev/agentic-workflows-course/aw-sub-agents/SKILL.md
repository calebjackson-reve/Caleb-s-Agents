---
name: aw-sub-agents
description: Uses Claude Code sub-agents to isolate context and parallelize work, specifically Nick Saraev's two recommended ones, a reviewer sub-agent that checks execution scripts with fresh eyes and a documenter sub-agent that updates directives to match changed scripts, with least-privilege tool access for each. Use when Caleb says "review this script", "my context is full", "the directive is out of date", "create a sub-agent", "do these three research tasks at once", or when AIRE scripts have changed a lot and fresh sessions keep stumbling on stale directives.
---

# Sub-Agents: Reviewer and Documenter

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapter 36
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=18858s)

## What Nick teaches

**Why.** Context windows (200k to 1M tokens) fill fast. Detail-heavy tasks, debugging loops and MCPs
all burn context, and soon half the window is "intermediate garbage." That is context pollution, and
more tokens reliably means worse output (performance rises briefly with useful context, then
declines). Back in the GPT-2 and GPT-3 days he capped his copywriters at 256 tokens per prompt. The
tipping point is higher now, maybe around 10k, but the curve is the same.

**What a sub-agent is.** A task handed to a fresh, clean context. It does the messy work in its own
space and returns only relevant findings, like reasoning tokens that get discarded. Anthropic
reported Opus leading Opus sub-agents beat single-agent Opus by over 90% on research tasks (research
is token-heavy, so the gain is larger there than elsewhere). Nick resisted sub-agents for two years
as needless complexity, and now uses them narrowly because models got good enough.

**Costs.** Each handoff is a summarization step that adds error (99% per step compounds). Spinning
up a sub-agent adds latency. For simple tasks the main agent is faster. He only uses them inside a
framework like DOE or Claude Skills, and only two types.

**Where they live.** Markdown files like directives. In Claude Code: `.claude/agents/` in the
project (project scope) or `~/.claude/agents/` (global, across workspaces). Anatomy: name,
description, permissions (which tools it may use, in DOE that means which directives and
executions), and a system prompt. You do not write these. "Make me a sub-agent that does X, Y and Z"
and Claude creates the file in the right folder. Agents can spawn sub-agents, but sub-agents cannot
spawn sub-agents (a memory and safety limit), and all report back to the parent.

**Sub-agent 1: Reviewer.** The orchestrator that wrote the code is biased toward thinking it is
correct, like reading your own essay right after writing it. The reviewer loads fresh context with
only the directives and scripts and no history, judges purely on quality, and sends suggestions
back. Because it has no context, the code must be documented and simply written, which is itself a
quality forcing function. It notices missing error handling and inefficiency. Add to `AGENTS.md`:
"after you create any script, use the reviewer sub-agent to check its quality." It will not fire
every time once context is polluted, but it adds about 5 to 10% accuracy. You can also call it
manually: "call the reviewer and make sure this is fine."

His test on `scrape_cross_niche_outliers.py` found: functional but excessive API calls, no rate
limiting, potential quota exhaustion, O(n^2) string matching over 175 niche terms, and loading the
full transcript when only 8k characters were used. On `create_proposal.py` the reviewer found
discordant paths and, after fixes, the script waited for document readiness instead of polling, a
real improvement. Important detail: Claude first spawned the reviewer via a directive, so Nick said
"search through the .claude folder and see how it should be done, then create an actual Claude
command for this." Use the native format.

**Sub-agent 2: Documenter.** After self-annealing, the agent updates scripts repeatedly and forgets
the directive. The next fresh session follows stale instructions, finds mismatched parameters, and
wastes 5 to 10 minutes debugging. The documenter reads all files (scripts included) but writes only
to directives, and updates them to match current script behavior. Call it whenever a script changes.

**Parallel sub-agents.** The parent can spawn several at once (three lead scrapers over three
segments) and consolidate when all return, cutting a 3-hour serial job to 30 minutes and keeping the
main thread under a few thousand tokens. Tell them to write intermediate results to `tmp/research`
rather than returning everything.

**Least privilege.** Give each sub-agent only the tools it needs, like giving an intern read-only
access to production. Documenter: read everything, write directives only. A specialized coder: read
directives, write executions. Guardrails must be stronger because you are multiplying autonomies.

## Step by step

1. Ask Claude to create a reviewer sub-agent in native format under `.claude/agents/`, read-only,
   with a structured output the main agent can act on.
2. Ask Claude to create a documenter sub-agent, read all, write only `directives/`.
3. Add to `CLAUDE.md`: call reviewer after any script is created or changed, call documenter after
   any self-annealing session.
4. Test the reviewer on an existing script and apply its findings.
5. Test the documenter after a script change and diff the directive.
6. For token-heavy jobs (research, bulk scraping), have the parent spawn parallel sub-agents writing
   to `tmp/`, and consolidate.
7. Do not use sub-agents for simple one-step tasks.

## Templates / prompts

Reviewer creation (Nick's voice dump, adapted):

```
Create a reviewer sub-agent. It looks at execution scripts another agent
developed with totally fresh eyes and determines whether they are done as
effectively and efficiently as possible: error handling, rate limiting,
unnecessary API calls, inefficient loops, unused data, path correctness
against the directive. It has read-only access. It returns a structured
list of findings the top-level agent can act on. Set it up in the native
.claude/agents format so you can call it as required.
```

Documenter creation:

```
Create a documenter sub-agent whose job is to review execution scripts and
update the matching directives so they describe current behavior,
parameters and outputs. Read access to all files, write access only to
directives/. Append a change log line to each directive it edits.
```

`CLAUDE.md` lines:

```markdown
After creating or changing any execution script, call the reviewer
sub-agent and apply its findings. After any session where scripts
self-annealed, call the documenter sub-agent before finishing.
```

Parallel research:

```
Spawn three sub-agents to pull recent sales for Zachary, Central and
St. Francisville respectively. Each writes raw results to tmp/research/
<area>.json and returns only a 5-line summary. Then consolidate.
```

## Pitfalls Nick calls out

- Sub-agents for everything. Overhead and handoff error are real.
- Elaborate agent org charts. Two useful types beat ten shiny ones.
- Letting the main agent review its own code.
- Spawning sub-agents via a directive instead of the native format.
- Giving sub-agents broad write access.
- Expecting sub-agents to spawn sub-agents.

## How Caleb should use this

- Run the reviewer over every AIRE script that touches the CRM or client documents before trusting it.
- Run the documenter weekly, or after any session that fixed scripts, so a fresh Caleb session never
  follows stale directives.
- Use parallel research sub-agents for comps and neighborhood data across several areas at once.
- Keep sub-agents read-only for anything client-facing. Sending or publishing stays with the main
  agent and needs Caleb's approval before running.
- Sub-agents use plan tokens. Fine for Caleb's plan, but avoid spawning them for trivial tasks.

## Verification

- `.claude/agents/reviewer.md` and `.claude/agents/documenter.md` exist with name, description,
  tools and prompt.
- Reviewer on a known-rough script returns concrete findings (not "looks good").
- After a script parameter changes, the documenter updates the directive and the diff shows it.
- Main-thread context stays small during a parallel research task (check `/context`).
