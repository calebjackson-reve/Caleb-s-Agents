/* Pipeline service worker: the app shell for the home-screen icon, the last copy of the data for when the Mac
   can't be reached, and the phone alerts. It never caches a send, and nothing it stores leaves the phone. */
const SHELL = 'pipeline-shell-v1', DATA = 'pipeline-data-v1';
const FILES = ['/', '/app.css', '/cc.css', '/app.js', '/core.js', '/voice.js', '/map.js', '/mapviews.js', '/cc.js', '/cc-pages.js',
  '/cc-score.js', '/cc-life.js', '/cc-sources.js', '/favicon.svg', '/icon-192.png', '/manifest.webmanifest'];
const READS = ['/api/cc', '/api/state', '/api/alerts'];

self.addEventListener('install', e => e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== DATA).map(k => caches.delete(k)))).then(() => self.clients.claim())));

async function tell(msg) { (await self.clients.matchAll()).forEach(c => c.postMessage(msg)); }

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;  // POSTs (sends, writes) always go to the Mac
  if (READS.includes(u.pathname)) {
    // Network first. A good answer is kept; when the Mac can't be reached, the kept copy is used and the page is told.
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(DATA).then(x => x.put(u.pathname, c)); tell({ online: true }); } return r; })
      .catch(async () => { const hit = await caches.match(u.pathname, { cacheName: DATA }); tell({ online: false }); return hit || new Response(JSON.stringify({ ok: false, error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }); }));
    return;
  }
  if (u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok && FILES.includes(u.pathname)) { const c = r.clone(); caches.open(SHELL).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { cacheName: SHELL }).then(h => h || caches.match('/', { cacheName: SHELL }))));
});

// A push carries no text. Fetch the newest alert from Pipeline (behind the login) and show it.
self.addEventListener('push', e => e.waitUntil((async () => {
  let a = { title: 'Pipeline', body: 'Something needs a look.', page: 'dash' };
  try { const r = await fetch('/api/alerts', { credentials: 'same-origin' }); const d = await r.json(); if (d.rows && d.rows[0]) a = d.rows[0]; } catch (err) { }
  await self.registration.showNotification(a.title, { body: a.body, icon: '/icon-192.png', badge: '/icon-192.png', tag: a.kind || 'pipeline', data: { page: a.page || 'dash' } });
})()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = '/#' + ((e.notification.data && e.notification.data.page) || 'dash');
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => { const c = cs[0]; return c ? c.navigate(url).then(x => x && x.focus()) : self.clients.openWindow(url); }));
});
