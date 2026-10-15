---
name: cc-mcp-prototype-then-skill
description: Installs an MCP server (Chrome DevTools, ClickUp, Gmail or any tool with an MCP JSON snippet), uses it to prove a workflow quickly, measures its token cost with /context, and then converts the proven workflow into a token-cheap skill that calls the API directly, following Nick Saraev's prototype-with-MCP-then-skill method. Use when Caleb says "connect Claude to my CRM / Gmail / calendar", "install this MCP", "is there an MCP for X", "this MCP is eating my context", or "turn what we just did into a skill".
---

# MCP: Prototype Fast, Then Convert to a Skill

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 20, 25, 26 and 27 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=8396s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=10258s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=10695s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=11347s)

## What Nick teaches

Model Context Protocol servers are "skills other people make for you." A developer team wraps a piece of software in tool definitions and your agent calls them the same way it calls Bash or web search. Where to find them: mcpservers.org, modelcontextprotocol/servers, MCP Market, or search "[tool name] MCP server" since most vendors now publish setup instructions. Not all are safe, they are third-party code, but the popular ones are reasonably vetted.

The one he uses daily: Chrome DevTools MCP. It lets Claude control and inspect a live Chrome window: navigate, screenshot, extract page text, click, fill forms, run scripts. He finds it far faster than the Claude Chrome extension and weaves it into skills so Claude can run procedural browser tasks on sites with no API (his Amazon shopping skill, Upwork applying). Demo prompts: "Open and navigate to leftclick.ai, screenshot the site and tell me about it visually" and "Go to amazon.ca and find me cheap but effective light boxes for my studio."

Install method: every MCP page gives a JSON snippet with `mcpServers`, a server name, a command and args. Paste the snippet into Claude and say "I want to install this in my local workspace." Claude writes or updates the config (`.mcp.json` in `.claude/`). If the tool needs auth it asks you for an API key or runs an OAuth flow (ClickUp: copy the API token from ClickUp settings, choose the workspace. Gmail: upload the OAuth credentials file, then approve the Google consent screen). After installing any MCP you must start a new session for the tools to appear. Then test: "Do you have access to my ClickUp MCP? Create a new content idea called Claude Code course in my YouTube queue."

The cost lesson: after installing ClickUp, `/context` showed MCP tooling at almost 20,000 tokens, more than the built-in system tools. A single ClickUp search tool was 1,600 tokens. His whole skills folder was around 60 tokens per skill. Before typing a message he was at roughly 45,000 tokens, about a quarter of the window, and that quarter is the highest-quality part of the prompt. Tool search helps (when MCP definitions pass 10% of the window Claude searches tools on demand instead of loading all), but bloated servers still hurt.

His rule: use MCPs for convenience and to sketch whether something is possible. If it works the first time, say "take what you just did and convert it to a skill instead. Find the API endpoints and build a script so I don't have to use the bloated MCP tool." Keep only Chrome DevTools loaded permanently.

Worked example, Gmail labeling:

1. In the GUI with thinking on: "I want to organize my personal mailbox. Could you provide me a list of high ROI labels that tend to work well for personal mailboxes?" He picked an action-based scheme: Action Required, Waiting On, Reference.
2. "How do I use the Gmail MCP?" He found a GitHub repo for a Gmail MCP server, pasted it, followed the OAuth steps, restarted the session.
3. "Label my emails according to this scheme." 15 emails, then 100. Labels appeared in Gmail.
4. Convert: "This worked really well. Turn this into a skill called gmail_label. Call the Gmail API directly and do all this labeling instead of using MCP because skills are more token efficient. Check my other skills for the format and write scripts." After a short debugging loop and a Google auth approval, the skill fetched 100 emails in one second and fetched, classified and labeled 100 in 36 seconds (0.36 seconds per email), far faster than the MCP path.
5. He added "time yourself" to get instrumentation, and later parallelized it with subagents.

Plugins (chapter 27): `/plugins` opens customize and manage plugins. He has claude-mem (saves every message to a searchable memory). Anthropic's own directory includes front-end design (he was unimpressed, prefers his screenshot loop), Context7 (compresses API docs on demand, useful if you work with several APIs), code review, and others. Third-party marketplaces exist. He uses plugins little, vanilla Claude Code is enough, and he expects plugins to fold into skills.

## Step by step

1. Find the MCP page for the tool. Copy its JSON snippet.
2. Paste into Claude: "Install this MCP in my local workspace." Provide API keys or complete OAuth when asked. Keep keys out of CLAUDE.md.
3. Start a new session. Ask "Do you have access to the X MCP?" and run one small real task.
4. Run `/context`. Note the MCP tools figure.
5. If the workflow worked and will repeat: convert it to a skill with direct API scripts. Then remove or disable the MCP server from `.mcp.json`.
6. Keep Chrome DevTools MCP for sites without an API, and use it inside skills.

## Templates / prompts

Install:

```text
I want to install this MCP in my local workspace: [paste JSON snippet]. Tell me what credentials you need.
```

Convert to skill (cleaned from Nick's):

```text
This worked really well. Turn this into a skill called [name]. Call the [tool] API directly and do all of this instead of using the MCP, because skills are far more token efficient. Check my other skills for the format, write the scripts, and add timing instrumentation so I can see how long each step takes.
```

Caleb example, CRM:

```text
I want to install the [CRM] MCP in my local workspace: [snippet]. Then: list my last 20 leads, tag each as Buyer, Seller or Investor based on notes, and show me the proposed tags. Do not write back to the CRM until I approve.
```

## Pitfalls Nick calls out

- Forgetting to restart the session after installing. Tools will not show.
- Leaving every MCP installed. A quarter of the window gone before you type.
- Trusting unknown MCP servers blindly. Prefer vendor-published or well-known repos.
- Using the Chrome extension for procedural work. DevTools MCP is much faster.
- Expecting plugins to be required. They are not.

## How Caleb should use this

- Prototype CRM, Gmail, Google Calendar and Sheets connections with MCPs, then convert the repeated ones (weekly lead tagging, follow-up labeling, showing feedback requests) into skills.
- Chrome DevTools MCP for MLS or county assessor sites that have no API: pull property facts into a listing prep skill. Screenshot and extract only, no form submissions without approval.
- Email labeling for Caleb's inbox exactly like Nick's: Action Required, Waiting On, Reference, plus Showing Requests and Offers.
- Any step that writes to the CRM, sends email, or posts needs Caleb's approval before running.

## Verification

- A new session lists the MCP's tools and a small test call succeeds.
- `/context` before and after conversion shows MCP tool tokens dropping to near zero while the new skill costs under 100 tokens.
- The skill's direct-API scripts complete the same task faster than the MCP run (time it).
