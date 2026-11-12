'use strict';
// Reference Engine: intake and breakdown. References are for analysis only. They are never
// used as footage in a render and never leave the storage root.
const fs = require('fs');
const path = require('path');
const config = require('./config');
const store = require('./store');
const media = require('./media');
const { VxError } = store;

const ANALYSIS_ONLY_NOTE = 'Analysis only. This reference is studied for structure and pacing. It is never used as footage in an export and never re-published.';
const SCHEMA = 'vx.reference-breakdown/1';
const round3 = (n) => Math.round(n * 1000) / 1000;
const stem = (name) => name.slice(0, name.length - path.extname(name).length);

const indexFile = (job) => path.join(store.folderDir(job, 'reference'), 'references.json');
const breakdownFile = (job, name) => path.join(store.folderDir(job, 'reference'), `${stem(name)}.breakdown.json`);
const assetDirName = (name) => `${stem(name)}.breakdown`;

function readIndex(job) {
  return store.readJson(indexFile(job), { references: {} }).references || {};
}

function register(job, name, origin, actor) {
  const index = readIndex(job);
  index[name] = { name, analysis_only: true, origin, added: store.now(), added_by: actor || config.actor || 'unknown' };
  store.writeJson(indexFile(job), { job, note: ANALYSIS_ONLY_NOTE, references: index });
  store.logActivity(job, 'reference.add', { name, origin, analysis_only: true }, actor);
  return index[name];
}

function describe(job, file, index) {
  const meta = index[file.name] || { name: file.name, analysis_only: true, origin: { type: 'folder' }, added: file.modified };
  const b = store.readJson(breakdownFile(job, file.name), null);
  return {
    ...meta, analysis_only: true, analysis_only_note: ANALYSIS_ONLY_NOTE, kind: file.kind, size: file.size,
    breakdown: b ? { available: true, generated_at: b.generated_at, shot_count: b.shots.length, cut_count: b.cut_count } : { available: false },
  };
}

function listReferences(job) {
  store.requireJob(job);
  const index = readIndex(job);
  return store.listFiles(job, 'reference').map((f) => describe(job, f, index));
}

function getReference(job, name) {
  const ref = listReferences(job).find((r) => r.name === name);
  if (!ref) throw new VxError(`No reference ${name} on ${job}.`, 404);
  return ref;
}

async function addFromPath(job, srcPath, { move = false } = {}, actor) {
  const file = await store.importFile(srcPath, { job, folder: 'reference', move }, actor);
  register(job, file.name, { type: 'path', path: path.resolve(String(srcPath)) }, actor);
  return getReference(job, file.name);
}

