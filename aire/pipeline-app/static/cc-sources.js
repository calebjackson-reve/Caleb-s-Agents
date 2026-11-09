/* Bank (read only) and Sources pages, and the problem banner every Command Center page carries. */
(function () {
  const C = window.CC;
  const { m, n, day, card, tile, empty, head, guard, src } = C;
  const NAMES = { deals: 'AIRE Deals sheet', calendar: 'Google Calendar', inbox: 'Gmail inbox', leads: 'Website lead emails',
    commission_mail: 'Commission mail', bank_mail: 'Chase alerts', goals: 'Goals tab', history: 'Scorecard history tab',
    news: 'Google News', market: 'Market data', life: 'Life tabs', workouts: 'Workout tabs' };
  const when = s => (s ? new Date(s).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never');

  // Everything that needs attention, worst first: one list for the header chip, the bell and its window.
  // red: a read failed, is out of date, or part of it failed (the mortgage rate). amber: late, or never read yet.
  const SNAME = Object.assign({}, NAMES);
  C.attention = function () {
    const out = [], d = C.data || {}, f = d.fresh || {}, sy = d.sync || {};
    const add = (level, text) => out.push({ level, text });
    if (sy.error) add('red', 'Google sign-in: ' + (sy.error_text || 'the sync could not sign in'));
    Object.keys(f).forEach(k => {
      const r = f[k], n = SNAME[k] || k;
      if (r.state === 'failed') add('red', `${n}: read failed, ${r.error_text || 'the read did not finish'}`);
      else if (r.state === 'stale') add('red', `${n}: out of date, last read ${when(r.at)}`);
      else if (r.state === 'late') add('amber', `${n}: late, last read ${when(r.at)}, it reads every ${r.pace_min} minutes`);
      else if (r.state === 'missing') add('amber', `${n}: never read on this Mac yet`);
    });
    Object.values(((d.market || {}).parts) || {}).forEach(p => { if (p.state === 'failed' && p.note && !out.some(x => x.text.includes(p.note))) add('red', 'Market: ' + p.note); });
    const crm = C.local('crm'), cmd = C.local('command');
    if (crm.state === 'failed') add('red', 'CRM feed: ' + crm.error);
    else if (crm.state === 'stale' || crm.state === 'late') add(crm.state === 'stale' ? 'red' : 'amber', `CRM feed: rebuilt ${C.ago(crm.age_min)}, it rebuilds every 15 minutes`);
    else if (crm.state === 'missing') add('amber', 'CRM feed: no build time on file');
    const pm = C.local('permits');
    if (pm.state === 'stale' || pm.state === 'late') add(pm.state === 'stale' ? 'red' : 'amber', `Listings and permits: newest pull ${when(pm.at).replace(/,? \d+:\d+ [AP]M$/, '')}, ${Math.round(pm.age_min / 1440)} days old`);
    if (cmd.state === 'failed') add('red', 'KW Command reader: ' + cmd.error);
    else if (cmd.state === 'missing') add('amber', 'KW Command reader: never run on this Mac, so new leads in Command are not checked');
    const skip = new Set(['feed_failed', 'feed_stale', 'no_feed', 'feed_unreadable', 'command_login', 'command_layout']);
    ((typeof S !== 'undefined' && S.data && S.data.problems) || []).forEach(p => { if (!skip.has(p.code)) add(p.level === 'stop' ? 'red' : 'amber', p.text); });
    return out.sort((a, b) => (a.level === 'red' ? 0 : 1) - (b.level === 'red' ? 0 : 1));
  };

  // A banner at the top of every Command Center page when any read is out of date or failed.
  C.banner = function () {
    const d = C.data; if (!d) return '';
    const off = C.offline ? `<div class="cc-banner" role="alert"><b>Can't reach the Mac</b><ul><li>Showing the last copy, from ${esc(when(d.at))}. Buttons that save or send wait until the Mac answers.</li></ul></div>` : '';
    return off + C.bannerData();
  };
  C.bannerData = function () {
    const d = C.data;
    const bad = d.problems || [], sy = d.sync || {};
    if (!bad.length && !sy.error && C.local('crm').state === 'ok') return '';
    const lines = (sy.error ? [`Sync could not sign in: ${esc(sy.error_text || 'Google sign-in did not work')}`] : []).concat(bad.map(p => `${esc(NAMES[p.name] || p.name)}: ${p.state === 'failed' ? 'read failed, ' + esc(p.error_text || 'the read did not finish') + ', showing the last good read' : p.state === 'late' ? `late, last read ${esc(when(p.at))}, it reads every ${p.pace_min} minutes` : 'out of date, last read ' + esc(when(p.at))}`));
    const crm = C.local('crm');
    if (crm.state === 'failed') lines.unshift('CRM feed: ' + esc(crm.error));
    if (['late', 'stale'].includes(crm.state)) lines.unshift(`CRM feed: ${crm.state === 'late' ? 'late' : 'out of date'}, rebuilt ${C.ago(crm.age_min)}, it rebuilds every 15 minutes`);
    const red = bad.some(p => p.state !== 'late') || sy.error || ['failed', 'stale'].includes(crm.state);
    return `<div class="cc-banner ${red ? 'is-red' : 'is-amber'}" role="alert"><b>${bad.some(p => p.state === 'failed') || sy.error || crm.state === 'failed' ? 'Some numbers are not current' : red ? 'Some numbers are out of date' : 'Some numbers are late'}</b><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><button type="button" onclick="go('sources')">Open Sources</button></div>`;
  };

  function bank() {
    const g = guard(); if (g) return g;
    const b = C.data.bank;
    return `<div class="cc-page">${C.banner()}${head('Bank', 'Read only. From Chase alert emails, nothing new to pay for. Nothing here can move money.')}
      <div class="cc-tiles">
        ${tile('Cash', b.cash ? m(b.cash.value) : '—', b.cash ? 'Balance in the alert of ' + when(b.cash.at) : 'No balance alert in 30 days. Turn on Chase\'s daily balance alert to fill this in.', 'bank_mail')}
        ${tile('Last deposit', b.last_deposit ? m(b.last_deposit.value) : '—', b.last_deposit ? when(b.last_deposit.at) : 'None in 30 days', 'bank_mail')}
        ${tile('Chase alerts', n(b.alerts), `${b.deposits} deposit${b.deposits === 1 ? '' : 's'}, last 30 days`, 'bank_mail')}
        ${tile('Deposits, 30 days', m(b.rows.filter(r => r.type === 'Deposit' && r.amount != null).reduce((s, r) => s + r.amount, 0) || (b.deposits ? 0 : null)), b.deposits ? `Total of ${b.deposits} deposit alert${b.deposits === 1 ? '' : 's'}` : 'No deposit alerts in 30 days', 'bank_mail')}
      </div>
      ${card('Alerts', b.rows.length ? `<ul class="cc-list">${b.rows.map(r => `<li class="cc-ev"><span class="cc-chip">${esc(r.type)}</span><span class="cc-what">${C.scrubMoney(r.subject)}<small>${esc(when(r.received))}</small></span><b class="cc-amt">${r.amount == null ? '' : m(r.amount)}</b></li>`).join('')}</ul>` : empty('No Chase alerts in the last 30 days.'), 'bank_mail')}
      <p class="cc-note">The balance is only as current as Chase's last alert email. A live balance would need a paid bank connection, and none is set up.</p></div>`;
  }

  function sources() {
    const g = guard(); if (g) return g;
    const d = C.data, sy = d.sync || {}, f = d.fresh || {};
    const rows = Object.keys(NAMES).map(k => {
      const parts = k === 'market' ? Object.values(((d.market || {}).parts) || {}).filter(p => p.state === 'failed') : [];
      const r0 = f[k] || { state: 'missing' }, r = parts.length && r0.state === 'ok' ? Object.assign({}, r0, { state: 'failed', error: 'part', error_text: 'part of it did not load: ' + parts.map(p => p.note).join('. ') }) : r0, res = (sy.results || {})[k];
      return `<tr class="is-${r.state}"><th scope="row">${esc(NAMES[k])}<small>${esc(r.source || '')}</small></th><td><span class="cc-state s-${r.state}">${{ ok: 'Current', late: 'Late', stale: 'Out of date', failed: 'Failed', missing: 'Not synced yet' }[r.state]}</span></td>
        <td>${esc(when(r.at))}${r.age_min != null ? `<small>${C.ago(r.age_min)}</small>` : ''}</td><td>${r.error ? esc(r.error_text || 'the read did not finish') : res ? (res.ok ? (res.parts ? Object.keys(res.parts).map(k => `${res.parts[k]} ${esc(k)} row${res.parts[k] === 1 ? '' : 's'}`).join(', ') : `${res.rows ?? res.read ?? res.pushed ?? ''} rows`) : esc(res.error_text || 'the read did not finish')) : ''}</td></tr>`;
    }).join('');
    const own = ['crm', 'command', 'drafts', 'permits'].map(k => {
      const r = C.local(k);
      return `<tr class="is-${r.state}"><th scope="row">${esc(r.source)}</th><td><span class="cc-state s-${r.state}">${{ ok: 'Current', late: 'Late', stale: 'Out of date', failed: 'Failed', missing: 'Not read yet' }[r.state]}</span></td>
        <td>${esc(when(r.at))}${r.age_min != null ? `<small>${C.ago(r.age_min)}</small>` : ''}</td><td>${r.error ? esc(r.error) : k === 'crm' ? 'People, tasks, touches, drafts' : k === 'command' ? 'New leads in KW Command' : k === 'permits' ? 'Listings and permits, the map\'s market signals' : 'Texts and emails waiting'}</td></tr>`;
    }).join('');
    const sd = S.data || {};
    return `<div class="cc-page">${C.banner()}${head('Sources', 'Every read that feeds these pages, when it last worked, and what went wrong')}
      ${card('CRM and Command', `<div class="cc-tablewrap"><table class="cc-table"><caption class="sr">The CRM's own reads</caption><thead><tr><th scope="col">Source</th><th scope="col">State</th><th scope="col">Last good read</th><th scope="col">Feeds</th></tr></thead><tbody>${own}</tbody></table></div>
        <p class="cc-note">${C.peopleLine()}</p>
        <p class="cc-note">Sending: ${sd.demo ? 'demo, nothing is written' : sd.sender === 'live' ? 'live, texts through Messages and email through Gmail' : 'dry run, sends are logged and nothing leaves the Mac'}. Claude questions ${(sd.voice || {}).ask ? 'on' : 'off'}. Voice: ${(sd.voice || {}).tts === 'elevenlabs' ? 'ElevenLabs' : "the browser's voice"}.</p>`, [])}
      ${card('Phone alerts', `<p class="cc-note">A new website lead, a contract deadline within 24 hours, or a read that fails. Each comes once. The lock screen never shows a client's name.</p>
        <p class="cc-note" id="cc-push-state">${'PushManager' in window ? (Notification.permission === 'granted' ? 'Alerts are allowed on this device.' : 'Alerts are off on this device.') : 'This browser can\'t take alerts. On the iPhone, add Pipeline to the Home Screen first, then open it from there.'}</p>
        <div class="cc-acts"><button type="button" class="cc-primary" onclick="CC.pushOn()">Turn on alerts on this device</button><button type="button" class="cc-btn" onclick="CC.pushTest()">Send a test alert</button></div>`, [])}
      ${card('Last sync', `<p class="${sy.error ? 'cc-warn' : 'cc-note'}">${sy.at ? 'Last pass ' + esc(when(sy.at)) + (sy.error ? ': ' + esc(sy.error_text || 'Google sign-in did not work') : ', no sign-in problems') : 'The sync has not run on this Mac yet.'}</p>
        <div class="cc-tablewrap"><table class="cc-table"><caption class="sr">Each source and its state</caption><thead><tr><th scope="col">Source</th><th scope="col">State</th><th scope="col">Last good read</th><th scope="col">Detail</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="cc-note">The Mac checks every 5 minutes. Each read has its own pace: inbox and leads 10 minutes, calendar, Life and Workouts 15, Deals sheet 30, Chase alerts 60, news and commission mail 120, market 12 hours. Today's Scorecard row is added after 6 AM Central.</p>`, [])}
      </div>`;
  }

  C.pushOn = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('add Pipeline to the Home Screen and open it from there');
      if (await Notification.requestPermission() !== 'granted') throw new Error('alerts were not allowed');
      const k = await api('/api/push/key'), reg = await navigator.serviceWorker.ready;
      const raw = Uint8Array.from(atob(k.key.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - k.key.length % 4) % 4)), c => c.charCodeAt(0));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw });
      const r = await api('/api/push/subscribe', { subscription: sub.toJSON() });
      if (!r.ok) throw new Error(r.error);
      toast('ok', 'ALERTS ON', 'This device will get Pipeline alerts.'); render();
    } catch (e) { toast('err', 'ALERTS', String(e.message || e)); }
  };
  C.pushTest = async () => { const r = await api('/api/push/test', {}); r.ok ? toast('ok', 'TEST', r.phones ? `Sent to ${r.sent} of ${r.phones} devices.` : 'No device has alerts on yet.') : toast('err', 'TEST', r.error || 'Failed.'); };
  Object.assign(C.views, { bank, sources });
  // Every Command Center page shows the banner first.
  Object.keys(C.views).forEach(k => {
    if (k === 'bank' || k === 'sources') return;
    const fn = C.views[k];
    // Wide pages (the maps) carry an extra class, so match any cc-page opening tag.
    C.views[k] = () => { const h = fn(); return h.replace(/<div class="cc-page( [^"]*)?">/, m => m + C.banner()); };
  });
})();
