---
name: aw-cloud-webhook-deploy
description: Deploys a battle-tested execution script to the cloud (Modal in Nick's demo, trigger.dev as an alternative) as a webhook URL so external systems like a CRM, website form or n8n can trigger it without the agent or Caleb present, with secrets stored as encrypted cloud secrets and Slack logging for observability. Use when Caleb says "run this when a form comes in", "give me a webhook URL", "put this in the cloud", "trigger this from my CRM", "it needs to work when I'm at a showing", or when an AIRE workflow must respond to an event within moments, like a new website lead at 5:30pm.
---

# Cloud Webhook Deployment

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapter 32
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=16125s), with the event-driven motivation at the end
of chapter 31 (&t=15316s)

## What Nick teaches

"Cloudifying" a workflow means uploading only the execution scripts, the deterministic parts. **You
do not upload the orchestrator.** In your IDE you are around to course-correct, but at 3 a.m. with
full permissions, model variability is a liability. So the cloud version has no LLM in the loop. It
is an API you built quickly with an LLM, with server-side logic forcing one routing path every time:
node one, node two, node n. "The agent is the architect, the cloud workflow is the building." You
lose adaptation, self-annealing and clarifying questions, and get back traditional automation
behavior. That is acceptable because by deploy time the scripts have run dozens of times locally.
Nick tried putting the orchestrator in the cloud at a few real businesses and says "we're just not
there yet," maybe in a couple of years (he sketches `nicks-agent.com?run=lead_scraper` and
agent-to-agent ecosystems as the future).

**Platform.** Nick uses Modal (not affiliated). Serverless, pay per use, spins down to zero cost
when idle, solves both always-on cost and slow cold starts. Gives you a webhook URL like Make or n8n
would. Very cheap: he used about 3 to 4 cents of a $5 free credit in two to three weeks. Great docs,
so agents set it up themselves. trigger.dev is another option. Prices and credits may have changed.

**What a webhook is.** A URL that triggers your workflow when something hits it. A doorbell. A CRM,
website form, Make, n8n, your terminal, your browser or another agent can call it. The request body
is JSON (curly braces). You do not need to write JSON, just paste what the other service's docs show
and the agent matches it.

**What the agent does when you ask.** Reads `CLAUDE.md` (which should say "part of your job is
setting up cloud webhooks or scheduled workflows on Modal, here's how"), looks at the execution
scripts for the workflow, wraps them in Modal's format (decorators), asks for any API keys (usually
plug and play from `.env`), deploys, and returns a URL. Nick's system prompt also maintains a
`webhooks.json` registry listing every deployed webhook. Then in the triggering service, paste the
URL into its "webhook URL" field. Ask the agent "how do I set up ClickUp to call this webhook when a
new lead comes in" and it walks you through the UI.

**Secrets.** Uploading a secret to a server is inherent risk. Modal stores credentials as encrypted
secrets separate from code, loaded only when the webhook runs, the same separation as `.env`
locally. The agent will ask "this script needs your Apollo key, use what's in .env?" Say yes, no, or
give another.

**When to cloudify.** Scheduled workflows (daily report, weekly summary, recurring scrape) and
event-triggered ones (must act within moments of an inbound event). If it does not need to run when
you are away, keep it local, where you can watch it.

**Logging and monitoring.** Cloud deployments have no reasoning window. Your agent must explicitly
build logging into the code. Nick has a dedicated Slack channel for all cloud workflow updates:
every run posts success or failure. Shallow but enough to know when to say "this isn't working,
check what's going on." Prompt: "when you deploy to Modal, add logging that sends me a Slack message
every time it runs, here's my Slack webhook URL." Discord, email or SMS work too. He also asks "give
me a status check on all my Modal deployments" and the agent reads the logs via Modal's API. He
discourages building auto-self-fixing error loops for most people: the probability of a clean
autonomous fix is low and it is rarely the bottleneck.

**The demo.** Created a Modal account, generated a token (token secret on the right, paste into the
agent when asked). "I'd like to create a Modal webhook for create_proposal.md. Replicate that
functionality on the cloud and get me a webhook URL." The agent populated `webhooks.json`, deployed,
returned a URL and the expected request fields. "Run a brief example, then return the URL." The
proposal came back thin, so: "lengthen the paragraphs for benefits and solution statements, make it
more realistic, re-run the test." Much better. The IDE becomes the command center: "run this
workflow" and the agent calls its own webhook.

## Step by step

1. Confirm the workflow is battle-tested locally (ran many times, fresh-session cold start succeeds).
2. Add a Modal (or similar) section to `CLAUDE.md` describing the deploy process and the
   `webhooks.json` registry.
3. Create the cloud account and a token. Give the token to the agent when it asks.
4. Ask the agent to deploy the named directive's scripts as a webhook and return the URL plus request schema.
5. Approve secret usage from `.env` as it asks.
6. Ask it to run one test call and return the output. Iterate on quality.
7. Add Slack (or email) logging on every run.
8. Paste the webhook URL into the triggering service and send a real event.

## Templates / prompts

`CLAUDE.md` section:

```markdown
## Cloud deployment (Modal)
Part of your job is deploying execution scripts as Modal webhooks or
scheduled functions. Deploy only execution scripts, never the orchestrator.
Store credentials as Modal secrets, never in code. Add logging that posts
success/failure to the Slack webhook in .env (SLACK_LOG_WEBHOOK) on every
run. Register every deployment in webhooks.json with name, URL, expected
JSON body and date. Return the URL and example request after deploying.
```

Deploy prompt:

```
Create a Modal webhook for directives/new_lead_intake.md. Replicate the
deterministic parts: property lookup, CRM create, draft reply saved to a
Google Sheet row. No sending. Give me the webhook URL and the JSON body
it expects.
```

`webhooks.json` entry:

```json
{
  "name": "new_lead_intake",
  "url": "https://<account>--new-lead-intake.modal.run",
  "body": {"name": "", "email": "", "phone": "", "message": "", "source": ""},
  "deployed": "2026-10-15",
  "logs_to": "#aire-cloud-logs"
}
```

## Pitfalls Nick calls out

- Deploying the orchestrator. Variability unattended is a liability.
- Deploying before local battle-testing.
- Skipping logging. You will not know it failed.
- Hard-coding secrets or skipping the encrypted-secret step.
- Cloudifying things that do not need to run while you are away.
- Over-engineering self-healing loops in the cloud.

## How Caleb should use this

- Website or Zillow lead arrives after hours: webhook runs lookup, creates the CRM record, writes a
  draft reply to a queue, posts to Slack. Caleb approves and sends in the morning. Auto-sending
  needs Caleb's approval before it is ever enabled.
- CRM stage change to "under contract" triggers a checklist creation and a task list in the cloud.
- Open house sign-in app submits to a webhook that logs attendees and drafts thank-you notes.
- Costs: Modal usage is tiny but real, and any paid API inside the script (enrichment) is charged
  per trigger. Set caps and get Caleb's approval before going live.
- Secrets in the cloud are a real risk. Use scoped keys where the vendor allows.

## Verification

- The webhook URL responds to a test POST with the expected JSON and returns a result.
- A Slack message appears for the test run.
- `webhooks.json` lists the deployment.
- Triggering from the real external service (form, CRM) produces the same result as the local run.
