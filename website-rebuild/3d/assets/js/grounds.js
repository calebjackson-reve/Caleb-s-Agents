// The site model: an ivory base with the land laid out from the aerial footage. The walk and drive, the beds,
// the pool terrace behind, the barn, the pond with its gazebo and a few oaks. Everything is quiet in tone so the house leads.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Bin, box, roof, prismX, rng } from './kit.js';
import { D } from './house.js';

export const BASE = { x0: -64, x1: 64, z0: -112, z1: 38, depth: 2.4 };

function instanced(geom, mat, items, cast = true) {
  const mesh = new THREE.InstancedMesh(geom, mat, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);
  items.forEach((it, i) => {
    p.set(it.x, it.y, it.z); s.set(it.sx, it.sy, it.sz); q.setFromAxisAngle(up, it.ry || 0);
    m.compose(p, q, s); mesh.setMatrixAt(i, m);
    if (it.tint !== undefined) { c.setScalar(it.tint); mesh.setColorAt(i, c); }
  });
  mesh.castShadow = cast; mesh.receiveShadow = true;
  return mesh;
}

export function buildGrounds(M) {
  const g = new THREE.Group(); g.name = 'grounds';
  const r = rng(21);
  const H = D.half;

  // the base the whole model stands on
  const top = new THREE.Mesh(new THREE.PlaneGeometry(BASE.x1 - BASE.x0, BASE.z1 - BASE.z0), M.base);
  top.rotation.x = -Math.PI / 2; top.position.set((BASE.x0 + BASE.x1) / 2, 0, (BASE.z0 + BASE.z1) / 2); top.receiveShadow = true; g.add(top);
  const sides = new THREE.Mesh(new THREE.BoxGeometry(BASE.x1 - BASE.x0, BASE.depth, BASE.z1 - BASE.z0), M.baseEdge);
  sides.position.set((BASE.x0 + BASE.x1) / 2, -BASE.depth / 2 - 0.004, (BASE.z0 + BASE.z1) / 2); sides.receiveShadow = true; g.add(sides);

  const b = new Bin();
  // beds along the front and the right side
  b.add(M.mulch, box(-H - 1.3, -1.98, 0, 0.05, D.wingZ - 0.2, 5.0));
  b.add(M.mulch, box(1.98, H + 1.3, 0, 0.05, D.wingZ - 0.2, 5.0));
  b.add(M.mulch, box(H, H + 1.3, 0, 0.05, D.back, D.wingZ));
  // front walk, the path across to the drive, the drive and the lane out
  b.add(M.concrete, box(-1.3, 1.3, 0, 0.04, D.porchD + 0.96, 8.2));
  b.add(M.concrete, box(-25, -1.3, 0, 0.04, 6.9, 8.2));
  b.add(M.concrete, box(-25, -H, 0, 0.05, D.garageBack - 1.5, -8.5));
  b.add(M.concrete, box(-25, -18.5, 0, 0.045, -8.5, BASE.z1));
  // pool terrace, coping and loungers
  b.add(M.concrete, box(-5.1, 7.2, 0, 0.14, -27.4, -13.4));
  b.add(M.trim, box(-2.55, 3.15, 0.14, 0.2, -25.85, -15.15));
  for (let i = 0; i < 4; i++) {
    const z = -17 - i * 1.9;
    b.add(M.cedar, box(-4.55, -3.45, 0.14, 0.34, z - 0.36, z + 0.36));
    b.add(M.cushion, box(-4.5, -3.5, 0.34, 0.46, z - 0.33, z + 0.33));
  }
  [[5.9, -15], [5.9, -26]].forEach((p) => b.add(M.trim, box(p[0] - 0.35, p[0] + 0.35, 0.14, 0.75, p[1] - 0.35, p[1] + 0.35)));
  b.build(g);

  // pool water, a little lower than the coping
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 10.3), M.water);
  water.rotation.x = -Math.PI / 2; water.position.set(0.3, 0.215, -20.5); water.receiveShadow = true; g.add(water);

  // fence round the pool yard: two rails and fine pickets
  const rail = new Bin(), pickets = [];
  const yard = [[-5.1, -27.6], [13.2, -27.6], [13.2, -13.2], [7.4, -13.2]];
  for (let i = 0; i < yard.length - 1; i++) {
    const [x0, z0] = yard[i], [x1, z1] = yard[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 0.16);
    [0.3, 1.25].forEach((y) => rail.add(M.black, box(Math.min(x0, x1) - 0.02, Math.max(x0, x1) + 0.02, y, y + 0.035, Math.min(z0, z1) - 0.02, Math.max(z0, z1) + 0.02)));
    for (let k = 0; k <= n; k++) pickets.push({ x: x0 + ((x1 - x0) * k) / n, y: 0.7, z: z0 + ((z1 - z0) * k) / n, sx: 1, sy: 1, sz: 1 });
  }
  rail.build(g, { cast: false });
  g.add(instanced(new THREE.BoxGeometry(0.018, 1.3, 0.018), M.black, pickets, false));

  // shrubs: a clipped row along the beds, taller ones at the corners
  const balls = [], cones = [];
  for (let x = 2.5; x <= H + 0.7; x += 0.78) {
    [-1, 1].forEach((s) => {
      const k = 0.26 + r() * 0.1;
      balls.push({ x: s * x + (r() - 0.5) * 0.1, y: 0.05 + k * 0.8, z: 4.55 + (r() - 0.5) * 0.12, sx: k, sy: k * 0.85, sz: k, tint: 0.9 + r() * 0.18 });
    });
  }
  for (let z = -9; z <= 2; z += 0.9) balls.push({ x: H + 0.75, y: 0.3, z, sx: 0.3, sy: 0.27, sz: 0.3, tint: 0.9 + r() * 0.18 });
  [[-H - 0.55, 3.6], [H + 0.55, 3.6], [-5.6, 3.7], [5.6, 3.7], [-2.6, 3.9], [2.6, 3.9]].forEach((p, i) => {
    const hh = i < 2 ? 1.9 : 1.15;
    cones.push({ x: p[0], y: 0.05 + hh / 2, z: p[1], sx: hh * 0.3, sy: hh, sz: hh * 0.3, tint: 0.88 + r() * 0.16 });
  });
  for (let x = -4; x <= 12.5; x += 1.25) cones.push({ x, y: 0.75, z: -28.4, sx: 0.4, sy: 1.5, sz: 0.4, tint: 0.88 + r() * 0.16 });
  g.add(instanced(new THREE.SphereGeometry(1, 20, 14), M.shrub, balls));
  g.add(instanced(new THREE.ConeGeometry(1, 1, 20), M.shrub, cones));

  // the round bed between the house and the barn
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.06, 48), M.mulch); bed.position.set(-22, 0.03, -30); bed.receiveShadow = true; g.add(bed);
  const bedIn = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.08, 36), M.gravel); bedIn.position.set(-22, 0.05, -30); bedIn.receiveShadow = true; g.add(bedIn);

  // ---------- the barn ----------
  {
    const barn = new THREE.Group(); barn.position.set(-38, 0, -46); barn.rotation.y = 0.5; g.add(barn);
    const bb = new Bin();
    bb.add(M.gravel, box(-11, 11, 0, 0.03, -9, 10));
    bb.add(M.batten, box(-6.5, 6.5, 0, 3.3, -4.6, 4.6));
    bb.add(M.batten, box(-6.5, 6.5, 3.3, 5.7, -2.3, 2.3));
    bb.add(M.seam, roof({ x0: -6.9, x1: 6.9, z0: -5.0, z1: 5.0, y: 3.3, ridgeY: 4.5, axis: 'x' }));
    bb.add(M.seam, roof({ x0: -6.9, x1: 6.9, z0: -2.7, z1: 2.7, y: 5.7, ridgeY: 6.9, axis: 'x' }));
    [-1, 1].forEach((e) => {
      bb.add(M.batten, prismX([[-4.6, 3.3], [4.6, 3.3], [0, 4.4]], Math.min(e * 6.4, e * 6.5), Math.max(e * 6.4, e * 6.5)));
      bb.add(M.batten, prismX([[-2.3, 5.7], [2.3, 5.7], [0, 6.8]], Math.min(e * 6.4, e * 6.5), Math.max(e * 6.4, e * 6.5)));
    });
    bb.add(M.batten, box(-0.55, 0.55, 6.6, 7.7, -0.55, 0.55));
    bb.add(M.seam, roof({ x0: -0.8, x1: 0.8, z0: -0.8, z1: 0.8, y: 7.7, ridgeY: 8.3, axis: 'x', hipA: 0.79, hipB: 0.79 }));
    bb.add(M.trim, box(-4.6, -1.8, 0, 2.5, 4.6, 4.66));
    bb.add(M.trim, box(1.6, 2.6, 0, 2.1, 4.6, 4.66));
    for (let x = -5; x <= 5; x += 2.5) bb.add(M.glass, box(x - 0.4, x + 0.4, 4.2, 5.0, 2.3, 2.34));
    bb.build(barn);
    const lane = new Bin(); lane.add(M.gravel, box(-25, -18.5, 0, 0.035, -42, -21.5)); lane.build(g, { cast: false });
  }

  // ---------- pond and gazebo ----------
  {
    const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 64), M.pond);
    pond.rotation.x = -Math.PI / 2; pond.scale.set(30, 17, 1); pond.position.set(6, 0.03, -88); pond.receiveShadow = true; g.add(pond);
    const gz = new THREE.Group(); gz.position.set(-2, 0, -68.5); g.add(gz);
    const gb = new Bin();
    gb.add(M.cedar, box(-2.6, 2.6, 0, 0.35, -2.6, 2.6));
    [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]].forEach((p) => gb.add(M.cedar, box(p[0] - 0.13, p[0] + 0.13, 0.35, 3.0, p[1] - 0.13, p[1] + 0.13)));
    gb.add(M.shingle, roof({ x0: -3.1, x1: 3.1, z0: -3.1, z1: 3.1, y: 3.0, ridgeY: 4.9, axis: 'x', hipA: 3.0, hipB: 3.0 }));
    gb.build(gz);
  }

  // ---------- trees, as an architect's model shows them: soft pale crowns on slim stems ----------
  const lumpy = (detail) => {
    const src = new THREE.IcosahedronGeometry(1, detail); src.deleteAttribute('uv'); src.deleteAttribute('normal');
    const geo = mergeVertices(src, 1e-4);
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const k = 1 + 0.08 * Math.sin(v.x * 4.1 + 1.3) * Math.sin(v.y * 3.3 + 0.4) + 0.05 * Math.sin(v.z * 5.7 + v.x * 3.1);
      v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const trunks = [], crowns = [];
  const tree = (x, z, h, w) => {
    trunks.push({ x, y: h * 0.3, z, sx: Math.max(0.07, w * 0.022), sy: h * 0.6, sz: Math.max(0.07, w * 0.022) });
    const n = 5 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, up = r();
      const d = 0.27 * Math.sqrt(r()) * (1 - up * 0.5) * w;
      const s = w * (0.27 + r() * 0.1);
      crowns.push({ x: x + Math.cos(a) * d, y: h * (0.6 + up * 0.3), z: z + Math.sin(a) * d, sx: s, sy: s * (0.8 + r() * 0.2), sz: s, ry: r() * 6.28, tint: 0.9 + up * 0.12 + r() * 0.06 });
    }
  };
  tree(-14.2, 3.4, 4.4, 3.0); tree(14.4, 3.0, 4.8, 3.2);
  [[50, -64], [-56, -22], [52, -98], [-36, -103], [56, -30], [-57, -80], [22, -105], [-12, -106], [40, -106]]
    .forEach((p) => tree(p[0], p[1], 10 + r() * 4, 10 + r() * 4));
  g.add(instanced(new THREE.CylinderGeometry(0.8, 1.1, 1, 10), M.bark, trunks));
  g.add(instanced(lumpy(4), M.leaf, crowns));

  // pool light and patio glow, switched on after dark by the stage
  const poolLight = new THREE.PointLight(0x7fd6f0, 0, 18, 2); poolLight.position.set(0.3, 1.0, -20.5); g.add(poolLight);
  const patioLight = new THREE.PointLight(0xffc98a, 0, 12, 2); patioLight.position.set(-0.3, 2.8, -11.8); g.add(patioLight);
  function setNight(d) {
    M.water.emissiveIntensity = d * 1.5;
    poolLight.intensity = d * 40; poolLight.visible = d > 0.01;
    patioLight.intensity = d * 30; patioLight.visible = d > 0.01;
  }
  setNight(0);

  return { group: g, water, setNight };
}
