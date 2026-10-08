# Agents

Each file is a self-contained spec: purpose, inputs, tools, steps, output, approval gate and KPI. They are written to be pasted into a Claude project or run as scheduled Claude Code sessions. All agents read `../brand/voice-and-visual-rules.md` first, log leads and touches in KW Command, and none of them publishes, sends, spends or changes an account without Caleb's approval.

| Agent | Cadence | Approval gate |
|---|---|---|
| daily-brief | Every weekday 6:45 am Central | None, read only |
| lead-response | On every inbound lead | Caleb sends, until he removes the gate |
| database-nurture | Daily touches, monthly email | Caleb approves each send |
| review-engine | After each closing, monthly past-client pass | Caleb sends each request |
| content-engine | Weekly, after Monday recording | Metricool drafts (review queue needs a plan upgrade) |
| market-receipt | Monthly, first business day | Caleb approves page and email |
| listing-launch | On every new listing | Caleb approves the package |
| ai-visibility-baseline | Monthly | None, read only |

## How these agents reuse the AIRE skills

The twelve skills in `skills/` (pull request 1) already solve the reasoning parts. These agents are the marketing and operating layer around them, not replacements.

| Agent | Reuses |
|---|---|
| daily-brief | `daily-executive-planning` produces the plan for the day. The brief adds the marketing items: leads without a reply, drafts awaiting approval, comments and reviews, the scorecard. |
| lead-response | `conversation-drafting` writes the reply in Caleb's voice from bounded context. `conversation-actions` extracts the appointment, deadline and follow-up. The agent adds speed-to-lead timing, the booking link and the 14-day cadence. |
| database-nurture | `relationship-strategy` decides who is due a touch and why. `promise-drafting` keeps open promises. `kw-command-import` stages contact changes for KW Command as the official two-row CSV, with upload as Caleb's explicit action. |
| review-engine | The guided review page in pull request 6 (`review-helper/index.html`) is the link sent with each request. |
| content-engine, market-receipt, listing-launch | No AIRE equivalent. These are new. |
| ai-visibility-baseline | The research packet's `csv/ai-prompt-library.csv`, `csv/ai-run-log.csv` and rerun protocol in `06-ai-visibility.md` (pull request 4). |

KW Command has no confirmed API path from Claude. The observed path is the `kw-command-import` CSV staging pattern, so every agent that "logs to KW Command" stages a CSV batch and Caleb uploads it.
