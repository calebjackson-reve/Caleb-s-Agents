'use strict';
// Reference Engine: add a reference from a path, break it down, check the cut count on a
// generated multi-shot clip, build the match plan, assign slots and render a rough cut.
// No network: the multi-shot clip is generated here and the URL test uses a local stand-in for yt-dlp.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const h = require('./helpers');

const tmp = h.tempRoot('ref');
const storage = path.join(tmp, 'storage');
const vx = (...args) => h.cli(storage, args);
const JOB = 'JOB-TEST-REF';
let multi;
let raw;

test.before(() => {
  multi = h.makeMultiShot(path.join(tmp, 'gen', 'multi-shot.mp4'));
  raw = h.makeClip(path.join(tmp, 'gen', 'raw-footage.mp4'), { seconds: 5, size: '320x240' });
  assert.equal(vx('job', 'create', JOB, '--title', 'Reference test').status, 0);
  assert.equal(vx('import', raw, '--job', JOB).status, 0);
});
test.after(() => h.cleanup(tmp));

test('add a reference from a path; it is marked analysis only', () => {
  const r = vx('ref', 'add', JOB, multi);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.name, 'multi-shot.mp4');
  assert.equal(r.json.analysis_only, true);
  assert.equal(r.json.origin.type, 'path');
  assert.ok(fs.existsSync(path.join(storage, JOB, 'reference', 'multi-shot.mp4')));
  const list = vx('ref', 'list', JOB).json;
  assert.equal(list.length, 1);
  assert.equal(list[0].breakdown.available, false);
  assert.equal(vx('ref', 'show', JOB, 'multi-shot.mp4').status, 1, 'no breakdown yet');
});

test('breakdown finds the right number of cuts in the multi-shot clip', () => {
  const r = vx('ref', 'breakdown', JOB, 'multi-shot.mp4');
  assert.equal(r.status, 0, r.stderr);
  const b = r.json;
  assert.equal(b.analysis_only, true);
  assert.equal(b.cut_count, h.MULTI_SHOT.cuts.length, `cuts found at ${b.shots.slice(1).map((s) => s.start)}`);
  assert.equal(b.shots.length, h.MULTI_SHOT.shots);
  h.MULTI_SHOT.cuts.forEach((t, i) => assert.ok(Math.abs(b.shots[i + 1].start - t) <= 0.1, `cut ${i + 1} near ${t}s, got ${b.shots[i + 1].start}`));
  assert.equal(b.shots[0].start, 0);
  assert.ok(Math.abs(b.shots[4].end - h.MULTI_SHOT.duration) < 0.15);

  // specs and pacing
  assert.equal(b.specs.width, 320);
  assert.equal(b.specs.aspect, '4:3');
  assert.equal(b.specs.audio_streams.length, 1);
  assert.equal(b.pacing.shot_count, 5);
  assert.ok(Math.abs(b.pacing.avg_shot_seconds - 1.8) < 0.05);
  assert.ok(Math.abs(b.pacing.cuts_per_10s - 4.44) < 0.1);
  assert.ok(Math.abs(b.pacing.hook_seconds - 2) <= 0.1);
  assert.equal(b.pacing.hook_basis, 'first shot');
  assert.match(b.pacing.hook_rule, /first shot/);

  // a keyframe per shot, stored under reference/, never in the repo
  for (const s of b.shots) assert.ok(fs.statSync(path.join(storage, JOB, 'reference', s.thumb)).size > 300);
  assert.ok(b.aspect.notes.length >= 2);

  // audio: loudness curve, silences and onsets present (a steady tone has no silences)
  assert.equal(b.audio.available, true);
  assert.ok(b.audio.curve.values.length > 80);
  assert.equal(typeof b.audio.integrated_lufs, 'number');
  assert.ok(Array.isArray(b.audio.silences) && Array.isArray(b.audio.onsets));

  // no whisper and no OCR here: both say so and nothing fails
  assert.equal(b.transcript.available, false);
  assert.equal(b.transcript.status, 'not available');
  assert.equal(b.on_screen_text.ocr, 'not available');
  assert.ok(b.on_screen_text.frames.length >= 5);
  assert.ok(b.on_screen_text.frames.every((f) => f.needs_review && fs.existsSync(path.join(storage, JOB, 'reference', f.thumb))));

  const saved = vx('ref', 'show', JOB, 'multi-shot.mp4').json;
  assert.equal(saved.cut_count, 4);
  assert.ok(fs.existsSync(path.join(storage, JOB, 'reference', 'multi-shot.breakdown.json')));
  assert.equal(vx('ref', 'list', JOB).json[0].breakdown.shot_count, 5);
});

