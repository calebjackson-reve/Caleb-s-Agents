---
name: cca-insights-global-distill
description: Runs Nick Saraev's global system-prompt loop: after several local learning loops, run /insights across Claude Code history, distill the report into high-information-density snippets, manually review for contradictions, and merge them into the global ~/.claude/CLAUDE.md with a profile, interaction rules, a docs-first rule and token conservation rules. Use when Caleb says "run insights", "update my global CLAUDE.md", "Claude does this wrong in every project", "distill my Claude patterns", or "give Claude context about me and AIRE in every conversation".
---

# The Global Loop: /insights and Distilling into the Global CLAUDE.md

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 4 and 7 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=837s and https://www.youtube.com/watch?v=UPtmKh1vMN8&t=1607s)

## What Nick teaches

The local loop (plan, build, compile learnings, update project CLAUDE.md) makes one project's file very good. After hundreds of runs across projects, trends appear: "not just on that one project, but on every project, Claude goes down silly rabbit holes instead of consulting the docs." That is a global pattern and belongs in the global file.

**`/insights`.** A slash command that runs a bunch of subagents across your whole Claude Code conversation history and produces an HTML report. His report covered 1,049 messages across 200 sessions (he thinks roughly a month, and only Claude Code sessions, not necessarily the desktop app). It includes context about what you work on, how you use Claude, and most usefully a section like "existing features to try" with concrete rules such as:

- "When using Chrome DevTools MCP or browser automation, always kill stale Chrome processes and use a clean profile before starting. If the MCP tools fail twice, stop and ask the user before continuing to retry. Never waste tokens on repeated failing browser calls."

It can also suggest new skills based on things you consistently ask for.

**Distill, don't paste.** He copies the whole report into Claude with a distillation prompt (below). The output was lines like: "Don't overexplain, overengineer, or add unrequested improvements. When making widespread changes to a file, use one write instead of many sequential edit calls. Speed matters."

**Manual review is mandatory here.** Every AI step compounds probability. If Claude is 90% right on a task and you chain three Claude steps, you get 0.9 cubed, about 73%. Because the global file applies to every future project, this is exactly where human time is worth spending. In his own review he found two rules in direct contradiction ("don't fetch well-known websites" versus "always read the docs") and deleted one.

**What the global file should contain** (his words): context about you and your goals and reasoning strategies, high-level preferences about what Claude currently does wrong that you want fixed, and good token conservation strategies like docs first.

**Installing it.** Either ask Claude to write it into the global file, or on Mac open Finder, go to your home folder, show hidden files (Shift+Cmd+Period), open `.claude`, and replace `CLAUDE.md` there. From then on every conversation in every workspace includes it.

Nick's model: the two loops form an infinity sign. You spend most time in the local loop, periodically go around the global loop, then return.

## Step by step

1. Confirm the local loop has run at least 4 or 5 times (there is material to mine).
2. Run `/insights` in Claude Code. It takes a while. Open the HTML report when ready.
3. Read the "existing features to try" (or equivalently named) section. Copy the entire report.
4. Start a fresh Claude session and paste the report with the distillation prompt below.
5. Review the distilled list by hand. Delete anything that contradicts another rule, anything project-specific (that goes local), and anything vague.
6. Open `~/.claude/CLAUDE.md`. Merge into these sections: Profile, Interaction rules, Capabilities and agency, Token conservation. Add the docs-first rule if missing.
7. Save. Start a new session anywhere and confirm the profile is loaded.
8. Go back to the local loop. Repeat the global loop every few weeks or after a burst of projects.

## Templates / prompts

Distillation prompt (paste after the insights report):

```
This is my Claude insights file. It describes at a high level a few of the obvious design patterns in my thinking, and a couple of the issues that I've had communicating with you and other versions of you. I'd like you to distill this into a list of high information density snippets that I can paste into a global CLAUDE.md, to be both token conservative but also avoid most of the mistakes that you typically make.
```

Docs-first rule (Nick's wording, cleaned up):

```markdown
- When the user asks you to use a non-trivial platform, one for which you do not have context, always look up the documentation first. Search "API documentation" plus the platform name. If you can't access the docs for JavaScript reasons, launch a Chrome DevTools MCP Chrome instance so you can still copy the content. If API documentation is available for a project, always go through it to avoid 99% of the errors. The tokens we spend reading the docs save a lot of tokens trying to use things that don't work.
```

Global CLAUDE.md shape (Nick's structure, Caleb's content):

```markdown
# Global CLAUDE.md
Inserted at the beginning of any conversation with Claude across all of the user's workspaces.

## Profile
Caleb Jackson, REALTOR, Keller Williams First Choice, St. Francisville / Baton Rouge, LA.
Builds AIRE (AI real-estate agent system). Revenue comes from listings, buyer transactions and referrals.
Goals: more listings, faster lead follow-up, consistent content. Money is not the main bottleneck, time is.
Team: Caleb plus AI agents. No in-house developer.

## Interaction rules
- Don't overexplain, overengineer, or add unrequested improvements.
- Widespread changes to a file: one write, not many sequential edits. Speed matters.
- If browser or MCP tools fail twice, stop and ask before retrying.
- Warm, direct, natural voice. No em dashes, no corporate filler.

## Capabilities and agency
- You do the work. Don't hand me terminal commands to paste.
- Assume AI speed when estimating effort.

## Token conservation
- Read CLAUDE.md before crawling files.
- Docs first (rule above).
```

## Pitfalls Nick calls out

- Chained AI steps compound error (0.9 x 0.9 x 0.9 is 73%). Review the global file yourself.
- Rules can directly contradict each other. Look specifically for pairs that fight.
- Don't paste the whole insights report into CLAUDE.md. Distill to snippets.
- Without profile context, Claude will recommend the cheapest option when you wanted the fastest. Tell it what you optimize for.
- `/insights` appeared to cover about a month of Claude Code history and may not include desktop app chats. Recorded as he observed it, may have changed.

## How Caleb should use this

- Profile section: state plainly that Caleb is a REALTOR building AIRE, is not an engineer, and wants working tools fast. That stops Claude from quoting developer-style timelines or picking the cheapest brittle path.
- After a month of AIRE work, run `/insights` and look for repeat friction: CRM exports in the wrong format, listing copy in the wrong voice, browser automation flailing on the MLS portal. Promote the fixes globally.
- Add real estate token savers globally: "before touching a new platform (Follow Up Boss, kvCORE, Zillow, Canva API), read its docs first."
- Keep the global file free of client names, addresses or transaction details. Those belong in project files.
- Running `/insights` and editing CLAUDE.md costs only tokens and changes nothing external, so no approval gate needed.

## Verification

- `~/.claude/CLAUDE.md` exists and contains Profile, Interaction rules, Capabilities, Token conservation.
- Open a brand-new session in an unrelated folder and ask "who am I and what do I care about?" Claude answers from the profile.
- Ask for a recommendation with a cost versus speed tradeoff. Claude should favor what the profile says.
- No two rules in the file contradict each other.
