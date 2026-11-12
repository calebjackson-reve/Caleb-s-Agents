'use strict';
// Render queue. One ffmpeg job at a time, state kept as files under <storage root>/_queue.
// The server works the queue in the background; the CLI can work it too (--wait). A lock file
// makes sure only one process renders at a time.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('./config');
const store = require('./store');
const media = require('./media');
const { VxError } = store;

const OPS = ['trim', 'preview', 'concat', 'captions', 'roughcut'];
// Reference videos are analysis only. No render op may read from reference/.
const RENDER_INPUT_FOLDERS = ['source', 'build', 'out'];

const recFile = (id) => path.join(config.queueDir(), `${id}.json`);
const logFile = (id) => path.join(config.queueDir(), `${id}.log`);
const lockFile = () => path.join(config.queueDir(), 'worker.lock');
const stem = (name) => name.slice(0, name.length - path.extname(name).length);
const round3 = (n) => Math.round(n * 1000) / 1000;

function checkId(id) {
  if (!/^R[a-z0-9]+-[a-z0-9]+$/.test(String(id))) throw new VxError('Bad render id.', 404);
  return id;
}

function get(id) {
  const rec = store.readJson(recFile(checkId(id)), null);
  if (!rec) throw new VxError(`No render ${id}.`, 404);
  return rec;
}

function save(rec) {
  store.writeJson(recFile(rec.id), rec);
  return rec;
}

function list({ job, limit = 100 } = {}) {
  let names = [];
  try {
    names = fs.readdirSync(config.queueDir()).filter((n) => /^R.*\.json$/.test(n));
  } catch {
    return [];
  }
  const recs = names.map((n) => store.readJson(path.join(config.queueDir(), n), null)).filter(Boolean);
  recs.sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : a.id < b.id ? 1 : -1));
  return recs.filter((r) => !job || r.job === job).slice(0, limit);
}

function readLog(id) {
  try {
    return fs.readFileSync(logFile(checkId(id)), 'utf8');
  } catch {
    return '';
  }
}

function appendLog(id, text) {
  fs.appendFileSync(logFile(id), text.endsWith('\n') ? text : text + '\n');
}

function trimSegments(job, ids) {
  const trims = store.listTrims(job);
  const chosen = ids && ids.length ? ids.map((id) => {
    const t = trims.find((x) => x.id === id);
    if (!t) throw new VxError(`No trim ${id} on ${job}.`, 404);
    return t;
  }) : trims;
  if (!chosen.length) throw new VxError('No saved trims to render. Save a trim first.');
  for (const t of chosen) store.locate(job, 'source', t.source);
  return chosen.map((t) => ({ folder: 'source', source: t.source, in: t.in, out: t.out, trim: t.id }));
}

function outputName(job, folder, wanted) {
  const dir = store.folderDir(job, folder);
  fs.mkdirSync(dir, { recursive: true });
  const taken = new Set(list({ job, limit: 1000 }).filter((r) => ['queued', 'running'].includes(r.status) && r.output.folder === folder).map((r) => r.output.name));
  let name = store.uniqueName(dir, wanted);
  const ext = path.extname(name);
  for (let i = 2; taken.has(name); i++) name = store.uniqueName(dir, `${stem(store.sanitizeName(wanted))}-${i}${ext}`);
  return name;
}

