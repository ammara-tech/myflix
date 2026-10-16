// ==========================
// PAGE HELPERS (shared by several pages)
// ==========================
(function (MyFlix) {
    const { escapeHtml, shuffle } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const M = MyFlix.models;

    // A popular TV show that has a wide background image, for a hero banner.
    async function tvHero(pool) {
        const cat = pool || await MyFlix.tvmaze.catalog();
        for (const show of shuffle(cat.slice(0, 12)).slice(0, 6)) {
            try {
                const full = await MyFlix.tvmaze.show(show.id);
                const image = MyFlix.tvmaze.backdropOf(full);
                if (image) return { title: M.fromTvmaze(full), image };
            } catch { /* try next */ }
        }
        return { title: M.fromTvmaze(cat[0]) };
    }

    // A classic with its Wikipedia poster.
    async function classicHero() {
        const film = shuffle(MyFlix.classics.filter(f => f.runtime > 40))[0];
        const t = M.fromClassic(film);
        try {
            const w = await MyFlix.wiki.summary(t.name, t.year, "film");
            if (w?.imageLarge || w?.image) t.posterLarge = w.imageLarge || w.image;
        } catch { /* fine */ }
        return { title: t };
    }

    // TVMaze shows of one genre, best first.
    async function tvGenre(genre, limit = 24) {
        const cat = await MyFlix.tvmaze.catalog();
        return cat.filter(s => MyFlix.tvShowInGenre(s, genre)).slice(0, limit).map(M.fromTvmaze);
    }

    // Top 10 by TVMaze popularity ("weight"), then rating.
    async function topTen() {
        const cat = await MyFlix.tvmaze.catalog();
        return cat.slice().sort((a, b) => (b.weight || 0) - (a.weight || 0) || (b.rating?.average || 0) - (a.rating?.average || 0))
            .slice(0, 10).map(M.fromTvmaze);
    }

    // Shows airing on TV today in the chosen country.
    async function onTonight() {
        const region = MyFlix.store.getSetting("region") || "ZA";
        const sched = await MyFlix.tvmaze.schedule(region);
        const seen = new Set();
        return sched.map(e => e.show).filter(s => s.image && !seen.has(s.id) && seen.add(s.id)).slice(0, 20).map(M.fromTvmaze);
    }

    // Continue Watching: classics in progress + next episodes of tracked shows.
    async function continueWatching() {
        const classics = MyFlix.store.progress.all()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(p => {
                const film = MyFlix.classics.find(f => f.id === p.id);
                return film ? { title: M.fromClassic(film), progress: p.time / p.duration, subtitle: p.duration - p.time < 60 ? "Less than a minute left" : `${Math.round((p.duration - p.time) / 60)}m left` } : null;
            }).filter(Boolean);
        let eps = [];
        try {
            eps = (await MyFlix.tracker.upNext()).map(u => ({
                title: u.title, progress: u.progress, subtitle: `Up next: S${u.episode.season}:E${u.episode.number} ${u.episode.name}`
            }));
        } catch { /* offline */ }
        return [...classics, ...eps];
    }

    function continueRow() {
        let meta = [];
        return MyFlix.cards.createRow({
            title: "Continue Watching",
            variant: "wide",
            hideIfEmpty: true,
            load: async () => { meta = await continueWatching(); return meta.map(m => m.title); },
            cardOpts: (t, i) => ({
                progress: meta[i]?.progress, subtitle: meta[i]?.subtitle,
                onClick: t.kind === "classic" ? MyFlix.player.play : MyFlix.details.open
            })
        });
    }

    function myListRow() {
        const items = () => MyFlix.store.list.all().filter(i => i.status === "want").sort((a, b) => b.addedAt - a.addedAt).map(i => M.fromKey(i.key) || i);
        const row = MyFlix.cards.createRow({
            title: "My List",
            hideIfEmpty: true,
            items: items(),
            onExplore: () => MyFlix.router.go("my-list")
        });
        // Update live when you add or remove something, while this page is open.
        const off = MyFlix.store.onChange(what => {
            if (!row.isConnected) return off();
            if (what === "list") row.fill(items());
        });
        return row;
    }

    function becauseRow() {
        const row = MyFlix.cards.createRow({
            title: "Because you saved…",
            hideIfEmpty: true,
            load: async () => {
                const r = await MyFlix.recommend.forYou();
                if (r.because && row.isConnected) {
                    row.querySelector(".row-title").firstChild.textContent = `Because you saved ${r.because}`;
                }
                return r.titles;
            }
        });
        return row;
    }

    function classicsRow(title = "Free Classic Cinema") {
        return MyFlix.cards.createRow({
            title,
            subtitle: "Legendary films, free and legal to stream",
            items: shuffle(MyFlix.classics).slice(0, 16).map(M.fromClassic),
            onExplore: () => MyFlix.router.go("classics")
        });
    }

    // Call-to-action shown where TMDB content would be.
    function tmdbCta(text = "Add a free TMDB key to unlock movies, trailers and “Where to watch” in South Africa.") {
        const el = document.createElement("section");
        el.className = "cta-banner";
        el.innerHTML = `
            <div class="cta-icon">${icon("clapperboard")}</div>
            <div><h3>Unlock the movie library</h3><p>${escapeHtml(text)}</p></div>
            <button type="button" class="btn btn--play">${icon("key-round")}<span>Add TMDB key</span></button>`;
        el.querySelector("button").addEventListener("click", () => MyFlix.settings.open());
        return el;
    }

    // Netflix-style page header with a "Genres" dropdown.
    function pageHeader(title, genres, selected, onPick) {
        const el = document.createElement("div");
        el.className = "page-header";
        el.innerHTML = `
            <h1>${escapeHtml(title)}</h1>
            ${genres ? `<label class="genre-select">
                <span class="sr-only">Genre</span>
                <select>
                    <option value="">Genres</option>
                    ${genres.map(g => `<option value="${g.key}" ${selected === g.key ? "selected" : ""}>${escapeHtml(g.title)}</option>`).join("")}
                </select>${icon("chevron-down")}
            </label>` : ""}`;
        el.querySelector("select")?.addEventListener("change", e => onPick(e.target.value));
        return el;
    }

    MyFlix.pageHelpers = { tvHero, classicHero, tvGenre, topTen, onTonight, continueWatching, continueRow, myListRow, becauseRow, classicsRow, tmdbCta, pageHeader };
})(window.MyFlix = window.MyFlix || {});
