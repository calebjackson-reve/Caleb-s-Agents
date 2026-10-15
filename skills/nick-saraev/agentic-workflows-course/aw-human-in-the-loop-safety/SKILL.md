---
name: aw-human-in-the-loop-safety
description: Decides where a human must review before an agentic workflow acts, using Nick Saraev's magnitude-of-outcome and sensitivity-to-quality rule, and adds safety guardrails for autonomous agents running with bypass permissions. Use when Caleb says "can this run on its own", "should I check this before it sends", "is it safe to let it loop", "what if it messes up", "automate my calls", or when any AIRE workflow touches clients, money, credentials, contracts or public posts.
---

# Human in the Loop and Safety

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 26 and 31
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=13830s and &t=15316s)

## What Nick teaches

**Why safety matters more now.** With n8n or Make, the worst case was forgetting to turn something
off and burning credits. With fully autonomous AI on bypass permissions, the risk is different. He
cites someone who let Gemini run for two days outside a container and it deleted their drive. Even a
0.1% per-step risk compounds: 0.999^1000 is 36%. His processes are 5 to 10 steps so he rarely hits
that, but long-running autonomous agents need harnesses.

**Four rules Nick always includes in the system prompt:**

1. Confirm before API calls above a cost threshold. Check usage, and if more than about $5 went out
   in the last few minutes, stop and notify.
2. Never modify credentials or API keys unless explicitly told (models reformat or delete keys they
   think are unused).
3. Never move secrets out of `.env` or hard-code them.
4. Log all self-modifications as a change log at the bottom of the directive, one commit-style line each.

Accept that some rules will occasionally be broken. "Plan for graceful recovery, not perfect prevention."

**When to step in (chapter 31).** Two axes: **magnitude of outcome** (how much this single task
matters) and **sensitivity to quality** (do tiny errors create disproportionate problems). High on
either means a human reviews. High on both means always.

- Cold email templates and outreach sequences: there is an "uncanny valley" where a few word changes
  massively change perception. Sending 10,000 emails one degree off wastes all 10,000. Always
  review.
- Invoices and proposals: an extra zero is catastrophic at 0.1% frequency. Always look before sending.
- Web scraping, research, data accumulation, generating many drafts for later selection: quality
  scales linearly with impact, 70% automated beats 100% manual. Run autonomously.
- Sales calls: do not automate. A 0.1% chance the prospect senses a robot costs far more than 0.1%.
  Automate the research dossier, keep the call human.
- Situations needing empathy and judgment: either convert to a yes/no rule (Amazon auto-refunds
  under a 2% refund rate) or route to a human.

"Your goal is supervised autonomy, not babysitting." Only automate what makes a bottom-line difference.

**When the agent is stuck:** it will ask with context (what it tried, what went wrong, options).
Answer, or push: "are you sure you fully tried? research the API spec." Agents sometimes need
motivation as much as decisions. If it loops between two fixes for 20 minutes, pause it, read the
reasoning, and say "stop doing those two things, research the best solution before proceeding."
Iteration is cents, so always send the message.

## Step by step

1. For each workflow, rate magnitude (low/high) and sensitivity (low/high).
2. Low/low: full autonomy. Anything high: insert a review gate in the directive ("return for
   approval, do not send").
3. Identify what must never be automated (live client calls, price changes, contract terms). Write
   that into the system prompt.
4. Add the four safety rules to `CLAUDE.md`.
5. Set API spend caps where the provider allows, and `--limit` flags on scripts that cost money.
6. Give sub-agents least privilege (read-only where possible, see `aw-sub-agents`).
7. Watch the first 10 to 15 runs. Then let it run and monitor outputs.

## Templates / prompts

Review gate in a directive:

```markdown
## Approval gate
Before any email, SMS, social post, document delivery or CRM stage change
to "under contract" or "closed": stop, show me the exact content and
recipient, and wait for "approved". Never send on your own.
```

Do-not-automate list for the system prompt:

```markdown
## Never automate
- Live phone or video conversations with clients or prospects.
- Changing a listing price, commission or any contract term.
- Signing, submitting or e-signing any document.
- Responding to a complaint, dispute or legal matter.
```

Unstick prompt:

```
You've been alternating between the same two fixes for 20 minutes. Stop.
Read the API documentation I'm pasting below, then propose one new
approach before touching code.
```

## Pitfalls Nick calls out

- Full autonomy on high-sensitivity outputs (outreach, invoices, proposals).
- Automating for its own sake. If it does not change the bottom line, do not.
- Voice agents on sales calls.
- No change log and no key protection. Keys get rewritten, and you cannot trace changes.
- Babysitting low-risk tasks. Scraping and research do not need you.

## How Caleb should use this

- Autonomous: comps research, public-record pulls, neighborhood stats, drafting, CRM note logging,
  open house sign-in imports.
- Review gate: every email, text and social post to a client or prospect, every CMA or net sheet,
  every listing description. These need Caleb's approval before sending.
- Never automate: buyer and seller calls, negotiation, price or commission changes, disclosure
  decisions, anything a Louisiana licensee must personally handle.
- Put a spend cap on enrichment and skip-tracing APIs and require Caleb's approval for any run over
  a small test batch.
- Fair housing: add a rule that the agent never filters or targets audiences by protected
  characteristics, and that Caleb reviews any audience selection.

## Verification

- `CLAUDE.md` contains the four safety rules and the never-automate list.
- A test run that would send a message stops at the approval gate and shows content and recipient.
- Grep the workspace: no secrets outside `.env`.
- Directives end with change log entries after any self-edit.
