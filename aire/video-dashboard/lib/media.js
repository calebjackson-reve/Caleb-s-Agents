'use strict';
// ffprobe metadata and ffmpeg thumbnails, cached under each job's .meta folder.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('./config');
const store = require('./store');
const { VxError } = store;

// Run a local program. Never goes through a shell.
function run(cmd, args, { cwd, onStdout, onStderr, keep = 4 * 1024 * 1024 } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      return resolve({ code: -1, stdout: '', stderr: String(e.message), missing: e.code === 'ENOENT' });
    }
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      if (onStdout) onStdout(d.toString());
      else if (stdout.length < keep) stdout += d;
    });
    child.stderr.on('data', (d) => {
      if (onStderr) onStderr(d.toString());
      stderr += d;
      if (stderr.length > keep) stderr = stderr.slice(-keep / 2);
    });
    child.on('error', (e) => resolve({ code: -1, stdout, stderr: String(e.message), missing: e.code === 'ENOENT' }));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

const tail = (text, n = 12) => String(text || '').trim().split('\n').slice(-n).join('\n');

function ratio(text) {
  if (!text || text === '0/0') return null;
  const [a, b] = String(text).split('/').map(Number);
  if (!Number.isFinite(a)) return null;
  const v = b ? a / b : a;
  return Number.isFinite(v) && v > 0 ? v : null;
}

const COMMON_ASPECTS = [['16:9', 16 / 9], ['9:16', 9 / 16], ['1:1', 1], ['4:5', 4 / 5], ['5:4', 5 / 4], ['4:3', 4 / 3], ['3:4', 3 / 4], ['2:3', 2 / 3], ['3:2', 3 / 2], ['21:9', 21 / 9], ['2.39:1', 2.39]];

function aspectOf(w, h) {
  if (!w || !h) return null;
  const r = w / h;
  let label = null;
  for (const [name, v] of COMMON_ASPECTS) if (Math.abs(r - v) / v < 0.015) label = name;
  if (!label) {
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const g = gcd(w, h);
    label = w / g <= 40 && h / g <= 40 ? `${w / g}:${h / g}` : `${r.toFixed(2)}:1`;
  }
  return { ratio: label, value: Math.round(r * 1000) / 1000, orientation: Math.abs(r - 1) < 0.015 ? 'square' : r > 1 ? 'landscape' : 'portrait' };
}

async function probePath(abs) {
  const r = await run(config.ffprobe, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', abs]);
  if (r.missing) throw new VxError('ffprobe is not installed on this machine.', 500);
  let raw = null;
  try {
    raw = JSON.parse(r.stdout);
  } catch { /* handled below */ }
  const name = path.basename(abs);
  const size = fs.statSync(abs).size;
  if (r.code !== 0 || !raw || !raw.streams) {
    return { name, kind: store.kindOf(name), size, readable: false, error: tail(r.stderr, 3) || 'ffprobe could not read this file', duration: null, video: null, audio_streams: [] };
  }
  const streams = raw.streams;
  const v = streams.find((s) => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic));
  let kind = store.kindOf(name);
  if (kind === 'other' || kind === 'captions') kind = v ? 'video' : streams.some((s) => s.codec_type === 'audio') ? 'audio' : kind;
  let duration = Number(raw.format && raw.format.duration);
  if (!Number.isFinite(duration) || kind === 'image') duration = null;
  let video = null;
  if (v) {
    let rotation = Number(v.tags && v.tags.rotate) || 0;
    for (const sd of v.side_data_list || []) if (Number.isFinite(Number(sd.rotation))) rotation = Number(sd.rotation);
    const turned = Math.abs(rotation) % 180 === 90;
    const dw = turned ? v.height : v.width;
    const dh = turned ? v.width : v.height;
    const fps = kind === 'image' ? null : ratio(v.avg_frame_rate) || ratio(v.r_frame_rate);
    video = { codec: v.codec_name, width: dw, height: dh, coded_width: v.width, coded_height: v.height, rotation, fps: fps ? Math.round(fps * 100) / 100 : null, pix_fmt: v.pix_fmt || null, aspect: aspectOf(dw, dh) };
  }
  const audio_streams = streams.filter((s) => s.codec_type === 'audio').map((s) => ({
    index: s.index, codec: s.codec_name, channels: s.channels || null, channel_layout: s.channel_layout || null,
    sample_rate: Number(s.sample_rate) || null, language: (s.tags && s.tags.language) || null,
  }));
  return {
    name, kind, size, readable: true,
    format: raw.format ? raw.format.format_name : null,
    duration: duration === null ? null : Math.round(duration * 1000) / 1000,
    bit_rate: Number(raw.format && raw.format.bit_rate) || null,
    video,
    width: video ? video.width : null,
    height: video ? video.height : null,
    fps: video ? video.fps : null,
    aspect: video && video.aspect ? video.aspect.ratio : null,
    audio_streams,
  };
}

function cacheKey(folder, name) {
  return `${folder}__${name}`;
}

// Probe a stored file (job=null means the inbox). Cached until the file changes.
async function probe(job, folder, name) {
  const abs = store.locate(job, folder, name);
  const st = fs.statSync(abs);
  const cacheFile = path.join(store.metaDir(job), 'probe', cacheKey(folder, name) + '.json');
  const cached = store.readJson(cacheFile, null);
  if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) return cached.data;
  const data = await probePath(abs);
  data.folder = folder;
  try {
    store.writeJson(cacheFile, { mtimeMs: st.mtimeMs, size: st.size, data });
  } catch { /* cache is best effort */ }
  return data;
}

// Poster frame (video), scaled copy (image) or waveform picture (audio). Returns the jpg path or null.
async function thumb(job, folder, name) {
  const abs = store.locate(job, folder, name);
  const st = fs.statSync(abs);
  const dir = path.join(store.metaDir(job), 'thumbs');
  const out = path.join(dir, `${cacheKey(folder, name)}.${Math.round(st.mtimeMs)}.jpg`);
  if (fs.existsSync(out)) return out;
  const info = await probe(job, folder, name);
  if (!info.readable) return null;
  fs.mkdirSync(dir, { recursive: true });
  const base = ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y'];
  let args;
  if (info.kind === 'video' && info.video) {
    const at = Math.max(0, Math.min(1, (info.duration || 0) / 2));
    args = [...base, '-ss', String(at), '-i', abs, '-frames:v', '1', '-vf', 'scale=480:-2', '-q:v', '4', out];
  } else if (info.kind === 'image') {
    args = [...base, '-i', abs, '-frames:v', '1', '-vf', "scale='min(480,iw)':-2", '-q:v', '4', out];
  } else if (info.audio_streams.length) {
    args = [...base, '-i', abs, '-filter_complex', 'aformat=channel_layouts=mono,showwavespic=s=480x270:colors=0xE87757', '-frames:v', '1', '-q:v', '4', out];
  } else {
    return null;
  }
  const r = await run(config.ffmpeg, args);
  if (r.code !== 0 || !fs.existsSync(out)) return null;
  for (const old of fs.readdirSync(dir)) {
    if (old.startsWith(cacheKey(folder, name) + '.') && path.join(dir, old) !== out) fs.rmSync(path.join(dir, old), { force: true });
  }
  return out;
}

module.exports = { run, tail, probePath, probe, thumb, aspectOf };
