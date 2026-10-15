# Report: Nick Saraev's free course, turned into skills

Date: 2026-10-15
Prepared for: Caleb Jackson

## What was reviewed

**Confirmed fact:** The Maker Zero classroom on Skool (the link you sent) is gated behind a login I do not have. A public directory lists it at 10 courses, and Nick publishes those same masterclasses on his YouTube channel. I pulled the chapter markers and full transcripts of the ten full-length courses (about 40 hours of video) and treated those as the course material.

**Inference:** The YouTube set matches the Skool classroom. If the classroom holds something not on YouTube (bonus prompts, downloads), it is not covered here. If you export or screenshot the Skool lesson list I can diff it.

| Course | Length | Skills |
|---|---|---|
| Claude Code Full Course: Build and Sell | 4h 10m | 13 |
| Claude Code Advanced Full Course | 3h 18m | 13 |
| Claude Skills Full Course: Automate Your Work | 47m | 9 |
| AI Agents Full Course: Master Agentic AI | 2h 13m | 14 |
| The Only Codex Course You Need | 4h 37m | 18 |
| Claude Code Marketing Full Course | 6h 2m | 14 |
| How to Build Mobile Apps with Claude Code | 4h 3m | 13 |
| Agentic Workflows: Build and Sell AI Automations | 5h 41m | 20 |
| Vibe Coding Full Course: Gemini 3.1 + Antigravity | 6h 23m | 18 |
| Cold Email Copywriting and Outreach | 3h 59m | 13 |
| **Total** | **~41 hours** | **145** |

## What I learned (the course in one page)

Nick's whole method rests on a handful of ideas that repeat across every course.

1. **Prompt, then skill, then loop, then cloud.** Do a task once by voice in Claude Code. The second time you do it, turn the conversation into a skill. When the skill is trusted, put it on a loop or schedule. Only then move it to the cloud so it runs without you. Never skip a rung.
2. **Directive, Orchestration, Execution (DOE).** The agent reads a plain-English directive, decides what to do, and calls deterministic scripts for anything involving numbers, sorting, APIs or files. The LLM judges, the script computes. This is what makes output identical run after run.
3. **Verify everything.** Task, do, verify. Screenshot loops for design, dry runs for anything that sends, fresh-context reviewer agents for code. "Done" means evidence, not a claim.
4. **CLAUDE.md is the brain and it learns.** Keep it 200 to 500 lines, put identity and rules at the top, and add a Learned Rules section the agent appends to every time you correct it.
5. **Front of the funnel first.** Speed to lead, follow-up, outreach and proposals compound. Back-office automation can wait. Diagnose the bottleneck with RACE (Reach, Acquire, Close, Expand) before building anything.
6. **Humans write the email, AI fills three short slots.** Fuzzy variables of 5 to 15 words keep outreach human. No em dashes, no hashtags, no AI cadence.
7. **Parallel beats serial.** Multiple Claude tabs, sub-agents for research and review, consensus runs for ideas, worktrees for parallel pages. Set a budget first.
8. **Security is an 80/20.** Keys in .env only, row-level security on every table, server-side validation, real packages, a fresh-session audit by a different agent. Do this before anything touches client data.
9. **Sell on value, keep the last 10% human.** Price at 10 to 20 percent of the value delivered. Nothing sends, posts or publishes without a human review.

## How the skills load

Each skill is a folder with a SKILL.md whose first lines are a name and a description ending in "Use when ...". All 145 are linked into `.claude/skills/`. Claude Code reads every description at session start and pulls in the full skill when your request matches. You do not name the skill. You describe the job.

Proof: a fresh Claude Code session in this repo listed `mk-speed-to-lead-email-sms`, `ce-cold-read-opener` and others by name when asked which skills it had, and this session itself picked up all 145 after the links landed.

To force a skill, type its name with a slash, for example `/mk-crm-followup-cadence`.

## How to use them: say the job, not the skill

| You say | Skill that loads |
|---|---|
| "Text every new Zillow lead within a minute" | mk-speed-to-lead-email-sms |
| "Draft follow-ups for everyone I haven't talked to in two weeks" | mk-crm-followup-cadence, cs-follow-up-nurture |
| "Turn this listing appointment recording into a proposal" | cx-sales-call-to-proposal, aw-transcript-to-proposal |
| "Write a cold email to expired listings" | ce-four-step-framework, ce-offer-formula, ce-compliant-outbound-guardrails |
| "Build a landing page for the open house that looks like this site" | cc-screenshot-loop-website-design, vc-one-shot-landing-page |
| "Build a client portal with login" | cc-plan-mode-full-stack-build, vc-supabase-full-stack-stack |
| "Make 50 ad variants for this listing" | mk-procedural-ad-generator, mk-ai-image-ad-templates |
| "Audit AIRE for security before I show anyone" | vc-security-audit, ma-security-audit-loop, cca-security-80-20 |
| "Claude keeps making the same mistake" | aa-self-modifying-claude-md, cc-claude-md-project-brain |
| "Give me every angle on why listings aren't getting showings" | aa-stochastic-consensus, cca-model-chat-debate |
| "Run this every morning at 6" | aw-scheduled-deploy, mk-prompt-skill-loop-routine-ladder |
| "Scrape 50 investors in Baton Rouge into a sheet" | cs-lead-scraper-to-sheet, aa-tiered-model-cost-routing |
| "I want a buyer app for my clients" | ma-five-step-app-design-framework, ma-expo-workspace-setup |
| "This is costing too much in tokens" | aa-tiered-model-cost-routing, cc-context-and-token-management |
| "Should I automate this or keep it human" | mk-automate-or-keep-human, aw-human-in-the-loop-safety |

Every skill has the same sections: what Nick teaches, step by step, templates and prompts, pitfalls, how Caleb should use this, and verification. Anything that sends a message, publishes, spends money or deletes is marked "needs Caleb's approval before running" inside the skill.

## Where to start

1. Read `claude-code-marketing/COURSE-NOTES.md` and `cold-email-course/COURSE-NOTES.md`. Those two are the closest to a REALTOR's daily money.
2. Run `cc-claude-md-project-brain` once to put a global CLAUDE.md on your machine with your identity, voice rules and the no-send-without-approval rule.
3. Build `mk-speed-to-lead-email-sms` as a dry run first. It is the single highest-ROI build in the whole course for an agent.
4. Then `mk-crm-followup-cadence`, then `cx-sales-call-to-proposal`.

## Caveats, labeled

- **Source-reported:** Prices, plan tiers, model names and tool limits are recorded as Nick said them in the videos and may have changed.
- **Inference:** Where Nick showed a prompt on screen without reading it aloud, the skill reconstructs it and says so.
- **Deliberately left out:** Intro and outro chapters, Maker School pitches, button-by-button UI tours that change monthly, and the gray hat outreach tactics (rented accounts, cold SMS emulation). Those are described as things to recognize, paired with lawful alternatives, not as procedures.
- **Not verified:** Whether the Skool classroom contains material beyond the YouTube courses.

## Files

- `skills/nick-saraev/README.md`: index of all 145 skills by course.
- `skills/nick-saraev/<course>/COURSE-NOTES.md`: thesis, every chapter summarized, skill table, top 5 takeaways.
- `skills/nick-saraev/<course>/<skill>/SKILL.md`: the skills.
- `.claude/skills/`: links that make them auto-load.
- `CLAUDE.md`: repo brain pointing at the index.
