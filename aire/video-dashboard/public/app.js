'use strict';
/* Video Engine dashboard. Plain JavaScript, no framework. Every action here is a call to the
   same JSON API the bot uses. Text always goes in as text nodes, never as HTML. */

const view = document.getElementById('view');
const player = document.getElementById('player');
const state = { job: null, tab: 'files', ref: null, breakdown: null, plan: null, timer: null, token: 0 };

// ---- small helpers -------------------------------------------------------

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'X-VX-Actor': 'dashboard', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function toast(message, bad) {
  const el = h('div', { class: 'toast' + (bad ? ' bad' : '') }, message);
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), bad ? 7000 : 3500);
}

// Run an action, show what went wrong in plain words, and refresh.
async function run(fn, okMessage) {
  try {
    const out = await fn();
    if (okMessage) toast(okMessage);
    return out;
  } catch (e) {
    toast(e.message, true);
    return null;
  }
}

const enc = encodeURIComponent;
const mediaUrl = (job, folder, name) => (job ? `/media/${enc(job)}/${folder}/${enc(name)}` : `/media/_inbox/${enc(name)}`);
const thumbUrl = (job, folder, name) => `/thumb/${job ? enc(job) : '_inbox'}/${folder}/${enc(name)}`;
const refAsset = (job, rel) => `/media/${enc(job)}/reference/${rel.split('/').map(enc).join('/')}`;
const bg = (url) => `background-image:url("${url}")`;

