#!/usr/bin/env python3
"""
AIRE CRM engine. The one CRM is the Google Sheet "AIRE CRM"
(1w9izcliqmXlFR3_O3dnP2G5SGfCrua7mrCLCE7cdoDc). This file never keeps its own copy of a
contact and never shows anything on a screen: it reads the sheet, applies the same write
gates the Mac's crm_client uses, and writes feed.json for the native Pipeline app.

Tabs it reads: Contacts, Notes, Connector Log (all existed on 2026-10-16).
Tabs it adds if missing: Tasks, Deals. No column is ever added to Contacts.

  python3 crm.py auth                      # one-time Google sign-in on the Mac (Sheets + Gmail read only)
  python3 crm.py check                     # live header matches what this file expects; nothing written
  python3 crm.py feed [--out feed.json]    # touches due, tasks, deals, new leads for the Pipeline app
  python3 crm.py due                       # who is past their band's cadence
  python3 crm.py tasks                     # open tasks, overdue first
  python3 crm.py deals                     # live deals
  python3 crm.py ingest [--hours 26]       # Gmail -> leads, showings, signatures (Gmail stays read only)
  python3 crm.py sync-tasks                # one Tasks row per hot/warm Next_Action (idempotent)
  python3 crm.py rescale-band [--dry-run]  # HOT/WARM/NURTURE/DORMANT -> hot/warm/cold/ice-cold on every row (audited)
  python3 crm.py touch PERSON_ID "what happened"
  python3 crm.py task PERSON_ID "what to do" --due DATE
  python3 crm.py done TASK_ID
  python3 crm.py merge-hwc --hwc FILE.json --report FILE.md   # dry run only, see README
  python3 crm.py --test                    # offline checks on fixtures

  --dry-run on any command: every write is listed and none is performed.
  --local FILE: a JSON snapshot instead of Google (tests, offline, cloud dry runs).

Write gates (same rules as ~/aire/crm/execution on the Mac, reused, never loosened):
  * every contact write is by person_id, and the person_id must already exist (or be minted here)
  * Do_Not_Contact can be set to YES, never back to NO
  * Command_ID is never written (KW Command is read only, through the Mac companion)
  * every write lands in audit.jsonl and in the Connector Log tab
"""

from __future__ import annotations

import argparse
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
SHEET_ID = os.getenv("AIRE_CRM_SHEET", "1w9izcliqmXlFR3_O3dnP2G5SGfCrua7mrCLCE7cdoDc")
FEED = HERE / "feed.json"
AUDIT = Path(os.getenv("AIRE_CRM_AUDIT", str(Path.home() / "aire" / "crm" / "audit.jsonl")))
TOKEN = Path(os.getenv("AIRE_GOOGLE_TOKEN", str(Path.home() / ".aire" / "google-token.json")))
# In the cloud the token file does not exist; the environment secret AIRE_GOOGLE_TOKEN_JSON holds
# the same JSON and is written to TOKEN on first use. Never paste a token into a chat.
if os.getenv("AIRE_GOOGLE_TOKEN_JSON") and not TOKEN.exists():
    TOKEN.parent.mkdir(parents=True, exist_ok=True)
    TOKEN.write_text(os.environ["AIRE_GOOGLE_TOKEN_JSON"])
CREDENTIALS = Path(os.getenv("AIRE_GOOGLE_CREDENTIALS", str(Path.home() / ".aire" / "credentials.json")))
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.readonly",
]
CENTRAL = ZoneInfo("America/Chicago")
CLIENT = "crm.py"

# The live Contacts header on 2026-10-19 (read from the sheet, not assumed). `check` fails
# loudly if any of these is missing, and nothing else runs.
CONTACT_COLUMNS = [
    "person_id", "display", "first", "last", "name_tier", "primary_phone", "email", "email_tier",
    "street", "city", "state", "zip", "addr_tier", "homestead", "fair_market_value", "band",
    "opportunity_types", "provenance", "Stage", "Do_Not_Contact", "Source", "Last_Touch",
    "Next_Action", "Command_ID", "Type",
]
# The only Contacts columns this tool may write. Everything else is Caleb's or the Mac's.
WRITABLE = {"Stage", "Last_Touch", "Next_Action", "band"}
NEVER_WRITE = {"Command_ID"}
# Columns a brand-new contact row gets. Nothing in the enrichment block (name_tier .. provenance).
CREATE_COLUMNS = {"person_id", "display", "first", "last", "primary_phone", "email", "band",
                  "Stage", "Do_Not_Contact", "Source", "Next_Action", "Type"}

SCHEMA = {
    "Contacts": CONTACT_COLUMNS,
    "Notes": ["At", "person_id", "display", "Note", "By"],
    "Connector Log": ["At (CT)", "Tool", "Client", "person_id", "Detail"],
    # Added by this tool when missing:
    "Tasks": ["task_id", "person_id", "display", "task", "due", "status", "source", "created_at", "done_at"],
    "Deals": ["deal_id", "person_id", "display", "address", "side", "stage", "price", "expected_close",
              "next_step", "last_event", "last_event_at", "source", "updated_at"],
}
ADDED_TABS = ["Tasks", "Deals"]

# Caleb's five-step scale (2026-10-20): the only band values. Days between touches by band.
# Blank band is not on the touch list. Legacy values still read correctly through norm_band().
CADENCE_DAYS = {"hot": 7, "warm": 14, "lukewarm": 30, "cold": 90, "ice-cold": 365}
BAND_ORDER = {"hot": 0, "warm": 1, "lukewarm": 2, "cold": 3, "ice-cold": 4}
LEGACY_BAND = {"HOT": "hot", "WARM": "warm", "NURTURE": "cold", "DORMANT": "ice-cold",
               "LUKEWARM": "lukewarm", "COLD": "cold", "ICE-COLD": "ice-cold", "ICE COLD": "ice-cold", "ICECOLD": "ice-cold"}


def norm_band(v: str | None) -> str:
    """'HOT' -> 'hot', 'NURTURE' -> 'cold', 'DORMANT' -> 'ice-cold', 'lukewarm' -> 'lukewarm'. Unknown -> ''."""
    v = (v or "").strip()
    if v in CADENCE_DAYS:
        return v
    return LEGACY_BAND.get(v.upper(), "")
NEVER_TOUCH_TYPES = {"vendor", "agent", "lender"}
LIVE_DEAL_STAGES = {"lead", "consult", "active", "showing", "under_contract", "unknown"}


# ------------------------------------------------------------------ helpers


def now_iso() -> str:
    return datetime.now(CENTRAL).replace(microsecond=0).isoformat()


def now_sheet() -> str:
    """The timestamp format the Notes and Connector Log tabs already use."""
    return datetime.now(CENTRAL).strftime("%Y-%m-%d %H:%M")


def today() -> date:
    return datetime.now(CENTRAL).date()


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")[:48]


def phone_key(phone: str) -> str:
    d = re.sub(r"\D", "", phone or "")
    if len(d) == 11 and d.startswith("1"):
        d = d[1:]
    return d if len(d) == 10 else ""


def email_key(email: str) -> str:
    return (email or "").strip().lower()


def name_key(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().lower().lstrip("?"))


def parse_touch(text: str, as_of: date | None = None) -> str:
    """'2026-09-16 (closing)' -> '2026-09-16'; '10/18 inspection response' -> '2026-10-18'.
    A month/day after as_of means last year. Empty when no date is in the text."""
    as_of = as_of or today()
    if not text:
        return ""
    m = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", text)
    if m:
        try:
            return date.fromisoformat(m.group(0)).isoformat()
        except ValueError:
            return ""
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


def pad(values: list[list], header: list[str]) -> list[dict]:
    out = []
    for r in values:
        r = list(r) + [""] * (len(header) - len(r))
        out.append({h: r[i] for i, h in enumerate(header)})
    return out


def to_rows(items: list[dict], header: list[str]) -> list[list]:
    return [[str(it.get(h, "") if it.get(h) is not None else "") for h in header] for it in items]


class GateError(Exception):
    """A write that the rules forbid. Nothing was written."""


# ----------------------------------------------------------------- backends


