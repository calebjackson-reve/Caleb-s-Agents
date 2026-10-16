---
name: cc-plan-mode-full-stack-build
description: Builds a complete app (front end, login, database, payments, live deploy) using Claude Code plan mode the way Nick Saraev built his PandaDoc-style proposal generator: voice-dump a spec, answer Claude's clarifying questions, approve the plan, hand over Supabase and Stripe keys, test page by page, deploy to Netlify. Use when Caleb says "build me an app", "I want a portal for my clients", "build an AIRE dashboard with login", "something like DocuSign for my listing agreements", or any build bigger than a single page.
---

# Plan Mode for Full Stack Builds

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 13 through 18 (plan mode section at https://www.youtube.com/watch?v=QoQBzR1NIqI&t=3313s, deploy and safety at https://www.youtube.com/watch?v=QoQBzR1NIqI&t=7520s and https://www.youtube.com/watch?v=QoQBzR1NIqI&t=7670s)

## What Nick teaches

Plan mode is read-only exploration. Claude researches on the web, reads your files, reasons from first principles, and writes a plan document for you to approve before any file changes. Nick uses it for anything more complicated than a simple design.

His math: "A minute of planning saves ten minutes of building."

- Scenario one, build without a plan: 15 minutes building, 5 testing, you discover the approach is wrong, rebuild 15, repeat. 35 minutes plus wasted tokens.
- Scenario two, build with a plan: 5 minutes planning, Claude realizes mid-plan that an approach will not work and fixes it in the plan, 5 more minutes, then a cleaner 5 to 15 minute build. You save around 20 minutes and a lot of tokens, because Claude is not exploring ten approaches during the build. Fix the blueprint, not the Lego tower.

The build he does live, a proposal generation platform like PandaDoc or DocuSign:

1. Voice-dumps the whole wish list into a text tab in plain language, no technical terms: generate end-to-end proposals from a template, static page with a URL to send to the client, client can sign and pay, login screen for his team, a couple of templates.
2. Opens a new empty folder (`proposal-generator-app`), switches the mode to plan mode, pastes the dump.
3. Claude asks clarifying questions through a little GUI (front end framework, how legally robust e-signatures need to be, fixed or variable prices, which database). He answers "whatever is best", picks the simplest option, variable, Supabase for everything, Tailwind plus shadcn UI.
4. Claude asks for the proposal template. He drops his PDF into the workspace and says: "Great, it's in proposal-template.pdf. Use a simple clean design, Apple-esque. Follow the template design for the generated page, make everything else Apple-esque."
5. Claude hands the planning to a subagent (the Task tool), researches PandaDoc, and produces a comprehensive plan: tech stack, proposal sections, database schema, routes, user flow. Nick reads the user flow parts and ignores the rest.
6. Approves the plan ("auto accept"), then switches to bypass permissions so it can build without asking every five seconds.
7. While it builds, he sets up accounts in parallel: Supabase (new project, copy the API keys) and Stripe (test mode, create sandbox, copy publishable and secret keys). He pastes the keys into the chat. Pressing Enter while Claude is working queues the message for when it finishes.
8. Claude asks for what is missing: Supabase project URL, Anthropic API key, run an SQL migration (paste the SQL into the Supabase SQL editor and click Run, "Success, no rows returned" is correct), Stripe webhook secret.
9. "Let's test this locally." Opens the localhost URL and walks page by page: sign up, email confirmation (turned off in Supabase settings), dashboard, create proposal, generate, view, sign, pay in the Stripe sandbox, confetti page, proposals list, public URL in a logged-out tab.
10. Gives UX feedback in batches as he goes: friendlier error message, a progress indicator on generate because a spinner alone is poor UX, column widths, images into `public/images`, consistent container width, calendar link instead of "we'll be in touch".
11. Deploy: asks Claude to create the GitHub repo and push ("just ask the agent to do it, it tells you which parts it can't"). Netlify: Add new site, import existing project, build settings auto-fill, deploy, then Site settings, Environment variables, import from `.env.local`. Register the Stripe webhook endpoint pointing at the live URL. Fix deploy errors by pasting them back to Claude.

Total: about 15 to 20 minutes of his attention, with cooking in between. He also notes that in bypass mode Claude will sometimes enter plan mode on its own for a complicated build.

Safety section ("Uncle Ben time"):

- Do not put a vibe-coded app on an obvious short URL. Scanners hit every DNS range and simple URL. Thirty or forty strangers had hit his app within minutes.
- Do not charge money or collect user credentials and payments without having a developer review at least the authentication and front end once. Pay someone a few hundred dollars. The software is not the moat.
- He personally only uses these apps internally with his team and clients, never sold on the open internet.

## Step by step

1. Voice-dump the spec: what it does, who logs in, what the client sees, what it generates, what gets paid. Plain language.
2. New empty folder, plan mode, paste the dump.
3. Answer the clarifying questions. Default to "whatever is best", simplest option, Supabase for everything unless Caleb has a reason.
4. Drop any template (PDF, sample agreement, brand assets) into the folder and reference it by filename.
5. Read the plan's user flow and feature list. Approve.
6. Switch to bypass (or accept edits). While it builds, open Supabase and Stripe (test mode sandbox), collect keys, paste them in. Enter queues the message.
7. Run any SQL migration it gives you in the Supabase SQL editor.
8. Test locally page by page. Batch feedback.
9. Ask Claude to create the repo, push, and walk you through Netlify. Import env vars from `.env.local`. Register webhooks against the live URL.
10. Before anyone outside Caleb's team touches it: non-obvious URL, developer security review, and Caleb's approval.

## Templates / prompts

Spec dump skeleton (Caleb version):

```text
My goal today is to build a client portal for my real estate transactions. I want it to have almost everything a tool like Dotloop might have except the form builder. I want to log in, create a transaction from a template, generate a clean summary page with a URL I can send to the buyer or seller, let them e-sign a simple acknowledgment, and show them next steps and a link to book a call. Keep the design simple and clean, Apple-esque. Keller Williams First Choice branding on every page. Use Supabase for login and data. Deploy on Netlify when we're done.
```

Local test feedback batch:

```text
Looks good. If the user's email isn't confirmed, don't show a red error, tell them to check their email. After clicking Generate, show status updates so I know it's working and not hanging. Constrain the content to one consistent width and center it. Change "we'll be in touch" to a direct calendar link: [link].
```

Deploy prompt:

```text
Create the GitHub repo, push the code, and tell me exactly which steps you can't do yourself. Then walk me through Netlify: import the project, environment variables from .env.local, and the Stripe webhook URL.
```

## Pitfalls Nick calls out

- Skipping the plan on a multi-part build. You rebuild the Lego tower.
- Staying in plan mode after approval. Switch to bypass or it keeps asking.
- Posting API keys on screen (he deleted his right after). Keep keys in `.env.local`, never in CLAUDE.md.
- A spinner with no status. Users think it is broken.
- Short obvious URLs and charging money on an unreviewed app.
- Email confirmation flows that silently do not send. Test the first signup yourself.

## How Caleb should use this

- Client transaction portal: login, transaction summary page, e-sign acknowledgment, next steps, booking link. Internal and client use only.
- AIRE dashboard with login for Caleb and a future assistant: lead pipeline, follow-up queue, listing status.
- Open house sign-in app with a Supabase backend feeding the CRM.
- Anything collecting client names, emails or payments: non-obvious URL, developer review, and Caleb's approval before it goes live or charges anyone.
- Stripe should stay in test mode until Caleb explicitly approves live payments.

## Verification

- A written plan exists and lists the user flow, pages and data model before any code is written.
- Local test passes every page in the flow, including a logged-out view of any public URL.
- Live Netlify URL works, env vars are set, and the Stripe sandbox payment completes end to end.
- No secrets appear in CLAUDE.md or committed files (`git grep -i "sk_"` returns nothing).
