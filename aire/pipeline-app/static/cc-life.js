/* Market, News, Life, and Workouts and Health. Every card names its source and as-of time.
   Life and Workouts buttons queue one row for the AIRE CRM sheet; the sync appends it within 5 minutes. */
(function () {
  const C = window.CC;
  const { n, day, card, tile, empty, head, guard } = C;
  const money = v => (v == null ? '—' : '$' + Math.round(v).toLocaleString());
  const yy = v => (v == null ? '' : `<span class="cc-yy ${v > 0 ? 'up' : v < 0 ? 'down' : ''}">${v > 0 ? '▲' : v < 0 ? '▼' : ''} ${Math.abs(Math.round(v * 100))}% vs last year</span>`);
  const NEWS = { local: ['Local', 'k-closing'], market: ['Market', 'k-showing'], rates: ['Rates', 'k-client'] };
  const when = s => (s ? new Date(s).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
  C.news = { kind: 'all' };

  async function queue(tab, row, msg) {
    const r = await api('/api/cc/row', { tab, row });
    if (r.ok) { toast('ok', 'SAVED', msg || r.where); C.load(); } else toast('err', 'NOT SAVED', r.error || 'Refused.');
  }

  // ---------------- Market ----------------
  function ccmarket() {
    const g = guard(); if (g) return g;
    const m = C.data.market, r = m.rate, gb = m.gbrar && m.gbrar.snapshot;
    const gv = k => gb && gb[k] ? gb[k].now : null;
    return `<div class="cc-page">${head('Market', 'Rates, listings by area and the GBRAR monthly numbers. Check the date before you quote one.')}
      <div class="cc-tiles">
        ${tile('30-year fixed', r ? r.rate.toFixed(2) + '<small>%</small>' : '—', r ? `Week of ${day(r.date)} · ${r.change < 0 ? '▼' : r.change > 0 ? '▲' : ''} ${Math.abs(r.change).toFixed(2)} from the week before` : 'No read yet', 'market')}
        ${tile('GBRAR median sale price', gb ? money(gv('median_price')) : '—', gb ? `${m.gbrar.month} · ${n(gv('closed_sales'))} closed` : 'No GBRAR file', 'market')}
        ${tile('Months of supply', gb ? n(gv('months_supply')) : '—', gb ? `Greater Baton Rouge, ${m.gbrar.month}` : '', 'market')}
        ${tile('Days on market', gb ? n(gv('days_on_market')) : '—', gb ? `GBRAR, ${m.gbrar.month}` : '', 'market')}
      </div>
      ${card('By area', (m.areas || []).length ? `<div class="cc-areas">${m.areas.map(a => `<div class="cc-area">
          <h3>${esc(a.area)}<small>${a.level === 'zip' ? 'ZIP ' + esc(a.id) : 'Parish'} · ${esc((a.month || '').replace(/(\d{4})(\d{2})/, '$1-$2'))}</small></h3>
          <p><b>${n(a.active)}</b> active ${yy(a.active_yy)}</p><p><b>${money(a.median_price)}</b> median list ${yy(a.median_price_yy)}</p>
          <p><b>${n(a.dom)}</b> median days on market</p>${a.flag ? '<p class="cc-warn">Realtor.com marks this ZIP\'s data as less reliable.</p>' : ''}</div>`).join('')}</div>`
        : empty('No area numbers yet.'), 'market')}
      ${card('Talking points', (m.points || []).length ? `<ul class="cc-points">${m.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul><div class="cc-acts"><button type="button" class="cc-primary" onclick="CC.copyPoints()">Copy the talking points</button></div><p class="cc-note">Built only from the numbers above, each with its source and date. Check the date before you quote one to a client.</p>` : empty('No numbers yet, so no talking points.'), 'market')}
      ${(m.warnings || []).length ? `<p class="cc-warn">Not current in the last read: ${m.warnings.map(esc).join('; ')}. The rest of the page is from that read.</p>` : ''}
      <p class="cc-note">For-rent counts are not here: the free sources don't have them, and Zillow's rental data needs a paid feed.</p></div>`;
  }
  C.copyPoints = () => navigator.clipboard.writeText(C.data.market.points.join('\n')).then(() => toast('ok', 'COPIED', 'Talking points copied.'), () => toast('err', 'COPY', 'The browser blocked the clipboard.'));

  // ---------------- News ----------------
  function newsList(rows, max) {
    return rows.length ? `<ul class="cc-news">${rows.slice(0, max).map(r => { const [lab, k] = NEWS[r.kind] || ['Other', 'k-other']; return `<li class="${k}"><a href="${esc(r.url)}" target="_blank" rel="noopener"><span class="cc-pill ${k}">${lab}</span><b>${esc(r.title)}</b><small>${esc(r.source || '')}${r.date ? ' · ' + esc(when(r.date)) : ''}</small></a></li>`; }).join('')}</ul>` : empty('No headlines in the last read.');
  }
  function news() {
    const g = guard(); if (g) return g;
    const all = C.data.news || [], kinds = [...new Set(all.map(r => r.kind))];
    const rows = all.filter(r => C.news.kind === 'all' || r.kind === C.news.kind);
    return `<div class="cc-page">${head('News', 'Local real estate, the Louisiana market and mortgage rates, last 7 days')}
      <div class="cc-filters" role="group" aria-label="Show news by kind"><button type="button" class="cc-filter" aria-pressed="${C.news.kind === 'all'}" onclick="CC.newsKind('all')">All <b>${all.length}</b></button>${kinds.map(k => `<button type="button" class="cc-filter ${(NEWS[k] || [, 'k-other'])[1]}" aria-pressed="${C.news.kind === k}" onclick="CC.newsKind('${esc(k)}')">${(NEWS[k] || ['Other'])[0]} <b>${all.filter(r => r.kind === k).length}</b></button>`).join('')}</div>
      ${card('Headlines', newsList(rows, 40), 'news')}<p class="cc-note">Headlines and links from Google News searches. Each opens the outlet's own page.</p></div>`;
  }
  C.newsKind = k => { C.news.kind = k; render(); };

  // ---------------- Life ----------------
  function life() {
    const g = guard(); if (g) return g;
    const L = C.data.life;
    const pend = x => (x.pending ? ' <span class="cc-pill k-other">saving</span>' : '');
    const fam = L.family.length ? `<ul class="cc-list">${L.family.map(f => `<li class="cc-ev k-personal"><span class="cc-when">${day(f.next)}</span><span class="cc-what">${esc(f.name)}${pend(f)}<small>${f.days === 0 ? 'Today' : f.days === 1 ? 'Tomorrow' : 'In ' + f.days + ' days'}${f.note ? ' · ' + esc(f.note) : ''}</small></span></li>`).join('')}</ul>` : empty('No family dates yet.');
    const up = L.upkeep.length ? `<ul class="cc-list">${L.upkeep.map((u, i) => `<li class="cc-ev ${u.days != null && u.days < 0 ? 'k-closing' : u.days != null && u.days <= 7 ? 'k-deadline' : 'k-listing'}"><span class="cc-when">${u.due ? day(u.due) : '—'}</span><span class="cc-what">${esc(u.name)}${pend(u)}<small>${u.days == null ? 'Add a last-done date or every how many days' : u.days < 0 ? Math.abs(u.days) + ' days overdue' : u.days === 0 ? 'Due today' : 'Due in ' + u.days + ' days'} · every ${n(u.every)} days</small></span><button type="button" class="cc-mini" onclick="CC.lifeDone(${i}, 'upkeep')">Done today</button></li>`).join('')}</ul>` : empty('No home upkeep yet.');
    const hab = L.habits.length ? `<ul class="cc-habits">${L.habits.map((h, i) => `<li><button type="button" class="cc-check" aria-pressed="${h.today}" ${h.today ? 'disabled' : ''} onclick="CC.lifeDone(${i}, 'habit')" aria-label="${esc(h.name)}: ${h.today ? 'done today' : 'mark done today'}">${h.today ? '✓' : ''}</button><span>${esc(h.name)}${pend(h)}<small>${h.streak} day streak · ${h.week} of the last 7 days</small></span></li>`).join('')}</ul>` : empty('No habits yet.');
    return `<div class="cc-page">${head('Life', 'Family dates, home upkeep and habits. Only what you add, kept in the Life tab of your AIRE CRM sheet.')}
      <div class="cc-grid">${card('Family dates', fam, 'life')}${card('Home upkeep', up, 'life')}${card('Habits', hab, 'life')}</div>
      ${card('Add to Life', `<form class="cc-goals" onsubmit="CC.lifeAdd(event)">
        <label>Kind<select name="kind" required><option value="family">Family date</option><option value="upkeep">Home upkeep</option><option value="habit">Habit</option></select></label>
        <label>Name<input name="name" required maxlength="80" placeholder="Mom's birthday, AC filter, Read 20 minutes"></label>
        <label>Date (family date, or last done for upkeep)<input name="date" type="date"></label>
        <label>Every how many days (upkeep)<input name="every_days" type="number" min="1" step="1" inputmode="numeric"></label>
        <label>Note<input name="note" maxlength="120"></label>
        <button type="submit" class="cc-primary">Add</button></form>`, 'life')}</div>`;
  }
  C.lifeAdd = e => { e.preventDefault(); const row = Object.fromEntries(new FormData(e.target)); queue('Life', row, 'Added. It goes to the Life tab within 5 minutes.'); };
  C.lifeDone = (i, kind) => { const x = (kind === 'upkeep' ? C.data.life.upkeep : C.data.life.habits)[i]; queue('Life log', { date: C.data.today, item: x.name, kind }, `${x.name}: done today.`); };

  // ---------------- Workouts and Health ----------------
  function health() {
    const g = guard(); if (g) return g;
    const W = C.data.workouts, t = W.today || {};
    return `<div class="cc-page">${head('Workouts and Health', 'Weights, 4 to 5 days a week. Your plan is the Workouts tab of your AIRE CRM sheet, edit it there.')}
      <div class="cc-tiles">
        ${tile('Today', esc(t.focus || 'Rest'), t.done ? 'Done ✓' : esc(t.exercises || ''), 'workouts')}
        ${tile('Workouts, 7 days', n(W.done_7), 'Goal 4 to 5', 'workouts')}
        ${tile('Minutes, 7 days', n(W.minutes_7), 'Logged', 'workouts')}
      </div>
      ${card('This week', `<div class="cc-week">${W.week.map(w => `<div class="cc-wday ${w.done ? 'is-done' : ''} ${w.is_today ? 'is-today' : ''}"><h3>${w.day}<small>${day(w.date)}</small></h3><b>${esc(w.focus || 'Rest')}</b><small>${esc(w.exercises || '')}</small>${w.done ? `<span class="cc-pill k-showing">Done${w.minutes ? ' · ' + w.minutes + ' min' : ''}</span>` : ''}</div>`).join('')}</div>`, 'workouts')}
      ${card('Log a workout', `<form class="cc-goals" onsubmit="CC.logWorkout(event)">
        <label>Date<input name="date" type="date" required value="${C.data.today}"></label>
        <label>Focus<input name="focus" required maxlength="60" value="${esc(t.focus || '')}"></label>
        <label>Minutes<input name="minutes" type="number" min="1" max="300" inputmode="numeric"></label>
        <label>Note<input name="note" maxlength="120"></label>
        <button type="submit" class="cc-primary">Log it</button></form>`, 'workouts')}
      ${card('Health', `<p class="cc-note">${esc(C.data.health.note)} Steps, sleep, resting heart rate and weight stay off this page until you pick a source: a free Apple Shortcut, Health Auto Export ($6.99 a year) or typing them in.</p>`, [])}</div>`;
  }
  C.logWorkout = e => { e.preventDefault(); queue('Workout log', Object.fromEntries(new FormData(e.target)), 'Workout logged.'); };

  // Dashboard: news and today's workout under the main cards.
  C.dashMore = () => `<div class="cc-grid">${card('News', newsList(C.data.news || [], 4), 'news')}${card("Today's workout", `<p class="cc-big">${esc((C.data.workouts.today || {}).focus || 'Rest')}</p><p class="cc-note">${(C.data.workouts.today || {}).done ? 'Done ✓' : esc((C.data.workouts.today || {}).exercises || '')} · ${C.data.workouts.done_7} workouts in 7 days</p><button type="button" class="cc-btn" onclick="go('health')">Open Workouts</button>`, 'workouts')}${C.data.market.rate ? card('30-year fixed', `<p class="cc-big">${C.data.market.rate.rate.toFixed(2)}%</p><p class="cc-note">Week of ${day(C.data.market.rate.date)}, ${C.data.market.rate.change <= 0 ? 'down' : 'up'} ${Math.abs(C.data.market.rate.change).toFixed(2)}</p><button type="button" class="cc-btn" onclick="go('ccmarket')">Open Market</button>`, 'market') : ''}</div>`;

  Object.assign(C.views, { ccmarket, news, life, health });
})();
