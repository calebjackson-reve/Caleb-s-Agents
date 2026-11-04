#!/usr/bin/env python3
"""Sync for the AIRE World. The AIRE CRM Google Sheet is the single data source.

Tabs read, all read only (never a write):
  Contacts        the one CRM (band, stage, source dates, city; email and street only for matching)
  Deals           the spine: one row per deal, with address, side, stage, price, expected close, commission
  Tasks           open and overdue counts
  Deadlines       address, kind, date, deal_id, source, notes   (Caleb or the TC fills it)
  Command export  KW Command CSV paste: a Contacts export and/or an Opportunities export, header rows included
  LP leads        Luxury Presence lead export paste, header row included
  Spending        date, vendor, amount, category   (Caleb fills it; vendors are businesses, never clients)

What comes out
  data.json        totals only: deals by stage, pending commission, days on market, next deadlines,
                   new leads this week by source, people counts, spending totals, match counts. Never a
                   name, email, phone or address.
  history.json     one row of key totals per day (git-ignored), for the sparklines
  brief.json       Mac only, git-ignored: today's calendar, inbox, open to-dos and next actions WITH
                   names, for the dashboard rail. Needs the World token: sync.py auth, once.
  reports/merge-<date>.md   the merged table (one line per deal, address shown) and every record that
                   did not match, so Caleb decides. reports/ is git-ignored.

Matching, in this order, never guessed
  1. property address: house number + street name, with directions and suffixes normalized
     (2179 S Turnberry Ave == 2179 South Turnberry Avenue)
  2. email, lower-cased
  Anything else is listed as unmatched.

Run on the Mac (the CRM's own token, ~/.aire/google-token.json, Sheets scope only). Use the
system Python, which has the Google libraries; a Homebrew python3 may not:
    /usr/bin/python3 aire/world/sync.py          # one sync, prints the merged table and the unmatched list
    /usr/bin/python3 aire/world/sync.py --loop   # every 5 minutes while the Mac is awake
From a Claude session with connector exports (get_values JSON per tab):
    python3 -I aire/world/sync.py --from-exports DIR
"""
import argparse
import glob
import json
import os
import re
import sys
import time
from collections import Counter, defaultdict
from datetime import date, datetime
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "data.json")          # live file, written every sync, git-ignored
SAMPLE = os.path.join(HERE, "data.sample.json")  # committed snapshot for build.py and the preview
LOG = os.path.join(HERE, "sync.log")
REPORTS = os.path.join(HERE, "reports")
SHEET_ID = os.getenv("AIRE_CRM_SHEET", "1w9izcliqmXlFR3_O3dnP2G5SGfCrua7mrCLCE7cdoDc")
TOKEN = os.getenv("AIRE_GOOGLE_TOKEN", os.path.expanduser("~/.aire/google-token.json"))
SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/gmail.readonly"]
CENTRAL = ZoneInfo("America/Chicago")
TABS = {"contacts": "Contacts!A1:Y", "deals": "Deals!A1:P", "tasks": "Tasks!A1:I", "deadlines": "Deadlines!A1:J",
        "command": "'Command export'!A1:AN", "lp": "'LP leads'!A1:AD", "spending": "Spending!A1:H"}
HISTORY = os.path.join(HERE, "history.json")   # one row per day of key totals, git-ignored (Mac), for the sparklines
BRIEF = os.path.join(HERE, "brief.json")       # Mac only, git-ignored: today's calendar, inbox, to-dos and next actions WITH names
WORLD_TOKEN = os.getenv("AIRE_WORLD_TOKEN", os.path.expanduser("~/.aire/google-token-world.json"))
WORLD_SCOPES = SCOPES + ["https://www.googleapis.com/auth/calendar.readonly"]
GMAIL_INBOX = "in:inbox newer_than:3d -from:me"

# Column aliases for the pasted exports. Matched case-insensitively after trimming.
ALIASES = {
    "first": ["first name", "first", "firstname", "given name"],
    "last": ["last name", "last", "lastname", "surname"],
    "name": ["name", "full name", "contact name", "contact", "client", "client name", "opportunity name"],
    "email": ["email", "email address", "primary email", "e-mail", "email 1", "contact email"],
    "phone": ["phone", "mobile", "cell", "primary phone", "phone number", "mobile phone", "phone 1"],
    "created": ["created", "created date", "date created", "created at", "date added", "added", "create date", "created on", "submitted", "submitted at", "date"],
    "source": ["lead source", "source", "origin", "lead origin", "referral source", "campaign", "utm source"],
    "stage": ["stage", "status", "phase", "opportunity stage", "pipeline stage", "lead status"],
    "address": ["property address", "address", "street address", "address 1", "address line 1", "street", "property", "listing address", "home address"],
    "city": ["city", "property city"], "state": ["state", "property state"], "zip": ["zip", "zip code", "postal code", "property zip"],
    "list_date": ["list date", "listing date", "date listed", "listed", "listed on", "list dt"],
    "close_date": ["close date", "closing date", "expected close", "est. close", "estimated close", "closing", "target close"],
    "price": ["price", "list price", "sale price", "offer price", "contract price", "amount", "listing price", "purchase price"],
    "commission": ["commission", "gci", "est. commission", "estimated commission", "commission amount", "est gci", "estimated gci", "my commission"],
    "side": ["type", "side", "opportunity type", "client type", "role", "transaction type", "buyer/seller"],
    "dom": ["days on market", "dom", "days listed"],
    "vendor": ["vendor", "payee", "merchant", "description", "paid to"],
    "category": ["category", "type of expense", "expense type", "bucket"],
    "amount": ["amount", "total", "cost", "spent", "charge"],
}
SUFFIX = {"ave": "avenue", "av": "avenue", "blvd": "boulevard", "cir": "circle", "ct": "court", "dr": "drive", "hwy": "highway", "ln": "lane",
          "pkwy": "parkway", "pl": "place", "rd": "road", "st": "street", "ter": "terrace", "trl": "trail", "way": "way", "loop": "loop", "cv": "cove", "pt": "point"}
