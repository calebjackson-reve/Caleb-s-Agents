---
name: cs-three-skill-archetypes
description: Chooses and builds the right shape of skill using Nick Saraev's three archetypes (pure SOP, SOP plus script, templates plus parallel subagents) demonstrated with meeting-notes-to-action-items, invoice PDF to JSON, and transcript content repurposer, and builds several skills at once in parallel windows. Use when Caleb says "should this be a script or just instructions", "build me three skills at once", "turn this call transcript into tasks", "extract data from these PDFs", "repurpose this video into posts", or wants AIRE to batch-build skills.
---

# Three Skill Archetypes, Built in Parallel

**Source:** Nick Saraev, "CLAUDE SKILLS FULL COURSE: Automate Your Work (2026)", chapters 9-10 (https://www.youtube.com/watch?v=sduaTkhIm_w&t=1860s)

## What Nick teaches

To show the range of what a skill can be, Nick builds three at once. He opens three Claude Code windows, switches each to bypass permissions, pastes one skill brief into each, and types "create skill one," "create skill two," "create skill three." Two were done before he finished reading the briefs aloud.

**Archetype 1: pure SOP (no code).** *Meeting notes to action items.* Paste a transcript, get structured action items with owners and deadlines. Nick: "a skill can be really nothing more than an SOP which doesn't even include Python scripts." The generated skill also output decisions and open questions. He then extended it with one line: "update the skill also to extract any contact information that's mentioned: email addresses, websites, phone numbers, anything that somebody offhand mentions during the call."

**Archetype 2: SOP plus script (deterministic work delegated to code).** *Invoice data extractor.* Take a PDF invoice, return structured JSON: vendor, amount, date, line items, tax. Nick: "to help you see how skills can delegate deterministic work to code." He downloaded a sample invoice, said "Great, use this on example_invoice," and the script hit an issue with a summary row and the subtotal. The agent "fixed the script's filtering logic so that it doesn't catch the subtotal or the credit terms," then "updated the main skill as well." Self-healing in action.

**Archetype 3: templates plus parallel subagents.** *Content repurposer.* Take a transcript and output a tweet thread, a LinkedIn post and a newsletter draft "all in parallel," using templates. He pasted a 10-minute YouTube transcript. The agent's design decision was to spawn three **Sonnet sub-agents**, one per format. Output was "reasonable, not going to win any awards, it's pretty LLM-y," but the tone can be changed "with literally just a line." He points out that the viral thread formats you see everywhere come from "very simple repurposing pipelines like this."

## Step by step

1. Classify the task:
   - Judgment, summarizing, writing from a transcript: **pure SOP**.
   - Parsing files, math, API calls, anything that must be identical every run: **SOP plus script**.
   - Several independent outputs from one input: **templates plus parallel subagents**.
2. Write a 3 to 5 line brief per skill: name, input, output shape, rules.
3. For more than one skill, open parallel sessions (or spawn subagents), one brief each, and let them build simultaneously.
4. For script archetypes, hand the agent a real sample file and have it run the script immediately. Expect one fix.
5. For template archetypes, put each output template in the skill folder (`templates/tweet.md`, `templates/linkedin.md`, `templates/newsletter.md`) and specify the model tier for subagents.
6. Extend with one-line requests after the first run ("also extract contact info").
7. Re-run from a fresh session via slash command to confirm.

## Templates / prompts

Brief 1 (pure SOP):

```
Create a skill called meeting-notes.
Input: a pasted meeting or call transcript.
Output: action items (owner, deadline), decisions, open questions,
and any contact info mentioned (emails, phones, websites, addresses).
```

Brief 2 (SOP + script):

```
Create a skill called invoice-extractor.
Input: a PDF invoice path. Output: JSON with vendor, amount, date, line_items[], tax.
Use a Python script for parsing. Test it on examples/example_invoice.pdf and fix anything that breaks.
```

Brief 3 (templates + parallel subagents):

```
Create a skill called content-repurposer.
Input: a transcript. Output in parallel: a tweet thread, a LinkedIn post, a newsletter draft,
each from a template in templates/. Use Sonnet subagents, one per format.
Voice: warm, direct, plain English. No hype.
```

Expected JSON shape for archetype 2:

```json
{"vendor": "ACME Title Co", "amount": 1250.00, "date": "2026-10-01",
 "line_items": [{"desc": "Title search", "qty": 1, "unit": 350.00, "total": 350.00}],
 "tax": 0.00}
```

## Pitfalls Nick calls out

- Don't over-engineer. If it's just judgment, a plain SOP skill is enough.
- Deterministic work belongs in code. Letting the LLM "eyeball" invoice math is how errors creep in.
- Expect the script's first run to hit an edge case (subtotal rows). Let the agent fix both script and skill.
- Default repurposed content sounds "LLM-y." Give it a voice guide and templates in your tone.

## How Caleb should use this

- `meeting-notes`: run on every buyer consult, listing appointment and lender call recorded via Wispr Flow. Capture action items, deadlines and any contact info the client mentions (lender name, inspector, HOA contact).
- `invoice-extractor` style: parse closing statements, repair estimates, HUD/ALTA settlement statements, or vendor invoices into JSON for AIRE's transaction records.
- `content-repurposer`: turn one market-update video transcript into a Facebook post, an Instagram caption, a neighborhood newsletter blurb and a Google Business update, in Caleb's voice. Posting is external and needs Caleb's approval before running.
- Batch-build in parallel when standing up AIRE: three windows, three briefs, one afternoon.

## Verification

- Archetype 1: paste a transcript, get action items with owners and deadlines plus a contact-info section.
- Archetype 2: running the script on a sample file returns valid JSON with correct totals (compare one line item by hand).
- Archetype 3: three outputs produced from one input, each matching its template, generated in parallel.
- All three callable by slash command from a fresh session.

## Example: AIRE batch build

```
Window 1: "Create skill one" + brief for meeting-notes (pure SOP)
Window 2: "Create skill two" + brief for closing-statement-extractor (SOP + Python)
Window 3: "Create skill three" + brief for market-update-repurposer (templates + Sonnet subagents)
```

Decision table to keep in the skill:

```markdown
| Task smells like...                      | Archetype          | Why |
|------------------------------------------|--------------------|-----|
| Summarize, judge, draft from text        | Pure SOP           | LLM is the right tool, no code to maintain |
| Parse files, compute totals, call APIs   | SOP + script       | Must be identical every run, errors are costly |
| One input, several independent outputs   | Templates + subagents | Parallel is faster and each output gets a clean context |
```

Nick's one-line extension pattern, which works on all three: after the first run say what's missing in one sentence ("also extract contact info", "skip subtotal rows", "make it sound less LLM-y, use my voice guide in voice.md") and let the agent update the skill itself.
