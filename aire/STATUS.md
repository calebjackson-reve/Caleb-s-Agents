# AIRE status log

Newest first. Every entry says what was done, what it was based on, and what needs Caleb.

## 2026-10-21, morning: PR 61 merged, Turnberry fixed, Spark agent approval done

- PR 61 (follow-up pools library, engine partners feed) merged to main. Working branch fast-forwarded onto main.
- Deals tab: the Turnberry listing moved from active to under_contract with expected close 2026-11-29 (was 11-30). Logged in the Connector Log tagged claude.
- MLS feed: Caleb approved the agent-level Spark Datamart licensee request for Luxury Presence's ROAM IDX plan at 8:52 am Central. Spark then put the request in "Brokerage approval pending from Keller Williams Realty-First Choice." Chain per Luxury Presence's IDX coordinator: agent approves, brokerage office approves with the office MLS login, ROAM gives final approval. A draft to the office front desk asking for the brokerage click is in Gmail Drafts for Caleb to send. The cloud morning run watches for the Spark "final approval" email.
- Still open for the MLS parser: one Flex saved-search email alert from Caleb's account, so there is a real sample to build against.

## 2026-10-20: CRM engine, no more junk deals, feed ranks by texts first

**Confirmed by Caleb (through the Mac session)**
- `claude/tender-rubin-eo4m13` was deleted from GitHub on purpose because it carried client data. It is not pushed again. The live engine branch is `claude/gallant-lamport-c5mtmq`. The guard `tools/check-no-client-data.py` runs before every push.

**Done**
- `aire/crm/crm.py`: an Authentisign document with no street address never becomes a Deals row. It takes an address from another mail in the same Gmail thread when one named it, else it is attached as a note to the signer the CRM knows (Participant name or waiting-on email), else it is logged once as `unmatched_authentisign` in the audit file and Connector Log. A "Sign ..." task is still created when Caleb owes the signature. "Signing updated" mail is now read the same way.
- `feed --signals FILE` and `due --signals FILE`: the enrichment's `enriched.csv` or `imessage-signals.json` ranks the touch list. Owes-a-reply first, last text counts as last touch, enrichment label sets the cadence. Read only.
- Docs (README, FEED.md, directive) on the five-step band scale. 75 offline checks pass. Dry run on the fixture: 2 real deals, 0 form-named deals, 2 unmatched lines.

**Needs Caleb**
- Run on the Mac: `python3 crm.py --dry-run ingest --hours 72` to confirm the three form-named deals from the 2026-10-19 dry run are gone, then `python3 crm.py feed --signals ../enrichment/out/enriched.csv`.
- The three junk Deals rows, if a real ingest already wrote them, are Caleb's to delete in the sheet. The engine deletes nothing.
- Closed PR 12 may still keep the leaked commit reachable until GitHub support purges it.

## 2026-10-20, midday: the follow-up loop on the real CRM

**Confirmed by Caleb**
- "Build the follow-up loop, for my sphere and my types of clients."

**Done**
- `aire/follow-up/followups.py --queue` now reads the engine's `feed.json`. Nine pools by who the person is: sphere, past-client, active-buyer, seller-candidate, partner, recruit, new-lead, under-contract, seller-presentation. Email draft when they have an email, text draft (short pool) when phone only, written to `texts-<date>.md` and `out/text-queue.json` for the Pipeline app's compose box. People who texted last get no template: REPLY FIRST with their last three messages. Daily caps 25 emails, 25 texts, hottest first, rest deferred. After `--approve` sends, `crm.py touch` logs it by person_id so they drop off tomorrow's list. 32 tests pass.
- Engine: `feed.json` gains `partners` (agents, lenders, vendors with a next action or band, 60 day cadence, never on the client list) and `type` on due rows. 67 tests pass.
- Offline run on the real CRM for Oct 20: 25 reply first, 1,529 due by audience: sphere 1,211, seller-candidate 142, active-buyer 76, past-client 74, partner 7. With caps: 25 email drafts, 25 text drafts, 1,479 deferred. Nothing sent, files stay out of git.

