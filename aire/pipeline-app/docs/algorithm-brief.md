# Pipeline ranking algorithm: study brief

Written 2026-11-11 from the code in `aire/pipeline-app`. Every number has its file and constant beside it. Where the code does not say, this brief says "unknown from the code". All people in the examples are made up.

Labels used: **confirmed** (read in the code or run against it), **inferred** (follows from the code but is not stated in it), **unknown** (the code does not say).

Files read in full: `insight.py`, `links.py`, `learn.py`. Read in part: `app.py` (State.insight, learn_events, learn_pass, learn_loop, feedback, the server start), `cc.py` and `../crm/crm.py` (only where a window or filter is set), `README.md`. Confirmed behavior checked against `insight_test.py` and `round58_test.py`.

## 1. Inputs

Everything is read from files on the Mac. No network, no paid service (`learn.py` module docstring).

| Source | Where it comes in | Fields that matter |
| --- | --- | --- |
| CRM feed (`feed.json`) | `app.py State.feed`, passed to `insight.call10` and `insight.Book` | `touches_due`, `heat.hot`, `heat.warm`, `new_leads` (the Call these 10 pool), `people`, `facts`, `deals`, `market.rows`, `no_text_consent` |
| Per person row | `insight.score_call`, `skip_reason` | `person_id`, `display`, `phone`, `email`, `type`, `stage`, `band`, `tags`, `opportunity_types`, `next_action`, `do_not_contact`, `last_messages`, `reasons`, `owes_reply`, `last_inbound`, `last_outbound`, `last_touch`, `received`, `days_quiet`, `deal_side` |
| Facts per person | `insight.Book.person`, `.card`, `.seller` | `street`, `fair_market_value`, `notes`, `household`, `source`, `deals` |
| AIRE Deals sheet rows | `cc.deal_rows`, `links.tie`, `Book.deals_for` | `deal` (address), `side`, `status`, `act`, `price`, `person_id` link |
| Sales record | `Book.sales`, `Book.years_owned` | `address`, `close`, `side`, `price`, `type` |
| Website lead emails and new CRM contacts | `Book.forms` through `cc.attach_crm` | `received`, `source`, `subject`, `snippet`, `crm.person_id` |
| Flexmls market rows | `Book.off_market` | rows with `type` expired or withdrawn, matched by house number and street |
| Send log, Grok call log, calendar, appointments kept on this Mac | `learn.events` | send `status`, `sent_at`, call `job_type` and `status`, calendar `kind`, `title`, `day`, `invite` |
| Learning folder | `learn.py` | `ranked.jsonl`, `feedback.jsonl`, `outcomes.json`, `versions.json` |

Window limits set outside `insight.py` (confirmed):

- Notes: `crm.py` keeps notes from the last 12 months, at most 3, newest first (`crm.py` comment at line 995 and `cutoff = as_of - 365 days`). `insight.life_note` itself has no date test.
- Website forms and leads: `cc.py LEAD_DAYS = 14`. `insight.py` itself has no date test.
- Last texts: the feed carries their last three texts (`insight.waiting_since` docstring).

How the weights reach the scorers: `app.py State.insight` calls `learn.current(learn_dir)` and passes `weights["seller"]` to `insight.Book` and `weights["call10"]` to `insight.call10`. With no learned weights the hand-set numbers apply (`insight.scaled`).

Two things happen before scoring (`app.py State.insight`):

- `links.overlay` and `links.apply_overlay` set a person's shown stage from their deal: a signed contract is "under contract", a closing is "past client". Pipeline only, nothing is written to a sheet.
- `links.sides` and `links.apply_sides` put the Deals sheet's Side on the person as `deal_side`. This changes the word shown in the reason. `insight.score_call` comment says it "never moves a rank". The seller Book keeps the un-sided feed, so its score still sees real selling talk.

## 2. Call these 10

Code: `insight.call10`, `insight.score_call`, `insight.skip_reason`.

### The pool

`call10` merges `touches_due`, `heat.hot`, `heat.warm` and `new_leads` by `person_id`. For a field, the first non-empty value wins, in that order. Rows with no `person_id` are dropped.

### Filters, in the order the code applies them