// The one place this app touches the network: an explicit URL handed over by the user or the bot.
async function addFromUrl(job, url, actor) {
  store.requireJob(job);
  let parsed;
  try {
    parsed = new URL(String(url));
  } catch {
    throw new VxError('That is not a valid URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new VxError('Reference URL must start with http:// or https://');
  const dir = store.folderDir(job, 'reference');
  fs.mkdirSync(dir, { recursive: true });
  store.logActivity(job, 'reference.fetch', { url: parsed.href }, actor);
  const args = [
    '--no-playlist', '--no-progress', '--restrict-filenames', '--no-overwrites',
    '-f', 'bv*[height<=1080]+ba/b[height<=1080]/b', '--merge-output-format', 'mp4',
    '-P', dir, '-o', '%(title).60B-%(id)s.%(ext)s', '--print', 'after_move:filepath', '--', parsed.href,
  ];
  const r = await media.run(config.ytdlp, args);
  if (r.missing) throw new VxError('yt-dlp is not installed, so links cannot be fetched. Upload the file instead.', 500);
  const saved = r.stdout.trim().split('\n').map((l) => l.trim()).filter((l) => l && fs.existsSync(l)).pop();
  if (r.code !== 0 || !saved) {
    store.logActivity(job, 'reference.fetch-fail', { url: parsed.href, error: media.tail(r.stderr, 2) }, actor);
    throw new VxError(`Could not fetch that link: ${media.tail(r.stderr, 2) || 'yt-dlp gave no file'}`, 502);
  }
  let name = path.basename(saved);
  const clean = store.sanitizeName(name);
  if (clean !== name || path.dirname(saved) !== dir) {
    const finalName = store.uniqueName(dir, clean);
    fs.renameSync(saved, path.join(dir, finalName));
    name = finalName;
  }
  register(job, name, { type: 'url', url: parsed.href }, actor);
  return getReference(job, name);
}

// ---- breakdown steps ----------------------------------------------------

const ff = (args, opts) => media.run(config.ffmpeg, ['-hide_banner', '-nostdin', '-nostats', ...args], opts);

async function detectCuts(abs, duration) {
  const threshold = config.sceneThreshold;
  const r = await ff(['-i', abs, '-an', '-vf', `scale=320:-2,select='gt(scene,${threshold})',metadata=print:file=-`, '-f', 'null', '-'], { keep: 64 * 1024 * 1024 });
  if (r.code !== 0) throw new VxError(`Shot detection failed: ${media.tail(r.stderr, 2)}`, 500);
  const raw = [];
  let t = null;
  for (const line of r.stdout.split('\n')) {
    const m = line.match(/pts_time:([\d.]+)/);
    if (m) t = Number(m[1]);
    const s = line.match(/lavfi\.scene_score=([\d.]+)/);
    if (s && t !== null) {
      raw.push({ t: round3(t), score: round3(Number(s[1])) });
      t = null;
    }
  }
  // Drop cuts that would make a shot shorter than the minimum (flashes, dissolves read as several cuts).
  const cuts = [];
  let last = 0;
  for (const c of raw) {
    if (c.t - last < config.minShotSeconds || duration - c.t < config.minShotSeconds) continue;
    cuts.push(c);
    last = c.t;
  }
  return { cuts, detection: { method: 'ffmpeg scene filter', threshold, min_shot_seconds: config.minShotSeconds, raw_candidates: raw.length } };
}

function buildShots(cuts, duration) {
  const edges = [0, ...cuts.map((c) => c.t), duration];
  const shots = [];
  for (let i = 0; i < edges.length - 1; i++) {
    shots.push({ n: i + 1, start: round3(edges[i]), end: round3(edges[i + 1]), duration: round3(edges[i + 1] - edges[i]), cut_score: i === 0 ? null : cuts[i - 1].score });
  }
  return shots;
}

const HOOK_RULE = 'hook_seconds is the length of the first shot (the time of the first detected cut). If the first shot runs longer than 3 seconds, or there are no cuts, the hook is taken as the first 3 seconds (or the whole clip if shorter).';

function pacing(shots, duration) {
  const lens = shots.map((s) => s.duration).sort((a, b) => a - b);
  const cutCount = shots.length - 1;
  const first = shots[0].duration;
  const firstShotIsHook = cutCount > 0 && first <= 3;
  return {
    shot_count: shots.length,
    cut_count: cutCount,
    avg_shot_seconds: round3(duration / shots.length),
    median_shot_seconds: round3(lens.length % 2 ? lens[(lens.length - 1) / 2] : (lens[lens.length / 2 - 1] + lens[lens.length / 2]) / 2),
    shortest_shot_seconds: lens[0],
    longest_shot_seconds: lens[lens.length - 1],
    cuts_per_10s: duration > 0 ? round3((cutCount / duration) * 10) : 0,
    hook_seconds: firstShotIsHook ? first : round3(Math.min(3, duration)),
    hook_basis: firstShotIsHook ? 'first shot' : 'first 3 seconds',
    hook_rule: HOOK_RULE,
    cuts_in_first_3s: shots.filter((s) => s.n > 1 && s.start <= 3).length,
  };
}

async function pool(items, size, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  }));
}

async function shotThumbs(abs, shots, dir, relDir) {
  await pool(shots, 4, async (s) => {
    const file = `shot-${String(s.n).padStart(3, '0')}.jpg`;
    const at = Math.max(0, s.start + s.duration / 2);
    const r = await ff(['-loglevel', 'error', '-y', '-ss', String(round3(at)), '-i', abs, '-frames:v', '1', '-vf', 'scale=320:-2', '-q:v', '4', path.join(dir, file)]);
    s.thumb_at = round3(at);
    s.thumb = r.code === 0 && fs.existsSync(path.join(dir, file)) ? `${relDir}/${file}` : null;
  });
}

