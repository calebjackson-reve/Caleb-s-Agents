// Review writer for home.calebjackson.org/review.
// Turns the client's taps into a review in their words, with a different tone
// and wording every time. Pure function, no DOM, so tests/review-writer.test.js
// can run it in Node. Nothing here is saved or sent anywhere.
(function (root) {
  'use strict';

  // ---------- what Caleb helped with ----------
  // Each option has several phrasings. {we} {our} {us} switch between "we" and
  // "I" depending on who was moving. Phrases are written without a period.
  var VALUES = {
    comm: { label: 'Kept me updated', phr: [
      'He kept {us} updated the whole way through',
      '{We} always knew exactly where things stood',
      'He checked in at every step without {us} having to ask',
      '{We} never once had to chase him for an update',
      'Communication was great from start to finish',
      'He kept {us} in the loop on everything, even the small stuff'
    ] },
    fastreply: { label: 'Answered fast, even after hours', phr: [
      'He answered calls and texts fast, even at night and on weekends',
      'Any time {we} had a question he got back to {us} quickly',
      'He was always reachable, even after hours',
      '{We} texted him late more than once and he always answered',
      'He actually picks up the phone, which is rarer than it should be',
      'Quick to respond, every single time'
    ] },
    listen: { label: 'Listened to what I wanted', phr: [
      'He actually listened to what {we} wanted',
      'He took the time to understand what mattered to {us}',
      'He never tried to steer {us} toward something {we} did not want',
      'It felt like he really heard {us}',
      'He paid attention to the little things {we} said {we} cared about'
    ] },
    patient: { label: 'Patient, never rushed me', phr: [
      'He was patient and never rushed {us}',
      '{We} changed {our} mind more than once and he rolled with it',
      'He gave {us} room to think and never pressured {us}',
      'Not once did {we} feel pushed to decide before {we} {were} ready',
      'Zero pressure, which {we} really appreciated'
    ] },
    neg: { label: 'Negotiated a great deal', phr: [
      'He negotiated hard for {us} and it paid off',
      'His negotiating saved {us} real money',
      'He fought for the best terms and got them',
      '{We} ended up with a better deal than {we} expected because of him',
      'He knew exactly when to push and when to hold',
      'He is a strong negotiator and it showed'
    ] },
    offers: { label: 'Helped me win in a bidding war', phr: [
      'He helped {us} win the house in a multiple offer situation',
      '{We} were up against other offers and his strategy got {ours} accepted',
      'He put {our} offer together in a way that stood out',
      'When it came down to competing offers, he knew exactly what to do',
      '{We} got the house even though {we} {were} not the highest offer, and that was all him'
    ] },
    local: { label: 'Knows the area', phr: [
      'He really knows the area and the neighborhoods',
      'His local knowledge made a big difference',
      'He knew every neighborhood {we} asked about',
      'He knows this area inside and out',
      'He had answers about schools, commutes and neighborhoods before {we} even asked',
      'You can tell he grew up around here'
    ] },
    market: { label: 'Knows the market and numbers', phr: [
      'He knows the market and backed everything up with real numbers',
      'He walked {us} through the comps so the price made sense',
      'He understands what homes are actually selling for around here',
      'His read on the market was spot on',
      'He showed {us} the data instead of just giving an opinion'
    ] },
    guide: { label: 'Explained every step', phr: [
      'He explained every step so {we} never felt lost',
      'He walked {us} through the whole process in plain language',
      'Every question got a clear, patient answer',
      'He broke it all down so it was easy to follow',
      'Nothing was confusing because he explained it before {we} had to ask',
      '{We} had a lot of questions and he answered every one'
    ] },
    honest: { label: 'Honest advice', phr: [
      'He gave {us} honest advice, even when it was not what {we} wanted to hear',
      '{We} trusted him because he was straight with {us}',
      'He never pushed {us}, he just told {us} the truth',
      'He told {us} when to walk away from a house, and he was right',
      'He is honest, and that is not something you can say about everyone in this business',
      'No sales pitch, just straight answers'
    ] },
    budget: { label: 'Respected my budget', phr: [
      'He respected {our} budget and never pushed {us} past it',
      'He kept {us} focused on homes {we} could actually afford',
      'He took {our} budget seriously from day one',
      'He never once tried to talk {us} into spending more',
      'He worked with what {we} had and made it work'
    ] },
    find: { label: 'Found the right house', phr: [
      'He found {us} a house that checked every box',
      'He helped {us} find the right home, not just any home',
      'He knew what {we} wanted and found it',
      '{We} love the house, and {we} would not have found it without him',
      'He found {us} a home {we} did not even know {we} {were} looking for'
    ] },
    showings: { label: 'Showed me as many homes as I needed', phr: [
      'He showed {us} as many houses as it took',
      'He never made {us} feel like {we} {were} wasting his time looking at homes',
      '{We} looked at a lot of houses and he was happy to keep going',
      'He fit showings around {our} schedule, including evenings and weekends',
      'He drove {us} all over and never complained'
    ] },
    newbuild: { label: 'Helped with new construction', phr: [
      'He guided {us} through building a new construction home',
      'He knew the builders and what to watch for with new construction',
      'He dealt with the builder on {our} behalf and caught things {we} would have missed',
      'Building a house is a lot, and he kept it on track'
    ] },
    price: { label: 'Priced and marketed it well', phr: [
      'His pricing and marketing plan got {our} home real attention',
      'He priced {our} home right and the showings came fast',
      'His marketing made {our} home stand out',
      'He had a clear plan for pricing and it worked',
      'He knew exactly where to price it'
    ] },
    photos: { label: 'Photos and listing looked great', phr: [
      'The photos and listing looked amazing',
      'He made {our} home look incredible online',
      'The listing photos and video were better than anything else on the market',
      '{We} barely recognized {our} own house in the photos, in the best way'
    ] },
    staging: { label: 'Got my home ready to sell', phr: [
      'He helped {us} get the house ready to sell',
      'His prep and staging advice made {our} home show beautifully',
      'He told {us} exactly what to fix before listing and it paid off',
      'He knew which projects were worth doing before {we} listed and which to skip'
    ] },
    soldfast: { label: 'Sold fast or with multiple offers', phr: [
      '{Our} home sold faster than {we} expected',
      '{We} had multiple offers within days',
      'He got {our} home under contract quickly',
      'It sold fast and for more than {we} thought it would',
      'Listed and under contract before {we} could catch {our} breath'
    ] },
    inspect: { label: 'Handled inspection and repairs', phr: [
      'He handled the inspection and repair negotiations for {us}',
      'When the inspection turned up issues he took care of it',
      'He got {us} through inspections and repairs without the stress',
      'He knew which repair requests were worth fighting for',
      'The inspection could have been a headache and he made it a non-issue'
    ] },
    vendors: { label: 'Great lender and vendor contacts', phr: [
      'He connected {us} with a great lender and inspector',
      'His network of lenders and contractors was a huge help',
      'Every person he referred {us} to was excellent',
      'He had a good person to call for every single thing {we} needed'
    ] },
    financing: { label: 'Helped with financing', phr: [
      'He helped {us} figure out financing and what {we} could qualify for',
      'He got {us} connected with a lender who made the loan easy',
      'He knew about loan programs {we} had never heard of',
      '{We} did not think {we} could get approved and he helped {us} find a way'
    ] },
    paper: { label: 'Took care of the paperwork', phr: [
      'He took care of the paperwork and deadlines',
      '{We} never had to worry about missing a deadline',
      'He kept all the paperwork organized and on time',
      'Every document was ready when it needed to be',
      'He made the paperwork painless'
    ] },
    fast: { label: 'Fast, smooth closing', phr: [
      'Everything moved fast and closing day was smooth',
      '{We} closed on time with no surprises',
      'Closing was quick and easy',
      'Closing day went exactly how he said it would',
      'Smoothest closing {we} have ever had'
    ] },
    calm: { label: 'Made it less stressful', phr: [
      'He made a stressful process feel calm',
      'He kept {us} calm when things got stressful',
      'He took so much stress off {our} plate',
      'The whole thing was a lot less stressful because of him',
      'Any time {we} started to panic he talked {us} through it'
    ] },
    saved: { label: 'Saved the deal when it almost fell apart', phr: [
      'When the deal almost fell apart, he found a way to save it',
      '{We} hit a problem that could have killed the deal and he fixed it',
      'He stayed calm when things went sideways and got {us} to closing',
      'There was a point where {we} thought it was over, and he got it done'
    ] },
    relo: { label: 'Helped me relocate', phr: [
      'He made relocating to a new area easy',
      'Moving here from out of town was simple with his help',
      'He helped {us} get settled in a brand new area',
      '{We} did most of this from another state and he handled everything on the ground'
    ] },
    remote: { label: 'Handled things while I was away', phr: [
      'He handled things while {we} {were} out of town',
      '{We} could not be there for everything and he covered it',
      'He did video walkthroughs so {we} could see homes from a distance',
      'He was {our} eyes and ears when {we} could not be there'
    ] },
    schedule: { label: 'Worked around my schedule', phr: [
      'He worked around {our} schedule',
      'He made time for {us} whenever {we} could get away',
      '{Our} schedule was tough and he never made it a problem',
      'He met {us} early, late, whenever worked for {us}'
    ] },
    family: { label: 'Treated me like family', phr: [
      'He treated {us} like family',
      'It never felt like {we} {were} just another transaction to him',
      'He genuinely cared about {us}, not just the sale',
      'You can tell he actually cares about the people he works with',
      '{We} felt like his only clients, even though {we} know {we} {were} not'
    ] },
    after: { label: 'Still checked in after closing', phr: [
      'He still checked in after closing to make sure {we} {were} settled',
      'Even after {we} closed he was there with answers',
      'He did not disappear once the deal was done',
      'He has stayed in touch since closing, which says a lot'
    ] },
    invest: { label: 'Helped with an investment property', phr: [
      'He helped {us} find an investment property that made sense on paper',
      'He ran the numbers on rentals with {us} and kept {us} realistic',
      'He understands investment properties, not just primary homes',
      'He knew what to look for in a rental and what to avoid'
    ] }
  };

  // chips are shown in these groups. "buy" groups hide for sellers, "sell" groups hide for buyers
  var GROUPS = [
    { title: 'How he communicated', keys: ['comm', 'fastreply', 'listen', 'patient', 'guide', 'honest'] },
    { title: 'What he knew', keys: ['local', 'market', 'neg', 'budget'] },
    { title: 'Buying', only: 'buy', keys: ['find', 'showings', 'offers', 'newbuild', 'financing'] },
    { title: 'Selling', only: 'sell', keys: ['price', 'photos', 'staging', 'soldfast'] },
    { title: 'Getting to closing', keys: ['vendors', 'inspect', 'paper', 'fast', 'calm', 'saved'] },
    { title: 'The extra mile', keys: ['relo', 'remote', 'schedule', 'family', 'after', 'invest'] }
  ];
  var ORDER = ['comm','fastreply','listen','patient','guide','honest','local','market','neg','offers','budget','find','showings','newbuild','financing','vendors','inspect','paper','fast','calm','saved','price','photos','staging','soldfast','relo','remote','schedule','family','after','invest'];

  var RECS = [
    ['first-time buyers', 'First-time buyers'],
    ['families', 'Families'],
    ['anyone selling', 'Sellers'],
    ['people moving to the area', 'People relocating'],
    ['investors', 'Investors'],
    ['military families', 'Military families'],
    ['anyone building new', 'New construction buyers'],
    ['anyone downsizing', 'Downsizers'],
    ['my own friends and family', 'My friends and family']
  ];

  // ---------- tones ----------
  var TONES = ['warm', 'plain', 'excited', 'short'];
  var TONE_LABELS = { warm: 'Warm', plain: 'Straight to the point', excited: 'Excited', short: 'Short and sweet' };

  var R_NAMES = [
    'Caleb Jackson with Keller Williams First Choice',
    'Caleb Jackson at Keller Williams First Choice',
    'Caleb Jackson (Keller Williams First Choice)'
  ];

  // what happened, past tense and "to ..." form
  function actions(type, first) {
    if (type === 'sell') return {
      past: ['sold {our} home{in}', 'sold {our} house{in}', 'got {our} home{in} sold'],
      inf: ['sell {our} home{in}', 'sell {our} house{in}', 'list and sell {our} home{in}']
    };
    if (type === 'both') return {
      past: ['sold {our} home and bought {our} next one{in}', 'sold and bought at the same time{in}', 'made {our} move{in}'],
      inf: ['sell {our} home and buy the next one{in}', 'sell and buy at the same time{in}', 'make {our} move{in}']
    };
    if (type === 'buy' && first === 'yes') return {
      past: ['bought {our} first home{in}', 'bought {our} very first house{in}', 'bought {our} first place{in}'],
      inf: ['buy {our} first home{in}', 'buy {our} very first house{in}', 'find {our} first home{in}']
    };
    if (type === 'buy') return {
      past: ['bought {our} home{in}', 'found and bought {our} house{in}', 'bought a house{in}'],
      inf: ['buy {our} home{in}', 'find a house{in}', 'buy {our} new house{in}']
    };
    return {
      past: ['made {our} move{in}', 'worked with him{in}'],
      inf: ['make {our} move{in}', 'help with {our} move{in}']
    };
  }

  var OPENINGS = {
    warm: [
      '{R} helped {us} {inf}, and {we} could not have asked for a better experience.',
      '{We} just {past} with {R}, and {we\'re} so glad {we} did.',
      '{We} cannot say enough good things about {R}. He helped {us} {inf}.',
      'From {our} first call to closing day, {R} took care of {us} while {we} {past}.',
      '{We} {past} with {R} and he made the whole thing feel easy.'
    ],
    plain: [
      '{We} {past} with {R}.',
      '{R} helped {us} {inf}.',
      '{We} used {R} to {inf}.',
      '{We} worked with {R} when {we} {past}.',
      '{We} recently {past} and {R} was {our} agent.'
    ],
    excited: [
      'If you need a realtor{in}, call {R}. He helped {us} {inf} and he was amazing!',
      '{We} {past} with {R} and he was fantastic!',
      '{We} {past} with {R} and would do it again in a heartbeat.',
      'Best decision {we} made was calling {R} to help {us} {inf}.',
      'Caleb Jackson is the real deal. {We} {past} with him at Keller Williams First Choice and {we} would do it again tomorrow.'
    ],
    short: [
      '{We} {past} with {R}. Great experience.',
      '{R} helped {us} {inf}. Could not have gone better.',
      '{We} {past} with {R} and it went great.',
      '{R} was {our} agent when {we} {past}. Really glad {we} picked him.'
    ],
    low: [
      '{We} {past} with {R}.',
      '{We} worked with {R} when {we} {past}.'
    ]
  };

  var FIRST_TIME = {
    warm: [
      'As first-time buyers {we} had a lot of questions, and he was patient with every single one.',
      'Buying {our} first home felt like a big deal, and he made it feel doable.',
      '{We} had never done this before and he never once made {us} feel like {we} {were} asking a dumb question.'
    ],
    plain: [
      'This was {our} first time buying and he explained everything.',
      'As a first-time buyer {we} needed a lot of hand-holding, and he was fine with that.'
    ],
    excited: [
      'First home, zero clue what {we} {were} doing, and he made it so easy!',
      'If you are a first-time buyer, he is the one you want in your corner.'
    ],
    short: [
      'Great with first-time buyers.',
      'First home, and he made it simple.'
    ]
  };

  var CLOSERS = {
    warm: [
      '{We} would recommend Caleb to {who} without hesitation.',
      '{We} will be recommending him to {who} for a long time.',
      '{Who} would be lucky to have him on their side.',
      'If you are looking for a realtor{in}, you will be in good hands with Caleb.',
      '{We} would use him again in a heartbeat.'
    ],
    plain: [
      '{We} would recommend Caleb to {who}.',
      'Recommended for {who}.',
      '{We} would work with him again.',
      'Good agent. {We} would send {who} his way.'
    ],
    excited: [
      '{We} would send {who} straight to Caleb!',
      'Highly recommend him to {who}!',
      '10 out of 10, {we} would use him again!',
      'Do yourself a favor and call Caleb!',
      'Five stars is not enough!'
    ],
    short: [
      'Highly recommend.',
      'Would use him again.',
      'Recommend him to {who}.',
      'Call him.'
    ]
  };

  var CONNECTORS = {
    warm: ['On top of that, ', 'And ', 'Honestly, ', 'Also, ', 'Best of all, '],
    plain: ['Also, ', 'And ', 'Plus, '],
    excited: ['Seriously, ', 'Honestly, ', 'And ', 'On top of that, ', 'Oh, and '],
    short: []
  };

  // ---------- helpers ----------
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(s) { var x = hash(s) || 1; return function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; }
  function pick(a, r) { return a[Math.floor(r() * a.length)]; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  // lowercase a sentence start unless it is a name or "I"
  function lc(s) { return /^(I\b|I'|Caleb|Keller|Google|Zillow)/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }
  function sentence(s) { s = (s || '').trim().replace(/\s+/g, ' ').replace(/\bcaleb\b/g, 'Caleb'); if (!s) return ''; s = cap(s); return /[.!?]$/.test(s) ? s : s + '.'; }

  var PERSP = {
    we: { We: 'We', we: 'we', our: 'our', Our: 'Our', us: 'us', ours: 'ours', "we're": "we're", "We're": "We're", "we've": "we've", were: 'were' },
    i: { We: 'I', we: 'I', our: 'my', Our: 'My', us: 'me', ours: 'mine', "we're": "I'm", "We're": "I'm", "we've": "I've", were: 'was' }
  };
  function fill(s, vars) {
    return s.replace(/\{([^}]+)\}/g, function (m, k) { return k in vars ? vars[k] : m; });
  }

  // ---------- the writer ----------
  // input: {type, area, first, persp, tone, vals[], story, friend, recs[], stars}
  // seed: any string. Same input and seed always give the same review.
  function build(input, seed) {
    input = input || {};
    var r = rng(String(seed) + '|' + (input.story || '') + '|' + (input.friend || ''));
    var persp = PERSP[input.persp === 'i' ? 'i' : 'we'];
    var stars = +input.stars || 0;
    var low = stars > 0 && stars <= 3;
    var tone = TONES.indexOf(input.tone) >= 0 ? input.tone : pick(TONES, r);
    if (low) tone = tone === 'excited' ? 'plain' : tone;
    var area = (input.area || '').trim();
    var vars = {};
    for (var k in persp) vars[k] = persp[k];
    vars['in'] = area ? ' in ' + area : '';
    vars.R = pick(R_NAMES, r);
    var act = actions(input.type, input.first);
    vars.past = fill(pick(act.past, r), vars);
    vars.inf = fill(pick(act.inf, r), vars);

    var out = [];
    out.push(fill(pick(low ? OPENINGS.low : OPENINGS[tone], r), vars));

    if (input.type !== 'sell' && input.first === 'yes' && !low && r() < 0.8) {
      out.push(fill(pick(FIRST_TIME[tone], r), vars));
    }

    // the things Caleb helped with, in a random order, with random phrasing
    var keys = shuffle((input.vals || []).filter(function (k) { return VALUES[k]; }), r);
    var phrases = keys.map(function (k) {
      var opts = VALUES[k].phr;
      if (tone === 'short') { // shortest two phrasings only
        opts = opts.slice().sort(function (a, b) { return a.length - b.length; }).slice(0, 2);
      }
      return fill(pick(opts, r), vars);
    });
    var body = [];
    for (var i = 0; i < phrases.length; i++) {
      var p = phrases[i];
      var joinChance = tone === 'short' ? 0.6 : 0.3;
      if (i + 1 < phrases.length && p.length < 75 && phrases[i + 1].length < 75 && /^(He|His|We|I|Our|My|It)\b/.test(phrases[i + 1]) && r() < joinChance) {
        // two thoughts in one sentence
        p = p + (r() < 0.5 ? ', and ' : ' and ') + lc(phrases[i + 1]);
        i++;
      }
      body.push(p);
    }
    // say "Caleb" instead of "he" now and then
    body = body.map(function (p, i) {
      var chance = i === 0 ? 0.6 : 0.15;
      if (r() < chance) p = p.replace(/^He /, 'Caleb ').replace(/^His /, "Caleb's ");
      return p + '.';
    });
    // the odd connector so it does not read like a list
    var conns = CONNECTORS[tone];
    body = body.map(function (p, i) {
      if (i > 0 && conns.length && r() < 0.25) return pick(conns, r) + lc(p);
      return p;
    });

    var story = sentence(input.story), friend = sentence(input.friend);
    if (story && r() < 0.3) out.push(story), story = '';
    out = out.concat(body);
    if (story) out.push(story);
    if (friend) out.push(friend);

    if (!low) {
      var recs = (input.recs || []).filter(Boolean);
      var who = recs.length ? list(recs) : pick(['anyone buying or selling{in}', 'anyone looking for a realtor{in}', 'anyone who needs a realtor{in}'], r);
      vars.who = fill(who, vars);
      vars.Who = cap(vars.who);
      var closer = fill(pick(CLOSERS[tone], r), vars);
      if (closer === 'Five stars is not enough!' && stars !== 5) closer = fill(CLOSERS.excited[1], vars);
      // avoid saying "recommend" twice in a row
      var prev = out[out.length - 1] || '';
      if (/recommend/i.test(prev) && /recommend/i.test(closer)) closer = fill(pick(CLOSERS[tone].filter(function (c) { return !/recommend/i.test(c); }), r), vars);
      out.push(closer);
    }

    // excited tone gets a couple of exclamation points, not every sentence
    if (tone === 'excited') {
      var idx = [];
      for (var j = 1; j < out.length - 1; j++) if (/\.$/.test(out[j])) idx.push(j);
      shuffle(idx, r).slice(0, Math.min(2, idx.length)).forEach(function (j) { out[j] = out[j].replace(/\.$/, '!'); });
    }

    return out.join(' ').replace(/\s+/g, ' ').replace(/ ,/g, ',').replace(/,\./g, '.').replace(/\.\./g, '.').trim();
  }

  var W = { build: build, VALUES: VALUES, ORDER: ORDER, GROUPS: GROUPS, RECS: RECS, TONES: TONES, TONE_LABELS: TONE_LABELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = W;
  else root.REVIEW_WRITER = W;
})(typeof window !== 'undefined' ? window : this);
