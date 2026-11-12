#!/usr/bin/env python3
"""Local transcript with timestamps for a reference video. No cloud calls.

  python3 transcribe.py <media file> <local faster-whisper model folder>

Prints JSON: {"language": "en", "segments": [{"start": 0.0, "end": 2.1, "text": "..."}]}
The model must already be on disk (see setup_whisper.py). Nothing is downloaded here.
"""
import json
import sys


def main():
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    from faster_whisper import WhisperModel

    model = WhisperModel(sys.argv[2], device="cpu", compute_type="int8", local_files_only=True)
    segments, info = model.transcribe(sys.argv[1], vad_filter=True)
    out = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments]
    print(json.dumps({"language": info.language, "segments": out}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
