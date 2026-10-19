#!/usr/bin/env python3
"""
Call recording to listing proposal.

  recording.m4a  --(ffmpeg + whisper, if installed)-->  transcript.txt
  transcript.txt --(claude -p, structured extraction)--> extracted.json
  extracted.json --(this script, template-listing.html)--> proposal.html + email-draft.md

Nothing is sent. Output lands in out/<client-slug>-<date>/ for Caleb to review.

Usage:
  python3 proposal.py --transcript call.txt --client "Jane Doe" --address "123 Main St, Zachary, LA" --email jane@x.com
  python3 proposal.py --audio call.m4a ...            # transcribes first (needs whisper on the PATH)
  python3 proposal.py --from-json extracted.json ...  # skip extraction, render only
  python3 proposal.py --test                          # render the fixture and check it

Rules the script enforces, from directive.md:
  - Every dollar figure or percentage in the proposal must appear in the transcript. Otherwise it becomes
    "to be confirmed together" and is listed in the review notes.
  - Unknown fields are never blank.
  - Prepared-by, footer and the marketing plan are fixed text and never come from the model.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "template-listing.html"
OUT_ROOT = HERE / "out"
TBC = "to be confirmed together"

FIELDS = [
    "situation_paragraph_1", "situation_paragraph_2", "client_quote", "motivation", "timeline",
    "property_facts", "concerns", "pricing_strategy", "price_range", "pricing_basis", "marketing_notes",
    "step_prep", "step_live", "step_open_house", "step_target", "listing_term", "commission",
    "other_terms", "next_step",
]
HARD_FIELDS = ["price_range", "commission", "listing_term"]          # a stray number here is replaced
PROSE_FIELDS = ["pricing_basis", "pricing_strategy"]                  # a stray number here is kept and flagged

EXTRACTION_PROMPT = """You are preparing a listing proposal for Caleb Jackson, REALTOR with Keller Williams First Choice,
from the transcript of his listing appointment with a seller. Read the transcript and return ONLY a JSON object
with exactly these keys, every value a plain string in warm, direct, natural English, no em dashes, no semicolons:

{fields}

Rules:
- Use only what the seller or Caleb actually said. Never invent numbers, dates, names or features.
- If something was not discussed, the value is exactly "{tbc}".
- situation_paragraph_1 and _2: two short paragraphs about the seller's situation in Caleb's voice, second person ("you").
- client_quote: one sentence the seller said, close to verbatim, that captures why they are selling. Empty string if none.
- price_range: the number or range discussed, written like "$340,000 to $355,000". commission: as discussed, like "2.5%".
- step_*: short phrases with dates or relative timing from the call.
- next_step: one sentence on what happens after they accept.
Return the JSON only. No prose before or after.

TRANSCRIPT:
{transcript}
"""


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40] or "client"


def transcribe(audio: Path, out_dir: Path) -> Path:
    if not shutil.which("whisper"):
        sys.exit("whisper is not installed. On the Mac: pip3 install openai-whisper, or paste a transcript with --transcript.")
    wav = out_dir / "audio.wav"
    subprocess.run(["ffmpeg", "-y", "-i", str(audio), "-ar", "16000", "-ac", "1", str(wav)], check=True, capture_output=True)
    subprocess.run(["whisper", str(wav), "--model", "base", "--output_format", "txt", "--output_dir", str(out_dir)],
                   check=True, capture_output=True)
    return out_dir / "audio.txt"


def extract(transcript: str) -> dict:
    """Run the extraction through Claude Code's CLI (uses Caleb's subscription, no API key)."""
    if not shutil.which("claude"):
        sys.exit("claude CLI not found. Install Claude Code, or use --from-json.")
    prompt = EXTRACTION_PROMPT.format(fields=json.dumps({f: "..." for f in FIELDS}, indent=2), tbc=TBC,
                                      transcript=transcript)
    res = subprocess.run(["claude", "-p", prompt, "--max-turns", "1"], capture_output=True, text=True, timeout=300)
    raw = res.stdout.strip()
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        sys.exit(f"extraction returned no JSON:\n{raw[:500]}\n{res.stderr[:300]}")
    data = json.loads(m.group(0))
    return {f: str(data.get(f, TBC)).strip() or TBC for f in FIELDS}


NUM_RE = re.compile(r"\$?\d[\d,]*(?:\.\d+)?%?")


def numbers_in(text: str) -> set[str]:
    return {n.replace(",", "").lstrip("$").rstrip("%") for n in NUM_RE.findall(text)}


def guard_numbers(data: dict, transcript: str | None) -> list[str]:
    """Any number in a numeric field that is not in the transcript gets replaced. Returns review notes."""
    notes = []
    if transcript is None:
        return notes
    allowed = numbers_in(transcript)
    for f in HARD_FIELDS + PROSE_FIELDS:
        val = data.get(f, "")
        bad = [n for n in numbers_in(val) if n not in allowed and len(n) > 1]
        if not bad:
            continue
        if f in HARD_FIELDS:
            notes.append(f"{f}: '{val}' contains {bad}, not found as digits in the transcript. Replaced with '{TBC}'.")
            data[f] = TBC
        else:
            notes.append(f"VERIFY {f}: contains {bad}, not found as digits in the transcript (the seller may have said it in words). Kept, read it before sending.")
    return notes


def render(data: dict, client: str, address: str, prepared: date) -> str:
    html = TEMPLATE.read_text(encoding="utf-8")
    values = dict(data)
    values.update({
        "client_name": client, "property_address": address,
        "prepared_date": prepared.strftime("%B %d, %Y").replace(" 0", " "),
        "valid_through": (prepared + timedelta(days=14)).strftime("%B %d, %Y").replace(" 0", " "),
        "proposal_id": f"{slug(client)}-{prepared.isoformat()}",
    })
    for k, v in values.items():
        html = html.replace("{{" + k + "}}", escape(v) if k != "proposal_id" else v)
    leftover = re.findall(r"\{\{[a-z_]+\}\}", html)
    if leftover:
        raise ValueError(f"unfilled placeholders: {leftover}")
    return html


def escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def email_draft(client: str, address: str, email: str, data: dict, url_hint: str) -> str:
    first = client.split()[0]
    return f"""To: {email}
