// Drives the widget in headless Chromium against the local Worker + mock xAI and saves screenshots.
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.env.OUT || 'grok-chat/proof';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:8080/demo.html');
const host = page.locator('#cj-chat-host');
await page.screenshot({ path: `${OUT}/1-closed.png` });

await host.locator('button.b').click();
await page.screenshot({ path: `${OUT}/2-open.png` });

async function say(text) {
  await host.locator('textarea').fill(text);
  await host.locator('.f button').click();
  await host.locator('.a.t').waitFor({ state: 'detached', timeout: 20000 });
}
await say('Thinking about moving to Zachary next spring. What is the market like?');
await page.screenshot({ path: `${OUT}/3-first-answer.png` });
await say("I'm Sarah, 225-555-0142. We want to buy around $350k.");
await page.screenshot({ path: `${OUT}/4-lead-captured.png` });

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: `${OUT}/5-mobile.png` });

const transcript = await host.locator('.m').innerText();
await browser.close();
console.log(transcript);
console.log('page errors:', errors.length ? errors : 'none');
