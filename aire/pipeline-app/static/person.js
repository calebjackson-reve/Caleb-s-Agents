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

  // This person's deals from the one deal record (links.records, the AIRE Deals sheet): every record they are tied to,
  // then any CRM Deals tab row of theirs the sheet does not have. The same rule as links.person_deals. The card never
  // reads a close date, price, side or status from the CRM tab when the sheet has the deal.
  const CRM_WORD = { contract: 'under_contract', closed: 'closed', out: 'lost', appointment: 'active', offer: 'offer', other: 'active' };
  P.deals = function (id, f) {
    const recs = C.dealRecords(), have = new Set(recs.map(r => r.key)), rows = (f || feed()).deals || [];
    // The CRM row on the same street keeps its own address, last event and link. The four record fields replace its own.
    const crmRow = r => rows.find(d => C.dealKey(d.address) === r.key && String(d.person_id) === id) || rows.find(d => C.dealKey(d.address) === r.key) || {};
    const mine = recs.filter(r => (r.people || []).some(p => String(p.person_id) === id) && !['closed', 'out'].includes(r.stage))
      .map(r => ({ ...crmRow(r), address: crmRow(r).address || r.deal, person_id: id, side: r.side, stage: CRM_WORD[r.stage] || r.stage, status: r.status, price: r.price, expected_close: r.close || '',
        next_step: r.next || crmRow(r).next_step || '', expired_offer: !!r.expired_offer, open: !!r.open, record: 'AIRE Deals sheet' }));
    const crm = rows.filter(d => String(d.person_id) === id && !have.has(C.dealKey(d.address)) && !DEAD.has(key(d.stage)))
      .map(d => ({ ...d, open: true, expired_offer: false, record: 'CRM Deals tab' }));
    return mine.concat(crm).sort((a, b) => (a.open ? 0 : 1) - (b.open ? 0 : 1) || String(a.expected_close || '9').localeCompare(String(b.expected_close || '9')));
  };

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
      deals: P.deals(String(id), f), job: grokJob(String(id)) || null });
  };

  // Three plain sentences from the record: what to do now, why, and when the next touch is due.
  // The order is the brief's: a reply owed, a new lead, a live deal, a hot buying or selling reason, then the logged
  // next step or a check-in on their cadence.
  // Last touch: the latest of the sheet date, the last 1:1 message, the last email and the last close. The computed value comes
  // with the record card (Reach.cards, insight.last_touch). Until it arrives, the latest of the dates already on p. Dates after today are ignored.
  P.touch = function (p, today) {
    today = today || (C.data && C.data.today) || todayISO();
    const c = (typeof Reach !== 'undefined' && Reach.cards && Reach.cards[String(p.person_id)]) || null, lt = c && c.ok && c.last_touch;
    if (lt && dayK(lt.day) && dayK(lt.day) <= today) return { day: dayK(lt.day), from: lt.from || '' };
    let best = null;
    [['CRM sheet', p.last_touch], ['iMessage', p.last_inbound], ['iMessage', p.last_outbound]].forEach(([from, v]) => { const d = dayK(v); if (d && d <= today && (!best || d > best.day)) best = { day: d, from }; });
    return best;
  };

  P.plan = function (p, today) {
    today = today || (C.data && C.data.today) || todayISO();
    const cad = feed().cadence_days || {}, band = key(p.band), every = cad[band];
    const last = (p.last_messages || []).slice(-1)[0], said = last ? C.cleanMsg(last) : '';
    const reasons = p.reasons || [], intent = reasons.find(r => /\b(buying|selling)\b/i.test(r)), deal = (p.deals || []).find(d => d.open !== false), lapsed = (p.deals || []).find(d => d.expired_offer);
    // Touches due rows carry the last touch date. A map pin carries only how many days they have been quiet, so the
    // date is worked back from that. Only when both are missing does the plan say there is no last touch.
    const lastTouch = (P.touch(p, today) || {}).day, quiet = lastTouch ? days(today, lastTouch) : p.days_quiet != null ? Number(p.days_quiet) : null;
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
      const offer = key(deal.stage) === 'offer', close = deal.expected_close ? C.day(dayK(deal.expected_close)) : '';
      now = deal.next_step ? `Work the deal at ${deal.address}: ${deal.next_step}` : close && !offer ? `Get ${deal.address} to its close on ${close}.`
        : `Open the deal at ${deal.address}. No next step or close date is logged on it.`;
      why = `Live deal, ${words(deal.status || deal.stage).toLowerCase()}${close ? (offer ? ', act of sale if accepted ' : ', expected close ') + close : ''}`;
    } else if (lapsed) {
      now = `Confirm the offer at ${lapsed.address}: mark it expired on the Deals sheet, or write the new deadline in its note.`;
      why = `The offer at ${lapsed.address} is past its deadline, so it is not a live deal`;
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
    const today = (C.data && C.data.today) || todayISO(), ph = normPhone(p.phone), touch = P.touch(p, today), lastTouch = touch && touch.day, quiet = p.days_quiet != null ? Number(p.days_quiet) : null;
    const last = (p.last_messages || []).slice(-1)[0], place = [p.address, p.city, p.zip].filter(Boolean).join(', ');
    const fact = (k, v, missing) => `<dt>${k}</dt><dd${v ? '' : ' class="pc-missing"'}>${v || esc(missing)}</dd>`;
    const heat = p.heat != null ? `${esc(String(p.heat))} of 100, ${esc(p.temp || '')}${(p.reasons || []).length ? `<ul>${p.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}` : '';
    return `<section class="panel pcard" aria-label="Contact card"><div class="dh"><span class="ico">${esc(initials(String(p.display || '').trim()))}</span>
        <div class="who"><b>${C.pname(p.display)}</b><small>${Stage.chip(p.stage)}${Stage.cadence(key(p.band)) || '<span class="cad">no cadence set</span>'}</small></div>${x}</div>
      <div class="dbody">${P.planHTML(p)}${P.actsHTML(p)}${P.moreHTML(id)}
        <dl class="pc-facts">
          ${fact('Heat', heat, 'Not hot or warm right now, so the feed carries no score for them')}
          ${fact('Phone', ph ? esc(fmtPhone(ph)) : p.phone ? esc(p.phone) + ' (not a valid US number)' : '', 'No phone on the sheet')}
          ${fact('Email', p.email ? esc(p.email) : '', 'No email on the sheet')}
          ${fact('Place', esc(place), 'No address or city on the sheet')}
          ${fact('Last touch', lastTouch ? `${esc(C.day(lastTouch))}, ${plural(days(today, lastTouch), 'day')} ago${touch.from ? ', ' + esc(touch.from) : ''}` : quiet != null ? `${plural(quiet, 'day')} ago` : '', 'No last touch on the sheet')}
          ${fact('Next step', p.next_action ? esc(p.next_action) : '', 'No next step logged')}
          ${fact('Reply', p.owes_reply ? 'You owe them a reply' : 'You do not owe them a reply', '')}
          ${fact('Last message', last ? '“' + esc(C.cleanMsg(last)) + '”' : '', 'No message from them in the feed')}
          ${fact('Grok', p.job ? esc(grokText(p.job)) : '', 'No Grok call or draft for them')}
        </dl></div></section>`;
  };

  // The rest of the record, read for this one person by Reach.card (reach.js, a read and nothing else): home value, equity, years owned, lead source, last
  // deal and household, each with where it came from, how many of the eight are known, and the likely-seller score with
  // its two biggest reasons. A fact with no source prints as unknown with the reason. Never a guessed number.
  P.moreHTML = function (id) {
    const x = Reach.cards[String(id)], wrap = h => `<section class="pc-rec" aria-label="Record">${h}</section>`;
    if (!x) return wrap('<p class="lt-quiet">Reading the rest of the record.</p>');
    if (!x.ok) return wrap(`<p class="lt-quiet">${esc(x.error && x.error !== 'offline' ? x.error : 'The rest of the record did not load. Close the card and open it again.')}</p>`);
    const s = x.seller;
    const sell = s ? `<div class="pc-seller"><b class="pc-score">${Number(s.score)}</b><div><span>Likely-seller score, of 100</span>${s.reasons.length ? `<ul>${s.reasons.map((r, i) => `<li>${esc(r)}${(s.sources || [])[i] ? `<small>from the ${esc(s.sources[i])}</small>` : ''}</li>`).join('')}</ul>` : '<small>Nothing on record points to a sale yet.</small>'}${Fix.fbHTML('seller', id)}</div></div>`
      : `<div class="pc-seller none"><b class="pc-score">unknown</b><div><span>Likely-seller score</span><small>${x.homeowner ? 'Agents, lenders and vendors are not scored.' : 'No street address on the sheet, so there is no homeowner to score.'}</small></div></div>`;
    return wrap(`<div class="pc-meter" role="img" aria-label="${x.known} of ${x.total} known"><b>${x.known} of ${x.total} known</b><span class="pc-bar">${x.facts.map(f => `<i class="${f.value ? 'on' : ''}" title="${esc(f.label)}: ${f.value ? 'known' : 'unknown'}"></i>`).join('')}</span></div>
      ${sell}<dl class="pc-facts">${x.facts.filter(f => f.key !== 'phone' && f.key !== 'email').map(f => `<dt>${esc(f.label)}</dt><dd${f.value ? '' : ' class="pc-missing"'}>${f.value ? esc(f.value) : 'unknown'}<small>${esc(f.value ? f.from : f.why)}</small></dd>`).join('')}</dl>`);
  };
  P.open = function (id) {
    S.compose = null; S.card = String(id); Reach.card(id);
    const d = $('#drawer'); d.hidden = false; P.shown = P.html(id); d.innerHTML = P.shown;
    const b = d.querySelector && d.querySelector('.pc-primary'); if (b && b.focus) b.focus();
  };
  // After a note, a logged touch or a refresh, the open card shows the new facts.
  P.refresh = function () { const d = $('#drawer'); if (!S.card || S.compose || !d || d.hidden) return; const h = P.html(S.card); if (h !== P.shown) { P.shown = h; d.innerHTML = h; } };
})();
