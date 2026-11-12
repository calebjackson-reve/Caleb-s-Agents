# Video Engine dashboard

A local page for Caleb's video jobs. See the jobs and their media, upload files, play them, set simple trims, watch renders finish, and break down a reference video so we can match its structure with our own footage.

The Video Engine bot can do every one of those things without the browser, through the `vx` CLI or the JSON HTTP API.

Version 1. Localhost only. No accounts, no cloud, no publishing.

## Start it

```
cd aire/video-dashboard
npm start
```

Then open http://127.0.0.1:4848

There is nothing to install. The app uses Node built-ins only (Node 20 or newer) plus the `ffmpeg`, `ffprobe` and `yt-dlp` programs already on the box.

`node cli.js serve` does the same thing as `npm start`.

## Settings (env)

| Variable | Default | What it does |
|---|---|---|
| `VX_PORT` | `4848` | Port. Pipeline owns 4747, so never use that one. |
| `VX_HOST` | `127.0.0.1` | Bind address. Keep it on localhost. |
| `VX_ALLOWED_HOSTS` | none | Extra host names the page may be opened under, comma separated. `localhost` and `127.0.0.1` always work, on any port, so an SSH tunnel is fine. |
| `VX_STORAGE_ROOT` | `/workspace/video` | Where all media and job data live. Never inside the git repo. |
| `VX_ACTOR` | `cli` | The name the activity log records for CLI actions. The bot should set this. |
| `VX_SCENE_THRESHOLD` | `0.3` | Cut detection sensitivity, 0 to 1. Lower finds more cuts. |
| `VX_MIN_SHOT_SECONDS` | `0.2` | Cuts closer together than this are treated as one. |
| `VX_MAX_UPLOAD_MB` | `8192` | Largest single upload. |
| `VX_WHISPER` | `auto` | Set to `off` to skip the transcript step. |
| `VX_WHISPER_MODEL` | `base` | Local faster-whisper model name or folder. |
| `VX_WHISPER_DIR` | `<storage root>/_models/whisper` | Where local whisper models are kept. |
| `VX_OCR` | `auto` | Set to `off` to skip OCR even if tesseract is installed. |
| `VX_PYTHON` | `<storage root>/_tools/venv/bin/python3` if it exists, else `python3` | Python used for the local transcript helper. |
| `VX_FFMPEG`, `VX_FFPROBE`, `VX_YTDLP`, `VX_TESSERACT` | program names on PATH | Point at a different binary if needed. |
| `VX_FONT_DIR` | `/usr/share/fonts/truetype/sand-box/google` | Where the brand fonts are read from. |

There is no `.env` file and no secret. Nothing here needs a key.

## Storage layout

Everything lives under the storage root, outside git.

```
/workspace/video/
  inbox/                         files dropped for import, waiting for a job
  _queue/                        render queue state and logs, one JSON and one log per render
  _activity.jsonl                activity that is not tied to a job (inbox drops and moves)
  <JOB-ID>/
    job.json                     title, status, notes, edit requests
    trims.json                   saved in and out points
    match-plan.json              slot template and assignments
    activity.jsonl               who did what on this job
    source/                      raw footage, audio, images, .srt captions
    build/                       trims, previews, joins, rough cuts
    out/                         finished pieces
    reference/                   reference videos, analysis only
      references.json            where each reference came from
      <name>.breakdown.json      the breakdown
      <name>.breakdown/          shot keyframes and text-check frames
    .meta/                       probe cache and thumbnails
```

Folders are created as needed. Folders whose names start with `_` are never treated as jobs.

A job id is letters, numbers, dot, dash or underscore, for example `JOB-20261112-OAK-ST-REEL`.

## What the page does

- **Jobs.** Create a job, set its status, keep notes and edit requests.
- **Files.** Drag files onto Source to upload. Every file shows a poster frame plus length, size, frame rate and audio from ffprobe. Click one to play it.
- **Inbox.** Files waiting for a job. Move one into a job as source footage or as a reference.
- **Clips.** Open a source clip, play to a spot, press Set in and Set out, save. Trims are kept as JSON with the job.
- **Renders.** One ffmpeg job at a time. Trim, low-res preview, join the trims, burn in captions from an `.srt`. The log shows on the page.
- **Reference.** Upload a reference or paste a link, run the breakdown, build a match plan, assign your clips to slots, queue a rough cut.
- **Activity.** Every action by the bot or a person, newest first.

## Renders

| Op | What it does | Writes to |
|---|---|---|
| `trim` | One saved trim, re-encoded so the cut is frame accurate | `build/` |
| `preview` | Low-res proxy of a whole clip, short side 360px | `build/` |
| `concat` | The saved trims joined in order. Pass trim ids to pick and order them. | `build/` or `out/` |
| `captions` | Burns in an `.srt` from the job folder or `source/` | `out/` |
| `roughcut` | The assigned match-plan slots joined in slot order | `build/` or `out/` |

