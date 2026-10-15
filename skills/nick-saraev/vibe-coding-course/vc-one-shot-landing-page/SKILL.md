---
name: vc-one-shot-landing-page
description: One-shots a high-end landing page or portfolio site with Gemini 3.1 Pro High in Antigravity using Nick Saraev's "cinematic landing page builder" GEMINI.md prompt (role, six-question brief, aesthetic archetypes, structural typologies, anti-generic rules), then iterates with screenshots and voice dumps and deploys it to Netlify by drag and drop in under a minute. Use when Caleb says "build me a landing page", "make a one-page site for this listing", "I need a personal REALTOR site", "open house landing page", "quick site for the St. Francisville farmers market sponsorship", or wants a static page live on the internet fast with no database.
---

# One-shot landing page with Gemini + Netlify drag-and-drop

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapter 13 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=1493s)

## What Nick teaches

The simplest way to get a beautiful site out of Gemini 3.1 Pro High is to store one big prompt as `GEMINI.md` in an empty folder and then type "build me a website." The prompt (he shares it in the video description) does five things:

1. **Role.** "You are a world-class senior creative technologist and lead front-end engineer. You build high-fidelity, cinematic, 1:1 pixel-perfect landing pages. Every site you produce should feel like a digital instrument. You must eradicate generic AI patterns, including typical structural layouts like a standard hero, three-column features and CTA. Every site you build will use a vastly different structural layout, typographic scaling and interactive paradigm based on the chosen archetype and structural typology."
2. **A brief Q&A** the model must run before building: brand name, core thesis, aesthetic archetype, structural typology, three core pillars, ultimate conversion goal. You can answer "pick best fit" for the archetype and typology.
3. **Aesthetic archetypes** to choose from (a menu of named visual styles).
4. **Structural typologies**: bento grids, split screens, infinite horizontal structures, linear narratives, application shell.
5. **Tooling rules** (which libraries, icon sets, stock-image sources it may use) plus a **double-checking protocol** at the end.

In the demo he answered: brand Leftclick, thesis "we help high growth B2B companies scale revenue using outbound methods like cold email", archetype and typology "pick best fit", three pillars (super low cost of acquiring a customer, AI-based personalization at scale, trusted vendor who has worked with multi-billion dollar portfolio companies), conversion goal "book a growth mapping call, 30 min consult." Gemini then scaffolded the app (a Vite project with Tailwind), wrote an implementation plan artifact (archetype "B2B SaaS dense", palette gunmetal / safety orange / steel, IBM Plex Sans and Mono), and produced a finished site while he got a glass of water. It ran at `localhost:5173`.

**Iteration loop.** He opened a second folder (`website-builder-new`) and ran it again for a different take. Then he improved it with one voice dump plus a screenshot of a navbar he liked from his real site:

> "I have a navbar that I've supplied you with. I want you to make it that pill style because it's really high-end and clean. I don't need the Earth logo next to Leftclick, just use Leftclick. We should have buttons on the hero header. Also make the hero header way bigger, I want the content to pop. There are some weird numbers next to the hyper-efficient acquisition graph outside the bounds of that box, fix that. Add another section between 'scale without compromise' and 'trusted by the best' that talks about me: my name is Nick Saraev, I run Leftclick, I've helped over 400,000 people use AI automation and outbound to improve their lives and businesses. Down at the bottom add a footer in addition to the CTA so it's a little thicker."

Second pass: "make sure the style of the pill navbar aligns with the rest of the style of the site, super clean, nice job on everything else", supplied a headshot, "make the green a little darker." Done. He also designed a second site for his content business in parallel while waiting.

**Deploy (static site).** Netlify, free for a couple of sites (Vercel is the alternative). Add new project > Deploy manually > drag the whole project folder in (right-click the folder in Antigravity > Reveal in Finder). It built and went live on the first try at a random `something.netlify.app` URL. Custom domains cost money. He verified in an incognito window and on his phone. Later he moves to giving the agent a Netlify API key and saying "push this" (see `vc-deploy-to-production`).

## Step by step

