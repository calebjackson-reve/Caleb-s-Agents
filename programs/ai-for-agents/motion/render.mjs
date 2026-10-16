#!/usr/bin/env node
// Renders a scene list to video, one seeked frame at a time, so every frame is exact.
//   node render.mjs scenes/pilot-imessage.json out.mp4 [--look ink] [--fps 30] [--stills 2,9.5,20 --still-dir dir]
// Writes out.mp4 (silent, 1920x1080) and out.marks.json (scene times, face mode, face card box).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const [scenesPath, outPath] = args.filter((a, i) => !a.startsWith("--") && !(i && args[i - 1].startsWith("--")));
if (!scenesPath || !outPath) { console.error("usage: node render.mjs SCENES.json OUT.mp4 [--look ivory|ink|grid] [--fps 30] [--stills t,t --still-dir DIR]"); process.exit(1); }
const data = JSON.parse(readFileSync(scenesPath, "utf8"));
if (opt("look")) data.look = opt("look");
const fps = +opt("fps", 30);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(HERE, "player.html")).href);
await page.evaluate(async (d) => { await document.fonts.ready; KITBUILD(d); }, data);
await page.evaluate(() => Promise.all([...document.fonts].map((f) => f.load())));
const info = await page.evaluate(() => ({ duration: KIT.duration, marks: KIT.marks }));

// where the full-face card sits in each face scene, once its entrance has settled
for (const m of info.marks) {
  if (m.face !== "full") continue;
  m.box = await page.evaluate((t) => { KIT.seek(t); const r = KIT.slot(); return r && { x: r.x, y: r.y, w: r.width, h: r.height }; }, m.start + 0.9);
}
info.pip = await page.evaluate(() => { const r = document.querySelector(".pipslot").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
mkdirSync(dirname(resolve(outPath)), { recursive: true });
writeFileSync(outPath.replace(/\.mp4$/, "") + ".marks.json", JSON.stringify({ look: data.look, fps, ...info }, null, 1));

const stills = opt("stills");
if (stills) {
  const dir = opt("still-dir", dirname(resolve(outPath)));
  mkdirSync(dir, { recursive: true });
  for (const t of stills.split(",").map(Number)) {
    await page.evaluate((s) => KIT.seek(s), t);
    await page.screenshot({ path: join(dir, `${data.look || "ivory"}-${String(t).replace(".", "_")}.png`) });
  }
  console.log(JSON.stringify({ stills: stills.split(",").length, dir }));
} else {
  const frames = Math.round(info.duration * fps);
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outPath], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((ok, bad) => ff.on("close", (c) => (c ? bad(new Error("ffmpeg " + c)) : ok())));
  for (let f = 0; f < frames; f++) {
    await page.evaluate((s) => KIT.seek(s), f / fps);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % (fps * 10) === 0) process.stderr.write(`[render] ${(f / fps).toFixed(0)}s / ${info.duration.toFixed(0)}s\n`);
  }
  ff.stdin.end();
  await done;
  console.log(JSON.stringify({ out: outPath, frames, duration: info.duration }));
}
await browser.close();
