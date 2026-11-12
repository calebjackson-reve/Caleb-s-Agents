#!/usr/bin/env python3
"""Social-to-contact matching. Reads the daily engagers file, suggests which CRM person each Instagram or Facebook
handle might be, and keeps Caleb's Confirm / Not them answers in one local file. Deterministic: no model, no network,
no Instagram or Facebook call, no CRM or Deals write. A name alone never links anyone. Everything here is a
candidate until Caleb taps Confirm, and an unconfirmed candidate scores 0 and never gets a text.

THE ENGAGERS FILE (the daily browser check writes it; this module only reads it)

  $PIPELINE_SOCIAL_DIR/engagers-YYYY-MM-DD.json      default folder ~/.aire/social, outside git
  (engagers-YYYY-MM-DD.csv with the same field names is read only when that day's JSON is absent)

  [
    {
      "platform": "ig",                                   required. ig or fb (instagram / facebook also accepted)
      "handle": "example.mia.denham",                     required. with or without @
      "display_name": "Mia Example",                      optional
      "profile_url": "https://www.instagram.com/example.mia.denham/",   optional
      "action": "comment",                                required. like, comment, share, follow, story_reply (dm also accepted)
      "post_ref": "https://www.instagram.com/p/EXAMPLE-SOLD-1",        optional. URL or post id
      "seen_at": "2026-11-11T18:04:00-06:00",             required. ISO 8601 datetime or YYYY-MM-DD
      "bio_town": "Denham Springs",                       optional
      "post_type": "just_sold",                           optional. listing, just_sold, open_house, market_update, neighborhood, personal
      "said": "Example comment: love this one"            optional. stays on this Mac, never stored in matches.json
    }
  ]

The engagement day is the America/Chicago calendar date of seen_at. Every file inside the 14 day window is read, not
only today's. A row missing a required field, or with an action or platform it does not know, is skipped and counted.
Facebook verbs are aliased to the canonical action they count as, and are never stored as their own action:
reaction -> like; mention, tag -> comment; page_follow, friend_request -> follow. A Facebook handle shaped like
profile.php?id=NNN (with or without a URL prefix) is read as the numeric id NNN; any other handle is unchanged, and an
empty handle is still skipped.
Logs print counts only, never a name.

THE MATCH STORE  $PIPELINE_SOCIAL_DIR/matches.json  (outside git, written atomically)

  {"confirmed": [{"contact_id": "9001", "platform": "ig", "handle": "example.mia.denham", "confirmed_at": "2026-11-12T10:00:00-06:00"}],
   "rejected":  [{"contact_id": "9007", "platform": "ig", "handle": "example.handle.one",  "rejected_at":  "2026-11-12T10:01:00-06:00"}]}

No comment text, phone or email is ever stored there. A rejected pair is never suggested again; the same handle may
still be suggested for a different person.

CONFIDENCE (always a candidate, never auto-confirmed)
  high    the handle is already on file (handles.csv or a confirmed match), or a phone or email equals the CRM row
  medium  display name equals exactly one CRM person (town matches, or no town either side); or the username holds
          their first and last name and fits exactly one person
  low     last name only plus a matching town; a name that fits more than one person; a nickname match; a name that
          matches while the town on the profile is different
  none    a first name or nickname alone, with no last name and no town, is not suggested at all
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "enrichment" / "execution"))

import identity  # noqa: E402
import social_signals as social  # noqa: E402

LOOKBACK = 14
CHICAGO = ZoneInfo("America/Chicago")
ACTIONS = ("like", "comment", "share", "follow", "story_reply", "dm")
FB_ALIASES = {"reaction": "like", "mention": "comment", "tag": "comment", "page_follow": "follow", "friend_request": "follow"}
PLATFORMS = {"ig": "ig", "instagram": "ig", "fb": "fb", "facebook": "fb"}
SIGNAL_PLATFORM = {"ig": "instagram", "fb": "facebook"}
RANK = {"high": 3, "medium": 2, "low": 1}
MAX_PER_HANDLE = 3
NAME_FILE = re.compile(r"^engagers-(\d{4}-\d{2}-\d{2})\.(json|csv)$")
HANDLE_OK = re.compile(r"^[a-z0-9._-]{1,100}$")
FB_PROFILE_ID = re.compile(r"^(?:(?:https?://)?[^/\s?]+/)?profile\.php\?id=(\d+)$", re.IGNORECASE)

# Small common-nickname map. Two first names are a nickname pair when one group holds both.
NICKNAMES = [
    ("william", "bill", "billy", "will", "willy"), ("elizabeth", "liz", "lizzy", "beth", "betty", "eliza"),
    ("michael", "mike", "mikey"), ("robert", "bob", "bobby", "rob", "robbie"), ("james", "jim", "jimmy", "jamie"),
    ("katherine", "kathy", "kate", "katie", "catherine", "cathy"), ("richard", "rick", "rich", "ricky", "dick"),
    ("thomas", "tom", "tommy"), ("jennifer", "jen", "jenny"), ("christopher", "chris"), ("matthew", "matt"),
    ("joseph", "joe", "joey"), ("daniel", "dan", "danny"), ("anthony", "tony"), ("margaret", "maggie", "meg", "peggy"),
    ("susan", "sue", "suzy"), ("patricia", "pat", "patty", "trish"), ("deborah", "debbie", "deb"),
    ("stephen", "steven", "steve"), ("andrew", "andy", "drew"), ("alexander", "alex"), ("jonathan", "jon"),
    ("nicholas", "nick"), ("samuel", "sam"), ("benjamin", "ben"), ("timothy", "tim"), ("edward", "ed", "eddie", "ted"),
    ("charles", "chuck", "charlie"), ("david", "dave"), ("jessica", "jess"), ("rebecca", "becky", "becca"),
    ("jacqueline", "jackie"), ("victoria", "vicky", "tori"), ("kenneth", "ken", "kenny"), ("gregory", "greg"),
]
_NICK = {}
for _g in NICKNAMES:
    for _n in _g:
        _NICK.setdefault(_n, set()).update(_g)


# ---------------------------------------------------------------- folder and paths
def default_dir() -> Path:
    return Path.home() / ".aire" / "social"


def social_dir(override=None) -> Path:
    """$PIPELINE_SOCIAL_DIR, else ~/.aire/social. Never created here; the readers and writers create it when they need it."""
    raw = override if override is not None else os.getenv("PIPELINE_SOCIAL_DIR")
    return Path(raw).expanduser() if raw else default_dir()


def _ensure(d: Path) -> bool:
    try:
        d.mkdir(parents=True, exist_ok=True)
        return True
    except OSError:
        return False


def matches_path(d: Path | None = None) -> Path:
    return (d or social_dir()) / "matches.json"


# ---------------------------------------------------------------- small normalizers
def norm_platform(v) -> str:
    """'Instagram' / 'ig' -> 'ig', 'facebook' / 'fb' -> 'fb', anything else ''."""
    return PLATFORMS.get(str(v or "").strip().lower(), "")


def signal_platform(p: str) -> str:
    """The word social_signals, two_today and handles.csv use: ig -> instagram, fb -> facebook."""
    return SIGNAL_PLATFORM.get(norm_platform(p), "")


def norm_action(v) -> str:
    """A known action, with the Facebook verbs mapped onto it (FB_ALIASES). Anything else is ''."""
    a = str(v or "").strip().lower().replace(" ", "_").replace("-", "_")
    a = FB_ALIASES.get(a, a)
    return a if a in ACTIONS else ""


def norm_handle_row(v) -> str:
    """social_signals.norm_handle, plus: a profile.php?id=NNN handle (optional URL prefix) becomes NNN. Otherwise unchanged."""
    s = str(v or "").strip().lstrip("@")
    m = FB_PROFILE_ID.match(s)
    return m.group(1) if m else social.norm_handle(v)


def chicago_day(v) -> date | None:
    """seen_at -> the America/Chicago calendar date. A date-only value is that date. A datetime with no zone is Chicago time."""
    s = str(v or "").strip()
    if not s:
        return None
    try:
        if len(s) == 10:
            return date.fromisoformat(s)
        dt = datetime.fromisoformat(s.replace("Z", "+00:00").replace("z", "+00:00"))
    except ValueError:
        return None
    return (dt.astimezone(CHICAGO) if dt.tzinfo else dt).date()


def norm_town(v) -> str:
    """'Denham Springs, LA' -> 'denham springs'; 'St. George' and 'Saint George' agree. No fuzzy typo matching."""
    s = re.sub(r"[^a-z ]", " ", str(v or "").split(",")[0].lower().replace(".", " "))
    words = [{"st": "saint", "ste": "sainte", "ft": "fort", "mt": "mount"}.get(w, w) for w in s.split()]
    return " ".join(words)


def _letters(v) -> str:
    return re.sub(r"[^a-z]", "", str(v or "").lower())


def first_names_agree(a: str, b: str) -> bool:
    return bool(a) and bool(b) and a != b and b in _NICK.get(a, ())


# ---------------------------------------------------------------- the engagers files
def normalize_row(raw: dict) -> dict | None:
    """One raw engagers row -> a clean row, or None when a required field is missing or unknown."""
    r = {(k or "").strip().lower(): (v if isinstance(v, str) else ("" if v is None else str(v))).strip() for k, v in (raw or {}).items()}
    platform, action, day = norm_platform(r.get("platform")), norm_action(r.get("action")), chicago_day(r.get("seen_at") or r.get("date"))
    handle = norm_handle_row(r.get("handle", ""))
    if not (platform and action and day and handle and HANDLE_OK.match(handle)):
        return None
    return {"platform": platform, "handle": handle, "action": action, "day": day, "display_name": r.get("display_name", ""),
            "profile_url": r.get("profile_url", ""), "post_ref": r.get("post_ref") or r.get("post", ""), "bio_town": r.get("bio_town", ""),
            "post_type": r.get("post_type", ""), "said": r.get("said", ""), "phone": r.get("phone", ""), "email": r.get("email", "")}


def _read_file(path: Path) -> list | None:
    try:
        if path.suffix == ".json":
            data = json.loads(path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else None
        with path.open(newline="", encoding="utf-8-sig") as f:
            return list(csv.DictReader(f))
    except (OSError, ValueError):
        return None


def load_engagers(d: Path | None = None, until: date | None = None, since: date | None = None) -> tuple[list[dict], dict]:
    """Every engagers-YYYY-MM-DD file whose date is in [since, until] (default: the last 14 days up to today), JSON first
    and CSV only when that day's JSON is absent. Rows are normalized (platform ig/fb, `day` a date). Returns (rows, counts)."""
    d = d or social_dir()
    until = until or date.today()
    since = since or until - timedelta(days=LOOKBACK)
    counts = {"files": 0, "rows": 0, "skipped": 0, "bad_files": 0}
    _ensure(d)
    found: dict = {}
    try:
        names = sorted(p.name for p in d.iterdir())
    except OSError:
        return [], counts
    for n in names:
        m = NAME_FILE.match(n)
        day = chicago_day(m.group(1)) if m else None
        if m and day and since <= day <= until:
            found.setdefault(m.group(1), {})[m.group(2)] = d / n
    rows = []
    for key in sorted(found):
        path = found[key].get("json") or found[key]["csv"]
        raw = _read_file(path)
        if raw is None:
            counts["bad_files"] += 1
            continue
        counts["files"] += 1
        for item in raw:
            r = normalize_row(item) if isinstance(item, dict) else None
            if r is None or r["day"] < since or r["day"] > until:
                counts["skipped"] += 1
                continue
            rows.append(r)
            counts["rows"] += 1
    return rows, counts