A join uses the first clip's frame size and frame rate. Other clips are fitted inside that frame with bars, never cropped or stretched. A clip with no audio gets silence.

Renders never overwrite a file. A second render of the same thing gets `-2` on the end.

The server works the queue in the background. If the server is not running, add `--wait` to a CLI render or run `node cli.js queue run`. A lock file makes sure only one process renders at a time.

## Reference Engine

References are for analysis only. They are studied for structure and pacing. They are never used as footage in a render, never re-published, and never committed. The app enforces this: no render op can read from `reference/`, and only files in `source/` can be assigned to a slot.

### Intake

- Upload a file on the Reference tab, or move one from the inbox as a reference.
- Or paste a link. The link is fetched to `reference/` with yt-dlp. This is the only time the app touches the network, and only when a person or the bot hands it a URL. Only `http` and `https` links are accepted.
- `vx ref add <JOB> <path>` copies a file from the box.

### Breakdown

All local. Saved as `<name>.breakdown.json` and shown on the page with a shot timeline strip.

| Part | How |
|---|---|
| Specs | ffprobe: length, size, frame rate, aspect, audio streams |
| Shots | ffmpeg scene filter at `VX_SCENE_THRESHOLD`. Each shot has start, end, length and a keyframe from its midpoint. |
| Pacing | Average, median, shortest and longest shot. Cuts per 10 seconds. Hook length. |
| Frame and crop | Aspect ratio, orientation, and black bars found with ffmpeg cropdetect |
| Sound | Loudness curve (RMS in 0.1 second windows), overall LUFS, silences, onsets |
| Transcript | Local faster-whisper if it is installed. Otherwise marked not available. |
| On-screen text | Frames sampled across the video. OCR with tesseract if it is installed. Otherwise every sampled frame is kept and flagged for a person to check. |

The rules, so nobody has to guess:

- **Hook length.** The length of the first shot. If the first shot runs longer than 3 seconds, or there are no cuts, the hook is the first 3 seconds.
- **Silence.** Quieter than -35 dB for at least 0.4 seconds.
- **Onset.** A 0.1 second window at least 6 dB louder than the average of the three before it, above -45 dB, and at least 0.25 seconds after the last onset. It is a beat-ish hint, not a beat grid.
- **Text-check frames.** One frame every `length / 24` seconds, at least 1 second apart.

A missing transcript or missing OCR never fails the breakdown. The JSON and the page say "not available" and why.

### Match plan

- One empty slot per reference shot, with the slot length and notes pulled from the breakdown.
- Each slot has a suggested role. Roles are suggestions only: first slot is hook, last slot is cta, 4 seconds or longer (or mostly speech when there is a transcript) is talking head, the rest are b-roll. Change any of them.
- Nothing is filled in for you. A person or the bot assigns a source clip to a slot with in and out points. Leave out the out point and it uses the slot length.
- If a clip's length or shape does not match the slot, the plan says so. It does not fix it silently.
- The rough cut joins only the assigned slots, in order. Empty slots are skipped and listed on the render. Nothing is made up to fill them. With no slots assigned, the rough cut is refused.
- Building a new plan over one that has assignments needs `--force`.

### Local transcript (optional, not installed on this box yet)

No cloud transcription, ever. To add a local one:

```
python3 -m venv /workspace/video/_tools/venv
/workspace/video/_tools/venv/bin/pip install faster-whisper
/workspace/video/_tools/venv/bin/python3 tools/setup_whisper.py base
```

The last step downloads the model once into `/workspace/video/_models/whisper/base`. After that, breakdowns transcribe offline. Run a breakdown again to add the transcript to an old reference.

### OCR (optional, not installed on this box yet)

Install `tesseract` (`apt install tesseract-ocr`). The next breakdown uses it and flags only the frames that have text.

## CLI

Run `node cli.js help` for the full list. Every command prints JSON. Errors print `{"error": "..."}` on stderr and exit non-zero. The CLI works on the storage root directly, so it works whether or not the server is running.

