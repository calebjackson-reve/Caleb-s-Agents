'use strict';
// CLI round trip as the bot would do it: create job, import, list, probe, queue, read the log.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const h = require('./helpers');

const tmp = h.tempRoot('cli');
const storage = path.join(tmp, 'storage');
const vx = (...args) => h.cli(storage, args);
const JOB = 'JOB-TEST-CLI';
let clip;

test.before(() => {
  clip = h.makeClip(path.join(tmp, 'gen', 'bot-drop.mp4'), { seconds: 3, size: '320x240' });
});
test.after(() => h.cleanup(tmp));

test('vx help lists the commands', () => {
  const r = vx('help');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /vx job create/);
  assert.match(r.stdout, /vx ref add/);
});

test('create job, import, list, probe', () => {
  let r = vx('job', 'create', JOB, '--title', 'CLI round trip');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.id, JOB);
  assert.deepEqual(vx('jobs').json.map((j) => j.id), [JOB]);

  r = vx('import', clip, '--job', JOB);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.name, 'bot-drop.mp4');

  r = vx('files', JOB, '--folder', 'source');
  assert.deepEqual(r.json.map((f) => f.name), ['bot-drop.mp4']);

  r = vx('probe', JOB, 'source/bot-drop.mp4');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(Math.abs(r.json.duration - 3) < 0.15);
  assert.equal(r.json.width, 320);
  assert.equal(r.json.audio_streams.length, 1);
});

test('inbox: import a chat drop, list it, move it to the job', () => {
  let r = vx('import', clip);
  assert.equal(r.json.folder, 'inbox');
  assert.equal(vx('inbox').json.length, 1);
  r = vx('inbox', 'move', 'bot-drop.mp4', '--job', JOB);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.name, 'bot-drop-2.mp4', 'never overwrites an existing file');
  assert.equal(vx('inbox').json.length, 0);
});

test('trim, queue renders and wait for them', () => {
  let r = vx('trim', 'add', JOB, 'bot-drop.mp4', '--in', '1', '--out', '2.5', '--label', 'middle');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.id, 'T1');
  assert.equal(vx('trim', 'list', JOB).json.length, 1);

  r = vx('render', JOB, 'trim', '--trim', 'T1', '--wait');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.status, 'done');
  const out = path.join(storage, JOB, 'build', r.json.output.name);
  assert.ok(fs.existsSync(out));
  assert.ok(Math.abs(h.duration(out) - 1.5) < 0.15);

  // queue without --wait, then work the queue by hand
  r = vx('render', JOB, 'preview', '--file', 'source/bot-drop.mp4');
  assert.equal(r.json.status, 'queued');
  assert.match(r.stderr, /Queued/);
  assert.equal(vx('queue', 'run').json.worked, true);
  const status = vx('render-status', r.json.id);
  assert.equal(status.json.status, 'done');
  assert.match(status.json.log, /done:/);
  assert.equal(vx('renders', JOB).json.length, 2);
});

test('notes, job JSON and the activity log name the actor', () => {
  assert.equal(vx('note', JOB, 'Bot imported the file from chat').status, 0);
  assert.equal(vx('job', 'set', JOB, '--status', 'review').json.status, 'review');
  const job = vx('job', 'show', JOB).json;
  assert.equal(job.entries.length, 1);
  assert.equal(job.files.build.length, 2);
  const log = vx('log', JOB).json;
  assert.ok(log.every((e) => e.actor === 'test-bot'));
  for (const a of ['job.create', 'file.import', 'trim.add', 'render.queue', 'render.done', 'note.add']) {
    assert.ok(log.some((e) => e.action === a), `log has ${a}`);
  }
  assert.equal(h.cli(storage, ['log', JOB, '--limit', '2']).json.length, 2);
});

test('errors are JSON on stderr with a non-zero exit', () => {
  const r = vx('probe', JOB, 'source/missing.mp4');
  assert.equal(r.status, 1);
  assert.match(JSON.parse(r.stderr).error, /No file missing\.mp4/);
  assert.equal(vx('nonsense').status, 1);
});
