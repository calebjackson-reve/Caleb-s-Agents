"""Desk: the Today, Deadlines, Commission and Bank tabs inside Pipeline.

Read only, always. It reads Caleb's Google Calendar and Gmail and never writes, sends, moves or deletes anything.
The Bank tab reads Chase alert emails in Gmail and nothing else: no bank sign-in, no account numbers, no money moves.

  python3 desk.py auth     # one time on the Mac: a read-only Google sign-in for Calendar and Gmail
  python3 desk.py --test   # offline checks with made-up data
  python3 desk.py --dump   # print what the Desk tab would show right now (real data, read only)

Token: ~/.aire/desk-token.json (AIRE_DESK_TOKEN), made with the same OAuth client crm.py uses
(~/.aire/credentials.json, AIRE_GOOGLE_CREDENTIALS). Scopes are calendar.readonly and gmail.readonly only,
so this token can't send or change anything even by mistake. It is kept apart from the CRM token on purpose.

app.py serves it at GET /api/desk. --demo reads fixtures/demo-desk.json (made-up people) instead of Google.
"""
from __future__ import annotations

import json
import os
import re
import sys
import threading
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
FIXTURE = HERE / "fixtures" / "demo-desk.json"
TOKEN = Path(os.getenv("AIRE_DESK_TOKEN", str(Path.home() / ".aire" / "desk-token.json")))
CREDENTIALS = Path(os.getenv("AIRE_GOOGLE_CREDENTIALS", str(Path.home() / ".aire" / "credentials.json")))
SCOPES = ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/gmail.readonly"]
CENTRAL = ZoneInfo("America/Chicago")
ACCOUNT = os.getenv("AIRE_DESK_ACCOUNT", "aire@calebjackson.org")
CACHE_SECONDS = 300
SIGN_IN = "sign in needed: run python3 aire/pipeline-app/desk.py auth on the Mac"

# Gmail searches. Each one is a read.
Q_INBOX = "in:inbox newer_than:3d -from:me"
Q_COMMISSION = 'subject:(commission OR disbursement OR CDA OR "closing statement") newer_than:120d'
Q_BANK = "from:(chase.com) newer_than:30d"

# Caleb's split (his words, 2026-11-04 thread): 70/30 until cap, cap year starts Nov 1.
SPLIT = {"agent": 70, "brokerage": 30, "cap_year_starts": "11-01"}


# ------------------------------------------------------------------ rules (pure, tested)

def event_kind(ev: dict) -> str | None:
    """deadline, block, event, or None to drop it."""
    title = ev.get("title", "")
    if re.match(r"\s*working hours", title, re.I):
        return None
    if re.search(r"deadline", title, re.I) or str(ev.get("creator", "")).lower().endswith("theexecutivelady.com"):
        return "deadline"
    if re.match(r"\s*sales block", title, re.I) or ev.get("event_type") == "focusTime":
        return "block"
    return "event"


def mail_category(m: dict) -> str:
    subj, frm = m.get("subject", ""), m.get("from", "")
    if re.search(r"new lead", subj, re.I):
        return "Lead"
    if re.search(r"theexecutivelady|authentisign|docusign|title\.com|ccim", frm, re.I) or \
            re.search(r"offer|counter|inspection|commission|closing|purchase agreement", subj, re.I):
        return "Deal"
    return "Other"


def commission_status(m: dict) -> str:
    return "Not processed" if re.search(r"not processed", m.get("subject", ""), re.I) else "Notice"


def bank_type(m: dict) -> str:
    text = f'{m.get("subject", "")} {m.get("snippet", "")}'
    if re.search(r"deposit|direct dep|credit", text, re.I):
        return "Deposit"
    if re.search(r"balance", text, re.I):
        return "Balance"
    return "Alert"


def split_deal(title: str) -> tuple[str, str]:
    """'Turnberry - Inspection Deadline' -> ('Turnberry', 'Inspection Deadline')."""
    if " - " in title:
        a, b = title.split(" - ", 1)
        return a.strip(), b.strip()
    return title.strip(), ""


