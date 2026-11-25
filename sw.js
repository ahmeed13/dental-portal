const CACHE_VERSION = 'dental-portal-pwa-v1';
const DATA_CACHE = 'dental-portal-data-v1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/styles.css',
  './icons/favicon.ico',
  './icons/favicon-32x32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/icon-maskable-192x192.png',
  './icons/icon-maskable-512x512.png',
  './assets/fonts/robotomono-01.woff2',
  './assets/fonts/robotomono-02.woff2',
  './assets/fonts/robotomono-03.woff2',
  './assets/fonts/robotomono-04.woff2',
  './assets/fonts/robotomono-05.woff2',
  './assets/fonts/robotomono-06.woff2',
  './assets/fonts/tajawal-07.woff2',
  './assets/fonts/tajawal-08.woff2',
  './assets/fonts/tajawal-09.woff2',
  './assets/fonts/tajawal-10.woff2',
  './assets/fonts/tajawal-11.woff2',
  './assets/fonts/tajawal-12.woff2',
  './assets/fonts/tajawal-13.woff2',
  './assets/fonts/tajawal-14.woff2',
  './assets/fonts/tajawal-15.woff2',
  './assets/fonts/tajawal-16.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1) طلبات قاعدة بيانات Google Apps Script: الشبكة أولاً مع نسخة احتياطية عند انقطاع الإنترنت
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.open(DATA_CACHE).then((cache) => cache.match(request)))
    );
    return;
  }

  // 2) تنقّل الصفحات (فتح التطبيق من الشاشة الرئيسية حتى بدون إنترنت)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // 3) الملفات الثابتة والخطوط والأيقونات: الكاش السريع مع تحديث بالخلفية (Stale-While-Revalidate)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
  }
});