DIRS = {"n": "north", "s": "south", "e": "east", "w": "west", "ne": "northeast", "nw": "northwest", "se": "southeast", "sw": "southwest"}


def log(line):
    os.makedirs(HERE, exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"{datetime.now(CENTRAL).strftime('%Y-%m-%d %H:%M:%S')} {line}\n")


def num(s):
    try:
        return float(re.sub(r"[^\d.\-]", "", str(s)))
    except ValueError:
        return None


def to_date(s):
    s = (s or "").strip()
    if not s:
        return None
    for f in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%m/%d/%Y", "%m/%d/%y", "%m-%d-%Y", "%b %d, %Y", "%B %d, %Y", "%Y/%m/%d", "%d %b %Y"):
        try:
            return datetime.strptime(s[:len(datetime.now().strftime(f))] if "T" in f else s.split(" ")[0] if f.startswith("%Y-%m-%d") else s, f).date()
        except ValueError:
            continue
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    return date(int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None


def addr_key(s):
    """house number + street name, directions and suffixes normalized, unit/city/state/zip dropped."""
    s = (s or "").lower().split(",")[0]
    s = re.sub(r"\b(apt|unit|suite|ste|#)\s*\w+", " ", s)
    toks = [t for t in re.sub(r"[^a-z0-9 ]", " ", s).split() if t]
    if not toks or not toks[0].isdigit():
        return ""
    out = [toks[0]]
    for t in toks[1:]:
        t = DIRS.get(t, SUFFIX.get(t, t))
        out.append(t)
    # drop a trailing suffix word so "turnberry avenue" and "turnberry" agree
    if len(out) > 2 and out[-1] in set(SUFFIX.values()):
        out = out[:-1]
    return " ".join(out)


def email_key(s):
    s = (s or "").strip().lower()
    return s if "@" in s else ""


def mask_email(s):
    s = email_key(s)
    if not s:
        return ""
    u, d = s.split("@", 1)
    return (u[:1] + "***@" + d)


def find_blocks(rows):
    """Split a pasted tab into blocks, each starting at a row that looks like a header."""
    blocks, cur = [], None
    for i, r in enumerate(rows):
        cells = [str(c).strip() for c in r]
        low = [c.lower() for c in cells]
        hits = sum(1 for group in ALIASES.values() if any(c in group for c in low))
        if hits >= 3 and len([c for c in cells if c]) >= 3:
            cur = {"header_row": i + 1, "header": low, "rows": []}
            blocks.append(cur)
        elif cur is not None and any(cells):
            cur["rows"].append((i + 1, cells))
    return blocks


def colmap(header):
    m = {}
    for field, names in ALIASES.items():
        for j, h in enumerate(header):
            if h in names and field not in m:
                m[field] = j
    return m


def cell(cells, m, field):
    j = m.get(field)
    return cells[j].strip() if j is not None and j < len(cells) else ""


# ---------------------------------------------------------------- the merge

def merge(raw, today):
    rep = {"recognized": {}, "ignored": {}, "unmatched": [], "merged": [], "notes": []}

    # Contacts (the one CRM). Index by email and by street. Nothing from here is written out.
    crows = raw.get("contacts") or []
    ch = [h.strip() for h in (crows[0] if crows else [])]
    ci = {h: i for i, h in enumerate(ch)}
    def cget(r, name):
        i = ci.get(name)
        return r[i].strip() if i is not None and i < len(r) else ""
    contacts = crows[1:]
    by_email, by_addr, by_pid = {}, {}, {}
    for r in contacts:
        pid = cget(r, "person_id")
        if not pid:
            continue
        by_pid[pid] = r
        ek = email_key(cget(r, "email"))
        if ek and ek not in by_email:
            by_email[ek] = pid
        ak = addr_key(cget(r, "street"))
        if ak and ak not in by_addr:
            by_addr[ak] = pid

    # Deals: the spine.
    drows = raw.get("deals") or []
    dh = [h.strip().lower() for h in (drows[0] if drows else [])]
    deals = []
    for n, r in enumerate(drows[1:], start=2):
        d = {dh[i]: (r[i].strip() if i < len(r) else "") for i in range(len(dh))}
        if not d.get("deal_id"):
            continue
        d["_row"] = n
        d["_akey"] = addr_key(d.get("address"))
        d["_email"] = email_key(cget(by_pid.get(d.get("person_id"), []), "email")) if d.get("person_id") in by_pid else ""
        d["_price"] = num(d.get("price")) or 0
        d["_commission"] = num(d.get("commission"))
        d["_stage"] = (d.get("stage") or "").lower() or "unknown"
        d["_side"] = (d.get("side") or "").lower() or "unknown"
        d["_deadlines"] = []
        d["_cmd"] = None
        deals.append(d)
    deal_by_addr = {}
    for d in deals:
        if d["_akey"] and d["_akey"] not in deal_by_addr:
            deal_by_addr[d["_akey"]] = d
        elif d["_akey"]:
            rep["notes"].append(f"Deals rows {deal_by_addr[d['_akey']]['_row']} and {d['_row']} share the address key '{d['_akey']}'; the first one takes the matches.")
    deal_by_email = {}
    for d in deals:
        if d["_email"] and d["_email"] not in deal_by_email:
            deal_by_email[d["_email"]] = d

    # Deadlines tab.
    xrows = raw.get("deadlines") or []
    xh = [h.strip().lower() for h in (xrows[0] if xrows else [])]
    rep["recognized"]["Deadlines"] = [h for h in xh if h in ("address", "kind", "date", "deal_id", "source", "notes")]
    for n, r in enumerate(xrows[1:], start=2):
        x = {xh[i]: (r[i].strip() if i < len(r) else "") for i in range(len(xh))}
        if not any(x.values()):
            continue
        d = None
        how = ""
        if x.get("deal_id"):
            d = next((q for q in deals if q["deal_id"] == x["deal_id"]), None); how = "deal_id"
        if d is None and addr_key(x.get("address")) in deal_by_addr:
            d = deal_by_addr[addr_key(x.get("address"))]; how = "address"
        when = to_date(x.get("date"))
        if d is None:
            rep["unmatched"].append({"tab": "Deadlines", "row": n, "what": f"{x.get('kind') or 'deadline'} on {x.get('date') or '?'} at '{x.get('address') or '?'}'", "why": "no Deals row with that address (or deal_id)"})
            continue
        d["_deadlines"].append({"kind": x.get("kind") or "deadline", "date": when.isoformat() if when else (x.get("date") or ""), "how": how})

    # Command export: blocks of contacts and/or opportunities.
    cmd_contacts, cmd_opps = [], []
    for b in find_blocks(raw.get("command") or []):
        m = colmap(b["header"])
        is_opp = ("address" in m and ("stage" in m or "price" in m or "close_date" in m)) and "first" not in m
        kind = "opportunities" if is_opp else "contacts"
        rep["recognized"][f"Command export ({kind}, header row {b['header_row']})"] = sorted(m.keys())
        rep["ignored"][f"Command export ({kind}, header row {b['header_row']})"] = [h for h in b["header"] if h and h not in sum(ALIASES.values(), [])]
        for n, cells in b["rows"]:
            rec = {f: cell(cells, m, f) for f in m}
            rec["_row"] = n
            (cmd_opps if is_opp else cmd_contacts).append(rec)
    for o in cmd_opps:
        ak, ek = addr_key(o.get("address")), email_key(o.get("email"))
        d = deal_by_addr.get(ak) if ak else None
        how = "address" if d else ""
        if d is None and ek and ek in deal_by_email:
            d, how = deal_by_email[ek], "email"
        if d is None:
            rep["unmatched"].append({"tab": "Command export (opportunities)", "row": o["_row"], "what": f"{o.get('side') or 'opportunity'} '{o.get('address') or (o.get('name') or '?')}' stage {o.get('stage') or '?'}" + (f", email {mask_email(ek)}" if ek else ""), "why": "no Deals row with that address, and no contact email on a deal"})
            continue
        if d["_cmd"] is None:
            d["_cmd"] = {"how": how, "stage": o.get("stage"), "price": num(o.get("price")), "commission": num(o.get("commission")),
                         "list_date": to_date(o.get("list_date")), "close_date": to_date(o.get("close_date")), "dom": num(o.get("dom")), "side": o.get("side")}
            cs = re.sub(r"[^a-z]", "", (o.get("stage") or "").lower())
            ds = re.sub(r"[^a-z]", "", d["_stage"])
            if cs and ds and cs != ds and not (cs in ds or ds in cs):
                rep["notes"].append(f"Stage disagrees on '{d.get('address')}': Deals row {d['_row']} says {d['_stage']}, Command export row {o['_row']} says {o.get('stage')}. The Deals tab wins until you change it.")
    cmd_new, cmd_matched = Counter(), 0
    for c in cmd_contacts:
        ek, ak = email_key(c.get("email")), addr_key(c.get("address"))
        pid = by_email.get(ek) if ek else None
        if pid is None and ak:
            pid = by_addr.get(ak)
        created = to_date(c.get("created"))
        if pid is None:
            rep["unmatched"].append({"tab": "Command export (contacts)", "row": c["_row"], "what": f"contact {mask_email(ek) or '(no email)'}" + (f", {c.get('address')}" if c.get("address") else "") + (f", source {c.get('source')}" if c.get("source") else ""), "why": "no Contacts row with that email or street"})
        else:
            cmd_matched += 1
        if created and (today - created).days <= 7:
            cmd_new[(c.get("source") or "KW Command").strip() or "KW Command"] += 1

    # LP leads.
    lp_new, lp_matched, lp_rows = Counter(), 0, 0
    for b in find_blocks(raw.get("lp") or []):
        m = colmap(b["header"])
        rep["recognized"][f"LP leads (header row {b['header_row']})"] = sorted(m.keys())
        rep["ignored"][f"LP leads (header row {b['header_row']})"] = [h for h in b["header"] if h and h not in sum(ALIASES.values(), [])]
        for n, cells in b["rows"]:
            lp_rows += 1
            ek, ak = email_key(cell(cells, m, "email")), addr_key(cell(cells, m, "address"))
            pid = by_email.get(ek) if ek else None
            if pid is None and ak:
                pid = by_addr.get(ak)
            created = to_date(cell(cells, m, "created"))
            if pid is None:
                rep["unmatched"].append({"tab": "LP leads", "row": n, "what": f"lead {mask_email(ek) or '(no email)'}" + (f", created {created}" if created else "") + (f", source {cell(cells, m, 'source')}" if cell(cells, m, "source") else ""), "why": "no Contacts row with that email or street"})
            else:
                lp_matched += 1
            if created and (today - created).days <= 7:
                lp_new[(cell(cells, m, "source") or "Luxury Presence").strip() or "Luxury Presence"] += 1

    # New leads this week from the Contacts Source column (e.g. "Luxury Presence 2026-10-18").
    sheet_new = Counter()
    for r in contacts:
        so = cget(r, "Source")
        mm = re.search(r"(\d{4}-\d{2}-\d{2})", so)
        if mm:
            try:
                if (today - date.fromisoformat(mm.group(1))).days <= 7:
                    sheet_new[re.sub(r"\s*\d{4}-\d{2}-\d{2}.*", "", so).strip() or "sheet"] += 1
            except ValueError:
                pass

    # Merged table, one line per deal.
    for d in deals:
        nxt = sorted((x for x in d["_deadlines"] if x["date"] >= today.isoformat()), key=lambda x: x["date"])
        cmd = d["_cmd"] or {}
        list_date = cmd.get("list_date")
        dom = cmd.get("dom")
        if dom is None and list_date:
            dom = (today - list_date).days
        commission = d["_commission"] if d["_commission"] is not None else cmd.get("commission")
        rep["merged"].append({"row": d["_row"], "deal_id": d["deal_id"], "address": d.get("address"), "side": d["_side"], "stage": d["_stage"], "price": d["_price"],
                              "expected_close": d.get("expected_close") or (cmd.get("close_date").isoformat() if cmd.get("close_date") else ""),
                              "commission": commission, "dom": dom, "deadlines": len(d["_deadlines"]), "next_deadline": (nxt[0]["kind"] + " " + nxt[0]["date"]) if nxt else "",
                              "command": (cmd.get("how") + ": " + str(cmd.get("stage") or "")) if cmd else "", "contact": "yes" if d.get("person_id") in by_pid else "no person_id"})
        d["_dom"], d["_pending_commission"] = dom, commission

    counts = {"deals": len(deals), "deadlines_matched": sum(len(d["_deadlines"]) for d in deals),
              "command_opportunities": len(cmd_opps), "command_opportunities_matched": sum(1 for d in deals if d["_cmd"]),
              "command_contacts": len(cmd_contacts), "command_contacts_matched": cmd_matched,
              "lp_leads": lp_rows, "lp_leads_matched": lp_matched, "unmatched": len(rep["unmatched"])}
    return deals, rep, counts, {"sheet": sheet_new, "command": cmd_new, "lp": lp_new}, contacts, ci


# ---------------------------------------------------------------- summarize (totals only)

def summarize(raw, now=None):
    now = now or datetime.now(CENTRAL)
    today = now.date()
    src = "AIRE CRM sheet"
    deals, rep, mcounts, new_by, contacts, ci = merge(raw, today)
    def cget(r, name):
        i = ci.get(name)
        return r[i].strip() if i is not None and i < len(r) else ""

    band = Counter((cget(r, "band") or "").lower() or "blank" for r in contacts)
    stage = Counter((cget(r, "Stage") or "").lower() or "blank" for r in contacts)
    typ = Counter((cget(r, "Type") or "").lower() or "unknown" for r in contacts)
    city = Counter(cget(r, "city").title() for r in contacts if cget(r, "city"))
    touched30 = 0
    for r in contacts:
        d = to_date(cget(r, "Last_Touch")[:10])
        if d and (today - d).days <= 30:
            touched30 += 1
    next_actions = sum(1 for r in contacts if cget(r, "Next_Action"))
    new30 = 0
    for r in contacts:
        mm = re.search(r"(\d{4}-\d{2}-\d{2})", cget(r, "Source"))
        if mm:
            try:
                new30 += (today - date.fromisoformat(mm.group(1))).days <= 30
            except ValueError:
                pass
    fmv = sorted(v for v in (num(cget(r, "fair_market_value")) for r in contacts) if v)

    by_source = Counter()
    for k in ("sheet", "command", "lp"):
        for s, n in new_by[k].items():
            by_source[s] += n
    people = {
        "contacts": {"value": len(contacts), "period": "now", "source": src},
        "hot": {"value": band.get("hot", 0), "period": "now", "source": src + ", band"},
        "warm": {"value": band.get("warm", 0), "period": "now", "source": src + ", band"},
        "cold": {"value": band.get("cold", 0), "period": "now", "source": src + ", band"},
        "ice_cold": {"value": band.get("ice-cold", 0), "period": "now", "source": src + ", band"},
        "unbanded": {"value": band.get("blank", 0), "period": "now", "source": src + ", band"},
        "new_leads_7d": {"value": sum(by_source.values()), "period": "last 7 days", "source": "Contacts Source dates + Command export + LP leads created dates"},
        "new_leads_7d_by_source": dict(by_source.most_common()),
        "new_leads_30d": {"value": new30, "period": "last 30 days", "source": src + ", Source column date"},
        "touched_30d": {"value": touched30, "period": "last 30 days", "source": src + ", Last_Touch"},
        "next_actions": {"value": next_actions, "period": "now", "source": src + ", Next_Action"},
        "past_clients": {"value": stage.get("past client", 0), "period": "now", "source": src + ", Stage"},
        "nurture": {"value": stage.get("nurture", 0), "period": "now", "source": src + ", Stage"},
        "fmv_median": {"value": (fmv[len(fmv) // 2] if fmv else None), "period": "now", "source": f"{src}, fair_market_value, {len(fmv)} homes"},
        "by_type": {k: typ.get(k, 0) for k in ("client", "household", "recruit", "vendor", "agent", "lender", "unknown")},
        "by_city": [{"city": c, "n": n} for c, n in city.most_common(8)],
    }

    live = [d for d in deals if d["_stage"] not in ("closed", "lost")]
    uc = [d for d in live if d["_stage"] in ("under_contract", "pending")]
    active = [d for d in live if d["_stage"] in ("active", "showing", "listed")]
    closed90 = [d for d in deals if d["_stage"] == "closed" and to_date(d.get("updated_at", "")[:10]) and (today - to_date(d.get("updated_at", "")[:10])).days <= 90]
    doms = [d["_dom"] for d in active if d.get("_dom") is not None]
    pend_comm = [d["_pending_commission"] for d in uc if d.get("_pending_commission") is not None]
    all_deadlines = sorted((dict(x, stage=d["_stage"], side=d["_side"]) for d in deals for x in d["_deadlines"] if x["date"] >= today.isoformat()), key=lambda x: x["date"])
    deals_out = {
        "live": {"value": len(live), "period": "now", "source": src + ", Deals"},
        "by_stage": dict(Counter(d["_stage"] for d in deals)),
        "under_contract": {"value": len(uc), "period": "now", "source": src + ", Deals"},
        "under_contract_volume": {"value": sum(d["_price"] for d in uc), "period": "now", "source": src + ", Deals price"},
        "pending_commission": {"value": sum(pend_comm) if pend_comm else None, "period": "now",
                               "source": src + ", Deals commission column, else Command opportunities commission" + ("" if len(pend_comm) == len(uc) else f" ({len(uc) - len(pend_comm)} of {len(uc)} under-contract deals have no commission figure yet)")},
        "active_listings": {"value": sum(1 for d in active if d["_side"] == "listing"), "period": "now", "source": src + ", Deals"},
        "active_buyers": {"value": sum(1 for d in active if d["_side"] == "buyer"), "period": "now", "source": src + ", Deals"},
        "active_volume": {"value": sum(d["_price"] for d in active), "period": "now", "source": src + ", Deals price"},
        "days_on_market_median": {"value": (sorted(doms)[len(doms) // 2] if doms else None), "period": "now",
                                  "source": "Command opportunities list date or days on market" + ("" if doms else " (no list dates yet: paste the Opportunities export, or add a list date)")},
        "closed_90d": {"value": len(closed90), "period": "last 90 days", "source": src + ", Deals"},
        "closed_90d_volume": {"value": sum(d["_price"] for d in closed90), "period": "last 90 days", "source": src + ", Deals price"},
        "next_close": {"value": min((d.get("expected_close") for d in live if d.get("expected_close") and d["expected_close"] >= str(today)), default=None), "period": "next", "source": src + ", expected_close"},
        "houses": [{"side": d["_side"], "stage": d["_stage"], "price": d["_price"], "close": d.get("expected_close") or "", "dom": d.get("_dom"), "deadlines": len(d["_deadlines"]),
                    "next_deadline": (sorted((x for x in d["_deadlines"] if x["date"] >= today.isoformat()), key=lambda x: x["date"]) or [{}])[0].get("date", "")} for d in deals],
    }
    calendar = {
        "deadlines_30d": {"value": sum(1 for x in all_deadlines if (date.fromisoformat(x["date"]) - today).days <= 30), "period": "next 30 days", "source": src + ", Deadlines tab"},
        "deadlines_today": {"value": sum(1 for x in all_deadlines if x["date"] == today.isoformat()), "period": "today", "source": src + ", Deadlines tab"},
        "deadlines": [{"kind": x["kind"], "date": x["date"], "stage": x["stage"]} for x in all_deadlines[:10]],
    }

    trows = raw.get("tasks") or []
    th = [h.strip().lower() for h in (trows[0] if trows else [])]
    tasks = [{th[i]: (r[i] if i < len(r) else "") for i in range(len(th))} for r in trows[1:]]
    tasks = [t for t in tasks if t.get("task_id")]
    open_t = [t for t in tasks if (t.get("status") or "").lower() == "open"]
    engine = {
        "tasks_open": {"value": len(open_t), "period": "now", "source": src + ", Tasks"},
        "tasks_overdue": {"value": sum(1 for t in open_t if (t.get("due") or "")[:10] and t["due"][:10] < str(today)), "period": "now", "source": src + ", Tasks"},
        "tasks_done_7d": {"value": sum(1 for t in tasks if to_date((t.get("done_at") or "")[:10]) and (today - to_date(t["done_at"][:10])).days <= 7), "period": "last 7 days", "source": src + ", Tasks"},
    }

    gb = raw.get("gbrar")
    market = {}
    if gb:
        s = gb.get("snapshot", {})
        def g2(k, label):
            v = s.get(k, {})
            return {"value": v.get("now"), "prior": v.get("prior"), "yoy": v.get("yoy"), "period": gb.get("month"), "source": gb.get("source"), "label": label}
        market["gbrar"] = {"median_price": g2("median_price", "Median sale price"), "closed_sales": g2("closed_sales", "Closed sales"), "days_on_market": g2("days_on_market", "Days on market"),
                           "homes_for_sale": g2("homes_for_sale", "Homes for sale"), "months_supply": g2("months_supply", "Months of supply"), "new_listings": g2("new_listings", "New listings"),
                           "pending_sales": g2("pending_sales", "Pending sales"), "month": gb.get("month"), "source": gb.get("source"), "source_url": gb.get("source_url")}

    # Spending tab: date, vendor, amount, category. Vendors are businesses, never clients.
    srows = raw.get("spending") or []
    sh = [h.strip().lower() for h in (srows[0] if srows else [])]
    sm = colmap(sh) if sh else {}
    spend = []
    for r in srows[1:]:
        cells = [str(c).strip() for c in r]
        amt = num(cell(cells, sm, "amount")) if "amount" in sm else None
        d = to_date(cell(cells, sm, "date")) if "date" in sm else None
        if not amt or amt <= 0 or not d:
            continue
        spend.append({"date": d, "vendor": cell(cells, sm, "vendor") or "(no vendor)", "amount": amt, "category": (cell(cells, sm, "category") or "other").lower()})
    spend.sort(key=lambda x: x["date"], reverse=True)
    s30 = [x for x in spend if (today - x["date"]).days <= 30]
    s7 = [x for x in spend if (today - x["date"]).days <= 7]
    by_cat = Counter()
    for x in s30:
        by_cat[x["category"]] += x["amount"]
    weeks = []
    for w in range(7, -1, -1):
        start = today - __import__("datetime").timedelta(days=7 * w + 6)
        end = today - __import__("datetime").timedelta(days=7 * w)
        weeks.append({"week_of": start.isoformat(), "total": round(sum(x["amount"] for x in spend if start <= x["date"] <= end), 2)})
    spending = {
        "last_30d": {"value": round(sum(x["amount"] for x in s30), 2), "period": "last 30 days", "source": src + ", Spending tab"},
        "last_7d": {"value": round(sum(x["amount"] for x in s7), 2), "period": "last 7 days", "source": src + ", Spending tab"},
        "rows_30d": {"value": len(s30), "period": "last 30 days", "source": src + ", Spending tab"},
        "by_category_30d": [{"category": k, "total": round(v, 2)} for k, v in by_cat.most_common()],
        "by_week": weeks,
        "recent": [{"date": x["date"].isoformat(), "vendor": x["vendor"][:40], "amount": x["amount"], "category": x["category"]} for x in spend[:8]],
        "columns": sorted(sm.keys()),
    }

    data = {
        "sync": {"at": now.isoformat(timespec="seconds"), "ok": True, "by": raw.get("by", "sync.py"), "warnings": raw.get("warnings", [])},
        "sources": {"crm": "AIRE CRM Google Sheet, read only: Contacts, Deals, Tasks, Deadlines, Command export, LP leads",
                    "market": (gb or {}).get("source"), "report": "aire/world/reports/merge-<date>.md (on the Mac, git-ignored)"},
        "match": mcounts,
        "people": people, "deals": deals_out, "calendar": calendar, "engine": engine, "market": market, "spending": spending,
    }
    data["history_row"] = {"date": today.isoformat(), "contacts": len(contacts), "hot": band.get("hot", 0), "warm": band.get("warm", 0),
                           "new_leads_7d": people["new_leads_7d"]["value"], "next_actions": next_actions, "live": len(live),
                           "under_contract_volume": deals_out["under_contract_volume"]["value"], "pending_commission": deals_out["pending_commission"]["value"],
                           "deadlines_30d": calendar["deadlines_30d"]["value"], "tasks_open": engine["tasks_open"]["value"], "spending_30d": spending["last_30d"]["value"]}
    return data, rep


def update_history(row):
    """One row per day. Today's row is replaced on every sync, older rows are kept (90 days)."""
    hist = []
    if os.path.exists(HISTORY):
        try:
            hist = json.load(open(HISTORY, encoding="utf-8"))
        except Exception:
            hist = []
    hist = [h for h in hist if h.get("date") != row["date"]]
    hist.append(row)
    hist = sorted(hist, key=lambda h: h["date"])[-90:]
    write_json(HISTORY, hist)
    return hist


def build_brief(creds, raw, now):
    """Mac only. Today's calendar, the inbox, open to-dos and the top next actions, with names, into brief.json.
    Never committed: aire/world/brief.json is git-ignored."""
    from googleapiclient.discovery import build
    today = now.date()
    out = {"at": now.isoformat(timespec="seconds"), "calendar": None, "inbox": None, "tasks": [], "next_actions": [], "new_leads": [], "deadlines": [], "notes": []}
    try:
        cal = build("calendar", "v3", credentials=creds, cache_discovery=False).events()
        day0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
        res = cal.list(calendarId="primary", timeMin=day0.isoformat(), timeMax=(day0 + __import__("datetime").timedelta(days=1)).isoformat(),
                       singleEvents=True, orderBy="startTime", maxResults=50).execute()
        items = []
        for e in res.get("events", res.get("items", [])):
            if e.get("status") == "cancelled" or e.get("transparency") == "transparent":
                continue
            st = e.get("start", {})
            if st.get("dateTime"):
                t = datetime.fromisoformat(st["dateTime"]).astimezone(CENTRAL)
                items.append({"time": t.strftime("%-I:%M %p"), "at": t.isoformat(), "title": e.get("summary") or "(no title)", "all_day": False})
            else:
                items.append({"time": "all day", "at": day0.isoformat(), "title": e.get("summary") or "(no title)", "all_day": True})
        out["calendar"] = items
    except Exception as e:
        out["notes"].append(f"calendar: {type(e).__name__} (run: /usr/bin/python3 aire/world/sync.py auth)")
    try:
        gm = build("gmail", "v1", credentials=creds, cache_discovery=False).users()
        res = gm.threads().list(userId="me", q=GMAIL_INBOX, maxResults=25).execute()
        items = []
        for t in res.get("threads", [])[:25]:
            th = gm.threads().get(userId="me", id=t["id"], format="metadata", metadataHeaders=["From", "Subject", "Date"]).execute()
            msgs = th.get("messages", [])
            last = msgs[-1] if msgs else {}
            hdr = {h["name"].lower(): h["value"] for h in (last.get("payload", {}).get("headers", []))}
            frm = re.sub(r"\s*<.*>", "", hdr.get("from", "")).strip().strip('"')
            items.append({"from": frm[:40], "subject": (hdr.get("subject") or "(no subject)")[:90], "when": hdr.get("date", "")[:22], "count": len(msgs), "unread": "UNREAD" in (last.get("labelIds") or [])})
        out["inbox"] = items
    except Exception as e:
        out["notes"].append(f"inbox: {type(e).__name__}")
    # to-dos and next actions from the sheet rows already read
    trows = raw.get("tasks") or []
    th = [h.strip().lower() for h in (trows[0] if trows else [])]
    for r in trows[1:]:
        t = {th[i]: (r[i] if i < len(r) else "") for i in range(len(th))}
        if (t.get("status") or "").lower() == "open" and t.get("task_id"):
            out["tasks"].append({"task": t.get("task", ""), "who": t.get("display", ""), "due": (t.get("due") or "")[:10], "overdue": bool((t.get("due") or "")[:10] and t["due"][:10] < str(today))})
    out["tasks"].sort(key=lambda x: (not x["overdue"], x["due"] or "9"))
    crows = raw.get("contacts") or []
    ch = [h.strip() for h in (crows[0] if crows else [])]
    ci = {h: i for i, h in enumerate(ch)}
    def cget(r, name):
        i = ci.get(name)
        return r[i].strip() if i is not None and i < len(r) else ""
    rank = {"hot": 0, "warm": 1, "lukewarm": 2, "cold": 3, "ice-cold": 4}
    nas = []
    for r in crows[1:]:
        if cget(r, "Do_Not_Contact").upper() == "YES" or not cget(r, "Next_Action"):
            continue
        lt = to_date(cget(r, "Last_Touch")[:10])
        nas.append({"who": cget(r, "display"), "action": cget(r, "Next_Action")[:120], "band": cget(r, "band").lower(), "days_quiet": (today - lt).days if lt else None})
        so = cget(r, "Source")
        mm = re.search(r"(\d{4}-\d{2}-\d{2})", so)
        if (cget(r, "Stage") or "").lower() == "new lead" and mm and (today - date.fromisoformat(mm.group(1))).days <= 14:
            out["new_leads"].append({"who": cget(r, "display"), "source": so, "received": mm.group(1)})
    nas.sort(key=lambda x: (rank.get(x["band"], 9), -(x["days_quiet"] or 0)))
    out["next_actions"] = nas[:12]
    xrows = raw.get("deadlines") or []
    xh = [h.strip().lower() for h in (xrows[0] if xrows else [])]
    for r in xrows[1:]:
        x = {xh[i]: (r[i] if i < len(r) else "") for i in range(len(xh))}
        d = to_date(x.get("date"))
        if d and d >= today:
            out["deadlines"].append({"kind": x.get("kind", ""), "date": d.isoformat(), "address": x.get("address", "")})
    out["deadlines"].sort(key=lambda x: x["date"])
    write_json(BRIEF, out)
    return out


# ---------------------------------------------------------------- report

def report_text(rep, counts, today):
    L = [f"# Merge report {today}", "", "One line per Deals row. Addresses shown; no names, emails or phones. Unmatched records are listed, never guessed.", ""]
    L.append("## Merged table")
    L.append("| row | deal | side | stage | price | expected close | commission | DOM | deadlines | next deadline | Command opp | contact |")
    L.append("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for m in rep["merged"]:
        L.append(f"| {m['row']} | {m['address']} | {m['side']} | {m['stage']} | {('$' + format(int(m['price']), ',')) if m['price'] else ''} | {m['expected_close']} | {('$' + format(int(m['commission']), ',')) if m['commission'] else ''} | {m['dom'] if m['dom'] is not None else ''} | {m['deadlines']} | {m['next_deadline']} | {m['command']} | {m['contact']} |")
    L += ["", "## Unmatched (" + str(len(rep["unmatched"])) + ")"]
    if rep["unmatched"]:
        for u in rep["unmatched"]:
            L.append(f"- {u['tab']} row {u['row']}: {u['what']}. {u['why']}.")
    else:
        L.append("- none")
    L += ["", "## Columns recognized per pasted tab"]
    for k, v in rep["recognized"].items():
        L.append(f"- {k}: {', '.join(v) if v else 'nothing'}" + (f" (ignored: {', '.join(rep['ignored'][k])})" if rep["ignored"].get(k) else ""))
    if not rep["recognized"]:
        L.append("- no pasted exports yet")
    if rep["notes"]:
        L += ["", "## Notes"] + [f"- {n}" for n in rep["notes"]]
    L += ["", "## Match counts", "```", json.dumps(counts, indent=1), "```"]
    return "\n".join(L) + "\n"


# ---------------------------------------------------------------- readers and main

def read_exports(d):
    def j(name):
        p = os.path.join(d, name)
        return json.load(open(p, encoding="utf-8")).get("values", []) if os.path.exists(p) else []
    raw = {"contacts": j("contacts.json"), "deals": j("deals.json"), "tasks": j("tasks.json"), "deadlines": j("deadlines.json"),
           "command": j("command.json"), "lp": j("lp.json"), "spending": j("spending.json"), "by": "connector exports", "warnings": []}
    if len(raw["contacts"]) < 2 or len(raw["deals"]) < 1:
        raise RuntimeError("exports missing Contacts or Deals rows")
    return raw


def read_google():
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    if os.path.exists(WORLD_TOKEN):
        creds = Credentials.from_authorized_user_file(WORLD_TOKEN, WORLD_SCOPES)
    elif os.path.exists(TOKEN):
        creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)
    else:
        sys.exit(f"No Google token at {TOKEN}. Run: cd aire/crm && python3 crm.py auth")
    svc = build("sheets", "v4", credentials=creds, cache_discovery=False).spreadsheets().values()
    raw = {"by": "sync.py on the Mac", "warnings": [], "_creds": creds}
    failed = {}
    for k, rng in TABS.items():
        try:
            raw[k] = svc.get(spreadsheetId=SHEET_ID, range=rng).execute().get("values", [])
        except Exception as e:
            failed[k] = f"{type(e).__name__}: {str(e)[:120]}"
            raw[k] = []
    # Contacts and Deals are the spine. If either could not be read, this sync is a failure:
    # the caller keeps the last good data.json instead of writing zeros and calling it ok.
    required = [k for k in ("contacts", "deals") if k in failed]
    if required or len(raw["contacts"]) < 2:
        raise RuntimeError("could not read " + ", ".join(f"{k} ({failed[k]})" for k in required) if required else "Contacts came back empty")
    for k, why in failed.items():  # an input tab Caleb has not created yet, or a passing error on one tab
        raw["warnings"].append(f"{TABS[k].split('!')[0].strip(chr(39))} not read: {why}")
        log(f"warning: {raw['warnings'][-1]}")
    return raw


def latest_gbrar():
    files = sorted(glob.glob(os.path.join(REPO, "aire", "market-data", "gbrar-*.json")))
    return json.load(open(files[-1], encoding="utf-8")) if files else None


def write_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    os.replace(tmp, path)


def run_once(exports=None, quiet=False):
    try:
        raw = read_exports(exports) if exports else read_google()
        raw["gbrar"] = latest_gbrar()
        data, rep = summarize(raw)
        hist = update_history(data.pop("history_row"))
        data["history_days"] = len(hist)
        write_json(OUT, data)
        if raw.get("_creds") is not None:
            try:
                b = build_brief(raw["_creds"], raw, datetime.now(CENTRAL))
                if b["notes"]:
                    log("brief: " + "; ".join(b["notes"]))
            except Exception as e:
                log(f"brief FAILED {type(e).__name__}: {e}")
        os.makedirs(REPORTS, exist_ok=True)
        today = datetime.now(CENTRAL).date().isoformat()
        text = report_text(rep, data["match"], today)
        with open(os.path.join(REPORTS, f"merge-{today}.md"), "w", encoding="utf-8") as f:
            f.write(text)
        log(f"ok deals={data['match']['deals']} unmatched={data['match']['unmatched']} contacts={data['people']['contacts']['value']}")
        if not quiet:
            print(text)
        return True
    except Exception as e:
        log(f"FAILED {type(e).__name__}: {e}  (last good data.json kept)")
        if os.path.exists(OUT):
            try:
                data = json.load(open(OUT, encoding="utf-8"))
                data["sync"].update({"ok": False, "failed_at": datetime.now(CENTRAL).isoformat(timespec="seconds"), "error": type(e).__name__})
                write_json(OUT, data)
            except Exception:
                pass
        if not quiet:
            raise
        return False


def cmd_auth():
    """One browser sign-in for the World's own token: Sheets, Gmail read and Calendar read.
    Written to ~/.aire/google-token-world.json. The CRM's token is never touched."""
    from google_auth_oauthlib.flow import InstalledAppFlow
    creds_file = os.getenv("AIRE_GOOGLE_CREDENTIALS", os.path.expanduser("~/.aire/credentials.json"))
    flow = InstalledAppFlow.from_client_secrets_file(creds_file, WORLD_SCOPES)
    creds = flow.run_local_server(port=0)
    os.makedirs(os.path.dirname(WORLD_TOKEN), exist_ok=True)
    with open(WORLD_TOKEN, "w", encoding="utf-8") as f:
        f.write(creds.to_json())
    print(f"saved {WORLD_TOKEN} (Sheets, Gmail read, Calendar read). The next sync writes brief.json with today's calendar.")


def table(data):
    rows = []
    for group, items in data.items():
        if not isinstance(items, dict):
            continue
        for k, v in items.items():
            if isinstance(v, dict) and "value" in v:
                rows.append((f"{group}.{k}", v["value"], v.get("period", ""), v.get("source", "")))
    w = max(len(r[0]) for r in rows)
    print(f"{'number':<{w}}  {'value':>14}  period          source")
    for k, val, per, src in rows:
        print(f"{k:<{w}}  {str(val):>14}  {per:<15} {src}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("cmd", nargs="?", default="sync", choices=["sync", "table", "auth"])
    p.add_argument("--from-exports", metavar="DIR")
    p.add_argument("--loop", action="store_true", help="sync every 5 minutes")
    p.add_argument("--every", type=int, default=300)
    a = p.parse_args()
    if a.cmd == "table":
        return table(json.load(open(OUT, encoding="utf-8")))
    if a.cmd == "auth":
        return cmd_auth()
    if a.loop:
        while True:
            run_once(a.from_exports, quiet=True)
            time.sleep(a.every)
    ok = run_once(a.from_exports)
    if ok:
        table(json.load(open(OUT, encoding="utf-8")))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
