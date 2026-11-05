#!/usr/bin/env python3
"""Move Luxury Presence lead events from the Cloudflare buffer into the Website leads sheet.

Luxury Presence posts every lead event to aire-hooks (Cloudflare worker), which holds it 14 days.
This script pulls, checks each x-lp-signature on the Mac, writes lead events to the first tab of
the Website leads sheet (the tab crm.py website-leads imports) and everything else to LP activity,
then acks only what it wrote. Instagram events in the same buffer are left alone.
No model calls, no tokens. Secrets come from Keychain by name and are never printed.

  python3 pull.py            # dry run: pulls and counts, writes nothing, acks nothing
  python3 pull.py --write    # the real run (pull_hourly.sh does this)
  python3 pull.py --test     # offline checks with made-up leads
"""
import hashlib
import hmac
import json
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

LEAD_EVENTS = {"SIGNUP", "CONTACT_INQUIRY", "HOME_VALUE", "SCHEDULE_SHOWING", "REQUEST_INFO"}
HEADER = ["at", "kind", "name", "phone", "email", "address", "area", "max", "when", "slot",
          "message", "consent", "page", "ip", "lp_key"]
ACTIVITY_TAB = "LP activity"
REPLAY_MS = 300 * 1000
QUARANTINE = Path.home() / ".aire" / "lp-quarantine.jsonl"  # stays on the Mac


def keychain(service, account):
    r = subprocess.run(["security", "find-generic-password", "-s", service, "-a", account, "-w"],
                       capture_output=True, text=True)
    return r.stdout.strip() or None


def call(method, url, token, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json",
        "User-Agent": "aire-lp-pull/1"})  # Cloudflare 403s the default Python-urllib agent
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def verified(item, secret, url):
    h = {k.lower(): str(v) for k, v in (item.get("headers") or {}).items()}
    sig, ts = h.get("x-lp-signature"), h.get("x-lp-timestamp", "")
    if h.get("x-lp-signature-version") != "v1" or not sig or not ts.isdigit() or not secret:
        return False
    got = datetime.fromisoformat(item["receivedAt"].replace("Z", "+00:00")).timestamp() * 1000
    if abs(got - int(ts)) > REPLAY_MS:
        return False
    want = hmac.new(secret.encode(), (ts + url).encode() + item["body"].encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, want)


def map_lead(d):
    """Same row the Apps Script receiver would have written (website-rebuild/functions/lp-webhook.gs)."""
    key = "|".join(str(d.get(k) or "") for k in ("leadId", "activityType", "activityAt"))
    name = " ".join(x for x in (d.get("leadFirstName"), d.get("leadLastName")) if x).strip()
    addr = ", ".join(str(x) for x in (d.get("activityListingAddress"), d.get("activityListingCity"),
                                      d.get("activityListingState"), d.get("activityListingZip")) if x)
    cf = d.get("formCustomFields")
    custom = "; ".join(f"{k}={v}" for k, v in cf.items()) if isinstance(cf, dict) else ""
    tags = d.get("leadTags")
    parts = [("source", d.get("leadSource")), ("origin", d.get("leadOrigin")), ("type", d.get("leadType")),
             ("tags", ", ".join(tags) if isinstance(tags, list) else tags), ("form", custom)]
    msg = "\n".join([f"{k}: {v}" for k, v in parts if v] + ["new lead" if d.get("isNewLead") else "existing lead"])
    row = {"at": d.get("activityAt") or datetime.now(timezone.utc).isoformat(),
           "kind": "lp " + str(d.get("activityType") or "").lower().replace("_", " "),
           "name": name, "phone": "".join(c for c in str(d.get("leadPhoneNumber") or "") if c.isdigit() or c == "+"),
           "email": str(d.get("leadEmail") or "").strip(), "address": addr, "area": d.get("activityListingCity") or "",
           "max": str(d.get("activityListingPrice") or ""), "when": "", "slot": "", "message": msg,
           "consent": "no", "page": d.get("activitySourceUrl") or "", "ip": "", "lp_key": key}
    return {k: str(v or "")[: 2000 if k == "message" else 200] for k, v in row.items()}


