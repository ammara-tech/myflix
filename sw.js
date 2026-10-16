// ==========================
// SERVICE WORKER (offline support)
// ==========================
// Bump CACHE_VERSION whenever you change any app file, so visitors get
// the new version instead of the cached one.
const CACHE_VERSION = "myflix-v1";
const APP_CACHE = `${CACHE_VERSION}-app`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const APP_FILES = [
    "./",
    "index.html",
    "manifest.webmanifest",
    "css/base.css",
    "css/layout.css",
    "css/carousel.css",
    "css/details.css",
    "css/game.css",
    "css/explore.css",
    "css/cinema.css",
    "js/theme.js",
    "js/config.js",
    "js/data/genres.js",
    "js/data/questions.js",
    "js/data/films.js",
    "js/utils.js",
    "js/api.js",
    "js/cards.js",
    "js/favourites.js",
    "js/details.js",
    "js/search.js",
    "js/recommendations.js",
    "js/game.js",
    "js/trailers.js",
    "js/cinema.js",
    "js/pwa.js",
    "js/main.js",
    "assets/favicon.svg",
    "assets/no-poster.svg",
    "assets/icon-192.png",
    "assets/icon-512.png",
    "assets/apple-touch-icon.png"
];

self.addEventListener("install", event => {
    event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_FILES)));
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const { request } = event;
    if (request.method !== "GET") return;
    const url = new URL(request.url);

    // App files: serve from cache, refresh in the background.
    if (url.origin === location.origin) {
        event.respondWith(staleWhileRevalidate(request, APP_CACHE));
        return;
    }

    // TVMaze data: try the network, fall back to the last copy when offline.
    if (url.hostname === "api.tvmaze.com") {
        event.respondWith(networkFirst(request, DATA_CACHE));
        return;
    }

    // TVMaze posters: cache once, reuse.
    if (url.hostname.endsWith("tvmaze.com")) {
        event.respondWith(cacheFirst(request, DATA_CACHE));
    }
    // Everything else (TMDB, YouTube, video) goes straight to the network.
});

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request, { ignoreSearch: true });
    const network = fetch(request)
        .then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
        })
        .catch(() => cached);
    return cached || network;
}

async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
    } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw err;
    }
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    const res = await fetch(request);
    if (res.ok || res.type === "opaque") cache.put(request, res.clone());
    return res;
}
