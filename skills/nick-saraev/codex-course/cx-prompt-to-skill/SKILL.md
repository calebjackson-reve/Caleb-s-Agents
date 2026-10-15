---
name: cx-prompt-to-skill
description: Converts a working prompt conversation into a reusable agent skill (SKILL.md plus scripts, references and assets) by pruning the back and forth into a bare-bones checklist, installing it where other sessions find it, and verifying it on the original input and on fresh parallel runs. Use when Caleb says "make this repeatable", "save this as a skill", "I'll need to do this again", "turn this into a slash command", or after any build in Claude Code or Codex has produced an output he likes.
---

# Prompt to skill conversion

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 5 (https://www.youtube.com/watch?v=DJZISqryDfw&t=2017s), reinforced in chapters 7 and 8

## What Nick teaches

Agent skills are "an agreed upon protocol that allow you to do the same things in very specific ways." Services ship them (Netlify's plugin came with skills to create and push sites), and you can write your own. A skill is a folder:

```
my-skill/
  SKILL.md        # the instructions, with name and description at the top
  scripts/        # optional
  references/     # optional
  assets/         # optional
  agents/         # optional
```

Codex stores them under `~/.codex/skills/` or a project's `.agents/skills/`. Claude Code uses `.claude/skills/<name>/SKILL.md` (project) or `~/.claude/skills/` (global). The file format is the same. Chapter 11 shows the OpenAI skills page and the Anthropic skills page side by side: "a directory with a SKILL.md file plus optional scripts and references," identical apart from the folder name.

The method, every time:

1. **Prompt first, skill second.** "Most issues I see with skills are because people put the cart before the horse." Figure out the path from start condition to goal by hand, then reverse engineer the steps.
2. **Prune.** The conversation had exploration, fixes and dead ends. None of that goes in. Keep only the most necessary components, "a bare-bones checklist that the model can do right every single time."
3. **Install where automations can discover it.** Nick's model said: "I'll install the skill in your personal codex directory so automations can discover it." That matters for level 3 and 4.
4. **Verify on the original input.** Rerun the skill on the same transcript or post that produced the winning output. Compare quality.
5. **Verify on fresh inputs in parallel.** "Create three more transcripts and apply the skill to each as sub-agents." Three independent runs, three URLs.
6. **Harden with each run.** "Skills start relatively unhardened in this naive state. It's up to you to run it over and over and improve it with every run." After a slow run: "look at everything you did, proceed down the path of least resistance next time, and update the skill." Nick says that usually makes a skill 3 to 4 times faster (see `cx-skill-evals-self-healing`).

What the generated `transcript-to-proposal` SKILL.md contained: a `name`, a `description` saying what it does and when to use it ("especially from an automation or a zero context task"), the list of files it must include, the workflow in natural language, the renderer step and the deploy step.

The chapter 7 content skill added conventions worth copying: output into a dated subfolder with a slug derived from the content, a `playbook.md` holding the editorial rules, and a note that it should run text and image generation as sub-agents.

## Step by step

1. Confirm the prompt conversation produced an output Caleb would use. If not, keep iterating at level 1.
2. Ask the agent to convert the conversation into a skill with a dictated brief: what it should take as input, what it must output, where outputs go, how fast it should be.
3. Review the generated SKILL.md. Check the description includes the trigger situations. Delete anything that is exploration residue.
4. Ask it to install the skill in the discoverable location (`.claude/skills/` for the project, `~/.claude/skills/` if it should be global).
5. Open a fresh session with no history. Invoke the skill on the original input. Compare against the winning output.
6. Run it on 3 new realistic inputs as parallel sub-agents.
7. After each run that was slow or wrong, feed the failure back and have the skill patch itself.
8. Record the skill in the course folder's COURSE-NOTES or AIRE README so Caleb knows it exists.

## Templates / prompts

Conversion brief:

```
This is fantastic. Convert everything we just did into a skill.
Input: [a transcript file / a pasted post / a listing address].
Output: [the asset], saved to [folder pattern], then [deployed / opened for me].
Prune all the back and forth. I want the bare-bones checklist that works every time.
Install it where other sessions and automations can discover it.
Target run time: a couple of minutes. We already have the templates, so this should be feasible.
When the skill is done, rerun it on [original input] and confirm the quality matches.
```

SKILL.md skeleton the agent should produce:

```
---
name: <kebab-name>
description: <what it does>. Use when <triggers>, especially from an automation or a zero-context task.
---
# <Title>
## Inputs
## Required files (templates, references, assets)
## Workflow (numbered, deterministic)
## Output location and naming (dated folder + slug)
## Deploy / deliver step
## Done criteria
```

Parallel verification:

```
Now that the skill works on [original], create three more realistic inputs and run the skill on each as sub-agents in parallel. At the end give me the three outputs side by side.
```

## Pitfalls Nick calls out

- Writing the skill before the prompt has worked once.
- Leaving exploration and fixes inside the skill. Prune.
- Installing in a place scheduled tasks cannot see.
- Testing only on the input that worked. Three fresh inputs minimum.
- Running steps serially inside the skill when they could be sub-agents.
- Expecting the first version to be hardened. It is not.

## How Caleb should use this

- `listing-kit`: address plus photos in, MLS description, social captions, email and flyer copy out.
- `consult-to-proposal`: consult transcript in, hosted proposal out (see `cx-sales-call-to-proposal`).
- `open-house-followup`: sign-in sheet in, personalized follow-up drafts out (sending needs Caleb's approval).
- `cma-brief`: comps export in, one-page pricing narrative out.
- Keep AIRE skills in the repo's `skills/` so they version with the project and every session can find them.

## Verification

- `SKILL.md` exists with name, description including triggers, and a numbered workflow.
- A fresh session with no history runs the skill by name and reproduces the original output quality.
- Three parallel runs on new inputs complete without Caleb intervening.
- The skill has been patched at least once from a real run's failure.
