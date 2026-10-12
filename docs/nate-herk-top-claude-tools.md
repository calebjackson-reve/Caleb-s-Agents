# Nate Herk's Top Claude Code Tools, Set Up for Caleb

Source: Nate Herk, "I Tried 100+ Github Repos for Claude. These 6 Are the Best" (AI Automation Society, Skool).
Verified against each GitHub repo on 2026-10-12.

## What's wired up

`.claude/settings.json` registers each marketplace and turns the plugins on. When you open this repo in Claude Code and trust the folder, it offers to install them.

| # | Tool | Repo | What it does for you | Status |
|---|------|------|----------------------|--------|
| 1 | Skill Creator | anthropics/skills | Describe a task in plain English and it builds, tests and packages a reusable skill. Use it for AIRE workflows like listing writeups or CMA prep. | On (bundled in `example-skills`) |
| 2 | Superpowers | obra/superpowers | Forces plan, test-first, brainstorm and review before code ships. | On |
| 3 | GSD (now GSD Core) | open-gsd/gsd-core | Splits work into fresh sub-agents with clean context, plus an autonomous mode for whole projects. The old `gsd-build/get-shit-done` repo is archived and points here. | On |
| 4 | /review and /ultrareview | Built into Claude Code | Bug and edge case review. Ultrareview runs parallel cloud agents. | Nothing to install |
| 5 | Context Mode | mksglu/context-mode | Keeps big tool outputs out of the context window and indexes session history so long projects stay on track. | On |
| 6 | Claude-Mem | thedotmack/claude-mem | Compresses each session into a local memory and feeds it back next time. | Registered but OFF, see below |
| Bonus | Frontend Design | anthropics/skills | Makes generated pages look designed instead of generic. | On (bundled in `example-skills`) |

## Why Claude-Mem is off

Its installer (`npx claude-mem install`) asks you to sign in and starts a 30 day trial of a hosted service, then falls back to your Anthropic plan unless you subscribe. Per your rules I didn't turn on anything tied to an account or billing. To use it with no account:

```bash
CLAUDE_MEM_ONLINE_OPTIN=false npx claude-mem install
```

Or flip `"claude-mem@thedotmack"` to `true` in `.claude/settings.json`.

## Manual install (any other machine)

```text
/plugin marketplace add obra/superpowers
/plugin install superpowers@superpowers-dev
/plugin marketplace add open-gsd/gsd-core
/plugin install gsd-core@gsd-core
/plugin marketplace add mksglu/context-mode
/plugin install context-mode@context-mode
/plugin marketplace add anthropics/skills
/plugin install example-skills@anthropic-agent-skills
```

Superpowers is also in the official marketplace: `/plugin install superpowers@claude-plugins-official`.

## How Nate uses them together

- Superpowers controls how Claude writes code. GSD controls the environment it works in. Use both on real builds.
- Start new automations with Skill Creator so the workflow becomes reusable.
- Run `/review` before anything goes live, `/ultrareview` on bigger changes.
- Context Mode (plus Claude-Mem if you turn it on) matters most on long AIRE sessions.
