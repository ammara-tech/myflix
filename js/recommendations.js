// ==========================
// "BECAUSE YOU SAVED…" RECOMMENDATIONS
// ==========================
// Scores popular TVMaze shows by how well their genres match the shows
// in My List. Watched shows you rated highly count more; low ratings
// count less.
(function (MyFlix) {
    const { escapeHtml } = MyFlix.utils;
    const { createMovieCard, setRowMessage, saveAction } = MyFlix.cards;
    const MAX_RESULTS = 20;

    let els = {};
    let renderToken = 0;

    // How much each saved show "votes" for its genres.
    function weightFor(item) {
        if (item.status !== "watched" || !item.myRating) return 1;
        return { 1: -0.5, 2: 0.25, 3: 1, 4: 1.75, 5: 2.5 }[item.myRating];
    }

    function genreProfile(saved) {
        const profile = new Map();
        saved.forEach(item => {
            const w = weightFor(item);
            (item.genres || []).forEach(g => profile.set(g, (profile.get(g) || 0) + w));
        });
        return profile;
    }

    function topGenres(profile, n = 2) {
        return [...profile.entries()]
            .filter(([, score]) => score > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([g]) => g);
    }

    function recommend(catalog, saved, profile) {
        const savedIds = new Set(saved.map(s => s.id));
        return catalog
            .filter(show => !savedIds.has(show.id))
            .map(show => {
                const match = (show.genres || []).reduce((sum, g) => sum + (profile.get(g) || 0), 0);
                const quality = (show.rating?.average || 5) / 10;  // small nudge towards well-rated shows
                return { show, score: match + quality };
            })
            .filter(r => r.score > 1)
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_RESULTS)
            .map(r => r.show);
    }

    function headline(saved, genres) {
        const latest = saved.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))[0];
        if (genres.length) {
            return `Because you saved “${escapeHtml(latest.name)}” · more ${genres.map(escapeHtml).join(" & ")}`;
        }
        return `Because you saved “${escapeHtml(latest.name)}”`;
    }

    async function render() {
        const saved = MyFlix.favourites.all();
        const token = ++renderToken;

        if (!saved.length) {
            els.section.classList.add("hidden");
            return;
        }
        els.section.classList.remove("hidden");

        const profile = genreProfile(saved);
        const genres = topGenres(profile);
        els.title.innerHTML = headline(saved, genres);

        if (!genres.length) {
            setRowMessage(els.row, "Save shows with genres (or rate them higher) to get recommendations.");
            return;
        }
        if (!els.row.querySelector(".movie-card")) setRowMessage(els.row, "Finding shows for you…", "loading");

        try {
            const catalog = await MyFlix.api.getCatalog();
            if (token !== renderToken) return; // a newer render started
            const picks = recommend(catalog, saved, profile);
            const scroll = els.row.scrollLeft;
            els.row.innerHTML = "";
            if (!picks.length) {
                setRowMessage(els.row, "No new recommendations right now. Try saving different genres.");
                return;
            }
            picks.forEach(show => els.row.appendChild(createMovieCard(show, { actions: [saveAction(show)] })));
            els.row.scrollLeft = scroll;
        } catch {
            if (token === renderToken) setRowMessage(els.row, "Couldn't load recommendations. Check your connection.", "error");
        }
    }

    function init() {
        els = {
            section: document.getElementById("recommendations"),
            title: document.getElementById("recs-title"),
            row: document.getElementById("recs-list")
        };
        MyFlix.favourites.onChange(render);
        render();
    }

    MyFlix.recommendations = { init };
})(window.MyFlix = window.MyFlix || {});
