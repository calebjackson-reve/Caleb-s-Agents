---
name: aa-multi-model-mcp-orchestration
description: Sets up one agent (usually Claude Code) as a manager that delegates subtasks to other models (Codex for backend and tests, Gemini for front end and video) registered as MCP servers, then validates and integrates the results. Use when Caleb says "use the best model for each part", "have Claude manage Codex and Gemini", "build the UI with Gemini and the backend with Codex", or when an AIRE build has a clearly separable front end, back end and test layer and a few points of quality matter more than token cost.
---

# Multi-Model MCP Orchestration

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapter 9
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=2343s)

## What Nick teaches

If the few-percentage-point differences between models matter to you, let one model be the
**orchestrator** and have it delegate chunks of a task to the models that are best at them. His
example stack:

- **Claude Code** is the manager. It plans, reasons, delegates, validates, and fixes integration
  issues.
- **Gemini** gets front-end / UI tasks (and anything multimodal, like watching a video).
- **Codex** gets back-end / API tasks, testing, and anything needing sandboxed cloud code execution.
- Something outside the three (he mentioned Perplexity) could handle real-time web data.
- At the end Claude (he uses Opus, 4.6 at recording) collects, unifies, then does Q&A, bug fixes and
  agent review.

The heart of it is a **router**: a decision hub that splits an input into subtasks and sends each to
the model best at it, parallelizes the sweep, then recombines.

Demo: in Claude Code he opened a folder called `multi-platform-orchestration` and asked for "a
full-stack app that lets users enter a desired image to generate, and then it generates said image."
Claude entered plan mode, asked which image API (he chose Nano Banana Pro 2, a Google model),
produced a plan with back-end, front-end and test subtasks, and on "plan approved" dispatched work:
Codex via an "execute task" path, Gemini for the front end, itself for integration. The result
generated a cat on a beach wearing sunglasses.

Under the hood: MCP servers that call Codex and Gemini are registered inside Claude Code, and a
CLAUDE.md describes the manager role: "you plan, reason, delegate, validate, and fix integration
issues. When you break tasks down, break them into front-end, back-end and test subtasks, and
delegate as required." You need API keys from each platform's developer console (separate from the
consumer subscriptions). Hand the keys to the orchestrator and it can set the servers up for you.

Why do it: parallel work, each layer built by its strongest model, and an orchestrator that judges
the code without having its context polluted by writing it. Why not: it costs more. Subscriptions
subsidize usage (he said the $200/month Max plan is worth roughly $5,000/month of API usage), API
billing does not. Any model can be the orchestrator.

## Step by step

1. Decide this is worth it: the task has separable layers and quality matters more than cost. If
   not, stay single-model.
2. Get API keys from the OpenAI and Google developer consoles (and Anthropic if orchestrating from
   elsewhere). Store them as environment variables, never in files committed to the repo.
3. Create a project folder with a CLAUDE.md describing the manager role (template below).
4. Ask Claude Code to register Codex and Gemini as MCP servers using those keys.
5. Give the high-level task. Let it enter plan mode. Review the delegation plan. Approve.
6. Watch the dispatches. When done, have Claude run its own integration test and an unbiased review
   (see aa-sub-agent-verification-loop).

## Templates / prompts

Manager CLAUDE.md:

```
# Role: Orchestrator
You are the manager. You plan, reason, delegate, validate, and fix integration issues.
You do not write front-end or back-end code yourself unless integration requires it.

## Delegation rules
- Front-end / UI / visual design: delegate to the Gemini MCP server.
- Back-end / API / data / tests: delegate to the Codex MCP server.
- Reasoning, review, integration, final validation: you.

## Process
1. Enter plan mode. Break the task into front-end, back-end and test subtasks.
2. Ask the user any blocking questions (APIs, keys, hosting) before dispatching.
3. Present the plan. Wait for "plan approved."
4. Dispatch subtasks in parallel. Collect outputs.
5. Integrate, run tests, fix issues, report.

## Definition of done
App runs locally end to end. Tests pass. Report what each model built.
```

Kick-off prompt:

```
Build me <app>. You are the orchestrator per CLAUDE.md. Delegate front end to
Gemini and back end plus tests to Codex. Plan first, ask me anything blocking,
then wait for my approval.
```

## Pitfalls Nick calls out

- Do not sign up for every platform and burn tokens unless you have to. This is a frontier pattern.
- API billing is not subsidized the way subscriptions are. Expect to spend more.
- Keys are required per platform and live in the developer console, not the chat app.
- Orchestration quality depends on the manager's interpretability. That is why he uses Claude as the
  manager.

## How Caleb should use this

- AIRE client portal: Gemini builds the dashboard UI, Codex builds the CRM-sync API and tests,
  Claude Code integrates. Only worth it once the single-model version is visibly short on polish.
- Adding API keys and paying per token is new spend. Needs Caleb's approval before running.
- Keep this pattern off everyday REALTOR tasks (listing copy, follow-ups). Those are single-model
  jobs.
- Even if Caleb never goes multi-model, the manager CLAUDE.md pattern (plan, delegate to sub-agents,
  validate) works with Claude-only sub-agents.

## Verification

- `claude mcp list` (or the platform equivalent) shows the Codex and Gemini servers registered.
- The plan explicitly names which model gets which subtask.
- The final report says what each model built and the app runs end to end.
