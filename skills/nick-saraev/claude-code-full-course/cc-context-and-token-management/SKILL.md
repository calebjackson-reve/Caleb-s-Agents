---
name: cc-context-and-token-management
description: Diagnoses and reduces Claude Code context usage using /context, /compact, /clear, /cost, /model thinking settings and a custom status line, following Nick Saraev's breakdown of what eats the 200K window (CLAUDE.md, system tools, MCP tools, memory, skills, messages, auto compact buffer). Use when Caleb says "Claude is getting dumber as the chat goes on", "I hit 100% context", "why is my context at 30% before I typed anything", "how do I save tokens", or before any long AIRE build session.
---

# Context and Token Management

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 4, 18, 19, 20 and 21 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=8033s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=8396s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=8843s)

## What Nick teaches

Context management is handling the tokens in a prompt as effectively as possible. People overcomplicate it. The facts:

- A token is roughly a word (a little more). "Hey, how's it going" is four words and about six or seven tokens.
- The context window is the total tokens the model can handle at once. Claude Opus 4.6 (the model he used) is about 200K. Some Sonnet models go to 1 or 2 million. Window size is not the same as model quality. (Figures as he stated them, they may have changed.)
- The context percentage in the status area goes from 0 to 100. As it rises, quality drops: there is a negative relationship between prompt length and output quality. This is called context rot.
- Everything in context is billed, including the parts Anthropic injects. Expect a flat 5 to 15K tokens or more before you type a word.

`/context` shows exactly who is using your window. In his demo a fresh session was at 26,400 tokens (13%) having typed only `/context`. Categories, in the order they are injected:

1. System prompt: global `~/.claude/CLAUDE.md`, project CLAUDE.md or rules files, `MEMORY.md`.
2. System tools: Bash, Read, Edit, Write, Glob, Grep, WebFetch, WebSearch, Task (subagents), TaskOutput, TodoWrite, AskUserQuestion, NotebookEdit, EnterPlanMode, ExitPlanMode, Skill, TaskStop. About 16,800 tokens in his session, and you cannot remove them. Ask "What tools do you have access to? List them all" to see the current set.
3. MCP tools: the ones you added. 2.8% in his clean session, almost 20,000 tokens after adding ClickUp (more than the system tools). See `cc-mcp-prototype-then-skill`.
4. Memory files: 88 tokens.
5. Skills: only the frontmatter loads, 61 tokens for his set.
6. Messages: the actual conversation. Thinking is billed but is not kept in the message chain, it is a scratchpad that collapses after each answer.
7. Free space, and the auto compact buffer (about 33,000 tokens held in reserve).

Compaction: when the buffer is reached Claude compresses the history into a high information density summary (a chronological analysis of what the user asked and what happened), usually three to four times fewer tokens. "Let me commit and push, so Netlify rebuilds" becomes "Netlify rebuilding." Newer versions also auto-compact older messages continuously in the background. Run `/compact` manually, optionally with instructions on what to prioritize. After compaction ask "Tell me what is currently in your context" to see the summary.

Commands he walks through: `/compact`, `/clear` (wipe the conversation when switching to something unrelated, his messages dropped to 152 tokens), `/cost` (check usage), `/context`, `/init`, `/model` (switch model and set thinking effort from disabled up to 32K or more), `/statusline` (terminal only: he asked for "a little loading bar showing how many tokens I've used out of my total context" and a status line setup agent built it, showing percentage, model and git branch).

Anthropic's token reduction list as he read it (check the docs, it changes):

- Manage proactively with `/cost` and a status line.
- Custom compaction instructions.
- `/clear` between unrelated tasks.
- Tell Claude in CLAUDE.md to answer succinctly: reason all it wants, return the bare minimum, you will ask for more.
- Choose the right model: Sonnet for simple subagents, cheaper with bigger windows, do heavy lifting there and return summaries.
- Reduce MCP server overhead. Tool search now kicks in when MCP descriptions exceed 10% of the window: tools are searched and loaded on demand instead of all at once.
- Move instructions from CLAUDE.md into skills, which load only when invoked.
- Adjust extended thinking effort.
- Agent teams cost about seven times a standard session. Avoid when minimizing tokens.
- Write specific prompts: "fix this one feature in this file" instead of "improve this codebase".
- Plan complex tasks first. Research (API calls, web pages) loads huge amounts of context, so front-load it in plan mode.

His own trick for small windows: paste the voice transcript into a cheaper model in another tab, have it summarize into a tight request, then send that to the main agent. Voice dumps are full of ums and ahs. Keep current on tips by asking Grok: "Summarize the best strategies to reduce token usage that users have been talking about in the last month."

## Step by step

1. Open a fresh session and run `/context`. Note the baseline before any message.
2. If MCP tools are more than a few percent, remove the servers you are not using today (see the MCP skill).
3. If the system prompt is large, prune CLAUDE.md and move task-like sections to skills.
4. Set `/model` and thinking effort for the job: higher thinking, shorter answers.
5. Work. When switching to an unrelated task, `/clear`. When the window passes about 70% on a related task, `/compact` with a focus instruction.
6. Check `/cost` at the end of long sessions. Terminal users: `/statusline` once to keep a live bar.

## Templates / prompts

CLAUDE.md token rule:

```markdown
## Output style
- Reason as much as you need. Reply with the bare minimum: result, file path, what you verified. I will ask if I want more.
```

Compact with focus:

```text
/compact Keep the current database schema, the list of open bugs, and Caleb's style feedback. Drop the exploration of approaches we rejected.
```

Status line request:

```text
/statusline Update my status line so it includes a loading bar showing how many tokens I've used out of my total context, plus the current model.
```

Voice dump compressor (run in a cheap model first):

```text
Turn this transcript into a tight, specific request for a coding agent. Keep every concrete requirement, drop filler. Max 10 bullets.
```

## Pitfalls Nick calls out

- Installing a heavy MCP and losing 20% of the window before typing.
- Pasting API docs into CLAUDE.md.
- Vague prompts like "improve this" that force exploration.
- Letting the window hit 100% repeatedly during a build. His did, and compaction saved him, but quality dips.
- Thinking the GUI has a status line. It does not, use the terminal.

## How Caleb should use this

- Before an AIRE build day: fresh session, `/context`, disable unused MCPs, `/clear` between the listing page and the CRM script.
- Keep a voice dump compressor habit: dictate the request, compress in a cheap tab, send the compressed version.
- Put the succinct-output rule in the global CLAUDE.md. Caleb does not need essays, he needs the file and the check.
- Use Sonnet subagents for reading long MLS exports or email threads and return summaries to the main session.

## Verification

- `/context` on a fresh session shows the system prompt and MCP tools well under 20% combined.
- After `/clear`, messages drop to a few hundred tokens.
- After `/compact`, "tell me what's in your context" returns a summary that still contains the facts you asked to keep.
- Status line (terminal) shows the percentage and it stays below the auto compact buffer for most of the session.
