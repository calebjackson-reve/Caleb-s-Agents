"""Read and write the real AIRE CRM sheet. One job: the sheet. Nothing here scores or decides.

Contacts tab: columns A..Y are the CRM's own (person_id .. Type) and are never rewritten here.
This tool owns the enrichment block that starts at column Z. Notes tab gets one row per label change.
Local JSON backend for tests and offline practice runs: same methods, no network."""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

SHEET_ID = os.getenv("AIRE_CRM_SHEET", "1w9izcliqmXlFR3_O3dnP2G5SGfCrua7mrCLCE7cdoDc")
TOKEN = Path(os.getenv("AIRE_GOOGLE_TOKEN", str(Path.home() / ".aire" / "google-token.json")))
SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/gmail.readonly"]
CENTRAL = ZoneInfo("America/Chicago")

CRM_COLUMNS = ["person_id", "display", "first", "last", "name_tier", "primary_phone", "email", "email_tier",
               "street", "city", "state", "zip", "addr_tier", "homestead", "fair_market_value", "band",
               "opportunity_types", "provenance", "Stage", "Do_Not_Contact", "Source", "Last_Touch",
               "Next_Action", "Command_ID", "Type"]
ENRICH_COLUMNS = ["signal_score", "aire_label", "status", "due", "last_inbound", "last_outbound", "msgs_90d",
                  "emails_90d", "owes_reply", "social_90d", "hidden_lead", "keywords", "intent", "timeline", "area",
                  "next_touch", "enriched_at"]
ENRICH_START_COL = "Z"  # Z..AP


def col_letter(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


ENRICH_END_COL = col_letter(26 + len(ENRICH_COLUMNS) - 1)


def now_ct() -> str:
    return datetime.now(CENTRAL).strftime("%Y-%m-%d %H:%M")


class LocalCRM:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.data = json.loads(self.path.read_text()) if self.path.exists() else {"Contacts": [], "Notes": []}

    def contacts(self) -> list[dict]:
        return [dict(r) for r in self.data["Contacts"]]

    def write_enrichment(self, rows: list[dict]) -> int:
        by_id = {r["person_id"]: r for r in rows}
        n = 0
        for c in self.data["Contacts"]:
            if c["person_id"] in by_id:
                for k in ENRICH_COLUMNS:
                    c[k] = by_id[c["person_id"]].get(k, "")
                n += 1
        self._save()
        return n

    def add_notes(self, notes: list[dict]) -> None:
        self.data["Notes"].extend(notes)
        self._save()

    def _save(self):
        self.path.write_text(json.dumps(self.data, indent=1, ensure_ascii=False))


class SheetCRM:
    def __init__(self, sheet_id: str = SHEET_ID):
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        if not TOKEN.exists():
            sys.exit(f"No Google token at {TOKEN}. Run: python3 ../crm/crm.py auth")
        self.svc = build("sheets", "v4", credentials=Credentials.from_authorized_user_file(str(TOKEN), SCOPES),
                         cache_discovery=False)
        self.sheet_id = sheet_id
        self._header: list[str] = []

    def contacts(self) -> list[dict]:
        res = self.svc.spreadsheets().values().get(spreadsheetId=self.sheet_id, range="Contacts!A1:AZ").execute()
        values = res.get("values", [])
        if not values:
            return []
        self._header = values[0]
        out = []
        for r in values[1:]:
            r = list(r) + [""] * (len(self._header) - len(r))
            d = {h: r[i] for i, h in enumerate(self._header)}
            if d.get("person_id"):
                out.append(d)
        return out

    def ensure_header(self) -> None:
        """Writes the enrichment header once, only into empty cells at Z1 onward. Never touches A..Y."""
        res = self.svc.spreadsheets().values().get(spreadsheetId=self.sheet_id, range=f"Contacts!{ENRICH_START_COL}1:{ENRICH_END_COL}1").execute()
        have = (res.get("values") or [[]])[0]
        if have[:len(ENRICH_COLUMNS)] == ENRICH_COLUMNS:
            return
        if any(have):
            sys.exit(f"Columns {ENRICH_START_COL}..{ENRICH_END_COL} already hold {have}. Not overwriting. Set AIRE_ENRICH_START to a free column.")
        self.svc.spreadsheets().values().update(spreadsheetId=self.sheet_id, range=f"Contacts!{ENRICH_START_COL}1",
                                                valueInputOption="RAW", body={"values": [ENRICH_COLUMNS]}).execute()

    def write_enrichment(self, rows: list[dict]) -> int:
        """Row position comes from person_id order in the sheet, read fresh so nothing lands on the wrong person."""
        self.ensure_header()
        res = self.svc.spreadsheets().values().get(spreadsheetId=self.sheet_id, range="Contacts!A2:A").execute()
        ids = [r[0] if r else "" for r in res.get("values", [])]
        pos = {pid: i + 2 for i, pid in enumerate(ids) if pid}
        data = []
        for r in rows:
            if r["person_id"] in pos:
                data.append({"range": f"Contacts!{ENRICH_START_COL}{pos[r['person_id']]}",
                             "values": [[str(r.get(k, "")) for k in ENRICH_COLUMNS]]})
        for i in range(0, len(data), 500):
            self.svc.spreadsheets().values().batchUpdate(spreadsheetId=self.sheet_id,
                                                         body={"valueInputOption": "RAW", "data": data[i:i + 500]}).execute()
        return len(data)

    def add_notes(self, notes: list[dict]) -> None:
        if not notes:
            return
        values = [[n["At"], n["person_id"], n["display"], n["Note"], n.get("By", "AIRE enrichment")] for n in notes]
        self.svc.spreadsheets().values().append(spreadsheetId=self.sheet_id, range="Notes!A1", valueInputOption="RAW",
                                                insertDataOption="INSERT_ROWS", body={"values": values}).execute()


def open_crm(local: str | None):
    return LocalCRM(Path(local)) if local else SheetCRM()
