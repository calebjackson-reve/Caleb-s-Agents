---
name: cca-lean-agent-hierarchies
description: Chooses and configures a lean multi-agent structure per Nick Saraev: skills and subagents are two flavors of the same markdown SOP, bloated CEO/CTO org charts are a mistake, and the only two delegation patterns worth using are Parent + Researchers + QA (Opus parent, Sonnet researchers, Opus QA) or the even simpler Developer + QA loop with a context-free QA agent. Use when Caleb says "should this be a skill or a subagent", "set up a QA agent", "build an agent org for AIRE", "I saw a CEO-agent framework, should I use it", or "how should my agents delegate".
---

# Skills vs Subagents, and the Two Hierarchies Worth Using

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 15, 16 and 17 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=4618s, https://www.youtube.com/watch?v=UPtmKh1vMN8&t=4896s, https://www.youtube.com/watch?v=UPtmKh1vMN8&t=4978s)

## What Nick teaches

**Context management** is all the files, folders and organizational methods you put in a workspace so Claude Code can manage your work.

**Skills and subagents are the same thing in different wrappers.** A skill is a self-contained SOP in a `SKILL.md` with name, description, allowed tools and the procedure. A subagent definition (per Claude Code docs) has name, description, prompt, tools, model. Same schema. What people like about subagents: fresh context window, more reliable on a narrow task, written in markdown with tool use. Skills match all of that except the fresh context, and because skills are so compressed they push toward short context anyway. The real difference is just how much context each carries. Nick expects the two to merge further over time. The one practical difference he notes: skills are broken down by task, org-chart agents are broken down by role, and skills typically do not delegate to other skills.

**The org-chart frameworks** (Paperclip, Company Helm, OpenGoat, "the system" with 26 agents, Gas Town with a mayor and polecats, CrewAI, Swarm Claw). He initially dismissed them, then realized they are just another way to organize markdown. But he still thinks "pretty much all of them suck right now." Human org charts exist for human brains. Agent brains are spiky. All of those roles could be one Opus model pulling from a shared context pool. You do not need "700 layers of CEOs and customer success agents."

**Pattern 1: Parent + Researchers + QA.**

- Parent: a smart model (Opus). The orchestrator. Anything at the top is an orchestrator.
- Researchers (plural): cheaper models (Sonnet). Research pollutes context, so the parent never does it. Researchers absorb huge token loads and return summaries.
- QA: Opus tuned to QA and nothing else.
- Flow: parent decides, delegates research, gets summaries, builds, hands the build to QA, QA returns suggested changes, parent applies, back to QA, loop until QA has nothing. Research gets inserted whenever needed.
- You could add testing, design, dev, back-end agents, but the more complicated, the worse it gets.

**Pattern 2: Developer + QA (leaner).**

- Smart parent plus smart QA, back and forth.
- A line in CLAUDE.md or the parent prompt: "after every development, run it through a new QA agent."
- The QA agent has almost no prompt: "You are a QA agent with no context. Read this code and apply the following design principles." Because it is freshly spawned and knows nothing about the project, it is not biased by the development thread. The parent keeps its history of failures and successes, so it can integrate feedback well.
- Loop: design, feedback, design, feedback, design, no feedback, done.
- Downside: the parent has to do its own research, so context grows. But it is simpler.

**Costs of delegation.** Every subagent spawn has a fixed time cost. Every hop away from you compounds probability of drift: a Sonnet researcher is not guaranteed to be 100% faithful to your original query. Keep chains short.

## Step by step

1. Decide skill or subagent: if the procedure needs a fresh context (review, QA, heavy research), make it a subagent. If it is a reusable SOP the main thread should follow, make it a skill. Both are markdown with name, description, tools.
2. Pick the hierarchy. Default to Developer + QA. Upgrade to Parent + Researchers + QA only when tasks need lots of research.
3. Write the QA agent definition with no project context and a short list of principles to apply.
4. Add the "after every development, run a new QA agent" rule to the project CLAUDE.md.
5. If using researchers, set their model to Sonnet and require them to return summaries, not raw dumps.
6. Cap the loop (for example 3 QA passes) so it terminates.
7. Reject any proposal for CEO/CTO/CMO agent layers unless there is a concrete reason one Opus with shared context cannot do it.

## Templates / prompts

QA subagent (`.claude/agents/qa.md`):

```markdown
---
name: qa
description: Context-free QA reviewer. Spawned fresh after every development pass. Reads the code or output cold and applies the principles below.
tools: Read, Grep, Glob, Bash
model: opus
---
You are a QA agent with no prior context on this project. Do not assume intent. Read the code or document given to you and apply these principles:
- Does it do what the acceptance list says, nothing more?
- Any failure paths unhandled?
- Any hardcoded secrets, paths or client data?
- Would a non-engineer user get stuck anywhere?
Return a numbered list of required changes, or "No changes" if it passes.
```

Researcher subagent (`.claude/agents/researcher.md`):

```markdown
---
name: researcher
description: Cheap research worker. Takes one narrow question, reads docs or web, returns a summary under 300 words with sources. Never writes code.
tools: WebFetch, WebSearch, Read
model: sonnet
---
Answer only the question given. Return: 3 to 7 bullet findings, each with a source, then one paragraph recommendation. Do not pad.
```

CLAUDE.md rule:

```markdown
## Development loop
After every development pass, spawn a fresh `qa` agent on the result. Apply its required changes, then spawn QA again. Stop when QA returns "No changes" or after 3 passes, then report what remains.
Never do research in the main thread. Delegate to `researcher` and use the summary.
```

## Pitfalls Nick calls out

- Org-chart frameworks anthropomorphize agents to make you feel like you run a company. Mostly marketing. Start lean.
- Each extra layer multiplies drift and adds a fixed spawn delay.
- Researchers can drift from the original query. State the question precisely.
- The parent should not review its own work. Bias is the whole reason QA is separate.
- "Different types of agents are better at different tasks" is the justification for any specialist. If you cannot name the incentive difference, do not add the role.

## How Caleb should use this

- AIRE build loop: Caleb's main Claude session is the parent. Add the Developer + QA rule so every new AIRE feature gets a cold review before Caleb sees it.
- Market and vendor research: a Sonnet `researcher` agent pulls comps, tool pricing or local ordinance details and returns summaries, keeping the main session clean.
- Make common REALTOR SOPs skills, not agents: listing description writer, CMA outline, open house checklist, follow-up text drafts.
- Make reviewers agents: a compliance QA that checks fair housing language and required Louisiana disclosures on any listing copy before it goes out.
- Ignore any pitch to install a CEO-agent fleet for the brokerage. One well-prompted Opus plus a QA agent covers it.
- Reviews and research are internal. Any agent that would send to clients needs Caleb's approval before running.

## Verification

- `.claude/agents/qa.md` and optionally `researcher.md` exist with name, description, tools, model.
- After a build, the transcript shows a fresh QA spawn and the parent applying its list.
- The loop ends with "No changes" or the pass cap.
- `/context` in the main session stays low because research happened in subagents.
