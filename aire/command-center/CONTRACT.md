# Prompt contract: Caleb's command center

Per Nick Saraev's `aa-prompt-contract`. Caleb chose this over the seller dashboard on 2026-10-19: his own view is the most important first app. Nothing is built until Caleb approves this page. Edit any line.

## Goal
One page Caleb opens every morning on his phone or Mac that answers four questions in under ten seconds: who came in, who is due a touch today, what is out waiting on a signature, and what did the tools do overnight. It is fed by the three tools already built, so Caleb never types what the tools already know. Success is Caleb running his step 14 sales block from this page instead of from his inbox and memory.

## What is on the page (version one, in this order)
1. **New leads.** Every inquiry the speed-to-lead responder handled: name, source, when it came in, seconds to reply, phone tap-to-call, and a "called" checkbox Caleb taps. Unanswered calls stay at the top.
2. **Due today.** The follow-up queue for today from the cadence tool: name, stage, day number, the exact message queued. Approve all, or tap any row to drop it. Approving here runs the send.
3. **Proposals out.** Every proposal generated: seller, address, sent date, signed or not, and the private link. Signed ones show a "send listing agreement" reminder.
4. **Overnight.** What ran, what failed, straight from the tools' logs and errors files. A red line here is the first thing Caleb sees.
5. **This week.** Showings from ShowingTime emails, listed by property, so the seller update is a glance, not a search. Version one reads the emails already in the inbox.

## Constraints
- Stack: Next.js on the Mac, data from Google Sheets and the tools' own files. No Supabase (Caleb, 2026-10-19: one system, Google Workspace is the database). Any paid service needs a yes.
- Data comes from the tools' own files: `speed-to-lead/log.csv` and `processed.json`, `follow-up/queue-*.md` and `sent-log.json`, `proposal/out/*/`, plus the ShowingTime and Luxury Presence emails through the same Gmail token. Version one syncs with a small script Caleb runs or a scheduled job on the Mac. A cloud sync is version two.
- Nothing on this page sends anything except the "approve follow-ups" action, which calls the existing cadence tool and keeps its rules (templates only, quiet hours, opt-out flags).
- Design: Keller Williams First Choice header, warm and plain, phone first, dark mode. No Rêve colors or fonts.
- Security audit from `vc-security-audit` before Caleb's real lead data goes in, because this page holds names, phones and emails of real people.

## Format
- Folder `aire/command-center/` with the app, a README with run and deploy steps, the sync script, and a seed that loads the fake Taylor Sample lead, follow-up and proposal so Caleb can click through before any real data.
- Pages: `/` the five sections above, `/leads/<id>` one lead's thread and notes.
- Proof in the pull request: phone-width and desktop screenshots, the sync script run against the fixture data, the security audit result.

## Failure conditions
- Caleb has to type something the tools already know. Fail.
- Any section needs more than one tap to act. Fail.
- The page takes more than 3 seconds to open on a phone. Fail.
- A send happens from anywhere but the approve button, or outside the cadence tool's rules. Fail.
- Version one grows past the five sections. Stop and ask.

## Open choices for Caleb (defaults in bold)
1. Where the sync runs: **on the Mac every 15 minutes while awake** / cloud job (needs Gmail token in the cloud, version two).
2. Morning push: **none for version one** / email summary at 6 am / text to Caleb's number.
3. The "called" checkbox writes back to KW Command: **no, manual in Command for now** / yes via a CSV Caleb imports weekly.
4. Hosting: **Netlify URL** / subdomain of calebjackson.org.

## What comes after version one
The seller dashboard, as a read-only public slice of this same data per listing, so building this first makes that one small.
