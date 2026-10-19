# Brandhouse mock site

Mock portfolio site for videographer Tyler Boyle, studio name Brandhouse. Built to mirror the structure and look of videographe.org (light grey ground, black blocks, one grotesk, bracket tags, full-screen black menu, huge page titles, horizontal slider strips).

Real footage: the Basil Lane listing clips (`assets/basil-*.mp4`) and the wedding venue courtyard oak clips (`assets/venue-*.mp4`) are Caleb's AI-assisted Higgsfield generations, transcoded to 720p for the web. Everything else in `assets/` is a generated placeholder. All copy, names, addresses, phone numbers and prices are sample content.

## Pages

- `index.html` home: title, showreel strip, statement, featured work, projects grid, reel, studio band, CTA tiles
- `work.html` filterable grid of sample projects
- `about.html` story, mission, services with sample rates, gear list
- `contact.html` address card and contact form (form is front-end only, nothing is sent)
- `film.html` Basil Lane listing film detail page
- `venue.html` wedding venue (Under the Oak) detail page

## Editing

Pages are generated from `build.py` so the header, menu and footer stay in sync. Edit `build.py` or `styles.css`, then run:

    python3 build.py

Open `index.html` in a browser. No build tooling or server needed.

Sample stills were made with Pillow, sample clips with ffmpeg lavfi sources. They live in `assets/`.