class LocalBackend:
    """A JSON file shaped like the sheet: {"header": [...], "Contacts": [...], "Notes": [...], ...}.
    Used by --test, --local and the cloud dry runs."""

    def __init__(self, path: Path, dry_run: bool = False):
        self.path = path
        self.dry_run = dry_run
        self.writes: list[dict] = []
        self.data = json.loads(path.read_text()) if path.exists() else {}
        for tab in ("Contacts", "Notes", "Connector Log"):
            self.data.setdefault(tab, [])
        self.data.setdefault("header", list(CONTACT_COLUMNS))

    def tabs(self) -> list[str]:
        return [t for t in SCHEMA if t in self.data]

    def live_header(self, tab: str) -> list[str]:
        return list(self.data["header"]) if tab == "Contacts" else list(SCHEMA[tab])

    def ensure_tab(self, tab: str) -> bool:
        if tab in self.data:
            return False
        self._record("create_tab", tab, {})
        if not self.dry_run:
            self.data[tab] = []
            self._save()
        return True

    def read(self, tab: str) -> list[dict]:
        header = self.live_header(tab)
        return [{h: str(r.get(h, "")) for h in header} for r in self.data.get(tab, [])]

    def append(self, tab: str, items: list[dict]) -> None:
        if not items:
            return
        self._record("append", tab, {"rows": items})
        if self.dry_run:
            return
        self.data.setdefault(tab, []).extend(items)
        self._save()

    def update_row(self, tab: str, key_col: str, key: str, fields: dict) -> None:
        self._record("update", tab, {key_col: key, "fields": fields})
        if self.dry_run:
            return
        for r in self.data.get(tab, []):
            if str(r.get(key_col, "")) == str(key):
                r.update(fields)
        self._save()

    def _record(self, op: str, tab: str, detail: dict) -> None:
        self.writes.append({"op": op, "tab": tab, **detail})

    def _save(self):
        self.path.write_text(json.dumps(self.data, indent=1, ensure_ascii=False))


class SheetsBackend:
    """Google Sheets through Caleb's own OAuth token on the Mac. Reads whole tabs, writes rows
    by key column, never rewrites a tab wholesale."""

    def __init__(self, sheet_id: str = SHEET_ID, dry_run: bool = False):
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        if not TOKEN.exists():
            sys.exit(f"No Google token at {TOKEN}. Run: python3 crm.py auth")
        self.creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
        self.svc = build("sheets", "v4", credentials=self.creds, cache_discovery=False)
        self.sheet_id = sheet_id
        self.dry_run = dry_run
        self.writes: list[dict] = []
        self._headers: dict[str, list[str]] = {}

    def tabs(self) -> list[str]:
        meta = self.svc.spreadsheets().get(spreadsheetId=self.sheet_id, fields="sheets.properties.title").execute()
        return [s["properties"]["title"] for s in meta.get("sheets", [])]

    def live_header(self, tab: str) -> list[str]:
        if tab not in self._headers:
            res = self.svc.spreadsheets().values().get(spreadsheetId=self.sheet_id, range=f"'{tab}'!1:1").execute()
            self._headers[tab] = (res.get("values") or [[]])[0]
        return list(self._headers[tab])

    def ensure_tab(self, tab: str) -> bool:
        if tab in self.tabs():
            return False
        self.writes.append({"op": "create_tab", "tab": tab})
        if self.dry_run:
            return True
        self.svc.spreadsheets().batchUpdate(spreadsheetId=self.sheet_id, body={
            "requests": [{"addSheet": {"properties": {"title": tab, "gridProperties": {"frozenRowCount": 1}}}}]}).execute()
        self.svc.spreadsheets().values().update(
            spreadsheetId=self.sheet_id, range=f"'{tab}'!A1", valueInputOption="RAW",
            body={"values": [SCHEMA[tab]]}).execute()
        self._headers[tab] = list(SCHEMA[tab])
        return True

    def read(self, tab: str) -> list[dict]:
        res = self.svc.spreadsheets().values().get(spreadsheetId=self.sheet_id, range=f"'{tab}'!A1:Z").execute()
        values = res.get("values", [])
        if not values:
            return []
        self._headers[tab] = values[0]
        return pad(values[1:], values[0])

    def append(self, tab: str, items: list[dict]) -> None:
        if not items:
            return
        self.writes.append({"op": "append", "tab": tab, "rows": items})
        if self.dry_run:
            return
        self.svc.spreadsheets().values().append(
            spreadsheetId=self.sheet_id, range=f"'{tab}'!A1", valueInputOption="RAW",
            insertDataOption="INSERT_ROWS", body={"values": to_rows(items, self.live_header(tab))}).execute()

    def update_row(self, tab: str, key_col: str, key: str, fields: dict) -> None:
        self.writes.append({"op": "update", "tab": tab, key_col: key, "fields": fields})
        if self.dry_run:
            return
        res = self.svc.spreadsheets().values().get(spreadsheetId=self.sheet_id, range=f"'{tab}'!A1:Z").execute()
        values = res.get("values", [])
        header = values[0]
        ki = header.index(key_col)
        data = []
        for i, r in enumerate(values[1:], start=2):
            if ki < len(r) and str(r[ki]) == str(key):
                for col, val in fields.items():
                    ci = header.index(col)
                    data.append({"range": f"'{tab}'!{col_letter(ci)}{i}", "values": [[str(val)]]})
        if data:
            self.svc.spreadsheets().values().batchUpdate(
                spreadsheetId=self.sheet_id, body={"valueInputOption": "RAW", "data": data}).execute()


def col_letter(i: int) -> str:
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


# ---------------------------------------------------------------------- CRM


