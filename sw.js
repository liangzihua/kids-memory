const CACHE_NAME = 'kids-memory-v10';
const CACHE_URLS = [
  './',
  './index.html',
  './styles/main.css',
  './app/core.js',
  './app/algorithm.js',
  './app/parser.js',
  './app/speech.js',
  './app/pronunciation.js',
  './app/ai.js',
  './app/english.js',
  './app/recitation.js',
  './app/vocab-store.js',
  './app/ui.js',
  './manifest.json'
];
const CACHE_URLS = [
  './',
  './index.html',
  './styles/main.css',
  './app/core.js',
  './app/algorithm.js',
  './app/parser.js',
  './app/speech.js',
  './app/pronunciation.js',
  './app/ai.js',
  './app/english.js',
  './app/recitation.js',
  './app/ui.js',
  './manifest.json'
];
const CACHE_URLS = [
  './',
  './index.html',
  './styles/main.css',
  './app/core.js',
  './app/algorithm.js',
  './app/parser.js',
  './app/speech.js',
  './app/pronunciation.js',
  './app/ai.js',
  './app/english.js',
  './app/ui.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // 知识库 JSON 数据：网络优先，降级缓存
  if (event.request.url.includes('/data/builtin/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 其他资源：缓存优先
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      });
    })
  );
});
