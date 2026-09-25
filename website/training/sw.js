/* The training apps, offline.

   One worker for all of them. It sits at /training/ so its scope covers every app
   below it and the landing page, which means the whole suite shares a single
   cache - the shared stylesheet, the icon font and functions.js are stored once
   rather than five times.

   The apps have no data to fetch: a session lives in localStorage and nothing is
   ever uploaded. So the whole job here is making the files themselves survive a
   dead signal, which is cache-first with a precached shell.

   When you change any app: bump CACHE_VERSION. A cache-first worker will happily
   serve last month's app forever otherwise. The deploy invalidates /* at
   CloudFront, so the new sw.js is picked up on the next launch. */

const CACHE_VERSION = 'v27';
const CACHE_NAME = 'training-' + CACHE_VERSION;

/* The shell. Everything an app needs to draw itself with no network at all -
   listed by hand because there is no build step to generate it. Add to this when
   you add a file to an app. */
const SHELL = [
    // the landing page by its directory url only: asking for index.html gets a
    // redirect on some hosts, and addAll refuses a redirected response - which
    // would mean nothing installs at all
    '/training/',

    '/training/common/style.css',
    '/training/common/fontello.css',
    '/training/common/functions.js',
    '/training/common/gilford-routes.js',
    '/training/common/font/hind-400-latin.woff2',
    '/training/common/font/hind-400-latin-ext.woff2',
    '/training/common/font/fontello.woff2',
    '/training/common/font/fontello.woff',
    '/training/common/font/fontello.ttf',

    '/training/timer/',
    '/training/timer/style.css',
    '/training/timer/main.js',
    '/training/timer/manifest.json',

    '/training/endurance/',
    '/training/endurance/style.css',
    '/training/endurance/main.js',
    '/training/endurance/manifest.json',

    '/training/boulder/',
    '/training/boulder/style.css',
    '/training/boulder/main.js',
    '/training/boulder/manifest.json',

    '/training/gilford/',
    '/training/gilford/style.css',
    '/training/gilford/main.js',
    '/training/gilford/manifest.json',

    '/training/loft/',
    '/training/loft/main.js',
    '/training/loft/style.css',
    '/training/loft/manifest.json',

    '/training/rings/',
    '/training/rings/main.js',
    '/training/rings/manifest.json',
    '/training/rings/img/plain.png',
    '/training/rings/img/jug.png',
    '/training/rings/img/offset.png',
    '/training/rings/img/offset2.png',
    '/training/rings/img/two_fingers.png',
    '/training/rings/img/three_fingers.png',
    '/training/rings/img/four_fingers.png',

    // the paper tracker the tick list links to - 74KB, and the one thing in an
    // app that is not the app itself
    '/gilford.pdf',

    '/img/favicon/android-icon-192x192.png',
    '/img/favicon/android-icon-512x512.png',
    '/img/favicon/maskable-icon-512x512.png',
    '/img/favicon/apple-icon-180x180.png'
];

/* Precache the lot. addAll is all-or-nothing, which is what we want: a worker
   that installed with half a shell would be worse than none. Each request is
   made with cache: 'reload' so an install can't pick up a stale browser copy of
   a file the deploy has just replaced. */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

/* Take over straight away, and throw away the caches of older versions. */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(name => name.startsWith('training-') && name !== CACHE_NAME)
                     .map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

/* Cache first: these files only change when the site is deployed, and a session
   on a wall is the worst moment to wait on a timeout.

   Anything that isn't a plain same-origin GET is left alone - the analytics tag
   in particular, which should simply fail when there is no signal rather than be
   cached or retried. */
self.addEventListener('fetch', event => {
    const request = event.request;
    if(request.method !== 'GET'){ return; }

    const url = new URL(request.url);
    if(url.origin !== self.location.origin){ return; }
    // what this worker is responsible for - the apps, their icons, and the one
    // document the tick list links to
    const ours = ['/training/', '/img/favicon/', '/gilford.pdf'];
    if(!ours.some(path => url.pathname.startsWith(path))){ return; }

    event.respondWith(
        caches.match(request, { ignoreSearch: true }).then(hit => {
            if(hit){ return hit; }
            return fetch(request)
                .then(response => {
                    // keep anything new that turns up, so a file added between
                    // deploys is there next time the signal is not
                    if(response.ok && response.type === 'basic'){
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => {
                    // offline and never seen: for a page, the app list is a more
                    // useful dead end than the browser's error page
                    if(request.mode === 'navigate'){ return caches.match('/training/'); }
                    return Response.error();
                });
        })
    );
});
