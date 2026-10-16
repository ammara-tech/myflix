// ==========================
// TVMAZE API (TV shows, episodes, schedules) — free, no key
// ==========================
(function (MyFlix) {
    const { getJson } = MyFlix.utils;
    const BASE = "https://api.tvmaze.com";
    let catalogPromise = null;
    const details = new Map();

    async function search(term, signal) {
        const data = await getJson(`${BASE}/search/shows?q=${encodeURIComponent(term)}`, { signal });
        return data.map(d => d.show);
    }

    // ~500 popular shows (two index pages), best rated first.
    function catalog() {
        if (!catalogPromise) {
            catalogPromise = Promise.allSettled([
                getJson(`${BASE}/shows?page=0`),
                getJson(`${BASE}/shows?page=1`)
            ]).then(([a, b]) => {
                if (a.status === "rejected") throw a.reason;
                const shows = [...a.value, ...(b.status === "fulfilled" ? b.value : [])];
                return shows
                    .filter(s => s.image)
                    .sort((x, y) => (y.rating?.average || 0) - (x.rating?.average || 0));
            });
            catalogPromise.catch(() => { catalogPromise = null; });
        }
        return catalogPromise;
    }

    // Full show info + cast + seasons + images + next episode.
    function show(id) {
        if (!details.has(id)) {
            const p = getJson(`${BASE}/shows/${id}?embed[]=cast&embed[]=seasons&embed[]=images&embed[]=nextepisode`);
            details.set(id, p);
            p.catch(() => details.delete(id));
        }
        return details.get(id);
    }

    function seasonEpisodes(seasonId) {
        return getJson(`${BASE}/seasons/${seasonId}/episodes`);
    }

    function showEpisodes(showId) {
        return getJson(`${BASE}/shows/${showId}/episodes`);
    }

    // Find the TVMaze show for an IMDb id (used when a show came from TMDB).
    function lookupImdb(imdbId) {
        return getJson(`${BASE}/lookup/shows?imdb=${encodeURIComponent(imdbId)}`);
    }

    // What's airing on TV today in a country (default South Africa).
    function schedule(country = "ZA") {
        return getJson(`${BASE}/schedule?country=${encodeURIComponent(country)}`);
    }

    // Best wide image for a hero banner.
    function backdropOf(full) {
        const imgs = full?._embedded?.images || [];
        const bg = imgs.find(i => i.type === "background" && i.main) || imgs.find(i => i.type === "background") || imgs.find(i => i.type === "banner");
        return bg?.resolutions?.original?.url || null;
    }

    MyFlix.tvmaze = { search, catalog, show, seasonEpisodes, showEpisodes, lookupImdb, schedule, backdropOf };
})(window.MyFlix = window.MyFlix || {});
