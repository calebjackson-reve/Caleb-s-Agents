/* Money first on Home, the Fix list, the weekly proof line and the learning scorecard.
   Everything shown is worked out on the Mac (links.py, proof.py, learn.py) from records already there. The only writes
   from this file are Caleb's own taps, logged on this Mac: approve or set aside a Fix list row, and Good call or Not
   useful on a ranked person. Nothing here sends a message, and nothing here edits a sheet. */
(function () {
  const C = window.CC, F = window.Fix = {};
  const d0 = () => C.data || {};
  const unk = '<em class="unk">unknown</em>';
  const num = v => (v == null ? unk : Number(v).toLocaleString());
  const kindOf = r => { const t = (r.what || '') + ' ' + (r.title || ''); return /act of sale|closing/i.test(t) ? 'Act of sale' : /inspect/i.test(t) ? 'Inspection' : /apprais/i.test(t) ? 'Appraisal' : /financ|loan|mortgage/i.test(t) ? 'Financing' : 'Deadline'; };

  // ---------------- Home: money first. Paydays in 30 days, this week's contract deadlines, then the leads card.
  F.moneyHTML = function () {
    if (!C.data) return '';
    const fr = C.data.fresh || {}, noDeals = !fr.deals || fr.deals.state === 'missing';
    if (noDeals) return `<section class="mf" aria-label="Money first"><div class="mf-box"><h2>Paydays, next 30 days</h2><p class="mf-big">${unk}<small>The Deals sheet has not been read on this Mac, so paydays are unknown.</small></p></div>
      <div class="mf-box"><h2>Deadlines this week</h2><p class="mf-big">${unk}<small>The Deals sheet has not been read on this Mac, so deadlines are unknown.</small></p></div></section>`;
    const pay = d0().closings || [], total = pay.reduce((s, r) => s + (r.money || 0), 0), blank = pay.filter(r => r.money == null).length;
    const dl = ((d0().deadlines || {}).d7 || []), over = ((d0().deadlines || {}).overdue || []).length;
    const payRows = pay.slice(0, 4).map(r => `<li><span>${esc(C.day(r.day))}</span><b>${esc(r.deal)}</b><i>${r.money == null ? 'commission unknown' : C.m(r.money)}</i></li>`).join('');
    const dlRows = dl.slice(0, 5).map(r => `<li><span>${esc(C.day(r.day))}${r.time ? ' ' + esc(r.time) : ''}</span><b>${esc(r.deal || r.title || '')}</b><i>${esc(kindOf(r))}</i></li>`).join('');
    return `<section class="mf" aria-label="Money first"><div class="mf-box"><div class="lt-row"><h2>Paydays, next 30 days</h2><button type="button" class="lt-link" onclick="go('commission')">Commission</button></div>
        <p class="mf-big">${blank ? unk : C.m(total)}<small>${pay.length} act${pay.length === 1 ? '' : 's'} of sale, gross${blank ? `, ${blank} with no commission on the sheet` : ''}</small></p>
        ${pay.length ? `<ul class="mf-list">${payRows}</ul>` : '<p class="lt-quiet">No act of sale in the next 30 days.</p>'}<p class="cc-srcline lt-src">${C.src(['deals', 'calendar'])}</p></div>
      <div class="mf-box"><div class="lt-row"><h2>Deadlines this week</h2><button type="button" class="lt-link" onclick="go('deadlines')">All deadlines</button></div>
        <p class="mf-big">${dl.length}<small>inspection, appraisal, financing and act of sale dates in 7 days${over ? `, <b class="late">${over} overdue</b>` : ''}</small></p>
        ${dl.length ? `<ul class="mf-list">${dlRows}</ul>` : '<p class="lt-quiet">No contract deadline in the next 7 days.</p>'}<p class="cc-srcline lt-src">${C.src(['deals', 'calendar'])}</p></div></section>`;
  };

  // ---------------- The weekly proof line: last week, from records only
  F.proofHTML = function (always) {
    const p = d0().proof; if (!p || (!always && !p.monday)) return '';
    const fr = p.first_reply, mins = fr.value == null ? unk : fr.value < 90 ? `${fr.value} min` : `${Math.round(fr.value / 6) / 10} h`;
    const cell = (label, value, sub) => `<div><b>${value}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
    return `<section class="pf" aria-label="Weekly proof"><div class="lt-row"><h2>Last week, ${esc(C.day(p.week.from))} to ${esc(C.day(p.week.to))}</h2></div>
      <div class="pf-row">${cell('leads in', num(p.leads.value), esc(p.leads.note || ''))}${cell('median first reply', mins, fr.value == null ? esc(fr.why) : `${fr.measured} of ${fr.of} leads measured`)}
        ${cell('texts sent', num(p.texts.value), `${num(p.emails.value)} emails`)}${cell('calls through Grok', num(p.calls.value), esc(p.calls.note))}
        ${cell('appointments', num(p.appointments.value), p.appointments.value == null ? esc(p.appointments.note) : 'on the calendar')}${cell('deals from Pipeline', num(p.deals.value), esc(p.deals.note || p.deals.list.join(', ')))}
        ${cell('GCI tied to them', p.gci.value == null ? unk : C.m(p.gci.value), [p.gci.pending ? `${C.m(p.gci.pending)} more pending` : '', p.gci.blank ? `${p.gci.blank} with no commission on the sheet` : '', p.gci.value == null && !p.gci.blank ? esc(p.deals.note || 'no record') : ''].filter(Boolean).join(', ') || 'closed deals only')}</div>
      <p class="cc-srcline lt-src">${C.src(['leads', 'calendar', 'deals'])}</p></section>`;
  };

  // ---------------- Good call, Not useful: one tap, logged on this Mac for the weekly learning
  F.said = {};
  F.feedback = async function (list, id, verdict) {
    const r = await api('/api/feedback', { list, person_id: String(id), verdict });
    if (r && r.ok) { F.said[list + ':' + id] = verdict; toast('ok', 'NOTED', verdict === 'good' ? 'Logged as a good call.' : 'Logged as not useful.'); render(); if (window.Person) Person.refresh(); }
    else toast('err', 'NOT SAVED', (r && r.error) || 'The tap was not saved.');
  };
  F.fbHTML = function (list, id) {
    const s = F.said[list + ':' + id], b = (v, label) => `<button type="button" class="fb${s === v ? ' on' : ''}" aria-pressed="${s === v}" onclick="Fix.feedback('${list}', ${jsa(id)}, '${v}')">${label}</button>`;
    return `<span class="fb-row">${b('good', 'Good call')}${b('not_useful', 'Not useful')}</span>`;
  };

  // ---------------- The Fix list
  const KINDS = [['offer', 'Offers past their deadline'], ['stage', 'Stage does not match the deals'], ['price', 'Deal price'], ['mls', 'Deals sheet against Flexmls'], ['duplicate', 'Duplicate people'], ['no_name', 'No name']];
  F.decide = async function (id, action) {
    const r = await api('/api/fix', { id, action });
    if (r && r.ok) { toast('ok', action === 'approve' ? 'APPROVED' : action === 'reopen' ? 'REOPENED' : 'SET ASIDE', action === 'approve' ? 'Logged. Make the change in the sheet when you can.' : 'Logged.'); C.load(); }
    else toast('err', 'NOT SAVED', (r && r.error) || 'The tap was not saved.');
  };
  F.MAX = 40;
  function fixes() {
    const g = C.guard(); if (g) return g;
    const fx = d0().fixes || { open: [], approved: [], dismissed: 0, resolved: 0 }, cap = d0().cap_note || {};
    const rows = fx.open.filter(r => matches(`${r.what} ${r.problem} ${r.fix}`));
    const row = r => `<li class="cc-row fx-row"><div class="cc-row-main"><h3>${esc(r.what)}</h3><p class="cc-note"><b>Problem.</b> ${esc(r.problem)}</p><p class="cc-note"><b>Suggested fix.</b> ${esc(r.fix)}</p><p class="cc-note fx-from">From the ${esc(r.from)}</p></div>
      <div class="cc-acts"><button type="button" class="cc-primary" onclick="Fix.decide('${esc(r.id)}', 'approve')">Approve</button><button type="button" onclick="Fix.decide('${esc(r.id)}', 'dismiss')">Not a problem</button></div></li>`;
    const groups = KINDS.map(([k, label]) => { const rs = rows.filter(r => r.kind === k); return rs.length ? C.card(`${label} <span class="cc-count">${rs.length}</span>`,
      `<ul class="cc-rows">${rs.slice(0, F.MAX).map(row).join('')}</ul>${rs.length > F.MAX ? `<p class="cc-note">${rs.length - F.MAX} more. Search to narrow the list.</p>` : ''}`, k === 'mls' ? ['deals', 'permits'] : k === 'offer' || k === 'price' ? ['deals', 'crm'] : ['crm']) : ''; }).join('');
    const capLine = cap.amount == null ? `<p class="cc-warn">${esc(cap.note || 'The cap is unknown.')}</p>` : `<p class="${cap.differs ? 'cc-warn' : 'cc-note'}">Cap from Goals: <b>${C.m(cap.amount)}</b>. ${esc(cap.note || 'That is $20,000 plus the $3,000 royalty.')}</p>`;
    return `<div class="cc-page">${C.head('Fix list', 'Rows that look wrong, with the problem and a suggested fix. You approve one at a time. Pipeline logs your tap and never edits the sheets.')}
      ${C.card('The cap', capLine, ['goals'])}
      ${groups || C.card('Nothing to fix', C.empty(S.q ? 'No row matches that search.' : 'No row looks wrong right now.'), ['crm', 'deals'])}
      ${C.card(`Approved, yours to change in the sheet <span class="cc-count">${fx.approved.length}</span>`, fx.approved.length ? `<ul class="cc-rows">${fx.approved.map(r => `<li class="cc-row fx-row"><div class="cc-row-main"><h3>${esc(r.what)}</h3><p class="cc-note">${esc(r.fix)}</p><p class="cc-note fx-from">Approved ${esc(C.day(String(r.at || '').slice(0, 10)))}. It leaves this list once the sheet shows the change.</p></div>
        <div class="cc-acts"><button type="button" onclick="Fix.decide('${esc(r.id)}', 'reopen')">Undo</button></div></li>`).join('')}</ul>` : C.empty('Nothing approved is waiting.'), [])}
      <p class="cc-note">${fx.dismissed} set aside as not a problem. ${fx.resolved} approved and since fixed in the sheet. Every tap is logged on this Mac.</p></div>`;
  }

  // ---------------- The learning scorecard, on Sources
  const LISTS = [['seller', 'Likely-seller score'], ['call10', 'Call these 10']];
  F.learnHTML = function () {
    const L = d0().learn; if (!L) return '';
    const lm = k => { const x = L.last_month[k]; return x.n ? `Of the top ${x.n} a month ago: ${x.replied} replied, ${x.appointment} set an appointment, ${x.listing} listed.` : `Of the top ${k === 'seller' ? 25 : 10} last month: unknown. ${esc(x.why)}`; };
    const chg = k => { const c = (L.changed || {})[k] || {}, ks = Object.keys(c); return !L.changed ? 'No weekly version has run yet.' : ks.length ? 'Changed since last week: ' + ks.map(x => `${esc(x)} ${c[x] > 0 ? 'up' : 'down'} ${Math.abs(c[x])}`).join(', ') + '.' : 'Nothing changed since last week.'; };
    const cur = LISTS.map(([k, label]) => `<h3 class="cc-h3">${label}</h3><p class="cc-note">${L.current[k].hand_set ? 'Hand-set weights, nothing learned yet. ' : 'Learned weights in use. '}${L.current[k].words.map(esc).join('. ')}.</p><p class="cc-note">${chg(k)} ${lm(k)}</p>`).join('');
    const vrows = L.versions.map(v => LISTS.map(([k, label]) => { const i = v.lists[k] || {}; return `<tr><th scope="row">${v.version}<small>${esc(C.day(v.date))}</small></th><td>${label}</td><td>${num(i.rows)} answers, ${num(i.yes)} yes</td>
      <td>${i.old_auc == null ? unk : i.old_auc} before, ${i.new_auc == null ? unk : i.new_auc} after</td><td>${i.used ? '<b>In use</b>' : 'Kept the old weights'}<small>${esc(i.note || '')}</small></td></tr>`; }).join('')).join('');
    return C.card('What the scores learned', `${cur}
      <h3 class="cc-h3">Every version</h3>${L.versions.length ? `<div class="cc-tablewrap"><table class="cc-table"><caption class="sr">Weekly versions of the weights</caption><thead><tr><th scope="col">Version</th><th scope="col">List</th><th scope="col">Learned from</th><th scope="col">Test, 0.5 is chance</th><th scope="col">Result</th></tr></thead><tbody>${vrows}</tbody></table></div>`
        : '<p class="cc-note">No version yet. The first one is written the first Monday after 6 AM.</p>'}
      <p class="cc-note">${num(L.log.ranked)} rankings of ${num(L.log.people)} people logged${L.log.since ? ' since ' + esc(C.day(L.log.since)) : ''}. Your taps: ${L.log.good} good call, ${L.log.not_useful} not useful. ${esc(L.next)} It needs ${L.needs.rows} people with an answer and ${L.needs.yes} with an appointment or listing before any weight moves, and no weight moves more than ${L.needs.max_step} points a week. A version that tests worse than last week's is not used.</p>
      <p class="cc-note">${esc(L.never)} Everything is kept on this Mac.</p>`, []);
  };

  // ---------------- Past client check-ins due around now
  F.checkinsHTML = function () {
    const rows = ((S.data && S.data.checkins) || []).filter(r => Math.abs(r.days) <= 14); if (!rows.length) return '';
    return `<section class="lt-need ck" aria-label="Past client check-ins"><div class="lt-row"><h2>Past client check-ins</h2></div><ul class="mf-list">${rows.slice(0, 6).map(r => `<li><span>${esc(C.day(r.due))}</span>
      <button type="button" class="c10-who" onclick="Stage.open(${jsa(r.person_id)})"><b>${C.pname(r.display)}</b><small>${esc(r.kind)}, ${esc(r.deal)}, closed ${esc(C.day(r.closed))}</small></button><i>${r.days < 0 ? `${-r.days} days ago` : r.days === 0 ? 'today' : `in ${r.days} days`}</i></li>`).join('')}</ul>
      <p class="cc-srcline lt-src">${C.src(['deals'])}</p></section>`;
  };
  Object.assign(C.views, { fixes });
})();