| Filter | Code | Notes |
| --- | --- | --- |
| Already reached today | `call10` `done` set | Built in `State.insight` from send-log rows with status `sent`, dated today, with a `person_id`. Calls and dry runs do not count. |
| Vendor, agent, lender, recruit | `insight.PARTNER_TYPES`, `skip_reason` | Checked on `type`. |
| Do Not Contact | `insight.DNC`, `skip_reason` | Regex over `stage`, `type`, `opportunity_types`, `tags`, `band`, `next_action`, or `do_not_contact` equal to YES, TRUE or 1. |
| Spam or a pitch | `insight.PITCH`, `cc.is_test_lead` | PITCH is read over their last texts, next action and reasons. Test leads are dropped here too. |
| No valid phone | `insight._phone` | Needs a 10 digit US number, area and exchange starting 2 to 9. |

Each skipped person is counted by reason in `left_out` and `considered` is the pool size.

No consent: **not a filter in `insight.py`**. The text-consent check (`feed["no_text_consent"]`) lives in `app.py` and refuses the send, not the ranking (`app.py` lines 1100 and 1256). A person who did not check the text box can still be ranked, and Caleb is told to email or call (confirmed).

### Points

Raw points are worked out first, then each part is scaled to the current weight with `insight.scaled`: `points / CALL_MAX[part] * weight[part]`, rounded. Hand-set weights equal `insight.CALL_MAX`.

| Part | Hand-set max (`CALL_MAX`) | How it scores |
| --- | --- | --- |
| Money | 40 (`CALL_MAX["money"]`, `MONEY_PTS`) | Best figure they wrote, else the price on their live deal if it is $50,000 or more. $700,000+ scores 40, $400,000+ scores 34, $200,000+ scores 28, any amount from $50,000 scores 22. No figure scores 0. |
| Intent | 30 (`CALL_MAX["intent"]`) | `TOPIC_PTS` 20 if a topic word matched or they are a new lead. Plus `DEAL_PTS` 10 if they have a deal on the Deals sheet or deal words matched (`DEAL_TALK`). |
| Waiting | 20 (`CALL_MAX["waiting"]`, `WAIT_BASE`, `WAIT_MAX`) | Only when `owes_reply`. `WAIT_BASE` 5, plus 1 for every 3 full days waiting, capped at `WAIT_MAX` 20. Reaches the cap at 45 days. |
| Cadence | 10 (`CALL_MAX["cadence"]`, `CADENCE_PTS`) | `band` from the feed: hot 10, warm 7, lukewarm 4, cold 2, ice-cold 1, anything else 0. |

Details on the parts (confirmed):

- Money figures come from `insight.amounts`. Only `$` forms, or numbers followed by k, m, mil or million, between $50,000 and $20,000,000 count. A figure within a short span of words like repair, roof, credit, closing costs, down payment, loan or salary is ignored (`NOT_BUDGET`). Of several figures, the largest wins (`max` over `(amount, is_ceiling)`).
- Topics, first match wins in this order: multifamily, investment, selling, buying, land (`insight.TOPICS`).
- A new lead is Stage "new lead" or a row with `received` set.
- Waiting days start at the first message of theirs that Caleb has not answered (`insight.waiting_since`). His last answer is the newer of his last text and last logged touch. A message on the same day counts as unanswered. If no day can be traced, `waited` is None and the points are the base 5 only.

### Order and tie-breaks

`rows.sort(key=(-first, -cadence, display))` in `call10`. `first` is money plus intent plus waiting. So cadence never outranks the other three. It only breaks a tie in `first`, and then the name breaks a tie in cadence. The displayed `score` is `first` plus cadence (0 to 100 under hand-set weights). The top `n` = 10 are shown (`call10(n=10)`). The app also keeps a 60-person pool for the learning log (`State.insight`, `call_pool`).

### Worked example (made up, run against the code)

Ann Example, band warm, owes a reply. Her last text, dated 2026-11-03: "Hi Caleb, we are selling and hope to land around $450k". Caleb has not answered. Today is 2026-11-11. No deal, no deal words, hand-set weights.

| Part | Reasoning | Points |
| --- | --- | --- |
| Money | $450k is at least $400,000 (`MONEY_PTS`) | 34 |
| Intent | "selling" matches the selling topic | 20 |
| Deal talk | no deal, no deal words | 0 |
| Waiting | 8 days since Nov 3. 5 + 8 // 3 = 5 + 2 | 7 |
| Cadence | warm | 7 |

