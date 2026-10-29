# AIRE Pipeline

Caleb's pipeline briefing as a local web app and installable PWA. It replaces the native Mac panel that lived at `~/Documents/Codex/2026-10-19/task-3/PipelinePanel` (retired 2026-10-29). One data source, `aire/crm/feed.json`. One writer, `aire/crm/crm.py`. Nothing sends itself.

```
cd ~/Caleb-s-Agents/aire/pipeline-app
python3 server.py                 # http://127.0.0.1:8787  (system Python, no installs)
```

Open that address in Safari or Chrome. On a phone, open it over Tailscale (below) and use Share, Add to Home Screen (iPhone) or the install prompt (Android, Chrome, Edge). On the Mac, Safari File, Add to Dock, or Chrome's install icon in the address bar. The shell works offline; the data never pretends to.

## What it shows

- **Briefing line.** Greeting, date, and one plain sentence computed from the feed, in this order: people waiting on a reply, a deal that moved today, a deal whose close date has passed, overdue tasks, the most overdue hot contact, the next close. Then "Nothing is on fire."
- **Counts as HUD tiles.** Owes a reply, touches due, done today, tasks open (overdue in amber), live deals (moved today), new leads. Tap a tile to jump.
- **Touches.** People who texted last come first, newest text first, with their last three texts above the compose box. Then the engine's own order (hot, then signal score, then longest silence). The compose box is prefilled from the best available draft: a model reply written from the real conversation, else that person's next unused check-in line from the follow-up pools. Your own edit, saved in the browser, always wins.
- **Tasks.** Overdue first. Done closes the task through `crm.py done`. A Next_Action item without a `task_id` says so and points at `crm.py sync-tasks`.
- **Deals.** The CRM Deals tab through the feed: price in mono, "Closes in N days", an amber warning when the close date has passed, "Add price in the CRM Deals tab" when blank, latest event, next step, commission when entered.
- **Leads.** New leads of the last 14 days with Call, Text and Email links.
- **Counts.** Every number in the feed, by band with the cadence days, feed age, engine path, this device's recent outcomes and the send log.

If `header_ok` is false in the feed, the app shows only that error. If the feed is missing, unreadable or older than two hours, it says so in the status dot and footer.

## What it does, and what it never does

| Button | What happens |
|---|---|
| Call | Opens the phone app (`tel:`). Then **Called** logs `crm.py touch <id> "Called from Pipeline"`. |
| Open in Messages / Open in Mail | Opens the device's own app with the draft filled in (`sms:` / `mailto:`). You press send there. **Mark sent** then logs the touch. |
| Send from Pipeline… | Final review of the exact message. **Approve** is a dry run by default: it records what would go out and sends nothing. Only when the server was started with `--live-send` does Approve send, text through Messages on the Mac, email through the follow-up tool's Gmail sign-in, and then log the touch. |
| Done (task) | `crm.py done <task_id>` |
| Skip today, Snooze 3 days, No reply needed | Local to this app's state file. No CRM write. |
| Undo | Reverses a local outcome within 10 minutes. It never recalls a message. |

Every CRM write goes through `crm.py --json`, which applies the engine's gates (person_id only, Do_Not_Contact refused, Last_Touch never moves backwards) and writes the audit file and the Connector Log. The app passes `--client pipeline` when the engine supports it and falls back without it. A refused write is shown as the engine's own words. A timeout says "not confirmed", never "nothing written".

The same exact message is never sent twice to the same person. A check-in line used on someone is never offered to them again (the send log carries the template id, and `engine/predraft.py` reads it).

Local state lives in `$AIRE_HOME/pipeline/state.json` (mode 0600) and `send-log.jsonl` (no recipients). Nothing client-facing is written inside the repo.

## Files

```
server.py              the whole backend: feed assembly, actions, static files, token check
static/                index.html, app.css, app.js, manifest.webmanifest, sw.js, icons/
engine/predraft.py     pre-written drafts, run by aire/crm/refresh_feed.sh after every feed rebuild
engine/conversation.py Messages reader (read only) and the on-Mac model draft with its validators
engine/send.py         the only place a message can leave the Mac; dry run unless --live
tools/make_icons.py    regenerates the icons (standard library)
tests/test_server.py   23 offline checks, made-up people
tests/proof.py         Playwright click-through at phone and desktop width, screenshots saved here
```

Paths are environment first: `AIRE_HOME` (default `~/.aire`), `AIRE_FEED`, `AIRE_FOLLOWUP`, `AIRE_QUEUES`, `AIRE_PREDRAFTS`, `AIRE_CRM_ENGINE`, `AIRE_CRM_PYTHON`. Defaults point at this checkout and `~/.aire/venv/bin/python` when it exists.

## On Tailscale (phone, other machines)

The server binds to localhost unless told otherwise. Off localhost a token is required in the URL once; the app then keeps it in a cookie.

```
python3 server.py --host 0.0.0.0 --token "$(openssl rand -hex 16)"
```

Then on the phone, on the same tailnet: `http://<mac-tailscale-name>:8787/?token=...`. Or let Tailscale terminate HTTPS so the PWA installs cleanly and the camera, share and notification APIs work:

```
tailscale serve --bg --https=443 http://127.0.0.1:8787
```

and open `https://<mac>.<tailnet>.ts.net/?token=...`. Keep `--token` even behind Tailscale: the mini dashboard pattern is the same, a private network plus a secret in the link. The token is never logged, request lines are not written, and every action is refused without it.

