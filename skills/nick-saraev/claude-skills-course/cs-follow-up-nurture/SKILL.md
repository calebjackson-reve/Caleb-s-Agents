---
name: cs-follow-up-nurture
description: Builds and runs a daily pipeline follow-up skill modeled on Nick Saraev's "/follow-up-nurture", which reads every lead's stage and prior email thread and drafts a short, casual, human-sounding check-in that replies inside the existing thread. Use when Caleb says "follow up with my pipeline", "nurture my leads", "check in with everyone", "who needs a touch today", or wants AIRE to clear the daily follow-up list for buyers, sellers, past clients or investor prospects.
---

# Follow-Up Nurture: clear the whole pipeline in one command

**Source:** Nick Saraev, "CLAUDE SKILLS FULL COURSE: Automate Your Work (2026)", chapters 2-3 (https://www.youtube.com/watch?v=sduaTkhIm_w&t=65s)

## What Nick teaches

Nick's first and most-used skill. Every business with more than a few thousand dollars a month of revenue has a CRM: leads at stages from first contact to closed. His example pipeline had stages like "Meeting booked" (Jimmy Clin) and "Proposal sent" (Sarah Chen, Jessica Park, Aisha Mohammad). Before the skill, he manually checked in with every lead every day.

Now he types `/follow-up-nurture` and the skill:

1. Goes through the pipeline and identifies every lead.
2. Captures all the conversations he's ever had with each prospect, "all of my email chains."
3. Uses a couple of templates to personalize a check-in depending on stage.
4. Writes each one in his tone of voice and sends it as a reply in the same thread, so it lands in the existing conversation.
5. Lists every follow-up it made to every person at the end.

His stage examples:
- Meeting booked but not yet held: "Hey Jimmy, how's it going? Just wanted to check in on our meeting in a couple days. Really excited to have it."
- Proposal sent (a $2,500 quote): "Hey Sarah, hope you had a lovely week so far. Just wanted to circle back on X, Y, and Z proposal. Let me know if you have any questions."
- Real ones he showed: "Hey James, circling back on the proposal. Let me know if I can answer any Qs." and "Hi Priya, hope you had a great week. Checking in on that test brief. Let me know where we're at."

The whole key: **do it informally and casually "so they think it's us."** Nick says automated follow-up services fail because they "use really non-human language" and "prospects can tell when an LLM does the following up." The skill pulls in context from the prior conversation so you're "not just repeating the same thing," and it signs off slightly differently per person.

The workflow: you or your salesperson wakes up, runs the slash command, clears the full pipeline of follow-ups, then spends the day acquiring new business. Nick: "I use it basically every day."

## Step by step

1. Identify the pipeline source: a CRM export, a Google Sheet, or AIRE's lead table. Columns needed at minimum: name, email, stage, last contact date, owner notes.
2. For each lead due for a touch (define the cadence per stage, e.g. 2 days after proposal, 1 day before a meeting), fetch the most recent email thread with that person.
3. Pick the stage template, then rewrite it using specifics from the thread (what they asked about, the price quoted, a date mentioned). Keep it to 2 to 4 sentences.
4. Vary greeting and sign-off across the batch so no two look templated.
5. Draft as a reply in the existing thread (same subject, reply headers), never a new thread.
6. Present the full batch to Caleb as a table: name, stage, draft text. Wait for approval. Only then send.
7. Log every send back to the CRM (date, stage, text) and print the summary list.

## Templates / prompts

Stage templates (rewrite per lead, never send verbatim):

```
MEETING_BOOKED:
Hey {first}, how's it going? Just wanted to check in ahead of our {day} meeting. Looking forward to it.

PROPOSAL_SENT / OFFER_OUT:
Hey {first}, hope your week's going well. Circling back on {specific thing}. Happy to answer any questions.

WENT_QUIET:
Hi {first}, checking in on {last topic}. Let me know where you're at and if anything changed on your end.

PAST_CLIENT:
Hey {first}, thought of you when {specific local thing}. How's the house treating you?
```

Skill request Caleb can give Claude:

```
Build a skill called follow-up-nurture.
Source: <CRM export path or AIRE table>.
For each lead due for a touch, read our last email thread, pick the stage template,
and write a 2-4 sentence reply in my voice inside the same thread.
Vary the sign-offs. Show me the whole batch in a table before sending anything.
After I approve, send as replies and log the touch back to the CRM.
Finish with a list of everyone contacted.
```

Voice rules to put in the skill body:

```
- Casual, warm, first-person. Contractions fine.
- Reference one concrete detail from the prior thread.
- No "I hope this email finds you well." No bullet lists. No signature blocks beyond "Caleb".
- Never mention being automated.
```

## Pitfalls Nick calls out

- Robotic phrasing kills response rates. The point is that it reads like you wrote it.
- Don't start new threads. Reply in the chain so context is right there for the prospect.
- Don't repeat the last message. Pull new context each time.
- The skill should produce the list of what it sent, otherwise you lose track of touches.

## How Caleb should use this

- Daily `/follow-up-nurture` across active buyers, sellers under consideration, and listing appointments set. Stages map cleanly: "appointment set", "CMA sent", "offer submitted", "under contract", "closed, past client".
- Investor and absentee-owner outreach: a "went quiet" variant that references the property address and the last number discussed.
- AIRE can run the draft step automatically every morning and queue drafts for Caleb to approve in one pass. Sending emails or texts to clients needs Caleb's approval before running.
- Past-client nurture: quarterly touches tied to a local event (Angola Rodeo, St. Francisville festivals, LSU season) so they feel personal.

## Verification

- The batch table lists every due lead with a draft that references a real prior-thread detail.
- Sent messages appear as replies in the existing Gmail threads, not new conversations.
- CRM last-contact dates update for everyone sent.
- Sign-offs differ across the batch. Read three at random and confirm none sound templated.
