// ==========================
// EPISODE TRACKER: "Up next" + new-episode notifications
// ==========================
(function (MyFlix) {
    const { escapeHtml, timeUntil } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const store = MyFlix.store;
    const episodeCache = new Map();

    function allEpisodes(showId) {
        if (!episodeCache.has(showId)) {
            const p = MyFlix.tvmaze.showEpisodes(showId);
            episodeCache.set(showId, p);
            p.catch(() => episodeCache.delete(showId));
        }
        return episodeCache.get(showId);
    }

    // Shows you're following = TV shows in My List + shows with ticked episodes.
    function followedShowIds() {
        const ids = new Set(store.episodes.shows().map(s => s.id));
        store.list.all().filter(i => i.kind === "tv").forEach(i => ids.add(i.id));
        return [...ids];
    }

    // For each show with ticked episodes: the next unwatched episode that has aired.
    async function upNext() {
        const shows = store.episodes.shows().filter(s => s.watched.length)
            .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0)).slice(0, 12);
        const results = await Promise.all(shows.map(async s => {
            try {
                const eps = (await allEpisodes(s.id)).filter(e => !e.airstamp || new Date(e.airstamp) <= Date.now());
                const next = eps.find(e => !s.watched.includes(e.id));
                if (!next) return null;
                const done = eps.filter(e => s.watched.includes(e.id)).length;
                return {
                    title: { key: `tv:${s.id}`, kind: "tv", id: s.id, name: s.name, poster: s.poster, backdrop: next.image?.original || next.image?.medium || null, genres: s.genres || [] },
                    episode: next,
                    progress: eps.length ? done / eps.length : 0
                };
            } catch { return null; }
        }));
        return results.filter(Boolean);
    }

    // New episodes airing in the next 14 days for followed shows.
    async function upcoming() {
        const ids = followedShowIds().slice(0, 25);
        const items = await Promise.all(ids.map(async id => {
            try {
                const full = await MyFlix.tvmaze.show(id);
                const ep = full._embedded?.nextepisode;
                if (!ep?.airstamp) return null;
                const ms = new Date(ep.airstamp) - Date.now();
                if (ms < 0 || ms > 14 * 864e5) return null;
                return { show: full, ep };
            } catch { return null; }
        }));
        return items.filter(Boolean).sort((a, b) => new Date(a.ep.airstamp) - new Date(b.ep.airstamp));
    }

    // ---------- bell dropdown in the nav ----------
    let bell, badge, menu;

    async function refreshBell() {
        if (!bell) return;
        let list = [];
        try { list = await upcoming(); } catch { /* offline */ }
        const soon = list.filter(x => new Date(x.ep.airstamp) - Date.now() < 7 * 864e5).length;
        badge.textContent = soon;
        badge.classList.toggle("hidden", !soon);
        menu.innerHTML = `
            <p class="menu-heading">${icon("bell")} New episodes</p>
            ${list.length ? list.map(({ show, ep }) => `
                <button type="button" class="notif" data-show="${show.id}">
                    <img src="${escapeHtml(show.image?.medium || MyFlix.utils.PLACEHOLDER_POSTER)}" alt="">
                    <span><strong>${escapeHtml(show.name)}</strong>
                    <span>S${ep.season} E${ep.number} · ${escapeHtml(ep.name)}</span>
                    <span class="when">${icon("clock")} ${escapeHtml(timeUntil(ep.airstamp))}</span></span>
                </button>`).join("")
            : `<p class="menu-empty">Follow shows (add them to My List or tick episodes) and new episodes will show up here.</p>`}`;
    }

    function init() {
        bell = document.getElementById("bell-btn");
        badge = bell.querySelector(".badge");
        menu = document.getElementById("bell-menu");
        menu.addEventListener("click", async e => {
            const b = e.target.closest("[data-show]");
            if (!b) return;
            MyFlix.nav.closeMenus();
            const full = await MyFlix.tvmaze.show(+b.dataset.show);
            MyFlix.details.open(MyFlix.models.fromTvmaze(full));
        });
        refreshBell();
        store.onChange(what => { if (what === "list" || what === "episodes") refreshBell(); });
    }

    MyFlix.tracker = { init, upNext, upcoming, allEpisodes, refreshBell };
})(window.MyFlix = window.MyFlix || {});
