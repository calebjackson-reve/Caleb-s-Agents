"""Push alerts for Pipeline on the iPhone (Web Push, free, through Apple's push service).

Alerts: a new website lead, a contract deadline within 24 hours, a sync read that just failed. Each fires once.
The push itself is empty; the installed Pipeline icon wakes, fetches /api/alerts behind the login and shows the
newest one. Lock-screen text never carries a client's name. Keys: pipeline-push.json in the AIRE key folder
(PIPELINE_PUSH_FILE overrides). Phones: out/push-subs.json. Alerts: out/cc/alerts.json. All git-ignored or outside
the repo.
"""
from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

import vapid

HERE = Path(__file__).resolve().parent
KEY_FILE = Path(os.getenv("PIPELINE_PUSH_FILE") or Path.home() / ".aire" / "pipeline-push.json")
SUBS = HERE / "out" / "push-subs.json"
ALERTS = HERE / "out" / "cc" / "alerts.json"
PUSH_HOSTS = (".push.apple.com", ".googleapis.com", ".mozilla.com", ".notify.windows.com")


def _read(p: Path, default):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _write(p: Path, data) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=1), encoding="utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(p)


def keys(path: Path = KEY_FILE) -> dict:
    """The VAPID key pair, made once on first use."""
    k = _read(path, None)
    if not k:
        k = vapid.new_keys()
        _write(path, k)
    return k


def subscribe(sub: dict, path: Path = SUBS) -> int:
    ep = str((sub or {}).get("endpoint", ""))
    host = urllib.parse.urlparse(ep).hostname or ""
    if not ep.startswith("https://") or not host.endswith(PUSH_HOSTS):
        raise ValueError("not a push service address")
    subs = [s for s in _read(path, []) if s.get("endpoint") != ep] + [{"endpoint": ep, "added": time.strftime("%Y-%m-%d")}]
    _write(path, subs)
    return len(subs)


# ---------------- which alerts ----------------

def new_alerts(payload: dict, state: dict, now: datetime) -> tuple[list[dict], dict]:
    """Alerts not sent before, and the remembered state. Pure: the payload is cc.build()'s."""
    seen = {k: set(v) for k, v in (state.get("seen") or {}).items()}
    out = []
    for r in payload.get("leads") or []:
        if r.get("test") or not r.get("threadId"):
            continue
        key = r["threadId"]
        if key not in seen.setdefault("leads", set()):
            seen["leads"].add(key)
            if state.get("primed"):  # the first run only learns what is already there
                out.append({"kind": "lead", "title": "New website lead", "body": " · ".join(x for x in (r.get("source"), r.get("area")) if x) or "Open Leads", "page": "ccleads"})
    soon = (now + timedelta(hours=24)).date().isoformat()
    for d in (payload.get("deadlines") or {}).get("all") or []:
        what = " and ".join(d.get("whats") or []) or d.get("what") or "Deadline"  # a step name, never the client
        key = f"{d.get('day')}|{d.get('key')}|{what}"
        if now.date().isoformat() <= d.get("day", "9") <= soon and key not in seen.setdefault("deadlines", set()):
            seen["deadlines"].add(key)
            when = "today" if d["day"] == now.date().isoformat() else "tomorrow"
            at = f" at {d['time']}" if d.get("time") else ""
            two = ". The calendar and the Deals sheet disagree on the day" if d.get("disagree") else ""
            out.append({"kind": "deadline", "title": f"{what} {when}{at}", "body": f"A contract deadline is due {when}{at}{two}", "page": "deadlines"})
    failed = {p["name"] for p in payload.get("problems") or [] if p.get("state") == "failed"}
    for name in sorted(failed - set(state.get("failed") or [])):
        out.append({"kind": "sync", "title": "A read failed", "body": f"{name} did not update. Open Sources.", "page": "sources"})
    stamp = now.isoformat(timespec="seconds")
    for a in out:
        a["at"] = stamp
    return out, {"seen": {k: sorted(v)[-500:] for k, v in seen.items()}, "failed": sorted(failed), "primed": True}


# ---------------- sending ----------------

def send_one(endpoint: str, k: dict, opener=urllib.request.urlopen) -> int:
    u = urllib.parse.urlparse(endpoint)
    token = vapid.jwt(k["private"], f"{u.scheme}://{u.netloc}")
    rq = urllib.request.Request(endpoint, data=b"", method="POST", headers={
        "TTL": "86400", "Urgency": "high", "Content-Length": "0", "Authorization": f"vapid t={token}, k={k['public']}"})
    try:
        with opener(rq, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def run(payload: dict, now: datetime, folder: Path, subs_path: Path = SUBS, key_path: Path = KEY_FILE, opener=urllib.request.urlopen) -> dict:
    """Called at the end of each sync pass. Writes alerts.json, then wakes every subscribed phone once."""
    doc = _read(folder / "alerts.json", {"rows": [], "state": {}})
    fresh, state = new_alerts(payload, doc.get("state") or {}, now)
    rows = (fresh + doc.get("rows", []))[:50]
    _write(folder / "alerts.json", {"at": now.isoformat(timespec="seconds"), "source": "Pipeline alerts", "rows": rows, "state": state})
    sent, gone = 0, []
    subs = _read(subs_path, [])
    if fresh and subs:
        k = keys(key_path)
        for s in subs:
            code = send_one(s["endpoint"], k, opener)
            if code in (404, 410):
                gone.append(s["endpoint"])
            elif 200 <= code < 300:
                sent += 1
        if gone:
            _write(subs_path, [s for s in subs if s["endpoint"] not in gone])
    return {"ok": True, "new": len(fresh), "sent": sent, "removed": len(gone)}
