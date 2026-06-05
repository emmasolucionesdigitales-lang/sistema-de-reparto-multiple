const CACHE = 'reparto-multi-v2';
const ASSETS = [
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

// Librerías pesadas de CDN (versionadas, no cambian) → caché primero.
// Todo lo demás (index.html y los .js de la app) → red primero, así
// siempre ves la última versión; si no hay internet, usa la caché.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  const esLibCDN = url.includes('unpkg.com') ||
                   url.includes('jsdelivr.net') ||
                   url.includes('cdnjs.cloudflare.com') ||
                   url.includes('gstatic.com') ||
                   url.includes('googleapis.com');

  if (esLibCDN) {
    // Caché primero (rápido y offline para las librerías)
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // Red primero para la app (siempre lo último), caché de respaldo offline
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
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
