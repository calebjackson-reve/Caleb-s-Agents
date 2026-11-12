// Ties the page to the stage. Scroll position picks a point between keyframes: camera, light, how much is drawing
// and how much is model. The same stage is handed to the visitor in the explore mode.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Lenis from 'lenis';
import { Stage, DEFAULT_STATE } from './stage.js';
import { lerp, clamp01, smoother } from './kit.js';

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
  stage = new Stage($('#canvas'), { maxDpr: small ? 1.75 : 2, quality: q.get('q') === 'fast' ? 'fast' : 'high' });
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
  hero:    { az: 0, el: 1.6, dist: 150, tx: 0, ty: 3.3, tz: 0, fov: 10, ink: 1, build: 0, dusk: 0, blue: 0, explode: 0, sx: 0.14, sy: 0.15, sunAz: -52, sunEl: 34, dof: 0 },
  form:    { az: -34, el: 12, dist: 54, tx: 0, ty: 2.6, tz: -3, fov: 26, ink: 1, build: 0, dusk: 0, blue: 0, explode: 0, sx: 0.17, sy: 0.03, sunAz: -76, sunEl: 28, dof: 0 },
  buy:     { az: -22, el: 8, dist: 47, tx: 0, ty: 2.6, tz: -3, fov: 26, ink: 1, build: 1, dusk: 0, blue: 0, explode: 0, sx: 0.17, sy: 0.02, sunAz: -38, sunEl: 40, dof: 0.45 },
  sell:    { az: 19, el: 3.2, dist: 19, tx: 0.4, ty: 2.5, tz: 2, fov: 36, ink: 1, build: 1, dusk: 0, blue: 0, explode: 0, sx: 0.2, sy: 0.02, sunAz: -14, sunEl: 34, dof: 0.6 },
  photo:   null,   // worked out from the photo, see matchPhoto()
  build:   null,   // the same camera as the photo, as a blueprint
  explore: { az: -38, el: 25, dist: 76, tx: 0, ty: 5.2, tz: -6, fov: 24, ink: 1, build: 1, dusk: 0, blue: 1, explode: 1, sx: 0.15, sy: 0.02, sunAz: -38, sunEl: 40, dof: 0 },
  end:     { az: 30, el: 14, dist: 56, tx: 0, ty: 2.6, tz: -5, fov: 26, ink: 1, build: 1, dusk: 0, blue: 0, explode: 0, sx: 0.13, sy: -0.02, sunAz: -30, sunEl: 40, dof: 0.5 },
};
// Phone framing: the model sits in the upper part of the screen, the words below it.
const KM = {
  hero: { sx: 0, sy: 0.1, dist: 168 }, form: { sx: 0, sy: -0.17, dist: 58, az: -30 }, buy: { sx: 0, sy: -0.18, dist: 52 }, sell: { sx: 0, sy: -0.18, az: 12, dist: 17 },
  explore: { sx: 0, sy: -0.16, dist: 80 }, end: { sx: 0, sy: -0.2, dist: 60 },
};
const ORDER = ['hero', 'form', 'buy', 'sell', 'photo', 'build', 'explore'];
const NEXT = { hero: 'form', form: 'buy', buy: 'sell', sell: 'photo', photo: 'build', build: 'explore', explore: 'end' };
// When, inside each scene, each value makes its move. Anything not listed uses the scene's default window.
const TRACKS = {
  hero: { _: [0.22, 0.96] },
  form: { _: [0.08, 0.9], build: [0.16, 0.84], dof: [0.6, 0.95] },
  buy: { _: [0.1, 0.9] },
  sell: { _: [0.22, 0.94], dusk: [0.12, 0.74], dof: [0.2, 0.6] },
  photo: { _: [0, 1], dusk: [0.42, 0.66], blue: [0.42, 0.66] },
  build: { _: [0.08, 0.8], explode: [0.32, 0.86] },
  explore: { _: [0.03, 0.46], explode: [0.02, 0.34], blue: [0.2, 0.44], dof: [0.3, 0.5] },
};
const PHOTO = { on: [0.03, 0.34], off: [0.72, 0.98] };