def is_lead(d):
    return str(d.get("activityType") or "").upper() in LEAD_EVENTS or d.get("isNewLead") is True


def process(items, sheet, secret, base, write):
    """Returns (ack_keys, counts). A key is acked only after its row is written or found already there."""
    c = {"pulled": len(items), "lp": 0, "leads": 0, "activity": 0, "dup": 0, "quarantined": 0}
    acks = []
    for it in items:
        if it.get("path") != "/webhooks/lp":
            continue  # Instagram and anything else stays in the buffer for its own reader
        c["lp"] += 1
        try:
            p = json.loads(it["body"])
            d = p.get("data") if isinstance(p, dict) and p.get("eventName") == "leads" else None
        except ValueError:
            d = None
        if not isinstance(d, dict) or not d.get("leadId") or not verified(it, secret, base + it["path"]):
            c["quarantined"] += 1
            if write:
                with QUARANTINE.open("a") as f:
                    f.write(json.dumps({"key": it["key"], "receivedAt": it.get("receivedAt"), "item": it}) + "\n")
                acks.append(it["key"])
            continue
        tab = None if is_lead(d) else ACTIVITY_TAB
        row = map_lead(d)
        if sheet.seen(tab, row["lp_key"]):
            c["dup"] += 1
        elif write:
            sheet.append(tab, row)
            c["leads" if tab is None else "activity"] += 1
        else:
            c["leads" if tab is None else "activity"] += 1
            continue
        if write:
            acks.append(it["key"])
    return acks, c


class Sheet:
    """Website leads spreadsheet. tab None = first tab (crm.py website-leads reads it)."""

    def __init__(self):
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "crm"))
        from crm import LEADS_SHEET_ID, SCOPES, TOKEN
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        self.id = LEADS_SHEET_ID
        self.v = build("sheets", "v4", credentials=Credentials.from_authorized_user_file(str(TOKEN), SCOPES),
                       cache_discovery=False).spreadsheets()
        titles = [s["properties"]["title"] for s in self.v.get(spreadsheetId=self.id).execute()["sheets"]]
        self.first, self.cache = titles[0], {}
        if ACTIVITY_TAB not in titles:
            self.v.batchUpdate(spreadsheetId=self.id, body={"requests": [
                {"addSheet": {"properties": {"title": ACTIVITY_TAB}}}]}).execute()

    def _load(self, tab):
        t = tab or self.first
        if t not in self.cache:
            vals = self.v.values().get(spreadsheetId=self.id, range=f"'{t}'!A1:Z").execute().get("values", [])
            header = vals[0] if vals else []
            if not header:
                header = list(HEADER)
                self._put(t, "A1", [header])
            elif "lp_key" not in header:
                header = header + ["lp_key"]
                self._put(t, "A1", [header])
            i = header.index("lp_key")
            self.cache[t] = (header, {r[i] for r in vals[1:] if len(r) > i})
        return t, *self.cache[t]

    def _put(self, t, a1, values):
        self.v.values().update(spreadsheetId=self.id, range=f"'{t}'!{a1}", valueInputOption="RAW",
                               body={"values": values}).execute()

    def seen(self, tab, key):
        return key in self._load(tab)[2]

    def append(self, tab, row):
        t, header, keys = self._load(tab)
        self.v.values().append(spreadsheetId=self.id, range=f"'{t}'!A1", valueInputOption="RAW",
                               insertDataOption="INSERT_ROWS", body={"values": [[row.get(h, "") for h in header]]}).execute()
        keys.add(row["lp_key"])


