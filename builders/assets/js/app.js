// Ties the page to the stage. Scroll position picks a point between keyframes: camera, light, how much is drawing
// and how much is model. The same stage is handed to the visitor in the explore mode.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Lenis from 'lenis';
import { Stage, DEFAULT_STATE } from './stage.js';
import { lerp, clamp01, smoother } from './kit.js';
import { CAM } from './match.js';
import { runPerf } from './perf.js';

const q = new URLSearchParams(location.search);
const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const still = q.has('still');                 // test switch: no easing, the state jumps to where scroll says
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- the stage
let stage = null;
try {
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe || q.has('nowebgl')) throw new Error('no webgl2');
  const small = Math.min(innerWidth, innerHeight) < 700;
  stage = new Stage($('#canvas'), { maxDpr: small ? 1.75 : 2, shadow: small ? 2048 : 4096, quality: q.get('q') === 'fast' ? 'fast' : 'high', palette: q.get('palette') === 'paper' ? 'paper' : 'real' });
} catch (err) {
  body.classList.add('no-webgl');
  console.warn('3D stage not available, showing the still drawing instead.', err);
}

// ---------------------------------------------------------------- keyframes
// Camera: az and el are degrees around the target (0 is straight on from the front), dist in metres.
// ink 1 with build 0 is the drawing. build 1 is the model. dusk 0 to 1 runs day to after dark. blue is the blueprint.
// sx and sy slide the picture across the screen so the words have room.
const base = Object.assign({}, DEFAULT_STATE);
const K = {
  hero:    { az: 0, el: 1.6, dist: 158, tx: 0, ty: 3.5, tz: 0, fov: 10, ink: 1, build: 0, dusk: 0, blue: 0, bw: 0, explode: 0, sx: 0.125, sy: 0.15, sunAz: -52, sunEl: 34, dof: 0 },
  form:    { az: -34, el: 12, dist: 80, tx: 0, ty: 2.8, tz: -3, fov: 26, ink: 1, build: 0, dusk: 0, blue: 0, bw: 0, explode: 0, sx: 0.21, sy: 0.03, sunAz: -76, sunEl: 28, dof: 0 },
  buy:     { az: -22, el: 8, dist: 80, tx: 0, ty: 2.8, tz: -3, fov: 26, ink: 1, build: 1, dusk: 0, blue: 0, bw: 0, explode: 0, sx: 0.205, sy: 0.02, sunAz: -38, sunEl: 40, dof: 0.4 },
  sell:    { az: 13, el: 4.5, dist: 52, tx: 0.6, ty: 3.4, tz: 2, fov: 34, ink: 1, build: 1, dusk: 0, blue: 0, bw: 0, explode: 0, sx: 0.215, sy: 0.06, sunAz: -14, sunEl: 34, dof: 0.45 },
  photo:   null,   // worked out from the photo, see matchPhoto()
  build:   null,   // the same camera as the photo, as a blueprint
  explore: { az: -38, el: 25, dist: 108, tx: 0, ty: 6.6, tz: -6, fov: 24, ink: 1, build: 1, dusk: 0, blue: 1, bw: 0, explode: 1, sx: 0.06, sy: 0.02, sunAz: -38, sunEl: 40, dof: 0 },
  end:     { az: 30, el: 14, dist: 78, tx: 0, ty: 2.8, tz: -5, fov: 26, ink: 1, build: 1, dusk: 0, blue: 1, bw: 1, explode: 0, sx: 0.23, sy: -0.02, sunAz: -30, sunEl: 40, dof: 0.4 },
};
// Phone framing: the model sits in the upper part of the screen, the words below it.
const KM = {
  hero: { sx: 0, sy: 0.1, dist: 208 }, form: { sx: 0, sy: -0.17, dist: 92, az: -30 }, buy: { sx: 0, sy: -0.18, dist: 114 }, sell: { sx: 0, sy: -0.18, az: 10, dist: 47, tx: 0 },
  explore: { sx: 0, sy: -0.25, dist: 104 }, end: { sx: 0, sy: -0.2, dist: 86 },
};
const ORDER = ['hero', 'form', 'buy', 'sell', 'photo', 'build', 'explore'];
const NEXT = { hero: 'form', form: 'buy', buy: 'sell', sell: 'photo', photo: 'build', build: 'explore', explore: 'end' };
// When, inside each scene, each value makes its move. Anything not listed uses the scene's default window.
const TRACKS = {
  hero: { _: [0.22, 0.96] },
  form: { _: [0.08, 0.9], build: [0.16, 0.84], dof: [0.6, 0.95] },
  buy: { _: [0.1, 0.9] },
  sell: { _: [0.62, 0.96], dusk: [0.2, 0.42], dof: [0.62, 0.85] },
  photo: { _: [0, 1], dusk: [0.42, 0.66], blue: [0.42, 0.66] },
  build: { _: [0.04, 0.36], explode: [0.3, 0.8] },
  explore: { _: [0.03, 0.4], explode: [0.02, 0.22], bw: [0.12, 0.42], dof: [0.36, 0.46] },
};
const PHOTO = { on: [0.03, 0.34], off: [0.72, 0.98] };
// The camera that took the twilight photo, fitted to landmarks on the house: where it stood, its lens, and where the
// lens centre falls in the photo's own pixels.

