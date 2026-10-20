# Directive: CRM enrichment

## Objective
Every person in the real AIRE CRM gets one honest label and a score from what they actually did: what they texted, emailed, and how they engage with Caleb's posts. Hidden leads surface. Phone-only rows get names. Caleb sees who he owes a reply.

## Inputs
iMessage database (read only), Gmail (read only), an engagers CSV from Caleb's own posts, the AIRE CRM sheet, the Hot-Warm-Cold sheet.

## Process
1. Dump contacts. Run the three signal scripts. Each writes one JSON file to `out/`.
2. Merge the Hot-Warm-Cold sheet as a practice run. Read conflicts. Caleb decides; the sheet with the dated reason usually wins.
3. Score and label every person deterministically. Write the practice report.
4. Haiku tags intent, timeline, area and one next-touch sentence for the hot, warm, active and hidden-lead rows only.
5. Caleb reads `enrichment-report.md`. Then `--write`.
6. Hot and warm leads flow to the follow-up cadence. Owes-reply and hidden leads go in the morning brief.

## Definition of done
Every CRM row has aire_label and signal_score in columns Z and AA, every hidden lead and every unanswered text is listed in the report, and nothing was sent to anyone.

## Safety
Read only until `--write`. The tool never rewrites columns A to Y, never adds a tab, never renames anything, never sends a message.
