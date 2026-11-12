// The stage: a studio for the model. An ivory backdrop by day, ink after dark, soft light, and the pass that
// turns the lit model into an ink drawing and back. Up to three renders a frame: the lit scene, a cheap render of
// normals and depth that finds the edges and the soft contact shading, then one full screen pass that mixes
// drawing and model pixel by pixel.
import * as THREE from 'three';
import { buildHouse } from './house.js';
import { buildGrounds } from './grounds.js';
import { makeMaterials } from './materials.js';
import { lerp, clamp01 } from './kit.js';

const DEG = Math.PI / 180;
const IVORY = new THREE.Color('#FBF8F3'), INK = new THREE.Color('#14100E'), EMBER = new THREE.Color('#E87757');

const ENV_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ENV_FRAG = `
varying vec3 vDir; uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uFloor; uniform vec3 uKeyDir; uniform vec3 uKeyCol;
void main(){
  vec3 d = normalize(vDir);
  vec3 c = mix(uHorizon, uTop, smoothstep(0.0, 0.8, d.y));
  c = mix(c, uFloor, smoothstep(0.0, -0.35, d.y));
  c += uKeyCol * pow(max(dot(d, normalize(uKeyDir)), 0.0), 24.0);
  gl_FragColor = vec4(c, 1.0);
}`;

const POST_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const TONE = `
vec3 aces(vec3 x){
  const mat3 inM = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 outM = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  x = inM * (x * uExposure / 0.6);
  vec3 a = x * (x + 0.0245786) - 0.000090537;
  vec3 b = x * (0.983729 * x + 0.4329510) + 0.238081;
  return clamp(outM * (a / b), 0.0, 1.0);
}
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }`;

const POST_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tNormal; uniform sampler2D tDepth; uniform sampler2D tAO;
uniform vec2 uTexel; uniform vec2 uTexelAO; uniform mat4 uInvViewProj;
uniform float uNear; uniform float uFar; uniform float uExposure;
uniform float uInk; uniform float uBuild; uniform float uBlue; uniform float uLineW; uniform float uEdges; uniform float uAO;
uniform float uFocus; uniform float uDof; uniform float uVig;
uniform vec3 uPaper; uniform vec3 uLine; uniform vec3 uWashDark; uniform vec3 uWashLight; uniform vec3 uEmber;
uniform vec2 uFade; uniform vec3 uCenter;
${TONE}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float viewZ(float d){ return uNear * uFar / (uFar - d * (uFar - uNear)); }
vec3 nrm(vec2 uv){ return normalize(texture2D(tNormal, uv).xyz * 2.0 - 1.0); }

float edgeAt(vec2 uv, float w, float fine){
  vec2 o = uTexel * w;
  float dc = texture2D(tDepth, uv).r;
  float d1 = texture2D(tDepth, uv + vec2(o.x, 0.0)).r, d2 = texture2D(tDepth, uv - vec2(o.x, 0.0)).r;
  float d3 = texture2D(tDepth, uv + vec2(0.0, o.y)).r, d4 = texture2D(tDepth, uv - vec2(0.0, o.y)).r;
  float z = viewZ(min(dc, min(min(d1, d2), min(d3, d4))));
  float b = uNear * uFar / (uFar - uNear);
  float dz = abs(d1 + d2 + d3 + d4 - 4.0 * dc) * z * z / b;
  float eD = smoothstep(mix(0.35, 0.018, fine), mix(0.9, 0.05, fine), dz);
  vec3 nc = nrm(uv);
  float nd = 4.0 - dot(nc, nrm(uv + vec2(o.x, 0.0))) - dot(nc, nrm(uv - vec2(o.x, 0.0))) - dot(nc, nrm(uv + vec2(0.0, o.y))) - dot(nc, nrm(uv - vec2(0.0, o.y)));
  float eN = smoothstep(mix(0.9, 0.14, fine), mix(1.6, 0.55, fine), nd);
  return max(eD, eN);
}

