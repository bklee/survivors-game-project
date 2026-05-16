const CACHE_NAME = 'magicka-surv-v1';
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return; // 외부 도메인 (Poki SDK 등) skip

    event.respondWith(
        caches.match(event.request).then((cached) =>
            cached || fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            }).catch(() => {
                // 오프라인 fallback — root HTML 반환
                if (event.request.mode === 'navigate') return caches.match('/index.html');
                return new Response('Offline', { status: 503 });
            })
        )
    );
});
