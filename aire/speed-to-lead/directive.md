# Directive: speed to lead (Luxury Presence website inquiries)

## Objective
Reply to every new website inquiry within 60 seconds by email and text, in Caleb's voice, promising a call, so the lead is reached while they are still on the site.

## Inputs
- Gmail inbox aire@calebjackson.org, unread messages from noreply@luxurypresence.com with subject beginning "⭐️ New Lead".
- templates.md in this folder.
- processed.json (email addresses already handled).

## Process
1. Every 60 seconds list matching unread messages.
2. For each, parse: first name, full name, email, phone, request type (Home Valuation, Contact, Showing), received timestamp.
3. If email is in processed.json, mark read and skip. The "Property Value Request" twin email is always skipped.
4. Pick the template by request type. Fill {{firstName}} and {{requestPhrase}} only. Never generate free text beyond those slots.
5. Quiet hours: if received between 8 pm and 8 am America/Chicago, use the morning variant for email and queue the text for 8 am.
6. Send email from aire@calebjackson.org. Then send text from the business number. Both must carry Caleb's name and Keller Williams First Choice.
7. Append {email, name, received_at, sent_at, seconds_to_reply, channel} to log.csv and the email to processed.json. Mark the message read.
8. On any error, retry once after 30 seconds, then write errors.log and continue with the next lead.

## Definition of done
Every new lead has exactly one email and at most one text in log.csv, with seconds_to_reply under 90, and no address appears twice.

## Safety
- DRY_RUN=true by default. In dry run, write what would be sent to dry-run.log and send nothing.
- Never send to Caleb's own test addresses listed in templates.md.
- Never send outside the templates. Never send twice to the same address. Never send to a number that replied STOP.
