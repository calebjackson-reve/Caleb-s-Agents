# Brand sheet for the video engine (draft, Caleb approves after sample frames)

Drafted 2026-11-06 from `website-rebuild/DESIGN-SYSTEM.md` (October 19, 2026, built on the July 2026 brand package) in the format the `remotion-reel` method expects. Caleb said on 2026-11-06 to design the engine in our own design system, so this is that system carried to 1080x1920 at 30fps. Nothing below is rendered yet. Phase 0 step 6 renders sample frames and Caleb says yes or changes it.

Identity on every video: Caleb Jackson, REALTOR with Keller Williams First Choice. Never Rêve, never its fonts, colours or end card.

## 1. Ground

- Two grounds only: **ink** `#14100E` and **ivory** `#FBF8F3`. Every full-screen graphic is one or the other. **Blush** `#FBEFE9` is allowed as one soft band in a video, the way the site uses it once per page.
- Over the talking head, graphics sit on the footage with no ground at all, or on a hairline-edged ivory or ink card.
- Ivory gets a faint paper grain at 4 percent, generated in code (noise in a canvas or an SVG filter), not an AI tile. The AI grain tile in the media plan is still waiting on approval and is not needed here.
- No gradients, no gold, no navy, no purple, no centre glow, no vignette. Flat ground plus grain.

## 2. Colour roles

| Token | Value | In video |
|---|---|---|
| ink | `#14100E` | dark ground, text on ivory, caption outline |
| ivory | `#FBF8F3` | light ground, text on ink, caption fill |
| ember | `#E87757` | the accent, **once per graphic**: the period after a word, one underline, one number, one highlight ring. Never body text, never two ember things on screen at once. |
| stone | `#8D8578` | labels, source and date lines, secondary words |
| ink-50 | `rgba(20,16,14,0.5)` | secondary text on ivory |
| ivory-50 | `rgba(251,248,243,0.5)` | secondary text on ink |
| hairline | `rgba(20,16,14,0.12)` on ivory, `rgba(251,248,243,0.2)` on ink | 1px rules and card edges |

Ivory plus ink is 95 percent of any frame. Ember is the only colour.

## 3. Type

