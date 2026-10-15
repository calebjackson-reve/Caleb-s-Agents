---
name: aa-core-agent-loop
description: Explains and applies the core AI agent loop (observe, think, act, repeat until a definition of done is met) and the "agent = LLM + tools + memory + loop" architecture. Use when Caleb asks "why did the agent stop early", "how do agents actually work", "write me a prompt that finishes the job", "add a definition of done", or when any AIRE task (lead research, listing comps, follow-up drafting) keeps coming back half-finished or over-finished. Also use when designing a new automation and the stopping condition is unclear.
---

# Core Agent Loop and Definition of Done

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapters 3-4
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=268s)

## What Nick teaches

Every agent, on every platform (Claude Code, Codex, Antigravity), runs the same three-function loop
over and over:

1. **Observe.** The agent reads all of its context: files, previous tool calls, system prompts,
   CLAUDE.md / AGENTS.md / GEMINI.md, research from earlier steps, any multimodal data (images,
   audio).
2. **Think (reason).** Based on that context and the user's high-level goal, it decides what to do
   next and writes a mini plan. Most platforms now expose this as a clickable reasoning tab. Nick
   says this gives interpretability, accountability and steerability, and that most people sleep on
   it.
3. **Act.** It calls tools: edits files, runs CLI commands, searches the web, calls APIs.

The tool result gets fed back into Observe and the loop runs again with a little more context each
time. Context grows every loop (loop 1 small, loop 2 bigger, loop 3 bigger still). After three or
four loops, the model checks whether it has hit the **definition of done**: the series of
constraints and technical specifications that let the model conclude it no longer needs to loop.
Once met, it switches to the "task complete" route and writes a short formatted final response.

Nick's point: most people leave the definition of done out of their prompts, which is why they are
underwhelmed. His demo prompt in Codex was research on creatine supplementation with the definition
of done "once you've compiled 10 plus empirical sources, return a structured report." The agent
looped (search, observe, think, search again), and after 58 seconds returned a structured evidence
report.

**An agent is not just the LLM.** Nick's analogy: the LLM alone is a human from 20,000 years ago
holding a spear. The infrastructure around it is what makes it useful. An agent is:

- The LLM (reasoning engine, understands language, makes decisions)
- Tools (read files, run code, search the web, call APIs, edit files)
- A goal it keeps pursuing until reached
- Persistent memory (AGENTS.md / CLAUDE.md / GEMINI.md, conversation history, auto-memory files,
  skills)
- The loop itself

A chatbot is just the LLM. An agent is the LLM plus tools, a reasoning loop and memory. All three
loop steps can be heavily optimized, which is what the rest of the course covers.

## Step by step

1. Before launching any task, write a one-line goal and a concrete definition of done (count,
   format, acceptance checks).
2. State what tools the agent may use and what context it should read first.
3. Run the task. Watch the reasoning tab on the first couple of loops. If the plan is wrong, stop
   and steer early rather than waiting for the final answer.
4. When the agent reports done, check its output against the definition of done you wrote, not
   against a vague feeling.
5. If it stopped early or kept going, the fix is almost always in the definition of done, not in the
   model.

## Templates / prompts

Minimal task prompt with a definition of done:

```
Goal: Research <topic> for <who it is for>.
Context to read first: <files or folders>.
Tools you may use: web search, file read/write. Do not send anything.
Definition of done: once you have compiled <N> sources that meet <criteria>, return a structured report with sections <A, B, C> and a one-paragraph summary at the top. Stop there and wait for me.
```

Real estate example:

```
Goal: Build a comp sheet for 1234 Oak St, St. Francisville, LA 70775.
Definition of done: 6 to 8 closed sales within 2 miles, last 12 months, within 25% of the subject's square footage. Output a markdown table (address, close date, price, sqft, $/sqft, notes) plus a suggested list-price range with your reasoning. Flag anything you could not verify. Then stop.
```

## Pitfalls Nick calls out

- No definition of done means the agent either stops when it feels like it or never stops.
- Context grows every loop. Long loops degrade quality and cost more (see
  aa-context-window-management).
- Treating the LLM as the whole agent. The tools, memory and loop are where most of the leverage is.
- Ignoring the reasoning tab. It is the cheapest way to catch a bad plan before tokens are spent.

## How Caleb should use this

- Every AIRE automation prompt (lead follow-up drafts, listing descriptions, CMA prep) should end
  with an explicit definition of done. Add it to the relevant CLAUDE.md so it is never forgotten.
- For seller or investor cold-outreach lists, define done as a count plus a quality filter ("50
  absentee owners in East Baton Rouge Parish with a mailing address different from the property
  address") so the agent stops at the right spot.
- For open-house prep, define done as a checklist of deliverables (sign-in sheet, flyer PDF, three
  social captions) rather than "get everything ready."
- Anything that would send a message, post publicly or spend money must have "stop and wait for
  Caleb" in its definition of done. Needs Caleb's approval before running.

## Verification

- The agent's final message maps one-to-one onto the definition of done you wrote.
- No extra deliverables you did not ask for, and no missing ones.
- The reasoning tab shows the agent checking the done criteria before it stopped.