**Corrected the same afternoon, from the CLI's objection**
- Two senders would break the one-system rule. Pipeline is the one sender. The follow-up tool keeps the pools and templates as `aire/follow-up/pools.py`, a library Pipeline's predraft step imports, and writes `out/email-queue.json` and `out/text-queue.json` for Pipeline to show. Its own send path is a dry run unless `FOLLOWUP_SENDER=followups` is set on purpose.

**Needs Caleb**
- Say if 25 and 25 are the right daily caps, and whether the sphere pool reads like you.

## 2026-10-19, late night: enrichment on the real CRM

**Confirmed by Caleb**
- The real CRM is the "AIRE CRM" sheet created Oct 16 (3,651 people), not the Hot-Warm-Cold sheet. My rename of that sheet was reverted on the Mac. PR 59 stays a draft. No sheet gets renamed again.
- "Set up the enrichment like Nick on my real CRM, use my iMessages, emails and social media metrics as the main tools of measurement, categorize and find real leads, label people correctly, enrich what we know about each person."

**Done**
- `aire/enrichment/`: Nick-style pipeline. One deterministic script per signal (iMessage, Gmail, social engagers), one scorer with ten labels and two flags (hidden_lead, owes_reply), a practice-run merge of the Hot-Warm-Cold sheet, one cheap Haiku pass at the end, and a runner that writes a report first and the sheet only on `--write` (columns Z to AN plus Notes). 34 offline tests pass on a fake Messages database.
- Practice run on the real CRM from the cloud (no message signals yet): 458 of 458 Hot-Warm-Cold rows matched, 316 tier-vs-band conflicts for Caleb, 1,253 unknown identities, 1,519 dormant. Reports delivered to Caleb, not committed.

**Needs Caleb, on the Mac**
- Give Terminal Full Disk Access, then run the order in `aire/enrichment/README.md`. The iMessage pass is where the labels get real.
- Rule on the 316 conflicts (or say "the Hot-Warm-Cold sheet wins for HOT and WARM" and the merge applies that).
- Approve the Haiku pass cost before `--llm` runs on more than 3 rows.

## 2026-10-19, late night: AIRE CRM, one database

**Confirmed by Caleb**
- One system. Google Workspace is the database, no Supabase, Airtable or BoB. ChatGPT and Codex retired, Grok kept for briefs. "Build it... all apps integrated and working flawlessly like Follow Up Boss."

**Done**
- The Hot-Warm-Cold sheet is now **AIRE CRM** (same Drive file, renamed). Contacts keeps Caleb's columns A to L, the tool owns M to P (stage, last_touch_iso, source, id). New tabs: Pipeline, Activity, Tasks, Leads, headers in place.
- `aire/crm/crm.py`: the engine. auth, pull, import-hwc, ingest (Luxury Presence leads, ShowingTime, Authentisign from Gmail, read only), due, log, task, done, tasks, pipeline, export-followup, brief. 35 offline tests pass. Simulated on the real 458-row list: 456 last-touch dates parsed, 54 tasks from "Next action", 118 touches due.
- Command center reads the CRM cache: new Deals, Touches due and Tasks sections at the top of Caleb's view. "Log a touch" and "Done" write to the sheet through crm.py. Chromium click-through: 931 ms load, both actions work, 0 errors. Fixed a state-file race (atomic write).
- Follow-up tool now gets contacts.csv from `crm.py export-followup`. Morning run and its scheduled task read the CRM sheet. Mac companion writes Command changes into the CRM.
- The old "AIRE Pipeline" sheet is retired.

**Not done, needs the Mac**
- The classifier would not let the cloud session write client deal rows to the sheet, so Pipeline rows and tasks come from `crm.py import-hwc` on the Mac. First run steps in `aire/crm/README.md`: put the OAuth client at ~/.aire/credentials.json, `crm.py auth`, `import-hwc`, `ingest --hours 72`, `pull`, then open the command center.
- Pipeline rows for the four live deals: Caleb adds them on the Pipeline tab (prices and close dates are his to confirm).
## 2026-10-19, late night: Hot-Warm-Cold merge applied to the AIRE CRM