function secs(t) {
  if (t === null || t === undefined || !Number.isFinite(Number(t))) return '';
  t = Number(t);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(t < 600 ? 1 : 0)}`;
}
function bytes(n) {
  if (n > 1e9) return (n / 1e9).toFixed(2) + ' GB';
  if (n > 1e6) return (n / 1e6).toFixed(1) + ' MB';
  return Math.max(1, Math.round(n / 1e3)) + ' KB';
}
function when(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return 'unknown time';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function audioText(p) {
  if (!p.audio_streams || !p.audio_streams.length) return 'no audio';
  return p.audio_streams.map((a) => `${a.codec} ${a.channels === 1 ? 'mono' : a.channels === 2 ? 'stereo' : (a.channels || '?') + 'ch'}${a.sample_rate ? ' ' + a.sample_rate / 1000 + 'kHz' : ''}`).join(', ');
}
function infoLine(f) {
  const p = f.probe;
  if (!p) return bytes(f.size);
  if (p.readable === false) return 'could not read';
  const bits = [];
  if (p.duration) bits.push(secs(p.duration));
  if (p.width) bits.push(`${p.width}x${p.height}`);
  if (p.fps) bits.push(`${p.fps} fps`);
  if (p.kind !== 'image') bits.push(p.audio_streams.length ? `${p.audio_streams.length} audio` : 'no audio');
  return bits.join(' · ');
}

// ---- uploads -------------------------------------------------------------

function upload(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('X-VX-Actor', 'dashboard');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed. Is the dashboard still running?'));
    xhr.send(file);
  });
}

function dropZone(label, urlFor, done) {
  const input = h('input', { type: 'file', multiple: true });
  const text = h('span', {}, label + ' Drop files here or ');
  const zone = h('div', { class: 'drop' }, text, h('label', { class: 'pick', style: 'display:inline;font-size:inherit;color:inherit' }, 'choose files', input));
  const send = async (files) => {
    for (const file of files) {
      try {
        await upload(urlFor(file.name), file, (p) => (text.textContent = `Uploading ${file.name} ${Math.round(p * 100)}% `));
        toast(`Added ${file.name}`);
      } catch (e) {
        toast(e.message, true);
      }
    }
    done();
  };
  input.addEventListener('change', () => input.files.length && send([...input.files]));
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('over');
    if (e.dataTransfer.files.length) send([...e.dataTransfer.files]);
  });
  return zone;
}

// ---- player and trim -----------------------------------------------------

function fileCard(job, f, onOpen) {
  const playable = ['video', 'audio', 'image'].includes(f.kind);
  const thumb = h('div', { class: 'thumb', style: playable ? bg(thumbUrl(job, f.folder, f.name)) : '' }, playable ? '' : f.kind === 'captions' ? 'captions' : 'file');
  return h('button', { class: 'file', title: `Open ${f.name}`, onclick: () => onOpen(f) }, thumb,
    h('div', { class: 'meta' }, h('div', { class: 'name' }, f.name), h('div', { class: 'info' }, infoLine(f))));
}

function openPlayer(job, f, opts = {}) {
  const p = f.probe || {};
  const src = mediaUrl(job, f.folder, f.name);
  let mediaEl;
  if (f.kind === 'video') mediaEl = h('video', { src, controls: true, playsinline: true, preload: 'metadata' });
  else if (f.kind === 'audio') mediaEl = h('audio', { src, controls: true, preload: 'metadata' });
  else if (f.kind === 'image') mediaEl = h('img', { src, alt: f.name });
  else mediaEl = h('p', { class: 'muted', style: 'padding:1.5rem' }, 'This file type does not play in the browser.');

  const facts = h('div', { class: 'facts' },
    p.duration ? h('span', {}, h('b', {}, 'Length'), secs(p.duration)) : null,
    p.width ? h('span', {}, h('b', {}, 'Size'), `${p.width}x${p.height}${p.aspect ? ' (' + p.aspect + ')' : ''}`) : null,
    p.fps ? h('span', {}, h('b', {}, 'Frame rate'), `${p.fps} fps`) : null,
    p.video ? h('span', {}, h('b', {}, 'Video'), p.video.codec) : null,
    p.kind && p.kind !== 'image' ? h('span', {}, h('b', {}, 'Audio'), audioText(p)) : null,
    h('span', {}, h('b', {}, 'File'), bytes(f.size)),
    h('span', {}, h('b', {}, 'Folder'), f.folder));

  const body = h('div', { class: 'player-body' }, facts);
  if (opts.note) body.append(h('div', { class: 'notice' }, opts.note));

  const canTrim = job && f.folder === 'source' && (f.kind === 'video' || f.kind === 'audio') && p.duration;
  if (canTrim) {
    const inEl = h('input', { type: 'number', min: 0, step: 0.1, value: opts.in !== undefined ? opts.in : 0 });
    const outEl = h('input', { type: 'number', min: 0, step: 0.1, value: opts.out !== undefined ? opts.out : p.duration });
    const labelEl = h('input', { type: 'text', placeholder: 'Label (optional)', class: 'grow' });
    const now = () => Math.round(mediaEl.currentTime * 10) / 10;
    body.append(h('div', { class: 'card' },
      h('h3', {}, 'Trim'),
      h('p', { class: 'muted small' }, 'Play to the spot, press Set in or Set out, then save. Trims are saved with the job.'),
      h('div', { class: 'row' },
        h('label', {}, 'In (seconds)', inEl), h('button', { class: 'quiet tiny', onclick: () => (inEl.value = now()) }, 'Set in'),
        h('label', {}, 'Out (seconds)', outEl), h('button', { class: 'quiet tiny', onclick: () => (outEl.value = now()) }, 'Set out'),
        h('button', { class: 'quiet tiny', onclick: () => playRange(mediaEl, Number(inEl.value), Number(outEl.value)) }, 'Play range')),
      h('div', { class: 'row', style: 'margin-top:0.6rem' }, labelEl,
        h('button', { class: 'primary', onclick: async () => {
          const t = await run(() => api('POST', `/api/jobs/${enc(job)}/trims`, { source: f.name, in: Number(inEl.value), out: Number(outEl.value), label: labelEl.value }));
          if (t) { toast(`Saved trim ${t.id} (${secs(t.duration)})`); refreshJob(); }
        } }, 'Save trim'))));
  }
  if (job && f.kind === 'video' && f.folder !== 'reference') {
    const actions = h('div', { class: 'row' },
      h('button', { class: 'quiet', onclick: () => queueRender(job, { op: 'preview', folder: f.folder, name: f.name }, 'Preview queued') }, 'Make low-res preview'));
    const srts = (state.job && state.job.captions) || [];
    if (srts.length) {
      const pick = h('select', { 'aria-label': 'Captions file' }, srts.map((s) => h('option', { value: s }, s)));
      actions.append(pick, h('button', { class: 'quiet', onclick: () => queueRender(job, { op: 'captions', folder: f.folder, name: f.name, srt: pick.value }, 'Captions render queued') }, 'Burn in captions'));
    } else {
      actions.append(h('span', { class: 'muted small' }, 'Add an .srt file to source to burn in captions.'));
    }
    body.append(actions);
  }
  if (f.folder !== 'reference') body.append(h('div', {}, h('a', { class: 'small muted', href: src + '?download=1' }, 'Download file')));

  player.replaceChildren(
    h('div', { class: 'player-head' }, h('h3', {}, f.name), h('button', { class: 'quiet', onclick: () => player.close() }, 'Close')),
    h('div', { class: 'player-media' }, mediaEl), body);
  if (!player.open) player.showModal();
  if (opts.in !== undefined && mediaEl.play) playRange(mediaEl, opts.in, opts.out);
  return mediaEl;
}
player.addEventListener('close', () => player.replaceChildren());
player.addEventListener('click', (e) => { if (e.target === player) player.close(); });

function playRange(el, start, end) {
  if (!el.play) return;
  if (el._stop) el.removeEventListener('timeupdate', el._stop);
  el._stop = () => {
    if (end !== undefined && el.currentTime >= end) {
      el.pause();
      el.removeEventListener('timeupdate', el._stop);
    }
  };
  el.addEventListener('timeupdate', el._stop);
  const go = () => { el.currentTime = start || 0; el.play().catch(() => {}); };
  if (el.readyState >= 1) go();
  else el.addEventListener('loadedmetadata', go, { once: true });
}

async function queueRender(job, body, message) {
  const r = await run(() => api('POST', `/api/jobs/${enc(job)}/renders`, body));
  if (r) {
    toast(`${message}: ${r.output.folder}/${r.output.name}`);
    refreshJob();
  }
}

// ---- shared pieces -------------------------------------------------------

function renderItem(r, showJob) {
  const out = `${r.output.folder}/${r.output.name}`;
  const logBox = h('pre', { class: 'log' }, 'Loading log…');
  const details = h('details', { ontoggle: async () => {
    if (!details.open) return;
    const full = await run(() => api('GET', `/api/renders/${r.id}`));
    if (full) logBox.textContent = full.log || 'No log output yet.';
  } }, h('summary', {}, 'Show log'), logBox);
  return h('div', { class: 'item', 'data-render': r.id },
    h('div', { class: 'row spread' },
      h('div', {}, h('span', { class: `badge ${r.status}` }, r.status), ' ', h('b', {}, r.op === 'roughcut' ? 'rough cut' : r.op),
        showJob ? [' · ', h('a', { href: `#/job/${enc(r.job)}/renders` }, r.job)] : null),
      h('span', { class: 'muted small' }, `${when(r.created)} · ${r.actor}`)),
    h('div', { class: 'small', style: 'margin-top:0.25rem;overflow-wrap:anywhere' }, r.status === 'done' ? h('a', { href: mediaUrl(r.job, r.output.folder, r.output.name), target: '_blank', rel: 'noopener' }, out) : out,
      r.output.duration ? ` · ${secs(r.output.duration)}` : ''),
    r.skipped_slots && r.skipped_slots.length ? h('div', { class: 'small muted' }, `Skipped unassigned slots: ${r.skipped_slots.join(', ')}. Nothing was made up to fill them.`) : null,
    r.error ? h('div', { class: 'small', style: 'color:var(--coral);font-weight:700' }, r.error) : null,
    r.status === 'running' || r.status === 'queued' ? h('div', { class: 'bar' }, h('i', { style: `width:${Math.round((r.progress || 0) * 100)}%` })) : null,
    details);
}

