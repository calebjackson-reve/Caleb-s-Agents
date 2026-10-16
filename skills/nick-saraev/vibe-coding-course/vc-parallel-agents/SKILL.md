---
name: vc-parallel-agents
description: Runs several Antigravity or Claude Code agents at once using the Agent Manager, Playground and Inbox so you build 2 to 4 app variants or work on separate parts of one app in parallel, then keep the best and drop the rest. Use when Caleb says "build three versions and I'll pick", "can it work on the landing page while it fixes the scraper", "I'm waiting on the agent too much", "generate a bunch of listing page designs", "orchestrate multiple agents", or has two independent AIRE tasks and wants both moving at the same time.
---

# Parallel agents: Agent Manager, Playground and Inbox

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 30-31, 34 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=9734s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=10380s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=10933s)

## What Nick teaches

The simplest multiplier is running separate conversations simultaneously instead of waiting for one to finish before giving the next instruction. Antigravity (and Claude Code) build this in.

### Agent Manager (top right)
- Zooms out of a single workspace to a bird's-eye view of **every workspace and every conversation** in it. Open any in the editor (Cmd+E), start new conversations across workspaces.
- **Inbox** (Cmd+I): a list of every message the agents send you. Use the **Pending** filter with approval-required steps and you get one queue of "do you want me to do X?" from 20 agents. Nick's analogy: a security guard watching several CCTV screens, or a manager walking the cubicles and stepping in only when someone needs them.
- **Playground**: an independent temporary workspace "for quick prototypes or following curiosity." New instance with Ctrl+N. Paste the same prompt into 3 or 4 playground conversations and they each scaffold a separate folder and build in parallel. When you like one, click **move to folder** to give it a real destination.
- **Follow along with agent** (top right) pulls you into whatever the agent is doing step by step. Nick usually does not use it, he just checks the inbox.
- Errors like "agent terminated due to error" (token limits, API outages, rate limiting, packages fighting the terminal) show up in the list, just reply to resume.

### Nick's actual usage
- "Instead of just building one app, I will usually build two or three apps simultaneously... then I pick the version I like the best, drop the other ones and proceed with that one." He has built up to 15 websites at once and kept the top 2 or 3, in 10 to 15 minutes.
- Recommended ceiling: **two or three** concurrent agents. Four or five pulls your attention too thin (context switching cost). Per-unit speed is the same, total throughput multiplies.
- Variation: give the prompt inherent randomization ("randomly select a background from this service", "come up with a different style archetype every time") so the variants differ instead of all being "high-end SaaS."
- Working on one app in parallel (lead scraper): one agent debugging the Apify integration while a second agent rewrote landing page copy. The guard rail in the second prompt: "**Only modify the landing page. There are other agents currently working on other sections of the website. Do not modify anything that is not the landing page. Also, you don't need to rebuild.**" He monitored both via the inbox.
- Cross-model parallelism: Gemini designs the landing page while Claude Code writes the spec, or Claude runs the security audit while Gemini mobile-optimizes.
- Cost warning: "it's always a trade-off between the time it takes to build something and the total cost. This is a straightforward money for time trade."

### Hotkeys (mouse over each button to see them)
- Inbox: Cmd+I
- New playground instance: Ctrl+N
- Back to editor for the current conversation: Cmd+E
- New conversation in a workspace: Cmd+Shift+L

## Step by step

1. Write one prompt. If you want variants, add a randomization clause. If you want division of labor, write one prompt per area with an explicit "only touch X, other agents are working on Y" line.
2. Open Agent Manager > Playground (variants) or your workspace (division of labor). Ctrl+N two or three times, paste, send.
3. Live in the Inbox with the Pending filter. Approve, answer questions, reply to terminated agents.
4. When builds finish, open each dev server URL and compare. Keep the best, move it to a real folder, close the rest.
5. For division of labor, after both finish run the app once end to end to catch overlap.

## Templates / prompts

Variant prompt (paste into N playground chats):
```
[paste GEMINI.md landing-page prompt or app brief]
Choose all archetype and typology answers yourself. Randomly select a
different aesthetic archetype and a different background treatment than
you would by default. Target: high-end real estate brokerage feel.
This is one of several variants for a demo, so be bold.
```

Division of labor guard rail:
```
Only modify the landing page. There are other agents currently working on
other sections of the app (the Supabase integration and the scraper). Do
not modify anything that is not the landing page. You don't need to
rebuild or restart the dev server.
```

Parallel pairing that worked for Nick:
```
Agent A (Gemini): debug the third-party API integration
Agent B (Gemini): landing page copy, six value-prop cards, pricing section
Agent C (Claude Code): security audit, read only
```

## Pitfalls Nick calls out

- More than three concurrent agents hurts quality of attention.
- Two agents editing the same files collide. Scope each one by file or section.
- Tokens multiply with agents. A parallel variant run is a conscious spend.
- Variants from the same prompt converge on the same look unless you force randomization.
- Rate limits hit sooner when you fan out.

## How Caleb should use this

- Listing page designs: three variants in the Playground, pick the one that fits the property, deploy. Needs Caleb's approval for the token spend if running more than three.
- AIRE split work: one agent on the lead follow-up email templates, another on the dashboard UI, a third auditing. Scope each by folder.
- Marketing content: parallel agents drafting Instagram, Facebook and email versions of a new listing announcement from the same brief, then Caleb picks.
- Keep the Inbox open on a second monitor while doing showings-related admin.

## Verification

- Agent Manager shows the expected number of active conversations, each with its own folder.
- Inbox Pending filter surfaces approval requests from each agent.
- Scoped agents only changed files in their area (check the Changes overview of each).
- You ended with one chosen variant moved to a named folder and the others closed.
