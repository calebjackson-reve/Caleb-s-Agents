#!/usr/bin/env python3
"""Make a small copy of every raw clip so an agent on another computer can cut from them.

  python3 aire/video/proxies.py job/raw            # writes job/proxies/<same file name>

Each proxy keeps the clip's name, length and frame timing, at 540 px on the short side,
so a cut list written against the proxies works on the raw clips unchanged.
Any proxy over 9.5 MB is reported, because the Google Drive connector stops at 10 MB.
"""
import subprocess, sys
from pathlib import Path

VIDEO = {".mov", ".mp4", ".m4v", ".mts", ".avi"}


def main():
    raw = Path(sys.argv[1]).resolve()
    out = raw.parent / "proxies"
    out.mkdir(exist_ok=True)
    clips = sorted(p for p in raw.iterdir() if p.suffix.lower() in VIDEO)
    total, big = 0, []
    for p in clips:
        dest = out / p.name
        if not dest.exists() or dest.stat().st_mtime < p.stat().st_mtime:
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(p),
                            "-vf", "scale='if(gt(iw,ih),-2,540)':'if(gt(iw,ih),540,-2)'",
                            "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-maxrate", "2500k", "-bufsize", "5000k",
                            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-f", "mov", str(dest)], check=True)
        mb = dest.stat().st_size / 1e6
        total += mb
        if mb > 9.5:
            big.append(p.name)
        print(f"{p.name}  {p.stat().st_size / 1e6:6.1f} MB -> {mb:5.2f} MB")
    print(f"{len(clips)} clips, {total:.1f} MB of proxies in {out}")
    if big:
        print("Over 9.5 MB, split or lower quality before uploading:", ", ".join(big))


if __name__ == "__main__":
    main()