def to_signal_rows(rows: list[dict], posts: list[dict] | None = None) -> list[dict]:
    """Normalized rows -> the shape two_today and social_signals read (platform instagram / facebook, `date`, `post`),
    with post types filled from the posts table when a row has none."""
    out = [{"handle": r["handle"], "platform": SIGNAL_PLATFORM[r["platform"]], "action": r["action"], "date": r["day"].isoformat(),
            "post": r["post_ref"], "post_type": r["post_type"], "said": r["said"]} for r in rows]
    return social.with_post_types(out, posts)


# ---------------------------------------------------------------- the match store
def _empty() -> dict:
    return {"confirmed": [], "rejected": []}


def load_matches(d: Path | None = None, strict: bool = False) -> dict:
    """The store as {"confirmed": [...], "rejected": [...]}. A missing file is empty. A file that cannot be read is empty,
    or an error when `strict`, so a write never replaces a file it could not read."""
    p = matches_path(d)
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return _empty()
    except (OSError, ValueError):
        if strict:
            raise ValueError("matches.json could not be read, so nothing was changed")
        return _empty()
    if not isinstance(data, dict):
        if strict:
            raise ValueError("matches.json could not be read, so nothing was changed")
        return _empty()
    clean = lambda k: [x for x in data.get(k) or [] if isinstance(x, dict) and x.get("contact_id") and norm_platform(x.get("platform")) and x.get("handle")]
    return {"confirmed": clean("confirmed"), "rejected": clean("rejected")}


