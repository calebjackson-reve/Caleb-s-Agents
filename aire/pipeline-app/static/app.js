/* Pipeline front end. Vanilla JS, no build step. Talks to app.py over /api. */
'use strict';

const S = { data: null, view: 'cc', q: '', filter: 'all', queueIdx: 0, pollTimer: null, bootDone: false };
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = n => (n || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const fmtPhone = p => { const d = (p || '').replace(/\D/g, ''); return d.length === 11 ? `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}` : p || ''; };
const money = v => { const n = Number(String(v).replace(/[^\d.]/g, '')); return n ? '$' + n.toLocaleString() : ''; };
const quiet = r => r.days_quiet == null ? 'never logged' : r.days_quiet === 0 ? 'today' : `${r.days_quiet}d quiet`;
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayName = iso => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); const diff = Math.round((d - new Date(todayISO() + 'T12:00:00')) / 864e5); return diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : diff === -1 ? 'yesterday' : diff < 0 ? `${-diff}d late` : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };

// ---------------------------------------------------------------- api
async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  return r.json();
}
async function load() {
  try {
    S.data = await api('/api/state');
    render();
  } catch (e) {
    toast('err', 'SERVER', 'app.py is not answering. Start it with: python3 aire/pipeline-app/app.py');
  }
}
async function act(path, body, okText) {
  const r = await api(path, body);
  if (r.ok) { toast('ok', okText.tag, okText.text); tele(`${okText.tag.toLowerCase()}: ${okText.text}`); if (window.Core) Core.burst(); await load(); return r; }
  toast('err', 'REFUSED', r.error || 'no reason given');
  return null;
}

// ---------------------------------------------------------------- derived data
function feed() { return (S.data && S.data.feed) || {}; }
function drafts() {
  const tq = S.data.text_queue || {}, eq = S.data.email_queue || {};
  const byId = {};
  (feed().touches_due || []).concat(feed().new_leads || [], feed().partners || []).forEach(r => { byId[r.person_id] = r; });
  const items = [];
  (tq.reply_first || []).forEach(r => items.push({ kind: 'text', reply: true, person_id: r.person_id, name: r.name, to: r.phone, email: r.email, last_messages: r.last_messages || [], next_action: r.next_action || '', body: '', row: byId[r.person_id] }));
  (tq.drafts || []).forEach(d => items.push({ kind: 'text', person_id: d.person_id, name: d.name, to: d.phone, body: d.text, pool: d.pool, days_quiet: d.days_quiet, row: byId[d.person_id], last_messages: (byId[d.person_id] || {}).last_messages || [] }));
  (eq.drafts || []).forEach(d => items.push({ kind: 'email', person_id: d.person_id, name: d.name, to: d.email, subject: d.subject, body: d.body, pool: d.pool, days_quiet: d.days_quiet, row: byId[d.person_id], last_messages: (byId[d.person_id] || {}).last_messages || [] }));
  const sentIds = new Set((S.data.sent_today || []).map(s => s.person_id));
  return items.filter(i => !sentIds.has(i.person_id));
}
function personRow(id) { return (feed().touches_due || []).concat(feed().new_leads || [], feed().partners || []).find(r => r.person_id === id); }
function matches(text) { return !S.q || text.toLowerCase().includes(S.q.toLowerCase()); }
function problems() { return (S.data && S.data.problems) || []; }
function statusLevel() { const p = problems(); return p.some(x => x.level === 'stop') ? 'stop' : p.length ? 'warn' : 'ok'; }

