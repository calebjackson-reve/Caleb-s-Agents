# Email icon

An animated house icon for Caleb's Gmail signature and emails. The walls draw in charcoal, the roof draws in Keller Williams red, the door appears, then the window lights up. It holds for about two seconds and loops. 160 by 160 pixels, white background, about 24 KB.

Files:
- `caleb-house-icon.gif` is the animated version.
- `caleb-house-icon.png` is the final frame, for places that won't play a GIF.
- `build.py` regenerates both. Run `python3 build.py` after editing colors, timing or shapes.

## Add it to Gmail

Gmail plays animated GIFs in the body of an email and in signatures, and the icon stays as a static image in Outlook, which shows only the first frame of a GIF. The first frame here is blank, so for Outlook recipients use the PNG instead.

1. Upload `caleb-house-icon.gif` to Google Drive and set sharing to "Anyone with the link". Copy the direct image link, or host it on calebjackson.org.
2. Gmail, Settings, See all settings, General, Signature.
3. Place the cursor where the icon goes, click the image button, paste the web address.
4. Click the inserted image and pick Small (Gmail shows the full 160 px at Medium, about 48 px at Small).
5. Save changes and send a test to yourself.

Signatures that are uploaded straight from the computer get re-encoded by Gmail and may stop animating, so the hosted link route is the reliable one.

## Changing it

Colors, stroke width and timing are constants at the top of `build.py`. `RED` is the roof, `INK` the walls and door, `GLOW` the lit window. `DUR` is the drawing time and `HOLD` how long the finished icon sits before the loop restarts.
