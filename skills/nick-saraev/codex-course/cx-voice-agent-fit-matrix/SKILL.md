---
name: cx-voice-agent-fit-matrix
description: Decides whether a voice agent belongs in a process using Nick Saraev's lifetime value versus volume matrix, voice agents only for high-volume, low-LTV calls, never for the rare calls that decide big money. Use when Caleb asks "should I use an AI phone agent", "can AI take my after-hours calls", "automate my listing inquiry line", "voice agent for buyer leads", or is tempted to automate seller consults, listing appointments or negotiation calls.
---

# Voice agent fit: the LTV versus volume matrix

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 9 (https://www.youtube.com/watch?v=DJZISqryDfw&t=9975s)

## What Nick teaches

Nick is "the guy that hates voice agents." He does not. People misunderstand where they shine, and at current capability they are "nowhere near the slap-on band-aid solution most people make them out to be." The issue is utility, and voice agents make mistakes.

**Bad fit story.** A private equity owner spends one hour a week on a discovery call with a business owner he might acquire. The outcome could be worth millions or tens of millions. He wanted to automate it to save the hour. Nick: "Isn't this the most important part of your business? What do you want to do with that hour, play Mario Kart?" High lifetime value, low volume. Do not use a voice agent. A tiny drop in call quality has huge downstream cost.

**Good fit story.** A large company gets over 10,000 support calls a week, about 20 minutes each (about 333 hours a week). Most callers want a tiny account tweak, and a phone call is required for verification. Handling it okay changes nothing about the client's lifetime value, and 99.9% of calls are okay. Low LTV, high volume. Voice agents could take about 80% of it.

**The matrix:**

| | Low volume | High volume |
|---|---|---|
| **High LTV** | Never. Humans. | 50/50, usually hire humans |
| **Low LTV** | 50/50, usually hire humans | **Voice agents here** |

Only one quadrant of four is a real fit. If you are planning to "sell voice agents for a living" or sprinkle them everywhere, keep this in mind. "Do not use them for something where millions depend on the outcome of the call."

**What a voice agent is.** Just the audio version of the text agent you already use. Audio in, the model runs tools (search, calendar, CRM), audio out. People anthropomorphize it and that trips them up. Under the hood, a very fast light model acknowledges you ("sure, sounds great") while a smarter model works on the real answer, buying it time.

Nick's good examples: after-hours lead capture that books into a calendar, doctor and med spa clinics, physiotherapy, hairdressers, routine support lines.

## Step by step

1. Describe the call type in one line: who calls, why, how often per week, what happens if it goes badly.
2. Estimate volume per week and the lifetime value of a typical caller to Caleb.
3. Place it in the matrix.
4. High LTV and low volume: stop. Keep it human. Consider a text or scheduling automation instead.
5. Low LTV and high volume: proceed to `cx-voice-agent-build`. Define what the agent may do (answer, capture, book) and what it must hand off.
6. The 50/50 quadrants: default to humans. Only pilot a voice agent with a human fallback and a short review window.
7. Write the decision and the reasoning in the system's README so it is not relitigated every month.

## Templates / prompts

Fit assessment prompt:

```
Call type: [after-hours inquiries on listings from sign calls and portal leads]
Volume per week: [N]
Typical caller LTV: [$ expected commission x probability]
Cost of a bad call: [lost lead vs lost listing]
Place this in the LTV x volume matrix and tell me whether a voice agent fits, what it should be allowed to do, and what must route to a human. Be blunt.
```

Decision record:

```
# Voice agent decision: <call type>
Quadrant: <low LTV / high volume>
Allowed: answer property facts from the listing sheet, capture name, number, email, timeframe, book a showing slot with confirmation
Not allowed: price negotiation, commission discussion, legal or contract questions, anything about a seller's motivation
Hand off: any caller who says "offer", "price", "attorney", "contract", or asks for Caleb by name
Review: first 50 calls transcribed and reviewed by Caleb
```

## Pitfalls Nick calls out

- Automating the rare call that decides big money.
- Treating voice agents as a general fix.
- Forgetting they make mistakes. Design for mistakes being cheap.
- Selling voice agents to businesses in the wrong quadrant.

## How Caleb should use this

- Good fit: after-hours listing inquiry line and sign calls, open house RSVP and directions, showing confirmation calls, "is this still available" portal calls. Capture and book, hand off everything else.
- Bad fit: seller listing consults, buyer consults, negotiation, past-client check-ins. These are high LTV and low volume. Caleb's voice is the product.
- Maybe: investor inquiries. Pilot with a human fallback and review the transcripts.
- Any live phone number that callers reach is an external, paid surface, so launching one needs Caleb's approval.

## Verification

- A written decision record exists with quadrant, allowed actions, hand-off triggers and a review plan.
- Nobody on the team can name a high-LTV call type that is routed to the agent.