// The twilight photo: its size, and how far across it the house runs.
const SHOT = { w: 1672, h: 941, left: 150, right: 1625 };
const photoEl = $('#photo'), photoImg = $('#photo img'), photoLine = $('#photo-line');
let photoBox = { x: 0, y: 0, s: 1 };

// Sets the camera for the photo scene to the one that took the photo, so the model lands on the house whatever the screen shape.
function matchPhoto() {
  const vw = innerWidth, vh = innerHeight;
  // fill the screen, but on a wide screen never crop the house itself off the sides
  let s = Math.max(vw / SHOT.w, vh / SHOT.h);
  if (vw / vh > 1.2) s = Math.max(vw / SHOT.w, Math.min(s, (0.995 * vw) / (SHOT.right - SHOT.left)));
  photoBox = { x: (vw - SHOT.w * s) / 2, y: (vh - SHOT.h * s) / 2, s };
  const st = Object.assign({}, base, {
    az: CAM.az, el: CAM.el, dist: CAM.dist, tx: CAM.target[0], ty: CAM.target[1], tz: CAM.target[2],
    fov: (2 * Math.atan(vh / 2 / (CAM.focal * s))) / DEG,
    sx: (photoBox.x + CAM.cx * s - vw / 2) / vw, sy: (photoBox.y + CAM.cy * s - vh / 2) / vh,
    ink: 1, build: 1, dusk: 1, blue: 0, bw: 0, explode: 0, sunAz: -30, sunEl: 36, dof: 0,
  });
  K.photo = st;
  K.build = Object.assign({}, st, { blue: 1, dusk: 0 });
}

let keys = {};
function prepareKeys() {
  matchPhoto();
  const phone = innerWidth < 768, fit = stage ? stage.fit() : 1;
  keys = {};
  Object.keys(K).forEach((name) => {
    const k = Object.assign({}, base, K[name], phone && KM[name] ? KM[name] : {});
    if (name !== 'photo' && name !== 'build') k.dist *= fit;
    keys[name] = k;
  });
}

// ---------------------------------------------------------------- scenes and scroll
const scenes = $$('.scene').map((el) => ({ el, name: el.dataset.scene, top: 0, height: 1, copy: $$('.copy', el).map((c) => ({ el: c, on: c.dataset.on.split(' ').map(Number), onPhone: c.dataset.onPhone ? c.dataset.onPhone.split(' ').map(Number) : null })) }));
const journey = $('#journey');
let journeyEnd = 0;
function measure() {
  scenes.forEach((s) => { const r = s.el.getBoundingClientRect(); s.top = r.top + scrollY; s.height = r.height; });
  journeyEnd = journey.getBoundingClientRect().bottom + scrollY;
}

let lenis = null;
if (!reduce && !still) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
}
const scrollTo = (y) => { if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else scrollTo2(y); };
const scrollTo2 = (y) => window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });

function where(y) {
  let i = 0;
  for (let k = 0; k < scenes.length; k++) if (y >= scenes[k].top) i = k;
  const s = scenes[i];
  return { i, s, t: clamp01((y - s.top) / s.height) };
}

const out = Object.assign({}, base);
// With reduced motion on, nothing glides: every value sits at one end of its move or the other.
const ease01 = (x) => (reduce ? (x < 0.5 ? 0 : 1) : smoother(x));
function stateAt(y) {
  const { s, t } = where(y);
  const a = keys[s.name], b = keys[NEXT[s.name]], tr = TRACKS[s.name];
  for (const k in base) {
    const w = tr[k] || tr._;
    out[k] = lerp(a[k], b[k], ease01((t - w[0]) / (w[1] - w[0])));
  }
  // The lens and the distance change together, so the house never shrinks and swells on the way between two views:
  // what is interpolated is how much of the scene the lens takes in.
  const w = tr.dist || tr._, u = ease01((t - w[0]) / (w[1] - w[0]));
  const spanA = a.dist * Math.tan((a.fov * DEG) / 2), spanB = b.dist * Math.tan((b.fov * DEG) / 2);
  out.dist = (spanA * Math.pow(spanB / spanA, u)) / Math.tan((out.fov * DEG) / 2);
  return out;
}

