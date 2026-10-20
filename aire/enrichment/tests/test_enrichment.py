#!/usr/bin/env python3
"""Offline checks. Builds a fake Messages database, a fake CRM and a fake Hot-Warm-Cold sheet. No network, no real people."""
import csv, json, sqlite3, sys, tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "execution"))
from identity import phone_key, email_key, name_key, Index  # noqa
from imessage_signals import read_messages, build_signals, decode_body, APPLE_EPOCH  # noqa
from social_signals import build as social_build  # noqa
from score_and_label import score_person  # noqa
from merge_hwc import merge, load_hwc  # noqa
from run_enrichment import run  # noqa
from crm_client import LocalCRM, ENRICH_COLUMNS  # noqa

NOW = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)
AS_OF = NOW.date()
fails = []


def check(name, cond):
    print(("PASS " if cond else "FAIL ") + name)
    if not cond:
        fails.append(name)


def apple_ns(dt):
    return int((dt - APPLE_EPOCH).total_seconds()) * 10**9


def fake_chat_db(path: Path):
    con = sqlite3.connect(path)
    con.executescript("""
      create table handle (ROWID integer primary key, id text);
      create table message (ROWID integer primary key, handle_id int, date int, is_from_me int, text text, attributedBody blob);
      create table chat_message_join (chat_id int, message_id int);
      create table chat_handle_join (chat_id int, handle_id int);
    """)
    handles = {1: "+12255550101", 2: "(225) 555-0102", 3: "jordan@example.com", 4: "+12255550199",
               5: "+12255550155", 6: "+12255550156", 7: "+12255550157"}
    for k, v in handles.items():
        con.execute("insert into handle values (?,?)", (k, v))
    d = lambda days: apple_ns(NOW - timedelta(days=days))
    msgs = [
        (1, d(3), 0, "Hey Caleb, we are thinking about selling the house in the spring, what is it worth?", None),
        (1, d(2), 1, "Great, let me pull comps", None),
        (1, d(1), 0, "Thanks! Also my sister is looking for an agent in Zachary", None),
        (2, d(40), 0, "This is Marcus Pelt, got your card at the open house", None),
        (2, d(39), 0, "We are pre-approved and want to see houses in Prairieville", None),
        (3, d(200), 0, "Happy birthday!", None),
        (3, d(10), 0, "saw your post, congrats on the closing", None),
        (3, d(8), 0, "lol", None),
        (3, d(5), 0, "coffee soon?", None),
        (4, d(20), 0, None, b"\x00NSString\x01\x94\x84\x01+\x12we want to rent out our condo"),
        (4, d(19), 0, "closing is next friday right?", None),
        (4, d(18), 0, "and the appraisal came back fine", None),
    ]
    con.executemany("insert into message (handle_id,date,is_from_me,text,attributedBody) values (?,?,?,?,?)", msgs)
    # A 4-person group chat (Caleb plus handles 5, 6, 7). Its messages must never count.
    for h in (5, 6, 7):
        con.execute("insert into chat_handle_join values (99, ?)", (h,))
    cur = con.execute("insert into message (handle_id,date,is_from_me,text,attributedBody) values (5, ?, 0, 'group: who is bringing ice?', NULL)", (d(1),))
    con.execute("insert into chat_message_join values (99, ?)", (cur.lastrowid,))
    con.commit(); con.close()


