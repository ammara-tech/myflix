// ==========================
// SERVICE WORKER (offline support)
// ==========================
// Bump CACHE_VERSION whenever you change any app file, so visitors get
// the new version instead of the cached one.
const CACHE_VERSION = "myflix-v5";
const APP_CACHE = `${CACHE_VERSION}-app`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const APP_FILES = [
    "./",
    "index.html",
    "manifest.webmanifest",
    "css/base.css",
    "css/billboard.css",
    "css/games.css",
    "css/modal.css",
    "css/nav.css",
    "css/pages.css",
    "css/player.css",
    "css/rows.css",
    "js/theme.js",
    "js/config.js",
    "js/icons.js",
    "js/data/genres.js",
    "js/data/classics.js",
    "js/data/services.js",
    "js/data/questions.js",
    "js/utils.js",
    "js/store.js",
    "js/models.js",
    "js/api/tvmaze.js",
    "js/api/tmdb.js",
    "js/api/omdb.js",
    "js/api/wiki.js",
    "js/api/archive.js",
    "js/api/anilist.js",
    "js/api/jikan.js",
    "js/api/trakt.js",
    "js/api/fanart.js",
    "js/ui/cards.js",
    "js/ui/billboard.js",
    "js/ui/details.js",
    "js/ui/player.js",
    "js/party.js",
    "js/ui/mood.js",
    "js/ui/settings.js",
    "js/recommend.js",
    "js/tracker.js",
    "js/router.js",
    "js/pages/helpers.js",
    "js/pages/browse.js",
    "js/pages/library.js",
    "js/pages/anime.js",
    "js/pages/games.js",
    "js/pwa.js",
    "js/main.js",
    "assets/apple-touch-icon.png",
    "assets/favicon.svg",
    "assets/icon-192.png",
    "assets/icon-512.png",
    "assets/no-poster.svg"
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

    // Posters, fonts and icons that never change: cache once, reuse.
    if (url.hostname.endsWith("tvmaze.com") || url.hostname === "image.tmdb.org" ||
        url.hostname === "upload.wikimedia.org" || url.hostname === "s4.anilist.co" || url.hostname === "assets.fanart.tv" || url.hostname.endsWith("fonts.gstatic.com") ||
        url.hostname === "fonts.googleapis.com") {
        event.respondWith(cacheFirst(request, DATA_CACHE));
    }
    // Everything else (TMDB data, YouTube, Archive video) goes straight to the network.
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
