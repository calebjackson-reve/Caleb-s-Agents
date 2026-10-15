# Course Notes: AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)

- **Instructor:** Nick Saraev
- **URL:** https://www.youtube.com/watch?v=MxyRjL7NG18
- **Length:** 341 minutes, 37 chapters
- **Skills folder:** `/home/user/Caleb-s-Agents/skills/nick-saraev/agentic-workflows-course/`

## Nick's core thesis

AI is in an "overhang": model capability is far ahead of how people use it, and most people still
treat galaxy-brain models as copy-paste tools. Agentic workflows close that gap by turning a chat
into an agent that plans, uses tools, remembers, reflects and orchestrates in a loop. The problem is
that LLMs are probabilistic and business is deterministic, and per-step error compounds (five 90%
steps is 59% end to end). The fix is a framework, not a smarter model: DOE (Directive,
Orchestration, Execution) keeps the what in natural-language markdown, lets the agent orchestrate,
and pushes every repeatable operation into deterministic scripts the agent builds and self-anneals.
Once a workflow is battle-tested locally, its scripts go to the cloud as webhooks or schedules with
no LLM in the loop, and the IDE becomes a single text box from which you run your business. Nick's
claim is that this automates 90% of 10,000 roles rather than 100% of one, and that the window to
profit from knowing it is open now and closing.

## Chapter by chapter

1. **Introduction (0m):** what the course covers, Nick's credentials ($160k/month across two
   agencies), business focus.
2. **Foundational concepts (1m):** the AI overhang, people drinking the ocean through a straw, the
   arbitrage window is closing.
3. **Scraping leads with agentic workflows (4m):** Opus 4.5 finds five meal-prep companies and
   emails them autonomously in 15 seconds, the "river of value," 90% of 10,000 roles, the loom
   analogy.
4. **How agentic workflows changed the game (11m):** n8n nodes vs bullet points, why now
   (intelligence at 80% SWE-bench, MCP standardization, 3x cost drop with Opus 4.5), documents vs
   chatbots vs agents, chat is just the shell the agent borrows.
5. **The 5 steps, PTMRO (30m):** planning, tools, memory, reflection, orchestration, plan mode demo
   building a silence-cutting video tool, memory tiers, compaction, why not CrewAI-style org charts.
6. **Evolution of interfaces (49m):** text is the universal interface, a step back from GUIs, use
   voice transcription (Whisper Flow, Aqua).
7. **The issue of variability (52m):** five plan-mode instances give five answers, how LLMs sample
   tokens, compound error math, DOE as the wrapper, separation of concerns.
8. **LLMs vs Python scripts (67m):** sorting by LLM takes 15 to 30 seconds, script takes 53 ms,
   reserve the LLM for judgment.
9. **IDEs (69m):** file explorer, editor, agent chat, never edit files by hand, Antigravity vs VS
   Code vs Cursor.
10. **Antigravity walkthrough (87m):** improving the create_proposal directive with a web enrichment
    step, generating a proposal from ChatGPT-made demo data.
11. **VS Code walkthrough (92m):** same workspace runs in any IDE, running the Upwork scraper, the
    extension library.
12. **Workspace structure and setup (94m):** directives and execution folders, tmp and resources,
    descriptive names, .env, identical CLAUDE.md / AGENTS.md / GEMINI.md, "set up my workspace
    according to this file."
13. **Sales call transcript to proposal (103m):** paste a transcript, get a formatted proposal plus
    follow-up email in seconds, 15 minutes to build.
14. **DOE framework (105m):** three layers in depth, markdown, no code in directives, atomic
    scripts, AI inside scripts is fine, agents.md and .env as the two config files.
15. **First workflow with DOE (130m):** create a VS Code workspace, paste the system prompt, "set up
    my workspace," build an onboarding email flow with a Gmail app password, the four parts of a
    good directive plus edge cases and graceful failure.