// Shallow focus: sharp at the focus distance, softening in front and behind, like a long lens over a model.
vec3 shot(vec2 uv, float d){
  if (uDof <= 0.0) return texture2D(tColor, uv).rgb;
  float z = viewZ(d);
  float coc = clamp((abs(z - uFocus) / uFocus - 0.2) * uDof * 1.5, 0.0, 1.0);
  float lod = coc * 3.0;
  if (lod < 0.15) return texture2D(tColor, uv).rgb;
  vec2 o = uTexel * exp2(lod) * 0.9;
  vec3 c = textureLod(tColor, uv, lod).rgb * 0.28;
  c += textureLod(tColor, uv + o * vec2(0.92, 0.38), lod).rgb * 0.12;
  c += textureLod(tColor, uv + o * vec2(-0.38, 0.92), lod).rgb * 0.12;
  c += textureLod(tColor, uv + o * vec2(-0.92, -0.38), lod).rgb * 0.12;
  c += textureLod(tColor, uv + o * vec2(0.38, -0.92), lod).rgb * 0.12;
  c += textureLod(tColor, uv + o * vec2(0.65, -0.65) * 0.5, lod).rgb * 0.06;
  c += textureLod(tColor, uv + o * vec2(-0.65, 0.65) * 0.5, lod).rgb * 0.06;
  c += textureLod(tColor, uv + o * vec2(0.65, 0.65) * 0.5, lod).rgb * 0.06;
  c += textureLod(tColor, uv + o * vec2(-0.65, -0.65) * 0.5, lod).rgb * 0.06;
  return c;
}

void main(){
  float d = texture2D(tDepth, vUv).r;
  bool sky = d > 0.999999;
  vec3 hdr = shot(vUv, d);
  if (uAO > 0.0) {
    vec2 c0 = (floor(vUv / uTexelAO + 0.5)) * uTexelAO;
    float o = 0.25 * (texture2D(tAO, c0 + uTexelAO * vec2(-1.0, -1.0)).r + texture2D(tAO, c0 + uTexelAO * vec2(1.0, -1.0)).r
      + texture2D(tAO, c0 + uTexelAO * vec2(-1.0, 1.0)).r + texture2D(tAO, c0 + uTexelAO * vec2(1.0, 1.0)).r);
    hdr *= mix(vec3(1.0), vec3(o, o * 1.01, o * 1.03) * o, uAO);
  }
  vec3 lit = toSRGB(aces(hdr));
  float grain = hash(vUv * vec2(1931.0, 1217.0)) - 0.5;
  vec2 q = vUv - 0.5;
  lit *= 1.0 - uVig * dot(q, q) * 1.1;
  lit += grain * 0.011;
  if (uEdges < 0.5) { gl_FragColor = vec4(lit, 1.0); return; }

  vec4 wp4 = uInvViewProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec3 wp = wp4.xyz / wp4.w;
  float r = length(wp.xz - uCenter.xz);
  float fade = sky ? 0.0 : 1.0 - smoothstep(uFade.x, uFade.y, r);

  vec3 hb = abs(wp - vec3(0.0, 4.0, -8.6)) - vec3(12.4, 5.2, 13.6);
  float fine = sky ? 0.0 : 1.0 - smoothstep(0.0, 1.5, max(hb.x, max(hb.y, hb.z)));
  float e = edgeAt(vUv, uLineW, fine);
  float L = dot(lit, vec3(0.2126, 0.7152, 0.0722));
  vec3 wash = mix(uWashDark, uWashLight, smoothstep(0.05, 0.86, L));
  wash = mix(uPaper, wash, fade * mix(0.42, 1.0, smoothstep(0.03, 0.3, wp.y)));
  float pg = noise(vUv / uTexel * 0.55) - 0.5;
  vec3 drawing = mix(wash, uLine, e * mix(0.14, 0.9, fade) * (0.9 + pg * 0.25));
  drawing += pg * 0.016 + grain * 0.012;

  // the build front: the model fills in from the ground up, spreading outward across the base
  float h = mix(-3.4, 17.0, uBuild);
  float n = (noise(wp.xz * 0.3) - 0.5) * 0.9 + (noise(wp.xy * 0.9) - 0.5) * 0.3;
  float level = wp.y + n + min(r, 70.0) * 0.045;
  float built = sky ? smoothstep(0.55, 0.95, uBuild) : smoothstep(h, h - 1.7, level);
  float a = max(uInk * (1.0 - built), uBlue);
  vec3 col = mix(lit, drawing, a);
  float front = sky ? 0.0 : exp(-abs(level - h) * 16.0) * uInk * (1.0 - uBlue) * smoothstep(0.0, 0.05, uBuild) * (1.0 - smoothstep(0.86, 1.0, uBuild));
  col = mix(col, uEmber, clamp(front, 0.0, 1.0) * 0.7);
  gl_FragColor = vec4(col, 1.0);
}`;

const AO_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tNormal; uniform sampler2D tDepth; uniform vec2 uTexel; uniform mat4 uProj; uniform mat4 uInvProj;
vec3 nrm(vec2 uv){ return normalize(texture2D(tNormal, uv).xyz * 2.0 - 1.0); }
vec3 viewPos(vec2 uv){ float d = texture2D(tDepth, uv).r; vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
void main(){
  float d = texture2D(tDepth, vUv).r;
  if (d > 0.999999) { gl_FragColor = vec4(1.0); return; }
  vec3 p = viewPos(vUv), n = nrm(vUv);
  const float R = 1.5;
  vec2 rad = vec2(uProj[0][0], uProj[1][1]) * R * 0.5 / max(-p.z, 0.1);
  if (rad.y < uTexel.y * 1.5) { gl_FragColor = vec4(1.0); return; }
  rad = min(rad, vec2(0.08));
  vec2 fc = floor(gl_FragCoord.xy);
  float a0 = (mod(fc.x, 4.0) + mod(fc.y, 4.0) * 4.0) / 16.0 * 6.2831853;
  float occ = 0.0;
  for (int i = 0; i < 14; i++) {
    float fi = (float(i) + 0.5) / 14.0, ang = a0 + fi * 15.08;
    vec3 v = viewPos(vUv + vec2(cos(ang), sin(ang)) * sqrt(fi) * rad) - p;
    float dd = dot(v, v);
    occ += max(0.0, dot(n, v) - 0.03 - 0.0015 * -p.z) / (dd + 0.1) * (1.0 - smoothstep(R * R * 0.6, R * R * 2.2, dd));
  }
  gl_FragColor = vec4(vec3(clamp(1.0 - occ * 0.2, 0.0, 1.0)), 1.0);
}`;