class CRM:
    def __init__(self, backend, audit_path: Path = AUDIT):
        self.b = backend
        self.audit_path = audit_path
        self._contacts: list[dict] | None = None
        # In a dry run the backend performs nothing, so rows minted during the run live here
        # and the derived views still see them. Empty in a real run.
        self._overlay: dict[str, list[dict]] = {"Tasks": [], "Deals": [], "Notes": []}

    def _dry(self) -> bool:
        return bool(getattr(self.b, "dry_run", False))

    def _rows(self, tab: str) -> list[dict]:
        rows = self.b.read(tab) if tab in self.b.tabs() else []
        return rows + self._overlay.get(tab, [])

    # ---- schema

    def check(self) -> dict:
        """Live header vs what this file expects. Read only."""
        header = self.b.live_header("Contacts")
        missing = [c for c in CONTACT_COLUMNS if c not in header]
        extra = [c for c in header if c not in CONTACT_COLUMNS]
        tabs = self.b.tabs()
        return {"contacts_header_ok": not missing, "missing_columns": missing, "extra_columns": extra,
                "tabs_present": tabs, "tabs_to_add": [t for t in ADDED_TABS if t not in tabs]}

    def ensure_tabs(self) -> list[str]:
        added = [t for t in ADDED_TABS if self.b.ensure_tab(t)]
        for t in added:
            self._audit("create_tab", "", f"tab {t} added with header {SCHEMA[t]}")
        return added

    # ---- reads

    def contacts(self, refresh: bool = False) -> list[dict]:
        if self._contacts is None or refresh:
            self._contacts = self.b.read("Contacts")
        return self._contacts

    def notes(self) -> list[dict]:
        return self._rows("Notes")

    def tasks(self) -> list[dict]:
        return self._rows("Tasks")

    def deals(self) -> list[dict]:
        return self._rows("Deals")

    def by_id(self, person_id: str) -> dict | None:
        for c in self.contacts():
            if c.get("person_id") == str(person_id):
                return c
        return None

    def find(self, name: str = "", email: str = "", phone: str = "") -> list[dict]:
        """Candidates in match order: email, phone, exact display name. Never a substring guess."""
        ek, pk, nk = email_key(email), phone_key(phone), name_key(name)
        hits, seen = [], set()
        for c in self.contacts():
            why = None
            if ek and email_key(c.get("email")) == ek:
                why = "email"
            elif pk and phone_key(c.get("primary_phone")) == pk:
                why = "phone"
            elif nk and name_key(c.get("display")) == nk:
                why = "name"
            if why and c["person_id"] not in seen:
                seen.add(c["person_id"])
                hits.append({**c, "_match": why})
        return hits

    def next_person_id(self) -> str:
        """One past the highest person_id ever seen, including ids that only survive in Notes or the
        Connector Log (a deleted row's id is never handed to someone else)."""
        seen = [c.get("person_id", "") for c in self.contacts()]
        seen += [n.get("person_id", "") for n in self.notes()]
        seen += [r.get("person_id", "") for r in self.b.read("Connector Log")]
        ids = [int(x) for x in seen if (x or "").isdigit()]
        return str((max(ids) if ids else 0) + 1)

    # ---- gates and audit

    def _audit(self, tool: str, person_id: str, detail: str) -> None:
        line = {"at": now_iso(), "tool": tool, "client": CLIENT, "person_id": str(person_id), "detail": detail,
                "dry_run": bool(getattr(self.b, "dry_run", False))}
        if not getattr(self.b, "dry_run", False):
            self.audit_path.parent.mkdir(parents=True, exist_ok=True)
            with self.audit_path.open("a") as f:
                f.write(json.dumps(line, ensure_ascii=False) + "\n")
        self.b.append("Connector Log", [{"At (CT)": now_sheet(), "Tool": tool, "Client": CLIENT,
                                         "person_id": str(person_id), "Detail": detail}])

    def update_contact(self, person_id: str, fields: dict, reason: str) -> dict:
        c = self.by_id(person_id)
        if not c:
            raise GateError(f"no contact with person_id {person_id}; writes are by person_id only")
        bad = set(fields) & NEVER_WRITE
        if bad:
            raise GateError(f"{sorted(bad)} is never written by this tool")
        if "Do_Not_Contact" in fields:
            raise GateError("Do_Not_Contact changes go through set_do_not_contact")
        unknown = set(fields) - WRITABLE
        if unknown:
            raise GateError(f"not a column this tool may write: {sorted(unknown)}")
        changes = {k: v for k, v in fields.items() if str(c.get(k, "")) != str(v)}
        if not changes:
            return {}
        self.b.update_row("Contacts", "person_id", person_id, changes)
        c.update(changes)
        self._audit("update_contact", person_id, f"{reason}: " + ", ".join(f"{k}={v!r}" for k, v in changes.items()))
        return changes

    def set_do_not_contact(self, person_id: str, reason: str) -> bool:
        c = self.by_id(person_id)
        if not c:
            raise GateError(f"no contact with person_id {person_id}")
        if (c.get("Do_Not_Contact") or "").upper() == "YES":
            return False
        self.b.update_row("Contacts", "person_id", person_id, {"Do_Not_Contact": "YES"})
        c["Do_Not_Contact"] = "YES"
        self._audit("set_do_not_contact", person_id, f"NO -> YES: {reason}")
        self.add_note(person_id, f"Do_Not_Contact set to YES: {reason}")
        return True

    def create_contact(self, display: str, phone: str = "", email: str = "", band: str = "", stage: str = "",
                       source: str = "", next_action: str = "", type_: str = "client") -> dict:
        """A new row with a minted person_id. Refuses when an email, phone or exact name already exists."""
        hits = self.find(display, email, phone)
        if hits:
            raise GateError(f"{display!r} matches person_id {hits[0]['person_id']} by {hits[0]['_match']}; update, don't create")
        band = norm_band(band) if band else ""
        if band and band not in CADENCE_DAYS:
            raise GateError(f"band must be one of {sorted(CADENCE_DAYS)}")
        pid = self.next_person_id()
        parts = (display or "").split()
        row = {h: "" for h in self.b.live_header("Contacts")}
        row.update({"person_id": pid, "display": display, "first": parts[0] if parts else "",
                    "last": " ".join(parts[1:]) if len(parts) > 1 else "", "primary_phone": phone, "email": email,
                    "band": band, "Stage": stage, "Do_Not_Contact": "NO", "Source": source,
                    "Next_Action": next_action, "Type": type_})
        self.b.append("Contacts", [row])
        self.contacts().append(row)
        self._audit("create_contact", pid, f"{display} ({type_}) from {source}")
        return row

    def add_note(self, person_id: str, note: str, by: str = "AIRE") -> dict:
        c = self.by_id(person_id) if person_id else None
        if person_id and not c:
            raise GateError(f"no contact with person_id {person_id}")
        row = {"At": now_sheet(), "person_id": str(person_id), "display": c["display"] if c else "", "Note": note, "By": by}
        self.b.append("Notes", [row])
        if self._dry():
            self._overlay["Notes"].append(row)
        self._audit("add_note", person_id, note[:120])
        return row

    # ---- the things Caleb does

    def touch(self, person_id: str, what: str, day: str | None = None) -> dict:
        """A call, text, visit or note happened. Last_Touch moves forward, the note is kept."""
        day = day or today().isoformat()
        c = self.by_id(person_id)
        if not c:
            raise GateError(f"no contact with person_id {person_id}")
        if (c.get("Do_Not_Contact") or "").upper() == "YES":
            raise GateError(f"person_id {person_id} is Do_Not_Contact; a touch is not logged")
        current = parse_touch(c.get("Last_Touch", ""))
        if not current or current < day:
            self.update_contact(person_id, {"Last_Touch": day}, "touch")
        return self.add_note(person_id, what)

    def add_task(self, person_id: str, task: str, due: str, source: str = "caleb") -> dict:
        c = self.by_id(person_id) if person_id else None
        if person_id and not c:
            raise GateError(f"no contact with person_id {person_id}")
        row = {"task_id": uuid.uuid4().hex[:8], "person_id": str(person_id), "display": c["display"] if c else "",
               "task": task, "due": due, "status": "open", "source": source, "created_at": now_iso(), "done_at": ""}
        self.b.append("Tasks", [row])
        if self._dry():
            self._overlay["Tasks"].append(row)
        self._audit("add_task", person_id, f"{task} due {due} [{row['task_id']}]")
        return row

    def done(self, task_id: str) -> bool:
        for t in self.tasks():
            if t["task_id"] == task_id and t["status"] != "done":
                self.b.update_row("Tasks", "task_id", task_id, {"status": "done", "done_at": now_iso()})
                if self._dry():
                    t["status"], t["done_at"] = "done", now_iso()
                self._audit("task_done", t.get("person_id", ""), f"{t['task']} [{task_id}]")
                return True
        return False

    def upsert_deal(self, address: str, event: str, at: str, person_id: str = "", stage: str = "",
                    side: str = "", source: str = "") -> dict:
        key = slug(address)
        for d in self.deals():
            if d["deal_id"] == key:
                fields = {"last_event": event, "last_event_at": at, "updated_at": now_iso()}
                if stage:
                    fields["stage"] = stage
                if person_id and not d.get("person_id"):
                    fields["person_id"] = person_id
                self.b.update_row("Deals", "deal_id", key, fields)
                if self._dry():
                    d.update(fields)
                self._audit("update_deal", d.get("person_id") or person_id, f"{address}: {event}")
                return {**d, **fields}
        c = self.by_id(person_id) if person_id else None
        row = {"deal_id": key, "person_id": person_id, "display": c["display"] if c else "", "address": address,
               "side": side, "stage": stage or "unknown", "price": "", "expected_close": "", "next_step": "",
               "last_event": event, "last_event_at": at, "source": source, "updated_at": now_iso()}
        self.b.append("Deals", [row])
        if self._dry():
            self._overlay["Deals"].append(row)
        self._audit("create_deal", person_id, f"{address}: {event}")
        return row

    def rescale_band(self) -> dict:
        """Rewrite every legacy band value to the five-step scale. Only cells whose value changes are written,
        each through update_row so it lands in the audit file and the Connector Log."""
        counts: dict[str, int] = {}
        for c in self.contacts():
            old = (c.get("band") or "").strip()
            new = norm_band(old)
            if not old or new == old:
                continue
            if not new:
                counts[f"unmapped:{old}"] = counts.get(f"unmapped:{old}", 0) + 1
                continue
            self.b.update_row("Contacts", "person_id", c["person_id"], {"band": new})
            c["band"] = new
            self._audit("rescale_band", c["person_id"], f"{old} -> {new}")
            counts[f"{old}->{new}"] = counts.get(f"{old}->{new}", 0) + 1
        return counts

    # ---- derived, read only

    def touchable(self, c: dict) -> bool:
        return ((c.get("Do_Not_Contact") or "").upper() != "YES"
                and (c.get("Type") or "").lower() not in NEVER_TOUCH_TYPES
                and norm_band(c.get("band")) in CADENCE_DAYS)

    def due(self, as_of: date | None = None, signals: dict | None = None) -> list[dict]:
        """Who is owed a touch. With `signals` (see load_signals) the iMessage record comes first: the last real
        text in or out counts as the last touch, the enrichment label sets the cadence, and someone who texted
        last and is still waiting on Caleb (owes_reply) is due today and sorts to the top."""
        as_of = as_of or today()
        signals = signals or {}
        out = []
        for c in self.contacts():
            sig = signals.get(c["person_id"], {})
            band = norm_band(sig.get("label")) or norm_band(c.get("band"))
            if not self.touchable({**c, "band": band}):
                continue
            last = parse_touch(c.get("Last_Touch", ""), as_of)
            last_msg = max(sig.get("last_inbound", ""), sig.get("last_outbound", ""))[:10]
            if last_msg and last_msg <= as_of.isoformat() and (not last or last_msg > last):
                last = last_msg
            days = (as_of - date.fromisoformat(last)).days if last else None
            owes = bool(sig.get("owes_reply"))
            if owes or days is None or days >= CADENCE_DAYS[band]:
                out.append({"person_id": c["person_id"], "display": c.get("display", ""), "band": band,
                            "phone": c.get("primary_phone", ""), "email": c.get("email", ""),
                            "days_quiet": days, "last_touch": c.get("Last_Touch", ""),
                            "last_inbound": sig.get("last_inbound", ""), "last_outbound": sig.get("last_outbound", ""),
                            "owes_reply": owes, "signal_score": sig.get("signal_score", 0),
                            "next_action": c.get("Next_Action", ""), "stage": c.get("Stage", ""),
                            "opportunity_types": c.get("opportunity_types", "")})
        return sorted(out, key=lambda x: (not x["owes_reply"], BAND_ORDER[x["band"]], -x["signal_score"],
                                          -(x["days_quiet"] if x["days_quiet"] is not None else 99999)))

    def open_tasks(self, as_of: date | None = None) -> list[dict]:
        as_of = as_of or today()
        rows = [dict(t) for t in self.tasks() if t.get("status") == "open"]
        for t in rows:
            t["overdue"] = bool(t.get("due")) and t["due"] < as_of.isoformat()
        return sorted(rows, key=lambda t: (t.get("due") or "9999"))

    def next_action_tasks(self, as_of: date | None = None) -> list[dict]:
        """What the Tasks tab would get from hot/warm Next_Action. Derived, nothing written."""
        as_of = as_of or today()
        existing = {(t["person_id"], t["task"]) for t in self.tasks() if t.get("status") == "open"}
        out = []
        for c in self.contacts():
            nxt = (c.get("Next_Action") or "").strip()
            band = norm_band(c.get("band"))
            if not nxt or band not in ("hot", "warm") or not self.touchable(c):
                continue
            if (c["person_id"], nxt) in existing:
                continue
            due = as_of if band == "hot" else as_of + timedelta(days=3)
            out.append({"person_id": c["person_id"], "display": c.get("display", ""), "task": nxt,
                        "due": due.isoformat(), "source": "Next_Action", "band": band})
        return out

    def sync_tasks(self, as_of: date | None = None) -> int:
        n = 0
        for t in self.next_action_tasks(as_of):
            self.add_task(t["person_id"], t["task"], t["due"], source="Next_Action")
            n += 1
        return n

    def live_deals(self) -> list[dict]:
        return [d for d in self.deals() if (d.get("stage") or "unknown") in LIVE_DEAL_STAGES]

    def new_leads(self, days: int = 14, as_of: date | None = None) -> list[dict]:
        as_of = as_of or today()
        cutoff = (as_of - timedelta(days=days)).isoformat()
        out = []
        for c in self.contacts():
            m = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", c.get("Source", ""))
            if (c.get("Stage") or "") == "new lead" and m and m.group(1) >= cutoff:
                out.append({"person_id": c["person_id"], "display": c.get("display", ""), "phone": c.get("primary_phone", ""),
                            "email": c.get("email", ""), "source": c.get("Source", ""), "received": m.group(1),
                            "next_action": c.get("Next_Action", "")})
        return sorted(out, key=lambda x: x["received"], reverse=True)

    def feed(self, as_of: date | None = None, signals: dict | None = None, signals_file: str = "") -> dict:
        """Everything the Pipeline app shows. See FEED.md. Read only."""
        as_of = as_of or today()
        due = self.due(as_of, signals)
        tasks = self.open_tasks(as_of) + [{**t, "task_id": "", "status": "open", "overdue": t["due"] < as_of.isoformat()}
                                          for t in self.next_action_tasks(as_of)]
        deals = self.live_deals()
        chk = self.check()
        return {
            "generated_at": now_iso(), "as_of": as_of.isoformat(), "sheet_id": getattr(self.b, "sheet_id", "local"),
            "header_ok": chk["contacts_header_ok"], "missing_columns": chk["missing_columns"],
            "signals": {"file": signals_file, "people": len(signals or {}),
                        "owes_reply": sum(1 for d in due if d["owes_reply"])},
            "counts": {"contacts": len(self.contacts()), "touches_due": len(due),
                       "by_band": {b: sum(1 for d in due if d["band"] == b) for b in BAND_ORDER},
                       "tasks_open": len(tasks), "tasks_overdue": sum(1 for t in tasks if t["overdue"]),
                       "deals_live": len(deals)},
            "touches_due": due, "tasks": sorted(tasks, key=lambda t: t["due"] or "9999"), "deals": deals,
            "new_leads": self.new_leads(as_of=as_of),
            "cadence_days": CADENCE_DAYS,
        }


