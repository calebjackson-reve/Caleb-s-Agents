/* The stage language, Home and the People board (look approved 2026-11-10).
   One color per CRM contact stage, the same seven names and order as crm.py STAGES, used for the Home group tabs, the
   People columns, the map pins, the map legend and the person card chip. Cadence (hot, warm, lukewarm, cold, ice-cold)
   is never a color: it stays a word on the row. Reads the CRM feed (/api/state) and nothing else. Every click goes to
   a page or a sheet that already exists (openBrief, openCompose, go), so no new send path starts here. */
(function () {
  const C = window.CC;
  // [stage, tab color, type on the tab]. light.css carries the same hexes as .stg-* classes.
  const TABS = [['new lead', '#F5C518', '#14100E'], ['contacted', '#3A8FDD', '#FFFFFF'], ['nurture', '#2DB87A', '#FFFFFF'],
    ['showing scheduled', '#8B5CF6', '#FFFFFF'], ['under contract', '#E87757', '#14100E'], ['closed', '#14100E', '#FBF8F3'], ['past client', '#D4537E', '#FFFFFF']];
  const INK = '#14100E', STONE = '#B9B2A8', CADENCE = ['hot', 'warm', 'lukewarm', 'cold', 'ice-cold'];
  const key = s => String(s || '').trim().toLowerCase();
  const ST = window.Stage = { TABS, INK, STONE, CADENCE, names: TABS.map(t => t[0]), q: '' };
  ST.is = s => ST.names.includes(key(s));
  ST.hex = s => (TABS.find(t => t[0] === key(s)) || [0, STONE])[1];
  ST.cls = s => (ST.is(s) ? 'stg-' + key(s).replace(/\s+/g, '-') : 'stg-none');
  const cap = s => s[0].toUpperCase() + s.slice(1);
  ST.chip = s => `<span class="stg-chip ${ST.cls(s)}">${esc(key(s) ? cap(key(s)) : 'No stage')}</span>`;
  ST.tab = (s, n) => `<div class="stg-tab ${ST.cls(s)}"><span>${esc(cap(s))}</span><b>${Number(n).toLocaleString()}</b></div>`;
  // Cadence as a word. hot is a little heavier, the same color as the rest.
  ST.cadence = b => (b ? `<span class="cad${b === 'hot' ? ' cad-hot' : ''}">${esc(b)}</span>` : '');

  // Everyone the feed names, once each: map pins (they carry city and stage), then Touches due, then new leads
  // (the feed only lists a new lead when its CRM Stage is "new lead"). A blank field never overwrites a filled one.
  ST.people = function () {
    const f = feed(), by = new Map();
    const put = (r, extra) => { if (!r || !r.person_id) return; const cur = by.get(r.person_id) || {};
      for (const [k, v] of Object.entries({ ...r, ...extra })) if (v !== '' && v != null) cur[k] = v; by.set(r.person_id, cur); };
    ((f.map || {}).pins || []).filter(p => p.kind === 'person').forEach(p => put(p));
    (f.touches_due || []).forEach(r => put(r, { due: true }));
    (f.new_leads || []).forEach(r => put(r, { stage: 'new lead', due: true }));
    return [...by.values()];
  };
  const order = (a, b) => (b.owes_reply ? 1 : 0) - (a.owes_reply ? 1 : 0) || (CADENCE.indexOf(a.band || '') + 9) % 9 - (CADENCE.indexOf(b.band || '') + 9) % 9
    || String(a.display || '').localeCompare(String(b.display || ''));
  ST.groups = function (rows) {
    const g = {}; ST.names.forEach(s => { g[s] = []; });
    rows.forEach(r => { const s = key(r.stage); if (g[s]) g[s].push(r); });
    ST.names.forEach(s => g[s].sort(order));
    return g;
  };
  ST.open = id => openCompose(id);
  const who = r => C.who(r.display || 'No name');
  const srcLine = () => `<p class="cc-srcline lt-src">${C.src('crm')}</p>`;
  const today = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const feedDown = () => !(S.data && S.data.feed_ok);
  const noFeed = () => C.empty('The CRM feed did not load, so this screen would be a guess. Nothing is shown. Sources has the detail.');

  // ---------------- People: seven columns, a bold tab each, short text rows
  const MAXROWS = 40;
  function boardHTML() {
    const q = key(ST.q), all = ST.people(), rows = all.filter(r => !q || key(`${r.display} ${r.city || ''} ${r.band || ''}`).includes(q)), g = ST.groups(rows);
    const off = rows.filter(r => !ST.is(r.stage)).length;
    return `<div class="ppl-board">${ST.names.map(s => `<section class="ppl-col" aria-label="${esc(s)}">${ST.tab(s, g[s].length)}
        <ul>${g[s].slice(0, MAXROWS).map(r => `<li><button type="button" onclick="Stage.open(${jsa(r.person_id)})"><b>${who(r)}</b><small>${[ST.cadence(r.band), esc(r.city || '')].filter(Boolean).join('<i> · </i>')}</small></button></li>`).join('')}</ul>
        ${g[s].length > MAXROWS ? `<p class="lt-quiet">${g[s].length - MAXROWS} more. Search to find them.</p>` : ''}</section>`).join('')}</div>
      ${off ? `<p class="lt-quiet">${off.toLocaleString()} ${off === 1 ? 'person has' : 'people have'} a stage in the CRM that is not one of these seven, or none at all, so ${off === 1 ? 'that person is' : 'they are'} not on the board. <button type="button" class="lt-link" onclick="go('touches')">Touches due</button> still lists everyone who is due.</p>` : ''}`;
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
  const WAITING = ['waiting', 'dial_card_shown', 'draft_ready', 'dry-run'];
  ST.grokWaiting = () => Object.entries(((S.data && S.data.bridge) || {}).jobs || {}).filter(([, j]) => WAITING.includes(j.state)).map(([id, j]) => ({ id, j, row: personRow(id) || {} }));
  ST.PLACES = ['Baton Rouge', 'Zachary', 'St. Francisville', 'New Roads', 'The Felicianas'];
  function home() {
    const f = feed(), dr = readyDrafts(), owes = owesReply(), td = f.touches_due || [], gw = ST.grokWaiting();
    const duet = `${dr.length ? 'Claude drafted the day.' : 'No drafts are written yet today.'} ${gw.length ? 'Grok is holding the calls.' : 'Nothing is waiting with Grok.'}`;
    const claude = [item('Morning brief', owes.length ? `${owes.length} ${owes.length === 1 ? 'reply' : 'replies'} to answer first` : 'Ready to read', 'openBrief()'),
      item('Scorecard', `${td.length.toLocaleString()} ${td.length === 1 ? 'person' : 'people'} due a touch`, "go('scorecard')")]
      .concat(dr.slice(0, 3).map(d => item(`${C.who(d.name)} follow-up`, `${d.kind === 'email' ? 'Email' : 'Text'} draft waiting`, `openCompose(${jsa(d.person_id)})`))).join('');
    const grok = gw.slice(0, 4).map(({ id, j, row }) => item(j.job_type === 'call' ? `Call ${C.who(row.display || 'this person')}` : 'Hard draft',
      j.job_type === 'call' ? C.note(j.ask || grokText(j), [row.display], 'Details hidden') : `${j.state === 'draft_ready' ? 'Ready to read' : 'Being written'} for ${C.who(row.display || 'this person')}`, `openCompose(${jsa(id)})`)).join('');
    const need = ST.people().filter(r => r.due), g = ST.groups(need), shown = ST.names.filter(s => g[s].length), off = need.filter(r => !ST.is(r.stage)).length;
    return `<div class="cc-page cc-wide lt-page lt-home"><header class="lt-head"><div><h1>Good ${C.greet()}.</h1><p>${duet}</p></div><div class="lt-meta"><span>${esc(today())}</span></div></header>
      <div class="lt-duet"><section><span class="lt-eyebrow">Claude</span><h2>Everyday drafts</h2><ul class="lt-list">${claude}</ul>
          <p class="lt-links"><button type="button" class="lt-link" onclick="openBrief()">Open morning brief</button><button type="button" class="lt-link" onclick="go('queue')">All drafts${dr.length ? ' · ' + dr.length : ''}</button></p></section>
        <section><span class="lt-eyebrow">Grok</span><h2>Waiting on your tap</h2>${grok ? `<ul class="lt-list">${grok}</ul>` : '<p class="lt-quiet">No call or hard draft is waiting. Ask for one from any person: open them, then Call through Grok or Hard draft from Grok.</p>'}
          <p class="lt-links"><button type="button" class="lt-link" onclick="go('touches')">Review calls</button></p><p class="lt-quiet">Nothing leaves the Mac until you press it. A call only dials from Grok's own Call card.</p></section></div>
      <section class="lt-need"><div class="lt-row"><h2>People who need you</h2><button type="button" class="lt-link" onclick="go('people')">View all people</button></div>
        ${feedDown() ? noFeed() : shown.length ? `<div class="need-grid">${shown.map(s => `<div>${ST.tab(s, g[s].length)}<ul>${g[s].slice(0, 3).map(r => `<li><button type="button" onclick="Stage.open(${jsa(r.person_id)})"><b>${who(r)}</b>${ST.cadence(r.band)}</button></li>`).join('')}</ul></div>`).join('')}</div>` : '<p class="lt-quiet">Nobody with one of the seven stages is due right now.</p>'}
        ${off ? `<p class="lt-quiet">${off.toLocaleString()} more ${off === 1 ? 'is' : 'are'} due with a stage outside these seven, or none. <button type="button" class="lt-link" onclick="go('touches')">Touches due</button> lists them.</p>` : ''}</section>
      <section class="lt-market"><div><h2>The market</h2><ul class="lt-places">${ST.PLACES.map(p => `<li>${esc(p)}</li>`).join('')}</ul><p class="lt-links"><button type="button" class="lt-link" onclick="go('map')">Open map</button></p></div>
        <button type="button" class="lt-mini" onclick="go('map')" aria-label="Open map"><div id="mini-map"></div></button></section>
      <nav class="lt-more" aria-label="More pages">${[['dash', 'Dashboard'], ['touches', 'Touches due'], ['tasks', 'Tasks'], ['queue', 'Drafts'], ['sent', 'Sent today'], ['deals', 'Deals'], ['deadlines', 'Deadlines'], ['calendar', 'Calendar'], ['commission', 'Commission'], ['bank', 'Bank'], ['ccleads', 'Leads'], ['sources', 'Sources']]
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
