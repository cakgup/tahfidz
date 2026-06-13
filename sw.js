const CACHE_NAME = 'hifz-companion-v16-ayah-card-refresh';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css?v=20260613-ayah-card-refresh',
  './js/config.js?v=20260613-ayah-card-refresh',
  './js/app.js?v=20260613-ayah-card-refresh',
  './data/quran-kemenag-combined.json',
  './data/quran-kemenag-index.json',
  './manifest.webmanifest',
  './assets/icon.svg'
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
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
    const copy = res.clone();
    if(new URL(event.request.url).origin === location.origin) caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return res;
  }).catch(() => caches.match('./index.html'))));
});
