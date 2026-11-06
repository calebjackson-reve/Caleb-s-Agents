"""Command Center sync: Google reads into out/cc/ for Pipeline, on the Mac.

    $PY aire/pipeline-app/cc_sync.py auth     # once: browser sign-in, aire@calebjackson.org
    $PY aire/pipeline-app/cc_sync.py          # one pass: every read that is due
    $PY aire/pipeline-app/cc_sync.py --all    # every read now
    $PY aire/pipeline-app/cc_sync.py --status # what ran, what failed

$PY is a Python with the Google libraries: the CRM engine's own (the PIPELINE_PYTHON default in the README),
or /usr/bin/python3 if it has them. install-sync.sh picks it and prints it.

Reads (read only): the AIRE Deals sheet, Google Calendar (30 days), Gmail inbox (3 days), Luxury Presence lead
emails (14 days), commission and CDA mail (120 days), Chase alert emails (30 days). Writes to Google: only the
Goals and Scorecard history tabs of the AIRE Deals sheet. Nothing is sent, nothing is deleted.
A failed read keeps the last good rows and records the error, so the screen shows both.
The LaunchAgent org.calebjackson.aire.ccsync runs one pass every 5 minutes (install-sync.sh).
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import cc  # noqa: E402

OUT = HERE / "out" / "cc"
HOME_AIRE = Path.home() / ".aire"
TOKEN = Path(os.getenv("CC_GOOGLE_TOKEN", str(HOME_AIRE / "google-token-cc.json")))
FALLBACK_TOKEN = HOME_AIRE / "google-token-world.json"  # same three scopes, made by world/sync.py auth
CREDENTIALS = Path(os.getenv("AIRE_GOOGLE_CREDENTIALS", str(HOME_AIRE / "credentials.json")))
SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/calendar.readonly"]
TIMEOUT = 20  # seconds, every Google call
HISTORY_HOUR = 6  # the day's Scorecard history row is written after 6 AM Central

# name: (minutes between reads, what it reads)
READS = {
    "calendar": (15, "Google Calendar, primary, next 30 days"),
    "inbox": (10, "Gmail inbox, last 3 days"),
    "leads": (10, "Gmail, Luxury Presence lead emails, last 14 days"),
    "deals": (30, "AIRE Deals sheet"),
    "commission_mail": (120, "Gmail, commission and CDA mail, last 120 days"),
    "bank_mail": (60, "Gmail, Chase alerts, last 30 days, read only"),
    "news": (120, "Google News searches, last 7 days"),
    "market": (720, "Freddie Mac rate (FRED), Realtor.com inventory, GBRAR monthly"),
    "life": (15, "Life and Life log tabs, AIRE CRM sheet"),
    "workouts": (15, "Workouts and Workout log tabs, AIRE CRM sheet"),
}
PUBLIC_READS = {"news", "market"}  # no Google sign-in needed
Q_INBOX = "in:inbox newer_than:3d -from:me"
Q_LEADS = 'newer_than:14d from:luxurypresence.com subject:("new lead" OR "home value")'
Q_COMMISSION = 'subject:(commission OR disbursement OR CDA OR "closing statement") newer_than:120d'
Q_BANK = "from:(chase.com) newer_than:30d"


# ---------------- files ----------------

def read_doc(name: str, folder: Path = OUT) -> dict:
    try:
        return json.loads((folder / f"{name}.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def write_doc(name: str, doc: dict, folder: Path = OUT) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    tmp = folder / f"{name}.json.tmp"
    tmp.write_text(json.dumps(doc, indent=1, ensure_ascii=False), encoding="utf-8")
    tmp.replace(folder / f"{name}.json")  # atomic: Pipeline never reads half a file


def config(folder: Path = OUT) -> dict:
    return (read_doc("config", folder).get("rows") or {})


# ---------------- Google, with timeouts ----------------

def services():
    import socket
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    socket.setdefaulttimeout(TIMEOUT)  # a floor for every socket, even if httplib2 below is missing
    path = TOKEN if TOKEN.exists() else FALLBACK_TOKEN
    if not path.exists():
        raise RuntimeError("no Google sign-in yet: run cc_sync.py auth")
    creds = Credentials.from_authorized_user_file(str(path), SCOPES)
    if not creds.valid and creds.refresh_token:
        creds.refresh(Request())
        if path == TOKEN:
            path.write_text(creds.to_json(), encoding="utf-8")
    try:
        import httplib2
        from google_auth_httplib2 import AuthorizedHttp
        mk = lambda api, v: build(api, v, http=AuthorizedHttp(creds, http=httplib2.Http(timeout=TIMEOUT)), cache_discovery=False)
    except ImportError:
        mk = lambda api, v: build(api, v, credentials=creds, cache_discovery=False)
    return {"sheets": mk("sheets", "v4"), "calendar": mk("calendar", "v3"), "gmail": mk("gmail", "v1"), "token": path.name}


def cmd_auth() -> None:
    from google_auth_oauthlib.flow import InstalledAppFlow
    flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS), SCOPES)
    creds = flow.run_local_server(port=0, login_hint="aire@calebjackson.org", prompt="consent")
    TOKEN.parent.mkdir(parents=True, exist_ok=True)
    TOKEN.write_text(creds.to_json(), encoding="utf-8")
    os.chmod(TOKEN, 0o600)
    print(f"saved {TOKEN}: Sheets, Gmail read, Calendar read. Run cc_sync.py --all for the first pass.")


# ---------------- mappers: API answers to cached rows (pure, tested) ----------------

def calendar_rows(items: list[dict]) -> list[dict]:
    out = []
    for e in items:
        st, en = e.get("start") or {}, e.get("end") or {}
        out.append({"id": e.get("id"), "title": e.get("summary") or "(no title)",
                    "start": st.get("dateTime") or st.get("date") or "", "end": en.get("dateTime") or en.get("date") or "",
                    "allDay": "dateTime" not in st, "eventType": e.get("eventType") or "default",
                    "creator": (e.get("creator") or {}).get("email") or "", "free": e.get("transparency") == "transparent",
                    "link": e.get("htmlLink") or ""})
    return out


def headers(msg: dict) -> dict:
    return {h.get("name", "").lower(): h.get("value", "") for h in ((msg.get("payload") or {}).get("headers") or [])}


def thread_row(t: dict) -> dict:
    ms = t.get("messages") or [{}]
    m = ms[-1]
    h = headers(m)
    received = ""
    if m.get("internalDate"):
        received = datetime.fromtimestamp(int(m["internalDate"]) / 1000, cc.CENTRAL).isoformat(timespec="seconds")
    return {"threadId": t.get("id"), "sender": h.get("from", ""), "subject": h.get("subject") or "(no subject)",
            "received": received, "messages": len(ms), "snippet": m.get("snippet", "")}


def body_text(msg: dict) -> str:
    """The plain-text part of a message, or the HTML part with tags removed."""
    found = {"plain": "", "html": ""}

    def walk(p):
        mt, data = p.get("mimeType", ""), (p.get("body") or {}).get("data")
        if data and mt in ("text/plain", "text/html"):
            txt = base64.urlsafe_b64decode(data + "=" * (-len(data) % 4)).decode("utf-8", "replace")
            found["plain" if mt == "text/plain" else "html"] += txt
        for c in p.get("parts") or []:
            walk(c)
    walk(msg.get("payload") or {})
    t = found["plain"] or re.sub(r"<[^>]+>", " ", found["html"])
    return re.sub(r"[ \t\r\f\v]+", " ", t)


PHONE = re.compile(r"\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")


def lead_row(t: dict, body: str) -> dict:
    """A Luxury Presence lead email as a lead. Labeled fields win; otherwise the first phone and email in it."""
    r = thread_row(t)
    def field(*names):
        for n in names:
            m = re.search(rf"^\s*{n}\s*[:\-]\s*(.+)$", body, re.I | re.M)
            if m:
                return m.group(1).strip()
        return ""
    name = field("name", "full name") or re.sub(r"^.*?(new lead|home value request)\s*[:\-]?\s*", "", r["subject"], flags=re.I).strip()
    emails = [e for e in EMAIL.findall(body) if not re.search(r"luxurypresence|calebjackson\.org|noreply|no-reply", e, re.I)]
    phone = field("phone", "phone number") or next(iter(PHONE.findall(body)), "")
    return {**r, "name": name or "Website lead", "phone": phone, "email": field("email") or next(iter(emails), ""),
            "source": "Home value request" if re.search(r"home value", r["subject"] + body, re.I) else field("source", "type") or "Website lead",
            "area": field("city", "area", "location"),
            "address": field("address", "property address", "property", "home address"),
            "message": field("message", "comments", "comment", "notes", "question"),
            "fields": labeled(body),
            "test": bool(re.search(r"\btest\b", name + " " + r["subject"], re.I))}


SKIP_LABELS = re.compile(r"^(name|full name|first name|last name|phone|phone number|email|e-mail|unsubscribe|copyright|privacy)$", re.I)


def labeled(body: str) -> list[list[str]]:
    """Every 'Label: value' line in the lead email, in order, so the card shows whatever Luxury Presence sent.
    Name, phone and email have their own spots; links keep their address."""
    out, seen = [], set()
    for m in re.finditer(r"^\s*([A-Za-z][A-Za-z /&()'-]{1,30}?)\s*:\s*(\S.{0,240})$", body, re.M):
        k, v = m.group(1).strip(), m.group(2).strip()
        if SKIP_LABELS.match(k) or k.lower() in seen or v.lower().startswith(("http://", "https://")) and len(v) > 200:
            continue
        seen.add(k.lower())
        out.append([k, v])
    return out[:16]


MONEY = re.compile(r"\$\s?([\d,]+\.\d{2})")


def bank_row(t: dict) -> dict:
    r = thread_row(t)
    text = r["subject"] + " " + r["snippet"]
    kind = "Deposit" if re.search(r"deposit|direct dep|credit", text, re.I) else "Balance" if re.search(r"balance", text, re.I) else "Alert"
    amt = MONEY.search(text)
    return {**r, "type": kind, "amount": float(amt.group(1).replace(",", "")) if amt else None}


# ---------------- fetchers ----------------

def fetch_calendar(svc, cfg, now):
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    res = svc["calendar"].events().list(calendarId="primary", timeMin=start.isoformat(), timeMax=(start + timedelta(days=31)).isoformat(),
                                        singleEvents=True, orderBy="startTime", maxResults=250).execute()
    return calendar_rows(res.get("items") or [])


def _threads(svc, q, n, full=False):
    g = svc["gmail"].users()
    ids = [t["id"] for t in (g.threads().list(userId="me", q=q, maxResults=n).execute().get("threads") or [])]
    out = []
    for i in ids:
        if full:
            out.append(g.threads().get(userId="me", id=i, format="full").execute())
        else:
            out.append(g.threads().get(userId="me", id=i, format="metadata", metadataHeaders=["From", "Subject", "Date"]).execute())
    return out


def fetch_inbox(svc, cfg, now):
    return [thread_row(t) for t in _threads(svc, Q_INBOX, 50)]


def fetch_leads(svc, cfg, now):
    return [lead_row(t, body_text((t.get("messages") or [{}])[0])) for t in _threads(svc, Q_LEADS, 25, full=True)]


def fetch_commission(svc, cfg, now):
    return [thread_row(t) for t in _threads(svc, Q_COMMISSION, 25)]


def fetch_bank(svc, cfg, now):
    return [bank_row(t) for t in _threads(svc, Q_BANK, 25)]


def fetch_deals(svc, cfg, now):
    sid = cfg.get("deals_sheet_id")
    if not sid:
        raise RuntimeError("no deals_sheet_id in out/cc/config.json")
    return svc["sheets"].spreadsheets().values().get(spreadsheetId=sid, range="Deals!A1:L300").execute().get("values") or []


# ---------------- public reads: news and market (no account, read only) ----------------

UA = {"User-Agent": "Pipeline-AIRE/1.0 (personal dashboard)"}
NEWS_QUERIES = [  # (search, kind); config.json news_queries replaces this list
    ('"Baton Rouge" real estate', "local"), ('"St. Francisville" OR "West Feliciana"', "local"),
    ('Zachary OR "New Roads" OR Prairieville Louisiana homes', "local"), ("Louisiana housing market", "market"),
    ("mortgage rates", "rates"),
]
MARKET_AREAS = [  # (name, "zip" or "county", id); config.json market_areas replaces this list
    ("St. Francisville", "zip", "70775"), ("Zachary", "zip", "70791"), ("New Roads", "zip", "70760"),
    ("Prairieville", "zip", "70769"), ("East Baton Rouge Parish", "county", "22033"), ("West Feliciana Parish", "county", "22125"),
]
PER_QUERY = 8
RDC = "https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_{}.csv"
FRED = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US"


def http_get(url: str, timeout: int = TIMEOUT * 3) -> bytes:
    import urllib.request
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def news_rows(xml: bytes, kind: str) -> list[dict]:
    """Google News RSS items: headline, outlet, link, time. The outlet is cut off the end of the headline."""
    import xml.etree.ElementTree as ET
    from email.utils import parsedate_to_datetime
    out = []
    for it in ET.fromstring(xml).iter("item"):
        title, link = (it.findtext("title") or "").strip(), (it.findtext("link") or "").strip()
        src = (it.findtext("source") or "").strip()
        if src and title.endswith(" - " + src):
            title = title[: -len(src) - 3]
        try:
            when = parsedate_to_datetime(it.findtext("pubDate")).astimezone(cc.CENTRAL).isoformat(timespec="minutes")
        except (TypeError, ValueError):
            when = ""
        if title and link.startswith("https://"):
            out.append({"title": title, "url": link, "source": src, "date": when, "kind": kind})
    return out


def fetch_news(svc, cfg, now):
    import urllib.parse
    seen, rows = set(), []
    for q, kind in cfg.get("news_queries") or NEWS_QUERIES:
        url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": q + " when:7d", "hl": "en-US", "gl": "US", "ceid": "US:en"})
        for r in news_rows(http_get(url), kind)[:PER_QUERY]:  # each search gets a fair share of the list
            key = re.sub(r"\W+", " ", r["title"].lower()).strip()
            if key not in seen:
                seen.add(key)
                rows.append(r)
    return sorted(rows, key=lambda r: r["date"], reverse=True)[:40]


def rate_rows(csv_text: str) -> dict:
    vals = [l.split(",") for l in csv_text.strip().splitlines()[1:] if "," in l and l.split(",")[1] not in ("", ".")]
    (d0, v0), (d1, v1) = vals[-2], vals[-1]
    return {"rate": float(v1), "date": d1, "prior": float(v0), "prior_date": d0, "change": round(float(v1) - float(v0), 2)}


def area_rows(csv_text: str, level: str, areas: list) -> list[dict]:
    import csv, io
    key = "postal_code" if level == "zip" else "county_fips"
    want = {a[2]: a[0] for a in areas if a[1] == level}
    out = []
    for r in csv.DictReader(io.StringIO(csv_text)):
        if r.get(key) in want:
            f = lambda k: cc.num(r.get(k))
            out.append({"area": want[r[key]], "level": level, "id": r[key], "month": r.get("month_date_yyyymm"),
                        "active": f("active_listing_count"), "active_yy": f("active_listing_count_yy"),
                        "median_price": f("median_listing_price"), "median_price_yy": f("median_listing_price_yy"),
                        "dom": f("median_days_on_market"), "dom_yy": f("median_days_on_market_yy"),
                        "new": f("new_listing_count"), "flag": r.get("quality_flag") == "1"})
    return out


def gbrar_latest() -> dict | None:
    files = sorted((HERE.parent / "market-data").glob("gbrar-*.json"))
    if not files:
        return None
    d = json.loads(files[-1].read_text(encoding="utf-8"))
    return {k: d.get(k) for k in ("source", "source_url", "month", "pulled", "snapshot")}


def fetch_market(svc, cfg, now):
    """Each source on its own: one slow download leaves the others on screen with a warning. Fails only if all fail."""
    areas = cfg.get("market_areas") or MARKET_AREAS
    out, warn = {"rate": None, "areas": [], "gbrar": None, "warnings": []}, []
    try:
        out["rate"] = rate_rows(http_get(FRED).decode())
    except Exception as e:
        warn.append(f"rate: {type(e).__name__}: {str(e)[:100]}")
    for level, name in (("county", "County"), ("zip", "Zip")):
        if any(a[1] == level for a in areas):
            try:  # the ZIP file is about 7 MB, so it gets a longer wait
                out["areas"] += area_rows(http_get(RDC.format(name), timeout=180).decode("utf-8", "replace"), level, areas)
            except Exception as e:
                warn.append(f"Realtor.com {level}: {type(e).__name__}: {str(e)[:100]}")
    try:
        out["gbrar"] = gbrar_latest()
    except Exception as e:
        warn.append(f"GBRAR file: {type(e).__name__}")
    if not out["rate"] and not out["areas"] and not out["gbrar"]:
        raise RuntimeError("; ".join(warn) or "no market source answered")
    out["warnings"] = warn
    return out


# ---------------- Life and Workouts tabs in the AIRE CRM sheet ----------------
# Pipeline queues rows in out/cc/outbox.json; the sync appends them here, then reads the tabs back.
# Rows are only ever appended. Contacts, Deals, Tasks and every other engine tab are never touched.

LIFE_TABS = {"Life": ["kind", "name", "date", "every_days", "note"], "Life log": ["date", "item", "kind"]}
WORKOUT_TABS = {"Workouts": ["day", "focus", "exercises"], "Workout log": ["date", "focus", "minutes", "note"]}
STARTER_PLAN = [["Mon", "Upper push", "Bench, overhead press, dips, triceps"], ["Tue", "Lower", "Squat, Romanian deadlift, lunges, calves"],
                ["Wed", "Walk or rest", "30 minute walk"], ["Thu", "Upper pull", "Rows, pull-ups, face pulls, biceps"],
                ["Fri", "Lower and core", "Deadlift, leg press, planks"], ["Sat", "Optional full body", "Light full body or a long walk"],
                ["Sun", "Rest", ""]]


def _tab_rows(sh, sid, tab, cols):
    vals = sh.spreadsheets().values().get(spreadsheetId=sid, range=f"'{tab}'!A1:F2000").execute().get("values") or []
    return [{c: (r[i] if i < len(r) else "") for i, c in enumerate(cols)} for r in vals[1:] if any(str(x).strip() for x in r)]


def push_outbox(sh, sid, tabs: dict, folder: Path) -> int:
    box = read_doc("outbox", folder).get("rows") or []
    keep, n = [], 0
    for e in box:
        if e.get("tab") in tabs:
            sh.spreadsheets().values().append(spreadsheetId=sid, range=f"'{e['tab']}'!A1", valueInputOption="RAW",
                                              insertDataOption="INSERT_ROWS", body={"values": [[e["row"].get(c, "") for c in tabs[e["tab"]]]]}).execute()
            n += 1
        else:
            keep.append(e)
    if n:
        write_doc("outbox", {"rows": keep}, folder)
    return n


def _sheet_pair(svc, cfg, tabs, folder, starter=None):
    sid = cfg.get("crm_sheet_id")
    if not sid:
        raise RuntimeError("no crm_sheet_id in out/cc/config.json")
    sh = svc["sheets"]
    for tab, cols in tabs.items():
        meta = sh.spreadsheets().get(spreadsheetId=sid, fields="sheets.properties.title").execute()
        if not any(s["properties"]["title"] == tab for s in meta.get("sheets", [])):
            _ensure_tab(sh, sid, tab, cols)
            if starter and tab in starter:
                sh.spreadsheets().values().append(spreadsheetId=sid, range=f"'{tab}'!A1", valueInputOption="RAW",
                                                  insertDataOption="INSERT_ROWS", body={"values": starter[tab]}).execute()
    push_outbox(sh, sid, tabs, folder)
    return [_tab_rows(sh, sid, t, c) for t, c in tabs.items()]


def fetch_life(svc, cfg, now):
    items, log = _sheet_pair(svc, cfg, LIFE_TABS, cfg.get("_folder", OUT))
    return {"items": items, "log": log}


def fetch_workouts(svc, cfg, now):
    plan, log = _sheet_pair(svc, cfg, WORKOUT_TABS, cfg.get("_folder", OUT), starter={"Workouts": STARTER_PLAN})
    return {"plan": plan, "log": log}


FETCH = {"news": fetch_news, "market": fetch_market, "life": fetch_life, "workouts": fetch_workouts,
         "calendar": fetch_calendar, "inbox": fetch_inbox, "leads": fetch_leads, "deals": fetch_deals,
         "commission_mail": fetch_commission, "bank_mail": fetch_bank}


# ---------------- one pass ----------------

def due(name: str, prev: dict, now: datetime, force: bool) -> bool:
    if force or not prev:
        return True
    last = prev.get("tried_at") or prev.get("at")
    pace = READS[name][0] if not prev.get("error") else min(READS[name][0], 30)  # a failed read tries again within 30 minutes
    try:
        return now - datetime.fromisoformat(last) >= timedelta(minutes=pace)
    except (TypeError, ValueError):
        return True


def run_read(name: str, svc, cfg: dict, now: datetime, folder: Path = OUT) -> dict:
    """Read one source. On failure keep the last good rows and time, and record the error."""
    prev = read_doc(name, folder)
    stamp = now.isoformat(timespec="seconds")
    try:
        rows = FETCH[name](svc, cfg, now)
        doc = {"at": stamp, "tried_at": stamp, "source": READS[name][1], "error": None, "rows": rows}
        result = {"ok": True, "rows": len(rows)}
    except Exception as e:  # any failure is shown on screen, never hidden
        err = f"{type(e).__name__}: {str(e)[:160]}"
        doc = {**prev, "tried_at": stamp, "source": READS[name][1], "error": err, "rows": prev.get("rows") or []}
        doc.setdefault("at", None)
        result = {"ok": False, "error": err}
    write_doc(name, doc, folder)
    return result


GOALS_TAB, HISTORY_TAB = "Goals", "Scorecard history"
HISTORY_COLS = ["day", "gci", "pending", "closings", "leads7", "appts7"]


def _ensure_tab(sheets, sid: str, title: str, header: list) -> None:
    meta = sheets.spreadsheets().get(spreadsheetId=sid, fields="sheets.properties.title").execute()
    if any(s["properties"]["title"] == title for s in meta.get("sheets", [])):
        return
    sheets.spreadsheets().batchUpdate(spreadsheetId=sid, body={"requests": [{"addSheet": {"properties": {"title": title}}}]}).execute()
    sheets.spreadsheets().values().update(spreadsheetId=sid, range=f"'{title}'!A1", valueInputOption="RAW", body={"values": [header]}).execute()


def goals_from_rows(values: list) -> dict:
    raw = {}
    for r in values[1:]:
        if len(r) >= 2 and str(r[0]).strip() and str(r[1]).strip():
            k, v = str(r[0]).strip(), str(r[1]).strip()
            raw[k] = v if k in cc.GOAL_DATES else cc.num(v)
    return cc.clean_goals({k: v for k, v in raw.items() if v is not None})


def sync_goals(svc, cfg, now, folder: Path = OUT) -> dict:
    """A goal saved in Pipeline goes up to the Goals tab; otherwise the tab is read down. The sheet is the record."""
    sid = cfg.get("deals_sheet_id")
    sh = svc["sheets"]
    _ensure_tab(sh, sid, GOALS_TAB, ["goal", "value"])
    local = read_doc("goals", folder)
    stamp = now.isoformat(timespec="seconds")
    if local.get("sheet_pending"):
        g = cc.clean_goals(local.get("rows") or {})
        rows = [["goal", "value"]] + [[k, v] for k, v in g.items()]
        sh.spreadsheets().values().clear(spreadsheetId=sid, range=f"'{GOALS_TAB}'!A:B").execute()
        sh.spreadsheets().values().update(spreadsheetId=sid, range=f"'{GOALS_TAB}'!A1", valueInputOption="RAW", body={"values": rows}).execute()
        write_doc("goals", {"at": stamp, "source": "Goals tab, AIRE Deals sheet", "error": None, "rows": g}, folder)
        return {"ok": True, "pushed": len(g)}
    vals = sh.spreadsheets().values().get(spreadsheetId=sid, range=f"'{GOALS_TAB}'!A1:B40").execute().get("values") or []
    g = goals_from_rows(vals)
    write_doc("goals", {"at": stamp, "source": "Goals tab, AIRE Deals sheet", "error": None, "rows": g}, folder)
    return {"ok": True, "read": len(g)}


def sync_history(svc, cfg, now, folder: Path = OUT) -> dict:
    """After 6 AM Central, add today's Scorecard row to the tab once, then read the tab back for the charts."""
    sid = cfg.get("deals_sheet_id")
    sh = svc["sheets"]
    _ensure_tab(sh, sid, HISTORY_TAB, HISTORY_COLS)
    rng = f"'{HISTORY_TAB}'!A1:F800"
    vals = sh.spreadsheets().values().get(spreadsheetId=sid, range=rng).execute().get("values") or []
    days = {r[0] for r in vals[1:] if r}
    added = False
    today = now.astimezone(cc.CENTRAL)
    if today.hour >= HISTORY_HOUR and today.date().isoformat() not in days:
        row = cc.history_row(cc.build(folder, now)["scorecard"], today.date())
        sh.spreadsheets().values().append(spreadsheetId=sid, range=f"'{HISTORY_TAB}'!A1", valueInputOption="RAW",
                                          insertDataOption="INSERT_ROWS", body={"values": [[row[c] for c in HISTORY_COLS]]}).execute()
        vals.append([row[c] for c in HISTORY_COLS])
        added = True
    rows = [{c: (r[i] if i == 0 else cc.num(r[i]) or 0) for i, c in enumerate(HISTORY_COLS) if i < len(r)} for r in vals[1:] if r]
    write_doc("history", {"at": now.isoformat(timespec="seconds"), "source": "Scorecard history tab, AIRE Deals sheet", "error": None, "rows": rows}, folder)
    return {"ok": True, "rows": len(rows), "added": added}


