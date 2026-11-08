/* The CRM pages in the Command Center design: Touches due, Tasks, Deals, Drafts, Sent today, plus the privacy
   helpers and the CRM sources every page can name. People, tasks and drafts come from the CRM feed (feed.json via
   /api/state). Deals come from the AIRE Deals sheet (/api/cc), the one deal source; CRM Deals tab rows are matched to
   it and never add to its numbers. Writes go through app.js (touched, doneTask, openTask, openCompose), so every one
   is a crm.py call with its gates. */
(function () {
  const C = window.CC;

  // ---------------- privacy: names, phones, emails, message text and dollars hide together
  const HID = '<span class="cc-hid">hidden</span>';
  C.who = v => (!v ? '' : C.priv ? '<span class="cc-hid">Name hidden</span>' : esc(v));
  C.ph = v => (!v ? '' : C.priv ? HID : esc(fmtPhone(v)));
  C.em = v => (!v ? '' : C.priv ? HID : esc(v));
  C.msg = v => (C.priv ? '<span class="cc-hid">Message hidden</span>' : esc(v));
  C.ini = v => (C.priv ? '•' : esc(initials(v)));
  // Free text (a task, a next step, a deal note, a subject): with privacy on, dollar amounts and names are blanked.
  // A name is any capitalized word that is not an acronym (FORD, KW), not a month, weekday, place or brand below, and
  // never written in lowercase anywhere in the CRM's own text. So "Offer", "Call" and "Removed" stay, while "Ford" in
  // "Ford offer expired" and a sentence-first name are hidden. CRM names are always hidden too.
  const MONEY = /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:\s?[kKmM]\b)?|\$\s?\d+(?:\.\d+)?(?:\s?[kKmM]\b)?/g;
  const KEEP = new Set(('jan feb mar apr may jun jul aug sep sept oct nov dec january february march april june july august september october november december ' +
    'mon tue tues wed thu thur thurs fri sat sun monday tuesday wednesday thursday friday saturday sunday am pm i ' +
    'kw keller williams first choice command transact zillow realtor realtors mls crm pipeline claude gmail google messages imessage chase luxury presence ' +
    'baton rouge louisiana la zachary saint st francisville feliciana west east north south prairieville walker livingston ascension denham springs central new roads ' +
    'ebr freddie mac fred gbrar va fha usda ddi cda pmms hwy ' +
    'the a an and or but if when after before then so to of in on at for from with by about as is are was were be been has have had do does did not no yes ' +
    'call text send ask reply partner thank thanks congrats offer offers seller sellers buyer buyers listed listing your our my amount act due still check confirm ' +
    'follow mark open binding counter countered sent short ninja handwritten later today tomorrow removed waiting paid cash conventional appraisal inspection ' +
    'closing closed close contract deal deals price rate commission notes note new lead leads home value request website referral sign open house social past client other ' +
    'expired expires until likely dead fell through probably maybe need needs needed set up get got look looking').split(/\s+/));
  let vocab = null, vocabKey = '';
  function lowerWords() {
    const f = (typeof S !== "undefined" && S.data && S.data.feed) || {}, key = (f.generated_at || '') + '|' + ((C.data && C.data.at) || '');
    if (vocab && vocabKey === key) return vocab;
    vocab = new Set(); vocabKey = key;
    const add = t => (String(t || '').match(/\b[a-z][a-z'’]+\b/g) || []).forEach(w => vocab.add(w));
    (f.tasks || []).forEach(t => add(t.task));
    [].concat(f.touches_due || [], f.partners || []).forEach(r => add(r.next_action));
    ((C.data && C.data.deals) || []).forEach(d => { add(d.check); add(d.next); });
    return vocab;
  }
  let nameRe = null, nameKey = '';
  function crmNames() {
    const f = (typeof S !== "undefined" && S.data && S.data.feed) || {};
    const key = f.generated_at || '';
    if (nameRe && nameKey === key) return nameRe;
    const words = new Set();
    [].concat(f.people || [], f.touches_due || [], f.new_leads || [], f.partners || [], f.tasks || []).forEach(p =>
      String(p.display || '').split(/[\s/,&()]+/).forEach(w => { if (w.length > 2 && /^[A-Z]/.test(w) && !KEEP.has(w.toLowerCase())) words.add(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); }));
    nameKey = key;
    nameRe = words.size ? new RegExp('\\b(' + [...words].sort((a, b) => b.length - a.length).join('|') + ')\\b', 'g') : null;
    return nameRe;
  }
  C.isNameWord = function (w) {
    if (/^[A-Z0-9]{2,5}$/.test(w)) return false;  // an acronym like FORD, KW, VA, DDI
    const l = w.toLowerCase().replace(/['’]s$/, '');
    return !KEEP.has(l) && !lowerWords().has(l);
  };
  C.scrub = function (t, names) {
    let s = String(t || '');
    if (!C.priv) return esc(s);
    s = s.replace(MONEY, '$•••');
    [].concat(names || []).forEach(n => String(n || '').split(/\s+/).filter(w => w.length > 2).forEach(w => {
      s = s.replace(new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), '•••');
    }));
    const re = crmNames(); if (re) s = s.replace(re, '•••');
    s = s.replace(/\b[A-Z][A-Za-z'’]*\b/g, w => (C.isNameWord(w) ? '•••' : w));
    s = s.replace(/•••(?:[ -]•••)+/g, '•••');
    return esc(s);
  };
  // Public text with no people in it (market talking points): only dollar amounts hide.
  C.scrubMoney = t => esc(C.priv ? String(t || '').replace(MONEY, '$•••') : String(t || ''));
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
        error: !d.feed_ok ? 'the CRM feed did not load' : failed ? `the rebuild at ${run.at_text} failed (${run.detail}), showing the feed from ${a} min ago` : null };
    }
    if (k === 'command') { const c = d.command || {}; return { source: 'KW Command reader', at: c.at, age_min: age(c.at),
      state: !c.state ? 'missing' : c.state === 'ok' ? 'ok' : 'failed', error: c.state && c.state !== 'ok' ? c.state + (c.detail ? ', ' + c.detail : '') : null }; }
    if (k === 'drafts') { const q = d.text_queue || {}, at = q.generated_at || (d.email_queue || {}).generated_at;
      return { source: 'Draft queue, text and email', at, age_min: age(at), state: at ? 'ok' : 'missing', error: null }; }
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
    // The source and as-of time sit at the top of the list as well as under it, so a long list still says where it came from.
    return `<div class="cc-page">${C.head(title, sub)}<section class="cc-card"><p class="cc-srcline">${C.src(sources)}</p>${tools ? `<div class="cc-tools">${tools}</div>` : ''}${inner}<footer>${C.src(sources)}</footer></section></div>`;
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
    const body = rows.length ? `<ul class="cc-rows">${rows.slice(0, 200).map(touchRow).join('')}</ul>${rows.length > 200 ? `<p class="cc-note">Showing the first 200 of ${rows.length}.</p>` : ''}`
      : S.q ? C.noMatch() : C.empty('Every touch is logged.');
    return page('Touches due', 'People due a touch from your cadence, replies owed first. Touched logs it in the CRM.', body, ['crm'],
      seg([['all', 'All', all.length], ['reply', 'Owe a reply', n.reply], ['hot', 'Hot', n.hot], ['warm', 'Warm', n.warm]], S.filter, 'CC.setFilter'));
  }
  function touchRow(r) {
    const last = (r.last_messages || []).slice(-1)[0];
    return `<li class="cc-row ${r.owes_reply ? 'is-hot' : ''}"><span class="cc-av" aria-hidden="true">${C.ini(r.display)}</span>
      <div class="cc-row-main"><h3>${C.who(r.display || 'No name')}</h3>
        <div class="cc-pills">${r.band ? `<span class="cc-pill ${band(r.band)}">${esc(r.band)}</span>` : ''}${r.owes_reply ? '<span class="cc-pill k-closing">Owes a reply</span>' : ''}${r.stage ? `<span class="cc-pill k-other">${esc(r.stage)}</span>` : ''}${textStatus(r.person_id)}</div>
        <p class="cc-row-why">${C.scrub(r.next_action || (r.owes_reply ? 'They texted last. Answer first.' : 'Time for a touch'), [r.display])}</p>
        <p class="cc-note">${last ? `Last text: ${C.priv ? C.msg('') : '“' + esc(C.cleanMsg(last)) + '”'}` : quietTxt(r)}${r.phone ? ' · ' + C.ph(r.phone) : r.email ? ' · ' + C.em(r.email) : ''}</p></div>
      <div class="cc-acts">${textBtn(r.person_id, r)}<button type="button" class="cc-primary" onclick="touched('${esc(r.person_id)}')">✓ Touched</button><button type="button" onclick="openTask('${esc(r.person_id)}')">＋ Task</button><button type="button" onclick="openNote('${esc(r.person_id)}')">Note</button><button type="button" class="cc-danger" onclick="openDNC('${esc(r.person_id)}')" aria-label="Do Not Contact">Do Not Contact</button></div></li>`;
  }
  const band = b => ({ hot: 'k-closing', warm: 'k-listing' }[b] || 'k-other');

  // ---------------- Tasks
  function tasks() {
    const today = todayISO();
    const all = (feedF().tasks || []).filter(t => matches(`${t.task} ${t.display} ${t.source}`));
    const n = { over: all.filter(t => t.overdue).length, today: all.filter(t => t.due === today).length };
    let rows = S.filter === 'over' ? all.filter(t => t.overdue) : S.filter === 'today' ? all.filter(t => t.due === today) : all;
    rows = rows.slice().sort((a, b) => (b.overdue - a.overdue) || (a.due || '9').localeCompare(b.due || '9'));
    const body = rows.length ? `<ul class="cc-rows cc-tasks">${rows.map(t => `<li class="cc-row ${t.overdue ? 'is-hot' : ''}"><span class="cc-av" aria-hidden="true">${t.overdue ? '!' : '☑'}</span>
      <div class="cc-row-main"><h3>${C.scrub(t.task, [t.display])}</h3>
        <div class="cc-pills"><span class="cc-pill ${t.overdue ? 'k-closing' : t.due === today ? 'k-listing' : 'k-other'}">${t.overdue ? 'Overdue · ' : ''}${esc(dayName(t.due) || 'No date')}</span>${t.task_id ? '' : '<span class="cc-pill k-other">From a next action</span>'}</div>
        <p class="cc-note">${t.display ? C.who(t.display) + ' · ' : ''}${t.due ? 'Due ' + esc(C.day(t.due)) : 'No due date'}${t.source ? ' · ' + esc(t.source) : ''}</p></div>
      <div class="cc-acts"><button type="button" class="cc-primary" onclick="doneTask('${esc(t.task_id)}','${esc(t.person_id)}',${JSON.stringify(String(t.task || '')).replace(/"/g, '&quot;')})">✓ Done</button>${t.person_id ? `<button type="button" onclick="openCompose('${esc(t.person_id)}')">Message</button>` : ''}</div></li>`).join('')}</ul>`
      : S.q ? C.noMatch() : C.empty('No open tasks here.');
    // Where the open tasks come from: rows on the CRM's Tasks tab, and contacts whose Next_Action column has a step.
    const tab = (feedF().tasks || []).filter(t => t.task_id).length, na = (feedF().tasks || []).length - tab;
    return page('Tasks', `Open CRM tasks, overdue first. Done marks it done in the CRM. ${n0(tab + na)} open: ${n0(tab)} on the Tasks tab and ${n0(na)} from the Next_Action column on contacts.${na && !tab ? ' That is why the Tasks tab itself shows none open. Done on one of these moves it to the Tasks tab and closes it there.' : ''}`, body, ['crm'],
      seg([['all', 'All', all.length], ['over', 'Overdue', n.over], ['today', 'Due today', n.today]], S.filter, 'CC.setFilter') +
      '<div class="cc-acts"><button type="button" class="cc-primary" onclick="openTask()">＋ New task</button></div>');
  }

  // ---------------- Deals: the AIRE Deals sheet, with the CRM Deals tab checked against it
  // An offer's deadline from its note: expired once it passed, open until a day otherwise. Offers never count down to close.
  C.offerPill = r => { const o = r.stage === 'offer' && r.offer; if (!o) return '';
    return o.expired ? `<span class="cc-pill k-closing">Offer expired ${esc(C.day(o.date))}${o.time ? ' ' + esc(o.time) : ''}</span>` : `<span class="cc-pill k-listing">Offer open until ${esc(C.day(o.date))}${o.time ? ' ' + esc(o.time) : ''}</span>`; };
  const STAGE = { contract: 'Under contract', offer: 'Offer', appointment: 'Active', closed: 'Closed', out: 'Fell through', other: 'No status' };
  function deals() {
    const g = C.guard(); if (g) return g;
    const all = C.data.deals.filter(r => matches(`${r.deal} ${r.status} ${r.side} ${r.next}`));
    const live = all.filter(r => !['closed', 'out'].includes(r.stage)), past = all.filter(r => ['closed', 'out'].includes(r.stage));
    const only = (C.data.crm_only_deals || []).filter(r => matches(`${r.deal} ${r.stage}`));
    const row = r => `<li class="cc-row ${r.differs.length ? 'is-warn' : ''}"><span class="cc-av" aria-hidden="true">⌂</span>
      <div class="cc-row-main"><h3>${esc(r.deal)}</h3>
        <div class="cc-pills"><span class="cc-pill ${r.stage === 'contract' ? 'k-closing' : r.stage === 'closed' ? 'k-listing' : 'k-other'}">${esc(r.status)}</span>${r.side ? `<span class="cc-pill k-other">${esc(r.side)}</span>` : ''}${r.to_close != null && r.to_close >= 0 ? `<span class="cc-pill k-listing">${r.to_close === 0 ? 'Closes today' : r.to_close + ' days to close'}</span>` : ''}${C.offerPill(r)}</div>
        <p class="cc-note">Price ${C.m(r.price)} · Your commission, gross ${r.commission == null ? '<em>not on the sheet</em>' : C.m(r.commission)}${r.act ? (r.stage === 'offer' ? ' · Act of sale if accepted ' : ' · Act of sale ') + esc(C.day(r.act)) : ''}${r.crm && r.crm.display ? ' · ' + C.who(r.crm.display) : ''}</p>
        ${r.next ? `<p class="cc-row-why">${C.scrub(r.next)}</p>` : ''}
        ${r.differs.length ? `<p class="cc-warn">The CRM Deals tab says ${r.differs.map(x => `${esc(x.field)} ${x.field === 'price' ? C.m(x.crm) : esc(x.field === 'act of sale' ? C.day(x.crm) : x.crm)}`).join(', ')}. This page shows the Deals sheet.</p>` : ''}</div>
      <div class="cc-acts">${r.crm ? `<button type="button" onclick="openDeal(${esc(JSON.stringify(r.crm.address))})">Edit in the CRM</button>` : ''}${r.crm && r.crm.person_id ? `<button type="button" onclick="openCompose('${esc(r.crm.person_id)}')">Message</button>` : ''}</div></li>`;
    const body = `${live.length ? `<ul class="cc-rows">${live.map(row).join('')}</ul>` : S.q && !past.length ? C.noMatch() : C.empty('No open deals on the Deals sheet.')}
      ${past.length ? `<details class="cc-more"><summary>Closed and fell through <span class="cc-count">${past.length}</span></summary><ul class="cc-rows">${past.map(row).join('')}</ul></details>` : ''}`;
    return `<div class="cc-page">${C.head('Deals', 'One list from the AIRE Deals sheet. Commission, Deadlines and the Dashboard read the same rows.')}
      ${C.card(`Deals sheet <span class="cc-count">${live.length} open</span>`, body, 'deals')}
      ${only.length ? C.card(`Only in the CRM Deals tab <span class="cc-count">${only.length}</span>`, `<p class="cc-note">Not on the Deals sheet, so not in any total. Add them to the sheet if they are real deals.</p><ul class="cc-rows">${only.map(r => `<li class="cc-row"><span class="cc-av" aria-hidden="true">⌂</span><div class="cc-row-main"><h3>${esc(r.deal)}</h3><p class="cc-note">${esc((r.stage || 'no stage').replace('_', ' '))}${r.price ? ' · ' + C.m(r.price) : ''}${r.close ? ' · closes ' + esc(C.day(r.close)) : ''}${r.display ? ' · ' + C.who(r.display) : ''}</p></div><div class="cc-acts"><button type="button" onclick="openDeal(${esc(JSON.stringify(r.deal))})">Edit in the CRM</button></div></li>`).join('')}</ul>`, [], '') .replace('<footer></footer>', `<footer>${C.src('crm')}</footer>`) : ''}
      <div class="cc-acts"><button type="button" onclick="openDeal()">＋ Add a deal to the CRM</button><button type="button" onclick="go('dealmap')">See deals on the map</button></div></div>`;
  }

  // ---------------- Drafts and Sent today
  // Drafts: written texts and emails ready to send, then the replies to write yourself (they texted last, so there is no
  // template). Only the first list counts as drafts ready, on every screen.
  function queue() {
    const all = drafts(), caps = S.data.caps;
    const row = d => { const i = all.indexOf(d); return `<li class="cc-row ${d.reply ? 'is-hot' : ''}"><span class="cc-av" aria-hidden="true">${d.kind === 'text' ? '▭' : '✉'}</span>
      <div class="cc-row-main"><h3>${C.who(d.name)}</h3>
        <div class="cc-pills">${d.reply ? '<span class="cc-pill k-closing">Reply to write</span>' : `<span class="cc-pill k-other">${esc(d.kind === 'text' ? 'Text' : 'Email')}${d.pool ? ' · ' + esc(d.pool) : ''}</span>`}</div>
        <p class="cc-row-why">${d.reply ? 'They texted last. Read what they said and answer in your own words.' : C.priv ? C.msg('') : esc(d.subject || d.body.split('\n')[0])}</p>
        <p class="cc-note">${d.reply ? (C.priv ? C.msg('') : '“' + esc(C.cleanMsg(d.last_messages.slice(-1)[0])) + '”') : C.priv ? '' : esc(d.body.slice(0, 140))}${d.to ? ' · to ' + (d.kind === 'text' ? C.ph(d.to) : C.em(d.to)) : ''}</p></div>
      <div class="cc-acts"><button type="button" class="cc-primary" onclick="openCompose('${esc(d.person_id)}', ${i})">${d.reply ? 'Write a reply' : 'Open'}</button></div></li>`; };
    const shown = all.filter(d => matches(`${d.name} ${d.body} ${d.subject}`)), ready = shown.filter(d => !d.reply), reply = shown.filter(d => d.reply);
    const body = !shown.length ? (S.q ? C.noMatch() : C.empty('No drafts waiting. New ones come with the next feed refresh.'))
      : `<h3 class="cc-sub-h">Ready to send <span class="cc-count">${ready.length}</span></h3>${ready.length ? `<ul class="cc-rows">${ready.map(row).join('')}</ul>` : C.empty('No written drafts right now.')}
        ${reply.length ? `<h3 class="cc-sub-h">Replies to write <span class="cc-count">${reply.length}</span></h3><p class="cc-note">Not drafts: these people texted last, so there is no template. They are not counted as drafts ready.</p><ul class="cc-rows">${reply.map(row).join('')}</ul>` : ''}`;
    // One owe-a-reply number: Touches due's. Replies to write cover the ones with a usable first name; the rest are named here.
    const owe = owesReply().length, rf = all.filter(d => d.reply).length;
    const why = owe ? ` ${owe} owe a reply (the same number as Touches due). ${rf === owe ? 'Each is under Replies to write.' : `${rf} are under Replies to write. The other ${owe - rf} have no first name on file or were already answered today, so they are on Touches due only.`}` : '';
    return page('Drafts', `${readyDrafts().length} written texts and emails ready to read and send. ${caps.sent_texts} of ${caps.texts} texts and ${caps.sent_emails} of ${caps.emails} emails sent today.${why}`, body, ['drafts', 'crm']);
  }
  function sent() {
    const rows = (S.data.sent_today || []).slice().reverse();
    const body = rows.length ? `<ul class="cc-rows">${rows.map(s => `<li class="cc-row"><span class="cc-av" aria-hidden="true">${s.kind === 'text' ? '▭' : '✉'}</span>
      <div class="cc-row-main"><h3>${C.who(s.display || 'No name')}</h3>
        <div class="cc-pills"><span class="cc-pill ${s.status === 'sent' ? 'k-listing' : 'k-other'}">${s.status === 'sent' ? 'Sent' : s.status === 'dry-run' ? 'Dry run, nothing left the Mac' : esc(s.status)}</span>${s.kind === 'text' && s.delivery ? `<span class="cc-pill k-other">${esc(s.delivery)}</span>` : ''}</div>
        <p class="cc-note">${esc(textWhen(s.at))} · ${s.kind === 'text' ? 'Text' : 'Email'}${s.subject && !C.priv ? ': ' + esc(s.subject) : ''} · to ${s.kind === 'text' ? C.ph(s.to) : C.em(s.to)}</p></div></li>`).join('')}</ul>`
      : C.empty('Nothing sent today.');
    return page('Sent today', 'Every text and email Pipeline sent or dry-ran today.', body, ['sends']);
  }

  // ---------------- Search: the header box from any page. Pages with a list filter themselves; the rest come here.
  C.SEARCHES_ITSELF = ['touches', 'tasks', 'deals', 'ccleads', 'queue', 'monitor'];
  C.noMatch = () => C.empty(`No match for “${esc(S.q)}”. Search looks at names, streets, phones, emails, tasks, deals and leads.`);
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
    const n = people.length + tk.length + dl.length + ld.length;
    const group = (title, rows, li, more) => rows.length ? `<h3 class="cc-sub-h">${title} <span class="cc-count">${rows.length}</span></h3><ul class="cc-rows">${rows.slice(0, 15).map(li).join('')}</ul>${rows.length > 15 ? `<p class="cc-note">${more}</p>` : ''}` : '';
    const body = !n ? C.noMatch() : group('People', people, p => `<li class="cc-row"><span class="cc-av" aria-hidden="true">${C.ini(p.display)}</span><div class="cc-row-main"><h3>${C.who(p.display || 'No name')}</h3>
        <div class="cc-pills">${p.band ? `<span class="cc-pill ${band(p.band)}">${esc(p.band)}</span>` : ''}${p.stage ? `<span class="cc-pill k-other">${esc(p.stage)}</span>` : ''}</div>
        <p class="cc-note">${p.city ? esc(p.city) + ' · ' : ''}${quietTxt(p)}</p></div>
        <div class="cc-acts">${textBtn(p.person_id, p)}<button type="button" class="cc-primary" onclick="touched('${esc(p.person_id)}')">✓ Touched</button><button type="button" onclick="openTask('${esc(p.person_id)}')">＋ Task</button></div></li>`, 'Showing 15. Add more of the name or street to narrow it.')
      + group('Tasks', tk, t => `<li class="cc-row"><span class="cc-av" aria-hidden="true">☑</span><div class="cc-row-main"><h3>${C.scrub(t.task, [t.display])}</h3><p class="cc-note">${t.display ? C.who(t.display) + ' · ' : ''}${t.due ? 'Due ' + esc(C.day(t.due)) : 'No due date'}</p></div></li>`, 'Showing 15. Open Tasks for all of them.')
      + group('Deals', dl, r => `<li class="cc-row"><span class="cc-av" aria-hidden="true">⌂</span><div class="cc-row-main"><h3>${esc(r.deal)}</h3><p class="cc-note">${esc(r.status)} · ${C.m(r.price)}${r.act ? ' · Act of sale ' + esc(C.day(r.act)) : ''}</p></div><div class="cc-acts"><button type="button" onclick="go('deals')">Open Deals</button></div></li>`, '')
      + group('Leads', ld, r => `<li class="cc-row"><span class="cc-av" aria-hidden="true">✚</span><div class="cc-row-main"><h3>${C.who(r.name || 'Website lead')}</h3><p class="cc-note">${esc(r.source || '')} · ${esc((r.due || {}).label || '')}</p></div><div class="cc-acts"><button type="button" onclick="go('ccleads')">Open Leads</button></div></li>`, '');
    return page('Search', `${n} match${n === 1 ? '' : 'es'} for “${esc(q)}”.`, body, ['crm', 'deals', 'leads']);
  }

  Object.assign(C.views, { touches, tasks, deals, queue, sent, search });
})();
