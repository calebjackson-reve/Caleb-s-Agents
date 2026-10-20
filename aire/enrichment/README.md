# CRM enrichment, Nick Saraev style, on the real AIRE CRM

Deterministic signal scripts, one job each. The model is used once, cheaply, at the end. Nothing writes to the CRM until Caleb has read the practice-run report and runs `--write`.

Target: the real **AIRE CRM** sheet (`1w9izcliqmXlFR3_O3dnP2G5SGfCrua7mrCLCE7cdoDc`, 3,651 people on 2026-10-19). Columns A to Y are the CRM's own and are never rewritten. This tool owns columns Z to AN on Contacts and appends to the Notes tab. No tab is added, nothing is renamed.

## The signals (Caleb's real tools of measurement)

| Source | Script | What it measures | Where it runs |
|---|---|---|---|
| iMessage (`~/Library/Messages/chat.db`) | `execution/imessage_signals.py` | Per phone or email: last inbound and outbound, counts at 30/90/365 days, unanswered inbound, real estate keyword hits (sell, buy, move, rent, invest, deal, referral, life event), names people gave in their own texts ("this is Marcus Pelt") | Mac only, read only, copies the db first |
| Gmail | `execution/gmail_signals.py` | Same shape, per contact email, plus subjects | Mac with the Google token, read only |
| Social | `execution/social_signals.py` | Who liked, commented, shared or DM'd on Caleb's posts in 90 days, weighted. Input is a CSV the Chrome companion fills while scrolling Caleb's own posts, matched to people by handle. Metricool stays account level. | Mac |
| The CRM itself | `execution/score_and_label.py` | band, Stage, Type, Do_Not_Contact, homestead and fair market value (equity review candidate) | anywhere |
| Hot-Warm-Cold sheet | `execution/merge_hwc.py` | Caleb's hand-tiered 458 people with reasons: fills email, phone, why, next action, notes, social handles into the CRM, as a practice run first | anywhere |

## Labels, one per person

do-not-contact, active-client, hot-lead, warm-lead, advocate (engages but no intent: the referral engine), past-client, nurture, dormant, vendor-agent, unknown-identity (phone only, no name, no history). Rules are at the top of `score_and_label.py`. Two flags: `hidden_lead` (their own words show intent but the CRM did not have them as a lead) and `owes_reply` (they texted last and it has been 2 or more days).

## Run order on the Mac

```
cd ~/Caleb-s-Agents/aire/enrichment
python3 tests/test_enrichment.py                              # 34 offline checks
python3 execution/run_enrichment.py --dump-contacts           # out/contacts.json
python3 execution/imessage_signals.py                         # needs Full Disk Access for Terminal
python3 execution/gmail_signals.py --contacts out/contacts.json
python3 execution/merge_hwc.py                                # practice merge from both sheets, read out/merge-report.md
python3 execution/run_enrichment.py                           # practice run, read out/enrichment-report.md
python3 execution/run_enrichment.py --llm --limit 150         # Haiku pass on the hot and warm rows, prints cost (about $0.01 per person)
python3 execution/run_enrichment.py --write                   # only after Caleb reads the report
```

Practice run on the real CRM from the cloud on 2026-10-19 (CRM columns and the Hot-Warm-Cold sheet only, no message signals yet): 458 of 458 Hot-Warm-Cold rows matched (450 by phone), 0 new people, 316 tier-vs-band conflicts, 1,253 phone-only unknown identities, 1,519 dormant. The iMessage pass is what turns those two big buckets into names and labels.

## Creative bits worth knowing

- **Name recovery.** 1,737 CRM rows are a phone number with no name. People say who they are in their first text. The iMessage pass pulls "this is X" and "my name is X" and reports them for Caleb to confirm.
- **Strangers list.** Handles that text Caleb two or more times in a year and are in no CRM row at all. Real leads live here.
- **Advocates.** People with no buying intent who keep engaging (3+ inbound in 90 days, 3+ social actions, or a referral phrase). They are the referral engine and get their own label instead of being lost in nurture.
- **Equity review candidates.** Homestead true plus a known fair market value adds to the score, because an owner with equity is a future seller.
- **Owes reply.** The single most expensive leak in a sales day, surfaced every run.

## Safety

- Messages, Gmail and the CRM are read only until `--write`. `--write` touches columns Z to AN and the Notes tab only.
- Message snippets stay on the Mac in `out/` (git-ignored). The sheet gets scores, labels, dates and keyword counts, never message text.
- The Haiku pass only sees the last 8 inbound snippets of hot, warm, active and hidden-lead rows, capped by `--limit`, cost printed.
- Any outbound that follows (a reply, a check-in) goes through the follow-up tool and Caleb's approval.
