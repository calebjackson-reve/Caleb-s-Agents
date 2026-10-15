---
name: vc-design-loop
description: Applies Nick Saraev's vibe coding design loop for building a full-stack SaaS app: inspiration screenshot from Dribbble or Godly, optional animated hero asset, main functionality first, local testing with JSON data, then database, then auth last, then deploy, end-to-end test and landing page, with Opus planning the build and Gemini doing the design work from screenshots. Use when Caleb says "build me a client dashboard", "I want an app that does X", "what order should I build this in", "make it look like this screenshot", "redesign the AIRE dashboard", "the design looks basic", or is starting any multi-page app for buyers, sellers, investors or his KW team.
---

# The vibe coding design loop (inspiration to shipped app)

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 17-19, 33, 40-41 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=3758s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=3821s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=4015s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=14389s)

## What Nick teaches

Nick builds every app the same way. The order matters because it saves time on design and security later.

### The loop
1. **Inspiration design.** Go to Dribbble or Godly (sites that compile high-quality designs). Search "client dashboard", "landing page", "web app". Screenshot the ones you like. "Why would I worry about coming up with padding and color schemes myself when I could borrow somebody else's?" He was a paid designer and still says it is not worth learning.
2. **Animate (optional).** Generate a hero image with Nano Banana and rotate it with Veo so your page stands out from other AI-built pages. Costs a little money. See `vc-ai-assets-nano-banana-veo`.
3. **Main functionality.** Dashboard, widgets, pages, forms. This is the bulk.
4. **Local testing and iteration.** On your machine, with no database. Data lives in JSON files as a stand-in.
5. **Database.** Push data to Supabase, test again.
6. **Auth last.** "Doing auth at the end is way better than at the beginning." If you do auth first, middleware only protects the first page you built. At the end the model has all the context to secure every route.
7. **Deploy.** Then end-to-end test again because production differs from local.
8. **Landing page and miscellaneous design.** The landing page has no real functionality so it goes last.
9. Then start the next product at step 1.

### Two-model split for step 3
- **Plan in Claude Code (Opus 4.6, plan mode, fast mode on).** Nick's prompt: "You're a world-class website designer with 15 years of experience designing high quality award-winning websites for Apple and Dribbble. We'd like to build a full stack SaaS client dashboard app for our content writing business. It's very important that you get this right, our career depends on it." (He picked up the "career depends on it" line from a former OpenAI dev, a few percent quality bump.) Then the feature list, the stack (Supabase, Next.js, Tailwind, deploy on Netlify), "I'll define the UX via screenshots so don't worry about design particulars", the phased flow above, and "Think extremely hard and generate a great plan. Once you've developed one that is comprehensive, report back here and I'll supply some screenshots."
- **Skim the plan**, do not read it all. Look for: too many pages, over-complication, fundamental misunderstanding. If the page list is what you would want, approve.
- **Build in Gemini (3.1 Pro High, planning mode).** Paste the whole plan, attach the dashboard screenshot (Cmd+Shift+Ctrl+4 on Mac for a clean region capture), say: "design using this style as inspiration, clean and minimal." Wait 30 seconds to review its plan, then go get a coffee.

### Functionality first, design second, in separate chats
Once the app runs, Nick voice-dumps every functional problem in one message (loading spinners he wants gone, gray-on-gray nav text, clicks that do nothing, a Next.js params error pasted verbatim, "there's a start work button, just to be clear this is a dashboard for a client to look at work being done by the agency, they can't start work"). He keeps screenshots small because pixels cost tokens. He does **not** mix design into that thread: "once you have an app where all the functionality is right, open a new Gemini instance with no context and say here's my app, I just want you to change the design." Mixing both in one long context gets messed up.

### The design upgrade prompt
Find a new Dribbble screenshot (light mode, dark sidebar), paste it, then:
"This is great. I'd now like to change the design significantly. Do the vast majority of your work in Tailwind or whatever stylesheets you're currently using. The design right now is very basic. Add significantly more complexity using things like cool mouseover effects on navbar elements, really high-quality icons, modernize the design significantly, try different, higher quality, cutting-edge fonts from Google Fonts, use placeholder images so the design feels alive, significantly upgrade the graph. I've given you a screenshot from a similar design I like a lot. Mimic more or less everything you see as a start point. Try to really nail the font colors, font styles, encapsulation, border styles, cards."

Second round cleanup: "fonts are the same though, adjust them. Change all major titles from title case to sentence case. Add borders rather than shadows to match. You added buttons we don't need (calendar, reports, portfolio, invite team...). Remove all elements for which we don't have pages. Make the search bar apply to our current list of orders. Update the settings page design. The 'mark all as read' button is almost transparent, fix that."