function activityList(entries, showJob) {
  if (!entries.length) return h('p', { class: 'muted' }, 'Nothing has happened yet.');
  const describe = (d) => Object.entries(d || {}).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
  return h('div', { class: 'activity' }, entries.map((e) => h('div', { class: 'entry' },
    h('div', { class: 'when' }, when(e.ts)),
    h('div', {}, h('span', { class: 'chip' }, e.actor), h('b', {}, e.action), showJob && e.job ? [' in ', h('a', { href: `#/job/${enc(e.job)}` }, e.job)] : null,
      h('div', { class: 'muted small', style: 'overflow-wrap:anywhere' }, describe(e.detail))))));
}

function setNav(name) {
  for (const a of document.querySelectorAll('#nav a')) a.classList.toggle('on', a.dataset.nav === name);
}

function poll(fn, ms = 2000) {
  clearInterval(state.timer);
  state.timer = setInterval(fn, ms);
}

// ---- views: jobs, inbox, queue, activity ---------------------------------

async function jobsView() {
  setNav('jobs');
  const jobs = await api('GET', '/api/jobs');
  const id = h('input', { type: 'text', placeholder: 'JOB-20261112-NAME', required: true, pattern: '[A-Za-z0-9][A-Za-z0-9._\\-]{0,63}', title: 'Letters, numbers, dot, dash or underscore' });
  const title = h('input', { type: 'text', placeholder: 'What is this video?', class: 'grow' });
  const notes = h('input', { type: 'text', placeholder: 'Notes (optional)', class: 'grow' });
  const form = h('form', { class: 'inline card', onsubmit: async (e) => {
    e.preventDefault();
    const job = await run(() => api('POST', '/api/jobs', { id: id.value.trim(), title: title.value, notes: notes.value }));
    if (job) location.hash = `#/job/${enc(job.id)}`;
  } }, h('label', {}, 'Job id', id), h('label', { class: 'grow' }, 'Title', title), h('label', { class: 'grow' }, 'Notes', notes), h('button', { class: 'primary' }, 'Create job'));
  view.replaceChildren(
    h('div', { class: 'head' }, h('div', {}, h('h1', {}, 'Video jobs'), h('div', { class: 'sub' }, `${jobs.length} job${jobs.length === 1 ? '' : 's'} on this machine`))),
    h('section', {}, form),
    h('section', {}, jobs.length ? h('div', { class: 'jobs' }, jobs.map((j) => h('a', { class: 'card job-card', href: `#/job/${enc(j.id)}` },
      h('span', { class: `badge ${j.status}` }, j.status),
      h('h3', {}, j.title || j.id), h('div', { class: 'mono muted' }, j.id),
      h('div', { class: 'counts' }, h('span', {}, `${j.counts.source} source`), h('span', {}, `${j.counts.build} build`), h('span', {}, `${j.counts.out} out`), h('span', {}, `${j.counts.reference} ref`),
        j.open_edit_requests ? h('span', { style: 'color:var(--coral);font-weight:700' }, `${j.open_edit_requests} edit request${j.open_edit_requests > 1 ? 's' : ''}`) : null),
      h('div', { class: 'muted small', style: 'margin-top:0.4rem' }, `Updated ${when(j.updated)}`))))
      : h('p', { class: 'muted' }, 'No jobs yet. Create the first one above.')));
}

async function inboxView() {
  setNav('inbox');
  const [files, jobs] = await Promise.all([api('GET', '/api/inbox?probe=1'), api('GET', '/api/jobs')]);
  const rows = files.map((f) => {
    const jobPick = h('select', { 'aria-label': 'Job' }, jobs.map((j) => h('option', { value: j.id }, j.title ? `${j.title} (${j.id})` : j.id)));
    const folderPick = h('select', { 'aria-label': 'Folder' }, h('option', { value: 'source' }, 'as source footage'), h('option', { value: 'reference' }, 'as a reference (analysis only)'));
    return h('div', { class: 'item row' },
      h('button', { class: 'file mini', style: 'border:0', onclick: () => openPlayer(null, f) }, h('div', { class: 'thumb', style: bg(thumbUrl(null, 'inbox', f.name)) })),
      h('div', { class: 'grow' }, h('div', { class: 'name', style: 'font-weight:700;overflow-wrap:anywhere' }, f.name), h('div', { class: 'muted small' }, infoLine(f))),
      jobs.length ? h('div', { class: 'row' }, jobPick, folderPick, h('button', { class: 'primary', onclick: async () => {
        const moved = await run(() => api('POST', '/api/inbox/move', { name: f.name, job: jobPick.value, folder: folderPick.value }), `Moved ${f.name}`);
        if (moved) inboxView();
      } }, 'Move to job')) : h('span', { class: 'muted small' }, 'Create a job first to move this.'));
  });
  view.replaceChildren(
    h('div', { class: 'head' }, h('div', {}, h('h1', {}, 'Inbox'), h('div', { class: 'sub' }, 'Files waiting for a job. The bot drops chat files here.'))),
    h('section', {}, dropZone('Add to the inbox.', (name) => `/api/inbox/upload?name=${enc(name)}`, inboxView)),
    h('section', {}, rows.length ? h('div', { class: 'list' }, rows) : h('p', { class: 'muted' }, 'The inbox is empty.')));
}

