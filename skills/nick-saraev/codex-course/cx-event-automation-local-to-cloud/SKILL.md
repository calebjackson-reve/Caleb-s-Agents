---
name: cx-event-automation-local-to-cloud
description: Turns a verified skill into an automation that runs without Caleb, first a local scheduled "heartbeat" that polls a folder or inbox with a dedup ledger, then a cloud version fired by a webhook from a call recorder or on a schedule, built in goal mode with a definition of done and a token-protected dashboard. Use when Caleb says "run this every morning", "every time I finish a call", "fire this from a webhook", "this should run when my laptop is closed", "set up a scheduled task", or wants Fathom, Zoom, Gmail, the CRM or a form to trigger AIRE automatically.
---

# Event automation: local heartbeat to cloud webhook

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 6 (https://www.youtube.com/watch?v=DJZISqryDfw&t=4098s), with the cloud environment setup from chapter 7 (https://www.youtube.com/watch?v=DJZISqryDfw&t=5284s) and chapter 8

## What Nick teaches

### Level 3: local automation

Nick's ask: "a webhook URL I can send a transcript to that automatically triggers the skill. Locally first. Assuming it works, I'll put it on the cloud. Let me know if I need to give you anything." He insisted on the app's native automations feature over the leaner headless worker the model proposed, because it is clearer for non-engineers (the worker is a valid hardening step later).

What the model built: a Zoom local-recordings collector, a free local transcription step (MLX Whisper instead of the paid tool the model first suggested, "never take it as one shot, keep asking for alternatives"), and a scheduled task called **proposal inbox dispatcher** that runs every minute, looks for new transcripts, and runs the skill on each.

Nick immediately corrected the interval: every minute is "crazy overkill," it will burn the usage limit in hours and it made his computer hot. He changed it to **15 minutes**. The skill takes about 2 minutes, so worst case is about 17 minutes and median about 7, which is fine for a proposal. He calls these recurring tasks **heartbeats**. They pile up in the chat list, so archive finished ones and pin the chats that are not heartbeats.

He tested by recording a real Zoom call and watching a proposal appear. Variants he lists: only pick up sales calls (they land in a different folder), produce a recap page instead of a proposal, analyze all calls for sales tips, capture serendipitous details (birthdays, pet names) into the CRM for follow-ups.

### Level 4: cloud automation

"You don't have to figure this out yourself. Ask the agent: how do we turn this into a cloud automation now? Give me steps." Nick says he does not know the answer about half the time. He reads the plan and extracts the nuggets. About 30% of plans he likes as is.

The plan: a call recorder with webhooks (he chose **Fathom**), a Netlify-hosted endpoint that accepts the webhook, a cloud worker that runs the generation, and a results surface. He accepted it and switched on **goal mode** (`/goal`), which lets the agent work unsupervised as long as it takes, with a **definition of done**:

> Everything on this list completed except the credentials, which I will do. Test everything you can. Where you cannot test because you lack credentials, visit the API documentation of each service and verify every input item, object, query parameter.

The agent produced a five-step plan (inspect assets, build intake plus job state and status endpoints, package the cloud worker and integration contract, add config tests and deployment verification, document credential setup and the provider handoff) and ran it while Nick set up Fathom: Settings, API access, generate API key (named "codex"), copy the webhook secret, add webhook with the destination URL the agent gave him, event type "transcript", "my recordings". The agent asked once whether to use a Netlify background function. Nick: "I don't fully know what that is. I just want the job done. Proceed."

Testing: a 2-minute fake Fathom call about "Emily Waters at Rightclick International, $8,500 / $12,000 / $14,500 packages, SEO across three websites, AI optimization, email, cold outbound, ads." Then: "go check the API, make sure that recording was sent to our service, then tell me where proposals get dumped. I don't have Slack, email is fine, or a page I can check." The agent found 16 transcripts in Fathom, verified delivery, and built a **proposal inbox** page gated by a **dashboard token** so visitors to the URL see nothing without it. The proposal was generated correctly. Only "prepared by" and "valid until" were missing because the 2-minute call never covered them. Fix: hardcode the salesperson or pull it from the meeting event.

Upgrades Nick suggests: log every run to Slack and drop the proposal into the chat for accountability, add an edit flow to the page.

### Cloud environment setup (chapter 7)

To run scheduled tasks in the cloud, Codex needed a cloud environment: connect GitHub (MFA required), pick the repo, give it access, then "turn this into a cloud scheduled task, run exactly as it ran locally at 5:59 a.m. but in the cloud. Tell me what to configure on my end." The agent set up the cloud task, ran a readiness check for the connected tools and persistent ledger, and launched a test run. Nick's note: he never used the settings UI himself. He told the agent to do it, and when it claimed it could not, he said "yes you do, proceed."

### Claude Code mapping

- Local heartbeat: a Claude Code scheduled task that fires into the session on a cron (`CRON_TZ=America/Chicago */15 * * * *`), or a system cron running `claude -p "/skill-name process-new"`.
- Cloud: a scheduled task with `create_new_session_on_fire` in a cloud environment, or a webhook watcher (`watch_url`) that wakes the session when the recorder posts. For a true always-on endpoint, a Netlify or Modal function that queues jobs and a worker that runs the skill.

## Step by step

1. Confirm the skill works in a fresh session (see `cx-prompt-to-skill`). Do not automate a flaky skill.
2. Define the trigger source: folder, inbox, CRM stage change, recorder webhook, or a clock.
3. Ask for a local scheduled run. Specify: interval (10 to 15 minutes, or a daily time), the dedup ledger, where outputs go, and a one-time test run.
4. Run the test with one real event. Check the output and that the ledger prevented a rerun.
5. Ask "how do we turn this into a cloud automation now? Give me steps." Read the plan. Keep what makes sense.
6. Enter goal mode with a definition of done that excludes only credentials and requires API-doc verification where testing is impossible.
7. While it builds, create the external accounts (recorder webhook, hosting, GitHub connection). Paste the endpoint URL the agent gives you into the provider.
8. Trigger one real event. Ask the agent to verify delivery end to end through the provider's API.
9. Set up the results surface: token-gated dashboard, email, or Slack post per run.
10. Turn off the local heartbeat. Note in the README how to pause the cloud one.

## Templates / prompts

Local automation request:

```
Now that this is a verified skill, turn it into a locally scheduled automation.
Trigger: check [folder / inbox / API] every 15 minutes for new [transcripts].
Keep a persistent ledger of processed items so nothing runs twice.
For each new item run the [skill] and save the output to [folder], then [notify me / open it].
Use the native scheduled tasks feature, not a custom daemon. Run it once now as a test.
```

Cloud promotion with definition of done:

```
How do we turn this into a cloud automation now? Give me steps.
[review]
Let's do this. /goal
Definition of done: everything on your list completed except credentials, which I will supply.
Test everything you can. Where you cannot test without credentials, visit the API documentation for each service and verify every input, object and query parameter.
Tell me exactly what to paste where when you need me.
```

Verification request after a live event:

```
I just finished a [Fathom] recording about [subject]. Check the provider API, confirm the recording exists, confirm it was delivered to our endpoint, and confirm the job ran. Then tell me where I can see the output. I want a page I can check, protected so only I can open it.
```

Ledger shape:

```
automation/ledger.json
{ "processed": { "<provider_id>": { "at": "2026-10-15T06:01:00-05:00", "output": "proposals/2026-10-15-smith/index.html" } } }
```

## Pitfalls Nick calls out

- Polling every minute. Usage and heat. Use 10 to 15 minutes or a daily time.
- Skipping dedup. Without a ledger a daily run reprocesses old items.
- Heartbeat chats drowning real work. Archive and pin.
- Letting the model stall on "do you want option A or B" for infrastructure you do not care about. Say proceed.
- A results page with no access control. Gate it with a token.
- Fields the event never contained (prepared by, valid until). Source them from config or the calendar event.
- Running both local and cloud copies after cutover.

## How Caleb should use this

- Seller and buyer consults recorded in Fathom or Zoom fire a webhook, the proposal skill runs, and the draft lands in a token-gated AIRE inbox for Caleb to review. Sending to the client stays manual and needs Caleb's approval.
- A 6 a.m. daily run pulls new website and portal leads, drafts first-touch replies, and posts them for approval. No auto-send.
- Open house sign-ins uploaded to a folder trigger follow-up drafts the same evening.
- Every call gets a recap page plus "details to remember" (kids' names, move dates, pets) pushed to the CRM record.
- New accounts, phone numbers, hosting plans or paid API keys created for these flows need Caleb's approval before purchase.

## Verification

- Local: one new item produced one output, a second run produced nothing new, and the output path is logged.
- Cloud: with the laptop closed, one real event from the provider produced one output visible on the gated dashboard or in the inbox.
- The agent can show the provider-side record (recording id) and the job record for the same event.
- The local heartbeat is disabled and the README says how to pause the cloud task.
