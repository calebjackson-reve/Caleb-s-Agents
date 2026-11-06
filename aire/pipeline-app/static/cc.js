/* Command Center pages inside Pipeline: Dashboard, Commission, Deadlines, Calendar, Leads, Scorecard.
   Numbers come from /api/cc (cc.py). Every card names its source and as-of time, and turns amber or red
   when its read is stale or failed. Money and contact details stay hidden until Show is pressed, and hide
   again after two minutes. Uses esc, $, api, toast and go from app.js. */
(function () {
  const C = window.CC = { data: null, priv: true, privTimer: null, cal: { mode: 'week', off: 0, hide: new Set() }, err: null };
  const money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const TZ = 'America/Chicago';
  const fmtDay = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
  const fmtTime = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const KIND = { closing: 'Closing', deadline: 'Deadline', inspection: 'Inspection', showing: 'Showing', listing: 'Listing appt',
    client: 'Client', block: 'Work block', personal: 'Personal', other: 'Other' };
  const NAMES = { deals: 'AIRE Deals sheet', calendar: 'Google Calendar', inbox: 'Gmail inbox', leads: 'Website lead emails',
    commission_mail: 'Commission mail', goals: 'Goals', history: 'Scorecard history' };

  // ---- formatting, with the privacy lock
  const m = v => (v == null ? '—' : C.priv ? '$•••' : money0.format(v));
  const mk = v => (v == null ? '—' : C.priv ? '$•••' : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : money0.format(v));
  const contact = v => (!v ? '' : C.priv ? '•••' : esc(v));
  const day = k => (k ? fmtDay.format(new Date(k + 'T12:00:00Z')) : '');
  const time = s => (s && s.length > 10 ? fmtTime.format(new Date(s)) : 'All day');
  const n = v => (v == null ? '—' : Number(v).toLocaleString());
  const ago = min => (min == null ? '' : min < 1 ? 'just now' : min < 60 ? min + ' min ago' : min < 1440 ? Math.floor(min / 60) + 'h ago' : Math.floor(min / 1440) + 'd ago');

  function src(names) {
    const f = (C.data && C.data.fresh) || {};
    return [].concat(names).map(k => {
      const r = f[k] || { state: 'missing' };
      const when = r.at ? 'as of ' + fmtTime.format(new Date(r.at)) + ', ' + ago(r.age_min) : 'never read';
      const what = r.state === 'failed' ? 'read failed: ' + (r.error || 'unknown') + ', showing the last good read'
        : r.state === 'stale' ? 'out of date' : r.state === 'missing' ? 'not synced yet' : '';
      return `<span class="cc-src is-${r.state}"><i aria-hidden="true"></i><span class="cc-src-n">${esc(r.source || NAMES[k] || k)} · </span>${esc(when)}${what ? ' · <b>' + esc(what) + '</b>' : ''}</span>`;
    }).join('');
  }
  const card = (title, body, sources, extra = '') => `<section class="cc-card ${extra}"><h2>${title}</h2>${body}<footer>${src(sources)}</footer></section>`;
  const tile = (label, value, sub, sources, go) => `<${go ? `button type="button" onclick="go('${go}')"` : 'div'} class="cc-tile">
      <span class="cc-tile-l">${label}</span><b class="cc-num">${value}</b><span class="cc-sub">${sub || ''}</span>${src(sources)}</${go ? 'button' : 'div'}>`;
  const empty = t => `<p class="cc-empty">${t}</p>`;
  const head = (h, p) => `<header class="cc-head"><div><h1>${h}</h1><p>${p}</p></div>${privBtn()}</header>`;
  const privBtn = () => `<button type="button" class="cc-priv" aria-pressed="${!C.priv}" onclick="CC.togglePriv()">${C.priv ? 'Show money and contacts' : 'Hide money and contacts'}</button>`;

  C.togglePriv = function () {
    C.priv = !C.priv; clearTimeout(C.privTimer);
    if (!C.priv) C.privTimer = setTimeout(() => { C.priv = true; C.rerender(); }, 120000);
    C.rerender();
  };
  C.rerender = function () { if (C.views[S.view]) render(); };
  C.load = async function () {
    try { C.data = await api('/api/cc'); C.err = null; } catch (e) { C.err = 'Pipeline did not answer /api/cc'; }
    C.rerender();
  };

  function guard() {
    if (C.err) return `<div class="cc-page">${empty('The Command Center read failed: ' + esc(C.err) + '. The numbers below would be guesses, so none are shown.')}</div>`;
    if (!C.data) return `<div class="cc-page">${empty('Reading the Command Center…')}</div>`;
    return '';
  }

  // ---------------- Dashboard ----------------
  function dash() {
    const g = guard(); if (g) return g;
    const d = C.data, sc = d.scorecard, wk = d.week[0] || {}, np = d.commission_mail.filter(r => r.status === 'Not processed').length;
    const uc = d.stages.find(r => r.stage === 'contract') || {};
    const leads7 = sc.leads7.value;
    const today = d.calendar.filter(r => r.day === d.today && r.kind !== 'block');
    const gp = sc.gci.goal;
    return `<div class="cc-page">${head('Good ' + greet() + ', Caleb', 'Keller Williams First Choice · No paid leads, just service')}
      <div class="cc-tiles">
        ${tile('Pending commission', m(sc.pending.value), `${sc.pending.deals} under contract${sc.pending.blank ? ` · <em>${sc.pending.blank} blank on the sheet</em>` : ''}`, 'deals', 'commission')}
        ${tile('GCI this year', m(sc.gci.value), gp ? `${gp.pct}% of goal · pace ${gp.pace_pct}%` : 'No goal set', ['deals', 'goals'], 'scorecard')}
        ${tile('Deadlines, 7 days', n(d.deadlines.d7.length), `${d.deadlines.d3.length} in the next 3 days`, 'calendar', 'deadlines')}
        ${tile('New leads, 7 days', n(leads7), sc.leads7.low ? `Goal ${sc.leads7.low} to ${sc.leads7.high} a week` : 'Website leads', 'leads', 'ccleads')}
        ${tile('Under contract', mk(uc.volume), `${n(uc.n)} deals · volume`, 'deals', 'commission')}
        ${tile('Appointments, 7 days', n(sc.appts7.value), sc.appts7.goal ? `Goal ${sc.appts7.goal}` : 'Showings, listing appts, clients', 'calendar', 'calendar')}
        ${tile('Booked today', n(wk.hours) + '<small>h</small>', `${n(wk.events)} timed events`, 'calendar', 'calendar')}
        ${tile('Not processed', n(np), np ? 'Commission emails to chase' : 'Nothing waiting at KW', 'commission_mail', 'commission')}
      </div>
      <div class="cc-grid">
        ${card('Today', today.length ? `<ul class="cc-list">${today.map(evRow).join('')}</ul>` : empty('Nothing on the calendar today.'), 'calendar')}
        ${card('Deadlines, next 7 days', deadlineList(d.deadlines.d7), 'calendar')}
        ${card('Inbox, leads first', d.inbox.length ? `<ul class="cc-list">${d.inbox.slice(0, 6).map(inboxRow).join('')}</ul>` : empty('Inbox is clear for the last 3 days.'), ['inbox', 'leads'])}
      </div></div>`;
  }
  function greet() { const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date())); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; }
  const evRow = r => `<li class="cc-ev k-${r.kind}"><span class="cc-when">${time(r.start)}</span><span class="cc-what">${esc(r.title)}</span><span class="cc-chip">${KIND[r.kind]}</span></li>`;
  const inboxRow = r => `<li class="cc-ev"><span class="cc-chip c-${r.category}">${r.category}</span><span class="cc-what">${esc(r.subject)}<small>${contact(senderName(r.sender))}</small></span></li>`;
  const senderName = s => String(s || '').replace(/<[^>]*>/g, '').trim();
  function deadlineList(rows) {
    if (!rows.length) return empty('No contract deadlines in this window.');
    return `<ul class="cc-list">${rows.map(r => `<li class="cc-ev ${r.day <= addDays(C.data.today, 2) ? 'is-soon' : ''}"><span class="cc-when">${day(r.day)}</span><span class="cc-what">${esc(r.what)}<small>${esc(r.deal)}</small></span></li>`).join('')}</ul>`;
  }
  function addDays(k, x) { const t = new Date(k + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + x); return t.toISOString().slice(0, 10); }

  C.views = { dash };
  Object.assign(C, { m, mk, contact, day, time, n, src, card, tile, empty, head, guard, evRow, inboxRow, deadlineList, addDays, KIND, senderName });
})();
