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
  Both spend money per call. out/voice-usage.json keeps the running count and the screen shows it.

Environment:
  PIPELINE_PORT      default 4747
  PIPELINE_PYTHON    Python for crm.py, default ~/.aire/venv/bin/python when it exists, else this interpreter
  PIPELINE_SENDER    live | dry (default dry)
  PIPELINE_MAX_TEXTS, PIPELINE_MAX_EMAILS   default 25
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
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
    except FileNotFoundError:
        pass
    return n


PATHS = {
    "feed": AIRE / "crm" / "feed.json",
    "text_queue": AIRE / "follow-up" / "out" / "text-queue.json",
    "email_queue": AIRE / "follow-up" / "out" / "email-queue.json",
    "command_status": AIRE / "command-reader" / "out" / "status.json",
    "send_log": OUT / "send-log.json",
    "voice_usage": OUT / "voice-usage.json",
    "feed_log": Path.home() / ".aire" / "logs" / "feed.log",
}
ASK_MODEL_DEFAULT = "claude-opus-5-5"
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
}
CRM_PY = AIRE / "crm" / "crm.py"
REFRESH_SH = AIRE / "crm" / "refresh_feed.sh"
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
        self.lock = threading.Lock()
        self._demo_cache: dict | None = None
        self.started = now().isoformat(timespec="seconds")

    # ---- reads
    def feed(self) -> dict:
        if self.demo:
            if self._demo_cache is None:
                self._demo_cache = read_json(self.paths["feed"], {})
            return self._demo_cache
        return read_json(self.paths["feed"], {})

    def send_log(self) -> list[dict]:
        log = read_json(self.send_log_path, [])
        return log if isinstance(log, list) else []

    def sent_today(self) -> dict:
        d = today().isoformat()
        rows = [r for r in self.send_log() if r.get("at", "").startswith(d) and r.get("status") in ("sent", "dry-run")]
        return {"texts": sum(1 for r in rows if r["kind"] == "text"), "emails": sum(1 for r in rows if r["kind"] == "email")}

    # ---- voice services
    def voice_usage(self) -> dict:
        u = read_json(self.usage_path, {})
        if not isinstance(u, dict) or "_error" in u:
            u = {}
        return {"asked": int(u.get("asked", 0)), "input_tokens": int(u.get("input_tokens", 0)), "output_tokens": int(u.get("output_tokens", 0)),
                "spoken_chars": int(u.get("spoken_chars", 0)), "last": u.get("last", "")}

    def _bump_usage(self, **delta) -> dict:
        with self.lock:
            u = self.voice_usage()
            for k, v in delta.items():
                u[k] = u.get(k, 0) + v
            u["last"] = now().isoformat(timespec="seconds")
            write_json(self.usage_path, u)
            return u

    def voice_info(self) -> dict:
        u = self.voice_usage()
        # Rough spend, from the published per-token prices of the default model and ElevenLabs' per-character plans.
        est = u["input_tokens"] / 1e6 * 4.0 + u["output_tokens"] / 1e6 * 20.0 if self.ask_model == ASK_MODEL_DEFAULT else None
        return {"ask": bool(self.ask_key), "ask_model": self.ask_model, "tts": "elevenlabs" if self.eleven_key else "browser",
                "voice_id": self.eleven_voice if self.eleven_key else "", "usage": u, "ask_cost_estimate_usd": round(est, 4) if est is not None else None}

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
        deals = [{"address": d.get("address"), "who": d.get("display"), "side": d.get("side"), "stage": d.get("stage"), "price": d.get("price"),
                  "expected_close": d.get("expected_close"), "next_step": d.get("next_step"), "last_event": d.get("last_event")} for d in f.get("deals", [])[:15]]
        leads = [{"name": l.get("display"), "source": l.get("source"), "received": l.get("received"), "next_action": l.get("next_action")} for l in f.get("new_leads", [])[:15]]
        sent = self.sent_today()
        return {"today": today().isoformat(), "feed_as_of": f.get("as_of"), "counts": f.get("counts"), "cadence_days": f.get("cadence_days"),
                "touches_due_top": due, "tasks": tasks, "live_deals": deals, "new_leads": leads,
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
            raise CRMError("the anthropic package is not installed in Pipeline's Python (pip install anthropic in ~/.aire/venv)")
        client = anthropic.Anthropic(api_key=self.ask_key)
        messages = [{"role": "user", "content": "Today's pipeline data as JSON:\n" + json.dumps(self.ask_context(), ensure_ascii=False)
                                                + "\n\nCaleb asked, by voice: " + question}]
        kwargs = dict(model=self.ask_model, max_tokens=400, system=ASK_SYSTEM, messages=messages, output_config={"effort": "low"})
        try:
            try:  # refusal fallback on the current Opus and Fable models; older SDKs or models do not know the parameter
                resp = client.beta.messages.create(betas=["server-side-fallback-2026-07-01"], fallbacks="default", **kwargs)
            except TypeError:
                resp = client.messages.create(**kwargs)
        except anthropic.AuthenticationError:
            raise CRMError("Anthropic refused the API key")
        except anthropic.RateLimitError:
            raise CRMError("Anthropic rate limit, try again in a minute")
        except anthropic.APIStatusError as e:
            raise CRMError(f"Anthropic error {e.status_code}: {getattr(e, 'message', '')[:120]}")
        except anthropic.APIConnectionError:
            raise CRMError("could not reach Anthropic")
        if getattr(resp, "stop_reason", "") == "refusal":
            raise CRMError("Claude declined that one")
        answer = " ".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
        u = self._bump_usage(asked=1, input_tokens=int(getattr(resp.usage, "input_tokens", 0)), output_tokens=int(getattr(resp.usage, "output_tokens", 0)))
        return {"ok": True, "result": {"answer": answer or "I have nothing on that.", "model": getattr(resp, "model", self.ask_model)}, "usage": u}

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

    def snapshot(self) -> dict:
        feed = self.feed()
        text_q = read_json(self.paths["text_queue"], {})
        email_q = read_json(self.paths["email_queue"], {})
        command = read_json(self.paths["command_status"], {})
        feed_age = 0 if self.demo else file_age_minutes(self.paths["feed"])
        sent = self.sent_today()
        feed_ok = bool(feed) and "_error" not in feed
        problems = []
        if not feed:
            problems.append({"level": "warn", "code": "no_feed", "text": "No feed.json yet. Run the refresh."})
        elif "_error" in feed:
            problems.append({"level": "warn", "code": "feed_unreadable", "text": f"feed.json could not be read ({feed['_error']})."})
        elif feed.get("header_ok") is False:
            problems.append({"level": "stop", "code": "header_not_ok",
                             "text": "The Contacts header lost a column the engine needs: " + ", ".join(feed.get("missing_columns", []))})
        if feed_age is not None and feed_age > 60:
            problems.append({"level": "warn", "code": "feed_stale", "text": f"Feed is {feed_age // 60}h {feed_age % 60}m old."})
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
            "feed": feed if feed_ok else {},
            "text_queue": text_q if "_error" not in text_q else {},
            "email_queue": email_q if "_error" not in email_q else {},
            "command": command if "_error" not in command else {},
            "caps": {"texts": self.max_texts, "emails": self.max_emails, "sent_texts": sent["texts"], "sent_emails": sent["emails"]},
            "sent_today": [r for r in self.send_log() if r.get("at", "").startswith(today().isoformat())][-50:],
            "refresh": self.refresh,
            "problems": problems,
            "links": {"sheet": SHEET_URL.format(sheet_id=feed.get("sheet_id", "")) if feed.get("sheet_id") else "", "command": COMMAND_URL},
            "stages": DEAL_STAGES,
            "voice": self.voice_info(),
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

    def dnc(self, person_id: str, reason: str) -> dict:
        if not reason.strip():
            raise CRMError("Do Not Contact needs a reason, it is one way")
        return self.crm.run(["dnc", person_id, "--reason", reason.strip()])

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
            if kind == "text":
                detail = send_imessage(to.strip(), body)
            else:
                detail = send_gmail(to.strip(), subject.strip(), body)
            status = "sent"
        entry = {"at": now().isoformat(timespec="seconds"), "kind": kind, "person_id": person_id, "display": display,
                 "to": to.strip(), "subject": subject.strip(), "chars": len(body), "status": status, "detail": detail}
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


def send_imessage(phone: str, body: str) -> str:
    """Messages.app on the Mac. The body goes in as an argument, never inside the script, so quotes are safe."""
    if platform.system() != "Darwin":
        raise CRMError("texts send through Messages on the Mac only")
    script = '''on run argv
  set who to item 1 of argv
  set msg to item 2 of argv
  tell application "Messages"
    set svc to 1st account whose service type = iMessage
    set who to participant who of svc
    send msg to who
  end tell
end run'''
    p = subprocess.run(["osascript", "-e", script, phone, body], capture_output=True, text=True, timeout=60)
    if p.returncode != 0:
        raise CRMError("Messages refused: " + (p.stderr.strip() or "unknown")[-200:])
    return "Messages accepted it"


def send_gmail(to: str, subject: str, body: str) -> str:
    sys.path.insert(0, str(AIRE / "follow-up"))
    try:
        import followups  # the follow-up library owns the Gmail token and the one send function
    except Exception as e:
        raise CRMError(f"follow-up library not importable: {e}")
    svc = followups.gmail_service_or_none()
    if svc is None:
        raise CRMError("no Gmail token at aire/follow-up/token.json; run the follow-up auth once")
    followups.send_email(svc, to, subject, body)
    return "Gmail accepted it"


# ---------------------------------------------------------------------- server


class Handler(BaseHTTPRequestHandler):
    state: State = None  # set by serve()

    def log_message(self, fmt, *args):  # quiet unless asked
        if os.getenv("PIPELINE_VERBOSE"):
            super().log_message(fmt, *args)

    def _json(self, code: int, data) -> None:
        raw = json.dumps(data, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _file(self, rel: str) -> None:
        path = (STATIC / rel.lstrip("/")).resolve()
        if not str(path).startswith(str(STATIC.resolve())) or not path.is_file():
            self.send_error(404)
            return
        ctype = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                 ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon"}.get(path.suffix, "application/octet-stream")
        raw = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/api/state":
            return self._json(200, self.state.snapshot())
        if u.path == "/api/refresh":
            return self._json(200, self.state.refresh)
        if u.path in ("/", "/index.html"):
            return self._file("index.html")
        return self._file(u.path)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        n = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._json(400, {"ok": False, "error": "body must be JSON"})
        s = self.state
        try:
            if u.path == "/api/touch":
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
            elif u.path == "/api/dnc":
                out = s.dnc(body.get("person_id", ""), body.get("reason", ""))
            elif u.path == "/api/send":
                out = s.send(body.get("kind", ""), body.get("person_id", ""), body.get("to", ""), body.get("body", ""),
                             body.get("subject", ""), body.get("display", ""))
            elif u.path == "/api/refresh":
                out = {"ok": True, "result": s.start_refresh()}
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


def serve(state: State, port: int, open_browser: bool) -> None:
    Handler.state = state
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
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
    check(r["ok"] and r["result"]["answer"].startswith("Call Taylor") and calls["model"] == ASK_MODEL_DEFAULT and calls["max_tokens"] <= 500
          and calls.get("fallbacks") == "default" and "Caleb asked, by voice: who first" in calls["messages"][0]["content"],
          "ask calls the SDK with the default model, a short answer cap, the fallback and the question")
    check(s3.voice_usage()["input_tokens"] == 1200 and s3.voice_info()["ask_cost_estimate_usd"] > 0, "ask logs the tokens and estimates the spend")
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
    envf = tmp / "pipeline.env"; envf.write_text("# keys\nPIPELINE_TEST_KEY=abc\nELEVENLABS_VOICE_ID='v1'\n")
    os.environ.pop("PIPELINE_TEST_KEY", None); n = load_env_file(envf)
    check(n >= 1 and os.environ.get("PIPELINE_TEST_KEY") == "abc", "pipeline.env lines land in the environment")

    # header_ok false: the screen gets a stop-level problem and no feed
    s2 = State(demo=True, send_log=tmp / "x.json")
    s2._demo_cache = {**read_json(DEMO_PATHS["feed"], {}), "header_ok": False, "missing_columns": ["Last_Touch"]}
    check(any(p["level"] == "stop" for p in s2.snapshot()["problems"]), "header_ok false is a stop")

    # the HTTP layer end to end on a free port
    import socket
    sock = socket.socket(); sock.bind(("127.0.0.1", 0)); port = sock.getsockname()[1]; sock.close()
    Handler.state = State(demo=True, send_log=tmp / "http.json")
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    th = threading.Thread(target=httpd.serve_forever, daemon=True); th.start()
    base = f"http://127.0.0.1:{port}"
    html = urllib.request.urlopen(base + "/").read().decode()
    check("<title>Pipeline" in html, "GET / serves the screen")
    st = json.loads(urllib.request.urlopen(base + "/api/state").read())
    check(st["feed"]["counts"]["contacts"] > 0, "GET /api/state")
    req = urllib.request.Request(base + "/api/touch", data=json.dumps({"person_id": "118", "what": "test"}).encode(),
                                 headers={"Content-Type": "application/json"})
    check(json.loads(urllib.request.urlopen(req).read())["ok"], "POST /api/touch")
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
    a = ap.parse_args(argv)
    if a.test:
        return run_tests()
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
