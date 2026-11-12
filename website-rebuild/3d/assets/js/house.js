// The Basil Lane house, built in code from the listing photos and the front elevation drawing.
// Sizes are in metres and were read off the elevation using the front door (about 2.4 m) as the ruler.
// It is an illustration of the outside of the house. It is not a floor plan and it is not to scale.
import * as THREE from 'three';
import { Bin, box, roof, prismZ, prismX } from './kit.js';
import { glowTexture } from './materials.js';

export const D = {
  half: 10.4,        // half the width of the front
  wingIn: 5.1,       // where the wings start, measured from the centre
  porchD: 2.95,      // porch depth
  wingZ: 2.7,        // front wall of the wings
  bayZ: 3.3,         // front of the small gabled bays
  back: -10,         // back wall of the main house
  garageBack: -20,   // back wall of the garage wing
  floor: 0.76,       // porch floor above the lawn
  pavEave: 4.05, pavRidge: 8.3,
  wingEave: 3.3, wingRidge: 6.9,
  barRidge: 6.2,
};

const m4 = (x, y, z, ry = 0) => new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);

// A straight board between two points.
function beam(p0, p1, w = 0.12, h = 0.12) {
  const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1);
  const len = a.distanceTo(b);
  const g = new THREE.BoxGeometry(w, h, len).toNonIndexed();
  const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0));
  m.setPosition(a.clone().add(b).multiplyScalar(0.5));
  g.applyMatrix4(m);
  return g;
}

// Window in its own space: bottom centre of the glass at the origin, facing +Z.
function addWindow(bin, M, w, h, o, mat) {
  const f = 0.07, cols = o.cols || 2, rows = o.rows || 3;
  bin.add(M.glass, box(-w / 2, w / 2, 0, h, 0.01, 0.03), mat);
  bin.add(M.trim, box(-w / 2 - f, -w / 2, -f, h + f, 0, 0.12), mat);
  bin.add(M.trim, box(w / 2, w / 2 + f, -f, h + f, 0, 0.12), mat);
  bin.add(M.trim, box(-w / 2, w / 2, h, h + f, 0, 0.12), mat);
  bin.add(M.trim, box(-w / 2 - f - 0.03, w / 2 + f + 0.03, -f - 0.03, 0, 0, 0.15), mat);
  for (let c = 1; c < cols; c++) {
    const x = -w / 2 + (w * c) / cols, t = o.mullion && c === cols / 2 ? 0.04 : 0.012;
    bin.add(M.trim, box(x - t, x + t, 0, h, 0.03, 0.08), mat);
  }
  for (let r = 1; r < rows; r++) {
    const y = (h * r) / rows;
    bin.add(M.trim, box(-w / 2, w / 2, y - 0.012, y + 0.012, 0.03, 0.08), mat);
  }
  if (o.shutters) {
    const sw = o.shutters;
    [-1, 1].forEach((s) => {
      const x0 = s * (w / 2 + f + 0.02), x1 = s * (w / 2 + f + 0.02 + sw);
      bin.add(M.shutter, box(Math.min(x0, x1), Math.max(x0, x1), -0.02, h + 0.04, 0, 0.06), mat);
    });
  }
  if (o.lintel) bin.add(M.cedar, box(-w / 2 - 0.28, w / 2 + 0.28, h + f, h + f + 0.22, 0, 0.16), mat);
}

// Fascia along the eaves and rake boards up the gable ends of a roof made with roof().
function addFascia(bin, M, s) {
  const { x0, x1, z0, z1, y, ridgeY, axis = 'x', hipA = 0, hipB = 0 } = s;
  const yb = y - 0.09;
  const edge = (a, b) => bin.add(M.trim, beam(a, b, 0.05, 0.2));
  if (axis === 'x') {
    const zr = (z0 + z1) / 2;
    edge([x0, yb, z1], [x1, yb, z1]); edge([x0, yb, z0], [x1, yb, z0]);
    if (hipA) edge([x0, yb, z0], [x0, yb, z1]); else { edge([x0, yb, z1], [x0, ridgeY - 0.09, zr]); edge([x0, yb, z0], [x0, ridgeY - 0.09, zr]); }
    if (hipB) edge([x1, yb, z0], [x1, yb, z1]); else { edge([x1, yb, z1], [x1, ridgeY - 0.09, zr]); edge([x1, yb, z0], [x1, ridgeY - 0.09, zr]); }
  } else {
    const xr = (x0 + x1) / 2;
    edge([x0, yb, z0], [x0, yb, z1]); edge([x1, yb, z0], [x1, yb, z1]);
    if (hipA) edge([x0, yb, z0], [x1, yb, z0]); else { edge([x0, yb, z0], [xr, ridgeY - 0.09, z0]); edge([x1, yb, z0], [xr, ridgeY - 0.09, z0]); }
    if (hipB) edge([x0, yb, z1], [x1, yb, z1]); else { edge([x0, yb, z1], [xr, ridgeY - 0.09, z1]); edge([x1, yb, z1], [xr, ridgeY - 0.09, z1]); }
  }
}