async function queueView() {
  setNav('queue');
  const draw = async () => {
    const renders = await api('GET', '/api/renders');
    const open = new Set([...view.querySelectorAll('details[open]')].map((d) => d.closest('[data-render]').dataset.render));
    if (open.size && !renders.some((r) => r.status === 'running' || r.status === 'queued')) return;
    view.replaceChildren(
      h('div', { class: 'head' }, h('div', {}, h('h1', {}, 'Renders'), h('div', { class: 'sub' }, 'One at a time, oldest first. Local ffmpeg only.'))),
      renders.length ? h('div', { class: 'list' }, renders.map((r) => renderItem(r, true))) : h('p', { class: 'muted' }, 'No renders yet. Queue one from a job.'));
  };
  await draw();
  poll(() => draw().catch(() => {}), 2500);
}

async function activityView() {
  setNav('activity');
  const entries = await api('GET', '/api/activity?limit=300');
  view.replaceChildren(
    h('div', { class: 'head' }, h('div', {}, h('h1', {}, 'Activity'), h('div', { class: 'sub' }, 'Everything the bot or a person did, newest first.'))),
    activityList(entries, true));
}

// ---- job page -------------------------------------------------------------

const TABS = [['files', 'Files'], ['clips', 'Clips'], ['renders', 'Renders'], ['reference', 'Reference'], ['notes', 'Notes'], ['activity', 'Activity']];

async function refreshJob() {
  if (!state.job) return;
  const id = state.job.id;
  const job = await run(() => api('GET', `/api/jobs/${enc(id)}?probe=1`));
  if (job && state.job && state.job.id === id) {
    state.job = job;
    drawJob();
  }
}

async function jobView(id, tab) {
  setNav('jobs');
  state.tab = TABS.some(([k]) => k === tab) ? tab : 'files';
  if (!state.job || state.job.id !== id) {
    state.ref = null;
    state.breakdown = null;
    state.plan = null;
  }
  state.job = await api('GET', `/api/jobs/${enc(id)}?probe=1`);
  await drawJob();
  // keep render progress fresh while something is queued or running
  poll(async () => {
    if (!state.job) return;
    const active = state.job.renders.some((r) => r.status === 'queued' || r.status === 'running');
    if (!active || player.open || view.querySelector('details[open]')) return;
    const focused = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    if (!focused) refreshJob();
  });
}

async function drawJob() {
  const job = state.job;
  const token = ++state.token;
  const status = h('select', { 'aria-label': 'Status', onchange: async () => {
    await run(() => api('PATCH', `/api/jobs/${enc(job.id)}`, { status: status.value }), 'Status saved');
    refreshJob();
  } }, [...new Set([job.status, ...job.statuses])].map((s) => h('option', { value: s, selected: s === job.status }, s)));
  const active = job.renders.filter((r) => r.status === 'queued' || r.status === 'running').length;
  const head = h('div', { class: 'head' },
    h('div', {}, h('a', { class: 'crumb', href: '#/' }, '← All jobs'), h('h1', {}, job.title || job.id), h('div', { class: 'sub mono' }, job.id)),
    h('div', { class: 'row' }, active ? h('span', { class: 'badge running' }, `${active} rendering`) : null, h('label', {}, 'Status', status)));
  const tabs = h('nav', { class: 'tabs' }, TABS.map(([k, label]) => h('a', { href: `#/job/${enc(job.id)}/${k}`, class: k === state.tab ? 'on' : '' }, label)));
  const body = h('div', {});
  view.replaceChildren(head, tabs, body);
  const content = await { files: filesTab, clips: clipsTab, renders: rendersTab, reference: referenceTab, notes: notesTab, activity: activityTab }[state.tab](job);
  if (token === state.token) body.replaceChildren(...[content].flat());
}

function filesTab(job) {
  const open = (f) => openPlayer(job.id, f);
  const group = (folder, title, hint) => h('section', {},
    h('div', { class: 'section-title' }, h('h2', {}, title), h('span', { class: 'muted small' }, hint)),
    folder === 'source' ? h('div', { style: 'margin-bottom:0.8rem' }, dropZone('Add raw footage.', (name) => `/api/jobs/${enc(job.id)}/upload?folder=source&name=${enc(name)}`, refreshJob)) : null,
    job.files[folder].length ? h('div', { class: 'files' }, job.files[folder].map((f) => fileCard(job.id, f, open))) : h('p', { class: 'muted' }, 'Nothing here yet.'));
  return [
    group('source', 'Source', `${job.files.source.length} file${job.files.source.length === 1 ? '' : 's'} · raw footage, audio, images, captions`),
    group('build', 'Build', 'trims, previews and rough cuts'),
    group('out', 'Out', 'finished pieces'),
  ];
}

