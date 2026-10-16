---
name: vc-security-audit
description: Runs Nick Saraev's 80/20 security pass on a vibe-coded app, checking the five things that cause most breaches (exposed env vars and API keys, missing Supabase row level security, no server-side validation, hallucinated or outdated packages, missing auth middleware) using a security-audit prompt fed to a fresh-context model in audit-only mode, then fixing the failed items. Use when Caleb says "is this app secure", "run a security audit", "check for leaked API keys", "before I launch the client dashboard", "did it turn on RLS", "make sure logged-out users can't hit the AIRE routes", or any time an app with auth, a database or paid API calls is about to go public.
---

# The 80/20 security audit for vibe-coded apps

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 14-15, 36, 44 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=2658s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=13289s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=17299s)

## What Nick teaches

"Everything on planet Earth is hackable, it's just a question of how hackable." The goal is to make your app harder to break into than it is worth, like a fence and a camera rather than a vault. Nick cites a popular open-source project (OpenClaw, formerly Claudebot) that leaked around 25,000 API keys and ran up users' API bills because of exactly these gaps.

**80% of security problems in vibe-coded apps come from five things:**

1. **Exposed environment variables and API keys.** Agents hardcode tokens into front-end code. Anyone can right-click > Inspect and Cmd+F for `NEXT_PUBLIC_`, `key`, `secret`. It is a sticky note with your password on the monitor. Fix: keep every credential in `.env`, reference by import, add `.gitignore` so `.env` never goes to a repo, and tell the model "look in .env for all keys."
2. **Missing or broken Row Level Security (RLS) on Supabase.** Without RLS, anyone with your Supabase URL and the anon key (public by design) can read, write and delete every row. Nick: 83% of exposed Supabase databases involved RLS misconfiguration. RLS says user A only sees user A's data. "It's basically just a button. Click enable." Newer Supabase projects offer automatic RLS at creation.
3. **No server-side validation.** If validation (email exists, password rules, math, credits) runs in the browser, an attacker can read the logic, change it in DevTools, and script a million signups or enumerate passwords. Fix: every check runs on the server, which is password-gated. Ask: "Is anything here not being server-side validated? Make it server-side validated."
4. **Outdated or hallucinated packages.** Models invent package names (`acorns` instead of `acorn`). Attackers publish malware under those names (slopsquatting) that exfiltrates your keys on install. Models also pull old versions with patched vulnerabilities. Fix: verify every dependency exists, use the official SDK (he caught a hallucinated Anthropic package and replaced it with `@anthropic-ai/sdk`), and ask for the most updated packages.
5. **Missing authentication middleware.** Try `/dashboard`, `/orders`, `/settings` while logged out. If they render instead of bouncing to `/login`, people can use your paid API routes with your keys. Fix: middleware secures all routes, default-deny.

**How to run it.** Nick wrote one big "security audit prompt" (in the video description) that walks through all of this as a checklist. He pastes it as a post-build step, like the code-review workflow, with the instruction "don't make any changes, I just want the audit." The model does a discovery pass (maps the full architecture), then goes through every checklist item and reports pass / warn / fail with a summary table at the bottom. Then he says "fix the X that failed" or "excellent, execute all of the changes."

Key practice: **run the audit in a model with no context from the build.** On the client dashboard he built in Gemini and audited in Claude Code so the reviewer sees the code "as if it's somebody else's." Reasons: unbiased peer review, Claude's thinking is more interpretable, and he thinks Claude is a bit better at security. On the lead scraper he was out of Claude budget so he ran it in Gemini, which also worked.

What audits actually found in the course:
- Static site: no `.gitignore`, four high-severity vulnerabilities in a dev dependency (minimatch). Fixed in one pass.
- Client dashboard: console.log statements leaking Supabase insert error details (changed to a generic "failed to create order"), no startup env validation, no default-deny routing. Fixes added allow-list routing, client-side user-ID filtering, server-side validation, an auth callback route, env validation. Two yellow warnings remained (a dev dependency, built-in rate limiting) which he accepted.
- Lead scraper: **critical** auth bypass on paid API routes (if not authenticated it skipped the check and used fallback server keys, so anyone with curl could run Apify and Anthropic jobs on his bill), a hallucinated Anthropic package, missing `WITH CHECK` clauses on RLS policies. Score around 70%. Fixed by installing input validation libraries and closing the bypass.
- Thumbnail app: rate limiting, auth middleware, Stripe webhook secret verification, a `WITH CHECK` migration on the database.

## Step by step

