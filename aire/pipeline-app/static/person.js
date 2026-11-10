/* The contact card: one person, their real facts, and a plan built only from that record.
   Opened by clicking a person on Home, People, Hot, Warm or the map (openPerson in app.js). It reads the CRM feed
   already in memory and nothing else, so there is no new backend. Its buttons open the sheets that
   already exist (openCompose, openGrok, openNote, touched): no new send path and no new call path starts here.
   A fact the sheet does not have is said to be missing. Nothing is guessed and nothing is written back. */
(function () {
  const C = window.CC;
  const key = s => String(s || '').trim().toLowerCase();
  const DEAD = new Set(['closed', 'lost', 'out']);
  const words = s => String(s || '').replace(/_/g, ' ');
  const dayK = v => String(v || '').slice(0, 10);
  const days = (a, b) => Math.round((new Date(a + 'T12:00:00Z') - new Date(b + 'T12:00:00Z')) / 864e5);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const P = window.Person = {};

  // Everything the feed says about one person, merged. A blank field never overwrites a filled one.
  P.get = function (id) {
    const f = feed(), same = r => String(r.person_id) === String(id), rec = {};
    const put = r => { if (r) for (const [k, v] of Object.entries(r)) if (v !== '' && v != null && !(Array.isArray(v) && !v.length)) rec[k] = v; };
    put(((f.map || {}).pins || []).find(p => p.kind === 'person' && same(p)));
    put((f.partners || []).find(same));
    const lead = (f.new_leads || []).find(same); put(lead);
    const due = (f.touches_due || []).find(same); put(due);
    put(heatList('hot').concat(heatList('warm')).find(same));
    if (!Object.keys(rec).length) return null;
    return Object.assign(rec, { person_id: String(id), new_lead: !!lead || key(rec.stage) === 'new lead', owes_reply: !!rec.owes_reply,
      deals: (f.deals || []).filter(d => same(d) && !DEAD.has(key(d.stage))), job: grokJob(String(id)) || null });
  };

  // Three plain sentences from the record: what to do now, why, and when the next touch is due.
  // The order is the brief's: a reply owed, a new lead, a live deal, a hot buying or selling reason, then the logged
  // next step or a check-in on their cadence.
  P.plan = function (p, today) {
    today = today || (C.data && C.data.today) || todayISO();
    const cad = feed().cadence_days || {}, band = key(p.band), every = cad[band];
    const last = (p.last_messages || []).slice(-1)[0], said = last ? C.cleanMsg(last) : '';
    const reasons = p.reasons || [], intent = reasons.find(r => /\b(buying|selling)\b/i.test(r)), deal = (p.deals || [])[0];
    // Touches due rows carry the last touch date. A map pin carries only how many days they have been quiet, so the
    // date is worked back from that. Only when both are missing does the plan say there is no last touch.
    const lastTouch = dayK(p.last_touch), quiet = lastTouch ? days(today, lastTouch) : p.days_quiet != null ? Number(p.days_quiet) : null;
    const lastK = lastTouch || (quiet != null ? C.addDaysK(today, -quiet) : '');
    const lower = s => s[0].toLowerCase() + s.slice(1);
    let now, why;
    if (p.owes_reply) {
      now = said ? `Answer their last message: “${said}”` : 'Answer their last message. Its text is not in the feed.';
      why = reasons.find(r => /waiting on your reply/i.test(r)) || (p.last_inbound ? `They texted last, on ${C.day(dayK(p.last_inbound))}, and you have not answered` : 'They texted last and you have not answered');
    } else if (p.new_lead) {
      now = 'Send the first reply.';
      why = p.source || p.received ? `New lead${p.source ? ' from ' + p.source : ''}${p.received ? ', came in ' + C.day(dayK(p.received)) : ''}` : 'New lead. No source or date is on the lead';
    } else if (deal) {
      now = deal.next_step ? `Work the deal at ${deal.address}: ${deal.next_step}` : deal.expected_close ? `Get ${deal.address} to its close on ${C.day(dayK(deal.expected_close))}.`
        : `Open the deal at ${deal.address}. No next step or close date is logged on it.`;
      why = `Live deal, ${words(deal.stage)}${deal.expected_close ? ', expected close ' + C.day(dayK(deal.expected_close)) : ''}`;
    } else if (key(p.temp) === 'hot' && intent) {
      now = `Reach out about it: ${lower(intent)}.`;
      why = intent;
    } else {
      now = p.next_action ? `Do your logged next step: ${p.next_action}` : 'Check in. No next step logged.';
      why = lastTouch ? `Last touch ${plural(quiet, 'day')} ago, on ${C.day(lastTouch)}` : quiet != null ? `Last touch ${plural(quiet, 'day')} ago` : 'No last touch on the sheet';
    }
    const rule = every ? `${band} cadence, every ${plural(every, 'day')}` : '';
    let when;
    if (p.owes_reply || p.new_lead) when = 'Now.' + (rule ? ` After that, ${rule}.` : ' No cadence is on the sheet for what comes after.');
    else if (!every) when = 'No cadence on the sheet, so there is no due date.';
    else if (!lastK) when = `Now. No last touch is on the sheet (${rule}).`;
    else { const dueK = C.addDaysK(lastK, every), d = days(dueK, today);
      when = d < 0 ? `It was due ${C.day(dueK)}, ${plural(-d, 'day')} ago (${rule}).` : d === 0 ? `Today (${rule}).` : `Due ${C.day(dueK)}, in ${plural(d, 'day')} (${rule}).`; }
    return { now, why: /[.!?”]$/.test(why) ? why : why + '.', when };
  };

  P.planHTML = function (p) {
    const pl = P.plan(p);
    return `<section class="pc-plan" aria-label="Plan"><h3>Plan for ${C.pname(p.display)}</h3>
      <ol><li><b>Now</b><span>${esc(pl.now)}</span></li><li><b>Why</b><span>${esc(pl.why)}</span></li><li><b>When</b><span>${esc(pl.when)}</span></li></ol></section>`;
  };

  // Text is the one primary button. Call shows only with a valid number. Every button opens a sheet that already exists.
  P.actsHTML = function (p) {
    const id = jsa(p.person_id), ph = normPhone(p.phone), em = validEmail(p.email);
    const off = (label, why) => `<button type="button" class="pc-off" disabled aria-disabled="true">${label}<small>${esc(why)}</small></button>`;
    return `<div class="pc-acts">${ph ? `<button type="button" class="pc-primary" onclick="openCompose(${id})">Text</button>`
        : em ? `<button type="button" class="pc-primary" onclick="openCompose(${id})">Email</button>` : off('Text', p.phone ? 'Not a valid US number' : 'No phone on the sheet')}
      ${ph ? `<button type="button" onclick="openGrok(${id}, 'call')" title="Grok places the call. Nothing dials until you tap the Call card in Grok.">Call</button>` : ''}
      <button type="button" onclick="openNote(${id})">Note</button><button type="button" onclick="touched(${id})">Log touch</button>
      <button type="button" onclick="openGrok(${id}, 'draft')" title="Opens the Grok panel. Grok writes a draft, it never sends.">Hard draft</button></div>`;
  };

  P.html = function (id) {
    const x = '<button type="button" class="x" onclick="closeDrawer()" aria-label="Close">×</button>';
    const p = P.get(id);
    if (!p) return `<section class="panel pcard"><div class="dh"><div class="who"><b>Not in the feed</b></div>${x}</div><div class="dbody"><p class="lt-quiet">This person is not in the CRM feed right now, so there is nothing true to show. Refresh, or find them in the CRM sheet.</p></div></section>`;
    const today = (C.data && C.data.today) || todayISO(), ph = normPhone(p.phone), lastTouch = dayK(p.last_touch), quiet = p.days_quiet != null ? Number(p.days_quiet) : null;
    const last = (p.last_messages || []).slice(-1)[0], place = [p.address, p.city, p.zip].filter(Boolean).join(', ');
    const fact = (k, v, missing) => `<dt>${k}</dt><dd${v ? '' : ' class="pc-missing"'}>${v || esc(missing)}</dd>`;
    const heat = p.heat != null ? `${esc(String(p.heat))} of 100, ${esc(p.temp || '')}${(p.reasons || []).length ? `<ul>${p.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}` : '';
    return `<section class="panel pcard" aria-label="Contact card"><div class="dh"><span class="ico">${esc(initials(String(p.display || '').trim()))}</span>
        <div class="who"><b>${C.pname(p.display)}</b><small>${Stage.chip(p.stage)}${Stage.cadence(key(p.band)) || '<span class="cad">no cadence set</span>'}</small></div>${x}</div>
      <div class="dbody">${P.planHTML(p)}${P.actsHTML(p)}
        <dl class="pc-facts">
          ${fact('Heat', heat, 'Not hot or warm right now, so the feed carries no score for them')}
          ${fact('Phone', ph ? esc(fmtPhone(ph)) : p.phone ? esc(p.phone) + ' (not a valid US number)' : '', 'No phone on the sheet')}
          ${fact('Email', p.email ? esc(p.email) : '', 'No email on the sheet')}
          ${fact('Place', esc(place), 'No address or city on the sheet')}
          ${fact('Last touch', lastTouch ? `${esc(C.day(lastTouch))}, ${plural(days(today, lastTouch), 'day')} ago` : quiet != null ? `${plural(quiet, 'day')} ago` : '', 'No last touch on the sheet')}
          ${fact('Next step', p.next_action ? esc(p.next_action) : '', 'No next step logged')}
          ${fact('Reply', p.owes_reply ? 'You owe them a reply' : 'You do not owe them a reply', '')}
          ${fact('Last message', last ? '“' + esc(C.cleanMsg(last)) + '”' : '', 'No message from them in the feed')}
          ${fact('Grok', p.job ? esc(grokText(p.job)) : '', 'No Grok call or draft for them')}
        </dl></div></section>`;
  };

  P.open = function (id) {
    S.compose = null; S.card = String(id);
    const d = $('#drawer'); d.hidden = false; P.shown = P.html(id); d.innerHTML = P.shown;
    const b = d.querySelector && d.querySelector('.pc-primary'); if (b && b.focus) b.focus();
  };
  // After a note, a logged touch or a refresh, the open card shows the new facts.
  P.refresh = function () { const d = $('#drawer'); if (!S.card || S.compose || !d || d.hidden) return; const h = P.html(S.card); if (h !== P.shown) { P.shown = h; d.innerHTML = h; } };
})();
