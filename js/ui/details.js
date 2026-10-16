// ==========================
// DETAILS MODAL ("More Info")
// ==========================
// Combines every source for one title:
//   TVMaze  → show info, cast, seasons, episodes, next episode
//   TMDB    → movie info, trailer, where to watch, similar titles
//   OMDb    → IMDb / Rotten Tomatoes / Metacritic scores
//   Wikipedia → "Did you know?" facts
(function (MyFlix) {
    const { escapeHtml, stripHtml, truncate, safeImg, formatRuntime, timeUntil } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);
    const store = MyFlix.store;

    let dialog, panel, current = null, openToken = 0;

    // ---------- small HTML builders ----------
    const section = (id, heading, body) =>
        `<section class="modal-section" data-section="${id}"><h3>${heading}</h3>${body}</section>`;
    const loading = `<p class="muted loading-dots">Loading</p>`;

    function heroHtml(t, info) {
        const img = info.backdrop || t.backdropLarge || t.backdrop;
        const portrait = !img && (info.poster || t.posterLarge || t.poster);
        const playable = MyFlix.actions.canPlay(t);
        const listItem = store.list.get(t.key);
        return `
            <div class="modal-hero ${portrait ? "modal-hero--portrait" : ""}">
                <div class="modal-hero-media">
                    ${img ? `<img src="${escapeHtml(img)}" alt="">` : ""}
                    ${portrait ? `<img class="blur" src="${escapeHtml(portrait)}" alt=""><img class="poster" src="${escapeHtml(portrait)}" alt="">` : ""}
                    ${!img && !portrait ? MyFlix.cards.typePoster(t) : ""}
                </div>
                <div class="modal-hero-fade"></div>
                <div class="modal-hero-content">
                    <h2 id="modal-title" class="modal-title">${escapeHtml(t.name)}</h2>
                    <div class="modal-actions">
                        ${playable ? `<button type="button" class="btn btn--play" data-act="play">${icon("play")}<span>Play</span></button>` : ""}
                        ${info.trailer ? `<button type="button" class="btn ${playable ? "btn--grey" : "btn--play"}" data-act="trailer">${icon("circle-play")}<span>Trailer</span></button>` : ""}
                        <button type="button" class="circle circle--lg" data-act="list" data-list-key="${escapeHtml(t.key)}" aria-label="My List">${icon(listItem ? "check" : "plus")}</button>
                        <button type="button" class="circle circle--lg ${listItem?.status === "watched" ? "is-on" : ""}" data-act="watched" aria-label="Mark as watched" title="Mark as watched">${icon("eye")}</button>
                        ${listItem?.status === "watched" ? starsHtml(listItem) : ""}
                        ${playable ? `<button type="button" class="circle circle--lg" data-act="party" aria-label="Start a watch party" title="Watch party">${icon("users")}</button>` : ""}
                    </div>
                </div>
            </div>`;
    }

    function starsHtml(item) {
        return `<div class="stars stars--modal" role="group" aria-label="Your rating">${[1, 2, 3, 4, 5].map(n =>
            `<button type="button" class="star ${n <= item.myRating ? "filled" : ""}" data-star="${n}" aria-label="${n} star${n > 1 ? "s" : ""}">${icon("star")}</button>`
        ).join("")}</div>`;
    }

    function metaHtml(t, info) {
        const bits = [];
        if (t.rating) bits.push(`<span class="match">${icon("star")} ${escapeHtml(t.rating)} rating</span>`);
        if (t.year) bits.push(`<span>${escapeHtml(t.year)}${info.endYear && info.endYear !== t.year ? `–${escapeHtml(info.endYear)}` : ""}</span>`);
        if (info.seasons) bits.push(`<span>${info.seasons} Season${info.seasons > 1 ? "s" : ""}</span>`);
        else if (t.runtime) bits.push(`<span>${escapeHtml(formatRuntime(t.runtime))}</span>`);
        bits.push(`<span class="pill">HD</span>`);
        if (t.kind === "classic") bits.push(`<span class="pill pill--free">Free</span>`);
        return `<p class="modal-meta">${bits.join("")}</p>`;
    }

    function sideHtml(t, info) {
        const rows = [];
        if (info.cast?.length) rows.push(`<p><span class="label">Cast:</span> ${info.cast.slice(0, 5).map(c => escapeHtml(c.name)).join(", ")}</p>`);
        if (t.genres?.length) rows.push(`<p><span class="label">Genres:</span> ${t.genres.map(escapeHtml).join(", ")}</p>`);
        if (info.director) rows.push(`<p><span class="label">Director:</span> ${escapeHtml(info.director)}</p>`);
        if (info.network) rows.push(`<p><span class="label">Network:</span> ${escapeHtml(info.network)}</p>`);
        if (info.status) rows.push(`<p><span class="label">Status:</span> ${escapeHtml(info.status)}</p>`);
        if (t.licence) rows.push(`<p><span class="label">Licence:</span> ${escapeHtml(t.licence)}</p>`);
        return rows.join("");
    }

    function nextEpisodeHtml(ep) {
        if (!ep?.airstamp || new Date(ep.airstamp) < Date.now()) return "";
        return `<div class="next-episode">${icon("calendar-clock")}<div>
            <strong>New episode ${escapeHtml(timeUntil(ep.airstamp))}</strong>
            <span>S${ep.season} E${ep.number} · “${escapeHtml(ep.name)}” · ${new Date(ep.airstamp).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        </div></div>`;
    }

    function castHtml(cast) {
        if (!cast?.length) return `<p class="muted">No cast information.</p>`;
        return `<ul class="cast-grid">${cast.slice(0, 12).map(c => `
            <li>
                <div class="cast-photo">${c.photo ? `<img src="${escapeHtml(c.photo)}" alt="" loading="lazy">` : icon("user")}</div>
                <strong>${escapeHtml(c.name)}</strong>
                <span>${escapeHtml(c.role || "")}</span>
            </li>`).join("")}</ul>`;
    }

    // ---------- ratings ----------
    function ratingsHtml(t, info, omdbRatings) {
        const chips = [];
        if (info.tvmazeRating) chips.push(chip("TVMaze", `${info.tvmazeRating}/10`, info.tvmazeRating * 10));
        if (info.tmdbRating) chips.push(chip("TMDB", `${info.tmdbRating}/10`, info.tmdbRating * 10));
        (omdbRatings || []).forEach(r => chips.push(chip(r.source, r.value, r.score)));
        let hint = "";
        if (!MyFlix.omdb.enabled() && t.kind !== "classic") hint = `<p class="hint-line">${icon("key-round")} Add a free OMDb key in <button type="button" class="link" data-act="settings">Settings</button> to see IMDb, Rotten Tomatoes and Metacritic scores.</p>`;
        if (!chips.length) return hint || "";
        return `<div class="score-chips">${chips.join("")}</div>${hint}`;
    }

    function chip(source, value, score) {
        const tone = score == null ? "" : score >= 75 ? "good" : score >= 55 ? "ok" : "bad";
        return `<div class="score-chip score-chip--${tone}"><span class="score-source">${escapeHtml(source)}</span><strong>${escapeHtml(value)}</strong></div>`;
    }

    // ---------- where to watch ----------
    function providersHtml(t, providers) {
        if (t.kind === "classic") {
            return `<div class="provider-free">${icon("sparkles")}<div><strong>Free to watch right here</strong><span>Streamed from the Internet Archive · ${escapeHtml(t.licence)}</span></div></div>`;
        }
        if (!MyFlix.tmdb.enabled()) {
            return `<p class="hint-line">${icon("key-round")} Add a free TMDB key in <button type="button" class="link" data-act="settings">Settings</button> to see which South African services stream this.</p>`;
        }
        if (!providers) return `<p class="muted">Not currently available to stream in ${escapeHtml(store.getSetting("region") || "ZA")}.</p>`;
        const group = (label, list) => list.length ? `
            <div class="provider-group"><span class="label">${label}</span><div class="provider-logos">
                ${list.map(p => `<span class="provider" title="${escapeHtml(p.name)}"><img src="${escapeHtml(p.logo)}" alt="${escapeHtml(p.name)}" loading="lazy"><span>${escapeHtml(p.name)}</span></span>`).join("")}
            </div></div>` : "";
        const body = group("Stream", providers.stream) + group("Free", providers.free) + group("Rent", providers.rent) + group("Buy", providers.buy);
        return (body || `<p class="muted">No streaming options found.</p>`) +
            `<p class="attribution">Streaming data by JustWatch · <a href="${escapeHtml(providers.link)}" target="_blank" rel="noopener">See all options</a></p>`;
    }

    // ---------- episodes (episode tracker) ----------
    function episodesShell(info) {
        const seasons = info.seasonList || [];
        if (!seasons.length) return `<p class="muted">No episode information.</p>`;
        return `
            <div class="episodes-head">
                <select class="season-select" aria-label="Season">
                    ${seasons.map((s, i) => `<option value="${i}">Season ${escapeHtml(s.number)}${s.episodeOrder ? ` (${s.episodeOrder} Episodes)` : ""}</option>`).join("")}
                </select>
                <span class="episodes-progress" data-progress></span>
                <button type="button" class="btn btn--small btn--grey" data-act="season-all">${icon("list-checks")}<span>Mark season watched</span></button>
            </div>
            <ol class="episode-list">${loading}</ol>`;
    }

    async function loadSeason(t, info, index) {
        const listEl = panel.querySelector(".episode-list");
        const season = info.seasonList[index];
        if (!listEl || !season) return;
        listEl.innerHTML = loading;
        try {
            const eps = await MyFlix.tvmaze.seasonEpisodes(season.id);
            info.currentEpisodes = eps;
            const showRef = { id: t.id, name: t.name, poster: t.poster, genres: t.genres };
            listEl.innerHTML = eps.length ? eps.map(ep => {
                const watched = store.episodes.isWatched(t.id, ep.id);
                const future = ep.airstamp && new Date(ep.airstamp) > Date.now();
                return `
                <li class="episode ${watched ? "is-watched" : ""}">
                    <span class="ep-num">${escapeHtml(ep.number ?? "–")}</span>
                    <div class="ep-still">${ep.image?.medium ? `<img src="${escapeHtml(ep.image.medium)}" alt="" loading="lazy">` : icon("tv")}</div>
                    <div class="ep-body">
                        <div class="ep-top"><strong>${escapeHtml(ep.name)}</strong><span>${ep.runtime ? `${ep.runtime}m` : ""}</span></div>
                        <p>${escapeHtml(truncate(stripHtml(ep.summary), 180) || (future ? `Airs ${new Date(ep.airstamp).toLocaleDateString()}` : ""))}</p>
                    </div>
                    <button type="button" class="ep-check ${watched ? "is-on" : ""}" data-ep="${ep.id}" ${future ? "disabled" : ""}
                        aria-pressed="${watched}" aria-label="${watched ? "Mark unwatched" : "Mark watched"}: ${escapeHtml(ep.name)}">${icon(watched ? "circle-check" : "check")}</button>
                </li>`;
            }).join("") : `<li class="muted">No episodes listed.</li>`;

            listEl.querySelectorAll(".ep-check").forEach(btn => btn.addEventListener("click", () => {
                const ep = eps.find(e => e.id === +btn.dataset.ep);
                store.episodes.setWatched(showRef, ep, !store.episodes.isWatched(t.id, ep.id));
                loadSeasonCached(t, info, index);
            }));
            updateProgress(t, info, eps);
        } catch {
            listEl.innerHTML = `<li class="muted">Couldn't load episodes.</li>`;
        }
    }

    // Re-render the current season without refetching.
    function loadSeasonCached(t, info, index) {
        const eps = info.currentEpisodes;
        if (!eps) return loadSeason(t, info, index);
        panel.querySelectorAll(".episode").forEach((li, i) => {
            const ep = eps[i];
            const watched = store.episodes.isWatched(t.id, ep.id);
            li.classList.toggle("is-watched", watched);
            const btn = li.querySelector(".ep-check");
            btn.classList.toggle("is-on", watched);
            btn.setAttribute("aria-pressed", String(watched));
            btn.innerHTML = icon(watched ? "circle-check" : "check");
        });
        updateProgress(t, info, eps);
    }

    function updateProgress(t, info, eps) {
        const el = panel.querySelector("[data-progress]");
        if (!el) return;
        const done = eps.filter(e => store.episodes.isWatched(t.id, e.id)).length;
        el.innerHTML = `<span class="mini-bar"><span style="width:${eps.length ? (done / eps.length) * 100 : 0}%"></span></span>${done}/${eps.length} watched`;
    }

    // ---------- "Did you know?" ----------
    function triviaHtml(wiki) {
        if (!wiki) return `<p class="muted">No Wikipedia article found.</p>`;
        const facts = MyFlix.wiki.trivia(wiki.extract);
        if (!facts.length) return `<p>${escapeHtml(truncate(wiki.extract, 400))}</p>`;
        return `<ul class="trivia">${facts.map(f => `<li>${icon("lightbulb")}<span>${escapeHtml(f)}</span></li>`).join("")}</ul>
            <p class="attribution">From <a href="${escapeHtml(wiki.url)}" target="_blank" rel="noopener">Wikipedia</a> (CC BY-SA)</p>`;
    }

    // ---------- "More like this" ----------
    async function similarTitles(t, info) {
        if (t.kind === "classic") {
            return MyFlix.classics
                .filter(f => f.id !== t.id && f.genres.some(g => t.film.genres.includes(g)))
                .slice(0, 9).map(MyFlix.models.fromClassic);
        }
        if (t.kind === "movie" && info.similar?.length) return info.similar.slice(0, 9).map(m => MyFlix.models.fromTmdb(m, "movie"));
        if (t.kind === "tv" || t.kind === "tmdbtv") {
            const all = await MyFlix.tvmaze.catalog();
            const g = new Set(t.genres);
            return all.filter(s => s.id !== t.id && s.genres.some(x => g.has(x)))
                .map(s => ({ s, n: s.genres.filter(x => g.has(x)).length }))
                .sort((a, b) => b.n - a.n).slice(0, 9).map(x => MyFlix.models.fromTvmaze(x.s));
        }
        return [];
    }

    // ---------- loading per kind ----------
    async function loadInfo(t) {
        const info = { cast: [], trailer: null, providers: null, imdb: null };

        if (t.kind === "tmdbtv" && MyFlix.tmdb.enabled()) {
            // Shows from TMDB: find the TVMaze version so episodes & tracking work.
            const tv = await MyFlix.tmdb.tv(t.id);
            info.trailer = MyFlix.tmdb.trailerOf(tv.videos);
            info.providers = MyFlix.tmdb.providersOf(tv["watch/providers"]);
            info.tmdbRating = tv.vote_average ? Math.round(tv.vote_average * 10) / 10 : null;
            info.backdrop = MyFlix.models.tmdbImage(tv.backdrop_path, "w1280");
            const imdb = tv.external_ids?.imdb_id;
            if (imdb) {
                try {
                    const show = await MyFlix.tvmaze.lookupImdb(imdb);
                    t = MyFlix.models.fromTvmaze(show);
                } catch { /* stay TMDB-only */ }
            }
            info.imdb = imdb;
            if (t.kind === "tmdbtv") {
                Object.assign(t, MyFlix.models.fromTmdb(tv, "tv"));
                info.cast = [];
                return { t, info };
            }
        }

        if (t.kind === "tv") {
            const full = await MyFlix.tvmaze.show(t.id);
            const fresh = MyFlix.models.fromTvmaze(full);
            t = { ...fresh };
            info.backdrop = info.backdrop || MyFlix.tvmaze.backdropOf(full);
            info.poster = full.image?.original;
            info.cast = (full._embedded?.cast || []).map(c => ({ name: c.person.name, role: c.character?.name, photo: c.person.image?.medium }));
            info.seasonList = full._embedded?.seasons || [];
            info.seasons = info.seasonList.filter(s => s.episodeOrder || s.premiereDate).length || info.seasonList.length;
            info.network = fresh.network;
            info.status = full.status;
            info.endYear = full.ended ? +full.ended.slice(0, 4) : null;
            info.next = full._embedded?.nextepisode;
            info.tvmazeRating = full.rating?.average;
            info.imdb = info.imdb || full.externals?.imdb;
            // TMDB extras for TV (where to watch, trailer)
            if (MyFlix.tmdb.enabled() && info.imdb && !info.providers) {
                try {
                    const found = await MyFlix.tmdb.findByImdb(info.imdb);
                    const tmdbId = found.tv_results?.[0]?.id;
                    if (tmdbId) {
                        const tv = await MyFlix.tmdb.tv(tmdbId);
                        info.providers = MyFlix.tmdb.providersOf(tv["watch/providers"]);
                        info.trailer = MyFlix.tmdb.trailerOf(tv.videos);
                        info.tmdbRating = tv.vote_average ? Math.round(tv.vote_average * 10) / 10 : null;
                        info.backdrop = info.backdrop || MyFlix.models.tmdbImage(tv.backdrop_path, "w1280");
                    }
                } catch { /* optional */ }
            }
        }

        if (t.kind === "movie") {
            const m = await MyFlix.tmdb.movie(t.id);
            t = { ...MyFlix.models.fromTmdb(m, "movie") };
            info.backdrop = MyFlix.models.tmdbImage(m.backdrop_path, "w1280");
            info.cast = (m.credits?.cast || []).map(c => ({ name: c.name, role: c.character, photo: MyFlix.models.tmdbImage(c.profile_path, "w185") }));
            info.trailer = MyFlix.tmdb.trailerOf(m.videos);
            info.providers = MyFlix.tmdb.providersOf(m["watch/providers"]);
            info.tmdbRating = t.rating;
            info.imdb = m.external_ids?.imdb_id || m.imdb_id;
            info.similar = m.similar?.results;
            const director = m.credits?.crew?.find(c => c.job === "Director");
            if (director) info.director = director.name;
        }

        return { t, info };
    }

    // ---------- render ----------
    function renderShell(t, info) {
        panel.innerHTML = `
            <button type="button" class="modal-close circle" data-act="close" aria-label="Close">${icon("x")}</button>
            ${heroHtml(t, info)}
            <div class="modal-body">
                <div class="modal-grid">
                    <div>
                        ${metaHtml(t, info)}
                        ${nextEpisodeHtml(info.next)}
                        <p class="modal-overview">${escapeHtml(t.overview || "")}</p>
                    </div>
                    <div class="modal-side">${sideHtml(t, info)}</div>
                </div>
                ${t.kind === "tv" ? section("episodes", "Episodes", episodesShell(info)) : ""}
                ${section("ratings", "Ratings", loading)}
                ${section("watch", "Where to watch", providersHtml(t, info.providers))}
                ${info.cast?.length ? section("cast", "Cast", castHtml(info.cast)) : ""}
                ${section("trivia", "Did you know?", loading)}
                ${section("similar", "More like this", loading)}
            </div>`;
        panel.querySelectorAll("img").forEach(img => safeImg(img, ""));
        MyFlix.cards.refreshListButtons();
    }

    async function fillAsync(t, info, token) {
        const live = () => token === openToken && dialog.open;

        // Episodes
        const select = panel.querySelector(".season-select");
        if (select) {
            // Start on the first season with unwatched episodes
            select.addEventListener("change", () => loadSeason(t, info, +select.value));
            loadSeason(t, info, 0);
        }

        // Ratings
        MyFlix.omdb.ratings(info.imdb).catch(() => []).then(r => {
            if (!live()) return;
            const el = panel.querySelector('[data-section="ratings"]');
            const html = ratingsHtml(t, info, r);
            if (html) el.querySelector("h3").insertAdjacentHTML("afterend", html);
            el.querySelector(".loading-dots")?.remove();
            if (!html) el.remove();
        });

        // Wikipedia trivia (and a poster for classics)
        MyFlix.wiki.summary(t.name, t.year, t.kind).catch(() => null).then(w => {
            if (!live()) return;
            const el = panel.querySelector('[data-section="trivia"]');
            el.innerHTML = `<h3>Did you know?</h3>${triviaHtml(w)}`;
            if (t.kind === "classic" && w?.image && !info.poster) {
                info.poster = w.imageLarge || w.image;
                const hero = panel.querySelector(".modal-hero");
                hero.outerHTML = heroHtml(t, info);
                panel.querySelectorAll(".modal-hero img").forEach(img => safeImg(img, ""));
            }
        });

        // More like this
        similarTitles(t, info).catch(() => []).then(list => {
            if (!live()) return;
            const el = panel.querySelector('[data-section="similar"]');
            if (!list.length) { el.remove(); return; }
            el.innerHTML = "<h3>More like this</h3>";
            el.appendChild(MyFlix.cards.createGrid(list, "poster"));
        });
    }

    function playTrailer(info) {
        const media = panel.querySelector(".modal-hero-media");
        if (!media || !info.trailer) return;
        media.innerHTML = `<iframe class="modal-trailer" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(info.trailer)}?autoplay=1&rel=0&playsinline=1"
            title="Trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
        panel.querySelector(".modal-hero").classList.add("is-playing");
    }

    // ---------- open / close ----------
    async function open(title) {
        const token = ++openToken;
        current = { t: title, info: {} };
        renderShell(title, { cast: [] });
        panel.querySelector(".modal-body").classList.add("is-loading");
        if (!dialog.open) {
            dialog.showModal();
            document.documentElement.classList.add("modal-open");
        }
        dialog.scrollTop = 0;

        try {
            const { t, info } = await loadInfo(title);
            if (token !== openToken) return;
            current = { t, info };
            renderShell(t, info);
            fillAsync(t, info, token);
        } catch (err) {
            if (token !== openToken) return;
            const body = panel.querySelector(".modal-body");
            body.classList.remove("is-loading");
            body.insertAdjacentHTML("afterbegin", `<p class="row-empty row-empty--error">${escapeHtml(err.code === "NO_KEY" ? err.message : "Couldn't load all the details. Check your connection.")}</p>`);
        }
    }

    function close() {
        openToken++;
        if (dialog.open) dialog.close();
    }

    function onClick(e) {
        if (e.target === dialog) return close();
        const btn = e.target.closest("[data-act],[data-star]");
        if (!btn || !current) return;
        const { t, info } = current;
        if (btn.dataset.star) {
            store.list.rate(t.key, +btn.dataset.star);
            return rerenderHero();
        }
        switch (btn.dataset.act) {
            case "close": close(); break;
            case "play": close(); MyFlix.player.play(t); break;
            case "party": close(); MyFlix.party.host(t); break;
            case "trailer": playTrailer(info); break;
            case "list": store.list.toggle(t); rerenderHero(); break;
            case "watched": {
                const item = store.list.get(t.key);
                if (item?.status === "watched") store.list.setStatus(t.key, "want");
                else store.list.add(t, "watched");
                rerenderHero();
                break;
            }
            case "season-all": {
                const eps = (info.currentEpisodes || []).filter(e => !e.airstamp || new Date(e.airstamp) <= Date.now());
                const allDone = eps.every(e => store.episodes.isWatched(t.id, e.id));
                store.episodes.setMany({ id: t.id, name: t.name, poster: t.poster, genres: t.genres }, eps, !allDone);
                loadSeasonCached(t, info, +(panel.querySelector(".season-select")?.value || 0));
                break;
            }
            case "settings": close(); MyFlix.settings.open(); break;
        }
    }

    function rerenderHero() {
        if (!current) return;
        const hero = panel.querySelector(".modal-hero");
        if (hero.classList.contains("is-playing")) {
            // keep the trailer playing; only refresh the buttons
            const actions = document.createElement("div");
            actions.innerHTML = heroHtml(current.t, current.info);
            hero.querySelector(".modal-actions").replaceWith(actions.querySelector(".modal-actions"));
        } else {
            hero.outerHTML = heroHtml(current.t, current.info);
            panel.querySelectorAll(".modal-hero img").forEach(img => safeImg(img, ""));
        }
    }

    function init() {
        dialog = document.getElementById("details-modal");
        panel = dialog.querySelector(".modal-panel");
        dialog.addEventListener("click", onClick);
        dialog.addEventListener("close", () => {
            document.documentElement.classList.remove("modal-open");
            panel.querySelector(".modal-trailer")?.remove(); // stop trailer audio
            current = null;
        });
    }

    MyFlix.details = { init, open, close };
})(window.MyFlix = window.MyFlix || {});