test('audio breakdown finds silences and onsets in a tone that switches on and off', () => {
  // tone on for 1s, off for 1s, three times: silences at 1-2, 3-4, 5-6 and onsets at 2 and 4
  const bursts = path.join(tmp, 'gen', 'bursts.mp4');
  h.ffmpeg(['-f', 'lavfi', '-i', 'testsrc=s=160x120:r=25:d=6', '-f', 'lavfi', '-i', 'sine=f=440:d=6',
    '-af', "volume='if(lt(mod(t,2),1),1,0)':eval=frame", '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', bursts]);
  assert.equal(vx('ref', 'add', JOB, bursts).status, 0);
  const b = vx('ref', 'breakdown', JOB, 'bursts.mp4').json;
  assert.equal(b.cut_count, 0, 'a single continuous shot has no cuts');
  assert.equal(b.pacing.hook_basis, 'first 3 seconds');
  assert.equal(b.pacing.hook_seconds, 3);
  assert.equal(b.audio.silences.length, 3, JSON.stringify(b.audio.silences));
  assert.ok(Math.abs(b.audio.silences[0].start - 1) < 0.2 && Math.abs(b.audio.silences[0].end - 2) < 0.2);
  assert.equal(b.audio.onsets.length, 2, JSON.stringify(b.audio.onsets));
  assert.ok(Math.abs(b.audio.onsets[0] - 2) <= 0.2 && Math.abs(b.audio.onsets[1] - 4) <= 0.2);
  fs.rmSync(path.join(storage, JOB, 'reference', 'bursts.mp4'));
  assert.equal(vx('ref', 'list', JOB).json.length, 1);
});

test('match plan template has one empty slot per shot', () => {
  assert.equal(vx('plan', 'show', JOB).status, 1, 'no plan before it is created');
  const r = vx('plan', 'create', JOB, '--ref', 'multi-shot.mp4');
  assert.equal(r.status, 0, r.stderr);
  const plan = r.json;
  assert.equal(plan.slots.length, h.MULTI_SHOT.shots);
  assert.equal(plan.summary.slot_count, 5);
  assert.equal(plan.summary.assigned_count, 0);
  assert.ok(plan.slots.every((s) => s.assignment === null), 'nothing is auto-filled');
  assert.ok(plan.slots.every((s) => s.role === null && s.role_is_suggestion === true), 'roles are suggestions');
  assert.equal(plan.slots[0].suggested_role, 'hook');
  assert.equal(plan.slots[4].suggested_role, 'cta');
  assert.ok(Math.abs(plan.slots[1].duration - 1.5) <= 0.1);
  assert.ok(plan.slots[0].notes.length >= 1);
  assert.equal(vx('plan', 'show', JOB).json.slots.length, 5);
  assert.ok(fs.existsSync(path.join(storage, JOB, 'match-plan.json')));
});

test('a rough cut with nothing assigned is refused, not invented', () => {
  const r = vx('plan', 'render', JOB, '--wait');
  assert.equal(r.status, 1);
  assert.match(JSON.parse(r.stderr).error, /No slots are assigned/);
});

