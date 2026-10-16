---
name: ma-ai-features-edge-functions
description: Adds AI features to a mobile app the way Nick Saraev did for smart coaching nudges and weekly reflections: a Supabase Edge Function on a schedule reads the user's data, calls the Claude API with a prompt, writes the result back to a table, and the app shows it in-app and as a push notification. Covers API key handling in .env, sample-output review before hardcoding, banning em dashes, and simulated toasts. Use when Caleb says "add AI to the app", "send personalized nudges", "weekly summary for my sellers", "analyze a photo in the app", "call Claude from the app", or "where do I put the API key".
---

# AI Features via Supabase Edge Functions and the Claude API

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapters 20-22 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=5170s through https://www.youtube.com/watch?v=BMMcmmnjrM8&t=5532s), plus the CalTracker photo analysis in chapter 27 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=8329s)

## What Nick teaches

### The two features
1. **Smart coaching / nudges**: periodically analyze streak and consistency data and push a short personalized message ("You've nailed sleep for 14 days, but water intake is low. Here's a quick hack.").
2. **Reflection summaries**: weekly or monthly AI-written reports with more context ("most consistent with meditation at 92%, exercise dropped off midweek").

A nudge is a title plus one or two sentences. A reflection is a long retrospective.

### The architecture (Nick's whiteboard, which he also screenshotted into Claude)
Phone runs the app -> on a daily/weekly cadence a **Supabase Edge Function** fires (a serverless function that "turns on for about one second, fires, and turns off," far cheaper than an always-on server) -> the function reads the database (habits, completions, streaks) -> bundles it with a prompt -> sends it to the **Claude API** -> the response is written to a new table (coaching_messages, reflection_summaries) -> returned to the app -> shown in-app and as a push notification. "This is just how all tools and services you integrate within a phone app work: app, server, database, API."

### The build prompt
"I'd like to implement both of these features. Use Claude as the backend and send the request via Supabase. Use pretty smart models, let's use the Sonnet models. You'll also have to update the database and do everything to ensure it works alongside the flow diagram I'm attaching." He attached the screenshot of the diagram. Claude loaded the Supabase skill and Edge Functions docs (tokens went from about 20k to 51k) and created the tables, two edge functions (generate-coaching, generate-reflection), and the app context.

### The API key
Claude asks for an Anthropic API key. Go to the Anthropic console (Nick called it platform.claude.com), create a key (he made a non-expiring one), copy it. You can only view it once. **Do not paste it into the chat.** Put it in `.env` as `ANTHROPIC_API_KEY=...` and save. Reason: Claude stores conversation history locally, so a pasted key ends up in the chat log, the .env, Supabase, and everywhere else. Nick pasted it anyway "because I'm lazy" and tells you not to. Then: "Do everything for me that you can without the API key, then walk me through the API key."

### Make it automatic, not a button
First version had a "Get today's coaching nudge" button. Nick: "I don't just want the user to manually generate the nudges. Come up with an automatic cadence and populate it in the app so every time the user opens it they have coaching. Additionally I want a push notification, so if I'm out and about at 3 p.m. it fires." Result: auto coaching on app open (reuse if a message is under 12 hours old), daily push, weekly and monthly reflections.

### Review sample outputs before hardcoding
With no history the messages were bland, so: "I'd like to test this with simulated history. Go through and send me 10 examples of coaching nudges and then reflections." He read them and adjusted the prompt:
- "Modify the prompt so Claude does not output any em dashes. Em dashes are very typically AI."
- "Add emojis to the titles specifically. I don't want anything else to have emojis."
- "Rerun this but just do it three times so we can see."
- "Come up with a way I can quickly generate or test these" -> dev buttons: simulate 30 days of history, trigger coaching, trigger reflection.
"I always want to see examples of these outputs before I 100% hardcode this into the app and go through the whole testing procedure."

### Simulate the notification in Chrome
Chrome cannot show push, so Claude added a simulated toast (a small notification bar, while a modal is the full-screen version). The first simulated run exposed "edge function returning... function failed," a JWT auth error, caught before the phone loop. Then the phone pass confirmed real pushes, after enabling notifications in iOS settings.

