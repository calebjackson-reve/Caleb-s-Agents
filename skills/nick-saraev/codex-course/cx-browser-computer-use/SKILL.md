---
name: cx-browser-computer-use
description: Uses browser control and computer (desktop) control from the agent to read or act on pages and apps that have no API, pulling data from an open Google Sheet or portal, driving a desktop app, taking screenshots, while respecting terms of service. Use when Caleb says "grab this from the page that's open", "there's no API for this", "scrape these listings", "click through this portal for me", "control the app", or needs data from MLS, Zillow, a county assessor site or a desktop tool.
---

# Browser use and computer use

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 11 (https://www.youtube.com/watch?v=DJZISqryDfw&t=14207s)

## What Nick teaches

**Browser use.** The desktop app installs a browser extension, and the page shows "has access to this site." Demo: a Google Sheet with names and scores. Prompt: "Use browser use to control my browser. Find the highest scoring name in the Google Sheet that's currently open." The agent loaded its in-app browser control skill, connected to the open tab (the browser showed "started debugging this browser"), a cursor appeared briefly, read the data, and answered "Nick has the highest score, 99."

Why it matters: "a tremendous amount of information on the internet cannot be scraped via API because the service has no API." Give the agent your browser and it drives the page. Nick used to hand-build scrapers and pick page elements by hand. Now: "scrape every ecommerce product on this page," "find the best running gear on Amazon and assemble it for me." Caution: automating social platforms is against most terms of service. Some people use it to find posts to repurpose or to comment. Nick does not endorse that and warns against adding slop.

**Computer use.** Same idea for the whole desktop. Enable the computer use plugin (he disabled the separate computer-use MCP because it interfered), and turn off other plugins so it does not pick the browser by mistake. Prompt: "Open Spotify and play my favorite artist, R.E.M. Also screenshot the most recent album cover. Use computer use, not browser." It read the computer use skill, asked for UI control permission, drove the app with a small on-screen cursor, played the song and saved the screenshot in about 2 minutes. You can minimize the app and keep working. It works like a companion: "find the XYZ files, upload them to XYZ software, connect to XYZ."

**Claude Code mapping.** Claude in Chrome (extension) for browser use, the built-in browser pane in the desktop app for reading pages, and desktop computer use through the Claude desktop app. Load the matching skill before the first step (`anthropic-skills:chrome-browser`, `anthropic-skills:built-in-browser`, `anthropic-skills:computer-use`).

## Step by step

1. Check for an API or connector first. Browser control is the fallback, not the default.
2. Check terms of service for the site. If automation is prohibited, do it by hand or stop.
3. Open the page or app in the browser or on the desktop so the agent can reach it. Sign in yourself.
4. Say explicitly which mode to use: "use browser use" or "use computer use, not browser."
5. Give a narrow, verifiable task: find one value, extract one table, click one flow.
6. Review the extracted data against the page before using it.
7. If a task repeats, record it as a skill so the steps are consistent.

## Templates / prompts

Browser read:

```
Use browser use to control my browser. In the tab that is currently open, [find the highest value / extract the table of rows into CSV / read the listing details]. Do not submit any forms. Report what you found and where on the page it was.
```

Browser multi-page extraction:

```
Use browser use. Starting from the open page, go through every result page and collect [address, price, days on market, status] into data/<date>-<source>.csv. Stop after [N] pages. Do not click anything that posts, messages or purchases.
```

Computer use:

```
Use computer use, not browser. Open [app], [do the action], take a screenshot of [the result] and save it to screenshots/. Tell me each step as you go.
```

## Pitfalls Nick calls out

- The agent choosing browser when you meant desktop. Say which one.
- Other plugins interfering. Disable what you do not need for the task.
- Terms of service on social platforms.
- Adding slop to the internet at scale.
- Speed. It is not instant, about 2 minutes for a small desktop task.

## How Caleb should use this

- Pull data from portals and assessor sites that have no API: parcel details, tax history, flood zone lookups, permit records. Check each site's terms first.
- Read a comps page or an MLS hot sheet that is already open and summarize it.
- Drive a desktop tool (a CMA or flyer app) through a repetitive export.
- Never auto-post, auto-comment or auto-message on Facebook, Instagram, Zillow or Realtor.com through browser control. Any action that submits a form, sends a message or buys something needs Caleb's approval.
- Scraping competitor or portal data for AIRE features needs a terms check and Caleb's approval.

## Verification

- The agent names which mode it used and the page or app it touched.
- Extracted values match the page on a spot check of 3 rows.
- No form was submitted, no message sent, no purchase made.
- Screenshots exist where requested.
