---
name: aw-scheduled-deploy
description: Deploys an execution script as a scheduled cloud function (cron on Modal) so recurring work like a daily lead pull, a Monday 9am report or a 5-minute check runs on its own, described in plain language with the agent handling the cron syntax and deployment. Use when Caleb says "run this every morning", "every Monday at 9", "check this every 15 minutes", "I keep forgetting to post the weekly update", "schedule it", or when an AIRE task is recurring and does not depend on an inbound event.
---

# Scheduled Deployment

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapter 33
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=17451s), with cron context from chapter 32
(&t=16125s) and the forgotten weekly post story from chapter 24 (&t=12806s)

## What Nick teaches

Scheduled triggers are the second way to run workflows without you. Instead of a webhook waiting for
an event, the function runs on a schedule using cron, which Modal and the agents support natively.
You never write cron yourself. "You just describe when you want something to run. It'll handle all
the syntax and deployment details." Any timing works: every minute, hour, day, year. "Like setting a
recurring calendar reminder, but for your workflows."

Example prompt from chapter 32: "I want my weekly workflow report to run automatically every Monday
at 9:00 a.m." The agent sets up the cron, deploys to Modal, done.

**The demo.** "Could you send a welcome email to nick@... every 5 minutes, and set up a Modal cloud
scheduled trigger to do this automatically." The agent checked for an existing scheduled-function
pattern, found none, added a scheduled welcome email function, deployed. Modal's dashboard shows the
function with a clock icon, "every 5 minutes UTC," the next run countdown, and a "run now" button to
fire between schedules. First run: about 3 seconds of server start plus 1.47 seconds to send. A
later run on a warm container: 0 ms startup and under a second. The email arrived. Because the cloud
function is just a Python script with no directive and no LLM, it executes nearly instantly and
there is no round trip to a model provider.

Updating the content is a chat message: "change this so it's a welcome email from X to Y," or hand
it a template.

Why this matters: his own example of forgetting a weekly community post three weeks in a row,
refunding people, then automating it in 3 minutes with a schedule timer. Combined with webhooks and
the CRM wrapper, you get end-to-end flows: a prospect moving to "send proposal" in the CRM fires a
webhook, a schedule sends the weekly digest, and the URLs can be shared across the organization.

Same rules as webhooks: only deterministic scripts go to the cloud, secrets become encrypted cloud
secrets, and every run should log to Slack or email so you know it happened. Times are UTC on Modal
by default, so state your local time zone.

## Step by step

1. Pick a workflow whose scripts are battle-tested locally and that recurs on a fixed cadence.
2. Describe the schedule in plain words with the time zone ("every weekday at 7:30am Central").
3. Ask the agent to deploy it as a Modal scheduled function, with Slack logging on each run.
4. Approve secrets from `.env` when asked.
5. Open the Modal dashboard, confirm the schedule and next run, click "run now" for an immediate test.
6. Check the output (email, sheet, Slack message).
7. Register it in `webhooks.json` or a `schedules.json` with name, cadence and what it produces.

## Templates / prompts

```
Set up a Modal scheduled function that runs execution/pull_new_listings.py
for East Baton Rouge and West Feliciana parishes every weekday at 7:30am
Central, writes results to the "New Listings" tab of my Google Sheet, and
posts a one-line summary to my Slack log channel. Deploy it and show me
the schedule.
```

```
Change the Monday report schedule to 8:00am Central and add the
pending-transactions count to the summary.
```

`schedules.json` entry:

```json
{
  "name": "weekly_client_update_draft",
  "cadence": "Mondays 8:00 America/Chicago",
  "script": "execution/build_weekly_client_updates.py",
  "output": "tmp/weekly_updates/ + Slack summary",
  "sends_externally": false
}
```

## Pitfalls Nick calls out

- Writing cron by hand. Let the agent do it.
- Forgetting UTC. Say your time zone.
- Scheduling an LLM-in-the-loop workflow. Only scripts go in the cloud.
- No logging. A silent schedule that stopped is worse than none.
- Scheduling things that do not need to run while you are away.

## How Caleb should use this

- Daily 7:30am pull of new listings, price drops and expireds in Caleb's farm areas into a sheet
  with a Slack summary.
- Monday morning draft of weekly client updates for active buyers and sellers. Drafts only, sending
  needs Caleb's approval before running.
- Every 15 minutes: check the lead inbox and CRM for untouched leads older than 2 hours and ping Caleb.
- Monthly market stats build for St. Francisville and Baton Rouge content.
- Any schedule that calls a paid data API runs up a bill on its own. Cap it and get Caleb's approval
  before deploying.

## Verification

- Modal dashboard shows the function with the expected cadence and a next-run time.
- "Run now" produces the output and a Slack log line.
- The first natural scheduled run arrives at the right local time.
- Stopping the schedule (ask the agent to pause it) stops the log messages.