def fake_crm(path: Path):
    rows = [
        {"person_id": "1", "display": "Taylor Sample", "first": "Taylor", "last": "Sample", "name_tier": "A_brain", "primary_phone": "+12255550101", "email": "", "band": "NURTURE", "Stage": "nurture", "Do_Not_Contact": "NO", "Type": "client", "homestead": "True", "fair_market_value": "310000"},
        {"person_id": "2", "display": "?2255550102", "first": "", "last": "", "name_tier": "none", "primary_phone": "+12255550102", "email": "", "band": "", "Stage": "", "Do_Not_Contact": "NO", "Type": "unknown"},
        {"person_id": "3", "display": "Jordan Friend", "first": "Jordan", "last": "Friend", "name_tier": "A_brain", "primary_phone": "+12255550103", "email": "jordan@example.com", "band": "DORMANT", "Stage": "", "Do_Not_Contact": "NO", "Type": "client"},
        {"person_id": "4", "display": "Pat Quiet", "first": "Pat", "last": "Quiet", "name_tier": "A_brain", "primary_phone": "+12255550104", "email": "", "band": "", "Stage": "", "Do_Not_Contact": "NO", "Type": "client"},
        {"person_id": "5", "display": "Rob Roofer", "first": "Rob", "last": "Roofer", "name_tier": "A_brain", "primary_phone": "+12255550105", "email": "", "band": "HOT", "Stage": "", "Do_Not_Contact": "NO", "Type": "vendor"},
        {"person_id": "6", "display": "Dee Enis", "first": "Dee", "last": "Enis", "name_tier": "A_brain", "primary_phone": "+12255550106", "email": "", "band": "HOT", "Stage": "nurture", "Do_Not_Contact": "YES", "Type": "client"},
        {"person_id": "7", "display": "Sam Past", "first": "Sam", "last": "Past", "name_tier": "A_brain", "primary_phone": "+12255550107", "email": "", "band": "", "Stage": "past client", "Do_Not_Contact": "NO", "Type": "client"},
        {"person_id": "8", "display": "Casey Deal", "first": "Casey", "last": "Deal", "name_tier": "A_brain", "primary_phone": "+12255550199", "email": "", "band": "WARM", "Stage": "", "Do_Not_Contact": "NO", "Type": "client"},
    ]
    for r in rows:
        for k in ("street", "city", "state", "zip", "addr_tier", "opportunity_types", "provenance", "Source", "Last_Touch", "Next_Action", "Command_ID", "email_tier"):
            r.setdefault(k, "")
    path.write_text(json.dumps({"Contacts": rows, "Notes": []}))


tmp = Path(tempfile.mkdtemp())
db = tmp / "chat.db"; fake_chat_db(db)
crm_path = tmp / "crm.json"; fake_crm(crm_path)
out = tmp / "out"; out.mkdir()

check("phone_key formats", phone_key("(225) 555-0102") == "+12255550102" and phone_key("1-225-555-0102") == "+12255550102" and phone_key("555") == "")
check("email_key lowercases", email_key(" Jordan@Example.com ") == "jordan@example.com" and email_key("nope") == "")
check("name_key handles couples", name_key(display="Pat & Sam Example") == "pat example")
check("attributedBody decode", decode_body(None, b"\x00NSString\x01\x94\x84\x01+\x05hello") == "hello")

msgs = read_messages(db, 365)
check("group chats of 4 or more are left out", not any(h == "+12255550155" for h, _, _, _ in msgs))
check("reads all messages", len(msgs) == 12)
sig = build_signals(msgs, NOW)
check("handles normalized", "+12255550102" in sig and "jordan@example.com" in sig)
s1 = sig["+12255550101"]
check("intent keywords found", s1["keyword_hits"].get("sell", 0) >= 1 and s1["keyword_hits"].get("referral", 0) == 1)
check("unanswered computed", s1["unanswered_days"] == 1)
check("name hint recovered", sig["+12255550102"]["name_hints"] == ["Marcus Pelt"])
check("blob body decoded into keywords", sig["+12255550199"]["keyword_hits"].get("rent") == 1 and sig["+12255550199"]["keyword_hits"].get("deal") == 2)
(out / "imessage-signals.json").write_text(json.dumps(sig))

soc = social_build([{"handle": "@Jordan.Friend", "platform": "Instagram", "action": "comment", "date": "2026-10-12", "post": ""},
                    {"handle": "jordan.friend", "platform": "instagram", "action": "like", "date": "2026-10-15", "post": ""},
                    {"handle": "jordan.friend", "platform": "instagram", "action": "like", "date": "2026-10-16", "post": ""},
                    {"handle": "nobody", "platform": "facebook", "action": "like", "date": "2026-10-16", "post": ""}],
                   [{"person_id": "3", "platform": "instagram", "handle": "jordan.friend"}], AS_OF)
