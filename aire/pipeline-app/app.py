#!/usr/bin/env python3
"""Pipeline, Caleb's one daily tool. A local app: this file is the server, static/ is the screen.

  python3 app.py                 # real feed, opens on http://127.0.0.1:4747
  python3 app.py --demo          # made-up people from fixtures/, no CRM writes, for screenshots and trying it out
  python3 app.py --test          # offline checks

Reads (all git-ignored, they stay on the Mac):
  ../crm/feed.json                 what the CRM engine computed: touches due, tasks, deals, new leads, counts, header_ok
  ../follow-up/out/text-queue.json pre-written text drafts and the reply-first list with their last three texts
  ../follow-up/out/email-queue.json pre-written email drafts
  ../command-reader/out/status.json Command reader state: ok, login needed, layout changed

Writes back through one path only: ../crm/crm.py --json --client pipeline <touch|done|task|deal|note|stage|dnc>.
The engine prints one JSON object, applies its write gates and logs the write with Client = pipeline.

Pipeline is the one sender (Caleb, 2026-10-20). Every send goes through three checks here before anything leaves:
  1. Do Not Contact: a dry-run `touch` through the engine's gate. A DNC person is refused by the engine, so the send is refused.
  2. Daily cap: PIPELINE_MAX_TEXTS and PIPELINE_MAX_EMAILS (25 each) counted from out/send-log.json for today, Central time.
  3. Sender mode: PIPELINE_SENDER=live sends for real (Messages for texts, Gmail for email). Anything else is a dry run that
     logs the send and sends nothing. The screen shows which mode it is in.
After a real send the engine logs it with `touch`, so the person drops off tomorrow's list.

Two optional paid services, each off until its key is present (env, or ~/.aire/pipeline.env as KEY=VALUE lines):
  ANTHROPIC_API_KEY     turns on the Claude Q&A step: a question the word-matching intents cannot answer goes to Claude
                        with a compact view of today's feed (names, bands, next actions, their last texts, tasks, deals,
                        leads) and the spoken answer comes back. PIPELINE_ASK_MODEL (default claude-opus-5-5).
  ELEVENLABS_API_KEY    turns on the ElevenLabs voice for everything Pipeline says. ELEVENLABS_VOICE_ID (default Daniel,
                        British), ELEVENLABS_MODEL (default eleven_flash_v2_5). Without it the browser's own voice talks.
  ELEVENLABS_SPEECH_ENGINE_ID with both keys above turns on calls: ElevenLabs does the listening and talking over
                        WebRTC and speech_engine.py (this folder) answers with Claude. /api/voice/token mints the browser token.
  All of it spends money per call. out/voice-usage.json keeps the running count and the screen shows it.

Environment:
  PIPELINE_PORT      default 4747
  PIPELINE_PYTHON    Python for crm.py, default ~/.aire/venv/bin/python when it exists, else this interpreter
  PIPELINE_SENDER    live | dry (default dry)
  PIPELINE_MAX_TEXTS, PIPELINE_MAX_EMAILS   default 25
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import platform
import re
import subprocess
import tempfile
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
AIRE = HERE.parent
sys.path.insert(0, str(HERE))
import jarvis  # noqa: E402  (the voice's tools and tool loop)
import cc  # noqa: E402  (Command Center numbers)
import auth  # noqa: E402  (the login for anything but this Mac)
import push  # noqa: E402  (phone alerts)
import cc_ask  # noqa: E402  (Ask Claude on every Command Center page)
STATIC = HERE / "static"
FIXTURES = HERE / "fixtures"
OUT = HERE / "out"
CENTRAL = ZoneInfo("America/Chicago")

ENV_FILE = Path.home() / ".aire" / "pipeline.env"


def load_env_file(path: Path = ENV_FILE) -> int:
    """KEY=VALUE lines, never committed. Real env wins over the file."""
    n = 0
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v
                n += 1
    except OSError:  # missing, or a sandbox that blocks the key folder: run without keys
        pass
    return n


# PIPELINE_DATA_ROOT points the CRM views at another checkout's aire/ folder (a branch preview reading the live
# feed, drafts, map files and engine). The send log never moves: a preview's dry runs must not count against the
# live daily caps.
DATA = Path(os.getenv("PIPELINE_DATA_ROOT") or AIRE).expanduser()
PATHS = {
    "feed": DATA / "crm" / "feed.json",
    "text_queue": DATA / "follow-up" / "out" / "text-queue.json",
    "email_queue": DATA / "follow-up" / "out" / "email-queue.json",
    "command_status": DATA / "command-reader" / "out" / "status.json",
    "send_log": OUT / "send-log.json",
    "voice_usage": OUT / "voice-usage.json",
    "feed_log": Path.home() / ".aire" / "logs" / "feed.log",
    "farms": DATA / "map-crm" / "farms.local.json",
    "dismissed": DATA / "map-crm" / "cache" / "dismissed.json",
    "lists": DATA / "map-crm" / "out",
}
# Sonnet 5.5: on 4 real questions (2026-10-29) it answered in 2.5 to 3.1 s with complete, accurate answers; Opus 5.5
# took 3.4 to 5.7 s and cut one answer off; Haiku 5.5 was faster but miscounted and dropped an answer.
ASK_MODEL_DEFAULT = "claude-sonnet-5-5"
# Prices: jarvis.PRICES (all four token meters, read from the live pricing page 2026-10-29).
ELEVEN_VOICE_DEFAULT = "onwK4e9ZLuTAKqWW03F9"   # ElevenLabs premade "Daniel", British
ELEVEN_MODEL_DEFAULT = "eleven_flash_v2_5"
ASK_SYSTEM = """You are Pipeline, the voice of Caleb Jackson's daily real estate tool. Caleb is a REALTOR with Keller Williams
First Choice in the Baton Rouge area. You answer out loud, so keep it to two or three short sentences, plain words, no
lists, no markdown. Answer only from the pipeline data you are given. If the data does not say, say you don't have that
and name what you do have. Never invent a name, number or date. Never promise to send, text, email or schedule anything:
Pipeline only sends when Caleb presses send himself. Warm, direct, natural; no em dashes."""
DEMO_PATHS = {
    "feed": FIXTURES / "demo-feed.json",
    "text_queue": FIXTURES / "demo-text-queue.json",
    "email_queue": FIXTURES / "demo-email-queue.json",
    "command_status": FIXTURES / "demo-status.json",
    "farms": OUT / "demo-farms.json",
    "dismissed": OUT / "demo-dismissed.json",
    "lists": OUT / "demo-lists",
}
CRM_PY = DATA / "crm" / "crm.py"
REFRESH_SH = DATA / "crm" / "refresh_feed.sh"
SHEET_URL = "https://docs.google.com/spreadsheets/d/{sheet_id}/edit"
COMMAND_URL = "https://agent.kw.com/command"
DEAL_STAGES = ["lead", "consult", "active", "showing", "under_contract", "closed", "lost"]


def now() -> datetime:
    return datetime.now(CENTRAL)


def today() -> date:
    return now().date()


def python_for_crm() -> str:
    env = os.getenv("PIPELINE_PYTHON")
    if env:
        return env
    venv = Path.home() / ".aire" / "venv" / "bin" / "python"
    return str(venv) if venv.exists() else sys.executable


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default
    except Exception as e:  # half-written or corrupt file: the screen says so instead of crashing
        return {"_error": f"{path.name}: {type(e).__name__}"} if isinstance(default, dict) else default


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def file_age_minutes(path: Path) -> int | None:
    try:
        return int((time.time() - path.stat().st_mtime) / 60)
    except FileNotFoundError:
        return None


# ------------------------------------------------------------------ CRM calls


class CRMError(Exception):
    pass


class EngineCRM:
    """Every write is `python crm.py --json --client pipeline ...`. One JSON object back, parsed here."""

    def __init__(self, python: str, crm_py: Path = CRM_PY):
        self.python, self.crm_py = python, crm_py

    def run(self, args: list[str], dry_run: bool = False, timeout: int = 180) -> dict:
        cmd = [self.python, str(self.crm_py), "--json", "--client", "pipeline"] + (["--dry-run"] if dry_run else []) + args
        try:
            p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=self.crm_py.parent)
        except subprocess.TimeoutExpired:
            raise CRMError("crm.py did not answer in time. Nothing confirmed.")
        except FileNotFoundError:
            raise CRMError(f"Python for crm.py not found: {self.python}")
        line = next((l for l in reversed(p.stdout.strip().splitlines()) if l.startswith("{")), "")
        try:
            out = json.loads(line)
        except Exception:
            raise CRMError((p.stderr.strip() or p.stdout.strip() or "crm.py printed nothing")[-300:])
        if not out.get("ok"):
            raise CRMError(str(out.get("error") or "refused"))
        return out

    def plain(self, args: list[str], timeout: int = 600) -> str:
        """Non-write commands (ingest, feed, sync-tasks) print text, not JSON."""
        cmd = [self.python, str(self.crm_py)] + args
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=self.crm_py.parent)
        if p.returncode != 0:
            raise CRMError((p.stderr.strip() or p.stdout.strip())[-300:])
        return p.stdout


class DemoCRM:
    """--demo: nothing reaches the sheet. Writes change the in-memory fixtures so the screen reacts the same way."""

    def __init__(self, state: "State"):
        self.state = state
        self.log: list[list[str]] = []

    def run(self, args: list[str], dry_run: bool = False, timeout: int = 0) -> dict:
        self.log.append(args)
        feed = self.state.feed()
        cmd = args[0]
        if cmd == "touch":
            pid = args[1]
            if any(r["person_id"] == pid for r in feed.get("dnc_demo", [])):
                raise CRMError(f"person_id {pid} is Do_Not_Contact; a touch is not logged")
            if not dry_run:
                feed["touches_due"] = [r for r in feed["touches_due"] if r["person_id"] != pid]
                feed["counts"]["touches_due"] = max(0, feed["counts"]["touches_due"] - 1)
            return {"ok": True, "result": {"person_id": pid, "Last_Touch": today().isoformat()}}
        if cmd == "done":
            tid = args[1]
            before = len(feed["tasks"])
            feed["tasks"] = [t for t in feed["tasks"] if t.get("task_id") != tid]
            if len(feed["tasks"]) == before:
                raise CRMError("no such open task")
            feed["counts"]["tasks_open"] = len(feed["tasks"])
            return {"ok": True, "result": {"task_id": tid, "status": "done"}}
        if cmd == "task":
            pid, text = args[1], args[2]
            due = args[args.index("--due") + 1] if "--due" in args else today().isoformat()
            display = next((r["display"] for r in feed["touches_due"] + feed["new_leads"] if r["person_id"] == pid), "")
            t = {"task_id": f"demo{len(self.log):04d}", "person_id": pid, "display": display, "task": text, "due": due,
                 "status": "open", "source": "pipeline", "created_at": now().isoformat(timespec="seconds"), "done_at": "",
                 "overdue": due < today().isoformat()}
            feed["tasks"].append(t)
            feed["tasks"].sort(key=lambda t: t["due"] or "9999")
            feed["counts"]["tasks_open"] = len(feed["tasks"])
            return {"ok": True, "result": t}
        if cmd == "deal":
            addr = args[1]
            d = next((d for d in feed["deals"] if d["address"].lower() == addr.lower()), None)
            if d is None:
                if "--create" not in args:
                    raise CRMError(f"no deal at {addr}; pass create to add one")
                d = {"deal_id": addr.lower().replace(" ", "-"), "person_id": "", "display": "", "address": addr, "side": "",
                     "stage": "lead", "price": "", "expected_close": "", "next_step": "", "last_event": "", "last_event_at": "",
                     "source": "pipeline", "updated_at": ""}
                feed["deals"].append(d)
            flags = {"--stage": "stage", "--price": "price", "--close": "expected_close", "--next-step": "next_step",
                     "--event": "last_event", "--side": "side"}
            for flag, key in flags.items():
                if flag in args:
                    d[key] = args[args.index(flag) + 1]
            d["updated_at"] = now().isoformat(timespec="seconds")
            if d["stage"] in ("closed", "lost"):
                feed["deals"] = [x for x in feed["deals"] if x is not d]
            feed["counts"]["deals_live"] = len(feed["deals"])
            return {"ok": True, "result": d}
        if cmd == "lead":
            name = args[1]
            if any(r.get("display", "").lower() == name.lower() for r in feed.get("new_leads", [])):
                raise CRMError(f"{name} already exists")
            pid = str(9000 + len(self.log))
            src = args[args.index("--source") + 1] if "--source" in args else "pipeline"
            lead = {"person_id": pid, "display": name, "phone": "", "email": "", "source": src, "received": today().isoformat(),
                    "next_action": "Reach out about the Market Monitor row"}
            feed.setdefault("new_leads", []).insert(0, lead)
            return {"ok": True, "result": {"person_id": pid, "display": name, "Stage": "new lead", "band": "warm"}}
        if cmd == "note":
            return {"ok": True, "result": {"person_id": args[1], "note": args[2]}}
        if cmd == "stage":
            return {"ok": True, "result": {"person_id": args[1], "Stage": args[2]}}
        if cmd == "dnc":
            feed.setdefault("dnc_demo", []).append({"person_id": args[1]})
            feed["touches_due"] = [r for r in feed["touches_due"] if r["person_id"] != args[1]]
            return {"ok": True, "result": {"person_id": args[1], "Do_Not_Contact": "YES", "changed": True}}
        raise CRMError(f"unknown write {cmd}")

    def plain(self, args: list[str], timeout: int = 0) -> str:
        self.log.append(args)
        return "demo: " + " ".join(args)


# ----------------------------------------------------------------------- state


class State:
    def __init__(self, demo: bool = False, paths: dict | None = None, send_log: Path | None = None):
        self.demo = demo
        self.paths = dict(paths or (DEMO_PATHS if demo else PATHS))
        self.send_log_path = send_log or (OUT / ("demo-send-log.json" if demo else "send-log.json"))
        if demo and send_log:  # tests: the map files land next to their send log, not in out/
            self.paths.update(farms=send_log.parent / "farms.json", dismissed=send_log.parent / "dismissed.json", lists=send_log.parent / "lists")
        self.max_texts = int(os.getenv("PIPELINE_MAX_TEXTS", "25"))
        self.max_emails = int(os.getenv("PIPELINE_MAX_EMAILS", "25"))
        self.sender = "dry" if demo else (os.getenv("PIPELINE_SENDER", "dry").strip().lower() or "dry")
        self.crm = DemoCRM(self) if demo else EngineCRM(python_for_crm())
        self.refresh = {"running": False, "started": "", "finished": "", "ok": None, "detail": ""}
        self.usage_path = (send_log.parent / "voice-usage.json") if send_log else OUT / ("demo-voice-usage.json" if demo else "voice-usage.json")
        self.ask_model = os.getenv("PIPELINE_ASK_MODEL", ASK_MODEL_DEFAULT)
        self.ask_key = "" if demo else os.getenv("ANTHROPIC_API_KEY", "")
        self.eleven_key = "" if demo else os.getenv("ELEVENLABS_API_KEY", "")
        self.eleven_voice = os.getenv("ELEVENLABS_VOICE_ID", ELEVEN_VOICE_DEFAULT)
        self.eleven_model = os.getenv("ELEVENLABS_MODEL", ELEVEN_MODEL_DEFAULT)
        self.speech_engine_id = "" if demo else os.getenv("ELEVENLABS_SPEECH_ENGINE_ID", "")
        self.lock = threading.Lock()
        self._warm: dict = {}
        self._demo_cache: dict | None = None
        # Live texting needs macOS to let this Python control Messages. Ask once at start, so the Allow box shows
        # now and a missing permission is on screen before Caleb presses Send.
        self.messages = {"checked": False, "ok": None, "detail": ""}
        if self.sender == "live" and not demo and platform.system() == "Darwin":
            threading.Thread(target=self.check_messages, daemon=True).start()
        self.started = now().isoformat(timespec="seconds")
        # Command Center reads: out/cc/ on the Mac (written by the sync), made-up fixtures in demo.
        self.ask_log = (send_log.parent / "ask-usage.json") if send_log else OUT / ("demo-ask-usage.json" if demo else "ask-usage.json")
        self.push_subs = (send_log.parent if send_log else OUT) / ("demo-push-subs.json" if demo else "push-subs.json")
        self.push_key = (send_log.parent / "push-keys.json") if send_log else (OUT / "demo-push-keys.json" if demo else push.KEY_FILE)
        self.auth = auth.Auth((send_log.parent if send_log else OUT) / ("demo-sessions.json" if demo else "sessions.json"),
                              login_file=Path(os.getenv("PIPELINE_LOGIN_FILE") or auth.LOGIN_FILE))
        self.cc_dir = cc.demo_folder(FIXTURES / "cc", Path(tempfile.mkdtemp(prefix="pipeline-cc-"))) if demo else OUT / "cc"

    # ---- reads
    def feed(self) -> dict:
        if self.demo:
            if self._demo_cache is None:
                self._demo_cache = read_json(self.paths["feed"], {})
            return self._demo_cache
        return read_json(self.paths["feed"], {})

    def check_messages(self) -> dict:
        try:
            p = subprocess.run(["osascript", "-e", 'tell application "Messages" to count accounts'], capture_output=True, text=True, timeout=90)
            ok = p.returncode == 0
            detail = "" if ok else (p.stderr.strip() or "no answer")[-200:]
        except subprocess.TimeoutExpired:
            ok, detail = False, "no answer from Messages (an Allow box may be waiting)"
        self.messages = {"checked": True, "ok": ok, "detail": detail}
        return self.messages

    def send_log(self) -> list[dict]:
        log = read_json(self.send_log_path, [])
        return log if isinstance(log, list) else []

    def cc_payload(self) -> dict:
        """The Command Center payload: one lead list, one deal source, built with the CRM feed. A lead counts as
        replied once a real (not dry run) text or email went to that person."""
        sent = {r.get("person_id") for r in self.send_log() if r.get("status") == "sent" and r.get("person_id")}
        return cc.build(self.cc_dir, feed=self.feed() or {}, replied=sent)

    def sent_today(self) -> dict:
        d = today().isoformat()
        rows = [r for r in self.send_log() if r.get("at", "").startswith(d) and r.get("status") in ("sent", "dry-run")]
        return {"texts": sum(1 for r in rows if r["kind"] == "text"), "emails": sum(1 for r in rows if r["kind"] == "email")}

    def last_texts(self, days: int = 30, recheck_minutes: int = 30, db: Path | None = None) -> dict:
        """The newest text to each person in the last `days`, for the "Texted 9:42 AM · delivered" line on their card.
        A live text that Messages had not confirmed yet is read again from chat.db (read only) for `recheck_minutes`
        after it went, and a change is written back to the send log, so the card flips to delivered or failed on
        its own. Nothing is ever sent from here."""
        cutoff = now().timestamp() - days * 86400
        log, out, changed = self.send_log(), {}, False
        live = self.sender == "live" and not self.demo and (db is not None or platform.system() == "Darwin")
        for r in log:
            if r.get("kind") != "text" or not r.get("person_id"):
                continue
            try:
                t = datetime.fromisoformat(r["at"]).timestamp()
            except (KeyError, ValueError, TypeError):
                continue
            if t < cutoff:
                continue
            if "delivery" not in r:
                r["delivery"] = delivery_from_detail(r.get("status", ""), r.get("detail", ""))
            if live and r.get("status") == "sent" and r["delivery"] in ("pending", "sent", "unknown") and now().timestamp() - t < recheck_minutes * 60:
                st = delivery_state(r.get("to", ""), t, db or CHAT_DB)
                if st in ("delivered", "error", "sent") and st != r["delivery"]:
                    r["delivery"], changed = st, True
            out[r["person_id"]] = {k: r.get(k, "") for k in ("at", "status", "delivery", "detail", "display")}
        if changed:
            with self.lock:
                fresh = self.send_log()  # merge onto the newest copy so a send that landed meanwhile is kept
                by_key = {(r.get("at"), r.get("person_id"), r.get("kind")): r.get("delivery") for r in log if r.get("delivery")}
                for r in fresh:
                    k = (r.get("at"), r.get("person_id"), r.get("kind"))
                    if by_key.get(k):
                        r["delivery"] = by_key[k]
                write_json(self.send_log_path, fresh)
        return out

    # ---- voice services
    def voice_usage(self) -> dict:
        u = read_json(self.usage_path, {})
        if not isinstance(u, dict) or "_error" in u:
            u = {}
        out = {"asked": int(u.get("asked", 0)), "input_tokens": int(u.get("input_tokens", 0)), "output_tokens": int(u.get("output_tokens", 0)),
               "cache_creation_input_tokens": int(u.get("cache_creation_input_tokens", u.get("cache_write_tokens", 0))),
               "cache_read_input_tokens": int(u.get("cache_read_input_tokens", u.get("cache_read_tokens", 0))),
               "spoken_chars": int(u.get("spoken_chars", 0)), "calls": int(u.get("calls", 0)), "last": u.get("last", "")}
        if "cost_usd" in u:  # present once a call was logged with all four meters
            out["cost_usd"] = float(u["cost_usd"])
        return out

    def _bump_usage(self, **delta) -> dict:
        with self.lock:
            u = self.voice_usage()
            for k, v in delta.items():
                u[k] = u.get(k, 0) + v
            u["last"] = now().isoformat(timespec="seconds")
            write_json(self.usage_path, u)
            return u

    def log_claude(self, route: str, model: str, usage: dict, **extra) -> dict:
        """Every Claude call: the running totals in voice-usage.json, plus one line per request in
        out/claude-usage.jsonl with all four token meters and the dollars (jarvis.PRICES). Tokens only, never the
        question or the answer, so the log holds no client data."""
        meters = {k: int(usage.get(k, 0) or 0) for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens")}
        cost = jarvis.cost_usd(model, meters)
        line = {"at": now().isoformat(timespec="seconds"), "route": route, "model": model, **meters,
                "cost_usd": round(cost, 6) if cost is not None else None, **extra}
        try:
            with (self.usage_path.parent / "claude-usage.jsonl").open("a") as f:
                f.write(json.dumps(line) + "\n")
        except OSError:
            pass
        return self._bump_usage(asked=0 if route == "warm" else 1, **meters, cost_usd=cost or 0.0)

    def voice_info(self) -> dict:
        u = self.voice_usage()
        # Exact once calls are logged with all four meters (cost_usd); older totals are priced from the four meters.
        est = u["cost_usd"] if "cost_usd" in u else jarvis.cost_usd(self.ask_model, u)
        return {"ask": bool(self.ask_key), "ask_model": self.ask_model, "tts": "elevenlabs" if self.eleven_key else "browser",
                "voice_id": self.eleven_voice if self.eleven_key else "", "usage": u, "ask_cost_estimate_usd": round(est, 4) if est is not None else None,
                "speech_engine": bool(self.eleven_key and self.speech_engine_id and self.ask_key), "speech_engine_id": self.speech_engine_id,
                "calls": int(u.get("calls", 0))}

    def call_token(self) -> dict:
        """A short-lived WebRTC token so the browser can start a Speech Engine conversation without ever seeing the API key.
        The Speech Engine id is passed as the agent id, as the ElevenLabs quickstart does."""
        if self.demo:
            raise CRMError("calls are off in demo mode")
        if not (self.eleven_key and self.speech_engine_id):
            raise CRMError("calls need ELEVENLABS_API_KEY and ELEVENLABS_SPEECH_ENGINE_ID (run speech_engine.py create)")
        if not self.ask_key:
            raise CRMError("calls need ANTHROPIC_API_KEY: Claude is the brain on a call")
        try:
            from elevenlabs import ElevenLabs
        except ImportError:
            raise CRMError("Call mode needs a voice package that is not installed on this Mac yet. Ask Claude to install it")
        try:
            resp = ElevenLabs(api_key=self.eleven_key).conversational_ai.conversations.get_webrtc_token(agent_id=self.speech_engine_id)
        except Exception as e:
            raise CRMError(f"ElevenLabs would not mint a call token: {type(e).__name__}: {str(e)[:120]}")
        self._bump_usage(calls=1)
        return {"ok": True, "result": {"token": resp.token, "speech_engine_id": self.speech_engine_id}}

    def ask_context(self) -> dict:
        """A compact, bounded view of today for the model. Names and last texts are in it, so this leaves the Mac only
        when the Q&A step is on, the same way the enrichment's Haiku pass does."""
        f = self.feed()
        if not f or "_error" in f:
            return {"note": "no feed loaded"}
        due = [{"name": r.get("display"), "band": r.get("band"), "stage": r.get("stage"), "days_quiet": r.get("days_quiet"),
                "owes_reply": r.get("owes_reply"), "next_action": r.get("next_action"), "last_texts": (r.get("last_messages") or [])[-3:],
                "has_phone": bool(r.get("phone")), "has_email": bool(r.get("email"))} for r in f.get("touches_due", [])[:25]]
        tasks = [{"task": t.get("task"), "who": t.get("display"), "due": t.get("due"), "overdue": t.get("overdue"), "source": t.get("source")}
                 for t in f.get("tasks", [])[:20]]
        # Deals and leads as the screens show them: the AIRE Deals sheet (the one deal source) and the one lead list
        # (14 days, test leads out), so a spoken answer never disagrees with a page.
        try:
            cp = self.cc_payload()
        except Exception:  # noqa: BLE001  (a missing Command Center cache must not break the voice)
            cp = {}
        deals = [{"address": d.get("deal"), "status": d.get("status"), "side": d.get("side"), "price": d.get("price"),
                  "act_of_sale": d.get("act"), "next_step": d.get("next")} for d in cp.get("deals", []) if d.get("stage") not in ("closed", "out")][:15]
        leads = [{"name": l.get("name"), "source": l.get("source"), "received": l.get("received"), "needs": (l.get("due") or {}).get("label")}
                 for l in cp.get("leads", [])][:15]
        # The whole due list is too big to send, so the people a question most often reaches past the top 25 for:
        # hot and warm contacts quiet the longest, and everyone waiting on a reply.
        allrows = f.get("touches_due", [])
        quiet = sorted((r for r in allrows if r.get("band") in ("hot", "warm") and r.get("days_quiet") is not None), key=lambda r: -r["days_quiet"])[:10]
        quiet = [{"name": r.get("display"), "band": r.get("band"), "days_quiet": r.get("days_quiet"), "next_action": r.get("next_action")} for r in quiet]
        owes = [{"name": r.get("display") or "(no name)", "last_text": (r.get("last_messages") or [""])[-1][:160]} for r in allrows if r.get("owes_reply")][:40]
        mkt = (f.get("market") or {}).get("counts") or {}
        mp = (f.get("map") or {}).get("counts") or {}
        sent = self.sent_today()
        review = [{"name": r.get("display"), "rule": r.get("rule"), "now": r.get("band") or r.get("type") or "blank",
                   "suggest": r.get("suggest_band") or r.get("suggest_type"), "why": r.get("why")}
                  for r in f.get("label_review", []) if (r.get("display") or "").strip()][:15]
        return {"today": today().isoformat(), "feed_as_of": f.get("as_of"), "counts": f.get("counts"), "cadence_days": f.get("cadence_days"),
                "label_review_top": review,
                "touches_due_top": due, "hot_warm_quiet_longest": quiet, "waiting_on_a_reply": owes,
                "market_monitor": {"rows": mkt.get("rows"), "by_type": mkt.get("by_type"), "source": "EBR permits (data.brla.gov) and Flexmls alert mail"},
                "map": {"people_pinned": mp.get("persons"), "deals_pinned": mp.get("deals"), "not_geocoded": mp.get("ungeocoded_contacts")},
                "tasks": tasks, "live_deals": deals, "new_leads": leads,
                "sent_today": sent, "caps": {"texts": self.max_texts, "emails": self.max_emails}, "sender_mode": self.sender,
                "command_reader": read_json(self.paths["command_status"], {}).get("state", "unknown")}

    def ask(self, question: str) -> dict:
        question = (question or "").strip()
        if not question:
            raise CRMError("ask needs a question")
        if self.demo:
            u = self._bump_usage(asked=1)
            return {"ok": True, "result": {"answer": "Demo mode. On the Mac, with ANTHROPIC_API_KEY set, Claude answers from today's feed. "
                                                      "I heard: " + question[:120], "model": "demo"}, "usage": u}
        if not self.ask_key:
            raise CRMError("Claude Q&A is off: set ANTHROPIC_API_KEY in ~/.aire/pipeline.env and restart Pipeline")
        try:
            import anthropic
        except ImportError:
            raise CRMError("Claude answers need a package that is not installed on this Mac yet. Ask Claude to install it")
        client = anthropic.Anthropic(api_key=self.ask_key)
        tools = jarvis.Tools(self.feed(), self.sent_today(), {"texts": self.max_texts, "emails": self.max_emails}, today().isoformat())
        r = self._ask_call(anthropic, lambda: jarvis.ask(client, self.ask_model, tools, question))
        if r.get("refused"):
            raise CRMError("Claude declined that one")
        u = self.log_claude("ask", r.get("model", self.ask_model), r["usage"], tool_calls=len(r["calls"]))
        return {"ok": True, "result": {"answer": r["answer"] or "I have nothing on that.", "model": r.get("model", self.ask_model),
                                       "proposals": r["proposals"], "tools_used": [c["tool"] for c in r["calls"]]}, "usage": u}

    def cc_ask(self, page: str, question: str, private: bool) -> dict:
        """Ask Claude about one Command Center page. Sonnet 5.5, low effort, a daily dollar cap (cc_ask.py)."""
        if self.demo:
            return {"ok": True, "answer": "Demo mode: on the Mac, with the Anthropic key set, Claude answers from this page's numbers. "
                    "You asked: " + question[:160], "cost": 0, "spent": 0, "cap": cc_ask.CAP}
        if not self.ask_key:
            raise CRMError("Ask Claude is off: set ANTHROPIC_API_KEY in Pipeline's key file and restart Pipeline")
        try:
            import anthropic
        except ImportError:
            raise CRMError("Claude answers need a package that is not installed on this Mac yet. Ask Claude to install it")
        p = self.cc_payload()
        client = anthropic.Anthropic(api_key=self.ask_key, timeout=60.0)
        try:
            r = self._ask_call(anthropic, lambda: cc_ask.ask(client, p, page, question, private, self.ask_log, now()))
        except ValueError as e:
            raise CRMError(str(e))
        return {"ok": True, **r}

    def _ask_call(self, anthropic, call):
        """Run one Claude call, turning SDK errors into sentences Pipeline can say out loud."""
        try:
            result = call()
        except anthropic.AuthenticationError:
            raise CRMError("Anthropic refused the API key")
        except anthropic.RateLimitError:
            raise CRMError("Anthropic rate limit, try again in a minute")
        except anthropic.APIStatusError as e:
            if "credit balance" in str(getattr(e, "message", "") or e).lower():
                raise CRMError("Claude is out of API credits. Top them up in the Anthropic console, then ask me again.")
            raise CRMError(f"Claude had a problem, error {e.status_code}. Try again in a minute.")
        except anthropic.APIConnectionError:
            raise CRMError("could not reach Anthropic")
        return result

    def warm_ask(self) -> dict:
        """Voice just turned on: write Jarvis' tools and instructions into Claude's prompt cache with a max_tokens 0
        request (no output billed, one cache write), so the first real question reads them from cache. Same model,
        tools, system and effort as a real question, or it would miss. Skipped when warmed under four minutes ago."""
        if self.demo or not self.ask_key:
            return {"ok": True, "result": {"warmed": False, "why": "Q&A is off"}}
        if self._warm.get("model") == self.ask_model and time.time() - self._warm.get("at", 0) < 240:
            return {"ok": True, "result": {"warmed": False, "why": "warm already"}}
        import anthropic
        client = anthropic.Anthropic(api_key=self.ask_key)
        usage = self._ask_call(anthropic, lambda: jarvis.warm(client, self.ask_model))
        self._warm = {"model": self.ask_model, "at": time.time()}
        self.log_claude("warm", self.ask_model, usage)
        return {"ok": True, "result": {"warmed": True, "cache_write_tokens": usage.get("cache_creation_input_tokens", 0)}}

    def speak(self, text: str) -> bytes:
        text = (text or "").strip()
        if not text:
            raise CRMError("nothing to say")
        if len(text) > 2500:
            text = text[:2500]
        if self.demo or not self.eleven_key:
            raise CRMError("ElevenLabs is off: set ELEVENLABS_API_KEY in ~/.aire/pipeline.env and restart Pipeline")
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{urllib.parse.quote(self.eleven_voice)}?output_format=mp3_44100_128"
        body = json.dumps({"text": text, "model_id": self.eleven_model, "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.2}}).encode()
        req = urllib.request.Request(url, data=body, method="POST", headers={"xi-api-key": self.eleven_key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                audio = r.read()
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = json.loads(e.read().decode())["detail"]["message"][:120]
            except Exception:
                pass
            raise CRMError(f"ElevenLabs error {e.code}" + (f": {detail}" if detail else ""))
        except urllib.error.URLError:
            raise CRMError("could not reach ElevenLabs")
        self._bump_usage(spoken_chars=len(text))
        return audio

    def feed_run(self) -> dict | None:
        """How the last feed rebuild went, from the end of its log (refresh_feed.sh). None in demo or with no log."""
        p = self.paths.get("feed_log")
        if self.demo or not p:
            return None
        return feed_run_status(p, now())

    def snapshot(self) -> dict:
        feed = self.feed()
        run = self.feed_run()
        text_q = read_json(self.paths["text_queue"], {})
        email_q = read_json(self.paths["email_queue"], {})
        command = read_json(self.paths["command_status"], {})
        feed_age = 0 if self.demo else file_age_minutes(self.paths["feed"])
        sent = self.sent_today()
        feed_ok = bool(feed) and "_error" not in feed
        if feed_ok and isinstance(feed.get("market"), dict):
            gone = self.dismissed()
            if gone:
                feed = {**feed, "market": {**feed["market"], "rows": [r for r in feed["market"].get("rows", []) if r.get("id") not in gone]}}
        problems = []
        if not feed:
            problems.append({"level": "warn", "code": "no_feed", "text": "The CRM feed has not been built yet. Press refresh to build it."})
        elif "_error" in feed:
            problems.append({"level": "warn", "code": "feed_unreadable", "text": "The CRM feed could not be read. Press refresh to rebuild it."})
        elif feed.get("header_ok") is False:
            problems.append({"level": "stop", "code": "header_not_ok",
                             "text": "The Contacts header lost a column the engine needs: " + ", ".join(feed.get("missing_columns", []))})
        if run and run["state"] == "failed":
            problems.append({"level": "warn", "code": "feed_failed", "text": f"The CRM feed rebuild failed at {run['at_text']}: {run['detail']}. "
                                                                          "The screens show the last good feed."})
        if feed_age is not None and feed_age > 60:
            problems.append({"level": "warn", "code": "feed_stale", "text": f"Feed is {feed_age // 60}h {feed_age % 60}m old."})
        if self.messages.get("checked") and not self.messages.get("ok"):
            problems.append({"level": "warn", "code": "messages_permission",
                             "text": "Pipeline cannot control Messages yet, so texts will not send. System Settings, Privacy and Security, Automation: "
                                     "turn on Messages for the Python entry Pipeline runs on, then restart Pipeline."})
        if command.get("state") == "login needed":
            problems.append({"level": "warn", "code": "command_login",
                             "text": "Command needs a login. " + (command.get("detail") or "Open the AIRE Chrome profile and sign in once.")})
        elif command.get("state") == "layout changed":
            problems.append({"level": "warn", "code": "command_layout", "text": "Command changed its layout. " + (command.get("detail") or "")})
        return {
            "now": now().isoformat(timespec="seconds"),
            "as_of": feed.get("as_of", ""),
            "demo": self.demo,
            "sender": self.sender,
            "platform": platform.system(),
            "feed_ok": feed_ok,
            "feed_age_minutes": feed_age,
            "feed_run": run,
            "feed": feed if feed_ok else {},
            "text_queue": text_q if "_error" not in text_q else {},
            "email_queue": email_q if "_error" not in email_q else {},
            "command": command if "_error" not in command else {},
            "caps": {"texts": self.max_texts, "emails": self.max_emails, "sent_texts": sent["texts"], "sent_emails": sent["emails"]},
            "sent_today": [r for r in self.send_log() if r.get("at", "").startswith(today().isoformat())][-50:],
            "last_texts": self.last_texts(),
            "refresh": self.refresh,
            "problems": problems,
            "links": {"sheet": SHEET_URL.format(sheet_id=feed.get("sheet_id", "")) if feed.get("sheet_id") else "", "command": COMMAND_URL},
            "stages": DEAL_STAGES,
            "voice": self.voice_info(),
            "farms": self.farms(),
        }

    # ---- writes
    def touch(self, person_id: str, what: str) -> dict:
        if not person_id or not what.strip():
            raise CRMError("touch needs a person and what happened")
        return self.crm.run(["touch", person_id, what.strip()])

    def done(self, task_id: str, person_id: str = "", task: str = "") -> dict:
        if task_id:
            return self.crm.run(["done", task_id])
        # A Next_Action row has no task_id yet: sync-tasks mints one, then the fresh feed tells us which.
        if self.demo:
            feed = self.feed()
            feed["tasks"] = [t for t in feed["tasks"] if not (t["person_id"] == person_id and t["task"] == task)]
            feed["counts"]["tasks_open"] = len(feed["tasks"])
            return {"ok": True, "result": {"task": task, "status": "done", "synced": True}}
        self.crm.plain(["sync-tasks"])
        self.crm.plain(["feed", "--out", str(self.paths["feed"])])
        for t in self.feed().get("tasks", []):
            if t.get("task_id") and t.get("person_id") == person_id and t.get("task") == task:
                return self.crm.run(["done", t["task_id"]])
        raise CRMError("synced, but could not find that task afterwards. Refresh and try again.")

    def add_task(self, person_id: str, task: str, due: str) -> dict:
        if not person_id or not task.strip():
            raise CRMError("a task needs a person and a line of text")
        date.fromisoformat(due)
        return self.crm.run(["task", person_id, task.strip(), "--due", due])

    def deal(self, address: str, fields: dict) -> dict:
        if not address.strip():
            raise CRMError("a deal needs its street address")
        args = ["deal", address.strip()]
        for key, flag in (("stage", "--stage"), ("price", "--price"), ("close", "--close"), ("next_step", "--next-step"),
                          ("event", "--event"), ("expect", "--expect"), ("side", "--side"), ("person", "--person")):
            v = (fields.get(key) or "").strip()
            if v:
                if key == "stage" and v not in DEAL_STAGES:
                    raise CRMError(f"stage must be one of {', '.join(DEAL_STAGES)}")
                args += [flag, v]
        if fields.get("clear_close"):
            args.append("--clear-close")
        if fields.get("create"):
            args.append("--create")
        return self.crm.run(args)

    def note(self, person_id: str, text: str) -> dict:
        if not text.strip():
            raise CRMError("an empty note is not saved")
        return self.crm.run(["note", person_id, text.strip()])

    def stage(self, person_id: str, stage: str, expect: str = "") -> dict:
        args = ["stage", person_id, stage] + (["--expect", expect] if expect else [])
        return self.crm.run(args)

    def relabel(self, person_id: str, band: str = "", type_: str = "", expect_band: str = "") -> dict:
        """Caleb's yes on a Jarvis or label review card. Same crm.py write path, gates and audit as every button."""
        args = ["relabel", person_id] + (["--band", band] if band else []) + (["--type", type_] if type_ else [])
        return self.crm.run(args + ["--expect-band", expect_band])

    def dnc(self, person_id: str, reason: str) -> dict:
        if not reason.strip():
            raise CRMError("Do Not Contact needs a reason, it is one way")
        return self.crm.run(["dnc", person_id, "--reason", reason.strip()])

    # ---- map and market monitor
    def farms(self) -> list[dict]:
        """The farms Caleb drew, as saved. The feed's map.farms has the people counts; this is the file itself,
        so a farm drawn a minute ago shows before the next feed rebuild."""
        f = read_json(self.paths["farms"], {})
        return f.get("farms", []) if isinstance(f, dict) else []

    def save_farms(self, farms: list) -> dict:
        clean = []
        for x in farms or []:
            poly = [[float(a), float(b)] for a, b in (x.get("polygon") or [])]
            name = str(x.get("name") or "").strip()
            if len(poly) < 3 or not name:
                raise CRMError("a farm needs a name and at least three corners")
            if not all(-90 <= a <= 90 and -180 <= b <= 180 for a, b in poly):
                raise CRMError("a farm corner is off the map")
            fid = re.sub(r"[^a-z0-9]+", "-", (str(x.get("id") or "").strip() or name).lower()).strip("-")[:40]
            if not fid:
                raise CRMError("a farm name needs at least one letter or number")
            clean.append({"id": fid, "name": name, "created": x.get("created") or today().isoformat(), "polygon": poly})
        if len({c["id"] for c in clean}) != len(clean):
            raise CRMError("two farms have the same name")
        with self.lock:
            write_json(self.paths["farms"], {"version": 1, "farms": clean})
        return {"ok": True, "result": {"farms": len(clean), "file": self.paths["farms"].name}, "refresh": self.start_refresh()}

    def dismissed(self) -> set:
        d = read_json(self.paths["dismissed"], {})
        return set(d.get("ids", [])) if isinstance(d, dict) else set()

    def dismiss(self, row_id: str) -> dict:
        if not row_id:
            raise CRMError("dismiss needs a row id")
        with self.lock:
            ids = sorted(self.dismissed() | {row_id})
            write_json(self.paths["dismissed"], {"ids": ids})
        return {"ok": True, "result": {"id": row_id, "dismissed": len(ids)}}

    def make_lead(self, name: str, source: str, phone: str = "", email: str = "", note: str = "", next_action: str = "") -> dict:
        if not name.strip() or not source.strip():
            raise CRMError("a lead needs a name and a source")
        args = ["lead", name.strip(), "--source", source.strip()]
        for flag, v in (("--phone", phone), ("--email", email), ("--note", note), ("--next-action", next_action)):
            if v and v.strip():
                args += [flag, v.strip()]
        return self.crm.run(args)

    LIST_COLUMNS = {"call": ["added", "kind", "person_id", "display", "phone", "email", "address", "city", "zip", "why"],
                    "postcards": ["added", "kind", "person_id", "display", "address", "city", "state", "zip", "why"]}

    def add_to_list(self, kind: str, rows: list) -> dict:
        """out/call-list-<date>.csv or out/postcards-<date>.csv under aire/map-crm. Client data, git-ignored,
        stays on the Mac. A row already on today's list is not added twice."""
        if kind not in self.LIST_COLUMNS:
            raise CRMError("list must be call or postcards")
        cols = self.LIST_COLUMNS[kind]
        path = self.paths["lists"] / f"{'call-list' if kind == 'call' else 'postcards'}-{today().isoformat()}.csv"
        with self.lock:
            have = []
            if path.exists():
                with path.open(newline="", encoding="utf-8") as fh:
                    have = list(csv.DictReader(fh))
            keys = {(r.get("person_id") or "") + "|" + (r.get("address") or "").lower() for r in have}
            added = 0
            for r in rows or []:
                r = {c: csv_safe(str(r.get(c) if r.get(c) is not None else ""), c) for c in cols}
                r["added"] = now().isoformat(timespec="seconds")
                if kind == "call" and not r.get("phone"):
                    continue
                if kind == "postcards" and not r.get("address"):
                    continue
                k = r["person_id"] + "|" + r["address"].lower()
                if k in keys:
                    continue
                keys.add(k)
                have.append(r)
                added += 1
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("w", newline="", encoding="utf-8") as fh:
                w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
                w.writeheader()
                w.writerows(have)
        return {"ok": True, "result": {"file": str(path), "added": added, "total": len(have),
                                       "skipped": len(rows or []) - added}}

    # ---- sending
    def send(self, kind: str, person_id: str, to: str, body: str, subject: str = "", display: str = "") -> dict:
        if kind not in ("text", "email"):
            raise CRMError("kind must be text or email")
        if not person_id:
            raise CRMError("every send is tied to a person_id so the engine can log it")
        if not to.strip():
            raise CRMError("no " + ("phone" if kind == "text" else "email") + " on file")
        if not body.strip():
            raise CRMError("the draft is empty")
        if kind == "email" and not subject.strip():
            raise CRMError("an email needs a subject")
        sent = self.sent_today()
        cap = self.max_texts if kind == "text" else self.max_emails
        used = sent["texts"] if kind == "text" else sent["emails"]
        if used >= cap:
            raise CRMError(f"daily cap reached: {used} of {cap} {kind}s today. The rest wait for tomorrow.")
        # Do Not Contact, through the engine's own gate, without writing anything.
        self.crm.run(["touch", person_id, "pre-send check"], dry_run=True)
        status, detail = "dry-run", "PIPELINE_SENDER is not live, nothing left the Mac"
        if self.sender == "live" and not self.demo:
            try:
                detail = send_imessage(to.strip(), body) if kind == "text" else send_gmail(to.strip(), subject.strip(), body)
            except CRMError as e:  # the failed attempt is logged too, so every live send leaves a line
                with self.lock:
                    log = self.send_log()
                    log.append({"at": now().isoformat(timespec="seconds"), "kind": kind, "person_id": person_id, "display": display,
                                "to": to.strip(), "subject": subject.strip(), "chars": len(body), "status": "failed", "detail": str(e)[:200],
                                "delivery": "error"})
                    write_json(self.send_log_path, log)
                raise
            status = "sent"
        entry = {"at": now().isoformat(timespec="seconds"), "kind": kind, "person_id": person_id, "display": display,
                 "to": to.strip(), "subject": subject.strip(), "chars": len(body), "status": status, "detail": detail,
                 "delivery": delivery_from_detail(status, detail)}
        with self.lock:
            log = self.send_log()
            log.append(entry)
            write_json(self.send_log_path, log)
        touched = None
        if status == "sent":
            what = f"{kind} sent from Pipeline" + (f": {subject.strip()}" if subject.strip() else f": {body.strip()[:60]}")
            touched = self.crm.run(["touch", person_id, what])
        elif self.demo:
            touched = self.crm.run(["touch", person_id, f"{kind} (demo)"])
        return {"ok": True, "result": entry, "touched": touched, "caps": {**self.sent_today(), "texts_cap": self.max_texts, "emails_cap": self.max_emails}}

    # ---- refresh
    def start_refresh(self) -> dict:
        if self.refresh["running"]:
            return self.refresh
        self.refresh = {"running": True, "started": now().isoformat(timespec="seconds"), "finished": "", "ok": None, "detail": ""}

        def work():
            try:
                if self.demo:
                    time.sleep(1.5)
                    self.refresh.update(ok=True, detail="demo: nothing was fetched")
                elif REFRESH_SH.exists() and platform.system() == "Darwin":
                    p = subprocess.run(["sh", str(REFRESH_SH)], capture_output=True, text=True, timeout=1500)
                    tail = ""
                    try:
                        tail = PATHS["feed_log"].read_text().strip().splitlines()[-1]
                    except Exception:
                        pass
                    self.refresh.update(ok=p.returncode == 0, detail=tail or (p.stderr.strip()[-200:]))
                else:
                    self.crm.plain(["ingest"])
                    self.crm.plain(["feed", "--out", str(self.paths["feed"])])
                    self.refresh.update(ok=True, detail="ingest and feed done")
            except Exception as e:
                self.refresh.update(ok=False, detail=str(e)[-300:])
            finally:
                self.refresh.update(running=False, finished=now().isoformat(timespec="seconds"))

        threading.Thread(target=work, daemon=True).start()
        return self.refresh


def csv_safe(v: str, column: str = "") -> str:
    """A cell that a spreadsheet would run as a formula gets a leading apostrophe. Addresses come from city
    permit data, so this is not hypothetical. A phone number like +12255550142 stays as it is."""
    if column == "phone" and re.fullmatch(r"\+?[\d ()-]+", v):
        return v
    return "'" + v if v[:1] in ("=", "+", "-", "@", "\t", "\r") else v


CHAT_DB = Path.home() / "Library" / "Messages" / "chat.db"
APPLE_EPOCH = 978307200  # chat.db dates are nanoseconds since 2001-01-01


def _osascript_send(phone: str, body: str, service: str) -> None:
    """One send through Messages.app. The body goes in as an argument, never inside the script, so quotes are safe."""
    script = f'''on run argv
  set who to item 1 of argv
  set msg to item 2 of argv
  tell application "Messages"
    set svc to 1st account whose service type = {service}
    set who to participant who of svc
    send msg to who
  end tell
end run'''
    try:
        p = subprocess.run(["osascript", "-e", script, phone, body], capture_output=True, text=True, timeout=45)
    except subprocess.TimeoutExpired:
        raise CRMError("Messages did not answer. If a box asked to let Pipeline control Messages, click OK and send again.")
    if p.returncode != 0:
        err = (p.stderr.strip() or "unknown")[-200:]
        if "-1743" in err or "not allowed" in err.lower():
            raise CRMError("macOS has not allowed Pipeline to control Messages. System Settings, Privacy and Security, Automation: turn on Messages for Pipeline's Python.")
        raise CRMError(f"Messages refused the {service} send: {err}")


def delivery_state(phone: str, since: float, db: Path = CHAT_DB) -> str:
    """What chat.db says about the newest message Caleb sent to this number after `since` (unix seconds):
    error, delivered, sent, pending (in the database, not sent yet), or unknown (nothing there or unreadable).
    Read only. Pipeline's Python has Full Disk Access for the iMessage signals, so it can read this file."""
    import sqlite3
    digits = "".join(ch for ch in phone if ch.isdigit())[-10:]
    if len(digits) < 10:
        return "unknown"
    try:
        con = sqlite3.connect(f"file:{db}?mode=ro", uri=True, timeout=5)
        row = con.execute(
            "SELECT m.error, m.is_delivered, m.is_sent FROM message m JOIN handle h ON m.handle_id = h.ROWID "
            "WHERE m.is_from_me = 1 AND h.id LIKE ? AND m.date >= ? ORDER BY m.date DESC LIMIT 1",
            (f"%{digits}", int((since - 1 - APPLE_EPOCH) * 1e9))).fetchone()
        con.close()
    except Exception:
        return "unknown"
    if not row:
        return "unknown"
    error, delivered, sent = row
    return "error" if error else "delivered" if delivered else "sent" if sent else "pending"


def delivery_from_detail(status: str, detail: str) -> str:
    """The delivery word for a send-log line, from what send_imessage said at the time: delivered, sent,
    pending (handed to Messages, not confirmed), error, or dry-run."""
    if status == "dry-run":
        return "dry-run"
    if status == "failed":
        return "error"
    d = (detail or "").lower()
    return "delivered" if "delivered" in d else "pending" if "not confirmed" in d else "sent"


def _wait_for_delivery(phone: str, since: float, seconds: float = 12, db: Path = CHAT_DB, sleep=time.sleep) -> str:
    state = "unknown"
    for _ in range(int(seconds / 0.5)):
        state = delivery_state(phone, since, db)
        if state in ("error", "delivered", "sent"):
            return state
        sleep(0.5)
    return state


def send_imessage(phone: str, body: str, sender=_osascript_send, wait=_wait_for_delivery, clock=time.time) -> str:
    """A text through Messages.app on the Mac: iMessage first. Messages takes an iMessage send even when the
    number is not on iMessage and then marks it failed, so the result is read back from chat.db. On an error
    the same text goes once as SMS through the iPhone (Text Message Forwarding). Both failing is an error,
    so the send is not logged as a touch."""
    if platform.system() != "Darwin" and sender is _osascript_send:
        raise CRMError("texts send through Messages on the Mac only")
    t0 = clock()
    sender(phone, body, "iMessage")
    state = wait(phone, t0)
    if state != "error":
        return "iMessage " + ("delivered" if state == "delivered" else "sent" if state == "sent" else "handed to Messages, delivery not confirmed yet")
    t1 = clock()
    sender(phone, body, "SMS")
    state = wait(phone, t1)
    if state == "error":
        raise CRMError("Messages could not deliver it as iMessage or as SMS. Check the number, and that your iPhone forwards texts to this Mac.")
    return "not on iMessage, sent as SMS" + (" and delivered" if state == "delivered" else "")


def send_gmail(to: str, subject: str, body: str) -> str:
    sys.path.insert(0, str(AIRE / "follow-up"))
    try:
        import followups  # the follow-up library owns the Gmail token and the one send function
    except Exception as e:
        raise CRMError(f"follow-up library not importable: {e}")
    svc = followups.gmail_service_or_none()
    if svc is None:
        raise CRMError("email can't send yet: Gmail is not connected on this Mac. Ask Claude to connect it once")
    followups.send_email(svc, to, subject, body)
    return "Gmail accepted it"


# ---------------------------------------------------------------------- server


class Handler(BaseHTTPRequestHandler):
    state: State = None  # set by serve()

    def log_message(self, fmt, *args):  # quiet unless asked
        if os.getenv("PIPELINE_VERBOSE"):
            super().log_message(fmt, *args)

    def _json(self, code: int, data, cookie: str | None = None) -> None:
        raw = json.dumps(data, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(code)
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(raw)

    def _file(self, rel: str) -> None:
        path = (STATIC / rel.lstrip("/")).resolve()
        if not str(path).startswith(str(STATIC.resolve())) or not path.is_file():
            self.send_error(404)
            return
        ctype = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                 ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json"}.get(path.suffix, "application/octet-stream")
        raw = path.read_bytes()
        if path.name == "sw.js":
            raw = raw.replace(b"__BUILD__", static_build().encode())
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if not self._gate(u.path):
            return
        if u.path == "/login":
            return self._file("login.html")
        if u.path == "/api/state":
            return self._json(200, self.state.snapshot())
        if u.path == "/api/refresh":
            return self._json(200, self.state.refresh)
        if u.path == "/api/push/key":
            return self._json(200, {"ok": True, "key": push.keys(self.state.push_key)["public"]})
        if u.path == "/api/alerts":
            d = push._read(self.state.cc_dir / "alerts.json", {"rows": []})
            return self._json(200, {"ok": True, "rows": d.get("rows", [])[:20], "phones": len(push._read(self.state.push_subs, []))})
        if u.path == "/api/cc":
            p = self.state.cc_payload()
            p["ask"] = {"on": bool(self.state.ask_key) or self.state.demo, "cap": cc_ask.CAP, "model": cc_ask.MODEL, "pages": list(cc_ask.PAGES),
                        "spent": cc_ask.spent_today(self.state.ask_log, now())}
            return self._json(200, {**p, "demo": self.state.demo})
        if u.path == "/api/voice/token":
            try:
                return self._json(200, self.state.call_token())
            except CRMError as e:
                return self._json(200, {"ok": False, "error": str(e)})
        if u.path in ("/", "/index.html"):
            return self._file("index.html")
        return self._file(u.path)

    def _same_origin(self) -> bool:
        """Refuse a POST that a web page on another site sent (CSRF), or one that came in under a foreign
        Host name (DNS rebinding). Tools with no Origin header, like curl and the tests, still work."""
        port = self.server.server_address[1]
        ok = {f"127.0.0.1:{port}", f"localhost:{port}", f"[::1]:{port}"} | set(filter(None, os.getenv("PIPELINE_HOSTS", "").split(",")))
        host = (self.headers.get("Host") or "").lower()
        # A Tailscale name (tailscale serve) is allowed too: only this tailnet's devices can resolve it, and it always
        # needs the login. Origin must still equal Host, so a page on another site cannot press Pipeline's buttons.
        tailnet = host.split(":")[0].endswith(".ts.net")
        if host not in ok and not tailnet:
            return False
        origin = self.headers.get("Origin")
        return origin is None or urllib.parse.urlparse(origin).netloc.lower() == host or urllib.parse.urlparse(origin).netloc in ok

    def _gate(self, path: str) -> bool:
        """True when the request may go on. From this Mac: always. Otherwise: a passcode session, except the login
        page, the app manifest, icons and the service worker, which hold no data."""
        a = self.state.auth
        if a.is_local(self.headers, self.server.server_address[1]) or path in auth.PUBLIC_PATHS or a.valid(self.headers.get("Cookie")):
            return True
        if path.startswith("/api/"):
            self._json(401, {"ok": False, "error": "sign in first" if a.configured() else "no passcode is set on the Mac yet"})
        else:
            self.send_response(302)
            self.send_header("Location", "/login")
            self.send_header("Content-Length", "0")
            self.end_headers()
        return False

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if not self._same_origin():
            return self._json(403, {"ok": False, "error": "refused: this request did not come from Pipeline's own page"})
        n = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._json(400, {"ok": False, "error": "body must be JSON"})
        if u.path == "/api/login":
            addr = (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()
            try:
                tok = self.state.auth.login(str(body.get("passcode", "")), addr)
            except ValueError as e:
                return self._json(200, {"ok": False, "error": str(e)})
            secure = (self.headers.get("X-Forwarded-Proto") or "") == "https"
            return self._json(200, {"ok": True}, cookie=auth.Auth.cookie(tok, secure))
        if not self._gate(u.path):
            return
        if u.path == "/api/logout":
            self.state.auth.logout(self.headers.get("Cookie"))
            return self._json(200, {"ok": True}, cookie=auth.Auth.cookie("", False, clear=True))
        s = self.state
        try:
            if u.path == "/api/cc/ask":
                out = s.cc_ask(str(body.get("page", "dash")), str(body.get("question", "")), body.get("private", True) is not False)
            elif u.path == "/api/push/subscribe":
                out = {"ok": True, "phones": push.subscribe(body.get("subscription") or {}, s.push_subs)}
            elif u.path == "/api/push/test":
                rows = [{"kind": "test", "title": "Pipeline alerts are on", "body": "This is a test from your Mac.", "page": "sources", "at": now().isoformat(timespec="seconds")}]
                d = push._read(s.cc_dir / "alerts.json", {"rows": [], "state": {}})
                push._write(s.cc_dir / "alerts.json", {**d, "rows": (rows + d.get("rows", []))[:50]})
                k = push.keys(s.push_key)
                codes = [push.send_one(x["endpoint"], k) for x in push._read(s.push_subs, [])] if not s.demo else []
                out = {"ok": True, "phones": len(codes), "sent": sum(1 for c in codes if 200 <= c < 300)}
            elif u.path == "/api/cc/row":
                e = cc.queue_row(s.cc_dir, str(body.get("tab", "")), body.get("row") or {})
                out = {"ok": True, "queued": e, "where": "Saved. It goes to the sheet on the next sync, within 5 minutes."}
            elif u.path == "/api/cc/goals":
                g = cc.save_goals(s.cc_dir, body)
                out = {"ok": True, "goals": g, "where": "Saved on this Mac. It goes to the Goals tab once the sheet sync is on."}
            elif u.path == "/api/touch":
                out = s.touch(body.get("person_id", ""), body.get("what", "Touched from Pipeline"))
            elif u.path == "/api/done":
                out = s.done(body.get("task_id", ""), body.get("person_id", ""), body.get("task", ""))
            elif u.path == "/api/task":
                out = s.add_task(body.get("person_id", ""), body.get("task", ""), body.get("due") or today().isoformat())
            elif u.path == "/api/deal":
                out = s.deal(body.get("address", ""), body)
            elif u.path == "/api/note":
                out = s.note(body.get("person_id", ""), body.get("text", ""))
            elif u.path == "/api/stage":
                out = s.stage(body.get("person_id", ""), body.get("stage", ""), body.get("expect", ""))
            elif u.path == "/api/relabel":
                out = s.relabel(body.get("person_id", ""), body.get("band", ""), body.get("type", ""), body.get("expect_band", ""))
            elif u.path == "/api/dnc":
                out = s.dnc(body.get("person_id", ""), body.get("reason", ""))
            elif u.path == "/api/send":
                out = s.send(body.get("kind", ""), body.get("person_id", ""), body.get("to", ""), body.get("body", ""),
                             body.get("subject", ""), body.get("display", ""))
            elif u.path == "/api/refresh":
                out = {"ok": True, "result": s.start_refresh()}
            elif u.path == "/api/farms":
                out = s.save_farms(body.get("farms", []))
            elif u.path == "/api/dismiss":
                out = s.dismiss(body.get("id", ""))
            elif u.path == "/api/lead":
                out = s.make_lead(body.get("name", ""), body.get("source", ""), body.get("phone", ""), body.get("email", ""), body.get("note", ""),
                                 body.get("next_action", ""))
            elif u.path == "/api/list":
                out = s.add_to_list(body.get("kind", ""), body.get("rows", []))
            elif u.path == "/api/ask/warm":
                out = s.warm_ask()
            elif u.path == "/api/ask":
                out = s.ask(body.get("question", ""))
            elif u.path == "/api/speak":
                audio = s.speak(body.get("text", ""))
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(audio)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(audio)
                return
            else:
                return self._json(404, {"ok": False, "error": "no such action"})
            return self._json(200, out)
        except CRMError as e:
            return self._json(200, {"ok": False, "error": str(e)})
        except Exception as e:
            return self._json(200, {"ok": False, "error": f"{type(e).__name__}: {e}"[:300]})


def static_build(root: Path | None = None) -> str:
    """A short hash of every file in static/ (names and bytes). It goes into sw.js, so any change to the app gives
    browsers a new service worker and a new cache name, and the page shows its Updated note."""
    root = root or STATIC
    h = hashlib.sha256()
    for f in sorted(root.rglob("*")):
        if f.is_file():
            h.update(f.relative_to(root).as_posix().encode() + b"\0" + f.read_bytes())
    return h.hexdigest()[:12]


class Server(ThreadingHTTPServer):
    # Older Pythons listen with a queue of 5. A page load through `tailscale serve` opens about 15 connections at once,
    # so the rest were refused and the phone got 502s on its scripts (2026-11-06).
    request_queue_size = 128
    daemon_threads = True


def serve(state: State, port: int, open_browser: bool) -> None:
    Handler.state = state
    httpd = Server(("127.0.0.1", port), Handler)
    url = f"http://127.0.0.1:{port}/"
    v = state.voice_info()
    print(f"Pipeline {'(demo) ' if state.demo else ''}on {url}  sender={state.sender}  crm python={getattr(state.crm, 'python', 'demo')}  "
          f"claude q&a={'on (' + v['ask_model'] + ')' if v['ask'] else 'off'}  voice={v['tts']}")
    if open_browser and platform.system() == "Darwin":
        subprocess.Popen(["open", url])
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


FEED_RUN_MAX_MIN = 10  # a rebuild that started this long ago and never wrote ok or failed is counted as failed


def feed_run_status(log: Path, at: datetime) -> dict | None:
    """The last run in refresh_feed.sh's log: ok, or failed with why. Lines look like '2026-11-08 12:46:37 start',
    '... feed ok', '... feed failed, previous feed.json kept', '... imessage_signals failed, ...'."""
    try:
        with log.open("rb") as fh:
            fh.seek(0, 2)
            fh.seek(max(0, fh.tell() - 16000))
            lines = fh.read().decode("utf-8", "replace").splitlines()
    except OSError:
        return None
    starts = [i for i, ln in enumerate(lines) if re.match(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} start$", ln.strip())]
    if not starts:
        return None
    block = lines[starts[-1]:]
    stamp = lambda ln: datetime.strptime(ln[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=CENTRAL)
    began = stamp(block[0])
    end = next((ln for ln in block if re.search(r"\bfeed (ok|failed)\b", ln)), None)
    signals_failed = any("imessage_signals failed" in ln for ln in block)
    if end and " feed ok" in end:
        state, detail, t = "ok", "signals failed, the feed used the last signals" if signals_failed else "", stamp(end)
    elif end:
        state, detail, t = "failed", "the step that builds the feed from the CRM sheet failed", stamp(end)
    elif (at - began).total_seconds() > FEED_RUN_MAX_MIN * 60:
        state, detail, t = "failed", "the last run started and never finished", began
    else:
        state, detail, t = "running", "", began
    return {"state": state, "at": t.isoformat(timespec="seconds"), "at_text": t.strftime("%b %-d, %-I:%M %p"), "detail": detail,
            "signals_failed": signals_failed}


# ----------------------------------------------------------------------- tests


def run_tests() -> int:
    import tempfile
    import urllib.request

    failures = 0

    def check(cond, label):
        nonlocal failures
        print(("ok   " if cond else "FAIL ") + label)
        failures += 0 if cond else 1

    tmp = Path(tempfile.mkdtemp())
    s = State(demo=True, send_log=tmp / "send-log.json")
    snap = s.snapshot()
    check(snap["demo"] and snap["feed_ok"] and snap["feed"]["counts"]["contacts"] > 0, "demo snapshot reads the fixtures")
    check(all(k in snap for k in ("caps", "problems", "text_queue", "email_queue", "command")), "snapshot has every section")
    check(snap["feed"]["touches_due"][0]["owes_reply"] is True, "fixture feed keeps owes-reply rows first")
    s_login = State(demo=True, paths={**DEMO_PATHS, "command_status": FIXTURES / "demo-status-login-needed.json"}, send_log=tmp / "l.json")
    check(any(p["code"] == "command_login" for p in s_login.snapshot()["problems"]), "login needed in status.json becomes a problem row")

    n_before = snap["feed"]["counts"]["touches_due"]
    r = s.touch("247", "called, left voicemail")
    check(r["ok"] and s.snapshot()["feed"]["counts"]["touches_due"] == n_before - 1, "touch drops the person from touches due")
    try:
        s.touch("", "x"); check(False, "touch without a person is refused")
    except CRMError:
        check(True, "touch without a person is refused")

    t = s.add_task("85", "Call back about the short sale", "2026-10-23")
    check(t["ok"] and any(x["task"] == "Call back about the short sale" for x in s.feed()["tasks"]), "new task lands in the list")
    d = s.done(t["result"]["task_id"])
    check(d["ok"] and not any(x.get("task_id") == t["result"]["task_id"] for x in s.feed()["tasks"]), "done removes the task")
    na = next(x for x in s.feed()["tasks"] if not x.get("task_id"))
    d2 = s.done("", na["person_id"], na["task"])
    check(d2["ok"] and d2["result"].get("synced"), "done on a Next_Action row goes through sync first")

    dl = s.deal("2179 S Turnberry Ave", {"stage": "under_contract", "price": "315000", "next_step": "inspection Friday"})
    check(dl["ok"] and dl["result"]["stage"] == "under_contract", "deal edit by street")
    try:
        s.deal("2179 S Turnberry Ave", {"stage": "won"}); check(False, "deal refuses an unknown stage")
    except CRMError:
        check(True, "deal refuses an unknown stage")
    try:
        s.deal("9 Nowhere Ln", {"stage": "lead"}); check(False, "deal refuses a new street without create")
    except CRMError:
        check(True, "deal refuses a new street without create")
    check(s.deal("9 Nowhere Ln", {"stage": "lead", "create": True, "side": "buyer"})["ok"], "deal with create adds it")

    r = s.send("text", "312", "+12255550111", "Hey, checking in", display="Demo Person")
    check(r["ok"] and r["result"]["status"] == "dry-run", "demo send is a dry run")
    check(s.sent_today()["texts"] == 1 and (tmp / "send-log.json").exists(), "send log counts today's texts")
    try:
        s.send("email", "312", "x@example.com", "body", subject=""); check(False, "email needs a subject")
    except CRMError:
        check(True, "email needs a subject")
    s.dnc("401", "asked us to stop")
    try:
        s.send("text", "401", "+12255550140", "hi"); check(False, "Do Not Contact refuses the send")
    except CRMError as e:
        check("Do_Not_Contact" in str(e), "Do Not Contact refuses the send")
    s.max_texts = 1
    try:
        s.send("text", "118", "+12255550118", "hi"); check(False, "daily cap refuses the 26th text")
    except CRMError as e:
        check("cap" in str(e), "daily cap refuses the text past the cap")
    s.max_texts = 25

    # Claude Q&A and ElevenLabs, with the network faked
    v = s.snapshot()["voice"]
    check(v["ask"] is False and v["tts"] == "browser", "demo: both paid services read as off")
    r = s.ask("who should I call first")
    check(r["ok"] and "Demo mode" in r["result"]["answer"] and s.voice_usage()["asked"] == 1, "demo ask answers without the network and counts")
    ctx = State(demo=True, send_log=tmp / "ctx.json").ask_context()
    check(ctx["touches_due_top"][0]["name"] == "Taylor Sample" and ctx["touches_due_top"][0]["last_texts"] and "+1225" not in json.dumps(ctx)
          and "@example.com" not in json.dumps(ctx), "ask context carries names, bands and last texts but no phone numbers or emails")
    import types
    calls = {}

    class FakeResp:
        stop_reason = "end_turn"; model = "claude-opus-5-5"
        content = [types.SimpleNamespace(type="text", text="Call Taylor first, they texted twice yesterday.")]
        usage = types.SimpleNamespace(input_tokens=1200, output_tokens=30)

    class FakeMessages:
        def create(self, **kw):
            calls.update(kw); return FakeResp()

    class FakeAnthropic:
        def __init__(self, api_key=""):
            self.beta = types.SimpleNamespace(messages=FakeMessages()); self.messages = FakeMessages()
    fake = types.ModuleType("anthropic"); fake.Anthropic = FakeAnthropic
    for name in ("AuthenticationError", "RateLimitError", "APIStatusError", "APIConnectionError"):
        setattr(fake, name, type(name, (Exception,), {}))
    sys.modules["anthropic"] = fake
    s3 = State(demo=True, send_log=tmp / "ask.json"); s3.demo = False; s3.ask_key = "sk-test"; s3.usage_path = tmp / "usage.json"
    r = s3.ask("who first")
    check(r["ok"] and r["result"]["answer"].startswith("Call Taylor") and calls["model"] == ASK_MODEL_DEFAULT and calls["max_tokens"] <= 2000
          and calls.get("fallbacks") == "default" and "Caleb asked, by voice: who first" in calls["messages"][0]["content"]
          and {t["name"] for t in calls["tools"]} >= {"who_to_contact", "find_person", "label_review", "propose"},
          "ask calls the SDK with the default model, a bounded cap, the fallback, the question and the Jarvis tools")
    check(s3.voice_usage()["input_tokens"] == 1200 and s3.voice_info()["ask_cost_estimate_usd"] > 0, "ask logs the tokens and estimates the spend")
    c1 = s3.voice_info()["ask_cost_estimate_usd"]; s3.log_claude("ask", ASK_MODEL_DEFAULT, {"cache_read_input_tokens": 1_000_000})
    check(abs(s3.voice_info()["ask_cost_estimate_usd"] - c1 - jarvis.PRICES[ASK_MODEL_DEFAULT][2]) < 1e-6 and s3.voice_usage()["cache_read_input_tokens"] >= 1_000_000,
          "the running total keeps the cache meters and adds each call's exact cost")
    del sys.modules["anthropic"]
    try:
        s.speak("hello"); check(False, "speak refuses without a key")
    except CRMError as e:
        check("ElevenLabs is off" in str(e), "speak refuses without a key")
    seen = {}

    class FakeHTTP:
        def __init__(self, req, timeout=0): seen["url"] = req.full_url; seen["key"] = req.get_header("Xi-api-key"); seen["body"] = json.loads(req.data)
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def read(self): return b"ID3fake-mp3"
    real_open = urllib.request.urlopen; urllib.request.urlopen = FakeHTTP
    s3.eleven_key = "el-test"
    audio = s3.speak("Pipeline online.")
    urllib.request.urlopen = real_open
    check(audio.startswith(b"ID3") and ELEVEN_VOICE_DEFAULT in seen["url"] and seen["key"] == "el-test" and seen["body"]["model_id"] == ELEVEN_MODEL_DEFAULT
          and s3.voice_usage()["spoken_chars"] == len("Pipeline online."), "speak posts the text to ElevenLabs with the key and counts the characters")
    try:
        s3.call_token(); check(False, "call token refuses without the Speech Engine id")
    except CRMError as e:
        check("SPEECH_ENGINE_ID" in str(e), "call token refuses without the Speech Engine id")
    class FakeConvs:
        def get_webrtc_token(self, agent_id): seen["agent_id"] = agent_id; return types.SimpleNamespace(token="tok_123")
    fake_el = types.ModuleType("elevenlabs"); fake_el.ElevenLabs = lambda api_key="": types.SimpleNamespace(conversational_ai=types.SimpleNamespace(conversations=FakeConvs()))
    sys.modules["elevenlabs"] = fake_el
    s3.speech_engine_id = "seng_test"
    t = s3.call_token()
    del sys.modules["elevenlabs"]
    check(t["ok"] and t["result"]["token"] == "tok_123" and seen["agent_id"] == "seng_test" and s3.voice_usage()["calls"] == 1 and s3.voice_info()["speech_engine"],
          "call token comes from ElevenLabs with the Speech Engine id as agent id and is counted")
    envf = tmp / "pipeline.env"; envf.write_text("# keys\nPIPELINE_TEST_KEY=abc\nELEVENLABS_VOICE_ID='v1'\n")
    os.environ.pop("PIPELINE_TEST_KEY", None); n = load_env_file(envf)
    check(n >= 1 and os.environ.get("PIPELINE_TEST_KEY") == "abc", "pipeline.env lines land in the environment")

    # header_ok false: the screen gets a stop-level problem and no feed
    s2 = State(demo=True, send_log=tmp / "x.json")
    s2._demo_cache = {**read_json(DEMO_PATHS["feed"], {}), "header_ok": False, "missing_columns": ["Last_Touch"]}
    check(any(p["level"] == "stop" for p in s2.snapshot()["problems"]), "header_ok false is a stop")

    # live texting: iMessage first, SMS when chat.db marks the iMessage failed, error when both fail
    calls = []
    fake_send = lambda phone, body, service: calls.append(service)
    out = send_imessage("+12255550101", "hi", sender=fake_send, wait=lambda ph, t: "delivered")
    check(calls == ["iMessage"] and "iMessage delivered" in out, "a delivered iMessage is sent once")
    calls.clear(); states = iter(["error", "delivered"])
    out = send_imessage("+12255550101", "hi", sender=fake_send, wait=lambda ph, t: next(states))
    check(calls == ["iMessage", "SMS"] and "SMS" in out, "a failed iMessage goes again as SMS")
    calls.clear(); states = iter(["pending"])
    out = send_imessage("+12255550101", "hi", sender=fake_send, wait=lambda ph, t: next(states))
    check(calls == ["iMessage"] and "not confirmed" in out, "an unconfirmed iMessage is not sent twice")
    calls.clear()
    try:
        send_imessage("+12255550101", "hi", sender=fake_send, wait=lambda ph, t: "error"); check(False, "iMessage and SMS both failing is an error")
    except CRMError:
        check(calls == ["iMessage", "SMS"], "iMessage and SMS both failing is an error")
    import sqlite3
    db = tmp / "chat.db"
    con = sqlite3.connect(db)
    con.executescript("CREATE TABLE handle (ROWID INTEGER PRIMARY KEY, id TEXT); CREATE TABLE message (ROWID INTEGER PRIMARY KEY, handle_id INT, is_from_me INT, date INT, error INT, is_delivered INT, is_sent INT);")
    con.execute("INSERT INTO handle VALUES (1, '+12255550101')")
    t_now = time.time(); apple = lambda t: int((t - APPLE_EPOCH) * 1e9)
    con.execute("INSERT INTO message VALUES (1, 1, 1, ?, 0, 1, 1)", (apple(t_now - 3600),))
    con.commit()
    check(delivery_state("(225) 555-0101", t_now, db) == "unknown", "chat.db: a message from before the send does not count")
    con.execute("INSERT INTO message VALUES (2, 1, 1, ?, 22, 0, 0)", (apple(t_now + 1),)); con.commit()
    check(delivery_state("2255550101", t_now, db) == "error", "chat.db: an error on the new message reads as error")
    con.execute("INSERT INTO message VALUES (3, 1, 1, ?, 0, 1, 1)", (apple(t_now + 2),)); con.commit()
    check(delivery_state("+1 225 555 0101", t_now, db) == "delivered", "chat.db: the newest message wins, matched on the last ten digits")
    con.close()
    check(delivery_state("+12255550101", t_now, tmp / "missing.db") == "unknown", "chat.db unreadable reads as unknown, never as sent")
    sl = State(demo=True, send_log=tmp / "live" / "send-log.json"); sl.demo = False; sl.sender = "live"
    orig = send_imessage.__defaults__
    send_imessage.__defaults__ = (lambda ph, b, sv: None, lambda ph, t: "error", time.time)
    try:
        sl.send("text", "118", "+12255550101", "hello", display="Riley Quiet"); check(False, "a failed live text is logged as failed and not touched")
    except CRMError:
        last = sl.send_log()[-1]
        check(last["status"] == "failed" and not any(a[0] == "touch" and "--dry-run" not in a and a[2:3] != ["pre-send check"] for a in sl.crm.log),
              "a failed live text is logged as failed and not touched")
    finally:
        send_imessage.__defaults__ = orig

    # the "Texted · delivered" line on a person's card
    check(delivery_from_detail("sent", "iMessage delivered") == "delivered" and delivery_from_detail("sent", "not on iMessage, sent as SMS") == "sent"
          and delivery_from_detail("sent", "iMessage handed to Messages, delivery not confirmed yet") == "pending"
          and delivery_from_detail("dry-run", "") == "dry-run" and delivery_from_detail("failed", "x") == "error", "send detail maps to a delivery word")
    lt = State(demo=True, send_log=tmp / "lt" / "send-log.json"); lt.demo = False; lt.sender = "live"
    at_old = datetime.fromtimestamp(t_now - 40 * 86400, CENTRAL).isoformat(timespec="seconds")
    at_new = datetime.fromtimestamp(t_now - 5, CENTRAL).isoformat(timespec="seconds")
    at_dry = datetime.fromtimestamp(t_now - 60, CENTRAL).isoformat(timespec="seconds")
    write_json(lt.send_log_path, [
        {"at": at_old, "kind": "text", "person_id": "old", "to": "+12255550199", "status": "sent", "detail": "iMessage delivered"},
        {"at": at_dry, "kind": "text", "person_id": "118", "to": "+12255550101", "status": "dry-run", "detail": "not live"},
        {"at": at_new, "kind": "text", "person_id": "118", "to": "+12255550101", "status": "sent", "detail": "iMessage handed to Messages, delivery not confirmed yet"},
        {"at": at_new, "kind": "email", "person_id": "120", "to": "a@example.com", "status": "sent", "detail": "gmail"}])
    got = lt.last_texts(db=tmp / "missing.db")
    check(set(got) == {"118"} and got["118"]["delivery"] == "pending", "last text per person: newest wins, emails and texts older than 30 days left out")
    check(lt.last_texts(db=db)["118"]["delivery"] == "delivered", "an unconfirmed live text flips to delivered when chat.db confirms it")
    check(next(r for r in lt.send_log() if r["at"] == at_new and r["kind"] == "text")["delivery"] == "delivered", "the confirmed delivery is written back to the send log")
    lt.sender = "dry"
    write_json(lt.send_log_path, [{"at": at_new, "kind": "text", "person_id": "118", "to": "+12255550101", "status": "sent", "detail": "iMessage sent"}])
    check(lt.last_texts(db=db)["118"]["delivery"] == "sent", "chat.db is only read when Pipeline is live")
    sd = State(demo=True, send_log=tmp / "lt2" / "send-log.json")
    sd.send("text", "118", "+12255550101", "hello", display="Riley Quiet")
    snap_lt = sd.snapshot()["last_texts"]
    check(snap_lt.get("118", {}).get("delivery") == "dry-run" and snap_lt["118"]["display"] == "Riley Quiet", "a demo send shows on the card as a dry run")

    # Round 2, item 6: the CRM feed's last rebuild, read from its log. A failure shows; a run that never ended is a failure.
    lg = tmp / "feed.log"
    at = datetime(2026, 11, 8, 13, 0, tzinfo=CENTRAL)
    lg.write_text("2026-11-08 12:30:00 start\n2026-11-08 12:30:04 feed ok\n2026-11-08 12:45:00 start\n2026-11-08 12:45:03 feed failed, previous feed.json kept\n")
    r = feed_run_status(lg, at)
    check(r["state"] == "failed" and r["at"].startswith("2026-11-08T12:45:03") and "failed" in r["detail"], "a failed feed rebuild is read from the log")
    lg.write_text("2026-11-08 12:45:00 start\n2026-11-08 12:45:01 imessage_signals failed, feed keeps the last signals file\n2026-11-08 12:45:03 feed ok\n")
    r = feed_run_status(lg, at)
    check(r["state"] == "ok" and r["signals_failed"] and "signals" in r["detail"], "a rebuild that kept old signals is ok and says so")
    lg.write_text("2026-11-08 12:30:00 start\n2026-11-08 12:30:04 feed ok\n2026-11-08 12:40:00 start\n")
    check(feed_run_status(lg, at)["state"] == "failed" and feed_run_status(lg, datetime(2026, 11, 8, 12, 45, tzinfo=CENTRAL))["state"] == "running",
          "a rebuild that never finished is a failure after 10 minutes, running before")
    check(feed_run_status(tmp / "nope.log", at) is None and State(demo=True, send_log=tmp / "fr.json").snapshot()["feed_run"] is None, "no log, or demo: no feed run status")
    sfr = State(demo=True, send_log=tmp / "fr2.json"); sfr.feed_run = lambda: {"state": "failed", "at": "x", "at_text": "Nov 8, 12:45 PM", "detail": "crm.py feed failed"}
    check(any(p["code"] == "feed_failed" for p in sfr.snapshot()["problems"]), "a failed feed rebuild becomes a problem row")

    # Round 2, item 14: problem rows say what to do in words, never a file name or a path.
    s_nofeed = State(demo=True, send_log=tmp / "nf.json"); s_nofeed._demo_cache = {}
    texts = " ".join(p["text"] for p in s_nofeed.snapshot()["problems"])
    check(bool(texts) and not re.search(r"\.json|/|~|token", texts), "problem rows never name a file or a path")

    # map and market monitor
    sm = State(demo=True, send_log=tmp / "map" / "send-log.json")
    snap = sm.snapshot()
    check(snap["feed"]["map"]["counts"]["persons"] > 0 and snap["feed"]["market"]["rows"] and snap["farms"] == [], "demo feed carries map pins and market rows, no farms yet")
    sq = [[30.5, -91.3], [30.5, -91.0], [30.3, -91.0], [30.3, -91.3]]
    r = sm.save_farms([{"name": "Fixture South", "polygon": sq}])
    check(r["ok"] and sm.farms()[0]["id"] == "fixture-south" and len(sm.farms()[0]["polygon"]) == 4, "a drawn farm is saved with an id from its name")
    for bad, why in (([{"name": "Two", "polygon": sq[:2]}], "two corners"), ([{"name": "", "polygon": sq}], "no name"),
                     ([{"name": "A", "polygon": sq}, {"name": "a", "polygon": sq}], "same name twice"), ([{"name": "Off", "polygon": [[95, 0], [0, 0], [0, 1]]}], "off the map")):
        try:
            sm.save_farms(bad); check(False, f"a farm with {why} is refused")
        except CRMError:
            check(True, f"a farm with {why} is refused")
    rid = snap["feed"]["market"]["rows"][0]["id"]
    sm.dismiss(rid)
    check(all(x["id"] != rid for x in sm.snapshot()["feed"]["market"]["rows"]) and rid in sm.dismissed(), "a dismissed market row leaves the screen and stays in dismissed.json")
    lead = sm.make_lead("Owner at 1 Fixture Way", "Market Monitor permit 2026-10-26", note="roof permit")
    check(lead["ok"] and sm.crm.log[-1][:4] == ["lead", "Owner at 1 Fixture Way", "--source", "Market Monitor permit 2026-10-26"] and "--note" in sm.crm.log[-1], "Make lead is one crm.py lead call with the source")
    try:
        sm.make_lead("Owner at 1 Fixture Way", "Market Monitor permit 2026-10-26"); check(False, "a duplicate lead is refused")
    except CRMError:
        check(True, "a duplicate lead is refused")
    # Add a lead from the Dashboard or Leads: name, phone, email, source, one Save, one crm.py lead call (round 2, item 2).
    sm.make_lead("Fixture Newlead", "Referral 2026-11-08", phone="225-555-0188", email="newlead@example.com", next_action="Reach out: new lead")
    last = sm.crm.log[-1]
    check(last[:4] == ["lead", "Fixture Newlead", "--source", "Referral 2026-11-08"] and last[last.index("--phone") + 1] == "225-555-0188"
          and last[last.index("--email") + 1] == "newlead@example.com" and "--next-action" in last, "Add a lead sends name, phone, email and source in one crm.py lead call")
    try:
        sm.make_lead("", "Website 2026-11-08"); check(False, "a lead with no name is refused")
    except CRMError:
        check(True, "a lead with no name is refused")
    people = [{"kind": "person", "person_id": "1", "display": "A Fixture", "phone": "+12255550001", "address": "1 Fixture St", "city": "Baton Rouge", "zip": "70808"},
              {"kind": "person", "person_id": "2", "display": "B Fixture", "phone": "", "address": "2 Fixture St", "city": "Baton Rouge", "zip": "70808"}]
    c1 = sm.add_to_list("call", people)
    c2 = sm.add_to_list("call", people)
    p1 = sm.add_to_list("postcards", people + [{"kind": "market", "display": "Current resident", "address": "3 Fixture St", "city": "Zachary", "zip": "70791"}])
    check(c1["result"]["added"] == 1 and c2["result"]["added"] == 0 and p1["result"]["added"] == 3, "call list needs a phone, postcards need an address, nobody is added twice")
    sm.add_to_list("postcards", [{"kind": "market", "display": "x", "address": '=HYPERLINK("http://x","a")', "city": "-1+1", "zip": "70808"}])
    with Path(p1["result"]["file"]).open(newline="", encoding="utf-8") as fh:
        last = list(csv.DictReader(fh))[-1]
    check(last["address"].startswith("'=") and last["city"] == "'-1+1" and csv_safe("+12255550142", "phone") == "+12255550142", "list cells that look like formulas are neutralized, phones are not")
    sm.save_farms([{"name": "St. Francisville's Core", "polygon": sq}])
    check(sm.farms()[0]["id"] == "st-francisville-s-core", "farm ids are letters, numbers and dashes only")
    check(Path(c1["result"]["file"]).name == f"call-list-{today().isoformat()}.csv" and Path(c1["result"]["file"]).parent == tmp / "map" / "lists", "lists are dated CSVs next to the state, never in git")

    # the HTTP layer end to end on a free port
    import socket
    sock = socket.socket(); sock.bind(("127.0.0.1", 0)); port = sock.getsockname()[1]; sock.close()
    os.environ["PIPELINE_LOGIN_FILE"] = str(tmp / "login.json")  # never the real passcode file
    Handler.state = State(demo=True, send_log=tmp / "http.json")
    state = Handler.state
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    th = threading.Thread(target=httpd.serve_forever, daemon=True); th.start()
    base = f"http://127.0.0.1:{port}"
    html = urllib.request.urlopen(base + "/").read().decode()
    check("<title>Pipeline" in html, "GET / serves the screen")
    st = json.loads(urllib.request.urlopen(base + "/api/state").read())
    check(st["feed"]["counts"]["contacts"] > 0, "GET /api/state")
    ccp = json.loads(urllib.request.urlopen(base + "/api/cc").read())
    check(ccp["demo"] and ccp["fresh"]["deals"]["state"] == "ok" and ccp["scorecard"]["pending"]["value"] > 0, "GET /api/cc in demo")
    req = urllib.request.Request(base + "/api/touch", data=json.dumps({"person_id": "118", "what": "test"}).encode(),
                                 headers={"Content-Type": "application/json"})
    check(json.loads(urllib.request.urlopen(req).read())["ok"], "POST /api/touch")
    evil = urllib.request.Request(base + "/api/touch", data=b'{"person_id": "118"}', headers={"Content-Type": "application/json", "Origin": "https://evil.example"})
    try:
        urllib.request.urlopen(evil); check(False, "POST from another site is refused")
    except urllib.error.HTTPError as e:
        check(e.code == 403, "POST from another site is refused")
    rebind = urllib.request.Request(base + "/api/touch", data=b"{}", headers={"Content-Type": "application/json", "Host": "attacker.example:4747"})
    try:
        urllib.request.urlopen(rebind); check(False, "POST under a foreign Host is refused")
    except urllib.error.HTTPError as e:
        check(e.code == 403, "POST under a foreign Host is refused")
    gq = urllib.request.Request(base + "/api/cc/goals", data=json.dumps({"gci_goal": 90000}).encode(), headers={"Content-Type": "application/json", "Origin": base.rstrip("/")})
    check(json.loads(urllib.request.urlopen(gq).read())["ok"], "POST /api/cc/goals from Pipeline's own page")
    check(json.loads(urllib.request.urlopen(base + "/api/cc").read())["goals"].get("gci_goal") == 90000, "goals read back on /api/cc")
    rq = urllib.request.Request(base + "/api/cc/row", data=json.dumps({"tab": "Workout log", "row": {"date": "2026-11-05", "focus": "Lower"}}).encode(), headers={"Content-Type": "application/json"})
    check(json.loads(urllib.request.urlopen(rq).read())["ok"], "POST /api/cc/row queues a workout")
    rq = urllib.request.Request(base + "/api/cc/row", data=json.dumps({"tab": "Contacts", "row": {}}).encode(), headers={"Content-Type": "application/json"})
    check(not json.loads(urllib.request.urlopen(rq).read())["ok"], "POST /api/cc/row refuses an engine tab")
    k = json.loads(urllib.request.urlopen(base + "/api/push/key").read())
    check(k["ok"] and len(k["key"]) == 87, "GET /api/push/key gives the public key")
    rq = urllib.request.Request(base + "/api/push/subscribe", data=json.dumps({"subscription": {"endpoint": "https://evil.example/x"}}).encode(), headers={"Content-Type": "application/json"})
    check(not json.loads(urllib.request.urlopen(rq).read())["ok"], "a subscription to a non-push address is refused")
    rq = urllib.request.Request(base + "/api/push/test", data=b"{}", headers={"Content-Type": "application/json"})
    urllib.request.urlopen(rq)
    check(json.loads(urllib.request.urlopen(base + "/api/alerts").read())["rows"][0]["kind"] == "test", "a test alert shows in /api/alerts")
    rq = urllib.request.Request(base + "/api/cc/ask", data=json.dumps({"page": "ccleads", "question": "Any new leads?"}).encode(), headers={"Content-Type": "application/json"})
    r = json.loads(urllib.request.urlopen(rq).read())
    check(r["ok"] and "Demo mode" in r["answer"] and r["cap"] == cc_ask.CAP, "POST /api/cc/ask answers in demo without calling Claude")
    check(json.loads(urllib.request.urlopen(base + "/api/cc").read())["ask"]["on"], "/api/cc says Ask Claude is on")
    # the login: anything that is not this Mac needs a passcode session
    host = f"pipeline-mac.tail1234.ts.net"
    def remote(path, data=None, cookie=None):
        h = {"Host": host, "X-Forwarded-For": "100.64.0.7", "X-Forwarded-Proto": "https", "Content-Type": "application/json"}
        if data is not None:
            h["Origin"] = "https://" + host
        if cookie:
            h["Cookie"] = cookie
        rq = urllib.request.Request(base + path, data=None if data is None else json.dumps(data).encode(), headers=h)
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *a, **k):
                return None
        try:
            r = urllib.request.build_opener(NoRedirect).open(rq)
            return r.status, r.headers, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.headers, e.read()
    code, _, _ = remote("/api/cc")
    check(code == 401, "a phone with no session gets 401 on the API")
    code, hd, body = remote("/api/login", {"passcode": "nothing set yet"})
    check(code == 200 and "no passcode" in json.loads(body)["error"], "login says when no passcode is set")
    auth.set_passcode("correct horse battery", state.auth.login_file)
    for _i in range(2):
        code, hd, body = remote("/api/login", {"passcode": "wrong one here"})
    check(not json.loads(body)["ok"], "a wrong passcode is refused")
    code, hd, body = remote("/api/login", {"passcode": "correct horse battery"})
    ck = (hd.get("Set-Cookie") or "").split(";")[0]
    check(json.loads(body)["ok"] and "HttpOnly" in hd.get("Set-Cookie", "") and "Secure" in hd.get("Set-Cookie", "") and "SameSite=Strict" in hd.get("Set-Cookie", ""), "the right passcode sets a locked-down cookie")
    code, _, body = remote("/api/cc", cookie=ck)
    check(code == 200 and json.loads(body)["demo"], "with the session the phone reads /api/cc")
    code, hd, _ = remote("/", cookie=None)
    check(code == 302 and hd.get("Location") == "/login", "a page without a session goes to /login")
    code, _, body = remote("/sw.js")
    check(code in (200, 404), "the service worker needs no session")
    check(b"__BUILD__" not in body and static_build().encode() in body, "sw.js carries the build hash of static/")
    sb = tmp / "sb"; sb.mkdir(); (sb / "a.js").write_text("one"); b1 = static_build(sb)
    (sb / "a.js").write_text("two"); b2 = static_build(sb)
    check(b1 != b2 and len(b1) == 12, "any change in static/ gives a new build, so the cache name moves on")
    for hdr in ("X-Forwarded-Proto", "Tailscale-User-Login", "Tailscale-User-Name", "X-Forwarded-For"):
        check(not auth.Auth.is_local({"Host": f"127.0.0.1:{port}", hdr: "x"}, port), f"a request carrying {hdr} needs the login")
    check(not auth.Auth.is_local({"Host": "calebs-mac-mini.tail512a6c.ts.net"}, port), "the tailnet name needs the login even with no proxy headers")
    code, hd, _ = remote("/")
    check(code == 302 and hd.get("Location") == "/login", "the tailnet address with no cookie goes to the sign-in page")
    code, _, body = remote("/login")
    check(code == 200 and b"caches.delete('pipeline-data-v1')" in body, "the sign-in page drops the offline data copy")
    lock = auth.Auth(tmp / "s2.json", login_file=state.auth.login_file)
    for _i in range(5):
        try:
            lock.login("wrong passcode!", "1.2.3.4")
        except ValueError:
            pass
    try:
        lock.login("correct horse battery", "1.2.3.4"); check(False, "five wrong tries lock the address")
    except ValueError as e:
        check("too many" in str(e), "five wrong tries lock the address")
    check(auth.Auth.is_local({"Host": f"127.0.0.1:{port}"}, port) and not auth.Auth.is_local({"Host": f"127.0.0.1:{port}", "X-Forwarded-For": "1.1.1.1"}, port), "a proxied request is never treated as local")
    remote("/api/logout", {}, cookie=ck)
    code, _, _ = remote("/api/cc", cookie=ck)
    check(code == 401, "after logout the old session is refused")
    req = urllib.request.Request(base + "/api/dnc", data=json.dumps({"person_id": "118", "reason": ""}).encode(),
                                 headers={"Content-Type": "application/json"})
    check(json.loads(urllib.request.urlopen(req).read())["ok"] is False, "POST with a gate failure answers ok false, not 500")
    try:
        urllib.request.urlopen(base + "/../app.py"); check(False, "no path escape")
    except Exception:
        check(True, "static files never leave static/")
    httpd.shutdown()

    # the engine wrapper parses the engine's contract
    fake = tmp / "crm.py"
    fake.write_text("import sys, json\nprint('noise')\nprint(json.dumps({'ok': '--dry-run' not in sys.argv, 'result': sys.argv[1:], 'error': 'gate'}))\n")
    e = EngineCRM(sys.executable, fake)
    out = e.run(["touch", "1", "x"])
    check(out["result"][:3] == ["--json", "--client", "pipeline"], "engine calls carry --json --client pipeline")
    try:
        e.run(["touch", "1", "x"], dry_run=True); check(False, "engine ok:false becomes CRMError")
    except CRMError as ex:
        check(str(ex) == "gate", "engine ok:false becomes CRMError")

    print(f"\n{failures} failure(s)")
    return 1 if failures else 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Pipeline, Caleb's daily tool")
    ap.add_argument("--demo", action="store_true", help="made-up people from fixtures/, no CRM writes")
    ap.add_argument("--demo-feed", help="with --demo: another feed fixture, for example one with header_ok false")
    ap.add_argument("--demo-status", help="with --demo: another status.json fixture, for example demo-status-login-needed.json")
    ap.add_argument("--port", type=int, default=int(os.getenv("PIPELINE_PORT", "4747")))
    ap.add_argument("--no-open", action="store_true", help="do not open the browser")
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--set-passcode", action="store_true", help="set the passcode the phone signs in with")
    a = ap.parse_args(argv)
    if a.test:
        return run_tests()
    if a.set_passcode:
        return auth.cmd_set_passcode()
    load_env_file()
    paths = None
    if a.demo and (a.demo_feed or a.demo_status):
        paths = dict(DEMO_PATHS)
        if a.demo_feed:
            paths["feed"] = Path(a.demo_feed)
        if a.demo_status:
            paths["command_status"] = Path(a.demo_status)
    serve(State(demo=a.demo, paths=paths), a.port, open_browser=not a.no_open)
    return 0


if __name__ == "__main__":
    sys.exit(main())
