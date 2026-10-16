// ==========================
// OMDB API (IMDb, Rotten Tomatoes, Metacritic scores) — free key
// ==========================
// Free key (1,000 requests a day): https://www.omdbapi.com/apikey.aspx
(function (MyFlix) {
    const { getJson, cached } = MyFlix.utils;

    const key = () => MyFlix.store.getSetting("omdbKey");
    const enabled = () => Boolean(key());

    // Returns [{ source: "IMDb", value: "8.6/10", score: 86 }, ...] or [].
    async function ratings(imdbId) {
        if (!enabled() || !imdbId) return [];
        return cached(`omdb:${imdbId}`, 7, async () => {
            const data = await getJson(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(key())}`);
            if (data.Response === "False") return [];
            return (data.Ratings || []).map(r => ({
                source: r.Source === "Internet Movie Database" ? "IMDb" : r.Source,
                value: r.Value,
                score: toPercent(r.Value)
            }));
        });
    }

    function toPercent(value) {
        if (value.endsWith("%")) return parseFloat(value);
        const [a, b] = value.split("/").map(parseFloat);
        return b ? Math.round((a / b) * 100) : null;
    }

    async function testKey(k) {
        const data = await getJson(`https://www.omdbapi.com/?i=tt0111161&apikey=${encodeURIComponent(k)}`);
        if (data.Response === "False") throw new Error(data.Error || "Invalid key");
    }

    MyFlix.omdb = { enabled, ratings, testKey };
})(window.MyFlix = window.MyFlix || {});
