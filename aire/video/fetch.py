#!/usr/bin/env python3
"""Download footage from a WeTransfer link into a job folder and unzip it.

  python3 aire/video/fetch.py "<wetransfer link>" job

Writes job/raw/ with every video in the transfer. No size limit. Picks up where it left off if it is cut short.
Uses the same request the WeTransfer page makes. If WeTransfer changes that, download by hand and unzip into job/raw.
Needs curl. Links normally stop working about a week after they are sent.
"""
import json, re, subprocess, sys, zipfile
from pathlib import Path

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"
VIDEO = {".mov", ".mp4", ".m4v", ".mts"}


def direct_link(url):
    if "we.tl/" in url:  # short link, follow it to the long one
        url = subprocess.run(["curl", "-sS", "-L", "-o", "/dev/null", "-w", "%{url_effective}", "-A", UA, url],
                             capture_output=True, text=True).stdout
    m = re.search(r"/downloads/([0-9a-f]+)/([0-9a-f]+)", url)
    if not m:
        sys.exit("That does not look like a WeTransfer download link.")
    r = subprocess.run(["curl", "-sS", "-X", "POST", f"https://wetransfer.com/api/v4/transfers/{m.group(1)}/download",
                        "-H", "Content-Type: application/json", "-A", UA,
                        "-d", json.dumps({"security_hash": m.group(2), "intent": "entire_transfer"})], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)["direct_link"]
    except Exception:
        sys.exit("WeTransfer would not give a download. The link may have expired.\n" + r.stdout[:200])


def main():
    url, job = sys.argv[1], Path(sys.argv[2]).resolve()
    raw = job / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    if "--check" in sys.argv:
        head = subprocess.run(["curl", "-sS", "-I", "-L", "-A", UA, direct_link(url)], capture_output=True, text=True).stdout
        size = re.findall(r"content-length: (\d+)", head, re.I)
        print(f"Link is live, {int(size[-1]) / 1e9:.2f} GB" if size else "Link answered but gave no size")
        return
    blob = job / "transfer.download"
    subprocess.run(["curl", "-L", "--retry", "5", "--retry-delay", "5", "-C", "-", "-A", UA, "-o", str(blob), direct_link(url)], check=True)
    if zipfile.is_zipfile(blob):
        with zipfile.ZipFile(blob) as z:
            for n in z.namelist():
                name = Path(n).name
                if Path(n).suffix.lower() in VIDEO and not name.startswith("."):
                    (raw / name).write_bytes(z.read(n))
        blob.unlink()
    else:  # a transfer with one file arrives as that file
        blob.rename(raw / "clip.mov")
    clips = sorted(raw.iterdir())
    print(f"{len(clips)} clips, {sum(c.stat().st_size for c in clips) / 1e9:.2f} GB in {raw}")


if __name__ == "__main__":
    main()
