const CACHE_NAME = 'lent-guide-2026-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果在缓存中找到，则返回缓存
        if (response) {
          return response;
        }
        // 否则通过网络获取
        return fetch(event.request);
      })
  );
});