#!/usr/bin/env python3
"""Fish Audio S2.1 Pro voices for the AIRE Business Map.

What it does
  design      Voice Design candidates for one department from voices.json
  clone       Create a private voice model from a clip (Caleb's own voice)
  say         Render one line with a voice model (reference_id)
  render-bank Render every department intro and the center greeting, then
              measure each file with earshot and write a report

Nothing leaves this machine unless you pass --yes. Without it every command
prints the exact request it would make and stops. The API key is read from
the FISH_API_KEY environment variable and is never written to a file.

Endpoints (docs.fish.audio, read 2026-11-04):
  POST https://api.fish.audio/v1/voice-design   header model: voice-design-1
  POST https://api.fish.audio/model              multipart, type=tts, train_mode=fast
  POST https://api.fish.audio/v1/tts             header model: s2.1-pro

Voice ids live in bank.local.json next to this file (git-ignored by the
*.local.json rule below, add it if your clone lacks it). Rendered audio goes
to out/ (git-ignored).
"""
import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
VOICES = os.path.join(HERE, "voices.json")
BANK = os.path.join(HERE, "bank.local.json")
OUT = os.path.join(HERE, "out")
DATA = os.path.join(HERE, "..", "data.json")
API = "https://api.fish.audio"


def load(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def key():
    k = os.environ.get("FISH_API_KEY")
    if not k:
        sys.exit("FISH_API_KEY is not set. Export it in this shell, never in a file.")
    return k


def show(method, url, headers, body_desc):
    print(f"{method} {url}")
    for h, v in headers.items():
        print(f"  {h}: {'Bearer ****' if h == 'Authorization' else v}")
    print(f"  body: {body_desc}")


def post_json(url, headers, body, yes):
    headers = dict(headers, **{"Content-Type": "application/json"})
    show("POST", url, headers, json.dumps(body)[:400])
    if not yes:
        print("dry run: add --yes to send this request")
        return None
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read(), r.headers.get("Content-Type", "")


def post_multipart(url, headers, fields, files, yes):
    boundary = "----aire" + base64.b16encode(os.urandom(8)).decode()
    parts = []
    for k, v in fields:
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    for k, path in files:
        data = open(path, "rb").read()
        name = os.path.basename(path)
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{name}\"\r\nContent-Type: application/octet-stream\r\n\r\n".encode() + data + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    body = b"".join(parts)
    headers = dict(headers, **{"Content-Type": f"multipart/form-data; boundary={boundary}"})
    show("POST", url, headers, f"{[k for k, _ in fields]} + files {[os.path.basename(p) for _, p in files]} ({len(body):,} bytes)")
    if not yes:
        print("dry run: add --yes to send this request")
        return None
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read(), r.headers.get("Content-Type", "")


def auth(k):
    return {"Authorization": f"Bearer {k}"}


def cmd_design(a):
    v = load(VOICES)
    d = v["departments"].get(a.dept)
    if not d:
        sys.exit(f"no department {a.dept} in voices.json")
    body = {"instruction": d["instruction"], "reference_text": d["reference_text"][:150],
            "language": "en", "n": a.n, "speed": 1, "num_step": 32, "guidance_scale": 2,
            "instruct_guidance_scale": 0}
    if a.seed is not None:
        body["seed"] = a.seed
    res = post_json(f"{API}/v1/voice-design", dict(auth(key()), model="voice-design-1"), body, a.yes)
    if not res:
        return
    data = json.loads(res[0])
    os.makedirs(OUT, exist_ok=True)
    for c in data.get("candidates", []):
        path = os.path.join(OUT, f"design-{a.dept}-{c['index']}.wav")
        with open(path, "wb") as f:
            f.write(base64.b64decode(c["audio_base64"]))
        print(f"candidate {c['index']}: id {c['id']}  {c.get('duration_ms', 0) / 1000:.2f} s  -> {os.path.relpath(path)}")
    print("Listen, pick one, then: fishaudio.py clone --dept", a.dept,
          "--clip out/design-<dept>-<i>.wav --signature <id> --yes")


def cmd_clone(a):
    title = a.title or (f"AIRE {a.dept}" if a.dept else None)
    if not title:
        sys.exit("--title or --dept is required")
    if not os.path.exists(a.clip):
        sys.exit(f"clip not found: {a.clip}")
    fields = [("type", "tts"), ("title", title), ("train_mode", "fast"), ("visibility", "private")]
    if a.text:
        fields.append(("texts", a.text))
    if a.signature:
        fields.append(("voice_design_signatures", a.signature))
    res = post_multipart(f"{API}/model", auth(key()), fields, [("voices", a.clip)], a.yes)
    if not res:
        return
    model = json.loads(res[0])
    mid = model.get("_id")
    print(f"created voice model {mid} state={model.get('state')} title={model.get('title')}")
    bank = load(BANK, {})
    slot = a.dept or "center"
    bank[slot] = {"reference_id": mid, "title": title}
    with open(BANK, "w", encoding="utf-8") as f:
        json.dump(bank, f, indent=1)
    print(f"saved to {os.path.relpath(BANK)} under {slot}")


def tts(reference_id, text, out_path, yes, model):
    body = {"text": text, "reference_id": reference_id, "format": "mp3", "mp3_bitrate": 128,
            "latency": "normal", "prosody": {"speed": 1, "volume": 0, "normalize_loudness": True}}
    res = post_json(f"{API}/v1/tts", dict(auth(key()), model=model), body, yes)
    if not res:
        return None
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(res[0])
    print(f"wrote {os.path.relpath(out_path)} ({len(res[0]):,} bytes)")
    return out_path


def cmd_say(a):
    tts(a.voice, a.text, a.out, a.yes, a.model)


def measure(path):
    exe = shutil.which("earshot")
    if not exe:
        return "earshot not on PATH (activate ~/tools/earshot/.venv)"
    r = subprocess.run([exe, "measure", path], capture_output=True, text=True)
    return (r.stdout or r.stderr).strip().splitlines()[0] if (r.stdout or r.stderr) else "no output"


def cmd_render_bank(a):
    v = load(VOICES)
    bank = load(BANK, {})
    data = load(DATA)
    if not data:
        sys.exit("data.json missing: run aire/business-map/build_map_data.py first")
    model = v.get("model", "s2.1-pro")
    lines = []
    if "center" in bank:
        lines.append(("center", bank["center"]["reference_id"], v["center"]["greeting"]))
    for d in data["departments"]:
        if d["id"] in bank:
            lines.append((d["id"], bank[d["id"]]["reference_id"], f"{d['label']}. {d['count']} jobs. {d['tagline']}"))
    missing = [d["id"] for d in data["departments"] if d["id"] not in bank]
    if missing:
        print("no voice yet for:", ", ".join(missing), "(run design, then clone)")
    if not lines:
        sys.exit("bank.local.json has no voices")
    report = ["# Voice bank render", "", f"model {model}", ""]
    for slot, ref, text in lines:
        out = os.path.join(OUT, f"bank-{slot}.mp3")
        got = tts(ref, text, out, a.yes, model)
        if got:
            m = measure(got)
            report.append(f"- {slot}: {m}")
            print("  earshot:", m)
    if a.yes:
        with open(os.path.join(OUT, "bank-report.md"), "w", encoding="utf-8") as f:
            f.write("\n".join(report) + "\n")
        print("report:", os.path.relpath(os.path.join(OUT, "bank-report.md")))
        print("Next, with Caleb's go: upload out/bank-*.mp3 to the artifact as assets and write voice/bank",
              "(see README.md, Voice bank).")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--yes", action="store_true", help="actually send requests to Fish Audio")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("design"); s.add_argument("--dept", required=True); s.add_argument("--n", type=int, default=2); s.add_argument("--seed", type=int); s.set_defaults(fn=cmd_design)
    s = sub.add_parser("clone"); s.add_argument("--clip", required=True); s.add_argument("--dept"); s.add_argument("--title"); s.add_argument("--text"); s.add_argument("--signature"); s.set_defaults(fn=cmd_clone)
    s = sub.add_parser("say"); s.add_argument("--voice", required=True); s.add_argument("--text", required=True); s.add_argument("-o", "--out", default=os.path.join(OUT, "say.mp3")); s.add_argument("--model", default="s2.1-pro"); s.set_defaults(fn=cmd_say)
    s = sub.add_parser("render-bank"); s.set_defaults(fn=cmd_render_bank)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
