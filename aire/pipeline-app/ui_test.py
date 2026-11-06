"""Checks the screens, not just the numbers: starts Pipeline in demo mode (made-up people), saves /api/state and
/api/cc, and renders every page in Node (static/ui_test.js) with privacy on and off.
Run: python3 aire/pipeline-app/ui_test.py   (needs node on the PATH and a free local port)"""
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main() -> int:
    node = shutil.which("node")
    if not node:
        print("SKIP ui_test: node is not installed")
        return 0
    sock = socket.socket(); sock.bind(("127.0.0.1", 0)); port = sock.getsockname()[1]; sock.close()
    env = {**os.environ, "PIPELINE_SENDER": "dry"}
    srv = subprocess.Popen([sys.executable, str(HERE / "app.py"), "--demo", "--port", str(port), "--no-open"], env=env,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        base = f"http://127.0.0.1:{port}"
        for _ in range(100):
            try:
                urllib.request.urlopen(base + "/api/state", timeout=1)
                break
            except OSError:
                time.sleep(0.1)
        with tempfile.TemporaryDirectory() as t:
            files = []
            for name in ("state", "cc"):
                p = Path(t) / f"{name}.json"
                p.write_text(urllib.request.urlopen(f"{base}/api/{name}").read().decode())
                files.append(str(p))
            return subprocess.run([node, str(HERE / "static" / "ui_test.js"), *files]).returncode
    finally:
        srv.terminate()
        srv.wait(timeout=10)


if __name__ == "__main__":
    sys.exit(main())
