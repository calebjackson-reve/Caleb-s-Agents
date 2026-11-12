// The Basil Lane house, built in code from the listing photos and the front elevation drawing.
// Sizes are in metres. They started from the elevation, with the front door (about 2.4 m) as the ruler, and were then
// fitted to the twilight photo: 50 points on the photo against the same points on the model (see README).
// It is an illustration of the outside of the house. It is not a floor plan and it is not to scale.
import * as THREE from 'three';
import { Bin, box, roof, prismZ, prismX } from './kit.js';
import { glowTexture } from './materials.js';

export const D = {
  half: 11.85,       // half the width of the front
  wingIn: 6.4,       // where the wings start, measured from the centre
  wingC: 9.1,        // centre line of each wing
  porchD: 2.95,      // porch depth: the porch stands forward of everything else
  wingZ: 0.25,       // front wall of the wings, which sit back almost level with the porch's back wall
  bayZ: 0.85,        // front of the small gabled bays
  back: -10,         // back wall of the main house
  garageBack: -20,   // back wall of the garage wing
  floor: 0.76,       // porch floor above the lawn
  porchHalf: 5.6,    // half the width of the porch floor
  pavHalf: 5.4, pavEave: 3.85, pavRidge: 9.3,
  pavBack: -10.45,   // back eave of the tall porch roof, which puts its short ridge well behind the dormers
  pavRidgeHalf: 1.5,
  wingEave: 3.16, wingRidge: 7.0, roofHalf: 2.95,
  bayHalf: 1.82, bayRoofHalf: 2.14, bayEave: 3.17, bayRidge: 5.8,
  barRidge: 7.5,
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
  const ov = o.over === undefined ? 0.2 : o.over;
  const spec = { x0: -w / 2 - ov, x1: w / 2 + ov, z0: -L - 0.1, z1: 0.25, y: hw - 0.2 * slope, ridgeY: hw + rise + 0.07, axis: 'z' };
  bin.add(M.shingle, roof(spec), mat);
  bin.add(M.trim, beam([spec.x0, spec.y - 0.06, 0.25], [0, spec.ridgeY - 0.06, 0.25], 0.05, 0.16), mat);
  bin.add(M.trim, beam([spec.x1, spec.y - 0.06, 0.25], [0, spec.ridgeY - 0.06, 0.25], 0.05, 0.16), mat);
  addWindow(bin, M, o.glass || 0.72, 1.05, { cols: 2, rows: 2 }, mat.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.22, 0)));
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
    b.add(M.paver, box(-D.porchHalf, D.porchHalf, 0, D.floor, 0, D.porchD));
    for (let i = 1; i <= 3; i++) b.add(M.paver, box(-1.6, 1.6, 0, D.floor - 0.19 * i, D.porchD + 0.32 * (i - 1), D.porchD + 0.32 * i));
    [-1, 1].forEach((s) => b.add(M.paver, box(Math.min(s * 1.6, s * 1.98), Math.max(s * 1.6, s * 1.98), 0, 0.62, D.porchD, D.porchD + 1.0)));
    // back patio slab
    b.add(M.concrete, box(-WI, 4.6, 0, 0.3, -13.4, D.back));
    b.build(part('base', [0, 0, 0], null));
  }

  // ---------- walls ----------
  {
    const b = new Bin();
    b.add(M.brick, box(-WI, WI, 0, 3.8, D.back, 0));
    b.add(M.brick, box(WI, H, 0, 3.4, D.back, D.wingZ));
    b.add(M.brick, box(-H, -WI, 0, 3.4, D.garageBack, D.wingZ));
    [-1, 1].forEach((s) => {
      const c = s * D.wingC;
      const g = D.roofHalf - 0.38;
      b.add(M.brick, prismZ([[c - g, 3.3], [c + g, 3.3], [c + g, 3.4], [c, D.wingRidge - 0.08], [c - g, 3.4]], D.wingZ - 0.25, D.wingZ));
    });
    // gutters along the low eaves either side of the porch, and the downspouts the photos show beside it
    [-1, 1].forEach((s) => {
      const x0 = s * (D.pavHalf + 0.05), x1 = s * (D.wingC - D.roofHalf);
      b.add(M.black, box(Math.min(x0, x1), Math.max(x0, x1), 3.42, 3.52, 0.46, 0.58));
      b.add(M.black, box(s * (D.pavHalf + 0.22) - 0.04, s * (D.pavHalf + 0.22) + 0.04, 0.1, 3.46, 0.06, 0.14));
      b.add(M.black, box(s * (D.half - 0.12) - 0.04, s * (D.half - 0.12) + 0.04, 0.1, 3.1, D.wingZ + 0.02, D.wingZ + 0.1));
    });
    // chimney on the back of the house
    b.add(M.brick, box(2.9, 3.9, 0, 6.3, -11.0, -10.2));
    b.add(M.trim, box(2.8, 4.0, 6.3, 6.44, -11.1, -10.1));

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
    [-4.0, -2.05, 2.05, 4.0].forEach((x) => addWindow(b, M, 0.8, 2.15, { cols: 2, rows: 4, shutters: 0.36 }, m4(x, 1.05, 0)));
    // right side, left side, back and pool side
    [-2.5, -7].forEach((z) => addWindow(b, M, 0.9, 1.6, { cols: 2, rows: 3 }, m4(H, 1.25, z, Math.PI / 2)));
    addWindow(b, M, 0.9, 1.6, { cols: 2, rows: 3 }, m4(-H, 1.25, -3.5, -Math.PI / 2));
    [-3.4, -1.1, 1.2].forEach((x) => addWindow(b, M, 1.6, 2.25, { cols: 3, rows: 4 }, m4(x, 0.5, D.back, Math.PI)));
    [-12.6, -17.2].forEach((z) => addWindow(b, M, 0.9, 1.6, { cols: 2, rows: 3 }, m4(-WI, 1.25, z, Math.PI / 2)));
    addWindow(b, M, 0.9, 1.6, { cols: 2, rows: 3 }, m4(-D.wingC, 1.25, D.garageBack, Math.PI));
    // three garage doors on the left side
    [-12.3, -15.0, -17.7].forEach((z) => {
      const g = m4(-H, 0.02, z, -Math.PI / 2);
      b.add(M.trim, box(-1.25, 1.25, 0, 2.3, 0, 0.06), g);
      b.add(M.glass, box(-1.0, 1.0, 1.82, 2.12, 0.06, 0.07), g);
    });
    b.build(part('walls', [0, 0, 0], null));

    // wreaths, urns and the door lantern are small round things, kept as their own meshes
    const walls = parts.walls;
    [-1, 1].forEach((s) => {
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.058, 10, 28), M.wreath);
      wreath.position.set(s * 0.41, D.floor + 1.62, 0.13); wreath.castShadow = true; wreath.layers.set(1); walls.add(wreath);
      const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.55, 14), M.trim);
      urn.position.set(s * 1.22, D.floor + 0.275, 0.45); urn.castShadow = true; walls.add(urn);
      const fern = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8), M.shrub);
      fern.scale.y = 0.7; fern.position.set(s * 1.22, D.floor + 0.7, 0.45); fern.castShadow = true; walls.add(fern);
    });
    // the two oval windows, on the short stretch of wall between the porch and each wing
    [-1, 1].forEach((s) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 32), M.trim);
      ring.scale.set(0.72, 1.12, 1); ring.position.set(s * 5.74, D.floor + 1.74, 0.05); walls.add(ring);
      const pane = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), M.glass);
      pane.scale.set(0.72, 1.12, 1); pane.position.set(s * 5.74, D.floor + 1.74, 0.02); walls.add(pane);
    });
    // recessed can lights in the porch ceiling, one over each bay
    [-3.86, -1.93, 0, 1.93, 3.86].forEach((x) => {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 14), M.lamp);
      can.position.set(x, D.pavEave - 0.2, 2.2); walls.add(can);
    });
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.2), M.lamp);
    lantern.position.set(0, D.floor + 2.95, 0.9); walls.add(lantern);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 4), M.black); cap.rotation.y = Math.PI / 4;
    cap.position.set(0, D.floor + 3.21, 0.9); walls.add(cap);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.26), M.black); foot.position.set(0, D.floor + 2.76, 0.9); walls.add(foot);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((c) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.38, 0.022), M.black); bar.position.set(c[0] * 0.105, D.floor + 2.95, 0.9 + c[1] * 0.105); walls.add(bar);
    });
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.45, 0.015), M.black);
    chain.position.set(0, D.floor + 3.3, 0.9); walls.add(chain);
  }

  // ---------- the six cedar posts and the back patio posts ----------
  {
    const b = new Bin();
    [-4.83, -2.9, -0.97, 0.97, 2.9, 4.83].forEach((x) => b.add(M.cedar, box(x - 0.14, x + 0.14, D.floor, 3.74, 2.5, 2.78)));
    b.add(M.trim, box(-D.pavHalf, D.pavHalf, 3.72, 3.9, 2.42, 2.9));
    b.build(part('posts', [0, 0, 5.5], [0.6, 1]));
    const r = new Bin();
    [-4.9, -0.2, 4.4].forEach((x) => r.add(M.cedar, box(x - 0.12, x + 0.12, 0.3, 3.2, -13.3, -13.06)));
    r.build(part('backPosts', [0, 0, -4], [0.6, 1]));
    // the two gabled bays on the front of the wings, with their paired windows under a cedar header
    const gb = new Bin();
    [-1, 1].forEach((s) => {
      const c = s * D.wingC;
      const bh = D.bayHalf;
      gb.add(M.brick, prismZ([[c - bh, 0], [c + bh, 0], [c + bh, D.bayEave + 0.3], [c, D.bayRidge - 0.08], [c - bh, D.bayEave + 0.3]], D.wingZ, D.bayZ));
      [[0, 0], [0.16, 0], [-0.16, 0], [0, 0.16], [0, -0.16]].forEach((q) => gb.add(M.black, box(c + q[0] - 0.035, c + q[0] + 0.035, 4.5 + q[1] - 0.035, 4.5 + q[1] + 0.035, D.bayZ - 0.02, D.bayZ + 0.012)));
      addWindow(gb, M, 1.44, 1.88, { cols: 2, rows: 2, mullion: true, lintel: true }, m4(c, 1.1, D.bayZ));
    });
    gb.build(part('gables', [0, 0, 4.4], [0.6, 1]));
  }

  // ---------- main roof: the long ridge, the two wings, the bays and the back patio ----------
  {
    const b = new Bin(), RH = D.roofHalf, BH = D.bayRoofHalf;
    const specs = [
      { x0: -D.wingC, x1: D.wingC, z0: D.back - 0.45, z1: 0.5, y: 3.55, ridgeY: D.barRidge, axis: 'x' },
      { x0: D.wingC - RH, x1: D.wingC + RH, z0: D.back - 0.45, z1: D.wingZ + 0.35, y: D.wingEave, ridgeY: D.wingRidge, axis: 'z', hipA: RH },
      { x0: -D.wingC - RH, x1: -D.wingC + RH, z0: D.garageBack - 0.45, z1: D.wingZ + 0.35, y: D.wingEave, ridgeY: D.wingRidge, axis: 'z', hipA: RH },
      { x0: D.wingC - BH, x1: D.wingC + BH, z0: D.wingZ - 0.5, z1: D.bayZ + 0.3, y: D.bayEave, ridgeY: D.bayRidge, axis: 'z' },
      { x0: -D.wingC - BH, x1: -D.wingC + BH, z0: D.wingZ - 0.5, z1: D.bayZ + 0.3, y: D.bayEave, ridgeY: D.bayRidge, axis: 'z' },
    ];
    specs.forEach((s, i) => { b.add(M.shingle, roof(s)); if (i > 0) addFascia(b, M, s); });
    b.add(M.shingle, roof({ x0: -WI - 0.2, x1: 4.8, z0: -13.7, z1: D.back + 0.1, y: 3.2, ridgeY: 3.95, axis: 'x', ridgeAt: 1 }));
    b.add(M.trim, beam([-WI - 0.2, 3.1, -13.7], [4.8, 3.1, -13.7], 0.05, 0.2));
    b.build(part('roofMain', [0, 3.6, 0], [0.38, 0.8]));
  }

  // ---------- the tall hipped roof over the porch, with its copper hip caps ----------
  {
    const b = new Bin();
    const PH = D.pavHalf;
    const RHalf = D.pavRidgeHalf;
    const s = { x0: -PH, x1: PH, z0: D.pavBack, z1: 3.15, y: D.pavEave, ridgeY: D.pavRidge, axis: 'x', hipA: PH - RHalf, hipB: PH - RHalf };
    b.add(M.shingle, roof(s));
    b.add(M.trim, box(-PH, PH, D.pavEave - 0.19, D.pavEave, -0.2, 3.15));   // fascia and the porch ceiling in one slab
    const zr = (s.z0 + s.z1) / 2, lift = 0.075;
    const R = [[-RHalf, D.pavRidge + lift, zr], [RHalf, D.pavRidge + lift, zr]];
    b.add(M.copper, beam(R[0], R[1], 0.16, 0.07));
    [[-PH, s.y + lift, 3.15, 0], [-PH, s.y + lift, D.pavBack, 0], [PH, s.y + lift, 3.15, 1], [PH, s.y + lift, D.pavBack, 1]]
      .forEach((c) => b.add(M.copper, beam([c[0], c[1], c[2]], R[c[3]], 0.16, 0.07)));
    b.build(part('roofPorch', [0, 7.2, 0], [0.18, 0.6]));
  }

  // ---------- dormers ----------
  {
    // each dormer set rides just above the roof it sits on when the house comes apart
    const b = new Bin();
    [-1.5, 1.5].forEach((x) => addDormer(b, M, m4(x, 4.75, 2.64), { w: 1.08, over: 0.09, len: 3.7, hWall: 1.3, rise: 0.8, glass: 0.56 }));
    b.build(part('dormersFront', [0, 9.9, 0], [0, 0.4]));
    const gd = new Bin();
    addDormer(gd, M, m4(-D.wingC - 1.95, 4.25, -13.4, -Math.PI / 2), { len: 1.9 });
    addDormer(gd, M, m4(-D.wingC - 1.95, 4.25, -17.2, -Math.PI / 2), { len: 1.9 });
    addDormer(gd, M, m4(-D.wingC + 1.95, 4.25, -15.3, Math.PI / 2), { len: 1.9 });
    gd.build(part('dormersGarage', [0, 6.0, 0], [0, 0.4]));
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
  [-4.0, -2.05, 2.05, 4.0].forEach((x) => glow(x, 2.1, 0.2, 2.6, 0xffb260, 0.28));
  [-D.wingC, D.wingC].forEach((x) => glow(x, 2.1, D.bayZ + 0.1, 3.2, 0xffb260, 0.22));
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
    wash(s * D.wingC - 1.3, 0.05, D.bayZ + 0.03, 1.1, 3.2);
    wash(s * D.wingC + 1.3, 0.05, D.bayZ + 0.03, 1.1, 3.2);
  });
  wash(H + 0.03, 0.05, -4.7, 2.0, 3.4, Math.PI / 2);

  // porch lights: cones pointing down from the porch ceiling, so nothing above the ceiling is lit
  const porchLights = [-2.9, 2.9].map((x) => {
    const l = new THREE.SpotLight(0xffc98a, 0, 10, 1.15, 0.85, 2); l.position.set(x, 3.84, 1.5); l.target.position.set(x, 0, 2.2);
    night.add(l, l.target); return l;
  });

  let guide = null;   // the material of the take-apart guides, made further down
  const copperDay = M.copper.color.clone(), copperNight = M.copper.color.clone().multiplyScalar(0.45);
  function setNight(d) {
    M.glass.emissiveIntensity = d * 2.4;
    M.lamp.emissiveIntensity = d * 4;
    sprites.forEach((s) => { s.material.opacity = d * s.userData.strength; });
    washes.forEach((w) => { w.material.opacity = d * 0.75; });
    porchLights.forEach((l) => { l.intensity = d * 85; l.visible = d > 0.01; });
    // cedar under the soffit lights glows amber, as it does in the twilight photo. Copper stops catching the sky.
    M.cedar.emissive.setHex(0x9a5a22); M.cedar.emissiveIntensity = d * 0.34;
    M.copper.color.lerpColors(copperDay, copperNight, d);
    if (guide) guide.emissiveIntensity = d * 0.55;
    night.visible = d > 0.01;
  }
  setNight(0);

  // Dotted leaders from where a part sits to where it has been lifted, as an exploded drawing shows them.
  guide = M.black.clone(); guide.emissive = new THREE.Color(0xfbf8f3); guide.emissiveIntensity = 0;
  const leaders = [];
  const leader = (name, pts) => {
    const e = new THREE.Vector3(...parts[name].userData.explode), len = e.length(), dir = e.clone().normalize();
    const lb = new Bin();
    for (let y = 0.15; y < len - 0.2; y += 0.62) lb.add(guide, box(-0.028, 0.028, y, y + 0.3, -0.028, 0.028));
    pts.forEach((pt) => {
      const grp = new THREE.Group(); lb.build(grp, { cast: false });
      grp.position.set(pt[0], pt[1], pt[2]); grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      grp.visible = false; house.add(grp); leaders.push({ name, grp });
    });
  };
  const PH = D.pavHalf, WC = D.wingC;
  leader('roofPorch', [[-PH, D.pavEave, 3.15], [PH, D.pavEave, 3.15], [-PH, D.pavEave, D.pavBack], [PH, D.pavEave, D.pavBack]]);
  const RH = D.roofHalf;
  leader('roofMain', [[-WC - RH, 3.3, D.wingZ + 0.35], [WC + RH, 3.3, D.wingZ + 0.35], [WC + RH, 3.3, -10.45], [-WC - RH, 3.3, -20.45], [-WC + RH, 3.3, -20.45]]);
  leader('dormersFront', [[-1.5, 6.0, 2.66], [1.5, 6.0, 2.66]]);
  leader('posts', [[-4.83, 0.8, 2.8], [4.83, 0.8, 2.8]]);
  leader('gables', [[-WC, 0.1, D.bayZ], [WC, 0.1, D.bayZ]]);
  leader('dormersGarage', [[-WC - 1.95, 4.6, -13.4], [-WC - 1.95, 4.6, -17.2], [-WC + 1.95, 4.6, -15.3]]);

  // Takes the house apart in the order a drawing would: dormers first, then the porch roof, the main roof, and last
  // the posts and the gabled bays. Each part moves in its own slice of the slider.
  const rest = {}, amount = {};
  Object.keys(parts).forEach((k) => { rest[k] = parts[k].position.clone(); });
  function setExplode(t) {
    Object.keys(parts).forEach((k) => {
      const p = parts[k], e = p.userData.explode, w = p.userData.stage;
      let u = w ? Math.min(1, Math.max(0, (t - w[0]) / (w[1] - w[0]))) : 0;
      u = u * u * (3 - 2 * u); amount[k] = u;
      p.position.set(rest[k].x + e[0] * u, rest[k].y + e[1] * u, rest[k].z + e[2] * u);
    });
    leaders.forEach((l) => { const u = amount[l.name]; l.grp.visible = u > 0.03; l.grp.scale.y = Math.max(u, 0.001); });
  }

  // Points that labels and photo pins hang on. Each one rides with its part when the house comes apart.
  const anchors = {
    roof: { part: 'roofPorch', at: [0, 4.75, 2.0] },
    copper: { part: 'roofPorch', at: [4.62, 4.94, 1.79] },
    dormers: { part: 'dormersFront', at: [-1.5, 6.85, 2.66] },
    posts: { part: 'posts', at: [4.83, 2.4, 2.8] },
    brick: { part: 'gables', at: [D.wingC + 1.4, 2.6, D.bayZ] },
    porch: { part: 'base', at: [3.6, D.floor, 2.95] },
    wings: { part: 'roofMain', at: [D.wingC, D.wingRidge, -1.2] },
    door: { part: 'walls', at: [0, 2.6, 0.2] },
  };

  house.traverse((o) => { if (o.isMesh && o.layers.mask === 1) { o.receiveShadow = true; } });
  return { house, parts, anchors, setNight, setExplode };
}