def main():
    if "--test" in sys.argv:
        return test()
    write = "--write" in sys.argv
    base = (keychain("com.caleb.aire.hooks", "base-url") or "").rstrip("/")
    token = keychain("com.caleb.aire.hooks", "pull-token")
    secret = keychain("com.caleb.aire.lp", "webhook-secret")
    if not (base and token):
        sys.exit("hooks base-url or pull-token missing from Keychain (com.caleb.aire.hooks). Nothing pulled.")
    items = call("GET", base + "/pull", token).get("events", [])
    lp = [i for i in items if i.get("path") == "/webhooks/lp"]
    acks, c = process(items, Sheet() if lp else None, secret, base, write)
    if acks:
        done = call("POST", base + "/ack", token, {"keys": acks})
        if done.get("deleted") != len(acks):
            sys.exit(f"ack mismatch: sent {len(acks)}, worker deleted {done.get('deleted')}")
    c["acked"] = len(acks)
    print(("" if write else "dry run: ") + json.dumps(c))


def test():
    ok = True

    def check(name, cond):
        nonlocal ok
        ok &= bool(cond)
        print(("ok   " if cond else "FAIL ") + name)

    class Fake:
        def __init__(self):
            self.rows = {None: [], ACTIVITY_TAB: []}

        def seen(self, tab, key):
            return any(r["lp_key"] == key for r in self.rows[tab])

        def append(self, tab, row):
            self.rows[tab].append(row)

    base, secret = "https://hooks.example.com", "test-secret"

    def event(key, data, sign_with=secret, skew=0, path="/webhooks/lp"):
        body = json.dumps({"eventName": "leads", "data": data}, separators=(",", ":"))
        ts = "1762300000000"
        sig = hmac.new(sign_with.encode(), (ts + base + path + body).encode(), hashlib.sha256).hexdigest()
        at = datetime.fromtimestamp((int(ts) + skew) / 1000, timezone.utc).isoformat()
        return {"key": key, "path": path, "body": body, "receivedAt": at,
                "headers": {"x-lp-signature": sig, "x-lp-timestamp": ts, "x-lp-signature-version": "v1"}}

    lead = {"leadId": "t1", "activityType": "CONTACT_INQUIRY", "activityAt": "2026-11-04T15:00:00Z",
            "leadFirstName": "Test", "leadLastName": "Person", "leadEmail": "test@example.com",
            "leadPhoneNumber": "(225) 555-0100", "leadTags": ["test"], "isNewLead": True}
    search = dict(lead, leadId="t2", activityType="HOME_SEARCH", isNewLead=False)
    items = [event("evt:1", lead), event("evt:2", search), event("evt:3", dict(lead, leadId="t3"), sign_with="wrong"),
             event("evt:4", dict(lead, leadId="t4"), skew=600000), {"key": "evt:5", "path": "/webhooks/instagram", "body": "{}"}]
    QUARANTINE_BAK = globals()["QUARANTINE"]
    globals()["QUARANTINE"] = Path("/dev/null")
    s = Fake()
    acks, c = process(items, Fake(), secret, base, write=False)
    check("dry run acks nothing", acks == [] and c["leads"] == 1 and c["activity"] == 1)
    acks, c = process(items, s, secret, base, write=True)
    check("lead event goes to the first tab", len(s.rows[None]) == 1 and s.rows[None][0]["kind"] == "lp contact inquiry")
    check("search goes to LP activity", len(s.rows[ACTIVITY_TAB]) == 1)
    check("bad signature and stale timestamp are quarantined", c["quarantined"] == 2)
    check("instagram is never acked", "evt:5" not in acks and acks.count("evt:1") == 1)
    check("phone keeps digits only", s.rows[None][0]["phone"] == "2255550100")
    check("lp_key is leadId|activityType|activityAt", s.rows[None][0]["lp_key"] == "t1|CONTACT_INQUIRY|2026-11-04T15:00:00Z")
    acks2, c2 = process(items[:1], s, secret, base, write=True)
    check("a replayed event is a dup, still acked, not written twice", c2["dup"] == 1 and acks2 == ["evt:1"] and len(s.rows[None]) == 1)
    check("consent is never assumed", s.rows[None][0]["consent"] == "no")
    globals()["QUARANTINE"] = QUARANTINE_BAK
    print("all checks passed" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main() or 0)
