/* Command Center pages: Commission, Deadlines, Calendar, Leads, Scorecard. Helpers come from cc.js (window.CC). */
(function () {
  const C = window.CC;
  const { m, n, day, time, card, tile, empty, head, guard, evRow, deadlineList, contact, src, KIND } = C;

  // ---------------- Commission ----------------
  function commission() {
    const g = guard(); if (g) return g;
    const d = C.data, sc = d.scorecard, cap = sc.cap;
    const np = d.commission_mail.filter(r => r.status === 'Not processed');
    const paidFrom = sc.gci.from === 'kw_paid' ? 'Paid on KW commission forms' : 'Closed deals in your sheet this year';
    const live = d.deals.filter(r => r.stage !== 'out');
    return `<div class="cc-page">${head('Commission', '70/30 split · ' + (cap ? 'cap year from ' + day(cap.start) : 'cap and cap year not set yet, add them on Scorecard'))}
      <div class="cc-tiles">
        ${tile('GCI paid', m(sc.gci.value), paidFrom + (sc.gci.blank ? ` · <em>${sc.gci.blank} closed with no commission</em>` : ''), 'deals')}
        ${tile('Paid plus pending', m(sc.gci.with_pending), 'Paid, plus every deal under contract', 'deals')}
        ${tile('Pending', m(sc.pending.value), `${sc.pending.deals} under contract${sc.pending.blank ? ` · <em>${sc.pending.blank} blank</em>` : ''}`, 'deals')}
        ${tile('Toward cap', cap ? m(cap.paid) : '—', cap ? `${cap.pct}% of ${m(cap.amount)} · ${m(cap.left)} to go` : 'Set the cap amount and start date on Scorecard', ['deals', 'goals'])}
        ${tile('Not processed', n(np.length), np.length ? 'KW has not processed these yet' : 'Nothing waiting', 'commission_mail')}
      </div>
      ${C.dealCards(d.deals.filter(r => r.stage === 'contract'))}
      ${card('Your deals', live.length ? `<div class="cc-tablewrap"><table class="cc-table"><caption class="sr">Deals from the AIRE Deals sheet</caption>
        <thead><tr><th scope="col">Deal</th><th scope="col">Status</th><th scope="col" class="r">Price</th><th scope="col" class="r">Your commission</th><th scope="col">Act of sale</th><th scope="col">Next</th></tr></thead>
        <tbody>${live.map(r => `<tr><th scope="row">${esc(r.deal)}<small>${esc(r.side || '')}</small></th><td>${esc(r.status)}${r.days != null ? `<small>${r.days} days in stage</small>` : ''}</td>
          <td class="r">${m(r.price)}</td><td class="r">${r.commission == null ? '<em>blank</em>' : m(r.commission)}</td><td>${r.act ? day(r.act) : ''}</td><td>${esc(r.next || '')}</td></tr>`).join('')}</tbody></table></div>`
        : empty('No deals on the sheet yet.'), 'deals')}
      <div class="cc-grid">
        ${card('Paydays, next 30 days', d.closings.length ? `<ul class="cc-list">${d.closings.map(r => `<li class="cc-ev"><span class="cc-when">${day(r.day)}</span><span class="cc-what">${esc(r.deal)}<small>${r.from === 'both' ? 'calendar and sheet agree' : 'from the ' + r.from}</small></span><b class="cc-amt">${r.money == null ? '<em>blank</em>' : m(r.money)}</b></li>`).join('')}</ul>` : empty('No act of sale in the next 30 days.'), ['calendar', 'deals'])}
        ${card('Commission emails, 120 days', d.commission_mail.length ? `<ul class="cc-list">${d.commission_mail.map(r => `<li class="cc-ev"><span class="cc-chip s-${r.status.replace(' ', '')}">${r.status}</span><span class="cc-what">${esc(r.subject)}<small>${day((r.received || '').slice(0, 10))}</small></span></li>`).join('')}</ul>` : empty('No commission or CDA mail found.'), 'commission_mail')}
      </div></div>`;
  }

  // Under contract: a card per deal with the countdown to act of sale and the steps from the sheet.
  const STEP = { done: ['✓', 'Done', 'k-showing'], today: ['●', 'Today', 'k-closing'], upcoming: ['○', '', 'k-client'], missing: ['!', 'No date on the sheet', 'k-deadline'] };
  C.dealCards = rows => !rows.length ? '' : card(`Under contract <span class="cc-count">${rows.length}</span>`, `<div class="cc-deals">${rows.map(r => `
    <article class="cc-deal"><header><h3>${esc(r.deal)}</h3><span class="cc-pill ${r.to_close != null && r.to_close <= 7 ? 'k-closing' : 'k-listing'}">${r.to_close == null ? 'No act of sale date' : r.to_close < 0 ? 'Closed ' + Math.abs(r.to_close) + ' days ago?' : r.to_close === 0 ? 'Closes today' : r.to_close + ' days to close'}</span></header>
      <p class="cc-note">${esc(r.side || '')}${r.price != null ? ' · ' + m(r.price) : ''} · your side ${r.commission == null ? '<em>blank</em>' : m(r.commission)}</p>
      <ol class="cc-steps">${r.checklist.map(c => { const [ico, word, k] = STEP[c.state]; return `<li class="${k}"><span aria-hidden="true">${ico}</span><b>${esc(c.step)}</b><small>${c.date ? day(c.date) + (c.state === 'upcoming' ? ` · in ${c.days} days` : '') : esc(c.note || '')}${word ? ' · ' + word : ''}</small></li>`; }).join('')}</ol>
      ${r.next ? `<p class="cc-next"><b>Next:</b> ${esc(r.next)}</p>` : ''}</article>`).join('')}</div>`, 'deals');

  // ---------------- Deadlines ----------------
  function deadlines() {
    const g = guard(); if (g) return g;
    const d = C.data, all = d.deadlines.all, by = {};
    all.forEach(r => { (by[r.deal] = by[r.deal] || []).push(r); });
    return `<div class="cc-page">${head('Deadlines', 'Every contract date in the next 30 days, from your calendar')}
      <div class="cc-tiles">
        ${tile('Next 3 days', n(d.deadlines.d3.length), 'Due soon', 'calendar')}
        ${tile('Next 30 days', n(all.length), 'All deadlines', 'calendar')}
        ${tile('Deals with a deadline', n(d.deadlines.deals), 'Active deals', 'calendar')}
        ${tile('Act of sale, 30 days', n(d.closings.length), 'Same list as Paydays', ['calendar', 'deals'])}
      </div>
      <div class="cc-grid">
        ${card('Next 3 days', deadlineList(d.deadlines.d3), 'calendar', 'is-hot')}
        ${card('By deal', Object.keys(by).length ? Object.keys(by).map(k => `<h3 class="cc-sub-h">${esc(k)}</h3>${deadlineList(by[k])}`).join('') : empty('No deadlines in 30 days.'), 'calendar')}
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
  // Leads show the full name, phone, email and everything the lead email carried, without the privacy dots
  // (Caleb, 2026-11-05). Money elsewhere stays behind Show.
  const AV = ['#e87757', '#7fd0a0', '#8ab4f8', '#b9a3e3', '#ffb547', '#6fcfb8', '#e29ac0', '#c8b596'];
  const avColor = t => AV[[...String(t || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % AV.length];
  const initials = t => String(t || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  const srcKind = t => /home value|valuation/i.test(t) ? 'k-closing' : /listing|showing|tour/i.test(t) ? 'k-showing' : 'k-client';
  const BAND = { hot: 'k-closing', warm: 'k-deadline', cool: 'k-client', cold: 'k-block', 'ice-cold': 'k-block' };
  function ageChip(r) {
    const k = (r.received || '').slice(0, 10), t = C.data.today;
    const n = k ? Math.round((new Date(t + 'T12:00:00Z') - new Date(k + 'T12:00:00Z')) / 864e5) : null;
    const [label, cls] = n == null ? ['Date unknown', 'k-other'] : n <= 0 ? ['New today', 'k-closing'] : n === 1 ? ['Yesterday', 'k-deadline'] : [n + ' days ago', 'k-other'];
    return `<span class="cc-pill ${cls}">${label}</span>`;
  }
  const leadRows = () => C.data.leads.filter(r => !r.test).sort((a, b) => (b.received || '').localeCompare(a.received || ''));
  function leadCard(r, i) {
    const name = r.name || 'Website lead', c = r.crm, shown = new Set(['address', 'message']);
    const extra = (r.fields || []).filter(([k]) => !shown.has(k.toLowerCase()));
    const tel = String(r.phone || '').replace(/[^\d+]/g, '');
    return `<li class="cc-lead" style="--av:${avColor(name)}">
      <div class="cc-lead-top"><span class="cc-av" aria-hidden="true">${esc(initials(name))}</span>
        <div class="cc-lead-id"><h3>${esc(name)}</h3>
          <div class="cc-pills">${ageChip(r)}<span class="cc-pill ${srcKind(r.source || r.subject)}">${esc(r.source || 'Website lead')}</span>${r.area ? `<span class="cc-pill k-listing">${esc(r.area)}</span>` : ''}
          ${c ? `<span class="cc-pill ${BAND[(c.band || '').toLowerCase()] || 'k-other'}">In your CRM${c.band ? ' · ' + esc(c.band) : ''}</span>` : '<span class="cc-pill k-other">Not in your CRM yet</span>'}</div></div></div>
      <ul class="cc-contact">
        <li><span aria-hidden="true">☎</span>${r.phone ? `<a href="tel:${esc(tel)}">${esc(r.phone)}</a>` : '<em>No phone in the email</em>'}</li>
        <li><span aria-hidden="true">✉</span>${r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : '<em>No email in the email</em>'}</li>
        ${r.address ? `<li><span aria-hidden="true">⌂</span>${esc(r.address)}</li>` : ''}
        <li><span aria-hidden="true">◷</span>Came in ${esc(C.time(r.received || '') === 'All day' ? day((r.received || '').slice(0, 10)) : day((r.received || '').slice(0, 10)) + ', ' + C.time(r.received))}</li>
      </ul>
      ${r.message ? `<blockquote class="cc-quote">${esc(r.message)}</blockquote>` : ''}
      ${extra.length ? `<dl class="cc-fields">${extra.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${/^https?:\/\//i.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">Open link</a>` : esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${c ? `<dl class="cc-fields cc-crm"><div><dt>In the CRM as</dt><dd>${esc(c.display || '')}</dd></div>${c.stage ? `<div><dt>Stage</dt><dd>${esc(c.stage)}</dd></div>` : ''}${c.last_touch ? `<div><dt>Last touch</dt><dd>${esc(c.last_touch)}${c.days_quiet != null ? ` · ${c.days_quiet} days quiet` : ''}</dd></div>` : ''}${c.next_action ? `<div><dt>Next action</dt><dd>${esc(c.next_action)}</dd></div>` : ''}${c.owes_reply ? `<div><dt>Reply</dt><dd class="cc-owed">They texted, you owe a reply</dd></div>` : ''}</dl>` : ''}
      <p class="cc-lead-msg">${esc(draftText(r))}</p>
      <div class="cc-acts"><button type="button" class="cc-primary" onclick="CC.copyLead(${i})">Copy the text</button><a class="cc-btn" href="https://agent.kw.com/command" target="_blank" rel="noopener">Open Command</a></div>
      <p class="cc-note cc-how">Copy the text, open Command, paste it on ${esc(name.split(' ')[0])}'s contact and press send in Command.</p></li>`;
  }
  function ccleads() {
    const g = guard(); if (g) return g;
    const rows = leadRows(), tests = C.data.leads.length - rows.length;
    return `<div class="cc-page">${head('Leads', 'New website leads, newest first. Copy the text here, then press send in Command.')}
      ${card(`Website leads <span class="cc-count">${rows.length}</span>`, rows.length ? `<ul class="cc-leads">${rows.map(leadCard).join('')}</ul>`
        : empty('No website leads in the last 14 days.'), 'leads')}
      ${tests ? `<p class="cc-note">${tests} test lead${tests > 1 ? 's' : ''} not counted.</p>` : ''}</div>`;
  }
  function draftText(r) {
    const first = (r.name || '').split(' ')[0] || 'there';
    return /home value/i.test(r.source || r.subject || '') ?
      `Hi ${first}, this is Caleb Jackson with Keller Williams First Choice. I got your home value request. Want me to pull the recent sales near you so the number is real, not a guess?`
      : `Hi ${first}, this is Caleb Jackson with Keller Williams First Choice. Thanks for reaching out on my site. What would be most helpful for you right now?`;
  }
  C.copyLead = i => {
    const r = leadRows()[i];
    navigator.clipboard.writeText(draftText(r)).then(() => toast('ok', 'COPIED', 'Text copied. Now paste it in Command and press send there.'), () => toast('err', 'COPY', 'The browser blocked the clipboard.'));
  };
  Object.assign(C.views, { commission, deadlines, calendar, ccleads });
})();
