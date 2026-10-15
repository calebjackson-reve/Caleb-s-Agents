---
name: aw-improve-and-chain-workflows
description: Improves existing agentic workflows over time with the "make it faster, make it cheaper" loop and Nick's order-of-magnitude rule (only optimize for 10x gains), then chains proven workflows into umbrella meta-directives so one command runs the whole sequence. Use when Caleb says "make this faster", "this costs too much", "is it worth optimizing", "run the whole onboarding in one go", "chain these together", "I keep forgetting to kick off the next step", or when AIRE has several working workflows that always run in sequence (lead intake, enrichment, follow-up, CRM update).
---

# Improve and Chain Workflows

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 24 and 31
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=12806s and &t=15316s)

## What Nick teaches

**How to improve:** "You just ask." Literally "can you make this faster? can you make this cheaper?"
repeated 30 times. Better: "list 10 approaches to make this cheaper" or "list 20 approaches to make
this faster." Most will not work. Use human judgment to pick one, implement it, repeat.

**The order-of-magnitude rule.** Nick no longer optimizes unless he can get at least a 10x
improvement in a key metric (time, cost or accuracy). A 3-minute to 2-minute change is a 33% gain,
but the implementation time multiplied by the introduced error risk (optimizations usually trade
accuracy or reliability for speed) means you usually lose. His example: a serial lead scrape took 20
minutes for 2,000 leads. He tried everything (compute, Apify actors, Sheets API requests) and got it
to 15 minutes, a 25% gain that "turned the flow into an unreliable mess" and was not even his
bottleneck. Then a batch-parallel approach sent 100 at a time 20 times and finished in about 1
minute, a 20x gain. That one was worth it. Things that typically give 10x: parallelization, multiple
threads or workers, software to hardware encoding, changing the order of operations. "Unless the
model expects at least a 10x boost, I don't recommend doing it."

**Workflows become a permanent, reusable library.** Directives and scripts are words on a page, more
portable than any no-code blueprint. Open them in any IDE or model, copy to a colleague, put them on
GitHub. Nick's library does lead scraping, enrichment, personalized campaign replies, voice agent
calls, proposals and slide decks "customized to how I communicate." A real example: he forgot a
weekly community post three weeks running, asked the agent "any ideas?", it found his existing login
system, built a scraping spec and automated the post in 3 minutes on a schedule.

**Meta-directives (umbrellas).** Once individual workflows work, group them. A "new client" umbrella
runs welcome email, workspace setup and email copywriting in sequence. A "marketing" umbrella holds
scrape leads, create ad copy, voicemail drops. Keep the child directives as separate files so the
model loads only what it needs. The umbrella just chains the existing capabilities. Then you say
"run the new client workflow," step away, have a cup of tea, and come back.

**Why chaining matters (chapter 31):** it removes the manual handoff. Without an umbrella, the
scraper finishes and says "done," you must paste the link into enrichment, then paste that into
sending. Nick has had 10 instances open and forgotten to tell one to continue ("would you like me to
send the email?" sat waiting for an hour). His end-to-end new client workflow: analyze client niche,
scrape leads, enrich emails, personalize first lines, deliver a Google Sheet. Higher abstractions
come later ("do all the marketing for this campaign"). After any good output, tell the model "this
worked great" and have it update the directive, it is nearly free and locks in the result.

## Step by step

1. After a workflow runs reliably, ask for 10 to 20 ways to make it faster or cheaper.
2. Discard anything under a 10x expected gain. Pick one candidate with a clear path to 10x.
3. Implement, test on the same input, compare time, cost and accuracy. Keep only if accuracy held.
4. Record the change in the directive change log.
5. When two or more workflows always run back to back, write an umbrella directive that calls them
   in order and passes outputs forward.
6. Keep each child directive separate. The umbrella only references them.
7. Test the umbrella from a fresh session with one command.

## Templates / prompts

```
List 20 approaches to make the seller_lead_scrape workflow faster. For
each, estimate the speed gain, the cost change and the risk to accuracy.
Flag any that could plausibly give a 10x improvement.
```

```
This worked great. Update the directive and scripts so it runs exactly this
way next time, and add a change log line.
```

Umbrella directive:

```markdown
# New Listing Launch (umbrella)

## Objective
Run the full listing launch sequence with one command.

## Inputs
- MLS number or address, photo folder path.

## Process
1. Run directives/listing_one_pager.md. Capture the PDF path.
2. Run directives/listing_social_captions.md with the PDF facts. Capture captions.
3. Run directives/crm_tag_sphere_by_area.md to find contacts within 5 miles.
4. Run directives/just_listed_email_draft.md for that contact list.
5. Return: flyer path, captions, contact count, email draft. Send nothing.

## Definition of done
All four child outputs exist in tmp/launch_<mls>/ and are summarized.
```

## Pitfalls Nick calls out

- Small optimizations. They add fragility for marginal gains.
- Optimizing something that is not the bottleneck.
- One giant umbrella file instead of separate children. The model loads too much context.
- Forgetting to confirm a good result. The directive never learns what "good" was.
- Manual handoffs between finished workflows. You will forget one.

## How Caleb should use this

- Umbrella one: "new buyer lead" (intake, property lookup, CRM create, draft reply). Umbrella two:
  "listing launch" (flyer, captions, sphere match, just-listed draft). Umbrella three: "weekly
  client update" (status pull, market stats, draft emails).
- Apply the 10x rule to enrichment and data pulls. Batching contacts into one API call is a 10x
  candidate, shaving seconds off a script is not.
- Every umbrella ends in drafts and summaries. Sending, posting or publishing needs Caleb's approval
  before running.
- Share umbrellas with a transaction coordinator so they run the same sequence.
- Say "this worked great, update the directive" after any output Caleb would be happy to send to a client.

## Verification

- A one-line command runs the full umbrella from a fresh session and produces every child output.
- Optimization changes show a measured before and after in the change log, and accuracy did not drop.
- Child directives are still runnable on their own.
- No step waits on Caleb mid-sequence except an explicit approval gate.
