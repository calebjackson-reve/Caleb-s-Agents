---
name: aw-claude-skills-format
description: Builds a Claude Skill (a skills/<name>/SKILL.md folder with YAML front matter, scripts and resources) as the Claude-specific alternative to DOE directives, including template-driven document generation like PDF reports from a dropped-in design. Use when Caleb says "make this a Claude skill", "package this so it loads automatically", "generate a report from this template", "turn my listing flyer into a reusable skill", or when an AIRE workflow should be a self-contained reusable package rather than a directive.
---

# Claude Skills Format

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 17 and 18
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=8882s and &t=9124s)

## What Nick teaches

Claude Skills are Anthropic's attempt to standardize agentic workflows into reusable, portable
packages. They are very similar to DOE but specific to the Claude family (the same structure will
not load in Gemini or GPT, though every model family now has its own version). Like DOE it is a
folder structure.

**Structure:** a top-level `skills/` directory, one folder per skill (`bigquery/`, `docx/`, `pdf/`,
`scrape_leads/`), each containing a `SKILL.md` plus whatever else you want: `scripts/`, `rules.md`,
`data_sources.md`, templates. The difference from DOE: instead of separate `directives/` and
`execution/` folders, each skill keeps its instructions and its scripts together in one folder. "The
SKILL.md is just your directive."

**YAML front matter** is the one real difference in the markdown. Between two lines of `---` at the
top you put `name`, a short `description` (100 to 200 characters of what the skill does and asks
for), and optionally `allowed-tools` to restrict what the skill may use. At runtime Claude reads
only the front matter of every skill to decide which one fits the task, then loads the full file.
That saves a lot of tokens. Nick says YAML front matter would be an improvement for his DOE
directives too.

**Pre-built skills:** Anthropic ships a library for common document tasks (PDF, Word, Excel,
PowerPoint) that have been "hyper-optimized over tens of thousands of runs." Think of them as
directives plus execution scripts that are already deeply self-annealed. Quality is surprisingly
good and they run fast.

**The demo (chapter 18):** "Create a new Claude skill called generate-report that builds a weekly
weather report for Canada from a public weather API." He downloaded a free Canva annual-report
template as a PDF, dragged it into the workspace, and said to use it as the design. Claude created
`skills/generate-report/SKILL.md` and a `scripts/` folder, wrote the front matter with name,
description and allowed tools, fetched data, hit a paywall on OpenWeatherMap, was told "it's not
free, find a free source," switched to Open-Meteo, tested, and produced a clean multi-section PDF
(national overview, west coast, prairies, central Canada). Total: a data source, a template, and
about 5 minutes of self-annealing.

## Step by step

1. Decide skill vs directive. Use a skill when the package should be self-contained and portable to
   other Claude users, or when it is a document-generation task.
2. Gather the data source (API, file, CRM export) and the template (PDF, DOCX, example output).
3. Drop the template into the workspace and ask Claude to create the skill, naming it and describing
   what it does.
4. Check the front matter: name matches the folder, description says what it does and what inputs it needs.
5. Run it on real input. If a data source is paid or blocked, say so and let it find an alternative.
6. Open the output and check against the template.
7. Keep improving the description so the skill triggers on the right requests.

## Templates / prompts

Skill folder:

```
skills/
  listing-one-pager/
    SKILL.md
    scripts/
      build_one_pager.py
    templates/
      kw_listing_flyer.pdf
```

Front matter:

```markdown
---
name: listing-one-pager
description: Builds a one-page listing flyer PDF from an MLS number or address using the KW First Choice template. Needs the address or MLS id and up to 4 photo paths.
allowed-tools: Read, Write, Bash
---

# Listing One-Pager
## Inputs ...
## Process ...
## Definition of done ...
```

Creation prompt:

```
Create a new Claude skill called listing-one-pager. It should take an
address or MLS number, pull the listing facts from execution/lookup_property.py,
and generate a one-page PDF flyer that matches the template I dropped in
at templates/kw_listing_flyer.pdf. Include the KW First Choice branding and
my contact block from resources/caleb_contact.md.
```

## Pitfalls Nick calls out

- Expecting a Claude skill to work in Gemini or GPT. It is Claude-only.
- Weak descriptions. The front matter is what Claude reads to pick a skill, so say what it does and
  what it needs.
- Assuming an API is free because its homepage says so. Verify, and redirect the agent if it hits a paywall.
- Reinventing document skills that already exist. Use the pre-built PDF, DOCX, XLSX and PPTX skills.

## How Caleb should use this

- Package AIRE's document outputs as skills: listing flyer, buyer guide, seller net sheet PDF,
  weekly market report for St. Francisville and Baton Rouge.
- Drop in one approved KW First Choice design as the template so every document matches brand.
- Use the built-in PDF and DOCX skills for CMAs and offer summaries instead of custom code.
- Market reports pulling from paid data vendors cost money per call. Those runs need Caleb's
  approval before running.
- Anything published externally (flyer to social, report to clients) needs Caleb's approval before sending.

## Verification

- `skills/<name>/SKILL.md` exists with valid front matter (name, description, optional
  allowed-tools) between `---` lines.
- Asking Claude a request matching the description causes it to load that skill without naming it.
- Output document opens and visually matches the template's sections and branding.
- A second run with a different input produces a correctly updated document with the same layout.
