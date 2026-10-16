---
name: aa-sub-agent-verification-loop
description: Runs an implementer, reviewer, resolver loop where a fresh-context sub-agent reviews only the output (not the reasoning) of the agent that built it, for correctness, edge cases, simplification and security, then a third agent fixes what was found. Use when Caleb says "review this", "agent review", "self-review", "/agent-review", "is this right", "double check the AIRE code / the CMA / the email sequence", or after any non-trivial build before it goes to a client.
---

# Sub-Agent Verification Loops (Agent Review)

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapters 17-18
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=4405s and &t=4652s)

## What Nick teaches

An agent that worked hard on a task gets biased toward its own path. It spent compute, made design
decisions, fixed bugs, and now it believes its way was best. Ask it "can you make this better?" and
it says "no, I did a pretty good job." Nick calls this a sunk-cost bias: an implementer with 200,000
tokens of context remembers every wrong turn and is blind to its own mistakes.

The fix is serial, not parallel: take the **output only** (code, workflow, accounting results), not
the reasoning, and hand it to a second agent with **fresh context** and ask "is this right?" That
agent evaluates purely on output, like a random snippet it found on the internet. No opinions, no
attachment.

The loop:

1. **Implementer** writes the first draft.
2. **Reviewer** (fresh context, zero bias) checks: is it correct, any issues at first glance, any
   way to simplify.
3. If issues: reviewer lists them and passes them to a **Resolver** (also zero prior context) which
   fixes them. Then test. Then final verified output.
4. If no issues: approved.

This is peer review. It is not that the first agent was dumb. The more you work on something the
narrower your view gets, and paths you abandoned might work for someone else.

His skill, `agent-review`: "spawns sub-agents to review, simplify, and verify output. Use after
completing any non-trivial implementation task. Triggers on 'review this', 'agent review',
'self-review', or '/agent-review'." It reviews for four things: **correctness, edge cases,
simplification, security.**

Demo: he pointed a fresh Claude Code at his old Splinter repo (a content syndication app built with
Gemini in a vibe-coding video). "Use agent review on the Splinter repo, it's in the parent folder."
A sub-agent "review Splinter codebase" read the whole workspace and returned **22 issues** bucketed
critical / high / medium / low, then asked if he wanted them fixed. He had asked Gemini repeatedly
during the build "any issues? any way to make it better?" and it never found them.

He ties this to **mixture of experts**: models themselves already average several expert
sub-networks per token. Consensus, debate, and review loops are the same idea applied one level up,
treating whole models as experts and averaging their statistics to get closer to reality.

## Step by step

1. Finish the build (or receive the output to check). Save it to files.
2. Spawn a reviewer sub-agent with fresh context. Give it only the output files and the original
   goal. Do not give it the conversation.
3. Reviewer returns a list: severity, location, issue, suggested fix. Buckets: critical, high,
   medium, low.
4. Spawn a resolver sub-agent with fresh context. Give it the output plus the issue list. It applies
   fixes and runs tests.
5. Optionally loop once more: a second fresh reviewer confirms the fixes.
6. Report what was found and what changed.

## Templates / prompts

Skill skeleton:

```
---
name: agent-review
description: Spawn sub-agents to review, simplify, and verify output after any non-trivial implementation task. Use when the user says "review this", "agent review", "self-review", or "/agent-review".
---

## Reviewer sub-agent prompt
You have no prior context on this work and that is intentional. Review ONLY the
files at <paths> against this goal: <goal>. Check four things:
1. Correctness: does it do what the goal says?
2. Edge cases: inputs or situations where it fails.
3. Simplification: anything that can be removed or made clearer with no loss.
4. Security: secrets, injection, unsafe sends, data exposure.
Return a numbered list. For each: severity (critical/high/medium/low), file and
line or section, what is wrong, and a concrete fix. If nothing is wrong, say
"Approved" and why.

## Resolver sub-agent prompt
You have no prior context. Apply the fixes in issues.md to the files at <paths>.
Change only what the issues require. Run tests or a dry run. Report each fix.
```

Trigger prompt:

```
Agent review on <folder or file>. Fresh-context reviewer, then resolver. Show me
the issue list before fixing anything that changes behavior.
```

## Pitfalls Nick calls out

- Passing the reasoning along with the output re-introduces the bias. Output only.
- Asking the original agent to self-review is nearly useless.
- Reviewer and resolver should each start with zero prior context.
- The reviewer asks before fixing. Say "absolutely" or pick which issues to fix.

## How Caleb should use this

- Before any AIRE code ships to a client dashboard, run agent review for correctness, edge cases,
  simplification and security (API keys, client PII).
- Review a CMA or pricing memo: a fresh agent checks the math, comp selection and stated assumptions
  before Caleb presents it.
- Review a drip-email or text sequence for tone, compliance language, and factual claims before it
  loads into the CRM. The fix step must not send anything. Needs Caleb's approval before running
  anything that sends.
- Review a buyer or seller net sheet the same way.
- Make `/agent-review` a habit at the end of every build session.

## Verification

- `issues.md` (or the chat) shows a severity-bucketed list from a sub-agent that was spawned fresh.
- After the resolver runs, a second fresh review returns fewer issues or "Approved."
- Tests or a dry run pass.
