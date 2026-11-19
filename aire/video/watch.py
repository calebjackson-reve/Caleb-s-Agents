#!/usr/bin/env python3
"""Watch a video from a link or a file, start to finish, and write down what is in it.

  python3 aire/video/watch.py https://www.instagram.com/p/XXXX/
  python3 aire/video/watch.py path/to/clip.mp4 --name grok-cut

Writes to aire/video/out/<name>/ (git-ignored):
  source.mp4      the video itself
  sheet-N.jpg     every half second of the video, time stamped, 35 frames a sheet
  teardown.json   size, frame rate, every cut, every shot length, motion per shot, loudness
  teardown.md     the same, readable
  proxy.mp4       a copy under 10 MB, small enough for the Google Drive connector

Needs ffmpeg, ffprobe, numpy, and yt-dlp for links (pip install yt-dlp).
A page that needs a login: add --cookies-from-browser chrome on a Mac that is signed in.
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent


def sh(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def fetch(src, out, extra):
    dest = out / "source.mp4"
    if not re.match(r"https?://", src):
        sh(["ffmpeg", "-y", "-i", src, "-c", "copy", str(dest)])
        return dest
    # Instagram limits anonymous reads, and the /reel/ form gets through more often than /p/.
    tries = [re.sub(r"instagram\.com/p/", "instagram.com/reel/", src), src]
    err = ""
    for url in dict.fromkeys(tries):
        r = subprocess.run(["yt-dlp", "--no-playlist", "--merge-output-format", "mp4", "--write-info-json",
                            "-o", str(out / "source.%(ext)s"), *extra, url], capture_output=True, text=True)
        if r.returncode == 0 and dest.exists():
            return dest
        err = (r.stderr.strip().splitlines() or ["download failed"])[-1]
    sys.exit(f"Could not download {src}\n{err}\n"
             "Fix: run this on a Mac signed in to the site and add --cookies-from-browser chrome, "
             "or save the video by hand and pass the file path.")


def probe(f):
    j = json.loads(sh(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(f)]).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    n, d = v["r_frame_rate"].split("/")
    return {"width": v["width"], "height": v["height"], "fps": round(int(n) / int(d), 3),
            "duration": round(float(j["format"]["duration"]), 2),
            "has_audio": any(s["codec_type"] == "audio" for s in j["streams"])}


def analyse(f, fps):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-vf", "scale=96:72,format=gray",
                          "-f", "rawvideo", "-"], check=True, capture_output=True).stdout
    g = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 72, 96).astype(np.float32)
    d = np.concatenate([[0], np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))])
    n, cuts = len(g), []
    for i in range(1, n - 1):
        if d[i] > 12 and d[i] > 4 * np.median(d[max(0, i - 8):i + 8]) and (not cuts or i - cuts[-1] > 3):
            cuts.append(i)
    shots, edges = [], [0, *cuts, n]
    for s, e in zip(edges[:-1], edges[1:]):
        x = d[s + 1:e]
        moving = np.where(x >= 0.15)[0]
        step = int(np.median(np.diff(moving))) if len(moving) > 2 else 1
        held = round(float((x < 0.15).mean()) * 100) if len(x) else 0
        kind = "flash" if e - s < fps / 3 else "still" if held > 80 else "smooth" if step * 1000 / fps <= 45 else "stepped"
        shots.append({"start": round(s / fps, 2), "length": round((e - s) / fps, 2), "held_frames_pct": held,
                      "new_frame_every_ms": round(step * 1000 / fps), "motion": kind})
    return [round(c / fps, 2) for c in cuts], shots


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    src = args[0]
    name = sys.argv[sys.argv.index("--name") + 1] if "--name" in sys.argv else re.sub(r"\W+", "-", src.rstrip("/").split("/")[-1])[:40]
    extra = ["--cookies-from-browser", sys.argv[sys.argv.index("--cookies-from-browser") + 1]] if "--cookies-from-browser" in sys.argv else []
    out = HERE / "out" / name
    out.mkdir(parents=True, exist_ok=True)
    f = fetch(src, out, extra)
    info = probe(f)
    cuts, shots = analyse(f, info["fps"])
    lens = [s["length"] for s in shots]
    kinds = {k: sum(1 for s in shots if s["motion"] == k) for k in ("smooth", "stepped", "still", "flash")}
    loud = None
    if info["has_audio"]:
        e = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(f), "-af", "ebur128", "-vn", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
        m = re.findall(r"I:\s+(-?[\d.]+) LUFS", e)
        loud = float(m[-1]) if m else None
    sheets = -(-int(info["duration"] * 2) // 35)
    for k in range(sheets):
        sh(["ffmpeg", "-y", "-v", "error", "-ss", str(k * 17.5), "-t", "17.5", "-i", str(f), "-vf",
            f"fps=2,scale=270:-2,drawtext=text='%{{eif\\:{k * 17.5}+n/2\\:d}}s':x=6:y=6:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=7x5",
            "-frames:v", "1", "-q:v", "3", str(out / f"sheet-{k}.jpg")])
    kbps = int(min(1500, 9.0 * 8000 / info["duration"] - 96))
    sh(["ffmpeg", "-y", "-v", "error", "-i", str(f), "-vf", "scale=-2:540,fps=30", "-c:v", "libx264", "-preset", "veryfast",
        "-b:v", f"{kbps}k", "-maxrate", f"{kbps}k", "-bufsize", f"{kbps * 2}k", "-c:a", "aac", "-b:a", "96k",
        "-movflags", "+faststart", str(out / "proxy.mp4")])
    t = {"source": src, **info, "cuts": len(cuts), "shots": len(shots), "median_shot": float(np.median(lens)),
         "longest_shot": max(lens), "shortest_shot": min(lens), "motion_counts": kinds, "loudness_lufs": loud,
         "cut_times": cuts, "shot_list": shots, "proxy_mb": round((out / "proxy.mp4").stat().st_size / 1e6, 1)}
    (out / "teardown.json").write_text(json.dumps(t, indent=1))
    md = [f"# Teardown: {name}", "", f"Source: {src}", "",
          f"- {info['width']}x{info['height']}, {info['fps']} fps, {info['duration']} s, loudness {loud} LUFS",
          f"- {len(shots)} shots, {len(cuts)} cuts. Median shot {t['median_shot']} s, shortest {min(lens)} s, longest {max(lens)} s",
          f"- Motion by shot: {kinds}", "", "| Start | Length | Motion | New frame every |", "|---|---|---|---|"]
    md += [f"| {s['start']} | {s['length']} | {s['motion']} | {s['new_frame_every_ms']} ms |" for s in shots]
    (out / "teardown.md").write_text("\n".join(md) + "\n")
    print(json.dumps({k: v for k, v in t.items() if k not in ("cut_times", "shot_list")}, indent=1))
    print("folder:", out)


if __name__ == "__main__":
    main()
