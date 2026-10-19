# AIRE

**Project hub.** AIRE is Caleb Jackson's AI system for his own real estate production at Keller Williams First Choice. Confirmed by Caleb on 2026-10-19: AIRE today is an idea plus three working tools, the first customer is Caleb himself, and selling to other agents comes later.

Read `STATUS.md` before touching anything here.

## What exists

| Piece | Folder | State |
|---|---|---|
| Speed to lead responder | `speed-to-lead/` | Built, tested, copy approved. Needs Gmail credentials on the Mac to go live. |
| Daily follow-up cadence | `follow-up/` | Built, tested. Needs a KW Command contacts export. |
| Call recording to proposal | `proposal/` | Built, tested with a live extraction. Needs Caleb's read of the marketing plan text. |
| Command center (Caleb's view) | `command-center/` | Contract drafted, waiting on Caleb's approval. First app build. The seller dashboard follows as a slice of it. |

## What Caleb has (confirmed 2026-10-19)
- CRM: KW Command, no public API, CSV export.
- Email: aire@calebjackson.org on Google Workspace.
- Texting: Caleb's own number (225) 747-0303 for lead replies, and a separate business texting number exists.
- Payments: a Stripe or payment link exists.
- E-sign: Authentisign (seen in the inbox). Not confirmed as the only one.
- Booking link: not confirmed.
- Website: calebjackson.org on Luxury Presence. Leads arrive as "New Lead" emails.

## Rules
Nothing sends, posts, spends or deletes without Caleb's yes. Keller Williams First Choice only. Every tool ships in dry run. Client data stays out of the repo.
