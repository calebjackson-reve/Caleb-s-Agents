# relationship-strategy — contract

**Business question.** For one important person, what is actually open between us (both
directions), what is unanswered, how is the relationship moving against its own baseline, what
real value could Caleb offer, what is the right next move, and what are the reasons not to reach
out — with the evidence for each?

**Required inputs** (from `brain/relationship_state.build_relationship`, every field with its
class): last exchange in each direction (verified fact); cadence against the person's own
180-day baseline (inference with reasoning); the living context — topic, commitments both ways,
the unresolved thread and its owner (verified fact); the open promise by Caleb and whether a
draft is ready (verified fact); boundaries — household, suppressions (human judgment);
opportunities linked by exact contact-name match (inference); deterministic reasons not to
contact; the deterministic next move. Caleb's stated relationship goals are MISSING EVIDENCE
today and are presented as such.

**Allowed sources.** Only those inputs. The seat never receives the message ledger: what reaches it
from conversations is the promise phrase and the deterministically extracted context fields (topic,
commitments, unresolved thread), each a verbatim excerpt capped at 120 characters by
`relationship_state.EXCERPT_CHARS` (a message shorter than that can therefore appear whole). No web.

**Tools.** None: one tool-free, JSON-only seat turn per person (`brain/seats.py`, purpose
`relationship_plan`, ceiling $5 per person). Premium seat only when the person has an
unresolved thread that Caleb owns AND an open promise, or an open loop in both directions at
once, with the reason recorded; otherwise the efficient model.

**Output schema.** `schema.json`: outcome, history summary, open loops, unanswered questions,
signals, value to offer, next move, reasons not to contact, Caleb-only decisions, assumptions
with falsifiers, replanning triggers, uncertainty. Every loop, question and signal cites evidence
ids present in the input; the deterministic post-check rejects anything else, rejects a next
move that contradicts a hard boundary, and rejects a next move that is more aggressive than the
deterministic one when a reason-not-to-contact exists.

**Human authority boundary.** AIRE prepares; nothing leaves the machine without exact-payload
approval. A household member or a suppressed person is never a target: the plan's only steps are
the "do not contact" move and the boundary itself, both Caleb-only; no loop step is written. Boundary changes are Caleb's decision.

**Failure recovery.** Seat failure, cap, or post-check rejection → the deterministic plan
persists with `mode: fallback` and the reason; the run is `partial` or `capped`.

**Evaluation cases** (`cases/`): five synthetic adversarial cases (household member, suppressed
person, unanswered inbound plus promise, cooling with nothing open, contact owes Caleb). Each is
run by `scripts/verify_phase4.py` without a model and checked against expected fields.

**Promotion threshold.** All cases pass; verify_phase4 exits 0; a fresh-context verifier PASS.
**Outcome signals.** `outcome_link` rows from a relationship plan's step to an observed outbound
event and the following inbound reply (`brain/outcomes.py`). **Version history.** `skill_version`
rows by contract hash.
