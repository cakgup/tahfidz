const CACHE_NAME = 'hifz-companion-v57-mode-top';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css?v=20260617-mode-top',
  './js/config.js?v=20260617-mode-top',
  './js/app.js?v=20260617-mode-top',
  './data/quran-kemenag-combined.json',
  './data/quran-kemenag-index.json',
  './manifest.webmanifest',
  './assets/logo.png',
  './assets/logo-manifest-192.png',
  './assets/logo-manifest-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isLocal = url.origin === location.origin;
  const isNavigation = event.request.mode === 'navigate' || (event.request.destination === 'document' && isLocal);
  if(isNavigation){
    event.respondWith(fetch(event.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
    const copy = res.clone();
    if(isLocal) caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return res;
  }).catch(() => caches.match('./index.html'))));
});
