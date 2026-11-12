'use strict';
// Import, probe, trims and the render queue, through the same action table the CLI and API use.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const h = require('./helpers');

const tmp = h.useTempRoot('core');
const config = require('../lib/config');
const { act } = require('../lib/actions');
const JOB = 'JOB-TEST-CORE';
const near = (actual, expected, tol, what) => assert.ok(Math.abs(actual - expected) <= tol, `${what}: got ${actual}, wanted ${expected} +/- ${tol}`);

test.after(() => h.cleanup(tmp));

test('storage root is the temp folder, not the live tree', () => {
  assert.ok(config.root.startsWith(tmp));
  assert.ok(!config.root.startsWith('/workspace/video'));
});

test('create a job and its folders', async () => {
  const job = await act('job.create', { id: JOB, title: 'Core test', notes: 'made by the test' }, 'tester');
  assert.equal(job.status, 'new');
  for (const f of ['source', 'build', 'out', 'reference']) assert.ok(fs.statSync(path.join(config.root, JOB, f)).isDirectory());
  assert.ok(fs.statSync(path.join(config.root, 'inbox')).isDirectory());
  await assert.rejects(act('job.create', { id: JOB }), /already exists/);
  await assert.rejects(act('job.create', { id: '../escape' }), /Job id/);
  await assert.rejects(act('job.create', { id: 'inbox' }), /Job id/);
});

test('import a generated clip and probe it', async () => {
  const clip = h.makeClip(path.join(tmp, 'gen', 'test clip.mp4'), { seconds: 4 });
  const file = await act('file.import', { path: clip, job: JOB }, 'tester');
  assert.equal(file.name, 'test-clip.mp4');
  assert.equal(file.folder, 'source');
  assert.ok(fs.existsSync(clip), 'import copies by default');
  const info = await act('probe', { job: JOB, folder: 'source', name: file.name });
  assert.equal(info.kind, 'video');
  near(info.duration, 4, 0.15, 'duration');
  assert.equal(info.width, 640);
  assert.equal(info.height, 480);
  assert.equal(info.fps, 25);
  assert.equal(info.aspect, '4:3');
  assert.equal(info.audio_streams.length, 1);
  assert.equal(info.audio_streams[0].codec, 'aac');
  const thumb = await require('../lib/media').thumb(JOB, 'source', file.name);
  assert.ok(thumb && fs.statSync(thumb).size > 500, 'poster frame was written');
  assert.ok(thumb.startsWith(path.join(config.root, JOB)), 'thumbnail lives under the job folder');
});

test('import refuses hidden files and hidden folders', async () => {
  const hidden = path.join(tmp, '.secrets', 'key.mp4');
  fs.mkdirSync(path.dirname(hidden), { recursive: true });
  fs.writeFileSync(hidden, 'not media');
  fs.writeFileSync(path.join(tmp, '.env'), 'X=1');
  await assert.rejects(act('file.import', { path: hidden, job: JOB }), /hidden/);
  await assert.rejects(act('file.import', { path: path.join(tmp, '.env') }), /hidden/);
  await assert.rejects(act('file.import', { path: path.join(tmp, 'nope.mp4'), job: JOB }), /No file at/);
});

test('inbox import and move to job', async () => {
  const clip = h.makeClip(path.join(tmp, 'gen', 'silent.mp4'), { seconds: 2, size: '320x240', audio: false });
  const inboxFile = await act('file.import', { path: clip }, 'tester');
  assert.equal(inboxFile.folder, 'inbox');
  assert.deepEqual((await act('inbox.list', {})).map((f) => f.name), ['silent.mp4']);
  const moved = await act('inbox.move', { name: 'silent.mp4', job: JOB }, 'tester');
  assert.equal(moved.folder, 'source');
  assert.equal((await act('inbox.list', {})).length, 0);
  const info = await act('probe', { job: JOB, folder: 'source', name: 'silent.mp4' });
  assert.equal(info.audio_streams.length, 0);
});

test('trims are saved as JSON and validated', async () => {
  const t1 = await act('trim.add', { job: JOB, source: 'test-clip.mp4', in: 0.5, out: 2, label: 'open' }, 'tester');
  const t2 = await act('trim.add', { job: JOB, source: 'silent.mp4', in: 0, out: 1 }, 'tester');
  assert.equal(t1.id, 'T1');
  assert.equal(t2.id, 'T2');
  assert.equal(t1.duration, 1.5);
  const saved = JSON.parse(fs.readFileSync(path.join(config.root, JOB, 'trims.json'), 'utf8'));
  assert.equal(saved.trims.length, 2);
  await assert.rejects(act('trim.add', { job: JOB, source: 'test-clip.mp4', in: 3, out: 2 }), /after the in point/);
  await assert.rejects(act('trim.add', { job: JOB, source: 'test-clip.mp4', in: 1, out: 60 }), /past the end/);
  await assert.rejects(act('trim.add', { job: JOB, source: '../job.json', in: 0, out: 1 }), /Bad file name/);
});

