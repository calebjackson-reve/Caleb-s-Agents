/* Bank (read only) and Sources pages, and the problem banner every Command Center page carries. */
(function () {
  const C = window.CC;
  const { m, n, day, card, tile, empty, head, guard, src } = C;
  const NAMES = { deals: 'AIRE Deals sheet', calendar: 'Google Calendar', inbox: 'Gmail inbox', leads: 'Website lead emails',
    commission_mail: 'Commission mail', bank_mail: 'Chase alerts', goals: 'Goals tab', history: 'Scorecard history tab' };
  const when = s => (s ? new Date(s).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never');

  // A banner at the top of every Command Center page when any read is out of date or failed.
  C.banner = function () {
    const d = C.data; if (!d) return '';
    const bad = d.problems || [], sy = d.sync || {};
    if (!bad.length && !sy.error) return '';
    const lines = (sy.error ? [`Sync could not sign in: ${esc(sy.error)}`] : []).concat(bad.map(p => `${esc(NAMES[p.name] || p.name)}: ${p.state === 'failed' ? 'read failed, ' + esc(p.error || '') + ', showing the last good read' : 'out of date, last read ' + esc(when(p.at))}`));
    return `<div class="cc-banner" role="alert"><b>${bad.some(p => p.state === 'failed') || sy.error ? 'Some numbers are not current' : 'Some numbers are out of date'}</b><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><button type="button" onclick="go('sources')">Open Sources</button></div>`;
  };

  function bank() {
    const g = guard(); if (g) return g;
    const b = C.data.bank;
    return `<div class="cc-page">${C.banner()}${head('Bank', 'Read only. From Chase alert emails, nothing new to pay for. Nothing here can move money.')}
      <div class="cc-tiles">
        ${tile('Cash', b.cash ? m(b.cash.value) : '—', b.cash ? 'Balance in the alert of ' + when(b.cash.at) : 'No balance alert in 30 days. Turn on Chase\'s daily balance alert to fill this in.', 'bank_mail')}
        ${tile('Last deposit', b.last_deposit ? m(b.last_deposit.value) : '—', b.last_deposit ? when(b.last_deposit.at) : 'None in 30 days', 'bank_mail')}
        ${tile('Chase alerts', n(b.alerts), `${b.deposits} deposits, last 30 days`, 'bank_mail')}
      </div>
      ${card('Alerts', b.rows.length ? `<ul class="cc-list">${b.rows.map(r => `<li class="cc-ev"><span class="cc-chip">${esc(r.type)}</span><span class="cc-what">${esc(r.subject)}<small>${esc(when(r.received))}</small></span><b class="cc-amt">${r.amount == null ? '' : m(r.amount)}</b></li>`).join('')}</ul>` : empty('No Chase alerts in the last 30 days.'), 'bank_mail')}
      <p class="cc-note">The balance is only as current as Chase's last alert email. A live balance would need a paid bank connection, and none is set up.</p></div>`;
  }

  function sources() {
    const g = guard(); if (g) return g;
    const d = C.data, sy = d.sync || {}, f = d.fresh || {};
    const rows = Object.keys(NAMES).map(k => {
      const r = f[k] || { state: 'missing' }, res = (sy.results || {})[k];
      return `<tr class="is-${r.state}"><th scope="row">${esc(NAMES[k])}<small>${esc(r.source || '')}</small></th><td><span class="cc-state s-${r.state}">${{ ok: 'Current', stale: 'Out of date', failed: 'Failed', missing: 'Not synced yet' }[r.state]}</span></td>
        <td>${esc(when(r.at))}${r.age_min != null ? `<small>${r.age_min} min ago</small>` : ''}</td><td>${r.error ? esc(r.error) : res ? (res.ok ? `${res.rows ?? res.read ?? res.pushed ?? ''} rows` : esc(res.error || '')) : ''}</td></tr>`;
    }).join('');
    return `<div class="cc-page">${C.banner()}${head('Sources', 'Every read that feeds these pages, when it last worked, and what went wrong')}
      ${card('Last sync', `<p class="${sy.error ? 'cc-warn' : 'cc-note'}">${sy.at ? 'Last pass ' + esc(when(sy.at)) + (sy.error ? ': ' + esc(sy.error) : ', no sign-in problems') : 'The sync has not run on this Mac yet.'}</p>
        <div class="cc-tablewrap"><table class="cc-table"><caption class="sr">Each source and its state</caption><thead><tr><th scope="col">Source</th><th scope="col">State</th><th scope="col">Last good read</th><th scope="col">Detail</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="cc-note">The sync runs every 5 minutes from the LaunchAgent org.calebjackson.aire.ccsync. Each read has its own pace: inbox and leads 10 minutes, calendar 15, Deals sheet 30, Chase alerts 60, commission mail 120. Today's Scorecard row is added after 6 AM Central. Log: ~/.aire/logs/ccsync.log.</p>`, [])}
      </div>`;
  }

  Object.assign(C.views, { bank, sources });
  // Every Command Center page shows the banner first.
  Object.keys(C.views).forEach(k => {
    if (k === 'bank' || k === 'sources') return;
    const fn = C.views[k];
    C.views[k] = () => { const h = fn(); return h.replace('<div class="cc-page">', '<div class="cc-page">' + C.banner()); };
  });
})();