async function aspectNotes(abs, specs) {
  const v = specs.video;
  const out = { ratio: v.aspect.ratio, orientation: v.aspect.orientation, width: v.width, height: v.height, crop: null, notes: [] };
  const label = { portrait: 'Vertical', landscape: 'Horizontal', square: 'Square' }[v.aspect.orientation];
  out.notes.push(`${label} ${v.aspect.ratio} frame, ${v.width}x${v.height}.`);
  if (v.rotation) out.notes.push(`File carries a ${v.rotation} degree rotation flag; sizes above are as displayed.`);
  const r = await ff(['-t', '90', '-i', abs, '-an', '-vf', 'fps=2,cropdetect=limit=24:round=2:reset=0', '-f', 'null', '-']);
  const m = [...r.stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
  if (m) {
    const [w, h, x, y] = m.slice(1).map(Number);
    const bars = w < v.width * 0.97 || h < v.height * 0.97;
    out.crop = { width: w, height: h, x, y, bars };
    if (bars) {
      const inner = media.aspectOf(w, h);
      out.notes.push(`Black bars detected. The picture area is ${w}x${h} (${inner.ratio}) inside the ${v.width}x${v.height} frame, so the content was likely shot or cropped to ${inner.ratio}.`);
    } else {
      out.notes.push('No black bars detected. The picture fills the frame.');
    }
  }
  out.notes.push(`Source clips that are not ${v.aspect.ratio} will need a crop or reframe to match. The rough cut does not crop for you.`);
  return out;
}

const ONSET_RULE = 'Loudness is RMS level in 0.1 second windows. An onset is a window that is at least 6 dB louder than the average of the three windows before it, above -45 dB, and at least 0.25 seconds after the previous onset. It is a beat-ish hint, not a beat grid.';

async function audioAnalysis(abs, specs) {
  if (!specs.audio_streams.length) return { available: false, reason: 'This reference has no audio stream.' };
  const chain = 'ebur128=framelog=verbose,aformat=channel_layouts=mono,aresample=22050,silencedetect=noise=-35dB:d=0.4,asetnsamples=n=2205:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-';
  const r = await ff(['-i', abs, '-vn', '-af', chain, '-f', 'null', '-'], { keep: 64 * 1024 * 1024 });
  if (r.code !== 0) return { available: false, reason: `Audio analysis failed: ${media.tail(r.stderr, 1)}` };
  const rms = [];
  for (const m of r.stdout.matchAll(/RMS_level=(\S+)/g)) {
    const v = Number(m[1]);
    rms.push(Number.isFinite(v) ? Math.max(-90, Math.round(v * 10) / 10) : -90);
  }
  const silences = [];
  let open = null;
  for (const m of r.stderr.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === 'start') open = Number(m[2]);
    else if (open !== null) {
      silences.push({ start: round3(Math.max(0, open)), end: round3(Number(m[2])), duration: round3(Number(m[2]) - Math.max(0, open)) });
      open = null;
    }
  }
  if (open !== null && specs.duration) silences.push({ start: round3(open), end: specs.duration, duration: round3(specs.duration - open) });
  const onsets = [];
  let lastOnset = -1;
  for (let i = 1; i < rms.length; i++) {
    const prev = rms.slice(Math.max(0, i - 3), i);
    const base = prev.reduce((a, b) => a + b, 0) / prev.length;
    const t = round3(i * 0.1);
    if (rms[i] > -45 && rms[i] - base >= 6 && t - lastOnset >= 0.25) {
      onsets.push(t);
      lastOnset = t;
    }
  }
  // keep the saved curve small for long references
  let step = 0.1;
  let curve = rms;
  if (rms.length > 1500) {
    const k = Math.ceil(rms.length / 1500);
    step = round3(0.1 * k);
    curve = [];
    for (let i = 0; i < rms.length; i += k) curve.push(Math.max(...rms.slice(i, i + k)));
  }
  const lufs = r.stderr.match(/I:\s+(-?[\d.]+) LUFS/);
  const lra = r.stderr.match(/LRA:\s+(-?[\d.]+) LU/);
  return {
    available: true,
    integrated_lufs: lufs ? Number(lufs[1]) : null,
    loudness_range_lu: lra ? Number(lra[1]) : null,
    curve: { unit: 'RMS dB', step_seconds: step, values: curve },
    silences, silence_rule: 'Quieter than -35 dB for at least 0.4 seconds.',
    onsets, onset_rule: ONSET_RULE,
  };
}

let whisperCheck = null;
function whisperReady() {
  if (config.whisper === 'off') return Promise.resolve({ ok: false, reason: 'Transcription is switched off (VX_WHISPER=off).' });
  if (!whisperCheck) {
    whisperCheck = media.run(config.python, ['-c', 'import faster_whisper']).then((r) => {
      if (r.code !== 0) return { ok: false, reason: 'No local whisper is installed on this machine (faster-whisper not found). See the README to add one.' };
      const model = fs.existsSync(config.whisperModel) ? config.whisperModel : path.join(config.modelsDir(), config.whisperModel);
      if (!fs.existsSync(model)) return { ok: false, reason: `faster-whisper is installed but no local model was found at ${model}. See the README to download one.` };
      return { ok: true, model };
    });
  }
  return whisperCheck;
}

async function transcript(abs, specs) {
  const none = (reason) => ({ available: false, status: 'not available', reason, segments: [] });
  if (!specs.audio_streams.length) return none('This reference has no audio stream.');
  const ready = await whisperReady();
  if (!ready.ok) return none(ready.reason);
  const r = await media.run(config.python, [path.join(__dirname, '..', 'tools', 'transcribe.py'), abs, ready.model], { keep: 32 * 1024 * 1024 });
  try {
    if (r.code !== 0) throw new Error(media.tail(r.stderr, 1));
    const data = JSON.parse(r.stdout);
    return { available: true, status: 'ok', engine: 'faster-whisper (local)', model: path.basename(ready.model), language: data.language, segments: data.segments, text: data.segments.map((s) => s.text).join(' ').trim() };
  } catch (e) {
    return none(`Local transcription failed: ${e.message}`);
  }
}

