# Course notes: Claude Code Marketing Full Course (6 Hours)

- **Title:** CLAUDE CODE MARKETING FULL COURSE (6 HOURS)
- **Author:** Nick Saraev
- **URL:** https://www.youtube.com/watch?v=yulWjh3rq28
- **Length:** 362 minutes, 17 chapters
- **Skills folder:** `/home/user/Caleb-s-Agents/skills/nick-saraev/claude-code-marketing/` (prefix `mk-`)

## Nick's core thesis

Marketing is a pipeline (RACE: Reach, Acquire, Close, Expand) and the business only moves as fast as its single bottleneck step, so you find that step first and automate only that. Every automation is built the same way: prove the output with a manual prompt, consolidate it into a skill, schedule it as a local loop, then move it to a cloud routine that runs without you. Humans own process design and taste (picking winners, final assets, relationships). AI does the repetitive middle at volume. Hard-won production advice: get credentials up front, let systems self-heal and log errors to Slack, and automate for effectiveness (more time with people), never for efficiency alone.

## Chapter-by-chapter

| # | Chapter (start) | One-line summary |
|---|---|---|
| 1 | Welcome + what you'll build (0m) | Course map: setup, five marketing functions, prompt/skill/loop/routine, then builds for creative, copy, speed to lead, dashboards, follow-ups, maintenance. No skill. |
| 2 | Download, install, set up (3m) | claude.com signup, personal plan, paid Code product (~$24 CAD/mo), download, log in. Folded into `mk-claude-desktop-workspace-setup`. |
| 3 | Full interface tour (7m) | Home vs Code, artifacts (free hosting), skills, connectors, plugins, memory, routines, local vs cloud environments and env vars, permission modes, /btw /usage /loop, voice, models, effort, context window, CLI. `mk-claude-desktop-workspace-setup`. |
| 4 | Five marketing functions framework (47m) | Marketing -> Sales -> Fulfillment -> Admin. RACE. Six levers. Factory bottleneck analogy. `mk-race-bottleneck-thinking`. |
| 5 | Prompts vs skills vs loops vs routines (63m) | Four-level ladder, "say it twice -> skill", probability multiplication, bring your own process. `mk-prompt-skill-loop-routine-ladder`. |
| 6 | Top of funnel: automating ad creative (75m) | Ads Library formats -> HTML/CSS compositing -> tuner page with sliders -> JSON -> 50 variants -> picker. `mk-procedural-ad-generator`. |
| 7 | Building the ad creative skill (102m) | Skill test on a new product, loop at 5:59, routine to Drive + GitHub. Compositing vs direct gen. GPT image 2 API, zones/levers, 5 variants per template, routine with cloud env key. Intro to video. `mk-prompt-skill-loop-routine-ladder`, `mk-ai-image-ad-templates`, `mk-connect-tools-keys-and-connectors`. |
| 8 | AI video creative (155m) | Higgsfield manual run: influencer image, hero frame, scripts, product element, model tests, 10 s / 27-30 words, CLI login, 3 parallel candidates. `mk-ugc-video-ad-pipeline`. |
| 9 | Turning builds into repeatable skills (179m) | Video skill rules: 8 s under 22 words, cross people x products, 3 concurrent cap, retries. Higgsfield custom connector. Routine with Drive. `mk-ugc-video-ad-pipeline`, `mk-prompt-skill-loop-routine-ladder`. |
| 10 | Personalized copy: newsletters (191m) | Hard vs fuzzy variables, camelCase names, Kit custom fields, ~10-word fills, daily tag-based send routine via Kit API. `mk-fuzzy-variables-newsletter`. |
| 11 | Cold email + fuzzy variables (223m) | Casual lowercase template, Apify scraping via MCP, ICP 15/20 self-check loop, trimmed CSV, Instantly preview. `mk-cold-email-icebreakers`. |
| 12 | Speed to lead: email, SMS, voice (246m) | Formspree form -> Gmail polling -> templated email + 160-char SMS via Quo/Twilio -> routine fired via API. Call merge explained. `mk-speed-to-lead-email-sms`. |
| 13 | Data collection, tracking, dashboards (276m) | Data folder -> best model picks architecture -> scaffold with signals -> 5 parallel design subagents -> Netlify password deploy. `mk-marketing-dashboard-variants`. |
| 14 | Bottom of funnel: automated follow-ups (309m) | ClickUp CRM, Gmail API send, 10-template pool, 1/2/3/7/14/21/28/56/84-day cadence, history check, opt-out flag, skill -> loop -> routine. `mk-crm-followup-cadence`. |
| 15 | Recap of the five functions (333m) | Recap plus adding Quo SMS to the follow-up flow. Folded into `mk-crm-followup-cadence`. |
| 16 | Maintenance and advanced tips (335m) | Credentials up front, self-healing clause, Slack #errors logging, effectiveness beats efficiency, what to automate vs keep human. `mk-self-healing-error-logging`, `mk-automate-or-keep-human`. |
| 17 | When not to automate + wrap-up (361m) | People over-automate. Subscribe. Maker School pitch. Folded into `mk-automate-or-keep-human`. |