// Dormer in its own space: base of the front face at the origin, facing +Z.
function addDormer(bin, M, mat, o = {}) {
  const w = o.w || 1.35, hw = o.hWall || 1.45, rise = o.rise || 1.05, L = o.len || 3.2;
  const slope = rise / (w / 2);
  bin.add(M.lap, prismZ([[-w / 2, -0.7], [w / 2, -0.7], [w / 2, hw], [0, hw + rise], [-w / 2, hw]], -L, 0), mat);
  const spec = { x0: -w / 2 - 0.2, x1: w / 2 + 0.2, z0: -L - 0.1, z1: 0.25, y: hw - 0.2 * slope, ridgeY: hw + rise + 0.07, axis: 'z' };
  bin.add(M.shingle, roof(spec), mat);
  bin.add(M.trim, beam([spec.x0, spec.y - 0.06, 0.25], [0, spec.ridgeY - 0.06, 0.25], 0.05, 0.16), mat);
  bin.add(M.trim, beam([spec.x1, spec.y - 0.06, 0.25], [0, spec.ridgeY - 0.06, 0.25], 0.05, 0.16), mat);
  addWindow(bin, M, 0.72, 1.05, { cols: 2, rows: 2 }, mat.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.22, 0)));
}

export function buildHouse(M) {
  const house = new THREE.Group(); house.name = 'Basil Lane';
  const parts = {};
  const part = (name, explode, stage) => {
    const g = new THREE.Group(); g.name = name; g.userData = { explode, stage };
    house.add(g); parts[name] = g; return g;
  };
  const H = D.half, WI = D.wingIn;

  // ---------- porch floor and steps ----------
  {
    const b = new Bin();
    b.add(M.paver, box(-WI, WI, 0, D.floor, 0, D.porchD));
    for (let i = 1; i <= 3; i++) b.add(M.paver, box(-1.6, 1.6, 0, D.floor - 0.19 * i, D.porchD + 0.32 * (i - 1), D.porchD + 0.32 * i));
    [-1, 1].forEach((s) => b.add(M.paver, box(Math.min(s * 1.6, s * 1.98), Math.max(s * 1.6, s * 1.98), 0, 0.62, D.porchD, D.porchD + 1.0)));
    // back patio slab
    b.add(M.concrete, box(-WI, 4.6, 0, 0.3, -13.4, D.back));
    b.build(part('base', [0, 0, 0], 0));
  }

  // ---------- walls ----------
  {
    const b = new Bin();
    b.add(M.brick, box(-WI, WI, 0, 4.0, D.back, 0));
    b.add(M.brick, box(WI, H, 0, 3.72, D.back, D.wingZ));
    b.add(M.brick, box(-H, -WI, 0, 3.72, D.garageBack, D.wingZ));
    [-1, 1].forEach((s) => {
      const c = s * 7.75;
      b.add(M.brick, prismZ([[c - 2.65, 3.6], [c + 2.65, 3.6], [c + 2.65, 3.72], [c, D.wingRidge - 0.08], [c - 2.65, 3.72]], D.wingZ - 0.25, D.wingZ));
      b.add(M.brick, prismZ([[c - 2, 0], [c + 2, 0], [c + 2, 3.31], [c, 5.63], [c - 2, 3.31]], D.wingZ, D.bayZ));
      // the little brick pattern near the top of each gable
      [[0, 0], [0.16, 0], [-0.16, 0], [0, 0.16], [0, -0.16]].forEach((p) => b.add(M.black, box(c + p[0] - 0.035, c + p[0] + 0.035, 4.5 + p[1] - 0.035, 4.5 + p[1] + 0.035, D.bayZ - 0.02, D.bayZ + 0.012)));
    });
    // chimney on the back of the house
    b.add(M.brick, box(2.9, 3.9, 0, 7.3, -11.0, -10.2));
    b.add(M.trim, box(2.8, 4.0, 7.3, 7.44, -11.1, -10.1));

    // ---------- doors and windows, which travel with the walls ----------
    // front door: a shallow arch, two leaves, glass, and the two wreaths
    const dw = 1.62, dh = 2.25, rise = 0.3;
    const sh = new THREE.Shape();
    sh.moveTo(-dw / 2, 0); sh.lineTo(dw / 2, 0); sh.lineTo(dw / 2, dh); sh.quadraticCurveTo(0, dh + rise * 2, -dw / 2, dh); sh.lineTo(-dw / 2, 0);
    const doorG = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: false, curveSegments: 10 });
    b.add(M.door, doorG, m4(0, D.floor, 0.0));
    [-1, 1].forEach((s) => {
      b.add(M.glass, box(s * 0.12, s * 0.7, 0.75, 2.1, 0.07, 0.085).applyMatrix4(m4(0, D.floor, 0)));
    });
    b.add(M.black, box(-0.008, 0.008, 0, 2.4, 0.07, 0.09).applyMatrix4(m4(0, D.floor, 0)));
    // porch windows with shutters
    [-3.45, -1.78, 1.78, 3.45].forEach((x) => addWindow(b, M, 0.8, 2.15, { cols: 2, rows: 4, shutters: 0.36 }, m4(x, 1.05, 0)));
    // bay windows under a cedar header
    [-7.75, 7.75].forEach((x) => addWindow(b, M, 1.5, 1.95, { cols: 4, rows: 3, mullion: true, lintel: true }, m4(x, 1.1, D.bayZ)));
    // right side, left side, back and pool side
    [-2.5, -7].forEach((z) => addWindow(b, M, 0.9, 1.6, { cols: 2, rows: 3 }, m4(H, 1.25, z, Math.PI / 2)));
    addWindow(b, M, 0.9, 1.6, { cols: 2, rows: 3 }, m4(-H, 1.25, -3.5, -Math.PI / 2));
    [-3.4, -1.1, 1.2].forEach((x) => addWindow(b, M, 1.6, 2.25, { cols: 3, rows: 4 }, m4(x, 0.5, D.back, Math.PI)));
    [-12.6, -17.2].forEach((z) => addWindow(b, M, 0.9, 1.6, { cols: 2, rows: 3 }, m4(-WI, 1.25, z, Math.PI / 2)));
    addWindow(b, M, 0.9, 1.6, { cols: 2, rows: 3 }, m4(-7.75, 1.25, D.garageBack, Math.PI));
    // three garage doors on the left side
    [-12.3, -15.0, -17.7].forEach((z) => {
      const g = m4(-H, 0.02, z, -Math.PI / 2);
      b.add(M.trim, box(-1.25, 1.25, 0, 2.3, 0, 0.06), g);
      for (let k = 1; k < 4; k++) b.add(M.black, box(-1.25, 1.25, 0.575 * k - 0.008, 0.575 * k + 0.008, 0.06, 0.066), g);
      b.add(M.glass, box(-1.0, 1.0, 1.82, 2.12, 0.06, 0.07), g);
    });
    b.build(part('walls', [0, 0, 0], 0));

    // wreaths, urns and the door lantern are small round things, kept as their own meshes
    const walls = parts.walls;
    [-1, 1].forEach((s) => {
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 10, 28), M.ember);
      wreath.position.set(s * 0.41, D.floor + 1.62, 0.13); wreath.castShadow = true; walls.add(wreath);
      const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.55, 14), M.trim);
      urn.position.set(s * 1.22, D.floor + 0.275, 0.45); urn.castShadow = true; walls.add(urn);
      const fern = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8), M.leaf);
      fern.scale.y = 0.7; fern.position.set(s * 1.22, D.floor + 0.7, 0.45); fern.castShadow = true; walls.add(fern);
    });
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.2), M.lamp);
    lantern.position.set(0, D.floor + 2.95, 0.9); walls.add(lantern);
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.45, 0.015), M.black);
    chain.position.set(0, D.floor + 3.3, 0.9); walls.add(chain);
  }

  // ---------- the six cedar posts and the back patio posts ----------
  {
    const b = new Bin();
    [-4.83, -2.9, -0.97, 0.97, 2.9, 4.83].forEach((x) => b.add(M.cedar, box(x - 0.14, x + 0.14, D.floor, 3.74, 2.5, 2.78)));
    b.add(M.trim, box(-WI - 0.2, WI + 0.2, 3.72, 3.9, 2.42, 2.9));
    b.build(part('posts', [0, 0, 5.5], 1));
    const r = new Bin();
    [-4.9, -0.2, 4.4].forEach((x) => r.add(M.cedar, box(x - 0.12, x + 0.12, 0.3, 3.2, -13.3, -13.06)));
    r.build(part('backPosts', [0, 0, -4], 1));
  }

  // ---------- main roof: the long ridge, the two wings, the bays and the back patio ----------
  {
    const b = new Bin();
    const specs = [
      { x0: -7.75, x1: 7.75, z0: D.back - 0.45, z1: 0.5, y: 3.55, ridgeY: D.barRidge, axis: 'x' },
      { x0: 4.75, x1: 10.75, z0: D.back - 0.45, z1: D.wingZ + 0.35, y: D.wingEave, ridgeY: D.wingRidge, axis: 'z', hipA: 3.0 },
      { x0: -10.75, x1: -4.75, z0: D.garageBack - 0.45, z1: D.wingZ + 0.35, y: D.wingEave, ridgeY: D.wingRidge, axis: 'z', hipA: 3.0 },
      { x0: 5.45, x1: 10.05, z0: 2.2, z1: D.bayZ + 0.3, y: 2.95, ridgeY: 5.71, axis: 'z' },
      { x0: -10.05, x1: -5.45, z0: 2.2, z1: D.bayZ + 0.3, y: 2.95, ridgeY: 5.71, axis: 'z' },
    ];
    specs.forEach((s, i) => { b.add(M.shingle, roof(s)); if (i > 0) addFascia(b, M, s); });
    b.add(M.shingle, roof({ x0: -WI - 0.2, x1: 4.8, z0: -13.7, z1: D.back + 0.1, y: 3.2, ridgeY: 3.95, axis: 'x', ridgeAt: 1 }));
    b.add(M.trim, beam([-WI - 0.2, 3.1, -13.7], [4.8, 3.1, -13.7], 0.05, 0.2));
    b.build(part('roofMain', [0, 3.6, 0], 2));
  }

  // ---------- the tall hipped roof over the porch, with its copper hip caps ----------
  {
    const b = new Bin();
    const s = { x0: -5.45, x1: 5.45, z0: -5.05, z1: 3.15, y: D.pavEave, ridgeY: D.pavRidge, axis: 'x', hipA: 4.15, hipB: 4.15 };
    b.add(M.shingle, roof(s));
    b.add(M.trim, box(-5.45, 5.45, 3.86, 4.05, -0.2, 3.15));   // fascia and the porch ceiling in one slab
    const zr = (s.z0 + s.z1) / 2, lift = 0.03;
    const R = [[-1.3, D.pavRidge + lift, zr], [1.3, D.pavRidge + lift, zr]];
    b.add(M.copper, beam(R[0], R[1], 0.16, 0.07));
    [[-5.45, s.y + lift, 3.15, 0], [-5.45, s.y + lift, -5.05, 0], [5.45, s.y + lift, 3.15, 1], [5.45, s.y + lift, -5.05, 1]]
      .forEach((c) => b.add(M.copper, beam([c[0], c[1], c[2]], R[c[3]], 0.16, 0.07)));
    b.build(part('roofPorch', [0, 7.2, 0], 3));
  }

  // ---------- dormers ----------
  {
    const b = new Bin();
    [-1.5, 1.5].forEach((x) => addDormer(b, M, m4(x, 4.75, 2.45), { len: 2.8 }));
    addDormer(b, M, m4(-9.95, 4.25, -13.4, -Math.PI / 2), { len: 2.1 });
    addDormer(b, M, m4(-9.95, 4.25, -17.2, -Math.PI / 2), { len: 2.1 });
    addDormer(b, M, m4(-5.55, 4.25, -15.3, Math.PI / 2), { len: 2.1 });
    b.build(part('dormers', [0, 10.4, 0], 4));
  }

  // ---------- light after dark: porch cans, wall washes, window glow ----------
  const glowTex = glowTexture();
  const night = new THREE.Group(); night.name = 'night'; house.add(night);
  const sprites = [];
  const glow = (x, y, z, size, color = 0xffc98a, strength = 1) => {
    const mat = new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
    const sp = new THREE.Sprite(mat); sp.position.set(x, y, z); sp.scale.setScalar(size); sp.layers.set(1);
    sp.userData.strength = strength; night.add(sp); sprites.push(sp); return sp;
  };
  [-3.86, -1.93, 0, 1.93, 3.86].forEach((x) => glow(x, 3.78, 2.2, 1.5, 0xffd9a6, 0.9));
  glow(0, D.floor + 2.95, 0.9, 1.3, 0xffb86b, 1);
  [-3.45, -1.78, 1.78, 3.45].forEach((x) => glow(x, 2.1, 0.2, 2.6, 0xffb260, 0.28));
  [-7.75, 7.75].forEach((x) => glow(x, 2.1, D.bayZ + 0.1, 3.2, 0xffb260, 0.22));
  [-12.3, -15.0, -17.7].forEach((z) => glow(-H - 0.25, 2.75, z + 1.35, 1.1, 0xffb86b, 0.8));

  // warm washes up the brick, as the landscape lights do in the twilight photo
  const washTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    x.translate(64, 256); x.scale(0.24, 1);
    const g = x.createRadialGradient(0, 0, 4, 0, 0, 250);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.5)'); g.addColorStop(0.7, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(-200, -256, 400, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const washes = [];
  const wash = (x, y, z, w, h, ry = 0) => {
    const mat = new THREE.MeshBasicMaterial({ map: washTex, color: new THREE.Color(1.5, 0.82, 0.34), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    p.position.set(x, y + h / 2, z); p.rotation.y = ry; p.layers.set(1); night.add(p); washes.push(p);
  };
  [-1, 1].forEach((s) => {
    wash(s * 7.75 - 1.38, 0.05, D.bayZ + 0.03, 1.2, 3.2);
    wash(s * 7.75 + 1.38, 0.05, D.bayZ + 0.03, 1.2, 3.2);
  });
  wash(H + 0.03, 0.05, -4.7, 2.0, 3.4, Math.PI / 2);

  const porchLights = [-2.7, 2.7].map((x) => {
    const l = new THREE.PointLight(0xffc98a, 0, 11, 2); l.position.set(x, 3.6, 1.6); night.add(l); return l;
  });

  function setNight(d) {
    M.glass.emissiveIntensity = d * 2.4;
    M.lamp.emissiveIntensity = d * 4;
    sprites.forEach((s) => { s.material.opacity = d * s.userData.strength; });
    washes.forEach((w) => { w.material.opacity = d * 0.75; });
    porchLights.forEach((l) => { l.intensity = d * 26; l.visible = d > 0.01; });
    night.visible = d > 0.01;
  }
  setNight(0);

  // Takes the house apart in the order it went together: roofs up first, posts out last.
  const rest = {};
  Object.keys(parts).forEach((k) => { rest[k] = parts[k].position.clone(); });
  function setExplode(t) {
    const names = Object.keys(parts), top = 4;
    names.forEach((k) => {
      const p = parts[k], e = p.userData.explode, st = top - p.userData.stage;
      let u = Math.min(1, Math.max(0, t * (1 + top * 0.25) - st * 0.25));
      u = u * u * (3 - 2 * u);
      p.position.set(rest[k].x + e[0] * u, rest[k].y + e[1] * u, rest[k].z + e[2] * u);
    });
    night.position.y = 0;
  }

  // Points that labels and photo pins hang on. Each one rides with its part when the house comes apart.
  const anchors = {
    roof: { part: 'roofPorch', at: [3.0, 6.5, 0.8] },
    copper: { part: 'roofPorch', at: [-3.58, 5.98, 1.3] },
    dormers: { part: 'dormers', at: [-1.5, 7.0, 2.45] },
    posts: { part: 'posts', at: [2.9, 2.4, 2.8] },
    brick: { part: 'walls', at: [8.9, 2.2, D.bayZ] },
    porch: { part: 'base', at: [-3.2, D.floor, 2.9] },
    wings: { part: 'roofMain', at: [-7.75, 6.3, 1.6] },
    door: { part: 'walls', at: [0, 2.6, 0.2] },
  };

  house.traverse((o) => { if (o.isMesh && o.layers.mask === 1) { o.receiveShadow = true; } });
  return { house, parts, anchors, setNight, setExplode };
}
