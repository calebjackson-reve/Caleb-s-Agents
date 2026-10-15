---
name: aw-mcp-when-and-how
description: Decides when to use Model Context Protocol (MCP) servers versus execution scripts, connects an MCP (Gmail, ClickUp, Google Drive) by asking the agent to do the whole setup, builds a simple custom MCP server, and manages the context-window cost that MCP tools impose. Use when Caleb says "connect Gmail", "add an MCP", "why is my context full", "should I use MCP or a script", "build me a server for AIRE data", or when an AIRE integration (CRM, email, calendar, MLS vendor) needs a connection and the choice of method is open.
---

# MCP: When and How

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 19 and 20
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=9356s and &t=10405s), plus the ClickUp MCP in chapter
16 (&t=8306s)

## What Nick teaches

MCP is "USB-C for AI": a universal adapter introduced by Anthropic in November 2024 so any assistant
(Claude, GPT, Gemini) can connect to any data source. **Clients** are the apps housing the agent
(Antigravity, VS Code, Claude Desktop, ChatGPT). **Servers** wrap specific tools (Apify, Apollo,
Google Drive, Sheets). Servers expose three things: **resources** (documents, records), **tools**
(functions the agent calls, the analog of execution scripts) and **prompts** (guidance on how to use
the server). You can also build your own server and share it with a team or an audience.

**Why not MCP for everything:** tokens. Every MCP tool definition (name, description, schema) costs
a few hundred tokens and loads into context whether used or not. Five servers with ten tools each at
300 tokens is 15,000 tokens before you do anything. More context makes models dumber. Nick shows
research where accuracy drops from roughly 75% to 50 to 60% as input documents grow, plus
needle-in-a-haystack retrieval failures at long context. His `/context` check after adding Gmail and
a small custom server: 8.2% of the window on MCP tools, around 3,300 tokens for a five-tool server,
about half the used context. Also, every MCP tool response lands in context in full (a whole Drive
doc, 200 cells from a sheet), so you hit the ceiling fast and pay for it. And quality varies: many
servers were rushed to market, return bad errors or call APIs wrong. Perplexity's and n8n's are good
examples. "You could tell pretty quick."

**Nick's recommendation:** use MCP when it is hyper-standardized or a one-click thing, or when you
want to share a capability with others. Otherwise execution scripts are cheaper, more predictable
and keep context clean. A side lesson: shorter prompts are better prompts. His 47-word poem request
compressed to 22 words with the same information produces a statistically better poem.

**Connecting an MCP (Gmail demo):** "I want to set up a Gmail MCP so I can send emails on demand
from my address" plus the detail that it is a Google Workspace account. Then: "Let's do the Gmail
MCP. I want you to do everything you can for me." Models tend to give you instructions instead of
doing the work, so push them to do it. The agent found an existing OAuth setup elsewhere on his
machine, added the server to the Claude config, opened a sign-in, he authenticated, restarted Claude
Code, checked `/mcp`, and "send an email to ... saying what's up" worked. Directories like
mcpservers.org rank servers by quality. The ClickUp demo (chapter 16) followed the same path:
official MCP, API token, team id from the URL, restart, then "new lead Peter Rockwell" created the
record. Note that this MCP could not set custom fields, which is why Nick also built an API-script
version.

**Building a custom server:** "Create a simple custom MCP server whose sole job is to interact with
this website, www.leftclick.ai." The agent created an `mcp-servers/` folder, wrote the Python
server, a TOML for dependencies, registered it with Claude Code. Five tools came out (company
overview, services, booking link, case studies, site search). New instance, `/mcp` shows it, "tell
me about leftclick" calls it. Nick says he would only build one to share with others.

## Step by step

1. Ask: is this a one-click standard integration, or will it be shared? If no to both, build an
   execution script instead.
2. If MCP, pick a well-rated server (check a directory, prefer official ones).
3. Tell the agent to set it up end to end: install, config, OAuth. Say "do everything you can for me."
4. Complete the browser sign-in when prompted. Restart the agent. Confirm with `/mcp`.
5. Test one small action.
6. Run `/context`. If MCP tools eat a large share, move that capability to a script or isolate it in
   a sub-agent (see `aw-sub-agents`).
7. Re-authenticate when a token expires (Nick's Gmail MCP dropped auth after a demo and needed
   `/mcp` re-auth).

## Templates / prompts

```
I want to set up a Gmail MCP so I can send emails on demand from
caleb@<domain>. It's a Google Workspace account. Do everything you can for
me, including config and OAuth. Tell me only when you need me to sign in.
```

```
Create a simple custom MCP server whose sole job is to answer questions
about AIRE's listing data in resources/listings.json: get listing by
address, list active listings, get price history. Register it with Claude
Code and tell me how to restart.
```

```
/context
(then) MCP tools are using X% of my context. Which of these can we replace
with an execution script?
```

## Pitfalls Nick calls out

- Loading many MCP servers "just in case". Each one taxes every message.
- Trusting a server because it exists. Many are poor. Watch for bad errors and dumb behavior.
- Letting the agent hand you instructions instead of doing the setup.
- Pulling whole documents or sheets through MCP into context. Query narrowly or use a script that
  returns only what is needed.
- Forgetting re-auth. OAuth tokens expire or get reset by other demos.

## How Caleb should use this

- Gmail or Google Calendar via MCP is reasonable for ad hoc "send this" or "what's on Thursday"
  requests. Sending still needs Caleb's approval before running.
- CRM operations that run at volume (bulk tagging, imports) should be scripts, not MCP, to keep
  context clean and behavior fixed.
- Build a tiny custom MCP only if Caleb wants a teammate or assistant to query AIRE data from their own agent.
- Check `/context` when sessions feel slow or forgetful. Unload MCPs Caleb is not using that day.
- Any MCP or API with per-call cost (enrichment, MLS data vendor) needs usage caps and Caleb's
  approval for large runs.

## Verification

- `/mcp` lists the server as connected after restart.
- One test action succeeds (email arrives, record appears, query returns data).
- `/context` shows MCP tools at an acceptable share (Nick considered 8% for two small servers already heavy).
- A fresh session can call the server without reconfiguration.
