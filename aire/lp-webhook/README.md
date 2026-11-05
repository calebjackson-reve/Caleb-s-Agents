# Luxury Presence leads, pushed to the CRM

Research done 2026-11-04 from Luxury Presence's public developer docs and help center. The build: Luxury Presence pushes every lead event to a Google Apps Script receiver that writes the Website leads sheet, and `crm.py import-website-leads` turns each one into a contact, a note and a call task in the AIRE CRM. No new database or account, and nothing polls.

## Blueprint

1. **Luxury Presence has a real API.** Base `https://api.luxurypresence.com`, one header `x-api-key`, keys made at app.luxurypresence.com under Profile, API keys, by an account admin. The limit is 500 requests a minute. Resources: agents, teams, offices, media, and webhooks.
2. **Leads come out through one webhook event, `leads`.** You register a URL once (`POST /crm/v1/webhooks` with `name`, `url`, `events: ["leads"]`, optional `secret`, `headers`, `isActive`). After that, every lead activity is pushed to the URL as JSON: `activityType` says what happened (SIGNUP, CONTACT_INQUIRY, HOME_SEARCH, ADD_FAVORITE, VIEW_LISTING, HOME_VALUE and so on), `isNewLead` says whether the person is new, and the body carries the lead (`leadId`, `leadEmail`, `leadFirstName`, `leadLastName`, `leadPhoneNumber`, `leadSource`, `leadOrigin`, `leadType`, `leadTags`, `formCustomFields`), the listing when there is one (`activityListingAddress`, City, State, Zip, Price), `activitySourceUrl` and `activityAt`.
3. **Deliveries are signed.** Headers `x-lp-delivery-id` (one per delivery, for dedupe), `x-lp-timestamp` (ms), `x-lp-signature-version: v1`, and `x-lp-signature`, an HMAC-SHA256 hex of `timestamp + url + JSON.stringify(payload)` with the secret you gave at registration. No secret, no signature.
4. **The receiver is `website-rebuild/functions/lp-webhook.gs`.** A standalone Apps Script web app that writes the same columns the site forms use into the Website leads sheet, so `crm.py import-website-leads` picks Luxury Presence leads up with no new code. Hand-raise events (sign-up, contact inquiry, home value, showing request, info request, or any event with `isNewLead`) become lead rows and an email to Caleb. Searches, favorites and views go to an `LP activity` tab in the same sheet. Dedupe is on `leadId + activityType + activityAt`.
5. **Apps Script cannot read request headers**, so the signature and delivery id never reach it. The check it can do is a secret token in the URL (`?k=...`), compared with a Script Property. `aire/lp-webhook/register.py` registers that URL, dry run until `--yes`, with `LP_API_KEY` from the environment. If Caleb later wants the signature verified, a Cloudflare Worker in front of the script can do it with `register.py sign` as the test vector; `api/lead.js` is the pattern.
6. **KW Command stays a browser job.** Command has no public API. `aire/command-reader/command_reader.py` already keeps Command logged in on the Mac in the AIRE Chrome profile (`~/.aire/chrome-aire`), signs back in with the Keychain password and the emailed code, and reads it on a schedule. The same pattern covers Luxury Presence if the API key is ever refused: open app.luxurypresence.com in that profile, export leads, drop the CSV in the `LP leads` tab. With the webhook working, that is the fallback, not the plan.

## Proof

