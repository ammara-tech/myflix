// ==========================
// BROWSE PAGES: Home · TV Shows · Movies · Classics
// ==========================
(function (MyFlix) {
    const { escapeHtml } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const M = MyFlix.models;
    const H = MyFlix.pageHelpers;
    const C = MyFlix.cards;
    const tmdb = MyFlix.tmdb;

    function hero(view) {
        const el = document.createElement("section");
        MyFlix.billboard.skeleton(el);
        view.appendChild(el);
        return el;
    }

    function rows(view) {
        const el = document.createElement("div");
        el.className = "rows";
        view.appendChild(el);
        return el;
    }

    // ---------- HOME ----------
    async function home(view, route, live) {
        const heroEl = hero(view);
        const list = rows(view);

        list.append(H.continueRow(), H.myListRow());
        if (tmdb.enabled()) {
            list.append(C.createRow({ title: "Trending Now", load: () => tmdb.trending("all", "week").then(r => r.map(x => M.fromTmdb(x))) }));
        }
        list.append(
            C.createRow({ title: "Top 10 TV Shows on MYFLIX", variant: "top10", load: H.topTen }),
            H.classicsRow(),
            H.becauseRow()
        );
        if (!tmdb.enabled()) list.append(H.tmdbCta());
        else list.append(C.createRow({ title: "Popular Movies in South Africa", variant: "wide", load: () => tmdb.popularMovies().then(r => r.map(x => M.fromTmdb(x, "movie"))) }));
        list.append(
            C.createRow({ title: `On TV Tonight`, subtitle: "Airing today on local channels", hideIfEmpty: true, load: H.onTonight }),
            C.createRow({ title: "Critically Acclaimed Dramas", load: () => H.tvGenre(MyFlix.genreByKey("drama")) }),
            C.createRow({ title: "Laugh-Out-Loud Comedies", load: () => H.tvGenre(MyFlix.genreByKey("comedy")) }),
            C.createRow({ title: "Gripping Crime TV", load: () => H.tvGenre(MyFlix.genreByKey("crime")) }),
            C.createRow({ title: "Sci-Fi & Fantasy Worlds", load: async () => {
                const [a, b] = await Promise.all([H.tvGenre(MyFlix.genreByKey("scifi"), 14), H.tvGenre(MyFlix.genreByKey("fantasy"), 14)]);
                const seen = new Set();
                return [...a, ...b].filter(t => !seen.has(t.key) && seen.add(t.key));
            } })
        );

        // Hero: TMDB trending if available, otherwise a TVMaze favourite.
        try {
            if (tmdb.enabled()) {
                const trending = (await tmdb.trending("all", "day")).filter(x => x.backdrop_path);
                const t = M.fromTmdb(trending[0]);
                if (live()) MyFlix.billboard.render(heroEl, t, { kicker: `#1 in ${t.kind === "movie" ? "Movies" : "TV"} Today`, image: M.tmdbImage(trending[0].backdrop_path, "original") });
            } else {
                const { title, image } = await H.tvHero();
                if (live()) MyFlix.billboard.render(heroEl, title, { kicker: "Series", image });
            }
        } catch {
            const { title } = await H.classicHero();
            if (live()) MyFlix.billboard.render(heroEl, title, { kicker: "Free Classic" });
        }
    }

    // ---------- TV SHOWS ----------
    async function tv(view, route, live) {
        const genreKey = route.params.get("genre");
        const genres = MyFlix.genres.filter(g => g.key !== "war" && g.key !== "western");
        view.appendChild(H.pageHeader("TV Shows", genres, genreKey, key => MyFlix.router.go(key ? `tv?genre=${key}` : "tv")));

        if (genreKey) {
            const genre = MyFlix.genreByKey(genreKey);
            const wrap = document.createElement("section");
            wrap.className = "grid-page";
            wrap.innerHTML = `<p class="row-empty loading-dots">Loading</p>`;
            view.appendChild(wrap);
            const titles = await H.tvGenre(genre, 60);
            if (!live()) return;
            wrap.innerHTML = `<h2 class="grid-title">${escapeHtml(genre.title)} TV Shows</h2>`;
            wrap.appendChild(C.createGrid(titles));
            return;
        }

        const heroEl = hero(view);
        const list = rows(view);
        list.append(
            C.createRow({ title: "Top 10 TV Shows Today", variant: "top10", load: H.topTen }),
            C.createRow({ title: "On TV Tonight", hideIfEmpty: true, load: H.onTonight }),
            C.createRow({ title: "Still Airing", subtitle: "Shows with new episodes coming", load: async () => (await MyFlix.tvmaze.catalog()).filter(s => s.status === "Running").slice(0, 24).map(M.fromTvmaze) })
        );
        genres.forEach(g => list.append(C.createRow({ title: g.title, load: () => H.tvGenre(g), onExplore: () => MyFlix.router.go(`tv?genre=${g.key}`), hideIfEmpty: true })));

        try {
            const { title, image } = await H.tvHero();
            if (live()) MyFlix.billboard.render(heroEl, title, { kicker: "Series", image });
        } catch { heroEl.remove(); }
    }

    // ---------- MOVIES ----------
    async function movies(view, route, live) {
        const genreKey = route.params.get("genre");
        view.appendChild(H.pageHeader("Movies", tmdb.enabled() ? MyFlix.genres : null, genreKey, key => MyFlix.router.go(key ? `movies?genre=${key}` : "movies")));

        if (!tmdb.enabled()) {
            const list = rows(view);
            list.append(
                H.tmdbCta("TMDB is a free movie database. Add your key in Settings to browse trending, popular and top-rated films, watch trailers and see where each movie streams in South Africa."),
                H.classicsRow("Watch Free Classics Right Now")
            );
            MyFlix.classicCollections.slice(0, 4).forEach(c => list.append(collectionRow(c)));
            return;
        }

        if (genreKey) {
            const genre = MyFlix.genreByKey(genreKey);
            const wrap = document.createElement("section");
            wrap.className = "grid-page";
            view.appendChild(wrap);
            const [p1, p2] = await Promise.all([tmdb.moviesByGenre(genre.tmdb, 1), tmdb.moviesByGenre(genre.tmdb, 2)]);
            if (!live()) return;
            wrap.innerHTML = `<h2 class="grid-title">${escapeHtml(genre.title)} Movies</h2>`;
            wrap.appendChild(C.createGrid([...p1, ...p2].map(m => M.fromTmdb(m, "movie"))));
            const free = MyFlix.classics.filter(f => f.genres.includes(genre.classic));
            if (free.length) {
                wrap.insertAdjacentHTML("beforeend", `<h2 class="grid-title">Free ${escapeHtml(genre.title)} Classics</h2>`);
                wrap.appendChild(C.createGrid(free.map(M.fromClassic)));
            }
            return;
        }

        const heroEl = hero(view);
        const list = rows(view);
        const mv = arr => arr.map(x => M.fromTmdb(x, "movie"));
        list.append(
            C.createRow({ title: "Trending Movies This Week", variant: "top10", load: () => tmdb.trending("movie", "week").then(r => mv(r).slice(0, 10)) }),
            C.createRow({ title: "Popular in South Africa", load: () => tmdb.popularMovies().then(mv) }),
            C.createRow({ title: "In Cinemas Now", variant: "wide", load: () => tmdb.nowPlaying().then(mv) }),
            C.createRow({ title: "All-Time Greats", load: () => tmdb.topRatedMovies().then(mv) }),
            C.createRow({ title: "Coming Soon", variant: "wide", load: () => tmdb.upcoming().then(mv) })
        );
        ["action", "comedy", "horror", "scifi", "romance", "animation", "thriller", "documentary"].forEach(k => {
            const g = MyFlix.genreByKey(k);
            list.append(C.createRow({ title: `${g.title} Movies`, load: () => tmdb.moviesByGenre(g.tmdb).then(mv), onExplore: () => MyFlix.router.go(`movies?genre=${k}`) }));
        });

        try {
            const pop = (await tmdb.popularMovies()).filter(x => x.backdrop_path);
            const pick = pop[Math.floor(Math.random() * Math.min(5, pop.length))];
            if (live()) MyFlix.billboard.render(heroEl, M.fromTmdb(pick, "movie"), { kicker: "Film", image: M.tmdbImage(pick.backdrop_path, "original") });
        } catch { heroEl.remove(); }
    }

    // ---------- CLASSICS ----------
    function collectionRow(c) {
        const films = c.filter ? MyFlix.classics.filter(c.filter) : c.ids.map(id => MyFlix.classics.find(f => f.id === id)).filter(Boolean);
        return C.createRow({ title: c.title, subtitle: c.note, items: films.map(M.fromClassic), cardOpts: () => ({ showTitle: false }) });
    }

    async function classics(view, route, live) {
        const heroEl = hero(view);

        // The Theatre: pick a genre, then pick a film.
        const theatre = document.createElement("section");
        theatre.className = "theatre";
        const genres = Object.entries(MyFlix.classicGenres);
        let active = route.params.get("genre") || "action";
        theatre.innerHTML = `
            <div class="theatre-head">
                <div>
                    <h2>${icon("clapperboard")} The MYFLIX Theatre</h2>
                    <p class="muted">Choose a genre, then pick a film. Every title is free and legal to watch, streamed from the Internet Archive.</p>
                </div>
            </div>
            <div class="genre-pills" role="tablist" aria-label="Genres">
                ${genres.map(([k, label]) => `<button type="button" role="tab" class="chip" data-genre="${k}">${escapeHtml(label)} <span class="count">${MyFlix.classics.filter(f => f.genres.includes(k)).length}</span></button>`).join("")}
            </div>
            <div class="theatre-films"></div>`;
        const filmsEl = theatre.querySelector(".theatre-films");

        function showGenre(key) {
            active = key;
            theatre.querySelectorAll("[data-genre]").forEach(b => {
                b.classList.toggle("is-on", b.dataset.genre === key);
                b.setAttribute("aria-selected", String(b.dataset.genre === key));
            });
            const films = MyFlix.classics.filter(f => f.genres.includes(key));
            filmsEl.innerHTML = "";
            films.forEach(f => filmsEl.appendChild(filmTile(M.fromClassic(f))));
        }
        theatre.querySelector(".genre-pills").addEventListener("click", e => {
            const b = e.target.closest("[data-genre]");
            if (b) showGenre(b.dataset.genre);
        });
        showGenre(active);
        view.appendChild(theatre);

        const list = rows(view);
        list.append(H.continueRow());
        MyFlix.classicCollections.forEach(c => list.append(collectionRow(c)));

        const { title } = await H.classicHero();
        if (live()) MyFlix.billboard.render(heroEl, title, { kicker: "Free Classic Cinema" });
    }

    // Big tile used in the Theatre: poster + synopsis + Play.
    function filmTile(t) {
        const el = document.createElement("article");
        el.className = "film-tile";
        const progress = MyFlix.store.progress.get(t.id);
        el.innerHTML = `
            <button type="button" class="film-tile-poster" aria-label="More about ${escapeHtml(t.name)}">${C.typePoster(t)}</button>
            <div class="film-tile-body">
                <h3>${escapeHtml(t.name)}</h3>
                <p class="film-tile-meta"><span>${t.year}</span><span>${escapeHtml(MyFlix.utils.formatRuntime(t.runtime))}</span><span class="pill pill--free">Free</span></p>
                <p class="film-tile-desc">${escapeHtml(t.overview)}</p>
                <div class="film-tile-actions">
                    <button type="button" class="btn btn--play btn--small" data-act="play">${icon("play")}<span>${progress ? "Resume" : "Play"}</span></button>
                    <button type="button" class="circle" data-act="list" data-list-key="${escapeHtml(t.key)}" aria-label="My List">${icon(MyFlix.store.list.has(t.key) ? "check" : "plus")}</button>
                    <button type="button" class="circle" data-act="info" aria-label="More info">${icon("info")}</button>
                </div>
                ${progress ? `<span class="progress progress--inline"><span style="width:${(progress.time / progress.duration) * 100}%"></span></span>` : ""}
            </div>`;
        const poster = el.querySelector(".film-tile-poster");
        MyFlix.wiki.summary(t.name, t.year, "film").then(w => {
            if (!w?.image || !poster.isConnected) return;
            const img = MyFlix.utils.safeImg(new Image());
            img.alt = "";
            img.onload = () => { poster.innerHTML = ""; poster.appendChild(img); };
            img.src = w.image;
        }).catch(() => {});
        el.addEventListener("click", e => {
            const b = e.target.closest("[data-act]");
            if (e.target.closest(".film-tile-poster")) return MyFlix.details.open(t);
            if (!b) return;
            if (b.dataset.act === "play") MyFlix.player.play(t);
            if (b.dataset.act === "list") MyFlix.store.list.toggle(t);
            if (b.dataset.act === "info") MyFlix.details.open(t);
        });
        return el;
    }

    Object.assign(MyFlix.pages = MyFlix.pages || {}, {
        home: { title: "", render: home },
        tv: { title: "TV Shows", render: tv },
        movies: { title: "Movies", render: movies },
        classics: { title: "Classics", render: classics }
    });
})(window.MyFlix = window.MyFlix || {});
