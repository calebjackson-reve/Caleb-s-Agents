#!/bin/sh
# remotion-reel ingest for one take (PHASE-0 step 6, then every reel).
#   sh scripts/ingest.sh public/recordings/test.MOV
# 1. transcode to H.264 mp4 at 30fps and confirm the frame count
# 2. transcribe once to <name>.words.json (small model)
# 3. detect cuts at scene 0.05
# 4. pull three grid frames (25, 50, 75 percent) for measuring the face rows
# Writes everything next to the take and prints a summary.
set -e
cd "$(dirname "$0")/.."
SRC="$1"
[ -f "$SRC" ] || { echo "usage: sh scripts/ingest.sh public/recordings/<take>"; exit 1; }
DIR=$(dirname "$SRC")
NAME=$(basename "$SRC" | sed 's/\.[^.]*$//')
MP4="$DIR/$NAME.mp4"

echo "== probe"
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration -of default=nw=1 "$SRC"

if [ "$SRC" != "$MP4" ]; then
  echo "== transcode -> $MP4"
  # Camera files often start the audio a little after the video (153 ms on
  # the first test take). Pad it to start at zero so the transcript, the
  # video and verify-audio.py all share one clock.
  ffmpeg -v error -y -i "$SRC" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
    -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
    -af "aresample=async=1:first_pts=0" \
    -r 30 -c:a aac -b:a 192k -ar 48000 -ac 2 "$MP4"
fi
echo "audio starts at $(ffprobe -v error -select_streams a:0 -show_entries stream=start_time -of csv=p=0 "$MP4")s, video at $(ffprobe -v error -select_streams v:0 -show_entries stream=start_time -of csv=p=0 "$MP4")s"
FRAMES=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$MP4")
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$MP4")
echo "frames $FRAMES, duration ${DUR}s, expected about $(python3 -c "print(round($DUR*30))")"

echo "== transcribe"
if [ -f "$DIR/$NAME.words.json" ]; then
  echo "$DIR/$NAME.words.json exists, not re-transcribing"
else
  node scripts/transcribe.mjs "$MP4" "$DIR/$NAME.words.json" --model small
fi

echo "== cuts at scene 0.05"
ffmpeg -v error -i "$MP4" -vf "select='gt(scene,0.05)',metadata=print:file=-" -f null - 2>&1 \
  | grep pts_time | sed -E 's/.*pts_time:([0-9.]+).*/\1/' \
  | python3 -c "import sys; c=[float(l) for l in sys.stdin if l.strip()]; print('none' if not c else '\n'.join(f'  {t:.3f}s  f{round(t*30)}' for t in c))" \
  | tee "$DIR/$NAME.cuts.txt"

echo "== grid frames"
for pct in 25 50 75; do
  n=$(( FRAMES * pct / 100 ))
  ffmpeg -v error -y -i "$MP4" -vf "select=eq(n\,$n),drawgrid=w=108:h=96:t=2:c=red@0.5,drawgrid=w=540:h=480:t=4:c=yellow@0.9" \
    -fps_mode passthrough -frames:v 1 "$DIR/$NAME.grid-f$n.png"
  echo "  $DIR/$NAME.grid-f$n.png"
done
