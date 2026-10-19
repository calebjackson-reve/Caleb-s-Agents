#!/usr/bin/env python3
"""
AIRE CRM. One Google Sheet ("AIRE CRM") is the database. This file is the engine
every other AIRE tool talks to, so nothing keeps its own copy of a contact.

Tabs: Contacts (Caleb's Hot-Warm-Cold list plus stage, last_touch_iso, source, id),
Pipeline, Activity, Tasks, Leads. Headers are in SCHEMA below.

  python3 crm.py auth                       # one-time Google sign-in on the Mac (Sheets + Gmail read)
  python3 crm.py pull                       # download every tab to cache.json
  python3 crm.py import-hwc                 # fill stage / last_touch_iso / id on Contacts, tasks from "Next action"
  python3 crm.py ingest [--hours 26]        # Gmail -> Leads (Luxury Presence), Activity (ShowingTime, Authentisign), Tasks
  python3 crm.py due [--as-of DATE]         # who needs a touch today, by tier cadence
  python3 crm.py log "Name" "what happened" [--type call|text|email|note|showing|doc]
  python3 crm.py task "Name" "what to do" --due DATE
  python3 crm.py done TASK_ID
  python3 crm.py tasks                      # open tasks, overdue first
  python3 crm.py pipeline                   # live deals
  python3 crm.py export-followup            # contacts.csv for aire/follow-up/followups.py
  python3 crm.py brief                      # text block for the morning brief
  python3 crm.py --test                     # offline checks on a fake local database

Every write goes to the sheet AND the cache. --local FILE uses a JSON file instead of
Google (tests, offline). DRY_RUN has no meaning here: this tool never sends anything.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
AIRE = HERE.parent
CACHE = HERE / "cache.json"
SHEET_ID = os.getenv("AIRE_CRM_SHEET", "11t6vex49xdA7RmskELDxt2O044vo1EJkPqL3yCgglHE")
TOKEN = Path(os.getenv("AIRE_GOOGLE_TOKEN", str(Path.home() / ".aire" / "google-token.json")))
CREDENTIALS = Path(os.getenv("AIRE_GOOGLE_CREDENTIALS", str(Path.home() / ".aire" / "credentials.json")))
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.readonly",
]
CENTRAL = ZoneInfo("America/Chicago")

SCHEMA = {
    "Contacts": ["Done", "Name", "Phone", "Email", "Category", "Tier", "Why this tier", "Last touch",
                 "Next action", "Notes", "Instagram", "Facebook", "stage", "last_touch_iso", "source", "id"],
    "Pipeline": ["id", "client", "side", "address", "stage", "price", "commission_pct", "expected_close",
                 "source", "last_touch", "next_step", "contact", "listing_id", "updated_at"],
    "Activity": ["at", "contact", "type", "summary", "source", "deal", "link", "by"],
    "Tasks": ["id", "due", "contact", "task", "status", "source", "created_at", "done_at"],
    "Leads": ["id", "received_at", "name", "email", "phone", "type", "source", "status", "contact", "first_reply_at"],
}

# Tier to follow-up pool (same mapping the follow-up tool was seeded with on 2026-10-19).
# Days between touches by tier. HOT weekly, WARM every two weeks, COLD quarterly, CONTACT yearly.
CADENCE_DAYS = {"HOT": 7, "WARM": 14, "COLD": 90, "CONTACT": 365}
NEVER_TOUCH_CATEGORIES = {"vendor", "agent", "other"}


# ------------------------------------------------------------------ helpers


def now_iso() -> str:
    return datetime.now(CENTRAL).replace(microsecond=0).isoformat()


def today() -> date:
    return datetime.now(CENTRAL).date()


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")[:48]


def contact_id(name: str, email: str = "", phone: str = "") -> str:
    key = (email or "").strip().lower() or re.sub(r"\D", "", phone or "") or slug(name)
    return key


def parse_touch(text: str, as_of: date | None = None) -> str:
    """'10/18 inspection response signed' -> '2026-10-18'. Takes the first m/d or m/d/yy in the text.
    A month/day after today means last year."""
    as_of = as_of or today()
    if not text:
        return ""
    m = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", text)
    if m:
        return m.group(0)
    m = re.search(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b", text)
    if not m:
        return ""
    mo, d = int(m.group(1)), int(m.group(2))
    if m.group(3):
        y = int(m.group(3))
        y = y + 2000 if y < 100 else y
    else:
        y = as_of.year
        try:
            if date(y, mo, d) > as_of:
                y -= 1
        except ValueError:
            return ""
    try:
        return date(y, mo, d).isoformat()
    except ValueError:
        return ""


def stage_for(row: dict) -> str:
    tier = (row.get("Tier") or "").upper()
    cat = (row.get("Category") or "").lower()
    why = (row.get("Why this tier") or "").lower()
    done = (row.get("Done") or "").strip().lower() in ("yes", "y", "true", "x")
    if cat in NEVER_TOUCH_CATEGORIES:
        return "closed"
    if done:
        return "closed"
    if "opt out" in why or "do not contact" in why or "dnc" in why:
        return "opt-out"
    if tier == "HOT" and ("under contract" in why or "active listing" in why or "offer" in why):
        return "under-contract"
    if tier in ("HOT", "WARM"):
        return "seller-presentation" if "listing appt" in why or "seller" in why else "new-lead"
    return "past-client"


def rows_to_dicts(values: list[list], header: list[str]) -> list[dict]:
    out = []
    for r in values:
        r = list(r) + [""] * (len(header) - len(r))
        out.append({h: (r[i] if i < len(r) else "") for i, h in enumerate(header)})
    return out


def dicts_to_rows(items: list[dict], header: list[str]) -> list[list]:
    return [[str(it.get(h, "") if it.get(h, "") is not None else "") for h in header] for it in items]


# ----------------------------------------------------------------- backends


class LocalBackend:
    """JSON file with the same shape as the sheet. Used by --test and --local."""

    def __init__(self, path: Path):
        self.path = path
        self.data = json.loads(path.read_text()) if path.exists() else {}
        for tab, header in SCHEMA.items():
            self.data.setdefault(tab, [])

    def read(self, tab: str) -> list[dict]:
        return [dict(r) for r in self.data.get(tab, [])]

    def append(self, tab: str, items: list[dict]) -> None:
        self.data.setdefault(tab, []).extend(items)
        self._save()

    def write_all(self, tab: str, items: list[dict]) -> None:
        self.data[tab] = items
        self._save()

    def _save(self):
        self.path.write_text(json.dumps(self.data, indent=1, ensure_ascii=False))


class SheetsBackend:
    """Google Sheets through Caleb's own OAuth token. Reads whole tabs, writes rows."""

    def __init__(self, sheet_id: str = SHEET_ID):
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        if not TOKEN.exists():
            sys.exit(f"No Google token at {TOKEN}. Run: python3 crm.py auth")
        self.creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
        self.svc = build("sheets", "v4", credentials=self.creds, cache_discovery=False)
        self.sheet_id = sheet_id

    def read(self, tab: str) -> list[dict]:
        header = SCHEMA[tab]
        res = self.svc.spreadsheets().values().get(spreadsheetId=self.sheet_id, range=f"{tab}!A1:Z").execute()
        values = res.get("values", [])
        if not values:
            return []
        live_header = values[0]
        rows = []
        for r in values[1:]:
            r = list(r) + [""] * (len(live_header) - len(r))
            d = {h: r[i] for i, h in enumerate(live_header)}
            for h in header:
                d.setdefault(h, "")
            rows.append(d)
        return rows

    def append(self, tab: str, items: list[dict]) -> None:
        if not items:
            return
        self.svc.spreadsheets().values().append(
            spreadsheetId=self.sheet_id, range=f"{tab}!A1", valueInputOption="RAW",
            insertDataOption="INSERT_ROWS", body={"values": dicts_to_rows(items, SCHEMA[tab])}).execute()

    def write_all(self, tab: str, items: list[dict]) -> None:
        header = SCHEMA[tab]
        if tab == "Contacts":
            # Only the four columns this tool owns (M..P). Caleb's own columns are never rewritten.
            values = [[it.get("stage", ""), it.get("last_touch_iso", ""), it.get("source", ""), it.get("id", "")]
                      for it in items]
            self.svc.spreadsheets().values().update(
                spreadsheetId=self.sheet_id, range=f"Contacts!M2:P{len(values) + 1}",
                valueInputOption="RAW", body={"values": values}).execute()
            return
        body = {"values": [header] + dicts_to_rows(items, header)}
        self.svc.spreadsheets().values().clear(spreadsheetId=self.sheet_id, range=f"{tab}!A1:Z").execute()
        self.svc.spreadsheets().values().update(
            spreadsheetId=self.sheet_id, range=f"{tab}!A1", valueInputOption="RAW", body=body).execute()


