---
name: aa-context-window-management
description: Manages the agent's context window: audits what is eating tokens before the first message (system prompt, CLAUDE.md, memory, skills, MCP tools), understands auto-compaction, and applies the iceberg technique (keep a small always-on core, load everything else on demand via read, grep, glob, web fetch). Use when Caleb says "/context", "why is it getting dumber", "it forgot what we were doing", "it compacted", "my CLAUDE.md is huge", "too many MCP tools", or when a long AIRE session starts degrading in quality.
---

# Context Window Management (Iceberg Technique)

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapters 23
(second half) through 26 (first half) (https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=5854s,
&t=6529s, &t=6814s, &t=7159s)

## What Nick teaches

**What is in context.** Not just your messages. The system prompt, CLAUDE.md / AGENTS.md / GEMINI.md
(global and local), a memory file (`memory.md` in Claude Code, analogs elsewhere), skills (front
matter), and tools including every MCP tool definition. Each MCP tool
(`mcp__chrome-devtools__click`, `drag`, `get_console_message`) is a button in a spaceship cockpit.
Claude knows what they do, but every button costs tokens.

**Size.** Most models at recording were 200k to 1 million tokens. A token is not a word, and 200k tokens
is very roughly 140,000 to 700,000 words depending on content. He says those numbers are rough.

**Quality degrades with length.** Quality as a function of token count starts near 100% and falls as
context grows. A query that scores 100% at 5 to 10k tokens might score 40% at 199k (his numbers are
illustrative). Cost also rises linearly with tokens. He spent about $500 in tokens making this
course because fast mode bills directly. So push left on the graph: fewer tokens, both for quality
and money.

**Audit with `/context`.** In Claude Code, maximize the panel and run `/context`. His readout before
sending a single message: about 9,000 tokens used. System prompt (partly CLAUDE.md) 4,900 tokens,
2.5% of the window. Memory files 2,000. Skills 1,700. Messages 8. 158,000 of 200,000 free. His
point: nearly 10% of the window was gone before the conversation began, and if CLAUDE.md, memory and
skills keep growing, you start the conversation already in the degraded zone.

**Compaction.** When usage hits the auto-compact limit, the platform takes roughly 80% of context
and compresses it into 30 to 40%: a hydraulic press. "Hello, how are you doing?" (about eight
tokens) becomes "Hi, how are you?" (four). It runs naively across everything, drops tool outputs,
and loses details from message 4 that might have prevented a mistake at message 50. Before
compaction existed, you simply ran out and started a new session, manually summarizing. Compaction
is the automated version. Avoid relying on it when sensitive or important details are in play.

**The iceberg technique.** Above the waterline (always in context, small): memory, CLAUDE.md (global
and local), current task context, what tools are doing, active file contents. Below the waterline
(accessible on demand, large): the full code base, all file contents, web data, git history, the
full skills library. The model stores the **ability to access** things, not the things. Tools do
this:

- `read`: file titles are visible, and a file is read only when needed (ask about the iceberg technique
  and it reads `iceberg.md`, not every file).
- `grep` and `glob`: hone in on a 2k-token segment of a 10k-token file, with enough surrounding text
  to work.
- `web fetch`: search, look at the URLs, read only the one that matches.
- `bash`, git history, and so on: same idea.

It is a successive narrowing of the lens: files in context, then grep the code base, then memory and
skills, then the web, then one URL. Nick thinks the real split is closer to 20/80 or 30/70 than the
10/90 in his diagram.

**Naive vs strategic loading.** In 2023 people pasted whole code bases and ran out of context. Now:
read selectively (only the relevant functions), CLAUDE.md acts as a compression function for
preferences, skills load only their YAML front matter until invoked (he showed a `create-proposal`
skill where only the front matter is in context), and tool results are summarized to short
input/output notes instead of stored whole. The architecture around the model, not the model, is
what makes it economically useful.

## Step by step

1. Run `/context` at the start of a session. Note the pre-message total and the biggest buckets.
2. If CLAUDE.md is over a few thousand tokens, move rarely needed detail into files it can read on
   demand, and keep only rules and pointers.
3. Prune memory and skills you are not using in this project. Disable MCP servers you do not need
   for this session.
4. During work, prefer grep and targeted reads over "read the whole folder."
5. Watch for compaction. Before it hits, write a `handoff.md` with current state, decisions, and
   open items, then start a fresh session that reads it.
6. For long jobs, split into sub-agents with fresh context (see aa-sub-agent-verification-loop,
   aa-stochastic-consensus) rather than one marathon thread.

## Templates / prompts

CLAUDE.md pointer style (small core, on-demand detail):

```
# Project core (keep under 1,500 tokens)
- Market: St. Francisville / Baton Rouge, LA. Brokerage: Keller Williams First Choice.
- Voice: warm, direct. No em dashes, no semicolons.
- Safety: never send, post or spend without approval.
- Details live in docs/: read docs/crm-fields.md when touching the CRM, docs/listing-style.md when writing listing copy. Do not read them otherwise.
```

Pre-compaction handoff prompt:

```
We are near the context limit. Write handoff.md with: goal, what is done (file
paths), decisions made and why, open items, exact next step. Keep it under 400
words. I will start a fresh session that reads it first.
```

Token-saving habits to add as Learned Rules:

```
- [Context] Always grep before reading a whole file because whole-file reads waste tokens.
- [Context] Always summarize long tool output to 5 lines in your notes because raw output bloats context.
- [Context] Never load more than the skills and MCP servers this task needs because tool definitions cost tokens on every turn.
```

## Pitfalls Nick calls out

- Starting a session with 10% of the window already consumed by CLAUDE.md, memory and skills.
- Letting CLAUDE.md and memory grow without pruning.
- Relying on compaction with sensitive or important data, because it drops tool outputs and details.
- Pasting whole code bases or whole documents when a grep would do.
- Fast mode and long contexts both multiply cost.

## How Caleb should use this

- Keep the AIRE project CLAUDE.md to rules and pointers. Put CRM schemas, templates and style guides
  in `docs/` files it reads only when relevant.
- For long lead-list or CMA sessions, write a handoff file before compaction so nothing about a
  client gets squished away.
- Only enable the MCP servers the task needs (Gmail for email days, Chrome for scraping days), not
  all of them at once.
- Run `/context` once a week on the main project and prune. It is free and takes a minute.

## Verification

- `/context` before the first message shows a smaller pre-message total than last audit, ideally
  well under 10% of the window.
- The agent reads specific files on demand instead of whole folders (visible in the tool calls).
- Long sessions end with a handoff file rather than a surprise compaction.
