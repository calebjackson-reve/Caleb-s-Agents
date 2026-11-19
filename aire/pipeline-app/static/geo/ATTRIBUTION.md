# Street files for the Home Ground Map

Map data © OpenStreetMap contributors, licensed under the Open Database License (ODbL) 1.0.
https://www.openstreetmap.org/copyright · https://opendatacommons.org/licenses/odbl/1-0/

## What is in these files

One small file per town (`streets-<town>.json`), drawn when that town is opened on the Home Ground Map.

- Public road centre lines only: OpenStreetMap `highway=*` ways of class motorway, trunk, primary, secondary, tertiary, unclassified, residential and living_street (links folded into their class; the last three are stored as `street`).
- Road names for main roads only (motorway to tertiary). Small streets carry no name.
- Ways tagged `access=private` or `access=no` are left out.

## What is not in them

No address points, no buildings, no points of interest, no parcel or owner data, and nothing from the CRM. People's homes are never in git: the map places roofs in the browser from `/api/state`, the same as before.

## How they were prepared

Offline, not in the browser. The map never asks OpenStreetMap for anything at run time.

1. Downloaded the Geofabrik Louisiana extract (`louisiana-latest.osm.pbf`) on 2026-11-12.
2. Read only the `highway=*` ways with pyosmium and kept the classes above.
3. Clipped to each town's box (`bbox` in the file: south, west, north, east).
4. Snapped points to a 0.00005 degree grid (about 5 m), joined ways that meet end to end, and simplified with Douglas-Peucker at about 4.5 m.
5. Wrote each road as `{"c": class, "n": name, "g": lines}`. `g` is `lat,lng,dlat,dlng,...;...` in whole grid steps from `origin`, each point as a change from the one before. `M3.decode` in `map3d.html` reads it.

To refresh: run the same steps on a newer extract and replace the files. The `ui_test.js` checks will fail if a file carries anything other than roads.
