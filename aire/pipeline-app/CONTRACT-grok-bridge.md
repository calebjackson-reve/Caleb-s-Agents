# Prompt contract: Grok bridge, Obsidian notes and next move in Pipeline

Per `aa-prompt-contract`. Caleb asked on 2026-11-10 for Pipeline to act as his CRM with Grok bot's phone ability linked in, memory in Obsidian, agents on different models so tokens are not wasted, messages that sound like him, and a next move suggestion built from every channel. Grok bot read this plan the same day and answered the open questions. Nothing here is live until Caleb says so.

**Status 2026-11-10:** step 1 (consent, quiet hours, one live host) and step 4 (the bridge, dry by default) are built and tested offline. Grok reports its webhook routine is ready. No job has been posted to it yet. Steps 2, 3 and 5 to 7 are not started.

## Decisions (Caleb, 2026-11-10)

- Pipeline stays the one CRM screen and the one sender of texts and email. No second app.
- Grok may see client data and write hard drafts. This lifts the reading-only rule of 2026-10-19. Grok never sends a text or email.
- Every text and every call waits for Caleb's press. No auto lane.
- Obsidian is the notes layer. The Google Sheet stays the system of record.
- One live host. The Mac mini is the only Mac that sends, calls or runs send later. The MacBook Air is a second checkout and a window onto the mini.
- No business SMS line and no Inkbox number. Texts stay on Caleb's own number through Messages on the mini.

## Goal

Caleb opens Pipeline and each person's card tells him the next move and why. He presses Text and gets a draft that sounds like him. He presses Escalate on a hard one and Grok's draft lands in the same compose box. He presses Call, taps Grok's Call card, and the call outcome logs itself on the card. Success is Caleb working his whole day from one screen without a text or call going out that he did not press.

## What Grok says about itself (from Grok, 2026-11-10, not verified by a test yet)

- Calling is built into Grok bot. No phone number is bought or assigned.
- A webhook cannot dial in the background. A job wakes Grok, Grok shows a Call card in its own chat, and nothing dials until Caleb taps it. The card expires after 30 minutes.
- United States only, and not Washington or Illinois. At most 10 calls in 24 hours and 4 to the same number.
- Grok opens every call by saying it is a virtual assistant on a recorded line. That greeting cannot be changed.
- The voice agent receives a script of 2,000 characters at most. It can transfer the call to Caleb's phone.
- No published price per call or per minute. The first call asks Caleb to accept calling terms.
- The inbound path is a webhook routine. Caleb copies the URL and sender key from the routine's panel. Grok never shows the key in chat.
- Grok can see the MacBook Air today. It cannot see the mini until Caleb registers it.

## What is on the screen (in build order)

1. **Send gates** (built). Text consent, quiet hours and the live host guard, added to `State.send()` in `app.py`. See the Sending section of the README.
2. **Obsidian notes.** `aire/vault/build_vault.py` writes one note per person and per deal into an `AIRE` folder inside Caleb's existing vault. Frontmatter (person_id, band, stage, last touch, next action), a short summary, a timeline, and a "Caleb's notes" section the builder never overwrites. One `voice-card.md` built from Caleb's own sent texts.
3. **Drafts that sound like Caleb.** `follow-up/followups.py` builds a draft from the person's note, their last three texts and the voice card. Sonnet 5.5 with the note and voice card cached. Pool templates stay as the fallback.
4. **Grok bridge.** New `bridge.py`. A Call button and an Escalate button on the card. Job state shows on the card (waiting on your tap in Grok, done, expired).
5. **Send later.** Caleb approves one message with a time. It goes then if every gate still passes. Texts and email only.
6. **First live call**, to Caleb's own number.
7. **Next move.** One line on each card: the action, the reason, and when. Rules only. Dropped if the backtest shows nothing.

## Data, and where it lives

| Data | Lives | Written by |
|---|---|---|
| Contacts, notes, tasks, deals | The AIRE CRM sheet | `crm/crm.py` only |
| Feed, send log, call log, scheduled sends | `aire/crm/feed.json`, `aire/pipeline-app/out/` on the mini, git-ignored | Pipeline |
| Bridge results | `aire/pipeline-app/out/bridge/<job_id>.json` on the mini once Grok can see it. A Google Drive folder named Pipeline Bridge Results until then | Grok |
| Person and deal notes, voice card | The Obsidian vault on the mini, outside this repo | `build_vault.py`, plus Caleb by hand |
| Webhook URL and sender key, live host name, vault path | `~/.aire/pipeline.env` | Caleb |

## The bridge

Pipeline posts one JSON job to Grok's webhook routine. The HTTP answer only means the job was accepted. Pipeline never listens on the internet, so results are read by `job_id` from the result folder on the existing five minute sync.

Job (made up values):

```json
{
  "v": 1,
  "job_id": "3f0c1a52-6d1e-4c53-9a53-1c1f0f3a9d10",
  "job_type": "call",
  "requested_at": "2026-11-10T14:00:00-06:00",
  "source": "pipeline",
  "person": {"person_id": "247", "display_name": "Taylor Sample", "phone_e164": "+12255550100", "band": "hot", "relationship": "client"},
  "purpose": "showing_confirmation",
  "objective": "Confirm tomorrow's showing time.",
  "additional_context": "Short facts only: last touch, next move, anything the call must know.",
  "draft_instructions": null,
  "transfer_to_e164": "+12255550111",
  "result_writeback": {"method": "local_file", "hint": "aire/pipeline-app/out/bridge"}
}
```