def load_signals(path: Path, contacts: list[dict]) -> dict:
    """Message signals keyed by person_id, from either output of aire/enrichment:
    - enriched.csv (one row per person: aire_label, last_inbound, last_outbound, owes_reply, signal_score, status)
    - imessage-signals.json (one entry per phone or email handle: last_inbound, last_outbound, in_90 ...)
    Read only. Nothing here is ever written to the sheet."""
    import csv
    out: dict[str, dict] = {}
    if path.suffix.lower() == ".csv":
        with path.open(newline="") as f:
            for r in csv.DictReader(f):
                if r.get("status", "ok") not in ("", "ok"):
                    continue
                out[r["person_id"]] = {"label": r.get("aire_label", ""), "last_inbound": r.get("last_inbound", "")[:10],
                                       "last_outbound": r.get("last_outbound", "")[:10],
                                       "owes_reply": (r.get("owes_reply") or "").upper() == "YES",
                                       "signal_score": int(r.get("signal_score") or 0)}
        return out
    raw = json.loads(path.read_text())
    for c in contacts:
        sig = raw.get(phone_key(c.get("primary_phone"))) or raw.get(email_key(c.get("email")))
        if not sig:
            continue
        li, lo = sig.get("last_inbound", "")[:10], sig.get("last_outbound", "")[:10]
        age = (today() - date.fromisoformat(li)).days if li else None
        out[c["person_id"]] = {"label": "", "last_inbound": li, "last_outbound": lo,
                               "owes_reply": bool(li) and li > lo and age is not None and 2 <= age <= 60,
                               "signal_score": int(sig.get("in_90", 0))}
    return out


# -------------------------------------------------------------------- gmail


LP_LEAD = re.compile(r"New Lead - (.+)$")
ST_SUBJECT = re.compile(r"SHOWING (\w+) \| (.+?) (\w{3}, \d+/\d+ .+)$")
AS_COMPLETE = re.compile(r"Signing complete: (.+)$")
AS_REQUEST = re.compile(r"Your signature is requested: (.+)$")
AS_INACTIVE = re.compile(r"Notice of inactivity: (.+)$")
ADDRESS_IN_DOC = re.compile(r"^(\d{1,6} [A-Za-z0-9 .']+?(?: (?:Dr|Drive|Ave|Avenue|St|Street|Rd|Road|Ln|Lane|Ct|Court|Blvd|Hwy|Way|Pl|Cir|Trl|Pkwy)\.?))\b")


AS_UPDATED = re.compile(r"Signing updated: (.+)$")
AS_PERSON = re.compile(r"(?:Participant|Signer|Signed by|Completed by)\s*[:*]*\s*([A-Z][\w'.-]+(?: [A-Z][\w'.-]+){1,3})")


def deal_address(doc: str) -> str:
    """'9241 Pecan Tree Drive - Inspection Response.pdf' -> '9241 Pecan Tree Drive'. A document with no street
    address ('GBRAR Counteroffer Addendum') gives '' and never becomes a Deals row of its own."""
    m = ADDRESS_IN_DOC.match(doc.strip())
    return m.group(1) if m else ""