// The same tone curve as the shader, in script, so the backdrop can be set to an exact page colour.
function acesJS(c, expo) {
  const x = [c[0] * expo / 0.6, c[1] * expo / 0.6, c[2] * expo / 0.6];
  const i = [0.59719 * x[0] + 0.35458 * x[1] + 0.04823 * x[2], 0.076 * x[0] + 0.90834 * x[1] + 0.01566 * x[2], 0.0284 * x[0] + 0.13383 * x[1] + 0.83777 * x[2]];
  const f = i.map((v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081));
  const o = [1.60475 * f[0] - 0.53108 * f[1] - 0.07367 * f[2], -0.10208 * f[0] + 1.10813 * f[1] - 0.00605 * f[2], -0.00327 * f[0] - 0.07276 * f[1] + 1.07602 * f[2]];
  return o.map((v) => Math.min(1, Math.max(0, v)));
}
// Finds the scene colour that comes out of the tone curve as the wanted screen colour.
function untone(target, expo, out) {
  const want = [target.r, target.g, target.b];   // THREE.Color keeps linear values
  let v = want.slice();
  for (let k = 0; k < 24; k++) {
    const got = acesJS(v, expo);
    v = v.map((x, i) => Math.max(1e-5, x * Math.pow((want[i] + 1e-4) / (got[i] + 1e-4), 0.9)));
  }
  return out.setRGB(v[0], v[1], v[2]);
}

