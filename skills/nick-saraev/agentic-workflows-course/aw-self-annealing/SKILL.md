---
name: aw-self-annealing
description: Makes agentic workflows self-annealing so that every error triggers a diagnose, fix, update, re-run loop and the directive and scripts harden over time instead of breaking like a traditional automation. Use when Caleb says "it broke again", "make it fix itself", "it keeps asking me what to do", "why does this work on the second run but not the first", "add retry logic", or when an AIRE workflow (lead scrape, CRM sync, listing report) fails on an edge case it should have learned from.
---

# Self-Annealing Workflows

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapter 25
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=13261s), with the testing loop from chapter 22
(&t=11299s)

## What Nick teaches

Annealing is heating metal and cooling it so the atoms settle into a stronger lattice.
Self-annealing is the same for workflows: every error, issue or improvement opportunity reinforces
the flow. Day one, a directive is a few rough bullet points. After 60 days of use it is a
"battle-hardened protocol" with retry logic, validation steps and human-in-the-loop checkpoints you
did not know you needed. Old automations (n8n, Make) are brittle and break at the first hiccup.
These strengthen.

**The loop:**

1. **Error** occurs.
2. **Diagnose** where it came from.
3. **Fix** (attempt a fix).
4. **Update** the execution script and the directive.
5. Repeat until success, then do a **documentation upgrade**: tell the directive this was a common
   issue and it is now reinforced.

The agent continues until the operation succeeds or hits a truly unfixable wall. Even then it often
finds a creative workaround. Example: the definition of done says 50 blog posts, the scraper returns
40, the agent changes a filter, reaches 50, then pings you: "this mostly worked, is this filter okay
too?" Your yes cements the change.

**Employee A vs Employee B.** Employee A is the blocker: every problem becomes your problem, work
halts, same mistakes repeat, you become the bottleneck. Employee B tries on their own first,
escalates only when necessary, documents the solution so the team never hits it twice.
Self-annealing agents behave like B.

**How to enable it:** a small set of instructions in the system prompt that changes the default
problem-solving mode. Coding agents default to "if I can't do something, ask the user", which makes
sense for enterprise codebases but not for modular, unit-testable workflows in your own IDE. Nick's
line: "When you encounter an error, first diagnose it, then fix it, then update your scripts and
directives to handle similar errors in the future. Try super hard before escalating to the user."

What happens over time: retry loops and exponential backoff appear on their own, logging gets added,
edge cases get handled as encountered, and efficiency improvements (bulk endpoints, parallel
workers) happen organically. If the directive says "this should finish under 5 minutes, if it takes
longer, iterate on solutions," the agent will optimize itself.

**The verification rule (chapter 22):** after a workflow anneals in one session, say "make sure to
document all changes, both directives and executions," then open a brand-new agent instance and run
it cold. If the fresh instance succeeds from the directive alone, the annealing stuck. Nick's
LinkedIn scraper went from 231 prospects with API errors on run one to 45 of 66 leads on a
cold-start run two, about four minutes, no help.

## Step by step

1. Confirm the self-annealing block is in `CLAUDE.md` (see `aw-system-prompt-agents-md`).
2. Run the workflow with real data. Do not fix errors by hand. Let the agent loop.
3. When it asks, answer the question or say "are you sure you fully tried? Research the API spec first."
4. When it succeeds, say "document all changes in both the directive and the scripts."
5. Open a fresh session and run the workflow cold with new input.
6. If the fresh run stumbles, that is a documentation gap. Have it fix the directive and repeat step 5.
7. For recurring classes of error, add a one-line rule to the system prompt.

## Templates / prompts

System prompt block:

```markdown
## Self-annealing
When you encounter an error: diagnose it, fix it, then update the
execution script and the directive so similar errors are handled in the
future. Loop until the operation succeeds. Try very hard before escalating
to me. When you succeed after a fix, add a change log line to the directive
explaining what was reinforced.
```

Directive performance clause:

```markdown
## Performance target
This workflow should complete in under 5 minutes for 200 records. Time
yourself. If slower, propose and implement a faster approach (bulk
endpoints, batching, parallel requests) and record it in the change log.
```

Post-run prompts:

```
Make sure to document all changes, both directives and executions.
```
```
(fresh session) Here is a new input: [URL / file]. Run the [name] workflow.
```

## Pitfalls Nick calls out

- Leaving the default "ask the user" behavior in place. You become Employee A's manager.
- Fixing scripts and forgetting the directive. The next fresh session follows stale instructions,
  finds mismatched parameters, and burns 5 to 10 minutes debugging. The documenter sub-agent exists
  for this.
- Declaring victory in the same session that fixed things. Only a cold-start run proves it.
- Treating errors as failures. "Every time something breaks, it's a feature, not a bug."
- Expecting it to never escalate. Some walls are real. Answer quickly and let it continue.

## How Caleb should use this

- Let AIRE's lead-enrichment and CRM-sync scripts anneal against real Baton Rouge and St.
  Francisville data for a week before relying on them.
- Put minimums and time targets in directives (for example "at least 25 qualified seller leads" or
  "under 3 minutes") so the agent optimizes on its own.
- When a workflow pings Caleb with "this mostly worked, is this filter okay," answer, because the
  answer gets written into the directive.
- Keep client-facing sends behind approval even as the rest anneals. Hardening applies to the data
  path, not to the decision to contact someone.
- Any annealing that spends on paid APIs (skip tracing, enrichment) should use small test batches
  first. Volume runs need Caleb's approval before running.

## Verification

- Directive change log shows dated entries after fixes.
- Scripts contain retry or backoff where an API previously failed.
- A fresh session completes the workflow cold on new input without asking how.
- The number of escalations to Caleb per run trends toward zero over a week.
