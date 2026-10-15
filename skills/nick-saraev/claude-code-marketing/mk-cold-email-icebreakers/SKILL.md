---
name: mk-cold-email-icebreakers
description: Builds a cold-outreach enrichment skill that scrapes a lead list (Apify), self-checks the list against your ICP, writes fuzzy "thing in common" icebreakers and prospect-specific phrases per row, trims the CSV to only the fields a sending tool needs, and loads it into Instantly or similar. Use when Caleb says "write icebreakers for this list", "enrich these FSBO / expired / investor leads", "scrape me 100 landlords in Baton Rouge", "cold email absentee owners", "make my outreach sound personal", or wants outbound to sellers, investors, builders, or referral partners.
---

# Cold email icebreakers and lead-list enrichment

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapter 11 (https://www.youtube.com/watch?v=yulWjh3rq28&t=13381s)

## What Nick teaches

Same fuzzy-variable idea as newsletters (`mk-fuzzy-variables-newsletter`), different data source: instead of opt-in forms, you **scrape** (LinkedIn Sales Navigator, Apify actors) and the sending platform is a cold tool (**Instantly**) rather than Kit/Mailchimp.

Nick's door-to-door and cold DM experience: templated outreach got **1 to 2% replies**. Adding one personalized line ("love your last vid", "big fan of X business") got ~**5%**, i.e. 2.5x the revenue. His best campaign (conference attendees + company research) hit **20%+ positive replies**. A 2 to 4% campaign still made hundreds of thousands at scale.

### Copy style that works now
Lowercase, casual, slightly imperfect, no em dashes, no perfect grammar, because readers assume perfect = AI spam. Claude flagged that the template's numeric claims must be real and substantiated or they get accounts suspended. His demo template:

```
yo {{firstName}}, saw {{theirThingInCommon}}. {{myThingInCommon}} and wanted to say hi.
i run b2b outbound for agencies doing 5m/yr+. we work with {{known client}} and just helped them
close 500k in the last 45 days. real talk, i've done my research and i think {{companyName}} is
fairly close to that number. if so, hear me out. i want to guarantee you an additional 20 booked
meetings a month with qualified {{prospectsInTheirSpecificTerminology}}. costs $0 upfront, i do
the work, free if i miss. are you open to this? 30 min on the phone. thanks, nick
```
Fuzzy variables are anything in double curly braces. Give the AI "a big blurb about all the things about your life and let it do the matching."

### Data
Apify lead actors (Pipeline Labs lead finder, Apollo/ZoomInfo style): filters for job title, seniority, verified email, phone. He paid about 18 cents for 100 emails in the demo (prices change). A scrape returns 30+ columns: revenue, company description, specialties, city, state, technologies used, LinkedIn URLs.

### The build
1. Paste template + 5 sample leads: "anything in curly brackets is an AI variable that weaves in naturally. Create five email variants so I can judge quality. You know me. Research me if needed. These prospects are hypothetical so don't research them."
2. Review: "Yo Luke, saw you're running performance marketing out of Tampa. I've spent a lot of time in the Florida agency scene too..." plus prospect terms like "qualified western brands entering China."
3. Scale to the sheet: "update this Google Sheet with those variables as new columns for every row, so I can merge them directly."
4. **Skill**: input = lead list. Output = enriched list with 4 new columns. Also **trim the CSV**: keep only the 4 custom fields + first name, last name, email, company name, company size (plus location if wanted) so uploads are painless.
5. **Add scraping**: connect Apify via its MCP configurator URL as a custom connector. "Steer Apify to scrape the leads, then run the enrichment, in one shot. Scrape 100 (the minimum), enrich 10 as a test." Roles he targets: founder, CEO, co-founder, owner, co-owner, partner.
6. **ICP self-check loop** (his real SOP, turned into the skill): scrape 100 -> sample 20 -> count how many match the ICP -> if **15/20 or more**, accept. Else redo with adjusted filters. His run went 9/20, 9/20, 15/20, 19/20 on its own.
7. Load into Instantly: subject `{{firstName}}`, body with merge variables, import the enriched CSV, **preview** real rows (he caught a stray "too" and one line that sounded AI).
8. He made a routine ("Daily Clarvo Legion", 5:59 a.m. PDT) as a demo but notes this is bottleneck thinking: he doesn't need fresh lists daily, so a skill run on demand is enough.

## Step by step

1. Write the cold email by hand in your voice. Mark 2 to 4 fuzzy slots (their thing, my thing, their terminology, paraphrased situation).
2. Write a "facts about me" blurb for matching (hometown, background, hobbies, clients, markets).
3. Define the ICP in one paragraph and the target roles.
4. Connect the scraper (Apify custom connector) and run a 100-lead scrape. Have Claude sample 20 and score. Loop until >= 15/20.
5. Enrich 10 rows, review, then all rows. Trim columns. Save the enriched CSV.
6. Import into the sender, preview 3 to 5 rows, fix merge syntax or odd lines.
7. Consolidate as a skill (input list or filters -> output trimmed enriched CSV). Routine only if lists are needed daily.

## Templates / prompts

Enrichment prompt:
```
Above is my cold email template. Anything in {{double braces}} is an AI variable. These must weave
into the email naturally and never read like a variable. Here is a blurb about me for matching:
{{me blurb}}. Here is the ICP: {{paragraph}}.
Step 1: for these 5 leads write 5 full email variants so I can judge quality.
Step 2 (after my OK): add one column per variable to {{sheet/CSV}} for every row.
Rules: lowercase casual, no em dashes, no invented numbers, 8 to 15 words per variable,
vary wording row to row. Output a trimmed file with: {{variables}}, first name, last name, email,
company name, company size, city.
```

Scrape + QA loop prompt:
```
Use the Apify connector and actor {{name}} to scrape 100 leads matching: roles {{list}},
location {{area}}, filters {{...}}. Then sample 20 at random and score each against the ICP.
If fewer than 15 of 20 match, adjust the filters, explain what you changed, and re-scrape.
Repeat until >= 15/20. Then run the enrichment on all rows and give me the trimmed CSV.
```

## Pitfalls Nick calls out

- Unsubstantiated numbers in outreach get accounts suspended and may be deceptive.
- Perfect grammar reads as AI. Some lines will still sound AI, preview and edit.
- Lead data is scraped, not given. Use responsibly and follow email/privacy rules.
- Don't make it a daily routine unless you truly need a list every day.
- Sending cold email needs proper infrastructure (domains, warmup). Instantly handles sending, not reputation.

## How Caleb should use this

- Outbound targets for KW First Choice: absentee owners and landlords in West Feliciana/EBR, expired and withdrawn listings, FSBOs, builders and developers, relocation HR contacts at Baton Rouge employers, lenders and inspectors for referral partnerships. Keep each list to one ICP.
- Caleb's "me blurb": St. Francisville local, KW First Choice, AIRE builder, family, community involvement. Let Claude match on real common ground only.
- Compliance: cold email to consumers must follow CAN-SPAM. Cold texting/calls need TCPA and DNC checks. Louisiana real estate advertising rules apply. Any send **needs Caleb's approval before running**, and scraping credits (Apify) **need Caleb's approval before running**.
- Start on demand, not scheduled: run the skill when a campaign is planned, review the 20-row ICP sample yourself the first few times.
- Reuse the trimmed CSV format as the standard import for the CRM.

## Verification

- Five sample emails read as human and each variable fits its sentence.
- ICP sample scores >= 15/20 before enrichment runs.
- Trimmed CSV has only the agreed columns. Sender preview renders 3 random rows cleanly.
