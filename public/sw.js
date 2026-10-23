// TechNova AI Hub service worker.
// - Pages: always from the network (they are personalised); offline.html when the network is down.
// - Build assets (/assets/*, hashed and immutable) and icons/media: cache-first.
// - Never cached: API, server functions, auth, payments, published sites, other origins.
const VERSION = "technova-v1";
const STATIC = `${VERSION}-static`;
const PRECACHE = ["/offline.html", "/favicon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const NEVER = [/^\/api\//, /^\/_serverFn/, /^\/oauth\//, /^\/s\//, /^\/apercu\//, /^\/partage\//];

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER.some((re) => re.test(url.pathname))) return;
  if (request.headers.has("range")) return; // video streaming stays with the browser

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || /\.(?:png|jpe?g|webp|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok && response.type === "basic") cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
