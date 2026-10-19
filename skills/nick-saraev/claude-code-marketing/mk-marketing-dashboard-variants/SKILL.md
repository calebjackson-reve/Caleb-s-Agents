---
name: mk-marketing-dashboard-variants
description: Builds a proprietary marketing analytics dashboard with Claude Code using Nick Saraev's method: assemble all data sources into one folder, let the smartest model propose the information architecture and scaffold an anomaly-detecting HTML app, then spin 5 design variants in parallel subagents, pick one, and deploy password-protected on Netlify with a routine that refreshes the data. Use when Caleb says "build me a dashboard", "show my lead sources and ad spend in one place", "client-facing listing performance page", "visualize my CRM and Metricool data", "make this report look good", or "spin up five design options".
---

# Marketing dashboard: scaffold, parallel design variants, deploy

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapter 13 (https://www.youtube.com/watch?v=yulWjh3rq28&t=16597s)

## What Nick teaches

A dashboard is a web design project, not a chart dump. The naive "paste my data and visualize it" produces an ugly, inefficient layout. Treat it as HTML/website design and it gets dramatically better.

Marketing data lives in many places (Meta Ads spend/clicks, GA4 sessions, Stripe revenue, CRM, email platform). The unified-dashboard idea: connectors per platform -> an **ingestion pipeline** running daily/weekly/monthly -> one dashboard, a single source of truth. Old agency "report day" (manual exports into a sexy PDF, really a sales mechanism) becomes a live asset. Optional: an AI assistant on the page so a client can ask questions.

### The build
1. **Assemble data** into one folder (`marketing dashboard data`). Nick used fake CSVs standing in for databases: channels, clients, sales reps, activities (time logs per rep), ad creatives, agency financials, attribution paths, backlinks, budget pacing, call tracking, channel daily, client summaries, monthly time series, GA4 data (10k+ rows. ~50k to 100k rows total).
2. **Ask for structure, not visuals**: "Go through all the data. For every file see how databases combine logically or are naturally linked. Create a high-level structure we'll use for the pages. Scaffold simply. Give me a few candidate structures."
3. **Model choice**: Sonnet 5 most of the course. Opus 5 on medium gave okay candidate structures (funnel-oriented / client-centric / persona questions). He bought **$20 of credits** to run **Fable 5 on high** and re-asked: "Assume the prior analysis was by a dumber model. Revisit what makes the most logical sense." Fable argued the data itself forced the answer: anomalies were client-scoped, so a **client-centric** layout (Overview with portfolio grid + alert feed. Performance. Traffic. Pipeline. Search presence. Commercial. Per-client pages. Channels. Sales teams. Signals). Nick took it: "for high-quality design, use the best models. They save you a tremendous amount of time."
4. Fable scaffolded the pages, drilled into clients, and added **Signals**: naive SQL threshold detection (e.g. leads per week 57 -> 3 = "lead flow collapse", conversion 1.65% -> 2.23% = "conversion jump", rep win rate 15.6% vs team 24.2%). Session cost ~**$13 USD** in credits. "Get the data on the page first, then skin it."
5. **Parallel design variants** with a cheaper model (Opus 5, high): "Spin this into 5 highly different designs. Spawn 5 subagents working simultaneously in HTML. Go nuts on visual range. Key focus: interpretability, usability, practical UX. Every variant must surface the same seven anomalies." Agents built editorial, terminal, Swiss, dense-ops, and warm-print variants in ~8 to 9 minutes each, visible in the agent monitor panel.
6. **Parallelization lesson**: linear = 5 steps x 5 min = 20 min. Parallel = 10 min. Parallelizable when agents work on the same data but their actions are independent. Pros: speed, searches more of the solution space. Cons: expensive, unmonitored so higher failure risk per agent (fine if only one needs to be good). He hit his usage limit and bought more credits.
7. **Pick and combine**: he liked dense-ops (light mode) and the terminal variant. Chose **V3**. Can merge best parts.
8. **Deploy**: Netlify free tier via its remote MCP as a custom connector (paste URL without the `npx` wrapper). "Upload V3 to Netlify and password protect it. Password 12345." Result: light/dark mode, client health scores, funnel drop-off, CPL spike ($100 -> $1,100) flagged. Gate per client via URL parameter + password later. Refresh via routine.
Whole thing: ~30 minutes and ~$15 in tokens. "we recreated agency analytics."

## Step by step

1. Export every data source to CSV/JSON into one folder. Include a one-line description per file.
2. Prompt the best available model (high effort) for candidate information architectures. Pick one.
3. Have it scaffold the pages with real data and a Signals section (thresholds for drops/spikes vs baseline).
4. Switch to a cheaper model. Spawn 3 to 5 subagents for distinct visual variants with the same data and anomaly list.
5. Review in the browser. Pick one or merge. Fix UX issues.
6. Deploy (Netlify MCP or Claude Artifact) with a password. Share link.
7. Build the ingestion routine (daily pull from each connector -> regenerate data files -> redeploy). Add error logging.

## Templates / prompts

Structure prompt:
```
Folder {{path}} holds all marketing data for {{business}}: {{one line per file}}.
Read every file. Identify natural joins and shared keys. Propose 3 candidate page structures
(not visuals), each with a one-line rationale. Then recommend one, citing properties of the data
that force the choice (scope of anomalies, coverage gaps, grain mismatches).
```

Scaffold prompt:
```
Scaffold the chosen structure as a static HTML app with real data on every page. Add a Signals
page: flag any metric that moves more than {{x}}x vs its trailing 8-week baseline (drops and spikes),
per client / source. Plain styling for now. Data first, skin later.
```

Variants prompt:
```
Spawn 5 subagents in parallel. Each builds a complete, visually distinct HTML variant of this
dashboard (e.g. editorial, terminal, Swiss, dense ops, warm print). Same data, same signals.
Priorities: interpretability, usability, practical UX. Save as v1..v5 and give me a launcher page.
```

Deploy prompt:
```
Deploy {{variant}} to Netlify via the connector. Password-protect with {{password}}. Give me the URL.
Then create a routine that every weekday at 6:00 a.m. Central pulls {{sources}} via connectors,
regenerates the data files, redeploys, and posts errors to Slack #aire-errors.
```

## Pitfalls Nick calls out

- One-shotting a dashboard yields an ugly chart grid.
- Cheaper models scaffold structure poorly. Spend on the best model for architecture, spend less on variants.
- Parallel subagents burn usage fast. Check `/usage` first.
- Don't auto-send "signals" or bad news to clients. Present them in person (`mk-automate-or-keep-human`).
- Netlify connector URL must be the bare URL, not the `npx` command.

## How Caleb should use this

- Caleb's data sources: CRM lead/source/stage exports, Metricool social analytics (connector available), Google Analytics or website form counts, Facebook/Zillow ad spend, MLS stats (DOM, list-to-sale ratio, inventory by area), showing feedback. Put them in `aire/dashboard-data/`.
- Two dashboards: (1) **AIRE ops**: lead sources, response time, follow-up compliance, pipeline by stage, cost per lead, with signals like "Zillow leads down 60% this week" or "average first-reply time over 30 min". (2) **Seller-facing listing page**: views, saves, showings, feedback, price position vs comps, password per client. The seller page is a strong listing-presentation differentiator.
- Deploying anything publicly or sharing a seller page **needs Caleb's approval before running**. Buying model credits for the Fable scaffold step **needs Caleb's approval before running**.
- Reuse the chosen design as the AIRE house style for every future client page.

## Verification

- Structure recommendation cites specific data properties. Chosen pages cover every data file.
- Scaffold loads with real numbers. Signals page lists concrete anomalies with baseline vs current.
- 3 to 5 variants open from a launcher page. One is chosen.
- Deployed URL asks for a password, then renders in light and dark mode. A routine run refreshes the data and redeploys without errors.