test('assign slots, edit a role, and the reference can never be footage', () => {
  let r = vx('plan', 'assign', JOB, '1', '--source', 'raw-footage.mp4', '--in', '0.5');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(Math.abs(r.json.assignment.duration - 2) <= 0.1, 'out defaults to in + slot length');
  r = vx('plan', 'assign', JOB, '3', '--source', 'raw-footage.mp4', '--in', '3', '--out', '4');
  assert.equal(r.json.assignment.duration, 1);
  assert.ok(r.json.assignment.fit_notes.some((n) => /slot is/.test(n)), 'length mismatch is reported, not fixed silently');

  r = vx('plan', 'slot', JOB, '2', '--role', 'talking head', '--notes', 'use the porch take');
  assert.equal(r.json.role, 'talking head');
  assert.equal(r.json.role_is_suggestion, false);

  r = vx('plan', 'assign', JOB, '2', '--source', 'multi-shot.mp4');
  assert.equal(r.status, 1, 'a reference file is not in source/, so it cannot be assigned');
  r = vx('plan', 'assign', JOB, '2', '--source', '../reference/multi-shot.mp4');
  assert.equal(r.status, 1);
  r = vx('plan', 'assign', JOB, '9', '--source', 'raw-footage.mp4');
  assert.equal(r.status, 1);
  r = vx('render', JOB, 'preview', '--file', 'reference/multi-shot.mp4');
  assert.equal(r.status, 1, 'no render op reads from reference/');

  const plan = vx('plan', 'show', JOB).json;
  assert.deepEqual(plan.summary.unassigned_slots, [2, 4, 5]);
  assert.equal(plan.summary.assigned_count, 2);
});

test('rough cut renders only the assigned slots and reports the skipped ones', () => {
  const r = vx('plan', 'render', JOB, '--wait');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.status, 'done', r.json.log);
  assert.equal(r.json.op, 'roughcut');
  assert.deepEqual(r.json.skipped_slots, [2, 4, 5]);
  assert.deepEqual(r.json.segments.map((s) => s.slot), [1, 3]);
  assert.ok(r.json.segments.every((s) => s.folder === 'source'));
  assert.match(r.json.log, /skipping unassigned slots: 2, 4, 5/);
  const out = path.join(storage, JOB, r.json.output.folder, r.json.output.name);
  assert.equal(r.json.output.folder, 'build');
  assert.ok(Math.abs(h.duration(out) - 3) <= 0.2, `rough cut is the two assigned clips (3s), got ${h.duration(out)}`);

  const log = vx('log', JOB).json.map((e) => e.action);
  for (const a of ['reference.add', 'reference.breakdown', 'match-plan.create', 'match-plan.assign', 'render.done']) {
    assert.ok(log.includes(a), `activity log has ${a}`);
  }
});

test('re-creating a plan with assignments needs --force', () => {
  assert.equal(vx('plan', 'create', JOB, '--ref', 'multi-shot.mp4').status, 1);
  const r = vx('plan', 'create', JOB, '--ref', 'multi-shot.mp4', '--force');
  assert.equal(r.status, 0);
  assert.equal(r.json.summary.assigned_count, 0);
});

test('reference URL: only http(s), fetched by yt-dlp (a local stand-in here, no network)', () => {
  let r = vx('ref', 'add', JOB, 'file:///etc/hostname');
  assert.equal(r.status, 1);
  assert.match(JSON.parse(r.stderr).error, /http/);

  // Stand-in for yt-dlp: writes a local file where yt-dlp would and prints its path.
  const stub = path.join(tmp, 'fake-yt-dlp.js');
  fs.writeFileSync(stub, `#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const a = process.argv.slice(2);
const dir = a[a.indexOf('-P') + 1];
const out = path.join(dir, 'Fetched_Reference-abc123.mp4');
fs.copyFileSync(process.env.VX_TEST_STUB_SRC, out);
fs.writeFileSync(path.join(path.dirname(process.env.VX_TEST_STUB_SRC), 'stub-args.json'), JSON.stringify(a));
console.log(out);
`);
  fs.chmodSync(stub, 0o755);
  r = h.cli(storage, ['ref', 'add', JOB, 'https://video.example.com/watch?v=abc123'], { VX_YTDLP: stub, VX_TEST_STUB_SRC: multi });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.name, 'Fetched_Reference-abc123.mp4');
  assert.equal(r.json.origin.type, 'url');
  assert.equal(r.json.analysis_only, true);
  const args = JSON.parse(fs.readFileSync(path.join(tmp, 'gen', 'stub-args.json'), 'utf8'));
  assert.equal(args[args.length - 2], '--', 'the URL is passed after -- so it can never be read as an option');
  assert.ok(args.includes('--no-playlist'));
  assert.equal(vx('ref', 'list', JOB).json.length, 2);
  assert.ok(vx('log', JOB).json.some((e) => e.action === 'reference.fetch'));
});
