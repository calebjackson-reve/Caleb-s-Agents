// Checks the review writer: no leftover tokens, every tapped option shows up,
// and the same taps produce many different reviews. Run: node website-rebuild/tests/review-writer.test.js
var W = require('../site/review/writer.js');
var fails = 0;
function ok(c, msg) { if (!c) { fails++; console.log('FAIL ' + msg); } }

var base = { type: 'buy', area: 'Zachary', first: 'yes', persp: 'we', vals: ['comm', 'neg', 'local', 'honest', 'fast', 'family'], story: 'we had a low appraisal and caleb got it sorted', friend: 'he treated us like family', recs: ['first-time buyers', 'families'], stars: 5 };

var seen = {};
var N = 300;
for (var i = 0; i < N; i++) {
  var t = W.build(base, 'seed' + i);
  seen[t] = 1;
  ok(!/\{[a-zA-Z']+\}/.test(t), 'token left in: ' + t);
  ok(!/\s\s|\.\.|,\.| ,/.test(t), 'spacing/punct: ' + t);
  ok(/Caleb Jackson/.test(t) && /Keller Williams First Choice/.test(t), 'name/brokerage missing: ' + t);
  ok(/Zachary/.test(t), 'area missing: ' + t);
  ok(/low appraisal/.test(t) && /treated us like family/.test(t), 'free text missing: ' + t);
  ok(!/—|;/.test(t), 'em dash or semicolon: ' + t);
  ok(/^[A-Z0-9]/.test(t), 'does not start with a capital: ' + t);
  ok(/[.!?]$/.test(t), 'does not end with punctuation: ' + t);
  ok(!/\bI\b/.test(t.replace(/\bI\b(?=')/g,'')) || false, 'we perspective leaked an I: ' + t);
}
var unique = Object.keys(seen).length;
console.log('unique reviews from the same taps: ' + unique + ' of ' + N);
ok(unique >= N * 0.97, 'not enough variety');

// determinism
ok(W.build(base, 'x') === W.build(base, 'x'), 'same seed should give same text');

// I perspective, every tone, every option, low stars
['warm', 'plain', 'excited', 'short'].forEach(function (tone) {
  var t = W.build({ type: 'sell', area: '', persp: 'i', tone: tone, vals: W.ORDER, recs: [], stars: 5 }, tone);
  ok(!/\b(we|our|us)\b/i.test(t.replace(/Keller Williams/g, '')), tone + ' I-perspective leaked we/our/us: ' + t);
  ok(!/\{/.test(t), tone + ' token: ' + t);
  if (tone === 'excited') ok(/!/.test(t), 'excited has no exclamation: ' + t);
  if (tone === 'short') ok(t.length < W.build({ type: 'sell', persp: 'i', tone: 'warm', vals: W.ORDER, stars: 5 }, 'w').length, 'short is not shorter');
});
var low = W.build({ type: 'both', persp: 'we', vals: ['comm'], stars: 2, tone: 'excited' }, 'lo');
ok(!/recommend|!/i.test(low), 'low stars should not recommend or shout: ' + low);
var empty = W.build({}, 'e');
ok(empty.length > 20 && !/\{/.test(empty), 'empty input should still write something: ' + empty);

console.log('\nSamples (same taps, different seeds):\n');
for (var s = 0; s < 6; s++) console.log((s + 1) + '. ' + W.build(base, 'sample' + s) + '\n');
console.log('I, short, sold:\n' + W.build({ type: 'sell', area: 'Baton Rouge', persp: 'i', tone: 'short', vals: ['price', 'soldfast', 'photos'], recs: ['anyone selling'], stars: 5 }, 'is') + '\n');
console.log('I, excited, buy, bidding war:\n' + W.build({ type: 'buy', area: 'Denham Springs', persp: 'i', tone: 'excited', vals: ['offers', 'fastreply', 'guide', 'financing'], recs: ['first-time buyers'], stars: 5 }, 'ie') + '\n');
console.log('3 stars:\n' + low + '\n');
console.log(fails ? fails + ' FAILURES' : 'ALL CHECKS PASSED');
process.exit(fails ? 1 : 0);
