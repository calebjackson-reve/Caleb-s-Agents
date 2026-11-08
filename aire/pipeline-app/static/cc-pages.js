/* Command Center pages: Commission, Deadlines, Calendar, Leads, Scorecard. Helpers come from cc.js (window.CC). */
(function () {
  const C = window.CC;
  const { m, n, day, time, card, tile, empty, head, guard, evRow, deadlineList, contact, src, KIND } = C;

  // ---------------- Commission ----------------
  function commission() {
    const g = guard(); if (g) return g;
    const d = C.data, sc = d.scorecard, cap = sc.cap;
    const np = d.commission_mail.filter(r => r.status === 'Not processed'), nc = d.commission_mail.filter(r => r.status === 'No closed deal');
    const paidFrom = sc.gci.from === 'kw_paid' ? 'Paid on KW commission forms' : 'Closed deals in your sheet this year';
    const live = d.deals.filter(r => r.stage !== 'out');
    return `<div class="cc-page">${head('Commission', 'Amounts are gross, before the KW 70/30 split · ' + (cap ? 'cap year from ' + day(cap.start) : 'cap and cap year not set yet, add them on Scorecard'))}
      <div class="cc-tiles">
        ${tile('GCI paid', m(sc.gci.value), paidFrom + (sc.gci.blank ? ` · <em>${sc.gci.blank} closed with no commission</em>` : ''), 'deals')}
        ${tile('Paid plus pending', m(sc.gci.with_pending), 'Paid, plus every deal under contract', 'deals')}
        ${tile('Pending, gross', m(sc.pending.value), `${sc.pending.deals} under contract${sc.pending.blank ? ` · <em>${sc.pending.blank} with no commission on the sheet</em>` : ''}`, 'deals')}
        ${tile('Toward cap', cap ? m(cap.paid) : '—', cap ? `${cap.pct}% of ${m(cap.amount)} · ${m(cap.left)} to go` : 'Set the cap amount and start date on Scorecard', ['deals', 'goals'])}
        ${tile('Not processed', n(np.length), np.length ? 'KW has not processed these yet' : 'Nothing waiting', 'commission_mail')}
        ${tile('Paid, no closed deal', n(nc.length), nc.length ? 'Commission came in for a street the Deals sheet does not show as closed' : 'Every paid commission matches a closed deal', ['commission_mail', 'deals'])}
      </div>
      ${C.dealCards(d.deals.filter(r => r.stage === 'contract'))}
      ${card('Your deals', live.length ? `<div class="cc-tablewrap"><table class="cc-table cc-stack"><caption class="sr">Deals from the AIRE Deals sheet</caption>
        <thead><tr><th scope="col">Deal</th><th scope="col">Status</th><th scope="col" class="r">Price</th><th scope="col" class="r">Your commission, gross</th><th scope="col">Act of sale</th><th scope="col">Next</th></tr></thead>
        <tbody>${live.map(r => `<tr><th scope="row">${esc(r.deal)}<small>${esc(r.side || '')}</small></th><td data-label="Status">${esc(r.status)}${r.days != null ? `<small>${r.days} day${r.days === 1 ? '' : 's'} in stage</small>` : ''}</td>
          <td class="r" data-label="Price">${m(r.price)}</td><td class="r" data-label="Your commission, gross">${r.commission == null ? '<em>not on the sheet</em>' : m(r.commission)}</td><td data-label="Act of sale">${r.act ? day(r.act) : ''}</td><td data-label="Next">${C.scrub(r.next || '')}</td></tr>`).join('')}</tbody></table></div>`
        : empty('No deals on the sheet yet.'), 'deals')}
      <div class="cc-grid">
        ${card('Paydays, next 30 days', d.closings.length ? `<ul class="cc-list">${d.closings.map(r => `<li class="cc-ev"><span class="cc-when">${day(r.day)}</span><span class="cc-what">${esc(r.deal)}<small>${r.from === 'both' ? 'Deals sheet and calendar agree' : r.from === 'sheet' ? 'from the Deals sheet' : 'from the calendar only'}</small></span><b class="cc-amt">${r.money == null ? '<em>not on the sheet</em>' : m(r.money)}</b></li>`).join('')}</ul>` : empty('No act of sale in the next 30 days.'), ['calendar', 'deals'])}
        ${card('Commission emails, 120 days', d.commission_mail.length ? `<ul class="cc-list">${d.commission_mail.map(r => `<li class="cc-ev ${r.status === 'No closed deal' ? 'k-closing' : ''}"><span class="cc-chip s-${r.status.replace(/\s+/g, '')}">${r.status}</span><span class="cc-what">${C.scrub(r.subject)}<small>${day((r.received || '').slice(0, 10))}</small>${r.status === 'No closed deal' ? '<small class="cc-warn">Paid, but no deal on the Deals sheet with this street is Closed. Check the sheet: the deal may be missing or still marked under contract.</small>' : ''}</span></li>`).join('')}</ul>` : empty('No commission or CDA mail found.'), 'commission_mail')}
      </div></div>`;
  }

  // Under contract: a card per deal with the countdown to act of sale and the steps from the sheet.
  const STEP = { done: ['✓', 'Done', 'k-showing'], today: ['●', 'Today', 'k-closing'], upcoming: ['○', '', 'k-client'], undated: ['?', 'Written without a date', 'k-deadline'], missing: ['!', 'Nothing on the sheet', 'k-deadline'] };
  C.dealCards = rows => !rows.length ? '' : card(`Under contract <span class="cc-count">${rows.length}</span>`, `<div class="cc-deals">${rows.map(r => `
    <article class="cc-deal"><header><h3>${esc(r.deal)}</h3><span class="cc-pill ${r.to_close != null && r.to_close <= 7 ? 'k-closing' : 'k-listing'}">${r.to_close == null ? 'No act of sale date' : r.to_close < 0 ? 'Closed ' + Math.abs(r.to_close) + ' days ago?' : r.to_close === 0 ? 'Closes today' : r.to_close + ' days to close'}</span></header>
      <p class="cc-note">${esc(r.side || '')}${r.price != null ? ' · ' + m(r.price) : ''} · your commission, gross ${r.commission == null ? '<em>not on the sheet</em>' : m(r.commission)}</p>
      <ol class="cc-steps">${r.checklist.map(c => { const [ico, word, k] = STEP[c.state]; return `<li class="${k}"><span aria-hidden="true">${ico}</span><b>${esc(c.step)}</b><small>${c.date ? day(c.date) + (c.state === 'upcoming' ? ` · in ${c.days} days` : '') : esc(c.note || '')}${word ? ' · ' + word : ''}</small></li>`; }).join('')}</ol>
      ${r.next ? `<p class="cc-next"><b>Next:</b> ${C.scrub(r.next)}</p>` : ''}</article>`).join('')}</div>`, 'deals');

  // ---------------- Deadlines ----------------
  function deadlines() {
    const g = guard(); if (g) return g;
    const d = C.data, all = d.deadlines.all, by = {}, und = d.deadlines.undated || [];
    all.forEach(r => { (by[r.deal] = by[r.deal] || []).push(r); });  // r.deal is the sheet's name when the street matches
    return `<div class="cc-page">${head('Deadlines', 'Every contract date in the next 30 days: the Deals sheet\'s dates plus your coordinator\'s calendar, one line per deal per day')}
      <div class="cc-tiles">
        ${tile('Next 3 days', n(d.deadlines.d3.length), und.length ? `Dated ones only · ${und.length} more written without a date` : 'Due soon', ['deals', 'calendar'])}
        ${tile('Next 30 days', n(all.length), `Dated deadlines on ${n(d.deadlines.deals)} deal${d.deadlines.deals === 1 ? '' : 's'}`, ['deals', 'calendar'])}
        ${tile('Without a date', n(und.length), und.length ? 'Written as words on the Deals sheet, so no countdown. Check each one below' : 'Every contract step has a date or is done', 'deals')}
        ${tile('Act of sale, 30 days', n(d.closings.length), 'Same list as Paydays', ['calendar', 'deals'])}
      </div>
      <div class="cc-grid">
        ${card('Next 3 days', deadlineList(d.deadlines.d3), ['deals', 'calendar'], 'is-hot')}
        ${und.length ? card(`Written without a date <span class="cc-count">${und.length}</span>`, `<ul class="cc-list">${und.map(u => `<li class="cc-ev k-deadline"><span class="cc-chip">${esc(u.step)}</span><span class="cc-what">${esc(u.deal)}<small>${C.scrub(u.note)}</small></span></li>`).join('')}</ul><p class="cc-note">These are contract steps the Deals sheet has as words, not a date. Put a date in the sheet and they join the countdown.</p>`, 'deals') : ''}
        ${card('By deal', Object.keys(by).length ? Object.keys(by).map(k => `<h3 class="cc-sub-h">${esc(k)}</h3>${deadlineList(by[k])}`).join('') : empty('No deadlines in 30 days.'), ['deals', 'calendar'])}
      </div></div>`;
  }

  // ---------------- Calendar ----------------
  function calendar() {
    const g = guard(); if (g) return g;
    const d = C.data, st = C.cal, span = st.mode === 'day' ? 1 : st.mode === 'week' ? 7 : 30;
    const from = C.addDays(d.today, st.off * span), to = C.addDays(from, span - 1);
    const evs = d.calendar.filter(r => r.day >= from && r.day <= to && !st.hide.has(r.kind));
    const kinds = Object.keys(KIND).filter(k => d.calendar.some(r => r.kind === k));
    const days = Array.from({ length: span }, (_, i) => C.addDays(from, i));
    const wk = Object.fromEntries(d.week.map(r => [r.day, r]));
    const body = st.mode === 'day' ? (evs.length ? `<ul class="cc-list cc-dayview">${evs.map(evRow).join('')}</ul>` : empty('Nothing booked.'))
      : `<div class="cc-days ${st.mode}">${days.map(k => { const e = evs.filter(r => r.day === k); return `<div class="cc-day ${k === d.today ? 'is-today' : ''}"><h3>${day(k)}${wk[k] ? `<small>${wk[k].hours}h booked</small>` : ''}</h3>${e.length ? `<ul class="cc-list tight">${e.map(evRow).join('')}</ul>` : '<p class="cc-none">Free</p>'}</div>`; }).join('')}</div>`;
    const last = d.week.length ? Math.max(1, ...d.week.map(r => r.hours)) : 1;
    return `<div class="cc-page">${head('Calendar', 'Today through the next 30 days, Baton Rouge time')}
      <div class="cc-bar" role="toolbar" aria-label="Calendar view">
        <div class="cc-seg">${['day', 'week', 'month'].map(k => `<button type="button" aria-pressed="${st.mode === k}" onclick="CC.calSet('${k}')">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
        <div class="cc-seg"><button type="button" aria-label="Earlier" ${st.off <= 0 ? 'disabled' : ''} onclick="CC.calMove(-1)">‹</button><span class="cc-range">${day(from)}${span > 1 ? ' to ' + day(to) : ''}</span><button type="button" aria-label="Later" ${(st.off + 1) * span >= 30 ? 'disabled' : ''} onclick="CC.calMove(1)">›</button></div>
      </div>
      <div class="cc-filters" role="group" aria-label="Show event kinds">${kinds.map(k => `<button type="button" class="cc-filter k-${k}" aria-pressed="${!st.hide.has(k)}" onclick="CC.calKind('${k}')">${KIND[k]} <b>${d.calendar.filter(r => r.kind === k).length}</b></button>`).join('')}</div>
      ${card('Events', body, 'calendar')}
      ${card('Hours booked per day', `<div class="cc-bars" role="img" aria-label="${d.week.map(r => day(r.day) + ' ' + r.hours + ' hours').join(', ')}">${d.week.map(r => `<div><i style="height:${Math.round(r.hours / last * 100)}%"></i><b>${r.hours}</b><span>${day(r.day).split(',')[0]}</span></div>`).join('')}</div><p class="cc-note">Timed events that are not free, not counting the working-hours band, work blocks or personal time.</p>`, 'calendar')}
      </div>`;
  }
  C.calSet = k => { C.cal.mode = k; C.cal.off = 0; render(); };
  C.calMove = x => { C.cal.off = Math.max(0, C.cal.off + x); render(); };
  C.calKind = k => { C.cal.hide.has(k) ? C.cal.hide.delete(k) : C.cal.hide.add(k); render(); };

  // ---------------- Leads ----------------
  // One list: website lead emails and CRM contacts in Stage new lead, one row per person (cc.merge_leads).
  // Names, phones, emails and what they wrote hide with the privacy button like everything else (Caleb, 2026-11-06,
  // replacing the 2026-11-05 always-shown rule).
  const AV = ['#e87757', '#c8b596'];
  const avColor = t => AV[[...String(t || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % AV.length];
  const DUE = { now: 'k-closing', late: 'k-closing', soon: 'k-listing', done: 'k-other', unknown: 'k-other' };
  const leadRows = () => C.data.leads.filter(r => matches(`${r.name} ${r.phone} ${r.email} ${r.source}`));
  function leadCard(r, i) {
    const name = r.name || 'Website lead', c = r.crm, pid = c && c.person_id, shown = new Set(['address', 'message']);
    const extra = (r.fields || []).filter(([k]) => !shown.has(k.toLowerCase()));
    const tel = String(r.phone || '').replace(/[^\d+]/g, ''), due = r.due || {};
    const when = (r.received || '').length > 10 ? day(r.received.slice(0, 10)) + ', ' + C.time(r.received) : r.received ? day(r.received.slice(0, 10)) : 'Date unknown';
    return `<li class="cc-lead" style="--av:${avColor(name)}">
      <div class="cc-lead-top"><span class="cc-av" aria-hidden="true">${C.ini(name)}</span>
        <div class="cc-lead-id"><h3>${C.who(name)}</h3>
          <div class="cc-pills"><span class="cc-pill ${DUE[due.level] || 'k-other'}">${esc(due.label || '')}</span><span class="cc-pill k-listing">${esc(r.source || 'Website lead')}</span>${r.area ? `<span class="cc-pill k-other">${esc(r.area)}</span>` : ''}
          ${c ? `<span class="cc-pill k-other">In your CRM${c.band ? ' · ' + esc(c.band) : ''}</span>` : '<span class="cc-pill k-other">Not in your CRM yet</span>'}</div></div></div>
      <ul class="cc-contact">
        <li><span aria-hidden="true">☎</span>${r.phone ? (C.priv ? C.ph(r.phone) : `<a href="tel:${esc(tel)}">${esc(fmtPhone(r.phone))}</a>`) : '<em>No phone</em>'}</li>
        <li><span aria-hidden="true">✉</span>${r.email ? (C.priv ? C.em(r.email) : `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`) : '<em>No email</em>'}</li>
        ${r.address ? `<li><span aria-hidden="true">⌂</span>${C.priv ? '<span class="cc-hid">hidden</span>' : esc(r.address)}</li>` : ''}
        <li><span aria-hidden="true">◷</span>Came in ${esc(when)} · ${r.origin === 'crm' ? 'from the CRM' : 'from the lead email'}</li>
      </ul>
      ${r.message ? `<blockquote class="cc-quote">${C.msg(r.message)}</blockquote>` : ''}
      ${extra.length && !C.priv ? `<dl class="cc-fields">${extra.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${/^https?:\/\//i.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">Open link</a>` : esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${c && (c.last_touch || c.next_action) ? `<p class="cc-note">${c.last_touch ? 'Last touch ' + esc(c.last_touch) : 'No touch logged'}${c.next_action && !/within the hour/i.test(c.next_action) ? ' · Next: ' + C.scrub(c.next_action, [name]) : ''}</p>` : ''}
      <div class="cc-acts">${pid ? `${typeof textBtn === 'function' ? textBtn(pid, { phone: r.phone, display: name }) : ''}<button type="button" class="cc-primary" onclick="touched('${esc(pid)}')">✓ Touched</button><button type="button" onclick="openTask('${esc(pid)}')">＋ Task</button>` : `<button type="button" class="cc-primary" onclick="CC.addLead(${i})">Add to the CRM</button>`}<button type="button" onclick="CC.copyLead(${i})">Copy a first text</button></div></li>`;
  }
  function ccleads() {
    const g = guard(); if (g) return g;
    const rows = leadRows();
    return `<div class="cc-page">${head('Leads', `Every new lead from the last 14 days counting today, newest first: website lead emails and new CRM contacts, once each, test leads left out. ${n((d0 => d0.lead_counts ? d0.lead_counts.d7 : 0)(C.data))} came in the last 7 days.`)}
      <div class="cc-acts"><button type="button" class="cc-primary" onclick="CC.addLead()">＋ Add a lead</button></div>
      ${card(`Leads <span class="cc-count">${rows.length}</span>`, rows.length ? `<ul class="cc-leads">${rows.map(leadCard).join('')}</ul>`
        : S.q ? C.noMatch() : empty('No new leads in the last 14 days.'), ['leads', 'crm'])}</div>`;
  }
  function draftText(r) {
    const first = (r.name || '').split(' ')[0] || 'there';
    return /home value/i.test(r.source || r.subject || '') ?
      `Hi ${first}, this is Caleb Jackson with Keller Williams First Choice. I got your home value request. Want me to pull the recent sales near you so the number is real, not a guess?`
      : `Hi ${first}, this is Caleb Jackson with Keller Williams First Choice. Thanks for reaching out on my site. What would be most helpful for you right now?`;
  }
  C.copyLead = i => {
    const r = leadRows()[i];
    navigator.clipboard.writeText(draftText(r)).then(() => toast('ok', 'COPIED', 'A first text is on the clipboard. Read it, then send it from Command or the Text button.'), () => toast('err', 'COPY', 'The browser blocked the clipboard.'));
  };
  // Add a lead: one form, saved by crm.py (it refuses a name, phone or email already in the CRM, and says so when
  // that person is on Do Not Contact). Click Add a lead, fill it in, click Save: two clicks.
  C.addLead = async i => {
    const r = i == null ? {} : leadRows()[i] || {};
    const SRC = ['Website', 'Referral', 'Sign call', 'Open house', 'Social', 'Past client', 'Other'];
    const v = await modal('Add a lead', `
      <div class="field"><label for="m-lname">Name</label><input id="m-lname" autocomplete="off"${C.priv ? ' class="cc-masked"' : ''} value="${esc(r.name || '')}" required></div>
      <div class="field"><label for="m-lphone">Phone</label><input id="m-lphone" type="tel" inputmode="tel" autocomplete="off"${C.priv ? ' class="cc-masked"' : ''} value="${esc(r.phone || '')}"></div>
      <div class="field"><label for="m-lemail">Email</label><input id="m-lemail" type="email" autocomplete="off"${C.priv ? ' class="cc-masked"' : ''} value="${esc(r.email || '')}"></div>
      <div class="field"><label for="m-lsrc">Source</label><select id="m-lsrc">${SRC.map(x => `<option ${(r.source ? /luxury|website/i.test(r.source) && x === 'Website' : x === 'Website') ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <p class="cc-note">Saved to the CRM as a new lead. Refused if the name, phone or email is already there or on Do Not Contact.</p>`,
      m => { const name = $('#m-lname', m).value.trim(); if (!name) { $('#m-lname', m).focus(); return false; }
        return { name, phone: $('#m-lphone', m).value.trim(), email: $('#m-lemail', m).value.trim(), source: $('#m-lsrc', m).value + ' ' + (C.data ? C.data.today : todayISO()), next_action: 'Reach out: new lead' }; }, 'Save lead');
    if (v) await act('/api/lead', v, { tag: 'LEAD', text: `${C.priv ? 'The lead' : v.name} is in the CRM as a new lead` }).then(ok => { if (ok) C.load(); });
  };
  Object.assign(C.views, { commission, deadlines, calendar, ccleads });
})();
