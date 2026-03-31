const CACHE_NAME = 'uteq-connect-v1';

// Archivos del shell de la app que se cachean al instalar
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

/* ============================
   INSTALL — cachear el shell
============================ */

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

/* ============================
   ACTIVATE — limpiar caches viejos
============================ */

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* ============================
   FETCH — estrategia por tipo
============================ */

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar peticiones no-GET
  if (event.request.method !== 'GET') return;

  // ── Llamadas al API → Network First ──
  // Si hay red, trae datos frescos y los cachea.
  // Si no hay red, devuelve lo que haya en caché.
  if (url.port === '3000' || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ── Resto (JS, CSS, imágenes, HTML) → Cache First ──
  // Sirve desde caché si existe; si no, va a la red y cachea.
  // Si falla la red y no hay caché → página offline.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Navegación sin conexión → offline.html
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
    })
  );
});

/* ============================
   PUSH NOTIFICATIONS
============================ */

self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); }
  catch { data = { title: 'UTEQ Connect', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'UTEQ Connect', {
      body:  data.body  || 'Tienes una nueva notificación',
      icon:  '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag:   data.tag   || 'uteq-notif',
      data:  { url: data.url || '/' }
    })
  );
});

/* ============================
   CLICK EN NOTIFICACIÓN
============================ */

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

/* ============================
   MENSAJES DESDE LA APP
============================ */

self.addEventListener('message', event => {
  // La app le avisa al SW que hay una nueva versión lista
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Notificación desde la app (igual que el ejemplo del profe)
  if (event.data?.type === 'NOTIFY_SAVE') {
    self.registration.showNotification('UTEQ Connect', {
      body: event.data.message || 'Cambios guardados',
      icon: '/icons/icon-192x192.png'
    });
  }
});
