/* The training apps, offline: one worker at /training/ for the whole suite,
   cache first from a precached shell. The apps have nothing to fetch - sessions
   live in localStorage - so the job is only keeping the files through a dead
   signal.

   When you change any app, bump CACHE_VERSION, or installed copies keep serving
   the old files. */

const CACHE_VERSION = 'v144';
const CACHE_NAME = 'training-' + CACHE_VERSION;

// Everything an app needs with no network. Add to it when you add a file.
const SHELL = [
    // pages by their directory url: index.html is a redirect on some hosts, which addAll refuses
    '/training/',
    '/training/manifest.json',
    '/training/progress/',
    '/training/progress/charts.js',
    '/training/progress/sessions.js',
    '/training/progress/settings.js',
    '/training/progress/backup.js',
    '/training/progress/conversions.js',
    '/training/progress/style.css',

    '/training/common/style.css',
    '/training/common/page.css',
    '/training/common/fontello.css',
    '/training/common/grades.js',
    '/training/common/functions.js',
    '/training/common/log.css',
    '/training/common/log.js',
    '/training/common/ladder.js',
    '/training/common/gilford-routes.js',
    '/training/common/ukc.js',
    '/training/common/bottom-nav.js',
    '/training/common/workout.js',
    '/training/common/workout.css',
    '/training/common/font/hind-400-latin.woff2',
    '/training/common/font/hind-400-latin-ext.woff2',
    '/training/common/font/fontello.woff2',
    '/training/common/font/fontello.woff',
    '/training/common/font/fontello.ttf',

    '/training/timer/',
    '/training/timer/style.css',
    '/training/timer/main.js',

    '/training/endurance/',
    '/training/endurance/style.css',
    '/training/endurance/main.js',

    '/training/boulder/',
    '/training/boulder/main.js',

    '/training/trad/',
    '/training/trad/style.css',
    '/training/trad/main.js',

    '/training/gilford/',
    '/training/gilford/style.css',
    '/training/gilford/main.js',

    '/training/loft/',
    '/training/loft/main.js',
    '/training/loft/style.css',

    '/training/rings/',
    '/training/rings/style.css',
    '/training/rings/main.js',
    '/training/rings/img/plain.png',
    '/training/rings/img/jug.png',
    '/training/rings/img/offset.png',
    '/training/rings/img/offset2.png',
    '/training/rings/img/two_fingers.png',
    '/training/rings/img/three_fingers.png',
    '/training/rings/img/four_fingers.png',

    '/training/nohangs/',
    '/training/nohangs/style.css',
    '/training/nohangs/main.js',
    '/training/nohangs/img/open.webp',
    '/training/nohangs/img/half-crimp.webp',
    '/training/nohangs/img/front-3.webp',
    '/training/nohangs/img/middle-2.webp',

    '/training/gaps/',
    '/training/gaps/style.css',
    '/training/gaps/progressor.js',
    '/training/gaps/main.js',
    '/training/gaps/figure.js',
    '/training/gaps/img/sky.png',
    '/training/gaps/img/earth.png',
    '/training/gaps/img/rock.png',
    '/training/gaps/img/grass.png',
    '/training/gaps/img/flag-down.png',
    '/training/gaps/img/flag-1.png',
    '/training/gaps/img/flag-2.png',
    '/training/gaps/img/coin.png',
    '/training/gaps/img/mushroom-brown.png',
    '/training/gaps/img/mushroom-red.png',

    // the paper tracker the tick list links to
    '/gilford.pdf',

    '/img/favicon/android-icon-192x192.png',
    '/img/favicon/android-icon-512x512.png',
    '/img/favicon/maskable-icon-192x192.png',
    '/img/favicon/maskable-icon-512x512.png',
    '/img/favicon/apple-icon-180x180.png'
];

/* All or nothing - half a shell is worse than none - and past the browser's
   own cache, so an install can't pick up a copy the deploy has just replaced. */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

// Take over straight away, and drop older versions' caches
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

/* Cache first: the files only change on a deploy. Anything but a same-origin GET
   for the apps - the analytics tag in particular - is left to the network. */
self.addEventListener('fetch', event => {
    const request = event.request;
    if(request.method !== 'GET'){ return; }

    const url = new URL(request.url);
    if(url.origin !== self.location.origin){ return; }
    const ours = ['/training/', '/img/favicon/', '/gilford.pdf'];
    if(!ours.some(path => url.pathname.startsWith(path))){ return; }

    event.respondWith(
        caches.match(request, { ignoreSearch: true }).then(hit => {
            if(hit){ return hit; }
            return fetch(request)
                .then(response => {
                    // keep anything new, for the next time there is no signal
                    if(response.ok && response.type === 'basic'){
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => {
                    // offline and never seen: the app list beats the browser's error page
                    if(request.mode === 'navigate'){ return caches.match('/training/'); }
                    return Response.error();
                });
        })
    );
});
