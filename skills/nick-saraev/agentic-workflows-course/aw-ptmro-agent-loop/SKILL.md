---
name: aw-ptmro-agent-loop
description: Explains the five steps every agent runs on each message (Planning, Tools, Memory, Reflection, Orchestration, the PTMRO loop) and where a human should intervene, especially at the planning stage. Use when Caleb asks "how does the agent actually think", "why did it go off the rails", "should I plan this myself or let it plan", "why is it summarizing my chat", or when an AIRE automation makes a wrong early assumption and everything downstream breaks.
---

# The PTMRO Agent Loop

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapter 5
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=1803s), with background from chapters 3 and 4
(&t=275s, &t=711s)

## What Nick teaches

Every time you send a message, an agent runs five steps. Nick's acronym is **PTMRO**.

1. **Planning.** Goal decomposition. "Eat at White Castle" becomes get in the car, look up the
   location, drive, order. The agent identifies dependencies, sequences them, and revises the plan
   as things change. Models are imperfect planners, and a 1% error at the start compounds into
   landing on the wrong continent (his ship analogy). "If there was one place for you to exert your
   human intellect, it's at the planning stage." Use plan mode, read the plan, approve or redirect,
   then switch to bypass permissions for the build.
2. **Tools.** How the agent acts in the world: calling APIs, executing code, reading and writing
   databases, browsing the web. "The LLM is the brain, tools are the hands." Tool quality varies a
   lot right now, especially among rushed MCP servers. Because models are optimized for coding, let
   the agent build its own tools rather than waiting for someone else to. Standardized tools give
   consistent inputs and outputs and make the opaque model auditable: you may not know how it
   reasoned, but you know which tool it called with which arguments.
3. **Memory.** Short-term is reasoning tokens (the thinking tab), discarded after use. Intermediate
   is the message chain, sent with every call. Long-term is files and system prompts (`AGENTS.md`,
   `credentials.json`, saved tokens). Agents manage context limits by periodically summarizing
   history into dense takeaways, not storing reasoning in the main loop, offloading intermediate
   results to files and databases, and loading only what is needed per step.
4. **Reflection.** The agent evaluates its own output, notices failing approaches, pivots and
   self-corrects. Without this you just have a script that breaks at the first hiccup. This is the
   basis of self-annealing.
5. **Orchestration.** The coordinator that shuttles results between the other four and loops. Nick
   rejects role-based org charts (manager, marketer, engineer, interns, as in CrewAI) as "looking at
   things like a human would". DOE and Claude Skills instead give one orchestrator high-level
   instructions plus tools and let it loop.

Nick's demo: "scrape 200 HVAC owners in the US, decision makers" ran a 25-lead test scrape, found a
low industry match rate, adjusted its own filters, verified past threshold, ran the full scrape,
uploaded to a sheet and enriched, with no input from him. Another: a silence-cutting video workflow
built in plan mode, tested, found too abrupt, switched to voice activity detection on his nudge, and
worked on the second pass. His takeaway: "the most important part of my entire day is providing some
high-level nudge in one direction or another."

## Step by step

1. For any new workflow, start in plan mode. Ask the agent to lay out its plan before it touches anything.
2. Read the plan for the foundational assumption. Correct direction now, not after the build.
3. Approve, switch to auto-accept or bypass permissions, and let it build.
4. Watch the tools it calls. If a tool is weak or missing, tell it to build a script instead.
5. Test with real data. Expect the first run to fail and let reflection do its job. Feed errors back
   rather than fixing by hand.
6. Give high-level nudges ("cuts are too abrupt, other options?") instead of detailed instructions.
   Pick from the options it offers.
7. If context is filling up, let it compact or move the task to a sub-agent (see `aw-sub-agents`).

## Templates / prompts

Plan-first prompt:

```
Plan mode. I want a workflow that [takes a new buyer inquiry from my website
form, looks up the property, drafts a reply and logs the lead in my CRM].
Give me 2 or 3 approaches with trade-offs and ask any clarifying questions
before building anything.
```

Nudge prompt after a test:

```
It worked but [the reply sounds too formal and skipped the showing-time
question]. What are a few different ways to fix that? I'll pick one.
```

## Pitfalls Nick calls out

- Outsourcing all planning to the model. Its planning is imperfect and early errors compound.
- Removing yourself from the loop completely while building. "The resulting agent workflow is
  probably going to suck, at least for now." Steer, do not row.
- Trusting any tool. Bad tools are like a bad hammer, the cabinet will not be nice.
- Expecting first runs to work. Iteration is the process, not a failure.
- Thinking of orchestration as an org chart. It is a loop, not a hierarchy.

## How Caleb should use this

- Before building any AIRE automation, spend two minutes in plan mode. That is Caleb's highest-leverage time.
- Treat lead qualification criteria (price range, timeline, pre-approval) as planning input Caleb
  supplies, not something the agent guesses.
- When an automation misfires on a listing or a client email, look first at its planning assumption,
  not the last step.
- Long memory for AIRE lives in files: Caleb's tone guide, KW First Choice compliance notes, area
  knowledge for St. Francisville and Baton Rouge. Put those on disk so every session loads them.
- Anything that sends to a client or prospect still gets Caleb's approval before running.

## Verification

- The agent shows a written plan before acting on a new build.
- When a test fails, the agent diagnoses and retries on its own instead of asking Caleb what to do.
- Tool calls are visible and named in the transcript, so Caleb can see what happened step by step.
- Repeated runs converge: fewer corrections needed each pass.