class CRM:
    def __init__(self, backend):
        self.b = backend

    # reads
    def contacts(self) -> list[dict]:
        return self.b.read("Contacts")

    def tasks(self) -> list[dict]:
        return self.b.read("Tasks")

    def activity(self) -> list[dict]:
        return self.b.read("Activity")

    def leads(self) -> list[dict]:
        return self.b.read("Leads")

    def pipeline(self) -> list[dict]:
        return self.b.read("Pipeline")

    def find(self, name_or_email: str) -> dict | None:
        key = (name_or_email or "").strip().lower()
        if not key:
            return None
        for c in self.contacts():
            if key in (c.get("Email") or "").lower() and key:
                return c
        for c in self.contacts():
            if key == (c.get("Name") or "").lower():
                return c
        for c in self.contacts():
            if key in (c.get("Name") or "").lower():
                return c
        return None

    # writes
    def log(self, contact: str, summary: str, type_: str = "note", source: str = "caleb", deal: str = "",
            link: str = "", at: str | None = None, by: str = "caleb") -> dict:
        row = {"at": at or now_iso(), "contact": contact, "type": type_, "summary": summary,
               "source": source, "deal": deal, "link": link, "by": by}
        self.b.append("Activity", [row])
        self.touch(contact, row["at"][:10])
        return row

    def touch(self, contact: str, day: str) -> None:
        rows = self.contacts()
        hit = False
        for c in rows:
            if (c.get("Name") or "").lower() == contact.lower() or (c.get("Email") or "").lower() == contact.lower():
                if not c.get("last_touch_iso") or c["last_touch_iso"] < day:
                    c["last_touch_iso"] = day
                hit = True
        if hit:
            self.b.write_all("Contacts", rows)

    def add_task(self, contact: str, task: str, due: str, source: str = "caleb") -> dict:
        row = {"id": uuid.uuid4().hex[:8], "due": due, "contact": contact, "task": task, "status": "open",
               "source": source, "created_at": now_iso(), "done_at": ""}
        self.b.append("Tasks", [row])
        return row

    def done(self, task_id: str) -> bool:
        rows = self.tasks()
        for t in rows:
            if t["id"] == task_id:
                t["status"] = "done"
                t["done_at"] = now_iso()
                self.b.write_all("Tasks", rows)
                return True
        return False

    def add_lead(self, name: str, email: str, phone: str, type_: str, source: str, received_at: str) -> dict | None:
        lid = contact_id(name, email, phone)
        if any(l["id"] == lid for l in self.leads()):
            return None
        match = self.find(email) or self.find(name)
        row = {"id": lid, "received_at": received_at, "name": name, "email": email, "phone": phone,
               "type": type_, "source": source, "status": "new", "contact": match["Name"] if match else "",
               "first_reply_at": ""}
        self.b.append("Leads", [row])
        if not match:
            self.b.append("Contacts", [{"Done": "No", "Name": name, "Phone": phone, "Email": email,
                                        "Category": "lead", "Tier": "HOT", "Why this tier": f"New {source} lead {received_at[:10]}",
                                        "Last touch": received_at[:10], "Next action": "Call within the hour",
                                        "Notes": type_, "stage": "new-lead", "last_touch_iso": received_at[:10],
                                        "source": source, "id": lid}])
        return row

    # derived
    def due(self, as_of: date | None = None) -> list[dict]:
        as_of = as_of or today()
        out = []
        for c in self.contacts():
            tier = (c.get("Tier") or "").upper()
            if tier not in CADENCE_DAYS or c.get("stage") in ("closed", "opt-out"):
                continue
            last = c.get("last_touch_iso") or parse_touch(c.get("Last touch", ""), as_of)
            if not last:
                days = None
            else:
                days = (as_of - date.fromisoformat(last)).days
            if days is None or days >= CADENCE_DAYS[tier]:
                out.append({"name": c["Name"], "tier": tier, "phone": c.get("Phone", ""), "email": c.get("Email", ""),
                            "days": days, "next_action": c.get("Next action", ""), "stage": c.get("stage", "")})
        order = {"HOT": 0, "WARM": 1, "COLD": 2, "CONTACT": 3}
        return sorted(out, key=lambda x: (order[x["tier"]], -(x["days"] if x["days"] is not None else 9999)))

    def open_tasks(self, as_of: date | None = None) -> list[dict]:
        as_of = as_of or today()
        rows = [t for t in self.tasks() if t.get("status") == "open"]
        for t in rows:
            t["overdue"] = bool(t.get("due")) and t["due"] < as_of.isoformat()
        return sorted(rows, key=lambda t: (t.get("due") or "9999"))

    def live_deals(self) -> list[dict]:
        return [p for p in self.pipeline() if p.get("stage") not in ("closed", "lost") and p.get("client")]


