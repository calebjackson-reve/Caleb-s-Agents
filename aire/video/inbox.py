#!/usr/bin/env python3
"""Watch a folder. Every video dropped in gets a small copy and a clip log, with no one asking.

  python3 aire/video/inbox.py "<folder>"            # do everything waiting, then stop
  python3 aire/video/inbox.py "<folder>" --watch    # keep running, look every 30 seconds

Point it at a folder that syncs to Google Drive. For each job folder inside (or the folder itself):
  proxies/<same name>      a small copy of every clip, under the 10 MB connector limit
  proxies/clip-log.csv     one row a clip: length, size, shape, frame rate, shaky or dark flags
  proxies/all-clips.jpg    one picture of every clip's middle frame, named
An agent on any other computer cuts from the proxies folder. The cut list still works on the originals.
A clip is only touched after its size has stopped changing, so half-uploaded files are left alone.
"""
import csv, json, subprocess, sys, time
from pathlib import Path

VIDEO = {".mov", ".mp4", ".m4v", ".mts"}
SKIP = {"proxies", "out", "segments"}


def probe(p):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(p)],
                                  capture_output=True, text=True).stdout or "{}")
    v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"), None)
    if not v:
        return None
    rot = abs(int(next((d.get("rotation", 0) for d in v.get("side_data_list", []) if "rotation" in d), 0)))
    w, h = (v["height"], v["width"]) if rot in (90, 270) else (v["width"], v["height"])
    n, d = v["r_frame_rate"].split("/")
    return {"seconds": round(float(j["format"]["duration"]), 2), "width": w, "height": h,
            "shape": "vertical" if h > w else "wide", "fps": round(int(n) / int(d), 2)}


def brightness_and_shake(proxy):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(proxy), "-vf", "fps=10,scale=48:48,format=gray",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    if len(raw) < 48 * 48 * 2:
        return 0, 0
    import numpy as np
    g = np.frombuffer(raw[:len(raw) // 2304 * 2304], dtype=np.uint8).reshape(-1, 48, 48).astype(np.float32)
    d = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))
    # steady moves change evenly frame to frame, shake makes the change jump around
    return round(float(g.mean())), round(float(np.abs(np.diff(d)).mean()), 2)


def do_job(job):
    clips = sorted(p for p in job.iterdir() if p.is_file() and p.suffix.lower() in VIDEO and not p.name.startswith("."))
    if not clips:
        return 0
    out = job / "proxies"
    out.mkdir(exist_ok=True)
    made = 0
    for p in clips:
        dest = out / p.name
        if dest.exists() and dest.stat().st_mtime >= p.stat().st_mtime:
            continue
        size = p.stat().st_size
        time.sleep(2)
        if p.stat().st_size != size or probe(p) is None:
            continue  # still uploading, or not readable yet
        r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(p),
                            "-vf", "scale='if(gt(iw,ih),-2,540)':'if(gt(iw,ih),540,-2)'",
                            "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-maxrate", "2500k", "-bufsize", "5000k",
                            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-f", "mov", str(dest) + ".part"])
        if r.returncode == 0:
            Path(str(dest) + ".part").rename(dest)
            made += 1
            print(f"  {p.name}  {size / 1e6:.0f} MB -> {dest.stat().st_size / 1e6:.2f} MB", flush=True)
    if not made:
        return 0
    rows = []
    for p in clips:
        dest, info = out / p.name, probe(p)
        if not dest.exists() or not info:
            continue
        bright, shake = brightness_and_shake(dest)
        flags = [f for f, hit in (("dark", bright < 45), ("shaky", shake > 1.2), ("very short", info["seconds"] < 2),
                                  ("proxy over 9.5 MB", dest.stat().st_size > 9.5e6)) if hit]
        rows.append({"clip": p.name, **info, "raw_mb": round(p.stat().st_size / 1e6, 1),
                     "proxy_mb": round(dest.stat().st_size / 1e6, 2), "brightness": bright, "shake": shake, "flags": ", ".join(flags)})
    with open(out / "clip-log.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    cols = 8
    ins, parts = [], []
    for i, r in enumerate(rows):
        ins += ["-ss", str(r["seconds"] / 2), "-i", str(out / r["clip"])]
        label = r["clip"].rsplit(".", 1)[0][-10:].replace(":", "")
        parts.append(f"[{i}:v]scale=200:200:force_original_aspect_ratio=decrease,pad=200:200:(ow-iw)/2:(oh-ih)/2,"
                     f"drawtext=text='{label}':x=4:y=4:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.6[t{i}]")
    lay = "|".join(f"{(i % cols) * 200}_{(i // cols) * 200}" for i in range(len(rows)))
    graph = ";".join(parts) + ";" + "".join(f"[t{i}]" for i in range(len(rows))) + f"xstack=inputs={len(rows)}:layout={lay}:fill=black"
    if len(rows) > 1:
        subprocess.run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", graph, "-frames:v", "1", "-q:v", "4", str(out / "all-clips.jpg")])
    print(f"{job.name}: {made} new, {len(rows)} clips logged, {sum(r['proxy_mb'] for r in rows):.1f} MB of proxies", flush=True)
    return made


def sweep(root):
    jobs = [root] + [d for d in sorted(root.iterdir()) if d.is_dir() and d.name not in SKIP and not d.name.startswith(".")]
    return sum(do_job(j) for j in jobs)


def main():
    root = Path(sys.argv[1]).expanduser().resolve()
    if "--watch" not in sys.argv:
        sweep(root)
        return
    print(f"Watching {root}", flush=True)
    while True:
        try:
            sweep(root)
        except Exception as e:  # keep the watcher alive, report and try again
            print("error:", e, flush=True)
        time.sleep(30)


if __name__ == "__main__":
    main()
