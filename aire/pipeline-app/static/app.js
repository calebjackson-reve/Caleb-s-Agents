/* Pipeline front end. Vanilla JS, no build step. Talks to app.py over /api. */
'use strict';

const S = { data: null, view: 'dash', q: '', filter: 'all', queueIdx: 0, pollTimer: null, bootDone: false };
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
    toast('err', 'NOT ANSWERING', 'Pipeline on the Mac is not answering. It restarts by itself within a minute.');
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
// The one owe-a-reply list: people in Touches due whose last text was theirs. Every count on every page is this length.
// With money and contacts hidden, dialogs and toasts say "this person" instead of a name, and contact fields are masked.
const hid = () => !!(window.CC && CC.priv);
const nm = v => (hid() ? 'this person' : v);
const maskAttr = () => (hid() ? ' class="cc-masked" autocomplete="off"' : '');
function owesReply() { return (feed().touches_due || []).filter(r => r.owes_reply); }
// Drafts ready: written texts and emails only. Reply-first rows have no template, so they are never counted as ready.
function readyDrafts() { return drafts().filter(d => !d.reply); }
function personRow(id) { return (feed().touches_due || []).concat(feed().new_leads || [], feed().partners || [], ((feed().map || {}).pins || []).filter(p => p.kind === 'person')).find(r => r.person_id === id); }
// ---- texting from a card: one button opens the text, SEND sends it, then the card shows what happened
const firstName = n => (String(n || '').trim().split(/\s+/)[0] || '');
function lastText(id) { return ((S.data && S.data.last_texts) || {})[id]; }
function textBtn(id, row) {
  row = row || personRow(id) || {};
  if (!row.phone) return `<button type="button" onclick="openCompose('${id}')">Email</button>`;
  const n = window.CC && CC.priv ? '' : firstName(row.display);
  return `<button type="button" class="text-btn" onclick="textNow('${id}')" title="Opens the text. Nothing goes until you press SEND.">Text${n ? ' ' + esc(n) : ''}</button>`;
}
function textWhen(at) {
  const d = new Date(at); if (isNaN(d)) return '';
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return iso === todayISO() ? t : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${t}`;
}
const TEXT_STATES = { delivered: ['ok', 'Texted', 'delivered'], sent: ['ok', 'Texted', 'sent'], pending: ['wait', 'Texted', 'checking delivery'], unknown: ['wait', 'Texted', 'checking delivery'], error: ['bad', 'Text failed', 'not delivered'], 'dry-run': ['dry', 'Dry run', 'nothing sent'] };
function textStatus(id) {
  const t = lastText(id); if (!t) return '';
  const [cls, lead, tail] = TEXT_STATES[t.delivery] || TEXT_STATES.sent;
  return `<span class="txs ${cls}${S.justTexted === id ? ' flash' : ''}" title="${esc(t.detail || '')}"><i></i>${lead} ${esc(textWhen(t.at))} · ${tail}</span>`;
}
function textPending() {
  const now = Date.now();
  return Object.values((S.data && S.data.last_texts) || {}).some(t => { const age = now - new Date(t.at); return ((t.delivery === 'pending' || t.delivery === 'unknown') && age < 30 * 60e3) || (t.delivery === 'sent' && age < 3 * 60e3); });
}
function watchDelivery() {
  if (S.deliveryTimer || !textPending()) return;
  let n = 0;
  S.deliveryTimer = setInterval(async () => {
    if (++n > 120 || !textPending()) { clearInterval(S.deliveryTimer); S.deliveryTimer = null; return; }
    if (S.compose || !$('#modal').hidden) return;
    try { S.data = await api('/api/state'); if (!S.map) render(); } catch (e) { }
  }, 4000);
}
function textNow(id) {
  const row = personRow(id) || {};
  openCompose(id);
  if (!S.compose) return;
  if (row.phone && S.compose.kind !== 'text') setKind('text');
  S.compose.fromCard = true;
}
function matches(text) { return !S.q || text.toLowerCase().includes(S.q.toLowerCase()); }
function problems() { return (S.data && S.data.problems) || []; }
function statusLevel() { const p = problems(); return p.some(x => x.level === 'stop') ? 'stop' : p.length ? 'warn' : 'ok'; }

// ---------------------------------------------------------------- render
function render() {
  if (!S.data) return;
  const f = feed(), c = f.counts || {}, d = S.data;
  renderNav(c);
  // top status: what is actually true. A failed read is named, never covered by an all-clear word.
  // The chip shows the worst thing on the one attention list (cc-sources.js): red for failed or out of date, amber for
  // late or never read. The bell counts the same list.
  const att = window.CC && CC.data && CC.attention ? CC.attention() : [], red = att.filter(x => x.level === 'red'), amb = att.filter(x => x.level === 'amber');
  const chip = $('#status-chip'); chip.className = 'status-chip ' + (red.length || statusLevel() === 'stop' ? 'stop' : amb.length ? 'warn' : 'ok');
  $('#status-word').textContent = !d.feed_ok ? 'CRM feed did not load' : red.length ? `${red.length} source${red.length > 1 ? 's' : ''} failed or out of date`
    : amb.length ? `${amb.length} source${amb.length > 1 ? 's' : ''} late or not read yet` : window.CC && CC.data ? 'Every source current' : 'Reading';
  chip.title = att.map(x => x.text).join('\n'); chip.onclick = () => go('sources');
  S.systemWord = $('#status-word').textContent; S.systemLevel = chip.className.replace('status-chip ', '');
  const bc = $('#bell-count'); bc.hidden = !att.length; bc.textContent = att.length;
  // send status
  const mode = $('#mode'); mode.textContent = d.demo ? 'DEMO · DRY RUN' : d.sender === 'live' ? 'LIVE' : 'DRY RUN'; mode.className = 'mode mono' + (d.sender === 'live' && !d.demo ? ' live' : '');
  $('#mode-sub').textContent = d.demo ? 'made-up people, nothing is written' : d.sender === 'live' ? 'texts via Messages, email via Gmail' : 'sends are logged, nothing leaves the Mac';
  const vst = $('#voice-state'); if (vst && d.voice) vst.title = (d.voice.ask ? 'Claude Q&A on' : 'Claude Q&A off') + ' · ' + (d.voice.tts === 'elevenlabs' ? 'ElevenLabs voice' : 'browser voice');
  $('#caps-mini').innerHTML = `<div><b>${d.caps.sent_texts}/${d.caps.texts}</b>texts</div><div><b>${d.caps.sent_emails}/${d.caps.emails}</b>emails</div>`;
  const wave = $('#wave'); if (!wave.children.length) wave.innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="--d:${(i * 37) % 900}"></i>`).join('');
  document.querySelectorAll('.wave.small').forEach(w => { if (!w.children.length) w.innerHTML = Array.from({ length: 9 }, (_, i) => `<i style="--d:${(i * 97) % 700}"></i>`).join(''); });
  // bottom
  const items = drafts(), replies = items.filter(i => i.reply).length;
  const ready = items.length - replies;
  $('#compose-next').textContent = !items.length ? 'No drafts waiting' : ready ? `Next draft · ${ready} ready` : `${replies} replies to write`;
  const cmd = d.command || {};
  const age = d.feed_age_minutes;
  $('#foot-chips').innerHTML = [
    chipHTML('◔', 'Feed', d.demo ? 'demo · as of ' + (f.as_of || '') : age == null ? 'none yet' : age < 60 ? `${age} min ago` : `${Math.floor(age / 60)}h ${age % 60}m ago`, age > 60 ? 'warn' : ''),
    chipHTML('⌘', 'Command', cmd.state ? cmd.state : 'no status', cmd.state === 'ok' ? '' : cmd.state ? 'warn' : ''),
    chipHTML('◉', 'Signals', f.signals && f.signals.file ? `${(f.signals.people || 0).toLocaleString()} with texts · ${owesReply().length} owe a reply` : 'sheet only', f.signals && f.signals.file ? '' : 'warn'),
  ].join('');
  $('#refresh').classList.toggle('spin', !!(d.refresh && d.refresh.running));
  $('#refresh').innerHTML = '<span>⟳</span>';
  $('#open-sheet').hidden = !(d.links && d.links.sheet);
  // main: every page is a Command Center page now (cc.js and friends), so one design and one privacy switch.
  const main = $('#main');
  if (d.feed_ok && f.header_ok === false) { main.innerHTML = stopScreen(f); return; }
  if (S.view === 'cc') S.view = 'dash';
  if (S.view === 'leads') S.view = 'ccleads';
  if (S.view === 'market') S.view = 'monitor';
  const page = window.CC && (CC.views[S.view] || CC.views.dash);
  const ae = document.activeElement; if (ae && ae.closest && ae.closest('.cc-goals')) return;
  if (S.map) { S.map.destroy(); S.map = null; }
  main.innerHTML = page ? page() : '';
  if (window.CC && CC.after[S.view]) CC.after[S.view]();
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
// The nav, in groups, one distinct icon each. KEYS: the number keys open the same pages, in this order.
const NAV = [
  ['Today', [['dash', '◧', 'Dashboard'], ['touches', '☎', 'Touches due'], ['tasks', '☑', 'Tasks'], ['queue', '✎', 'Drafts'], ['sent', '➚', 'Sent today']]],
  ['People', [['ccleads', '✚', 'Leads'], ['map', '⌖', 'Map']]],
  ['Deals', [['deals', '⌂', 'Deals'], ['commission', '$', 'Commission'], ['deadlines', '⚑', 'Deadlines'], ['calendar', '▦', 'Calendar']]],
  ['Numbers', [['scorecard', '▲', 'Scorecard'], ['ccmarket', '◆', 'Market'], ['monitor', '⚒', 'Listings and permits'], ['news', '▤', 'News'], ['bank', '◫', 'Bank']]],
  ['You', [['life', '❀', 'Life'], ['health', '♥', 'Workouts']]],
  ['System', [['sources', '⇄', 'Sources']]],
];
const KEYS = ['dash', 'touches', 'tasks', 'queue', 'ccleads', 'deals', 'commission', 'deadlines', 'calendar', 'map'];
function renderNav(c) {
  const dr = S.data ? readyDrafts() : [];
  const cd = window.CC && CC.data, np = cd ? cd.commission_mail.filter(r => r.status === 'Not processed' || r.status === 'No closed deal').length : 0;
  const td = feed().touches_due || [];
  const cnt = { commission: [np, np > 0], deadlines: [cd ? cd.deadlines.d7.length : 0, cd && cd.deadlines.d3.length > 0], ccleads: [cd ? (cd.lead_counts || {}).d14 ?? cd.leads.length : 0, false],
    sources: [window.CC && CC.failing ? CC.failing().length + ((cd && cd.problems) || []).filter(p => p.state === 'stale').length : 0, true],
    touches: [td.length, td.some(r => r.owes_reply)], tasks: [(feed().tasks || []).length, c.tasks_overdue > 0], deals: [cd ? cd.deals.filter(r => !['closed', 'out'].includes(r.stage)).length : 0, false],
    queue: [dr.length, false], sent: [(S.data.sent_today || []).length, false] };
  const view = { cc: 'dash', leads: 'ccleads', market: 'monitor', dealmap: 'deals' }[S.view] || S.view;
  $('#nav').innerHTML = NAV.map(([g, items]) => `<div class="nav-g"><span class="nav-h">${g}</span>${items.map(([k, ico, label]) => { const [n, warn] = cnt[k] || [];
    return `<button type="button" class="${view === k ? 'on' : ''}" ${view === k ? 'aria-current="page"' : ''} onclick="go('${k}')"><span class="ico" aria-hidden="true">${ico}</span><span class="lbl">${label}</span>${n ? `<span class="cnt ${warn ? 'warn' : ''}">${n}</span>` : ''}</button>`; }).join('')}</div>`).join('');
  const on = $('#nav .on'), side = $('.side');
  if (on && side && innerWidth <= 720) { const a = on.getBoundingClientRect(), b = side.getBoundingClientRect(); side.scrollLeft += (a.left + a.width / 2) - (b.left + b.width / 2); }
}
function panel(i, title, right, body, extra = '') { return `<section class="panel ${extra}" style="--i:${i}"><div class="ph"><h3>${title}</h3><div class="ph-right">${right || ''}</div></div>${body}</section>`; }