Subject: {first}, your proposal for {address}

Hey {first}, thanks again for having me out. I put everything we talked about into one page so you can see the plan, the pricing we discussed and the timeline in one place.

{url_hint}

The short version: {data.get('motivation', TBC)} Price range we discussed: {data.get('price_range', TBC)}. {data.get('next_step', TBC)}

If anything on there doesn't match what you remember, tell me and I'll fix it. No rush.

Thanks,
Caleb Jackson
REALTOR, Keller Williams First Choice
(225) 747-0303
"""


def run(args) -> Path:
    prepared = date.fromisoformat(args.date) if args.date else date.today()
    out_dir = OUT_ROOT / f"{slug(args.client)}-{prepared.isoformat()}"
    out_dir.mkdir(parents=True, exist_ok=True)

    transcript = None
    if args.audio:
        transcript = transcribe(Path(args.audio), out_dir).read_text(encoding="utf-8")
    elif args.transcript:
        transcript = Path(args.transcript).read_text(encoding="utf-8")

    if args.from_json:
        data = json.loads(Path(args.from_json).read_text())
        data = {f: str(data.get(f, TBC)).strip() or TBC for f in FIELDS}
    else:
        if not transcript:
            sys.exit("give --transcript, --audio or --from-json")
        data = extract(transcript)
        (out_dir / "extracted.json").write_text(json.dumps(data, indent=2))

    notes = guard_numbers(data, transcript)
    html = render(data, args.client, args.address, prepared)
    (out_dir / "proposal.html").write_text(html, encoding="utf-8")
    hint = "Here it is: [paste the private link after you host the page, or attach proposal.html]"
    (out_dir / "email-draft.md").write_text(email_draft(args.client, args.address, args.email or "", data, hint),
                                            encoding="utf-8")
    review = ["# Review notes", ""]
    tbc = [f for f in FIELDS if data[f] == TBC]
    review.append(f"Fields the call did not cover ({len(tbc)}): {', '.join(tbc) or 'none'}")
    review += [f"- {n}" for n in notes]
    review += ["", "Open proposal.html, read every section, then send email-draft.md yourself. Nothing was sent."]
    (out_dir / "review-notes.md").write_text("\n".join(review) + "\n", encoding="utf-8")
    return out_dir


def run_tests() -> int:
    fails = 0

    def check(ok, label):
        nonlocal fails
        print(f"{'PASS' if ok else 'FAIL'} {label}")
        fails += 0 if ok else 1

    fx = HERE / "tests" / "fixtures"
    transcript = (fx / "sample-listing-transcript.txt").read_text(encoding="utf-8")
    data = json.loads((fx / "sample-extracted.json").read_text())
    data = {f: str(data.get(f, TBC)) for f in FIELDS}
    notes = guard_numbers(data, transcript)
    check(notes == [], f"no invented numbers in fixture ({notes})")
    bad = dict(data, commission="3.5%", price_range="$500,000")
    n2 = guard_numbers(bad, transcript)
    check(len(n2) == 2 and bad["commission"] == TBC and bad["price_range"] == TBC, "invented hard numbers get replaced")
    prose = dict(data, pricing_strategy="hoping for $360,000")
    n3 = guard_numbers(prose, transcript)
    check(len(n3) == 1 and n3[0].startswith("VERIFY") and prose["pricing_strategy"] == "hoping for $360,000", "prose numbers kept and flagged")
    html = render(data, "Taylor Sample", "412 Royal St, Zachary, LA 70791", date(2026, 10, 16))
    check("{{" not in html, "every placeholder filled")
    check("Keller Williams First Choice" in html and "995709547" in html and "Rêve" not in html, "brokerage and license in footer, no old brand")
    check("$345,000 to $359,000" in html and "2.5%" in html, "price range and commission rendered from the call")
    check("Valid through October 30, 2026" in html, "valid-through is 14 days out")
    check("<canvas" in html and 'id="auth"' in html, "signature pad and authorization checkbox present")
    check("—" not in html.split("<style>")[0] and ";" not in data["situation_paragraph_1"], "no em dashes in content")
    draft = email_draft("Taylor Sample", "412 Royal St", "taylor@example.com", data, "LINK")
    check(draft.startswith("To: taylor@example.com") and "Keller Williams First Choice" in draft, "email draft shaped")
    print(f"\n{'ALL PASS' if fails == 0 else str(fails) + ' FAILURES'}")
    return fails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript")
    ap.add_argument("--audio")
    ap.add_argument("--from-json")
    ap.add_argument("--client", default="")
    ap.add_argument("--address", default="")
    ap.add_argument("--email", default="")
    ap.add_argument("--date")
    ap.add_argument("--test", action="store_true")
    args = ap.parse_args()
    if args.test:
        sys.exit(run_tests())
    if not (args.client and args.address):
        sys.exit("--client and --address are required")
    out = run(args)
    print(f"done: {out}\n  proposal.html, email-draft.md, review-notes.md. Nothing sent.")


if __name__ == "__main__":
    main()
