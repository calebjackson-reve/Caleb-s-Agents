# transaction-strategy — procedure
1. **Build** (`brain/transaction_files.build_files`, deterministic): pair Command and Transact,
   resolve parties as inferences, compute silence, count missing documents, list confirmed
   deadlines, raise deterministic risks and the next action.
2. **Decide the seat** (deterministic): premium only for a record conflict or two or more
   high-severity risks; otherwise the efficient model. Declare limits (`seats.seat("transaction_review")`).
3. **Synthesize** (one JSON turn per file): outcome, verified state, dependencies, critical path,
   ranked risks with detection signals, recovery options, prepared work, next action, Caleb-only
   decisions, assumptions with falsifiers, replanning triggers, uncertainty. Message text is never
   included; only file fields.
4. **Check** (deterministic): risks and steps cite input evidence ids; contradictions keep both
   dates; non-client drafts are flagged for licensee review; the next action's authority matches.
5. **Persist** (`brain/planning.create_plan`, kind `file`, subject the file key); record the seat
   and usage on `skill_run`; job receipt `transaction-review`.
6. **Review weekly and on triggers**: a new Command capture, a new Transact snapshot, a confirmed
   deadline, or an inbound from a party replans the file (`brain/planning.replan`).
