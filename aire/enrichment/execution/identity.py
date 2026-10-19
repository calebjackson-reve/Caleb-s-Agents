"""Identity normalization and matching. One job: decide whether two records are the same person.
Deterministic, no model, no network."""
from __future__ import annotations
import re

_NAME_JUNK = re.compile(r"[^a-z ]")


def phone_key(raw: str | None) -> str:
    """'(225) 405-4181' / '225.405.4181' / '+12254054181' -> '+12254054181'. Empty when not a 10/11 digit US number."""
    d = re.sub(r"\D", "", raw or "")
    if len(d) == 11 and d.startswith("1"):
        d = d[1:]
    return f"+1{d}" if len(d) == 10 else ""


def email_key(raw: str | None) -> str:
    e = (raw or "").strip().lower()
    return e if re.fullmatch(r"[\w.+-]+@[\w-]+\.[\w.]+", e) else ""


def name_key(first: str | None = "", last: str | None = "", display: str | None = "") -> str:
    """'Paul & Cynthia Brown' -> 'paul brown'. First token plus last token, lowercase, letters only."""
    s = display or f"{first or ''} {last or ''}"
    s = _NAME_JUNK.sub("", s.lower().replace("&", " ")).strip()
    parts = [t for t in s.split() if t != "and"]
    if len(parts) >= 2:
        return f"{parts[0]} {parts[-1]}"
    return parts[0] if parts else ""


def handle_key(raw: str | None) -> str:
    """An iMessage handle is a phone or an email. Normalize whichever it is."""
    return email_key(raw) or phone_key(raw)


class Index:
    """Index of CRM people by phone, email and name for matching inbound signals and other lists."""

    def __init__(self, people: list[dict]):
        self.by_phone: dict[str, dict] = {}
        self.by_email: dict[str, dict] = {}
        self.by_name: dict[str, list[dict]] = {}
        for p in people:
            if (k := phone_key(p.get("primary_phone"))):
                self.by_phone.setdefault(k, p)
            if (k := email_key(p.get("email"))):
                self.by_email.setdefault(k, p)
            if (k := name_key(p.get("first"), p.get("last"), p.get("display"))):
                self.by_name.setdefault(k, []).append(p)

    def match(self, phone: str = "", email: str = "", first: str = "", last: str = "", display: str = "") -> tuple[dict | None, str]:
        """Returns (person, how). how is phone, email, name, name-ambiguous or none."""
        if (k := phone_key(phone)) and k in self.by_phone:
            return self.by_phone[k], "phone"
        if (k := email_key(email)) and k in self.by_email:
            return self.by_email[k], "email"
        if (k := name_key(first, last, display)) and k in self.by_name:
            hits = self.by_name[k]
            return (hits[0], "name") if len(hits) == 1 else (hits[0], "name-ambiguous")
        return None, "none"
