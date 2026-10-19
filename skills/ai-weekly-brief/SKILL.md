---
name: ai-weekly-brief
description: Weekly sweep of what changed in AI and the major apps (OpenAI, Anthropic, Google Workspace, Meta, Microsoft, Notion, HubSpot, Zapier, n8n, video models, Realtor.com, Zillow, real estate CRMs), saved as a dated brief with sources, then ranked for what moves Caleb's real estate business and AIRE. Use when Caleb says "what's new in AI", "AI brief", "weekly brief", "what changed this week", "anything new I should use", or when the Monday routine fires.
---

# AI weekly brief

Follow `CLAUDE.md`. Read `aire/STACK.md` first so the ranking knows what Caleb already uses.

## Steps

1. **Window.** Default is the 7 days before today. If Caleb names a window, use that. Read the newest file in `aire/ai-briefs/` so nothing gets repeated.
2. **Search.** Run these searches in one batch, extended mode, with the month and year in the query:
   - AI news this week
   - OpenAI ChatGPT new feature
   - Anthropic Claude announcement
   - Google Gemini Workspace Gmail update
   - Meta Instagram Facebook WhatsApp update
   - Microsoft Copilot update
   - Notion, HubSpot, Zapier, n8n, Canva AI agents
   - AI video generation release (Veo, Kling, Higgsfield)
   - Real estate AI tools (Zillow, Realtor.com, KW Command, Follow Up Boss)
3. **Verify the ones that matter.** For anything that would change STACK.md or touch a client, fetch the vendor page. If it blocks the fetch, keep the item and mark it "secondary".
4. **Write the brief** to `aire/ai-briefs/YYYY-MM-DD.md` using the same sections as `aire/ai-briefs/2026-10-19.md`: frontier models table, Google Workspace, Meta and social, real estate, workflow tools, Unknowns. Every row carries a source. Mark each item Confirmed or Secondary.
5. **Rank for Caleb.** After the brief, a ranked list of at most seven items that move one of the five arenas in `aire/rollout-2026-10/PLAN.md`: website, lead gen, touches, operations, agent offer. One line each: what it is, which arena, what to do about it. Label as inference.
6. **Flag stack changes.** If an item makes a STACK.md line wrong or stale, say so in a "Proposed STACK.md changes" block. Do not edit STACK.md without Caleb's yes.
7. **Report in chat** under Blueprint, Proof, Unknowns, then the ranked list.

## Guardrails

- No unsourced numbers. No dates from memory, only from a fetched or searched source.
- Never post the brief anywhere outside this repo. The Skool version is a separate draft Caleb approves.
- Voice: warm, direct, natural. No em dashes, no semicolons.
