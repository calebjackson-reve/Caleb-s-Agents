---
name: vc-supabase-full-stack-stack
description: Wires a locally working vibe-coded app to the standard stack Nick Saraev uses (Next.js or Vite front end, Supabase for database and auth, Netlify serverless backend): create the project at database.new, hand the agent the project ID, URL, publishable key, secret key and DB password via .env, run the generated SQL migration in the Supabase SQL editor, enable RLS, wire login and signup, set the auth site URL, and verify middleware on every route. Use when Caleb says "connect this to Supabase", "move from JSON to a real database", "add login to the AIRE dashboard", "the signup email goes to localhost", "give me the SQL schema", "turn off confirm email", or asks what stack to use for a client portal.
---

# Supabase + Next.js + Netlify: the common vibe coding stack

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 19, 34, 42 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=4015s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=10933s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=16019s)

## What Nick teaches

The usual suspects: **Next.js** for the front end (a full-stack framework that bundles HTML, CSS and JavaScript in an opinionated, predictable way), **Supabase** for the database and auth ("think of it as a big Google Sheet with tables and columns" plus a login system), and a **serverless backend** (Netlify Functions in his case, Vercel also works). Frameworks matter in the AI age because they are standardized, heavily represented in training data, and give consistent results with less supervision. Vite came up on one build and he did not care: "whatever works is going to work."

### Connecting Supabase (the client dashboard build)
1. Ask the model: "The current design looks great. What I want to do next is ensure it works not only locally but with Supabase as our database. Walk me through everything I need to do." It returns a checklist: create a Supabase project, set up the Supabase client, create the schema, enforce RLS, replace local hooks.
2. Go to **database.new** (Supabase owns the domain). New account: supabase.com > Start your project. Name the project, generate a database password (copy it immediately), enable the Data API, create.
3. Collect and paste to the agent (or into `.env`): the **DB password**, **project ID** (Project Settings), **project URL** (`https://<project-id>.supabase.co`), the **publishable / anon key** (Project Settings > API keys, create a publishable key), and for server-side work the **secret / service role key**. Nick's words: "I'm just coming up with these names myself, the model can understand the context."
4. The agent edits `.env`, generates a **SQL migration** (tables, foreign keys, RLS policies), and wires signup/login forms to Supabase Auth.
5. Paste the SQL into Supabase **SQL editor** and Run (Cmd+Enter). Comments with `--` are fine, `##` comments break it. Check **Database > Tables** to see the result (for example `scrape_jobs`, `user_configs`, `thumbnails`, `users` with `credits`, `stripe_customer_id`, `subscription_id`).
6. Test signup. Supabase sends a confirmation email by default. For speed during dev, go to **Authentication > Sign In / Providers > Email** and turn off **Confirm email**. Nick: "I was spending as much time signing up as doing everything else."
7. Test the core write and read. First try often fails ("I created a new task but it didn't appear"). Prompt: "It may be an issue with adding to the database or pulling from the database. If there's a table problem let me know." Also check the dashboard chart reflects real DB data and add a logout button.
8. **Middleware check**: logged out, visit every route by URL (`/dashboard`, `/orders`, `/orders/new`, `/settings`, `/notifications`). Each must bounce to login.
9. After deploy, the confirmation email will link to `localhost:3000`. Fix in Supabase **Authentication > URL Configuration > Site URL** with the live URL, no trailing slash. No rebuild needed.
10. Free plan allowed two projects at recording time. Nick deleted old ones to make room.

### Local first, then database
Nick always prototypes with JSON files or local storage as a stand-in for the DB ("build this so it works locally using JSON files as a stand-in for the DB, later we'll do the actual Supabase setup"). Migrating later is one prompt plus a migration script. On the thumbnail app the model also needed a second migration for email/password auth because the first login page only asked for an email.

### Performance note
After the payment fix the thumbnail app fetched from the DB on every page load and got laggy. The fix is to cache on sign-in and refetch only on mutation. "Ideally when you sign in it pulls all the data and caches it, and only changes when you materially change the database."

### Supabase CLI
When the agent wanted him to install the Supabase CLI via Homebrew to run a migration, he just pasted the SQL into the editor himself to save tokens and time.

## Step by step

1. Confirm the app works locally with JSON or local storage. Checkpoint context to `GEMINI.md`.
2. Prompt: "Walk me through everything I need to do to make this work with Supabase."
3. database.new > create project > copy password, project ID, URL, publishable key, secret key into `.env` with clear names.
4. Tell the agent the keys are in `.env`. Let it write the migration and wire auth.
5. Supabase SQL editor > paste > Run. Verify tables. Confirm RLS shows enabled on each table.
6. Turn off Confirm email during dev (turn it back on for production if you want verified emails).
7. Sign up, sign in, do the core action, check the row in Supabase, log out.
8. Test every route logged out.
9. After deploy, set Site URL to the live domain.

## Templates / prompts

`.env` layout:
```
SUPABASE_DB_PASSWORD=...
SUPABASE_PROJECT_ID=abcdefghijklmnop
SUPABASE_PROJECT_NAME=aire-client-portal
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...          # server only, never shipped to client
ANTHROPIC_API_KEY=sk-ant-...
```

Migration prompt:
```
Great. Set up Supabase and auth. I've added the DB password, project ID,
URL, publishable key and secret key to .env. Give me a single SQL migration
file I can paste into the Supabase SQL editor with all tables we currently
store locally (configuration, prompts, API integrations, orders/history),
RLS enabled on every table with policies scoped to auth.uid() including
WITH CHECK, then replace the local JSON hooks with Supabase calls, wire
login/signup/logout, and add auth middleware on every signed-in route.
Tell me what to paste and where.
```

Debug prompt when writes do not show:
```
I created a new [record] using the [button], but when I went back to the
list it wasn't there. Double check why. It may be an issue with adding to
the database or pulling from it. If there's a table or RLS problem, tell me
what to run. Also make sure the chart reflects the real data in the
database, and add a way to log out.
```

## Pitfalls Nick calls out

- The model cannot create the Supabase project for you. You do steps 2 and 3.
- `##` comments break the SQL editor, `--` comments are fine.
- Signup confirmation links go to localhost until you set the Site URL.
- Fake assignees and placeholder avatars linger after migration. Ask to remove them.
- Logout is often missing. Ask for it.
- Fetch-on-every-load lag after auth or payment wiring. Ask for caching and mutation-based refetch.
- RLS is the single most important toggle. See `vc-security-audit`.

## How Caleb should use this

- AIRE client portal: tables for `clients`, `properties`, `showings`, `feedback`, `documents`, with RLS so a seller only sees their own listing data.
- Lead follow-up CRM: `leads`, `touches`, `tasks` tables, auth for Caleb and any ISA on the KW team.
- Keep Supabase projects named per app (`aire-leads-db`, `aire-portal-db`) and track the free-plan project limit.
- Creating Supabase projects or turning email confirmation off on a live app: needs Caleb's approval before running.

## Verification

- Supabase Database > Tables shows the expected tables, each with RLS enabled.
- Sign up creates a row in Authentication > Users, and the core action creates a row in the matching table.
- Every signed-in route redirects to login when logged out.
- After deploy, the confirmation email links to the live domain, not localhost.