```
# jobs
node cli.js jobs
node cli.js job create JOB-20261112-OAK-ST-REEL --title "Oak Street listing reel" --notes "30 second vertical"
node cli.js job show JOB-20261112-OAK-ST-REEL
node cli.js job set JOB-20261112-OAK-ST-REEL --status in-progress
node cli.js note JOB-20261112-OAK-ST-REEL "Open on the porch" --kind edit-request

# files
node cli.js import /tmp/chat-drop/porch.mp4                                  # into the inbox
node cli.js import /tmp/chat-drop/porch.mp4 --job JOB-20261112-OAK-ST-REEL   # into the job's source/
node cli.js inbox
node cli.js inbox move porch.mp4 --job JOB-20261112-OAK-ST-REEL
node cli.js files JOB-20261112-OAK-ST-REEL --folder source --probe
node cli.js probe JOB-20261112-OAK-ST-REEL source/porch.mp4

# trims and renders
node cli.js trim add JOB-20261112-OAK-ST-REEL porch.mp4 --in 1.5 --out 4 --label "Porch open"
node cli.js render JOB-20261112-OAK-ST-REEL trim --trim T1 --wait
node cli.js render JOB-20261112-OAK-ST-REEL preview --file source/porch.mp4 --wait
node cli.js render JOB-20261112-OAK-ST-REEL concat --trims T1,T2 --dest out --wait
node cli.js render JOB-20261112-OAK-ST-REEL captions --file build/porch-T1.mp4 --wait
node cli.js renders JOB-20261112-OAK-ST-REEL
node cli.js render-status <RENDER-ID>
node cli.js log JOB-20261112-OAK-ST-REEL --limit 20

# Reference Engine
node cli.js ref add JOB-20261112-OAK-ST-REEL /tmp/chat-drop/reference.mp4
node cli.js ref add JOB-20261112-OAK-ST-REEL "https://video.example.com/watch?v=abc"
node cli.js ref list JOB-20261112-OAK-ST-REEL
node cli.js ref breakdown JOB-20261112-OAK-ST-REEL reference.mp4
node cli.js ref show JOB-20261112-OAK-ST-REEL reference.mp4
node cli.js plan create JOB-20261112-OAK-ST-REEL --ref reference.mp4
node cli.js plan show JOB-20261112-OAK-ST-REEL
node cli.js plan assign JOB-20261112-OAK-ST-REEL 1 --source porch.mp4 --in 1.5 --out 3.5
node cli.js plan slot JOB-20261112-OAK-ST-REEL 2 --role "talking head" --notes "use the kitchen take"
node cli.js plan unassign JOB-20261112-OAK-ST-REEL 1
node cli.js plan render JOB-20261112-OAK-ST-REEL --dest build --wait
```

`npm run vx -- jobs` is the same as `node cli.js jobs`.

## How the bot operates it

1. Set `VX_ACTOR=video-engine-bot` so the activity log shows what the bot did.
2. A file Caleb drops in chat: save it to disk, then `vx import <path>` for the inbox or `vx import <path> --job <JOB>` for a job. Add `--move` to move instead of copy.
3. Read state with `vx job show <JOB>`. It returns the job, files, trims, references, the match plan summary and recent renders in one JSON.
4. Queue renders with `--wait` to get the finished render and its log back in one call.
5. Read `vx log <JOB>` to see what happened, including what a person did on the page.
6. A reference link from Caleb: `vx ref add <JOB> <url>`, then `vx ref breakdown`, then `vx plan create`. Assign slots only with clips Caleb or the brief picked. Do not guess at content.

The bot can use the HTTP API instead when the server is up. Send `X-VX-Actor: video-engine-bot`.

## JSON HTTP API

Base URL http://127.0.0.1:4848. Bodies and replies are JSON. Errors are `{"error": "..."}` with a 4xx or 5xx status. Send an `X-VX-Actor` header to name who is acting.

| Method and path | Body or query | Does |
|---|---|---|
| `GET /api/health` | | Is it up, and which storage root |
| `GET /api/jobs` | | List jobs |
| `POST /api/jobs` | `{id, title, notes}` | Create a job |
| `GET /api/jobs/:job` | `?probe=1` | Full job JSON |
| `PATCH /api/jobs/:job` | `{title, status, notes}` | Update a job |
| `POST /api/jobs/:job/notes` | `{text, kind}` | Add a note or edit request (`kind` is `note` or `edit-request`) |
| `PATCH /api/jobs/:job/notes/:note` | `{done}` | Mark an edit request done or open |
| `GET /api/jobs/:job/files` | `?folder=&probe=1` | List files |
| `POST /api/jobs/:job/import` | `{path, folder, move}` | Import a file from a path on the box (`folder` is `source` or `reference`) |
| `PUT /api/jobs/:job/upload` | `?folder=&name=`, raw file body | Upload a file |
| `GET /api/jobs/:job/probe` | `?folder=&name=` | ffprobe metadata |
| `GET /api/jobs/:job/trims` | | List trims |
| `POST /api/jobs/:job/trims` | `{source, in, out, label}` | Save a trim |
| `DELETE /api/jobs/:job/trims/:trim` | | Remove a trim |
| `POST /api/jobs/:job/renders` | `{op, trim, trims, folder, name, srt, dest, wait}` | Queue a render. `wait: true` holds the reply until it finishes. |
| `GET /api/jobs/:job/renders` | | Renders for a job |
| `GET /api/renders` | | All renders |
| `GET /api/renders/:id` | | One render with its log |
| `GET /api/jobs/:job/activity` | `?limit=` | Activity for a job |
| `GET /api/activity` | `?limit=` | All activity |
| `GET /api/inbox` | `?probe=1` | List the inbox |
| `POST /api/inbox/import` | `{path, move}` | Import a file into the inbox |
| `PUT /api/inbox/upload` | `?name=`, raw file body | Upload into the inbox |
| `POST /api/inbox/move` | `{name, job, folder}` | Move an inbox file to a job |
| `GET /api/jobs/:job/references` | | List references |
| `POST /api/jobs/:job/references` | `{path}` or `{url}` | Add a reference from a path or a link |
| `POST /api/jobs/:job/references/:name/breakdown` | | Run the breakdown, reply with the JSON |
| `GET /api/jobs/:job/references/:name/breakdown` | | Read the saved breakdown |
| `GET /api/jobs/:job/match-plan` | | Read the match plan |
| `POST /api/jobs/:job/match-plan` | `{reference, force}` | Create the slot template |
| `PATCH /api/jobs/:job/match-plan/slots/:n` | `{role, notes}` | Set a slot's role or note |
| `PUT /api/jobs/:job/match-plan/slots/:n/assignment` | `{source, in, out}` | Assign a source clip |
| `DELETE /api/jobs/:job/match-plan/slots/:n/assignment` | | Clear a slot |
| `POST /api/jobs/:job/match-plan/render` | `{dest, name, wait}` | Queue the rough cut |

