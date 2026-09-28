// Uygulama kabuğunu önbellekte tutar; şantiyede zayıf bağlantıda da ekran
// hemen açılır. Veri (Supabase) başka adreste olduğu için hiç önbelleğe
// alınmaz, her zaman canlı gelir.
const ONBELLEK = 'imalat-kabuk-v1'
const KABUK = ['/', '/manifest.webmanifest', '/favicon.svg', '/ikon-192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(ONBELLEK).then((c) => c.addAll(KABUK)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((adlar) => Promise.all(adlar.filter((a) => a !== ONBELLEK).map((a) => caches.delete(a))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const istek = e.request
  const url = new URL(istek.url)
  if (istek.method !== 'GET' || url.origin !== self.location.origin) return

  // Sayfa: önce ağ (yeni sürüm hemen gelsin), ağ yoksa önbellekteki kabuk.
  if (istek.mode === 'navigate') {
    e.respondWith(
      fetch(istek)
        .then((yanit) => {
          const kopya = yanit.clone()
          caches.open(ONBELLEK).then((c) => c.put('/', kopya))
          return yanit
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Derlenmiş dosyalar adlarında sürüm taşıdığı için değişmez: önce önbellek.
  if (url.pathname.startsWith('/assets/') || KABUK.includes(url.pathname)) {
    e.respondWith(
      caches.match(istek).then(
        (onbellekte) =>
          onbellekte ??
          fetch(istek).then((yanit) => {
            if (yanit.ok) {
              const kopya = yanit.clone()
              caches.open(ONBELLEK).then((c) => c.put(istek, kopya))
            }
            return yanit
          }),
      ),
    )
  }
})
