---
name: cca-local-learning-loop
description: Runs Nick Saraev's local system-prompt learning loop on a project (run /init, plan a feature, instantiate it, ask "how could you have done this faster and for fewer tokens", compile the learnings into the project CLAUDE.md, and install a lab-notes meta prompt so Claude logs its own mistakes). Use when Caleb says "init this project", "Claude keeps making the same mistake here", "make this workspace smarter over time", "save that as a preference", "add lab notes to CLAUDE.md", or after finishing any AIRE feature, listing page, or automation build.
---

# The Local Learning Loop: /init, Plan, Build, Compile Learnings

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 4, 5 and 6 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=837s through https://www.youtube.com/watch?v=UPtmKh1vMN8&t=1073s)

## What Nick teaches

Nick uses Claude Code as a general business assistant (reading email, morning summaries, messaging people, designing websites), so "feature" means any task, not just code. His local workflow:

1. **Plan the feature.** Simple ones can be one-shotted without plan mode.
2. **Instantiate.** Claude builds it. Along the way it fails some and succeeds some. Between step 1 and step 2 there is a giant list of learnings.
3. **Compile the learnings** into a high-information-density, low-token form.
4. **Update the local CLAUDE.md.** Next time you plan a feature it already has the benefit of every prior failure.

Each pass around the loop shaves the search space. First feature takes X time, next maybe 0.9X, then 0.8X, until you build with Claude about as fast as you would without it.

**Starting a fresh project:**

- Open the folder, open Claude Code (he uses the Claude Code extension inside Antigravity, but the Claude desktop app works the same).
- Develop on your own for a while first. Do not bake in opinions until you have seen Claude work without a CLAUDE.md.
- Run `/init`. It reads every file in the workspace and produces an optimized CLAUDE.md: build, dev and lint commands, whether a test framework exists, architecture overview, key dependencies and their roles, style conventions.
- The compression matters. His `app.jsx` was 827 words (about 1,100 tokens). The CLAUDE.md summary of it was 22 words, roughly 45x compression. A workspace question that cost 5 to 6 thousand tokens via agentic search (0.9% of context) cost 0.2% once CLAUDE.md held the answer.

**Importing preferences as you go.** Every time Claude does something slightly wrong, say so and have it store the preference. His example: "visualize app" ran the dev server but only gave him a link, so he said "store in your CLAUDE.md that when I ask you to run the dev server or open the app, open it in my Chrome instance as well." Next time it opened automatically.

**The reflection question.** After a task finishes, ask: "How could you have arrived at these conclusions and done everything I just asked you to do faster and for fewer tokens?" In his demo Claude answered that it had made 20 sequential edit calls on a CSS file when it should have read the file, rewritten it in its head, and done a single write. He then said "Yes, save this in the CLAUDE.md as a user preference section."

**The lab-notes meta prompt.** He puts a standing instruction in CLAUDE.md telling Claude to log its own mistakes so a future instance does not repeat them. The section is called "Lab notes: what not to do."

After four or five loops there is enough material to run `/insights` and promote patterns to the global file (see `cca-insights-global-distill`).

## Step by step

1. If the project has no CLAUDE.md, work in it for a session or two first, then run `/init`.
2. Open the generated CLAUDE.md and check it reads as a compressed map: commands, layout, where the main logic lives.
3. Add a `## User preferences` section and a `## Lab notes: what not to do` section at the bottom. Paste the meta prompt below.
4. Plan the feature (use plan mode for anything non-trivial).
5. Let Claude build it. Correct it in the moment when it does something you don't like, and say "store that as a preference in CLAUDE.md."
6. When the build is done, ask the reflection question verbatim.
7. Have Claude write the answer into User preferences or Lab notes as one or two dense bullets. Not a paragraph.
8. Repeat for every feature. After 4 to 5 runs, move to the global loop.

## Templates / prompts

Reflection question (ask after every non-trivial task):

```
Okay, great. Nice job. How could you have arrived at these conclusions and done everything I just asked you to do faster and for fewer tokens?
```

Follow-up to save it:

```
Yes, I'd like you to save this in the CLAUDE.md. Do it as a user preference section.
```

Lab-notes meta prompt (paste into the bottom of the project CLAUDE.md):

```markdown
## Lab notes: what not to do
When you have made a mistake, update this CLAUDE.md with a running log of things not to do next time.
When you have made a mistake, update this CLAUDE.md with a running log of things not to try next time.
Treat this section like an experimenter's notebook: a future Claude instance reads it to know what NOT to do while working on this project.
Keep each entry to one dense line: what was tried, why it failed, what to do instead.

- (entries accumulate here)
```

Preference capture in the moment:

```
Store in your CLAUDE.md that when I ask you to [run the dev server / open the app / send me the report], I want you to [open it in Chrome / also open the file / also post the summary], not just give me the link.
```

Example of a compiled learning (the density Nick wants):

```markdown
## User preferences
- Widespread changes to one file: read it, rewrite in full, one write call. Never 20 sequential edits.
- "Open the app" means run the dev server AND open it in Chrome.
```

## Pitfalls Nick calls out

- Do not write a CLAUDE.md from day one. See how Claude behaves vanilla first, then record only real friction.
- Learnings must be compressed. A paragraph per mistake defeats the purpose, since more context means lower quality and higher cost.
- Agentic search for something CLAUDE.md should already know wastes thousands of tokens every time. Put the answer in the file once.
- The loop is informal in his demo. He suggests you could formalize it as a meta skill, but the habit matters more than the tooling.
- Tool and command names recorded as he said them (`/init`, `/context`, `/insights`). They may have changed.

## How Caleb should use this

- Run `/init` on the AIRE repo and on any client or listing-marketing project folder. Check that the generated file names the dashboard command, the lead data source, and where skills live.
- After every AIRE feature (a new follow-up sequence, a CMA generator, an open house sign-in flow), ask the reflection question and store the answer. Over a few weeks Claude will stop repeating the same CRM field mistakes or formatting slips.
- Capture preferences in the moment: "when I say draft a listing description, always pull the property facts from the MLS sheet first and write in my voice."
- Keep lab notes for brokerage-specific gotchas: a Keller Williams tool that needs a specific export format, a Louisiana disclosure that must appear on every listing page.
- Nothing here sends messages or costs money beyond tokens, so no approval gate is needed. Writing to CLAUDE.md is safe.

## Verification

- CLAUDE.md exists in the project root with commands, layout, User preferences and Lab notes sections.
- `/context` in a new session shows a small system prompt share, and a workspace question is answered without file crawling.
- Repeat a task that previously went wrong. Claude should do it the preferred way without being told (for Nick: one write instead of 20 edits, app opened in Chrome automatically).
- Lab notes gain an entry after a real failure without you asking.
