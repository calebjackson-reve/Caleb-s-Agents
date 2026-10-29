// End-to-end check of the review page in a real browser (Playwright, Chromium).
// Serves website-rebuild/site locally, taps through like a client, and checks
// the draft, the tone and "we/I" switches, the 6-pick limit, the copy to
// clipboard and the Google and Zillow handoff. Pass a URL to test a live page:
//   node website-rebuild/tests/review-e2e.js https://home.calebjackson.org/review/
var { chromium } = require('playwright');
var http = require('http'), fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..', 'site');
var shots = process.env.SHOTS || path.join(__dirname, 'out');
fs.mkdirSync(shots, { recursive: true });
var fails = 0;
function ok(c, msg) { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; }

(async function () {
  var base = process.argv[2], server;
  if (!base) {
    server = http.createServer(function (req, res) {
      var p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (p.endsWith('/')) p += 'index.html';
      fs.readFile(p, function (e, d) {
        if (e) { res.writeHead(404); return res.end(); }
        var t = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream';
        res.writeHead(200, { 'content-type': t }); res.end(d);
      });
    }).listen(8791);
    base = 'http://localhost:8791/review/';
  }
  var b = await chromium.launch();
  var ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] });
  var p = await ctx.newPage();
  var errors = []; p.on('pageerror', function (e) { errors.push(String(e)); });
  function tap(name, value) { return p.click('label:has(input[name=' + name + '][value="' + value + '"])'); }
  await p.goto(base + '?n=Sarah&a=Zachary&t=buy', { waitUntil: 'networkidle' });

  var cfg = await p.evaluate(function () { return window.REVIEW_CONFIG; });
  ok(cfg && /g\.page|google/.test(cfg.google) && /zillow/.test(cfg.zillow), 'config has Google and Zillow links');
  ok((await p.textContent('#hello')).indexOf('Hi Sarah') === 0, 'greets by first name from the link');
  ok(await p.inputValue('input[name=a]') === 'Zachary', 'town filled from the link');
  ok(await p.isChecked('input[name=t][value=buy]'), 'buy preselected from the link');

  var nVals = await p.locator('#vals label').count();
  var nRecs = await p.locator('#recs label').count();
  var nTones = await p.locator('#tones label').count();
  ok(nVals >= 30, nVals + ' help options rendered');
  ok(nRecs >= 9, nRecs + ' recommend options rendered');
  ok(nTones === 5, nTones + ' tone choices rendered');
  var hint = await p.textContent('#vals + #valcount, #vals ~ .hint');
  ok(/more than one/i.test(await p.textContent('fieldset:has(#vals) .hint')), 'hint says you can pick more than one');

  ok(!(await p.isVisible('label:has(input[name=v][value=price])')), 'selling chips hidden for a buyer');
  ok(await p.isVisible('label:has(input[name=v][value=find])'), 'buying chips shown for a buyer');
  await tap('t', 'sell');
  ok(await p.isVisible('label:has(input[name=v][value=price])') && !(await p.isVisible('label:has(input[name=v][value=find])')), 'switching to Sold swaps the chips');
  await tap('t', 'both');
  ok(await p.isVisible('label:has(input[name=v][value=price])') && await p.isVisible('label:has(input[name=v][value=find])'), 'Both shows every chip');
  await tap('t', 'buy');
  await p.click('#stars button[data-s="5"]');
  await tap('first', 'yes');
  var picks = ['comm', 'neg', 'local', 'honest', 'fast', 'family', 'calm'];
  for (var i = 0; i < picks.length; i++) await tap('v', picks[i]);
  var checked = await p.locator('input[name=v]:checked').count();
  ok(checked === 6, 'seventh pick is refused, ' + checked + ' stay picked');
  ok(/limit|already/i.test(await p.textContent('#valcount')), 'limit message shown: ' + (await p.textContent('#valcount')).trim());
  await p.fill('textarea[name=story]', 'we had a low appraisal and caleb got it sorted in two days');
  await tap('r', 'first-time buyers');

  var d1 = await p.inputValue('#out');
  ok(/Caleb Jackson/.test(d1) && /Keller Williams First Choice/.test(d1), 'draft names Caleb and the brokerage');
  ok(/Zachary/.test(d1), 'draft mentions the town');
  ok(/low appraisal/.test(d1) && /Caleb got it sorted/.test(d1), 'draft keeps the client\'s own words, Caleb capitalized');
  ok(/first/i.test(d1), 'draft mentions first home');
  ok(!/\{|—|;/.test(d1), 'no stray tokens, em dashes or semicolons');
  await p.screenshot({ path: path.join(shots, 'review-1-filled.png'), fullPage: true });

  var seen = {}; seen[d1] = 1;
  for (var k = 0; k < 8; k++) { await p.click('#again'); seen[await p.inputValue('#out')] = 1; }
  ok(Object.keys(seen).length >= 8, Object.keys(seen).length + ' of 9 rewrites were different');

  await tap('tone', 'short');
  var dShort = await p.inputValue('#out');
  await tap('tone', 'warm');
  var dWarm = await p.inputValue('#out');
  ok(dShort.length < dWarm.length, 'short tone is shorter (' + dShort.length + ' vs ' + dWarm.length + ' chars)');
  await tap('tone', 'excited');
  ok(/!/.test(await p.inputValue('#out')), 'excited tone has an exclamation point');

  await tap('p', 'i');
  var dI = await p.inputValue('#out');
  var dIown = dI.replace(/Keller Williams/g, '').replace(/We had a low appraisal and Caleb got it sorted in two days\./, '');
  ok(!/\b(we|our|us)\b/i.test(dIown) && /\b(I|my|me)\b/.test(dI), '"Just me" switches the review to I and my (client\'s own typed words left as typed)' + (/\b(we|our|us)\b/i.test(dIown) ? ': ' + dI : ''));
  await tap('p', 'we');

  // client edits a word, then the page must not overwrite it
  await p.fill('#out', (await p.inputValue('#out')) + ' Go Tigers.');
  await tap('v', 'comm');
  ok(/Go Tigers\.$/.test(await p.inputValue('#out')), 'hand edits are kept when taps change');

  // copy + open Google
  var text = await p.inputValue('#out');
  var popup = ctx.waitForEvent('page');
  await p.click('#g');
  var g = await popup;
  ok(/g\.page|google\.com/.test(g.url()) && /review/.test(g.url()), 'Google button opens the Google review link (g.page redirects to Maps): ' + g.url());
  var clip = await p.evaluate(function () { return navigator.clipboard.readText(); });
  ok(clip === text, 'clipboard holds the exact review text (' + text.length + ' chars)');
  ok(/Copied/.test(await p.textContent('#st')), 'status says Copied');
  await g.close();
  var popup2 = ctx.waitForEvent('page');
  await p.click('#z');
  var z = await popup2;
  ok((z.url() + '').indexOf('zillow.com') >= 0, 'Zillow button opens the Zillow link: ' + z.url());
  await z.close();
  await p.screenshot({ path: path.join(shots, 'review-2-copied.png'), fullPage: true });

  // bare link with nothing tapped still writes something sane
  await p.goto(base, { waitUntil: 'networkidle' });
  var d0 = await p.inputValue('#out');
  ok(d0.length > 30 && !/\{/.test(d0), 'empty page still writes a starter review');
  ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));

  await b.close(); if (server) server.close();
  console.log(fails ? '\n' + fails + ' FAILURES' : '\nALL CHECKS PASSED');
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