`first` = 34 + 20 + 7 = 61. `score` = 61 + 7 = 68. Reason shown: "selling $450K, waiting 8 days, since Nov 3". The values came from running `insight.score_call`.

## 3. Likely-seller score (0 to 100)

Code: `insight.Book.seller`, `insight.SELLER_MAX`, `insight.YEARS_PTS`, `insight.EQUITY_PTS`, `insight.ACTIVITY_PTS`.

### Who gets a score

A contact with a house number at the start of `street` who is not an agent, lender, vendor or recruit (`PARTNER_TYPES`). Anyone else gets None. A score of 0 is never listed (`Book.sellers`). The list shows the top 25 (`Book.sellers(n=25)`, `learn.TOP["seller"]`), with a 200 person pool kept for the learning log. Tie-break: score high to low, then display name (`Book.sellers`).

`Book.seller` does not apply the Do Not Contact, pitch or phone filters that `call10` uses. **Inferred:** that screen is a list to study and the filters apply when Caleb acts on a person. The code does not say.

### Factors

Max points are `SELLER_MAX`: years 30, equity 20, life 20, activity 15, past 15, anniversary 0. They add to 100 (`insight.formula` computes the same sum).

| Factor | Points | Rule and source |
| --- | --- | --- |
| Years owned | 30 at 7+ years, 20 at 5+, 10 at 3+, else 0 (`YEARS_PTS`) | Years since a closed buyer-side (or both) deal at their own address, from the CRM Deals tab, the Deals sheet or the sales record (`Book.years_owned`). Nothing else says when someone bought, so everyone else is unknown and scores 0. |
| Equity | up to 20 (`SELLER_MAX["equity"]`, `EQUITY_PTS` 50% of the assessment scores 20, 30% scores 12) | Code always sets 0: "Equity unknown: no mortgage balance in any source". `EQUITY_PTS` is never used in scoring, only in the Sources text. |
| Job move or estate | 20 (`SELLER_MAX["life"]`) | A note matching `insight.LIFE` and none of `insight.PROTECTED_WORDS` (`insight.life_note`). |
| Lead activity | up to 15, one tier only, first match wins (`ACTIVITY_PTS`, `SELLER_MAX["activity"]`) | Their Flexmls listing expired or was withdrawn: 15. A home value request on the site: 15 (`home_value`). Two or more website forms: 10 (`repeat`). One form: 8 (`one`). Selling words in their texts (`reasons`): 8 (`one`). |
| Past client | 15 (`SELLER_MAX["past"]`) | Stage is past client, or any of their deals has a status containing "closed". |
| Home anniversary | 0 (`SELLER_MAX["anniversary"]`) | Flagged within 30 days of the purchase date, once owned 1+ year. It adds nothing at the hand-set weight. The learning may give it weight. |

The score is the sum, capped at 100: `min(100, sum(points))`. Each part's fraction (0 to 1) is stored and the points are `round(fraction * weight)`. That is how learned weights rescale a part without changing the facts under it (`insight.Book.seller`, `insight.scaled`).

What is capped: the total at 100, the activity tiers (only one counts, never added together), and the years tiers (one tier).

### Fair housing: what is excluded and how the code enforces it

Confirmed in the code:

1. **Only a job move or an estate scores as a life event.** `insight.LIFE` matches new job, job offer, change, transfer or move, relocating, being transferred, estate sale, settling the estate, probate and inherit.
2. **A note that mentions family, age, faith, health or the like is skipped whole**, even if it also names a job move. `insight.PROTECTED_WORDS` covers baby, pregnant, married, divorce, retire, empty nest, kids, child, grand, spouse, husband, wife, mother, father, daughter, in-law, family, passed away, age, years old, elderly, senior, disability, wheelchair, illness, church, religion and pastor. `life_note` returns a note only if `LIFE` matches and `PROTECTED_WORDS` does not. Run check: "New job in Dallas, wife is a nurse" returns None.
3. **Household size and downsizing are not scored.** The comment above `LIFE` says words like "more room", "outgrew" and "downsizing" are left out for that reason.
4. **No protected data is a model input.** The learning loop only reads the parts of the score (`learn.FEATURES`). Its module docstring says there is no name, address, family, age, race, religion or disability, and no stand-in.
5. **A name check guards the feature names.** `learn.BANNED` is a regex over race, ethnic, national, religio, church, famil, child, kid, baby, marri, divorc, pregnan, age, senior, elder, retir, disab, health, sex and gender. `assert not any(BANNED.search(f) ...)` runs when `learn.py` loads. `round58_test.py` also checks that the regex catches "family status", "religion", "age", "disability", "race" and "kids".
6. **Household is shown on the card but never scored.** `Book.card` lists it as a fact. `Book.seller` never reads it.

