# Reverse Engineer Everything

**Lesson plan for Caleb Jackson, Keller Williams First Choice, and AIRE**

- Source video: https://www.youtube.com/watch?v=dAzs_rU6080 (about 11 minutes)
- Creator: not named in the transcript
- Built from: the full transcript Caleb pasted into the session on 2026-10-12
- Companion skill: [`skills/teardown/SKILL.md`](../../skills/teardown/SKILL.md)

How to read this lesson. Every section is labeled so you can tell what kind of claim it is.

| Label | Meaning |
|---|---|
| **From the video** | Something the creator actually said. Paraphrased, with short quotes. |
| **Applied** | My translation of his point into your business. This is inference, not his claim. |
| **Not verified** | A claim from the video I could not check from here. Treat it as his opinion. |

---

## Part 1. What the video actually says

### From the video

1. **What REA is.** "Reverse Engineer Anything" is an MCP, a plug-in that connects an AI agent like Claude to older reverse engineering tools (Ghidra, Hopper, IDA) plus Chrome DevTools. You ask your agent how a feature works or to rebuild an app. The agent calls REA, REA pokes at the app with those tools, and it hands back three things:
   - **pseudocode**, a plain description of how it works
   - **proof** of what is happening
   - **unknowns**, the parts it could not figure out

   The agent loops on that result ("like a fat merry-go-round") until the app is rebuilt.
2. **Setup is easy.** He told his agent to go download REA and install it. He runs Claude and Codex side by side in a terminal manager called Orca, but says any app works.
3. **The demo.** He asked Claude to rebuild the Mac Preview app with REA, and at the same time asked a second Claude session to rebuild it without REA. The plain version finished first but felt laggy. The REA version took longer, but it was a near match to the real app, and drawing on it was faster.
4. **It is not new.** Ghidra came out in 2019 (released by the NSA). Hopper and IDA are much older. REA just gives agents a simple interface to tools that already existed.
5. **The hype is ahead of the substance.** Big names posted things like "software is done." He says he has seen few really good demos. When a video leads with a GitHub-stars chart, it usually has nothing better to show. Show the demo, not the popularity.
6. **What it means for software.**
   - Most software trends toward open source and commodity, because general models can rebuild apps on the fly.
   - Wrapper apps (tools that wrap Claude or Codex with nicer visuals) get swallowed by the models themselves. "The actual value ladder has moved."
   - Cloning an app to resell runs into intellectual property problems.
   - The real change is that the barrier to **recombining existing ideas** dropped. He combined Minecraft themes with Attack on Titan and made a game.
7. **You may not need REA at all.** Tell your agent "I like this feature in this app, figure out how it works and rebuild it," and it will screenshot, study and rebuild it. Not perfect, but close.
8. **His business lens.** "What new opportunity does this really open versus what doors does this close?"

### Not verified

- His timing claims, for example that plain agents get there in about two thirds of the time, or that Claude Code will absorb most of this within a month or two.
- The demo results are one run on one app. They are an anecdote, not a benchmark.

---

## Part 2. The eight takeaways for your business

### Applied

| # | His point | What it means for you |
|---|---|---|
| 1 | The loop matters more than the tool | Every winning asset (a reel, a listing presentation, a follow-up sequence) can be taken apart and rebuilt. Make "tear it down, then rebuild it" a habit, not a one-off. |
| 2 | Pseudocode, proof, unknowns | Make every research agent in your system report in this format. Blueprint, evidence, gaps. Nothing gets acted on without proof, and unknowns are named instead of guessed. |
| 3 | You often don't need the special tool | Before you buy the next AI tool or SaaS add-on, ask Claude to rebuild the one feature you actually use. |
| 4 | Show the demo, not the stars | Your GitHub stars are views, likes and followers. Judge content by saves, shares, DMs, booked calls and signed agreements. |
| 5 | Old tools plus a simple interface feel new | Your 2026 advantage is packaging what you already know (local market, process, negotiation) into simple, repeatable systems. |
| 6 | The value ladder moved | Anything in AIRE that is only a wrapper on a model is at risk. Build where models can't follow: your data, relationships, local judgment, voice and accountability. |
| 7 | Recombination is cheap now | In video, borrow formats from outside real estate and apply them to homes and neighborhoods. Fresh content comes from combining, not inventing. |
| 8 | Run two versions and compare | He raced two agents on one task. Do the same with hooks, scripts and thumbnails. Make two, publish the better one or test both. |

---

