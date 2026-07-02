const CACHE = 'reparto-multi-v3';
const ASSETS = [
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // 1) NO interceptar Firebase/Google (rompe con "Failed to convert to Response")
  if (
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('firebaseio.com') ||
    url.includes('firebase.com') ||
    url.includes('firestore.googleapis') ||
    url.includes('securetoken.googleapis')
  ) return; // lo maneja el navegador directo

  // 2) Librerías pesadas de CDN (versionadas) -> CACHÉ primero
  if (url.includes('unpkg.com') || url.includes('jsdelivr.net') || url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res && res.ok) { const cl = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); }
        return res;
      }).catch(() => new Response('', { status: 503 })))
    );
    return;
  }

  // 3) App (index.html y .js) -> RED primero (siempre lo último), caché de respaldo offline
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.ok) { const cl = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); }
      return res;
    }).catch(() => caches.match(e.request).then(c => c || new Response('', { status: 503 })))
  );
});

// ── PUSH (notificaciones con la app cerrada) ──
self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(d.title || 'Notificación', {
      body: d.body || '',
      tag: d.tag || 'default',
      requireInteraction: !!d.requireInteraction,
      icon: 'icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(cs => {
      if (cs.length > 0) { cs[0].focus(); return; }
      clients.openWindow('./');
    })
  );
});
