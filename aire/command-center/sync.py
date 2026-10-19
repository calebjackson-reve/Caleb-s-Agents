#!/usr/bin/env python3
"""
Sync the three AIRE tools (and, when a Gmail token exists, ShowingTime emails) into
data/store.json for the command center. Never sends anything.

  python3 sync.py            # read the tools' real files
  python3 sync.py --seed     # load the fake Taylor Sample data so the page can be clicked through
  python3 sync.py --loop     # every 15 minutes while the Mac is awake

The page's own actions (called checkbox, dropped follow-ups) live in data/state.json and
survive every sync. Every lead, proposal and showing carries a listing_id so a per-listing
seller view later is a filter, not a rebuild.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
AIRE = HERE.parent
DATA = HERE / "data"
STORE = DATA / "store.json"
STATE = DATA / "state.json"
STL = AIRE / "speed-to-lead"
FU = AIRE / "follow-up"
PROP = AIRE / "proposal"
CRM_CACHE = AIRE / "crm" / "cache.json"


def read_json(p: Path, default):
    try:
        return json.loads(p.read_text())
    except Exception:
        return default


def listing_key(address: str | None) -> str | None:
    if not address:
        return None
    return re.sub(r"[^a-z0-9]+", "-", address.lower()).strip("-")[:48]


# ------------------------------------------------------------------ sources


def leads() -> list[dict]:
    out = {}
    # live sends
    if (STL / "log.csv").exists():
        with (STL / "log.csv").open(newline="") as f:
            for r in csv.DictReader(f):
                out[r["email"]] = {
                    "id": r["email"], "name": r["name"], "email": r["email"], "phone": "",
                    "source": "calebjackson.org", "received_at": r["received_at"], "replied_at": r["sent_at"],
                    "seconds_to_reply": int(float(r["seconds_to_reply"] or 0)), "channels": r.get("channels", ""),
                    "mode": "live", "listing_id": None,
                }
    # dry runs (one JSON object per entry, pretty printed, so split on the top-level braces)
    dry = STL / "dry-run.log"
    if dry.exists():
        txt = dry.read_text()
        for m in re.finditer(r"\{\n  \"lead\".*?\n\}\n", txt, re.S):
            try:
                rec = json.loads(m.group(0))
            except Exception:
                continue
            l = rec["lead"]
            out.setdefault(l["email"], {
                "id": l["email"], "name": l["name"], "email": l["email"], "phone": l.get("phone", ""),
                "source": "calebjackson.org", "received_at": l["received_at"], "replied_at": None,
                "seconds_to_reply": rec.get("seconds_to_reply"), "channels": "dry run", "mode": "dry",
                "listing_id": listing_key(l.get("address")),
            })
    return sorted(out.values(), key=lambda x: x["received_at"], reverse=True)


def followups_due() -> list[dict]:
    files = sorted(FU.glob("queue-*.md"))
    if not files:
        return []
    latest = files[-1]
    items = []
    for block in re.split(r"\n---\n", latest.read_text()):
        m = re.search(r"## \d+\. (.+?) <([^>]+)>\s+stage (\S+), day (\d+), template (\d+)\nSubject: ([^\n]*)\n\n(.*)",
                      block.strip(), re.S)
        if m:
            name, email, stage, day, tpl, subject, body = m.groups()
            items.append({"id": email.lower(), "name": name, "email": email.lower(), "stage": stage, "day": int(day),
                          "template": int(tpl), "subject": subject.strip(), "body": body.split("\n## ")[0].strip(),
                          "queue_file": latest.name})
    return items


def flags() -> list[dict]:
    p = FU / "flags.md"
    if not p.exists():
        return []
    out = []
    for line in p.read_text().splitlines():
        m = re.match(r"(\S+) (.+?) <([^>]+)> (OPT-OUT|HAND TO CALEB|POOL EXHAUSTED): ?(.*)", line)
        if m:
            out.append({"date": m.group(1), "name": m.group(2), "email": m.group(3), "why": m.group(4), "quote": m.group(5)})
    return out


def proposals() -> list[dict]:
    out = []
    for d in sorted((PROP / "out").glob("*/")) if (PROP / "out").exists() else []:
        ex = read_json(d / "extracted.json", {})
        email_draft = (d / "email-draft.md").read_text() if (d / "email-draft.md").exists() else ""
        to = re.search(r"^To: (.*)$", email_draft, re.M)
        subj = re.search(r"^Subject: .*? for (.*)$", email_draft, re.M)
        address = subj.group(1).strip() if subj else ""
        client = d.name.rsplit("-", 3)[0].replace("-", " ").title()
        notes = (d / "review-notes.md").read_text() if (d / "review-notes.md").exists() else ""
        out.append({
            "id": d.name, "client": client, "address": address, "email": to.group(1).strip() if to else "",
            "prepared": d.name[-10:], "signed": False, "link": None, "file": str(d / "proposal.html"),
            "price_range": ex.get("price_range", ""), "next_step": ex.get("next_step", ""),
            "needs_review": "VERIFY" in notes, "listing_id": listing_key(address),
        })
    return out


def overnight() -> list[dict]:
    events = []
    since = datetime.now(timezone.utc) - timedelta(hours=36)
    for tool, folder in (("speed-to-lead", STL), ("follow-up", FU), ("proposal", PROP)):
        err = folder / "errors.log"
        if err.exists():
            for line in err.read_text().splitlines()[-20:]:
                ts = line[:25]
                try:
                    when = datetime.fromisoformat(ts.rstrip())
                except Exception:
                    when = None
                if when is None or when >= since:
                    events.append({"tool": tool, "at": ts, "level": "error", "message": line[26:] or line})
    sent = read_json(FU / "sent-log.json", {})
    n = sum(1 for v in sent.values() for e in v if e.get("at", "") >= since.isoformat())
    if n:
        events.append({"tool": "follow-up", "at": datetime.now(timezone.utc).isoformat(), "level": "ok",
                       "message": f"{n} follow-up(s) sent in the last 36 hours"})
    for l in leads():
        if l["replied_at"] and l["replied_at"] >= since.isoformat():
            events.append({"tool": "speed-to-lead", "at": l["replied_at"], "level": "ok",
                           "message": f"replied to {l['name']} in {l['seconds_to_reply']} s"})
    return sorted(events, key=lambda e: e["at"], reverse=True)


def showings() -> list[dict]:
    """ShowingTime emails through the responder's Gmail token, if present. Read-only."""
    token = STL / "token.json"
    if not token.exists():
        return []
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        creds = Credentials.from_authorized_user_file(str(token), ["https://www.googleapis.com/auth/gmail.modify"])
        svc = build("gmail", "v1", credentials=creds, cache_discovery=False)
        res = svc.users().messages().list(userId="me", q="from:callcenter@showingtime.com newer_than:7d", maxResults=30).execute()
        out = []
        for m in res.get("messages", []):
            full = svc.users().messages().get(userId="me", id=m["id"], format="metadata",
                                              metadataHeaders=["Subject", "Date"]).execute()
            h = {x["name"]: x["value"] for x in full["payload"]["headers"]}
            mm = re.match(r"SHOWING (\w+) \| (.+?) (\w{3}, \d+/\d+ .+)$", h.get("Subject", ""))
            if mm:
                out.append({"status": mm.group(1).title(), "property": mm.group(2), "when": mm.group(3),
                            "listing_id": listing_key(mm.group(2)), "at": h.get("Date", "")})
        return out
    except Exception as e:
        return [{"status": "Error", "property": "", "when": "", "listing_id": None, "at": "", "error": str(e)}]