test('trim render writes build/ with the trimmed duration', async () => {
  const r = await act('render.queue', { job: JOB, op: 'trim', trim: 'T1', wait: true }, 'tester');
  assert.equal(r.status, 'done', r.log);
  assert.equal(r.output.folder, 'build');
  const out = path.join(config.root, JOB, 'build', r.output.name);
  assert.ok(fs.existsSync(out));
  near(h.duration(out), 1.5, 0.15, 'trim duration');
  assert.match(r.log, /ffmpeg/);
});

test('preview render is a low-res proxy of the whole clip', async () => {
  const r = await act('render.queue', { job: JOB, op: 'preview', folder: 'source', name: 'test-clip.mp4', wait: true }, 'tester');
  assert.equal(r.status, 'done', r.log);
  const info = await act('probe', { job: JOB, folder: 'build', name: r.output.name });
  near(info.duration, 4, 0.2, 'preview duration');
  assert.equal(info.height, 360);
  assert.equal(info.width, 480);
});

test('concat joins the saved trims, including a clip with no audio', async () => {
  const r = await act('render.queue', { job: JOB, op: 'concat', dest: 'out', wait: true }, 'tester');
  assert.equal(r.status, 'done', r.log);
  assert.equal(r.output.folder, 'out');
  near(h.duration(path.join(config.root, JOB, 'out', r.output.name)), 2.5, 0.2, 'concat duration');
});

test('captions burn in from an .srt in the job folder', async () => {
  await assert.rejects(act('render.queue', { job: JOB, op: 'captions', folder: 'source', name: 'test-clip.mp4' }), /No \.srt/);
  fs.writeFileSync(path.join(config.root, JOB, 'captions.srt'), '1\n00:00:00,000 --> 00:00:02,000\nHello from the test\n');
  const r = await act('render.queue', { job: JOB, op: 'captions', folder: 'source', name: 'test-clip.mp4', wait: true }, 'tester');
  assert.equal(r.status, 'done', r.log);
  assert.equal(r.output.folder, 'out');
  near(h.duration(path.join(config.root, JOB, 'out', r.output.name)), 4, 0.2, 'captioned duration');
});

test('bad render requests fail when queued', async () => {
  await assert.rejects(act('render.queue', { job: JOB, op: 'trim', trim: 'T99' }), /No trim T99/);
  await assert.rejects(act('render.queue', { job: JOB, op: 'publish' }), /Render op must be/);
  await assert.rejects(act('render.queue', { job: JOB, op: 'preview', folder: 'reference', name: 'x.mp4' }), /analysis only/);
});

test('a job folder made by hand or by another tool still works, and its extra fields are kept', async () => {
  const dir = path.join(config.root, 'JOB-BY-HAND');
  fs.mkdirSync(path.join(dir, 'source'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'job.json'), JSON.stringify({ title: 'Made elsewhere', status: 'preview-ready', createdAt: '2026-11-01T10:00:00.000Z', timeline: { clips: [1, 2] } }));
  fs.mkdirSync(path.join(config.root, '_not-a-job'));
  const listed = (await act('jobs.list', {})).find((j) => j.id === 'JOB-BY-HAND');
  assert.equal(listed.title, 'Made elsewhere');
  assert.equal(listed.counts.reference, 0);
  const detail = await act('job.get', { job: 'JOB-BY-HAND', probe: true });
  assert.equal(detail.status, 'preview-ready');
  assert.equal(detail.created, '2026-11-01T10:00:00.000Z');
  assert.deepEqual(detail.files.reference, []);
  await act('note.add', { job: 'JOB-BY-HAND', text: 'Looks good' }, 'tester');
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'job.json'), 'utf8'));
  assert.deepEqual(saved.timeline, { clips: [1, 2] }, 'fields this app does not know are left alone');
  assert.equal(saved.entries.length, 1);
  assert.ok(!(await act('jobs.list', {})).some((j) => j.id.startsWith('_')));
});

test('notes, status and the activity log', async () => {
  const note = await act('note.add', { job: JOB, text: 'Tighten the open', kind: 'edit-request' }, 'caleb');
  assert.equal(note.id, 'N1');
  await act('job.update', { job: JOB, status: 'in-progress' }, 'caleb');
  const detail = await act('job.get', { job: JOB, probe: true });
  assert.equal(detail.status, 'in-progress');
  assert.equal(detail.entries[0].kind, 'edit-request');
  assert.equal(detail.files.source.length, 2);
  assert.ok(detail.files.source[0].probe.duration > 0);
  assert.ok(detail.files.build.length >= 2);
  assert.equal(detail.trims.length, 2);
  assert.ok(detail.renders.length >= 4);
  const log = await act('activity', { job: JOB });
  const actions = log.map((e) => e.action);
  for (const a of ['job.create', 'file.import', 'file.from-inbox', 'trim.add', 'render.queue', 'render.done', 'edit-request.add', 'job.update']) {
    assert.ok(actions.includes(a), `activity log has ${a}`);
  }
  assert.ok(log.some((e) => e.actor === 'caleb') && log.some((e) => e.actor === 'tester'));
  const all = await act('activity', {});
  assert.ok(all.some((e) => e.action === 'inbox.move'));
});
