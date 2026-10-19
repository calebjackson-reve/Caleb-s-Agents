# Design system for the calebjackson.org rebuild (Stage 2, for approval)

Drafted October 19, 2026 from the three Stage 1 teardowns (`teardown/`), the July 2026 brand package, and the media library. Nothing below is built yet. Every choice names the reference it came from and why. Change anything here before Stage 3 starts; this is the cheapest place to steer.

## 0. The one-paragraph version

The site reads like Sobha's black-and-ivory magazine with FIND's engineering underneath and Zorge's restraint on top. One fluid scale drives every size. Sections flip between ivory and ink with the header following. Headlines are a light serif in two voices (an italic word, then uppercase), body is a small grotesk. One accent, ember, used once per view. Text enters word by word inside line masks, images enter through clip reveals with a slow drift, the hero is a pinned story over real drone footage of Basil Lane. One easing curve for everything.

## 1. Tokens

### Color (from the brand package, July 2026)

| Token | Value | Role | Reference |
| --- | --- | --- | --- |
| `--ink` | `#14100E` | dark surfaces, text on ivory | brand |
| `--ivory` | `#FBF8F3` | light surfaces, text on ink | brand |
| `--blush` | `#FBEFE9` | one soft band per page (testimonials, stats) | brand, plays the role of FIND's `#f1f1f1` band |
| `--ember` | `#E87757` | the accent: wordmark period, one link or rule per view, hover states | brand, used the way Zorge uses copper `#a0725b` |
| `--stone` | `#8D8578` | secondary headlines and captions | brand, plays Sobha's gray `#717170` |
| `--ink-50` | `rgba(20,16,14,0.5)` | secondary text on ivory | measured pattern on all three |
| `--ivory-50` | `rgba(251,248,243,0.5)` | secondary text on ink | Sobha and Zorge both use white at 50% |
| `--hairline` | `rgba(20,16,14,0.12)` on ivory, `rgba(251,248,243,0.2)` on ink | 1px rules | Zorge's 1px white at 20 to 30% |

Rules carried from the brand package: ivory plus ink is 95% of any view, ember once per view, no gradients, no gold, no navy. Ember is for display and graphic elements only, never body text or small links (contrast 2.6:1 on ivory).

Surfaces: every section is either `ui-light` (ivory) or `ui-dark` (ink). The header, cursor and icons take their color from the section under them (Sobha, Zorge). The page never shows two ivory sections in a row without a blush or ink section between them.

### Type

| Role | Face | Weight | Case | Tracking | Reference |
| --- | --- | --- | --- | --- | --- |
| Display italic word | Instrument Serif Italic | 400 | as written | 0 | Sobha's script word ("The art"), done with the brand's own serif instead of a paid script |
| Display uppercase | Instrument Serif | 400 | uppercase | +2% | Sobha's TT Ramillas Light headline role |
| Headline sentence | Instrument Serif | 400 | sentence | -1% | FIND's tight sentence-case h2, in the brand serif |
| Body | Hauora | 400 | sentence | 0 | brand package (SIL OFL). Fallback Instrument Sans (FIND's face, free) if Hauora is not shipped |
| Label | Hauora SemiBold | 600 | uppercase | +8% | brand package, same as Sobha's 11px labels |
| Numbers as display | Instrument Serif | 400 | as written | -2% | Zorge's "26-30 м²" |

Both faces are free. Instrument Serif is on Google Fonts, Hauora is SIL Open Font License. No paid font from any reference is used. The brand package names Editorial New Ultralight as a paid upgrade target for display; it stays optional.

### The fluid scale (from FIND, source)

```
html { font-size: 2.6667vw; }                          /* phones: 390 wide gives 10.4px */
@media (min-width: 768px)  { html { font-size: 0.5208vw; } }   /* 1440 gives 7.5px, 1920 gives 10px */
@media (min-width: 1920px) { html { font-size: 10px; } }       /* cap */
```

Every size below is in rem at the 1920 design width, so 1rem = 10px there. At 1440 everything is 75%, the same as FIND. This is the mechanism that keeps proportions identical at every width, and it is the single biggest reason FIND holds together.

### Type scale (design px at 1920, line height, use)

| Token | Size | Line | Use |
| --- | --- | --- | --- |
| `display-xl` | 140 | 1.0 | hero line, one per page. FIND's h1 was 140 |
| `display-l` | 114 | 0.96 | section titles ("Communities", "Sold") in uppercase. Sobha's 114 |
| `display-m` | 80 | 1.06 | statement headlines, uppercase or italic word pairs. Sobha's 80 |
| `h2` | 72 | 1.0 | sentence-case section headlines. FIND's 72 |
| `h3` | 44 | 1.15 | card and step titles. FIND's 44 |
| `lead` | 32 | 1.3 | lead paragraphs and pull quotes |
| `body` | 20 | 1.5 | body copy. FIND's 20 (Sobha's 13 is too small for a brokerage page with real reading) |
| `small` | 16 | 1.5 | captions, footer |
| `label` | 14 | 1.4 | eyebrows, nav, buttons, uppercase +8% |
| `stat` | 114 | 1.0 | one number per section when there is a sourced stat |

