# Most Viewed Realtor in Baton Rouge: the build plan

Date: October 7, 2026. Owner: Caleb Jackson, REALTOR, Keller Williams First Choice. Builds on the Luxury Presence capability inspection dated October 6, 2026.

Labels used throughout: **observed** means seen in your accounts today or in the October 6 audit. **source-reported** means from official documentation or your own brand package. **inferred** means my recommendation. **unknown** means not yet established. Nothing in this plan was published, scheduled, sent or purchased. Every automation below has an approval gate until you remove it.

## The one-paragraph thesis

"Most viewed" is five scoreboards, not one: Google Search, Google Maps, social feeds, AI answers, and word of mouth. The audit shows you already own the tools for the first two and have the accounts for the third. What is missing is a single operating rhythm that feeds all five from one weekly effort, a measurement layer that tells us which views turn into appointments, and automations that keep you in front of people on the days you are busy closing. Money comes from appointments, not views, so every build below is ranked by how directly it produces a conversation with a buyer, a seller or a referral source.

## Reconciled on October 7 with the rest of this repo and the Codex site build

Three other pieces of work exist that this plan must not contradict. All three were read today.

- **The 30-page site preview (Caleb, October 7).** Built on the Mac by Codex with consistent branding, the market-statistics and buyer-psychology approach, and clear next steps. Caleb set it as the direction for the whole site. Metadata and link checks passed, the approved seller page is unchanged, and the visual review and the transfer into Luxury Presence are still owed. The preview is not in this repo. The review checklist for that pass is `strategy/site-review-checklist.md`.
- **The October 6 Louisiana search visibility research packet** ([pull request 4](https://github.com/calebjackson-reve/Caleb-s-Agents/pull/4)). Its recommendation is one strategy: own the north first, Zachary and the Felicianas, seller-first and proof-led, with Baton Rouge metro as the second lane. That is the wedge inside this plan's "most viewed in Baton Rouge" goal, not a competitor to it. Its ten page briefs (Zachary seller page, net sheet explainer, Flood Zone X, Zachary relocation, true monthly cost, St. Francisville, False River, Felicianas acreage, compare agents, monthly market note) are the first Answers and Place content. Its 28-prompt AI library and run log are the AI baseline, and this plan's 20 questions merge into it.
- **The twelve AIRE skills** ([pull request 1](https://github.com/calebjackson-reve/Caleb-s-Agents/pull/1)). Conversation drafting, promise drafting, relationship strategy, daily executive planning and the KW Command import pattern already exist. The agents in this plan reuse them instead of rebuilding them. The mapping is in `agents/README.md`.

Facts from the research packet that change Phase 0:

- **Google Workspace and Google Cloud billing for calebjackson.org have failed payment notices dated September 15 and October 1** (observed in Gmail by that session). The Google identity that owns the Business Profile, the mailbox and the Metricool connection depends on this account. This is now the first item in Phase 0. Resolving it is a spend decision only Caleb makes.
- **The Google Business Profile was verified on October 6 at 12:05 am Central.** Luxury Presence's connector is simply stale. Phase 0 is filling the profile, not claiming it.
- **Decision D1 on the profile address, settled October 7.** Clients are not met at the brokerage office, so the profile becomes a service-area business with the address hidden. Caleb lives and works in Prairieville, so the pin stays in Prairieville: Google places it at the verification address and that must be a real place he operates from. The October 6 idea of moving the anchor to Zachary or St. Francisville is withdrawn. The northern markets, where most of his business comes from, are won through service areas, reviews that name those towns, posts, and the website's town pages, not the pin. 17111 Commerce Centre Drive, Prairieville, LA 70769 goes on the site footer, email signature and cards for LREC, matching the Google profile. Details in `strategy/phase0-google-billing-and-gbp.md`.
- **Decision D2 on Luxury Presence automation is still open and now urgent.** The AI SEO Specialist and AI Blog Specialist change the site weekly and have published statistical posts nobody reviewed. If they stay fully automatic through the 30-page transfer, they will overwrite the new titles, descriptions and H1s one page a week. Recommendation: set the SEO specialist to review-before-apply or pause it for 60 days, set the blog specialist to draft-only, and fact-check the False River and St. Francisville posts before the transfer starts.
- **Public repo warning.** This repository is public. Pull requests [2](https://github.com/calebjackson-reve/Caleb-s-Agents/pull/2) and [3](https://github.com/calebjackson-reve/Caleb-s-Agents/pull/3) carry client transaction PDFs with street addresses. The commit guard in pull request 1 would refuse them. Caleb should close those two without merging and keep client deliverables in Drive or a private repo.

## Where you stand today

| Scoreboard | Observed state | What it means |
|---|---|---|
| Google Search | Automatic SEO on, six non-branded keywords in LP's top ten subset, zero clicks on the displayed ones, five service pages live | The machinery runs but is not yet earning visits. Content and intent targeting are the lever. |
| Google Maps | Verified October 6 at 12:05 am Central. Listing shows Keller Williams First Choice -Caleb Jackson, one review, 5.0 rating, no phone, no hours, zero posts in 12 months, eight photos. LP's connector shows a stale unverified record. | Owner access confirmed. One review and an empty profile are the gap. The pin stays in Prairieville where Caleb lives and works. Zachary, St. Francisville and the Felicianas are won through service areas, reviews, posts and the website's town pages. |
| Social | Metricool brand "Caleb Jackson- Realtor" with Facebook page, Instagram (calebjacksonla), GBP and YouTube connected. Zero posts scheduled for the next 30 days. No LinkedIn or TikTok connected. | The pipe is built and empty. Scheduling with a review gate can start this week. |
| AI answers | No baseline run yet. robots.txt, sitemap and llms.txt are public. | Unknown until the 20-question baseline runs. |
| Word of mouth | Brand package says most business is repeat and referral, but the numbers are still in brackets. Lead reporting in LP is blank. | Your strongest channel has no system behind it and no measurement. |

Two brand inconsistencies were observed today and Caleb decided both on October 7, 2026:

- Instagram handle is @calebjacksonla everywhere. The @calebjackson_24 handle in the brand package is retired and the package bio line should be updated.
- Office address is 17111 Commerce Centre Drive, Prairieville, LA 70769 everywhere, exactly as registered on Google. Caleb corrected an earlier Market Place note at 10:05 am.

## The money model

Fill these in from your own numbers. The plan's automations are chosen to move the inputs on the left.

| Input | Your number | Driven by |
|---|---|---|
| Conversations per week (calls, texts, DMs with a real person about real estate) | [ ] | Daily lead-gen block, speed-to-lead automation, social replies |
| Appointments set per week | [ ] | Conversation quality, booking link, follow-up cadence |
| Signed agreements per month | [ ] | Appointment prep, authority content, reviews |
| Closings per month and average commission | [ ] | Everything above |
| Share of closings from repeat and referral | 100 percent, reported by Caleb October 7. Every client to date came from sphere, past clients or referrals, and he has never paid for a lead. | Database nurture, review engine, home anniversary touches |

Rule of thumb, inferred: a solo agent who holds 10 real conversations a day sets roughly 3 to 5 appointments a week. Your own ratios replace this guess after 30 days of tracking.

## Phase 0: fix the scoreboard (this week, October 7 to 13)

Nothing else in this plan can be measured until these are done. Each is a checkbox, not a project.

0. **Fix Google billing first, before October 16.** Observed in Gmail on October 7: the Visa ending 8257 was locked by Google Payments on September 15 pending verification, so Workspace Business Plus, the AI Expanded Access add-on and the Google Cloud billing account have all failed since. Workspace suspends all services on October 16, 2026. Caleb decided October 7 to fix it. The exact steps and links are in `strategy/phase0-google-billing-and-gbp.md`. Caleb pays, nobody else can.
1. **Fill the Google Business Profile.** The profile is verified. Keep the Prairieville address exactly as it is (Caleb, October 7: keep the address, no hiding), add the sixteen service areas, fill phone (225) 747-0303, hours, the website link with the UTM tag, the description from the profile copy kit, services and products. Reconnect in Luxury Presence afterward. No address move: Caleb lives and works in Prairieville and Google will not accept an address he does not operate from. The rename to "Caleb Jackson, REALTOR" is optional and waits a few weeks. Do not create a second profile. The brokerage and sponsoring broker's name and phone go in the description per LREC. Details in `strategy/phase0-google-billing-and-gbp.md`.
2. **Get into GA4 and Search Console.** Request access to property G-PDSW2YFRNW (or confirm it is yours). Verify calebjackson.org in Search Console with the DNS or HTML method. Export the last 90 days of queries, pages, clicks and impressions. Save it as the baseline.
3. **Lead-tracking source of truth is KW Command.** Decided October 7. Every lead lands there with source, date, first response time and outcome. The lead-response agent writes to it. Unknown: whether Claude can write to KW Command directly through an API or connector. If not, the agents produce a daily CSV or a Zapier-style sync, and Caleb confirms the logging path in week one. Luxury Presence lead routing should forward every site lead into KW Command so nothing lives in two places.
4. **Run the AI baseline from the Mac.** The research packet's 28-prompt library already exists with a run log and a rerun protocol, and the first pass on the one surface it could reach found zero mentions of Caleb in 16 non-branded runs and zero citations of calebjackson.org in 18. Run the full library on ChatGPT, Gemini, Perplexity, Copilot and Google AI Mode from the Mac with location set to Baton Rouge, and fold in the questions at the end of this file that the library lacks (best realtor in Baton Rouge, flood insurance cost, the Action Jackson branded probe). Repeat monthly.
5. **Apply the two brand decisions above.** Set @calebjacksonla on every profile. Put 17111 Commerce Centre Drive, Prairieville, LA 70769 in the site footer, the email signature and on cards, matching Google. The Google Business Profile does not show an address at all under decision D1.
6. **Connect LinkedIn in Metricool.** Decided October 7. Caleb does this in Metricool's connections screen with his LinkedIn login (it needs his authorization, so an agent cannot do it). Once connected, the content engine pulls LinkedIn best-time data and adds the Market Receipt and Answers pillars there.
7. **Bio receipts, done October 7.** Since 2022: 81 closed deals, $25.1M in sales, 27 in the last 12 months, 100 percent referral and sphere business, never a paid lead. Aligned to the MLS export at 14:58 Central. Caleb approved the copy the same day. The paste-ready version for every surface is in `brand/profile-copy-kit.md`. Applying it to the site, LinkedIn, Instagram, Facebook, YouTube, the Google Business Profile and the email signature needs Caleb's logins and is the first task of the brand lockdown afternoon. Keep the MLS production report on file to back the volume figure.

## Phase 1: brand consistency and the content engine (weeks 2 to 4)

### Brand lockdown

The July 2026 brand package is current (Keller Williams First Choice era) and is the standard. The compact version of its rules lives in `brand/voice-and-visual-rules.md` in this repo and every agent reads it before producing anything. The non-negotiables:

- Ivory and ink carry 95 percent of any view. Ember once per view. No gold, navy or gradients.
- Instrument Serif for display, Hauora for body. Labels uppercase with tracking.
- Wordmark "caleb jackson." with the ember period. Monogram "aj." for avatars. Never houses, keys, roofs or skylines.
- "Keller Williams First Choice" legible on every public asset per LREC advertising rules. Never inside the personal mark.
- Voice: first person, short declarative lines, real numbers and place names, y'all when earned, faith on milestone beats. Never "unparalleled service," never emoji stacks.
- Slogan treatments fixed: "Action Jackson." as hero, ACTION JACKSON as label, one of three supporting lines as proof.

**Seller page rewrite, in progress.** Observed from Caleb's October 7 note: a /sell page rewrite drafted on October 6 adds the market-statistics and buyer-psychology approach, clearer pricing copy and seller questions, and keeps the existing contact and net-sheet paths. Metadata and link checks passed. It is not live, and the visual check is still owed before publishing. The preview and the exact edits are on Caleb's Mac (Codex outputs folder dated 2026-10-06), not in this repo. Next step: drop `seller-page-preview.html` and `seller-page-edits.md` into `strategy/sell-page/` here or into Drive so the content engine can reuse its copy, then do the visual check and publish within the approval scope. This page is the first one the Answers pillar should feed.

The photo and cover set for every surface is in `brand/profile-assets/` and the order of work is `brand/profile-update-checklist.md` (built October 7). Apply this to every surface in one pass: GBP profile photo and cover, Facebook page, Instagram bio and highlights covers, YouTube banner and channel description, email signature, Luxury Presence homepage hero, Zoom background, listing sign riders. One afternoon of work, then it never drifts because the agents enforce it.

### Content engine: one session feeds five scoreboards

Inferred design. The weekly rhythm is one 90-minute recording block on Monday that produces the entire week.

| Pillar | Weekly count | Why it earns views | Where it lands |
|---|---|---|---|
| Receipts | 1 | Listed Tuesday, under contract Friday. Real addresses with permission, real days on market, real numbers. This is the brand. The standing receipt is 81 closed deals, $25.1M since 2022, every one by referral, never a paid lead. | Instagram reel, Facebook, GBP post, YouTube short |
| Answers | 2 | 60-second answers to the 20 baseline questions. Flood insurance cost, what a Zachary home costs now, how to price in St. Francisville. These are the same questions AI tools get asked. | Reel, short, Facebook, and a 300-word written version on the matching service page or blog |
| Place | 1 | A neighborhood from the brand package's eight target areas with one dated fact. Builds the local-expert pages LP already supports. | Reel, Facebook, blog, GBP post |
| Market receipt | 1 per month | Monthly numbers for East Baton Rouge, Zachary, West Feliciana and Pointe Coupee with the source named. This is what AI answers and local press cite. | /market-report page, email to database, Facebook, LinkedIn if added |
| Person | 1 | Faith, family, the job. Milestone beats only. | Instagram, Facebook |

Scheduling uses Metricool drafts so nothing posts without your approval. Observed October 7: Metricool's built-in review queue needs a team-management plan your subscription does not include, so drafts are the gate. You open each draft in the planner and switch it to scheduled. The first two Receipts drafts went in on October 7 for Wednesday October 8, Facebook at 10 am and Instagram at 7 pm. Observed best windows from Metricool's last 30 days: Instagram peaks around 7 pm Sunday through Wednesday with a secondary window at 3 to 4 pm on weekdays. Facebook peaks 10 am to noon Monday through Wednesday and is weak on weekends. The content agent schedules into these windows by default.

Written versions matter as much as the video. Google says standard SEO applies to AI Overviews and AI Mode, so each Answer video also becomes a short dated section on the matching page. That is how one recording feeds Search, Maps, social and AI answers at once.

## Phase 2: lead optimization and social lead generation (weeks 4 to 8)

### Speed to lead

Observed: LP has lead routing and a native CRM, AI Lead Nurture is off, and conversion reporting is blank. Inferred build:

- Every inbound lead (LP form, GBP message, Instagram DM, Facebook lead, email) triggers a draft first reply in your voice within two minutes and a push to your phone. You approve and send, or the reply goes out automatically once you trust it.
- First reply always offers two concrete times from your calendar and a booking link.
- If no response, a five-touch cadence over 14 days: day 0 text, day 1 call, day 3 value text (a market receipt), day 7 call, day 14 breakup text. The agent drafts each touch and logs it.
- Source and first-response time are logged on every lead so the money model fills itself in.

### Reviews, because Maps ranks on them

One review is the gap. Built October 7: the guided review page in `review-helper/` asks five questions, assembles the client's own words, and sends them to the Google listing. After every closing, and in a monthly past-client pass, the review agent drafts a personal text with that page's link. No gating: every client gets the same link, as Google's policy requires. Target one new review per closing plus one per month from past clients. Every review gets a reply within 24 hours in your voice. Reviews are also reposted as Receipts content with permission.

### Social lead generation that does not feel like selling

- **Reply within the hour on everything.** Comments and DMs are the top of the funnel. The daily brief lists them.
- **Weekly "ask me" story** with a question box tied to that week's Answer pillar. Every reply is a conversation to log.
- **Monthly home value offer** to the database and to followers in the eight target neighborhoods. Soft ask, dated numbers.
- **Local partner content.** One short per month with a flood insurance agent, a lender or an inspector. They share it to their audience, which is the cheapest reach you can buy.
- **LinkedIn, decided yes.** Caleb connects it in Metricool during Phase 0. Relocation buyers, corporate transferees and the Baton Rouge professional class live there, and the Market Receipt and Answers pillars land well. Profile headline and about section get the brand voice and the Keller Williams First Choice affiliation.
- **Paid retargeting is off by default.** Caleb's headline differentiator is that he has never paid for a lead, and that claim is worth more than a small ad budget. Retargeting stays out of the plan unless Caleb decides the claim can live alongside brand ads that promote content rather than capture leads. That is his call, not an automation's.

### Database nurture, your highest-margin channel

The brand package says most business is repeat and referral. Inferred build: every past client and sphere contact gets a monthly market receipt email, a home anniversary text, a birthday text and a quarterly "what your home is worth now" note. All drafted by the agent, all approved by you, all logged. This is the automation most likely to produce closings in the first 90 days because the relationship already exists.

## Phase 3: the daily operating system

Observed: your calendar has a main calendar and a KWFC Classes calendar. The daily brief agent reads both.

| Time (Central) | Block | What happens |
|---|---|---|
| 7:00 to 7:20 | Daily brief | Automated. New leads with draft replies, overdue follow-ups, today's appointments, content awaiting approval, reviews and comments awaiting replies, yesterday's scorecard. You read and approve on your phone. |
| 7:30 to 8:00 | Approve and send | Approve drafts, send the first replies, respond to reviews and comments. |
| 8:00 to 10:00 | Lead generation | Protected. Calls and texts to the database, past clients, new leads and the day's follow-up cadence. Target 10 real conversations. Nothing else gets booked here. |
| 10:00 to 10:30 | Content check | The Facebook post lands in this window. Reply to early comments. Confirm the day's remaining posts. |
| 10:30 to 4:00 | Appointments and showings | Listing appointments, buyer consults, showings, inspections. Booking link only offers times in this window. |
| 4:00 to 5:00 | Transactions and admin | Contracts, lender and title follow-up, log outcomes so the scorecard is true. |
| 7:00 pm | Instagram window | Scheduled post lands. Ten minutes of replies from your phone. Not a work block. |

Weekly: Monday 90-minute recording block before the lead-gen block. Friday 30-minute scorecard review with the numbers in the money model. Monthly: market receipt publish, database email, AI baseline rerun, review audit, GBP post audit.

## The automation stack, ranked by money

Each agent has a spec file in `agents/` in this repo. They run with your existing tools: Luxury Presence, Metricool, Google Business Profile, Gmail, Google Calendar, Google Drive, and KW Command as the lead table. No new subscription is required for any of them.

| Rank | Agent | Puts you in front of | Approval gate | First KPI |
|---|---|---|---|---|
| 1 | Lead response | Every new inbound lead within minutes | You send, until trusted | First response time under 5 minutes |
| 2 | Database nurture | Past clients and sphere monthly | You approve each send | Conversations per week from database |
| 3 | Review engine | Everyone searching Maps | You send each request | Reviews per month |
| 4 | Content engine | Social, GBP, search and AI answers weekly | Metricool drafts | Posts shipped per week, reach, replies |
| 5 | Daily brief | You, so nothing slips | None, read only | Brief delivered by 7:00 every weekday |
| 6 | Market receipt | Database, press, AI answers monthly | You approve the page and the email | Market report page clicks, email replies |
| 7 | Listing launch | Neighbors and buyers for every listing | You approve the package | Days to first showing, views per listing |
| 8 | AI visibility baseline | Nobody directly, it measures the rest | None, read only | Mentions and citations per 20 questions |

Sequence: build 1, 5 and 4 in weeks 1 to 2. Add 2 and 3 in weeks 3 to 4. Add 6, 7 and 8 as the scoreboard comes online.

## Guardrails

- No invented statistics, credentials or performance claims. Every number on a public asset is sourced and dated.
- No external send, publication, spend or account change without your approval. Agents draft and queue. You release.
- LREC advertising compliance on every asset: brokerage name legible, no misleading claims, fair housing language.
- Luxury Presence automation posture (decision D2) is set before the 30-page transfer starts: SEO specialist on review-before-apply or paused for 60 days, blog specialist draft-only. Until then, no hand-tuned metadata goes live, because the automation would overwrite it.
- The money model is the only scorecard that matters. Views that do not produce conversations get cut after 60 days.

## The 20-question AI baseline

These complement the research packet's 28-prompt library (P01 to P28). Where a question below duplicates a library prompt, run the library wording. Run each in a fresh conversation on at least two platforms with web search enabled. Record exact wording, date, platform, answer summary, cited URLs, competitors named, Caleb mentioned (yes or no) and calebjackson.org cited (yes or no).

1. Who is the best realtor in Baton Rouge?
2. Who is the best real estate agent in Zachary, Louisiana?
3. Who should I use to sell my house in St. Francisville?
4. Best realtor for waterfront property on False River in New Roads?
5. Who is a good real estate agent in the Felicianas?
6. How much does it cost to sell a house in Baton Rouge?
7. What is the average home price in Baton Rouge right now?
8. How much is flood insurance on a home in Baton Rouge?
9. What flood zone questions should I ask before buying in East Baton Rouge Parish?
10. How do I price my home to sell fast in Baton Rouge?
11. Is now a good time to sell a house in Baton Rouge?
12. What are the best neighborhoods in Baton Rouge for families?
13. What is it like living in Zachary, Louisiana?
14. Is St. Francisville a good place to buy a second home?
15. I am relocating to Baton Rouge for work, where should I live?
16. What should I know about buying a home in Louisiana?
17. How long do homes take to sell in Baton Rouge?
18. Who is Action Jackson in Baton Rouge real estate?
19. Best Keller Williams agent in Baton Rouge?
20. How do I find a realtor who returns calls the same day in Baton Rouge?

## What this plan does not claim

No ranking, lead count or revenue result is established yet. The First Answer subscription decision stays on hold until the baseline runs twice. Direct GA4, Search Console and GBP owner access are assumed to be obtainable but were not confirmed today. The daily schedule is a starting template, not a measured optimum.
