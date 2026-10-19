---
name: mk-fuzzy-variables-newsletter
description: Personalizes a human-written email template at scale by having Claude turn each subscriber's hard data (name, why they signed up, challenge, tools) into short "fuzzy variables" that read like you wrote them, then loads them as custom merge fields in the email platform and runs daily for new signups. Use when Caleb says "personalize my newsletter", "make the welcome email feel one-to-one", "add a custom line per lead to the market update", "fill these merge fields with AI", or wants sphere/past-client emails that mention each person's actual situation.
---

# Fuzzy variables: AI-personalized newsletter and welcome emails

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapter 10 (https://www.youtube.com/watch?v=yulWjh3rq28&t=11472s)

## What Nick teaches

Most newsletters only personalize `{{first_name}}`. Basic AI personalization can make a campaign "work like 5% better right off the bat" for less than the tokens cost.

- **Hard variables**: first name, company, city. Copied verbatim from data.
- **Fuzzy variables**: hard data passed through AI to produce a natural, enriched phrase ("saw you love snowboarding, I live near a big mountain and go often"). Written in **camelCase with long descriptive names** that instruct the AI, e.g. `shortPlausibleReasonWhyTheySignedUp`, `shortCustomReasonWhyItsUseful`, `paraphrasedChallenge`.
- **The human writes the whole email** with proven practices. AI only fills a few slots. "AI writing your entire email usually sucks." The fewer AI words as a share of the email, the lower the chance anyone thinks AI wrote it.
- Remove AI tells (he deleted an en dash). No em dashes.

### Nick's context
Kit (newsletter platform), ~38k subscribers, grown via Instagram ManyChat "comment CODE" flows and LinkedIn. His welcome email ("Hi, welcome to Maker School. This won't be a bloated onboarding email...") became:

```
Hey {{firstName}},
Welcome to Maker School. Extremely excited to have you with us, especially because
{{shortPlausibleReasonWhyTheySignedUp}}.
First, this won't be one of those bloated stuffy onboarding emails. Just the essentials.
...read our onboarding guide. It covers what to do first, how to get the most out of the group,
and our event structure. Particularly useful in your case because {{shortCustomReasonWhyItsUseful}}.
...
I know a big challenge for you is {{paraphrasedChallenge}}. So treat this as an opportunity to solve it.
```

### The prompt (paraphrased from what he read on screen)
> I need you to personalize a Google Sheet of leads for an email campaign. The sheet has columns: first name, last name, email, company name, job title, city, hobbies, why signed up, favorite tool, biggest challenge. Context: an email template that uses these merge variables [list]. This is a welcome email for Maker School, Nick Saraev's AI automation coaching community. Tone: casual, direct, no fluff, first person from Nick.
> Task, in one step without pausing for clarifying questions: (1) Read every row of the source sheet with whatever Drive/Sheets tool you have. Do not guess or sample. (2) For each row individually, write three new column values custom to that specific person, not from a shared lookup table. Even when two rows share text, the copy should read differently. Draw on their other fields. Vary sentence structure and word choice row to row. Avoid a small set of repeated template sentences. (3) Do not modify the original sheet. Create a new sheet via Drive, titled X, with all original columns plus the three new ones appended in this exact order. Validate everything before uploading, then give me the link.

Claude wrote a Python list of dicts, one handcrafted entry per row for 100 rows, built a CSV, and uploaded via Drive (Drive could create a file. It couldn't edit Sheets directly).

**Length correction** after first pass (outputs were too long, and the challenge field included the person's name so it didn't slot into the sentence): "shortPlausibleReason ~10 words, shortCustomReason ~10 words, paraphrasedChallenge ~5 words, written so it inserts directly into this sentence: [paste the sentence]." Results: "you're pushing North Partners past 20k a month with automation" / "we build repeatable outbound systems that fix inconsistent lead flow" / "getting consistent leads every month."

### Loading into Kit
Subscribers -> import CSV -> add **custom fields** for each fuzzy variable -> tag the import. Kit's merge syntax differed from his camelCase (lowercase with spaces, e.g. `{{ subscriber.short plausible reason why they signed up }}`), so he fixed the template, then used **Preview as [subscriber]** to check two real rows.

### Systematizing
Goal: every 24 hours, pull new subscribers from the Kit API, generate the three fields, write them to custom fields, send the welcome broadcast to exactly that day's signups. Kit's MCP lacked the needed endpoints, so he used a V4 API key in the environment (verified with a read-only call in a new chat, pasting the old conversation in for context). Claude's design: tag new subscribers `maker school welcome pending` -> write fields -> set the draft broadcast's filter to that tag and send now -> remove the tag (prevents double sends). Built as a skill, then a cloud routine with the Kit key in the cloud environment. He did not blast because his test rows were fake: "that is how you hurt your deliverability."

## Step by step

1. Write the email by hand. Mark 2 to 4 slots as camelCase fuzzy variables with descriptive names. Keep AI slots short.
2. Export the audience with every field you actually collect (sign-up reason, timeline, area, price range, challenge).
3. Run the personalization prompt on a Google Sheet/CSV. Demand per-row, non-templated copy. Output to a new file.
4. Review 10 rows. Tighten length (10 / 10 / 5 words) and make each phrase grammatically slot into its sentence.
5. Import into the email platform as custom fields. Fix merge syntax. Preview 2 real rows.
6. Build the daily skill against the platform API (new subscribers -> fields -> tagged broadcast -> untag). Promote to a routine with the key in the cloud env.

## Templates / prompts

Personalization prompt (fill in):
```
Personalize this contact list for an email campaign. Source: {{sheet link / CSV}}.
Columns: {{list}}. Template merge variables: {{camelCase names + the exact sentence each sits in}}.
Context: {{who sends it, what it is, tone}}. Sender voice: casual, direct, first person, no em dashes.
Do this in one step without clarifying questions:
1. Read every row. Do not sample.
2. For each row write {{n}} new values, custom to that person, drawn from their other fields,
   varied in structure row to row. Lengths: {{10 / 10 / 5}} words. Each must read naturally
   when dropped into its sentence (no names inside the value).
3. Do not modify the source. Create a new file "{{title}}" with original columns + new ones appended
   in this order: {{order}}. Validate, then give me the link.
```

Caleb's example template:
```
Hey {{firstName}},
Thanks for reaching out about {{shortPlausibleReasonTheyReachedOut}}.
I put together a quick read on {{neighborhoodOrPriceBandTheyCareAbout}} below.
I know {{paraphrasedConcern}} is on your mind, so I'll keep it practical.
Talk soon,
Caleb
```

## Pitfalls Nick calls out

- Too-long AI phrases read as AI. 10 words beats 25.
- Values that include the person's name break the sentence they slot into.
- Merge syntax differs per platform. Preview real rows.
- Never send to fake/test rows. Deliverability damage is real.
- Verify the output by hand before automating ("start at the end").

## How Caleb should use this

- Sources: Zillow/Realtor.com inquiry fields, open-house sign-in sheets, website valuation forms, Facebook lead forms. Collect 2 to 3 fuzzy-friendly fields (timeline, area, biggest worry) and no more. Fewer questions means more sign-ups (see RACE booking %).
- Emails to personalize: new-lead welcome, monthly market update to sphere, past-client anniversary check-in, "homes that match what you told me" digest.
- Keep the body human and local (St. Francisville, Zachary, Baton Rouge references). Let AI fill only the two or three slots.
- Daily routine: new leads from the last 24h -> fields -> tagged welcome send. Any actual send **needs Caleb's approval before running**. Start with drafts to a review folder.
- Comply with CAN-SPAM and brokerage email rules. Keep the KW First Choice signature and unsubscribe intact.

## Verification

- A 10-row sample shows distinct wording per row with no repeated template sentences.
- Previewing 2 real subscribers in the email platform renders every fuzzy field grammatically.
- Daily skill: new subscribers get fields written, tagged, sent once, untagged. No duplicates on a second run.