def _save(d: Path, data: dict) -> None:
    _ensure(d)
    p = matches_path(d)
    tmp = p.with_name(p.name + ".tmp")
    tmp.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, p)


def _pair(x: dict) -> tuple:
    return (str(x.get("contact_id")), norm_platform(x.get("platform")), social.norm_handle(x.get("handle", "")))


def decide(d: Path | None, platform, handle, contact_id, action: str, at: datetime | None = None) -> dict:
    """Confirm or reject one pair. Writes only matches.json. Raises ValueError on bad input."""
    d = d or social_dir()
    plat, h, cid = norm_platform(platform), social.norm_handle(str(handle or "")), str(contact_id or "").strip()
    if action not in ("confirm", "reject"):
        raise ValueError("action must be confirm or reject")
    if not plat or not HANDLE_OK.match(h) or not cid or len(cid) > 64:
        raise ValueError("a platform, a handle and a contact are needed")
    stamp = (at or datetime.now(CHICAGO)).isoformat(timespec="seconds")
    data = load_matches(d, strict=True)
    key = (cid, plat, h)
    data["confirmed"] = [x for x in data["confirmed"] if _pair(x) != key]
    data["rejected"] = [x for x in data["rejected"] if _pair(x) != key]
    if action == "confirm":
        data["confirmed"].append({"contact_id": cid, "platform": plat, "handle": h, "confirmed_at": stamp})
    else:
        data["rejected"].append({"contact_id": cid, "platform": plat, "handle": h, "rejected_at": stamp})
    _save(d, data)
    return data


