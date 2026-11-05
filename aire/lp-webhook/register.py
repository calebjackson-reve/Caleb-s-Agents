#!/usr/bin/env python3
"""Register the Luxury Presence lead webhook, read only until --yes.

Luxury Presence pushes every lead event (sign-up, contact form, home value, search, favorite,
listing view) to a URL you register once. This script manages that registration from the Mac
with the account's API key. The receiver is website-rebuild/functions/lp-webhook.gs, which
writes the event into the Website leads sheet that crm.py already imports.

  export LP_API_KEY=...            # app.luxurypresence.com, Profile, API keys (admin only). Env only, never a file.
  python3 register.py list                                     # what is registered now (read only)
  python3 register.py create --url "https://script.google.com/macros/s/.../exec?k=SECRET" [--name "AIRE leads"]
  python3 register.py create ... --yes                         # actually send it (dry run otherwise)
  python3 register.py get ID | delete ID [--yes]
  python3 register.py sign payload.json --url URL --secret S   # the x-lp-signature LP would send, to test a receiver
  python3 register.py --test                                   # offline checks

Secrets stay in the environment: LP_API_KEY for the API, LP_WEBHOOK_SECRET for the signing
secret (optional; Apps Script cannot read the signature header, so the URL token is the check
that matters there). Nothing here stores a key.
"""
import argparse
import hashlib
import hmac
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

BASE = os.getenv("LP_API_BASE", "https://api.luxurypresence.com")
PATH = "/crm/v1/webhooks"
EVENTS = ["leads"]  # the only event Luxury Presence publishes today; activityType says what happened


def call(method, path, body=None, key=None):
    key = key or os.getenv("LP_API_KEY")
    if not key:
        sys.exit("LP_API_KEY is not set. Nothing sent.")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"x-api-key": key, "Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        return e.code, {"error": raw[:2000]}


def signature(secret: str, timestamp_ms: str, url: str, payload: dict) -> str:
    """x-lp-signature v1: HMAC-SHA256 hex over timestamp + url + JSON.stringify(payload).
    JSON.stringify writes compact JSON with no spaces, keys in insertion order, non-ASCII kept."""
    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    return hmac.new(secret.encode(), (str(timestamp_ms) + url + body).encode(), hashlib.sha256).hexdigest()


def create_body(url, name, secret=None, headers=None, active=True):
    body = {"name": name, "url": url, "events": EVENTS, "isActive": active}
    if secret:
        body["secret"] = secret
    if headers:
        body["headers"] = headers
    return body


def redact(obj):
    if isinstance(obj, dict):
        return {k: ("<set>" if k in ("secret", "x-api-key") and v else redact(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [redact(x) for x in obj]
    return obj


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", nargs="?", choices=["list", "create", "get", "delete", "sign"])
    ap.add_argument("arg", nargs="?", help="webhook id for get/delete, payload file for sign")
    ap.add_argument("--url")
    ap.add_argument("--name", default="AIRE leads (Website leads sheet)")
    ap.add_argument("--secret", help="for sign only; create reads LP_WEBHOOK_SECRET from the environment")
    ap.add_argument("--timestamp", help="for sign: ms since epoch, default now")
    ap.add_argument("--yes", action="store_true", help="send the create or delete; dry run otherwise")
    ap.add_argument("--test", action="store_true")
    a = ap.parse_args()
    if a.test:
        return test()
    if not a.cmd:
        ap.print_help()
        return
    if a.cmd == "list":
        st, res = call("GET", PATH)
        print(st, json.dumps(redact(res), indent=1))
    elif a.cmd == "get":
        st, res = call("GET", f"{PATH}/{a.arg}")
        print(st, json.dumps(redact(res), indent=1))
    elif a.cmd == "create":
        if not a.url or not a.url.startswith("https://"):
            sys.exit("--url must be an https URL (the Apps Script web app URL with ?k=SECRET)")
        body = create_body(a.url, a.name, os.getenv("LP_WEBHOOK_SECRET"))
        print("POST", BASE + PATH, json.dumps(redact(body), indent=1))
        if not a.yes:
            print("dry run: nothing sent. Add --yes to register it.")
            return
        st, res = call("POST", PATH, body)
        print(st, json.dumps(redact(res), indent=1))
    elif a.cmd == "delete":
        print("DELETE", f"{BASE}{PATH}/{a.arg}")
        if not a.yes:
            print("dry run: nothing sent. Add --yes to delete it.")
            return
        st, res = call("DELETE", f"{PATH}/{a.arg}")
        print(st, json.dumps(res, indent=1))
    elif a.cmd == "sign":
        if not (a.arg and a.url and a.secret):
            sys.exit("sign needs: payload.json --url URL --secret SECRET")
        payload = json.load(open(a.arg, encoding="utf-8"))
        ts = a.timestamp or str(int(time.time() * 1000))
        print(json.dumps({"x-lp-timestamp": ts, "x-lp-signature": signature(a.secret, ts, a.url, payload), "x-lp-signature-version": "v1"}, indent=1))


def test():
    ok = True

    def check(name, cond):
        nonlocal ok
        ok &= bool(cond)
        print(("ok   " if cond else "FAIL ") + name)

    p = {"leadId": "abc", "activityType": "SIGNUP", "leadEmail": "x@example.com", "n": 1, "tags": ["a", "b"]}
    s1 = signature("s", "1700000000000", "https://example.com/hook", p)
    s2 = signature("s", "1700000000000", "https://example.com/hook", json.loads(json.dumps(p)))
    check("signature is deterministic and 64 hex chars", s1 == s2 and len(s1) == 64 and all(c in "0123456789abcdef" for c in s1))
    check("signature changes with the secret", signature("t", "1700000000000", "https://example.com/hook", p) != s1)
    check("signature changes with the url", signature("s", "1700000000000", "https://example.com/other", p) != s1)
    check("signature changes with the timestamp", signature("s", "1700000000001", "https://example.com/hook", p) != s1)
    body = json.dumps(p, separators=(",", ":"), ensure_ascii=False)
    check("body is compact like JSON.stringify", body == '{"leadId":"abc","activityType":"SIGNUP","leadEmail":"x@example.com","n":1,"tags":["a","b"]}')
    manual = hmac.new(b"s", ("1700000000000" + "https://example.com/hook" + body).encode(), hashlib.sha256).hexdigest()
    check("matches a by-hand HMAC of timestamp+url+body", manual == s1)
    b = create_body("https://script.google.com/macros/s/x/exec?k=tok", "AIRE leads", secret="sec")
    check("create body has name, url, events=[leads], isActive, secret", b["events"] == ["leads"] and b["isActive"] is True and b["secret"] == "sec" and b["url"].endswith("?k=tok"))
    check("redact hides the secret", redact(b)["secret"] == "<set>" and redact(b)["url"] == b["url"])
    src = open(__file__, encoding="utf-8").read()
    check("no key-shaped string in this file", not re.search(r"[A-Za-z0-9_-]{32,}", src.replace("script.google.com/macros/s/EXAMPLE", "")))
    print("all checks passed" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main() or 0)