**Confirmed by Caleb**
- "Yes, apply the merge for matched and new rows."

**Done**
- Applied through the Google Sheets connector from the cloud (no token there): 391 matched contacts got Last_Touch and Next_Action where blank (band untouched), 25 new contacts (person_id 7229 to 7253), 416 Notes rows, 855 Connector Log rows. Every Contacts row read back and compared: 0 mismatches. Audit copy in `aire/crm/reports/2026-10-19-hwc-merge-applied.audit.jsonl`.
- The sheet now: 3,651 contacts, Last_Touch filled on 417 rows (was 4), Next_Action on 417 (was 1). Feed as of tonight: 1,529 touches due (HOT 112, WARM 47), 101 Next_Action tasks waiting for the Tasks tab, 0 deals.
- `crm.py` reads the token from the `AIRE_GOOGLE_TOKEN_JSON` environment secret when there is no token file, so the cloud can run `ingest` once Caleb adds it.

**Needs Caleb**
- Settle the 42 conflicts in the sheet (band disagreements, 3 Do_Not_Contact or duplicate matches).
- Add the Google token to the cloud environment's secrets as `AIRE_GOOGLE_TOKEN_JSON` (environment settings, not chat) so the daily ingest can run in the cloud.
- Do not run the 2026-10-19 merge again.

## 2026-10-19, night: CRM engine pointed at the real AIRE CRM

**Confirmed by Caleb**
- PR 59 is held as a draft, not merged: it built a second CRM. The one CRM is the AIRE CRM sheet (1w9iz..., 3,626 contacts). The Hot-Warm-Cold sheet is back to its original name and no sheet is renamed again.
- The command center web app is rejected as the front end. The native Mac Pipeline app is the one daily tool.

**Done**
- `aire/crm/crm.py` rewritten for the real sheet: reads the live header, keeps every existing column, adds only Tasks and Deals tabs (when missing), enforces the Mac's write gates (person_id only, Do_Not_Contact one way, never Command_ID, every write audited to audit.jsonl and the Connector Log), Gmail read only, `--dry-run` on everything. 59 offline checks pass.
- `feed.json` spec in `aire/crm/FEED.md` for Codex to wire into the Pipeline app. No web UI.
- Dry run on the real sheet's header and rows: `aire/crm/reports/2026-10-19-dry-run.md`. Touches due 1,641 (all "never logged", Last_Touch is filled on 4 rows), 0 tasks, 0 deals as the sheet stands. Ingest of the real last 7 days of mail would create 1 lead, 1 showing deal, 5 signing deals, 2 sign tasks. Nothing written.
- Hot-Warm-Cold merge dry run: `aire/crm/reports/2026-10-19-hwc-merge-dry-run.md`. 458 rows: 391 matched, 25 new, 42 conflicts. Nothing written.

**Inference**
- NURTURE 90 days and DORMANT 365 days cadence, from the band names.
- COLD and CONTACT tiers map to no band; friend/family/lead become Type client.

**Needs Caleb**
- Read the merge report. Yes or no on applying matched and new rows. Settle the 42 conflicts in the sheet.
- Confirm or change the cadence numbers and the tier-to-band mapping.
- On the Mac: `crm.py auth`, `crm.py check`, `crm.py --dry-run ingest --hours 72`, then the real run. Codex wires feed.json into Pipeline.

## 2026-10-19, late: morning run live

**Confirmed by Caleb**
- "You can have that every morning." Daily morning routine approved.

**Done**
- `aire/morning-run/directive.md` and `mac-companion.md`. Cloud runner reads Gmail (read only), the AIRE Pipeline sheet, Authentisign status and the calendar, then writes one "AIRE Morning Brief" event 6:45 to 7:00 Central and the brief file. Mac companion covers ROAM MLS and KW Command, which have no API.
- Scheduled task "AIRE morning run" (trig_01THrpgYe4fxVc4z4QtynZBS) fires 6:40 am Central daily in the cloud session.
- First brief produced for Tue Oct 20: calendar event bkvkvuclndidtsflr6a4c8kvds, file `briefs/2026-10-20.md`.