// ---------------------------------------------------------------- overlays: photo, part names, pins
const TAGS = [
  // in the order they sit down the exploded view, so the numbers read 1 to 7 from the top
  ['dormers', 'Twin dormers'], ['wings', 'Gabled wings'], ['copper', 'Copper-toned hip caps'], ['roof', 'Hipped porch roof'],
  ['brick', 'Painted brick'], ['porch', 'Brick porch and steps'], ['posts', 'Six cedar posts'],
];
const labelsEl = $('#labels');
const NS = 'http://www.w3.org/2000/svg';
const wires = document.createElementNS(NS, 'svg'); wires.setAttribute('class', 'wires'); labelsEl.appendChild(wires);
const tags = TAGS.map(([key, text], i) => {
  const el = document.createElement('div'); el.className = 'tag';
  el.innerHTML = '<b></b><span></span>'; el.firstChild.textContent = String(i + 1); el.lastChild.textContent = text;
  labelsEl.appendChild(el);
  const dot = document.createElement('i'); dot.className = 'tagdot'; dot.textContent = String(i + 1); labelsEl.appendChild(dot);
  const wire = document.createElementNS(NS, 'polyline'); wires.appendChild(wire);
  return { key, el, dot, wire, x: 0, y: 0, ok: false };
});
const pt = {};
// On a wide screen the names stack in a column to the right of the model, each joined to its point by an elbow line.
// On a phone only numbered points sit on the model and the names are listed in the words below.
function drawTags(amount) {
  const phone = innerWidth < 768, on = amount > 0.01 && stage;
  labelsEl.style.opacity = on ? amount : 0;
  if (!on) return;
  wires.setAttribute('viewBox', `0 0 ${stage.w} ${stage.h}`);
  tags.forEach((t) => { stage.project(stage.houseKit.anchors[t.key], pt); t.x = pt.x; t.y = pt.y; t.ok = pt.visible; });
  const order = tags.slice().sort((a, b) => a.y - b.y);
  const colX = stage.w - Math.max(stage.w * 0.045, 56) - 8, gap = 46;
  let y = Math.max(stage.h * 0.2, order[0].y - 30);
  const total = (order.length - 1) * gap; if (y + total > stage.h * 0.86) y = stage.h * 0.86 - total;
  order.forEach((t) => {
    t.dot.style.transform = `translate(${t.x}px, ${t.y}px)`; t.dot.style.opacity = t.ok ? 1 : 0;
    if (phone) { t.el.style.opacity = 0; t.wire.setAttribute('points', ''); return; }
    const w = t.el.offsetWidth, left = colX - w;
    t.el.style.opacity = t.ok ? 1 : 0;
    t.el.style.transform = `translate(${left}px, ${y - t.el.offsetHeight / 2}px)`;
    t.wire.setAttribute('points', t.ok ? `${t.x},${t.y} ${left - 34},${y} ${left - 8},${y}` : '');
    y += gap;
  });
}

// The photo is revealed from the ground up behind a fine ember line, the same way the model was built.
function drawPhoto(h, drift) {
  if (h <= 0.001) { photoEl.style.opacity = 0; photoLine.style.opacity = 0; return; }
  photoEl.style.opacity = 1;
  const top = h * 108;
  photoEl.style.setProperty('--h', top.toFixed(2) + '%');
  photoLine.style.opacity = Math.min(1, h * 8) * Math.min(1, (1.0 - h) * 8) > 0 ? Math.min(1, h * 8) * Math.max(0, Math.min(1, (1.0 - h) * 8)) : 0;
  photoLine.style.transform = `translateY(${(-top / 100) * innerHeight}px)`;
  const k = 1 + Math.sin(drift * Math.PI) * 0.02, cx = CAM.cx, cy = CAM.cy;   // eases in a touch and back, so both wipes meet a photo at rest
  photoImg.style.transform = `translate(${photoBox.x - (k - 1) * cx * photoBox.s}px, ${photoBox.y - (k - 1) * cy * photoBox.s}px) scale(${photoBox.s * k})`;
}

