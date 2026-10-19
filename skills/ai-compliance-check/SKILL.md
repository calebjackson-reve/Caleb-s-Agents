---
name: ai-compliance-check
description: Checks any client-facing or public draft (email, text, social post, listing remarks, website copy, video, chatbot reply, market stat) against Louisiana Real Estate Commission advertising rules, fair housing, TCPA texting rules, AI disclosure norms and Caleb's brokerage identity before Caleb sees it. Use on every outbound draft, and when Caleb says "is this compliant", "can I send this", "check this before it goes out", "AI disclosure", "fair housing check".
---

# AI compliance check

Run on every consumer-facing draft before it reaches Caleb. Output is a pass or a list of fixes, with the corrected draft. This skill does not send anything.

## The checklist

**Identity (confirmed rules from the global CLAUDE.md)**
- Caleb Jackson and Keller Williams First Choice appear on the piece. Office 17111 Commerce Centre Drive, Prairieville, LA 70769 where an address belongs.
- Louisiana license number, when shown, is 995709547. Any other number is a fail.
- No Rêve or Crystal Bonin branding, fonts, colors, emails or addresses.
- Sender identity is real: Caleb's email aire@calebjackson.org, Caleb's number (225) 747-0303.

**Louisiana advertising and fair housing (confirmed rules)**
- No price, value, timing or outcome guarantees. "I'll pull real comps" is fine. "Your home will sell in 30 days" fails.
- Fair housing language only. No words that describe who should live somewhere (families, young professionals, churches nearby as a selling point, "safe neighborhood", "exclusive"). Describe the property and the place, not the people.
- Production claims carry the date. Current line: 81 closed deals, $25.1M since 2022, as of October 7, 2026. Update from Caleb only.

**Texting and email (confirmed rules)**
- Texts only to people who gave their number on a form or in conversation. No cold texts. STOP opt-out on every automated text.
- Every automated email has an opt-out line.
- After-hours automated messages promise a morning call, not a call "in a few minutes".

**Numbers (repo rule)**
- Every market stat shows source and date. A number with no source is removed or marked "[needs source]".

**AI disclosure (inference from October 2026 platform and regulator moves, see aire/ai-briefs/2026-10-19.md)**
- AI-generated or AI-altered video and images are labeled as such on the platform and in the caption. Never AI-generated or altered listing photos. Virtual staging is disclosed in the caption and MLS remarks.
- Any chatbot or auto-reply identifies as automated on first contact and hands off to Caleb for price, offers, contracts or anything legal.
- Nothing claims an AI said a property is worth a number. Valuations come from Caleb's comps.

**Brokerage policy (unknown)**
- If KW First Choice publishes an AI use policy, it goes in this section and wins over inference. Until then, the approval gate is the policy: AI drafts, Caleb approves, Caleb sends.

## Output format

```
Compliance: PASS | FIX
Fixes (if any): one line each, naming the rule above
Corrected draft: full text
```

## Guardrails

- Never send, post, schedule or publish. This skill ends when the corrected draft is shown.
- Voice stays Caleb's: warm, direct, natural. Fixes should not make the copy sound legal.
- When a rule is unclear, say "unknown, ask the broker" instead of guessing.
