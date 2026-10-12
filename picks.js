// Public editorial picks only. Private MLS exports never belong in this file or payload.
(function () {
  var section = document.getElementById('caleb-picks');
  if (!section) return;
  fetch('data/caleb-picks.json').then(function (r) {
    if (!r.ok) throw new Error('Picks unavailable');
    return r.json();
  }).then(function (data) {
    var now = Date.now(), seen = Object.create(null);
    var picks = (Array.isArray(data.picks) ? data.picks : []).filter(function (p) {
      if (!p || typeof p !== 'object') return false;
      var checked = Date.parse(p.checkedAt), expiry = Date.parse(p.expiresAt);
      var url;
      try { url = new URL(p.url); } catch (_) { return false; }
      var valid = p.approved === true && typeof p.mls === 'string' && !seen[p.mls] &&
        typeof p.title === 'string' && p.title.length <= 140 &&
        typeof p.reason === 'string' && p.reason.length <= 500 &&
        p.source === 'authorized-public-listing' && url.protocol === 'https:' &&
        ['calebjackson.org', 'home.calebjackson.org'].indexOf(url.hostname) >= 0 &&
        checked <= now && now - checked <= 12 * 60 * 60 * 1000 && expiry > now &&
        expiry <= checked + 12 * 60 * 60 * 1000;
      if (valid) seen[p.mls] = true;
      return valid;
    }).slice(0, 3);
    if (!picks.length) return;
    var list = document.getElementById('picks-list');
    picks.forEach(function (p) {
      var li = document.createElement('li'), title = document.createElement('h3');
      var reason = document.createElement('p'), link = document.createElement('a');
      var checked = document.createElement('p');
      title.textContent = p.title; reason.textContent = p.reason;
      link.href = p.url; link.textContent = 'See the listing'; link.className = 'btn btn-dark';
      checked.className = 'note'; checked.textContent = 'Checked ' +
        new Date(p.checkedAt).toLocaleString('en-US') + ' · MLS ' + p.mls;
      li.append(title, reason, checked, link); list.appendChild(li);
    });
    section.hidden = false;
  }).catch(function () { /* The rest of the site remains usable without picks. */ });
})();
