# Directive: speed to lead (Luxury Presence website inquiries)

## Objective
Reply to every new website inquiry within 60 seconds by email and text, in Caleb's voice, promising a call, so the lead is reached while they are still on the site.

## Inputs
- Runs on Caleb's Mac. Gmail inbox aire@calebjackson.org, unread messages from noreply@luxurypresence.com with subject beginning "⭐️ New Lead".
- templates.md in this folder.
- processed.json (email addresses already handled).

## Process
1. Every 60 seconds list matching unread messages.
2. For each, parse: first name, full name, email, phone, request type (Home Valuation, Contact, Showing), received timestamp.
3. If email is in processed.json, mark read and skip. The "Property Value Request" twin email is always skipped.
4. Pick the template by request type. Fill {{firstName}} and {{requestPhrase}} only. Never generate free text beyond those slots.
5. Quiet hours: if received between 8 pm and 8 am America/Chicago, use the morning variant for email and queue the text for 8 am.
6. Send email from aire@calebjackson.org. Then send the text from Caleb's own number (225) 747-0303 through the Messages app on the Mac (AppleScript to Messages, iMessage or SMS whichever the recipient supports). Both must carry Caleb's name and Keller Williams First Choice.
7. Append {email, name, received_at, sent_at, seconds_to_reply, channel} to log.csv and the email to processed.json. Mark the message read.
8. On any error, retry once after 30 seconds, then write errors.log and continue with the next lead.

## Definition of done
Every new lead has exactly one email and at most one text in log.csv, with seconds_to_reply under 90, and no address appears twice.

## Runner
`speed_to_lead.py` in this folder. Gmail over IMAP and SMTP with an app password in `.env`, texts through the Messages app by AppleScript. `install.sh` does the dry run, asks for the word LIVE, then installs a launchd job that keeps it running. Offline tests: `test_speed_to_lead.py`.

## Lead types
Home Valuation, Contact and Showing get the call-promise email and, in daytime, the text. Google Sign On gets the lighter sign-in email and no text. Anything else is treated as Contact.

## Safety
- DRY_RUN by default, LIVE only when the launchd job sets LIVE=1. In dry run, write what would be sent to dry-run.log and send nothing.
- Never send to Caleb's own test addresses listed in templates.md.
- Never send outside the templates. Never send twice to the same address. Never send to a number that replied STOP.
