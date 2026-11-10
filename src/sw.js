// The offline copy of the app (SPEC §11). The build prepends VERSION and FILES (tools/offline.ts) and serves
// this as sw.js. Every request for the app's own files is answered from the copy, so the app opens with no
// network. A new build installs in the background and takes over on the next launch.
/* global VERSION, FILES */
const PREFIX = 'qimen-';
const CACHE = PREFIX + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // 'reload' skips the HTTP cache, so the copy never mixes files from two builds. If any file fails,
      // the install fails and the previous copy stays in use.
      .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit =
        // ignoreVary: a server that sends `Vary: Origin` would otherwise miss the copy for the page's
        // crossorigin script and stylesheet, whose requests carry an Origin header the install's did not.
        (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) ??
        // Any page address inside the app (index.html, a stray query) opens the app.
        (request.mode === 'navigate' ? await cache.match('./') : undefined);
      return hit ?? fetch(request);
    }),
  );
});