def confirmed_handle_rows(matches: dict) -> list[dict]:
    """Confirmed pairs in handles.csv shape, so two_today scores them like a handle on file."""
    return [{"person_id": str(x["contact_id"]), "platform": SIGNAL_PLATFORM[norm_platform(x["platform"])], "handle": social.norm_handle(x["handle"])}
            for x in matches.get("confirmed", [])]


# ---------------------------------------------------------------- the matcher
def people_from_ctx(ctx: dict) -> list[dict]:
    """CRM people from outreach.context rows, as the matcher reads them."""
    out = []
    for pid, r in (ctx.get("rows") or {}).items():
        out.append({"id": str(pid), "display": str(r.get("display") or ""), "city": str(r.get("city") or ""),
                    "phone": r.get("phone") or r.get("primary_phone") or "", "email": r.get("email") or ""})
    return out


def _person(p: dict) -> dict | None:
    key = identity.name_key(display=p.get("display"))
    if not key:
        return None
    parts = key.split()
    return {**p, "first": parts[0], "last": parts[1] if len(parts) > 1 else "", "key": key, "town": norm_town(p.get("city")),
            "pk": identity.phone_key(p.get("phone")), "ek": identity.email_key(p.get("email"))}


def _town_state(eng_town: str, person_town: str) -> str:
    if not eng_town or not person_town:
        return "none"
    return "match" if eng_town == person_town else "differs"


def _username_hits(handle: str, people: list[dict]) -> list[dict]:
    toks = [t for t in re.split(r"[._\-0-9]+", handle) if t]
    compact = _letters(handle)
    hits = []
    for p in people:
        f, l = p["first"], p["last"]
        if len(f) < 3 or len(l) < 3:
            continue
        if f in toks and l in toks and toks.index(f) < len(toks) - 1 - toks[::-1].index(l) or f + l in compact:
            hits.append(p)
    return hits


