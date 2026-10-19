# Email icon

Case: uppercase CJ. per Caleb, October 19 2026.

An animated CJ. monogram, made to be Caleb's Google account profile picture so it moves next to his emails in other people's Gmail inboxes (the Edward Sturm "animated email icon" hack, Instagram post DXs4k6nD3V6, April 2026).

The look, chosen by Caleb on October 19 2026 after watching the reel: near-black background, coral CJ., and light that emanates from behind the mark. A warm ember light swells from the center, falls off radially with soft slow rays, and breathes over 5 seconds. The letters sit on top and are never touched by the light, which is how the Airbnb example in the reel does it. 320 by 320 pixels. Google crops profile pictures to a circle, so the mark sits inside the inner 70 percent.

Seen in the reel, October 19 2026: the animated Airbnb avatar does move in the Gmail inbox on the web client he filmed. Still not verified for Gmail mobile or other Google surfaces.

Typeface: Bodoni Moda (SIL Open Font License, `source/BodoniModa.ttf`), chosen by Caleb on October 19 2026 for a more editorial, luxury feel than the brand package's Instrument Serif. It is set at weight 520 and optical size 14 with the hairlines thickened slightly so the didone contrast survives at inbox size. `source/font-comparison.png` shows the eleven faces that were compared. Letters are the package's ember #E87757 lifted slightly (#F28A6A) so they float above the light. The light itself is brand ember added over black so it stays saturated, with a small white push at the very center.

Earlier mark: the brand package's own Instrument Serif glyphs (`source/cj-monogram.svg` and the two mask PNGs) are kept for reference. The package's own monogram is "aj." (Action Jackson); this icon uses "CJ." at Caleb's request. Note for brand consistency: the website and wordmark still use Instrument Serif, so this avatar is a deliberate departure.

Two variants, each as `.gif` (animated profile picture), `.png` (one mid-glow frame, static fallback) and `.mp4` (about 15 seconds, three loops):
- `caleb-cj-avatar-noir`: near-black background, coral CJ., ember light added over black.
- `caleb-cj-avatar-peach`: peach tan background (#E9C2A4), warm white CJ., coral ring at the edge, and the same breathing light done as a coral bloom the background leans toward, so the white letters gain contrast at the center. Added October 19 2026 at Caleb's request.

Other files:
- `source/BodoniModa.ttf` is the typeface the build renders from. `source/font-comparison.png` is the comparison sheet. The SVGs and mask PNGs are the earlier Instrument Serif mark, kept for reference.
- `build.py` regenerates everything. Run `python3 build.py`, then encode the MP4 from the `frames-noir` folder it leaves behind.

Earlier variants (ivory background, solid ember background) are in the git history of this folder if they are ever wanted.

## Set it as the Google profile picture

1. Go to myaccount.google.com while signed in as aire@calebjackson.org.
2. Click the profile picture, then the camera icon, then upload the chosen `.gif`.
3. Keep the crop at the full image. The mark already sits inside the circle.
4. Send a test email to another account and check it in Gmail on web and phone.

Partly verified: the reel shows the animation playing in Gmail on the web. Other surfaces may flatten the GIF to its first frame. If that happens, the first frame is the resting glow and still looks finished. The signature route below works regardless.

## Add it to a Gmail signature instead

Gmail plays animated GIFs in email bodies and signatures. Host the `.gif` on Google Drive with "Anyone with the link", or on calebjackson.org, then in Gmail Settings, General, Signature, insert an image by web address and pick Small or Medium. Uploading the file straight into the signature often re-encodes it and kills the animation.

## Changing it

`VARIANTS` at the top of `build.py` holds each variant's background, letter color, light mode (`add` over dark, `mix` over light), light color, white-hot amount, brightness range and optional ring. Shared constants: `RADIUS_REST` and `RADIUS_PEAK` for how far it reaches, `WHITE_HOT` for the white push at the center, `RAYS` and `RAY_DEPTH` for the soft streaks, `PAD` for how far inside the circle the mark sits, `DUR` for the length of one breath, `FONT`, `FONT_AXES` (weight, optical size), `TRACKING` and `HAIRLINE` for the type. Needs Pillow and numpy.

To try another typeface, drop its TTF in `source/`, point `FONT` at it, adjust `FONT_AXES` if it is variable, and run the build.