// ---------------------------------------------------------------- explore mode
const PINS = [
  { at: [0, 4.3, 3.3], title: 'Front of the house', note: 'Painted brick, a charcoal roof and twin dormers.', img: 'basil-front-lit.webp' },
  { at: [-2.9, 1.5, 3.1], title: 'Front porch', note: 'Cedar posts, brick underfoot and flowers by the door.', img: 'basil-porch.webp' },
  { at: [0.3, 0.5, -20.5], title: 'Pool', note: 'The pool terrace behind the house, at dusk.', img: 'basil-pool-night.webp' },
  { at: [-0.3, 1.2, -13.6], title: 'Back patio', note: 'Covered, with an outdoor kitchen.', img: 'basil-patio.webp' },
  { at: [-12.0, 1.5, -15], title: 'Garage and drive', note: 'Three bays along the side of the house.', img: 'basil-driveway.webp' },
  { at: [-38, 8.6, -46], title: 'The barn', note: 'White, with a cupola, across the lawn.', img: 'basil-barn.webp' },
  { at: [-2, 5.2, -68.5], title: 'Gazebo on the pond', note: 'A cedar frame at the edge of the water.', img: 'basil-gazebo.webp' },
];
const LOOKS = {
  drawing: { ink: 1, build: 0, dusk: 0, blue: 0, bw: 0 }, day: { ink: 1, build: 1, dusk: 0, blue: 0, bw: 0 },
  dusk: { ink: 1, build: 1, dusk: 1, blue: 0, bw: 0 }, blueprint: { ink: 1, build: 1, dusk: 0, blue: 1, bw: 0 },
};
const VIEWS = {
  front: { az: 0, el: 7, dist: 58, t: [0, 3.4, -2] }, porch: { az: 16, el: 5, dist: 31, t: [0.4, 3.6, 2] },
  pool: { az: 152, el: 24, dist: 58, t: [1, 3.2, -15] }, above: { az: 0, el: 66, dist: 96, t: [1, 0, -10] },
};
const viewer = $('#viewer'), pinsEl = $('#pins'), card = $('#card');
const free = Object.assign({}, base, LOOKS.day, { explode: 0, dof: 0.3 });
let exploring = false, controls = null, fly = null, lastFocus = null, turned = false;
const pins = PINS.map((p) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'pinbtn';
  b.setAttribute('aria-label', 'Photo: ' + p.title); b.innerHTML = '<span></span>'; b.firstChild.textContent = p.title;
  b.addEventListener('click', () => openCard(p, b));
  pinsEl.appendChild(b); return { p, el: b };
});
function openCard(p, btn) {
  pins.forEach((x) => x.el.classList.toggle('is-open', x.el === btn));
  $('#card-img').src = '/media/listing-basil-ln/' + p.img; $('#card-img').alt = p.title + ', Basil Lane';
  $('#card-title').textContent = p.title; $('#card-note').textContent = p.note;
  card.hidden = false; card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
}
function closeCard() { card.hidden = true; pins.forEach((x) => x.el.classList.remove('is-open')); }
$('.card-close').addEventListener('click', closeCard);

// A pin only shows when there is a clear line from the camera to the spot it marks. One ray per pin, and only when the view moved.
const ray = new THREE.Raycaster(), rayDir = new THREE.Vector3(), rayAt = new THREE.Vector3();
let solids = null, pinTick = 3;
function hidden(at) {
  if (!solids) { solids = []; stage.scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.layers.mask === 1 && o.geometry.attributes.position.count >= 12) solids.push(o); }); }
  const c = stage.camera.position; rayAt.fromArray(at);
  const far = c.distanceTo(rayAt); rayDir.subVectors(rayAt, c).normalize();
  ray.set(c, rayDir); ray.far = far - 0.9;
  // parts that are switched off (the dotted leaders of the take-apart view) do not block anything
  const shown = (o) => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
  return ray.intersectObjects(solids, false).some((h) => shown(h.object));
}
let pinTimer = 0;
function drawPins(settled) {
  if (!stage) return;
  const show = free.explode < 0.1 && cur.explode < 0.1, top = Math.max(110, stage.h * 0.14);
  pinTick++;
  pins.forEach((x) => {
    stage.project(x.p.at, pt);
    const inFrame = pt.visible && pt.x > 44 && pt.x < stage.w - 44 && pt.y > top && pt.y < stage.h - (stage.w < 768 ? 230 : 110);
    if (inFrame && (settled === true || pinTick % 4 === 0)) x.hid = hidden(x.p.at);
    x.ok = show && inFrame && !x.hid; x.sx = pt.x; x.sy = pt.y; x.depth = stage.camera.position.distanceToSquared(rayAt.fromArray(x.p.at));
  });
  // two pins that would sit on top of each other: the nearer one stays
  pins.forEach((a) => { if (a.ok) pins.forEach((b) => { if (b !== a && b.ok && b.depth > a.depth && Math.hypot(a.sx - b.sx, a.sy - b.sy) < 46) b.ok = false; }); });
  pins.forEach((x) => {
    x.el.style.opacity = x.ok ? 1 : 0; x.el.style.pointerEvents = x.ok ? 'auto' : 'none'; x.el.tabIndex = x.ok ? 0 : -1;
    x.el.style.transform = `translate(${x.sx}px, ${x.sy}px)`;
  });
  // one more look once the view has come to rest, so a pin never keeps the answer from a moment ago
  if (settled !== true) { clearTimeout(pinTimer); pinTimer = setTimeout(() => { if (exploring) drawPins(true); }, 140); }
}