## Part 3. The lesson plan

Six sessions, about 45 to 60 minutes each. Each one ends with something you keep.

### Session 1. The reverse engineering loop (45 min)

- **Goal:** Understand the loop well enough to run it on anything.
- **Key idea:** Ask, take it apart, get a blueprint with proof and unknowns, rebuild, compare, repeat.
- **Exercise:** Pick one thing in your business that worked better than expected in the last 90 days (a post, a listing launch, a client conversation). Write its blueprint in plain words, then the proof that it worked, then what you still don't know about why.
- **You keep:** Your first blueprint, and a one-page copy of the loop for your desk.

### Session 2. Teardown lab for video (60 min)

- **Goal:** Take apart five videos that got real response and turn them into reusable blueprints.
- **Pick five:** three real estate videos (from any market) and two from outside real estate, such as food, fitness, finance or home improvement. Choose them by response in the comments and shares, not view count alone.
- **Take each one apart with the teardown skill:**
  - Hook, first 3 seconds: what you see, what is said, what text is on screen
  - The promise: why a viewer keeps watching
  - Beats with timestamps
  - Shot types and pacing (cuts per 10 seconds)
  - On-screen text and caption style
  - Audio: voice, music, sound effects
  - Length and loop point
  - Call to action and where it lands
  - Comments: what people asked or argued about
- **You keep:** Five blueprints in the Blueprint, Proof, Unknowns format.

### Session 3. Rebuild and race (60 min)

- **Goal:** Turn the blueprints into original Caleb videos.
- **Exercise:**
  1. Choose your two strongest blueprints.
  2. Write an original script for each, built on a real listing, a local neighborhood or a buyer or seller question you hear every week.
  3. For each script, write two hooks (A and B). This is the two-agent race from the video.
  4. Film both. Post one version now and save the other for a test window.
- **Format transplants to try (Applied):**
  - Game-show style "guess the price" on a home tour, with the answer at the end
  - Hot-seat Q and A with a lender or inspector, with questions getting harder
  - "Three things I'd change" walkthrough on a listing (with seller permission)
  - Before and after of staging or a renovation
  - Walk-and-talk explainer about one market stat, with the source on screen
- **You keep:** Two finished videos, four hooks, and a test plan.

### Session 4. Reverse engineer your own wins (45 min)

- **Goal:** Decompile your own best work into a system an agent can run.
- **Exercise:** Take your smoothest closed deal from the last year. Walk it from first contact to closing gift. For each step write what you did, what tool you used, what you said, and how long it took. Mark each step **Me only** (relationship or judgment), **Agent can draft** (I approve), or **Agent can run** (no approval needed, internal only).
- **You keep:** A step-by-step workflow ready to become an AIRE workflow or a Claude skill.

### Session 5. Tool stack audit and the AIRE moat (60 min)

- **Goal:** Stop paying for wrappers and focus AIRE where value is moving.
- **Part A, stack audit:** List every paid tool. For each, write the one or two features you actually use. Then sort:
  - **Core:** keep. It holds data, compliance or a network you can't rebuild (CRM of record, MLS, e-signature, transaction management).
  - **Rebuildable:** Claude could build the one feature you use, for example an open house sign-in form, a buyer consultation one-pager or a simple seller net sheet estimate (always labeled as an estimate and checked against title or escrow numbers).
  - **Redundant:** another tool already does it.
- **Rule:** Build the replacement first, run both side by side for 30 days, and only then decide. Cancel nothing during the lesson itself.
- **Part B, AIRE moat test (Applied):** For every AIRE feature, idea or pitch, ask: *"If Claude shipped this as a built-in feature next month, would anyone still need it from me?"*
  - **Likely yes:** It runs on your data (client history, local comps, notes), your relationships, your local judgment, your voice, or a workflow with accountability and follow-through.
  - **Likely no:** A generic caption writer, listing description generator or chat wrapper with a nicer screen.
- **You keep:** A stack sheet (Core, Rebuildable, Redundant), one pilot rebuild picked, and an AIRE feature list ranked by the moat test.
- **Note:** This repo doesn't describe AIRE's current features, so the moat test is a framework for you to apply. It is not a review of AIRE.

### Session 6. Hype filter and review (45 min)

