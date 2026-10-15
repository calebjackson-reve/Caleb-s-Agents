---
name: cc-verify-loop-and-parallel-tabs
description: Applies Nick Saraev's core Claude Code building philosophy: every job runs as task, do the task, verify the result, and you keep several Claude instances busy in parallel without context-switching yourself to death. Use when Caleb asks "why is Claude's output not what I wanted", "how do I make Claude check its own work", "can I run several Claude windows at once", "how many tabs should I run", or any build where the output can be tested by screenshot, script or test suite.
---

# Task, Do, Verify Loop and Running Parallel Instances

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 10 and 11 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=2080s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=2507s)

## What Nick teaches

The core building philosophy: give Claude a high level task, let it do the task, then let it verify or judge its own result. Most people who "suck at Claude Code" run a loop of task, do, task, do, with no verification step. Without a way for Claude to check itself (a screenshot tool for visual work, automated tests for software, test driven development for backends) you lose most of the value of AI.

Why: AI is not valuable because it one-shots at 100%. Humans are more precise on the first try. AI is valuable because it is fast. It gets to 80%, checks, gets to 90%, checks, 95%, and reaches 100% after three or four time steps that take about five minutes. A human doing the same job gets closer on the first try but takes five hours. The machine's ability to test and retest orders of magnitude faster than we do is the real value. His summary line: "carve out the river and give it a boat." If you are ever wondering why you are not getting the results you want, check whether a verification loop exists.

How verification shows up in practice:

- Design: screenshot the output, compare to the reference, list differences, fix.
- Backend or scripts: write tests, run them, fix failures (later formalized as a QA subagent, see `cc-subagents-research-review-qa`).
- Skills: run the skill, check the output, and have Claude update the skill so the next run does not repeat the problem.

Parallel instances: because you can run as many Claude instances as you have tokens, he opens a second Antigravity window and builds two sites at once. He later shows a terminal layout for five, ten or twenty. His rules of thumb:

- The number one thing you do not want is Claude sitting idle waiting for you.
- If Claude is waiting on you more than 10 to 20% of the time, you have too many tabs.
- He personally caps at three or four, depending on how intellectually heavy the work is.
- Close the file explorer panel, keep chat on one side and the output on the other, and orchestrate from a step back.
- He uses a hook that plays a chime when a session finishes so he knows which window to return to, and suggests different chimes per window. (He mentions the hook lives in `settings.json` but the course transcript does not show the configuration itself.)
- While a long build runs, go do something else (he went and marinated salmon) and come back when it is done.

## Step by step

1. Before starting any build, name the verification mechanism out loud in the prompt or CLAUDE.md: screenshot compare, test suite, a script that reads the output, or a checklist Claude must tick.
2. Give the high level task. Do not micromanage the steps.
3. Require Claude to run the check and report what it found and what it changed before saying done.
4. Look at the result yourself once. Give feedback in batches, not one item at a time.
5. If the task will take more than a couple of minutes, open a second instance on a different task. Stop adding instances when you notice idle sessions waiting on you.
6. Add a completion notification so you are not polling windows.

## Templates / prompts

Verification clause to append to any build prompt:

```text
Before you report done: verify your own result. For visual work, screenshot the output and compare it to the reference, list differences and fix them. For scripts, run them on the sample input in /samples and show me the output. Repeat until it passes, then summarize what you checked.
```

CLAUDE.md workflow rule:

```markdown
## Workflow
- Every task ends with a verification step you ran yourself. Never report done on untested work.
- Show the evidence: the screenshot path, the test output or the generated file.
```

Completion chime hook (standard Claude Code hook format, not shown in the course, placeholder command):

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command", "command": "afplay /System/Library/Sounds/Glass.aiff" } ] }
    ]
  }
}
```

Use a different sound file per workspace so each window has its own chime.

## Pitfalls Nick calls out

- Task, do, task, do with no check in between.
- Expecting a one-shot. Plan for three or four passes.
- Watching Claude work. The value of watching is low. Go do something else.
- Too many parallel tabs leads to heavy context switching and idle sessions.
- Forgetting which window needs you. Use a chime.

## How Caleb should use this

- Listing marketing: have Claude screenshot every page and flyer it generates and compare to the brand reference before showing Caleb.
- AIRE follow-up drafts: have Claude run the draft generator on three sample leads and show the output, then check tone against the voice rules.
- CRM cleanup scripts: require a dry-run on a copy of the export with a before and after count.
- Run two or three instances: one on a listing page, one on a follow-up script, one on research. Stop adding when one goes idle.
- Anything that sends or publishes still needs Caleb's approval before running, verification loop or not.

## Verification

- The session log shows an explicit check step (screenshot, test run or dry-run output) before "done".
- Output quality is noticeably higher on the second and third passes than the first, and you did not have to point out the obvious issues.
- Across your open instances, fewer than one in five is idle waiting on you at any moment.
