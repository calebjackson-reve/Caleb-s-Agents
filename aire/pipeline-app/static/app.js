/* AIRE Pipeline front end. One data source: /api/feed (the engine's feed.json plus local state).
   Every write goes back through the server to crm.py. Nothing here sends a message by itself:
   phone links open the device's own apps with the draft filled in, and the in-app Send is a dry run
   unless the server runs with --live-send and you press Approve in the final review. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const state = { data: null, tab: 'touches', privacy: false, drafts: {}, channel: {}, showAll: false, busy: false, undo: null };
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  // ---------- theme / privacy (per-device conveniences) ----------
  const root = document.documentElement;
  const savedTheme = LS('pipeline.theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);
  $('#themeBtn').onclick = () => { const t = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; root.setAttribute('data-theme', t); LS('pipeline.theme', t); };
  state.privacy = LS('pipeline.privacy') === '1';
  $('#privacyBtn').onclick = () => { state.privacy = !state.privacy; LS('pipeline.privacy', state.privacy ? '1' : '0'); render(); };
  try { const d = JSON.parse(LS('pipeline.drafts') || '{}'); if (d && typeof d === 'object') state.drafts = d; } catch (e) {}
  const saveDrafts = () => LS('pipeline.drafts', JSON.stringify(state.drafts));

  // ---------- helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const name = (t) => state.privacy ? `<span class="hidden-name">${esc(t.display)}</span>` : esc(t.display);
  const money = (v) => { const n = Number(String(v).replace(/[^0-9.]/g, '')); return v && !isNaN(n) && n > 0 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : ''; };
  const dayLabel = (iso) => { if (!iso) return ''; const d = new Date(iso.slice(0, 10) + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);
  const telHref = (p) => 'tel:+1' + digits(p);
  const isApple = /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  const smsHref = (p, body) => `sms:+1${digits(p)}${isApple ? '&' : '?'}body=${encodeURIComponent(body || '')}`;
  const mailHref = (to, subject, body) => `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
  const ago = (sec) => sec == null ? 'unknown age' : sec < 90 ? 'just now' : sec < 5400 ? `${Math.round(sec / 60)} min ago` : `${(sec / 3600).toFixed(1)} h ago`;

  async function api(path, body) {
    const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    let j = {}; try { j = await r.json(); } catch (e) { j = { ok: false, error: `Server answered ${r.status}.` }; }
    return j;
  }

  function toast(text, undo) {
    const t = $('#toast'); $('#toastText').textContent = text; t.hidden = false;
    const u = $('#toastUndo'); u.hidden = !undo; state.undo = undo || null;
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; state.undo = null; }, undo ? 10000 : 4000);
  }
  $('#toastClose').onclick = () => { $('#toast').hidden = true; };
  $('#toastUndo').onclick = async () => { if (state.undo) { await state.undo(); $('#toast').hidden = true; state.undo = null; load(); } };

  function sheet(title, html) { $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; }
  const closeSheet = () => { $('#sheet').hidden = true; };
  $('#sheetClose').onclick = closeSheet;
  $('#sheet').addEventListener('click', (e) => { if (e.target === $('#sheet')) closeSheet(); });

  // ---------- load ----------
  async function load() {
    const dot = $('#statusDot'), txt = $('#statusText');
    try {
      const d = await api('/api/feed');
      state.data = d;
      if (!d.ok) { dot.className = 'dot warn'; txt.textContent = 'feed problem'; }
      else { dot.className = 'dot ' + (d.feed.stale ? 'warn' : 'ok'); txt.textContent = d.feed.stale ? 'feed stale' : 'live'; }
    } catch (e) {
      state.data = { ok: false, error: 'The Pipeline server is not answering. Start it with python3 server.py.' };
      dot.className = 'dot warn'; txt.textContent = 'offline';
    }
    render();
  }

  // ---------- render ----------
  function render() {
    const d = state.data; if (!d) return;
    const screen = $('#screen');
    if (!d.ok) {
      // header_ok false, no feed, or bad JSON: show only that. Nothing else can be trusted.
      $('#helloLine').textContent = 'AIRE Pipeline'; $('#dateLine').textContent = ''; $('#briefLine').textContent = '';
      $('#tiles').innerHTML = ''; $('#tabs').style.display = 'none';
      screen.innerHTML = `<div class="err-screen">${esc(d.error)}${d.feed_path ? `<code>${esc(d.feed_path)}</code>` : ''}</div>`;
      $('#footFeed').textContent = ''; return;
    }
    $('#tabs').style.display = '';
    $('#helloLine').textContent = d.greeting.hello; $('#dateLine').textContent = d.greeting.date;
    $('#briefLine').textContent = state.privacy ? d.greeting.line.replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, 'someone') : d.greeting.line;
    $('#footFeed').textContent = `feed ${ago(d.feed.age_seconds)}${d.feed.stale ? ' · STALE, check the LaunchAgent' : ''}${d.live_send ? ' · LIVE SEND ON' : ' · dry run'}`;
    const c = d.counts;
    const tiles = [
      ['owes a reply', c.owes_reply, 'texted you last', c.owes_reply ? 'amber' : '', 'touches'],
      ['touches due', c.touches_due, 'by band cadence', 'cyan', 'touches'],
      ['done today', c.done_today, 'people you reached', 'cyan', 'counts'],
      ['tasks open', c.tasks_open, c.tasks_overdue ? `${c.tasks_overdue} overdue` : 'none overdue', c.tasks_overdue ? 'amber' : '', 'tasks'],
      ['live deals', c.deals_live, c.deals_moved_today ? `${c.deals_moved_today} moved today` : 'in the Deals tab', 'cyan', 'deals'],
      ['new leads', c.new_leads, 'last 14 days', c.new_leads ? 'amber' : '', 'leads'],
    ];
    $('#tiles').innerHTML = tiles.map(([k, v, s, cls, tab]) => `<button class="tile ${cls}" data-tab="${tab}"><div class="k">${k}</div><div class="v">${v ?? 0}</div><div class="s">${esc(s)}</div></button>`).join('');
    $('#tiles').querySelectorAll('.tile').forEach((b) => { b.onclick = () => setTab(b.dataset.tab); });
    $('#tabs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === state.tab));
    screen.className = 'screen' + (state.tab === 'deals' || state.tab === 'tasks' ? ' two' : '');
    screen.innerHTML = ({ touches: touchesHTML, tasks: tasksHTML, deals: dealsHTML, leads: leadsHTML, counts: countsHTML })[state.tab]();
    wire(screen);
  }
  function setTab(t) { state.tab = t; render(); window.scrollTo({ top: $('#tabs').offsetTop - 60, behavior: 'auto' }); }
  $('#tabs').querySelectorAll('button').forEach((b) => { b.onclick = () => setTab(b.dataset.tab); });

  function touchesHTML() {
    const all = state.data.touches;
    const owes = all.filter((t) => t.owes_reply && !skipped(t));
    const rest = all.filter((t) => !owes.includes(t));
    const limit = state.showAll ? rest.length : 12;
    if (!all.length) return `<div class="empty">Nobody is due. The feed had no touches.</div>`;
    let h = '';
    if (owes.length) h += `<div class="section-title">Owes a reply · ${owes.length}</div>` + owes.map(cardHTML).join('');
    h += `<div class="section-title">Up next · ${rest.length}</div>` + rest.slice(0, limit).map(cardHTML).join('');
    if (rest.length > limit) h += `<div class="more"><button class="btn ghost" data-act="more">Show all ${rest.length}</button></div>`;
    return h;
  }
  const skipped = (t) => t.local.done_today || t.local.skipped_today || t.local.snoozed_until;
  function cardHTML(t) {
    const ch = state.channel[t.person_id] || (t.draft && t.draft.channel) || (t.phone ? 'Text' : 'Email');
    const draftKey = `${t.person_id}|${ch}`;
    const mine = state.drafts[draftKey];
    const body = mine != null ? mine : (t.draft && t.draft.channel === ch ? t.draft.body : '');
    const subject = (state.drafts[draftKey + '|subject'] != null) ? state.drafts[draftKey + '|subject'] : (t.draft && t.draft.subject) || '';
    const src = mine != null ? 'your edit, saved on this device' : t.draft ? (t.draft.source === 'model' ? `written from your texts${t.draft.drafted_at ? ' · ' + dayLabel(t.draft.drafted_at) : ''}` : 'your next check-in line for this person') : (t.owes_reply ? 'no pre-written reply yet. Read what they said.' : 'no line queued. Write your own.');
    const local = t.local.done_today ? '<span class="badge dim">done today</span>' : t.local.snoozed_until ? `<span class="badge dim">snoozed to ${dayLabel(t.local.snoozed_until)}</span>` : t.local.skipped_today ? '<span class="badge dim">skipped</span>' : '';
    return `<article class="card ${t.owes_reply ? 'owes' : ''} ${skipped(t) ? 'muted' : ''}" data-id="${t.person_id}">
      <h3>${name(t)} ${t.band ? `<span class="badge ${t.band === 'hot' ? 'hot' : ''}">${esc(t.band)}</span>` : ''} ${t.owes_reply ? '<span class="badge owes">owes reply</span>' : ''} ${local}</h3>
      <p class="why">${esc(t.why)}</p>
      <div class="meta">${t.phone ? 'text' : ''}${t.phone && t.email ? ' · ' : ''}${t.email ? 'email' : ''}${t.last_touch ? ' · last touch ' + dayLabel(t.last_touch) : ''}${t.next_action ? ' · note: ' + esc(t.next_action) : ''}</div>
      ${t.last_messages.length ? `<div class="said"><div class="lbl">What they said</div>${t.last_messages.map((m) => { const i = m.indexOf(':'); const dt = i > 0 ? m.slice(0, i) : ''; const tx = i > 0 ? m.slice(i + 1).trim() : m; return `<p><span class="d">${esc(dayLabel(dt))}</span>${state.privacy ? '<span class="hidden-name">hidden</span>' : esc(tx)}</p>`; }).join('')}</div>` : (t.owes_reply ? '<div class="said"><div class="lbl">What they said</div><p class="note">No texts loaded. Run imessage_signals.py then crm.py feed --signals.</p></div>' : '')}
      <div class="compose">
        <div class="row"><div class="src">${esc(src)}</div>
          ${t.phone && t.email ? `<div class="seg"><button data-act="chan" data-chan="Text" class="${ch === 'Text' ? 'on' : ''}">Text</button><button data-act="chan" data-chan="Email" class="${ch === 'Email' ? 'on' : ''}">Email</button></div>` : ''}
        </div>
        ${ch === 'Email' ? `<input data-field="subject" placeholder="Subject" value="${esc(subject)}">` : ''}
        <textarea data-field="body" placeholder="${ch === 'Text' ? 'Your text' : 'Your email'}">${esc(body)}</textarea>
        ${ch === 'Text' ? `<div class="quick"><button data-act="q" data-q="👍">👍</button><button data-act="q" data-q="❤️">❤️</button><button data-act="q" data-q="Sounds good!">Sounds good!</button><button data-act="q" data-q="Thank you!">Thank you!</button><button data-act="q" data-q="Can I give you a call when you have a minute?">Call you?</button><button data-act="q" data-q="https://calebjackson.org" data-append="1">+ site link</button></div>` : ''}
      </div>
      <div class="actions">
        ${t.phone ? `<a class="btn" href="${telHref(t.phone)}" data-act="call">Call</a>` : ''}
        ${ch === 'Text' && t.phone ? `<a class="btn primary" data-act="open-sms" href="#">Open in Messages</a>` : ''}
        ${ch === 'Email' && t.email ? `<a class="btn primary" data-act="open-mail" href="#">Open in Mail</a>` : ''}
        <button class="btn" data-act="send">Send from Pipeline…</button>
        <button class="btn ghost" data-act="sent">Mark sent</button>
        <button class="btn ghost" data-act="called">Called</button>
        ${t.owes_reply ? '<button class="btn ghost" data-act="no_reply">No reply needed</button>' : `<button class="btn ghost" data-act="snooze">Snooze 3 days</button>`}
        <button class="btn ghost" data-act="skip">Skip today</button>
      </div>
      <div class="err" data-err hidden></div>
    </article>`;
  }

  function tasksHTML() {
    const ts = state.data.tasks;
    if (!ts.length) return `<div class="empty">No open tasks.</div>`;
    return ts.map((t) => `<article class="card" data-task="${esc(t.task_id)}" data-pid="${esc(t.person_id)}">
      <h3>${esc(t.task)} ${t.overdue ? '<span class="badge owes">overdue</span>' : ''} ${t.task_id ? '' : '<span class="badge dim">next action</span>'}</h3>
      <p class="why">${state.privacy ? '<span class="hidden-name">' + esc(t.display) + '</span>' : esc(t.display)}</p>
      <div class="meta">due ${esc(dayLabel(t.due) || 'unset')} · ${esc(t.source || '')}${t.band ? ' · ' + esc(t.band) : ''}</div>
      <div class="actions">${t.task_id ? '<button class="btn primary" data-act="done">Done</button>' : '<span class="note">No task_id yet. Run <code>crm.py sync-tasks</code> to make it a real task.</span>'}</div>
      <div class="err" data-err hidden></div></article>`).join('');
  }

  function dealsHTML() {
    const ds = state.data.deals;
    if (!ds.length) return `<div class="empty">No live deals in the CRM Deals tab.</div>`;
    return ds.map((d) => `<article class="card">
      <div class="row"><h3>${state.privacy ? '<span class="hidden-name">' + esc(d.address) + '</span>' : esc(d.address)} ${d.moved_today ? '<span class="badge">moved today</span>' : ''}</h3><span class="money">${money(d.price) || ''}</span></div>
      <div class="meta">${esc(d.side || 'side not set')} · ${esc(d.stage || 'stage not set')}${d.display ? ' · ' + (state.privacy ? 'name hidden' : esc(d.display)) : ''}</div>
      <div class="closes ${d.close_state}">${esc(d.close_line)}</div>
      <div class="kv">
        ${!money(d.price) ? '<div class="k">price</div><div class="warn">Add price in the CRM Deals tab</div>' : ''}
        ${d.commission ? `<div class="k">commission</div><div class="money" style="font-size:14px">${money(d.commission)}</div>` : ''}
        ${d.last_event ? `<div class="k">latest</div><div>${esc(d.last_event)}${d.last_event_at ? ' · ' + esc(dayLabel(d.last_event_at)) : ''}</div>` : ''}
        ${d.next_step ? `<div class="k">next</div><div>${esc(d.next_step)}</div>` : ''}
        <div class="k">source</div><div>${esc(d.source || 'CRM')}</div>
      </div>
      <div class="note">Edit price, close date and next step in the sheet's Deals tab. The feed picks them up within 15 minutes.</div>
    </article>`).join('');
  }

  function leadsHTML() {
    const ls = state.data.new_leads;
    if (!ls.length) return `<div class="empty">No new leads in the last 14 days.</div>`;
    return ls.map((l) => `<article class="card owes" data-id="${esc(l.person_id)}">
      <h3>${state.privacy ? '<span class="hidden-name">' + esc(l.display) + '</span>' : esc(l.display)} <span class="badge owes">new lead</span></h3>
      <p class="why">${esc(l.next_action || 'Call within the hour')}</p>
      <div class="meta">${esc(l.source || '')} · received ${esc(dayLabel(l.received))}</div>
      <div class="actions">
        ${l.phone ? `<a class="btn primary" href="${telHref(l.phone)}">Call</a><a class="btn" href="${smsHref(l.phone, '')}">Text</a>` : ''}
        ${l.email ? `<a class="btn" href="${mailHref(l.email, 'Your note on calebjackson.org', '')}">Email</a>` : ''}
        <button class="btn ghost" data-act="called">Called</button>
      </div>
      <div class="err" data-err hidden></div></article>`).join('');
  }

  function countsHTML() {
    const d = state.data, c = d.counts, bands = c.by_band || {};
    const rows = [['contacts in the CRM', c.contacts], ['touches due', c.touches_due], ['owes a reply', c.owes_reply], ['done today', c.done_today],
      ['tasks open', c.tasks_open], ['tasks overdue', c.tasks_overdue], ['live deals', c.deals_live], ['new leads, 14 days', c.new_leads],
      ['people with text signals', (d.signals || {}).people], ['pre-written drafts ready', d.predrafts], ['queued text lines', d.queues.texts], ['queued email lines', d.queues.emails]];
    const cad = d.cadence_days || {};
    return `<article class="card"><div class="section-title">Pipeline</div><div class="kv">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="mono">${v ?? 0}</div>`).join('')}</div></article>
      <article class="card"><div class="section-title">By band · cadence days</div><div class="kv">${Object.keys(bands).map((b) => `<div class="k">${esc(b)}</div><div class="mono">${bands[b]} <span class="note">every ${cad[b] ?? '?'} days</span></div>`).join('')}</div></article>
      <article class="card"><div class="section-title">Feed</div><div class="kv"><div class="k">generated</div><div class="mono">${esc(d.feed.generated_at)}</div><div class="k">as of</div><div class="mono">${esc(d.as_of)}</div><div class="k">age</div><div class="mono ${d.feed.stale ? 'warn' : ''}">${ago(d.feed.age_seconds)}</div><div class="k">engine</div><div class="mono" style="font-size:11px">${esc(d.engine.path)}${d.engine.exists ? '' : ' <span class="warn">(missing)</span>'}</div><div class="k">send mode</div><div class="mono">${d.live_send ? '<span class="warn">LIVE after approve</span>' : 'dry run'}</div></div></article>
      <article class="card"><div class="section-title">Recent · this device</div>${d.recent_outcomes.length ? d.recent_outcomes.slice(0, 15).map((o) => `<div class="meta">${esc(o.at.slice(11, 16))} · ${esc(o.kind)} · id ${esc(o.person_id)}${o.note ? ' · ' + esc(o.note) : ''}</div>`).join('') : '<div class="note">Nothing yet today.</div>'}</article>
      <article class="card"><div class="section-title">Send log</div>${d.send_log.length ? d.send_log.slice(0, 15).map((s) => `<div class="meta">${esc(s.at.slice(0, 16).replace('T', ' '))} · ${esc(s.channel)} · ${esc(s.status)} · id ${esc(s.person_id)} · ${esc(s.detail || '')}</div>`).join('') : '<div class="note">No sends recorded. Dry runs show here too.</div>'}</article>`;
  }

  // ---------- actions ----------
  function wire(screen) {
    screen.querySelectorAll('[data-act="more"]').forEach((b) => { b.onclick = () => { state.showAll = true; render(); }; });
    screen.querySelectorAll('article.card').forEach((card) => {
      const pid = card.dataset.id || card.dataset.pid;
      const t = pid ? (state.data.touches.find((x) => x.person_id === pid) || state.data.new_leads.find((x) => x.person_id === pid)) : null;
      const err = $('[data-err]', card);
      const fail = (m) => { if (err) { err.textContent = m; err.hidden = false; } };
      const ch = () => (t && (state.channel[pid] || (t.draft && t.draft.channel) || (t.phone ? 'Text' : 'Email'))) || 'Text';
      const bodyEl = $('[data-field="body"]', card), subjEl = $('[data-field="subject"]', card);
      const body = () => (bodyEl ? bodyEl.value : '');
      const subject = () => (subjEl ? subjEl.value : '');
      if (bodyEl) bodyEl.addEventListener('input', () => { state.drafts[`${pid}|${ch()}`] = bodyEl.value; saveDrafts(); });
      if (subjEl) subjEl.addEventListener('input', () => { state.drafts[`${pid}|${ch()}|subject`] = subjEl.value; saveDrafts(); });
      card.querySelectorAll('[data-act="chan"]').forEach((b) => { b.onclick = () => { state.channel[pid] = b.dataset.chan; render(); }; });
      card.querySelectorAll('[data-act="q"]').forEach((b) => { b.onclick = () => { if (!bodyEl) return; bodyEl.value = b.dataset.append ? (bodyEl.value.replace(/\s+$/, '') + (bodyEl.value.trim() ? ' ' : '') + b.dataset.q) : b.dataset.q; bodyEl.dispatchEvent(new Event('input')); bodyEl.focus(); }; });
      const openSms = $('[data-act="open-sms"]', card); if (openSms) openSms.onclick = (e) => { e.preventDefault(); if (!body().trim()) return fail('Write the text first.'); window.location.href = smsHref(t.phone, body()); };
      const openMail = $('[data-act="open-mail"]', card); if (openMail) openMail.onclick = (e) => { e.preventDefault(); if (!body().trim()) return fail('Write the email first.'); window.location.href = mailHref(t.email, subject(), body()); };
      const templateId = () => (t && t.draft && state.drafts[`${pid}|${ch()}`] == null ? t.draft.template_id : (t && t.draft ? t.draft.template_id : ''));

      const act = async (label, fn) => {
        if (state.busy) return; state.busy = true; card.style.opacity = '0.6';
        try { const r = await fn(); if (!r.ok) fail(r.error || 'Not confirmed.'); else { toast(label, r.outcome ? () => api('/api/outcome', { kind: 'undo', outcome_id: r.outcome.id }) : null); if (r.outcome && r.outcome.kind !== 'task_done' && bodyEl) { delete state.drafts[`${pid}|${ch()}`]; saveDrafts(); } await load(); } }
        catch (e) { fail('The server did not answer. Nothing confirmed.'); }
        finally { state.busy = false; card.style.opacity = ''; }
      };
      const on = (sel, f) => { const el = $(sel, card); if (el) el.onclick = (e) => { if (el.tagName === 'BUTTON') e.preventDefault(); f(e); }; };
      on('[data-act="called"]', () => act('Call logged in the CRM', () => api('/api/touch', { person_id: pid, what: 'Called from Pipeline', kind: 'called' })));
      on('[data-act="sent"]', () => { if (!body().trim()) return fail('Nothing to mark: the message box is empty.'); act('Marked sent, touch logged', () => api('/api/mark-sent', { person_id: pid, channel: ch(), to: ch() === 'Text' ? t.phone : t.email, body: body(), subject: subject(), template_id: templateId() })); });
      on('[data-act="skip"]', () => act('Skipped for today', () => api('/api/outcome', { kind: 'skip', person_id: pid })));
      on('[data-act="snooze"]', () => act('Snoozed 3 days', () => api('/api/outcome', { kind: 'snooze', person_id: pid })));
      on('[data-act="no_reply"]', () => act('Marked no reply needed', () => api('/api/outcome', { kind: 'no_reply', person_id: pid })));
      on('[data-act="done"]', () => act('Task closed in the CRM', () => api('/api/done', { task_id: card.dataset.task, person_id: pid, task: $('h3', card).textContent.trim() })));
      on('[data-act="send"]', () => {
        if (!body().trim()) return fail('Write the message first.');
        const channel = ch(), to = channel === 'Text' ? t.phone : t.email;
        if (!to) return fail(channel === 'Text' ? 'No phone number on file.' : 'No email on file.');
        const live = state.data.live_send;
        sheet(channel === 'Text' ? 'Send this text?' : 'Send this email?', `
          <div class="meta">To ${state.privacy ? 'hidden' : esc(to)} · from Pipeline${channel === 'Email' ? ' · aire@calebjackson.org' : ' · Messages on this Mac'}</div>
          ${channel === 'Email' ? `<div class="meta">Subject: ${esc(subject())}</div>` : ''}
          <div class="preview">${esc(body())}</div>
          <p class="note">${live ? '<span class="warn">Live send is on.</span> Approve sends this one message now, then logs the touch in the CRM.' : 'Dry run. Approve records exactly what would go out and sends nothing. Start the server with --live-send to send for real.'}</p>
          <div class="actions"><button class="btn primary" id="approveBtn">${live ? 'Approve and send' : 'Approve (dry run)'}</button><button class="btn ghost" id="cancelBtn">Cancel</button></div>
          <div class="err" id="sheetErr" hidden></div>`);
        $('#cancelBtn').onclick = closeSheet;
        $('#approveBtn').onclick = async () => {
          $('#approveBtn').disabled = true;
          const r = await api('/api/send', { person_id: pid, channel, to, body: body(), subject: subject(), approve: true, template_id: templateId() });
          if (!r.ok) { const e = $('#sheetErr'); e.textContent = r.error || 'Not confirmed.'; e.hidden = false; $('#approveBtn').disabled = false; return; }
          closeSheet();
          toast(r.dry_run ? 'Dry run recorded. Nothing sent.' : `${channel} sent. Touch logged in the CRM.`);
          if (!r.dry_run) { delete state.drafts[`${pid}|${channel}`]; saveDrafts(); }
          load();
        };
      });
    });
  }

  // ---------- boot ----------
  load();
  setInterval(load, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
