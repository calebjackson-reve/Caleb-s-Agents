---
name: cs-outreach-website-builder
description: Builds a one-prompt website generator skill modeled on Nick Saraev's outreach site builder, which produces a high-quality templated-but-unique site for a prospect or client, pushes it to Netlify and returns a live link to send as a cold-outreach value add. Use when Caleb says "build a quick site for this listing", "make a landing page for this seller", "spin up a page for the open house", "build a free site for this local business", or wants AIRE to generate single-property or lead-magnet sites.
---

# Outreach Website Builder (one prompt to live link)

**Source:** Nick Saraev, "CLAUDE SKILLS FULL COURSE: Automate Your Work (2026)", chapters 4-5 (https://www.youtube.com/watch?v=sduaTkhIm_w&t=285s)

## What Nick teaches

Nick's fifth skill is "a simple website builder." His goal: "quickly and easily whip up high-quality, reasonably templated, but also pretty unique websites for clients or prospects, and then just send them over, whether or not I have their business."

The idea is **knowledge arbitrage in cold outreach**: because he has access to these tools and most prospects don't, he can offer "completely free websites" or a simple templated site and "really blow their socks off." He calls it "probably the biggest value add that you can get so far" and "very, very low-hanging fruit." An average person getting a site like this free would say, "No way, really? There has to be a catch." Yet it costs "cents on the dollar" and one prompt.

How it works:
1. One prompt with the prospect's details.
2. The skill uses "its own customized prompt" to build slightly different navigation bars, menus and content types each time, with "high-quality animations."
3. When done, it pushes the site to **Netlify** and returns a link he can click and send.

He showed a similar builder in his Claude Code and Gemini courses. Netlify pricing and deployment details may have changed since recording.

## Step by step

1. Collect inputs: business or property name, what they do, location, 3 to 5 key facts or features, contact info, a photo or two if available, desired vibe (modern, warm, luxury).
2. Pick a layout variation from a small internal menu (hero style, nav style, section order) so sites don't look identical.
3. Generate a single static site: `index.html` with inline CSS and light JS animations, mobile-first, fast. No frameworks needed.
4. Review it locally (open in browser or screenshot) and fix obvious issues.
5. Deploy to Netlify (or Caleb's chosen host) via CLI, with a sensible site name.
6. Return the live URL plus a one-line outreach message that references it.
7. Save the source under `output/sites/<slug>/` for edits later.

## Templates / prompts

Skill request Caleb can give Claude:

```
Build a skill called quick-site.
Input: a short brief (name, what they do, location, 3-5 highlights, contact, vibe).
Generate a polished single-page static site with a hero, about, highlights, gallery placeholder, contact section,
and tasteful scroll animations. Vary the nav and section layout between runs.
Deploy to Netlify and give me the live link and a 2-sentence message I can send with it.
Do not deploy until I've seen a screenshot and said go.
```

Single-property site brief:

```
Name: 1234 Royal Street, St. Francisville
Highlights: 4 bed / 3 bath, 2,850 sq ft, 1.2 acres, renovated kitchen, screened porch
Vibe: warm Southern, lots of white space
Contact: Caleb Jackson, Keller Williams First Choice, <phone>, <email>
Sections: hero photo, property story, features, photo grid, map, schedule-a-showing form
```

Outreach line to send with the link:

```
Hey {first}, I put together a quick site for {business/property} as a thank-you for being local. No catch, it's yours: {url}. Happy to tweak anything.
```

## Pitfalls Nick calls out

- Keep it "reasonably templated but pretty unique." Vary nav and content types so prospects don't see copies.
- Quality matters. It has to look like something they'd pay for or the gesture falls flat.
- Send the link. The finished, hosted site is the value, not a mockup.

## How Caleb should use this

- Single-property websites for every listing (a KW listing-presentation differentiator), with a showing-request form that feeds AIRE.
- Free sites for local St. Francisville and Baton Rouge small businesses as a sphere-building gesture that turns into referrals.
- Open house and neighborhood landing pages ("Living in St. Francisville") as lead magnets.
- Seller pre-listing pitch: show the seller a draft site of their home during the listing appointment.
- Deploying to a public host and sending outreach are external actions. Each deploy needs Caleb's approval before running, and anything showing a property needs MLS and brokerage compliance (equal housing, brokerage name) on the page.

## Verification

- A live URL loads on mobile and desktop with no broken sections.
- Two consecutive runs produce visibly different layouts.
- Brokerage name and required disclosures appear in the footer for property sites.
- Source saved locally under `output/sites/<slug>/`.

## Example run (Caleb)

```
Caleb: Build a quick site for Magnolia Cafe in St. Francisville. Southern breakfast spot, open 7-2,
       known for biscuits, live music Fridays, 5 stars on Google. Warm vibe.
Claude: Picks layout variant B (centered hero, sticky nav, three-column highlights).
        Generates output/sites/magnolia-cafe/index.html. Screenshot shown.
Caleb: Go.
Claude: Deploys to Netlify: https://magnolia-cafe-stf.netlify.app
        Message: "Hey Sarah, put together a little site for Magnolia Cafe as a thank-you for the
        best biscuits in town. No catch, it's yours: <url>. Happy to tweak anything."
```

Layout variation menu to include in the skill (so runs don't look alike):

```markdown
## Layout variants (pick one at random per run, record which)
A. Full-bleed hero image, top nav, alternating image/text sections
B. Centered hero with headline, sticky nav, three-column highlights, gallery grid
C. Split hero (text left, image right), side nav on desktop, timeline-style story section
Animations: fade-up on scroll, subtle hero parallax, hover lift on cards. Keep under 300 lines of CSS/JS.
```

Nick's framing to keep in mind: the site is a gift that opens a conversation. The skill should make it effortless enough that Caleb can send one to a new local business every week.
