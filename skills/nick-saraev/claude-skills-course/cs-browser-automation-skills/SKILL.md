---
name: cs-browser-automation-skills
description: Builds one-off personal or admin skills that drive a logged-in website through Chrome DevTools MCP, modeled on Nick Saraev's WeWork desk booking and Amazon personal-shopper skills. Use when Caleb says "automate this website for me", "book this every day", "go find the best option on this site and compare", "fill out this portal for me", or wants AIRE to handle repetitive browser chores like showing-service scheduling, MLS portal entry, vendor ordering or comparison shopping.
---

# Browser Automation Skills with Chrome DevTools MCP

**Source:** Nick Saraev, "CLAUDE SKILLS FULL COURSE: Automate Your Work (2026)", chapter 5 (https://www.youtube.com/watch?v=sduaTkhIm_w&t=622s)

## What Nick teaches

Beyond business skills, Nick shows "how easy it was to build skills that handle really nuanced one-off things." Two examples, both built on **Chrome DevTools MCP**.

**WeWork booking.** WeWork requires booking ahead, and the card reader fails if you book same-day. Rather than book daily by hand, he spent "about 30 seconds" telling Claude: **"Hey, write me a skill that books me in for WeWork."** Now he says "Book me into WeWork" and the skill books him for the next 30 days at his usual location (Stephen Avenue Place) using credentials he'd already set up. It makes HTTP requests behind the scenes, and if needed it opens a browser tab so he can watch it make the desk bookings.

His recipe for any site: **"You just have to log into whatever service and then say, hey, I want you to automate this with Chrome DevTools MCP."**

**Amazon shopping.** Amazon has "a bajillion listings with crappy SEO." He built a skill called Amazon Shopping. He says "Hey, find me the best floss on Amazon," the skill loads, opens Amazon.ca, goes through the listings, compares them for "the best combination of cost and effectiveness," and returns a small sheet of recommended products with cost, popularity and a "why buy" column. He calls it "a personal shopper app." He did the same for grocery delivery on Instacart: "one-shot my grocery delivery."

Nick's point: these are not revenue skills, but they show you can build "one-off systems" in minutes with any current frontier model (he names Opus 4.6, GPT 5.2/5.3, Gemini 3.1), in Claude Code or another platform.

## Step by step

1. Confirm Chrome DevTools MCP (or the available browser tool in this session) is connected. If not, tell Caleb what to install or enable.
2. Have Caleb log into the target site himself in the controlled browser. Never ask for or store passwords in the skill.
3. Record the task in plain language: the URL, the sequence of clicks and fields, what "done" looks like, how often it repeats.
4. Do one supervised run with the browser visible. Note selectors, page flows and any confirmation dialogs.
5. Write the SKILL.md with: preconditions (logged in), the step sequence, a dry-run mode that stops before the final submit, and the output format (a short table of what it did or recommends).
6. If the site has a plain HTTP API behind the UI, prefer that for reliability, but keep the browser path as fallback and for visibility.
7. Test again from a fresh session with the slash command. Patch anything that broke.

## Templates / prompts

Build request:

```
I'm logged into <site> in the browser. Write me a skill called <name> that <does the task>
using Chrome DevTools MCP. Add a dry-run flag that stops before the final submit and shows me what it would do.
Output a small table of what happened at the end.
```

Comparison-shopper request:

```
Find me the best <product> on <site>. Compare at least 10 listings on price, rating count, rating,
and whether it actually matches what I asked for. Give me a table: product, cost, popularity, why buy, link.
Don't add anything to cart.
```

Recurring booking request:

```
Book me into <service> at <location> every weekday for the next 30 days. Skip days already booked.
Show me the list of dates you booked when done.
```

## Pitfalls Nick calls out

- Book ahead or sync lags bite you. Automate the boring daily step so it never gets skipped.
- Listing pages are full of SEO junk. Make the skill compare on real criteria, not search rank.
- Keep the browser visible when you want to trust it. Watching it click builds confidence fast.

## How Caleb should use this

- Showing-service and lockbox portals: schedule or confirm showings, pull feedback, in one command.
- MLS and brokerage back-office data entry for new listings (dry-run first, submit only on approval).
- Vendor ordering for listings: compare and pick yard signs, lockboxes, staging items or open house supplies, delivered to the door.
- AIRE daily chores: check county clerk or assessor sites for new filings in target neighborhoods and report back.
- Anything that submits a form, books, buys or changes a record on a third-party site needs Caleb's approval before running, and the dry-run mode should be the default.

## Verification

- A supervised run completes the task visibly in the browser.
- Dry-run mode prints the intended actions without submitting.
- From a fresh session, the slash command runs the task and ends with a summary table.
- No credentials appear anywhere in the skill folder.

## Example run (Caleb)

```
Caleb: I'm logged into the showing service. Write a skill called showing-feedback that pulls
       feedback for every showing on my listings in the last 7 days.
Claude: Builds .claude/skills/showing-feedback/SKILL.md with a dry-run default.
        Supervised run: opens the portal, lists 6 showings, pulls 4 feedback entries.
        Output table: date | address | agent | feedback summary | rating.
Caleb: Looks good. Make it default to 14 days and add "no feedback yet" rows.
Claude: Patches the skill. Next week Caleb runs /showing-feedback from a fresh session.
```

Expected SKILL.md body outline:

```markdown
# Showing Feedback
## Preconditions
- Logged into <showing service> in the controlled browser.
## Steps
1. Open My Listings, iterate each active listing.
2. For each showing in the last 14 days, open the feedback panel.
3. Capture agent, date, feedback text, rating. Record "no feedback yet" when empty.
4. Dry run: print the table only. Live run (--live): also append to data/showing_feedback.csv.
## Output
Table sorted by address then date.
```

Nick's reminder: the bigger lesson is not WeWork or floss. It's that once a site is open and logged in, a 30-second sentence turns any repetitive browser chore into a slash command. Start with the chore Caleb complains about most.
