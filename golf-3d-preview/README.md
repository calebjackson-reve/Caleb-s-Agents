# Copper Mill 3D course preview (prototype)

Built Oct 13 2026 for Caleb Jackson, Keller Williams First Choice. Prototype only, not published.

## What it does
- Flies Copper Mill Golf Club (2100 Copper Mill Blvd, Zachary) in Google photorealistic 3D when a Google Maps Platform key is supplied.
- Without a key it falls back to 2D Esri satellite imagery so the page always works. Same outline, pins and panel in both modes.
- Click a hole pin to fly to it. Click a home pin to see its lot type (fairway, water, interior) and which hole it sits on, tee side or green side.
- "Fly the course" orbits the whole course. "Overview" returns to the full view.

## Run it
Serve this folder with any static server, then open index.html.

    python3 -m http.server 8765

- 2D fallback: http://localhost:8765/
- Photoreal 3D: http://localhost:8765/?key=YOUR_GOOGLE_MAPS_KEY (the key is remembered in that browser)
- Force 2D: ?mode=2d

The key needs the Maps JavaScript API enabled in Google Cloud. Photorealistic 3D loads the alpha channel of the Maps JS API. Restrict the key to calebjackson.org before it goes anywhere public. Usage is billed per map load, so check the Google Maps Platform pricing page before launch.

## What is verified and what is not
- Verified: the 2D satellite mode renders, hole and home clicks work, phone layout works. Screenshots are in proof/.
- Not verified: the 3D mode. It could not be run here because no Google key was available. The code follows Google's published Map3DElement, Polygon3DInteractiveElement and Marker3DInteractiveElement samples, but expect to fix small property-name differences on first run with a real key.
- Not verified: whether Google has photoreal 3D coverage over Zachary. Check with a key before committing to this approach. If coverage is flat, Google still shows satellite imagery draped on terrain.

## Data accuracy
- The course outline and the nine hole pins in course-data.js were traced by eye from satellite imagery. They are approximate. Hole numbers are placeholders and must be confirmed with the club. Copper Mill is an 18 hole course, only nine pins are placed.
- The three home pins are illustrative placeholders, not real listings. Replace them with live IDX data before any publication.

## Next steps
1. Caleb supplies a Google Maps Platform key and checks 3D coverage.
2. Confirm hole numbers and pin all 18 with the club.
3. Pull East Baton Rouge Parish parcel lines so each home pin becomes a clickable lot outline.
4. Wire pins to live listings (Luxury Presence IDX) and add drone clips per hole if Caleb wants layer two.
5. Repeat for Beaver Creek and the other course communities.
