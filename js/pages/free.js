// ==========================
// WATCH FREE PAGE (tabs)
// ==========================
// Films · Cartoons · TV Shows · Documentaries · Anime · Retro TV
// Everything except "Films" is searched live from the Internet Archive's
// public-domain collections, so new uploads appear automatically.
(function (MyFlix) {
    const { escapeHtml } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const C = MyFlix.cards;
    const M = MyFlix.models;
    const DATA = () => MyFlix.freeArchive;

    const TABS = [
        { id: "films", label: "Films", icon: "film" },
        { id: "cartoons", label: "Cartoons", icon: "sparkles" },
        { id: "tv", label: "TV Shows", icon: "tv" },
        { id: "docs", label: "Documentaries", icon: "globe" },
        { id: "anime", label: "Anime", icon: "zap" },
        { id: "retro", label: "Retro TV", icon: "radio-tower" }
    ];

    // Turn Archive search results into titles that know their row (for "Up next").
    function toTitles(docs, def, genre) {
        const seen = new Set();
        const list = docs
            .filter(d => d.identifier && !seen.has(d.identifier) && seen.add(d.identifier))
            .map(d => M.fromArchive(d, { min: def.min, genre }));
        list.forEach(t => { t.queue = list; });
        return list;
    }

    // A row filled from an Archive search. Rows below the fold load on scroll.
    function archiveRow(def, { variant = "poster", lazy = true, genre = null, rows = 30 } = {}) {
        return C.createRow({
            title: def.title,
            variant,
            lazy,
            hideIfEmpty: true,
            load: () => MyFlix.archive.search(def.q, { rows }).then(docs => toTitles(docs, def, genre)),
            cardOpts: () => ({ showTitle: true }),
            onExplore: def.seeAll
        });
    }

    function tabBar(active) {
        const nav = document.createElement("nav");
        nav.className = "free-tabs";
        nav.setAttribute("aria-label", "Watch Free sections");
        nav.innerHTML = TABS.map(t => `
            <a href="#/classics?tab=${t.id}" class="free-tab ${t.id === active ? "is-on" : ""}" ${t.id === active ? 'aria-current="page"' : ""}>
                ${icon(t.icon)}<span>${t.label}</span>
            </a>`).join("");
        return nav;
    }

    function header(view, tab) {
        const head = document.createElement("div");
        head.className = "free-head";
        head.innerHTML = `
            <div class="page-header"><h1>Watch Free</h1></div>
            <p class="free-sub muted">Legal, free and streaming right here: public-domain films, cartoons and TV from the Internet Archive.</p>`;
        head.appendChild(tabBar(tab));
        view.appendChild(head);
    }

    function rowsContainer(view) {
        const el = document.createElement("div");
        el.className = "rows rows--free";
        view.appendChild(el);
        return el;
    }

    function note(view, html) {
        const p = document.createElement("p");
        p.className = "attribution page-credit";
        p.innerHTML = html;
        view.appendChild(p);
    }

    // ---------- tabs ----------
    function cartoons(view) {
        const rows = rowsContainer(view);
        DATA().cartoons.forEach((def, i) => rows.appendChild(archiveRow(def, { lazy: i > 2, genre: "Cartoon" })));
        note(view, `Vintage cartoons from the Internet Archive's <a href="https://archive.org/details/classic_cartoons" target="_blank" rel="noopener">classic cartoons</a> collection. Characters may still be trademarked.`);
    }

    function tvShows(view, route, live) {
        const seriesId = route.params.get("series");
        if (seriesId) return seriesPage(view, seriesId, live);

        const grid = document.createElement("section");
        grid.className = "series-grid";
        grid.innerHTML = DATA().tvShows.map(s => `
            <a class="series-card" href="#/classics?tab=tv&series=${s.id}">
                <span class="series-art" data-series="${s.id}"><span class="series-name">${escapeHtml(s.title)}</span></span>
                <span class="series-body">
                    <strong>${escapeHtml(s.title)}</strong>
                    <span class="muted small">${escapeHtml(s.years)} · ${escapeHtml(s.genre)}</span>
                    <span class="series-desc">${escapeHtml(s.description)}</span>
                </span>
            </a>`).join("");
        view.appendChild(grid);

        // Use the most-watched episode's thumbnail as each show's artwork.
        DATA().tvShows.forEach(s => {
            MyFlix.archive.search(s.q, { rows: 1 }).then(docs => {
                const art = grid.querySelector(`[data-series="${s.id}"]`);
                if (!docs[0] || !art?.isConnected) return;
                const img = MyFlix.utils.safeImg(new Image(), "");
                img.alt = "";
                img.onload = () => art.prepend(img);
                img.src = MyFlix.archive.thumb(docs[0].identifier);
            }).catch(() => {});
        });
        note(view, `Episodes from the Internet Archive's <a href="https://archive.org/details/classic_tv" target="_blank" rel="noopener">Classic TV</a> collection, where copyrights have lapsed. Not every episode of a show is public domain, so only some are available.`);
    }

    async function seriesPage(view, id, live) {
        const s = DATA().tvShows.find(x => x.id === id);
        if (!s) return MyFlix.router.go("classics?tab=tv");
        const wrap = document.createElement("section");
        wrap.className = "series-page";
        wrap.innerHTML = `
            <a class="back-link" href="#/classics?tab=tv">${icon("arrow-left")} All TV shows</a>
            <div class="series-hero">
                <div>
                    <p class="billboard-kicker"><span class="kicker-mark">M</span>Free TV</p>
                    <h2>${escapeHtml(s.title)}</h2>
                    <p class="muted">${escapeHtml(s.years)} · ${escapeHtml(s.genre)}</p>
                    <p>${escapeHtml(s.description)}</p>
                    <div class="series-actions"></div>
                </div>
            </div>
            <h3 class="grid-title">Episodes</h3>
            <div class="series-episodes"><p class="row-empty loading-dots">Finding episodes</p></div>`;
        view.appendChild(wrap);
        try {
            const docs = await MyFlix.archive.search(s.q, { rows: 60, sort: "titleSorter asc" });
            if (!live()) return;
            const eps = toTitles(docs, s, s.genre);
            const box = wrap.querySelector(".series-episodes");
            box.innerHTML = "";
            if (!eps.length) {
                box.innerHTML = `<p class="row-empty">No episodes found right now. Try again later.</p>`;
                return;
            }
            box.appendChild(C.createGrid(eps, "wide", () => ({ showTitle: true })));
            const actions = wrap.querySelector(".series-actions");
            actions.innerHTML = `<button type="button" class="btn btn--play">${icon("play")}<span>Play first episode</span></button>
                <button type="button" class="btn btn--grey">${icon("shuffle")}<span>Shuffle</span></button>`;
            actions.querySelector(".btn--play").addEventListener("click", () => MyFlix.player.play(eps[0]));
            actions.querySelector(".btn--grey").addEventListener("click", () => MyFlix.player.play(eps[Math.floor(Math.random() * eps.length)]));
        } catch {
            wrap.querySelector(".series-episodes").innerHTML = `<p class="row-empty row-empty--error">Couldn't reach the Internet Archive. Check your connection.</p>`;
        }
    }

    function documentaries(view) {
        const rows = rowsContainer(view);
        DATA().documentaries.forEach((def, i) => rows.appendChild(archiveRow(def, { variant: "wide", lazy: i > 1, genre: "Documentary" })));
        note(view, `From the <a href="https://archive.org/details/prelinger" target="_blank" rel="noopener">Prelinger Archives</a>, a collection of educational, industrial and everyday films dedicated to the public domain, plus classic TV commercials.`);
    }

    function anime(view) {
        const rows = rowsContainer(view);
        DATA().anime.forEach(def => rows.appendChild(archiveRow(def, { lazy: false, genre: "Anime" })));
        view.appendChild(animeChannels());
        note(view, `Free anime that streams here is limited to open-licence and public-domain animation. For modern series, the official free channels above are licensed by the studios. Full anime catalogue on the <a href="#/anime">Anime</a> page.`);
    }

    // Official free anime channels (link out).
    function animeChannels() {
        const el = document.createElement("section");
        el.className = "services";
        el.innerHTML = `
            <div class="services-head">
                <h2>${icon("zap")} Official Free Anime</h2>
                <p class="muted">Licensed by the studios and free to watch. They open in a new tab, and some are only available in certain countries.</p>
            </div>
            <div class="services-grid">
                ${DATA().animeChannels.map(s => `
                    <a class="service" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">
                        <span class="service-logo" style="--c:${s.color};--ink:${s.ink || "#fff"}">${escapeHtml(s.name.charAt(0))}</span>
                        <span class="service-body">
                            <strong>${escapeHtml(s.name)} ${icon("external-link", "provider-out")}</strong>
                            <span class="service-desc">${escapeHtml(s.description)}</span>
                            <span class="service-tags">${s.tags.map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("")}</span>
                        </span>
                    </a>`).join("")}
            </div>`;
        return el;
    }

    // ---------- page ----------
    async function render(view, route, live) {
        const tab = TABS.some(t => t.id === route.params.get("tab")) ? route.params.get("tab") : "films";
        if (tab === "films") {
            await MyFlix.classicFilms(view, route, live);
            // put the tabs just under the billboard
            const bar = tabBar("films");
            bar.classList.add("free-tabs--floating");
            view.querySelector(".billboard")?.after(bar);
            return;
        }
        view.classList.add("view--free-sub");
        header(view, tab);
        if (tab === "cartoons") return cartoons(view);
        if (tab === "tv") return tvShows(view, route, live);
        if (tab === "docs") return documentaries(view);
        if (tab === "anime") return anime(view);
        if (tab === "retro") return MyFlix.retroTv.render(view, live);
    }

    MyFlix.freePage = { render, animeChannels };
})(window.MyFlix = window.MyFlix || {});
