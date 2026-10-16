// ==========================
// RECOMMENDATIONS ("Because you saved…")
// ==========================
// Builds a genre profile from My List (rated shows count more, low ratings
// count less) and scores popular TVMaze shows + free Classics against it.
(function (MyFlix) {
    // TMDB and TVMaze spell a few genres differently.
    const norm = g => ({ "Science Fiction": "Science-Fiction", "Sci-Fi": "Science-Fiction", "Sci-Fi & Fantasy": "Science-Fiction", "Action & Adventure": "Action", Kids: "Children" }[g] || g);

    function weight(item) {
        if (item.status !== "watched" || !item.myRating) return 1;
        return { 1: -0.5, 2: 0.25, 3: 1, 4: 1.75, 5: 2.5 }[item.myRating];
    }

    function profile() {
        const p = new Map();
        MyFlix.store.list.all().forEach(item => {
            const w = weight(item);
            (item.genres || []).forEach(g => p.set(norm(g), (p.get(norm(g)) || 0) + w));
        });
        MyFlix.store.episodes.shows().forEach(s => (s.genres || []).forEach(g => p.set(norm(g), (p.get(norm(g)) || 0) + 0.5)));
        return p;
    }

    function topGenres(p, n = 2) {
        return [...p.entries()].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([g]) => g);
    }

    async function forYou(max = 20) {
        const p = profile();
        if (!p.size) return { titles: [], because: null, genres: [] };
        const saved = new Set(MyFlix.store.list.all().map(i => i.key));
        const catalog = await MyFlix.tvmaze.catalog();
        const score = genres => genres.reduce((sum, g) => sum + (p.get(norm(g)) || 0), 0);

        const tv = catalog
            .map(MyFlix.models.fromTvmaze)
            .filter(t => !saved.has(t.key))
            .map(t => ({ t, s: score(t.genres) + (t.rating || 5) / 10 }));
        const classics = MyFlix.classics
            .map(MyFlix.models.fromClassic)
            .filter(t => !saved.has(t.key))
            .map(t => ({ t, s: score(t.genres) * 0.9 }));

        const titles = [...tv, ...classics].filter(x => x.s > 1.2).sort((a, b) => b.s - a.s).slice(0, max).map(x => x.t);
        const latest = MyFlix.store.list.all().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))[0];
        return { titles, because: latest?.name || null, genres: topGenres(p) };
    }

    MyFlix.recommend = { forYou, profile, topGenres };
})(window.MyFlix = window.MyFlix || {});
