# Agents

Each file is a self-contained spec: purpose, inputs, tools, steps, output, approval gate and KPI. They are written to be pasted into a Claude project or run as scheduled Claude Code sessions. All agents read `../brand/voice-and-visual-rules.md` first and none of them publishes, sends, spends or changes an account without Caleb's approval.

| Agent | Cadence | Approval gate |
|---|---|---|
| daily-brief | Every weekday 6:45 am Central | None, read only |
| lead-response | On every inbound lead | Caleb sends, until he removes the gate |
| database-nurture | Daily touches, monthly email | Caleb approves each send |
| review-engine | After each closing, monthly past-client pass | Caleb sends each request |
| content-engine | Weekly, after Monday recording | Metricool review queue |
| market-receipt | Monthly, first business day | Caleb approves page and email |
| listing-launch | On every new listing | Caleb approves the package |
| ai-visibility-baseline | Monthly | None, read only |
