'use strict';
// Jobs, files, notes, trims and the activity log. Everything is plain files under the storage root.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { pipeline } = require('stream/promises');
const config = require('./config');

const FOLDERS = ['source', 'build', 'out', 'reference'];
const JOB_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const STATUSES = ['new', 'in-progress', 'review', 'done', 'archived'];
const NOTE_KINDS = ['note', 'edit-request'];
const KINDS = {
  video: ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.mts'],
  audio: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  captions: ['.srt', '.vtt'],
};

class VxError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const now = () => new Date().toISOString();

function kindOf(name) {
  const ext = path.extname(name).toLowerCase();
  for (const [kind, exts] of Object.entries(KINDS)) if (exts.includes(ext)) return kind;
  return 'other';
}

function sanitizeName(name) {
  let base = path.basename(String(name || '').replace(/\\/g, '/')).normalize('NFKD');
  base = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[.-]+/, '').replace(/-+(\.[A-Za-z0-9]+)$/, '$1');
  if (!base) base = 'file';
  const ext = path.extname(base).slice(0, 12);
  const stem = base.slice(0, base.length - path.extname(base).length).slice(0, 100) || 'file';
  return stem + ext.toLowerCase();
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT' || e instanceof SyntaxError) return fallback;
    throw e;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

function ensureRoot() {
  fs.mkdirSync(config.inbox(), { recursive: true });
}

function jobDir(id) {
  if (typeof id !== 'string' || !JOB_ID.test(id) || id === 'inbox') {
    throw new VxError('Job id must be letters, numbers, dot, dash or underscore, starting with a letter or number (max 64).');
  }
  return path.join(config.root, id);
}

function jobExists(id) {
  try {
    return fs.existsSync(path.join(jobDir(id), 'job.json'));
  } catch {
    return false;
  }
}

// A job.json written by hand or by another tool may be missing fields or use other names.
// Fill in what this app needs and leave everything else in the file untouched.
function normalizeJob(job, id) {
  if (!job || typeof job !== 'object' || Array.isArray(job)) return null;
  job.id = id;
  job.title = typeof job.title === 'string' ? job.title : '';
  job.status = typeof job.status === 'string' && job.status ? job.status : 'new';
  job.notes = typeof job.notes === 'string' ? job.notes : '';
  job.entries = Array.isArray(job.entries) ? job.entries : [];
  job.created = job.created || job.createdAt || null;
  job.updated = job.updated || job.updatedAt || job.created;
  return job;
}

function requireJob(id) {
  const dir = jobDir(id);
  const job = normalizeJob(readJson(path.join(dir, 'job.json'), null), id);
  if (!job) throw new VxError(`No job named ${id}.`, 404);
  return job;
}

function saveJob(job) {
  job.updated = now();
  writeJson(path.join(jobDir(job.id), 'job.json'), job);
  return job;
}

function folderDir(job, folder) {
  if (!FOLDERS.includes(folder)) throw new VxError(`Folder must be one of ${FOLDERS.join(', ')}.`);
  return path.join(jobDir(job), folder);
}

function metaDir(job) {
  return job ? path.join(jobDir(job), '.meta') : path.join(config.inbox(), '.meta');
}

// ---- activity log -------------------------------------------------------

function logActivity(job, action, detail = {}, actor) {
  ensureRoot();
  const entry = { ts: now(), actor: actor || config.actor || 'unknown', job: job || null, action, detail };
  const file = job ? path.join(jobDir(job), 'activity.jsonl') : path.join(config.root, '_activity.jsonl');
  fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  return entry;
}

function readLog(file) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch { /* skip a torn line */ }
  }
  return out;
}

function readActivity(job, limit = 200) {
  let entries;
  if (job) {
    requireJob(job);
    entries = readLog(path.join(jobDir(job), 'activity.jsonl'));
  } else {
    entries = readLog(path.join(config.root, '_activity.jsonl'));
    for (const j of listJobs()) entries.push(...readLog(path.join(jobDir(j.id), 'activity.jsonl')));
  }
  entries.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  return entries.slice(0, Math.max(1, Number(limit) || 200));
}

