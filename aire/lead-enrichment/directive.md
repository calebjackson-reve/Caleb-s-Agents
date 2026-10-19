# Directive: lead enrichment (bulk tier)

## Objective
Turn a raw lead export (KW Command CSV, website form log, open house sign-in sheet) into a tagged, summarized list Caleb can act on, using the cheapest model that does the job well. This is the first AIRE workflow that runs on the bulk tier in `aire/STACK.md`.

## Inputs
- A CSV with at least: name, email or phone, source, and any free text (message, notes, property of interest). Extra columns are passed through untouched.
- `aire/STACK.md` row "Bulk and cheap" names the model. Today that is Claude Haiku 5.5.
- `ANTHROPIC_API_KEY` in the environment. Never printed, never pasted.

## Process
1. Run `python3 enrich.py leads.csv` from this folder. DRY_RUN is on by default and prints the first three rows' results without writing.
2. For each row the script asks the model for exactly four fields as JSON. The Anthropic API enforces the schema. Through a gateway like OmniRoute the schema can be dropped, so the prompt also spells out the allowed values and the script rejects anything outside them (the row is marked error, never trusted). Thinking is off for this call so Haiku 5.5 spends its tokens on the answer: `intent` (buyer, seller, both, renter, agent, vendor, unknown), `timeline` (now, 1-3 months, 3-12 months, someday, unknown), `area` (one of Caleb's markets or "other"), `next_touch` (one plain sentence Caleb would say, under 25 words).
3. The model never invents facts. If the free text is empty, intent and timeline are "unknown" and next_touch asks one question.
4. Output is `leads.enriched.csv`: every input column plus the four new ones plus `model` and `enriched_at`.
5. Rows that error are written with `intent=error` and the message in `next_touch`, and the run continues.

## Definition of done
Every input row appears once in the output with all four fields filled, no row's next_touch contains a price, timing promise or fair housing problem, and the run cost is printed at the end from the API's own token counts.

## Model routing
Haiku 5.5 does every row. Nothing in this directive goes to Opus. If Caleb wants a second pass that ranks the top 20 leads, that is a separate directive on the judgment tier.

## Safety
- DRY_RUN=1 is the default. Set DRY_RUN=0 to write the file.
- The script sends nothing anywhere except the Claude API. It does not touch KW Command, Gmail or any CRM.
- Output goes through `ai-compliance-check` before any next_touch is sent.
