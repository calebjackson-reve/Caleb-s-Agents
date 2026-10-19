# Directive: the CRM

## Objective
One place that knows every person, every deal, every touch and every task, so Caleb never has to remember who he owes a call. Follow Up Boss behavior on the tools he already pays for.

## Inputs
- The AIRE CRM Google Sheet (Contacts, Pipeline, Activity, Tasks, Leads).
- Gmail, read only: Luxury Presence lead emails, ShowingTime, Authentisign.
- KW Command, through the Mac companion in Chrome, for anything that only lives there.

## Process
1. New lead email arrives. `ingest` creates a Leads row and, if the person is unknown, a HOT contact with next action "Call within the hour". Speed to lead drafts the reply. Caleb calls.
2. Every call, text, note or showing is one Activity row. Logging a touch moves last_touch_iso forward.
3. `due` lists who has gone quiet past their tier's cadence. The command center shows it, the morning brief says it.
4. Tasks come from Caleb's "Next action" column, from Authentisign signature requests, and from Caleb typing `crm.py task`. Done is done in the sheet, never a second list.
5. Pipeline rows carry the deal. Close dates inside 14 days are flagged everywhere.
6. The follow-up tool reads its contacts from the sheet via `export-followup`. Same stages, same cadence seed.

## Definition of done
Every contact has a stage and an id, every website lead of the last 72 hours is a Leads row, every open task is in Tasks, the command center and the morning brief read the same numbers.

## Safety
- Gmail read only. The CRM never sends anything.
- The tool writes only its own columns on Contacts.
- Nothing about a client leaves the sheet, the Mac and the private repo.
