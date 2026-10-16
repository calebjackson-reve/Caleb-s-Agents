---
name: cs-cold-email-campaign-cloner
description: Builds a cold email campaign skill modeled on Nick Saraev's "/cold-email-campaigns", which takes a client or offer brief, finds the highest-performing existing campaigns, rewrites them for the new niche with split-test variants and a follow-up, and sets them up in the sending platform. Use when Caleb says "write a cold email campaign", "clone my best campaign for this offer", "set up outreach to investors", "draft a sequence for absentee owners", or wants AIRE to produce outreach copy from a proven template.
---

# Cold Email Campaign Cloner

**Source:** Nick Saraev, "CLAUDE SKILLS FULL COURSE: Automate Your Work (2026)", chapter 4 (https://www.youtube.com/watch?v=sduaTkhIm_w&t=285s)

## What Nick teaches

A cold email "goes to somebody who you haven't actually talked to before" and tries to sell a service. Nick runs cold email for clients and constantly has to iterate campaigns for new client information. The skill automates that.

He types `/cold-email-campaigns`. The skill asks: **"Hey, what are the details of the client?"** He voice-dictates:

> "The client is 1 Second Copy. Their offer is they want to write free 500-word sample articles with no strings attached. Find the similar campaigns and then use those as inspiration."

The skill then:
1. Goes through his cold email platform and finds high-performing pre-existing campaigns similar to the offer.
2. Duplicates them and rewrites them "so that they're as similar and high quality as humanly possible for that given niche."
3. Sets the campaign up in the cold email platform, including offer management.
4. Produces several variants to split test, plus a follow-up email.

Example output he showed, subject roughly "Nick, just wrote you a blog post":

> "Hey Nick, big fan of your work. Was on 1 Second Copy's site earlier. Thought I'd write you a free 500-word sample article with a twist. I'm not going to pitch you. Giving value up front is how you form connections, so I thought I'd start with that. If you have any interest, just reply and I'll send it right over. If you want more, just say the word. Got a few other interesting pieces of content for you."

Time saved: a step that took 30 to 60 minutes logistically, and 3 to 4 hours including offer work, now takes minutes. Because templates handle "80 to 90% of my work," and with Opus 4.5 and now 4.6 the output is good enough that "half the time I don't actually make a change. I just say, okay, sure, let's give this a test."

He doesn't name his cold email platform in this chapter. Model names and platform details may have changed.

## Step by step

1. Ask for the brief if not given: who the client/sender is, the offer, the target niche, the proof or hook, the desired reply action.
2. Load the library of past campaigns (platform export, a folder of `.md` templates, or AIRE's outreach table). Rank by reply rate or Caleb's notes on what worked.
3. Pick the 1 to 3 closest campaigns by offer type (free value upfront, question-led, referral ask).
4. Rewrite for the new offer: keep structure, length and tone, swap the specifics. Lead with value, no pitch, one clear reply ask.
5. Produce 2 to 3 subject/body variants for split testing, plus one short follow-up (2 to 3 days later, references the first email).
6. Show Caleb the full set. On approval, create the campaign in the sending platform with the variants and the follow-up step, or save to the campaigns folder if no platform.
7. Record the new campaign in the library so it can be cloned next time.

## Templates / prompts

Brief prompt the skill asks:

```
What are the details of the client? (who's sending, the offer, who it's for, what you want them to do)
```

Value-first template (Nick's structure):

```
Subject: {first}, {did a specific thing for you}

Hey {first}, {one-line genuine compliment or observation about them}.
{I did / prepared / noticed} {specific free value} with a twist: I'm not going to pitch you.
Giving value up front is how you form connections, so I thought I'd start with that.
If you have any interest, just reply and I'll send it right over.
{Optional: got a couple more if you want them.}
{Sign-off}
```

Follow-up:

```
Hey {first}, bumping this in case it got buried. Still happy to send over {the thing}. Just say the word.
```

Skill request Caleb can give Claude:

```
Build a skill called cold-email-campaigns.
When I run it, ask me for the client/offer details.
Find my 2-3 best similar past campaigns in <library path or platform>, clone and rewrite them for this offer,
give me 3 split-test variants and a follow-up, and show me everything before creating anything.
After approval, set it up in <platform> and save a copy to the library.
```

## Pitfalls Nick calls out

- Don't write from scratch when you have winners. Clone the proven structure and swap specifics.
- Keep it sounding human and generous. The example is all value and zero pitch.
- Always produce variants and a follow-up, not one email.
- Test rather than overthink. Ship it and read the numbers.

## How Caleb should use this

- Absentee-owner and investor outreach: offer a free rental analysis or off-market valuation for a specific property, no pitch.
- Expired and FSBO sellers (where compliant): "I put together a quick pricing snapshot for {address}, want it?"
- Relocation managers and HR at local employers: free relocation guide for St. Francisville and Baton Rouge.
- Recruiting agents to Keller Williams First Choice with a value-first note.
- Sending cold email touches CAN-SPAM, Louisiana real estate advertising rules and do-not-contact lists. Drafting is fine. Sending any campaign needs Caleb's approval before running.

## Verification

- The skill asked for the brief, then named which past campaigns it cloned and why.
- Output contains at least 2 variants and 1 follow-up, each under about 120 words.
- Copy references the specific offer and target, with no generic filler.
- Campaign appears in the platform (or library folder) only after Caleb approved.
