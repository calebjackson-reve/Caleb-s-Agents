---
name: vc-deploy-to-production
description: Pushes a vibe-coded app live the way Nick Saraev does it, from Netlify drag-and-drop for static sites to agent-driven Netlify CLI deploys for full-stack apps, linking GitHub for auto-rebuilds, fixing the production-only issues that always appear (auth redirect URL, serverless function timeouts, env vars, slower debug loop) and retesting every route live. Use when Caleb says "put this live", "deploy to Netlify", "push to GitHub and deploy", "the signup email points to localhost", "it works locally but not on the live site", "it times out in production", or wants a listing site, client portal or AIRE tool on a real URL.
---

# Deploying vibe-coded apps to production

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 13, 19, 35, 42-43 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=1493s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=4015s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=13001s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=16019s)

## What Nick teaches

Nick uses **Netlify** because it is simple and free for a couple of sites (Vercel is equivalent). Three levels of deploy appear in the course.

### Level 1: static site by drag and drop (chapter 13)
Netlify > Add new project > Deploy manually > drag the project folder (right-click in Antigravity > Reveal in Finder). The Vite site built and went live first try at a random `*.netlify.app` URL. Verify in incognito and on your phone. Custom domain is the only cost.

### Level 2: full-stack app via Netlify CLI, driven by the agent (chapter 19)
Prompt: "build this and push it on Netlify." The agent runs the production build, installs the Netlify CLI (a command-line tool that lets agents talk to the Netlify API), then asks you to authenticate. Open a new terminal tab (Ctrl+Shift+` or Terminal > New Terminal), paste `netlify login`, complete the browser login, tell the agent "done." It creates the site and deploys. Nick put the odds of a one-shot at 50% for Next.js. It worked. Then he immediately tested the interactive parts live and hit the first production-only bug.

### Level 3: GitHub-linked continuous deploys (chapters 29, 35, 45)
"Set up GitHub as well and link the two." The agent initializes the git repo, writes a `.gitignore` (so `.env` and keys never go up), creates the repo (make it private, "I don't want anybody to take my tokens"), pushes, and links it to Netlify so every push rebuilds the site. Antigravity may prompt you to sign in to GitHub the first time. Nick waited until a project was solid before adding GitHub because he was the only collaborator, but says you could do it from step one.

### Production-only problems he hit, and the fixes
1. **Auth confirmation email links to `localhost:3000`.** Supabase > Authentication > URL Configuration > Site URL = the live URL, no trailing slash. No rebuild needed. Same idea for LinkedIn OAuth: update the authorized redirect URI from localhost to the live domain.
2. **Serverless timeouts.** The thumbnail generation took 22 to 26 seconds and returned "an unexpected error occurred" live even though it worked locally. His diagnosis: hosts like Netlify cap function time around 15 to 20 seconds (number may have changed). Fix by moving long work to background processing, polling, or splitting the request.
3. **Env vars and permissions** differ between your machine and the server. Expect to adjust DB settings and permissions.
4. **Slower loop.** Local: "rebuild it" and refresh. Production: change locally, push, wait for Netlify's free-tier build, then test online. Batch your changes.
5. **Webhooks need a live URL.** Nick deliberately deferred Stripe on Splinter until the app was deployed because Stripe callbacks want a public URL. Webhook deliveries to a URL you set earlier will silently fail if the domain changed.
6. **Middleware tightening after the security audit** hid animations, icons and even login routes. Retest after security fixes.
7. **Profile fields not saving** in production (company name). Standard "screenshot + describe" fix.
8. The agent sometimes names the site oddly (`splinter-app.netlify.app`, `thumbly-g.netlify.app`). Rename in Netlify if you care.

### Post-deploy checklist Nick runs
Sign up with a fresh email > confirm email lands on the live domain > sign in > core action writes to the DB > settings save and persist after refresh > search works > log out returns to login with nothing prefilled > visit every protected route logged out (`/dashboard`, `/orders`, `/orders/new`, `/settings`, `/notifications`) and confirm redirects > narrow the window for mobile > then run the security audit.

## Step by step

1. Static page with no backend: drag-and-drop on Netlify. Done.
2. App: tell the agent "push this to Netlify, use the Netlify CLI." Run `netlify login` in a new terminal when asked, reply "done."
3. Say "set up GitHub as well and link the two, private repo." Confirm `.gitignore` includes `.env`.
4. Set the Supabase Site URL (and any OAuth redirect URIs, Stripe webhook URL) to the live domain.
5. Run the post-deploy checklist above on the live site, not localhost.
6. Batch fixes, push, wait for the build, retest.
7. Run `vc-security-audit`, then retest once more.

## Templates / prompts

Deploy prompt:
```
We've finished local and database testing. Push this to production on
Netlify using the Netlify CLI. Tell me when you need me to run
`netlify login` in a terminal. After the deploy is live, list every route I
should test and anything I need to change in Supabase or Stripe for the
live URL.
```

GitHub link prompt:
```
Set up GitHub as well and link the two. Private repo. Make sure .env and
any credentials are in .gitignore before the first push. Then connect the
repo to Netlify so pushes auto-deploy.
```

Production bug report pattern:
```
On the live site at https://<site>.netlify.app, [action] returned
[exact error text]. It worked locally. The URL in the email/redirect was
[paste]. What's different in production and what do I change?
```

Timeout prompt:
```
Generation takes 22 to 26 seconds and the live site errors at the end,
locally it works. I think we're hitting the serverless function timeout.
Restructure so the request returns immediately and the client polls for
the result, or move the work to a background function.
```

## Pitfalls Nick calls out

- "There's a 50% chance we one-shot this." Plan for a round trip or two.
- Do not push `.env`. Confirm `.gitignore` before the first push.
- Keep repos private when they reference your tokens or business logic.
- Free-tier builds are slow. Do not deploy one tiny change at a time.
- Manual deploys lose the version-control safety net. Link GitHub before sharing the app.

## How Caleb should use this

- Listing landing pages: drag-and-drop, then optionally a custom subdomain like `123mainst.calebjackson.org` (domain costs money, needs Caleb's approval).
- AIRE client portal and lead CRM: CLI deploy plus private GitHub repo linked to Netlify so every fix auto-publishes.
- After any deploy, Caleb (or Claude with his approval) runs the post-deploy checklist with a throwaway email before telling a client the link.
- Any deploy that makes client data or Caleb's API keys reachable on the internet: needs Caleb's approval before running.

## Verification

- `https://<site>.netlify.app` loads in incognito and on a phone.
- Netlify project shows "Deploys from GitHub" with the latest commit.
- Signup email links to the live domain. Protected routes redirect when logged out.
- Core long-running action completes live without a timeout error.
