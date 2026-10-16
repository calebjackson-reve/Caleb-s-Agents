---
name: cca-automation-ladder
description: Picks the right level of internet automation using Nick Saraev's ladder (HTTP requests via web fetch, browser automation via Chrome DevTools MCP or Browser Use, computer use via the Claude desktop app) and his workflow of prototyping with the browser, capturing network requests, then graduating to cheap HTTP calls. Use when Caleb says "scrape this site", "book this on their calendar", "fill out this form for me", "pull listings from this portal", "automate posting", "rename files on my computer", "should I use the browser or the API for this", or any web task that needs reading, clicking or typing on his behalf.
---

# The Automation Ladder: HTTP, Browser, Computer

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 21 through 24 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=6523s, https://www.youtube.com/watch?v=UPtmKh1vMN8&t=6815s, https://www.youtube.com/watch?v=UPtmKh1vMN8&t=6929s, https://www.youtube.com/watch?v=UPtmKh1vMN8&t=7210s)

## What Nick teaches

Three levels, from most setup and cheapest to least setup and most expensive:

**Level 1: HTTP requests.** Every page load is an HTTP GET to a server that returns HTML (view page source to see it). Claude Code does this natively with its web fetch tool. "Retrieve the contents of this URL, just the text" strips the markup and returns what you would see. You can hand it a list of 400 URLs and it will scrape them. Limits: you cannot click a button over HTTP, and interacting (forms, bookings) requires finding an API and matching its schema exactly. His demo booking a cal.com slot by HTTP took 10 to 15 minutes of back and forth, found the API docs, checked availability, finally booked. It worked but was fragile and only works for that one cal.com setup. Also, high-volume HTTP is the most regulated path: rate limits, throttling, shadow bans.

**Level 2: Browser automation.** Claude loads a real browser and drives the page by running small JavaScript commands, clicking, scrolling, filling fields, taking screenshots as it goes. Two tools at recording time:

- **Chrome DevTools MCP.** His main pick. Same cal.com booking ("go here, book a 30-minute meeting for March 30 at 3 PM, Nick Test, nick@test.com, answer demo info for any booking questions") completed, including selecting a budget dropdown and reformatting a phone number. Slower per action (roughly one action every 5 seconds) but general: you give it a task and it goes. His other demo: searching rentals.ca for a Vancouver one-bedroom under $3,000 with amenities, changing filters, zooming the map. Impossible via HTTP without huge effort because those sites fight automation.
- **Browser Use.** The next level up. Simple instructions like "fill in my loan application." Its draw is being effectively undetectable: it fingerprints each AI-controlled browser instance to look like a real person. Pricing he saw: around $100 one-time plus pay-as-you-go credits. Use it when Chrome DevTools MCP gets blocked, especially social media (Facebook and Instagram scraping, liking, commenting, posting, DMs, X connection requests). He is not affiliated. Prices may have changed.

**Level 3: Computer use.** Controls your actual mouse and keyboard through the Claude desktop app (available in Cowork and Code tabs at recording time). It can do anything you can do, including non-browser apps. His demo: "scan my Downloads, find the image called Maker School 26, rename it to weekly community call picture." It requested Finder access, searched, tried name variations, and finished while he got coffee. Very slow, very token-heavy (screenshots of every step), but "give it a task, say keep going until you solve it, and it will," at a cost.

**Nick's standard play** as someone who builds these for real businesses:

1. Prototype with browser automation. Try Chrome DevTools MCP first. If it is stealth-sensitive or social media, use Browser Use.
2. While the browser flow runs, Chrome DevTools MCP sees the network requests being sent and received. Have Claude Code build a custom utility from those captured requests. Now you have the internal API.
3. Write docs for that API and embed them in the workspace.
4. Next time, use HTTP requests: way cheaper, runs in the background, no browser.
5. Exceptions: Facebook and similar are notoriously hard to HTTP-automate, so stay in the browser.

He is explicit that this kind of automation violates many platforms' terms of service. He does not condone it, he is describing what is available and what people do.

## Step by step

1. Classify the task: read-only public pages (Level 1), interact with a normal site (Level 2, Chrome DevTools MCP), interact with social or anti-bot sites (Level 2, Browser Use), anything outside the browser (Level 3).
2. For reading: ask for "just the text" and batch URLs in a list. Save output under `active/scrapes/`.
3. For interacting: write the task with every field value spelled out (date, time, names, email, answers for optional questions) so the agent does not stall.
4. Before browser runs, kill stale Chrome processes and use a clean profile. If the MCP fails twice, stop and ask (from Nick's insights report).
5. Once a browser flow works and will be repeated, ask Claude to capture the network requests and build an HTTP utility plus a docs file.
6. Switch repeated runs to the HTTP utility. Add rate limiting.
7. Reserve computer use for one-off local tasks or things no browser tool can reach.

## Templates / prompts

Read-only fetch:

```
Retrieve the contents of {URL}. Just the text, no markup. Save it to active/scrapes/{slug}.md.
```

Browser booking (his wording, generalized):

```
Go to {URL}. Book a 30-minute meeting for {DATE} at {TIME}. First name {FIRST}, last name {LAST}, email {EMAIL}, phone {PHONE}. For any optional questions answer with {DEFAULT_ANSWERS}. Take a screenshot after each major step and confirm the booking page at the end.
```

Graduate to HTTP:

```
That browser flow works. While running it once more with Chrome DevTools MCP, capture the network requests involved in {ACTION}. Build a small utility in active/tools/{name}/ that reproduces {ACTION} via HTTP requests, with the endpoints, headers and payload schema documented in active/tools/{name}/API.md. Add a delay between calls. Then add a one-line capability entry to CLAUDE.md.
```

CLAUDE.md rule (from his insights):

```markdown
- Browser automation: kill stale Chrome processes and use a clean profile before starting. If MCP tools fail twice, stop and ask instead of retrying.
```

## Pitfalls Nick calls out

- HTTP for interactive tasks is fragile, schema-specific and can burn 15 minutes and real money (he estimated about $40 of tokens on the cal.com attempt).
- Browser automation is general but slow: budget about 5 seconds per action.
- Computer use is slowest and most expensive. Use it last.
- Sites actively block HTTP and sometimes Chrome DevTools MCP. Browser Use exists for that gap.
- High-volume HTTP risks rate limits, throttling and shadow bans.
- Much of this breaks platform terms of service. Decide deliberately.

## How Caleb should use this

- Pulling public listing or tax-record pages for a CMA: Level 1 text fetch of specific URLs. Low risk, no approval needed for a handful of reads.
- Checking a showing portal or lockbox scheduler that has no API: Chrome DevTools MCP with every field spelled out. Any action that books, submits or confirms something on Caleb's behalf needs Caleb's approval before running.
- Repeated daily checks (new listings in a farm area, price changes): prototype in the browser, graduate to an HTTP utility, run it on a schedule. Keep volume modest to avoid getting throttled.
- Social posting or DMs for listing promotion: Browser Use territory. It costs money and posts publicly, so it needs Caleb's approval before running, and Caleb should weigh the platform's terms.
- Local file chores (renaming listing photos, sorting Downloads): computer use via the desktop app, one-off only.

## Verification

- Level 1: the saved file contains readable page text, no HTML tags.
- Level 2: screenshots show each step and a final confirmation page, and the booking or submission shows up on the target site.
- Graduation: the HTTP utility reproduces the action without a browser, API.md lists endpoints and payloads, and CLAUDE.md has the capability line.
- Level 3: the file or app state on the computer changed as asked.
