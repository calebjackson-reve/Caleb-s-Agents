# Agent: ai-visibility-baseline

**Purpose.** Measure whether AI answers mention Caleb or cite calebjackson.org for the questions buyers and sellers actually ask, and track which competitors and sources win instead.

**Cadence.** Monthly. First run as soon as possible to set the baseline. Read only. Sends nothing.

**Tools.** ChatGPT Search, Gemini, Perplexity, Copilot and Google AI Mode from the Mac with location set to Baton Rouge (the cloud container cannot reach them). The prompt library `research/2026-10-06-louisiana-search-visibility/csv/ai-prompt-library.csv`, the run log `csv/ai-run-log.csv` and the rerun protocol in `06-ai-visibility.md`, all from pull request 4. The 20 questions in `../strategy/2026-10-07-most-viewed-realtor-plan.md` are merged into the library where they add intent.

**Steps.**
1. Run P01 to P28 verbatim in fresh conversations on each platform with web search on. Then run the merged questions from the plan. Baseline from October 6 on the one reachable surface: 0 of 16 non-branded runs mentioned Caleb, 0 of 18 cited calebjackson.org, and the branded control returned the stale Rêve affiliation.
2. Record: date, platform and model, exact question, answer summary, every cited URL, every agent or brokerage named, Caleb mentioned (yes or no), calebjackson.org cited (yes or no), refusal or error (yes or no).
3. Repeat each question twice per platform. Treat differences between runs as normal variance, not rank change.
4. Summarize: mention rate, citation rate, top five competitors, top ten cited domains, and which of Caleb's pages appeared.
5. Compare to the previous month. List the three content changes most likely to move the next run, mapped to existing pages (/buy, /sell, /relocate, /market-report, /tools, local guides).

**Output.** A one-page summary and the results table. No spend, no publishing.

**KPI.** Mention rate and citation rate across the 20 questions, month over month. This measures a fixed test set, not all AI searches.
