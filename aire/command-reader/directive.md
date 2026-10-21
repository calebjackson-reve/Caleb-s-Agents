# Directive: the Command reader

## Objective
KW Command stays logged in on Caleb's Mac and gets read every hour without Caleb touching it. Whatever changed (opportunities that moved, tasks due, new notes, new contacts) lands in the AIRE CRM through the engine's gates, tagged `command`, so Pipeline shows it. Caleb never opens Command to find out what moved.

## Why a browser and not an API
KW Command has no public API (KW documentation, read 2026-10-16). The only reader that works is a browser that is logged in as Caleb. This is Caleb's own account, read only. Not an approved KW integration, so a page change breaks it loudly, never silently.

## How it stays logged in
1. A dedicated Chrome profile at `~/.aire/chrome-aire`, used only by the reader. Caleb logs in there once by hand. Cookies live in that profile, not in his daily browser, so clearing history or a Chrome update on his main profile never logs the reader out.
2. A heartbeat every 30 minutes (LaunchAgent `org.calebjackson.aire.command`): open Command, confirm the signed-in home page, close. Visiting keeps the session cookie fresh. Command sessions last weeks when visited; they die when idle.
3. When the heartbeat lands on the login page instead: the reader signs back in. Password from the macOS Keychain (item `aire-command`, never in a file). If Command asks for the emailed code, the reader waits for the next "KW Authentication Code Verification" email in Gmail (read only, the same token the ingest uses), takes the six digit code, enters it. If that fails twice, it stops, writes `login needed` to the feed, and Pipeline shows one line: "Command needs a login." Caleb signs in once in the AIRE profile and it resumes.
4. The Mac must not sleep (Energy settings, or caffeinate, or a Mac mini on a shelf).

## What it reads, every hour, read only
- Opportunities: name, stage, last changed. A stage change becomes a Deals update and a note on the person.
- Tasks due today or overdue: each becomes a Tasks row by person_id (idempotent on the task text).
- Notes added since the last run: each becomes a Notes row.
- Contacts added since the last run: matched by phone or email first; a true unknown becomes a new contact with Source "KW Command".
Every write goes through `crm.py --client command`. Nothing is written when the read is partial.

## Definition of done
The Connector Log shows `command` client writes every hour, the heartbeat log shows `ok` every 30 minutes, and a forced logout recovers without Caleb inside one heartbeat.

## Safety
- Read only in Command. The reader never clicks save, send, delete or any button that is not navigation.
- Password in Keychain only. Auth codes read from Gmail, never stored.
- Page snapshots in `out/` are git-ignored and hold client names.
- If the page shape changes, the reader raises, logs `layout changed`, writes nothing, and Pipeline shows it.