// A short log of what Pipeline did and heard this session (the voice answers read it). Not shown on screen.
const TELE = [];
function tele(text, strong) { TELE.push({ at: new Date(), text, strong }); if (TELE.length > 30) TELE.shift(); }
function stopScreen(f) {
  return `<div class="stop-screen"><div><div class="big">HEADER CHANGED</div><p>The Contacts tab of the AIRE CRM sheet lost a column the engine needs: <code>${esc((f.missing_columns || []).join(', ') || 'unknown')}</code>. Nothing on this screen can be trusted until the header is restored, so Pipeline shows nothing else.</p><p>Put the column back in the sheet, then run the refresh.</p><div class="acts" style="justify-content:center"><button class="primary" onclick="refresh()">Refresh feed</button><button onclick="window.open('${esc(S.data.links.sheet)}')">Open the sheet</button></div></div></div>`;
}

// ---------------------------------------------------------------- navigation
function go(v) { S.view = v; S.filter = 'all'; try { history.replaceState(null, '', '#' + v); } catch (e) { } render(); $('#main').scrollTop = 0; }
// A link like 127.0.0.1:4747/#commission opens that page.
(function () { const h = location.hash.slice(1); if (/^[a-z]+$/.test(h)) S.view = h; })();
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (/^[a-z]+$/.test(h) && h !== S.view) go(h); });
function setFilter(k) { S.filter = k; render(); }
async function refresh() {
  const r = await api('/api/refresh', {});
  if (r.ok) toast('ok', 'REFRESH', 'Rebuilding the feed in the background.');
  const t = setInterval(async () => { const st = await api('/api/refresh'); if (!st.running) { clearInterval(t); toast(st.ok ? 'ok' : 'err', 'FEED', st.detail || (st.ok ? 'feed rebuilt' : 'refresh failed')); load(); } }, 2000);
  load();
}