// Work out exactly what a render will do, so bad requests fail when queued, not later.
async function plan(job, op, params) {
  const dest = params.dest === undefined ? null : params.dest;
  if (dest && !['build', 'out'].includes(dest)) throw new VxError('dest must be build or out.');
  if (op === 'trim') {
    if (!params.trim) throw new VxError('Say which trim to render (trim id).');
    const segments = trimSegments(job, [params.trim]);
    const info = await media.probe(job, 'source', segments[0].source);
    const ext = info.video && info.kind !== 'audio' ? '.mp4' : '.m4a';
    return { segments, output: { folder: 'build', name: outputName(job, 'build', `${stem(segments[0].source)}-${params.trim}${ext}`) } };
  }
  if (op === 'concat') {
    const ids = Array.isArray(params.trims) ? params.trims : typeof params.trims === 'string' && params.trims ? params.trims.split(',') : null;
    const segments = trimSegments(job, ids);
    const folder = dest || 'build';
    return { segments, output: { folder, name: outputName(job, folder, params.name || `${job}-concat.mp4`) } };
  }
  if (op === 'roughcut') {
    const mp = require('./matchplan');
    const { segments, skipped, reference } = mp.planSegments(job);
    if (!segments.length) throw new VxError('No slots are assigned yet, so there is nothing to cut. Assign source clips to slots first.');
    const folder = dest || 'build';
    return { segments, skipped_slots: skipped, reference, output: { folder, name: outputName(job, folder, params.name || `${job}-roughcut.mp4`) } };
  }
  if (op === 'preview' || op === 'captions') {
    const folder = params.folder || 'source';
    if (!RENDER_INPUT_FOLDERS.includes(folder)) throw new VxError('Reference videos are analysis only and cannot be rendered. Pick a file from source, build or out.');
    store.locate(job, folder, params.name);
    const info = await media.probe(job, folder, params.name);
    if (!info.video || info.kind !== 'video') throw new VxError(`${params.name} is not a video.`);
    if (op === 'preview') {
      return { input: { folder, name: params.name }, output: { folder: 'build', name: outputName(job, 'build', `${stem(params.name)}-preview.mp4`) } };
    }
    const srt = findSrt(job, params.srt);
    return { input: { folder, name: params.name }, srt, output: { folder: 'out', name: outputName(job, 'out', `${stem(params.name)}-captioned.mp4`) } };
  }
  throw new VxError(`Render op must be one of ${OPS.join(', ')}.`);
}

// Captions come from an .srt in the job folder (job root first, then source/).
function findSrt(job, wanted) {
  const places = [store.jobDir(job), store.folderDir(job, 'source')];
  for (const dir of places) {
    let names = [];
    try {
      names = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.srt') && !n.startsWith('.'));
    } catch { /* folder may not exist */ }
    const hit = wanted ? names.find((n) => n === path.basename(String(wanted))) : names.sort()[0];
    if (hit) return path.join(dir, hit);
  }
  throw new VxError(wanted ? `No ${wanted} in the job folder or source/.` : 'No .srt file in the job folder or source/. Add one to burn in captions.', 404);
}

