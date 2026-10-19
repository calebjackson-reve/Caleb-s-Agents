---
name: aw-hooks-notifications
description: Sets up Claude Code hooks that play a chime or system notification when an agent finishes a task or needs a human, so Caleb can run long workflows and background tasks in other tabs without wasting time, and explains why to watch the first runs of a workflow end to end. Use when Caleb says "notify me when it's done", "play a sound when it finishes", "I keep forgetting to check back", "set up a hook", "run this in the background", or when AIRE workflows take more than a minute and Caleb is juggling showings or calls.
---

# Hooks and Notifications

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 29 and 30
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=14977s and &t=15116s)

## What Nick teaches

**Watch the first runs.** For the first 10 or 15 runs of a new workflow, watch it work end to end.
Watching the reasoning for one or two executions teaches you more about what the model is really
doing than three days of autonomous runs, and you build intuition for how models think, which he
considers the single most important skill right now. It is also easy to spot reasoning going
sideways ("wait, maybe I should use this approach") and press stop, then say "sorry, it's actually
Y." That co-creation cuts iteration time from weeks to minutes.

**Long workflows.** His video-editing workflow runs 45 minutes of ffmpeg. He does not watch that. He
opens an extra agent window and uses background tasks (Claude introduced them, other providers
vary). Then he sets a hook to play a sound when the task finishes so his attention comes back at the
right moment. Native system notifications also work, but he finds sounds more reliable because he
gets a lot of notifications.

**What hooks are.** Hooks connect to specific points in the workflow: shell commands that run in
response to events like a tool call or a task finishing. Claude has good documentation on hooks and
most people who built hooks did so with Claude. Common uses: play a chime when the workflow finishes
so you check output, and play a different sound for human-in-the-loop "action required" steps.

**The demo.** Prompt: "I'd like you to set me up a hook that plays a nice chime sound every time one
of my agents is done with a task. That way I'll know to go back, because I normally have you
alt-tabbed while doing other things." The agent recognized this as a Claude Code hook, researched,
wrote a script, added the hooks configuration with a "glass" sound. The chime did not fire in the
current session, so he started a new Claude Code instance ("hey, how's it going"), and it chimed. He
then opened five instances, sent "write me a funny poem" to all, and got five chimes. The point:
when juggling multiple agents, most wasted time is the gap where the AI is waiting for your next
instruction. A chime closes that gap and doubles the return on your time.

## Step by step

1. Ask the agent to create a hook that plays a sound when a task completes. Describe when you want
   it (every completion, or only when input is needed).
2. Let the agent research the Claude Code hooks docs and write the config and script.
3. Restart Claude Code. Hooks load on a new session.
4. Send a trivial message and confirm the chime.
5. Optionally add a second hook with a different sound for permission prompts or "needs input" events.
6. For long scripts, run them as background tasks in a second pane and rely on the chime.
7. Still watch the first 10 to 15 runs of any new workflow before trusting the chime alone.

## Templates / prompts

```
Set me up a Claude Code hook that plays a short chime every time you finish
a task, and a different sound when you need my input or a permission.
Research the hooks documentation first. Put the config in this workspace's
.claude/settings.json and tell me when to restart.
```

Example shape of the config the agent will produce (macOS sound, adjust per OS):

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command", "command": "afplay /System/Library/Sounds/Glass.aiff" } ] }
    ],
    "Notification": [
      { "hooks": [ { "type": "command", "command": "afplay /System/Library/Sounds/Ping.aiff" } ] }
    ]
  }
}
```

Background task prompt:

```
Run the listing video export in the background. Chime when it's done. I'll
keep working in the other pane.
```

## Pitfalls Nick calls out

- Expecting the hook to fire in the session that created it. Restart first.
- Letting long runs sit unnoticed. The idle gap is the real cost.
- Skipping the watch phase. You lose the chance to catch wrong reasoning early and learn how the model thinks.
- Relying only on system notifications when you already get many. Sounds cut through.

## How Caleb should use this

- Chime on completion for lead-list builds, CMA packages and marketing exports so Caleb can be on a
  call and still come back at the right moment.
- A distinct "needs Caleb" sound for approval gates (an email or text waiting for the go-ahead).
- Run slow exports (video walkthroughs, bulk PDF generation) as background tasks in a second pane.
- Hooks are local and free. They send nothing externally.
- Watch the first runs of any new AIRE workflow live, especially ones that touch the CRM.

## Verification

- After restart, a trivial message produces the chime.
- The "needs input" sound fires on a permission prompt or clarifying question.
- Five parallel instances each chime on completion.
- The hook config lives in the workspace's Claude settings and survives a new session.
