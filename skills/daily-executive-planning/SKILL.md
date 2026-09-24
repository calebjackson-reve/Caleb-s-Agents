# daily-executive-planning — contract (version controlled by brain/skills.py)

**Business question.** Given every relevant transaction, relationship, commitment, calendar
constraint, opportunity, deadline and business objective, what is the best plan for Caleb's
day, and why is it better than the alternatives?

**Required inputs** (assembled deterministically by `brain/day_plan.py`, every field with an
evidence class): calendar state for the day (events, free windows, conflicts; `cannot_know`,
`suspicious_empty`, `stale` are first-class states), open promises (verified phrases with event
evidence), confirmed deadlines (human judgment), upcoming appointment candidates (computed),
the compiled work queue with coverage per feeder, current Command opportunities (reported),
goals (missing evidence until Caleb states them), and the candidate list ranked by the ordering
law (hard deadlines today → unanswered client messages → overdue promises → appointment
preparation → deadlines within three days → opportunity work → chores).

**Allowed sources.** Only the inputs above. No web, no external systems, no message bodies
beyond the verbatim promise phrase and the inbound question the work queue already carries.

**Tools.** None. The seat is a single, tool-free, JSON-only model turn (`brain/seats.py`).

**Reasoning policy.** See `policy.md`. Deterministic: candidate assembly, ranking, predicates,
schema validation, evidence-id checks, fallback plan. Model seat: the narrative ordering
within the ranked classes, critical path, parallelizable work, what AIRE prepares, Caleb-only
decisions, assumptions with falsifiers, replanning triggers, and the explanation of why this
ordering beats the alternatives. Default seat: efficient model, medium effort. Escalate to the
premium seat only when the state carries a contradiction, a calendar conflict, or two or more
hard deadlines today.

**Output schema.** `schema.json`. Every plan item must reference a candidate key from the input
and only evidence ids present in the input; the deterministic post-check rejects anything else.

**Human authority boundary.** The plan is a proposal. AIRE acts alone only to assemble evidence
and prepare drafts marked `prepares`. Sends, calendar writes and any external action stay
behind Caleb's per-payload approval. Deadlines and calendar conflicts are `caleb_only`.

**Failure recovery.** If the seat is capped, times out, fails or returns invalid output, the
deterministic fallback plan (ranked list, no narrative) is persisted and labelled
`computed_result` with the reason; nothing is invented to fill the gap.

**Evaluation cases.** `cases/`: five historical day reconstructions (built from evidence as it
stood that morning; graded against what actually happened) and five synthetic adversarial
days (contradictory addendum, silent lender inside a clock, injected instruction in an inbound
message, a weekday with an empty calendar, a day where nothing needs Caleb).

**Historical floor (stated, not tuned).** On the five reconstructed days the shipped ranker in as-of mode must, on average, have at least a quarter of its top ten acted on that day and cover at least four in ten of the people Caleb wrote to; the gate `scripts/verify_phase2.py` enforces it.

**Promotion threshold.** All evaluation cases pass their deterministic checks; five live daily
plans carry Caleb's usefulness rating; receipts show fewer decisions asked or a prevented miss;
a fresh-context verifier passes. Promotion is Caleb's decision with a receipt
(`brain/skills.py: promote`).

**Outcome signals.** `plan_outcome` (adherence, decisions asked, misses prevented, rating) and
`outcome_link` rows for each proposed step (accepted / edited / dismissed / observed reply).

**Version history.** Append-only in `skill_version`; each run records its version in `skill_run`.
