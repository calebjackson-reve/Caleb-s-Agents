# Course notes: VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)

- **Instructor:** Nick Saraev
- **URL:** https://www.youtube.com/watch?v=gcuR_-rzlDw
- **Length:** 383 minutes, 48 chapters
- **Skills folder:** `/home/user/Caleb-s-Agents/skills/nick-saraev/vibe-coding-course/` (prefix `vc-`)

## Nick's core thesis

Anyone can now build real software by describing what they want in natural language to two complementary models: Gemini 3.1 Pro High inside Google Antigravity for design and front-end work, and Claude Opus 4.6 inside the Claude Code extension for planning, backend and security. The reliable way to ship is a fixed loop (inspiration screenshot, main functionality, local JSON testing, Supabase, auth last, deploy, end-to-end test, landing page) followed by an 80/20 security audit run by a fresh-context model. Since software is now cheap, the moat is distribution: spend about 5% of your effort building and 95% pricing on value, running outbound, and iterating from real customer feedback.

## Chapter-by-chapter summary

| # | Chapter (start) | One-line summary |
|---|---|---|
| 1 | Introduction (0m) | Course map: setup, portfolio site, security, client dashboard, fundamentals, agents, design deep dive, lead-gen SaaS, thumbnail SaaS, debugging, content SaaS, pricing. |
| 2 | Setting Up Antigravity (2m) | Download from antigravity.google, log in with Google, open the agent panel (Cmd+Option+B), Gemini 3.1 Pro High plus other models available. |
| 3 | Navigating the Interface (5m) | Three panes: explorer (file browser), editor (Notepad with colors, markdown preview), agent chat. Nick barely uses the editor. |
| 4 | Agent Chat Panel (9m) | New conversation (Cmd+Shift+L), history, reopen in new workspace, walkthrough artifacts, customizations and MCP menu. |
| 5 | Customizing AI Behavior (11m) | Rules (always-on, global or workspace, `.agent/rules/`, `GEMINI.md` as parent rule) and workflows (slash-command SOPs like code-review). |
| 6 | Intro to MCP Servers (15m) | MCP servers are pre-built workflows for tools (Postgres, GitHub, Stripe). Nick rarely uses them. |
| 7 | Adding Context (16m) | `@` mentions attach files, rules, terminals, conversations and MCP servers without polluting the prompt, `/` invokes workflows. |
| 8 | Conversation Modes (16m) | Planning (always start here for new features) vs Fast (one-off tasks). |
| 9 | Selecting Models (18m) | Hot-swap models, Gemini 3.1 Pro High for design, Opus 4.6 for backend, Google benchmarks to compare. |
| 10 | Voice Dictation (19m) | Speak 150 to 200 wpm vs type 50 to 80, Thought tab, changes, terminal, artifacts and built-in browser tabs. |
| 11 | Using Claude Code (22m) | Sign up at claude.ai, Pro $17/month, Max from $100 at recording time, no free tier for Claude Code. |
| 12 | AI for Business Efficiency (24m) | A dev at this level would cost $20k to $30k/month, Nick spends about $200/month for 100x ROI. |
| 13 | Getting Started with Claude Code (24m) | Install the extension, `/login`, permission modes, then one-shot a landing page from a `GEMINI.md` prompt, iterate with screenshots, deploy by drag-and-drop to Netlify. |
| 14 | Understanding Security (44m) | Websites need no security, apps do, OpenClaw leaked ~25,000 keys, aim for "less hackable than it is worth." |
| 15 | Key Security Practices (45m) | The five 80/20 issues: exposed keys, missing RLS (83% of Supabase breaches), no server-side validation, hallucinated packages, missing auth middleware, the security audit prompt. |
| 16 | Transition to Full Stack (62m) | Bridge: combine front-end skills and security into a real SaaS. |
| 17 | Client Dashboard Platform (62m) | Scope: orders, pending orders, stats dashboard, settings, login, landing page, deploy. |
| 18 | The Design Loop (63m) | Inspiration (Dribbble, Godly), optional animation, main functionality, local JSON test, DB, auth last, deploy, e2e, landing page. |
| 19 | Common Stack Overview (66m) | Next.js + Supabase + Netlify, the full client dashboard build: Opus plans, Gemini builds from screenshot, functional fixes, redesign in a fresh chat, GEMINI.md checkpoint, Supabase via database.new, SQL editor, auth, Netlify CLI deploy, Site URL fix, Claude Code security audit. |
| 20 | Software Engineering Principles (131m) | Hosting, client is your browser, server does logic, database is a Google Sheet, the request loop. |
| 21 | Development Process (138m) | Local, staging, production, never edit production live, hosting is renting a computer. |
| 22 | Databases and Hosting Basics (140m) | Tables, header rows, records, primary keys, filtering as querying. |
| 23 | Database Requests (144m) | Browser click to server to database filter and back. |
| 24 | Types of Databases (144m) | SQL (MySQL, PostgreSQL, SQLite) fixes columns, NoSQL (MongoDB, Cassandra) does not. |
| 25 | SQL vs NoSQL (145m) | NoSQL: every record has its own header row, like a Drive folder of documents. |
| 26 | Programming Languages Overview (148m) | Use SQL for most things, look up relational vs non-relational if curious. |
| 27 | Role of Frameworks (148m) | HTML structure, CSS style, JavaScript interactivity (first website at info.cern.ch), frameworks standardize the three. |
| 28 | Frameworks in Action (153m) | Next.js, Vite, Vue/Nuxt, frameworks are in training data so AI output is better, intro to version control via the essay_final.docx problem. |
| 29 | GitHub and Repositories (159m) | Repos store every change, branches, merges, Netlify/Vercel can auto-deploy from a repo. |
| 30 | Smart Ways to Use Agents (162m) | Agent Manager, Playground, Inbox with Pending filter, hotkeys, build 2 to 4 variants in parallel and keep the best, cap at 2 to 3 agents. |
| 31 | Lead Generation App (173m) | Plan Leadzo in Excalidraw: landing, auth, config with user API keys, scrape page, orders history. |
| 32 | App Structure and Planning (176m) | Claude turns the sketch into a description, new folder `lead-scraping-saas`, pick a Dribbble dashboard. |
| 33 | Designing the UX (177m) | Feed screenshot + competitor copy + spec to Gemini, Vite app scaffolds, walkthrough of the generated pages. |
| 34 | Troubleshooting and Debugging (182m) | Wrap Apify, AnyMailFinder, Anthropic, docs via "Copy for LLM", .env keys, curl first, batch requests, Gemini rate limit, handoff prompt to Claude Code fast mode, Supabase migration, peer-review across models. |
| 35 | Logo and Branding (216m) | Nano Banana square logo prompt, Netlify deploy, link GitHub, mobile check. |
| 36 | Security Audit Initiated (221m) | Gemini runs the audit, finds auth bypass on paid routes, hallucinated Anthropic package, missing WITH CHECK, fixes applied. |
| 37 | API Wrapping (227m) | Most apps are wrappers, Apify has thousands of actors, payments are the missing piece. |
| 38 | Payment Integration Overview (230m) | Stripe handles cards, fraud, tax, webhook updates Supabase, one-time, subscription, credit models, three code pieces. |
| 39 | Thumbnail Generator (234m) | Credit arbitrage, Stripe sandbox and keys, app plan: landing, auth, pay, dashboard, config with faces, generate with 3 variants. |
| 40 | Design Inspiration (239m) | Dribbble glassmorphism design with font Lufga and hex palette typed in, voice dump, first Thumbly demo, feedback list. |
| 41 | UX Enhancements (246m) | Redesign to light theme, copy a landing page verbatim, pill to rounded squares, no shadows, Nano Banana face-swap tested in AI Studio, REST code to agent, Supabase set up, three variants, credits consumed. |
| 42 | Deploying to Production (266m) | Stripe keys added, migration run, email/password auth fix, plan selection via ?plan=, checkout bugs, zero-credit redirect, batch feedback while testing. |
| 43 | Debugging Payment Issues (278m) | Payment-to-user linking bug, lag from fetch-on-every-load, mobile nav, GitHub + Netlify deploy, 22 to 26 second generation hits serverless timeout, handoff to Claude Code. |
| 44 | App Launch and Security Check (288m) | Audit adds rate limiting, middleware, webhook secret, WITH CHECK migration, Splinter concept introduced, Leon's WebGL hero prompt. |
| 45 | Ideating Splinter (296m) | Claude writes the spec, Gemini builds hero then app with updates.md, dashboard redesign, rate limit handoff, Claude wires Opus, LinkedIn OAuth, publishes a real post, voice profile, scheduling, API keys, webhooks, Supabase, Netlify, Stripe. |
| 46 | Feature Integration (350m) | Stripe upgrade works, confetti on return, managed subscription portal, API access live, session cost about $70 in fast mode. |
| 47 | Pricing and Marketing (354m) | Distribution over software, 5% build / 95% market, launch to 20 free users, value-based pricing worked examples and tiers, outbound, inbound, affiliate. |
| 48 | Wrap-Up (381m) | Maker School pitch (first customer in 90 days or refund), podcast, resources in description. |