Limits to know (inferred): the filter is a word list. A note that names a protected trait in words not on the list would not be caught. `PROTECTED_WORDS` also contains a few broad tokens (`\bson\b`, `\bage\b`) that can skip a harmless note. The code does not test either case beyond `insight_test.py`.

### Worked example (made up, run against the code)

Bea Example, 40 Elm St, stage past client. She bought with Caleb, closed 2019-03-15. A note from 2026-09-01 reads "Starting a new job in Dallas". She sent a home value request on 2026-11-05. Today is 2026-11-11.

| Part | Reasoning | Points |
| --- | --- | --- |
| Years | int((2026-11-11 minus 2019-03-15) / 365.25) = 7 | 30 |
| Equity | unknown | 0 |
| Life | job move note, no protected words | 20 |
| Activity | home value request | 15 |
| Past client | stage and closed deal | 15 |
| Anniversary | weight 0 | 0 |

Score 80. Run output: 80 with parts 30, 0, 20, 15, 15, 0.

## 4. Learning loop

Code: `learn.py`, wired in `app.py` (`State.learn_pass`, `learn_loop`, `learn_events`, `feedback`).

### What it logs

| File in the learn folder | Written by | What |
| --- | --- | --- |
| `ranked.jsonl` | `learn.log_ranked` | One line per person per list per week: day, week, list, `person_id`, rank, `top`, score and the parts as 0 to 1 numbers. Call these 10 logs its 60-person pool. Sellers log the 200-person pool. `top` is true for rank 10 or better (call10) and 25 or better (seller), `learn.TOP`. |
| `feedback.jsonl` | `learn.add_feedback` | Caleb's taps: `good` or `not_useful`, by list and `person_id`. **Feedback is logged and counted on the scorecard. The code never feeds it to the model** (confirmed: `retrain` reads only `ranked.jsonl` and outcomes). |
| `outcomes.json` | `learn.outcome_log` | For each ranked row, the first date of each event within 90 days: texted, called, replied, appointment, listing, closed (`learn.KINDS`). Also none_30, none_60 and none_90 once that long has passed, and `yes`, `resolved`. |
| `versions.json` | `learn.retrain` | Each weekly version with its date, weights and test. The last 104 are kept. |

Where events come from (`learn.events`): texted from the send log, called from the Grok call log, replied from the feed's last inbound text, appointment from the calendar or a note matching `MEETING`, listing from a note matching `LISTED` or a Deals row on the listing side at stage appointment, contract or closed, closed from a closed Deals row.

The label: a **yes** is an appointment or a listing within `HORIZON` = 90 days after the ranking day (`learn.outcome`). Events dated after today are not counted. A row only counts once its full 90 days have passed (`resolved`).

### When it retrains

`app.py` starts `learn_loop` as a thread when the server starts (line 1810). It runs `learn_pass` every 600 seconds. Each pass logs the week's ranking and refreshes outcomes. It calls `learn.retrain` only when `learn.due` is true.

`learn.due`: true when it is Tuesday through Sunday, or Monday at 6 AM or later, and no version exists yet for this week (week starts Monday, `week_of`). So the retrain is **Monday 6 AM or the first time the Mac is awake after that**. It is not a launchd job. `launchd/` and `install-sync.sh` hold no retrain or learning entry (confirmed by search). The README says "Every Monday after 6 AM" and the scorecard says "Every Monday at 6 AM on this Mac" (`learn.scorecard["next"]`).

Confirmed against live data: the live `versions.json` has one version, dated 2026-11-11 (a Wednesday), week 2026-11-09. That is the catch-up path.

### The three numbers you asked me to verify

