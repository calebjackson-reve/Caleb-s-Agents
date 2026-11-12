// Materials for the Basil Lane model. Every texture is painted in code from what the listing photos show:
// white painted brick, charcoal shingles, cedar posts, pale blue shutters, brick porch.
import * as THREE from 'three';
import { canvasTex, rng } from './kit.js';

function speckle(ctx, w, h, r, base, spread, n, size = 1.6) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * spread;
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    const s = size * (0.5 + r());
    ctx.fillRect(r() * w, r() * h, s, s);
  }
}

export function makeMaterials(palette = 'paper') {
  const r = rng(7);
  const T = {};

  // White painted brick, running bond. One tile is 1.6 m by 1.2 m.
  T.brick = canvasTex(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#efece6'; ctx.fillRect(0, 0, w, h);
    const rows = 16, bw = w / 8, bh = h / rows;
    for (let j = 0; j < rows; j++) {
      for (let i = -1; i < 9; i++) {
        const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh;
        const v = 232 + Math.floor(r() * 18);
        ctx.fillStyle = `rgb(${v + 4},${v + 2},${v - 3})`;
        ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 1, y + 1, bw - 2, 1.5);
        ctx.fillStyle = 'rgba(90,80,70,0.16)'; ctx.fillRect(x + 1, y + bh - 3, bw - 2, 2);
      }
    }
  }, { repeat: [1 / 1.6, 1 / 1.2] });
  T.brickBump = canvasTex(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#555'; ctx.fillRect(0, 0, w, h);
    const rows = 16, bw = w / 8, bh = h / rows;
    for (let j = 0; j < rows; j++) for (let i = -1; i < 9; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh;
      const v = 180 + Math.floor(r() * 60);
      ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
    }
  }, { repeat: [1 / 1.6, 1 / 1.2], data: true });

  // Charcoal shingles. One tile is 2 m wide and 1.4 m up the slope, ten courses.
  T.shingle = canvasTex(512, 360, (ctx, w, h) => {
    ctx.fillStyle = '#434346'; ctx.fillRect(0, 0, w, h);
    const rows = 10, rh = h / rows;
    for (let j = 0; j < rows; j++) {
      let x = -r() * 40;
      while (x < w) {
        const tw = 26 + r() * 30, v = 58 + Math.floor(r() * 22);
        ctx.fillStyle = `rgb(${v + 1},${v},${v + 3})`;
        ctx.fillRect(x, j * rh, tw - 1, rh);
        x += tw;
      }
      const g = ctx.createLinearGradient(0, j * rh, 0, (j + 1) * rh);
      g.addColorStop(0, 'rgba(0,0,0,0.42)'); g.addColorStop(0.18, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0.05)');
      ctx.fillStyle = g; ctx.fillRect(0, j * rh, w, rh);
    }
    for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(255,255,255,${r() * 0.05})`; ctx.fillRect(r() * w, r() * h, 1.2, 1.2); }
  }, { repeat: [1 / 2, 1 / 1.4] });

  // Cedar, grain running up the post.
  T.cedar = canvasTex(128, 512, (ctx, w, h) => {
    ctx.fillStyle = '#7a5236'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = r() * w, v = r();
      ctx.strokeStyle = v > 0.5 ? `rgba(255,214,170,${0.05 + r() * 0.1})` : `rgba(30,14,4,${0.08 + r() * 0.2})`;
      ctx.lineWidth = 0.6 + r() * 2;
      ctx.beginPath(); ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (r() - 0.5) * 10, h * 0.33, x + (r() - 0.5) * 10, h * 0.66, x + (r() - 0.5) * 6, h);
      ctx.stroke();
    }
  }, { repeat: [1 / 0.5, 1 / 2.4] });

  // Brick paving for the porch and steps.
  T.paver = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a3978c'; ctx.fillRect(0, 0, w, h);
    const rows = 8, bw = w / 4, bh = h / rows;
    for (let j = 0; j < rows; j++) for (let i = -1; i < 5; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh;
      const k = r();
      ctx.fillStyle = `rgb(${176 + k * 26},${138 + k * 22},${120 + k * 20})`;
      ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
    }
  }, { repeat: [1 / 0.85, 1 / 0.6] });

  // Board and batten for the barn, lap siding for the dormers.
  T.batten = canvasTex(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f1efea'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(60,55,50,0.22)'; ctx.fillRect(w / 2 - 5, 0, 2, h); ctx.fillRect(w / 2 + 3, 0, 2, h);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(w / 2 - 3, 0, 6, h);
  }, { repeat: [1 / 0.45, 1] });
  T.lap = canvasTex(64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f2f0eb'; ctx.fillRect(0, 0, w, h);
    for (let j = 0; j < 4; j++) { ctx.fillStyle = 'rgba(60,55,50,0.25)'; ctx.fillRect(0, j * 32 + 29, w, 3); }
  }, { repeat: [1, 1 / 0.6] });
  T.seam = canvasTex(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#8d8f90'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(w / 2 - 2, 0, 2, h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(w / 2, 0, 2, h);
  }, { repeat: [1 / 0.45, 1] });

  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
  // A studio palette: the real materials of the house, quietened, on an ivory base. No lawn green, no sky blue.
  const M = {
    brick: std({ map: T.brick, bumpMap: T.brickBump, bumpScale: 0.5, roughness: 0.94 }),
    shingle: std({ map: T.shingle, roughness: 0.96, side: THREE.DoubleSide }),
    trim: std({ color: 0xf6f3ec, roughness: 0.72 }),
    lap: std({ map: T.lap, roughness: 0.82 }),
    cedar: std({ map: T.cedar, roughness: 0.7 }),
    shutter: std({ color: 0xc3ccd1, roughness: 0.72 }),
    door: std({ color: 0x3b2a1e, roughness: 0.5 }),
    glass: std({ color: 0x2a2f36, roughness: 0.06, metalness: 0.55, emissive: 0xffc27a, emissiveIntensity: 0 }),
    black: std({ color: 0x242224, roughness: 0.5, metalness: 0.3 }),
    paver: std({ map: T.paver, roughness: 0.92 }),
    concrete: std({ color: 0xfaf7f1, roughness: 0.95 }),
    // the ground is the page itself: it shows the backdrop colour exactly and only ever darkens where a shadow falls
    base: new THREE.ShadowMaterial({ color: 0x4a3f34, opacity: 0.24 }),
    baseEdge: std({ color: 0xefe8dc, roughness: 0.9 }),
    mulch: std({ color: 0xcdc3b3, roughness: 1 }),
    gravel: std({ color: 0xe4ddd0, roughness: 1 }),
    shrub: std({ color: 0xa3ad97, roughness: 1 }),
    leaf: std({ color: 0xc9cdbd, roughness: 1 }),
    bark: std({ color: 0xb9ad9c, roughness: 1 }),
    copper: std({ color: 0xb07a58, roughness: 0.42, metalness: 0.65 }),
    water: std({ color: 0x86c0cc, roughness: 0.12, metalness: 0, emissive: 0x39b6d8, emissiveIntensity: 0 }),
    pond: std({ color: 0xb4cdd2, roughness: 0.15, metalness: 0 }),
    batten: std({ map: T.batten, roughness: 0.82 }),
    seam: std({ map: T.seam, roughness: 0.5, metalness: 0.45, side: THREE.DoubleSide }),
    cushion: std({ color: 0xf8f5ef, roughness: 0.9 }),
    ember: std({ color: 0xe87757, roughness: 0.75 }),
    wreath: std({ color: 0x8f4a4c, roughness: 0.95 }),
    lamp: std({ color: 0x2a2a2a, emissive: 0xffb36b, emissiveIntensity: 0, roughness: 0.4 }),
  };
  // 'paper' keeps the whole model in the tones of the drawing: ivory, warm grey, ink for the glass, ember for the wreaths.
  // The real colours of the house then only appear in the real photograph. 'material' is the earlier look with a
  // charcoal roof, cedar and sage, kept here in case it is wanted back.
  if (palette === 'paper') {
    const set = (m, o) => { Object.assign(m, o); if (o.color !== undefined) m.color = new THREE.Color(o.color); m.needsUpdate = true; };
    set(M.brick, { color: 0xfffbf4 });
    set(M.shingle, { map: null, bumpMap: T.shingle, bumpScale: 1.8, color: 0x8b857c });
    set(M.cedar, { map: null, bumpMap: T.cedar, bumpScale: 0.8, color: 0xb99c7a });
    set(M.paver, { map: null, bumpMap: T.paver, bumpScale: 0.8, color: 0xddd2c4 });
    set(M.seam, { map: null, color: 0xd0cac0, metalness: 0.1 });
    set(M.shutter, { color: 0xe2e3df });
    set(M.door, { color: 0x5b4a3c });
    set(M.black, { color: 0x4d4843, metalness: 0.1 });
    set(M.mulch, { color: 0xe6dfd3 });
    set(M.gravel, { color: 0xeee8dd });
    set(M.shrub, { color: 0xc9ccbb });
    set(M.leaf, { color: 0xe6e5da });
    set(M.bark, { color: 0xd3c9ba });
    set(M.copper, { color: 0xb98a6c, metalness: 0.4 });
    set(M.water, { color: 0xd2e1e0 });
    set(M.pond, { color: 0xdae2e0 });
  }
  // Anything on the ground dissolves into the backdrop with distance from the house, so no edge of the land is ever in frame.
  const fadeOut = (m) => {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFadeWp;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvFadeWp = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;\n#else\nvFadeWp = (modelMatrix * vec4(position, 1.0)).xyz;\n#endif');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFadeWp;')
        .replace('#include <fog_fragment>', '#include <fog_fragment>\n#ifdef USE_FOG\ngl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(58.0, 135.0, length(vFadeWp.xz - vec2(0.0, -20.0))));\n#endif');
    };
    m.customProgramCacheKey = () => 'fadeOut';
  };
  [M.concrete, M.gravel, M.mulch, M.leaf, M.bark, M.pond].forEach(fadeOut);
  return { M, T };
}

// A soft round glow, used for lamps and window light after dark.
export function glowTexture() {
  return canvasTex(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}
