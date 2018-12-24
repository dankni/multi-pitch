//Caching website
// https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker

var CACHE_WEBSITE = 'multi-pitch-cache-v1';

var urlsToCache = [
    '/',
    '/css/style.css',
    '/css/bootstrap-grid.css',
    '/css/owfont-regular.css',
    '/js/main.js',
    '/img/favicon/favicon-32x32.png',
    '/img/favicon/favicon-16x16.png',
    '/img/favicon/favicon-96x96.png',
    '/img/favicon/android-icon-192x192.png'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_WEBSITE)
            .then(cache => cache.addAll(urlsToCache))
            .catch(err => console.error("An error occurred while trying to open the cache with error:", err))
    )
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request)
            .then(response => response ? response : fetch(event.request))
            .catch(err => console.error("An error occurred while trying to cache match: ", event.request, "with error:", err))
    );
});


