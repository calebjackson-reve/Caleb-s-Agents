---
name: cca-security-80-20
description: Applies Nick Saraev's 80/20 security checklist for Claude Code projects: keep secrets only in .env and never in chat (conversation logs in ~/.claude store everything in plain JSONL), audit dependencies for hallucinated or typosquatted package names, turn on row level security in Supabase, treat any public-facing server as under constant scan, never touch credit card numbers (use Stripe), then run a security audit prompt in a fresh unbiased session and have a different agent implement the fixes. Use when Caleb says "is this safe", "security audit", "before I put AIRE online", "I pasted an API key in chat", "set up Supabase for client data", "someone could hack this", or before any public deploy.
---

# Security: The 80/20 Checklist and the Fresh-Agent Audit

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapter 28 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=9556s)

## What Nick teaches

Everything is hackable, the question is how hackable. Aim to be harder to break into than you are worth, like a locked door plus a fence and a camera. Attack surface grows with your visibility (he went from one login attempt a month to 30 to 40 a day). A few small changes remove about 90% of the downside and there is no reason not to make them.

**1. You leak API keys every time you paste one in chat.** All Claude Code conversations are stored in `~/.claude/` (home folder, hidden) as JSONL files, one line per message, user and assistant turns in plain text. He proved it by asking an odd question ("opinions on Quetzalcoatlus"), then "search ~/.claude for any conversation mentioning it" and getting the transcript word for word. Any key pasted in chat is in there forever. Fix: put secrets in `.env` and reference them. His demo: write the secret into `.env`, then tell Claude "I just inserted a value in .env for a future task. Very important, we do not leak it." Claude replied with rules: never read or display the contents of a .env file, never commit .env to git. A later search of `~/.claude` could not find the value. Also never push `.env` to GitHub, which puts it on the internet. Minimizing the number of places a secret exists matters more than linearly (five copies is more like 500x the risk, in his words).

**2. AI models hallucinate package names.** Claude may install `acorns` or `acorne` instead of `acorn`. Attackers register those typo names on npm (and other package managers) with malware that reads your `.env` and `~/.claude` logs and exfiltrates them. With unlimited-usage API keys that can mean tens of thousands in billing. Fix: audit the dependency list for anything unfamiliar. Ask Claude "are there unfamiliar packages here you don't actively use" or "before you run this the first time, check that every package is legitimate with a verified history."

**3. Row level security on your database.** Supabase did not enable RLS by default at recording. Without it, any signed-up user's public key can read, write and delete every row in the table. His example: Moltbook ("Facebook for AI agents") had no RLS, a security researcher read every agent profile in seconds and created 100,000 fake ones. One button, two seconds. (He personally stores most things as local JSON files these days, which sidesteps this.)

**4. Public-facing servers are scanned constantly.** Any URL or VPS (Hostinger etc.) gets tens of thousands of requests from bot farms probing every port for unpatched vulnerabilities. If you expose an OpenClaw-style agent to the web without understanding firewalls and RLS, you will be hacked. Do not give such agents your SIN or passport. A local Claude instance reached through a vetted connector like Telegram is far lower risk than an open endpoint.

**5. Never touch a credit card number.** If an agent reads one, it lands in the conversation logs, and attackers regex entire disks for 16-digit Visa patterns. Use Stripe, which is PCI compliant and handles it all.

**6. The security audit.** He has a long audit prompt (developed with AI agents reading security blogs, published free in his Vibe Coding course) that scans for secret patterns like `sk_live`, `sk_test`, `sk-`, checks `.gitignore` for `.env` and `.env.local`, supply chain (low-popularity packages), and app-specific risks, then returns an architecture summary and pass/fail findings. Rules for running it:

- Run it in a **brand new session** with no project history, so the auditing agent is not biased by the agent that built the thing.
- Then "fix according to your findings." Takes a few minutes.
- Have a **different** agent (a subagent, or Codex or Gemini) implement the fixes so the implementer is not biased by the audit's over-constrained framing, and finally have Claude review. This is diversification against Claude's own blind spots. Multiple passes across models is the best version.

## Step by step