def _suggest(e: dict, people: list[dict]) -> dict:
    """{person_id: (confidence, [why parts], [evidence])} for one engager. Strongest evidence per person wins; parts merge."""
    found: dict = {}

    def add(p, conf, why, ev):
        old = found.get(p["id"])
        if old:
            conf2 = conf if RANK[conf] > RANK[old[0]] else old[0]
            found[p["id"]] = (conf2, old[1] + [w for w in why if w not in old[1]], old[2] + [x for x in ev if x not in old[2]], p)
        else:
            found[p["id"]] = (conf, list(why), list(ev), p)

    eng_town = norm_town(e.get("bio_town"))
    ek = identity.name_key(display=e.get("display_name"))
    eparts = ek.split()
    e_first, e_last = (eparts[0], eparts[1]) if len(eparts) > 1 else ((eparts[0], "") if eparts else ("", ""))
    for p in people:  # a phone or email on the engager equal to the CRM row
        if (identity.phone_key(e.get("phone")) and identity.phone_key(e.get("phone")) == p["pk"]) or (identity.email_key(e.get("email")) and identity.email_key(e.get("email")) == p["ek"]):
            add(p, "high", ["Contact details match."], ["contact"])
    if e_last:  # exact first and last name
        hits = [p for p in people if p["key"] == ek]
        for p in hits:
            t = _town_state(eng_town, p["town"])
            if len(hits) > 1:
                add(p, "low", [f"Display name fits {len(hits)} people in your CRM.", "Town matches." if t == "match" else ""], ["display_name"] + (["town"] if t == "match" else []))
            elif t == "differs":
                add(p, "low", ["Display name matches.", "The town on the profile is different."], ["display_name"])
            else:
                add(p, "medium", ["Display name matches.", "Town matches." if t == "match" else ""], ["display_name"] + (["town"] if t == "match" else []))
    uh = _username_hits(e["handle"], people)  # the username holds first and last name
    for p in uh:
        t = _town_state(eng_town, p["town"])
        if len(uh) > 1:
            add(p, "low", [f"Username fits {len(uh)} people in your CRM."], ["username"])
        elif t == "differs":
            add(p, "low", ["Username holds their name.", "The town on the profile is different."], ["username"])
        else:
            add(p, "medium", ["Username holds their name.", "Town matches." if t == "match" else ""], ["username"] + (["town"] if t == "match" else []))
    if e_last:  # nickname for the first name, same last name
        nick = [p for p in people if p["last"] == e_last and first_names_agree(e_first, p["first"])]
        for p in nick:
            t = _town_state(eng_town, p["town"])
            add(p, "low", ["First name is a common nickname, last name matches.", "Town matches." if t == "match" else ""], ["nickname"] + (["town"] if t == "match" else []))
    last = e_last or (e_first if len(eparts) == 1 else "")
    if last and eng_town and not found:  # last name only, plus a matching town: only when nothing stronger fit this handle
        fam = [p for p in people if p["last"] == last and _town_state(eng_town, p["town"]) == "match"]
        if len(fam) <= MAX_PER_HANDLE:
            for p in fam:
                add(p, "low", ["Last name matches.", "Town matches."], ["last_name", "town"])
    return found