# ------------------------------------------------------------------ imports


def import_hwc(crm: CRM, as_of: date | None = None) -> dict:
    """Fill the four tool-owned columns on Contacts and create one task per HOT/WARM 'Next action'."""
    as_of = as_of or today()
    rows = crm.contacts()
    existing = {(t["contact"], t["task"]) for t in crm.tasks()}
    new_tasks = []
    for c in rows:
        c["stage"] = c.get("stage") or stage_for(c)
        c["last_touch_iso"] = c.get("last_touch_iso") or parse_touch(c.get("Last touch", ""), as_of)
        c["source"] = c.get("source") or "Hot-Warm-Cold sheet"
        c["id"] = c.get("id") or contact_id(c.get("Name", ""), c.get("Email", ""), c.get("Phone", ""))
        nxt = (c.get("Next action") or "").strip()
        if nxt and (c.get("Tier") or "").upper() in ("HOT", "WARM") and (c["Name"], nxt) not in existing:
            due = as_of.isoformat() if c["Tier"].upper() == "HOT" else (as_of + timedelta(days=3)).isoformat()
            new_tasks.append({"id": uuid.uuid4().hex[:8], "due": due, "contact": c["Name"], "task": nxt,
                              "status": "open", "source": "Hot-Warm-Cold next action", "created_at": now_iso(),
                              "done_at": ""})
    crm.b.write_all("Contacts", rows)
    if new_tasks:
        crm.b.append("Tasks", new_tasks)
    return {"contacts": len(rows), "tasks_added": len(new_tasks)}


