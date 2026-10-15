---
name: cca-model-chat-debate
description: Runs Nick Saraev's "model-chat" debate pattern: several Claude instances share one conversation room, take round-robin turns (parallel within each round), see each other's answers, challenge weak ideas, combine good ones, and converge on a synthesized ranked answer. Use when Caleb says "have the agents debate this", "model chat", "argue both sides", "stress test this idea", "which of these listing strategies actually holds up", "tier these options", or wants nuanced judgment rather than a raw brainstorm.
---

# Model-Chat: Multi-Agent Debate in a Shared Room

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 11 and 12 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=3972s and https://www.youtube.com/watch?v=UPtmKh1vMN8&t=4052s)

## What Nick teaches

Stochastic consensus is independent runs plus a count. Debate goes a step further: feed every agent's output into an open chat room where every other agent can weigh in. Nick divides it into time steps. At T1 agent 1 has A, B, C, agent 2 has B, C, E, agent 3 has A, B, Q. At T2 each agent reads all the others. Agent 1 might add E and Z. Agent 2 might drop E because it no longer makes sense and add F. Agent 3 combines earlier ideas into new ones. Run as many rounds as you like. The final list is more complex, nuanced and interesting than any single agent's first pass, and the search space is covered in a short time because agents reuse each other's reasoning instead of re-deriving it.

He stresses it is not a debate in the persuasion sense ("convince others that A is best"). It is shared visibility: every model sees every other model's results and incorporates them.

**His skill: `model-chat`.** Description as he reads it: spawn five Claude instances in a shared conversation room where they debate, disagree and converge on solutions. Round-robin turns with parallel execution within each round. Triggers on terms like "chat". The skill:

1. Extracts from the user's message the topic or problem, the mode, the number of agents, and the number of rounds.
2. Runs a script he set up that automates each agent reading every other agent's responses each round.
3. Ends with a synthesis.
4. Writes the transcript to `active/model-chat/` with a specific naming convention (the skill itself specifies the dump location, which is how he keeps root clean).

**Live demo.** "Rerun this with model-chat. Make sure at least 10 agents are having conversations about this, and if any of the sauces sound insane or terrible or crazy, have them discuss that as well." The contrarian opened with 15 ideas and immediately challenged the ones that deserved it. Agents listed disagreements: is a technique structurally sound or a restaurant stunt, is tamarind redundant or complementary, does tomatillo chocolate belong, should mole verde be tier one or tier two. The synthesis produced settled conclusions ("the foundational tier is settled and non-negotiable"), rejected ideas (husk tea), and a tiered recommended list.

Like consensus, this trades tokens for time.

## Step by step

1. Start from a question or, better, from an existing list (a consensus report works well as the seed).
2. Choose agents (Nick used 5 by default, 10 in the demo) and rounds (2 to 4 is plenty).
3. Give each agent a distinct stance (contrarian, practical operator, customer advocate, risk officer, first-principles thinker, etc.).
4. Round 1: every agent posts its position in parallel.
5. Rounds 2+: every agent reads the full room, then posts challenges, retractions, merges and new ideas.
6. Synthesis: one final agent writes settled conclusions, rejected ideas with reasons, open disagreements, and a tiered recommendation.
7. Save transcript and synthesis under `active/model-chat/<slug>-<date>/`.

## Templates / prompts

SKILL.md for a model-chat skill:

```markdown
---
name: model-chat
description: Spawn N Claude instances in a shared conversation room where they debate, disagree and converge on solutions. Round-robin turns with parallel execution within each round. Triggers on "model chat", "chat about", "debate", "have the agents argue".
---
# Model-chat
1. Extract: topic/problem, mode (debate | critique | rank), agents (default 5), rounds (default 3).
2. Create active/model-chat/{slug}-{YYYY-MM-DD}/room.md as the shared transcript.
3. Assign stances: contrarian, operator, customer advocate, risk officer, first-principles, (add more as needed).
4. Round 1 (parallel): each agent appends "## {stance} / round 1" with its position and ideas.
5. Rounds 2..R (parallel within round): each agent reads room.md in full, then appends challenges, retractions, merges, new ideas. Must reference at least two other agents by stance.
6. Synthesis agent reads room.md and writes synthesis.md: settled conclusions, rejected ideas with reasons, open disagreements, tiered recommendations.
7. Reply in chat with the top tier and the link to synthesis.md.
```

Invocation:

```
Rerun this with model-chat. At least {N} agents, {R} rounds. If any of these ideas sound weak, risky or just wrong, have them discuss that directly and reach a conclusion. End with a tiered recommendation.
```

Per-agent round prompt:

```
You are the {STANCE} in a shared room discussing: {TOPIC}. Read the full transcript below. Then post: (1) ideas you now challenge and why, (2) ideas you retract from your own earlier post, (3) merges of others' ideas into something better, (4) new ideas nobody raised. Be specific and reference other agents by stance.
```

## Pitfalls Nick calls out

- Debate is not persuasion theater. The goal is shared visibility and refinement, so prompts should ask for challenges and merges, not winning.
- More rounds cost more tokens. Stop when the room stops changing.
- Keep the room file in a specified subfolder so the root stays clean and the skill is reproducible.
- The synthesis should distinguish settled from still-contested, otherwise you lose the nuance you paid for.

## How Caleb should use this

- After a consensus brainstorm on marketing a listing, run model-chat so a contrarian and a budget-minded operator cut the list to what actually works in the St. Francisville market.
- Pricing decisions: agents argue list-high-and-reduce versus price-to-market versus price-under-to-drive-multiple-offers, with a risk officer weighing days-on-market exposure.
- AIRE design choices: debate text-first versus email-first follow-up for new buyer leads, or which CRM to build on, before Caleb commits build time.
- Offer negotiation prep: stances for seller, buyer, lender, inspector, then synthesis of likely sticking points.
- Pure reasoning, no external actions, no approval gate. Anything that then contacts a client needs Caleb's approval before running.

## Verification

- `active/model-chat/<slug>-<date>/room.md` shows multiple stances across multiple rounds, with later rounds referencing earlier posts.
- `synthesis.md` has settled conclusions, rejected ideas with reasons, open disagreements, and tiers.
- At least one idea from round 1 was challenged or dropped by round 2. If nothing changed, the stances were too similar.
