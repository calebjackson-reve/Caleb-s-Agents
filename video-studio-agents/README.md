# Video Studio Agent Pipeline

Four agents that plan, research, design and blind-judge an AI video editing setup for Caleb's real estate content. Built for Claude Code on the Mac mini. Drop the `agents/` folder into `.claude/agents/` in the project.

## The loop

```
Caleb's goal
    |
    v
[1] video-planner  ---> plan.md (brief, constraints, success criteria, research questions)
    |
    v
[2] video-researcher ---> research.md (tool survey, scored, recommended stack, costs, sources)
    |
    v
[3] video-designer ---> design.md + dashboard mockup (screens, flow, states)
    |
    v
[4] video-judge (ROUND 1, blind) ---> verdict-round1.md
    |
    v
revise plan/stack/design per verdict  ->  build the workflow  ->  run one real listing through it
    |
    v
[4] video-judge (ROUND 2, blind) ---> verdict-round2.md (judges the built thing + test output)
    |
    v
Caleb approves or sends back
```

## The blind rule (what makes the judge honest)

The judge is spawned fresh each round and is handed ONLY the files in `handoff/`:
- `plan.md`, `research.md`, `design.md`, the mockup, and in round 2 the test-run output (video, captions, timeline export).
- NEVER the conversation transcript, the planner/researcher/designer reasoning, or any message saying who built what or how.

If the judge asks how something was made, the answer is "not available, judge the artifact." If the judge can see the build process it starts grading effort instead of results.

## Files every agent writes

Each agent separates three sections at the top of its output:
- **Confirmed** (verified by source, test or spec)
- **Historical / context** (true at some point, may have changed)
- **Inference** (the agent's judgment)

No em dashes, no corporate filler.

## Running it

In Claude Code:

```
> Use the video-planner agent. Goal: an AI-first video editing setup on this Mac mini for listing reels, market updates and client videos. Write handoff/plan.md.
> Use the video-researcher agent on handoff/plan.md. Write handoff/research.md.
> Use the video-designer agent on handoff/plan.md and handoff/research.md. Write handoff/design.md and the mockup.
> Spawn a fresh video-judge agent. Give it only the files in handoff/. Write handoff/verdict-round1.md.
```

Nothing publishes, spends or sends without Caleb's explicit approval.
