#!/usr/bin/env python3
"""Measure how a reference video is edited and write the numbers to a style spec.

    python3 style_probe.py VIDEO [--captions VIDEO.en.vtt] [--name nate-herk-2026-10-11] [--out specs/]

What it measures (all from the file, nothing guessed):
  cuts        hard cuts from ffmpeg's scene score, then shot length stats and cuts per minute
  shots       every 0.5 s frame is labeled face (talking head), pip (screen with a small face
              bubble) or other (screen, motion graphic or b-roll), with face size for punch-ins
  jump cuts   small same-angle cuts inside talking-head stretches (scene score 0.06 to 0.30)
  punch-ins   cuts where the talking head jumps in size by 12% or more (a zoom cut, same angle)
  speech      words per minute and pause lengths, from YouTube word-timed captions or a
              faster-whisper word transcript (--transcribe, needs the model on this machine)
  loudness    integrated LUFS and true peak from ffmpeg's ebur128

It writes <name>.json (the spec the cutter reads) and <name>-contact.jpg (one frame every 2 s)
so a person can check the labels by eye. The "other" bucket is not split into screen vs
graphics vs b-roll automatically. The contact sheet is how that gets read.
"""
import argparse
import json
import re
import statistics as st
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

SAMPLE_FPS = 2
SCENE_THRESHOLD = 0.30
JUMP_THRESHOLD = 0.06  # a jump cut on the same framing barely moves the scene score
PUNCH_RATIO = 1.12


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(out.stdout.strip())


def hard_cuts(path, threshold=SCENE_THRESHOLD):
    """Times of hard cuts. Scene score is computed on a small copy so it runs fast."""
    out = run([
        "ffmpeg", "-hide_banner", "-i", str(path), "-an",
        "-vf", f"scale=320:-2,select='gt(scene,{threshold})',showinfo", "-f", "null", "-",
    ])
    times = [float(m) for m in re.findall(r"pts_time:([0-9.]+)", out.stderr)]
    # Animated graphics can trip the detector on back-to-back frames. Keep one cut per 0.4 s.
    kept = []
    for t in times:
        if not kept or t - kept[-1] >= 0.4:
            kept.append(t)
    return kept


def frames(path):
    """Yield (time, small BGR frame) at SAMPLE_FPS."""
    w, h = 640, 360
    proc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"fps={SAMPLE_FPS},scale={w}:{h}",
         "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
        stdout=subprocess.PIPE,
    )
    i = 0
    while True:
        buf = proc.stdout.read(w * h * 3)
        if len(buf) < w * h * 3:
            break
        yield i / SAMPLE_FPS, np.frombuffer(buf, np.uint8).reshape(h, w, 3)
        i += 1
    proc.wait()


def label_frames(path):
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    rows = []
    for t, img in frames(path):
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(18, 18))
        label, size, cx = "other", 0.0, None
        if len(faces):
            x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
            size = fw / img.shape[1]
            cx = (x + fw / 2) / img.shape[1]
            cy = (y + fh / 2) / img.shape[0]
            if size >= 0.10:
                label = "face"
            elif size >= 0.035 and (cx > 0.7 or cx < 0.3) and cy > 0.45:
                label = "pip"
        rows.append({"t": t, "label": label, "face_w": round(size, 3), "face_x": cx and round(cx, 3)})
    return rows


def smooth(rows, k=2):
    """Majority vote over +/-k samples so one missed detection doesn't make a fake shot."""
    labels = [r["label"] for r in rows]
    out = []
    for i in range(len(labels)):
        win = labels[max(0, i - k): i + k + 1]
        out.append(max(set(win), key=win.count))
    for r, lab in zip(rows, out):
        r["label"] = lab
    return rows


def segments(rows):
    segs = []
    for r in rows:
        if segs and segs[-1]["label"] == r["label"]:
            segs[-1]["end"] = r["t"] + 1 / SAMPLE_FPS
        else:
            segs.append({"label": r["label"], "start": r["t"], "end": r["t"] + 1 / SAMPLE_FPS})
    return segs