- API base, `x-api-key` header, 500 requests a minute, key creation under Profile, API keys (admin only): docs.luxurypresence.com/docs/getting-started.md, fetched 2026-11-04. From the source.
- Webhook create body (`name`, `url`, `events`, `secret`, `headers`, `isActive`) and the list, get, update, delete endpoints under `/crm/v1/webhooks`: docs.luxurypresence.com/reference/webhookcontroller_createwebhook.md and the sibling reference pages, fetched 2026-11-04. From the source.
- The example payload with `activityType`, `isNewLead`, the lead fields and the listing fields: docs.luxurypresence.com/reference/webhookcontroller_examplewebhookpayload.md and docs/webhook-events.md, fetched 2026-11-04. From the source. The field list in `lp-webhook.gs` is copied from it.
- Signing scheme (`x-lp-signature` = HMAC-SHA256 hex over `timestamp + url + JSON.stringify(payload)`, `x-lp-delivery-id`, `x-lp-timestamp`, `x-lp-signature-version: v1`, unsigned when no secret): docs.luxurypresence.com/docs/webhook-signature-verification.md, fetched 2026-11-04. From the source. `register.py --test` proves the Python signing matches a by-hand HMAC of that string.
- Zapier offers the trigger "New Lead or Lead Activity" for Luxury Presence over OAuth: Zapier's integration page, seen 2026-11-04. From the source. It is the same event stream, with a Zapier bill attached.
- Apps Script `doPost` receives `e.postData` and `e.parameter`, not headers: Google Apps Script web app docs, long-standing behavior. From the source.
- The existing lead path (`lead-webhook.gs` writing the sheet, `crm.py import-website-leads` reading it, mark column `crm_import`): this repo, `website-rebuild/functions/README.md` and `aire/crm/crm.py` lines 1564 to 1660.
- The receiver's mapping was run in node with a made-up payload on 2026-11-04: phone digits only, email trimmed, kind `lp contact inquiry`, custom form fields in the message. `register.py --test` passes 9 checks, `create` without `--yes` prints the request and sends nothing.

## Unknowns

- Whether Caleb's Luxury Presence plan includes API keys. The docs say admin accounts make them; they do not say which plans. Check at app.luxurypresence.com, Profile, API keys.
- The full list of `activityType` values. The docs show examples, not a closed list, so `LEAD_EVENTS` in the script may need one or two more names once real events arrive. Anything unlisted still lands in the `LP activity` tab, nothing is dropped.
- Retry behavior on a non-200 reply and whether the delivery id repeats on retry. Dedupe on the body covers it either way.
- An older help-center FAQ says "We do not support webhooks". The developer docs published after it do. Treat the docs as current and the FAQ as stale, and confirm with the first real delivery.
- Whether the update endpoint is PUT or PATCH. `register.py` does not use it.

## Set it up (10 minutes, on the Mac)

1. script.google.com, New project, paste `website-rebuild/functions/lp-webhook.gs`. Project Settings, Script Properties, add `LP_SECRET` with a long random string (`openssl rand -hex 24`). Run `selfTest` once from the editor to authorize and prove the sheet write (it adds one made-up row to the `LP activity` tab).
2. Deploy, New deployment, Web app, Execute as Me, Who has access: Anyone. Copy the web app URL.
3. In the shell:
   ```
   export LP_API_KEY=...   # from app.luxurypresence.com, Profile, API keys
   python3 aire/lp-webhook/register.py list
   python3 aire/lp-webhook/register.py create --url "<web app url>?k=<LP_SECRET>"
   python3 aire/lp-webhook/register.py create --url "<web app url>?k=<LP_SECRET>" --yes
   ```
4. Submit a test form on the Luxury Presence site. A row should land in the Website leads sheet and an email should reach aire@calebjackson.org. Then `python3 aire/crm/crm.py import-website-leads --dry-run` shows it as a lead.

## Live path (2026-11-04): Cloudflare buffer, hourly pull

The one registered webhook ("AIRE Relationship Brain", 2026-08-26) posts to the aire-hooks Cloudflare worker, which holds events 14 days. Nothing pulled them after the Relationship Brain stopped on 2026-09-22, so the Apps Script receiver was not deployed and no second webhook was added.

- `pull.py` pulls the buffer, checks each x-lp-signature (Keychain `com.caleb.aire.lp` / `webhook-secret`), writes lead events to the `Leads` tab and everything else to `LP activity`, and acks only what it wrote. Instagram events are left for their own reader. Bad signatures go to `~/.aire/lp-quarantine.jsonl`.
- `pull_hourly.sh` runs it hourly via the LaunchAgent `org.calebjackson.aire.lp-pull`, then `crm.py website-leads` when a new lead row landed. Plain Python, no model calls, no tokens. Log: `~/.aire/logs/lp-pull.log`, counts only.
- Install: `cp aire/lp-webhook/org.calebjackson.aire.lp-pull.plist ~/Library/LaunchAgents/ && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/org.calebjackson.aire.lp-pull.plist`
- Checks: `python3 pull.py --test` (made-up leads), `python3 pull.py` (live dry run, writes and acks nothing).
