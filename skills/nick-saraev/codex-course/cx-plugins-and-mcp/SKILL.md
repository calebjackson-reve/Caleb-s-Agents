---
name: cx-plugins-and-mcp
description: Connects an AI coding agent to an external service the right way, first-party plugin or connector when one exists, otherwise a manually added MCP server (streamable HTTP), then verifies the connection in a fresh session with a harmless read and a harmless write. Use when Caleb says "connect my CRM", "hook up Gmail / Slack / ClickUp / Google Calendar", "is the MCP working", "it says the tool isn't available", or before any build that needs to read or change data in Follow Up Boss, KW Command, Metricool, Google Sheets or another SaaS.
---

# Plugins and MCP connections

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 2 plugins tour (https://www.youtube.com/watch?v=DJZISqryDfw&t=163s), chapter 7 Kit MCP (https://www.youtube.com/watch?v=DJZISqryDfw&t=5284s), chapter 8 ClickUp and Slack verification (https://www.youtube.com/watch?v=DJZISqryDfw&t=8338s)

## What Nick teaches

**Plugins** are the standard way to give the agent "the keys to your account" through OAuth: Netlify, GitHub, Slack, ClickUp, Notion, Dropbox, Asana, Linear, computer use, Chrome. Install from the plugins drawer, click authorize, done. Nick's security take in chapter 12: if you use plugins you are "almost entirely going to be fine," it is OAuth and enterprise grade. His disclaimer for Slack: you are giving it access to virtually every message you have ever sent.

**When no plugin exists (Kit newsletter):** search "<platform> MCP." Most platforms publish an MCP server. Add it manually: Plugins, MCP, Add MCP server, connect manually, streamable HTTP, paste the URL, save, authenticate. Nick's rule: "for situations where you just have the URL, always do the streamable one."

**Quirk:** the new MCP was not exposed in the session that was already open. He opened a new session, asked "what MCPs do we have access to," and saw Kit with 81 tools plus Netlify and others. Then proved it with a read: "pull the titles of my last 10 campaigns."

**Verify control before building (ClickUp):** "What can you do with ClickUp?" returned search, create, read, edit, send, start, stop, attach files. Then a harmless write: "update Team Offsite Logistics from Not Started to In Progress, in the Internal Ops folder, just verifying you have control." Checked in the ClickUp UI.

**Verify Slack with a loud test:** "Send me, Nick, a message. Make it long so it bumps all previous notes to self." The ID the knowledge base held for Nick was wrong, so the agent asked for his real Slack ID. Fix the ID in the knowledge base.

**Scope guard for demos:** "Only send messages to Nick over Slack. I don't want to message my whole team." Say this before giving write access.

**Credentials for apps you host yourself** (chapter 9): plugins will not work inside a deployed app. Ask the agent to create a `.env` file, paste keys there, never in chat and never hardcoded. The agent will read the file and may tell you to rotate the key since it saw it.

**Claude Code mapping:** connectors and MCP servers in settings play the plugin role. Add remote MCP servers by URL (streamable HTTP) and local ones by command. Deferred tools must be loaded by name before use. If a tool "is not available," start a new session and list tools.

## Step by step

1. Name the service and what the build needs: read only, or read and write.
2. Check for a first-party plugin or connector. Install, authorize.
3. If none, search "<service> MCP," add the server manually with streamable HTTP, authenticate.
4. Open a new session. Ask what tools are available for that service. Confirm it is listed with a tool count.
5. Run a harmless read (list 10 recent records).
6. Run a harmless, reversible write (change one status on a test record). Confirm in the service's UI. Revert if needed.
7. State scope limits in writing before any automation gets write access (which records, which people, which channels).
8. For self-hosted apps, put keys in `.env`, ask the agent to confirm it can read them, rotate if it was pasted anywhere visible.

## Templates / prompts

Capability probe:

```
What can you do with [service]? List read, create, update, delete and send capabilities you actually have in this session, not what the API supports in general.
```

Harmless write test:

```
Update [test record] from [status A] to [status B] in [folder/list]. Just verifying you have control. Tell me when done and I will check the UI.
```

Scope guard:

```
For this build only message [Caleb] over [Slack / email]. Never message anyone else, even if the knowledge base lists their contact. Confirm you understand before proceeding.
```

Manual MCP (Claude Code settings example):

```json
{
  "mcpServers": {
    "kit": { "type": "http", "url": "https://<service-mcp-url>" }
  }
}
```

`.env` pattern:

```
OPENAI_API_KEY=...
GOOGLE_CALENDAR_CREDENTIALS=./credentials.json
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
MODAL_TOKEN=...
```

## Pitfalls Nick calls out

- Expecting a newly added MCP to show in the current session. Open a new one.
- Building before proving control with a read and a write.
- Wrong user IDs in the knowledge base causing messages to go nowhere or to the wrong person.
- Pasting keys into chat or source files.
- Giving a demo system write access to the whole team.
- Assuming a plugin works inside an app you deploy elsewhere. It does not. Use API keys and OAuth clients there.

## How Caleb should use this

- CRM (Follow Up Boss, KW Command or whatever AIRE uses): plugin or MCP, then a read of 10 leads and a status change on a test lead.
- Gmail and Google Calendar connectors for follow-up drafts and showing scheduling. Drafts only until Caleb approves sending.
- Metricool for scheduling posts: connect, list scheduled posts, then create one as a review draft. Publishing needs Caleb's approval.
- Slack or SMS for pipeline nudges: scope to Caleb only until the team is onboarded.
- Any OAuth grant to a service holding client data is an approval decision for Caleb, not something to automate.

## Verification

- A new session lists the service's tools with a count.
- One read returned real records. One write changed a test record and was confirmed in the UI.
- Scope limits are written in the skill or automation prompt.
- No key appears in any file other than `.env`, and `.env` is gitignored.
