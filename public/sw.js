const CACHE_NAME = 'magicka-surv-v3';
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

    // HTML/navigation 요청은 network-first — 새 배포가 즉시 반영되도록.
    // 자산(JS/PNG/MP3 등)은 cache-first 유지 — 오프라인/속도.
    const isNavigation =
        event.request.mode === 'navigate' ||
        (event.request.destination === '' && url.pathname.endsWith('.html')) ||
        url.pathname === '/' ||
        url.pathname.endsWith('/');

    if (isNavigation) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request).then((c) => c || caches.match('/index.html'))),
        );
        return;
    }

    // 자산: cache-first + lazy fill
    event.respondWith(
        caches.match(event.request).then((cached) =>
            cached || fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            }).catch(() => new Response('Offline', { status: 503 }))
        )
    );
});