// ---------------------------------------------------------------- render
function render() {
  if (!S.data) return;
  const f = feed(), c = f.counts || {}, d = S.data;
  renderNav(c);
  // top status
  const lvl = statusLevel();
  const chip = $('#status-chip'); chip.className = 'status-chip ' + lvl;
  $('#status-word').textContent = !d.feed_ok ? 'NO FEED' : lvl === 'stop' ? 'STOP' : lvl === 'warn' ? 'ATTENTION' : 'OPTIMAL';
  S.systemWord = $('#status-word').textContent; S.systemLevel = lvl;
  const bc = $('#bell-count'); bc.hidden = !problems().length; bc.textContent = problems().length;
  // send status
  const mode = $('#mode'); mode.textContent = d.demo ? 'DEMO · DRY RUN' : d.sender === 'live' ? 'LIVE' : 'DRY RUN'; mode.className = 'mode mono' + (d.sender === 'live' && !d.demo ? ' live' : '');
  $('#mode-sub').textContent = d.demo ? 'made-up people, nothing is written' : d.sender === 'live' ? 'texts via Messages, email via Gmail' : 'set PIPELINE_SENDER=live to send';
  $('#caps-mini').innerHTML = `<div><b>${d.caps.sent_texts}/${d.caps.texts}</b>texts</div><div><b>${d.caps.sent_emails}/${d.caps.emails}</b>emails</div>`;
  const wave = $('#wave'); if (!wave.children.length) wave.innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="--d:${(i * 37) % 900}"></i>`).join('');
  document.querySelectorAll('.wave.small').forEach(w => { if (!w.children.length) w.innerHTML = Array.from({ length: 9 }, (_, i) => `<i style="--d:${(i * 97) % 700}"></i>`).join(''); });
  // bottom
  const items = drafts(), replies = items.filter(i => i.reply).length;
  $('#compose-next').textContent = !items.length ? '✉ Queue clear' : `✉ Compose next · ${replies ? replies + ' owed, ' : ''}${items.length} ready`;
  const cmd = d.command || {};
  const age = d.feed_age_minutes;
  $('#foot-chips').innerHTML = [
    chipHTML('◔', 'Feed', d.demo ? 'demo · as of ' + (f.as_of || '') : age == null ? 'none yet' : age < 60 ? `${age} min ago` : `${Math.floor(age / 60)}h ${age % 60}m ago`, age > 60 ? 'warn' : ''),
    chipHTML('⌘', 'Command', cmd.state ? cmd.state : 'no status', cmd.state === 'ok' ? '' : cmd.state ? 'warn' : ''),
    chipHTML('◉', 'Signals', f.signals && f.signals.file ? `${(f.signals.people || 0).toLocaleString()} people · ${f.signals.owes_reply || 0} owe a reply` : 'sheet only', f.signals && f.signals.file ? '' : 'warn'),
  ].join('');
  $('#refresh').classList.toggle('spin', !!(d.refresh && d.refresh.running));
  $('#refresh').innerHTML = '<span>⟳</span>';
  $('#open-sheet').hidden = !(d.links && d.links.sheet);
  // main
  const main = $('#main');
  if (d.feed_ok && f.header_ok === false) { main.innerHTML = stopScreen(f); return; }
  if (!d.feed_ok) { main.innerHTML = `<div class="stop-screen"><div class="big">NO FEED</div><p>${esc((problems()[0] || {}).text || 'feed.json is missing.')}</p><div class="acts"><button class="primary" onclick="refresh()">Run the refresh</button></div></div>`; return; }
  const views = { cc: viewCC, touches: viewTouches, tasks: viewTasks, deals: viewDeals, leads: viewLeads, queue: viewQueue, sent: viewSent };
  main.innerHTML = (views[S.view] || viewCC)();
  if (S.view === 'cc' && window.Core) { const cv = $('#core'); if (cv) Core.mount(cv, (f.counts || {}).by_band || {}); }
  reflectVoice();
  // the hero's header is absolute, so the svg gets the whole panel
  // deferred animations: bars, gauges, counters
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('[data-w]').forEach(el => el.style.width = el.dataset.w + '%');
    document.querySelectorAll('[data-h]').forEach(el => el.style.height = el.dataset.h + '%');
    document.querySelectorAll('.gauge .arc').forEach(el => el.style.strokeDashoffset = el.dataset.off);
    document.querySelectorAll('[data-count]').forEach(countUp);
  }));
}
function chipHTML(ico, label, val, cls = '') { return `<div class="chip ${cls}"><span class="ico">${ico}</span><div><span>${label}</span><b>${esc(val)}</b></div></div>`; }
function countUp(el) {
  const target = Number(el.dataset.count); if (!target) { el.textContent = '0'; return; }
  const t0 = performance.now(), dur = 900;
  (function step(t) { const p = Math.min(1, (t - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - p, 3))); el.textContent = v.toLocaleString(); if (p < 1) requestAnimationFrame(step); })(t0);
}
function renderNav(c) {
  const dr = drafts();
  const items = [
    ['cc', '⌂', 'Command Center'], ['touches', '◎', 'Touches due', (feed().touches_due || []).length, (feed().touches_due || []).some(r => r.owes_reply)],
    ['tasks', '☑', 'Tasks', (feed().tasks || []).length, c.tasks_overdue > 0], ['deals', '⌂', 'Deals', (feed().deals || []).length],
    ['leads', '✦', 'New leads', (feed().new_leads || []).length, (feed().new_leads || []).length > 0], ['queue', '✉', 'Drafts', dr.length],
    ['sent', '↗', 'Sent today', (S.data.sent_today || []).length],
  ];
  $('#nav').innerHTML = items.map(([k, ico, label, n, warn]) => `<button class="${S.view === k ? 'on' : ''}" onclick="go('${k}')"><span class="ico">${ico}</span>${label}${n ? `<span class="cnt ${warn ? 'warn' : ''}">${n}</span>` : ''}</button>`).join('');
}
function panel(i, title, right, body, extra = '') { return `<section class="panel ${extra}" style="--i:${i}"><div class="ph"><h3>${title}</h3><div class="ph-right">${right || ''}</div></div>${body}</section>`; }

// ---------------------------------------------------------------- command center
function viewCC() {
  const f = feed(), c = f.counts || {}, d = S.data;
  const owes = (f.touches_due || []).filter(r => r.owes_reply).length;
  const stats = [
    ['◎', 'Touches due', c.touches_due, owes ? `${owes} owe a reply` : 'none owe a reply', owes ? 'hot' : '', 'touches'],
    ['☑', 'Tasks open', c.tasks_open, c.tasks_overdue ? `${c.tasks_overdue} overdue` : 'none overdue', c.tasks_overdue ? 'bad' : '', 'tasks'],
    ['⌂', 'Live deals', c.deals_live, (f.deals || []).filter(x => x.stage === 'under_contract').length + ' under contract', '', 'deals'],
    ['✦', 'New leads', (f.new_leads || []).length, 'last 14 days', (f.new_leads || []).length ? 'hot' : '', 'leads'],
    ['✉', 'Drafts ready', drafts().length, `${d.caps.sent_texts + d.caps.sent_emails} sent today`, '', 'queue'],
  ];
  const row1 = `<div class="cc-row1">
    ${panel(2, 'CRM overview', '', `<div class="stat-list">${stats.map(([i, l, n, s, cls, v]) => `<div class="stat" onclick="go('${v}')"><span class="ico">${i}</span><div><b data-count="${n || 0}">0</b><small class="${cls}">${esc(s)}</small></div></div>`).join('')}</div>`)}
    ${panel(3, 'Pipeline core', `<span class="tag live">● LIVE</span>`, hero(f), 'hero')}
    ${panel(4, 'Live feed', `<button class="link" onclick="go('touches')">View all ›</button>`, `<div class="feed-list">${liveFeed()}</div>`)}
  </div>`;
  const deals = (f.deals || []).slice(0, 6);
  const row2 = `<div class="cc-row2">
    ${panel(5, 'Active deals', `<button class="link" onclick="go('deals')">View all ›</button>`, deals.length ? `<div class="cards">${deals.map((x, i) => dealCard(x, i)).join('')}</div>` : `<div class="empty"><b>No live deals</b>Deals come from Gmail ingest or the Quick command below.</div>`)}
    ${panel(6, "Today's timeline", `<span>${todayISO()}</span>`, timeline())}
    ${panel(7, 'Quick commands', '', `<div class="qc">
      <button style="--i:0" onclick="composeNext()"><span class="ico">✉</span>Compose next draft</button>
      <button style="--i:1" onclick="openTask()"><span class="ico">＋</span>New task</button>
      <button style="--i:2" onclick="openDeal()"><span class="ico">⌂</span>Add or edit a deal</button>
      <button style="--i:3" onclick="refresh()"><span class="ico">⟳</span>Refresh feed (ingest + feed)</button>
      <button style="--i:4" onclick="window.open('${esc(d.links.command)}')"><span class="ico">⌘</span>Open Command</button>
    </div>`)}
  </div>`;
  const row3 = `<div class="cc-row3">
    ${panel(8, 'Send monitor', `<span>${d.demo ? 'demo' : d.sender === 'live' ? 'live' : 'dry run'}</span>`, gauges())}
    ${panel(9, 'Pipeline insights', '', insights())}
    ${panel(10, 'Sources', `<span>${sourcesOK()} connected</span>`, sources())}
  </div>`;
  return `<div class="cc">${row1}${row2}${row3}</div>`;
}
function hero(f) {
  const v = Voice.state();
  return `<div class="scan"></div><canvas id="core"></canvas>
  <div class="hero-text"><div><div class="hero-title">PIPELINE</div><div class="hero-sub">AIRE CORE</div><div class="hero-ver">as of ${esc(f.as_of || '')} · feed ${esc((f.generated_at || '').slice(11, 16))}</div></div></div>
  <div class="hero-corner tl">CRM · ${esc(String((f.counts || {}).contacts || 0))} PEOPLE</div><div class="hero-corner tr">SIGNALS · ${f.signals && f.signals.file ? 'IMESSAGE' : 'NONE'} · VOICE · ${v.on ? v.state.toUpperCase() : v.supported ? 'OFF' : 'TYPE ONLY'}</div>
  <div class="tele" id="tele">${teleHTML()}</div><div class="heard" id="heard">${esc(S.lastHeard || '')}</div>`;
}
const TELE = [];
function tele(text, strong) { TELE.push({ at: new Date(), text, strong }); if (TELE.length > 30) TELE.shift(); const el = $('#tele'); if (el) el.innerHTML = teleHTML(); }
function teleHTML() { return TELE.slice(-4).map(t => `<div>${t.at.toTimeString().slice(0, 8)} ${t.strong ? '<b>' + esc(t.text) + '</b>' : esc(t.text)}</div>`).join(''); }
function liveFeed() {
  const f = feed(), items = [];
  (f.touches_due || []).filter(r => r.owes_reply).slice(0, 4).forEach(r => items.push({ cls: 'reply', ico: '↩', b: `${r.display} texted you`, s: (r.last_messages || [])[0] ? r.last_messages[r.last_messages.length - 1].replace(/^\d{4}-\d{2}-\d{2}: /, '') : 'owes a reply', tag: 'REPLY', tcls: 'reply', on: `openCompose('${r.person_id}')` }));
  (f.tasks || []).filter(t => t.overdue).slice(0, 2).forEach(t => items.push({ cls: 'task', ico: '!', b: `${t.task} is overdue`, s: `${t.display || 'no person'} · due ${t.due}`, tag: 'OVERDUE', tcls: 'stop', on: `go('tasks')` }));
  (f.new_leads || []).slice(0, 2).forEach(l => items.push({ cls: 'lead', ico: '✦', b: `New lead: ${l.display}`, s: `${l.source} · ${l.next_action || ''}`, tag: 'LEAD', tcls: 'live', on: `openCompose('${l.person_id}')` }));
  (f.deals || []).slice().sort((a, b) => (b.last_event_at || '').localeCompare(a.last_event_at || '')).slice(0, 2).forEach(x => items.push({ cls: 'deal', ico: '⌂', b: x.address, s: x.last_event || x.next_step || x.stage, tag: x.stage.replace('_', ' ').toUpperCase(), tcls: 'violet', on: `openDeal('${esc(x.address)}')` }));
  (f.touches_due || []).filter(r => !r.owes_reply && r.band === 'hot').slice(0, 2).forEach(r => items.push({ cls: '', ico: '◎', b: `${r.display} is due`, s: r.next_action || quiet(r), tag: 'HOT', tcls: 'hot', on: `openCompose('${r.person_id}')` }));
  if (!items.length) return `<div class="empty"><b>All quiet</b>Nothing owes a reply, nothing overdue.</div>`;
  return items.slice(0, 8).map((x, i) => `<div class="feed-item" style="--i:${i}" onclick="${x.on}"><span class="ico ${x.cls}">${x.ico}</span><div class="body"><b>${esc(x.b)}</b><small>${esc(x.s)}</small></div><span class="tag ${x.tcls}">${x.tag}</span></div>`).join('');
}
function dealCard(x, i) {
  const stages = S.data.stages || [], pos = Math.max(0, stages.indexOf(x.stage)), pct = Math.round(((pos + 1) / 5) * 100);
  return `<div class="card" style="--i:${i}" onclick="openDeal('${esc(x.address)}')"><span class="ico">${x.side === 'buyer' ? '◇' : '⌂'}</span><b>${esc(x.address)}</b><small>${esc([x.display, money(x.price), x.expected_close ? 'closes ' + x.expected_close : ''].filter(Boolean).join(' · ') || x.source)}</small><div class="bar"><i data-w="${Math.min(100, pct)}"></i></div><div class="stage">${esc(x.stage.replace('_', ' '))}${x.next_step ? ' · ' + esc(x.next_step) : ''}</div></div>`;
}
function timeline() {
  const t = (feed().tasks || []).slice(0, 7);
  if (!t.length) return `<div class="empty"><b>No open tasks</b></div>`;
  return `<div class="tl">${t.map((x, i) => `<div class="tl-item ${x.overdue ? 'over' : ''} ${x.task_id ? '' : 'na'}" style="--i:${i}" onclick="go('tasks')"><span class="when">${esc(dayName(x.due))}</span><span class="node"></span><div><b>${esc(x.task)}</b><small>${esc(x.display || x.source)}</small></div><span class="st">${x.overdue ? 'LATE' : x.due === todayISO() ? 'TODAY' : 'OPEN'}</span></div>`).join('')}</div>`;
}
function gauge(label, val, max, cls) {
  const r = 36, C = 2 * Math.PI * r, pct = max ? Math.min(1, val / max) : 0;
  return `<div class="gauge ${cls}"><svg viewBox="0 0 86 86"><circle class="track" cx="43" cy="43" r="${r}"/><circle class="arc" cx="43" cy="43" r="${r}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-off="${(C * (1 - pct)).toFixed(1)}"/></svg><div class="val">${val}<small>of ${max}</small></div><div class="lbl">${label}</div></div>`;
}
function gauges() {
  const c = S.data.caps, age = S.data.feed_age_minutes == null ? 0 : S.data.feed_age_minutes;
  return `<div class="gauges">${gauge('texts', c.sent_texts, c.texts, c.sent_texts >= c.texts ? 'red' : c.sent_texts > c.texts * .8 ? 'amber' : '')}${gauge('emails', c.sent_emails, c.emails, c.sent_emails >= c.emails ? 'red' : '')}${gauge('feed min', Math.min(age, 999), 60, age > 60 ? 'red' : age > 30 ? 'amber' : '')}</div>`;
}
function insights() {
  const f = feed(), b = (f.counts || {}).by_band || {}, max = Math.max(1, ...Object.values(b));
  const order = ['hot', 'warm', 'lukewarm', 'cold', 'ice-cold'];
  const owes = (f.touches_due || []).filter(r => r.owes_reply).length;
  return `<div class="insight"><div class="bands">${order.map(k => `<div class="band ${k}"><i data-h="${Math.round(100 * (b[k] || 0) / max)}" data-v="${(b[k] || 0).toLocaleString()}"></i><small>${k}</small></div>`).join('')}</div>
  <div class="kv"><div>OWE A REPLY<b>${owes}</b></div><div>DUE TODAY<b>${(f.counts || {}).touches_due || 0}</b></div><div>CADENCE<b style="font-size:11px">hot ${(f.cadence_days || {}).hot || 7}d · warm ${(f.cadence_days || {}).warm || 14}d</b></div></div></div>`;
}
function sourceRows() {
  const d = S.data, f = feed(), cmd = d.command || {}, age = d.feed_age_minutes;
  const tq = d.text_queue || {}, eq = d.email_queue || {};
  return [
    ['◔', 'CRM feed', d.feed_ok ? (age == null || age <= 60 ? 'ok' : 'warn') : 'stop', d.feed_ok ? `feed.json · ${f.as_of || ''}` : 'missing'],
    ['◉', 'iMessage signals', f.signals && f.signals.file ? 'ok' : 'warn', f.signals && f.signals.file ? `${f.signals.people} people` : 'not in this feed'],
    ['⌘', 'Command reader', cmd.state === 'ok' ? 'ok' : cmd.state ? 'warn' : 'off', cmd.state || 'no status.json'],
    ['✉', 'Email drafts', eq.drafts ? 'ok' : 'off', eq.drafts ? `${eq.drafts.length} ready` : 'no queue yet'],
    ['▭', 'Text drafts', tq.drafts ? 'ok' : 'off', tq.drafts ? `${tq.drafts.length} + ${(tq.reply_first || []).length} replies` : 'no queue yet'],
    ['↗', 'Sender', d.demo ? 'warn' : d.sender === 'live' ? 'ok' : 'warn', d.demo ? 'demo' : d.sender === 'live' ? 'Messages + Gmail' : 'dry run'],
  ];
}
function sourcesOK() { return sourceRows().filter(r => r[2] === 'ok').length; }
function sources() { return `<div class="src">${sourceRows().map(([i, n, st, s], k) => `<div class="${st}" style="--i:${k}"><span class="ico">${i}</span><div><b>${n}</b><small>${esc(s)}</small></div></div>`).join('')}</div>`; }
function stopScreen(f) {
  return `<div class="stop-screen"><div><div class="big">HEADER CHANGED</div><p>The Contacts tab of the AIRE CRM sheet lost a column the engine needs: <code>${esc((f.missing_columns || []).join(', ') || 'unknown')}</code>. Nothing on this screen can be trusted until the header is restored, so Pipeline shows nothing else.</p><p>Put the column back in the sheet, then run the refresh.</p><div class="acts" style="justify-content:center"><button class="primary" onclick="refresh()">Refresh feed</button><button onclick="window.open('${esc(S.data.links.sheet)}')">Open the sheet</button></div></div></div>`;
}

