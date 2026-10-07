/* Water: one fragment shader, no library. Draws everything below a water line as moving water with light.
   mountWater(canvas, {level, ripples, tint}) -> {setLevel(0..1), destroy()}. Level is the fraction of canvas height under water. */
(function (host) {
  "use strict";
  const motionOK = matchMedia("(prefers-reduced-motion: no-preference)");
  const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const FS = `precision mediump float;
uniform vec2 uRes;uniform float uTime,uLevel,uAlpha;uniform vec3 uDeep,uLight,uAccent;uniform vec3 uRip[6];
float wave(vec2 p){return sin(p.x*6.+uTime*1.1)*.5+sin(p.y*9.-uTime*.7)*.3+sin((p.x+p.y)*14.+uTime*1.9)*.2;}
float caustic(vec2 p){float c=0.;for(int i=1;i<4;i++){float f=float(i);c+=abs(sin(p.x*5.*f+uTime*.8+sin(p.y*7.*f-uTime*.6)));}return pow(c/3.,3.);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;float aspect=uRes.x/uRes.y;
  float rip=0.;
  for(int i=0;i<6;i++){float age=uTime-uRip[i].z;if(uRip[i].z>0.&&age<3.){float d=distance(vec2(uv.x*aspect,uv.y),vec2(uRip[i].x*aspect,uRip[i].y));rip+=sin(38.*d-7.*age)*exp(-2.2*age)*exp(-6.*d)*.012;}}
  float line=uLevel+.006*wave(uv*3.)+rip;
  float under=smoothstep(line+.003,line-.003,uv.y);
  float depth=clamp((line-uv.y)/max(line,.001),0.,1.);
  vec3 col=mix(uLight,uDeep,pow(depth,.7));
  float c=caustic(vec2(uv.x*aspect,uv.y)*2.2+wave(uv)*.05+rip*8.);
  col+=uAccent*c*.22*(1.-depth*.6);
  float foam=smoothstep(.010,0.,abs(uv.y-line));
  float sheen=smoothstep(.06,0.,abs(uv.y-line))*.18;
  gl_FragColor=vec4(col+foam*.75+sheen,(under*.94+foam)*uAlpha);
}`;
  function hex(h) { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  function mountWater(canvas, opts = {}) {
    const api = { setLevel() {}, destroy() {}, ripple() {} };
    if (!motionOK.matches && !opts.force) { canvas.style.display = "none"; return api; }
    let gl; try { gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" }); } catch (e) { gl = null; }
    if (!gl) { canvas.style.display = "none"; return api; }
    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    let prog;
    try { prog = gl.createProgram(); gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link"); } catch (e) { canvas.style.display = "none"; return api; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const u = n => gl.getUniformLocation(prog, n);
    const uRes = u("uRes"), uTime = u("uTime"), uLevel = u("uLevel"), uAlpha = u("uAlpha"), uDeep = u("uDeep"), uLight = u("uLight"), uAccent = u("uAccent"), uRip = u("uRip");
    gl.uniform3fv(uDeep, hex(opts.deep || "#0E2B33")); gl.uniform3fv(uLight, hex(opts.light || "#2E6A78")); gl.uniform3fv(uAccent, hex(opts.accent || "#E87757"));
    gl.uniform1f(uAlpha, opts.alpha ?? 1);
    let level = opts.level ?? 0.4, target = level, running = false, raf = 0, visible = true, t0 = performance.now();
    const rips = new Float32Array(18); let ripIdx = 0;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * (opts.renderScale || 0.6);
    function resize() { const w = Math.max(1, Math.round(canvas.clientWidth * scale)), h = Math.max(1, Math.round(canvas.clientHeight * scale)); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); } gl.uniform2f(uRes, canvas.width, canvas.height); }
    function frame(now) {
      if (!running) return;
      level += (target - level) * 0.045;
      gl.uniform1f(uTime, (now - t0) / 1000); gl.uniform1f(uLevel, level); gl.uniform3fv(uRip, rips);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running || !visible || document.hidden) return; running = true; resize(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    const ro = "ResizeObserver" in window ? new ResizeObserver(resize) : null; ro?.observe(canvas);
    const io = "IntersectionObserver" in window ? new IntersectionObserver(en => { visible = en[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.02 }) : null; io?.observe(canvas);
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); stop(); canvas.style.display = "none"; });
    if (opts.ripples !== false) {
      const target_el = opts.rippleTarget || canvas;
      target_el.addEventListener("pointermove", e => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height; if (y > level + 0.02) return; if (Math.random() > 0.25) return; api.ripple(x, y); }, { passive: true });
      target_el.addEventListener("pointerdown", e => { const r = canvas.getBoundingClientRect(); api.ripple((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height); }, { passive: true });
    }
    api.ripple = (x, y) => { const i = (ripIdx++ % 6) * 3; rips[i] = x; rips[i + 1] = y; rips[i + 2] = (performance.now() - t0) / 1000; };
    api.setLevel = v => { target = Math.max(0, Math.min(1, v)); start(); };
    api.pause = stop;
    api.destroy = () => { stop(); ro?.disconnect(); io?.disconnect(); };
    if (!io) start();
    return api;
  }
  host.mountWater = mountWater;
})(window);
