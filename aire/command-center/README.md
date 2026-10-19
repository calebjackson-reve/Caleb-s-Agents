# AIRE command center

Caleb's morning page. Version one, built 2026-10-19 against `CONTRACT.md`. One screen that answers: who came in, who is due a touch, what is out waiting on a signature, what the tools did overnight, and this week's showings. Fed by the three AIRE tools, so nothing is typed twice.

## Run it on the Mac

```
cd ~/Caleb-s-Agents/aire/command-center
python3 sync.py --seed          # sample data, click through before anything real
cd app && npm install && npm run build && npm start
open http://localhost:3000
```

For real data: `python3 sync.py` reads the tools' own files (speed-to-lead logs, the latest follow-up queue, proposal output, and ShowingTime emails when the responder's Gmail token exists). `python3 sync.py --loop` refreshes every 15 minutes while the Mac is awake.

## What each section does

| Section | Source | One-tap action |
|---|---|---|
| New leads | `speed-to-lead/log.csv` and `dry-run.log` | Tap-to-call, Mark called |
| Due today | newest `follow-up/queue-*.md` | Drop a row, Approve and send the rest |
| Proposals out | `proposal/out/*/` | Mark signed, which surfaces the Authentisign reminder |
| Overnight | the tools' `errors.log` and `sent-log.json` | none, read it |
| This week's showings | ShowingTime emails via Gmail | none, read it |

Page state (called, dropped, signed) lives in `data/state.json` and survives every sync.

## The only send

"Approve and send" writes a filtered copy of the queue without the dropped rows and runs the existing follow-up tool on it. That tool keeps its own rules: templates only, no repeats, quiet hours, opt-out flags. It runs in dry run unless the server is started with `APPROVE_LIVE=true`.

## Security pass (vc-security-audit, 80/20)

- **Version one is localhost only.** There is no login. Do not expose port 3000 to the internet or deploy this build to Netlify as is. Real lead names, phones and emails are on this page.
- The action route accepts only known actions, strips the queue file name to safe characters and requires the `queue-` prefix, so no path traversal.
- Nothing on the page sends except the approve button, and that goes through the follow-up tool.
- No keys in the app. Gmail access is the responder's token, read by `sync.py` only.
- Version two (`supabase/schema.sql`): Supabase tables with row-level security on every table, magic-link login for Caleb, then Netlify. Run the full `vc-security-audit` again before that deploy.

## Proof

`tests/clickthrough.mjs` drives Chromium through every action. Last run 2026-10-19: page load 674 ms at phone width, mark called works, drop keeps the row out of the approve, approve dry run sent only the remaining row, mark signed works, lead page opens, zero JavaScript errors. Screenshots in `tests/`.

## Seller view later

Every lead, proposal and showing carries `listing_id`. The seller dashboard is a read-only page filtered on one listing id behind a long token (`listing_tokens` in the schema). Build it after version two.
