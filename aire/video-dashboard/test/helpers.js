'use strict';
// Test helpers. All media is generated here with ffmpeg at test time, into a temp folder that
// is deleted afterwards. Nothing is fetched from the network and nothing is committed.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const APP = path.join(__dirname, '..');

function tempRoot(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `vx-test-${tag}-`));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// The live tree must never be touched by tests.
function useTempRoot(tag) {
  const root = tempRoot(tag);
  process.env.VX_STORAGE_ROOT = path.join(root, 'storage');
  process.env.VX_WHISPER = 'off';
  process.env.VX_OCR = 'off';
  process.env.VX_ACTOR = '';
  return root;
}

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
}

// testsrc picture + sine tone, a few seconds long.
function makeClip(file, { seconds = 4, size = '640x480', audio = true } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const args = ['-f', 'lavfi', '-i', `testsrc=s=${size}:r=25:d=${seconds}`];
  if (audio) args.push('-f', 'lavfi', '-i', `sine=f=440:d=${seconds}`);
  args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p');
  if (audio) args.push('-c:a', 'aac', '-shortest');
  ffmpeg([...args, file]);
  return file;
}

// Five visually different scenes joined end to end: 4 cuts, at 2.0, 3.5, 6.0 and 7.0 seconds.
const MULTI_SHOT = { cuts: [2, 3.5, 6, 7], shots: 5, duration: 9 };
function makeMultiShot(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  ffmpeg([
    '-f', 'lavfi', '-i', 'testsrc=s=320x240:r=25:d=2',
    '-f', 'lavfi', '-i', 'smptebars=s=320x240:r=25:d=1.5',
    '-f', 'lavfi', '-i', 'testsrc2=s=320x240:r=25:d=2.5',
    '-f', 'lavfi', '-i', 'color=c=0x2244aa:s=320x240:r=25:d=1',
    '-f', 'lavfi', '-i', 'mandelbrot=s=320x240:r=25',
    '-f', 'lavfi', '-i', 'sine=f=440:d=9',
    '-filter_complex', '[4:v]trim=duration=2,setpts=PTS-STARTPTS[m];[0:v][1:v][2:v][3:v][m]concat=n=5:v=1:a=0,format=yuv420p[v]',
    '-map', '[v]', '-map', '5:a', '-shortest', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', file,
  ]);
  return file;
}

function duration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return Number(r.stdout.trim());
}

// Run the real CLI as a separate process against a storage root.
function cli(storage, args, env = {}) {
  const r = spawnSync(process.execPath, [path.join(APP, 'cli.js'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, VX_STORAGE_ROOT: storage, VX_WHISPER: 'off', VX_OCR: 'off', VX_ACTOR: 'test-bot', ...env },
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch { /* not every command prints JSON on failure */ }
  return { status: r.status, json, stdout: r.stdout, stderr: r.stderr };
}

module.exports = { APP, tempRoot, cleanup, useTempRoot, ffmpeg, makeClip, makeMultiShot, MULTI_SHOT, duration, cli };
