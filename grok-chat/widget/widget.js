/* calebjackson.org chat widget. One script tag, no dependencies.
   <script src="https://calebjackson.org/chat/widget.js" data-endpoint="https://calebjackson-chat.<account>.workers.dev" defer></script>
   Styles follow brand/voice-and-visual-rules.md: ivory ground, ink text, one ember accent. */
(function () {
  var script = document.currentScript;
  var ENDPOINT = (script && script.getAttribute('data-endpoint')) || '';
  var GREETING = (script && script.getAttribute('data-greeting')) ||
    "Hey, I'm Caleb's assistant. Buying, selling or just curious about the Baton Rouge area? Ask me anything and I'll get Caleb to text you back today.";
  if (!ENDPOINT) { console.warn('[cj-chat] data-endpoint missing'); return; }

  var KEY = 'cj-chat-v1';
  var state = { open: false, busy: false, messages: [], session: '' };
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && saved.messages) { state.messages = saved.messages; state.session = saved.session || ''; }
  } catch (e) {}
  if (!state.session) state.session = Math.random().toString(36).slice(2) + Date.now().toString(36);
  function persist() { try { sessionStorage.setItem(KEY, JSON.stringify({ messages: state.messages, session: state.session })); } catch (e) {} }

  var host = document.createElement('div');
  host.id = 'cj-chat-host';
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box}' +
    '.b{position:fixed;right:20px;bottom:20px;z-index:2147483000;height:56px;padding:0 20px 0 16px;border:0;border-radius:999px;background:#14100E;color:#FBF8F3;font:600 14px/1 Hauora,system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.02em;display:flex;align-items:center;gap:10px;cursor:pointer;box-shadow:0 8px 24px rgba(20,16,14,.25)}' +
    '.b:hover{background:#2A2320}' +
    '.b .dot{width:8px;height:8px;border-radius:50%;background:#E87757}' +
    '.p{position:fixed;right:20px;bottom:88px;z-index:2147483000;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 110px);background:#FBF8F3;color:#14100E;border-radius:18px;box-shadow:0 16px 48px rgba(20,16,14,.28);display:none;flex-direction:column;overflow:hidden;font:400 15px/1.45 Hauora,system-ui,-apple-system,Segoe UI,sans-serif}' +
    '.p.open{display:flex}' +
    '.h{padding:18px 20px 14px;border-bottom:1px solid rgba(141,133,123,.35);display:flex;align-items:flex-start;justify-content:space-between;gap:12px}' +
    '.h .n{font:400 26px/1 "Instrument Serif",Georgia,serif;letter-spacing:-.01em}' +
    '.h .n i{font-style:normal;color:#E87757}' +
    '.h .k{margin-top:6px;font:600 10px/1.3 Hauora,system-ui,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#8D857B}' +
    '.x{border:0;background:transparent;color:#8D857B;font-size:22px;line-height:1;cursor:pointer;padding:0 2px}' +
    '.x:hover{color:#14100E}' +
    '.m{flex:1;overflow-y:auto;padding:16px 16px 8px;display:flex;flex-direction:column;gap:10px}' +
    '.u,.a{max-width:85%;padding:10px 14px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}' +
    '.u{align-self:flex-end;background:#14100E;color:#FBF8F3;border-bottom-right-radius:4px}' +
    '.a{align-self:flex-start;background:#FBEFE9;border-bottom-left-radius:4px}' +
    '.a.t:after{content:"";display:inline-block;width:6px;height:14px;margin-left:2px;background:#8D857B;vertical-align:-2px;animation:cjb 1s steps(2) infinite}' +
    '@keyframes cjb{to{opacity:0}}' +
    '.f{display:flex;gap:8px;padding:12px 12px 10px;border-top:1px solid rgba(141,133,123,.35);background:#FBF8F3}' +
    '.f textarea{flex:1;resize:none;height:44px;max-height:120px;padding:11px 12px;border:1px solid rgba(141,133,123,.6);border-radius:12px;background:#fff;color:#14100E;font:inherit;outline:none}' +
    '.f textarea:focus{border-color:#14100E}' +
    '.f button{height:44px;padding:0 16px;border:0;border-radius:12px;background:#14100E;color:#FBF8F3;font:600 14px Hauora,system-ui,sans-serif;cursor:pointer}' +
    '.f button:disabled{opacity:.45;cursor:default}' +
    '.s{padding:0 16px 10px;font:400 11px/1.4 Hauora,system-ui,sans-serif;color:#8D857B;text-align:center}' +
    '.s a{color:#8D857B}' +
    '@media (max-width:480px){.p{right:0;bottom:0;width:100vw;max-width:100vw;height:100vh;max-height:100vh;border-radius:0}.b{right:16px;bottom:16px}}' +
    '</style>' +
    '<button class="b" aria-label="Chat with Caleb\'s assistant"><span class="dot"></span><span>Ask Caleb</span></button>' +
    '<div class="p" role="dialog" aria-label="Chat with Caleb\'s assistant">' +
      '<div class="h"><div><div class="n">caleb jackson<i>.</i></div><div class="k">REALTOR · Keller Williams First Choice</div></div><button class="x" aria-label="Close">×</button></div>' +
      '<div class="m"></div>' +
      '<form class="f"><textarea rows="1" placeholder="Ask about buying, selling or a neighborhood" aria-label="Your message"></textarea><button type="submit">Send</button></form>' +
      '<div class="s">Caleb\'s assistant, not Caleb. Prefer a person? Call or text <a href="tel:+12257470303">(225) 747-0303</a>.</div>' +
    '</div>';

  var btn = root.querySelector('.b'), panel = root.querySelector('.p'), list = root.querySelector('.m');
  var form = root.querySelector('.f'), input = root.querySelector('textarea'), sendBtn = root.querySelector('.f button');

  function bubble(role, text, typing) {
    var el = document.createElement('div');
    el.className = (role === 'user' ? 'u' : 'a') + (typing ? ' t' : '');
    el.textContent = text;
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
    return el;
  }
  function render() {
    list.innerHTML = '';
    if (!state.messages.length) bubble('assistant', GREETING);
    state.messages.forEach(function (m) { bubble(m.role, m.content); });
  }
  function toggle(open) {
    state.open = open;
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) { render(); setTimeout(function () { input.focus(); }, 50); }
  }
  btn.addEventListener('click', function () { toggle(!state.open); });
  root.querySelector('.x').addEventListener('click', function () { toggle(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) toggle(false); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || state.busy) return;
    input.value = '';
    state.messages.push({ role: 'user', content: text });
    persist();
    bubble('user', text);
    ask();
  });

  function ask() {
    state.busy = true; sendBtn.disabled = true;
    var el = bubble('assistant', '', true), acc = '';
    fetch(ENDPOINT.replace(/\/$/, '') + '/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.messages.slice(-12), session: state.session })
    }).then(function (res) {
      if (!res.ok) return res.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.error || ('HTTP ' + res.status)); });
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          buf += dec.decode(r.value, { stream: true });
          var i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            var line = buf.slice(0, i).trim(); buf = buf.slice(i + 2);
            if (line.indexOf('data:') !== 0) continue;
            var msg; try { msg = JSON.parse(line.slice(5)); } catch (x) { continue; }
            if (msg.delta) { acc += msg.delta; el.textContent = acc; list.scrollTop = list.scrollHeight; }
            if (msg.error) { acc = msg.error; el.textContent = acc; }
          }
          return pump();
        });
      }
      return pump();
    }).catch(function (err) {
      acc = acc || ('I could not reach Caleb\'s assistant just now. Call or text (225) 747-0303. ' + (err && err.message ? '' : ''));
      el.textContent = acc;
    }).then(function () {
      el.classList.remove('t');
      if (acc) { state.messages.push({ role: 'assistant', content: acc }); persist(); }
      state.busy = false; sendBtn.disabled = false; input.focus();
    });
  }

  document.body.appendChild(host);
})();
