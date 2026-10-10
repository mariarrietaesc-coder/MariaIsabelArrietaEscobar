// Permite abrir la app sin internet: primero intenta la red y, si falla,
// usa la última copia guardada. Los datos los maneja Firebase por su cuenta.
const CACHE = 'radios-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  const propio = url.origin === location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname);
  const firebaseSdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (req.method !== 'GET' || !(propio || firebaseSdk)) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch (err) {
      const copia = await caches.match(req, { ignoreSearch: true });
      if (copia) return copia;
      throw err;
    }
  })());
});
