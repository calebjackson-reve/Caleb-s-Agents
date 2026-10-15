---
name: vc-app-planning-spec
description: Turns a rough app idea into a build-ready spec the way Nick Saraev does it: sketch the page map in Excalidraw (landing, auth, config/onboarding, the core action page, history/orders), screenshot it, have Claude Code expand it into a written spec.md with tech stack, schema, pricing and feature sections, then feed the spec plus a Dribbble screenshot plus a competitor's copy to Gemini to build. Use when Caleb says "I have an idea for an app", "help me plan the AIRE buyer portal", "what pages does this need", "write a spec for this", "turn my sketch into a build prompt", or before kicking off any new SaaS-style build so the first mile of the build heads in the right direction.
---

# From idea to spec: planning an app before you vibe code it

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 31-33, 44-45 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=10380s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=10611s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=17299s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=17772s)

## What Nick teaches

For the lead-gen app and for Splinter, Nick stopped diving straight into prompts and spent a few minutes planning first. His trajectory analogy: a boat leaving South America for Africa. One degree off at the port lands you 100 km from the target. "The direction you pick even in the first kilometer is really important for the final placement of the app." So he stays close for the first few minutes of any big build, then lets it run.

### Step 1: sketch the page map (Excalidraw)
He draws boxes for every page. The standard SaaS inventory:
- **Landing page**: navbar, main value proposition, social proof, how it works, case studies, CTA, footer.
- **Login / signup** (Supabase auth form: email, password).
- **Configuration / onboarding**: where users enter their own API keys (Apify, Anthropic, OpenAI, AnyMailFinder), edit the prompts the AI uses, with defaults and one-click guides. "I want that to be the onboarding."
- **Core action page** (scrape leads, generate thumbnail, new syndication): a form with basic parameters.
- **Orders / history page** listing every run, plus individual order pages with details.
Then he screenshots the sketch. "A real UX designer would crucify me, but it works."

### Step 2: have Claude turn the sketch into a description
Paste the screenshot into Claude Code: "Hey, I'm making an app that helps people scrape leads. Turn this into a brief description of an app that includes all the important components." He then adds details ("here's some scrapers I want you to wrap around") and gets back a plain-text build prompt.

For Splinter he voice-dumped the whole concept and asked for a **spec**: "a high-level description or overview of what this app would look like." The spec sections Claude produced: tech stack, app architecture, database schema, landing page and marketing site, pricing and Stripe integration, authentication and signup flow, onboarding flow, the core engine (content syndication), dashboard, content library, AI configuration and voice model, scheduling and calendar, analytics and reporting, settings and account management, API and webhook architecture, direct platform publishing, and future stubs (AI video). Stack: Next.js 15, Tailwind + shadcn/ui, Supabase Realtime, zod validation ("because I asked it to be as secure as possible on the first shot"). Pricing suggestion: $19/month or $190/year (two months free). He then **pruned** the spec: dropped the calendar and platform connections for v1, kept tone-of-voice configuration, saved it as `splinter_spec.md`.

### Step 3: assemble the build prompt for Gemini
New folder, Gemini planning mode. Paste in order:
1. A **Dribbble screenshot** of the dashboard style (if Dribbble blocks the copy, screenshot the rendered page).
2. A **competitor or category page's copy** (he Googled "cold email lead scraping", grabbed a page describing it): "This is an example of the sort of thing we're about to build, so it has context and can write my landing page for me."
3. The **spec / description**: "I'd like to build an application. I want it designed according to the screenshot I sent over. The specifications and the stack are in the middle. I've also given you a description of another website that does something similar that I'd like you to emulate for the copywriting and content."
He did not force a framework that time (it chose Vite) because "whatever works is going to work."

### Step 4: landing page first when it is the hard part
For Splinter he had Gemini build only the WebGL hero (using a 16-year-old creator Leon's "elite award-winning creative developer" single-file prompt) before the rest of the app, because he did not trust one agent to do both the heavy 3D front end and the app. Then: "Excellent work. I'd now like you to build the rest of the app as detailed in splinter_spec.md... along the way document each update in an updates.md file." And a correction on the first plan: "Initialize in the same folder as root, hero.html will be our landing page." Catching that early saved a rebuild.

### Step 5: pause and reflect in the first minutes
Watch for: too many pages, over-complication, a fundamental misunderstanding of the user, wrong folder, errors from rate limits or packages fighting the terminal. "I'm going to be around for the first couple minutes for a build that's this comprehensive."

## Step by step

1. Open Excalidraw (or paper). Draw one box per page using the five-page inventory above. Add the data each page needs. Screenshot.
2. Claude Code: paste the screenshot, voice-dump the idea, ask for a brief description or a full spec.md with the section list above. Ask it to make it "as secure as possible on the first shot" (zod, RLS, middleware).
3. Prune to v1. Delete sections you will not build now. Save as `<app>_spec.md` in the project folder.
4. Grab a Dribbble screenshot and a competitor page's copy.
5. New Gemini chat, planning mode: screenshot + competitor copy + spec + the assembly prompt. Add "document each update in updates.md."
6. Stay for the first five minutes. Correct folder, framework or misunderstanding immediately.
7. Then let it run and move to `vc-design-loop`.

## Templates / prompts

Sketch-to-description:
```
I'm making an app that helps [users] [outcome]. Here's a screenshot of my
page sketch. Turn this into a brief description of an app that includes
all the important components, pages and data each page needs. Keep it in
plain language I can paste into another model.
```

Spec request:
```
Write a spec for this app with these sections: tech stack, app
architecture, database schema, landing page, pricing and Stripe,
auth and signup flow, onboarding, [core engine], dashboard, history/library,
AI configuration, settings/account, API and webhooks, future stubs.
Stack: Next.js, Tailwind + shadcn/ui, Supabase, Netlify. Make it as secure
as possible on the first shot (zod validation, RLS, middleware).
Save as [app]_spec.md.
```

Build assembly prompt (Gemini):
```
[screenshot of dashboard inspiration]
[pasted competitor page copy]
This is an example of the sort of thing we're about to build.

[pasted spec]
I'd like to build this application. Design it according to the screenshot.
The specifications and stack are above. Emulate the competitor copy for
the landing page content. Document each update in updates.md so we have a
history of tracked changes. Build it so it works locally with JSON files
as a stand-in for the DB; we'll do Supabase later.
```

## Pitfalls Nick calls out

- Skipping the sketch means the model guesses the page list and you redo it.
- Specs balloon. Prune before building.
- Dribbble blocks copying images. Screenshot the rendered page.
- The agent may initialize in a subfolder or pick a different framework. Fix in the first minute.
- Heavy front-end effects and app logic in one shot is too much. Split them.

## How Caleb should use this

- AIRE buyer portal: sketch landing, login, onboarding (price range, areas, lender), saved homes, tour requests, history. Spec it before building.
- Seller dashboard: landing, login, onboarding (property details, photos), showings and feedback, marketing stats, documents.
- Use a real-estate SaaS page (showing scheduler, CRM) as the competitor copy so the landing page speaks REALTOR language.
- Keep every spec in the repo as `<app>_spec.md` so a future model or a hired developer can pick it up.

## Verification

- A `<app>_spec.md` exists with the section list and a pruned v1 scope.
- The first implementation plan from Gemini lists only pages that are in the spec.
- The build initialized in the intended folder with the intended landing page file.
- `updates.md` is being appended as the build proceeds.