function listSrt(job) {
  const out = [];
  for (const dir of [store.jobDir(job), store.folderDir(job, 'source')]) {
    try {
      out.push(...fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.srt') && !n.startsWith('.')));
    } catch { /* none */ }
  }
  return [...new Set(out)];
}

let seq = 0;
async function enqueue(job, op, params = {}, actor) {
  store.requireJob(job);
  if (!OPS.includes(op)) throw new VxError(`Render op must be one of ${OPS.join(', ')}.`);
  const planned = await plan(job, op, params);
  fs.mkdirSync(config.queueDir(), { recursive: true });
  const id = `R${Date.now().toString(36)}${(seq++ % 36).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const rec = {
    id, job, op, status: 'queued', progress: 0, created: store.now(), started: null, finished: null,
    actor: actor || config.actor || 'unknown', params, ...planned, error: null,
  };
  save(rec);
  appendLog(id, `[${rec.created}] queued ${op} for ${job} by ${rec.actor} -> ${rec.output.folder}/${rec.output.name}`);
  if (rec.skipped_slots && rec.skipped_slots.length) appendLog(id, `skipping unassigned slots: ${rec.skipped_slots.join(', ')} (nothing is made up to fill them)`);
  store.logActivity(job, 'render.queue', { id, op, output: `${rec.output.folder}/${rec.output.name}`, skipped_slots: rec.skipped_slots }, actor);
  kick();
  return rec;
}

// ---- ffmpeg command lines ----------------------------------------------

const even = (n) => Math.max(2, Math.floor(n / 2) * 2);
const ENCODE_V = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p'];

async function segmentArgs(rec) {
  const segs = [];
  for (const s of rec.segments) {
    if (!RENDER_INPUT_FOLDERS.includes(s.folder || 'source')) throw new VxError('Reference videos cannot be used as footage.');
    const abs = store.locate(rec.job, s.folder || 'source', s.source);
    segs.push({ ...s, abs, dur: round3(s.out - s.in), info: await media.probe(rec.job, s.folder || 'source', s.source) });
  }
  const total = segs.reduce((n, s) => n + s.dur, 0);
  const hasVideo = (s) => s.info.video && s.info.kind === 'video';
  if (segs.length === 1 && !hasVideo(segs[0])) {
    if (!segs[0].info.audio_streams.length) throw new VxError(`${segs[0].source} has no video or audio to trim.`);
    return { total, args: ['-ss', String(segs[0].in), '-t', String(segs[0].dur), '-i', segs[0].abs, '-vn', '-c:a', 'aac', '-b:a', '192k'] };
  }
  const bad = segs.find((s) => !hasVideo(s));
  if (bad) throw new VxError(`${bad.source} is not a video, so it cannot go into a cut.`);
  const W = even(segs[0].info.width);
  const H = even(segs[0].info.height);
  const fps = Math.min(60, Math.max(1, Math.round(segs[0].info.fps || 30)));
  const args = [];
  for (const s of segs) args.push('-ss', String(s.in), '-t', String(s.dur), '-i', s.abs);
  const filters = [];
  let extra = segs.length;
  segs.forEach((s, i) => {
    filters.push(`[${i}:v:0]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=yuv420p,setpts=PTS-STARTPTS[v${i}]`);
    let a = `${i}:a:0`;
    if (!s.info.audio_streams.length) {
      args.push('-f', 'lavfi', '-t', String(s.dur), '-i', 'anullsrc=r=48000:cl=stereo');
      a = `${extra++}:a:0`;
    }
    filters.push(`[${a}]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS[a${i}]`);
  });
  filters.push(`${segs.map((_, i) => `[v${i}][a${i}]`).join('')}concat=n=${segs.length}:v=1:a=1[v][a]`);
  args.push('-filter_complex', filters.join(';'), '-map', '[v]', '-map', '[a]', ...ENCODE_V, '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart');
  return { total, args };
}

async function buildCommand(rec, workDir) {
  if (rec.segments) return segmentArgs(rec);
  if (!RENDER_INPUT_FOLDERS.includes(rec.input.folder)) throw new VxError('Reference videos cannot be used as footage.');
  const abs = store.locate(rec.job, rec.input.folder, rec.input.name);
  const info = await media.probe(rec.job, rec.input.folder, rec.input.name);
  const audio = info.audio_streams.length ? ['-c:a', 'aac', '-b:a', rec.op === 'preview' ? '96k' : '160k', '-ac', '2'] : ['-an'];
  if (rec.op === 'preview') {
    const fps = Math.min(30, Math.max(1, Math.round(info.fps || 30)));
    // short side down to 360px; never scale a small clip up
    const f = Math.min(1, 360 / Math.min(info.width, info.height));
    const vf = `scale=${even(info.width * f)}:${even(info.height * f)},fps=${fps}`;
    return { total: info.duration || 0, args: ['-i', abs, '-vf', vf, ...ENCODE_V, '-crf', '30', ...audio, '-movflags', '+faststart'] };
  }
  // captions: copy the .srt next to the work dir so no path escaping is needed in the filter
  fs.mkdirSync(workDir, { recursive: true });
  fs.copyFileSync(rec.srt, path.join(workDir, 'captions.srt'));
  return { total: info.duration || 0, cwd: workDir, args: ['-i', abs, '-vf', "subtitles=captions.srt:force_style='FontName=Nunito,Outline=1.2'", ...ENCODE_V, '-crf', '20', ...audio, '-movflags', '+faststart'] };
}

function runFfmpeg(rec, args, total, cwd) {
  return new Promise((resolve) => {
    const child = spawn(config.ffmpeg, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let lastWrite = 0;
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
      const m = [...buf.matchAll(/out_time_(?:us|ms)=(\d+)/g)].pop();
      buf = buf.slice(-200);
      if (m && total > 0 && Date.now() - lastWrite > 700) {
        lastWrite = Date.now();
        rec.progress = Math.min(0.99, Math.round((Number(m[1]) / 1e6 / total) * 100) / 100);
        save(rec);
      }
    });
    child.stderr.on('data', (d) => appendLog(rec.id, d.toString()));
    child.on('error', (e) => resolve({ code: -1, error: e.code === 'ENOENT' ? 'ffmpeg is not installed on this machine.' : e.message }));
    child.on('close', (code) => resolve({ code }));
  });
}

async function runOne(rec) {
  rec.status = 'running';
  rec.started = store.now();
  rec.worker_pid = process.pid;
  save(rec);
  const outDir = store.folderDir(rec.job, rec.output.folder);
  const part = path.join(outDir, `.render-${rec.id}.part`);
  const workDir = path.join(config.queueDir(), `${rec.id}.work`);
  try {
    store.requireJob(rec.job);
    fs.mkdirSync(outDir, { recursive: true });
    const cmd = await buildCommand(rec, workDir);
    const args = ['-hide_banner', '-nostdin', '-y', '-nostats', '-loglevel', 'warning', '-progress', 'pipe:1', ...cmd.args, '-f', 'mp4', part];
    appendLog(rec.id, `[${rec.started}] ffmpeg ${args.map((a) => (/[\s;'\[\]]/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
    const r = await runFfmpeg(rec, args, cmd.total, cmd.cwd);
    if (r.code !== 0) throw new Error(r.error || `ffmpeg exited with code ${r.code}. See the log.`);
    const final = path.join(outDir, rec.output.name);
    fs.renameSync(part, final);
    const info = await media.probe(rec.job, rec.output.folder, rec.output.name);
    rec.output.duration = info.duration;
    rec.output.size = info.size;
    rec.status = 'done';
    rec.progress = 1;
    rec.finished = store.now();
    save(rec);
    appendLog(rec.id, `[${rec.finished}] done: ${rec.output.folder}/${rec.output.name} (${info.duration}s)`);
    store.logActivity(rec.job, 'render.done', { id: rec.id, op: rec.op, output: `${rec.output.folder}/${rec.output.name}`, duration: info.duration, skipped_slots: rec.skipped_slots }, rec.actor);
  } catch (e) {
    fs.rmSync(part, { force: true });
    rec.status = 'failed';
    rec.error = e.message;
    rec.finished = store.now();
    save(rec);
    appendLog(rec.id, `[${rec.finished}] failed: ${e.message}`);
    try {
      store.logActivity(rec.job, 'render.fail', { id: rec.id, op: rec.op, error: e.message }, rec.actor);
    } catch { /* job folder may be gone */ }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
  return rec;
}

// ---- worker and lock ----------------------------------------------------

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function acquireLock() {
  fs.mkdirSync(config.queueDir(), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(lockFile(), String(process.pid), { flag: 'wx' });
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const holder = Number(fs.readFileSync(lockFile(), 'utf8').trim());
      if (holder && holder !== process.pid && pidAlive(holder)) return false;
      fs.rmSync(lockFile(), { force: true }); // stale lock from a process that died
    }
  }
  return false;
}

let busy = false;
// Render everything that is queued, oldest first. Returns false if another process holds the lock.
async function processQueue() {
  if (busy) return false;
  busy = true;
  try {
    if (!acquireLock()) return false;
    try {
      for (const rec of list({ limit: 10000 }).filter((r) => r.status === 'running')) {
        rec.status = 'failed'; // we hold the only lock, so nothing is really running it
        rec.error = 'Interrupted: the process that was rendering this stopped.';
        rec.finished = store.now();
        save(rec);
      }
      for (;;) {
        const next = list({ limit: 10000 }).filter((r) => r.status === 'queued').pop();
        if (!next) break;
        await runOne(next);
      }
    } finally {
      fs.rmSync(lockFile(), { force: true });
    }
    return true;
  } finally {
    busy = false;
  }
}

let workerOn = false;
let timer = null;
function kick() {
  if (workerOn) setImmediate(() => processQueue().catch(() => {}));
}
function startWorker() {
  workerOn = true;
  timer = setInterval(() => processQueue().catch(() => {}), 1000);
  timer.unref();
  kick();
}
function stopWorker() {
  workerOn = false;
  if (timer) clearInterval(timer);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wait for one render to finish. If nobody else is working the queue, work it here.
async function waitFor(id, { timeoutMs = 6 * 60 * 60 * 1000 } = {}) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    let rec = get(id);
    if (rec.status === 'done' || rec.status === 'failed') return rec;
    await processQueue();
    rec = get(id);
    if (rec.status === 'done' || rec.status === 'failed') return rec;
    if (Date.now() > until) throw new VxError(`Timed out waiting for render ${id}.`, 504);
    await sleep(300);
  }
}

module.exports = { OPS, enqueue, list, get, readLog, listSrt, processQueue, startWorker, stopWorker, waitFor };
