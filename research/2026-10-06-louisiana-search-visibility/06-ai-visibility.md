# AI visibility research, test library, run log and rerun protocol

Files: `csv/ai-prompt-library.csv` (28 prompts), `csv/ai-run-log.csv` (18 completed runs, 5 inaccessible-platform rows).

## Surfaces: what was accessible on 2026-10-06

| Surface | Mode | Accessible here | Notes |
|---|---|---|---|
| ChatGPT Search | web | no | chatgpt.com blocked by network policy |
| Google AI Overviews / AI Mode | Search feature | no | google.com blocked |
| Gemini app | app | no | gemini.google.com blocked |
| Perplexity | web | no | blocked |
| Microsoft Copilot / Bing | web | no | blocked |
| Claude with web search | Claude Code WebSearch tool, model claude-fable-5-1 | yes | a proxy for Claude web search, not the claude.ai consumer app; results and summaries come from the tool's index |

Only one surface was testable. Nothing here is a live test of ChatGPT, Gemini, Perplexity, Copilot or Google's AI features. Google Search AI features are kept separate from the Gemini app in the library and log.

## Protocol used
- Prompt wording copied verbatim from the library.
- No Caleb mention inside nonbranded prompts. Branded controls are P13, P14 (and P28, not yet run).
- Geography: none set (the tool has no location control). Recorded as "none set (US index)".
- Fresh session: the tool is stateless per call; recorded as n/a.
- Per run: Caleb mentioned, owned URL cited, third-party Caleb source, competitors cited, summary, outcome. Outcomes: successful negative, positive, no AI feature triggered, inaccessible platform, failed.
- Repeats: 4 high-priority prompts repeated once (R15-R18). Results were consistent with the first pass. A third repeat was not run because the tool appears deterministic within a short window and more repeats would not add information on this surface.

## Rates from actual runs (denominators are real)

| Rate | Surface | Numerator / denominator | Value |
|---|---|---|---|
| Brand mention rate, nonbranded | WebSearch-backed Claude | 0 / 16 runs (12 prompts + 4 repeats) | 0% |
| Owned-site citation rate, all prompts | same | 0 / 18 | 0% |
| Recommendation inclusion, recommendation-intent prompts (P01, P02, P08, P09 and repeats) | same | 0 / 8 | 0% |
| Correct current brokerage in branded control | same | 0 / 2 | 0% (one returned Rêve via theadvocate.com; one returned an unrelated business) |
| Query coverage, first pass | same | 14 of 28 library prompts run | 50% |
| Competitor share of mentions (recommendation runs) | same | Cynthia Smith 2, Tara Smith 2, Daryl May 2, Tomeka Williams 2, Joy Russell 2, Burns & Co/LaFleur 1 of 11 named mentions | land agents and one BR agent dominate; nobody from Zachary or St. Francisville was named |

These are sampled visibility on one surface and show variability only within that surface. They are not market-wide impressions or a universal ranking.

## What the cited sources have in common (traced from run logs; pages not fetched)
- Portal agent cards with listing counts (theadvocate.com) drive "who serves X" answers.
- Year-dated topical guides (askdoss.com 2026 titles) and national calculators drive informational answers.
- Public documents (DNR False River annual report, census QuickFacts) are cited when a question needs a number.
- Nothing in the runs suggested special markup or an AI file caused a citation. Google's documentation (source-reported) states a page needs only to be indexed and snippet-eligible to appear in AI Overviews or AI Mode. No special AI file or schema is required.

What this means for Caleb's pages: indexable, direct answers near the top, local numbers with dates and sources, a named author with current brokerage, internal links between tool and explainer, and third-party corroboration of identity.

## Crawler access (not inspectable here; what to check on the Mac)
- robots.txt entries for Googlebot, Googlebot-Image, OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Bingbot, Google-Extended. Record each; change nothing.
- Distinguish search crawling (OAI-SearchBot for ChatGPT search; Googlebot for Google Search and its AI features) from training controls (GPTBot; Google-Extended). Google-Extended controls Gemini training and grounding and does not affect Search AI features (source-reported; verify on the official page).
- Robots permission is not proof of successful crawling. Check server logs or Search Console crawl stats if available.
- CDN/WAF: note any bot challenge pages in the LP stack.
- Snippet controls: check for `nosnippet` or `max-snippet` on tool pages, which would limit AI feature eligibility.

## Claims checked against current sources (source-reported; official pages not fetched)
| Claim | Finding | Label |
|---|---|---|
| llms.txt helps ranking or AI citation | Google says it does not use it for Search; John Mueller called it speculative; a 2026 Ahrefs sample found most such files receive no requests. Luxury Presence publishes one on its own site. Harmless, not a lever. | speculative tactic |
| FAQ schema earns rich results | FAQ rich results are restricted to limited site types since 2023; no effect expected. | not a lever |
| Review stars from own-site testimonials | Self-serving review markup is ineligible for LocalBusiness/Organization rich results. Keep testimonials visible without rating markup. | confirmed guideline |
| Photo geotags help local rank | No official support; treat as unsupported. | unsupported |
| Posting frequency or a minimum review count is a ranking requirement | Not in Google's stated factors; reviews contribute to prominence; posting is a customer-service tactic. | hypothesis at best |
| Search Console has a standalone AI visibility dashboard | Reports show AI Mode data counted in Performance totals since mid-2025 and some AI-feature reporting is rolling out; availability for this property is unknown until opened. | source-reported; verify in the property |

## Gap map
- Branded: the owned site is absent; a stale third-party page answers for Caleb; name collision with an unrelated "Action Jackson Group".
- Recommendation intent in Zachary and St. Francisville: no agent is named; portals and directories fill the gap, which means the first well-corroborated local identity could be picked up.
- Informational intents matching the four tools: answered by insurers, calculators and public data; Caleb's tool pages are not cited anywhere.

## Rerun protocol (on demand; no recurring job)
1. Open each platform in a fresh browser profile; set location to Baton Rouge, LA where the platform allows it.
2. Run P01-P28 verbatim. Run P01, P02, P08, P09, P05, P06, P03, P04 twice more in new conversations.
3. For Google: record whether an AI Overview triggered, whether AI Mode was used, and the organic and Maps results separately.
4. Log every run in `csv/ai-run-log.csv` with the same columns; keep negatives and failures.
5. Compute the four rates per surface and per intent; compare against this file's table.
6. Save screenshots to a private folder; never include client names.
