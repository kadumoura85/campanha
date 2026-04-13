const CACHE_STATIC = "campanha-static-v2";
const CACHE_DYNAMIC = "campanha-dynamic-v2";

function getBasePath() {
  const scope = self.registration?.scope || "/";
  const url = new URL(scope);
  return url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
}

// Assets estáticos que devem ser cacheados na instalação
const STATIC_ASSETS = [
  "manifest.webmanifest",
  "favicon.svg",
  "opengraph.jpg",
];

self.addEventListener("install", (event) => {
  const basePath = getBasePath();

  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      const urlsToCache = [basePath, ...STATIC_ASSETS.map((asset) => `${basePath}${asset}`)];
      return cache.addAll(urlsToCache);
    }),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![CACHE_STATIC, CACHE_DYNAMIC].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );

  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const basePath = getBasePath();

  // Apenas GET requests
  if (request.method !== "GET") return;

  // Apenas requisições do mesmo origin
  if (url.origin !== self.location.origin) return;

  // Pular API e uploads (devem funcionar online)
  if (url.pathname.startsWith(`${basePath}api`) || url.pathname.startsWith(`${basePath}uploads`)) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Requer conexão com a internet" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    return;
  }

  // Para navegação (HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_DYNAMIC).then((cache) => cache.put(basePath, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(basePath);
          return cached || new Response("Página não disponível offline", { status: 404 });
        }),
    );
    return;
  }

  // Para assets estáticos (JS, CSS, imagens, fontes)
  const isStaticAsset = /\.(js|css|svg|png|jpg|jpeg|gif|woff|woff2|ttf|eot)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Para outros requests, usar stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_DYNAMIC).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});