def punch_ins(rows, cuts):
    """A cut between two talking-head frames where the face size changes by PUNCH_RATIO or more."""
    by_t = {round(r["t"], 2): r for r in rows}
    found = []
    for c in cuts:
        before = by_t.get(round(np.floor((c - 0.3) * SAMPLE_FPS) / SAMPLE_FPS, 2))
        after = by_t.get(round(np.ceil((c + 0.3) * SAMPLE_FPS) / SAMPLE_FPS, 2))
        if not before or not after or before["label"] != "face" or after["label"] != "face":
            continue
        a, b = before["face_w"], after["face_w"]
        if a and b and max(a, b) / min(a, b) >= PUNCH_RATIO:
            found.append({"t": round(c, 2), "from": a, "to": b, "dir": "in" if b > a else "out"})
    return found


def jump_cuts(soft, hard, segs):
    """Soft cuts inside talking-head stretches that are not hard cuts: same-angle jump cuts."""
    face = [(s["start"] + 0.5, s["end"] - 0.5) for s in segs if s["label"] == "face"]
    return [t for t in soft
            if any(a <= t <= b for a, b in face) and all(abs(t - h) > 0.3 for h in hard)]


def vtt_words(path):
    """Word start times from YouTube's word-timed captions (<00:00:01.480><c> word</c>)."""
    words = []
    text = Path(path).read_text(encoding="utf-8")
    for block in text.split("\n\n"):
        lines = block.strip().splitlines()
        if len(lines) < 2 or "-->" not in lines[0] or "<c>" not in block:
            continue
        start = lines[0].split(" --> ")[0]
        body = lines[-1]
        first = re.match(r"^([^<]+)", body)
        if first and first.group(1).strip():
            words.append((ts(start), first.group(1).strip()))
        for tm, w in re.findall(r"<(\d\d:\d\d:\d\d\.\d+)><c>\s*([^<]+)</c>", body):
            words.append((ts(tm), w.strip()))
    words.sort()
    return [w for w in words if w[1] and not w[1].startswith("[")]


def ts(s):
    h, m, sec = s.split(":")
    return int(h) * 3600 + int(m) * 60 + float(sec)


def speech_stats(words, total):
    if len(words) < 20:
        return None
    starts = [w[0] for w in words]
    gaps = [b - a for a, b in zip(starts, starts[1:])]
    # A gap between word starts includes the word itself. 0.6 s between starts is about a
    # 0.3 s silence at this speaking rate, which is where a listener hears a pause.
    pauses = [g for g in gaps if g >= 0.6]
    span = starts[-1] - starts[0]
    return {
        "words": len(words),
        "wpm": round(len(words) / (span / 60), 1),
        "pauses_per_min": round(len(pauses) / (span / 60), 1),
        "pause_median_s": round(st.median(pauses), 2) if pauses else 0,
        "pause_p90_s": round(float(np.percentile(pauses, 90)), 2) if pauses else 0,
        "longest_gap_s": round(max(gaps), 2),
        "first_word_s": round(starts[0], 2),
        "talk_ratio": round(span / total, 3),
    }


def loudness(path):
    out = run(["ffmpeg", "-hide_banner", "-i", str(path), "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"])
    tail = out.stderr[out.stderr.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[0-9.]+) LUFS", tail)
    p = re.search(r"Peak:\s+(-?[0-9.]+) dBFS", tail)
    return {"integrated_lufs": float(i.group(1)) if i else None, "true_peak_dbfs": float(p.group(1)) if p else None}


def contact_sheet(path, out):
    run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-vf",
         "fps=1/2,scale=240:-2,drawbox=c=black@0:t=0,tile=12x15", "-frames:v", "1", "-q:v", "4", str(out)])