// ---------------------------------------------------------------- actions
async function touched(id) {
  const r = personRow(id), who = nm(r ? r.display : 'this person'); const what = await touchForm(who); if (what == null) return;
  await act('/api/touch', { person_id: id, what }, { tag: 'LOGGED', text: `Touch logged for ${who}` });
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
  const H = hid(), C2 = window.CC;
  $('#drawer').innerHTML = `<section class="panel"><div class="dh"><span class="ico">${H ? '•' : initials(c.name)}</span><div class="who"><b>${H ? '<span class="cc-hid">Name hidden</span>' : esc(c.name)}</b><small>${row.band ? `<span class="tag ${row.band}">${esc(row.band)}</span>` : ''}${c.reply ? '<span class="tag reply">REPLY FIRST</span>' : ''}<span>${esc(row.stage || c.pool || '')}</span><span>${esc(quiet(row))}</span></small></div><button class="x" onclick="closeDrawer()">×</button></div>
  <div class="dbody">
    ${c.last_messages && c.last_messages.length && H ? `<div class="msgs"><span class="lbl">THEIR LAST TEXTS</span><div class="bubble">${C2.msg('')} · press Show at the top to read them</div></div>` : ''}
    ${c.last_messages && c.last_messages.length && !H ? `<div class="msgs"><span class="lbl">THEIR LAST TEXTS</span>${c.last_messages.map((m, i) => { const mm = /^(\d{4}-\d{2}-\d{2}): (.*)$/.exec(m); return `<div class="bubble" style="--i:${i}"><small>${esc(mm ? mm[1] : '')}</small>${esc(mm ? mm[2] : m)}</div>`; }).join('')}</div>` : ''}
    ${c.next_action || row.next_action ? `<div class="bubble note">Your note: ${C2 ? C2.scrub(c.next_action || row.next_action, [c.name]) : esc(c.next_action || row.next_action)}</div>` : ''}
    <div class="seg"><button class="${c.kind === 'text' ? 'on' : ''}" ${canText ? '' : 'disabled'} onclick="setKind('text')">▭ TEXT</button><button class="${c.kind === 'email' ? 'on' : ''}" ${canEmail ? '' : 'disabled'} onclick="setKind('email')">✉ EMAIL</button></div>
    <div class="field"><label>TO</label>${H && to ? `<input id="c-to" type="hidden" value="${esc(to)}"><p class="cc-hid">${c.kind === 'text' ? 'Number' : 'Email'} hidden · press Show at the top to see it</p>` : `<input id="c-to" value="${esc(to)}" ${to ? 'readonly' : ''} placeholder="${c.kind === 'text' ? 'no phone on file' : 'no email on file'}">`}</div>
    ${c.kind === 'email' ? `<div class="field"><label>SUBJECT</label><input id="c-subject" value="${esc(c.subject || '')}" placeholder="Subject"></div>` : ''}
    <div class="field"><label>${c.kind === 'text' ? 'TEXT' : 'EMAIL'} DRAFT${c.reply ? ' · write it yourself, they texted last' : c.pool ? ' · from the ' + esc(c.pool) + ' pool' : ''}</label><textarea id="c-body"${maskAttr()} placeholder="${c.reply ? 'Answer what they said.' : 'Write the message.'}">${esc(c.body || '')}</textarea><div class="hint"><span id="c-count">${(c.body || '').length} chars</span><span>${cap} ${c.kind}${cap === 1 ? '' : 's'} left today</span></div></div>
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
  toast(r.result.status === 'sent' ? 'ok' : 'warn', r.result.status === 'sent' ? 'SENT' : 'DRY RUN', `${c.kind} to ${nm(c.name)} ${r.result.status === 'sent' ? 'is on its way and logged in the CRM' : 'logged, nothing left the Mac'}`);
  if (c.kind === 'text') S.justTexted = c.person_id;
  await load();
  watchDelivery();
  if (c.fromCard) { closeDrawer(); setTimeout(() => { if (S.justTexted === c.person_id) { S.justTexted = null; } }, 4000); return; }
  const items = drafts(); if (items.length) openCompose(items[Math.min(S.queueIdx, items.length - 1)].person_id, Math.min(S.queueIdx, items.length - 1)); else closeDrawer();
}
async function touchFromCompose() { const c = S.compose; const what = await touchForm(nm(c.name)); if (what == null) return; const r = await act('/api/touch', { person_id: c.person_id, what }, { tag: 'LOGGED', text: `Touch logged for ${nm(c.name)}` }); if (r) nextInQueue(); }

// ---- modals
// opts.info: a window that only shows something gets one OK button, no Cancel.
function modal(title, bodyHTML, onOK, okLabel = 'Save', opts = {}) {
  return new Promise(resolve => {
    const m = $('#modal'); m.hidden = false;
    m.innerHTML = `<section class="panel"><div class="dh"><div class="who"><b>${title}</b></div><button class="x" onclick="closeModal()" aria-label="Close">×</button></div><div class="dbody">${bodyHTML}</div><div class="dfoot"><button type="button" class="send-btn" id="m-ok">${okLabel}</button>${opts.info ? '' : '<button type="button" class="ghost-btn" onclick="closeModal()">Cancel</button>'}</div></section>`;
    m._resolve = resolve;
    // resolve with the value first: closeModal() resolves whatever is still pending with null (that is Cancel)
    $('#m-ok').onclick = async () => { const v = onOK(m); if (v === false) return; m._resolve = null; resolve(v); closeModal(); };
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', title.replace(/<[^>]+>/g, ''));
    // Password managers (1Password, iCloud Passwords) opened an empty grey menu over these fields. They are not logins:
    // tell every manager to leave them alone.
    m.querySelectorAll('input, textarea').forEach(i => { i.setAttribute('autocomplete', 'off'); i.setAttribute('data-1p-ignore', ''); i.setAttribute('data-lpignore', 'true'); i.setAttribute('data-bwignore', ''); i.setAttribute('data-form-type', 'other'); });
    const first = m.querySelector('input, textarea, select'); (first || $('#m-ok')).focus();
    m.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') $('#m-ok').click(); }));
  });
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; if (m._resolve) { m._resolve(null); m._resolve = null; } }
// Log a touch: pick what it was (one tap, Call is picked), add a note if you want, Log. Saved as "Call: note".
const TOUCH_TYPES = ['Call', 'Text', 'Email', 'In person', 'Voicemail'];
function touchForm(who) {
  return modal('Log a touch', `<p class="cc-note">With ${esc(who)}.</p><div class="cc-filters" role="radiogroup" aria-label="Touch type">${TOUCH_TYPES.map((t, i) => `<button type="button" class="cc-filter" role="radio" aria-pressed="${i === 0}" aria-checked="${i === 0}" data-touch="${esc(t)}" onclick="this.parentNode.querySelectorAll('button').forEach(b => { const on = b === this; b.setAttribute('aria-pressed', on); b.setAttribute('aria-checked', on); })">${esc(t)}</button>`).join('')}</div>
    <div class="field"><label for="m-tnote">Note (optional)</label><input id="m-tnote" placeholder="Left a voicemail about the inspection"></div>`,
    m => { const t = (m.querySelector('[data-touch][aria-pressed="true"]') || {}).dataset; const type = (t && t.touch) || 'Call', note = $('#m-tnote', m).value.trim(); return note ? `${type}: ${note}` : type; }, 'Log it');
}
function ask(title, label, placeholder) { return modal(title, `<div class="field"><label>${esc(label.toUpperCase())}</label><input id="m-in" placeholder="${esc(placeholder)}"></div>`, m => { const v = $('#m-in', m).value.trim(); return v || false; }, 'Log it'); }
function personSelect(selected) {
  const rows = (feed().touches_due || []).concat(feed().new_leads || [], feed().partners || []);
  const h = hid();
  return `<select id="m-person"><option value="">${h && !selected ? 'names hidden, press Show to pick by name' : 'pick a person'}</option>${rows.map(r => `<option value="${esc(r.person_id)}" ${r.person_id === selected ? 'selected' : ''}>${h ? (r.person_id === selected ? 'This person' : 'Name hidden') : esc(r.display)} · ${esc(r.band || r.source || '')}</option>`).join('')}</select>`;
}
async function openTask(person_id = '') {
  const v = await modal('New task', `<div class="field"><label>PERSON</label>${personSelect(person_id)}</div><div class="field"><label>TASK</label><input id="m-task" placeholder="Call back about the inspection"></div><div class="field"><label>DUE</label><input id="m-due" type="date" value="${todayISO()}"></div>`,
    m => ({ person_id: $('#m-person', m).value, task: $('#m-task', m).value.trim(), due: $('#m-due', m).value }) , 'Add task');
  if (v) await act('/api/task', v, { tag: 'TASK', text: v.task });
}
async function openNote(person_id) {
  const r = personRow(person_id);
  const v = await modal(`Note on ${esc(nm(r ? r.display : 'this person'))}`, `<div class="field"><label>NOTE</label><textarea id="m-note" style="min-height:90px" placeholder="What you learned"></textarea></div>`, m => $('#m-note', m).value.trim() || false, 'Save note');
  if (v) await act('/api/note', { person_id, text: v }, { tag: 'NOTE', text: 'Saved to the CRM' });
}
async function openDNC(person_id) {
  const r = personRow(person_id);
  const v = await modal(`Do Not Contact: ${esc(nm(r ? r.display : 'this person'))}`, `<p style="color:var(--amber);margin:0 0 6px">One way. The engine never sets it back to NO. They drop off every list.</p><div class="field"><label>REASON</label><input id="m-reason" placeholder="Asked us to stop"></div>`, m => $('#m-reason', m).value.trim() || false, 'Set Do Not Contact');
  if (v) await act('/api/dnc', { person_id, reason: v }, { tag: 'DNC', text: `${nm(r ? r.display : 'This person')} will not be contacted` });
}
async function openDeal(address = '') {
  // The CRM Deals tab row being edited, prefilled with the Deals sheet's numbers: the sheet is the one deal source, so
  // saving brings the CRM tab in line with it. Nothing is written until Save.
  const crmRow = (feed().deals || []).find(d => d.address === address) || {};
  const sh = window.CC && address ? CC.sheetDeal(address) : null;
  const SHEET_STAGE = { contract: 'under_contract', closed: 'closed', out: 'lost', appointment: 'active' };
  const x = sh ? { ...crmRow, price: sh.price != null ? String(sh.price) : crmRow.price, expected_close: sh.act || crmRow.expected_close, stage: SHEET_STAGE[sh.stage] || crmRow.stage } : crmRow;
  const stages = S.data.stages || [];
  const v = await modal(x.address ? `Edit ${esc(x.address)}` : 'Add a deal', `
    <div class="field"><label>STREET ADDRESS</label><input id="m-addr" value="${esc(x.address || '')}" ${x.address ? 'readonly' : ''} placeholder="2179 S Turnberry Ave"></div>
    <div class="field"><label>STAGE</label><select id="m-stage">${stages.map(s => `<option value="${s}" ${s === x.stage ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}</select></div>
    ${x.address ? '' : `<div class="field"><label>SIDE</label><select id="m-side"><option value="buyer">buyer</option><option value="seller">seller</option></select></div>`}
    <div class="field"><label>PRICE</label><input id="m-price" value="${esc(x.price || '')}" placeholder="329000"></div>
    <div class="field"><label>EXPECTED CLOSE</label><input id="m-close" type="date" value="${esc(x.expected_close || '')}"></div>
    <div class="field"><label>NEXT STEP</label><input id="m-next" value="${esc(x.next_step || '')}" placeholder="Inspection Friday"></div>
    <div class="field"><label>EVENT (optional, logs what just happened)</label><input id="m-event" placeholder="Offer accepted"></div>
    ${sh ? '<p class="cc-note">Prefilled from the AIRE Deals sheet, the one deal source. Save writes these to the CRM Deals tab so the two agree.</p>' : ''}`,
    m => ({ address: $('#m-addr', m).value.trim(), stage: $('#m-stage', m).value, price: $('#m-price', m).value.trim(), close: $('#m-close', m).value, next_step: $('#m-next', m).value.trim(), event: $('#m-event', m).value.trim(), expect: crmRow.stage || '', create: !x.address, side: x.address ? '' : $('#m-side', m).value }), x.address ? 'Save deal' : 'Add deal');
  if (v) await act('/api/deal', v, { tag: 'DEAL', text: `${v.address} · ${v.stage.replace('_', ' ')}` });
}
function openBrief() {
  // The same lists the pages use: replies owed from Touches due, deals from the AIRE Deals sheet, leads from the one lead
  // list. Names, messages and dollars hide with the privacy switch like every page.
  const f = feed(), C = window.CC, cd = C && C.data, owes = owesReply(), over = (f.tasks || []).filter(t => t.overdue), dr = readyDrafts();
  const who = v => (C ? C.who(v) : esc(v)), scrub = (t, n) => (C ? C.scrub(t, n) : esc(t));
  const deals = cd ? cd.deals.filter(x => !['closed', 'out'].includes(x.stage)) : [], leads = cd ? cd.leads : [];
  modal('Morning brief', `<div class="brief">
    <h4>FIRST</h4><ul>${owes.length ? owes.slice(0, 5).map(r => `<li>Answer <b>${who(r.display)}</b>: ${C && C.priv ? C.msg('') : esc(C ? C.cleanMsg((r.last_messages || []).slice(-1)[0]) : '')}</li>`).join('') : '<li>Nobody is waiting on a reply.</li>'}</ul>
    <h4>OVERDUE</h4><ul>${over.length ? over.map(t => `<li>${scrub(t.task, [t.display])} · ${who(t.display || '')}</li>`).join('') : '<li>Nothing overdue.</li>'}</ul>
    <h4>NEW LEADS, 14 DAYS</h4><ul>${leads.length ? leads.map(l => `<li><b>${who(l.name || 'Website lead')}</b> · ${esc(l.source || '')} · ${esc((l.due || {}).label || '')}</li>`).join('') : '<li>None in the last 14 days.</li>'}</ul>
    <h4>DEALS, FROM THE DEALS SHEET</h4><ul>${deals.length ? deals.map(x => `<li><b>${esc(x.deal)}</b> · ${esc(x.status)}${x.act ? ' · act of sale ' + esc(C.day(x.act)) : ''}${x.next ? ' · ' + scrub(x.next) : ''}</li>`).join('') : '<li>No open deals on the Deals sheet.</li>'}</ul>
    <h4>TODAY'S DRAFTS</h4><ul><li>${dr.length} ready (${dr.filter(d => d.kind === 'text').length} texts, ${dr.filter(d => d.kind === 'email').length} emails). Cap ${S.data.caps.texts} and ${S.data.caps.emails}.</li></ul>
  </div>`, () => true, 'Start with the first reply').then(v => { if (v) composeNext(); });
}
function openProblems() {
  // The same list as the header chip, worst first. Information only, so one OK button.
  const p = window.CC && CC.data && CC.attention ? CC.attention() : problems().map(x => ({ level: x.level === 'stop' ? 'red' : 'amber', text: x.text }));
  modal('What needs attention', p.length ? `<ul class="cc-list">${p.map(x => `<li class="cc-ev ${x.level === 'red' ? 'k-closing' : 'k-deadline'}"><span class="cc-chip">${x.level === 'red' ? 'Failed or out of date' : 'Late or not read yet'}</span><span class="cc-what">${esc(x.text)}</span></li>`).join('')}</ul><div class="cc-acts"><button type="button" onclick="closeModal();go('sources')">Open Sources</button></div>`
    : C_empty('Every source is current.'), () => true, 'OK', { info: true });
}
const C_empty = t => `<p class="cc-empty">${esc(t)}</p>`;
// Shortcuts in plain sentences: a key is a letter or word you press, never code.
function openHelp() {
  const label = k => NAV.flatMap(g => g[1]).find(x => x[0] === k)[2];
  modal('Keyboard shortcuts', `<div class="brief"><h4>PAGES</h4><p>Press a number to open a page.</p><ul>${KEYS.map((k, i) => `<li><kbd>${i}</kbd> ${esc(label(k))}</li>`).join('')}</ul>
    <h4>ANYWHERE</h4><ul><li>Press <kbd>C</kbd> to open the next draft.</li><li>Press <kbd>V</kbd> to turn the voice on or off, and <kbd>T</kbd> to type to it.</li><li>Press <kbd>R</kbd> to refresh the CRM.</li><li>Press the slash key <kbd>/</kbd> to search.</li><li>Press <kbd>H</kbd> to hide or show money and contacts.</li><li>Press <kbd>Escape</kbd> to close a window like this one.</li></ul>
    <h4>ON THE MAP</h4><ul><li>Drag to move, scroll or double-click to zoom, click a cluster to open it.</li><li>Drawing a farm: click the corners, double-click or press Return to finish, Delete takes back a corner, Escape stops drawing.</li></ul>
    <h4>VOICE</h4><ul><li>Say "hey Pipeline", then: brief, who texted me, touches, tasks, deals, leads, compose, refresh, status, stop.</li><li>Nothing is sent by voice. Pipeline only sends when you press send.</li></ul>
    <h4>WHERE THINGS GO</h4><ul><li>Every button that changes something writes to the AIRE CRM sheet and is logged there.</li><li>Every text and email is checked for Do Not Contact and the daily limit before it goes, and lands in Sent today.</li></ul></div>`, () => true, 'OK', { info: true });
}

// ---------------------------------------------------------------- toasts, clock, keys, boot
// Jarvis proposals: one card at a time, nothing is written until Caleb taps yes (same API and gates as every button)
async function showProposals(list) {
  for (const p of list || []) {
    const what = p.action === 'relabel' ? (p.type ? `Type to ${p.type}` : `band ${p.expect_band || 'none'} to ${p.band}`) : p.action === 'task' ? `task "${p.task}" due ${p.due}` : `note "${p.text}"`;
    const sc = t => (window.CC ? CC.scrub(t, [p.name]) : esc(t));
    const ok = await modal('JARVIS SUGGESTS', `<div class="brief"><p><b>${window.CC ? CC.who(p.name) : esc(p.name)}</b>: ${sc(what)}</p><p>${sc(p.why)}</p></div>`, () => true, 'Yes, do it');
    if (!ok) { toast('warn', 'JARVIS', `Skipped: ${nm(p.name)}`); continue; }
    const path = p.action === 'relabel' ? '/api/relabel' : p.action === 'task' ? '/api/task' : '/api/note';
    const body = p.action === 'relabel' ? { person_id: p.person_id, band: p.band, type: p.type, expect_band: p.expect_band }
      : p.action === 'task' ? { person_id: p.person_id, task: p.task, due: p.due } : { person_id: p.person_id, text: p.text };
    const r = await api(path, body);
    toast(r.ok ? 'ok' : 'err', 'JARVIS', r.ok ? `Saved: ${nm(p.name)}` : (r.error || 'not saved'));
  }
  load();
}
window.showProposals = showProposals;
function toast(kind, tag, text) { const t = document.createElement('div'); t.className = 'toast ' + (kind === 'ok' ? '' : kind); t.innerHTML = `<b>${esc(tag)}</b><span>${esc(text)}</span>`; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3700); }
function tick() { const d = new Date(); $('#date').textContent = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); $('#time').textContent = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).toLowerCase(); }
document.addEventListener('keydown', e => {
  // Escape closes an open window first, wherever the focus is (the search box included), then the compose drawer.
  if (e.key === 'Escape' && !$('#modal').hidden) { e.preventDefault(); closeModal(); return; }
  const t = e.target && e.target.matches ? e.target : document.body;
  if (t.matches('input, textarea, select')) { if (e.key === 'Escape') t.blur(); return; }
  if (/^[0-9]$/.test(e.key)) go(KEYS[Number(e.key)]); else if (e.key === 'h' && window.CC) CC.togglePriv();
  else if (e.key === 'c') composeNext(); else if (e.key === 'r') refresh(); else if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
  else if (e.key === 'v') $('#mic').click(); else if (e.key === 't') { e.preventDefault(); $('#type-cmd').focus(); }
  else if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else closeDrawer(); }
});
// The header search works from every page: a page with its own list filters it, every other page shows Search results.
// Clearing the box goes back to the page you were on.
$('#search').addEventListener('input', e => {
  S.q = e.target.value;
  const own = window.CC && CC.SEARCHES_ITSELF.includes(S.view);
  if (S.q && !own && S.view !== 'search') { S.before = S.view; S.view = 'search'; }
  else if (!S.q && S.view === 'search') S.view = S.before || 'dash';
  render(); const b = $('#search'); if (document.activeElement !== b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
});
$('#refresh').onclick = refresh; $('#bell').onclick = openProblems; $('#help').onclick = openHelp; $('#brief').onclick = openBrief; $('#compose-next').onclick = composeNext;

// ---------------------------------------------------------------- voice
function reflectVoice() {
  const v = Voice.state(), st = v.on ? v.state : 'off';
  const mic = $('#mic'); mic.className = 'orb ' + (v.on ? 'on ' + v.state : 'off');
  const vs = $('#voice-state'); vs.className = 'voice-state mono ' + (v.on ? v.state : ''); vs.textContent = !v.supported ? 'no mic here · type below' : !v.on ? 'tap to talk' : v.state === 'idle' ? (v.awake ? 'listening' : 'say "hey Pipeline"') : v.state;
  const talk = $('#talk'); talk.classList.toggle('on', v.on);
  const onCall = v.call && v.call !== 'off';
  $('#talk-title').textContent = onCall ? (v.call === 'connecting' ? 'CALLING…' : v.state === 'speaking' ? 'PIPELINE' : 'ON THE CALL') : v.on ? (v.state === 'speaking' ? 'PIPELINE' : v.state === 'thinking' ? 'THINKING' : 'LISTENING') : Voice.callOn() ? 'CALL PIPELINE' : 'TALK TO PIPELINE';
  if (!v.on) $('#talk-sub').textContent = Voice.callOn() ? 'ElevenLabs listens and talks, Claude answers · tap to hang up' : v.supported ? 'say "hey Pipeline", then brief, touches, deals, compose' : 'type a command in the sidebar';
  else if (onCall && v.state === 'listening' && !S.lastHeard) $('#talk-sub').textContent = 'on the call, just talk';
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
$('#talk').onclick = async () => {
  if (!Voice.callOn()) { $('#mic').click(); return; }
  const was = Voice.callState();
  if (was === 'off') { tele('call: connecting to ElevenLabs Speech Engine', true); if (window.Core) Core.setState('thinking'); }
  await Voice.toggleCall(); reflectVoice();
  if (was !== 'off') tele('call ended');
};
$('#type-form').addEventListener('submit', e => { e.preventDefault(); const v = $('#type-cmd').value; $('#type-cmd').value = ''; Voice.type(v); });
$('#open-sheet').onclick = () => window.open(S.data.links.sheet);

async function boot() {
  const steps = ['reading the CRM', 'loading drafts', 'checking Command', 'counting today\'s sends', 'ready'];
  const bar = $('#boot-bar'), sub = $('#boot-sub');
  const p = api('/api/state').catch(() => null);
  for (let i = 0; i < steps.length; i++) { sub.textContent = steps[i]; bar.style.width = `${((i + 1) / steps.length) * 100}%`; await new Promise(r => setTimeout(r, 220)); }
  S.data = await p;
  if (S.data && S.data.feed) tele(`feed ${S.data.demo ? 'demo' : S.data.as_of} · ${(S.data.feed.counts || {}).contacts || 0} people · ${(S.data.feed.touches_due || []).length} due`, true);
  if (S.data) tele(`drafts: ${((S.data.text_queue || {}).drafts || []).length} texts, ${((S.data.email_queue || {}).drafts || []).length} emails, ${owesReply().length} owe a reply`);
  tick(); setInterval(tick, 1000);
  $('#app').hidden = false;
  if (window.CC) { CC.load(); setInterval(CC.load, 60000); }
  if (S.data) { render(); watchDelivery(); } else toast('err', 'NOT ANSWERING', 'Pipeline on the Mac is not answering.');
  $('#boot').classList.add('out'); setTimeout(() => $('#boot').remove(), 600);
  S.pollTimer = setInterval(async () => { if (S.compose || !$('#modal').hidden) return; try { S.data = await api('/api/state'); if (S.map) { /* keep the map where Caleb left it */ renderNav(feed().counts || {}); mapUpdate(); } else render(); } catch (e) { } }, 30000);
}
boot();