16. **CRM manager for ClickUp (138m):** "be a wrapper around my CRM," three approaches, official MCP
    path, then an API-scripts path that supports custom fields.
17. **Claude Skills (148m):** skills/ folders with SKILL.md, YAML front matter, pre-built document skills.
18. **Building with Claude Skills (152m):** generate-report skill from a dropped-in Canva PDF
    template and a free weather API.
19. **MCP and context windows (155m):** USB-C for AI, clients and servers, resources/tools/prompts,
    token cost of tool definitions, accuracy drops with context length, prompt compression,
    compaction.
20. **MCP in action, Gmail (173m):** set up a Gmail MCP end to end, build a custom MCP server for
    leftclick.ai in minutes, /context shows MCP eating 8% of the window.
21. **Systematic approach to building (181m):** system prompt must explain the framework, the
    rationale, self-annealing and autonomy, SOPs are already directives, bullet points when you have
    nothing.
22. **LinkedIn lead scraper build (188m):** three approaches, Sales Navigator plus Vain plus
    AnyMailFinder, real-data testing, batching, documenting, cold-start retest, steering as highest
    ROI.
23. **Parallelized lead scraper build (203m):** five Claude instances build five approaches in tmp
    folders, standardized tests, merge the winner.
24. **Improving workflows over time (213m):** "make it faster / cheaper" loop, the 10x
    order-of-magnitude rule, workflows as a permanent library, meta-directives.
25. **Self-annealing workflows (221m):** annealing metaphor, error-diagnose-fix-update loop,
    Employee A vs B, the system prompt lines that enable it.
26. **AI safety and text interface (230m):** compounding risk, four guardrails, graceful recovery,
    building vs using, the single text box.
27. **Maximizing efficiency (237m):** voice in and skim out, be specific up front, ask what
    workflows exist, paste context.
28. **API documentation (243m):** JavaScript-rendered docs defeat web fetch, paste the endpoints,
    vendors with "copy for LLM" markdown.
29. **Watch workflows as they run (249m):** watch the first 10 to 15 runs, background tasks for long jobs.
30. **Setting up hooks (251m):** chime on completion, restart to load, five instances chiming.
31. **Reviewing output and chaining (255m):** confirm good runs, umbrella workflows remove handoffs,
    magnitude and sensitivity rule for human in the loop, do not automate sales calls, event- and
    schedule-driven workflows motivation.
32. **Cloud and webhook deployment (268m):** deploy scripts not the orchestrator, Modal, what a
    webhook is, secrets, Slack logging, create_proposal webhook demo.
33. **Scheduled deployment (290m):** cron described in plain language, every-5-minutes welcome email
    on Modal, run-now, near-instant execution.
34. **Parallelization of multiple agents (294m):** multiple terminal panes, spread across models to
    dodge rate limits, two baseline and four soft max, three-approach build pattern.
35. **Day-to-day use (300m):** three panes running agency, YouTube and community workflows at once,
    re-authenticating an MCP mid-flow.
36. **Sub-agents (314m):** context pollution, sub-agents isolate context and parallelize, reviewer
    and documenter sub-agents, least privilege, native .claude/agents format.
37. **Outro (340m):** recap and Maker School pitch.

## Skills created