// ---------------------------------------------------------------- list views
function filterBar(opts) { return `<div class="filters">${opts.map(([k, l]) => `<button class="${S.filter === k ? 'on' : ''}" onclick="setFilter('${k}')">${l}</button>`).join('')}</div>`; }
function viewTouches() {
  let rows = (feed().touches_due || []).filter(r => matches(`${r.display} ${r.phone} ${r.email} ${r.next_action} ${r.stage}`));
  if (S.filter === 'reply') rows = rows.filter(r => r.owes_reply); else if (S.filter === 'hot') rows = rows.filter(r => r.band === 'hot'); else if (S.filter === 'warm') rows = rows.filter(r => r.band === 'warm');
  const body = rows.length ? `<div class="rows">${rows.slice(0, 200).map((r, i) => touchRow(r, i)).join('')}</div>` : `<div class="empty"><b>Nobody here</b>${S.q ? 'Nothing matches the search.' : 'Every touch is logged.'}</div>`;
  return `<div class="view">${panel(0, `Touches due · ${rows.length}`, filterBar([['all', 'ALL'], ['reply', 'OWE A REPLY'], ['hot', 'HOT'], ['warm', 'WARM']]), body)}</div>`;
}
function touchRow(r, i) {
  const last = (r.last_messages || []).slice(-1)[0];
  return `<div class="row ${r.owes_reply ? 'reply' : ''}" style="--i:${i}">
    <span class="ico ${r.band}">${initials(r.display)}</span>
    <div class="who"><b>${esc(r.display || r.phone)}</b><small><span class="tag ${r.band}">${esc(r.band)}</span>${r.owes_reply ? '<span class="tag reply">REPLY</span>' : ''}<span>${esc(r.stage || '')}</span><span>${esc(fmtPhone(r.phone) || r.email || '')}</span></small></div>
    <div class="why"><b>${esc(r.next_action || (r.owes_reply ? 'They texted last. Answer first.' : 'Time for a touch'))}</b>${last ? `<span class="msg">“${esc(last.replace(/^\d{4}-\d{2}-\d{2}: /, ''))}”</span>` : `<span>${quiet(r)}${r.signal_score ? ' · score ' + r.signal_score : ''}</span>`}</div>
    <div class="acts"><button class="primary" onclick="openCompose('${r.person_id}')">✉ Compose</button><button onclick="touched('${r.person_id}')">✓ Touched</button><button onclick="openTask('${r.person_id}')">＋ Task</button><button onclick="openNote('${r.person_id}')">✎ Note</button><button class="danger" onclick="openDNC('${r.person_id}')">⊘</button></div>
  </div>`;
}
function viewTasks() {
  let rows = (feed().tasks || []).filter(t => matches(`${t.task} ${t.display} ${t.source}`));
  if (S.filter === 'over') rows = rows.filter(t => t.overdue); else if (S.filter === 'today') rows = rows.filter(t => t.due === todayISO()); else if (S.filter === 'na') rows = rows.filter(t => !t.task_id);
  rows = rows.slice().sort((a, b) => (b.overdue - a.overdue) || (a.due || '9').localeCompare(b.due || '9'));
  const body = rows.length ? `<div class="rows">${rows.map((t, i) => `<div class="row" style="--i:${i}">
    <span class="ico ${t.overdue ? 'hot' : ''}">${t.overdue ? '!' : '☑'}</span>
    <div class="who"><b>${esc(t.task)}</b><small><span>${esc(t.display || 'no person')}</span><span class="tag ${t.task_id ? 'info' : 'warn'}">${t.task_id ? esc(t.source) : 'NEXT ACTION'}</span></small></div>
    <div class="why"><b>${esc(dayName(t.due))}</b><span>${esc(t.due)}${t.overdue ? ' · overdue' : ''}</span></div>
    <div class="acts"><button class="primary" onclick="doneTask('${t.task_id}','${t.person_id}',${JSON.stringify(t.task).replace(/"/g, '&quot;')})">✓ Done</button>${t.person_id ? `<button onclick="openCompose('${t.person_id}')">✉</button>` : ''}</div>
  </div>`).join('')}</div>` : `<div class="empty"><b>No open tasks</b></div>`;
  return `<div class="view">${panel(0, `Tasks · ${rows.length}`, `${filterBar([['all', 'ALL'], ['over', 'OVERDUE'], ['today', 'TODAY'], ['na', 'NEXT ACTION']])} <button class="link" onclick="openTask()">＋ New task</button>`, body)}</div>`;
}
function viewDeals() {
  const rows = (feed().deals || []).filter(x => matches(`${x.address} ${x.display} ${x.stage} ${x.next_step}`));
  const body = rows.length ? `<div class="rows">${rows.map((x, i) => `<div class="row" style="--i:${i}">
    <span class="ico">${x.side === 'buyer' ? '◇' : '⌂'}</span>
    <div class="who"><b>${esc(x.address)}</b><small><span class="tag violet">${esc(x.stage.replace('_', ' '))}</span><span>${esc(x.side)}</span><span>${esc(x.display)}</span>${x.price ? `<span>${money(x.price)}</span>` : ''}${x.expected_close ? `<span>closes ${x.expected_close}</span>` : ''}</small></div>
    <div class="why"><b>${esc(x.next_step || 'no next step')}</b><span>${esc(x.last_event || '')}${x.last_event_at ? ' · ' + x.last_event_at.slice(0, 10) : ''} · ${esc(x.source)}</span></div>
    <div class="acts"><button class="primary" onclick="openDeal('${esc(x.address)}')">✎ Edit</button>${x.person_id ? `<button onclick="openCompose('${x.person_id}')">✉</button>` : ''}</div>
  </div>`).join('')}</div>` : `<div class="empty"><b>No live deals</b></div>`;
  return `<div class="view">${panel(0, `Deals · ${rows.length}`, `<button class="link" onclick="openDeal()">＋ Add a deal</button>`, body)}</div>`;
}
function viewLeads() {
  const rows = (feed().new_leads || []).filter(l => matches(`${l.display} ${l.source} ${l.email} ${l.phone}`));
  const body = rows.length ? `<div class="rows">${rows.map((l, i) => `<div class="row" style="--i:${i}">
    <span class="ico">${initials(l.display)}</span>
    <div class="who"><b>${esc(l.display)}</b><small><span class="tag live">NEW</span><span>${esc(fmtPhone(l.phone) || l.email || '')}</span></small></div>
    <div class="why"><b>${esc(l.next_action || 'Reach out')}</b><span>${esc(l.source)} · received ${esc(l.received)}</span></div>
    <div class="acts"><button class="primary" onclick="openCompose('${l.person_id}')">✉ Compose</button><button onclick="touched('${l.person_id}')">✓ Touched</button><button onclick="openTask('${l.person_id}')">＋ Task</button></div>
  </div>`).join('')}</div>` : `<div class="empty"><b>No new leads in the last 14 days</b></div>`;
  return `<div class="view">${panel(0, `New leads · ${rows.length}`, 'last 14 days', body)}</div>`;
}
function viewQueue() {
  const items = drafts().filter(d => matches(`${d.name} ${d.body} ${d.subject}`));
  const body = items.length ? `<div class="rows">${items.map((d, i) => `<div class="row ${d.reply ? 'reply' : ''}" style="--i:${i}">
    <span class="ico">${d.kind === 'text' ? '▭' : '✉'}</span>
    <div class="who"><b>${esc(d.name)}</b><small>${d.reply ? '<span class="tag reply">REPLY FIRST</span>' : `<span class="tag info">${esc(d.pool || '')}</span>`}<span>${esc(d.kind === 'text' ? fmtPhone(d.to) : d.to)}</span></small></div>
    <div class="why"><b>${esc(d.reply ? 'No template. Read what they said and answer.' : d.subject || d.body.split('\n')[0])}</b><span class="msg">${esc(d.reply ? (d.last_messages.slice(-1)[0] || '').replace(/^\d{4}-\d{2}-\d{2}: /, '') : d.body.slice(0, 110))}</span></div>
    <div class="acts"><button class="primary" onclick="openCompose('${d.person_id}', ${i})">✉ Open</button></div>
  </div>`).join('')}</div>` : `<div class="empty"><b>Queue is clear</b>Drafts come from follow-up/out/*.json after the refresh.</div>`;
  return `<div class="view">${panel(0, `Compose queue · ${items.length}`, `${S.data.caps.sent_texts}/${S.data.caps.texts} texts · ${S.data.caps.sent_emails}/${S.data.caps.emails} emails today`, body)}</div>`;
}
function viewSent() {
  const rows = (S.data.sent_today || []).slice().reverse();
  const body = rows.length ? `<div class="rows">${rows.map((s, i) => `<div class="row" style="--i:${i}">
    <span class="ico">${s.kind === 'text' ? '▭' : '✉'}</span>
    <div class="who"><b>${esc(s.display || s.person_id)}</b><small><span class="tag ${s.status === 'sent' ? 'live' : 'warn'}">${esc(s.status.toUpperCase())}</span><span>${esc(s.kind === 'text' ? fmtPhone(s.to) : s.to)}</span></small></div>
    <div class="why"><b>${esc(s.subject || `${s.chars} characters`)}</b><span>${esc(s.at.slice(11, 16))} · ${esc(s.detail || '')}</span></div><div></div>
  </div>`).join('')}</div>` : `<div class="empty"><b>Nothing sent today</b></div>`;
  return `<div class="view">${panel(0, `Sent today · ${rows.length}`, 'out/send-log.json', body)}</div>`;
}