**Needs Caleb**
- Fill real rows in the AIRE Pipeline sheet so the pipeline section has something to track.
- Turn on Flex saved-search daily email alerts so the cloud run can read MLS.
- Run "morning companion" on the Mac for Command and MLS.

## Supervised week log
- 2026-10-22 (7:05 am run): 0 new website leads in the last 26 hours, 0 drafts created. Only a Luxury Presence newsletter and a support case came from that sender. Nothing sent.
- 2026-10-21 (7:05 am run): 2 new website leads in the last 26 hours (both Google sign on, Mon 8:13 am and Mon 5:53 pm Central), 2 sign-in drafts created, 1 digest draft to Caleb. No prior drafts or sent mail to either address. Nothing sent, nothing labeled.
- 2026-10-20 (7:05 am run): 0 new website leads in the last 26 hours, 0 drafts created. The only lead in the window search is Sunday's Google sign-on lead, already drafted on 10/19. Nothing sent.

## Morning run log
- 2026-10-22 (6:41 am run): 0 new leads, 6 live deals tracked (0 waiting on Caleb for a signature), 1537 touches due from the Oct 19 night snapshot (117 hot, 47 warm, not a live pull), 0 open tasks, 1 conflict (a personal appointment inside the lead gen block), 1 travel block added, 1 deal date mismatch flagged for Caleb. Brief kept out of git. Nothing failed.
- 2026-10-21 (6:40 am run): 2 new leads, 1 listing went under contract, 5 live deals tracked (0 waiting on Caleb), 7 touches logged by Pipeline yesterday, 0 conflicts, 0 appointments added. Brief kept out of git. Nothing failed.
- 2026-10-20 (6:40 am run): 0 new leads, 1529 touches due (112 hot, 47 warm), 4 contracts tracked (0 waiting on Caleb), 1 conflict (Business Planning Clinic), 0 appointments added. Brief kept out of git. Nothing failed.
- 2026-10-20 (run Oct 19 evening): 1 new lead, 0 pipeline rows, 5 contracts (0 waiting on Caleb, 1 item owed: inspection report to the other agent), 1 conflict (Business Planning Clinic vs lead gen and sales block 2), 0 appointments added. Nothing failed.

## 2026-10-19, night: supervised week, sales block, contacts mapped, proposal marketing text

**Confirmed by Caleb**
- Test the responder for a week with drafts he approves by hand. Do steps 4 and 5 of the plan (proposal marketing text, sales block on the calendar).

**Done**
- Scheduled task "Speed to lead supervised week" fires 7:05 am Central daily through Oct 26 in the cloud session: finds new Luxury Presence leads, creates one Gmail draft per lead from the main templates, plus a digest draft to aire@. Sends nothing. Caleb opens Drafts and hits send or delete. The Mac runner keeps its own dry run; neither sends.
- Google Calendar: three weekday "Sales block" events from Oct 20 (7:30 to 8:30, 12:30 to 1:00, 5:00 to 5:30 Central), red, 10-minute popup. Roadmap step 14.
- Contacts: mapped the Drive sheet "Hot-Warm-Cold Contacts 2026-10-19" (458 people) into the follow-up tool's format. 100 have email, 358 are phone only. Tier to pool: HOT with an active deal to under-contract, other HOT and WARM to new-lead, COLD and CONTACT to past-client (90/180/365). First dry-run queue for Oct 20: 3 due, 0 flagged, 97 skipped. File delivered to Caleb, not committed (client data).
- A phone-only call list of the 41 HOT and WARM contacts without email, delivered to Caleb.
- Proposal marketing plan rewritten from what Caleb actually does (pre-list walk, MLS plus calebjackson.org page, office and buyer-list announcement, first-weekend open house and social launch, ShowingTime approvals with same-day feedback, weekly update). Sample re-rendered, 10 tests pass.

**Needs Caleb**
- Read the new marketing plan in `aire/proposal/tests/sample-proposal.html` and say what is wrong.
- Drop `contacts.csv` into `aire/follow-up/` on the Mac. The cadence can only email the 100 with addresses. The other 358 need the call list or an A2P-registered text line.
- Each morning this week: open Gmail Drafts, send or delete.