Phone scale (at 390, measured from the references): hero 56, display-l 48, h2 46, h3 31, body 16.6, label 14.5. The fluid root handles most of it; headings get one phone override each.

### Spacing (design px at 1920)

| Token | Value | Use | Reference |
| --- | --- | --- | --- |
| `gutter` | 100 | side padding, desktop | FIND's 100 |
| `gutter-phone` | 26 | side padding, phone | FIND's 26 |
| `section` | 150 | top and bottom padding of a normal section | FIND's 150 |
| `section-tight` | 60 | compact sections | FIND's 60 |
| `runway` | 100vh multiples | pinned sections are padded in whole viewports | Sobha, Zorge |
| `grid` | 12 columns, 24 gap | content grid | Sobha and Zorge both use 12 |
| `max` | 1920 | content max width, centered above | FIND |

### Radius, borders, shadow

- Radius: 100px on pill buttons (FIND). 0 on every image and card (all three). 50% on circular icon buttons (Sobha's plus and arrow).
- Borders: 1px hairlines only (Zorge). No box shadows anywhere.

### Motion tokens

| Token | Value | Use | Reference |
| --- | --- | --- | --- |
| `ease-house` | `cubic-bezier(0.7, 0, 0.3, 1)` | every transition and tween | Sobha and Zorge, 28 and 27 rules each |
| `ease-reveal` | `cubic-bezier(0.16, 1, 0.3, 1)` | clip-path image reveals only | FIND, 29 rules |
| `dur-ui` | 0.4s | color, opacity, small moves | Sobha |
| `dur-move` | 0.8s | transforms, word reveals | Zorge's default |
| `dur-reveal` | 1.0s | clip-path reveals | FIND |
| `dur-drift` | 4.0s | the image drift under a reveal | FIND's 4s transform |
| `dur-intro` | 1.6s | loader and hero intro | Zorge |
| `stagger-word` | 30ms | per word in a headline | between Sobha's 10 to 40ms |
| `lerp` | 0.1 | smooth scroll (Lenis) | Sobha and Zorge's engine value |

`prefers-reduced-motion: reduce` turns off parallax, pinning and word stagger, keeps fades at 0.4s.

## 2. Components and their motion

| Component | What it is | Motion | Exists in motion-kit | Reference |
| --- | --- | --- | --- | --- |
| Header | logo left, four links center, "Call or text" pill right, 90px desktop, 68 phone, transparent, flips color per section, hides on scroll down, returns on scroll up | `dur-ui` color, `dur-move` slide | `header` (hide on scroll). Needs: per-section color flip | FIND hide and return, Sobha and Zorge flip |
| Hero (home) | pinned stage, 4 viewports: drone loop under a headline, italic word over uppercase line, logo fades, portrait cut-out enters across the seam, wordmark along the bottom edge | sticky stage, parallax at two rates, opacity, word stagger | `sequence` (sticky). Needs: cut-out layer, bottom wordmark | FIND stage, Zorge construction, Sobha type |
| Word reveal | headline split into words inside line masks, each word rises and fades in, color shifts stone to ink on arrival | `dur-move`, `stagger-word`, `ease-house` | `text.heading` (line masks). Needs: word split and color shift | Zorge |
| Clip reveal | image revealed through clip-path from the bottom while the image itself drifts 4s | `dur-reveal` with `ease-reveal`, drift `dur-drift` | `reveal` image. Needs: separate drift | FIND |
| Pinned runway | sticky layer holds for N viewports while a slider moves horizontally or cards cross-fade | transform on scroll, `lerp` | `sequence`. Needs: horizontal mode and cross-fade mode | Sobha Tenets, Zorge Fitness and Advantages |
| Sticky under next | a full-height section stays put while the next slides over it | position sticky, z-order | Needs: new | Sobha and Zorge heroes |
| Pill button | ink fill, ivory text, arrow, 100px radius; on hover the label slides up behind a clip and a clone rises | `dur-move`, `ease-house` | `btnFill` (pixel dissolve). Replace with: cloned-label slide | FIND shape, Sobha and Zorge hover |
| Underline link | hairline underline that draws out from the left | `dur-ui` | `underline` | FIND footer |
| Stat tile | one 114px number, label, source line and date under it | counts up over `dur-move` once in view | Needs: new | Zorge numbers; CLAUDE.md rule that every stat shows source and date |
| Card | image 0.8 or 1.43 ratio, h3, one line, no radius, hairline bottom | clip reveal, hover: image scales 1.04 over `dur-drift` | `card` corners. Simplify to hairline | FIND and Zorge cards |
| Testimonial band | blush surface, Lora-style italic quote in Instrument Serif Italic at `lead`, portrait 0.79 | keen-slider style, 500ms | `marquee` is wrong for this. Needs: slider | FIND |
| Map section | ink surface, line-drawn parish map with points for the eight areas, dim layer, cards slide in | pinned, opacity on dim, transform on cards | Needs: new | Sobha and Zorge maps |
| Closing statement | one uppercase line that fills from stone to ivory as the scroll completes, over a photo | background-position tween | Needs: new | Sobha footerText |
| Footer | newsletter field, three link columns, address, phone, the wordmark cut off at the bottom | none | Needs: new | FIND |
| Loader | ink screen, wordmark with the ember period, 1.6s, only on first visit | `dur-intro` | `loader` | Zorge |
| Cursor | default. No custom cursor | | drop `cursor` and `ruler` | FIND. Custom cursors are the one reference trait not worth its cost on a site with search |
| Smooth scroll | Lenis on native scroll, not a virtual engine | `lerp` 0.1 | `scroll` | FIND. Virtual scroll would break IDX embeds |

Modules to add to `motion-kit/`: `flip` (section-aware color), `words` (word split with color), `clipDrift`, `runway` (horizontal and crossfade modes), `underNext`, `btnClone`, `stat`, `slider`, `fill` (gradient fill text). Modules to drop: `cursor`, `ruler`, `ink`, `btnFill`.

## 3. Page map

| Page | Sections in order | Surfaces |
| --- | --- | --- |
| Home | Hero (drone loop, "Action Jackson." italic word over "WHEN IT'S TIME TO MOVE, WE MOVE" uppercase), About strip (balcony portrait, short bio, same-day promise), Communities runway (8 areas as a horizontal slider), Sold proof (Basil Lane, 114px stat "Listed Tuesday. Under contract Friday." only if true and dated), Buy / Sell / Communities split (FIND's Buy Sell Rent), Testimonials band, Market note (one sourced stat), Closing statement, Footer | ink, ivory, ink, ivory, ink, blush, ivory, ink, ink |
| Search | Header, one line of intro, the LP Home Search in an iframe or link out, ivory | ivory |
| Communities | Display-l title, map section, eight cards, each card to the neighborhood template | ivory, ink, ivory |
| Sell | Hero (pool at dusk), the process in three numbered steps, Basil Lane case, stat, CTA | ink, ivory, ink, blush |
| About | Hero (bar stool portrait), long bio in two columns, "receipts" stat row, the team line (KW First Choice), CTA | ivory, ivory, ink, ivory |
| Contact | One screen: phone, email, address, form, hours. "Your call gets returned today." | ink |
| Listing template | Full-bleed hero image, address and price as display, specs as stat tiles, gallery runway, map, agent card, status line and brokerage line per LREC | ivory and ink alternating |
| Neighborhood template | Full-bleed hero, display-l name, three facts with sources, listings pull, "why a buyer wants it" paragraph, CTA | ivory, ink |

Nav: Search, Communities, Sell, About, and the pill "Call or text (225) 747-0303". Contact lives in the footer and the pill.

## 4. Media spec per slot

| Slot | Ratio | Min px | Treatment | Source now | Status |
| --- | --- | --- | --- | --- | --- |
| Home hero video, desktop | 16:9 | 1920 | muted loop, slight ink overlay at 20% for type contrast | `video/aerial-1-dusk-estate-16x9.mp4` | ready |
| Home hero video, phone | 9:16 | 1080 | same | `video/aerial-2-pond-wide-9x16.mp4` | ready |
| Home hero portrait cut-out | 4:5 | 1600 | background removed, placed across the seam | `headshots/01-balcony-blue-suit.webp` | needs background removal (Higgsfield remove_background, no credits risk flagged below) |
| About strip portrait | 4:5 | 1200 | real photo, no grade | `headshots/02-bar-stool-tan-suit.webp` | ready |
| Avatar and nav | 1:1 | 400 | tight crop | `headshots/03-tabletop-smile-tan-suit.webp` | ready, low res is fine at this size |
| Communities cards x8 | 4:5 | 1200 | ivory-graded, warm | St. Francisville: Rosedown oak allee. Garden District: Kleinert Terrace. Baton Rouge general: oak bike lane, Old State Capitol. New Roads: False River placeholders. Country Club of Louisiana, University Club, Bocage, Santa Maria, Zachary: nothing | 4 ready, 1 weak, 5 reshoot |
| Sold proof gallery | 16:9 and 4:5 | 1672 | as shot | `listing-basil-ln/` 20 files | ready |
| Sell hero | 16:9 | 1672 | as shot | `basil-pool-night.webp` | ready |
| Testimonial portraits | 0.79 | 346 | real clients | none | need client photos with permission, or run quotes without faces |
| Map section | vector | | line-drawn parish map in ivory on ink | none | build as SVG from OpenStreetMap data, no photo needed |
| Closing statement background | 16:9 | 1920 | darkened 60% | `basil-front-night.webp` | ready |
| Listing template hero | 16:9 | 1920 | as shot | per listing from MLS | template only |
| Neighborhood template hero | 16:9 | 1920 | warm grade | same as community cards | 4 ready, 5 reshoot |
| Ivory paper grain texture | tile | 512 | 4% opacity over ivory sections | none | AI candidate, needs approval |
| Ember gradient plate for loader | 16:9 | 1920 | behind wordmark | none | AI candidate, or just flat ink |

No headshot and no listing photo is AI generated. The only AI uses proposed are the paper grain tile and the loader plate, both abstract, both disclosed, both waiting on approval. Background removal on the balcony portrait is an edit of a real photo, not a generation, but it still runs through Higgsfield and should be approved with the rest.

## 5. What is deliberately not copied

- Virtual scroll (Sobha, Zorge). It breaks IDX embeds and accessibility. Lenis on native scroll gives the same feel.
- 40-plus viewport pages. The home page is planned at about 14 viewports, FIND's length.
- Custom cursors (Sobha, Zorge). Cost without return on a site people use to search.
- Paid fonts. Instrument Serif and Hauora are free and already the brand.
- Their photography, copy, logos and the Rêve end card in the event film.

## 6. Open questions for Caleb

1. Hero line: "Action Jackson." as the italic word with "WHEN IT'S TIME TO MOVE, WE MOVE." beneath, or the brand package's other option "The dream is the easy part."?
2. Is the balcony portrait the one to cut out for the hero, or should the hero stay pure drone footage with type only?
3. The eight target areas from the brand package (Country Club of Louisiana, University Club, Bocage, Santa Maria, Garden District, Zachary, St. Francisville, New Roads): still the right eight?
4. Testimonials: do we have client quotes with permission to use names and faces?
5. The blush band: keep it, or go pure ivory and ink like the references?

### Answers relayed October 19, 12:40 pm Central (from another session, pending Caleb's confirmation here)

1. Hero line: "The dream is the easy part."
2. Hero portrait: show both, drone plus type only, and the balcony cut-out. That comparison is being built in `home-landing/` on branch `claude/optimistic-davinci-kdbafw` (draft PR #41). No Higgsfield background removal without approval.
3. Target areas: keep the eight.
4. Testimonials: none yet. Build the slot empty, nothing invented.
5. Blush band: show both, with and without, in the same comparison.

Also relayed: the `home-landing/index.html` prototype on that branch is the approved structure (FIND command bar and pinned hero, Zorge sticky split panels, Sobha curved gallery with a Curve switch, FIND-style quick CTA) and should carry these tokens once the two comparisons are decided. Any generation that costs credits needs Caleb's yes first.

Approve this, with changes, and Stage 3 builds every page in the page map.