// ---------------------------------------------------------------- navigation
function go(v) { S.view = v; S.filter = 'all'; render(); $('#main').scrollTop = 0; }
function setFilter(k) { S.filter = k; render(); }
async function refresh() {
  const r = await api('/api/refresh', {});
  if (r.ok) toast('ok', 'REFRESH', 'Rebuilding the feed in the background.');
  const t = setInterval(async () => { const st = await api('/api/refresh'); if (!st.running) { clearInterval(t); toast(st.ok ? 'ok' : 'err', 'FEED', st.detail || (st.ok ? 'feed rebuilt' : 'refresh failed')); load(); } }, 2000);
  load();
}

// ---------------------------------------------------------------- actions
async function touched(id) {
  const r = personRow(id); const what = await ask('Touched', `What happened with ${r ? r.display : id}?`, 'Called, left a voicemail'); if (what == null) return;
  await act('/api/touch', { person_id: id, what }, { tag: 'LOGGED', text: `Touch logged for ${r ? r.display : id}` });
}
async function doneTask(task_id, person_id, task) {
  const r = await act('/api/done', { task_id, person_id, task }, { tag: 'DONE', text: task });
  if (r && r.result && r.result.synced) toast('ok', 'SYNCED', 'Next_Action rows were synced to the Tasks tab first.');
}

