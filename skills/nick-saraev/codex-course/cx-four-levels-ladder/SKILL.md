---
name: cx-four-levels-ladder
description: Takes any business task up Nick Saraev's four levels, prompt, agent skill, local automation, cloud automation, in that order, with the right checkpoint at each rung. Use when Caleb says "turn this into something that runs itself", "make this repeatable", "schedule this", "put this on autopilot", "this should run without my laptop on", or is about to build a skill or scheduled task before he has made the thing work once by hand.
---

# The four levels: prompt, skill, local automation, cloud automation

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 4 (https://www.youtube.com/watch?v=DJZISqryDfw&t=1896s), applied across chapters 5 to 9

## What Nick teaches

Every business task in the course moves through the same four levels, always in this order:

1. **Level 1, Prompt.** An ironclad prompt that does the thing once. This is exploration: try templates, tweak, pick what works. Nick spends 20 to 30 minutes here per system and considers that normal. "Most issues I see with skills are because people put the cart before the horse. They don't do the prompt before the skill."
2. **Level 2, Skill.** Take everything that worked and systematize it so you or anyone on the team can do it again. A skill is a folder with a `SKILL.md` (instructions) plus optional `scripts/`, `references/`, `assets/`. It prunes the back and forth into a bare-bones checklist the model follows the same way every time. Invoked with a slash command or by name.
3. **Level 3, Local automation ("Automation L").** The button presses itself, on your computer. A scheduled task (Nick calls this a "heartbeat") that runs every N minutes or at a set time, checks a folder, inbox or API, and runs the skill on anything new. Constraint: the computer has to be on.
4. **Level 4, Cloud automation ("Automation C").** Same button, now on someone else's server, fired on a schedule or by a webhook event. Anyone on the team or on the internet you allow can use it. Nick calls this "the final boss of automating business tasks".

Nick's reasoning: show yourself how to do it, then systematize it, then run it on a schedule or trigger, then make it generally available. This is the same flow he used five or six years ago before AI coding tools, and Codex is just the tool.

A later observation from chapter 8: once you have done this a few times, the whole ladder can itself become a meta skill. "Start by asking me a bunch of questions, then I prompt you, that turns into a skill, then local, then cloud. I just brain dump an idea and you go."

### Translating to Claude Code

| Level | Codex (as shown) | Claude Code equivalent |
|---|---|---|
| Skill | `~/.codex/skills/<name>/SKILL.md` or `.agents/skills/` | `.claude/skills/<name>/SKILL.md` (project) or `~/.claude/skills/` (global) |
| Local automation | Codex "Scheduled" tasks / heartbeats | Claude Code scheduled tasks (`/loop`, scheduled task tools) or a cron job that runs `claude -p "/skill-name ..."` |
| Cloud automation | Codex Cloud environment + GitHub + cloud scheduled task | Claude Code remote scheduled task with `create_new_session_on_fire`, or a cloud worker (Netlify function, Modal) that calls the skill |
| Plugins | Codex plugins drawer | MCP servers and connectors |

## Step by step

1. **Prompt.** Dictate a context-rich description of the goal. Generate several variants (see `cx-variant-sampling-prompting`). Iterate until the output is something Caleb would actually send or use. Keep a copy of the inputs that worked.
2. **Checkpoint.** Ask: did it work end to end at least once on a realistic input? If no, stay at level 1.
3. **Skill.** Convert the winning path into a skill (see `cx-prompt-to-skill`). Rerun on the original input and confirm equal quality. Then run on 3 fresh inputs in parallel.
4. **Checkpoint.** Does the skill produce the same quality with zero extra context? If no, fix the skill, not the prompt.
5. **Local automation.** Ask the agent to wrap the skill in a scheduled task with a trigger (folder watch, inbox poll, API poll) and a dedup ledger. Start with a sane interval (every 10 to 15 minutes, not every minute). Run once as a test.
6. **Checkpoint.** Did one real event produce one correct output without Caleb touching it?
7. **Cloud automation.** Ask the agent "how do we turn this into a cloud automation now, give me steps". Pick the plan, set a definition of done, let it build (see `cx-event-automation-local-to-cloud`). Turn the local task off once the cloud one is verified.
8. Add logging or a notification (Slack, email, a dashboard) so Caleb knows when it runs and when it fails.

## Templates / prompts

Ladder kickoff prompt:

```
We are going to build [system] in four levels: prompt, skill, local automation, cloud automation.
We are at level 1. Do not build a skill or schedule anything yet.
Goal for level 1: [one sentence]. Inputs I will give you: [files / transcript / URL].
Generate three different versions so I can pick the best. Ask me for anything you need.
```

Promotion prompts:

```
Level 1 to 2: "This is fantastic. Convert it into a skill. Prune the back and forth into a bare-bones checklist. Install it where other sessions can discover it. Then rerun it on the original input to verify equal quality."

Level 2 to 3: "Turn the [skill] skill into a locally scheduled run every [interval]. Check [source] for new items, keep a ledger so nothing runs twice, run the skill on each new item, and tell me where outputs land. Run it once now as a test."

Level 3 to 4: "How do we turn this into a cloud automation now? Give me steps." Then: "Let's do this. Definition of done: everything on the list completed except credentials, which I will supply. Test everything you can. Where you cannot test, visit the API docs and verify every parameter."
```

Folder layout per system:

```
<system>/
  prompts/          # level 1 experiments and the winning inputs
  skill/SKILL.md    # level 2
  automation/       # level 3 and 4: scheduler config, ledger, logs
  README.md         # what it does, where it runs, how to turn it off
```

## Pitfalls Nick calls out

- Building the skill before the prompt works. Reverse engineer the steps from a working result.
- Polling every minute. It burned usage and heated Nick's laptop. 10 to 15 minutes is enough for most business flows.
- Letting heartbeat chats pile up. Archive or pin so the active work stays visible.
- Leaving local and cloud versions both running. Turn the local one off once cloud is verified.
- Expecting level 4 on day one. Each level is a checkpoint that catches a different class of bug.

## How Caleb should use this

- Seller consult recording to listing proposal: prompt it once, skill it, then watch the call recorder folder, then fire from the recorder's webhook.
- New listing to marketing kit (MLS description, social captions, email blast, open house flyer): same ladder.
- Daily CRM nudges: skill first, then a 6 a.m. local task, then a cloud scheduled task so it runs when the laptop is closed.
- AIRE features should ship up this ladder one at a time. Resist building two level-1 systems at once.
- Levels 3 and 4 run without supervision, so anything that messages a lead or client needs Caleb's approval of the exact template before it is scheduled.

## Verification

- Level 1: one real input produced one output Caleb would use as is or with light edits.
- Level 2: the skill, with no conversation history, reproduces that quality on the original input and on three new ones.
- Level 3: a scheduled run processed one new item, skipped already-processed items, and logged where the output went.
- Level 4: the same happened with Caleb's computer off, and Caleb received a notification or saw it on a dashboard.
