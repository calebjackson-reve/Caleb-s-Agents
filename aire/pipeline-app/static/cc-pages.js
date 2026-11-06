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
  function ccleads() {
    const g = guard(); if (g) return g;
    const rows = C.data.leads.filter(r => !r.test).sort((a, b) => (b.received || '').localeCompare(a.received || ''));
    const tests = C.data.leads.length - rows.length;
    return `<div class="cc-page">${head('Leads', 'New website leads, newest first. Copy the text here, then press send in Command.')}
      ${card(`Website leads <span class="cc-count">${rows.length}</span>`, rows.length ? `<ul class="cc-leads">${rows.map((r, i) => `<li class="cc-lead">
        <div class="cc-lead-h"><h3>${C.priv ? esc((r.name || 'Lead').split(' ')[0]) + ' •••' : esc(r.name || 'Lead')}</h3><small>${day((r.received || '').slice(0, 10))} · ${esc(r.source || r.subject || '')}${r.area ? ' · ' + esc(r.area) : ''}</small></div>
        <p class="cc-lead-meta">${r.phone ? 'Phone ' + contact(r.phone) : 'No phone'} · ${r.email ? 'Email ' + contact(r.email) : 'No email'}</p>
        <p class="cc-lead-msg">${esc(draftText(r))}</p>
        <div class="cc-acts"><button type="button" class="cc-primary" onclick="CC.copyLead(${i})">Copy the text</button><a class="cc-btn" href="https://agent.kw.com/command" target="_blank" rel="noopener">Open Command</a></div>
        <p class="cc-note cc-how">Copy the text, open Command, paste it on ${esc((r.name || 'their').split(' ')[0])}'s contact and press send in Command.</p></li>`).join('')}</ul>`
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
    const r = C.data.leads.filter(x => !x.test).sort((a, b) => (b.received || '').localeCompare(a.received || ''))[i];
    navigator.clipboard.writeText(draftText(r)).then(() => toast('ok', 'COPIED', 'Text copied. Now paste it in Command and press send there.'), () => toast('err', 'COPY', 'The browser blocked the clipboard.'));
  };
  Object.assign(C.views, { commission, deadlines, calendar, ccleads });
})();
