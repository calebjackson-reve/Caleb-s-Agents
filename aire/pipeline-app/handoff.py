"""Hand-off log: the Text and Email buttons open Messages or Gmail and Caleb presses send there, so Pipeline has
to find out on its own that the message went. A click is logged as "opened". For 15 minutes after, once a minute,
the Mac's own Messages history (texts) or Gmail's Sent folder (emails) is read for the real send. Whatever is still
open after 2 minutes is asked about in the app. Nothing here sends, and nothing here writes outside the send log.

chat.db is opened read only AND immutable: no lock, no -shm or -wal file touched, no copy (the Nov 8 disk leak).
The price of immutable is that a message still sitting in Messages' write-ahead file is not visible yet, so a
confirm can lag behind the send. The 15 minute window and the "Did that send?" prompt cover that."""
import base64
import difflib
import json
import re
import sqlite3
import uuid
from datetime import date, datetime
from pathlib import Path

APPLE_EPOCH = 978307200   # chat.db dates are nanoseconds since 2001-01-01
WINDOW = 15 * 60          # seconds an opened message is looked for
ASK_AFTER = 2 * 60        # seconds before the app asks "Did that send?"
SLACK = 2                 # seconds of clock slack around the click


class Unreadable(Exception):
    """Messages history could not be opened: Pipeline's Python has no Full Disk Access, or this is not a Mac."""


def digits10(v) -> str:
    d = re.sub(r"\D", "", str(v or ""))
    return d[-10:] if len(d) >= 10 else ""


def norm(s) -> str:
    s = str(s or "").translate({0x2018: "'", 0x2019: "'", 0x201C: '"', 0x201D: '"'})
    return re.sub(r"\s+", " ", s).strip().lower()


def same_words(draft, sent, floor: float = 0.7) -> bool:
    """The sent words are the draft, start with it, or are a light edit of it. An empty draft matches anything:
    a reply Caleb wrote in Messages himself still counts."""
    d, s = norm(draft), norm(sent)
    if not d:
        return True
    if not s:
        return False
    if s == d or s.startswith(d) or (len(s) >= 12 and d.startswith(s)):
        return True
    return difflib.SequenceMatcher(None, d, s).ratio() >= floor


def same_subject(draft, sent) -> bool:
    strip = lambda v: re.sub(r"^((re|fwd?):\s*)+", "", norm(v))
    return same_words(strip(draft), strip(sent), 0.8)


def body_text(text, blob) -> str:
    """A message's words. Newer macOS leaves `text` empty and keeps them in attributedBody (a typedstream):
    ... NSString 01 94 84 01 '+' <length> <utf-8>. Length is one byte, or 0x81 and two bytes."""
    if text:
        return text
    b = bytes(blob or b"")
    i = b.find(b"NSString")
    j = b.find(b"+", i) if i >= 0 else -1
    if j < 0 or j + 2 > len(b):
        return ""
    n, start = b[j + 1], j + 2
    if n == 0x81:
        n, start = int.from_bytes(b[j + 2:j + 4], "little"), j + 4
    return b[start:start + n].decode("utf-8", "replace")


def iso(ts: float) -> str:
    return datetime.fromtimestamp(ts).astimezone().isoformat(timespec="seconds")


def find_sent_text(phone, since: float, draft, db: Path, skip=()) -> dict | None:
    """The first message Caleb sent to this number after `since` (unix seconds) whose words match the draft.
    One tiny query: rows after the click only, 20 at most."""
    d = digits10(phone)
    if not d:
        return None
    try:
        con = sqlite3.connect(f"file:{db}?mode=ro&immutable=1", uri=True, timeout=2)
        try:
            rows = con.execute(
                "SELECT m.guid, m.text, m.attributedBody, m.date, m.service FROM message m JOIN handle h ON m.handle_id = h.ROWID "
                "WHERE m.is_from_me = 1 AND m.date >= ? AND h.id LIKE ? ORDER BY m.date LIMIT 20",
                (int((since - SLACK - APPLE_EPOCH) * 1e9), "%" + d)).fetchall()
        finally:
            con.close()
    except sqlite3.Error as e:
        raise Unreadable(str(e))
    for guid, text, blob, when, service in rows:
        words = body_text(text, blob)
        if guid in skip or not same_words(draft, words):
            continue
        return {"sent_at": iso(when / 1e9 + APPLE_EPOCH), "service": service or "iMessage", "msg_id": guid, "sent_text": words}
    return None


def find_sent_email(gmail, to, since: float, subject, skip=()) -> dict | None:
    """The first message in Gmail's Sent folder to this address after `since` with a matching subject. Read only."""
    res = gmail.users().messages().list(userId="me", q=f"in:sent to:{to} after:{int(since) - 60}", maxResults=10).execute()
    for m in reversed(res.get("messages") or []):
        if m["id"] in skip:
            continue
        full = gmail.users().messages().get(userId="me", id=m["id"], format="full").execute()
        ts = int(full.get("internalDate") or 0) / 1000
        subj = next((h.get("value", "") for h in (full.get("payload") or {}).get("headers", []) if h.get("name", "").lower() == "subject"), "")
        if ts >= since - SLACK and same_subject(subject, subj):
            return {"sent_at": iso(ts), "service": "Gmail", "msg_id": m["id"], "sent_text": mail_text(full.get("payload") or {})}
    return None


