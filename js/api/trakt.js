// ==========================
// TRAKT (what people are watching right now) — free Client ID
// ==========================
// Create an app at https://trakt.tv/oauth/applications (Redirect URI:
// urn:ietf:wg:oauth:2.0:oob) and paste its Client ID in Settings.
// Trakt has no images, so posters come from TMDB (movies) or TVMaze (shows).
(function (MyFlix) {
    const { getJson } = MyFlix.utils;
    const BASE = "https://api.trakt.tv";
    const memo = new Map();

    const key = () => MyFlix.store.getSetting("traktKey");
    const enabled = () => Boolean(key());

    function get(path, minutes = 15) {
        if (!enabled()) return Promise.reject(Object.assign(new Error("Add a Trakt Client ID in Settings."), { code: "NO_KEY" }));
        const hit = memo.get(path);
        if (hit && hit.until > Date.now()) return hit.promise;
        const promise = getJson(BASE + path, {
            headers: { "Content-Type": "application/json", "trakt-api-version": "2", "trakt-api-key": key() }
        });
        promise.catch(() => memo.delete(path));
        memo.set(path, { promise, until: Date.now() + minutes * 60e3 });
        return promise;
    }

    // Turn a Trakt movie into a MYFLIX title (poster from TMDB when possible).
    async function movieTitle(m, extra) {
        if (m.ids?.tmdb && MyFlix.tmdb.enabled()) {
            try {
                const full = await MyFlix.tmdb.movieBasic(m.ids.tmdb);
                return { ...MyFlix.models.fromTmdb(full, "movie"), ...extra };
            } catch { /* fall through */ }
        }
        return m.ids?.tmdb && MyFlix.tmdb.enabled()
            ? { key: `movie:${m.ids.tmdb}`, kind: "movie", id: m.ids.tmdb, name: m.title, year: m.year, genres: [], ...extra }
            : { key: `trakt:${m.ids?.slug}`, kind: "trakt", id: m.ids?.slug, name: m.title, year: m.year, genres: [], overview: "", ...extra };
    }

    // Turn a Trakt show into a TVMaze title (so episodes & tracking work).
    async function showTitle(s, extra) {
        if (s.ids?.imdb) {
            try {
                const show = await MyFlix.tvmaze.lookupImdb(s.ids.imdb);
                return { ...MyFlix.models.fromTvmaze(show), ...extra };
            } catch { /* fall through */ }
        }
        return null;
    }

    const fmt = n => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

    async function trendingMovies() {
        const list = await get("/movies/trending?limit=20");
        return (await Promise.all(list.map(x => movieTitle(x.movie, { traktWatchers: x.watchers, subtitle: `${fmt(x.watchers)} watching now` })))).filter(Boolean);
    }
    async function trendingShows() {
        const list = await get("/shows/trending?limit=20");
        return (await Promise.all(list.map(x => showTitle(x.show, { traktWatchers: x.watchers, subtitle: `${fmt(x.watchers)} watching now` })))).filter(Boolean);
    }
    async function anticipatedMovies() {
        const list = await get("/movies/anticipated?limit=20", 60);
        return (await Promise.all(list.map(x => movieTitle(x.movie, { subtitle: `${fmt(x.list_count)} lists` })))).filter(Boolean);
    }
    async function anticipatedShows() {
        const list = await get("/shows/anticipated?limit=20", 60);
        return (await Promise.all(list.map(x => showTitle(x.show, {})))).filter(Boolean);
    }

    // Trending movies AND shows, mixed by how many people are watching.
    async function trendingAll() {
        const [m, s] = await Promise.allSettled([trendingMovies(), trendingShows()]);
        const all = [...(m.value || []), ...(s.value || [])];
        if (!all.length && m.reason) throw m.reason;
        return all.sort((a, b) => (b.traktWatchers || 0) - (a.traktWatchers || 0)).slice(0, 20);
    }

    async function testKey() {
        await get("/movies/trending?limit=1", 0);
    }

    MyFlix.trakt = { enabled, trendingMovies, trendingShows, trendingAll, anticipatedMovies, anticipatedShows, testKey };
})(window.MyFlix = window.MyFlix || {});
