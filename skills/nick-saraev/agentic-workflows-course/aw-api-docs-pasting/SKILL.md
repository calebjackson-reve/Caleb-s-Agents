---
name: aw-api-docs-pasting
description: Gets the agent to connect to any API quickly by pasting the exact endpoint documentation into context (or using the vendor's "copy for LLM" markdown) instead of letting the agent search and guess through JavaScript-rendered doc pages that burn context and compound errors. Use when Caleb says "connect to this API", "it can't read the docs", "it keeps guessing the endpoint", "here's the vendor's documentation", or when AIRE needs to integrate a tool without a one-click integration (MLS data vendor, skip tracing, e-sign, showing scheduler, CRM).
---

# Using API Documentation Effectively

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapter 28
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=14623s)

## What Nick teaches

When you say "build X with service Y," the model spends about half its time looking up API
documentation and half running into errors. Not all docs are equal. Many pages render through
JavaScript, so when the agent fetches the URL it gets a lightweight shell: "no detailed endpoint
schemas, rate limits or code examples, you need to log in to see the OpenAPI spec." The agent then
guesses at JSON, searches blog posts and other people's write-ups, and each step adds context and
compounds error. After a short loop his `/context` showed messages already climbing, and it would
keep climbing.

**The fix:** open the specific endpoints you need in the browser, copy all of it, and paste it in:
"These are Vain's API docs. List endpoints for me." Now it gets everything right on the first try,
no guessing, no extra steps. Then: "If I wanted to make a simple API call to the POST endpoint, what
would that look like in Python?" and "Great, let's do it."

**LLM-friendly docs:** some vendors (he shows Apify as a leader) now have "copy for LLM" buttons,
"view as markdown," and "open in ChatGPT / Claude / Perplexity." That markdown is token-efficient
and natively structured for the model. Paste the markdown URL or content and say "tell me about this
API," then ask follow-ups like "what kinds of endpoints are most common?" Vendors are doing this
because they expect agents to consume their docs.

**Why it matters commercially:** "You would not believe how much money on the internet is available
if you know how to connect APIs." Now you only need to communicate that you want to connect one.
Businesses constantly ask "platform X has no Zapier integration, how do we connect their API?" That
is solvable in minutes and sellable.

## Step by step

1. Find the vendor's API documentation. Look for a "copy for LLM" or markdown option first.
2. If none, open the exact endpoints you need (auth, list, get, create) and select-all copy each page.
3. Paste into the agent with one line of framing: "These are [vendor]'s API docs for [endpoints].
   List the endpoints and auth method."
4. Ask for a minimal test call in Python against the least risky endpoint (a read).
5. Put the key in `.env` and run the test.
6. Once the test works, ask for the execution script and directive.
7. Save the pasted docs to `resources/api_docs/<vendor>.md` so future sessions do not refetch.

## Templates / prompts

```
These are [vendor]'s API docs for authentication, search and get-record.
List the endpoints, required headers, rate limits and an example request
body for each. Do not search the web, everything you need is below.
<paste>
```

```
Write a minimal Python call to the search endpoint using the key from .env
as [VENDOR]_API_KEY. Run it with a tiny query and show me the raw JSON.
```

```
Save these docs to resources/api_docs/[vendor].md and reference that file
in any directive that uses this API.
```

## Pitfalls Nick calls out

- Letting the agent web-search for docs that render via JavaScript. It gets shells and guesses.
- Watching context balloon during the search loop.
- Multiple fetch-and-guess steps compounding error before the first real call.
- Assuming every vendor's docs are complete. Some only expose the full spec after login.

## How Caleb should use this

- Paste docs for the MLS data vendor, e-sign tool, showing scheduler, skip-tracing and CRM when
  wiring AIRE. Keep them in `resources/api_docs/`.
- Start every integration with a read-only test call before anything that creates or sends.
- Paid APIs: the test call itself may cost money. Use the smallest query and get Caleb's approval
  before any volume run.
- Services without a Zapier connector (local title companies, lender portals) are reachable this
  way. Treat it as an edge Caleb can offer teammates.
- Never paste credentials along with docs. Keys go to `.env` only.

## Verification

- The agent lists the correct endpoints and auth without web searching.
- A minimal read call returns real JSON on the first or second try.
- `/context` stays low during integration compared to a search-based attempt.
- `resources/api_docs/<vendor>.md` exists and the directive references it.
