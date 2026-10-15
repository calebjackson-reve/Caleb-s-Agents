---
name: cca-agent-teams-consensus-build
description: Uses Claude Code's agent teams feature to run Nick Saraev's full improve-and-ship loop on a real app: a team of analyst agents with different framings reaches consensus on next features and bugs, the team lead implements with agent teams, then spawns reviewer agents (bugs, features) that report back before shipping. Also covers the sequential pipeline (dev, then bug fixer, then QA) as specialists. Use when Caleb says "use agent teams", "improve this app with a team", "have a team build and review this", "turn this prototype into a real app", or wants an AIRE dashboard, landing page, or tool upgraded end to end.
---

# Agent Teams: Consensus, Implementation and Review in One Loop

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 13, 14 and 15 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=4157s, https://www.youtube.com/watch?v=UPtmKh1vMN8&t=4295s, https://www.youtube.com/watch?v=UPtmKh1vMN8&t=4618s)

## What Nick teaches

Agent teams are the streamlined, built-in way to do what consensus and debate do by hand. They cost more tokens but the team lead orchestrates everything, and because teammates can talk to each other, consensus run through agent teams is effectively debate built in.

**Setup.** Nick runs agent teams in the terminal rather than the IDE extension ("a lot of the advanced stuff is only available in the terminal and agent teams are better managed there"). He mentions Ghostty as his favorite terminal. In the UI, teammates appear at the bottom of the screen. Shift+Down cycles through them, Enter opens a teammate's thread, and you can keep holding Shift and arrow to select between them.

**Demo target.** An algorithmic art generator from Anthropic's algorithmic-art skill (HTML page with sliders for stroke weight, damping, etc.).

**His prompt (cleaned up):** "I'd like you to optimize this and turn it into a full-fledged application. Rather than do this all naively yourself, take advantage of the stochastic multi-agent consensus skill and apply it using the agent teams feature. Orchestrate a team of agents that does all of this. Don't just run what's in the skill as-is, that would be too simple. Read through the whole skill and use it to spawn agent teams."

**What happened:**

1. Lead read the skill definition and the HTML file, then read the agent teams tooling.
2. Created a team for the consensus workflow and spawned 10 analyst agents with different framings, running in parallel.
3. Analysts reported back. The lead aggregated: consensus next features (high-res exports, preset system, URL state and shareable links), bugs (race condition on regenerate, download saves mid-render, height not checked), divergence (6 of 10 wanted debounced regeneration versus live preview), and outliers (mobile layout, live animation mode, seed history, web worker offload, mouse attractor/repeller, kill the sidebar overlay).
4. Lead shut down the analysts and started implementing. Nick nudged: "use agent teams to do the implementation" to speed it up.
5. Lead spawned reviewer agents (reviewer-bugs, reviewer-features). Each sent its review to the team lead, which incorporated it.
6. Result: presets (ocean drift, ember storm, ink wash, neon plasma, neural), color controls, 1x/2x/4x PNG downloads, keyboard shortcuts, speed control. A better app for a few dollars of tokens.

**Pipeline (sequential handoff between specialists).** Task A by an agent specialized for A, handed to agent B specialized for B, then C. Two reasons not to let one agent do all three: the context grows out of the zone of good, and incentives conflict. A developer agent is incentivized to build fast with whatever is available, a testing agent is incentivized to find every problem. Nick's lineup: dev agent, then bug-fix agent, then test or QA agent. Even with Opus everywhere, specialists beat one generalist.

**Meta pattern.** Combine all three: debate or consensus to decide what to improve, fan-out researchers for APIs and design patterns, then a pipeline of dev, bug reviewer, QA.

## Step by step

1. Open the project in a terminal Claude Code session (not the IDE panel).
2. Point Claude at the artifact to improve and at the consensus skill. Ask it to read the skill fully and apply it with agent teams, not run it naively.
3. Watch analysts spawn. Use Shift+Down and Enter to read individual threads if you want.
4. Wait for the lead's aggregate: consensus features, bugs, divergence, outliers. Confirm or trim the list.
5. Say "use agent teams to do the implementation."
6. Make sure reviewer agents are spawned (bugs and features at minimum). If the lead skips them, ask for them.
7. Open the result, test the main flows yourself, and log learnings in CLAUDE.md.

## Templates / prompts

Kickoff:

```
I'd like you to optimize {APP_OR_FILE} and turn it into a full-fledged application. Rather than do this naively yourself, take advantage of the stochastic-multi-agent-consensus skill and apply it using the agent teams feature. Read the whole skill, then orchestrate a team: 10 analyst agents with different framings, aggregate into consensus features, bugs, divergence and outliers, then implement the winning features.
```

Implementation nudge:

```
Use agent teams to do the implementation. Split by feature. When done, spawn reviewer-bugs and reviewer-features agents to review the generated code and send findings back to you before you finish.
```

Pipeline in CLAUDE.md:

```markdown
## Delivery pipeline
Every non-trivial build runs as a pipeline of fresh specialists:
1. dev agent: implements the plan, fast, minimal.
2. bug-fix agent: reads the diff with no prior context, lists and fixes defects.
3. QA agent: tests the user flows from the acceptance list, reports pass/fail.
Never let the dev agent review its own work.
```

## Pitfalls Nick calls out

- Agent teams are convenient but cost more tokens than hand-rolled subagents. Use cheaper models for teammates where the work is extraction, not reasoning.
- Run in the terminal, not the extension panel, for the full feature set (as of his recording).
- The lead will sometimes implement alone after consensus. Tell it to use the team.
- Reused filenames can get clobbered (his earlier consensus output was overwritten). Give skills explicit output paths.
- One agent doing dev, bug fixing and QA together is worse than three specialists, even at equal intelligence.

## How Caleb should use this

- AIRE client dashboard: have analysts reach consensus on the next three features (for example saved searches, showing scheduler, document checklist), implement with a team, then bug and feature reviewers before Caleb opens it.
- Listing landing page template: team consensus on conversion elements, build, then a QA agent checks mobile layout and form submission.
- Open house sign-in app: pipeline of dev, bug fix, QA before it is used at a real open house.
- Any build that deploys publicly or connects to live client data needs Caleb's approval before running the deploy step. Local builds and reviews are fine.

## Verification

- Teammates appear in the session UI and run in parallel.
- Lead's aggregate includes all four buckets: consensus, bugs, divergence, outliers.
- Reviewer agents exist and their findings show up as changes in the final code.
- The app opens and the consensus features work (Nick checked presets, 4x download, shortcuts).
