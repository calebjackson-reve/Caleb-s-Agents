---
name: vc-antigravity-dual-model-setup
description: Sets up and operates Nick Saraev's two-model vibe coding environment, Google Antigravity (Gemini 3.1 Pro High in the agent chat) plus the Claude Code extension (Opus 4.6) in the same window, and explains the 80/20 of the interface, conversation modes, permission modes, model picking and voice dictation. Use when Caleb says "set up Antigravity", "how do I use Gemini and Claude Code together", "which model should I use for this", "planning mode vs fast mode", "what do the Claude Code permission modes mean", or when starting any new AIRE build or client dashboard project and he needs the dev environment configured first.
---

# Antigravity + Claude Code dual-model setup

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 2-4 and 8-13 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=150s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=1016s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=1493s)

## What Nick teaches

Nick runs his whole business on one development environment: **Antigravity** (Google's IDE-like app) for talking to the Gemini family, and the **Claude Code extension** installed inside Antigravity for talking to the Claude family. He pays Google for one and Anthropic for the other and keeps them in separate chat windows on purpose.

### Installing Antigravity
1. Go to `antigravity.google` and download for your OS. On Mac, check About This Mac to see whether you are Apple silicon or Intel and pick the matching installer. On Windows look for x64.
2. Drag the app into Applications (Mac) or click through the installer (PC).
3. Log in with your Google account. That unlocks Gemini 3.1 Pro High as the default model, with usage limits depending on your plan. Other models in the picker at recording time: Gemini 3.1 Pro Low, Gemini 3 Flash, Sonnet 4.6, Opus 4.6.
4. Open the agent panel with the button at top right or the hotkey **Cmd+Option+B** (Mac).

### The three panes (the 80/20)
- **Left: Explorer.** A plain file browser. Folders, files with icons by type (.md, .html, .jsx, .css). Right click to create, delete, rename, open timeline. You must "Open folder" before anything shows here.
- **Middle: Editor.** Treat it like Notepad or Apple Notes with syntax colors. Nick barely uses it any more. Useful bits: the minimap on the right edge, and the **markdown preview** button at top right of any .md file. When a markdown file is dense he sometimes pastes it into a Google Doc and sets the text to black just to read it.
- **Right: Agent chat.** Where Nick spends almost all of his time. Natural language in, work out.

Nick often shrinks or closes the middle pane entirely and just chats with the agent. Tab switching uses the same hotkeys as browser tabs.

### Agent chat anatomy
- **New conversation** button top right, or **Cmd+Shift+L**. Past conversations list below, each can be reopened "in current window" or "in a new workspace" (which pulls in the files that were open at the time).
- **Customizations** (rules, workflows) and **MCP servers** live under the options menu on the right. See the `vc-rules-and-workflows` skill.
- The current folder name shows above the prompt box. Below it you can **add context**: media, `@` mentions (files, directories, code items, rules, terminals, past conversations, MCP servers) and `/` workflows. Mentioning a file is cleaner than pasting its contents.
- **Mode picker**: `Planning` or `Fast`. Nick: "always start in planning any time you are designing or building a new feature." Planning forces the model to think, then presents a plan you can auto-approve or stop and edit. `Fast` executes directly and is for one-off tasks like "change this markdown file to a txt" or a quick refactor.
- **Model picker**: hot-swappable like Lego blocks. Nick's split at recording time: Gemini 3.1 Pro High for design and front-end wiring, Opus 4.6 for planning, architecture, backend and security. To compare models he just Googles "Gemini 3.1 Pro High vs Low" for benchmark tables.
- **Mic button**: Gemini transcribes voice to text. Nick types 50 to 80 wpm but speaks 150 to 200 wpm, so he dictates almost every long prompt (he also uses Wispr Flow as a system-wide dictation tool).
- After you send a message you get a **Thought** tab (the model's internal reasoning, useful to see why it made an error or got lazy to save tokens), the response text, thumbs up/down (he never uses), and tabs for **Changes overview**, **Terminal** (background processes it launched), **Artifacts** (task lists, implementation plans, walkthroughs) and a built-in **Browser**.
- A **walkthrough** file is a Gemini-specific artifact that explains what the AI wants to do next. You can review, comment and download it.
- At every step the model takes the prompt, thinks, then sends the result to another instance asking "what's next", over and over. The implementation plan artifact is your window into what it decided (aesthetic archetype, typography, file structure).

### Claude Code inside Antigravity
1. Sign up at `claude.ai`. Claude Code is not on the free plan at recording time: Pro was $17/month, Max started at $100 (prices may have changed). Nick says he spends about $200/month and gets at least 100x ROI versus a $20k to $30k/month developer.
2. In Antigravity, bottom left **Extensions**, install "Claude Code for VS Code". Click its top-right button to open the Claude Code window (the orange one with the space invader).
3. First run: type `/login` and sign in with your Claude subscription (cheapest route), the Anthropic console, or third-party providers.
4. Bottom right: **switch model**. Default was Opus 4.6. Options included Opus 1M context, Sonnet, Sonnet 1M, Haiku.
5. **Permission modes** (cycle through them): `Ask before edits` (confirms every file change, you can say yes, allow all this session, no, or tell Claude what to do instead), `Edit automatically` (what most people use), `Plan mode` (thinks and presents a plan before touching anything, the one with the pause icon), `Bypass permissions` (Nick's "yolo mode"). Gemini's agent chat is effectively on bypass by default.
6. **Fast mode** (the lightning icon, bottom right): roughly 2.5x faster for about 3x the price at recording time, Nick expected it to rise to 6x. He uses it for big planning passes when he wants speed over cost. Extra usage is set under the usage settings (he raised his monthly spend limit there).

Why keep Claude in Claude Code rather than the Antigravity model picker: in Nick's experience Claude performs worse inside the Gemini chat and the UX is better in its own extension. Claude's thinking is also more interpretable in plain English, which matters for security work.

## Step by step

1. Install Antigravity, log in with Google, open the agent panel (Cmd+Option+B).
2. Open the project folder (File > Open folder). Create one folder per app, lowercase with hyphens, for example `aire-client-dashboard`.
3. Install the Claude Code extension, `/login`, set permission mode to `Edit automatically` for normal work and `Plan mode` when kicking off a build.
4. Decide the split before you start: planning and backend in Claude Code (Opus), design and front-end wiring in the Gemini agent chat (Planning mode, Gemini 3.1 Pro High).
5. Dictate long prompts. Talk like you are talking to a person, the model extracts the meaning.
6. After each response, skim the Thought tab only when something looks wrong. Check Artifacts for the implementation plan before letting a big build run.
7. For quick one-offs switch Gemini to Fast mode, then switch back to Planning.

## Templates / prompts

Folder naming Nick uses:
```
website-builder-demo/
full-stack-client-dashboard/
lead-scraping-saas/
thumbnail-generator/
splinter/
```

First message in a new Claude Code window, plan mode, before a big build:
```
You're a world-class website designer with 15 years of experience designing
high quality, award-winning websites. We'd like to build [APP]. It's very
important that you get this right, our career depends on it.
[requirements]
Think extremely hard and generate a great plan. Once you've developed one that
is comprehensive, report back here and I'll supply some screenshots.
```

## Pitfalls Nick calls out

- Gemini 3.1 Pro High hits rate limits after roughly an hour of heavy autonomous work. Have the other model ready (see `vc-model-handoff-context-backup`).
- Claude Code needs a paid plan. Gemini is free but limited. Pick the trade-off on purpose.
- Fast mode is a money-for-time trade. A single heavy session cost Nick about $70. Do not leave it on by default.
- Nobody reads the Changes overview in practice, but do read implementation plans for big builds.
- The built-in browser is "not the highest quality browser on planet Earth" but fine for things only a browser can do.

## How Caleb should use this

- Set up one Antigravity workspace per AIRE component (lead follow-up service, listing marketing site, open house sign-in app) so conversations and rules stay scoped.
- Use Gemini Planning mode for any client-facing page design (listing landing pages, buyer guides) and Claude Code plan mode for anything with a database or auth (CRM, client dashboards).
- Dictate your feature requests the way you would describe them to a Keller Williams tech assistant. Voice dumps are the fastest way to get your real-estate domain knowledge into the model.
- Turning on Fast mode or raising the Claude spend limit costs money: needs Caleb's approval before running.

## Verification

- Agent panel opens with Cmd+Option+B and shows Gemini 3.1 Pro High in the model picker.
- Claude Code window opens, `/login` succeeds, and the bottom-right model shows Opus (or your chosen model).
- Sending "hey what's up" in each window returns a reply, and the Thought tab appears on the Gemini side.
- A Planning-mode prompt produces an implementation plan artifact before any files change.
