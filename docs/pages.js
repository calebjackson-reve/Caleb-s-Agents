// Inner pages: the seller walk-away estimate and the golf community cards built from the researched data.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---- Seller walk-away estimate (the math lives in reference-site/resources-math.js) ----
  var calc = $('#seller-calc');
  if (calc && window.PlanningMath) {
    var fields = ['price', 'payoff', 'fees', 'closing', 'credits', 'repairs', 'moving'];
    function run() {
      var raw = {}; fields.forEach(function (k) { raw[k] = $('#sc-' + k).value; });
      var r = window.PlanningMath.sellerNet(raw), out = $('#sc-out');
      if (r.errors) { var k = Object.keys(r.errors)[0]; out.innerHTML = '<div class="big">—</div><p class="err">' + esc(r.errors[k]) + '</p>'; return; }
      out.innerHTML = '<p class="eyebrow" style="margin:0;color:var(--timber)">Estimated walk-away</p><div class="big">' + money(r.afterMove) + '</div>' +
        r.lines.map(function (l) { return '<div class="row"><span>' + esc(l.label) + '</span><b>−' + money(l.amount) + '</b></div>'; }).join('') +
        '<div class="row"><span>Net at closing</span><b>' + money(r.closingNet) + '</b></div>' +
        '<div class="row"><span>Preparation, repairs, moving</span><b>−' + money(r.v.repairs + r.v.moving) + '</b></div>' +
        '<p class="note">Illustrative only. Your payoff, fees and costs are entered by you, and anything you leave at zero is not in the number. Prorated taxes, HOA transfer fees and title charges vary by parish and closing company.</p>';
      var sms = $('#sc-text'); if (sms) sms.href = 'sms:+12257470303?&body=' + encodeURIComponent('Hi Caleb, I ran a quick number on your site: a sale around ' + money(r.v.price) + ' leaves roughly ' + money(r.afterMove) + ' after costs. I\'d like to talk about what my house would actually bring. ');
    }
    fields.forEach(function (k) { $('#sc-' + k).addEventListener('input', run); });
    run();
  }

  // ---- Golf communities from the researched data ----
  var grid = $('#golf-communities');
  if (grid && window.GOLF_DATA) {
    var tag = function (s) { return s ? '<span class="st st-' + esc(s) + '">' + esc(s) + '</span>' : ''; };
    grid.innerHTML = window.GOLF_DATA.communities.map(function (c) {
      var photo = (c.photos || [])[0];
      var dues = c.hoa && c.hoa.dues ? esc(c.hoa.dues) + tag(c.hoa.duesStatus) : 'Not published' + tag('missing');
      var gated = c.gated && c.gated.value ? esc(c.gated.value) + tag(c.gated.status) : 'Unconfirmed' + tag('missing');
      var frontage = c.golfFrontage && c.golfFrontage.exists ? 'Yes, on some streets' + tag(c.golfFrontage.status) : 'Not established' + tag('missing');
      var access = { withHome: 'HOA membership exists. Ask what dues cover.', club: 'Club is separate from the HOA.', public: 'Public course. No privileges come with the house.' }[c.accessKind] || '';
      return '<li class="card-p"><div class="img">' + (photo ? '<img src="reference-site/' + esc(photo.src) + '" alt="' + esc(photo.alt) + '" loading="lazy">' : '<div class="ph" aria-hidden="true">' + esc(c.name.charAt(0)) + '</div>') + '</div>' +
        '<div class="body"><p class="eyebrow" style="margin:0;color:var(--timber-ink)">' + esc(c.place) + ' · ' + esc(c.course.access) + '</p><h3>' + esc(c.name) + '</h3><p>' + esc(c.tagline || c.summary) + '</p>' +
        '<ul class="kv"><li><b>Course</b><span>' + esc(c.course.name) + (c.course.holes ? ', ' + c.course.holes + ' holes' : '') + '</span></li>' +
        '<li><b>Golf access</b><span>' + esc(access) + '</span></li>' +
        '<li><b>HOA dues</b><span>' + dues + '</span></li>' +
        '<li><b>Gated</b><span>' + gated + '</span></li>' +
        '<li><b>Frontage</b><span>' + frontage + '</span></li></ul>' +
        '<div class="links"><a class="btn btn-dark btn-xs" href="search.html?place=' + encodeURIComponent(c.name) + '&layer=golf,comm,sold&status=forsale,sold">Homes near it</a><a class="btn btn-ghost-dark btn-xs" href="reference-site/community.html?c=' + esc(c.id) + '">Full profile and sources</a></div></div></li>';
    }).join('');
    var note = $('#golf-checked'); if (note) note.textContent = 'Research checked ' + window.GOLF_DATA.checked + '. Every fact carries its source status: official, reported, listing, or missing.';
  }
  var courses = $('#course-count');
  if (courses && window.MAP_DATA) {
    var d = window.MAP_DATA['data/map-places.json'], n = d.courses.length, m = d.courses.filter(function (c) { return c.coordinates; }).length;
    courses.textContent = n + ' courses verified open across South Louisiana, ' + m + ' with a sourced map point. Checked ' + d.checked + '. Not a complete statewide list.';
  }
})();
