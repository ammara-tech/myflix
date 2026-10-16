// ==========================
// TVMAZE API
// ==========================
(function (MyFlix) {
    const BASE = "https://api.tvmaze.com";
    let catalogPromise = null;
    const detailsCache = new Map();

    async function getJson(url, signal) {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`TVMaze responded with ${res.status}`);
        return res.json();
    }

    // Search shows by name. Returns an array of show objects.
    async function searchShows(term, signal) {
        const data = await getJson(`${BASE}/search/shows?q=${encodeURIComponent(term)}`, signal);
        return data.map(item => item.show);
    }

    // ~500 popular shows (two index pages), sorted by rating.
    // Used for genre browsing, recommendations and live game questions.
    // Cached so it is only downloaded once per visit.
    function getCatalog() {
        if (!catalogPromise) {
            catalogPromise = Promise.allSettled([
                getJson(`${BASE}/shows?page=0`),
                getJson(`${BASE}/shows?page=1`)
            ]).then(([first, second]) => {
                if (first.status === "rejected") throw first.reason;
                const shows = [...first.value, ...(second.status === "fulfilled" ? second.value : [])];
                return shows.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
            });
            // Let a failed download be retried next time.
            catalogPromise.catch(() => { catalogPromise = null; });
        }
        return catalogPromise;
    }

    // Full show info plus cast and seasons, for the details popup.
    async function getShowDetails(id, signal) {
        if (!detailsCache.has(id)) {
            const show = await getJson(`${BASE}/shows/${id}?embed[]=cast&embed[]=seasons`, signal);
            detailsCache.set(id, show);
        }
        return detailsCache.get(id);
    }

    function getSeasonEpisodes(seasonId, signal) {
        return getJson(`${BASE}/seasons/${seasonId}/episodes`, signal);
    }

    MyFlix.api = { searchShows, getCatalog, getShowDetails, getSeasonEpisodes };
})(window.MyFlix = window.MyFlix || {});
