---
name: aw-operating-the-agent
description: Day-to-day habits for using (not building) agentic workflows efficiently, speaking prompts by voice, being specific with inputs up front, pasting context instead of making the agent fetch it, reviewing deliverables and confirming good runs, and treating the agent like a colleague you DM. Use when Caleb says "how should I talk to it", "it asked me five questions", "it's slow to get started", "what workflows do I have", "clean up my directives", or when Caleb is running AIRE workflows during a normal workday and wants to spend less time typing and waiting.
---

# Operating the Agent Day to Day

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 27, 31
and 35 (https://www.youtube.com/watch?v=MxyRjL7NG18&t=14263s, &t=15316s, &t=18034s), with the
interface points from chapters 6 and 26 (&t=2999s, &t=13830s)

## What Nick teaches

Building a workflow and using a workflow are different jobs. Building is having the agent be your
programmer once. Using is the daily return on that investment, and it all happens "through a single
text box" in the IDE. He no longer opens Fireflies, Drive, PandaDoc or the rest. Text is the
universal interface, a step back from pretty GUIs for now, so make it as natural as possible.

**Speak, don't type.** Typing is 50 to 70 words per minute. Speaking is 150 to 200. He uses Whisper
Flow and Aqua (hold a key, talk, release, press enter). Output stays as text because people skim at
300 to 500 words per minute, some up to 1,000. Voice in, text out roughly quadruples bandwidth.
Modern models handle thousand-word voice dumps from the car, so you do not need to organize your
thoughts. He only types to reference an exact file name, and even then he pastes it.

**Be specific up front.** Just ask for the workflow, no need to remember directive names, the agent
scans for matches. But supply the inputs the directive's schema needs. "Get me leads" triggers a
round of questions, a second step, and compounding error (90% times 90% is 81%). "Scrape 200 HVAC
companies in Texas, verify the emails, personalize them, give me the Google Sheet" is one step, two
seconds longer, fewer errors, faster. Like ordering food: say the dish and the modifications.

**Ask what exists.** "What workflows do I have?" As the library grows, ask for a refactor: "Are any
directives or executions really similar? Run a comprehensive refactor and group them in ways that
make sense."

**Paste context instead of fetching.** Paste the call transcript rather than wiring a Fireflies API
call. Select-all a website and paste it instead of asking for an HTTP request. From the model's view
it is the same context, and it skips setup and failure modes. Co-create: you go to websites and
copy, the agent does the rest.

**Review the deliverable.** Every run ends in a link, document or summary plus a report of what
happened. Review it, confirm it meets your needs, and tell the model "this worked great, update the
directive and execution" if it is not already done. Cheap and locks in the result.

**Talk like Slack.** No formal syntax or technical language. "Hey, could you run the YouTube editor
for the new file, make the cuts a little tighter." It adjusted the cut distance, re-ran, and after
he said he liked it, updated the flow. "Just DM your colleagues and replace the colleagues with your
agent."

**Supervised autonomy, not babysitting.** When it is stuck it asks with context. Answer, or
motivate: "could you research the API spec?" often unsticks it on the first try. If it loops between
two fixes, pause, read the reasoning, redirect. Sending one message costs cents and the upside is
large.

**A real day (chapter 35):** three panes at once. Left: "run the post-kickoff flow for the demo
kickoff call" (analyze niche, scrape leads, enrich, upload to the campaign tool, add to knowledge
base, email the client a summary with campaign links). Middle: "run the YouTube outlier workflow,
find 10 to 20 outliers for agentic workflows," then redirected to "AI agents" when the first term
was too narrow. Right: "pull the top 10 most recent school posts," then "run me through his step by
step," then he dictated replies and the agent formatted and posted them. When a Gmail MCP had lost
auth, he re-authenticated via `/mcp` and moved on. He estimates most people can automate 50% or more
of their day this way.

## Step by step

1. Install a voice transcription tool and bind a push-to-talk key.
2. Start requests with the workflow intent plus every input it needs in one message.
3. Paste any context you already have open (transcript, web page, email thread).
4. Let it run. Watch the first runs of anything new, otherwise alt-tab and rely on a chime hook.
5. Review the deliverable. Say "this worked great, update the directive" or give one-line feedback.
6. When stuck, answer quickly or nudge it to research. If looping, pause and redirect.
7. Monthly: "what workflows do I have?" and refactor duplicates.

## Templates / prompts

Specific trigger:

```
Run new_lead_intake for Jane Doe, jane@example.com, 225-555-0142, source
Zillow, asked about 123 Royal St, St. Francisville. Draft the reply, don't
send.
```

Paste context:

```
Here's the full listing appointment transcript. Run listing_presentation
for the seller at 456 Oak Ln, email seller@example.com.
<paste>
```

Confirm a good run:

```
This worked great. Update the directive and scripts so it runs exactly
this way next time.
```

Refactor:

```
What workflows do I have? Are any directives or scripts near-duplicates?
Propose a refactor that groups them sensibly, then do it.
```

## Pitfalls Nick calls out

- Typing long prompts. Use voice.
- Vague requests that trigger clarifying rounds. Give the inputs.
- Making the agent fetch what you could paste.
- Forgetting to confirm a good output, so the directive never learns.
- Writing to it like a programmer.
- Leaving an instance waiting on you for an hour because it asked a question you did not see.

## How Caleb should use this

- Between showings, dictate from the truck: "new seller lead, [name], [address], wants to list in
  spring, draft a follow-up and log it."
- Paste MLS sheets, inspection summaries or email threads directly rather than asking AIRE to
  connect another API.
- Keep three panes on a desk day: lead follow-up drafts, listing marketing, CRM cleanup.
- Always review drafts before anything goes to a client. Sending needs Caleb's approval before running.
- Say "this worked great, update it" after any output Caleb would send as-is, so AIRE converges on his voice.

## Verification

- Requests that include all inputs run without clarifying questions.
- Caleb's prompts are mostly dictated and arrive in a few seconds.
- Directive change logs show entries after "this worked great" confirmations.
- No instance sits idle waiting on Caleb for more than a few minutes during a work session.
