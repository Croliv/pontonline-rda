const CACHE_NAME = "ponto-rda-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo-rda.png",
  "/marca-dagua.png"
];

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(keys => {

      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );

    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {

  const requestUrl = new URL(event.request.url);

  // Não cacheia Apps Script
  if (
    requestUrl.origin.includes("script.google.com")
  ) {
    return;
  }

  event.respondWith(

    caches.match(event.request).then(cached => {

      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then(response => {

          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });

          return response;
        })
        .catch(() => {
          return caches.match("/");
        });

    })

  );

});