## Skills

| Skill | What it does | Trigger phrases |
|---|---|---|
| `mk-race-bottleneck-thinking` | Maps the business to RACE and finds the one bottleneck to automate first | "what should I automate first", "where am I leaking leads", "which system to build" |
| `mk-prompt-skill-loop-routine-ladder` | Converts a manual process into skill, scheduled loop, then cloud routine with verify-first rule | "make this repeatable", "run this every morning", "turn into a routine", "run without my laptop" |
| `mk-claude-desktop-workspace-setup` | Install and daily operation of the Claude desktop Code tab: modes, models, effort, context, usage, /btw, /loop | "which mode", "hit my usage limit", "Fable or Sonnet", "set up a new machine" |
| `mk-connect-tools-keys-and-connectors` | Connect services by connector, MCP URL, CLI, or env-var API key, locally and in cloud routines | "hook up my CRM", "where do I put the API key", "connector has no send tool" |
| `mk-procedural-ad-generator` | Cheap HTML/CSS compositing ad generator with tuner page, JSON profile, 50-variant batches, picker | "make listing ads", "30 versions of this graphic", "open house ad variants" |
| `mk-ai-image-ad-templates` | On-template AI image generation (GPT image 2 API) with zones/levers and a variant picker | "photo-real listing ads", "lifestyle images", "AI images in my templates" |
| `mk-ugc-video-ad-pipeline` | Higgsfield-driven UGC video ads: hero frame, scripts, 3 candidates, cross people x products, duration rule | "video ad for this listing", "testimonial-style videos", "AI spokesperson" |
| `mk-fuzzy-variables-newsletter` | AI-filled short merge fields in a human-written email, loaded as custom fields, daily for new signups | "personalize my newsletter", "welcome email feel one-to-one" |
| `mk-cold-email-icebreakers` | Scrape (Apify), ICP self-check, write icebreakers per row, trim CSV, load into Instantly | "write icebreakers", "enrich these FSBO leads", "cold email absentee owners" |
| `mk-speed-to-lead-email-sms` | Instant personalized email + SMS on new inquiry via inbox polling, then API-triggered routine | "reply to new leads instantly", "text every Zillow lead immediately" |
| `mk-marketing-dashboard-variants` | Data folder -> architecture -> scaffold with signals -> 5 parallel design variants -> Netlify deploy | "build me a dashboard", "client-facing listing page", "five design options" |
| `mk-crm-followup-cadence` | Daily CRM follow-ups from a template pool on a days-outstanding cadence with history and opt-out checks | "follow up with quiet leads", "chase unsigned agreements", "daily follow-up routine" |
| `mk-self-healing-error-logging` | Credentials up front, self-healing clause with change log, Slack #errors alerts | "routine keeps breaking", "make AIRE fix itself", "add error alerts" |
| `mk-automate-or-keep-human` | Effectiveness filter: automate, automate with QA, or keep human | "should AIRE handle this", "is it okay to auto-send to a seller", "what should stay me" |

## Top 5 takeaways for Caleb

1. **Find the bottleneck before building.** For most agents it is response time and follow-up, not more content. Run `mk-race-bottleneck-thinking` with real inquiry/appointment numbers before touching creative tools.
2. **Climb the ladder, don't skip rungs.** Every AIRE workflow starts as a prompt Caleb drives by voice, becomes a skill tested in a fresh chat, then a loop, then a routine to Drive. Verify the output by hand at each step.
3. **Humans write the email, AI fills three short slots.** Fuzzy variables of 5 to 10 words make sphere emails, lead welcomes, and cold outreach feel one-to-one without sounding like AI. No em dashes.
4. **Speed to lead plus a soft follow-up cadence is the money.** Instant templated email/SMS promising a call, then a 1/2/3/7/14/28-day nudge pool with history and opt-out checks. Both stay human-QA'd until proven, and sending anything needs Caleb's approval.
5. **Production means credentials, self-healing, and an errors channel.** Store access in the cloud environment, add the self-healing clause and change log to every skill, and route failures to Slack so a 6 a.m. break is fixed before anyone needs the output. Keep relationships, bad news, and negotiation human.

## Deliberately not turned into skills

- Chapter 1 (welcome), chapter 15 (recap), chapter 17 (wrap-up/pitch): intro, recap, and promotional content, summarized above only.
- The iOS simulator, SSH, Remote Control, Spotify connector, and plugin marketplace mentions in chapter 3: tangential to marketing work, noted inside `mk-claude-desktop-workspace-setup` where relevant.
- Automated call merging and sales dispositions (chapter 12): Nick explicitly deferred these to a future sales course and did not build them. Mentioned as a next step in `mk-speed-to-lead-email-sms`.
- Nick's product-specific details (Maker School, Clarvo, Stripe/sock ad examples): used as illustrations inside skills, not as standalone skills.
