---
name: second-brain-learning
description: Operate and improve AIRE's bounded relationship-depth and Daily Five outcome-learning loop from receipts without granting new authority.
---

# Second Brain Learning

## Load memory

Read `LESSONS.md`, `OUTCOMES.md`, and open items in `ESCALATIONS.md`. The live
append-only ledgers remain `agent_work_receipt`, `agent_work_verification`,
`service_run_receipt`, `surfacing_label`, and `daily_outcome_policy` in canonical
SQLite. Do not copy names, contact values, or message text into these files.

## Intake

Read aggregate receipts and verifier failures. Ignore duplicate run keys,
superseded labels, and evidence claimed by another surfacing.

## Gate

Accept only the allowlisted `relationship-depth` recipe and grounded Daily Five
outcomes. Any send, publish, purchase, LLM, or external mutation is out of scope.

## Confidence

Exact SQL reproduction is HIGH. A mature evidence-linked outcome is MEDIUM and
may affect ranking within the fixed ceiling. Missing, overlapping, stale, or
private evidence is LOW and goes to `ESCALATIONS.md` without guessing.

## Act

Stage aggregate output for Caleb. Apply a frozen reason-specific outcome policy
only after its fixed sample threshold. Human review remains the authority ceiling.

## Verify

Run `python3 scripts/verify-second-brain-learning.py`. The verifier has the final
vote. In production, add `--production` and the canonical `--db` path.

## Reflect

Append a privacy-safe run summary to `LEDGER.md`. Turn Caleb corrections into a
rule in `LESSONS.md`. Cache only resolved aggregate policy in `OUTCOMES.md`.

## Report

Report the gate result, heartbeat state, queue failures, review count, current
trust tier, mature outcome count, and any escalation. Never invent a 9/10 live
history before the receipts exist.

## Failure it prevents

Prevents a dead queue from looking empty, self-graded outputs from earning trust,
late evidence from preserving a false negative, and correlation from being sold
as causation.