// Three looks the studio moves between: clear day, late warm light, and after dark.
const LOOKS = [
  { bg: '#FBF8F3', keyI: 3.3, keyC: '#fff1df', hemiSky: '#fdfcff', hemiGround: '#efe2cf', hemiI: 0.6, env: 0.5, expo: 0.84, envTop: '#ffffff', envHor: '#f4eee4', envFloor: '#dccfbb', vig: 0, lateEl: 38 },
  { bg: '#F4E6D3', keyI: 3.4, keyC: '#ffc793', hemiSky: '#f2ecf2', hemiGround: '#e6cfae', hemiI: 0.5, env: 0.45, expo: 0.84, envTop: '#d9d6e2', envHor: '#f6d3aa', envFloor: '#c9b08e', vig: 0.12, lateEl: 19 },
  { bg: '#14100E', keyI: 1.5, keyC: '#8196cc', hemiSky: '#2c3852', hemiGround: '#0e0c0b', hemiI: 0.3, env: 0.25, expo: 0.98, envTop: '#10152a', envHor: '#232a44', envFloor: '#060505', vig: 0.45, lateEl: 34 },
];
const cA = new THREE.Color(), cB = new THREE.Color();
function lookColor(key, t, out) {
  const i = Math.min(1, Math.floor(t * 2)), f = t * 2 - i;
  cA.set(LOOKS[i][key]); cB.set(LOOKS[i + 1][key]);
  return out.copy(cA).lerp(cB, f);
}
function lookNum(key, t) {
  const i = Math.min(1, Math.floor(t * 2)), f = t * 2 - i;
  return lerp(LOOKS[i][key], LOOKS[i + 1][key], f);
}

export const DEFAULT_STATE = { az: 0, el: 2, dist: 150, tx: 0, ty: 3.4, tz: 0, fov: 10, ink: 1, build: 0, dusk: 0, blue: 0, explode: 0, sx: 0, sy: 0, sunAz: -42, sunEl: 38, dof: 0, focus: 0 };

