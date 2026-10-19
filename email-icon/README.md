# Email icon

An animated version of the cj. monogram, made to be Caleb's Google account profile picture so it moves next to his emails in other people's Gmail inboxes (the Edward Sturm "animated email icon" hack, Instagram post DXs4k6nD3V6, April 2026).

The look, chosen by Caleb on October 19 2026: near-black background, coral cj., and a glow that emanates from the letters. A tight warm core hugs the strokes and a wide bloom breathes outward and back over 4.8 seconds, fading to black at the edge. 320 by 320 pixels. Google crops profile pictures to a circle, so the mark sits inside the inner 70 percent.

Source of the mark: the Caleb Jackson Brand and Content Package (Google Drive, July 2026). The c glyph comes from `cj-wordmark.svg`, the j and the two ember marks from `aj-monogram.svg`. Letters are the package's ember #E87757 lifted slightly (#F28C6E) so they stay crisp on top of the glow, and the glow is ember deepened (#D95E3C) so it reads as light. The package's own monogram is "aj." (Action Jackson); this icon uses "cj." at Caleb's request.

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

Not verified: whether Google keeps the animation. Reports differ, and Google may flatten the GIF to its first frame in some surfaces. If that happens, the first frame is the resting glow and still looks finished. The signature route below works regardless.

## Add it to a Gmail signature instead

Gmail plays animated GIFs in email bodies and signatures. Host the `.gif` on Google Drive with "Anyone with the link", or on calebjackson.org, then in Gmail Settings, General, Signature, insert an image by web address and pick Small or Medium. Uploading the file straight into the signature often re-encodes it and kills the animation.

## Changing it

`VARIANTS` at the top of `build.py` holds the colors and the glow numbers: `core` is the tight glow gain at rest and at peak, `bloom` the wide glow gain, `spread` the bloom radius as a fraction of the image. `PAD` controls how far inside the circle the mark sits, `DUR` the length of one breath.

To change the mark itself, edit `source/cj-monogram.svg`, re-render the two masks (ink only and ember only, black on transparent, 790 by 1040) with a browser or any SVG renderer, drop them in `source/`, and run the build.
