---
name: cx-maintenance-github-versioning
description: Keeps automations and apps alive over time using Nick Saraev's three failure causes (dependency and API breaking or non-breaking changes, upgrades available, non-determinism) with GitHub as the fix point, version rollback and model swaps. Use when Caleb says "it stopped working", "the API changed", "roll it back to how it was", "a new model came out, should I switch", "put this in GitHub", or an AIRE skill or page that used to work starts failing.
---

# Maintaining and upgrading your systems

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 10 (https://www.youtube.com/watch?v=DJZISqryDfw&t=12910s)

## What Nick teaches

Systems "are not going to work perfectly out of the box every day for the rest of your life." Nick tabulated every way his systems have broken across hundreds of client builds. Three causes cover almost everything.

### 1. A dependency breaks

A program is a leaning tower on a small library "built by some dude in Nantucket in 1983." Two flavors:

- **Breaking API change.** The route changes, for example `/api/call` becomes `/api/voice`. Every script that used the old route stops. This is virtually all of Nick's active maintenance time. The fix is annoyingly simple: store the system in a **GitHub repository**, then tell the agent "XYZ API just changed their routes, figure out the problem and replace it everywhere." Usually one line, two seconds.
- **Non-breaking change.** The route is the same but something underneath changed: input types, a `name` field now needs to be a structured object, internal testing changed. Harder to spot, same fix once found.

GitHub also gives version control. Updates 1 to 9, version 3 had the best UX and later changes ruined it (agents "tend to ruin things sometimes"). Say "roll it back to version 3," or "keep the functionality of version 9 but bring over the UX from version 3." Shared repos also let clients or teammates access and change the stack.

Nick put his calendar voice assistant in a private repo with the instruction: "I anticipate breaking changes. If one occurs I'll jump in, specify the repo, tell you a breaking change happened, and you fix it."

### 2. An upgrade is available

New models drop constantly. If back ends still run the previous model while a better one exists, you might leave a 10-point success-rate gain on the table, which compounds into cost problems. For client builds "it's almost morally wrong not to help them get to the new thing." Providers structure APIs so the model name is one parameter to swap. Also watch for non-breaking changes that make something easier, for example APIs moving from polling (ask every second "is it ready") to callbacks or webhooks (they tell you when it is done), which cuts cost.

### 3. Non-determinism

Covered in `cx-skill-evals-self-healing`. Build evals, self-heal, accept a threshold.

### Summary fixes

- Dependency breaks: everything in GitHub, plus a notification (Slack, email) so you know when something fails.
- Upgrades: stay aware of the landscape, swap to the new model when it drops, usually better on cost and accuracy.
- Non-determinism: structured skills, evals, repeated runs.
- Ask the agent to "walk me through how GitHub works from first principles" for 10 minutes if it is new.

## Step by step

1. Every system gets a GitHub repo (private by default) before it goes on a schedule. Ask the agent to add it and push.
2. Add a failure notification to every automation: on error, message Caleb with the system name and the error.
3. Keep a `MAINTENANCE.md` in each repo: which external APIs and models it depends on, where the model name lives, how to roll back.
4. When something breaks: open the repo in a session, paste the error, say which provider changed, ask for the fix everywhere, run the eval, push.
5. When a new model drops: swap the model parameter in a branch, run the eval, compare score and cost, merge if better.
6. Quarterly: ask the agent to review the dependency list for deprecations and cheaper patterns (webhooks over polling).

## Templates / prompts

Repo setup:

```
Add this project to a private GitHub repository. I anticipate breaking API changes. Set it up so I can come back, name the repo, tell you a change occurred, and you can fix it. Add a MAINTENANCE.md listing every external API, every model name and where it is configured, and how to roll back.
```

Breaking change fix:

```
[Provider] just changed [route / field]. Open the repo, find every place we use it, update it, run the evals, and push. Show me the diff.
```

Rollback and cherry-pick:

```
Version 3 had the best UX. Keep the functionality we have now but bring the UX from version 3 forward. Do not lose any of the tool integrations added since.
```

Model upgrade:

```
A new model [name] is available. Swap it in on a branch, run evals/cases.md, and report score, run time and cost versus the current model. Merge only if all three are equal or better.
```

`MAINTENANCE.md`:

```
# <system>
Depends on: Fathom webhooks, Netlify functions, Google Calendar API, <model name> in config/models.json
Notify on failure: Slack DM to Caleb
Rollback: git revert or "roll back to <tag>"
Last eval score: 96% on 2026-10-15
```

## Pitfalls Nick calls out

- No repo, so a one-line route fix becomes a rebuild.
- No notification, so the automation fails silently for weeks.
- Running old models out of inertia.
- Assuming a same-named route still takes the same inputs.
- Letting late updates ruin good earlier UX with no way back.

## How Caleb should use this

- Every AIRE skill, automation and client page lives in the `Caleb-s-Agents` repo or its own private repo with a `MAINTENANCE.md`.
- Portal, CRM and MLS data feeds change often. A failure DM to Caleb beats finding out from a client.
- When a new model is available, run the listing-description and lead-reply evals before switching.
- Client-facing pages (proposals, dashboards) get tagged versions so Caleb can say "roll back to the one from last Tuesday."
- Pushing to a shared or client-visible repo and changing production model settings need Caleb's approval.

## Verification

- `git log` shows the system's history and a tag or commit for each released version.
- A forced failure (bad key) produces a notification to Caleb.
- `MAINTENANCE.md` lists every dependency and the model parameter location.
- A rollback to an earlier tag restores the earlier behavior.