function viewTo(name, instant) {
  const v = VIEWS[name]; if (!v || !controls) return;
  const fit = stage.fit(), a = v.az * DEG, e = v.el * DEG, d = v.dist * fit;
  const pos = new THREE.Vector3(v.t[0] + Math.sin(a) * Math.cos(e) * d, v.t[1] + Math.sin(e) * d, v.t[2] + Math.cos(a) * Math.cos(e) * d);
  const tgt = new THREE.Vector3(...v.t);
  controls.autoRotate = false; $('#viewer-hint').classList.add('is-gone');
  if (instant || reduce || still) { stage.camera.position.copy(pos); controls.target.copy(tgt); controls.update(); turned = true; return; }
  fly = { t: 0, p0: stage.camera.position.clone(), p1: pos, t0: controls.target.clone(), t1: tgt };
}
function setLook(name) {
  Object.assign(free, LOOKS[name]);
  $$('[data-look]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.look === name)));
  if (name === 'drawing') closeCard();
}

function openViewer(look) {
  if (!stage || exploring) return;
  lastFocus = document.activeElement;
  exploring = true; viewer.hidden = false;
  if (lenis) lenis.stop();
  const canvas = stage.canvas;
  canvas.style.transition = 'opacity 0.35s'; canvas.style.opacity = 0;
  setTimeout(() => {
    body.classList.add('is-exploring');
    stage.free = true;
    if (!controls) {
      controls = new OrbitControls(stage.camera, canvas);
      controls.enableDamping = true; controls.dampingFactor = 0.07; controls.enablePan = false;
      controls.minDistance = 13; controls.maxDistance = 135; controls.maxPolarAngle = 87 * DEG; controls.minPolarAngle = 12 * DEG;
      controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.7; controls.autoRotateSpeed = 0.35;
      controls.addEventListener('change', () => { turned = true; });
      controls.addEventListener('start', () => { controls.autoRotate = false; fly = null; $('#viewer-hint').classList.add('is-gone'); });
    }
    controls.enabled = true;
    Object.assign(cur, free, LOOKS[look] || LOOKS.day, { explode: 0 });
    setLook(look || 'day'); free.explode = 0; $('#apart').value = 0;
    // opens on a three quarter view, pulled back far enough that the whole house fits the screen it is on
    const k = stage.fit() * (innerWidth < 768 ? 1.32 : 1);
    controls.target.set(0, 2.6, -4); stage.camera.position.set(-20 * k, 2.6 + 15 * k, -4 + 58 * k); controls.update();
    controls.autoRotate = !reduce && !still;
    $('#viewer-hint').classList.remove('is-gone');
    canvas.style.opacity = 1;
    $('#close-viewer').focus({ preventScroll: true });
    setTimeout(() => { canvas.style.transition = ''; canvas.style.opacity = ''; }, 500);
  }, 360);
}
function closeViewer() {
  if (!exploring) return;
  const canvas = stage.canvas;
  canvas.style.transition = 'opacity 0.35s'; canvas.style.opacity = 0;
  closeCard();
  setTimeout(() => {
    exploring = false; stage.free = false; controls.enabled = false; fly = null;
    body.classList.remove('is-exploring');
    Object.assign(cur, stateAt(scrollY)); needs = 4;   // put the chapter's own camera and look back
    canvas.style.opacity = 1;
    if (lenis) lenis.start();
    setTimeout(() => { viewer.hidden = true; canvas.style.transition = ''; canvas.style.opacity = ''; }, 500);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }, 360);
}
$('#open-viewer').addEventListener('click', () => openViewer('day'));
$('#close-viewer').addEventListener('click', closeViewer);
$$('[data-look]').forEach((b) => b.addEventListener('click', () => setLook(b.dataset.look)));
$$('[data-view]').forEach((b) => b.addEventListener('click', () => viewTo(b.dataset.view)));
// Taking it apart reads best from a three quarter view, so the first pull on the slider swings the camera there.
VIEWS.apart = { az: -34, el: 24, dist: 84, t: [0, 6, -6] };
$('#apart').addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  if (free.explode === 0 && v > 0) viewTo('apart');
  free.explode = v; if (v > 0.1) closeCard();
});
addEventListener('keydown', (e) => {
  if (!exploring) return;
  if (e.key === 'Escape') { if (!card.hidden) closeCard(); else closeViewer(); }
  if (e.key === 'Tab') {   // keep the keyboard inside the viewer while it is open
    const f = $$('button, input', viewer).filter((x) => x.offsetParent !== null && getComputedStyle(x).pointerEvents !== 'none');
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// ---------------------------------------------------------------- page furniture
const header = $('#header'), rail = $$('#rail a');
const solid = $$('[data-surface]');
let lastY = 0, toneNow = '';
function furniture(y, w) {
  // header hides on the way down, returns on the way up
  if (!exploring) {
    if (y > lastY + 4 && y > innerHeight * 0.6) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 80) header.classList.remove('is-hidden');
  }
  lastY = y;
  let surf = '';
  if (y + 40 > journeyEnd) for (const s of solid) { const r = s.getBoundingClientRect(); if (r.top <= 40 && r.bottom > 40) { surf = s.dataset.surface; break; } }
  header.classList.toggle('on-dark', surf === 'dark'); header.classList.toggle('on-light', surf === 'light');
  const name = w.s.name === 'photo' ? 'sell' : w.s.name;
  rail.forEach((a) => a.classList.toggle('is-active', a.dataset.for === name));
  // where the picture fills the screen edge to edge, the chapter marks step aside
  body.classList.toggle('is-bleed', w.s.name === 'photo' || (w.s.name === 'sell' && w.t > 0.66) || (w.s.name === 'build' && w.t < 0.2));
  // copy blocks switch on and off inside their scene
  scenes.forEach((s, i) => {
    const t = i === w.i ? w.t : (i < w.i ? 2 : -1);
    s.copy.forEach((c) => {
      const r = c.onPhone && innerWidth < 768 ? c.onPhone : c.on;
      const on = body.classList.contains('is-ready') && t >= r[0] && t < r[1];
      c.el.classList.toggle('is-on', on); c.el.classList.toggle('is-past', !on && t >= r[1]);
    });
  });
}
function setTone(tone, bg) {
  if (tone !== toneNow) { toneNow = tone; body.dataset.tone = tone; }
  if (bg) body.style.setProperty('--stage-bg', bg);
}

$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href').slice(1), s = scenes.find((x) => x.el.id === id);
  if (!s) return;
  e.preventDefault();
  scrollTo(id === 'top' ? 0 : s.top + s.height * (id === 'explore' ? 0.5 : 0.42));
}));

