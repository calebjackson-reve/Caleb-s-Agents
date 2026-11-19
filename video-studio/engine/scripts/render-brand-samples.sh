#!/bin/sh
# PHASE-0 step 5: render the six brand sample frames with ONE range render,
# then build a 3x2 contact sheet. Run outside the Claude Code sandbox (Chrome
# needs macOS permissions the sandbox blocks), e.g. with the ! prefix.
set -e
cd "$(dirname "$0")/.."
OUT=out/brand-samples
mkdir -p "$OUT"
find "$OUT" -name 'element-*.png' -delete
START=$(date +%s)
npx remotion render src/index.ts BrandSamples "$OUT" --sequence --frames=0-5 \
  --image-format=png --concurrency=6 --log=error
echo "render took $(( $(date +%s) - START ))s"
ls "$OUT"
# one row of three, two rows, each frame at a third of full size
ffmpeg -v error -y \
  -i "$OUT/element-0.png" -i "$OUT/element-1.png" -i "$OUT/element-2.png" \
  -i "$OUT/element-3.png" -i "$OUT/element-4.png" -i "$OUT/element-5.png" \
  -filter_complex "[0]scale=360:-1[a];[1]scale=360:-1[b];[2]scale=360:-1[c];[3]scale=360:-1[d];[4]scale=360:-1[e];[5]scale=360:-1[f];[a][b][c]hstack=3[top];[d][e][f]hstack=3[bot];[top][bot]vstack" \
  "$OUT/contact-sheet.png"
echo "contact sheet: $(pwd)/$OUT/contact-sheet.png"