## 2026-10-19, evening: follow-up cadence, proposal tool, command center merged from the cloud branch

**Done (cloud session, branch claude/gallant-lamport-c5mtmq)**
- `aire/follow-up/`: daily cadence tool. Reads a KW Command export, finds contacts quiet exactly 1, 2, 3, 7, 14, 21, 28, 56 or 84 days, picks the next unused template from four pools in Caleb's voice, writes a dated queue file. `--approve` sends what Caleb leaves in it. 14 tests pass. Dry run by default.
- `aire/proposal/`: listing appointment transcript (or audio via whisper) to a one-page proposal with signature pad plus email draft, extraction through `claude -p`, numbers guarded against the transcript. 10 tests pass, live extraction verified on a fake transcript.
- `aire/command-center/`: Next.js page over the tools. Sync script, seed data, click-through proof in Chromium (674 ms load, every action works, 0 errors). Localhost only, no login. Supabase schema with RLS ready for version two. Every record carries listing_id for the seller view later.
- Contract for the command center in `command-center/CONTRACT.md`, approved by Caleb on 2026-10-19. Caleb chose his own view over the seller dashboard.
- Hooks for the Mac (done chime, needs-you ping) in `global-claude-md/settings.json`.

**Corrected during the merge**
- The cloud branch carried a second speed-to-lead runner (responder.py, built Oct 16). Removed here, same as the Oct 19 correction above: one runner, on the Mac. Main's directive and templates (within the hour, 9 pm quiet hours, texts off until A2P, KW Command Do Not Contact check) stay.
- The command center reads the Mac runner's `log.csv`, `dry-run.log` and `token.json` in `aire/speed-to-lead/`. If the Mac runner's dry-run.log format differs from JSON blocks, `sync.py leads()` needs a one-line parser change.

**Needs Caleb**
- Pull on the Mac, run `python3 aire/command-center/sync.py --seed` and the app, click through.
- Drop a KW Command export into `aire/follow-up/contacts.csv`.
- Read the fixed marketing plan text in `aire/proposal/tests/sample-proposal.html`.

## 2026-10-19, two just sold posts

