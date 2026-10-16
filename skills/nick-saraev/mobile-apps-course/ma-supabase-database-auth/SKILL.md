---
name: ma-supabase-database-auth
description: Moves an Expo app from on-device storage to a Supabase Postgres database with email/password auth and local-first caching, using Nick Saraev's hand-off flow (create project, enable automatic RLS, paste URL/key/connection string/CLI commands into Claude, supabase login in a separate terminal, disable email confirmation, verify tables). Use when Caleb says "add a database", "add login", "users need their own data", "sync this across devices", "set up Supabase", or when an AIRE or KW app needs data that outlives the phone it was entered on.
---

# Supabase Database, Auth, and Local-First Caching

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapters 16-19 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=3905s through https://www.youtube.com/watch?v=BMMcmmnjrM8&t=4398s), repeated in chapter 31 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=10566s) and chapter 33 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=11909s)

## What Nick teaches

### Why
Local storage means the data lives on one device. To let other people use the app and to have the phone and computer see the same data, you need a database ("your hard drive, hosted elsewhere"). Nick's first database took him two and a half weeks of SQL fiddling. Now "we can do so in literally like 30 seconds."

### The architecture
App <-> device (local cache) <-> Supabase (cloud DB). Adding the database alone is not enough: the DB must tie records to a specific user, so a login screen is added too. Supabase handles both the database and the auth. Keep the local layer: "local on-device caching allows your data to load instantly," then sync periodically. Nick's stack is "rather opinionated" but he uses it because he knows it. Apply the same idea to any provider.

### The prompt
"I'd like to add a database to this project. In addition to a database I also want local caching so the user has a very immediate and snappy experience. We're going to be using Supabase. We'll also need user authentication so you know which user is accessing which data. Help me through this."

Claude proposed: Supabase auth (email/password and OAuth), Postgres tables for habits, completions, challenges (plus profiles), AsyncStorage kept as the immediate read layer with background sync, and the onboarding gate replaced by a sign-up/sign-in screen. It asked which auth method. Nick: "I don't yet have Supabase set up but I'll do that now. Let's go with email and password. Work on everything you can up until that point." He parallelizes: Claude codes while he creates the project.

### Creating the Supabase project
1. supabase.com, free account, Start a project, pick an org.
2. Project name (habit-tracker-app, cal-tracker, pomodoro-app). Database password: make it long or use the generated one and copy it.
3. Region close to your users ("the further away, the more lag"). Nick got Oregon.
4. Enable the Data API / automatically expose new tables.
5. **Enable automatic RLS.** "That's pretty important." In chapter 31: "one of the lowest hanging fruit security upgrades... so many vibe-coded apps had gotten totally leaked that they just decided to add that."
6. Wait until the dashboard shows database, PostgREST, auth, realtime, storage, and edge functions all healthy.

### Hand everything to Claude
Copy from the dashboard and paste into Claude in one message: project URL, publishable key, direct connection string, and the CLI setup commands. "This is giving it literally everything it needs to manage as much of this process on its own as it can." Claude installs the Supabase CLI and applies the schema through the SQL editor.

### supabase login
Claude cannot complete the interactive login in its own terminal ("can't do it within your non-TTY environment"). Open a normal terminal, run `supabase login`, open the link it gives you, copy the verification code back into the terminal. Tell Claude: "Okay, logged in." Auth is shared across terminals on the machine, so Claude proceeds.

### Disable email confirmation
Supabase dashboard, Authentication, providers/email: set Confirm email to off. Otherwise every new user must click an email link before logging in.

### What the schema looked like
Habit tracker: `challenges` (id, user_id, name, habit_ids, start_date, duration, is_complete, reward_claimed), `completions` (date, count, habit_id, user_id), `habits` (name, emoji, type, reminder_enabled, reminder_hour, reminder_minute), `profiles` (onboarding_complete). Pomodoro: `sessions`, `trees`, `user_stats`. Claude derives these "based on what is logical." Every table carries user_id so RLS can scope it.

