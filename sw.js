// 修改版本号，强制客户端更新 Service Worker (每次修改 index.html 后，建议把这里的 v2 改成 v3、v4...)
const CACHE_NAME = 'lent-guide-2026-v2'; 
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest'
];

// 安装阶段：缓存新资源
self.addEventListener('install', event => {
  self.skipWaiting(); // 强制新 SW 立即接管控制权
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 激活阶段：清理旧版本的幽灵缓存（非常关键！）
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('清除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // 立即控制所有打开的页面
});

// 拦截请求：采用 "Stale-While-Revalidate" (优先使用缓存加速，同时后台静默更新)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // 如果网络请求成功，把最新的存进缓存里
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      }).catch(() => {
        // 离线且无缓存时的降级处理
      });
      // 核心：如果有缓存，立刻给用户看缓存（秒开）；同时背地里去网络拿最新的更新缓存。
      return cachedResponse || fetchPromise; 
    })
  );
});
