#!/usr/bin/env python3
"""Move every shot in a cut list to the calmest moment of its clip, and report the shots that are still not calm.

  python3 aire/video/steady.py job/edl.json                # writes job/edl.steady.json and prints a report
  python3 aire/video/steady.py job/edl.json --report       # only measure, change nothing

"Shaky" to a viewer is mostly sway and tilt, not tiny jitter. For each shot this measures, 30 times a second:
  sway   how far the camera move strays from one straight, even glide
  roll   how much the frame tilts
  speed  how fast the frame travels (a fast straight move is not shake, but it is flagged)
A shot scoring over the limit (0.12) is searched for a calmer start, close by first, then anywhere in the clip.
Shots still over the limit are listed so the editor can swap in another clip of that room.
Reads the small copy in <clip folder>/proxies/ when there is one, which is much faster. Skip a clip with "steady": false.
Always look at the result. The calmest moment is sometimes a blank wall. Needs ffmpeg and numpy.
"""
import json, pickle, subprocess, sys
from pathlib import Path
import numpy as np

LIMIT = 0.12


def _shift(a, b, win):
    h, w = a.shape
    r = np.fft.fft2((a - a.mean()) * win) * np.conj(np.fft.fft2((b - b.mean()) * win))
    r = np.abs(np.fft.ifft2(r / (np.abs(r) + 1e-6)))
    py, px = np.unravel_index(r.argmax(), r.shape)

    def sub(v, k, n):
        x, y, z = v[(k - 1) % n], v[k], v[(k + 1) % n]
        d = x - 2 * y + z
        return 0.5 * (x - z) / d if d else 0
    return ((py + sub(r[:, px], py, h) + h / 2) % h) - h / 2, ((px + sub(r[py, :], px, w) + w / 2) % w) - w / 2


def motion(path, cache):
    """Per frame: camera x and y travel and roll, in percent of frame width per 1/30 s. Returns (rows, fps, seconds)."""
    key = cache / (path.name + ".motion.pkl")
    if key.exists() and key.stat().st_mtime > path.stat().st_mtime:
        return pickle.loads(key.read_bytes())
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
                                  capture_output=True, text=True).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    num, den = v["r_frame_rate"].split("/")
    fps = int(num) / int(den)
    rot = abs(int(next((d.get("rotation", 0) for d in v.get("side_data_list", []) if "rotation" in d), 0)))
    tall = (v["height"] > v["width"]) != (rot in (90, 270))
    w, h = (144, 256) if tall else (192, 108)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    g = np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w).astype(np.float32)
    step = 2 if fps > 40 else 1
    hw = w // 2
    full = np.hanning(h)[:, None] * np.hanning(w)[None, :]
    half = np.hanning(h)[:, None] * np.hanning(hw)[None, :]
    rows = []
    for i in range(step, len(g)):
        a, b = g[i - step], g[i]
        vy, vx = _shift(a, b, full)
        ly, _ = _shift(a[:, :hw], b[:, :hw], half)
        ry, _ = _shift(a[:, hw:], b[:, hw:], half)
        rows.append((vx / w * 100, vy / w * 100, (ry - ly) / w * 100))
    out = (np.array(rows), fps, float(j["format"]["duration"]))
    key.write_bytes(pickle.dumps(out))
    return out


def score(m, fps, start, length):
    x = m[int(start * fps):int((start + length) * fps)]
    if len(x) < 6:
        return None
    v = x[:, :2]
    mean = v.mean(axis=0)
    sway = float(np.sqrt(((v - mean) ** 2).sum(axis=1)).mean())
    roll = float(np.abs(x[:, 2] - np.median(x[:, 2])).mean()) + abs(float(np.median(x[:, 2])))
    speed = float(np.sqrt((mean ** 2).sum()))
    return {"sway": round(sway, 3), "roll": round(roll, 3), "speed": round(speed, 3),
            "total": round(sway + roll + 0.35 * max(speed - 0.25, 0), 3)}


def main():
    edl_path = Path(sys.argv[1]).resolve()
    only_report = "--report" in sys.argv
    edl = json.loads(edl_path.read_text())
    root = edl_path.parent
    cache = root / edl.get("out", "out") / "motion"
    cache.mkdir(parents=True, exist_ok=True)
    taken, report = [], []
    for k, c in enumerate(edl["clips"]):
        src = root / c["src"]
        small = src.parent / "proxies" / src.name
        m, fps, dur = motion(small if small.exists() else src, cache)
        length = c["out"] - c["in"]
        before = score(m, fps, c["in"], length)
        row = {"shot": k + 1, "clip": src.name, "in": c["in"], "before": before and before["total"]}
        if before and before["total"] > LIMIT and c.get("steady", True) and not only_report:
            pick = (c["in"], before)
            for span in (1.0, 2.5, dur):                      # stay near the wanted moment, widen only if needed
                for s in np.arange(max(0.3, c["in"] - span), min(dur - length - 0.3, c["in"] + span) + 1e-6, 0.1):
                    if any(n == src.name and s < e + 0.5 and s + length > b - 0.5 for n, b, e in taken):
                        continue
                    sc = score(m, fps, s, length)
                    if sc and sc["total"] < pick[1]["total"]:
                        pick = (round(float(s), 2), sc)
                if pick[1]["total"] <= LIMIT:
                    break
            c["in"], c["out"] = pick[0], round(pick[0] + length, 3)
            row.update({"in": pick[0], "after": pick[1]["total"], "detail": pick[1]})
        else:
            row.update({"after": row["before"], "detail": before})
        taken.append((src.name, c["in"], c["out"]))
        report.append(row)
    b4 = [r["before"] for r in report if r["before"] is not None]
    af = [r["after"] for r in report if r["after"] is not None]
    print(f"{len(report)} shots | over the limit {sum(x > LIMIT for x in b4)} -> {sum(x > LIMIT for x in af)} | "
          f"typical {np.median(b4):.3f} -> {np.median(af):.3f} | worst {max(b4):.2f} -> {max(af):.2f}")
    for r in report:
        if r["after"] is not None and r["after"] > LIMIT:
            d = r["detail"]
            why = "fast straight move" if d["sway"] + d["roll"] <= LIMIT else "sway or tilt"
            print(f"  still over: shot {r['shot']}  {r['clip']}  {r['after']}  ({why})")
    (root / "steady-report.json").write_text(json.dumps(report, indent=1))
    if not only_report:
        dest = edl_path.with_suffix(".steady.json")
        dest.write_text(json.dumps(edl, indent=1))
        print("wrote", dest)


if __name__ == "__main__":
    main()
