---
name: aa-reverse-prompting
description: Before building, has the agent ask five dynamically generated clarifying questions to surface non-obvious preferences, assumptions and constraints, then (optionally) feeds the answers into a prompt contract, raising the odds of a one-shot result. Use when Caleb says "ask me questions first", "reverse prompt", "interview me before you build", "I'm not sure what I want yet", or gives a loose request for an AIRE feature, listing page, client email, or marketing piece where taste and hidden assumptions matter.
---

# Reverse Prompting

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapter 21
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=5260s)

## What Nick teaches

Reverse prompting is related to prompt contracts but goes one step earlier. Instead of the model
handing you a spec to sign, it **asks you questions first**, questions you may not have realized you
needed to answer. Then it feeds your answers into a prompt contract.

Flow:

1. User gives a task (e.g. a website).
2. Agent asks **five clarifying questions** back before starting.
3. User answers. Agent builds the correct thing on the first try.

Without it, wrong implicit assumptions pile up and the probability of a **one-shot** (done right in
a single request) drops sharply.

His skill, `reverse-prompt`: "Before implementing any non-trivial build, ask the user five
dynamically generated clarifying questions to surface non-obvious preferences, assumptions, and
constraints. Trigger before starting implementation. Step one: analyze the request for stated
requirements, implicit assumptions, decision points, failure modes, and taste-dependent choices."

Demo: "Build a beautiful site for One Second Copy (his old content-writing company). Use reverse
prompt and chain it with prompt contract after." The questions and his answers:

- What is the primary goal: brand credibility, sales funnel, lead gen? Brand credibility.
- Single static page or a framework? Simple single page.
- What is the vibe: clean modern SaaS like Linear, or something else? Linear but white.
- Generate copy from context or use placeholders? Generate from context.
- (One more on where to build it.)

The answers flowed into the prompt-contract skill, which produced: single-page static site,
Linear-white aesthetic, five sections, deploy-ready, with format and failure lines. The resulting
site matched what he wanted (minimal, white, high-end, subtle animations) far better than the naked
"build me a beautiful site" prompt. He stresses this works for sales, bookkeeping, anything, and
that the model does the laborious definition-of-done work for you.

## Step by step

1. On any non-trivial request, do not build. Analyze for: stated requirements, implicit assumptions,
   decision points, failure modes, taste-dependent choices.
2. Generate exactly five questions targeting the highest-leverage unknowns. Offer concrete options
   in each question so answering is fast.
3. Ask them all at once. Wait.
4. Fold the answers into a prompt contract (aa-prompt-contract). Present for approval.
5. Build. Report against the contract.

## Templates / prompts

Skill skeleton:

```
---
name: reverse-prompt
description: Before implementing any non-trivial build, ask the user five dynamically generated clarifying questions to surface non-obvious preferences, assumptions and constraints. Use when the user says "reverse prompt", "ask me first", or gives a loose request. Chain into prompt-contract after.
---

## Procedure
1. Analyze the request. List privately: stated requirements, implicit assumptions,
   decision points, failure modes, taste-dependent choices.
2. Write five questions. Each must be something the user did not state, matter to
   the outcome, and include 2 to 4 example answers so it is quick to respond.
3. Ask all five in one message. Do not start work.
4. On answers, invoke prompt-contract and present the four-section contract.
5. Build only after approval.
```

Example question set for a Caleb request ("make me a landing page for the Oak St listing"):

```
1. Primary goal: capture showing requests, collect buyer leads, or share with the seller? 
2. Where will it live: standalone page, inside the AIRE client portal, or a KW page?
3. Vibe: clean white and minimal, warm Southern luxury, or bold and modern?
4. Photos: use the folder at listings/oak-st/photos, or placeholders for now?
5. Lead capture: email only, phone required, or no form (call/text buttons)?
```

Trigger prompt:

```
Reverse prompt me on this, then chain into a prompt contract: <loose request>.
```

## Pitfalls Nick calls out

- Skipping questions on "simple" tasks that actually hide taste decisions (what does "beautiful"
  mean?).
- Asking questions the user already answered. Questions must target what is non-obvious.
- Treating the answers as the end. They are inputs to the contract, not a substitute for it.

## How Caleb should use this

- Any new AIRE feature: five questions before code (who uses it, where it lives, what data, what
  must never happen, what "good" looks like).
- Listing marketing and landing pages: questions on goal, tone, photos, lead capture, platform.
- Client communications: questions on relationship stage, what the client already knows, desired
  next action, tone.
- Seller or investor outreach campaigns: questions on list source, offer, volume, and approval
  checkpoints. Sending anything still needs Caleb's approval before running.
- Put "reverse-prompt then prompt-contract" in CLAUDE.md as the default for anything taking more
  than a few minutes.

## Verification

- Five questions were asked in one message before any work started, each with example answers.
- A prompt contract followed and was approved.
- The first delivered version needed zero or one revision (the one-shot test).