### CalTracker photo analysis (chapter 27)
Same pattern, synchronous: take or choose a photo -> send to the Claude API -> get a title, calories, protein, carbs, fat -> user adjusts -> add to log. Accuracy is roughly plus or minus 10-15%. Errors on first run ("validatePath is not a function", "failed to fetch") were fixed by pasting them in. Nick later shortened AI titles via the prompt. For a shipped app the developer's key sits behind the server and users pay a subscription. The per-user key field was left in only for the demo.

## Step by step

1. Describe each AI feature as: trigger (schedule or user action), inputs (which tables), output shape (title + body, or a full report), where it shows (in-app, push, both).
2. Draw or describe the loop: app -> edge function -> DB read -> Claude API -> DB write -> app -> push. Attach a screenshot if you drew it.
3. Send the build prompt naming Supabase Edge Functions, the Claude model tier, and the new tables.
4. Create the API key in the Anthropic console. Put it in `.env`, never in chat. Tell Claude it is there.
5. Ask for 10 sample outputs with simulated history. Fix tone: no em dashes, emoji only in titles, length rules.
6. Ask for dev buttons to seed history and trigger each function, and a simulated toast in Chrome.
7. Run the function once. Fix any auth/JWT errors.
8. Phone pass: enable notifications, trigger a nudge, schedule one for one minute out.
9. Re-run the security audit (`ma-security-audit-loop`) because you now have a paid API behind user-triggerable actions.

## Templates / prompts

Build prompt:

```
Smart coaching and nudges: periodically analyze each user's [streak/consistency] data in the database and send a short personalized message (title + 1-2 sentences) suggesting what to keep doing and what to adjust.
Reflection summaries: weekly and monthly AI-generated reports with more detail.

Implement both. Use Claude as the backend (Sonnet-class model) called from Supabase Edge Functions on a schedule. Add the tables you need (coaching_messages, reflection_summaries). Show results in-app and as push notifications. Follow the attached flow diagram: app -> edge function -> read DB -> Claude API -> write DB -> app -> push.
Do everything you can without the API key, then walk me through adding the key to .env.
```

`.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Output review:

```
Simulate 30 days of mixed history (some habits 100%, some 50%, some abandoned) and send me 10 example coaching nudges and 3 reflections so I can see the range before we hardcode the prompt.
```

```
This looks great, but modify the prompt so the model never outputs em dashes. Em dashes read as AI. Put one emoji in each nudge title and nowhere else. Keep nudges to a title plus two sentences. Reflections can be long.
```

Cadence and push:

```
Don't make the user press a button. Generate coaching automatically on app open (reuse the last message if it's under 12 hours old), send a daily push at a sensible time, and generate reflections weekly and monthly. Add dev buttons to trigger each one and a simulated toast so I can see it in Chrome.
```

## Pitfalls Nick calls out

- Pasting the API key into chat. Use `.env`.
- Shipping a feature with a manual "generate" button when it should run on a cadence.
- Hardcoding a prompt without reading samples first.
- Em dashes and scattered emojis make AI text obvious.
- Testing AI output on an empty database. Seed history first.
- Edge functions need real auth (JWT). The first simulated run will often fail on that.
- "Expensive operations": an attacker can spam an AI endpoint and burn your tokens. The security audit flags this. Add rate limits.
- API usage costs money per call, separate from the Claude subscription.

## How Caleb should use this

- **Seller weekly reflection**: an edge function reads showings and feedback for each listing and writes a plain-English weekly summary ("4 showings, 2 said the price is high, 1 second showing scheduled"). Shown in the seller app and pushed Friday afternoon. Needs Caleb's approval before any message goes to a real seller.
- **Buyer nudges**: "3 new listings matched your criteria in St. Francisville. You haven't rated last week's showings." Daily cadence, no em dashes, one emoji in the title.
- **Photo intake**: snap a listing's utility bill or a flyer and have Claude extract fields into the CRM record. Same photo -> API -> editable result -> save pattern as CalTracker.
- Keep Caleb's Anthropic key in `.env` and in Supabase secrets only. Every AI call costs money, so rate-limit per user and review the sample outputs with Caleb before cadence is enabled.

## Verification

- Edge functions exist in the Supabase dashboard and run on schedule without errors.
- New rows appear in `coaching_messages` / `reflection_summaries` after a trigger.
- 10 sample outputs reviewed. None contain em dashes. Emojis only in titles.
- Simulated toast shows in Chrome. Real push arrives on the phone.
- `.env` holds the key. The key does not appear in chat history, git, or the app bundle.
