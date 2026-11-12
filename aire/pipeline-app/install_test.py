#!/usr/bin/env python3
"""The LaunchAgent template install.sh copies: it must keep the tailnet host and must install dry.

    python3 aire/pipeline-app/install_test.py
"""
import plistlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
fails = []


def check(ok: bool, what: str) -> None:
    print(("ok   " if ok else "FAIL ") + what)
    if not ok:
        fails.append(what)


doc = plistlib.loads((HERE / "launchd" / "org.calebjackson.aire.pipeline.plist").read_bytes())
env = doc.get("EnvironmentVariables") or {}
check(env.get("PIPELINE_HOSTS") == "calebs-mac-mini.tail512a6c.ts.net", "template keeps PIPELINE_HOSTS, so a reinstall does not lock the phone out")
check(env.get("PIPELINE_SENDER") == "dry", "template installs with the sender dry")
check(env.get("PIPELINE_PORT") == "4747", "template serves on 4747")
check(not any("KEY" in k or "TOKEN" in k or "SECRET" in k for k in env), "no keys in the template")
install = (HERE / "install.sh").read_text(encoding="utf-8")
check('"$HERE/launchd/$LABEL.plist" > "$PLIST"' in install, "install.sh still builds the LaunchAgent from this template")

print(f"\n{5 - len(fails)} of 5 passed")
sys.exit(1 if fails else 0)
