---
name: aw-workspace-setup
description: Sets up a DOE agent workspace from scratch in an IDE (VS Code, Antigravity, Cursor) with the directives and execution folders, a .env for secrets, tmp and resources folders, and identical system prompt files (CLAUDE.md, AGENTS.md, GEMINI.md) so any model can run it. Use when Caleb says "set up a new workspace", "start a fresh project for AIRE", "where do my files go", "what are all these panels", "set up my workspace according to CLAUDE.md", or when onboarding a teammate or assistant to his agent setup.
---

# Agent Workspace Setup

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 9 to 12
and the start of 15 (https://www.youtube.com/watch?v=MxyRjL7NG18&t=4198s, &t=5694s, &t=7803s)

## What Nick teaches

**The IDE has three areas and that is all you need to know.** File explorer on the left (a filing
cabinet for your agent), editor panel in the middle (opens files in tabs, colors just mark headers,
code and comments), and the agent chat panel on the right (where you actually live). Nick's rule:
"if I'm manually editing a file, I am doing something horrifically wrong." You tell the agent to
change the file. You almost never open scripts. The agent writes the code and runs it ("run my
Upwork scraper"), so you never type terminal commands. Speak to it like an employee, not a
programmer: "Hey, run the scraper, post results to Slack, give me the sheet URL."

**Tools as of recording:** Antigravity (Google, cleanest and simplest, lowest learning curve, built
for Gemini but supports others), VS Code (Microsoft, free, huge extension library, add the Claude
Code extension), Cursor (early AI editor, Nick no longer prefers it). The workspace is
interoperable. Open the same folder in any IDE, swap Gemini for GPT or Claude, hand it to a friend
on Cursor. Only the agent and the workspace matter.

**Workspace structure.** Think of it as setting up a desk for a new employee.

- `directives/` holds markdown, one file per workflow. Required.
- `execution/` holds Python (or any language) scripts, one job each. Required.
- Optional: `resources/` for routinely referenced files, `tmp/` for scratch files the agent creates
  and deletes, `.claude/` and similar tool folders the agent creates itself.
- Descriptive names everywhere: `scrape_leads.md`, never `s_l.md`. "Character tokens are cheap."
- `.env` holds all API keys and credentials. Directives say "grab keys from .env", never contain a
  key. That makes directives shareable by copy and paste.
- System prompt files: `CLAUDE.md` for Claude, `GEMINI.md` for Gemini, `cursor.md` for Cursor,
  `AGENTS.md` as the general fallback. Nick puts identical content in all of them in the project
  root so any model loads the same instructions. Capitals are convention. Uploading a `GEMINI.md` to
  Claude does nothing, the name must match the tool.

**Initialization is one prompt.** Nick no longer sets up workspaces by hand. He hands someone the
system prompt file and they tell their agent: "set up my workspace in accordance with CLAUDE.md."
The agent reads the DOE explanation inside and creates the whole directory structure.

**Creating the workspace in VS Code (chapter 15):** File, Open Folder, New Folder (he named it
`youtube_workspace`), Open. Create the system prompt file and paste in the template. Install the
Claude Code extension from the extensions tab, sign in (a $10 or $20 a month plan was enough at
recording). Click the Claude Code button top right, set bypass permissions, and send the setup
prompt.

## Step by step

1. Create an empty folder and open it as the workspace in the IDE.
2. Create `CLAUDE.md` in the root and paste the DOE system prompt (see
   `aw-system-prompt-agents-md`). Copy the same content to `AGENTS.md` and `GEMINI.md`.
3. Create an empty `.env` and add it to `.gitignore` if git is used.
4. Open the agent chat, set bypass permissions, and send: "Set up my workspace in accordance with CLAUDE.md."
5. Confirm `directives/`, `execution/`, `tmp/` exist and the agent summarized what it built.
6. Add any reference material (tone guide, templates, SOP PDFs) to `resources/`.
7. Build the first workflow with a plain-language request (see `aw-writing-directives`).

## Templates / prompts

```
aire-workspace/
  CLAUDE.md
  AGENTS.md          # identical copy
  GEMINI.md          # identical copy
  .env               # CRM_API_KEY=..., GMAIL_APP_PASSWORD=..., etc.
  directives/
  execution/
  resources/
    caleb_tone_guide.md
    kw_first_choice_compliance.md
    listing_flyer_template.pdf
  tmp/
```

Setup prompt:

```
Set up my workspace in accordance with CLAUDE.md. Create the folder
structure, a .env template with placeholders for the keys you expect, and
a short README in directives/ listing the conventions. Then summarize.
```

Onboarding prompt for an assistant:

```
Here is CLAUDE.md from Caleb's AIRE workspace. Ask your agent to set up a
workspace according to this file, then copy the directives/ folder I sent
you into it.
```

## Pitfalls Nick calls out

- Feeling overwhelmed by the IDE. It is cockpit instrumentation. Learn the three panels and ignore
  the rest until needed.
- Editing files by hand. Tell the agent what to change in one line.
- Storing secrets in directives or scripts. Use `.env`.
- Acronyms or short names for files. The agent routes by name.
- Only creating one system prompt file. Make the Claude, Gemini and generic versions identical so
  you can switch models or spread usage across plans.

## How Caleb should use this

- Create one `aire-workspace` folder and keep every AIRE automation in it so directives and scripts
  can share tools.
- Put KW First Choice branding rules, Louisiana disclosure reminders and Caleb's voice guide in
  `resources/` so every workflow can reference them.
- Keep CRM, email, MLS vendor and calendar keys in `.env`. Rotating a key means editing one file.
- When Caleb wants a transaction coordinator to run the same workflows, send them `CLAUDE.md` plus
  the `directives/` folder and let their agent initialize.
- Costs: IDE and VS Code are free, Claude Code needs a paid plan. No external publishing happens in setup.

## Verification

- `ls` of the workspace shows `directives/`, `execution/`, `tmp/`, `.env`, and matching `CLAUDE.md`,
  `AGENTS.md`, `GEMINI.md`.
- `diff CLAUDE.md AGENTS.md` returns nothing.
- A fresh agent session answers "what framework are we using and where do directives live" correctly
  without being told.
- No API key string appears anywhere outside `.env` (grep for `sk-`, `key=`, `token=`).
