# Email icon

An animated version of the cj. monogram, made to be Caleb's Google account profile picture so it moves next to his emails in other people's Gmail inboxes (the Edward Sturm "animated email icon" hack, Instagram post DXs4k6nD3V6, April 2026).

The look, chosen by Caleb on October 19 2026 after watching the reel: near-black background, coral cj., and light that emanates from behind the mark. A warm ember light swells from the center, falls off radially with soft slow rays, and breathes over 5 seconds. The letters sit on top and are never touched by the light, which is how the Airbnb example in the reel does it. 320 by 320 pixels. Google crops profile pictures to a circle, so the mark sits inside the inner 70 percent.

Seen in the reel, October 19 2026: the animated Airbnb avatar does move in the Gmail inbox on the web client he filmed. Still not verified for Gmail mobile or other Google surfaces.

Source of the mark: the Caleb Jackson Brand and Content Package (Google Drive, July 2026). The c glyph comes from `cj-wordmark.svg`, the j and the two ember marks from `aj-monogram.svg`. Letters are the package's ember #E87757 lifted slightly (#F28A6A) so they float above the light. The light itself is brand ember added over black so it stays saturated, with a small white push at the very center. The package's own monogram is "aj." (Action Jackson); this icon uses "cj." at Caleb's request.

Files:
- `caleb-cj-avatar-noir.gif`: the animated profile picture.
- `caleb-cj-avatar-noir.png`: one mid-glow frame, static fallback.
- `caleb-cj-avatar-noir.mp4`: about 14 seconds, three loops, for anything that wants video.
- `source/cj-monogram.svg` is the composed vector mark. `source/aj-monogram.svg` is the brand package original for reference. The two mask PNGs are renders of the composed mark that `build.py` reads.
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

Constants at the top of `build.py`: `CORE_REST` and `CORE_PEAK` for how bright the light gets, `RADIUS_REST` and `RADIUS_PEAK` for how far it reaches, `WHITE_HOT` for the white push at the center, `RAYS` and `RAY_DEPTH` for the soft streaks, `PAD` for how far inside the circle the mark sits, `DUR` for the length of one breath. Needs Pillow and numpy.

To change the mark itself, edit `source/cj-monogram.svg`, re-render the two masks (ink only and ember only, black on transparent, 790 by 1040) with a browser or any SVG renderer, drop them in `source/`, and run the build.
