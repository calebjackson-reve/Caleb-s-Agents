#!/usr/bin/env python3
"""
Daily follow-up cadence for Caleb Jackson's contacts.

Reads a KW Command export (contacts.csv), finds everyone who went quiet exactly
1, 2, 3, 7, 14, 21, 28, 56 or 84 days ago (90, 180, 365 for past clients), picks
the next unused soft check-in from the pool for their stage, and writes a morning
queue file for Caleb to approve. Sends only on --approve with DRY_RUN=false.

Since 2026-10-20 the queue comes from the CRM engine's feed (aire/crm/feed.json): who is due, by audience
(sphere, past-client, active-buyer, seller-candidate, partner, recruit, new-lead, under-contract). People with an
email get an email draft in queue-<date>.md. Phone-only people get a text draft in texts-<date>.md and
out/text-queue.json for the Pipeline app. Anyone who texted Caleb last gets no template at all: they go to
the top as REPLY FIRST with their last messages. After --approve sends, each send is logged to the CRM
through crm.py touch so the person drops off tomorrow's list.

Usage:
  python3 followups.py --queue [--as-of YYYY-MM-DD] [--feed ../crm/feed.json | --contacts FILE]   # write queue-<date>.md
  python3 followups.py --approve queue-<date>.md                          # send what is left in the file
  python3 followups.py --test                                             # built-in checks on tests/fixtures

Gmail (optional): if token.json from the speed-to-lead responder exists next to this
file or in ../speed-to-lead, replies and opt-outs are checked against real history.
"""

from __future__ import annotations

import argparse
import base64
import csv
import json
import os
import re
import sys
from datetime import date, datetime, timezone
from email.mime.text import MIMEText
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE / "templates.md"
SENT_LOG = HERE / "sent-log.json"
LOG = HERE / "log.csv"
FLAGS = HERE / "flags.md"
ERRORS = HERE / "errors.log"
TOKEN_CANDIDATES = [HERE / "token.json", HERE.parent / "speed-to-lead" / "token.json"]

CENTRAL = ZoneInfo("America/Chicago")
FROM_ADDRESS = "aire@calebjackson.org"
SIGNOFF = "\n\nThanks,\nCaleb Jackson\nREALTOR, Keller Williams First Choice\n(225) 747-0303"
THRESHOLDS = {
    "new-lead": [1, 2, 3, 7, 14, 21, 28, 56, 84],
    "seller-presentation": [1, 2, 3, 7, 14, 21, 28, 56, 84],
    "under-contract": [1, 2, 3, 7, 14, 21, 28, 56, 84],
    "past-client": [90, 180, 365],
}
SKIP_STAGES = {"closed", "opt-out"}
DRY_RUN = os.getenv("DRY_RUN", "true").strip().lower() not in ("false", "0", "no")


# ---------------------------------------------------------------- templates


def load_templates() -> dict:
    text = TEMPLATES.read_text(encoding="utf-8")
    sections: dict[str, list[str]] = {}
    current = None
    for line in text.splitlines():
        if line.startswith("## "):
            current = line[3:].strip()
            sections[current] = []
        elif current is not None and line.strip():
            sections[current].append(line.rstrip())

    pools: dict[str, list[str]] = {}
    texts: dict[str, list[str]] = {}
    for name, lines in sections.items():
        if name.startswith("Pool: "):
            pool = name[6:].strip()
            pools[pool] = [re.sub(r"^\d+\.\s*", "", l) for l in lines if re.match(r"^\d+\.", l)]
        elif name.startswith("Text: "):
            texts[name[6:].strip()] = [re.sub(r"^\d+\.\s*", "", l) for l in lines if re.match(r"^\d+\.", l)]

    def phrases(key: str) -> list[str]:
        for name, lines in sections.items():
            if name.lower().startswith(key):
                return [p.strip().lower() for p in " ".join(lines).split("|") if p.strip()]
        return []

    subjects = phrases("subjects")
    optout = phrases("opt-out")
    handoff = phrases("hand-to-caleb")
    tests = []
    for name, lines in sections.items():
        if name.lower().startswith("test addresses"):
            tests = [l.strip().lower() for l in lines if "@" in l]
    return {"pools": pools, "texts": texts, "subjects": subjects, "optout": optout, "handoff": handoff, "tests": tests}


