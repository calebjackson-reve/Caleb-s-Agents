# Directive: call recording to listing proposal

## Objective
Turn a listing appointment (audio or transcript) into a one-page HTML proposal in Caleb's voice with a signature pad, plus a ready-to-send email draft, within minutes of the appointment, so the seller gets it the same evening.

## Inputs
- A recording (m4a, mp3, wav) or a transcript (txt). Fathom, Otter, Voice Memos or a phone recording all work.
- Seller name, property address, email.
- `template-listing.html`: the fixed design. The marketing plan, prepared-by block and footer are fixed text.

## Process
1. If audio, transcribe with ffmpeg plus whisper into the output folder.
2. Extract the 19 fields with Claude (through `claude -p`, Caleb's subscription) using the prompt in proposal.py. Values come only from the transcript. Undiscussed fields read "to be confirmed together".
3. Guard the numbers. Any dollar figure or percentage in price range, commission or listing term that does not appear as digits in the transcript is replaced with "to be confirmed together". The same in the pricing prose is kept and flagged VERIFY in review notes.
4. Render the template. Fail loudly if any placeholder is left.
5. Write proposal.html, email-draft.md and review-notes.md to out/<client>-<date>/.
6. Caleb reads the proposal and the review notes, fixes anything, hosts the page at a long unguessable URL (Netlify or the calebjackson.org subdomain) or attaches the file, and sends the email himself.

## Definition of done
Three files in the output folder, no unfilled placeholders, every number in the proposal traceable to the call, and nothing sent.

## Safety
- Never sends. Never uploads. Hosting is a separate, approved step.
- Never invents numbers, dates or features.
- The proposal is a summary, not a listing agreement. The agreement goes through Authentisign after acceptance.
- No client transcript is committed to the repo. out/ is git-ignored.
