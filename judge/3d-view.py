#!/usr/bin/env python3
"""Makes the smaller copies a judge reads first: judge/out/round-N/view/.

  python3 judge/3d-view.py judge/out/round-2

Every screenshot becomes a JPEG about 1152 px wide (phone shots keep their own size).
The pixel-ratio-2 frames are cut to their centre half instead, so the fine detail survives.
"""
import sys, pathlib
from PIL import Image

root = pathlib.Path(sys.argv[1]); view = root / 'view'
n = 0
for d in ('desktop', 'explore', 'fallback', 'phone', 'explore-phone', 'ref', 'film', 'retina'):
    src = root / d
    if not src.is_dir(): continue
    (view / d).mkdir(parents=True, exist_ok=True)
    for f in sorted(src.iterdir()):
        if f.suffix.lower() not in ('.png', '.jpg', '.jpeg'): continue
        im = Image.open(f).convert('RGB')
        if d == 'retina':
            w, h = im.size; im = im.crop((w // 4, h // 4, w * 3 // 4, h * 3 // 4))
        elif im.size[0] > 1152:
            im = im.resize((1152, round(im.size[1] * 1152 / im.size[0])), Image.LANCZOS)
        im.save(view / d / (f.stem + '.jpg'), quality=88); n += 1
print(n, 'files in', view)