// keyboard: when a link inside a chapter takes focus, bring that chapter on screen so the focus is never on something hidden
scenes.forEach((s) => s.copy.forEach((c) => c.el.addEventListener('focusin', () => {
  if (c.el.classList.contains('is-on') || exploring) return;
  window.scrollTo(0, s.top + s.height * ((c.on[0] + Math.min(1, c.on[1])) / 2));
})));

const io = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (!en.isIntersecting) return;
  en.target.classList.add('is-in'); io.unobserve(en.target);
  const b = en.target.querySelector('[data-count]');
  if (b && !reduce && !still) {
    const end = parseFloat(b.dataset.count), dec = String(end).includes('.') ? 1 : 0, pre = b.dataset.prefix || '', suf = b.dataset.suffix || '', t0 = performance.now();
    const tick = (now) => { const u = smoother((now - t0) / 1400); b.textContent = pre + (end * u).toFixed(dec) + suf; if (u < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
}), { rootMargin: '0px 0px -8% 0px' });
$$('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 0.07 + 's'; io.observe(el); });

const vio = new IntersectionObserver((entries) => entries.forEach((en) => {
  const v = en.target;
  if (en.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
}), { threshold: 0.15 });
$$('video[data-autoplay]').forEach((v) => vio.observe(v));

// the photo strip can be dragged with a mouse
{
  const strip = $('#strip'); let down = false, x0 = 0, s0 = 0, moved = 0;
  strip.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; x0 = e.clientX; s0 = strip.scrollLeft; moved = 0; });
  addEventListener('pointermove', (e) => { if (!down) return; moved = Math.abs(e.clientX - x0); if (moved > 4) strip.classList.add('is-drag'); strip.scrollLeft = s0 - (e.clientX - x0); });
  addEventListener('pointerup', () => { down = false; strip.classList.remove('is-drag'); });
}