Media is served from the storage root, never from git:

- `GET /media/<JOB>/<folder>/<name>` plays a file. Range requests work, so video scrubs.
- `GET /media/_inbox/<name>` plays an inbox file.
- `GET /thumb/<JOB>/<folder>/<name>` is the poster frame. It is made on first request and cached.

Example:

```
curl -s -X POST http://127.0.0.1:4848/api/jobs -H 'Content-Type: application/json' -H 'X-VX-Actor: video-engine-bot' -d '{"id":"JOB-20261112-OAK-ST-REEL","title":"Oak Street listing reel"}'
curl -s -X PUT --data-binary @porch.mp4 'http://127.0.0.1:4848/api/jobs/JOB-20261112-OAK-ST-REEL/upload?folder=source&name=porch.mp4'
curl -s -X POST http://127.0.0.1:4848/api/jobs/JOB-20261112-OAK-ST-REEL/renders -H 'Content-Type: application/json' -d '{"op":"preview","folder":"source","name":"porch.mp4","wait":true}'
```

## Safety

- Binds to 127.0.0.1. Requests from another website or an unknown host name are refused.
- File names are cleaned on the way in. Paths cannot climb out of a job folder.
- Import by path refuses hidden files and anything inside a hidden folder, so env files and keys cannot be pulled in.
- Uploaded files are only ever sent back as video, audio, image or plain text. Anything else downloads as a file.
- ffmpeg, ffprobe and yt-dlp are run directly with argument lists, never through a shell.
- The page loads nothing from outside. No CDN, no trackers.
- No publishing, posting, email, texts, payments or calendar writes exist in this app.

## Look

Jackson Ink `#14100E`, Southern Ivory `#FBF8F3`, Action Coral `#E87757`, Live Oak `#64694B`, Warm Stone `#8D857B`. Headings in Instrument Serif, body in Nunito.

The fonts are not in git. The server reads them from the box's font folder (`VX_FONT_DIR`) and serves them at `/fonts/`. To bundle them instead, copy the three files into `public/fonts/` as `instrument-serif.ttf`, `instrument-serif-italic.ttf` and `nunito.ttf`. If the fonts are missing the page falls back to Georgia and the system sans.

## Tests

```
npm test
```

No network. All media is generated at test time with ffmpeg into a temp folder and deleted afterwards. The live `/workspace/video` tree is never touched.

- `test/core.test.js`: import, probe, thumbnails, trims, trim, preview, concat and captions renders, notes, activity log.
- `test/cli.test.js`: the CLI round trip. Create job, import, list, probe, trim, queue, wait, read the log.
- `test/reference.test.js`: generates a five-shot clip, adds it as a reference from a path, runs the breakdown and checks that exactly four cuts are found at the right times. Then the match plan, slot assignment, the rough cut, and the guards that keep a reference out of any render. The link path is tested with a local stand-in for yt-dlp.
- `test/server.test.js`: the HTTP API, uploads, range playback, the queue worker, the cross-site guard.
- `test/ui.test.js`: runs the real page script against the real server with a small stand-in DOM and walks every screen. It catches script errors and broken calls. It does not check layout.

## Not in version 1

No timeline editor, no multi-track audio, no music, no cloud storage, no cloud transcription, no login, no publishing. The rough cut does not crop or reframe. Deleting jobs and files is done on disk, not in the app.
