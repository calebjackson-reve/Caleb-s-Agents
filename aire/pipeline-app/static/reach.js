/* Who to reach first, on Home: New leads at the very top with a live timer, then Call these 10 today.
   Both lists are worked out on the Mac (insight.py) from the lead emails, the CRM feed and the send log. Every button
   opens the message box or the Grok panel that already exists, so nothing sends or dials from here on its own. */
(function () {
  const C = window.CC, R = window.Reach = { LATE: 300, SHOW: 5 };
  R.leads = () => (C.data && C.data.speed) || [];
  R.rows = () => ((S.data && S.data.call10) || {}).rows || [];
  const first = n => firstName(n) || 'them';
  // 4:12 under an hour, then 3h 05m, then 2d 4h. Seconds only while they still matter.
  R.clock = s => (s < 3600 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : s < 86400 ? `${Math.floor(s / 3600)}h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m` : `${Math.floor(s / 86400)}d ${Math.floor(s % 86400 / 3600)}h`);
  R.age = (rec, now) => Math.max(0, Math.floor(((now || Date.now()) - new Date(rec)) / 1000));
  // A lead with a clock time gets a running timer, red past five minutes. A lead with only a day gets no timer:
  // red when the day is before today (it is certainly late), plain when it is today (how late is unknown).
  R.timer = function (l, now) {
    if (l.timed) { const s = R.age(l.received, now); return `<time class="sl-timer${s >= R.LATE ? ' late' : ''}" data-since="${esc(l.received)}" aria-label="Time since the lead came in">${R.clock(s)}</time>`; }
    const d = String(l.received || '').slice(0, 10);
    if (!d) return '<span class="sl-timer none">time unknown</span>';
    return d < todayISO() ? `<span class="sl-timer late">since ${esc(C.day(d))}</span>` : '<span class="sl-timer none">today, time unknown</span>';
  };
  R.tick = function () {
    document.querySelectorAll('.sl-timer[data-since]').forEach(el => { const s = R.age(el.dataset.since); el.textContent = R.clock(s); el.classList.toggle('late', s >= R.LATE); });
  };
  setInterval(R.tick, 1000);

  // One tap: the message box opens with the first reply already written. Send is still Caleb's press.
  R.reply = function (i) {
    const l = R.leads()[i]; if (!l || !l.draft.kind) return;
    const d = l.draft, row = { display: l.name, name: l.name, phone: l.phone, email: l.email };
    if (l.in_crm) { openCompose(l.person_id); if (!S.compose) return; Object.assign(S.compose, { kind: d.kind, to: d.to, body: S.compose.body || d.body, subject: S.compose.subject || d.subject, fromCard: true }); }
    else { S.compose = { kind: d.kind, person_id: '', name: l.name, to: d.to, body: d.body, subject: d.subject, row, last_messages: [], fromCard: true }; S.queueIdx = -1; S.card = null; }
    renderDrawer();
  };
  R.add = i => { const l = R.leads()[i]; if (l) C.addLead(null, { name: l.name, phone: l.phone, email: l.email, source: l.source, note: l.asked }); };

  function leadRow(l, i) {
    const d = l.draft, way = d.kind === 'text' ? 'Text' : d.kind === 'email' ? 'Email' : '';
    const name = l.in_crm ? `<button type="button" class="sl-name" onclick="Stage.open(${jsa(l.person_id)})"><b>${C.pname(l.name)}</b></button>` : `<b class="sl-name">${C.pname(l.name)}</b>`;
    return `<li class="sl-row"><div class="sl-who">${name}<small>${esc(l.source || 'Source unknown')}</small></div>
      <div class="sl-ask"><span>${l.asked ? (l.own_words ? '“' + esc(l.asked) + '”' : esc(l.asked)) : '<em>What they asked: unknown. The form carried no message.</em>'}</span>
        <small>${way ? `${way} ready: ${esc(d.body.split('\n')[0])}` : esc(d.blocked)}</small></div>
      ${R.timer(l)}
      <span class="row-acts">${way ? `<button type="button" class="sl-go" onclick="Reach.reply(${i})">${way} ${esc(first(l.name))}</button>` : ''}${l.in_crm || !(l.phone || l.email) ? '' : `<button type="button" class="ra" onclick="Reach.add(${i})">Add to CRM</button>`}</span></li>`;
  }
  R.leadsHTML = function () {
    const all = R.leads(), shown = all.slice(0, R.SHOW), late = all.filter(l => (l.timed ? R.age(l.received) >= R.LATE : String(l.received || '').slice(0, 10) < todayISO())).length;
    const body = !C.data ? `<p class="lt-quiet">${C.err ? 'The lead read did not load: ' + esc(C.err) + '.' : 'Reading the leads.'}</p>`
      : !all.length ? '<p class="lt-quiet">No new lead is waiting on a first reply.</p>'
      : `<ul class="sl-list">${shown.map(leadRow).join('')}</ul>${all.length > shown.length ? `<p class="lt-quiet">${all.length - shown.length} more waiting. <button type="button" class="lt-link" onclick="go('ccleads')">See every lead</button></p>` : ''}`;
    return `<section class="sl-card${late ? ' has-late' : ''}" aria-label="New leads"><div class="lt-row"><h2>New leads${all.length ? ` <span class="sl-n">${all.length}</span>` : ''}</h2>
        <button type="button" class="lt-link" onclick="go('ccleads')">All leads</button></div>${body}
      <p class="cc-srcline lt-src">${C.src(['leads', 'crm'])}</p></section>`;
  };

  // One person's fuller record for the contact card: a read from the Mac, asked fresh each time the card opens.
  // The card (person.js) draws it. Nothing is written and nothing is sent.
  R.cards = {};
  R.card = async function (id) {
    const k = String(id); delete R.cards[k];
    try { R.cards[k] = await api('/api/card?id=' + encodeURIComponent(k)); } catch (e) { R.cards[k] = { ok: false }; }
    if (window.Person) Person.refresh();
  };

  R.callHTML = function () {
    const rows = R.rows(), c = (S.data && S.data.call10) || {}, out = Object.values(c.left_out || {}).reduce((a, b) => a + b, 0);
    const li = (r, i) => `<li><span class="c10-n">${i + 1}</span><button type="button" class="c10-who" onclick="Stage.open(${jsa(r.person_id)})"><b>${C.pname(r.display)}</b><small>${esc(r.reason)}</small></button>
      <span class="row-acts"><button type="button" class="ra" onclick="openCompose(${jsa(r.person_id)})">Text</button><button type="button" class="ra" onclick="openGrok(${jsa(r.person_id)}, 'call')">Call</button>${Fix.fbHTML('call10', r.person_id)}</span></li>`;
    return `<section class="c10" aria-label="Call these 10 today"><div class="lt-row"><h2>Call these ${rows.length === 10 ? '10' : rows.length || '10'} today</h2>
        <button type="button" class="lt-link" onclick="go('sources')">How this is ranked</button></div>
      ${rows.length ? `<ol class="c10-list">${rows.map(li).join('')}</ol>` : '<p class="lt-quiet">Nobody with a valid phone is due right now.</p>'}
      <p class="lt-quiet">Money and intent first, then cadence. ${c.considered ? `${Number(c.considered).toLocaleString()} people looked at` : ''}${out ? `, ${out.toLocaleString()} left out (vendors, pitches, Do Not Contact, no phone, already reached today)` : ''}.</p>
      <p class="cc-srcline lt-src">${C.src('crm')}</p></section>`;
  };
})();
