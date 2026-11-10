# Audit: how Pipeline decides hot, warm and cold

Date: 2026-11-10. Asked for by Caleb: "audit the algorithm for how we are establishing hot, warm, and cold clients, and make sure that we have a better automated system for determining and finding these leads."

Scope: the code in this repo. I did not have the live sheet or the Mac's message history, so every count of real people is in Unknowns, with the one command that prints it.

## Blueprint

How it worked before today, step by step.

1. Every 15 minutes `aire/crm/refresh_feed.sh` reads the Mac's Messages history into `imessage-signals.json`, then runs `crm.py feed --signals` on that file.
2. `crm.py load_signals` reads that file and sets each person's `label` to an empty string and their `signal_score` to the number of texts they sent in 90 days.
3. `crm.py due` picks the band as "the label if there is one, otherwise the sheet's band column". The label is always empty on this path, so the band on screen is whatever the sheet says.
4. The sheet's band is written by hand, by a relabel Caleb approves, or by an import. Nothing rewrites it as people go quiet or wake up.
5. Touches due is sorted by owes a reply, then band, then `signal_score`, then silence.
6. A separate scorer, `enrichment/execution/score_and_label.py`, does have rules for hot, warm, lukewarm, cold and ice-cold. It only runs in the one-off enrichment job. The live feed never calls it.
7. Label review (`crm.py label_review`) flags four kinds of mismatch for Caleb to fix by hand.

## Proof

Each finding, with where it is in the code. All from the source, read 2026-11-10.

| # | Finding | Where |
|---|---|---|
| 1 | The scorer is not wired into the live app. The feed is built from `imessage-signals.json`, and on that path `label` is `""`. | `crm/refresh_feed.sh` (the `feed --signals ../enrichment/out/imessage-signals.json` line), `crm/crm.py` `load_signals`, the JSON branch |
| 2 | Hot, warm and cold on screen are the sheet's band column. | `crm/crm.py` `due`: `band = norm_band(sig.get("label")) or norm_band(c.get("band"))` |
| 3 | The ranking inside a band is a raw count of texts in 90 days. A friend who texts daily outranks a seller who texted once. | `load_signals`: `"signal_score": int(sig.get("in_90", 0))` |
| 4 | Intent words had no dates. One "sell" from last spring counted as recent intent as long as the person texted anything in the last 90 days. | `imessage_signals.py` `build_signals` kept only a total in `keyword_hits`. `score_and_label.py`: `recent_intent = intent > 0 and li_age <= 90` |
| 5 | The intent patterns fired on everyday talk: value, list, offer, showing, closing, title, transfer, rent, move. | `imessage_signals.py` `KEYWORDS` before this change. Checked against 11 everyday phrases, see the test added to `enrichment/tests/test_enrichment.py` |
| 6 | A band of hot kept itself hot. With no signals loaded, band hot meant label hot. With signals, band hot plus any text in 90 days meant hot. | `score_and_label.py`, the `label = "hot"` condition |
| 7 | Stage was matched by substring, so "inactive" read as "active" and scored hot. | `score_and_label.py`: `"active" in stage` |
| 8 | Nothing cooled. No part of the score went down with silence, and texts Caleb sent with no answer counted for nothing. | `score_and_label.py`, the `score +=` lines |
| 9 | Two answers for one person. The points total and the label were worked out by different rules, and the label ignored the points. | `score_and_label.py`: `score` and `label` |
| 10 | Live deals, new leads and website forms were not inputs to the live ranking. | `crm/crm.py` `due` reads only band, signals and Last_Touch |
| 11 | No reason was shown. A card said hot without saying why. | `pipeline-app/static/crm-pages.js`, the Touches due row |

## Unknowns

- How many people sit in each band on the real sheet, and how many of the hot ones have gone quiet. Not verified. On the Mac, this prints counts only, no names:
  `~/.aire/venv/bin/python aire/crm/crm.py heat --signals aire/enrichment/out/imessage-signals.json`
- Whether the new score finds real business. There is no backtest yet. The honest test is past closed deals on the Deals tab: for each one, what was their heat 30 and 60 days before the contract. That needs the Mac's history and is not built.
- How much intent shows up in email and phone calls. Heat reads texts, the sheet and the Deals tab. Gmail signals exist (`enrichment/execution/gmail_signals.py`) but are not in the 15 minute feed. Phone calls are not read at all.
- Social engagement per person. Instagram and Facebook give no per person feed. The CSV path in `social_signals.py` is not in the live feed.
- Whether the thresholds (hot 50, warm 30) are right for Caleb's book. They are my starting point, set so the test cases land where a person would put them. Not tuned on real data.

## What changed today

`aire/crm/heat.py`, one deterministic scorer the live feed now calls. No model, no cost, no writes to the sheet.

| Part | Points | What earns it |
|---|---|---|
| Intent | up to 46 | Buying, selling, moving, renting or investing in their own words. This month counts most, 31 to 90 days counts less, older counts nothing |
| Deal | up to 30 | A live deal on the Deals tab, or deal talk this month |
| Lead | up to 22 | A new lead by its Source date, or a stage in motion (active buyer, seller candidate, appointment) |
| Talk | up to 18 | Texting both ways in 30 days. Waiting on Caleb's reply adds to it |
| Life | up to 8 | A referral or a life change mentioned in 90 days |
| Band | up to 30 | Caleb's own band. Full inside 60 days of contact, half to 180, then nothing |

Then silence fades everything but a live deal: full weight inside 14 days, a quarter after six months. Three or more texts from Caleb in 90 days with no answer takes 10 off and is the first reason shown. A broadcast sender gets no intent or talk points.

Two floors, because speed matters more than math there. A live deal is always hot. A new lead is hot for 7 days and at least warm through day 14.

Hot is 50 and up, warm 30 to 49, lukewarm 15 to 29, cold 5 to 14, ice-cold under 5.

Also changed:
- Intent words are dated (`kw_last`, `kw_30`, `kw_90`) and the patterns need a housing word beside the ambiguous ones.
- The feed carries `heat`: the Hot and Warm lists, the count at each temperature, and how heat compares with the sheet's band.
- Pipeline has Hot and Warm pages under Leads. Each row shows its reasons and is itself the click target.
- The sheet's band is not touched. Where heat and the sheet disagree the row says "Sheet says cold".

## Recommendations

1. Run the counts command above on the Mac and read the "heat says cooler" number. That is how many hot and warm labels on the sheet are stale.
2. Work the Hot list for two weeks, and each time a name is wrong tell me which and why. The weights are in one table at the top of `heat.py` and are quick to tune.
3. Build the backtest against closed deals before calling heat a prediction.
4. Add Gmail signals to the 15 minute feed so email intent counts.
5. Decide whether Touches due should take its cadence from heat. Today it still uses the sheet's band, so nothing about who is due changed without Caleb's say.