// Where the porch sits in the twilight photo, in the photo's own pixels: the feet of the first and last post.
const SHOT = { w: 1672, h: 941, x1: 493, x2: 1109, floor: 698 };
const photoEl = $('#photo'), photoImg = $('#photo img'), photoLine = $('#photo-line');
let photoBox = { x: 0, y: 0, s: 1 };

// Sets the camera for the photo scene so the model's porch lands on the porch in the photo, whatever the screen shape.
function matchPhoto() {
  const vw = innerWidth, vh = innerHeight;
  const s = Math.max(vw / SHOT.w, vh / SHOT.h);
  photoBox = { x: (vw - SHOT.w * s) / 2, y: (vh - SHOT.h * s) / 2, s };
  const st = Object.assign({}, base, { az: 6, el: 1.4, dist: 60, tx: 0, ty: 3.4, tz: 2.65, fov: 24, ink: 1, build: 1, dusk: 1, blue: 0, explode: 0, sx: 0, sy: 0, sunAz: -30, sunEl: 36, dof: 0 });
  if (stage) {
    const want = (SHOT.x2 - SHOT.x1) * s, a = {}, b = {};
    const P1 = [-4.83, 0.76, 2.65], P2 = [4.83, 0.76, 2.65];
    for (let i = 0; i < 4; i++) {
      stage.apply(st); stage.camera.updateMatrixWorld();
      stage.project(P1, a); stage.project(P2, b);
      st.dist *= (b.x - a.x) / want;
    }
    stage.apply(st); stage.camera.updateMatrixWorld();
    stage.project(P1, a); stage.project(P2, b);
    st.sx = (photoBox.x + ((SHOT.x1 + SHOT.x2) / 2) * s - (a.x + b.x) / 2) / vw;
    st.sy = (photoBox.y + SHOT.floor * s - (a.y + b.y) / 2) / vh;
  }
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
const scenes = $$('.scene').map((el) => ({ el, name: el.dataset.scene, top: 0, height: 1, copy: $$('.copy', el).map((c) => ({ el: c, on: c.dataset.on.split(' ').map(Number) })) }));
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
function stateAt(y) {
  const { s, t } = where(y);
  const a = keys[s.name], b = keys[NEXT[s.name]], tr = TRACKS[s.name];
  for (const k in base) {
    const w = tr[k] || tr._;
    out[k] = lerp(a[k], b[k], smoother((t - w[0]) / (w[1] - w[0])));
  }
  return out;
}

// ---------------------------------------------------------------- overlays: photo, part names, pins
const TAGS = [
  ['roof', 'Hipped porch roof'], ['copper', 'Copper-toned hip caps'], ['dormers', 'Twin dormers'], ['wings', 'Gabled wings'],
  ['posts', 'Six cedar posts'], ['brick', 'Painted brick'], ['porch', 'Brick porch and steps'],
];
const labelsEl = $('#labels');
const tags = TAGS.map(([key, text]) => {
  const el = document.createElement('div'); el.className = 'tag';
  el.innerHTML = '<i></i><u></u><span></span>'; el.lastChild.textContent = text;
  labelsEl.appendChild(el); return { key, el };
});
const pt = {};
function drawTags(amount) {
  const phone = innerWidth < 768;
  tags.forEach((t, i) => {
    if (amount < 0.01 || !stage || (phone && (i === 1 || i === 3 || i === 6))) { t.el.style.opacity = 0; return; }
    stage.project(stage.houseKit.anchors[t.key], pt);
    const flip = pt.x + t.el.offsetWidth + 12 > stage.w;
    t.el.classList.toggle('flip', flip);
    t.el.style.opacity = pt.visible ? amount : 0;
    t.el.style.transform = `translate(${flip ? pt.x - t.el.offsetWidth + 5 : pt.x - 5}px, ${pt.y - t.el.offsetHeight / 2}px)`;
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
  const k = 1 + drift * 0.04, cx = (SHOT.x1 + SHOT.x2) / 2, cy = SHOT.floor - 150;
  photoImg.style.transform = `translate(${photoBox.x - (k - 1) * cx * photoBox.s}px, ${photoBox.y - (k - 1) * cy * photoBox.s}px) scale(${photoBox.s * k})`;
}

// ---------------------------------------------------------------- explore mode
const PINS = [
  { at: [0, 6.6, 0.5], face: [0, 0.3, 1], title: 'Front of the house', note: 'Painted brick, a charcoal roof and twin dormers.', img: 'basil-front-lit.webp' },
  { at: [-2.9, 1.5, 3.1], face: [0, 0, 1], title: 'Front porch', note: 'Cedar posts, brick underfoot and flowers by the door.', img: 'basil-porch.webp' },
  { at: [0.3, 0.7, -20.5], face: [0.3, 0.5, -1], title: 'Pool', note: 'The pool terrace behind the house, at dusk.', img: 'basil-pool-night.webp' },
  { at: [-0.3, 2.4, -12.4], face: [0, 0, -1], title: 'Back patio', note: 'Covered, with an outdoor kitchen.', img: 'basil-patio.webp' },
  { at: [-11.2, 1.6, -15], face: [-1, 0, 0], title: 'Garage and drive', note: 'Three bays along the side of the house.', img: 'basil-driveway.webp' },
  { at: [-38, 6.2, -46], title: 'The barn', note: 'White, with a cupola, across the lawn.', img: 'basil-barn.webp' },
  { at: [-2, 4.4, -68.5], title: 'Gazebo on the pond', note: 'A cedar frame at the edge of the water.', img: 'basil-gazebo.webp' },
];
const LOOKS = {
  drawing: { ink: 1, build: 0, dusk: 0, blue: 0 }, day: { ink: 1, build: 1, dusk: 0, blue: 0 },
  dusk: { ink: 1, build: 1, dusk: 1, blue: 0 }, blueprint: { ink: 1, build: 1, dusk: 0, blue: 1 },
};
const VIEWS = {
  front: { az: 0, el: 7, dist: 54, t: [0, 3, -2] }, porch: { az: 18, el: 4, dist: 18, t: [0.5, 2.5, 2] },
  pool: { az: 152, el: 22, dist: 48, t: [0, 1.5, -17] }, above: { az: -28, el: 60, dist: 100, t: [0, 0, -22] },
};
const viewer = $('#viewer'), pinsEl = $('#pins'), card = $('#card');
const free = Object.assign({}, base, LOOKS.day, { explode: 0, dof: 0.35 });
let exploring = false, controls = null, fly = null, lastFocus = null, turned = false;
const pins = PINS.map((p) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'pinbtn';
  b.setAttribute('aria-label', 'Photo: ' + p.title); b.innerHTML = '<span></span>'; b.firstChild.textContent = p.title;
  b.addEventListener('click', () => openCard(p, b));
  pinsEl.appendChild(b); return { p, el: b };
});
function openCard(p, btn) {
  pins.forEach((x) => x.el.classList.toggle('is-open', x.el === btn));
  $('#card-img').src = '../media/listing-basil-ln/' + p.img; $('#card-img').alt = p.title + ', Basil Lane';
  $('#card-title').textContent = p.title; $('#card-note').textContent = p.note;
  card.hidden = false; card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
}
function closeCard() { card.hidden = true; pins.forEach((x) => x.el.classList.remove('is-open')); }
$('.card-close').addEventListener('click', closeCard);

function drawPins() {
  if (!stage) return;
  const show = free.blue < 0.5 && free.explode < 0.1;
  pins.forEach((x) => {
    stage.project(x.p.at, pt);
    const f = x.p.face, c = stage.camera.position;
    const facing = !f || (c.x - x.p.at[0]) * f[0] + (c.y - x.p.at[1]) * f[1] + (c.z - x.p.at[2]) * f[2] > 0;
    const ok = show && facing && pt.visible && pt.x > 20 && pt.x < stage.w - 20 && pt.y > 70 && pt.y < stage.h - 20;
    x.el.style.opacity = ok ? 1 : 0; x.el.style.pointerEvents = ok ? 'auto' : 'none';
    x.el.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
  });
}

function viewTo(name, instant) {
  const v = VIEWS[name]; if (!v || !controls) return;
  const fit = stage.fit(), a = v.az * DEG, e = v.el * DEG, d = v.dist * fit;
  const pos = new THREE.Vector3(v.t[0] + Math.sin(a) * Math.cos(e) * d, v.t[1] + Math.sin(e) * d, v.t[2] + Math.cos(a) * Math.cos(e) * d);
  const tgt = new THREE.Vector3(...v.t);
  controls.autoRotate = false;
  if (instant || reduce || still) { stage.camera.position.copy(pos); controls.target.copy(tgt); controls.update(); return; }
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
    viewTo('front', true);
    stage.camera.position.set(-34, 16, 46); controls.target.set(0, 2.6, -4); controls.update();
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
    Object.assign(cur, stateAt(scrollY));
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
$('#apart').addEventListener('input', (e) => { free.explode = parseFloat(e.target.value); if (free.explode > 0.1) closeCard(); });
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
  // copy blocks switch on and off inside their scene
  scenes.forEach((s, i) => {
    const t = i === w.i ? w.t : (i < w.i ? 2 : -1);
    s.copy.forEach((c) => {
      const on = body.classList.contains('is-ready') && t >= c.on[0] && t < c.on[1];
      c.el.classList.toggle('is-on', on); c.el.classList.toggle('is-past', !on && t >= c.on[1]);
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
  scrollTo(id === 'top' ? 0 : s.top + s.height * (id === 'explore' ? 0.34 : 0.42));
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

function resize() {
  if (stage) stage.resize();
  measure(); prepareKeys(); needs = 3;
}
addEventListener('resize', resize);

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (lenis) lenis.raf(now);
  const y = scrollY, w = where(y);
  const off = !exploring && y > journeyEnd + 4;
  body.classList.toggle('stage-off', off);
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
    drift = w.t;
  }
  drawPhoto(po, drift);

  if (!stage) {
    setTone(w.s.name === 'photo' || w.s.name === 'build' ? 'dark' : 'light');
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
    if (turned || fly) moved += 1;   // only draw a new frame when the view actually changed
    turned = false;
  } else {
    stage.sway.x += (sway.x - stage.sway.x) * Math.min(1, dt * 2.5); stage.sway.y += (sway.y - stage.sway.y) * Math.min(1, dt * 2.5);
    if (Math.abs(sway.x - stage.sway.x) > 0.002) moved += 1;
  }

  const sig = stage.w + 'x' + stage.h;
  if (moved > 1e-4 || needs > 0 || sig !== shown) {
    shown = sig; if (needs > 0) needs--;
    stage.apply(cur);
    if (po < 0.999) stage.render();
    // drop to the lighter setting if this machine cannot keep up
    if (!forceQ && ready && dt > 0 && counted < 90) { counted++; if (dt > 0.034) slow++; if (counted === 90 && slow > 50) { stage.setQuality('fast'); needs = 2; } }
    const c = stage.bg;
    setTone(po > 0.5 ? 'dark' : stage.tone, cur.blue > 0.5 ? '#14100E' : `rgb(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)})`);
    drawTags(exploring ? 0 : clamp01((cur.explode - 0.5) / 0.4) * cur.blue);
    if (exploring) drawPins();
  }
  if (!ready) {
    ready = true; window.__ready = true;
    setTimeout(() => { body.classList.remove('is-loading'); body.classList.add('is-ready'); }, still ? 0 : 500);
  }
}

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
  window.__stage = stage; window.__app = { cur, keys, openViewer, closeViewer, setLook, viewTo };
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start); else start();
