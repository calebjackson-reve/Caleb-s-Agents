# Measurement protocol: search and AI visibility

Run this the same way every time so results compare. Record everything in audits/YYYY-MM-DD/baseline/. Label each fact observed, source-reported, inferred or unknown.

## 1. Google local and organic (per market)

Collect once from each priority market, not from Prairieville or Zachary.

- Location: set the browser or SERP tool to St. Francisville, LA (then repeat for Baton Rouge, LA). In Chrome: DevTools > Sensors > Location override, or a SERP API with the Google location code. Logged out, English, desktop, then mobile.
- Queries, exact strings:
  - Branded: `Caleb Jackson realtor`, `Caleb Jackson Keller Williams First Choice`, `calebjackson.org`
  - Unbranded: `realtor St. Francisville LA`, `real estate agent St. Francisville`, `homes for sale St. Francisville LA`, `realtor Baton Rouge LA`, `real estate agent Baton Rouge`, `sell my house Baton Rouge`, `False River waterfront homes for sale`, `Copper Mill Zachary homes for sale`
- Record: date, location, device, query, local pack entries (name, rating, review count), position of any owned domain or profile, AI Overview present and whether it cites calebjackson.org.

## 2. Other engines
Bing, DuckDuckGo, Yahoo: run the three branded queries logged out, note the top five and any stale brokerage snippet.

## 3. AI answers
Fresh session each time (temporary chat, personalization off where offered). Engines: ChatGPT, Gemini, Google AI Mode, Perplexity, Copilot, Claude.

Prompts, exact:
1. "I'm selling a house in St. Francisville, Louisiana. Which real estate agents should I talk to?"
2. "Who is a good buyer's agent for St. Francisville, LA?"
3. "I'm selling a home in Baton Rouge. Which agents should I interview?"
4. "Best buyer's agent in Baton Rouge for a first home?"
5. "Compare Copper Mill and Beaver Creek golf community homes in Zachary, LA."
6. "What should I know before buying False River waterfront property?"
7. "How do I sell land in the Felicianas?"
8. Branded control: "Who is Caleb Jackson, the realtor in Louisiana, and what brokerage is he with?"

Record per run: engine, model/mode shown, country, timestamp, full answer, every cited URL, competitors named, errors or blocks. Report three numbers separately: brand identified correctly (prompt 8), unbranded mention rate (prompts 1 to 7), citation rate for calebjackson.org. Blocked or refused runs count in coverage, never in the denominator.

## 4. Crawl and access
`curl -A "<bot UA>" -o /dev/null -w "%{http_code}"` for OAI-SearchBot, GPTBot, PerplexityBot, ClaudeBot, Googlebot, bingbot against /, /about and the two priority market pages. Fetch robots.txt, sitemap.xml and children, llms.txt. Diff against the previous snapshot.

## 5. Owned data
- Google Search Console: export 28-day and 90-day queries and pages (Caleb grants access to aire@ if not already).
- Metricool GBP: reachSearch, reachMaps, websiteClicks, callClicks, reviewsCount, keyword report, for the period since the last run.
- Luxury Presence lead emails: count inquiries by source page and by city mentioned.

## 6. Reporting
One dated markdown file. Headline: what changed since last run for each of the three outcomes (branded accuracy, local visibility in the two markets, inquiries). No promised rank, no single number for "AI visibility".
