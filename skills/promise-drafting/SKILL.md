# promise-drafting — contract

**Business question.** For each open promise Caleb made in a text and has not kept, what short
message in his own voice would keep it, ready for his approval?

**Required inputs.** The verbatim promise phrase (verified fact, event evidence), the person's
display name, the promise age, and prior drafts for the same person (all read from the
database). **Allowed sources.** Only those. **Tools.** None: one tool-free, JSON-only turn per
promise through `brain/seats.py` (purpose `promise_draft`, ceiling $0.50 per call, $5 per
night in the runner). **Output.** One draft body; the deterministic gate in
`brain/draft_queue.py` decides whether it is kept. **Authority.** `prepares`: nothing is sent;
every draft waits for Caleb's per-message approval. **Failure recovery.** A capped, failed or
empty seat holds the promise for the next night; nothing is invented. **Evaluation cases.**
`cases/` (added when the drafting lane is rebuilt in Phase 4). **Promotion.** Caleb's decision
with a receipt; this contract exists so the nightly lane's spend and runs are recorded.
