/* The CRM pages in the Command Center design: Touches due, Tasks, Deals, Drafts, Sent today, plus the name and note
   formatters and the CRM sources every page can name. People, tasks and drafts come from the CRM feed (feed.json via
   /api/state). Deals come from the AIRE Deals sheet (/api/cc), the one deal source; CRM Deals tab rows are matched to
   it and never add to its numbers. Writes go through app.js (touched, doneTask, openTask, openCompose), so every one
   is a crm.py call with its gates. */
(function () {
  const C = window.CC;

  // ---------------- people and free text. Nothing here hides: names, phones, emails, messages and dollars show as
  // they are. Only the Bank page masks its own figures (cc-sources.js).
  C.who = v => (!v ? '' : esc(v));
  C.ph = v => (!v ? '' : esc(fmtPhone(v)));
  C.em = v => (!v ? '' : esc(v));
  C.ini = v => esc(initials(v));
  C.note = t => esc(String(t || ''));
  C.scrub = C.note;
  // A text message as it should read: no date prefix, no attachment placeholder, a photo said in words.
  C.cleanMsg = t => {
    const s = String(t || '').replace(/^\d{4}-\d{2}-\d{2}: /, '').replace(/[￼�]/g, '').trim();
    return s || 'Sent a photo or attachment';
  };

  // ---------------- the CRM's own sources, named like the synced ones
  const age = at => (at ? Math.max(0, Math.round((Date.now() - new Date(at)) / 60000)) : null);
  C.local = function (k) {
    const d = (typeof S !== "undefined" && S.data) || {}, f = d.feed || {};
    if (k === 'crm') {
      // Rebuilt every 15 minutes: late (amber) past 30, stale (red) past 60, failed (red) when the last rebuild failed or
      // no feed loaded. A failed rebuild keeps the last good feed on screen and says so.
      const run = d.feed_run || null, a = d.feed_age_minutes ?? age(f.generated_at);
      const failed = !d.feed_ok || (run && run.state === 'failed');
      return { source: 'CRM feed, AIRE CRM sheet', at: f.generated_at, age_min: a,
        state: failed ? 'failed' : a == null ? 'missing' : a > 60 ? 'stale' : a > 30 ? 'late' : 'ok',  // no build time: never green
        error: !d.feed_ok ? 'the CRM feed did not load' : failed ? `the rebuild at ${run.at_text} failed (${run.detail}), showing the feed from ${C.ago(a)}` : null };
    }
    if (k === 'command') { const c = d.command || {}; return { source: 'KW Command reader', at: c.at, age_min: age(c.at),
      state: !c.state ? 'missing' : c.state === 'ok' ? 'ok' : 'failed', error: c.state && c.state !== 'ok' ? c.state + (c.detail ? ', ' + c.detail : '') : null }; }
    if (k === 'drafts') { const q = d.text_queue || {}, at = q.generated_at || (d.email_queue || {}).generated_at;
      return { source: 'Draft queue, text and email', at, age_min: age(at), state: at ? 'ok' : 'missing', error: null }; }
    if (k === 'permits') {
      // Listings and permits: named by where the rows came from (EBR permits on data.brla.gov, Flexmls alert mail), as of
      // the newest pull. Late after 2 days, out of date after 7: the pull is not on a schedule yet.
      const rows = ((f.market || {}).rows) || [], names = [...new Set(rows.map(r => String(r.source || '').replace(/\s+[0-9a-z]{4}-[0-9a-z]{4}$/i, '').trim()).filter(Boolean))];
      const at = rows.map(r => String(r.source_date || '')).filter(x => /^\d{4}-\d{2}-\d{2}/.test(x)).sort().pop() || null;
      const days = at ? Math.floor((Date.now() - new Date(at.slice(0, 10) + 'T12:00:00')) / 864e5) : null;
      return { source: names.length ? names.join(' and ') : 'Permits and listing alerts', at: at ? at.slice(0, 10) + 'T12:00:00' : null, age_min: days == null ? null : days * 1440,
        state: !rows.length || days == null ? 'missing' : days > 7 ? 'stale' : days > 2 ? 'late' : 'ok', error: null };
    }
    if (k === 'sends') return { source: "Pipeline's send log", at: new Date().toISOString(), age_min: 0, state: 'ok', error: null };
    return null;
  };
  // Every read that failed, the synced ones and the CRM's own, for the status in the top bar.
  // Reads that worked but are not current: never synced on this Mac, or older than their limit.
  C.notCurrent = function () {
    const f = (C.data && C.data.fresh) || {};
    return Object.keys(f).filter(k => ['missing', 'stale', 'late'].includes(f[k].state)).map(k => f[k].source || k)
      .concat(['late', 'stale'].includes(C.local('crm').state) ? [C.local('crm').source] : []);
  };
  // Reads that are red without having failed: three refreshes missed.
  C.staleReads = function () {
    const f = (C.data && C.data.fresh) || {};
    return Object.keys(f).filter(k => f[k].state === 'stale').map(k => f[k].source || k).concat(C.local('crm').state === 'stale' ? [C.local('crm').source] : []);
  };
  C.failing = function () {
    const out = [];
    const f = (C.data && C.data.fresh) || {};
    Object.keys(f).forEach(k => { if (f[k].state === 'failed') out.push(f[k].source || k); });
    if (C.data && C.data.sync && C.data.sync.error) out.push('Google sign-in');
    ['crm', 'command'].forEach(k => { const r = C.local(k); if (r.state === 'failed') out.push(r.source); });
    return out;
  };

  const feedF = () => ((typeof S !== "undefined" && S.data) && S.data.feed) || {};
  // A CRM page: the same head, banner and card as every Command Center page, with its source under it.
  function page(title, sub, body, sources, tools) {
    const ok = (typeof S !== "undefined" && S.data) && S.data.feed_ok;
    const inner = ok || !sources.includes('crm') ? body : C.empty('The CRM feed did not load, so this list would be a guess. Nothing is shown. Sources has the detail.');
    // The source and as-of time sit once, at the top of the list, so a long list says where it came from before it starts.
    return `<div class="cc-page">${C.head(title, sub)}<section class="cc-card"><p class="cc-srcline">${C.src(sources)}</p>${tools ? `<div class="cc-tools">${tools}</div>` : ''}${inner}</section></div>`;
  }
  // The three people counts, said once in words: contacts in the CRM, those with text history, those placed on the map.
  C.peopleLine = function () {
    const f = feedF(), c = f.counts || {}, sg = f.signals || {}, mc = (f.map || {}).counts || {};
    if (!c.contacts) return '';
    return `${n0(c.contacts)} contacts in the AIRE CRM sheet. ${sg.people ? `${n0(sg.people)} of them have texts with you in Messages (that is the Signals number). ` : ''}${mc.persons ? `${n0(mc.persons)} have an address placed on the map${mc.ungeocoded_contacts ? `, ${n0(mc.ungeocoded_contacts)} more are waiting to be placed` : ''}.` : ''}`;
  };
  const n0 = v => Number(v || 0).toLocaleString();
  C.crmPage = page;
  const seg = (opts, cur, fn) => `<div class="cc-filters" role="group">${opts.map(([k, l, n]) => `<button type="button" class="cc-filter" aria-pressed="${cur === k}" onclick="${fn}('${k}')">${l}${n != null ? ` <b>${n}</b>` : ''}</button>`).join('')}</div>`;
  C.setFilter = k => { S.filter = k; render(); };
  const quietTxt = r => r.days_quiet == null ? 'No touch logged' : r.days_quiet === 0 ? 'Touched today' : `${r.days_quiet} days since the last touch`;

  // ---------------- Touches due
  function touches() {
    const all = (feedF().touches_due || []).filter(r => matches(`${r.display} ${r.phone} ${r.email} ${r.next_action} ${r.stage}`));
    const n = { reply: all.filter(r => r.owes_reply).length, hot: all.filter(r => r.band === 'hot').length, warm: all.filter(r => r.band === 'warm').length };
    const rows = S.filter === 'reply' ? all.filter(r => r.owes_reply) : S.filter === 'hot' || S.filter === 'warm' ? all.filter(r => r.band === S.filter) : all;
    const body = rows.length ? `<ul class="cc-rows">${rows.slice(0, S.touchN || 200).map(touchRow).join('')}</ul>${rows.length > (S.touchN || 200) ? `<p class="cc-note">Showing the first ${S.touchN || 200} of ${rows.length}. <button type="button" class="cc-mini" onclick="S.touchN = (S.touchN || 200) + 200; render()">Show 200 more</button></p>` : ''}`
      : S.q ? C.noMatch() : C.empty('Every touch is logged.');
    return page('Touches due', 'People due a touch from your cadence, replies owed first. Touched logs it in the CRM.', body, ['crm'],
      seg([['all', 'All', all.length], ['reply', 'Owe a reply', n.reply], ['hot', 'Hot', n.hot], ['warm', 'Warm', n.warm]], S.filter, 'CC.setFilter'));
  }
  function touchRow(r) {
    const last = (r.last_messages || []).slice(-1)[0];
    return `<li class="cc-row ${r.owes_reply ? 'is-hot' : ''}"><span class="cc-av" aria-hidden="true">${C.ini(r.display)}</span>
      <div class="cc-row-main"><h3>${C.who(r.display || 'No name')}</h3>
        <div class="cc-pills">${r.band ? `<span class="cc-pill ${band(r.band)}">${esc(r.band)}</span>` : ''}${r.owes_reply ? '<span class="cc-pill k-closing">Owes a reply</span>' : ''}${r.stage ? `<span class="cc-pill k-other">${esc(r.stage)}</span>` : ''}${textStatus(r.person_id)}</div>
        <p class="cc-row-why">${r.next_action ? C.note(r.next_action, [r.display]) : r.owes_reply ? 'They texted last. Answer first.' : 'Time for a touch'}</p>
        <p class="cc-note">${last ? `Last text: “${esc(C.cleanMsg(last))}”` : quietTxt(r)}${r.phone ? ' · ' + C.ph(r.phone) : r.email ? ' · ' + C.em(r.email) : ''}</p></div>
      <div class="cc-acts">${textBtn(r.person_id, r)}<button type="button" class="cc-primary" onclick="touched('${esc(r.person_id)}')">✓ Touched</button><button type="button" onclick="openTask('${esc(r.person_id)}')">＋ Task</button><button type="button" onclick="openNote('${esc(r.person_id)}')">Note</button><button type="button" class="cc-danger" onclick="openDNC('${esc(r.person_id)}')" aria-label="Do Not Contact">Do Not Contact</button></div></li>`;
  }
  const band = b => ({ hot: 'k-hot', warm: 'k-warm', lukewarm: 'k-listing', cold: 'k-cold', 'ice-cold': 'k-cold' }[b] || 'k-other');

  // ---------------- Tasks
  function tasks() {
    const today = todayISO();
    const all = (feedF().tasks || []).filter(t => matches(`${t.task} ${t.display} ${t.source}`));
    const n = { over: all.filter(t => t.overdue).length, today: all.filter(t => t.due === today).length };
    let rows = S.filter === 'over' ? all.filter(t => t.overdue) : S.filter === 'today' ? all.filter(t => t.due === today) : all;
    rows = rows.slice().sort((a, b) => (b.overdue - a.overdue) || (a.due || '9').localeCompare(b.due || '9'));
    const body = rows.length ? `<ul class="cc-rows cc-tasks">${rows.map(t => `<li class="cc-row ${t.overdue ? 'is-hot' : ''}"><span class="cc-av" aria-hidden="true">${t.overdue ? '!' : '☑'}</span>
      <div class="cc-row-main"><h3>${C.note(t.task, [t.display], 'Task hidden')}</h3>
        <div class="cc-pills"><span class="cc-pill ${t.overdue ? 'k-closing' : t.due === today ? 'k-listing' : 'k-other'}">${t.overdue ? 'Overdue · ' : ''}${esc(dayName(t.due) || 'No date')}</span>${t.task_id ? '' : '<span class="cc-pill k-other">From a next action</span>'}</div>
        <p class="cc-note">${t.display ? C.who(t.display) + ' · ' : ''}${t.due ? 'Due ' + esc(C.day(t.due)) : 'No due date'}${t.source ? ' · ' + esc(t.source) : ''}</p></div>
      <div class="cc-acts"><button type="button" class="cc-primary" onclick="doneTask('${esc(t.task_id)}','${esc(t.person_id)}',${JSON.stringify(String(t.task || '')).replace(/"/g, '&quot;')})">✓ Done</button>${t.person_id ? contactBtns(t.person_id) : ''}</div></li>`).join('')}</ul>`
      : S.q ? C.noMatch() : C.empty('No open tasks here.');
    // Where the open tasks come from: rows on the CRM's Tasks tab, and contacts whose Next_Action column has a step.
    const tab = (feedF().tasks || []).filter(t => t.task_id).length, na = (feedF().tasks || []).length - tab;
    const how = na ? `<p class="cc-note cc-how"><b>How the ${n0(na)} from Next_Action are chosen.</b> A contact's Next_Action becomes a task when the contact is hot or warm, is not on Do Not Contact, is not a vendor, agent or lender, and has no open task with the same words. Hot ones are due today, warm ones in 3 days. They are worked out from the CRM each time the feed rebuilds, so the Tasks tab itself does not hold them until you press Done.</p>` : '';
    return page('Tasks', `Open CRM tasks, overdue first. Done marks it done in the CRM. ${n0(tab + na)} open: ${n0(tab)} on the Tasks tab and ${n0(na)} from the Next_Action column on contacts.${na && !tab ? ' That is why the Tasks tab itself shows none open. Done on one of these moves it to the Tasks tab and closes it there.' : ''}`, how + body, ['crm'],
      seg([['all', 'All', all.length], ['over', 'Overdue', n.over], ['today', 'Due today', n.today]], S.filter, 'CC.setFilter') +
      '<div class="cc-acts"><button type="button" class="cc-primary" onclick="openTask()">＋ New task</button></div>');
  }

  // ---------------- Deals: the AIRE Deals sheet, with the CRM Deals tab checked against it
  // An offer's deadline from its note: expired once it passed, open until a day otherwise. Offers never count down to close.
  // Expired is checked against this device's clock too, so a page left open past the deadline still says so.
  C.offerExpired = o => !!o && (o.expired || (o.at && new Date(o.at) < new Date()));
  C.offerPill = r => { const o = r.stage === 'offer' && r.offer; if (!o) return '';
    if (o.superseded) return '<span class="cc-pill st-offer">Countered since, no deadline on the sheet</span>';
    const wd = o.wrong_weekday ? ` <span class="cc-pill k-past">Sheet says ${esc(o.wrong_weekday)}, but ${esc(C.day(o.date))} is the date. Check it</span>` : '';
    return C.offerExpired(o) ? `<span class="cc-pill k-past">Offer expired ${esc(C.day(o.date))}${o.time ? ' ' + esc(o.time) : ''}</span>${wd}` : `<span class="cc-pill st-offer">Offer open until ${esc(C.day(o.date))}${o.time ? ' ' + esc(o.time) : ''}</span>${wd}`; };
  // Every Deals row shows the same buttons. One that cannot work is greyed and says why, on the button itself.
  C.offBtn = (label, why) => `<button type="button" class="cc-off" disabled aria-disabled="true" title="${esc(why)}">${esc(label)}<small>${esc(why)}</small></button>`;
  // From search: open Deals, scroll to that deal and light it for a moment.
  C.showDeal = deal => { go('deals'); setTimeout(() => { const el = document.getElementById('deal-' + C.dealKey(deal).replace(/\s+/g, '-'));
    if (!el) return; const li = el.closest('.cc-row') || el, d = el.closest('details'); if (d) d.open = true;
    li.scrollIntoView({ block: 'center', behavior: 'smooth' }); li.classList.add('is-flash'); setTimeout(() => li.classList.remove('is-flash'), 2400); }, 60); };
  const STAGE = { contract: 'Under contract', offer: 'Offer', appointment: 'Active', closed: 'Closed', out: 'Fell through', other: 'No status' };
  function deals() {
    const g = C.guard(); if (g) return g;
    const all = C.data.deals.filter(r => matches(`${r.deal} ${r.status} ${r.side} ${r.next}`));
    const live = all.filter(r => !['closed', 'out'].includes(r.stage)), past = all.filter(r => ['closed', 'out'].includes(r.stage));
    const only = (C.data.crm_only_deals || []).filter(r => matches(`${r.deal} ${r.stage}`));
    const row = r => `<li class="cc-row st-${esc(r.stage)} ${r.differs.length ? 'is-warn' : ''}">${C.thumb(r.deal)}
      <div class="cc-row-main"><h3>${esc(r.deal)}</h3>
        <div class="cc-pills" id="deal-${esc(C.dealKey(r.deal).replace(/\s+/g, '-'))}"><span class="cc-pill st-${esc(r.stage)}">${esc(r.status)}</span>${r.side ? `<span class="cc-pill k-other">${esc(r.side)}</span>` : ''}${r.to_close != null && r.to_close >= 0 ? `<span class="cc-pill k-listing">${r.to_close === 0 ? 'Closes today' : r.to_close + ' days to close'}</span>` : ''}${C.offerPill(r)}</div>
        <p class="cc-note">Price ${C.m(r.price)} · Your commission, gross ${r.commission == null ? '<em>not on the sheet</em>' : C.m(r.commission)}${r.act ? (r.stage === 'offer' ? ' · Act of sale if accepted ' : ' · Act of sale ') + esc(C.day(r.act)) : ''}${r.crm && r.crm.display ? ' · ' + C.who(r.crm.display) : ''}</p>
        ${r.next ? `<p class="cc-row-why">${C.scrub(r.next)}</p>` : ''}
        ${r.differs.length ? `<p class="cc-warn">The CRM Deals tab says ${r.differs.map(x => `${esc(x.field)} ${x.field === 'price' ? C.m(x.crm) : esc(x.field === 'act of sale' ? C.day(x.crm) : x.crm)}`).join(', ')}. This page shows the Deals sheet.</p>` : ''}</div>
      <div class="cc-acts">${r.crm ? `<button type="button" onclick="openDeal(${esc(JSON.stringify(r.crm.address))})">Edit in the CRM</button>` : C.offBtn('Edit in the CRM', 'Not in the CRM Deals tab')}${r.crm && r.crm.person_id ? `<button type="button" onclick="openCompose('${esc(r.crm.person_id)}')">Message</button>` : C.offBtn('Message', r.crm ? 'No contact linked in the CRM' : 'No CRM contact for this deal')}</div></li>`;
    const body = `<p class="cc-srcline">${C.src('deals')}</p>${live.length ? `<ul class="cc-rows">${live.map(row).join('')}</ul>` : S.q && !past.length ? C.noMatch() : C.empty('No open deals on the Deals sheet.')}
      ${past.length ? `<details class="cc-more"><summary>Closed and fell through <span class="cc-count">${past.length}</span></summary><ul class="cc-rows">${past.map(row).join('')}</ul></details>` : ''}`;
    return `<div class="cc-page">${C.head('Deals', 'One list from the AIRE Deals sheet. Commission, Deadlines and the Dashboard read the same rows.')}
      ${C.card(`Deals sheet <span class="cc-count">${live.length} open</span>`, body, 'deals')}
      ${only.length ? C.card(`Only in the CRM Deals tab <span class="cc-count">${only.length}</span>`, `<p class="cc-note">Not on the Deals sheet, so not in any total. Add them to the sheet if they are real deals.</p><ul class="cc-rows">${only.map(r => `<li class="cc-row"><span class="cc-av" aria-hidden="true">⌂</span><div class="cc-row-main"><h3>${esc(r.deal)}</h3><p class="cc-note">${esc((r.stage || 'no stage').replace('_', ' '))}${r.price ? ' · ' + C.m(r.price) : ''}${r.close ? ' · closes ' + esc(C.day(r.close)) : ''}${r.display ? ' · ' + C.who(r.display) : ''}</p></div><div class="cc-acts"><button type="button" onclick="openDeal(${esc(JSON.stringify(r.deal))})">Edit in the CRM</button></div></li>`).join('')}</ul>`, [], '') .replace('<footer></footer>', `<footer>${C.src('crm')}</footer>`) : ''}
      <div class="cc-acts"><button type="button" onclick="openDeal()">＋ Add a deal to the CRM</button><button type="button" onclick="go('dealmap')">See deals on the map</button></div></div>`;
  }

  // ---------------- Drafts and Sent today
  // Drafts: written texts and emails ready to send, then the replies to write yourself (they texted last, so there is no
  // template). Only the first list counts as drafts ready, on every screen.
  // Who wrote the drafts: Claude from the template, in Caleb's voice, or the template as it is.
  const usd = v => '$' + Number(v || 0).toFixed(2);
  const byClaude = () => { const b = S.data.drafts_by; if (!b || !b.on) return ''; return ' Claude wrote ' + b.written + ' of them from the templates, in your voice (' + usd(b.spent) + ' of ' + usd(b.cap) + ' today).' + (b.note ? ' The rest are templates: ' + esc(b.note) + '.' : ''); };
  function queue() {
    const all = drafts(), caps = S.data.caps;
    const row = d => { const i = all.indexOf(d); return `<li class="cc-row ${d.reply ? 'is-hot' : ''}"><span class="cc-av" aria-hidden="true">${d.kind === 'text' ? '▭' : '✉'}</span>
      <div class="cc-row-main"><h3>${C.who(d.name)}</h3>
        <div class="cc-pills">${d.reply ? '<span class="cc-pill k-closing">Reply to write</span>' : `<span class="cc-pill k-other">${esc(d.kind === 'text' ? 'Text' : 'Email')}${d.pool ? ' · ' + esc(d.pool) : ''}</span>${d.by === 'claude' ? '<span class="cc-pill k-other">Written by Claude</span>' : ''}`}</div>
        <p class="cc-row-why">${d.reply ? 'They texted last. Read what they said and answer in your own words.' : esc(d.subject || d.body.split('\n')[0])}</p>
        <p class="cc-note">${d.reply ? '“' + esc(C.cleanMsg(d.last_messages.slice(-1)[0])) + '”' : esc(d.body.slice(0, 140))}${d.to ? ' · to ' + (d.kind === 'text' ? C.ph(d.to) : C.em(d.to)) : ''}</p></div>
      <div class="cc-acts"><button type="button" class="cc-primary" onclick="openCompose('${esc(d.person_id)}', ${i})">${d.reply ? 'Write a reply' : 'Open'}</button>${contactBtns(d.person_id, Object.assign({}, d.row || {}, d.kind === 'text' ? { phone: d.to } : { email: d.to }, { display: d.name }))}</div></li>`; };
    const shown = all.filter(d => matches(`${d.name} ${d.body} ${d.subject}`)), ready = shown.filter(d => !d.reply), reply = shown.filter(d => d.reply);
    const body = !shown.length ? (S.q ? C.noMatch() : C.empty('No drafts waiting. New ones come with the next feed refresh.'))
      : `<h3 class="cc-sub-h">Ready to send <span class="cc-count">${ready.length}</span></h3>${ready.length ? `<ul class="cc-rows">${ready.map(row).join('')}</ul>` : C.empty('No written drafts right now.')}
        ${reply.length ? `<h3 class="cc-sub-h">Replies to write <span class="cc-count">${reply.length}</span></h3><p class="cc-note">Not drafts: these people texted last, so there is no template. They are not counted as drafts ready.</p><ul class="cc-rows">${reply.map(row).join('')}</ul>` : ''}`;
    // One owe-a-reply number: Touches due's. Replies to write cover the ones with a usable first name; the rest are named here.
    const owe = owesReply().length, rf = all.filter(d => d.reply).length;
    const why = owe ? ` ${owe} owe a reply (the same number as Touches due). ${rf === owe ? 'Each is under Replies to write.' : `${rf} are under Replies to write. The other ${owe - rf} have no first name on file or were already answered today, so they are on Touches due only.`}` : '';
    return page('Drafts', `${readyDrafts().length} written texts and emails ready to read and send. ${caps.sent_texts} of ${caps.texts} texts and ${caps.sent_emails} of ${caps.emails} emails sent today.${(caps.dry_texts || 0) + (caps.dry_emails || 0) ? ` ${(caps.dry_texts || 0) + (caps.dry_emails || 0)} dry run${(caps.dry_texts || 0) + (caps.dry_emails || 0) === 1 ? '' : 's'}, nothing left the Mac.` : ''}${why}${byClaude()}`, body, ['drafts', 'crm']);
  }
  function sent() {
    const rows = (S.data.sent_today || []).slice().reverse();
    const body = rows.length ? `<ul class="cc-rows">${rows.map(s => `<li class="cc-row"><span class="cc-av" aria-hidden="true">${s.kind === 'text' ? '▭' : '✉'}</span>
      <div class="cc-row-main"><h3>${C.who(s.display || 'No name')}</h3>
        <div class="cc-pills"><span class="cc-pill ${s.status === 'sent' ? 'k-listing' : 'k-other'}">${s.status === 'sent' ? 'Sent' : s.status === 'dry-run' ? 'Dry run, nothing left the Mac' : s.status === 'opened' ? 'Opened, waiting for your send' : esc(s.status)}</span>${s.via === 'handoff' ? (s.confirmed_by ? `<span class="cc-pill k-other">${s.confirmed_by === 'you' ? 'you said so' : 'confirmed by ' + esc(s.confirmed_by)} · ${esc(textWhen(s.sent_at))}${s.service && s.service !== 'Gmail' ? ' · ' + esc(s.service) : ''}</span>` : '') : s.kind === 'text' && s.delivery ? `<span class="cc-pill k-other">${esc(s.delivery)}</span>` : ''}</div>
        <p class="cc-note">${esc(textWhen(s.at))} · ${s.kind === 'text' ? 'Text' : 'Email'}${s.subject ? ': ' + esc(s.subject) : ''} · to ${s.kind === 'text' ? C.ph(s.to) : C.em(s.to)}</p>${s.text ? `<p class="cc-row-why">${C.note(s.sent_text || s.text, [s.display], 'Message hidden')}</p>` : ''}</div>${s.status === 'opened' ? `<div class="cc-acts"><button type="button" class="cc-primary" onclick="answerSent('${esc(s.id)}', true)">Sent</button><button type="button" onclick="answerSent('${esc(s.id)}', false)">Not sent</button></div>` : ''}</li>`).join('')}</ul>`
      : C.empty('Nothing sent today.');
    return page('Sent today', 'Every text and email from today: sent by Pipeline, sent by you from the Text and Email buttons, or dry-run.', body, ['sends']);
  }

  // ---------------- Search: the header box from any page. Pages with a list filter themselves; the rest come here.
  C.SEARCHES_ITSELF = [];  // every page opens Search the same way (round 3)
  C.noMatch = () => C.empty(`No match for “${esc(S.q)}”. Search looks at names, streets, phones, emails, tasks, deals, leads and drafts.`);
  function search() {
    const f = feedF(), q = S.q || '';
    if (!q) return `<div class="cc-page">${C.head('Search', 'Find a person, task, deal or lead from any page.')}${C.empty('Type in the box at the top.')}</div>`;
    const seen = new Set(), people = [];
    [].concat(f.touches_due || [], f.new_leads || [], f.partners || [], f.people || []).forEach(p => {
      if (!p.person_id || seen.has(p.person_id)) return;
      if (matches(`${p.display} ${p.phone || ''} ${p.email || ''} ${p.street || ''} ${p.city || ''}`)) { seen.add(p.person_id); people.push(p); }
    });
    const tk = (f.tasks || []).filter(t => matches(`${t.task} ${t.display}`));
    const dl = C.data ? C.data.deals.filter(r => matches(`${r.deal} ${r.status} ${r.side} ${r.next}`)) : [];
    const ld = C.data ? C.data.leads.filter(r => matches(`${r.name} ${r.phone} ${r.email} ${r.source}`)) : [];
    const all = typeof drafts === 'function' ? drafts() : [], dr = all.filter(d => matches(`${d.name} ${d.subject || ''} ${d.body || ''}`));
    const n = people.length + tk.length + dl.length + ld.length + dr.length;
    const group = (title, rows, li, more) => rows.length ? `<h3 class="cc-sub-h">${title} <span class="cc-count">${rows.length}</span></h3><ul class="cc-rows">${rows.slice(0, 15).map(li).join('')}</ul>${rows.length > 15 ? `<p class="cc-note">${more}</p>` : ''}` : '';
    const body = !n ? C.noMatch() : group('People', people, p => `<li class="cc-row"><span class="cc-av" aria-hidden="true">${C.ini(p.display)}</span><div class="cc-row-main"><h3>${C.who(p.display || 'No name')}</h3>
        <div class="cc-pills">${p.band ? `<span class="cc-pill ${band(p.band)}">${esc(p.band)}</span>` : ''}${p.stage ? `<span class="cc-pill k-other">${esc(p.stage)}</span>` : ''}</div>
        <p class="cc-note">${p.city ? esc(p.city) + ' · ' : ''}${quietTxt(p)}</p></div>
        <div class="cc-acts">${textBtn(p.person_id, p)}<button type="button" class="cc-primary" onclick="touched('${esc(p.person_id)}')">✓ Touched</button><button type="button" onclick="openTask('${esc(p.person_id)}')">＋ Task</button></div></li>`, 'Showing 15. Add more of the name or street to narrow it.')
      + group('Tasks', tk, t => `<li class="cc-row"><span class="cc-av" aria-hidden="true">☑</span><div class="cc-row-main"><h3>${C.note(t.task, [t.display], 'Task hidden')}</h3><p class="cc-note">${t.display ? C.who(t.display) + ' · ' : ''}${t.due ? 'Due ' + esc(C.day(t.due)) : 'No due date'}</p></div></li>`, 'Showing 15. Open Tasks for all of them.')
      + group('Deals', dl, r => `<li class="cc-row"><span class="cc-av" aria-hidden="true">⌂</span><div class="cc-row-main"><h3>${esc(r.deal)}</h3><p class="cc-note">${esc(r.status)} · ${C.m(r.price)}${r.act ? ' · Act of sale ' + esc(C.day(r.act)) : ''}</p></div><div class="cc-acts"><button type="button" onclick="CC.showDeal(${esc(JSON.stringify(r.deal))})">Open Deals</button></div></li>`, '')
      + group('Leads', ld, r => `<li class="cc-row"><span class="cc-av" aria-hidden="true">✚</span><div class="cc-row-main"><h3>${C.who(r.name || 'Website lead')}</h3><p class="cc-note">${esc(r.source || '')} · ${esc((r.due || {}).label || '')}</p></div><div class="cc-acts"><button type="button" onclick="go('ccleads')">Open Leads</button></div></li>`, '')
      + group('Drafts', dr, d => `<li class="cc-row"><span class="cc-av" aria-hidden="true">${d.kind === 'text' ? '▭' : '✉'}</span><div class="cc-row-main"><h3>${C.who(d.name)}</h3><p class="cc-note">${d.reply ? 'Reply to write' : d.kind === 'text' ? 'Text draft' : 'Email draft'}</p></div><div class="cc-acts"><button type="button" class="cc-primary" onclick="openCompose('${esc(d.person_id)}', ${all.indexOf(d)})">Open</button></div></li>`, 'Showing 15. Open Drafts for all of them.');
    return page('Search', `${n} match${n === 1 ? '' : 'es'} for “${esc(q)}”.`, body, ['crm', 'deals', 'leads']);
  }

  // ---------------- Grok: every call and hard draft handed to Grok, newest first, and what each one needs from Caleb
  function grok() {
    const b = S.data.bridge || {}, rows = b.recent || [], dry = S.data.demo || b.caller !== 'live';
    const WORD = { 'dry-run': 'Dry run, nothing left the Mac', waiting: 'Waiting on you', dial_card_shown: 'Waiting on you', completed: 'Call done', draft_ready: 'Draft ready',
      expired: 'Expired, no call made', canceled: 'Canceled, no call made', post_failed: 'Grok did not take it', failed: 'Failed' };
    const tone = j => ({ completed: 'k-listing', draft_ready: 'k-listing', waiting: 'k-closing', dial_card_shown: 'k-closing' }[j.state] || 'k-other');
    const need = j => j.state === 'waiting' || j.state === 'dial_card_shown'
      ? (j.job_type === 'call' ? 'Open Grok and tap the Call card. It lasts 30 minutes.' : 'Grok is writing it. It shows here when it is ready.')
      : j.state === 'draft_ready' ? 'Open it, read it, and send it yourself.' : '';
    const row = j => `<li class="cc-row"><span class="cc-av" aria-hidden="true">${j.job_type === 'call' ? '✆' : '✎'}</span>
      <div class="cc-row-main"><h3>${C.who(j.display || 'No name')}</h3>
        <div class="cc-pills"><span class="cc-pill ${tone(j)}">${esc(WORD[j.state] || j.state)}</span><span class="cc-pill k-other">${j.job_type === 'call' ? esc((b.purposes || {})[j.purpose] || 'Call') : 'Hard draft'}</span></div>
        <p class="cc-note">${esc(textWhen(j.at))}${j.to ? ' · to ' + C.ph(j.to) : ''}${need(j) ? ' · ' + esc(need(j)) : ''}</p>
        ${j.ask ? `<p class="cc-row-why">You asked: ${C.note(j.ask, [j.display], 'Request hidden')}</p>` : ''}
        ${j.job_type === 'call' && (j.summary || j.outcome) ? `<p class="cc-row-why">${C.note([j.outcome, j.summary].filter(Boolean).join('. '), [j.display], 'Result hidden')}</p>` : ''}
        ${j.draft_text ? `<p class="cc-row-why">${C.note(j.draft_text, [j.display], 'Draft hidden')}</p>` : ''}
        ${j.touch_error ? `<p class="cc-note">Not logged in the CRM: ${esc(j.touch_error)}</p>` : ''}</div>
      <div class="cc-acts"><button type="button" class="${j.state === 'draft_ready' ? 'cc-primary' : ''}" onclick="openGrok('${esc(j.person_id)}', '${j.job_type === 'call' ? 'call' : 'draft'}')">${j.state === 'draft_ready' ? 'Open the draft' : 'Open'}</button></div></li>`;
    const open = rows.filter(j => ['waiting', 'dial_card_shown', 'draft_ready'].includes(j.state)), rest = rows.filter(j => !open.includes(j));
    const body = !rows.length ? C.empty('Nothing has been handed to Grok yet. Use the Call button on a card, or the Grok panel in any message box.')
      : `<h3 class="cc-sub-h">Needs you <span class="cc-count">${open.length}</span></h3>${open.length ? `<ul class="cc-rows">${open.map(row).join('')}</ul>` : C.empty('Nothing is waiting on you.')}
         ${rest.length ? `<h3 class="cc-sub-h">Earlier <span class="cc-count">${rest.length}</span></h3><ul class="cc-rows">${rest.map(row).join('')}</ul>` : ''}`;
    return page('Grok calls', `Calls and hard drafts handed to Grok. ${dry ? 'Dry run: jobs are logged here and nothing leaves the Mac.' : 'Live: jobs go to Grok.'} ${b.calls_24h || 0} of ${b.calls_cap || 10} calls in the last 24 hours, ${b.drafts_today || 0} of ${b.drafts_cap || 10} hard drafts today. Grok never sends a text or email, and nothing dials until you tap its Call card.`, body, ['sends']);
  }
  // ---------------- Hot and Warm: who to work now, scored by aire/crm/heat.py. The whole row is the button.
  function heatPage(temp) {
    const h = feedF().heat || {}, rows = (h[temp] || []).filter(r => matches(`${r.display} ${r.phone || ''} ${r.email || ''} ${r.stage || ''}`));
    const cnt = h.counts || {}, th = h.thresholds || {}, v = h.versus_band || {};
    const row = r => {
      const last = (r.last_messages || []).slice(-1)[0];
      const differs = r.band && r.band !== r.temp;
      return `<li class="cc-row cc-click" role="button" tabindex="0" data-person="${esc(r.person_id)}" onclick="openPerson('${esc(r.person_id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPerson('${esc(r.person_id)}')}" aria-label="Open ${esc(r.display)}">
        <span class="cc-av" aria-hidden="true">${esc(initials(r.display))}</span>
        <div class="cc-row-main"><h3>${C.who(r.display || 'No name')}</h3>
          <div class="cc-pills"><span class="cc-pill ${band(r.temp)}">${esc(r.temp)}</span>${r.owes_reply ? '<span class="cc-pill k-closing">Owes a reply</span>' : ''}${r.stage ? `<span class="cc-pill k-other">${esc(r.stage)}</span>` : ''}${differs ? `<span class="cc-pill k-other">Sheet says ${esc(r.band)}</span>` : ''}${textStatus(r.person_id)}</div>
          <ul class="cc-why">${(r.reasons || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          ${last ? `<p class="cc-note">Last text: ${C.note('“' + last.replace(/^\d{4}-\d{2}-\d{2}: /, '') + '”', [r.display], 'Message hidden')}</p>` : ''}</div>
        <div class="cc-heat" aria-label="Heat ${n0(r.heat)} of 100"><b>${n0(r.heat)}</b><small>heat</small></div></li>`;
    };
    const floor = temp === 'hot' ? th.hot : th.warm, top = temp === 'hot' ? 100 : (th.hot || 50) - 1;
    const sub = `${n0((h[temp] || []).length)} ${temp} right now, hottest first. Click a person to open them. Heat is ${n0(floor)} to ${n0(top)} for ${temp}, worked out from what they said and did and when, not from the band on the sheet.`;
    const note = `<p class="cc-note cc-how"><b>How heat is scored.</b> Buying or selling talk in their own words, by how recent. A live deal. A new lead, hot for its first 7 days. Texting both ways. A referral or life change. Your own band, which fades when nothing happens. Silence cools everyone but a live deal, and three texts with no answer cools them faster. Of ${n0(h.scored)} people scored: ${TEMPS.map(t => `${n0(cnt[t])} ${t}`).join(', ')}. Next to the sheet's band, heat agrees on ${n0(v.same)}, runs hotter on ${n0(v.hotter_than_band)} and cooler on ${n0(v.cooler_than_band)}. The sheet is not changed.</p>${h.dated_intent === false ? '<p class="cc-note">Buying and selling talk is not counted yet: the texts file is from before the dates were added. It fills in on the next feed refresh.</p>' : ''}`;
    const body = (rows.length ? `<ul class="cc-rows">${rows.map(row).join('')}</ul>` : (S.q ? C.noMatch() : C.empty(temp === 'hot' ? 'Nobody is hot right now.' : 'Nobody is warm right now.'))) + note;
    return page(temp === 'hot' ? 'Hot' : 'Warm', sub, body, ['crm']);
  }
  const TEMPS = ['hot', 'warm', 'lukewarm', 'cold', 'ice-cold'];
  const hot = () => heatPage('hot'), warm = () => heatPage('warm');
  Object.assign(C.views, { touches, tasks, deals, queue, sent, grok, hot, warm, search });
})();
