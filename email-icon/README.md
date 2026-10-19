# Email icon

A subtle animated version of the cj. monogram for Caleb's Gmail signature and emails. Ink Instrument Serif letters with the ember j-dot and period from the brand package, and a soft ember glow behind the mark that slowly breathes in and out, one breath every 3.6 seconds, looping. 160 by 160 pixels, white background, about 88 KB.

Source of the mark: the Caleb Jackson Brand and Content Package (Google Drive, July 2026). The c glyph comes from `cj-wordmark.svg`, the j and the two ember marks from `aj-monogram.svg`. Colors are the package's ink #14100E and ember #E87757. The package's own monogram is "aj." (Action Jackson); this icon uses "cj." at Caleb's request, October 19 2026.

Files:
- `caleb-cj-icon.gif` is the animated version.
- `caleb-cj-icon.png` is a single mid-glow frame, for places that won't play a GIF.
- `source/cj-monogram.svg` is the composed vector mark. `source/aj-monogram.svg` is the brand package original for reference. The two mask PNGs are renders of the composed mark that `build.py` reads.
- `build.py` regenerates the GIF and PNG. Run `python3 build.py`.

## Add it to Gmail

Gmail plays animated GIFs in the body of an email and in signatures. Outlook shows only the first frame, which here is the faint-glow state, so it still looks right there.

1. Upload `caleb-cj-icon.gif` to Google Drive and set sharing to "Anyone with the link", or host it on calebjackson.org. Copy the direct image link.
2. Gmail, Settings, See all settings, General, Signature.
3. Place the cursor where the icon goes, click the image button, paste the web address.
4. Click the inserted image and pick Small or Medium.
5. Save changes and send a test to yourself.

Signatures uploaded straight from the computer get re-encoded by Gmail and may stop animating, so the hosted link route is the reliable one.

## Changing it

Constants at the top of `build.py`: `BG` background (white for email, or the brand ivory), `GLOW_MIN` and `GLOW_MAX` for how faint and how strong the glow gets, `DUR` for the length of one breath, `DOT_LIFT` to let the ember marks brighten at the peak (off by default).

To change the mark itself, edit `source/cj-monogram.svg`, re-render the two masks (ink only and ember only, black on transparent, 790 by 1040) with a browser or any SVG renderer, drop them in `source/`, and run the build.