def summarize(total, cuts, rows, punches, jumps, speech, loud, opening_window=30.0):
    segs = segments(rows)
    share = {lab: 0.0 for lab in ("face", "pip", "other")}
    for s in segs:
        share[s["label"]] += s["end"] - s["start"]
    shots = [b - a for a, b in zip([0.0] + cuts, cuts + [total])]
    first_non_face = next((s["start"] for s in segs if s["label"] != "face"), None)
    first_face = next((s["start"] for s in segs if s["label"] == "face"), None)
    face_runs = [s["end"] - s["start"] for s in segs if s["label"] == "face"]
    other_runs = [s["end"] - s["start"] for s in segs if s["label"] != "face"]
    early = [c for c in cuts if c < opening_window]
    face_sizes = [r["face_w"] for r in rows if r["label"] == "face"]
    return {
        "duration_s": round(total, 1),
        "cuts": {
            "count": len(cuts),
            "per_min": round(len(cuts) / (total / 60), 1),
            "per_min_first_30s": round(len(early) / (min(total, opening_window) / 60), 1),
            "shot_median_s": round(st.median(shots), 2),
            "shot_p90_s": round(float(np.percentile(shots, 90)), 2),
            "longest_shot_s": round(max(shots), 1),
        },
        "picture": {
            "face_share": round(share["face"] / total, 3),
            "pip_share": round(share["pip"] / total, 3),
            "other_share": round(share["other"] / total, 3),
            "face_run_median_s": round(st.median(face_runs), 1) if face_runs else None,
            "other_run_median_s": round(st.median(other_runs), 1) if other_runs else None,
            "first_face_s": first_face,
            "first_non_face_s": first_non_face,
            "face_width_median": round(st.median(face_sizes), 3) if face_sizes else None,
            "face_width_p10_p90": [round(float(np.percentile(face_sizes, q)), 3) for q in (10, 90)] if face_sizes else None,
        },
        "jump_cuts": {
            "count": len(jumps),
            "per_min_of_face": round(len(jumps) / (share["face"] / 60), 2) if share["face"] else 0,
        },
        "punch_ins": {
            "count": len(punches),
            "per_min_of_face": round(len(punches) / (share["face"] / 60), 2) if share["face"] else 0,
            "median_ratio": round(st.median([max(p["from"], p["to"]) / min(p["from"], p["to"]) for p in punches]), 2) if punches else None,
        },
        "speech": speech,
        "loudness": loud,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--captions", help="YouTube .vtt with word timing (yt-dlp --write-auto-subs)")
    ap.add_argument("--name", help="spec name, default is the video file name")
    ap.add_argument("--out", default="specs")
    a = ap.parse_args()

    video = Path(a.video)
    name = a.name or video.stem
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    total = duration(video)
    print(f"[probe] {video.name}: {total:.1f}s", file=sys.stderr)
    cuts = hard_cuts(video)
    print(f"[probe] {len(cuts)} cuts", file=sys.stderr)
    rows = smooth(label_frames(video))
    punches = punch_ins(rows, cuts)
    jumps = jump_cuts(hard_cuts(video, JUMP_THRESHOLD), cuts, segments(rows))
    speech = speech_stats(vtt_words(a.captions), total) if a.captions else None
    loud = loudness(video)
    spec = {
        "name": name,
        "source": str(video.name),
        "method": "style_probe.py: ffmpeg scene>0.30 cuts, Haar face labels at 2 fps, caption word timing, ebur128",
        "measured": summarize(total, cuts, rows, punches, jumps, speech, loud),
        "timeline": {"cuts": [round(c, 2) for c in cuts], "jump_cuts": [round(j, 2) for j in jumps], "segments": segments(rows), "punch_ins": punches},
    }
    (out / f"{name}.json").write_text(json.dumps(spec, indent=1))
    contact_sheet(video, out / f"{name}-contact.jpg")
    print(json.dumps(spec["measured"], indent=1))


if __name__ == "__main__":
    main()