let ocrCheck = null;
function ocrReady() {
  if (config.ocr === 'off') return Promise.resolve(false);
  if (!ocrCheck) ocrCheck = media.run(config.tesseract, ['--version']).then((r) => r.code === 0);
  return ocrCheck;
}

async function textFrames(abs, specs, dir, relDir) {
  const duration = specs.duration || 0;
  const interval = round3(Math.max(1, duration / 24));
  const rule = `One frame every ${interval} seconds (at most about 24 per reference).`;
  for (const old of fs.readdirSync(dir)) if (old.startsWith('text-')) fs.rmSync(path.join(dir, old), { force: true });
  await ff(['-loglevel', 'error', '-y', '-i', abs, '-an', '-vf', `fps=1/${interval},scale=480:-2`, '-q:v', '4', path.join(dir, 'text-%03d.jpg')]);
  const files = fs.readdirSync(dir).filter((n) => /^text-\d+\.jpg$/.test(n)).sort();
  const hasOcr = await ocrReady();
  const frames = [];
  for (const [i, file] of files.entries()) {
    const frame = { t: round3(Math.min(duration, i * interval)), thumb: `${relDir}/${file}`, text: null, needs_review: true };
    if (hasOcr) {
      const r = await media.run(config.tesseract, [path.join(dir, file), 'stdout', '--psm', '11']);
      const text = r.code === 0 ? r.stdout.replace(/\s+/g, ' ').trim() : '';
      frame.text = text || null;
      frame.needs_review = text.replace(/[^A-Za-z0-9]/g, '').length >= 4;
    }
    frames.push(frame);
  }
  return {
    ocr: hasOcr ? 'tesseract (local)' : 'not available',
    reason: hasOcr ? null : 'No OCR is installed on this machine (tesseract not found). Every sampled frame is kept and flagged so a person can look for on-screen text.',
    sample_rule: rule,
    flagged_count: frames.filter((f) => f.needs_review).length,
    frames,
  };
}

const running = new Set();

async function runBreakdown(job, name, actor) {
  const ref = getReference(job, name);
  const key = `${job}/${name}`;
  if (running.has(key)) throw new VxError('A breakdown of this reference is already running.', 409);
  running.add(key);
  try {
    const abs = store.locate(job, 'reference', name);
    const specs = await media.probe(job, 'reference', name);
    if (!specs.readable || !specs.video || specs.kind !== 'video' || !specs.duration) throw new VxError(`${name} is not a readable video, so it cannot be broken down.`);
    store.logActivity(job, 'reference.breakdown-start', { name }, actor);
    const relDir = assetDirName(name);
    const dir = path.join(store.folderDir(job, 'reference'), relDir);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const { cuts, detection } = await detectCuts(abs, specs.duration);
    const shots = buildShots(cuts, specs.duration);
    const [, aspect, audio, text, words] = await Promise.all([
      shotThumbs(abs, shots, dir, relDir),
      aspectNotes(abs, specs),
      audioAnalysis(abs, specs),
      textFrames(abs, specs, dir, relDir),
      transcript(abs, specs),
    ]);
    const breakdown = {
      schema: SCHEMA, job, reference: name, analysis_only: true, analysis_only_note: ANALYSIS_ONLY_NOTE,
      origin: ref.origin, generated_at: store.now(), assets_dir: relDir,
      specs: { duration: specs.duration, width: specs.width, height: specs.height, fps: specs.fps, aspect: specs.aspect, video_codec: specs.video.codec, format: specs.format, size: specs.size, audio_streams: specs.audio_streams },
      detection, cut_count: cuts.length, shots,
      pacing: pacing(shots, specs.duration),
      aspect, audio, transcript: words, on_screen_text: text,
    };
    store.writeJson(breakdownFile(job, name), breakdown);
    store.logActivity(job, 'reference.breakdown', { name, shots: shots.length, cuts: cuts.length, transcript: words.status, ocr: text.ocr }, actor);
    return breakdown;
  } catch (e) {
    store.logActivity(job, 'reference.breakdown-fail', { name, error: e.message }, actor);
    throw e;
  } finally {
    running.delete(key);
  }
}

function readBreakdown(job, name) {
  getReference(job, name);
  const b = store.readJson(breakdownFile(job, name), null);
  if (!b) throw new VxError(`No breakdown for ${name} yet. Run the breakdown first.`, 404);
  return b;
}

module.exports = { ANALYSIS_ONLY_NOTE, register, listReferences, getReference, addFromPath, addFromUrl, runBreakdown, readBreakdown };
