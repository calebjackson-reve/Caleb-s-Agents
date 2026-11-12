#!/usr/bin/env node
'use strict';
// Video Engine dashboard server. Localhost only. Web UI + JSON API + media from the storage root.
const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./lib/config');
const store = require('./lib/store');
const media = require('./lib/media');
const queue = require('./lib/queue');
const { act } = require('./lib/actions');
const { VxError } = store;

const PUBLIC = path.join(__dirname, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.ico': 'image/x-icon',
};
// Stored media is only ever sent with one of these types. Anything else downloads as a plain file.
const MEDIA_TYPES = {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.srt': 'text/plain; charset=utf-8', '.vtt': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

// method, path pattern, action name. :name segments become action arguments.
const ROUTES = [
  ['GET', '/api/jobs', 'jobs.list'],
  ['POST', '/api/jobs', 'job.create'],
  ['GET', '/api/jobs/:job', 'job.get'],
  ['PATCH', '/api/jobs/:job', 'job.update'],
  ['POST', '/api/jobs/:job/notes', 'note.add'],
  ['PATCH', '/api/jobs/:job/notes/:note', 'note.done'],
  ['GET', '/api/jobs/:job/files', 'files.list'],
  ['POST', '/api/jobs/:job/import', 'file.import'],
  ['PUT', '/api/jobs/:job/upload', 'file.upload'],
  ['GET', '/api/jobs/:job/probe', 'probe'],
  ['GET', '/api/jobs/:job/trims', 'trims.list'],
  ['POST', '/api/jobs/:job/trims', 'trim.add'],
  ['DELETE', '/api/jobs/:job/trims/:trim', 'trim.remove'],
  ['GET', '/api/jobs/:job/renders', 'renders.list'],
  ['POST', '/api/jobs/:job/renders', 'render.queue'],
  ['GET', '/api/renders', 'renders.list'],
  ['GET', '/api/renders/:id', 'render.get'],
  ['GET', '/api/jobs/:job/activity', 'activity'],
  ['GET', '/api/activity', 'activity'],
  ['GET', '/api/inbox', 'inbox.list'],
  ['POST', '/api/inbox/import', 'file.import'],
  ['PUT', '/api/inbox/upload', 'file.upload'],
  ['POST', '/api/inbox/move', 'inbox.move'],
  ['GET', '/api/inbox/probe', 'probe'],
  ['GET', '/api/jobs/:job/references', 'ref.list'],
  ['POST', '/api/jobs/:job/references', 'ref.add'],
  ['POST', '/api/jobs/:job/references/:name/breakdown', 'ref.breakdown'],
  ['GET', '/api/jobs/:job/references/:name/breakdown', 'ref.get-breakdown'],
  ['GET', '/api/jobs/:job/match-plan', 'plan.get'],
  ['POST', '/api/jobs/:job/match-plan', 'plan.create'],
  ['PATCH', '/api/jobs/:job/match-plan/slots/:slot', 'plan.slot'],
  ['PUT', '/api/jobs/:job/match-plan/slots/:slot/assignment', 'plan.assign'],
  ['DELETE', '/api/jobs/:job/match-plan/slots/:slot/assignment', 'plan.unassign'],
  ['POST', '/api/jobs/:job/match-plan/render', 'plan.render'],
].map(([method, pattern, action]) => {
  const keys = [];
  const rx = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  return { method, rx, keys, action, created: method === 'POST' && /(jobs|notes|trims|renders|references|match-plan|render|import)$/.test(pattern) };
});

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2) + '\n';
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(data);
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new VxError('Request body is too large.', 413));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) return resolve({});
      try {
        const data = JSON.parse(text);
        resolve(data && typeof data === 'object' && !Array.isArray(data) ? data : {});
      } catch {
        reject(new VxError('Request body must be JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function sendFile(req, res, abs, type, extra = {}) {
  const st = fs.statSync(abs);
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', ...extra };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  let start = 0;
  let end = st.size - 1;
  let status = 200;
  if (range && (range[1] || range[2]) && st.size > 0) {
    if (range[1]) {
      start = Number(range[1]);
      if (range[2]) end = Math.min(end, Number(range[2]));
    } else {
      start = Math.max(0, st.size - Number(range[2]));
    }
    if (start > end || start >= st.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
      return res.end();
    }
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
  }
  headers['Content-Length'] = st.size ? end - start + 1 : 0;
  res.writeHead(status, headers);
  if (req.method === 'HEAD' || !st.size) return res.end();
  fs.createReadStream(abs, { start, end }).on('error', () => res.destroy()).pipe(res);
}

// Brand fonts are not kept in git. They are served from public/fonts/ if copies are put there,
// otherwise from this machine's font folder. If neither has them the page falls back to system fonts.
const FONTS = {
  'instrument-serif.ttf': 'Instrument Serif/InstrumentSerif-Regular.ttf',
  'instrument-serif-italic.ttf': 'Instrument Serif/InstrumentSerif-Italic.ttf',
  'nunito.ttf': 'Nunito/Nunito-VariableFont_wght.ttf',
};
function serveFont(req, res, name) {
  if (!FONTS[name]) return send(res, 404, { error: 'Not found.' });
  const places = [path.join(PUBLIC, 'fonts', name), path.join(config.fontDir, FONTS[name])];
  const abs = places.find((p) => fs.existsSync(p));
  if (!abs) return send(res, 404, { error: 'Font not on this machine. The page uses a fallback.' });
  return sendFile(req, res, abs, 'font/ttf', { 'Cache-Control': 'max-age=86400' });
}

function serveStatic(req, res, pathname) {
  if (pathname.startsWith('/fonts/')) return serveFont(req, res, pathname.slice(7));
  const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  const abs = path.resolve(PUBLIC, rel);
  if (!abs.startsWith(PUBLIC + path.sep) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return send(res, 404, { error: 'Not found.' });
  const type = TYPES[path.extname(abs).toLowerCase()] || 'application/octet-stream';
  // The page loads only its own files: no CDN, no outside scripts, fonts or images.
  sendFile(req, res, abs, type, { 'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
}

// Only this machine's own pages may call the API (blocks other sites and DNS rebinding).
// The page may be reached on another local port through an SSH tunnel, so the check is
// "known host name, and the Origin matches the Host", not a fixed port.
function guard(req) {
  const host = String(req.headers.host || '');
  const hostName = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  const okHosts = new Set(['127.0.0.1', 'localhost', '::1', config.host, ...config.allowedHosts]);
  if (!okHosts.has(hostName)) throw new VxError('Unknown host.', 403);
  const origin = req.headers.origin;
  if (origin && origin !== 'null') {
    let o;
    try {
      o = new URL(origin);
    } catch {
      throw new VxError('Bad origin.', 403);
    }
    if (o.host !== host) throw new VxError('Cross-site requests are not allowed.', 403);
  } else if (origin === 'null' && req.method !== 'GET') {
    throw new VxError('Cross-site requests are not allowed.', 403);
  }
}

async function handle(req, res, port) {
  const url = new URL(req.url, 'http://local');
  const pathname = url.pathname; // still percent-encoded; each segment is decoded exactly once below
  guard(req);
  const actor = String(req.headers['x-vx-actor'] || '').slice(0, 60).replace(/[^\w .@-]/g, '') || 'api';

  if (pathname === '/api/health') {
    return send(res, 200, { ok: true, app: 'video-dashboard', storage_root: config.root, host: config.host, port });
  }

  if (pathname.startsWith('/api/')) {
    const route = ROUTES.find((r) => r.method === req.method && r.rx.test(pathname));
    if (!route) return send(res, 404, { error: `No API route for ${req.method} ${pathname}.` });
    const m = route.rx.exec(pathname);
    const args = Object.fromEntries(url.searchParams);
    if (route.action === 'file.upload') args.stream = req;
    else if (req.method !== 'GET' && req.method !== 'DELETE') Object.assign(args, await readBody(req));
    route.keys.forEach((k, i) => (args[k] = decodeURIComponent(m[i + 1])));
    if (route.action === 'probe') delete args.path; // probing any path on the box is CLI only
    if (pathname === '/api/inbox/import' || pathname === '/api/inbox/upload' || pathname === '/api/inbox/probe') args.job = null;
    const result = await act(route.action, args, actor);
    return send(res, route.created ? 201 : 200, result);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });

  const parts = pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
  if (parts[0] === 'media' && parts.length >= 3) {
    const abs = store.resolveMedia(parts[1], parts.slice(2));
    const type = MEDIA_TYPES[path.extname(abs).toLowerCase()];
    const name = path.basename(abs).replace(/[^\w.-]/g, '_');
    const disposition = type && !url.searchParams.has('download') ? 'inline' : 'attachment';
    return sendFile(req, res, abs, type || 'application/octet-stream', { 'Content-Disposition': `${disposition}; filename="${name}"` });
  }
  if (parts[0] === 'thumb' && parts.length === 4) {
    const job = parts[1] === '_inbox' ? null : parts[1];
    const file = await media.thumb(job, job ? parts[2] : 'inbox', parts[3]);
    if (!file) return send(res, 404, { error: 'No thumbnail for this file.' });
    return sendFile(req, res, file, 'image/jpeg', { 'Cache-Control': 'max-age=60' });
  }
  return serveStatic(req, res, pathname);
}

function createServer() {
  store.ensureRoot();
  const server = http.createServer((req, res) => {
    const port = server.address() ? server.address().port : config.port;
    handle(req, res, port).catch((e) => {
      const status = e instanceof VxError ? e.status : e instanceof URIError ? 400 : 500;
      if (status === 500) console.error(e);
      if (res.headersSent) return res.destroy();
      send(res, status, { error: status === 500 ? `Server error: ${e.message}` : e.message });
    });
  });
  server.requestTimeout = 0; // large uploads and long breakdowns
  return server;
}

function start({ host = config.host, port = config.port, worker = true } = {}) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, host, () => {
      if (worker) queue.startWorker();
      resolve(server);
    });
  });
}

if (require.main === module) {
  start().then((server) => {
    const { address, port } = server.address();
    console.log(`Video Engine dashboard: http://${address}:${port}`);
    console.log(`Storage root: ${config.root}`);
  }).catch((e) => {
    console.error(e.code === 'EADDRINUSE' ? `Port ${config.port} is already in use. Set VX_PORT to another port.` : e.message);
    process.exit(1);
  });
}

module.exports = { start, createServer };
