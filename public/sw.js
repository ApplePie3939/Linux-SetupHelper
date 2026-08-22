const CACHE = "linux-setup-helper-v4";
const APP_SHELL = ["./", "index.html", "manifest.webmanifest", "icon.svg"];
const appUrl = (path) => new URL(path, self.registration.scope).toString();

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch(appUrl("index.html"), { cache: "no-cache" });
      const html = await response.text();
      const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map((match) => new URL(match[1], self.registration.scope).toString())
        .filter((path) => new URL(path).pathname.includes("/assets/"));
      await cache.addAll([...APP_SHELL.map(appUrl), ...assetPaths]);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      if (event.request.mode === "navigate") {
        try {
          const response = await fetch(event.request, { cache: "no-cache" });
          if (response.ok) {
            const cache = await caches.open(CACHE);
            await cache.put(appUrl("index.html"), response.clone());
          }
          return response;
        } catch {
          const fallback = await caches.match(appUrl("index.html"), {
            ignoreVary: true,
          });
          return fallback ?? Response.error();
        }
      }
      const cached = await caches.match(event.request, { ignoreVary: true });
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
