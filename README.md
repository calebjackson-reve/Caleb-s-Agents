# Caleb-s-Agents

All the agents and skills Caleb Jackson has built in Claude. One repo, usable from both Claude Code and claude.ai chat.

## Use from Claude Code (any folder, any machine)

Install once and every skill loads automatically by description match:

```
/plugin marketplace add calebjackson-reve/Caleb-s-Agents
/plugin install caleb-skills --marketplace calebjackson-reve/Caleb-s-Agents
```

Or open this repo as a project. The `.claude/skills/` folder links every skill in, so they load without installing anything.

## Use from claude.ai chat

Chat takes one zip per skill. Ready-made zips for the most useful ones are in `chat-skills/`. Upload them at Settings, Capabilities, Skills. To bundle any other skill:

```
cd skills/nick-saraev/<course> && zip -r <skill-name>.zip <skill-name>
```

## What is here

- `skills/nick-saraev/`: Nick Saraev's free course as 145 skills plus the $25K roadmap. Index in `skills/nick-saraev/README.md`, summary in `skills/nick-saraev/REPORT.md`.
- `skills/brand-consistency/`: audit and fix Caleb's public identity and search visibility.
- `audits/`: dated audit runs.
- `architectural-preview/`, `motion-kit/`, `lp-integration/`: website and Luxury Presence work.