export class Stage {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.info.autoReset = false;
    this.maxDpr = opts.maxDpr || 2;
    this.quality = opts.quality || 'high';

    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.0016);
    const camera = this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 2400);
    camera.layers.enable(1);

    const { M } = makeMaterials();
    this.M = M;
    this.houseKit = buildHouse(M);
    this.grounds = buildGrounds(M);
    scene.add(this.houseKit.house, this.grounds.group);

    // what the model reflects: a soft studio, lighter above, with a glow where the key light is
    this.envU = { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uFloor: { value: new THREE.Color() }, uKeyDir: { value: new THREE.Vector3(0, 1, 0) }, uKeyCol: { value: new THREE.Color() } };
    this.envScene = new THREE.Scene();
    this.envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({ uniforms: this.envU, vertexShader: ENV_VERT, fragmentShader: ENV_FRAG, side: THREE.BackSide })));
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envKey = '';

    // light: one key that casts the shadows, and a soft fill from above and below
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const sz = this.quality === 'fast' ? 1024 : (opts.shadow || 4096);
    this.sun.shadow.mapSize.set(sz, sz);
    const sc = this.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 420;
    this.sun.shadow.bias = -0.0003; this.sun.shadow.normalBias = 0.06; this.sun.shadow.radius = 5;
    this.sun.target.position.set(0, 0, -22);
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(this.hemi);

    // targets and the passes
    const fast = this.quality === 'fast';
    this.rtColor = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: fast ? 0 : 4, depthBuffer: true, generateMipmaps: !fast, minFilter: fast ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
    this.rtNorm = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, samples: 0, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.rtNorm.depthTexture = new THREE.DepthTexture(4, 4, THREE.UnsignedIntType);
    this.rtAO = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.normalMat = new THREE.MeshNormalMaterial();
    this.U = {
      tColor: { value: this.rtColor.texture }, tNormal: { value: this.rtNorm.texture }, tDepth: { value: this.rtNorm.depthTexture }, tAO: { value: this.rtAO.texture },
      uTexel: { value: new THREE.Vector2() }, uTexelAO: { value: new THREE.Vector2() }, uInvViewProj: { value: new THREE.Matrix4() },
      uNear: { value: camera.near }, uFar: { value: camera.far }, uExposure: { value: 0.8 },
      uInk: { value: 1 }, uBuild: { value: 0 }, uBlue: { value: 0 }, uLineW: { value: 1 }, uEdges: { value: 1 }, uAO: { value: fast ? 0 : 1 },
      uFocus: { value: 40 }, uDof: { value: 0 }, uVig: { value: 0 },
      uPaper: { value: IVORY.clone() }, uLine: { value: INK.clone() }, uWashDark: { value: new THREE.Color() }, uWashLight: { value: new THREE.Color() }, uEmber: { value: EMBER.clone() },
      uFade: { value: new THREE.Vector2(20, 43) }, uCenter: { value: new THREE.Vector3(0, 0, -6) },
    };
    this.UA = { tNormal: this.U.tNormal, tDepth: this.U.tDepth, uTexel: { value: new THREE.Vector2() }, uProj: { value: new THREE.Matrix4() }, uInvProj: { value: new THREE.Matrix4() } };
    const pass = (uniforms, frag) => {
      const sc2 = new THREE.Scene();
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, vertexShader: POST_VERT, fragmentShader: frag, depthTest: false, depthWrite: false }));
      quad.frustumCulled = false; sc2.add(quad); return sc2;
    };
    this.aoScene = pass(this.UA, AO_FRAG);
    this.postScene = pass(this.U, POST_FRAG);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.state = Object.assign({}, DEFAULT_STATE);
    this.sway = { x: 0, y: 0 };
    this.free = false;
    this.tone = 'paper';
    this.bg = new THREE.Color(); this.bgScene = new THREE.Color();
    this._v = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._c = new THREE.Color();
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.w = w; this.h = h; this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    const pw = Math.max(2, Math.floor(w * dpr)), ph = Math.max(2, Math.floor(h * dpr));
    this.rtColor.setSize(pw, ph); this.rtNorm.setSize(pw, ph);
    const aw = Math.max(2, pw >> 1), ah = Math.max(2, ph >> 1);
    this.rtAO.setSize(aw, ah);
    this.U.uTexel.value.set(1 / pw, 1 / ph); this.U.uTexelAO.value.set(1 / aw, 1 / ah); this.UA.uTexel.value.set(1 / pw, 1 / ph);
    this.U.uLineW.value = Math.max(1, Math.round(dpr * 0.8));
    this.camera.aspect = w / h;
  }

  setQuality(q) {
    if (q === this.quality) return;
    this.quality = q;
    if (q === 'fast') { this.maxDpr = Math.min(this.maxDpr, 1.25); this.U.uAO.value = 0; this.sun.shadow.mapSize.set(2048, 2048); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    this.resize();
  }

  // How much further back the camera stands on a tall screen so the house still fits across it.
  fit() { return Math.pow(Math.max(1, 1.5 / this.camera.aspect), 0.62); }

  apply(s) {
    this.state = s;
    const cam = this.camera;
    if (!this.free) {
      const a = (s.az + this.sway.x) * DEG, e = (s.el + this.sway.y) * DEG, d = s.dist;
      cam.position.set(s.tx + Math.sin(a) * Math.cos(e) * d, s.ty + Math.sin(e) * d, s.tz + Math.cos(a) * Math.cos(e) * d);
      cam.lookAt(s.tx, s.ty, s.tz);
      cam.fov = s.fov;
      cam.near = Math.min(60, Math.max(0.4, d * 0.22)); cam.far = 2400;
      if (s.sx || s.sy) cam.setViewOffset(this.w, this.h, -s.sx * this.w, -s.sy * this.h, this.w, this.h); else cam.clearViewOffset();
      this.U.uFocus.value = s.focus > 0 ? s.focus : d;
    } else {
      cam.clearViewOffset(); cam.fov = 30;
      const dd = cam.position.distanceTo(this._v.set(0, 2.5, -6));
      cam.near = Math.min(30, Math.max(0.4, dd * 0.08)); cam.far = 2400;
      this.U.uFocus.value = dd;
    }
    cam.updateProjectionMatrix();
    this.U.uDof.value = this.quality === 'fast' ? 0 : s.dof;

    // light for the time of day
    const t = clamp01(s.dusk);
    const expo = lookNum('expo', t);
    this.U.uExposure.value = expo; this.U.uVig.value = lookNum('vig', t);
    lookColor('bg', t, this.bg);
    untone(this.bg, expo, this.bgScene);
    this.scene.fog.color.copy(this.bgScene);
    const night = clamp01((t - 0.5) * 2);
    // by day the key follows the state, so scrolling sweeps the shadows; after dark it becomes a soft cool light from the front
    const az = lerp(s.sunAz, -34, night) * DEG, el = lerp(lerp(s.sunEl, 19, clamp01(t * 2)), 11, night) * DEG;
    const dir = this._v.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    this.sun.position.copy(this.sun.target.position).addScaledVector(dir, 200);
    lookColor('keyC', t, this.sun.color); this.sun.intensity = lookNum('keyI', t);
    lookColor('hemiSky', t, this.hemi.color); lookColor('hemiGround', t, this.hemi.groundColor); this.hemi.intensity = lookNum('hemiI', t);
    this.scene.environmentIntensity = lookNum('env', t);
    this.houseKit.setNight(night); this.grounds.setNight(night);
    const key = (Math.round(t * 24) / 24).toFixed(3);
    if (key !== this.envKey) {
      this.envKey = key;
      const E = this.envU;
      lookColor('envTop', t, E.uTop.value); lookColor('envHor', t, E.uHorizon.value); lookColor('envFloor', t, E.uFloor.value);
      E.uKeyDir.value.copy(dir); E.uKeyCol.value.copy(this.sun.color).multiplyScalar(0.5 * this.sun.intensity / 3);
      const old = this.envRT;
      this.envRT = this.pmrem.fromScene(this.envScene, 0.02, 1, 200);
      this.scene.environment = this.envRT.texture;
      if (old) old.dispose();
    }

    this.houseKit.setExplode(s.explode);

    // drawing and blueprint colours
    const P = this.U;
    const inkShare = s.ink * (1 - s.build);
    const b = s.blue > 0 ? (inkShare > 0.02 ? s.blue : 1) : 0;
    P.uPaper.value.copy(IVORY).lerp(INK, b);
    P.uLine.value.copy(INK).lerp(IVORY, b);
    P.uWashLight.value.copy(IVORY).lerp(this._c.copy(INK).lerp(IVORY, 0.09), b);
    P.uWashDark.value.set('#8f867a').lerp(this._c.copy(INK).multiplyScalar(0.75), b);
    P.uInk.value = s.ink; P.uBuild.value = s.build; P.uBlue.value = s.blue;
    P.uEdges.value = (s.ink > 0.002 && s.build < 0.999) || s.blue > 0.002 ? 1 : 0;
    const dark = Math.max(s.blue, (1 - inkShare) * clamp01((t - 0.62) * 4));
    this.tone = dark > 0.5 ? 'dark' : 'light';
  }

  render() {
    const r = this.renderer, cam = this.camera;
    r.info.reset();
    cam.updateMatrixWorld();
    this.U.uNear.value = cam.near; this.U.uFar.value = cam.far;

    r.setRenderTarget(this.rtColor);
    r.setClearColor(this.bgScene, 1); r.clear();
    r.render(this.scene, cam);

    if (this.U.uEdges.value > 0.5 || this.U.uAO.value > 0 || this.U.uDof.value > 0) {
      cam.layers.set(0);
      const fog = this.scene.fog;
      this.scene.fog = null; this.scene.overrideMaterial = this.normalMat;
      r.setRenderTarget(this.rtNorm);
      r.setClearColor(0x8080ff, 1); r.clear();
      const sh = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false;
      r.render(this.scene, cam);
      r.shadowMap.autoUpdate = sh;
      this.scene.overrideMaterial = null; this.scene.fog = fog;
      cam.layers.enable(1);
      this._m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).invert();
      this.U.uInvViewProj.value.copy(this._m);
      if (this.U.uAO.value > 0) {
        this.UA.uProj.value.copy(cam.projectionMatrix); this.UA.uInvProj.value.copy(cam.projectionMatrixInverse);
        r.setRenderTarget(this.rtAO); r.render(this.aoScene, this.postCam);
      }
    }
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }

  // Screen position of a point on the house. anchor is { part, at } from house.js, or a plain [x, y, z].
  project(anchor, out = {}) {
    const v = this._v;
    if (Array.isArray(anchor)) v.fromArray(anchor);
    else { v.fromArray(anchor.at); const p = this.houseKit.parts[anchor.part]; if (p) v.add(p.position); }
    v.project(this.camera);
    out.x = (v.x * 0.5 + 0.5) * this.w; out.y = (-v.y * 0.5 + 0.5) * this.h; out.visible = v.z < 1 && v.z > -1;
    return out;
  }

  info() { const i = this.renderer.info.render; return { calls: i.calls, triangles: i.triangles }; }
}
