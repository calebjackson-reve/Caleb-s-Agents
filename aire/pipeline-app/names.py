"""One place that decides how a person's name reads. Never "?Smith household", never the word household inside a name.

clean_name("?Smith household") -> "Smith"; "Ann Smith" stays; a person_id found in the optional local file
~/.aire/enrichment/first-names.json ({person_id: "First"}) reads "First Last". The file is read-only and optional.
The client twins of this are CC.name in static/crm-pages.js and shown() in static/map3d.html. Keep them in step.
"""
import json
import os
import re
from pathlib import Path

_LEAD = re.compile(r"^[\s?�]+")
_TAIL = re.compile(r"\s+household\s*$", re.I)
NAME_KEYS = frozenset({"display", "name", "contact", "who", "person", "owner", "client", "contact_name", "person_name",
                       "seller", "buyer", "sender"})
LIST_KEYS = frozenset({"household"})
_cache: dict = {"path": None, "mtime": None, "data": {}}


def first_names_path() -> Path:
    return Path(os.environ.get("AIRE_FIRST_NAMES") or (Path.home() / ".aire" / "enrichment" / "first-names.json"))


def first_names() -> dict:
    p = first_names_path()
    try:
        st = p.stat()
        m = (st.st_mtime_ns, st.st_size)
    except OSError:
        return {}
    if _cache["path"] != str(p) or _cache["mtime"] != m:
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
            data = {str(k): str(v).strip() for k, v in d.items() if v} if isinstance(d, dict) else {}
        except Exception:
            data = {}
        _cache.update(path=str(p), mtime=m, data=data)
    return _cache["data"]


def clean_name(s, person_id=None) -> str:
    t = _LEAD.sub("", str(s or "").strip())
    t = _LEAD.sub("", _TAIL.sub("", t)).strip()
    if t.lower() == "household":
        return ""
    if person_id is not None and t:
        first = first_names().get(str(person_id))
        if first and len(t.split()) == 1:
            return f"{first} {t}"
    return t


def clean_list_text(s) -> str:
    """A joined list of names ("A B, C D") cleaned name by name."""
    return ", ".join(x for x in (clean_name(p) for p in str(s or "").split(", ")) if x)


def clean_tree(o, pid=None):
    """Every name field in a payload, at any depth, through clean_name. Everything else is left as it is."""
    if isinstance(o, list):
        return [clean_tree(x, pid) for x in o]
    if not isinstance(o, dict):
        return o
    own = o.get("person_id") or o.get("id")
    if isinstance(own, (str, int)) and own != "":
        pid = str(own)
    out = {}
    for k, v in o.items():
        if k in NAME_KEYS and isinstance(v, str):
            out[k] = clean_name(v, pid)
        elif k in LIST_KEYS and isinstance(v, list):
            out[k] = [clean_name(x) if isinstance(x, str) else clean_tree(x, pid) for x in v]
        elif k in LIST_KEYS and isinstance(v, str):
            out[k] = clean_list_text(v)
        else:
            out[k] = clean_tree(v, pid)
    return out
