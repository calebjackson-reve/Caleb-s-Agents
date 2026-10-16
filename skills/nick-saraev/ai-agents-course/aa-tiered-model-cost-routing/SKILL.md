---
name: aa-tiered-model-cost-routing
description: Cuts multi-agent token cost by routing work across model tiers with a 60-30-10 rule (cheap models like Haiku or Flash for bulk work, mid-tier like Sonnet for enrichment and templated writing, top-tier like Opus only for routing and judgment), plus batch APIs for non-urgent bulk jobs. Use when Caleb says "this is costing too much", "use a cheaper model for that", "what's the cost per lead", "optimize tokens", or when an AIRE pipeline (lead scraping, enrichment, outreach drafting, scoring) runs on hundreds or thousands of items.
---

# Tiered Model Cost Routing (60-30-10)

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapters 26
(second half) through 28 (https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=7159s, &t=7606s, &t=7890s)

## What Nick teaches

Context management optimizes one model's usage. Model choice optimizes across models. Through most
of the course Nick used Opus agents spawning Opus sub-agents because cost was not his concern and he
wanted marginal quality. Enterprises think differently: they will accept a small quality trade for a
large cost cut.

**The curve.** He draws an inverted U (he names it the Yerkes-Dodson curve) of cost against quality.
The optimum is not max quality and not min cost. It is the point where a little quality buys a lot
of savings. Example: accept 85% instead of 95% quality if cost drops about 40%.

**The 60-30-10 rule.** A top-level agent router (the orchestrator, your smartest model: Opus, Gemini
Pro, GPT 5.4 class) assigns tasks by difficulty:

- **60%** of token volume to "dumber" cheap models (Haiku, Gemini Flash) for simple tasks: classify
  into red/blue/green, extract patterns, scrape.
- **30%** to mid-tier (Sonnet, a lower GPT) for tasks needing some intelligence but not the best:
  research compilation, enrichment, templated writing. He quoted roughly $2 to $3 per million tokens
  for this tier.
- **10%** to top-tier for routing decisions and the highest-level judgment.

**The math.** 100 million tokens all-Opus at $5 per million = $500. Split as 10M at $5 ($50) + 30M
at $3 ($90) + 60M at $1 ($60) = $200, which is 40% of the cost, a 60% saving, with minimal quality
impact because the cheap tasks were already fine on older Haiku and Sonnet generations.

**Lead-scraping example (his real pipeline).**

1. Haiku scrapes a huge number of sites (say 10,000) and greps for things shaped like email
   addresses, storing to a database. Mass data, cheapest model.
2. Sonnet does enrichment (needs more intelligence), about $0.008 per lead.
3. Sonnet does the mostly templated outreach, about $0.005 per lead.
4. A quality review step, about $0.001 to $0.002 per lead.

Total about $0.015 per lead versus about $0.12 per lead all-Opus. At 1,000 leads a day (his current
volume) that is about $15 a day or $450 a month all-Opus, versus roughly a quarter of that, about
$120 a month, tiered. As the company grows, cost per lead matters more than the last few quality
points.

**Batch APIs.** Many providers offer a batch API: submit a bulk set of requests, wait up to about a
day, and they run it during low-load periods (overnight) at a discount. Providers do this to flatten
their jagged daily load curve. Use it for anything not urgent.

He included an LLM API pricing cheat sheet but says prices and model names change fast, so all numbers
above are as he stated them and may have changed.

## Step by step

1. Map the pipeline into stages. Label each: bulk/simple, moderate, judgment.
2. Assign tiers: bulk → Haiku or Flash, moderate → Sonnet, judgment and routing → Opus.
3. Estimate tokens per item per stage, multiply by current prices (check the provider's pricing
   page, do not use the course numbers), get cost per item.
4. Compare to all-top-tier cost. If savings are over 40% and quality holds on a 50-item sample,
   adopt.
5. Move non-urgent stages (overnight enrichment, scoring backlogs) to the batch API.
6. Add a cheap review step at the end so quality is measured, not assumed.

## Templates / prompts

Orchestrator routing block for CLAUDE.md:

```
## Model routing (60-30-10)
- Bulk extraction, classification, scraping, dedupe: spawn Haiku sub-agents.
- Enrichment, summarization, templated drafts: spawn Sonnet sub-agents.
- Routing, final judgment, anything client-facing that I will not review: Opus (you).
- Before a run of more than 100 items, print the estimated cost per item and total
  and wait for approval.
- Non-urgent runs: use the batch API.
```

Cost worksheet (fill in current prices):

```
Stage           | Model  | Tokens/item | $/M tokens | $/item
Scrape + grep   | Haiku  |             |            |
Enrich          | Sonnet |             |            |
Draft outreach  | Sonnet |             |            |
QA review       | Haiku  |             |            |
Total per item  |        |             |            |
x items/day = $/day, x 30 = $/month. All-Opus comparison: ______
```

## Pitfalls Nick calls out

- Using the smartest model for trivial classification. It is space-age intelligence for a
  red/blue/green question.
- Using the dumbest model for the router. The router must be the smartest.
- Trusting the course's price numbers. They change, so check the pricing page.
- Forgetting the batch API discount on non-urgent jobs.
- Skipping the quality review step and assuming the cheap tier is fine.

## How Caleb should use this

- AIRE lead pipeline: Haiku to parse and dedupe public-record or scraped lists, Sonnet to enrich and
  draft first-touch messages, Opus only to score the top prospects and review drafts. Any API spend
  above the subscription needs Caleb's approval before running.
- Nightly jobs (re-scoring the CRM, summarizing new listings in the parish, drafting next-day
  follow-ups) go to the batch API.
- Put the "print estimated cost before runs over 100 items" rule in CLAUDE.md so no surprise bills.
- Keep client-facing final copy on the top tier or on Caleb's own review, and save the cheap tiers for
  internal data work.

## Verification

- A cost worksheet exists for the pipeline with current prices and a per-item figure.
- A 50-item sample on the tiered setup matches all-top-tier quality within an acceptable margin.
- The monthly estimate is at least 40% lower than all-top-tier, or you have a written reason for
  staying on the top tier.
