/* Desk: Today, Deadlines, Commission and Bank, inside Pipeline. Black and coral. Read only: it shows Calendar and
   Gmail through GET /api/desk (desk.py) and never writes anything. Every button opens Google, or another Pipeline page. */
'use strict';
(function () {
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'desk.css'; document.head.appendChild(link);

  const D = { data: null, error: '', loading: false, at: 0, tab: 'today', focus: false };
  try { D.tab = localStorage.getItem('desk.tab') || 'today'; D.focus = localStorage.getItem('desk.focus') === '1'; } catch (e) { }
  const TABS = [['today', 'Today'], ['deadlines', 'Deadlines'], ['commission', 'Commission'], ['bank', 'Bank']];
  const r = () => (D.data && D.data.result) || null;
  const t = iso => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const d = iso => new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const safe = u => /^https:\/\/(mail\.google\.com|www\.google\.com\/calendar)\//.test(u || '') ? u : '';
  const open = (u, label) => safe(u) ? `<a class="dk-btn ghost" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${label}</a>` : '';
  const countdown = n => n === 0 ? ['Today', 'hot'] : n === 1 ? ['Tomorrow', 'hot'] : n < 0 ? [`${-n}d ago`, ''] : [`In ${n} days`, n <= 3 ? 'warm' : ''];

  async function fetchDesk(force) {
    if (D.loading) return; D.loading = true;
    try { D.data = await api('/api/desk' + (force ? '?refresh=1' : '')); D.error = D.data.ok ? '' : (D.data.error || 'no answer'); D.at = Date.now(); }
    catch (e) { D.error = 'app.py is not answering'; }
    D.loading = false;
    if (!S.data) return; if (S.view === 'desk') render(); else renderNav(feed().counts || {});
  }

  function tile(n, label, sub, cls = '') { return `<div class="dk-tile ${cls}"><b>${n ?? 0}</b><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`; }
  function card(title, right, body, cls = '') { return `<section class="dk-card ${cls}"><header><h4>${title}</h4><div>${right || ''}</div></header>${body}</section>`; }
  function empty(text) { return `<div class="dk-empty">${esc(text)}</div>`; }

  function rightNow(x) {
    const now = Date.now();
    const timed = x.today.filter(e => !e.all_day && !e.free && e.start.includes('T'));
    const cur = timed.find(e => new Date(e.start) <= now && new Date(e.end) > now) || timed.find(e => new Date(e.start) > now);
    if (!cur) return card('Right now', '', empty('Nothing else booked today.'), 'dk-now');
    const live = new Date(cur.start) <= now;
    return card('Right now', `<span class="dk-chip ${live ? 'hot' : ''}">${live ? 'Happening' : 'Next at ' + t(cur.start)}</span>`,
      `<div class="dk-now-title">${esc(cur.title)}</div><div class="dk-muted">${t(cur.start)} to ${t(cur.end)}</div>${cur.notes ? `<p class="dk-notes">${esc(cur.notes)}</p>` : ''}<div class="dk-acts">${open(cur.link, 'Open in Calendar')}</div>`, 'dk-now');
  }
  function timeline(x) {
    if (!x.today.length) return empty('Nothing on the calendar today.');
    const now = Date.now();
    return `<ol class="dk-line">${x.today.map(e => {
      const past = e.end && e.end.includes('T') && new Date(e.end) < now, cur = !past && e.start.includes('T') && new Date(e.start) <= now;
      const chip = { deadline: ['Deadline', 'hot'], block: ['Work block', 'tan'], event: ['Event', ''] }[e.kind];
      return `<li class="${past ? 'past' : ''} ${cur ? 'cur' : ''}"><time>${e.all_day ? 'All day' : t(e.start)}</time><span class="dk-dot"></span><div><b>${esc(e.title)}</b><span class="dk-chip ${chip[1]}">${chip[0]}</span></div>${open(e.link, 'Open')}</li>`;
    }).join('')}</ol>`;
  }
  function deadlineRows(list) {
    if (!list.length) return empty('No contract deadlines on the calendar.');
    return `<ul class="dk-rows">${list.map(e => { const [w, c] = countdown(e.days_out); return `<li><div><b>${esc(e.deal)}</b><span class="dk-muted">${esc(e.what || e.title)} · ${d(e.start)}${e.all_day ? '' : ', ' + t(e.start)}</span></div><span class="dk-chip ${c}">${w}</span>${open(e.link, 'Open')}</li>`; }).join('')}</ul>`;
  }
  function weekBars(x) {
    const max = Math.max(8, ...x.week.map(w => w.hours));
    return `<div class="dk-bars">${x.week.map((w, i) => `<div class="dk-bar ${i === 0 ? 'today' : ''}" title="${w.hours} hours booked"><i style="height:${Math.round(w.hours / max * 100)}%"></i><b>${w.hours ? w.hours : ''}</b><span>${i === 0 ? 'Today' : new Date(w.day + 'T12:00:00').toLocaleDateString([], { weekday: 'short' })}</span></div>`).join('')}</div>`;
  }
  function mailTable(rows, col, emptyText) {
    if (!rows.length) return empty(emptyText);
    return `<table class="dk-table"><thead><tr><th>${col}</th><th>From</th><th>Subject</th><th></th></tr></thead><tbody>${rows.map(m => `<tr><td><span class="dk-chip ${/Lead|Not processed|Deposit/.test(m.category || m.status || m.type) ? 'hot' : ''}">${esc(m.category || m.status || m.type)}</span></td><td>${esc(m.from)}</td><td>${esc(m.subject)}<small>${d(m.date)}</small></td><td>${open(m.link, 'Open')}</td></tr>`).join('')}</tbody></table>`;
  }
  function jarvis(x) {
    const c = x.counts, next = x.deadlines.find(e => e.days_out >= 0);
    const line = [next ? `Next deadline: ${next.deal}, ${countdown(next.days_out)[0].toLowerCase()}.` : 'No deadlines coming.', `${c.leads} new ${c.leads === 1 ? 'lead' : 'leads'} in the inbox.`, `${x.inbox.length} inbox emails in 3 days.`].join(' ');
    return card('Jarvis', '', `<div class="dk-jarvis"><div class="dk-orb"><i></i></div><p>${esc(line)}</p></div>
      <div class="dk-acts"><button class="dk-btn" onclick="Desk.ask()">Ask Jarvis</button><button class="dk-btn ghost" onclick="go('touches')">Touches due</button><button class="dk-btn ghost" onclick="go('leads')">New leads</button></div>
      <div class="dk-links"><a href="https://mail.google.com/" target="_blank" rel="noopener noreferrer">Gmail</a><a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Calendar</a><a href="https://roam.flexmls.com" target="_blank" rel="noopener noreferrer">Flexmls</a><a href="https://calebjackson.org" target="_blank" rel="noopener noreferrer">calebjackson.org</a></div>`, 'dk-nonfocus');
  }

  const pages = {
    today: x => `<div class="dk-tiles">${tile(x.counts.leads, 'New leads', 'inbox, 3 days', x.counts.leads ? 'hot' : '')}${tile(x.counts.deadlines_7d, 'Contract deadlines', 'next 7 days', x.counts.deadlines_3d ? 'hot' : '')}${tile(x.counts.deal_mail, 'Deal emails', 'inbox, 3 days')}${tile(x.counts.booked_today, 'Hours booked', 'today')}</div>
      <div class="dk-grid">${rightNow(x)}${card('Today', '', timeline(x))}</div>
      <div class="dk-grid">${card('Contract deadlines', 'next 7 days', deadlineRows(x.deadlines.filter(e => e.days_out >= 0 && e.days_out <= 7)))}${card('This week', 'hours booked', weekBars(x), 'dk-nonfocus')}</div>
      <div class="dk-grid">${card('Inbox', 'last 3 days', mailTable(x.inbox, 'Type', 'Inbox is clear.'), 'dk-nonfocus')}${jarvis(x)}</div>`,
    deadlines: x => {
      const byDeal = {}; x.deadlines.forEach(e => (byDeal[e.deal] = byDeal[e.deal] || []).push(e));
      return `<div class="dk-tiles">${tile(x.counts.deadlines_3d, 'Due in 3 days', '', x.counts.deadlines_3d ? 'hot' : '')}${tile(x.counts.deadlines_30d, 'Deadlines', 'next 30 days')}${tile(x.counts.deals_with_deadline, 'Deals', 'with a deadline')}${tile(x.counts.acts_of_sale, 'Acts of sale', 'next 30 days')}</div>
        ${Object.keys(byDeal).length ? Object.entries(byDeal).map(([deal, list]) => card(esc(deal), `${list.length} ${list.length === 1 ? 'date' : 'dates'}`, deadlineRows(list))).join('') : card('Deadlines', '', empty('No contract deadlines in the next 30 days.'))}`;
    },
    commission: x => `<div class="dk-tiles">${tile(x.counts.commission, 'Commission emails', '120 days')}${tile(x.counts.not_processed, 'Not processed', 'needs a look', x.counts.not_processed ? 'hot' : '')}${tile(x.counts.acts_of_sale, 'Closings coming', 'next 30 days')}${tile(`${x.split.agent}/${x.split.brokerage}`, 'Your split', 'until you cap, cap year starts Nov 1', 'tan')}</div>
      <div class="dk-grid">${card('Commission notices', '', mailTable(x.commission, 'Status', 'No commission emails in 120 days.'))}${card('Paydays on the calendar', 'acts of sale', deadlineRows(x.acts_of_sale))}</div>
      <p class="dk-foot">Dollar amounts need a source first: a commission sheet or KW Command. Nothing here is a number until then.</p>`,
    bank: x => `<div class="dk-tiles">${tile(x.counts.bank, 'Chase alerts', '30 days')}${tile(x.counts.deposits, 'Deposit alerts', '30 days', x.counts.deposits ? 'hot' : '')}</div>
      ${card('Chase', '<span class="dk-chip tan">Read only</span>', mailTable(x.bank, 'Type', 'No Chase alerts in this inbox yet. Turn on deposit and balance alerts to aire@calebjackson.org in the Chase app.'))}
      <p class="dk-foot">Reads Chase alert emails only. No bank sign-in, no account numbers, nothing moves.</p>`,
  };

  window.viewDesk = function () {
    if (!D.data || Date.now() - D.at > 300000) fetchDesk(false);
    const x = r();
    const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    const lede = x ? `${(n => `${n} work ${n === 1 ? 'block' : 'blocks'}`)(x.today.filter(e => e.kind === 'block').length)} today, ${x.counts.deadlines_7d} contract ${x.counts.deadlines_7d === 1 ? 'deadline' : 'deadlines'} in the next 7 days, ${x.counts.leads} new lead ${x.counts.leads === 1 ? 'email' : 'emails'} in 3 days.` : '';
    const body = x ? pages[D.tab](x) : D.error ? `<div class="dk-empty big"><b>Desk can't read Google yet</b><span>${esc(D.error)}</span><button class="dk-btn" onclick="Desk.reload()">Try again</button></div>` : `<div class="dk-empty big">Reading Calendar and Gmail…</div>`;
    return `<div class="view desk ${D.focus ? 'focus' : ''}">
      <header class="dk-head"><div><div class="dk-eyebrow">AIRE · Jarvis${D.data && D.data.demo ? ' · demo, made-up people' : ''}</div><h2>${esc(today)}</h2><p>${esc(lede)}</p></div>
        <div class="dk-head-acts"><button class="dk-toggle" aria-pressed="${D.focus}" onclick="Desk.focus()"><i></i>Focus mode</button><button class="dk-btn ghost" onclick="Desk.reload()" title="Read Calendar and Gmail again">${D.loading ? 'Reading…' : 'Refresh'}</button></div></header>
      <nav class="dk-tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${D.tab === k}" onclick="Desk.tab('${k}')">${l}${x && k === 'deadlines' && x.counts.deadlines_3d ? `<em>${x.counts.deadlines_3d}</em>` : ''}${x && k === 'commission' && x.counts.not_processed ? `<em>${x.counts.not_processed}</em>` : ''}</button>`).join('')}</nav>
      ${body}${x ? `<div class="dk-asof">Read ${t(x.as_of)} · read only</div>` : ''}</div>`;
  };

  window.Desk = {
    tab(k) { D.tab = k; try { localStorage.setItem('desk.tab', k); } catch (e) { } render(); },
    focus() { D.focus = !D.focus; try { localStorage.setItem('desk.focus', D.focus ? '1' : '0'); } catch (e) { } render(); },
    reload() { fetchDesk(true); render(); },
    ask() { const i = $('#type-cmd'); if (i) { i.focus(); i.placeholder = 'ask Jarvis anything'; } },
    mounted() { },
    navCount() { const x = r(); return x ? x.counts.deadlines_3d : 0; },
    navWarn() { const x = r(); return !!(x && x.counts.deadlines_3d); },
    _state: D,
  };
  setTimeout(() => fetchDesk(false), 1500); // the nav count shows without opening the tab
})();
