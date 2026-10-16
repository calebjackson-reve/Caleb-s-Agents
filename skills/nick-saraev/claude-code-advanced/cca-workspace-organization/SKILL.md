---
name: cca-workspace-organization
description: Organizes Claude Code workspaces the way Nick Saraev does: a business workspace and a personal workspace, each with .claude/ (skills, agents), active/ for all generated files, .env for keys, and a local CLAUDE.md, with client (or life-domain) subfolders that carry their own .env, skills and CLAUDE.md, a never-pollute-root rule, skill-specified output paths, periodic cleanup prompts, and a VS Code color per workspace. Use when Caleb says "organize my workspace", "where should this file go", "clean up my active folder", "set up a folder for a client or a listing", "separate my personal stuff from AIRE", or "my root folder is a mess".
---

# Workspace Organization: Business, Personal, Clients, and a Clean Root

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapter 27 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=8657s)

## What Nick teaches

**Minimum structure of any workspace:**

```
<workspace>/
  .claude/        Claude-specific files: skills/, agents/
  active/         everything else: generated files, research, outputs
  .env            API keys and credentials
  CLAUDE.md       local system prompt
```

Global prompts live separately in `~/.claude/` (home folder, hidden, Shift+Cmd+Period on Mac to reveal, different location on Windows).

**Business workspace.** His path is `~/business`. That is where he does all his work. It holds his `.env`, `.claude/skills` ("the intellectual capital you accumulate as you do SOP-able things"), `CLAUDE.md`, and `active/`.

**Client folders underneath.** Each client (client A, B, C) gets its own folder with its own `.env` (the client's keys), `.claude/skills` (project-specific skills, for example a skill that connects to a marketing agency's reporting service), and `CLAUDE.md` created with `/init` that describes the client, their business and their team, so "send a message to Jane about X" is one instruction. Client skills are not loaded into the business workspace's context automatically (`/context` shows only local ones), but you can still call them by putting one line in the business CLAUDE.md that says some skills live in client folders and to look there when referenced.

**Never pollute root.** Dumping files in root is "a nuclear bomb waiting to happen": visually insane and disorganizing for the agent. Store outputs in `active/` or subfolders, and specify the destination inside each skill. His `model-chat` skill literally says to dump transcripts into `active/model-chat/` with a particular naming scheme, so the skill and its outputs are linked and no agentic search is needed to find them. Leads for his CRM, config files, research all have named homes under `active/`. Temp files go in a hidden `active/.tmp/`. Nesting is fine because you ask the agent to find things instead of scrolling.

**Periodic cleanup.** Run a cleanup prompt reasonably often. In his demo Claude sorted loose files into folders, deleted incomplete downloads and unnamed temp snapshots, and grouped web design projects (Volta, Aura, etc.) into `active/web-design/` in seconds. A clean workspace produces cleaner work and lets any future model reason about the hierarchy.

**Personal workspace.** Same structure, separate folder. Instead of clients, subfolders by life domain: citizenship, health (skills to visualize his genetic data), piano, skin care. Personal skills like clearing personal email. He pays the token cost gladly because it is just "not business," not deeply private.

**Visual cue.** The personal workspace has a green window outline set through a `.vscode/settings.json` color customization, so his "monkey brain" instantly knows which context he is in and what information is available. Not a big unlock, but it helps.

**Portability.** Keep `CLAUDE.md`, `AGENTS.md` and `GEMINI.md` in sync in every workspace so Cursor, Antigravity or Codex can open the same folder (see `cca-model-diversification`).

**Alternatives he mentions.** A company-named top folder with `projects/` (website design, conversion rate optimization, lead generation). Keeping the CRM as a `.json` in the workspace synced daily by cron from your calendar. Hosting everything on GitHub with nightly pushes. Or ask Claude to design a naming scheme for your needs.

## Step by step

1. Create `~/business` (or `~/aire`) and `~/personal`. Each gets `.claude/skills`, `.claude/agents`, `active/`, `.env`, and a `CLAUDE.md` from `/init`.
2. Add `.gitignore` entries for `.env` and `active/.tmp/` if the folder is a git repo.
3. In the business CLAUDE.md add the root rule and the client-skills pointer (templates below).
4. For every client, listing or project that has its own keys or SOPs, make a subfolder with its own `.env`, `.claude/skills`, and `/init`-generated `CLAUDE.md` with context on the people involved.
5. In every skill you write, state the output path under `active/<skill-name>/` and a filename pattern.
6. Add a `.vscode/settings.json` color per workspace.
7. Weekly or when it looks messy, run the cleanup prompt.
8. Mirror CLAUDE.md to AGENTS.md if you use other agents.

## Templates / prompts

Root rule for CLAUDE.md:

```markdown
## File placement
- Never store random scripts, temp files or data files directly in root.
- All generated output goes under active/<purpose>/. Temp files go in active/.tmp/.
- Each skill specifies its own output folder under active/. Follow it.
- Some skills we reference don't live in .claude/skills here. They are client-specific and live in clients/<client>/.claude/skills. If I reference one, go into that client folder and use it from there.
```

Cleanup prompt (Nick's, cleaned up):

```
Clean up my active/ folder. Anything inside subfolders is fine. Anything loose in the folder (txt, py, jpeg and related) I want you to clean up by deciding if it's necessary. If it's just a temp file, get rid of it. Otherwise, store it in a folder that makes sense. Then enumerate any {DOMAIN} projects in active, find similar ones, and group them in active/{domain}/. Anything that is more personal than business, list it and I'll move it to the personal workspace.
```

Client folder layout:

```
business/
  CLAUDE.md
  .env
  .claude/skills/
  active/
  clients/
    client-a/
      CLAUDE.md        (who they are, their business, their team, how to reach them)
      .env             (client's keys only)
      .claude/skills/  (skills only this client needs)
      active/
```

`.vscode/settings.json` color cue:

```json
{
  "workbench.colorCustomizations": {
    "titleBar.activeBackground": "#1f6f3f",
    "titleBar.activeForeground": "#ffffff",
    "activityBar.background": "#1f6f3f"
  }
}
```

## Pitfalls Nick calls out

- Root pollution hurts both you and the agent.
- Client skills are not auto-loaded from the business context. The CLAUDE.md pointer line is required.
- Skills that do not state an output path scatter files everywhere.
- Loose files accumulate fast (dub links, screenshots, incomplete downloads). Clean up regularly or it compounds.
- Mixing personal and business context in one folder means re-prompting and leakage both ways.

## How Caleb should use this

- `~/aire` as the business workspace: AIRE code, brokerage skills (listing copy, CMA, follow-up), CRM exports under `active/crm/`, research under `active/research/`.
- One subfolder per active listing or client: `clients/<address-or-name>/` with its own CLAUDE.md (seller names, lender, title company, key dates) and any client-specific keys. "Text the seller at 123 Main about the inspection" becomes one instruction.
- Keller Williams First Choice brokerage-wide SOPs stay in `.claude/skills` at the business root. Listing-specific tweaks go in the listing folder.
- `~/personal` for family, health, finances, with a different title bar color so Caleb never drafts a client message from the wrong context.
- Cleanup prompt deletes files. Run it with a dry-run first ("list what you would delete") so nothing from a live transaction is lost.

## Verification

- `ls` of each workspace root shows only `.claude`, `active`, `.env`, `CLAUDE.md` (plus repo basics), no loose outputs.
- `/context` in a client folder shows that client's skills loaded.
- From the business root, referencing a client skill works via the pointer line.
- After cleanup, `active/` has only subfolders and the agent can state where any file type belongs.
- Title bar color differs between business and personal windows.
