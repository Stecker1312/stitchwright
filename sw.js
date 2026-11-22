/**
 * Offline cache.
 *
 * The app is static. After the first visit every required asset is cached
 * locally, so the editor keeps working without a network. Optional pages are
 * cached separately: a missing optional file must not block the core app.
 * Failed installations keep the last complete cache active.
 */

const CACHE_PREFIX = "stitchwright-";
const CACHE = `${CACHE_PREFIX}v0.6.1`;

// A failed core asset means the app cannot start. Installation must fail and
// leave the previous cache in place.
const REQUIRED = [
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
  "src/version.js",
  "src/core/chart.js",
  "src/core/color.js",
  "src/core/guides.js",
  "src/core/i18n.js",
  "src/core/legend.js",
  "src/core/render-canvas.js",
  "src/core/render-svg.js",
  "src/core/run-lengths.js",
  "src/core/symbols.js",
  "src/core/units.js",
  "src/core/validate.js",
  "src/core/viewport.js",
  "src/ui/canvas-view.js",
  "src/ui/custom-cables.js",
  "src/ui/inspector.js",
  "src/ui/palette.js",
  "src/ui/persistence.js",
  "src/ui/store.js",
  "src/locales/de.json",
  "src/locales/en.json",
  "src/locales/languages.json"
];

const OPTIONAL = [
  "about.html",
  "about.css",
  "assets/screenshot-editor.png",
  "how-to.html",
  "how-to.de.html",
  "docs/how-to.md",
  "docs/how-to.de.md"
];

function isOurs(key) {
  return key.startsWith(CACHE_PREFIX);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Required assets are atomic: one failure aborts the installation.
    await Promise.all(REQUIRED.map((url) => cache.add(url)));
    // Optional assets may be absent without making the editor unusable.
    await Promise.all(OPTIONAL.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => isOurs(key) && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Explicit development bypass. A query flag must bypass an already active
  // service worker too, not only new registrations.
  if (url.searchParams.has("nosw")) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        event.waitUntil(cache.put(request, response.clone()));
      }
      return response;
    } catch {
      if (request.mode === "navigate") {
        const shell = await cache.match("index.html");
        if (shell) return shell;
      }
      throw new Error("Offline and not cached");
    }
  })());
});
