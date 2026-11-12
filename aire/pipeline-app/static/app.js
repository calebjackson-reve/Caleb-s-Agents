/* Pipeline front end. Vanilla JS, no build step. Talks to app.py over /api. */
'use strict';

const S = { data: null, view: 'home', q: '', filter: 'all', queueIdx: 0, pollTimer: null, bootDone: false };
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
  (tq.drafts || []).forEach(d => items.push({ kind: 'text', person_id: d.person_id, name: d.name, to: d.phone, body: d.text, pool: d.pool, by: d.by, days_quiet: d.days_quiet, row: byId[d.person_id], last_messages: (byId[d.person_id] || {}).last_messages || [] }));
  (eq.drafts || []).forEach(d => items.push({ kind: 'email', person_id: d.person_id, name: d.name, to: d.email, subject: d.subject, body: d.body, pool: d.pool, by: d.by, days_quiet: d.days_quiet, row: byId[d.person_id], last_messages: (byId[d.person_id] || {}).last_messages || [] }));
  const sentIds = new Set((S.data.sent_today || []).map(s => s.person_id));
  return items.filter(i => !sentIds.has(i.person_id));
}
// The one owe-a-reply list: people in Touches due whose last text was theirs. Every count on every page is this length.
function owesReply() { return (feed().touches_due || []).filter(r => r.owes_reply); }
// Drafts ready: written texts and emails only. Reply-first rows have no template, so they are never counted as ready.
function readyDrafts() { return drafts().filter(d => !d.reply); }
function heatList(t) { return ((feed().heat || {})[t]) || []; }
function personRow(id) { return (feed().touches_due || []).concat(feed().new_leads || [], heatList('hot'), heatList('warm'), feed().partners || [], ((feed().map || {}).pins || []).filter(p => p.kind === 'person')).find(r => r.person_id === id); }
// ---- texting from a card: one button opens the text, SEND sends it, then the card shows what happened
const firstName = n => (String(n || '').trim().split(/\s+/)[0] || '');
function lastText(id) { return ((S.data && S.data.last_texts) || {})[id]; }
// ---- one-tap Text and Email. A number becomes +1 and 10 digits or it is not used. Pressing Text or Email opens the
// sheet first (recipient, subject, message, all editable); Open in Messages and Open in Gmail hand it to the app with
// everything filled in, and nothing leaves until Caleb presses send there.
function normPhone(v) { const d = String(v || '').replace(/\D/g, ''), t = d.length === 11 && d[0] === '1' ? d.slice(1) : d; return /^[2-9]\d{2}[2-9]\d{6}$/.test(t) ? '+1' + t : null; }
function phoneWhy(v) { return !String(v || '').trim() ? 'No phone on file' : 'Not a valid US number'; }
function validEmail(v) { return /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(String(v || '').trim()); }
function smsLink(phone, body) { return `sms:${phone}&body=${encodeURIComponent(body || '')}`; }
const GMAIL_USER = 'aire@calebjackson.org';
function gmailLink(to, subject, body) {
  const e = encodeURIComponent;
  return `https://mail.google.com/mail/?authuser=${e(GMAIL_USER)}&view=cm&fs=1&to=${e(to || '')}&su=${e(subject || '')}&body=${e(body || '')}`;
}
// Everyone Pipeline knows, by number and by email, to flag two contacts that share one.
function sharers(kind, value) {
  const key = kind === 'text' ? normPhone(value) : String(value || '').trim().toLowerCase(); if (!key) return [];
  const seen = new Map();
  (feed().touches_due || []).concat(feed().new_leads || [], feed().partners || [], ((feed().map || {}).pins || []).filter(p => p.kind === 'person'))
    .forEach(r => { const v = kind === 'text' ? normPhone(r.phone) : String(r.email || '').trim().toLowerCase(); if (v === key && r.person_id) seen.set(r.person_id, r.display || r.person_id); });
  return [...seen.values()];
}
// Contacts with no CRM id (a website lead) are kept here, so no number goes into a page attribute.
S.contacts = S.contacts || {};
function contactBtns(id, row) {
  row = row || personRow(id) || {};
  let key = id;
  if (!id) { const c = { name: row.display || row.name || '', phone: row.phone || '', email: row.email || '' };
    key = Object.keys(S.contacts).find(k => S.contacts[k].phone === c.phone && S.contacts[k].email === c.email && S.contacts[k].name === c.name) || ('c' + Object.keys(S.contacts).length);
    S.contacts[key] = c; }
  const ph = normPhone(row.phone), em = validEmail(row.email);
  const off = (label, why) => `<button type="button" class="cc-off" disabled aria-disabled="true" title="${esc(why)}">${label}<small>${esc(why)}</small></button>`;
  return (ph ? `<button type="button" class="text-btn" onclick="openContact('text', '${esc(key)}')" title="Opens the message to check first. Nothing goes until you press send.">Text</button>` : off('Text', phoneWhy(row.phone)))
    + (ph && id ? `<button type="button" onclick="openGrok('${esc(key)}', 'call')" title="Grok places the call. Nothing dials until you tap the Call card in Grok.">Call</button>` : '')
    + (em ? `<button type="button" onclick="openContact('email', '${esc(key)}')" title="Opens the email to check first. Nothing goes until you press Send in Gmail.">Email</button>` : off('Email', row.email ? 'Not a valid email' : 'No email on file'));
}
const textBtn = contactBtns;  // the old name, used by every card
function openContact(kind, key) {
  const loose = S.contacts[key];
  if (loose) { S.compose = { kind, person_id: '', name: loose.name, to: kind === 'text' ? loose.phone : loose.email, body: '', subject: kind === 'email' ? 'Following up' : '', row: { ...loose, display: loose.name }, last_messages: [], fromCard: true }; S.queueIdx = -1; renderDrawer(); return; }
  openCompose(key);
  if (!S.compose) return;
  if (S.compose.kind !== kind) setKind(kind);
  S.compose.fromCard = true;
}
function textWhen(at) {
  const d = new Date(at); if (isNaN(d)) return '';
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return iso === todayISO() ? t : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${t}`;
}
const TEXT_STATES = { delivered: ['ok', 'Texted', 'delivered'], sent: ['ok', 'Texted', 'sent'], pending: ['wait', 'Texted', 'checking delivery'], unknown: ['wait', 'Texted', 'checking delivery'], error: ['bad', 'Text failed', 'not delivered'], 'dry-run': ['dry', 'Dry run', 'nothing sent'], opened: ['wait', 'Opened', 'waiting for your send'] };
// ---- Grok bridge: a call or a hard draft is a job handed to Grok. Nothing dials until Caleb taps Grok's own Call card.
function grokJob(id) { return (((S.data && S.data.bridge) || {}).jobs || {})[id]; }
function grokText(j) {
  const call = j.job_type === 'call', when = textWhen(j.at);
  switch (j.state) {
    case 'dry-run': return `Dry run ${when}: ${call ? 'call' : 'hard draft'} job logged, nothing left the Mac`;
    case 'waiting': case 'dial_card_shown': return call ? `Call asked ${when}: open Grok and tap the Call card within 30 minutes` : `Hard draft asked ${when}: Grok is writing it`;
    case 'completed': return `Call ${when}: ${[j.outcome, j.summary].filter(Boolean).join('. ') || 'done'}${j.touch_error ? ' (not logged in the CRM: ' + j.touch_error + ')' : ''}`;
    case 'draft_ready': return `Grok's draft is ready ${when}`;
    case 'expired': return `Call ${when} expired: the card was not tapped. No call was made.`;
    case 'canceled': return `Call ${when} canceled. No call was made.`;
    case 'post_failed': return `Grok did not take the job ${when}`;
    default: return `${call ? 'Call' : 'Hard draft'} ${when} failed${j.summary ? ': ' + j.summary : ''}`;
  }
}
function grokStatus(id) {
  const j = grokJob(id); if (!j) return '';
  return `<span class="txs ${grokTone(j)}"><i></i>${esc(grokText(j))}</span>`;
}
// Jobs that still want something from Caleb: a Call card to tap, or a draft to read.
function grokOpen() { return (((S.data && S.data.bridge) || {}).recent || []).filter(j => ['waiting', 'dial_card_shown', 'draft_ready'].includes(j.state)); }
// The Grok panel in the compose box. Two tabs, one job each.
function grokBlock(c, row) {
  const b = (S.data && S.data.bridge) || {}, j = grokJob(c.person_id), dry = S.data.demo || b.caller !== 'live';
  const mode = S.grokMode === 'draft' ? 'draft' : 'call';
  const opts = Object.entries(b.purposes || {}).map(([k, v]) => `<option value="${k}"${S.grokPurpose === k ? ' selected' : ''}>${esc(v)}</option>`).join('');
  const phone = normPhone(row.phone || (c.kind === 'text' ? c.to : ''));
  const left = mode === 'call' ? `${b.calls_24h || 0} of ${b.calls_cap || 10} calls in the last 24 hours` : `${b.drafts_today || 0} of ${b.drafts_cap || 10} hard drafts today`;
  const status = !j ? '' : `<div class="grok-status ${grokTone(j)}"><b>${esc(grokText(j))}</b>${j.draft_text ? `<p>${esc(j.draft_text)}</p>` + '<button type="button" class="cc-primary" onclick="useGrokDraft()">Use this draft</button>' : ''}</div>`;
  return `<section class="grok" id="grok-panel" aria-label="Grok">
    <header><h4>Grok</h4><span class="cc-pill ${dry ? 'k-other' : 'k-listing'}">${dry ? 'Dry run, nothing leaves the Mac' : 'Live'}</span></header>
    <div class="seg" role="tablist"><button type="button" role="tab" aria-selected="${mode === 'call'}" class="${mode === 'call' ? 'on' : ''}" onclick="grokTab('call')">Call</button><button type="button" role="tab" aria-selected="${mode === 'draft'}" class="${mode === 'draft' ? 'on' : ''}" onclick="grokTab('draft')">Hard draft</button></div>
    ${status}
    ${mode === 'call'
      ? `<div class="field"><label for="g-purpose">What the call is for</label><select id="g-purpose">${opts}</select></div>
         <div class="field"><label for="g-ask">What it should get done</label><input id="g-ask" placeholder="Confirm tomorrow's 2 pm showing" value="${esc(S.grokAsk || '')}"></div>
         <p class="grok-how">Grok shows a Call card in its own chat. Nothing dials until you tap it. The card lasts 30 minutes, and Grok says it is a virtual assistant.</p>
         <div class="grok-foot"><button type="button" class="cc-primary" onclick="grokCall()" ${phone ? '' : 'disabled'}>Ask Grok to call</button><small>${phone ? left : 'No valid number on file'}</small></div>`
      : `<div class="field"><label for="g-ask">What the message has to do</label><input id="g-ask" placeholder="Upset about the inspection list. Calm, no promises." value="${esc(S.grokAsk || '')}"></div>
         <p class="grok-how">Grok writes it and it shows here. Nothing is sent until you send it yourself.</p>
         <div class="grok-foot"><button type="button" class="cc-primary" onclick="grokDraft()">Ask Grok for a draft</button><small>${left}</small></div>`}
  </section>`;
}
const grokTone = j => ({ completed: 'ok', draft_ready: 'ok', waiting: 'wait', dial_card_shown: 'wait', 'dry-run': 'wait' }[j.state] || 'bad');
function grokKeep() { const a = $('#g-ask'), p = $('#g-purpose'), t = $('#c-body'); if (a) S.grokAsk = a.value; if (p) S.grokPurpose = p.value; if (t && S.compose) S.compose.body = t.value; }
function grokTab(m) { grokKeep(); S.grokMode = m; renderDrawer(); const a = $('#g-ask'); if (a) a.focus(); }
// A row on the Hot and Warm pages is the button: one click opens the person with their texts, the draft and Grok.
// Clicking a person opens their contact card (person.js): the facts and their plan first, then Text, Call, Note,
// Log touch or Hard draft from there. It never jumps straight into the message box.
function openPerson(id) { S.grokMode = 'call'; S.grokAsk = ''; Person.open(id); }
// The Call button on a card: the compose box opens with the Grok panel on the Call tab and in view.
function openGrok(id, mode) {
  S.grokMode = mode || 'call'; S.grokAsk = ''; openCompose(id); if (!S.compose) return;
  const p = $('#grok-panel'); if (p) { p.scrollIntoView({ block: 'center' }); const a = $('#g-ask'); if (a) a.focus({ preventScroll: true }); }
}
async function grokSend(path, body, okText) {
  const r = await api(path, body);
  if (!r.ok) { toast('err', 'NOT ASKED', r.error); return; }
  toast(r.result.status === 'posted' ? 'ok' : 'warn', r.result.status === 'posted' ? 'GROK' : 'DRY RUN', r.result.status === 'posted' ? okText : 'job logged, nothing left the Mac');
  grokKeep(); S.grokAsk = ''; await load(); if (S.compose) renderDrawer();
}
function grokCall() { const c = S.compose, row = c.row || {}; return grokSend('/api/call', { person_id: c.person_id, display: c.name, to: row.phone || c.to, purpose: $('#g-purpose').value, objective: $('#g-ask').value, context: c.next_action || row.next_action || '' }, 'Open Grok and tap the Call card within 30 minutes.'); }
function grokDraft() { const c = S.compose, row = c.row || {}; return grokSend('/api/draft/escalate', { person_id: c.person_id, display: c.name, instructions: $('#g-ask').value, context: [c.next_action || row.next_action || '', ...(c.last_messages || [])].filter(Boolean).join(' | ').slice(0, 1200) }, 'Grok is writing it. It shows here when it is ready.'); }
function useGrokDraft() { const j = grokJob(S.compose.person_id); if (j && j.draft_text) { $('#c-body').value = j.draft_text; $('#c-count').textContent = j.draft_text.length + ' chars'; } }
function grokPending() { const now = Date.now(); return Object.values(((S.data && S.data.bridge) || {}).jobs || {}).some(j => (j.state === 'waiting' || j.state === 'dial_card_shown') && now - new Date(j.at) < 45 * 60e3); }
function textStatus(id) {
  const t = lastText(id); if (!t) return grokStatus(id);
  const [cls, lead, tail] = TEXT_STATES[t.delivery] || TEXT_STATES.sent;
  return grokStatus(id) + `<span class="txs ${cls}${S.justTexted === id ? ' flash' : ''}" title="${esc(t.detail || '')}"><i></i>${lead} ${esc(textWhen(t.at))} · ${tail}</span>`;
}
function textPending() {
  const now = Date.now();
  return grokPending() || Object.values((S.data && S.data.last_texts) || {}).some(t => { const age = now - new Date(t.at); return ((t.delivery === 'pending' || t.delivery === 'unknown') && age < 30 * 60e3) || (t.delivery === 'sent' && age < 3 * 60e3); });
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
// The chip, the bell and the Sources count all count the one attention list, so they always say the same number.
function statusWords(red, amb) {
  const all = red + amb, s = all === 1 ? 'source' : 'sources';
  if (!all) return '';
  if (red && amb) return `${all} ${s}: ${red} failed or out of date, ${amb} late or never read`;
  return red ? `${all} ${s} failed or out of date` : `${all} ${s} late or never read`;
}
function render() {
  if (window.CC && CC.leaveBank) CC.leaveBank();
  if (window.Person) Person.refresh();
  if (!S.data) return;
  const f = feed(), c = f.counts || {}, d = S.data;
  renderNav(c);
  // top status: what is actually true. A failed read is named, never covered by an all-clear word.
  // The chip shows the worst thing on the one attention list (cc-sources.js): red for failed or out of date, amber for
  // late or never read. The bell counts the same list.
  const att = window.CC && CC.data && CC.attention ? CC.attention() : [], red = att.filter(x => x.level === 'red'), amb = att.filter(x => x.level === 'amber');
  const chip = $('#status-chip'); chip.className = 'status-chip ' + (red.length || statusLevel() === 'stop' ? 'stop' : amb.length ? 'warn' : 'ok');
  $('#status-word').textContent = !d.feed_ok ? 'CRM feed did not load' : statusWords(red.length, amb.length) || (window.CC && CC.data ? 'Every source current' : 'Reading');
  chip.title = att.map(x => x.text).join('\n'); chip.onclick = () => go('sources');
  // The phone shows a short form of the same count.
  chip.querySelector('b').dataset.short = !d.feed_ok ? 'CRM feed failed' : att.length ? `${att.length} need${att.length === 1 ? 's' : ''} a look` : 'All current';
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
    chipHTML('◔', 'Feed', d.demo ? 'demo · as of ' + (f.as_of || '') : age == null ? 'none yet' : window.CC && CC.ago ? CC.ago(age) : age + ' min ago', age > 60 ? 'warn' : ''),
    chipHTML('⌘', 'Command', cmd.state ? cmd.state : 'no status', cmd.state === 'ok' ? '' : cmd.state ? 'warn' : ''),
    chipHTML('◉', 'Signals', f.signals && f.signals.file ? `${(f.signals.people || 0).toLocaleString()} with texts · ${owesReply().length} owe a reply` : 'sheet only', f.signals && f.signals.file ? '' : 'warn'),
  ].join('');
  $('#refresh').classList.toggle('spin', !!(d.refresh && d.refresh.running));
  $('#refresh').innerHTML = '<span>⟳</span>';
  $('#open-sheet').hidden = !(d.links && d.links.sheet);
  // main: every page is a Command Center page now (cc.js and friends), so one design.
  const main = $('#main');
  if (d.feed_ok && f.header_ok === false) { main.innerHTML = stopScreen(f); return; }
  if (S.view === 'cc') S.view = 'dash';
  if (S.view === 'leads') S.view = 'ccleads';
  if (S.view === 'market') S.view = 'monitor';
  const page = window.CC && (CC.views[S.view] || CC.views.home || CC.views.dash);
  const ae = document.activeElement; if (ae && ae.closest && ae.closest('.cc-goals')) return;
  if (S.map) { S.map.destroy(); S.map = null; }
  if (S.mini) { S.mini.destroy(); S.mini = null; }
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
  askSent();
}
function chipHTML(ico, label, val, cls = '') { return `<div class="chip ${cls}"><span class="ico">${ico}</span><div><span>${label}</span><b>${esc(val)}</b></div></div>`; }
function countUp(el) {
  const target = Number(el.dataset.count); if (!target) { el.textContent = '0'; return; }
  const t0 = performance.now(), dur = 900;
  (function step(t) { const p = Math.min(1, (t - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - p, 3))); el.textContent = v.toLocaleString(); if (p < 1) requestAnimationFrame(step); })(t0);
}
// A fourth entry on an item is its sub-pages, drawn indented under it (Hot and Warm under Leads, Caleb 2026-11-10).
// The nav, in groups, one distinct icon each. KEYS: the number keys open the same pages, in this order.
// Main is the three primary screens (Home, Map, People). Every other page sits under More, and on Home's link row.
// The older Dashboard is still a page (Home links to it, and #dash opens it); it gave its nav slot to Home.
const NAV = [
  ['Main', [['home', '◐', 'Home'], ['map', '⌖', 'Map'], ['people', '☺', 'People']]],
  ['Today', [['touches', '☎', 'Touches due'], ['tasks', '☑', 'Tasks'], ['queue', '✎', 'Drafts'], ['sent', '➚', 'Sent today'], ['grok', '✆', 'Grok calls'], ['ccleads', '✚', 'Leads', [['hot', 'Hot'], ['warm', 'Warm']]]]],
  ['Deals', [['deals', '⌂', 'Deals'], ['commission', '$', 'Commission'], ['deadlines', '⚑', 'Deadlines'], ['calendar', '▦', 'Calendar']]],
  ['Numbers', [['scorecard', '▲', 'Scorecard'], ['ccmarket', '◆', 'Market'], ['monitor', '⚒', 'Listings and permits'], ['news', '▤', 'News'], ['bank', '◫', 'Bank']]],
  ['You', [['life', '❀', 'Life'], ['health', '♥', 'Workouts']]],
  ['System', [['sources', '⇄', 'Sources']]],
];
const KEYS = ['home', 'touches', 'tasks', 'queue', 'ccleads', 'deals', 'commission', 'deadlines', 'calendar', 'map'];
function renderNav(c) {
  const dr = S.data ? readyDrafts() : [];
  const cd = window.CC && CC.data, np = cd ? cd.commission_mail.filter(r => r.status === 'Not processed' || r.status === 'No closed deal').length : 0;
  const td = feed().touches_due || [];
  const cnt = { commission: [np, np > 0], deadlines: [cd ? cd.deadlines.d7.length : 0, cd && cd.deadlines.d3.length > 0], ccleads: [cd ? (cd.lead_counts || {}).d14 ?? cd.leads.length : 0, false],
    sources: [window.CC && CC.data && CC.attention ? CC.attention().length : 0, true],
    touches: [td.length, td.some(r => r.owes_reply)], tasks: [(feed().tasks || []).length, c.tasks_overdue > 0], deals: [cd ? CC.openDeals().length : 0, false],
    queue: [dr.length, false], sent: [(S.data.sent_today || []).filter(s => s.status === 'sent').length, false],
    hot: [heatList('hot').length, heatList('hot').some(r => r.owes_reply)], warm: [heatList('warm').length, false],
    grok: [grokOpen().length, grokOpen().some(j => j.state === 'waiting' || j.state === 'dial_card_shown')] };
  const view = { cc: 'dash', leads: 'ccleads', market: 'monitor', dealmap: 'deals' }[S.view] || S.view;
  // Each group has its color; the page takes the color of the group it is in (ui.css, the color code).
  const sec = (NAV.find(([, items]) => items.some(([k, , , kids]) => k === view || (kids || []).some(([s]) => s === view))) || ['Today'])[0].toLowerCase();
  document.body.dataset.sec = sec;
  const btn = (k, ico, label, sub) => { const [n, warn] = cnt[k] || [];
    return `<button type="button" class="${sub ? `sub nav-${k} ` : ''}${view === k ? 'on' : ''}" ${view === k ? 'aria-current="page"' : ''} onclick="go('${k}')"><span class="ico" aria-hidden="true">${ico}</span><span class="lbl">${label}</span>${n ? `<span class="cnt ${warn ? 'warn' : ''}">${n}</span>` : ''}</button>`; };
  const anim = S.navAnim ? ' data-in' : ''; S.navAnim = false;
  const grp = ([g, items], i) => `<div class="nav-g g-${g.toLowerCase()}"${i == null ? '' : anim}><span class="nav-h">${g}</span>${items.map(([k, ico, label, kids]) => btn(k, ico, label) + (kids || []).map(([s, sl]) => btn(s, '', sl, true)).join('')).join('')}</div>`;
  // More opens by itself when the page you are on lives under it, and stays how you left it otherwise.
  const more = S.navMore == null ? NAV.slice(1).some(([, items]) => items.some(([k, , , kids]) => k === view || (kids || []).some(([s]) => s === view))) || view === 'dash' : S.navMore;
  $('#nav').innerHTML = grp(NAV[0]) + `<button type="button" class="nav-more" aria-expanded="${more}" onclick="S.navMore = ${!more}; S.navAnim = true; renderNav(feed().counts || {})">${more ? 'Less' : 'More'}</button>` + (more ? NAV.slice(1).map((g, i) => grp(g, i)).join('') : '');
  // On a phone the nav is one strip that scrolls sideways: keep the page you are on in the middle of it.
  const on = $('#nav .on'), strip = $('#nav');
  if (on && strip && strip.scrollWidth > strip.clientWidth) { const a = on.getBoundingClientRect(), b = strip.getBoundingClientRect(); strip.scrollLeft += (a.left + a.width / 2) - (b.left + b.width / 2); }
}
function panel(i, title, right, body, extra = '') { return `<section class="panel ${extra}" style="--i:${i}"><div class="ph"><h3>${title}</h3><div class="ph-right">${right || ''}</div></div>${body}</section>`; }

