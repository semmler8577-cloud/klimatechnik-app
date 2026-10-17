/* Service Worker – Klimatechnik-App. Version wird beim Build gesetzt. */
const VERSION = "1792267424";
const CACHE = "klima-" + VERSION;
const SHELL = ["./", "index.html", "manifest.webmanifest", "data.json", "icon-192.png", "icon-512.png", "icon-maskable-192.png", "icon-maskable-512.png", "apple-touch-icon.png", "icon.svg"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("klima-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // externe Links (Quellen, News) nicht abfangen
  // data.json: Netzwerk zuerst, Fallback Cache
  if (url.pathname.endsWith("/data.json")) {
    e.respondWith(fetch(req, {cache: "no-cache"}).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put("data.json", cp)); }
      return res;
    }).catch(() => caches.match("data.json")));
    return;
  }
  // Navigation: App-Shell aus dem Cache
  if (req.mode === "navigate") {
    e.respondWith(caches.match("index.html").then(r => r || fetch(req)));
    return;
  }
  // Rest: Cache zuerst, sonst Netzwerk (und nachcachen)
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(r => r || fetch(req).then(res => {
    if (res.ok && res.type === "basic") { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  })));
});
