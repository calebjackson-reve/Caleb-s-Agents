---
name: aa-skills-as-sops
description: Turns a repeatable workflow into an agent skill (SKILL.md with YAML front matter) so the agent does the same thing the same way every time instead of improvising. Use when Caleb says "make this a skill", "I keep re-explaining this", "standardize how we do X", "save this as a workflow", or when any AIRE process (new-listing launch, buyer consult prep, weekly CRM cleanup, open-house follow-up) has been done manually twice and should become a one-command procedure.
---

# Skills as Standard Operating Procedures

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapter 8
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=2097s), with context-cost notes from chapters 23-26

## What Nick teaches

LLMs are flexible, so a loosely scoped task produces a different result every run. Skills turn that
statistical variance into a straight-line deterministic path: the same procedure every time. Codex,
Gemini and Claude Code all support skills with near-identical specs.

A skill is a file in your workspace with a title section fenced by three hyphens (YAML front
matter). Inside you can set `name` (e.g. "PDF processing"), `description` ("extract text and tables
from PDFs"), and optionally license, metadata and tools. Nick's own skills are almost always just
name, description, and maybe allowed tools.

His demo: he opened Anthropic's public skills repo, picked `algorithmic-art/SKILL.md`, copied the
whole file into an agent and said "yes, save as skill, then run." The agent created the skill
directory, templates, and then produced a browser-rendered particle art generator he could tweak
live (particle count, noise scale, turbulence, accent colors). His point: "we didn't download
software, we built it, just in a standardized, consistent way." Skills let you share repeatable
workflows that other people have validated.

Later in the course he shows the cost side: only the YAML front matter of each skill is loaded into
context until the skill is invoked. The body loads on demand. His `/context` readout showed skills
consuming about 1,700 tokens before any message. So front matter should be tight and specific, and
the body can be long.

Where skills sit in the injection order: global CLAUDE.md, then local CLAUDE.md, then skills, then
your inline prompt.

## Step by step

1. Notice a task you have explained the same way twice. That is the trigger.
2. Create `skills/<name>/SKILL.md` (or `.claude/skills/<name>/SKILL.md` in the project).
3. Write front matter: `name` (kebab-case, matches the folder) and a `description` whose first
   sentence says what it does and whose "Use when" lists the exact phrases you would say.
4. Write the body as a numbered procedure with templates, file paths and the definition of done.
5. Test by starting a fresh session and saying one of the trigger phrases. Confirm the skill loads
   and the output matches the last manual run.
6. Fix the description if it did not trigger, fix the body if the output drifted.

## Templates / prompts

Skeleton:

```
---
name: new-listing-launch
description: Produces the full launch kit for a new Keller Williams First Choice listing (MLS description, 3 social captions, open-house flyer copy, email blast draft). Use when Caleb says "new listing", "launch kit for <address>", or pastes listing details and asks for marketing.
---

# New Listing Launch

## Inputs
- Address, price, beds/baths, sqft, lot, year built, 3 to 5 standout features
- Photo folder path (optional)

## Procedure
1. Read inputs. Ask for anything missing before writing.
2. Write MLS description (max 1,000 chars, no em dashes, lead with the hook feature).
3. Write 3 captions: Instagram, Facebook, LinkedIn. Each ends with a soft CTA.
4. Draft flyer copy and open-house details block.
5. Draft email blast (subject + 120 words).
6. Save all to listings/<address-slug>/launch-kit.md.

## Definition of done
All six pieces saved to the file. Nothing posted or sent. Report the file path and wait for Caleb.
```

Prompt to convert a manual run into a skill:

```
Take the procedure we just did and save it as a skill at skills/<name>/SKILL.md.
Front matter: name and description only. Description must start with what it does
and include a "Use when" sentence with the exact phrases I would say.
Body: numbered steps, templates, file paths, and a definition of done. Then run it
once on the same inputs to confirm the output matches.
```

## Pitfalls Nick calls out

- Vague descriptions do not trigger. The description is what makes the skill auto-load.
- Skills are not free. Every installed skill's front matter sits in context all the time. Delete
  skills you do not use.
- Over-long front matter wastes tokens on every message. Put detail in the body.
- Copying a skill without reading it. Nick read the algorithmic-art skill before running it.

## How Caleb should use this

- Candidate first skills for AIRE: new-listing launch kit, buyer consult prep packet, weekly CRM
  hygiene, post-open-house follow-up sequence, monthly market update for St. Francisville and Baton
  Rouge.
- Any skill that sends email or texts, posts to social, or spends money must end with "stop and wait
  for Caleb." Needs Caleb's approval before running.
- Keep skills in this repo so they travel with Caleb across machines and sessions.
- Pair each skill with the Learned Rules pattern (aa-self-modifying-claude-md) so corrections to the
  skill's output get captured.

## Verification

- A fresh session, given only a trigger phrase, loads the skill (Claude Code shows the invocation)
  and produces the expected files.
- `/context` shows the skill's front matter cost is small (hundreds of tokens, not thousands).
- Two runs on the same inputs produce near-identical structure.