1. Finish the build and deploy first. Security is the last step before real users.
2. Open a **fresh** chat in the model that did not build the app (Claude Code if Gemini built it, or vice versa). Use the smartest model available.
3. Paste the security audit prompt plus: `Don't make any changes. I just want the audit.`
4. Read the summary checklist. Expect pass / warn / fail per item. Warnings on things the model cannot see (RLS lives in Supabase, not the repo) are fine if you verified them yourself.
5. Reply: `Execute all of the remaining changes. Make sure the app still works.` Mention anything already handled: `RLS is already enabled, mark the SQL items green.`
6. Run any SQL migrations it gives you (RLS policies, `WITH CHECK`) in the Supabase SQL editor.
7. Retest the whole app. Middleware changes can hide assets, icons or routes (it happened to Nick). Walk every route logged in and logged out.
8. Budget 15 to 20 minutes and some tokens. Do it anyway.

## Templates / prompts

Security audit prompt skeleton (adapt and save as `security-audit-prompt.md`, reference it from a `/security-review` workflow):
```
You are a senior application security engineer reviewing a vibe-coded web
app you did not write. Don't make any changes. I just want the audit.

PASS 1 - DISCOVERY
Map the full architecture: framework, routes/pages, API endpoints or
serverless functions, auth mechanism, database and schema, third-party APIs,
env variables used, package.json dependencies.

PASS 2 - CHECKLIST (report PASS / WARN / FAIL with file and line for each)
1. Secrets: no hardcoded keys, tokens or passwords anywhere in the codebase.
   No secrets in NEXT_PUBLIC_ / VITE_ prefixed vars. .env exists and is in
   .gitignore. Startup validation fails loudly if a required env var is
   missing. No console.log of credentials, stack traces or DB error details.
2. Row Level Security: every Supabase table has RLS enabled with policies
   that scope SELECT/INSERT/UPDATE/DELETE to auth.uid(). INSERT/UPDATE
   policies include WITH CHECK. No SECURITY DEFINER functions without review.
   The service role key is never shipped to the client.
3. Server-side validation: every form, API route and function validates
   inputs on the server (schema validation such as zod). Business logic
   (credits, pricing, ownership) is enforced server-side, never trusted from
   the client. No raw SQL built from user input.
4. Dependencies: every package in package.json exists on npm and is the
   official SDK for the service. Flag hallucinated or typo names. Flag
   outdated versions with known vulnerabilities (run the audit tool).
   Flag unused dev dependencies shipped to production.
5. Auth middleware: default-deny. Every non-public route redirects
   unauthenticated users to /login. Every API route checks the session
   before doing anything expensive or touching user data. No fallback that
   uses server keys when the user is missing.
6. Extras: rate limiting on expensive endpoints, webhook signature
   verification (Stripe), CORS restricted, no open redirects.

PASS 3 - SUMMARY
A table of all items with status, then a prioritized fix list
(critical / high / medium / low). Ask me which to execute.
```

Follow-up:
```
Excellent. Execute all of the remaining changes and change the SQL checklist
items to green (RLS is already enabled in Supabase). Make sure the app still
works, then tell me what to retest.
```

## Pitfalls Nick calls out

- Nobody actually does this because it takes time and tokens. That is why vibe coding has a bad name. Do it.
- Dribbble-style demo apps that let users bring their own API keys dodge the billing risk. Apps that use *your* keys (thumbnail generator, AIRE calling Claude) must have auth on every paid route.
- Debug-friendly error messages the builder model wrote (full Supabase error objects) leak your infrastructure. Replace with generic messages.
- After middleware tightening, check that public assets and the login/signup routes themselves are still reachable.
- This is an 80/20 pass. Before scaling to many users or holding sensitive data, hire a real security engineer.

## How Caleb should use this

- Mandatory before any AIRE surface goes live that touches client data (buyer/seller contact info, lead notes, transaction details). Real-estate client data is sensitive, so treat RLS as non-negotiable.
- Any AIRE feature that calls Claude, an email sender or a scraper on Caleb's keys must have default-deny middleware or someone will run up his bill.
- Build a `/security-review` workflow in Antigravity that loads `security-audit-prompt.md` and runs in Claude Code with no build context.
- Executing fixes that change database policies or redeploy the app: needs Caleb's approval before running.

## Verification

- Audit output contains a discovery summary, a per-item PASS/WARN/FAIL table, and a prioritized fix list.
- After fixes: `.env` is gitignored, `grep -r "sk-\|NEXT_PUBLIC_.*KEY" src/` returns nothing, Supabase table settings show RLS enabled with policies, `/dashboard` while logged out redirects to `/login`, `curl` against a paid API route without a session returns 401.
- The app still works end to end (sign up, sign in, core action, log out).
