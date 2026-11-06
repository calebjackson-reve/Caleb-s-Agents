"""Pipeline's login, standard library only.

A request straight from this Mac (Host 127.0.0.1, localhost or [::1], no proxy headers) needs no login. Anything
else, such as the iPhone through Tailscale, needs a session from the passcode. The passcode is stored only as a
scrypt hash in the AIRE key folder (PIPELINE_LOGIN_FILE overrides). Sessions last 30 days and are kept as SHA-256
hashes in out/sessions.json. Five wrong passcodes in 10 minutes from one address lock that address for 10 minutes.

Set or change the passcode on the Mac:  python3 aire/pipeline-app/app.py --set-passcode
"""
from __future__ import annotations

import getpass
import hashlib
import hmac
import json
import os
import secrets
import threading
import time
from pathlib import Path

LOGIN_FILE = Path(os.getenv("PIPELINE_LOGIN_FILE") or Path.home() / ".aire" / "pipeline-login.json")
SESSION_DAYS = 30
COOKIE = "pl_session"
LOCAL_HOSTS = ("127.0.0.1", "localhost", "[::1]")
PROXY_HEADERS = ("X-Forwarded-For", "X-Forwarded-Host", "Tailscale-User-Login", "Forwarded")
PUBLIC_PATHS = {"/login", "/api/login", "/manifest.webmanifest", "/sw.js", "/icon-192.png", "/icon-512.png",
                "/apple-touch-icon.png", "/favicon.svg", "/login.css"}


def _kdf(passcode: str, salt: bytes) -> bytes:
    return hashlib.scrypt(passcode.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)


def set_passcode(passcode: str, path: Path = LOGIN_FILE) -> None:
    if len(passcode) < 10:
        raise ValueError("use at least 10 characters")
    salt = secrets.token_bytes(16)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"salt": salt.hex(), "hash": _kdf(passcode, salt).hex(), "set": time.strftime("%Y-%m-%d")}))
    os.chmod(path, 0o600)


def cmd_set_passcode() -> int:
    a = getpass.getpass("New Pipeline passcode (10 or more characters): ")
    if a != getpass.getpass("Again: "):
        print("They did not match. Nothing changed.")
        return 1
    set_passcode(a)
    print(f"Saved (as a hash) in {LOGIN_FILE}. Restart Pipeline; every phone session is signed out.")
    return 0


class Auth:
    def __init__(self, sessions: Path, login_file: Path = LOGIN_FILE, clock=time.time):
        self.sessions_path, self.login_file, self.clock = sessions, login_file, clock
        self.lock = threading.Lock()
        self.fails: dict[str, list[float]] = {}

    # ---- who needs a login
    @staticmethod
    def is_local(headers, port: int) -> bool:
        host = (headers.get("Host") or "").lower()
        return host in {f"{h}:{port}" for h in LOCAL_HOSTS} and not any(headers.get(h) for h in PROXY_HEADERS)

    def configured(self) -> bool:
        return self.login_file.exists()

    # ---- sessions
    def _load(self) -> dict:
        try:
            return json.loads(self.sessions_path.read_text())
        except (OSError, ValueError):
            return {}

    def _save(self, d: dict) -> None:
        self.sessions_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.sessions_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(d))
        os.chmod(tmp, 0o600)
        tmp.replace(self.sessions_path)

    def valid(self, cookie_header: str | None) -> bool:
        tok = self.token_from(cookie_header)
        if not tok:
            return False
        rec = self._load().get(hashlib.sha256(tok.encode()).hexdigest())
        return bool(rec and rec.get("expires", 0) > self.clock() and rec.get("since", 0) >= self._passcode_set_at())

    @staticmethod
    def token_from(cookie_header: str | None) -> str | None:
        for part in (cookie_header or "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == COOKIE and v:
                return v
        return None

    def _passcode_set_at(self) -> float:
        try:
            return self.login_file.stat().st_mtime
        except OSError:
            return float("inf")

    def login(self, passcode: str, addr: str) -> str:
        """A new session token, or ValueError with the reason."""
        now = self.clock()
        with self.lock:
            recent = [t for t in self.fails.get(addr, []) if now - t < 600]
            self.fails[addr] = recent
            if len(recent) >= 5:
                raise ValueError("too many tries, wait 10 minutes")
        if not self.configured():
            raise ValueError("no passcode is set on the Mac yet")
        rec = json.loads(self.login_file.read_text())
        ok = hmac.compare_digest(_kdf(str(passcode), bytes.fromhex(rec["salt"])).hex(), rec["hash"])
        if not ok:
            with self.lock:
                self.fails[addr].append(now)
            raise ValueError("wrong passcode")
        tok = secrets.token_urlsafe(32)
        with self.lock:
            d = {k: v for k, v in self._load().items() if v.get("expires", 0) > now}
            d[hashlib.sha256(tok.encode()).hexdigest()] = {"since": now, "expires": now + SESSION_DAYS * 86400}
            self._save(d)
        return tok

    def logout(self, cookie_header: str | None) -> None:
        tok = self.token_from(cookie_header)
        if tok:
            with self.lock:
                d = self._load()
                d.pop(hashlib.sha256(tok.encode()).hexdigest(), None)
                self._save(d)

    @staticmethod
    def cookie(token: str, secure: bool, clear: bool = False) -> str:
        age = 0 if clear else SESSION_DAYS * 86400
        return f"{COOKIE}={'' if clear else token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={age}" + ("; Secure" if secure else "")
