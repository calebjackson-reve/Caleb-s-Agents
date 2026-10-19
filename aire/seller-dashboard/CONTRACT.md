# Prompt contract: seller dashboard

Per Nick Saraev's `aa-prompt-contract`. Nothing is built until Caleb approves this page. Edit any line.

## Goal
A private web page per listing that a seller opens on their phone to see, without calling Caleb: every showing and the feedback from it, what Caleb changed and why, the next step with a date, and where the price sits against the comps discussed. It replaces the weekly update text and makes the seller feel watched over between calls. Success is a seller saying "I saw it on the page" instead of "I haven't heard from you."

## Constraints
- Built with the stack from `vc-supabase-full-stack-stack`: Next.js, Supabase with row-level security on every table, deployed to Netlify. One Supabase project, free tier to start.
- Access by a long unguessable link per listing plus an email magic link. No passwords for sellers.
- Caleb's view is a simple admin page: pick a listing, add a showing with feedback, add an update, change next step. Three forms, no more, for version one.
- Data in: showings and feedback can be typed by Caleb or pasted from ShowingTime emails. Version one is manual entry. ShowingTime email parsing is version two.
- Design: Keller Williams First Choice header, Caleb's photo and phone on every page, warm and plain, works on a phone first. No Rêve colors or fonts.
- Compliance: no other seller's data visible, ever. Feedback shown as given, not edited. Price section shows only numbers that appear in the listing proposal or that Caleb typed.
- Cost ceiling to build: Caleb's Claude subscription plus free tiers. Any paid service needs a yes first.
- Security audit from `vc-security-audit` before the first real seller gets a link.

## Format
- Repo folder `aire/seller-dashboard/` with the app, a README with run and deploy steps, and a seed script that loads the fake Taylor Sample listing from the proposal tool so Caleb can click through before any real data exists.
- Pages: `/l/<token>` seller view, `/admin` Caleb view behind magic link, `/admin/listings/<id>` edit.
- Deliverable proof: screenshots of the seller page on a phone width and the admin page, plus the security audit result, in the pull request.

## Failure conditions
- A seller can see any listing but their own. Fail.
- Caleb has to type anything twice. Fail.
- The page takes more than 3 seconds to open on a phone. Fail.
- Any step requires a paid tool without Caleb's yes. Fail.
- Version one grows past the three admin forms. Stop and ask.

## Open choices for Caleb (defaults in bold)
1. Seller sees the price-versus-comps section: **yes, numbers from the proposal only** / no.
2. Showing feedback: **shown word for word** / summarized by Claude.
3. Notifications when Caleb posts an update: **email** / text from Caleb's number / none.
4. Domain: **a Netlify URL for version one** / a subdomain of calebjackson.org (needs Luxury Presence DNS).
