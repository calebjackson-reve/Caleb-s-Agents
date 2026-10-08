# Grok chat for calebjackson.org

A chat bubble on calebjackson.org that answers visitors in Caleb's assistant voice, runs on xAI's Grok, and hands every warm visitor to Caleb as a lead. Three parts:

| Part | What it is | Where it runs |
|---|---|---|
| `worker/` | Cloudflare Worker. Holds the xAI key, allows only calebjackson.org, rate limits by IP, streams replies, saves leads. | Cloudflare, free tier covers it |
| `worker/public/widget.js` | The bubble and chat panel. One script tag. Ivory and ink, one ember accent, Keller Williams First Choice in the header. Served by the Worker itself, so nothing else to host. | Same Worker |
| `test/` | Mock xAI server and a headless-browser demo, so the whole thing can be checked without spending a token. | Your machine |

Proof it works is in `proof/` (screenshots from the local run on 2026-10-07).

## What the bot does and does not do

Does: answers questions about the area, the process and Caleb, keeps Keller Williams First Choice in the first reply, asks what the visitor wants to do and when, collects a first name and mobile number, calls `capture_lead`, and tells them Caleb will text today. Receipts come from `brand/voice-and-visual-rules.md`: 81 closed deals, $25.1M since 2022, every client by referral. Change them in `worker/src/prompt.js` when they change.

Does not: discuss who lives in a neighborhood or school "quality" by population (fair housing), give legal, tax or lending advice, promise prices or outcomes, invent listings or sold prices (Louisiana is non-disclosure), talk commission, or pretend to be a human.

Cost: Grok 4.1 Fast non-reasoning at roughly $0.20 per million input tokens and $0.50 per million output. A typical visitor conversation is a few thousand tokens, so a thousand conversations is a few dollars. Rate limit is 40 messages per IP per hour.

## Deploy, about 15 minutes

You need two accounts and one key. I cannot create these for you.

1. **xAI key.** console.x.ai, create an API key. Keep it in a password manager. Never paste it into a chat or a file in this repo.
2. **Cloudflare account.** Free, at dash.cloudflare.com.
3. **Run one command** on your Mac, from the repo folder:
   ```
   bash grok-chat/deploy.sh
   ```
   It installs, opens the Cloudflare login in your browser once, creates the two storage spaces and writes their ids into `wrangler.toml`, asks for the xAI key (hidden as you paste, goes straight to Cloudflare), deploys, and then tests itself: health check, the widget file, and one real question to Grok. It ends by printing the exact line to paste into Luxury Presence.
4. **Put the line on the site.** Luxury Presence, Settings, Custom Code, footer scripts:
   ```html
   <script src="https://calebjackson-chat.<account>.workers.dev/widget.js" defer></script>
   ```
   The deploy script prints it with your real address filled in.
5. **Test with a fake lead first.** Load calebjackson.org, click "Ask Caleb", say "I'm Test, 225-555-0100", and confirm it lands (next section) before anyone else sees it.

If you would rather do it by hand, the script is short and readable. Model check: `curl https://api.x.ai/v1/models -H "Authorization: Bearer $XAI_API_KEY"` lists live model ids. The default is `grok-4-1-fast-non-reasoning`. Change `GROK_MODEL` in `wrangler.toml` and run `npx wrangler deploy` in `grok-chat/worker` to switch.

If Luxury Presence will not take a custom script on your plan, their support can add it, or the line can load through Google Tag Manager, which the site already has.

Status as of 2026-10-08: the script was dry-run against a stand-in for Cloudflare's command line and the Worker was tested locally. It has not touched a real Cloudflare account, so if a step prints something unexpected, the message tells you which one.

## Leads

Every captured lead is saved in the LEADS KV namespace with name, phone, email, intent, area, timeline, notes, the page they were on, and the transcript. To read them:

```
cd grok-chat/worker
npx wrangler kv key list --binding LEADS
npx wrangler kv key get --binding LEADS "lead:<key from the list>"
```

To get them to your phone the moment they land, set `LEAD_WEBHOOK_URL` to a Zapier or Make webhook that texts you and adds a row to the KW Command import sheet. The Worker POSTs the lead JSON to it. That matches the `lead-response` agent's rule that KW Command is the lead source of truth and Caleb sends the first reply himself.

## Change the voice or the rules

`worker/src/prompt.js` is the whole personality. Edit, then `bash grok-chat/deploy.sh` again (it skips what already exists). The widget greeting is the `data-greeting` attribute on the script tag.

## Run it locally without a key

```
cd grok-chat
node test/mock-xai.mjs &                                   # fake xAI on :9999
(cd widget && python3 -m http.server 8080) &               # demo page on :8080, loads the widget from the Worker
(cd worker && npx wrangler dev --port 8787 \
   --var XAI_API_KEY:test-key \
   --var XAI_BASE_URL:http://localhost:9999/v1 \
   --var ALLOWED_ORIGINS:http://localhost:8080) &
open http://localhost:8080/demo.html
```

`node test/demo.mjs` drives the widget in headless Chromium and writes screenshots to `proof/` (needs Playwright installed).

## Guardrails to keep

- Keller Williams First Choice stays visible in the panel header and in the first reply. LREC advertising rules.
- The footer line says it is Caleb's assistant, not Caleb, with the phone number beside it.
- Allowed origins are only calebjackson.org and www. Anything else gets a 403.
- The key never leaves Cloudflare. The widget only ever talks to the Worker.
