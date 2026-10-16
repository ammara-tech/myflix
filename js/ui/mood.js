// ==========================
// MOOD PICKER ("Surprise me" spin wheel)
// ==========================
(function (MyFlix) {
    const { escapeHtml, shuffle, truncate, safeImg } = MyFlix.utils;
    const icon = (...a) => MyFlix.icon(...a);

    let dialog, body;
    let mood = null, type = "any", spinning = false;

    const TYPES = [
        { key: "any", label: "Anything" },
        { key: "tv", label: "TV Show" },
        { key: "movie", label: "Movie" },
        { key: "classic", label: "Free Classic" }
    ];

    function render() {
        body.innerHTML = `
            <h2 class="mood-title">What are you in the mood for?</h2>
            <div class="mood-grid">
                ${MyFlix.moods.map(m => `
                    <button type="button" class="mood ${mood?.key === m.key ? "is-on" : ""}" data-mood="${m.key}" aria-pressed="${mood?.key === m.key}">
                        ${icon(m.icon)}<span>${escapeHtml(m.title)}</span>
                    </button>`).join("")}
            </div>
            <div class="mood-types" role="group" aria-label="Type">
                ${TYPES.map(t => `<button type="button" class="chip ${type === t.key ? "is-on" : ""}" data-type="${t.key}">${escapeHtml(t.label)}</button>`).join("")}
            </div>
            <div class="wheel-wrap">
                <div class="wheel-pointer"></div>
                <div class="wheel" aria-hidden="true">${wheelLabels()}</div>
                <button type="button" class="wheel-spin" data-act="spin" ${mood ? "" : "disabled"}>${icon("dices")}<span>Spin</span></button>
            </div>
            <div class="mood-result" aria-live="polite"></div>`;
    }

    function wheelLabels() {
        const moods = MyFlix.moods;
        return moods.map((m, i) => `<span class="wheel-label" style="--i:${i};--n:${moods.length}">${icon(m.icon)}</span>`).join("");
    }

    // Collect candidates for the chosen mood + type.
    async function candidates() {
        const genres = mood.genres.map(MyFlix.genreByKey);
        const pools = [];
        const wantTv = type === "any" || type === "tv";
        const wantMovie = (type === "any" || type === "movie") && MyFlix.tmdb.enabled();
        const wantClassic = type === "any" || type === "classic";

        if (wantTv) {
            try {
                const cat = await MyFlix.tvmaze.catalog();
                pools.push(...cat.filter(s => genres.some(g => MyFlix.tvShowInGenre(s, g))).slice(0, 80).map(MyFlix.models.fromTvmaze));
            } catch { /* offline */ }
        }
        if (wantMovie) {
            try {
                const g = genres[Math.floor(Math.random() * genres.length)];
                const page = 1 + Math.floor(Math.random() * 3);
                pools.push(...(await MyFlix.tmdb.moviesByGenre(g.tmdb, page)).map(m => MyFlix.models.fromTmdb(m, "movie")));
            } catch { /* no key */ }
        }
        if (wantClassic) {
            pools.push(...MyFlix.classics.filter(f => f.genres.some(g => mood.genres.includes(g))).map(MyFlix.models.fromClassic));
        }
        // don't suggest things already watched
        return pools.filter(t => MyFlix.store.list.get(t.key)?.status !== "watched");
    }

    async function spin() {
        if (!mood || spinning) return;
        spinning = true;
        const wheel = body.querySelector(".wheel");
        const result = body.querySelector(".mood-result");
        result.innerHTML = "";
        const turns = 4 + Math.random() * 2;
        wheel.style.transition = "none";
        wheel.style.transform = "rotate(0deg)";
        void wheel.offsetWidth;
        wheel.style.transition = "transform 2.6s cubic-bezier(.17,.67,.12,1)";
        wheel.style.transform = `rotate(${turns * 360}deg)`;

        const [pool] = await Promise.all([candidates(), new Promise(r => setTimeout(r, 2700))]);
        spinning = false;
        if (!pool.length) {
            result.innerHTML = `<p class="muted">Nothing found for that combo. Try another mood${type === "movie" && !MyFlix.tmdb.enabled() ? " or add a TMDB key in Settings for movies" : ""}.</p>`;
            return;
        }
        // Weighted towards the better rated picks, with some randomness.
        const pick = shuffle(pool.slice(0, 40))[0];
        showResult(pick);
    }

    function showResult(t) {
        const result = body.querySelector(".mood-result");
        const img = t.backdrop || t.poster;
        result.dataset.key = t.key;
        result.innerHTML = `
            <div class="pick">
                <div class="pick-media">${img ? `<img src="${escapeHtml(img)}" alt="">` : MyFlix.cards.typePoster(t)}</div>
                <div class="pick-body">
                    <span class="label">Tonight's pick</span>
                    <h3>${escapeHtml(t.name)}</h3>
                    <p class="muted">${[t.year, t.genres?.slice(0, 2).join(" · ")].filter(Boolean).map(escapeHtml).join(" · ")}</p>
                    <p>${escapeHtml(truncate(t.overview, 160))}</p>
                    <div class="pick-actions">
                        ${MyFlix.actions.canPlay(t) ? `<button type="button" class="btn btn--play" data-act="play">${icon("play")}<span>Play</span></button>` : ""}
                        <button type="button" class="btn btn--grey" data-act="info">${icon("info")}<span>More Info</span></button>
                        <button type="button" class="btn btn--ghost" data-act="spin">${icon("shuffle")}<span>Spin again</span></button>
                    </div>
                </div>
            </div>`;
        result.querySelectorAll("img").forEach(i => safeImg(i, ""));
        if (!img && t.kind === "classic") {
            MyFlix.wiki.summary(t.name, t.year, "film").then(w => {
                const media = result.querySelector(".pick-media");
                if (!w?.image || !media?.isConnected || result.dataset.key !== t.key) return;
                media.innerHTML = `<img src="${escapeHtml(w.image)}" alt="">`;
            }).catch(() => {});
        }
        current = t;
    }
    let current = null;

    function open() {
        render();
        dialog.showModal();
    }

    function init() {
        dialog = document.getElementById("mood-modal");
        body = dialog.querySelector(".modal-panel-body");
        dialog.addEventListener("click", e => {
            if (e.target === dialog) return dialog.close();
            const b = e.target.closest("[data-mood],[data-type],[data-act]");
            if (!b) return;
            if (b.dataset.mood) {
                mood = MyFlix.moods.find(m => m.key === b.dataset.mood);
                body.querySelectorAll("[data-mood]").forEach(x => {
                    x.classList.toggle("is-on", x === b);
                    x.setAttribute("aria-pressed", String(x === b));
                });
                body.querySelector(".wheel-spin").disabled = false;
            }
            if (b.dataset.type) {
                type = b.dataset.type;
                body.querySelectorAll("[data-type]").forEach(x => x.classList.toggle("is-on", x === b));
            }
            const act = b.dataset.act;
            if (act === "spin") spin();
            if (act === "close") dialog.close();
            if (act === "play" && current) { dialog.close(); MyFlix.player.play(current); }
            if (act === "info" && current) { dialog.close(); MyFlix.details.open(current); }
        });
    }

    MyFlix.mood = { init, open };
})(window.MyFlix = window.MyFlix || {});
