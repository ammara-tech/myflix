// ==========================
// TVMAZE API
// ==========================
(function (MyFlix) {
    const BASE = "https://api.tvmaze.com";
    let catalogCache = null;

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

    // A page of popular shows, used to browse a genre without a search term.
    // Cached so clicking between genres doesn't refetch.
    async function getCatalog(signal) {
        if (!catalogCache) {
            const shows = await getJson(`${BASE}/shows?page=0`, signal);
            catalogCache = shows.sort(
                (a, b) => (b.rating?.average || 0) - (a.rating?.average || 0)
            );
        }
        return catalogCache;
    }

    MyFlix.api = { searchShows, getCatalog };
})(window.MyFlix = window.MyFlix || {});
