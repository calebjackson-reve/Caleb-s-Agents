// The dashboard: the page Pipeline opens on. One read of /api/dash (world totals, the Mac-only brief, the 14-day
// history, the AI visibility summary, the tools board, the weather) plus the feed Pipeline already holds.
// Every number shows what it means in one line under it. Toggles on the right rail hide or show cards and
// persist in localStorage. The farm (World) is a page under this one.
const Dash = (() => {
  const KEY = 'aire.dash.toggles';
  const DEF = { calendar: true, schedule: true, tasks: true, timer: true, deadlines: true, inbox: true, stages: true, leads: true, market: true, ai: true, tools: true, live: true, compact: false };
  const LABELS = { calendar: 'month', schedule: 'today', tasks: 'tasks', timer: 'timer', deadlines: 'due', inbox: 'inbox', stages: 'stages', leads: 'leads', market: 'market', ai: 'AI', tools: 'tools', live: 'live', compact: 'tight' };
  const THEME_KEY = 'aire.theme';
  const ICONS = { calendar: '▦', schedule: '◷', tasks: '☑', timer: '◔', deadlines: '⚑', inbox: '✉', stages: '▤', leads: '✦', market: '◆', ai: '◎', tools: '⚙', live: '↻', compact: '▣' };
  // Solid-color icon chips, inline SVG so they work offline. Color per card, one glyph each.
  const CHIP = {
    commission: ['var(--gold)', '<path d="M12 3v18M8 7.5h6a2.5 2.5 0 0 1 0 5H9.5a2.5 2.5 0 0 0 0 5H16"/>'],
    contract: ['var(--sky)', '<path d="M4 20V9l8-6 8 6v11H4z"/><path d="M10 20v-6h4v6"/>'],
    people: ['var(--coral)', '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.3c2.9.3 5.5 2.6 5.5 5.7"/>'],
    deadlines: ['var(--rose)', '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>'],
    calendar: ['var(--lavender)', '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'],
    weather: ['var(--gold)', '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'],
    schedule: ['var(--sky)', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
    tasks: ['var(--sage)', '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>'],
    timer: ['var(--coral)', '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M9.5 3h5M12 3v2.5"/>'],
    inbox: ['var(--lavender)', '<path d="M3.5 13l2.3-7h12.4l2.3 7v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-5z"/><path d="M3.5 13h5l1.5 2.5h4l1.5-2.5h5"/>'],
    stages: ['var(--gold)', '<path d="M4 19h16M6 15V9M11 15V5M16 15v-3"/>'],
    leads: ['var(--rose)', '<path d="M12 3l2.2 5.6L20 9.4l-4.4 3.9L17 19l-5-3-5 3 1.4-5.7L4 9.4l5.8-.8z"/>'],
    market: ['var(--sage)', '<path d="M3.5 17l5-6 4 3.5 8-8.5"/><path d="M15.5 6h5v5"/>'],
    ai: ['var(--sky)', '<path d="M12 4l1.5 4 4 1.5-4 1.5L12 15l-1.5-4-4-1.5 4-1.5z"/><path d="M5 16l.8 2 2 .8-2 .8L5 21.5l-.8-1.9-2-.8 2-.8z"/>'],
    tools: ['var(--coral)', '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'],
  };
  const chip = k => CHIP[k] ? `<span class="ico-chip" style="background:${CHIP[k][0]}"><svg viewBox="0 0 24 24" aria-hidden="true">${CHIP[k][1]}</svg></span>` : '';
  let T = load(), D = null, at = 0, loading = false, clock = null, poll = null;
  let left = 1500, run = null; const TOTAL = 1500;

  function load() { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { ...DEF }; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(T)); } catch (e) { /* private window */ } }
  const v = x => (x && typeof x === 'object' && 'value' in x) ? x.value : x;
  const n = x => (v(x) == null ? null : Number(v(x)));
  const num = x => { const k = n(x); return k == null ? '—' : k.toLocaleString(); };
  const usd = x => { const k = n(x); return k == null ? '—' : '$' + Math.round(k).toLocaleString(); };
  const usdShort = x => { const k = n(x); return k == null ? '—' : k >= 1e6 ? '$' + (k / 1e6).toFixed(2) + 'M' : k >= 1e3 ? '$' + Math.round(k / 1e3) + 'k' : '$' + k; };
  const day = iso => { if (!iso) return ''; const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')); return d.toLocaleDateString([], { month: 'short', day: 'numeric' }); };
  const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const daysUntil = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 864e5);
  const when = iso => { const k = daysUntil(iso); return k === 0 ? 'today' : k === 1 ? 'tomorrow' : k < 0 ? `${-k}d ago` : day(iso); };
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

  async function fetchDash(force) {
    if (loading || (!force && D && Date.now() - at < 60000)) return;
    loading = true;
    try { const r = await fetch('/api/dash', { cache: 'no-store' }); D = await r.json(); at = Date.now(); }
    catch (e) { D = D || { error: String(e) }; }
    loading = false;
    if (S.view === 'dash') render();
  }

  // ---- cards. Each returns '' when its toggle is off.
  function card(key, cls, title, right, body, sub, icon) {
    if (key && T[key] === false) return '';
    return `<section class="dcard ${cls}"><div class="dch"><h3>${chip(icon || key)}${title}</h3>${right ? `<small>${right}</small>` : ''}</div>${body}${sub ? `<p class="sub">${sub}</p>` : ''}</section>`;
  }
  function heroes(w, f) {
    const c = f.counts || {};
    const pend = w ? n(w.deals.pending_commission) : null, uc = w ? n(w.deals.under_contract) : (f.deals || []).filter(d => d.stage === 'under_contract').length;
    const ucVol = w ? n(w.deals.under_contract_volume) : null, next = w ? v(w.deals.next_close) : '';
    const hot = w ? n(w.people.hot) : (c.by_band || {}).hot, warm = w ? n(w.people.warm) : (c.by_band || {}).warm, contacts = w ? n(w.people.contacts) : c.contacts;
    const l7 = w ? n(w.people.new_leads_7d) : (f.new_leads || []).length, l30 = w ? n(w.people.new_leads_30d) : null;
    const dToday = w ? n(w.calendar.deadlines_today) : 0, d30 = w ? n(w.calendar.deadlines_30d) : 0;
    const pendSub = pend == null ? `No commission figure on the under-contract deals yet. Add one in the Deals tab and this fills in.` : `Your cut waiting on the ${uc} under-contract deal${uc === 1 ? '' : 's'}. Paid at closing.`;
    return `<div class="heroes">
      ${card('', 'dhero', 'Pending commission', 'now', `<div class="big ${pend == null ? 'dim' : 'amber'}">${pend == null ? '—' : usd(pend)}</div>`, pendSub, 'commission')}
      ${card('', 'dhero', 'Under contract', 'now', `<div class="big">${ucVol == null ? uc : usdShort(ucVol)}</div>`, `${uc} deal${uc === 1 ? '' : 's'} in contract${next ? `. Next closing ${day(next)}.` : '.'}`, 'contract')}
      ${card('', '', 'Hot · Warm', 'sphere', `<div class="big">${num(hot)} <span class="dot">·</span> ${num(warm)}</div>`, `Of ${num(contacts)} contacts. ${l7 ?? 0} new lead${l7 === 1 ? '' : 's'} this week${l30 != null ? `, ${l30} this month` : ''}.`, 'people')}
      ${card('', '', 'Deadlines', '30 days', `<div class="big ${dToday ? 'amber' : ''}">${dToday} today</div>`, `${d30} contract deadline${d30 === 1 ? '' : 's'} in the next 30 days, from the Deadlines tab.`, 'deadlines')}
    </div>`;
  }
  function weather(wx) {
    if (!wx) return card('', 'wx', 'Baton Rouge', 'weather', `<div class="big dim">—</div>`, 'Weather needs the network. Open-Meteo, free, no key.', 'weather');
    return card('', 'wx', 'Baton Rouge', wx.source === 'demo' ? 'demo' : 'Open-Meteo', `<div class="big">${wx.temp}<sup>°F</sup></div><p class="sub"><b>${esc(wx.word)}</b>, wind ${wx.wind} mph${wx.hi != null ? `. High ${wx.hi}, low ${wx.lo}.` : ''}</p>
      <div class="days">${(wx.days || []).map(d => `<div>${esc(d.day)}<b>${d.hi}° / ${d.lo}°</b></div>`).join('')}</div>`, '', 'weather');
  }
  function month(w) {
    const dl = new Set((w && w.calendar.deadlines || []).map(d => d.date));
    const t = new Date(), y = t.getFullYear(), m = t.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), today = todayISO();
    let h = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < first; i++) h += `<div class="d out"></div>`;
    for (let d = 1; d <= days; d++) { const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; h += `<div class="d${iso === today ? ' today' : ''}">${d}${dl.has(iso) ? '<i></i>' : ''}</div>`; }
    return card('calendar', 'cal', t.toLocaleDateString([], { month: 'long', year: 'numeric' }), `${dl.size} marked`, `<div class="grid7">${h}</div>`, 'Red dots are contract deadlines from the Deadlines tab. Today is boxed.');
  }
  function schedule(b) {
    const items = b && b.calendar;
    const body = items === null || items === undefined ? `<div class="empty"><b>Calendar not synced yet</b>Run <code>sync.py auth</code> once on the Mac.</div>`
      : !items.length ? `<div class="empty"><b>Nothing on the calendar today</b></div>`
      : items.slice(0, 5).map(e => { const past = !e.all_day && e.at && new Date(e.at) < new Date(); return `<div class="it${past ? ' done' : ''}"><span>${esc(e.time)}</span><div>${esc(e.title)}</div></div>`; }).join('');
    return card('schedule', 'sched', "Today's schedule", items && items.length ? `${items.length} block${items.length === 1 ? '' : 's'}` : '', body, 'Google Calendar, today, through the World sync on the Mac.');
  }
  function tasks(f, b) {
    const rows = (f.tasks || []).map(t => ({ what: t.task, who: t.display, due: t.due, over: t.overdue, src: 'task' }))
      .concat((b && b.next_actions || []).slice(0, 4).map(a => ({ what: a.action, who: a.who, due: '', band: a.band, src: 'next action' })));
    const body = rows.length ? rows.slice(0, 5).map(r => `<div class="tk"><button class="ck" type="button" aria-label="done" onclick="this.classList.toggle('on');this.textContent=this.classList.contains('on')?'✓':''"></button>
      <div>${esc(r.what)}<small>${esc(r.who || '')}${r.src === 'next action' ? ' · next action' : ''}</small></div><span class="pill ${r.over ? 'high' : r.band === 'hot' ? 'high' : r.band === 'warm' ? 'med' : 'low'}">${r.over ? 'overdue' : r.due ? when(r.due) : r.band || 'todo'}</span></div>`).join('')
      : `<div class="empty"><b>No open tasks</b>The Tasks tab is clear. Next actions show here once the Mac syncs.</div>`;
    const c = f.counts || {};
    return card('tasks', 'tasks', 'My tasks', `${(f.tasks || []).length} open${c.tasks_overdue ? ` · ${c.tasks_overdue} overdue` : ''}`, body, 'Tasks tab first, then the hottest next actions. Checking a box here is visual; mark it done in Tasks (key 3).');
  }
  function timer() {
    const mm = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
    return card('timer', 'timer', 'Focus timer', 'sales block', `<div class="ring"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="64" class="track"/><circle id="dash-arc" cx="75" cy="75" r="64" class="arc" stroke-dasharray="402" stroke-dashoffset="${402 * (1 - left / TOTAL)}"/></svg><div class="in"><b id="dash-time">${mm}</b><small>${run ? 'running' : 'ready'}</small></div></div>
      <div class="ctl"><button type="button" class="go" onclick="Dash.toggleTimer()">${run ? '❚❚' : '▶'}</button><button type="button" onclick="Dash.resetTimer()">↺</button></div>`, '25 minutes, the length of a sales block. Runs here only.');
  }
  function deadlines(w) {
    const rows = (w && w.calendar.deadlines || []).filter(d => daysUntil(d.date) >= -1).slice(0, 5);
    const body = rows.length ? `<ul class="list">${rows.map(d => { const k = daysUntil(d.date); return `<li><span class="t${k <= 0 ? ' now' : ''}">${when(d.date)}</span><span class="m">${esc(d.kind)}<small>${esc(d.stage || '')}</small></span><span class="pill ${k <= 1 ? 'high' : k <= 7 ? 'med' : 'low'}">${k <= 1 ? 'high' : k <= 7 ? 'soon' : 'later'}</span></li>`; }).join('')}</ul>` : `<div class="empty"><b>No deadlines in the next 30 days</b></div>`;
    return card('deadlines', 'dl', 'Upcoming deadlines', rows.length ? `${rows.length} listed` : '', body, 'Deadlines tab, matched to deals by address. Kind and stage only, no addresses here.');
  }
  function inbox(b) {
    const items = b && b.inbox;
    const body = items == null ? `<div class="empty"><b>Inbox not synced yet</b>The Mac sync reads Gmail with the World token.</div>`
      : !items.length ? `<div class="empty"><b>Inbox clear</b></div>`
      : items.slice(0, 5).map(m => `<div class="mail${m.unread ? ' unread' : ''}"><b>${esc(m.from)}</b><span>${esc(m.subject)}</span><small>${m.count > 1 ? m.count + ' msgs' : ''}</small></div>`).join('');
    return card('inbox', 'inbox', 'Inbox', items ? `${items.length} thread${items.length === 1 ? '' : 's'}` : '', body, 'Threads from the last 3 days you did not send, newest first.');
  }
  function stages(w, f) {
    const by = w ? w.deals.by_stage : (f.deals || []).reduce((a, d) => (a[d.stage] = (a[d.stage] || 0) + 1, a), {});
    const vol = {}; (w && w.deals.houses || []).forEach(h => vol[h.stage] = (vol[h.stage] || 0) + (h.price || 0));
    const order = ['active', 'showing', 'under_contract', 'closed'], colors = { active: 'var(--cyan)', showing: 'var(--violet)', under_contract: 'var(--amber)', closed: 'var(--teal)' };
    const max = Math.max(1, ...order.map(k => vol[k] || 0));
    const body = `<div class="funnel">${order.map(k => `<div class="f"><span>${k.replace('_', ' ')}</span><i style="width:${Math.max(4, Math.round(100 * (vol[k] || 0) / max))}%;background:${colors[k]}"></i><b>${by[k] || 0}${vol[k] ? ' · ' + usdShort(vol[k]) : ''}</b></div>`).join('')}</div>`;
    return card('stages', 'stages', 'Pipeline by stage', 'Deals tab', body, 'Bar length is dollar volume, the number is deals. Click Deals (key 4) for the rows.');
  }
  function leads(w, hist) {
    const pts = (hist || []).map(h => ({ d: h.date, v: n(h.new_leads_7d) || 0 }));
    const l7 = w ? n(w.people.new_leads_7d) : null, src = (w && w.people.new_leads_7d_by_source) || {};
    const max = Math.max(1, ...pts.map(p => p.v));
    const spark = pts.length >= 2 ? `<svg viewBox="0 0 300 70" class="spark" aria-label="new leads, 7 day window, last ${pts.length} days">${pts.map((p, i) => `<rect x="${(i * 300 / pts.length) + 2}" y="${66 - Math.round(60 * p.v / max)}" width="${Math.max(4, 300 / pts.length - 4)}" height="${Math.round(60 * p.v / max)}" rx="2" fill="${i === pts.length - 1 ? 'var(--amber)' : 'rgba(25,211,255,.45)'}"><title>${p.d}: ${p.v}</title></rect>`).join('')}</svg>` : `<div class="spark-empty">The daily history starts the day the Mac loop first runs. ${pts.length} day${pts.length === 1 ? '' : 's'} so far.</div>`;
    const srcs = Object.entries(src).map(([k, c]) => `${c} ${k}`).join(', ');
    return card('leads', 'leads', 'New leads', 'this week', `<div class="big">${l7 == null ? '—' : l7}</div>${spark}`, srcs ? `By source: ${esc(srcs)}. Sources are Contacts dates, the Command export and the LP leads tab.` : 'From Contacts dates, the Command export and the LP leads tab.');
  }
  function market(w) {
    const g = w && w.market && w.market.gbrar; if (!g) return card('market', 'market', 'Market', '', `<div class="empty"><b>No GBRAR numbers loaded</b></div>`, '');
    const cell = (k, fmt) => g[k] ? `<div><b>${fmt(g[k].value)}</b><small>${esc(g[k].label || k)}${g[k].yoy != null ? ` <em class="${g[k].yoy < 0 ? 'down' : 'up'}">${g[k].yoy > 0 ? '+' : ''}${g[k].yoy}%</em>` : ''}</small></div>` : '';
    return card('market', 'market', 'Market', esc(g.month || g.median_price.period || ''), `<div class="mini">${cell('median_price', x => usdShort(x))}${cell('days_on_market', x => x)}${cell('months_supply', x => x)}${cell('new_listings', x => Number(x).toLocaleString())}</div>`, esc((g.source || g.median_price.source || '').slice(0, 140)));
  }
  function ai(a) {
    if (!a || !a.latest) return card('ai', 'ai', 'AI visibility', 'not run', `<div class="empty"><b>No run yet</b>On the Mac: <code>check.py</code> in aire/ai-visibility. About $1.44 a run.</div>`, 'How AI answers talk about you in your markets, measured the FirstAnswer way.');
    const l = a.latest, pct = x => Math.round(100 * (x || 0)) + '%';
    const recs = (a.recommendations || []).slice(0, 3).map(r => `<li>${esc(r.domain)} <small>cited ${r.cited}×</small></li>`).join('');
    return card('ai', 'ai', 'AI visibility', esc(l.date), `<div class="mini"><div><b>${pct(l.unbranded_mention_rate)}</b><small>mentioned on unbranded asks</small></div><div><b>${pct(l.citation_rate)}</b><small>calebjackson.org cited</small></div><div><b>${l.branded_correct}/${l.branded_total}</b><small>branded asks right</small></div><div><b>${l.avg_position || '—'}</b><small>avg position when named</small></div></div>${recs ? `<ul class="recs">${recs}</ul>` : ''}`, `Claude with web search, ${l.prompts} prompts, ${a.runs} run${a.runs === 1 ? '' : 's'}. Platforms listed are what the answers cite and you are not on.`);
  }
  function tools(rows) {
    return card('tools', 'tools', 'AIRE tools', 'from the Mac', `<div class="tgrid">${(rows || []).map(r => `<div class="tool ${r.state}" title="${esc(r.detail)}"><i></i><b>${esc(r.name)}</b><small>${esc(r.detail)}</small></div>`).join('')}</div>`, 'Green ran recently, amber is stale or needs you, grey has not reported. Hover for the detail.');
  }
  function rail() {
    const keys = ['calendar', 'schedule', 'tasks', 'timer', 'deadlines', 'inbox', 'stages', 'leads', 'market', 'ai', 'tools', 'live', 'compact'];
    return `<div class="drail" aria-label="Dashboard toggles">${keys.map(k => `<button type="button" class="${T[k] ? 'on' : ''}" onclick="Dash.toggle('${k}')" title="${LABELS[k]}">${ICONS[k]}<span>${LABELS[k]}</span></button>`).join('')}
      <button type="button" class="theme" onclick="Dash.theme()" title="Switch the look: Estate or HUD">◐<span>${document.documentElement.dataset.theme === 'estate' ? 'estate' : 'hud'}</span></button>
      <button type="button" class="farm" onclick="go('world')" title="Open the farm (World)">⌂<span>farm</span></button></div>`;
  }

  function view() {
    const f = (S.data && S.data.feed) || {}, w = D && D.world, b = D && D.brief;
    const asof = w && w.sync ? `World sync ${new Date(w.sync.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${w.sync.ok === false ? ' (failed, last good shown)' : ''}` : 'World sync not run yet';
    const head = `<div class="dhead"><div><h1>${greet()}, <b>Caleb</b></h1><div class="motto">No paid leads, just service. · Keller Williams First Choice</div></div>
      <div class="asof">${D ? esc(asof) : 'loading…'}${D && D.demo ? ' · demo' : ''}<br><small>${new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</small></div></div>`;
    if (!D) return `<div class="dash${T.compact ? ' compact' : ''}"><div class="dmain">${head}<div class="empty"><b>Reading the dashboard</b></div></div>${rail()}</div>`;
    return `<div class="dash${T.compact ? ' compact' : ''}"><div class="dmain">${head}
      <div class="r r1">${heroes(w, f)}${month(w)}<div class="stack">${weather(D.weather)}${timer()}</div></div>
      <div class="r r2">${schedule(b)}${tasks(f, b)}${deadlines(w)}${inbox(b)}</div>
      <div class="r r3">${stages(w, f)}${leads(w, D.history)}${market(w)}${ai(D.ai_visibility)}${tools(D.tools)}</div>
      <div class="dfoot"><span>AIRE CRM sheet, Google Calendar and Gmail through the Mac sync, GBRAR, Open-Meteo, aire/ai-visibility.</span><span>Greeting and timer run live. Numbers refresh every minute from the Mac.</span></div>
    </div>${rail()}</div>`;
  }
  function mount() {
    fetchDash(false);
    if (!clock) clock = setInterval(() => { if (S.view !== 'dash') return; const h = $('.dhead h1'); if (h) h.innerHTML = `${greet()}, <b>Caleb</b>`; }, 60000);
    if (poll) clearInterval(poll);
    poll = setInterval(() => { if (S.view === 'dash' && T.live) fetchDash(true); }, 300000);
  }
  function toggle(k) { T[k] = !T[k]; save(); render(); }
  function applyTheme() { let t = 'estate'; try { t = localStorage.getItem(THEME_KEY) || 'estate'; } catch (e) { /* private window */ } document.documentElement.dataset.theme = t; }
  function theme() { const t = document.documentElement.dataset.theme === 'estate' ? 'hud' : 'estate'; try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* private window */ } document.documentElement.dataset.theme = t; render(); }
  applyTheme();
  function drawTimer() { const t = $('#dash-time'), a = $('#dash-arc'); if (t) t.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'); if (a) a.setAttribute('stroke-dashoffset', String(402 * (1 - left / TOTAL))); }
  function toggleTimer() { if (run) { clearInterval(run); run = null; } else { run = setInterval(() => { left = Math.max(0, left - 1); drawTimer(); if (!left) { clearInterval(run); run = null; render(); } }, 1000); } render(); }
  function resetTimer() { left = TOTAL; drawTimer(); if (run) { clearInterval(run); run = null; } render(); }
  return { view, mount, toggle, theme, toggleTimer, resetTimer, refresh: () => fetchDash(true), state: () => ({ toggles: { ...T }, loaded: !!D, theme: document.documentElement.dataset.theme }) };
})();
window.Dash = Dash;
function viewDash() { return Dash.view(); }
