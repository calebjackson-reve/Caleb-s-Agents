# transaction-strategy — contract

**Business question.** For each live transaction file, what is the desired closing outcome, what
is the verified state, who depends on whom, what is on the critical path, what is missing, who is
silent, what could fail and how would we see it coming, what are the recovery options, and what is
the next best action — with Caleb-only decisions kept separate?

**Required inputs** (from `brain/transaction_files.build_files`, every field with its class): the
Command opportunity (reported claim), the reconciled Transact record and its checklist/compliance
counts (reported claim), parties resolved from the contact string (inference with reasoning, or
contradiction / missing evidence), silence per party (computed), confirmed deadlines (human
judgment), the recorded close date (reported; never a contract deadline), deterministic risks.

**Allowed sources.** Only those inputs. No documents are read here; no web.

**Tools.** None: one tool-free, JSON-only seat turn per file (`brain/seats.py`, purpose
`transaction_review`, ceiling $12 per file). Premium seat only when the file carries a
contradiction (record conflict) or two or more high-severity risks, with the reason recorded.

**Output schema.** `schema.json`: outcome, verified state summary, dependencies, critical path,
ranked risks with detection signals, recovery options, prepared work (drafts to prepare, each
naming the party and whether a licensee review is required), next action, Caleb-only decisions,
assumptions with falsifiers, replanning triggers, uncertainty. Every risk and step must reference
evidence ids present in the input; the deterministic post-check rejects anything else.

**Human authority boundary.** AIRE prepares; Caleb decides and sends. Any draft addressed to a
non-client party (lender, title, co-op agent) requires a licensee-review receipt before it leaves
Desk. Computed clocks are labelled "not legal advice"; contract interpretation is VERIFY WITH
BROKER OR COUNSEL. Nothing here writes to Command, Transact, dotloop, email or calendar.

**Failure recovery.** A capped, failed or invalid seat leaves the deterministic file plan (risks,
next action, decisions) persisted and labelled `computed_result` with the reason.

**Evaluation cases.** `cases/`: contradictory records (Command vs Transact), a silent lender inside
the clock, missing documents inside the clock, a passed close date, a duplicate file (two
opportunities at one address). Deterministic checks: every file field carries a class, every risk
cites evidence, no date is chosen for a contradiction, drafts to non-client parties carry the
licensee-review flag.

**Promotion threshold.** Cases pass; five live file reviews carry Caleb's rating; a fresh-context
verifier passes. Promotion is Caleb's decision with a receipt.

**Outcome signals.** `plan_outcome` for file plans; `outcome_link` for prepared work accepted,
edited or dismissed; Command phase changes and closings observed later.
