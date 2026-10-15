---
name: ma-github-checkpoint
description: Pushes an app to GitHub through Claude Code so every AI-made change is version-controlled and can be rolled back, with a README and a properly named repo and folder. Use when Caleb says "back this up", "push to GitHub", "create a repo for this", "the app broke after Claude changed something, can we go back", "rename the project", or finishes an MVP of any AIRE or KW app.
---

# GitHub Checkpoints for AI-Built Apps

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapter 15 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=3639s)

## What Nick teaches

Once the app is at a place you like, two things happen: update CLAUDE.md (see `ma-claude-md-context-hygiene`) and push to GitHub.

### Why GitHub
"A place to store your code on the internet" that also stores every change. "When you have AI doing whatever the heck it wants in your codebase, if you don't have an accountable way to revert back to the previous instance... you can wind up in quite a pickle." You get rollback and a way to share with other developers.

### How Nick does it
1. Create a GitHub account (email, phone, two-factor, "they tend to be pretty secure").
2. In Claude Code: `Great, create a GitHub repo for this, as well as a README, then push.`
3. If not logged in, Claude's `gh` flow opens a browser page to authenticate. Log in and come back.
4. Claude adds itself as a co-author on commits ("it's GitHub, it's Claude, and it's Nick. Nick's doing the heavy lifting").
5. Nick's repo got named `example-project` because that was the folder name. He immediately said: `Rename it to habit-tracker and rename this folder as well.` Then he reopened the renamed folder in the editor (which resets the session).
6. The README still said "example project," so he edited it on GitHub and committed. "A couple of additional prompts and it probably would have done so just fine."

### What this gives you
- The code online, shareable with a team.
- Every change recorded with description and time.
- Rollback at any point when something breaks.
- Later, "deploy" can mean pushing to a live production repo as well as submitting to the stores.

Nick's deploy diagram (chapter 25) treats "push to a live production repository on GitHub" as one form of deployment alongside the App Store.

## Step by step

1. Make sure the folder is named for the app, not "example project" or "test." If not, ask Claude to rename folder and repo first.
2. Prompt: `Create a GitHub repo for this app named [app-name], add a README that explains what it is and how to run it on Chrome and on a phone, then push.`
3. Complete the browser login if asked.
4. Open github.com, find the repo, confirm the files and a recent commit are there.
5. After each milestone (MVP done, database added, AI added, security audit passed): `Commit and push with a message describing what changed.`
6. When something breaks after a change: `The app broke after the last change. Show me the last three commits and roll back to the one before [feature].`

## Templates / prompts

```
Great, create a GitHub repo for this as well as a README, then push.
```

```
Rename the repo to aire-showings and rename this folder as well. Update the README title and description to match.
```

```
Commit and push. Message: "Add Supabase auth and local-first caching, passed phone test."
```

```
Something in the last change broke the Today screen. List recent commits, then revert to the commit before the reminder feature and restart the Chrome server.
```

README outline Claude should produce:

```markdown
# [App name]
One-line purpose.

## Run
- Chrome: npx expo start --web
- Phone: npx expo start (new terminal), scan QR in Expo Go

## Stack
Expo + React Native, Supabase (DB + auth), Claude API via Supabase Edge Functions

## Status
Stage [n] of 5. See CLAUDE.md for architecture.
```

## Pitfalls Nick calls out

- Bad names propagate: folder name becomes repo name becomes README title. Name it right before the first push.
- Reopening a renamed folder resets the Claude session.
- The README is not updated automatically on rename. Ask for it or edit on GitHub.
- Secrets: make sure `.env` is in `.gitignore` before pushing (the security audit later flagged "gitignore coverage: partial"). Never push API keys.
- Nick ran the push through Claude. Per Caleb's rules, this skill describes the prompts. Running git commands on Caleb's repos should be confirmed with him first.

## How Caleb should use this

- One private repo per app: `aire-buyer-app`, `kwfc-open-house`, `seller-dashboard`. Private, because listing and client data structures live in the code.
- Push after each of Nick's stages so a broken Supabase migration can be rolled back to the local-only version in one prompt.
- Add `.env` and any exported client CSVs to `.gitignore` before the first push.
- Creating repos and pushing code is external and should be confirmed by Caleb before running, especially on repos shared with the KW team.

## Verification

- The repo on github.com shows the app's real name, a README, and the latest commit.
- `.env` does not appear in the repo file list.
- A test rollback (`revert to previous commit`) restores a working app in Chrome.
