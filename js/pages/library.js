// ==========================
// MY LIST · SEARCH · STATS pages
// ==========================
(function (MyFlix) {
    const { escapeHtml, timeUntil } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const M = MyFlix.models;
    const C = MyFlix.cards;
    const store = MyFlix.store;

    // ---------- MY LIST ----------
    async function myList(view, route) {
        const tab = route.params.get("tab") || "want";
        const counts = {
            want: store.list.all().filter(i => i.status === "want").length,
            watched: store.list.all().filter(i => i.status === "watched").length,
            following: store.episodes.shows().length
        };
        view.innerHTML = `
            <div class="page-header"><h1>My List</h1></div>
            <div class="tabs" role="tablist" aria-label="My List">
                ${[["want", "Want to Watch"], ["watched", "Watched"], ["following", "Episode Tracker"]].map(([k, l]) =>
                    `<a role="tab" href="#/my-list?tab=${k}" class="tab ${tab === k ? "is-on" : ""}" aria-selected="${tab === k}">${l}<span class="count">${counts[k]}</span></a>`).join("")}
            </div>
            <div class="tab-panel" role="tabpanel"></div>`;
        const panel = view.querySelector(".tab-panel");

        if (tab === "following") return renderFollowing(panel);

        const items = store.list.all().filter(i => i.status === tab).sort((a, b) => (b.watchedAt || b.addedAt) - (a.watchedAt || a.addedAt));
        if (!items.length) {
            panel.innerHTML = emptyState(tab === "want" ? "plus" : "eye",
                tab === "want" ? "Your list is empty" : "Nothing watched yet",
                tab === "want" ? "Press + on any title to save it here." : "Mark titles as watched (the eye button in More Info) and rate them here.");
            return;
        }

        const grid = C.createGrid(items.map(i => M.fromKey(i.key) || i));
        if (tab === "watched") {
            // Add star ratings under each watched card.
            grid.querySelectorAll(".card").forEach(card => {
                const item = store.list.get(card.dataset.key);
                const stars = document.createElement("div");
                stars.className = "stars";
                stars.innerHTML = [1, 2, 3, 4, 5].map(n =>
                    `<button type="button" class="star ${n <= item.myRating ? "filled" : ""}" data-star="${n}" aria-label="Rate ${n} star${n > 1 ? "s" : ""}">${icon("star")}</button>`).join("");
                stars.addEventListener("click", e => {
                    const b = e.target.closest("[data-star]");
                    if (!b) return;
                    store.list.rate(item.key, +b.dataset.star);
                    stars.querySelectorAll(".star").forEach((s, i) => s.classList.toggle("filled", i < (store.list.get(item.key)?.myRating || 0)));
                });
                card.appendChild(stars);
            });
        }
        panel.appendChild(grid);

        const recs = MyFlix.pageHelpers.becauseRow();
        recs.classList.add("row--below");
        panel.appendChild(recs);
    }

    async function renderFollowing(panel) {
        const shows = store.episodes.shows();
        if (!shows.length) {
            panel.innerHTML = emptyState("list-checks", "Track your shows",
                "Open any TV show, go to Episodes and tick what you've watched. You'll get your next episode here, and a countdown to new ones.");
            return;
        }
        panel.innerHTML = `<p class="row-empty loading-dots">Loading your shows</p>`;
        const [upNext, upcoming] = await Promise.all([
            MyFlix.tracker.upNext().catch(() => []),
            MyFlix.tracker.upcoming().catch(() => [])
        ]);
        panel.innerHTML = `<ul class="tracker-list"></ul>`;
        const ul = panel.querySelector("ul");
        shows.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0)).forEach(s => {
            const next = upNext.find(u => u.title.id === s.id);
            const soon = upcoming.find(u => u.show.id === s.id);
            const li = document.createElement("li");
            li.className = "tracker-item";
            li.innerHTML = `
                <img src="${escapeHtml(s.poster || MyFlix.utils.PLACEHOLDER_POSTER)}" alt="">
                <div class="tracker-body">
                    <h3>${escapeHtml(s.name)}</h3>
                    <p class="muted">${s.watched.length} episode${s.watched.length === 1 ? "" : "s"} watched</p>
                    ${next ? `<span class="progress progress--inline"><span style="width:${next.progress * 100}%"></span></span>
                        <p class="tracker-next">${icon("circle-play")} Up next: <strong>S${next.episode.season}:E${next.episode.number}</strong> ${escapeHtml(next.episode.name)}</p>`
                        : `<p class="tracker-next">${icon("circle-check")} All caught up</p>`}
                    ${soon ? `<p class="tracker-soon">${icon("calendar-clock")} New episode ${escapeHtml(timeUntil(soon.ep.airstamp))}: S${soon.ep.season}:E${soon.ep.number}</p>` : ""}
                </div>
                <div class="tracker-actions">
                    <button type="button" class="btn btn--small btn--grey" data-act="open">${icon("list")}<span>Episodes</span></button>
                    <button type="button" class="btn btn--small btn--ghost" data-act="unfollow">Stop tracking</button>
                </div>`;
            MyFlix.utils.safeImg(li.querySelector("img"));
            li.addEventListener("click", async e => {
                const b = e.target.closest("[data-act]");
                if (!b) return;
                if (b.dataset.act === "unfollow" && confirm(`Stop tracking ${s.name}? Your ticked episodes will be cleared.`)) {
                    store.episodes.unfollow(s.id);
                    li.remove();
                }
                if (b.dataset.act === "open") MyFlix.details.open({ key: `tv:${s.id}`, kind: "tv", id: s.id, name: s.name, poster: s.poster, genres: s.genres });
            });
            ul.appendChild(li);
        });
    }

    function emptyState(iconName, title, text) {
        return `<div class="empty-state">${icon(iconName)}<h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p>
            <a class="btn btn--play" href="#/">${icon("house")}<span>Browse titles</span></a></div>`;
    }

    // ---------- SEARCH ----------
    async function search(view, route, live) {
        const q = (route.params.get("q") || "").trim();
        const input = document.querySelector(".search-box input");
        if (input && input.value !== q && document.activeElement !== input) {
            input.value = q;
            input.closest(".search-box").classList.add("open");
        }
        view.innerHTML = `<div class="page-header"><h1>${q ? `Results for “${escapeHtml(q)}”` : "Search"}</h1></div><div class="search-results"></div>`;
        const out = view.querySelector(".search-results");
        if (!q) return;

        const lower = q.toLowerCase();
        const classics = MyFlix.classics.filter(f => f.title.toLowerCase().includes(lower) || f.genres.some(g => MyFlix.classicGenres[g].toLowerCase().includes(lower)));
        const section = (title, items) => {
            if (!items.length) return;
            const h = document.createElement("h2");
            h.className = "grid-title";
            h.textContent = title;
            out.append(h, C.createGrid(items));
        };

        out.innerHTML = `<p class="row-empty loading-dots">Searching</p>`;
        const [tvRes, tmdbRes] = await Promise.allSettled([
            MyFlix.tvmaze.search(q),
            MyFlix.tmdb.enabled() ? MyFlix.tmdb.search(q) : Promise.resolve([])
        ]);
        if (!live()) return;
        out.innerHTML = "";
        const movies = tmdbRes.status === "fulfilled" ? tmdbRes.value.filter(r => r.media_type === "movie").map(r => M.fromTmdb(r, "movie")) : [];
        const shows = tvRes.status === "fulfilled" ? tvRes.value.map(M.fromTvmaze) : [];
        section("Free Classics", classics.map(M.fromClassic));
        section("TV Shows", shows);
        section("Movies", movies);
        if (!classics.length && !shows.length && !movies.length) {
            out.innerHTML = `<div class="empty-state">${icon("search")}<h2>No matches for “${escapeHtml(q)}”</h2><p>Try a different title, or a genre like “comedy”.</p></div>`;
        }
        if (!MyFlix.tmdb.enabled()) out.appendChild(MyFlix.pageHelpers.tmdbCta("Add a free TMDB key to include movies in your search results."));
        if (tvRes.status === "rejected") out.insertAdjacentHTML("afterbegin", `<p class="row-empty row-empty--error">Couldn't reach TVMaze. Check your connection.</p>`);
    }

    // ---------- STATS ----------
    const BADGES = [
        { id: "first", icon: "circle-play", title: "First Watch", test: s => s.items >= 1, hint: "Watch anything" },
        { id: "binge", icon: "popcorn", title: "Binge Watcher", test: s => s.episodes >= 10, hint: "Tick 10 episodes" },
        { id: "marathon", icon: "flame", title: "Marathon", test: s => s.minutes >= 600, hint: "Watch 10 hours" },
        { id: "critic", icon: "star", title: "Critic", test: s => s.rated >= 5, hint: "Rate 5 titles" },
        { id: "classic", icon: "film", title: "Classic Buff", test: s => s.classics >= 3, hint: "Watch 3 classics" },
        { id: "explorer", icon: "compass", title: "Genre Explorer", test: s => s.genreCount >= 6, hint: "Watch 6 genres" },
        { id: "night", icon: "moon", title: "Night Owl", test: s => s.nightOwl, hint: "Watch after midnight" },
        { id: "quiz", icon: "trophy", title: "Quizmaster", test: s => s.bestScore >= 100, hint: "Score 100 in a game" },
        { id: "curator", icon: "library", title: "Curator", test: s => s.saved >= 20, hint: "Save 20 titles" }
    ];

    function computeStats() {
        const history = store.history();
        const list = store.list.all();
        const minutes = history.reduce((s, h) => s + (h.minutes || 0), 0);
        const genres = new Map();
        history.forEach(h => (h.genres || []).forEach(g => genres.set(g, (genres.get(g) || 0) + Math.max(1, h.minutes || 1))));
        const rated = list.filter(i => i.myRating);
        const scores = MyFlix.utils.storage.read("myflixHighScores", {});
        const days = Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - (13 - i));
            const end = +d + 864e5;
            return { date: d, minutes: history.filter(h => h.at >= +d && h.at < end).reduce((s, h) => s + h.minutes, 0) };
        });
        return {
            minutes,
            episodes: history.filter(h => h.type === "episode").length,
            items: history.length,
            classics: new Set(history.filter(h => h.kind === "classic").map(h => h.key)).size,
            watchedTitles: list.filter(i => i.status === "watched").length,
            saved: list.length,
            rated: rated.length,
            avgRating: rated.length ? rated.reduce((s, i) => s + i.myRating, 0) / rated.length : 0,
            topGenres: [...genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
            genreCount: genres.size,
            nightOwl: history.some(h => { const hr = new Date(h.at).getHours(); return hr >= 0 && hr < 5; }),
            bestScore: Math.max(0, ...Object.values(scores).map(Number).filter(isFinite)),
            days
        };
    }

    function stats(view) {
        const s = computeStats();
        const hours = (s.minutes / 60).toFixed(s.minutes < 600 ? 1 : 0);
        const maxGenre = s.topGenres[0]?.[1] || 1;
        const maxDay = Math.max(1, ...s.days.map(d => d.minutes));
        view.innerHTML = `
            <div class="page-header"><h1>Your Stats</h1></div>
            <div class="stats">
                <div class="stat-tiles">
                    ${tile("clock", hours, "hours watched")}
                    ${tile("tv", s.episodes, "episodes")}
                    ${tile("film", s.classics, "classics streamed")}
                    ${tile("eye", s.watchedTitles, "titles finished")}
                    ${tile("star", s.avgRating ? s.avgRating.toFixed(1) : "–", "average rating you give")}
                    ${tile("trophy", s.bestScore, "best game score")}
                </div>
                <section class="stat-card">
                    <h2>Top genres</h2>
                    ${s.topGenres.length ? `<ul class="bars">${s.topGenres.map(([g, v]) => `
                        <li><span class="bar-label">${escapeHtml(g)}</span><span class="bar"><span style="width:${(v / maxGenre) * 100}%"></span></span></li>`).join("")}</ul>`
                        : `<p class="muted">Watch a few things and your favourite genres will show up here.</p>`}
                </section>
                <section class="stat-card">
                    <h2>Last 14 days</h2>
                    <div class="spark" role="img" aria-label="Minutes watched per day for the last 14 days">
                        ${s.days.map(d => `<span class="spark-bar ${d.minutes ? "" : "is-empty"}" style="--h:${(d.minutes / maxDay) * 100}%" title="${d.date.toLocaleDateString()} · ${d.minutes} min"><i></i><small>${d.date.toLocaleDateString([], { weekday: "narrow" })}</small></span>`).join("")}
                    </div>
                </section>
                <section class="stat-card stat-card--wide">
                    <h2>Badges <span class="muted">${BADGES.filter(b => b.test(s)).length}/${BADGES.length}</span></h2>
                    <ul class="badges">${BADGES.map(b => {
                        const got = b.test(s);
                        return `<li class="badge-item ${got ? "is-earned" : ""}"><span class="badge-icon">${icon(b.icon)}</span><strong>${escapeHtml(b.title)}</strong><span>${got ? "Earned" : escapeHtml(b.hint)}</span></li>`;
                    }).join("")}</ul>
                </section>
            </div>`;
    }

    function tile(iconName, value, label) {
        return `<div class="stat-tile">${icon(iconName)}<strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
    }

    Object.assign(MyFlix.pages = MyFlix.pages || {}, {
        "my-list": { title: "My List", render: myList },
        search: { title: "Search", render: search },
        stats: { title: "Stats", render: stats }
    });
})(window.MyFlix = window.MyFlix || {});
