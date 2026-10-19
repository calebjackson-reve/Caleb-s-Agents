---
name: aw-transcript-to-proposal
description: Turns a call transcript (sales call, listing appointment, buyer consultation) into a polished, consistently formatted proposal or summary document with a follow-up email, using a directive that extracts problems, solutions and pricing and renders them into a fixed template. Use when Caleb says "write up the proposal from this call", "turn my listing appointment notes into a presentation", "send the buyer a recap", "generate the document from the transcript", or when AIRE should produce a client-facing PDF or doc from meeting notes or a Fireflies/Otter recording.
---

# Transcript to Proposal

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapter 13
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=6180s), with the Antigravity proposal demo in chapter
10 (&t=5265s) and the cloud version in chapter 32 (&t=16125s)

## What Nick teaches

A workflow Nick uses constantly: feed in a sales call transcript, say "generate a proposal using the
below transcript," and get a formatted proposal plus a follow-up email. The agent reads the
`create_proposal` directive, extracts the main problem areas, solution areas, what was discussed and
the pricing, asks for anything missing (he had removed the email, so it asked for one), generates
the document in the fixed format, sends a follow-up email through his Gmail MCP, and returns a
summary with a link.

The output he shows: problem statements like "your revenue is unpredictable because you rely on
referrals and sporadic outreach, one month brings three clients, the next zero, which makes hiring
and growth planning impossible," then solution statements, then pricing. Tone and structure came
from "a very simple high-level prompt instruction as well as a brief example." Setup took about 15
minutes end to end. He feeds transcripts by paste, but notes it could pull from Fireflies via API
just as well, "it works the same regardless."

In chapter 10 he improved the directive by asking for alternatives and adding a "research client"
step: if a website URL is provided or can be inferred from the email domain, fetch the landing page,
analyze brand voice and context, and write a brief summary to inform the proposal. He used ChatGPT
to generate demo client data to feed in, which shows the workflow accepts data from outside the
system.

In chapter 32 he deployed the same directive as a cloud webhook and iterated on quality: "lengthen
the paragraphs for the benefits and solution statements, make things longer and significantly more
realistic, then re-run the test." Output quality improved immediately. Proposals are a
human-in-the-loop item for him: he always looks before sending because an extra zero in a price is
catastrophic.

## Step by step

1. Create `directives/create_proposal.md` (or `listing_presentation.md`, `buyer_recap.md`) with:
   inputs (transcript, client name, email, optional website), extraction rules (problems, goals,
   solutions, numbers, timeline), the document template or example, tone reference, and a definition
   of done (document link plus draft email).
2. Provide one example of a finished document Caleb likes as the template in `resources/`.
3. Have the agent build the scripts: parse transcript, optional client research, render document
   (PDF or DOCX using built-in skills or a template), draft email.
4. Run on a real transcript. Check extraction accuracy, formatting and numbers.
5. Add "return the document and email draft for my review, do not send."
6. Iterate on length and realism until the output reads like Caleb wrote it.

## Templates / prompts

Trigger:

```
Generate a listing presentation using the below transcript. Seller is
[name], property [address], email [email].
<paste transcript>
```

Directive extraction section:

```markdown
## Extract from the transcript
- Seller's situation and motivation (why selling, timeline, concerns)
- Property facts mentioned (updates, condition, known issues)
- Price expectations and anything said about comps
- Objections or questions raised
- Next steps agreed

## Document sections (use resources/listing_presentation_example.pdf)
1. Your situation (2 short paragraphs, their words where possible)
2. Pricing strategy (numbers only from execution/comps_summary.py output)
3. Marketing plan (fixed KW First Choice section, do not improvise)
4. Timeline
5. Next steps

## Definition of done
PDF saved to tmp/, email draft saved to tmp/, both returned for review.
Nothing is sent.
```

## Pitfalls Nick calls out

- Sending without a look. Financial documents and proposals always get a human check.
- Thin paragraphs. If output feels short or generic, say so and re-run, the agent will lengthen and
  make it more specific.
- Letting the agent invent numbers. Pricing comes from a script or from the transcript, never generated.
- Treating input source as a blocker. Paste, file, or API all work.

## How Caleb should use this

- Record listing appointments and buyer consultations (with consent) and turn them into a
  presentation or recap within minutes of the meeting.
- Keep the KW First Choice marketing plan section fixed in the template so it is compliant and
  identical every time.
- Pricing sections must pull from a comps script, and Caleb reviews every number. Sending the
  document or email to the client needs Caleb's approval before running.
- The follow-up email draft should reference specific things the client said, which is what makes it
  feel personal.
- Add a client-research step: pull the property's public record and recent neighborhood sales before drafting.

## Verification

- The document has every section from the template in the same order.
- Every number in the document traces to the transcript or a script output.
- The email draft mentions at least two specifics from the conversation.
- The workflow stops at "ready for review" and does not send.