## Skills created

| Skill | What it does | Trigger phrases |
|---|---|---|
| `vc-antigravity-dual-model-setup` | Install and operate Antigravity + Claude Code, modes, models, voice, hotkeys | "set up Antigravity", "which model for this", "planning vs fast mode", "Claude Code permission modes" |
| `vc-rules-and-workflows` | Always-on rules, GEMINI.md, slash workflows, @-mentions, when to use MCP | "always design in this style", "I keep repeating instructions", "create a /security-review workflow" |
| `vc-one-shot-landing-page` | Cinematic landing page prompt, six-question brief, iteration, Netlify drag-and-drop | "build me a landing page", "listing page", "quick site live fast" |
| `vc-security-audit` | Five 80/20 issues, audit prompt, fresh-context reviewer, fix pass | "is this secure", "run a security audit", "check RLS", "before I launch" |
| `vc-design-loop` | Inspiration to shipped app order, Opus plans / Gemini builds, design upgrade prompts | "build me a dashboard", "what order should I build", "make it look like this screenshot" |
| `vc-supabase-full-stack-stack` | Next.js + Supabase + Netlify wiring, database.new, SQL editor, auth, Site URL | "connect to Supabase", "add login", "signup email goes to localhost" |
| `vc-web-app-fundamentals` | Plain-English client/server/DB, SQL vs NoSQL, frameworks, GitHub | "what's a database really", "front end vs back end", "what is GitHub for" |
| `vc-deploy-to-production` | Drag-and-drop, Netlify CLI via agent, GitHub link, prod-only bugs, post-deploy checklist | "put this live", "deploy to Netlify", "works locally not live", "times out in production" |
| `vc-parallel-agents` | Agent Manager, Playground, Inbox, variants and division of labor | "build three versions", "work on two things at once", "orchestrate agents" |
| `vc-app-planning-spec` | Excalidraw page map, Claude spec.md, assembly prompt, first-minutes steering | "I have an app idea", "what pages does it need", "write a spec" |
| `vc-api-wrapper-app` | Wrap Apify/AnyMailFinder/Anthropic/Nano Banana, docs for LLM, curl first, batching | "wrap this API", "scrape leads", "enrich contacts", "call Claude from the app" |
| `vc-stripe-payments` | Models, sandbox, checkout + webhook + entitlement, 4242 testing, common bugs | "add payments", "sell credits", "keeps sending me back to /payment" |
| `vc-debugging-iteration` | Error + screenshot, batched voice dumps, state the role, loop breakers, verify yourself | "it's broken", "going in circles", "nothing happens when I click" |
| `vc-model-handoff-context-backup` | GEMINI.md snapshots, updates.md, handoff prompt when rate-limited | "hit the usage limit", "switch to Claude Code", "save where we are" |
| `vc-ai-assets-nano-banana-veo` | Hero images, Veo loops, logos, face-swap thumbnails in AI Studio | "make a hero animation", "logo for AIRE", "thumbnail with my face" |
| `vc-value-based-pricing` | VBP worksheet, 10 to 20% of value, 10x/8x/6x tiers, unit economics | "how much should I charge", "pricing tiers", "ROI pitch" |
| `vc-distribution-go-to-market` | 5/95 split, 20 free users, outbound then inbound, affiliates | "how do I get customers", "cold email or content", "find beta users" |
| `vc-anti-slop-content-prompting` | No hashtags/emojis/alternating lengths, voice profiles, writing samples, icebreakers | "sounds like AI", "write it in my voice", "repurpose this post" |

