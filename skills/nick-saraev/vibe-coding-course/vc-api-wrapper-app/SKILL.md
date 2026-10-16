---
name: vc-api-wrapper-app
description: Builds a SaaS feature that wraps a third-party API (Apify scrapers, AnyMailFinder enrichment, Anthropic or OpenAI for personalization, Google's Nano Banana image API) following Nick Saraev's pattern: feed the agent the docs via "copy for LLM", put keys in .env, test with curl first, then wire it into the app, add provider priority and batching, and keep the arbitrage between what users pay and what the API costs. Use when Caleb says "wrap this API", "pull leads from Apify", "enrich these contacts with emails", "generate personalized icebreakers for each lead", "call Claude from the app", "it only did one instead of three", or wants AIRE to scrape FSBO or expired listings, enrich seller contacts, or auto-write outreach.
---

# Wrapping third-party APIs into a vibe-coded app

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 34, 37, 41 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=10933s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=13669s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=14816s)

## What Nick teaches

"Most apps nowadays are just wrappers. They wrap functionality around some other app." The software is not the moat, so the fastest path to a useful SaaS is to wrap an API that already does the heavy lifting and put a clean UX and payments around it. Apify alone has thousands of scrapers (TripAdvisor reviews, Instagram, website content crawler, tweets, land.com, and the lead finder he used).

### The lead-gen pipeline (Leadzo)
1. **User types a plain-English job** ("owners of HVAC businesses in Texas, 1 to 20 employees, 100 leads").
2. **AI converts it into the scraper's input JSON** (job titles, locations to include/exclude, company size, industries, keywords, validated emails only). Nick first demoed the Apify actor manually with dental clinics in Canada to show the filter fields, then had the model build the natural-language-to-filter step.
3. **Apify actor runs** (run synchronously and return dataset items endpoint) using the user's Apify token.
4. **AnyMailFinder** enriches missing emails.
5. **Anthropic (Claude Sonnet 4.6) or OpenAI** writes a one or two sentence icebreaker per lead using a user-editable prompt with injected variables (first name, last name, headline, industry, organization name, location, email).
6. **CSV download** of leads plus a personalization column, saved to order history.
He dropped the planned Instantly campaign push (the API had issues last time) and the Google Maps fallback (out of scope for a demo) but notes the fallback is one line of logic: "if this returns zero leads, use this other approach."

### How he fed the agent what it needed
- **Docs**: on the Apify docs page he used **"Copy for LLM"** to grab the entire page, plus the specific actor's **input schema**. "See how long that is? That's super long." It is fine.
- **Keys**: created `.env` and pasted Anthropic, Apify (personal token with an expiration date "in case I forget to delete it"), AnyMailFinder keys. "Every service has a way to grab your API key."
- **Prompt**: pasted his Maker School personalization prompt as the default and said "be smart about this, don't paste the prompt in verbatim to the user-editable section, it's pretty long."
- **Model choice in the prompt**: "For the personalizations use Claude Sonnet 4.6 or GPT 5.3. Check out both of their docs."
- **Provider priority**: "If both the Anthropic and OpenAI keys are filled out, automatically choose Anthropic. If Anthropic is empty and OpenAI is present, choose OpenAI."
- **Config page order**: Apify token at top, then Anthropic and OpenAI, remove Instantly, AnyMailFinder below.

### Test outside the app first
On the thumbnail app he pasted the REST snippet from Google AI Studio's "get code" and said: "**First, test all of this via curl to make sure it works. Then once it works, you can put it on the app.**" He also supplied the three inputs (inspiration thumbnail, face images, prompt) as files so the agent could run the real call. Claude Code did the same on the scraper, generating a curl command to validate the Apify endpoint before touching the UI, and later used Chrome DevTools to screenshot and test the running app itself.