`job_type` is `call` or `hard_draft`. A hard draft uses `draft_instructions` and leaves `purpose` and `transfer_to_e164` empty.

Result:

```json
{"v": 1, "job_id": "3f0c1a52-6d1e-4c53-9a53-1c1f0f3a9d10", "status": "completed", "outcome": "answered", "summary": "Confirmed 2 pm.", "draft_text": null, "finished_at": "2026-11-10T14:06:00-06:00"}
```

`status` is one of `dial_card_shown`, `completed`, `canceled`, `expired`, `failed`, `draft_ready`.

What Pipeline does with a result:
- `completed` call: one `crm.py touch` with the outcome and summary, the same path a text uses.
- `draft_ready`: the draft opens in the compose box. It is sent only by Pipeline, on Caleb's press, through every gate.
- `expired`, `canceled`, `failed`: shown on the card. No touch.

## Constraints

- Every gate a text passes, a call passes: Do Not Contact, quiet hours, live host. Plus Grok's own limits checked before the job leaves: 10 calls in 24 hours, 4 to one number, United States numbers only, not Washington or Illinois area codes.
- Two call types. Scripted (showing confirmation, appointment reminder, a callback someone asked for) stays short and narrow. Assisted means Grok opens as a virtual assistant and transfers to Caleb. Price, offer, contract or attorney words always transfer.
- Grok never pretends to be Caleb.
- After hours callbacks only to people who asked to be called or already know Caleb. Never to a brand new website lead.
- `ai-compliance-check` runs on each call script. An AI voice call is treated as an artificial voice call under TCPA, so consent matters more than for a text. This is not legal advice. Check with the KW First Choice broker before the first client call.
- The script is trimmed to 2,000 characters. A job that will not fit is refused in Pipeline.
- `PIPELINE_CALLER` is `dry` by default, the same idea as `PIPELINE_SENDER`. Dry logs the job and posts nothing.
- A job carries a few facts from the person's note, never the whole note.
- No client data in git. New fixtures use made up people. `python3 tools/check-no-client-data.py` before every push.
- The next move score uses no input that stands in for a protected class. Location is used for market events only.

## Model routing

| Job | Model |
|---|---|
| Scoring, due lists, caps, next move rules | No model |
| Note summaries, tagging | Claude Haiku 5.5, batch API |
| Everyday drafts | Claude Sonnet 5.5, note and voice card cached |
| Hard drafts on Escalate | Grok. Claude Opus 5.5 if Grok is down |
| X and public social reads | Grok |
| Phone calls | Grok |

A daily dollar cap per lane like `PIPELINE_ASK_CAP`. Every job's cost is logged to `out/usage.json`.

## Failure conditions

- A text, email or call goes out that Caleb did not press.
- Two Macs send, or one person gets the same message twice.
- A call is logged as done when the card expired.
- A client name, number or note reaches GitHub.
- A draft goes out with an em dash, a semicolon or stock AI phrasing.
- The next move line is called a prediction before the backtest is run and dated.

## Open choices for Caleb (defaults in bold)

- Vault folder: **`Documents/Obsidian Vault/AIRE`** or a new `~/AIRE-Vault`.
- Result drop before the mini is registered with Grok: **Google Drive folder** or wait for registration.
- Quiet hours exception for a text back to someone waiting on a reply: **on** or off.
- Next move score: **build last, drop if the backtest shows nothing** or skip.

## Needs Caleb

1. On the mini: add `PIPELINE_LIVE_HOST=<the mini's name>` to `~/.aire/pipeline.env`. `hostname -s` prints the name. Until that line is there, sending is dry everywhere.
2. One live text to his own number from Pipeline on the mini.
3. Register the mini with Grok.
4. Tell Grok to create the webhook routine. Put its URL and sender key in `~/.aire/pipeline.env` on the mini.
5. Accept Grok's calling terms before the first call.

## Unknowns

- Whether Grok can write result files where Pipeline can read them. Pipeline's sync has no Google Drive access, so until the mini is registered with Grok the result folder has to be the Google Drive for desktop copy on the mini.
- How the webhook wants its key and Authorization header sent. Pipeline sends the header value as is, or the key as a Bearer header. Not tried against the real routine.
- The price of a Grok call. Grok reports no published rate.
- Which Deals sheet the Scorecard reads. `cc_sync.py` reads an "AIRE Deals sheet" whose headers differ from the Deals tab in the AIRE CRM sheet.
- KW Command reading. Today it is a login heartbeat only (`command-reader/command_reader.py` has empty selectors).

## Sources

- The repo, read 2026-11-10: `aire/pipeline-app/app.py`, `aire/crm/crm.py`, `aire/crm/FEED.md`, `aire/STACK.md`, `aire/follow-up/directive.md`.
- Grok bot's plan and answers, pasted by Caleb, 2026-11-10.
- Caleb's answers in the planning session, 2026-11-10.