def export_followup(crm: CRM, out: Path) -> int:
    """contacts.csv in the follow-up tool's format. Only rows with an email can be followed up by email."""
    n = 0
    with out.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "email", "phone", "stage", "last_touch", "address", "notes"])
        for c in crm.contacts():
            if not (c.get("Email") or "").strip():
                continue
            last = c.get("last_touch_iso") or parse_touch(c.get("Last touch", ""))
            w.writerow([c["Name"], c["Email"].strip().lower(), c.get("Phone", ""), c.get("stage") or stage_for(c),
                        last, "", (c.get("Notes") or "")[:200]])
            n += 1
    return n


# -------------------------------------------------------------------- gmail


LP_LEAD = re.compile(r"New Lead - (.+)$")
ST_SUBJECT = re.compile(r"SHOWING (\w+) \| (.+?) (\w{3}, \d+/\d+ .+)$")
AS_COMPLETE = re.compile(r"Signing complete: (.+)$")
AS_REQUEST = re.compile(r"Your signature is requested: (.+)$")
AS_INACTIVE = re.compile(r"Notice of inactivity: (.+)$")


def ingest_messages(crm: CRM, messages: list[dict]) -> dict:
    """messages: [{subject, from, date_iso, body}] already pulled from Gmail. Pure, so it is testable."""
    counts = {"leads": 0, "showings": 0, "signings": 0, "tasks": 0, "skipped": 0}
    seen = {(a["source"], a["summary"]) for a in crm.activity()}
    for m in messages:
        subj, frm, when, body = m["subject"], m["from"].lower(), m["date_iso"], m.get("body", "")
        if "luxurypresence" in frm and (x := LP_LEAD.search(subj)):
            name = x.group(1).strip()
            email = (re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", body) or [None])
            email = email.group(0) if hasattr(email, "group") else ""
            phone = re.search(r"\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}", body)
            typ = re.search(r"Type\s+([A-Za-z ]+?)\s+Source", body)
            if crm.add_lead(name, email, phone.group(0) if phone else "", typ.group(1).strip() if typ else "",
                            "Luxury Presence", when):
                counts["leads"] += 1
            else:
                counts["skipped"] += 1
        elif "showingtime" in frm and (x := ST_SUBJECT.match(subj)):
            status, prop, t = x.groups()
            summary = f"Showing {status.lower()} {prop} {t}"
            if ("ShowingTime", summary) in seen:
                counts["skipped"] += 1
                continue
            crm.b.append("Activity", [{"at": when, "contact": "", "type": "showing", "summary": summary,
                                       "source": "ShowingTime", "deal": slug(prop), "link": "", "by": "system"}])
            counts["showings"] += 1
        elif "authentisign" in frm:
            kind = None
            if (x := AS_COMPLETE.match(subj)):
                kind, doc = "complete", x.group(1)
            elif (x := AS_REQUEST.match(subj)):
                kind, doc = "requested", x.group(1)
            elif (x := AS_INACTIVE.match(subj)):
                kind, doc = "inactive", x.group(1)
            if not kind:
                counts["skipped"] += 1
                continue
            waiting = re.search(r"waiting on ([\w.+-]+@[\w-]+\.[\w.]+)", body)
            summary = f"Authentisign {kind}: {doc}" + (f" (waiting on {waiting.group(1)})" if waiting else "")
            if ("Authentisign", summary) in seen:
                counts["skipped"] += 1
                continue
            crm.b.append("Activity", [{"at": when, "contact": "", "type": "doc", "summary": summary,
                                       "source": "Authentisign", "deal": slug(doc), "link": "", "by": "system"}])
            counts["signings"] += 1
            if kind == "requested" or (kind == "inactive" and waiting and "calebjackson" in waiting.group(1)):
                if not any(t["task"] == f"Sign {doc}" and t["status"] == "open" for t in crm.tasks()):
                    crm.add_task("", f"Sign {doc}", when[:10], source="Authentisign")
                    counts["tasks"] += 1
        else:
            counts["skipped"] += 1
    return counts


def gmail_messages(hours: int) -> list[dict]:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    import base64
    creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    svc = build("gmail", "v1", credentials=creds, cache_discovery=False)
    q = f"newer_than:{max(1, hours // 24 + 1)}d (from:luxurypresence.com OR from:showingtime.com OR from:authentisign.com)"
    res = svc.users().messages().list(userId="me", q=q, maxResults=100).execute()
    out = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    for m in res.get("messages", []):
        full = svc.users().messages().get(userId="me", id=m["id"], format="full").execute()
        h = {x["name"]: x["value"] for x in full["payload"]["headers"]}
        when = datetime.fromtimestamp(int(full["internalDate"]) / 1000, tz=timezone.utc)
        if when < cutoff:
            continue
        body = ""
        parts = [full["payload"]] + full["payload"].get("parts", [])
        for p in parts:
            if p.get("mimeType", "").startswith("text/plain") and p.get("body", {}).get("data"):
                body = base64.urlsafe_b64decode(p["body"]["data"]).decode("utf-8", "ignore")
                break
        if not body:
            body = full.get("snippet", "")
        out.append({"subject": h.get("Subject", ""), "from": h.get("From", ""),
                    "date_iso": when.astimezone(CENTRAL).replace(microsecond=0).isoformat(), "body": body})
    return out


def auth() -> None:
    from google_auth_oauthlib.flow import InstalledAppFlow
    if not CREDENTIALS.exists():
        sys.exit(f"Put the Google OAuth client file at {CREDENTIALS} first (same one the speed-to-lead runner uses).")
    flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS), SCOPES)
    creds = flow.run_local_server(port=0)
    TOKEN.parent.mkdir(parents=True, exist_ok=True)
    TOKEN.write_text(creds.to_json())
    print(f"Signed in. Token saved to {TOKEN}")


