#!/usr/bin/env python3
"""Find the real beat times in a song, and move a list of cut times onto them.

  python3 aire/video/beats.py song.m4a                          # prints tempo, writes song.beats.json
  python3 aire/video/beats.py song.m4a --cuts teardown.json     # also snaps the reference's cuts to the beats

With --cuts it adds "cuts" (each cut moved to the nearest beat, rounded to a 30 fps frame) and
"shot_lengths" to the json. Use those lengths in the cut list. A tempo number alone drifts, so
each beat is the strongest sound hit near a steady grid fitted to the whole song.
Needs ffmpeg and numpy.
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np


def onsets(path, sr=22050, hop=110, win=1024):
    a = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                                     capture_output=True).stdout, dtype=np.float32)
    n = len(a) // hop
    fr = np.lib.stride_tricks.sliding_window_view(np.pad(a, (win // 2, win // 2)), win)[::hop][:n] * np.hanning(win)
    spec = np.abs(np.fft.rfft(fr, axis=1))
    flux = np.maximum(np.diff(spec, axis=0, prepend=spec[:1]), 0)[:, :60].sum(axis=1)  # low band: kick and snare
    flux /= flux.max() or 1
    t = np.arange(n) * hop / sr
    pk = [i for i in range(2, n - 2) if flux[i] > 0.12 and flux[i] == flux[max(0, i - 18):i + 19].max()]
    return t[pk], len(a) / sr


def beat_grid(hits, length):
    env_lag = np.diff(hits)
    guess = float(np.median(env_lag[(env_lag > 0.25) & (env_lag < 1.0)])) if len(hits) > 4 else 0.5
    best = None
    for p in np.arange(guess * 0.5, guess * 2.05, 0.00025):      # try half and double time too
        if not 0.3 <= p <= 0.75:
            continue
        for ph in np.arange(0, p, 0.005):
            miss = np.mean([np.abs(hits - (ph + k * p)).min() for k in range(int((length - ph) / p))])
            if best is None or miss < best[0]:
                best = (miss, p, ph)
    _, p, ph = best
    beats = []
    for k in range(int((length - ph) / p) + 1):
        g = ph + k * p
        j = np.abs(hits - g).argmin()
        beats.append(float(hits[j]) if abs(hits[j] - g) < 0.07 else float(g))
    return np.array(beats), p


def main():
    song = Path(sys.argv[1])
    hits, length = onsets(song)
    beats, period = beat_grid(hits, length)
    out = {"song": song.name, "seconds": round(length, 3), "bpm": round(60 / period, 1), "beats": [round(b, 3) for b in beats]}
    if "--cuts" in sys.argv:
        src = json.loads(Path(sys.argv[sys.argv.index("--cuts") + 1]).read_text())
        cuts = np.array(src["cut_times"] if isinstance(src, dict) else src, dtype=float)
        snap = []
        for c in cuts:
            near_beat = beats[np.abs(beats - c).argmin()]
            # a quick flash between beats keeps the nearest sound hit, everything else goes to a beat
            use = near_beat if abs(near_beat - c) <= 0.25 and (not snap or near_beat - snap[-1] > 0.3) else hits[np.abs(hits - c).argmin()]
            snap.append(round(round(float(use) * 30) / 30, 4))
        for i in range(1, len(snap)):
            if snap[i] <= snap[i - 1]:
                snap[i] = round(snap[i - 1] + 4 / 30, 4)
        end = round(int(length * 30) / 30, 4)
        out["cuts"] = snap
        out["shot_lengths"] = [round(b - a, 4) for a, b in zip([0] + snap, snap + [end])]
        on = sum(1 for c in snap if np.abs(beats - c).min() <= 0.02)
        print(f"{on} of {len(snap)} cuts sit on a beat, biggest move {np.abs(np.array(snap) - cuts).max():.2f} s")
    dest = song.with_suffix(".beats.json")
    dest.write_text(json.dumps(out, indent=1))
    print(f"{out['bpm']} beats a minute, {len(beats)} beats, wrote {dest}")


if __name__ == "__main__":
    main()
