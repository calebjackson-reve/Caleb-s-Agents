---
name: cx-sales-call-to-proposal
description: Builds a system that turns a sales call transcript or voice memo into a finished, hosted HTML proposal with signature canvas, package selection and a checkout step, first as a prompt, then as a reusable skill. Use when Caleb says "turn this consult into a proposal", "listing presentation from this recording", "buyer package from my notes", "I need a quote the client can sign online", or wants AIRE to generate seller or investor proposals automatically from Zoom, Fathom or phone memos.
---

# Sales call to proposal with e-sign and checkout

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 5 (https://www.youtube.com/watch?v=DJZISqryDfw&t=2017s)

## What Nick teaches

The target asset is what Nick's agency sends real prospects: an HTML page with a high-quality intro, a deep breakdown of the exact project the customer asked for, a signature block, an "accept and proceed to payment" button and a deposit checkout. The whole thing is generated from a call transcript. "I didn't write any of this." The naive version is pasting a transcript into a template. The end state is the call fires an event, the proposal is generated and sits in your inbox ready to send. Applies to any business: HVAC installs, driveway paving, landscaping, marketing services. It is a proposal, quote, estimate or pre-scope of work with a signature or payment at the end.

Nick's build order in the chapter:

1. **Generate three different proposal templates** (air conditioning installation, driveway paving, marketing services), fundamentally different in tone, shape, length, sections and style, as hypothetical examples first. About 3 minutes.
2. **Revise in one message:** an interactive signature canvas that saves the signature ("figure out the best way"), a simulated Stripe-style payment page linked after signing (he refused to connect a real Stripe key on a live demo), and a contrast fix where green text overlapped a green circle.
3. **Verify in the browser:** draw a signature, tick "I am authorized to accept this proposal," save, continue to payment, see the checkout page.
4. **Templatize the winner:** "generate a templated version I could feed a sales call transcript into, so a future model with zero context can fill the sections." Output was an HTML file with merge variables plus an SOP document: input is a transcript and the template, output is only a complete HTML document, preserve all references, replace every placeholder with transcript-supported content, with rules and a field mapping.
5. **Generate a fake transcript** (20 minute consultative call with "Maya Chen," prospect asks about the service, Nick runs discovery, every field the proposal needs gets discussed) because he did not want to leak a real one. Then "apply this transcript to our proposal template and show me the result."
6. **Fix what the output exposed:** the payment page showed a file name instead of the package name, and there was no way to pick between the three package tiers (Growth Foundation, Growth Partner, Scale Partner). Added a selector so the chosen package flows to checkout.
7. **Host it.** Netlify via the plugin (free tier, Nick said about 300 credits and hundreds of free sites, not affiliated, may have changed). Instruction: "put this on Netlify, and make the URL really long and unwieldy, like myurl.com/proposal/<long random string>, so nobody can stumble on it." The proposal contains the prospect's private business information.
8. **Convert to a skill** named `transcript-to-proposal` (see `cx-prompt-to-skill`), rerun on the Maya transcript, then generate 3 more transcripts and run the skill on each with sub-agents in parallel, ending with 3 Netlify URLs.

The vibe to aim for: the client should think you sat down and wrote it. "The point is automating the parts where you aren't necessary, not your tone of voice or the relationship. Bank all your taste in a template, then fill the template."

## Step by step

1. Collect 1 or 2 of Caleb's real past proposals, listing presentations or buyer packages as taste references.
2. Ask for 3 fundamentally different HTML proposal templates for Caleb's three main engagements (listing, buyer representation, investor acquisition). Open each in the browser.
3. Request the signature canvas, authorization checkbox, package selector and a payment or deposit step. For real estate the "payment" may be a retainer, an earnest money instruction page or simply "schedule the listing photos" as the next action. Keep real payment keys out of demos.
4. Pick the winner and ask for a templated version with merge variables plus a written SOP (input, output, rules, field mapping).
5. Produce a realistic fake transcript for testing. Never use a real client transcript until the flow is private.
6. Apply the transcript. Review every section and fix exposed gaps (missing prepared-by, valid-until date, wrong package wording).
7. Deploy to a long unguessable URL. Confirm the page loads, signs, selects a package and reaches the next step.
8. Convert to a skill, verify on the original transcript, then on 3 new ones in parallel.
9. Only then move to automation (see `cx-event-automation-local-to-cloud`).

## Templates / prompts

Template generation:

```
Build me three high-quality HTML proposal templates for different services:
1. [Listing representation for a seller]
2. [Buyer representation]
3. [Investor acquisition and rental analysis]
Each must be fundamentally different in tone, shape, length, sections and style.
Generate hypothetical filled-in examples first. Later we will turn them into templates populated from a consult transcript.
Think really hard. These go in front of real clients. When done, open the files so I can verify.
```

SOP shape the model should produce alongside the template (`proposal-sop.md`):

```
Input: a consult transcript and marketing-proposal-template.html
Output: ONLY a complete HTML document based on the template
Rules:
- Preserve all script, style and asset references
- Replace every {{placeholder}} with transcript-supported content, never invent numbers
- Unknown fields become "to be confirmed together", never blank
- Keep the prepared-by block as [Caleb Jackson, Keller Williams First Choice]
Field mapping:
  {{client_name}}        <- who the prospect is
  {{property_address}}   <- address discussed
  {{pain_points}}        <- what they said is not working
  {{packages}}           <- the tiers discussed, mark the recommended one
  {{timeline}}           <- dates they mentioned
  {{next_step}}          <- what happens after signing
```

Deploy instruction:

```
Great. Put this on Netlify. Make the URL long and unguessable, like
<site>.netlify.app/proposal/<40 random characters>. Do not put it at the root domain.
Give me the URL when it is live.
```

## Pitfalls Nick calls out

- Connecting a real Stripe or payment account during a demo or on a shared screen. Use a simulated page.
- Proposals at guessable URLs. They contain the client's private business details.
- Payment page showing internal names (file names) instead of the human package name.
- Multiple package tiers with no way to choose one.
- Fields the transcript never covered (prepared-by, valid-until). Either hardcode them for a single salesperson or pull from the meeting event.
- Trying to skip the exploration phase. It took about 20 minutes and that is where quality came from.

## How Caleb should use this

- Listing consult recording (Zoom, Fathom or a phone voice memo) to a branded listing proposal: pricing strategy, marketing plan, timeline, commission, signature. Needs Caleb's review before it is sent to any seller.
- Buyer consult to a buyer representation package with the agency agreement summary and next steps.
- Investor conversations to an acquisition proposal with the numbers they mentioned mapped into a deal summary.
- Host under a Keller Williams First Choice branded Netlify or AIRE subdomain with unguessable paths. Publishing a page is external, so the first deploy and any domain purchase need Caleb's approval.
- Signature pages are not a substitute for Louisiana-compliant agreements. Treat them as acceptance of the proposal, then route the formal paperwork through the brokerage's e-sign tool.

## Verification

- Three templates render in the browser and look nothing like each other.
- The templated file has placeholders for every section and an SOP explains each one.
- A fake transcript fills every placeholder with transcript-supported content, and unknowns say "to be confirmed."
- Signature draws and saves, package selection flows to the next page, the hosted URL is long and random.
- The skill reproduces the result on the original transcript and on three fresh ones.
