'use strict';
// UI smoke test. Runs the real public/app.js against the real server, with a small stand-in
// for the browser DOM, and walks every screen. It catches script errors and broken API calls
// in the page. It does not check layout or styling.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const h = require('./helpers');

const tmp = h.useTempRoot('ui');
const queue = require('../lib/queue');
const { act } = require('../lib/actions');
const { start } = require('../server');
const JOB = 'JOB-TEST-UI';

// ---- a very small DOM -------------------------------------------------------
class Text {
  constructor(t) { this.nodeType = 3; this.text = String(t); this.parent = null; }
  get textContent() { return this.text; }
}
class El {
  constructor(tag) {
    Object.assign(this, { nodeType: 1, tagName: tag.toUpperCase(), children: [], attrs: {}, listeners: {}, style: { cssText: '' }, dataset: {}, className: '', value: '', parent: null, open: false, files: [], currentTime: 0 });
  }
  append(...kids) {
    for (let k of kids) {
      if (typeof k === 'string') k = new Text(k);
      if (k.parent) k.parent.children = k.parent.children.filter((c) => c !== k);
      k.parent = this;
      this.children.push(k);
    }
  }
  replaceChildren(...kids) { for (const c of this.children) c.parent = null; this.children = []; this.append(...kids); }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); if (k.startsWith('data-')) this.dataset[k.slice(5)] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn); }
  async fire(type, extra = {}) { for (const fn of this.listeners[type] || []) await fn({ preventDefault() {}, target: this, ...extra }); }
  get classList() {
    const el = this;
    const set = () => new Set(el.className.split(/\s+/).filter(Boolean));
    const save = (s) => (el.className = [...s].join(' '));
    return { add(c) { save(set().add(c)); }, remove(c) { const s = set(); s.delete(c); save(s); }, contains: (c) => set().has(c), toggle(c, on) { const s = set(); (on === undefined ? !s.has(c) : on) ? s.add(c) : s.delete(c); save(s); } };
  }
  get textContent() { return this.children.map((c) => c.textContent).join(' '); }
  set textContent(v) { this.replaceChildren(new Text(v)); }
  get all() { return this.children.filter((c) => c.nodeType === 1).flatMap((c) => [c, ...c.all]); }
  matches(sel) {
    const m = /^([a-z]+)?(?:#([\w-]+))?(?:\.([\w-]+))?(?:\[([\w-]+)\])?$/.exec(sel);
    if (!m) throw new Error(`selector not supported by the test DOM: ${sel}`);
    return (!m[1] || this.tagName === m[1].toUpperCase()) && (!m[2] || this.attrs.id === m[2]) && (!m[3] || this.classList.contains(m[3])) && (!m[4] || m[4] in this.attrs || this[m[4]] === true);
  }
  closest(sel) { for (let el = this; el; el = el.parent) if (el.matches && el.matches(sel)) return el; return null; }
  querySelectorAll(sel) {
    const parts = sel.trim().split(/\s+/);
    return this.all.filter((el) => {
      if (!el.matches(parts[parts.length - 1])) return false;
      let up = el.parent;
      for (let i = parts.length - 2; i >= 0; i--) {
        while (up && !(up.matches && up.matches(parts[i]))) up = up.parent;
        if (!up) return false;
        up = up.parent;
      }
      return true;
    });
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
  play() { return Promise.resolve(); }
  pause() {}
}

function makePage(base) {
  const body = new El('body');
  const ids = {};
  for (const [id, tag] of [['view', 'main'], ['player', 'dialog'], ['toasts', 'div'], ['nav', 'nav']]) {
    ids[id] = new El(tag);
    ids[id].setAttribute('id', id);
    body.append(ids[id]);
  }
  for (const name of ['jobs', 'inbox', 'queue', 'activity']) {
    const a = new El('a');
    a.setAttribute('data-nav', name);
    ids.nav.append(a);
  }
  const win = { listeners: {} };
  const errors = [];
  const ctx = vm.createContext({
    document: { querySelectorAll: (sel) => body.querySelectorAll(sel), getElementById: (id) => ids[id], createElement: (t) => new El(t), createElementNS: (_, t) => new El(t), createTextNode: (t) => new Text(t), activeElement: null },
    window: { addEventListener: (type, fn) => (win.listeners[type] = fn) },
    location: { hash: '#/' },
    fetch: (url, opts) => fetch(base + url, opts),
    confirm: () => true,
    setTimeout, setInterval, clearInterval, console, URL,
  });
  vm.runInContext(fs.readFileSync(path.join(h.APP, 'public', 'app.js'), 'utf8'), ctx, { filename: 'app.js' });
  const text = () => ids.view.textContent;
  const until = async (check, what) => {
    for (let i = 0; i < 200; i++) {
      if (check()) return;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`UI never showed: ${what}. Page text: ${text().slice(0, 400)} | toasts: ${ids.toasts.textContent}`);
  };
  const go = async (hash, expect) => {
    ctx.location.hash = hash;
    await win.listeners.hashchange();
    await until(() => text().includes(expect), `"${expect}" at ${hash}`);
    assert.ok(!text().includes('Something went wrong'), `${hash} rendered without an error`);
    return text();
  };
  const button = (root, label) => root.all.find((el) => el.tagName === 'BUTTON' && el.textContent.trim() === label);
  return { ...ids, ctx, errors, text, until, go, button, stop: () => vm.runInContext('clearInterval(state.timer)', ctx) };
}

// ---- the walk-through ---------------------------------------------------------
let server;
let page;
let base;

test.before(async () => {
  const clip = h.makeClip(path.join(tmp, 'gen', 'porch.mp4'), { seconds: 4 });
  const multi = h.makeMultiShot(path.join(tmp, 'gen', 'ref-reel.mp4'));
  await act('job.create', { id: JOB, title: 'Smoke test reel' }, 'seed');
  await act('file.import', { path: clip, job: JOB }, 'seed');
  await act('file.import', { path: clip }, 'seed');
  await act('trim.add', { job: JOB, source: 'porch.mp4', in: 0.5, out: 2, label: 'Opening' }, 'seed');
  await act('render.queue', { job: JOB, op: 'trim', trim: 'T1', wait: true }, 'seed');
  await act('note.add', { job: JOB, text: 'Tighten the first beat', kind: 'edit-request' }, 'seed');
  await act('ref.add', { job: JOB, path: multi }, 'seed');
  await act('ref.breakdown', { job: JOB, name: 'ref-reel.mp4' }, 'seed');
  await act('plan.create', { job: JOB, reference: 'ref-reel.mp4' }, 'seed');
  await act('plan.assign', { job: JOB, slot: 1, source: 'porch.mp4', in: 0 }, 'seed');
  server = await start({ port: 0 });
  base = `http://127.0.0.1:${server.address().port}`;
  page = makePage(base);
});
test.after(async () => {
  page.stop();
  queue.stopWorker();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  h.cleanup(tmp);
});

test('jobs list, inbox, renders and activity screens draw', async () => {
  let t = await page.go('#/', 'Smoke test reel');
  assert.match(t, /Video jobs/);
  assert.match(t, /1 edit request/);
  t = await page.go('#/inbox', 'porch.mp4');
  assert.match(t, /Move to job/);
  assert.match(t, /analysis only/);
  t = await page.go('#/queue', 'trim');
  assert.match(t, /done/);
  t = await page.go('#/activity', 'job.create');
  assert.match(t, /seed/);
});

test('job files: metadata shows, the player opens, a trim saves through the API', async () => {
  const t = await page.go(`#/job/${JOB}/files`, 'porch.mp4');
  assert.match(t, /640x480/);
  assert.match(t, /25 fps/);
  assert.match(t, /1 audio/);
  assert.match(t, /Drop files here/);
  const card = page.view.querySelectorAll('button.file')[0];
  assert.match(card.querySelector('div.thumb').style.cssText, /\/thumb\/JOB-TEST-UI\/source\/porch\.mp4/);
  await card.fire('click');
  assert.equal(page.player.open, true);
  assert.equal(page.player.querySelector('video').attrs.src, `/media/${JOB}/source/porch.mp4`);
  assert.match(page.player.textContent, /Frame rate\s+25 fps/);
  await page.button(page.player, 'Save trim').fire('click');
  await page.until(() => /Saved trim T2/.test(page.toasts.textContent), 'trim saved toast');
  assert.equal((await act('trims.list', { job: JOB })).length, 2);
  page.player.close();
});

test('clips, renders, notes and activity tabs draw', async () => {
  let t = await page.go(`#/job/${JOB}/clips`, 'Opening');
  assert.match(t, /Join all 2 trims in order/);
  t = await page.go(`#/job/${JOB}/renders`, 'porch-T1.mp4');
  assert.match(t, /Show log/);
  t = await page.go(`#/job/${JOB}/notes`, 'Tighten the first beat');
  assert.match(t, /Mark done/);
  t = await page.go(`#/job/${JOB}/activity`, 'reference.breakdown');
  assert.match(t, /match-plan.assign/);
});

test('reference tab: analysis-only label, breakdown with shot strip, match plan, rough cut', async () => {
  const t = await page.go(`#/job/${JOB}/reference`, 'Match plan');
  assert.match(t, /Analysis only/);
  assert.match(t, /never used as footage/);
  assert.match(t, /Shot timeline/);
  assert.equal(page.view.querySelectorAll('button.shot').length, 5, 'one block per shot');
  assert.match(t, /cuts per 10s/);
  assert.match(t, /Hook rule/);
  assert.equal(page.view.querySelectorAll('svg.curve').length, 1, 'loudness chart drawn');
  assert.match(t, /Transcript not available/);
  assert.match(t, /No OCR is installed/);
  assert.equal(page.view.querySelectorAll('div.slot').length, 5, 'one slot per shot');
  assert.equal(page.view.querySelectorAll('div.assigned').length, 1);
  assert.match(t, /hook \(suggested\)/);
  assert.match(t, /Slots 2, 3, 4, 5 are empty and will be skipped/);
  await page.button(page.view, 'Queue rough cut').fire('click');
  await page.until(() => page.ctx.location.hash.endsWith('/renders'), 'jump to renders after queueing');
  const renders = await act('renders.list', { job: JOB });
  const rough = renders.find((r) => r.op === 'roughcut');
  assert.ok(rough, 'rough cut was queued from the page');
  assert.equal(rough.actor, 'dashboard');
  const done = await queue.waitFor(rough.id);
  assert.equal(done.status, 'done');
  assert.deepEqual(done.skipped_slots, [2, 3, 4, 5]);
});

test('the page and stylesheet use the brand and load nothing from outside', () => {
  const css = fs.readFileSync(path.join(h.APP, 'public', 'style.css'), 'utf8');
  for (const color of ['#14100E', '#FBF8F3', '#E87757', '#64694B', '#8D857B']) assert.ok(css.includes(color), `brand color ${color}`);
  assert.match(css, /Instrument Serif/);
  assert.match(css, /Nunito/);
  assert.match(css, /@media \(max-width: 560px\)/);
  for (const file of ['index.html', 'style.css', 'app.js']) {
    assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(fs.readFileSync(path.join(h.APP, 'public', file), 'utf8').replace(/https:\/\/…/g, '')), `${file} has no outside URLs`);
  }
});