def mail_text(payload: dict) -> str:
    """The plain-text body of a Gmail message Caleb sent, quoted history cut off."""
    parts, stack = [], [payload]
    while stack:
        p = stack.pop(0)
        stack.extend(p.get("parts") or [])
        if p.get("mimeType", "text/plain") == "text/plain" and (p.get("body") or {}).get("data"):
            parts.append(base64.urlsafe_b64decode(p["body"]["data"] + "==").decode("utf-8", "replace"))
    return re.split(r"\n>|\nOn .{10,80} wrote:", "\n".join(parts))[0].replace("\r", "").strip()


def is_open(e: dict) -> bool:
    return e.get("via") == "handoff" and e.get("status") == "opened"


def age(e: dict, now_ts: float) -> float:
    try:
        return now_ts - datetime.fromisoformat(e["at"]).timestamp()
    except (KeyError, ValueError, TypeError):
        return 1e12


def open_entry(log: list, now_iso: str, kind: str, person_id: str, display: str, to: str, text: str, subject: str = "",
               draft: str = "", pool: str = "") -> tuple[dict, bool]:
    """Log a click as "opened". The same message opened again while the first is still open is one line, not two."""
    now_ts = datetime.fromisoformat(now_iso).timestamp()
    for e in log:
        if is_open(e) and e.get("kind") == kind and e.get("to") == to and norm(e.get("text")) == norm(text) and age(e, now_ts) < WINDOW:
            return e, False
    e = {"id": uuid.uuid4().hex[:12], "at": now_iso, "kind": kind, "person_id": person_id, "display": display, "to": to,
         "channel": "iMessage/SMS" if kind == "text" else "email", "subject": subject, "chars": len(text), "text": text,
         "draft": draft, "pool": pool,  # what Pipeline wrote, before Caleb touched it, and which template pool it came from
         "status": "opened", "delivery": "opened", "via": "handoff", "detail": "Opened from Pipeline, waiting for the send"}
    log.append(e)
    return e, True


def mark_sent(e: dict, hit: dict, by: str) -> None:
    e.update(status="sent", delivery="sent", confirmed_by=by, sent_at=hit["sent_at"], service=hit.get("service", ""),
             msg_id=hit.get("msg_id", ""), detail=f"Sent by you, confirmed by {by}")
    if hit.get("sent_text") and norm(hit["sent_text"]) != norm(e.get("text")):
        e["sent_text"] = hit["sent_text"]


def check(log: list, now_ts: float, db: Path | None, gmail=None) -> dict:
    """One pass over the open lines still inside the 15 minute window. Changes `log` in place.
    Returns {"changed": n, "messages_ok": True/False/None, "gmail_ok": True/False/None, "detail": str}."""
    out = {"changed": 0, "ids": [], "messages_ok": None, "gmail_ok": None, "detail": ""}
    used = {e.get("msg_id") for e in log if e.get("msg_id")}
    for e in log:
        if not is_open(e) or age(e, now_ts) > WINDOW + 60:
            continue
        since, hit = datetime.fromisoformat(e["at"]).timestamp(), None
        try:
            if e["kind"] == "text" and db is not None:
                hit, out["messages_ok"] = find_sent_text(e["to"], since, e.get("text"), db, used), True
            elif e["kind"] == "email" and gmail is not None:
                hit, out["gmail_ok"] = find_sent_email(gmail, e["to"], since, e.get("subject"), used), True
        except Unreadable as x:
            out["messages_ok"], out["detail"] = False, str(x)[:160]
        except Exception as x:  # Gmail offline or signed out, or an odd row: the prompt in the app covers it
            out["gmail_ok" if e["kind"] == "email" else "messages_ok"], out["detail"] = False, f"{type(x).__name__}: {x}"[:160]
        if hit:
            mark_sent(e, hit, "Messages" if e["kind"] == "text" else "Gmail")
            used.add(hit.get("msg_id"))
            out["changed"] += 1
            out["ids"].append(e["id"])
    return out


def answer(log: list, entry_id: str, sent: bool, now_iso: str) -> dict | None:
    """Caleb's own answer to "Did that send?". Sent marks it sent by him. Not sent takes the line out."""
    for i, e in enumerate(log):
        if e.get("id") == entry_id and is_open(e):
            if sent:
                mark_sent(e, {"sent_at": now_iso}, "you")
            else:
                del log[i]
            return e
    return None


