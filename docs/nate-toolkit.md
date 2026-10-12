# Nate Toolkit (10 picks)

Source: Nate Herk, "I Tried 100+ Github Repos for Claude. These 6 Are the Best" (https://www.youtube.com/watch?v=HhZdNYI4pJs). The title says 6, but the video description lists 12 repos and the captions walk through 10 workflows, two of them paired. List captured by the local Codex setup from the video description. Every repo below was confirmed to exist on GitHub on 2026-10-12.

## Where it works

- **Local Claude Code and Codex on Caleb's Mac:** all 10 are installed and tested within a limited scope.
- **Cloud Claude sessions:** these don't inherit Mac installs or logins. `.claude/settings.json` in this repo offers the plugin-based picks when the repo is opened. CLI and MCP picks need their own credentials per environment.
- **Routing:** nothing forces Claude to pick these on every request. Say "Use my Nate toolkit when it fits this task" once per chat.

## The picks

| # | Pick | Repo | Real estate use | Install type | In repo settings |
|---|------|------|-----------------|--------------|------------------|
| 1 | Hyperframes | heygen-com/hyperframes | Short listing and market update videos | Plugin | Yes |
| 2 | Google Workspace CLI | googleworkspace/cli | Read calendar, Drive and Gmail for briefs and deal folders | CLI + OAuth | No, local only (read-only) |
| 3 | Apify MCP | apify/apify-mcp-server | Pull public pages like competitor listings and local news | MCP + API token | No, needs token (usage billed) |
| 4 | Scrollcraft | nateherkai/scroll-craft | Scroll-animated property and AIRE landing pages | Plugin | Yes |
| 5 | Humanizer | blader/humanizer | Strip AI tone from emails, posts and listing copy | Plugin | Yes |
| 6 | Addy Osmani Agent Skills | addyosmani/agent-skills | Planning and engineering discipline for AIRE builds | Plugin | Yes |
| 7 | Expo Skills | expo/skills | AIRE mobile app work | Plugin | Yes |
| 8 | Supabase + Stripe Best Practices | supabase/agent-skills, stripe/ai | AIRE database and payments design | Plugin + skill folder | Supabase yes, Stripe copied manually |
| 9 | Playwright CLI + Claude Security | microsoft/playwright-cli, claude-plugins-official | Test forms and pages, security review before launch | CLI + official plugin | Security yes, Playwright local |
| 10 | OpenSEO | every-app/open-seo | Keyword research like "Zachary homes for sale" | Plugin | Yes |

## Tested vs not tested (from the local Codex run)

Tested within a limited scope: Hyperframes 5-second video, Playwright form submit, Scrollcraft desktop, mobile and reduced-motion, Apify public page fetch, OpenSEO 87 keyword rows, Expo synthetic web app, Postgres tenant isolation, Google read-only metadata.

Not tested: live Stripe payments, production Supabase, native app release, real client workflows, time savings.

## Guardrails

- Google stays read-only. Drafts only, never auto-send.
- No Apify, Stripe or other paid usage without Caleb's approval.
- Client email content follows the Anthropic-only handling rule.
- Keller Williams First Choice branding only.
