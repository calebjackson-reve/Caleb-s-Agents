# conversation-drafting — contract

**Business question.** Given the message that needs a reply and the bounded conversation around it, what reply in Caleb's own voice, matched to the relationship, answers it without inventing anything, and what will sending it likely do?

**Required inputs.** `conversation-context.v1` (brain/conversation_context.py: 3–6 turns, gaps, unanswered questions, commitments, mentions, evidence ids), the person's active relationship roles and reply policy (brain/relationship_roles.py), the measured voice profile, prior review feedback for the person, and approved writing preferences (global, role, person). **Allowed sources.** Only those; the model never reads the database. **Tools.** None: one tool-free JSON-only turn through `brain/seats.py` (purpose `conversation_draft`, ceiling $0.75 per call), first-party Anthropic route; OmniRoute only once a paid first-party provider is configured there.

**Output.** `schema.json`: a draft body plus a private analysis whose forward-looking fields are labelled PREDICTION or INFERENCE and carry evidence ids. **Authority.** `prepares`: nothing is sent; the draft is editable and waits for Caleb's exact-payload approval; the quality gate (Slice 4) decides whether Send is available.

**Failure recovery.** Capped, failed, empty, or schema-invalid output holds the draft (state `held`) with the reason; `requires_reply=false` produces no draft; missing essential information is surfaced before drafting. **Evaluation cases.** tests/test_conversation_drafts.py (fixture model): empty thread, closer-only anchor, back-reference expansion, vendor vs client register, invented-fact rejection, schema-invalid output. **Promotion.** Caleb's decision with a receipt.