def parse_message(m: dict) -> dict | None:
    """One Gmail message -> one event dict, or None when it is not ours. Pure."""
    subj, frm, when, body = m["subject"].strip(), m["from"].lower(), m["date_iso"], m.get("body", "")
    if "luxurypresence" in frm and (x := LP_LEAD.search(subj)):
        emails = [e for e in re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", body) if "luxurypresence" not in e.lower()]
        email = emails[0] if emails else ""
        seg = body.split("Phone number", 1)[1][:80] if "Phone number" in body else ""
        phone = re.search(r"\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}", seg)
        typ = re.search(r"Type\s*\n?\s*([A-Za-z ]+?)\s*\n?\s*Source", body)
        return {"kind": "lead", "name": x.group(1).strip(), "email": email,
                "phone": phone.group(0) if phone else "", "type": typ.group(1).strip() if typ else "", "at": when}
    if "showingtime" in frm and (x := ST_SUBJECT.match(subj)):
        status, prop, t = x.groups()
        agent = re.search(r"Buyer's Agent Details.*?\|\s*([A-Z][\w' ]+?) [A-Z][\w &']+? \(\d{3}\)", body, re.S)
        return {"kind": "showing", "status": status.lower(), "address": prop.split(",")[0].strip(), "property": prop,
                "when": t, "agent": agent.group(1).strip() if agent else "", "at": when}
    if "authentisign" in frm:
        for kind, rx in (("complete", AS_COMPLETE), ("requested", AS_REQUEST), ("inactive", AS_INACTIVE), ("updated", AS_UPDATED)):
            if (x := rx.match(subj)):
                doc = x.group(1).strip()
                waiting = re.search(r"waiting on ([\w.+-]+@[\w-]+\.[\w.]+)", body)
                person = AS_PERSON.search(body)
                return {"kind": "signing", "event": kind, "doc": doc, "address": deal_address(doc),
                        "waiting_on": waiting.group(1) if waiting else "",
                        "signer": person.group(1).strip() if person else "",
                        "thread_id": m.get("thread_id", ""), "at": when}
    return None


def ingest(crm: CRM, messages: list[dict], my_email: str = "aire@calebjackson.org") -> dict:
    """Events -> the CRM, idempotent. Leads become contacts (matched first), showings and signatures
    become Deals rows and Notes, a signature Caleb owes becomes a Task."""
    counts = {"leads_new": 0, "leads_matched": 0, "showings": 0, "signings": 0, "tasks": 0, "unmatched": 0, "skipped": 0, "events": []}
    note_keys = {(n["person_id"], n["Note"]) for n in crm.notes()}
    # The Connector Log is the memory of what was already ingested, so a re-run is a no-op.
    log = crm.b.read("Connector Log")
    deal_events = {(slug(r["Detail"].split(": ", 1)[0]), r["Detail"].split(": ", 1)[1])
                   for r in log if r.get("Tool") in ("create_deal", "update_deal") and ": " in r.get("Detail", "")}
    tasks_ever = {r["Detail"].rsplit(" due ", 1)[0] for r in log if r.get("Tool") == "add_task"}
    open_tasks = {t["task"] for t in crm.tasks() if t.get("status") == "open"} | tasks_ever
    unmatched_ever = {r["Detail"] for r in log if r.get("Tool") == "unmatched_authentisign"}
    events = []
    for m in sorted(messages, key=lambda m: m["date_iso"]):
        ev = parse_message(m)
        if not ev:
            counts["skipped"] += 1
            continue
        events.append(ev)
    # A Gmail thread that ever named a street address lends it to the addressless Authentisign mail in the same thread.
    thread_addr = {ev["thread_id"]: ev["address"] for ev in events
                   if ev["kind"] in ("showing", "signing") and ev.get("thread_id") and ev.get("address")}
    for ev in events:
        day = ev["at"][:10]
        if ev["kind"] == "lead":
            note = f"Website lead {day}: {ev['type'] or 'inquiry'} {ev['email']} {ev['phone']}".strip()
            hits = crm.find(ev["name"], ev["email"], ev["phone"])
            if hits:
                pid = hits[0]["person_id"]
                if (pid, note) in note_keys:
                    counts["skipped"] += 1
                    continue
                crm.add_note(pid, note)
                if not (hits[0].get("Next_Action") or "").strip():
                    crm.update_contact(pid, {"Next_Action": "Call back: new website inquiry"}, "website lead")
                counts["leads_matched"] += 1
                counts["events"].append(f"lead matched person_id {pid} ({hits[0]['_match']}): {ev['name']}")
            else:
                if any(n == note and p for p, n in note_keys):
                    counts["skipped"] += 1
                    continue
                row = crm.create_contact(ev["name"], ev["phone"], ev["email"], band="hot", stage="new lead",
                                         source=f"Luxury Presence {day}", next_action="Call within the hour", type_="client")
                crm.add_note(row["person_id"], note)
                counts["leads_new"] += 1
                counts["events"].append(f"lead new person_id {row['person_id']}: {ev['name']}")
            note_keys.add((hits[0]["person_id"] if hits else row["person_id"], note))
        elif ev["kind"] == "showing":
            event = f"showing {ev['status']} {ev['when']}" + (f" ({ev['agent']})" if ev["agent"] else "")
            key = slug(ev["address"])
            if (key, event) in deal_events:
                counts["skipped"] += 1
                continue
            d = crm.upsert_deal(ev["address"], event, ev["at"], stage="active", side="listing", source="ShowingTime")
            if d.get("person_id"):
                crm.add_note(d["person_id"], f"{ev['address']}: {event}")
            deal_events.add((key, event))
            counts["showings"] += 1
            counts["events"].append(f"showing {ev['address']}: {event}")
        elif ev["kind"] == "signing":
            event = f"Authentisign {ev['event']}: {ev['doc']}" + (f" (waiting on {ev['waiting_on']})" if ev["waiting_on"] else "")
            address = ev["address"] or thread_addr.get(ev.get("thread_id", ""), "")
            pid = ""
            if address:
                # A real street address: one Deals row keyed by it, as before.
                key = slug(address)
                if (key, event) in deal_events:
                    counts["skipped"] += 1
                    continue
                d = crm.upsert_deal(address, event, ev["at"], source="Authentisign")
                pid = d.get("person_id", "")
                if pid:
                    crm.add_note(pid, f"{address}: {event}")
                deal_events.add((key, event))
                counts["signings"] += 1
                counts["events"].append(f"signing {address}: {event}")
            else:
                # No address anywhere: attach to the signer when the CRM knows them, else log it and move on.
                # Never a Deals row named after a form.
                hits = crm.find(ev.get("signer", ""), "" if my_email in ev["waiting_on"] else ev["waiting_on"])
                hits = [h for h in hits if email_key(h.get("email")) != email_key(my_email)]
                if hits:
                    pid = hits[0]["person_id"]
                    if (pid, event) in note_keys:
                        counts["skipped"] += 1
                        continue
                    crm.add_note(pid, event)
                    note_keys.add((pid, event))
                    counts["signings"] += 1
                    counts["events"].append(f"signing attached to person_id {pid} ({hits[0]['_match']}): {event}")
                else:
                    detail = f"{event} on {day}" + (f" [{ev['signer']}]" if ev.get("signer") else "")
                    if detail in unmatched_ever:
                        counts["skipped"] += 1
                        continue
                    crm._audit("unmatched_authentisign", "", detail)
                    unmatched_ever.add(detail)
                    counts["unmatched"] += 1
                    counts["events"].append(f"unmatched Authentisign: {detail}")
            owes_me = ev["event"] == "requested" or (ev["event"] == "inactive" and my_email in ev["waiting_on"])
            task = f"Sign {ev['doc']}"
            if ev["event"] == "complete":
                for t in crm.open_tasks():
                    if t["task"] == task:
                        crm.done(t["task_id"])
                        open_tasks.discard(task)
            elif owes_me and task not in open_tasks:
                crm.add_task(pid, task, day, source="Authentisign")
                open_tasks.add(task)
                counts["tasks"] += 1
    return counts


def gmail_messages(hours: int) -> list[dict]:
    """Read only. Only the three senders, only messages newer than `hours`."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    import base64
    creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    svc = build("gmail", "v1", credentials=creds, cache_discovery=False)
    q = f"newer_than:{max(1, hours // 24 + 1)}d (from:luxurypresence.com OR from:showingtime.com OR from:authentisign.com)"
    res = svc.users().messages().list(userId="me", q=q, maxResults=200).execute()
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
        out.append({"subject": h.get("Subject", ""), "from": h.get("From", ""), "thread_id": full.get("threadId", ""),
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


# ---------------------------------------------------------- Hot-Warm-Cold merge


HWC_TIER_TO_BAND = {"HOT": "hot", "WARM": "warm", "COLD": "cold", "CONTACT": "ice-cold"}  # five-step scale, Caleb 2026-10-20
HWC_CATEGORY_TO_TYPE = {"client": "client", "lead": "client", "friend": "client", "family": "client",
                        "agent": "agent", "vendor": "vendor", "other": "unknown"}


def split_couple(name: str) -> list[str]:
    """'Pat & Sam Example' -> ['Pat Example', 'Sam Example']; 'Greg & Sarah Sample' likewise."""
    name = name.strip()
    if "&" not in name and " and " not in name:
        return [name]
    parts = re.split(r"\s*(?:&| and )\s*", name)
    if len(parts) != 2:
        return [name]
    a, b = parts[0].split(), parts[1].split()
    if len(a) == 1 and len(b) >= 2:
        return [f"{a[0]} {b[-1]}", parts[1]]
    return [parts[0], parts[1]]


def merge_hwc(crm: CRM, hwc_rows: list[dict], as_of: date | None = None) -> dict:
    """Classify every Hot-Warm-Cold row against the CRM. Read only; returns the plan."""
    as_of = as_of or today()
    report = {"matched": [], "new": [], "conflicts": [], "counts": {}}
    for r in hwc_rows:
        name, phone, email, tier = r.get("Name", "").strip(), r.get("Phone", ""), r.get("Email", ""), (r.get("Tier") or "").upper()
        hits = crm.find(name, email, phone)
        if not hits:
            for part in split_couple(name):
                hits = crm.find(part)
                if hits:
                    break
        last = parse_touch(r.get("Last touch", ""), as_of)
        plan = {"hwc_name": name, "tier": tier, "category": r.get("Category", ""), "phone": phone, "email": email,
                "last_touch": last, "next_action": (r.get("Next action") or "").strip(), "why": r.get("Why this tier", ""),
                "notes": r.get("Notes", "")}
        if not hits:
            plan["type"] = HWC_CATEGORY_TO_TYPE.get(plan["category"].lower(), "unknown")
            plan["band"] = HWC_TIER_TO_BAND.get(tier, "")
            report["new"].append(plan)
            continue
        if len(hits) > 1:
            plan["candidates"] = [(h["person_id"], h["display"], h["_match"]) for h in hits]
            plan["reason"] = "more than one CRM row matches"
            report["conflicts"].append(plan)
            continue
        h = hits[0]
        plan.update({"person_id": h["person_id"], "display": h["display"], "match": h["_match"],
                     "crm_band": h.get("band", ""), "crm_last_touch": h.get("Last_Touch", ""),
                     "crm_next_action": h.get("Next_Action", ""), "crm_dnc": h.get("Do_Not_Contact", "")})
        reasons = []
        if (h.get("Do_Not_Contact") or "").upper() == "YES":
            reasons.append("CRM says Do_Not_Contact")
        want_band = HWC_TIER_TO_BAND.get(tier, "")
        if want_band and norm_band(h.get("band")) and norm_band(h.get("band")) != want_band:
            reasons.append(f"band {h['band']} in CRM vs tier {tier} in HWC")
        if h["_match"] == "name" and phone_key(phone) and phone_key(h.get("primary_phone")) and phone_key(phone) != phone_key(h.get("primary_phone")):
            reasons.append("same name, different phone")
        if reasons:
            plan["reason"] = "; ".join(reasons)
            report["conflicts"].append(plan)
            continue
        fields = {}
        if want_band and not h.get("band"):
            fields["band"] = want_band
        if last and not parse_touch(h.get("Last_Touch", ""), as_of):
            fields["Last_Touch"] = last
        if plan["next_action"] and not (h.get("Next_Action") or "").strip():
            fields["Next_Action"] = plan["next_action"]
        plan["fields"] = fields
        report["matched"].append(plan)
    c = report["counts"]
    c["hwc_rows"] = len(hwc_rows)
    c["matched"] = len(report["matched"])
    c["new"] = len(report["new"])
    c["conflicts"] = len(report["conflicts"])
    c["matched_by"] = {k: sum(1 for m in report["matched"] if m["match"] == k) for k in ("email", "phone", "name")}
    c["matched_with_writes"] = sum(1 for m in report["matched"] if m["fields"])
    return report


def apply_hwc(crm: CRM, report: dict, stamp: str) -> dict:
    """Only after Caleb says yes to the report. Conflicts are never applied."""
    n = {"updated": 0, "created": 0, "notes": 0}
    for m in report["matched"]:
        if m["fields"]:
            crm.update_contact(m["person_id"], m["fields"], f"HWC merge {stamp}")
            n["updated"] += 1
        why = " | ".join(x for x in (m["why"], m["notes"]) if x)
        if why:
            crm.add_note(m["person_id"], f"HWC {stamp} ({m['tier']}): {why}")
            n["notes"] += 1
    for p in report["new"]:
        row = crm.create_contact(p["hwc_name"], p["phone"], p["email"], band=p["band"], stage="",
                                 source=f"Hot-Warm-Cold Contacts {stamp}", next_action=p["next_action"], type_=p["type"])
        if p["last_touch"]:
            crm.update_contact(row["person_id"], {"Last_Touch": p["last_touch"]}, f"HWC merge {stamp}")
        why = " | ".join(x for x in (p["why"], p["notes"]) if x)
        if why:
            crm.add_note(row["person_id"], f"HWC {stamp} ({p['tier']}): {why}")
            n["notes"] += 1
        n["created"] += 1
    return n


def hwc_report_md(report: dict, stamp: str, dry_run: bool = True) -> str:
    c = report["counts"]
    L = [f"# Hot-Warm-Cold merge dry run, {stamp}", "",
         "Read only. Nothing was written to the AIRE CRM. Caleb reviews this, then says yes or no.", "",
         "## Blueprint", "",
         "1. Each of the 458 Hot-Warm-Cold rows is matched to the CRM by email, then phone (10 digits), then exact display name. Couples like \"Pat & Sam Example\" are tried as two people when the full string misses.",
         "2. A single clean match becomes an update plan: band filled only when blank and only for HOT or WARM, Last_Touch filled only when blank, Next_Action filled only when blank, plus one Notes row carrying \"Why this tier\" and Notes.",
         "3. A row with no match becomes a new contact (minted person_id, Do_Not_Contact NO, Source \"Hot-Warm-Cold Contacts\").",
         "4. Anything ambiguous is a conflict and is never applied: more than one CRM match, the CRM says Do_Not_Contact, the CRM band disagrees with the HWC tier, or same name with a different phone.",
         "5. COLD and CONTACT tiers do not map to a band. Those matches get Last_Touch, Next_Action and the note, no band. Caleb decides whether COLD is NURTURE and CONTACT is DORMANT.", "",
         "## Proof", "",
         f"| HWC rows | Matched | New people | Conflicts |", "|---|---|---|---|",
         f"| {c['hwc_rows']} | {c['matched']} | {c['new']} | {c['conflicts']} |", "",
         f"Matched by: email {c['matched_by']['email']}, phone {c['matched_by']['phone']}, name {c['matched_by']['name']}. "
         f"Matches that would change a Contacts cell: {c['matched_with_writes']}.", ""]
    L += ["### Conflicts (never applied)", "", "| HWC name | Tier | CRM person_id | CRM display | Why |", "|---|---|---|---|---|"]
    for p in report["conflicts"]:
        who = p.get("person_id", "") or "; ".join(f"{a} {b} ({m})" for a, b, m in p.get("candidates", []))
        L.append(f"| {p['hwc_name']} | {p['tier']} | {who} | {p.get('display', '')} | {p['reason']} |")
    L += ["", "### Matches with a planned write", "", "| HWC name | Tier | person_id | CRM display | Match | Would set |", "|---|---|---|---|---|---|"]
    for m in report["matched"]:
        if m["fields"]:
            L.append(f"| {m['hwc_name']} | {m['tier']} | {m['person_id']} | {m['display']} | {m['match']} | "
                     + ", ".join(f"{k}={v}" for k, v in m["fields"].items()) + " |")
    L += ["", "### Matches with only a note to add", "",
          ", ".join(f"{m['hwc_name']} (#{m['person_id']})" for m in report["matched"] if not m["fields"]) or "none", ""]
    L += ["### New people (would be created)", "", "| HWC name | Tier | Category | Phone | Email | Band | Type |", "|---|---|---|---|---|---|---|"]
    for p in report["new"]:
        L.append(f"| {p['hwc_name']} | {p['tier']} | {p['category']} | {p['phone']} | {p['email']} | {p['band'] or ''} | {p['type']} |")
    L += ["", "## Unknowns", "",
          "- Whether COLD should become band NURTURE and CONTACT should become DORMANT. Not applied until Caleb says.",
          "- Whether a HWC phone should overwrite a CRM phone on a name match. This plan never touches primary_phone or email.",
          "- The HWC \"Last touch\" column is Caleb's shorthand (\"10/15 text, unanswered\"); the parsed date is the first m/d in it.", ""]
    if dry_run:
        L += ["Status: dry run, nothing written.", ""]
    return "\n".join(L)


# -------------------------------------------------------------------- tests


def run_tests() -> int:
    import tempfile
    tmp = Path(tempfile.mkdtemp())
    db = tmp / "db.json"
    db.write_text((HERE / "tests" / "fixtures" / "fake-crm.json").read_text())
    audit = tmp / "audit.jsonl"
    crm = CRM(LocalBackend(db), audit_path=audit)
    as_of = date(2026, 10, 20)
    fails = []

    def check(name, cond):
        print(("PASS " if cond else "FAIL ") + name)
        if not cond:
            fails.append(name)

    def raises(fn):
        try:
            fn()
            return False
        except GateError:
            return True

    # header and tabs
    chk = crm.check()
    check("live header has every expected column", chk["contacts_header_ok"])
    check("Tasks and Deals are the only tabs to add", chk["tabs_to_add"] == ["Tasks", "Deals"])
    added = crm.ensure_tabs()
    check("ensure_tabs adds exactly those two", added == ["Tasks", "Deals"] and crm.ensure_tabs() == [])
    bad = LocalBackend(tmp / "bad.json")
    bad.data["header"] = [c for c in CONTACT_COLUMNS if c != "Do_Not_Contact"]
    check("missing column is reported", CRM(bad, audit).check()["missing_columns"] == ["Do_Not_Contact"])

    # parsing
    check("parse_touch sheet format", parse_touch("2026-09-16 (closing)", as_of) == "2026-09-16")
    check("parse_touch m/d", parse_touch("10/18 inspection response", as_of) == "2026-10-18")
    check("parse_touch future rolls back a year", parse_touch("12/25 card", as_of) == "2025-12-25")
    check("parse_touch empty", parse_touch("", as_of) == "")
    check("phone_key normalizes", phone_key("(225) 555-0142") == "2255550142" == phone_key("+12255550142"))

    # gates
    check("update by unknown person_id refused", raises(lambda: crm.update_contact("999", {"Stage": "x"}, "t")))
    check("Command_ID never written", raises(lambda: crm.update_contact("1", {"Command_ID": "abc"}, "t")))
    check("Do_Not_Contact not via update_contact", raises(lambda: crm.update_contact("1", {"Do_Not_Contact": "NO"}, "t")))
    check("enrichment columns not writable", raises(lambda: crm.update_contact("1", {"fair_market_value": "1"}, "t")))
    check("DNC YES -> YES is a no-op", crm.set_do_not_contact("5", "test") is False)
    check("no API to set DNC back to NO", not hasattr(crm, "clear_do_not_contact"))
    check("touch on DNC person refused", raises(lambda: crm.touch("5", "called")))
    check("create refuses an existing phone", raises(lambda: crm.create_contact("Someone Else", phone="225-555-0101")))
    n0 = len(audit.read_text().splitlines()) if audit.exists() else 0
    crm.update_contact("1", {"Stage": "contacted"}, "test")
    check("update writes the cell", crm.by_id("1")["Stage"] == "contacted")
    check("update is audited to audit.jsonl", len(audit.read_text().splitlines()) == n0 + 1)
    check("update is audited to Connector Log", any(r["Tool"] == "update_contact" and r["person_id"] == "1" for r in crm.b.read("Connector Log")))
    check("unchanged update writes nothing", crm.update_contact("1", {"Stage": "contacted"}, "test") == {})

    # due by band
    due = crm.due(as_of)
    ids = [d["person_id"] for d in due]
    check("hot 2 days quiet not due", "1" not in ids)
    check("warm 20 days quiet due", "2" in ids)
    check("legacy NURTURE reads as cold, never touched, due", "3" in ids and next(d for d in due if d["person_id"] == "3")["band"] == "cold")
    check("DNC never due", "5" not in ids)
    check("vendor never due", "6" not in ids)
    check("blank band not due", "7" not in ids)
    check("hot sorts first", all(BAND_ORDER[a["band"]] <= BAND_ORDER[b["band"]] for a, b in zip(due, due[1:])))

    # touch, tasks
    crm.touch("2", "called, left voicemail", day="2026-10-20")
    check("touch moves Last_Touch", crm.by_id("2")["Last_Touch"] == "2026-10-20")
    check("touch keeps a note", any(n["person_id"] == "2" and "voicemail" in n["Note"] for n in crm.notes()))
    check("warm no longer due", "2" not in [d["person_id"] for d in crm.due(as_of)])
    nat = crm.next_action_tasks(as_of)
    check("Next_Action tasks from hot/warm only", {t["person_id"] for t in nat} == {"1", "2"})
    check("hot due today, warm in 3 days", {t["due"] for t in nat} == {"2026-10-20", "2026-10-23"})
    check("sync-tasks writes them once", crm.sync_tasks(as_of) == 2 and crm.sync_tasks(as_of) == 0)
    t = crm.add_task("1", "send inspection report", "2026-10-19")
    check("overdue flagged", any(x["task_id"] == t["task_id"] and x["overdue"] for x in crm.open_tasks(as_of)))
    check("done closes the task", crm.done(t["task_id"]) and t["task_id"] not in [x["task_id"] for x in crm.open_tasks(as_of)])

    # ingest
    msgs = json.loads((HERE / "tests" / "fixtures" / "gmail-samples.json").read_text())
    r = ingest(crm, msgs)
    check("new lead creates a hot contact with the next person_id", any(c["display"] == "Sam Newlead" and c["band"] == "hot"
          and c["Stage"] == "new lead" and c["person_id"] == "8" for c in crm.contacts()))
    crm.b.data["Connector Log"].append({"At (CT)": "x", "Tool": "create_contact", "Client": "live-check", "person_id": "50", "Detail": "deleted test row"})
    check("a deleted row's id is never reused", crm.next_person_id() == "51")
    check("known lead matches by email, no new row", r["leads_matched"] == 1 and sum(1 for c in crm.contacts() if c["display"] == "Jordan Warm") == 1)
    check("showing makes a deal", any(d["deal_id"] == slug("1 Test Ave") and d["source"] == "ShowingTime" for d in crm.deals()))
    check("signature request makes a Sign task", any(x["task"] == "Sign 2 Done St - Listing Agreement.pdf" for x in crm.open_tasks(as_of)))
    check("signing complete closes it", not any(x["task"] == "Sign 1 Test Ave - Inspection Response.pdf" for x in crm.open_tasks(as_of)))
    check("doc without a street address has no deal address", deal_address("GBRAR Counteroffer Addendum") == ""
          and deal_address("9241 Pecan Tree Drive - Inspection Response.pdf") == "9241 Pecan Tree Drive")
    junk = [d for d in crm.deals() if not re.match(r"^\d", d["address"])]
    check("no Deals row is ever named after a form", junk == [] and len(crm.deals()) == 2)
    check("addressless signing attaches to the signer the CRM knows", any(n["person_id"] == "1"
          and n["Note"] == "Authentisign complete: GBRAR Counteroffer Addendum" for n in crm.notes()))
    check("addressless signing nobody knows is logged as unmatched", r["unmatched"] == 2 and any(
          x["Tool"] == "unmatched_authentisign" and "LRA General Addendum" in x["Detail"] and "[Stranger Person]" in x["Detail"]
          for x in crm.b.read("Connector Log")))
    check("signature Caleb owes still makes a task without a deal", any(x["task"] == "Sign Due Diligence and Inspection Response"
          and x["person_id"] == "" for x in crm.open_tasks(as_of)))
    one = [d for d in crm.deals() if d["deal_id"] == slug("1 Test Ave")][0]
    check("signing updated in a known thread lands on that address's deal", "Authentisign complete: 1 Test Ave" in one["last_event"]
          and any("Authentisign updated: 1 Test Ave" in x["Detail"] for x in crm.b.read("Connector Log") if x["Tool"] == "update_deal"))
    check("unrelated mail skipped", r["skipped"] >= 1)
    r2 = ingest(crm, msgs)
    check("ingest is idempotent", r2["leads_new"] == 0 and r2["leads_matched"] == 0 and r2["showings"] == 0
          and r2["signings"] == 0 and r2["unmatched"] == 0 and r2["tasks"] == 0)

    # signals: iMessage data ranks first
    sig = load_signals(HERE / "tests" / "fixtures" / "fake-signals.csv", crm.contacts())
    check("enriched.csv loads by person_id and drops non-ok status", set(sig) == {"1", "2", "3"} and sig["1"]["owes_reply"])
    d_plain = {x["person_id"]: x for x in crm.due(as_of)}
    d_sig = crm.due(as_of, sig)
    ids = [x["person_id"] for x in d_sig]
    check("owes_reply is due today and sorts first", ids and ids[0] == "1" and d_sig[0]["owes_reply"] and d_sig[0]["days_quiet"] == 2)
    check("a recent text clears someone the sheet called due", "2" not in ids)
    check("enrichment label sets the cadence", "3" in ids and d_sig[ids.index("3")]["band"] == "lukewarm" and d_plain["3"]["band"] == "cold")
    check("do-not-contact stays off the list with signals", "5" not in ids)
    sig2 = load_signals(HERE / "tests" / "fixtures" / "fake-imessage-signals.json", crm.contacts())
    check("imessage-signals.json maps handles to person_id", set(sig2) == {"1", "7"} and sig2["1"]["last_inbound"] == "2026-10-17")
    f2 = crm.feed(as_of, sig, "fake-signals.csv")
    check("feed carries the signals summary", f2["signals"]["people"] == 3 and f2["signals"]["owes_reply"] == 1
          and f2["touches_due"][0]["last_inbound"] == "2026-10-17")

    # feed
    f = crm.feed(as_of)
    check("feed has every section", all(k in f for k in ("touches_due", "tasks", "deals", "new_leads", "counts", "header_ok")))
    check("feed lists the new lead", any(l["display"] == "Sam Newlead" for l in f["new_leads"]))
    check("feed is json", json.dumps(f) is not None)

    # dry run writes nothing
    before = db.read_text()
    dry = CRM(LocalBackend(db, dry_run=True), audit_path=tmp / "dry-audit.jsonl")
    dry.update_contact("1", {"Stage": "zzz"}, "dry")
    dry.create_contact("Dry Person", phone="225-555-0999")
    check("dry run records the writes", len(dry.b.writes) >= 2)
    check("dry run changes nothing on disk", db.read_text() == before and not (tmp / "dry-audit.jsonl").exists())

    # hwc merge
    hwc = json.loads((HERE / "tests" / "fixtures" / "fake-hwc.json").read_text())
    rep = merge_hwc(crm, hwc, as_of)
    by = {m["hwc_name"]: m for m in rep["matched"]}
    check("hwc phone match, nothing to change", by["Taylor Sample"]["match"] == "phone" and by["Taylor Sample"]["fields"] == {})
    check("hwc couple matched by splitting", "Greg & Sarah Sample" in by and by["Greg & Sarah Sample"]["person_id"] == "4")
    check("hwc fills blank band and Last_Touch only", by["Greg & Sarah Sample"]["fields"] == {"band": "warm", "Last_Touch": "2026-10-14", "Next_Action": "FORD check-in"})
    check("hwc COLD maps to cold", any(p["hwc_name"] == "Brand New Cold" and p["band"] == "cold" for p in rep["new"]))
    check("hwc DNC is a conflict", any(c["hwc_name"] == "Casey Cold" and "Do_Not_Contact" in c["reason"] for c in rep["conflicts"]))
    check("hwc band disagreement is a conflict", any(c["hwc_name"] == "Jordan Warm" and "band" in c["reason"] for c in rep["conflicts"]))
    md = hwc_report_md(rep, "2026-10-19")
    check("hwc report has the three sections", all(h in md for h in ("## Blueprint", "## Proof", "## Unknowns")))
    n_before = len(crm.contacts())
    out = apply_hwc(crm, rep, "2026-10-19")
    check("apply creates only the new people", out["created"] == rep["counts"]["new"] and len(crm.contacts()) == n_before + out["created"])
    check("apply never touches conflicts", crm.by_id("5")["Do_Not_Contact"] == "YES" and norm_band(crm.by_id("2")["band"]) == "warm")
    # rescale
    check("norm_band maps legacy", norm_band("HOT") == "hot" and norm_band("NURTURE") == "cold" and norm_band("DORMANT") == "ice-cold" and norm_band("lukewarm") == "lukewarm" and norm_band("junk") == "")
    rc = crm.rescale_band()
    check("rescale rewrites only legacy cells", all(norm_band(c["band"]) == c["band"] for c in crm.contacts() if c["band"]) and sum(rc.values()) >= 2)
    check("rescale is audited", any(r["Tool"] == "rescale_band" for r in crm.b.read("Connector Log")))
    check("rescale twice is a no-op", crm.rescale_band() == {})

    print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED'}")
    return 1 if fails else 0


# ---------------------------------------------------------------------- cli


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--local", help="JSON snapshot instead of Google Sheets")
    ap.add_argument("--dry-run", action="store_true", help="list every write, perform none")
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--as-of", help="YYYY-MM-DD, default today (Central)")
    sub = ap.add_subparsers(dest="cmd")
    sub.add_parser("auth")
    sub.add_parser("check")
    p = sub.add_parser("feed"); p.add_argument("--out", default=str(FEED))
    p.add_argument("--signals", help="enriched.csv or imessage-signals.json from aire/enrichment: rank by texts first")
    p = sub.add_parser("due"); p.add_argument("--signals")
    sub.add_parser("tasks")
    sub.add_parser("deals")
    p = sub.add_parser("ingest"); p.add_argument("--hours", type=int, default=26); p.add_argument("--messages", help="JSON file of messages instead of Gmail")
    sub.add_parser("sync-tasks")
    sub.add_parser("rescale-band")
    p = sub.add_parser("touch"); p.add_argument("person_id"); p.add_argument("what")
    p = sub.add_parser("task"); p.add_argument("person_id"); p.add_argument("task"); p.add_argument("--due", default=today().isoformat())
    p = sub.add_parser("done"); p.add_argument("task_id")
    p = sub.add_parser("merge-hwc"); p.add_argument("--hwc", required=True); p.add_argument("--report", required=True)
    p.add_argument("--apply", action="store_true", help="only after Caleb has said yes to the report")
    a = ap.parse_args(argv)

    if a.test:
        return run_tests()
    if a.cmd == "auth":
        auth(); return 0
    if a.cmd is None:
        ap.print_help(); return 0
    backend = LocalBackend(Path(a.local), dry_run=a.dry_run) if a.local else SheetsBackend(dry_run=a.dry_run)
    crm = CRM(backend)
    as_of = date.fromisoformat(a.as_of) if a.as_of else today()

    if a.cmd == "check":
        print(json.dumps(crm.check(), indent=1))
    elif a.cmd == "feed":
        sig = load_signals(Path(a.signals), crm.contacts()) if a.signals else None
        f = crm.feed(as_of, sig, a.signals or "")
        Path(a.out).write_text(json.dumps(f, indent=1, ensure_ascii=False))
        print(f"{a.out}: " + ", ".join(f"{k} {v}" for k, v in f["counts"].items() if not isinstance(v, dict))
              + (f", signals for {f['signals']['people']} people, {f['signals']['owes_reply']} owe a reply" if sig else ""))
    elif a.cmd == "due":
        sig = load_signals(Path(a.signals), crm.contacts()) if a.signals else None
        for d in crm.due(as_of, sig):
            days = "never" if d["days_quiet"] is None else f"{d['days_quiet']}d"
            flag = "REPLY" if d["owes_reply"] else "     "
            print(f"{flag} {d['band']:8} {days:>6}  #{d['person_id']:<5} {d['display']:30} {d['phone']:14} {d['next_action']}")
    elif a.cmd == "tasks":
        for t in crm.open_tasks(as_of) + crm.next_action_tasks(as_of):
            print(f"{'OVERDUE' if t.get('overdue') else '       '} {t['due']} #{t['person_id']:<5} {t['display']:28} {t['task']} [{t.get('task_id', 'next_action')}]")
    elif a.cmd == "deals":
        for d in crm.live_deals():
            print(f"{d['stage']:14} {d['address']:40} {d['last_event']} {d['last_event_at'][:10]}")
    elif a.cmd == "ingest":
        crm.ensure_tabs()
        msgs = json.loads(Path(a.messages).read_text()) if a.messages else gmail_messages(a.hours)
        r = ingest(crm, msgs)
        for e in r.pop("events"):
            print("  " + e)
        print(r)
    elif a.cmd == "sync-tasks":
        crm.ensure_tabs()
        print(f"{crm.sync_tasks(as_of)} tasks added from Next_Action")
    elif a.cmd == "rescale-band":
        print(crm.rescale_band())
    elif a.cmd == "touch":
        print(crm.touch(a.person_id, a.what, day=as_of.isoformat()))
    elif a.cmd == "task":
        crm.ensure_tabs()
        print(crm.add_task(a.person_id, a.task, a.due))
    elif a.cmd == "done":
        print("done" if crm.done(a.task_id) else "no such open task")
    elif a.cmd == "merge-hwc":
        hwc = json.loads(Path(a.hwc).read_text())
        hwc = hwc.get("Contacts", hwc) if isinstance(hwc, dict) else hwc
        stamp = as_of.isoformat()
        rep = merge_hwc(crm, hwc, as_of)
        if a.apply and not a.dry_run:
            crm.ensure_tabs()
            print(apply_hwc(crm, rep, stamp))
        Path(a.report).write_text(hwc_report_md(rep, stamp, dry_run=not (a.apply and not a.dry_run)))
        print(f"{a.report}: " + ", ".join(f"{k} {v}" for k, v in rep["counts"].items() if not isinstance(v, dict)))
    if a.dry_run:
        print(f"\nDRY RUN: {len(backend.writes)} write(s) planned, 0 performed")
        for w in backend.writes:
            print("  " + json.dumps(w, ensure_ascii=False)[:200])
    return 0


if __name__ == "__main__":
    sys.exit(main())