| Skill | What it does | Trigger phrases |
|---|---|---|
| aw-doe-framework | Three-layer DOE architecture, why it beats raw LLM output | "build this as a workflow", "make this repeatable", "it does it differently every time" |
| aw-ptmro-agent-loop | The five steps every agent runs and where to intervene | "how does the agent think", "why did it go off the rails", "should I plan this myself" |
| aw-workspace-setup | IDE basics, folder structure, .env, matching system prompt files | "set up a new workspace", "where do my files go", "set up my workspace according to CLAUDE.md" |
| aw-system-prompt-agents-md | Required ingredients of CLAUDE.md including safety and change log | "write my CLAUDE.md", "the agent keeps asking me what to do", "add a rule so it never does X" |
| aw-writing-directives | Four-part directive with edge cases, fallbacks and graceful failure, from SOP or bullets | "turn this SOP into a directive", "it said it finished but only did half" |
| aw-self-annealing | Error-diagnose-fix-update loop and cold-start verification | "it broke again", "make it fix itself", "add retry logic" |
| aw-deterministic-scripts | LLM for judgment, atomic scripts for everything else | "this is slow", "it got the numbers wrong", "should the AI do this or a script" |
| aw-claude-skills-format | skills/ folder, YAML front matter, template-driven PDF generation | "make this a Claude skill", "generate a report from this template" |
| aw-mcp-when-and-how | When MCP is worth its context cost, connecting one, building a custom server | "connect Gmail", "add an MCP", "why is my context full" |
| aw-crm-wrapper | Agent as a wrapper around a CRM via MCP or API scripts | "manage my CRM for me", "add this lead", "connect AIRE to my CRM" |
| aw-transcript-to-proposal | Transcript in, formatted proposal and email draft out | "write up the proposal from this call", "turn my listing appointment notes into a presentation" |
| aw-parallel-agents | Build 3 to 5 approaches at once in tmp folders, run 2 to 4 panes daily, spread across models | "try a few approaches at once", "which way is best", "I'm hitting my usage limit" |
| aw-improve-and-chain-workflows | 10x optimization rule, library reuse, umbrella meta-directives | "make this faster", "is it worth optimizing", "run the whole onboarding in one go" |
| aw-human-in-the-loop-safety | Magnitude and sensitivity rule, four guardrails, never-automate list | "can this run on its own", "should I check this before it sends", "is it safe to let it loop" |
| aw-hooks-notifications | Chime hooks, background tasks, watching first runs | "notify me when it's done", "play a sound when it finishes", "set up a hook" |
| aw-cloud-webhook-deploy | Deploy scripts to Modal as a webhook with secrets and Slack logging | "give me a webhook URL", "put this in the cloud", "trigger this from my CRM" |
| aw-scheduled-deploy | Cron schedules on Modal described in plain language | "run this every morning", "every Monday at 9", "schedule it" |
| aw-sub-agents | Reviewer and documenter sub-agents, parallel sub-agents, least privilege | "review this script", "the directive is out of date", "create a sub-agent" |
| aw-operating-the-agent | Voice input, specificity, pasting context, confirming good runs, Slack-style prompting | "how should I talk to it", "it asked me five questions", "what workflows do I have" |
| aw-api-docs-pasting | Paste endpoint docs or LLM markdown instead of letting the agent guess | "connect to this API", "it can't read the docs", "it keeps guessing the endpoint" |

## Top 5 takeaways for Caleb

1. **Wrap AIRE in DOE.** Every repeatable real estate process (lead intake, listing launch, CMA
   prep, weekly client updates) becomes a readable directive plus atomic scripts. The agent routes,
   the scripts do the work, and the output is the same every time. Numbers never come from the LLM.
2. **Steer at the start, then let it anneal.** Two minutes in plan mode and a few high-level nudges
   are the highest-leverage minutes of the day. After that, let errors feed back, insist it
   documents fixes in the directive, and prove it with a cold-start run in a fresh session.
3. **Keep humans where quality is non-linear.** Client emails and texts, CMAs, net sheets, proposals
   and anything with a dollar figure get a review gate. Research, comps pulls, drafting and CRM
   logging run on their own. Never automate the actual client conversation.
4. **Deploy scripts, not the agent.** Once a workflow is battle-tested, push its scripts to a
   webhook (new lead at 5:30pm) or a schedule (7:30am listings pull, Monday client updates) with
   Slack logging. Drafts land in a queue for Caleb's approval, nothing sends on its own.
5. **Operate from one text box, by voice, in two to four panes.** Dictate requests with all inputs
   included, paste transcripts and pages instead of wiring APIs, confirm good runs so directives
   learn, and use chime hooks so no pane sits waiting. Spread between Claude and Gemini when limits
   hit.
