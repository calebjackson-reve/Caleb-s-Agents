#!/usr/bin/env node
'use strict';
// vx: the headless way to run the Video Engine dashboard. Same actions as the web UI and the
// HTTP API, straight against the storage root. Prints JSON. Works whether or not the server is up.
const config = require('./lib/config');

const HELP = `vx - Video Engine dashboard CLI (prints JSON)

Jobs
  vx jobs                                         list jobs
  vx job create <JOB> [--title T] [--notes N]     create a job and its folders
  vx job show <JOB> [--probe]                     full job JSON (files, trims, references, renders)
  vx job set <JOB> [--title T] [--status S] [--notes N]
  vx note <JOB> <text> [--kind note|edit-request] add a note or an edit request
  vx note done <JOB> <NOTE-ID> [--undo]

Files
  vx import <path> [--job JOB] [--folder source|reference] [--move]   no --job = inbox
  vx files <JOB> [--folder source|build|out|reference] [--probe]
  vx probe <JOB> <folder>/<name>                  ffprobe metadata for a stored file
  vx probe --path <file>                          ffprobe metadata for any file on this machine
  vx inbox [--probe]                              list the inbox
  vx inbox move <name> --job JOB [--folder source|reference]

Trims and renders
  vx trim add <JOB> <source-name> --in 1.5 --out 4 [--label L]
  vx trim list <JOB>
  vx trim rm <JOB> <TRIM-ID>
  vx render <JOB> trim --trim T1 [--wait]
  vx render <JOB> preview --file source/clip.mp4 [--wait]
  vx render <JOB> concat [--trims T1,T2] [--dest build|out] [--name file.mp4] [--wait]
  vx render <JOB> captions --file build/cut.mp4 [--srt captions.srt] [--wait]
  vx renders [JOB]                                list renders
  vx render-status <RENDER-ID>                    one render with its log
  vx queue run                                    work the queue here (when the server is not running)

Reference Engine (references are analysis only)
  vx ref add <JOB> <path-or-url> [--move]         a URL is fetched with yt-dlp
  vx ref list <JOB>
  vx ref breakdown <JOB> <name>                   run the breakdown, print the JSON
  vx ref show <JOB> <name>                        read the saved breakdown JSON
  vx plan create <JOB> --ref <name> [--force]     slot template from the breakdown
  vx plan show <JOB>
  vx plan slot <JOB> <N> [--role R] [--notes N]
  vx plan assign <JOB> <N> --source clip.mp4 [--in 0] [--out 2.5]
  vx plan unassign <JOB> <N>
  vx plan render <JOB> [--dest build|out] [--name file.mp4] [--wait]

Other
  vx log [JOB] [--limit 50]                       activity log, newest first
  vx serve                                        start the web dashboard
  --actor NAME on any command (or VX_ACTOR) sets who the activity log says did it.

Storage root: ${config.root} (VX_STORAGE_ROOT)`;

const BOOLEAN_FLAGS = new Set(['wait', 'move', 'probe', 'force', 'undo', 'help']);

function parse(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, inline] = a.slice(2).split(/=(.*)/s);
      if (inline !== undefined) flags[k] = inline;
      else if (BOOLEAN_FLAGS.has(k) || i + 1 >= argv.length) flags[k] = true;
      else flags[k] = argv[++i];
    } else pos.push(a);
  }
  return { pos, flags };
}

function fail(message) {
  const e = new Error(message);
  e.usage = true;
  throw e;
}

function splitFile(spec) {
  const i = String(spec || '').indexOf('/');
  if (i < 1) fail('Give the file as <folder>/<name>, for example source/clip.mp4.');
  return { folder: spec.slice(0, i), name: spec.slice(i + 1) };
}

