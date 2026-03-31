const CACHE_NAME = 'uteq-connect-v1';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ─────────────────────────────────────────
//  INSTALL
// ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────
//  ACTIVATE — limpiar cachés viejos
// ─────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────
//  FETCH
//  Online  → sirve caché inmediato + actualiza en background
//  Offline → caché, si no hay → offline.html
// ─────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // API del servidor → siempre red, fallback caché
  if (event.request.url.includes(':3000') || event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone(); // clonar ANTES de usar
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell → Stale While Revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(response => {
          const clone = response.clone(); // clonar ANTES de usar
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          if (!cached && event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });

      return cached || fetchPromise;
    })
  );
});

// ─────────────────────────────────────────
//  PUSH NOTIFICATIONS
// ─────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'UTEQ Connect', body: 'Tienes una nueva notificación.' };

  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch { data.body = event.data.text(); }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:     data.body,
      icon:     '/icons/icon-192x192.png',
      badge:    '/icons/icon-72x72.png',
      vibrate:  [200, 100, 200],
      tag:      'uteq-push-' + Date.now(),
      renotify: true,
      data:     { url: data.url || '/' }
    })
  );
});

// ─────────────────────────────────────────
//  CLICK EN NOTIFICACIÓN
// ─────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─────────────────────────────────────────
//  MENSAJES DESDE LA APP
// ─────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'NOTIFY_SAVE') {
    self.registration.showNotification(event.data.title || 'UTEQ Connect', {
      body:  event.data.message || 'Cambios guardados',
      icon:  '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    });
  }
});