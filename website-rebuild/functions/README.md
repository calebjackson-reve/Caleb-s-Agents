# Lead delivery

`api/lead.js` runs on Cloudflare Pages as a function at `/api/lead`. Every form on the site posts JSON to it. It validates, drops bots, and forwards to `LEAD_WEBHOOK`.

## The webhook: Google Apps Script (free, Caleb's Workspace, no new account)

1. sheets.google.com, new sheet named "Website leads". Extensions, Apps Script. Paste `lead-webhook.gs`, save.
2. Deploy, New deployment, type Web app, Execute as Me, Who has access: Anyone. Authorize. Copy the web app URL.
3. Cloudflare Pages project, Settings, Environment variables, add `LEAD_WEBHOOK` = that URL, for Production. Redeploy.
4. Test: submit the contact form on the live site. A row lands in the sheet and an email reaches aire@calebjackson.org within a minute. Texts to Caleb's phone go through his carrier's email-to-SMS address if he adds it in the script's `NOTIFY` list.
