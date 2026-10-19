# Call recording to listing proposal

Caleb's third automation tool, from Nick Saraev's `cx-sales-call-to-proposal` and `aw-transcript-to-proposal` skills. Record the listing appointment, run one command, get a one-page proposal with a signature pad and an email draft the same evening.

## Run it (Claude Desktop Code tab or Terminal, either works)

```
cd ~/Caleb-s-Agents/aire/proposal
python3 proposal.py --test
python3 proposal.py --transcript call.txt --client "Jane Doe" --address "123 Main St, Zachary, LA 70791" --email jane@example.com
python3 proposal.py --audio call.m4a ...        # needs whisper: pip3 install openai-whisper
open out/jane-doe-<date>/proposal.html
```

Extraction runs through `claude -p`, so it uses the Claude subscription already on the Mac. No API key.

## What comes out

| File | What |
|---|---|
| `proposal.html` | The page. Situation, what we talked about, pricing strategy, fixed Keller Williams First Choice marketing plan, timeline, terms, next step, signature pad with authorization checkbox. |
| `email-draft.md` | The cover email in Caleb's voice. Caleb pastes the hosted link or attaches the page, then sends it himself. |
| `review-notes.md` | Fields the call did not cover, and any number flagged VERIFY. Read before sending. |
| `extracted.json` | The raw extraction, for fixing a field and re-rendering with `--from-json`. |

## Rules it enforces

- Numbers come only from the call. A dollar figure or percentage in price, commission or term that is not in the transcript is replaced with "to be confirmed together". In the pricing prose it is kept and flagged, because sellers say "three sixty" in words.
- Nothing is blank. Nothing is sent. Nothing is uploaded.
- Fixed footer with license 995709547 and the "not a listing agreement" line.

## Hosting the page

Nick's rule: a long unguessable URL, because the page carries the seller's private situation. Netlify drag-and-drop works, or a folder under home.calebjackson.org once that subdomain is live. Both are a separate step with Caleb's approval.
