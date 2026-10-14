---
name: instagram-cover-style
description: The one and only visual style for Caleb Jackson's Instagram covers, Reel covers and carousel slides (@calebjacksonla). Load this BEFORE designing, rendering or describing any social cover, slide, thumbnail or post graphic for Caleb. Use the bundled renderer (render.py) instead of inventing a layout. Never use gold, serif type, frames, or a "luxury" look. Caleb rejected that on Oct 14 2026.
---

# Instagram cover style (locked, Oct 14 2026)

Source of truth: Caleb's live feed at https://www.instagram.com/calebjacksonla/ as of Oct 14 2026
(screenshot in `reference/feed-2026-10-14.webp`). Every cover on the feed uses this exact system.
Do not drift from it. If a request seems to need something different, build it in this style first,
then ask Caleb.

## The system

| Element | Rule |
|---|---|
| Canvas | 1080 x 1350 (4:5). Photo is full bleed. Never a framed or inset photo on black. |
| Photo treatment | Photo stays bright and basically untouched. No darken by default. Only a faint band (renderer `band` 55 or less) behind the text; the drop shadow does the work. Caleb rejected a heavy gradient on Oct 14 2026. |
| Headline | ALL CAPS, Montserrat ExtraBold (800) or Black (900). Off-white `#F3EFE6`. Centered. Two lines max, tight leading (about 0.92). Ends with a period. Soft drop shadow so it reads on any photo. |
| Headline copy | Three to six words. A hook, not a label. Examples from the feed: "I GOT A LITTLE WORKED UP." "DON'T TAKE MY WORD." "YOU NEED THIS HOUSE." "WAIT FOR THE REVEAL." "THREE HOMES. ONE TOUR." |
| Accent | One short coral bar centered under the headline. Color `#D95D41` (sampled from the feed). About 70 px wide, 5 px tall, 22 px below the headline. Nothing else is coral. |
| Subline | Small spaced caps under the bar. Montserrat SemiBold (600), about 24 px, letter spacing about 0.28 em, off-white. One line: the place, address, handle or a kicker. Example: "THE TURNBERRY DOCUMENTARY", "COPPER MILL · ZACHARY", "2179 S TURNBERRY AVE". |
| Signature | Bottom center, two lines of spaced caps: "CALEB JACKSON" (ExtraBold, 24 px) over "KELLER WILLIAMS FIRST CHOICE" (SemiBold, 18 px). Appears on most covers. Can be dropped when the subline already carries a handle or when the photo bottom is busy. |
| Headline position | Middle to lower third depending on where the faces are. Never over a face. Default headline baseline around 62 percent of height. |
| Colors | Off-white text, coral bar, black gradient. No gold. No cream frames. No serif. No gradients of color. |
| Fonts | Montserrat only, bundled in `fonts/`. Never substitute Playfair, Cormorant, Instrument Serif, Garamond or any serif. |

## Caption pairing

Caption voice is Caleb's: warm, direct, a little playful, no em dashes, no semicolons, no corporate polish.
First line is the hook and must stand alone. End with one small ask (tag someone, DM, comment).
Emojis are fine in moderation.

## Rendering

```
python3 skills/instagram-cover-style/render.py spec.json out_dir/
```

`spec.json` is a list of slides:

```json
[
  {"photo": "path.jpg", "headline": "STILL THAT GUY.", "subline": "STILL HIS FINE LADY", "focus": 0.3, "signature": true, "darken": 0.15, "text_y": 0.62},
  {"photo": "throwback.jpg", "headline": "THE SAUCE NEVER LEFT.", "subline": "MR. PAUL & MS. CYNTHIA", "fill": "blur"}
]
```

- `focus` 0 to 1 picks which vertical part of a tall photo survives the 4:5 crop (0.3 keeps heads high).
- `fill: "blur"` handles a landscape or low-res photo: it sits at the top at full width and the rest of the canvas is a blurred, darkened stretch of the same photo. Still full bleed, still on brand.
- `crop` is `[x0, y0, x1, y1]` as fractions of the source photo, for a tighter frame before the 4:5 fit. Caleb likes tight crops, waist up.
- Put `|` in the headline to force the line break, e.g. `MR. PAUL | IS STILL HIM`. Always balance the two lines.
- `text_y` moves the headline block. Keep it off faces. Caleb likes the headline close under the subjects, not pushed to the bottom.

Always open the rendered JPGs and check: headline not over a face, bar present, subline readable,
signature not colliding with the photo subject. Then send the files to Caleb.

## What went wrong before (so it never repeats)

On Oct 14 2026 a session built a carousel in black, gold and serif with a framed photo because
ChatGPT had described the "previous cover" that way. Caleb's actual feed looks nothing like that.
Never trust a description of the style from another tool or from memory. Trust this file and the
reference screenshot.