**Done**
- `aire/social/just-sold/2026-10/`: cards for 4615 41st Street (Caleb's listing, closed about September 22) and 11313 Triche Road (Caleb represented the buyers, listed by The Musso Group, closed about September 21). Photos are the MLS exteriors via Zillow, your own for 41st, the listing brokerage's for Triche. Captions and a compliance pass in `captions.md`. The card template and renderer are committed for the next sold post.

**Needs Caleb**
- Confirm dates and sides. Get Danielle Musso's OK on the Triche photo. Say "schedule" with a day.

## 2026-10-19, vertical cut and Skool stack template

**Done**
- `aire/market-update/vertical/`: the 9:16 Reels cut of the September market update, rendered here to MP4 (1080x1920, 30 fps, 30 s) and proven by pulling mid-animation frames from the file. Source page and renderer committed so it re-renders in one command.
- `programs/ai-for-agents/skool/stack-template.md`: the blank stack memory for members, plain English, state rules section with "ask broker" default. Attachment for the first pinned post.

**Needs Caleb**
- Watch the MP4. Approve the caption in the script file. Schedule in Metricool himself.
- Upload the template to the Skool classroom with the pinned post.

## 2026-10-19, week 4 started

**Confirmed from Caleb's Mac**
- Enrichment dry run succeeded through OmniRoute on the fixed script: 3 rows, about $0.0008. OmniRoute adds about 2,000 tokens of setup per call. The tagger read "before school starts" as "now" and one next_touch suggested a week. Prompt tightened for both.

**Done**
- `aire/offer/OFFER-2026-10.md`: the AI office as the system, three tiers with offer sentences, cost table, compliance pass, and the gate (paid tiers wait for two real runs, second brief is October 26).
- `programs/ai-for-agents/posts/ai-office-in-a-day.md`: the free Skool post in Caleb's voice with a 48 hour stack-memory offer. Not posted.
- `aire/rollout-2026-10/WEEK-4.md`.
- Speed to lead live is the Mac's call on October 22, per the earlier correction.

**Needs Caleb**
- Review and post the Skool post himself.
- Prices for the workshop and the install (recommendations are in the offer file, labeled inference).
- The broker's answer on teaching under the Keller Williams First Choice name, open since October 12.

## 2026-10-19, enrichment fixes from the Mac dry run

**Confirmed from Caleb's Mac screenshot**
- Haiku 5.5 spent all 256 output tokens thinking and returned no text. OmniRoute drops the structured output schema, so the model freelanced fields.

**Done**
- `enrich.py`: thinking off for the call, max_tokens 1024, hard error on max_tokens or missing text, prompt names the allowed values, fenced or chatty JSON is parsed, and any value outside the allowed lists marks the row error. Tested offline on both the fenced reply and a bad value.

**Needs Caleb**
- On the Mac: `git pull` and rerun the dry run through OmniRoute. Direct Anthropic is also fine now. No key is read from another project.

## 2026-10-19, correction: one speed to lead runner, not two

**Confirmed from Caleb's Mac screenshot**
- A responder already runs on the Mac with a KW Command Do Not Contact check, "within the hour" wording, 9 pm to 8 am quiet hours, and texting off until an A2P-registered number and Caleb's yes. Its dry run ends October 22.
- The Mac session warned that two runners means two replies per lead.

**Done**
- Removed the cloud-built runner (speed_to_lead.py, install.sh, test_speed_to_lead.py) from the repo. Also removed a stray __pycache__ that had been committed.
- Templates and directive now match the Mac's rules: "within the hour", 9 pm quiet hours, CRM check, texts off, no timing promise tighter than an hour.
- Approvals page row replaced: on October 22 read the Mac's dry-run.log and say "live email" there.
- The sign-on template and the new-lead draft stay.

**Unmerged work found**
- Branch `claude/gallant-lamport-c5mtmq` (October 15 and 16): responder.py with Gmail API, a follow-up cadence tool, a listing proposal tool. Not merged. Caleb should say whether that branch is the Mac's source or a third copy before anything merges.

**Needs Caleb**
- October 22: decide live email on the Mac.
- Tell me whether the Mac's responder is the gallant-lamport branch or a local copy.

## 2026-10-19, go live

**Done**
- Caleb said "merge it and go live". Merged PR 31.
- Built the speed to lead runner: `aire/speed-to-lead/speed_to_lead.py` (IMAP in, SMTP out, Messages by AppleScript, quiet hours, dedupe, log), `install.sh` (dry run, then type LIVE to install the launchd job), `test_speed_to_lead.py` (passes). Dry run is the default. Live only when the installer sets LIVE=1 on Caleb's Mac.
- New lead type found in the inbox: Google Sign On (a website lead, Oct 18 8:34 am Central, unread, no phone, no reply sent). Added a sign-in template with no call promise and no text. Drafted the reply in Gmail for Caleb to send, since the lead is over a day old and the template is new.
- GBRAR inventory and months supply series added to `aire/market-data/gbrar-2026-09.json` for the Motion piece.
- Sample enrichment CSV no longer uses real lead names.

**Needs Caleb**
- Run the install command on the Mac (approvals page). Type LIVE at the prompt.
- Send the new-lead draft.

## 2026-10-19, late: approvals page and pipeline sheet

**Done**
- `aire/approvals/index.html`: every open decision with one button to the exact place. Published as a private artifact, link in the chat.
- Created the "AIRE Pipeline" Google Sheet in Caleb's Drive from the template, two example rows marked delete me. https://docs.google.com/spreadsheets/d/1sD1cw5JK_i_Q60Y31wy_RODCcVYOMJaTQ1eAF8CVBV4/edit
- Marked PR 31 ready for review so merge is one click.

**Needs Caleb**
- Work the approvals page top to bottom.

## 2026-10-19, night: week 3 built, weeks 1 and 2 merged

**Done**
- Re-verified week 2: enrichment script ran end to end offline with a stubbed SDK (CSV in, tagged CSV out, cost printed). Calculator artifact intact. Merged.
- Dashboard at `aire/dashboard/index.html`, live at https://claude.ai/artifact/BaiAEbjMLYo9neapCpaXhn. Market data from the official GBRAR September 2026 report saved in `aire/market-data/gbrar-2026-09.json`. Proven headless at phone width and desktop dark, chart palette validated.
- Pipeline tracker template and steps in `aire/pipeline/`.
- October market update script, Motion prompt, caption and compliance pass in `aire/market-update/2026-10-script.md`.
- `aire/rollout-2026-10/WEEK-3.md`.

**Confirmed**
- GBRAR September 2026: 737 closed, $269,000 median, 79 days on market, 3,524 for sale, 4.6 months supply. Current as of October 6, 2026.

**Needs Caleb**
- Create the AIRE Pipeline sheet from the template (5 minutes).
- Run the Motion prompt or record the script. Schedule in Metricool only after review.
- Weeks 1 and 2 items still open: the four switches, calculator defaults and paste, enrichment dry run on the Mac, Meta One, RealAssist, Your Algorithm.

## 2026-10-19, evening: week 2 built

**Done**
- Merged the week 1 checklist. Built week 2 the same day on Caleb's say-so.
- Seller net sheet calculator at `aire/calculators/net-sheet.html`, in the site's paper, ink and coral tokens. Proven in a headless browser: math matches hand calculation, no overflow at phone width, no errors. Preview at https://claude.ai/artifact/9nV9rkWA422LkAbX5AC31L.
- First bulk tier workflow at `aire/lead-enrichment/`: directive, `enrich.py` on Haiku 5.5 with JSON schema output, DRY_RUN default, sample CSV. Compiles. Not run against the API, no key in this session.
- `aire/rollout-2026-10/WEEK-2.md`: status, proof, the Meta One decision memo, and the two small checks.

**Inference**
- No enrichment pipeline existed, so "reroute to Haiku" became "build the first one on Haiku".

**Needs Caleb**
- Review the calculator defaults, then paste into the Sell page on Luxury Presence.
- Run the enrichment dry run on the Mac (one command in WEEK-2.md).
- Meta One yes or no. RealAssist market check. Facebook Your Algorithm.
- Week 1 switches are still open.

## 2026-10-19, afternoon: plan merged, week 1 started

**Done**
- Merged the rollout plan and the four skills into main.
- Wrote `aire/rollout-2026-10/WEEK-1.md`: the six week 1 switches with click paths, requirements, proof and sources.
- Created the scheduled task "AIRE Monday AI brief": every Monday 7:47 am Central, fresh session, runs `ai-weekly-brief`, opens a draft PR. First run October 26.

**Needs Caleb**
- Switches 1 to 4 in WEEK-1.md: install the Claude sidebar, check for Gmail AI Inbox, turn on Meet notes for the next consult, link the Console org in Max billing.
- List any custom GPTs (switch 6).

## 2026-10-19: October AI rollout plan and four auto-loading skills

**Done**
- Researched AI and major app releases Oct 6 to 19 and saved the brief with sources in `aire/ai-briefs/2026-10-19.md`.
- Wrote `aire/rollout-2026-10/PLAN.md`: five arenas (website, lead gen, touches, operations, agent offer), the rules that shape each, four weeks of order, definition of done.
- Created `aire/STACK.md` as the single memory of tool choices so skills stop asking.
- Added four skills that load by description: `ai-weekly-brief`, `aire-stack`, `ai-compliance-check`, `agent-offer-builder`. Linked into `.claude/skills/` and listed in the README.

**Inference**
- "Legion" in Caleb's request was read as lead generation. If it is a product name, fix STACK.md and the plan.

**Needs Caleb**
- Read the plan and say which of week 1's switches to flip: Gmail AI Inbox, Claude Workspace sidebar, Meet next steps, linking the Claude Console org for API credits.
- Confirm which subscriptions are paid (see the bottom of STACK.md).
- Say whether KW First Choice has an AI use policy.
- List any custom GPTs that exist, so they can be rebuilt as skills before December.
