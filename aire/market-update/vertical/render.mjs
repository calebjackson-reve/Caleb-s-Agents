// Renders index.html to a 9:16 MP4: 1080x1920, 30 fps, 30 s. Usage: node render.mjs out.mp4
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
const FPS=30, SEC=30, out=process.argv[2]||'baton-rouge-sept-2026-9x16.mp4';
rmSync('frames',{recursive:true,force:true}); mkdirSync('frames');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
await p.goto('file://'+process.cwd()+'/index.html'); await p.waitForTimeout(1500); // fonts
for(let f=0;f<FPS*SEC;f++){await p.evaluate(t=>window.render(t),f/FPS);await p.screenshot({path:`frames/${String(f).padStart(4,'0')}.png`});}
await b.close();
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i frames/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart ${out}`);
execSync(`ffprobe -v error -show_entries stream=width,height,r_frame_rate,duration -of default=nw=1 ${out}`,{stdio:'inherit'});
