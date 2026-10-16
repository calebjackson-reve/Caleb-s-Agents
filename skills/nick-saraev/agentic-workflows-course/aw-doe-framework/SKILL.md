---
name: aw-doe-framework
description: Applies Nick Saraev's DOE framework (Directive, Orchestration, Execution) to turn a probabilistic AI agent into a reliable three-layer business automation where natural-language directives tell the agent what to do, the agent orchestrates, and deterministic Python scripts do the actual work. Use when Caleb says "build this as a workflow", "make this repeatable", "the agent does it differently every time", "turn this SOP into an automation", or when designing any AIRE process that must produce the same result every run (lead intake, listing marketing packages, CMA prep, follow-up sequences, open house reporting).
---

# DOE Framework: Directive, Orchestration, Execution

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 7 and 14
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=3171s and &t=6341s)

## What Nick teaches

LLMs are probabilistic. They predict a distribution of next tokens and sample from it (temperature,
top-p, mixture-of-experts voting all add randomness), so the same question asked five times in plan
mode gives five different answers. Business work is deterministic: an invoice, a receipt, a
qualification framework must come out the same every time. Error rates also compound. Five steps at
90% each is 0.9^5 = 59% end to end. Ten steps is 35%. Twenty steps is 12%. A business sending the
wrong invoice 5% of the time does not lose 5% of revenue, it loses clients.

The fix is not waiting for smarter models. It is wrapping the model in a framework that narrows the
range of possible outcomes. Nick calls his framework DOE, a "three-layer software architecture":

1. **Directive layer (the what).** SOPs written in natural language as markdown files in a
   `directives/` folder. One file per workflow or capability, descriptively named
   (`scrape_leads.md`, `proposal_generation.md`, not `run_business.md` and not `l_s.md`). They
   define goals, inputs, tools, expected outputs and edge cases. **Zero code inside a directive.**
   URLs are fine, executables are not. Anyone in the company should be able to read and improve one.
2. **Orchestration layer (the who).** The AI agent. It acts like a competent project manager: reads
   the directive, decides what to call and in what order at runtime, routes around failures,
   diagnoses problems instead of crashing. In old no-code tools you did this routing once by wiring
   nodes. Here the agent does it every run.
3. **Execution layer (the how).** Deterministic scripts in an `execution/` folder, usually Python.
   Each script does exactly one thing (`scrape_apollo.py`, `enrich_clearbit.py`, `send_email.py`,
   `create_pandadoc.py`, `upload_to_gsheet.py`). Same input always gives same output. They either
   work or throw a clear error. Multiple directives can share the same script. Scripts can call an
   LLM inside them (for example `process_leads_with_claude.py` with a low temperature and a fixed
   prompt), that is still deterministic enough because the call is boxed inside one script.

Why it works: separation of concerns. Anything deterministic (API calls, data transforms, file ops,
math, sorting) goes in code, which is fast, cheap and interpretable. The LLM is reserved for
judgment and routing. Nick's bowling analogy: DOE is the bumper rails that keep the ball out of the
gutter. He reports 2 to 3% error rates on business functions with this setup, and converted a
$2M/year dental marketing agency's whole knowledge base into DOE workflows in about 15 minutes.

DOE is "literally just a folder structure plus a system prompt": `directives/`, `execution/`, a
system prompt file (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`), and a `.env` for keys.

## Step by step

1. Confirm the workspace has `directives/`, `execution/`, a `.env`, and a system prompt that
   explains DOE (see `aw-workspace-setup` and `aw-system-prompt-agents-md`).
2. Take the task and split it: which parts are judgment or routing (stay with the agent) and which
   parts are repeatable operations (become scripts).
3. Write or have the agent write one directive markdown file for the workflow. Include objective,
   inputs, step-by-step process naming which scripts to call, definition of done, edge cases and
   fallbacks (see `aw-writing-directives`).
4. Have the agent build one atomic script per operation in `execution/`. Each takes explicit
   parameters (`--location "Baton Rouge" --amount 200`) and returns a clear result or error.
5. Run the workflow with real data. Let it self-anneal (see `aw-self-annealing`). Have it update
   both directive and scripts when it fixes something.
6. Re-run from a fresh agent session to confirm the directive alone is enough for a new instance.
7. Reuse scripts across directives. When several directives always run together, group them under an
   umbrella directive (see `aw-improve-and-chain-workflows`).

## Templates / prompts

Workspace layout:

```
aire-workspace/
  CLAUDE.md            # system prompt, copy also to AGENTS.md / GEMINI.md
  .env                 # API keys only, never in directives or scripts
  directives/
    new_lead_intake.md
    listing_marketing_package.md
    open_house_followup.md
  execution/
    fub_client.py        # Follow Up Boss or whichever CRM Caleb uses
    send_email.py
    create_listing_flyer.py
    upload_to_gsheet.py
  tmp/                 # scratch files, cleared after runs
```

Prompt to convert an existing process:

```
Here is my SOP for [new buyer lead intake]. Turn it into a DOE directive in
directives/ and build whatever execution scripts it needs in execution/.
Directives contain no code. Each script does one thing and takes explicit
parameters. Ask me only for API keys or inputs you genuinely cannot infer.
```

Prompt when a step keeps varying:

```
This step is producing different results each run. Move the deterministic
part into an execution script with fixed inputs and outputs, and leave the
agent only the decision of which script to call.
```

## Pitfalls Nick calls out

- Putting code in directives. They stop being readable by non-technical staff and that kills the
  interpretability benefit.
- One giant "run my whole business" directive. The model loops and misses edge cases. Keep
  directives modular and chain them with umbrella directives later.
- Cryptic file names. The agent picks a directive by its name, so `scrape_leads.md` beats `sl.md`.
- Letting the LLM do deterministic work (sorting, math, counting). It is slower, costlier and less
  accurate than a script.
- Scripts that do several things. Atomic scripts can be unit tested, version controlled and reused.
- Expecting raw LLM output to be business-grade without the framework. 30 to 50% variance in answers
  is normal for an unconstrained model.

## How Caleb should use this

- Model AIRE as a DOE workspace: directives for lead intake, showing follow-up, listing launch, CMA
  prep, closing checklist, scripts for the CRM, email, MLS exports, Google Sheets and flyer
  generation.
- Any process that touches a client-facing document (CMA, net sheet, listing presentation) belongs
  in a script with a fixed template so the output is identical every time.
- Judgment calls like "is this lead hot" or "which follow-up template fits" stay with the
  orchestrator, but the sending of the message is a script and needs Caleb's approval before
  running.
- Share directives with a transaction coordinator or assistant. They can read and improve them
  without touching code.
- Keep every API key (CRM, email, MLS data vendor) in `.env`. Never paste keys into a directive.

## Verification

- `directives/` contains only `.md` files with no code blocks of executable code.
- Each script in `execution/` runs standalone from the terminal with explicit parameters and returns
  the same output for the same input.
- A fresh agent session, told only "run [directive name]" with the required inputs, completes the
  workflow without asking how.
- Three consecutive runs on the same input produce the same deliverable.