def day_of(iso: str) -> date:
    return datetime.fromisoformat(iso).astimezone(CENTRAL).date() if "T" in iso else date.fromisoformat(iso[:10])


def week_load(events: list[dict], start: date, days: int = 7) -> list[dict]:
    """Booked hours per day: timed events that are not marked free."""
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        hrs = 0.0
        for e in events:
            if e.get("all_day") or e.get("free") or "T" not in e.get("start", ""):
                continue
            s, f = datetime.fromisoformat(e["start"]).astimezone(CENTRAL), datetime.fromisoformat(e["end"]).astimezone(CENTRAL)
            lo = max(s, datetime.combine(d, datetime.min.time(), CENTRAL))
            hi = min(f, datetime.combine(d + timedelta(days=1), datetime.min.time(), CENTRAL))
            if hi > lo:
                hrs += (hi - lo).total_seconds() / 3600
        out.append({"day": d.isoformat(), "hours": round(hrs, 1)})
    return out


def mail_link(thread_id: str) -> str:
    return f"https://mail.google.com/mail/?authuser={ACCOUNT}#all/{thread_id}" if re.fullmatch(r"[0-9a-f]{6,32}", thread_id or "") else ""


def build(today_events: list[dict], week_events: list[dict], deadline_events: list[dict],
          inbox: list[dict], commission: list[dict], bank: list[dict], now: datetime) -> dict:
    """Everything the Desk tab draws, from already-fetched events and mail."""
    today = now.astimezone(CENTRAL).date()

    def keep(evs):
        out = []
        for e in evs:
            k = event_kind(e)
            if k:
                out.append({**e, "kind": k})
        return out

    t = keep(today_events)
    dl = [e for e in keep(deadline_events) if e["kind"] == "deadline"]
    for e in dl:
        e["deal"], e["what"] = split_deal(e.get("title", ""))
        e["days_out"] = (day_of(e["start"]) - today).days
    dl.sort(key=lambda e: e["start"])
    for m in inbox:
        m["category"] = mail_category(m); m["link"] = mail_link(m.get("thread_id", ""))
    inbox.sort(key=lambda m: ("Lead", "Deal", "Other").index(m["category"]))
    for m in commission:
        m["status"] = commission_status(m); m["link"] = mail_link(m.get("thread_id", ""))
    for m in bank:
        m["type"] = bank_type(m); m["link"] = mail_link(m.get("thread_id", ""))
    acts = [e for e in dl if re.search(r"act of sale|closing", e.get("title", ""), re.I)]
    booked = sum(w["hours"] for w in week_load(t, today, 1))
    return {
        "as_of": now.astimezone(CENTRAL).replace(microsecond=0).isoformat(),
        "today": t,
        "week": week_load(keep(week_events), today, 7),
        "deadlines": dl,
        "acts_of_sale": acts,
        "inbox": inbox,
        "commission": commission,
        "bank": bank,
        "split": SPLIT,
        "counts": {
            "leads": sum(m["category"] == "Lead" for m in inbox),
            "deal_mail": sum(m["category"] == "Deal" for m in inbox),
            "deadlines_7d": sum(0 <= e["days_out"] <= 7 for e in dl),
            "deadlines_3d": sum(0 <= e["days_out"] <= 3 for e in dl),
            "deadlines_30d": len(dl),
            "deals_with_deadline": len({e["deal"] for e in dl}),
            "acts_of_sale": len(acts),
            "booked_today": round(booked, 1),
            "commission": len(commission),
            "not_processed": sum(m["status"] == "Not processed" for m in commission),
            "bank": len(bank),
            "deposits": sum(m["type"] == "Deposit" for m in bank),
        },
    }


# ------------------------------------------------------------------ Google (read only)