Nothing in this app is exposed to the public internet. Do not put it behind a Funnel.

## Proof

```
python3 -m unittest discover -s aire/pipeline-app/tests -p 'test_*.py'    # 23 offline checks
python3 aire/pipeline-app/tests/proof.py                                   # Playwright, writes tests/*.png and proof-results.json
```

`proof.py` needs the Playwright Python package and a Chromium it can launch (`pip install playwright==1.60.0` matched the browser already cached on Caleb's Mac on 2026-10-29). It starts the server on a free port with `--fake-engine`, so no crm.py write happens, against the fixture feed of made-up people.

## What the old app had, and where it went

Every feature of the retired native panel (revision 1.10.3, plus its Python scripts), with its fate here:

| Old feature | Here |
|---|---|
| Now, Next, Waiting, History, Review queue tabs | Touches (owes-reply first, then the feed order), Counts holds recent outcomes and the send log. Waiting and History collapsed into local state badges. |
| Feed-driven order, owes-reply first, five bands | Same, from feed.json. |
| Last three texts above the compose box | Same. |
| Daily 5 (five stable picks a day) | Dropped. The feed's order plus Skip today does the job without a second ranking. |
| Pre-written drafts (`predraft.py`): model replies for people who texted last, pool check-in lines for the rest, no line twice | Ported to `engine/predraft.py` and `engine/conversation.py`, and fixed (below). Pool lines need `aire/follow-up/pools.py`, which arrives with PR 61; until then the server falls back to `out/text-queue.json` and `out/email-queue.json`. |
| Compose, channel switch, quick replies 👍 ❤️, lines, site link | Same. Photo attach and clipboard link dropped (phone apps do that better). |
| Exact-message final review before any send | Same (Send from Pipeline…). |
| Email send through the AIRE Gmail lane with receipt, duplicate refusal | Email goes through `engine/send.py` and the follow-up tool's Gmail sign-in, behind `--live-send` plus Approve. Duplicate refusal by fingerprint kept. Gmail receipt id not stored. |
| Text send through Messages (AppleScript), text receipts job proving it went out | Text handoff kept in `engine/send.py` (Mac only). The 10-second receipts LaunchAgent (`text_receipts.py`) is retired; a live send logs the touch on handoff, which Caleb approved for confirmed texts. On a phone, Open in Messages plus Mark sent. |
| Last_Touch write after a confirmed send, Called, It sent / It didn't | `crm.py touch` after a live send, after Mark sent, after Called. |
| Skip, Snooze 3 days, No reply needed, Undo 10 s | Same, undo window is 10 minutes. |
| Stage, note, Do Not Contact changes with preview token (`crm_bridge.py`, `touch_contact.py`, `touch_writeback.py`) | Dropped from the app. Use `crm.py stage|note|dnc` or the sheet. The brief limits the app to touch and done. |
| Record outcome or defer with a reason and revisit time | Replaced by Snooze 3 days. |
| Deals from the CRM with close countdown, passed-date warning, missing price, commission | Same. |
| Deals from Command, Transact, MLS browser captures with source comparison (`deal_sources.py`, `Data/*.json`) | Dropped. The CRM Deals tab is the record; `command_read.py` on the enrich branch keeps it filled. |
| Calendar (day, month, next appointment, local ideas, hide) | Dropped. No calendar in the feed. |
| Writing style memory (`WritingStyle.swift`, `style_history.py`) | Dropped. |
| Time-aware drafts (morning/afternoon wording refresh) | Dropped. Drafts are plain and short. |
| Private mode (hide names) | Same, the ◉ button. |
| Status and sources panel, stale capture labels | Counts tab and the status dot. Feed older than 2 hours is marked stale. |
| Lead monitor read-out of the speed-to-lead poller | Dropped. |
| Floating panel, menu bar icon, frame memory | Replaced by a PWA that installs on Mac, Windows, iPhone and Android. |
| Command reader (`command_read.py`) | Not part of the app; it lives with the engine on the enrich branch. |
| Fixture mode, self tests, Swift test suites | `tests/test_server.py` and `tests/proof.py`. |

## The predraft fix (2026-10-29)

`feed.log` showed `"drafted": 0, "failed": 3` then `4` on the last runs, with every surviving draft a leftover. Ollama was up. The cause, reproduced against the real conversations: hermes3 wrote "I'll", "I'm" and sentence openers like "Sure", and the old validator refused all of them ("adds an unapproved commitment", "states an unverified fact about Caleb", "introduces another name"), twice in a row, because the prompt never told the model those rules and the name check treated any capitalized word as a stranger's name. The port states every banned form in the prompt, quotes the exact refusal on retry, tries three times, trims a stray sign-off instead of failing, no longer reads a sentence-starting word as a name, asks for three candidate bodies per model call, and prints the refusal reasons (never names or text) in the log line so the next regression is visible.

Measured on the real feed on 2026-10-29 (10 people who texted last, 7 minute budget): the old code drafted 0 and failed 3 to 4. The port drafted 3 in both measured runs. Still refused: 5 and then 7 people, nearly all for first-person wording ("I'm", "my") and promises ("I'll") that hermes3 keeps writing despite the rules. Those people open with an empty box and their last three texts, which is the agreed fallback. Next lever if it matters: a stricter model or a one-line rewrite step, not a looser validator.