function clipsTab(job) {
  const bySource = Object.fromEntries(job.files.source.map((f) => [f.name, f]));
  const rows = job.trims.map((t) => {
    const f = bySource[t.source];
    return h('div', { class: 'item row' },
      f ? h('div', { class: 'thumb mini', style: bg(thumbUrl(job.id, 'source', t.source)) }) : null,
      h('div', { class: 'grow' }, h('div', {}, h('b', {}, t.id), t.label ? ` · ${t.label}` : ''),
        h('div', { class: 'muted small', style: 'overflow-wrap:anywhere' }, `${t.source} · ${secs(t.in)} to ${secs(t.out)} (${secs(t.duration)})${f ? '' : ' · source file is missing'}`)),
      h('div', { class: 'row' },
        f ? h('button', { class: 'quiet tiny', onclick: () => openPlayer(job.id, f, { in: t.in, out: t.out }) }, 'Play') : null,
        h('button', { class: 'quiet tiny', onclick: () => queueRender(job.id, { op: 'trim', trim: t.id }, 'Trim queued') }, 'Render trim'),
        h('button', { class: 'quiet tiny', onclick: async () => { await run(() => api('DELETE', `/api/jobs/${enc(job.id)}/trims/${t.id}`), `Removed ${t.id}`); refreshJob(); } }, 'Remove')));
  });
  const dest = h('select', { 'aria-label': 'Save to' }, h('option', { value: 'build' }, 'into build'), h('option', { value: 'out' }, 'into out'));
  const sources = job.files.source.filter((f) => f.kind === 'video' || f.kind === 'audio');
  return [
    h('section', {},
      h('div', { class: 'section-title' }, h('h2', {}, 'Trims'), h('span', { class: 'muted small' }, 'In and out points saved with the job')),
      rows.length ? h('div', { class: 'list' }, rows) : h('p', { class: 'muted' }, 'No trims yet. Open a source clip below and set an in and out point.'),
      rows.length ? h('div', { class: 'row', style: 'margin-top:0.9rem' }, h('button', { class: 'primary', onclick: () => queueRender(job.id, { op: 'concat', dest: dest.value }, 'Join queued') }, `Join all ${rows.length} trims in order`), dest) : null),
    h('section', {},
      h('div', { class: 'section-title' }, h('h2', {}, 'Source clips'), h('span', { class: 'muted small' }, 'Open one to set a trim')),
      sources.length ? h('div', { class: 'files' }, sources.map((f) => fileCard(job.id, f, (x) => openPlayer(job.id, x)))) : h('p', { class: 'muted' }, 'Add footage on the Files tab first.')),
  ];
}

function rendersTab(job) {
  return h('section', {},
    h('div', { class: 'section-title' }, h('h2', {}, 'Renders'), h('span', { class: 'muted small' }, 'One at a time. Local ffmpeg only.')),
    job.renders.length ? h('div', { class: 'list' }, job.renders.map((r) => renderItem(r, false))) : h('p', { class: 'muted' }, 'No renders yet. Queue a trim, preview, join or captions render from the Files and Clips tabs.'));
}

function notesTab(job) {
  const general = h('textarea', { placeholder: 'What this video is for, the brief, anything to remember.' }, job.notes || '');
  const text = h('textarea', { placeholder: 'Write a note or an edit request…' });
  const kind = h('select', { 'aria-label': 'Kind' }, h('option', { value: 'edit-request' }, 'Edit request'), h('option', { value: 'note' }, 'Note'));
  const entries = (job.entries || []).slice().reverse();
  return [
    h('section', {}, h('div', { class: 'section-title' }, h('h2', {}, 'Job notes')), general,
      h('div', { style: 'margin-top:0.5rem' }, h('button', { class: 'quiet', onclick: async () => { await run(() => api('PATCH', `/api/jobs/${enc(job.id)}`, { notes: general.value }), 'Notes saved'); refreshJob(); } }, 'Save notes'))),
    h('section', {}, h('div', { class: 'section-title' }, h('h2', {}, 'Notes and edit requests')),
      h('div', { class: 'card stack' }, text, h('div', { class: 'row' }, kind, h('button', { class: 'primary', onclick: async () => {
        const ok = await run(() => api('POST', `/api/jobs/${enc(job.id)}/notes`, { text: text.value, kind: kind.value }), 'Added');
        if (ok) refreshJob();
      } }, 'Add'))),
      h('div', { class: 'stack', style: 'margin-top:1rem' }, entries.length ? entries.map((n) => h('div', { class: `note ${n.kind}${n.done ? ' is-done' : ''}` },
        h('div', { class: 'row spread' }, h('span', {}, h('span', { class: 'badge' }, n.kind === 'edit-request' ? 'edit request' : 'note'), ' ', h('span', { class: 'muted small' }, `${n.actor} · ${when(n.ts)}`)),
          n.kind === 'edit-request' ? h('button', { class: 'quiet tiny', onclick: async () => { await run(() => api('PATCH', `/api/jobs/${enc(job.id)}/notes/${n.id}`, { done: !n.done })); refreshJob(); } }, n.done ? 'Reopen' : 'Mark done') : null),
        h('div', { class: 'text', style: 'white-space:pre-wrap;overflow-wrap:anywhere' }, n.text))) : h('p', { class: 'muted' }, 'No notes yet.'))),
  ];
}

async function activityTab(job) {
  const entries = await api('GET', `/api/jobs/${enc(job.id)}/activity`);
  return h('section', {}, h('div', { class: 'section-title' }, h('h2', {}, 'Activity'), h('span', { class: 'muted small' }, 'Who did what on this job, newest first')), activityList(entries, false));
}

// ---- reference engine ------------------------------------------------------

const ANALYSIS_NOTE = 'References are for analysis only. They are studied for structure and pacing, never used as footage in an export, and never re-published.';