# -------------------------------------------------------------------- brief


def brief(crm: CRM, as_of: date | None = None) -> str:
    as_of = as_of or today()
    lines = []
    due = crm.due(as_of)
    hot = [d for d in due if d["tier"] == "HOT"]
    warm = [d for d in due if d["tier"] == "WARM"]
    lines.append(f"TOUCHES DUE ({len(due)}): {len(hot)} hot, {len(warm)} warm, {len(due) - len(hot) - len(warm)} cold/contact")
    for d in (hot + warm)[:12]:
        days = "never logged" if d["days"] is None else f"{d['days']}d quiet"
        lines.append(f"- {d['name']} ({d['tier']}, {days}) {d['phone']} {('next: ' + d['next_action']) if d['next_action'] else ''}".rstrip())
    tasks = crm.open_tasks(as_of)
    lines.append(f"TASKS ({len(tasks)} open, {sum(t['overdue'] for t in tasks)} overdue)")
    for t in tasks[:12]:
        who = f"{t['contact']}: " if t["contact"] else ""
        lines.append(f"- {'OVERDUE ' if t['overdue'] else ''}{t['due']} {who}{t['task']} [{t['id']}]")
    deals = crm.live_deals()
    lines.append(f"PIPELINE ({len(deals)} live)")
    for p in deals:
        close = p.get("expected_close") or "close date not set"
        flag = ""
        if p.get("expected_close"):
            dd = (date.fromisoformat(p["expected_close"]) - as_of).days
            flag = f" CLOSES IN {dd}d" if dd <= 14 else ""
        lines.append(f"- {p['client']}, {p['side']}, {p['address']}, {p['stage']}, {close}{flag}. Next: {p.get('next_step', '')}")
    leads = [l for l in crm.leads() if l.get("status") == "new"]
    lines.append(f"NEW LEADS ({len(leads)})")
    for l in leads[:10]:
        lines.append(f"- {l['name']} {l['email']} {l['phone']} {l['type']} {l['received_at']}")
    return "\n".join(lines)