// A short log of what Pipeline did and heard this session (the voice answers read it). Not shown on screen.
const TELE = [];
function tele(text, strong) { TELE.push({ at: new Date(), text, strong }); if (TELE.length > 30) TELE.shift(); }
function stopScreen(f) {
  return `<div class="stop-screen"><div><div class="big">HEADER CHANGED</div><p>The Contacts tab of the AIRE CRM sheet lost a column the engine needs: <code>${esc((f.missing_columns || []).join(', ') || 'unknown')}</code>. Nothing on this screen can be trusted until the header is restored, so Pipeline shows nothing else.</p><p>Put the column back in the sheet, then run the refresh.</p><div class="acts" style="justify-content:center"><button class="primary" onclick="refresh()">Refresh feed</button><button onclick="window.open('${esc(S.data.links.sheet)}')">Open the sheet</button></div></div></div>`;
}

// ---------------------------------------------------------------- navigation
function go(v) { if (S.view === 'search' && v !== 'search' && S.q) { S.q = ''; const sb = $('#search'); if (sb) sb.value = ''; } S.view = v; S.navMore = null; S.filter = 'all'; try { history.replaceState(null, '', '#' + v); } catch (e) { } render(); $('#main').scrollTop = 0; }
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
  const r = personRow(id), who = CC.name(r && r.display); const what = await touchForm(who); if (what == null) return;
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
  if (!item) item = { kind: row.phone ? 'text' : 'email', person_id, name: row.display || '', to: row.phone || row.email || '', body: '', subject: '', last_messages: row.last_messages || [], next_action: row.next_action || '' };
  S.compose = { ...item, row, kind: item.kind }; S.card = null;
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
  const C2 = window.CC;
  $('#drawer').innerHTML = `<section class="panel"><div class="dh"><span class="ico">${initials(c.name)}</span><div class="who"><b>${CC.pname(c.name)}</b><small>${row.band ? `<span class="tag ${row.band}">${esc(row.band)}</span>` : ''}${c.reply ? '<span class="tag reply">REPLY FIRST</span>' : ''}<span>${esc(row.stage || c.pool || '')}</span><span>${esc(quiet(row))}</span></small></div><button class="x" onclick="closeDrawer()">×</button></div>
  <div class="dbody">
    ${c.last_messages && c.last_messages.length ? `<div class="msgs"><span class="lbl">THEIR LAST TEXTS</span>${c.last_messages.map((m, i) => { const mm = /^(\d{4}-\d{2}-\d{2}): (.*)$/.exec(m); return `<div class="bubble" style="--i:${i}"><small>${esc(mm ? mm[1] : '')}</small>${esc(mm ? mm[2] : m)}</div>`; }).join('')}</div>` : ''}
    ${c.next_action || row.next_action ? `<div class="bubble note">Your note: ${C2 ? C2.note(c.next_action || row.next_action, [c.name]) : esc(c.next_action || row.next_action)}</div>` : ''}
    ${logLines(c.person_id)}
    <div class="seg"><button class="${c.kind === 'text' ? 'on' : ''}" ${canText ? '' : 'disabled'} onclick="setKind('text')">▭ TEXT</button><button class="${c.kind === 'email' ? 'on' : ''}" ${canEmail ? '' : 'disabled'} onclick="setKind('email')">✉ EMAIL</button></div>
    <div class="field"><label>TO</label><input id="c-to" value="${esc(to)}" inputmode="${c.kind === 'text' ? 'tel' : 'email'}" placeholder="${c.kind === 'text' ? 'no phone on file' : 'no email on file'}" oninput="sheetCheck()"><p class="hint" id="c-exact"></p></div>
    ${c.kind === 'email' ? `<div class="field"><label>SUBJECT</label><input id="c-subject" value="${esc(c.subject || '')}" placeholder="Subject"></div>` : ''}
    <div class="field"><label>${c.kind === 'text' ? 'TEXT' : 'EMAIL'} DRAFT${c.reply ? ' · write it yourself, they texted last' : c.pool ? ' · from the ' + esc(c.pool) + ' pool' : ''}</label><textarea id="c-body" placeholder="${c.reply ? 'Answer what they said.' : 'Write the message.'}">${esc(c.body || '')}</textarea><div class="hint"><span id="c-count">${(c.body || '').length} chars</span><span>${cap} ${c.kind}${cap === 1 ? '' : 's'} left today</span></div></div>
    ${grokBlock(c, row)}
  </div>
  <div class="dfoot"><button class="send-btn" id="open-app" onclick="openInApp()">${c.kind === 'text' ? 'Open in Messages' : 'Open in Gmail'}</button>${sendNowBtn(dry)}<button class="ghost-btn" onclick="touchFromCompose()">✓ Touched, no message</button><span class="spacer"></span><span class="mono" style="font-size:9px;color:var(--dim)">${pos}</span><button class="ghost-btn" onclick="nextInQueue()">Skip ›</button></div></section>`;
  const ta = $('#c-body'); ta.addEventListener('input', () => { $('#c-count').textContent = ta.value.length + ' chars'; }); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  sheetCheck();
}
// Send now: desktop only, live mode only, one message per press after a confirm step. Greyed buttons say why.
function sendNowBtn(dry) {
  const why = !S.data.local ? 'Send now works on the Mac only' : dry ? 'Sending is off (dry mode)' : !S.compose.person_id ? 'Not in the CRM yet, so it cannot be logged' : '';
  return why ? `<button type="button" class="ghost-btn cc-off" id="send" disabled aria-disabled="true" title="${esc(why)}">Send now<small>${esc(why)}</small></button>`
    : `<button type="button" class="ghost-btn" id="send" onclick="confirmSendNow()">Send now</button>`;
}
// The exact number or address that will open, and a flag when two contacts share it.
function sheetCheck() {
  const c = S.compose, el = $('#c-exact'); if (!c || !el) return;
  const raw = ($('#c-to') || {}).value || '', ok = c.kind === 'text' ? normPhone(raw) : validEmail(raw) ? raw.trim() : null;
  const share = ok ? sharers(c.kind, ok).filter(n => !c.person_id || n !== (c.row || {}).display) : [];
  const shown = esc(ok || '');
  el.innerHTML = !ok ? `<span class="cc-warn">${c.kind === 'text' ? phoneWhy(raw) + '. Use 10 digits.' : raw.trim() ? 'Not a valid email' : 'No email on file'}</span>`
    : `Opens to <b>${shown}</b>${share.length ? ` <span class="cc-warn">· ${share.length === 1 ? 'Another contact has' : share.length + ' other contacts have'} this ${c.kind === 'text' ? 'number' : 'email'}: ${share.map(esc).join(', ')}. Check it is the right person.</span>` : ''}`;
  const b = $('#open-app'); if (b) b.disabled = !ok;
}
function sheetValues() {
  const c = S.compose, raw = $('#c-to').value;
  return { kind: c.kind, to: c.kind === 'text' ? normPhone(raw) : (validEmail(raw) ? raw.trim() : null), body: $('#c-body').value, subject: c.kind === 'email' ? ($('#c-subject') || {}).value || '' : '' };
}
// Hands the message to Messages (sms: link) or to a Gmail compose window for aire@. Nothing is sent here.
function openInApp() {
  const v = sheetValues(); if (!v.to) { toast('warn', 'CHECK IT', v.kind === 'text' ? 'That is not a valid number.' : 'That is not a valid email.'); return; }
  if (v.kind === 'text' && S.compose && (feed().no_text_consent || []).map(String).includes(String(S.compose.person_id))) { toast('err', 'NOT OPENED', 'No text consent: their website form did not check the box to be texted. Email or call instead.'); return; }
  if (v.kind === 'text') { location.href = smsLink(v.to, v.body); toast('ok', 'MESSAGES', 'Opened in Messages. Press send there. Pipeline logs it once it goes.'); }
  else { window.open(gmailLink(v.to, v.subject, v.body), '_blank', 'noopener'); toast('ok', 'GMAIL', 'Opened in Gmail. Press Send there. Pipeline logs it once it goes.'); }
  logOpened(v);
}
// ---- hand-off log: the click is logged as opened, then the Mac looks for the real send in Messages history or
// Gmail's Sent folder for 15 minutes. Still open after 2 minutes: a small "Did that send?" bar.
async function logOpened(v) {
  const c = S.compose || {};
  try { const r = await api('/api/opened', { kind: v.kind, person_id: c.person_id || '', to: v.to, body: v.body, subject: v.subject, display: c.name || '', draft: c.body || '', pool: c.pool || '' });
    if (r.ok) { await load(); watchOpened(); } } catch (e) { }
}
const openedNow = () => ((S.data && S.data.sent_today) || []).some(s => s.status === 'opened' && Date.now() - new Date(s.at) < 16 * 60e3);
function watchOpened() {
  if (S.openedTimer) return;
  S.openedTimer = setInterval(async () => {
    if (!openedNow()) { clearInterval(S.openedTimer); S.openedTimer = null; return; }
    if (!$('#modal').hidden) return;
    try { S.data = await api('/api/state'); if (S.compose || S.map) askSent(); else render(); } catch (e) { }
  }, 20000);
}
function askSent() {
  const p = ((S.data && S.data.handoff) || {}).pending || [], bar = document.getElementById('sent-ask');
  if (!p.length) { if (bar && bar.remove) bar.remove(); return; }
  const el = bar && bar.id === 'sent-ask' ? bar : document.body.appendChild(Object.assign(document.createElement('div'), { id: 'sent-ask' }));
  el.setAttribute('role', 'status'); el.innerHTML = askSentHTML(p[0]);
}
function askSentHTML(e) {
  return `<span>Did the ${e.kind === 'text' ? 'text' : 'email'} to <b>${CC.pname(e.display)}</b> send?<small>Opened ${esc(textWhen(e.at))}</small></span><button type="button" onclick="answerSent('${esc(e.id)}', true)">Sent</button><button type="button" class="no" onclick="answerSent('${esc(e.id)}', false)">Not sent</button>`;
}
async function answerSent(id, sent) {
  const r = await api('/api/opened/answer', { id, sent });
  if (r.ok) toast('ok', sent ? 'LOGGED' : 'CLEARED', sent ? 'Marked sent by you. It counts as a touch.' : 'Taken off the log. Nothing was counted.');
  else toast('err', 'NOT SAVED', r.error || 'no reason given');
  await load();
}
const sentWord = r => r.status === 'opened' ? 'opened, waiting for your send' : r.confirmed_by === 'you' ? 'sent, you said so' : r.confirmed_by ? `sent, confirmed by ${r.confirmed_by}` : r.status === 'sent' ? 'sent by Pipeline' : r.status;
// What Pipeline has on record for this person: the last five texts and emails, newest first.
function logLines(id) {
  const rows = ((S.data.sent_log || {})[id] || []).slice().reverse(); if (!id || !rows.length) return '';
  return `<div class="msgs"><span class="lbl">SENT FROM PIPELINE</span>${rows.map(r => `<div class="bubble note"><small>${esc(textWhen(r.sent_at || r.at))} · ${r.kind === 'text' ? 'Text' : 'Email'} · ${esc(sentWord(r))}</small>${esc(r.subject || r.text || '')}</div>`).join('')}</div>`;
}
async function confirmSendNow() {
  const v = sheetValues(), c = S.compose;
  if (!v.to) { toast('warn', 'CHECK IT', 'That recipient is not valid.'); return; }
  if (!v.body.trim()) { toast('warn', 'EMPTY', 'Write the message first.'); return; }
  const ok = await modal(`Send this ${v.kind} now?`, `<p class="cc-note">To <b>${CC.pname(c.name)}</b> at <b>${esc(v.to)}</b>, ${v.kind === 'text' ? 'through Messages (iMessage, or SMS if not)' : 'through Gmail as ' + GMAIL_USER}. One message, sent right away.</p>${v.subject ? `<p><b>Subject:</b> ${esc(v.subject)}</p>` : ''}<pre class="send-preview">${esc(v.body)}</pre>`, () => true, 'Send it');
  if (ok !== true) return;
  return sendNow(v);
}
function setKind(k) {
  const c = S.compose; c.kind = k; c.body = $('#c-body') ? $('#c-body').value : c.body;
  // The draft for that channel from the queue, when there is one.
  const d = c.person_id && drafts().find(x => x.person_id === c.person_id && x.kind === k && x.body);
  if (d) { c.body = d.body; c.subject = d.subject || c.subject; c.to = d.to || c.to; }
  if (k === 'email' && !c.subject) c.subject = 'Checking in';
  c.to = k === 'text' ? ((c.row || {}).phone || (k === 'text' && d ? d.to : '')) : ((c.row || {}).email || (d ? d.to : ''));
  renderDrawer();
}
function closeDrawer() { $('#drawer').hidden = true; S.compose = null; S.card = null; }
function nextInQueue() { const items = drafts(); if (!items.length) { closeDrawer(); return; } const n = (S.queueIdx + 1) % items.length; openCompose(items[n].person_id, n); }
async function sendNow(v) {
  const c = S.compose, btn = $('#send'); if (!v || !btn) return; btn.disabled = true; btn.classList.add('charging');
  const body = { kind: v.kind, person_id: c.person_id, to: v.to, body: v.body, subject: v.subject, display: c.name, confirmed: true };
  const r = await api('/api/send', body);
  btn.disabled = false; btn.classList.remove('charging');
  if (!r.ok) { toast('err', 'NOT SENT', r.error); return; }
  toast(r.result.status === 'sent' ? 'ok' : 'warn', r.result.status === 'sent' ? 'SENT' : 'DRY RUN', `${c.kind} to ${CC.name(c.name)} ${r.result.status === 'sent' ? 'is on its way and logged in the CRM' : 'logged, nothing left the Mac'}`);
  if (c.kind === 'text') S.justTexted = c.person_id;
  await load();
  watchDelivery();
  if (c.fromCard || S.queueIdx < 0) { closeDrawer(); setTimeout(() => { if (S.justTexted === c.person_id) { S.justTexted = null; } }, 4000); return; }
  const items = drafts(); if (items.length) openCompose(items[Math.min(S.queueIdx, items.length - 1)].person_id, Math.min(S.queueIdx, items.length - 1)); else closeDrawer();
}
async function touchFromCompose() { const c = S.compose; const what = await touchForm(CC.name(c.name)); if (what == null) return; const r = await act('/api/touch', { person_id: c.person_id, what }, { tag: 'LOGGED', text: `Touch logged for ${CC.name(c.name)}` }); if (r) nextInQueue(); }

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
  return `<select id="m-person"><option value="">pick a person</option>${rows.map(r => `<option value="${esc(r.person_id)}" ${r.person_id === selected ? 'selected' : ''}>${esc(r.display)} · ${esc(r.band || r.source || '')}</option>`).join('')}</select>`;
}
async function openTask(person_id = '') {
  const v = await modal('New task', `<div class="field"><label>PERSON</label>${personSelect(person_id)}</div><div class="field"><label>TASK</label><input id="m-task" placeholder="Call back about the inspection"></div><div class="field"><label>DUE</label><input id="m-due" type="date" value="${todayISO()}"></div>`,
    m => ({ person_id: $('#m-person', m).value, task: $('#m-task', m).value.trim(), due: $('#m-due', m).value }) , 'Add task');
  if (v) await act('/api/task', v, { tag: 'TASK', text: v.task });
}
async function openNote(person_id) {
  const r = personRow(person_id);
  const v = await modal(`Note on ${CC.pname(r && r.display)}`, `<div class="field"><label>NOTE</label><textarea id="m-note" style="min-height:90px" placeholder="What you learned"></textarea></div>`, m => $('#m-note', m).value.trim() || false, 'Save note');
  if (v) await act('/api/note', { person_id, text: v }, { tag: 'NOTE', text: 'Saved to the CRM' });
}
async function openDNC(person_id) {
  const r = personRow(person_id);
  const v = await modal(`Do Not Contact: ${CC.pname(r && r.display)}`, `<p style="color:var(--amber);margin:0 0 6px">One way. The engine never sets it back to NO. They drop off every list.</p><div class="field"><label>REASON</label><input id="m-reason" placeholder="Asked us to stop"></div>`, m => $('#m-reason', m).value.trim() || false, 'Set Do Not Contact');
  if (v) await act('/api/dnc', { person_id, reason: v }, { tag: 'DNC', text: `${CC.name(r && r.display)} will not be contacted` });
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
  // list.
  const f = feed(), C = window.CC, cd = C && C.data, owes = owesReply(), over = (f.tasks || []).filter(t => t.overdue), dr = readyDrafts();
  const who = v => (C ? C.who(v) : esc(v)), scrub = (t, n) => (C ? C.scrub(t, n) : esc(t));
  const deals = cd ? C.openDeals() : [], leads = cd ? cd.leads : [];
  modal('Morning brief', `<div class="brief">
    <h4>FIRST</h4><ul>${owes.length ? owes.slice(0, 5).map(r => `<li>Answer <b>${who(r.display)}</b>: ${esc(C ? C.cleanMsg((r.last_messages || []).slice(-1)[0]) : '')}</li>`).join('') : '<li>Nobody is waiting on a reply.</li>'}</ul>
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
    <h4>ANYWHERE</h4><ul><li>Press <kbd>A</kbd> to add a lead.</li><li>Press <kbd>C</kbd> to open the next draft.</li><li>Press <kbd>V</kbd> to turn the voice on or off, and <kbd>T</kbd> to type to it.</li><li>Press <kbd>R</kbd> to refresh the CRM.</li><li>Press the slash key <kbd>/</kbd> to search.</li><li>Press <kbd>Escape</kbd> to close a window like this one.</li></ul>
    <h4>ON THE MAP</h4><ul><li>Drag to move, scroll or double-click to zoom, click a pin for the person.</li><li>Drawing a farm: click the corners, double-click or press Return to finish, Delete takes back a corner, Escape stops drawing.</li></ul>
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
    if (!ok) { toast('warn', 'JARVIS', `Skipped: ${p.name}`); continue; }
    const path = p.action === 'relabel' ? '/api/relabel' : p.action === 'task' ? '/api/task' : '/api/note';
    const body = p.action === 'relabel' ? { person_id: p.person_id, band: p.band, type: p.type, expect_band: p.expect_band }
      : p.action === 'task' ? { person_id: p.person_id, task: p.task, due: p.due } : { person_id: p.person_id, text: p.text };
    const r = await api(path, body);
    toast(r.ok ? 'ok' : 'err', 'JARVIS', r.ok ? `Saved: ${p.name}` : (r.error || 'not saved'));
  }
  load();
}
window.showProposals = showProposals;
function toast(kind, tag, text) { const t = document.createElement('div'); t.className = 'toast ' + (kind === 'ok' ? '' : kind); t.innerHTML = `<b>${esc(tag)}</b><span>${esc(text)}</span>`; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3700); }
function tick() { const d = new Date(); $('#date').textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); $('#time').textContent = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).toLowerCase(); }
document.addEventListener('keydown', e => {
  // Escape closes an open window first, wherever the focus is (the search box included), then the compose drawer.
  if (e.key === 'Escape' && !$('#modal').hidden) { e.preventDefault(); closeModal(); return; }
  const t = e.target && e.target.matches ? e.target : document.body;
  if (t.matches('input, textarea, select')) { if (e.key === 'Escape') t.blur(); return; }
  if (/^[0-9]$/.test(e.key)) go(KEYS[Number(e.key)]);
  else if (e.key === 'a' && window.CC && CC.addLead) { e.preventDefault(); CC.addLead(); } else if (e.key === 'c') composeNext(); else if (e.key === 'r') refresh(); else if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
  else if (e.key === 'v') $('#mic').click(); else if (e.key === 't') { e.preventDefault(); $('#type-cmd').focus(); }
  else if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else closeDrawer(); }
});
// The header search works the same on every page: typing opens Search, across people, tasks, deals, leads and drafts.
// Clearing the box goes back to the page you were on. Leaving Search clears the box, so no page stays filtered.
$('#search').addEventListener('input', e => {
  S.q = e.target.value;
  if (S.q && S.view !== 'search') { S.before = S.view; S.view = 'search'; }
  else if (!S.q && S.view === 'search') S.view = S.before || 'home';
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
// Back in the Pipeline window: read again, so a send made in Messages or Gmail shows, or the bar asks about it.
// The map and an open compose sheet are left as they are: only the bar is checked there.
async function backInWindow() {
  if (!S.data || !$('#modal').hidden) return;
  try { S.data = await api('/api/state'); if (S.compose || S.map) askSent(); else render(); } catch (e) { }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) backInWindow(); });
window.addEventListener('focus', backInWindow);

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
