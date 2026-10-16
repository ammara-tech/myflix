// ==========================
// ANIME PAGE (AniList + Jikan/MyAnimeList)
// ==========================
(function (MyFlix) {
    const { escapeHtml, timeUntil } = MyFlix.utils;
    const M = MyFlix.models;
    const C = MyFlix.cards;
    const anime = list => (list || []).map(M.fromAnilist);

    const SEASON_NAMES = { WINTER: "Winter", SPRING: "Spring", SUMMER: "Summer", FALL: "Fall" };

    // "Ep 7 in 2d 5h" under airing shows
    const airingOpts = t => t.nextAiring
        ? { showTitle: true, subtitle: `Ep ${t.nextAiring.episode} ${timeUntil(t.nextAiring.airingAt * 1000)}` }
        : {};

    async function render(view, route, live) {
        const genre = route.params.get("genre");
        view.appendChild(MyFlix.pageHelpers.pageHeader("Anime",
            MyFlix.anilist.GENRES.map(g => ({ key: g, title: g })), genre,
            g => MyFlix.router.go(g ? `anime?genre=${encodeURIComponent(g)}` : "anime")));

        // One genre as a grid
        if (genre) {
            const wrap = document.createElement("section");
            wrap.className = "grid-page";
            wrap.innerHTML = `<p class="row-empty loading-dots">Loading</p>`;
            view.appendChild(wrap);
            try {
                const list = await MyFlix.anilist.byGenre(genre, 40);
                if (!live()) return;
                wrap.innerHTML = `<h2 class="grid-title">${escapeHtml(genre)} Anime</h2>`;
                wrap.appendChild(C.createGrid(anime(list)));
            } catch {
                wrap.innerHTML = `<p class="row-empty row-empty--error">Couldn't reach AniList. Try again in a minute.</p>`;
            }
            return;
        }

        const heroEl = document.createElement("section");
        MyFlix.billboard.skeleton(heroEl);
        view.appendChild(heroEl);
        const rowsEl = document.createElement("div");
        rowsEl.className = "rows";
        view.appendChild(rowsEl);

        // One AniList request fills the first six rows.
        const homeData = MyFlix.anilist.home();
        const { season, year } = MyFlix.anilist.seasonOf();
        const pick = key => () => homeData.then(d => anime(d[key]));

        rowsEl.append(
            C.createRow({ title: "Top 10 Anime Today", variant: "top10", load: () => pick("trending")().then(l => l.slice(0, 10)) }),
            C.createRow({ title: `${SEASON_NAMES[season]} ${year} Season`, subtitle: "The most popular shows this season", load: pick("season") }),
            C.createRow({ title: "New Episodes This Week", subtitle: "Currently airing", load: pick("airing"), cardOpts: airingOpts }),
            C.createRow({ title: "Top on MyAnimeList", subtitle: "All-time most popular on MAL", lazy: true, hideIfEmpty: true, load: topOnMal }),
            C.createRow({ title: "Highest Rated of All Time", load: pick("top") }),
            C.createRow({ title: "Anime Movies", variant: "wide", load: pick("movies") }),
            C.createRow({ title: "Coming Next Season", hideIfEmpty: true, load: pick("upcoming") })
        );
        // Genre rows load only when you scroll to them (kind to AniList's rate limit).
        MyFlix.anilist.GENRES.forEach(g => rowsEl.append(C.createRow({
            title: g, lazy: true, hideIfEmpty: true,
            load: () => MyFlix.anilist.byGenre(g).then(anime),
            onExplore: () => MyFlix.router.go(`anime?genre=${encodeURIComponent(g)}`)
        })));
        const credit = document.createElement("p");
        credit.className = "attribution page-credit";
        credit.innerHTML = `Anime data from <a href="https://anilist.co" target="_blank" rel="noopener">AniList</a> and <a href="https://myanimelist.net" target="_blank" rel="noopener">MyAnimeList</a> (via Jikan).`;
        view.appendChild(credit);

        // Hero: a trending show with a wide banner.
        try {
            const d = await homeData;
            const withBanner = d.trending.filter(a => a.bannerImage);
            const a = withBanner[Math.floor(Math.random() * Math.min(5, withBanner.length))] || d.trending[0];
            if (live()) MyFlix.billboard.render(heroEl, M.fromAnilist(a), { kicker: "Anime", image: a.bannerImage });
        } catch {
            heroEl.innerHTML = `<p class="row-empty row-empty--error page-error">Couldn't reach AniList. Check your connection and try again.</p>`;
            heroEl.className = "";
        }
    }

    // MyAnimeList's popular list (Jikan) matched to AniList for posters.
    async function topOnMal() {
        const top = await MyFlix.jikan.top(20);
        const list = await MyFlix.anilist.byMalIds(top.map(t => t.malId));
        return anime(list);
    }

    (MyFlix.pages = MyFlix.pages || {}).anime = { title: "Anime", render };
})(window.MyFlix = window.MyFlix || {});
