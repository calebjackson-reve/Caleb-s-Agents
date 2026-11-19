#!/usr/bin/env python3
"""Check that this computer can run the video tools. Makes its own test clips. Takes about a minute.

  python3 aire/video/selftest.py
"""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ok = True


def check(label, good, detail=""):
    global ok
    ok = ok and good
    print(("PASS  " if good else "FAIL  ") + label + (f"  ({detail})" if detail and not good else ""))


for tool in ("ffmpeg", "ffprobe"):
    check(f"{tool} installed", shutil.which(tool) is not None, "install ffmpeg")
try:
    import numpy  # noqa: F401
    check("numpy installed", True)
except ImportError:
    check("numpy installed", False, "pip install numpy")
check("yt-dlp installed (needed for links only)", shutil.which("yt-dlp") is not None, "pip install yt-dlp")
if not (shutil.which("ffmpeg") and "numpy" in sys.modules):
    sys.exit("Fix the FAIL lines above, then run this again.")

job = Path(tempfile.mkdtemp(prefix="video-selftest-"))
(job / "raw").mkdir()
sources = ["testsrc2=size=1920x1080:rate=30", "smptebars=size=1920x1080:rate=30",
           "mandelbrot=size=1920x1080:rate=30", "rgbtestsrc=size=1920x1080:rate=30"]
for i, s in enumerate(sources):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", s, "-t", "4", "-pix_fmt", "yuv420p",
                    str(job / "raw" / f"clip{i}.mov")], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=220:duration=20", str(job / "music.m4a")], check=True)
clips = [{"src": f"raw/clip{i % 4}.mov", "in": 1.0, "out": 2.0} for i in range(8)]
(job / "edl.json").write_text(json.dumps({"name": "selftest", "fps": 30, "shapes": ["9x16", "4x3"], "music": "music.m4a", "clips": clips}))

r = subprocess.run([sys.executable, str(HERE / "proxies.py"), str(job / "raw")], capture_output=True, text=True)
check("proxies.py makes small copies", r.returncode == 0 and len(list((job / "proxies").glob("*.mov"))) == 4, r.stderr[-200:])
r = subprocess.run([sys.executable, str(HERE / "cut.py"), str(job / "edl.json")], capture_output=True, text=True)
outs = sorted((job / "out").glob("selftest-*-preview.mp4"))
check("cut.py builds both shapes", r.returncode == 0 and len(outs) == 2, r.stderr[-200:])
check("cut.py writes timing.json", (job / "out" / "timing.json").exists())
if outs:
    r = subprocess.run([sys.executable, str(HERE / "watch.py"), str(outs[0]), "--name", "selftest"], capture_output=True, text=True)
    td = HERE / "out" / "selftest" / "teardown.json"
    t = json.loads(td.read_text()) if td.exists() else {}
    check("watch.py measures the cut", r.returncode == 0 and bool(t), r.stderr[-200:])
    check("watch.py finds all 7 cuts", t.get("cuts") == 7, f"found {t.get('cuts')}")
    check("duration is 8.0 s", abs(t.get("duration", 0) - 8.0) < 0.1, str(t.get("duration")))
    check("loudness is -14 LUFS, give or take 1", t.get("loudness_lufs") is not None and abs(t["loudness_lufs"] + 14) <= 1, str(t.get("loudness_lufs")))
    shutil.rmtree(HERE / "out" / "selftest", ignore_errors=True)
shutil.rmtree(job, ignore_errors=True)
print("\nALL PASS. This computer can run the editing process." if ok else "\nSomething failed. Fix the FAIL lines and run again.")
sys.exit(0 if ok else 1)
