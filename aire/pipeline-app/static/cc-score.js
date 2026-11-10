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
    ['tax_rate', 'Set aside for taxes, percent of your take'],
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

  // Sales by year: every closing in the sales history plus Closed deals on the sheet. Year end figures are estimates.
  function bars(years, key, money) {
    if (money && C.priv) return '<p class="cc-note">Chart hidden with money.</p>';
    const max = Math.max(1, ...years.map(y => y[key])), bw = 240 / years.length;
    return `<svg class="cc-ybars" viewBox="0 0 240 86" role="img" aria-label="${key} by year: ${years.map(y => y.year + ' ' + Math.round(y[key])).join(', ')}">${years.map((y, i) => {
      const h = y[key] / max * 60;
      return `<rect x="${(i * bw + bw * .18).toFixed(1)}" y="${(70 - h).toFixed(1)}" width="${(bw * .64).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="var(--cc-coral)" opacity="${y.partial ? .55 : 1}"/><text x="${(i * bw + bw / 2).toFixed(1)}" y="82" text-anchor="middle" font-size="9" fill="currentColor">${y.year}</text>`;
    }).join('')}</svg>`;
  }
  function growth() {
    const g = C.data.growth;
    if (!g) return card('Sales by year', '<p class="cc-note">No sales history yet. It shows once the sales history file is saved or a Closed deal on the sheet has an act of sale date.</p>', ['sales', 'deals']);
    const ch = v => (v == null ? '—' : v === 0 ? 'no change' : (v > 0 ? 'up ' : 'down ') + Math.abs(v) + '%'), p = g.projection, yr = g.years[g.years.length - 1];
    const rows = g.years.map(y => `<tr><th>${y.year}${y.partial ? ' <small>' + (y === yr ? 'to date' : 'partial year') + '</small>' : ''}</th><td class="r">${n(y.deals)}</td><td class="r">${n(y.sides)}</td><td class="r">${m(y.volume)}</td><td class="r">${m(y.avg)}</td><td class="r">${ch(y.yoy_deals)}</td><td class="r">${ch(y.yoy_volume)}</td></tr>`).join('');
    return `<section class="cc-card"><h2>Sales by year</h2>
      <p class="cc-note"><b>${n(g.totals.deals + (g.undated || 0))}</b> closed sales${g.undated ? ` (${g.undated} with no close date yet, not in a year or in the volume)` : ''}, <b>${m(g.totals.volume)}</b> since ${new Date(g.since + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Counted by side: <b>${n(g.totals.sides)}</b> sides, <b>${m(g.totals.side_volume)}</b>.${g.leases ? ` ${g.leases} lease${g.leases === 1 ? '' : 's'} left out.` : ''}${g.from_sheet ? ` ${g.from_sheet} from the Deals sheet, not in the history yet.` : ''}</p>
      <div class="cc-kpis"><div><p class="cc-note">Closed sales</p>${bars(g.years, 'deals')}</div><div><p class="cc-note">Sales volume</p>${bars(g.years, 'volume', true)}</div></div>
      <div class="cc-tablewrap"><table class="cc-table"><thead><tr><th>Year</th><th class="r">Sales</th><th class="r">Sides</th><th class="r">Volume</th><th class="r">Average price</th><th class="r">Sales change</th><th class="r">Volume change</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="cc-note">${yr.year} to date: <b>${n(g.ytd.deals)}</b> sales and <b>${m(g.ytd.volume)}</b>, against ${n(g.ytd.last_deals)} and ${m(g.ytd.last_volume)} by this date last year. This year's change compares the same dates.</p>
      <p class="cc-note">Year end estimate: <b>${n(p.deals.even)}</b> sales and <b>${m(p.volume.even)}</b> at even pace${p.deals.seasonal == null ? '' : `, <b>${n(p.deals.seasonal)}</b> and <b>${m(p.volume.seasonal)}</b> at your usual pace for this time of year`}.${g.cagr ? ` Growth a year from ${g.cagr.from} to ${g.cagr.to}: ${ch(g.cagr.deals)} in sales, ${ch(g.cagr.volume)} in volume.` : ''} Estimates from past pace, not a promise.</p>
      <h2>Every sale</h2>
      <div class="cc-tablewrap"><table class="cc-table"><thead><tr><th>Closed</th><th>Address</th><th>Side</th><th class="r">Price</th><th>Type</th><th>From</th></tr></thead><tbody>${(g.sales || []).map(r => `<tr><th>${r.day ? C.esc(r.day) : '<em>blank</em>'}</th><td>${C.esc(r.address || '')}</td><td>${r.side ? C.esc(r.side) : '<em>blank</em>'}</td><td class="r">${r.price == null ? '<em>blank</em>' : m(r.price)}</td><td>${C.esc(r.type || '')}</td><td>${C.esc(r.source || '')}</td></tr>`).join('')}</tbody></table></div>
      <footer>${src(['sales', 'deals'])}</footer></section>`;
  }

  function scorecard() {
    const g = guard(); if (g) return g;
    const d = C.data, sc = d.scorecard, cap = sc.cap;
    const cl = sc.closings, lw = sc.leads7;
    return `<div class="cc-page">${head('Scorecard', 'Your numbers against your own goals. The 70/30 split is the one you gave Pipeline for KW First Choice, not read from KW.')}
      <div class="cc-kpis">
        ${kpi('GCI this year', m(sc.gci.value), `${bar(sc.gci.goal)}<p class="cc-note">Paid plus pending: <b>${m(sc.gci.with_pending)}</b>${sc.gci.goal_with_pending ? ` (${sc.gci.goal_with_pending.pct}% of goal)` : ''}. ${sc.gci.from === 'kw_paid' ? 'From KW commission forms.' : 'From Closed deals in your sheet with an act of sale this year.'}${sc.gci.blank ? ` <em>${sc.gci.blank} closed with no commission on the sheet, so this is low.</em>` : ''}${sc.gci.est ? ` <em>${m(sc.gci.sheet_value)} is from the sheet. ${m(sc.gci.est.value)} is an estimate: ${sc.gci.est.rate * 100}% of price, per side, for ${sc.gci.est.n} closings with no commission on record.</em>` : ''}</p>${delta('gci', true)}${spark('gci')}`, ['deals', 'history'])}
        ${kpi('Closings this year', n(cl.value), `${bar(cl.goal)}${cl.on_sheet < cl.value ? `<p class="cc-note">From your sales record. ${cl.on_sheet} of the ${cl.value} are on the Deals sheet${sc.gci.est ? '' : `, so GCI counts only those ${cl.on_sheet}`}.</p>` : ''}${cl.low ? `<p class="cc-note">Goal ${cl.low} to ${cl.high}.</p>` : ''}${sc.gci.undated ? `<p class="cc-warn">${sc.gci.undated} closed deal${sc.gci.undated > 1 ? 's have' : ' has'} no act of sale date and ${sc.gci.undated > 1 ? 'are' : 'is'} not counted.</p>` : ''}${delta('closings')}${spark('closings')}`, ['sales', 'deals', 'history'])}
        ${kpi('Leads per week', n(lw.value), `<p class="cc-note">${lw.low ? `Goal ${lw.low} to ${lw.high}. ` : ''}Website leads received in the last 7 days. Test leads are not counted.</p>${delta('leads7')}${spark('leads7')}`, ['leads', 'history'])}
        ${kpi('Appointments per week', n(sc.appts7.value), `<p class="cc-note">${sc.appts7.goal ? `Goal ${sc.appts7.goal}. ` : ''}Accepted showings, listing appointments and client meetings, today through the next 6 days. ${sc.appts7.invites ? `${sc.appts7.invites} more invite${sc.appts7.invites === 1 ? '' : 's'} not accepted, not counted. ` : ''}</p>${delta('appts7')}${spark('appts7')}`, ['calendar', 'history'])}
        ${kpi('Cap progress', cap ? m(cap.paid) : 'Not set', cap ? `${bar({ pct: cap.pct, pace_pct: 0, ahead: true })}<p class="cc-note">Company dollar is 30% of your commission on deals closed since ${C.day(cap.start)}. ${m(cap.left)} left of ${m(cap.amount)}. The royalty is separate and is not counted toward cap.</p>` : '<p class="cc-note">Add the cap amount and the cap year start below. The number shows once both are saved.</p>', ['deals', 'goals'])}
        ${(tx => kpi('Tax savings', tx ? m(tx.set_aside) : 'Not set', tx ? `<p class="cc-note">${tx.rate}% of your take this year. Take: <b>${m(tx.take)}</b>, which is ${m(tx.gci)} in commission less ${m(tx.company)} company dollar and ${m(tx.royalty)} royalty.${tx.n_est ? ` <em>${m(tx.est_gci)} of the commission is the estimate for ${tx.n_est} closings, so part of this is a guess.</em>` : ''} A number to save toward, not tax advice.</p>` : '<p class="cc-note">Add a tax percent below and this shows what to set aside from your take this year.</p>', ['deals', 'sales', 'goals']))(d.tax)}
        ${kpi('Lead response time', 'Not tracked yet', `<p class="cc-note">${sc.response.note}</p>`, [])}
      </div>
      ${growth()}
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
