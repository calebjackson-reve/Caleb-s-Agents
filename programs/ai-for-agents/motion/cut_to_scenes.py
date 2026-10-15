#!/usr/bin/env python3
"""Turn one raw face take plus a scene list into a finished, mostly animated video.

    python3 cut_to_scenes.py scenes/pilot-imessage.json TAKE.MOV out/pilot [--look ivory] [--model PATH]

Each scene in the list says which stretch of the take it plays over ("src": [start, end]) and
how much of your face shows ("face": "full" for the hook and last line, "pip" for the small
corner box, "none" when the screen is busy, "talk" for a full-frame talking head with keyword
pills, the way Nate Herk cuts). The script:
  1. finds every word (the editor's whisper step) and drops the "Fuck that, Caleb" retakes,
  2. trims the pauses inside each stretch and joins them in scene order (face.mp4),
  3. renders the animation to the exact scene lengths (render.mjs, motion.mp4),
  4. drops your face into the card or the corner box and levels the sound to -14 LUFS.
Writes OUT.mp4, OUT.scenes.json (the list with real lengths) and OUT.marks.json. The take is only read.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
EDITOR = HERE.parent / "editor"
sys.path.insert(0, str(EDITOR))
import skool_cut as sc  # noqa: E402

# Where the face sits in the take, as a share of the frame. A scene list can override any of these
# with "face_pos". pip_side is the corner box crop as a share of the frame's shorter side.
FACE = {"cx": 0.5, "cy": 0.45, "card_h": 1.0, "pip_side": 0.6, "talk_zoom": 1.0}


def run(cmd):
    subprocess.run(cmd, check=True)


def ranges_for(words, a, b, spec):
    P = spec["pauses"]
    inside = [w for w in words if w["s"] >= a - 0.05 and w["e"] <= b + 0.05]
    out = []
    for w in inside:
        s, e = max(a, w["s"] - P["pad_before_s"]), min(b, w["e"] + P["pad_after_s"])
        if out and s - out[-1][1] <= P["merge_gap_s"]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out, inside


def mask(path, w, h, r):
    from PIL import Image, ImageDraw
    img = Image.new("L", (w * 4, h * 4), 0)
    ImageDraw.Draw(img).rounded_rectangle([0, 0, w * 4 - 1, h * 4 - 1], r * 4, fill=255)
    img.resize((w, h), Image.LANCZOS).save(path)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scenes")
    ap.add_argument("take")
    ap.add_argument("out", help="output path without extension")
    ap.add_argument("--look")
    ap.add_argument("--model", default="small.en")
    ap.add_argument("--spec", default=str(EDITOR / "specs" / "skool-house-style.json"))
    a = ap.parse_args()

    spec = json.loads(Path(a.spec).read_text())
    data = json.loads(Path(a.scenes).read_text())
    if a.look:
        data["look"] = a.look
    out = Path(a.out).resolve()
    work = out.parent / (out.name + ".work")
    work.mkdir(parents=True, exist_ok=True)

    W, H, total = sc.probe(a.take)
    words, engine = sc.get_words(a.take, total, work, "whisper", a.model)
    words = sc.cut_mistakes(words, spec)

    # 1-2. cut the take scene by scene
    pieces, said = [], []
    for i, s in enumerate(data["scenes"]):
        # src is one [start, end] stretch, or a list of them joined in order (best line from each take)
        wins = s["src"] if isinstance(s["src"][0], list) else [s["src"]]
        rs, inside = [], []
        for w0, w1 in wins:
            r, i_ = ranges_for(words, w0, w1, spec)
            rs += r
            inside += i_
        s["dur"] = round(sum(e - b for b, e in rs), 3)
        s["said"] = " ".join(w["w"] for w in inside)
        pieces += rs
        said.append(f"{i:2d} {s['type']:<12} {s['dur']:5.1f}s  {s['said'][:90]}")
    print("\n".join(said), file=sys.stderr)
    lst = []
    for k, (b, e) in enumerate(pieces):
        p = work / f"seg{k:03d}.mp4"
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{b:.3f}", "-i", a.take, "-t", f"{e - b:.3f}",
             "-map", "0:v:0", "-map", "0:a:0", "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "fast",
             "-crf", "16", "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "1", str(p)])
        lst.append(f"file '{p}'")
    (work / "segs.txt").write_text("\n".join(lst))
    face = work / "face.mov"
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(work / "segs.txt"), "-c", "copy", str(face)])

    # 3. render the animation to those lengths
    scenes_out = out.with_suffix(".scenes.json")
    scenes_out.write_text(json.dumps(data, indent=1))
    motion = work / "motion.mp4"
    run(["node", str(HERE / "render.mjs"), str(scenes_out), str(motion)])
    marks = json.loads((work / "motion.marks.json").read_text())
    out.with_suffix(".marks.json").write_text(json.dumps(marks, indent=1))

    # 4. face into the card / corner box, then loudness
    full = [m for m in marks["marks"] if m["face"] == "full" and m.get("box")]
    pip = [m for m in marks["marks"] if m["face"] == "pip"]
    talk = [m for m in marks["marks"] if m["face"] == "talk"]
    F = {**FACE, **data.get("face_pos", {})}
    fw, fh, _ = sc.probe(str(face))
    box = full[0]["box"] if full else {"x": 0, "y": 0, "w": 600, "h": 840}
    bw, bh = int(round(box["w"])), int(round(box["h"]))
    ch = min(fh, int(fh * F["card_h"])) // 2 * 2
    cw = min(fw, int(ch * bw / bh)) // 2 * 2
    if cw == fw:
        ch = min(fh, int(cw * bh / bw)) // 2 * 2
    cx = max(0, min(fw - cw, int(fw * F["cx"] - cw / 2)))
    cy = max(0, min(fh - ch, int(fh * F["cy"] - ch * 0.42)))
    ps = int(min(fw, fh) * F["pip_side"]) // 2 * 2
    px = max(0, min(fw - ps, int(fw * F["cx"] - ps / 2)))
    py = max(0, min(fh - ps, int(fh * F["cy"] - ps * 0.45)))
    # talk: a 16:9 window around the face, zoomed in by talk_zoom, filling the frame
    th = int(min(fh, fw * 9 / 16) / F["talk_zoom"]) // 2 * 2
    tw = int(th * 16 / 9) // 2 * 2
    tx = max(0, min(fw - tw, int(fw * F["cx"] - tw / 2)))
    ty = max(0, min(fh - th, int(fh * F["cy"] - th * 0.5)))
    P = marks["pip"]
    pw = int(round(P["w"]))
    mask(work / "m_full.png", bw, bh, 40)
    mask(work / "m_pip.png", pw, pw, 32)
    on = lambda ms, pad=0: "+".join(f"between(t,{m['start']:.3f},{m['end'] - pad:.3f})" for m in ms) or "0"
    fc = (f"[1:v]split=3[f1][f2][f3];[0:v]split=2[m0][m1];"
          f"[f3]crop={tw}:{th}:{tx}:{ty},scale=1920:1080,setsar=1[tf];"
          f"[m1]colorkey=0x00FF00:0.3:0.06,despill=type=green[mk];[tf][mk]overlay=format=auto[talk];"
          f"[m0][talk]overlay=0:0:enable='{on(talk)}'[v0];"
          f"[f1]crop={cw}:{ch}:{cx}:{cy},scale={bw}:{bh},format=rgba[fc];[2:v]format=gray[mf];[fc][mf]alphamerge[full];"
          f"[f2]crop={ps}:{ps}:{px}:{py},scale={pw}:{pw},format=rgba[pc];[3:v]format=gray[mp];[pc][mp]alphamerge[pip];"
          f"[v0][full]overlay={int(round(box['x']))}:{int(round(box['y']))}:enable='{on(full, 0.3)}'[v1];"
          f"[v1][pip]overlay={int(round(P['x']))}:{int(round(P['y']))}:enable='{on(pip)}'[v];"
          f"[1:a]loudnorm=I={spec['output']['loudness_lufs']}:TP=-1.5:LRA=11,aresample=48000[a]")
    final = out.with_suffix(".mp4")
    run(["ffmpeg", "-v", "error", "-y", "-i", str(motion), "-i", str(face), "-loop", "1", "-i", str(work / "m_full.png"),
         "-loop", "1", "-i", str(work / "m_pip.png"), "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
         "-t", f"{marks['duration']:.3f}", "-movflags", "+faststart", str(final)])

    dur = sc.probe(str(final))[2]
    face_s = {k: round(sum(m["end"] - m["start"] for m in marks["marks"] if m["face"] == k), 1) for k in ("full", "pip", "talk", "none")}
    report = {"out": str(final), "duration_s": round(dur, 1), "scenes": len(marks["marks"]), "face_seconds": face_s,
              "full_face_share": round((face_s["full"] + face_s["talk"]) / dur, 2), "pieces_cut": len(pieces)}
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
