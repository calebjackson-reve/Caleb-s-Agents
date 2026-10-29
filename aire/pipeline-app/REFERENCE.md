# Reference: the two "Jarvis" reels Caleb sent (2026-10-22)

Caleb sent a still image of a Jarvis command center and two Instagram reels as the look, motion and voice reference for Pipeline. The reels could not be opened from the cloud session (Instagram login wall). A Claude session on Caleb's Mac watched them in Chrome, transcribed the voice with Chrome's speech recognition and read the on-screen text, then wrote up the notes below. Caleb pasted that write-up into the cloud session, which folded the confirmed pieces into the app. Report format per `CLAUDE.md`: Blueprint, Proof, Unknowns.

### Blueprint

How the reels' setup works, step by step.

1. A full-screen web dashboard runs in a browser on a wall TV. Dark navy, cyan monospace type, thin glass panels with corner brackets.
2. The center is a 3D particle "neural network". Color-coded clusters pulse and shoot streaks while the assistant talks.
3. A status chip in the top right flips between LISTENING and THINKING, next to a clock and a small orb.
4. The bottom bar carries the live transcript line and a "listening for the wake word" status.
5. The user says a wake word ("Hey Zero"). Speech goes to text, the assistant answers by voice, and data cards slide in as it speaks. The numbers on the cards match what the voice says.
6. Behind it: one main agent (Claude) with a connector per business tool, handing work to named sub-agents (leads, ads, content, support, dev). Each connector feeds the cards.
7. The second reel's build method: give Claude a reference image of the dashboard, let it one-shot the page, use voice mode instead of typing, add a text-to-speech voice (ElevenLabs, British), connect the data tools (RevenueCat, a posting tool, Meta ads, Gmail), and define sub-agents with their own skills.

### Proof

From the Mac session's transcript and frames. Labeled per the repo rule.

- Post 1 (jonathonmj, Reel, May 30; caption tags #claudecode and #jarvis). From the source: the particle network, the LIVE and PLANNED "brain region" module list on the right (prefrontal, hippocampus, language, cerebellum, reflex arc), the LISTENING / THINKING chip, the transcript bar, cards sliding in, blue bias lighting, a mic on the TV. The voice reported: last 7 days 4 new clients, $11,500 new monthly revenue, 847 Discord members; yesterday 23 leads found, 18 cold emails drafted, 11 sent, 4 replies, 1 call booked; ads $487 spent at 3.8 return; organic 3 pieces posted, 84,000 reach; an insight card "competitor's AI is 18 months ahead". The on-screen cards matched the voice.
- Post 2 (chandlerintelligence, July 12, repost of @lukebuildsai). From the source: reference image, one-shot build in about 5 minutes, voice mode, ElevenLabs British voice, browser access, RevenueCat MCP (2,459 downloads, $4,289 revenue shown), a posting MCP for 3 short videos a day, Meta ads MCP, Gmail MCP with FAQs in markdown for about 90% of support, custom sub-agents ("Tom the developer agent"). Closing line: "Comment JARVIS for the full list."
- The Mac session played both at low volume, paused and re-muted them, closed its tab, and did not comment on either post.

### Unknowns

- Post 2's ad spend ($475) and return (1.5x) came from speech recognition only. Approximate.
- The last seconds of Post 2's recommendation line were unclear.
- How Post 1's voice loop is wired (which STT, which TTS, where the LLM sits) is not shown. Commenters say the demo is scripted and edited. Not verified either way.
- The "full guide" behind the comment-JARVIS funnel was not read.

## What Pipeline took from this (inference, built 2026-10-22)

One system, no parallel display (Caleb, 2026-10-19), so the pieces went into Pipeline itself:

- `static/core.js`: the particle network in the center of the command center. Five clusters, one per band, sized by the feed's counts. Edges, streaks, a radar sweep. Energy follows the voice state.
- `static/voice.js`: the voice loop in the browser. Wake word "hey Pipeline" (also "hey Jarvis"), Chrome's speech recognition for listening, speechSynthesis for talking (a British voice when the Mac has one). Intents are plain word matching on the feed, no LLM, so nothing is invented: brief, who texted me, touches, tasks, deals, leads, compose, refresh, status, stop. Where there is no microphone the same commands can be typed in the sidebar.
- The status chip shows LISTENING, THINKING or SPEAKING while the loop runs. The bottom pill is the voice toggle and transcript line. The core panel shows a telemetry ticker (feed read, drafts loaded, every action) and the last thing heard or said.

Not taken: the sub-agent orchestration (AIRE already has the CRM engine, the follow-up library, the Command reader and the enrichment pipeline as its "agents"), ElevenLabs (speechSynthesis first; swap in a paid voice later if Caleb wants), and any LLM in the voice loop (a question Pipeline cannot answer from the feed gets "I didn't catch that", by design).