// ---- jobs ---------------------------------------------------------------

function listJobs() {
  ensureRoot();
  const jobs = [];
  for (const d of fs.readdirSync(config.root, { withFileTypes: true })) {
    if (!d.isDirectory() || !JOB_ID.test(d.name) || d.name === 'inbox') continue;
    const job = normalizeJob(readJson(path.join(config.root, d.name, 'job.json'), null), d.name);
    if (!job) continue;
    const counts = {};
    for (const f of FOLDERS) counts[f] = listFiles(job.id, f).length;
    jobs.push({ id: job.id, title: job.title, status: job.status, created: job.created, updated: job.updated, counts, open_edit_requests: (job.entries || []).filter((e) => e.kind === 'edit-request' && !e.done).length });
  }
  jobs.sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
  return jobs;
}

function createJob({ id, title = '', notes = '' } = {}, actor) {
  ensureRoot();
  const dir = jobDir(String(id || '').trim());
  id = path.basename(dir);
  if (fs.existsSync(path.join(dir, 'job.json'))) throw new VxError(`Job ${id} already exists.`, 409);
  for (const f of FOLDERS) fs.mkdirSync(path.join(dir, f), { recursive: true });
  const job = { id, title: String(title || '').slice(0, 200), status: 'new', notes: String(notes || ''), entries: [], created: now(), updated: now() };
  writeJson(path.join(dir, 'job.json'), job);
  logActivity(id, 'job.create', { title: job.title }, actor);
  return job;
}

function updateJob(id, patch = {}, actor) {
  const job = requireJob(id);
  const changed = {};
  if (patch.title !== undefined) changed.title = job.title = String(patch.title).slice(0, 200);
  if (patch.notes !== undefined) changed.notes = job.notes = String(patch.notes);
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) throw new VxError(`Status must be one of ${STATUSES.join(', ')}.`);
    changed.status = job.status = patch.status;
  }
  if (!Object.keys(changed).length) throw new VxError('Nothing to change. Send title, notes or status.');
  saveJob(job);
  logActivity(id, 'job.update', { changed: Object.keys(changed), status: changed.status }, actor);
  return job;
}

function addNote(id, { text, kind = 'note' } = {}, actor) {
  const job = requireJob(id);
  text = String(text || '').trim();
  if (!text) throw new VxError('Note text is empty.');
  if (!NOTE_KINDS.includes(kind)) throw new VxError(`Kind must be one of ${NOTE_KINDS.join(', ')}.`);
  job.entries = job.entries || [];
  const n = job.entries.reduce((m, e) => Math.max(m, Number(String(e.id).slice(1)) || 0), 0) + 1;
  const entry = { id: `N${n}`, ts: now(), kind, text, actor: actor || config.actor || 'unknown', done: false };
  job.entries.push(entry);
  saveJob(job);
  logActivity(id, kind === 'edit-request' ? 'edit-request.add' : 'note.add', { id: entry.id, text: text.slice(0, 160) }, actor);
  return entry;
}

function setNoteDone(id, noteId, done, actor) {
  const job = requireJob(id);
  const entry = (job.entries || []).find((e) => e.id === noteId);
  if (!entry) throw new VxError(`No note ${noteId} on ${id}.`, 404);
  entry.done = !!done;
  saveJob(job);
  logActivity(id, 'note.done', { id: noteId, done: entry.done }, actor);
  return entry;
}

// ---- files --------------------------------------------------------------

function fileEntry(dir, folder, name) {
  const st = fs.statSync(path.join(dir, name));
  return { name, folder, kind: kindOf(name), size: st.size, modified: st.mtime.toISOString() };
}