### Color and font matching
- Screenshot a color, run it through an online color finder to get the hex, then: "update the primary color scheme across the entire application so that it is that shade of baby aqua blue, use slightly darker shades as accents." Supply light, dark and darkest swatches.
- When the designer provides the palette (Jack R on Dribbble listed font Lufga, primary F4E18E, secondaries D6D6D5 and DBDBDB, white E3E3E3, black 043), type the hex codes rather than screenshot them, it is fewer tokens.
- When the model will not match a landing page: "I'll provide you a landing page that I want you to copy verbatim, word for word, to start, then we can modify afterwards."
- Nick's taste rules you can reuse: sentence case, borders over shadows, rounded squares over pills, "remove shadows across the entire UX", widen content to match the hero header width, keep only pages that exist, "simplicity is going to end up being quite the moat."

### Mobile
Gemini mobile-optimizes almost everything out of the box. Still check by narrowing the browser. Tables are notoriously hard on mobile, a horizontal scroll is acceptable. Dashboards may need "make sure the signed-in pages work on mobile displays as well" (he got a bottom nav bar).

## Step by step

1. Collect 1 to 3 Dribbble/Godly screenshots: one for the signed-in dashboard, one for the landing page. Note fonts and hex codes if shown.
2. Plan in Claude Code plan mode with the planner prompt. Skim, approve.
3. New folder in Antigravity, Gemini planning mode. Paste plan + dashboard screenshot + "design using this style as inspiration."
4. Run it. Paste back any startup errors with a screenshot until it renders ("mining for gold").
5. Click every button and route. One voice dump of all functional issues. Repeat until the CRUD works with local JSON.
6. New Gemini chat for the redesign. Paste the new screenshot and the design upgrade prompt. Then the cleanup pass (fonts, case, borders, remove dead buttons).
7. Checkpoint to `GEMINI.md` (see `vc-model-handoff-context-backup`), then move to database, auth, deploy, security, landing page.

## Templates / prompts

Planner prompt (Claude Code, plan mode):
```
You're a world-class website designer with 15 years of experience designing
high quality, award-winning websites for Apple and Dribbble. We'd like to
build [APP] for [BUSINESS]. It's very important that you get this right,
our career depends on it.

As a [user type], we want: [feature 1], [feature 2], [settings/config page],
and anything else your usual SaaS app like this would include.

Stack: Supabase, Next.js, Tailwind CSS, deploy on Netlify. I'll define the
UX via screenshots so don't worry about design particulars.

Flow: 1) build the main functionality using a screenshot inspiration, take
the design style from it for all signed-in pages; 2) make it interactive
with local data and ensure routes work; 3) add auth and DB with Supabase;
4) make a landing page; 5) end-to-end sweep (auth, middleware, security,
testing); 6) deploy and retest.

Think extremely hard and generate a great plan. Once you've developed one
that is comprehensive, report back here and I'll supply some screenshots.
```

Handoff to Gemini:
```
[paste full plan]
[attach dashboard screenshot]
Design using this style as inspiration. Clean and minimal.
```

Design-only chat opener:
```
Here's my app. All functionality works. I only want you to change the design.
Work in the stylesheets. [attach screenshot] Mimic the fonts, colors,
borders, cards and spacing. Sentence case headings, borders not shadows,
rounded squares not pills. Remove any element that has no page behind it.
```

## Pitfalls Nick calls out

- Auth first means middleware only covers page one. Auth last.
- One long context for functionality and design degrades. Separate chats.
- Models add nav items and buttons for pages that do not exist. Strip them.
- The first render will have init errors (missing html/body tags in root layout, styles not loading). That is normal, paste and continue.
- "Start work" button: the model misunderstood who the user was. State the user role explicitly.
- Every screenshot costs tokens. Crop tight.

## How Caleb should use this

- AIRE client dashboard for sellers: pending showings, feedback, marketing stats, documents, settings. Follow the loop exactly, auth last.
- Buyer portal: saved homes, tour requests, lender docs. Grab a Dribbble "real estate dashboard" screenshot as the inspiration.
- KW team or ISA dashboard for lead follow-up: functionality first with JSON sample leads, then Supabase.
- Reuse the taste rules as an always-on rule so every AIRE surface shares one look.
- Generating animated hero assets costs money: needs Caleb's approval before running.

## Verification

- Claude's plan lists pages that match what you asked for and nothing silly.
- Local dev server renders styled pages, every nav item has a route, create/read works against JSON data.
- After the design pass the fonts, colors and card style visibly match the screenshot and the headings are sentence case.
- Narrowing the browser to phone width shows no overlapping elements.