async function referenceTab(job) {
  const refs = job.references;
  if (state.ref && !refs.some((r) => r.name === state.ref)) state.ref = null;
  if (!state.ref) {
    const first = refs.find((r) => r.breakdown.available) || refs[0];
    state.ref = first ? first.name : null;
  }
  const current = refs.find((r) => r.name === state.ref);
  state.breakdown = current && current.breakdown.available ? await api('GET', `/api/jobs/${enc(job.id)}/references/${enc(current.name)}/breakdown`).catch(() => null) : null;
  state.plan = job.match_plan ? await api('GET', `/api/jobs/${enc(job.id)}/match-plan`).catch(() => null) : null;

  const url = h('input', { type: 'url', placeholder: 'https://…', class: 'grow', required: true, 'aria-label': 'Reference link' });
  const fetchBtn = h('button', { class: 'primary' }, 'Fetch link');
  const urlForm = h('form', { class: 'inline', onsubmit: async (e) => {
    e.preventDefault();
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Fetching…';
    const ref = await run(() => api('POST', `/api/jobs/${enc(job.id)}/references`, { url: url.value.trim() }));
    if (ref) { toast(`Saved ${ref.name}`); state.ref = ref.name; }
    refreshJob();
  } }, url, fetchBtn);

  const fileFor = (r) => job.files.reference.find((f) => f.name === r.name);
  const refRows = refs.map((r) => {
    const f = fileFor(r);
    const btn = h('button', { class: r.breakdown.available ? 'quiet tiny' : 'primary tiny', onclick: async () => {
      btn.disabled = true;
      btn.textContent = 'Breaking down…';
      const b = await run(() => api('POST', `/api/jobs/${enc(job.id)}/references/${enc(r.name)}/breakdown`));
      if (b) toast(`Found ${b.shots.length} shots in ${r.name}`);
      state.ref = r.name;
      refreshJob();
    } }, r.breakdown.available ? 'Run again' : 'Run breakdown');
    const origin = r.origin.type === 'url' ? `from ${r.origin.url}` : r.origin.type === 'upload' ? 'uploaded' : r.origin.type === 'inbox' ? 'from the inbox' : r.origin.type === 'path' ? 'imported from a file' : 'found in the folder';
    return h('div', { class: 'item row', style: r.name === state.ref ? 'border-color:var(--ink)' : '' },
      h('div', { class: 'thumb mini', style: bg(thumbUrl(job.id, 'reference', r.name)) }),
      h('div', { class: 'grow' }, h('div', { style: 'font-weight:700;overflow-wrap:anywhere' }, r.name),
        h('div', { class: 'muted small', style: 'overflow-wrap:anywhere' }, `${f ? infoLine(f) + ' · ' : ''}${origin}`),
        h('div', { style: 'margin-top:0.25rem' }, h('span', { class: 'badge analysis' }, 'Analysis only'), r.breakdown.available ? [' ', h('span', { class: 'badge ok' }, `${r.breakdown.shot_count} shots`)] : null)),
      h('div', { class: 'row' },
        f ? h('button', { class: 'quiet tiny', onclick: () => openPlayer(job.id, f, { note: ANALYSIS_NOTE }) }, 'Play') : null,
        r.breakdown.available && r.name !== state.ref ? h('button', { class: 'quiet tiny', onclick: () => { state.ref = r.name; drawJob(); } }, 'View breakdown') : null,
        btn));
  });

  return [
    h('section', {}, h('div', { class: 'notice' }, ANALYSIS_NOTE)),
    h('section', {}, h('div', { class: 'section-title' }, h('h2', {}, 'Add a reference')),
      h('div', { class: 'stack' },
        dropZone('Upload a reference video.', (name) => `/api/jobs/${enc(job.id)}/upload?folder=reference&name=${enc(name)}`, refreshJob),
        h('div', { class: 'card' }, urlForm, h('p', { class: 'muted small', style: 'margin:0.5rem 0 0' }, 'Or paste a link. It is downloaded to this machine with yt-dlp, only when you press Fetch link.')))),
    h('section', {}, h('div', { class: 'section-title' }, h('h2', {}, 'References')),
      refRows.length ? h('div', { class: 'list' }, refRows) : h('p', { class: 'muted' }, 'No references yet.')),
    state.breakdown ? breakdownView(job, state.breakdown, fileFor(current)) : null,
    state.plan ? planView(job, state.plan) : null,
  ];
}

