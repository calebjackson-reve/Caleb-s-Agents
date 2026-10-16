---
name: aw-writing-directives
description: Writes a strong DOE directive (the natural-language SOP an agent follows) with the four required parts, objective, input spec, step-by-step process and definition of done, plus edge cases, fallbacks and graceful-failure rules, either from an existing SOP document or from a bullet-point brain dump. Use when Caleb says "turn this SOP into a directive", "write the instructions for this workflow", "it said it finished but only did half", "what should the agent do if the API fails", or when building any AIRE workflow such as new lead intake, listing launch checklist, open house follow-up or weekly client update.
---

# Writing Directives

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 15 and 21
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=7803s and &t=10861s), with the Antigravity
improvement demo in chapter 10 (&t=5265s)

## What Nick teaches

A directive is an SOP written as markdown for an agent. Write it the way you would instruct a
competent employee: clear, not micromanaged. Describe the what and the high-level how, then trust
the agent for the rest. In practice Nick has the AI write the directive from his bullet points
("it's very meta").

**Four things every good directive needs:**

1. **Clear objective statement.** What this directive does.
2. **Input specification.** What data the agent needs to start.
3. **Step-by-step process.** The sequence of operations, which scripts to call, expected outputs,
   all in natural language.
4. **Definition of done.** Quality criteria the agent can grade itself against. Example: "you are
   done when there is a Google Sheet URL with at least 100 rows filled in."

**Also include:**

- **Edge cases.** Known exceptions, API quirks, error codes that are not real errors, common failure modes.
- **Fallback behavior.** "If the Apollo scraper fails, try the Instantly enrichment tool instead."
  One line replaces the giant error-handling branches of n8n or Make.
- **Graceful-failure handling.** Many systems fail silently and return nothing without erroring. The
  agent cannot know unless you say so. "If under 100 records, re-run with wider filters until you
  reach 100. Do not return to the user until the minimum is met."

**From an existing SOP:** drag the document into the workspace and say "I just uploaded a file. Turn
it into a directive and build the execution scripts to make it happen." SOPs are already directives:
goals, steps, inputs, outputs, edge cases. The agent reformats them into a more token-efficient
form. If the SOP is weak, the agent will ask clarifying questions ("who is Pete and why does that
matter", "why do we wait here"), which forces you to resolve ambiguity. The resulting directive is
often better than the SOP. Messy docs become a chance to clean up the company.

**From nothing:** write plain conversational bullet points as if messaging a colleague on Slack. Do
not overthink structure. Use voice. Refine later as you test. Nick's real example: "Scrape leads
from Apify based on the industry and location I specify. Then verify 80% match my target market
before doing the full scrape. When you're done, enrich missing emails using a secondary service like
AnyMailFinder. Then add everything to a shareable Google Sheet and send me the link."

**Improving an existing directive (chapter 10):** ask "is there anything I could do to the
create_proposal directive to improve it? Suggest alternative approaches." He got five suggestions
(human review step, web enrichment, variable token handling, robust JSON handling, dynamic follow-up
email), picked one, and had the agent update the directive with a new "research client" step.

**The onboarding demo (chapter 15):** "I'd like to build a brief onboarding workflow. I want to tell
you 'onboard client' and have you send an email that introduces them to our company, gives
background, and invites them to a kickoff call using a calendar link." The agent asked about email
provider, company info and URL. Nick answered in plain terms ("I just want to send from my Gmail"),
created a Gmail app-specific password when asked, the agent saved it to `.env`, Nick edited the
email template once, and "onboard nick@..." then worked every time.

## Step by step

1. Collect the source: an SOP file, or Caleb's bullet points or voice dump.
2. Ask the agent to draft the directive with the four parts plus edge cases, fallbacks and
   graceful-failure rules.
3. Read it as a non-technical teammate would. If it is not readable, it is wrong.
4. Check the definition of done is measurable (a count, a file, a URL, a status).
5. Add minimums and re-run rules for anything that can silently return less than expected.
6. Run with real data, not agent-generated test data. Let it self-anneal and update the directive.
7. Periodically ask for improvement suggestions and pick the ones that matter.

## Templates / prompts

Directive skeleton:

```markdown
# New Buyer Lead Intake

## Objective
Take a new buyer inquiry, enrich it, log it in the CRM, and draft (not send)
a first reply in Caleb's voice.

## Inputs
- Lead name, email and/or phone, message text, source (website, Zillow, sign call).
- Optional: property address they asked about.

## Process
1. Run execution/lookup_property.py with the address if present. Get price,
   status, beds/baths, listing agent.
2. Run execution/crm_find_or_create.py with the lead details. Capture the CRM id.
3. Draft a reply using resources/caleb_tone_guide.md. Include one question
   about timeline and one about pre-approval. Save to tmp/reply_<id>.md.
4. Run execution/crm_add_note.py with the draft and the property summary.
5. Return the CRM link and the draft for Caleb's approval. Do not send.

## Definition of done
- CRM record exists with source, property, and a note containing the draft.
- Draft is under 120 words, mentions the property by address, ends with a question.

## Edge cases and fallbacks
- If the address does not resolve, draft without property details and flag it.
- If the CRM API returns 429, wait 10 seconds and retry up to 3 times.
- If the lead already exists, append a note instead of creating a duplicate.

## Change log
- 2026-10-15: created.
```

Prompt from an SOP:

```
I just dropped resources/listing_launch_sop.pdf into the workspace. Turn it
into a directive in directives/ and build the execution scripts it needs.
Ask me clarifying questions for anything ambiguous before building.
```

Prompt for improvement:

```
Is there anything I could do to the open_house_followup directive to improve
it? Suggest 5 alternative approaches with trade-offs. I'll pick.
```

## Pitfalls Nick calls out

- No definition of done. The agent "finishes" with a partial result and nobody knows.
- No graceful-failure rule. Scrapers and APIs return fewer rows without erroring.
- Writing like a programmer. Write like you are briefing a capable colleague.
- Letting the agent test only with data it generated. It will match the format it just built. Use
  fresh real data.
- Overthinking structure on the first draft. Bullet points are enough, the agent formats.

## How Caleb should use this

- Convert existing KW First Choice checklists (listing launch, under contract to close, buyer
  consultation) into directives one at a time.
- Give every lead directive a definition of done that includes "CRM record updated" so nothing lives
  only in chat.
- Put "do not send, return draft for approval" in any directive that produces a client or prospect
  message. Sending needs Caleb's approval before running.
- Add fallbacks for the data sources Caleb relies on (MLS export, county records, Zillow) so one
  outage does not stall the workflow.
- Ask for improvement suggestions monthly on the directives Caleb uses most.

## Verification

- The directive file contains all four parts plus edge cases and a change log.
- A teammate with no technical background can read it and explain what it does.
- Run with fresh real input: the agent reaches the definition of done or explains exactly which
  criterion failed.
- A silent shortfall (fewer rows, missing field) triggers the re-run rule instead of a quiet partial result.