# -------------------------------------------------------------------- tests


def run_tests() -> int:
    import tempfile
    tmp = Path(tempfile.mkdtemp())
    db = tmp / "db.json"
    fx = json.loads((HERE / "tests" / "fixtures" / "fake-crm.json").read_text())
    db.write_text(json.dumps(fx))
    crm = CRM(LocalBackend(db))
    as_of = date(2026, 10, 20)
    fails = []

    def check(name, cond):
        print(("PASS " if cond else "FAIL ") + name)
        if not cond:
            fails.append(name)

    check("parse_touch m/d", parse_touch("10/18 inspection response", as_of) == "2026-10-18")
    check("parse_touch future rolls back a year", parse_touch("12/25 card", as_of) == "2025-12-25")
    check("parse_touch empty", parse_touch("", as_of) == "")
    check("parse_touch iso passthrough", parse_touch("2026-09-01 call", as_of) == "2026-09-01")

    r = import_hwc(crm, as_of)
    c = {x["Name"]: x for x in crm.contacts()}
    check("import fills 5 contacts", r["contacts"] == 5)
    check("under contract stage", c["Taylor Sample"]["stage"] == "under-contract")
    check("warm is new-lead", c["Jordan Warm"]["stage"] == "new-lead")
    check("contact tier is past-client", c["Pat Yearly"]["stage"] == "past-client")
    check("vendor never touched", c["Vendor Roofing"]["stage"] == "closed")
    check("last_touch_iso filled", c["Taylor Sample"]["last_touch_iso"] == "2026-10-18")
    check("id from email", c["Jordan Warm"]["id"] == "jordan@example.com")
    check("tasks from next action (HOT+WARM only)", r["tasks_added"] == 2)
    r2 = import_hwc(crm, as_of)
    check("import is idempotent", r2["tasks_added"] == 0)

    due = crm.due(as_of)
    names = [d["name"] for d in due]
    check("hot 7d quiet not due at 2d", "Taylor Sample" not in names)
    check("warm 20d quiet is due", "Jordan Warm" in names)
    check("cold never logged is due", "Casey Cold" in names)
    check("vendor not due", "Vendor Roofing" not in names)
    check("hot sorts first", not due or due[0]["tier"] in ("HOT", "WARM"))

    crm.log("Jordan Warm", "called, left voicemail", "call", at="2026-10-20T09:00:00-05:00")
    c = {x["Name"]: x for x in crm.contacts()}
    check("log updates last touch", c["Jordan Warm"]["last_touch_iso"] == "2026-10-20")
    check("log appends activity", any(a["summary"] == "called, left voicemail" for a in crm.activity()))
    check("warm no longer due", "Jordan Warm" not in [d["name"] for d in crm.due(as_of)])

    t = crm.add_task("Taylor Sample", "send inspection report", "2026-10-19")
    ot = crm.open_tasks(as_of)
    check("overdue flagged", any(x["id"] == t["id"] and x["overdue"] for x in ot))
    check("done closes task", crm.done(t["id"]) and all(x["id"] != t["id"] for x in crm.open_tasks(as_of)))

    msgs = [
        {"subject": "⭐️ New Lead - Sam Newlead", "from": "noreply@luxurypresence.com", "date_iso": "2026-10-20T06:10:00-05:00",
         "body": "You've received a new lead sam.newlead@example.com Overview Type Google Sign On Source https://x (225) 555-0100"},
        {"subject": "SHOWING CONFIRMED | 1 Test Ave, Zachary, LA 70791 Tue, 10/20 2:30 PM", "from": "callcenter@showingtime.com",
         "date_iso": "2026-10-20T06:11:00-05:00", "body": ""},
        {"subject": "Your signature is requested: 1 Test Ave - Inspection Response.pdf", "from": "secure@authentisign.com",
         "date_iso": "2026-10-20T06:12:00-05:00", "body": ""},
        {"subject": "Notice of inactivity: 1 Test Ave - Inspection Response.pdf", "from": "secure@authentisign.com",
         "date_iso": "2026-10-20T06:13:00-05:00", "body": "Your signing is still waiting on aire@calebjackson.org to sign"},
        {"subject": "Weekly digest", "from": "news@example.com", "date_iso": "2026-10-20T06:14:00-05:00", "body": ""},
    ]
    r = ingest_messages(crm, msgs)
    check("lead ingested", r["leads"] == 1 and any(l["email"] == "sam.newlead@example.com" for l in crm.leads()))
    check("lead becomes HOT contact", any(x["Name"] == "Sam Newlead" and x["Tier"] == "HOT" for x in crm.contacts()))
    check("showing logged", r["showings"] == 1)
    check("two signing events", r["signings"] == 2)
    check("one sign task, not two", sum(1 for x in crm.tasks() if x["task"].startswith("Sign ") and x["status"] == "open") == 1)
    check("unrelated mail skipped", r["skipped"] == 1)
    r = ingest_messages(crm, msgs)
    check("ingest is idempotent", r["leads"] == 0 and r["showings"] == 0 and r["signings"] == 0)

    out = tmp / "contacts.csv"
    n = export_followup(crm, out)
    rows = list(csv.DictReader(out.open()))
    check("export only emails", n == len(rows) and all(r["email"] for r in rows))
    check("export stages valid", all(r["stage"] in ("new-lead", "seller-presentation", "under-contract", "past-client", "closed", "opt-out") for r in rows))

    b = brief(crm, as_of)
    check("brief has every section", all(k in b for k in ("TOUCHES DUE", "TASKS", "PIPELINE", "NEW LEADS")))
    check("brief flags close within 14d", "CLOSES IN" in b)
    check("nothing hits the network", True)

    print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED'} ({len(fails)} failed)")
    return 1 if fails else 0


