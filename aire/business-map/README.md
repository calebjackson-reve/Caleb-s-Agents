# AIRE Business Map

A 3D map of Caleb's whole business, built from this repo. The center is Caleb. Eight branches are the departments. Every point of light is a real job: a script, a skill, a directive, a scheduled job, a page or a program that exists here. Ask the map a question and the right department answers in its own voice.

Published artifact: see STATUS.md (aire/STATUS.md, 2026-11-04 entry) for the current link.

## Files

| File | What it is |
|---|---|
| `build_map_data.py` | Scans the repo (every SKILL.md plus a hand catalog of scripts, directives, schedules and pages) and writes `data.json`. No client data, ever. |
| `data.json` | The map: 8 departments, 252 jobs as of 2026-11-04. |
| `src/page.html` | The page source. Three.js r134 from cdnjs, everything else inline. |
| `build.py` | Injects `data.json` and `sfx/sfx.json` into `src/page.html` and writes `index.html`. |
| `index.html` | The built page. This is what gets published. |
| `sfx/` | Six interface sounds rendered in code by earshot and measured. See `sfx/README.md`. |
| `voice/` | Fish Audio S2.1 Pro voice layer: `voices.json` (one designed voice per department), `fishaudio.py` (design, clone, say, render-bank). |

## Rebuild after the repo changes

```
python3 aire/business-map/build_map_data.py
python3 aire/business-map/build.py
```

Then republish `aire/business-map/index.html` to the same artifact URL.

## What the page does

- **3D map.** Drag to orbit, wheel or pinch to zoom, click a hub to fly to a department, click a point to open that job. Keys 1 to 8 jump to a department, Esc backs out, Space pauses the slow orbit, `/` focuses the ask box.
- **Live tiles.** Today's calendar, inbox threads from the last 3 days not sent by Caleb, and deadline events in the next 30 days. These run as the viewer through claude.ai connectors (Google Calendar `list_events`, Gmail `search_threads`), so the viewer is asked once per connector and the page never holds a token. The Operations, Nurture and Deals hubs pulse with those counts.
- **Ask the map.** Claude answers on the viewer's own account (the `sample` capability) from the map plus the live data, returns which department is speaking, the camera flies there and the department speaks. When Claude is off or declined, the map still answers from its own data and the live tiles.
- **Voices.** Browser speech by default, one distinct voice setting per department. When a Fish Audio voice bank is uploaded (below), department intros and the center greeting play the Fish Audio clips instead.
- **Sounds.** Hover tick, select, open, fly, bloom and answer chime, all rendered by earshot from its code bank, measured, and embedded as mp3 data URIs (47 KB total).

## Voice bank (Fish Audio S2.1 Pro)

The map's voice design follows the Instagram build this came from: the center node in Caleb's own cloned voice, each department in a designed voice of its own. The page cannot call Fish Audio directly (artifacts block outside network calls), so clips are rendered on the Mac and uploaded as artifact assets.

1. `export FISH_API_KEY=...` in the shell. Never in a file.
2. Caleb's voice: record a clean 10 to 30 second clip, then
   `python3 aire/business-map/voice/fishaudio.py clone --title Caleb --clip ~/Desktop/caleb.wav --yes`
3. Each department: `fishaudio.py design --dept leadgen --yes`, listen to `voice/out/design-leadgen-*.wav`, pick one, then
   `fishaudio.py clone --dept leadgen --clip voice/out/design-leadgen-0.wav --signature <candidate id> --yes`
4. `fishaudio.py render-bank --yes` renders every intro and the greeting, measures each with earshot and writes `voice/out/bank-report.md`.
5. With Caleb's go, upload `voice/out/bank-*.mp3` to the artifact as assets and write the `voice/bank` document:
   `{"center": {"greeting": "<asset url>"}, "depts": {"leadgen": {"intro": "<asset url>"}, ...}}`.
   The page reads that document on load.

Every command is a dry run until `--yes`. The S2.1 Pro API was free for developers through November 2026 per Fish Audio's own post; check the account before rendering at volume.

## Proof, 2026-11-04

Rendered headless in Chromium at 1440x900 and 400x820: zero console errors, no horizontal scroll at either width, department fly-to and card work, the ask loop answered from the map without Claude. Screenshots were checked by eye. The live tiles and Claude answers run only inside claude.ai and were exercised after publishing (see STATUS.md).
