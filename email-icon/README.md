# Email icon

A subtle animated CJ monogram for Caleb's Gmail signature and emails. Charcoal serif letters with a soft Keller Williams red glow that slowly breathes in and out, about one breath every 3.6 seconds, looping forever. 160 by 160 pixels, white background.

Files:
- `caleb-cj-icon.gif` is the animated version.
- `caleb-cj-icon.png` is a single frame at mid glow, for places that won't play a GIF.
- `build.py` regenerates both. Run `python3 build.py` after editing colors, glow strength or timing.

## Add it to Gmail

Gmail plays animated GIFs in the body of an email and in signatures. Outlook shows only the first frame, which here is the faint-glow state, so it still looks right there.

1. Upload `caleb-cj-icon.gif` to Google Drive and set sharing to "Anyone with the link", or host it on calebjackson.org. Copy the direct image link.
2. Gmail, Settings, See all settings, General, Signature.
3. Place the cursor where the icon goes, click the image button, paste the web address.
4. Click the inserted image and pick Small or Medium.
5. Save changes and send a test to yourself.

Signatures uploaded straight from the computer get re-encoded by Gmail and may stop animating, so the hosted link route is the reliable one.

## Changing it

Constants at the top of `build.py`: `INK` is the letter color, `RED` the glow color, `GLOW_MIN` and `GLOW_MAX` how faint and how strong the glow gets, `DUR` the length of one breath, `FONT` the typeface (FreeSerif Bold by default, swap in a brand font file if one is chosen later).
