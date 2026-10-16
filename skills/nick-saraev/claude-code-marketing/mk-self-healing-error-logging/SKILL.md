---
name: mk-self-healing-error-logging
description: Hardens a Claude skill, loop, or routine for unattended production using Nick Saraev's three maintenance moves: collect logins up front so Claude can re-authenticate itself, add a self-healing clause that lets the system rewrite its own instructions after repeated failures, and wire every error to a Slack #errors channel. Use when Caleb says "this routine keeps breaking", "the connector expired again", "I didn't know it failed until Monday", "make AIRE fix itself", "add error alerts", or before any AIRE automation is left to run on its own.
---

# Self-healing systems and error logging

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapter 16 (https://www.youtube.com/watch?v=yulWjh3rq28&t=20145s)

## What Nick teaches

### 1. Get all login and authentication up front
About **70% of maintenance problems** are auth: a service upgrades, the connector breaks, the client thinks the system is dead, calls you at night, and the fix requires getting them on a call to re-authenticate. Less secure but far more practical: hold the root login. Store it in the environment (local for loops, cloud environment for routines):

```
CLICKUP_USER=nick@...
CLICKUP_PW=...
```

Then add a line to the skill/routine: "If auth issue, log in via the stored creds at {{location}}, regenerate the API key, and continue." Claude has a browser and can log into services itself. This is the "debug flow."

### 2. Self-healing (Nick also called it "self-annealing")
Give the model carte blanche to fix and rerun. Translate: let the system rewrite its own instructions. If a step fails more than three times, something material changed (a route moved, a schema changed). The model should investigate, fix, log what it did, and update the skill itself with a change log, so future runs succeed.

Nick's phrasing (he says his exact wording isn't sacred):

> If at any point you run into the same error more than three times, odds are something has materially changed in the systems you are interacting with. Evaluate these changes, explore, and see if you can solve the problem. You have full agency and autonomy. After you've solved it, report back and update your own skill / loop / routine with a change log including the problem and your solution, and update the actual skill itself. Append to this change log as you continue, so we always have a breakdown of what happened and why.

"Copy and paste this into literally every single window." Caveat: occasionally a spurious issue (a weird rate limit) causes an unneeded self-rewrite, but that is far rarer than the model quitting on a temporary error.

### 3. Error logging to where you work
Old drag-and-drop tools (Make.com, n8n) gave you execution history, visible errors on the diagram, and email/push notifications. AI-agent systems don't by default. "we're in an erroring apocalypse." Minimum fix: every production routine logs errors to a dedicated channel in the tool your team lives in (Slack, WhatsApp, Discord).

How Nick wired it:
1. Create a Slack channel `#errors` (his real one is private).
2. Connect Slack under Settings -> Connectors.
3. In a chat: "Send a sample error notification to #errors-public in Slack." Claude posts something like: `Error sample notification. service: invoice chase worker. environment: production. time: ... cannot read properties of undefined. count: 1 occurrence. This is a test message to verify errors are alerting.`
4. "Give me all the info so you don't have to search this channel up again. I will add this to a routine's prompt verbatim." Copy that block.
5. Open the routine, add the Slack connector, paste the block, and append: "If you have any errors, send the error notification to #errors." Save, run manually, confirm the post.
The message format should include: error with X, tried Y to fix, succeeded or failed. Pair with self-healing so the channel shows what was attempted.

Why: a 5:59 a.m. routine failing silently costs the whole morning. With an alert, you have two hours to fix it before anyone needs the output. Routines can also take a **setup script** that runs on every launch.

## Step by step

1. List every service the automation touches. For each, store either a CLI login, a connector, or user/password + API key in the environment (cloud environment for routines).
2. Append the auth-recovery line and the self-healing clause to the bottom of the skill/routine prompt.
3. Add a `## Change log` section at the end of the skill file for the model to append to.
4. Create `#aire-errors` in Slack, connect Slack, send a sample error, copy Claude's "all the info" block into every routine.
5. Run the routine manually once with an intentional fake error ("for this demo pretend there was an error and report to Slack") to verify the alert lands.
6. Review the change log weekly. Revert any self-rewrite that was triggered by a transient issue.

## Templates / prompts

Append to every skill / loop / routine:
```
## Reliability rules
- Auth: if any service returns an auth error, log in with the credentials stored as {{SERVICE}}_USER / {{SERVICE}}_PW,
  regenerate the API key or re-authorize, store the new value, and continue.
- Self-healing: if you hit the same error more than three times, assume something materially changed
  in the system you are calling. Investigate, fix it, and rerun. You have full autonomy to do so.
  After fixing, append an entry to the Change log below (date, problem, root cause, fix) and update
  the instructions in this file so the next run succeeds.
- Error logging: on any error (fixed or not), post to Slack channel {{#aire-errors, channel id}}:
  "ERROR | {{routine name}} | {{env}} | {{time}} | what failed | what I tried | fixed: yes/no".
- Never retry a message send more than once. Never resend a message that already went out.

## Change log
- (model appends here)
```

Test prompt:
```
For this run only, pretend step {{n}} failed with "{{fake error}}". Follow the reliability rules:
attempt a fix, then post the error report to Slack {{channel}}. Do not actually send any
customer-facing messages during this test.
```

## Pitfalls Nick calls out

- Without logging you find out when the person who needed the output walks in.
- Too much self-healing freedom can let a rate limit trigger a bad rewrite. Keep the change log so you can see and revert.
- Cloud routines run slower than local sessions. Budget time before the human deadline.
- Holding client root credentials is a trade-off. Decide it consciously and store them in the environment, never in the prompt text.

## How Caleb should use this

- Create `#aire-errors` in Caleb's Slack (or a WhatsApp/Discord channel if that's where he actually looks at 6 a.m.) and route every AIRE routine there: lead-nurture, listing creative, dashboard refresh, newsletter personalization.
- Store CRM, Gmail, Quo, Metricool, Higgsfield access in the AIRE cloud environment so routines can re-auth without Caleb. Storing any password **needs Caleb's approval before running**.
- Add a stricter rule for messaging routines: a self-healing fix may never change recipient lists, message templates, or send times without Caleb's sign-off. Log the proposal instead.
- Weekly: read the change logs across AIRE skills. They are also documentation for anyone Caleb brings on later.

## Verification

- A manual test run with a fake error produces a Slack post in the right channel with routine name, time, what failed, what was tried.
- The skill file has a Change log section and at least one real entry after the first self-fix.
- An expired token on one service is recovered by the routine without Caleb touching it (check the change log entry).
