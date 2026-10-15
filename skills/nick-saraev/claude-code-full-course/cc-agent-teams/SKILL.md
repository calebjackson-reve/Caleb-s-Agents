---
name: cc-agent-teams
description: Enables and runs Claude Code agent teams (a team lead orchestrating independent Claude instances that share a task board and message each other) for design-variant exploration, parallel research and adversarial code or security review, with Nick Saraev's cost controls. Use when Caleb says "spin up a team of agents", "give me five versions and let them compete", "have agents debate which is better", "audit this whole codebase fast", or asks whether agent teams are worth the token cost.
---

# Agent Teams

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 32 and 33 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=12387s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=12779s)

## What Nick teaches

Agent teams are hyped and misunderstood. They are "more of the same": another way to parallelize, one level above subagents. With subagents one thread splits into N tasks that report back to the caller. With agent teams a team lead agent splits work across teammates, each of which is a whole separate Claude Code instance with its own context window, its own CLAUDE.md, MCPs and skills, and can spawn its own subagents. Teammates post to a shared task list and a shared scratchpad (he compares it to a BBS forum or a mini Reddit) and can message each other directly, not just the lead. You sit outside, nudge the lead, or talk to any teammate directly.

Comparison as he reads it from the docs:

| | Subagents | Agent teams |
|---|---|---|
| Context | own window, results return to caller | own window, fully independent |
| Communication | back to the parent only | teammates message each other |
| Coordination | parent manages | shared task list, self-coordination |
| Best for | focused tasks where one result matters | complex work needing discussion |
| Token cost | low | very high, every teammate is a full instance, about 7x a normal session |

Enabling (experimental at recording time, off by default so nobody burns $10,000 in a day): add to `settings.json` an `env` block with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` set to `1`. He copied the docs page text, pasted it and said "enable agent teams" in bypass mode, and Claude edited his global settings. Two display modes: in-process (Shift+Up / Shift+Down cycles between the lead and each teammate, this is what he uses) and split-pane (one pane per agent, heavy on compute because of constant re-rendering, he avoids it). The terminal UX is much better than the GUI for teams.

Anthropic's recommendations he relays: use Sonnet for teammates, keep teams small (token usage scales with team size), keep spawn prompts focused (everything in the spawn prompt is added to that teammate's context), remember teammates auto-load CLAUDE.md, MCPs and skills, and clean up teams when done.

Three demos:

1. **Design variants.** "I'm designing a simple personal website for Nick Saraev. Generate three agents using a team and create three fundamentally different designs. Open all three once done and I'll compare, contrast and give feedback. Make sure they know everything there is to know about me so nobody is waiting on anything." The lead researched him first on its own, then spawned Design Minimalist, Design Dark and Design Warm, and shut them down when done. Each teammate used roughly 50 to 58K Sonnet tokens while the lead used about 2K Opus. He picked the warm one and asked for three research teammates (design principles, copywriting principles, high quality creator sites like Ali Abdaal, Hormozi, Dan Koe, Justin Welsh) followed by iteration teammates (iterate dark, iterate conversion, iterate scroll, editorial). Then he chose one and spun up four more iterations with screenshot ability and real photos. His framing: you thoroughly explore the space of possible sites instead of stopping at the first. The missing screenshot ability showed up as a broken button, so update CLAUDE.md to grant it.
2. **Codebase security audit (his top recommended use).** He cloned OpenClaw (an open source repo) and prompted: "There are a bunch of security issues. First create a team with 10 teammates to look through the codebase quickly, split logically by file size. Then spin up four agents to document all the security issues and a fifth and sixth debate agent that play devil's advocate back and forth. Use Sonnet for each teammate for the longer context window. When you've identified all the security issues, spin up one agent per issue to make changes. Ensure each agent works only on its issue to minimize overlap, and if one steps on another's toes have them rectify by talking back and forth." Ten scanners covered 35K to 83K lines each. Then focused agents (command injection, auth, path traversal and SSRF, crypto and race conditions) plus Devil 1 (argues findings are not real) and Devil 2 (argues they are real). They debated in rounds, the lead chimed in, 15 flaws were agreed, 15 fixer agents were about to spawn. He hit 1.3 million tokens and roughly $80 in about 15 minutes and typed "SHUT everything down ASAP." Shutdown is not instant, in-flight queries finish first.
3. **Product ideation pattern (described, not run).** Five agents propose product angles, debate agents argue against each, consensus improves the result. Adversarial pairs produce higher quality, like GANs in image generation.

His verdict: agent teams are "a nuclear weapon aimed at your wallet." Worth it when you are trading money for weeks of human research time. Not worth it for routine tasks. Set limits.

## Step by step

1. Confirm the budget first. Estimate 7x a normal session and set a hard stop.
2. Enable: paste the docs page or add the env setting, restart.
3. Use the terminal, in-process mode. Fast mode optional.
4. Write one prompt that defines: team size, model (Sonnet) for teammates, how to split the work, what each returns, and when to shut down. Give teammates all context up front so nobody waits.
5. Monitor with Shift+Up / Shift+Down. Watch token counts per teammate. Idle seconds mean wasted spend.
6. Review outputs, pick, iterate with a smaller follow-up team if needed.
7. "Shut everything down" when done. Confirm all teammates are stopped.

## Templates / prompts

settings.json (as he described it):

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Variant exploration (Caleb version):

```text
I'm designing a landing page for my listing at [address]. Create a team of three Sonnet teammates and have each build a fundamentally different design (minimal luxury, warm Southern, bold modern). Give them the listing sheet in /data and the brand rules in rules/, so nobody waits on anything. Each must screenshot its own page before finishing. Open all three when done, then shut the team down. Budget: stop if we pass [N] tokens.
```

Review with debate:

```text
Create a team of 4 Sonnet teammates to review the AIRE follow-up scripts for privacy and correctness, split by file. Then one teammate argues the findings are not real problems and one argues they are. Report the agreed list with severity. Do not make changes. Shut down when the list is delivered.
```

Emergency stop:

```text
SHUT everything down ASAP.
```

## Pitfalls Nick calls out

- Spinning up unlimited agents without the money to pay for them. Tokens are not refundable.
- Split-pane mode hammering the CPU.
- Teammates idle while waiting on the lead.
- Not granting screenshot or verification ability to design teammates.
- Assuming shutdown is instant.

## How Caleb should use this

- Three to four design variants of a listing page or the AIRE dashboard, pick one, iterate once. Keep teams at three or four.
- A one-time audit of the AIRE codebase for client-data handling before anything goes live, with the debate pair to cut false alarms.
- Content angles: five teammates propose listing descriptions or seller letter angles, two debate, lead returns the top three.
- Every agent team run costs real money and needs Caleb's approval on a budget before running. Default to subagents for routine parallel work.

## Verification

- Teammates appear with Shift+Up / Shift+Down and show their own token counts.
- The lead reports each teammate's completion and confirms shutdown with no agents still running.
- Deliverables are concrete files or a findings list, not chatter.
- Total spend stayed under the agreed budget (check `/cost` and the account usage page).