def match(engagers: list[dict], people: list[dict], handles: list[dict] | None = None, matches: dict | None = None) -> dict:
    """Candidates for every engager handle not already linked.
    engagers  normalized rows (load_engagers)      people  dicts with id, display, city, phone, email (people_from_ctx)
    handles   handles.csv rows                     matches  the store (load_matches)
    Returns {"candidates": [...], "linked": [...], "unmatched": n}. `linked` are handles already on file or confirmed:
    high confidence, already scored by two_today, never asked about again."""
    matches = matches or _empty()
    plist = [q for q in (_person(p) for p in people) if q]
    by_id = {p["id"]: p for p in plist}
    on_file: dict = {}
    for r in handles or []:
        if r.get("handle") and norm_platform(r.get("platform")):
            on_file[(norm_platform(r["platform"]), social.norm_handle(r["handle"]))] = (str(r.get("person_id") or ""), "handles.csv")
    for x in matches.get("confirmed", []):
        on_file[(norm_platform(x["platform"]), social.norm_handle(x["handle"]))] = (str(x["contact_id"]), "confirmed")
    rejected = {_pair(x) for x in matches.get("rejected", [])}
    people_by_handle: dict = {}
    for e in engagers:
        h = people_by_handle.setdefault((e["platform"], e["handle"]), {"platform": e["platform"], "handle": e["handle"], "display_name": "", "profile_url": "",
                                                                        "bio_town": "", "phone": "", "email": "", "strength": 0, "last": date.min, "action": ""})
        for k in ("display_name", "profile_url", "bio_town", "phone", "email"):
            h[k] = h[k] or e.get(k, "")
        w = social.WEIGHT.get(e["action"], 1)
        if (w, e["day"]) >= (h["strength"], h["last"]):
            h["action"] = e["action"]
        h["strength"], h["last"] = max(h["strength"], w), max(h["last"], e["day"])
    cands, linked, unmatched = [], [], 0
    for key, h in people_by_handle.items():
        base = {"platform": h["platform"], "handle": h["handle"], "display_name": h["display_name"], "profile_url": h["profile_url"],
                "action": h["action"], "seen": h["last"].isoformat()}
        if key in on_file:
            pid, src = on_file[key]
            who = by_id.get(pid)
            linked.append({**base, "contact_id": pid, "contact": (who or {}).get("display", ""), "contact_city": (who or {}).get("city", ""), "confidence": "high",
                           "why": "This handle is already on file for this person." if src == "handles.csv" else "You already confirmed this handle.", "evidence": [src]})
            continue
        found = _suggest(h, plist)
        rows = []
        for pid, (conf, why, ev, p) in found.items():
            if (pid, h["platform"], h["handle"]) in rejected:
                continue
            rows.append({**base, "contact_id": pid, "contact": p["display"], "contact_city": p["city"], "confidence": conf,
                         "why": " ".join(w for w in why if w), "evidence": ev, "_s": h["strength"]})
        rows.sort(key=lambda c: (-RANK[c["confidence"]], c["contact"]))
        rows = rows[:MAX_PER_HANDLE]
        if not rows:
            unmatched += 1
        cands += rows
    cands.sort(key=lambda c: (-c["_s"], -RANK[c["confidence"]], -date.fromisoformat(c["seen"]).toordinal(), c["handle"], c["contact"]))
    for c in cands:
        c.pop("_s", None)
    return {"candidates": cands, "linked": linked, "unmatched": unmatched}


# ---------------------------------------------------------------- what the screens and the drafter read
def for_ctx(signal_rows: list[dict], handles: list[dict], day: date) -> dict:
    """{person_id: [recent engagement, ...]} for outreach.reason_for (ctx["social"]): only rows whose handle is on file or
    confirmed, inside the 14 day window ending `day`. Holds no text, only action, post type, platform and day."""
    who = {(r.get("platform", "").lower(), social.norm_handle(r.get("handle", ""))): str(r.get("person_id") or "") for r in handles if r.get("handle")}
    out: dict = {}
    for e in signal_rows:
        try:
            d = date.fromisoformat(str(e.get("date"))[:10])
        except ValueError:
            continue
        pid = who.get((str(e.get("platform", "")).lower(), social.norm_handle(e.get("handle", ""))), "")
        if pid and 0 <= (day - d).days <= LOOKBACK:
            out.setdefault(pid, []).append({"day": d, "action": e.get("action", ""), "post_type": e.get("post_type", ""), "platform": norm_platform(e.get("platform")),
                                            "question": "?" in (e.get("said") or "")})
    return out


def view(d: Path | None, ctx: dict, handles: list[dict], day: date, cap: int = 60) -> dict:
    """The payload the Fix list reads: pending candidates (no phone, email or message text), and the confirmed count."""
    d = d or social_dir()
    rows, counts = load_engagers(d, until=day)
    m = load_matches(d)
    r = match(rows, people_from_ctx(ctx), handles, m)
    keep = ("platform", "handle", "display_name", "profile_url", "contact_id", "contact", "contact_city", "confidence", "why", "action", "seen")
    return {"pending": [{k: c[k] for k in keep} for c in r["candidates"][:cap]], "pending_total": len(r["candidates"]),
            "confirmed": len(m["confirmed"]), "linked": len(r["linked"]), "rows": counts["rows"], "files": counts["files"]}