function loudnessChart(b) {
  const a = b.audio;
  const dur = b.specs.duration;
  const W = 1000;
  const H = 90;
  const vals = a.curve.values;
  const x = (t) => (t / dur) * W;
  const y = (db) => H - 4 - ((Math.max(-60, Math.min(0, db)) + 60) / 60) * (H - 8);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'curve');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Loudness over time with silences, onsets and cuts');
  const add = (tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  };
  for (const s of a.silences) add('rect', { x: x(s.start), y: 0, width: Math.max(1, x(s.end) - x(s.start)), height: H, fill: 'rgba(141,133,123,0.25)' });
  for (const s of b.shots.slice(1)) add('line', { x1: x(s.start), x2: x(s.start), y1: 0, y2: H, stroke: '#14100E', 'stroke-width': 1, 'stroke-dasharray': '3 3', 'vector-effect': 'non-scaling-stroke' });
  add('polyline', { points: vals.map((v, i) => `${x(i * a.curve.step_seconds).toFixed(1)},${y(v).toFixed(1)}`).join(' '), fill: 'none', stroke: '#64694B', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' });
  for (const t of a.onsets) add('line', { x1: x(t), x2: x(t), y1: H - 12, y2: H, stroke: '#E87757', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' });
  return svg;
}

function breakdownView(job, b, file) {
  const p = b.pacing;
  const seek = (t) => file && playRange(openPlayer(job.id, file, { note: ANALYSIS_NOTE }), t);
  const stat = (value, label, title) => h('div', { class: 'stat', title: title || null }, h('b', {}, value), h('span', {}, label));
  const audio = b.audio.available
    ? h('div', {}, loudnessChart(b),
      h('p', { class: 'muted small', style: 'margin-top:0.4rem' },
        `Green line is loudness. Grey bands are silences (${b.audio.silences.length}). Coral ticks are onsets (${b.audio.onsets.length}). Dashed lines are cuts.` +
        (b.audio.integrated_lufs !== null ? ` Overall loudness ${b.audio.integrated_lufs} LUFS.` : '')),
      h('p', { class: 'muted small' }, b.audio.onset_rule))
    : h('p', { class: 'muted' }, `Not available. ${b.audio.reason}`);
  const transcript = b.transcript.available
    ? h('div', { class: 'stack' }, b.transcript.segments.map((s) => h('div', { class: 'row', style: 'align-items:flex-start;flex-wrap:nowrap' }, h('button', { class: 'quiet tiny', onclick: () => seek(s.start) }, secs(s.start)), h('span', {}, s.text))))
    : h('p', { class: 'muted' }, `Transcript not available. ${b.transcript.reason}`);
  const text = b.on_screen_text;
  const flagged = text.frames.filter((f) => f.needs_review);
  return h('section', { id: 'breakdown' },
    h('div', { class: 'section-title' }, h('h2', {}, 'Breakdown'), h('span', { class: 'muted small', style: 'overflow-wrap:anywhere' }, `${b.reference} · ${when(b.generated_at)}`)),
    h('div', { class: 'stack' },
      h('div', { class: 'stats' },
        stat(secs(b.specs.duration), 'length'), stat(`${b.specs.width}x${b.specs.height}`, `${b.specs.aspect} · ${b.specs.fps} fps`),
        stat(p.shot_count, 'shots'), stat(p.cut_count, 'cuts'), stat(`${p.avg_shot_seconds}s`, 'average shot'),
        stat(p.cuts_per_10s, 'cuts per 10s'), stat(`${p.hook_seconds}s`, `hook (${p.hook_basis})`, p.hook_rule)),
      h('div', {}, h('h3', {}, 'Shot timeline'),
        h('p', { class: 'muted small' }, 'Each block is one shot, sized by its length. Press one to play the reference from there.'),
        h('div', { class: 'strip-wrap' }, h('div', { class: 'strip', style: `min-width:${Math.max(100, b.shots.length * 48)}px` }, b.shots.map((s) =>
          h('button', { class: 'shot', style: `flex-grow:${Math.max(0.05, s.duration)};${s.thumb ? bg(refAsset(job.id, s.thumb)) : ''}`, title: `Shot ${s.n}: ${secs(s.start)} to ${secs(s.end)}`, onclick: () => seek(s.start) },
            h('span', {}, `${s.n} · ${s.duration.toFixed(1)}s`)))))),
      h('p', { class: 'muted small' }, `Hook rule: ${p.hook_rule}`),
      h('div', {}, h('h3', {}, 'Sound'), audio),
      h('div', {}, h('h3', {}, 'Frame and crop'), h('ul', { class: 'small', style: 'margin:0.3rem 0;padding-left:1.1rem' }, b.aspect.notes.map((n) => h('li', {}, n)))),
      h('div', {}, h('h3', {}, 'Transcript'), transcript),
      h('div', {}, h('h3', {}, 'On-screen text to check'),
        h('p', { class: 'muted small' }, text.ocr === 'not available' ? `${text.reason} ${text.sample_rule}` : `${flagged.length} of ${text.frames.length} sampled frames look like they have text. ${text.sample_rule}`),
        flagged.length ? h('div', { class: 'frames' }, flagged.map((f) => h('figure', {}, h('img', { src: refAsset(job.id, f.thumb), alt: `Frame at ${secs(f.t)}`, loading: 'lazy' }), h('figcaption', {}, `${secs(f.t)}${f.text ? ' · ' + f.text.slice(0, 60) : ''}`)))) : h('p', { class: 'muted' }, 'No frames flagged.')),
      h('div', { class: 'row' }, h('button', { class: 'primary', onclick: async () => {
        const replace = state.plan && state.plan.summary.assigned_count > 0;
        if (replace && !confirm('This job already has a match plan with clips assigned. Replace it with a fresh empty one?')) return;
        const plan = await run(() => api('POST', `/api/jobs/${enc(job.id)}/match-plan`, { reference: b.reference, force: replace }));
        if (plan) { toast(`Match plan ready: ${plan.slots.length} empty slots`); refreshJob(); }
      } }, state.plan ? 'Rebuild match plan from this reference' : 'Create match plan from this reference'),
      h('a', { class: 'small muted', href: `/api/jobs/${enc(job.id)}/references/${enc(b.reference)}/breakdown`, target: '_blank', rel: 'noopener' }, 'Breakdown JSON'))));
}

function planView(job, plan) {
  const sources = job.files.source.filter((f) => f.kind === 'video');
  const base = `/api/jobs/${enc(job.id)}/match-plan`;
  const slots = plan.slots.map((s) => {
    const a = s.assignment;
    const role = h('select', { 'aria-label': `Role for slot ${s.n}`, onchange: async () => { await run(() => api('PATCH', `${base}/slots/${s.n}`, { role: role.value }), 'Role saved'); refreshJob(); } },
      h('option', { value: '', selected: !s.role }, `${s.suggested_role} (suggested)`),
      plan.roles.map((r) => h('option', { value: r, selected: s.role === r }, r)));
    const src = h('select', { 'aria-label': `Source clip for slot ${s.n}` }, h('option', { value: '' }, 'Choose a source clip…'), sources.map((f) => h('option', { value: f.name, selected: a && a.source === f.name }, `${f.name} (${secs(f.probe && f.probe.duration)})`)));
    const inEl = h('input', { type: 'number', min: 0, step: 0.1, value: a ? a.in : 0, 'aria-label': 'In' });
    const outEl = h('input', { type: 'number', min: 0, step: 0.1, value: a ? a.out : '', placeholder: `in + ${s.duration}`, 'aria-label': 'Out' });
    const userNotes = h('input', { type: 'text', class: 'grow', placeholder: 'Your note for this slot', value: s.user_notes || '', onchange: () => run(() => api('PATCH', `${base}/slots/${s.n}`, { notes: userNotes.value }), 'Note saved') });
    return h('div', { class: `item slot${a ? ' assigned' : ''}` },
      h('div', {}, s.reference_thumb ? h('div', { class: 'thumb mini', style: bg(refAsset(job.id, s.reference_thumb)), title: 'Reference shot (analysis only)' }) : null,
        h('div', { class: 'muted small', style: 'margin-top:0.2rem' }, 'reference shot')),
      h('div', {},
        h('div', { class: 'row spread' }, h('div', {}, h('b', {}, `Slot ${s.n}`), ` · ${s.duration}s · ${secs(s.start)} to ${secs(s.end)}`), a ? h('span', { class: 'badge ok' }, 'assigned') : h('span', { class: 'badge' }, 'empty')),
        h('ul', {}, s.notes.map((n) => h('li', {}, n))),
        h('div', { class: 'row' }, h('label', {}, 'Role', role), h('label', { class: 'grow' }, 'Note', userNotes)),
        h('div', { class: 'row', style: 'margin-top:0.5rem;align-items:flex-end' }, h('label', { class: 'grow' }, 'Your clip', src), h('label', {}, 'In', inEl), h('label', {}, 'Out', outEl),
          h('button', { class: 'primary tiny', onclick: async () => {
            const body = { source: src.value, in: Number(inEl.value) || 0 };
            if (outEl.value !== '') body.out = Number(outEl.value);
            const ok = await run(() => api('PUT', `${base}/slots/${s.n}/assignment`, body), `Slot ${s.n} assigned`);
            if (ok) refreshJob();
          } }, a ? 'Update' : 'Assign'),
          a ? h('button', { class: 'quiet tiny', onclick: async () => { await run(() => api('DELETE', `${base}/slots/${s.n}/assignment`), `Slot ${s.n} cleared`); refreshJob(); } }, 'Clear') : null),
        a && a.fit_notes.length ? h('div', { class: 'small', style: 'margin-top:0.35rem;color:var(--oak);font-weight:700' }, a.fit_notes.join(' ')) : null));
  });
  const sum = plan.summary;
  const dest = h('select', { 'aria-label': 'Save to' }, h('option', { value: 'build' }, 'into build'), h('option', { value: 'out' }, 'into out'));
  return h('section', { id: 'match-plan' },
    h('div', { class: 'section-title' }, h('h2', {}, 'Match plan'), h('span', { class: 'muted small', style: 'overflow-wrap:anywhere' }, `from ${plan.reference} · ${sum.assigned_count} of ${sum.slot_count} slots assigned`)),
    h('p', { class: 'muted small' }, `One empty slot per reference shot. You choose which of your clips goes where. ${plan.role_rule}`),
    sources.length ? null : h('p', { class: 'notice' }, 'Add raw footage on the Files tab to fill these slots.'),
    h('div', { class: 'list' }, slots),
    h('div', { class: 'card', style: 'margin-top:1rem' },
      h('div', { class: 'row' }, h('button', { class: 'primary', disabled: sum.assigned_count === 0, onclick: async () => {
        const r = await run(() => api('POST', `${base}/render`, { dest: dest.value }));
        if (r) { toast(`Rough cut queued: ${r.output.folder}/${r.output.name}`); location.hash = `#/job/${enc(job.id)}/renders`; }
      } }, 'Queue rough cut'), dest),
      h('p', { class: 'muted small', style: 'margin:0.5rem 0 0' }, sum.assigned_count === 0 ? 'Assign at least one slot to make a rough cut.'
        : sum.unassigned_slots.length ? `Slots ${sum.unassigned_slots.join(', ')} are empty and will be skipped. Nothing is made up to fill them. The cut uses only your source clips (${secs(sum.assigned_seconds)} so far).`
          : `All slots are assigned. The cut uses only your source clips (${secs(sum.assigned_seconds)}).`)));
}

// ---- router ----------------------------------------------------------------

async function route() {
  clearInterval(state.timer);
  if (player.open) player.close();
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  try {
    if (parts[0] === 'job' && parts[1]) await jobView(parts[1], parts[2]);
    else {
      state.job = null;
      if (parts[0] === 'inbox') await inboxView();
      else if (parts[0] === 'queue') await queueView();
      else if (parts[0] === 'activity') await activityView();
      else await jobsView();
    }
  } catch (e) {
    view.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'Something went wrong'), h('p', {}, e.message), h('a', { class: 'btn', href: '#/' }, 'Back to jobs')));
  }
}
window.addEventListener('hashchange', route);
route();
