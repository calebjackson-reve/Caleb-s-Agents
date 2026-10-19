---
name: cx-voice-agent-build
description: Builds a phone-callable voice agent in stages, a local web MVP on a realtime voice API with a calendar tool and confirmation step, then a Twilio number routed through a SIP trunk to the provider's realtime endpoint with a small cloud server (Modal) and the same tools, with keys kept in .env. Use when Caleb says "build an after-hours phone agent", "AI should answer listing calls", "book showings by phone", "voice assistant that adds to my Google Calendar", or wants AIRE to capture leads by phone after a fit check with cx-voice-agent-fit-matrix.
---

# After-hours voice agent build

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 9 (https://www.youtube.com/watch?v=DJZISqryDfw&t=9975s)

## What Nick teaches

Nick uses OpenAI's **GPT Realtime API** ("the simplest out-of-the-box solution I've found that still lets you get into the nitty-gritty"). Model names he used: GPT Realtime 2.1 and 2.1 Mini, "the current best at the time, there may be a 2.2 or 2.5 when you watch." Pricing is per text, audio and image token. The playground exposes voice (he picked Marin), automatic turn detection (threshold 50, prefix padding 300 ms, silence duration 500 ms which he cut to about a third of a second for snappiness), reasoning effort (minimal for speed, extra high when he asked it a Fermi estimate about alien life). The model does not know its own settings.

### How a phone call reaches an agent

Prospect dials on the public phone network (PSTN). Twilio converts that to an internet signal via SIP (session initiation protocol). Traditionally the call lands in a room (LiveKit) that talks to an agent server, which talks to the realtime API, which calls other APIs like Google Calendar. OpenAI now has a native SIP endpoint, so Nick skipped LiveKit: Twilio number, SIP trunk, OpenAI SIP endpoint, with a small server on **Modal** to orchestrate. A web app version skips the phone leg entirely and talks to the agent directly.

### Stage 1: local web MVP (about 7.5 minutes to first version)

1. Create an API key. "It really doesn't like keys in plain text." Ask the agent to make a `.env` file, paste the key in there, ask "is there anything in there?" to confirm it can read it. It will suggest rotating since it saw it.
2. Google Calendar cannot use a plugin inside a hosted app, so ask the agent: "I need to use my Google Calendar credentials in a local app to create events. Tell me how and walk me through it." It walks you through a Google OAuth desktop client, `credentials.json` and `token.json`.
3. Use the smartest model and make it think hard. Dictated brief: one page with a connect button, connect to the realtime backend, talk to it like a personal assistant, add events to Google Calendar via tool calling ("get Sam in the calendar at 2 p.m. for a one-on-one"), a confirmation step before writing, keys in `.env`, time zone given, "spend a lot of time and energy, run it and serve it, and add lots of visual demo and test features so I can see tool calls and errors."
4. First run errored (invalid multipart form). "Fix it, and test this yourself." The agent clicked through its own app in the browser.
5. Polish pass: transcript streamed in rather than dumped per turn, light mode, an organic equalizer waveform instead of a bouncing circle, faster responses, and "test it yourself, generate voice snippets and feed them in, I don't want to talk to it." Result: a clean app, a system status card (realtime model, calendar connected, confirmation guard), a live transcript and a diagnostics panel. Booking "meeting with Samantha tomorrow at 2 p.m." staged, confirmed, then written to the calendar.

### Stage 2: phone agent

1. Twilio: sign up, buy a local voice-only number (monthly cost, more capabilities cost more). SMS needs A2P registration. Skip STIR/SHAKEN, branded calling and CNAM for a demo.
2. Prove the call fires an event: set the number's voice webhook to a webhook.site URL, call it, see the POST with caller data. "You get a frightening amount of data from a phone call."
3. Modal: sign up ($30 a month free compute at the time, may have changed), Settings, API tokens, new token, add to `.env`. Also add the OpenAI project ID, Twilio account SID and auth token. Nick does this off screen.
4. Pre-written brief: "Build a phone-callable voice assistant like the web one but no calendar for now. I call my Twilio number, GPT Realtime picks up, I talk. Structure: Twilio number, SIP trunk, OpenAI native SIP endpoint. Read the OpenAI realtime SIP docs first. Put it in `voice-phone-agent/`. Keys are in `.env`. Deploy on Modal. On the `realtime.call.incoming` event, accept the call."
5. First two calls failed ("your call cannot be completed"). Paste the error, the agent reads logs and fixes. Third call connected: "Hi Nick, I'm Relay." There was latency on interruptions.
6. Add the calendar tool: "weave in calendar like the web app, you already have the OAuth files, test as much as possible before I call." The agent reused the earlier credentials. Booking by phone worked and showed in Google Calendar.
7. Prompt fixes: use the fastest cheapest model, and stop saying the caller's name every sentence.

Safety note: the provider added extra review on these requests because phone systems are used for scams. Expect slower turns and occasional refusals on real telephony work.

### Claude Code

The build steps are tool-agnostic. Claude Code can write the same Modal server, Twilio config and `.env` handling. The realtime voice provider is a choice. Keep the provider's SIP docs in `references/` so the agent reads them first.

## Step by step

1. Pass the fit check (`cx-voice-agent-fit-matrix`). Write the allowed actions and hand-off rules.
2. Stage 1: `.env` with keys, calendar OAuth files, web MVP brief with confirmation guard and diagnostics. Have the agent self-test. Polish once.
3. Stage 2: buy the Twilio number, verify the webhook fires, add Modal and Twilio credentials to `.env`, feed the phone brief, call until it connects, add tools, fix the prompt.
4. Write the system prompt for the agent: who it is, what it may do, what it must hand off, how to end the call, no name repetition.
5. Log every call: transcript, tool calls, outcome, to a folder or the CRM.
6. Review the first 50 calls before leaving it on overnight.

## Templates / prompts

Web MVP brief:

```
Build me a simple local voice assistant demo. One page with a connect button. On connect, open a session with [realtime voice model]. I talk to it like an assistant. It can add events to my Google Calendar via tool calling, with a confirmation step before it writes. Keys are in .env. Calendar OAuth client and token are in this folder. My time zone is America/Chicago. Add visual demo features: status card, live streamed transcript, tool call log, error panel. Run it, serve it, and test it yourself before handing it to me.
```

Phone brief:

```
Build a phone-callable voice assistant based on the web one. I call my Twilio number, the realtime model picks up, I talk. Structure: Twilio number, SIP trunk, provider native SIP endpoint. Read the provider's realtime SIP docs first. Folder: voice-phone-agent/. Credentials in .env: OPENAI_API_KEY, OPENAI_PROJECT_ID, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, MODAL_TOKEN. Deploy the server on Modal. On the incoming call event, accept and connect. Tell me when to call.
```

Agent system prompt skeleton:

```
You answer after-hours calls for Caleb Jackson, REALTOR with Keller Williams First Choice, St. Francisville and Baton Rouge.
You may: answer facts from the listing sheet provided, take name, number, email, timeframe, and book a showing slot after confirming date and time.
You must hand off and take a message if the caller mentions offers, price, commission, contracts, attorneys, or asks for Caleb directly.
Keep answers short. Confirm before booking. Use the caller's name at most once. End by stating what happens next.
```

## Pitfalls Nick calls out

- Keys in chat or code. `.env` only, rotate anything the agent saw in plain text.
- Asking a weaker model to design the integration. Use the smartest model, thinking hard.
- Waiting for yourself to test. Have the agent test with generated voice snippets.
- Expecting phone calls to connect first try. "About 30% chance." Paste the error and iterate.
- The agent repeating the caller's name.
- Latency. Use the fastest model and minimal reasoning for the call loop.
- Provider safety reviews slowing telephony builds.

## How Caleb should use this

- After-hours listing line: callers get property facts and can book a showing. Lead details land in the CRM for Caleb's morning follow-up.
- Open house RSVP line with directions and a reminder booked to the calendar.
- Showing confirmations the day before.
- Everything else routes to a message and a text to Caleb.
- Buying a Twilio number, enabling Modal billing, API spend and going live on a public number all need Caleb's approval before running.

## Verification

- Stage 1: a browser session books a confirmed test event that appears in Google Calendar.
- Stage 2: a real call from Caleb's phone connects, books an event with confirmation, and the event appears in the calendar.
- A transcript and tool log exist for each test call.
- No key appears outside `.env`, and the hand-off rules fire when tested with the trigger words.