class Google:
    def __init__(self, token: Path = TOKEN):
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build as gbuild
        if not token.exists():
            raise FileNotFoundError(SIGN_IN)
        creds = Credentials.from_authorized_user_file(str(token), SCOPES)
        self.cal = gbuild("calendar", "v3", credentials=creds, cache_discovery=False)
        self.gm = gbuild("gmail", "v1", credentials=creds, cache_discovery=False)

    def events(self, start: datetime, end: datetime, q: str = "", limit: int = 150) -> list[dict]:
        kw = dict(calendarId="primary", timeMin=start.isoformat(), timeMax=end.isoformat(), singleEvents=True,
                  orderBy="startTime", maxResults=limit)
        if q:
            kw["q"] = q
        items = self.cal.events().list(**kw).execute(num_retries=3).get("items", [])
        out = []
        for it in items:
            s, e = it.get("start", {}), it.get("end", {})
            out.append({
                "title": it.get("summary", "(no title)"),
                "start": s.get("dateTime") or s.get("date", ""), "end": e.get("dateTime") or e.get("date", ""),
                "all_day": "date" in s and "dateTime" not in s, "free": it.get("transparency") == "transparent",
                "event_type": it.get("eventType", ""), "creator": (it.get("creator") or {}).get("email", ""),
                "notes": re.sub(r"<[^>]+>", " ", it.get("description", "") or "")[:240].strip(),
                "link": it.get("htmlLink", "") if str(it.get("htmlLink", "")).startswith("https://www.google.com/calendar/") else "",
            })
        return out

    def mail(self, q: str, limit: int = 25) -> list[dict]:
        res = self.gm.users().messages().list(userId="me", q=q, maxResults=limit).execute(num_retries=3)
        out = []
        for m in res.get("messages", []):
            full = self.gm.users().messages().get(userId="me", id=m["id"], format="metadata",
                                                  metadataHeaders=["From", "Subject", "Date"]).execute(num_retries=3)
            h = {x["name"]: x["value"] for x in full.get("payload", {}).get("headers", [])}
            when = datetime.fromtimestamp(int(full.get("internalDate", "0")) / 1000, CENTRAL)
            out.append({"from": re.sub(r"\s*<[^>]+>", "", h.get("From", "")).strip('" ') or h.get("From", ""),
                        "subject": h.get("Subject", "(no subject)"), "snippet": full.get("snippet", "")[:160],
                        "date": when.replace(microsecond=0).isoformat(), "thread_id": full.get("threadId", "")})
        return out


def fetch_live(g: Google, now: datetime) -> dict:
    day0 = datetime.combine(now.astimezone(CENTRAL).date(), datetime.min.time(), CENTRAL)
    return build(
        g.events(day0, day0 + timedelta(days=1)),
        g.events(day0, day0 + timedelta(days=7)),
        g.events(day0, day0 + timedelta(days=30), q="Deadline"),
        g.mail(Q_INBOX), g.mail(Q_COMMISSION), g.mail(Q_BANK), now)


def fixture(now: datetime, path: Path = FIXTURE) -> dict:
    """Demo data with relative dates: '+2d 14:00' is two days from today at 2 PM Central."""
    raw = json.loads(path.read_text())
    today = now.astimezone(CENTRAL).date()

    def when(v: str) -> str:
        m = re.fullmatch(r"([+-]\d+)d(?: (\d\d):(\d\d))?", v)
        if not m:
            return v
        d = today + timedelta(days=int(m.group(1)))
        if not m.group(2):
            return d.isoformat()
        return datetime(d.year, d.month, d.day, int(m.group(2)), int(m.group(3)), tzinfo=CENTRAL).isoformat()

    def fix(rows, keys):
        return [{**r, **{k: when(r[k]) for k in keys if k in r}} for r in rows]
    ev = fix(raw["events"], ("start", "end"))
    t0 = today.isoformat()
    today_ev = [e for e in ev if e["start"][:10] == t0]
    week_ev = [e for e in ev if 0 <= (day_of(e["start"]) - today).days < 7]
    dl_ev = [e for e in ev if "deadline" in e["title"].lower() and 0 <= (day_of(e["start"]) - today).days < 30]
    return build(today_ev, week_ev, dl_ev, fix(raw["inbox"], ("date",)), fix(raw["commission"], ("date",)),
                 fix(raw["bank"], ("date",)), now)


