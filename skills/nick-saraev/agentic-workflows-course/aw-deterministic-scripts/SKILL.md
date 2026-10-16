---
name: aw-deterministic-scripts
description: Decides what the LLM should do versus what a deterministic script should do, and pushes math, sorting, API calls, data transforms and file operations into atomic execution scripts the agent builds and runs itself. Use when Caleb says "this is slow", "it got the numbers wrong", "why is it taking 30 seconds to sort a list", "should the AI do this or a script", or when an AIRE task involves calculations (net sheets, commission splits, comps averages), bulk data (lead lists, MLS exports) or repeated API calls.
---

# LLM for Judgment, Scripts for Everything Else

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 7, 8 and
14 (https://www.youtube.com/watch?v=MxyRjL7NG18&t=3171s, &t=4029s, &t=6341s)

## What Nick teaches

"Reserve your large language model calls for judgment. Let code handle the rest." Code is reliable,
fast and precise. Same input A always gives output B. LLMs are flexible, adaptive and handle
ambiguity, but they are bad at basic operations. Until recently they could not count letters in a
word. Asking an LLM to sort a list is "hiring a PhD intelligence to count some inventory."

**The demo (chapter 8):** he asked the agent to sort a list using only native intelligence, no
tools, and time itself. It manually emitted every token and took roughly 15 to 30 seconds (it
claimed 3 to 5, it has no internal clock). Then "run the script": 53 milliseconds, higher accuracy.
Several hundred times faster and "several hundred times freer" because a script runs on your CPU or
a cheap cloud CPU for essentially nothing. Sorting a 10,000-item list by LLM would be billions of
operations, by script one function call. Deterministic code is 10,000 to 100,000 times faster on
this kind of task.

**What goes in scripts:** API calls, data transformations, file operations, math, sorting, counting,
formatting, anything that must be identical every run. Instead of having the model do math, build a
calculator tool and have it call the tool.

**Script rules (chapter 14):**

- Stored in `execution/`. Python is Nick's default but the language does not matter, the model can
  convert Python to Node, Rust or Java later.
- Each script does one job. `scrape_apollo.py`, `enrich_clearbit.py`, `send_email.py`,
  `create_pandadoc.py`, `upload_to_gsheet.py`, `present_to_user.py`.
- Explicit parameters: `--location "Texas" --amount 200`. Being explicit removes misunderstanding.
- They do not hallucinate. They work or throw a clear error. That makes them unit-testable,
  version-controllable and independently optimizable (start serial, later parallelize).
- Reuse across directives. `send_email.py` is called by both the lead scrape directive and the
  proposal directive.
- AI inside a script is fine. `process_leads_with_claude.py` reads a sheet, sends each row to Claude
  with a fixed prompt at low temperature, writes results back. The LLM call is boxed inside a
  predictable pipeline instead of having full orchestrator freedom.

**The build pattern:** you do not write scripts. "Write me a simple function to sort this file
alphabetically, then execute it." The agent reads the file, sees the structure, writes the script,
runs it. What used to take a non-programmer a day takes moments.

## Step by step

1. For each step in a workflow, ask: does this require judgment or is it a repeatable operation?
2. Repeatable operations become scripts. Ask the agent to build one atomic script per operation with
   explicit parameters.
3. Judgment steps (which template fits, is this lead qualified, how to phrase this) stay with the
   orchestrator or go into a boxed LLM script with a fixed prompt.
4. Run each script standalone once to confirm it works and errors clearly.
5. Reference scripts by name in the directive.
6. When something is slow, ask whether a script could replace what the model is doing by hand.

## Templates / prompts

```
Build an execution script execution/calc_seller_net_sheet.py that takes
--price --commission_pct --payoff --closing_costs_pct and prints a JSON
net-to-seller breakdown. No LLM calls inside. Then run it with
--price 325000 --commission_pct 6 --payoff 210000 --closing_costs_pct 1.5.
```

```
Build execution/score_leads_with_claude.py that reads tmp/leads.csv, sends
each row to Claude with the fixed prompt in resources/lead_scoring_prompt.md
at temperature 0, and writes a score column. Batch requests.
```

Script header convention:

```python
"""
enrich_leads.py
Purpose: add email and phone to leads missing them using <service>.
Inputs: --input tmp/leads.csv --output tmp/leads_enriched.csv
Reads API key from .env (ENRICH_API_KEY). Fails loudly on HTTP errors.
"""
```

## Pitfalls Nick calls out

- Letting the model do arithmetic or sorting in its head. Slow, expensive, error-prone.
- Scripts that bundle several jobs. They cannot be reused or tested in isolation.
- Vague script inputs. Use named parameters so the agent always knows what to pass.
- Hard-coding keys in scripts. Read from `.env`.
- Believing the model's self-reported timing. It does not have a clock, measure it yourself.

## How Caleb should use this

- Commission splits, seller net sheets, buyer closing-cost estimates and comp averages are scripts,
  never LLM arithmetic. One wrong number in front of a client costs far more than the script took to
  build.
- Bulk lead handling (dedupe, format phone numbers, merge with CRM export) is a script.
- Lead scoring or tone-matching a message is judgment, box it in a script with a fixed prompt so it
  is consistent.
- Any script that calls a paid API (enrichment, skip tracing) needs a `--limit` flag and Caleb's
  approval before running at volume.
- Keep `send_email.py` and `send_sms.py` as shared scripts, but require an explicit `--confirm` flag
  so nothing goes out by accident.

## Verification

- Running the same script twice on the same input produces identical output.
- A numbers check: script output matches a hand calculation on one example.
- The agent transcript shows tool calls to scripts, not long reasoning doing the math.
- Scripts fail with a readable error message when given bad input or a bad key.