def record_pair(folder: Path, e: dict) -> dict:
    """A confirmed send, kept on this Mac only (out/ is git-ignored): Pipeline's draft and Caleb's real wording side
    by side in pairs.jsonl. When he rewrote a draft, the pair also joins style-examples.jsonl, the running list of
    how he really says it. Wording is "real" when Messages or Gmail gave the sent words, "as opened" when only his
    own Sent answer confirmed it, so the words are what was in the box at the click."""
    real = bool(e.get("sent_text")) or e.get("confirmed_by") in ("Messages", "Gmail")
    sent, draft = e.get("sent_text") or e.get("text") or "", e.get("draft") or ""
    row = {"sent_at": e.get("sent_at", ""), "kind": e.get("kind", ""), "person_id": e.get("person_id", ""), "pool": e.get("pool", ""),
           "confirmed_by": e.get("confirmed_by", ""), "wording": "real" if real else "as opened",
           "draft": draft, "opened": e.get("text") or "", "sent": sent, "rewritten": bool(draft and sent and norm(draft) != norm(sent))}
    folder.mkdir(parents=True, exist_ok=True)
    with open(folder / "pairs.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    if row["rewritten"]:
        with open(folder / "style-examples.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps({k: row[k] for k in ("sent_at", "kind", "pool", "wording", "draft", "sent")}, ensure_ascii=False) + "\n")
    return row


def pending(log: list, now_ts: float) -> list[dict]:
    """Open lines old enough to ask about (2 minutes) and not older than a day."""
    return [{k: e.get(k, "") for k in ("id", "at", "kind", "person_id", "display", "to")}
            for e in log if is_open(e) and ASK_AFTER <= age(e, now_ts) < 86400]


def probe(db: Path) -> tuple[bool, str]:
    """Can Messages history be read at all? One row, read only."""
    try:
        con = sqlite3.connect(f"file:{db}?mode=ro&immutable=1", uri=True, timeout=2)
        try:
            con.execute("SELECT 1 FROM message LIMIT 1").fetchone()
        finally:
            con.close()
        return True, ""
    except sqlite3.Error as e:
        return False, str(e)[:160]


def apply_touches(feed: dict, text_q: dict, email_q: dict, log: list, today_iso: str) -> tuple[dict, dict, dict, set]:
    """A confirmed send is a touch, in Pipeline's own view only (the CRM sheet is not written). The person leaves
    Touches due and the draft lists until their band's cadence comes round again, and their last touch moves to
    the send date. Someone who wrote back after the send stays: a feed built after the send that still says they
    owe a reply is believed. Returns new copies and the ids taken out."""
    sent = {}
    for e in log:
        if e.get("via") == "handoff" and e.get("status") == "sent" and e.get("person_id") and e.get("sent_at"):
            sent[e["person_id"]] = max(sent.get(e["person_id"], ""), e["sent_at"])
    if not sent:
        return feed, text_q, email_q, set()
    moved = [p for p in feed.get("people", []) if p.get("person_id") in sent and (p.get("last_touch") or "")[:10] < sent[p["person_id"]][:10]]
    if moved:  # the last touch moves to the send date, whether or not the person was due
        ids = {p["person_id"] for p in moved}
        feed = {**feed, "people": [{**p, "last_touch": sent[p["person_id"]][:10]} if p.get("person_id") in ids else p for p in feed["people"]]}
    if not feed.get("touches_due"):
        return feed, text_q, email_q, set()
    cadence, built, day = feed.get("cadence_days") or {}, feed.get("generated_at", ""), date.fromisoformat(today_iso)

    def covered(r: dict) -> bool:
        at = sent.get(r.get("person_id"))
        if not at:
            return False
        if r.get("owes_reply"):
            inbound = (r.get("last_inbound") or "")[:10]
            return inbound < at[:10] or (inbound == at[:10] and built < at)
        return (day - date.fromisoformat(at[:10])).days < cadence.get(r.get("band"), 7)

    gone = {r["person_id"] for r in feed["touches_due"] if covered(r)}
    if not gone:
        return feed, text_q, email_q, gone
    due = [r for r in feed["touches_due"] if r["person_id"] not in gone]
    out = [r for r in feed["touches_due"] if r["person_id"] in gone]
    counts = {**feed.get("counts", {})}
    counts["touches_due"] = max(0, counts.get("touches_due", len(feed["touches_due"])) - len(out))
    if "by_band" in counts:
        counts["by_band"] = {b: max(0, n - sum(1 for r in out if r.get("band") == b)) for b, n in counts["by_band"].items()}
    feed = {**feed, "touches_due": due, "counts": counts,
            "signals": {**feed.get("signals", {}), "owes_reply": max(0, feed.get("signals", {}).get("owes_reply", 0) - sum(1 for r in out if r.get("owes_reply")))}}
    keep = lambda rows: [r for r in rows or [] if r.get("person_id") not in gone]
    text_q = {**text_q, **{k: keep(text_q.get(k)) for k in ("reply_first", "drafts") if k in text_q}}
    email_q = {**email_q, **{k: keep(email_q.get(k)) for k in ("drafts",) if k in email_q}}
    return feed, text_q, email_q, gone
