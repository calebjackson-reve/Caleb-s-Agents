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

check("PIPELINE_CALLER" not in env, "template has no PIPELINE_CALLER")

# --- bootout wait and bootstrap retry, with a fake launchctl (never the real one) ---
import os
import subprocess
import tempfile

FAKE_LAUNCHCTL = """#!/bin/sh
D="$FAKE_DIR"
echo "$*" >> "$D/calls"
case "$1" in
  bootout) echo 0 > "$D/loaded_left_init"; exit 0 ;;
  print)
    n=$(cat "$D/print_left" 2>/dev/null || echo 0)
    if [ "$n" -gt 0 ]; then echo $((n-1)) > "$D/print_left"; exit 0; fi
    exit 113 ;;
  bootstrap)
    n=$(cat "$D/boot_fail_left" 2>/dev/null || echo 0)
    if [ "$n" -gt 0 ]; then echo $((n-1)) > "$D/boot_fail_left"; echo "Bootstrap failed: 5: Input/output error" >&2; exit 5; fi
    exit 0 ;;
esac
exit 0
"""


def run_install(print_loaded: int, boot_fails: int):
    """Run install.sh in a temp HOME with fake launchctl/sleep/curl; return (rc, stderr, calls)."""
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        home, fake, bin_ = tmp / "home", tmp / "fake", tmp / "bin"
        for d in (home / ".aire" / "venv" / "bin", fake, bin_):
            d.mkdir(parents=True)
        (home / ".aire" / "venv" / "bin" / "python").write_text("#!/bin/sh\n")
        (home / ".aire" / "venv" / "bin" / "python").chmod(0o755)
        for name, body in (("launchctl", FAKE_LAUNCHCTL), ("sleep", "#!/bin/sh\nexit 0\n"), ("curl", "#!/bin/sh\nexit 0\n")):
            (bin_ / name).write_text(body)
            (bin_ / name).chmod(0o755)
        (fake / "print_left").write_text(str(print_loaded))
        (fake / "boot_fail_left").write_text(str(boot_fails))
        e = dict(os.environ, HOME=str(home), FAKE_DIR=str(fake), PATH=f"{bin_}:{os.environ['PATH']}")
        p = subprocess.run(["sh", str(HERE / "install.sh")], env=e, capture_output=True, text=True, timeout=60)
        calls = (fake / "calls").read_text().splitlines() if (fake / "calls").exists() else []
        return p.returncode, p.stderr, calls


rc, err, calls = run_install(print_loaded=3, boot_fails=0)
verbs = [c.split()[0] for c in calls]
last_print = max(i for i, v in enumerate(verbs) if v == "print")
check(rc == 0 and verbs.count("print") == 4 and verbs.index("bootstrap") > last_print,
      "bootstrap waits until launchctl print shows the job is gone")

rc, err, calls = run_install(print_loaded=0, boot_fails=1)
check(rc == 0 and [c.split()[0] for c in calls].count("bootstrap") == 2, "one bootstrap failure is retried and the install succeeds")

rc, err, calls = run_install(print_loaded=0, boot_fails=99)
check(rc != 0 and [c.split()[0] for c in calls].count("bootstrap") == 3
      and "Input/output error" in err and "install failed" in err,
      "bootstrap that keeps failing stops after 3 tries, non-zero, with the launchctl error and a clear message")

rc, err, calls = run_install(print_loaded=999, boot_fails=0)
check(rc != 0 and "bootstrap" not in [c.split()[0] for c in calls] and "still loaded" in err,
      "job that never unloads fails clearly without bootstrapping")

TOTAL = 10
print(f"\n{TOTAL - len(fails)} of {TOTAL} passed")
sys.exit(1 if fails else 0)
