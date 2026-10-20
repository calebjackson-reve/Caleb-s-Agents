# Morning companion (runs on Caleb's Mac)

KW Command and ROAM MLS (Flex) have no API, so this part runs in Chrome on the Mac with Caleb signed in. Say this in the Mac's Claude Code session after the cloud brief lands (about 6:50 am), or schedule it there:

```
Run the morning companion. Use Claude in Chrome. Read only, change nothing.
1. Open ROAM MLS (Flex). For each of my saved searches, list listings that are new, back on market, or price changed since yesterday: address, price, beds/baths, DOM, and a one-line why it matters to a client on my hot or warm list.
2. Open KW Command. Opportunities: anything that moved stage, any task due today or overdue, any new note since yesterday. Contacts: any new contact added by the site or by me in the last day.
3. Write what changed into the CRM, which is the AIRE CRM Google Sheet through aire/crm/crm.py: a Pipeline row for any opportunity that moved stage, `python3 crm.py task "Name" "what" --due DATE` for any Command task due today or overdue, `python3 crm.py log "Name" "note"` for any new note. Then `python3 crm.py ingest && python3 crm.py pull` so the command center is current.
4. Append both sections to today's brief at aire/morning-run/briefs/YYYY-MM-DD.md under "MLS" and "COMMAND", commit and push to main.
5. Update the description of today's "AIRE Morning Brief" calendar event with the same two sections appended.
Do not post, send, or change anything in MLS or Command.
```

## The shortcut that removes the Mac from the MLS step
Flex can email saved-search alerts. If Caleb turns on daily email notifications for his saved searches in ROAM MLS (Flex, saved search settings, notifications, daily digest to aire@calebjackson.org), the cloud run reads them like any other email and the Mac companion only has to do Command. Needs Caleb to flip the setting once.
