#!/usr/bin/env python3
"""Cut a raw Skool tutorial take into a finished video, to the numbers in a style spec.

    python3 skool_cut.py OUT.mp4 face:open.mov screen:prompt.mov face:close.mov \
        [--spec specs/skool-house-style.json] [--keywords "Claude,bio,prompt"] [--text full]

Clips play in the order given. Each one is a face take (iPhone, talking to the lens) or a
screen recording with your voice over it.

What it does to each clip:
  1. Finds every word (faster-whisper on the Mac, pocketsphinx as a fallback, silence
     detection if neither is installed).
  2. Drops pauses longer than the spec allows and any line you restarted (keeps the last take).
     Say the mistake phrase ("Fuck that, Caleb") and the sentence before it is cut too, then
     the finished video is transcribed again to prove the phrase is gone.
  3. Face clips: alternates wide and punch-in at the jump cuts so they read as camera
     changes, and forces a change if one framing runs past max_shot_s.
  4. Screen clips: finds where the screen is changing (typing, a reply streaming in) and
     zooms there, 125% to 200%, re-aimed every chunk_s seconds. A still screen stays full.
  5. Text: keyword pills when a --keywords word is spoken, or running captions (--text full).
  6. Joins it all at 1080p30, normalizes loudness, and writes OUT.mp4 plus OUT.edl.json.
  7. Measures OUT.mp4 with style_probe.py and prints it next to the spec targets.

Originals are only read. Work files go next to OUT in OUT.work/.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
FILLERS = {"um", "uh", "erm", "uhm", "hmm", "mm"}


# ---------- small helpers ----------

def run(cmd, check=True):
    p = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
    if check and p.returncode != 0:
        sys.exit(f"command failed: {' '.join(map(str, cmd))}\n{p.stderr[-2000:]}")
    return p


def probe(path):
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
               "stream=width,height:format=duration", "-of", "json", path]).stdout
    d = json.loads(out)
    s = d["streams"][0]
    return s["width"], s["height"], float(d["format"]["duration"])


def norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())


def log(msg):
    print(f"[cut] {msg}", file=sys.stderr, flush=True)


# ---------- 1. words ----------

def extract_wav(src, dst):
    run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", dst])


def words_whisper(wav, model_name):
    from faster_whisper import WhisperModel
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    with wave.open(str(wav)) as f:  # hand it samples, so PyAV version quirks don't matter
        audio = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32) / 32768
    # vad_filter keeps whisper from inventing "thanks for watching" in the quiet stretches
    segs, _ = model.transcribe(audio, language="en", word_timestamps=True, beam_size=1,
                               condition_on_previous_text=False, vad_filter=True)
    return [{"w": w.word.strip(), "s": w.start, "e": w.end} for s in segs for w in (s.words or [])]


def words_sphinx(wav):
    from pocketsphinx import Decoder
    dec = Decoder(samprate=16000)
    with wave.open(str(wav)) as f:
        data = f.readframes(f.getnframes())
    dec.start_utt()
    dec.process_raw(data, full_utt=True)
    dec.end_utt()
    out = []
    for seg in dec.seg():
        w = re.sub(r"\(\d+\)$", "", seg.word)
        if w.startswith("<") or w.startswith("[") or w in ("<s>", "</s>", "<sil>"):
            continue
        out.append({"w": w, "s": seg.start_frame / 100, "e": (seg.end_frame + 1) / 100})
    return out


def words_silence(src, total):
    """No speech model: treat each non-silent stretch as one 'word'."""
    err = run(["ffmpeg", "-hide_banner", "-i", src, "-vn", "-af", "silencedetect=n=-35dB:d=0.3",
               "-f", "null", "-"], check=False).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", err)]
    edges, t = [], 0.0
    for s, e in zip(starts, ends + [total]):
        if s > t:
            edges.append({"w": "~", "s": t, "e": s})
        t = e
    if t < total:
        edges.append({"w": "~", "s": t, "e": total})
    return edges


def get_words(src, total, work, engine, model):
    cache = work / (Path(src).stem + f".{engine}.words.json")
    if cache.exists():
        saved = json.loads(cache.read_text())
        return saved["words"], saved["engine"]
    wav = work / (Path(src).stem + ".wav")
    extract_wav(src, wav)
    used = engine
    words = None
    if engine in ("auto", "whisper"):
        try:
            words, used = words_whisper(wav, model), "whisper"
        except Exception as exc:  # model not on this machine, or package missing
            if engine == "whisper":
                raise
            log(f"faster-whisper unavailable ({type(exc).__name__}), trying pocketsphinx")
    if words is None and engine in ("auto", "sphinx"):
        try:
            words, used = words_sphinx(wav), "sphinx"
        except Exception as exc:
            log(f"pocketsphinx unavailable ({type(exc).__name__}), using silence detection")
    if words is None:
        words, used = words_silence(src, total), "silence"
    cache.write_text(json.dumps({"engine": used, "words": words}))
    return words, used


# ---------- 2. keep ranges ----------

def phrases(words, gap):
    out, cur = [], []
    for w in words:
        if cur and w["s"] - cur[-1]["e"] > gap:
            out.append(cur)
            cur = []
        cur.append(w)
    if cur:
        out.append(cur)
    return out


def same_start(p, q, n):
    """True when phrase q opens like phrase p. Fuzzy, so one misheard word still matches."""
    from difflib import SequenceMatcher
    a = [norm(w["w"]) for w in p[: n + 2]]
    b = [norm(w["w"]) for w in q[: len(a)]]
    if len(a) < n or len(b) < n:
        return False
    if a[:n] == b[:n]:
        return True
    return SequenceMatcher(None, " ".join(a), " ".join(b)).ratio() >= 0.75


def drop_retakes(ph, n, look):
    """A phrase that starts over within the next few phrases was a false start. Keep the last."""
    keep = []
    for i, p in enumerate(ph):
        restarted = any(same_start(p, q, n) for q in ph[i + 1: i + 1 + look])
        if restarted:
            log(f"retake dropped: \"{' '.join(w['w'] for w in p)[:70]}\"")
        else:
            keep.append(p)
    return keep


def find_mistakes(words, phrase):
    """Start index of every spot where the mistake phrase was said. Fuzzy, because whisper
    writes it as "F*** that, Kaleb" or "fuck that Caleb" depending on the take."""
    from difflib import SequenceMatcher
    target = " ".join(norm(t) for t in phrase.split())
    n = len(phrase.split())
    hits, i = [], 0
    while i + n <= len(words):
        # whisper bleeps swears ("F***"), so a starred word counts as the word it hides
        got = " ".join(t if "*" in w["w"] and norm(w["w"])[:1] == t[:1] else norm(w["w"])
                       for w, t in zip(words[i: i + n], target.split()))
        # the first word has to sound like the swear ("fuck", "F***", or whisper's "buck"), so
        # "but that, Caleb" in a normal sentence is safe
        first = got.split(" ", 1)[0]
        swear = first[:1] == target[:1] or re.search(r"uc?k$", first)
        if swear and SequenceMatcher(None, target, got).ratio() >= 0.75:
            hits.append(i)
            i += n
        else:
            i += 1
    return hits


def sentence_start(words, j, gap):
    """Index of the first word of the sentence word j sits in (a full stop or a pause ends one)."""
    while j > 0 and not (words[j - 1]["w"].rstrip().endswith((".", "?", "!")) or
                         words[j]["s"] - words[j - 1]["e"] > gap):
        j -= 1
    return j


def cut_mistakes(words, spec):
    """Drop each mistake phrase plus the sentence said right before it."""
    M = spec.get("mistake")
    if not M:
        return words
    n = len(M["phrase"].split())
    drop = set()
    for i in find_mistakes(words, M["phrase"]):
        k = sentence_start(words, i - 1, spec["retakes"]["phrase_gap_s"]) if i > 0 else 0
        # If the redo picks up partway through that sentence ("...fair housing on everything.
        # Fuck that, Caleb. So fair housing on everything."), only cut back to where it picks up.
        after = [norm(w["w"]) for w in words[i + n: i + n + 6] if norm(w["w"]) not in FILLERS | {"so", "and"}][:2]
        found = False
        if len(after) == 2:
            for j in range(i - 2, k - 1, -1):
                if [norm(words[j]["w"]), norm(words[j + 1]["w"])] == after:
                    while j > k and norm(words[j - 1]["w"]) in FILLERS | {"so", "and"}:
                        j -= 1
                    k, found = j, True
                    break
        # Or the redo reworded the start but repeats a run of 3 words ("this is going to be even more
        # beneficial, and... Fuck that, Caleb. This will be even more beneficial"): cut back to the
        # start of the clause that holds that run, so the good clauses before it stay.
        redo = [norm(w["w"]) for w in words[i + n: i + n + 8]]
        runs = {tuple(redo[a:a + 3]) for a in range(len(redo) - 2)}
        if not found:
            for j in range(i - 3, k - 1, -1):
                if tuple(norm(words[x]["w"]) for x in range(j, j + 3)) in runs:
                    while j > k and not re.search(r"[,.?!]$", words[j - 1]["w"]):
                        j -= 1
                    k = j
                    break
        log(f"mistake phrase at {words[i]['s']:.1f}s, cut back to {words[k]['s']:.1f}s: "
            f"\"{' '.join(w['w'] for w in words[k:i])[:70]}\"")
        drop.update(range(k, i + n))
    return [w for j, w in enumerate(words) if j not in drop]


def keep_ranges(words, total, spec, engine):
    P, R = spec["pauses"], spec["retakes"]
    if engine in ("whisper", "sphinx"):
        words = cut_mistakes(words, spec)
    words = [w for w in words if norm(w["w"]) not in FILLERS and w["e"] > w["s"]]
    if engine in ("whisper", "sphinx"):
        words = [w for p in drop_retakes(phrases(words, R["phrase_gap_s"]), R["match_words"],
                                           R["look_ahead_phrases"]) for w in p]
    ranges = []
    for w in words:
        s = max(0.0, w["s"] - P["pad_before_s"])
        e = min(total, w["e"] + P["pad_after_s"])
        if ranges and s - ranges[-1][1] <= P["merge_gap_s"]:
            ranges[-1][1] = max(ranges[-1][1], e)
        else:
            ranges.append([s, e])
    return [r for r in ranges if r[1] - r[0] >= 0.25], words


# ---------- 3 and 4. framing ----------

def face_box(src, t, W, H):
    """Biggest face in the frame at time t, in source pixels, or None."""
    import cv2
    h = int(640 * H / W) // 2 * 2
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(src), "-frames:v", "1",
                          "-vf", f"scale=640:{h}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         capture_output=True).stdout
    img = np.frombuffer(raw, np.uint8)
    if img.size < 640 * h:
        return None
    img = img[: 640 * h].reshape(h, 640)
    if not hasattr(cv2, "CascadeClassifier"):  # OpenCV 5 moved it out. Punch in on the center instead.
        log("OpenCV has no face finder here, punch-ins aim at the center")
        return None
    cas = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cas.detectMultiScale(img, 1.1, 6, minSize=(30, 30))
    if not len(faces):
        return None
    x, y, w, hh = max(faces, key=lambda f: f[2] * f[3])
    k = W / 640
    return x * k, y * k, w * k, hh * k


def crop_for(W, H, scale, cx, cy):
    """A 16:9 crop of size frame/scale centered near (cx, cy), kept inside the frame."""
    cw = int(W / scale) // 2 * 2
    ch = int(cw * 9 / 16) // 2 * 2
    if ch > H:
        ch = H // 2 * 2
        cw = int(ch * 16 / 9) // 2 * 2
    x = int(min(max(cx - cw / 2, 0), W - cw))
    y = int(min(max(cy - ch / 2, 0), H - ch))
    return cw, ch, x, y


def face_shots(src, ranges, W, H, spec, out_t0):
    """Alternate wide and punch-in at jump cuts, and split anything longer than max_shot_s."""
    F = spec["face"]
    fb = face_box(src, (ranges[0][0] + ranges[0][1]) / 2, W, H) if ranges else None
    if fb:
        fx = fb[0] + fb[2] / 2
        eye_y = fb[1] + fb[3] * 0.4
        cy_punch = eye_y + (0.5 - F["eye_line"]) * (H / F["punch_scale"])
    else:
        fx, cy_punch = W / 2, H * 0.45
    shots, punch, run_len, t_out = [], False, 0.0, out_t0
    for s, e in ranges:
        # a jump cut happened before this range, switch framing if the last one ran long enough
        if shots and run_len >= F["min_shot_s"]:
            punch, run_len = not punch, 0.0
        cur = s
        while cur < e - 0.05:
            if cur > s or F["max_shot_s"] - run_len <= 0.5:  # split inside one piece: change framing
                punch, run_len = not punch, 0.0
            end = min(e, cur + F["max_shot_s"] - run_len)
            if e - end < F["min_shot_s"]:  # never leave a sliver of a shot behind
                left = e - cur
                end = cur + left / 2 if left > 2 * F["min_shot_s"] and left > F["max_shot_s"] else e
            scale = F["punch_scale"] if punch else 1.0
            crop = crop_for(W, H, scale, fx, cy_punch if punch else H / 2)
            shots.append({"src": src, "kind": "face", "in": round(cur, 3), "out": round(end, 3),
                          "crop": crop, "zoom": scale, "t": round(t_out, 3)})
            t_out += end - cur
            run_len += end - cur
            cur = end
    return shots, t_out


def activity_boxes(src, W, H, fps=2):
    """Per-sample bounding box of what changed on screen since the last sample."""
    import cv2
    w, h = 480, int(480 * H / W) // 2 * 2
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-vf", f"fps={fps},scale={w}:{h}",
                             "-f", "rawvideo", "-pix_fmt", "gray", "-"], stdout=subprocess.PIPE)
    prev, boxes, i = None, [], 0
    kernel = np.ones((9, 9), np.uint8)
    while True:
        buf = proc.stdout.read(w * h)
        if len(buf) < w * h:
            break
        img = np.frombuffer(buf, np.uint8).reshape(h, w)
        box = None
        if prev is not None:
            mask = (cv2.absdiff(img, prev) > 22).astype(np.uint8)
            mask = cv2.dilate(mask, kernel)
            if mask.sum() > 40:
                ys, xs = np.nonzero(mask)
                k = W / w
                box = (xs.min() * k, ys.min() * k, (xs.max() + 1) * k, (ys.max() + 1) * k, float(mask.sum()))
        boxes.append((i / fps, box))
        prev = img
        i += 1
    proc.wait()
    return boxes


def screen_shots(src, ranges, W, H, spec, out_t0):
    S = spec["screen"]
    boxes = activity_boxes(src, W, H)
    shots, t_out = [], out_t0
    for s, e in ranges:
        cur = s
        while cur < e - 0.05:
            end = min(e, cur + S["chunk_s"])
            if e - end < 1.5:  # don't leave a sliver
                end = e
            hits = [b for t, b in boxes if cur - 0.5 <= t <= end and b]
            scale, cx, cy = 1.0, W / 2, H / 2
            if hits:
                x0 = np.percentile([b[0] for b in hits], 15)
                y0 = np.percentile([b[1] for b in hits], 15)
                x1 = np.percentile([b[2] for b in hits], 85)
                y1 = np.percentile([b[3] for b in hits], 85)
                bw, bh = (x1 - x0) * (1 + 2 * S["activity_pad"]), (y1 - y0) * (1 + 2 * S["activity_pad"])
                need = max(bw / W, bh / H, 1e-6)
                scale = min(S["zoom_max"], max(S["zoom_min"], 1 / need))
                if scale < S["zoom_floor"]:
                    scale = 1.0
                cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            crop = crop_for(W, H, scale, cx, cy)
            shots.append({"src": src, "kind": "screen", "in": round(cur, 3), "out": round(end, 3),
                          "crop": crop, "zoom": round(scale, 2), "t": round(t_out, 3)})
            t_out += end - cur
            cur = end
    return shots, t_out


# ---------- 5. text ----------

def font(size, bold=True):
    from PIL import ImageFont
    for p in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/Library/Fonts/Arial Bold.ttf",
              "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def pill_png(text, path, out_w):
    from PIL import Image, ImageDraw
    f = font(38)
    text = text.upper()
    l, t, r, b = f.getbbox(text)
    pw, ph = r - l + 64, b - t + 34
    img = Image.new("RGBA", (pw + 8, ph + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((4, 4, pw + 4, ph + 4), radius=ph // 2, fill=(12, 16, 20, 225),
                        outline=(78, 214, 196, 255), width=3)
    d.text((4 + 32 - l, 4 + 17 - t), text, font=f, fill=(255, 255, 255, 255))
    img.save(path)
    return ((out_w - img.width) // 2, None)


def caption_png(text, path, out_w):
    from PIL import Image, ImageDraw
    f = font(54)
    l, t, r, b = f.getbbox(text)
    img = Image.new("RGBA", (r - l + 40, b - t + 30), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.text((20 - l, 15 - t), text, font=f, fill=(255, 255, 255, 255), stroke_width=5, stroke_fill=(0, 0, 0, 230))
    img.save(path)
    return ((out_w - img.width) // 2, None)


def text_events(clip_words, shots, spec, keywords, mode):
    """Map spoken words to output time, then make pills or captions."""
    def to_out(src, t):
        for sh in shots:
            if sh["src"] == src and sh["in"] <= t < sh["out"]:
                return sh["t"] + (t - sh["in"])
        return None

    T = spec["text"]
    events = []
    if mode == "keywords" and keywords:
        keys = {norm(k): k for k in keywords}
        last = {}
        for src, words in clip_words:
            for w in words:
                k = norm(w["w"])
                t = to_out(src, w["s"])
                if k in keys and t is not None and t - last.get(k, -99) > 20:
                    events.append({"kind": "pill", "text": keys[k], "start": t, "end": t + T["pill_hold_s"]})
                    last[k] = t
    elif mode == "full":
        for src, words in clip_words:
            mapped = [(to_out(src, w["s"]), to_out(src, w["e"] - 0.01), w["w"]) for w in words]
            mapped = [m for m in mapped if m[0] is not None]
            for i in range(0, len(mapped), T["caption_words"]):
                chunk = mapped[i: i + T["caption_words"]]
                end = chunk[-1][1] if chunk[-1][1] is not None else chunk[-1][0] + 0.4
                events.append({"kind": "caption", "text": " ".join(c[2] for c in chunk),
                               "start": chunk[0][0], "end": max(end, chunk[0][0] + 0.5)})
    # pills never overlap each other
    events.sort(key=lambda e: e["start"])
    for a, b in zip(events, events[1:]):
        a["end"] = min(a["end"], b["start"])
    return [e for e in events if e["end"] - e["start"] > 0.2]


# ---------- 6. render ----------

def render(shots, events, spec, out, work):
    O = spec["output"]
    ow, oh, fps = O["width"], O["height"], O["fps"]
    for i, e in enumerate(events):
        png = work / f"text_{i:03d}.png"
        (pill_png if e["kind"] == "pill" else caption_png)(e["text"], png, ow)
        e["png"] = str(png)
    parts = []
    for i, sh in enumerate(shots):
        part = work / f"shot_{i:04d}.mp4"
        dur = sh["out"] - sh["in"]
        cw, ch, x, y = sh["crop"]
        fc = [f"[0:v]crop={cw}:{ch}:{x}:{y},scale={ow}:{oh}:flags=lanczos,fps={fps},setsar=1,format=yuv420p[v0]"]
        inputs = ["-ss", f"{sh['in']:.3f}", "-t", f"{dur:.3f}", "-i", sh["src"]]
        last = "v0"
        mine = [e for e in events if e["start"] < sh["t"] + dur and e["end"] > sh["t"]]
        for j, e in enumerate(mine):
            inputs += ["-i", e["png"]]
            a, b = max(0, e["start"] - sh["t"]), min(dur, e["end"] - sh["t"])
            ypos = "H-h-90" if e["kind"] == "pill" else "H-h-70"
            fc.append(f"[{last}][{j + 1}:v]overlay=x=(W-w)/2:y={ypos}:enable='between(t,{a:.3f},{b:.3f})'[v{j + 1}]")
            last = f"v{j + 1}"
        fade = min(0.012, dur / 4)
        fc.append(f"[0:a]aresample=48000,afade=t=in:d={fade},afade=t=out:st={dur - fade:.3f}:d={fade}[a]")
        run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
             "-map", f"[{last}]", "-map", "[a]", "-t", f"{dur:.3f}",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "192k",
             "-ar", "48000", "-ac", "2", part])
        parts.append(part)
    lst = work / "parts.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
    joined = work / "joined.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    run(["ffmpeg", "-v", "error", "-y", "-i", joined, "-c:v", "copy",
         "-af", soft_level(joined, O), "-ar", "48000",
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out])


def soft_level(src, out_spec):
    """Two-pass loudnorm in linear mode: one gain change for the whole take, so his voice keeps its
    natural rise and fall instead of being squashed, plus a gentle cut to the top end."""
    O = out_spec
    tone = O.get("voice_tone", "anull")
    target = f"I={O['loudness_lufs']}:TP=-3:LRA=20"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af", f"{tone},loudnorm={target}:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True)
    m = json.loads(re.search(r"\{[^{}]*\}\s*$", r.stderr).group(0))
    return (f"{tone},loudnorm={target}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")


# ---------- 7. check ----------

def check(out, spec, work, model=None):
    sys.path.insert(0, str(HERE))
    import style_probe as sp
    total = sp.duration(out)
    cuts = sp.hard_cuts(out)
    shots = [b - a for a, b in zip([0.0] + cuts, cuts + [total])]
    wav = work / "final.wav"
    extract_wav(out, wav)
    gaps = [w for w in words_silence(str(out), total)]
    silences = [b["s"] - a["e"] for a, b in zip(gaps, gaps[1:])]
    got = {
        "duration_s": round(total, 1),
        "cuts_per_min": round(len(cuts) / (total / 60), 1),
        "shot_median_s": round(float(np.median(shots)), 2),
        "longest_silence_s": round(max(silences), 2) if silences else 0.0,
        "loudness": sp.loudness(out),
    }
    if spec.get("mistake") and model:
        try:
            heard = words_whisper(wav, model)
            got["mistake_phrase_left"] = len(find_mistakes(heard, spec["mistake"]["phrase"]))
        except Exception as exc:
            log(f"could not re-transcribe the output to check the mistake phrase ({type(exc).__name__})")
    T = spec["targets"]
    verdict = {
        "cuts_per_min": T["cuts_per_min"][0] <= got["cuts_per_min"] <= T["cuts_per_min"][1],
        "shot_median_s": T["shot_median_s"][0] <= got["shot_median_s"] <= T["shot_median_s"][1],
        "longest_silence_s": got["longest_silence_s"] <= T["longest_gap_s"],
    }
    if "mistake_phrase_left" in got:
        verdict["mistake_phrase_gone"] = got["mistake_phrase_left"] == 0
    return got, verdict


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("clips", nargs="+", help="face:FILE or screen:FILE, in play order")
    ap.add_argument("--spec", default=str(HERE / "specs" / "skool-house-style.json"))
    ap.add_argument("--keywords", default="", help="comma list of words that get a pill when spoken")
    ap.add_argument("--text", choices=["keywords", "full", "none"], help="overrides the spec text mode")
    ap.add_argument("--engine", choices=["auto", "whisper", "sphinx", "silence"], default="auto")
    ap.add_argument("--model", default="small.en", help="faster-whisper model already on this machine")
    a = ap.parse_args()

    spec = json.loads(Path(a.spec).read_text())
    out = Path(a.out).resolve()
    work = out.with_suffix(".work")
    work.mkdir(parents=True, exist_ok=True)
    keywords = [k.strip() for k in a.keywords.split(",") if k.strip()]
    mode = a.text or spec["text"]["mode"]

    all_shots, clip_words, t, report = [], [], 0.0, []
    for item in a.clips:
        kind, _, path = item.partition(":")
        path = str(Path(path).expanduser())
        if kind not in ("face", "screen") or not Path(path).exists():
            sys.exit(f"bad clip {item!r}: use face:FILE or screen:FILE with a real file")
        W, H, total = probe(path)
        words, engine = get_words(path, total, work, a.engine, a.model)
        ranges, kept_words = keep_ranges(words, total, spec, engine)
        kept = sum(e - s for s, e in ranges)
        log(f"{kind} {Path(path).name}: {total:.1f}s raw, {kept:.1f}s kept, {len(ranges)} pieces, words by {engine}")
        maker = face_shots if kind == "face" else screen_shots
        shots, t = maker(path, ranges, W, H, spec, t)
        all_shots += shots
        clip_words.append((path, kept_words))
        report.append({"clip": path, "kind": kind, "engine": engine, "raw_s": round(total, 2),
                       "kept_s": round(kept, 2), "pieces": len(ranges)})

    events = text_events(clip_words, all_shots, spec, keywords, mode)
    log(f"{len(all_shots)} shots, {len(events)} text events, rendering")
    render(all_shots, events, spec, out, work)
    got, verdict = check(out, spec, work, a.model if a.engine in ("auto", "whisper") else None)
    edl = {"spec": spec["name"], "clips": report, "shots": all_shots,
           "text": [{k: v for k, v in e.items() if k != "png"} for e in events],
           "measured_output": got, "meets_targets": verdict}
    out.with_suffix(".edl.json").write_text(json.dumps(edl, indent=1))
    print(json.dumps({"out": str(out), "clips": report, "measured_output": got, "meets_targets": verdict}, indent=1))


if __name__ == "__main__":
    main()
