---
name: ma-security-audit-loop
description: Runs Nick Saraev's security audit for vibe-coded mobile apps: in a fresh /clear session paste a comprehensive audit prompt that hunts hallucinated packages, missing server-side validation, open database policies, hard-coded secrets, inconsistent auth middleware, error leaks, and expensive operations, get a severity table with CWE references, fix everything, then re-run in a clean session two or three times. Use when Caleb says "is this app secure", "run a security audit", "before we launch", "someone could leak my API key", "check the Supabase policies", or any AIRE or KW app has a database, auth, or a paid API and is about to go to real users.
---

# The Security Audit Loop for Vibe-Coded Apps

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapters 22-23 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=5532s and https://www.youtube.com/watch?v=BMMcmmnjrM8&t=7179s), repeated in chapter 32 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=10762s) and chapters 33-34 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=11909s)

## What Nick teaches

### Why
"99% of people in our vibe-coded economy are going to skip this because it takes some time and it's not very sexy. It's that 1% that end up with apps that go somewhere." A leak kills reputation and creates liability: user data on the dark web, a leaked API token run up "to millions if not tens of millions of dollars" (providers only loosely reimburse), and regulation if you hold health or financial data. Nick is not a lawyer or security specialist. The goal is the 80/20, eliminating the low-hanging fruit so an attacker "moves on to the next one that's a little less secure." You will never be 100% secure.

### When
Only after the app has passed all three testing tiers (Chrome, mirror, real phone) and is "100% verified ready to launch." It comes after the database and auth stage in the framework, because that is when the app is "technically live, occurring on the internet."

### The prompt
A long audit prompt from Nick's earlier course module "Security for Vibe-Coded Apps." It is a comprehensive list plus output formatting that identifies and solves the major vulnerability patterns for a mobile app:
- hallucinated packages
- missing server-side validation
- default-open database policies
- hard-coded secrets
- inconsistent auth middleware

Output: a table of findings (he saw roughly 50-60 rows) with severity (critical, high, medium, low), category, location, and the CWE (Common Weakness Enumeration, "a list of the common ways people usually get access to apps"), each marked pass, partial, or fail.

### Findings on the habit tracker (first run)
- Hard-coded secrets: pass (key only in .env and Supabase).
- Gitignore coverage: partial.
- Public prefix leaks: pass.
- Console/error information leaks: partial.
- Startup validation: fail.
- Protected API routes: fail ("kind of chunky").
- Expensive operations: fail (an attacker could call the AI endpoint repeatedly to burn Claude tokens).
- Schema validation, unused dependencies: partials.

### The loop
1. `/clear` so the auditor has zero context of the build ("a fresh instance that doesn't have any of the context of our prior conversation").
2. Paste the full audit prompt. Let it run end to end.
3. "Great. Run through and fix all of these errors end to end. After you're done, test and ensure they're 100% solved."
4. `/clear` again. Paste the same audit prompt again. "Sometimes in solving one problem it creates another somewhere else. A future version of Claude can spot issues a past version created." Second run: startup validation went fail -> partial, severities dropped to low, some unchanged (gitignore).
5. "Great work. Fix all things even if they're partial. Once sorted, let me know if the changes produced new vulnerabilities."
6. Pomodoro run: a fix flipped getUser vs getSession from pass to broken. Prompt: "Run through and implement all changes to move any yellows or reds to greens/pass." Then one more run.
7. Two to three passes gets Nick "about 90% satisfied." For hundreds of thousands of users, add a human review team.

Nick also does a general functional QA audit alongside the final security run (chapter 32).

## Step by step

1. Confirm all three test tiers passed and the database/auth stage is done.
2. `/clear`.
3. Paste the audit prompt (the template below reconstructs the categories Nick listed, but use his original from the course asset if Caleb has it).
4. Read the table. Note every fail and partial.
5. Prompt the fix-all, then test.
6. `/clear`, paste the audit again, compare.
7. Fix partials, ask whether fixes created new issues.
8. Third pass if anything is still yellow or red. Stop at all green or low-only.
9. Run the three-tier test one more time (fixes touch auth and routes), then deploy.

## Templates / prompts

Audit prompt (a reconstruction of the categories and output format Nick showed, not his verbatim text):

```
You are performing a security audit of this mobile app (Expo + React Native, Supabase, Claude API via edge functions). Go through the entire repo methodically. For each item below, mark PASS, PARTIAL, or FAIL, give severity (Critical/High/Medium/Low), category, exact file and line, and the CWE id, in one table. Then list the fixes in priority order. Do not fix anything yet.

Check for:
1. Hallucinated or non-existent packages in package.json and imports
2. Hard-coded secrets anywhere in source, config, or committed files
3. .gitignore coverage for .env, keys, build artifacts
4. Public/EXPO_PUBLIC_ prefix leaks of server secrets into the client bundle
5. Console and error-message information leaks
6. Startup validation of required environment variables
7. Missing server-side validation and schema validation on every edge function and API route
8. Default-open or missing Supabase RLS policies, every table scoped to auth.uid()
9. Inconsistent auth middleware, getUser vs getSession usage, unprotected routes
10. Expensive operations an attacker could spam (AI calls, image analysis) without rate limiting or auth
11. Unused or outdated dependencies with known CVEs
12. Insecure storage of tokens on device
13. Anything else you find
```

Fix prompts (Nick's wording):

```
Great. Run through and fix all of these errors end to end. After you're done, test and ensure they're 100% solved.
```

```
Great work. Fix all things even if they're partial. Once sorted, let me know if the changes produced new vulnerabilities.
```

```
Run through and implement all changes to move any yellows or reds to greens/pass.
```

## Pitfalls Nick calls out

- Running the audit in the same session that built the app. Clear first.
- Running it once. Fixes create new holes. Two or three passes minimum.
- Treating "partial" as good enough.
- Expensive AI endpoints without rate limiting are a wallet attack, not just a data leak.
- Skipping automatic RLS at Supabase project creation (see `ma-supabase-database-auth`).
- This is not legal advice and not a substitute for a professional review at scale.
- Nick's exact prompt lives in his course assets. The template above is a faithful reconstruction of what he showed on screen.

## How Caleb should use this

- Mandatory before any AIRE app that holds buyer or seller names, phone numbers, addresses, or showing feedback goes to a real client. Client contact data leaking from a KW First Choice agent's app is a reputation and licensing problem.
- Run it after adding Supabase and again after adding any Claude API feature, since those are the two stages that create the big failure categories (open policies, expensive endpoints).
- Pay special attention to RLS: one seller must never see another seller's feedback, and the KW team role must be explicit.
- Rate-limit any photo-to-CRM or AI summary endpoint so a scraper cannot burn Caleb's Anthropic balance.
- Fixing code is free. If the audit recommends paid services (monitoring, WAF, paid Supabase tier), that needs Caleb's approval.

## Verification

- Audit table from the final pass shows no Critical or High, and no FAIL rows.
- `.env` is gitignored and no secret string appears in the repo or the client bundle.
- Every Supabase table has RLS enabled with policies tied to the authenticated user.
- AI endpoints require auth and have a rate limit. Calling one unauthenticated returns an error.
- The app still passes the three-tier test after the fixes.