// ---- compose drawer
function composeNext() { const items = drafts(); if (!items.length) { toast('warn', 'QUEUE', 'Nothing to compose. Run the refresh for new drafts.'); return; } openCompose(items[0].person_id, 0); }
function openCompose(person_id, idx) {
  const items = drafts(); let item = idx != null ? items[idx] : items.find(d => d.person_id === person_id);
  const row = personRow(person_id) || (item && item.row) || {};
  if (!item) item = { kind: row.phone ? 'text' : 'email', person_id, name: row.display || person_id, to: row.phone || row.email || '', body: '', subject: '', last_messages: row.last_messages || [], next_action: row.next_action || '' };
  S.compose = { ...item, row, kind: item.kind };
  S.queueIdx = items.indexOf(item);
  renderDrawer();
}
function renderDrawer() {
  const c = S.compose, d = S.data, row = c.row || {}, dry = d.demo || d.sender !== 'live';
  const canText = !!(row.phone || (c.kind === 'text' && c.to)), canEmail = !!(row.email || (c.kind === 'email' && c.to));
  const to = c.kind === 'text' ? (row.phone || c.to) : (row.email || c.to);
  const cap = c.kind === 'text' ? d.caps.texts - d.caps.sent_texts : d.caps.emails - d.caps.sent_emails;
  const items = drafts(); const pos = S.queueIdx >= 0 ? `${S.queueIdx + 1} of ${items.length}` : 'not in queue';
  $('#drawer').hidden = false;
  $('#drawer').innerHTML = `<section class="panel"><div class="dh"><span class="ico">${initials(c.name)}</span><div class="who"><b>${esc(c.name)}</b><small>${row.band ? `<span class="tag ${row.band}">${esc(row.band)}</span>` : ''}${c.reply ? '<span class="tag reply">REPLY FIRST</span>' : ''}<span>${esc(row.stage || c.pool || '')}</span><span>${esc(quiet(row))}</span><span>id ${esc(c.person_id)}</span></small></div><button class="x" onclick="closeDrawer()">×</button></div>
  <div class="dbody">
    ${c.last_messages && c.last_messages.length ? `<div class="msgs"><span class="lbl">THEIR LAST TEXTS</span>${c.last_messages.map((m, i) => { const mm = /^(\d{4}-\d{2}-\d{2}): (.*)$/.exec(m); return `<div class="bubble" style="--i:${i}"><small>${esc(mm ? mm[1] : '')}</small>${esc(mm ? mm[2] : m)}</div>`; }).join('')}</div>` : ''}
    ${c.next_action || row.next_action ? `<div class="bubble note">Your note: ${esc(c.next_action || row.next_action)}</div>` : ''}
    <div class="seg"><button class="${c.kind === 'text' ? 'on' : ''}" ${canText ? '' : 'disabled'} onclick="setKind('text')">▭ TEXT</button><button class="${c.kind === 'email' ? 'on' : ''}" ${canEmail ? '' : 'disabled'} onclick="setKind('email')">✉ EMAIL</button></div>
    <div class="field"><label>TO</label><input id="c-to" value="${esc(to)}" ${to ? 'readonly' : ''} placeholder="${c.kind === 'text' ? 'no phone on file' : 'no email on file'}"></div>
    ${c.kind === 'email' ? `<div class="field"><label>SUBJECT</label><input id="c-subject" value="${esc(c.subject || '')}" placeholder="Subject"></div>` : ''}
    <div class="field"><label>${c.kind === 'text' ? 'TEXT' : 'EMAIL'} DRAFT${c.reply ? ' · write it yourself, they texted last' : c.pool ? ' · from the ' + esc(c.pool) + ' pool' : ''}</label><textarea id="c-body" placeholder="${c.reply ? 'Answer what they said.' : 'Write the message.'}">${esc(c.body || '')}</textarea><div class="hint"><span id="c-count">${(c.body || '').length} chars</span><span>${cap} ${c.kind}${cap === 1 ? '' : 's'} left today</span></div></div>
  </div>
  <div class="dfoot"><button class="send-btn ${dry ? 'dry' : ''}" id="send" onclick="sendNow()">${dry ? 'DRY RUN SEND' : 'SEND'}</button><button class="ghost-btn" onclick="touchFromCompose()">✓ Touched, no message</button><span class="spacer"></span><span class="mono" style="font-size:9px;color:var(--dim)">${pos}</span><button class="ghost-btn" onclick="nextInQueue()">Skip ›</button></div></section>`;
  const ta = $('#c-body'); ta.addEventListener('input', () => { $('#c-count').textContent = ta.value.length + ' chars'; }); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
}
function setKind(k) { const c = S.compose; c.kind = k; c.body = $('#c-body').value; if (k === 'email' && !c.subject) c.subject = 'Checking in'; renderDrawer(); }
function closeDrawer() { $('#drawer').hidden = true; S.compose = null; }
function nextInQueue() { const items = drafts(); if (!items.length) { closeDrawer(); return; } const n = (S.queueIdx + 1) % items.length; openCompose(items[n].person_id, n); }
async function sendNow() {
  const c = S.compose, btn = $('#send'); btn.disabled = true; btn.classList.add('charging');
  const body = { kind: c.kind, person_id: c.person_id, to: $('#c-to').value, body: $('#c-body').value, subject: c.kind === 'email' ? $('#c-subject').value : '', display: c.name };
  const r = await api('/api/send', body);
  btn.disabled = false; btn.classList.remove('charging');
  if (!r.ok) { toast('err', 'NOT SENT', r.error); return; }
  toast(r.result.status === 'sent' ? 'ok' : 'warn', r.result.status === 'sent' ? 'SENT' : 'DRY RUN', `${c.kind} to ${c.name} ${r.result.status === 'sent' ? 'is on its way and logged in the CRM' : 'logged, nothing left the Mac'}`);
  await load();
  const items = drafts(); if (items.length) openCompose(items[Math.min(S.queueIdx, items.length - 1)].person_id, Math.min(S.queueIdx, items.length - 1)); else closeDrawer();
}
async function touchFromCompose() { const c = S.compose; const what = await ask('Touched', `What happened with ${c.name}?`, 'Called'); if (what == null) return; const r = await act('/api/touch', { person_id: c.person_id, what }, { tag: 'LOGGED', text: `Touch logged for ${c.name}` }); if (r) nextInQueue(); }

