---
name: ce-cold-read-opener
description: Writes first-line personalizations using Nick Saraev's cold reading technique: short, informal statements that apply to most of the audience but feel written for one person, plus voluntary disclosure and safe handling of scraped name and company variables. Use when Caleb says "write an opener for this homeowner", "personalize these 200 absentee-owner letters without AI slop", "my merge fields look fake", "how do I start a text to a FSBO", or when AIRE is generating the first sentence of any outbound at scale.
---

# Cold Reading Openers and Safe Variables

**Source:** Nick Saraev, "COLD EMAIL COPYWRITING & OUTREACH Full Course 2026", chapters 5 and 15 (https://www.youtube.com/watch?v=uSTGNHGFOAo&t=2094s and https://www.youtube.com/watch?v=uSTGNHGFOAo&t=6372s)

## What Nick teaches

The opener's only job is to make the reader think "wait, do I know this person?" and buy 30 seconds of attention. The best way to do that at scale is **cold reading**: the mentalist's trick of making observations that apply to 80% of people but that each person believes is about them. "You're usually quiet, but talkative once you're comfortable."

Nick's example, sendable to any male business YouTuber:
> "Hey Nick, love your channel man. Very no-BS and has helped me get started in management consulting. Think I can help you with something and maybe return a bit of the favor you've unwittingly done me."

Every creator thinks their channel is no-BS. "Management consulting" is general enough to fit any business content. And the management consulting line is **voluntary disclosure**: you gave up a fact about yourself, so the reader trusts you a little more.

Rules:
- Short and informal. One sentence ideal, two max. Longer personalization reads as less real, not more.
- "Would a real person send this?" If yes, you have an opener.
- The opener must not signal selling.
- Casual qualifiers matter: "man," "lol," "btw." Match the audience. A woman writing to women can use "hey girl." Mirror the group.
- Use in-group language the reader uses with peers (YouTubers: CTR, thumbs, subs. Realtors: DOM, comps, under contract).
- A "bridge" phrase ("wanted to run something by you") keeps it from feeling disjointed, but is optional.

**Step up: cold read plus one scraped fact.** "Saw you went to UCLA, wild, my cousin went down there." A single verifiable detail woven into a cold-read sentence. Nick says you do not need AI personalization at all, cold reading alone works, but one real detail helps.

**Scraped variable hygiene** (from the roasts):
- Never let a raw scrape land in the greeting. "Hi Nick's Daily Updates" and "Hi Nick Automates" killed otherwise decent emails.
- Fix: take the **first word** of the scraped name field. "Nick Saraev" becomes "Nick." "Nick Automates" becomes "Nick." If the field is a company it becomes the company's first word, which is still better.
- Never put quotes, bold, or special formatting around a variable. It proves it was scraped. The variable must read as if you typed it.
- No comma before the name in a templated way that looks mechanical.
- Reuse one variable in a natural second spot ("I watched your last Claude Code video" when you know they make AI content) instead of scraping ten facts.

Opener patterns Nick used across the roasts:
- "Huge work on the 290K month, man. We're lucky to have you."
- "Love your channel man. Have watched so many of your vids. My GF says I listen to you more than I listen to her lol."
- "Been with you since the OG days, great to see you get some much deserved traction."
- "Love your design btw."
- "Just watched your vid on X and felt like I had to send this."
- Subject-style: "Nick, you looked sad in your last vid."

## Step by step

1. Define the audience segment narrowly enough that one statement is true for most of them (men, creators over 10K subs, owners of 1970s brick homes in Broadmoor).
2. List five things nearly all of them believe about themselves or their situation (my house is well kept, my street is quiet, taxes went up, I've been thinking about what it's worth).
3. Write a one-sentence opener using one of those, in the voice you would text a friend. Add one voluntary disclosure about yourself.
4. If you have one reliable scraped fact (street, subdivision, year bought), weave exactly one in. Pass it through the first-word rule or the ce-ai-casualization-layer first.
5. Read it aloud. If it sounds like a compliment generator, cut it. If it sounds like a neighbor, keep it.
6. Hand off to ce-four-step-framework for the rest of the message.

## Templates / prompts

Real estate cold-read openers (true for most of the segment):
```
Absentee owner: "Hey {{first}}, I drive past {{street}} a couple times a week and your place is one of the ones that's clearly been kept up. Grew up around here so I notice."
Expired listing: "Hey {{first}}, saw the house on {{street}} come off the market. Been there myself with a listing once, it's frustrating when the first go doesn't land."
FSBO: "Hey {{first}}, saw your sign on {{street}}. Respect for doing it yourself, I've watched a few neighbors pull it off."
Investor: "Hey {{first}}, noticed you picked up a couple of doors in {{area}} the last few years. I've been quietly doing the same on the side."
```

Variable rules for AIRE:
```
first_name = first word of scraped name field, title case
street = street name only, no number, casualized ("Royal" not "ROYAL ST")
area = neighborhood or subdivision locals use, not the parish or ZIP
No quotes, bold, or brackets around any variable in the rendered message.
```

## Pitfalls Nick calls out

- LLM slop openers about being "passionate about process optimization."
- Over-personalizing. Two paragraphs about them reads as research, not friendship.
- Raw scrapes in the greeting (channel names, "Inc.", ALL CAPS).
- Formatting a variable so it stands out.
- Breaking the short-and-punchy rule before you know the rules. Some pros tell a story about their cat. You are not there yet.

## How Caleb should use this

- Build a segment-by-segment opener library (expireds, FSBOs, absentee owners, investors, past clients, local business owners for referral partnerships). Every rendered batch is "needs Caleb's approval before running."
- Caleb's voluntary disclosures are real and local: grew up in the area, Keller Williams First Choice, building AIRE, specific neighborhoods he has sold in.
- AIRE should render 10 sample messages from any batch so Caleb can eyeball variable hygiene before approving the rest.
- Keep openers truthful. "I drive past your street" only if he actually does. Cold reading is choosing true general statements, not inventing facts.

## Verification

- Opener is 1 to 2 sentences and contains at most one scraped fact.
- A sample of 10 rendered messages shows no raw company suffixes, caps, quotes, or bold around variables.
- Reading the opener aloud, a listener cannot tell it is a template.
