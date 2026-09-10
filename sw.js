const CACHE_NAME = "music-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Stale-while-revalidate for this app's own static assets only. API calls
// and the JioSaavn media CDN are on other origins and are left untouched.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });

      if (cached) {
        // Serve the cached copy immediately; refresh the cache in the
        // background and swallow failures since a response was already sent.
        network.catch(() => {});
        return cached;
      }
      // No cached copy: let the network promise (and its rejection, if any)
      // propagate, so an unreachable, never-cached resource correctly
      // surfaces as a network error instead of resolving to `undefined`.
      return network;
    }),
  );
});
