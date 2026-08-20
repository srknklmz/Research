/* Kabuk önbelleği. Çevrimdışı çalışma hedef değil (tercih 3b) — bu service
   worker yalnızca uygulamanın kurulabilir olması ve açılışın hızlanması için
   var. Veri dosyaları bilerek önbelleğe alınmaz; her zaman ağdan okunur. */
const AD = "beyin-kabuk-v1";
const KABUK = ["./", "./index.html", "./stil.css", "./uygulama.js",
               "./manifest.webmanifest", "./ikon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(AD).then(c => c.addAll(KABUK)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== AD).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.endsWith(".json")) return;            // veri hep taze
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const kopya = r.clone();
        caches.open(AD).then(c => c.put(e.request, kopya)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