## Not turned into skills (and why)

- **Chapters 1, 12, 16, 48**: intro, ROI opinion, transition and outro. No technique, summarized above.
- **Chapters 20 to 29** were merged into one explainer skill (`vc-web-app-fundamentals`) rather than one per chapter, since they are mental models, not procedures.
- **The specific demo apps** (client dashboard, Leadzo, Thumbly, Splinter) are not separate skills. Their lessons are spread across the design loop, stack, API wrapper, payments, deploy, debugging and handoff skills as the brief requested.
- **LinkedIn OAuth publishing and the webhook/API-access features of Splinter** are mentioned in `vc-deploy-to-production` and `vc-anti-slop-content-prompting` but not given their own skill, because the transcript only shows clicks in the LinkedIn developer portal, not a repeatable procedure.
- **Leon's WebGL hero prompt** is referenced but not reproduced, since Nick explicitly did not read it on camera.

## Top 5 takeaways for Caleb

1. **Two models, two jobs.** Gemini 3.1 Pro High in Antigravity for anything visual (listing pages, dashboard looks), Claude Code for plans, databases, payments and the security audit. Hand off with a generated summary prompt when one runs out of usage.
2. **Follow the loop and do auth last.** Inspiration screenshot, functionality with JSON data, Supabase, auth, deploy, retest, landing page. Keep functionality and design in separate chats. Every AIRE app should go through this order.
3. **Never skip the 80/20 security audit.** RLS on every Supabase table, keys in `.env`, server-side validation, real packages, default-deny middleware. AIRE handles client data and runs on Caleb's API keys, so this is non-negotiable before anything is public.
4. **Give the agent context, not retries.** Exact error text, a tight screenshot, the raw API response, your input, the user's role, and a bullet list of exactly what the backend must do. Batch feedback into one voice dump after clicking everything yourself.
5. **Build 5%, market 95%.** Price on value delivered (10 to 20% of it), launch to 20 free users, start with outbound to agents and investors, and let real feedback shape v2. The software is not the moat, Caleb's relationships in St. Francisville and Baton Rouge are.
