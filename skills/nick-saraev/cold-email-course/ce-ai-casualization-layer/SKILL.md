---
name: ce-ai-casualization-layer
description: Uses AI the only way Nick Saraev recommends for cold outreach copy: not to write the email, but to fill small templated variables (casual company name, neighborhood nickname, most relevant web property) inside a human-written template that already works. Use when Caleb says "clean up these company names for the mail merge", "turn these addresses into neighborhood names", "personalize this template with AI without it sounding like AI", "build a casualization step for AIRE", or when a scraped lead list needs to read naturally in a message.
---

# AI as a Casualization Layer, Not a Copywriter

**Source:** Nick Saraev, "COLD EMAIL COPYWRITING & OUTREACH Full Course 2026", chapter 28, first half (https://www.youtube.com/watch?v=uSTGNHGFOAo&t=12785s)

## What Nick teaches

Despite being "the AI guy," Nick rarely uses AI in his copywriting. About 18 months before recording he experimented heavily with AI personalization and found that personalization does not replace a good campaign, and models cannot yet write persuasive copy at the level the market requires. Copywriting skill is logarithmic: roughly 75% of available skill comes in the first two weeks to a month of practice, and the remaining 25% takes years. AI sits around the two-week mark. The market's skill floor is above that, so AI-written campaigns do not get opened. Across 10,000+ Maker School members doing Upwork proposals, Loom scripts, and cold email, the ones who lean hard on AI "tend to suck."

So: write the email yourself, get to competence, then use AI only for spot checks and for **small templated variables inside a pre-established, already working template.**

Approved uses:
1. **One personalization variable.** Template: "Hey Nick, love your {{channel or web property}} man. Big fan, has made me think a lot about {{topic they're involved in}}." Feed the model their scraped profile or dossier and ask only for "their most popular web property" and "the topic." Output: "love your channel man" for a YouTuber, "love your LinkedIn posts" for a LinkedIn writer. The sentence frame is human, AI fills one slot.
2. **Casual version of company name.** Scrapers return "LeftClick Incorporated" or "The Pacific Creative Group LLC." Nobody talks like that. Humans say "LeftClick" or "PCG" (long names become acronyms internally). "Love PCG" makes the reader think "wait, is this an old business contact?" Nick has run dozens of campaigns where this was the only AI variable. He calls it the casualization layer and has Claude Code skills for it.
3. **Casualize neighborhoods, schools, and other rapport hooks.** Input "Vancouver, British Columbia" plus an address, output "East Van." "Heard you live in East Van" is something only a local would say. AI has enough geographic knowledge to do this for most cities.
4. **Scraping and enrichment** of leads in the first place (covered in his other videos: Airscale, LinkedIn Sales Navigator, Vayne.io, custom directories and conference lists).

Not approved: handing the model the whole email, AI-generated openers ("love how passionate you are about..."), or "AI COO" style sender personas.

## Step by step

1. Write and prove the template by hand first (ce-four-step-framework, ce-sunday-iteration). No AI until a variant is performing.
2. Identify at most one or two slots where a scraped fact would help: company name, neighborhood, web property, school.
3. Write a narrow prompt per slot that returns only the casualized value, with a fallback when uncertain.
4. Run it over the list. Spot check 20 rows by eye. Fix the prompt, not the rows.
5. Render 10 full messages and read them aloud. If any slot reads as scraped, tighten the prompt or drop the slot.
6. Keep the rendered variable unformatted in the message (no quotes, bold, or brackets).

## Templates / prompts

Casual company name:
```
You casualize company names for use in a friendly one-line message. Return only the name a coworker would say out loud.
Rules: drop Inc, LLC, Corp, Co, Ltd, "The", and "Group" unless locals keep it. If the name is 3+ words, return the acronym people would use. If a brand is clearly known by a short form, use it. If unsure, return the first distinctive word.
Input: "The Pacific Creative Group LLC"  Output: "PCG"
Input: "LeftClick Incorporated"  Output: "LeftClick"
Input: {{company}}
```

Neighborhood casualization (Caleb's market):
```
Given a Louisiana property address, return the neighborhood or area name a local would use in conversation, 1 to 3 words, no parish or ZIP. Examples: "Garden District", "Southdowns", "the Bluffs", "downtown St. Francisville", "Broadmoor", "Shenandoah". If the address is rural, return the nearest town name locals use. If unsure, return the subdivision from the legal description or the street name. Return only the value.
Input: {{address}}
```

First name from scraped name field:
```
Return the first word of the name field, title case, stripped of punctuation. If the field is obviously a company, return it unchanged.
```

Rendered line check:
```
Hey {{first}}, {{area}} is one of the areas I spend the most time in, and your place on {{street}} is one of the ones that's clearly been kept up.
```

## Pitfalls Nick calls out

- Letting AI write the opener or the whole email. It is the number one giveaway of a bad cold email right now.
- Personalization as a substitute for a good offer and a good campaign.
- Scraped values rendered raw (suffixes, caps, quotes).
- Assuming AI accuracy. Spot check, especially place names and acronyms.
- Branding the sender as an AI agent.

## How Caleb should use this

- AIRE's lead pipeline should have a casualization step between the data source (MLS exports, tax rolls, FSBO scrapes) and the message renderer: first name, street name, neighborhood nickname, casual business name for local business owners. Rendering is fine, sending is "needs Caleb's approval before running."
- Louisiana place knowledge is uneven in models. Keep a Caleb-maintained lookup table of local neighborhood names that overrides the model.
- Only use facts Caleb can lawfully hold and use. Public records and MLS data have use restrictions, and anything implying surveillance of a homeowner ("saw you bought in 2016 for $212K") should be reviewed before use.
- Use AI for spot checks ("does this read like a mass email?") after Caleb writes, not instead of Caleb writing.

## Verification

- Template was written and tested by a human before any AI variable was added.
- Each AI slot has a prompt that returns a single value with a fallback.
- 20-row spot check shows no suffixes, caps, or wrong places. Rendered samples read naturally aloud.