// Turn a command line into [action name, arguments].
function route(pos, f) {
  const [a, b, c, d] = pos;
  const need = (v, what) => (v === undefined || v === true ? fail(`Missing ${what}. Run "vx help".`) : v);
  switch (a) {
    case 'jobs': return ['jobs.list', {}];
    case 'job':
      if (b === 'create') return ['job.create', { id: need(c, 'job id'), title: f.title, notes: f.notes }];
      if (b === 'show') return ['job.get', { job: need(c, 'job id'), probe: f.probe }];
      if (b === 'set') return ['job.update', { job: need(c, 'job id'), title: f.title, status: f.status, notes: f.notes }];
      break;
    case 'note':
      if (b === 'done') return ['note.done', { job: need(c, 'job id'), note: need(d, 'note id'), done: !f.undo }];
      return ['note.add', { job: need(b, 'job id'), text: need(pos.slice(2).join(' ') || undefined, 'note text'), kind: f.kind || 'note' }];
    case 'import': return ['file.import', { path: need(b, 'file path'), job: f.job, folder: f.folder, move: f.move }];
    case 'files': return ['files.list', { job: need(b, 'job id'), folder: f.folder, probe: f.probe }];
    case 'probe':
      if (f.path) return ['probe', { path: f.path }];
      return ['probe', { job: need(b, 'job id'), ...splitFile(need(c, 'file')) }];
    case 'inbox':
      if (b === 'move') return ['inbox.move', { name: need(c, 'file name'), job: need(f.job, '--job'), folder: f.folder }];
      if (!b) return ['inbox.list', { probe: f.probe }];
      break;
    case 'trim':
      if (b === 'add') return ['trim.add', { job: need(c, 'job id'), source: need(d, 'source file name'), in: need(f.in, '--in'), out: need(f.out, '--out'), label: f.label }];
      if (b === 'list') return ['trims.list', { job: need(c, 'job id') }];
      if (b === 'rm') return ['trim.remove', { job: need(c, 'job id'), trim: need(d, 'trim id') }];
      break;
    case 'render': {
      const args = { job: need(b, 'job id'), op: need(c, 'render op (trim, preview, concat, captions)'), wait: f.wait, trim: f.trim, trims: f.trims, dest: f.dest, srt: f.srt };
      if (f.name) args.name = f.name;
      if (c === 'preview' || c === 'captions') Object.assign(args, splitFile(need(f.file, '--file')));
      return ['render.queue', args];
    }
    case 'renders': return ['renders.list', { job: b, limit: f.limit }];
    case 'render-status': return ['render.get', { id: need(b, 'render id') }];
    case 'queue':
      if (b === 'run') return ['queue.run', {}];
      break;
    case 'log': return ['activity', { job: b, limit: f.limit }];
    case 'ref': {
      const job = need(c, 'job id');
      if (b === 'add') {
        const target = need(d, 'path or URL');
        return ['ref.add', /^[a-z][a-z0-9+.-]*:\/\//i.test(target) ? { job, url: target } : { job, path: target, move: f.move }];
      }
      if (b === 'list') return ['ref.list', { job }];
      if (b === 'breakdown') return ['ref.breakdown', { job, name: need(d, 'reference name') }];
      if (b === 'show') return ['ref.get-breakdown', { job, name: need(d, 'reference name') }];
      break;
    }
    case 'plan': {
      const job = need(c, 'job id');
      if (b === 'create') return ['plan.create', { job, reference: need(f.ref, '--ref'), force: f.force }];
      if (b === 'show') return ['plan.get', { job }];
      if (b === 'slot') return ['plan.slot', { job, slot: need(d, 'slot number'), role: f.role, notes: f.notes }];
      if (b === 'assign') return ['plan.assign', { job, slot: need(d, 'slot number'), source: need(f.source, '--source'), in: f.in, out: f.out }];
      if (b === 'unassign') return ['plan.unassign', { job, slot: need(d, 'slot number') }];
      if (b === 'render') return ['plan.render', { job, dest: f.dest, name: f.name, wait: f.wait }];
      break;
    }
    default:
  }
  return fail(`Unknown command "${pos.join(' ')}". Run "vx help".`);
}

async function main(argv) {
  const { pos, flags } = parse(argv);
  if (!pos.length || pos[0] === 'help' || flags.help) {
    console.log(HELP);
    return 0;
  }
  if (pos[0] === 'serve') {
    const server = await require('./server').start();
    console.log(`Video Engine dashboard: http://${server.address().address}:${server.address().port}`);
    return null; // keep running
  }
  try {
    const [action, args] = route(pos, flags);
    const actor = (typeof flags.actor === 'string' && flags.actor) || config.actor || 'cli';
    const result = await require('./lib/actions').act(action, args, actor);
    console.log(JSON.stringify(result, null, 2));
    if (!flags.wait && result && result.status === 'queued') {
      console.error('Queued. The dashboard server renders it if it is running. Otherwise add --wait, or run: vx queue run');
    }
    return result && result.status === 'failed' ? 2 : 0;
  } catch (e) {
    if (!e.usage && !e.status) throw e;
    console.error(JSON.stringify({ error: e.message }));
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => {
  if (code !== null) process.exitCode = code;
}).catch((e) => {
  console.error(JSON.stringify({ error: e.message }));
  process.exitCode = 1;
});
