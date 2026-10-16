---
name: cc-subagents-research-review-qa
description: Creates and uses Claude Code subagents in .claude/agents the way Nick Saraev does: the three worth having (researcher, code reviewer, QA tester), the edit, review, QA, ship workflow, and wrapping a skill in parallel subagents to process hundreds of items at once. Use when Caleb says "make a subagent", "run this in parallel", "review this code with fresh eyes", "classify these 500 leads faster", "research the best tool for X without filling up my context", or asks whether subagents are worth it.
---

# Subagents: Researcher, Reviewer, QA and Parallel Work

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 13 (agents section), 28, 29, 30 and 31 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=11468s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=11535s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=11654s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=11934s)

## What Nick teaches

A subagent is a markdown file in `.claude/agents/`. His toy example `tell-me-the-time.md` defines the tools it can use, the model, the max number of turns, whether it has global or local memory, a description, a name, and a short instruction ("tell me the current time, also say howdy partner"). When he said "What time is it? Use my agent," the parent agent read the agents folder, picked the matching one, opened a Task called "tell me the current time", sent it a message, and relayed the answer (with the howdy).

Mechanics that matter:

- A subagent spawns with its own empty context. All it knows is the instruction in its file plus the message the parent sent. Results go back only to the parent (the caller).
- New agents are only visible in a fresh session. Exit and start again after creating them.
- Subagents inherit the parent's permission mode.
- They are usually less intelligent than the parent (people use Sonnet or Haiku). Reserve the parent (Opus) for combining outputs and deciding.

Subagents are not a cure-all. You can do almost everything with the main agent. They earn their keep in exactly two ways: context separation and parallelization.

The three subagents he says always make sense:

1. **Researcher.** Research pollutes context: web pages, API calls, Google Analytics, docs. Send the research to a Sonnet subagent that burns 50 to 100K tokens in its own window and returns a 2K summary. Fifty times cheaper on the parent. You can also tell it which sources to trust and to go straight to API docs. Demo: "Use the research subagent to find the best MCP server currently available for PandaDoc."
2. **Code reviewer.** The opposite reason: having no context is the point. After the parent writes code it is biased toward its own approach. A fresh agent with zero context looks at the code "with a blank face" and asks why it was written that way, just like human code review. It returns only the recommended changes (about 2K tokens) and the smarter parent applies them. In the demo it found that batch fetching used 100 per batch when the Gmail API allows 1,000.
3. **QA / tester.** Generates tests, runs them, reports results. Keeps test noise out of the parent and gives backend work the same verify loop that screenshots give design work. In the demo one test caught a wrong exception, which the parent fixed.

He had Claude create all three, add them next to `email-classifier`, and update CLAUDE.md with the proposed workflow: (1) parent writes or edits the code, (2) code review subagent, parent fixes blocking issues, (3) QA subagent generates and runs tests, parent fixes failures, (4) ship. Review and QA can run in parallel. He notes this matters most for secure, enterprise-grade code and is optional for personal internal tools.

Parallelization worked example (the Gmail label skill):

- Prompt: "Turn this gmail-label flow into a subagent. Instead of 36 seconds for 100 emails, spawn 10 subagents that fetch, classify and label simultaneously and return results. Use the subagent spec, research it if needed. Use Sonnet 4.5. Roll it out as a test and show me how much faster it is with timing instrumentation."
- Claude first spun up research and search subagents itself, created the agents directory, and wrote the classifier agent alongside the existing skill.
- Fresh session, run on 100: ten "classify email chunk" tasks in parallel. Only six seconds saved at 100, because of spawn overhead.
- Run on 1,000: it crashed with "prompt too long" because every subagent returned the full text of every email to the parent. Fix prompt: "Modify this so we don't run out of context. The subagents don't need to return the actual text to the parent." Rerun: 987 of 989 labeled in about a minute, versus 36 seconds per 100 serially.

The probability lesson: if each subagent has a 95% success chance, three in sequence succeed 0.95^3 = 85.7%, ten is 59%, fifty is 7%. Keep subagent tasks as small and simple as possible (classify only, not classify plus merge plus apply), because subagent contexts are ephemeral and a malformed output wastes the whole run. He spent $173 extra usage that day.

## Step by step

1. Decide why you want a subagent: context separation (research, review, QA) or parallel throughput. If neither, use the parent.
2. Prompt Claude to create the agent file in `.claude/agents/` with name, description, model (Sonnet for grunt work), allowed tools and a tight instruction. Reference an existing agent for format.
3. Start a fresh session. Ask "What subagents do we have access to?"
4. For parallel work: have the parent chunk the input, spawn one agent per chunk, and require each to return a compact result (IDs plus labels, not raw text).
5. Add timing instrumentation and compare serial vs parallel on a small batch, then scale.
6. For code: add the edit, review, QA, ship workflow to CLAUDE.md and invoke it on any script that touches data or money.

## Templates / prompts

Agent file:

```markdown
---
name: lead-classifier
description: Classifies a chunk of CRM leads into Buyer, Seller, Investor or Dead with a one-line reason. Returns only lead IDs and labels.
model: sonnet
tools: Read
maxTurns: 5
---
You receive a JSON list of leads (id, name, notes, last contact). For each lead return {id, label, reason} where label is Buyer, Seller, Investor or Dead. Return only the JSON array. Do not return the original notes.
```

Parallelize prompt (cleaned from Nick's):

```text
Turn the [skill] flow into a subagent so we can parallelize. Spawn 10 subagents on Sonnet, each handling one chunk, and have them return only compact results, never the raw input text. Research the subagent spec if you need to. Run a timed test on 100 items, then 1,000, and report the speedup.
```

CLAUDE.md workflow:

```markdown
## Software workflow
1. Edit code in the parent agent.
2. Spawn code-reviewer on the changed files. Fix blocking issues.
3. Spawn qa on the same files. It writes and runs tests. Fix failures.
4. Ship. Steps 2 and 3 may run in parallel.
```

## Pitfalls Nick calls out

- Subagents returning full text to the parent. Prompt too long.
- Spawning subagents "for the sake of subagents". Spin-up time can exceed the task.
- Giving each grunt too much to do. Multiply the failure odds.
- Forgetting the fresh session after creating agents.
- Not setting budgets. Costs add up fast.

## How Caleb should use this

- lead-classifier subagents to tag a whole CRM export in parallel, returning IDs and labels only. Writing tags back to the CRM needs Caleb's approval before running.
- researcher subagent for "best CRM MCP", "Louisiana flood zone data sources", "comps tools for St. Francisville" without filling the main session.
- code-reviewer and qa on any AIRE script that drafts messages or touches client data before it runs for real.
- Parallel listing-site generation: ten prospect or listing pages at once using the website skill wrapped in subagents.

## Verification

- A fresh session lists the new agents by name.
- The parent's `/context` stays small after a parallel run (results only, no raw input).
- Timing output shows the parallel run beating serial at scale (hundreds of items), even if not at 100.
- Reviewer and QA outputs contain concrete findings the parent then fixes, visible in the diff.
