# AIRE and KW Command: what each one knows, and how to combine them

Written 2026-11-04 from the repo, a read of the live AIRE CRM sheet, and a read of Command's settings in Caleb's Chrome. Nothing was written anywhere.

## Where things stand

- The two systems have never been linked. The AIRE sheet's `Command_ID` column is empty on every row (read 2026-11-04), and `crm.py` is built never to write it.
- The Command reader (`aire/command-reader`) keeps a session alive but its `read()` is a stub. No Command data flows into AIRE today.
- Command has **no custom fields** in Caleb's account (Settings > Custom Fields, "No rows found", 2026-11-04) and no API. Tags are the only bulk channel into Command. The AIRE append in August added contacts with the tag `AIRE Append 4676` and nothing else.

## What AIRE has that Command does not

| AIRE data | Where it comes from | In Command today |
|---|---|---|
| Temperature: hot, warm, lukewarm, cold, ice-cold | sheet `band`, overridden by iMessage signals (`enrichment/score_and_label.py`) | No. Only opportunity stages (Cultivate: Watch, Nurture, Hot) |
| Texting history: last in, last out, owes a reply, 90-day counts | `~/Library/Messages/chat.db`, read only (`enrichment/imessage_signals.py`) | No. Command only sees Gmail it syncs |
| Intent words in their own texts (sell, buy, move, referral), hidden leads, advocates, names people gave ("this is ...") | same | No |
| Verified address with a confidence tier (`addr_tier` A_confirmed = parish roll, B_versium = append) | August AIRE append, EBR parish roll | Address only, no confidence |
| Homestead and parish fair market value | parish roll | No |
| Opportunity type: mover, equity review, past client review, active buyer | AIRE append scoring | No |
| Map pin and farm (55 farms: 9 website subdivisions, 46 city limits) | Census geocoder, Geo tab, `map-crm/farms.local.json` | No. Command has a Neighborhoods field (fill rate not checked) |
| Market Monitor: EBR permits and Flexmls alerts with the nearest known person | `map-crm/monitor.py` | No |
| Deals from ShowingTime and Authentisign mail, Tasks, Notes, Connector Log | `crm.py ingest` | Opportunities exist, built by hand |
| Hand tiers and reasons from the Hot-Warm-Cold list | merged 2026-10-19 | No |
| Label review (who looks mislabeled) | `crm.py label-review` | No |

## What Command has that AIRE does not

| Command data | Needed in AIRE for |
|---|---|
| Its own contact id | Linking. Without it every sync is a guess by phone or email |
| Tags (sphere, Past Client, past-buyer, past-seller, Referral Partner, Agent, Vendor, Buyer, Seller ...) | Stage and Type in AIRE, the follow-up pools |
| Birthday and Home Anniversary | CJ Sphere 12 month 6 and birthday texts, Pipeline touch reasons |
| Lead source (128 sources) | Source column, speed-to-lead |
| Opportunities with phase and stage (16), Transact sync | Deals tab |
| SmartPlan enrollment (CJ New Lead 30, CJ Sphere 12, CJ Reactivation 10) | So Pipeline does not touch someone a plan is already touching |
| Recently Active (KW site and app views), Saved Searches | Hot signals the texts cannot see |
| Leads Never Contacted (1,768 on 2026-11-03) | The reactivation list, cross-checked against texts |

## The merge plan

1. **Link the records first.** Export Command contacts (KW documents bulk export at 50 a time, so about 84 exports for 4,174 contacts, or a read of the Contacts list in his Chrome, or the Command reader once its selectors are filled). `command_bridge.py` matches each Command row to one AIRE person by email, then 10-digit phone, then exact name plus the same street. Two-way ties are left alone. Output is a report and two CSVs under `out/`, nothing written.
2. **AIRE into Command as tags**, since there are no custom fields. Every tag starts with "AIRE " so it can be found or removed in one sweep:
   - temperature: AIRE Hot, AIRE Warm, AIRE Lukewarm, AIRE Cold, AIRE Ice Cold (one at a time, the old one is listed for removal)
   - geography: AIRE Farm <farm name>
   - property: AIRE Homeowner, AIRE Verified Address
   - opportunity: AIRE Mover, AIRE Equity Review, AIRE Active Buyer, AIRE Past Client Review
   - never on Do Not Contact people, never a temperature tag on agents, lenders or vendors
   - things that change daily (owes a reply, last text) stay in AIRE and Pipeline, not as tags
   These tags then drive SmartViews and the CJ plans. Trigger tags stay off until Caleb tests one contact.
3. **Command into AIRE**: Command id, tags, lead source, birthday, home anniversary, plan enrollment. This needs a small change to `crm.py` so it may write `Command_ID` (today it is a NEVER_WRITE column) and two new columns or a Notes row for the dates. Caleb's call.
4. **Touch plans use both**: AIRE temperature and farm pick the plan and the order, Command runs the plan as tasks, Pipeline stays the only sender and skips anyone a CJ plan is touching that week.

## Who presses what

- `command_bridge.py` is read only and runs on the Mac. Every output is client data and stays out of git.
- Tags go into Command in batches through Command's own bulk tag action, only after Caleb says yes to the batch.
- Writing `Command_ID` and the dates into the AIRE sheet needs his yes and a reviewed `crm.py` change.

## Open choices for Caleb

1. Tags only (recommended), or also create Command custom fields (AIRE Band, Farm, Parish Value) knowing they would be filled one contact at a time.
2. Allow `crm.py` to write `Command_ID` once the link report looks right.
