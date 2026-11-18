/**
 * Offline cache.
 *
 * The app is static. After the first visit every asset is cached locally, so
 * the editor keeps working without a network. There are no external origins
 * and no analytics to cache or leak.
 */

const CACHE = "stitchwright-v0.1.11";

const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "favicon.ico",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "src/styles.css",
  "src/app.js",
  "src/demo.js",
  "src/core/chart.js",
  "src/core/color.js",
  "src/core/i18n.js",
  "src/core/legend.js",
  "src/core/render-canvas.js",
  "src/core/render-svg.js",
  "src/core/symbols.js",
  "src/core/units.js",
  "src/core/validate.js",
  "src/core/viewport.js",
  "src/ui/canvas-view.js",
  "src/ui/inspector.js",
  "src/ui/palette.js",
  "src/ui/persistence.js",
  "src/ui/store.js",
  "src/locales/de.json",
  "src/locales/en.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // Cache each file separately. A single missing optional asset must not
      // block the whole offline installation.
      await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
      await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      if (request.mode === "navigate") {
        return caches.match("index.html");
      }
      throw new Error("Offline and not cached");
    }
  })());
});