class Desk:
    """What app.py holds. Cached for five minutes so the 30 second poll never hits Google."""

    def __init__(self, demo: bool = False, google_factory=None, clock=None):
        self.demo, self.factory, self.clock = demo, google_factory or Google, clock or (lambda: datetime.now(CENTRAL))
        self.lock, self.cached, self.at = threading.Lock(), None, 0.0

    def snapshot(self, force: bool = False) -> dict:
        with self.lock:
            if self.cached and not force and time.time() - self.at < CACHE_SECONDS:
                return self.cached
            now = self.clock()
            try:
                data = fixture(now) if self.demo else fetch_live(self.factory(), now)
                out = {"ok": True, "demo": self.demo, "source": "demo" if self.demo else "google", "result": data}
            except FileNotFoundError:
                out = {"ok": False, "error": SIGN_IN}
            except ImportError:
                out = {"ok": False, "error": "the Google libraries are missing here: start Pipeline with ~/.aire/venv/bin/python"}
            except Exception as e:  # a Google hiccup must never take the app down
                msg = str(e)
                if "invalid_grant" in msg or "invalid_scope" in msg:
                    out = {"ok": False, "error": SIGN_IN}
                else:
                    out = {"ok": False, "error": f"Google did not answer ({type(e).__name__})"}
            if out["ok"]:
                self.cached, self.at = out, time.time()
            return out


# ------------------------------------------------------------------ auth, tests

def auth() -> None:
    from google_auth_oauthlib.flow import InstalledAppFlow
    if not CREDENTIALS.exists():
        sys.exit(f"Put the Google OAuth client file at {CREDENTIALS} first (the same one crm.py auth uses).")
    creds = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS), SCOPES).run_local_server(port=0)
    TOKEN.parent.mkdir(parents=True, exist_ok=True)
    TOKEN.write_text(creds.to_json())
    os.chmod(TOKEN, 0o600)
    print(f"Signed in read only (Calendar and Gmail). Token saved to {TOKEN}")


