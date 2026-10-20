# Directive: the CRM engine

## Objective
Caleb opens the Pipeline app on his Mac and sees who is due a touch, what he owes, and what moved on each deal, all from the one AIRE CRM sheet, without typing what Gmail already told him. Follow Up Boss behavior on the tools he already pays for, in the one database he already has.

## Inputs
- The AIRE CRM Google Sheet `1w9izcliqmXlFR3_O3dnP2G5SGfCrua7mrCLCE7cdoDc`: Contacts, Notes, Connector Log, and the Tasks and Deals tabs this tool adds when missing.
- Gmail on aire@calebjackson.org, read only: Luxury Presence lead emails, ShowingTime, Authentisign.
- The Mac's `~/aire/crm/execution` scripts and the Pipeline app, which share the sheet. The write gates are theirs.

## Process
1. `check`: read the live Contacts header. Stop if a column is missing.
2. `ingest`: read the three senders from Gmail. Match each lead by email, phone, then exact name before creating anyone. Showings and signatures become Deals rows and Notes. A signature Caleb owes becomes a task; "Signing complete" closes it.
3. `sync-tasks`: one Tasks row per hot or warm contact with a Next_Action, due today for hot and in three days for warm.
4. `feed`: write feed.json for the Pipeline app. Touches due by band cadence, open tasks, live deals, new leads. Pass `--signals ../enrichment/out/enriched.csv` when the enrichment has run, so the iMessage record ranks first.
5. Caleb acts in the app. Each action is a `touch`, `task` or `done` call that moves Last_Touch or closes a task, audited.
6. The morning brief reads the same feed, so the brief and the app never disagree.

## Definition of done
Every website lead of the last 72 hours is a contact with a note. Every open signature Caleb owes is a task. Every live deal shows its last event. feed.json is fresh and `header_ok` is true. Nothing was renamed and no second copy of a contact exists anywhere.

## Safety
- Gmail read only. This engine never sends anything.
- Writes by person_id only. Do_Not_Contact never goes back to NO. Command_ID is never written. Every write is in audit.jsonl and the Connector Log.
- `--dry-run` before any first run on the live sheet. The Hot-Warm-Cold merge is dry run only until Caleb says yes to the report.
- No web UI. No second CRM. No sheet is renamed.
