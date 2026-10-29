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
    const tts = (window.S && S.data && S.data.voice && S.data.voice.tts) || 'browser';
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

  // ---- intents, all answered from S.data so nothing is made up
  const first = n => (n || '').split(/\s+/)[0];
  function names(rows, k = 3) { const r = rows.slice(0, k).map(x => x.display || x.name); return r.length <= 1 ? r.join('') : r.slice(0, -1).join(', ') + ' and ' + r.slice(-1); }
  function handle(text) {
    const f = (window.feed && feed()) || {}, c = f.counts || {}, q = text.toLowerCase();
    const owes = (f.touches_due || []).filter(r => r.owes_reply), over = (f.tasks || []).filter(t => t.overdue);
    if (/^(ask|question|hey claude|claude)[ ,:]/i.test(q.trim())) return askClaude(text.replace(/^(ask|question|hey claude|claude)[ ,:]+/i, ''));
    if (/\b(stop|quiet|cancel|never ?mind|hush)\b/.test(q)) { if ('speechSynthesis' in window) speechSynthesis.cancel(); if (audioEl) { try { audioEl.pause(); } catch (e) { } } setState(on ? 'listening' : 'idle'); return; }
    setState('thinking');
    if (/\b(brief|morning|rundown|summary|how.?s (my|the) day)\b/.test(q)) {
      go('cc');
      const parts = [`Good ${hourWord()}, Caleb.`];
      parts.push(owes.length ? `${owes.length} ${owes.length === 1 ? 'person owes' : 'people owe'} a reply: ${names(owes)}.` : 'Nobody is waiting on a reply.');
      parts.push(over.length ? `${over.length} task${over.length === 1 ? ' is' : 's are'} overdue, starting with ${over[0].task}.` : 'Nothing is overdue.');
      parts.push(`${(f.new_leads || []).length} new lead${(f.new_leads || []).length === 1 ? '' : 's'} in the last two weeks, ${c.deals_live || 0} live deal${c.deals_live === 1 ? '' : 's'}, ${drafts().length} draft${drafts().length === 1 ? '' : 's'} ready.`);
      parts.push(owes.length ? 'Say compose to start with the first reply.' : 'Say compose to start on the drafts.');
      return say(parts.join(' '));
    }
    if (/\b(who texted|replies|reply|owe)\b/.test(q)) { go('touches'); return say(owes.length ? `${names(owes, 5)} texted last. ${first(owes[0].display)} said: ${(owes[0].last_messages || []).slice(-1)[0]?.replace(/^\d{4}-\d{2}-\d{2}: /, '') || 'no text on file'}.` : 'Nobody is waiting on a reply.'); }
    if (/\b(touch|due|who.?s due|call list)\b/.test(q)) { go('touches'); const t = f.touches_due || []; return say(t.length ? `${c.touches_due || t.length} touches due. Top of the list: ${names(t)}.` : 'No touches due.'); }
    if (/\b(task|to.?do|overdue)\b/.test(q)) { go('tasks'); const t = f.tasks || []; return say(t.length ? `${t.length} open task${t.length === 1 ? '' : 's'}, ${over.length} overdue. First up: ${t[0].task}${t[0].display ? ' for ' + t[0].display : ''}.` : 'No open tasks.'); }
    if (/\b(deal|contract|closing|pipeline status)\b/.test(q)) { go('deals'); const d = f.deals || []; return say(d.length ? `${d.length} live deal${d.length === 1 ? '' : 's'}. ` + d.slice(0, 3).map(x => `${x.address}, ${x.stage.replace('_', ' ')}${x.next_step ? ', next ' + x.next_step : ''}`).join('. ') + '.' : 'No live deals.'); }
    if (/\b(lead|new people|sign.?ups?)\b/.test(q)) { go('leads'); const l = f.new_leads || []; return say(l.length ? `${l.length} new lead${l.length === 1 ? '' : 's'}: ${names(l, 4)}. ${l[0].display} came in from ${l[0].source}.` : 'No new leads in the last two weeks.'); }
    if (/\b(compose|draft|next|write|send)\b/.test(q)) { const d = drafts(); if (!d.length) return say('The queue is clear.'); composeNext(); return say(`${d[0].reply ? 'Reply to' : 'Draft for'} ${d[0].name}. ${d[0].reply ? 'They texted last, so write it yourself.' : 'The draft is ready, read it and send.'}`); }
    if (/\b(refresh|reload|update|ingest)\b/.test(q)) { refresh(); return say('Rebuilding the feed.'); }
    if (/\b(home|command|center|dashboard|overview)\b/.test(q)) { go('cc'); return say('Command center.'); }
    if (/\b(sent|what did i send|log)\b/.test(q)) { go('sent'); const s = S.data.caps; return say(`${s.sent_texts} of ${s.texts} texts and ${s.sent_emails} of ${s.emails} emails today.`); }
    if (/\b(status|problem|attention|anything wrong|health)\b/.test(q)) { const p = problems(); return say(p.length ? `${p.length} thing${p.length === 1 ? '' : 's'} need${p.length === 1 ? 's' : ''} attention. ${p.map(x => x.text).join(' ')}` : 'All systems are fine. Feed is fresh, Command is signed in, sender is ' + (S.data.sender === 'live' ? 'live' : 'in dry run') + '.'); }
    if (/\b(help|what can you do|commands)\b/.test(q)) return say('Say brief, who texted me, touches, tasks, deals, leads, compose, refresh, status, or stop.' + (askOn() ? ' Or ask me anything about today.' : ''));
    return askClaude(text);
  }
  function askOn() { return !!(window.S && S.data && S.data.voice && S.data.voice.ask); }
  function askClaude(question) {
    if (!askOn()) return say("I didn't catch that. Say brief, touches, tasks, deals, leads, compose, or status.");
    setState('thinking');
    if (window.Core) Core.burst();
    return fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) })
      .then(r => r.json())
      .then(r => { if (!r.ok) return say(r.error || 'Claude did not answer.'); if (window.load) load(); say(r.result.answer); })
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
  function callOn() { return !!(window.S && S.data && S.data.voice && S.data.voice.speech_engine); }
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
