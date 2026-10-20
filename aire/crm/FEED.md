# feed.json, the data feed for the Pipeline app

`python3 crm.py feed` writes `aire/crm/feed.json`. The native Mac Pipeline app reads this file and shows it. Nothing else reads it, and nothing in this folder draws a screen. Codex wires the Pipeline side.

Every value is a string unless noted. Dates are `YYYY-MM-DD`, timestamps are ISO 8601 with the Central offset. `person_id` is the CRM's own id and is the key for every action the app sends back (`crm.py touch`, `crm.py done`).

```json
{
  "generated_at": "2026-10-19T17:36:50-05:00",
  "as_of": "2026-10-19",
  "sheet_id": "1w9izcliqmXlFR3_O3dnP2G5SGfCrua7mrCLCE7cdoDc",
  "header_ok": true,
  "missing_columns": [],
  "signals": {"file": "../enrichment/out/enriched.csv", "people": 1210, "owes_reply": 37},
  "counts": {
    "contacts": 3626,
    "touches_due": 1641,
    "by_band": {"hot": 116, "warm": 46, "lukewarm": 0, "cold": 524, "ice-cold": 955},
    "tasks_open": 0,
    "tasks_overdue": 0,
    "deals_live": 0
  },
  "touches_due": [
    {"person_id": "247", "display": "Taylor Sample", "band": "hot", "phone": "+12255550142", "email": "",
     "days_quiet": 3, "last_touch": "2026-10-10", "last_inbound": "2026-10-16", "last_outbound": "2026-10-14",
     "owes_reply": true, "signal_score": 80, "next_action": "Confirm counter reached the other agent",
     "stage": "past client", "opportunity_types": "mover"}
  ],
  "tasks": [
    {"task_id": "a1b2c3d4", "person_id": "247", "display": "Taylor Sample", "task": "Sign BBA", "due": "2026-10-19",
     "status": "open", "source": "Authentisign", "created_at": "2026-10-19T07:00:00-05:00", "done_at": "", "overdue": false},
    {"task_id": "", "person_id": "85", "display": "Jordan Sample", "task": "Call: short-sale plan", "due": "2026-10-19",
     "status": "open", "source": "Next_Action", "band": "hot", "overdue": false}
  ],
  "deals": [
    {"deal_id": "2179-s-turnberry-ave", "person_id": "", "display": "", "address": "2179 S Turnberry Ave", "side": "listing",
     "stage": "active", "price": "", "expected_close": "", "next_step": "", "last_event": "showing confirmed Mon, 10/19 2:30 PM",
     "last_event_at": "2026-10-19T08:08:40-05:00", "source": "ShowingTime", "updated_at": "2026-10-19T17:36:50-05:00"}
  ],
  "new_leads": [
    {"person_id": "7229", "display": "Sam Newlead", "phone": "", "email": "sam.newlead@example.com",
     "source": "Luxury Presence 2026-10-18", "received": "2026-10-18", "next_action": "Call within the hour"}
  ],
  "cadence_days": {"hot": 7, "warm": 14, "lukewarm": 30, "cold": 90, "ice-cold": 365}
}
```

Field notes:

- `header_ok` false means the live Contacts header lost a column this tool needs. The app should show that and nothing else, because the rest cannot be trusted.
- `band` is the five-step scale: hot, warm, lukewarm, cold, ice-cold. Legacy sheet values (HOT, WARM, NURTURE, DORMANT) are mapped on read.
- `signals` says whether the feed was built with `--signals` (the enrichment's `enriched.csv` or `imessage-signals.json`): the file, how many people had a message record, and how many owe a reply. `file` is empty when the feed ran on the sheet alone.
- `touches_due` is sorted by `owes_reply` first (they texted last and Caleb has not answered), then hot first, then `signal_score`, then the longest silence. `days_quiet` is an integer, or `null` when neither the sheet nor the messages have a date for that person ("never logged"). With signals, `days_quiet` counts from the newest of Last_Touch, `last_inbound` and `last_outbound`, and `band` is the enrichment label when there is one. `owes_reply` is a boolean, `signal_score` an integer (0 without signals). `last_messages` is the last three inbound texts from that person as `"YYYY-MM-DD: text"` strings (only when the signals file is `imessage-signals.json`; empty otherwise). The Pipeline app shows them above the compose box so Caleb replies to what was actually said. feed.json stays on the Mac.
- `tasks` mixes two kinds. Rows with a `task_id` are in the Tasks tab and can be closed with `crm.py done`. Rows with an empty `task_id` and `source` `Next_Action` are derived from the Contacts Next_Action column and have not been written to the Tasks tab yet; `crm.py sync-tasks` turns them into real rows. Sorted by due date, `overdue` is a boolean.
- `deals` are Deals rows whose stage is not closed or lost. Every deal has a real street address. An Authentisign document with no address in its name never becomes a deal: it lands as a note on the signer when the CRM knows them, or as an `unmatched_authentisign` line in the Connector Log.
- `new_leads` are contacts with Stage `new lead` whose Source carries a date in the last 14 days.

Actions the app can send back, each one a shell call that goes through the write gates and the audit:

| In the app | Command |
|---|---|
| "Touched" on a person | `python3 crm.py touch <person_id> "<what happened>"` |
| "Done" on a task with a task_id | `python3 crm.py done <task_id>` |
| "Done" on a Next_Action item | `python3 crm.py sync-tasks` first, then `done` on the new id, or edit Next_Action in the sheet |
| New task | `python3 crm.py task <person_id> "<task>" --due YYYY-MM-DD` |
| Refresh | `python3 crm.py ingest && python3 crm.py feed` |