def run_pass(now: datetime | None = None, force: bool = False, svc=None, folder: Path = OUT) -> dict:
    now = (now or datetime.now(cc.CENTRAL)).astimezone(cc.CENTRAL)
    cfg = {**config(folder), "_folder": folder}
    status = {"at": now.isoformat(timespec="seconds"), "results": {}, "error": None}
    try:
        svc = svc or services()
    except Exception as e:
        status["error"] = f"sign-in: {type(e).__name__}: {str(e)[:160]}"
        for name in READS:  # mark every Google read failed so the screen says why, keeping the last good rows
            if name in PUBLIC_READS:
                if due(name, read_doc(name, folder), now, force):
                    status["results"][name] = run_read(name, None, cfg, now, folder)
                continue
            prev = read_doc(name, folder)
            write_doc(name, {**prev, "source": READS[name][1], "error": status["error"], "rows": prev.get("rows") or [],
                             "at": prev.get("at"), "tried_at": status["at"]}, folder)
        write_doc("sync-status", status, folder)
        return status
    for name in READS:
        if due(name, read_doc(name, folder), now, force):
            status["results"][name] = run_read(name, svc, cfg, now, folder)
    for name, fn in (("goals", sync_goals), ("history", sync_history)):
        try:
            status["results"][name] = fn(svc, cfg, now, folder) if cfg.get("deals_sheet_id") else {"ok": False, "error": "no deals_sheet_id"}
        except Exception as e:
            status["results"][name] = {"ok": False, "error": f"{type(e).__name__}: {str(e)[:160]}"}
    write_doc("sync-status", status, folder)
    return status


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("cmd", nargs="?", choices=["auth"])
    ap.add_argument("--all", action="store_true", help="read everything now")
    ap.add_argument("--status", action="store_true", help="print the last pass")
    a = ap.parse_args(argv)
    if a.cmd == "auth":
        cmd_auth()
        return 0
    if a.status:
        print(json.dumps(read_doc("sync-status"), indent=1))
        return 0
    st = run_pass(force=a.all)
    bad = {k: v for k, v in st["results"].items() if not v.get("ok")}
    print(st["at"], "ok" if not st["error"] and not bad else "FAILED", st["error"] or "", json.dumps(st["results"]))
    return 1 if st["error"] or bad else 0


if __name__ == "__main__":
    sys.exit(main())
