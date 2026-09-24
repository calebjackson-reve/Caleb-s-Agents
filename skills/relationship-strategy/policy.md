# relationship-strategy — procedure
1. **Build** (`brain/relationship_state.build_relationship`, deterministic): last exchange,
   cadence vs baseline, living context, open promise and draft state, boundaries, linked
   opportunities, reasons not to contact, deterministic next move.
2. **Choose people** (`brain/relationship_strategist.candidates`, deterministic): people with an
   open loop Caleb owns (unanswered inbound, open promise, unresolved thread) or a contact-owed
   commitment, freshest exchange first; household and suppressed people excluded.
3. **Decide the seat** (deterministic): premium only for an unresolved Caleb-owned thread plus an
   open promise, or open loops in both directions; else efficient. Declare limits
   (`seats.seat("relationship_plan")`, ceiling $5).
4. **Synthesize** (one JSON turn per person): history summary, open loops, unanswered questions,
   signals, value to offer, next move, reasons not to contact, Caleb decisions, assumptions,
   replanning triggers, uncertainty. Names go inside `<<< >>>` delimiters as untrusted data.
5. **Check** (deterministic): evidence ids exist in the input; boundaries win over any move;
   the seat may not escalate past the deterministic move when a reason-not-to-contact exists.
6. **Persist** (`brain/planning.create_plan`, kind `relationship`, subject `person:<id>`); the
   next-move step carries an `event_observed` completion predicate (an outbound to this person
   after the plan) when the move is a message; loops owed by the contact are `party:` dependencies.
7. **Review weekly and on triggers**: an inbound from the person, a new promise, or a boundary
   change replans (`brain/planning.replan`). A relationship plan is a plan, not a reminder.
