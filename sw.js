// 修改版本号，强制客户端更新 Service Worker
const CACHE_NAME = 'lent-guide-2026-v5'; 

// 修改点：只保留站内本地文件。去掉 CDN 链接，避免因国外域名连不上导致 SW 核心安装失败。
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 安装阶段：缓存新资源
self.addEventListener('install', event => {
  self.skipWaiting(); // 强制新 SW 立即接管控制权
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('SW 安装缓存失败:', err)) // 增加错误日志
  );
});

// 激活阶段：清理旧版本的幽灵缓存
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
  // 排除部分非 GET 请求
  if (event.request.method !== 'GET') return;
  
  // 【修复核心1】过滤掉 chrome-extension:// 等非 HTTP/HTTPS 协议的请求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // 【修复核心2】确保响应有效且为 HTTP 成功状态（过滤 404/500 及 Opaque 跨域拦截）
        if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
        }

        // 如果网络请求成功，把最新的存进缓存里
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      }).catch((error) => {
        // 离线且无缓存时的降级处理
        console.log('网络断开，无法获取最新资源:', error);
      });
      
      // 核心：如果有缓存，立刻给用户看缓存（秒开）；同时背地里去网络拿最新的更新缓存。
      // 【修复核心3】如果断网且没有缓存，返回一个 503 兜底对象，防止引发 Promise Uncaught 报错
      return cachedResponse || fetchPromise || new Response('', { status: 503, statusText: 'Service Unavailable' }); 
    })
  );
});