function listDir(dir, folder) {
  let names = [];
  try {
    names = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return names
    .filter((d) => d.isFile() && !d.name.startsWith('.'))
    .map((d) => fileEntry(dir, folder, d.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function listFiles(job, folder) {
  const files = listDir(folderDir(job, folder), folder);
  // reference/ also holds breakdown JSON; the file list is the media only
  return folder === 'reference' ? files.filter((f) => ['video', 'audio', 'image'].includes(f.kind)) : files;
}

function listAllFiles(job) {
  requireJob(job);
  const out = {};
  for (const f of FOLDERS) out[f] = listFiles(job, f);
  return out;
}

function listInbox() {
  ensureRoot();
  return listDir(config.inbox(), 'inbox');
}

// Absolute path of a stored file. job=null means the inbox.
function locate(job, folder, name) {
  const dir = job ? folderDir(job, folder) : config.inbox();
  const clean = String(name || '');
  if (!clean || clean !== path.basename(clean) || clean.startsWith('.')) throw new VxError('Bad file name.');
  const abs = path.join(dir, clean);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    throw new VxError(`No file ${clean} in ${job ? `${job}/${folder}` : 'inbox'}.`, 404);
  }
  return abs;
}

// Resolve "/media/<job>/<folder>/<path...>" safely. Nested paths are only used for breakdown thumbnails.
function resolveMedia(job, parts) {
  const base = job === '_inbox' ? config.inbox() : jobDir(job);
  if (job !== '_inbox' && !FOLDERS.includes(parts[0])) throw new VxError('Not found.', 404);
  if (!parts.length || parts.some((p) => !p || p.startsWith('.') || p.includes('/') || p.includes('\\') || p.includes('\0'))) {
    throw new VxError('Not found.', 404);
  }
  const abs = path.resolve(base, ...parts);
  if (!abs.startsWith(base + path.sep)) throw new VxError('Not found.', 404);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new VxError('Not found.', 404);
  return abs;
}

function uniqueName(dir, wanted) {
  const name = sanitizeName(wanted);
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  let candidate = name;
  for (let i = 2; fs.existsSync(path.join(dir, candidate)); i++) candidate = `${stem}-${i}${ext}`;
  return candidate;
}

function destDir(job, folder) {
  ensureRoot();
  if (!job) return config.inbox();
  requireJob(job);
  if (!['source', 'reference'].includes(folder)) throw new VxError('Files can be added to source or reference.');
  const dir = folderDir(job, folder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Copy (or move) a file from anywhere on this machine into the inbox or a job folder.
async function importFile(srcPath, { job = null, folder = 'source', move = false } = {}, actor) {
  if (!srcPath) throw new VxError('Give a file path to import.');
  const src = path.resolve(String(srcPath));
  // Media never lives in dotfiles or hidden folders. Keys and env files do.
  if (src.split(path.sep).some((seg) => seg.length > 1 && seg.startsWith('.'))) throw new VxError('Refusing to import a hidden file or anything inside a hidden folder.');
  let st;
  try {
    st = await fsp.stat(src);
  } catch {
    throw new VxError(`No file at ${src}.`, 404);
  }
  if (!st.isFile()) throw new VxError(`${src} is not a file.`);
  const dir = destDir(job, folder);
  const name = uniqueName(dir, path.basename(src));
  const dest = path.join(dir, name);
  if (move) {
    try {
      await fsp.rename(src, dest);
    } catch (e) {
      if (e.code !== 'EXDEV') throw e;
      await fsp.copyFile(src, dest);
      await fsp.unlink(src);
    }
  } else {
    await fsp.copyFile(src, dest);
  }
  const where = job ? folder : 'inbox';
  logActivity(job, 'file.import', { name, folder: where, from: src, moved: !!move }, actor);
  return fileEntry(dir, where, name);
}

// Stream an upload body to disk.
async function saveUpload(stream, { job = null, folder = 'source', name } = {}, actor) {
  if (!name) throw new VxError('Upload needs a file name (?name=).');
  const dir = destDir(job, folder);
  const finalName = uniqueName(dir, name);
  const part = path.join(dir, `.upload-${process.pid}-${Date.now()}-${finalName}.part`);
  let bytes = 0;
  stream.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > config.maxUploadBytes) stream.destroy(new VxError('Upload is larger than VX_MAX_UPLOAD_MB.', 413));
  });
  try {
    await pipeline(stream, fs.createWriteStream(part));
  } catch (e) {
    await fsp.rm(part, { force: true });
    throw e;
  }
  if (!bytes) {
    await fsp.rm(part, { force: true });
    throw new VxError('Upload was empty.');
  }
  await fsp.rename(part, path.join(dir, finalName));
  const where = job ? folder : 'inbox';
  logActivity(job, 'file.upload', { name: finalName, folder: where, bytes }, actor);
  return fileEntry(dir, where, finalName);
}

async function moveInboxItem(name, { job, folder = 'source' } = {}, actor) {
  const src = locate(null, 'inbox', name);
  if (!job) throw new VxError('Say which job to move it to.');
  const dir = destDir(job, folder);
  const finalName = uniqueName(dir, name);
  await fsp.rename(src, path.join(dir, finalName));
  logActivity(null, 'inbox.move', { name, job, folder, as: finalName }, actor);
  logActivity(job, 'file.from-inbox', { name: finalName, folder }, actor);
  return fileEntry(dir, folder, finalName);
}

// ---- trims --------------------------------------------------------------

function trimsFile(job) {
  return path.join(jobDir(job), 'trims.json');
}

function listTrims(job) {
  requireJob(job);
  return readJson(trimsFile(job), { trims: [] }).trims || [];
}

function checkRange(inPoint, outPoint, duration) {
  const a = Number(inPoint);
  const b = Number(outPoint);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0) throw new VxError('In and out must be numbers of seconds, zero or more.');
  if (b <= a) throw new VxError('Out point must be after the in point.');
  if (Number.isFinite(duration) && duration > 0 && b > duration + 0.05) {
    throw new VxError(`Out point ${b}s is past the end of the clip (${duration.toFixed(2)}s).`);
  }
  return { in: Math.round(a * 1000) / 1000, out: Math.round(b * 1000) / 1000 };
}

// duration is the probed length of the source, passed in by the caller.
function addTrim(job, { source, in: inPoint, out: outPoint, label = '' } = {}, duration, actor) {
  locate(job, 'source', source);
  const range = checkRange(inPoint, outPoint, duration);
  const trims = listTrims(job);
  const n = trims.reduce((m, t) => Math.max(m, Number(String(t.id).slice(1)) || 0), 0) + 1;
  const trim = { id: `T${n}`, source, in: range.in, out: range.out, duration: Math.round((range.out - range.in) * 1000) / 1000, label: String(label || '').slice(0, 120), created: now() };
  trims.push(trim);
  writeJson(trimsFile(job), { job, trims });
  logActivity(job, 'trim.add', { id: trim.id, source, in: trim.in, out: trim.out, label: trim.label }, actor);
  return trim;
}

function removeTrim(job, trimId, actor) {
  const trims = listTrims(job);
  const keep = trims.filter((t) => t.id !== trimId);
  if (keep.length === trims.length) throw new VxError(`No trim ${trimId} on ${job}.`, 404);
  writeJson(trimsFile(job), { job, trims: keep });
  logActivity(job, 'trim.remove', { id: trimId }, actor);
  return { removed: trimId };
}

module.exports = {
  FOLDERS, STATUSES, NOTE_KINDS, VxError, now, kindOf, sanitizeName, readJson, writeJson, ensureRoot,
  jobDir, jobExists, requireJob, folderDir, metaDir, logActivity, readActivity, listJobs, createJob, updateJob,
  addNote, setNoteDone, listFiles, listAllFiles, listInbox, locate, resolveMedia, uniqueName, importFile, saveUpload,
  moveInboxItem, listTrims, checkRange, addTrim, removeTrim,
};
