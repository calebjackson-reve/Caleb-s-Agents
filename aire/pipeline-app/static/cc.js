/* Command Center pages inside Pipeline: Dashboard, Commission, Deadlines, Calendar, Leads, Scorecard.
   Numbers come from /api/cc (cc.py). Every card names its source and as-of time, and turns amber or red
   when its read is stale or failed. Names, contacts and money show as they are. Only the Bank page hides
   its own figures until Show is pressed there. Uses esc, $, api, toast and go from app.js. */
(function () {
  const C = window.CC = { after: {}, data: null, bankHide: true, cal: { mode: 'week', off: 0, hide: new Set() }, err: null };
  const money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const money2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Cents show when the sheet holds them ($1,234.50), whole dollars otherwise ($45,000).
  const dollars = v => (Math.abs(Math.round(v * 100) % 100) ? money2 : money0).format(v);
  const TZ = 'America/Chicago';
  const fmtDay = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
  const fmtTime = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const KIND = { closing: 'Closing', deadline: 'Deadline', inspection: 'Inspection', showing: 'Showing', listing: 'Listing appt',
    client: 'Client', block: 'Work block', personal: 'Personal', other: 'Other' };
  const NAMES = { deals: 'AIRE Deals sheet', calendar: 'Google Calendar', inbox: 'Gmail inbox', leads: 'Website lead emails',
    commission_mail: 'Commission mail', goals: 'Goals', history: 'Scorecard history' };

  // ---- formatting
  const m = v => (v == null ? '—' : dollars(v));
  const mk = v => (v == null ? '—' : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : dollars(v));
  const contact = v => (!v ? '' : esc(v));
  const day = k => (k ? fmtDay.format(new Date(k + 'T12:00:00Z')) : '');
  const time = s => (s && s.length > 10 ? fmtTime.format(new Date(s)) : 'All day');
  const n = v => (v == null ? '—' : Number(v).toLocaleString());
  // Minutes, then hours, then days: "18 min ago", "5 hours ago", "13 days ago". Never "18720 min ago".
  const ago = min => { if (min == null) return ''; const u = (k, w) => `${k} ${w}${k === 1 ? '' : 's'} ago`;
    return min < 1 ? 'just now' : min < 60 ? Math.round(min) + ' min ago' : min < 1440 ? u(Math.floor(min / 60), 'hour') : u(Math.floor(min / 1440), 'day'); };
  C.ago = ago;
  // Deal photos from ~/Pictures/Pipeline/<street address>/ on the Mac, behind the login. No photo: the stage color.
  C.photos = C.photos || {};
  C.photoUrl = (deal, i) => { const k = C.dealKey(deal); return C.photos[k] ? `/photo/${encodeURIComponent(k.replace(/\s+/g, '-'))}/${i || 0}` : null; };
  C.thumb = deal => { const u = C.photoUrl(deal); return u ? `<img class="cc-thumb" src="${u}" alt="" loading="lazy">` : '<span class="cc-av" aria-hidden="true">⌂</span>'; };
  C.cover = (deal, stage) => { const u = C.photoUrl(deal); return u ? `<img class="cc-photo" src="${u}" alt="${esc(deal)}" loading="lazy">` : `<div class="cc-photo ph st-${esc(stage || 'other')}" aria-hidden="true">⌂</div>`; };
  // Booked time: minutes under an hour ("15 min"), hours with one decimal after ("1.5 h").
  C.bookedText = (h, mins) => C.booked(h, mins).replace(/<[^>]*>/g, '');
  C.booked = (h, mins) => { const mi = mins ?? (h == null ? null : Math.round(h * 60));
    return mi == null ? '—' : mi < 60 ? `${mi}<small> min</small>` : `${n(Math.round(mi / 6) / 10)}<small> h</small>`; };

  function src(names, short) {
    const f = (C.data && C.data.fresh) || {};
    return [].concat(names).map(k => {
      const r = f[k] || (C.local && C.local(k)) || { state: 'missing' };
      const when = r.at ? 'as of ' + fmtTime.format(new Date(r.at)) + ', ' + ago(r.age_min) : 'never read';
      const what = r.state === 'failed' ? (short ? 'read failed' : 'read failed: ' + (r.error_text || 'the read did not finish') + ', showing the last good read')
        : r.state === 'stale' ? 'out of date' : r.state === 'late' ? 'late' + (r.pace_min ? `, reads every ${r.pace_min} min` : '') : r.state === 'missing' ? 'not synced yet' : '';
      return `<span class="cc-src is-${r.state}"><i aria-hidden="true"></i><span class="cc-src-n">${esc(r.source || NAMES[k] || k)} · </span>${esc(when)}${what ? ' · <b>' + esc(what) + '</b>' : ''}</span>`;
    }).join('');
  }
  const card = (title, body, sources, extra = '') => `<section class="cc-card ${extra}"><h2>${title}</h2>${body}<footer>${src(sources)}</footer></section>`;
  // Deadline tiles: the count in the big spot, and how many have no date on the line beneath (round 4).
  C.dated = (count, undated) => n(count);
  C.overdueLine = k => (k ? `<b class="cc-overdue">${n(k)} overdue</b> · ` : '');
  C.undatedLine = (undated, more) => (undated ? `<b class="cc-undated">${n(undated)} ${more ? 'more ' : ''}written without a date</b> · ` : '');
  const tile = (label, value, sub, sources, go) => `<${go ? `button type="button" onclick="go('${go}')"` : 'div'} class="cc-tile">
      <span class="cc-tile-l">${label}</span><b class="cc-num">${value}</b><span class="cc-sub">${sub || ''}</span>${src(sources, true)}</${go ? 'button' : 'div'}>`;
  const empty = t => `<p class="cc-empty">${t}</p>`;
  const head = (h, p) => `<header class="cc-head"><div><h1>${h}</h1><p>${p}</p></div></header>${askBox()}`;
  // Ask Claude about the page you are on. Only this page's numbers go, no phones or emails. The Bank page sends no amounts while its figures are hidden.
  C.asks = {};
  function askBox() {
    const a = (C.data && C.data.ask) || {}, page = S.view, st = C.asks[page] || {};
    if (!a.on || (a.pages && !a.pages.includes(page))) return '';
    return `<details class="cc-ask" ${st.open ? 'open' : ''} ontoggle="CC.asks['${page}']=Object.assign(CC.asks['${page}']||{},{open:this.open})">
      <summary>Ask Claude about this page</summary>
      <form onsubmit="CC.ask(event)"><label class="sr" for="cc-ask-q">Question</label><input id="cc-ask-q" name="q" maxlength="500" required placeholder="What needs my attention here?" value="${esc(st.q || '')}">
      <button type="submit" class="cc-primary" ${st.busy ? 'disabled' : ''}>${st.busy ? 'Asking…' : 'Ask'}</button></form>
      ${st.answer ? `<div class="cc-answer" aria-live="polite">${esc(st.answer).split('\n').join('<br>')}</div>` : ''}${st.error ? `<p class="cc-warn" role="alert">${esc(st.error)}</p>` : ''}
      <p class="cc-note">Sends this page's numbers to Claude ${esc(a.model || '')}, never phones or emails${page === 'bank' && C.bankHide ? ', and no amounts while bank figures are hidden' : ''}. About 1 cent a question. $${Number(a.spent || 0).toFixed(2)} of $${Number(a.cap || 1).toFixed(2)} used today.</p></details>`;
  }
  C.ask = async e => {
    e.preventDefault();
    const page = S.view, q = new FormData(e.target).get('q');
    C.asks[page] = { open: true, q, busy: true }; render();
    const r = await api('/api/cc/ask', { page, question: q, private: page === 'bank' && C.bankHide }).catch(() => ({ ok: false, error: 'Pipeline did not answer' }));
    C.asks[page] = { open: true, q, answer: r.ok ? r.answer : '', error: r.ok ? '' : r.error };
    if (r.ok && C.data && C.data.ask) C.data.ask.spent = r.spent;
    render();
  };
  // The one hide control left: the Bank page's own figures. It starts hidden and hides again when you leave the page.
  C.toggleBank = function () { C.bankHide = !C.bankHide; if (C.bankHide) delete C.asks.bank; C.rerender(); };
  // Any way off the Bank page (a nav click, the search box, a link) hides its figures again, and drops an Ask Claude
  // answer that may quote them. render() in app.js calls this first.
  C.leaveBank = function () { if (S.view !== 'bank' && !C.bankHide) { C.bankHide = true; delete C.asks.bank; } };
  C.rerender = function () { render(); };
  C.load = async function () {
    try { const ph = await api('/api/photos'); if (ph && ph.ok) C.photos = ph.deals || {}; } catch (e) { }
    try { const d = await api('/api/cc'); if (d && d.fresh) { C.data = d; C.err = null; } else if (!C.data) C.err = d && d.error === 'offline' ? "can't reach the Mac and there is no saved copy on this device yet" : (d && d.error) || 'no answer'; } catch (e) { if (!C.data) C.err = 'Pipeline did not answer /api/cc'; }
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
    const d = C.data, sc = d.scorecard, wk = d.week[0] || {}, np = d.commission_mail.filter(r => r.status === 'Not processed' || r.status === 'No closed deal').length;
    const uc = d.stages.find(r => r.stage === 'contract') || {};
    const lc = d.lead_counts || { d14: d.leads.length, d7: sc.leads7.value }, leads = lc.d14, leads7 = lc.d7;
    const today = d.calendar.filter(r => r.day === d.today && r.kind !== 'block' && !r.invite);
    const ff = ((typeof S !== "undefined" && S.data) && S.data.feed) || {}, td = ff.touches_due || [], tk = ff.tasks || [];
    const owes = typeof owesReply === 'function' ? owesReply().length : td.filter(r => r.owes_reply).length, over = tk.filter(t => t.overdue).length, dr = typeof readyDrafts === 'function' && S.data ? readyDrafts().length : 0;
    const gp = sc.gci.goal, offers = d.deals.filter(r => r.stage === 'offer');
    return `<div class="cc-page">${head('Good ' + greet() + ', Caleb', 'Keller Williams First Choice · No paid leads, just service')}
      <div class="cc-acts cc-quick"><button type="button" class="cc-primary" onclick="CC.addLead()">＋ Add a lead</button><button type="button" onclick="go('touches')">Touches due</button><button type="button" onclick="openTask('')">＋ Add a task</button></div>
      <div class="cc-tiles">
        ${tile('Pending commission', m(sc.pending.value), `${sc.pending.deals} under contract${sc.pending.blank ? ` · <em>${sc.pending.blank} with no commission on the sheet</em>` : ''}`, 'deals', 'commission')}
        ${tile('GCI this year', m(sc.gci.value), (gp ? `${gp.pct}% of goal · pace ${gp.pace_pct}%` : 'No goal set') + (sc.gci.blank ? ` · <em>${sc.gci.blank} closed with no commission</em>` : '') + `${sc.gci.est ? ` · <em>includes ${m(sc.gci.est.value)} estimated at ${sc.gci.est.rate * 100}% of price for ${sc.gci.est.n} closings</em>` : ''}`, ['deals', 'goals'], 'scorecard')}
        ${tile('Deadlines, 7 days', C.dated(d.deadlines.d7.length, (d.deadlines.undated || []).length), `${C.overdueLine((d.deadlines.overdue || []).length)}${C.undatedLine((d.deadlines.undated || []).length)}${d.deadlines.d3.length} in the next 3 days`, ['deals', 'calendar'], 'deadlines')}
        ${tile('New leads, 14 days', n(leads), `${n(leads7)} in the last 7 days${sc.leads7.low ? ` · goal ${sc.leads7.low} to ${sc.leads7.high} a week` : ''}${C.local && !C.local('command').at ? ' · <em>KW Command leads not checked, its reader has never run</em>' : ''}`, ['leads', 'crm'], 'ccleads')}
      </div>
      ${C.todayCard ? C.todayCard() : ''}
      <div class="cc-tiles">
        ${tile('Under contract', n(uc.n), `${mk(uc.volume)} volume on the Deals sheet`, 'deals', 'deals')}
        ${tile('Touches due', n(td.length), owes ? `${owes} owe a reply` : 'Nobody owes a reply', 'crm', 'touches')}
        ${S.data && S.data.feed_ok ? tile('Tasks open', n(tk.length), over ? `<em>${over} overdue</em>` : 'None overdue', 'crm', 'tasks') : tile('Tasks open', '—', "<em>Tasks didn't load</em>", 'crm', 'sources')}
        ${tile('Drafts ready', n(dr), `Written texts and emails to read and send${owes ? ` · ${owes} replies to write are not counted` : ''}`, 'drafts', 'queue')}
        ${tile('Appointments, 7 days', n(sc.appts7.value), `${sc.appts7.invites ? `${sc.appts7.invites} invite${sc.appts7.invites === 1 ? '' : 's'} not accepted, not counted · ` : ''}${sc.appts7.goal ? `Goal ${sc.appts7.goal}` : 'Accepted showings, listing appts, clients'}`, 'calendar', 'calendar')}
        ${tile('Booked today', C.booked(wk.hours, wk.minutes), `${n(wk.events)} timed event${wk.events === 1 ? '' : 's'}. Work blocks and invites you have not accepted are left out.`, 'calendar', 'calendar')}
        ${tile('Offers out', n(offers.filter(r => !C.isExpired(r)).length), offers.some(C.isExpired) ? `${offers.filter(C.isExpired).length} expired, confirm on the Fix list` : offers.length ? 'None past their deadline' : 'No open offers on the Deals sheet', 'deals', 'deals')}
        ${tile('Commission to check', n(np), np ? 'Not processed at KW, or paid with no closed deal on the sheet' : 'Nothing waiting at KW', ['commission_mail', 'deals'], 'commission')}
      </div>
      <div class="cc-grid">
        ${card('On the calendar today', (today.length ? `<ul class="cc-list">${today.map(evRow).join('')}</ul>` : empty('Nothing on the calendar today.')) + '<p class="cc-note">Work blocks and invites you have not accepted are left out.</p>', 'calendar')}
        ${card('Deadlines, next 7 days', deadlineList(d.deadlines.d7), ['deals', 'calendar'])}
        ${card('Inbox, leads first', d.inbox.length ? `<ul class="cc-list">${d.inbox.slice(0, 6).map(inboxRow).join('')}</ul>` : empty('Inbox is clear for the last 3 days.'), ['inbox', 'leads'])}
      </div>${C.dashMore ? C.dashMore() : ''}</div>`;
  }
  function greet() { const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date())); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; }
  const evTitle = r => esc(r.title);
  const evRow = r => `<li class="cc-ev k-${r.kind === 'closing' ? 'sale' : r.kind}"><span class="cc-when">${time(r.start)}</span><span class="cc-what">${evTitle(r)}</span><span class="cc-chip">${r.invite ? 'Invite, not accepted' : KIND[r.kind]}</span></li>`;
  const inboxRow = r => `<li class="cc-ev"><span class="cc-chip c-${r.category}">${r.category}</span><span class="cc-what">${esc(r.subject)}<small>${contact(senderName(r.sender))}</small></span></li>`;
  const senderName = s => String(s || '').replace(/<[^>]*>/g, '').trim();
  function deadlineList(rows) {
    // A deal's words can hold a date Pipeline could not read: that is never "no deadlines".
    const chk = (C.data.deadlines || {}).check || [];
    const chkList = chk.length ? `<ul class="cc-list">${chk.map(r => `<li class="cc-ev k-deadline"><span class="cc-what">${esc(r.deal)} · ${esc(r.step)}<small>${C.scrub(r.note)}</small></span><span class="cc-chip">Contains a date, check it</span></li>`).join('')}</ul>` : '';
    if (!rows.length) return chk.length ? `<p class="cc-note">No date Pipeline could read with confidence in this window. ${chk.length === 1 ? 'One step contains' : chk.length + ' steps contain'} a date, check ${chk.length === 1 ? 'it' : 'them'}:</p>${chkList}` : empty('No contract deadlines in this window.');
    return `<ul class="cc-list">${rows.map(r => { const k = dlKind(r); return `<li class="cc-ev k-${k} ${r.day <= addDays(C.data.today, 2) ? 'is-soon' : ''}"><span class="cc-when">${day(r.day)}${r.time ? ' ' + esc(r.time) : ''}</span><span class="cc-what">${esc(r.what)}<small>${esc(r.deal)} · ${r.from === 'both' ? 'Deals sheet and calendar' : r.from === 'sheet' ? 'Deals sheet' : 'calendar'}</small>${r.disagree ? `<small class="cc-warn">Dates disagree. Deals sheet: ${day(r.disagree.sheet)}. Calendar: ${(r.disagree.days || []).map(x => day(x.day) + (x.time ? ' ' + esc(x.time) : '')).join(' and ')}.</small>` : r.note ? `<small class="cc-warn">Shown from the Deals sheet. ${esc(r.note)}.</small>` : ''}${r.said ? `<small>Read from the words: ${C.scrub(r.said)}</small>` : ''}</span><span class="cc-chip">${DL[k]}</span></li>`; }).join('')}</ul>${chkList}`;
  }
  // A contract deadline's type, for its color: act of sale, inspection, appraisal or financing, anything else.
  const DL = { sale: 'Act of sale', inspection: 'Inspection', finance: 'Appraisal / loan', deadline: 'Deadline' };
  function dlKind(r) { const t = (r.what || '') + ' ' + (r.title || ''); return /act of sale|closing/i.test(t) ? 'sale' : /inspect/i.test(t) ? 'inspection' : /apprais|financ|loan|mortgage/i.test(t) ? 'finance' : 'deadline'; }
  function addDays(k, x) { const t = new Date(k + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + x); return t.toISOString().slice(0, 10); }

  // ---------------- One deal source, one lead list ----------------
  // A street key, the same rule as cc.deal_key: the first house number followed by a street word, directions dropped.
  // '2179 South Turnberry Avenue', '2179 S Turnberry Ave' and 'Act of Sale · 2179 South Turnberry' are all '2179 turnberry'.
  const DIRS = new Set(['n', 's', 'e', 'w', 'north', 'south', 'east', 'west']);
  C.dealKey = t => {
    const w = String(t || '').toLowerCase().match(/[a-z0-9]+/g) || [];
    for (let i = 0; i < w.length; i++) {
      if (!/^\d+$/.test(w[i])) continue;
      const rest = w.slice(i + 1).filter(x => !DIRS.has(x));
      if (rest.length && /[a-z]/.test(rest[0])) return w[i] + ' ' + rest[0];
    }
    return w.slice(0, 2).join(' ');
  };
  // The AIRE Deals sheet row for a street, or null. Every screen that names a deal's status, price or act of sale reads this.
  C.sheetDeal = t => { const k = C.dealKey(t); return ((C.data && C.data.deals) || []).find(r => (r.key || C.dealKey(r.deal)) === k) || null; };
  // An offer past its deadline is not open (links.py decides, so every screen agrees). A row the Mac has not tied yet
  // falls back to its own deadline.
  // The one deal record for a street (links.records): the side, close date, price and status every screen shows.
  C.dealRecords = () => (C.data && C.data.deal_records) || (typeof S !== 'undefined' && S.data && S.data.deal_records) || [];
  C.dealRecord = t => { const k = C.dealKey(t); return C.dealRecords().find(r => r.key === k) || null; };
  C.isExpired = r => { const rec = C.dealRecords().find(x => x.key === r.key); if (rec) return !!rec.expired_offer; const t = ((C.data && C.data.ties) || []).find(x => x.key === r.key); return t ? !!t.expired_offer : r.stage === 'offer' && !!r.offer && !r.offer.superseded && C.offerExpired(r.offer); };
  C.openDeals = () => ((C.data && C.data.deals) || []).filter(r => !['closed', 'out'].includes(r.stage) && !C.isExpired(r));
  // The one lead list (cc.merge_leads, test leads already out), within the last n days counting today.
  // Same rule as cc.in_lead_window: a lead with no date is in the 14 days, never in the 7.
  C.leadsIn = days => { const d = C.data; if (!d) return []; const since = addDays(d.today, 1 - days); return d.leads.filter(r => { const k = String(r.received || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(k) ? k >= since : days >= 14; }); };

  C.views = { dash };
  Object.assign(C, { greet, addDaysK: addDays, m, mk, contact, day, time, n, src, card, tile, empty, head, guard, evRow, inboxRow, deadlineList, addDays, KIND, senderName, esc: s => esc(s) });
})();
