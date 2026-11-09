/* Scorecard: numbers against Caleb's own goals, with pace, 7 and 30 day changes, and daily history. */
(function () {
  const C = window.CC;
  const { m, n, card, empty, head, guard, src } = C;
  const GOALS = [
    ['gci_goal', 'GCI goal this year, dollars', true], ['gci_goal_next', 'GCI goal next year, dollars', true],
    ['closings_low', 'Closings, low end'], ['closings_high', 'Closings, high end'],
    ['leads_low', 'New leads a week, low end'], ['leads_high', 'New leads a week, high end'], ['appts', 'Appointments a week'],
    ['cap_amount', 'Cap amount, dollars', true], ['royalty', 'Royalty, dollars (separate from cap)', true],
    ['cap_start', 'Cap year starts', false, 'date'], ['cap_by', 'Hit cap by', false, 'date'],
  ];

  function bar(p) {
    if (!p) return '<p class="cc-note">No goal set.</p>';
    return `<div class="cc-kbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, p.pct)}" aria-label="${p.pct}% of goal, even pace today is ${p.pace_pct}%">
      <i style="width:${Math.min(100, p.pct)}%"></i><span class="cc-kbar-pace" style="left:${p.pace_pct}%" title="Even pace by today"></span></div>
      <p class="cc-pace ${p.ahead ? 'is-ahead' : 'is-behind'}">${p.pct}% of goal · even pace is ${p.pace_pct}% · ${p.ahead ? 'ahead' : 'behind'}</p>`;
  }
  // Changes use the days already saved in the sheet's Scorecard history. Before a day is 7 or 30 days old, the change since
  // the first saved day shows instead, with its date, never a made-up zero.
  const sign = (v, money) => (v > 0 ? '+' : v < 0 ? '−' : '') + (money ? m(Math.abs(v)) : n(Math.abs(v)));
  function delta(metric, money) {
    const d = C.data.deltas[metric] || {}, since = (C.data.since || {})[metric];
    const bad = (C.data.history_mismatch || []).filter(r => r.metrics.includes(metric));
    const flag = bad.length ? `<p class="cc-warn">${bad.length} saved day${bad.length === 1 ? ' no longer matches' : 's no longer match'} the Deals sheet (${bad.map(r => C.day(r.day)).join(', ')}: saved ${bad[0].saved[metric] == null ? '' : money ? m(bad[0].saved[metric]) : n(bad[0].saved[metric])}, the sheet now says ${money ? m(bad[0].sheet_now[metric]) : n(bad[0].sheet_now[metric])}). ${bad.length === 1 ? 'It is' : 'They are'} left out of the change and the line, so a sheet edit never shows as growth.</p>` : '';
    if (d['7'] == null && d['30'] == null) return flag + (since ? `<p class="cc-delta"><span>Since ${C.day(since.since)}: <b>${sign(since.value, money)}</b></span><span>${since.days} saved day${since.days === 1 ? '' : 's'}</span></p>`
      : bad.length ? '' : '<p class="cc-delta"><span>No saved days yet. Changes show after the first day is saved.</span></p>');
    return flag + `<p class="cc-delta"><span>7 days: <b>${d['7'] == null ? 'not 7 days yet' : sign(d['7'], money)}</b></span><span>30 days: <b>${d['30'] == null ? 'not 30 days yet' : sign(d['30'], money)}</b></span></p>`;
  }
  // A trend line needs at least two days saved in the sheet. Today's row is computed, so it never makes a line by itself.
  function spark(metric) {
    const h = C.data.history.slice(-60).filter(r => !(r.mismatch || []).includes(metric));
    const saved = Math.min(C.data.history_saved ?? 0, h.filter(r => r.day < C.data.today).length + (h.some(r => r.day === C.data.today) ? 1 : 0));
    if (saved < 2) return `<p class="cc-note">No trend line yet: ${saved ? 'one day is' : 'no days are'} saved in the Scorecard history. A line shows once two days are saved.</p>`;
    if (C.priv && metric === 'gci') return '<p class="cc-note">Chart hidden with money.</p>';
    const vals = h.map(r => r[metric] || 0), max = Math.max(1, ...vals), w = 240, ht = 48;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(ht - v / max * (ht - 4) - 2).toFixed(1)}`).join(' ');
    return `<svg class="cc-spark" viewBox="0 0 ${w} ${ht}" role="img" aria-label="${metric} over the last ${h.length} saved days, from ${vals[0]} to ${vals[vals.length - 1]}"><polyline points="${pts}"/></svg>`;
  }
  function kpi(title, value, body, sources) { return `<section class="cc-card cc-kpi"><h2>${title}</h2><b class="cc-num">${value}</b>${body}<footer>${src(sources)}</footer></section>`; }

  function scorecard() {
    const g = guard(); if (g) return g;
    const d = C.data, sc = d.scorecard, cap = sc.cap;
    const cl = sc.closings, lw = sc.leads7;
    return `<div class="cc-page">${head('Scorecard', 'Your numbers against your own goals. KW 70/30 split.')}
      <div class="cc-kpis">
        ${kpi('GCI this year', m(sc.gci.value), `${bar(sc.gci.goal)}<p class="cc-note">Paid plus pending: <b>${m(sc.gci.with_pending)}</b>${sc.gci.goal_with_pending ? ` (${sc.gci.goal_with_pending.pct}% of goal)` : ''}. ${sc.gci.from === 'kw_paid' ? 'From KW commission forms.' : 'From Closed deals in your sheet with an act of sale this year.'}${sc.gci.blank ? ` <em>${sc.gci.blank} closed with no commission on the sheet, so this is low.</em>` : ''}</p>${delta('gci', true)}${spark('gci')}`, ['deals', 'history'])}
        ${kpi('Closings this year', n(cl.value), `${bar(cl.goal)}${cl.low ? `<p class="cc-note">Goal ${cl.low} to ${cl.high}.</p>` : ''}${sc.gci.undated ? `<p class="cc-warn">${sc.gci.undated} closed deal${sc.gci.undated > 1 ? 's have' : ' has'} no act of sale date and ${sc.gci.undated > 1 ? 'are' : 'is'} not counted.</p>` : ''}${delta('closings')}${spark('closings')}`, ['deals', 'history'])}
        ${kpi('Leads per week', n(lw.value), `<p class="cc-note">${lw.low ? `Goal ${lw.low} to ${lw.high}. ` : ''}Website leads received in the last 7 days. Test leads are not counted.</p>${delta('leads7')}${spark('leads7')}`, ['leads', 'history'])}
        ${kpi('Appointments per week', n(sc.appts7.value), `<p class="cc-note">${sc.appts7.goal ? `Goal ${sc.appts7.goal}. ` : ''}Accepted showings, listing appointments and client meetings, today through the next 6 days. ${sc.appts7.invites ? `${sc.appts7.invites} more invite${sc.appts7.invites === 1 ? '' : 's'} not accepted, not counted. ` : ''}</p>${delta('appts7')}${spark('appts7')}`, ['calendar', 'history'])}
        ${kpi('Cap progress', cap ? m(cap.paid) : 'Not set', cap ? `${bar({ pct: cap.pct, pace_pct: 0, ahead: true })}<p class="cc-note">Company dollar is 30% of your commission on deals closed since ${C.day(cap.start)}. ${m(cap.left)} left of ${m(cap.amount)}. The royalty is separate and is not counted toward cap.</p>` : '<p class="cc-note">Add the cap amount and the cap year start below. The number shows once both are saved.</p>', ['deals', 'goals'])}
        ${kpi('Lead response time', 'Not tracked yet', `<p class="cc-note">${sc.response.note}</p>`, [])}
      </div>
      ${card('Set goals', goalForm(), 'goals')}</div>`;
  }
  function goalForm() {
    if (C.priv) return '<p class="cc-note">Goals hold dollar amounts, so they show only while money is shown. Tap Show money and contacts at the top.</p>';
    const g = C.data.goals || {};
    return `<form class="cc-goals" onsubmit="CC.saveGoals(event)">${GOALS.map(([k, label, , type]) => `<label>${label}<input name="${k}" type="${type || 'number'}" ${type ? '' : 'min="0" step="any" inputmode="decimal"'} value="${g[k] == null ? '' : esc(String(g[k]))}"></label>`).join('')}
      <p class="cc-note">Leave a box empty and the Scorecard shows no goal for it. For one number instead of a range, put it in both ends.</p>
      <button type="submit" class="cc-primary">Save goals</button></form>`;
  }
  C.saveGoals = async e => {
    e.preventDefault();
    const out = {};
    new FormData(e.target).forEach((v, k) => { const t = String(v).trim(); if (t) out[k] = /date/.test(e.target.elements[k].type) ? t : Number(t); });
    const r = await api('/api/cc/goals', out);
    if (r.ok) { toast('ok', 'SAVED', r.where || 'Goals saved.'); C.load(); } else toast('err', 'NOT SAVED', r.error || 'The goals were refused.');
  };
  C.views.scorecard = scorecard;
})();
