---
name: aire-stack
description: The memory of which AI model, app and subscription Caleb uses for each job in AIRE, read from aire/STACK.md so nobody has to re-explain the setup. Use when any task needs to pick a model, tool, CRM, website platform, video tool or subscription, when Caleb says "what do we use for", "which model", "use the cheap one", "is that on my plan", "update the stack", or when a new AI release might change a tool choice.
---

# AIRE stack

The single source of truth is `aire/STACK.md`. This skill is how it gets used and kept current.

## When picking a tool for a task

1. Read `aire/STACK.md`. Use the row that matches the job. Do not ask Caleb what he uses if the file answers it.
2. If no row matches, pick by the rule at the top of the file (fastest reliable, not cheapest), say which row you added by inference, and propose the row in your report.
3. Rows marked "watch" are not adopted. Mention them as an option, do not build on them without Caleb's yes.
4. Rows under "Retired or avoid" are never used. If Caleb asks for one, say why it is retired and offer the replacement.

## Model routing

Apply the 60/30/10 rule from `aa-tiered-model-cost-routing` with the models named in STACK.md: the bulk tier for sorting, tagging, enrichment and first drafts, the mid tier for client copy, the top tier for routing and anything Caleb reads before a client does.

## Updating the stack

- When Caleb says a tool changed, edit the row, set the date, and add one line to `aire/STATUS.md`.
- When a weekly brief proposes a change, show the proposed row and wait for yes.
- Never remove a row. Move it to "Retired or avoid" with the date.
- Subscription status at the bottom is confirmed by Caleb only. Never assume a plan is paid.

## Guardrails

- Never read or print API keys or .env contents. Name them only.
- Tool choices for client-facing output still pass `ai-compliance-check`.
