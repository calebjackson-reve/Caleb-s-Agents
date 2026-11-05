# AI visibility

How AI answers talk about Caleb in his markets, measured the way FirstAnswer does it, on an engine we own. One script, one prompt file, a report per run and a trend file.

## What FirstAnswer does, taken apart

From its MCP tool list and its public docs, read 2026-11-04. The product is a loop:

1. **Brand.** Name, aliases, domains, a description. Ours is in `prompts.json` under `brand`.
2. **Monitored prompts in groups.** Questions a buyer or seller would ask an AI, grouped by intent (seller, buyer, local knowledge, branded). Each is sent on a schedule to several AI models as a fresh session with no memory.
3. **Competitors.** Named brands counted in the same answers.
4. **Responses.** The full text of every answer, kept, so you can read what the AI actually said.
5. **Scores per prompt.** Mentioned or not, position of the first mention among the names listed, sentiment of the mention, which competitors appeared.
6. **Cited sources.** Every URL and domain the answers cite, tallied across prompts. This is the part that drives action: the domains shaping the answers are where a brand has to exist.
7. **Search queries.** What the AI searched for behind the answer, so you can see the words that pull a brand in.
8. **Recommendations.** Platforms the answers cite that the brand is not on yet, and pages to write.
9. **Dashboard.** Mention rate, citation rate, average position, competitor ranking, over time.

Engines FirstAnswer covers: ChatGPT, Google AI Overviews, AI Mode, Gemini, Perplexity, Copilot, Grok. Its MCP connector is on a plan tier Caleb's account does not have, which is why this exists.

## What this does

`check.py` runs the same loop on the Claude API with the server-side web search tool, located in Baton Rouge, one fresh session per prompt. For every prompt it keeps the answer, the URLs the search returned, the URLs the answer cited, then scores it (mentioned, cited, surfaced in search, position, competitors, sentiment by a second short call) and tallies the cited domains. Domains in `PLATFORMS` that Caleb can be on become the recommendations.

Outputs:

| File | What | Git |
|---|---|---|
| `reports/ai-visibility-<date>.md` | Headline numbers, cited domains, recommendations, every prompt with its answer | ignored (answers name other agents) |
| `history.json` | One row per run with the headline numbers | ignored |
| `summary.json` | The latest headline numbers and recommendations, for the dashboard | committed, numbers and domains only |

## Run it

On the Mac, with Pipeline's key in the environment:

```
export ANTHROPIC_API_KEY=...
/usr/bin/python3 aire/ai-visibility/check.py --dry-run     # the 12 prompts and the cost ceiling, sends nothing
/usr/bin/python3 aire/ai-visibility/check.py               # one full run
/usr/bin/python3 aire/ai-visibility/check.py --group branded
/usr/bin/python3 aire/ai-visibility/check.py --test        # offline checks of the scoring, no key needed
```

Model `claude-opus-5-5`, up to 5 searches per prompt, 12 prompts, cost ceiling about $1.44 a run (web search at $10 per 1,000 searches plus tokens). Needs the `anthropic` package (`pip install anthropic`).

Weekly is the right cadence. Options, Caleb's call: a launchd job on the Mac Mini on Monday mornings, or a cloud scheduled task that opens a draft PR with `summary.json` updated. Either way the report stays on the Mac.

## Coverage, said plainly

This measures Claude with web search. ChatGPT, Gemini, Perplexity, Copilot and Google AI Mode are not queried. Where they share the same web sources, the cited-domain tally points at the same work. Where they differ, the manual protocol in `skills/brand-consistency/measurement-protocol.md` still applies (type the prompts into each engine, log the results). Answers are non-deterministic: one run is a snapshot, the trend is in `history.json`.

## Files

| File | What |
|---|---|
| `prompts.json` | Brand, aliases, domains, markets, competitors, location, the prompt groups. Edit this to change what is measured. |
| `check.py` | The run, the scoring, the report. `--test` runs 7 offline checks. |
| `summary.json` | Written by the first run. |