// a slow drift of the camera with the pointer, on screens that have one
const sway = { x: 0, y: 0 };
if (!reduce && !still && matchMedia('(hover: hover)').matches) {
  addEventListener('pointermove', (e) => { sway.x = (e.clientX / innerWidth - 0.5) * -1.6; sway.y = (e.clientY / innerHeight - 0.5) * 0.7; }, { passive: true });
}

// ---------------------------------------------------------------- the loop
const cur = Object.assign({}, base);
let last = performance.now(), shown = '', slow = 0, counted = 0, ready = false, needs = 3;
const forceQ = q.has('q');

let sizeW = 0, sizeH = 0;
function resize() {
  // a phone's address bar sliding away changes the height a little on every scroll: not worth rebuilding the stage for
  if (innerWidth === sizeW && Math.abs(innerHeight - sizeH) < 130) return;
  sizeW = innerWidth; sizeH = innerHeight;
  if (stage) stage.resize();
  measure(); prepareKeys(); needs = 3;
  if (stage) stage.U.uWipe0.value = innerWidth < 768 ? 0.46 : -0.05;   // on a phone the rising line starts at the top of the words, not behind them
}
addEventListener('resize', resize);

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (lenis) lenis.raf(now);
  const y = scrollY, w = where(y);
  const off = !exploring && y > journeyEnd + 4;
  body.classList.toggle('stage-off', off);
  body.classList.toggle('is-below', y + innerHeight * 0.55 > journeyEnd);
  furniture(y, w);
  if (off) return;

  const target = exploring ? free : stateAt(y);
  const ease = still || reduce ? 1 : 1 - Math.exp(-dt * 7.5);
  let moved = 0;
  for (const k in base) { const d = target[k] - cur[k]; if (Math.abs(d) > 1e-5) { cur[k] += d * ease; moved += Math.abs(d); } }

  // photo: fades in over the matched model, drifts, then gives way to the blueprint
  let po = 0, drift = 0;
  if (!exploring && w.s.name === 'photo') {
    po = Math.min(smoother((w.t - PHOTO.on[0]) / (PHOTO.on[1] - PHOTO.on[0])), 1 - smoother((w.t - PHOTO.off[0]) / (PHOTO.off[1] - PHOTO.off[0])));
    if (reduce) po = po < 0.5 ? 0 : 1;   // the photo holds still: any drift would pull it off the model at the second wipe
  }
  drawPhoto(po, drift);

  if (!stage) {
    setTone(po > 0.5 ? 'dark' : 'light');   // without 3D the only dark moment is the photograph
    if (!ready) { ready = true; window.__ready = true; body.classList.remove('is-loading'); body.classList.add('is-ready'); }
    return;
  }

  if (exploring && controls) {
    if (fly) {
      fly.t = Math.min(1, fly.t + dt / 1.5); const u = smoother(fly.t);
      stage.camera.position.lerpVectors(fly.p0, fly.p1, u); controls.target.lerpVectors(fly.t0, fly.t1, u);
      if (fly.t >= 1) fly = null;
    }
    controls.update(dt);
    stage.focusPoint.copy(controls.target);
    const want = !card.hidden && innerWidth >= 768 ? 0.11 : 0;
    if (Math.abs(want - stage.freeShift) > 0.0005) { stage.freeShift += (want - stage.freeShift) * (still || reduce ? 1 : Math.min(1, dt * 6)); moved += 1; }
    if (turned || fly || forceDraw) moved += 1;   // only draw a new frame when the view actually changed
    turned = false;
  } else {
    // the pointer leans the camera a little, except near the photo, where the model has to sit exactly on it
    const n = w.s.name, hold = n === 'photo' ? 1 : n === 'sell' ? smoother((w.t - 0.56) / 0.3) : n === 'build' ? 1 - smoother((w.t - 0.04) / 0.2) : 0;
    const wx = sway.x * (1 - hold), wy = sway.y * (1 - hold);
    stage.sway.x += (wx - stage.sway.x) * Math.min(1, dt * 2.5); stage.sway.y += (wy - stage.sway.y) * Math.min(1, dt * 2.5);
    if (Math.abs(wx - stage.sway.x) > 0.002) moved += 1;
  }

  const sig = stage.w + 'x' + stage.h;
  if (moved > 1e-4 || needs > 0 || forceDraw || sig !== shown) {
    shown = sig; if (needs > 0) needs--;
    stage.apply(cur);
    if (po < 0.999) stage.render();
    // drop to the lighter setting if this machine cannot keep up
    if (!forceQ && ready && dt > 0 && counted < 90) { counted++; if (dt > 0.034) slow++; if (counted === 90 && slow > 50) { stage.setQuality('fast'); needs = 2; } }
    const c = stage.low;   // the backdrop at eye level, which is what sits behind the words
    // the words change sides when the rising line reaches them: straight away on a phone, where they sit low, halfway up on a wide screen
    const blueprint = cur.blue * (1 - (innerWidth < 768 ? clamp01(cur.bw * 14) : clamp01((cur.bw - 0.45) * 8)));
    // while the blueprint is up, the words follow the same switch as their backing, so the two never disagree
    const tone = po > 0.5 ? 'dark' : cur.blue > 0.5 ? (blueprint > 0.5 ? 'dark' : 'light') : stage.tone;
    setTone(tone, blueprint > 0.5 ? '#14100E' : '#' + c.getHexString());
    drawTags(exploring ? 0 : clamp01((cur.explode - 0.55) / 0.35) * cur.blue * (1 - clamp01(cur.bw * 6)));
    if (exploring) drawPins();
  }
  if (!ready) {
    ready = true; window.__ready = true;
    setTimeout(() => { body.classList.remove('is-loading'); body.classList.add('is-ready'); }, still ? 0 : 500);
  }
}

