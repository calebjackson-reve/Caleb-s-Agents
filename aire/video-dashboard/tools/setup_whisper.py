#!/usr/bin/env python3
"""One-time, optional setup for local transcripts. Run by hand; the app never runs this.

  pip install --user faster-whisper
  python3 tools/setup_whisper.py [model] [models folder]

Downloads a faster-whisper model (default "base") into the models folder
(default <storage root>/_models/whisper/<model>). This is the only step that uses the
network. After it, breakdowns transcribe fully offline.
"""
import os
import sys


def main():
    model = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VX_WHISPER_MODEL", "base")
    root = os.environ.get("VX_STORAGE_ROOT", "/workspace/video")
    folder = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("VX_WHISPER_DIR", os.path.join(root, "_models", "whisper"))
    try:
        from faster_whisper import download_model
    except ImportError:
        print("faster-whisper is not installed. Run: pip install --user faster-whisper", file=sys.stderr)
        return 1
    target = os.path.join(folder, model)
    os.makedirs(target, exist_ok=True)
    download_model(model, output_dir=target)
    print(f"Model {model} saved to {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
