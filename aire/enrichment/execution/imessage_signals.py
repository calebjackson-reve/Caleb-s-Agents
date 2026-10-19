#!/usr/bin/env python3
"""iMessage signals from the Mac's Messages database. One job: read chat.db, emit signals.json.
Read only. Copies the database to a temp file first so Messages is never locked.

  python3 imessage_signals.py [--db ~/Library/Messages/chat.db] [--out ../out/imessage-signals.json] [--days 365]

Output: {handle_key: {last_inbound, last_outbound, in_30, in_90, in_365, out_90, unanswered_days,
                      keyword_hits: {kw: n}, recent_inbound: [12 snippets], name_hints: [...]}}
Snippets stay on the Mac. The pipeline uses them only for the cheap-model tagging pass and never writes them to the sheet.
"""
from __future__ import annotations
import argparse
import json
import re
import shutil
import sqlite3
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from identity import handle_key  # noqa: E402

APPLE_EPOCH = datetime(2001, 1, 1, tzinfo=timezone.utc)
KEYWORDS = {
    "sell": r"\b(sell|selling|list(ing)?|what('s| is) (my|our) (house|home) worth|cma|value)\b",
    "buy": r"\b(buy|buying|looking at (houses|homes)|house hunt|showing|offer|pre[- ]?approv\w*)\b",
    "move": r"\b(moving|relocat|transfer|downsiz|upsiz|new job)\b",
    "rent": r"\b(rent|rental|lease|tenant|landlord)\b",
    "invest": r"\b(invest|flip|airbnb|duplex|rental property)\b",
    "deal": r"\b(inspection|appraisal|closing|under contract|title|lender|escrow|act of sale)\b",
    "referral": r"\b(my (friend|sister|brother|cousin|coworker|neighbor)|referr|knows? (someone|anybody)|looking for an agent)\b",
    "life": r"\b(engaged|married|wedding|baby|pregnant|retir|divorc|passed away|new job|promotion)\b",
}
NAME_HINT = re.compile(r"\b(?i:this is|it's|its|my name is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)")


def decode_body(text, blob) -> str:
    if text:
        return text
    if not blob:
        return ""
    # attributedBody is an NSKeyedArchiver stream. The visible string follows the NSString marker.
    try:
        i = blob.find(b"NSString")
        if i < 0:
            return ""
        j = blob.find(b"+", i)
        if j < 0:
            return ""
        j += 1
        length = blob[j]
        if length == 0x81:
            length = int.from_bytes(blob[j + 1:j + 3], "little")
            j += 3
        else:
            j += 1
        return blob[j:j + length].decode("utf-8", "ignore")
    except Exception:
        return ""


def apple_ts(v) -> datetime | None:
    if not v:
        return None
    v = int(v)
    if v > 10**11:  # nanoseconds since 2001
        v //= 10**9
    return APPLE_EPOCH + timedelta(seconds=v)


def read_messages(db: Path, days: int) -> list[tuple[str, datetime, bool, str]]:
    tmp = Path(tempfile.mkdtemp()) / "chat.db"
    shutil.copy2(db, tmp)
    for extra in ("chat.db-wal", "chat.db-shm"):
        src = db.parent / extra
        if src.exists():
            shutil.copy2(src, tmp.parent / extra)
    con = sqlite3.connect(f"file:{tmp}?mode=ro", uri=True)
    since = int((datetime.now(timezone.utc) - timedelta(days=days) - APPLE_EPOCH).total_seconds()) * 10**9
    q = """select h.id, m.date, m.is_from_me, m.text, m.attributedBody
           from message m join handle h on h.ROWID = m.handle_id
           where m.date >= ? order by m.date"""
    out = []
    for hid, d, from_me, text, blob in con.execute(q, (since,)):
        body = decode_body(text, blob)
        ts = apple_ts(d)
        if ts:
            out.append((hid, ts, bool(from_me), body))
    con.close()
    return out


def build_signals(messages: list[tuple[str, datetime, bool, str]], now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    sig: dict[str, dict] = {}
    for hid, ts, from_me, body in messages:
        k = handle_key(hid)
        if not k:
            continue
        s = sig.setdefault(k, {"last_inbound": "", "last_outbound": "", "in_30": 0, "in_90": 0, "in_365": 0, "out_90": 0,
                               "keyword_hits": {}, "recent_inbound": [], "name_hints": []})
        age = (now - ts).days
        iso = ts.astimezone().strftime("%Y-%m-%d")
        if from_me:
            if age <= 90:
                s["out_90"] += 1
            s["last_outbound"] = max(s["last_outbound"], iso)
        else:
            s["last_inbound"] = max(s["last_inbound"], iso)
            if age <= 30: s["in_30"] += 1
            if age <= 90: s["in_90"] += 1
            if age <= 365: s["in_365"] += 1
            low = body.lower()
            for kw, pat in KEYWORDS.items():
                if re.search(pat, low):
                    s["keyword_hits"][kw] = s["keyword_hits"].get(kw, 0) + 1
            if body.strip():
                s["recent_inbound"].append(f"{iso}: {body.strip()[:160]}")
                s["recent_inbound"] = s["recent_inbound"][-12:]
            for m in NAME_HINT.finditer(body):
                if m.group(1) not in s["name_hints"]:
                    s["name_hints"].append(m.group(1))
    for s in sig.values():
        li, lo = s["last_inbound"], s["last_outbound"]
        s["unanswered_days"] = (now.date() - datetime.strptime(li, "%Y-%m-%d").date()).days if li and li > lo else 0
    return sig


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(Path.home() / "Library" / "Messages" / "chat.db"))
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "out" / "imessage-signals.json"))
    ap.add_argument("--days", type=int, default=365)
    a = ap.parse_args()
    db = Path(a.db).expanduser()
    if not db.exists():
        sys.exit(f"{db} not found. On the Mac, give Terminal Full Disk Access (System Settings, Privacy) first.")
    msgs = read_messages(db, a.days)
    sig = build_signals(msgs)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(sig, indent=1, ensure_ascii=False))
    print(f"{len(msgs)} messages, {len(sig)} handles -> {a.out}")


if __name__ == "__main__":
    main()