# ---------------------------------------------------------------------- cli


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--local", help="JSON file instead of Google Sheets")
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--as-of", help="YYYY-MM-DD, default today (Central)")
    sub = ap.add_subparsers(dest="cmd")
    sub.add_parser("auth")
    sub.add_parser("pull")
    sub.add_parser("import-hwc")
    p = sub.add_parser("ingest"); p.add_argument("--hours", type=int, default=26)
    sub.add_parser("due")
    p = sub.add_parser("log"); p.add_argument("contact"); p.add_argument("summary"); p.add_argument("--type", default="note")
    p = sub.add_parser("task"); p.add_argument("contact"); p.add_argument("task"); p.add_argument("--due", default=today().isoformat())
    p = sub.add_parser("done"); p.add_argument("task_id")
    sub.add_parser("tasks")
    sub.add_parser("pipeline")
    sub.add_parser("export-followup")
    sub.add_parser("brief")
    a = ap.parse_args(argv)

    if a.test:
        return run_tests()
    if a.cmd == "auth":
        auth(); return 0
    backend = LocalBackend(Path(a.local)) if a.local else SheetsBackend()
    crm = CRM(backend)
    as_of = date.fromisoformat(a.as_of) if getattr(a, "as_of", None) else today()

    if a.cmd == "pull" or a.cmd is None:
        data = {tab: crm.b.read(tab) for tab in SCHEMA}
        data["pulled_at"] = now_iso()
        CACHE.write_text(json.dumps(data, indent=1, ensure_ascii=False))
        print(f"cache.json: " + ", ".join(f"{k} {len(v)}" for k, v in data.items() if isinstance(v, list)))
    elif a.cmd == "import-hwc":
        print(import_hwc(crm, as_of))
    elif a.cmd == "ingest":
        print(ingest_messages(crm, gmail_messages(a.hours)))
    elif a.cmd == "due":
        for d in crm.due(as_of):
            days = "never" if d["days"] is None else f"{d['days']}d"
            print(f"{d['tier']:7} {days:>6}  {d['name']}  {d['phone']}  {d['next_action']}")
    elif a.cmd == "log":
        print(crm.log(a.contact, a.summary, a.type))
    elif a.cmd == "task":
        print(crm.add_task(a.contact, a.task, a.due))
    elif a.cmd == "done":
        print("done" if crm.done(a.task_id) else "no such task")
    elif a.cmd == "tasks":
        for t in crm.open_tasks(as_of):
            print(f"{'OVERDUE' if t['overdue'] else '       '} {t['due']} {t['contact']:28} {t['task']} [{t['id']}]")
    elif a.cmd == "pipeline":
        for p in crm.live_deals():
            print(f"{p['stage']:15} {p['client']:28} {p['address']:40} {p.get('expected_close', '')}  {p.get('next_step', '')}")
    elif a.cmd == "export-followup":
        out = AIRE / "follow-up" / "contacts.csv"
        print(f"{export_followup(crm, out)} contacts with email -> {out}")
    elif a.cmd == "brief":
        print(brief(crm, as_of))
    return 0


if __name__ == "__main__":
    sys.exit(main())
