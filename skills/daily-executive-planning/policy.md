# daily-executive-planning — procedure

1. **Assemble** (`brain/day_plan.assemble_day_state`, deterministic): calendar state, commitments,
   work queue with coverage, opportunities, goals. Never guess a missing input; carry it as
   `missing_evidence` with a reason.
2. **Rank** (`brain/day_plan.rank_candidates`, deterministic): apply the ordering law; attach
   owner, authority, evidence ids, evidence class and the consequence of not doing it.
3. **Decide the seat** (deterministic): premium only when a contradiction, a calendar conflict
   or two or more hard deadlines today are present; otherwise the efficient model. Declare
   limits (`brain/seats.seat("daily_plan")`, ceiling $8, one turn, no tools, no workers).
4. **Synthesize** (model seat, JSON per `schema.json`): keep the class order; inside a class,
   order by consequence and dependency; name the critical path; name what can run in parallel;
   list what AIRE prepares before Caleb sees it; list the decisions only Caleb can make; state
   assumptions with what would falsify each; state the replanning triggers; explain in one
   paragraph why this ordering beats the two most plausible alternatives. Preserve uncertainty:
   a `cannot_know` calendar is said out loud, never smoothed over.
5. **Check** (deterministic): every item key exists in the candidates; every evidence id exists in
   the input; classes are legal; no item was invented; Caleb-only items keep `caleb_only`.
   On any failure, use the fallback plan and record the reason.
6. **Persist** (`brain/planning.create_plan`): steps with completion predicates; assumptions;
   the seat and usage on the `skill_run` row.
7. **Prepare**: for the top items owned by AIRE with `prepares`, attach existing drafts where
   the draft lane already produced one; otherwise leave a `prepare` step for the draft lane.
8. **Replan** (`brain replan-day`, deterministic trigger detection): a new inbound from a person
   on the plan, a new confirmed deadline, a changed calendar snapshot, or a completed step.
   Revise with `brain/planning.replan`, naming the trigger evidence; escalate only when a
   Caleb-only decision lands on the critical path.
9. **Close** (end of day): `brain/planning.close_plan` with adherence from predicates,
   decisions asked, misses prevented; Caleb's rating is requested next morning.