| Claim | What the code says |
| --- | --- |
| 40 outcomes | **Confirmed with a second condition.** `learn.MIN_ROWS` = 40 answered people **per list**, and `learn.MIN_YES` = 5 of them with an appointment or listing. Both must hold or nothing is fitted (`retrain`). "Answered" means the 90 days have passed. |
| Max 5 points a week | **Confirmed.** `learn.MAX_STEP` = 5.0. `blend` scales every part's move so the largest single move is at most 5.0 points, so other parts move less. Weights are rounded to 0.1. |
| Rollback rule | **There is a rule, but it is a veto, not a rollback of older versions.** In `retrain`, if the new weights' AUC on the newest answers is lower than last week's weights' AUC, the new weights are not used and last week's stay. The version row is still saved, with a note. If either AUC is None (too few yes or no rows in the test set) the veto does not apply. No other rollback exists. |

Other constants (all in `learn.py`): `FULL_TRUST` = 400 (outcomes at which learned weights get full trust, `blend` uses `min(1, n / 400)`). The model is logistic regression with L2 `l2` = 1.0, `steps` = 600, `lr` = 0.5 (`learn.fit`). Learned numbers are turned into points adding to 100, with any part that predicts chance or worse set to 0 (`as_weights`). Test set (`recent`) is the answers for people ranked within the last 180 days. It is held out only if there are 40+ older answers with 5+ yeses and 10+ recent ones (`holdout`). Otherwise the test is in-sample and the note says so.

## 5. Known blind spots

What is unknown today and what each unknown costs, in points under the hand-set weights:

| Unknown | Cost | Code |
| --- | --- | --- |
| Equity (no mortgage balance in any source) | 20 points of seller score are 0 for everyone | `Book.seller` always 0, `SELLER_MAX["equity"]` |
| Years owned for anyone who did not buy with Caleb at that address | up to 30 points seller score | `Book.years_owned` |
| Home anniversary | 0 points today, it has no weight yet | `SELLER_MAX["anniversary"]` |
| Page views on the site | unknown from the code (not in any source, per `insight.formula` text). Cost cannot be stated because there is no rule for it | `insight.formula` |
| A job move or estate not written in Notes, or older than 12 months, or past the 3 newest notes | up to 20 points seller score | `crm.py` note window, `life_note` |
| A note skipped because it also mentions family, age, faith or health | up to 20 points, on purpose | `PROTECTED_WORDS` |
| A budget or price not written in the last texts, notes or reasons, and no live deal | up to 40 points (Money), and 22 to 40 once known | `score_call`, `MONEY_PTS` |
| Their wait when more than their last three texts are unanswered | the 1 point per 3 days is undercounted. Cap is 20 | `waiting_since` docstring |
| Band (cadence) missing or unrecognized | up to 10 points (0 for an unknown band) | `CADENCE_PTS` |
| Deal talk on a person with no deal on the sheet and no deal words | 10 points | `DEAL_PTS` |
| Appointments the calendar read missed | outcomes stay "no", so a real yes is not learned | `learn.events` |
| Calls made today | not counted as "reached today", only sent texts and emails are. A person Caleb called may still show on the list. | `State.insight` `done` |

Other gaps (inferred): feedback taps are not used by the model. The seller list does not apply Do Not Contact. The two lists are pooled from only `touches_due`, hot, warm and new leads for Call these 10, so someone outside those four never ranks.

## 6. Weekly changelog

Each Monday retrain adds one dated entry: weights before and after, outcomes added since the last retrain, rank changes in the top 10 of Call these 10 by `person_id` only (no names), and any rollback. Entries below are appended by hand until the retrain step writes them.

Current live weights, read from the main checkout without changing anything: `aire/pipeline-app/out/learn/versions.json` (`learn_dir` is `OUT / "learn"` in `app.py State.__init__` when no send log folder is passed). It holds one version, 2026-11-11, with weights **equal to the hand-set defaults**. Both lists said "Not enough outcomes yet: 0 of 40 people with an answer, 0 of 5". Weights are not client data.

### Changelog entries

#### 2026-11-11 (defaults)

Seller weights (`insight.SELLER_MAX`): years 30, equity 20, life 20, activity 15, past 15, anniversary 0. Total 100.

Call these 10 weights (`insight.CALL_MAX`): money 40, intent 30, waiting 20, cadence 10. Total 100.

Hand-set tiers unchanged: money 22, 28, 34, 40. Years 10, 20, 30. Activity 8, 10, 15.

Outcomes with an answer: seller 0, call10 0. Nothing has been learned yet. The live weights equal these defaults.
