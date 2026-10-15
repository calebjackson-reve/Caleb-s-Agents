---
name: aw-system-prompt-agents-md
description: Writes or upgrades the agent system prompt file (CLAUDE.md, AGENTS.md, GEMINI.md) using Nick Saraev's required ingredients, explaining the framework and its rationale, self-annealing error handling, an autonomy rule, safety guardrails and a change log. Use when Caleb says "write my CLAUDE.md", "the agent keeps asking me what to do", "it deleted my API key", "make it more autonomous", "add a rule so it never does X again", or when an AIRE agent repeats a mistake that a one-line rule would prevent.
---

# The System Prompt (AGENTS.md / CLAUDE.md)

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 21, 14
and 26 (https://www.youtube.com/watch?v=MxyRjL7NG18&t=10861s, &t=6341s, &t=13830s)

## What Nick teaches

"Everything begins and ends with your system prompt." It is injected at the start of every session,
so you never repeat yourself. It is a supercharged prompt: long, comprehensive, covering edge cases,
and it is "kind of the moat". Nick offers his as a starting point but says to include four things
regardless of whose you use:

1. **Explain the framework and where things live.** Directives in `/directives`, scripts in
   `/execution`, scratch in `/tmp` (delete temp files when done), keys in `.env`.
2. **Explain the rationale.** Do not just say "use DOE". Say: as an LLM your odds of doing things
   reliably without a framework are low, LLMs are probabilistic, business logic is deterministic, so
   directives store what, you orchestrate, scripts execute, and this cuts error rates. "You almost
   have to get buy-in from the model." Buy-in produces higher quality output.
3. **Explain self-annealing.** When an error happens: diagnose, fix, update scripts and directives
   so the same error never recurs. Errors are features that reveal weak points.
4. **Give it autonomy.** "My goal is for you to run autonomously without me." Test each system
   yourself, find mistakes yourself, loop until it works. Be careful with API calls and tokens
   during testing. Come to me only if you are 100% confident you cannot solve it without human
   input.

He also states that directives and execution scripts are living documents the agent must update when
it finds an error or constraint. He adds a line to his system prompt roughly once a week when he
spots a new recurring edge case, and the mistake stops.

**Safety lines (chapter 26).** Autonomous agents with bypass permissions need guardrails, since even
99.9% per-step reliability over 1,000 steps is 36% overall. Nick always includes:

- Confirm with me before API calls above a cost threshold. Check usage, and if more than about $5
  was spent in the last few minutes, stop and notify me.
- Never modify credentials or API keys unless I explicitly say so (models reformat or delete keys
  they think are unused).
- Never remove secrets from `.env` or hard-code them in the codebase.
- Log every self-modification as a change log at the bottom of the directive, in a short
  commit-style line, so you can trace what changed and roll back without git.

Accept that some rules will occasionally be broken. Plan for graceful recovery, not perfect prevention.

## Step by step

1. Open or create `CLAUDE.md` in the workspace root.
2. Write the framework section: folders, naming conventions, `.env`, `tmp` hygiene.
3. Write the rationale section in plain language the model will "buy into".
4. Write the self-annealing section with the four-step loop and the "try hard before escalating" rule.
5. Write the autonomy section, including cost awareness during testing.
6. Add the safety lines and the change log requirement.
7. Copy the file to `AGENTS.md` and `GEMINI.md`.
8. Whenever the agent repeats a mistake, add one line to the prompt and re-copy.

## Templates / prompts

Minimal `CLAUDE.md` built from Nick's ingredients (fill in for AIRE):

```markdown
# AIRE Agent Operating Instructions

## Why this framework
You are a large language model. Your outputs are probabilistic. Most of the
work in this workspace (CRM updates, emails, documents, data pulls) must be
deterministic and identical every run. So we use a three-layer architecture
called DOE: Directives (what), Orchestration (you), Execution (how).
Following it keeps error rates near 2 to 3 percent instead of 30 to 50.

## Where things live
- /directives : one markdown file per workflow. Natural language only. No code.
- /execution  : one Python script per job. Explicit parameters. Clear errors.
- /resources  : reference files (tone guide, templates, compliance notes).
- /tmp        : scratch. Delete what you create when the task is done.
- .env        : all API keys and credentials. Read from here, never hard-code.
Use descriptive file names. Never acronyms.

## Self-annealing
When anything errors: 1) diagnose the cause, 2) fix it, 3) update the
execution script and the directive so this class of error cannot happen
again, 4) re-run. Loop until success. Try very hard before escalating.
Treat every failure as a weak point you just found.

## Autonomy
My goal is for you to run without me. Test each system yourself with real
inputs. Identify and fix your own mistakes. Only ask me when you are fully
confident you cannot proceed without human input, or when an action sends
something to a client or costs money.
Be mindful of token and API spend while testing. Use small test sizes first.

## Safety
- Confirm before API calls above $5 in a few minutes. Check usage first.
- Never modify, rotate, reformat or delete credentials unless I say so.
- Never move secrets out of .env or into code.
- Never send email, SMS or post publicly without my explicit go-ahead.
- Append a one-line change log entry to the bottom of any directive you edit.

## Directive conventions
Every directive has: objective, inputs, step-by-step process with the
scripts it calls, definition of done, edge cases and fallbacks, change log.

## Sub-agents
After writing or changing any script, call the reviewer sub-agent.
After a workflow self-anneals, call the documenter sub-agent.
```

One-line rule additions Nick's approach suggests:

```
- When a scrape returns fewer rows than the directive's minimum, widen
  filters and re-run before reporting. Do not report a partial result.
```

## Pitfalls Nick calls out

- Saying what to do without why. The model follows a framework better when it understands the reasoning.
- Leaving out the autonomy rule. Default model behavior is to stop and ask, which turns it from a
  coworker into a blocker.
- Letting the model manage keys. It will reformat or delete them.
- No change log and no version control. You cannot tell what changed or go back.
- Expecting 100% compliance. Some rules will slip. Design so slips are recoverable.

## How Caleb should use this

- Write one `CLAUDE.md` for the AIRE workspace and keep it under constant improvement. One new line
  per recurring mistake.
- Add AIRE-specific safety rules: never send to a client without approval, never change a listing
  price or MLS field, never text a lead outside Caleb's chosen hours, always include KW First Choice
  disclosure language where required.
- Point the prompt at `resources/caleb_tone_guide.md` so every draft sounds like Caleb.
- Keep the cost guardrail. Lead enrichment and skip-tracing APIs cost money per call. Those runs
  need Caleb's approval before running at volume.
- Copy the same file to `AGENTS.md` and `GEMINI.md` so Caleb can spread work across Claude and Gemini plans.

## Verification

- A fresh session answers "what do you do when a script errors" with diagnose, fix, update, re-run.
- A fresh session refuses to hard-code a key and reads from `.env` instead.
- After an edit, the directive ends with a dated one-line change log entry.
- The agent asks before sending anything external or spending above the threshold, and does not ask
  about things it can solve itself.
