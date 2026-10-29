/* Pipeline voice loop. Runs in the browser, nothing leaves the Mac but what Chrome's own speech service sends.
   Wake word, then a command, then Pipeline answers out loud. No LLM in the loop: intents are plain word matching
   on the feed, so it never invents a number. Chrome's speech recognition does the listening (Safari has none),
   speechSynthesis does the talking. In a sandbox with no microphone the same commands can be typed. */
'use strict';
const Voice = (() => {
  const WAKE = /\b(hey|ok|okay)[ ,]+(pipeline|pipe ?line|jarvis)\b/i;
  const REC = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, on = false, awake = false, awakeTimer = 0, state = 'idle', voice = null, log = [];
  const listeners = [];
  const emit = () => listeners.forEach(f => f({ state, on, awake, supported: !!REC }));

  function setState(s) { state = s; if (window.Core) Core.setState(s); emit(); }
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /en-GB/i.test(v.lang) && /Daniel|Google UK English Male|Arthur/i.test(v.name)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || vs[0] || null;
  }
  let audioEl = null;
  function say(text, done) {
    const st = appState(), tts = (st && st.data && st.data.voice && st.data.voice.tts) || 'browser';
    if (tts === 'elevenlabs') return sayEleven(text, done);
    sayBrowser(text, done);
  }
  function sayEleven(text, done) {
    transcript('pipeline', text);
    setState('speaking');
    if (audioEl) { try { audioEl.pause(); } catch (e) { } }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      .then(r => { if (!r.ok || !(r.headers.get('content-type') || '').startsWith('audio/')) return r.json().then(j => { throw new Error(j.error || 'no audio'); }); return r.blob(); })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        audioEl = new Audio(url);
        audioEl.onended = () => { URL.revokeObjectURL(url); setState(on && awake ? 'listening' : 'idle'); done && done(); };
        audioEl.onerror = () => { URL.revokeObjectURL(url); setState('idle'); done && done(); };
        return audioEl.play();
      })
      .catch(err => { transcript('pipeline', '(ElevenLabs: ' + (err && err.message || 'failed') + ', using the browser voice)'); sayBrowser(text, done, true); });
  }
  function sayBrowser(text, done, silentLog) {
    if (!('speechSynthesis' in window)) { if (!silentLog) transcript('pipeline', text); done && done(); return; }
    speechSynthesis.cancel();
    if (!voice) pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = 1.02; u.pitch = 0.95;
    u.onstart = () => setState('speaking');
    u.onend = () => { setState(on && awake ? 'listening' : 'idle'); done && done(); };
    u.onerror = () => { setState('idle'); done && done(); };
    if (!silentLog) transcript('pipeline', text);
    speechSynthesis.speak(u);
  }
  function transcript(who, text) { log.push({ at: new Date(), who, text }); if (log.length > 40) log.shift(); if (window.onVoiceLine) window.onVoiceLine(who, text); }

  // ---- intents, all answered from the feed so nothing is made up. Order matters: the first rule that fits wins.
  // Anything that would write or send only opens the box for Caleb to press Save or Send himself.
  const appState = () => (typeof S !== 'undefined' ? S : null);   // S is the app's top-level const, not a window property
  const first = n => (n || '').split(/\s+/)[0];
  const who = r => (r.display || r.name || '').trim() || (r.phone ? 'the number ending ' + String(r.phone).replace(/\D/g, '').slice(-4) : 'someone with no name on file');
  const plural = (n, word, many) => `${n} ${n === 1 ? word : (many || word + 's')}`;
  function names(rows, k = 3) { const r = rows.slice(0, k).map(who); return r.length <= 1 ? r.join('') : r.slice(0, -1).join(', ') + ' and ' + r.slice(-1); }
  const lastText = r => ((r.last_messages || []).slice(-1)[0] || '').replace(/^\d{4}-\d{2}-\d{2}: /, '');
  // Spoken text: no emoji, no line breaks, cut at a word.
  const speakable = t => (t || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();
  const clip = (t, n = 160) => { t = speakable(t); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; };
  const isoIn = days => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  // Words that are never part of a person's name in a command, so "will", "hope" or "call" do not find a contact.
  const NOT_NAMES = new Set('the and for with what when who whos how did does last talk talked text texted call called say said about tell me my any new show open going on next step send log remind tomorrow today week hot warm cold deal deals lead leads task tasks map market farm draft drafts reply replies owe due quiet longest first please can you will hope just there their that this they them have has from into your our out not now get got give status help brief update people person crm many much still left'.split(' '));
  function people() {
    const f = feed(), seen = new Set(), out = [];
    (f.touches_due || []).concat(f.new_leads || [], f.partners || [], ((f.map || {}).pins || []).filter(p => p.kind === 'person'))
      .forEach(r => { if (r.person_id && !seen.has(r.person_id)) { seen.add(r.person_id); out.push(r); } });
    return out;
  }
  // The contact whose name best fits the words said. A full name beats a first name; on a tie the one who owes a
  // reply, then the one highest on the touches list, wins, and the answer says the full name so Caleb hears who.
  function findPerson(q) {
    const words = new Set(q.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !NOT_NAMES.has(w)));
    if (!words.size) return null;
    let best = null, bestScore = 0; const hits = {};
    people().forEach((r, i) => {
      const parts = (r.display || '').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      const n = parts.filter(w => words.has(w)).length, score = n * 10 - i / 10000 + (r.owes_reply ? 1 : 0);
      if (n) hits[n] = (hits[n] || 0) + 1;
      if (score >= 9 && score > bestScore) { best = r; bestScore = score; }
    });
    // How many other people matched as well as the one picked: "Greg" alone can be four people.
    if (best) best = { ...best, _others: (hits[Math.round(bestScore / 10)] || 1) - 1 };
    return best;
  }
  function findDeal(q) {
    const words = q.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !NOT_NAMES.has(w));
    let best = null, bestScore = 0;
    (feed().deals || []).forEach(d => { const a = (d.address || '').toLowerCase(); const sc = words.filter(w => new RegExp('\\b' + w + '\\b').test(a)).length; if (sc > bestScore) { best = d; bestScore = sc; } });
    return best;
  }
  const shortAddr = a => (a || '').split(',')[0];
  const alsoMatched = r => r && r._others ? ` ${plural(r._others, 'other person matches', 'other people match')} that name, so say the last name if that is the wrong one.` : '';
  const VIEWS = [[/\bmap\b/, 'map', 'The map.'], [/\bmarket|monitor|permits?\b/, 'market', 'Market Monitor.'], [/\bdeals?\b/, 'deals', 'Deals.'],
    [/\btasks?\b|\bto.?dos?\b/, 'tasks', 'Tasks.'], [/\bleads?\b/, 'leads', 'New leads.'], [/\bdrafts?\b|\bqueue\b/, 'queue', 'Drafts.'],
    [/\btouch(es)?\b|\bdue\b/, 'touches', 'Touches due.'], [/\bsent\b/, 'sent', 'Sent today.'], [/\bhome\b|\bcommand cent(er|re)\b|\bdashboard\b|\boverview\b/, 'cc', 'Command center.']];

  function handle(text) {
    const st = appState(), f = feed() || {}, c = f.counts || {}, q = text.toLowerCase().replace(/[’]/g, "'").trim();
    const owes = (f.touches_due || []).filter(r => r.owes_reply), over = (f.tasks || []).filter(t => t.overdue);
    if (/^(ask|question|hey claude|claude)[ ,:]/i.test(q)) return askClaude(text.replace(/^(ask|question|hey claude|claude)[ ,:]+/i, ''));
    if (/^(stop|quiet|cancel|never ?mind|hush|shut up|that'?s enough|enough)\b/.test(q)) { if ('speechSynthesis' in window) speechSynthesis.cancel(); if (audioEl) { try { audioEl.pause(); } catch (e) { } } setState(on ? 'listening' : 'idle'); return; }
    if (/^(thanks|thank you|cheers|perfect|got it|great|awesome)\b/.test(q)) return say('Anytime.');
    setState('thinking');

    // ---- things that would write or send: open the box, Caleb presses Save or Send
    let m;
    if ((m = /\b(?:send|text|message|email|write|reply to|answer)\b(?: an?)?(?: (?:text|email|message))?(?: to)? (.+)/.exec(q)) && findPerson(m[1])) {
      const r = findPerson(m[1]); openCompose(r.person_id); return say(`${who(r)}'s compose box is open. Read it and press send.${alsoMatched(r)}`);
    }
    if ((m = /^(?:call|phone|dial|ring) (.+)/.exec(q)) && findPerson(m[1])) {
      const r = findPerson(m[1]), d = String(r.phone || '').replace(/\D/g, '').slice(-10);
      if (!d) return say(`No phone on file for ${who(r)}.`);
      openCompose(r.person_id); return say(`${who(r)}: ${d.slice(0, 3)}, ${d.slice(3, 6)}, ${d.slice(6).split('').join(' ')}. Their card is open to log it after.${alsoMatched(r)}`);
    }
    if (/\b(log|logged|mark)\b/.test(q) && /\b(call(ed)?|text(ed)?|touch(ed)?|talk(ed)?|met|meeting|spoke)\b/.test(q) && findPerson(q.replace(/\b(log|logged|mark|as|a|call(ed)?|text(ed)?|touch(ed)?|talk(ed)?|met|meeting|spoke|with|to)\b/g, ' '))) {
      const r = findPerson(q.replace(/\b(log|logged|mark|as|a|call(ed)?|text(ed)?|touch(ed)?|talk(ed)?|met|meeting|spoke|with|to)\b/g, ' ')); touched(r.person_id); return say(`Logging a touch for ${who(r)}. Say what happened in the box and save it.${alsoMatched(r)}`);
    }
    if ((m = /\bremind me to (.+)/.exec(q))) {
      const r = findPerson(m[1]); const due = /\btomorrow\b/.test(q) ? isoIn(1) : /\bnext week\b/.test(q) ? isoIn(7) : isoIn(0);
      const task = m[1].replace(/\b(tomorrow|today|next week)\b/g, '').trim().replace(/^./, x => x.toUpperCase());
      openTask(r ? r.person_id : ''); setTimeout(() => { const t = document.getElementById('m-task'), d = document.getElementById('m-due'); if (t) t.value = task; if (d) d.value = due; }, 0);
      return say(`Task ready${r ? ' for ' + who(r) : ''}, due ${due === isoIn(1) ? 'tomorrow' : due === isoIn(0) ? 'today' : 'next week'}. Press add task to save it.`);
    }

    // ---- going somewhere
    if (/\b(open|show|go to|pull up|take me to|switch to|bring up)\b/.test(q)) { const v = VIEWS.find(([re]) => re.test(q)); if (v) { go(v[1]); return say(v[2]); } }

    // ---- a person or a deal by name
    const deal = findDeal(q);
    if (deal && /\b(next step|going on|status|update on|where are we|how'?s|what about|tell me|about|closing|close|when)\b/.test(q)) {
      go('deals'); return say(`${shortAddr(deal.address)} is ${deal.stage.replace('_', ' ')}${deal.side ? ', ' + deal.side + ' side' : ''}. ${deal.next_step ? 'Next step: ' + deal.next_step + '.' : 'No next step written down.'}${deal.expected_close ? ' Expected close ' + deal.expected_close + '.' : ''}${deal.last_event ? ' Last event: ' + deal.last_event + '.' : ''}`);
    }
    const person = /\b(say|said|text|texted|talk|talked|last|about|going on|how'?s|how is|how are|who is|what'?s up with|tell me|check on)\b/.test(q) ? findPerson(q) : null;
    if (person) {
      const msg = lastText(person);
      return say(`${who(person)}${person.band ? ', ' + person.band : ''}. ${person.days_quiet == null ? 'No touch logged yet.' : person.days_quiet === 0 ? 'Last touch today.' : 'Last touch ' + plural(person.days_quiet, 'day') + ' ago.'}${person.owes_reply ? ' They texted last and are waiting on you.' : ''}${msg ? ' Their last text: ' + clip(msg) : ''}${person.next_action ? ' Your note: ' + person.next_action + '.' : ''}${alsoMatched(person)}`);
    }

    // ---- topics
    if (/\b(brief|briefing|morning|rundown|summary|how'?s (my|the) day|day looking|update me|give me an update|catch me up|what'?s new)\b/.test(q)) {
      go('cc');
      const parts = [`Good ${hourWord()}, Caleb.`];
      parts.push(owes.length ? `${plural(owes.length, 'person owes', 'people owe')} a reply. Start with ${names(owes)}.` : 'Nobody is waiting on a reply.');
      parts.push(over.length ? `${plural(over.length, 'task is', 'tasks are')} overdue, starting with ${over[0].task}.` : 'Nothing is overdue.');
      parts.push(`${plural((f.new_leads || []).length, 'new lead')} in the last two weeks, ${plural(c.deals_live || 0, 'live deal')}, ${plural(drafts().length, 'draft')} ready.`);
      parts.push(owes.length ? 'Say compose to start with the first reply.' : 'Say compose to start on the drafts.');
      return say(parts.join(' '));
    }
    if (/\b(who texted|replies|reply|owe|waiting on me)\b/.test(q)) { go('touches'); return say(owes.length ? `${plural(owes.length, 'person is', 'people are')} waiting on you. ${names(owes, 4)}. ${first(who(owes[0]))} said: ${clip(lastText(owes[0]) || 'no text on file')}` : 'Nobody is waiting on a reply.'); }
    if (/\b(sent|did i send|have i sent)\b/.test(q) || /\b(how many|left|still)\b.*\b(texts?|emails?)\b/.test(q)) {
      const k = st.data.caps; return say(`${k.sent_texts} of ${k.texts} texts and ${k.sent_emails} of ${k.emails} emails sent today. ${k.texts - k.sent_texts} texts and ${k.emails - k.sent_emails} emails left.`);
    }
    if (/\b(call first|who should i (call|text|reach)|start with|top of (my|the) list|who'?s (first|next)|what'?s next|next up)\b/.test(q)) {
      go('touches'); const t = f.touches_due || []; if (!t.length) return say('Nobody is due.');
      const r = t[0]; return say(`${who(r)}. ${r.owes_reply ? 'They texted last' + (lastText(r) ? ': ' + clip(lastText(r), 110) : '.') : r.next_action ? 'Your note: ' + r.next_action + '.' : (r.band || 'no band') + ', ' + (r.days_quiet == null ? 'never logged.' : r.days_quiet + ' days quiet.')}`);
    }
    if (/\b(read|play)\b.*\b(draft|first one)\b/.test(q)) {
      const d = drafts(); if (!d.length) return say('The queue is clear.'); composeNext();
      return say(d[0].reply ? `${d[0].name} texted last, so there is no draft. They said: ${clip((d[0].last_messages || []).slice(-1)[0]?.replace(/^\d{4}-\d{2}-\d{2}: /, '') || 'nothing on file')}` : `Draft for ${d[0].name}: ${clip(d[0].body || d[0].subject || '', 220)}`);
    }
    if (/\b(compose|drafts?|write one)\b/.test(q) || /^(next|send)$/.test(q)) { const d = drafts(); if (!d.length) return say('The queue is clear.'); composeNext(); return say(`${d[0].reply ? 'Reply to' : 'Draft for'} ${d[0].name}. ${d[0].reply ? 'They texted last, so write it yourself.' : 'The draft is ready, read it and send.'}`); }
    if (/\b(close|closes|closing|closings)\b/.test(q) && /\b(next|soon|when|first|upcoming|this (week|month))\b/.test(q)) {
      go('deals'); const d = (f.deals || []).filter(x => x.expected_close).sort((a, b) => a.expected_close.localeCompare(b.expected_close));
      return say(d.length ? `${shortAddr(d[0].address)} closes ${d[0].expected_close}${d[1] ? `, then ${shortAddr(d[1].address)} on ${d[1].expected_close}` : ''}.${(f.deals || []).length > d.length ? ` ${plural((f.deals || []).length - d.length, 'deal has', 'deals have')} no close date.` : ''}` : 'No live deal has a close date.');
    }
    const STAGE_WORDS = [['under contract', 'under_contract'], ['active', 'active'], ['showing', 'showing'], ['consult', 'consult'], ['lead', 'lead']];
    const stageAsked = /\b(how many|which|what)\b/.test(q) && /\bdeals?\b|\bunder contract\b/.test(q) ? STAGE_WORDS.find(([w]) => q.includes(w)) : null;
    if (stageAsked) { go('deals'); const d = (f.deals || []).filter(x => x.stage === stageAsked[1]); return say(`${plural(d.length, 'deal')} ${stageAsked[0]}${d.length ? ': ' + d.map(x => shortAddr(x.address)).join(', ') : ''}.`); }
    if (/\b(deals?|contracts?|closings?|pipeline status|under contract)\b/.test(q)) { go('deals'); const d = f.deals || []; return say(d.length ? `${plural(d.length, 'live deal')}. ` + d.slice(0, 4).map(x => `${shortAddr(x.address)}, ${x.stage.replace('_', ' ')}${x.next_step ? ', next ' + x.next_step : ''}`).join('. ') + '.' : 'No live deals.'); }
    if (/\b(tasks?|to.?dos?|overdue)\b/.test(q)) { go('tasks'); const t = (f.tasks || []).slice().sort((a, b) => (b.overdue - a.overdue) || (a.due || '9').localeCompare(b.due || '9')); return say(t.length ? `${plural(t.length, 'open task')}, ${over.length} overdue. First up: ${t[0].task}${t[0].display ? ' for ' + t[0].display : ''}.` : 'No open tasks.'); }
    if (/\b(hot|warm)\b/.test(q) && /\b(how many|who|people|leads?|list)\b/.test(q)) {
      const band = /\bwarm\b/.test(q) ? 'warm' : 'hot', n = (c.by_band || {})[band] || 0, rows = (f.touches_due || []).filter(r => r.band === band);
      go('touches'); return say(`${plural(n, band + ' contact')}. ${rows.length ? `Due now: ${names(rows, 4)}.` : 'None of them are due.'}`);
    }
    if (/\b(leads?|new people|sign.?ups?)\b/.test(q)) { go('leads'); const l = f.new_leads || []; return say(l.length ? `${plural(l.length, 'new lead')}: ${names(l, 4)}. ${who(l[0])} came in from ${l[0].source}.` : 'No new leads in the last two weeks.'); }
    if (/\b(listings?|permits?|market|farms?|new builds?|roofs?)\b/.test(q)) {
      go('market'); const rows = typeof marketRows === 'function' ? marketRows() : ((f.market || {}).rows || []), wk = isoIn(-7);
      const recent = rows.filter(r => (r.date || '') >= wk), permits = recent.filter(r => r.type === 'permit'), nl = recent.filter(r => r.type === 'new_listing'), ch = recent.filter(r => r.type === 'listing_change');
      const labels = {}; permits.forEach(r => { labels[r.label] = (labels[r.label] || 0) + 1; });
      const top = Object.entries(labels).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l, n]) => `${n} ${l}`).join(', ');
      const farms = typeof farmsList === 'function' ? farmsList() : [];
      const LABELS = [['roof', 'roof'], ['new build', 'new build'], ['pool', 'pool'], ['teardown', 'teardown'], ['demolition', 'teardown'], ['remodel', 'remodel'], ['moved in', 'moved in'], ['move in', 'moved in'], ['occupancy', 'moved in'], ['outbuilding', 'outbuilding']];
      const lab = LABELS.find(([w]) => q.includes(w));
      if (lab) { const rows2 = permits.filter(r => r.label === lab[1]).sort((a, b) => (b.value || 0) - (a.value || 0)); return say(`${plural(rows2.length, lab[1] + ' permit')} this week in East Baton Rouge${rows2.length ? `. Biggest: ${rows2.slice(0, 2).map(r => shortAddr(r.address) + (r.value ? ', ' + money(r.value) : '')).join(', and ')}` : ''}. Source: city permit data.`); }
      if (/\b(new )?listings?\b/.test(q) && !/permit/.test(q)) return say(`${/\bfarms?\b/.test(q) && !farms.length ? "You haven't drawn a farm yet, so this is every area. " : ''}${plural(nl.length, 'new listing')} and ${plural(ch.length, 'listing change')} from your Flexmls farm alerts this week.`);
      return say(`${/\bfarms?\b/.test(q) && !farms.length ? "You haven't drawn a farm yet, so this is every area. " : ''}This week: ${plural(nl.length, 'new listing')}, ${plural(ch.length, 'listing change')}, and ${plural(permits.length, 'East Baton Rouge permit')}${top ? ', mostly ' + top : ''}.`);
    }
    if (/\bmap\b/.test(q)) { go('map'); const mc = (f.map || {}).counts || {}; return say(`${(mc.persons || 0).toLocaleString()} people and ${plural(mc.deals || 0, 'deal')} on the map${mc.ungeocoded_contacts ? `, ${mc.ungeocoded_contacts} still need an address fixed` : ''}.`); }
    if (/\b(how many|how big|size of)\b.*\b(people|contacts|crm|database)\b/.test(q)) return say(`${(c.contacts || 0).toLocaleString()} people in the CRM. ${(c.by_band || {}).hot || 0} hot, ${(c.by_band || {}).warm || 0} warm, ${(((c.by_band || {}).cold || 0) + ((c.by_band || {})['ice-cold'] || 0)).toLocaleString()} cold or colder.`);
    if (/\b(gone quiet|quiet(est)?|longest|haven'?t talked|neglect)/.test(q)) {
      go('touches'); const r = (f.touches_due || []).filter(x => (x.band === 'hot' || x.band === 'warm') && x.days_quiet != null).sort((a, b) => b.days_quiet - a.days_quiet)[0];
      return say(r ? `Among hot and warm, ${who(r)} has gone the longest, ${plural(r.days_quiet, 'day')}.` : 'Every hot and warm contact has a recent touch.');
    }
    if (/\b(touch(es)?|due|who'?s due|call list)\b/.test(q)) { go('touches'); const t = f.touches_due || []; return say(t.length ? `${(c.touches_due || t.length).toLocaleString()} touches due. Top of the list: ${names(t)}.` : 'No touches due.'); }
    if (/\b(refresh|reload|rebuild|re-?sync|ingest)\b/.test(q)) { refresh(); return say('Rebuilding the feed.'); }
    if (/\b(status|problems?|anything wrong|health|systems?|fresh|stale|sender|dry run|live mode)\b/.test(q)) { const p = problems(); return say(p.length ? `${plural(p.length, 'thing needs', 'things need')} attention. ${p.map(x => x.text).join(' ')}` : 'All systems are fine. ' + (st.data.feed_age_minutes == null ? '' : `Feed is ${st.data.feed_age_minutes} minutes old. `) + 'Sender is ' + (st.data.sender === 'live' ? 'live' : 'in dry run, nothing leaves the Mac') + '.'); }
    if (/\b(help|what can you do|commands)\b/.test(q)) return say('Try: brief, who texted me, who should I call first, tasks, deals, which deal closes next, new leads, permits this week, the map, how many hot, what did a name say, remind me to call someone tomorrow, or open any page.' + (askOn() ? ' Anything else, I ask Claude.' : ''));
    if (/\b(home|command cent(er|re)|dashboard|overview)\b/.test(q)) { go('cc'); return say('Command center.'); }
    return askClaude(text);
  }
  function askOn() { const st = appState(); return !!(st && st.data && st.data.voice && st.data.voice.ask); }
  function askClaude(question) {
    if (!askOn()) return say("I didn't catch that. Say help to hear what I know.");
    setState('thinking');
    if (window.Core) Core.burst();
    return fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) })
      .then(r => r.json())
      .then(r => { if (!r.ok) return say(r.error || 'Claude did not answer.'); say(r.result.answer); })
      .catch(() => say('Claude did not answer.'));
  }
  function hourWord() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; }

  // ---- recognition
  function start() {
    if (!REC) { emit(); return false; }
    if (rec) return true;
    rec = new REC(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    rec.onresult = e => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) final += r[0].transcript + ' '; else interim += r[0].transcript; }
      if (window.onVoiceInterim) window.onVoiceInterim((final || interim).trim());
      const heard = (final || '').trim();
      if (!heard) return;
      transcript('you', heard);
      const m = WAKE.exec(heard);
      if (m) { awake = true; clearTimeout(awakeTimer); setState('listening'); const rest = heard.slice(m.index + m[0].length).trim(); if (rest.length > 2) handle(rest); else say('Yes?'); armSleep(); return; }
      if (awake) { handle(heard); armSleep(); }
    };
    rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { on = false; rec = null; setState('idle'); transcript('pipeline', 'Microphone not allowed here. Type a command instead.'); } };
    rec.onend = () => { if (on) { try { rec.start(); } catch (e) { } } };
    try { rec.start(); on = true; setState('idle'); emit(); return true; } catch (e) { rec = null; on = false; emit(); return false; }
  }
  function armSleep() { clearTimeout(awakeTimer); awakeTimer = setTimeout(() => { awake = false; if (state !== 'speaking') setState('idle'); emit(); }, 25000); }
  function stop() { on = false; awake = false; if (rec) { try { rec.onend = null; rec.stop(); } catch (e) { } rec = null; } speechSynthesis.cancel(); setState('idle'); }
  // ---- calls: ElevenLabs Speech Engine does the listening and talking over WebRTC, speech_engine.py answers with Claude.
  // The browser SDK is loaded only when a call starts, from a pinned CDN build, so the app stays offline otherwise.
  const CLIENT_SDK = 'https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.30.0/dist/lib.iife.js';
  let call = null, callState = 'off';
  function callOn() { const st = appState(); return !!(st && st.data && st.data.voice && st.data.voice.speech_engine); }
  function loadClientSdk() {
    if (window.ElevenLabsClient) return Promise.resolve();
    return new Promise((resolve, reject) => { const el = document.createElement('script'); el.src = CLIENT_SDK; el.onload = resolve; el.onerror = () => reject(new Error('could not load the ElevenLabs client')); document.head.appendChild(el); });
  }
  async function startCall() {
    if (!callOn()) { transcript('pipeline', 'Calls are off. Set up the Speech Engine (see README).'); return false; }
    if (call) return true;
    callState = 'connecting'; emit();
    try {
      await loadClientSdk();
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = await fetch('/api/voice/token').then(x => x.json());
      if (!r.ok) throw new Error(r.error || 'no token');
      transcript('pipeline', 'calling…');
      call = await ElevenLabsClient.Conversation.startSession({
        conversationToken: r.result.token,
        overrides: { agent: { firstMessage: 'Pipeline here. What do you need?' } },
        onConnect: () => { callState = 'on'; setState('listening'); transcript('pipeline', 'on the call'); },
        onDisconnect: () => { call = null; callState = 'off'; setState('idle'); transcript('pipeline', 'call ended'); },
        onError: (e) => { transcript('pipeline', 'call error: ' + (e && e.message || e)); },
        onModeChange: (m) => { setState(m && m.mode === 'speaking' ? 'speaking' : 'listening'); },
        onMessage: (m) => { if (!m || !m.message) return; transcript(m.source === 'user' ? 'you' : 'pipeline', m.message); if (m.source !== 'user' && window.Core) Core.burst(); },
      });
      return true;
    } catch (e) {
      call = null; callState = 'off'; setState('idle');
      transcript('pipeline', 'could not start the call: ' + (e && e.message || e));
      return false;
    }
  }
  async function endCall() { if (call) { try { await call.endSession(); } catch (e) { } } call = null; callState = 'off'; setState('idle'); }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  return {
    startCall, endCall, toggleCall() { return call ? (endCall(), Promise.resolve(false)) : startCall(); }, callState: () => callState, callOn,
    start, stop, toggle() { return on ? (stop(), false) : start(); },
    type(text) { if (!text.trim()) return; transcript('you', text.trim()); handle(text.replace(WAKE, '').trim() || text); },
    say, log: () => log, onChange(f) { listeners.push(f); }, state: () => ({ state, on: on || callState !== 'off', awake: awake || callState === 'on', supported: !!REC, call: callState }),
  };
})();

window.Voice = Voice;
