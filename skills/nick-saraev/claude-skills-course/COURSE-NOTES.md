# Course Notes: CLAUDE SKILLS FULL COURSE: Automate Your Work (2026)

- **Instructor:** Nick Saraev
- **URL:** https://www.youtube.com/watch?v=sduaTkhIm_w
- **Length:** 47 minutes, 11 chapters
- **Skills folder:** `/home/user/Caleb-s-Agents/skills/nick-saraev/claude-skills-course/`

## Nick's core thesis

Skills are standard operating procedures written for agents instead of humans. If you have an SOP, even a sloppy one, you have a skill: hand it to Claude with a compressed skill spec in CLAUDE.md and it writes the markdown for you. Run it once, let it ask for what it needs, and let it patch itself when it hits a gap, because skills are self-healing over time. Most skill demos are flashy personal-assistant toys. The money is in front-end business work: lead follow-up, lead generation, cold outreach, deliverables for prospects, and content distribution. Build those, then actually use them.

## Chapter by chapter

1. **Introduction (0:00)** Nick runs a $4M/yr profit business mainly through agents and skills, teaches 2,000+ people, and promises business-grade skills rather than personal-assistant demos.
2. **The Objective (1:05)** Antigravity running five Claude Code plugins. Introduces the CRM pipeline problem and the `/follow-up-nurture` skill.
3. **Overview of Skills as Business Tools (2:30)** Follow-up skill reads every email chain, drafts casual stage-specific check-ins in the same thread, lists what it sent. Starts the thumbnail generator demo (Jon Hamm image, face superimposed).
4. **Demonstrating Effective Skills (4:45)** Thumbnail variants to pick from. Lead scraper: "scrape me 50 management consultants in Arizona" via LinkedIn Sales Navigator URLs into a Google Sheet. Cold email campaign cloner that duplicates winners and rewrites for a new offer with variants and follow-up. Website builder intro.
5. **Automating Lead Follow-Ups (10:22)** Website builder pushes to Netlify as a cold-outreach value add. One-off personal skills via Chrome DevTools MCP: WeWork desk booking 30 days ahead, Amazon personal shopper comparison table, Instacart grocery.
6. **Creating Viral Thumbnails (15:30)** (Mis-titled, actually the theory chapter.) Skills are SOPs for agents, PB&J checklist analogy, markdown basics, every provider now supports skills, "if you have an SOP you have a skill," give the spec plus your task list, test once, self-healing.
7. **Maximizing B2B Lead Gen (20:45)** (Mis-titled, this is the build walkthrough.) Make `skillspec.md` by compressing Anthropic's docs to 150-200 lines, make it your CLAUDE.md, voice-dictate the inbox-cleaner SOP, agent scans existing code, plans, writes SKILL.md plus script, tests end to end.
8. **Streamlining Cold Email (26:10)** Dissects the generated inbox-cleaner SKILL.md: front matter (name, description, allowed-tools), goal, rules. Reviews the 97 emails before marking read. Reruns from a fresh instance with `/inbox-cleaner`, adds a `-a 1000` amount flag with one sentence. Front matter saves tokens (373 words / ~500 tokens vs 60-70).
9. **Rapid Website Creation (31:00)** (Mis-titled, this covers progressive disclosure.) The conversation stack: CLAUDE.md, then every skill's front matter, then your prompt. Skill matching loads the full SKILL.md only on match. Less context means higher quality and lower cost. Opens three windows to build three skills in parallel: meeting notes, invoice extractor, content repurposer.
10. **Unique Skills: Personal Automation (35:30)** Three archetypes finish: pure SOP, SOP plus Python script (self-fixes subtotal bug), templates plus Sonnet subagents in parallel. The hidden `.claude/skills/<name>/SKILL.md` layout, Shift+Cmd+. to reveal, scripts in an `execution` folder. Build skills for front-end revenue tasks, not back-end complexity.
11. **Building Effective Skills for Your Needs (45:15)** What's worth building: content repurposing, lead gen scrapers, Chrome DevTools MCP forum posting and product research, expense categorization. Not worth it: skills that build skills, AGI frameworks. Subscribe ask and closing.

## Skills created

| Skill | What it does | Trigger phrases |
|---|---|---|
| `cs-sop-to-skill` | Core method: compressed skill spec in CLAUDE.md, dictate an SOP, agent builds SKILL.md plus script, test once, self-heal | "make this a skill", "turn my SOP into a skill", "I do this every day, automate it" |
| `cs-skill-anatomy-and-matching` | Front matter, skill matching, progressive disclosure, hidden folder layout, where scripts go | "why isn't my skill loading", "where do skills live", "this skill eats too much context" |
| `cs-follow-up-nurture` | Daily pipeline sweep that drafts casual, in-thread check-ins per stage and logs them | "follow up with my pipeline", "nurture my leads", "who needs a touch today" |
| `cs-thumbnail-variant-generator` | Reproduce a reference image with Caleb's face, generate several variants to pick from | "make me a thumbnail like this", "put my face on this", "give me a few versions" |
| `cs-lead-scraper-to-sheet` | Natural-language lead request to filtered search, enrichment and a Google Sheet, in the background | "scrape leads", "build me a list of investors in Baton Rouge", "pull contacts" |
| `cs-cold-email-campaign-cloner` | Ask for the offer brief, clone best past campaigns, rewrite with variants and follow-up, set up in platform | "write a cold email campaign", "clone my best campaign", "draft a sequence for absentee owners" |
| `cs-outreach-website-builder` | One prompt to a polished, varied static site deployed to Netlify as an outreach gift or property site | "build a quick site for this listing", "landing page for this seller", "free site for this business" |
| `cs-browser-automation-skills` | One-off Chrome DevTools MCP skills for logged-in sites: recurring bookings, comparison shopping, portal entry | "automate this website", "book this every day", "find the best option and compare" |
| `cs-three-skill-archetypes` | Pick pure SOP vs SOP plus script vs templates plus subagents, build several in parallel | "script or just instructions", "build me three skills at once", "repurpose this video" |

## Top 5 takeaways for Caleb

1. **Every checklist you already use is a skill waiting to happen.** New listing launch, under-contract timeline, closing prep, buyer consult. Dictate them to Claude with the spec loaded and run them as slash commands.
2. **Follow-up is the highest-ROI skill.** A morning `/follow-up-nurture` that drafts casual, in-thread check-ins for every buyer, seller and past client, with Caleb approving before send, is the single most valuable thing to build for both the brokerage business and AIRE.
3. **Keep the front door tight.** The description's "Use when ..." line decides whether a skill fires. Write triggers in Caleb's own words and keep front matter short so AIRE's growing skill library stays cheap and accurate.
4. **Put deterministic work in scripts, judgment in prose, and let the first run break.** Closing statements and invoices go through code. Call transcripts go through an SOP. Test on real data and let the agent patch itself.
5. **Build for the front end of the business.** Lead scraping, outreach copy, free single-property or local-business sites, and content repurposing beat any clever back-end pipeline. Anything that sends, posts, books or spends needs Caleb's approval before running.
