---
name: vc-rules-and-workflows
description: Configures Antigravity rules (always-on GEMINI.md style guides and workspace rules under .agent/rules), reusable workflows (slash-command SOPs like a code-review or security pass), @-mention context attachment, and when to bother with MCP servers. Use when Caleb says "make the model always design in this style", "I keep repeating the same instructions", "set up a rule for AIRE", "create a /security-review workflow", "how do I reference a file without pasting it", or asks whether to connect an MCP server for Supabase, Stripe or GitHub.
---

# Rules, workflows, @-context and MCP in Antigravity

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 5-7 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=700s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=914s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=972s)

## What Nick teaches

Under the agent chat's options menu (top right) Antigravity has **Customizations** (rules and workflows) and **MCP servers**. These are the three ways to steer the model without repeating yourself.

### Rules
- Rules are high-level instructions that guide the model's behavior. They can be **global** (every conversation on your machine) or **workspace** (only this folder).
- Nick's own workspace rule is a long "cinematic landing page builder" style guide: "Your role is to act as a world-class senior creative technologist and lead front-end engineer. You build high-fidelity, cinematic, 1:1 pixel-perfect landing pages..." He credits his above-average vibe-coded quality to putting a lot of style-guide detail in rules so the model makes small decisions on its own instead of asking him.
- Rule names must use hyphens, no spaces (for example `design-guide`).
- **Activation modes**: Always on, Manual, Model decision, Glob (applies to files matching a pattern). Nick: "In practice I never use glob, model decision or manual. I always use always on."
- Saving a rule creates a file in `.agent/rules/`. To delete a rule, delete that file.
- A file named `GEMINI.md` (capital) at the workspace root is the parent rule. All Gemini models always treat it as a rule. Nick stores his big landing-page prompt in `GEMINI.md` and then just types "build me a website".

### Workflows
- Workflows are "probably nowadays better understood as skills": a defined sequence of steps the agent follows every time. Also global or workspace.
- Example Nick builds live, `code-review`: reference a security practices document, go through each item step by step, make small incremental changes rather than everything at once, then ask the user to test before pushing to production.
- Invoke with `/` in the prompt box. Think of it as a checklist-style SOP, the way a business runs a process.

### @-mentions (adding context)
- Typing `@` lets you attach files, directories, code context items, rules, terminals, previous conversations and MCP servers to the prompt.
- Mentioning `@GEMINI.md` does the same as pasting the whole file, but keeps the prompt window clean.
- Media (screenshots) can be pasted directly. Keep screenshots small, every pixel is tokens.

### MCP servers
- Nick's framing: "workflows that somebody else did for you." Pre-built bundles like Cloud SQL for PostgreSQL, Looker, GitHub, Neon, Stripe let the model talk to a tool in a predictable way (for example translating natural language into SQL).
- He does not use them much in practice and notes there are downsides. His default is to give the agent an API key or CLI (Netlify CLI, Supabase SQL editor) rather than wiring an MCP server.

## Step by step

1. Open Customizations from the agent chat menu.
2. Create a workspace rule named with hyphens, set activation to **Always on**, paste the style guide or behavior you want, save. Confirm it appears under `.agent/rules/`.
3. For the master project brain, create `GEMINI.md` at the workspace root with the role, the Q&A the model should run first, and the quality bar.
4. Create a workflow for any repeatable multi-step process (security audit, code review, deploy checklist). Reference supporting docs inside it with `@`.
5. In prompts, `@`-mention files instead of pasting them.
6. Only add an MCP server when a tool genuinely needs predictable structured calls and you have tested that the plain API-key route is not enough.

## Templates / prompts

Workspace rule (always on), `.agent/rules/design-guide.md`:
```
When you design websites or app screens, stick to a minimalistic, sleek
aesthetic significantly closer to the Apple homepage than anything else.
Use sentence case for headings, borders instead of drop shadows, rounded
squares instead of pills, and modern Google Fonts. Never add pages, buttons
or nav items that do not have a real route behind them.
```

Workflow, `code-review`:
```
This workflow defines a code review process that goes through the code and
maximizes the security of the vibe coded app.
1. Reference @security-audit-prompt.md. It lists high-ROI security practices
   for vibe coded apps.
2. Go through each item step by step.
3. Make small incremental changes to the codebase. Do not do everything
   everywhere all at once.
4. At the end, verify with me by asking me to test it before we push to
   production.
```

GEMINI.md skeleton (see `vc-one-shot-landing-page` for the full landing-page version):
```
# Role
You are a world-class senior creative technologist and lead front-end engineer.

# Before building anything, ask the user:
1. Brand name  2. Core thesis  3. Aesthetic archetype  4. Structural typology
5. Three core pillars  6. Ultimate conversion goal

# Quality bar
...

# Tooling rules
...

# Double-checking protocol
...
```

## Pitfalls Nick calls out

- Rule names with spaces fail. Use hyphens.
- Rules you set apply to every conversation, including ones where you did not want them. A voice message that said nothing of substance still triggered his landing-page Q&A because the rule was always on. Delete rules you are done with.
- MCP servers have downsides he chose not to detail for beginners. Do not reach for them first.

## How Caleb should use this

- Create a global `GEMINI.md` for AIRE: Caleb Jackson, REALTOR with Keller Williams First Choice, St. Francisville and Baton Rouge, brand colors, tone, and a rule that all public pages carry the correct licensing and brokerage language.
- Add a workspace rule for listing landing pages (hero photo, price, beds/baths, neighborhood section, showing request CTA) so every listing site comes out consistent.
- Build a `/pre-launch` workflow: run the security audit, check mobile, confirm the lead form posts to the CRM, then ask Caleb to test before deploy.
- `@`-mention the MLS data export or the client intake form file instead of pasting it into each prompt.

## Verification

- The new rule file exists in `.agent/rules/` and a fresh conversation visibly follows it (for example the model asks your Q&A questions unprompted).
- Typing `/` in the prompt box lists your workflow and running it walks through your steps in order.
- `@filename` resolves to the file (it shows as an attached context chip) rather than being treated as plain text.
