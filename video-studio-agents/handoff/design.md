# Design: video studio dashboard

Date: 2026-11-06. Written by the video-designer agent against handoff/plan.md and handoff/research.md.
Mockup: `handoff/dashboard-mockup.html` (the task brief fixed this path, the agent spec's older `handoff/mockup/index.html` path is superseded). Screenshots: `mockup-phone.png`, `mockup-desktop.png`.

## Confirmed / Historical / Inference

- **Confirmed**: the pipeline steps and stack (research.md Blueprint 1 to 8), the approval gate and Metricool draft-for-review path (research.md step 7, CLAUDE.md), the cost figures used in the meter (research.md Proof and cost estimate), that the mockup opens clean (Playwright check below).
- **Historical**: course-scope context carried from plan.md. None of it changes the design.
- **Inference**: Caleb's review habits (phone between showings, Mac mini a few times a week) come from the agent spec, not from Caleb directly. The $110 budget ceiling in the meter is the top of research.md's estimate, not a number Caleb set. The two-tap claim assumes the dashboard is saved to his phone home screen. All flagged inline where they shape a decision.

### Blueprint

How the dashboard works, screen by screen. It is a control room. Claude on the Mac mini does the work, the dashboard shows state and takes decisions. It never edits video.

**1. Shell.** One page, six tabs: Queue, Review, Start a video, Costs, History, Prompts. A status bar above the tabs gives bottom line up front: Mac mini online or not, how many videos wait on Caleb, spend so far this month. KW First Choice red header on every screen, brand is ambient, not a setting.

**2. Queue (home screen).** One card per video in flight. Each card shows address or title, format, length, platforms, the current stage in plain words ("Making the voiceover"), who owns the next move (badge: "Your turn" in KW red, "Claude working" in gray, "Scheduled" in green, "Needs a fix" in red), how long it has sat, and a progress bar. Cards waiting on Caleb sort to the top. A "Your turn" card carries a Review now button, so review is two taps from the phone home screen: open the app, tap Review now (Inference: assumes home-screen bookmark). Stages map 1:1 to research.md's Blueprint: ingest, script (step 2), visuals (step 3), clips (step 4), voice (step 5), assemble and captions (step 6), review (Caleb), scheduled and published (step 7).

**3. Review.** The decision screen. Top to bottom: address and per-video cost so far, the 9:16 cut, then Approve and Send back side by side (the two taps), Kill below as a quiet text button, then hook, script and caption to read against the video. Approve pushes the post to Metricool as a draft for review, it does not publish, Caleb's final OK happens in Metricool per the approval gate (research.md step 7, CLAUDE.md). The confirmation toast says so, no false "published" signal. Send back opens one free-text box, plain words, no change-request taxonomy. Kill archives assets for 30 days rather than deleting, because a killed reel sometimes comes back when the listing gets a price drop (Inference).

**4. Start a video.** Format chips (listing reel, market update, client explainer, promo), a source picker (an active MLS listing, a folder of clips on the Mac mini, or a bare topic), optional notes, length chips, platform chips. Before the hand-off it shows an estimated cost for the run built from research.md's per-unit prices (about $1.10 to $1.60 for a 3-clip Kling reel), and states the rule: anything estimated over $5 asks Caleb before it runs. That is the "warning before anything expensive" requirement made concrete, the $5 line is Inference and tunable. A fixed brand-lock panel at the bottom states that KW First Choice colors, fonts, logo and lower thirds are locked and not editable here. No brand picker exists anywhere, so Rêve assets cannot be selected because there is no selector.

**5. Costs.** Monthly meter first: spend against budget with a bar, then a per-tool breakdown matching the stack exactly (fal.ai, ElevenLabs, Gemini images, Ideogram, Metricool, ffmpeg and whisper at $0.00 shown deliberately, the free local step is a feature). Below, per-video cost this month, including in-progress videos, so an expensive Veo-heavy video is visible before month end. Data source: the local cost log each run writes (research.md Blueprint step 8 and Claude checklist item 4).

**6. History.** Published videos with platform, date, and performance pulled nightly from Metricool analytics. One plain-words learning note per row ("slow hook, noted") because the point of history is feeding the next script (research.md step 7 loop, agent spec History requirement).

**7. Prompts.** The working prompt library: hook templates, the minimal-motion Kling prompt, image prompts. Each card names the prompt, how often it ran, and what it produced. Edit opens the raw text. Edits here are drafts too, Claude confirms before the next run uses a changed prompt (approval gate applied to prompts, Inference on whether Caleb wants that friction).

**8. States.** Every panel has a designed empty, loading, error and waiting-on-Caleb state:

- **Empty queue**: friendly, one line, a Start a video button. Not an error.
- **Generation failed**: a red card naming the video, the step, the cause in plain words ("fal.ai rejected the kitchen photo, too low resolution"), what it cost (nothing, failed calls are not billed as successes), what Claude already did, and two buttons: see the input, retry now. The queue card beneath shows "Needs a fix" and a paused bar.
- **Out of credits**: an amber card naming which wallet ran dry (ElevenLabs in the mock), which videos are stuck at which step, that nothing else is blocked, and the three ways out: wait for reset, top up, or switch to the Higgsfield fallback voice (research.md names Higgsfield voices as the voice fallback). Two of those are buttons.
- **Metricool rejection**: when the draft push fails (API error, disconnected brand, plan limit), the video drops back to "Your turn" with a red note: "Metricool would not take the draft: [reason]. The video is fine. Fix the Metricool connection or export the file and post by hand." A Download file button is the escape hatch so one SaaS hiccup never strands a finished video (Inference on the exact failure modes, Metricool MCP error surface untested).
- **Offline Mac mini**: the status dot goes red, a banner says when it was last heard from, that nothing is lost and work resumes where it stopped, and what still works remotely (reviewing finished cuts already uploaded, approving Metricool drafts). Queue is marked stale with its age.
- **Loading**: skeleton cards in queue, a spinner with the stage name on review. Never a blank screen.
- **Waiting on Caleb**: not an error state, it is the "Your turn" badge plus sit time, and sit time over 24 h turns the time amber (Inference).
- **Empty history and empty prompts**: one line each ("Nothing published yet" / "No saved prompts yet, Claude adds them as videos run").

**9. Data plumbing.** The dashboard is a static page the pipeline regenerates plus a small JSON state file per video, all in git-ignored output folders per the client-data rule. Queue and costs read the run logs (research.md step 8). History reads a nightly Metricool analytics pull. Actions (approve, send back, kill, start) write an intent file that Claude on the Mac mini picks up, which is also why the offline state must be honest: with the Mac down, intents queue but nothing executes.

### Proof

- Control room not editor, phone-first, two-tap review, the seven minimum panels, plain words, state-everything rule: agents/video-designer.md, "Who uses it", "What the dashboard must do", "Design rules" (lines 10 to 31).
- Stage list matches the pipeline: research.md Blueprint steps 1 to 8 (lines 16 to 24). Queue stages are those steps renamed to plain words per the no-jargon rule.
- Approve routes to a Metricool draft, never direct publish: research.md step 7 and Proof step 7 (createScheduledPostForReview observed connected), CLAUDE.md approval gate.
- Cost meter line items and the $41.20 / $110 framing: research.md "Estimated monthly cost range" (fal $15 to $60, ElevenLabs $22, images $1 to $5, Metricool $0 to $22, local $0, total $55 to $110) and per-clip prices in Proof steps 3 to 5. Per-reel estimate of $1.10 to $1.60 derives from Kling at about $0.35 per 5 s clip times 3, plus voice and images.
- Higgsfield voice as the out-of-credits fallback: research.md "Voice pick" (line 100).
- History performance from the scheduler: agent spec History bullet, research.md step 7.
- Brand lock wording: CLAUDE.md (no Rêve), agent spec Brand lock bullet.
- Design heuristics consulted: two-tap and bottom-line-up-front follow the agent spec directly. Tap targets at 44 to 48 px minimum and visible system status follow Apple's Human Interface Guidelines on controls and Nielsen's first usability heuristic (visibility of system status), both from training knowledge, not fetched this session, labeled not verified against the live pages.
- Mockup verification, run 2026-11-06 with the preinstalled Playwright and chromium: loaded `dashboard-mockup.html` at 390 px (deviceScaleFactor 2) and 1280 px, clicked through tabs and the failed, offline and normal queue states. Result: zero console errors, zero page errors, no horizontal scroll at 390 px. Screenshots saved to handoff/mockup-phone.png and handoff/mockup-desktop.png. PASS.

### Unknowns

- Whether Caleb will actually review from a home-screen bookmark, and whether two taps holds on his phone. Needs him to try it once.
- The $5 pre-approval threshold and the $110 budget ceiling. Research.md names the budget ceiling as unknown (its Unknowns list), the meter needs his real number.
- Metricool MCP failure modes. The rejection state is designed from generic API failure patterns, the real error surface is untested.
- How the dashboard is hosted and how phone actions reach the Mac mini when Caleb is out of the house (local file, Tailscale, small web host). The intent-file pattern works for all three but the choice is open and affects the offline state's honesty window.
- Whether Caleb wants prompt edits gated or instant. Gated is designed in, he may find it annoying.
- Real Kling output quality, inherited from research.md's biggest risk. If Veo becomes the default, the per-reel estimate in Start a video roughly triples and the $5 line triggers often.

---

## Recommendations

1. Decide hosting first. A Tailscale-served page from the Mac mini keeps client data off any third party and matches the CLAUDE.md data rule, at the cost of the dashboard dying with the Mac. If that trade stings, split it: state page on a static host with no client data, actions through Tailscale only.
2. Set the real budget ceiling and the pre-approval threshold with Caleb before the build, both are one-line config.
3. Build the queue, review and cost panels first. History and prompts can read from flat files a week later, nothing blocks on them.
4. In the judge round, test the review flow on an actual phone between two real interruptions. The design bets everything on that moment.
5. Keep the mockup's one-page tab structure in the build. Six routes would add nothing on a phone.
