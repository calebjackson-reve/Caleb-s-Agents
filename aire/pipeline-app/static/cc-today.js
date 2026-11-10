/* Today: one ranked list on the Dashboard of what needs Caleb now, with one-tap actions.
   Order: replies owed, contract deadlines today or tomorrow, overdue tasks, tasks due today, new website leads today,
   hot people due, home upkeep overdue. Done, Touched and Text are Pipeline's own actions (app.js), so every write goes
   through crm.py and its gates and nothing sends without the SEND press in the compose drawer. */
(function () {
  const C = window.CC;
  const LIMIT = 12;
  const q = s => `'${String(s || '').replace(/[^\w-]/g, '')}'`;  // ids into onclick, letters, digits, dash, underscore only

  function items() {
    const d = C.data, f = ((typeof S !== "undefined" && S.data) && S.data.feed) || {}, today = d.today, tomorrow = C.addDays(today, 1);
    const out = [];
    owesReply().slice(0, 5).forEach(r => out.push({
      k: 'reply', kind: 'k-closing', label: 'Owes a reply', title: C.pname(r), sub: (r.last_messages || []).length ? esc(C.cleanMsg(r.last_messages.slice(-1)[0]).slice(0, 90)) : C.scrub(r.next_action, [r.display]),
      acts: `${typeof textBtn === 'function' ? textBtn(r.person_id, r) : ''}<button type="button" class="cc-mini" onclick="touched(${q(r.person_id)})">✓ Touched</button>` }));
    d.deadlines.all.filter(x => x.day <= tomorrow).forEach(x => out.push({
      k: 'deadline', kind: 'k-deadline', label: x.day === today ? 'Deadline today' : 'Deadline tomorrow', title: esc(x.what), sub: esc(x.deal),
      acts: `<button type="button" class="cc-mini" onclick="go('deadlines')">Open Deadlines</button>` }));
    const tasks = (f.tasks || []).filter(t => t.status !== 'done');
    tasks.filter(t => t.overdue).slice(0, 4).concat(tasks.filter(t => !t.overdue && t.due === today).slice(0, 4)).forEach(t => out.push({
      k: 'task', kind: t.overdue ? 'k-past' : 'k-closing', label: t.overdue ? 'Overdue task' : 'Task due today', title: C.note(t.task, [t.display], 'Task hidden'), sub: [t.display ? C.who(t.display) : '', esc(t.due || '')].filter(Boolean).join(' · '),
      acts: `<button type="button" class="cc-mini" onclick="doneTask(${q(t.task_id)}, ${q(t.person_id)}, ${JSON.stringify(String(t.task || '')).replace(/"/g, '&quot;')})">✓ Done</button>` }));
    d.leads.filter(l => (l.received || '').slice(0, 10) === today).forEach(l => out.push({
      k: 'lead', kind: 'k-showing', label: 'New lead today', title: C.who(l.name || 'Website lead'), sub: esc([(l.due || {}).label, l.source].filter(Boolean).join(' · ')),
      acts: `<button type="button" class="cc-mini" onclick="go('ccleads')">Open Leads</button>` }));
    (f.touches_due || []).filter(r => !r.owes_reply && r.band === 'hot').slice(0, 3).forEach(r => out.push({
      k: 'hot', kind: 'k-deadline', label: 'Hot, due a touch', title: C.pname(r), sub: r.next_action ? C.note(r.next_action, [r.display]) : esc(r.days_quiet != null ? r.days_quiet + ' days since the last touch' : ''),
      acts: `${typeof textBtn === 'function' ? textBtn(r.person_id, r) : ''}<button type="button" class="cc-mini" onclick="touched(${q(r.person_id)})">✓ Touched</button>` }));
    ((d.life || {}).upkeep || []).filter(u => u.days != null && u.days < 0).forEach((u, i) => out.push({
      k: 'upkeep', kind: 'k-listing', label: 'Home upkeep overdue', title: esc(u.name), sub: Math.abs(u.days) + ' days overdue',
      acts: `<button type="button" class="cc-mini" onclick="CC.lifeDone(${d.life.upkeep.indexOf(u)}, 'upkeep')">Done today</button>` }));
    return out;
  }

  C.todayCard = function () {
    const all = items(), shown = all.slice(0, LIMIT);
    const counts = {}; all.forEach(x => { counts[x.k] = (counts[x.k] || 0) + 1; });
    const body = shown.length ? `<ol class="cc-today">${shown.map(x => `<li class="cc-ev ${x.kind}"><span class="cc-chip">${C.esc(x.label)}</span>
        <span class="cc-what">${x.title || ''}<small>${x.sub || ''}</small></span><span class="cc-today-acts">${x.acts}</span></li>`).join('')}</ol>`
      : C.empty(S.data && !S.data.feed_ok ? "Tasks didn't load, and neither did touches or replies, so this list can't be trusted. Sources has the detail." : 'Nothing urgent right now. Nice.');
    return `<section class="cc-card cc-today-card" aria-labelledby="cc-today-h"><h2 id="cc-today-h">Today <span class="cc-count">${all.length}</span></h2>
      ${body}${all.length > LIMIT ? `<p class="cc-note">${all.length - LIMIT} more: see Touches due and Tasks.</p>` : ''}
      <div class="cc-acts"><button type="button" onclick="go('touches')">All touches due</button><button type="button" onclick="go('tasks')">All tasks</button></div>
      <footer>${C.src(['crm', 'deals', 'calendar', 'leads', 'life'])}</footer></section>`;
  };
})();