### Debug and tune
- When the scrape "completed" with zero results, he pasted the response and his input back ("I ran this on localhost:8888/scrape, returned this"). When it kept looping, he wrote a bullet list of exactly what the backend must do (interpret request, convert to JSON input, send to the actor URL, return CSV) and simplified the steps.
- Personalization of 100 leads was slow because it ran serially: "**batch the requests, do whatever you have to do to make it faster.**" Parallel calls within rate limits.
- Output tone was overwrought ("Revolutionizing luxury baths in '77 is no small thing..."). He edited the user-facing prompt to be "significantly more casual and cleaner" until he got "Hey Kate, love what you're building at Posh, also in engineering services. Wanted to run something by you."
- Image API: one variant came back instead of three, with a white sheen overlay. "Double check there was no issue in the background that prevented all three simultaneously... remove that overlay." Credits were consumed correctly (3 per run) but one save wrote twice.
- One major change per image prompt. "You only really want to suggest one major change at a time."

### The business model
Let users bring their own keys (Leadzo) and you have no API cost. Use your own key (Thumbly) and you charge credits above cost: "they pay $10 and every usage costs us $1, so we make $9." Some providers require extra steps to resell their tokens, check terms.

## Step by step

1. Pick the API. Open its docs, use "Copy for LLM" or copy the endpoint page and the input schema.
2. Get a key (set an expiration where possible). Put it in `.env`. Never paste keys into chat if you can avoid it.
3. Prompt the agent with: what the feature does, the docs, the schema, the `.env` key names, the model to use, provider priority rules, and "test via curl first."
4. Run the curl test. Fix until it returns real data.
5. Wire into the app. Run the real flow with a small count (5 to 20 items).
6. Batch or parallelize anything that loops over records.
7. Tune the AI prompt for tone with 2 or 3 real outputs.
8. Add the fallback branch if needed ("if zero results, try X").
9. Decide credits vs bring-your-own-key, then go to `vc-stripe-payments`.

## Templates / prompts

Integration prompt:
```
The [service] API I'm using doesn't require [thing the UI assumed]. Below
is the API doc (copied for LLM) and the input schema. Modify the [form] so
the user enters a plain-English job, then have AI convert it into the
filter JSON the actor accepts. I've put the keys in .env as
APIFY_TOKEN, ANTHROPIC_API_KEY, ANYMAILFINDER_KEY. If both Anthropic and
OpenAI keys exist, prefer Anthropic. Use Claude Sonnet 4.6 for the
personalization step, check its docs. First test everything via curl, then
wire it into the app. Store results locally in JSON for now.

[pasted docs]
[pasted input schema]
[pasted personalization prompt]
```

Backend contract when the agent loops:
```
Let's adjust the logic to the following, nothing more:
1. Interpret my request into a filter JSON using the schema.
2. POST to https://api.apify.com/v2/acts/<actor>/run-sync-get-dataset-items?token=...
3. Enrich missing emails with AnyMailFinder.
4. Return rows + CSV to the user and save to history.
Drop every other step for now.
```

Speed and quality follow-ups:
```
Batch the personalization requests in parallel within rate limits. Do
whatever you have to do to make it faster.
The icebreakers are too much. Make them significantly more casual and
cleaner, one or two short sentences, no flattery words.
```

## Pitfalls Nick calls out

- Zero-result "success" responses: paste the raw response and your input back.
- Serial loops over 100 records are slow. Batch.
- Hallucinated SDK package names (see `vc-security-audit`). Use the official SDK.
- Paid routes must be behind auth or strangers run your keys.
- Big image uploads eat tokens and usage. Downsize.
- Provider rate limits reset on their own schedule, have a second model ready.

## How Caleb should use this

- AIRE seller prospecting: wrap an Apify scraper for FSBO or expired listings, enrich owner contact info, have Claude write a two-sentence local icebreaker ("saw your place on Royal Street..."). Sending anything to a prospect: needs Caleb's approval before running, and must respect Louisiana and federal contact rules.
- Investor outreach: scrape LLC-owned properties or out-of-state owners, personalize by neighborhood.
- Listing marketing: wrap Nano Banana to generate listing graphics from a template and Caleb's branding. Image generation costs money: needs Caleb's approval before running at scale.
- Keep Caleb's keys server-side in `.env`, with default-deny auth, since AIRE uses his own accounts.

## Verification

- A curl call with the real key returns real rows or an image before any UI work.
- The app run with 5 to 20 items completes and the CSV or gallery shows the expected columns or variants.
- Personalization output reads like a human text, one or two short sentences.
- Credits decrement by the expected amount per run and saves happen once.