| Role | Face | Weight | Case | Size at 1080 wide |
|---|---|---|---|---|
| Display italic word (the payoff word, the hook's turn) | Instrument Serif Italic | 400 | as written | 120 to 160 |
| Display uppercase line | Instrument Serif | 400 | uppercase, +2% tracking | 96 to 114 |
| Headline sentence | Instrument Serif | 400 | sentence, -1% tracking | 72 to 84 |
| Stat number | Instrument Serif | 400 | as written, -2% tracking | 160 to 200, one per graphic |
| Label, eyebrow, source line | Hauora SemiBold (fallback Instrument Sans) | 600 | uppercase, +8% tracking | 26 to 30 |
| Body on a card | Hauora (fallback Instrument Sans) | 400 | sentence | 36 to 40 |
| Captions | Hauora Bold (fallback Instrument Sans Bold) | 700 | casual lowercase, I and proper nouns kept | 78 |

Instrument Serif and Instrument Sans load from `@remotion/google-fonts`. Hauora is SIL Open Font License and is self-hosted in `public/fonts/` once Caleb drops the files in. Until then Instrument Sans stands in and the sheet says so on the sample frames. Headline lines stay under about 860px wide so they survive the Instagram 4:5 crop.

## 4. Captions

Default: **ivory fill, ink outline**, Hauora Bold 78px, letter spacing -2, SVG stroke 10px painted behind the fill. 1 to 3 words, at most about 17 characters, casual lowercase. Appear and disappear with the words, no motion, no sound.

On a light ground (an ivory graphic, a light screen recording), the chunk flips to **ink fill, ivory outline**, decided per chunk by the measured luminance of the caption band, above about 140 of 255.

Option, by Caleb's call per video: a plain ivory caption with no outline on ink grounds.

Placement is measured per take: on Caleb's iPhone and clip-mic setup the mic may not show, so the baseline sits about 45px below the chin line, never on the chin, inside the y285 to y1635 band. Layout rules from the method apply (above the panel edge in the two-thirds split, above the seam in a 50/50).

Emphasis word, option: one word per chunk in Instrument Serif Italic, ember, no stroke, only where the script marks it.

## 5. Hooks and titles

- **Default text hook** (Instagram native style, frame 0, no animation): Hauora SemiBold 600, 78px, ivory text inside one ink outline traced round all the lines, tight 12px corners. Two lines maximum, each under 880px, above the head inside the safe band. The method's `TextHook` component with the brand colours swapped in.
- **Option, the site's title pair**: an Instrument Serif Italic word over an Instrument Serif uppercase line, ivory on ink or ink on ivory, with an ember period. Use it for market updates and the hook of a "prove" video, as a full-screen title card for 1 to 2 seconds, then cut to the head.
- **End card** (last 2 seconds): ink ground, "Caleb Jackson" in Instrument Serif, then "REALTOR", "Keller Williams First Choice" and "Louisiana license 995709547" in Hauora label (a hard rule on every reel from `~/reels/CLAUDE.md`, confirmed by the approved frame of 2026-11-05), a "Call or text" pill (ink fill, 1px ivory edge so it reads on the ink ground, ivory text, 100px radius) with no number baked in, the number lives in the caption text so compliance can check it. Listing tours built in `~/reels/` end on the closing shot with the brand line instead of a separate card, per the playbook.

## 6. Motifs and motion

- Easing: **`cubic-bezier(0.7, 0, 0.3, 1)`** for every move (the site's ease-house), `cubic-bezier(0.16, 1, 0.3, 1)` for clip-path image reveals only.
- Durations at 30fps: small moves and colour 12 frames, transforms and word rises 24 frames, clip reveals 30 frames, image drift under a reveal 120 frames, word stagger 1 frame per word.
- Graphics enter already moving: a clip reveal from the bottom, a word rise inside a line mask, a stat counting up. Never an opacity fade-in on its own.
- Images: **no radius, no box shadow**, a 1px hairline edge instead. The method's `CARD_SHADOW` is replaced by the hairline. If an overlay photo over the footage reads as flat without a shadow, Phase 0 renders both and Caleb picks.
- Stat tile: one 160 to 200px serif number counting up over 24 frames, a Hauora label, and a stone source and date line under it. **Every stat shows source and date**, per `CLAUDE.md`.
- Card: ivory or ink, hairline edge, label on top, headline, one line of body. Nothing else.
- Transitions between layouts happen on Caleb's own cuts. A match cut into a flat ink or ivory field is the only transition effect. No whips, glitches or film burns unless a brief asks and Phase 3 is on.
- Icons and marks: the site's line-drawn parish map in ivory on ink is the one allowed illustration motif until Caleb adds more.

## 7. Imagery rules

- Real photos only: Caleb's listing photos, drone footage he owns, his headshots. No AI headshot, no AI listing photo, no AI neighbourhood photo presented as real (`aire/STACK.md`, `website-rebuild/MEDIA-PLAN.md`).
- Generated b-roll (Higgsfield) only where a brief calls for it, abstract or clearly illustrative, and disclosed on screen in a stone label ("AI-generated") and in the caption.
- Screenshots of DMs or comments: blur or crop other people's names and handles.
- Fair housing applies to pictures too: describe the property and the place, not who lives there.

## 8. Music and sound

- None owned yet. Reels run on **original audio only** (Caleb's voice) until he drops licensed tracks into `public/music pack/` and `public/sound pack/`.
- When music exists: bed 15 to 18 dB under the voice, start on the full-band downbeat, trimmed in code. Sound effects sparingly, proposed as a list Caleb prunes.

## 9. Learned rules

Numbered, newest last. Claude appends one line whenever Caleb corrects a render, so the mistake does not come back.

1. (none yet)

## 10. Delivery size, and the listing tour playbook

- **Finals are 4K, 2160x3840**, per the listing reel playbook. Compositions are authored at 1080x1920 and rendered with `--scale=2` in chunks of about 450 frames, then joined with ffmpeg concat, because one pass runs out of Chrome's video cache. Storyboard clips, check ranges and brand samples stay at 1080x1920. Keep 6 GB free before a 4K render.
- **Two engines share this sheet.** The talking-head engine lives in this folder. The listing tour engine already lives in `~/reels/` on the Mac mini (reel 01, the Acadian estate in St. Francisville, finished 2026-10-25 after 19 cuts): a Tour composition with 12-frame dissolves on music beats, Higgsfield Kling motion applied to Caleb's own listing stills and disclosed as AI motion, a 4K grade script, LuxTitle and BrandLine. Its playbook is copied beside this file as `listing-reel-playbook.md` and is the record of what Caleb approved and rejected on tours. Do not rebuild it here. A listing video that needs Caleb on camera uses both: this engine for the talking head, the tour engine for the property run.
- **Where the playbook and this sheet disagree**, the approved sample frames of 2026-11-05 settle captions and the end card (Hauora, ivory on ink). One conflict is open: the playbook's LuxTitle is Didot with a gold hairline, and section 1 says no gold. **Pending Caleb's call.** Until he decides, tours keep LuxTitle as built, and talking-head reels use the title pair in section 5.
- The playbook's rejected list applies to any video that uses property footage: no handheld shots back to back, no Ken Burns stills next to video, no clip under 2 seconds, no title naming one area over a shot of another, colour match clamped to plus or minus 6 percent per channel.
