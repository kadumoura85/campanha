const CACHE_NAME = "campanha-pwa-v1";

function getBasePath() {
  const scope = self.registration?.scope || "/";
  const url = new URL(scope);
  return url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
}

self.addEventListener("install", (event) => {
  const basePath = getBasePath();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        basePath,
        `${basePath}manifest.webmanifest`,
        `${basePath}favicon.svg`,
        `${basePath}opengraph.jpg`,
      ]),
    ),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const basePath = getBasePath();

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(`${basePath}api`) || url.pathname.startsWith(`${basePath}uploads`)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(basePath, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(basePath);
          return cached || Response.error();
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});