def run_tests() -> int:
    failures = 0

    def check(cond, label):
        nonlocal failures
        print(("ok   " if cond else "FAIL ") + label)
        failures += 0 if cond else 1

    check(event_kind({"title": "Working hours"}) is None, "working hours are dropped")
    check(event_kind({"title": "Oak Hollow - Inspection Deadline"}) == "deadline", "a title with Deadline is a deadline")
    check(event_kind({"title": "Walkthrough", "creator": "calendar.theexecutivelady.com"}) == "deadline", "the TC's events are deadlines")
    check(event_kind({"title": "Sales block"}) == "block" and event_kind({"title": "x", "event_type": "focusTime"}) == "block", "sales blocks and focus time are work blocks")
    check(event_kind({"title": "Lunch"}) == "event", "anything else is an event")
    check(mail_category({"subject": "New Lead: Pat Example"}) == "Lead", "new lead subject is a Lead")
    check(mail_category({"subject": "hi", "from": "Docs via docusign.net"}) == "Deal", "a DocuSign sender is Deal")
    check(mail_category({"subject": "Counter offer on 1 Made Up St"}) == "Deal", "counter offer is Deal")
    check(mail_category({"subject": "Newsletter"}) == "Other", "anything else is Other")
    check(commission_status({"subject": "Commission Not Processed - 9 Sample Ct"}) == "Not processed", "not processed is flagged")
    check(bank_type({"subject": "You have a direct deposit"}) == "Deposit" and bank_type({"subject": "Your balance is low"}) == "Balance"
          and bank_type({"subject": "Card used online"}) == "Alert", "Chase alerts sort into Deposit, Balance, Alert")
    check(split_deal("Oak Hollow - Act of Sale") == ("Oak Hollow", "Act of Sale") and split_deal("Closing") == ("Closing", ""), "titles split into deal and what")
    check(mail_link("18f2a9c0b1d2e3f4").endswith("#all/18f2a9c0b1d2e3f4") and mail_link("x/../y") == "", "mail links only from a real thread id")
    d0 = date(2026, 11, 4)
    evs = [{"title": "a", "start": "2026-11-04T09:00:00-06:00", "end": "2026-11-04T11:30:00-06:00"},
           {"title": "b", "start": "2026-11-04T13:00:00-06:00", "end": "2026-11-04T14:00:00-06:00", "free": True},
           {"title": "c", "start": "2026-11-05", "end": "2026-11-06", "all_day": True},
           {"title": "d", "start": "2026-11-05T23:00:00-06:00", "end": "2026-11-06T01:00:00-06:00"}]
    wl = week_load(evs, d0, 3)
    check([w["hours"] for w in wl] == [2.5, 1.0, 1.0], "week load counts timed, busy hours and splits at midnight")

    now = datetime(2026, 11, 4, 10, 0, tzinfo=CENTRAL)
    f = fixture(now)
    c = f["counts"]
    check(c["leads"] >= 1 and c["deadlines_7d"] >= 1 and c["commission"] >= 1 and c["bank"] >= 1, "demo fixture fills every tab")
    check(all(e["kind"] == "deadline" for e in f["deadlines"]) and f["deadlines"] == sorted(f["deadlines"], key=lambda e: e["start"]), "deadlines are sorted by time")
    check([m["category"] for m in f["inbox"]] == sorted([m["category"] for m in f["inbox"]], key=("Lead", "Deal", "Other").index), "inbox sorts Lead, Deal, Other")
    check(not any(e["title"].lower().startswith("working hours") for e in f["today"]), "the demo drops working hours")
    check(len(f["week"]) == 7 and f["week"][0]["day"] == "2026-11-04", "seven days from today")

    class FakeG:
        calls = []
        def events(self, a, b, q="", limit=150):
            FakeG.calls.append(("events", q)); return []
        def mail(self, q, limit=25):
            FakeG.calls.append(("mail", q)); return [{"from": "Chase", "subject": "Direct deposit posted", "snippet": "", "date": now.isoformat(), "thread_id": "abc123def456"}] if "chase" in q else []
    dk = Desk(google_factory=FakeG, clock=lambda: now)
    s1 = dk.snapshot()
    check(s1["ok"] and s1["result"]["counts"]["deposits"] == 1, "live path builds from Google reads")
    n = len(FakeG.calls); dk.snapshot()
    check(len(FakeG.calls) == n, "a second look inside five minutes does not call Google again")
    check({q for k, q in FakeG.calls if k == "mail"} == {Q_INBOX, Q_COMMISSION, Q_BANK}, "only the three Gmail searches run")

    def missing():
        raise FileNotFoundError(SIGN_IN)
    check(Desk(google_factory=missing).snapshot() == {"ok": False, "error": SIGN_IN}, "no token says how to sign in")

    def boom():
        raise RuntimeError("token: x secret y")
    e = Desk(google_factory=boom).snapshot()
    check(not e["ok"] and "secret" not in e["error"], "a Google error is one plain line with nothing from inside it")
    check(SCOPES == ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/gmail.readonly"], "the token is read only")
    src = Path(__file__).read_text()
    check(not re.search(r"\.(send|insert|modify|trash|delete|patch|update)\(", src), "desk.py never calls a Google write")
    print(f"\n{failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    if sys.argv[1:] == ["auth"]:
        auth()
    elif sys.argv[1:] == ["--test"]:
        sys.exit(run_tests())
    elif sys.argv[1:] == ["--dump"]:
        print(json.dumps(Desk().snapshot(force=True), indent=2))
    else:
        print(__doc__)
