---
name: mk-prompt-skill-loop-routine-ladder
description: Turns a manual Claude Code process into a reusable skill, then a scheduled local loop, then a cloud routine, following Nick Saraev's four-step automation ladder (prompt -> skill -> loop -> routine) with his verify-first rule. Use when Caleb says "make this repeatable", "turn this into a skill", "run this every morning", "put this on a schedule", "make this run without my laptop", "convert this to a routine", or any time an AIRE workflow (listing ad batches, lead follow-ups, newsletter personalization) has been done by hand more than once.
---

# The Automation Ladder: prompt -> skill -> loop -> routine

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapters 5, 7, 9 (https://www.youtube.com/watch?v=yulWjh3rq28&t=3786s, &t=6173s, &t=10755s)

## What Nick teaches

Every system in the course is built the same way, in four levels of abstraction:

| Level | Triggered by | Runs | Best for |
|---|---|---|---|
| **Prompt** | You, typing | when you type | quick experimentation, the first time you ever do a process ("Flintstones car") |
| **Skill** | You, pressing run (`/skill-name`) | when you invoke it | repeat tasks you still want to be in the loop for |
| **Loop** | a timer on your computer | while your laptop is on | monitoring, scraping a resource on a schedule |
| **Routine** | schedule, API call, or webhook, on Anthropic's cloud | regardless of whether your laptop is on | daily production, shared with a team |

Rules Nick states:
- **"The moment you find yourself saying the same thing more than once, turn it from a prompt into a skill."** Not everything is skill-able. Some things need a human in the driver's seat. Try anyway. What passes the "totally autonomous" threshold becomes a skill, what doesn't stays a prompt.
- **Meta skills**: once you have granular skills, chain them in a master skill that runs them in sequence. That is how Nick runs his YouTube channel (titles, thumbnails, descriptions, keywords, end screens, publishing) without a team.
- **Don't come to AI without a process.** Whiteboard the process yourself first. If AI picks the process, executes it, and judges it, you are multiplying probabilities: three 0.8 steps = 0.512 success. Keep the human on process design and output judgment. Let AI only carry out the middle. Minimize the number of steps.
- **Start at the end, verify, then systematize.** Prove the output is achievable with a prompt before building the skill. Otherwise you automate a process that sucks.
- **AI never hits 100%.** Use it to take more shots at the net (dozens, hundreds of ad variants), then apply human taste to pick.
- **Loops are brittle** (your login changes, plugins change) and are hard to share. Routines fix both by running in a standardized cloud environment: same env variables, same connectors, same setup script for everyone.
- Routine economics: "spend $1 in tokens, get $100 of deliverable."

### Converting skill -> loop (as shown in ch. 7)
Nick says: "put this on a loop, run every morning at 5:59 a.m. so the creative specialist at 6:00 can pick winners." Claude asks for batch size (20), copy pool (generate new copy every run), output location (local), cleanup (none for now). Claude checks its built-in `schedule` skill and installs a cron job. Important change: a loop cannot ask questions, so the skill must get more autonomy (Nick had it re-read all previously generated ads and make the new batch different, "time-based so it varies day to day").

### Converting loop -> routine (as shown in ch. 7 and 9)
Nick's prompt: "convert this from a loop into a Claude routine. Rather than generate locally at 5:59, generate into a Google Drive folder anyone with the link can see." Claude then:
1. Asks for time zone.
2. Creates a **private GitHub repo** for the script (sign-in prompt if not authenticated).
3. Asks you to connect **Google Drive** under Settings -> Connectors.
4. Creates a top-level Drive folder plus a **dated subfolder per run**. The connector cannot change sharing, so you set "anyone with the link" once by hand.
5. Connects Drive **again inside the cloud routine** (local connectors do not carry over).
6. Kicks off a test run. Routines tab shows the routine, its connectors (Claude Code Remote + Drive), and the GitHub repo. Each run is a cloud chat you can open.
Routines can also be triggered manually, by API, or by webhook (used in `mk-speed-to-lead-email-sms`).

## Step by step

1. **Prompt stage.** Voice-dump the goal, feed the folder/images/context, go back and forth until the output is what you want. Correct mistakes immediately ("if you see it make a mistake, stop it now, not later").
2. **Skill stage.** Say: "Consolidate everything we did into a skill. Write it as a simple bulleted SOP so a future Claude instance with no context of this conversation can execute it reliably." Open a **new chat with zero context** and run `/skill-name` to prove it works standalone. Try it on a different input (Nick re-ran the Maker School ad skill on Clarvo).
3. **Harden.** Run it a few times. Fix failures. Add the self-healing clause from `mk-self-healing-error-logging`.
4. **Loop stage.** "Turn this into a loop that fires at {{time}} every {{days}}." Answer batch size, output location, cleanup. Remove every question the skill would ask. Give defaults.
5. **Routine stage.** "Turn this into a Claude routine. Mirror {{existing routine}}. Output to a Google Drive folder with a dated subfolder." Connect each needed connector inside the cloud environment, add API keys to the default cloud environment (see `mk-connect-tools-keys-and-connectors`), approve the GitHub repo, confirm time zone, run the test.
6. Add error logging to Slack and the self-healing clause before leaving it alone.

## Templates / prompts

Skill consolidation prompt:
```
Now that the output is where I want it, consolidate this whole conversation into a skill.
- Name: {{skill-name}}
- Description must say exactly when to use it.
- Write the body as a numbered SOP a future Claude with no memory of this chat can follow.
- Include defaults for every decision we made so it never needs to ask me.
- Include the scripts / template files it depends on and where they live.
Then open the skill file so I can read it.
```

Loop prompt:
```
Put the {{skill-name}} skill on a loop. Run it every weekday at 5:59 a.m. {{timezone}}.
Batch size {{n}}. Generate fresh copy every run and make it different from previous
batches by reading the existing output folder first. Save to {{folder}}. Do not clean
up old batches. It will run unattended, so remove every question and use the defaults.
```

Routine prompt:
```
Convert the {{skill-name}} loop into a Claude routine that runs in the cloud at 5:59 a.m.
{{timezone}} on weekdays. Instead of saving locally, create a Google Drive folder called
"{{Folder Name}}" with a dated subfolder per run. Mirror the structure of my existing
routine "{{existing routine name}}" (query it first). Walk me through each access I need
to grant, then set it up and kick off a test run.
```

## Pitfalls Nick calls out

- A skill that asks questions will stall as a loop or routine. Nobody is there at 5:59 a.m.
- Connectors and env keys set locally are invisible to cloud routines. Set them again in the cloud environment.
- Drive connector can't change sharing permissions. Do that by hand once.
- Loops break when your machine changes. Anything "institutional" belongs in a routine.
- Routines run slower than a local session.
- Not everything deserves the full ladder. Nick's lead scraper stayed a skill because he doesn't need fresh leads every morning (bottleneck thinking applies here too).

## How Caleb should use this

- Candidate ladder climbs for AIRE: daily "new listing / price change" social post batch (routine to Drive), morning lead-nurture check against the CRM (routine), weekly neighborhood market-stat graphic (loop or routine), newsletter personalization before each send (skill).
- Keep each KW First Choice process as a skill first and run it by hand for a week. Only promote to loop/routine once it has run clean three times.
- Anything that sends emails, texts, or posts publicly as a routine **needs Caleb's approval before running** unattended, and should start with a dry-run mode that writes drafts to Drive instead of sending.
- Build a "morning AIRE" meta skill that runs the small skills in order (pull new leads, draft follow-ups, generate today's listing creative, refresh dashboard) once the pieces exist.
- Routines cost tokens (plus whatever connected services charge, e.g. video credits). Confirm the per-run cost on the first test run before scheduling daily.

## Verification

- Skill: runs correctly in a brand-new chat with no prior context, and on a second input it has never seen.
- Loop: `schedule`/cron entry exists, next run time is shown, one scheduled run produced output in the folder.
- Routine: appears in the Routines tab with the right connectors. Test run completed. Dated subfolder in Drive contains the output. A second person with the link can open it.