// ---------------------------------------------------------------- frame timing
// ?perf=1, or Shift+P three times: scroll the whole story and then turn the model in the viewer, drawing every frame,
// and show how long the frames took on this machine. See perf.js.
let forceDraw = false;
function startPerf() {
  if (!stage) return;
  const top = scenes[0].top, end = journeyEnd - innerHeight;
  const go = (y) => { if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); };
  const ex = scenes.find((x) => x.name === 'explore');
  const tgt = new THREE.Vector3(0, 3.4, -4);
  runPerf({
    stage, force: (on) => { forceDraw = on; },
    phases: [
      { name: 'scroll', label: 'Scrolling the whole story', seconds: 24, begin: () => { if (exploring) closeViewer(); }, drive: (u) => go(top + (end - top) * u) },
      { name: 'orbit', label: 'Turning the model in the viewer', seconds: 10,
        begin: () => { go(ex.top + ex.height * 0.62); openViewer('day'); },
        drive: (u) => {
          if (!controls) return;
          const a = u * Math.PI * 2, d = 62 * stage.fit(), e = 16 * DEG;
          controls.autoRotate = false; fly = null;
          stage.camera.position.set(tgt.x + Math.sin(a) * Math.cos(e) * d, tgt.y + Math.sin(e) * d, tgt.z + Math.cos(a) * Math.cos(e) * d);
          controls.target.copy(tgt); controls.update(); turned = true;
        },
        end: () => closeViewer() },
    ],
  });
}
let pKeys = 0, pLast = 0;
addEventListener('keydown', (e) => {
  if (e.key !== 'P' || !e.shiftKey) return;
  const now = performance.now(); pKeys = now - pLast < 900 ? pKeys + 1 : 1; pLast = now;
  if (pKeys >= 3) { pKeys = 0; startPerf(); }
});

// ---------------------------------------------------------------- start
function start() {
  resize();
  Object.assign(cur, stateAt(scrollY));
  if (q.has('at')) {   // test switch: ?at=buy:0.5 jumps to the middle of the Buy scene
    const [name, t] = q.get('at').split(':'), s = scenes.find((x) => x.name === name);
    if (s) window.scrollTo(0, s.top + s.height * parseFloat(t || 0));
    Object.assign(cur, stateAt(scrollY));
  }
  requestAnimationFrame(frame);
  if (q.has('view')) setTimeout(() => {
    openViewer(q.get('look') || 'day');
    setTimeout(() => {
      if (q.has('v')) viewTo(q.get('v'), true);
      if (q.has('apart')) { free.explode = parseFloat(q.get('apart')); $('#apart').value = free.explode; }
      if (q.has('pin')) pins[parseInt(q.get('pin'), 10)].el.click();
    }, 500);
  }, 700);
  if (q.has('perf')) setTimeout(startPerf, 1500);
  window.__stage = stage; window.__app = { cur, keys, openViewer, closeViewer, setLook, viewTo, startPerf };
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start); else start();
