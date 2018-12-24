//Caching website
// https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker

var CACHE_WEBSITE = 'multi-pitch-cache-v1';

var urlsToCache = [
    '/',
    '/initServiceWorker.js',

    '/css/style.css',
    '/css/bootstrap-grid.css',
    '/css/owfont-regular.css',

    '/data/climbs.js',
    '/data/guidebooks.js',
    '/data/imgs.js',
    '/data/weather.js',

    '/js/graph.js',
    '/js/load-data.js',
    '/js/main.js',
    '/js/offline-climb-cache.js',
    '/components/climbCard.js',

    '/img/download/download_no.svg',
    '/img/download/download_yes.svg',

    '/img/heros/old-man-of-stoer-hero-1800.jpg',
    '/img/heros/old-man-of-stoer-hero-1800.webp',
    '/img/heros/old-man-of-stoer-hero-2400.jpg',
    '/img/heros/old-man-of-stoer-hero-2400.webp',
    '/img/logo/mp-logo-white.png',
    '/img/favicon/favicon-32x32.png',
    '/img/favicon/favicon-96x96.png',
    '/img/favicon/android-icon-192x192.png'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_WEBSITE)
            .then(cache => {
                cache.addAll(urlsToCache)
            })
            .catch(err => console.error("An error occurred while trying to open the cache with error:", err))
    )
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.open(CACHE_WEBSITE)
            .then(function (cache) {
                return cache.match(event.request).then(function (response) {
                    return response || fetch(event.request).then(function (response) {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
            .catch(err => console.error("An error occurred while trying to cache match: ", event.request, "with error:", err))
    )
});


