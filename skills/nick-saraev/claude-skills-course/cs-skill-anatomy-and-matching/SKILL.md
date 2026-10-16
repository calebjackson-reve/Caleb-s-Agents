---
name: cs-skill-anatomy-and-matching
description: Explains and applies the anatomy of a Claude Code skill as Nick Saraev teaches it, including front matter, skill matching, progressive disclosure, the hidden .claude/skills folder layout and where scripts and assets go. Use when Caleb asks "why isn't my skill loading", "where do skills live", "what does the description do", "how do I organize skill scripts", "this skill is eating too much context", or wants to audit or clean up the skills folder in the AIRE repo.
---

# Skill Anatomy, Matching and Progressive Disclosure

**Source:** Nick Saraev, "CLAUDE SKILLS FULL COURSE: Automate Your Work (2026)", chapters 8-10 (https://www.youtube.com/watch?v=sduaTkhIm_w&t=1570s)

## What Nick teaches

Nick deconstructs the `SKILL.md` his agent generated and explains why each part exists.

**Front matter.** The three dashes at the top and bottom wrap a small YAML summary called front matter. His inbox-cleaner example had:
- `name: inbox-cleaner`
- `description:` "Clean up Gmail inbox by reading all unread emails, identify which ones are genuinely important and mark the rest as read. Use when cleaning inbox, triaging email, or clearing unread notifications."
- `allowed-tools:` Read, Grep, Glob, Bash. These are "little pieces of software under the hood," command-line utilities that let the agent look through files. Granting them makes the skill "almost like a sub agent."

Below the front matter comes the body: title, goal, "what counts as important", "what gets marked as read", and numbered steps. A step-by-step guide for a future agent.

**Why front matter matters: tokens.** Nick pasted the whole skill into a word counter: 373 words, roughly 500 tokens. The front matter alone is "closer to like 60 or 70 tokens." Instead of loading every skill in full into every conversation, Claude loads only the front matter of each skill, and only when a request matches does it load the full body.

**What every conversation actually looks like.** Nick draws it as a stack:
1. `CLAUDE.md` at the top (injected into every conversation)
2. Under that, the front matter of every skill, one after another
3. Under that, your prompt ("Hey, I want to do follow-ups")

**Skill matching.** When you type "Hey, get me 50 dental leads," the model scans the descriptions, finds the one that says "find business leads," says "this must be the one they want," loads the full SKILL.md into context, resubmits the prompt, then follows the steps (load pending leads, for each pending lead...) and calls scripts. That's why the description's "Use when ..." phrasing is the single most important line in the file.

**Progressive disclosure.** Nick's phrase for load-only-what-you-need. Two reasons: "the less context in a model's context window at any point in time, the higher the quality of the output," and cost. Providers want you spending less per task so you keep using them.

**Where skills live.** The folder is hidden because it starts with a dot. Hierarchy, which Nick calls "a massive pain in the butt" for beginners:

```
.claude/
  skills/
    inbox-cleaner/
      SKILL.md
      <other stuff: scripts, tokens, example files>
```

On macOS press Shift+Command+Period to show hidden files. On Windows, right click and show hidden files, or Google the hotkey. Skills sit alongside other hidden folders like `agents`.

**Other stuff.** Anthropic's convention bundles scripts and assets inside the skill folder. Nick prefers a separate folder he calls `execution` for scripts ("sue me"). Gmail auth tokens, `example.txt`, PDFs and so on can go wherever you keep them organized, as long as the skill knows the path. "Where you put those scripts don't really matter."

**Other platforms.** Nick notes OpenAI (Codex) and the Gemini CLI now support near-identical skill formats, and the same idea applies to `gemini.md` or `agents.md` instead of `CLAUDE.md`.

## Step by step

1. When a skill isn't firing, open its SKILL.md and read only the front matter. Check: three dashes top and bottom, `name` equals the folder name, `description` contains both what it does and "Use when ..." with phrases a person would actually type.
2. Rewrite the description with 3 to 6 concrete trigger phrases. Test by typing one of them in a fresh session and confirming the skill loads.
3. Check the path: `.claude/skills/<name>/SKILL.md`, exactly that nesting. A SKILL.md one level too high or too low never loads.
4. Audit context cost: paste the front matter into a word counter. If a description runs over 100 words, trim it. Move explanation into the body where it only loads on match.
5. Move deterministic logic (API calls, parsing, loops) into a script beside the skill or in an `execution` folder, and reference it by relative path from the body.
6. Keep secrets (tokens, API keys) in config files the skill references, never inline in SKILL.md.
7. Restart Claude Code so the new front matter gets indexed.

## Templates / prompts

Front matter template:

```yaml
---
name: stale-lead-sweep
description: Finds leads in Caleb's CRM with no touch in 14+ days and drafts a personal check-in for each. Use when Caleb says "stale leads", "who haven't I talked to", "sweep the pipeline", or "run the follow-up list".
allowed-tools: Read, Grep, Glob, Bash
---
```

Folder layout Caleb can adopt:

```
.claude/
  skills/
    stale-lead-sweep/
      SKILL.md
      execution/
        fetch_leads.py
        draft_checkins.py
      config/
        crm.json        (never committed with real keys)
      examples/
        sample_checkin.txt
```

Prompt to diagnose a skill that won't load:

```
Read only the front matter of every SKILL.md under .claude/skills.
List name, folder name, and whether the description has a "Use when" clause.
Flag any mismatch between name and folder, any missing dashes, and any description over 80 words.
```

## Pitfalls Nick calls out

- The folder is hidden. Most people "just have no idea where this thing is."
- The nesting is strict: `.claude` then `skills` then the skill folder then `SKILL.md`.
- Loading full skills into every conversation wastes tokens and lowers output quality. Keep bodies out of context until matched.
- Vague descriptions don't match. The description must read like the requests you will actually make.
- A new skill needs a fresh Claude instance before it is matched.

## How Caleb should use this

- Run the audit prompt above across the AIRE repo's skills before adding new ones, so old skills don't drown out new ones at matching time.
- Write descriptions in Caleb's own vocabulary: "run comps", "pull my buyers", "open house list", "who's going under contract this week".
- Keep MLS, CRM and Gmail credentials in a config folder the skills reference, never in the SKILL.md, since those files get shared and copied.
- Put long reference material (KW listing presentation outline, Louisiana disclosure checklist) in the skill folder as separate files the body links to, so it only loads when the skill runs.

## Verification

- A fresh Claude session shows the skill in its loaded skills list.
- Typing one of the description's trigger phrases loads and runs the skill without naming it.
- Front matter word count under about 80 words per skill.
- Scripts referenced in the body exist at the stated relative path and run.
