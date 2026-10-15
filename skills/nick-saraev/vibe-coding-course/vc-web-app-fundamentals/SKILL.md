---
name: vc-web-app-fundamentals
description: Explains the 80/20 of how modern web apps work in Nick Saraev's plain-English mental models (client is your browser, server does the logic, database is a Google Sheet with a primary key, SQL vs NoSQL, HTML/CSS/JavaScript and why frameworks like Next.js matter, local to staging to production, and GitHub version control as "essay_final_v3.docx" solved). Use when Caleb asks "what's the difference between the front end and back end", "what is a database really", "SQL or NoSQL for AIRE", "why does it say works on my machine", "what is GitHub for", "should I use a framework", or needs a non-engineer explanation before making an architecture decision.
---

# Web app fundamentals for vibe coders

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 20-29 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=7909s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=8456s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=8913s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=9540s)

## What Nick teaches

"If you know even 10% more than the average vibe coder" you can build a starter kit with your preferred stack and get close to one-shotting apps. Not a CS degree, just the Lego blocks.

### Hosting and the client / server / database triangle
- **Hosting** is running your web app on a server. "Works on my machine is the scariest thing a developer could say." Devs who treat deployment as an afterthought hit a long tail of problems with a slower feedback loop.
- **Client** = your browser. Replace the word client with "your browser" and everything makes sense. It is for presentation.
- **Server** = your computer when developing locally, or a rented machine in the cloud (Hostinger, Bluehost, Cloudways, SiteGround, or serverless on Netlify/Vercel). It does the heavy lifting, logic and validation. This is why server-side validation matters.
- **Database** = a big Google Sheet. Columns like `id`, `date_created`, `value`. The server asks it for rows and returns them to the browser.
- The loop: browser requests a page > server returns HTML and cached data > user clicks "dashboard" > server runs its pre-built logic > queries the DB (usually SQL) > validates > returns data > browser renders. Creating an order is the same loop in reverse.
- Hosts charge a multiple of their electricity and hardware cost. VPS, dedicated servers, partitioned servers, it is not worth going deep.

### Local, staging, production
Run client and server on your own machine, test, push to a **staging** server (intermediate), test, then and only then push to **production** (what customers use). Never make live changes directly on production, one change can take the whole app down. With GitHub and branches, several people can work across these layers at once.

### Databases
- Every table has a **header row** (column names, also called keys) and records (rows).
- Every table needs a **primary key**, one column that is always unique (usually `id`). If two rows share an ID, a query for that ID returns both and your logic breaks.
- Querying is just filtering, exactly like Data > Create a filter in Google Sheets, automated.
- **SQL** databases (MySQL, PostgreSQL which is most popular and what Supabase uses, SQLite) fix the column headers. Every record has the same structure, fields other than the primary key can be empty but you cannot invent new ones per row.
- **NoSQL** (MongoDB, Cassandra) lets every record carry its own structure, like a Google Drive folder of different documents. Look up "relational vs non-relational" if you want more. Nick uses SQL for almost everything.

### Languages and frameworks
- **HTML** is structure (the first website ever, `info.cern.ch`, is pure HTML with body, h1, links, p tags). **CSS** is style (change font-size to 300px in DevTools and watch it grow). **JavaScript** is interactivity (`document.querySelector('h1').remove()` in the console deletes the heading).
- There are a million ways to combine them, so the internet standardized into **frameworks**: Next.js (most popular, full-stack, opinionated folder structure, components, hooks, routes, middleware), Vite, Vue/Nuxt. Frameworks are built on frameworks (Next on React, Nuxt on Vue). "We stand on the shoulders of giants."
- Why it matters for AI: frameworks are in the training data, so models produce "significantly higher quality results" with them. They trade a bit of bloat for speed, stability, reliability and security. Without them you get "slop", apps that interact with the internet in stupid ways.
- You do not need to read the docs. You need to recognize the blocks.

### Version control and GitHub
- The essay problem: `essay.docx`, `essay_with_feedback.docx`, `essay2.docx`, `essay_final_super_final_important.docx`. Now imagine that with an app and 20 collaborators.
- Version control stores the file plus every change between versions. You can jump to any point, branch off, and merge branches back.
- **GitHub** standardizes a project folder into a **repository**. Nick's work log repo shows 346 commits, every change viewable and restorable. Everyone gets a profile, most open source lives there.
- Practical payoffs: a saved copy off your machine, sharing, and Netlify/Vercel can pull straight from the repo and auto-rebuild on every push (that is how local/staging/production pipelines get built). Agents can manage all of it.
- The future he describes: thousands of parallel agents scanning a repo and making micro-edits in an interpretable, accountable way.

## Step by step

When Caleb asks a "how does this work" question, answer with the matching mental model above, then map it to the AIRE component in question:
1. Identify which layer the question is about (browser, server, database, hosting, version control).
2. Give the Google Sheet / your-browser / essay analogy.
3. State the default choice Nick uses (Next.js, Supabase/Postgres, Netlify, GitHub) and why it is safe for AI-generated code.
4. Name the one risk that layer carries (validation on the server, primary keys unique, RLS on the DB, never edit production live).

## Templates / prompts

Ask-the-agent prompt for an architecture decision:
```
Explain in plain English, using a Google Sheet analogy, whether [feature]
should live in the browser, on the server, or in the database, and whether
SQL or NoSQL fits. Then recommend the simplest option using Next.js,
Supabase (Postgres) and Netlify. Call out the one security risk.
```

Default stack card to keep in `GEMINI.md`:
```
Stack: Next.js (App Router) + Tailwind, Supabase (Postgres, Auth, RLS),
Netlify (serverless functions + hosting), GitHub repo linked to Netlify
for auto-deploys. Local JSON first, then Supabase. Auth last. Never edit
production directly.
```

## Pitfalls Nick calls out

- Treating deployment as an afterthought creates the "last mile" where 0.1% of the work takes 100x longer.
- Duplicate primary keys silently break queries.
- Skipping frameworks produces unpredictable, insecure code that no one can hand off.
- Not using a repo until late is fine solo (Nick did it), but link GitHub before anyone else touches the project or before you want auto-deploys.

## How Caleb should use this

- When AIRE grows past one app, keep the triangle in mind: the browser (client portal) never talks to Supabase with the secret key, the server (Netlify functions) does.
- Lead and client records are SQL-shaped (same fields every row), so Postgres on Supabase is the right default, not a document store.
- Put every AIRE app in a private GitHub repo linked to Netlify so a bad change can be rolled back and listings sites rebuild on push.
- Use the analogies when explaining AIRE to KW teammates or a developer you might hire later.

## Verification

- Caleb can say in one sentence what the browser, server and database each do for a given feature.
- Every table in the schema has a unique `id` primary key.
- The project has a GitHub repo and the host shows "deploys from GitHub" rather than manual uploads.