# ----------------------------------------------------------------- contacts


def load_contacts(path: Path) -> list[dict]:
    rows = []
    with path.open(newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            r = {k.strip().lower(): (v or "").strip() for k, v in r.items() if k}
            if not r.get("email"):
                continue
            r["email"] = r["email"].lower()
            r["stage"] = r.get("stage", "").lower()
            r["first_name"] = (r.get("name", "").split() or [""])[0].title()
            rows.append(r)
    return rows


def days_since(last_touch: str, as_of: date) -> int | None:
    try:
        return (as_of - date.fromisoformat(last_touch[:10])).days
    except Exception:
        return None


# -------------------------------------------------------------------- gmail


def gmail_service_or_none():
    token = next((p for p in TOKEN_CANDIDATES if p.exists()), None)
    if not token:
        return None
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        scopes = ["https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/gmail.send"]
        creds = Credentials.from_authorized_user_file(str(token), scopes)
        return build("gmail", "v1", credentials=creds, cache_discovery=False)
    except Exception as e:
        ERRORS.open("a").write(f"{datetime.now(timezone.utc).isoformat()} gmail unavailable: {e}\n")
        return None


def history_check(svc, email: str, last_touch: str) -> dict:
    """Return {'replied': bool, 'quotes': [text snippets from them since last_touch]}."""
    out = {"replied": False, "quotes": []}
    if not svc:
        return out
    try:
        q = f"from:{email} after:{last_touch.replace('-', '/')}"
        res = svc.users().messages().list(userId="me", q=q, maxResults=10).execute()
        for m in res.get("messages", []):
            full = svc.users().messages().get(userId="me", id=m["id"], format="full").execute()
            out["replied"] = True
            out["quotes"].append(full.get("snippet", ""))
    except Exception as e:
        ERRORS.open("a").write(f"{datetime.now(timezone.utc).isoformat()} history check failed for {email}: {e}\n")
    return out


def send_email(svc, to: str, subject: str, body: str) -> None:
    msg = MIMEText(body)
    msg["to"], msg["from"], msg["subject"] = to, FROM_ADDRESS, subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    svc.users().messages().send(userId="me", body={"raw": raw}).execute()


# ------------------------------------------------------------------- engine


def load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default


def pick_template(pool: list[str], used: list[int]) -> int | None:
    """Next template index not yet used on this contact, in order. None when exhausted."""
    for i in range(len(pool)):
        if i not in used:
            return i
    return None


def fill(template: str, c: dict) -> str:
    out = template.replace("{{firstName}}", c["first_name"])
    out = out.replace("{{address}}", c.get("address") or "your place")
    return out


def build_queue(contacts: list[dict], t: dict, as_of: date, svc=None) -> dict:
    sent_log = load_json(SENT_LOG, {})
    queue, skipped, flagged = [], [], []
    for c in contacts:
        email = c["email"]
        stage = c["stage"]
        if email in t["tests"]:
            skipped.append((c, "test address"))
            continue
        if stage in SKIP_STAGES or stage not in THRESHOLDS:
            skipped.append((c, f"stage {stage or 'blank'}"))
            continue
        d = days_since(c.get("last_touch", ""), as_of)
        if d is None:
            skipped.append((c, "bad last_touch date"))
            continue
        if d not in THRESHOLDS[stage]:
            skipped.append((c, f"day {d}, not a threshold"))
            continue
        hist = history_check(svc, email, c.get("last_touch", ""))
        joined = " ".join(hist["quotes"]).lower()
        if any(p in joined for p in t["optout"]):
            flagged.append((c, "OPT-OUT", joined[:200]))
            continue
        if any(p in joined for p in t["handoff"]):
            flagged.append((c, "HAND TO CALEB", joined[:200]))
            continue
        if hist["replied"]:
            skipped.append((c, "they replied since last touch"))
            continue
        used = [e["template"] for e in sent_log.get(email, [])]
        idx = pick_template(t["pools"][stage], used)
        if idx is None:
            flagged.append((c, "POOL EXHAUSTED", f"{len(used)} sent"))
            continue
        subject = t["subjects"][len(used) % len(t["subjects"])].replace("{{firstname}}", c["first_name"])
        body = fill(t["pools"][stage][idx], c) + SIGNOFF
        queue.append({"email": email, "name": c["name"], "stage": stage, "day": d, "template": idx,
                      "subject": subject, "body": body})
    return {"queue": queue, "skipped": skipped, "flagged": flagged, "gmail": svc is not None}


# ------------------------------------------------------------ feed (the CRM)

FEED = HERE.parent / "crm" / "feed.json"
OUT = HERE / "out"
CRM_PY = HERE.parent / "crm" / "crm.py"
SELLER_WORDS = ("equity_review", "mover", "sell", "listing", "downsiz", "upsiz", "land")


def audience(row: dict) -> str:
    """Which pool a CRM person belongs to. Who they are to Caleb decides, then what they are doing."""
    typ = (row.get("type") or "").lower()
    stage = (row.get("stage") or "").lower()
    opp = (row.get("opportunity_types") or "").lower()
    nxt = (row.get("next_action") or "").lower()
    if typ in ("agent", "lender", "vendor"):
        return "partner"
    if typ == "recruit":
        return "recruit"
    if "new lead" in stage or "contacted" in stage:
        return "new-lead"
    if "under contract" in stage or "active" == stage:
        return "under-contract"
    if "active_buyer" in opp or "buyer" in nxt or "pre-approved" in nxt or "preapproved" in nxt:
        return "active-buyer"
    if any(w in opp or w in nxt for w in SELLER_WORDS):
        return "seller-candidate"
    if "past client" in stage or "past_client" in opp:
        return "past-client"
    return "sphere"


def person_key(row: dict) -> str:
    return (row.get("email") or "").lower() or re.sub(r"\D", "", row.get("phone") or "") or f"id:{row.get('person_id', '')}"


MAX_EMAILS = int(os.getenv("FOLLOWUP_MAX_EMAILS", "25"))
MAX_TEXTS = int(os.getenv("FOLLOWUP_MAX_TEXTS", "25"))


def build_feed_queue(feed: dict, t: dict, as_of: date, max_emails: int = MAX_EMAILS, max_texts: int = MAX_TEXTS) -> dict:
    """The engine already decided who is due. This picks the pool, the template, and email vs text.
    The feed is already sorted (owes_reply, then hot, warm, lukewarm, cold, ice-cold, then longest silence), so the
    daily caps keep the hottest people and defer the rest to tomorrow. Reply-first people are never capped."""
    sent_log = load_json(SENT_LOG, {})
    queue, texts, reply_first, skipped = [], [], [], []
    deferred = 0
    rows = [dict(r, _section="client") for r in feed.get("touches_due", [])] + \
           [dict(r, _section="partner") for r in feed.get("partners", [])]
    for r in rows:
        name = r.get("display") or r.get("phone") or ""
        first = (name.split() or [""])[0].title()
        key = person_key(r)
        if not first.isalpha() or first.lower() in ("household", "unknown"):
            skipped.append((name or r.get("phone", ""), "no usable first name, hand to Caleb"))
            continue
        if (r.get("email") or "").lower() in t["tests"]:
            skipped.append((name, "test address"))
            continue
        if r.get("owes_reply"):
            reply_first.append({"person_id": r.get("person_id", ""), "name": name, "phone": r.get("phone", ""),
                                "email": r.get("email", ""), "last_messages": r.get("last_messages", []),
                                "next_action": r.get("next_action", "")})
            continue
        pool = audience(r)
        used = [e["template"] for e in sent_log.get(key, []) if e.get("pool", e.get("stage")) == pool]
        day = r.get("days_quiet")
        base = {"person_id": r.get("person_id", ""), "name": name, "first_name": first, "email": (r.get("email") or "").lower(),
                "phone": r.get("phone", ""), "stage": pool, "day": day if day is not None else 0, "day_known": day is not None,
                "band": r.get("band", ""), "next_action": r.get("next_action", ""), "address": ""}
        if base["email"]:
            if len(queue) >= max_emails:
                deferred += 1
                continue
            idx = pick_template(t["pools"].get(pool, []), used)
            if idx is None:
                skipped.append((name, f"{pool} pool exhausted, hand to Caleb"))
                continue
            subject = t["subjects"][len(used) % len(t["subjects"])].replace("{{firstname}}", first)
            queue.append({**base, "template": idx, "subject": subject, "body": fill(t["pools"][pool][idx], base) + SIGNOFF})
        elif base["phone"]:
            if len(texts) >= max_texts:
                deferred += 1
                continue
            tpool = t["texts"].get(pool, [])
            idx = pick_template(tpool, used)
            if idx is None:
                skipped.append((name, f"{pool} text pool exhausted, hand to Caleb"))
                continue
            texts.append({**base, "template": idx, "text": fill(tpool[idx], base)})
        else:
            skipped.append((name, "no email or phone"))
    return {"queue": queue, "texts": texts, "reply_first": reply_first, "skipped": skipped, "flagged": [],
            "deferred": deferred, "gmail": False, "source": "feed", "feed_generated_at": feed.get("generated_at", "")}


def write_text_queue(result: dict, as_of: date) -> Path:
    """texts-<date>.md for Caleb's eyes, out/text-queue.json for the Pipeline app's compose box. Both git-ignored."""
    OUT.mkdir(exist_ok=True)
    path = HERE / f"texts-{as_of.isoformat()}.md"
    lines = [f"# Text queue for {as_of.isoformat()}", "",
             "Nothing here sends itself. The Pipeline app shows each one in its compose box; you tap send or skip.", ""]
    if result["reply_first"]:
        lines += ["## REPLY FIRST, they texted you last. No template, read what they said.", ""]
        for r in result["reply_first"]:
            lines.append(f"- {r['name']} {r['phone']} (id:{r['person_id']})")
            for m in r.get("last_messages", []):
                lines.append(f"    them: {m}")
            if r.get("next_action"):
                lines.append(f"    your note: {r['next_action']}")
        lines.append("")
    lines += ["## Drafts", ""]
    for i, q in enumerate(result["texts"], 1):
        quiet = f"{q['day']}d quiet" if q.get("day_known", True) else "never logged"
        lines += [f"{i}. {q['name']} {q['phone']} (id:{q['person_id']}) {q['stage']}, {quiet}, template {q['template'] + 1}",
                  f"   {q['text']}", ""]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    (OUT / "text-queue.json").write_text(json.dumps({
        "generated_at": datetime.now(CENTRAL).isoformat(timespec="seconds"), "as_of": as_of.isoformat(),
        "reply_first": result["reply_first"],
        "drafts": [{"person_id": q["person_id"], "name": q["name"], "phone": q["phone"], "pool": q["stage"],
                    "template": q["template"] + 1, "text": q["text"], "days_quiet": q["day"]} for q in result["texts"]],
    }, indent=1, ensure_ascii=False))
    return path


def log_touch_to_crm(person_id: str, what: str) -> str:
    """After a real send, move Last_Touch in the CRM through the engine's gates. Never called in DRY_RUN."""
    if not person_id or not CRM_PY.exists():
        return "no person_id, CRM not updated"
    import subprocess
    out = subprocess.run([sys.executable, str(CRM_PY), "--json", "touch", str(person_id), what],
                         capture_output=True, text=True, cwd=str(CRM_PY.parent))
    return (out.stdout or out.stderr).strip()[-200:]


def write_queue_file(result: dict, as_of: date) -> Path:
    path = HERE / f"queue-{as_of.isoformat()}.md"
    lines = [f"# Follow-up queue for {as_of.isoformat()}", "",
             f"Gmail history check: {'on' if result['gmail'] else 'OFF, sent-log.json only'}. "
             "Delete any block you do not want sent, then run --approve on this file.", ""]
    for i, q in enumerate(result["queue"], 1):
        idtag = f" id:{q['person_id']}" if q.get("person_id") else ""
        lines += [f"## {i}. {q['name']} <{q['email']}>  stage {q['stage']}, day {q['day']}, template {q['template'] + 1}{idtag}",
                  f"Subject: {q['subject']}", "", q["body"], "", "---", ""]
    if result.get("reply_first"):
        lines += ["## REPLY FIRST (they texted you last, no template, see texts file)", ""]
        lines += [f"- {r['name']} {r['phone']} {r['email']}".rstrip() for r in result["reply_first"]] + [""]
    if result["flagged"]:
        lines += ["## Flagged for Caleb (nothing sent)", ""]
        for c, why, quote in result["flagged"]:
            lines.append(f"- {c['name']} <{c['email']}>: {why}. {quote}")
        lines.append("")
    lines += ["## Skipped", ""] + [f"- {c if isinstance(c, str) else c['name']}: {why}" for c, why in result["skipped"]]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    if result["flagged"]:
        with FLAGS.open("a") as f:
            for c, why, quote in result["flagged"]:
                f.write(f"{as_of.isoformat()} {c['name']} <{c['email']}> {why}: {quote}\n")
    return path


def parse_queue_file(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    items = []
    for block in re.split(r"\n---\n", text):
        m = re.search(r"## \d+\. (.+?) <([^>]+)>\s+stage (\S+), day (\d+), template (\d+)(?: id:(\d+))?\nSubject: ([^\n]*)\n\n(.*)",
                      block.strip(), re.S)
        if m:
            name, email, stage, day, tpl, pid, subject, body = m.groups()
            body = body.split("\n## ")[0].rstrip()
            items.append({"name": name, "email": email.lower(), "stage": stage, "day": int(day),
                          "template": int(tpl) - 1, "person_id": pid or "", "subject": subject.strip(), "body": body})
    return items


def approve(path: Path, t: dict) -> None:
    items = parse_queue_file(path)
    if not items:
        print("nothing left in the queue file")
        return
    now_c = datetime.now(CENTRAL)
    if now_c.hour >= 20 or now_c.hour < 8:
        sys.exit("quiet hours (8 pm to 8 am Central). Run again in the morning.")
    svc = None if DRY_RUN else gmail_service_or_none()
    if not DRY_RUN and not svc:
        sys.exit("DRY_RUN is off but Gmail is not connected. Run the speed-to-lead responder once to sign in.")
    sent_log = load_json(SENT_LOG, {})
    new = not LOG.exists()
    sent = 0
    for q in items:
        if q["email"] in t["tests"]:
            continue
        ts = datetime.now(timezone.utc).isoformat()
        if DRY_RUN:
            print(f"[DRY RUN] would send to {q['email']}: {q['subject']}")
        else:
            try:
                send_email(svc, q["email"], q["subject"], q["body"])
            except Exception as e:
                ERRORS.open("a").write(f"{ts} send failed {q['email']}: {e}\n")
                print(f"error sending to {q['email']}: {e}")
                continue
            sent_log.setdefault(q["email"], []).append({"template": q["template"], "stage": q["stage"], "pool": q["stage"], "at": ts})
            if q.get("person_id"):
                what = "follow-up email (%s template %d)" % (q["stage"], q["template"] + 1)
                print("  crm: " + log_touch_to_crm(q["person_id"], what))
            with LOG.open("a", newline="") as f:
                w = csv.writer(f)
                if new:
                    w.writerow(["email", "name", "stage", "day", "template", "sent_at"])
                    new = False
                w.writerow([q["email"], q["name"], q["stage"], q["day"], q["template"] + 1, ts])
            sent += 1
    if not DRY_RUN:
        SENT_LOG.write_text(json.dumps(sent_log, indent=2))
    print(f"{'dry run complete' if DRY_RUN else f'sent {sent}'}, {len(items)} in file")


# -------------------------------------------------------------------- tests


def run_tests() -> int:
    t = load_templates()
    fails = 0

    def check(ok: bool, label: str) -> None:
        nonlocal fails
        print(f"{'PASS' if ok else 'FAIL'} {label}")
        fails += 0 if ok else 1

    check(set(t["pools"]) >= {"new-lead", "seller-presentation", "under-contract", "past-client", "sphere", "active-buyer", "seller-candidate", "partner", "recruit"}, "nine pools loaded")
    check(all(len(v) >= 4 for v in t["pools"].values()), "every pool has templates")
    check(all("—" not in x and ";" not in x for v in t["pools"].values() for x in v), "no em dashes or semicolons")
    check(len(t["subjects"]) == 6 and "stop emailing" in t["optout"] and "price" in t["handoff"], "subjects and phrase lists")

    contacts = load_contacts(HERE / "tests" / "fixtures" / "contacts.csv")
    as_of = date(2026, 10, 16)
    r = build_queue(contacts, t, as_of)
    names = {q["name"]: q for q in r["queue"]}
    check("Jordan Example" in names and names["Jordan Example"]["day"] == 1, "new lead at day 1 queued")
    check("Taylor Sample" in names and names["Taylor Sample"]["day"] == 7, "seller at day 7 queued")
    check("Morgan Demo" in names and names["Morgan Demo"]["day"] == 3, "under contract at day 3 queued")
    check("Casey Past" in names and names["Casey Past"]["day"] == 90, "past client at day 90 queued")
    check("Riley Closed" not in names, "closed stage skipped")
    check("Caleb Test" not in names, "test address skipped")
    check("Avery Quiet" not in names, "day 5 not a threshold, skipped")
    check("412 Royal St" in fill(t["pools"]["seller-presentation"][1], contacts[1]), "address slot filled")
    check(all("{{" not in q["body"] and "Keller Williams First Choice" in q["body"] for q in r["queue"]),
          "slots filled and brokerage on every message")

    # no-repeat rule: simulate two prior sends to Jordan
    SENT_LOG.write_text(json.dumps({"jordan.example@gmail.com": [{"template": 0}, {"template": 1}]}))
    r2 = build_queue(contacts, t, as_of)
    j = next(q for q in r2["queue"] if q["name"] == "Jordan Example")
    check(j["template"] == 2, "picks first unused template (third) after two sends")
    SENT_LOG.unlink()

    path = write_queue_file(r, as_of)
    parsed = parse_queue_file(path)
    check(len(parsed) == len(r["queue"]) and parsed[0]["body"] == r["queue"][0]["body"], "queue file round-trips")
    path.unlink()

    # feed mode: audiences, reply first, email vs text, CRM ids
    check(set(t["texts"]) >= {"sphere", "past-client", "active-buyer", "seller-candidate", "partner", "recruit"}, "text pools loaded")
    feed = json.loads((HERE / "tests" / "fixtures" / "fake-feed.json").read_text())
    fr = build_feed_queue(feed, t, as_of)
    pools = {q["name"]: q["stage"] for q in fr["queue"] + fr["texts"]}
    check(pools.get("Friend Sphere") == "sphere", "household with no intent -> sphere")
    check(pools.get("Past Client") == "past-client", "past client stage -> past-client pool")
    check(pools.get("Buyer Active") == "active-buyer", "active_buyer opportunity -> active-buyer")
    check(pools.get("Equity Owner") == "seller-candidate", "equity review candidate -> seller-candidate")
    check(pools.get("Lender Pal") == "partner", "lender from the partners section -> partner pool")
    check(pools.get("Rookie Agent") == "recruit", "recruit type -> recruit pool")
    check(any(r["name"] == "Texted Last" for r in fr["reply_first"]) and "Texted Last" not in pools, "owes_reply gets no template, goes to reply first")
    check(fr["reply_first"][0]["last_messages"] == ["2026-10-17: are yall still doing open houses"], "reply first carries their last messages")
    em = {q["name"] for q in fr["queue"]}; tx = {q["name"] for q in fr["texts"]}
    check("Past Client" in em and "Friend Sphere" in tx, "email when they have one, text when phone only")
    check(all(q["person_id"] for q in fr["queue"] + fr["texts"]), "every draft carries the CRM person_id")
    odd = build_feed_queue({"touches_due": [{"person_id": "9", "display": "?Smith household", "phone": "+12255550199", "band": "cold", "days_quiet": None, "type": "household"}]}, t, as_of)
    check(not odd["texts"] and odd["skipped"] and "first name" in odd["skipped"][0][1], "a row with no real first name is handed to Caleb, not templated")
    check(all("{{" not in q["text"] for q in fr["texts"]) and all("Keller Williams First Choice" in q["body"] for q in fr["queue"]), "text slots filled, emails signed")
    qp = write_queue_file(fr, as_of); tp = write_text_queue(fr, as_of)
    back = parse_queue_file(qp)
    check(back and all(b["person_id"] for b in back), "queue file keeps the person_id through the round trip")
    tq = json.loads((OUT / "text-queue.json").read_text())
    check(len(tq["drafts"]) == len(fr["texts"]) and tq["reply_first"][0]["name"] == "Texted Last", "text-queue.json for the Pipeline app")
    check(log_touch_to_crm("", "x").startswith("no person_id"), "touch logging refuses without a person_id")
    capped = build_feed_queue(feed, t, as_of, max_emails=1, max_texts=2)
    check(len(capped["queue"]) == 1 and len(capped["texts"]) == 2 and capped["deferred"] == 3 and len(capped["reply_first"]) == 1,
          "daily caps keep the first in feed order, defer the rest, never cap reply first")
    qp.unlink(); tp.unlink(); (OUT / "text-queue.json").unlink()
    if FLAGS.exists():
        FLAGS.unlink()
    print(f"\n{'ALL PASS' if fails == 0 else str(fails) + ' FAILURES'}  (DRY_RUN={DRY_RUN})")
    return fails


# --------------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--queue", action="store_true")
    ap.add_argument("--approve", metavar="QUEUE_FILE")
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--contacts", default=None, help="legacy CSV mode")
    ap.add_argument("--feed", default=str(FEED), help="aire/crm/feed.json from crm.py feed")
    ap.add_argument("--max-emails", type=int, default=MAX_EMAILS)
    ap.add_argument("--max-texts", type=int, default=MAX_TEXTS)
    ap.add_argument("--as-of", default=None)
    args = ap.parse_args()
    t = load_templates()
    print(f"DRY_RUN={'on' if DRY_RUN else 'OFF, sending for real'}")
    if args.test:
        sys.exit(run_tests())
    if args.queue:
        as_of = date.fromisoformat(args.as_of) if args.as_of else datetime.now(CENTRAL).date()
        if args.contacts or not Path(args.feed).exists():
            contacts = load_contacts(Path(args.contacts or HERE / "contacts.csv"))
            r = build_queue(contacts, t, as_of, gmail_service_or_none())
            path = write_queue_file(r, as_of)
            print(f"queued {len(r['queue'])}, flagged {len(r['flagged'])}, skipped {len(r['skipped'])}")
            print(f"review: {path}")
            return
        feed = load_json(Path(args.feed), {})
        r = build_feed_queue(feed, t, as_of, args.max_emails, args.max_texts)
        path = write_queue_file(r, as_of)
        tpath = write_text_queue(r, as_of)
        by_pool = {}
        for q in r["queue"] + r["texts"]:
            by_pool[q["stage"]] = by_pool.get(q["stage"], 0) + 1
        print(f"feed from {r['feed_generated_at'] or 'unknown'}: {len(r['reply_first'])} reply first, "
              f"{len(r['queue'])} email drafts, {len(r['texts'])} text drafts, {len(r['skipped'])} skipped, "
              f"{r['deferred']} deferred to tomorrow (caps {MAX_EMAILS} emails, {MAX_TEXTS} texts a day)")
        print("by audience: " + ", ".join(f"{k} {v}" for k, v in sorted(by_pool.items())))
        print(f"review: {path} and {tpath}")
        return
    if args.approve:
        approve(Path(args.approve), t)
        return
    ap.print_help()


if __name__ == "__main__":
    main()
