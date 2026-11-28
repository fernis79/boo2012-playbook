/* Boo FF P12:3 – service worker. Version 1.6 */
const VERSION = "1.6";
const APP = "boo-p12-app-" + VERSION, FILES = "boo-p12-files", FONTS = "boo-p12-fonts";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "favicon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("boo-p12-app-") && k !== APP) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Google Fonts: serve from cache, refresh in background
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Encrypted downloads: network first, fall back to the last downloaded copy
  if (url.pathname.includes("/files/")) {
    e.respondWith(fetch(req).then((r) => { if (r.ok) caches.open(FILES).then((c) => c.put(req, r.clone())); return r; }).catch(() => caches.match(req)));
    return;
  }
  // App shell (index.html and icons): cache first – works without network
  if (req.mode === "navigate") {
    e.respondWith(caches.open(APP).then(async (c) => (await c.match("index.html")) || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
