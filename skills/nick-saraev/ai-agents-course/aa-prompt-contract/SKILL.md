---
name: aa-prompt-contract
description: Before any non-trivial task, drafts a four-section prompt contract (Goal, Constraints, Format, Failure conditions) from the request, presents it for approval, and only then executes, so vague asks become precise scopes. Use when Caleb says "use a prompt contract", "scope this first", "define done before you start", "build me something nice" or any vague request, or whenever an AIRE build, outreach batch, listing marketing push or client deliverable needs agreement on what success and failure look like before tokens are spent.
---

# Prompt Contracts

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapters 19-20
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=4856s and &t=5063s)

## What Nick teaches

Vague tasks with no definition of done are the number one reason people are disillusioned with
agents. "Build me Netflix 2.0, make me a million dollars, make no mistakes" has no goals,
constraints or failure conditions, so the result is bad. The step-by-step fix can be learned, or
hard-coded as a skill or a CLAUDE.md rule so the model always does it.

A **prompt contract** makes the request go through a mini contract before work starts:

- **Goal**: what we are actually building or achieving.
- **Constraints**: limits on scope, size, tech, time.
- **Format**: what the output looks like, sections, files, structure.
- **Failure**: explicit conditions under which the result is rejected.

"Are you good to go?" If yes, the definition of done is now real. Nick compares it to scopes of work
in his agency education business: scopes fail by being too vague or by being so restrictive you are
a slave to them. Prompt contracts walk the line, like a contractor clarifying before starting. It is
close to plan mode in Claude Code, just formalized as a contract. He uses it for code, config, and
any business task ("email these 45 people": what should they say, is 44 of 45 a failure?).

His skill, `prompt-contract`: "Before implementing any non-trivial task, generate a structured
prompt contract with goals, constraints, output format, and failure conditions. Treat it like a spec
or scope of work. Any task that produces code or configuration must go through this. Self-analyze
the request, draft the four-section contract, present for approval."

Demo: "Use prompt contract to define this task: build me a beautiful site for leftclick.ai." The
model analyzed the request, identified implicit assumptions (he already has a site), screenshotted
the existing site for context, then returned:

- Goal: single-page marketing site for Left Click.
- Constraints: smooth scroll animations, under 500 lines of HTML.
- Format: specific sections, subtle fade-in on scroll, hover states.
- Failure: looks like a generic Bootstrap template, broken on mobile, janky animations, file exceeds
  500 lines.

He said "go ahead and build it." Later (chapter 23) he used the same pattern for the Vancouver
rental search, editing the contract (20 apartments not 5 to 10, 1.2 km from the station, south of
Drake or west of Burrard) before saying "go for it."

## Step by step

1. Receive the request. Do not start building.
2. Analyze: what does done look like, what implicit assumptions am I about to make, what decisions
   are taste-dependent.
3. Gather quick context if needed (existing files, existing site, CRM fields).
4. Draft the four sections. Make Failure concrete and testable.
5. Present the contract. Wait for approval or edits.
6. Execute. At the end, check the output against every Failure line and report.

## Templates / prompts

Skill skeleton:

```
---
name: prompt-contract
description: Before implementing any non-trivial task, generate a structured prompt contract with Goal, Constraints, Format and Failure conditions, present it for approval, then execute. Use when the user says "prompt contract", "scope this", or gives a vague build or business request.
---

## Procedure
1. Analyze the request: definition of done, implicit assumptions, taste-dependent choices.
2. Pull any context needed (existing files, screenshots, data) to ground the contract.
3. Draft:
   **Goal**: one or two sentences.
   **Constraints**: bullet list (scope, size, tech, time, budget, tone).
   **Format**: exact deliverables, sections, file paths.
   **Failure**: 3 to 6 testable conditions that mean "rejected."
4. Ask: "Approve, or edit any line?" Do not proceed without a yes.
5. After delivery, list each Failure condition with pass/fail.
```

Contract example for Caleb:

```
Goal: Weekly St. Francisville market-update email for Caleb's sphere.
Constraints: under 250 words. Data from the last 7 days only. Warm, direct voice.
No em dashes. Keller Williams First Choice named once.
Format: subject line, 3 short paragraphs (what sold, what listed, what it means),
one CTA, saved to emails/market-update-<date>.md.
Failure: any number not traceable to a source, generic filler, over 250 words,
sent or scheduled without Caleb's approval.
```

## Pitfalls Nick calls out

- Too vague and the agent guesses. Too restrictive and you cannot adapt. Aim between.
- "Beautiful" and similar words are subjective, and the contract forces them into testable terms.
- Skipping the approval step turns it back into plan mode theater. Actually read and edit the
  contract.

## How Caleb should use this

- Any AIRE feature request: contract first, especially the Failure lines (client data exposed, wrong
  market, no mobile support).
- Outreach batches (seller letters, investor emails, open-house invites): contract specifies list
  source, count, message template, and "nothing sends without Caleb's approval." Needs Caleb's
  approval before running.
- Listing marketing: contract pins down tone, photo usage, platforms, and what "looks generic"
  means.
- Client deliverables (CMA, net sheet, buyer guide): Failure includes "any unverified number."
- Add a CLAUDE.md rule: "Any task producing code, config, outreach or a client document goes through
  prompt-contract first."

## Verification

- A four-section contract was shown and explicitly approved before work began.
- The final report lists every Failure condition with pass or fail.
- The deliverable matches Format exactly (files, sections, length).
