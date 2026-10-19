# AIRE status log

Newest first. Every entry says what was done, what it was based on, and what needs Caleb.

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
- The sign-on template and the Boubkeur draft stay.

**Unmerged work found**
- Branch `claude/gallant-lamport-c5mtmq` (October 15 and 16): responder.py with Gmail API, a follow-up cadence tool, a listing proposal tool. Not merged. Caleb should say whether that branch is the Mac's source or a third copy before anything merges.

**Needs Caleb**
- October 22: decide live email on the Mac.
- Tell me whether the Mac's responder is the gallant-lamport branch or a local copy.

## 2026-10-19, go live

**Done**
- Caleb said "merge it and go live". Merged PR 31.
- Built the speed to lead runner: `aire/speed-to-lead/speed_to_lead.py` (IMAP in, SMTP out, Messages by AppleScript, quiet hours, dedupe, log), `install.sh` (dry run, then type LIVE to install the launchd job), `test_speed_to_lead.py` (passes). Dry run is the default. Live only when the installer sets LIVE=1 on Caleb's Mac.
- New lead type found in the inbox: Google Sign On (Boubkeur Barakate, Oct 18 8:34 am Central, unread, no phone, no reply sent). Added a sign-in template with no call promise and no text. Drafted the reply in Gmail for Caleb to send, since the lead is over a day old and the template is new.
- GBRAR inventory and months supply series added to `aire/market-data/gbrar-2026-09.json` for the Motion piece.
- Sample enrichment CSV no longer uses real lead names.

**Needs Caleb**
- Run the install command on the Mac (approvals page). Type LIVE at the prompt.
- Send the Boubkeur draft.

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
