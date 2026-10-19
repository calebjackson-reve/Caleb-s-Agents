import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox']});
const errs=[];
async function page(w,h){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); return p; }
// phone
const ph = await page(390, 844);
const t0=Date.now(); await ph.goto('http://localhost:3123/',{waitUntil:'networkidle'}); const load=Date.now()-t0;
await ph.screenshot({path:'cc-phone.png', fullPage:true});
// actions
await ph.getByRole('button',{name:'Mark called'}).first().click(); await ph.waitForTimeout(600);
const calledNow = await ph.getByRole('button',{name:'Called'}).count();
await ph.getByRole('button',{name:'Drop'}).first().click(); await ph.waitForTimeout(600);
const queued = await ph.locator('.count').nth(1).textContent();
ph.once('dialog', d=>d.accept());
await ph.getByRole('button',{name:/Approve and send/}).click(); await ph.waitForTimeout(4000);
const out = await ph.locator('pre.out').textContent();
await ph.getByRole('button',{name:'Mark signed'}).first().click(); await ph.waitForTimeout(600);
const signed = await ph.getByRole('button',{name:'Signed'}).count();
await ph.screenshot({path:'cc-phone-after.png', fullPage:true});
// lead page
await ph.getByRole('link',{name:'Jordan Example'}).click(); await ph.waitForURL(/leads/); await ph.waitForTimeout(500);
const leadTitle = await ph.locator('h1').first().textContent();
await ph.screenshot({path:'cc-lead.png', fullPage:true});
// desktop
const dk = await page(1280, 900); await dk.goto('http://localhost:3123/',{waitUntil:'networkidle'}); await dk.screenshot({path:'cc-desktop.png', fullPage:true});
console.log(JSON.stringify({load_ms:load, calledNow, queued, approveOut:(out||'').slice(0,160).replace(/\n/g,' | '), signed, leadTitle, errs},null,1));
await b.close();
