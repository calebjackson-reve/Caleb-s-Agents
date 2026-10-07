# Grok chat for calebjackson.org

A chat bubble on calebjackson.org that answers visitors in Caleb's assistant voice, runs on xAI's Grok, and hands every warm visitor to Caleb as a lead. Three parts:

| Part | What it is | Where it runs |
|---|---|---|
| `worker/` | Cloudflare Worker. Holds the xAI key, allows only calebjackson.org, rate limits by IP, streams replies, saves leads. | Cloudflare, free tier covers it |
| `widget/widget.js` | The bubble and chat panel. One script tag. Ivory and ink, one ember accent, Keller Williams First Choice in the header. | Luxury Presence custom code |
| `test/` | Mock xAI server and a headless-browser demo, so the whole thing can be checked without spending a token. | Your machine |

Proof it works is in `proof/` (screenshots from the local run on 2026-10-07).

## What the bot does and does not do

Does: answers questions about the area, the process and Caleb, keeps Keller Williams First Choice in the first reply, asks what the visitor wants to do and when, collects a first name and mobile number, calls `capture_lead`, and tells them Caleb will text today. Receipts come from `brand/voice-and-visual-rules.md`: 81 closed deals, $25.1M since 2022, every client by referral. Change them in `worker/src/prompt.js` when they change.

Does not: discuss who lives in a neighborhood or school "quality" by population (fair housing), give legal, tax or lending advice, promise prices or outcomes, invent listings or sold prices (Louisiana is non-disclosure), talk commission, or pretend to be a human.

Cost: Grok 4.1 Fast non-reasoning at roughly $0.20 per million input tokens and $0.50 per million output. A typical visitor conversation is a few thousand tokens, so a thousand conversations is a few dollars. Rate limit is 40 messages per IP per hour.

## Deploy, about 20 minutes

1. **xAI key.** console.x.ai, create an API key. Keep it in a password manager, never in this repo.
2. **Cloudflare.** Free account at dash.cloudflare.com. Then on your Mac:
   ```
   cd grok-chat/worker
   npm install
   npx wrangler login
   npx wrangler kv namespace create RATE
   npx wrangler kv namespace create LEADS
   ```
   Paste the two ids it prints into `wrangler.toml` where it says REPLACE_WITH.
3. **Secrets.**
   ```
   npx wrangler secret put XAI_API_KEY        # paste the xAI key
   npx wrangler secret put LEAD_WEBHOOK_URL   # optional, see Leads below
   ```
4. **Deploy.** `npx wrangler deploy` prints a URL like `https://calebjackson-chat.<account>.workers.dev`. Open `<that url>/health` and you should see `{"ok":true,...}`.
5. **Model check, optional.** `curl https://api.x.ai/v1/models -H "Authorization: Bearer $XAI_API_KEY"` lists live model ids. The default is `grok-4-1-fast-non-reasoning`. Change `GROK_MODEL` in `wrangler.toml` and redeploy to switch.
6. **Put the widget on the site.** Host `widget/widget.js` somewhere public. Simplest: upload it in Luxury Presence's file manager, or drop it in this repo and serve it from GitHub Pages. Then in Luxury Presence, Settings, Custom Code (header or footer scripts), add:
   ```html
   <script src="https://calebjackson.org/chat/widget.js" data-endpoint="https://calebjackson-chat.<account>.workers.dev" defer></script>
   ```
   Replace both URLs with yours. Save, load the public site, click "Ask Caleb", send a message.
7. **Test with a fake lead first.** Say "I'm Test, 225-555-0100" and confirm it lands (next section) before telling anyone the bot is live.

If Luxury Presence will not take a custom script on your plan, their support can add it, or the widget can be loaded through Google Tag Manager, which the site already has.

## Leads

Every captured lead is saved in the LEADS KV namespace with name, phone, email, intent, area, timeline, notes, the page they were on, and the transcript. To read them:

```
cd grok-chat/worker
npx wrangler kv key list --binding LEADS
npx wrangler kv key get --binding LEADS "lead:<key from the list>"
```

To get them to your phone the moment they land, set `LEAD_WEBHOOK_URL` to a Zapier or Make webhook that texts you and adds a row to the KW Command import sheet. The Worker POSTs the lead JSON to it. That matches the `lead-response` agent's rule that KW Command is the lead source of truth and Caleb sends the first reply himself.

## Change the voice or the rules

`worker/src/prompt.js` is the whole personality. Edit, then `npx wrangler deploy`. The widget greeting is the `data-greeting` attribute on the script tag.

## Run it locally without a key

```
cd grok-chat
node test/mock-xai.mjs &                                   # fake xAI on :9999
(cd widget && python3 -m http.server 8080) &               # demo page on :8080
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