1. Create an empty folder, open it in Antigravity, add `GEMINI.md` with the cinematic landing page prompt (customize the role and tooling sections).
2. Set the agent to Planning mode, Gemini 3.1 Pro High. Type: `build me a website`.
3. Answer the six questions. Be concrete on brand, thesis, three pillars and conversion goal. "Pick best fit" is fine for archetype and typology.
4. Wait. Skim the implementation plan artifact (palette, fonts, layout) and stop it if something is clearly wrong.
5. Open the local URL. Run the site 2 or 3 times in separate folders if you want options, then keep the best.
6. Iterate with one voice dump per round. Attach screenshots of elements you want copied (a navbar, a card style) and real assets (headshot, logo). Ask for all the changes at once, not one at a time.
7. Deploy: Netlify > Add new project > Deploy manually > drag the folder. Test in incognito and on your phone.

## Templates / prompts

GEMINI.md skeleton for a landing page builder:
```
# ROLE
You are a world-class senior creative technologist and lead front-end engineer.
You build high-fidelity, cinematic, 1:1 pixel-perfect landing pages. Every site
you produce should feel like a digital instrument. Eradicate generic AI patterns
(standard hero, three-column features, CTA). Each site uses a different
structural layout, typographic scale and interactive paradigm based on the
chosen archetype and typology.

# BEFORE BUILDING, ASK THE USER
1. Brand name
2. Core thesis (one sentence)
3. Aesthetic archetype (offer the list below, or "pick best fit")
4. Structural typology (bento grid / split screen / infinite horizontal /
   linear narrative / application shell, or "pick best fit")
5. Three core pillars
6. Ultimate conversion goal

# AESTHETIC ARCHETYPES
[list 6 to 10 named styles with 2-line descriptions each]

# TOOLING RULES
- Vite or Next.js, Tailwind CSS, a single modern icon library
- Fonts from Google Fonts only, pick cutting-edge pairings
- Stock imagery from free stock sites, high resolution, never placeholder gray
- Mobile responsive by default

# DOUBLE-CHECKING PROTOCOL
Before reporting done: run the dev server, confirm no console errors, confirm
every nav link and button has a target, confirm text contrast is readable.
```

Iteration voice-dump pattern:
```
[what you like] + [each specific change, referencing the section name] +
[attached screenshot of the element to copy] + [attached asset] +
"everything else looks nice, nice job"
```

Example answers for a REALTOR version:
```
1. Caleb Jackson, REALTOR, Keller Williams First Choice
2. Helping families buy and sell homes in St. Francisville and Baton Rouge
   with local knowledge and an AI-powered follow-up system.
3. Pick best fit (warm, editorial, Southern)
4. Pick best fit
5. Local expertise, fast response (AIRE), proven results
6. Book a free home valuation call
```

## Pitfalls Nick calls out

- Rerunning the same prompt gives similar animations because the icon and animation libraries are the same. Vary the archetype or add randomization if you want distinct results.
- Dribbble and some sites block screenshots, so screenshot the rendered site or your own old site instead.
- A static page has no auth or data, so security is trivial here. Do not confuse that with an app (see `vc-security-audit`).
- Drag-and-drop deploys only work this smoothly for predictable frameworks. Apps with backends need the CLI route.
- Custom domain is the only part that costs money.

## How Caleb should use this

- Listing landing pages: one folder per listing, answer the six questions with the property details, deploy to Netlify, share the link in the MLS remarks and on social. Needs Caleb's approval before deploying anything public with a client's address.
- Personal brand site for calebjackson.org with the AIRE angle, home valuation CTA, and a section about Keller Williams First Choice.
- Open house or neighborhood event pages (St. Francisville events, Baton Rouge market updates) that collect a name and email into a simple form.
- Keep a `GEMINI.md` with KW-compliant footer language (brokerage name, equal housing, license info) so every page ships compliant.

## Verification

- The agent asks the six questions before writing any code.
- Implementation plan artifact names an archetype, palette and fonts.
- Local dev server URL renders a full page with working nav, hero, pillars and a CTA pointing at the conversion goal.
- After deploy, the `*.netlify.app` URL loads in an incognito window and on a phone.
