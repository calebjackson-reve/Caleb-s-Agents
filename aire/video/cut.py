#!/usr/bin/env python3
"""Build a video from an edit decision list. One EDL, every shape, same cuts.

  python3 aire/video/cut.py job/edl.json            # preview (540 px short side)
  python3 aire/video/cut.py job/edl.json --final    # full quality (1080 px short side)

Segments are cached by content, so a re-run only rebuilds the clips that changed.
Writes <out>/<name>-<shape>.mp4 and <out>/timing.json. Needs ffmpeg and ffprobe.
"""
import hashlib, json, re, subprocess, sys, time
from pathlib import Path

SHAPES = {"9x16": (9, 16), "4x3": (4, 3), "1x1": (1, 1), "16x9": (16, 9)}


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def lufs(path, chain="anull"):
    """Integrated loudness of a file's audio after an optional filter chain."""
    e = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", chain + ",ebur128", "-vn", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", e)
    return float(m[-1]) if m else None


def title_filters(edl, root, w, h, tmp):
    """drawtext filters for the cut list's titles. Sizes and positions are fractions of the frame height."""
    out = []
    for ti, t in enumerate(edl.get("titles", [])):
        s0, e0, f = t["start"], t["end"], t.get("fade", 0.25)
        y = t.get("y", 0.68) * h
        alpha = f"if(lt(t,{s0 + f}),(t-{s0})/{f},if(gt(t,{e0 - f}),({e0}-t)/{f},1))"
        for li, ln in enumerate(t["lines"]):
            px = max(int(ln.get("size", 0.04) * min(w, h)), 8)  # sized off the short side so every shape matches
            font_path = root / ln["font"] if ln.get("font") else None
            if font_path:  # shrink a long line until it fits inside 90 percent of the width
                try:
                    from PIL import ImageFont
                    while px > 8 and ImageFont.truetype(str(font_path), px).getlength(ln["text"]) > 0.9 * w:
                        px -= 1
                except ImportError:
                    pass
            txt = tmp / f"title-{ti}-{li}.txt"
            txt.write_text(ln["text"])
            font = f":fontfile='{font_path}'" if font_path else ""
            x = "(w-text_w)/2" if t.get("align", "center") == "center" else str(int(t.get("x", 0.07) * w))
            color = ln.get("color", "white")
            edge = (f":borderw={max(px // 28, 1)}:bordercolor=black@0.45"
                    f":shadowcolor=black@0.7:shadowx={max(px // 18, 1)}:shadowy={max(px // 18, 1)}") if color == "white" else ""
            out.append(f"drawtext=textfile='{txt}'{font}:fontsize={px}:fontcolor={color}:alpha='{alpha}':x={x}:y={int(y)}"
                       f"{edge}:enable='between(t,{s0},{e0})'")
            y += px * ln.get("gap", 1.35)
    return ",".join(out)


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
    total = sum(round((c["out"] - c["in"]) / c.get("speed", 1) * fps) for c in edl["clips"]) / fps
    look = "," + edl["look"] if edl.get("look") else ""  # optional ffmpeg filters for the color look

    for shape in edl["shapes"]:
        t0 = time.time()
        w, h = size(shape, short)
        segs, built = [], 0
        for c in edl["clips"]:
            fx, fy = c.get("focus", [0.5, 0.5])
            frames = round((c["out"] - c["in"]) / c.get("speed", 1) * fps)  # exact frame count, so cuts never drift
            key = json.dumps([c, shape, short, fps, look, frames, Path(root / c["src"]).stat().st_mtime], sort_keys=True)
            seg = cache / (hashlib.sha1(key.encode()).hexdigest()[:16] + ".mp4")
            if not seg.exists():
                vf = (f"setpts=PTS/{c.get('speed', 1)},scale={w}:{h}:force_original_aspect_ratio=increase,"
                      f"crop={w}:{h}:(iw-{w})*{fx}:(ih-{h})*{fy},fps={fps},setsar=1" + look)
                run(["ffmpeg", "-y", "-ss", str(c["in"]), "-t", str(c["out"] - c["in"] + 0.5), "-i", str(root / c["src"]),
                     "-vf", vf, "-an", "-frames:v", str(frames), *enc, str(seg)])
                built += 1
            segs.append(seg)
        lst = cache / f"list-{shape}.txt"
        lst.write_text("".join(f"file '{s}'\n" for s in segs))
        dest = out / f"{edl['name']}-{shape}{'' if final else '-preview'}.mp4"
        cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst)]
        aud = []
        if edl.get("music"):
            fade = edl.get("music_fade", 1.5)
            shape_a = f"atrim=0:{total},afade=t=out:st={max(total - fade, 0)}:d={fade}"
            # measure the trimmed track, then set it to -14 LUFS with a plain gain and a limiter
            src_a = ["-ss", str(edl.get("music_in", 0)), "-i", str(root / edl["music"])]
            gain = 0.0
            for _ in range(4):  # the limiter eats some level on punchy music, so measure and correct a few times
                e = subprocess.run(["ffmpeg", "-hide_banner", *src_a, "-af",
                                    f"{shape_a},volume={gain}dB,alimiter=limit=0.84:level=0,ebur128", "-vn", "-f", "null", "-"],
                                   capture_output=True, text=True).stderr
                m = re.findall(r"I:\s+(-?[\d.]+) LUFS", e)
                if not m or abs(-14.0 - float(m[-1])) < 0.3:
                    break
                gain = round(gain + (-14.0 - float(m[-1])), 2)
            cmd += src_a
            aud = ["-filter:a", f"{shape_a},volume={gain}dB,alimiter=limit=0.84:level=0",
                   "-c:a", "aac", "-b:a", "192k", "-shortest"]
        titles = title_filters(edl, root, w, h, cache)
        overlays = edl.get("overlays", [])
        if overlays:  # pictures such as a logo, each with an optional backdrop that fades in behind it
            n_in = 2 if edl.get("music") else 1
            graph, last = [], "0:v"
            for k, o in enumerate(overlays):
                s0, f = o["start"], o.get("fade", 0.4)
                if o.get("backdrop"):
                    graph.append(f"color=c={o['backdrop']}:s={w}x{h}:r={fps}:d={total},format=rgba,"
                                 f"fade=t=in:st={s0}:d={f}:alpha=1[bk{k}];[{last}][bk{k}]overlay=enable='gte(t,{s0})'[b{k}]")
                    last = f"b{k}"
                cmd += ["-loop", "1", "-t", str(total), "-i", str(root / o["image"])]
                lw = int(o.get("width", 0.4) * min(w, h))
                grow = o.get("grow", 0.08)  # the picture eases up to full size as it fades in
                graph.append(f"[{n_in + k}:v]format=rgba,scale=w='2*trunc({lw}*({1 - grow}+{grow}*min(1,max(0,(t-{s0})/{o.get('grow_time', 1.2)})))/2)'"
                             f":h=-2:eval=frame,fade=t=in:st={s0}:d={f}:alpha=1[im{k}];"
                             f"[{last}][im{k}]overlay=x=(W-w)/2:y={int(o.get('y', 0.42) * h)}-h/2:enable='gte(t,{s0})'[o{k}]")
                last = f"o{k}"
            graph.append(f"[{last}]{titles or 'null'}[vout]")
            vid = ["-filter_complex", ";".join(graph), "-map", "[vout]", *(["-map", "1:a"] if edl.get("music") else []), *enc]
        else:
            vid = ["-vf", titles, *enc] if titles else ["-c:v", "copy"]  # titles need one more encode, plain cuts do not
        run(cmd + [*vid, *aud, "-t", str(total), "-movflags", "+faststart", str(dest)])
        timing["shapes"][shape] = {"file": dest.name, "size": [w, h], "loudness_lufs": lufs(dest), "segments_built": built,
                                   "segments_reused": len(segs) - built, "seconds": round(time.time() - t0, 1)}
        print(f"{dest.name}  {w}x{h}  built {built}, reused {len(segs) - built}  {timing['shapes'][shape]['seconds']} s")
    timing["planned_duration"] = round(total, 2)
    (out / "timing.json").write_text(json.dumps(timing, indent=2))


if __name__ == "__main__":
    main()
