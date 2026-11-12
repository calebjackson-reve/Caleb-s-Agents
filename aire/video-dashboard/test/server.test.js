'use strict';
// The web server and JSON API, on a random local port with a temp storage root.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const h = require('./helpers');

delete process.env.VX_PORT;
delete process.env.VX_HOST;
const tmp = h.useTempRoot('server');
const config = require('../lib/config');
const queue = require('../lib/queue');
const { start } = require('../server');
const JOB = 'JOB-TEST-API';
let server;
let base;
let clip;

const api = async (method, url, body, headers = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { ...(body && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}), 'X-VX-Actor': 'api-test', ...headers },
    body: body ? (Buffer.isBuffer(body) ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch { /* not JSON */ }
  return { status: res.status, json, text, headers: res.headers };
};

test.before(async () => {
  clip = h.makeClip(path.join(tmp, 'gen', 'upload.mp4'), { seconds: 3, size: '320x240' });
  server = await start({ port: 0 });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  queue.stopWorker();
  await new Promise((r) => server.close(r));
  server.closeAllConnections();
  h.cleanup(tmp);
});

test('defaults: 127.0.0.1 on port 4848, never the Pipeline port', () => {
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 4848);
  assert.equal(server.address().address, '127.0.0.1');
});

test('health and the dashboard page', async () => {
  const health = await api('GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.json.ok, true);
  assert.ok(health.json.storage_root.startsWith(tmp));
  const page = await api('GET', '/');
  assert.equal(page.status, 200);
  assert.match(page.text, /Video Engine/);
  assert.ok(!/https?:\/\/(fonts|cdn)/.test(page.text), 'no CDN in the page');
  assert.equal((await api('GET', '/app.js')).status, 200);
  assert.equal((await api('GET', '/style.css')).status, 200);
  assert.equal((await api('GET', '/../server.js')).status, 404);
});

test('create a job, upload into source/, list with probe data', async () => {
  let r = await api('POST', '/api/jobs', { id: JOB, title: 'API test' });
  assert.equal(r.status, 201);
  assert.equal((await api('POST', '/api/jobs', { id: JOB })).status, 409);
  r = await api('PUT', `/api/jobs/${JOB}/upload?folder=source&name=${encodeURIComponent('My Upload.mp4')}`, fs.readFileSync(clip));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.name, 'My-Upload.mp4');
  r = await api('GET', `/api/jobs/${JOB}?probe=1`);
  assert.equal(r.json.files.source.length, 1);
  assert.ok(Math.abs(r.json.files.source[0].probe.duration - 3) < 0.15);
  r = await api('GET', `/api/jobs/${JOB}/probe?folder=source&name=My-Upload.mp4`);
  assert.equal(r.json.height, 240);
  assert.equal((await api('GET', '/api/jobs')).json[0].counts.source, 1);
});

