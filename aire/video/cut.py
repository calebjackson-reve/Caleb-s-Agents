#!/usr/bin/env python3
"""Build a video from an edit decision list. One EDL, every shape, same cuts.

  python3 aire/video/cut.py job/edl.json            # preview (540 px short side)
  python3 aire/video/cut.py job/edl.json --final    # full quality (1080 px short side)

Segments are cached by content, so a re-run only rebuilds the clips that changed.
Writes <out>/<name>-<shape>.mp4 and <out>/timing.json. Needs ffmpeg and ffprobe.
"""
import hashlib, json, subprocess, sys, time
from pathlib import Path

SHAPES = {"9x16": (9, 16), "4x3": (4, 3), "1x1": (1, 1), "16x9": (16, 9)}


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def size(shape, short):
    a, b = SHAPES[shape]
    w, h = (short, short * b // a) if a < b else (short * a // b, short)
    return w - w % 2, h - h % 2


def main():
    edl_path = Path(sys.argv[1]).resolve()
    final = "--final" in sys.argv
    edl = json.loads(edl_path.read_text())
    root = edl_path.parent
    out = root / edl.get("out", "out")
    cache = out / "segments"
    cache.mkdir(parents=True, exist_ok=True)
    fps = edl.get("fps", 30)
    short = 1080 if final else 540
    enc = ["-c:v", "libx264", "-preset", "medium" if final else "veryfast",
           "-crf", "18" if final else "27", "-pix_fmt", "yuv420p"]
    timing = {"mode": "final" if final else "preview", "started": time.strftime("%Y-%m-%d %H:%M:%S"), "shapes": {}}
    total = sum((c["out"] - c["in"]) / c.get("speed", 1) for c in edl["clips"])

    for shape in edl["shapes"]:
        t0 = time.time()
        w, h = size(shape, short)
        segs, built = [], 0
        for c in edl["clips"]:
            fx, fy = c.get("focus", [0.5, 0.5])
            key = json.dumps([c, shape, short, fps, Path(root / c["src"]).stat().st_mtime], sort_keys=True)
            seg = cache / (hashlib.sha1(key.encode()).hexdigest()[:16] + ".mp4")
            if not seg.exists():
                vf = (f"setpts=PTS/{c.get('speed', 1)},scale={w}:{h}:force_original_aspect_ratio=increase,"
                      f"crop={w}:{h}:(iw-{w})*{fx}:(ih-{h})*{fy},fps={fps},setsar=1")
                run(["ffmpeg", "-y", "-ss", str(c["in"]), "-t", str(c["out"] - c["in"]), "-i", str(root / c["src"]),
                     "-vf", vf, "-an", *enc, str(seg)])
                built += 1
            segs.append(seg)
        lst = cache / f"list-{shape}.txt"
        lst.write_text("".join(f"file '{s}'\n" for s in segs))
        dest = out / f"{edl['name']}-{shape}{'' if final else '-preview'}.mp4"
        cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst)]
        if edl.get("music"):
            fade = edl.get("music_fade", 1.5)
            cmd += ["-ss", str(edl.get("music_in", 0)), "-i", str(root / edl["music"]), "-filter:a",
                    f"atrim=0:{total},afade=t=out:st={max(total - fade, 0)}:d={fade},loudnorm=I=-14:TP=-1.5:LRA=11",
                    "-c:a", "aac", "-b:a", "192k", "-shortest"]
        run(cmd + ["-c:v", "copy", "-movflags", "+faststart", str(dest)])
        timing["shapes"][shape] = {"file": dest.name, "size": [w, h], "segments_built": built,
                                   "segments_reused": len(segs) - built, "seconds": round(time.time() - t0, 1)}
        print(f"{dest.name}  {w}x{h}  built {built}, reused {len(segs) - built}  {timing['shapes'][shape]['seconds']} s")
    timing["planned_duration"] = round(total, 2)
    (out / "timing.json").write_text(json.dumps(timing, indent=2))


if __name__ == "__main__":
    main()
