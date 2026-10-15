---
name: mk-connect-tools-keys-and-connectors
description: Connects an outside service to Claude Code the way Nick Saraev does it, in order of preference: built-in connector, custom MCP connector URL, vendor CLI login, then raw API key stored as an environment variable (local and cloud). Use when Caleb says "hook up my CRM", "connect Follow Up Boss / kvCORE / ClickUp / Gmail / Quo / Higgsfield / Apify", "where do I put the API key", "Claude says it can't see my key", "the connector doesn't have a send tool", or when a routine needs access that only exists locally.
---

# Connecting tools: connectors, MCP URLs, CLIs, and API keys

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapters 3, 7, 8, 10, 11, 12, 14 (https://www.youtube.com/watch?v=yulWjh3rq28&t=474s, &t=6173s, &t=9308s, &t=11472s, &t=13381s, &t=14782s, &t=18595s)

## What Nick teaches

Nick's habit before every automation: check for the easiest integration path first.

### 1. Built-in connectors (easiest)
Settings -> Connectors -> browse. One click + OAuth login. Course examples: Gmail, Google Drive, Slack, ClickUp, Quo (formerly OpenPhone), Spotify. "If we have a pre-created connector, we one-shot connect to that."

Caveat found in ch. 14: the **Gmail connector exposed create/update draft but no send tool**. Nick had Claude research options and fell back to the **Gmail API with his own OAuth client**: Claude wrote an auth script, gave him a Google Cloud Console link to click, he logged in, and it sent a test email to himself. Later he had to add a **read scope** so the flow could check conversation history.

### 2. Custom connector (MCP URL)
When a vendor publishes an MCP server URL (Higgsfield "MCP and CLI" page, Apify "MCP configurator" on a scraper, Netlify remote MCP): copy the URL -> Settings -> Connectors -> Add custom connector -> name it -> paste URL (strip any `npx ...` wrapper, keep only the URL) -> Add -> it checks the connection and opens the vendor OAuth window. After connecting, Claude immediately "can see the MCP tools."

### 3. Vendor CLI
Higgsfield offered a CLI install snippet for Claude Code. Paste it, Claude installs the CLI globally, then you must **log in** (OAuth window). Nick: "Anytime there is a CLI option I highly recommend it. CLIs save a tremendous amount of time." It replaces fetching and pasting API keys.

### 4. Raw API key in environment variables
Used for OpenAI (GPT image 2) and Kit:
- Create the key in the vendor dashboard (OpenAI playground -> API keys -> Create new secret key. Kit -> Settings -> Developer -> V4 key). Copy immediately. It disappears.
- Claude -> environment button (Local) -> gear icon -> add `NAME=value`, e.g. `OPENAI_API_KEY=sk-...`, `KIT_API_KEY=...`. Any name works. Save.
- **Claude cannot see the key value** and won't even confirm it exists if you ask "what's my OpenAI key". That is deliberate prompt-injection protection. Tell Claude the exact variable name and have it make a harmless read-only call to verify.
- Keys added in a new chat may not be visible to an older thread. Start a new conversation after adding.
- For **routines**, add the same key to the **default cloud environment** (Routines -> new routine -> Cloud -> gear icon). "This default environment applies to all new sessions." Local keys never carry over.
- Rotate keys after demos.

### Other setup facts from the course
- SMS via **Quo** (OpenPhone) or **Twilio** requires an American business phone number and **A2P registration**. Expect 2 to 14 days and possible rejection.
- Form backend: **Formspree** (free) to make an HTML form actually email you.
- Lead data: **Apify** actors (Pipeline Labs lead finder, Apollo, ZoomInfo style) at roughly $1.50 to $1.80 per 1,000 leads as Nick quoted. Prices change.
- Hosting: **Netlify** free tier via its MCP. Claude can deploy and password-protect.
- Kit's MCP didn't cover what Nick needed, so he used the API key route. "it's not will I hit a bug, but when."

## Step by step

1. Ask: does Settings -> Connectors already list the tool? If yes, connect and verify with a read-only query.
2. If not, look on the vendor site for "MCP", "Claude", or "CLI". Prefer CLI, then custom connector URL.
3. If neither, create an API key, store it as an env var (local), tell Claude the variable name, and ask for a read-only test call.
4. Verify the connector actually has the write capability you need (send, create, update). If not, ask Claude "what are our options?" and pick the API route.
5. Before promoting to a routine, re-add the connector and env keys in the cloud environment and run a test.
6. Rotate any key you showed on screen or shared.

## Templates / prompts

Verify a key:
```
I added {{VAR_NAME}} to the local environment. You can't read its value and that's fine.
Make one harmless read-only call to the {{vendor}} API using that variable to confirm it works,
and tell me only success/failure plus the endpoint you used.
```

Capability check:
```
List every tool the {{connector}} connector exposes right now. Don't rely on memory, actually
check. Tell me whether it can {{send email / send SMS / update a record}}. If it can't, give me
three options ranked by setup time.
```

Env var format (local or cloud default environment):
```
OPENAI_API_KEY=sk-...
KIT_API_KEY=...
FUB_API_KEY=...
CLICKUP_USER=caleb@example.com
CLICKUP_PW=...
```

## Pitfalls Nick calls out

- Asking Claude for a key value gets a "no". That's a feature.
- Image file types from the web are often `.webp`. Convert to PNG before feeding to image APIs.
- Free ChatGPT plan blocks multi-image upload and API use. Nick had to buy Plus/Go for GPT image 2 testing.
- "I thought you could send from the Gmail connector. You can't (at that time)." Check tools, not assumptions.
- Credentials are 70% of maintenance problems (see `mk-self-healing-error-logging`).

## How Caleb should use this

- Inventory Caleb's stack (CRM such as Follow Up Boss or kvCORE, Gmail, Google Drive, Quo/Twilio, Metricool, Higgsfield, Slack) and record for each: connector / MCP / CLI / API key, where the key lives, and which routines use it. Keep that table in the AIRE repo without the secret values.
- Set up the cloud default environment once so every AIRE routine shares the same keys.
- Any new key creation or paid plan upgrade (ChatGPT Plus, Apify credits, Twilio number) **needs Caleb's approval before running**.
- Verify the CRM connector can write (update lead stage, add note) before building follow-up automations on it.

## Verification

- Read-only test call succeeds through the connector/key.
- Capability list shows the exact write tool needed.
- Same test succeeds from a cloud routine environment, not just locally.
