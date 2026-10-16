---
name: motion-kit
description: Add micro animations and animated text (word color sweep, heading rise with masks, text that lights up word by word, pulsing accent square, marquee, ink reveals, hover and cursor effects) to Caleb's course videos or web pages. Use when Caleb asks for text animations, micro animations, "make the words move", Motion Kit, or wants a lesson video or page to feel more animated.
---

# Motion Kit

Caleb is a REALTOR with Keller Williams First Choice and the builder of AIRE. Motion Kit is his library of small, tasteful animations. It lives in two places, one for web pages and one for videos. Pick by what you are making.

## Making a course video (AI for Agents)

Use the video kit at `programs/ai-for-agents/motion/`. Its headings already carry Motion Kit's text effects. Set `"text"` at the top of the scene list for the whole video, or on one scene:

| `text` | What it does | Ported from |
| --- | --- | --- |
| `blur` (default) | Words rise out of a soft blur | the kit's own |
| `mask` | Each word slides up out of its own mask, crisp | `MotionKit.text.heading` |
| `sweep` | Each word fades in through ember, then settles on its own color | `MotionKit.text.words` |

Scene type `statement` is Motion Kit's scroll-scrubbed text, driven by his voice instead of the scroll. One big line sits muted and each word turns ink (or ember for a `*word*`) the moment he says it. It reads the word times from the scene list's `captions`. Set `"caption_box": false` when the statement is on screen and you don't want the caption bar too.

```json
{ "type": "statement", "kicker": "Here's the gap",
  "text": "Most agents I've talked to have all used or *tried* AI. Almost none of them *use it* in their business." }
```

Rules for statement text: use his exact words from the transcript, in order. If the text differs from what he says, the lighting drifts. Leave `text` out to show his raw words.

The chrome dot pulses on its own (Motion Kit's `fade-loop`).

Demo: `scenes/demo-motion-kit-text.json` renders all three on his IMG_6299 hook audio. Render with `node render.mjs SCENES.json OUT.mp4`.

## Making a web page

Use `motion-kit/` at the repo root. Read its `README.md` for the module table and install snippet, and `TEARDOWN.md` for how each effect works. Open `motion-kit/index.html` for the demo.

- Load GSAP 3.13.0 with ScrollTrigger and SplitText, then Lenis, then `motion.js`.
- Swap the placeholder green tokens for the page's brand: `--mk-accent` and `--mk-accent-rgb` (keep them in sync), `--mk-paper`, `--mk-ink`, `--mk-font`.
- For AI for Agents pages use the Ivory look: paper `#FBF8F3`, ink `#14100E`, accent ember `#E87757`.

## Taste rules

- One ember accent per view. Motion should point at the word that matters, not decorate everything.
- One text effect per scene. Mixing `mask` and `sweep` in one heading reads as noise.
- Respect reduced motion on the web (the kit already does).
- No Rêve branding, fonts or colors. Rêve is historical only.
- Nothing gets posted, published or uploaded without Caleb's yes.