1. Grep the project for key patterns (`sk_live`, `sk_test`, `sk-`, `AKIA`, `Bearer `). Move every hit to `.env` and rotate any key that was ever pasted in chat.
2. Confirm `.gitignore` includes `.env`, `.env.local`, `.env.*`.
3. Add the `.env` rules to CLAUDE.md.
4. Ask Claude to audit dependencies against the real package registry: exact names, publish history, popularity.
5. If using Supabase or any multi-tenant database, enable RLS on every table and write policies.
6. If anything is public-facing, list open ports and services. Close what is not needed. Prefer vetted connectors over open endpoints.
7. Verify no code path reads or stores card numbers. Use Stripe.
8. Open a fresh session, run the audit prompt, save the report to `active/security/<date>.md`.
9. Open another fresh session or another model, implement the findings.
10. Final review by Claude. Repeat before every public deploy.

## Templates / prompts

Secret handoff:

```
I just inserted {WHAT} into .env for a future task. Very important: we do not leak this value. Never read or display the contents of .env. Never commit .env to git. Reference it by variable name only.
```

CLAUDE.md rules:

```markdown
## Secrets
- All keys live in .env. Never read, print, or echo .env contents. Never commit it.
- If the user pastes a key in chat, tell them to move it to .env and rotate it.
- Never read, store or log credit card numbers. Payments go through Stripe.
```

Dependency check:

```
Before running this project for the first time, review every package in package.json (or requirements.txt). For each, confirm the exact name exists on the registry with a real publish history and meaningful downloads. Flag anything that looks like a misspelling of a popular package or that we don't actively use.
```

Audit kickoff (fresh session, Nick's wording generalized):

```
Apply this security audit to {PROJECT}. Once done, return everything we need to fix. {NOTE: nothing is web accessible yet / this is public at URL}.
```

Audit prompt outline (Nick's full prompt is in his free Vibe Coding course. This is the structure he showed):

```
Produce: 1) architecture summary, 2) findings as PASS / FAIL / N/A with severity.
Check each of the following:
- hardcoded secrets (sk_live, sk_test, sk-, bearer tokens, private keys) in code, configs, scripts and logs
- .gitignore covers .env, .env.local, .env.*
- dependency supply chain (typosquats, low-popularity or unmaintained packages)
- database access controls (RLS, policies, public keys)
- exposed ports and endpoints
- auth and session handling
- input validation and injection
- file and data storage of PII or payment data
- logging of sensitive values
- project-specific risks (ML pipelines, browser automation credentials, etc.)
End with a prioritized fix list.
```

Then:

```
Okay, great. Fix according to your findings.
```

## Pitfalls Nick calls out

- Chat logs are plain text on disk. Treat anything pasted into Claude as written down forever.
- Typosquatted packages are a real, ongoing attack. Unlimited-usage keys make it expensive.
- RLS off means every user can read and delete everyone's data.
- The agent that built the app should not audit it, and the auditor should not implement, bias both ways.
- Short memorable URLs and cheap VPS ranges get scanned hardest.
- He is not anti-agent. Decentralized agents are the future, but most public examples so far leaked keys and cards.

## How Caleb should use this

- AIRE holds client PII (names, phones, addresses, pre-approval amounts). Before AIRE touches the internet, run the fresh-session audit and enable RLS on every Supabase table. Leads must only be readable by Caleb's account.
- Move every CRM, MLS, email and SMS key into `.env` now, and rotate any key that has ever been pasted into a Claude chat.
- Never let AIRE or any skill read a buyer's card for earnest money or application fees. Route payments through Stripe or the title company.
- If AIRE gets a public form or chatbot endpoint, keep it minimal and behind a vetted service, not an open server with the whole workspace behind it.
- Anything that rotates live keys, changes production database policies, or deploys needs Caleb's approval before running. Local grep and audits do not.

## Verification

- Grep for key patterns returns nothing outside `.env`.
- `git check-ignore .env` reports it is ignored, and `git log -p | grep sk_` is empty.
- Dependency audit lists every package as verified.
- Supabase tables all show RLS enabled with policies.
- A fresh-session audit report exists under `active/security/` and its FAIL items have been resolved by a separate agent, then reviewed.
