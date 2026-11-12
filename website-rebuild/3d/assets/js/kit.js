// Small geometry and texture helpers for the Basil Lane model. Everything is built in code, no model files.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Seeded random so the scene is identical on every load.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A texture drawn in code. size is how many metres one tile covers.
export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = opts.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = opts.anisotropy || 8;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  return t;
}

// Give every triangle UVs in metres, laid flat on its own plane, so one texture tiles evenly on walls and roofs.
export function worldUV(geom, scale = 1) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const n = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.subVectors(b, a).cross(v.subVectors(c, a)).normalize();
    if (Math.abs(n.y) > 0.995) { u.set(1, 0, 0); v.set(0, 0, 1); }
    else { u.crossVectors(up, n).normalize(); v.crossVectors(n, u).normalize(); }
    for (let k = 0; k < 3; k++) {
      const p = k === 0 ? a : k === 1 ? b : c;
      uv[(i + k) * 2] = p.dot(u) * scale;
      uv[(i + k) * 2 + 1] = p.dot(v) * scale;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// Box given by its extents.
export function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g.toNonIndexed();
}

// A closed solid from flat convex faces (arrays of [x, y, z]). Faces are turned to point away from the middle.
export function solid(faces, inside) {
  const cen = new THREE.Vector3(); let count = 0;
  faces.forEach((f) => f.forEach((p) => { cen.x += p[0]; cen.y += p[1]; cen.z += p[2]; count++; }));
  cen.multiplyScalar(1 / count);
  if (inside) cen.fromArray(inside);
  const out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Vector3();
  faces.forEach((f) => {
    a.fromArray(f[0]); b.fromArray(f[1]); c.fromArray(f[2]);
    n.subVectors(b, a).cross(m.subVectors(c, a));
    m.set(0, 0, 0); f.forEach((p) => { m.x += p[0]; m.y += p[1]; m.z += p[2]; }); m.multiplyScalar(1 / f.length);
    const flip = n.dot(m.sub(cen)) < 0;
    for (let i = 1; i < f.length - 1; i++) {
      const tri = flip ? [f[0], f[i + 1], f[i]] : [f[0], f[i], f[i + 1]];
      tri.forEach((p) => out.push(p[0], p[1], p[2]));
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(out), 3));
  g.computeVertexNormals();
  return g;
}

// Roof solid over a rectangle. axis 'x' runs the ridge left to right, 'z' front to back.
// hipA and hipB pull the ridge ends in (0 leaves a gable end). ridgeAt shifts the ridge across the span (0.5 is centred).
export function roof({ x0, x1, z0, z1, y, ridgeY, axis = 'x', hipA = 0, hipB = 0, ridgeAt = 0.5 }) {
  let P, Ra, Rb;
  if (axis === 'x') {
    const zr = z0 + (z1 - z0) * ridgeAt;
    P = [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]];
    Ra = [x0 + hipA, ridgeY, zr]; Rb = [x1 - hipB, ridgeY, zr];
  } else {
    const xr = x0 + (x1 - x0) * ridgeAt;
    P = [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]];
    Ra = [xr, ridgeY, z0 + hipA]; Rb = [xr, ridgeY, z1 - hipB];
  }
  // Slopes always. End faces only where the roof is hipped: a gable end is left open so the wall shows.
  const faces = [[P[0], P[1], Rb, Ra], [P[2], P[3], Ra, Rb]];
  if (hipA > 0) faces.push([P[3], P[0], Ra]);
  if (hipB > 0) faces.push([P[1], P[2], Rb]);
  return solid(faces, [(x0 + x1) / 2, y - 2, (z0 + z1) / 2]);
}

// A flat outline in X and Y pushed through from z0 to z1. Points go around the outline once.
export function prismZ(pts, z0, z1) {
  const front = pts.map((p) => [p[0], p[1], z1]);
  const back = pts.map((p) => [p[0], p[1], z0]);
  const faces = [front, back];
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    faces.push([front[i], front[j], back[j], back[i]]);
  }
  return solid(faces);
}
// The same, for an outline in Z and Y pushed through from x0 to x1.
export function prismX(pts, x0, x1) {
  const a = pts.map((p) => [x1, p[1], p[0]]);
  const b = pts.map((p) => [x0, p[1], p[0]]);
  const faces = [a, b];
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    faces.push([a[i], a[j], b[j], b[i]]);
  }
  return solid(faces);
}

// Collects geometry by material so each part of the house ends up as a handful of meshes.
export class Bin {
  constructor() { this.lists = new Map(); }
  add(mat, geom, matrix) {
    let g = geom.index ? geom.toNonIndexed() : geom;
    if (matrix) { g = g.clone(); g.applyMatrix4(matrix); }
    if (!this.lists.has(mat)) this.lists.set(mat, []);
    this.lists.get(mat).push(g);
    return this;
  }
  build(group, opts = {}) {
    this.lists.forEach((geoms, mat) => {
      const clean = geoms.map((g) => {
        const c = new THREE.BufferGeometry();
        c.setAttribute('position', g.attributes.position);
        return worldUV(c, 1);
      });
      const merged = mergeGeometries(clean, false);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = opts.cast !== false;
      mesh.receiveShadow = true;
      group.add(mesh);
    });
    return group;
  }
}

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp01(t) { return Math.min(1, Math.max(0, t)); }
export function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
export function smoother(t) { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); }