test('media plays from storage with range requests; thumbnails are generated', async () => {
  let r = await fetch(`${base}/media/${JOB}/source/My-Upload.mp4`, { headers: { Range: 'bytes=0-99' } });
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-type'), 'video/mp4');
  assert.equal((await r.arrayBuffer()).byteLength, 100);
  r = await fetch(`${base}/thumb/${JOB}/source/My-Upload.mp4`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/jpeg');
  assert.equal((await fetch(`${base}/media/${JOB}/source/..%2Fjob.json`)).status, 404);
  assert.equal((await fetch(`${base}/media/${JOB}/.meta/probe/x.json`)).status, 404);
  assert.equal((await fetch(`${base}/media/${JOB}/job.json`)).status, 404);
});

test('inbox upload, import by path and move to job', async () => {
  let r = await api('PUT', '/api/inbox/upload?name=drop.mp4', fs.readFileSync(clip));
  assert.equal(r.json.folder, 'inbox');
  r = await api('POST', '/api/inbox/import', { path: clip });
  assert.equal(r.status, 201);
  assert.equal((await api('GET', '/api/inbox?probe=1')).json.length, 2);
  r = await api('POST', '/api/inbox/move', { name: 'drop.mp4', job: JOB, folder: 'reference' });
  assert.equal(r.json.folder, 'reference');
  const refs = (await api('GET', `/api/jobs/${JOB}/references`)).json;
  assert.equal(refs.length, 1);
  assert.equal(refs[0].analysis_only, true);
  assert.equal(refs[0].origin.type, 'inbox');
});

test('trim and render through the API; the server works the queue', async () => {
  let r = await api('POST', `/api/jobs/${JOB}/trims`, { source: 'My-Upload.mp4', in: 0.5, out: 2 });
  assert.equal(r.status, 201);
  r = await api('POST', `/api/jobs/${JOB}/renders`, { op: 'trim', trim: 'T1' });
  assert.equal(r.status, 201);
  assert.equal(r.json.status, 'queued');
  const id = r.json.id;
  let rec;
  for (let i = 0; i < 100; i++) {
    rec = (await api('GET', `/api/renders/${id}`)).json;
    if (rec.status === 'done' || rec.status === 'failed') break;
    await new Promise((res) => setTimeout(res, 100));
  }
  assert.equal(rec.status, 'done', rec.log);
  assert.ok(Math.abs(rec.output.duration - 1.5) < 0.15);
  assert.match(rec.log, /ffmpeg/);
  r = await api('POST', `/api/jobs/${JOB}/renders`, { op: 'preview', folder: 'source', name: 'My-Upload.mp4', wait: true });
  assert.equal(r.json.status, 'done');
  assert.equal((await api('GET', `/api/jobs/${JOB}/renders`)).json.length, 2);
  assert.equal((await api('DELETE', `/api/jobs/${JOB}/trims/T1`)).status, 200);
});

test('reference breakdown and match plan through the API', async () => {
  const multi = h.makeMultiShot(path.join(tmp, 'gen', 'api-multi.mp4'));
  let r = await api('POST', `/api/jobs/${JOB}/references`, { path: multi });
  assert.equal(r.status, 201, r.text);
  r = await api('POST', `/api/jobs/${JOB}/references/api-multi.mp4/breakdown`);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.cut_count, 4);
  r = await fetch(`${base}/media/${JOB}/reference/${r.json.shots[0].thumb}`);
  assert.equal(r.status, 200);
  assert.equal((await api('GET', `/api/jobs/${JOB}/references/api-multi.mp4/breakdown`)).json.shots.length, 5);
  r = await api('POST', `/api/jobs/${JOB}/match-plan`, { reference: 'api-multi.mp4' });
  assert.equal(r.status, 201);
  assert.equal(r.json.slots.length, 5);
  r = await api('PUT', `/api/jobs/${JOB}/match-plan/slots/2/assignment`, { source: 'My-Upload.mp4', in: 0, out: 1.5 });
  assert.equal(r.json.assignment.source, 'My-Upload.mp4');
  r = await api('PATCH', `/api/jobs/${JOB}/match-plan/slots/2`, { role: 'b-roll' });
  assert.equal(r.json.role, 'b-roll');
  r = await api('POST', `/api/jobs/${JOB}/match-plan/render`, { dest: 'out', wait: true });
  assert.equal(r.json.status, 'done', r.json.log);
  assert.deepEqual(r.json.skipped_slots, [1, 3, 4, 5]);
  assert.equal(r.json.output.folder, 'out');
  r = await api('DELETE', `/api/jobs/${JOB}/match-plan/slots/2/assignment`);
  assert.equal(r.json.assignment, null);
  assert.equal((await api('GET', `/api/jobs/${JOB}/match-plan`)).json.summary.assigned_count, 0);
  r = await api('POST', `/api/jobs/${JOB}/references`, { url: 'ftp://example.com/x.mp4' });
  assert.equal(r.status, 400);
});

test('notes, activity and guards', async () => {
  let r = await api('POST', `/api/jobs/${JOB}/notes`, { text: 'Shorter intro please', kind: 'edit-request' });
  assert.equal(r.status, 201);
  r = await api('PATCH', `/api/jobs/${JOB}/notes/${r.json.id}`, { done: true });
  assert.equal(r.json.done, true);
  r = await api('PATCH', `/api/jobs/${JOB}`, { status: 'review' });
  assert.equal(r.json.status, 'review');
  const log = (await api('GET', `/api/jobs/${JOB}/activity`)).json;
  assert.ok(log.some((e) => e.action === 'file.upload' && e.actor === 'api-test'));
  assert.ok((await api('GET', '/api/activity?limit=5')).json.length === 5);
  // another website cannot drive the API
  r = await api('POST', '/api/jobs', { id: 'JOB-EVIL' }, { Origin: 'https://evil.example.com' });
  assert.equal(r.status, 403);
  // a page opened through a tunnel on another local port still works: Origin matches Host
  const viaTunnel = await fetch(`http://localhost:${server.address().port}/api/jobs`, { headers: { Origin: `http://localhost:${server.address().port}` } }).catch(() => null);
  if (viaTunnel) assert.equal(viaTunnel.status, 200);
  // the API never probes arbitrary paths on the box
  r = await api('GET', `/api/jobs/${JOB}/probe?path=${encodeURIComponent(clip)}`);
  assert.equal(r.status, 400);
  assert.equal((await api('GET', '/api/jobs/NOPE')).status, 404);
  assert.equal((await api('POST', '/api/nothing', {})).status, 404);
});
