# Teardown: Fox Valuations (foxvaluations.com.au)

Done October 20, 2026 with REA (rea-agents 6.7.0, `inspect-web-page` and `analyze-web-bundle` over CDP) plus headless Chromium screenshots and ffmpeg frame grabs. Pages: home `https://foxvaluations.com.au/` and tools `https://foxvaluations.com.au/tools/`. Site credit in their footer: Black Shard.

Labels: **source** means read straight from their HTML, CSS or JS. **Measured** means seen in a screenshot or frame. **Inference** means my read.

### Blueprint

1. **The hero is a three-beat story told by video.** Beat 1: a sketched fox runs across a sand-colored field into a little house. A white flash. Beat 2: the living room draws itself in line by line (couch, lamp, window with an orange sun). Beat 3: the fox curls up asleep on the couch. The headline "What is your property worth?" and two buttons fade in over the settled room.
2. **It plays once per visit.** A flag in session storage skips straight to the finished still on repeat visits. Reduced motion skips it too. A Skip button sits bottom right. Safety timers force the ending at 9 and 20 seconds.
3. **Phones get their own cuts.** Portrait screens load separate portrait videos and a portrait still.
4. **The rest of the motion is quiet.** Headline lines rise out of masks on load. Rows and photos fade in as you scroll. Their own code comment: "Nothing else moves."
5. **The tools page is a ledger.** A photo header, the title "Tools", one line of promise ("Working instruments, not toys"), then a ruled list. Each row has a category label, a title, one sentence and an input count ("One question", "Two dates"). Each tool lives on its own page.
6. **Every tool hands off to a person.** The promise line says each tool tells you "when the answer needs a valuer instead". Every page ends on a "Talk to a valuer" band with phone and email.
7. **The build is light.** One 22 KB script, one stylesheet, two self-hosted fonts (Mona Sans, Spline Sans Mono). No framework, no animation library.

### Proof

| Step | Evidence | Label |
| --- | --- | --- |
| 1 | `<video class="seq-run">` fox-run-v2.mp4, `seq-draw` interior-draw-v3.mp4, `seq-curl` interior-curl-v3.mp4, `seq-still` settled-v3.webp, `seq-flash` div. Run and draw clips are 6.0 s, curl is 5.0 s, all 1920x1080 at 24 fps (ffprobe). Frames: `foxvaluations/CONTACT-hero-story.jpg`. Settled frame: `foxvaluations/desktop-hero.jpg` | source, measured |
| 2 | main.js comment "One showing per session". `sessionStorage "foxseq"`, `setTimeout(finish, 9000)`, `setTimeout(... 20000)`. Headline is revealed when the curl clip passes 55% of its length | source |
| 3 | main.js swaps in `fox-run-p-v2.mp4`, `interior-draw-p-v2.mp4`, `interior-curl-p-v2.mp4` when `(orientation: portrait)` matches | source |
| 4 | main.js header comment "hero lines rise out of their masks, ledger rules draw in as rows enter. Nothing else moves." IntersectionObserver on `.m-row, .m-fade, .m-photo` | source |
| 5 | REA accessibility tree of /tools/: four links, "Scoping / Which valuation do you need? / One question", "Duty / Transfer duty calculator QLD / One input", "Investment / Rental yield calculator / Three inputs", "Tax / CGT timeline check / Two dates". Screenshot `foxvaluations/tools-page.jpg` | source, measured |
| 6 | Page lead on /tools/, "Talk to a valuer" heading in the REA tree | source |
| 7 | REA script inventory: main.js?v=121 at 22,041 bytes plus one inline script. Resources: styles.min.css, mona-sans-v118.woff2, spline-sans-mono woff2. Saved as `foxvaluations/rea-home.json`, `rea-tools.json` | source |

### Unknowns

- **How the story art was made.** Hand animation, AI video or something else can't be told from the files. Their image credits page wasn't checked.
- **Their calculator pages.** The rental yield URL I guessed returned a 404. Only the tools index was captured, so their form layout and math are not verified.
- **Their performance numbers.** Lighthouse was not run on their site.
- **The curl clip frames.** My contact sheet caught the run and draw clips. The curl beat is confirmed from the settled screenshot only.

### Recommendations (what we took, what we didn't)

- **Took the pattern, not the art.** Our version (`site/story.html`) keeps the three beats (arrive, step inside, settle), the white flash between them, once per visit, Skip, and reduced motion going straight to the end. The art is our own: a raised Louisiana cottage under a live oak, a SOLD rider swinging onto the sign, a front door and porch light glowing ember, then the living room with the keys on the hook. It's drawn as SVG lines instead of video, so it stays sharp, weighs a few KB and needs no phone-specific cuts.
- **Took the ledger tools page** (`site/tools.html`) with tools that fit Louisiana buyers and sellers: which home value you need, monthly payment, seller net, rental yield. All of them are on one page, each ending with a hand-off to Caleb.
- **No market numbers are built in.** Rate, commission, taxes and insurance are all things you type in, so the page states no unsourced stats. Commission is a blank field labeled as negotiable.
- **Nothing copied:** no fox, no copy, no images, no code. Their videos were downloaded to a scratch folder only to grab frames and are not in this repo.
