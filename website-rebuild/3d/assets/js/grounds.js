// The site model: ivory ground with the land laid out from the aerial footage. The walk and drive, the beds,
// the pool terrace behind, the barn, the pond with its gazebo and a few oaks. Everything is quiet in tone so the house leads.
// The ground has no edge: it runs far past any camera and dissolves into the backdrop (see fadeOut in materials.js).
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Bin, box, roof, prismX, rng } from './kit.js';
import { glowTexture } from './materials.js';
import { D } from './house.js';


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

  // the ground
  const top = new THREE.Mesh(new THREE.CircleGeometry(520, 96), M.base);
  top.rotation.x = -Math.PI / 2; top.position.set(0, 0, -20); top.receiveShadow = true; g.add(top);

  const b = new Bin();
  // beds along the front and the right side
  // the beds follow the front of the house: forward round the porch, stepping back in front of the wings
  const PF = D.porchHalf;
  [-1, 1].forEach((sd) => {
    const bx = (a, c, z0, z1) => b.add(M.mulch, box(Math.min(sd * a, sd * c), Math.max(sd * a, sd * c), 0, 0.05, z0, z1));
    bx(1.98, PF + 0.9, D.porchD - 0.4, 4.7);
    bx(PF, H + 1.3, 0, 3.1);
  });
  b.add(M.mulch, box(H, H + 1.3, 0, 0.05, D.back, D.wingZ));
  // front walk, the path across to the drive, the drive and the lane out
  b.add(M.concrete, box(-1.3, 1.3, 0, 0.04, D.porchD + 0.96, 8.2));
  b.add(M.concrete, box(-25, -1.3, 0, 0.04, 6.9, 8.2));
  b.add(M.concrete, box(-25, -H, 0, 0.05, D.garageBack - 1.5, -8.5));
  b.add(M.concrete, box(-23.4, -20.1, 0, 0.045, -8.5, 150));
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
  [[5.9, -15], [5.9, -26]].forEach((p) => {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.24, 0.24, 24), M.black);
    bowl.position.set(p[0], 0.87, p[1]); bowl.castShadow = true; bowl.receiveShadow = true; g.add(bowl);
  });

  // pool water, a little lower than the coping
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 10.3), M.water);
  water.rotation.x = -Math.PI / 2; water.position.set(0.3, 0.215, -20.5); water.receiveShadow = true; g.add(water);

  // fence round the pool yard. Rails and a post every eighth picket are part of every look. The fine pickets sit on
  // their own layer so they show by day and at dusk but stay out of the line passes, where they would clog into a block.
  const rail = new Bin(), pickets = [];
  const yard = [[-5.1, -27.6], [13.2, -27.6], [13.2, -13.2], [7.4, -13.2]];
  for (let i = 0; i < yard.length - 1; i++) {
    const [x0, z0] = yard[i], [x1, z1] = yard[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 0.16);
    [0.3, 1.25].forEach((y) => rail.add(M.black, box(Math.min(x0, x1) - 0.02, Math.max(x0, x1) + 0.02, y, y + 0.04, Math.min(z0, z1) - 0.02, Math.max(z0, z1) + 0.02)));
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n, z = z0 + ((z1 - z0) * k) / n;
      if (k % 8 === 0 || k === n) rail.add(M.black, box(x - 0.03, x + 0.03, 0, 1.36, z - 0.03, z + 0.03));
      else pickets.push({ x, y: 0.7, z, sx: 1, sy: 1, sz: 1 });
    }
  }
  rail.build(g, { cast: false });
  const picketMesh = instanced(new THREE.BoxGeometry(0.018, 1.3, 0.018), M.black, pickets, false);
  picketMesh.layers.set(1); g.add(picketMesh);

  // planting, as in the photos: one low clipped hedge along each bed, a few taller accents, a row of cones by the pool
  const balls = [], cones = [];
  // a low clipped hedge: a rounded section pulled along the run, as boxwood is kept in front of the real house
  const hedgeGeos = [];
  const real = M.palette === 'real';
  const hedge = (x0, z0, x1, z1) => {
    if (real) {   // a row of young boxwoods in dark mulch, each its own plant, as the listing photos show
      const run = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(run / 0.92));
      for (let k = 0; k <= n; k++) {
        const u = k / n, s = 0.3 + r() * 0.09;
        balls.push({ x: x0 + (x1 - x0) * u + (r() - 0.5) * 0.1, y: 0.05 + s * 0.82, z: z0 + (z1 - z0) * u + (r() - 0.5) * 0.1, sx: s * 1.08, sy: s, sz: s * 1.08, ry: r() * 6.28, tint: 0.78 + r() * 0.34 });
      }
      return;
    }
    const len = Math.hypot(x1 - x0, z1 - z0), w = 0.34, h = 0.52, rad = 0.07;   // clipped flat, with a visible arris
    const sh = new THREE.Shape();
    sh.moveTo(-w, 0); sh.lineTo(w, 0); sh.lineTo(w, h - rad); sh.quadraticCurveTo(w, h, w - rad, h); sh.lineTo(-w + rad, h); sh.quadraticCurveTo(-w, h, -w, h - rad); sh.lineTo(-w, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 4 });
    geo.deleteAttribute('uv');
    const m = new THREE.Matrix4().makeRotationY(Math.atan2(x1 - x0, z1 - z0)).setPosition(x0, 0.05, z0);
    geo.applyMatrix4(m); hedgeGeos.push(geo);
  };
  [-1, 1].forEach((s) => {
    hedge(s * 2.5, 4.3, s * (PF + 0.55), 4.3); hedge(s * (PF + 0.55), 4.3, s * (PF + 0.55), 2.7); hedge(s * (PF + 0.55), 2.7, s * (H + 0.75), 2.7);
  });
  hedge(H + 0.8, 2.7, H + 0.8, -9);
  // accents: a rounded shrub by each wing corner and one either side of the steps
  [[-H - 0.55, 1.5, 0.95], [H + 0.55, 1.5, 0.95], [-2.5, 3.75, 0.62], [2.5, 3.75, 0.62]].forEach((p) => {
    balls.push({ x: p[0], y: 0.05 + p[2] * 0.8, z: p[1], sx: p[2] * 0.72, sy: p[2], sz: p[2] * 0.72, tint: 0.9 });
  });
  [[-6.0, 1.25], [6.0, 1.25]].forEach((p) => cones.push({ x: p[0], y: 0.05 + 0.7, z: p[1], sx: 0.36, sy: 1.4, sz: 0.36, tint: 0.92 }));
  for (let x = -4; x <= 12.5; x += 1.25) cones.push({ x, y: 0.75, z: -28.4, sx: 0.4, sy: 1.5, sz: 0.4, tint: 0.88 + r() * 0.16 });
  if (hedgeGeos.length) { const hedges = new THREE.Mesh(mergeGeometries(hedgeGeos, false), M.shrub); hedges.castShadow = true; hedges.receiveShadow = true; g.add(hedges); }
  g.add(instanced(new THREE.SphereGeometry(1, 14, 9), M.shrub, balls));
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
    const bank = new THREE.Mesh(new THREE.RingGeometry(1, 1.045, 96), M.mulch);
    bank.rotation.x = -Math.PI / 2; bank.scale.set(30, 17, 1); bank.position.set(6, 0.034, -88); bank.receiveShadow = true; g.add(bank);
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
  const trunks = [], crowns = [], shades = [];
  const tree = (x, z, h, w) => {
    trunks.push({ x, y: h * 0.3, z, sx: Math.max(0.13, w * 0.03), sy: h * 0.6, sz: Math.max(0.13, w * 0.03) });
    const n = real ? 22 + Math.floor(r() * 8) : 5 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, up = real ? Math.pow(r(), 0.8) : r();
      const d = (real ? 0.5 * (1 - Math.pow(up, 1.6) * 0.62) : 0.27 * (1 - up * 0.5)) * Math.sqrt(r()) * w;
      const s = w * (real ? (0.12 + r() * 0.09) * (1 - up * 0.25) : 0.27 + r() * 0.1);
      if (i === 0) shades.push({ x, z, s: w * 1.25 });
      crowns.push({ x: x + Math.cos(a) * d, y: h * (real ? 0.5 + up * 0.46 : 0.6 + up * 0.3), z: z + Math.sin(a) * d, sx: s, sy: s * (0.8 + r() * 0.2), sz: s, ry: r() * 6.28, tint: real ? 0.5 + up * 0.5 + r() * 0.22 : 0.9 + up * 0.12 + r() * 0.06 });
    }
  };
  tree(-14.0, 4.0, 4.4, 3.0); tree(13.7, 4.2, 4.8, 3.2);
  [[50, -64], [-56, -22], [52, -98], [-36, -103], [56, -30], [-57, -80], [22, -105], [-12, -106], [40, -106]]
    .forEach((p) => tree(p[0], p[1], 10 + r() * 4, 10 + r() * 4));
  g.add(instanced(new THREE.CylinderGeometry(0.8, 1.1, 1, 10), M.bark, trunks));
  // Trees do not throw a hard shadow that can slide away from them. Each one sits on a soft pool of shade, the way
  // a model maker would airbrush it, and the house gets the same soft band round its foot.
  g.add(instanced(lumpy(real ? 2 : 4), M.leaf, crowns, real));
  const shadeMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x3a3028, transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  shades.forEach((t) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(t.s * 2, t.s * 2), shadeMat);
    p.rotation.x = -Math.PI / 2; p.position.set(t.x, 0.062, t.z); p.layers.set(1); g.add(p);
  });
  const footTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), k = 256 / 36, X = (v) => (v + 18) * k, Z = (v) => (v + 26) * k;   // 36 m square, x -18..18, z -26..10
    x.shadowColor = 'rgba(255,255,255,1)'; x.shadowBlur = 11; x.shadowOffsetX = 600; x.fillStyle = '#fff';
    const rect = (x0, x1, z0, z1) => x.fillRect(X(x0) - 600, Z(z0), X(x1) - X(x0), Z(z1) - Z(z0));
    rect(-D.half, D.half, D.back, D.wingZ); rect(-D.porchHalf, D.porchHalf, 0, D.porchD + 0.9); rect(-D.half, -D.wingIn, D.garageBack, D.back);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const footMat = new THREE.MeshBasicMaterial({ map: footTex, color: 0x3a3028, transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const foot = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), footMat);
  foot.rotation.x = -Math.PI / 2; foot.position.set(0, 0.058, -8); foot.layers.set(1); g.add(foot);

  // After dark. The patio light is a downward cone under its roof, so it lights the slab and the wall and nothing above it.
  // The ground is the backdrop itself, so the light that would pool on it is laid down as soft glows.
  const poolLight = new THREE.PointLight(0x7fd6f0, 0, 11, 2); poolLight.position.set(0.3, 0.8, -20.5); g.add(poolLight);
  const patioLight = new THREE.SpotLight(0xffc98a, 0, 9, 1.05, 0.7, 2); patioLight.position.set(-0.3, 3.0, -11.7); patioLight.target.position.set(-0.3, 0, -12.2);
  g.add(patioLight, patioLight.target);
  const gtex = glowTexture(), pools = [];
  const pool = (x, z, w, d, color, strength) => {
    const m = new THREE.MeshBasicMaterial({ map: gtex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, fog: false });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
    pl.rotation.x = -Math.PI / 2; pl.position.set(x, 0.09, z); pl.layers.set(1); pl.userData.strength = strength; g.add(pl); pools.push(pl);
  };
  pool(0, 6.2, 26, 13, new THREE.Color(1.0, 0.62, 0.3), 0.32);        // in front of the porch
  pool(-D.wingC, 3.0, 9, 6, new THREE.Color(1.0, 0.62, 0.3), 0.2); pool(D.wingC, 3.0, 9, 6, new THREE.Color(1.0, 0.62, 0.3), 0.2);
  pool(0.3, -20.5, 22, 26, new THREE.Color(0.3, 0.75, 0.95), 0.3);    // round the water
  pool(-0.3, -13.5, 14, 8, new THREE.Color(1.0, 0.62, 0.3), 0.26);    // off the patio
  // After dark the ground is the page colour, so anything lying on it has to come down with it or it glows.
  const lying = [M.concrete, M.gravel, M.mulch, M.pond].concat(real ? [M.base, M.shrub, M.leaf] : []).map((m) => ({ m, day: m.color.clone(), night: m.color.clone().multiplyScalar(0.42) }));
  function setNight(d) {
    lying.forEach((x) => x.m.color.lerpColors(x.day, x.night, d));
    shadeMat.opacity = 0.2 * (1 - d * 0.6); footMat.opacity = 0.2 * (1 - d * 0.5);
    M.water.emissiveIntensity = d * 0.3;
    poolLight.intensity = d * 8; poolLight.visible = d > 0.01;
    patioLight.intensity = d * 60; patioLight.visible = d > 0.01;
    pools.forEach((pl) => { pl.material.opacity = d * pl.userData.strength; pl.visible = d > 0.01; });
  }
  setNight(0);

  return { group: g, water, setNight };
}