// ---- modals
function modal(title, bodyHTML, onOK, okLabel = 'Save') {
  return new Promise(resolve => {
    const m = $('#modal'); m.hidden = false;
    m.innerHTML = `<section class="panel"><div class="dh"><div class="who"><b>${title}</b></div><button class="x" onclick="closeModal()">×</button></div><div class="dbody">${bodyHTML}</div><div class="dfoot"><button class="send-btn" id="m-ok">${okLabel}</button><button class="ghost-btn" onclick="closeModal()">Cancel</button></div></section>`;
    m._resolve = resolve;
    $('#m-ok').onclick = async () => { const v = onOK(m); if (v === false) return; closeModal(); resolve(v); };
    const first = m.querySelector('input, textarea, select'); if (first) first.focus();
    m.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') $('#m-ok').click(); }));
  });
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; if (m._resolve) { m._resolve(null); m._resolve = null; } }
function ask(title, label, placeholder) { return modal(title, `<div class="field"><label>${esc(label.toUpperCase())}</label><input id="m-in" placeholder="${esc(placeholder)}"></div>`, m => { const v = $('#m-in', m).value.trim(); return v || false; }, 'Log it'); }
function personSelect(selected) {
  const rows = (feed().touches_due || []).concat(feed().new_leads || [], feed().partners || []);
  return `<select id="m-person"><option value="">pick a person</option>${rows.map(r => `<option value="${esc(r.person_id)}" ${r.person_id === selected ? 'selected' : ''}>${esc(r.display)} · ${esc(r.band || r.source || '')}</option>`).join('')}</select>`;
}
async function openTask(person_id = '') {
  const v = await modal('New task', `<div class="field"><label>PERSON</label>${personSelect(person_id)}</div><div class="field"><label>TASK</label><input id="m-task" placeholder="Call back about the inspection"></div><div class="field"><label>DUE</label><input id="m-due" type="date" value="${todayISO()}"></div>`,
    m => ({ person_id: $('#m-person', m).value, task: $('#m-task', m).value.trim(), due: $('#m-due', m).value }) , 'Add task');
  if (v) await act('/api/task', v, { tag: 'TASK', text: v.task });
}
async function openNote(person_id) {
  const r = personRow(person_id);
  const v = await modal(`Note on ${esc(r ? r.display : person_id)}`, `<div class="field"><label>NOTE</label><textarea id="m-note" style="min-height:90px" placeholder="What you learned"></textarea></div>`, m => $('#m-note', m).value.trim() || false, 'Save note');
  if (v) await act('/api/note', { person_id, text: v }, { tag: 'NOTE', text: 'Saved to the CRM' });
}
async function openDNC(person_id) {
  const r = personRow(person_id);
  const v = await modal(`Do Not Contact: ${esc(r ? r.display : person_id)}`, `<p style="color:var(--amber);margin:0 0 6px">One way. The engine never sets it back to NO. They drop off every list.</p><div class="field"><label>REASON</label><input id="m-reason" placeholder="Asked us to stop"></div>`, m => $('#m-reason', m).value.trim() || false, 'Set Do Not Contact');
  if (v) await act('/api/dnc', { person_id, reason: v }, { tag: 'DNC', text: `${r ? r.display : person_id} will not be contacted` });
}
async function openDeal(address = '') {
  const x = (feed().deals || []).find(d => d.address === address) || {};
  const stages = S.data.stages || [];
  const v = await modal(x.address ? `Edit ${esc(x.address)}` : 'Add a deal', `
    <div class="field"><label>STREET ADDRESS</label><input id="m-addr" value="${esc(x.address || '')}" ${x.address ? 'readonly' : ''} placeholder="2179 S Turnberry Ave"></div>
    <div class="field"><label>STAGE</label><select id="m-stage">${stages.map(s => `<option value="${s}" ${s === x.stage ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}</select></div>
    ${x.address ? '' : `<div class="field"><label>SIDE</label><select id="m-side"><option value="buyer">buyer</option><option value="seller">seller</option></select></div>`}
    <div class="field"><label>PRICE</label><input id="m-price" value="${esc(x.price || '')}" placeholder="329000"></div>
    <div class="field"><label>EXPECTED CLOSE</label><input id="m-close" type="date" value="${esc(x.expected_close || '')}"></div>
    <div class="field"><label>NEXT STEP</label><input id="m-next" value="${esc(x.next_step || '')}" placeholder="Inspection Friday"></div>
    <div class="field"><label>EVENT (optional, logs what just happened)</label><input id="m-event" placeholder="Offer accepted"></div>`,
    m => ({ address: $('#m-addr', m).value.trim(), stage: $('#m-stage', m).value, price: $('#m-price', m).value.trim(), close: $('#m-close', m).value, next_step: $('#m-next', m).value.trim(), event: $('#m-event', m).value.trim(), expect: x.stage || '', create: !x.address, side: x.address ? '' : $('#m-side', m).value }), x.address ? 'Save deal' : 'Add deal');
  if (v) await act('/api/deal', v, { tag: 'DEAL', text: `${v.address} · ${v.stage.replace('_', ' ')}` });
}
function openBrief() {
  const f = feed(), c = f.counts || {}, owes = (f.touches_due || []).filter(r => r.owes_reply), over = (f.tasks || []).filter(t => t.overdue), dr = drafts();
  modal('Morning brief', `<div class="brief">
    <h4>FIRST</h4><ul>${owes.length ? owes.slice(0, 5).map(r => `<li>Answer <b>${esc(r.display)}</b>: ${esc((r.last_messages || []).slice(-1)[0] || '').replace(/^\d{4}-\d{2}-\d{2}: /, '')}</li>`).join('') : '<li>Nobody is waiting on a reply.</li>'}</ul>
    <h4>OVERDUE</h4><ul>${over.length ? over.map(t => `<li>${esc(t.task)} · ${esc(t.display || '')}</li>`).join('') : '<li>Nothing overdue.</li>'}</ul>
    <h4>NEW LEADS</h4><ul>${(f.new_leads || []).length ? f.new_leads.map(l => `<li><b>${esc(l.display)}</b> · ${esc(l.source)} · ${esc(l.next_action || '')}</li>`).join('') : '<li>None in the last 14 days.</li>'}</ul>
    <h4>DEALS</h4><ul>${(f.deals || []).length ? f.deals.map(x => `<li><b>${esc(x.address)}</b> · ${esc(x.stage.replace('_', ' '))}${x.next_step ? ' · ' + esc(x.next_step) : ''}</li>`).join('') : '<li>No live deals.</li>'}</ul>
    <h4>TODAY'S DRAFTS</h4><ul><li>${dr.length} ready (${dr.filter(d => d.kind === 'text').length} texts, ${dr.filter(d => d.kind === 'email').length} emails). Cap ${S.data.caps.texts} and ${S.data.caps.emails}.</li></ul>
  </div>`, () => true, 'Start with the first reply').then(v => { if (v) composeNext(); });
}
function openProblems() {
  const p = problems();
  modal('What needs attention', p.length ? `<div class="rows">${p.map((x, i) => `<div class="row" style="--i:${i};grid-template-columns:auto 1fr"><span class="tag ${x.level}">${x.level.toUpperCase()}</span><div class="why"><b>${esc(x.text)}</b></div></div>`).join('')}</div>` : `<div class="empty"><b>All clear</b></div>`,
    () => (p.some(x => x.code.startsWith('command')) ? 'command' : true), p.some(x => x.code.startsWith('command')) ? 'Open Command' : 'OK').then(v => { if (v === 'command') window.open(S.data.links.command); });
}
function openHelp() {
  modal('Keys', `<div class="brief"><ul><li><kbd>1</kbd> to <kbd>7</kbd> switch views</li><li><kbd>c</kbd> compose the next draft</li><li><kbd>v</kbd> voice on or off, <kbd>t</kbd> type a command</li><li><kbd>r</kbd> refresh the feed</li><li><kbd>/</kbd> search</li><li><kbd>Esc</kbd> close</li></ul><h4>VOICE</h4><ul><li>Say "hey Pipeline", then: brief, who texted me, touches, tasks, deals, leads, compose, refresh, status, stop.</li><li>Every answer is read from the feed. Nothing is made up and nothing is sent by voice.</li></ul><h4>WHERE THINGS GO</h4><ul><li>Every action is one <code>crm.py --json --client pipeline</code> call and shows in the Connector Log with Client = pipeline.</li><li>Sends are checked for Do Not Contact and the daily cap, then logged to <code>out/send-log.json</code>.</li></ul></div>`, () => true, 'OK');
}

// ---------------------------------------------------------------- toasts, clock, keys, boot
function toast(kind, tag, text) { const t = document.createElement('div'); t.className = 'toast ' + (kind === 'ok' ? '' : kind); t.innerHTML = `<b>${esc(tag)}</b><span>${esc(text)}</span>`; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3700); }
function tick() { const d = new Date(); $('#date').textContent = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); $('#time').textContent = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).toLowerCase(); }
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select')) { if (e.key === 'Escape') e.target.blur(); return; }
  const views = ['cc', 'touches', 'tasks', 'deals', 'leads', 'queue', 'sent'];
  if (/^[1-7]$/.test(e.key)) go(views[Number(e.key) - 1]);
  else if (e.key === 'c') composeNext(); else if (e.key === 'r') refresh(); else if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
  else if (e.key === 'v') $('#mic').click(); else if (e.key === 't') { e.preventDefault(); $('#type-cmd').focus(); }
  else if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else closeDrawer(); }
});
$('#search').addEventListener('input', e => { S.q = e.target.value; if (S.view === 'cc' && S.q) S.view = 'touches'; render(); });
$('#refresh').onclick = refresh; $('#bell').onclick = openProblems; $('#help').onclick = openHelp; $('#brief').onclick = openBrief; $('#compose-next').onclick = composeNext;

// ---------------------------------------------------------------- voice
function reflectVoice() {
  const v = Voice.state(), st = v.on ? v.state : 'off';
  const mic = $('#mic'); mic.className = 'orb ' + (v.on ? 'on ' + v.state : 'off');
  const vs = $('#voice-state'); vs.className = 'voice-state mono ' + (v.on ? v.state : ''); vs.textContent = !v.supported ? 'no mic here · type below' : !v.on ? 'tap to talk' : v.state === 'idle' ? (v.awake ? 'listening' : 'say "hey Pipeline"') : v.state;
  const talk = $('#talk'); talk.classList.toggle('on', v.on);
  $('#talk-title').textContent = v.on ? (v.state === 'speaking' ? 'PIPELINE' : v.state === 'thinking' ? 'THINKING' : 'LISTENING') : 'TALK TO PIPELINE';
  if (!v.on) $('#talk-sub').textContent = v.supported ? 'say "hey Pipeline", then brief, touches, deals, compose' : 'type a command in the sidebar';
  else if (v.state === 'idle' && !S.lastHeard) $('#talk-sub').textContent = 'listening for "hey Pipeline"';
  document.querySelectorAll('.wave').forEach(w => w.classList.toggle('quiet', !v.on || v.state === 'idle'));
  const hero = $('.hero'); if (hero) hero.className = 'panel hero ' + (v.on ? v.state : '');
  const chip = $('#status-chip');
  if (v.on && v.state !== 'idle') { chip.className = 'status-chip ' + v.state; $('#status-word').textContent = v.state.toUpperCase(); }
  else if (S.systemWord) { chip.className = 'status-chip ' + (S.systemLevel || ''); $('#status-word').textContent = S.systemWord; }
}
Voice.onChange(reflectVoice);
window.onVoiceInterim = text => { if (text) { S.lastHeard = text; $('#talk-sub').textContent = '“' + text + '”'; const h = $('#heard'); if (h) { h.textContent = text; h.className = 'heard you'; } } };
window.onVoiceLine = (who, text) => { S.lastHeard = text; tele((who === 'you' ? 'you: ' : 'pipeline: ') + text, who !== 'you'); $('#talk-sub').textContent = (who === 'you' ? '“' : '') + text + (who === 'you' ? '”' : ''); const h = $('#heard'); if (h) { h.textContent = text; h.className = 'heard ' + who; } };
$('#mic').onclick = () => { if (!Voice.state().supported) { $('#type-cmd').focus(); toast('warn', 'VOICE', 'No speech recognition in this browser. Chrome on the Mac has it. Type a command instead.'); return; } const on = Voice.toggle(); if (on) { tele('voice loop on, wake word "hey Pipeline"', true); Voice.say('Pipeline online.'); } else tele('voice loop off'); reflectVoice(); };
$('#talk').onclick = () => $('#mic').click();
$('#type-form').addEventListener('submit', e => { e.preventDefault(); const v = $('#type-cmd').value; $('#type-cmd').value = ''; Voice.type(v); });
$('#open-sheet').onclick = () => window.open(S.data.links.sheet);

async function boot() {
  const steps = ['reading feed.json', 'loading text and email drafts', 'checking Command reader', 'counting today\'s sends', 'ready'];
  const bar = $('#boot-bar'), sub = $('#boot-sub');
  const p = api('/api/state').catch(() => null);
  for (let i = 0; i < steps.length; i++) { sub.textContent = steps[i]; bar.style.width = `${((i + 1) / steps.length) * 100}%`; await new Promise(r => setTimeout(r, 220)); }
  S.data = await p;
  if (S.data && S.data.feed) tele(`feed ${S.data.demo ? 'demo' : S.data.as_of} · ${(S.data.feed.counts || {}).contacts || 0} people · ${(S.data.feed.touches_due || []).length} due`, true);
  if (S.data) tele(`drafts: ${((S.data.text_queue || {}).drafts || []).length} texts, ${((S.data.email_queue || {}).drafts || []).length} emails, ${((S.data.text_queue || {}).reply_first || []).length} replies owed`);
  tick(); setInterval(tick, 1000);
  $('#app').hidden = false;
  if (S.data) render(); else toast('err', 'SERVER', 'app.py is not answering.');
  $('#boot').classList.add('out'); setTimeout(() => $('#boot').remove(), 600);
  S.pollTimer = setInterval(async () => { if (S.compose || !$('#modal').hidden) return; try { S.data = await api('/api/state'); if (S.view === 'cc') { /* keep the globe steady: update numbers only */ renderNav(feed().counts || {}); } else render(); } catch (e) { } }, 30000);
}
boot();