### Verifying it is live
- Authentication > Users: your signup appears with a UID, provider = email. You can also add a user manually, auto-confirm them, and hand them credentials if someone cannot sign up.
- Table Editor > habits: rows per user_id. Delete a habit in the app, refresh, the row is gone. Flip `reminder_enabled` to true in the table, refresh the app, the toggle is on. "This is 100% live."

### After the database
Run the full three-tier test again ("we've fundamentally changed the way the app works"). Expect onboarding flicker and toggles that wait a second on the DB. Ask for the cache to answer first. Then add a forgot-password flow (Nick forgot his own password within minutes).

## Step by step

1. Only after the local app passes a phone test. Changing schema later "takes a lot of time, energy, and deprecates old data."
2. Send the database + caching + auth prompt. Answer "email and password" (OAuth later). Tell Claude to proceed while you set up Supabase.
3. Create the project with automatic RLS on. Wait for all services healthy.
4. Paste URL, publishable key, direct connection string, CLI commands into Claude.
5. Run `supabase login` in your own terminal when Claude asks. Tell it "logged in."
6. Turn off Confirm email in the dashboard.
7. Sign up in the Chrome build. Check Users and Table Editor.
8. Run the three-tier test again. Fix flicker and slow toggles with cache-first reads.
9. Ask for forgot-password. Update CLAUDE.md. Push to GitHub.

## Templates / prompts

```
I'd like to add a database to this project. In addition to a database I also want local caching so the user has a very immediate and snappy experience when they use the app. We're using Supabase. We'll also need user authentication so you know which user is accessing which data. Help me through this.
```

```
I don't yet have Supabase set up, but I'll do that now. Let's go with email and password. Work on everything you can up until that point.
```

```
Okay, I have the Supabase project ready to go. Here is everything:
Project URL: https://xxxx.supabase.co
Publishable key: sb_publishable_xxxx
Direct connection string: postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
CLI setup commands: [paste from dashboard]
Set up the schema, RLS policies, and the client, then tell me what you need from me.
```

```
Logged in. Continue.
```

```
Great, let's test the full flow. Open in Chrome. I'll sign up, onboard, create data, then check the Supabase tables.
```

```
Now that we're on the database, the reminder toggle takes a second to appear and onboarding flickers on reload. Read from the local cache first, then sync from Supabase in the background. Also implement a forgot-password feature.
```

## Pitfalls Nick calls out

- Adding the database before the design is settled means re-migrating the schema every design change.
- Forgetting automatic RLS. Default-open database policies are one of the top vibe-coded leaks.
- Claude cannot do the interactive `supabase login`. Do it in your terminal.
- Email confirmation left on blocks test signups.
- Database region far from users adds lag.
- The schema Claude generates is logical, but review field names and types before testing.
- Supabase UI labels and the automatic RLS toggle are as shown in the video and may have moved.

## How Caleb should use this

- AIRE buyer and seller apps need per-user data (showings, feedback, saved homes), so this is the stage where each client gets their own login. RLS keeps one seller from seeing another seller's feedback.
- Tables Caleb will likely want: `profiles`, `properties`, `showings`, `feedback`, `tasks`, each with `user_id` (and an `agent_id` for Caleb and the KW team later).
- Use the Supabase dashboard as the admin panel: add a client manually and auto-confirm them when they struggle with signup.
- Keep local caching so the app is snappy on rural LTE around St. Francisville.
- Supabase has a free tier. A paid plan or custom domain needs Caleb's approval. Storing real client data also means enabling confirm-email again before any public launch.

## Verification

- All six Supabase services show healthy.
- Signup in the app creates a row in Authentication > Users.
- Creating, editing, and deleting records in the app changes rows in Table Editor within a refresh.
- Editing a row in the dashboard shows up in the app after refresh.
- The app still opens instantly from cache with the network off, then syncs when back online.
- Phone test passes again after the migration.
