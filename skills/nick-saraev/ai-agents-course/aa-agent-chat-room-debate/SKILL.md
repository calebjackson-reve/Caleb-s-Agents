---
name: aa-agent-chat-room-debate
description: Runs a shared chat room (chat.json) where several agents with assigned personas (systems thinker, pragmatist, edge-case finder, user advocate, contrarian) debate a problem in round-robin turns and converge on a synthesis plus disagreements. Use when Caleb says "have the agents debate this", "model chat", "pressure test this plan", "poke holes in my listing strategy / AIRE roadmap / offer", or when a consensus run surfaced ideas that need sharpening.
---

# Agent Chat Rooms (Model Chat Debate)

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapters 15-16
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=4061s and &t=4234s)

## What Nick teaches

Stochastic consensus parallelizes independent answers. Agent chat rooms go a step further: give each
agent a slightly different personality and have them **debate** the same problem. Debating agents
produce "spikier," more nuanced answers because they butt heads, challenge each other's assumptions,
and catch errors. The transcript of the debate becomes a valuable artifact you can hand to an
orchestrator for a final synthesis.

Mechanism:

1. Start with a problem or prompt.
2. Feed it to agents A, B, C (he uses five), all sharing one document, `chat.json`.
3. They cycle through a debate sequence: A speaks, B replies, C replies, repeat.
4. Done naively, quality is low. The spark is giving each agent a distinct opinion and telling it
   not to be afraid to state it.
5. With 10 agents the number of communication paths explodes, and the agents end up highly
   differentiated.

His skill, `model-chat`: "Spawn five Claude instances on a shared conversation room where they
debate, disagree, and converge on solutions. Round-robin turns with parallel execution within each
round. Triggers on 'model chat', 'multi-model debate'" and similar. The five personas: **systems
thinker, pragmatist, edge-case finder, user advocate, contrarian**. The systems thinker opens, the
pragmatist replies, the edge-case finder goes, the user advocate goes, then the contrarian, and the
rounds repeat.

Demo: same TikTok problem. The chat log was saved under `model-chat/latest`. The user advocate
pushed back: "the clean-device-plus-fresh-account fix assumes fingerprinting is the problem. Nobody
has stress-tested the alternative that the content format is mismatched to TikTok's cold-start
algorithm." The synthesis agreed on: run diagnostics first, hook reformatting is necessary but not
sufficient, a 2-to-5-posts-a-day blitz is wrong, fix the Instagram-to-YouTube pipeline regardless.
Disagreements were listed too (stitch/duet is useless, TikTok vs IG is either/or, fingerprinting may
not be the issue). The debate surfaced things consensus did not (optimize for saves not completions,
maybe the category does not exist on TikTok yet, emotional moments). It ended with a recommended
execution plan. He would not rely on it for strategy outright, but it trades a little money for a
lot of ideation time, and enough cycles turn up intriguing outliers.

## Step by step

1. Write the problem and context in a file (or pipe the consensus report in).
2. Reset `chat.json` to empty.
3. Assign five personas (defaults above, or domain-specific ones).
4. Round 1: each agent reads the problem and chat.json, appends one message in persona. Parallel
   within the round, round-robin order across rounds.
5. Run 3 to 5 rounds. Each round, agents must respond to at least one earlier message and state
   agreement or disagreement explicitly.
6. Orchestrator reads the full chat.json and writes `synthesis.md`: agreed points, disagreements,
   surprising insights, recommended execution plan.
7. Save the chat under `model-chat/<timestamp>/` and symlink `latest`.

## Templates / prompts

Skill skeleton:

```
---
name: model-chat
description: Spawn five Claude instances in a shared conversation room where they debate, disagree, and converge on solutions. Round-robin turns with parallel execution within each round. Use when the user says "model chat", "multi-model debate", "have the agents argue about", or "pressure test".
---

## Personas
1. Systems thinker: how the parts interact, second-order effects.
2. Pragmatist: what can be done this week with current resources.
3. Edge-case finder: where this breaks, rare but costly failures.
4. User advocate: how the customer / client actually experiences it.
5. Contrarian: argues the opposite of the emerging consensus, in good faith.

## Rules for every agent
- Read problem.md and chat.json before each turn.
- Append one message as {"round": n, "persona": "...", "message": "..."}.
- State your opinion plainly. Do not hedge. Name whom you are disagreeing with.
- Ground claims in the context provided. Say "unverified" when guessing.

## Rounds
Run 4 rounds. After round 4 the orchestrator writes synthesis.md with:
Agreed, Disagreed, New insights the consensus run missed, Recommended plan.
```

Trigger prompt:

```
Use model chat on problem.md. Five personas, four rounds. Give me the synthesis
and keep the full chat.json.
```

Real-estate persona set (swap in when the topic is a listing or client plan):

```
Listing agent, Buyer's agent, Appraiser, Skeptical seller, First-time buyer
```

## Pitfalls Nick calls out

- Naive debates with no assigned personalities converge on bland agreement.
- Agents without research tools argue from context only, so give them web access when facts matter.
- It is ideation, not a final strategy. Read the disagreements as carefully as the synthesis.

## How Caleb should use this

- Pressure-test a listing presentation or pricing recommendation before meeting the seller: listing
  agent vs appraiser vs skeptical seller personas.
- Debate the AIRE roadmap (what to ship for clients first) with pragmatist, user advocate and
  contrarian voices.
- Stress-test an offer strategy for a buyer in a multiple-offer situation.
- Run after a consensus report to sharpen the top three ideas.
- Five agents times four rounds is real token spend. On API billing it needs Caleb's approval before
  running.

## Verification

- `chat.json` has 5 personas times N rounds of messages, each referencing earlier messages.
- `synthesis.md` lists both agreements and disagreements, and at least one insight not in the
  original problem file.
