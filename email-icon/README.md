# Email icon

A subtle animated version of the cj. monogram, made to be Caleb's Google account profile picture so it moves next to his emails in other people's Gmail inboxes (the Edward Sturm "animated email icon" hack, Instagram post DXs4k6nD3V6, April 2026). Ink Instrument Serif letters with the ember j-dot and period from the brand package, and a soft ember glow behind the mark that slowly breathes in and out, one breath every 3.6 seconds, looping. 400 by 400 pixels. Google crops profile pictures to a circle, so the mark sits inside the inner 60 percent and the background runs full bleed.

Source of the mark: the Caleb Jackson Brand and Content Package (Google Drive, July 2026). The c glyph comes from `cj-wordmark.svg`, the j and the two ember marks from `aj-monogram.svg`. Colors are the package's ink #14100E and ember #E87757. The package's own monogram is "aj." (Action Jackson); this icon uses "cj." at Caleb's request, October 19 2026.

Two variants, pick one:
- `caleb-cj-avatar-ivory.*`: brand ivory background, ink letters, ember marks, ember glow. Quiet, matches the website.
- `caleb-cj-avatar-ember.*`: solid ember background, ivory letters and marks, soft ivory glow. Louder, stands out in a grey inbox.

Each comes as `.gif` (animated, for the profile picture), `.png` (one mid-glow frame, static fallback) and `.mp4` (about 11 seconds, three loops, for anything that wants video).

Other files:
- `source/cj-monogram.svg` is the composed vector mark. `source/aj-monogram.svg` is the brand package original for reference. The two mask PNGs are renders of the composed mark that `build.py` reads.
- `build.py` regenerates the GIF and PNG. Run `python3 build.py`.

## Set it as the Google profile picture

1. Go to myaccount.google.com while signed in as aire@calebjackson.org.
2. Click the profile picture, then the camera icon, then upload the chosen `.gif`.
3. Keep the crop at the full image. The mark already sits inside the circle.
4. Send a test email to another account and check it in Gmail on web and phone.

Not verified: whether Google keeps the animation. Reports differ, and Google may flatten the GIF to its first frame in some surfaces. If that happens, the ivory variant's first frame is the faint-glow state and still looks finished. The signature route below works regardless.

## Add it to a Gmail signature instead

Gmail plays animated GIFs in email bodies and signatures. Host the `.gif` on Google Drive with "Anyone with the link", or on calebjackson.org, then in Gmail Settings, General, Signature, insert an image by web address and pick Small or Medium. Uploading the file straight into the signature often re-encodes it and kills the animation.

## Changing it

`VARIANTS` at the top of `build.py` holds the colors and glow range for each variant. `PAD` controls how far inside the circle the mark sits, `DUR` the length of one breath. Run `python3 build.py`, then re-encode the MP4s with ffmpeg from the `frames-*` folders it leaves behind.

To change the mark itself, edit `source/cj-monogram.svg`, re-render the two masks (ink only and ember only, black on transparent, 790 by 1040) with a browser or any SVG renderer, drop them in `source/`, and run the build.
