---
name: cc-modal-deploy-endpoint
description: Deploys a script, skill or small web form to a public URL on Modal from Claude Code, so a workflow can be triggered by a browser visit, a webhook, or a no-code tool like n8n, Make or Zapier, following Nick Saraev's birthday-check and scrape-leads-as-a-URL demos. Use when Caleb says "put this skill online", "give me a URL that runs this", "I need a webhook for my CRM / Zapier", "make a form that triggers the lead scrape", or wants a backend endpoint for AIRE.
---

# Deploying Endpoints and Skills with Modal

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 34 and 35 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=14554s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=14588s)

## What Nick teaches

Netlify works well for static sites and the proposal app. For backend functions, skills and scripts you want the analogous thing: a service that gives you a publicly accessible URL that runs your code. His favorite is Modal ("AI infrastructure that developers love"). Applications talk to each other through webhooks, URLs that send and receive events, so once your workflow lives at a URL you can plug it into n8n, Make.com, Zapier, Lindy, your own apps, ad campaign visit logging, or just hand the link to a person.

Pricing as he described it: $5 free credit on signup, up to $30 with onboarding tasks like adding a card. After months with an API request every day or two he was still at about $4.50 of credit. He finds it far cheaper than Make or n8n for what he does. (Figures may have changed.)

Setup:

1. Sign up at Modal (he used Continue with Google), pick Personal, finish onboarding.
2. In the dashboard create a new API token (New token, name it) and copy it.
3. Paste the token into Claude Code. His CLAUDE.md contains instructions so that giving Claude a new token is enough for it to configure the Modal CLI and deploy. (He said he would include that CLAUDE.md below the video.) This works on any account, he showed deploying from a second account the same way.

Demo one, the birthday endpoint: in bypass mode, "Deploy a simple API endpoint that returns Happy Birthday Nick if it's my birthday or No birthday today if it's not." Claude deployed a URL like `nicholassaraev--birthday-check-check-birthday.modal.run` with authorization. He pasted the curl command into his terminal and got the JSON back. Then: "This is awesome. Remove the authentication. I want to be able to access this with my browser using a simple GET, and have a cute little happy birthday or no birthday message." Reload in the browser, it is now a tiny website. His point: an endpoint and a website are the same thing, one message turns code into something publicly reachable.

Demo two, a skill behind a URL: he copied his `scrape-leads` skill into the Modal project under `.claude/skills/scrape-leads` and prompted: "Put the scrape-leads workflow online. I want to access it via a simple URL. When I open it a little form pops up asking what I want to scrape. I fill out the form, you execute the scrape-leads workflow and return me the leads in a CSV file when it's done." Under two minutes later he had a URL with a form (query: dentist, location: United States, results: 100), ran it, waited a few minutes, and the CSV `leads_dentist_100.csv` downloaded automatically with 100 leads and their data.

## Step by step

1. Create the Modal account and API token. Store the token in `.env` or `settings.local.json`, never CLAUDE.md.
2. Add the Modal deploy instructions to the project CLAUDE.md (template below) so Claude knows how to configure and deploy with a fresh token.
3. Start small: deploy a hello endpoint, curl it, open it in the browser. Decide whether it needs auth. Public listing-info endpoints can be open, anything touching leads should keep a token.
4. Copy the skill folder into the project under `.claude/skills/`.
5. Prompt: put the skill online with a form (or a webhook that accepts JSON), run the workflow, return the result (CSV, JSON, or a page).
6. Test from the browser and from the tool that will call it (n8n, Zapier, the CRM webhook settings).
7. Watch the Modal dashboard for credit usage after the first few runs.

## Templates / prompts

CLAUDE.md section:

```markdown
## Modal deployment
- Backend functions and skill endpoints deploy to Modal. The token lives in .env as MODAL_TOKEN_ID / MODAL_TOKEN_SECRET. When given a new token, configure the Modal CLI with it, never print it.
- Each endpoint is a Python function with a web endpoint decorator in app.py. Deploy with the Modal CLI and report the public URL.
- Default to token auth on anything that reads or writes lead or client data. Public GET only for harmless info pages.
- Long-running jobs return a job id immediately and a download link when done.
```

Hello endpoint:

```text
Deploy a simple API endpoint on Modal that returns "Open house this Saturday 1-3pm at [address]" if today is Saturday, otherwise "No open house today". Give me the curl command and the browser URL.
```

Skill behind a URL (Caleb version):

```text
Put the investor-outreach-list skill online on Modal. When I open the URL, show a short form: parish, property type, number of results. On submit, run the skill and return a CSV download when it's done. Keep token auth on this URL. Show me the URL and the token to use.
```

Webhook for a no-code tool:

```text
Create a Modal webhook endpoint that accepts a JSON POST from my CRM with {name, email, phone, source}. Save it to Supabase table leads and return {ok: true}. Give me the URL to paste into the CRM webhook settings.
```

## Pitfalls Nick calls out

- Posting the token on screen. Delete and rotate if it leaks.
- Leaving auth on when you need a browser-openable link, or removing it on something that handles data.
- Treating the free credit as unlimited. Check the dashboard.

## How Caleb should use this

- Lead intake webhook: open house sign-in form or website form posts to Modal, which writes to Supabase and the CRM.
- A URL that runs the investor or FSBO scrape skill on demand and returns a CSV for cold outreach lists.
- A tiny public endpoint for "is there an open house today" that a sign QR code can point to.
- Any endpoint that writes to the CRM, sends messages, or costs credits (scrapers, paid APIs) needs Caleb's approval before deploying, and public URLs should be non-obvious.

## Verification

- The curl command returns the expected JSON and the browser URL renders when auth is removed.
- The form submits, the workflow runs, and the CSV downloads with the expected rows.
- Modal dashboard shows the deployment and credit usage after the test run.
- No token appears in CLAUDE.md or committed files.
