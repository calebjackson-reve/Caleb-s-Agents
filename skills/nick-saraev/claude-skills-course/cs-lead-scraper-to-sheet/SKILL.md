---
name: cs-lead-scraper-to-sheet
description: Builds a natural-language lead scraping skill modeled on Nick Saraev's LinkedIn Sales Navigator scraper, which turns "scrape me 50 <role> in <place>" into filtered search URLs, pulls names and emails, and lands a clean list in a Google Sheet while running in the background. Use when Caleb says "scrape leads", "build me a list of investors in Baton Rouge", "find 50 relocation managers", "pull contacts for outreach", or wants AIRE to source B2B or investor prospect lists.
---

# Lead Scraper to Google Sheet

**Source:** Nick Saraev, "CLAUDE SKILLS FULL COURSE: Automate Your Work (2026)", chapter 4 (https://www.youtube.com/watch?v=sduaTkhIm_w&t=285s)

## What Nick teaches

Nick's third skill scrapes leads from natural language. He types: **"Scrape me 50 management consultants in, let's say, Arizona."**

What it does:
1. Goes to LinkedIn Sales Navigator, which he calls "currently the highest quality place that you can get information about real human beings" and "the most current" B2B source. "Most other services just scrape from there anyway."
2. Creates a bunch of LinkedIn search URLs. Sales Navigator lets you filter "really granularly" on job title, location, seniority level and industry.
3. Returns the list not in Sales Navigator but in a Google Sheet, with full names, first names, last names and email addresses.
4. Runs in the background while he does other work. It "can retest its leads, it can figure out the best filters to use."

Timing and cost: "within three or four minutes I end up with a nicely optimized list of high-quality leads with probably the highest deliverability out of any source," and it's "done pretty effectively via cost as well." He notes pre-existing tools exist for Apollo and similar, but not a big one for Sales Navigator, so going "straight to the source" is the edge.

Nick does not detail the scraping mechanism or email-enrichment provider in this chapter. Treat the specific tooling as his, and note Sales Navigator terms, pricing and anti-scraping measures may have changed.

## Step by step

1. Parse the request into filters: role or title, geography, count, optional seniority or industry.
2. Check for an existing scraper script or data provider config in the repo before building new.
3. Build the search URLs (or API queries) from the filters. If the first filter set under-delivers, loosen one filter at a time and retry.
4. Collect name, title, company, location, profile URL. Enrich with email through whichever provider Caleb has configured. Flag unverified emails.
5. Dedupe against the existing CRM and prior sheets.
6. Write to a Google Sheet named `<role> - <place> - <date>` with columns: first, last, title, company, location, email, email_status, source_url, scraped_at.
7. Report count delivered vs requested and which filters were used. Run as a background task and notify when done.

## Templates / prompts

Trigger phrasing:

```
Scrape me 50 real estate investors in Baton Rouge.
Scrape 30 corporate relocation managers in Louisiana, director level and up.
```

Skill request Caleb can give Claude:

```
Build a skill called lead-scraper.
Input: a sentence like "scrape me N <role> in <place>".
Turn it into granular search filters (title, location, seniority, industry), run the search,
collect name/title/company/profile URL, enrich emails with <provider>, dedupe against my CRM,
and write to a new Google Sheet. Run in the background and tell me when it's done,
with how many leads you got vs how many I asked for.
```

Sheet layout:

```
first | last | title | company | location | email | email_status | source_url | scraped_at
```

## Pitfalls Nick calls out

- Secondary databases are stale. Go to the freshest source you can.
- Filters matter. Granular title plus location plus seniority is what makes the list worth emailing.
- Let it iterate. The skill should retest and adjust filters on its own rather than returning a thin list.
- Deliverability is the whole game for cold email, so the email quality of the source matters more than volume.

## How Caleb should use this

- Investor lists: "real estate investors", "property managers", "1031 exchange" contacts in Baton Rouge, Zachary, St. Francisville and surrounding parishes, for off-market and listing outreach.
- Relocation and referral sources: HR and relocation managers at large Baton Rouge employers, LSU departments, hospitals, plants along the river.
- Local business owners for sphere-of-influence and commercial referral partnerships.
- Scraping and enrichment cost money per lead and touch third-party terms of service. Running the scraper needs Caleb's approval before running, and any emailing of the list goes through the cold email skill with its own approval.

## Verification

- A new Google Sheet exists with the expected columns and roughly the requested count.
- Spot-check 5 rows: title and location match the filters, emails are present and marked verified or unverified.
- No duplicates against the CRM.
- The run summary states filters used and leads delivered vs requested.

## Example run (Caleb)

```
Caleb: Scrape me 40 property managers in Baton Rouge.
Claude: Filters: title contains "property manager", location Baton Rouge LA metro, seniority any.
        Found 31 on first pass. Loosened location to East Baton Rouge + Ascension + Livingston. Found 52.
        Enriched emails: 44 verified, 8 unverified. Deduped 3 already in CRM.
        Wrote 49 rows to "Property Managers - Baton Rouge - 2026-10-15".
        Delivered 49 of 40 requested. Sheet link: <url>
```

What the skill's SKILL.md should say about iteration (Nick: "it can retest its leads, it can figure out the best filters to use"):

```markdown
## Filter strategy
- Start narrow (exact title, exact city). If results < requested, loosen one filter at a time:
  nearby parishes, then adjacent titles, then seniority.
- Never pad with off-target rows to hit the count. Report the shortfall instead.
- Mark every email with a status so the cold email skill can skip unverified ones.
```

Cost note from Nick: he describes this as "done pretty effectively via cost," but does not give numbers. Caleb should check current pricing for whatever enrichment provider gets wired in, since it has likely changed.
