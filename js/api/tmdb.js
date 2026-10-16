// ==========================
// TMDB API (movies, trailers, where to watch) — free key
// ==========================
// Get a key at https://www.themoviedb.org/settings/api and paste it in
// Profile → Settings. Accepts the short v3 "API Key" or the long v4 token.
(function (MyFlix) {
    const { getJson, cached } = MyFlix.utils;
    const BASE = "https://api.themoviedb.org/3";
    const memo = new Map();

    const key = () => MyFlix.store.getSetting("tmdbKey");
    const enabled = () => Boolean(key());

    async function get(path, params = {}, { cacheMinutes = 30 } = {}) {
        if (!enabled()) throw Object.assign(new Error("Add a TMDB key in Settings to see movies."), { code: "NO_KEY" });
        const url = new URL(BASE + path);
        Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
        const headers = {};
        if (key().length > 40) headers.Authorization = `Bearer ${key()}`;
        else url.searchParams.set("api_key", key());

        const id = url.toString();
        const hit = memo.get(id);
        if (hit && hit.until > Date.now()) return hit.promise;
        const promise = getJson(id, { headers }).catch(err => {
            memo.delete(id);
            if (err.status === 401) err.message = "TMDB rejected the key. Check it in Settings.";
            throw err;
        });
        memo.set(id, { promise, until: Date.now() + cacheMinutes * 60e3 });
        return promise;
    }

    const results = data => (data.results || []).filter(r => r.poster_path || r.backdrop_path);

    const api = {
        enabled,
        testKey: () => get("/configuration", {}, { cacheMinutes: 0 }),
        trending: (type = "all", window = "week") => get(`/trending/${type}/${window}`).then(results),
        popularMovies: () => get("/movie/popular", { region: MyFlix.store.getSetting("region") }).then(results),
        topRatedMovies: () => get("/movie/top_rated").then(results),
        nowPlaying: () => get("/movie/now_playing", { region: MyFlix.store.getSetting("region") }).then(results),
        upcoming: () => get("/movie/upcoming", { region: MyFlix.store.getSetting("region") }).then(results),
        moviesByGenre: (genreIds, page = 1) => get("/discover/movie", {
            with_genres: genreIds, sort_by: "popularity.desc", include_adult: "false", "vote_count.gte": "150", page
        }).then(results),
        search: q => get("/search/multi", { query: q, include_adult: "false" }).then(d => results(d).filter(r => r.media_type !== "person")),

        // Titles that are FREE (or free with ads) to stream in your country,
        // according to JustWatch data on TMDB. Optionally from one provider.
        freeTitles: (type = "movie", providerId = null, page = 1) => get(`/discover/${type}`, {
            watch_region: MyFlix.store.getSetting("region") || "ZA",
            with_watch_monetization_types: "free|ads",
            with_watch_providers: providerId,
            sort_by: "popularity.desc",
            include_adult: "false",
            page
        }).then(results),

        // Every streaming service TMDB knows about in your country.
        regionProviders: (type = "movie") => get(`/watch/providers/${type}`, {
            watch_region: MyFlix.store.getSetting("region") || "ZA"
        }, { cacheMinutes: 720 }).then(d => d.results || []),
        movie: id => get(`/movie/${id}`, { append_to_response: "credits,videos,watch/providers,external_ids,similar" }),
        movieBasic: id => get(`/movie/${id}`, {}, { cacheMinutes: 720 }),
        tv: id => get(`/tv/${id}`, { append_to_response: "external_ids,watch/providers,videos" }),
        // Find TMDB's id for a show we only know from TVMaze (via IMDb id).
        findByImdb: imdb => cached(`tmdbfind:${imdb}`, 30, () => get(`/find/${imdb}`, { external_source: "imdb_id" })),

        // Pick the best YouTube trailer from a /videos list.
        trailerOf(videos) {
            const yt = (videos?.results || []).filter(v => v.site === "YouTube");
            return (yt.find(v => v.type === "Trailer" && v.official) || yt.find(v => v.type === "Trailer") || yt.find(v => v.type === "Teaser"))?.key || null;
        },

        // Streaming services for one country: { link, stream:[], rent:[], buy:[], free:[] }
        providersOf(providers) {
            const region = MyFlix.store.getSetting("region") || "ZA";
            const r = providers?.results?.[region];
            if (!r) return null;
            const map = list => (list || []).map(p => ({
                name: p.provider_name, logo: MyFlix.models.tmdbImage(p.logo_path, "w92")
            }));
            return {
                region, link: r.link,
                stream: map(r.flatrate), free: map([...(r.free || []), ...(r.ads || [])]),
                rent: map(r.rent), buy: map(r.buy)
            };
        }
    };

    MyFlix.tmdb = api;
})(window.MyFlix = window.MyFlix || {});
