#!/usr/bin/env python3
"""Pipeline on the phone: ElevenLabs Speech Engine does the listening and the talking, Claude is the brain.

ElevenLabs opens a WebSocket to this server for every conversation, sends the transcript (full history) each time
Caleb finishes speaking, and turns whatever we stream back into speech. This file implements that transcript server
with the ElevenLabs Python SDK (elevenlabs.speech_engine) and answers with Claude, streamed, over the same compact
view of today's feed that the typed Q&A uses (app.py: ask_context and ASK_SYSTEM). Nothing is sent by voice.

  python3 speech_engine.py create --ws-url wss://<your-tunnel>/ws [--save]   create the Speech Engine resource once
  python3 speech_engine.py serve [--port 3001] [--path /ws] [--debug]          run the transcript server
  python3 speech_engine.py --test                                              offline checks, no network

Needs, in the environment or ~/.aire/pipeline.env:
  ELEVENLABS_API_KEY            the server verifies ElevenLabs' JWT on every connection with it
  ELEVENLABS_SPEECH_ENGINE_ID   from `create` (seng_...), also what app.py uses to mint browser tokens
  ANTHROPIC_API_KEY             the brain. PIPELINE_ASK_MODEL overrides the model (default claude-opus-5-5)
  ELEVENLABS_VOICE_ID           voice for the resource at create time (default Daniel, British)

The server must be reachable from the internet as wss://, so on the Mac run a tunnel first (ngrok http 3001) and give
that host to `create`. Packages in Pipeline's Python: pip install elevenlabs anthropic (the CRM venv already has anthropic).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, AsyncIterator

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import app  # noqa: E402  (ask_context, ASK_SYSTEM, State, load_env_file, now)

CALL_RULES = """
You are on a live voice call with Caleb through his Pipeline app. Keep each answer to one to three short sentences,
spoken English, no lists, no markdown, no symbols. If he asks for the brief, give replies owed first, then overdue
tasks, then new leads, then deals, in a few sentences. If he asks you to send, text, email, schedule or change a
record, say that the screen does that when he presses the button, and tell him which one. Names and numbers come
only from the data below. If the data does not have it, say so in one sentence."""
VOICE_DEFAULT = app.ELEVEN_VOICE_DEFAULT
ENV_FILE = app.ENV_FILE


def anthropic_messages(transcript: list[Any]) -> list[dict]:
    """ElevenLabs gives the whole history with roles user and agent. Anthropic wants user and assistant, alternating,
    starting with user. Consecutive same-role turns (an interruption, a retranscription) are merged."""
    out: list[dict] = []
    for m in transcript:
        role = "assistant" if getattr(m, "role", m.get("role") if isinstance(m, dict) else "") == "agent" else "user"
        content = (getattr(m, "content", None) if not isinstance(m, dict) else m.get("content")) or ""
        content = str(content).strip()
        if not content:
            continue
        if out and out[-1]["role"] == role:
            out[-1]["content"] += " " + content
        else:
            out.append({"role": role, "content": content})
    while out and out[0]["role"] != "user":
        out.pop(0)
    if not out:
        out = [{"role": "user", "content": "Hello."}]
    return out


class Brain:
    """Claude, streamed, with today's feed in the system prompt. One instance per server; the feed context is rebuilt
    on every turn from feed.json so a refresh in the background shows up on the next question."""

    def __init__(self, state: app.State, client: Any = None):
        self.state = state
        self.model = state.ask_model
        self._client = client

    def client(self):
        if self._client is None:
            import anthropic
            self._client = anthropic.AsyncAnthropic(api_key=self.state.ask_key or None)
        return self._client

    def system(self) -> list[dict]:
        ctx = json.dumps(self.state.ask_context(), ensure_ascii=False)
        # Instructions first and stable, the feed view second with the cache breakpoint on it: the same conversation
        # asks several questions against the same feed, so the second question on reads the context from cache.
        return [{"type": "text", "text": app.ASK_SYSTEM + "\n" + CALL_RULES},
                {"type": "text", "text": "Today's pipeline data as JSON:\n" + ctx, "cache_control": {"type": "ephemeral"}}]

    async def stream(self, transcript: list[Any]) -> AsyncIterator[str]:
        messages = anthropic_messages(transcript)
        kwargs = dict(model=self.model, max_tokens=300, system=self.system(), messages=messages, output_config={"effort": "low"})
        client = self.client()
        try:
            cm = client.beta.messages.stream(betas=["server-side-fallback-2026-07-01"], fallbacks="default", **kwargs)
        except TypeError:
            cm = client.messages.stream(**kwargs)
        async with cm as s:
            async for text in s.text_stream:
                yield text
            final = await s.get_final_message()
        if getattr(final, "stop_reason", "") == "refusal":
            yield " I can't help with that one."
        usage = getattr(final, "usage", None)
        self.state.log_claude("call", getattr(final, "model", self.model),
                              {k: getattr(usage, k, 0) for k in ("input_tokens", "cache_creation_input_tokens",
                                                                 "cache_read_input_tokens", "output_tokens")})


def make_handlers(brain: Brain, log=print) -> dict:
    """The five Speech Engine callbacks. on_transcript streams Claude into session.send_response; the SDK cancels the
    previous handler when Caleb interrupts, so an in-flight answer stops on its own."""
    async def on_init(conversation_id, session):
        log(f"call started {conversation_id}")

    async def on_transcript(transcript, session):
        last = next((m for m in reversed(transcript) if (getattr(m, "role", None) or (m.get("role") if isinstance(m, dict) else "")) == "user"), None)
        heard = (getattr(last, "content", None) or (last.get("content") if isinstance(last, dict) else "") or "") if last else ""
        log(f"heard: {heard[:80]}")
        if not brain.state.ask_key and not brain._client:
            await session.send_response("Pipeline needs the Claude key before it can take calls. Add ANTHROPIC_API_KEY to the env file and restart.")
            return
        try:
            await session.send_response(brain.stream(transcript))
        except Exception as e:  # the SDK cancels this task on interruption; anything else is reported, never crashes the call
            if isinstance(e, asyncio.CancelledError):
                raise
            log(f"brain error: {type(e).__name__}: {str(e)[:160]}")
            await session.send_response("Sorry, I lost that one. Ask me again.")

    def on_close(session):
        log(f"call ended {session.conversation_id}")

    def on_disconnect(session):
        log(f"call dropped {session.conversation_id}")

    def on_error(err, session):
        log(f"speech engine error: {err}")

    return {"on_init": on_init, "on_transcript": on_transcript, "on_close": on_close, "on_disconnect": on_disconnect, "on_error": on_error}


async def create(ws_url: str, name: str, save: bool) -> str:
    from elevenlabs import AsyncElevenLabs
    key = os.getenv("ELEVENLABS_API_KEY", "")
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY is not set (environment or ~/.aire/pipeline.env)")
    if not ws_url.startswith("wss://"):
        raise SystemExit("the Speech Engine needs a public wss:// URL, for example wss://abc123.ngrok.io/ws")
    client = AsyncElevenLabs(api_key=key)
    engine = await client.speech_engine.create(
        name=name,
        speech_engine={"ws_url": ws_url},
        tts={"voice_id": os.getenv("ELEVENLABS_VOICE_ID", VOICE_DEFAULT)},
        language="en",
        overrides={"first_message": True},
        conversation={"max_duration_seconds": 1200},
    )
    print(f"Speech Engine created: {engine.engine_id}")
    if save:
        ENV_FILE.parent.mkdir(parents=True, exist_ok=True)
        with ENV_FILE.open("a", encoding="utf-8") as f:
            f.write(f"\nELEVENLABS_SPEECH_ENGINE_ID={engine.engine_id}\n")
        print(f"saved to {ENV_FILE}")
    else:
        print(f"add to {ENV_FILE}:  ELEVENLABS_SPEECH_ENGINE_ID={engine.engine_id}")
    return engine.engine_id


async def serve(port: int, path: str, debug: bool) -> None:
    from elevenlabs import AsyncElevenLabs
    key, engine_id = os.getenv("ELEVENLABS_API_KEY", ""), os.getenv("ELEVENLABS_SPEECH_ENGINE_ID", "")
    if not key or not engine_id:
        raise SystemExit("needs ELEVENLABS_API_KEY and ELEVENLABS_SPEECH_ENGINE_ID (run `create` first)")
    state = app.State()
    if not state.ask_key:
        print("warning: ANTHROPIC_API_KEY is not set, calls will be answered with a message saying so")
    brain = Brain(state)
    engine = await AsyncElevenLabs(api_key=key).speech_engine.get(engine_id)
    print(f"Pipeline Speech Engine server on ws://127.0.0.1:{port}{path}  engine={engine_id}  brain={brain.model}  (expose it as wss:// through your tunnel)")
    await engine.serve(port=port, path=path, debug=debug, **make_handlers(brain))


# ----------------------------------------------------------------------- tests


def run_tests() -> int:
    import tempfile
    import types

    failures = 0

    def check(cond, label):
        nonlocal failures
        print(("ok   " if cond else "FAIL ") + label)
        failures += 0 if cond else 1

    M = lambda role, content: types.SimpleNamespace(role=role, content=content)  # noqa: E731
    msgs = anthropic_messages([M("agent", "Hi Caleb."), M("user", "who texted me"), M("user", "today"), M("agent", "Taylor did."), M("user", "")])
    check(msgs[0] == {"role": "user", "content": "who texted me today"} and msgs[1]["role"] == "assistant" and len(msgs) == 2,
          "history maps agent to assistant, drops the leading agent turn, merges repeated user turns, skips empties")
    check(anthropic_messages([]) == [{"role": "user", "content": "Hello."}], "empty history still gives one user turn")
    check(anthropic_messages([{"role": "user", "content": "hi"}])[0]["content"] == "hi", "dict turns work too")

    tmp = Path(tempfile.mkdtemp())
    state = app.State(demo=True, send_log=tmp / "s.json")
    state.ask_key = "sk-test"

    class FakeStream:
        def __init__(self, chunks): self.chunks = chunks
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        @property
        def text_stream(self):
            async def gen():
                for c in self.chunks:
                    yield c
            return gen()
        async def get_final_message(self):
            return types.SimpleNamespace(stop_reason="end_turn", usage=types.SimpleNamespace(input_tokens=2100, output_tokens=24))
    seen = {}

    class FakeMessages:
        def stream(self, **kw): seen.update(kw); return FakeStream(["Taylor texted ", "last. ", "Call her first."])
    fake_client = types.SimpleNamespace(beta=types.SimpleNamespace(messages=FakeMessages()), messages=FakeMessages())
    brain = Brain(state, client=fake_client)

    async def collect():
        return [t async for t in brain.stream([M("user", "who texted me")])]
    out = asyncio.run(collect())
    check("".join(out) == "Taylor texted last. Call her first.", "the brain streams Claude's text chunks through")
    check(seen["model"] == app.ASK_MODEL_DEFAULT and seen["max_tokens"] <= 300 and seen.get("fallbacks") == "default"
          and seen["system"][1]["cache_control"] == {"type": "ephemeral"} and "Taylor Sample" in seen["system"][1]["text"]
          and "+1225" not in seen["system"][1]["text"], "the request carries the model, a short cap, the fallback, the cached feed view, no phone numbers")
    check(state.voice_usage()["asked"] == 1 and state.voice_usage()["input_tokens"] == 2100, "a call turn is counted like a typed question")

    sent = []

    class FakeSession:
        conversation_id = "conv_1"
        async def send_response(self, r):
            if isinstance(r, str):
                sent.append(r)
            else:
                sent.append("".join([t async for t in r]))
    h = make_handlers(brain, log=lambda *_: None)
    asyncio.run(h["on_transcript"]([M("user", "who texted me")], FakeSession()))
    check(sent == ["Taylor texted last. Call her first."], "on_transcript hands the stream to session.send_response")
    nokey = Brain(app.State(demo=True, send_log=tmp / "n.json"))
    asyncio.run(make_handlers(nokey, log=lambda *_: None)["on_transcript"]([M("user", "hi")], FakeSession()))
    check(sent[-1].startswith("Pipeline needs the Claude key"), "without the Claude key the call says so instead of failing")

    class BrokenMessages:
        def stream(self, **kw): raise RuntimeError("boom")
    broken = Brain(state, client=types.SimpleNamespace(beta=types.SimpleNamespace(messages=BrokenMessages()), messages=BrokenMessages()))
    asyncio.run(make_handlers(broken, log=lambda *_: None)["on_transcript"]([M("user", "hi")], FakeSession()))
    check(sent[-1].startswith("Sorry, I lost that one"), "a brain error becomes a spoken apology, not a dropped call")
    print(f"\n{failures} failure(s)")
    return 1 if failures else 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--test", action="store_true")
    sub = ap.add_subparsers(dest="cmd")
    c = sub.add_parser("create", help="create the Speech Engine resource that points at this server")
    c.add_argument("--ws-url", required=True, help="public wss:// URL of this server, for example wss://abc123.ngrok.io/ws")
    c.add_argument("--name", default="Pipeline")
    c.add_argument("--save", action="store_true", help="append ELEVENLABS_SPEECH_ENGINE_ID to ~/.aire/pipeline.env")
    s = sub.add_parser("serve", help="run the transcript server")
    s.add_argument("--port", type=int, default=int(os.getenv("PIPELINE_SPEECH_PORT", "3001")))
    s.add_argument("--path", default="/ws")
    s.add_argument("--debug", action="store_true")
    a = ap.parse_args(argv)
    if a.test:
        return run_tests()
    app.load_env_file()
    if a.cmd == "create":
        asyncio.run(create(a.ws_url, a.name, a.save))
    elif a.cmd == "serve":
        try:
            asyncio.run(serve(a.port, a.path, a.debug))
        except KeyboardInterrupt:
            pass
    else:
        ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