def crm_section() -> dict:
    """The AIRE CRM sheet, through the cache that `crm.py pull` writes. Touches due, open tasks, live deals."""
    empty = {"crm_pulled_at": None, "touches_due": [], "tasks": [], "pipeline": []}
    if not CRM_CACHE.exists():
        return empty
    try:
        import sys
        sys.path.insert(0, str(AIRE / "crm"))
        import crm as crmmod
        c = crmmod.CRM(crmmod.LocalBackend(CRM_CACHE))
        pulled = read_json(CRM_CACHE, {}).get("pulled_at")
        return {"crm_pulled_at": pulled, "touches_due": c.due()[:40], "tasks": c.open_tasks(), "pipeline": c.live_deals()}
    except Exception as e:
        return {**empty, "crm_error": str(e)}


# -------------------------------------------------------------------- store


def build() -> dict:
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "live-files",
        "leads": leads(),
        "followups_due": followups_due(),
        "flags": flags(),
        "proposals": proposals(),
        "overnight": overnight(),
        "showings": showings(),
        **crm_section(),
    }


def seed() -> dict:
    now = datetime.now(timezone.utc)
    iso = lambda h: (now - timedelta(hours=h)).isoformat()
    return {
        "generated_at": now.isoformat(),
        "mode": "seed",
        "leads": [
            {"id": "jordan.example@gmail.com", "name": "Jordan Example", "email": "jordan.example@gmail.com",
             "phone": "2255550142", "source": "calebjackson.org", "received_at": iso(2), "replied_at": iso(1.98),
             "seconds_to_reply": 41, "channels": "email+sms", "mode": "live", "listing_id": None},
            {"id": "sam.night@icloud.com", "name": "Sam Night", "email": "sam.night@icloud.com",
             "phone": "2255550188", "source": "calebjackson.org", "received_at": iso(11), "replied_at": iso(10.99),
             "seconds_to_reply": 55, "channels": "email, text queued 8am", "mode": "live", "listing_id": None},
        ],
        "followups_due": [
            {"id": "taylor.sample@icloud.com", "name": "Taylor Sample", "email": "taylor.sample@icloud.com",
             "stage": "seller-presentation", "day": 7, "template": 1, "subject": "Taylor",
             "body": "Hey Taylor, thanks again for having me out. Any questions since we talked?\n\nThanks,\nCaleb Jackson\nREALTOR, Keller Williams First Choice\n(225) 747-0303",
             "queue_file": "queue-seed.md"},
            {"id": "morgan.demo@gmail.com", "name": "Morgan Demo", "email": "morgan.demo@gmail.com",
             "stage": "under-contract", "day": 3, "template": 1, "subject": "Morgan",
             "body": "Hey Morgan, quick reminder on the item we talked about. Need anything from me?\n\nThanks,\nCaleb Jackson\nREALTOR, Keller Williams First Choice\n(225) 747-0303",
             "queue_file": "queue-seed.md"},
        ],
        "flags": [{"date": now.date().isoformat(), "name": "Avery Quiet", "email": "avery.quiet@gmail.com",
                   "why": "HAND TO CALEB", "quote": "we got an offer from a neighbor, what do you think about the price"}],
        "proposals": [
            {"id": "taylor-sample-2026-10-16", "client": "Taylor Sample", "address": "412 Royal St, Zachary, LA 70791",
             "email": "taylor.sample@icloud.com", "prepared": "2026-10-16", "signed": False, "link": None,
             "file": str(PROP / "tests" / "sample-proposal.html"), "price_range": "$345,000 to $359,000, listing at $349,900",
             "next_step": "Accept this page, I send the listing agreement through Authentisign, and the photographer comes out next Tuesday.",
             "needs_review": False, "listing_id": "412-royal-st-zachary-la-70791"},
        ],
        "overnight": [
            {"tool": "speed-to-lead", "at": iso(1.98), "level": "ok", "message": "replied to Jordan Example in 41 s"},
            {"tool": "speed-to-lead", "at": iso(10.99), "level": "ok", "message": "replied to Sam Night in 55 s, text held until 8 am"},
            {"tool": "follow-up", "at": iso(0.5), "level": "ok", "message": "queue built: 2 due, 1 flagged, 3 skipped"},
            {"tool": "proposal", "at": iso(30), "level": "error", "message": "extraction returned no JSON for call-oct-18.txt (claude -p timed out). Re-run."},
        ],
        "crm_pulled_at": iso(0.2),
        "touches_due": [
            {"name": "Taylor Sample", "tier": "HOT", "phone": "(225) 555-0101", "email": "taylor.sample@icloud.com", "days": 8,
             "next_action": "Send inspection report", "stage": "under-contract"},
            {"name": "Jordan Warm", "tier": "WARM", "phone": "(225) 555-0102", "email": "", "days": 20,
             "next_action": "Ask about spring timing", "stage": "new-lead"},
        ],
        "tasks": [
            {"id": "a1b2c3d4", "due": now.date().isoformat(), "contact": "Taylor Sample", "task": "Send inspection report to the other agent",
             "status": "open", "source": "Hot-Warm-Cold next action", "created_at": iso(12), "done_at": "", "overdue": False},
            {"id": "e5f6a7b8", "due": (now - timedelta(days=1)).date().isoformat(), "contact": "", "task": "Sign 1 Test Ave - Inspection Response.pdf",
             "status": "open", "source": "Authentisign", "created_at": iso(30), "done_at": "", "overdue": True},
        ],
        "pipeline": [
            {"id": "test-ave-1", "client": "Taylor Sample", "side": "buyer", "address": "1 Test Ave, Zachary", "stage": "under_contract",
             "price": "300000", "commission_pct": "2.5", "expected_close": (now + timedelta(days=9)).date().isoformat(), "source": "seed",
             "last_touch": "2026-10-18", "next_step": "Send inspection report", "contact": "Taylor Sample", "listing_id": "1-test-ave-zachary", "updated_at": ""},
        ],
        "showings": [
            {"status": "Confirmed", "property": "2179 S Turnberry Ave, Zachary, LA 70791", "when": "Fri, 10/16 11:15 AM",
             "listing_id": "2179-s-turnberry-ave-zachary-la-70791", "at": iso(20)},
            {"status": "Requested", "property": "2179 S Turnberry Ave, Zachary, LA 70791", "when": "Sat, 10/17 2:00 PM",
             "listing_id": "2179-s-turnberry-ave-zachary-la-70791", "at": iso(6)},
            {"status": "Confirmed", "property": "1368 Buffalo Hollow Ct, Zachary, LA 70791", "when": "Tue, 10/13 4:30 PM",
             "listing_id": "1368-buffalo-hollow-ct-zachary-la-70791", "at": iso(70)},
        ],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", action="store_true")
    ap.add_argument("--loop", action="store_true")
    a = ap.parse_args()
    DATA.mkdir(exist_ok=True)
    if not STATE.exists():
        STATE.write_text(json.dumps({"called": {}, "dropped": {}, "signed": {}}, indent=2))
    while True:
        store = seed() if a.seed else build()
        STORE.write_text(json.dumps(store, indent=2))
        print(f"{store['mode']}: {len(store['leads'])} leads, {len(store['followups_due'])} due, "
              f"{len(store['proposals'])} proposals, {len(store['overnight'])} overnight, {len(store['showings'])} showings")
        if not a.loop:
            break
        time.sleep(900)


if __name__ == "__main__":
    main()
