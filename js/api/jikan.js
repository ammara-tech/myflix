// ==========================
// JIKAN (unofficial MyAnimeList API) — free, no key
// ==========================
// Adds MyAnimeList scores and rankings next to AniList's.
// Jikan allows about 3 requests a second, so calls are queued and cached.
(function (MyFlix) {
    const { getJson, cached } = MyFlix.utils;
    const BASE = "https://api.jikan.moe/v4";
    let chain = Promise.resolve();

    // Run requests one after another, ~400ms apart.
    function queued(url) {
        const run = chain.then(() => getJson(url));
        chain = run.catch(() => {}).then(() => new Promise(r => setTimeout(r, 400)));
        return run;
    }

    // { score, rank, popularity, members, url } for a MyAnimeList id.
    function stats(malId) {
        if (!malId) return Promise.resolve(null);
        return cached(`mal:${malId}`, 3, async () => {
            const { data } = await queued(`${BASE}/anime/${malId}`);
            return data ? { score: data.score, rank: data.rank, popularity: data.popularity, members: data.members, url: data.url } : null;
        });
    }

    // MyAnimeList's all-time top list (MAL ids + titles).
    function top(limit = 20) {
        return cached("mal:top", 1, async () => {
            const { data } = await queued(`${BASE}/top/anime?limit=${limit}&filter=bypopularity`);
            return (data || []).map(a => ({ malId: a.mal_id, title: a.title_english || a.title, score: a.score, rank: a.rank }));
        });
    }

    MyFlix.jikan = { stats, top };
})(window.MyFlix = window.MyFlix || {});