check("social matched by handle", soc["3"]["social_90d"] == 3 and soc["3"]["social_weight_90d"] == 5)
check("unmatched handle kept", any(k.startswith("unmatched") for k in soc))
(out / "social-signals.json").write_text(json.dumps(soc))

crm = LocalCRM(crm_path)
res = run(crm, AS_OF, out)
lab = {r["person_id"]: r for r in res["rows"]}
check("seller intent -> hot", lab["1"]["aire_label"] == "hot")
check("hidden lead flagged (was NURTURE)", lab["1"]["hidden_lead"] == "YES")
check("owes reply flagged", lab["1"]["owes_reply"] == "" and lab["2"]["owes_reply"] == "YES")
check("buyer 40d ago -> warm", lab["2"]["aire_label"] == "warm")
check("warm quiet 39d is due", lab["2"]["due"] == "YES" and lab["1"]["due"] == "")
check("name hint on phone-only row", lab["2"]["name_hints"] == "Marcus Pelt")
check("friend who engages -> lukewarm", lab["3"]["aire_label"] == "lukewarm")
check("silent, no band -> ice-cold", lab["4"]["aire_label"] == "ice-cold" and lab["4"]["due"] == "")
check("vendor status, never due", lab["5"]["status"] == "vendor-agent" and lab["5"]["due"] == "")
check("DNC status, never due", lab["6"]["status"] == "do-not-contact" and lab["6"]["due"] == "")
check("past client -> lukewarm", lab["7"]["aire_label"] == "lukewarm")
check("two deal words -> hot", lab["8"]["aire_label"] == "hot")
check("score orders hot above dormant", lab["1"]["signal_score"] > lab["3"]["signal_score"] > lab["4"]["signal_score"])
check("report sections present", all(k in res["report"] for k in ("## Temperature", "## Due now", "## Hidden leads", "owes a reply", "Names recovered", "not in the CRM")))
check("enriched.csv written with enrichment columns", all(c in open(out / "enriched.csv").readline() for c in ENRICH_COLUMNS))

n = crm.write_enrichment(res["rows"])
again = LocalCRM(crm_path).contacts()
check("local write touches only enrichment keys", n == 8 and again[0]["aire_label"] == "hot" and again[0]["band"] == "NURTURE")

hwc = tmp / "hwc.json"
hwc.write_text(json.dumps({"values": [
    ["Done", "Name", "Phone", "Email", "Category", "Tier", "Why this tier", "Last touch", "Next action", "Notes", "Instagram", "Facebook"],
    ["No", "Taylor Sample", "(225) 555-0101", "taylor@example.com", "client", "HOT", "Under contract", "10/18 call", "Send report", "fake", "taylor.s", ""],
    ["No", "Jordan Friend", "", "jordan@example.com", "friend", "COLD", "Sphere", "", "", "", "", "jordan.f"],
    ["No", "Pat Quiet", "", "", "friend", "CONTACT", "", "", "", "", "", ""],
    ["No", "New Person", "(225) 555-0900", "", "lead", "WARM", "Open house", "10/1 text", "Call", "", "", ""],
]}))
m = merge(load_hwc(hwc), crm.contacts())
check("merge matches by phone, email and name", m["how"] == {"phone": 1, "email": 1, "name": 1, "none": 1})
check("merge finds new person", len(m["new_people"]) == 1 and m["new_people"][0]["Name"] == "New Person")
check("merge conflicts HOT vs cold and COLD vs ice-cold", {c["person_id"] for c in m["conflicts"]} == {"1", "3"})
check("merge proposes email add", any(u.get("email") == "taylor@example.com" for u in m["updates"]))
check("merge recovers handles", {(h["platform"], h["handle"]) for h in m["handles"]} == {("instagram", "taylor.s"), ("facebook", "jordan.f")})
check("merge writes nothing", LocalCRM(crm_path).contacts()[0].get("email", "") == "")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED'} ({len(fails)} failed)")
sys.exit(1 if fails else 0)