- **Goal:** Judge results by outcomes, then lock in what worked.
- **Exercise:** Compare the Session 3 videos against your 30-day baseline in Metricool. Use the scorecard in Part 5. Keep the blueprints that moved value metrics, retire the ones that only moved vanity metrics.
- **Hype filter for any new AI tool or trend:**
  1. Is there a real demo, or only a popularity chart?
  2. Can plain Claude do 80 percent of it today?
  3. Does it open a door for my business or close one?
  4. What would I stop doing if I adopted it?
- **You keep:** An updated video playbook and the next month's teardown list.

---

## Part 4. 30-day rollout

| Week | Focus | Done when |
|---|---|---|
| 1 | Learn and set up | Sessions 1 and 2 done. Teardown skill installed. Metricool baseline for the last 30 days saved. Five videos picked. |
| 2 | Teardown and rebuild | Five blueprints. Two videos filmed with A and B hooks. First one posted (after your approval). |
| 3 | Systems | Session 4 workflow written. Stack audit done. One pilot rebuild running side by side with the paid tool. |
| 4 | Review and lock in | Session 6 review. Winning blueprints saved to the playbook. AIRE features ranked by moat test. Next month's list picked. |

---

## Part 5. Scorecard

The creator's warning about GitHub stars applies to your content. Track both columns, but decide using the right one.

| Vanity (watch, don't decide on) | Value (decide on these) |
|---|---|
| Views | Saves and shares |
| Likes | DMs and comments with a real question |
| Follower count | Profile visits that lead to link clicks |
| Trending sounds used | Calls or consultations booked |
| Posting streak | Signed buyer or listing agreements traced to content |

For each video, record the blueprint it used, hook A or B, 7-day value metrics, and one lesson learned.

---

## Part 6. Guardrails

1. **Copy the mechanics, not the content.** Study structure, pacing and format. Never reuse another creator's footage, music, script wording, thumbnails or branding.
2. **Listing media belongs to someone.** Don't reuse another agent's listing photos or video. MLS media rules and photographer copyright apply.
3. **Software licenses.** Many license agreements forbid reverse engineering. The creator himself flagged intellectual property risk. Rebuild features from what a product visibly does, for your own internal use. Don't decompile licensed software to clone or resell it. If a case is unclear, ask a real estate or IP attorney.
4. **Competitor funnels.** Walk through public pages as a visitor and take notes. Don't submit fake leads or fake showing requests. That wastes another agent's time and reflects on you.
5. **Advertising rules.** Follow your state's advertising rules and Keller Williams First Choice brokerage disclosure requirements. Keep every claim accurate. Apply Fair Housing rules to both content and ad targeting.
6. **Sourced numbers only.** Any market stat in a video shows its source and date.
7. **Your approval gate.** Agents draft. You approve before anything is posted, sent, published or paid for.
8. **Branding.** Current work uses Keller Williams First Choice. Rêve is historical and stays out of current materials.

---

## Part 7. Proposed system changes (need your OK)

Not built yet unless marked done.

1. **Done in this repo:** `skills/teardown/SKILL.md`. A Claude skill that runs the reverse engineering loop on any video, page, presentation, email sequence or software feature, and reports in the Blueprint, Proof, Unknowns format.
2. **Done:** `CLAUDE.md` makes Blueprint, Proof, Unknowns the standard output format for every research or analysis agent in this repo.
3. **Done (skill), schedule pending:** `skills/teardown-tuesday/SKILL.md`. A weekly "teardown Tuesday" routine that pulls last week's Metricool numbers, takes apart your top and bottom posts, and drafts next week's two hooks for your review. It would only create drafts and never post.
4. **Proposed:** Turn the Session 4 workflow into an AIRE workflow or a Claude skill once you've written it.
5. **Done:** "Tool Stack Audit" Google Sheet in Caleb's Drive with Core, Rebuildable and Redundant columns, ready to fill in.

---

## Appendix. Copy-paste teardown prompt

Use this in any Claude session if the skill isn't loaded.

```
Tear this down for me: [link, transcript or screenshots]

Why I picked it: [what result it got]
What I want to rebuild: [a video for my listing at ___ / a page / a sequence]

Report back in three parts.
1. Blueprint: how it works, step by step, in plain words. For video include hook,
   promise, beats with timestamps, pacing, on-screen text, audio, length and CTA.
2. Proof: the evidence for each part (timestamps, quotes, metrics, comments).
3. Unknowns: what you can't tell from what I gave you.

Then write two original versions (A and B) for my business as a REALTOR with
Keller Williams First Choice. Copy the mechanics, not the content. Use my voice:
warm, direct and natural, no em dashes, no semicolons, no corporate polish.
Don't post or send anything.
```
