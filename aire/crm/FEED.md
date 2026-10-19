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
  "counts": {
    "contacts": 3626,
    "touches_due": 1641,
    "by_band": {"HOT": 116, "WARM": 46, "NURTURE": 524, "DORMANT": 955},
    "tasks_open": 0,
    "tasks_overdue": 0,
    "deals_live": 0
  },
  "touches_due": [
    {"person_id": "247", "display": "Paul Brown", "band": "HOT", "phone": "+12259787026", "email": "",
     "days_quiet": 9, "last_touch": "2026-10-10", "next_action": "Confirm counter reached Bridgette Hardy",
     "stage": "past client", "opportunity_types": "mover"}
  ],
  "tasks": [
    {"task_id": "a1b2c3d4", "person_id": "247", "display": "Paul Brown", "task": "Sign BBA", "due": "2026-10-19",
     "status": "open", "source": "Authentisign", "created_at": "2026-10-19T07:00:00-05:00", "done_at": "", "overdue": false},
    {"task_id": "", "person_id": "85", "display": "Brock Giddens", "task": "Call: short-sale plan", "due": "2026-10-19",
     "status": "open", "source": "Next_Action", "band": "HOT", "overdue": false}
  ],
  "deals": [
    {"deal_id": "2179-s-turnberry-ave", "person_id": "", "display": "", "address": "2179 S Turnberry Ave", "side": "listing",
     "stage": "active", "price": "", "expected_close": "", "next_step": "", "last_event": "showing confirmed Mon, 10/19 2:30 PM",
     "last_event_at": "2026-10-19T08:08:40-05:00", "source": "ShowingTime", "updated_at": "2026-10-19T17:36:50-05:00"}
  ],
  "new_leads": [
    {"person_id": "7229", "display": "Boubkeur Barakate", "phone": "", "email": "boubkeur1@gmail.com",
     "source": "Luxury Presence 2026-10-18", "received": "2026-10-18", "next_action": "Call within the hour"}
  ],
  "cadence_days": {"HOT": 7, "WARM": 14, "NURTURE": 90, "DORMANT": 365}
}
```

Field notes:

- `header_ok` false means the live Contacts header lost a column this tool needs. The app should show that and nothing else, because the rest cannot be trusted.
- `touches_due` is sorted HOT first, then by the longest silence. `days_quiet` is an integer, or `null` when the sheet has no Last_Touch for that person ("never logged").
- `tasks` mixes two kinds. Rows with a `task_id` are in the Tasks tab and can be closed with `crm.py done`. Rows with an empty `task_id` and `source` `Next_Action` are derived from the Contacts Next_Action column and have not been written to the Tasks tab yet; `crm.py sync-tasks` turns them into real rows. Sorted by due date, `overdue` is a boolean.
- `deals` are Deals rows whose stage is not closed or lost. A deal from Authentisign with no address in the document name uses the document name as its address and stage `unknown`.
- `new_leads` are contacts with Stage `new lead` whose Source carries a date in the last 14 days.

Actions the app can send back, each one a shell call that goes through the write gates and the audit:

| In the app | Command |
|---|---|
| "Touched" on a person | `python3 crm.py touch <person_id> "<what happened>"` |
| "Done" on a task with a task_id | `python3 crm.py done <task_id>` |
| "Done" on a Next_Action item | `python3 crm.py sync-tasks` first, then `done` on the new id, or edit Next_Action in the sheet |
| New task | `python3 crm.py task <person_id> "<task>" --due YYYY-MM-DD` |
| Refresh | `python3 crm.py ingest && python3 crm.py feed` |
