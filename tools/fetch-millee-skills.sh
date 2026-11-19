#!/bin/sh
# Downloads Michael Ly's free Claude skills (millee.md) into skills/third-party/millee-md/,
# which is git-ignored because the files are his. Digests live in lessons/millee-md-guides/.
# Source pages: https://milleemd.com/guides/ (read 2026-11-06). Needs curl and unzip.
set -e
DEST="$(cd "$(dirname "$0")/.." && pwd)/skills/third-party/millee-md"
mkdir -p "$DEST/zips"
get() { # id, filename
  curl -sSL --max-time 120 -o "$DEST/zips/$2" "https://drive.google.com/uc?export=download&id=$1"
  echo "fetched $2 ($(wc -c < "$DEST/zips/$2") bytes)"
}
get 1SyfapFoW8bYE0WgqHIU4AVgxz66QjnAe remotion-reel.zip        # 53,319 bytes, 2026-10-14
get 17xcIY32UMhEV7zK546VgQLm744xsrPBO web-designer.zip         # 25,785 bytes, 2026-09-05
get 1SGuIx1ETy9z1l2d2xYZhVRnbtejN3_s_ carousel-studio.zip      # 349,190 bytes, 2026-10-24
get 1MGR88b8qh1DvjreIcf8uzwF32KD12zTO carousel-HOW-TO-INSTALL.md
get 15NX26CgfqVB2fN3M8Uc-df39D9NnuEz7 human.skill              # 4,378 bytes, a zip
get 1l1OLVxTn0wkcVx9TCqwjduQjmWmdK5e1 the-council-skill.zip    # 8,911 bytes, 2026-06-16
get 1VxSuSwoIsR81gIk-1ZkKZ32DSvqcyr3x resume-interviewer.md
get 1BUCiOPoDqCaB545kGO1SxUnJi8BfDoWG resume-remixer.md
get 1xQ-dwfIoIEwzVHlglrTdh0ibcS6XO74I resume-recruiter.md
get 18I4a5PK9r5KbyQdxJdAX3q6Pi5bFWMVx resume-reviewer.md
for z in remotion-reel web-designer carousel-studio the-council-skill; do
  unzip -q -o "$DEST/zips/$z.zip" -d "$DEST"
done
unzip -q -o "$DEST/zips/human.skill" -d "$DEST"
echo
echo "Skills unpacked under $DEST:"
ls "$DEST"
echo
echo "To use remotion-reel in Claude Code on this Mac:"
echo "  ln -s \"$DEST/remotion-reel\" ~/.claude/skills/remotion-reel"
echo "Same pattern for carousel-studio, human, the-council, web-designer."
