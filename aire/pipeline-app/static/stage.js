/* The stage language, Home and the People board (look approved 2026-11-10).
   One color per CRM contact stage, the same seven names and order as crm.py STAGES, used for the Home group tabs, the
   People columns, the map pins, the map legend and the person card chip. Cadence (hot, warm, lukewarm, cold, ice-cold)
   is never a color: it stays a word on the row. Reads the CRM feed (/api/state) and nothing else. Every click goes to
   a page or a sheet that already exists (openBrief, openCompose, go), so no new send path starts here. */
(function () {
  const C = window.CC;
  // [stage, tab color, type on the tab]. light.css carries the same hexes as .stg-* classes.
  const TABS = [['new lead', '#F5C518', '#14100E'], ['contacted', '#3A8FDD', '#FFFFFF'], ['nurture', '#2DB87A', '#FFFFFF'],
    ['showing scheduled', '#8B5CF6', '#FFFFFF'], ['under contract', '#E04E28', '#14100E'], ['closed', '#14100E', '#FBF8F3'], ['past client', '#D4537E', '#FFFFFF']];
  const INK = '#14100E', STONE = '#B9B2A8', CADENCE = ['hot', 'warm', 'lukewarm', 'cold', 'ice-cold'];
  const key = s => String(s || '').trim().toLowerCase();
  const ST = window.Stage = { TABS, INK, STONE, CADENCE, names: TABS.map(t => t[0]), q: '' };
  ST.is = s => ST.names.includes(key(s));
  ST.hex = s => (TABS.find(t => t[0] === key(s)) || [0, STONE])[1];
  ST.cls = s => (ST.is(s) ? 'stg-' + key(s).replace(/\s+/g, '-') : 'stg-none');
  const cap = s => s[0].toUpperCase() + s.slice(1);
  ST.chip = (s, from) => `<span class="who-stage"><span class="stg-chip ${ST.cls(s)}">${esc(key(s) && ST.is(s) ? cap(key(s)) : key(s) ? cap(key(s)) : 'No stage')}</span>${from === 'deal' || from === 'tag' ? `<span class="stg-from">from ${from}</span>` : ''}</span>`;
  ST.tab = (s, n) => `<div class="stg-tab ${ST.cls(s)}"><span>${esc(cap(s))}</span><b>${Number(n).toLocaleString()}</b></div>`;
  // Cadence as a word. hot is a little heavier, the same color as the rest.
  ST.cadence = b => (b ? `<span class="cad${b === 'hot' ? ' cad-hot' : ''}">${esc(b)}</span>` : '');

  // Partners stay off the board, with the partners. Recruit is a partner type too.
  ST.SKIP = new Set(['agent', 'lender', 'vendor', 'recruit']);
  const STAGE_KEYS = new Set(['stage', 'stage_from', 'sheet_stage', 'stage_mismatch']);
  // The board is every contactable person in feed.people. Due, heat and new-lead rows only add detail, and they
  // never overwrite the shown stage. A feed with no people list still uses pins, touches due and new leads.
  ST.people = function () {
    const f = feed(), by = new Map(), idOf = r => (r && r.person_id != null && r.person_id !== '' ? String(r.person_id) : '');
    const put = (r, extra) => { const id = idOf(r); if (!id || ST.SKIP.has(key(r.type))) return; const cur = by.get(id) || { person_id: id };
      for (const [k, v] of Object.entries({ ...r, ...extra })) if (v !== '' && v != null && !(Array.isArray(v) && !v.length)) cur[k] = v;
      by.set(id, cur); };
    if (!Array.isArray(f.people)) {
      ((f.map || {}).pins || []).filter(p => p.kind === 'person').forEach(p => put(p));
      (f.touches_due || []).forEach(r => put(r, { due: true }));
      (f.new_leads || []).forEach(r => put(r, { stage: 'new lead', due: true }));
      return [...by.values()];
    }
    f.people.forEach(p => { const id = idOf(p); if (!id || ST.SKIP.has(key(p.type))) return; by.set(id, { ...p, person_id: id }); });
    const fill = (r, extra) => {
      const cur = by.get(idOf(r)); if (!cur) return;
      for (const [k, v] of Object.entries(r)) {
        if (STAGE_KEYS.has(k) || v === '' || v == null || (Array.isArray(v) && !v.length)) continue;
        if (cur[k] === '' || cur[k] == null) cur[k] = v;
      }
      if (extra) Object.assign(cur, extra);
    };
    ((f.map || {}).pins || []).filter(p => p.kind === 'person').forEach(p => fill(p));
    (f.touches_due || []).forEach(r => fill(r, { due: true }));
    (f.new_leads || []).forEach(r => fill(r, { due: true, new_lead: true }));
    (typeof heatList === 'function' ? heatList('hot').concat(heatList('warm')) : []).forEach(r => fill(r));
    return [...by.values()];
  };
  const labelOf = r => (C.fallbackName ? C.fallbackName(r) : String(r.display || ''));
  const order = (a, b) => (b.owes_reply ? 1 : 0) - (a.owes_reply ? 1 : 0) || (CADENCE.indexOf(a.band || '') + 9) % 9 - (CADENCE.indexOf(b.band || '') + 9) % 9
    || labelOf(a).localeCompare(labelOf(b));
  const heatOf = r => (r.heat === 0 || r.heat) && r.heat !== '' ? Number(r.heat) : -1;
  const byHeat = (a, b) => heatOf(b) - heatOf(a) || order(a, b);
  ST.groups = function (rows) {
    const g = { yet: [] }; ST.names.forEach(s => { g[s] = []; });
    rows.forEach(r => { const s = key(r.stage); if (g[s]) g[s].push(r); else if (!s) g.yet.push(r); });
    ST.names.forEach(s => g[s].sort(order));
    g.yet.sort(byHeat);
    return g;
  };
  ST.open = id => openPerson(id);  // the contact card, never straight into the message box
  const who = r => C.pname(r);
  const fromMark = r => (r.stage_from === 'deal' || r.stage_from === 'tag') ? `<span class="stg-from">from ${r.stage_from}</span>` : '';
  // Text and Call sit next to the name, as buttons of their own (never inside the name's button). They open the same
  // message box and Grok panel every card uses, so nothing new can send or dial from here.
  const way = r => (normPhone(r.phone) ? 'Text' : validEmail(r.email) ? 'Email' : '');
  const acts = (r, lead) => { const id = jsa(r.person_id), w = way(r); if (!w) return '';
    return `<span class="row-acts"><button type="button" class="${lead ? 'lt-go' : 'ra'}" onclick="openCompose(${id})">${lead ? w + ' them' : w}</button>${normPhone(r.phone) ? `<button type="button" class="ra" onclick="openGrok(${id}, 'call')">Call</button>` : ''}</span>`; };
  const srcLine = () => `<p class="cc-srcline lt-src">${C.src('crm')}</p>`;
  const today = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const feedDown = () => !(S.data && S.data.feed_ok);
  const noFeed = () => C.empty('The CRM feed did not load, so this screen would be a guess. Nothing is shown. Sources has the detail.');

  // ---------------- People: seven columns, a bold tab each, short text rows
  const MAXROWS = 40;
  const rowHTML = r => `<li><button type="button" onclick="Stage.open(${jsa(r.person_id)})"><b>${who(r)}</b><small>${[ST.cadence(r.band), esc(r.city || ''), fromMark(r)].filter(Boolean).join('<i> · </i>')}</small></button>${acts(r)}</li>`;
  const more = (n) => (n > MAXROWS ? `<p class="lt-quiet">${n - MAXROWS} more. Search to find them.</p>` : '');
  function boardHTML() {
    const q = key(ST.q), all = ST.people(), rows = all.filter(r => !q || key(`${labelOf(r)} ${r.display || ''} ${r.city || ''} ${r.band || ''} ${r.phone || ''} ${r.email || ''}`).includes(q)), g = ST.groups(rows);
    const off = rows.filter(r => key(r.stage) && !ST.is(r.stage)).length;
    return `<div class="ppl-board">${ST.names.map(s => `<section class="ppl-col" aria-label="${esc(s)}">${ST.tab(s, g[s].length)}
        <ul>${g[s].slice(0, MAXROWS).map(rowHTML).join('')}</ul>${more(g[s].length)}</section>`).join('')}</div>
      ${g.yet.length ? `<section class="ppl-yet" aria-label="No stage yet"><div class="stg-tab stg-yet"><span>No stage yet</span><b>${g.yet.length.toLocaleString()}</b></div>
        <p class="lt-quiet">No stage on the sheet, and no deal or past-client tag to go by. Not guessed.</p>
        <ul>${g.yet.slice(0, MAXROWS).map(rowHTML).join('')}</ul>${more(g.yet.length)}</section>` : ''}
      ${off ? `<p class="lt-quiet">${off.toLocaleString()} ${off === 1 ? 'person has' : 'people have'} a stage on the sheet that is not one of these seven, so ${off === 1 ? 'that person is' : 'they are'} not in a column. <button type="button" class="lt-link" onclick="go('touches')">Touches due</button> still lists everyone who is due.</p>` : ''}`;
  }
  ST.find = v => { ST.q = v; const b = document.getElementById('ppl-body'); if (b) b.innerHTML = boardHTML(); };
  function people() {
    const n = ST.people().length, c = (feed().counts || {}).contacts;
    return `<div class="cc-page cc-wide lt-page lt-people"><header class="lt-head"><div><h1>People</h1><p>Grouped by stage. Cadence (hot, warm, lukewarm, cold, ice-cold) lives on the row.</p></div>
        <div class="lt-meta"><span>${esc(today())}</span><span>${n.toLocaleString()} people here${c ? ` · ${Number(c).toLocaleString()} contacts in the CRM` : ''}</span></div></header>
      ${feedDown() ? noFeed() : `<label class="lt-find"><span class="sr">Find someone</span><input type="search" placeholder="Find someone" autocomplete="off" value="${esc(ST.q)}" oninput="Stage.find(this.value)"></label>
      <div id="ppl-body">${boardHTML()}</div>`}${srcLine()}</div>`;
  }

  // ---------------- Home: the Claude and Grok duet, people who need you, the market
  const item = (title, sub, js) => `<li><button type="button" onclick="${js}"><b>${title}</b><small>${sub}</small></button></li>`;
  // Waiting means it really is with Grok or back from Grok: a call whose card can still be tapped (45 minutes, the same
  // window app.js watches), a hard draft asked for today, or a draft that came back today. A dry-run job never left the
  // Mac, so it is never listed as waiting.
  ST.isWaiting = function (j, now) {
    const age = (now || Date.now()) - new Date(j.at), sameDay = String(j.at || '').slice(0, 10) === todayISO();
    if (j.job_type === 'call') return (j.state === 'waiting' || j.state === 'dial_card_shown') && age < 45 * 60e3;
    return (j.state === 'waiting' || j.state === 'draft_ready') && sameDay;
  };
  ST.grokWaiting = () => Object.entries(((S.data && S.data.bridge) || {}).jobs || {}).filter(([, j]) => ST.isWaiting(j)).map(([id, j]) => ({ id, j, row: personRow(id) || {} }));
  // Start here: the one most pressing person who is due. A reply owed comes first, then cadence order. Nobody due, no block.
  ST.startHere = () => ST.people().filter(r => r.due).sort(order)[0] || null;
  function startHTML() {
    const r = ST.startHere(); if (!r) return '';
    const whyNow = r.owes_reply ? 'You owe them a reply' : key(r.stage) === 'new lead' ? 'New lead, no first reply yet' : r.band ? `Due a touch on their ${r.band} cadence` : 'Due a touch';
    return `<section class="lt-start" aria-label="Start here"><span class="lt-eyebrow">Start here</span>
      <div class="lt-start-row"><button type="button" class="lt-start-name" onclick="Stage.open(${jsa(r.person_id)})"><b>${who(r)}</b><small>${esc(whyNow)}</small></button>${acts(r, true)}</div></section>`;
  }
  ST.PLACES = ['Baton Rouge', 'Zachary', 'St. Francisville', 'New Roads', 'The Felicianas'];
  function home() {
    const f = feed(), dr = readyDrafts(), owes = owesReply(), td = f.touches_due || [], gw = ST.grokWaiting();
    const duet = `${dr.length ? 'Claude drafted the day.' : 'No drafts are written yet today.'} ${gw.some(x => x.j.job_type === 'call') ? 'Grok is holding the calls.' : gw.length ? 'Grok has a hard draft for you.' : 'Nothing is waiting with Grok.'}`;
    const claude = [item('Morning brief', owes.length ? `${owes.length} ${owes.length === 1 ? 'reply' : 'replies'} to answer first` : 'Ready to read', 'openBrief()'),
      item('Scorecard', `${td.length.toLocaleString()} ${td.length === 1 ? 'person' : 'people'} due a touch`, "go('scorecard')")]
      .concat(dr.slice(0, 3).map(d => item(`${C.who(d.name)} follow-up`, `${d.kind === 'email' ? 'Email' : 'Text'} draft waiting`, `openCompose(${jsa(d.person_id)})`))).join('');
    const grok = gw.slice(0, 4).map(({ id, j, row }) => item(j.job_type === 'call' ? `Call ${C.pname({ display: row.display || j.display, phone: row.phone || j.to, email: row.email })}` : 'Hard draft',
      j.job_type === 'call' ? C.note(j.ask || grokText(j), [row.display], 'Details hidden') : `${j.state === 'draft_ready' ? 'Ready to read' : 'Being written'} for ${C.pname({ display: row.display || j.display, phone: row.phone || j.to, email: row.email })}`, `openGrok(${jsa(id)}, '${j.job_type === 'call' ? 'call' : 'draft'}')`)).join('');
    const need = ST.people().filter(r => r.due), g = ST.groups(need), shown = ST.names.filter(s => g[s].length), off = need.filter(r => key(r.stage) && !ST.is(r.stage)).length;
    return `<div class="cc-page cc-wide lt-page lt-home"><header class="lt-head"><div><h1>Good ${C.greet()}.</h1><p>${duet}</p></div><div class="lt-meta"><span>${esc(today())}</span></div></header>
      ${feedDown() ? '' : startHTML()}
      <div class="lt-duet"><section><span class="lt-eyebrow">Claude</span><h2>Everyday drafts</h2><ul class="lt-list">${claude}</ul>
          <p class="lt-links"><button type="button" class="lt-link" onclick="openBrief()">Open morning brief</button><button type="button" class="lt-link" onclick="go('queue')">All drafts${dr.length ? ' · ' + dr.length : ''}</button></p></section>
        <section><span class="lt-eyebrow">Grok</span><h2>Waiting on your tap</h2>${grok ? `<ul class="lt-list">${grok}</ul>` : '<p class="lt-quiet">No call or hard draft is waiting. Ask for one from any person: the Call button on a card, or the Grok panel in their message box.</p>'}
          <p class="lt-links"><button type="button" class="lt-link" onclick="go('grok')">Review calls</button></p><p class="lt-quiet">Nothing leaves the Mac until you press it. A call only dials from Grok's own Call card.</p></section></div>
      <section class="lt-need"><div class="lt-row"><h2>People who need you</h2><button type="button" class="lt-link" onclick="go('people')">View all people</button></div>
        ${feedDown() ? noFeed() : shown.length ? `<div class="need-grid">${shown.map(s => `<div>${ST.tab(s, g[s].length)}<ul>${g[s].slice(0, 3).map(r => `<li><button type="button" onclick="Stage.open(${jsa(r.person_id)})"><b>${who(r)}</b>${ST.cadence(r.band)}</button>${acts(r)}</li>`).join('')}</ul></div>`).join('')}</div>` : '<p class="lt-quiet">Nobody with one of the seven stages is due right now.</p>'}
        ${g.yet.length ? `<p class="lt-quiet">${g.yet.length.toLocaleString()} more ${g.yet.length === 1 ? 'is' : 'are'} due with no stage yet. <button type="button" class="lt-link" onclick="go('people')">People</button> lists them at the end of the board.</p>` : ''}
        ${off ? `<p class="lt-quiet">${off.toLocaleString()} more ${off === 1 ? 'is' : 'are'} due with a stage outside these seven. <button type="button" class="lt-link" onclick="go('touches')">Touches due</button> lists them.</p>` : ''}</section>
      <section class="lt-market"><div><h2>The market</h2><ul class="lt-places">${ST.PLACES.map(p => `<li>${esc(p)}</li>`).join('')}</ul><p class="lt-links"><button type="button" class="lt-link" onclick="go('map')">Open map</button></p></div>
        <button type="button" class="lt-mini" onclick="go('map')" aria-label="Open map"><div id="mini-map"></div></button></section>
      <nav class="lt-more" aria-label="More pages">${[['dash', 'Dashboard'], ['touches', 'Touches due'], ['tasks', 'Tasks'], ['queue', 'Drafts'], ['sent', 'Sent today'], ['grok', 'Grok calls'], ['ccleads', 'Leads'], ['hot', 'Hot'], ['warm', 'Warm'], ['deals', 'Deals'], ['deadlines', 'Deadlines'], ['calendar', 'Calendar'], ['commission', 'Commission'], ['bank', 'Bank'], ['sources', 'Sources']]
        .map(([k, l]) => `<button type="button" class="lt-link" onclick="go('${k}')">${l}</button>`).join('')}</nav>${srcLine()}</div>`;
  }
  // The small market preview: the same basemap and the same pins as the Map page, not interactive.
  function mountMini() {
    const el = document.getElementById('mini-map'); if (!el || !window.PMap) return;
    if (S.mini) S.mini.destroy();
    const pins = ((feed().map || {}).pins || []).filter(p => p.kind === 'person' && !PARTNER.has(p.type));
    S.mini = PMap.create(el, { still: true });
    S.mini.setData({ pins, deals: [], market: [], farms: farmsList(), selected: '' });
    S.mini.fit(PMap.HOME, 11);
  }
  Object.assign(C.views, { home, people });
  C.after.home = mountMini;
})();
